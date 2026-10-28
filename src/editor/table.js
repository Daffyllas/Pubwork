// Changing a table: rows and columns in and out, cells joined and split, cell colours.
// A table is { cols: [widths], rows: [{ h, cells: [{ col, span: [across, down], covered, fill, valign, borders, paras }] }] }.
// Every row holds one cell for each column: a real cell where a cell starts, a "covered" one where a joined cell reaches.
// To change it, the cells are laid out on a grid (each with its row r, column c and size cs × rs), changed there,
// and written back in that same shape — so the page, the exports (which read the same shape) and the file all agree.
// ---------------------------------------------------------------- the grid
// read a table onto a grid: { cols, rows, cells: [{ cell, r, c, cs, rs }] }; gaps get plain cells
export function readGrid(tb) {
  const R = tb.rows.length, C = tb.cols.length;
  const taken = Array.from({ length: R }, () => Array(C).fill(null));
  const cells = [];
  tb.rows.forEach((row, r) => {
    let c = 0;
    for (const cell of row.cells) {
      if (cell.covered) { c++; continue; }
      const col = Number.isFinite(cell.col) ? cell.col : c;
      c = col + Math.max(1, cell.span?.[0] || 1);
      if (col >= C || taken[r][col]) continue; // a cell that has nowhere to go
      let cs = Math.max(1, Math.min(cell.span?.[0] || 1, C - col)), rs = Math.max(1, Math.min(cell.span?.[1] || 1, R - r));
      // a joined cell stops where another one already is
      for (let dc = 1; dc < cs; dc++) if (taken[r][col + dc]) { cs = dc; break; }
      for (let dr = 1; dr < rs; dr++) if (taken[r + dr].slice(col, col + cs).some(Boolean)) { rs = dr; break; }
      const e = { cell, r, c: col, cs, rs };
      for (let dr = 0; dr < rs; dr++) for (let dc = 0; dc < cs; dc++) taken[r + dr][col + dc] = e;
      cells.push(e);
    }
  });
  const g = { cols: [...tb.cols], rows: tb.rows.map((row) => ({ ...row, cells: undefined })), cells };
  fillGaps(g);
  return g;
}
// which cell is at each place of the grid
export function cellAt(g) {
  const at = Array.from({ length: g.rows.length }, () => Array(g.cols.length).fill(null));
  for (const e of g.cells) for (let dr = 0; dr < e.rs; dr++) for (let dc = 0; dc < e.cs; dc++) if (at[e.r + dr]?.[e.c + dc] === null) at[e.r + dr][e.c + dc] = e;
  return at;
}
// places no cell reaches get a plain cell that looks like its neighbour
function fillGaps(g, like = null) {
  const at = cellAt(g);
  for (let r = 0; r < g.rows.length; r++) for (let c = 0; c < g.cols.length; c++) {
    if (at[r][c]) continue;
    const src = like?.(r, c) || near(at, r, c);
    const e = { cell: blankLike(src?.cell), r, c, cs: 1, rs: 1 };
    g.cells.push(e); at[r][c] = e;
  }
}
function near(at, r, c) {
  const row = at[r] || [];
  for (let d = 1; d < row.length; d++) { if (row[c - d]) return row[c - d]; if (row[c + d]) return row[c + d]; }
  for (let d = 1; d < at.length; d++) { if (at[r - d]?.[c]) return at[r - d][c]; if (at[r + d]?.[c]) return at[r + d][c]; }
  return null;
}
// an empty cell with the colour, lines and text style of another
export function blankLike(src) {
  const p0 = src?.paras?.[0], run = p0?.runs?.find((x) => x.text && !x.field) || p0?.runs?.[0];
  const style = {}; // the look of the words, not the words, links or fields
  if (run) for (const [k, v] of Object.entries(run)) if (!['text', 'field', 'link'].includes(k)) style[k] = v;
  const para = { align: p0?.align || 'left', runs: [{ ...style, text: '' }] };
  if (p0?.spaceBefore) para.spaceBefore = p0.spaceBefore; if (p0?.spaceAfter) para.spaceAfter = p0.spaceAfter;
  return { col: 0, span: [1, 1], covered: false, fill: src?.fill ?? null, valign: src?.valign || 'top', borders: [...(src?.borders || [null, null, null, null])], paras: [para] };
}
const coveredCell = (col) => ({ col, span: [1, 1], covered: true, paras: [], fill: null, borders: [null, null, null, null], valign: 'top' });
// write the grid back into the table, in the shape the page and the exports read
export function writeGrid(tb, g) {
  const at = cellAt(g);
  tb.cols = g.cols;
  tb.rows = g.rows.map((row, r) => {
    const out = { ...row, cells: [] };
    for (let c = 0; c < g.cols.length; c++) {
      const e = at[r][c];
      if (e && e.r === r && e.c === c) { Object.assign(e.cell, { col: c, span: [e.cs, e.rs], covered: false }); out.cells.push(e.cell); } else out.cells.push(coveredCell(c));
    }
    return out;
  });
}

