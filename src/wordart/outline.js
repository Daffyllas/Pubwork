// Text to outlines for WordArt: the letters are read from the app's free font files (the same ones the PDF
// export uses) and turned into contours of points, so the result can be bent and drawn as a plain path.
import fontkit from '@pdf-lib/fontkit';
import { fontInfo, embeddedFontBytes } from '../fonts.js';

// the site's top folder: pages in other languages live one folder down (/de/), the fonts stay at the top
const siteRoot = () => new URL(document.querySelector('meta[name="pw-root"]')?.content || './', document.baseURI);
const GENERIC = { serif: 'Tinos', 'sans-serif': 'Arimo', monospace: 'Cousine', cursive: 'Dancing Script' };
const FALLBACKS = ['Arimo', 'Tinos', 'Open Sans'];
export const SIZE = 100; // letters are made 100pt tall, then scaled to the box

let manifest = null; // Promise<Map family(lower case) -> [{family, weight, style, ranges, file}]>
const files = new Map(); // file name -> Promise<fontkit font | null>
const embedded = new Map(); // embedded font name -> fontkit font | null

function loadManifest() {
  manifest ||= fetch(new URL('pdffonts/manifest.json', siteRoot())).then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => {
    const m = new Map();
    for (const f of list) { const k = f.family.toLowerCase(); if (!m.has(k)) m.set(k, []); m.get(k).push(f); }
    return m;
  });
  return manifest;
}
function loadFile(file) {
  if (!files.has(file)) {
    files.set(file, fetch(new URL(`pdffonts/${file}`, siteRoot())).then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? fontkit.create(new Uint8Array(b)) : null)).catch(() => null));
  }
  return files.get(file);
}
function embeddedFont(name) {
  if (!embeddedFontBytes.has(name)) return null;
  if (!embedded.has(name)) { let f = null; try { f = fontkit.create(embeddedFontBytes.get(name)); } catch { f = null; } embedded.set(name, f); }
  return embedded.get(name);
}

// the families to try, in order, for a font name as it is written in the document
export function familyChain(name) {
  const info = fontInfo(name);
  const bold = /black|heavy|extra bold|demi/i.test(name || '');
  return { list: [...new Set([name, info.standIn, GENERIC[info.generic], ...FALLBACKS].filter(Boolean))], forceBold: bold };
}

// which face draws character cp: { key, font?, file?, synthItalic }
function pick(fam, chain, weight, italic, cp) {
  for (const name of chain) {
    const emb = embeddedFont(name);
    if (emb && emb.hasGlyphForCodePoint(cp)) return { key: `emb:${name}`, font: emb, synthItalic: false };
    const list = fam.get(String(name).toLowerCase());
    if (!list) continue;
    const cover = list.filter((f) => f.ranges.some(([a, b]) => cp >= a && cp <= b));
    if (!cover.length) continue;
    const want = italic ? 'italic' : 'normal';
    cover.sort((a, b) => ((a.style === want ? 0 : 1000) + Math.abs(a.weight - weight)) - ((b.style === want ? 0 : 1000) + Math.abs(b.weight - weight)));
    return { key: cover[0].file, file: cover[0].file, synthItalic: italic && cover[0].style !== 'italic' };
  }
  return null;
}

// fontkit path commands -> contours [{c:'M'|'L'|'Q'|'C', p:[[x,y]…]}], in points, y down, origin at (ox, base)
function contours(path, k, ox, base, skew) {
  const out = []; let cur = null;
  const P = (x, y) => { const yy = base - y * k; return [ox + x * k + skew * (base - yy), yy]; };
  for (const { command, args } of path.commands) {
    if (command === 'moveTo') { cur = []; out.push(cur); cur.push({ c: 'M', p: [P(args[0], args[1])] }); }
    else if (!cur) continue;
    else if (command === 'lineTo') cur.push({ c: 'L', p: [P(args[0], args[1])] });
    else if (command === 'quadraticCurveTo') cur.push({ c: 'Q', p: [P(args[0], args[1]), P(args[2], args[3])] });
    else if (command === 'bezierCurveTo') cur.push({ c: 'C', p: [P(args[0], args[1]), P(args[2], args[3]), P(args[4], args[5])] });
    else if (command === 'closePath') cur.push({ c: 'Z', p: [] });
  }
  return out.filter((c) => c.length > 2);
}

// Lay out the text (several lines allowed, each centred) and return its outlines.
// -> { contours, missing } where missing counts letters no font could draw
export async function textOutlines({ text, font, bold, italic }) {
  const fam = await loadManifest();
  const { list: chain, forceBold } = familyChain(font);
  const weight = bold || forceBold ? 700 : 400;
  const lines = String(text || '').normalize('NFC').split(/\r?\n/);
  const lineH = SIZE * 1.2;
  let missing = 0;
  const laid = [];
  for (let li = 0; li < lines.length; li++) {
    // split the line into pieces drawn by the same font file
    const pieces = [];
    for (const ch of lines[li]) {
      const cp = ch.codePointAt(0);
      if (cp < 32) continue;
      const face = pick(fam, chain, weight, italic, cp) || (cp === 32 ? pick(fam, FALLBACKS, weight, italic, cp) : null);
      if (!face) { missing++; continue; }
      const last = pieces[pieces.length - 1];
      if (last && last.face.key === face.key) last.text += ch; else pieces.push({ face, text: ch });
    }
    const glyphs = []; let x = 0;
    for (const pc of pieces) {
      const f = pc.face.font || await loadFile(pc.face.file);
      if (!f) { missing += [...pc.text].length; continue; }
      const k = SIZE / f.unitsPerEm, skew = pc.face.synthItalic ? 0.2 : 0;
      let run; try { run = f.layout(pc.text); } catch { missing += [...pc.text].length; continue; }
      run.glyphs.forEach((g, i) => {
        const pos = run.positions[i];
        glyphs.push({ g, k, skew, x: x + pos.xOffset * k, dy: pos.yOffset * k });
        x += pos.xAdvance * k;
      });
    }
    laid.push({ glyphs, width: x, base: li * lineH });
  }
  const maxW = Math.max(0, ...laid.map((l) => l.width));
  const out = [];
  for (const l of laid) {
    const shift = (maxW - l.width) / 2;
    for (const gl of l.glyphs) {
      let path; try { path = gl.g.path; } catch { continue; }
      out.push(...contours(path, gl.k, gl.x + shift, l.base - gl.dy, gl.skew));
    }
  }
  return { contours: out, missing };
}
