// Cutting the edges off a picture by hand ("Crop"). While cropping, the whole picture is shown with the part
// that will be cut off dimmed, and black marks on the edges of the part that stays: drag a mark to cut that
// edge, drag inside the frame to keep another part. Nothing changes in the document until cropping ends
// (Done, Esc, Enter or a press anywhere else): then it is one undo step. The cut is kept in it.fx.cut
// (see src/piccut.js); the item's box is the part that is left, so the picture never stretches.
// Everything is worked out in the picture's own axes (it may be turned), from the middle of its box.
import { toLocal, toPage, resizeItem, normAngle, frameBox } from './model.js';
import { shownCut } from '../piccut.js';
import { pictureSource } from '../images.js';
import { t } from '../i18n/index.js';

const MIN = 4; // the smallest part that can be left, in points
const MARKS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const PULL = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
const cursorFor = (h, a) => ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][Math.round((((PULL[h] + a) % 180) + 180) % 180 / 45) % 4];

// { c0: the box's middle, a: its turn, full: the whole picture, win: the part that stays } (rects in its own axes)
export function cropState(it) {
  const f = it.fx || {}, c = shownCut(f) || { l: 0, t: 0, r: 0, b: 0 };
  const FW = it.w / (1 - c.l - c.r), FH = it.h / (1 - c.t - c.b);
  return {
    c0: [it.x + it.w / 2, it.y + it.h / 2], a: normAngle(it.rotate || 0),
    full: { x: -it.w / 2 - c.l * FW, y: -it.h / 2 - c.t * FH, w: FW, h: FH },
    win: { x: -it.w / 2, y: -it.h / 2, w: it.w, h: it.h }, flipH: !!f.flipH, flipV: !!f.flipV,
  };
}
const near = (p, q) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(p[k] - q[k]) < 0.01);
export const sameCrop = (a, b) => near(a.full, b.full) && near(a.win, b.win);

// give the picture the box and cut of a crop state (the part that stays keeps its place on the page)
export function applyCrop(it, st) {
  const { full, win } = st, f0 = { cx: st.c0[0], cy: st.c0[1], a: st.a };
  const [cx, cy] = toPage(f0, [win.x + win.w / 2, win.y + win.h / 2]);
  const r5 = (v) => Math.max(0, Math.round(v * 1e5) / 1e5);
  const l = r5((win.x - full.x) / full.w), r = r5((full.x + full.w - win.x - win.w) / full.w);
  const tp = r5((win.y - full.y) / full.h), b = r5((full.y + full.h - win.y - win.h) / full.h);
  // the cut is kept in the picture's own edges (a picture turned over shows its right edge on the left)
  const cut = { left: st.flipH ? r : l, top: st.flipV ? b : tp, right: st.flipH ? l : r, bottom: st.flipV ? tp : b };
  resizeItem(it, { x: it.x, y: it.y, w: it.w, h: it.h }, { x: cx - win.w / 2, y: cy - win.h / 2, w: win.w, h: win.h }); // (a cut-out shape follows)
  const fx = { ...(it.fx || {}) };
  if (Object.values(cut).some((v) => v > 1e-4)) fx.cut = cut; else delete fx.cut;
  if (Object.keys(fx).length) it.fx = fx; else delete it.fx;
}
// the whole picture again, at the size it has now
export function uncrop(it) { const st = cropState(it); st.win = { ...st.full }; applyCrop(it, st); }

