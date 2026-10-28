// Moving pages by dragging their pictures in the page strip: with a mouse or pen straight away, on a touch screen
// after holding a finger on the page for a moment (so a quick swipe still scrolls the strip). A line shows where
// the page will go. With the keyboard: Alt+Up / Alt+Down on a focused page picture; Up / Down go to the next one.
import { t } from './i18n/index.js';
import './pagedrag.css';

let app = null;
const HOLD = 350; // ms a finger rests on a page before it can be dragged
const thumbsOf = (box) => [...box.querySelectorAll(':scope > .thumb')];

// keys on a page picture. Listened to before the editor does (this file loads first), so the arrows don't also move
// whatever is picked on the page.
window.addEventListener('keydown', (e) => {
  const th = e.target?.closest?.('#thumbs > .thumb'); if (!th || !app?.doc || e.ctrlKey || e.metaKey) return;
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault(); e.stopImmediatePropagation();
  const box = th.parentElement, list = thumbsOf(box), i = list.indexOf(th), d = e.key === 'ArrowUp' ? -1 : 1;
  if (e.altKey) app.movePageTo(i, i + d, { keyboard: true });
  else list[i + d]?.focus();
}, true);

// called each time the page strip is drawn
export function wireThumbs(theApp, box) {
  app = theApp;
  const list = thumbsOf(box), many = list.length > 1;
  list.forEach((b) => {
    if (!many) return;
    b.title = t('thumb.dragHint');
    b.addEventListener('pointerdown', (e) => press(box, b, e));
  });
  if (box.__dragWired) return;
  box.__dragWired = true;
  // while a page is being dragged, a finger moves the page and does not scroll the strip
  box.addEventListener('touchmove', (e) => { if (drag?.on) e.preventDefault(); }, { passive: false });
  box.addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); });
  // the click that ends a drag does not also open the page
  box.addEventListener('click', (e) => { if (box.__noClick) { e.stopPropagation(); e.preventDefault(); } }, true);
}
export const dragging = () => !!drag?.on;

let drag = null;
function press(box, b, e) {
  if (e.button !== 0 || drag || !app?.doc) return;
  const from = thumbsOf(box).indexOf(b); if (from < 0) return;
  const touch = e.pointerType === 'touch';
  drag = { box, b, from, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false, touch: false, to: from };
  if (touch) drag.timer = setTimeout(() => { if (drag && !drag.on) { drag.touch = true; begin(); } }, HOLD);
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', esc, true);
}
function move(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX; drag.y = e.clientY;
  const far = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
  if (!drag.on) {
    if (e.pointerType === 'touch') { if (far > 8) stop(); return; } // a swipe: the strip scrolls as usual
    if (far < 6) return;
    begin();
  }
  e.preventDefault();
  follow();
}
function begin() {
  const d = drag; d.on = true;
  document.body.classList.add('pw-pagedrag');
  d.b.classList.add('dragging');
  const mini = d.b.querySelector('.mini');
  if (mini) {
    const r = mini.getBoundingClientRect(), g = mini.cloneNode(true);
    g.className = 'mini pw-dragghost'; g.style.width = `${r.width * 0.8}px`; g.style.height = `${r.height * 0.8}px`;
    const inner = g.firstElementChild; if (inner) inner.style.transform = `${inner.style.transform} scale(0.8)`;
    document.body.appendChild(g); d.ghost = g;
  }
  d.line = document.createElement('div'); d.line.className = 'pw-dropline'; d.line.setAttribute('aria-hidden', 'true'); document.body.appendChild(d.line);
  d.scroll = () => { // near the top or bottom of the strip, it scrolls
    if (!drag?.on) return;
    const br = d.box.getBoundingClientRect(), edge = 44;
    const v = d.y < br.top + edge ? -Math.ceil((br.top + edge - d.y) / 4) : d.y > br.bottom - edge ? Math.ceil((d.y - br.bottom + edge) / 4) : 0;
    if (v) { d.box.scrollTop += v; follow(); }
    d.raf = requestAnimationFrame(d.scroll);
  };
  d.raf = requestAnimationFrame(d.scroll);
  follow();
}
// where the page would go: before the first page picture whose middle is below the pointer
function follow() {
  const d = drag; if (!d?.on) return;
  if (d.ghost) Object.assign(d.ghost.style, { left: `${d.x}px`, top: `${d.y}px` });
  const list = thumbsOf(d.box); if (!list.length) return;
  let k = list.findIndex((th) => { const r = th.getBoundingClientRect(); return d.y < r.top + r.height / 2; });
  if (k < 0) k = list.length;
  d.to = k > d.from ? k - 1 : k; // the place it ends up in, once taken out of where it was
  const br = d.box.getBoundingClientRect();
  const y = k < list.length ? list[k].getBoundingClientRect().top - 7 : list[list.length - 1].getBoundingClientRect().bottom + 5;
  const show = d.to !== d.from && y > br.top - 4 && y < br.bottom + 4;
  Object.assign(d.line.style, { display: show ? 'block' : 'none', left: `${br.left + 10}px`, width: `${Math.max(20, d.box.clientWidth - 20)}px`, top: `${y - 1.5}px` });
}
function up(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag, moved = d.on && d.to !== d.from;
  if (d.on) { d.box.__noClick = true; setTimeout(() => { d.box.__noClick = false; }, 0); }
  stop();
  if (moved) app.movePageTo(d.from, d.to);
}
function cancel(e) { if (drag && (!e || e.pointerId === drag.id)) stop(); }
function esc(e) { if (drag?.on && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(); } }
function stop() {
  const d = drag; if (!d) return;
  drag = null;
  clearTimeout(d.timer); cancelAnimationFrame(d.raf);
  window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
  window.removeEventListener('keydown', esc, true);
  d.ghost?.remove(); d.line?.remove(); d.b.classList.remove('dragging');
  document.body.classList.remove('pw-pagedrag');
  if (app?._thumbsWaiting) { app._thumbsWaiting = false; app.renderThumbs(); } // the strip was not redrawn during the drag
}
