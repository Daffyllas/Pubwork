// Scribus (.sla), the free page-layout program: one Scribus document (version 1.5/1.6 format) with every
// page at its own size and a 3 mm bleed for the print shop. Text boxes stay text frames with their words,
// fonts, sizes, colours, alignment and spacing; pictures go inside the file (Scribus keeps them as
// "embedded images", so the one .sla file is all that is needed); shapes and lines stay vector shapes.
// Tables come as a group of text frames with their lines. Anything Scribus can't draw (gradients,
// shadows, cut pictures) comes as a sharp picture of what was on screen (see collect.js).
import { zlibSync } from 'fflate';
import { collectPages, parseBorder, tableGrid, withLists } from './collect.js';
import { safeName } from './stage.js';
import { isUS } from './layout.js';
import { fieldText } from '../render.js';
import { bytesToB64 } from './pagetext.js';
import { proPicture, fontFace, bleedEdges, applyFit, roomForText, nativeWrap, BLEED, hex6, rotCorner, pathCmds } from './prohelp.js';

const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const n = (v) => String(+(+v || 0).toFixed(4));
const PAGE_X = 100, PAGE_Y = 20, GAP = 40; // where Scribus puts the first page on its desk, and the gap between pages

// colours are named in Scribus; each colour used gets one name
class Colours {
  constructor() { this.map = new Map([['000000', 'Black'], ['FFFFFF', 'White']]); }
  get(c) {
    const h = hex6(c); if (!h) return 'None';
    if (!this.map.has(h)) this.map.set(h, `Pub ${h}`);
    return this.map.get(h);
  }
  xml() {
    let out = '<COLOR NAME="Black" SPACE="CMYK" C="0" M="0" Y="0" K="100"/><COLOR NAME="White" SPACE="CMYK" C="0" M="0" Y="0" K="0"/><COLOR NAME="Registration" SPACE="CMYK" C="100" M="100" Y="100" K="100" Register="1"/>';
    for (const [h, name] of this.map) if (name.startsWith('Pub ')) out += `<COLOR NAME="${name}" SPACE="RGB" R="${parseInt(h.slice(0, 2), 16)}" G="${parseInt(h.slice(2, 4), 16)}" B="${parseInt(h.slice(4, 6), 16)}"/>`;
    return out;
  }
}

// qCompress, as Scribus reads embedded pictures: the length (4 bytes, big-endian) and the zlib data
function qCompress(bytes) {
  const z = zlibSync(bytes, { level: 6 }), out = new Uint8Array(z.length + 4);
  const L = bytes.length; out[0] = (L >>> 24) & 255; out[1] = (L >>> 16) & 255; out[2] = (L >>> 8) & 255; out[3] = L & 255;
  out.set(z, 4); return out;
}

