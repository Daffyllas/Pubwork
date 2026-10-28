// Print-shop colours. Print shops print with four inks: cyan, magenta, yellow and black (CMYK). This turns
// the colours of a finished PDF (text, shapes, lines) from screen colours (RGB) into those inks, so the
// shop's machines don't have to guess. A simple conversion with "black generation": the darkest part of
// every colour is printed with black ink. Greys stay grey (black ink only). Pictures are left as they are
// (RGB): the print shop converts them with its own settings. No colour profile (OutputIntent) is added.
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFRawStream, PDFRef } from 'pdf-lib';
import { unzlibSync, zlibSync } from 'fflate';

// r, g, b from 0 to 1 -> [c, m, y, k] from 0 to 1
export function rgbToCmyk(r, g, b) {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - 1e-6) return [0, 0, 0, 1];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k];
}
const num = (v) => { const s = (Math.round(v * 10000) / 10000).toString(); return s === '-0' ? '0' : s; };

const isNum = (s) => /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s);
const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([...'()<>[]{}/%'].map((c) => c.charCodeAt(0)));

// Rewrites the colour operators of one content stream (as a latin1 string, so bytes stay bytes).
// r g b rg -> c m y k k (fill), r g b RG -> c m y k K (stroke), /DeviceRGB cs + r g b sc(n) likewise.
// Strings, inline pictures and everything else are copied unchanged. -> { text, changed }
export function rewriteContent(s) {
  const out = []; let ops = []; let i = 0, changed = 0;
  let fillRGB = false, strokeRGB = false;
  const n = s.length;
  const take = (j) => { out.push(s.slice(i, j)); i = j; };
  while (i < n) {
    const c = s.charCodeAt(i);
    if (WS.has(c)) { let j = i; while (j < n && WS.has(s.charCodeAt(j))) j++; take(j); continue; }
    if (c === 37) { let j = i; while (j < n && s[j] !== '\n' && s[j] !== '\r') j++; take(j); continue; } // % comment
    if (c === 40) { // ( string ) with nesting and escapes
      let j = i + 1, depth = 1;
      while (j < n && depth) { const ch = s[j]; if (ch === '\\') j += 2; else { if (ch === '(') depth++; else if (ch === ')') depth--; j++; } }
      take(j); ops.push({ at: out.length - 1, v: null }); continue;
    }
    if (c === 60) { // << or <hex>
      if (s[i + 1] === '<') { take(i + 2); ops.push({ at: out.length - 1, v: null }); continue; }
      const j = s.indexOf('>', i); take(j < 0 ? n : j + 1); ops.push({ at: out.length - 1, v: null }); continue;
    }
    if (c === 62 && s[i + 1] === '>') { take(i + 2); ops.push({ at: out.length - 1, v: null }); continue; }
    if (c === 91 || c === 93 || c === 123 || c === 125) { take(i + 1); ops.push({ at: out.length - 1, v: null }); continue; }
    // a name, a number or an operator: up to the next space or delimiter
    let j = i + 1; while (j < n && !WS.has(s.charCodeAt(j)) && !DELIM.has(s.charCodeAt(j))) j++;
    const tok = s.slice(i, j);
    take(j);
    if (c === 47 || isNum(tok) || tok === 'true' || tok === 'false' || tok === 'null') { ops.push({ at: out.length - 1, v: tok }); continue; }
    // an operator
    if (tok === 'BI') { // inline picture: copy everything up to EI untouched
      const m = /\sEI(?=[\s]|$)/g; m.lastIndex = i; const r = m.exec(s); const end = r ? r.index + r[0].length : n;
      take(end); ops = []; continue;
    }
    const last = (k) => ops.slice(-k);
    const three = () => { const a = last(3); return a.length === 3 && a.every((o) => o.v != null && isNum(o.v)) ? a : null; };
    const swap = (a, newOp) => {
      const [cc, mm, yy, kk] = rgbToCmyk(+a[0].v, +a[1].v, +a[2].v);
      out[a[0].at] = `${num(cc)} ${num(mm)} ${num(yy)} ${num(kk)}`; out[a[1].at] = ''; out[a[2].at] = '';
      if (newOp != null) out[out.length - 1] = newOp;
      changed++;
    };
    if (tok === 'rg' || tok === 'RG') { const a = three(); if (a) swap(a, tok === 'rg' ? 'k' : 'K'); if (tok === 'rg') fillRGB = false; else strokeRGB = false; }
    else if (tok === 'cs' || tok === 'CS') {
      const a = last(1)[0], rgb = a?.v === '/DeviceRGB';
      if (rgb) { out[a.at] = '/DeviceCMYK'; changed++; }
      if (tok === 'cs') fillRGB = rgb; else strokeRGB = rgb;
    } else if ((tok === 'sc' || tok === 'scn') && fillRGB) { const a = three(); if (a) swap(a, null); }
    else if ((tok === 'SC' || tok === 'SCN') && strokeRGB) { const a = three(); if (a) swap(a, null); }
    else if (tok === 'g' || tok === 'k') fillRGB = false;
    else if (tok === 'G' || tok === 'K') strokeRGB = false;
    ops = [];
  }
  return { text: out.join(''), changed };
}