// ---------------------------------------------------------------- picked cells
// a picked block of cells: { r, c, r2, c2 } (first and last row and column, both included)
export const rectOf = (e) => ({ r: e.r, c: e.c, r2: e.r + e.rs - 1, c2: e.c + e.cs - 1 });
export function entryOf(g, cell) { return g.cells.find((e) => e.cell === cell) || null; }
// grow a block until no joined cell sticks out of it
export function grow(g, rect) {
  let q = { ...rect }, again = true;
  while (again) {
    again = false;
    for (const e of g.cells) {
      const x = rectOf(e);
      if (x.r > q.r2 || x.r2 < q.r || x.c > q.c2 || x.c2 < q.c) continue;
      const n = { r: Math.min(q.r, x.r), c: Math.min(q.c, x.c), r2: Math.max(q.r2, x.r2), c2: Math.max(q.c2, x.c2) };
      if (n.r !== q.r || n.c !== q.c || n.r2 !== q.r2 || n.c2 !== q.c2) { q = n; again = true; }
    }
  }
  return q;
}
export const inside = (e, q) => e.r >= q.r && e.c >= q.c && e.r + e.rs - 1 <= q.r2 && e.c + e.cs - 1 <= q.c2;
export function clampRect(g, q) {
  const R = g.rows.length - 1, C = g.cols.length - 1, k = (v, m) => Math.max(0, Math.min(m, v | 0));
  const a = { r: k(q.r, R), c: k(q.c, C), r2: k(q.r2 ?? q.r, R), c2: k(q.c2 ?? q.c, C) };
  return { r: Math.min(a.r, a.r2), c: Math.min(a.c, a.c2), r2: Math.max(a.r, a.r2), c2: Math.max(a.c, a.c2) };
}

