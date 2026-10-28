// InDesign (.idml), the exchange format of Adobe InDesign that Affinity Publisher, QuarkXPress and Scribus
// also open: every page at its own size with a 3 mm bleed, text frames with their own stories (fonts,
// sizes, colours, alignment, spacing, tabs), pictures embedded in their frames, and shapes and lines as
// vector paths. Tables come as a group of text frames with their lines. Anything a layout program can't
// draw (gradients, shadows, cut pictures) comes as a sharp picture of what was on screen (see collect.js).
import { zipSync, strToU8 } from 'fflate';
import { withFonts } from './docfonts.js';
import { collectPages, parseBorder, tableGrid, withLists } from './collect.js';
import { safeName } from './stage.js';
import { fieldText } from '../render.js';
import { bytesToB64 } from './pagetext.js';
import { proPicture, fontStyle, bleedEdges, applyFit, roomForText, nativeWrap, BLEED, hex6 } from './prohelp.js';

const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const n = (v) => String(+(+v || 0).toFixed(4));
const DOM = 'DOMVersion="8.0"';
const PKG = 'xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

class Ids { constructor() { this.k = 0x100; } next() { return `u${(this.k++).toString(16)}`; } }

// colours are swatches in InDesign, named the way InDesign names RGB colours
class Colours {
  constructor() { this.map = new Map([['000000', 'Color/Black'], ['FFFFFF', 'Color/Paper']]); }
  get(c) {
    const h = hex6(c); if (!h) return 'Swatch/None';
    if (!this.map.has(h)) this.map.set(h, `Color/R=${parseInt(h.slice(0, 2), 16)} G=${parseInt(h.slice(2, 4), 16)} B=${parseInt(h.slice(4, 6), 16)}`);
    return this.map.get(h);
  }
  xml() {
    let out = '<Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" ColorOverride="Specialblack" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Black" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>'
      + '<Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" ColorOverride="Specialpaper" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Paper" ColorEditable="true" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>'
      + '<Color Self="Color/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" ColorOverride="Specialregistration" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Registration" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>';
    for (const [h, self] of this.map) {
      if (!self.startsWith('Color/R=')) continue;
      out += `<Color Self="${x(self)}" Model="Process" Space="RGB" ColorValue="${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}" ColorOverride="Normal" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="${x(self.slice(6))}" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937"/>`;
    }
    return out + '<Swatch Self="Swatch/None" Name="None" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>';
  }
}

