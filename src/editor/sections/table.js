// The "Table" settings: rows and columns in and out, cells merged and split, cell colour.
// They act on the picked cells: the cell being typed in, or the cell last clicked in the table
// (Shift+click another cell of the picked table to pick a block of cells).
import { tableAction, canDo, readGrid, entryOf, rectOf, clampRect, grow, inside, cellAt, pickedTable, drawnRows } from '../table.js';
import { unionBounds } from '../model.js';
import './table.css';

const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  rowAbove: S('<rect x="3" y="12" width="18" height="8" rx="1.5"/><path d="M12 3v6M9 6h6"/>'),
  rowBelow: S('<rect x="3" y="4" width="18" height="8" rx="1.5"/><path d="M12 15v6M9 18h6"/>'),
  colLeft: S('<rect x="12" y="3" width="8" height="18" rx="1.5"/><path d="M3 12h6M6 9v6"/>'),
  colRight: S('<rect x="4" y="3" width="8" height="18" rx="1.5"/><path d="M15 12h6M18 9v6"/>'),
  delRow: S('<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="m9.5 10 5 4M14.5 10l-5 4"/>'),
  delCol: S('<rect x="8" y="3" width="8" height="18" rx="1.5"/><path d="m10 9.5 4 5M14 9.5l-4 5"/>'),
  merge: S('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 12h3M17 12h-3M9 10l2 2-2 2M15 10l-2 2 2 2"/>'),
  mergeRight: S('<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M12 6v3M12 15v3M8 12h8M14 10l2 2-2 2"/>'),
  mergeDown: S('<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M6 12h3M15 12h3M12 8v8M10 14l2 2 2-2"/>'),
  split: S('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14" stroke-dasharray="2 2"/><path d="M9 12H5M15 12h4M7 10l-2 2 2 2M17 10l2 2-2 2"/>'),
};

const fine = () => { try { return matchMedia('(pointer: fine)').matches; } catch { return true; } }; // a mouse (Shift+click works)

// the picked cells of a table: { r, c, r2, c2 }
export function pickedCells(app, tb) {
  const ed = app.editor, g = readGrid(tb);
  if (ed.editing?.item === tb && ed.editing.cell) { const e = entryOf(g, ed.editing.cell); if (e) return rectOf(e); }
  const p = app.tablePick;
  return grow(g, clampRect(g, p && p.id === tb.id ? p : { r: 0, c: 0 }));
}
function setPick(app, tb, q, anchor = null) {
  app.tablePick = { id: tb.id, r: q.r, c: q.c, r2: q.r2, c2: q.c2, anchor: anchor || app.tablePick?.anchor || { r: q.r, c: q.c } };
}

// change the table: one undo step
function act(app, what, value = null) {
  const ed = app.editor; let tb = pickedTable(ed); if (!tb) return;
  const q = pickedCells(app, tb);
  if (ed.editing) { ed.endEdit(); tb = pickedTable(ed) || tb; } // the words typed so far are kept first
  const can = canDo(tb, q);
  if ((what in can && can[what] === false)) return;
  const heights = drawnRows(app, tb, ed.pageIndex);
  let next = null;
  ed.change('table', () => {
    next = tableAction(tb, ed.page, what, q, heights, value);
    if (next) setPick(app, tb, next, { r: next.r, c: next.c });
  });
  if (!next) ed.history.undoStack.pop(); // nothing changed after all
}

// a frame round the picked cells, inside the selection frame (so it goes when the table is no longer picked)
function drawPick(app) {
  const ed = app.editor, tb = pickedTable(ed); if (!tb) return;
  const sel = ed.pageEl?.querySelector(':scope > .pw-ui.sel'); if (!sel) return;
  sel.querySelector('.tpick')?.remove();
  const box = ed.pageEl.querySelector(`:scope > .it.table[data-id="${tb.id}"]`); if (!box) return;
  const q = pickedCells(app, tb), g = readGrid(tb), at = cellAt(g);
  const cells = new Set(); for (let r = q.r; r <= q.r2; r++) for (let c = q.c; c <= q.c2; c++) if (at[r]?.[c]) cells.add(at[r][c].cell);
  const tds = [...box.querySelectorAll('td')].filter((td) => cells.has(td.__cell)); if (!tds.length) return;
  const br = box.getBoundingClientRect(), k = (tb.w || 1) / (br.width || 1);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const td of tds) { const r = td.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
  // the selection frame starts at the top-left of what is picked (a table in a group: the group's)
  const b = unionBounds(ed.selectedItems()) || { x: tb.x, y: tb.y };
  const d = document.createElement('div'); d.className = 'pw-ui tpick' + (ed.editing ? ' typing' : '');
  Object.assign(d.style, { left: `${(x0 - br.left) * k + tb.x - b.x}pt`, top: `${(y0 - br.top) * k + tb.y - b.y}pt`, width: `${(x1 - x0) * k}pt`, height: `${(y1 - y0) * k}pt` });
  sel.appendChild(d);
}

