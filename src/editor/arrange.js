// Arranging: group and ungroup, line up, spread evenly, flip, turn by a quarter, lock in place.
// Everything goes through app.editor.change(), so each action is one undo step.
import { uid, moveItem, transformItem, turnItems, frameOf, frameBox, angleOf, normAngle, drawnBounds } from './model.js';
import { t } from '../i18n/index.js';

const picked = (app) => app.editor.selectedItems();

export function group(app) {
  const ed = app.editor, items = picked(app); if (items.length < 2) return;
  const ids = new Set(items.map((it) => it.id));
  const g = { type: 'group', id: uid('g'), items: [] };
  ed.change('group', () => {
    const list = ed.page.items;
    const top = Math.max(...list.map((it, i) => (ids.has(it.id) ? i : -1)));
    g.items = list.filter((it) => ids.has(it.id)); // keeps their order, front to back
    if (g.items.some((it) => it.locked)) g.locked = true;
    for (const it of g.items) delete it.locked;
    const out = [];
    list.forEach((it, i) => { if (!ids.has(it.id)) out.push(it); if (i === top) out.push(g); });
    ed.page.items = out;
  });
  ed.select([g.id]);
}

export function ungroup(app) {
  const ed = app.editor, groups = picked(app).filter((it) => it.type === 'group'); if (!groups.length) return;
  const freed = [];
  ed.change('ungroup', () => {
    const out = [];
    for (const it of ed.page.items) {
      if (!groups.includes(it)) { out.push(it); continue; }
      for (const c of it.items) { if (it.locked) c.locked = true; out.push(c); freed.push(c.id); }
    }
    ed.page.items = out;
  });
  ed.select([...picked(app).filter((it) => it.type !== 'group').map((it) => it.id), ...freed]);
}

// how: left | center | right | top | middle | bottom. One thing lines up with the page, several with each other.
export function align(app, how) {
  const ed = app.editor, items = picked(app); if (!items.length) return;
  const movable = items.filter((it) => !it.locked); if (!movable.length) { app.toast(t('pics.lockedNoMove')); return; }
  const pg = ed.page, ref = items.length === 1 ? { x: 0, y: 0, w: pg.w, h: pg.h } : frameBox(frameOf(items)); // (turned things: as drawn)
  ed.change('align', () => {
    for (const it of movable) {
      const b = drawnBounds(it); let dx = 0, dy = 0;
      if (how === 'left') dx = ref.x - b.x;
      if (how === 'center') dx = ref.x + ref.w / 2 - (b.x + b.w / 2);
      if (how === 'right') dx = ref.x + ref.w - (b.x + b.w);
      if (how === 'top') dy = ref.y - b.y;
      if (how === 'middle') dy = ref.y + ref.h / 2 - (b.y + b.h / 2);
      if (how === 'bottom') dy = ref.y + ref.h - (b.y + b.h);
      if (dx || dy) moveItem(it, dx, dy);
    }
  });
}

// axis 'h': the same space between things from left to right; 'v': from top to bottom
export function distribute(app, axis = 'h') {
  const ed = app.editor, items = picked(app); if (items.length < 3) return;
  const X = axis === 'h' ? 'x' : 'y', W = axis === 'h' ? 'w' : 'h';
  const list = items.map((it) => ({ it, b: drawnBounds(it) })).sort((a, b) => a.b[X] + a.b[W] / 2 - (b.b[X] + b.b[W] / 2));
  const first = list[0].b, last = list[list.length - 1].b;
  const span = last[X] + last[W] - first[X], used = list.reduce((s, e) => s + e.b[W], 0);
  const gap = (span - used) / (list.length - 1);
  ed.change('spread out', () => {
    let at = first[X];
    for (const { it, b } of list) {
      if (!it.locked && b[X] !== at) moveItem(it, axis === 'h' ? at - b.x : 0, axis === 'h' ? 0 : at - b.y);
      at += b[W] + gap;
    }
  });
}

// mirror one item around the line x = c (axis 'h') or y = c (axis 'v')
function flipItem(it, axis, c) {
  const f = axis === 'h' ? ([x, y]) => [2 * c - x, y] : ([x, y]) => [x, 2 * c - y];
  if (it.type === 'group') { it.items.forEach((k) => flipItem(k, axis, c)); if (it.rotate) it.rotate = -it.rotate; return; }
  if (it.type === 'shape') {
    transformItem(it, f, axis === 'h' ? [-1, 1] : [1, -1]);
    if (it.rotate) it.rotate = -it.rotate;
    if (it.fill?.type === 'gradient' && it.fill.style !== 'radial') it.fill = { ...it.fill, angle: axis === 'h' ? (360 - (it.fill.angle || 0)) % 360 : (540 - (it.fill.angle || 0)) % 360 };
    if (it.shadow) it.shadow = { ...it.shadow, ...(axis === 'h' ? { dx: -it.shadow.dx } : { dy: -it.shadow.dy }) };
  } else if (it.type === 'image') {
    transformItem(it, f); // moves it (and mirrors a cut-out shape)
    const key = axis === 'h' ? 'flipH' : 'flipV', fx = { ...(it.fx || {}) };
    if (fx[key]) delete fx[key]; else fx[key] = true;
    if (Object.keys(fx).length) it.fx = fx; else delete it.fx;
    if (it.rotate) it.rotate = -it.rotate;
  } else { // text and tables keep reading the right way round; only their place (and turn) is mirrored
    if (it.rotate) it.rotate = -it.rotate;
    const b = drawnBounds(it);
    if (axis === 'h') moveItem(it, 2 * c - (b.x + b.w / 2) - (b.x + b.w / 2), 0); else moveItem(it, 0, 2 * c - (b.y + b.h / 2) - (b.y + b.h / 2));
  }
}
const flippable = (it) => (it.type === 'group' ? it.items.some(flippable) : it.type === 'shape' || it.type === 'image');

export function flip(app, axis = 'h') {
  const ed = app.editor, items = picked(app).filter((it) => !it.locked); if (!items.length) return;
  if (!items.some(flippable)) { app.toast(t('pics.noFlipText')); return; }
  const b = frameBox(frameOf(items)), c = axis === 'h' ? b.x + b.w / 2 : b.y + b.h / 2;
  ed.change('flip', () => items.forEach((it) => flipItem(it, axis, c)));
}

// turn by deg (90: a quarter to the left, -90: to the right); several things turn together around their middle
export function rotate(app, deg = 90) {
  const ed = app.editor, items = picked(app).filter((it) => !it.locked); if (!items.length) return;
  const f = frameOf(items);
  ed.change('turn', () => turnItems(items, deg, f.cx, f.cy));
}
// turn each picked thing to exactly deg (to the left; 0 = upright), around its own middle
export function setAngle(app, deg) {
  const ed = app.editor, items = picked(app); if (!items.length) return;
  if (items.some((it) => it.locked)) { app.toast(t('pics.lockedNoMove')); app.panel?.show(); return; }
  const want = normAngle(deg);
  if (items.every((it) => Math.abs(normAngle(angleOf(it) - want)) < 0.01)) return;
  ed.change('turn', () => items.forEach((it) => { const f = frameOf([it]); turnItems([it], normAngle(want - angleOf(it)), f.cx, f.cy); }));
}

export function toggleLock(app) {
  const ed = app.editor, items = picked(app); if (!items.length) return;
  const lock = items.some((it) => !it.locked);
  ed.change(lock ? 'lock' : 'unlock', () => items.forEach((it) => { if (lock) it.locked = true; else delete it.locked; }));
  app.toast(t(lock ? 'pics.lockedToast' : 'pics.unlockedToast'));
}
