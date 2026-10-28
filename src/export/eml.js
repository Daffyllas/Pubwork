// An e-mail (.eml) with the document as the message itself: each page is one picture inside the
// message (e-mail programs can't be trusted with page layouts), and the words of the pages come along as
// the pictures' descriptions and as a plain-text version. Outlook opens it as a draft ready to send
// (X-Unsent); Apple Mail and Thunderbird open it as a message to forward or "edit as new".
import { stagePages, safeName } from './stage.js';
import { t } from '../i18n/index.js';
import { pageCanvas } from './images.js';
import { blobToB64, pageText } from './pagetext.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CRLF = '\r\n';
const wrap76 = (b64) => b64.replace(/.{1,76}/g, (l) => l + CRLF).replace(/\r\n$/, '');
const utf8B64 = (s) => { const u8 = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(bin); };
const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('The picture could not be made'))), type, q));

// a header value that may hold any language: RFC 2047 encoded words, each short enough for one line
function headerWord(s) {
  s = String(s ?? '').replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(s) && s.length < 900) return s;
  const words = []; let cur = '', bytes = 0;
  for (const ch of s) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > 42) { words.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += n;
  }
  if (cur) words.push(cur);
  return words.map((w) => `=?UTF-8?B?${utf8B64(w)}?=`).join(`${CRLF} `);
}
const rfcDate = (d = new Date()) => d.toUTCString().replace('GMT', '+0000');
const boundary = (k) => `----=_Pubwork_${k}_${Math.random().toString(36).slice(2, 12)}`;

export async function exportEml(doc, pageEls) {
  const stage = await stagePages(pageEls);
  stage.pages.forEach((pg) => pg.querySelectorAll('.overflow').forEach((n) => n.classList.remove('overflow'))); // no "text doesn't fit" marks
  const pages = [];
  try {
    for (let i = 0; i < stage.pages.length; i++) {
      const pg = stage.pages[i];
      const wPt = pg.offsetWidth * 0.75, hPt = pg.offsetHeight * 0.75;
      // shown 640 pixels wide at most (the usual e-mail width), drawn twice as sharp for good screens
      const shownW = Math.min(640, Math.round(wPt * 4 / 3 * 1.6)), shownH = Math.round(shownW * hPt / wPt);
      const canvas = await pageCanvas(pg, { dpi: (2 * shownW * 96) / (wPt * 4 / 3) });
      let blob = await toBlob(canvas, 'image/png'), ext = 'png';
      if (blob.size > 900000) { // photo-heavy pages are much smaller as JPEG
        const jpg = await toBlob(canvas, 'image/jpeg', 0.88);
        if (jpg.size < blob.size * 0.7) { blob = jpg; ext = 'jpg'; }
      }
      canvas.width = canvas.height = 0;
      pages.push({ text: pageText(pg), blob, ext, w: shownW, h: shownH, cid: `page${i + 1}.${Date.now().toString(36)}@pubwork`, file: `page-${i + 1}.${ext}` });
    }
  } finally { stage.done(); }

  const title = doc.name || 'Document';
  const many = pages.length > 1;
  const plain = pages.map((p, i) => (many ? `--- ${t('export.page', { n: i + 1 })} ---\n\n` : '') + (p.text || '')).join('\n\n').replace(/\r?\n/g, CRLF);
  const imgs = pages.map((p, i) => {
    const alt = (p.text || `${title}${many ? ` (${t('export.page', { n: i + 1 })})` : ''}`).replace(/\s+/g, ' ').slice(0, 1000);
    return `<tr><td align="center" style="padding:0 0 16px 0"><img src="cid:${p.cid}" width="${p.w}" height="${p.h}" alt="${esc(alt)}" style="display:block;width:100%;max-width:${p.w}px;height:auto;border:0;outline:none;text-decoration:none;background:#ffffff"></td></tr>`;
  }).join('\n');
  const html = `<!DOCTYPE html>
<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2"><tr><td align="center" style="padding:16px 8px 0 8px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${Math.max(...pages.map((p) => p.w))}px">
${imgs}
</table>
</td></tr></table>
</body></html>`;

  const b1 = boundary('rel'), b2 = boundary('alt');
  const head = [
    'MIME-Version: 1.0',
    `Date: ${rfcDate()}`,
    `Subject: ${headerWord(title)}`,
    'X-Unsent: 1',
    'X-Mailer: Pubwork',
    `Content-Type: multipart/related; boundary="${b1}"; type="multipart/alternative"`,
  ].join(CRLF);
  let body = `${head}${CRLF}${CRLF}This is a message in MIME format.${CRLF}${CRLF}`;
  body += `--${b1}${CRLF}Content-Type: multipart/alternative; boundary="${b2}"${CRLF}${CRLF}`;
  body += `--${b2}${CRLF}Content-Type: text/plain; charset="utf-8"${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${wrap76(utf8B64(plain))}${CRLF}${CRLF}`;
  body += `--${b2}${CRLF}Content-Type: text/html; charset="utf-8"${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${wrap76(utf8B64(html))}${CRLF}${CRLF}`;
  body += `--${b2}--${CRLF}${CRLF}`;
  for (const p of pages) {
    const type = p.ext === 'png' ? 'image/png' : 'image/jpeg';
    body += `--${b1}${CRLF}Content-Type: ${type}; name="${p.file}"${CRLF}Content-Transfer-Encoding: base64${CRLF}Content-ID: <${p.cid}>${CRLF}Content-Disposition: inline; filename="${p.file}"${CRLF}${CRLF}`;
    body += `${wrap76(await blobToB64(p.blob))}${CRLF}${CRLF}`;
  }
  body += `--${b1}--${CRLF}`;
  return { name: `${safeName(doc.name)}.eml`, blob: new Blob([body], { type: 'message/rfc822' }) };
}
