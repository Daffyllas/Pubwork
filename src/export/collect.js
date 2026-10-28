// Reads the pages as drawn and describes them plainly for other programs' formats (Word, LibreOffice):
// text boxes with their own paragraphs, pictures as image files, simple shapes as shapes, and anything
// those formats can't hold (gradients, shadows, recoloured or clipped pictures, curves with arcs) as a
// sharp picture of exactly what is on screen. Positions and sizes are in points from the page's top-left.
import { walkItems } from '../editor/model.js';
import { sliceParas, paraUnits } from '../render.js';

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

function sniff(u8) {
  if (u8[0] === 0x89 && u8[1] === 0x50) return 'png';
  if (u8[0] === 0xff && u8[1] === 0xd8) return 'jpeg';
  if (u8[0] === 0x47 && u8[1] === 0x49) return 'gif';
  if (u8[0] === 0x42 && u8[1] === 0x4d) return 'bmp';
  if (u8[0] === 0xd7 && u8[1] === 0xcd && u8[2] === 0xc6 && u8[3] === 0x9a) return 'wmf';
  if (u8[0] === 1 && u8[1] === 0 && u8[2] === 0 && u8[3] === 0 && u8[40] === 0x20 && u8[41] === 0x45) return 'emf';
  return null;
}

async function canvasPng(drawFn, wPt, hPt, dpi = 200) {
  let k = dpi / 72; const max = 3000;
  if (Math.max(wPt, hPt) * k > max) k = max / Math.max(wPt, hPt);
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(wPt * k)); c.height = Math.max(1, Math.round(hPt * k));
  await drawFn(c.getContext('2d'), c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  c.width = c.height = 0;
  return new Uint8Array(await blob.arrayBuffer());
}

// a picture of a shape exactly as drawn (gradients and shadows included), over the area it really covers
async function shapeAsPicture(svg, it) {
  const node = [...svg.children].find((c) => c.tagName !== 'defs'); if (!node) return null;
  let bb; try { bb = node.getBBox(); } catch { return null; }
  const sw = parseFloat(node.getAttribute('stroke-width')) || 0, f = node.getAttribute('filter') || '';
  const sh = /drop-shadow\((-?[\d.]+)px (-?[\d.]+)px/.exec(f), sx = sh ? Math.abs(+sh[1]) : 0, sy = sh ? Math.abs(+sh[2]) : 0;
  const x = bb.x - sw - sx - 1, y = bb.y - sw - sy - 1, w = bb.width + 2 * (sw + sx + 1), h = bb.height + 2 * (sw + sy + 1);
  const copy = svg.cloneNode(true); copy.removeAttribute('style'); copy.removeAttribute('class');
  copy.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); copy.setAttribute('width', w); copy.setAttribute('height', h);
  let xml = new XMLSerializer().serializeToString(copy);
  if (!xml.includes('xmlns=')) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await im.decode().catch(() => {});
  if (!im.naturalWidth && !im.width) return null;
  const bytes = await canvasPng((ctx, cw, ch) => ctx.drawImage(im, 0, 0, cw, ch), w, h);
  // drawn upright, turned around its centre like the shape
  return { type: 'image', x, y, w, h, rot: it.rotate ? -it.rotate : 0, bytes, ext: 'png' };
}

// simple outlines as move/line/curve steps; null when the outline needs arcs (then it becomes a picture)
function outline(it) {
  if (it.kind === 'polygon' || it.kind === 'polyline') return { cmds: it.points.map((p, i) => [i ? 'L' : 'M', p]), closed: it.kind === 'polygon' };
  if (it.kind !== 'path' || !it.d) return null;
  const tok = it.d.match(/[MLCQAZHVmlcqazhv]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const cmds = []; let i = 0, cmd = '', closed = false;
  const n = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z' || cmd === 'z') { closed = true; cmds.push(['Z']); continue; } }
    if (cmd === 'M' || cmd === 'L') cmds.push([cmd, [n(), n()]]);
    else if (cmd === 'C') cmds.push(['C', [n(), n()], [n(), n()], [n(), n()]]);
    else if (cmd === 'Q') cmds.push(['Q', [n(), n()], [n(), n()]]);
    else return null; // arcs and relative steps
  }
  return { cmds, closed };
}

