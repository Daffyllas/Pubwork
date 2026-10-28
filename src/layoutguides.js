// Layout guides: margins, columns and rows, a baseline grid for text, and guides people add and drag.
// Kept with the document as doc.guides = { margins:{t,b,l,r}, cols, rows, gutter, baseline:{step,offset}|null,
// lines:[{axis:'x'|'y', at}], show }. All in points from the page's top-left. They are drawn over each page as
// .pw-ui elements, which thumbnails, printing and every export leave out; things snap to them while dragging.
import { t } from './i18n/index.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// the guides of a document, filled in with sensible values (made the first time they are wanted)
export function ensureGuides(doc) {
  const g = (doc.guides ||= {});
  g.margins = { t: 36, b: 36, l: 36, r: 36, ...(g.margins || {}) };
  g.cols = Math.max(1, Math.round(num(g.cols, 1))); g.rows = Math.max(1, Math.round(num(g.rows, 1)));
  g.gutter = Math.max(0, num(g.gutter, 0)); g.lines ||= []; g.show ??= true;
  if (g.baseline && !(g.baseline.step > 0)) g.baseline = null;
  return g;
}

// where the lines fall on a page -> { box, xs, ys } (xs: up-and-down lines, ys: across lines)
function geometry(g, page) {
  const m = g.margins || {}, x0 = num(m.l), y0 = num(m.t), x1 = page.w - num(m.r), y1 = page.h - num(m.b);
  const xs = [], ys = [];
  if (x0 > 0) xs.push(x0); if (x1 < page.w) xs.push(x1);
  if (y0 > 0) ys.push(y0); if (y1 < page.h) ys.push(y1);
  const split = (a, b, n, gap, out) => {
    if (n < 2) return; const size = (b - a - (n - 1) * gap) / n; if (size <= 0) return;
    for (let i = 1; i < n; i++) { out.push(a + i * size + (i - 1) * gap); if (gap > 0) out.push(a + i * (size + gap)); }
  };
  split(x0, x1, g.cols | 0, num(g.gutter), xs);
  split(y0, y1, g.rows | 0, num(g.gutter), ys);
  return { box: { x0, y0, x1, y1 }, xs, ys };
}

// extra lines to snap to on a page: { xs: [points], ys: [points] }
export function snapLines(app, page) {
  const g = app?.doc?.guides; if (!g || !g.show || !page) return { xs: [], ys: [] };
  const geo = geometry(g, page);
  for (const l of g.lines || []) (l.axis === 'x' ? geo.xs : geo.ys).push(l.at);
  return { xs: geo.xs, ys: geo.ys };
}

// ------------------------------------------------------------------ drawing them over the pages
export function drawGuides(app, pageEl, page) {
  if (!pageEl) return;
  pageEl.querySelectorAll(':scope > .pw-ui.lg').forEach((n) => n.remove());
  const g = app.doc?.guides; if (!g || !g.show || !page) return;
  const geo = geometry(g, page), b = geo.box;
  const layer = document.createElement('div'); layer.className = 'pw-ui lg'; layer.setAttribute('aria-hidden', 'true');
  const add = (cls, css) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css); layer.appendChild(d); return d; };
  if (g.baseline?.step > 0) {
    const s = g.baseline.step, first = num(g.baseline.offset, s);
    // one line every `step` points, starting at `offset` from the top of the page, inside the margins
    const top = first >= b.y0 ? first : first + Math.ceil((b.y0 - first) / s) * s;
    if (top < b.y1) add('lg-base', { left: `${b.x0}pt`, width: `${Math.max(0, b.x1 - b.x0)}pt`, top: `${top}pt`, height: `${b.y1 - top}pt`, backgroundSize: `100% ${s}pt` });
  }
  if (b.x1 > b.x0 && b.y1 > b.y0 && (b.x0 > 0 || b.y0 > 0 || b.x1 < page.w || b.y1 < page.h)) add('lg-margin', { left: `${b.x0}pt`, top: `${b.y0}pt`, width: `${b.x1 - b.x0}pt`, height: `${b.y1 - b.y0}pt` });
  const cx = geo.xs.filter((x) => x !== b.x0 && x !== b.x1), cy = geo.ys.filter((y) => y !== b.y0 && y !== b.y1);
  for (const x of cx) add('lg-col v', { left: `${x}pt`, top: `${b.y0}pt`, height: `${b.y1 - b.y0}pt` });
  for (const y of cy) add('lg-col h', { top: `${y}pt`, left: `${b.x0}pt`, width: `${b.x1 - b.x0}pt` });
  (g.lines || []).forEach((l, i) => {
    const d = add(`lg-line ${l.axis === 'x' ? 'v' : 'h'}`, l.axis === 'x' ? { left: `${l.at}pt` } : { top: `${l.at}pt` });
    d.title = t('guides.lineTitle'); d.dataset.i = i;
    d.addEventListener('pointerdown', (e) => dragLine(e, app, pageEl, page, i, d));
  });
  pageEl.appendChild(layer);
}
export function drawAllGuides(app) { (app.pageEls || []).forEach((el) => drawGuides(app, el, el.__page)); }

