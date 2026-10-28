// The "Picture" settings: how the picture looks (brightness, contrast, black and white, sepia, washout,
// shades of one colour, see-through), its frame (rounded corners, shadow, border, flips), the shape it is
// cut to, and a description for people who can't see it. Effects are kept in it.fx and drawn by src/picfx.js.
import { CROP_SHAPES, shapePoints, shapeIcon } from '../masks.js';
import { schemeColors } from '../../templates/schemes.js';
import { cssFilter } from '../../picfx.js';
import { cutOf } from '../../piccut.js';
import '../pics.css';

const SLIDERS = [
  { key: 'brightness', min: -100, max: 100, get: (f) => f.brightness || 0, set: (v) => ({ brightness: v }) },
  { key: 'contrast', min: -100, max: 100, get: (f) => f.contrast || 0, set: (v) => ({ contrast: v }) },
  { key: 'transparency', min: 0, max: 100, get: (f) => Math.round((1 - (f.opacity ?? 1)) * 100), set: (v) => ({ opacity: 1 - v / 100 }), unit: '%' },
];
const DEFAULTS = { brightness: 0, contrast: 0, grey: false, sepia: false, washout: false, recolor: null, opacity: 1, flipH: false, flipV: false, radius: 0, shadow: false, crop: null, cut: null };
const CROP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>';
const EXTRA_COLOURS = ['#1d4e89', '#2d6a4f', '#8e1b4f', '#7a4b1f', '#555555'];

// put a change into it.fx, leaving out settings that are back to normal
function setFx(it, patch) {
  const fx = { ...(it.fx || {}), ...patch };
  for (const [k, v] of Object.entries(fx)) if (v == null || v === DEFAULTS[k] || (k === 'opacity' && v >= 0.999)) delete fx[k];
  if (Object.keys(fx).length) it.fx = fx; else delete it.fx;
}