// the part of a linked story each box shows, read from where the text was cut on screen
function chainParts(pageEls) {
  const starts = new Map(), boxesByChain = new Map();
  for (const pel of pageEls) for (const box of pel.querySelectorAll('.text[data-chain]')) {
    const id = box.dataset.chain; if (!boxesByChain.has(id)) boxesByChain.set(id, []);
    boxesByChain.get(id).push(box);
  }
  for (const boxes of boxesByChain.values()) {
    boxes.sort((a, b) => a.dataset.chainIndex - b.dataset.chainIndex);
    const story = boxes[0].__item.paras;
    const at = boxes.map((b) => { const p = b.querySelector('.flow p.para'); return p ? { p: +p.dataset.pi, c: +p.dataset.c0 } : null; });
    boxes.forEach((b, k) => {
      const s = at[k]; if (!s) { starts.set(b.dataset.id, []); return; }
      const e = at.slice(k + 1).find(Boolean) || null;
      starts.set(b.dataset.id, sliceParas(story, s, e).map((p) => ({ ...p, cont: undefined })));
    });
  }
  return starts;
}

// Word and LibreOffice can't wrap a text box's text around a picture laid over it. So the paragraphs of a
// box whose text is pushed aside are cut where the room changes, and each piece gets the indent the
// picture takes (and the gap it leaves above), measured on the page: the lines then fall as on screen.
function wrapBands(box, paras, k) {
  const flow = box.querySelector(':scope > .flow'), fr = flow.getBoundingClientRect();
  const floats = [...flow.querySelectorAll(':scope > .pw-float')].map((f) => ({ r: f.getBoundingClientRect(), side: f.style.float })).filter((f) => f.r.width > 0.5);
  const n = Math.max(1, parseInt(flow.style.columnCount, 10) || 1), gapPx = n > 1 ? (parseFloat(flow.style.columnGap) || 0) / k : 0;
  const colW = (fr.width - gapPx * (n - 1)) / n;
  const ps = [...flow.querySelectorAll(':scope > p.para')];
  if (ps.length !== paras.length) return paras;
  const out = []; let prevBottom = fr.top;
  ps.forEach((p, i) => {
    const pa = paras[i], { units } = paraUnits(p);
    const cs = getComputedStyle(p), mt = parseFloat(cs.marginTop) || 0;
    // the drawn lines: where each starts in the text, and its top and bottom
    const lines = [];
    for (const u of units) {
      const count = u.node ? u.n : 1;
      for (let j = 0; j < count; j++) {
        let r;
        if (u.node) { const rg = document.createRange(); rg.setStart(u.node, j); rg.setEnd(u.node, j + 1); const rs = rg.getClientRects(); r = rs[rs.length - 1]; } else r = u.el.getBoundingClientRect();
        if (!r || (!r.width && !r.height)) continue;
        const at = u.m + (u.node ? j : 0), last = lines[lines.length - 1];
        if (!last || r.top >= last.bottom - Math.min(r.height, last.bottom - last.top) * 0.4 || r.left < last.left - colW * 0.5) lines.push({ at, top: r.top, bottom: r.bottom, left: r.left });
        else { last.bottom = Math.max(last.bottom, r.bottom); last.top = Math.min(last.top, r.top); }
      }
    }
    if (!lines.length) { out.push(pa); prevBottom = p.getBoundingClientRect().bottom; return; }
    // the room each line has: what the floats take on its left and right, in its column
    const inset = (ln) => {
      const col = Math.max(0, Math.min(n - 1, Math.floor((ln.left - fr.left + 1) / (colW + gapPx)))), c0 = fr.left + col * (colW + gapPx), c1 = c0 + colW;
      let l = 0, r = 0;
      for (const f of floats) {
        if (f.r.bottom <= ln.top + 0.5 || f.r.top >= ln.bottom - 0.5 || f.r.right <= c0 + 0.5 || f.r.left >= c1 - 0.5) continue;
        if (f.side === 'left') l = Math.max(l, f.r.right - c0); else r = Math.max(r, c1 - f.r.left);
      }
      return [Math.round(l * k * 2) / 2, Math.round(r * k * 2) / 2];
    };
    const pieces = [];
    lines.forEach((ln, j) => {
      const [l, r] = inset(ln), lp = pieces[pieces.length - 1];
      // a line pushed down past a picture: the gap becomes space above
      const expected = j === 0 ? prevBottom + mt : lines[j - 1].bottom;
      const jump = j > 0 && ln.left < lines[j - 1].left - colW * 0.5 ? 0 : Math.max(0, (ln.top - expected) * k);
      if (lp && lp.l === l && lp.r === r && jump < 1) return;
      pieces.push({ at: ln.at, l, r, jump: jump >= 1 ? jump : 0 });
    });
    prevBottom = lines[lines.length - 1].bottom + (parseFloat(cs.marginBottom) || 0) * 0; // margins are added again from the next paragraph
    pieces.forEach((pc, j) => {
      const end = pieces[j + 1]?.at ?? null;
      const part = j === 0 && end == null ? { ...pa } : sliceParas([pa], { p: 0, c: pc.at }, end == null ? null : { p: 0, c: end })[0] || { ...pa, runs: [] };
      if (j > 0) { part.cont = true; part.dropCap = undefined; }
      if (j < pieces.length - 1) part.spaceAfter = 0;
      part.cont = j > 0 || pa.cont;
      if (pc.l) part.indentLeft = (pa.indentLeft || 0) + pc.l;
      if (pc.r) part.indentRight = (pa.indentRight || 0) + pc.r;
      if (pc.jump) part.spaceBefore = (j === 0 && !pa.cont ? pa.spaceBefore || 0 : 0) + pc.jump;
      else if (j > 0) part.spaceBefore = 0;
      if (j > 0 && part.cont && pc.jump) part.cont = false, part.indentFirst = 0, part.bullet = undefined; // so the space above is kept
      out.push(part);
    });
  });
  return out;
}

