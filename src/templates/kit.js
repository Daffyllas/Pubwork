// A small drawing kit for templates. Templates are written in millimetres, relative to the page (k.W, k.H),
// with colours named by their job in the scheme ('primary', 'light'…) and fonts by 'heading' or 'body',
// so the same design comes out right in any colour scheme, font pair, paper size and language.
import { uid, PAPER } from '../editor/model.js';
import { schemeColors, fontPair } from './schemes.js';
import { artItem, loadArt } from './art.js';
import { fillDetails } from './details.js';

const MM = 72 / 25.4;
const P = (v) => v * MM;

// Letter-paper countries get US sizes; everyone else gets ISO sizes
const US = /-(US|CA|MX|PH|CL|CO|VE|GT|CR|PA|DO|SV|HN|NI|PR)$/i;
export const usPaper = () => US.test(navigator.language || '') || (navigator.languages || []).slice(0, 1).some((l) => US.test(l));
export function paperFor(size) {
  const us = usPaper();
  const alias = { paper: us ? 'letter' : 'a4', 'paper-landscape': us ? 'letter-landscape' : 'a4-landscape', half: us ? 'halfletter' : 'a5', 'half-landscape': us ? 'halfletter-landscape' : 'a5-landscape', card: us ? 'card-us' : 'card', quarter: us ? 'postcard-us' : 'a6', 'quarter-landscape': us ? 'postcard-us-landscape' : 'a6-landscape' }[size] || size;
  return PAPER[alias] || PAPER.a4;
}

