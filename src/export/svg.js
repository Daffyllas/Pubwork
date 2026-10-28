// SVG pictures that stay editable (.svg, one for each page; several pages come as a .zip): for designers
// who carry on in Inkscape, Illustrator or a browser. Like the PDF, everything is measured from the page as
// the browser laid it out: words are real text (<text>, so they can be selected, searched and changed) at
// the place the browser put them, shapes are the page's own vector shapes (gradients and shadows too),
// pictures keep their original JPEG/PNG data inside the file. The fonts are named, and the file's own
// fonts and the free stand-in fonts come inside the file, so a browser shows it exactly as on screen.
import { zipSync, strToU8 } from 'fflate';
import { stagePages, safeName } from './stage.js';
import { bytesToB64, blobToB64 } from './pagetext.js';
import { embeddedFontBytes } from '../fonts.js';
import { t } from '../i18n/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const f = (v) => +(+v).toFixed(2);
const parsePt = (v) => parseFloat(v) || 0; // inline styles are written in pt by the renderer
const rotationOf = (el) => { const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform || ''); return m ? parseFloat(m[1]) : 0; };
const unq = (s) => s.trim().replace(/^["']|["']$/g, '');
const TWINS = { tinos: 'Liberation Serif', arimo: 'Liberation Sans', cousine: 'Liberation Mono' };
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);

// 'rgb(1, 2, 3)' / 'rgba(…, .5)' / '#abc' -> { hex: '#010203', a } ; null for transparent
function color(s) {
  if (!s || s === 'transparent' || s === 'none') return null;
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (m) return { hex: '#' + (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]).toLowerCase(), a: 1 };
  m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(s);
  if (!m) return null;
  const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  if (a <= 0.003) return null;
  return { hex: '#' + [m[1], m[2], m[3]].map((v) => Math.max(0, Math.min(255, Math.round(+v))).toString(16).padStart(2, '0')).join(''), a };
}
const fillAttr = (c, name = 'fill') => (c ? ` ${name}="${c.hex}"${c.a < 1 ? ` ${name}-opacity="${f(c.a)}"` : ''}` : ` ${name}="none"`);

// ------------------------------------------------------------------ one page
class PageSvg {
  constructor(pageEl, model, n) {
    this.el = pageEl; this.w = model.w; this.h = model.h; this.n = n;
    this.origin = pageEl.getBoundingClientRect();
    this.k = this.w / (this.origin.width || 1); // pt per CSS px
    this.measure = document.createElement('canvas').getContext('2d');
    this.defs = []; this.ids = 0; this.styles = new Map(); this.families = new Map(); // family -> Set('400 normal')
    this.codes = new Set();
  }
  X(px) { return (px - this.origin.left) * this.k; }
  Y(px) { return (px - this.origin.top) * this.k; }
  id(kind) { return `p${this.n}${kind}${++this.ids}`; }