const solid = (f) => (f && f.type === 'solid' ? { color: f.color, opacity: f.opacity ?? 1 } : null);

export async function collectPages(doc, pageEls) {
  const parts = chainParts(pageEls);
  const out = [];
  for (let pi = 0; pi < doc.pages.length; pi++) {
    const pg = doc.pages[pi], pel = pageEls[pi], items = [];
    const byId = new Map(); for (const { it, page } of walkItems(doc)) if (page === pg) byId.set(it.id, it);
    // things drawn from the page's master page (background, page numbers …) are found in doc.masters
    const fromMaster = (el) => { const m = doc.masters?.find((mm) => mm.id === el.dataset.master); if (!m) return null; const all = []; const rec = (l) => l.forEach((x) => { all.push(x); if (x.type === 'group') rec(x.items); }); rec(m.items || []); return all.find((x) => x.id === el.dataset.id) || null; };
    const k = pg.w / (pel.getBoundingClientRect().width || 1); // points per screen pixel
    for (const el of pel.querySelectorAll(':scope > .it')) {
      const it = el.classList.contains('from-master') ? fromMaster(el) : byId.get(el.dataset.id); if (!it) continue;
      const rot = it.rotate ? -it.rotate : 0; // clockwise degrees, as shown
      const base = { x: it.x, y: it.y, w: it.w, h: it.h, rot };
      if (it.type === 'text') {
        let paras = it.chain ? parts.get(it.id) || [] : it.paras;
        if (el.querySelector(':scope > .flow > .pw-float')) paras = wrapBands(el, paras, k);
        items.push({ ...base, type: 'text', pad: it.pad || [3.6, 3.6, 3.6, 3.6], valign: it.valign || 'top', fill: solid(it.fill), stroke: it.stroke || null, columns: it.columns || 1, columnGap: it.columnGap || 9, paras,
          hyphenate: !!it.hyphenate, lang: el.lang || null, pageNumber: pi + 1, pageCount: doc.pages.length });
      } else if (it.type === 'table') {
        const rowHeights = [...el.querySelectorAll('tr')].map((tr, i) => tr.getBoundingClientRect().height * k || it.rows[i]?.h || 14);
        items.push({ ...base, type: 'table', cols: it.cols, rows: it.rows, rowHeights });
      } else if (it.type === 'image') {
        const img = el.querySelector('img');
        if (!img || el.classList.contains('missing') || el.classList.contains('placeholder')) continue;
        let bytes = null, ext = null;
        if (!it.adjust && !it.points && !it.fx && it.data) {
          bytes = b64ToBytes(it.data); ext = sniff(bytes);
          if (ext === 'bmp' && !(bytes[0] === 0x42 && bytes[1] === 0x4d)) ext = null;
        }
        if (!ext) {
          // recoloured, clipped, or an odd format: a picture of what is shown
          const poly = it.points?.map(([px, py]) => [(px - it.x) / (it.w || 1), (py - it.y) / (it.h || 1)]);
          const natural = Math.max(img.naturalWidth || 0, img.naturalHeight || 0);
          const dpi = img.src.startsWith('data:image/svg') ? 300 : Math.min(300, Math.max(150, natural ? (natural / Math.max(it.w, it.h)) * 72 : 200));
          bytes = await canvasPng((ctx, cw, ch) => {
            if (poly) { ctx.beginPath(); poly.forEach(([u, v], i) => (i ? ctx.lineTo(u * cw, v * ch) : ctx.moveTo(u * cw, v * ch))); ctx.closePath(); ctx.clip(); }
            if (img.style.filter) ctx.filter = img.style.filter;
            ctx.drawImage(img, 0, 0, cw, ch);
          }, it.w, it.h, dpi);
          ext = 'png';
        }
        items.push({ ...base, type: 'image', bytes, ext, stroke: (it.fx?.radius || (it.fx && it.points)) ? null : it.stroke || null });
      } else if (it.type === 'shape') {
        const plainFill = !it.fill || it.fill.type === 'solid';
        const geom = it.kind === 'rect' ? (it.rx ? 'roundRect' : 'rect') : it.kind === 'ellipse' ? 'ellipse' : 'path';
        const path = geom === 'path' ? outline(it) : null;
        if (!plainFill || it.shadow || (geom === 'path' && !path)) {
          const pic = await shapeAsPicture(el, it); if (pic) items.push(pic);
          continue;
        }
        items.push({ ...base, type: 'shape', geom, rx: it.rx || 0, path, fill: solid(it.fill), stroke: it.stroke || null });
      }
    }
    out.push({ w: pg.w, h: pg.h, items });
  }
  return out;
}

