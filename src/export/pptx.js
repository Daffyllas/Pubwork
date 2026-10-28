// PowerPoint (.pptx): one slide per page, the slide the same size as the page (portrait pages stay
// portrait). Text boxes keep their text editable with its fonts, sizes, colours and spacing; pictures,
// shapes and tables sit where they were. Anything PowerPoint can't draw (gradients, shadows, clipped
// pictures) comes as a sharp picture of what was on screen (see collect.js).
import { zipSync, strToU8 } from 'fflate';
import { collectPages, parseBorder, tableGrid } from './collect.js';
import { safeName } from './stage.js';
import { cleanLink, fieldText } from '../render.js';
import { fontInfo } from '../fonts.js';

const EMU = 12700; // per point
const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// '#abc', '#aabbcc' or 'rgb(…)' -> 'AABBCC' (null for anything else, like 'transparent')
function hexOrNull(c) {
  if (!c) return null;
  let m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(c).trim());
  if (m) return (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toUpperCase();
  m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c);
  return m ? [m[1], m[2], m[3]].map((v) => clamp(Math.round(+v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase() : null;
}
const hex = (c) => hexOrNull(c) || '000000';

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const NS = `xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"`;
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// Each slide maps page points to slide EMUs through ctx: size k (1 unless a page must shrink to fit) and
// an offset (to centre a page that is a different size from the first one).
const E = (v, ctx) => Math.round(Math.max(0, v) * ctx.k * EMU);
const PX = (v, ctx) => Math.round((ctx.ox + v * ctx.k) * EMU);
const PY = (v, ctx) => Math.round((ctx.oy + v * ctx.k) * EMU);

// ------------------------------------------------------------------ text
function runProps(r, size, ctx, tag = 'a:rPr') {
  const font = r.font || 'Times New Roman';
  const sz = clamp(Math.round(size * ctx.k * 100), 100, 400000);
  let at = ` lang="${x(r.lang || 'en-US')}" sz="${sz}" b="${r.bold ? 1 : 0}" i="${r.italic ? 1 : 0}"`;
  if (r.underline) at += ` u="${r.underline === 'double' ? 'dbl' : r.underline === 'dotted' ? 'dotted' : 'sng'}"`;
  if (r.strike) at += ' strike="sngStrike"';
  if (r.caps === 'all') at += ' cap="all"';
  if (r.caps === 'small') at += ' cap="small"';
  if (r.tracking) at += ` spc="${clamp(Math.round(r.tracking * ctx.k * 100), -400000, 400000)}"`;
  if (r.position === 'super') at += ' baseline="30000"';
  if (r.position === 'sub') at += ' baseline="-25000"';
  const color = `<a:srgbClr val="${hex(r.color || '#000000')}"/>`;
  let inner = '';
  if (r.outline) inner += `<a:ln w="${Math.max(3175, Math.round(size * 0.03 * EMU))}"><a:solidFill>${color}</a:solidFill></a:ln><a:noFill/>`;
  else inner += `<a:solidFill>${color}</a:solidFill>`;
  if (r.shadow) inner += `<a:effectLst><a:outerShdw dist="${Math.round(size * 0.06 * EMU)}" dir="2700000" algn="tl" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw></a:effectLst>`;
  if (r.highlight && hexOrNull(r.highlight)) inner += `<a:highlight><a:srgbClr val="${hexOrNull(r.highlight)}"/></a:highlight>`;
  // the kind of font (serif, sans serif …) helps a computer without it pick a close match
  const pf = ` pitchFamily="${{ serif: 18, monospace: 49, cursive: 66 }[fontInfo(font).generic] || 34}" charset="0"`;
  inner += `<a:latin typeface="${x(font)}"${pf}/><a:ea typeface="${x(font)}"${pf}/><a:cs typeface="${x(font)}"${pf}/>`;
  // a link to a web page or e-mail address
  const href = tag === 'a:rPr' && r.link && ctx.links ? cleanLink(r.link) : '';
  if (href) { let l = ctx.links.find((k) => k.href === href); if (!l) ctx.links.push((l = { href, rid: `rIdL${ctx.links.length + 1}` })); inner += `<a:hlinkClick r:id="${l.rid}"/>`; }
  return `<${tag}${at}>${inner}</${tag}>`;
}
function runsXml(r, size, ctx) {
  const rp = runProps(r, size, ctx);
  // the page number fills itself in on each slide; the number of pages and the date are kept as shown
  if (r.field === 'page') return `<a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum">${rp}<a:t>${x(fieldText('page', ctx.page))}</a:t></a:fld>`;
  if (r.field) return `<a:r>${rp}<a:t>${x(fieldText(r.field, ctx.page) || r.text)}</a:t></a:r>`;
  // a line break inside a paragraph is its own element; tabs stay as tab characters
  return r.text.split(/(\n|\u000b)/).filter((s) => s !== '').map((s) => (/^(\n|\u000b)$/.test(s) ? `<a:br>${rp}</a:br>` : `<a:r>${rp}<a:t>${x(s)}</a:t></a:r>`)).join('');
}
function parasXml(paras, ctx) {
  if (!paras.length) return `<a:p><a:endParaRPr lang="en-US" sz="${clamp(Math.round(10 * ctx.k * 100), 100, 400000)}"/></a:p>`;
  return paras.map((pa) => {
    let at = '';
    if (pa.align) at += ` algn="${{ left: 'l', center: 'ctr', right: 'r', justify: 'just' }[pa.align] || 'l'}"`;
    if (pa.indentLeft) at += ` marL="${E(pa.indentLeft, ctx)}"`;
    if (pa.indentRight) at += ` marR="${E(pa.indentRight, ctx)}"`;
    if (pa.indentFirst && !pa.cont) at += ` indent="${clamp(Math.round(pa.indentFirst * ctx.k * EMU), -51206400, 51206400)}"`;
    let pp = '';
    // the screen uses 1.2 × the size for single spacing, just like PowerPoint's 100%
    if (pa.lineHeight?.mult) pp += `<a:lnSpc><a:spcPct val="${clamp(Math.round(pa.lineHeight.mult * 100000), 0, 13200000)}"/></a:lnSpc>`;
    else if (pa.lineHeight?.pt) pp += `<a:lnSpc><a:spcPts val="${clamp(Math.round(pa.lineHeight.pt * ctx.k * 100), 0, 158400)}"/></a:lnSpc>`;
    pp += `<a:spcBef><a:spcPts val="${pa.spaceBefore && !pa.cont ? clamp(Math.round(pa.spaceBefore * ctx.k * 100), 0, 158400) : 0}"/></a:spcBef>`;
    pp += `<a:spcAft><a:spcPts val="${clamp(Math.round((pa.spaceAfter || 0) * ctx.k * 100), 0, 158400)}"/></a:spcAft>`;
    const first = pa.runs.find((r) => r.text) || pa.runs[0] || {};
    const size = Math.max(0, ...pa.runs.map((r) => r.size || 0)) || ctx.lastSize || 10;
    if (pa.bullet && !pa.cont) pp += `<a:buClr><a:srgbClr val="${hex(first.color || '#000000')}"/></a:buClr><a:buFont typeface="${x(first.font || 'Arial')}"/><a:buChar char="${x([...pa.bullet][0] || '•')}"/>`;
    else pp += '<a:buNone/>';
    if (pa.tabs?.length) pp += `<a:tabLst>${pa.tabs.slice(0, 32).map((tb) => `<a:tab pos="${E(tb.pos, ctx)}" algn="${{ right: 'r', center: 'ctr', decimal: 'dec' }[tb.align] || 'l'}"/>`).join('')}</a:tabLst>`;
    let body = '';
    for (const r of pa.runs) { if (r.text || r.field) body += runsXml(r, r.size || size, ctx); if (r.size) ctx.lastSize = r.size; }
    return `<a:p><a:pPr${at}>${pp}</a:pPr>${body}${runProps({ ...first, text: '' }, size, ctx, 'a:endParaRPr')}</a:p>`;
  }).join('');
}

// ------------------------------------------------------------------ drawing pieces
const alpha = (o) => (o != null && o < 1 ? `<a:alpha val="${Math.round(clamp(o, 0, 1) * 100000)}"/>` : '');
const fillXml = (f) => (f && hexOrNull(f.color) ? `<a:solidFill><a:srgbClr val="${hexOrNull(f.color)}">${alpha(f.opacity)}</a:srgbClr></a:solidFill>` : '<a:noFill/>');
function lineXml(s, ctx) {
  if (!s || !s.width) return '<a:ln><a:noFill/></a:ln>';
  const dash = s.dash ? `<a:prstDash val="${s.dash[0] < 1.5 ? 'sysDot' : 'dash'}"/>` : '';
  return `<a:ln w="${clamp(Math.round(s.width * ctx.k * EMU), 0, 20116800)}"${s.cap === 'round' ? ' cap="rnd"' : ''}><a:solidFill><a:srgbClr val="${hex(s.color)}">${alpha(s.opacity)}</a:srgbClr></a:solidFill>${dash}${s.cap === 'round' ? '<a:round/>' : ''}</a:ln>`;
}
function xfrm(it, ctx, tag = 'a:xfrm') {
  const rot = it.rot ? Math.round((((it.rot % 360) + 360) % 360) * 60000) : 0;
  return `<${tag}${rot ? ` rot="${rot}"` : ''}><a:off x="${PX(it.x, ctx)}" y="${PY(it.y, ctx)}"/><a:ext cx="${E(it.w, ctx)}" cy="${E(it.h, ctx)}"/></${tag}>`;
}
function geomXml(it, ctx) {
  if (it.type !== 'shape' || it.geom === 'rect') return '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  if (it.geom === 'ellipse') return '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>';
  if (it.geom === 'roundRect') return `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${Math.round(Math.min(50000, (it.rx / Math.max(1, Math.min(it.w, it.h))) * 100000))}"/></a:avLst></a:prstGeom>`;
  // outlines in the shape's own box, in EMUs
  const W = Math.max(1, E(it.w, ctx)), H = Math.max(1, E(it.h, ctx));
  const P = ([px, py]) => `<a:pt x="${Math.round((px - it.x) * ctx.k * EMU)}" y="${Math.round((py - it.y) * ctx.k * EMU)}"/>`;
  const steps = it.path.cmds.map((c) => {
    if (c[0] === 'M') return `<a:moveTo>${P(c[1])}</a:moveTo>`;
    if (c[0] === 'L') return `<a:lnTo>${P(c[1])}</a:lnTo>`;
    if (c[0] === 'C') return `<a:cubicBezTo>${P(c[1])}${P(c[2])}${P(c[3])}</a:cubicBezTo>`;
    if (c[0] === 'Q') return `<a:quadBezTo>${P(c[1])}${P(c[2])}</a:quadBezTo>`;
    return '<a:close/>';
  }).join('') + (it.path.closed && it.path.cmds[it.path.cmds.length - 1]?.[0] !== 'Z' ? '<a:close/>' : '');
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${W}" h="${H}"${it.fill && it.path.closed ? '' : ' fill="none"'}>${steps}</a:path></a:pathLst></a:custGeom>`;
}
const nv = (ctx, name, descr = '') => `<p:cNvPr id="${++ctx.ids}" name="${x(name)} ${ctx.ids}"${descr ? ` descr="${x(descr)}"` : ''}/>`;

function textBox(it, ctx) {
  const [pt, pr, pb, pl] = it.pad;
  const cols = it.columns > 1 ? ` numCol="${clamp(it.columns, 1, 16)}" spcCol="${E(it.columnGap, ctx)}"` : '';
  const body = `<a:bodyPr wrap="square" lIns="${E(pl, ctx)}" tIns="${E(pt, ctx)}" rIns="${E(pr, ctx)}" bIns="${E(pb, ctx)}"${cols} rtlCol="0" anchor="${{ top: 't', middle: 'ctr', bottom: 'b' }[it.valign] || 't'}"><a:noAutofit/></a:bodyPr>`;
  return `<p:sp><p:nvSpPr>${nv(ctx, 'Text Box')}<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(it, ctx)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fillXml(it.fill)}${lineXml(it.stroke, ctx)}</p:spPr><p:txBody>${body}<a:lstStyle/>${parasXml(it.paras, ctx)}</p:txBody></p:sp>`;
}

function shapeXml(it, ctx) {
  return `<p:sp><p:nvSpPr>${nv(ctx, 'Shape')}<p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(it, ctx)}${geomXml(it, ctx)}${fillXml(it.fill)}${lineXml(it.stroke, ctx)}</p:spPr></p:sp>`;
}

function mediaFor(it, ctx) {
  // the same picture used again shares one file
  const ext = it.ext === 'jpeg' ? 'jpeg' : it.ext;
  for (const m of ctx.media) if (m.ext === ext && m.bytes.length === it.bytes.length && m.bytes.every((b, i) => b === it.bytes[i])) return m;
  const m = { name: `image${ctx.media.length + 1}.${ext}`, ext, bytes: it.bytes };
  ctx.media.push(m); return m;
}
function pictureXml(it, ctx) {
  const m = mediaFor(it, ctx);
  let rid = ctx.slideRels.get(m.name);
  if (!rid) { rid = `rId${ctx.slideRels.size + 2}`; ctx.slideRels.set(m.name, rid); }
  return `<p:pic><p:nvPicPr>${nv(ctx, 'Picture', it.alt)}<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(it, ctx)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${it.stroke ? lineXml(it.stroke, ctx) : ''}</p:spPr></p:pic>`;
}

function tableXml(t, ctx) {
  const grid = tableGrid(t);
  const ln = (tag, s) => { const b = parseBorder(s); return b && hexOrNull(b.color) ? `<a:${tag} w="${Math.round(b.width * ctx.k * EMU)}"><a:solidFill><a:srgbClr val="${hexOrNull(b.color)}"/></a:solidFill>${b.style === 'dashed' ? '<a:prstDash val="dash"/>' : b.style === 'dotted' ? '<a:prstDash val="sysDot"/>' : ''}</a:${tag}>` : `<a:${tag} w="0"><a:noFill/></a:${tag}>`; };
  const empty = `<a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US" sz="${clamp(Math.round(10 * ctx.k * 100), 100, 400000)}"/></a:p></a:txBody>`;
  let rowsXml = '';
  t.rows.forEach((row, r) => {
    rowsXml += `<a:tr h="${E(t.rowHeights[r] || row.h || 14, ctx)}">`;
    for (let c = 0; c < t.cols.length; c++) {
      const g = grid[r][c];
      if (!g) { rowsXml += `<a:tc>${empty}<a:tcPr/></a:tc>`; continue; }
      const cell = g.cell, cs = cell.span?.[0] || 1, rs = cell.span?.[1] || 1;
      let at = '';
      if (g.origin) at = `${cs > 1 ? ` gridSpan="${cs}"` : ''}${rs > 1 ? ` rowSpan="${rs}"` : ''}`;
      else if (g.top) at = ' hMerge="1"';
      else if (g.left) at = `${cs > 1 ? ` gridSpan="${cs}"` : ''} vMerge="1"`;
      else at = ' hMerge="1" vMerge="1"';
      const txt = g.origin ? `<a:txBody><a:bodyPr/><a:lstStyle/>${parasXml(cell.paras || [], ctx)}</a:txBody>` : empty;
      const b = cell.borders || [];
      const pr = `<a:tcPr marL="${E(4, ctx)}" marR="${E(4, ctx)}" marT="${E(2, ctx)}" marB="${E(2, ctx)}" anchor="${cell.valign === 'middle' ? 'ctr' : cell.valign === 'bottom' ? 'b' : 't'}">${ln('lnL', b[3])}${ln('lnR', b[1])}${ln('lnT', b[0])}${ln('lnB', b[2])}${hexOrNull(cell.fill) ? `<a:solidFill><a:srgbClr val="${hexOrNull(cell.fill)}"/></a:solidFill>` : '<a:noFill/>'}</a:tcPr>`;
      rowsXml += `<a:tc${at}>${txt}${pr}</a:tc>`;
    }
    rowsXml += '</a:tr>';
  });
  // "No Style, No Grid": the table shows only its own colours and lines
  const tbl = `<a:tbl><a:tblPr><a:tableStyleId>{2D5ABB26-0587-4C30-8999-92F81FD0307C}</a:tableStyleId></a:tblPr><a:tblGrid>${t.cols.map((w) => `<a:gridCol w="${E(w, ctx)}"/>`).join('')}</a:tblGrid>${rowsXml}</a:tbl>`;
  return `<p:graphicFrame><p:nvGraphicFramePr>${nv(ctx, 'Table')}<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>${xfrm({ ...t, rot: 0 }, ctx, 'p:xfrm')}<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">${tbl}</a:graphicData></a:graphic></p:graphicFrame>`;
}

function itemXml(it, ctx) {
  if (it.type === 'text') { ctx.page = { pageNumber: it.pageNumber, pageCount: it.pageCount }; return textBox(it, ctx); }
  if (it.type === 'image') return pictureXml(it, ctx);
  if (it.type === 'shape') return shapeXml(it, ctx);
  if (it.type === 'table') return tableXml(it, ctx);
  return '';
}

// ------------------------------------------------------------------ the fixed parts of the package
const THEME = `${XML}<a:theme xmlns:a="${NS_A}" name="Pubwork"><a:themeElements><a:clrScheme name="Pubwork"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>`
  + '<a:fontScheme name="Pubwork"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
  + '<a:fmtScheme name="Pubwork"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>'
  + '<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>'
  + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
  + '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';

const EMPTY_TREE = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
const CLRMAP = 'bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';
const lvl = (n) => `<a:lvl${n}pPr marL="0" indent="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:spcBef><a:spcPts val="0"/></a:spcBef><a:buNone/><a:defRPr sz="1000" kern="0"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl${n}pPr>`;
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl).join('');
const MASTER = `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${EMPTY_TREE}</p:cSld><p:clrMap ${CLRMAP}/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle>${lvl(1)}</p:titleStyle><p:bodyStyle>${LEVELS}</p:bodyStyle><p:otherStyle>${LEVELS}</p:otherStyle></p:txStyles></p:sldMaster>`;
const LAYOUT = `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank">${EMPTY_TREE}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
const rels = (list) => `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(([id, type, target, external]) => `<Relationship Id="${id}" Type="${type.startsWith('http') ? type : `${REL}/${type}`}" Target="${x(target)}"${external ? ' TargetMode="External"' : ''}/>`).join('')}</Relationships>`;
const MIME = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', wmf: 'image/x-wmf', emf: 'image/x-emf' };

// a picture's own description (alt text), found by its place on the page
function altFor(item, page, doc) {
  const near = (a, b) => Math.abs(a - b) < 0.01;
  const rec = (list) => { for (const it of list || []) { if (it.type === 'group') { const r = rec(it.items); if (r) return r; } else if (it.type === 'image' && it.alt && near(it.x, item.x) && near(it.y, item.y) && near(it.w, item.w) && near(it.h, item.h)) return it.alt; } return ''; };
  const master = typeof page.master === 'string' ? doc.masters?.find((m) => m.id === page.master) : null;
  return rec(page.items) || rec(master?.items);
}

export async function exportPptx(doc, pageEls) {
  const pages = await collectPages(doc, pageEls);
  if (!pages.length) throw new Error('There are no pages to save');
  // PowerPoint slides are 1 to 56 inches on each side, all the same size: the first page sets it
  const MIN = 72, MAX = 4032;
  const p0 = pages[0];
  const k0 = Math.min(1, MAX / Math.max(p0.w, p0.h));
  const W = clamp(p0.w * k0, MIN, MAX), H = clamp(p0.h * k0, MIN, MAX);
  const ctx = { ids: 1, media: [], lastSize: 10, k: 1, ox: 0, oy: 0, slideRels: null };
  const slides = [];
  pages.forEach((pg, i) => {
    ctx.k = Math.min(W / pg.w, H / pg.h); ctx.ox = (W - pg.w * ctx.k) / 2; ctx.oy = (H - pg.h * ctx.k) / 2;
    ctx.ids = 1; ctx.slideRels = new Map(); ctx.links = []; ctx.page = { pageNumber: i + 1, pageCount: pages.length };
    for (const it of pg.items) if (it.type === 'image') it.alt = altFor(it, doc.pages[i], doc);
    const tree = pg.items.map((it) => itemXml(it, ctx)).join('');
    const xml = `${XML}<p:sld ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${EMPTY_TREE.replace('</p:grpSpPr>', `</p:grpSpPr>${tree}`)}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    const r = [['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ...[...ctx.slideRels].map(([name, id]) => [id, 'image', `../media/${name}`]), ...ctx.links.map((l) => [l.rid, 'hyperlink', l.href, true])];
    slides.push({ xml, rels: rels(r) });
  });
  const cx = Math.round(W * EMU), cy = Math.round(H * EMU);
  const pres = `${XML}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 10}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${cx}" cy="${cy}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle>${LEVELS}</p:defaultTextStyle></p:presentation>`;
  const presRels = rels([
    ['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'theme', 'theme/theme1.xml'],
    ['rId3', 'presProps', 'presProps.xml'], ['rId4', 'viewProps', 'viewProps.xml'], ['rId5', 'tableStyles', 'tableStyles.xml'],
    ...slides.map((_, i) => [`rId${i + 10}`, 'slide', `slides/slide${i + 1}.xml`]),
  ]);
  const exts = [...new Set(ctx.media.map((m) => m.ext))];
  const ct = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${exts.map((e) => `<Default Extension="${e}" ContentType="${MIME[e]}"/>`).join('')}`
    + '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
    + '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
    + '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
    + '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
    + '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>'
    + '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>'
    + '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>'
    + slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
  const files = {
    '[Content_Types].xml': ct,
    '_rels/.rels': rels([['rId1', 'officeDocument', 'ppt/presentation.xml'], ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'], ['rId3', 'extended-properties', 'docProps/app.xml']]),
    'docProps/core.xml': `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(doc.name)}</dc:title>${doc.meta?.author ? `<dc:creator>${x(doc.meta.author)}</dc:creator>` : ''}<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`,
    'docProps/app.xml': `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Pubwork</Application><Slides>${slides.length}</Slides></Properties>`,
    'ppt/presentation.xml': pres,
    'ppt/_rels/presentation.xml.rels': presRels,
    'ppt/presProps.xml': `${XML}<p:presentationPr ${NS}/>`,
    'ppt/viewProps.xml': `${XML}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`,
    'ppt/tableStyles.xml': `${XML}<a:tblStyleLst xmlns:a="${NS_A}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`,
    'ppt/theme/theme1.xml': THEME,
    'ppt/slideMasters/slideMaster1.xml': MASTER,
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]),
    'ppt/slideLayouts/slideLayout1.xml': LAYOUT,
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
  };
  slides.forEach((s, i) => { files[`ppt/slides/slide${i + 1}.xml`] = s.xml; files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = s.rels; });
  const entries = {};
  for (const [k, v] of Object.entries(files)) entries[k] = strToU8(v);
  for (const m of ctx.media) entries[`ppt/media/${m.name}`] = [m.bytes, { level: 0 }];
  const bytes = zipSync(entries, { level: 6 });
  return { name: `${safeName(doc.name)}.pptx`, blob: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), bytes };
}