  // ---------------------------------------------------------------- boxes: backgrounds and borders of text boxes, paragraphs, highlights and table cells
  boxes(root) {
    let out = '';
    const rect = (x, y, w, h, c) => { if (c && w > 0 && h > 0) out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${fillAttr(c)}/>`; };
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (e instanceof SVGElement) continue;
      const cs = getComputedStyle(e);
      const bg = color(cs.backgroundColor);
      const rects = cs.display === 'inline' ? [...e.getClientRects()] : [e.getBoundingClientRect()];
      if (bg) for (const r of rects) rect(this.X(r.left), this.Y(r.top), r.width * this.k, r.height * this.k, bg);
      if (cs.display === 'inline') continue;
      const r = rects[0];
      for (const [side, horiz] of [['Top', true], ['Bottom', true], ['Left', false], ['Right', false]]) {
        const bw = parseFloat(cs[`border${side}Width`]) || 0;
        if (!bw || cs[`border${side}Style`] === 'none' || cs[`border${side}Style`] === 'hidden') continue;
        const c = color(cs[`border${side}Color`]); if (!c) continue;
        const th = bw * this.k;
        if (horiz) rect(this.X(r.left), side === 'Top' ? this.Y(r.top) : this.Y(r.bottom) - th, r.width * this.k, th, c);
        else rect(side === 'Left' ? this.X(r.left) : this.X(r.right) - th, this.Y(r.top), th, r.height * this.k, c);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- text
  styleOf(el, pseudo = null) {
    const cache = pseudo ? (this._pseudo ||= new Map()) : this.styles;
    let s = cache.get(el); if (s) return s;
    const cs = getComputedStyle(el, pseudo);
    const sizePx = parseFloat(cs.fontSize) || 13;
    this.measure.font = `${cs.fontStyle} ${cs.fontWeight} ${sizePx}px ${cs.fontFamily}`;
    const m = this.measure.measureText('Hg');
    const asc = m.fontBoundingBoxAscent || sizePx * 0.8, desc = m.fontBoundingBoxDescent || sizePx * 0.2;
    // the font names as the page asks for them; a font that came inside the .pub file goes by its own name
    const fams = [];
    for (const raw of cs.fontFamily.split(',')) {
      const n = unq(raw).replace(/^pw-embedded-/i, ''); if (!n) continue;
      // the free stand-ins have look-alikes with the same letter widths on many computers
      for (const x of [n, TWINS[n.toLowerCase()]]) if (x && !fams.some((y) => y.toLowerCase() === x.toLowerCase())) fams.push(x);
    }
    const stroke = parseFloat(cs.webkitTextStrokeWidth) > 0 ? color(cs.webkitTextStrokeColor) || color(cs.color) : null;
    s = {
      fams, family: fams.map((n) => (GENERIC.has(n.toLowerCase()) ? n : `'${n.replace(/'/g, '')}'`)).join(', '),
      weight: parseInt(cs.fontWeight, 10) || 400, italic: cs.fontStyle !== 'normal', sizePx, ascRatio: asc / (asc + desc),
      color: color(cs.color), stroke, strokeW: stroke ? parseFloat(cs.webkitTextStrokeWidth) : 0,
      upper: cs.textTransform === 'uppercase', smallCaps: cs.fontVariantCaps === 'small-caps',
      under: /underline/.test(cs.textDecorationLine), strike: /line-through/.test(cs.textDecorationLine),
      shadow: cs.textShadow && cs.textShadow !== 'none', hyph: cs.hyphens === 'auto' || cs.webkitHyphens === 'auto',
      spacing: parseFloat(cs.letterSpacing) || 0, lang: el.closest?.('[lang]')?.getAttribute('lang') || '',
    };
    const key = `${s.weight >= 600 ? 700 : 400} ${s.italic ? 'italic' : 'normal'}`;
    for (const n of fams) { const lk = n.toLowerCase(); if (!this.families.has(lk)) this.families.set(lk, new Set()); this.families.get(lk).add(key); }
    for (const raw of cs.fontFamily.split(',')) { const lk = unq(raw).toLowerCase(); if (lk.startsWith('pw-embedded-')) (this.embeddedUsed ||= new Set()).add(unq(raw).slice(12)); }
    cache.set(el, s);
    return s;
  }
  // the words of a text box or table as drawn: [{ text, st, left, right, top, height, size }]
  words(root, clip) {
    const out = [], range = document.createRange();
    const drops = new Map();
    for (const p of root.querySelectorAll('p.para.dropcap')) {
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, { acceptNode: (tn) => (tn.parentElement.closest('.bullet, .pw-gen') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      let tn; while ((tn = w.nextNode())) {
        const i = tn.data.search(/[^\s\u200b]/); if (i < 0) continue;
        const rest = document.createRange(); rest.setStart(tn, i + 1); rest.setEnd(p, p.childNodes.length);
        const ln = [...rest.getClientRects()].filter((q) => q.width && q.height).sort((a, b) => a.top - b.top)[0];
        const body = this.styleOf(tn.parentElement);
        const big = parsePt(p.style.getPropertyValue('--dc-size')) / this.k || 0; // the letter's size (CSS px), as the renderer worked it out
        drops.set(tn, { i, st: this.styleOf(p, '::first-letter'), line1: ln ? ln.top + ln.height * body.ascRatio : null, bodyPx: body.sizePx, big });
        break;
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n, last = null;
    while ((n = walker.nextNode())) {
      const st0 = this.styleOf(n.parentElement);
      if (!st0.color && !st0.stroke) continue;
      const text = n.data, drop = drops.get(n); let cur = null;
      const para = n.parentElement.closest('p');
      const flush = () => { if (cur && cur.text.trim()) out.push(cur); cur = null; };
      for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        const cp = text.codePointAt(i), len = cp > 0xffff ? 2 : 1;
        if (ch === '\u200b' || ch === '\n' || ch === '\r') { flush(); last = null; continue; }
        if (ch === '\u00ad') { if (last) last.shy = true; continue; }
        const isDrop = drop && i === drop.i, st = isDrop ? drop.st : st0;
        if (drop && (i === drop.i || i === drop.i + 1)) flush();
        range.setStart(n, i); range.setEnd(n, i + len);
        const rs = range.getClientRects(), r = rs[rs.length - 1];
        if (!r || (!r.width && ch !== ' ')) {
          if (cur && /[\p{M}\u200d\ufe0f]/u.test(text.slice(i, i + len))) cur.text += text.slice(i, i + len); // a joining mark stays with its letter
          i += len - 1; continue;
        }
        const isSpace = /\s/.test(ch), letter = !isSpace && /[\p{L}\p{N}]/u.test(ch);
        // a word carried on to the next line without a space: the browser drew a hyphen at the line end
        if (letter && last && last.para === para && (st.hyph || last.shy) && !(drop && i <= drop.i + 1) && r.top > last.top + last.height * 0.5) {
          const prev = cur || out[out.length - 1]; if (prev === last.word) prev.hyphen = true;
          flush();
        }
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (!isDrop && !(cx >= clip.left - 1 && cx <= clip.right + 1 && cy >= clip.top - 1 && cy <= clip.bottom + 1)) { flush(); i += len - 1; continue; }
        if (isSpace) { if (cur) cur.text += ' '; flush(); last = null; continue; }
        if (len === 2) ch = text.slice(i, i + 2);
        if (st.upper) ch = ch.toUpperCase();
        const sameLine = cur && Math.abs(r.top - cur.top) < r.height * 0.3 && r.left >= cur.right - r.width * 0.5 && r.left - cur.right < st.sizePx * 0.25 + Math.max(0, st.spacing);
        if (!(sameLine && cur.st === st)) { flush(); cur = { text: '', st, left: r.left, right: r.right, top: r.top, height: r.height, para }; }
        if (isDrop && drop.line1 != null) {
          // a big first letter: its capitals reach from the top of the first line's capitals down
          const size = drop.big || st.sizePx;
          cur.size = size; cur.baseline = drop.line1 - 0.7 * drop.bodyPx + 0.7 * size;
        }
        cur.text += ch; cur.height = Math.max(cur.height, r.height); cur.right = Math.max(cur.right, r.right);
        last = letter ? { para, top: r.top, height: r.height, word: cur, shy: false } : null;
        i += len - 1;
      }
      flush();
    }
    for (const w of out) for (const ch of w.text) this.codes.add(ch.codePointAt(0));
    return out;
  }
  // text attributes of a style at a size (CSS px); with base, only what differs from the base style
  textAttrs(st, sizePx, base = null, baseSize = null) {
    const a = [], fs = f(sizePx * this.k);
    const diff = (k) => !base || base[k] !== st[k];
    if (diff('family')) a.push(`font-family="${esc(st.family)}"`);
    if (!base || f(baseSize * this.k) !== fs) a.push(`font-size="${fs}"`);
    if (diff('weight')) a.push(`font-weight="${st.weight >= 600 ? 'bold' : 'normal'}"`);
    if (diff('italic')) a.push(`font-style="${st.italic ? 'italic' : 'normal'}"`);
    if (diff('smallCaps') && (st.smallCaps || base)) a.push(`font-variant="${st.smallCaps ? 'small-caps' : 'normal'}"`);
    if (!base || base.color !== st.color || base.stroke !== st.stroke) {
      a.push(fillAttr(st.color || (st.stroke ? null : { hex: '#000000', a: 1 })).trim());
      if (st.stroke) a.push(`stroke="${st.stroke.hex}" stroke-width="${f(Math.max(0.25, st.strokeW * this.k))}"`);
      else if (base?.stroke) a.push('stroke="none"');
    }
    if (diff('under') || diff('strike')) { const deco = [st.under && 'underline', st.strike && 'line-through'].filter(Boolean).join(' '); if (deco || base) a.push(`text-decoration="${deco || 'none'}"`); }
    if (diff('spacing') && (st.spacing || base)) a.push(`letter-spacing="${f(st.spacing * this.k)}"`);
    return a.length ? ' ' + a.join(' ') : '';
  }
  text(itemEl) {
    const r = itemEl.getBoundingClientRect(), cs = getComputedStyle(itemEl);
    const clip = itemEl.classList.contains('text')
      ? { left: r.left + parseFloat(cs.borderLeftWidth), right: r.right - parseFloat(cs.borderRightWidth), top: r.top + parseFloat(cs.borderTopWidth), bottom: r.bottom - parseFloat(cs.borderBottomWidth) }
      : { left: r.left - 2, right: r.right + 2, top: r.top - 2, bottom: r.bottom + 2 };
    const words = this.words(itemEl, clip);
    if (!words.length) return '';
    // words on the same line, one after another in the same box, become one line of text: <text> with a <tspan> for each word
    const lines = [];
    for (const w of words) {
      const size = w.size || w.st.sizePx;
      w.base = w.baseline ?? (w.top + w.height * w.st.ascRatio);
      const ln = lines[lines.length - 1];
      if (ln && !w.size && !ln.drop && Math.abs(ln.base - w.base) < 0.6 && w.left >= ln.right - 1) { ln.words.push(w); ln.right = w.right; }
      else lines.push({ base: w.base, words: [w], right: w.right, drop: !!w.size, size });
    }
    let out = '';
    for (const ln of lines) {
      const b = ln.words[0].st, bs = ln.words[0].size || b.sizePx;
      const y = f(this.Y(ln.base));
      let spans = '', shadow = '';
      ln.words.forEach((w, i) => {
        const txt = esc(w.text.replace(/ +$/, '')) + (w.hyphen ? '-' : '') + (i < ln.words.length - 1 && / $/.test(w.text) ? ' ' : '');
        spans += `<tspan x="${f(this.X(w.left))}"${i ? '' : ` y="${y}"`}${this.textAttrs(w.st, w.size || w.st.sizePx, b, bs)}>${txt}</tspan>`;
        if (w.st.shadow) { const d = w.st.sizePx * this.k * 0.06, sh = (st) => ({ ...st, color: { hex: '#000000', a: 0.35 * (st.color?.a ?? 1) }, stroke: null }); shadow += `<tspan x="${f(this.X(w.left) + d)}" y="${f(this.Y(ln.base) + d)}"${this.textAttrs(sh(w.st), w.size || w.st.sizePx, null)}>${txt}</tspan>`; }
      });
      const lang = b.lang ? ` xml:lang="${esc(b.lang)}"` : '';
      if (shadow) out += `<text xml:space="preserve" aria-hidden="true">${shadow}</text>`;
      out += `<text xml:space="preserve"${lang}${this.textAttrs(b, bs)}>${spans}</text>`;
    }
    // text that runs past its box is cut off at the box, as on the page
    const id = this.id('c');
    this.defs.push(`<clipPath id="${id}"><rect x="${f(this.X(clip.left))}" y="${f(this.Y(clip.top))}" width="${f((clip.right - clip.left) * this.k)}" height="${f((clip.bottom - clip.top) * this.k)}"/></clipPath>`);
    const links = [...itemEl.querySelectorAll('a.pwlink[href]')].filter((a) => /^(https?:|mailto:|tel:)/i.test(a.getAttribute('href')));
    let linkOut = '';
    for (const a of links) for (const q of a.getClientRects()) if (q.width > 0.5 && q.height > 0.5) linkOut += `<a xlink:href="${esc(a.getAttribute('href'))}"><rect x="${f(this.X(q.left))}" y="${f(this.Y(q.top))}" width="${f(q.width * this.k)}" height="${f(q.height * this.k)}" fill="#000000" fill-opacity="0"/></a>`;
    return `<g clip-path="url(#${id})">${out}${linkOut}</g>`;
  }

  // ---------------------------------------------------------------- pictures
  async raster(drawFn, wPt, hPt, dpi) {
    let k = dpi / 72; const max = 4000;
    if (Math.max(wPt, hPt) * k > max) k = max / Math.max(wPt, hPt);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(wPt * k)); c.height = Math.max(1, Math.round(hPt * k));
    await drawFn(c.getContext('2d'), c.width, c.height);
    const url = c.toDataURL('image/png'); c.width = c.height = 0;
    return url;
  }
  async picture(box) {
    const img = box.querySelector('img');
    if (!img || !img.src || box.classList.contains('missing')) return '';
    const x = parsePt(box.style.left), y = parsePt(box.style.top), w = parsePt(box.style.width), h = parsePt(box.style.height);
    if (w <= 0 || h <= 0) return '';
    let src = img.src;
    if (/^(blob:|https?:)/.test(src)) { try { const bl = await (await fetch(src)).blob(); src = `data:${bl.type || 'image/png'};base64,${await blobToB64(bl)}`; } catch { /* drawn below */ } }
    const kind = /^data:image\/(png|jpeg|jpg|gif|svg\+xml)[;,]/.exec(src)?.[1];
    // a picture with cut edges: the whole picture, placed so the right part shows (turned over like the CSS)
    const part = img.style.position === 'absolute' ? { l: parseFloat(img.style.left) / 100 || 0, t: parseFloat(img.style.top) / 100 || 0, w: parseFloat(img.style.width) / 100 || 1, h: parseFloat(img.style.height) / 100 || 1, k: /scale\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(img.style.transform || '') } : null;
    // the .pub's recolouring is an SVG filter the page already has: it comes along as it is
    const fm = /^url\(["']?#([^"')]+)["']?\)$/.exec(img.style.filter || '');
    const filterEl = fm ? box.querySelector(`filter[id="${CSS.escape(fm[1])}"]`) : null;
    const poly = /polygon\((.*)\)/.exec(box.style.clipPath || '')?.[1]?.split(',').map((p) => p.trim().split(/\s+/).map((v) => parseFloat(v) / 100));
    let out = '';
    if (kind && (!img.style.filter || filterEl)) {
      let fattr = '';
      if (filterEl) { const id = this.id('f'); this.defs.push(new XMLSerializer().serializeToString(filterEl).replace(/ xmlns="[^"]*"/g, '').replace(/id="[^"]*"/, `id="${id}"`)); fattr = ` filter="url(#${id})"`; }
      let cattr = '';
      if (poly || part) {
        const id = this.id('c');
        this.defs.push(`<clipPath id="${id}">${poly ? `<polygon points="${poly.map(([u, v]) => `${f(x + u * w)},${f(y + v * h)}`).join(' ')}"/>` : `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/>`}</clipPath>`);
        cattr = ` clip-path="url(#${id})"`;
      }
      let ix = x, iy = y, iw = w, ih = h, tf = '';
      if (part) {
        ix = x + part.l * w; iy = y + part.t * h; iw = part.w * w; ih = part.h * h;
        if (part.k && (+part.k[1] !== 1 || +part.k[2] !== 1)) { const cx = ix + iw / 2, cy = iy + ih / 2; tf = ` transform="translate(${f(cx)} ${f(cy)}) scale(${+part.k[1]} ${+part.k[2]}) translate(${f(-cx)} ${f(-cy)})"`; }
      }
      out = `<g${cattr}><image x="${f(ix)}" y="${f(iy)}" width="${f(iw)}" height="${f(ih)}" preserveAspectRatio="none"${tf}${fattr} xlink:href="${src}"/></g>`;
    } else {
      // recoloured in another way, or a format SVG viewers don't take: drawn as the browser shows it
      const natural = Math.max(img.naturalWidth || 0, img.naturalHeight || 0);
      const dpi = Math.min(300, Math.max(150, natural ? (natural / Math.max(w, h)) * 72 : 220));
      const url = await this.raster(async (ctx, cw, ch) => {
        if (poly) { ctx.beginPath(); poly.forEach(([px, py], i) => (i ? ctx.lineTo(px * cw, py * ch) : ctx.moveTo(px * cw, py * ch))); ctx.closePath(); ctx.clip(); }
        if (img.style.filter) ctx.filter = img.style.filter;
        if (part) {
          ctx.translate((part.l + part.w / 2) * cw, (part.t + part.h / 2) * ch);
          if (part.k) ctx.scale(+part.k[1], +part.k[2]);
          ctx.drawImage(img, (-part.w / 2) * cw, (-part.h / 2) * ch, part.w * cw, part.h * ch);
        } else ctx.drawImage(img, 0, 0, cw, ch);
      }, w, h, dpi);
      out = `<image x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="none" xlink:href="${url}"/>`;
    }
    const alt = img.alt ? `<title>${esc(img.alt)}</title>` : '';
    const oc = color(box.style.outlineColor), ow = parsePt(box.style.outlineWidth);
    if (oc && ow) out += `<rect x="${f(x - ow / 2)}" y="${f(y - ow / 2)}" width="${f(w + ow)}" height="${f(h + ow)}" fill="none" stroke="${oc.hex}"${oc.a < 1 ? ` stroke-opacity="${f(oc.a)}"` : ''} stroke-width="${f(ow)}"/>`;
    return `<g>${alt}${out}</g>`;
  }

  // ---------------------------------------------------------------- shapes: the page's own SVG, with its ids made unique
  shape(svg) {
    const vb = (svg.getAttribute('viewBox') || '0 0 0 0').split(/[\s,]+/).map(Number);
    const left = parsePt(svg.style.left), top = parsePt(svg.style.top), sw = parsePt(svg.style.width), sh = parsePt(svg.style.height);
    const sx = vb[2] ? sw / vb[2] : 1, sy = vb[3] ? sh / vb[3] : 1;
    const ser = new XMLSerializer();
    const rename = new Map();
    let body = '';
    for (const node of svg.children) {
      const copy = node.cloneNode(true);
      for (const e of [copy, ...copy.querySelectorAll('[id]')]) if (e.id) { const nid = this.id('s'); rename.set(e.id, nid); e.id = nid; }
      // a shadow (a CSS filter on the page) becomes an SVG filter every program can read
      const fl = copy.getAttribute?.('filter') || '';
      const ds = /drop-shadow\((.*)\)\s*$/.exec(fl);
      if (ds) {
        const cm = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+)\s*$/i.exec(ds[1]);
        const [dx = 0, dy = 0, blur = 0] = (cm ? ds[1].slice(0, cm.index) : ds[1]).trim().split(/\s+/).map((v) => parseFloat(v) || 0);
        const c = (cm && color(cm[1])) || { hex: '#000000', a: 0.35 }, id = this.id('d');
        this.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feOffset in="SourceAlpha" dx="${f(dx)}" dy="${f(dy)}" result="o"/>${blur ? `<feGaussianBlur in="o" stdDeviation="${f(blur / 2)}" result="b"/>` : ''}<feFlood flood-color="${c.hex}" flood-opacity="${f(c.a)}" result="c"/><feComposite in="c" in2="${blur ? 'b' : 'o'}" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
        copy.setAttribute('filter', `url(#${id})`);
      } else if (fl && !/^url\(/.test(fl)) copy.removeAttribute('filter');
      const css = copy.getAttribute?.('style') || '';
      if (/filter\s*:\s*drop-shadow/.test(css)) copy.setAttribute('style', css.replace(/filter\s*:[^;]*;?/, '')); // (WordArt previews)
      body += ser.serializeToString(copy);
    }
    body = body.replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '').replace(/<image([^>]*?) href=/g, '<image$1 xlink:href=').replace(/url\(#([^)]+)\)/g, (m, id) => (rename.has(id) ? `url(#${rename.get(id)})` : m));
    // the gradients and patterns go with the page's other definitions
    body = body.replace(/<defs>([\s\S]*?)<\/defs>/g, (m, inner) => { this.defs.push(inner); return ''; });
    if (!body) return '';
    const dx = left - vb[0] * sx, dy = top - vb[1] * sy;
    const tf = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(sx - 1) > 1e-4 || Math.abs(sy - 1) > 1e-4 ? ` transform="matrix(${f(sx)} 0 0 ${f(sy)} ${f(dx)} ${f(dy)})"` : '';
    return `<g${tf}>${body}</g>`;
  }
}

// ------------------------------------------------------------------ fonts inside the file
async function fontFaces(families, embeddedUsed, codes) {
  const out = [];
  // fonts that came inside the .pub file, under their own names
  for (const [name, bytes] of embeddedFontBytes) {
    if (embeddedUsed.has(name) || families.has(String(name).toLowerCase())) {
      const sig = String.fromCharCode(...bytes.subarray(0, 4)), type = sig === 'wOF2' ? 'font/woff2' : sig === 'wOFF' ? 'font/woff' : sig === 'OTTO' ? 'font/otf' : 'font/ttf';
      out.push(`@font-face{font-family:"${String(name).replace(/["\\]/g, '')}";src:url(data:${type};base64,${bytesToB64(bytes)})}`);
    }
  }
  // the free stand-in fonts the app shows, only in the styles and character sets the page needs
  const faces = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules || []) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = unq(r.style.getPropertyValue('font-family')); if (!families.has(fam.toLowerCase())) continue;
      const range = r.style.getPropertyValue('unicode-range');
      if (range && !range.split(',').some((part) => { const m = /U\+([0-9a-f?]+)(?:-([0-9a-f]+))?/i.exec(part.trim()); if (!m) return false; const a = parseInt(m[1].replace(/\?/g, '0'), 16), b = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'f'), 16); for (const c of codes) if (c >= a && c <= b) return true; return false; })) continue;
      const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(r.style.getPropertyValue('src')); if (!m) continue;
      faces.push({ fam, weight: /bold|[6-9]00/.test(r.style.getPropertyValue('font-weight')) ? 700 : 400, style: /italic|oblique/.test(r.style.getPropertyValue('font-style')) ? 'italic' : 'normal', range, url: new URL(m[1], sheet.href || document.baseURI).href });
    }
  }
  const pick = new Set();
  for (const [fam, keys] of families) {
    const mine = faces.filter((x) => x.fam.toLowerCase() === fam); if (!mine.length) continue;
    for (const key of keys) {
      const [w, st] = key.split(' ');
      let hit = mine.filter((x) => x.weight === +w && x.style === st);
      if (!hit.length) hit = mine.filter((x) => x.style === st);
      if (!hit.length) hit = mine.filter((x) => x.weight === 400 && x.style === 'normal');
      if (!hit.length) hit = mine;
      const best = hit.find((x) => x.weight === +w) ? hit.filter((x) => x.weight === +w) : hit.filter((x) => x.weight === hit[0].weight);
      best.forEach((x) => pick.add(x));
    }
  }
  const jobs = [...pick].map(({ fam, weight, style, range, url }) => fetch(url).then((res) => (res.ok ? res.blob() : null)).then(async (b) => {
    if (!b) return null;
    const type = /\.woff2(\?|$)/.test(url) ? 'font/woff2' : /\.woff(\?|$)/.test(url) ? 'font/woff' : 'font/ttf';
    return `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};src:url(data:${type};base64,${await blobToB64(b)})${range ? `;unicode-range:${range}` : ''}}`;
  }).catch(() => null));
  for (const s of await Promise.all(jobs)) if (s) out.push(s);
  return out.join('\n');
}

