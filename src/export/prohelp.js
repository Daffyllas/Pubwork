// Small helpers shared by the Scribus (.sla) and InDesign (.idml) exports.

export const BLEED = (3 * 72) / 25.4; // 3 mm past the edge of the page, for the print shop

// '#abc', '#aabbcc' or 'rgb(…)' -> 'AABBCC' (null for anything else, like 'transparent')
export function hex6(c) {
  if (!c) return null;
  let m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(c).trim());
  if (m) return (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toUpperCase();
  m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c);
  return m ? [m[1], m[2], m[3]].map((v) => Math.max(0, Math.min(255, Math.round(+v))).toString(16).padStart(2, '0')).join('').toUpperCase() : null;
}

// the name page-layout programs know a font's style by: "Arial Bold Italic"
export const fontStyle = (bold, italic) => (bold && italic ? 'Bold Italic' : bold ? 'Bold' : italic ? 'Italic' : 'Regular');
export const fontFace = (name, bold, italic) => `${String(name).trim()} ${fontStyle(bold, italic)}`;

// where the top-left corner of a box turned (clockwise, degrees) around its centre ends up
export function rotCorner(it) {
  if (!it.rot) return [it.x, it.y];
  const t = (it.rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const u = -it.w / 2, v = -it.h / 2;
  return [it.x + it.w / 2 + u * c - v * s, it.y + it.h / 2 + u * s + v * c];
}

// move/line/curve steps -> "M0 0 L1 1 C… Z" (quadratic curves become cubic ones)
export function pathCmds(cmds, n) {
  let cur = [0, 0], start = [0, 0];
  const P = ([x, y]) => `${n(x)} ${n(y)}`;
  return cmds.map((c) => {
    if (c[0] === 'M') { cur = start = c[1]; return `M${P(c[1])}`; }
    if (c[0] === 'L') { cur = c[1]; return `L${P(c[1])}`; }
    if (c[0] === 'C') { cur = c[3]; return `C${P(c[1])} ${P(c[2])} ${P(c[3])}`; }
    if (c[0] === 'Q') {
      const [q, e] = [c[1], c[2]];
      const c1 = [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])], c2 = [e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1])];
      cur = e; return `C${P(c1)} ${P(c2)} ${P(e)}`;
    }
    cur = start; return 'Z';
  }).join(' ');
}

// For the print shop: plain coloured boxes that touch the edge of the page are carried into the bleed,
// so no white line shows if the cut is a hair off (as the Print window's bleed does for PDFs).
export function bleedEdges(pg) {
  const e = 0.75;
  for (const it of pg.items) {
    if (it.type !== 'shape' || it.geom !== 'rect' || it.rot || !it.fill) continue;
    if (it.x <= e) { it.w += it.x + BLEED; it.x = -BLEED; }
    if (it.y <= e) { it.h += it.y + BLEED; it.y = -BLEED; }
    if (it.x + it.w >= pg.w - e) it.w = pg.w + BLEED - it.x;
    if (it.y + it.h >= pg.h - e) it.h = pg.h + BLEED - it.y;
  }
}

// the resolution written in a PNG (pHYs) or JPEG (JFIF) file, in dots per inch; 0 when it says none
export function dpiOf(u8) {
  if (u8[0] === 0x89 && u8[1] === 0x50) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    for (let at = 8; at + 12 <= u8.length;) {
      const len = dv.getUint32(at), type = String.fromCharCode(u8[at + 4], u8[at + 5], u8[at + 6], u8[at + 7]);
      if (type === 'pHYs' && u8[at + 16] === 1) return Math.round(dv.getUint32(at + 8) * 0.0254);
      if (type === 'IDAT' || type === 'IEND') return 0;
      at += 12 + len;
    }
    return 0;
  }
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff && u8[3] === 0xe0 && u8[6] === 0x4a && u8[7] === 0x46) {
    const unit = u8[13], d = (u8[14] << 8) | u8[15];
    return unit === 1 ? d : unit === 2 ? Math.round(d * 2.54) : 0;
  }
  return 0;
}