// ---------------------------------------------------------------- on the page
const pt = (v) => `${+v.toFixed(3)}pt`;
export function drawCrop(ed, pageEl) {
  const c = ed.cropping, it = ed.selectedItems()[0]; if (!c || !it) return;
  const anchor = document.createElement('div'); anchor.className = 'pw-ui cropui';
  const full = document.createElement('div'); full.className = 'crop-full'; full.dataset.crop = 'pan';
  const img = document.createElement('img'); img.alt = ''; img.draggable = false;
  const win = document.createElement('div'); win.className = 'crop-win'; win.dataset.crop = 'pan'; win.title = t('obj.cropMove');
  full.append(img, win);
  const frame = document.createElement('div'); frame.className = 'crop-frame';
  for (const h of MARKS) { const m = document.createElement('div'); m.className = `pw-ui ch ch-${h}`; m.dataset.crop = h; m.style.cursor = cursorFor(h, -c.st.a); frame.appendChild(m); }
  anchor.append(full, frame);
  const done = document.createElement('div'); done.className = 'pw-ui cropdone';
  const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = t('obj.cropDone'); done.appendChild(btn);
  pageEl.append(anchor, done);
  c.ui = { anchor, full, img, win, frame, done };
  const show = (url) => { img.src = url; if (c.st.flipH || c.st.flipV) img.style.transform = `scale(${c.st.flipH ? -1 : 1}, ${c.st.flipV ? -1 : 1})`; };
  if (c.url) show(c.url); else pictureSource(it).then((s) => { if (s.url && ed.cropping === c) { c.url = s.url; show(s.url); } });
  layout(c);
}
function layout(c) {
  const { anchor, full, win, frame, done } = c.ui, st = c.st;
  Object.assign(anchor.style, { left: pt(st.c0[0]), top: pt(st.c0[1]), transform: st.a ? `rotate(${-st.a}deg)` : '' });
  Object.assign(full.style, { left: pt(st.full.x), top: pt(st.full.y), width: pt(st.full.w), height: pt(st.full.h) });
  Object.assign(win.style, { left: pt(st.win.x - st.full.x), top: pt(st.win.y - st.full.y), width: pt(st.win.w), height: pt(st.win.h) });
  Object.assign(frame.style, { left: pt(st.win.x), top: pt(st.win.y), width: pt(st.win.w), height: pt(st.win.h) });
  // "Done" just under the part that stays, upright
  const f0 = { cx: st.c0[0], cy: st.c0[1], a: st.a }, [mx, my] = toPage(f0, [st.win.x + st.win.w / 2, st.win.y + st.win.h / 2]);
  const b = frameBox({ cx: mx, cy: my, w: st.win.w, h: st.win.h, a: st.a });
  Object.assign(done.style, { left: pt(b.x + b.w / 2), top: pt(b.y + b.h) });
}

// a press on the crop marks, the picture or "Done": true when it was one of them
export function cropPointer(ed, e, pageEl) {
  const c = ed.cropping, el = e.target.closest?.('.pw-ui.cropui [data-crop], .pw-ui.cropdone');
  if (!c || !el || !c.ui || !c.ui.anchor.isConnected) return false;
  e.preventDefault();
  if (el.closest('.cropdone')) { ed.endCrop(); return true; }
  const kind = el.dataset.crop, st = c.st, f0 = { cx: st.c0[0], cy: st.c0[1], a: st.a };
  const p0 = toLocal(f0, ed.pagePoint(e, pageEl)), win0 = { ...st.win }, full0 = { ...st.full };
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const onMove = (ev) => {
    const p = toLocal(f0, ed.pagePoint(ev, pageEl)), du = p[0] - p0[0], dv = p[1] - p0[1];
    if (kind === 'pan') { // slide the frame over the picture, to keep another part of it (the picture stays put)
      st.win = { ...win0, x: cl(win0.x + du, full0.x, full0.x + full0.w - win0.w), y: cl(win0.y + dv, full0.y, full0.y + full0.h - win0.h) };
    } else {
      let l = win0.x, r = win0.x + win0.w, tp = win0.y, b = win0.y + win0.h;
      const fr = full0.x + full0.w, fb = full0.y + full0.h, min = Math.min(MIN, win0.w), minH = Math.min(MIN, win0.h);
      if (kind.includes('w')) l = cl(l + du, full0.x, r - min);
      if (kind.includes('e')) r = cl(r + du, l + min, fr);
      if (kind.includes('n')) tp = cl(tp + dv, full0.y, b - minH);
      if (kind.includes('s')) b = cl(b + dv, tp + minH, fb);
      st.win = { x: l, y: tp, w: r - l, h: b - tp };
    }
    layout(c);
  };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  return true;
}
