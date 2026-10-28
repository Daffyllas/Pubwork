// WordArt: shaped, outlined, coloured headings, drawn as paths. id = the WordArt item to change, or null for a new one.
// The result is an ordinary path shape ({ type: 'shape', kind: 'path', d, fill, stroke, shadow }) with the
// settings kept in it.wordart, so it shows, prints and exports like any other shape and can be edited again.
import { t } from '../i18n/index.js';
import { cssFamily } from '../fonts.js';
import { findItem } from '../editor/model.js';
import { fontPair } from '../templates/schemes.js';
import { textOutlines } from './outline.js';
import { WARPS, applyWarp, toPath } from './warp.js';
import { PRESETS, LINES, presetLook } from './presets.js';
import './wordart.css';

const FONTS = ['Arial', 'Arial Black', 'Calibri', 'Cambria', 'Times New Roman', 'Georgia', 'Verdana', 'Garamond', 'Century Gothic', 'Gill Sans MT', 'Franklin Gothic Book', 'Trebuchet MS', 'Tahoma', 'Courier New', 'Comic Sans MS', 'Impact', 'Rockwell', 'Bookman Old Style', 'Book Antiqua', 'Brush Script MT', 'Lucida Handwriting', 'Edwardian Script ITC'];
const SVGNS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : /^#[0-9a-f]{3}$/i.test(c || '') ? c.replace(/[0-9a-f]/gi, '$&$&') : '#000000');