const picture = {
  id: 'picture',
  when: ({ items, editing }) => !editing && items.length === 1 && items[0].type === 'image',
  html({ items, t, esc, app }) {
    const it = items[0], f = it.fx || {}, has = !!it.data;
    const pressed = (on) => `aria-pressed="${on ? 'true' : 'false'}"`;
    const cropNow = f.crop || (it.points ? 'custom' : it.round ? 'oval' : 'none');
    let h = '';
    if (has) {
      const scheme = app.doc?.scheme ? Object.values(schemeColors(app.doc.scheme)).slice(0, 4) : [];
      const colours = [...new Set([...scheme, ...EXTRA_COLOURS])].slice(0, 7);
      const rec = (f.recolor || '').toLowerCase();
      h += `<h2>${esc(t('pics.look'))}</h2>
      ${SLIDERS.map((s) => { const v = Number(s.get(f)) || 0; return `<div class="pfx-sl"><label for="pfx-${s.key}">${esc(t('pics.' + s.key))}</label><output data-out="${s.key}">${v > 0 && s.min < 0 ? '+' : ''}${v}${s.unit || ''}</output>
        <input type="range" id="pfx-${s.key}" data-fx="${s.key}" min="${s.min}" max="${s.max}" step="5" value="${v}"></div>`; }).join('')}
      <div class="chips pfx-chips">${['grey', 'sepia', 'washout'].map((k) => `<button data-fxt="${k}" ${pressed(f[k])}>${esc(t('pics.' + k))}</button>`).join('')}</div>
      <p class="hint">${esc(t('pics.recolour'))}</p>
      <div class="prow pfx-swatches">${colours.map((c) => `<button class="sw" data-recolor="${c}" style="background:${c}" ${pressed(rec === c.toLowerCase())} title="${esc(t('pics.recolourTo'))} ${c}" aria-label="${esc(t('pics.recolourTo'))} ${c}"></button>`).join('')}
        <label class="sw" title="${esc(t('pics.otherColour'))}"><input type="color" data-recolor-pick value="${esc(f.recolor || '#1d4e89')}" aria-label="${esc(t('pics.otherColour'))}"></label>
        <button class="pbtn wide" data-recolor="" ${pressed(!f.recolor)}>${esc(t('pics.noColour'))}</button></div>
      <h2>${esc(t('pics.frame'))}</h2>
      <div class="pfx-sl"><label for="pfx-radius">${esc(t('pics.corners'))}</label><output data-out="radius">${Number(f.radius) || 0}%</output>
        <input type="range" id="pfx-radius" data-fx="radius" min="0" max="100" step="5" value="${Number(f.radius) || 0}"></div>
      <div class="prow"><label class="check"><input type="checkbox" data-fxc="shadow"${f.shadow ? ' checked' : ''}> ${esc(t('pics.shadow'))}</label></div>
      <div class="prow"><label class="field">${esc(t('pics.border'))} <input id="pfxLine" type="color" value="${esc(it.stroke?.color || '#222222')}"></label>
        <label class="field">${esc(t('panel.thickness'))} <input id="pfxLineW" type="number" min="0" max="50" step="0.5" value="${it.stroke ? Number(it.stroke.width) || 0 : 0}"> pt</label></div>
      <div class="prow wrap"><button class="btn" data-fxt="flipH" ${pressed(f.flipH)}>⇋ ${esc(t('pics.flipH'))}</button><button class="btn" data-fxt="flipV" ${pressed(f.flipV)}>⇵ ${esc(t('pics.flipV'))}</button></div>`;
    }
    if (has) { // cutting the edges off (plain crop)
      const on = app.editor?.cropping?.id === it.id, cut = !!cutOf(f);
      h += `<h2>${esc(t('obj.cropTitle'))}</h2>
      <div class="prow wrap pcrop"><button class="btn${on ? ' primary' : ''}" data-cropmode ${pressed(on)}${it.locked ? ' disabled' : ''}>${on ? '' : CROP_ICON}${esc(t(on ? 'obj.cropDone' : 'obj.crop'))}</button>
        <button class="btn" data-cropreset${cut && !it.locked ? '' : ' disabled'}>${esc(t('obj.cropReset'))}</button></div>
      <p class="hint">${esc(t(on ? 'obj.cropHintOn' : 'obj.cropHint'))}</p>`;
    }
    h += `<h2>${esc(t('pics.cropTitle'))}</h2>
      <div class="pfx-shapes">${['none', ...CROP_SHAPES].map((s) => `<button data-crop="${s}" ${pressed(cropNow === s)} title="${esc(t('pics.crop.' + s))}" aria-label="${esc(t('pics.crop.' + s))}">${shapeIcon(s)}</button>`).join('')}</div>`;
    if (has) {
      h += `<label class="pfx-alt" for="pfxAlt">${esc(t('pics.alt'))}</label>
      <textarea id="pfxAlt" class="pfx-alt-in" rows="2" placeholder="${esc(t('pics.altPlaceholder'))}">${esc(it.alt || '')}</textarea>
      <p class="hint">${esc(t('pics.altHint'))}</p>
      <div class="prow"><button class="btn" data-fxreset${it.adjust || Object.keys(f).some((k) => k !== 'cut') ? '' : ' disabled'}>${esc(t('pics.reset'))}</button></div>`;
    }
    return h;
  },
  wire(el, { ed, items }) {
    const it = items[0], f = it.fx || {};
    const apply = (fn, label = 'picture') => ed.setProps((x) => { if (x.type === 'image') fn(x); }, label);
    const node = () => ed.nodesOf(it.id).find((n) => n.classList.contains('pic'));
    // sliders: show the number (and a quick preview) while dragging, change the picture when let go
    el.querySelectorAll('[data-fx]').forEach((inp) => {
      const key = inp.dataset.fx, spec = SLIDERS.find((s) => s.key === key), out = el.querySelector(`[data-out="${key}"]`);
      inp.addEventListener('input', () => {
        const v = +inp.value; out.textContent = `${v > 0 && +inp.min < 0 ? '+' : ''}${v}${spec ? spec.unit || '' : '%'}`;
        const box = node(), img = box?.querySelector('img'); if (!img) return;
        if (key === 'brightness') img.style.filter = cssFilter({ brightness: v - (f.brightness || 0) });
        if (key === 'contrast') img.style.filter = cssFilter({ contrast: v - (f.contrast || 0) });
        if (key === 'transparency') img.style.opacity = String((1 - v / 100) / (f.opacity ?? 1));
        if (key === 'radius') box.style.borderRadius = `${(v / 100) * (Math.min(it.w, it.h) / 2)}pt`;
      });
      inp.addEventListener('change', () => { const v = +inp.value; apply((x) => setFx(x, spec ? spec.set(v) : { [key]: v })); });
    });
    el.querySelectorAll('[data-fxt]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.fxt, on = !f[k];
      apply((x) => setFx(x, k === 'grey' || k === 'sepia' ? { grey: false, sepia: false, [k]: on } : { [k]: on }));
    }));
    el.querySelectorAll('[data-recolor]').forEach((b) => b.addEventListener('click', () => apply((x) => {
      setFx(x, { recolor: b.dataset.recolor || null });
      if (!b.dataset.recolor && x.adjust?.recolor) { x.adjust = { ...x.adjust }; delete x.adjust.recolor; if (!Object.keys(x.adjust).length) delete x.adjust; }
    })));
    el.querySelector('[data-recolor-pick]')?.addEventListener('change', (e) => apply((x) => setFx(x, { recolor: e.target.value })));
    el.querySelector('[data-fxc="shadow"]')?.addEventListener('change', (e) => apply((x) => setFx(x, { shadow: e.target.checked })));
    const line = () => apply((x) => { const w = parseFloat(el.querySelector('#pfxLineW').value) || 0; x.stroke = w > 0 ? { color: el.querySelector('#pfxLine').value, width: w } : null; }, 'border');
    el.querySelector('#pfxLine')?.addEventListener('change', () => { const w = el.querySelector('#pfxLineW'); if (!(parseFloat(w.value) > 0)) w.value = 2; line(); });
    el.querySelector('#pfxLineW')?.addEventListener('change', line);
    el.querySelectorAll('[data-crop]').forEach((b) => b.addEventListener('click', () => apply((x) => {
      const s = b.dataset.crop;
      delete x.round;
      if (s === 'none') { delete x.points; setFx(x, { crop: null }); return; }
      x.points = shapePoints(s, x.x, x.y, x.w, x.h); setFx(x, { crop: s });
    }, 'shape')));
    el.querySelector('#pfxAlt')?.addEventListener('change', (e) => apply((x) => { const v = e.target.value.trim(); if (v) x.alt = v; else delete x.alt; }, 'description'));
    el.querySelector('[data-fxreset]')?.addEventListener('click', () => apply((x) => {
      if (x.fx?.crop) delete x.points;
      const cut = x.fx?.cut; // the cut edges stay (they have their own "Reset crop")
      delete x.fx; delete x.adjust;
      if (cut) x.fx = { cut };
    }, 'reset picture'));
    el.querySelector('[data-cropmode]')?.addEventListener('click', () => (ed.cropping ? ed.endCrop() : ed.startCrop(it.id)));
    el.querySelector('[data-cropreset]')?.addEventListener('click', () => ed.resetCrop());
  },
};

export default [picture];
