// The panel on the right: only the settings for what is picked (text, shape, picture), in plain words.
import { t } from '../i18n/index.js';
import { unionBounds } from './model.js';
import { retint } from '../templates/art.js';
import { SECTIONS } from './sections/index.js';
import { refreshDropCaps } from '../render.js';

const FONTS = ['Arial', 'Calibri', 'Cambria', 'Times New Roman', 'Georgia', 'Verdana', 'Garamond', 'Century Gothic', 'Gill Sans MT', 'Franklin Gothic Book', 'Trebuchet MS', 'Tahoma', 'Courier New', 'Comic Sans MS', 'Impact', 'Rockwell', 'Bookman Old Style', 'Book Antiqua', 'Brush Script MT', 'Lucida Handwriting', 'Edwardian Script ITC'];
// the text boxes among the items, also those inside groups (a box opened from a .pub file is grouped with its frame)
const textsIn = (list) => list.flatMap((it) => (it.type === 'group' ? textsIn(it.items || []) : it.type === 'text' ? [it] : []));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = {
  bold: '<b>B</b>', italic: '<i style="font-family:Georgia,serif">I</i>', underline: '<u>U</u>',
  left: '<svg viewBox="0 0 20 20"><path d="M3 5h14M3 9h9M3 13h14M3 17h9"/></svg>', center: '<svg viewBox="0 0 20 20"><path d="M3 5h14M6 9h8M3 13h14M6 17h8"/></svg>',
  right: '<svg viewBox="0 0 20 20"><path d="M3 5h14M8 9h9M3 13h14M8 17h9"/></svg>', justify: '<svg viewBox="0 0 20 20"><path d="M3 5h14M3 9h14M3 13h14M3 17h14"/></svg>',
};

export class Panel {
  constructor(app) { this.app = app; this.el = document.getElementById('side'); }
  get ed() { return this.app.editor; }
  // units shown to people: centimetres, or inches for US paper sizes
  get unit() { const pg = this.app.doc?.pages[0]; return pg && (Math.abs(pg.w - 612) < 2 || Math.abs(pg.w - 792) < 2) ? 'in' : 'cm'; }
  toUnit(ptv) { return this.unit === 'in' ? ptv / 72 : (ptv / 72) * 2.54; }
  fromUnit(v) { return this.unit === 'in' ? v * 72 : (v / 2.54) * 72; }

