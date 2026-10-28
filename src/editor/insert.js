// Inserting things: an empty table, a table from a spreadsheet, a chart, the text of a file.
import { uid } from './model.js';
import { schemeColors, fontPair } from '../templates/schemes.js';
import { openDialog, pickFile, esc } from './dialog.js';
import { t } from '../i18n/index.js';

const MAX_ROWS = 60;
const fonts = (doc) => (doc.fontPair ? fontPair(doc.fontPair) : { heading: 'Arial', body: 'Arial' });
const colours = (doc) => schemeColors(doc.scheme || 'orange');

// a table item like the templates make: cols (widths), rows [{ h, cells: [{ col, span, covered, fill, valign, borders, paras }] }]
export function makeTable(doc, grid, { header = true, x = 0, y = 0, w = 400, size = 10, rowH = null } = {}) {
  const f = fonts(doc), c = colours(doc), nCols = Math.max(1, ...grid.map((r) => r.length));
  const border = '0.5pt solid #c9c4bf';
  rowH ||= Math.round(size * 2);
  const rows = grid.map((r, ri) => {
    const head = header && ri === 0;
    return { h: rowH, cells: Array.from({ length: nCols }, (_, ci) => {
      const run = { text: String(r[ci] ?? ''), font: f.body, size, color: head ? '#ffffff' : c.dark };
      if (head) run.bold = true;
      return { col: ci, span: [1, 1], covered: false, fill: head ? c.primary : !header || ri % 2 ? null : c.light, valign: 'middle', borders: [border, border, border, border], paras: [{ align: 'left', runs: [run] }] };
    }) };
  });
  return { type: 'table', id: uid(), x, y, w, h: rowH * rows.length, cols: Array(nCols).fill(w / nCols), rows };
}

export function insertTable(app) {
  openDialog({
    title: t('pics.table.title'), okLabel: t('pics.table.insert'),
    body: `<label class="row2">${esc(t('pics.table.rows'))} <input type="number" id="tRows" min="1" max="${MAX_ROWS}" value="4"></label>
      <label class="row2">${esc(t('pics.table.cols'))} <input type="number" id="tCols" min="1" max="12" value="3"></label>
      <div class="tgrid" aria-hidden="true">${Array.from({ length: 64 }, (_, i) => `<i data-r="${(i >> 3) + 1}" data-c="${(i & 7) + 1}"></i>`).join('')}</div>
      <label class="check"><input type="checkbox" id="tHead" checked> ${esc(t('pics.table.header'))}</label>`,
    wire(el) {
      const rows = el.querySelector('#tRows'), cols = el.querySelector('#tCols'), cells = [...el.querySelectorAll('.tgrid i')];
      const show = (r = +rows.value, c = +cols.value) => cells.forEach((i) => i.classList.toggle('on', +i.dataset.r <= r && +i.dataset.c <= c));
      cells.forEach((i) => { i.addEventListener('mouseenter', () => show(+i.dataset.r, +i.dataset.c)); i.addEventListener('click', () => { rows.value = i.dataset.r; cols.value = i.dataset.c; show(); }); });
      el.querySelector('.tgrid').addEventListener('mouseleave', () => show());
      rows.addEventListener('input', () => show()); cols.addEventListener('input', () => show()); show();
    },
    onOk(el) {
      const r = Math.max(1, Math.min(MAX_ROWS, Math.round(+el.querySelector('#tRows').value || 1))), c = Math.max(1, Math.min(12, Math.round(+el.querySelector('#tCols').value || 1)));
      const header = el.querySelector('#tHead').checked;
      const grid = Array.from({ length: r }, (_, ri) => Array.from({ length: c }, (_, ci) => (header && ri === 0 ? t('pics.table.heading', { n: ci + 1 }) : '')));
      place(app, grid, header);
    },
  });
}

function place(app, grid, header) {
  const pg = app.targetPage(), cols = Math.max(...grid.map((r) => r.length));
  const w = Math.min(pg.w * 0.84, Math.max(240, cols * 95));
  // rows small enough for the whole table to fit on the page (cells have 2pt above and below the text)
  const rowH = Math.min(20, (pg.h - 36) / grid.length);
  const size = Math.max(6, Math.min(cols > 8 ? 8 : cols > 5 ? 9 : 10, Math.floor(((rowH - 4.5) / 1.25) * 2) / 2));
  const it = makeTable(app.doc, grid, { header, w, size, rowH, x: (pg.w - w) / 2 });
  it.y = Math.max(18, (pg.h - it.h) / 2);
  app.editor.add(it);
}

