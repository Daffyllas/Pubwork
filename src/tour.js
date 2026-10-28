// A short guided tour for people coming from Publisher: where things are now. Each step lights up one part
// of the screen and says what it is in a bubble. Next / Back / Close, Esc closes, arrow keys move.
import { t } from './i18n/index.js';
import { blankDocument, uid } from './editor/model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shown = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const pick = (...sels) => { for (const s of sels) { const el = document.querySelector(s); if (shown(el)) return [el]; } return []; };
const all = (...sels) => sels.map((s) => document.querySelector(s)).filter(shown);

const STEPS = [
  { key: 'pages', at: () => pick('#thumbs', '#pages .page') },
  { key: 'text', at: () => pick('#pages .page .it.text:not(.from-master)', '#pages .page') },
  { key: 'insert', at: () => all('#tPic', '#tShape', '#tTable', '#tWordArt') },
  { key: 'blocks', at: () => pick('#tBlocks') },
  { key: 'merge', at: () => pick('#tMerge') },
  { key: 'print', at: () => pick('#bPrint') },
  { key: 'save', at: () => all('#bKeep', '#bSave') },
  { key: 'more', at: () => pick('#tMore') },
];
const remember = () => { try { localStorage.setItem('pw-toured', '1'); } catch { /* fine without */ } };
const toured = () => { try { return !!localStorage.getItem('pw-toured'); } catch { return true; } };

let tour = null;
export function startTour(app) {
  remember(); hideOffer();
  if (tour) return;
  if (!app.doc) { // the tour needs the editor on screen: start with an empty page
    const us = /^en-(us|ca)|^es-(mx|us)/i.test(navigator.language || '');
    const doc = blankDocument(us ? 'letter' : 'a4', t('new.untitled')); doc.uid = uid('d');
    app.show(doc);
  }
  app.closeMenu?.();
  if (app.editor?.editing) app.editor.endEdit();
  const catcher = document.createElement('div'); catcher.className = 'tour-catch';
  const hole = document.createElement('div'); hole.className = 'tour-hole';
  const bub = document.createElement('div'); bub.className = 'tour-bubble';
  bub.setAttribute('role', 'dialog'); bub.setAttribute('aria-modal', 'true'); bub.setAttribute('aria-labelledby', 'tourTitle'); bub.setAttribute('aria-describedby', 'tourText');
  document.body.append(catcher, hole, bub);
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(tour.i + 1);
    else if (e.key === 'ArrowLeft') go(tour.i - 1);
    else return;
    e.preventDefault(); e.stopPropagation();
  };
  const place = () => tour && layout();
  window.addEventListener('keydown', onKey, true); window.addEventListener('resize', place);
  tour = { i: 0, catcher, hole, bub, onKey, place };
  const close = () => {
    if (!tour) return;
    window.removeEventListener('keydown', tour.onKey, true); window.removeEventListener('resize', tour.place);
    catcher.remove(); hole.remove(); bub.remove(); tour = null;
  };
  const go = (i) => {
    if (i >= STEPS.length) { close(); return; }
    tour.i = Math.max(0, i);
    const s = STEPS[tour.i], n = STEPS.length;
    bub.innerHTML = `<small class="tour-count">${esc(t('tour.count', { i: tour.i + 1, n }))}</small><h3 id="tourTitle">${esc(t('tour.t.' + s.key))}</h3><p id="tourText">${esc(t('tour.' + s.key))}</p>
      <div class="tour-acts"><button type="button" class="btn tour-x">${esc(t('tour.close'))}</button><span class="spacer"></span>${tour.i ? `<button type="button" class="btn tour-back">${esc(t('tour.back'))}</button>` : ''}<button type="button" class="btn primary tour-next">${esc(t(tour.i === n - 1 ? 'tour.finish' : 'tour.next'))}</button></div>`;
    bub.querySelector('.tour-x').onclick = close;
    bub.querySelector('.tour-next').onclick = () => go(tour.i + 1);
    const back = bub.querySelector('.tour-back'); if (back) back.onclick = () => go(tour.i - 1);
    layout(true);
    bub.querySelector('.tour-next').focus({ preventScroll: true });
  };
  go(0);
}