// ------------------------------------------------------------------ geometry
// Every item is drawn around its own centre: points are relative to the centre, and the item's
// transform turns it (clockwise, as on the page) and moves it there. Spread coordinates have their origin
// in the middle of the page (InDesign's way for pages that are not side by side).
function transform(it, ctx) {
  const t = ((it.rot || 0) * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const cx = it.x + it.w / 2 - ctx.w / 2, cy = it.y + it.h / 2 - ctx.h / 2;
  return `${n(c)} ${n(s)} ${n(-s)} ${n(c)} ${n(cx)} ${n(cy)}`;
}
const pt = (p) => `${n(p[0])} ${n(p[1])}`;
function pathXml(paths) {
  // paths: [{ points: [{a, l, r}], open }]
  return `<Properties><PathGeometry>${paths.map((p) => `<GeometryPathType PathOpen="${p.open ? 'true' : 'false'}"><PathPointArray>${p.points.map((q) => `<PathPointType Anchor="${pt(q.a)}" LeftDirection="${pt(q.l || q.a)}" RightDirection="${pt(q.r || q.a)}"/>`).join('')}</PathPointArray></GeometryPathType>`).join('')}</PathGeometry></Properties>`;
}
const boxPath = (w, h) => [{ points: [[-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2]].map((a) => ({ a })), open: false }];
function ellipsePath(w, h) {
  const rx = w / 2, ry = h / 2, k = 0.5522847;
  return [{ open: false, points: [
    { a: [0, -ry], l: [-rx * k, -ry], r: [rx * k, -ry] },
    { a: [rx, 0], l: [rx, -ry * k], r: [rx, ry * k] },
    { a: [0, ry], l: [rx * k, ry], r: [-rx * k, ry] },
    { a: [-rx, 0], l: [-rx, ry * k], r: [-rx, -ry * k] },
  ] }];
}
function roundPath(w, h, rr) {
  const k = rr * 0.4477153, L = -w / 2, T = -h / 2, R = w / 2, B = h / 2;
  return [{ open: false, points: [
    { a: [L + rr, T], l: [L + k, T] }, { a: [R - rr, T], r: [R - k, T] },
    { a: [R, T + rr], l: [R, T + k] }, { a: [R, B - rr], r: [R, B - k] },
    { a: [R - rr, B], l: [R - k, B] }, { a: [L + rr, B], r: [L + k, B] },
    { a: [L, B - rr], l: [L, B - k] }, { a: [L, T + rr], r: [L, T + k] },
  ] }];
}
// move/line/curve steps (page points) -> anchor points with their handles, relative to the centre
function cmdsPath(cmds, closed, cx, cy) {
  const P = ([px, py]) => [px - cx, py - cy];
  const out = []; let cur = null, start = null, prev = [0, 0];
  const finish = (open) => { if (cur && cur.points.length) { cur.open = open; out.push(cur); } cur = null; };
  for (const c of cmds) {
    if (c[0] === 'M') { finish(!closed); cur = { points: [{ a: P(c[1]) }] }; start = c[1]; prev = c[1]; }
    else if (!cur) continue;
    else if (c[0] === 'L') { cur.points.push({ a: P(c[1]) }); prev = c[1]; }
    else if (c[0] === 'C' || c[0] === 'Q') {
      let c1, c2; const e = c[0] === 'C' ? c[3] : c[2];
      if (c[0] === 'C') { c1 = c[1]; c2 = c[2]; } else { const q = c[1]; c1 = [prev[0] + (2 / 3) * (q[0] - prev[0]), prev[1] + (2 / 3) * (q[1] - prev[1])]; c2 = [e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1])]; }
      cur.points[cur.points.length - 1].r = P(c1);
      cur.points.push({ a: P(e), l: P(c2) }); prev = e;
    } else if (c[0] === 'Z') {
      // the closing point is the first one again: its incoming handle goes to the first point
      const pts = cur.points, last = pts[pts.length - 1];
      if (pts.length > 1 && Math.abs(last.a[0] - pts[0].a[0]) < 0.01 && Math.abs(last.a[1] - pts[0].a[1]) < 0.01) { pts[0].l = last.l; pts.pop(); }
      finish(false); prev = start;
    }
  }
  finish(!closed);
  return out;
}
// how an item is painted
function paint(it, ctx, { fill = it.fill, stroke = it.stroke } = {}) {
  let a = ` FillColor="${fill && hex6(fill.color) ? ctx.col.get(fill.color) : 'Swatch/None'}"`;
  if (stroke && stroke.width) {
    a += ` StrokeColor="${ctx.col.get(stroke.color)}" StrokeWeight="${n(stroke.width)}"`;
    if (stroke.dash) a += ` StrokeType="StrokeStyle/$ID/${stroke.dash[0] < 1.5 * stroke.width ? 'Dotted' : 'Dashed'}"`;
    if (stroke.cap === 'round') a += ' EndCap="RoundEndCap" EndJoin="RoundEndJoin"';
  } else a += ' StrokeColor="Swatch/None" StrokeWeight="0"';
  return a;
}
// text wrap around a picture or shape, with its gap
const wrapXml = (it) => (it.wrap ? `<TextWrapPreference Inverse="false" ApplyToMasterPageOnly="false" TextWrapSide="BothSides" TextWrapMode="${it.wrap.mode === 'topBottom' ? 'JumpObjectTextWrap' : 'BoundingBoxTextWrap'}"><Properties><TextWrapOffset Top="${n(it.wrap.gap)}" Left="${n(it.wrap.gap)}" Bottom="${n(it.wrap.gap)}" Right="${n(it.wrap.gap)}"/></Properties></TextWrapPreference>` : '<TextWrapPreference TextWrapMode="None"/>');
function opacityXml(it) {
  const o = Math.min(it.fill?.opacity ?? 1, it.stroke?.opacity ?? 1);
  return o < 1 ? `<TransparencySetting><BlendingSetting Opacity="${n(Math.round(o * 100))}"/></TransparencySetting>` : '';
}