export async function insertTableFromFile(app) {
  const file = await pickFile('.xlsx,.ods,.csv,.tsv,.txt'); if (!file) return;
  app.busy?.(true, t('pics.reading'));
  try {
    const { readList } = await import('../merge/data.js');
    const list = await readList(file);
    const cols = list.columns.slice(0, 12);
    const grid = [cols, ...list.rows.slice(0, MAX_ROWS).map((r) => cols.map((c) => r[c] ?? ''))];
    place(app, grid, true);
    if (list.rows.length > MAX_ROWS) app.toast(t('pics.table.cutRows', { n: MAX_ROWS, all: list.rows.length }), 7000);
    if (list.columns.length > 12) app.toast(t('pics.table.cutCols', { n: 12 }), 7000);
  } catch (err) {
    app.toast(t(err.code === 'xls' ? 'pics.oldExcel' : 'pics.badList'), 6000);
  } finally { app.busy?.(false); }
}

export async function insertChart(app, existing = null) {
  (await import('./chart.js')).openChart(app, existing);
}

// ---------------------------------------------------------------- text from a file
function decodeText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return new TextDecoder('windows-1252').decode(bytes); }
}
// paragraphs of a Word file: [{ text, heading }]
async function docxParas(bytes) {
  const { unzipSync, strFromU8 } = await import('fflate');
  const z = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' });
  if (!z['word/document.xml']) throw new Error('not a Word file');
  const x = new DOMParser().parseFromString(strFromU8(z['word/document.xml']), 'application/xml');
  const out = [];
  for (const p of x.getElementsByTagNameNS('*', 'p')) {
    if (p.namespaceURI !== x.documentElement.namespaceURI) continue;
    let s = '';
    const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType !== 1) continue; const k = c.localName; if (k === 't') s += c.textContent; else if (k === 'tab') s += '\t'; else if (k === 'br' || k === 'cr') s += '\n'; else if (k !== 'pPr' && k !== 'rPr' && k !== 'p') walk(c); } };
    walk(p);
    const style = p.getElementsByTagNameNS('*', 'pStyle')[0]?.getAttributeNS(x.documentElement.namespaceURI, 'val') || p.getElementsByTagNameNS('*', 'pStyle')[0]?.getAttribute('w:val') || '';
    s.split('\n').forEach((line) => out.push({ text: line, heading: /^(heading|title|berschrift|titre|titolo|ttulo)/i.test(style) }));
  }
  return out;
}

export async function insertTextFile(app) {
  const file = await pickFile('.txt,.text,.md,.csv,.docx'); if (!file) return;
  let paras;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) paras = await docxParas(bytes);
    else if (bytes[0] === 0xd0 && bytes[1] === 0xcf) { app.toast(t('pics.oldWord'), 6000); return; }
    else paras = decodeText(bytes).replace(/^﻿/, '').split(/\r\n|\r|\n/).map((text) => ({ text, heading: false }));
  } catch { app.toast(t('pics.badText'), 6000); return; }
  while (paras.length && !paras[paras.length - 1].text.trim()) paras.pop();
  while (paras.length && !paras[0].text.trim()) paras.shift();
  if (!paras.length) { app.toast(t('pics.emptyText')); return; }
  const f = fonts(app.doc), ink = app.doc.scheme ? colours(app.doc).dark : '#222222';
  const pg = app.targetPage(), w = pg.w * 0.7, x = (pg.w - w) / 2, y = Math.min(pg.h * 0.15, 72);
  const item = { type: 'text', x, y, w, h: 40, pad: [3.6, 3.6, 3.6, 3.6], valign: 'top', columns: 1, columnGap: 0, edited: true, autoGrow: true, fill: null, stroke: null,
    paras: paras.map((p) => ({ align: 'left', spaceAfter: p.heading ? 4 : 2, runs: [{ text: p.text, font: p.heading ? f.heading : f.body, size: p.heading ? 16 : 11, color: ink, ...(p.heading ? { bold: true } : {}) }] })) };
  app.editor.add(item);
  // now that it is on the page, make the box as tall as its text (part of the same undo step)
  const pi = app.editor.pageIndex, pageEl = app.pageEls[pi], box = app.editor.nodesOf(item.id)[0], flow = box?.querySelector('.flow');
  if (!flow) return;
  await document.fonts.ready;
  const k = pg.w / (pageEl.offsetWidth || 1), need = flow.scrollHeight * k + 7.2 + 2, room = pg.h - y - 18;
  item.h = Math.min(need, room);
  app.redraw([pi]); app.editor.drawSelection(); app.panel?.show(); // the panel shows the new height
  if (need > room) app.toast(t('look.textTooLong'), 9000);
}
