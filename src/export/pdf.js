// Pages as a PDF with real, searchable text. Everything is measured from the page as the browser laid it
// out, so the PDF matches the screen: each word is placed where the browser put it, in the same font
// (the file's own embedded font, or the free stand-in) and squeezed or stretched by a hair if the widths
// differ. Shapes become vector paths, photos keep their original JPEG/PNG data. Anything that can't be
// drawn as vectors (gradients, shadows, recoloured or clipped pictures) is drawn as a sharp picture,
// and if a whole page fails it is saved as one picture rather than not at all.
import {
  PDFDocument, rgb, LineCapStyle, pushGraphicsState, popGraphicsState, concatTransformationMatrix, setCharacterSqueeze,
  rectangle, clip, endPath, setTextRenderingMode, TextRenderingMode, setLineWidth, setStrokingRgbColor, setCharacterSpacing, PDFString,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
// the site's top folder: pages in other languages live one folder down (/de/), the fonts stay at the top
const siteRoot = () => new URL(document.querySelector('meta[name="pw-root"]')?.content || './', document.baseURI);
import { stagePages, safeName } from './stage.js';
import { pageCanvas } from './images.js';

const PT = 0.75; // points per CSS pixel
const GENERIC = { serif: 'Tinos', 'sans-serif': 'Arimo', monospace: 'Cousine', cursive: 'Dancing Script', fantasy: 'Arimo', 'system-ui': 'Arimo' };

// ------------------------------------------------------------------ colours
function parseColor(s) {
  if (!s || s === 'transparent' || s === 'none') return null;
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return { c: rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255), a: 1 }; }
  m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(s);
  if (!m) return null;
  let a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  if (a <= 0.003) return null;
  return { c: rgb(+m[1] / 255, +m[2] / 255, +m[3] / 255), a };
}

// ------------------------------------------------------------------ fonts
class FontBook {
  constructor(pdf, embeddedBytes) {
    this.pdf = pdf; this.cache = new Map(); this.embeddedBytes = embeddedBytes; this.kitFonts = new Map();
  }
  async init() {
    try {
      const r = await fetch(new URL('pdffonts/manifest.json', siteRoot()));
      this.manifest = r.ok ? await r.json() : [];
    } catch { this.manifest = []; }
    this.families = new Map();
    for (const f of this.manifest) { const k = f.family.toLowerCase(); if (!this.families.has(k)) this.families.set(k, []); this.families.get(k).push(f); }
  }
  // which font file draws character cp for a span styled with this family list, weight and style
  pick(families, weight, italic, cp) {
    const tryFamily = (name) => {
      const key = name.toLowerCase();
      if (key.startsWith('pw-embedded-')) {
        const bytes = this.embeddedBytes.get(name.slice(12));
        if (!bytes) return null;
        let kit = this.kitFonts.get(name);
        if (kit === undefined) { try { kit = fontkit.create(bytes); } catch { kit = null; } this.kitFonts.set(name, kit); }
        if (!kit || !kit.hasGlyphForCodePoint(cp)) return null;
        return { key: name, bytes, synthBold: false, synthItalic: false };
      }
      const list = this.families.get(key);
      if (!list) return null;
      const cover = list.filter((f) => f.ranges.some(([a, b]) => cp >= a && cp <= b));
      if (!cover.length) return null;
      const wantStyle = italic ? 'italic' : 'normal';
      cover.sort((a, b) => ((a.style === wantStyle ? 0 : 1000) + Math.abs(a.weight - weight)) - ((b.style === wantStyle ? 0 : 1000) + Math.abs(b.weight - weight)));
      const f = cover[0];
      return { key: f.file, file: f.file, synthBold: weight >= 600 && f.weight < 600, synthItalic: italic && f.style !== 'italic' };
    };
    for (const name of families) {
      const hit = tryFamily(name) || (GENERIC[name.toLowerCase()] && tryFamily(GENERIC[name.toLowerCase()]));
      if (hit) return hit;
    }
    for (const fallback of ['Arimo', 'Tinos', 'Open Sans']) { const hit = tryFamily(fallback); if (hit) return hit; }
    return null;
  }
  // features: { liga: false, kern: false } when the text turns ligatures or kerning off
  async font(face, features = null) {
    const key = features ? `${face.key}|${JSON.stringify(features)}` : face.key;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = (async () => {
      const bytes = face.bytes || new Uint8Array(await (await fetch(new URL(`pdffonts/${face.file}`, siteRoot()))).arrayBuffer());
      return this.pdf.embedFont(bytes, features ? { subset: true, features } : { subset: true });
    })();
    this.cache.set(key, p);
    return p;
  }
}

