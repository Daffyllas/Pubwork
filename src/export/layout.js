// Where pages go on sheets of paper: paper sizes, label sheets, copies per sheet, booklets, folded cards
// and posters across several sheets. Kept apart from the PDF code so the Print window can show a preview
// without loading it.
import { PAGE_SIZES } from '../editor/model.js';

export const MM = 72 / 25.4;
export const IN = 72;

export const PAPERS = {
  a4: { w: 210 * MM, h: 297 * MM, name: 'A4' },
  letter: { w: 8.5 * IN, h: 11 * IN, name: 'US Letter' },
  a3: { w: 297 * MM, h: 420 * MM, name: 'A3' },
  a5: { w: 148 * MM, h: 210 * MM, name: 'A5' },
  legal: { w: 8.5 * IN, h: 14 * IN, name: 'US Legal' },
  tabloid: { w: 11 * IN, h: 17 * IN, name: 'Tabloid (11 × 17 in)' },
};

// Label and card sheets: columns, rows, label size, left and top margin, and the distance from one label
// to the next (pitch), in the unit the maker uses. Taken from the makers' published templates.
export const LABELS = {
  L7160: { maker: 'Avery', paper: 'a4', u: MM, cols: 3, rows: 7, w: 63.5, h: 38.1, left: 7.25, top: 15.15, px: 66.04, py: 38.1 },
  L7161: { maker: 'Avery', paper: 'a4', u: MM, cols: 3, rows: 6, w: 63.5, h: 46.6, left: 7.25, top: 8.8, px: 66.04, py: 46.6 },
  L7162: { maker: 'Avery', paper: 'a4', u: MM, cols: 2, rows: 8, w: 99.1, h: 33.9, left: 4.65, top: 12.9, px: 101.6, py: 33.9 },
  L7163: { maker: 'Avery', paper: 'a4', u: MM, cols: 2, rows: 7, w: 99.1, h: 38.1, left: 4.65, top: 15.15, px: 101.6, py: 38.1 },
  L7165: { maker: 'Avery', paper: 'a4', u: MM, cols: 2, rows: 4, w: 99.1, h: 67.7, left: 4.65, top: 13.1, px: 101.6, py: 67.7 },
  L7173: { maker: 'Avery', paper: 'a4', u: MM, cols: 2, rows: 5, w: 99.1, h: 57, left: 4.65, top: 6, px: 101.6, py: 57 },
  L7651: { maker: 'Avery', paper: 'a4', u: MM, cols: 5, rows: 13, w: 38.1, h: 21.2, left: 4.75, top: 10.7, px: 40.6, py: 21.2 },
  3474: { maker: 'Avery Zweckform', paper: 'a4', u: MM, cols: 3, rows: 8, w: 70, h: 37, left: 0, top: 0.5, px: 70, py: 37 },
  3490: { maker: 'Avery Zweckform', paper: 'a4', u: MM, cols: 3, rows: 8, w: 70, h: 36, left: 0, top: 4.5, px: 70, py: 36 },
  C32011: { maker: 'Avery', paper: 'a4', u: MM, cols: 2, rows: 5, w: 85, h: 54, left: 15, top: 13.5, px: 95, py: 54, card: true },
  5160: { maker: 'Avery', paper: 'letter', u: IN, cols: 3, rows: 10, w: 2.625, h: 1, left: 0.1875, top: 0.5, px: 2.75, py: 1 },
  5161: { maker: 'Avery', paper: 'letter', u: IN, cols: 2, rows: 10, w: 4, h: 1, left: 0.15625, top: 0.5, px: 4.1875, py: 1 },
  5163: { maker: 'Avery', paper: 'letter', u: IN, cols: 2, rows: 5, w: 4, h: 2, left: 0.15625, top: 0.5, px: 4.1875, py: 2 },
  5164: { maker: 'Avery', paper: 'letter', u: IN, cols: 2, rows: 3, w: 4, h: 3.3333, left: 0.15625, top: 0.5, px: 4.1875, py: 3.3333 },
  5167: { maker: 'Avery', paper: 'letter', u: IN, cols: 4, rows: 20, w: 1.75, h: 0.5, left: 0.3, top: 0.5, px: 2.05, py: 0.5 },
  8371: { maker: 'Avery', paper: 'letter', u: IN, cols: 2, rows: 5, w: 3.5, h: 2, left: 0.75, top: 0.5, px: 3.5, py: 2, card: true },
};
export function labelName(id) {
  const l = LABELS[id], unit = l.u === MM ? 'mm' : 'in';
  return { maker: l.maker, code: String(id), count: l.cols * l.rows, size: `${l.w} × ${l.h} ${unit}`, paper: l.paper, card: !!l.card };
}