// ---------------------------------------------------------------- changes on the grid
// add a row (axis 'r') or column (axis 'c') at index k, looking like line `ref`; size: its height or width
function insertLine(g, axis, k, ref, size) {
  const [pos, len] = axis === 'r' ? ['r', 'rs'] : ['c', 'cs'];
  const list = axis === 'r' ? g.rows : g.cols;
  const at0 = cellAt(g); // the cells of the line it copies, before anything moves
  const srcOf = (i) => (axis === 'r' ? at0[ref]?.[i] : at0[i]?.[ref]);
  for (const e of g.cells) {
    if (e[pos] >= k) e[pos]++;
    else if (e[pos] + e[len] > k) e[len]++; // a joined cell across the new line reaches over it too
  }
  if (axis === 'r') g.rows.splice(k, 0, { ...g.rows[ref], h: size }); else g.cols.splice(k, 0, size);
  fillGaps(g, (r, c) => srcOf(axis === 'r' ? c : r));
}
// take out lines k0..k1 (rows or columns); cells wholly in them go, joined cells get smaller
function deleteLines(g, axis, k0, k1) {
  const [pos, len] = axis === 'r' ? ['r', 'rs'] : ['c', 'cs'];
  const n = k1 - k0 + 1;
  g.cells = g.cells.filter((e) => {
    const a = e[pos], b = e[pos] + e[len] - 1, over = Math.max(0, Math.min(b, k1) - Math.max(a, k0) + 1);
    if (over === e[len]) return false;
    if (a > k1) e[pos] -= n;
    else if (a >= k0) { e[pos] = k0; e[len] -= over; } // starts in the lines that go: what is left of it moves up (or left)
    else e[len] -= over;
    return true;
  });
  (axis === 'r' ? g.rows : g.cols).splice(k0, n);
  fillGaps(g);
}
const hasText = (paras) => (paras || []).some((p) => (p.runs || []).some((r) => (r.text || '').trim() || r.field));
function merge(g, q) {
  q = grow(g, q);
  const parts = g.cells.filter((e) => inside(e, q)).sort((a, b) => a.r - b.r || a.c - b.c);
  const first = parts.find((e) => e.r === q.r && e.c === q.c) || parts[0];
  if (!first || parts.length < 2) return null;
  const at = cellAt(g), top = first.cell;
  // the words of all the cells, one after another
  const words = parts.filter((e) => hasText(e.cell.paras));
  if (words.length) top.paras = words.flatMap((e) => e.cell.paras);
  // the outside lines: top and left of the first cell, right and bottom of the last ones
  const b = [...(top.borders || [null, null, null, null])];
  b[1] = at[q.r][q.c2]?.cell.borders?.[1] ?? b[1];
  b[2] = at[q.r2][q.c]?.cell.borders?.[2] ?? b[2];
  top.borders = b;
  g.cells = g.cells.filter((e) => e === first || !inside(e, q));
  Object.assign(first, { r: q.r, c: q.c, rs: q.r2 - q.r + 1, cs: q.c2 - q.c + 1 });
  return rectOf(first);
}
function split(g, q) {
  const big = g.cells.filter((e) => inside(e, q) && (e.cs > 1 || e.rs > 1));
  if (!big.length) return null;
  const like = new Map();
  for (const e of big) { for (let dr = 0; dr < e.rs; dr++) for (let dc = 0; dc < e.cs; dc++) like.set(`${e.r + dr},${e.c + dc}`, e); e.cs = 1; e.rs = 1; }
  fillGaps(g, (r, c) => like.get(`${r},${c}`));
  return q;
}

// ---------------------------------------------------------------- sizes
// the real height of each row as drawn (rows grow with their words), in points
export function drawnRows(app, tb, pageIndex) {
  const box = app.pageEls?.[pageIndex]?.querySelector(`:scope > .it.table[data-id="${tb.id}"]`);
  const trs = box ? [...box.querySelectorAll(':scope > table > tr, :scope > table > tbody > tr')] : [];
  const bh = box?.getBoundingClientRect().height, k = bh ? (tb.h || bh) / bh : 0;
  return tb.rows.map((row, i) => { const h = trs[i] ? trs[i].getBoundingClientRect().height * k : 0; return h > 0.5 ? h : row.h || 14; });
}
// keep the table on its page after it grew: move it back, and make it narrower if it is wider than the page
function keepOnPage(tb, pg) {
  if (!pg) return;
  if (tb.x + tb.w > pg.w && !tb.locked) tb.x = Math.max(0, pg.w - tb.w);
  if (tb.w > pg.w) { const k = pg.w / tb.w; tb.cols = tb.cols.map((w) => w * k); tb.w = pg.w; if (!tb.locked) tb.x = 0; }
  if (tb.y + tb.h > pg.h && !tb.locked) tb.y = Math.max(0, pg.h - tb.h);
}