export function makeKit({ scheme, fonts, s, lang }) {
  const C = (c) => (c == null || c === 'none' ? null : scheme[c] || c);
  const F = (f) => (f === 'heading' || f === 'body' ? fonts[f] : f || fonts.body);
  const pages = [];
  let page = null;
  const add = (it) => { it.id = uid(); page.items.push(it); return it; };
  const fill = (c, opacity) => (C(c) ? { type: 'solid', color: C(c), opacity: opacity ?? 1 } : null);
  const stroke = (c, width = 1, dash = null) => (C(c) ? { color: C(c), width, ...(dash ? { dash } : {}), ...(dash && dash[0] < 1 ? { cap: 'round' } : {}) } : null);

  const k = {
    s, lang, scheme, fonts, C, F, pages,
    get W() { return page.w / MM; },
    get H() { return page.h / MM; },
    page(size = 'paper') { const p = typeof size === 'string' ? paperFor(size) : { w: P(size[0]), h: P(size[1]) }; page = { id: uid('p'), w: p.w, h: p.h, items: [] }; pages.push(page); return k; },
    // ---------------------------------------------------------------- shapes
    rect(x, y, w, h, o = {}) {
      return add({ type: 'shape', kind: 'rect', x: P(x), y: P(y), w: P(w), h: P(h), rx: o.r ? P(o.r) : 0, fill: fill(o.fill ?? 'primary', o.opacity), stroke: o.stroke ? stroke(o.stroke, o.sw, o.dash) : null, ...(o.rotate ? { rotate: o.rotate } : {}) });
    },
    ellipse(x, y, w, h, o = {}) {
      return add({ type: 'shape', kind: 'ellipse', x: P(x), y: P(y), w: P(w), h: P(h), fill: fill(o.fill ?? 'primary', o.opacity), stroke: o.stroke ? stroke(o.stroke, o.sw, o.dash) : null, ...(o.rotate ? { rotate: o.rotate } : {}) });
    },
    circle(cx, cy, r, o = {}) { return k.ellipse(cx - r, cy - r, 2 * r, 2 * r, o); },
    line(x1, y1, x2, y2, o = {}) {
      const pts = [[P(x1), P(y1)], [P(x2), P(y2)]];
      return add({ type: 'shape', kind: 'polyline', x: Math.min(pts[0][0], pts[1][0]), y: Math.min(pts[0][1], pts[1][1]), w: Math.abs(pts[1][0] - pts[0][0]), h: Math.abs(pts[1][1] - pts[0][1]), points: pts, fill: null, stroke: stroke(o.color ?? 'dark', o.width ?? 1, o.dash) });
    },
    poly(points, o = {}) {
      const pts = points.map(([x, y]) => [P(x), P(y)]);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return add({ type: 'shape', kind: o.open ? 'polyline' : 'polygon', x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), points: pts, fill: o.open ? null : fill(o.fill ?? 'primary', o.opacity), stroke: o.stroke ? stroke(o.stroke, o.sw, o.dash) : null });
    },
    // a path in millimetres with absolute M, L, C, Q and Z steps
    path(d, o = {}) {
      const nums = []; const dd = d.replace(/-?\d*\.?\d+/g, (n) => { const v = +n * MM; nums.push(v); return +v.toFixed(2); });
      const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
      return add({ type: 'shape', kind: 'path', d: dd, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), fill: o.open ? null : fill(o.fill ?? 'primary', o.opacity), stroke: o.stroke ? stroke(o.stroke, o.sw, o.dash) : null });
    },
    star(cx, cy, r, o = {}) {
      const n = o.points || 5, inner = r * (o.inner || 0.45), pts = [];
      for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? inner : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
      return k.poly(pts, o);
    },
    // a soft wave across the page: the area below (or above) the curve is filled
    wave(y, amp, o = {}) {
      const W = k.W, H = k.H, n = o.waves || 2, seg = W / n, below = o.below !== false;
      let d = `M0 ${y}`;
      for (let i = 0; i < n; i++) { const x0 = i * seg; d += ` C${x0 + seg / 3} ${y - amp} ${x0 + (2 * seg) / 3} ${y + amp} ${x0 + seg} ${y}`; }
      d += below ? ` L${W} ${H} L0 ${H} Z` : ` L${W} 0 L0 0 Z`;
      return k.path(d, o);
    },
    // ---------------------------------------------------------------- text
    // content: a string (lines become paragraphs) or a list of paragraph specs
    // { t, size, bold, italic, color, font, align, after, before, caps, tracking, lh, runs: [...] }
    text(x, y, w, h, content, o = {}) {
      const list = Array.isArray(content) ? content : [content];
      const paras = [];
      for (const spec0 of list) {
        const spec = typeof spec0 === 'string' ? { t: spec0 } : spec0;
        const run = (r) => {
          const out = { text: r.t ?? r.text ?? '', font: F(r.font ?? spec.font ?? o.font ?? 'body'), size: r.size ?? spec.size ?? o.size ?? 12, color: C(r.color ?? spec.color ?? o.color ?? 'dark') };
          if (r.bold ?? spec.bold ?? o.bold) out.bold = true;
          if (r.italic ?? spec.italic ?? o.italic) out.italic = true;
          if (r.caps ?? spec.caps ?? o.caps) out.caps = 'all';
          const tr = r.tracking ?? spec.tracking ?? o.tracking; if (tr) out.tracking = tr;
          if (r.underline) out.underline = 'single';
          return out;
        };
        const lines = spec.runs ? [null] : String(spec.t ?? '').split('\n');
        lines.forEach((line, i) => {
          const pa = { align: spec.align ?? o.align ?? 'left', runs: spec.runs ? spec.runs.map(run) : [run({ t: line })] };
          const lh = spec.lh ?? o.lh; if (lh) pa.lineHeight = { mult: lh };
          const after = i === lines.length - 1 ? spec.after ?? o.after : o.lineAfter; if (after) pa.spaceAfter = after;
          const before = i === 0 ? spec.before : 0; if (before) pa.spaceBefore = before;
          if (spec.bullet) pa.bullet = spec.bullet;
          if (spec.indent) { pa.indentLeft = P(spec.indent); }
          if (spec.tabs) pa.tabs = spec.tabs.map((tb) => ({ ...tb, pos: P(tb.pos) })); // tab stops: { pos (mm), align, leader }
          if (spec.dropCap && i === 0) pa.dropCap = spec.dropCap;
          paras.push(pa);
        });
      }
      const pad = o.pad == null ? [0, 0, 0, 0] : (Array.isArray(o.pad) ? o.pad : [o.pad, o.pad, o.pad, o.pad]).map(P);
      const it = { type: 'text', x: P(x), y: P(y), w: P(w), h: P(h), pad, valign: o.valign || 'top', columns: o.columns || 1, columnGap: P(o.gap ?? 5), fill: o.fill ? fill(o.fill, o.opacity) : null, stroke: o.stroke ? stroke(o.stroke, o.sw) : null, paras };
      if (o.field) it.field = o.field;
      else { // sample contact details inside a longer line ("phone · e-mail"): remembered so My details can replace them
        const marks = [];
        for (const key of ['phone', 'email', 'web', 'address']) {
          const sample = s(`common.${key}`);
          if (sample && sample !== `common.${key}` && paras.some((pa) => pa.runs.some((r) => r.text.includes(sample)))) marks.push([sample, key]);
        }
        if (marks.length) it.details = marks;
      }
      if (o.rotate) it.rotate = o.rotate;
      return add(it);
    },
    // ---------------------------------------------------------------- tables
    // rows of cells: a cell is a string or { t, size, bold, color, fill, align, valign, italic }
    table(x, y, w, h, rows, o = {}) {
      const nCols = Math.max(...rows.map((r) => r.length)), colW = o.cols ? o.cols.map(P) : Array(nCols).fill(P(w) / nCols);
      const rowH = o.rowHeights ? o.rowHeights.map(P) : Array(rows.length).fill(P(h) / rows.length);
      const border = o.border === false ? null : `${o.borderWidth ?? 0.5}pt solid ${C(o.borderColor ?? '#c9c4bf')}`;
      const out = rows.map((r, ri) => ({ h: rowH[ri], cells: Array.from({ length: nCols }, (_, ci) => {
        const c0 = r[ci] ?? ''; const c = typeof c0 === 'string' ? { t: c0 } : c0;
        const run = { text: String(c.t ?? ''), font: F(c.font ?? o.font ?? 'body'), size: c.size ?? o.size ?? 10, color: C(c.color ?? o.color ?? 'dark') };
        if (c.bold ?? o.bold) run.bold = true; if (c.italic) run.italic = true;
        return { col: ci, span: [1, 1], covered: false, fill: C(c.fill ?? o.fill ?? null), valign: c.valign ?? o.valign ?? 'top', borders: [border, border, border, border], paras: [{ align: c.align ?? o.align ?? 'left', runs: [run] }, ...(c.sub || []).map((x) => ({ align: c.align ?? o.align ?? 'left', runs: [{ text: x, font: F('body'), size: c.subSize ?? 6.5, color: C(c.subColor ?? 'dark') }] }))] };
      }) }));
      return add({ type: 'table', x: P(x), y: P(y), w: P(w), h: P(h), cols: colW, rows: out });
    },
    // ---------------------------------------------------------------- pictures
    art(id, x, y, w, h, o = {}) { const it = artItem(id, P(x), P(y), P(w), P(h), { color: C(o.color ?? 'primary'), rotate: o.rotate }); if (o.field) it.field = o.field; return add(it); },
    photo(x, y, w, h, o = {}) { const it = { type: 'image', x: P(x), y: P(y), w: P(w), h: P(h), placeholder: true }; if (o.round) it.round = true; if (o.field) it.field = o.field; return add(it); },
    // a logo frame: the person's logo from "My details", or a placeholder picture until there is one
    logo(x, y, w, h, o = {}) { return o.art ? k.art(o.art, x, y, w, h, { ...o, field: 'logo' }) : k.photo(x, y, w, h, { ...o, field: 'logo' }); },
  };
  return k;
}

// template -> a new document
export async function buildTemplate(tpl, { lang = 'en', strings, scheme, fonts, details = null } = {}) {
  await loadArt();
  const s = (key, vars) => {
    let v = strings?.[lang]?.[key] ?? strings?.en?.[key] ?? key;
    if (vars) v = v.replace(/\{(\w+)\}/g, (m, n) => vars[n] ?? m);
    return v;
  };
  const sc = scheme || tpl.scheme || 'orange', fp = fonts || tpl.fonts || 'modern';
  const k = makeKit({ scheme: schemeColors(sc), fonts: fontPair(fp), s, lang });
  k.page(tpl.size || 'paper');
  tpl.build(k);
  const doc = { version: 1, name: s(tpl.name), pages: k.pages, masters: [], fonts: {}, embeddedFonts: [], meta: {}, source: 'template', template: tpl.id, notes: {}, scheme: sc, fontPair: fp };
  for (const pg of doc.pages) for (const it of pg.items) for (const p of it.paras || []) for (const r of p.runs) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1;
  if (details) fillDetails(doc, details);
  return doc;
}