// the paper size whose half is this page (A5 → A4, A4 → A3, half letter → letter): the natural booklet sheet
export function bookletPaperFor(page) {
  for (const [id, p] of Object.entries(PAPERS)) if (Math.abs(p.h / 2 - page.w) < 3 * MM && Math.abs(p.w - page.h) < 3 * MM) return id;
  return null;
}
export const isUS = (page) => [612, 792, 1008, 1224, 396].some((v) => Math.abs(page.w - v) < 2 || Math.abs(page.h - v) < 2) || /^env-(10|9|a7|monarch)$/.test(envelopeOf(page)?.id || '');
export const defaultPaper = (page) => (isUS(page) ? 'letter' : 'a4');

// the envelope size this page is (either way round), or null
export function envelopeOf(page) {
  const near = (a, b) => Math.abs(a - b) < 1.5 * MM;
  return PAGE_SIZES.find((s) => s.group === 'envelope' && ((near(s.w * MM, page.w) && near(s.h * MM, page.h)) || (near(s.h * MM, page.w) && near(s.w * MM, page.h)))) || null;
}

// the paper a folded card is made from: the sheet whose half (2) or quarter (4) is this page
export function cardPaperFor(page, parts) {
  const near = (a, b) => Math.abs(a - b) < 3 * MM;
  for (const [id, p] of Object.entries(PAPERS)) {
    if (parts === 2 && ((near(p.h / 2, page.w) && near(p.w, page.h)) || (near(p.w, page.w) && near(p.h / 2, page.h)))) return id;
    if (parts === 4 && ((near(p.w / 2, page.w) && near(p.h / 2, page.h)) || (near(p.h / 2, page.w) && near(p.w / 2, page.h)))) return id;
  }
  return null;
}

// Folded cards, the way Publisher prints them.
// Half-fold: one sheet folded once. Outside: back + front; inside (other side of the sheet): pages 2 + 3.
//   Upright pages fold down the side (sheet on its side); wide pages fold at the top, and then the back
//   is printed upside down so it reads the right way when the card is turned over.
// Quarter-fold: 4 pages on one side of one sheet, folded twice. The inside pages are upside down.
// Slots come in page order (page 1, 2, 3, 4 of the card); rot 2 means turned 180°.
function cardSlots(page, layout, p) {
  const pw = page.w, ph = page.h, wide = pw > ph;
  if (layout === 'card2') {
    const sheet = wide ? { w: p.w, h: p.h } : { w: p.h, h: p.w };
    const s = Math.min(1, wide ? Math.min(sheet.w / pw, sheet.h / 2 / ph) : Math.min(sheet.w / 2 / pw, sheet.h / ph));
    const w = pw * s, h = ph * s;
    const at = (x, y, rot) => ({ x, y, w, h, rot, scale: s });
    if (!wide) { // side fold: back | front, then 2 | 3
      const y = (sheet.h - h) / 2, L = sheet.w / 2 - w, R = sheet.w / 2;
      return { sheet, fold: 'side', slots: [at(R, y, 0), at(L, y, 0)], inside: [at(L, y, 0), at(R, y, 0)], folds: [[sheet.w / 2, 0, sheet.w / 2, sheet.h]] };
    }
    const x = (sheet.w - w) / 2, T = sheet.h / 2 - h, B = sheet.h / 2; // top fold: back (upside down) over front, then 2 over 3
    return { sheet, fold: 'top', slots: [at(x, B, 0), at(x, T, 2)], inside: [at(x, T, 0), at(x, B, 0)], folds: [[0, sheet.h / 2, sheet.w, sheet.h / 2]] };
  }
  // quarter-fold: upright pages on an upright sheet, wide pages on a sheet on its side
  const sheet = wide ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
  const s = Math.min(1, sheet.w / 2 / pw, sheet.h / 2 / ph), w = pw * s, h = ph * s;
  const L = sheet.w / 2 - w, R = sheet.w / 2, T = sheet.h / 2 - h, B = sheet.h / 2;
  const at = (x, y, rot) => ({ x, y, w, h, rot, scale: s });
  const slots = wide
    ? [at(L, B, 0), at(R, B, 2), at(R, T, 2), at(L, T, 2)] // top fold: fold left to right, then top to bottom
    : [at(R, B, 0), at(R, T, 2), at(L, T, 2), at(L, B, 0)]; // side fold: fold top behind bottom, then left behind right
  return { sheet, fold: wide ? 'top' : 'side', slots, folds: [[sheet.w / 2, 0, sheet.w / 2, sheet.h], [0, sheet.h / 2, sheet.w, sheet.h / 2]] };
}