const latin1 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; };
const bytesOf = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };

// change one stream in place; -> number of colours changed
function convertStream(ctx, ref) {
  const st = ctx.lookup(ref);
  if (!(st instanceof PDFRawStream)) return 0;
  const filter = st.dict.get(PDFName.of('Filter'));
  const name = filter instanceof PDFArray ? (filter.size() === 1 ? filter.get(0) : null) : filter;
  let raw;
  if (!filter) raw = st.contents;
  else if (name === PDFName.of('FlateDecode') && !st.dict.get(PDFName.of('DecodeParms'))) { try { raw = unzlibSync(st.contents); } catch { return 0; } }
  else return 0; // some other packing: leave it alone
  const { text, changed } = rewriteContent(latin1(raw));
  if (!changed) return 0;
  const dict = st.dict.clone(ctx);
  dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
  dict.delete(PDFName.of('DecodeParms'));
  ctx.assign(ref, PDFRawStream.of(dict, zlibSync(bytesOf(text), { level: 6 })));
  return changed;
}

// every content stream of every page, and the drawings they use (form XObjects, also inside each other)
export function convertDocument(pdf) {
  const ctx = pdf.context, seen = new Set();
  let changed = 0;
  const visit = (ref) => {
    if (!(ref instanceof PDFRef) || seen.has(ref.tag)) return;
    seen.add(ref.tag);
    const obj = ctx.lookup(ref);
    if (!(obj instanceof PDFRawStream)) return;
    changed += convertStream(ctx, ref);
    resources(ctx.lookup(ref).dict.get(PDFName.of('Resources')));
  };
  const resources = (res) => {
    res = res instanceof PDFRef ? ctx.lookup(res) : res;
    if (!(res instanceof PDFDict)) return;
    let xo = res.get(PDFName.of('XObject')); xo = xo instanceof PDFRef ? ctx.lookup(xo) : xo;
    if (!(xo instanceof PDFDict)) return;
    for (const [, v] of xo.entries()) {
      const st = v instanceof PDFRef ? ctx.lookup(v) : null;
      if (st instanceof PDFRawStream && st.dict.get(PDFName.of('Subtype')) === PDFName.of('Form')) visit(v);
    }
  };
  for (const page of pdf.getPages()) {
    const node = page.node, c = node.get(PDFName.of('Contents'));
    if (c instanceof PDFArray) for (let i = 0; i < c.size(); i++) visit(c.get(i)); else visit(c);
    resources(node.Resources());
  }
  pdf.setSubject('Colours: CMYK (DeviceCMYK, simple conversion, no colour profile). Pictures: RGB.');
  return changed;
}

// finished PDF bytes -> the same PDF with CMYK colours
export async function cmykPdf(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const changed = convertDocument(pdf);
  return { bytes: await pdf.save({ useObjectStreams: true }), changed };
}
