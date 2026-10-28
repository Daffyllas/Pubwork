// Colour schemes and font pairs, as in Publisher: one click changes every colour or font in the design.
// A scheme has five colours with jobs: main, second, accent, dark (text) and light (backgrounds).
// Changing scheme swaps each of the old scheme's colours for the new one's, wherever it is used. A file
// that never had a scheme (any .pub file) gets one worked out from the colours it uses.
import { walkItems } from '../editor/model.js';
import { retint } from './art.js';

export const SCHEMES = {
  orange: ['#bf4e19', '#f0874d', '#2a6f97', '#2b1d16', '#fbe9df'],
  ocean: ['#1d4e89', '#00a6d6', '#f6ae2d', '#13293d', '#e8f4fa'],
  forest: ['#2d6a4f', '#74c69d', '#e9c46a', '#1b3a2b', '#eef7f0'],
  berry: ['#8e1b4f', '#e0457b', '#f2b134', '#3a0f23', '#fbe8ef'],
  sunshine: ['#e07a1f', '#f6c445', '#3caea3', '#3d3027', '#fff8e6'],
  lavender: ['#6a4c93', '#b49fdc', '#f28482', '#2e2440', '#f3effa'],
  navy: ['#1f3a5f', '#c9a227', '#8a1c2b', '#111827', '#f5f1e6'],
  mint: ['#2a9d8f', '#8ecae6', '#e76f51', '#1d3557', '#eef8f6'],
  coral: ['#e76f51', '#f4a261', '#264653', '#2b2b2b', '#fdf0e9'],
  mono: ['#222222', '#7a7a7a', '#d62828', '#111111', '#f2f2f2'],
  spring: ['#5a9e3a', '#f2c12e', '#f07167', '#2d3436', '#f4faee'],
  earth: ['#8c5e3c', '#c8a27c', '#5b7553', '#3b2a1e', '#f5ede3'],
  royal: ['#4a148c', '#ffb300', '#00897b', '#1a0b3b', '#f5effa'],
  candy: ['#ff5d8f', '#4cc9f0', '#ffc43d', '#3a3a3a', '#fff4f8'],
  festive: ['#b3001b', '#1e6f3e', '#d4af37', '#2a0a0a', '#fbf6ee'],
  seaside: ['#0077b6', '#48cae4', '#e9c46a', '#023047', '#fdf6e9'],
};
export const ROLES = ['primary', 'secondary', 'accent', 'dark', 'light'];
export const schemeColors = (id) => Object.fromEntries(ROLES.map((r, i) => [r, (SCHEMES[id] || SCHEMES.orange)[i]]));

// heading font, body font. Microsoft names, so Word shows the real fonts; the screen and PDFs use the
// free look-alikes from fonts.js when the Microsoft font isn't on the computer.
export const FONT_PAIRS = {
  modern: ['Century Gothic', 'Calibri'],
  classic: ['Georgia', 'Arial'],
  bold: ['Impact', 'Arial'],
  elegant: ['Edwardian Script ITC', 'Garamond'],
  friendly: ['Comic Sans MS', 'Verdana'],
  handwritten: ['Segoe Print', 'Trebuchet MS'],
  traditional: ['Book Antiqua', 'Gill Sans MT'],
  slab: ['Rockwell', 'Franklin Gothic Book'],
  script: ['Brush Script MT', 'Century Gothic'],
  newspaper: ['Cambria', 'Calibri'],
};
export const fontPair = (id) => { const p = FONT_PAIRS[id] || FONT_PAIRS.modern; return { heading: p[0], body: p[1] }; };

// ------------------------------------------------------------------ colours
const norm = (c) => { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(c || '').trim()); if (!m) return null; return '#' + (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toLowerCase(); };
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}
// every place a colour is kept, as [get, set] pairs
function* colorSlots(doc) {
  const paras = function* (list) {
    for (const p of list || []) {
      if (p.background) yield [() => p.background, (v) => { p.background = v; }];
      for (const r of p.runs) { if (r.color) yield [() => r.color, (v) => { r.color = v; }, r.text.length]; if (r.highlight) yield [() => r.highlight, (v) => { r.highlight = v; }]; }
    }
  };
  for (const { it } of walkItems(doc)) {
    const area = (it.w || 0) * (it.h || 0);
    for (const key of ['fill', 'stroke']) {
      const f = it[key]; if (!f) continue;
      if (f.color) yield [() => f.color, (v) => { f.color = v; }, key === 'fill' ? area / 50 : 2];
      if (f.from) yield [() => f.from, (v) => { f.from = v; }, area / 100];
      if (f.to) yield [() => f.to, (v) => { f.to = v; }, area / 100];
      for (const s of f.stops || []) yield [() => s.color, (v) => { s.color = v; }, area / 100];
    }
    if (it.tint) yield [() => it.tint, (v) => retint(it, v), area / 50];
    yield* paras(it.paras);
    if (it.type === 'table') for (const row of it.rows) for (const c of row.cells) { if (c.fill) yield [() => c.fill, (v) => { c.fill = v; }, 20]; yield* paras(c.paras); }
  }
}
// the colours a document uses, given jobs: the most used strong colours become main, second and accent,
// pale ones become "light" and very dark coloured ones "dark". Greys, black and white stay as they are.
function guessRoles(doc) {
  const weight = new Map();
  for (const [get, , w = 1] of colorSlots(doc)) { const c = norm(get()); if (c) weight.set(c, (weight.get(c) || 0) + w); }
  const roles = {}; let mid = 0;
  for (const [c] of [...weight].sort((a, b) => b[1] - a[1])) {
    const { s, l } = hsl(c);
    if (s < 0.12 || l > 0.97 || l < 0.06) continue; // neutral
    roles[c] = l > 0.86 ? 'light' : l < 0.2 ? 'dark' : ROLES[Math.min(mid++, 2)];
  }
  return roles;
}
export function applyScheme(doc, id) {
  const next = schemeColors(id);
  let map; // old colour -> role
  if (doc.scheme && SCHEMES[doc.scheme]) { map = {}; ROLES.forEach((r, i) => { map[SCHEMES[doc.scheme][i]] = r; }); }
  else map = guessRoles(doc);
  for (const [get, set] of colorSlots(doc)) { const c = norm(get()); if (c && map[c]) set(next[map[c]]); }
  doc.scheme = id;
}

// ------------------------------------------------------------------ fonts
function* runs(doc) {
  for (const { it } of walkItems(doc)) {
    for (const p of it.paras || []) yield* p.runs;
    if (it.type === 'table') for (const row of it.rows) for (const c of row.cells) for (const p of c.paras || []) yield* p.runs;
  }
}
export function applyFonts(doc, id) {
  const next = fontPair(id), old = doc.fontPair && FONT_PAIRS[doc.fontPair] ? fontPair(doc.fontPair) : null;
  for (const r of runs(doc)) {
    if (!r.text) continue;
    if (old && r.font === old.heading) r.font = next.heading;
    else if (old && r.font === old.body) r.font = next.body;
    else if (!old) r.font = (r.size || 10) >= 16 ? next.heading : next.body; // a file without a font pair: big text is a heading
  }
  doc.fontPair = id;
  doc.fonts = {}; for (const r of runs(doc)) if (r.font) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1;
}
