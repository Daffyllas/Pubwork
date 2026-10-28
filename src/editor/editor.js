// The editor: pick things on the page, move and resize them, type in text boxes, add text, pictures and
// shapes, and undo. Every change goes through change(), which saves an undo step, updates the document
// and redraws the page. The page on screen is drawn from the document, so what you see is what is saved.
import { History, clone, findItem, bounds, unionBounds, moveItem, resizeItem, reId, uid } from './model.js';
import { readParas, applyRunStyle, applyParaStyle, styleAtCaret } from './text.js';
import { t } from '../i18n/index.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const isMod = (e) => e.ctrlKey || e.metaKey;
const REFIT = new Set(['text style', 'style']); // changes after which boxes that grow with their text fit it again

export class Editor {
  constructor(app) {
    this.app = app; this.history = new History(); this.sel = []; this.pageIndex = 0; this.editing = null; this.clip = null;
    const pages = document.getElementById('pages');
    pages.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    pages.addEventListener('dblclick', (e) => this.onDblClick(e));
    window.addEventListener('keydown', (e) => this.onKey(e), true);
    document.addEventListener('selectionchange', () => { if (this.editing) { this.saveRange(); this.app.panel?.refreshText(); } });
    document.addEventListener('paste', (e) => this.onPaste(e));
    document.addEventListener('copy', (e) => { if (!this.editing && this.sel.length && !isFormField(e.target)) { this.copy(); e.preventDefault(); } });
    // a tap or click on the grey area beside the pages ends typing, like Esc (a scroll on a phone is not a tap)
    const desk = document.getElementById('desk');
    const grey = (el) => el === desk || el === pages || (pages.contains(el) && !el.closest('.page'));
    let downGrey = false;
    desk?.addEventListener('pointerdown', (e) => { downGrey = grey(e.target); });
    desk?.addEventListener('click', (e) => { if (downGrey && grey(e.target) && this.editing) this.endEdit(); downGrey = false; });
    // words for screen readers when an item is picked with the keyboard
    this.live = document.createElement('div'); this.live.className = 'pw-live'; this.live.setAttribute('aria-live', 'polite');
    Object.assign(this.live.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' });
    document.body.appendChild(this.live);
  }
  get doc() { return this.app.doc; }
  get page() { return this.doc?.pages[this.pageIndex]; }
  get pageEl() { return this.app.pageEls?.[this.pageIndex]; }
  reset() {
    this.history.reset(); this.sel = []; this.editing = null; this.pageIndex = 0; this.app.updateToolbar?.();
    document.getElementById('desk')?.removeAttribute('aria-label');
  }

  // ---------------------------------------------------------------- selection
  // the thing you pick: a top-level item of the page (a whole group counts as one)
  unitOf(el) { const it = el?.closest?.('.page > .it'); return it ? it.dataset.group || it.dataset.id : null; }
  selectedItems() { const pg = this.page; return pg ? this.sel.map((id) => pg.items.find((it) => it.id === id)).filter(Boolean) : []; }
  select(ids, pageIndex = this.pageIndex) {
    if (this.editing) this.endEdit();
    this.pageIndex = pageIndex; this.sel = ids;
    this.drawSelection(); this.app.panel?.show(); this.app.updateToolbar?.();
  }
  clear() { this.select([]); }
  nodesOf(id) { return [...(this.pageEl?.querySelectorAll(`:scope > [data-id="${id}"], :scope > [data-group="${id}"]`) || [])]; }
  drawSelection() {
    document.querySelectorAll('.pw-ui.sel, .pw-ui.guide').forEach((n) => n.remove());
    document.body.classList.toggle('has-sel', !!(this.sel.length || this.editing)); // phones show the settings sheet only then
    // the page area can take the keyboard: Tab picks the items on the page
    const desk = document.getElementById('desk');
    if (desk && this.doc) { desk.tabIndex = 0; const l = t('ed.kbd.desk'); if (desk.getAttribute('aria-label') !== l) desk.setAttribute('aria-label', l); }
    const items = this.selectedItems(); if (!items.length || !this.pageEl) return;
    const b = unionBounds(items); if (!b) return;
    const box = document.createElement('div'); box.className = 'pw-ui sel' + (this.editing ? ' typing' : '');
    Object.assign(box.style, { left: `${b.x}pt`, top: `${b.y}pt`, width: `${Math.max(b.w, 0.1)}pt`, height: `${Math.max(b.h, 0.1)}pt` });
    if (!this.editing) for (const h of HANDLES) { const d = document.createElement('div'); d.className = `pw-ui handle h-${h}`; d.dataset.handle = h; box.appendChild(d); }
    this.pageEl.appendChild(box);
  }

  // ---------------------------------------------------------------- pointer: pick, move, resize
  pagePoint(e, pageEl) { const r = pageEl.getBoundingClientRect(), pg = pageEl.__page; return [((e.clientX - r.left) / r.width) * pg.w, ((e.clientY - r.top) / r.height) * pg.h]; }
  onPointerDown(e) {
    if (e.button !== 0 || !this.doc) return;
    const pageEl = e.target.closest('.page'); if (!pageEl) { if (!this.editing) this.clear(); return; }
    const pageIndex = this.app.pageEls.indexOf(pageEl);
    if (this.editing && this.editing.container.contains(e.target)) return; // clicking inside the text being typed
    const handle = e.target.dataset?.handle;
    if (handle && pageIndex === this.pageIndex) { e.preventDefault(); this.startDrag(e, pageEl, handle); return; }
    const id = this.unitOf(e.target);
    if (!id) { if (this.editing) this.endEdit(); this.select([], pageIndex); return; }
    if (e.shiftKey && pageIndex === this.pageIndex) this.select(this.sel.includes(id) ? this.sel.filter((x) => x !== id) : [...this.sel, id], pageIndex);
    else if (!this.sel.includes(id) || pageIndex !== this.pageIndex) this.select([id], pageIndex);
    else if (this.editing) this.endEdit();
    if (this.sel.length) { e.preventDefault(); this.startDrag(e, pageEl, null); }
  }
  startDrag(e, pageEl, handle) {
    const items = this.selectedItems(); if (!items.length) return;
    const start = this.pagePoint(e, pageEl), b0 = unionBounds(items), pg = this.page;
    const nodes = this.sel.flatMap((id) => this.nodesOf(id));
    const selBox = pageEl.querySelector('.pw-ui.sel');
    const zoomPx = pageEl.getBoundingClientRect().width / pg.w; // screen px per point
    const snapPx = 6 / zoomPx;
    const others = pg.items.filter((it) => !this.sel.includes(it.id)).map(bounds);
    const extra = this.app.snapLines?.(pg) || { xs: [], ys: [] }; // layout guides, margins, columns
    const xs = [0, pg.w / 2, pg.w, ...extra.xs, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
    const ys = [0, pg.h / 2, pg.h, ...extra.ys, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
    if (items.some((it) => it.locked)) return; // locked items stay where they are
    let moved = false, result = null;
    const keepRatio = handle && handle.length === 2 && items.every((it) => it.type === 'image');
    const onMove = (ev) => {
      const [px, py] = this.pagePoint(ev, pageEl);
      let dx = px - start[0], dy = py - start[1];
      if (!moved && Math.hypot(dx * zoomPx, dy * zoomPx) < 3) return;
      moved = true;
      let nb;
      if (!handle) {
        nb = { ...b0, x: b0.x + dx, y: b0.y + dy };
        const sx = snap([nb.x, nb.x + nb.w / 2, nb.x + nb.w], xs, snapPx), sy = snap([nb.y, nb.y + nb.h / 2, nb.y + nb.h], ys, snapPx);
        if (!ev.altKey) { nb.x += sx.d; nb.y += sy.d; }
        this.guides(pageEl, ev.altKey ? null : sx.at, ev.altKey ? null : sy.at);
      } else {
        let x0 = b0.x, y0 = b0.y, x1 = b0.x + b0.w, y1 = b0.y + b0.h;
        if (handle.includes('w')) x0 += dx; if (handle.includes('e')) x1 += dx;
        if (handle.includes('n')) y0 += dy; if (handle.includes('s')) y1 += dy;
        if (keepRatio || ev.shiftKey) { // pictures keep their shape from the corners
          const r = b0.w / (b0.h || 1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
          if (w / r > h) { const nh = w / r; if (handle.includes('n')) y0 = y1 - nh; else y1 = y0 + nh; } else { const nw = h * r; if (handle.includes('w')) x0 = x1 - nw; else x1 = x0 + nw; }
        }
        const sxs = snap([handle.includes('w') ? x0 : x1], xs, snapPx), sys = snap([handle.includes('n') ? y0 : y1], ys, snapPx);
        if (!ev.altKey && !keepRatio) { if (handle.includes('w')) x0 += sxs.d; else if (handle.includes('e')) x1 += sxs.d; if (handle.includes('n')) y0 += sys.d; else if (handle.includes('s')) y1 += sys.d; }
        this.guides(pageEl, handle.match(/[we]/) ? sxs.at : null, handle.match(/[ns]/) ? sys.at : null);
        nb = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(1, Math.abs(x1 - x0)), h: Math.max(b0.h ? 1 : 0, Math.abs(y1 - y0)) };
      }
      result = nb;
      // show it straight away; the document changes when the mouse is let go
      const sx = b0.w ? nb.w / b0.w : 1, sy = b0.h ? nb.h / b0.h : 1;
      for (const n of nodes) {
        const l = parseFloat(n.style.left) || 0, tp = parseFloat(n.style.top) || 0;
        n.style.transformOrigin = `${b0.x - l}pt ${b0.y - tp}pt`;
        n.style.translate = `${nb.x - b0.x}pt ${nb.y - b0.y}pt`;
        n.style.scale = handle ? `${sx} ${sy}` : '';
      }
      if (selBox) Object.assign(selBox.style, { left: `${nb.x}pt`, top: `${nb.y}pt`, width: `${nb.w}pt`, height: `${nb.h}pt` });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      this.guides(pageEl, null, null);
      if (!moved || !result) return;
      this.change(handle ? 'resize' : 'move', () => {
        for (const it of this.selectedItems()) {
          if (handle) { resizeItem(it, b0, result); markEdited(it); } else moveItem(it, result.x - b0.x, result.y - b0.y);
        }
      });
    };
    const onCancel = () => { // the browser took over (e.g. scrolling on a touch screen): put things back
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      this.guides(pageEl, null, null); for (const n of nodes) { n.style.translate = ''; n.style.scale = ''; } this.drawSelection();
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  }
  guides(pageEl, x, y) {
    pageEl.querySelectorAll('.pw-ui.guide').forEach((n) => n.remove());
    const add = (cls, style) => { const g = document.createElement('div'); g.className = `pw-ui guide ${cls}`; Object.assign(g.style, style); pageEl.appendChild(g); };
    if (x != null) add('v', { left: `${x}pt` });
    if (y != null) add('h', { top: `${y}pt` });
  }

  // ---------------------------------------------------------------- changing the document
  // label: what the undo step is called; pages: which page indexes need drawing again (default: current)
  change(label, fn, pages = null) {
    this.history.save(this.doc, label);
    fn();
    const which = pages || [this.pageIndex];
    this.app.redraw(which);
    if (REFIT.has(label)) { // a text style changes the picked boxes; a changed style can reach any box
      let only = null;
      if (label === 'text style') { only = new Set(); this.selectedItems().forEach((it) => applyDeep(it, (x) => only.add(x.id))); }
      this.refitSoon(which, only);
    }
    this.drawSelection(); this.app.panel?.show(); this.app.updateToolbar?.(); this.app.touched?.();
  }
  // boxes that grow with their text fit it again after its look changed (now, and once the fonts are in)
  // only: the ids of the boxes to fit (null: every such box on those pages)
  refitSoon(which, only = null) {
    if (this.refitGrow(which, only)) this.app.redraw(which);
    const doc = this.doc;
    Promise.resolve(this.app.settled).then(() => {
      if (this.doc !== doc || this.editing || !this.refitGrow(which, only)) return;
      this.app.redraw(which); this.drawSelection(); this.app.panel?.show(); this.app.touched?.();
    });
  }
  refitGrow(which, only = null) {
    let changed = false;
    for (const pi of which) for (const box of this.app.pageEls?.[pi]?.querySelectorAll(':scope > .it.text') || []) {
      const it = box.__item, flow = box.querySelector(':scope > .flow');
      if (!it?.autoGrow || it.chain || !flow || !box.offsetHeight || (only && !only.has(it.id))) continue;
      const cs = getComputedStyle(box), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const room = box.clientHeight - pad, need = flow.scrollHeight;
      if (Math.abs(need - room) <= 0.5) continue;
      const k = parseFloat(box.style.height) / box.offsetHeight; // points per screen pixel
      const h = (need + pad) * k + 1;
      if (Number.isFinite(h) && h > 0) { it.h = h; changed = true; }
    }
    return changed;
  }
  undo() { if (this.editing) this.endEdit(); if (this.history.undo(this.doc)) this.afterHistory(); }
  redo() { if (this.editing) this.endEdit(); if (this.history.redo(this.doc)) this.afterHistory(); }
  afterHistory() {
    this.pageIndex = Math.min(this.pageIndex, this.doc.pages.length - 1);
    this.sel = this.sel.filter((id) => this.page.items.some((it) => it.id === id));
    this.app.redraw(null); this.drawSelection(); this.app.panel?.show(); this.app.updateToolbar?.(); this.app.touched?.();
  }
  remove() {
    if (!this.sel.length) return;
    if (this.selectedItems().some((it) => it.locked)) { this.app.toast?.(t('pics.lockedNoMove')); return; } // locked items can't be deleted either
    const ids = new Set(this.sel);
    this.change('delete', () => { this.page.items = this.page.items.filter((it) => !ids.has(it.id)); });
    this.sel = []; this.drawSelection(); this.app.panel?.show();
  }
  nudge(dx, dy) { if (this.sel.length && !this.selectedItems().some((it) => it.locked)) this.change('move', () => this.selectedItems().forEach((it) => moveItem(it, dx, dy))); }
  copy() { const items = this.selectedItems(); if (items.length) this.clip = clone(items); }
  paste(offset = 12) {
    if (!this.clip) return;
    const copies = clone(this.clip).map(reId);
    copies.forEach((it) => moveItem(it, offset, offset));
    this.change('paste', () => this.page.items.push(...copies));
    this.select(copies.map((c) => c.id));
    this.clip = clone(copies);
  }
  duplicate() { this.copy(); this.paste(); }
  arrange(where) {
    const list = this.page.items, ids = new Set(this.sel); if (!ids.size) return;
    this.change('arrange', () => {
      const picked = list.filter((it) => ids.has(it.id)), rest = list.filter((it) => !ids.has(it.id));
      if (where === 'front') this.page.items = [...rest, ...picked];
      else if (where === 'back') this.page.items = [...picked, ...rest];
      else {
        const arr = [...list]; const step = where === 'forward' ? 1 : -1;
        const order = step > 0 ? [...arr.keys()].reverse() : [...arr.keys()];
        for (const i of order) { if (!ids.has(arr[i].id)) continue; const j = i + step; if (j < 0 || j >= arr.length || ids.has(arr[j].id)) continue; [arr[i], arr[j]] = [arr[j], arr[i]]; }
        this.page.items = arr;
      }
    });
  }
  // set a property on every selected item (fill colour, line, picture …)
  setProps(fn, label = 'style') { if (this.sel.length) this.change(label, () => this.selectedItems().forEach((it) => applyDeep(it, fn))); }
  setBounds(nb) {
    const items = this.selectedItems(), b0 = unionBounds(items); if (!b0) return;
    if (items.some((it) => it.locked)) { this.app.panel?.show(); this.app.toast?.(t('pics.lockedNoMove')); return; } // locked items stay as they are
    this.change('resize', () => items.forEach((it) => { if (nb.w !== b0.w || nb.h !== b0.h) { resizeItem(it, b0, nb); markEdited(it); } else moveItem(it, nb.x - b0.x, nb.y - b0.y); }));
  }
  add(item, { edit = false } = {}) {
    item.id ||= uid();
    this.change('add', () => this.page.items.push(item));
    this.select([item.id]);
    if (edit) { const box = this.nodesOf(item.id)[0]; if (box) this.startEdit(box, null, true); }
  }

  // ---------------------------------------------------------------- typing
  onDblClick(e) {
    const art = e.target.closest('.page > .it.shape');
    const artItem = art && !this.editing && findItem(this.doc, art.dataset.id)?.it;
    if (artItem?.wordart) { this.select([art.dataset.group || art.dataset.id], this.app.pageEls.indexOf(art.closest('.page'))); this.app.openWordArt?.(artItem.id); return; }
    const pic = e.target.closest('.page > .it.pic');
    if (pic && !this.editing) { // a picture or an empty frame: choose a picture to put in it
      const pageIndex = this.app.pageEls.indexOf(pic.closest('.page'));
      this.select([pic.dataset.group || pic.dataset.id], pageIndex);
      this.app.pickPicture((f) => this.app.fillPicture(pic.dataset.id, f));
      return;
    }
    let el = e.target.closest('.page > .it.text, .page > .it.table');
    if (!el || this.editing) return;
    if (this.app.mergePreview != null) { // typing happens on the fields, not on a record
      const id = el.dataset.id, pi = this.app.pageEls.indexOf(el.closest('.page'));
      this.app.setMergePreview(null); this.app.merge?.render();
      el = this.app.pageEls[pi]?.querySelector(`:scope > [data-id="${id}"]`); if (!el) return;
    }
    const td = el.classList.contains('table') ? e.target.closest('td') : null;
    if (el.classList.contains('table') && !td) return;
    const pageIndex = this.app.pageEls.indexOf(el.closest('.page'));
    if (pageIndex !== this.pageIndex || !this.sel.includes(el.dataset.group || el.dataset.id)) this.select([el.dataset.group || el.dataset.id], pageIndex);
    this.startEdit(el, e, false, td);
  }
  startEdit(box, e = null, selectAll = false, td = null) {
    const container = td || box.querySelector('.flow'); if (!container) return;
    const item = box.__item; if (!item) return;
    this.editing = { box, container, item, cell: td?.__cell || null, before: clone(this.doc.pages), html: container.innerHTML };
    box.classList.add('editing');
    container.contentEditable = 'true'; container.spellcheck = true;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* older browsers */ }
    // text that was squeezed to fit is shown at its real size while typing
    container.querySelectorAll('[data-fs0]').forEach((n) => { n.style.fontSize = n.dataset.fs0; });
    container.focus({ preventScroll: true });
    const sel = getSelection(); sel.removeAllRanges();
    let r = null;
    if (e && document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (e && document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if (!r || !container.contains(r.startContainer) || selectAll) { r = document.createRange(); r.selectNodeContents(container); if (!selectAll) r.collapse(false); }
    sel.addRange(r);
    this.saveRange(); this.drawSelection(); this.app.panel?.show(); this.app.updateToolbar?.();
    // while typing: boxes made here grow with their text; others show the "doesn't fit" mark
    if (!td) {
      const fitCheck = () => {
        const cs = getComputedStyle(box), room = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const need = container.scrollHeight;
        if (item.autoGrow && Math.abs(need - room) > 0.5) { const k = parseFloat(box.style.height) / box.offsetHeight; box.style.height = `${(need + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) * k + 1}pt`; this.editing && (this.editing.grew = true); this.drawSelectionFromBox(box); }
        box.classList.toggle('overflow', !item.autoGrow && need > room + 1);
      };
      container.addEventListener('input', fitCheck); this.editing.fitCheck = fitCheck; fitCheck();
    }
    // the words being typed go into the document a moment after each change, so they are kept even if the tab closes
    const later = () => this.flushSoon();
    container.addEventListener('input', later); this.editing.later = later;
  }
  flushSoon() { const ed = this.editing; if (!ed) return; clearTimeout(ed.flushT); ed.flushT = setTimeout(() => { if (this.editing === ed) this.flush(); }, 1000); }
  // put the words being typed into the document, without stopping the typing. True when something changed.
  // All the typing in one box is still one undo step.
  flush() {
    const ed = this.editing; if (!ed) return false;
    clearTimeout(ed.flushT);
    const html = ed.container.innerHTML;
    if (html === (ed.kept ?? ed.html)) return false;
    ed.kept = html;
    if (!ed.inHistory) { this.pushTyping(ed); ed.inHistory = true; }
    this.readTyping(ed);
    this.app.updateToolbar?.(); this.app.touched?.();
    return true;
  }
  pushTyping(ed) { this.history.undoStack.push({ pages: ed.before, scheme: this.doc.scheme, fontPair: this.doc.fontPair, label: 'typing' }); this.history.redoStack = []; }
  // read the typed words back into the document; returns the pages to draw again
  readTyping(ed) {
    const item = ed.item, pagesToDraw = new Set([this.pageIndex]);
    if (ed.grew) item.h = parseFloat(ed.box.style.height) || item.h;
    if (ed.cell) ed.cell.paras = readParas(ed.container, ed.cell.paras);
    else if (item.chain) {
      // the story runs through several boxes: read them all, in order, and give every box the new story
      const boxes = [...document.querySelectorAll(`#pages .text[data-chain="${item.chain}"]`)].sort((a, b) => a.dataset.chainIndex - b.dataset.chainIndex);
      const story = [];
      for (const b of boxes) {
        const flow = b.querySelector('.flow'), ps = readParas(flow, item.paras);
        if (flow.firstElementChild?.classList.contains('cont') && story.length && ps.length) { story[story.length - 1].runs.push(...ps[0].runs); story.push(...ps.slice(1)); } else story.push(...ps);
      }
      for (const b of boxes) { b.__item.paras = clone(story); pagesToDraw.add(this.app.pageEls.indexOf(b.closest('.page'))); }
    } else { item.paras = readParas(ed.container, item.paras); item.edited = true; }
    return pagesToDraw;
  }
  // the frame follows a box that is growing while you type
  drawSelectionFromBox(box) { const sel = this.pageEl?.querySelector('.pw-ui.sel'); if (sel) sel.style.height = box.style.height; }
  saveRange() { const s = getSelection(); if (s.rangeCount && this.editing?.container.contains(s.getRangeAt(0).commonAncestorContainer)) this.editing.range = s.getRangeAt(0).cloneRange(); }
  restoreRange() { const r = this.editing?.range; if (!r) return null; const s = getSelection(); s.removeAllRanges(); s.addRange(r); return r; }
  endEdit() {
    const ed = this.editing; if (!ed) return;
    this.editing = null;
    const hadFocus = ed.container.contains(document.activeElement);
    ed.container.removeAttribute('contenteditable'); ed.box.classList.remove('editing');
    getSelection().removeAllRanges();
    if (ed.fitCheck) ed.container.removeEventListener('input', ed.fitCheck);
    ed.container.removeEventListener('input', ed.later); clearTimeout(ed.flushT);
    if (hadFocus) document.getElementById('desk')?.focus({ preventScroll: true }); // the keyboard stays on the page area
    if (ed.container.innerHTML === ed.html && !ed.inHistory) { this.drawSelection(); this.app.panel?.show(); return; }
    // undo goes back to before the typing started (one step, even if the words were kept on the way)
    if (!ed.inHistory) this.pushTyping(ed);
    const pagesToDraw = this.readTyping(ed);
    this.app.redraw([...pagesToDraw]);
    this.drawSelection(); this.app.panel?.show(); this.app.updateToolbar?.(); this.app.touched?.();
  }
  // text style from the toolbar: while typing it changes the selected words, otherwise the whole box
  textStyle(patch) {
    if (this.editing) {
      const r = this.restoreRange();
      if ('align' in patch) applyParaStyle(this.editing.container, r, patch); else applyRunStyle(this.editing.container, r, patch, this.app.embedded);
      this.editing.fitCheck?.(); this.flushSoon(); // bigger or bolder words may need a taller box
      this.saveRange(); this.app.panel?.refreshText(); return;
    }
    const items = this.selectedItems(); if (!items.length) return;
    this.change('text style', () => items.forEach((it) => applyDeep(it, (x) => {
      const paraLists = x.type === 'text' ? [x.paras] : x.type === 'table' ? x.rows.flatMap((r) => r.cells.map((c) => c.paras)) : [];
      for (const paras of paraLists) for (const p of paras) { if ('align' in patch) p.align = patch.align; else for (const r of p.runs) Object.assign(r, patch); if ('size' in patch) delete p.emptySize; }
      if (paraLists.length && !('align' in patch)) x.edited = true;
    })));
  }
  textState() {
    if (this.editing) return styleAtCaret(this.editing.container);
    const it = this.selectedItems().find((x) => x.type === 'text' || x.type === 'table');
    const run = it?.type === 'text' ? it.paras.flatMap((p) => p.runs)[0] : it?.rows?.[0]?.cells?.[0]?.paras?.[0]?.runs?.[0];
    if (!it) return null;
    return { font: run?.font || 'Times New Roman', size: run?.size || 10, bold: !!run?.bold, italic: !!run?.italic, underline: !!run?.underline, color: run?.color || '#000000', align: (it.paras?.[0]?.align) || 'left' };
  }

  // ---------------------------------------------------------------- keys and paste
  onKey(e) {
    if (!this.doc || document.getElementById('start') && !document.getElementById('start').hidden) return;
    if (isFormField(e.target) && !this.editing) return;
    const k = e.key;
    if (this.editing) {
      if (k === 'Escape') { e.preventDefault(); this.endEdit(); return; }
      if (k === 'Tab' && !isMod(e) && this.editing.cell) { e.preventDefault(); this.nextCell(e.shiftKey ? -1 : 1); return; }
      if (k === 'Tab' && !isMod(e) && !this.editing.cell) { e.preventDefault(); document.execCommand('insertText', false, '\t'); return; }
      if (isMod(e) && ['b', 'i', 'u'].includes(k.toLowerCase())) {
        e.preventDefault(); const s = this.textState() || {};
        const key = { b: 'bold', i: 'italic', u: 'underline' }[k.toLowerCase()];
        this.textStyle({ [key]: !s[key] }); return;
      }
      return; // everything else is typing
    }
    if (isMod(e) && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if (isMod(e) && k.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
    if (isMod(e) && k.toLowerCase() === 'd') { e.preventDefault(); this.duplicate(); return; }
    if (isMod(e) && k.toLowerCase() === 'a') { e.preventDefault(); this.select(this.page.items.map((it) => it.id)); return; }
    if (k === 'Tab' && !isMod(e) && !e.altKey && this.onPageArea()) { if (this.pickNext(e.shiftKey ? -1 : 1)) e.preventDefault(); return; }
    if (!this.sel.length) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.remove(); return; }
    if (k === 'Escape') { this.clear(); return; }
    if (k === 'Enter') { // type in the picked text box (or the one in a group, or a table's first cell)
      if (this.app.mergePreview != null) { const keep = this.sel; this.app.setMergePreview(null); this.app.merge?.render(); this.select(keep); } // typing happens on the fields
      const nodes = this.nodesOf(this.sel[0]), box = nodes.find((n) => n.classList.contains('text')) || nodes.find((n) => n.classList.contains('table'));
      if (box?.classList.contains('text')) { e.preventDefault(); this.startEdit(box); }
      else if (box && this.sel.length === 1) { const td = box.querySelector('td'); if (td) { e.preventDefault(); this.startEdit(box, null, false, td); } }
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
    if (d) { e.preventDefault(); this.nudge(...d); }
  }
  // Tab in a table: on to the next cell (Shift+Tab: back); the first and last cells keep the caret
  nextCell(step) {
    const ed = this.editing, table = ed.item, id = ed.box.dataset.id;
    const cells = table.rows.flatMap((r) => r.cells.filter((c) => !c.covered));
    const next = cells[cells.indexOf(ed.cell) + step]; if (!next) return;
    this.endEdit();
    const box = this.pageEl?.querySelector(`:scope > [data-id="${id}"]`);
    const td = box && [...box.querySelectorAll('td')].find((x) => x.__cell === next);
    if (td) this.startEdit(box, null, false, td);
  }
  // is the keyboard on the page area (or nowhere, with something picked on the page)?
  onPageArea() {
    const a = document.activeElement, desk = document.getElementById('desk');
    if (!desk || document.querySelector('.pw-dlg')) return false;
    if (a === desk || (desk.contains(a) && !isFormField(a) && !a.closest('#start'))) return true;
    return (!a || a === document.body) && this.sel.length > 0;
  }
  // Tab on the page: pick the next item, in reading order (top to bottom, left to right).
  // Past the last one (or before the first) Tab leaves the page as usual.
  pickNext(step) {
    const pi = this.sel.length ? this.pageIndex : (this.app.current ?? this.pageIndex), pg = this.doc.pages[pi];
    if (!pg?.items.length) return false;
    const order = pg.items.map((it) => ({ id: it.id, b: bounds(it) })).sort((a, b) => (Math.abs(a.b.y - b.b.y) > 2 ? a.b.y - b.b.y : a.b.x - b.b.x)).map((o) => o.id);
    const now = this.sel.length ? order.indexOf(this.sel[0]) : -1;
    const n = now < 0 ? (step > 0 ? 0 : order.length - 1) : now + step;
    if (n < 0 || n >= order.length) return false;
    this.select([order[n]], pi);
    document.getElementById('desk')?.focus({ preventScroll: true });
    this.nodesOf(order[n])[0]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.live.textContent = t('ed.kbd.picked', { what: this.describe(pg.items.find((it) => it.id === order[n])), n: n + 1, total: order.length });
    return true;
  }
  describe(it) {
    const flat = (x) => (x.type === 'group' ? x.items.flatMap(flat) : [x]), parts = flat(it), texts = parts.filter((x) => x.type === 'text');
    // a group of a text box and its frame is read out as a text box
    let kind = it.type === 'image' ? 'picture' : ['text', 'table', 'group'].includes(it.type) ? it.type : 'shape';
    if (kind === 'group' && texts.length === 1 && parts.every((x) => x.type === 'text' || x.type === 'shape')) kind = 'text';
    const words = texts.length ? texts[0].paras.map((p) => p.runs.map((r) => r.text).join('')).join(' ').replace(/\s+/g, ' ').trim() : '';
    const what = t(`ed.kind.${kind}`);
    return words ? t('ed.kbd.named', { what, text: words.length > 40 ? `${words.slice(0, 40)}…` : words }) : what;
  }
  onPaste(e) {
    if (this.editing) {
      // paste words only, in the style of the place they go
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
      return;
    }
    if (isFormField(e.target) || !this.doc) return;
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    if (file) { e.preventDefault(); this.app.insertPicture(file); return; }
    if (this.clip) { e.preventDefault(); this.paste(); }
  }
}

function snap(values, lines, tol) {
  let best = { d: 0, at: null, dist: tol };
  for (const v of values) for (const l of lines) { const dist = Math.abs(l - v); if (dist < best.dist) best = { d: l - v, at: l, dist }; }
  return best;
}
function applyDeep(it, fn) { if (it.type === 'group') it.items.forEach((c) => applyDeep(c, fn)); else fn(it); }
function markEdited(it) { applyDeep(it, (x) => { if (x.type === 'text') x.edited = true; }); }
const isFormField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
