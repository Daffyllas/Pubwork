// Draws document pages as HTML: text stays real text (selectable now, editable later), shapes are SVG,
// pictures are <img>. All positions are in points, so the browser's own CSS units do the scaling.
import { cssFamily } from './fonts.js';
import { pictureSource } from './images.js';
import { t } from './i18n/index.js';
import { decorateImage } from './picfx.js';

const SVGNS = 'http://www.w3.org/2000/svg';
// fonts made of capital letters only: their free stand-ins have small letters, so show the text in capitals
const CAPS_ONLY = /^(Algerian|Castellar|Copperplate Gothic( Bold| Light)?|Engravers MT|Felix Titling|Stencil|Perpetua Titling MT|Bernard MT Condensed Caps|Trajan( Pro)?|Desdemona|Colonna MT|Goudy Stout|Wide Latin Caps)$/i;
const el = (tag, cls, style) => { const e = document.createElement(tag); if (cls) e.className = cls; if (style) Object.assign(e.style, style); return e; };
const pt = (v) => `${+v.toFixed(3)}pt`;

function paint(fill) {
  if (!fill) return 'none';
  if (fill.type === 'solid') return fill.color;
  if (fill.type === 'gradient') return fill.from;
  return 'none';
}
function shapeEl(it, ctx) {
  const pad = (it.stroke?.width || 0) + 2 + (it.shadow ? Math.abs(it.shadow.dx) + Math.abs(it.shadow.dy) : 0);
  const x = it.x - pad, y = it.y - pad, w = Math.max(it.w, 0.01) + 2 * pad, h = Math.max(it.h, 0.01) + 2 * pad;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'it shape');
  svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  Object.assign(svg.style, { left: pt(x), top: pt(y), width: pt(w), height: pt(h) });
  let node;
  if (it.kind === 'rect') { node = document.createElementNS(SVGNS, 'rect'); node.setAttribute('x', it.x); node.setAttribute('y', it.y); node.setAttribute('width', it.w); node.setAttribute('height', it.h); if (it.rx) node.setAttribute('rx', it.rx); }
  else if (it.kind === 'ellipse') { node = document.createElementNS(SVGNS, 'ellipse'); node.setAttribute('cx', it.x + it.w / 2); node.setAttribute('cy', it.y + it.h / 2); node.setAttribute('rx', it.w / 2); node.setAttribute('ry', it.h / 2); }
  else if (it.kind === 'path') { node = document.createElementNS(SVGNS, 'path'); node.setAttribute('d', it.d); }
  else { node = document.createElementNS(SVGNS, it.kind === 'polyline' ? 'polyline' : 'polygon'); node.setAttribute('points', it.points.map((p) => p.join(',')).join(' ')); }
  if (it.fill?.type === 'gradient') {
    const id = `g${it.id}${ctx.uid}`;
    const g = document.createElementNS(SVGNS, it.fill.style === 'radial' ? 'radialGradient' : 'linearGradient');
    g.setAttribute('id', id);
    if (it.fill.style !== 'radial') {
      // Publisher runs the first stop from the bottom (angle 0). The gradient stays in page space when the
      // shape is turned (checked against the Christmas flyer, where a 180° ray matches its unturned siblings).
      const a = (it.fill.angle || 0) * Math.PI / 180;
      const vx = -Math.sin(a) / 2, vy = -Math.cos(a) / 2;
      g.setAttribute('x1', 0.5 - vx); g.setAttribute('y1', 0.5 - vy); g.setAttribute('x2', 0.5 + vx); g.setAttribute('y2', 0.5 + vy);
    }
    else { const c = { 'top-left': [0, 0], 'top-right': [1, 0], 'bottom-left': [0, 1], 'bottom-right': [1, 1] }[it.fill.center] || [0.5, 0.5]; g.setAttribute('cx', c[0]); g.setAttribute('cy', c[1]); g.setAttribute('fx', c[0]); g.setAttribute('fy', c[1]); g.setAttribute('r', it.fill.center ? 1.42 : 0.71); }
    for (const st of it.fill.stops || [{ at: 0, color: it.fill.from }, { at: 1, color: it.fill.to }]) { const s = document.createElementNS(SVGNS, 'stop'); s.setAttribute('offset', st.at); s.setAttribute('stop-color', st.color); if (st.opacity != null && st.opacity < 1) s.setAttribute('stop-opacity', st.opacity); g.appendChild(s); }
    const defs = document.createElementNS(SVGNS, 'defs'); defs.appendChild(g); svg.appendChild(defs);
    node.setAttribute('fill', `url(#${id})`);
  } else if (it.fill?.type === 'image' && it.fill.data) { // a picture inside the shape (e.g. WordArt filled with a photo)
    const id = `p${it.id}${ctx.uid}`, pat = document.createElementNS(SVGNS, 'pattern');
    pat.setAttribute('id', id); pat.setAttribute('patternUnits', 'objectBoundingBox'); pat.setAttribute('patternContentUnits', 'objectBoundingBox'); pat.setAttribute('width', 1); pat.setAttribute('height', 1);
    const im = document.createElementNS(SVGNS, 'image');
    im.setAttribute('href', `data:${it.fill.mime || 'image/png'};base64,${it.fill.data}`); im.setAttribute('width', 1); im.setAttribute('height', 1); im.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    pat.appendChild(im);
    const defs = document.createElementNS(SVGNS, 'defs'); defs.appendChild(pat); svg.appendChild(defs);
    node.setAttribute('fill', `url(#${id})`);
  } else node.setAttribute('fill', paint(it.fill));
  if (it.fill?.opacity != null && it.fill.opacity < 1) node.setAttribute('fill-opacity', it.fill.opacity);
  if (it.stroke) {
    node.setAttribute('stroke', it.stroke.color); node.setAttribute('stroke-width', it.stroke.width);
    if (it.stroke.dash) node.setAttribute('stroke-dasharray', it.stroke.dash.join(' '));
    if (it.stroke.cap === 'round') { node.setAttribute('stroke-linecap', 'round'); node.setAttribute('stroke-linejoin', 'round'); }
    if (it.stroke.opacity != null && it.stroke.opacity < 1) node.setAttribute('stroke-opacity', it.stroke.opacity);
  } else node.setAttribute('stroke', 'none');
  if (it.shadow) node.setAttribute('filter', `drop-shadow(${it.shadow.dx}px ${it.shadow.dy}px 0 ${it.shadow.color})`);
  if (it.rotate) svg.style.transform = `rotate(${-it.rotate}deg)`;
  // WordArt can be picked anywhere in its box, also between the letters
  if (it.wordart) svg.classList.add('wordart'); // clickable between its letters on the editing pages (see app.html)
  svg.appendChild(node);
  return svg;
}
// arrowheads at the ends of a line, as their own filled shape so every export draws them
function lineEnds(it) {
  let P = it.points;
  if (!P && it.d) { const n = (it.d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number); P = []; for (let i = 0; i + 1 < n.length; i += 2) P.push([n[i], n[i + 1]]); }
  if (!P || P.length < 2) return null;
  const far = (a, list) => list.find((q) => Math.hypot(q[0] - a[0], q[1] - a[1]) > 0.01) || list[0];
  return { start: [P[0], far(P[0], P.slice(1))], end: [P[P.length - 1], far(P[P.length - 1], P.slice(0, -1).reverse())] };
}
function arrowEl(it) {
  const ends = lineEnds(it); if (!ends) return null;
  const sw = Math.max(it.stroke.width || 1, 0.75), K = [2, 3, 5];
  const parts = [];
  for (const [key, [tip, from]] of [['arrowStart', ends.start], ['arrowEnd', ends.end]]) {
    const a = it.stroke[key]; if (!a) continue;
    const len = Math.max(4, sw * K[a.size % 3] * 1.2), half = Math.max(2, sw * K[Math.floor(a.size / 3) % 3] * 0.6);
    const ux = (tip[0] - from[0]), uy = (tip[1] - from[1]), d = Math.hypot(ux, uy) || 1, x = ux / d, y = uy / d;
    const at = (along, side) => `${(tip[0] - x * along - y * side).toFixed(2)} ${(tip[1] - y * along + x * side).toFixed(2)}`;
    if (a.style === 4) { const r = half, cx = tip[0] - x * r, cy = tip[1] - y * r; parts.push(`M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`); }
    else if (a.style === 3) parts.push(`M${at(0, 0)}L${at(len / 2, half)}L${at(len, 0)}L${at(len / 2, -half)}Z`);
    else if (a.style === 2) parts.push(`M${at(0, 0)}L${at(len, half)}L${at(len * 0.65, 0)}L${at(len, -half)}Z`);
    else if (a.style === 5) parts.push(`M${at(len, half)}L${at(0, 0)}L${at(len, -half)}`);
    else parts.push(`M${at(0, 0)}L${at(len, half)}L${at(len, -half)}Z`);
  }
  if (!parts.length) return null;
  const open = it.stroke.arrowEnd?.style === 5 || it.stroke.arrowStart?.style === 5;
  const head = { id: it.id + '-arrow', kind: 'path', d: parts.join(''), x: it.x - 20, y: it.y - 20, w: it.w + 40, h: it.h + 40, fill: open ? null : { type: 'solid', color: it.stroke.color }, stroke: open ? { color: it.stroke.color, width: sw } : null, rotate: it.rotate };
  return shapeEl(head, { uid: 0 });
}
function imageEl(it, ctx) {
  const box = el('div', 'it pic', { left: pt(it.x), top: pt(it.y), width: pt(it.w), height: pt(it.h) });
  if (it.rotate) box.style.transform = `rotate(${-it.rotate}deg)`;
  if (it.stroke) box.style.outline = `${it.stroke.width}pt solid ${it.stroke.color}`;
  if (it.points) { // picture clipped to a non-rectangular outline
    const poly = it.points.map(([px, py]) => `${(((px - it.x) / (it.w || 1)) * 100).toFixed(2)}% ${(((py - it.y) / (it.h || 1)) * 100).toFixed(2)}%`).join(',');
    box.style.clipPath = `polygon(${poly})`;
  }
  if (!it.data) { // an empty picture frame from a template: "double-click to add a photo"
    box.classList.add('placeholder'); if (it.round) box.classList.add('round'); if (it.w < 110 || it.h < 70) box.classList.add('small');
    const lab = el('span'); lab.textContent = t('placeholder.photo'); box.appendChild(lab);
    return box;
  }
  const img = el('img'); img.alt = it.alt || ''; img.draggable = false;
  box.appendChild(img);
  if (it.adjust) { // recolour (shades of one colour, white stays white) and brightness, as an SVG filter
    const id = `f${it.id}${ctx.uid}`, svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
    const f = document.createElementNS(SVGNS, 'filter'); f.setAttribute('id', id); f.setAttribute('color-interpolation-filters', 'sRGB');
    if (it.adjust.recolor) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(it.adjust.recolor.slice(i, i + 2), 16) / 255);
      const row = (c) => `${(0.2126 * (1 - c)).toFixed(4)} ${(0.7152 * (1 - c)).toFixed(4)} ${(0.0722 * (1 - c)).toFixed(4)} 0 ${c.toFixed(4)}`;
      const m = document.createElementNS(SVGNS, 'feColorMatrix'); m.setAttribute('type', 'matrix'); m.setAttribute('values', `${row(r)} ${row(g)} ${row(b)} 0 0 0 1 0`); f.appendChild(m);
    }
    if (it.adjust.light != null) {
      const t = document.createElementNS(SVGNS, 'feComponentTransfer'), k = ((it.adjust.light - 0.5) * 2).toFixed(3);
      for (const ch of ['R', 'G', 'B']) { const fn = document.createElementNS(SVGNS, `feFunc${ch}`); fn.setAttribute('type', 'linear'); fn.setAttribute('slope', 1); fn.setAttribute('intercept', k); t.appendChild(fn); }
      f.appendChild(t);
    }
    svg.appendChild(f); box.appendChild(svg); img.style.filter = `url(#${id})`;
  }
  ctx.pending.push(pictureSource(it).then((src) => {
    if (src.url) { img.src = src.url; return decorateImage(box, img, it, ctx, src); }
    else { box.classList.add('missing'); box.title = src.error; img.remove(); box.textContent = '🖼'; ctx.note(...(src.note || ['note.picBroken'])); }
    if (src.converted) ctx.note('note.wmf');
  }));
  return box;
}
// ---------------------------------------------------------------- text extras: tabs, fields, links, drop caps, wrap
// The few rules plain inline styles can't express are added to the page once.
let cssAdded = false;
function addCss() {
  if (cssAdded || typeof document === 'undefined') return; cssAdded = true;
  const s = document.createElement('style'); s.id = 'pw-text-css';
  s.textContent = `.page .text span.tab{display:inline-block;white-space:nowrap;text-align:right;text-indent:0;overflow:visible;vertical-align:baseline}
.page p.para.tabbed{text-align:left!important}
.page .text span.tab.line{border-bottom:.6pt solid currentColor}
.page .text .pw-float{pointer-events:none;user-select:none}
.page p.para.dropcap{font-size:var(--dc-fs);font-family:var(--dc-ff)}
.page p.para.dropcap::first-letter{initial-letter:var(--dc-lines);-webkit-initial-letter:var(--dc-lines);font-family:var(--dc-font);color:var(--dc-color);margin-right:.06em;font-style:normal}
@supports not ((initial-letter:2) or (-webkit-initial-letter:2)){.page p.para.dropcap::first-letter{float:left;font-size:var(--dc-size);line-height:1;margin:var(--dc-m)}}
.page a.pwlink{color:inherit;text-decoration:inherit;cursor:inherit}
.page .text [data-field]{white-space:nowrap}`;
  document.head.appendChild(s);
  // links on the page never open by accident; Ctrl/Cmd-click opens them in a new tab
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('.page a.pwlink'); if (!a) return;
    e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && /^(https?:|mailto:|tel:)/i.test(a.getAttribute('href') || '')) window.open(a.getAttribute('href'), '_blank', 'noopener');
  }, true);
}
// a web or e-mail address as typed by a person -> a safe link (or '' when it can't be one)
export function cleanLink(s) {
  s = String(s || '').trim(); if (!s) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[^\s@/]+@[^\s@]+\.[^\s@]+$/.test(s)) return `mailto:${s}`;
  if (/^[a-z][\w+.-]*:/i.test(s)) return ''; // javascript: and other kinds are never links
  return `https://${s.replace(/^\/+/, '')}`;
}
// what a field shows: the page's number, how many pages, today's date in the app's language
export function fieldText(kind, ctx = {}) {
  if (kind === 'page') return String(ctx.pageNumber || 1);
  if (kind === 'pages') return String(ctx.pageCount || 1);
  if (kind === 'date') {
    const lang = ctx.lang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
    try { return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(ctx.date || new Date()); } catch { return new Date().toDateString(); }
  }
  return '';
}
const TAB_LEADS = { dot: '.', dash: '-', line: '' };
function tabSpan() {
  const t = el('span', 'tab'); t.contentEditable = 'false';
  t.appendChild(el('span', 'pw-gen lead'));
  return t;
}
function runSpan(r, ctx) {
  const s = el('span');
  if (r.field) { // page number, number of pages, date: filled in for the page being drawn
    s.dataset.field = r.field; s.dataset.len = r.text.length; s.dataset.ph = r.text; s.contentEditable = 'false';
    s.textContent = fieldText(r.field, ctx);
  } else if (r.text.includes('\t')) { // tabs become spans whose width is worked out once the line is laid out
    r.text.split('\t').forEach((part, i) => { if (i) s.appendChild(tabSpan()); if (part) s.appendChild(document.createTextNode(part)); });
  } else s.textContent = r.text;
  const st = s.style;
  st.fontFamily = cssFamily(r.font || ctx.defaultFont, ctx.embedded);
  s.dataset.font = r.font || ctx.defaultFont; // the font's real name, kept for editing
  if (r.size) st.fontSize = pt(r.size);
  if (r.bold) st.fontWeight = '700';
  if (r.italic) st.fontStyle = 'italic';
  const deco = []; if (r.underline) deco.push('underline'); if (r.strike) deco.push('line-through');
  if (deco.length) { st.textDecorationLine = deco.join(' '); if (r.underline === 'double') st.textDecorationStyle = 'double'; if (r.underline === 'dotted') st.textDecorationStyle = 'dotted'; }
  if (r.color) st.color = r.color;
  if (r.highlight) st.backgroundColor = r.highlight;
  if (r.caps === 'all' || CAPS_ONLY.test(r.font || '')) st.textTransform = 'uppercase'; // fonts that only have capitals
  if (r.caps === 'small') st.fontVariant = 'small-caps';
  if (r.position) { st.verticalAlign = r.position; st.fontSize = pt((r.size || 10) * 0.66); }
  if (r.shadow) st.textShadow = '0.06em 0.06em 0 rgba(0,0,0,.35)';
  if (r.outline) { st.webkitTextStroke = '0.03em currentColor'; st.color = 'transparent'; }
  if (r.tracking) st.letterSpacing = pt(r.tracking);
  if (r.kern === 'off') st.fontKerning = 'none';
  if (r.liga === 'off') st.fontVariantLigatures = 'none';
  if (r.lang) s.lang = r.lang;
  if (r.link) { const href = cleanLink(r.link); if (href) { const a = el('a', 'pwlink'); a.href = href; a.title = href.replace(/^mailto:/, ''); a.appendChild(s); return a; } }
  return s;
}
// paragraph settings that need more than one inline style: tab stops, drop cap, style name
// size and family: of the paragraph's text (its first words)
export function paraExtras(p, pa, size = 10, family = '') {
  if (pa.tabs?.length) p.dataset.tabs = JSON.stringify(pa.tabs); else delete p.dataset.tabs;
  if (pa.style) p.dataset.style = pa.style; else delete p.dataset.style;
  const dc = pa.dropCap;
  if (dc && dc.lines >= 2 && !pa.cont) {
    p.classList.add('dropcap'); p.dataset.dropcap = JSON.stringify(dc);
    dropCapSize(p, dc, size, family, pa.lineHeight?.pt || (pa.lineHeight?.mult ? pa.lineHeight.mult * 1.2 * size : 0));
  } else { p.classList.remove('dropcap'); delete p.dataset.dropcap; ['--dc-lines', '--dc-fs', '--dc-ff', '--dc-size', '--dc-m', '--dc-font', '--dc-color'].forEach((k) => p.style.removeProperty(k)); }
}
// The browser's own big first letter (CSS initial-letter) is sized from the paragraph's own lines, so the
// paragraph takes the size and font of its text. Browsers without it get a floating letter sized here.
function dropCapSize(p, dc, size, family, lh) {
  const n = Math.min(5, Math.max(2, Math.round(dc.lines)));
  lh = lh || 1.15 * size;
  // the big letter's capitals reach from the top of the first line to the foot of the last one
  const F = ((n - 1) * lh + 0.7 * size) / 0.7, base = (n - 1) * lh + (lh - 1.11 * size) / 2 + 0.9 * size;
  // the float ends well inside the last line, so a line spacing a little off never pushes one more line aside
  const top = base - 0.845 * F, bottom = (n - 0.3) * lh - (F + top);
  p.style.setProperty('--dc-lines', n);
  p.style.setProperty('--dc-fs', pt(size)); if (family) p.style.setProperty('--dc-ff', family); else p.style.removeProperty('--dc-ff');
  p.style.setProperty('--dc-size', pt(F)); p.style.setProperty('--dc-m', `${pt(top)} ${pt(F * 0.06)} ${pt(bottom)} 0`);
  if (dc.font) p.style.setProperty('--dc-font', cssFamily(dc.font)); else p.style.removeProperty('--dc-font');
  if (dc.color) p.style.setProperty('--dc-color', dc.color); else p.style.removeProperty('--dc-color');
}
// after the text of a box got a new size or font (typing, fitting): its big first letters follow it
export function refreshDropCaps(root) {
  for (const p of root.querySelectorAll('p.para.dropcap')) {
    let dc; try { dc = JSON.parse(p.dataset.dropcap); } catch { continue; }
    const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.replace(/[\s\u200b]/g, '') && !t.parentElement.closest('.bullet, .pw-gen, .pw-float') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const first = w.nextNode(); if (!first) continue;
    const s = first.parentElement, cs = getComputedStyle(s), k = 0.75; // CSS px -> pt
    const size = parseFloat(cs.fontSize) * k, lh = cs.lineHeight === 'normal' ? 0 : parseFloat(cs.lineHeight) * k;
    const fam = s.closest('[data-font]')?.style.fontFamily || p.style.getPropertyValue('--dc-ff') || '';
    if (size > 0) dropCapSize(p, dc, size, fam, lh);
  }
}
function parasInto(box, paras, ctx, base = { p: 0, c: 0 }) {
  paras.forEach((pa, k) => {
    const p = el('p', 'para');
    p.dataset.pi = base.p + k; p.dataset.c0 = k === 0 ? base.c : 0;
    if (pa.cont) p.classList.add('cont');
    const st = p.style;
    if (pa.align) st.textAlign = pa.align;
    if (pa.spaceBefore && !pa.cont) st.marginTop = pt(pa.spaceBefore);
    if (pa.spaceAfter) st.marginBottom = pt(pa.spaceAfter);
    if (pa.indentLeft) st.marginLeft = pt(pa.indentLeft);
    if (pa.indentRight) st.marginRight = pt(pa.indentRight);
    if (pa.indentFirst && !pa.cont) st.textIndent = pt(pa.indentFirst);
    if (pa.lineHeight?.mult) st.lineHeight = String(+(pa.lineHeight.mult * 1.2).toFixed(3));
    else if (pa.lineHeight?.pt) st.lineHeight = pt(pa.lineHeight.pt);
    if (pa.lineHeight) p.dataset.lh = '1';
    if (pa.background) st.backgroundColor = pa.background;
    if (pa.bullet && !pa.cont) { const b = el('span', 'bullet'); b.textContent = pa.bullet + '\u00a0'; p.appendChild(b); }
    const maxSize = Math.max(0, ...pa.runs.map((r) => r.size || 0));
    if (!pa.runs.length || pa.runs.every((r) => !r.text)) { p.dataset.empty = '1'; p.appendChild(document.createTextNode('\u200b')); if (maxSize || ctx.lastSize) st.fontSize = pt(maxSize || ctx.lastSize); }
    // the paragraph's own (empty) line is no taller than its smallest text, so small text fits short boxes
    else if (maxSize && pa.runs.every((r) => r.size || !r.text)) { const min = Math.min(...pa.runs.filter((r) => r.text).map((r) => r.size)); if (min < 10) st.fontSize = pt(min); } // (10 pt: the boxes' own size)
    const r0 = pa.runs.find((r) => r.text);
    paraExtras(p, pa, r0?.size || ctx.lastSize || 10, cssFamily(r0?.font || ctx.defaultFont, ctx.embedded));
    for (const r of pa.runs) { if (r.text) p.appendChild(runSpan(r, ctx)); if (r.size) ctx.lastSize = r.size; }
    if (p.querySelector('span.tab')) p.classList.add('tabbed'); // lines with tabs line up from the left, as tab stops are measured from there
    box.appendChild(p);
  });
}
function textEl(it, ctx) {
  const box = el('div', 'it text', { left: pt(it.x), top: pt(it.y), width: pt(it.w), height: pt(it.h), padding: it.pad.map(pt).join(' ') });
  box.dataset.valign = it.valign || 'top';
  if (it.fill?.type === 'solid') { box.style.background = it.fill.color; if (it.fill.opacity < 1) box.style.background = hexA(it.fill.color, it.fill.opacity); }
  if (it.stroke) box.style.border = `${it.stroke.width}pt solid ${it.stroke.color}`;
  if (it.rotate) box.style.transform = `rotate(${-it.rotate}deg)`;
  const flow = el('div', 'flow');
  box.__item = it; box.__ctx = { pageNumber: ctx.pageNumber, pageCount: ctx.pageCount };
  if (it.chain) { box.dataset.chain = it.chain; box.dataset.chainIndex = it.chainIndex; }
  if (it.columns > 1) { flow.style.columnCount = it.columns; flow.style.columnGap = pt(it.columnGap || 9); flow.style.height = '100%'; }
  if (it.hyphenate) { // the browser breaks long words with a hyphen, in the text's own language
    flow.style.hyphens = 'auto'; flow.style.webkitHyphens = 'auto';
    box.lang = it.lang || it.paras.flatMap((p) => p.runs).find((r) => r.lang)?.lang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
  }
  box.__wrap = wrapObstacles(it, ctx);
  parasInto(flow, it.paras, ctx);
  wrapFlow(box, flow);
  box.appendChild(flow);
  return box;
}