// ------------------------------------------------------------------ geometry helpers
const parsePt = (v) => parseFloat(v) || 0; // inline styles are written in pt by the renderer
const rotationOf = (el) => { const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform || ''); return m ? parseFloat(m[1]) : 0; };

const RASTER = { key: '#raster' }; // stands for 'no font: draw this as a picture'
class PageWriter {
  constructor(pdf, page, pageEl, fonts, size) {
    this.pdf = pdf; this.page = page; this.el = pageEl; this.fonts = fonts; this.w = size.w; this.h = size.h;
    this.origin = pageEl.getBoundingClientRect();
    this.k = this.w / (this.origin.width || 1); // pt per screen px (1/0.75 at 100%)
    this.imageCache = fonts.imageCache;
    this.measure = document.createElement('canvas').getContext('2d');
  }
  X(px) { return (px - this.origin.left) * this.k; }
  Y(px) { return this.h - (px - this.origin.top) * this.k; }
  // run fn with the item's rotation applied around its centre (CSS turns clockwise; PDF y points up)
  withRotation(el, fn) {
    const deg = +el.dataset.pwRotate || 0;
    if (!deg) return fn();
    const t = (-deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
    const cx = parsePt(el.style.left) + parsePt(el.style.width) / 2, cyCss = parsePt(el.style.top) + parsePt(el.style.height) / 2;
    const cy = this.h - cyCss;
    this.page.pushOperators(pushGraphicsState(), concatTransformationMatrix(c, s, -s, c, cx - (c * cx - s * cy), cy - (s * cx + c * cy)));
    return Promise.resolve(fn()).finally(() => this.page.pushOperators(popGraphicsState()));
  }
  rect(x, y, w, h, col) { if (col && w > 0 && h > 0) this.page.drawRectangle({ x, y, width: w, height: h, color: col.c, opacity: col.a }); }

  // backgrounds and borders of a box and everything in it (text boxes, paragraphs, highlights, table cells)
  boxes(root) {
    const els = [root, ...root.querySelectorAll('*')];
    for (const e of els) {
      if (e instanceof SVGElement) continue;
      const cs = getComputedStyle(e);
      const bg = parseColor(cs.backgroundColor);
      const rects = cs.display === 'inline' ? [...e.getClientRects()] : [e.getBoundingClientRect()];
      if (bg) for (const r of rects) this.rect(this.X(r.left), this.Y(r.bottom), r.width * this.k, r.height * this.k, bg);
      if (cs.display === 'inline') continue;
      const r = rects[0];
      for (const [side, horiz] of [['Top', true], ['Bottom', true], ['Left', false], ['Right', false]]) {
        const bw = parseFloat(cs[`border${side}Width`]) || 0;
        if (!bw || cs[`border${side}Style`] === 'none' || cs[`border${side}Style`] === 'hidden') continue;
        const col = parseColor(cs[`border${side}Color`]); if (!col) continue;
        const t = bw * this.k;
        if (horiz) this.rect(this.X(r.left), side === 'Top' ? this.Y(r.top) - t : this.Y(r.bottom), r.width * this.k, t, col);
        else this.rect(side === 'Left' ? this.X(r.left) : this.X(r.right) - t, this.Y(r.bottom), t, r.height * this.k, col);
      }
    }
  }

  // ---------------------------------------------------------------- text
  styleOf(el, pseudo = null) {
    const ck = pseudo ? `${pseudo}` : null;
    let s = ck ? this._pseudo?.get(el) : this._styles?.get(el);
    if (s) return s;
    const cs = getComputedStyle(el, pseudo);
    const families = cs.fontFamily.split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    const sizePx = parseFloat(cs.fontSize) || 13;
    this.measure.font = `${cs.fontStyle} ${cs.fontWeight} ${sizePx}px ${cs.fontFamily}`;
    const m = this.measure.measureText('Hg');
    const asc = m.fontBoundingBoxAscent || sizePx * 0.8, desc = m.fontBoundingBoxDescent || sizePx * 0.2;
    s = {
      families, weight: parseInt(cs.fontWeight, 10) || 400, italic: cs.fontStyle !== 'normal', sizePx, ascRatio: asc / (asc + desc),
      color: parseColor(cs.color) || (cs.webkitTextStrokeWidth && parseFloat(cs.webkitTextStrokeWidth) ? parseColor(cs.webkitTextStrokeColor) : null),
      outline: parseFloat(cs.webkitTextStrokeWidth) > 0, upper: cs.textTransform === 'uppercase' || cs.fontVariantCaps === 'small-caps',
      under: /underline/.test(cs.textDecorationLine), strike: /line-through/.test(cs.textDecorationLine),
      shadow: cs.textShadow && cs.textShadow !== 'none',
      smallCaps: cs.fontVariantCaps === 'small-caps', hyph: cs.hyphens === 'auto' || cs.webkitHyphens === 'auto',
      spacing: parseFloat(cs.letterSpacing) || 0,
      features: cs.fontVariantLigatures === 'none' || cs.fontKerning === 'none' ? { ...(cs.fontVariantLigatures === 'none' ? { liga: false, clig: false } : {}), ...(cs.fontKerning === 'none' ? { kern: false } : {}) } : null,
    };
    if (ck) (this._pseudo ||= new Map()).set(el, s); else (this._styles ||= new Map()).set(el, s);
    return s;
  }
  // words of one text box: [{text, face, style, left, right, top, height}]
  words(root, clipRect) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let n;
    // the drop-cap letter of each paragraph that has one: it is drawn in the big letter's own style
    const dropNodes = new Map();
    for (const p of root.querySelectorAll('p.para.dropcap')) {
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.parentElement.closest('.bullet, .pw-gen') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      let t; while ((t = w.nextNode())) {
        const i = t.data.search(/[^\s\u200b]/); if (i < 0) continue;
        // the big letter's capital starts where the first line's capitals start (CSS initial-letter)
        const rest = document.createRange(); rest.setStart(t, i + 1); rest.setEnd(p, p.childNodes.length);
        const tops = [...rest.getClientRects()].filter((q) => q.width && q.height).sort((a, b) => a.top - b.top);
        const body = this.styleOf(t.parentElement), ln = tops[0];
        const baseline = ln ? { line1: ln.top + ln.height * body.ascRatio, bodyPx: body.sizePx } : null;
        dropNodes.set(t, { i, st: this.styleOf(p, '::first-letter'), baseline }); break;
      }
    }
    let last = null; // the last letter drawn, to spot words the browser broke with a hyphen
    while ((n = walker.nextNode())) {
      const st0 = this.styleOf(n.parentElement);
      if (!st0.color && !st0.outline) continue;
      const text = n.data; let cur = null; const drop = dropNodes.get(n);
      const para = n.parentElement.closest('p');
      const flush = () => { if (cur && cur.text.trim()) out.push(cur); cur = null; };
      for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        const st = drop && i === drop.i ? drop.st : st0;
        if (drop && (i === drop.i || i === drop.i + 1)) flush();
        const cp = text.codePointAt(i); const len = cp > 0xffff ? 2 : 1;
        if (ch === '​' || ch === '\n' || ch === '\r') { flush(); last = null; continue; }
        if (ch === '\u00ad') { if (last) last.shy = true; continue; } // a soft hyphen: shown only at a line end
        range.setStart(n, i); range.setEnd(n, i + len);
        const rs = range.getClientRects(); const r = rs[rs.length - 1];
        if (!r || (!r.width && ch !== ' ')) {
          // a joining or combining mark (Hindi vowel signs, Thai tone marks, emoji joiners) stays with its letter
          if (cur?.face === RASTER && /[\p{M}\u200d\ufe0f]/u.test(text.slice(i, i + len))) cur.text += text.slice(i, i + len);
          i += len - 1; continue;
        }
        const isSpace = /\s/.test(ch);
        const letter = !isSpace && /[\p{L}\p{N}]/u.test(ch);
        // a word carried on to the next line without a space: the browser drew a hyphen at the line end
        if (letter && last && last.para === para && (st.hyph || last.shy) && !(drop && i <= drop.i + 1) && r.top > last.top + last.height * 0.5) { // (not after a big first letter)
          const prev = cur || out[out.length - 1]; if (prev === last.word) prev.hyphen = true;
          flush();
        }
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const inside = cx >= clipRect.left - 1 && cx <= clipRect.right + 1 && cy >= clipRect.top - 1 && cy <= clipRect.bottom + 1;
        if (!inside && !(drop && i === drop.i)) { flush(); i += len - 1; continue; } // (a big first letter's box is reported oddly)
        if (isSpace) { if (cur) { cur.text += ' '; cur.spaceRight = r.right; } flush(); last = null; continue; }
        if (len === 2) ch = text.slice(i, i + 2);
        // small capitals: lower-case letters are drawn as smaller capitals
        const sc = st.smallCaps && ch !== ch.toUpperCase();
        if (st.upper) ch = ch.toUpperCase();
        // no font we can embed has this letter (emoji, Chinese, Arabic…): it is drawn as a small picture instead
        const emoji = (cp >= 0x2600 && /\p{Extended_Pictographic}/u.test(ch)) || text[i + len] === '\ufe0f'; // coloured as on screen
        const face = (!emoji && this.fonts.pick(st.families, st.weight, st.italic, cp)) || RASTER;
        const sameLine = cur && Math.abs(r.top - cur.top) < r.height * 0.3 && (face === RASTER && cur.face === RASTER
          ? r.left < cur.right + st.sizePx * 0.25 && r.right > cur.left - st.sizePx * 0.25 // right-to-left letters come leftwards
          : r.left >= cur.right - r.width * 0.5 && r.left - cur.right < st.sizePx * 0.25 + Math.max(0, st.spacing));
        if (!(sameLine && cur.face.key === face.key && cur.style === st && !!cur.sc === sc)) { flush(); cur = { text: '', face, style: st, el: n.parentElement, left: r.left, right: r.right, top: r.top, height: r.height, sc, chars: 0 }; }
        if (drop && i === drop.i && drop.baseline != null && getComputedStyle(n.parentElement.closest('p'), '::first-letter').float === 'none') cur.drop = drop.baseline;
        cur.text += ch; cur.height = Math.max(cur.height, r.height); cur.chars++;
        if (face === RASTER) { cur.left = Math.min(cur.left, r.left); cur.right = Math.max(cur.right, r.right); } else cur.right = r.right;
        last = letter ? { para, top: r.top, height: r.height, word: cur, shy: false } : null;
        i += len - 1;
      }
      flush();
    }
    return out;
  }
  async text(itemEl) {
    const r = itemEl.getBoundingClientRect(), cs = getComputedStyle(itemEl);
    const clipRect = itemEl.classList.contains('text')
      ? { left: r.left + parseFloat(cs.borderLeftWidth), right: r.right - parseFloat(cs.borderRightWidth), top: r.top + parseFloat(cs.borderTopWidth), bottom: r.bottom - parseFloat(cs.borderBottomWidth) }
      : { left: r.left - 2, right: r.right + 2, top: r.top - 2, bottom: r.bottom + 2 };
    const words = this.words(itemEl, clipRect);
    if (!words.length) return;
    const P = this.page;
    P.pushOperators(pushGraphicsState(), rectangle(this.X(clipRect.left), this.Y(clipRect.bottom), (clipRect.right - clipRect.left) * this.k, (clipRect.bottom - clipRect.top) * this.k), clip(), endPath());
    for (const w of words) {
      const st = w.style;
      if (w.face === RASTER) { await this.rasterWord(w); continue; }
      const font = await this.fonts.font(w.face, st.features);
      let fontSize = st.sizePx * PT * (w.sc ? 0.7 : 1); // sizePx is in CSS px at 100%
      let baseline = this.Y(w.top + w.height * st.ascRatio);
      if (w.drop != null) { // a big first letter: its size follows from its width as drawn
        try { const one = font.widthOfTextAtSize(w.text.trim(), 1); if (one > 0) fontSize = ((w.right - w.left) * this.k) / one; } catch { /* keep */ }
        const fk = font.embedder?.font, cap = fk?.capHeight > 0 && fk.unitsPerEm ? fk.capHeight / fk.unitsPerEm : 0.7;
        baseline = this.Y(w.drop.line1 - cap * w.drop.bodyPx + (cap * fontSize) / this.k);
      }
      const x = this.X(w.left);
      const word = w.text.replace(/ $/, '');
      let natural = 0; try { natural = font.widthOfTextAtSize(word, fontSize); } catch { continue; }
      // letter spacing goes in as PDF character spacing; the browser adds it after every letter
      const cs = st.spacing ? st.spacing * this.k : 0;
      if (cs) natural += cs * w.chars;
      const target = (w.right - w.left) * this.k;
      const squeeze = natural > 0 ? Math.max(40, Math.min(250, (target / natural) * 100)) : 100;
      const col = st.color || { c: rgb(0, 0, 0), a: 1 };
      const opts = { x, y: baseline, size: fontSize, font, color: col.c, opacity: col.a };
      if (w.face.synthItalic) opts.xSkew = { type: 'degrees', angle: 12 };
      P.pushOperators(pushGraphicsState());
      if (Math.abs(squeeze - 100) > 0.5) P.pushOperators(setCharacterSqueeze(squeeze));
      if (cs) P.pushOperators(setCharacterSpacing(cs));
      if (w.face.synthBold || st.outline) {
        P.pushOperators(setTextRenderingMode(st.outline && !st.color ? TextRenderingMode.Outline : TextRenderingMode.FillAndOutline), setLineWidth(fontSize * 0.03), setStrokingRgbColor(col.c.red, col.c.green, col.c.blue));
      }
      try {
        if (st.shadow) P.drawText(w.text, { ...opts, x: x + fontSize * 0.06, y: baseline - fontSize * 0.06, color: rgb(0, 0, 0), opacity: 0.35 * col.a });
        P.drawText(w.text, opts);
      } catch { /* a character the font can't encode: leave it out rather than fail the page */ }
      P.pushOperators(popGraphicsState());
      if (w.hyphen) { try { P.drawText('-', { ...opts, x: x + target }); } catch { /* no hyphen in this font */ } }
      const lineW = (w.right - w.left) * this.k;
      if (st.under) this.rect(x, baseline - fontSize * 0.11, lineW, Math.max(0.5, fontSize * 0.05), col);
      if (st.strike) this.rect(x, baseline + fontSize * 0.28, lineW, Math.max(0.5, fontSize * 0.05), col);
    }
    P.pushOperators(popGraphicsState());
    this.links(itemEl);
  }
  // letters no embeddable font has, drawn by the browser (which finds a font for them) into a picture
  async rasterWord(w) {
    const cs = getComputedStyle(w.el), wPt = (w.right - w.left) * this.k, hPt = w.height * this.k;
    if (wPt <= 0 || hPt <= 0) return;
    const sizePt = w.style.sizePx * PT * (w.sc ? 0.7 : 1), text = w.text.replace(/ $/, '');
    const bytes = await this.rasterToPng((ctx, cw) => {
      const s = cw / wPt; // canvas pixels per point
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${(sizePt * s).toFixed(2)}px ${cs.fontFamily}`;
      if ('letterSpacing' in ctx && w.style.spacing) ctx.letterSpacing = `${w.style.spacing * this.k * s}px`;
      ctx.fillStyle = cs.color || '#000'; ctx.textBaseline = 'alphabetic';
      const m = ctx.measureText(text), asc = m.fontBoundingBoxAscent ?? sizePt * s * 0.8, desc = m.fontBoundingBoxDescent ?? sizePt * s * 0.2;
      const y = (hPt * s - (asc + desc)) / 2 + asc;
      if (m.width > 0) ctx.scale(Math.min(2, Math.max(0.5, (wPt * s) / m.width)), 1);
      ctx.fillText(text, 0, y);
    }, wPt, hPt, 300);
    const image = await this.embedImage(bytes, 'png');
    this.page.drawImage(image, { x: this.X(w.left), y: this.Y(w.top + w.height), width: wPt, height: hPt });
  }
  // clickable links over the words of web and e-mail addresses
  links(itemEl) {
    const deg = +itemEl.dataset.pwRotate || 0;
    let turn = (x, y) => [x, y];
    if (deg) {
      const t = (-deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
      const cx = parsePt(itemEl.style.left) + parsePt(itemEl.style.width) / 2, cy = this.h - (parsePt(itemEl.style.top) + parsePt(itemEl.style.height) / 2);
      turn = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
    }
    for (const a of itemEl.querySelectorAll('a.pwlink[href]')) {
      const href = a.getAttribute('href'); if (!/^(https?:|mailto:|tel:)/i.test(href)) continue;
      for (const r of a.getClientRects()) {
        if (r.width < 0.5 || r.height < 0.5) continue;
        const pts = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]].map(([px, py]) => turn(this.X(px), this.Y(py)));
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        const annot = this.pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(href) } });
        this.page.node.addAnnot(this.pdf.context.register(annot));
      }
    }
  }

  // ---------------------------------------------------------------- pictures
  async embedImage(bytes, type) {
    // a quick fingerprint of the bytes, so the same picture is stored once and different ones never mix
    let h = 2166136261; const step = Math.max(1, Math.floor(bytes.length / 60000));
    for (let i = 0; i < bytes.length; i += step) { h ^= bytes[i]; h = Math.imul(h, 16777619); }
    const key = `${type}${bytes.length}:${h >>> 0}`;
    if (!this.imageCache.has(key)) this.imageCache.set(key, type === 'png' ? this.pdf.embedPng(bytes) : this.pdf.embedJpg(bytes));
    return this.imageCache.get(key);
  }
  async rasterToPng(drawFn, wPt, hPt, dpi = 220) {
    let k = dpi / 72; const maxSide = 4000;
    if (Math.max(wPt, hPt) * k > maxSide) k = maxSide / Math.max(wPt, hPt);
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(wPt * k)); c.height = Math.max(1, Math.round(hPt * k));
    const ctx = c.getContext('2d');
    await drawFn(ctx, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    c.width = c.height = 0;
    return new Uint8Array(await blob.arrayBuffer());
  }
  async picture(box) {
    const img = box.querySelector('img');
    if (!img || !img.src || box.classList.contains('missing')) return;
    const x = parsePt(box.style.left), top = parsePt(box.style.top), w = parsePt(box.style.width), h = parsePt(box.style.height);
    if (w <= 0 || h <= 0) return;
    const y = this.h - top - h;
    const m = /^data:image\/(png|jpeg);base64,/.exec(img.src);
    // a picture with cut edges whose cut copy could not be made: the whole picture, placed so the right part shows
    const part = img.style.position === 'absolute' ? { l: parseFloat(img.style.left) / 100 || 0, t: parseFloat(img.style.top) / 100 || 0, w: parseFloat(img.style.width) / 100 || 1, h: parseFloat(img.style.height) / 100 || 1, k: /scale\((-?[\d.]+),\s*(-?[\d.]+)\)/.exec(img.style.transform || '') } : null;
    const plain = m && !img.style.filter && !box.style.clipPath && !part;
    let image;
    if (plain) {
      image = await this.embedImage(Uint8Array.from(atob(img.src.slice(m[0].length)), (ch) => ch.charCodeAt(0)), m[1] === 'png' ? 'png' : 'jpg');
    } else {
      // recoloured, clipped, or a format PDFs don't take: draw it as the browser shows it
      const poly = /polygon\((.*)\)/.exec(box.style.clipPath || '')?.[1]?.split(',').map((p) => p.trim().split(/\s+/).map((v) => parseFloat(v) / 100));
      const natural = Math.max(img.naturalWidth || 0, img.naturalHeight || 0);
      const dpi = img.src.startsWith('data:image/svg') ? 300 : Math.min(300, Math.max(150, natural ? (natural / Math.max(w, h)) * 72 : 220));
      const bytes = await this.rasterToPng(async (ctx, cw, ch) => {
        if (poly) { ctx.beginPath(); poly.forEach(([px, py], i) => (i ? ctx.lineTo(px * cw, py * ch) : ctx.moveTo(px * cw, py * ch))); ctx.closePath(); ctx.clip(); }
        if (img.style.filter) ctx.filter = img.style.filter;
        if (part) { // (turned over around its own middle, like the CSS)
          ctx.translate((part.l + part.w / 2) * cw, (part.t + part.h / 2) * ch);
          if (part.k) ctx.scale(+part.k[1], +part.k[2]);
          ctx.drawImage(img, (-part.w / 2) * cw, (-part.h / 2) * ch, part.w * cw, part.h * ch);
        } else ctx.drawImage(img, 0, 0, cw, ch);
      }, w, h, dpi);
      image = await this.embedImage(bytes, 'png');
    }
    this.page.drawImage(image, { x, y, width: w, height: h });
    const oc = parseColor(box.style.outlineColor), ow = parsePt(box.style.outlineWidth);
    if (oc && ow) this.page.drawRectangle({ x: x - ow / 2, y: y - ow / 2, width: w + ow, height: h + ow, borderColor: oc.c, borderWidth: ow, borderOpacity: oc.a });
  }

  // ---------------------------------------------------------------- shapes
  async shape(svg) {
    const node = [...svg.children].find((c) => c.tagName !== 'defs');
    if (!node) return;
    const [vbx, vby, vbw, vbh] = (svg.getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
    const left = parsePt(svg.style.left), top = parsePt(svg.style.top);
    const fillAttr = node.getAttribute('fill') || 'none', filter = node.getAttribute('filter');
    if (/^url\(/.test(fillAttr) || filter) {
      // gradients and shadows: draw as a picture of the shape, over the area it really covers
      let bb; try { bb = node.getBBox(); } catch { bb = { x: vbx, y: vby, width: vbw, height: vbh }; }
      const sw0 = parseFloat(node.getAttribute('stroke-width')) || 0;
      const sh = /drop-shadow\((-?[\d.]+)px (-?[\d.]+)px/.exec(filter || '');
      const sx = sh ? Math.abs(+sh[1]) : 0, sy = sh ? Math.abs(+sh[2]) : 0;
      const bx = bb.x - sw0 - sx - 1, by = bb.y - sw0 - sy - 1, bw = bb.width + 2 * (sw0 + sx + 1), bh = bb.height + 2 * (sw0 + sy + 1);
      const copy = svg.cloneNode(true);
      copy.removeAttribute('style'); copy.removeAttribute('class');
      copy.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`); copy.setAttribute('width', bw); copy.setAttribute('height', bh);
      const xml = new XMLSerializer().serializeToString(copy);
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml.includes('xmlns=') ? xml : xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
      const im = new Image(); im.src = url; await im.decode().catch(() => {});
      if (!im.naturalWidth && !im.width) return;
      const bytes = await this.rasterToPng((ctx, cw, ch) => ctx.drawImage(im, 0, 0, cw, ch), bw, bh, 200);
      const image = await this.embedImage(bytes, 'png');
      this.page.drawImage(image, { x: left + (bx - vbx), y: this.h - (top + (by - vby)) - bh, width: bw, height: bh });
      return;
    }
    const d = pathOf(node); if (!d) return;
    const fill = parseColor(fillAttr), stroke = parseColor(node.getAttribute('stroke'));
    const sw = parseFloat(node.getAttribute('stroke-width')) || 0;
    if (!fill && !(stroke && sw)) return;
    const o = { x: left - vbx, y: this.h - top + vby };
    if (fill) { o.color = fill.c; o.opacity = fill.a * (parseFloat(node.getAttribute('fill-opacity')) || 1); }
    if (stroke && sw) {
      o.borderColor = stroke.c; o.borderWidth = sw; o.borderOpacity = stroke.a * (node.getAttribute('stroke-opacity') != null ? parseFloat(node.getAttribute('stroke-opacity')) : 1);
      const dash = node.getAttribute('stroke-dasharray'); if (dash) o.borderDashArray = dash.split(/[\s,]+/).map(Number).filter((v) => v > 0);
      if (node.getAttribute('stroke-linecap') === 'round') o.borderLineCap = LineCapStyle.Round;
    }
    if (!fill) o.color = undefined;
    this.page.drawSvgPath(d, o);
  }
}

