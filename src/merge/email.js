// E-mail merge without a server: one .eml file per person, each a draft ready to send from Outlook,
// Thunderbird or Apple Mail. The person's own copy of the pages is the picture in the message, and the
// page text comes along as plain text for mail programs that show no pictures.
import { zipSync, strToU8 } from 'fflate';
import { renderPage, flowLinkedText, fitText } from '../render.js';
import { stagePages, safeName } from '../export/stage.js';
import { pageCanvas } from '../export/images.js';
import { t } from '../i18n/index.js';
import { fillPages, fillText, preparePhotos } from './merge.js';

const EMAIL_HEAD = /^(e[-_ ]?mail|mail|e[-_ ]?mail[-_ ]?(address|adresse|adresa)|email[-_ ]?id|correo|correo[-_ ]?electr[oó]nico|courriel|adresse[-_ ]?(e[-_ ]?mail|mail|courriel)|e[-_ ]?mail[-_ ]?adresse|posta[-_ ]?elettronica|indirizzo[-_ ]?(e[-_ ]?mail|di[-_ ]?posta)|endere[çc]o[-_ ]?(de[-_ ]?)?(e[-_ ]?mail|correio)|correio[-_ ]?eletr[oô]nico|address[-_ ]?\(e[-_ ]?mail\))$/i;
export const isEmail = (s) => /^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[^\s@<>,;:"]{2,}$/.test(String(s ?? '').trim());

// the column that holds the e-mail addresses: by its name, or the one whose cells look like addresses
export function guessEmailColumn(data) {
  const byName = data.columns.find((c) => EMAIL_HEAD.test(c.trim()));
  if (byName) return byName;
  let best = '', most = 0;
  for (const c of data.columns) {
    const n = data.rows.filter((r) => isEmail(r[c])).length;
    if (n > most) { most = n; best = c; }
  }
  return most >= Math.max(1, data.rows.length * 0.3) ? best : '';
}

// the words on some pages, top to bottom, as plain text
export function pagesText(pages) {
  const out = [];
  const paras = (ps) => (ps || []).map((p) => p.runs.map((r) => r.text).join('').replace(/\t/g, ' ').trimEnd()).join('\n').trim();
  const walk = (items) => {
    const sorted = [...items].sort((a, b) => (Math.abs(a.y - b.y) > 6 ? a.y - b.y : a.x - b.x));
    for (const it of sorted) {
      if (it.items) walk(it.items);
      else if (it.type === 'text' && !(it.chain && +it.chainIndex > 0)) { const s = paras(it.paras); if (s) out.push(s); }
      else if (it.type === 'table') { const s = it.rows.map((row) => row.cells.map((c) => paras(c.paras).replace(/\n/g, ' ')).join('\t')).join('\n').trim(); if (s) out.push(s); }
    }
  };
  for (const pg of pages) walk(pg.items);
  return out.join('\n\n');
}

// ------------------------------------------------------------------ the .eml file
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
// a header text with letters outside plain English, as RFC 2047 "encoded words"
function headerText(s) {
  s = String(s ?? '').replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const words = []; let cur = '';
  for (const ch of s) { if (strToU8(cur + ch).length > 45) { words.push(cur); cur = ''; } cur += ch; }
  if (cur) words.push(cur);
  return words.map((w) => `=?UTF-8?B?${b64(strToU8(w))}?=`).join('\r\n ');
}
const htmlEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// -> the text of one .eml message: an unsent draft with the pages as pictures and the text as plain text
export function emlMessage({ to, subject, text, pictures, title }) {
  const id = Math.random().toString(36).slice(2, 10), alt = `alt-${id}`, rel = `rel-${id}`;
  const imgs = pictures.map((p, i) => `<p style="margin:0 0 12px"><img src="cid:page${i + 1}-${id}@pubwork" width="${p.w}" alt="${htmlEsc(i ? '' : text.slice(0, 300))}" style="display:block;max-width:100%;height:auto;border:0"></p>`).join('\n');
  const html = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${htmlEsc(title)}</title></head><body style="margin:0;padding:12px;background:#ffffff">\n${imgs}\n</body></html>`;
  const lines = [
    'X-Unsent: 1', `To: ${to}`, `Subject: ${headerText(subject)}`, 'MIME-Version: 1.0', 'X-Mailer: Pubwork',
    `Content-Type: multipart/alternative; boundary="${alt}"`, '',
    `--${alt}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(strToU8(text || ''))),
    `--${alt}`, `Content-Type: multipart/related; boundary="${rel}"`, '',
    `--${rel}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(strToU8(html))),
  ];
  pictures.forEach((p, i) => lines.push(`--${rel}`, `Content-Type: image/png; name="page${i + 1}.png"`, 'Content-Transfer-Encoding: base64', `Content-ID: <page${i + 1}-${id}@pubwork>`, `Content-Disposition: inline; filename="page${i + 1}.png"`, '', wrap(b64(p.png))));
  lines.push(`--${rel}--`, '', `--${alt}--`, '');
  return lines.join('\r\n');
}

// ------------------------------------------------------------------ drawing a person's pages away from the screen
async function pagePictures(app, pages) {
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'fixed', left: '-30000px', top: '0', zoom: '1', pointerEvents: 'none' });
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  try {
    const done = [], els = pages.map((pg, i) => { const r = renderPage(pg, app.doc, { embedded: app.embedded, pageNumber: i + 1, pageCount: pages.length }); host.appendChild(r.el); done.push(r.done); return r.el; });
    await Promise.all(done); await document.fonts.ready;
    flowLinkedText(host, { embedded: app.embedded }); fitText(host);
    const stage = await stagePages(els);
    stage.host.querySelectorAll('.overflow').forEach((n) => n.classList.remove('overflow')); // the on-screen "text does not fit" mark
    try {
      const out = [];
      for (const p of stage.pages) {
        const canvas = await pageCanvas(p, { long: 1400 });
        const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('no picture'))), 'image/png'));
        out.push({ png: new Uint8Array(await blob.arrayBuffer()), w: Math.min(800, Math.round(p.offsetWidth)) });
        canvas.width = canvas.height = 0;
      }
      return out;
    } finally { stage.done(); }
  } finally { host.remove(); }
}

// a cell starting with = + - @ would run as a formula in Excel: a leading ' keeps it plain text (numbers like -5 stay as they are)
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+@\t\r]|^-(?![\d.,\s]*$)/.test(s)) s = `'${s}`; return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const num = (i, n) => String(i).padStart(String(n).length < 3 ? 3 : String(n).length, '0');

// rows: the chosen records in order -> { blob, name, made, missing }
export async function makeEmails(app, rows, { col, subject }, onProgress = () => {}) {
  const doc = app.doc, files = {}, list = [];
  const head = [t('mail.csvNo'), t('mail.csvTo'), t('mail.csvSubject'), t('mail.csvFile'), t('mail.csvNote'), ...doc.mergeData.columns];
  let made = 0, missing = 0;
  for (let i = 0; i < rows.length; i++) {
    onProgress(i, rows.length);
    const row = rows[i], to = String(row[col] ?? '').trim(), subj = fillText(subject, row).trim();
    if (!isEmail(to)) { missing++; list.push([i + 1, to, subj, '', t(to ? 'mail.csvBad' : 'mail.csvNone'), ...doc.mergeData.columns.map((c) => row[c])]); continue; }
    await preparePhotos(doc.pages, [row]);
    const pages = fillPages(doc.pages, row);
    const pictures = await pagePictures(app, pages);
    const name = `${num(i + 1, rows.length)} ${safeName(to)}.eml`;
    files[name] = [strToU8(emlMessage({ to, subject: subj, text: pagesText(pages), pictures, title: subj || doc.name })), { level: 6 }];
    list.push([i + 1, to, subj, name, t('mail.csvReady'), ...doc.mergeData.columns.map((c) => row[c])]);
    made++;
  }
  // the mailing list opens in Excel with accents intact thanks to the byte order mark
  files[`${t('mail.csvName')}.csv`] = strToU8('﻿' + [head, ...list].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n');
  files[`${t('mail.howName')}.txt`] = strToU8(t('mail.howText').replace(/\n/g, '\r\n'));
  return { blob: new Blob([zipSync(files)], { type: 'application/zip' }), name: `${safeName(doc.name)} - ${t('mail.zipName')}.zip`, made, missing };
}