// clicks on the cells of a table pick them (the editor picks the table itself as usual)
function watchCells(app) {
  const pages = document.getElementById('pages'); if (!pages || app._tableWatch) return;
  app._tableWatch = true;
  pages.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const td = e.target.closest?.('.page > .it.table td'); if (!td?.__cell) return;
    const box = td.closest('.it.table'), tb = box.__item; if (!tb) return;
    const ed = app.editor, g = readGrid(tb), en = entryOf(g, td.__cell); if (!en) return;
    const here = rectOf(en);
    const sameTable = pickedTable(ed) === tb && ed.pageEl === box.closest('.page');
    if (e.shiftKey && sameTable) {
      // Shift+click: a block of cells from the first picked one to this one (the table stays picked)
      if (ed.editing?.container === td) return; // picking words inside the cell being typed in
      e.stopPropagation(); e.preventDefault();
      const from = pickedCells(app, tb), a = app.tablePick?.id === tb.id && app.tablePick.anchor ? app.tablePick.anchor : { r: from.r, c: from.c };
      if (ed.editing) ed.endEdit();
      const q = grow(g, { r: Math.min(a.r, here.r), c: Math.min(a.c, here.c), r2: Math.max(a.r, here.r2), c2: Math.max(a.c, here.c2) });
      setPick(app, tb, q, a);
      ed.drawSelection(); app.panel?.show();
      return;
    }
    setPick(app, tb, here, { r: here.r, c: here.c });
    if (sameTable && !ed.editing) requestAnimationFrame(() => { drawPick(app); app.panel?.show(); });
  }, true);
  // the selection frame is drawn again often: put the cell frame back each time
  new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.addedNodes) if (n.classList?.contains('sel') && n.classList.contains('pw-ui')) { drawPick(app); return; }
  }).observe(pages, { childList: true, subtree: true });
}

const table = {
  id: 'table',
  early: true, // right after the text settings, before position and size
  when: ({ ed }) => !!pickedTable(ed),
  html({ app, ed, t, esc }) {
    const tb = pickedTable(ed), q = pickedCells(app, tb), can = canDo(tb, q);
    const g = readGrid(tb), inPick = g.cells.filter((e) => inside(e, q)), one = inPick.length === 1;
    const b = (what, key, extra = '') => `<button class="btn" data-tact="${what}" title="${esc(t('tbl.' + what + '.tip'))}" aria-label="${esc(t('tbl.' + what + '.tip'))}"${extra}>${ICON[what]}<span>${esc(t('tbl.' + what))}</span></button>`;
    const off = (k) => (can[k] ? '' : ' disabled');
    const fill = can.fill || '#ffffff';
    const where = !one ? t('tbl.pickedMany', { n: inPick.length }) : t(q.r2 > q.r || q.c2 > q.c ? 'tbl.pickedMerged' : 'tbl.pickedOne', { r: q.r + 1, c: q.c + 1 });
    return `<div class="ptbl"><h2>${esc(t('tbl.title'))}</h2>
      <p class="tbl-where" aria-live="polite">${esc(where)}</p>
      <div class="tbl-group" role="group" aria-label="${esc(t('tbl.rows'))}"><span class="tbl-lab">${esc(t('tbl.rows'))}</span>
        <div class="tbl-btns">${b('rowAbove')}${b('rowBelow')}${b('delRow', '', off('delRow'))}</div></div>
      <div class="tbl-group" role="group" aria-label="${esc(t('tbl.cols'))}"><span class="tbl-lab">${esc(t('tbl.cols'))}</span>
        <div class="tbl-btns">${b('colLeft')}${b('colRight')}${b('delCol', '', off('delCol'))}</div></div>
      <div class="tbl-group" role="group" aria-label="${esc(t('tbl.cells'))}"><span class="tbl-lab">${esc(t('tbl.cells'))}</span>
        <div class="tbl-btns">${can.merge ? b('merge') : ''}${b('mergeRight', '', off('mergeRight'))}${b('mergeDown', '', off('mergeDown'))}${can.split ? b('split') : ''}</div></div>
      <div class="prow"><label class="field">${esc(t('tbl.fill'))} <input id="tblFill" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(fill) ? fill : '#ffffff')}"></label>
        <label class="check"><input id="tblNoFill" type="checkbox"${can.fill ? '' : ' checked'}> ${esc(t('panel.none'))}</label></div>
      <p class="hint">${esc(t(ed.editing ? 'tbl.hintTyping' : fine() ? 'tbl.hint' : 'tbl.hintTouch'))}</p></div>`;
  },
  wire(el, { app }) {
    watchCells(app);
    const ed = app.editor;
    if (ed.editing?.cell) { const tb = pickedTable(ed); if (tb) setPick(app, tb, pickedCells(app, tb)); } // keep the cell typed in picked after typing
    el.querySelectorAll('[data-tact]').forEach((b) => b.addEventListener('click', () => act(app, b.dataset.tact)));
    const fill = el.querySelector('#tblFill'), none = el.querySelector('#tblNoFill');
    fill?.addEventListener('change', () => { none.checked = false; act(app, 'fill', fill.value); });
    none?.addEventListener('change', () => act(app, 'fill', none.checked ? null : fill.value));
    drawPick(app);
  },
};

export default [table];
