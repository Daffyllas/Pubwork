// Catalogue merge: a list of products (name, price, description, section, photo) becomes a price list or
// pages of product cards, in the document's colours and fonts.
import { makeKit } from '../templates/kit.js';
import { schemeColors, fontPair } from '../templates/schemes.js';
import { loadArt } from '../templates/art.js';

// fit a picture to a frame by cutting off the edges: -> { mime, data }
export async function coverCrop(file, ratio, max = 1400) {
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = new Image(); img.src = url; await img.decode();
  let sw = img.naturalWidth, sh = img.naturalHeight;
  if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
  const k = Math.min(1, max / Math.max(sw, sh)), c = document.createElement('canvas');
  c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext('2d').drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  const out = c.toDataURL('image/jpeg', 0.88);
  return { mime: 'image/jpeg', data: out.slice(out.indexOf(',') + 1) };
}

// rows: [{ name, price, desc, section, photo: {mime,data}|null }]
export async function buildCatalogue(rows, { title = '', layout = 'list', scheme = 'orange', fonts = 'modern', lang = 'en', name = 'Catalogue' } = {}) {
  await loadArt();
  // rows of one section stay together, sections in the order they first appear (so a heading is never repeated)
  const order = new Map(); rows.forEach((r) => { const key = r.section || ''; if (!order.has(key)) order.set(key, order.size); });
  rows = rows.map((r, i) => ({ r, i })).sort((a, b) => order.get(a.r.section || '') - order.get(b.r.section || '') || a.i - b.i).map((x) => x.r);
  const k = makeKit({ scheme: schemeColors(scheme), fonts: fontPair(fonts), s: (x) => x, lang });
  k.page('paper');
  const { W, H } = k;
  const header = (first) => {
    if (first) {
      k.rect(0, 0, W, 34, { fill: 'primary' });
      k.text(16, 8, W - 32, 20, title, { size: 30, font: 'heading', color: 'light', bold: true, valign: 'middle' });
      return 44;
    }
    k.rect(0, 0, W, 10, { fill: 'primary' });
    k.text(16, 1, W - 32, 8, title, { size: 10, color: 'light', caps: true, tracking: 2, valign: 'middle' });
    return 18;
  };
  let y = header(true), section = null;
  const newPage = () => { k.page('paper'); y = header(false); };
  if (layout === 'list') {
    for (const r of rows) {
      const need = (r.section && r.section !== section ? 16 : 0) + (r.desc ? 15 : 9);
      if (y + need > H - 14) newPage();
      if (r.section && r.section !== section) {
        section = r.section;
        k.text(16, y + 2, W - 32, 10, section, { size: 18, font: 'heading', color: 'primary', bold: true });
        k.line(16, y + 13, W - 16, y + 13, { color: 'secondary', width: 0.8 });
        y += 16;
      }
      k.text(16, y, W - 60, 7, r.name, { size: 13, bold: true });
      if (r.price) k.text(W - 46, y, 30, 7, r.price, { size: 13, bold: true, color: 'primary', align: 'right' });
      if (r.desc) k.text(16, y + 6.5, W - 60, 7, r.desc, { size: 10.5, italic: true });
      y += r.desc ? 15 : 9;
    }
  } else {
    const cols = 2, rowsPer = 3, gap = 8, cw = (W - 32 - gap) / cols, ch = (H - y - 14 - gap * (rowsPer - 1)) / rowsPer;
    let i = 0, top = y;
    for (const r of rows) {
      if (i === cols * rowsPer) { newPage(); top = y; i = 0; }
      const x = 16 + (i % cols) * (cw + gap), yy = top + Math.floor(i / cols) * (ch + gap);
      k.rect(x, yy, cw, ch, { fill: 'light', r: 3 });
      const ph = ch * 0.58;
      if (r.photo) { const it = k.photo(x, yy, cw, ph); it.data = r.photo.data; it.mime = r.photo.mime; delete it.placeholder; }
      else k.photo(x, yy, cw, ph);
      k.text(x + 4, yy + ph + 3, cw - 30, 9, r.name, { size: 13, bold: true, font: 'heading' });
      if (r.price) { k.rect(x + cw - 26, yy + ph - 8, 24, 10, { fill: 'accent', r: 5 }); k.text(x + cw - 26, yy + ph - 8, 24, 10, r.price, { size: 11, bold: true, color: 'light', align: 'center', valign: 'middle' }); }
      if (r.desc) k.text(x + 4, yy + ph + 12, cw - 8, ch - ph - 14, r.desc, { size: 10, lh: 1.25 });
      i++;
    }
  }
  const doc = { version: 1, name, pages: k.pages, masters: [], fonts: {}, embeddedFonts: [], meta: {}, source: 'catalogue', notes: {}, scheme, fontPair: fonts };
  for (const pg of doc.pages) for (const it of pg.items) for (const p of it.paras || []) for (const r of p.runs) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1;
  return doc;
}
