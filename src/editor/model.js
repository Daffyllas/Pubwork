// Small helpers for changing the document: finding items, copying, moving and resizing them, and the
// undo history. Items live in page.items (and in group.items); positions are points from the page's top-left.

let counter = 0;
const salt = Math.random().toString(36).slice(2, 6);
export const uid = (p = 'e') => `${p}${salt}${(++counter).toString(36)}`;

// deep copy that keeps long strings (picture data) shared instead of duplicated
export function clone(v) {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = clone(v[k]); return o; }
  return v;
}

// every item with its page and the list that holds it
export function* walkItems(doc) {
  for (const page of doc.pages) {
    const rec = function* (list, parent) { for (const it of list) { yield { it, list, page, parent }; if (it.type === 'group') yield* rec(it.items, it); } };
    yield* rec(page.items, null);
  }
}
export function findItem(doc, id) { for (const e of walkItems(doc)) if (e.it.id === id) return e; return null; }
export const pageOf = (doc, id) => findItem(doc, id)?.page || null;

// the area an item covers (groups: all their items)
export function bounds(it) {
  if (it.type === 'group') {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of it.items) { const b = bounds(c); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
  }
  return { x: it.x || 0, y: it.y || 0, w: it.w || 0, h: it.h || 0 };
}
export function unionBounds(items) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) { const b = bounds(it); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

// map every coordinate of an item through f([x, y]) -> [x, y]; k = [sx, sy] scales lengths
function mapPath(d, f, k) {
  const tok = d.match(/[MLCQAZHVmlcqazhv]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let out = '', i = 0, cmd = '';
  const num = () => parseFloat(tok[i++]);
  const pt = () => { const [x, y] = f([num(), num()]); return `${+x.toFixed(2)} ${+y.toFixed(2)}`; };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z' || cmd === 'z') { out += 'Z'; continue; } out += cmd; }
    switch (cmd) {
      case 'M': case 'L': out += pt() + ' '; break;
      case 'C': out += `${pt()} ${pt()} ${pt()} `; break;
      case 'Q': out += `${pt()} ${pt()} `; break;
      case 'A': { const rx = num() * Math.abs(k[0]), ry = num() * Math.abs(k[1]), rot = num(), la = num(); let sw = num(); if (k[0] * k[1] < 0) sw = 1 - sw; out += `${+rx.toFixed(2)} ${+ry.toFixed(2)} ${rot} ${la} ${sw} ${pt()} `; break; }
      default: i++; break; // relative or unknown commands are not produced by the reader
    }
  }
  return out.trim();
}
export function transformItem(it, f, k = [1, 1]) {
  if (it.type === 'group') { for (const c of it.items) transformItem(c, f, k); return; }
  const [x0, y0] = f([it.x, it.y]), [x1, y1] = f([it.x + it.w, it.y + it.h]);
  it.x = Math.min(x0, x1); it.y = Math.min(y0, y1); it.w = Math.abs(x1 - x0); it.h = Math.abs(y1 - y0);
  if (it.points) it.points = it.points.map(f);
  if (it.d) it.d = mapPath(it.d, f, k);
  if (it.type === 'table' && (k[0] !== 1 || k[1] !== 1)) { it.cols = it.cols.map((c) => c * Math.abs(k[0])); for (const r of it.rows) if (r.h) r.h *= Math.abs(k[1]); }
  if (it.rx) it.rx *= Math.min(Math.abs(k[0]), Math.abs(k[1]));
}
export const moveItem = (it, dx, dy) => transformItem(it, ([x, y]) => [x + dx, y + dy]);
export function resizeItem(it, from, to) {
  const sx = from.w ? to.w / from.w : 1, sy = from.h ? to.h / from.h : 1;
  transformItem(it, ([x, y]) => [to.x + (x - from.x) * sx, to.y + (y - from.y) * sy], [sx, sy]);
  // a chart is drawn like a picture: its words (and lines) grow and shrink with it, so they still fit
  const k = Math.min(Math.abs(sx), Math.abs(sy));
  const charts = (x) => { if (x.type !== 'group') return; if (x.chart) scaleStyle(x, k); else x.items.forEach(charts); };
  if (k > 0 && k !== 1) charts(it);
}

// ------------------------------------------------------------------ turned items
// it.rotate: degrees the item is turned to the LEFT (anticlockwise) around its middle; the page shows
// rotate(-it.rotate). A group's own `rotate` is only the turn of its frame (its items carry their own turns).
const RAD = Math.PI / 180;
export const normAngle = (a) => { let r = (((+a || 0) % 360) + 360) % 360; if (r > 180) r -= 360; r = Math.round(r * 100) / 100; return r === -180 ? 180 : Math.abs(r) < 0.005 ? 0 : r; };
// the page directions of an item's own x and y axes (y points down the page)
export function axes(a) { const t = -(a || 0) * RAD, c = Math.cos(t), s = Math.sin(t); return [[c, s], [-s, c]]; }
export function leaves(it, out = []) { if (it.type === 'group') it.items.forEach((c) => leaves(c, out)); else out.push(it); return out; }
// the turn of a picked thing: its own; a group's frame turn (or the turn all its items share)
export function angleOf(it) {
  if (it.type !== 'group') return normAngle(it.rotate || 0);
  if (Number.isFinite(it.rotate)) return normAngle(it.rotate);
  const all = leaves(it).map((x) => normAngle(x.rotate || 0));
  return all.length && all.every((a) => Math.abs(a - all[0]) < 0.01) ? all[0] : 0;
}
// the four corners of an item as drawn
function corners(it) {
  const b = bounds(it), cx = b.x + b.w / 2, cy = b.y + b.h / 2, [ex, ey] = axes(it.rotate || 0);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [cx + (i * b.w / 2) * ex[0] + (j * b.h / 2) * ey[0], cy + (i * b.w / 2) * ex[1] + (j * b.h / 2) * ey[1]]);
}
// The frame around picked things: { cx, cy, w, h, a } (middle, size and turn). One thing: its own box, turned
// with it. Several: upright, around all of them as drawn.
export function frameOf(items) {
  if (!items.length) return null;
  const a = items.length === 1 ? angleOf(items[0]) : 0, [ex, ey] = axes(a);
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (const it of items) for (const x of leaves(it)) for (const [px, py] of corners(x)) {
    const u = px * ex[0] + py * ex[1], v = px * ey[0] + py * ey[1];
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  if (!Number.isFinite(u0)) return null;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  return { cx: cu * ex[0] + cv * ey[0], cy: cu * ex[1] + cv * ey[1], w: u1 - u0, h: v1 - v0, a };
}
// a point on the page <-> the same point in the frame's own axes (from its middle)
export function toLocal(f, [x, y]) { const [ex, ey] = axes(f.a), dx = x - f.cx, dy = y - f.cy; return [dx * ex[0] + dy * ex[1], dx * ey[0] + dy * ey[1]]; }
export function toPage(f, [u, v]) { const [ex, ey] = axes(f.a); return [f.cx + u * ex[0] + v * ey[0], f.cy + u * ex[1] + v * ey[1]]; }
// the upright box around a frame (or around an item as drawn)
export function frameBox(f) {
  const [ex, ey] = axes(f.a), hw = (Math.abs(ex[0]) * f.w + Math.abs(ey[0]) * f.h) / 2, hh = (Math.abs(ex[1]) * f.w + Math.abs(ey[1]) * f.h) / 2;
  return { x: f.cx - hw, y: f.cy - hh, w: 2 * hw, h: 2 * hh };
}
export const drawnBounds = (it) => frameBox(frameOf([it]) || { cx: 0, cy: 0, w: 0, h: 0, a: 0 });
export const isTurned = (items) => items.some((it) => (it.type === 'group' && it.rotate) || leaves(it).some((x) => normAngle(x.rotate || 0)));

// where a turned box's top-left must go when it grows from h to newH, so its top edge stays where it is
export function grownAt(x, y, h, newH, rot) {
  if (!rot) return [x, y];
  const d = (newH - h) / 2, ey = axes(rot)[1];
  return [x + d * ey[0], y + d * (ey[1] - 1)];
}
// turn items by deg (to the left) around the point (cx, cy)
export function turnItems(items, deg, cx, cy) {
  if (!deg) return;
  const t = -deg * RAD, c = Math.cos(t), s = Math.sin(t);
  const turn = (it) => {
    if (it.type === 'group') { const a = normAngle(angleOf(it) + deg); it.items.forEach(turn); if (a) it.rotate = a; else delete it.rotate; return; }
    const b = bounds(it), mx = b.x + b.w / 2, my = b.y + b.h / 2, dx = mx - cx, dy = my - cy;
    moveItem(it, cx + dx * c - dy * s - mx, cy + dx * s + dy * c - my);
    const r = normAngle((it.rotate || 0) + deg);
    if (r) it.rotate = r; else delete it.rotate;
  };
  items.forEach(turn);
}
// Resize items from frame f0 to frame f1 (same turn): along the frame's own axes. Items turned like the frame
// (or by a quarter) keep their shape exactly; others keep their turn and get the nearest size.
export function resizeInFrame(it, f0, f1) {
  const sx = f0.w ? f1.w / f0.w : 1, sy = f0.h ? f1.h / f0.h : 1;
  const one = (x) => {
    if (x.type === 'group') { x.items.forEach(one); return; }
    const b = bounds(x), [u, v] = toLocal(f0, [b.x + b.w / 2, b.y + b.h / 2]), [nx, ny] = toPage(f1, [u * sx, v * sy]);
    const rel = ((x.rotate || 0) - f0.a) * RAD, cs = Math.abs(Math.cos(rel)), sn = Math.abs(Math.sin(rel));
    const kx = Math.hypot(sx * cs, sy * sn), ky = Math.hypot(sx * sn, sy * cs), nw = b.w * kx, nh = b.h * ky;
    resizeItem(x, b, { x: nx - nw / 2, y: ny - nh / 2, w: nw, h: nh });
  };
  one(it);
  const k = Math.min(Math.abs(sx), Math.abs(sy)); // a chart's words follow, as in resizeItem
  const charts = (x) => { if (x.type !== 'group') return; if (x.chart) scaleStyle(x, k); else x.items.forEach(charts); };
  if (it.type === 'group' && k > 0 && k !== 1) charts(it);
}

// give an item (and everything in it) fresh ids, e.g. after copying. Used as list.forEach(reId) or
// list.map(reId): linked text boxes copied together stay linked to each other (a new chain, same order);
// a box copied without the rest of its chain becomes an ordinary box holding the whole story.
const chainMaps = new WeakMap();
function newChains(list) {
  const byChain = new Map();
  const rec = (l) => { for (const it of l) { if (it.chain) { if (!byChain.has(it.chain)) byChain.set(it.chain, []); byChain.get(it.chain).push(it); } if (it.items) rec(it.items); } };
  rec(list);
  const out = new Map(); // item -> { chain, chainIndex, chainLength }
  for (const boxes of byChain.values()) {
    if (boxes.length < 2) continue;
    boxes.sort((a, b) => a.chainIndex - b.chainIndex);
    const chain = uid('c');
    boxes.forEach((it, k) => out.set(it, { chain, chainIndex: k, chainLength: boxes.length }));
  }
  return out;
}
export function reId(it, _i, list) {
  let links = Array.isArray(list) ? chainMaps.get(list) : null;
  if (!links) { links = newChains(Array.isArray(list) ? list : [it]); if (Array.isArray(list)) chainMaps.set(list, links); }
  const give = (x) => {
    x.id = uid();
    const l = links.get(x);
    delete x.chain; delete x.chainIndex; delete x.chainLength; delete x.story;
    if (l) Object.assign(x, l);
    if (x.items) x.items.forEach(give);
  };
  give(it);
  return it;
}

// ------------------------------------------------------------------ undo / redo
export class History {
  constructor(limit = 100) { this.undoStack = []; this.redoStack = []; this.limit = limit; }
  reset() { this.undoStack = []; this.redoStack = []; }
  // call before changing the document
  // a snapshot: the pages, plus the colour scheme, font pair and text styles they were made with
  // (a snapshot without `styles`, e.g. one made for typing, leaves the styles as they are)
  snap(doc, label) { return { pages: clone(doc.pages), scheme: doc.scheme, fontPair: doc.fontPair, styles: doc.styles ? clone(doc.styles) : null, label }; }
  put(doc, s) {
    doc.pages = s.pages; doc.scheme = s.scheme; doc.fontPair = s.fontPair;
    if ('styles' in s) { if (s.styles) doc.styles = s.styles; else delete doc.styles; }
  }
  save(doc, label = '') {
    this.undoStack.push(this.snap(doc, label));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(doc) { const s = this.undoStack.pop(); if (!s) return false; this.redoStack.push(this.snap(doc, s.label)); this.put(doc, s); return true; }
  redo(doc) { const s = this.redoStack.pop(); if (!s) return false; this.undoStack.push(this.snap(doc, s.label)); this.put(doc, s); return true; }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
}

// Page sizes people know, in millimetres. `plain` sizes have no portrait/landscape in their name.
export const PAGE_SIZES = [
  { id: 'a4', name: 'A4', w: 210, h: 297, group: 'paper' },
  { id: 'a5', name: 'A5', w: 148, h: 210, group: 'paper' },
  { id: 'a3', name: 'A3', w: 297, h: 420, group: 'paper' },
  { id: 'a6', name: 'A6', w: 105, h: 148, group: 'paper' },
  { id: 'a2', name: 'A2', w: 420, h: 594, group: 'paper' },
  { id: 'dl', key: 'size.dl', name: 'DL (99 × 210 mm)', w: 99, h: 210, group: 'paper' },
  { id: 'letter', name: 'US Letter', w: 215.9, h: 279.4, group: 'us' },
  { id: 'legal', name: 'US Legal', w: 215.9, h: 355.6, group: 'us' },
  { id: 'tabloid', key: 'size.tabloid', name: 'Tabloid (11 × 17 in)', w: 279.4, h: 431.8, group: 'us' },
  { id: 'halfletter', key: 'size.halfletter', name: 'Half Letter (5.5 × 8.5 in)', w: 139.7, h: 215.9, group: 'us' },
  { id: 'poster-us', key: 'size.poster-us', name: 'Poster (18 × 24 in)', w: 457.2, h: 609.6, group: 'us' },
  { id: 'card', key: 'size.card', name: 'Business card (85 × 55 mm)', w: 85, h: 55, group: 'small', plain: true },
  { id: 'card-us', key: 'size.card-us', name: 'Business card (3.5 × 2 in)', w: 88.9, h: 50.8, group: 'small', plain: true },
  { id: 'postcard-us', key: 'size.postcard-us', name: 'Postcard (4 × 6 in)', w: 101.6, h: 152.4, group: 'small' },
  // envelopes, lying on their side as they go through the printer (sizes in mm)
  { id: 'env-dl', key: 'size.env-dl', name: 'Envelope DL (220 × 110 mm)', w: 220, h: 110, group: 'envelope', plain: true },
  { id: 'env-c5', key: 'size.env-c5', name: 'Envelope C5 (229 × 162 mm)', w: 229, h: 162, group: 'envelope', plain: true },
  { id: 'env-c6', key: 'size.env-c6', name: 'Envelope C6 (162 × 114 mm)', w: 162, h: 114, group: 'envelope', plain: true },
  { id: 'env-c4', key: 'size.env-c4', name: 'Envelope C4 (324 × 229 mm)', w: 324, h: 229, group: 'envelope', plain: true },
  { id: 'env-10', key: 'size.env-10', name: 'Envelope #10 (9.5 × 4.125 in)', w: 241.3, h: 104.775, group: 'envelope', plain: true },
  { id: 'env-9', key: 'size.env-9', name: 'Envelope #9 (8.875 × 3.875 in)', w: 225.425, h: 98.425, group: 'envelope', plain: true },
  { id: 'env-a7', key: 'size.env-a7', name: 'Envelope A7 (7.25 × 5.25 in)', w: 184.15, h: 133.35, group: 'envelope', plain: true },
  { id: 'env-monarch', key: 'size.env-monarch', name: 'Envelope Monarch (7.5 × 3.875 in)', w: 190.5, h: 98.425, group: 'envelope', plain: true },
  { id: 'square', key: 'size.square', name: 'Square post (1080 × 1080)', w: 190.5, h: 190.5, group: 'screen', plain: true },
  { id: 'post45', key: 'size.post45', name: 'Portrait post (1080 × 1350)', w: 190.5, h: 238.125, group: 'screen', plain: true },
  { id: 'story', key: 'size.story', name: 'Story (1080 × 1920)', w: 190.5, h: 338.667, group: 'screen', plain: true },
];
const MMPT = 72 / 25.4;
export const PAPER = Object.fromEntries(PAGE_SIZES.flatMap((s) => [[s.id, { w: s.w * MMPT, h: s.h * MMPT }], [`${s.id}-landscape`, { w: s.h * MMPT, h: s.w * MMPT }]]));

// make the lengths inside an item (text sizes, spacing, lines) k times bigger, e.g. when the page is resized
export function scaleStyle(it, k) {
  if (k === 1) return;
  const paras = (list) => { for (const p of list || []) {
    for (const key of ['spaceBefore', 'spaceAfter', 'indentLeft', 'indentRight', 'indentFirst']) if (p[key]) p[key] *= k;
    if (p.lineHeight?.pt) p.lineHeight = { ...p.lineHeight, pt: p.lineHeight.pt * k };
    for (const r of p.runs) { if (r.size) r.size = Math.round(r.size * k * 10) / 10; if (r.tracking) r.tracking *= k; }
  } };
  if (it.items) it.items.forEach((c) => scaleStyle(c, k));
  if (it.stroke?.width) it.stroke = { ...it.stroke, width: it.stroke.width * k };
  if (it.shadow) it.shadow = { ...it.shadow, dx: it.shadow.dx * k, dy: it.shadow.dy * k };
  if (it.pad) it.pad = it.pad.map((v) => v * k);
  if (it.columnGap) it.columnGap *= k;
  paras(it.paras);
  if (it.type === 'table') for (const row of it.rows) for (const c of row.cells) paras(c.paras);
}

// a blank document of a given paper size (points)
export function blankDocument(size = 'a4', name = 'Untitled') {
  const p = PAPER[size] || PAPER.a4;
  return { version: 1, name, pages: [{ id: uid('p'), w: p.w, h: p.h, items: [] }], masters: [], fonts: {}, embeddedFonts: [], meta: {}, source: 'new', notes: {} };
}