const f = (v) => +(+v).toFixed(3);
function pathOf(node) {
  const a = (k) => parseFloat(node.getAttribute(k)) || 0;
  switch (node.tagName.toLowerCase()) {
    case 'path': return node.getAttribute('d');
    case 'rect': {
      const x = a('x'), y = a('y'), w = a('width'), h = a('height'), r = Math.min(a('rx'), w / 2, h / 2);
      if (!r) return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
      const k = r * 0.4477153; // corner curves
      return `M${f(x + r)} ${f(y)}H${f(x + w - r)}C${f(x + w - k)} ${f(y)} ${f(x + w)} ${f(y + k)} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}C${f(x + w)} ${f(y + h - k)} ${f(x + w - k)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}C${f(x + k)} ${f(y + h)} ${f(x)} ${f(y + h - k)} ${f(x)} ${f(y + h - r)}V${f(y + r)}C${f(x)} ${f(y + k)} ${f(x + k)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
    }
    case 'ellipse': {
      const cx = a('cx'), cy = a('cy'), rx = a('rx'), ry = a('ry'), k = 0.5522847;
      return `M${f(cx + rx)} ${f(cy)}C${f(cx + rx)} ${f(cy + ry * k)} ${f(cx + rx * k)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}C${f(cx - rx * k)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ry * k)} ${f(cx - rx)} ${f(cy)}C${f(cx - rx)} ${f(cy - ry * k)} ${f(cx - rx * k)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}C${f(cx + rx * k)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ry * k)} ${f(cx + rx)} ${f(cy)}Z`;
    }
    case 'polygon': case 'polyline': {
      const pts = (node.getAttribute('points') || '').trim().split(/\s+/).map((p) => p.split(',').map(Number));
      if (pts.length < 2) return null;
      return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + (node.tagName.toLowerCase() === 'polygon' ? 'Z' : '');
    }
    default: return null;
  }
}

// ------------------------------------------------------------------ the whole document
// For a print shop, coloured boxes that touch the edge of the page are carried 3 mm past it (the "bleed"),
// so no white line shows if the cut is a hair off. Pictures are left as they are; the design check warns.
function extendToBleed(pageEl, model, bleed) {
  for (const svg of pageEl.querySelectorAll(':scope > svg.shape')) {
    if (svg.style.transform && svg.style.transform !== 'none') continue;
    const r = svg.querySelector(':scope > rect'); if (!r || r.getAttribute('rx')) continue;
    let x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), h = +r.getAttribute('height');
    const e = 0.75;
    if (x <= e) { w += x + bleed; x = -bleed; }
    if (y <= e) { h += y + bleed; y = -bleed; }
    if (x + w >= model.w - e) w = model.w + bleed - x;
    if (y + h >= model.h - e) h = model.h + bleed - y;
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h);
  }
}

// -> { pdf: PDFDocument, report } ; pages are drawn at their own size (content past the edge is kept)
export async function buildPdf(doc, pageEls, { pages = null, embeddedFonts = new Map(), onProgress = () => {}, bleed = 0 } = {}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.name || 'Document'); pdf.setCreator('Pubwork'); pdf.setProducer('Pubwork');
  if (doc.meta?.author) pdf.setAuthor(doc.meta.author);
  const fonts = new FontBook(pdf, embeddedFonts); await fonts.init(); fonts.imageCache = new Map();
  const which = pages || pageEls.map((_, i) => i);
  const stage = await stagePages(which.map((i) => pageEls[i]));
  const report = { vectorPages: 0, picturePages: 0 };
  try {
    for (let k = 0; k < stage.pages.length; k++) {
      onProgress(k, stage.pages.length);
      const model = doc.pages[which[k]], el = stage.pages[k];
      if (bleed) extendToBleed(el, model, bleed);
      const page = pdf.addPage([model.w, model.h]);
      try {
        // measure every item upright; its turn is put back when drawing
        for (const it of el.children) { const deg = rotationOf(it); if (deg) { it.dataset.pwRotate = deg; it.style.transform = 'none'; } }
        const W = new PageWriter(pdf, page, el, fonts, model);
        for (const it of [...el.children]) {
          await W.withRotation(it, async () => {
            if (it.matches('svg.shape')) await W.shape(it);
            else if (it.classList.contains('pic')) await W.picture(it);
            else if (it.classList.contains('text') || it.classList.contains('table')) { W.boxes(it); await W.text(it); }
          });
        }
        report.vectorPages++;
      } catch (err) {
        console.warn('PDF page drawn as a picture instead:', err);
        // start the page again as one sharp picture of what is on screen
        const idx = pdf.getPageCount() - 1; pdf.removePage(idx);
        const fresh = pdf.insertPage(idx, [model.w, model.h]);
        el.querySelectorAll('[data-pw-rotate]').forEach((it) => { it.style.transform = `rotate(${it.dataset.pwRotate}deg)`; });
        const canvas = await pageCanvas(el, { dpi: 200 });
        const png = new Uint8Array(await (await new Promise((res) => canvas.toBlob(res, 'image/png'))).arrayBuffer());
        fresh.drawImage(await pdf.embedPng(png), { x: 0, y: 0, width: model.w, height: model.h });
        report.picturePages++;
      }
    }
    onProgress(stage.pages.length, stage.pages.length);
    return { pdf, report, which };
  } finally { stage.done(); }
}

export async function exportPdf(doc, pageEls, opts = {}) {
  const { pdf, report } = await buildPdf(doc, pageEls, opts);
  const bytes = await pdf.save({ useObjectStreams: true });
  return { name: `${safeName(doc.name)}.pdf`, blob: new Blob([bytes], { type: 'application/pdf' }), report, bytes };
}