// Posters and banners bigger than the paper, printed in pieces (tiles) that overlap a little so they can
// be glued or taped together. Every sheet keeps a white edge the printer can't print on; the picture is
// inside it. o.poster = { size: 1 | 1.5 | 2 … (100% …) or 'fit4' (as big as fits on about 4 sheets), overlap: mm }
export const POSTER_EDGE = 10 * MM;
export const POSTER_SIZES = ['1', '1.5', '2', '3', '4', 'fit2', 'fit4', 'fit6', 'fit9', 'fit16'];
export function posterLayout(page, o) {
  const p = PAPERS[o.paper] || PAPERS[defaultPaper(page)];
  const size = String(o.poster?.size ?? '1'), ov = Math.max(0, +(o.poster?.overlap ?? 10)) * MM, m = POSTER_EDGE;
  const fit = /^fit(\d+)$/.exec(size), pw = page.w, ph = page.h;
  let best = null;
  for (const land of [false, true]) {
    const sw = land ? p.h : p.w, sh = land ? p.w : p.h, aw = sw - 2 * m, ah = sh - 2 * m, sx = aw - ov, sy = ah - ov;
    const grids = [];
    if (fit) { const n = +fit[1]; for (let c = 1; c <= n; c++) for (let r = 1; c * r <= n; r++) grids.push(Math.min((c * sx + ov) / pw, (r * sy + ov) / ph)); }
    else grids.push(Math.max(0.05, +size || 1));
    for (const s of grids) {
      const W = pw * s, H = ph * s;
      const cols = Math.max(1, Math.ceil((W - ov) / sx - 1e-6)), rows = Math.max(1, Math.ceil((H - ov) / sy - 1e-6));
      const c = { land, s, W, H, cols, rows, n: cols * rows, sheet: { w: sw, h: sh }, aw, ah, sx, sy };
      // the biggest poster (when fitting), then the fewest sheets, then upright paper
      if (!best || (fit && s > best.s + 1e-6) || ((!fit || Math.abs(s - best.s) < 1e-6) && c.n < best.n)) best = c;
    }
  }
  const tiles = [];
  for (let r = 0; r < best.rows; r++) for (let c = 0; c < best.cols; c++) {
    const x0 = c * best.sx, y0 = r * best.sy;
    tiles.push({ r, c, x0, y0, w: Math.min(best.aw, best.W - x0), h: Math.min(best.ah, best.H - y0) });
  }
  return { sheet: best.sheet, scale: best.s, cols: best.cols, rows: best.rows, tiles, edge: m, overlap: ov, size: { w: best.W, h: best.H }, aw: best.aw, ah: best.ah };
}

// Booklet page order for n pages: every sheet has a front and a back, each with a left and a right page.
// Pages past the end are blank (null). Print on both sides, flipping on the short edge, then fold.
export function bookletOrder(n) {
  const N = Math.max(4, Math.ceil(n / 4) * 4), sides = [];
  const at = (i) => (i < n ? i : null);
  for (let s = 0; s < N / 4; s++) {
    sides.push([at(N - 1 - 2 * s), at(2 * s)]);
    sides.push([at(2 * s + 1), at(N - 2 - 2 * s)]);
  }
  return sides;
}

