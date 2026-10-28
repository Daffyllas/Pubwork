// Word (.docx). Every page becomes a Word page of the same size, and everything on it is placed exactly
// where it was: text boxes that stay editable, pictures, shapes and tables, fixed to the page. Word then
// shows the document much as Publisher did, and people can keep working on it in Word.
import { zipSync, strToU8 } from 'fflate';
import { collectPages, parseBorder, tableGrid } from './collect.js';
import { safeName } from './stage.js';
import { cleanLink, fieldText } from '../render.js';

const EMU = 12700; // per point
const TW = 20; // twips per point
const e = (v) => Math.round(v * EMU);
const tw = (v) => Math.round(v * TW);
const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const hex = (c) => { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(c || ''); if (!m) return '000000'; const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]; return h.toUpperCase(); };

const NS = 'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" mc:Ignorable="w14 wp14"';

// ------------------------------------------------------------------ text
function runProps(r, fallbackSize) {
  const font = r.font || 'Times New Roman', size = r.size || fallbackSize || 10;
  let p = `<w:rFonts w:ascii="${x(font)}" w:hAnsi="${x(font)}" w:eastAsia="${x(font)}" w:cs="${x(font)}"/>`;
  if (r.bold) p += '<w:b/><w:bCs/>';
  if (r.italic) p += '<w:i/><w:iCs/>';
  if (r.caps === 'all') p += '<w:caps/>';
  if (r.caps === 'small') p += '<w:smallCaps/>';
  if (r.strike) p += '<w:strike/>';
  if (r.outline) p += '<w:outline/>';
  if (r.shadow) p += '<w:shadow/>';
  if (r.color) p += `<w:color w:val="${hex(r.color)}"/>`;
  if (r.tracking) p += `<w:spacing w:val="${tw(r.tracking)}"/>`;
  if (r.kern !== 'off') p += '<w:kern w:val="2"/>';
  p += `<w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/>`;
  if (r.underline) p += `<w:u w:val="${r.underline === 'double' ? 'double' : r.underline === 'dotted' ? 'dotted' : 'single'}"/>`;
  if (r.highlight) p += `<w:shd w:val="clear" w:color="auto" w:fill="${hex(r.highlight)}"/>`;
  if (r.position === 'super') p += '<w:vertAlign w:val="superscript"/>';
  if (r.position === 'sub') p += '<w:vertAlign w:val="subscript"/>';
  if (r.lang) p += `<w:lang w:val="${x(r.lang)}"/>`;
  if (r.liga !== 'off') p += '<w14:ligatures w14:val="standard"/>';
  return `<w:rPr>${p}</w:rPr>`;
}
const FIELD = { page: ' PAGE ', pages: ' NUMPAGES ', date: ' DATE \\@ "d MMMM yyyy" ' };
function runXml(r, size, ctx) {
  const rp = runProps(r, size);
  // fields fill themselves in (page number, number of pages, date); the value shown now is kept too
  if (r.field && FIELD[r.field]) return wrapLink(r, ctx, `<w:fldSimple w:instr="${x(FIELD[r.field])}"><w:r>${rp}<w:t xml:space="preserve">${x(fieldText(r.field, ctx.page || {}))}</w:t></w:r></w:fldSimple>`);
  // tabs and line breaks are their own elements in Word
  return wrapLink(r, ctx, r.text.split(/(\t|\n|\u000b)/).filter((s) => s !== '').map((s) => (s === '\t' ? `<w:r>${rp}<w:tab/></w:r>` : s === '\n' || s === '\u000b' ? `<w:r>${rp}<w:br/></w:r>` : `<w:r>${rp}<w:t xml:space="preserve">${x(s)}</w:t></w:r>`)).join(''));
}
// a link to a web page or e-mail address around some runs
function wrapLink(r, ctx, xml) {
  const href = r.link && cleanLink(r.link); if (!href || !ctx) return xml;
  const rid = `rIdLink${ctx.links.length + 1}`; ctx.links.push({ rid, href });
  return `<w:hyperlink r:id="${rid}" w:history="1">${xml}</w:hyperlink>`;
}
const TAB_ALIGN = { left: 'left', right: 'right', center: 'center', decimal: 'decimal' };
const TAB_LEAD = { none: 'none', dot: 'dot', dash: 'hyphen', line: 'underscore' };
// Lists stay lists in Word: every run of bullets or numbers in a text box is a Word list of its own that
// starts at the number shown, so Word numbers it the same and Enter in Word goes on with it.
const NUM_FMT = { 1: 'decimal', a: 'lowerLetter', A: 'upperLetter', i: 'lowerRoman', I: 'upperRoman' };
function listNum(pa, ctx) {
  const l = pa.list, key = `${ctx.box}:${l.seq}`;
  let li = ctx.lists.find((x) => x.key === key);
  if (!li) {
    li = { key, id: ctx.lists.length + 1, kind: l.kind, fmt: NUM_FMT[l.num] || 'decimal', text: l.kind === 'num' ? `%1${pa.numSuffix ?? '.'}` : l.text, start: l.n || 1,
      left: pa.indentLeft || 0, hang: pa.indentFirst < 0 ? -pa.indentFirst : 0 };
    ctx.lists.push(li);
  }
  return `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${li.id}"/></w:numPr>`;
}
function numberingXml(lists) {
  const lvl = (li, i) => `<w:lvl w:ilvl="${i}"><w:start w:val="${i ? 1 : li.start}"/><w:numFmt w:val="${li.kind === 'num' ? li.fmt : 'bullet'}"/><w:lvlText w:val="${x(li.kind === 'num' ? li.text.replace('%1', `%${i + 1}`) : li.text)}"/><w:lvlJc w:val="left"/>${li.hang ? '' : '<w:suff w:val="space"/>'}<w:pPr><w:ind w:left="${tw(li.left + i * 18)}"${li.hang ? ` w:hanging="${tw(li.hang)}"` : ''}/></w:pPr></w:lvl>`;
  const abs = lists.map((li) => `<w:abstractNum w:abstractNumId="${li.id}"><w:multiLevelType w:val="singleLevel"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => lvl(li, i)).join('')}</w:abstractNum>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${abs}${lists.map((li) => `<w:num w:numId="${li.id}"><w:abstractNumId w:val="${li.id}"/></w:num>`).join('')}</w:numbering>`;
}
function parasXml(paras, ctx) {
  if (!paras.length) return '<w:p/>';
  ctx.box = (ctx.box || 0) + 1; // lists never run on from one text box (or table cell) into another
  return paras.map((pa) => {
    let pp = '';
    if (pa.list && !pa.cont) pp += listNum(pa, ctx);
    if (pa.background) pp += `<w:shd w:val="clear" w:color="auto" w:fill="${hex(pa.background)}"/>`;
    if (pa.tabs?.length) pp += `<w:tabs>${pa.tabs.map((t) => `<w:tab w:val="${TAB_ALIGN[t.align] || 'left'}" w:leader="${TAB_LEAD[t.leader] || 'none'}" w:pos="${tw(t.pos)}"/>`).join('')}</w:tabs>`;
    if (ctx.item && !ctx.item.hyphenate) pp += '<w:suppressAutoHyphens/>';
    const sp = [];
    if (pa.spaceBefore && !pa.cont) sp.push(`w:before="${tw(pa.spaceBefore)}"`); else sp.push('w:before="0"');
    sp.push(`w:after="${tw(pa.spaceAfter || 0)}"`);
    if (pa.lineHeight?.mult) sp.push(`w:line="${Math.round(240 * pa.lineHeight.mult)}" w:lineRule="auto"`);
    else if (pa.lineHeight?.pt) sp.push(`w:line="${tw(pa.lineHeight.pt)}" w:lineRule="exact"`);
    pp += `<w:spacing ${sp.join(' ')}/>`;
    const ind = [];
    if (pa.indentLeft) ind.push(`w:left="${tw(pa.indentLeft)}"`);
    if (pa.indentRight) ind.push(`w:right="${tw(pa.indentRight)}"`);
    if (pa.indentFirst && !pa.cont) ind.push(pa.indentFirst > 0 ? `w:firstLine="${tw(pa.indentFirst)}"` : `w:hanging="${tw(-pa.indentFirst)}"`);
    if (ind.length) pp += `<w:ind ${ind.join(' ')}/>`;
    // lines with tabs line up from the left (as on screen)
    const align = pa.runs.some((r) => r.text.includes('\t')) ? 'left' : pa.align;
    if (align) pp += `<w:jc w:val="${{ left: 'left', center: 'center', right: 'right', justify: 'both' }[align] || 'left'}"/>`;
    const first = pa.runs.find((r) => r.text) || pa.runs[0];
    const size = Math.max(0, ...pa.runs.map((r) => r.size || 0)) || ctx.lastSize || 10;
    pp += runProps({ ...(first || {}), text: '' }, size);
    let body = '', drop = '';
    let runs = pa.runs;
    if (pa.dropCap?.lines >= 2 && !pa.cont && first?.text && !first.field) {
      // a drop cap: Word keeps the big letter in a little paragraph of its own, framed beside the text
      const n = Math.min(5, Math.round(pa.dropCap.lines)), lh = (first.size || size) * 1.15;
      const big = { ...first, text: [...first.text][0], size: Math.round(((n - 1) * lh + 0.7 * (first.size || size)) / 0.7), font: pa.dropCap.font || first.font, color: pa.dropCap.color || first.color, link: null };
      drop = `<w:p><w:pPr><w:framePr w:dropCap="drop" w:lines="${n}" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/><w:spacing w:before="0" w:after="0" w:line="${tw(n * lh)}" w:lineRule="exact"/><w:textAlignment w:val="baseline"/></w:pPr>${runXml(big, size, ctx)}</w:p>`;
      runs = [{ ...first, text: first.text.slice(big.text.length) }, ...pa.runs.slice(pa.runs.indexOf(first) + 1)];
      runs = [...pa.runs.slice(0, pa.runs.indexOf(first)), ...runs];
    }
    for (const r of runs) { if (r.text) body += runXml(r, size, ctx); if (r.size) ctx.lastSize = r.size; }
    return `${drop}<w:p><w:pPr>${pp}</w:pPr>${body}</w:p>`;
  }).join('');
}

// ------------------------------------------------------------------ drawing pieces
const fillXml = (f) => (f ? `<a:solidFill><a:srgbClr val="${hex(f.color)}">${f.opacity < 1 ? `<a:alpha val="${Math.round(f.opacity * 100000)}"/>` : ''}</a:srgbClr></a:solidFill>` : '<a:noFill/>');
const lineXml = (s) => (s && s.width ? `<a:ln w="${e(s.width)}"${s.cap === 'round' ? ' cap="rnd"' : ''}><a:solidFill><a:srgbClr val="${hex(s.color)}">${s.opacity != null && s.opacity < 1 ? `<a:alpha val="${Math.round(s.opacity * 100000)}"/>` : ''}</a:srgbClr></a:solidFill>${s.dash ? `<a:prstDash val="${s.dash[0] < 1 ? 'sysDot' : 'dash'}"/>` : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>');
const xfrm = (it) => `<a:xfrm${it.rot ? ` rot="${Math.round((((it.rot % 360) + 360) % 360) * 60000)}"` : ''}><a:off x="0" y="0"/><a:ext cx="${e(Math.max(it.w, 0))}" cy="${e(Math.max(it.h, 0))}"/></a:xfrm>`;

function geomXml(it) {
  if (it.type !== 'shape' || it.geom === 'rect') return '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  if (it.geom === 'ellipse') return '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>';
  if (it.geom === 'roundRect') return `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${Math.round(Math.min(50000, (it.rx / Math.max(1, Math.min(it.w, it.h))) * 100000))}"/></a:avLst></a:prstGeom>`;
  const W = Math.max(1, e(it.w)), H = Math.max(1, e(it.h));
  const P = ([px, py]) => `<a:pt x="${Math.round((px - it.x) * EMU)}" y="${Math.round((py - it.y) * EMU)}"/>`;
  const steps = it.path.cmds.map((c) => {
    if (c[0] === 'M') return `<a:moveTo>${P(c[1])}</a:moveTo>`;
    if (c[0] === 'L') return `<a:lnTo>${P(c[1])}</a:lnTo>`;
    if (c[0] === 'C') return `<a:cubicBezTo>${P(c[1])}${P(c[2])}${P(c[3])}</a:cubicBezTo>`;
    if (c[0] === 'Q') return `<a:quadBezTo>${P(c[1])}${P(c[2])}</a:quadBezTo>`;
    return '<a:close/>';
  }).join('') + (it.path.closed && it.path.cmds[it.path.cmds.length - 1]?.[0] !== 'Z' ? '<a:close/>' : '');
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${W}" h="${H}"${it.fill ? '' : ' fill="none"'}>${steps}</a:path></a:pathLst></a:custGeom>`;
}

function anchor(it, ctx, graphic, pictureLocks = false) {
  const id = ++ctx.ids;
  return `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${ctx.z++}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">`
    + '<wp:simplePos x="0" y="0"/>'
    + `<wp:positionH relativeFrom="page"><wp:posOffset>${e(it.x)}</wp:posOffset></wp:positionH>`
    + `<wp:positionV relativeFrom="page"><wp:posOffset>${e(it.y)}</wp:posOffset></wp:positionV>`
    + `<wp:extent cx="${e(Math.max(it.w, 0))}" cy="${e(Math.max(it.h, 0))}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>`
    + `<wp:docPr id="${id}" name="${pictureLocks ? 'Picture' : 'Shape'} ${id}"/>`
    + `<wp:cNvGraphicFramePr>${pictureLocks ? '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>' : ''}</wp:cNvGraphicFramePr>`
    + graphic + '</wp:anchor>';
}
const shapeRun = (it, ctx, inner) => `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>${anchor(it, ctx, `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">${inner}</a:graphicData></a:graphic>`)}</w:drawing></mc:Choice></mc:AlternateContent></w:r>`;

function textBox(it, ctx) {
  const [pt, pr, pb, pl] = it.pad;
  const body = `<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="${e(pl)}" tIns="${e(pt)}" rIns="${e(pr)}" bIns="${e(pb)}"${it.columns > 1 ? ` numCol="${it.columns}" spcCol="${e(it.columnGap)}"` : ''} anchor="${{ top: 't', middle: 'ctr', bottom: 'b' }[it.valign] || 't'}" anchorCtr="0" upright="1"><a:noAutofit/></wps:bodyPr>`;
  return shapeRun(it, ctx, `<wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr>${xfrm(it)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fillXml(it.fill)}${lineXml(it.stroke)}</wps:spPr><wps:txbx><w:txbxContent>${it.inner}</w:txbxContent></wps:txbx>${body}</wps:wsp>`);
}

function tableXml(t, ctx) {
  const grid = tableGrid(t);
  const border = (side, s) => { const b = parseBorder(s); return b ? `<w:${side} w:val="${b.style === 'double' ? 'double' : b.style === 'dashed' ? 'dashed' : b.style === 'dotted' ? 'dotted' : 'single'}" w:sz="${Math.max(2, Math.round(b.width * 8))}" w:space="0" w:color="${hex(b.color)}"/>` : `<w:${side} w:val="nil"/>`; };
  let xml = `<w:tbl><w:tblPr><w:tblW w:w="${tw(t.cols.reduce((a, b) => a + b, 0))}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  xml += `<w:tblGrid>${t.cols.map((c) => `<w:gridCol w:w="${tw(c)}"/>`).join('')}</w:tblGrid>`;
  t.rows.forEach((row, r) => {
    xml += `<w:tr>${row.h ? `<w:trPr><w:trHeight w:val="${tw(row.h)}" w:hRule="atLeast"/></w:trPr>` : ''}`;
    for (let c = 0; c < t.cols.length;) {
      const g = grid[r][c];
      if (!g) { xml += `<w:tc><w:tcPr><w:tcW w:w="${tw(t.cols[c])}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`; c++; continue; }
      const cs = g.cell.span?.[0] || 1, rs = g.cell.span?.[1] || 1, cell = g.cell;
      const w = t.cols.slice(c, c + cs).reduce((a, b) => a + b, 0);
      let pr = `<w:tcW w:w="${tw(w)}" w:type="dxa"/>${cs > 1 ? `<w:gridSpan w:val="${cs}"/>` : ''}`;
      if (rs > 1) pr += g.top ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
      pr += `<w:tcBorders>${border('top', cell.borders?.[0])}${border('left', cell.borders?.[3])}${border('bottom', cell.borders?.[2])}${border('right', cell.borders?.[1])}</w:tcBorders>`;
      if (cell.fill) pr += `<w:shd w:val="clear" w:color="auto" w:fill="${hex(cell.fill)}"/>`;
      pr += `<w:vAlign w:val="${cell.valign === 'middle' ? 'center' : cell.valign === 'bottom' ? 'bottom' : 'top'}"/>`;
      xml += `<w:tc><w:tcPr>${pr}</w:tcPr>${g.top ? parasXml(cell.paras || [], ctx) : '<w:p/>'}</w:tc>`;
      c += cs;
    }
    xml += '</w:tr>';
  });
  return xml + '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
}

