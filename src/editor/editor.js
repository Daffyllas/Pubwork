// The editor: pick things on the page, move and resize them, type in text boxes, add text, pictures and
// shapes, and undo. Every change goes through change(), which saves an undo step, updates the document
// and redraws the page. The page on screen is drawn from the document, so what you see is what is saved.
import { History, clone, findItem, bounds, unionBounds, moveItem, resizeItem, reId, uid, frameOf, frameBox, drawnBounds, isTurned, turnItems, resizeInFrame, normAngle, toLocal, toPage, axes } from './model.js';
import { drawCrop, cropPointer, cropState, applyCrop, sameCrop, uncrop } from './crop.js';
import { readParas, applyRunStyle, applyParaStyle, styleAtCaret } from './text.js';
import { t } from '../i18n/index.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
// which way each handle pulls (degrees on the page, 0 = right, 90 = down) and the cursor for it once turned
const PULL = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
const cursorFor = (h, a) => ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][Math.round((((PULL[h] + a) % 180) + 180) % 180 / 45) % 4];
const RAD = Math.PI / 180;
const ownTurn = (n) => { const m = /rotate\((-?[\d.e-]+)deg\)/.exec(n.style.transform || ''); return m ? parseFloat(m[1]) : 0; };
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
    this.history.reset(); this.sel = []; this.editing = null; this.cropping = null; this.pageIndex = 0; this.app.updateToolbar?.();
    document.getElementById('desk')?.removeAttribute('aria-label');
  }

  // ---------------------------------------------------------------- selection
  // the thing you pick: a top-level item of the page (a whole group counts as one)
  unitOf(el) { const it = el?.closest?.('.page > .it'); return it ? it.dataset.group || it.dataset.id : null; }
  selectedItems() { const pg = this.page; return pg ? this.sel.map((id) => pg.items.find((it) => it.id === id)).filter(Boolean) : []; }
  select(ids, pageIndex = this.pageIndex) {
    if (this.editing) this.endEdit();
    if (this.cropping) this.endCrop();
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
    document.querySelectorAll('.pw-ui.cropui, .pw-ui.cropdone').forEach((n) => n.remove());
    const items = this.selectedItems(); if (!items.length || !this.pageEl) { this.cropping = null; return; }
    if (this.cropping) { // cutting the edges of a picture: its own marks instead of the frame
      if (items.length === 1 && items[0].id === this.cropping.id) { drawCrop(this, this.pageEl); return; }
      this.cropping = null;
    }
    // the frame: around one thing, turned with it; around several, upright
    const f = frameOf(items); if (!f) return;
    const box = document.createElement('div'); box.className = 'pw-ui sel' + (this.editing ? ' typing' : '');
    Object.assign(box.style, { left: `${f.cx - f.w / 2}pt`, top: `${f.cy - f.h / 2}pt`, width: `${Math.max(f.w, 0.1)}pt`, height: `${Math.max(f.h, 0.1)}pt` });
    if (f.a) box.style.transform = `rotate(${-f.a}deg)`;
    if (!this.editing) {
      for (const h of HANDLES) { const d = document.createElement('div'); d.className = `pw-ui handle h-${h}`; d.dataset.handle = h; if (f.a) d.style.cursor = cursorFor(h, -f.a); box.appendChild(d); }
      // the round handle above the frame: drag it to turn
      const r = document.createElement('div'); r.className = 'pw-ui rot'; r.dataset.handle = 'rot'; r.title = t('obj.turnHandle');
      box.appendChild(r);
    }
    this.pageEl.appendChild(box);
  }

  // ---------------------------------------------------------------- pointer: pick, move, resize
  pagePoint(e, pageEl) { const r = pageEl.getBoundingClientRect(), pg = pageEl.__page; return [((e.clientX - r.left) / r.width) * pg.w, ((e.clientY - r.top) / r.height) * pg.h]; }
  onPointerDown(e) {
    if (e.button !== 0 || !this.doc) return;
    const pageEl = e.target.closest('.page'); if (!pageEl) { if (!this.editing) this.clear(); return; }
    const pageIndex = this.app.pageEls.indexOf(pageEl);
    if (this.editing && this.editing.container.contains(e.target)) return; // clicking inside the text being typed
    if (this.cropping) { // a press anywhere else finishes cutting (and then does what it does)
      if (cropPointer(this, e, pageEl)) return;
      this.endCrop();
      if (!pageEl.isConnected) { // the page was drawn again: look again at what is under the pointer
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el) this.onPointerDown({ button: 0, target: el, clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey, preventDefault: () => e.preventDefault() });
        return;
      }
    }
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
    if (items.some((it) => it.locked)) return; // locked items stay where they are
    const start = this.pagePoint(e, pageEl), pg = this.page;
    const f0 = frameOf(items), b0 = frameBox(f0), turned = isTurned(items);
    // what is drawn for the picked things, with its own turn, so it can follow the pointer straight away
    const nodes = this.sel.flatMap((id) => this.nodesOf(id)).map((n) => ({ n, tf: n.style.transform, to: n.style.transformOrigin, own: ownTurn(n), l: parseFloat(n.style.left) || 0, t: parseFloat(n.style.top) || 0, w: parseFloat(n.style.width) || 0, h: parseFloat(n.style.height) || 0 }));
    const selBox = pageEl.querySelector('.pw-ui.sel');
    const zoomPx = pageEl.getBoundingClientRect().width / pg.w; // screen px per point
    const snapPx = 6 / zoomPx;
    const others = pg.items.filter((it) => !this.sel.includes(it.id)).map(drawnBounds);
    const extra = this.app.snapLines?.(pg) || { xs: [], ys: [] }; // layout guides, margins, columns
    const xs = [0, pg.w / 2, pg.w, ...extra.xs, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
    const ys = [0, pg.h / 2, pg.h, ...extra.ys, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
    let moved = false, result = null, turn = 0;
    const keepRatio = handle && handle.length === 2 && items.every((it) => it.type === 'image');
    // show a change of the frame on the page: m = [a, b, c, d] (as CSS matrix) around the frame's middle, then moved by dx, dy
    const preview = (dx, dy, m) => {
      for (const o of nodes) {
        const ncx = o.l + o.w / 2, ncy = o.t + o.h / 2;
        o.n.style.transformOrigin = `${f0.cx - o.l}pt ${f0.cy - o.t}pt`;
        o.n.style.transform = `translate(${dx}pt, ${dy}pt) matrix(${m.map((v) => +v.toFixed(6)).join(', ')}, 0, 0)` + (o.own ? ` translate(${ncx - f0.cx}pt, ${ncy - f0.cy}pt) rotate(${o.own}deg) translate(${f0.cx - ncx}pt, ${f0.cy - ncy}pt)` : '');
      }
    };
    const frameTo = (f) => { if (selBox) Object.assign(selBox.style, { left: `${f.cx - f.w / 2}pt`, top: `${f.cy - f.h / 2}pt`, width: `${Math.max(f.w, 0.1)}pt`, height: `${Math.max(f.h, 0.1)}pt`, transform: f.a ? `rotate(${-f.a}deg)` : '' }); };
    let label = null;
    const onMove = (ev) => {
      const [px, py] = this.pagePoint(ev, pageEl);
      const dx = px - start[0], dy = py - start[1];
      if (!moved && Math.hypot(dx * zoomPx, dy * zoomPx) < 3) return;
      moved = true;
      if (handle === 'rot') { // turning: by the angle the pointer went round the middle
        const at = (x, y) => Math.atan2(y - f0.cy, x - f0.cx);
        let want = f0.a - (at(px, py) - at(...start)) / RAD;
        want = Math.round(want * 10) / 10;
        if (ev.shiftKey) want = Math.round(want / 15) * 15;
        else { const q = Math.round(want / 90) * 90; if (Math.abs(want - q) < 2) want = q; } // upright and quarter turns pull a little
        turn = normAngle(want - f0.a);
        const p = -turn * RAD;
        preview(0, 0, [Math.cos(p), Math.sin(p), -Math.sin(p), Math.cos(p)]);
        frameTo({ ...f0, a: f0.a + turn });
        if (!label) { label = document.createElement('div'); label.className = 'pw-ui rotlabel'; label.appendChild(document.createElement('span')); pageEl.appendChild(label); }
        label.firstChild.textContent = `${Math.round(((-normAngle(want) % 360) + 360) % 360 * 10) / 10 % 360}°`;
        Object.assign(label.style, { left: `${px}pt`, top: `${py}pt` });
        return;
      }
      let f1;
      if (!handle) { // moving
        const nb = { ...b0, x: b0.x + dx, y: b0.y + dy };
        const sx = snap([nb.x, nb.x + nb.w / 2, nb.x + nb.w], xs, snapPx), sy = snap([nb.y, nb.y + nb.h / 2, nb.y + nb.h], ys, snapPx);
        if (!ev.altKey) { nb.x += sx.d; nb.y += sy.d; }
        this.guides(pageEl, ev.altKey ? null : sx.at, ev.altKey ? null : sy.at);
        result = nb; f1 = { ...f0, cx: f0.cx + nb.x - b0.x, cy: f0.cy + nb.y - b0.y };
        preview(nb.x - b0.x, nb.y - b0.y, [1, 0, 0, 1]);
        frameTo(f1); return;
      }
      if (!f0.a) { // an upright frame: its edges snap to guides and other things
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
        const nb = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(1, Math.abs(x1 - x0)), h: Math.max(b0.h ? 1 : 0, Math.abs(y1 - y0)) };
        f1 = { cx: nb.x + nb.w / 2, cy: nb.y + nb.h / 2, w: nb.w, h: nb.h, a: 0 }; result = nb;
      } else { // a turned frame: its edges move along its own sides; the opposite side stays put
        const [ex, ey] = axes(f0.a), du = dx * ex[0] + dy * ex[1], dv = dx * ey[0] + dy * ey[1];
        let l = -f0.w / 2, r = f0.w / 2, tp = -f0.h / 2, bt = f0.h / 2;
        if (handle.includes('w')) l += du; if (handle.includes('e')) r += du;
        if (handle.includes('n')) tp += dv; if (handle.includes('s')) bt += dv;
        if (keepRatio || ev.shiftKey) {
          const k = f0.w / (f0.h || 1), w = Math.abs(r - l), h = Math.abs(bt - tp);
          if (w / k > h) { const nh = w / k; if (handle.includes('n')) tp = bt - nh; else bt = tp + nh; } else { const nw = h * k; if (handle.includes('w')) l = r - nw; else r = l + nw; }
        }
        const w = Math.max(1, Math.abs(r - l)), h = Math.max(f0.h ? 1 : 0, Math.abs(bt - tp));
        const [cx, cy] = toPage(f0, [(l + r) / 2, (tp + bt) / 2]);
        f1 = { cx, cy, w, h, a: f0.a }; result = f1;
      }
      // show it straight away; the document changes when the pointer is let go
      const sx = f0.w ? f1.w / f0.w : 1, sy = f0.h ? f1.h / f0.h : 1, [ex, ey] = axes(f0.a);
      const A00 = sx * ex[0] * ex[0] + sy * ey[0] * ey[0], A01 = sx * ex[0] * ex[1] + sy * ey[0] * ey[1], A11 = sx * ex[1] * ex[1] + sy * ey[1] * ey[1];
      preview(f1.cx - f0.cx, f1.cy - f0.cy, [A00, A01, A01, A11]);
      frameTo(f1); this.resized = f1;
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      this.guides(pageEl, null, null); label?.remove();
    };
    const onUp = () => {
      stop();
      if (!moved) return;
      if (handle === 'rot') { if (turn) this.change('turn', () => turnItems(this.selectedItems(), turn, f0.cx, f0.cy)); else onCancel(); return; }
      if (!result) return;
      const f1 = this.resized; this.resized = null;
      this.change(handle ? 'resize' : 'move', () => {
        for (const it of this.selectedItems()) {
          if (!handle) moveItem(it, result.x - b0.x, result.y - b0.y);
          else { if (!turned && !f0.a) resizeItem(it, b0, result); else resizeInFrame(it, f0, f1); markEdited(it); }
        }
      });
    };
    const onCancel = () => { // the browser took over (e.g. scrolling on a touch screen): put things back
      stop(); for (const o of nodes) { o.n.style.transform = o.tf; o.n.style.transformOrigin = o.to; } this.drawSelection();
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
  undo() { if (this.editing) this.endEdit(); if (this.dropCrop()) return; if (this.history.undo(this.doc)) this.afterHistory(); }
  redo() { if (this.editing) this.endEdit(); if (this.dropCrop()) return; if (this.history.redo(this.doc)) this.afterHistory(); }
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
  // ---------------------------------------------------------------- cutting the edges of a picture (see crop.js)
  startCrop(id = this.sel[0]) {
    const it = this.selectedItems().find((x) => x.id === id);
    if (!it || it.type !== 'image' || !it.data || it.locked || !(it.w > 0 && it.h > 0)) return;
    if (this.editing) this.endEdit();
    this.cropping = { id, st: cropState(it), start: cropState(it) };
    this.drawSelection(); this.app.panel?.show(); this.app.updateToolbar?.();
  }
  // finish cropping: what was cut becomes one undo step
  endCrop() {
    const c = this.cropping; if (!c) return;
    this.cropping = null;
    const it = this.selectedItems().find((x) => x.id === c.id);
    if (it && !sameCrop(c.st, c.start)) this.change('crop', () => applyCrop(it, c.st));
    else { this.drawSelection(); this.app.panel?.show(); }
  }
  // undo while cropping: forget this crop (true), or just stop cropping when nothing was cut yet (false)
  dropCrop() {
    const c = this.cropping; if (!c) return false;
    this.cropping = null; this.drawSelection(); this.app.panel?.show();
    return !sameCrop(c.st, c.start);
  }
  resetCrop() {
    if (this.cropping) this.endCrop();
    const it = this.selectedItems()[0]; if (it?.type !== 'image' || !it.fx?.cut || it.locked) return;
    this.change('crop', () => uncrop(it));
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
    if (this.cropping && !['Shift', 'Control', 'Meta', 'Alt'].includes(k)) { // cutting a picture: Esc or Enter finishes
      if (k === 'Escape' || k === 'Enter') { e.preventDefault(); this.endCrop(); return; }
      if (!(isMod(e) && /^[zy]$/i.test(k))) this.endCrop();
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
