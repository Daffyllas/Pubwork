// Turns the list of drawing calls from the .pub reader (libmspub, see tools/reader/bridge) into our
// editable document: pages holding shapes, pictures, text boxes and tables. Units are points (1/72 in).

const UNIT = { in: 72, pt: 1, cm: 72 / 2.54, mm: 72 / 25.4, pc: 12, px: 0.75 };
export function toPt(v, fallback = 0) {
  if (v == null) return fallback;
  const m = /^(-?[\d.]+(?:e-?\d+)?)\s*(in|pt|cm|mm|pc|px|%)?$/.exec(String(v).trim());
  if (!m) return fallback;
  const n = parseFloat(m[1]);
  if (m[2] === '%') return n / 100;
  return n * (UNIT[m[2] || 'in'] ?? 72);
}
const pct = (v, d = 1) => { if (v == null) return d; const n = parseFloat(v); return Number.isFinite(n) ? (String(v).includes('%') ? n / 100 : n) : d; };
let nextId = 1;
export const newId = () => `i${nextId++}`;

// Paragraph and character properties we keep (others are ignored for now)
function paraStyle(p = {}) {
  const s = {};
  if (p['fo:text-align']) s.align = p['fo:text-align'] === 'end' ? 'right' : p['fo:text-align'] === 'start' ? 'left' : p['fo:text-align'];
  if (p['fo:margin-top']) s.spaceBefore = toPt(p['fo:margin-top']);
  if (p['fo:margin-bottom']) s.spaceAfter = toPt(p['fo:margin-bottom']);
  if (p['fo:margin-left']) s.indentLeft = toPt(p['fo:margin-left']);
  if (p['fo:margin-right']) s.indentRight = toPt(p['fo:margin-right']);
  if (p['fo:text-indent']) s.indentFirst = toPt(p['fo:text-indent']);
  if (p['fo:line-height']) { const v = String(p['fo:line-height']); s.lineHeight = v.endsWith('%') ? { mult: parseFloat(v) / 100 } : { pt: toPt(v) }; }
  if (p['fo:background-color']) s.background = p['fo:background-color'];
  return s;
}
function spanStyle(p = {}) {
  const s = {};
  if (p['style:font-name']) s.font = p['style:font-name'];
  if (p['fo:font-size']) s.size = toPt(p['fo:font-size']);
  if (p['fo:font-weight'] === 'bold') s.bold = true;
  if (p['fo:font-style'] === 'italic') s.italic = true;
  if (p['style:text-underline-type'] && p['style:text-underline-type'] !== 'none') s.underline = p['style:text-underline-style'] === 'dotted' ? 'dotted' : p['style:text-underline-type'] === 'double' ? 'double' : 'single';
  if (p['style:text-line-through-type'] && p['style:text-line-through-type'] !== 'none') s.strike = true;
  if (p['fo:color']) s.color = p['fo:color'];
  if (p['fo:background-color'] && p['fo:background-color'] !== 'transparent') s.highlight = p['fo:background-color'];
  if (p['fo:text-transform'] === 'uppercase') s.caps = 'all';
  if (p['fo:font-variant'] === 'small-caps') s.caps = 'small';
  if (p['style:text-position']) { const t = String(p['style:text-position']); if (t.startsWith('super')) s.position = 'super'; else if (t.startsWith('sub')) s.position = 'sub'; }
  if (p['fo:text-shadow'] && p['fo:text-shadow'] !== 'none') s.shadow = true;
  if (p['style:text-outline'] === 'true') s.outline = true;
  if (p['fo:letter-spacing']) s.tracking = toPt(p['fo:letter-spacing']);
  if (p['fo:language']) s.lang = p['fo:language'] + (p['fo:country'] ? '-' + p['fo:country'] : '');
  return s;
}
// Publisher's "Recolor picture" and brightness settings, so pictures look as they were set up
function picAdjust(st) {
  const a = {};
  if (st['draw:color-mode'] === 'greyscale' && st['draw:red'] != null) {
    const c = (k) => Math.round(Math.min(1, Math.max(0, pct(st[k], 0))) * 255).toString(16).padStart(2, '0');
    a.recolor = `#${c('draw:red')}${c('draw:green')}${c('draw:blue')}`;
  }
  if (st['draw:luminance'] != null) { const l = pct(st['draw:luminance'], 0.5); if (Math.abs(l - 0.5) > 0.005) a.light = l; }
  return Object.keys(a).length ? a : null;
}
function fillStroke(st) {
  const f = {};
  const fill = st['draw:fill'];
  if (fill === 'solid') f.fill = { type: 'solid', color: st['draw:fill-color'] || '#ffffff', opacity: pct(st['draw:opacity']) };
  else if (fill === 'bitmap' && st['draw:fill-image']) f.fill = { type: 'image', mime: st['librevenge:mime-type'] || 'image/png', data: st['draw:fill-image'], tile: st['style:repeat'] === 'repeat', adjust: picAdjust(st) };
  else if (fill === 'gradient') {
    // libmspub gives the stops as svg:linearGradient and the angle in plain degrees (whatever unit it is labelled with)
    let stops = (Array.isArray(st['svg:linearGradient']) ? st['svg:linearGradient'] : []).map((s) => ({ at: (parseFloat(s['svg:offset']) || 0) / 100, color: s['svg:stop-color'] || '#000000', opacity: pct(s['svg:stop-opacity']) })).sort((a, b) => a.at - b.at);
    if (!stops.length) stops = [{ at: 0, color: st['draw:start-color'] || '#ffffff' }, { at: 1, color: st['draw:end-color'] || '#000000' }];
    const shade = st['libmspub:shade'];
    f.fill = { type: 'gradient', stops, from: stops[0].color, to: stops[stops.length - 1].color, angle: parseFloat(st['draw:angle'] || 0) || 0, turn: parseFloat(st['libmspub:rotate'] || 0) || 0, flipH: st['libmspub:flip-h'] === 'true', flipV: st['libmspub:flip-v'] === 'true', style: shade === 'center' || shade === 'shape' || st['draw:style'] === 'radial' ? 'radial' : 'linear', center: st['libmspub:shade-ref-point'] || null, opacity: pct(st['draw:opacity']) };
  }
  else f.fill = null;
  if (st['draw:stroke'] && st['draw:stroke'] !== 'none') f.stroke = { color: st['svg:stroke-color'] || '#000000', width: toPt(st['svg:stroke-width'], 0.75) || 0.75, dash: st['draw:stroke'] === 'dash' ? [toPt(st['draw:dots1-length'], 3), toPt(st['draw:distance'], 3)] : null, opacity: pct(st['svg:stroke-opacity']) };
  else f.stroke = null;
  // arrowheads (style 1 triangle, 2 stealth, 3 diamond, 4 oval, 5 open; size = width × 3 + length, each 0-2)
  if (f.stroke && st['pubwork:arrow-start']) f.stroke.arrowStart = { style: +st['pubwork:arrow-start'], size: +st['pubwork:arrow-start-size'] || 4 };
  if (f.stroke && st['pubwork:arrow-end']) f.stroke.arrowEnd = { style: +st['pubwork:arrow-end'], size: +st['pubwork:arrow-end-size'] || 4 };
  if (st['draw:shadow'] === 'visible') f.shadow = { dx: toPt(st['draw:shadow-offset-x'], 2), dy: toPt(st['draw:shadow-offset-y'], 2), color: st['draw:shadow-color'] || '#808080', opacity: pct(st['draw:shadow-opacity'], 0.5) };
  if (st['draw:marker-end-path']) f.arrowEnd = true;
  if (st['draw:marker-start-path']) f.arrowStart = true;
  return f;
}
const pts = (list) => (list || []).map((q) => [toPt(q['svg:x']), toPt(q['svg:y'])]);
function bboxOf(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
}
// svg:d comes as a list of {librevenge:path-action, svg:x, svg:y, svg:x1...}
function pathD(list) {
  return (list || []).map((s) => {
    const a = s['librevenge:path-action'];
    const P = (k) => `${toPt(s['svg:x' + k]).toFixed(2)} ${toPt(s['svg:y' + k]).toFixed(2)}`;
    switch (a) {
      case 'M': case 'L': return `${a}${P('')}`;
      case 'C': return `C${P('1')} ${P('2')} ${P('')}`;
      case 'Q': return `Q${P('1')} ${P('')}`;
      case 'A': return `A${toPt(s['svg:rx']).toFixed(2)} ${toPt(s['svg:ry']).toFixed(2)} ${parseFloat(s['librevenge:rotate'] || 0)} ${s['librevenge:large-arc'] === 'true' ? 1 : 0} ${s['librevenge:sweep'] === 'true' ? 1 : 0} ${P('')}`;
      case 'Z': return 'Z';
      default: return '';
    }
  }).join(' ');
}