// the same file with a resolution written in (a PNG gets a pHYs part, a JPEG's JFIF header its density)
let CRC;
const crc32 = (u8) => { CRC ||= Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }); let c = 0xffffffff; for (const b of u8) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function withDpi(u8, dpi) {
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[12] === 0x49 && u8[13] === 0x48) {
    const ppm = Math.round(dpi / 0.0254), chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    const at = 8 + 12 + new DataView(u8.buffer, u8.byteOffset).getUint32(8), out = new Uint8Array(u8.length + 21);
    out.set(u8.subarray(0, at)); out.set(chunk, at); out.set(u8.subarray(at), at + 21);
    return out;
  }
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff && u8[3] === 0xe0 && u8[6] === 0x4a && u8[7] === 0x46) {
    const out = u8.slice(); out[13] = 1; out[14] = dpi >> 8; out[15] = dpi & 255; out[16] = dpi >> 8; out[17] = dpi & 255; return out;
  }
  return u8;
}

// A picture as a PNG or JPEG file with its size in pixels and its resolution: { bytes, ext, pw, ph, dpi }.
// A file that doesn't say its resolution gets 72 dpi written in, so every program sizes it the same way. Other kinds (GIF, BMP,
// and Windows metafiles, which the page shows from a converted copy) are made into a PNG.
export async function proPicture(it, pageEl) {
  let bytes = it.bytes, ext = it.ext, bmp = null;
  try { bmp = await createImageBitmap(new Blob([bytes], { type: ext === 'jpeg' ? 'image/jpeg' : `image/${ext}` })); } catch { bmp = null; }
  if (bmp && (ext === 'png' || ext === 'jpeg')) {
    const r = { bytes, ext, pw: bmp.width, ph: bmp.height, dpi: dpiOf(bytes) }; bmp.close?.();
    if (!r.dpi) { r.bytes = withDpi(bytes, 72); r.dpi = dpiOf(r.bytes) || 72; }
    return r;
  }
  // draw it: from the file itself, or else from the picture on the page at the same place
  let src = bmp;
  if (!src && pageEl) {
    const near = (a, b) => Math.abs(a - b) < 0.6;
    for (const box of pageEl.querySelectorAll(':scope > .it.pic')) {
      const img = box.querySelector('img');
      if (img?.complete && img.naturalWidth && near(parseFloat(box.style.left), it.x) && near(parseFloat(box.style.top), it.y) && near(parseFloat(box.style.width), it.w)) { src = img; break; }
    }
  }
  if (!src) return null;
  const k = Math.min(4000 / Math.max(it.w, it.h, 1), 300 / 72);
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const w = bmp ? sw : Math.max(1, Math.round(it.w * k)), h = bmp ? sh : Math.max(1, Math.round(it.h * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  c.width = c.height = 0; bmp?.close?.();
  if (!blob) return null;
  return { bytes: withDpi(new Uint8Array(await blob.arrayBuffer()), 72), ext: 'png', pw: w, ph: h, dpi: 72 };
}

// Text the page shrank to fit its box (as Publisher does) is written at the size it is shown: the
// letters by the same amount, and the tighter line spacing it used.
export function applyFit(pg, pageEl) {
  if (!pageEl) return;
  const near = (a, b) => Math.abs(a - b) < 0.6;
  const boxes = [...pageEl.querySelectorAll(':scope > .it.text.fitted, :scope > .it.text.overflow')];
  for (const it of pg.items) {
    if (it.type !== 'text') continue;
    const box = boxes.find((b) => near(parseFloat(b.style.left), it.x) && near(parseFloat(b.style.top), it.y) && near(parseFloat(b.style.width), it.w));
    if (!box) continue;
    const sp = box.querySelector('.flow span[data-fs0]'), p = box.querySelector('.flow p.para');
    const k = sp && parseFloat(sp.dataset.fs0) ? parseFloat(sp.style.fontSize) / parseFloat(sp.dataset.fs0) : 1;
    const lh = p && !p.dataset.lh && p.style.lineHeight ? parseFloat(p.style.lineHeight) : 0;
    it.paras = it.paras.map((pa) => ({
      ...pa,
      runs: k > 0 && k < 0.999 ? pa.runs.map((r) => (r.size ? { ...r, size: +(r.size * k).toFixed(2) } : r)) : pa.runs,
      lineHeight: pa.lineHeight ? (pa.lineHeight.pt && k < 0.999 ? { pt: pa.lineHeight.pt * k } : pa.lineHeight) : lh ? { mult: lh / 1.2 } : pa.lineHeight,
    }));
  }
}

// Page-layout programs leave out a last line whose lowest letters would reach past the bottom of the frame,
// where the page lets them hang over a little. Frames nobody can see (no fill, no line) get that much more
// room, on the side away from where the text sits, so no line goes missing.
export function roomForText(pg) {
  for (const it of pg.items) {
    if (it.type !== 'text' || it.rot || it.fill || (it.stroke && it.stroke.width) || !it.paras?.length) continue;
    const size = Math.max(0, ...it.paras.flatMap((pa) => pa.runs.map((r) => r.size || 0))) || 10;
    const e = size * 0.3;
    if (it.valign === 'bottom') { it.y -= e; it.h += e; } else if (it.valign === 'middle') { it.y -= e / 2; it.h += e; } else it.h += e;
  }
}

// Text pushed aside by a picture or shape (Pubwork's "wrap text"): page-layout programs can do that
// themselves, so their text frames get the whole paragraphs back (not the pieces cut for Word) and the
// picture or shape gets the program's own text wrap: it.wrap = { mode: 'square' | 'topBottom', gap }.
const WRAPS = new Set(['square', 'topBottom']);
export function nativeWrap(pg, doc, i, pageEl, withLists) {
  const page = doc.pages[i]; if (!page) return;
  const flat = (list, out = []) => { for (const it of list || []) { if (it.type === 'group') flat(it.items, out); else out.push(it); } return out; };
  const master = typeof page.master === 'string' ? doc.masters?.find((m) => m.id === page.master) : null;
  const leaves = [...flat(page.items), ...flat(master?.items)];
  const near = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.6;
  const same = (m, it) => near(m.x, it.x) && near(m.y, it.y) && near(m.w, it.w) && near(m.h, it.h);
  const boxes = pageEl ? [...pageEl.querySelectorAll(':scope > .it.text')] : [];
  // first the pictures and shapes that push text aside and are in the file
  const done = new Set();
  for (const it of pg.items) {
    if (it.type !== 'image' && it.type !== 'shape') continue;
    const m = leaves.find((x) => x.type === it.type && same(x, it));
    if (m && WRAPS.has(m.wrap) && !m.hidden) { it.wrap = { mode: m.wrap, gap: Number.isFinite(+m.wrapGap) && m.wrapGap !== null ? +m.wrapGap : 6 }; done.add(m); }
  }
  // then the text: whole paragraphs, when everything that pushes it aside wraps it in the program too
  // (a missing picture still pushes the text on the page, so that text keeps its cut pieces)
  const overlaps = (a, t) => !(a.x >= t.x + t.w || a.x + a.w <= t.x || a.y >= t.y + t.h || a.y + a.h <= t.y);
  for (const it of pg.items) {
    if (it.type !== 'text') continue;
    const m = leaves.find((x) => x.type === 'text' && same(x, it));
    const box = boxes.find((bx) => near(parseFloat(bx.style.left), it.x) && near(parseFloat(bx.style.top), it.y) && near(parseFloat(bx.style.width), it.w));
    if (!m || m.chain || !box?.querySelector(':scope > .flow > .pw-float')) continue;
    const above = leaves.slice(leaves.indexOf(m) + 1).filter((o) => WRAPS.has(o.wrap) && !o.hidden && overlaps(o, m));
    if (above.every((o) => done.has(o))) it.paras = withLists(m.paras);
  }
}
