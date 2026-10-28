// LibreOffice Draw (.odg), the free, open format for page layouts. Every page keeps its size and
// everything on it stays where it was: text frames that can still be edited, pictures, shapes and tables
// (as boxes with lines, which Draw handles best).
import { zipSync, strToU8 } from 'fflate';
import { collectPages, parseBorder, tableGrid } from './collect.js';
import { safeName } from './stage.js';
import { cleanLink, fieldText } from '../render.js';

const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const n = (v) => `${+(+v).toFixed(3)}pt`;
const hex = (c) => { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(c || ''); if (!m) return '#000000'; return '#' + (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toLowerCase(); };

const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0" office:version="1.3"';

class Styles {
  constructor() { this.map = new Map(); this.list = []; this.fonts = new Set(); }
  get(family, prefix, props) {
    const key = family + props;
    if (!this.map.has(key)) { const name = `${prefix}${this.list.length + 1}`; this.map.set(key, name); this.list.push(`<style:style style:name="${name}" style:family="${family}">${props}</style:style>`); }
    return this.map.get(key);
  }
}

function textProps(r, st, fallbackSize) {
  const font = r.font || 'Times New Roman'; st.fonts.add(font);
  let p = `style:font-name="${x(font)}" fo:font-size="${n(r.size || fallbackSize || 10)}"`;
  p += ` fo:font-weight="${r.bold ? 'bold' : 'normal'}" fo:font-style="${r.italic ? 'italic' : 'normal'}"`;
  if (r.underline) p += ` style:text-underline-style="${r.underline === 'dotted' ? 'dotted' : 'solid'}" style:text-underline-type="${r.underline === 'double' ? 'double' : 'single'}" style:text-underline-width="auto" style:text-underline-color="font-color"`;
  if (r.strike) p += ' style:text-line-through-style="solid" style:text-line-through-type="single"';
  if (r.color) p += ` fo:color="${hex(r.color)}"`;
  if (r.highlight) p += ` fo:background-color="${hex(r.highlight)}"`;
  // every setting is written out, also when off, so a span never takes it from its paragraph's style
  p += ` fo:text-transform="${r.caps === 'all' ? 'uppercase' : 'none'}" fo:font-variant="${r.caps === 'small' ? 'small-caps' : 'normal'}"`;
  p += ` style:text-position="${r.position === 'super' ? 'super 58%' : r.position === 'sub' ? 'sub 58%' : '0% 100%'}"`;
  p += ` fo:letter-spacing="${r.tracking ? n(r.tracking) : 'normal'}"`;
  if (!r.underline) p += ' style:text-underline-style="none"';
  if (!r.strike) p += ' style:text-line-through-style="none"';
  if (!r.highlight) p += ' fo:background-color="transparent"';
  if (r.outline) p += ' style:text-outline="true"';
  if (r.shadow) p += ' fo:text-shadow="1pt 1pt"';
  p += ` style:letter-kerning="${r.kern === 'off' ? 'false' : 'true'}"`;
  if (st.hyph) { p += ' fo:hyphenate="true"'; const [lg, ct] = String(st.hyph).split('-'); if (lg) p += ` fo:language="${x(lg)}"${ct ? ` fo:country="${x(ct.toUpperCase())}"` : ''}`; }
  return `<style:text-properties ${p}/>`;
}
// spaces, tabs and line breaks are written as their own elements
function textXml(s) {
  let out = '';
  for (const part of s.split(/(\t|\n|\u000b| {2,}|^ )/)) {
    if (!part) continue;
    if (part === '\t') out += '<text:tab/>';
    else if (part === '\n' || part === '\u000b') out += '<text:line-break/>';
    else if (/^ +$/.test(part)) out += part.length === 1 ? '<text:s/>' : ` <text:s text:c="${part.length - 1}"/>`;
    else out += x(part);
  }
  return out;
}
function parasXml(paras, st, ctx) {
  if (!paras.length) return '<text:p/>';
  return paras.map((pa) => {
    let pp = `fo:margin-top="${n(pa.cont ? 0 : pa.spaceBefore || 0)}" fo:margin-bottom="${n(pa.spaceAfter || 0)}"`;
    const align = pa.runs.some((r) => r.text.includes('\t')) ? 'left' : pa.align; // lines with tabs line up from the left
    if (align) pp += ` fo:text-align="${{ left: 'start', center: 'center', right: 'end', justify: 'justify' }[align] || 'start'}"`;
    if (pa.indentLeft) pp += ` fo:margin-left="${n(pa.indentLeft)}"`;
    if (pa.indentRight) pp += ` fo:margin-right="${n(pa.indentRight)}"`;
    if (pa.indentFirst && !pa.cont) pp += ` fo:text-indent="${n(pa.indentFirst)}"`;
    if (pa.lineHeight?.mult) pp += ` fo:line-height="${Math.round(pa.lineHeight.mult * 100)}%"`;
    else if (pa.lineHeight?.pt) pp += ` fo:line-height="${n(pa.lineHeight.pt)}"`;
    if (pa.background) pp += ` fo:background-color="${hex(pa.background)}"`;
    const size = Math.max(0, ...pa.runs.map((r) => r.size || 0)) || ctx.lastSize || 10;
    const first = pa.runs.find((r) => r.text) || pa.runs[0] || {};
    let kids = '';
    if (pa.tabs?.length) kids += `<style:tab-stops>${pa.tabs.map((t) => `<style:tab-stop style:position="${n(Math.max(0, t.pos - (pa.indentLeft || 0)))}" style:type="${{ right: 'right', center: 'center', decimal: 'char' }[t.align] || 'left'}"${t.align === 'decimal' ? ' style:char="."' : ''}${t.leader && t.leader !== 'none' ? ` style:leader-style="${t.leader === 'dot' ? 'dotted' : t.leader === 'dash' ? 'dash' : 'solid'}" style:leader-text="${t.leader === 'dot' ? '.' : t.leader === 'dash' ? '-' : '_'}"` : ''}/>`).join('')}</style:tab-stops>`;
    // a bullet or number hanging in front of the words: a tab stop where the words start (positions count from the indent)
    const mark = pa.list && !pa.cont ? pa.list.text : null, hang = mark && pa.indentFirst < 0;
    if (hang && !pa.tabs?.length) kids += '<style:tab-stops><style:tab-stop style:position="0pt"/></style:tab-stops>';
    if (pa.dropCap?.lines >= 2 && !pa.cont) kids += `<style:drop-cap style:lines="${Math.min(5, Math.round(pa.dropCap.lines))}" style:length="1" style:distance="2pt"/>`;
    const pName = st.get('paragraph', 'P', `<style:paragraph-properties ${pp}${kids ? `>${kids}</style:paragraph-properties>` : '/>'}${textProps({ ...first, text: '' }, st, size)}`);
    let body = '';
    if (mark) body += `<text:span text:style-name="${st.get('text', 'T', textProps({ ...first, underline: false, strike: false, highlight: null }, st, size))}">${textXml(`${mark}${hang ? '\t' : ' '}`)}</text:span>`;
    for (const r of pa.runs) {
      if (r.size) ctx.lastSize = r.size;
      if (!r.text) continue;
      const inner = r.field === 'page' ? `<text:page-number text:select-page="current">${x(fieldText('page', ctx.page))}</text:page-number>`
        : r.field === 'pages' ? `<text:page-count>${x(fieldText('pages', ctx.page))}</text:page-count>`
          : r.field === 'date' ? `<text:date>${x(fieldText('date', ctx.page))}</text:date>` : textXml(r.text);
      const href = r.link && cleanLink(r.link);
      body += `<text:span text:style-name="${st.get('text', 'T', textProps(r, st, size))}">${href ? `<text:a xlink:type="simple" xlink:href="${x(href)}">${inner}</text:a>` : inner}</text:span>`;
    }
    return `<text:p text:style-name="${pName}">${body}</text:p>`;
  }).join('');
}

function graphicStyle(st, { fill = null, stroke = null, text = false, pad = null, valign = 'top', columns = 1, columnGap = 0 }) {
  let p = `draw:fill="${fill ? 'solid' : 'none'}"${fill ? ` draw:fill-color="${hex(fill.color)}"${fill.opacity < 1 ? ` draw:opacity="${Math.round(fill.opacity * 100)}%"` : ''}` : ''}`;
  p += stroke && stroke.width ? ` draw:stroke="solid" svg:stroke-color="${hex(stroke.color)}" svg:stroke-width="${n(stroke.width)}"${stroke.opacity != null && stroke.opacity < 1 ? ` svg:stroke-opacity="${Math.round(stroke.opacity * 100)}%"` : ''}` : ' draw:stroke="none"';
  p += ' draw:shadow="hidden"';
  if (text) {
    const [t, r, b, l] = pad || [0, 0, 0, 0];
    p += ` fo:padding-top="${n(t)}" fo:padding-right="${n(r)}" fo:padding-bottom="${n(b)}" fo:padding-left="${n(l)}" draw:textarea-vertical-align="${valign === 'middle' ? 'middle' : valign === 'bottom' ? 'bottom' : 'top'}" draw:textarea-horizontal-align="justify" draw:auto-grow-height="false" draw:auto-grow-width="false" fo:min-height="0pt" fo:wrap-option="wrap"`;
  }
  const cols = text && columns > 1 ? `<style:columns fo:column-count="${columns}" fo:column-gap="${n(columnGap)}"/>` : '';
  return st.get('graphic', 'gr', cols ? `<style:graphic-properties ${p}>${cols}</style:graphic-properties>` : `<style:graphic-properties ${p}/>`);
}

// where and how big; turned things are written as a turn and a move, as ODF wants
function place(it) {
  const size = `svg:width="${n(Math.max(it.w, 0.01))}" svg:height="${n(Math.max(it.h, 0.01))}"`;
  if (!it.rot) return `${size} svg:x="${n(it.x)}" svg:y="${n(it.y)}"`;
  const t = (it.rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2, u = -it.w / 2, v = -it.h / 2;
  const px = cx + u * c - v * s, py = cy + u * s + v * c;
  return `${size} draw:transform="rotate (${+(-t).toFixed(6)}) translate (${n(px)} ${n(py)})"`;
}

function itemXml(it, st, ctx) {
  const z = ctx.z++;
  if (it.type === 'text') {
    const gs = graphicStyle(st, { fill: it.fill, stroke: it.stroke, text: true, pad: it.pad, valign: it.valign, columns: it.columns, columnGap: it.columnGap });
    ctx.page = { pageNumber: it.pageNumber, pageCount: it.pageCount }; st.hyph = it.hyphenate ? it.lang || 'en' : null;
    const inner = parasXml(it.paras, st, ctx); st.hyph = null;
    return `<draw:frame draw:style-name="${gs}" draw:z-index="${z}" ${place(it)}><draw:text-box>${inner}</draw:text-box></draw:frame>`;
  }
  if (it.type === 'image') {
    const name = `Pictures/image${++ctx.images}.${it.ext}`;
    ctx.media.push({ name, bytes: it.bytes, ext: it.ext });
    return `<draw:frame draw:style-name="${graphicStyle(st, { stroke: it.stroke })}" draw:z-index="${z}" ${place(it)}><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
  }
  if (it.type === 'shape') {
    const gs = graphicStyle(st, { fill: it.fill, stroke: it.stroke });
    if (it.geom === 'rect' || it.geom === 'roundRect') return `<draw:rect draw:style-name="${gs}" draw:z-index="${z}" ${place(it)}${it.rx ? ` draw:corner-radius="${n(it.rx)}"` : ''}/>`;
    if (it.geom === 'ellipse') return `<draw:ellipse draw:style-name="${gs}" draw:z-index="${z}" ${place(it)}/>`;
    const cmds = it.path.cmds, pts = cmds.filter((c) => c[0] !== 'Z');
    if (pts.length === 2 && pts[0][0] === 'M' && pts[1][0] === 'L') {
      // a straight line: written as a line, turned around the item's centre if needed
      let [a, b] = [pts[0][1], pts[1][1]];
      if (it.rot) {
        const t = (it.rot * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t), cx = it.x + it.w / 2, cy = it.y + it.h / 2;
        const r = ([px, py]) => [cx + (px - cx) * c - (py - cy) * sn, cy + (px - cx) * sn + (py - cy) * c];
        a = r(a); b = r(b);
      }
      return `<draw:line draw:style-name="${gs}" draw:z-index="${z}" svg:x1="${n(a[0])}" svg:y1="${n(a[1])}" svg:x2="${n(b[0])}" svg:y2="${n(b[1])}"/>`;
    }
    const W = Math.max(1, Math.round(it.w * 100)), H = Math.max(1, Math.round(it.h * 100));
    const P = ([px, py]) => `${Math.round((px - it.x) * 100)} ${Math.round((py - it.y) * 100)}`;
    const d = cmds.map((c) => (c[0] === 'Z' ? 'Z' : `${c[0]}${c.slice(1).map(P).join(' ')}`)).join(' ') + (it.path.closed && cmds[cmds.length - 1]?.[0] !== 'Z' ? ' Z' : '');
    return `<draw:path draw:style-name="${gs}" draw:z-index="${z}" ${place({ ...it, w: Math.max(it.w, 0.01), h: Math.max(it.h, 0.01) })} svg:viewBox="0 0 ${W} ${H}" svg:d="${d}"/>`;
  }
  if (it.type === 'table') {
    // cells as text frames on the grid, with their borders as lines on top
    let out = ''; const grid = tableGrid(it);
    const colX = [it.x]; it.cols.forEach((c) => colX.push(colX[colX.length - 1] + c));
    const rowY = [it.y]; it.rowHeights.forEach((h) => rowY.push(rowY[rowY.length - 1] + h));
    const lines = [];
    grid.forEach((row, r) => row.forEach((g, c) => {
      if (!g || !g.origin) return;
      const cs = g.cell.span?.[0] || 1, rs = g.cell.span?.[1] || 1, cell = g.cell;
      const bx = colX[c], by = rowY[r], bw = colX[Math.min(c + cs, it.cols.length)] - bx, bh = rowY[Math.min(r + rs, it.rowHeights.length)] - by;
      const gs = graphicStyle(st, { fill: cell.fill ? { color: cell.fill, opacity: 1 } : null, text: true, pad: [2, 4, 2, 4], valign: cell.valign });
      out += `<draw:frame draw:style-name="${gs}" draw:z-index="${ctx.z++}" svg:width="${n(bw)}" svg:height="${n(bh)}" svg:x="${n(bx)}" svg:y="${n(by)}"><draw:text-box>${parasXml(cell.paras || [], st, ctx)}</draw:text-box></draw:frame>`;
      const b = (cell.borders || []).map(parseBorder); // top, right, bottom, left
      if (b[0]) lines.push([bx, by, bx + bw, by, b[0]]);
      if (b[1]) lines.push([bx + bw, by, bx + bw, by + bh, b[1]]);
      if (b[2]) lines.push([bx, by + bh, bx + bw, by + bh, b[2]]);
      if (b[3]) lines.push([bx, by, bx, by + bh, b[3]]);
    }));
    for (const [x1, y1, x2, y2, b] of lines) out += `<draw:line draw:style-name="${graphicStyle(st, { stroke: { color: b.color, width: b.width } })}" draw:z-index="${ctx.z++}" svg:x1="${n(x1)}" svg:y1="${n(y1)}" svg:x2="${n(x2)}" svg:y2="${n(y2)}"/>`;
    return `<draw:g>${out}</draw:g>`;
  }
  return '';
}

export async function exportOdg(doc, pageEls) {
  const pages = await collectPages(doc, pageEls);
  const st = new Styles(), ctx = { z: 0, images: 0, media: [], lastSize: 10 };
  // one master page per page size
  const sizes = new Map();
  const master = (pg) => { const k = `${pg.w.toFixed(2)}x${pg.h.toFixed(2)}`; if (!sizes.has(k)) sizes.set(k, { name: `M${sizes.size}`, w: pg.w, h: pg.h }); return sizes.get(k).name; };
  const body = pages.map((pg, i) => { ctx.z = 0; return `<draw:page draw:name="${x(`page${i + 1}`)}" draw:master-page-name="${master(pg)}">${pg.items.map((it) => itemXml(it, st, ctx)).join('')}</draw:page>`; }).join('');
  const fontDecls = `<office:font-face-decls>${[...st.fonts].map((f) => `<style:font-face style:name="${x(f)}" svg:font-family="&apos;${x(f)}&apos;"/>`).join('')}</office:font-face-decls>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content ${NS}>${fontDecls}<office:automatic-styles>${st.list.join('')}</office:automatic-styles><office:body><office:drawing>${body}</office:drawing></office:body></office:document-content>`;
  const layouts = [...sizes.values()].map((s) => `<style:page-layout style:name="P${s.name}"><style:page-layout-properties fo:margin-top="0pt" fo:margin-bottom="0pt" fo:margin-left="0pt" fo:margin-right="0pt" fo:page-width="${n(s.w)}" fo:page-height="${n(s.h)}" style:print-orientation="${s.w > s.h ? 'landscape' : 'portrait'}"/></style:page-layout>`).join('');
  const masters = [...sizes.values()].map((s) => `<style:master-page style:name="${s.name}" style:page-layout-name="P${s.name}" draw:style-name="dp1"/>`).join('');
  const styles = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-styles ${NS}>${fontDecls}<office:styles><style:default-style style:family="graphic"><style:graphic-properties draw:shadow="hidden"/><style:text-properties style:font-name="Times New Roman" fo:font-size="10pt"/></style:default-style></office:styles><office:automatic-styles>${layouts}<style:style style:name="dp1" style:family="drawing-page"><style:drawing-page-properties draw:fill="none"/></style:style></office:automatic-styles><office:master-styles>${masters}</office:master-styles></office:document-styles>`;
  const meta = `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta ${NS}><office:meta><meta:generator>Pubwork</meta:generator><dc:title>${x(doc.name)}</dc:title>${doc.meta?.author ? `<dc:creator>${x(doc.meta.author)}</dc:creator>` : ''}</office:meta></office:document-meta>`;
  const mime = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', wmf: 'image/x-wmf', emf: 'image/x-emf' };
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>\n<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="application/vnd.oasis.opendocument.graphics"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>${ctx.media.map((m) => `<manifest:file-entry manifest:full-path="${m.name}" manifest:media-type="${mime[m.ext]}"/>`).join('')}</manifest:manifest>`;
  const entries = { mimetype: [strToU8('application/vnd.oasis.opendocument.graphics'), { level: 0 }], 'content.xml': strToU8(content), 'styles.xml': strToU8(styles), 'meta.xml': strToU8(meta), 'META-INF/manifest.xml': strToU8(manifest) };
  for (const m of ctx.media) entries[m.name] = [m.bytes, { level: 0 }];
  const bytes = zipSync(entries, { level: 6 });
  return { name: `${safeName(doc.name)}.odg`, blob: new Blob([bytes], { type: 'application/vnd.oasis.opendocument.graphics' }), bytes };
}