// a guide is moved by dragging it; dragging it off the page removes it
function dragLine(e, app, pageEl, page, i, el) {
  if (e.button !== 0) return;
  e.stopPropagation(); e.preventDefault(); // the editor doesn't pick what is under the guide
  const g = app.doc.guides, l = g.lines[i]; if (!l) return;
  const pos = (ev) => { const r = pageEl.getBoundingClientRect(); return l.axis === 'x' ? ((ev.clientX - r.left) / r.width) * page.w : ((ev.clientY - r.top) / r.height) * page.h; };
  const size = l.axis === 'x' ? page.w : page.h;
  let at = l.at;
  el.classList.add('dragging');
  const move = (ev) => { at = Math.round(pos(ev) * 2) / 2; el.style[l.axis === 'x' ? 'left' : 'top'] = `${at}pt`; el.classList.toggle('off', at < 0 || at > size); };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    if (at < 0 || at > size) g.lines.splice(i, 1); else l.at = at;
    drawAllGuides(app); app.touched?.(); renderPanel(app);
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}

// ------------------------------------------------------------------ the "Layout guides" panel
export function openGuides(app) {
  if (!app.doc) return;
  const fresh = !app.doc.guides?.show;
  ensureGuides(app.doc).show = true;
  let p = $('guidesPanel');
  if (!p) {
    p = document.createElement('div'); p.id = 'guidesPanel'; p.className = 'panel lg-panel';
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'false'); p.setAttribute('aria-labelledby', 'lgTitle');
    document.body.appendChild(p);
  }
  $('mastersPanel')?.setAttribute('hidden', '');
  p.hidden = false;
  if (fresh) { drawAllGuides(app); app.touched?.(); }
  renderPanel(app);
  p.querySelector('input')?.focus({ preventScroll: true });
}
export function setShow(app, on) {
  const g = ensureGuides(app.doc); g.show = !!on;
  drawAllGuides(app); app.touched?.(); renderPanel(app);
}