// ------------------------------------------------------------------ text
const ALIGN = { left: 0, center: 1, right: 2, justify: 3 };
function charAttrs(r, ctx, size) {
  const font = fontFace(r.font || 'Times New Roman', r.bold, r.italic);
  ctx.fonts.add(font);
  let a = ` FONT="${x(font)}" FONTSIZE="${n(size)}" FCOLOR="${ctx.col.get(r.color || '#000000')}" FSHADE="100"`;
  const feats = [];
  if (r.underline) feats.push('underline');
  if (r.strike) feats.push('strike');
  if (r.caps === 'all') feats.push('allcaps');
  if (r.caps === 'small') feats.push('smallcaps');
  if (r.position === 'super') feats.push('superscript');
  if (r.position === 'sub') feats.push('subscript');
  if (r.outline) { feats.push('outline'); a += ` SCOLOR="${ctx.col.get(r.color || '#000000')}" TXTOUT="1"`; }
  if (r.shadow) { feats.push('shadowed'); a += ' SCOLOR="Black" TXTSHX="5" TXTSHY="-5"'; }
  a += ` FEATURES="${feats.length ? feats.join(' ') : 'inherit'}"`;
  if (r.highlight && hex6(r.highlight)) a += ` BGCOLOR="${ctx.col.get(r.highlight)}" BGSHADE="100"`;
  if (r.tracking) a += ` KERN="${n((r.tracking / Math.max(1, size)) * 100)}"`;
  if (r.lang) a += ` LANGUAGE="${x(String(r.lang).replace('-', '_'))}"`;
  return a;
}
// a run's text, with tabs and line breaks as their own elements
function runXml(text, attrs) {
  let out = '';
  for (const part of String(text).split(/(\t|\n|\u000b)/)) {
    if (!part) continue;
    if (part === '\t') out += `<tab${attrs}/>`;
    else if (part === '\n' || part === '\u000b') out += `<breakline${attrs}/>`;
    else out += `<ITEXT${attrs} CH="${x(part)}"/>`;
  }
  return out;
}
function paraAttrs(pa, size, ctx) {
  let a = ` ALIGN="${ALIGN[pa.runs.some((r) => r.text.includes('\t')) ? 'left' : pa.align] ?? 0}"`;
  a += ` INDENT="${n(pa.indentLeft || 0)}" RMARGIN="${n(pa.indentRight || 0)}" FIRST="${n(pa.cont ? 0 : pa.indentFirst || 0)}"`;
  a += ` VOR="${n(pa.cont ? 0 : pa.spaceBefore || 0)}" NACH="${n(pa.spaceAfter || 0)}"`;
  if (pa.lineHeight?.pt) a += ` LINESPMode="0" LINESP="${n(pa.lineHeight.pt)}"`;
  else if (pa.lineHeight?.mult) a += ` LINESPMode="0" LINESP="${n(pa.lineHeight.mult * 1.2 * size)}"`;
  else a += ` LINESPMode="0" LINESP="${n(size * 1.15)}"`; // "normal" spacing on the page is about 1.15 × the size
  if (pa.background && hex6(pa.background)) a += ` BCOLOR="${ctx.col.get(pa.background)}" BSHADE="100"`;
  if (pa.dropCap?.lines >= 2 && !pa.cont) a += ` DROP="1" DROPLIN="${Math.min(10, Math.round(pa.dropCap.lines))}" DROPDIST="0"`;
  else a += ' DROP="0"';
  // tab stops count from the frame's left edge in Scribus, as in Pubwork; a hanging bullet gets one where the words start
  const tabs = [...(pa.tabs || [])];
  const mark = pa.list && !pa.cont, hang = mark && pa.indentFirst < 0;
  if (hang && !tabs.length) tabs.push({ pos: pa.indentLeft || 0, align: 'left' });
  const kids = tabs.map((t) => `<Tabs Type="${{ right: 1, decimal: 2, center: 4 }[t.align] || 0}" Pos="${n(t.pos)}" Fill="${t.leader === 'dot' ? '.' : t.leader === 'dash' ? '-' : t.leader === 'line' || t.leader === 'solid' ? '_' : ''}"/>`).join('');
  return { a, kids };
}
function storyXml(paras, ctx, page) {
  if (!paras.length) return '<StoryText><DefaultStyle/><trail/></StoryText>';
  let out = '<StoryText><DefaultStyle/>';
  paras.forEach((pa, i) => {
    const size = Math.max(0, ...pa.runs.map((r) => r.size || 0)) || ctx.lastSize || 10;
    const first = pa.runs.find((r) => r.text) || pa.runs[0] || {};
    if (pa.list && !pa.cont) out += runXml(`${pa.list.text}${pa.indentFirst < 0 ? '\t' : ' '}`, charAttrs({ ...first, underline: false, strike: false, highlight: null }, ctx, first.size || size));
    for (const r of pa.runs) {
      if (r.size) ctx.lastSize = r.size;
      const at = charAttrs(r, ctx, r.size || size);
      if (r.field === 'page') out += `<var name="pgno"${at}/>`;
      else if (r.field === 'pages') out += `<var name="pgco"${at}/>`;
      else if (r.field) out += runXml(fieldText(r.field, page) || r.text, at);
      else if (r.text) out += runXml(r.text, at);
    }
    const { a, kids } = paraAttrs(pa, size, ctx);
    const tag = i === paras.length - 1 ? 'trail' : 'para';
    out += kids ? `<${tag}${a}>${kids}</${tag}>` : `<${tag}${a}/>`;
  });
  return out + '</StoryText>';
}