// "0.0138in solid #000000" -> { width (pt), style, color }
export function parseBorder(s) {
  if (!s || /none|hidden/.test(s)) return null;
  const m = /(-?[\d.]+)(pt|in|cm|mm|px)?\s+(\w+)\s+(#[0-9a-f]{3,6}|\w+)/i.exec(s); if (!m) return null;
  const k = { pt: 1, in: 72, cm: 72 / 2.54, mm: 72 / 25.4, px: 0.75 }[m[2] || 'pt'];
  return { width: Math.max(0.25, +m[1] * k), style: m[3], color: m[4] };
}

// a table's cells laid on its grid: [[{cell, origin: bool, from: originCell}]]
export function tableGrid(t) {
  const R = t.rows.length, C = t.cols.length, grid = Array.from({ length: R }, () => Array(C).fill(null));
  t.rows.forEach((row, r) => {
    let c = 0;
    for (const cell of row.cells) {
      if (cell.covered) { c++; continue; }
      const col = Number.isFinite(cell.col) ? cell.col : c;
      for (let dr = 0; dr < (cell.span?.[1] || 1); dr++) for (let dc = 0; dc < (cell.span?.[0] || 1); dc++) {
        if (r + dr < R && col + dc < C) grid[r + dr][col + dc] = { cell, origin: !dr && !dc, top: !dr, left: !dc };
      }
      c = col + (cell.span?.[0] || 1);
    }
  });
  return grid;
}