export function renderPanel(app) {
  const p = $('guidesPanel'); if (!p || p.hidden) return;
  if (!app.doc) { p.hidden = true; return; }
  const g = ensureGuides(app.doc), P = app.panel, f = (v) => +P.toUnit(v).toFixed(2), step = P.unit === 'in' ? 0.05 : 0.1;
  const field = (id, label, v, extra = '') => `<label>${esc(label)}<input type="number" id="${id}" step="${step}" min="0" value="${f(v)}"${extra}></label>`;
  const m = g.margins, bl = g.baseline;
  const lines = g.lines.map((l, i) => `<div class="lg-row"><span>${esc(t(l.axis === 'x' ? 'guides.lineX' : 'guides.lineY'))}</span><input type="number" step="${step}" data-line="${i}" value="${f(l.at)}" aria-label="${esc(t(l.axis === 'x' ? 'guides.lineX' : 'guides.lineY'))}"><button type="button" class="pbtn" data-del="${i}" title="${esc(t('guides.remove'))}" aria-label="${esc(t('guides.remove'))}">×</button></div>`).join('');
  p.innerHTML = `<h2 id="lgTitle">${esc(t('guides.title'))}</h2>
    <p class="hint">${esc(t('guides.hint'))}</p>
    <label class="check"><input type="checkbox" id="lgShow"${g.show ? ' checked' : ''}> ${esc(t('guides.show'))}</label>
    <fieldset><legend>${esc(t('guides.margins'))}</legend>
      <div class="pgrid">${field('lgT', t('guides.top'), m.t)}${field('lgB', t('guides.bottom'), m.b)}${field('lgL', t('guides.left'), m.l)}${field('lgR', t('guides.right'), m.r)}</div>
      <p class="hint">${esc(t('panel.units.' + P.unit))}</p></fieldset>
    <fieldset><legend>${esc(t('guides.grid'))}</legend>
      <div class="pgrid three"><label>${esc(t('guides.cols'))}<input type="number" id="lgCols" min="1" max="24" step="1" value="${g.cols}"></label><label>${esc(t('guides.rows'))}<input type="number" id="lgRows" min="1" max="24" step="1" value="${g.rows}"></label>${field('lgGut', t('guides.gutter'), g.gutter)}</div></fieldset>
    <fieldset><legend>${esc(t('guides.baseline'))}</legend>
      <label class="check"><input type="checkbox" id="lgBase"${bl ? ' checked' : ''}> ${esc(t('guides.baseOn'))}</label>
      ${bl ? `<div class="pgrid">${field('lgStep', t('guides.step'), bl.step, ' min="0.5"')}${field('lgOff', t('guides.offset'), bl.offset ?? bl.step)}</div>` : ''}</fieldset>
    <fieldset><legend>${esc(t('guides.lines'))}</legend>
      ${lines || `<p class="hint">${esc(t('guides.noLines'))}</p>`}
      <div class="prow wrap"><button class="btn" type="button" id="lgAddX">${esc(t('guides.addX'))}</button><button class="btn" type="button" id="lgAddY">${esc(t('guides.addY'))}</button></div>
      <p class="hint">${esc(t('guides.dragHint'))}</p></fieldset>
    <div class="actions"><button class="btn danger" type="button" id="lgClear">${esc(t('guides.clear'))}</button><button class="btn primary" type="button" id="lgClose">${esc(t('guides.close'))}</button></div>`;
  const changed = (redrawPanel = false) => { drawAllGuides(app); app.touched?.(); if (redrawPanel) renderPanel(app); };
  const pt = (id) => Math.max(0, P.fromUnit(num($(id).value)));
  $('lgShow').onchange = () => { g.show = $('lgShow').checked; changed(); };
  for (const [id, k] of [['lgT', 't'], ['lgB', 'b'], ['lgL', 'l'], ['lgR', 'r']]) $(id).oninput = () => { g.margins[k] = pt(id); changed(); };
  $('lgCols').oninput = () => { g.cols = Math.max(1, Math.min(24, Math.round(num($('lgCols').value, 1)))); changed(); };
  $('lgRows').oninput = () => { g.rows = Math.max(1, Math.min(24, Math.round(num($('lgRows').value, 1)))); changed(); };
  $('lgGut').oninput = () => { g.gutter = pt('lgGut'); changed(); };
  $('lgBase').onchange = () => { g.baseline = $('lgBase').checked ? { step: 12, offset: g.margins.t + 12 } : null; changed(true); };
  if ($('lgStep')) $('lgStep').oninput = () => { const s = pt('lgStep'); if (s >= 0.5) { g.baseline.step = s; changed(); } };
  if ($('lgOff')) $('lgOff').oninput = () => { g.baseline.offset = pt('lgOff'); changed(); };
  p.querySelectorAll('[data-line]').forEach((inp) => { inp.oninput = () => { const l = g.lines[+inp.dataset.line]; if (l && Number.isFinite(+inp.value)) { l.at = P.fromUnit(+inp.value); changed(); } }; });
  p.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { g.lines.splice(+b.dataset.del, 1); changed(true); }; });
  const page = () => app.doc.pages[app.current || 0];
  $('lgAddX').onclick = () => { g.lines.push({ axis: 'x', at: Math.round(page().w / 2) }); g.show = true; changed(true); };
  $('lgAddY').onclick = () => { g.lines.push({ axis: 'y', at: Math.round(page().h / 2) }); g.show = true; changed(true); };
  $('lgClear').onclick = () => { app.doc.guides = { margins: { t: 0, b: 0, l: 0, r: 0 }, cols: 1, rows: 1, gutter: 0, baseline: null, lines: [], show: true }; changed(true); };
  $('lgClose').onclick = () => { p.hidden = true; };
}

// the part of the page panel on the right (nothing picked)
export function sideHtml(app) {
  const g = app.doc.guides;
  return `<h2>${esc(t('guides.sideTitle'))}</h2>
    <div class="prow wrap"><label class="check"><input type="checkbox" id="lgSideShow"${g?.show ? ' checked' : ''}> ${esc(t('guides.show'))}</label><button class="btn" type="button" id="lgSideOpen">${esc(t('guides.open'))}</button></div>`;
}
export function wireSide(app) {
  const c = $('lgSideShow'); if (c) c.onchange = () => setShow(app, c.checked);
  const o = $('lgSideOpen'); if (o) o.onclick = () => openGuides(app);
}