// one page -> the text of its .svg file
async function pageSvg(el, model, n, title) {
  for (const it of el.children) { const deg = rotationOf(it); if (deg) { it.dataset.pwRotate = deg; it.style.transform = 'none'; } } // measured upright, turned back when written
  const P = new PageSvg(el, model, n);
  let body = '';
  for (const it of [...el.children]) {
    let part = '';
    if (it.matches('svg.shape')) part = P.shape(it);
    else if (it.classList.contains('pic')) part = await P.picture(it);
    else if (it.classList.contains('text') || it.classList.contains('table')) part = P.boxes(it) + P.text(it);
    if (!part) continue;
    const deg = +it.dataset.pwRotate || 0;
    if (deg) {
      const cx = parsePt(it.style.left) + parsePt(it.style.width) / 2, cy = parsePt(it.style.top) + parsePt(it.style.height) / 2;
      part = `<g transform="rotate(${f(deg)} ${f(cx)} ${f(cy)})">${part}</g>`;
    }
    body += part + '\n';
  }
  const bg = color(getComputedStyle(el).backgroundColor);
  const back = bg && bg.hex !== '#ffffff' ? `<rect width="${f(model.w)}" height="${f(model.h)}"${fillAttr(bg)}/>\n` : '';
  const css = await fontFaces(P.families, P.embeddedUsed || new Set(), P.codes);
  const style = css ? `<style type="text/css"><![CDATA[\n${css}\n]]></style>\n` : '';
  const W = f(model.w), H = f(model.h);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" width="${W}pt" height="${H}pt" viewBox="0 0 ${W} ${H}">\n`
    + `<title>${esc(title)}</title>\n${style}<defs>${P.defs.join('\n')}</defs>\n`
    + `<g inkscape:groupmode="layer" inkscape:label="${esc(title)}">\n${back}${body}</g>\n</svg>\n`;
}