// ------------------------------------------------------------------ text
// a font's PostScript name, which some programs use to find it: the well-known ones as they really are,
// others the usual way ("Family-Bold")
const PS = { arial: ['ArialMT', 'MT'], 'times new roman': ['TimesNewRomanPSMT', 'MT', 'TimesNewRomanPS'], 'courier new': ['CourierNewPSMT', 'MT', 'CourierNewPS'], 'comic sans ms': ['ComicSansMS', ''] };
function psName(fam, st) {
  const k = PS[fam.toLowerCase()], suffix = st.replace(/\s+/g, '');
  if (k) return st === 'Regular' ? k[0] : `${k[2] || fam.replace(/\s+/g, '')}-${suffix}${k[1]}`;
  return fam.replace(/\s+/g, '') + (st === 'Regular' ? '' : `-${suffix}`);
}
const JUST = { left: 'LeftAlign', center: 'CenterAlign', right: 'RightAlign', justify: 'LeftJustified' };
function fontOf(name, ctx) {
  const fam = String(name || 'Times New Roman').trim();
  if (!ctx.fonts.has(fam)) ctx.fonts.set(fam, new Set());
  return fam;
}
function charRange(r, size, lead, ctx, inner) {
  const fc = ctx.face(String(r.font || 'Times New Roman').trim(), !!r.bold, !!r.italic);
  const fam = fontOf(fc.family, ctx), style = fontStyle(fc.bold, fc.italic);
  ctx.fonts.get(fam).add(style);
  let a = ` AppliedCharacterStyle="CharacterStyle/$ID/[No character style]" FontStyle="${style}" PointSize="${n(size)}" FillColor="${ctx.col.get(r.color || '#000000')}"`;
  if (r.underline) a += ' Underline="true"';
  if (r.strike) a += ' StrikeThru="true"';
  if (r.caps === 'all') a += ' Capitalization="AllCaps"';
  if (r.caps === 'small') a += ' Capitalization="SmallCaps"';
  if (r.position === 'super') a += ' Position="Superscript"';
  if (r.position === 'sub') a += ' Position="Subscript"';
  if (r.tracking) a += ` Tracking="${n((r.tracking / Math.max(1, size)) * 1000)}"`;
  if (r.outline) a += ` StrokeColor="${ctx.col.get(r.color || '#000000')}" StrokeWeight="${n(Math.max(0.25, size * 0.03))}"${r.color ? '' : ' FillColor="Swatch/None"'}`;
  if (r.kern === 'off') a += ' KerningMethod="$ID/None"';
  return `<CharacterStyleRange${a}><Properties><AppliedFont type="string">${x(fam)}</AppliedFont><Leading type="unit">${n(lead)}</Leading></Properties>${inner}</CharacterStyleRange>`;
}
// text as <Content>: line breaks inside a paragraph are InDesign's forced line break
const content = (s) => `<Content>${x(String(s).replace(/[\n\u000b]/g, ' '))}</Content>`;
function storyXml(id, paras, ctx, page) {
  let body = '';
  if (!paras.length) paras = [{ runs: [{ text: '' }] }];
  paras.forEach((pa, i) => {
    const size = Math.max(0, ...pa.runs.map((r) => r.size || 0)) || ctx.lastSize || 10;
    const lead = pa.lineHeight?.pt || (pa.lineHeight?.mult ? pa.lineHeight.mult * 1.2 * size : size * 1.15);
    let pa1 = ` AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" Justification="${JUST[pa.runs.some((r) => r.text?.includes('\t')) ? 'left' : pa.align] || 'LeftAlign'}"`;
    pa1 += ` LeftIndent="${n(pa.indentLeft || 0)}" RightIndent="${n(pa.indentRight || 0)}" FirstLineIndent="${n(pa.cont ? 0 : pa.indentFirst || 0)}" SpaceBefore="${n(pa.cont ? 0 : pa.spaceBefore || 0)}" SpaceAfter="${n(pa.spaceAfter || 0)}"`;
    if (pa.dropCap?.lines >= 2 && !pa.cont) pa1 += ` DropCapLines="${Math.min(25, Math.round(pa.dropCap.lines))}" DropCapCharacters="1"`;
    const tabs = [...(pa.tabs || [])];
    const mark = pa.list && !pa.cont, hang = mark && pa.indentFirst < 0;
    if (hang && !tabs.length) tabs.push({ pos: pa.indentLeft || 0, align: 'left' });
    const tabXml = tabs.length ? `<Properties><TabList type="list">${tabs.map((t) => `<ListItem type="record"><Alignment type="enumeration">${{ right: 'RightAlign', center: 'CenterAlign', decimal: 'CharacterAlign' }[t.align] || 'LeftAlign'}</Alignment><AlignmentCharacter type="string">.</AlignmentCharacter><Leader type="string">${t.leader === 'dot' ? '.' : t.leader === 'dash' ? '-' : t.leader === 'line' || t.leader === 'solid' ? '_' : ''}</Leader><Position type="unit">${n(t.pos)}</Position></ListItem>`).join('')}</TabList></Properties>` : '';
    let inner = '';
    const first = pa.runs.find((r) => r.text) || pa.runs[0] || {};
    if (mark) inner += charRange({ ...first, underline: false, strike: false }, first.size || size, lead, ctx, content(`${pa.list.text}${hang ? '\t' : ' '}`));
    for (const r of pa.runs) {
      if (r.size) ctx.lastSize = r.size;
      const s = r.size || size;
      // the page number fills itself in on each page (InDesign's own page number marker)
      if (r.field === 'page') inner += charRange(r, s, lead, ctx, '<?ACE 18?>');
      else if (r.field) inner += charRange(r, s, lead, ctx, content(fieldText(r.field, page) || r.text));
      else if (r.text) inner += charRange(r, s, lead, ctx, content(r.text));
    }
    // the end of the paragraph
    const brk = i < paras.length - 1 ? '<Br/>' : '';
    if (!inner || brk) inner += charRange({ ...first, underline: false, strike: false }, first.size || size, lead, ctx, brk);
    body += `<ParagraphStyleRange${pa1}>${tabXml}${inner}</ParagraphStyleRange>`;
  });
  return `${HEAD}<idPkg:Story ${PKG} ${DOM}><Story Self="${id}" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n"><StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/><InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false"/>${body}</Story></idPkg:Story>`;
}