// Publisher's text-effect shape types (136 = plain text … 175) to the closest WordArt shape Pubwork draws
function wordArtWarp(t) {
  if ([142, 143, 146, 150].includes(t)) return 'circle';
  if ([144, 147, 148, 151, 152, 174].includes(t)) return 'archUp';
  if ([145, 149, 153, 175].includes(t)) return 'archDown';
  if ([156, 157, 158, 159, 166, 167].includes(t)) return 'wave';
  if ([160, 162, 164].includes(t)) return 'bulge';
  if ([161, 163, 165].includes(t)) return 'pinch';
  if ([168, 169, 170, 171].includes(t)) return 'fadeRight';
  if ([138, 140].includes(t)) return 'triangleUp';
  if (t === 172 || t === 154) return 'slantUp';
  if (t === 173 || t === 155) return 'slantDown';
  return 'straight';
}
// Publisher wraps text around pictures, but the file's wrap settings don't come through the reader. A picture
// laid on top of part of a text box would hide words, which Publisher never does: such pictures wrap.
function guessWrap(page) {
  const flat = []; const rec = (l) => l.forEach((it) => (it.type === 'group' ? rec(it.items) : flat.push(it))); rec(page.items);
  const hasWords = (it) => it.type === 'text' && it.paras?.some((p) => p.runs?.some((r) => /\S/.test(r.text || '')));
  flat.forEach((pic, j) => {
    if (pic.type !== 'image' || pic.rotate) return;
    for (const box of flat.slice(0, j)) {
      if (!hasWords(box)) continue;
      const ix = Math.min(box.x + box.w, pic.x + pic.w) - Math.max(box.x, pic.x), iy = Math.min(box.y + box.h, pic.y + pic.h) - Math.max(box.y, pic.y);
      if (ix <= 2 || iy <= 2) continue;
      if (ix * iy >= 0.85 * box.w * box.h) continue; // a picture over the whole box is a background, not something to flow around
      pic.wrap = 'square'; pic.wrapGap = 4; return;
    }
  });
}
export function buildDocument(ops, info = {}) {
  const doc = { version: 1, pages: [], masters: [], fonts: {}, embeddedFonts: [], meta: {}, source: info.source || 'pub', notes: { converted: {}, missing: {} } };
  let page = null, style = {}, text = null, para = null, span = null, table = null, row = null, cell = null;
  const groups = [];
  let lastArt = null;
  const add = (item) => {
    if (!page) return;
    // old-style WordArt: libmspub gives the words with the shape; the app draws them (see wordart/import.js)
    const words = style['pubwork:wordart-text'];
    if (words && item.type === 'shape') {
      const key = `${words}|${style['pubwork:wordart-font']}|${style['pubwork:wordart-type']}`;
      const near = lastArt && lastArt.key === key && Math.abs(lastArt.it.x - item.x) < 40 && Math.abs(lastArt.it.y - item.y) < 40;
      if (near) { // the same WordArt drawn again (its shadow or outline): keep one, with the colours that have a fill
        if (!lastArt.it.fill && item.fill) lastArt.it.fill = item.fill;
        return;
      }
      const flags = (parseInt(style['pubwork:wordart-flags'], 10) || 0) >>> 0;
      item.kind = 'path'; item.wordart = { text: words, font: style['pubwork:wordart-font'] || 'Arial', bold: !!(flags & 0x20), italic: !!(flags & 0x10), warp: wordArtWarp(+style['pubwork:wordart-type']), fromPub: true };
      item.needsWordArt = true; delete item.points; delete item.rx; doc.hasWordArt = true;
      if (style['pubwork:wordart-w']) { // the shape's own box, before it was turned
        Object.assign(item, { x: toPt(style['pubwork:wordart-x']), y: toPt(style['pubwork:wordart-y']), w: toPt(style['pubwork:wordart-w']), h: toPt(style['pubwork:wordart-h']) });
        const r = parseFloat(style['pubwork:wordart-rotate']) || 0; if (Math.abs(r) > 0.01) item.rotate = r;
      }
      lastArt = { key, it: item };
    }
    (groups.length ? groups[groups.length - 1].items : page.items).push(item);
  };
  const note = (k) => { doc.notes.converted[k] = (doc.notes.converted[k] || 0) + 1; };
  const curParas = () => (cell ? cell.paras : text ? text.paras : null);
  for (const op of ops) {
    const p = op.p || {};
    // spot the background page older Publisher files bring as an extra empty page: four line styles, nothing drawn
    if (page) { if (op.o === 'setStyle' && p['draw:stroke'] === 'solid' && p['draw:fill'] === 'none') page.__lines = (page.__lines || 0) + 1; else if (op.o !== 'endPage' && op.o !== 'endMasterPage') page.__drew = true; }
    switch (op.o) {
      case 'setDocumentMetaData': doc.meta = { title: p['dc:title'], author: p['dc:creator'] || p['meta:initial-creator'], created: p['meta:creation-date'], modified: p['dc:date'] }; break;
      case 'defineEmbeddedFont': if (p['office:binary-data']) doc.embeddedFonts.push({ name: p['librevenge:name'], mime: p['librevenge:mime-type'], data: p['office:binary-data'] }); break;
      case 'startPage': case 'startMasterPage': {
        page = { id: newId(), w: toPt(p['svg:width'], 612), h: toPt(p['svg:height'], 792), items: [], master: op.o === 'startMasterPage' };
        if (op.o === 'startMasterPage') doc.masters.push(page); else doc.pages.push(page);
        break;
      }
      case 'endPage': case 'endMasterPage': page = null; break;
      case 'setStyle': style = { ...p }; break;
      case 'startLayer': case 'openGroup': { const g = { id: newId(), type: 'group', items: [] }; add(g); groups.push(g); break; }
      case 'endLayer': case 'closeGroup': { const g = groups.pop(); if (g && g.items.length === 0 && page) { const list = groups.length ? groups[groups.length - 1].items : page.items; list.splice(list.indexOf(g), 1); } break; }
      case 'drawPolygon': case 'drawPolyline': {
        const P = pts(p['svg:points']); if (P.length < 2) break;
        const fs = fillStroke(style), bb = bboxOf(P);
        const closed = op.o === 'drawPolygon';
        // a polygon with a picture fill is how Publisher pictures arrive
        if (closed && fs.fill?.type === 'image' && P.length <= 5) { add({ id: newId(), type: 'image', ...bb, mime: fs.fill.mime, data: fs.fill.data, adjust: fs.fill.adjust, stroke: fs.stroke, points: isAxisRect(P) ? null : P }); break; }
        add({ id: newId(), type: 'shape', kind: closed ? 'polygon' : 'polyline', ...bb, points: P, ...fs, ...(closed ? {} : { fill: null }) });
        break;
      }
      case 'drawRectangle': {
        const x = toPt(p['svg:x']), y = toPt(p['svg:y']), w = toPt(p['svg:width']), h = toPt(p['svg:height']);
        const fs = fillStroke(style);
        if (fs.fill?.type === 'image') add({ id: newId(), type: 'image', x, y, w, h, mime: fs.fill.mime, data: fs.fill.data, adjust: fs.fill.adjust, stroke: fs.stroke });
        else add({ id: newId(), type: 'shape', kind: 'rect', x, y, w, h, rx: toPt(p['svg:rx']), ...fs });
        break;
      }
      case 'drawEllipse': {
        const cx = toPt(p['svg:cx']), cy = toPt(p['svg:cy']), rx = toPt(p['svg:rx']), ry = toPt(p['svg:ry']);
        add({ id: newId(), type: 'shape', kind: 'ellipse', x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry, rotate: parseFloat(p['librevenge:rotate'] || 0), ...fillStroke(style) });
        break;
      }
      case 'drawPath': {
        const d = pathD(p['svg:d']); if (!d) break;
        const nums = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
        add({ id: newId(), type: 'shape', kind: 'path', d, ...bboxOf(nums), ...fillStroke(style) });
        break;
      }
      case 'drawConnector': { const P = pts(p['svg:points'] || [{ 'svg:x': p['svg:x1'], 'svg:y': p['svg:y1'] }, { 'svg:x': p['svg:x2'], 'svg:y': p['svg:y2'] }]); add({ id: newId(), type: 'shape', kind: 'polyline', ...bboxOf(P), points: P, ...fillStroke(style), fill: null }); break; }
      case 'drawGraphicObject': {
        const data = p['office:binary-data']; if (!data) { note('Picture without data'); break; }
        add({ id: newId(), type: 'image', x: toPt(p['svg:x']), y: toPt(p['svg:y']), w: toPt(p['svg:width']), h: toPt(p['svg:height']), mime: p['librevenge:mime-type'] || 'image/png', data, adjust: picAdjust(p), rotate: parseFloat(p['librevenge:rotate'] || 0) });
        break;
      }
      case 'startTextObject': {
        text = { id: newId(), type: 'text', x: toPt(p['svg:x']), y: toPt(p['svg:y']), w: toPt(p['svg:width']), h: toPt(p['svg:height']), rotate: parseFloat(p['librevenge:rotate'] || 0),
          pad: [toPt(p['fo:padding-top'], 3.6), toPt(p['fo:padding-right'], 3.6), toPt(p['fo:padding-bottom'], 3.6), toPt(p['fo:padding-left'], 3.6)],
          story: p['librevenge:pub-text-id'] != null ? +p['librevenge:pub-text-id'] : null,
          valign: p['draw:textarea-vertical-align'] || 'top', columns: parseInt(p['fo:column-count'] || 1, 10) || 1, columnGap: toPt(p['fo:column-gap'], 0), paras: [], ...boxFill(style) };
        add(text);
        break;
      }
      case 'endTextObject': text = null; para = null; span = null; break;
      case 'startTableObject': {
        const cols = (p['librevenge:table-columns'] || []).map((c) => toPt(c['style:column-width']));
        table = { id: newId(), type: 'table', x: toPt(p['svg:x']), y: toPt(p['svg:y']), w: toPt(p['svg:width']), h: toPt(p['svg:height']), cols, rows: [] };
        add(table);
        break;
      }
      case 'openTableRow': if (table) { row = { h: toPt(p['librevenge:row-height'] || p['style:row-height']), cells: [] }; table.rows.push(row); } break;
      case 'closeTableRow': row = null; break;
      case 'openTableCell': case 'insertCoveredTableCell': if (row) {
        cell = { col: +p['librevenge:column'] || row.cells.length, span: [+p['table:number-columns-spanned'] || 1, +p['table:number-rows-spanned'] || 1], covered: op.o === 'insertCoveredTableCell', paras: [], fill: p['fo:background-color'] || null,
          borders: ['top', 'right', 'bottom', 'left'].map((s) => p[`fo:border-${s}`] || null), valign: p['style:vertical-align'] || 'top' };
        row.cells.push(cell);
        if (op.o === 'insertCoveredTableCell') cell = null;
      } break;
      case 'closeTableCell': cell = null; para = null; break;
      case 'endTableObject': table = null; break;
      case 'openParagraph': { const list = curParas(); if (!list) break; para = { ...paraStyle(p), runs: [] }; list.push(para); break; }
      case 'closeParagraph': para = null; span = null; break;
      case 'openListElement': { const list = curParas(); if (!list) break; para = { ...paraStyle(p), runs: [], bullet: p['text:bullet-char'] || '•' }; list.push(para); break; }
      case 'closeListElement': para = null; break;
      case 'openSpan': span = spanStyle(p); break;
      case 'closeSpan': span = null; break;
      // a lone "#" is how the reader passes Publisher's page-number field
      case 'insertText': if (para) { if (op.t === '#') para.runs.push({ ...(span || {}), text: '#', field: 'page' }); else appendRun(para, span, op.t.replace(/\r/g, '')); } break;
      case 'insertSpace': if (para) appendRun(para, span, ' '); break;
      case 'insertTab': if (para) appendRun(para, span, '\t'); break;
      case 'insertLineBreak': if (para) appendRun(para, span, '\n'); break;
      case 'insertField': if (para && p['librevenge:field-type'] === 'text:page-number') para.runs.push({ ...(span || {}), text: '#', field: 'page' }); break;
      default: break;
    }
  }
  // Linked text boxes: libmspub gives every box of a story the whole story; mark the chains so the
  // renderer can flow the text from one box into the next (page order, then columns left to right).
  const byStory = new Map();
  doc.pages.forEach((pg, pi) => { const walkT = (items) => { for (const it of items) { if (it.items) walkT(it.items); else if (it.type === 'text' && it.story != null) { if (!byStory.has(it.story)) byStory.set(it.story, []); byStory.get(it.story).push({ it, pi }); } } }; walkT(pg.items); });
  for (const list of byStory.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.pi - b.pi || Math.round(a.it.x / 9) - Math.round(b.it.x / 9) || a.it.y - b.it.y);
    const chain = newId();
    list.forEach((e, k) => { e.it.chain = chain; e.it.chainIndex = k; e.it.chainLength = list.length; });
  }
  // fonts used, for substitution notes
  const walk = (items) => { for (const it of items) { if (it.items) walk(it.items); for (const pa of it.paras || []) for (const r of pa.runs) if (r.font) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1; for (const row of it.rows || []) for (const c of row.cells) for (const pa of c.paras) for (const r of pa.runs) if (r.font) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1; } };
  for (const pg of [...doc.pages, ...doc.masters]) walk(pg.items);
  const ghost = (pg) => !pg.__drew && pg.__lines >= 1 && pg.__lines <= 4 && !pg.items.length;
  if (doc.pages.some((pg) => !ghost(pg))) doc.pages = doc.pages.filter((pg) => !ghost(pg));
  for (const pg of [...doc.pages, ...doc.masters]) { delete pg.__lines; delete pg.__drew; }
  for (const pg of doc.pages) guessWrap(pg);
  return doc;
}
function boxFill(st) { const f = fillStroke(st); return { fill: f.fill && f.fill.type !== 'image' ? f.fill : null, stroke: f.stroke }; }
function isAxisRect(P) { const xs = new Set(P.map((q) => q[0].toFixed(2))), ys = new Set(P.map((q) => q[1].toFixed(2))); return xs.size <= 2 && ys.size <= 2; }
function appendRun(para, span, t) {
  if (!t) return;
  const st = span || {};
  const last = para.runs[para.runs.length - 1];
  if (last && !last.field && sameStyle(last, st)) last.text += t;
  else para.runs.push({ ...st, text: t });
}
const STYLE_KEYS = ['font', 'size', 'bold', 'italic', 'underline', 'strike', 'color', 'highlight', 'caps', 'position', 'shadow', 'outline', 'tracking', 'lang'];
const sameStyle = (a, b) => STYLE_KEYS.every((k) => a[k] === b[k]);

// counts for tests and the "what was in the file" note
export function summarize(doc) {
  const c = { pages: doc.pages.length, text: 0, image: 0, shape: 0, table: 0, chars: 0 };
  const walk = (items) => { for (const it of items) { if (it.items) { walk(it.items); continue; } c[it.type] = (c[it.type] || 0) + 1; for (const pa of it.paras || []) for (const r of pa.runs) c.chars += r.text.length; for (const row of it.rows || []) for (const cl of row.cells) for (const pa of cl.paras) for (const r of pa.runs) c.chars += r.text.length; } };
  for (const p of doc.pages) walk(p.items);
  return c;
}