  show() {
    const ed = this.ed; if (!ed || !this.app.doc) return;
    const items = ed.selectedItems();
    if (!items.length && !ed.editing) { this.app.renderSide(); return; }
    const types = new Set(items.flatMap((it) => (it.type === 'group' ? ['group'] : [it.type])));
    const texts = textsIn(items);
    const textish = ed.editing || texts.length > 0 || types.has('table');
    const b = unionBounds(items);
    const u = this.unit, f = (v) => (Math.round(this.toUnit(v) * 100) / 100).toString();
    const shape = items.length === 1 && items[0].type === 'shape' ? items[0] : null;
    const pic = items.length === 1 && items[0].type === 'image' ? items[0] : null;
    // one text box, or a group holding one text box (with its frame): the box settings act on that box
    const box = items.length === 1 && (items[0].type === 'text' || (items[0].type === 'group' && texts.length === 1)) ? texts[0] : null;
    let html = '';
    if (textish) {
      html += `<h2>${esc(t('panel.text'))}</h2>
      <div class="prow"><select id="pFont" aria-label="${esc(t('panel.font'))}"></select></div>
      <div class="prow"><button class="pbtn" data-size="-1" aria-label="${esc(t('panel.smaller'))}">A−</button><input id="pSize" type="number" min="4" max="400" step="0.5" aria-label="${esc(t('panel.size'))}"><button class="pbtn" data-size="1" aria-label="${esc(t('panel.bigger'))}">A+</button>
        <label class="swatch" title="${esc(t('panel.textColor'))}"><input id="pColor" type="color" aria-label="${esc(t('panel.textColor'))}"><span>A</span></label></div>
      <div class="prow seg">${['bold', 'italic', 'underline'].map((k) => `<button class="pbtn" data-toggle="${k}" aria-pressed="false" aria-label="${esc(t('panel.' + k))}" title="${esc(t('panel.' + k))}">${ICON[k]}</button>`).join('')}
</div>
      <div class="prow seg">${['left', 'center', 'right', 'justify'].map((k) => `<button class="pbtn" data-align="${k}" aria-pressed="false" aria-label="${esc(t('panel.align.' + k))}" title="${esc(t('panel.align.' + k))}">${ICON[k]}</button>`).join('')}</div>
      ${ed.editing ? `<p class="hint">${esc(t('panel.typingHint'))}</p>` : `<p class="hint">${esc(t('panel.editHint'))}</p>`}`;
    }
    if (box && !ed.editing) {
      html += `<h2>${esc(t('panel.box'))}</h2>
      <div class="prow"><label class="field">${esc(t('panel.fill'))} <input id="pBoxFill" type="color" value="${esc(box.fill?.type === 'solid' ? box.fill.color : '#ffffff')}"></label>
        <label class="check"><input id="pBoxNoFill" type="checkbox"${box.fill ? '' : ' checked'}> ${esc(t('panel.none'))}</label></div>
      <div class="prow seg">${['top', 'middle', 'bottom'].map((k) => `<button class="pbtn wide" data-valign="${k}" aria-pressed="${(box.valign || 'top') === k}">${esc(t('panel.valign.' + k))}</button>`).join('')}</div>`;
    }
    if (shape) {
      const fillColor = shape.fill?.type === 'solid' ? shape.fill.color : '#f0874d';
      html += `<h2>${esc(t('panel.shape'))}</h2>
      <div class="prow"><label class="field">${esc(t('panel.fill'))} <input id="pFill" type="color" value="${esc(fillColor)}"></label>
        <label class="check"><input id="pNoFill" type="checkbox"${shape.fill ? '' : ' checked'}> ${esc(t('panel.none'))}</label></div>
      <div class="prow"><label class="field">${esc(t('panel.line'))} <input id="pLine" type="color" value="${esc(shape.stroke?.color || '#222222')}"></label>
        <label class="field">${esc(t('panel.thickness'))} <input id="pLineW" type="number" min="0" max="50" step="0.5" value="${shape.stroke ? Number(shape.stroke.width) || 0 : 0}"> pt</label></div>`;
      if (!shape.fill && ['polyline', 'path'].includes(shape.kind) && shape.stroke) {
        const now = (shape.stroke.arrowStart ? 1 : 0) + (shape.stroke.arrowEnd ? 2 : 0);
        html += `<div class="prow seg" role="group" aria-label="${esc(t('panel.arrows'))}" title="${esc(t('panel.arrows'))}">${[['none', 0], ['end', 2], ['start', 1], ['both', 3]].map(([k, v]) => `<button class="pbtn wide" data-arrow="${v}" aria-pressed="${now === v}">${esc(t('panel.arrow.' + k))}</button>`).join('')}</div>`;
      }
    }
    if (pic) {
      html += `<h2>${esc(t('panel.picture'))}</h2>
      <div class="prow"><button class="btn" id="pReplace">${esc(t(pic.data ? 'panel.replace' : 'panel.addPhoto'))}</button>${pic.tint ? `<label class="field">${esc(t('panel.iconColour'))} <input id="pTint" type="color" value="${esc(pic.tint)}"></label>` : ''}</div>`;
    }
    // sections added by newer features (pictures, arranging, text …); early ones come before position and size
    const ctx = { app: this.app, ed, items, editing: !!ed.editing, t, esc, panel: this };
    const extra = SECTIONS.filter((s) => { try { return s.when(ctx); } catch (err) { console.error(err); return false; } });
    const secHtml = (s) => { try { return `<div class="psec" data-sec="${s.id}">${s.html(ctx)}</div>`; } catch (err) { console.error(err); return ''; } };
    for (const s of extra) if (s.early) html += secHtml(s);
    if (b && !ed.editing) {
      html += `<h2>${esc(t('panel.position'))}</h2>
      <div class="pgrid">
        <label>${esc(t('panel.x'))}<input type="number" step="0.1" data-dim="x" value="${f(b.x)}"></label>
        <label>${esc(t('panel.y'))}<input type="number" step="0.1" data-dim="y" value="${f(b.y)}"></label>
        <label>${esc(t('panel.w'))}<input type="number" step="0.1" min="0.05" data-dim="w" value="${f(b.w)}"></label>
        <label>${esc(t('panel.h'))}<input type="number" step="0.1" min="0" data-dim="h" value="${f(b.h)}"></label>
      </div><p class="hint">${esc(t('panel.units.' + u))}</p>
      <h2>${esc(t('panel.arrange'))}</h2>
      <div class="prow wrap">
        <button class="btn" data-arrange="front">${esc(t('panel.front'))}</button><button class="btn" data-arrange="back">${esc(t('panel.back'))}</button>
        <button class="btn" data-act="duplicate">${esc(t('panel.duplicate'))}</button><button class="btn danger" data-act="delete">${esc(t('panel.delete'))}</button>
      </div>`;
    }
    for (const s of extra) if (!s.early) html += secHtml(s);
    this.el.innerHTML = html;
    this.el.hidden = false;
    this.wire(); this.refreshText();
    for (const s of extra) { const el = this.el.querySelector(`[data-sec="${s.id}"]`); if (el) try { s.wire(el, ctx); } catch (err) { console.error(err); } }
  }
  // the style of the selected text; for a group, of the first text box in it
  textState() {
    const s = this.ed.textState(); if (s || this.ed.editing) return s;
    const it = textsIn(this.ed.selectedItems())[0]; if (!it) return null;
    const run = it.paras.flatMap((p) => p.runs)[0];
    return { font: run?.font || 'Times New Roman', size: run?.size || 10, bold: !!run?.bold, italic: !!run?.italic, underline: !!run?.underline, color: run?.color || '#000000', align: it.paras[0]?.align || 'left' };
  }
  // the text settings follow the caret while typing
  refreshText() {
    const s = this.textState(); if (!s) return;
    const fontSel = this.el.querySelector('#pFont');
    if (fontSel) {
      const names = [...new Set([s.font, ...Object.keys(this.app.doc.fonts || {}), ...FONTS].filter(Boolean))];
      if (fontSel.dataset.list !== names.join('|')) { fontSel.innerHTML = names.map((n) => `<option>${esc(n)}</option>`).join(''); fontSel.dataset.list = names.join('|'); }
      fontSel.value = s.font || 'Arial';
    }
    const size = this.el.querySelector('#pSize'); if (size && document.activeElement !== size) size.value = s.size;
    const col = this.el.querySelector('#pColor'); if (col && s.color) { col.value = s.color; col.nextElementSibling.style.borderBottomColor = s.color; }
    this.el.querySelectorAll('[data-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(!!s[b.dataset.toggle])));
    this.el.querySelectorAll('[data-align]').forEach((b) => b.setAttribute('aria-pressed', String(s.align === b.dataset.align)));
  }
  wire() {
    const ed = this.ed, $ = (s) => this.el.querySelector(s);
    // while typing, a big first letter follows the new size or font of its paragraph's words
    const style = (patch) => { ed.textStyle(patch); if (ed.editing?.container && ('size' in patch || 'font' in patch)) refreshDropCaps(ed.editing.container); };
    // buttons must not take the caret out of the text being typed
    this.el.querySelectorAll('button').forEach((b) => b.addEventListener('mousedown', (e) => { if (ed.editing) e.preventDefault(); }));
    $('#pFont')?.addEventListener('change', (e) => style({ font: e.target.value }));
    $('#pSize')?.addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (v > 0) style({ size: v }); });
    this.el.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => { const s = this.textState(); if (!s) return; const v = Math.max(4, Math.round((s.size + (+b.dataset.size) * (s.size < 12 ? 1 : 2)) * 2) / 2); style({ size: v }); }));
    $('#pColor')?.addEventListener('change', (e) => ed.textStyle({ color: e.target.value }));
    this.el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const s = this.textState() || {}; ed.textStyle({ [b.dataset.toggle]: !s[b.dataset.toggle] }); }));
    this.el.querySelectorAll('[data-align]').forEach((b) => b.addEventListener('click', () => ed.textStyle({ align: b.dataset.align })));
    this.el.querySelectorAll('[data-valign]').forEach((b) => b.addEventListener('click', () => ed.setProps((it) => { if (it.type === 'text') { it.valign = b.dataset.valign; } }, 'align')));
    const boxFill = () => ed.setProps((it) => { if (it.type === 'text') it.fill = $('#pBoxNoFill').checked ? null : { type: 'solid', color: $('#pBoxFill').value, opacity: 1 }; }, 'fill');
    $('#pBoxFill')?.addEventListener('change', () => { $('#pBoxNoFill').checked = false; boxFill(); });
    $('#pBoxNoFill')?.addEventListener('change', boxFill);
    const shapeFill = () => ed.setProps((it) => { if (it.type === 'shape') it.fill = $('#pNoFill').checked ? null : { type: 'solid', color: $('#pFill').value, opacity: 1 }; }, 'fill');
    $('#pFill')?.addEventListener('change', () => { $('#pNoFill').checked = false; shapeFill(); });
    $('#pNoFill')?.addEventListener('change', shapeFill);
    const line = () => ed.setProps((it) => { if (it.type !== 'shape') return; const w = parseFloat($('#pLineW').value) || 0; it.stroke = w > 0 ? { ...(it.stroke || {}), color: $('#pLine').value, width: w } : null; }, 'line');
    $('#pLine')?.addEventListener('change', () => { if (!(parseFloat($('#pLineW').value) > 0)) $('#pLineW').value = 1; line(); });
    $('#pLineW')?.addEventListener('change', line);
    this.el.querySelectorAll('[data-arrow]').forEach((b) => b.addEventListener('click', () => ed.setProps((it) => {
      if (it.type !== 'shape' || !it.stroke) return; const v = +b.dataset.arrow;
      it.stroke = { ...it.stroke, arrowStart: v & 1 ? (it.stroke.arrowStart || { style: 1, size: 4 }) : undefined, arrowEnd: v & 2 ? (it.stroke.arrowEnd || { style: 1, size: 4 }) : undefined };
    }, 'arrows')));
    $('#pReplace')?.addEventListener('click', () => this.app.pickPicture((file) => this.app.replacePicture(file)));
    $('#pTint')?.addEventListener('change', (e) => ed.setProps((it) => { if (it.tint) retint(it, e.target.value); }, 'colour'));
    this.el.querySelectorAll('[data-dim]').forEach((inp) => inp.addEventListener('change', () => {
      const b = unionBounds(ed.selectedItems()); if (!b) return;
      const nb = { ...b }; const v = this.fromUnit(parseFloat(inp.value)); if (!Number.isFinite(v)) return;
      nb[inp.dataset.dim] = inp.dataset.dim === 'w' || inp.dataset.dim === 'h' ? Math.max(0.5, v) : v;
      ed.setBounds(nb);
    }));
    this.el.querySelectorAll('[data-arrange]').forEach((b) => b.addEventListener('click', () => ed.arrange(b.dataset.arrange)));
    $('[data-act="duplicate"]')?.addEventListener('click', () => ed.duplicate());
    $('[data-act="delete"]')?.addEventListener('click', () => ed.remove());
  }
}