// Where things go on one sheet. Coordinates from the sheet's top-left corner.
// -> { sheet:{w,h}, slots:[{x,y,w,h,rot,scale}] (w,h as placed), marks:[[x1,y1,x2,y2]], trim, bleed, count }
export function layoutSheet(page, o) {
  const { layout = 'one', marks = false } = o;
  const pw = page.w, ph = page.h;
  const paperOf = (id) => PAPERS[id] || PAPERS[defaultPaper(page)];
  const place = (x, y, rot, scale) => ({ x, y, w: (rot === 1 ? ph : pw) * scale, h: (rot === 1 ? pw : ph) * scale, rot, scale });
  let sheet, slots = [], bleed = 0, trim = null;

  if (layout === 'poster') { // the first sheet; posterLayout() has all of them
    const P = posterLayout(page, o);
    return { sheet: P.sheet, slots: [], marks: [], bleed: 0, trim: null, count: 1, poster: P };
  }
  if (layout === 'card2' || layout === 'card4') {
    const C = cardSlots(page, layout, paperOf(o.paper));
    return { sheet: C.sheet, slots: C.slots, inside: C.inside, folds: C.folds, fold: C.fold, marks: [], bleed: 0, trim: null, count: C.slots.length };
  }

  if (layout === 'one') {
    if (!o.paper || o.paper === 'page') {
      bleed = o.bleed ? (isUS(page) ? IN / 8 : 3 * MM) : 0;
      const m = marks ? Math.max(bleed, 3 * MM) + 7 * MM : bleed;
      sheet = { w: pw + 2 * m, h: ph + 2 * m };
      slots = [place(m, m, 0, 1)];
      trim = { x: m, y: m, w: pw, h: ph };
    } else {
      const p = paperOf(o.paper), land = pw > ph;
      sheet = land ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
      const s = Math.min(1, sheet.w / pw, sheet.h / ph);
      slots = [place((sheet.w - pw * s) / 2, (sheet.h - ph * s) / 2, 0, s)];
    }
  } else if (layout === 'n2' || layout === 'n4') {
    const p = paperOf(o.paper), n = layout === 'n2' ? 2 : 4;
    const grids = n === 2 ? [[1, 2], [2, 1]] : [[2, 2]];
    let best = null;
    for (const land of [false, true]) for (const [c, r] of grids) for (const rot of [0, 1]) {
      const sw = land ? p.h : p.w, sh = land ? p.w : p.h, w = rot ? ph : pw, h = rot ? pw : ph;
      const s = Math.min(1, sw / c / w, sh / r / h);
      if (!best || s > best.s + 1e-6) best = { land, c, r, rot, s, sw, sh };
    }
    sheet = { w: best.sw, h: best.sh };
    const cw = sheet.w / best.c, ch = sheet.h / best.r;
    for (let j = 0; j < best.r; j++) for (let i = 0; i < best.c; i++) {
      const sl = place(0, 0, best.rot, best.s);
      sl.x = i * cw + (cw - sl.w) / 2; sl.y = j * ch + (ch - sl.h) / 2; slots.push(sl);
    }
  } else if (layout === 'fill') {
    // as many full-size copies as fit, edge to edge, so one cut serves two neighbours
    const p = paperOf(o.paper), mg = (marks ? 10 : 5) * MM;
    let best = null;
    for (const land of [false, true]) for (const rot of [0, 1]) {
      const sw = land ? p.h : p.w, sh = land ? p.w : p.h, w = rot ? ph : pw, h = rot ? pw : ph;
      const c = Math.floor((sw - 2 * mg + 0.5) / w), r = Math.floor((sh - 2 * mg + 0.5) / h);
      if (c * r > (best?.n || 0)) best = { n: c * r, c, r, rot, sw, sh, w, h };
    }
    if (!best) return layoutSheet(page, { ...o, layout: 'one', marks: false }); // bigger than the paper
    sheet = { w: best.sw, h: best.sh };
    const x0 = (sheet.w - best.c * best.w) / 2, y0 = (sheet.h - best.r * best.h) / 2;
    for (let j = 0; j < best.r; j++) for (let i = 0; i < best.c; i++) slots.push(place(x0 + i * best.w, y0 + j * best.h, best.rot, 1));
  } else if (layout === 'labels') {
    const l = LABELS[o.label] || LABELS.L7160, p = PAPERS[l.paper];
    sheet = { w: p.w, h: p.h };
    const lw = l.w * l.u, lh = l.h * l.u;
    const rot = Math.min(lw / pw, lh / ph) < Math.min(lw / ph, lh / pw) - 1e-6 ? 1 : 0;
    const s = Math.min(1.02, rot ? Math.min(lw / ph, lh / pw) : Math.min(lw / pw, lh / ph));
    for (let j = 0; j < l.rows; j++) for (let i = 0; i < l.cols; i++) {
      const sl = place(0, 0, rot, s), x = (l.left + i * l.px) * l.u, y = (l.top + j * l.py) * l.u;
      sl.x = x + (lw - sl.w) / 2; sl.y = y + (lh - sl.h) / 2; slots.push(sl);
    }
  } else if (layout === 'booklet') {
    const p = paperOf(o.paper);
    sheet = { w: p.h, h: p.w }; // landscape, folded down the middle
    const s = Math.min(1, sheet.w / 2 / pw, sheet.h / ph), w = pw * s, h = ph * s, y = (sheet.h - h) / 2;
    slots = [place(sheet.w / 2 - w, y, 0, s), place(sheet.w / 2, y, 0, s)]; // both pages against the fold
  }

  // cut marks in the margin, in line with every edge, where there is room for them
  const lines = [];
  if (marks && layout !== 'labels' && layout !== 'booklet' && slots.length) {
    const L = Math.min(...slots.map((s) => s.x)), T = Math.min(...slots.map((s) => s.y));
    const R = Math.max(...slots.map((s) => s.x + s.w)), B = Math.max(...slots.map((s) => s.y + s.h));
    const off = Math.max(bleed, 3 * MM) - (bleed ? 0 : 1 * MM), len = 5 * MM;
    const xs = [...new Set(slots.flatMap((s) => [s.x, s.x + s.w]).map((v) => +v.toFixed(2)))];
    const ys = [...new Set(slots.flatMap((s) => [s.y, s.y + s.h]).map((v) => +v.toFixed(2)))];
    const room = (a) => a >= off + 2 * MM;
    for (const x of xs) {
      if (room(T)) lines.push([x, T - off, x, Math.max(0, T - off - len)]);
      if (room(sheet.h - B)) lines.push([x, B + off, x, Math.min(sheet.h, B + off + len)]);
    }
    for (const y of ys) {
      if (room(L)) lines.push([L - off, y, Math.max(0, L - off - len), y]);
      if (room(sheet.w - R)) lines.push([R + off, y, Math.min(sheet.w, R + off + len), y]);
    }
  }
  return { sheet, slots, marks: lines, bleed, trim, count: slots.length };
}