// ---------------------------------------------------------------- the actions
// do one change to a table; q: the picked cells. Returns the cells to pick afterwards, or null if nothing changed.
// heights: the drawn row heights (see drawnRows), so rows keep their look
export function tableAction(tb, pg, act, q, heights = null, value = null) {
  const g = readGrid(tb);
  if (!g.rows.length || !g.cols.length) return null;
  q = grow(g, clampRect(g, q)); // a joined cell counts as a whole
  // sizes: columns share the table's width, rows are as tall as they are drawn
  const sumW = g.cols.reduce((a, b) => a + b, 0) || 1, kw = (tb.w || sumW) / sumW;
  g.cols = g.cols.map((w) => w * kw);
  if (heights?.length === g.rows.length) g.rows.forEach((row, i) => { row.h = heights[i]; });
  const rowH = (i) => g.rows[i]?.h || 14;
  let next = null;
  switch (act) {
    case 'rowAbove': case 'rowBelow': {
      const ref = act === 'rowAbove' ? q.r : q.r2, k = act === 'rowAbove' ? q.r : q.r2 + 1;
      insertLine(g, 'r', k, ref, rowH(ref));
      next = { r: k, c: q.c, r2: k, c2: q.c }; break;
    }
    case 'colLeft': case 'colRight': {
      const ref = act === 'colLeft' ? q.c : q.c2, k = act === 'colLeft' ? q.c : q.c2 + 1;
      insertLine(g, 'c', k, ref, g.cols[ref]);
      next = { r: q.r, c: k, r2: q.r, c2: k }; break;
    }
    case 'delRow': {
      if (q.r2 - q.r + 1 >= g.rows.length) return null; // the last row: delete the table instead
      deleteLines(g, 'r', q.r, q.r2);
      next = { r: Math.min(q.r, g.rows.length - 1), c: q.c, r2: Math.min(q.r, g.rows.length - 1), c2: q.c }; break;
    }
    case 'delCol': {
      if (q.c2 - q.c + 1 >= g.cols.length) return null;
      deleteLines(g, 'c', q.c, q.c2);
      next = { r: q.r, c: Math.min(q.c, g.cols.length - 1), r2: q.r, c2: Math.min(q.c, g.cols.length - 1) }; break;
    }
    case 'merge': next = merge(g, q); break;
    case 'mergeRight': case 'mergeDown': {
      const at = cellAt(g), e = at[q.r][q.c], x = rectOf(e);
      const far = act === 'mergeRight' ? at[x.r][x.c2 + 1] : at[x.r2 + 1]?.[x.c];
      if (!far) return null;
      const y = rectOf(far);
      next = merge(g, { r: Math.min(x.r, y.r), c: Math.min(x.c, y.c), r2: Math.max(x.r2, y.r2), c2: Math.max(x.c2, y.c2) }); break;
    }
    case 'split': next = split(g, grow(g, q)); if (next) next = { r: q.r, c: q.c, r2: q.r, c2: q.c }; break;
    case 'fill': {
      for (const e of g.cells) if (e.r <= q.r2 && e.r + e.rs - 1 >= q.r && e.c <= q.c2 && e.c + e.cs - 1 >= q.c) e.cell.fill = value || null;
      next = q; break;
    }
    default: return null;
  }
  if (!next) return null;
  writeGrid(tb, g);
  tb.w = tb.cols.reduce((a, b) => a + b, 0);
  tb.h = tb.rows.reduce((a, row) => a + (row.h || 14), 0);
  keepOnPage(tb, pg);
  return next;
}

// what can be done with the picked cells
export function canDo(tb, q) {
  const g = readGrid(tb); q = clampRect(g, q);
  const at = cellAt(g), e = at[q.r]?.[q.c], x = e ? rectOf(e) : q, big = grow(g, q);
  const many = g.cells.filter((c) => inside(c, big)).length > 1;
  return {
    delRow: q.r2 - q.r + 1 < g.rows.length, delCol: q.c2 - q.c + 1 < g.cols.length,
    merge: many, mergeRight: !!at[x.r]?.[x.c2 + 1], mergeDown: !!at[x.r2 + 1]?.[x.c],
    split: g.cells.some((c) => inside(c, big) && (c.cs > 1 || c.rs > 1)),
    rows: g.rows.length, cols: g.cols.length, fill: e?.cell.fill || null,
  };
}

// the table a selection stands for: one table, or a group holding just one table
export function pickedTable(ed) {
  if (ed.editing?.item?.type === 'table') return ed.editing.item;
  const items = ed.selectedItems(); if (items.length !== 1) return null;
  const flat = (it) => (it.type === 'group' ? (it.items || []).flatMap(flat) : [it]);
  const tables = flat(items[0]).filter((it) => it.type === 'table');
  return tables.length === 1 ? tables[0] : null;
}