// ------------------------------------------------------------------ frames
// common attributes: the place on the Scribus desk (turned around the top-left corner, as Scribus turns)
function place(it, ctx, extra = {}) {
  const [cx, cy] = rotCorner(it);
  const X = ctx.px + cx, Y = ctx.py + cy;
  const w = Math.max(it.w, 0.01), h = Math.max(it.h, 0.01);
  const rot = ((it.rot || 0) % 360 + 360) % 360;
  return ` XPOS="${n(X)}" YPOS="${n(Y)}" OwnPage="${ctx.page}" ItemID="${++ctx.ids}" WIDTH="${n(w)}" HEIGHT="${n(h)}"${rot ? ` ROT="${n(rot)}"` : ''} gXpos="${n(extra.gx ?? X)}" gYpos="${n(extra.gy ?? Y)}" gWidth="${n(extra.gw ?? 0)}" gHeight="${n(extra.gh ?? 0)}" LAYER="0" NEXTITEM="-1" BACKITEM="-1"`;
}
// text wrap: Scribus flows the text of frames below around the item's contour line, here its box widened by the gap
const flow = (it) => (it.wrap ? ` TEXTFLOWMODE="3"` : ' TEXTFLOWMODE="0"');
const contour = (it, d) => (it.wrap ? rectPath(it.w + 2 * it.wrap.gap, it.h + 2 * it.wrap.gap).replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, a, b) => `${n(+a - it.wrap.gap)} ${n(+b - it.wrap.gap)}`) : d);
const rectPath = (w, h) => `M0 0 L${n(w)} 0 L${n(w)} ${n(h)} L0 ${n(h)} L0 0 Z`;
function lineAttrs(s, ctx) {
  if (!s || !s.width) return ' PWIDTH="0" PCOLOR2="None" PLINEART="1"';
  let a = ` PWIDTH="${n(s.width)}" PCOLOR2="${ctx.col.get(s.color)}" PLINEART="${s.dash ? (s.dash[0] < 1.5 * s.width ? 3 : 2) : 1}"`;
  if (s.cap === 'round') a += ' PLINEEND="32" PLINEJOIN="128"';
  if (s.opacity != null && s.opacity < 1) a += ` TransValueS="${n(1 - s.opacity)}"`;
  return a;
}
function fillAttrs(f, ctx) {
  if (!f || !hex6(f.color)) return ' PCOLOR="None"';
  return ` PCOLOR="${ctx.col.get(f.color)}" SHADE="100"${f.opacity != null && f.opacity < 1 ? ` TransValue="${n(1 - f.opacity)}"` : ''}`;
}