// light up the step's part of the screen and put the bubble next to it
function layout(scroll = false) {
  const { hole, bub, catcher } = tour, els = STEPS[tour.i].at();
  if (scroll) els.forEach((e) => e.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }));
  const vw = innerWidth, vh = innerHeight, pad = 6, gap = 12;
  let r = null;
  for (const e of els) {
    const b = e.getBoundingClientRect();
    const c = { left: Math.max(0, b.left), top: Math.max(0, b.top), right: Math.min(vw, b.right), bottom: Math.min(vh, b.bottom) };
    if (c.right <= c.left || c.bottom <= c.top) continue;
    r = r ? { left: Math.min(r.left, c.left), top: Math.min(r.top, c.top), right: Math.max(r.right, c.right), bottom: Math.max(r.bottom, c.bottom) } : c;
  }
  catcher.classList.toggle('dim', !r); hole.hidden = !r;
  const bw = Math.min(330, vw - 24); bub.style.width = `${bw}px`;
  const bh = bub.offsetHeight;
  const clampX = (x) => Math.max(12, Math.min(vw - bw - 12, x)), clampY = (y) => Math.max(12, Math.min(vh - bh - 12, y));
  if (!r) { bub.style.left = `${(vw - bw) / 2}px`; bub.style.top = `${(vh - bh) / 2}px`; return; }
  r = { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad };
  Object.assign(hole.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
  const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  let x, y;
  if (r.bottom + gap + bh <= vh) { x = clampX(cx - bw / 2); y = r.bottom + gap; } // below
  else if (r.top - gap - bh >= 0) { x = clampX(cx - bw / 2); y = r.top - gap - bh; } // above
  else if (r.right + gap + bw <= vw) { x = r.right + gap; y = clampY(cy - bh / 2); } // right
  else if (r.left - gap - bw >= 0) { x = r.left - gap - bw; y = clampY(cy - bh / 2); } // left
  else { x = clampX(cx - bw / 2); y = vh - bh - 16; } // a big area: over it, at the bottom
  bub.style.left = `${x}px`; bub.style.top = `${y}px`;
}

// ------------------------------------------------------------------ inviting people to take it
// a small link on the start screen
export function addTourLink(app) {
  const samples = document.querySelector('#start .samples'); if (!samples || document.getElementById('tourLink')) return;
  const p = document.createElement('p'); p.className = 'tour-link';
  p.innerHTML = `<button type="button" id="tourLink" data-t="tour.link">${esc(t('tour.link'))}</button>`;
  samples.after(p);
  p.querySelector('button').onclick = () => startTour(app);
}
// once, after the first document opens
export function offerTour(app) {
  if (toured() || app.convert || document.querySelector('.tour-offer')) return;
  remember();
  const box = document.createElement('div'); box.className = 'tour-offer'; box.setAttribute('role', 'status');
  box.innerHTML = `<button type="button" class="tour-go">${esc(t('tour.offer'))}</button><button type="button" class="tour-no" title="${esc(t('tour.no'))}" aria-label="${esc(t('tour.no'))}">×</button>`;
  const fname = document.getElementById('fname');
  (fname ? fname.after(box) : document.body.appendChild(box));
  box.querySelector('.tour-go').onclick = () => startTour(app);
  box.querySelector('.tour-no').onclick = hideOffer;
  setTimeout(hideOffer, 20000);
  // any other click means "not now": the offer must never sit over buttons people want
  const away = (e) => { if (!box.contains(e.target)) { hideOffer(); document.removeEventListener('pointerdown', away, true); } };
  setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
}
function hideOffer() { document.querySelectorAll('.tour-offer').forEach((n) => n.remove()); }