function pictureRun(it, ctx) {
  const name = `image${++ctx.images}.${it.ext === 'jpeg' ? 'jpeg' : it.ext}`;
  const rid = `rIdImg${ctx.images}`;
  ctx.media.push({ name, bytes: it.bytes, rid });
  const id = ctx.ids + 1;
  const pic = `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${x(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr>${xfrm(it)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${it.stroke ? lineXml(it.stroke) : ''}</pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  return `<w:r><w:drawing>${anchor(it, ctx, pic, true)}</w:drawing></w:r>`;
}

function itemRun(it, ctx) {
  if (it.type === 'text') { ctx.item = it; ctx.page = { pageNumber: it.pageNumber, pageCount: it.pageCount }; if (it.hyphenate) ctx.hyphenate = true; const inner = parasXml(it.paras, ctx); ctx.item = null; return textBox({ ...it, inner }, ctx); }
  if (it.type === 'table') return textBox({ ...it, pad: [0, 0, 0, 0], valign: 'top', fill: null, stroke: null, columns: 1, inner: tableXml(it, ctx) }, ctx);
  if (it.type === 'image') return pictureRun(it, ctx);
  if (it.type === 'shape') return shapeRun(it, ctx, `<wps:wsp><wps:cNvSpPr/><wps:spPr>${xfrm(it)}${geomXml(it)}${fillXml(it.fill)}${lineXml(it.stroke)}</wps:spPr><wps:bodyPr/></wps:wsp>`);
  return '';
}

const sect = (pg) => `<w:sectPr><w:pgSz w:w="${tw(pg.w)}" w:h="${tw(pg.h)}"${pg.w > pg.h ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>`;

export async function exportDocx(doc, pageEls) {
  const pages = await collectPages(doc, pageEls);
  const ctx = { ids: 0, z: 1, images: 0, media: [], lastSize: 10, links: [], lists: [] };
  let body = '';
  pages.forEach((pg, i) => {
    const runs = pg.items.map((it) => itemRun(it, ctx)).join('');
    const last = i === pages.length - 1;
    // one empty, tiny paragraph per page holds the page's things; its section ends the page
    body += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${last ? '' : sect(pg)}</w:pPr>${runs}</w:p>`;
  });
  body += sect(pages[pages.length - 1]);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${body}</w:body></w:document>`;
  const exts = [...new Set(ctx.media.map((m) => m.name.split('.').pop()))];
  const mime = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', wmf: 'image/x-wmf', emf: 'image/x-emf' };
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${exts.map((x2) => `<Default Extension="${x2}" ContentType="${mime[x2]}"/>`).join('')}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${ctx.lists.length ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : ''}<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>',
    'word/document.xml': documentXml,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${ctx.lists.length ? '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' : ''}${ctx.media.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}${ctx.links.map((l) => `<Relationship Id="${l.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${x(l.href)}" TargetMode="External"/>`).join('')}</Relationships>`,
    'word/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>',
    'word/settings.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/>${ctx.hyphenate ? '<w:autoHyphenation/>' : ''}<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(doc.name)}</dc:title>${doc.meta?.author ? `<dc:creator>${x(doc.meta.author)}</dc:creator>` : ''}<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`,
    'docProps/app.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Pubwork</Application></Properties>',
  };
  if (ctx.lists.length) files['word/numbering.xml'] = numberingXml(ctx.lists);
  const entries = {};
  for (const [k, v] of Object.entries(files)) entries[k] = strToU8(v);
  for (const m of ctx.media) entries[`word/media/${m.name}`] = [m.bytes, { level: 0 }];
  const bytes = zipSync(entries, { level: 6 });
  return { name: `${safeName(doc.name)}.docx`, blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), bytes };
}