// which document pages go on each sheet: [[pageIndex|null, ...per slot]]
// count: how many go on a sheet. With o.sequence (mail merge), each slot gets the next page instead of a copy.
// Folded cards take the pages in fours (a merged list of cards makes one card after another); each entry
// says which side of the sheet it is (side: 'out' or 'in', for half-fold cards).
export function sheetPlan(pageIndices, o, count = 1) {
  if (o.layout === 'card2' || o.layout === 'card4') {
    const out = [], side = (list, sd) => Object.assign(list, { side: sd });
    for (let i = 0; i < pageIndices.length; i += 4) {
      const [a, b = null, c = null, d = null] = pageIndices.slice(i, i + 4), n = Math.min(4, pageIndices.length - i);
      // 2 pages: the front and the inside page people write on; 3 pages: front and both inside pages
      const p = n === 1 ? [a, null, null, null] : n === 2 ? [a, null, b, null] : [a, b, c, d];
      if (o.layout === 'card4') out.push(side(p, 'out'));
      else { out.push(side([p[0], p[3]], 'out')); if (n > 1) out.push(side([p[1], p[2]], 'in')); }
    }
    return out;
  }
  if (o.layout === 'booklet') return bookletOrder(pageIndices.length).map((side) => side.map((i) => (i == null ? null : pageIndices[i])));
  if (o.sequence && o.layout !== 'one' && count > 1) {
    const out = [];
    for (let i = 0; i < pageIndices.length; i += count) out.push(Array.from({ length: count }, (_, j) => pageIndices[i + j] ?? null));
    return out;
  }
  // every other layout: each page fills its own sheet with copies (fronts and backs stay together)
  return pageIndices.map((i) => [i]);
}