// ---------------------------------------------------------------- text wrap around pictures and shapes
// An item with wrap 'square' or 'topBottom' pushes aside the text of every text box it overlaps that is
// BELOW it (listed before it on the page), like a picture laid on top of a column of text. Text boxes
// further up never wrap, so two boxes can't push each other. Master items only affect master text.
// The text is pushed by invisible floats (.pw-float) at the start of the box's text: a narrow one to
// reach the right height, then one as big as the item, on the side of the box the item is on.
const WRAP = new Set(['square', 'topBottom']);
function flatItems(items, out = []) { for (const it of items || []) { if (it.type === 'group') flatItems(it.items, out); else out.push(it); } return out; }
function turnedBounds(it) {
  if (!it.rotate) return { x: it.x, y: it.y, w: it.w, h: it.h };
  const a = (it.rotate * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = it.w * c + it.h * s, h = it.w * s + it.h * c;
  return { x: it.x + it.w / 2 - w / 2, y: it.y + it.h / 2 - h / 2, w, h };
}
function wrapObstacles(it, ctx) {
  const layer = ctx.layer; if (!layer) return [];
  const i = layer.indexOf(it); if (i < 0) return [];
  const out = [];
  for (const o of layer.slice(i + 1)) {
    if (!WRAP.has(o.wrap) || o.hidden) continue;
    const b = turnedBounds(o), g = Number.isFinite(+o.wrapGap) && o.wrapGap !== null ? +o.wrapGap : 6;
    if (b.x - g >= it.x + it.w || b.x + b.w + g <= it.x || b.y - g >= it.y + it.h || b.y + b.h + g <= it.y) continue;
    out.push({ x: b.x - g, y: b.y - g, w: b.w + 2 * g, h: b.h + 2 * g, mode: o.wrap });
  }
  return out;
}
const ptOf = (v) => parseFloat(v) || 0;
// the text area of a box in points: { x, y, w, h } on the page
function textArea(box) {
  const s = box.style, bw = s.borderLeftStyle && s.borderLeftStyle !== 'none' ? ptOf(s.borderLeftWidth) : 0;
  const x = ptOf(s.left) + bw + ptOf(s.paddingLeft), y = ptOf(s.top) + bw + ptOf(s.paddingTop);
  return { x, y, w: ptOf(s.width) - 2 * bw - ptOf(s.paddingLeft) - ptOf(s.paddingRight), h: ptOf(s.height) - 2 * bw - ptOf(s.paddingTop) - ptOf(s.paddingBottom) };
}
// put the floats in; shift: how far (pt) the text starts below the top of the box (text set in the middle or at the bottom)
export function wrapFlow(box, flow, shift = 0) {
  flow.querySelectorAll(':scope > .pw-float').forEach((n) => n.remove());
  flow.__shift = shift;
  const obs = box.__wrap; if (!obs?.length) { if (flow.style.columnFill) flow.style.columnFill = ''; return; }
  const A = textArea(box);
  const n = Math.max(1, parseInt(flow.style.columnCount, 10) || 1), gap = n > 1 ? ptOf(flow.style.columnGap) : 0;
  const colW = (A.w - gap * (n - 1)) / n, MIN = 24; // narrower than this, no line could run beside the item
  const bands = { left: [], right: [] };
  for (let c = 0; c < n; c++) {
    const c0 = c * (colW + gap), c1 = c0 + colW;
    for (const o of obs) {
      const x0 = o.x - A.x, x1 = x0 + o.w, y0 = Math.max(0, o.y - A.y - shift), y1 = Math.min(A.h - (n > 1 ? 1 : 0), o.y + o.h - A.y - shift);
      if (y1 <= y0 || x1 <= c0 || x0 >= c1) continue;
      const roomL = x0 - c0, roomR = c1 - x1;
      let side = 'left', w;
      if (o.mode === 'topBottom' || Math.max(roomL, roomR) < MIN) w = colW; // nothing beside it: text goes above and below
      else if (roomL >= roomR) { side = 'right'; w = c1 - Math.max(x0, c0); } // the text runs on the wider side
      else w = Math.min(x1, c1) - c0;
      bands[side].push({ top: c * A.h + y0, bottom: c * A.h + y1, w: Math.min(colW, w), c });
    }
  }
  // with something to go around in a later column, columns fill one after the other (as in Publisher),
  // so where each column starts is known; otherwise they stay balanced as before
  flow.style.columnFill = n > 1 && [...bands.left, ...bands.right].some((b) => b.c > 0) ? 'auto' : '';
  // things on both sides at the same height leaving no room between: one band right across
  for (let again = true; again;) {
    again = false;
    for (const l of bands.left) for (const r of bands.right) {
      if (l.c !== r.c || l.top >= r.bottom || r.top >= l.bottom || l.w + r.w <= colW - MIN) continue;
      if (l.w >= colW - 0.5) { // right across already: the other one only counts above or below it
        if (r.top < l.top) r.bottom = l.top; else if (r.bottom > l.bottom) r.top = l.bottom; else bands.right.splice(bands.right.indexOf(r), 1);
      } else { l.top = Math.min(l.top, r.top); l.bottom = Math.max(l.bottom, r.bottom); l.w = colW; bands.right.splice(bands.right.indexOf(r), 1); }
      again = true; break;
    }
  }
  // floats stack downwards on each side; every float is written after the ones above it (a CSS rule)
  const list = [];
  for (const side of ['left', 'right']) {
    const bs = bands[side].sort((a, b) => a.top - b.top), merged = [];
    for (const b of bs) { const m = merged[merged.length - 1]; if (m && b.top <= m.bottom) { m.bottom = Math.max(m.bottom, b.bottom); m.w = Math.max(m.w, b.w); } else merged.push({ ...b }); }
    let y = 0;
    for (const b of merged) { if (b.top > y) list.push({ side, top: y, w: 0, h: b.top - y }); list.push({ side, top: b.top, w: b.w, h: b.bottom - b.top }); y = b.bottom; }
  }
  list.sort((a, b) => a.top - b.top);
  const frag = document.createDocumentFragment();
  for (const f of list) {
    const d = el('div', 'pw-float', { float: f.side, clear: f.side, width: pt(f.w), height: pt(f.h) });
    d.contentEditable = 'false'; d.setAttribute('aria-hidden', 'true');
    frag.appendChild(d);
  }
  flow.prepend(frag);
}

// ---------------------------------------------------------------- tab stops and leaders (needs the page laid out)
// pt per screen pixel and the text area's left edge on screen, measured with the box upright
function measureBox(box) {
  const tf = box.style.transform; if (tf) box.style.transform = 'none';
  const r = box.getBoundingClientRect(), A = textArea(box), k = ptOf(box.style.width) / (r.width || 1);
  return { r, A, k, restore: () => { if (tf) box.style.transform = tf; } };
}
function segmentAfter(tab, upTo = null) {
  // the words after a tab, up to the next tab or the end of the paragraph (or up to a decimal point)
  const p = tab.closest('p.para'), range = document.createRange();
  range.setStartAfter(tab);
  const w = document.createTreeWalker(p, NodeFilter.SHOW_ALL); w.currentNode = tab;
  let n, end = null, past = false;
  while ((n = w.nextNode())) {
    if (!past) { if (!tab.contains(n)) past = true; else continue; }
    if (n.nodeType === 1 && n.classList.contains('tab')) { end = () => range.setEndBefore(n); break; }
    if (upTo && n.nodeType === 3) { const i = n.data.search(upTo); if (i >= 0) { end = () => range.setEnd(n, i); break; } }
  }
  if (end) end(); else range.setEnd(p, p.childNodes.length);
  return range;
}
export function layoutTabs(box) {
  for (const p of box.querySelectorAll('p.para.tabbed')) if (!p.querySelector('span.tab')) p.classList.remove('tabbed'); // a new paragraph copied the mark
  const tabs = [...box.querySelectorAll('.flow span.tab')]; if (!tabs.length) return;
  for (const t of tabs) t.closest('p.para')?.classList.add('tabbed');
  for (const t of tabs) { t.style.width = '0pt'; t.firstChild && (t.firstChild.textContent = ''); t.classList.remove('line'); }
  const m = measureBox(box);
  try {
    const flow = box.querySelector('.flow'), fr = flow.getBoundingClientRect();
    const n = Math.max(1, parseInt(flow.style.columnCount, 10) || 1), gap = n > 1 ? ptOf(flow.style.columnGap) : 0, colW = (m.A.w - gap * (n - 1)) / n;
    for (const t of tabs) {
      const p = t.closest('p.para');
      let stops = []; try { stops = JSON.parse(p.dataset.tabs || '[]'); } catch { /* none */ }
      const r = t.getBoundingClientRect();
      let x = (r.left - fr.left) * m.k; const col = n > 1 ? Math.max(0, Math.floor((x + 0.5) / (colW + gap))) : 0; x -= col * (colW + gap);
      const stop = stops.filter((s) => +s.pos > x + 0.25).sort((a, b) => a.pos - b.pos)[0] || { pos: (Math.floor((x + 0.25) / 36) + 1) * 36, align: 'left', leader: 'none' };
      let w = stop.pos - x;
      if (stop.align && stop.align !== 'left') {
        const seg = segmentAfter(t, stop.align === 'decimal' ? /[.,]\d/ : null), rs = [...seg.getClientRects()].filter((q) => q.width && q.top - 1 <= r.bottom && q.bottom + 1 >= r.bottom);
        const segW = rs.length ? (Math.max(...rs.map((q) => q.right)) - Math.min(...rs.map((q) => q.left))) * m.k : 0;
        w -= stop.align === 'center' ? segW / 2 : segW;
        w -= 0.4; // a hair of room so the line never spills over
      }
      w = Math.max(0, w);
      t.style.width = pt(w);
      if (stop.leader === 'line') t.classList.add('line');
      const ch = TAB_LEADS[stop.leader];
      if (ch && w > 4 && t.firstChild) {
        const lead = t.firstChild; lead.textContent = ch.repeat(8);
        const one = (lead.getBoundingClientRect().width * m.k) / 8;
        const count = one > 0 ? Math.floor((w - one * 0.6) / one) : 0;
        lead.textContent = count > 0 ? ch.repeat(count) : '';
      }
    }
  } finally { m.restore(); }
}
// tab characters typed into a box being edited become tab spans (keeps the caret where it was)
export function tabify(container) {
  const sel = getSelection();
  // the browser wraps a typed tab in <span style="white-space:pre">, and words typed later stay in it and
  // never wrap: take those spans away (the box already keeps spaces)
  const pre = [...container.querySelectorAll('span[style]')].filter((s) => /^\s*white-space:\s*pre;?\s*$/i.test(s.getAttribute('style')));
  if (pre.length) {
    const r0 = sel.rangeCount ? sel.getRangeAt(0) : null, keep = r0 && container.contains(r0.startContainer) ? [r0.startContainer, r0.startOffset, r0.endContainer, r0.endOffset] : null;
    pre.forEach((s) => s.replaceWith(...s.childNodes));
    if (keep) { try { const r = document.createRange(); r.setStart(keep[0], keep[1]); r.setEnd(keep[2], keep[3]); sel.removeAllRanges(); sel.addRange(r); } catch { /* the caret stays near */ } }
  }
  const at = sel.rangeCount ? sel.getRangeAt(0) : null;
  const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.data.includes('\t') && !n.parentElement.closest('.tab, [data-field], .pw-gen') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const list = []; let n; while ((n = w.nextNode())) list.push(n);
  let caret = null;
  for (const node of list) {
    const parts = node.data.split('\t'), frag = document.createDocumentFragment();
    const caretHere = at && at.collapsed && at.startContainer === node ? at.startOffset : -1;
    let pos = 0;
    parts.forEach((part, i) => {
      if (i) { const tb = tabSpan(); frag.appendChild(tb); pos++; if (caretHere === pos) caret = tb; }
      if (part) { const tn = document.createTextNode(part); frag.appendChild(tn); if (caretHere > pos && caretHere <= pos + part.length) caret = [tn, caretHere - pos]; pos += part.length; }
    });
    node.replaceWith(frag);
  }
  if (caret) { const r = document.createRange(); if (Array.isArray(caret)) r.setStart(caret[0], caret[1]); else r.setStartAfter(caret); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
  return list.length > 0;
}
// after a box is laid out: tabs, and the wrap floats of text set in the middle or at the bottom
export function layoutBox(box) {
  const flow = box.querySelector(':scope > .flow'); if (!flow) return;
  if (box.__wrap?.length && box.dataset.valign && box.dataset.valign !== 'top') {
    for (let i = 0; i < 3; i++) {
      const m = measureBox(box); const shift = (flow.getBoundingClientRect().top - m.r.top) * m.k - (m.A.y - ptOf(box.style.top)); m.restore();
      if (Math.abs(shift - (flow.__shift || 0)) < 0.5) break;
      flow.__shift = shift; wrapFlow(box, flow, shift);
    }
  }
  layoutTabs(box);
}
const hexA = (hex, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function tableEl(it, ctx) {
  const box = el('div', 'it table', { left: pt(it.x), top: pt(it.y), width: pt(it.w), height: pt(it.h) });
  box.__item = it;
  const t = el('table');
  const cg = el('colgroup'); for (const w of it.cols) cg.appendChild(el('col', null, { width: pt(w) })); t.appendChild(cg);
  for (const row of it.rows) {
    const tr = el('tr', null, row.h ? { height: pt(row.h) } : null);
    for (const c of row.cells) {
      if (c.covered) continue;
      const td = el('td'); td.__cell = c;
      if (c.span[0] > 1) td.colSpan = c.span[0]; if (c.span[1] > 1) td.rowSpan = c.span[1];
      if (c.fill) td.style.background = c.fill;
      ['Top', 'Right', 'Bottom', 'Left'].forEach((s, i) => { if (c.borders[i]) td.style[`border${s}`] = c.borders[i]; });
      td.style.verticalAlign = c.valign === 'middle' ? 'middle' : c.valign === 'bottom' ? 'bottom' : 'top';
      parasInto(td, c.paras, ctx);
      tr.appendChild(td);
    }
    t.appendChild(tr);
  }
  box.appendChild(t);
  return box;
}
function itemsInto(target, items, ctx, groupId = null) {
  for (const it of items) {
    let node = null;
    if (it.type === 'group') { itemsInto(target, it.items, ctx, groupId || it.id); continue; }
    if (it.type === 'shape') node = shapeEl(it, ctx);
    else if (it.type === 'image') node = imageEl(it, ctx);
    else if (it.type === 'text') node = textEl(it, ctx);
    else if (it.type === 'table') node = tableEl(it, ctx);
    if (!node) continue;
    node.dataset.id = it.id; if (groupId) node.dataset.group = groupId;
    target.appendChild(node);
    if (it.type === 'shape' && (it.stroke?.arrowStart || it.stroke?.arrowEnd)) { const h = arrowEl(it); if (h) { h.classList.add('arrowhead'); h.dataset.group = groupId || it.id; target.appendChild(h); } }
  }
}
// ---------------------------------------------------------------- linked text boxes
const plen = (pa) => pa.runs.reduce((n, r) => n + r.text.length, 0);
// the part of a story between two positions {p: paragraph, c: character}
export function sliceParas(paras, s, e = null) {
  const out = [];
  const endP = e ? e.p : paras.length - 1;
  for (let i = s.p; i <= endP && i < paras.length; i++) {
    const pa = paras[i], from = i === s.p ? s.c : 0, to = e && i === e.p ? e.c : Infinity;
    if (e && i === e.p && to === 0) break;
    const runs = []; let pos = 0;
    for (const r of pa.runs) {
      const a = Math.max(from, pos), b = Math.min(to, pos + r.text.length);
      if (b > a) runs.push({ ...r, text: r.text.slice(a - pos, b - pos) });
      pos += r.text.length;
    }
    out.push({ ...pa, runs, cont: i === s.p && from > 0 });
  }
  return out;
}
// a paragraph's story characters as drawn: text pieces, and tabs and fields as single pieces.
// d: position among the drawn characters, m: position in the stored text (a field counts as its stored text)
export function paraUnits(p) {
  const units = []; let d = 0, m = 0;
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { if (n.length) { units.push({ node: n, d, m, n: n.length }); d += n.length; m += n.length; } continue; }
      if (n.nodeType !== 1 || n.classList.contains('bullet') || n.classList.contains('pw-gen') || n.classList.contains('pw-float')) continue;
      if (n.classList.contains('tab')) { units.push({ el: n, d, m, n: 1, len: 1 }); d++; m++; continue; }
      if (n.dataset.field) { const len = +n.dataset.len || 0; units.push({ el: n, d, m, n: 1, len }); d++; m += len; continue; }
      walk(n);
    }
  };
  walk(p);
  return { units, total: d };
}
// first position in the box's text that falls outside the box, or null when everything fits
function findCut(box, flow) {
  const br = box.getBoundingClientRect(), k = br.height / (box.offsetHeight || 1), cs = getComputedStyle(box);
  const bottom = br.bottom - (parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth || 0)) * k + 0.5;
  const right = br.right - (parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth || 0)) * k + 0.5;
  const outside = (r) => r.bottom > bottom || r.left > right;
  for (const p of flow.querySelectorAll('p.para')) {
    const pr = p.getBoundingClientRect();
    if (!outside(pr) && pr.right <= right + 1) continue;
    const at = { p: +p.dataset.pi, c: +p.dataset.c0 };
    if (p.dataset.empty) return at;
    // characters of this paragraph in order (bullets and leader dots are not part of the story; a tab or a field is one piece)
    const { units, total } = paraUnits(p);
    if (!units.length) continue;
    const unitAt = (i) => { let j = units.length - 1; while (j > 0 && units[j].d > i) j--; return units[j]; };
    const rectAt = (i) => {
      const u = unitAt(i);
      if (!u.node) { const rs = u.el.getClientRects(); return rs[rs.length - 1] || u.el.getBoundingClientRect(); }
      const r = document.createRange(); r.setStart(u.node, i - u.d); r.setEnd(u.node, i - u.d + 1); const rs = r.getClientRects(); return rs[rs.length - 1] || r.getBoundingClientRect();
    };
    let lo = 0, hi = total; // first character outside
    while (lo < hi) { const mid = (lo + hi) >> 1; if (outside(rectAt(mid))) hi = mid; else lo = mid + 1; }
    if (lo >= total) continue;
    // break at the start of that line, never in the middle of a word
    const lineTop = rectAt(lo).top;
    while (lo > 0 && Math.abs(rectAt(lo - 1).top - lineTop) < 1) lo--;
    const u = unitAt(lo);
    lo = u.m + (u.node ? lo - u.d : 0);
    return { p: at.p, c: at.c + lo };
  }
  return null;
}
// Flow every chain of linked text boxes inside root (a page or the whole page list)
export function flowLinkedText(root, opts = {}) {
  const chains = new Map();
  for (const box of root.querySelectorAll('.text[data-chain]')) { const id = box.dataset.chain; if (!chains.has(id)) chains.set(id, []); chains.get(id).push(box); }
  let overflowing = 0;
  for (const boxes of chains.values()) {
    boxes.sort((a, b) => a.dataset.chainIndex - b.dataset.chainIndex);
    const paras = boxes[0].__item.paras;
    let start = { p: 0, c: 0 };
    boxes.forEach((box, k) => {
      const ctx = { uid: 0, embedded: opts.embedded || new Set(), pending: [], defaultFont: 'Times New Roman', lastSize: 10, note() {}, ...(box.__ctx || {}) };
      const flow = box.querySelector('.flow'); flow.textContent = '';
      if (!start) return; // the story already ended in an earlier box
      parasInto(flow, sliceParas(paras, start), ctx, start); wrapFlow(box, flow); layoutBox(box);
      if (k === boxes.length - 1) return;
      const cut = findCut(box, flow);
      if (!cut) { start = null; return; }
      flow.textContent = '';
      parasInto(flow, sliceParas(paras, start, cut), ctx, start); wrapFlow(box, flow); layoutBox(box);
      start = cut;
    });
  }
  return { chains: chains.size, overflowing };
}