// ------------------------------------------------------------------ page items
function textFrame(it, ctx) {
  const sid = ctx.ids.next(), fid = ctx.ids.next();
  ctx.stories.push({ id: sid, xml: storyXml(sid, it.paras || [], ctx, { pageNumber: it.pageNumber, pageCount: it.pageCount }) });
  const [t, r, b, l] = it.pad || [0, 0, 0, 0];
  const pref = `<TextFramePreference TextColumnCount="${Math.max(1, it.columns || 1)}" TextColumnGutter="${n(it.columns > 1 ? it.columnGap || 0 : 12)}" FirstBaselineOffset="AscentOffset" VerticalJustification="${{ middle: 'CenterAlign', bottom: 'BottomAlign' }[it.valign] || 'TopAlign'}" AutoSizingType="Off" UseNoLineBreaksForAutoSizing="false"><Properties><InsetSpacing type="list">${[t, l, b, r].map((v) => `<ListItem type="unit">${n(v)}</ListItem>`).join('')}</InsetSpacing></Properties></TextFramePreference>`;
  return `<TextFrame Self="${fid}" ParentStory="${sid}" PreviousTextFrame="n" NextTextFrame="n" ContentType="TextType" ItemLayer="${ctx.layer}" Visible="true" Name="$ID/" ItemTransform="${transform(it, ctx)}"${paint(it, ctx)}>${pathXml(boxPath(it.w, it.h))}${opacityXml(it)}${pref}<TextWrapPreference TextWrapMode="None"/></TextFrame>`;
}
async function imageFrame(it, ctx) {
  const pic = await proPicture(it, ctx.pageEl);
  if (!pic) return '';
  const id = ctx.ids.next(), iid = ctx.ids.next(), lid = ctx.ids.next();
  // the picture's own size in points (at its own resolution), stretched to fill the frame
  const gw = (pic.pw * 72) / pic.dpi, gh = (pic.ph * 72) / pic.dpi;
  const sx = it.w / Math.max(0.01, gw), sy = it.h / Math.max(0.01, gh);
  const name = `Picture ${++ctx.images}.${pic.ext === 'jpeg' ? 'jpg' : 'png'}`;
  // the picture's own data inside its frame (an embedded picture: nothing to link to)
  const image = `<Image Self="${iid}" ItemTransform="${n(sx)} 0 0 ${n(sy)} ${n(-it.w / 2)} ${n(-it.h / 2)}" Space="$ID/RGB" ActualPpi="${pic.dpi} ${pic.dpi}" EffectivePpi="${Math.round(pic.dpi / sx)} ${Math.round(pic.dpi / sy)}" ImageRenderingIntent="UseColorSettings" LocalDisplaySetting="Default" ImageTypeName="$ID/${pic.ext === 'jpeg' ? 'JPEG' : 'Portable Network Graphics (PNG)'}" AppliedObjectStyle="ObjectStyle/$ID/[None]" Visible="true" Name="$ID/"><Properties><Profile type="string">$ID/Embedded</Profile><GraphicBounds Left="0" Top="0" Right="${n(gw)}" Bottom="${n(gh)}"/><Contents><![CDATA[${bytesToB64(pic.bytes)}]]></Contents></Properties><TextWrapPreference TextWrapMode="None"/><Link Self="${lid}" AssetURL="$ID/" AssetID="$ID/" LinkResourceURI="file:${encodeURIComponent(name)}" LinkResourceFormat="$ID/${pic.ext === 'jpeg' ? 'JPEG' : 'Portable Network Graphics (PNG)'}" StoredState="Embedded" LinkClassID="35906" LinkClientID="257" LinkResourceModified="false" LinkObjectModified="false" ShowInUI="true" CanEmbed="true" CanUnembed="false" CanPackage="true" ImportPolicy="NoAutoImport" ExportPolicy="NoAutoExport" LinkImportStamp="" LinkImportModificationTime="1970-01-01T00:00:00" LinkImportTime="1970-01-01T00:00:00" LinkResourceSize="${pic.bytes.length}"/></Image>`;
  return `<Rectangle Self="${id}" ContentType="GraphicType" ItemLayer="${ctx.layer}" Visible="true" Name="$ID/" ItemTransform="${transform(it, ctx)}"${paint(it, ctx, { fill: null })}>${pathXml(boxPath(it.w, it.h))}${wrapXml(it)}${image}</Rectangle>`;
}
function shapeItem(it, ctx) {
  const id = ctx.ids.next(), tf = transform(it, ctx), common = ` ItemLayer="${ctx.layer}" Visible="true" Name="$ID/" ItemTransform="${tf}"${paint(it, ctx)}`;
  const tail = `${opacityXml(it)}${wrapXml(it)}`;
  if (it.geom === 'rect') return `<Rectangle Self="${id}" ContentType="Unassigned"${common}>${pathXml(boxPath(it.w, it.h))}${tail}</Rectangle>`;
  if (it.geom === 'roundRect') return `<Rectangle Self="${id}" ContentType="Unassigned"${common}>${pathXml(roundPath(it.w, it.h, Math.min(it.rx || 0, it.w / 2, it.h / 2)))}${tail}</Rectangle>`;
  if (it.geom === 'ellipse') return `<Oval Self="${id}" ContentType="Unassigned"${common}>${pathXml(ellipsePath(it.w, it.h))}${tail}</Oval>`;
  const paths = cmdsPath(it.path.cmds, it.path.closed, it.x + it.w / 2, it.y + it.h / 2);
  if (!paths.length) return '';
  const open = paths.every((p) => p.open);
  if (open && paths.length === 1 && paths[0].points.length === 2 && !paths[0].points.some((p) => p.l || p.r)) return `<GraphicLine Self="${id}" ContentType="Unassigned"${common.replace(/ FillColor="[^"]*"/, ' FillColor="Swatch/None"')}>${pathXml(paths)}${tail}</GraphicLine>`;
  return `<Polygon Self="${id}" ContentType="Unassigned"${open ? common.replace(/ FillColor="[^"]*"/, ' FillColor="Swatch/None"') : common}>${pathXml(paths)}${tail}</Polygon>`;
}
// a table: a text frame for each cell and its lines, kept together as one group
function tableGroup(it, ctx) {
  const grid = tableGrid(it);
  const colX = [it.x]; it.cols.forEach((c) => colX.push(colX[colX.length - 1] + c));
  const rowY = [it.y]; it.rowHeights.forEach((h) => rowY.push(rowY[rowY.length - 1] + h));
  let kids = ''; const lines = [];
  grid.forEach((row, r) => row.forEach((g, c) => {
    if (!g || !g.origin) return;
    const cs = g.cell.span?.[0] || 1, rs = g.cell.span?.[1] || 1, cell = g.cell;
    const bx = colX[c], by = rowY[r], bw = colX[Math.min(c + cs, it.cols.length)] - bx, bh = rowY[Math.min(r + rs, it.rowHeights.length)] - by;
    kids += textFrame({ x: bx, y: by, w: bw, h: bh, rot: 0, pad: [2, 4, 2, 4], valign: cell.valign, fill: cell.fill ? { color: cell.fill, opacity: 1 } : null, paras: cell.paras || [], pageNumber: ctx.page + 1, pageCount: ctx.pageCount }, ctx);
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
    kids += shapeItem({ type: 'shape', geom: 'path', x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), rot: 0, path: { cmds: [['M', [x1, y1]], ['L', [x2, y2]]], closed: false }, stroke: { color: b.color, width: b.width, dash: b.style === 'dashed' ? [3, 2] : b.style === 'dotted' ? [1, 1] : null } }, ctx);
  }
  return kids ? `<Group Self="${ctx.ids.next()}" ItemLayer="${ctx.layer}" Visible="true" Name="$ID/" ItemTransform="1 0 0 1 0 0">${kids}</Group>` : '';
}
async function itemXml(it, ctx) {
  if (it.type === 'text') return textFrame(it, ctx);
  if (it.type === 'image') return imageFrame(it, ctx);
  if (it.type === 'shape') return shapeItem(it, ctx);
  if (it.type === 'table') return tableGroup(it, ctx);
  return '';
}

// ------------------------------------------------------------------ the fixed parts of the package
const pageXml = (self, name, w, h, master) => `<Page Self="${self}" GeometricBounds="0 0 ${n(h)} ${n(w)}" ItemTransform="1 0 0 1 ${n(-w / 2)} ${n(-h / 2)}" Name="${name}" AppliedTrapPreset="TrapPreset/$ID/kDefaultTrapStyleName" OverrideList="" AppliedMaster="${master}" MasterPageTransform="1 0 0 1 0 0" TabOrder="" GridStartingPoint="TopOutside" UseMasterGrid="true"><Properties><PageColor type="enumeration">UseMasterColor</PageColor></Properties><MarginPreference ColumnCount="1" ColumnGutter="12" Top="0" Bottom="0" Left="0" Right="0" ColumnDirection="Horizontal" ColumnsPositions="0 ${n(w)}"/></Page>`;
const STYLES = (font) => `${HEAD}<idPkg:Styles ${PKG} ${DOM}>`
  + '<RootCharacterStyleGroup Self="u79"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Imported="false" Name="$ID/[No character style]"/></RootCharacterStyleGroup>'
  + `<RootParagraphStyleGroup Self="u78"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]" Imported="false" FillColor="Color/Black" FontStyle="Regular" PointSize="12" Justification="LeftAlign"><Properties><AppliedFont type="string">${x(font)}</AppliedFont><Leading type="enumeration">Auto</Leading></Properties></ParagraphStyle>`
  + '<ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" Imported="false" NextStyle="ParagraphStyle/$ID/NormalParagraphStyle" KeyboardShortcut="0 0"><Properties><BasedOn type="string">$ID/[No paragraph style]</BasedOn><PreviewColor type="enumeration">Nothing</PreviewColor></Properties></ParagraphStyle></RootParagraphStyleGroup>'
  + '<TOCStyle Self="TOCStyle/$ID/DefaultTOCStyleName" TitleStyle="ParagraphStyle/$ID/[No paragraph style]" Title="Contents" Name="$ID/DefaultTOCStyleName" RunIn="false" IncludeHidden="false" IncludeBookDocuments="false" CreateBookmarks="true" SetStoryDirection="Horizontal" NumberedParagraphs="IncludeFullParagraph" MakeAnchor="false"/>'
  + '<RootCellStyleGroup Self="u8e"><CellStyle Self="CellStyle/$ID/[None]" AppliedParagraphStyle="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[None]"/></RootCellStyleGroup>'
  + '<RootTableStyleGroup Self="u90"><TableStyle Self="TableStyle/$ID/[No table style]" Name="$ID/[No table style]"/><TableStyle Self="TableStyle/$ID/[Basic Table]" Name="$ID/[Basic Table]"><Properties><BasedOn type="string">$ID/[No table style]</BasedOn></Properties></TableStyle></RootTableStyleGroup>'
  + '<RootObjectStyleGroup Self="u92"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]" AppliedParagraphStyle="ParagraphStyle/$ID/[No paragraph style]" FillColor="Swatch/None" StrokeColor="Swatch/None" StrokeWeight="0"/><ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" Name="$ID/[Normal Graphics Frame]" AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" FillColor="Swatch/None" StrokeColor="Color/Black" StrokeWeight="1"><Properties><BasedOn type="string">$ID/[None]</BasedOn></Properties></ObjectStyle><ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]" AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" FillColor="Swatch/None" StrokeColor="Swatch/None" StrokeWeight="0"><Properties><BasedOn type="string">$ID/[None]</BasedOn></Properties></ObjectStyle></RootObjectStyleGroup>'
  + '</idPkg:Styles>';
const STROKES = '<StrokeStyle Self="StrokeStyle/$ID/Solid" Name="$ID/Solid"/><StrokeStyle Self="StrokeStyle/$ID/Dashed" Name="$ID/Dashed"/><StrokeStyle Self="StrokeStyle/$ID/Dotted" Name="$ID/Dotted"/>';

export async function exportIdml(doc, pageEls, { fonts = null } = {}) {
  const pages = await collectPages(doc, pageEls);
  if (!pages.length) throw new Error('There are no pages to save');
  const ctx = { face: fonts ? fonts.face : (f, bold, italic) => ({ family: f, bold, italic }), ids: new Ids(), col: new Colours(), fonts: new Map(), stories: [], images: 0, lastSize: 10, layer: 'uLayer', pageCount: pages.length };
  const spreads = [];
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    nativeWrap(pg, doc, i, pageEls[i], withLists); bleedEdges(pg); applyFit(pg, pageEls[i]); roomForText(pg);
    Object.assign(ctx, { w: pg.w, h: pg.h, page: i, pageEl: pageEls[i] });
    let items = '';
    for (const it of pg.items) items += await itemXml(it, ctx);
    const sid = `uSpread${i + 1}`;
    spreads.push({ id: sid, xml: `${HEAD}<idPkg:Spread ${PKG} ${DOM}><Spread Self="${sid}" PageTransitionType="None" PageTransitionDirection="NotApplicable" PageTransitionDuration="Medium" ShowMasterItems="true" PageCount="1" BindingLocation="0" AllowPageShuffle="true" ItemTransform="1 0 0 1 0 0" FlattenerOverride="Default">${pageXml(`uPage${i + 1}`, i + 1, pg.w, pg.h, 'uMaster')}${items}</Spread></idPkg:Spread>` });
  }
  const p0 = pages[0], b = n(BLEED);
  const master = `${HEAD}<idPkg:MasterSpread ${PKG} ${DOM}><MasterSpread Self="uMaster" ItemTransform="1 0 0 1 0 0" OverriddenPageItemProps="" PrimaryTextFrame="n" Name="A-Master" NamePrefix="A" BaseName="Master" ShowMasterItems="true" PageCount="1">${pageXml('uMasterPage', 'A', p0.w, p0.h, 'n')}</MasterSpread></idPkg:MasterSpread>`;
  // fonts: each family with the styles used (InDesign finds them on the computer by name)
  let fontsXml = '', fk = 0;
  for (const [fam, styles] of ctx.fonts) {
    fontsXml += `<FontFamily Self="di${(++fk).toString(16)}" Name="${x(fam)}">`;
    for (const st of styles) fontsXml += `<Font Self="di${fk.toString(16)}Font${x(st.replace(/ /g, ''))}" FontFamily="${x(fam)}" Name="${x(`${fam} ${st}`)}" PostScriptName="${x(psName(fam, st))}" Status="NotAvailable" FontStyleName="${x(st)}" FontType="OpenTypeTT" WritingScript="0" FullName="${x(`${fam} ${st}`)}" FullNameNative="${x(`${fam} ${st}`)}" FontStyleNameNative="${x(st)}" PlatformName="$ID/" Version=""/>`;
    fontsXml += '</FontFamily>';
  }
  const files = {
    'META-INF/container.xml': `${HEAD}<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>`,
    'Resources/Graphic.xml': `${HEAD}<idPkg:Graphic ${PKG} ${DOM}>${ctx.col.xml()}${STROKES}</idPkg:Graphic>`,
    'Resources/Fonts.xml': `${HEAD}<idPkg:Fonts ${PKG} ${DOM}>${fontsXml}</idPkg:Fonts>`,
    'Resources/Styles.xml': STYLES([...ctx.fonts.keys()][0] || 'Times New Roman'),
    'Resources/Preferences.xml': `${HEAD}<idPkg:Preferences ${PKG} ${DOM}><DocumentPreference PageHeight="${n(p0.h)}" PageWidth="${n(p0.w)}" PagesPerDocument="${pages.length}" FacingPages="false" DocumentBleedTopOffset="${b}" DocumentBleedBottomOffset="${b}" DocumentBleedInsideOrLeftOffset="${b}" DocumentBleedOutsideOrRightOffset="${b}" DocumentBleedUniformSize="true" SlugTopOffset="0" SlugBottomOffset="0" SlugInsideOrLeftOffset="0" SlugRightOrOutsideOffset="0" DocumentSlugUniformSize="false" PreserveLayoutWhenShuffling="true" AllowPageShuffle="true" OverprintBlack="true" PageBinding="LeftToRight" ColumnDirection="Horizontal" ColumnGuideLocked="true" MasterTextFrame="false" SnippetImportUsesOriginalLocation="false" Intent="PrintIntent"/><MarginPreference ColumnCount="1" ColumnGutter="12" Top="0" Bottom="0" Left="0" Right="0" ColumnDirection="Horizontal" ColumnsPositions="0 ${n(p0.w)}"/><TextPreference TextWrapOnlyAffectsTextBeneath="true"/><ViewPreference HorizontalMeasurementUnits="Points" VerticalMeasurementUnits="Points" RulerOrigin="PageOrigin"/></idPkg:Preferences>`,
    'MasterSpreads/MasterSpread_uMaster.xml': master,
    'XML/Tags.xml': `${HEAD}<idPkg:Tags ${PKG} ${DOM}><XMLTag Self="XMLTag/Root" Name="Root"><Properties><TagColor type="enumeration">LightBlue</TagColor></Properties></XMLTag></idPkg:Tags>`,
    'XML/BackingStory.xml': `${HEAD}<idPkg:BackingStory ${PKG} ${DOM}><XmlStory Self="uBacking" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n"><ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"/></ParagraphStyleRange></XmlStory></idPkg:BackingStory>`,
  };
  for (const s of spreads) files[`Spreads/Spread_${s.id}.xml`] = s.xml;
  for (const s of ctx.stories) files[`Stories/Story_${s.id}.xml`] = s.xml;
  files['designmap.xml'] = `${HEAD}<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="8.0(370)" ?>\n<Document ${PKG} ${DOM} Self="d" StoryList="${ctx.stories.map((s) => s.id).join(' ')}" Name="${x(safeName(doc.name))}.indd" ZeroPoint="0 0" ActiveLayer="${ctx.layer}" CMYKProfile="$ID/" RGBProfile="$ID/" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk" AccurateLABSpots="false">`
    + '<Language Self="Language/$ID/English%3a USA" Name="$ID/English: USA" SingleQuotes="‘’" DoubleQuotes="“”" PrimaryLanguageName="$ID/English" SublanguageName="$ID/USA" Id="269" HyphenationVendor="Hunspell" SpellingVendor="Hunspell"/>'
    + '<idPkg:Graphic src="Resources/Graphic.xml"/><idPkg:Fonts src="Resources/Fonts.xml"/><idPkg:Styles src="Resources/Styles.xml"/><idPkg:Preferences src="Resources/Preferences.xml"/><idPkg:Tags src="XML/Tags.xml"/>'
    + `<Layer Self="${ctx.layer}" Name="Layer 1" Visible="true" Locked="false" IgnoreWrap="false" ShowGuides="true" LockGuides="false" UI="true" Expendable="true" Printable="true"><Properties><LayerColor type="enumeration">LightBlue</LayerColor></Properties></Layer>`
    + '<idPkg:MasterSpread src="MasterSpreads/MasterSpread_uMaster.xml"/>'
    + spreads.map((s) => `<idPkg:Spread src="Spreads/Spread_${s.id}.xml"/>`).join('')
    + `<Section Self="uSection" Length="${pages.length}" Name="" ContinueNumbering="true" IncludeSectionPrefix="false" Marker="" PageStart="uPage1" SectionPrefix="" PageNumberStyle="Arabic"/>`
    + `<DocumentUser Self="dDocumentUser0" UserName="$ID/Unknown User Name"><Properties><UserColor type="enumeration">Gold</UserColor></Properties></DocumentUser>`
    + '<idPkg:BackingStory src="XML/BackingStory.xml"/>'
    + ctx.stories.map((s) => `<idPkg:Story src="Stories/Story_${s.id}.xml"/>`).join('')
    + `<MetadataPacketPreference><Properties><Contents><![CDATA[<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${x(doc.name || '')}</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="r"?>]]></Contents></Properties></MetadataPacketPreference>`
    + '</Document>';
  // the mimetype comes first and is stored as it is, so programs can tell what the file is
  const entries = { mimetype: [strToU8('application/vnd.adobe.indesign-idml-package'), { level: 0 }] };
  for (const [k, v] of Object.entries(files)) entries[k] = strToU8(v);
  const bytes = zipSync(entries, { level: 6 });
  const name = `${safeName(doc.name)}.idml`;
  return withFonts(doc, [{ name, bytes }], fonts, 'InDesign', { name, blob: new Blob([bytes], { type: 'application/vnd.adobe.indesign-idml-package' }), bytes });
}