function textFrame(it, ctx, extra) {
  const [t, r, b, l] = it.pad || [0, 0, 0, 0];
  const story = storyXml(it.paras || [], ctx, { pageNumber: it.pageNumber, pageCount: it.pageCount });
  return `<PAGEOBJECT${place(it, ctx, extra)} PTYPE="4" FRTYPE="0" CLIPEDIT="0"${fillAttrs(it.fill, ctx)}${lineAttrs(it.stroke, ctx)} ANNAME="Text ${ctx.ids}" LOCALSCX="1" LOCALSCY="1" LOCALX="0" LOCALY="0" LOCALROT="0" PICART="1" SCALETYPE="1" RATIO="1" COLUMNS="${Math.max(1, it.columns || 1)}" COLGAP="${n(it.columns > 1 ? it.columnGap || 0 : 0)}" AUTOTEXT="0" EXTRA="${n(l)}" TEXTRA="${n(t)}" BEXTRA="${n(b)}" REXTRA="${n(r)}" VAlign="${{ middle: 1, bottom: 2 }[it.valign] || 0}" FLOP="1" PLTSHOW="0" BASEOF="0" textPathType="0" textPathFlipped="0" TEXTFLOWMODE="0" path="${rectPath(it.w, it.h)}" copath="${rectPath(it.w, it.h)}">${story}</PAGEOBJECT>`;
}
async function imageFrame(it, ctx, extra) {
  const pic = await proPicture(it, ctx.pageEl);
  if (!pic) return '';
  // the picture fills its frame (Scribus works the scale out again when it opens the file)
  const sx = it.w / Math.max(0.01, (pic.pw * 72) / pic.dpi), sy = it.h / Math.max(0.01, (pic.ph * 72) / pic.dpi);
  return `<PAGEOBJECT${place(it, ctx, extra)} PTYPE="2" FRTYPE="0" CLIPEDIT="0" PCOLOR="None"${lineAttrs(it.stroke, ctx)} ANNAME="Picture ${ctx.ids}" LOCALSCX="${n(sx)}" LOCALSCY="${n(sy)}" LOCALX="0" LOCALY="0" LOCALROT="0" PICART="1" SCALETYPE="0" RATIO="0" Pagenumber="0" PFILE="" isInlineImage="1" inlineImageExt="${pic.ext === 'jpeg' ? 'jpg' : pic.ext}" ImageData="${bytesToB64(qCompress(pic.bytes))}" IRENDER="0" EMBEDDED="0"${flow(it)} path="${rectPath(it.w, it.h)}" copath="${contour(it, rectPath(it.w, it.h))}"/>`;
}
function shapeFrame(it, ctx, extra) {
  const base = `${fillAttrs(it.fill, ctx)}${lineAttrs(it.stroke, ctx)}${flow(it)}`;
  if (it.geom === 'rect' || it.geom === 'roundRect') {
    const rr = it.geom === 'roundRect' ? Math.min(it.rx || 0, it.w / 2, it.h / 2) : 0;
    const d = rr ? pathCmds([['M', [rr, 0]], ['L', [it.w - rr, 0]], ['C', [it.w - rr * 0.4477, 0], [it.w, rr * 0.4477], [it.w, rr]], ['L', [it.w, it.h - rr]], ['C', [it.w, it.h - rr * 0.4477], [it.w - rr * 0.4477, it.h], [it.w - rr, it.h]], ['L', [rr, it.h]], ['C', [rr * 0.4477, it.h], [0, it.h - rr * 0.4477], [0, it.h - rr]], ['L', [0, rr]], ['C', [0, rr * 0.4477], [rr * 0.4477, 0], [rr, 0]], ['Z']], n) : rectPath(it.w, it.h);
    return `<PAGEOBJECT${place(it, ctx, extra)} PTYPE="6" FRTYPE="${rr ? 2 : 0}"${rr ? ` RADRECT="${n(rr)}"` : ''} CLIPEDIT="0"${base} ANNAME="Shape ${ctx.ids}" path="${d}" copath="${contour(it, d)}"/>`;
  }
  if (it.geom === 'ellipse') {
    const w = it.w, h = it.h, k = 0.5522847;
    const d = `M${n(w)} ${n(h / 2)} C${n(w)} ${n(h / 2 + (h / 2) * k)} ${n(w / 2 + (w / 2) * k)} ${n(h)} ${n(w / 2)} ${n(h)} C${n(w / 2 - (w / 2) * k)} ${n(h)} 0 ${n(h / 2 + (h / 2) * k)} 0 ${n(h / 2)} C0 ${n(h / 2 - (h / 2) * k)} ${n(w / 2 - (w / 2) * k)} 0 ${n(w / 2)} 0 C${n(w / 2 + (w / 2) * k)} 0 ${n(w)} ${n(h / 2 - (h / 2) * k)} ${n(w)} ${n(h / 2)} Z`;
    return `<PAGEOBJECT${place(it, ctx, extra)} PTYPE="6" FRTYPE="1" CLIPEDIT="0"${base} ANNAME="Shape ${ctx.ids}" path="${d}" copath="${contour(it, d)}"/>`;
  }
  const cmds = it.path.cmds, pts = cmds.filter((c) => c[0] !== 'Z');
  if (pts.length === 2 && pts[0][0] === 'M' && pts[1][0] === 'L' && !it.path.closed) {
    // a straight line: Scribus keeps it as a line from its start, with a length and a turn
    let [a, b] = [pts[0][1], pts[1][1]];
    if (it.rot) {
      const t = (it.rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      const r = ([px, py]) => [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
      a = r(a); b = r(b);
    }
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = ((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 360) % 360;
    const X = ctx.px + a[0], Y = ctx.py + a[1];
    return `<PAGEOBJECT XPOS="${n(X)}" YPOS="${n(Y)}" OwnPage="${ctx.page}" ItemID="${++ctx.ids}" PTYPE="5" WIDTH="${n(len)}" HEIGHT="1" FRTYPE="0" CLIPEDIT="0"${ang ? ` ROT="${n(ang)}"` : ''} PCOLOR="None"${lineAttrs(it.stroke, ctx)} TEXTFLOWMODE="0" ANNAME="Line ${ctx.ids}" path="" gXpos="${n(extra.gx ?? X)}" gYpos="${n(extra.gy ?? Y)}" gWidth="${n(extra.gw ?? 0)}" gHeight="${n(extra.gh ?? 0)}" LAYER="0" NEXTITEM="-1" BACKITEM="-1"/>`;
  }
  const local = cmds.map((c) => (c[0] === 'Z' ? c : [c[0], ...c.slice(1).map(([px, py]) => [px - it.x, py - it.y])]));
  const d = pathCmds(local, n) + (it.path.closed && cmds[cmds.length - 1]?.[0] !== 'Z' ? ' Z' : '');
  const open = !it.path.closed;
  return `<PAGEOBJECT${place(it, ctx, extra)} PTYPE="${open ? 7 : 6}" FRTYPE="3" CLIPEDIT="1"${open ? ' PCOLOR="None"' + lineAttrs(it.stroke, ctx) + ' TEXTFLOWMODE="0"' : base} ANNAME="Shape ${ctx.ids}" path="${d}" copath="${contour(it, d)}"/>`;
}
// a table: a text frame for each cell, and its lines, kept together as one group
function tableGroup(it, ctx) {
  const grid = tableGrid(it);
  const colX = [it.x]; it.cols.forEach((c) => colX.push(colX[colX.length - 1] + c));
  const rowY = [it.y]; it.rowHeights.forEach((h) => rowY.push(rowY[rowY.length - 1] + h));
  const W = colX[colX.length - 1] - it.x, H = rowY[rowY.length - 1] - it.y;
  const GX = ctx.px + it.x, GY = ctx.py + it.y;
  const extra = (x0, y0) => ({ gx: ctx.px + x0 - GX, gy: ctx.py + y0 - GY, gw: W, gh: H });
  let kids = ''; const lines = [];
  grid.forEach((row, r) => row.forEach((g, c) => {
    if (!g || !g.origin) return;
    const cs = g.cell.span?.[0] || 1, rs = g.cell.span?.[1] || 1, cell = g.cell;
    const bx = colX[c], by = rowY[r], bw = colX[Math.min(c + cs, it.cols.length)] - bx, bh = rowY[Math.min(r + rs, it.rowHeights.length)] - by;
    kids += textFrame({ x: bx, y: by, w: bw, h: bh, rot: 0, pad: [2, 4, 2, 4], valign: cell.valign, fill: cell.fill ? { color: cell.fill, opacity: 1 } : null, paras: cell.paras || [], pageNumber: ctx.page + 1, pageCount: ctx.pageCount }, ctx, extra(bx, by));
    const b = (cell.borders || []).map(parseBorder);
    if (b[0]) lines.push([bx, by, bx + bw, by, b[0]]);
    if (b[1]) lines.push([bx + bw, by, bx + bw, by + bh, b[1]]);
    if (b[2]) lines.push([bx, by + bh, bx + bw, by + bh, b[2]]);
    if (b[3]) lines.push([bx, by, bx, by + bh, b[3]]);
  }));
  // a line two cells share is drawn once
  const seen = new Set();
  for (const [x1, y1, x2, y2, b] of lines) {
    const key = [x1, y1, x2, y2].map((v) => v.toFixed(1)).join() + b.color + b.width.toFixed(2) + b.style;
    if (seen.has(key)) continue; seen.add(key);
    kids += shapeFrame({ type: 'shape', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), rot: 0, path: { cmds: [['M', [x1, y1]], ['L', [x2, y2]]], closed: false }, stroke: { color: b.color, width: b.width, dash: b.style === 'dashed' ? [3, 2] : b.style === 'dotted' ? [1, 1] : null } }, ctx, extra(Math.min(x1, x2), Math.min(y1, y2)));
  }
  if (!kids) return '';
  return `<PAGEOBJECT XPOS="${n(GX)}" YPOS="${n(GY)}" OwnPage="${ctx.page}" ItemID="${++ctx.ids}" PTYPE="12" WIDTH="${n(W)}" HEIGHT="${n(H)}" FRTYPE="0" CLIPEDIT="0" PCOLOR="None" PCOLOR2="None" ANNAME="Table ${ctx.ids}" groupWidth="${n(W)}" groupHeight="${n(H)}" groupClips="0" path="${rectPath(W, H)}" copath="${rectPath(W, H)}" gXpos="${n(GX)}" gYpos="${n(GY)}" gWidth="0" gHeight="0" LAYER="0">${kids}</PAGEOBJECT>`;
}

async function itemXml(it, ctx) {
  if (it.type === 'text') return textFrame(it, ctx, {});
  if (it.type === 'image') return imageFrame(it, ctx, {});
  if (it.type === 'shape') return shapeFrame(it, ctx, {});
  if (it.type === 'table') return tableGroup(it, ctx);
  return '';
}

const pageAttrs = (pg, X, Y, num, master) => `PAGEXPOS="${n(X)}" PAGEYPOS="${n(Y)}" PAGEWIDTH="${n(pg.w)}" PAGEHEIGHT="${n(pg.h)}" BORDERLEFT="0" BORDERRIGHT="0" BORDERTOP="0" BORDERBOTTOM="0" NUM="${num}" NAM="${master ? 'Normal' : ''}" MNAM="${master ? '' : 'Normal'}" Size="Custom" Orientation="${pg.w > pg.h ? 1 : 0}" LEFT="0" PRESET="0" VerticalGuides="" HorizontalGuides="" AGhorizontalAutoGap="0" AGverticalAutoGap="0" AGhorizontalAutoCount="0" AGverticalAutoCount="0" AGhorizontalAutoRefer="0" AGverticalAutoRefer="0" AGSelection="0 0 0 0" pageEffectDuration="1" pageViewDuration="1" effectType="0" Dm="0" M="0" Di="0"`;

export async function exportSla(doc, pageEls) {
  const pages = await collectPages(doc, pageEls);
  if (!pages.length) throw new Error('There are no pages to save');
  const ctx = { col: new Colours(), fonts: new Set(), ids: 1000, lastSize: 10, pageCount: pages.length };
  let objects = '', pagesXml = '', y = PAGE_Y;
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    nativeWrap(pg, doc, i, pageEls[i], withLists); bleedEdges(pg); applyFit(pg, pageEls[i]); roomForText(pg);
    pagesXml += `<PAGE ${pageAttrs(pg, PAGE_X, y, i, false)}/>`;
    Object.assign(ctx, { px: PAGE_X, py: y, page: i, pageEl: pageEls[i] });
    for (const it of pg.items) objects += await itemXml(it, ctx);
    y += pg.h + GAP;
  }
  const p0 = pages[0], dfont = [...ctx.fonts][0] || 'Arial Regular';
  const b = n(BLEED);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SCRIBUSUTF8NEW Version="1.5.8">
<DOCUMENT ANZPAGES="${pages.length}" PAGEWIDTH="${n(p0.w)}" PAGEHEIGHT="${n(p0.h)}" BORDERLEFT="0" BORDERRIGHT="0" BORDERTOP="0" BORDERBOTTOM="0" PRESET="0" BleedTop="${b}" BleedLeft="${b}" BleedRight="${b}" BleedBottom="${b}" ORIENTATION="${p0.w > p0.h ? 1 : 0}" PAGESIZE="Custom" FIRSTNUM="1" BOOK="0" AUTOSPALTEN="1" ABSTSPALTEN="11" UNITS="${isUS(p0) ? 2 : 1}" DFONT="${x(dfont)}" DSIZE="10" DCOL="1" DGAP="0" TabFill="" TabWidth="36" TextDistLeft="0" TextDistRight="0" TextDistBottom="0" TextDistTop="0" FirstLineOffset="1" AUTHOR="${x(doc.meta?.author || '')}" COMMENTS="" KEYWORDS="" PUBLISHER="" DOCDATE="" DOCTYPE="" DOCFORMAT="" DOCIDENT="" DOCSOURCE="" DOCLANGINFO="" DOCRELATION="" DOCCOVER="" DOCRIGHTS="" DOCCONTRIB="" TITLE="${x(doc.name || '')}" SUBJECT="" VHOCH="33" VHOCHSC="66" VTIEF="33" VTIEFSC="66" VKAPIT="75" BASEGRID="14.4" BASEO="0" AUTOL="100" UnderlinePos="-1" UnderlineWidth="-1" StrikeThruPos="-1" StrikeThruWidth="-1" GROUPC="1" HCMS="0" DPSo="0" DPSFo="0" DPuse="0" DPgam="0" DPbla="1" DISc="1" DIIm="0" ALAYER="0" LANGUAGE="en_US" AUTOMATIC="1" AUTOCHECK="0" GUIDELOCK="0" SnapToGuides="0" SnapToGrid="0" SnapToElement="0" SHOWGRID="0" SHOWGUIDES="1" showcolborders="1" SHOWFRAME="1" SHOWControl="0" SHOWLAYERM="0" SHOWMARGIN="1" SHOWBASE="0" SHOWPICT="1" SHOWLINK="0" rulerMode="1" showrulers="1" showBleed="1" rulerXoffset="0" rulerYoffset="0" ScratchBottom="20" ScratchLeft="${PAGE_X}" ScratchRight="100" ScratchTop="${PAGE_Y}" GapHorizontal="0" GapVertical="${GAP}" StartArrow="0" EndArrow="0" PEN="Black" BRUSH="None" PENLINE="Black" PENTEXT="Black" StrokeText="Black" TextBackGround="None" TextLineColor="None" TextBackGroundShade="100" TextLineShade="100" TextPenShade="100" TextStrokeShade="100" STIL="1" STILLINE="1" WIDTH="1" WIDTHLINE="1" PENSHADE="100" LINESHADE="100" BRUSHSHADE="100" CPICT="None" PICTSHADE="100" CSPICT="None" PICTSSHADE="100" PICTSCX="1" PICTSCY="1" PSCALE="1" PASPECT="1" EmbeddedPath="0" HalfRes="1" dispX="10" dispY="10" constrain="15" PAGEC="#ffffff" MARGC="#0000ff" RANDF="0" currentProfile="PDF/X-4">
${ctx.col.xml()}
<HYPHEN/>
<CHARSTYLE CNAME="Default Character Style" DefaultStyle="1" FONT="${x(dfont)}" FONTSIZE="10" FONTFEATURES="" FEATURES="inherit" FCOLOR="Black" FSHADE="100" HyphenWordMin="3" SCOLOR="Black" BGCOLOR="None" BGSHADE="100" SSHADE="100" TXTSHX="5" TXTSHY="-5" TXTOUT="1" TXTULP="-0.1" TXTULW="-0.1" TXTSTP="-0.1" TXTSTW="-0.1" SCALEH="100" SCALEV="100" BASEO="0" KERN="0" LANGUAGE="en_US"/>
<STYLE NAME="Default Paragraph Style" DefaultStyle="1" ALIGN="0" DIRECTION="0" LINESPMode="1" LINESP="12" INDENT="0" RMARGIN="0" FIRST="0" VOR="0" NACH="0" ParagraphEffectOffset="0" DROP="0" DROPLIN="2" Bullet="0" Numeration="0" HyphenConsecutiveLines="2" BCOLOR="None" BSHADE="100"/>
<LAYERS NUMMER="0" LEVEL="0" NAME="Background" SICHTBAR="1" DRUCKEN="1" EDIT="1" SELECT="0" FLOW="1" TRANS="1" BLEND="0" OUTL="0" LAYERC="#000000"/>
<PDF firstUse="1" Thumbnails="0" Articles="0" Bookmarks="0" Compress="1" CMethod="0" Quality="0" EmbedPDF="0" MirrorH="0" MirrorV="0" Clip="0" rangeSel="0" rangeTxt="" RotateDeg="0" PresentMode="0" RecalcPic="0" FontEmbedding="0" Grayscale="0" RGBMode="1" UseProfiles="0" UseProfiles2="0" Binding="0" PicRes="300" Resolution="300" Version="14" Intent="1" Intent2="0" InfoString="" BTop="${b}" BLeft="${b}" BRight="${b}" BBottom="${b}" useDocBleeds="1" cropMarks="0" bleedMarks="0" registrationMarks="0" colorMarks="0" docInfoMarks="0" markLength="20" markOffset="0" ImagePr="0" PassOwner="" PassUser="" Permissions="-4" Encrypt="0" UseLayers="0" UseLpi="0" UseSpotColors="1" doMultiFile="0" displayBookmarks="0" displayFullscreen="0" displayLayers="0" displayThumbs="0" hideMenuBar="0" hideToolBar="0" fitWindow="0" openAfterExport="0" PageLayout="0" openAction=""/>
<DocItemAttributes/>
<TablesOfContents/>
<PageSets><Set Name="Single Page" FirstPage="0" Rows="1" Columns="1"/><Set Name="Facing Pages" FirstPage="1" Rows="1" Columns="2"><PageNames Name="Left Page"/><PageNames Name="Right Page"/></Set></PageSets>
<Sections><Section Number="0" Name="0" From="0" To="${pages.length - 1}" Type="Type_1_2_3" Start="1" Reversed="0" Active="1" FillChar="0" FieldWidth="0"/></Sections>
<MASTERPAGE ${pageAttrs(p0, PAGE_X, PAGE_Y, 0, true)}/>
${pagesXml}
${objects}
</DOCUMENT>
</SCRIBUSUTF8NEW>
`;
  return { name: `${safeName(doc.name)}.sla`, blob: new Blob([xml], { type: 'application/vnd.scribus' }) };
}