// Headings and short boxes are sized to Publisher's own font metrics; a stand-in font can be a little
// taller. Rather than hiding the end of a heading, tighten the line spacing and then the text size
// (at most 20%) until it fits. Linked boxes are left alone: their text flows on instead.
function overBottom(box, flow) {
  // in unscaled CSS pixels: is the text (ignoring trailing empty paragraphs) taller than the box?
  const cs = getComputedStyle(box);
  const room = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) + 1;
  const ps = [...flow.querySelectorAll('p.para')]; if (!ps.length) return false;
  let i = ps.length - 1; while (i > 0 && ps[i].dataset.empty) i--;
  const used = ps[i].offsetTop + ps[i].offsetHeight - ps[0].offsetTop + (parseFloat(getComputedStyle(ps[0]).marginTop) || 0);
  return used > room;
}
export function fitText(root) {
  let fitted = 0, overflowing = 0;
  for (const box of root.querySelectorAll('.text')) {
    layoutBox(box); // tab widths and wrap floats need the page laid out
    if (!box.textContent.replace(/[\s\u200b]/g, '')) continue; // empty boxes (often tiny coloured squares) have nothing to fit
    if (box.__item?.edited) { if (overBottom(box, box.querySelector('.flow'))) { overflowing++; box.classList.add('overflow'); } continue; } // text the person typed is never shrunk
    if (box.dataset.chain) { if (box.dataset.chainIndex == String(+box.__item?.chainLength - 1) && overBottom(box, box.querySelector('.flow'))) { overflowing++; box.classList.add('overflow'); } continue; }
    const flow = box.querySelector('.flow');
    if (!flow) continue;
    // a word wider than its box would be split mid-word; Publisher never does that, so treat it as not fitting
    flow.style.overflowWrap = 'normal';
    const tooWide = () => flow.scrollWidth > flow.clientWidth + 1;
    const hasTabs = !!flow.querySelector('span.tab'), hasDrop = !!flow.querySelector('p.para.dropcap');
    const over = () => { if (hasTabs) layoutTabs(box); return overBottom(box, flow) || tooWide(); };
    if (!over()) continue;
    const ps = [...flow.querySelectorAll('p.para')], spans = [...flow.querySelectorAll('span:not(.tab):not(.pw-gen)')];
    const base = spans.map((sp) => parseFloat(sp.dataset.fs0 ??= sp.style.fontSize) || 0);
    const pbase = ps.map((p) => parseFloat(p.dataset.fs0 ??= p.style.fontSize) || 0);
    let ok = false;
    if (!tooWide()) for (const lh of ['1.1', '1.0', '0.92']) { ps.forEach((p) => { if (!p.dataset.lh) p.style.lineHeight = lh; }); if (!over()) { ok = true; break; } }
    for (let k = 0.95; !ok && k >= 0.8 - 1e-9; k -= 0.05) {
      spans.forEach((sp, i) => { if (base[i]) sp.style.fontSize = `${(base[i] * k).toFixed(2)}pt`; });
      ps.forEach((p, i) => { if (pbase[i]) p.style.fontSize = `${(pbase[i] * k).toFixed(2)}pt`; });
      if (hasDrop) refreshDropCaps(flow);
      if (!over()) ok = true;
    }
    if (tooWide()) flow.style.overflowWrap = ''; // still too wide: let the long word break rather than be cut off
    if (ok) { fitted++; box.classList.add('fitted'); } else { overflowing++; box.classList.add('overflow'); }
  }
  return { fitted, overflowing };
}