// a lighter shade of a dark colour, a darker shade of a light one
function shade(c) {
  const n = parseInt(hex(c).slice(1), 16), rgb = [n >> 16, (n >> 8) & 255, n & 255];
  const light = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.6;
  const mix = rgb.map((v) => Math.round(light ? v * 0.55 : v + (255 - v) * 0.55));
  return '#' + mix.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------ making the shape
const outlineCache = new Map();
function outlines(st) {
  const key = JSON.stringify([st.text, st.font, !!st.bold, !!st.italic]);
  if (!outlineCache.has(key)) { if (outlineCache.size > 40) outlineCache.clear(); outlineCache.set(key, textOutlines(st)); }
  return outlineCache.get(key);
}
// the shape's geometry and look for settings st, width w, top-left (x, y)
export async function makeShape(st, x, y, w) {
  const { contours, missing } = await outlines(st);
  if (!contours.length) return { empty: true, missing };
  const g = toPath(applyWarp(contours, st.warp), x, y, w);
  const r = (v) => +v.toFixed(2);
  return {
    missing, d: g.d, x, y, w: g.w, h: g.h,
    fill: structuredClone(st.fill),
    stroke: st.line ? { color: st.strokeColor, width: r(Math.max(0.25, LINES[st.line] * g.k)) } : null,
    shadow: st.shadow ? { dx: r(Math.max(1, 5 * g.k)), dy: r(Math.max(1, 5 * g.k)), color: st.shadowColor || 'rgba(0,0,0,0.35)' } : null,
  };
}
// the first words of a line, for the small pictures (whole words, about 16 letters)
function shortText(line) {
  const words = line.trim().split(/\s+/);
  let out = words[0].slice(0, 16);
  for (const w of words.slice(1)) { if ((out + ' ' + w).length > 16) break; out += ' ' + w; }
  return out;
}
const wordartProps = (st) => ({ text: st.text, font: st.font, bold: !!st.bold, italic: !!st.italic, warp: st.warp, preset: st.preset, line: st.line });

// a small SVG picture of a shape, drawn the way the page draws it
let gid = 0;
function svgOf(s, cls = '') {
  if (!s || s.empty) return `<svg class="${cls}" viewBox="0 0 10 10" aria-hidden="true"></svg>`;
  const pad = (s.stroke?.width || 0) + 1 + (s.shadow ? Math.max(s.shadow.dx, s.shadow.dy) : 0);
  let defs = '', fill = 'none';
  if (s.fill?.type === 'gradient') {
    const id = `wag${++gid}`, a = (s.fill.angle || 0) * Math.PI / 180, vx = -Math.sin(a) / 2, vy = -Math.cos(a) / 2;
    const stops = (s.fill.stops || [{ at: 0, color: s.fill.from }, { at: 1, color: s.fill.to }]).map((st) => `<stop offset="${Number(st.at) || 0}" stop-color="${esc(st.color)}"/>`).join('');
    defs = `<defs><linearGradient id="${id}" x1="${0.5 - vx}" y1="${0.5 - vy}" x2="${0.5 + vx}" y2="${0.5 + vy}">${stops}</linearGradient></defs>`;
    fill = `url(#${id})`;
  } else if (s.fill?.type === 'solid') fill = esc(s.fill.color);
  const stroke = s.stroke ? ` stroke="${esc(s.stroke.color)}" stroke-width="${s.stroke.width}" stroke-linejoin="round"` : '';
  const shadow = s.shadow ? ` style="filter:drop-shadow(${s.shadow.dx}px ${s.shadow.dy}px 0 ${esc(s.shadow.color)})"` : '';
  return `<svg class="${cls}" viewBox="${s.x - pad} ${s.y - pad} ${s.w + 2 * pad} ${s.h + 2 * pad}" aria-hidden="true">${defs}<path d="${s.d}" fill="${fill}"${stroke}${shadow}/></svg>`;
}

// ------------------------------------------------------------------ the panel
let panel = null;

export function openWordArt(app, id = null) {
  if (!app.doc) return;
  panel ||= new WordArtPanel(app);
  panel.open(id);
}

class WordArtPanel {
  constructor(app) {
    this.app = app;
    const el = this.el = document.createElement('div');
    el.className = 'panel wide wa-panel'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', 'waTitle');
    el.innerHTML = `
      <h2 id="waTitle"></h2>
      <div class="wa-cols">
        <div class="wa-left">
          <label class="wa-lab" for="waText">${esc(t('wa.text'))}</label>
          <textarea id="waText" rows="3"></textarea>
          <div class="prow"><select id="waFont" aria-label="${esc(t('wa.font'))}"></select>
            <button class="btn pbtn wa-b" id="waBold" aria-pressed="false" title="${esc(t('wa.bold'))}" aria-label="${esc(t('wa.bold'))}">B</button>
            <button class="btn pbtn wa-i" id="waItalic" aria-pressed="false" title="${esc(t('wa.italic'))}" aria-label="${esc(t('wa.italic'))}">I</button></div>
          <fieldset><legend>${esc(t('wa.shape'))}</legend><div class="wa-warps" id="waWarps"></div></fieldset>
          <fieldset><legend>${esc(t('wa.colours'))}</legend>
            <div class="prow"><label class="wa-l" for="waFill">${esc(t('wa.fill'))}</label><input type="color" id="waFill">
              <label class="wa-chk"><input type="checkbox" id="waBlend"> ${esc(t('wa.blend'))}</label><input type="color" id="waFill2" aria-label="${esc(t('wa.blendColour'))}"></div>
            <div class="prow"><label class="wa-l" for="waLine">${esc(t('wa.outline'))}</label><select id="waLine">
              ${LINES.map((_, i) => `<option value="${i}">${esc(t(`wa.line${i}`))}</option>`).join('')}</select><input type="color" id="waLineColour" aria-label="${esc(t('wa.outlineColour'))}"></div>
            <div class="prow"><label class="wa-chk"><input type="checkbox" id="waShadow"> ${esc(t('wa.shadow'))}</label></div>
          </fieldset>
        </div>
        <div class="wa-right">
          <div class="wa-preview" id="waPreview" aria-label="${esc(t('wa.preview'))}" role="img"></div>
          <fieldset><legend>${esc(t('wa.styles'))}</legend><div class="wa-gallery" id="waGallery"></div></fieldset>
        </div>
      </div>
      <p class="hint" id="waHint" hidden></p>
      <div class="actions"><button class="btn" id="waCancel">${esc(t('wa.cancel'))}</button><button class="btn primary" id="waOk"></button></div>`;
    document.body.appendChild(el);
    const $ = (s) => el.querySelector(`#${s}`);
    this.$ = $;
    $('waText').addEventListener('input', () => { this.st.text = $('waText').value; this.refresh(true); });
    $('waFont').onchange = () => { this.st.font = $('waFont').value; this.refresh(true); };
    $('waBold').onclick = () => { this.st.bold = !this.st.bold; this.refresh(true); };
    $('waItalic').onclick = () => { this.st.italic = !this.st.italic; this.refresh(true); };
    const setFill = () => {
      const c1 = $('waFill').value, c2 = $('waFill2').value;
      this.st.fill = $('waBlend').checked ? { type: 'gradient', from: c1, to: c2, angle: 0 } : { type: 'solid', color: c1, opacity: 1 };
      this.st.preset = null; this.refresh();
    };
    $('waFill').oninput = setFill; $('waFill2').oninput = () => { $('waBlend').checked = true; setFill(); };
    // switching the blend on: start from a lighter (or darker) shade of the colour, which always looks right
    $('waBlend').onchange = () => { if ($('waBlend').checked && this.st.fill?.type !== 'gradient') $('waFill2').value = shade($('waFill').value); setFill(); };
    $('waLine').onchange = () => { this.st.line = +$('waLine').value; this.st.preset = null; this.refresh(); };
    $('waLineColour').oninput = () => { this.st.strokeColor = $('waLineColour').value; if (!this.st.line) { this.st.line = 1; } this.st.preset = null; this.refresh(); };
    $('waShadow').onchange = () => { this.st.shadow = $('waShadow').checked; this.st.preset = null; this.refresh(); };
    $('waCancel').onclick = () => this.close();
    $('waOk').onclick = () => this.apply();
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.close(); } });
    // shape and style buttons are made once and drawn again when the words change
    $('waWarps').innerHTML = WARPS.map((w) => `<button class="wa-tile" data-warp="${w}" title="${esc(t(`wa.warp.${w}`))}" aria-label="${esc(t(`wa.warp.${w}`))}" aria-pressed="false"><span class="wa-pic"></span><span class="wa-name">${esc(t(`wa.warp.${w}`))}</span></button>`).join('');
    $('waWarps').onclick = (e) => { const b = e.target.closest('[data-warp]'); if (!b) return; this.st.warp = b.dataset.warp; this.refresh(); };
    $('waGallery').innerHTML = PRESETS.map((p) => `<button class="wa-tile wa-style" data-preset="${p.id}" title="${esc(t(`wa.style.${p.id}`))}" aria-label="${esc(t(`wa.style.${p.id}`))}" aria-pressed="false"><span class="wa-pic"></span></button>`).join('');
    $('waGallery').onclick = (e) => { const b = e.target.closest('[data-preset]'); if (!b) return; this.usePreset(b.dataset.preset); };
  }

  open(id) {
    const app = this.app, doc = app.doc;
    const found = id ? findItem(doc, id) : null;
    this.item = found?.it?.wordart ? found.it : null;
    const pair = doc.fontPair ? fontPair(doc.fontPair) : null;
    if (this.item) {
      const it = this.item, wa = it.wordart;
      this.st = { text: wa.text ?? '', font: wa.font || 'Arial', bold: !!wa.bold, italic: !!wa.italic, warp: wa.warp || 'straight', preset: wa.preset || null,
        fill: structuredClone(it.fill || { type: 'solid', color: '#222222', opacity: 1 }), strokeColor: it.stroke?.color || '#222222',
        line: it.stroke ? (wa.line ?? 1) : 0, shadow: !!it.shadow, shadowColor: it.shadow?.color };
    } else {
      const look = presetLook(PRESETS[2], doc.scheme);
      this.st = { text: t('wa.sample'), font: pair?.heading || 'Arial', bold: true, italic: false, preset: PRESETS[2].id, ...look };
    }
    const $ = this.$;
    $('waTitle').textContent = t(this.item ? 'wa.titleEdit' : 'wa.title');
    $('waOk').textContent = t(this.item ? 'wa.update' : 'wa.insert');
    $('waText').value = this.st.text;
    const names = [...new Set([this.st.font, pair?.heading, ...Object.keys(doc.fonts || {}), ...FONTS].filter(Boolean))];
    $('waFont').innerHTML = names.map((n) => `<option style="font-family:${esc(cssFamily(n, app.embedded))}">${esc(n)}</option>`).join('');
    $('waFont').value = this.st.font;
    this.el.hidden = false; this.el.scrollTop = 0;
    this.refresh(true);
    setTimeout(() => { $('waText').focus(); $('waText').select(); }, 0);
  }
  close() { this.el.hidden = true; }

  usePreset(pid) {
    const p = PRESETS.find((x) => x.id === pid); if (!p) return;
    Object.assign(this.st, presetLook(p, this.app.doc.scheme), { preset: pid });
    this.refresh();
  }

  // show the settings in the controls and draw the previews again (words changed: the style pictures too)
  refresh(wordsChanged = false) {
    const $ = this.$, st = this.st;
    $('waBold').setAttribute('aria-pressed', String(!!st.bold));
    $('waItalic').setAttribute('aria-pressed', String(!!st.italic));
    const grad = st.fill?.type === 'gradient';
    $('waFill').value = hex(grad ? st.fill.stops?.[0]?.color || st.fill.from : st.fill?.color);
    $('waBlend').checked = grad;
    $('waFill2').value = hex(grad ? st.fill.stops?.[st.fill.stops.length - 1]?.color || st.fill.to : '#ffffff');
    $('waLine').value = String(st.line || 0);
    $('waLineColour').value = hex(st.strokeColor);
    $('waShadow').checked = !!st.shadow;
    for (const b of $('waWarps').children) b.setAttribute('aria-pressed', String(b.dataset.warp === st.warp));
    for (const b of $('waGallery').children) b.setAttribute('aria-pressed', String(b.dataset.preset === st.preset));
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.draw(wordsChanged || !this.drawnOnce), wordsChanged ? 150 : 0);
  }
  async draw(all) {
    const seq = this.seq = (this.seq || 0) + 1;
    const st = this.st, $ = this.$;
    const main = await makeShape(st, 0, 0, 400);
    if (seq !== this.seq) return;
    $('waPreview').innerHTML = svgOf(main);
    const hint = $('waHint');
    hint.hidden = !(main.missing || main.empty);
    hint.textContent = main.empty ? t('wa.empty') : t('wa.missing');
    $('waOk').disabled = !!main.empty;
    if (!all) return;
    // small pictures: the first words of the text in every shape and every style
    const sample = { ...st, text: shortText(st.text.split(/\r?\n/).find((l) => l.trim()) || t('wa.sample')) };
    const plain = { fill: { type: 'solid', color: 'currentColor' }, line: 0, shadow: false };
    const warps = await Promise.all(WARPS.map((w) => makeShape({ ...sample, ...plain, warp: w }, 0, 0, 200)));
    const styles = await Promise.all(PRESETS.map((p) => makeShape({ ...sample, ...presetLook(p, this.app.doc.scheme) }, 0, 0, 200)));
    if (seq !== this.seq) return;
    [...$('waWarps').children].forEach((b, i) => { b.querySelector('.wa-pic').innerHTML = svgOf(warps[i]); });
    [...$('waGallery').children].forEach((b, i) => { b.querySelector('.wa-pic').innerHTML = svgOf(styles[i]); });
    this.drawnOnce = true;
  }

  // put a new WordArt on the page, or change the one being edited
  async apply() {
    const app = this.app, st = { ...this.st, text: this.st.text };
    if (!st.text.trim()) return;
    if (this.item && findItem(app.doc, this.item.id)) {
      const it = this.item, cx = it.x + it.w / 2, cy = it.y + it.h / 2, w = it.w || 200;
      const s = await makeShape(st, 0, 0, w);
      if (s.empty) return;
      // same width and centre, height follows the shape; a WordArt that was on the page stays on it
      const found = findItem(app.doc, it.id), pi = app.doc.pages.indexOf(found?.page), pg = found?.page;
      let y = cy - s.h / 2;
      if (pg && it.y >= 0 && it.y + it.h <= pg.h) y = Math.max(0, Math.min(y, pg.h - s.h));
      const shape = await makeShape(st, cx - w / 2, y, w);
      app.editor.change('wordart', () => {
        Object.assign(it, { d: shape.d, x: shape.x, y: shape.y, w: shape.w, h: shape.h, fill: shape.fill, stroke: shape.stroke, shadow: shape.shadow, wordart: wordartProps(st) });
      }, pi >= 0 ? [pi] : null);
    } else {
      // about 60% of the page wide (a circle less), and never taller than most of the page
      const pg = app.targetPage();
      let w = pg.w * (st.warp === 'circle' ? 0.4 : 0.6);
      let s = await makeShape(st, 0, 0, w);
      if (s.empty) return;
      if (s.h > pg.h * 0.7) { w *= (pg.h * 0.7) / s.h; s = await makeShape(st, 0, 0, w); }
      const shape = await makeShape(st, (pg.w - w) / 2, (pg.h - s.h) / 2, w);
      app.editor.add({ type: 'shape', kind: 'path', d: shape.d, x: shape.x, y: shape.y, w: shape.w, h: shape.h, fill: shape.fill, stroke: shape.stroke, shadow: shape.shadow, wordart: wordartProps(st) });
    }
    this.close();
  }
}