// -> { name, blob }: one .svg, or a .zip with an .svg for each page
export async function exportSvg(doc, pageEls, { pages = null, onProgress = () => {} } = {}) {
  const which = pages || pageEls.map((_, i) => i);
  const stage = await stagePages(which.map((i) => pageEls[i]));
  try {
    const files = [];
    for (let k = 0; k < stage.pages.length; k++) {
      onProgress(k, stage.pages.length);
      const pageNo = which[k] + 1, many = pageEls.length > 1;
      const title = many ? `${doc.name || 'Document'} - ${t('export.page', { n: pageNo })}` : doc.name || 'Document';
      let text;
      try { text = await pageSvg(stage.pages[k], doc.pages[which[k]], k + 1, title); } catch (err) {
        // a page that can't be written as shapes and words comes as one sharp picture rather than not at all
        console.warn('SVG page saved as a picture instead:', err);
        const el = stage.pages[k], model = doc.pages[which[k]];
        el.querySelectorAll('[data-pw-rotate]').forEach((it) => { it.style.transform = `rotate(${it.dataset.pwRotate}deg)`; });
        const { pageCanvas } = await import('./images.js');
        const canvas = await pageCanvas(el, { dpi: 200 }), url = canvas.toDataURL('image/png'); canvas.width = canvas.height = 0;
        text = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${f(model.w)}pt" height="${f(model.h)}pt" viewBox="0 0 ${f(model.w)} ${f(model.h)}"><title>${esc(title)}</title><image width="${f(model.w)}" height="${f(model.h)}" preserveAspectRatio="none" xlink:href="${url}"/></svg>\n`;
      }
      files.push({ name: `${safeName(doc.name)}${many ? ` - ${t('export.page', { n: pageNo })}` : ''}.svg`, text });
    }
    onProgress(stage.pages.length, stage.pages.length);
    if (files.length === 1) return { name: files[0].name, blob: new Blob([files[0].text], { type: 'image/svg+xml' }) };
    const entries = {};
    for (const fl of files) entries[fl.name] = [strToU8(fl.text), { level: 6 }];
    return { name: `${safeName(doc.name)} (SVG).zip`, blob: new Blob([zipSync(entries)], { type: 'application/zip' }) };
  } finally { stage.done(); }
}