let uid = 0;
// -> { el, done: Promise } ; ctx collects notes about anything shown differently
export function renderPage(page, doc, opts = {}) {
  // ctx.page / pageNumber / pageCount let text show page numbers and flow around pictures
  const n = opts.pageNumber ?? (doc?.pages ? doc.pages.findIndex((q) => q === page || (page.id && q.id === page.id)) + 1 : 1);
  const ctx = { uid: ++uid, embedded: opts.embedded || new Set(), pending: [], defaultFont: 'Times New Roman', lastSize: 10, note: opts.note || (() => {}), page, doc, pageNumber: n > 0 ? n : 1, pageCount: opts.pageCount ?? doc?.pages?.length ?? 1 };
  const p = el('div', 'page', { width: pt(page.w), height: pt(page.h) });
  p.dataset.page = page.id; p.__page = page;
  // a master page's items (background, header, page numbers) are drawn under the page's own, and can't be picked here
  const master = page.master && typeof page.master === 'string' ? doc?.masters?.find((m) => m.id === page.master) : null;
  addCss();
  if (master) { const before = p.childElementCount; itemsInto(p, master.items, { ...ctx, fromMaster: true, layer: flatItems(master.items) }); [...p.children].slice(before).forEach((c) => { c.classList.add('from-master'); c.dataset.master = master.id; }); }
  ctx.layer = flatItems(page.items); // the order things are stacked in, for text wrap
  itemsInto(p, page.items, ctx);
  return { el: p, done: Promise.all(ctx.pending) };
}
