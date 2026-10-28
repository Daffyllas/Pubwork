// Picture effects (brightness, contrast, black-and-white, sepia, washout, recolour, transparency, flips,
// rounded corners, a border along a cut-out shape, a soft shadow).
// decorateImage(box, img, it, ctx, src) is called by render.js once the picture's source is known. When the
// picture has effects (it.fx) they are BAKED into a copy of the picture (a PNG or JPEG data URL) and img.src
// is pointed at it, so the screen, printing, PDF and every other export show exactly the same thing.
// The shadow is a soft grey shape drawn just under the picture (an SVG like any other shape on the page).

import { cutOf, cutPreview } from './piccut.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const MAX_SIDE = 2400; // pixels on the long side of a baked picture
const cache = new Map(); // key -> Promise<data URL>

// it.fx with every setting filled in, or null when nothing is switched on
export function activeFx(it) {
  const f = it.fx; if (!f) return null;
  const on = f.brightness || f.contrast || f.grey || f.sepia || f.washout || f.recolor || (f.opacity != null && f.opacity < 1) || f.flipH || f.flipV || f.radius || f.shadow || cutOf(f);
  return on ? f : null;
}
// effects that change the picture itself (everything except the shadow)
const needsBake = (f) => !!(f.brightness || f.contrast || f.grey || f.sepia || f.washout || f.recolor || (f.opacity != null && f.opacity < 1) || f.flipH || f.flipV || f.radius || cutOf(f));

export function decorateImage(box, img, it, ctx, src) {
  const f = activeFx(it); if (!f || !src?.url) return;
  if (f.shadow) addShadow(box, it, f);
  if (!needsBake(f)) return;
  // the cut-out shape and the border go into the picture too, so they look the same everywhere
  const crop = it.points?.length > 2, border = it.stroke?.width > 0 && (crop || f.radius);
  if (f.radius && !crop) box.style.borderRadius = `${radiusPt(it, f)}pt`; // straight away, before the copy is ready
  const uncut = cutPreview(box, img, it, f); // the cut edges too
  return bake(it, f, src, crop, border).then((url) => {
    if (!url) return;
    img.src = url; uncut?.();
    img.style.filter = ''; box.querySelector(':scope > svg')?.remove(); // the .pub recolour (it.adjust) is in the copy now
    if (crop) box.style.clipPath = '';
    if (border) box.style.outline = '';
    return img.decode?.().catch(() => {});
  }).catch((err) => console.warn('picture effects:', err));
}

const radiusPt = (it, f) => (Math.min(100, f.radius || 0) / 100) * (Math.min(it.w, it.h) / 2);
const dataKey = (d) => (d.length < 200000 ? d : `${d.length}:${d.slice(0, 64)}${d.slice(d.length >> 1, (d.length >> 1) + 64)}${d.slice(-64)}`);

function bake(it, f, src, crop, border) {
  const rel = crop ? it.points.map(([x, y]) => [+((x - it.x) / (it.w || 1)).toFixed(4), +((y - it.y) / (it.h || 1)).toFixed(4)]) : null;
  const ratio = +(it.w / (it.h || 1)).toFixed(3);
  const key = JSON.stringify([dataKey(it.data || src.url), f, it.adjust || null, border ? it.stroke : null, rel, ratio, border || f.radius ? Math.round(Math.max(it.w, it.h)) : 0]);
  if (!cache.has(key)) {
    cache.set(key, draw(it, f, src, rel, border).catch((err) => { cache.delete(key); throw err; }));
    while (cache.size > 40) cache.delete(cache.keys().next().value);
  }
  return cache.get(key);
}

async function draw(it, f, src, rel, border) {
  const pic = new Image(); pic.src = src.url; await pic.decode();
  const nw = pic.naturalWidth || 0, nh = pic.naturalHeight || 0;
  // pixels per point: the picture's own sharpness, at least 3 (so corners and borders are smooth), at most MAX_SIDE
  // with cut edges the whole picture is bigger than the box: fw x fh points
  const cut = cutOf(f), fw = cut ? it.w / (1 - cut.l - cut.r) : it.w, fh = cut ? it.h / (1 - cut.t - cut.b) : it.h;
  let s = nw && nh ? Math.max(nw / fw, nh / fh) : 3;
  if (src.type === 'image/svg+xml') s = 4;
  s = Math.min(Math.max(s, 3), MAX_SIDE / Math.max(it.w, it.h, 1));
  const W = Math.max(1, Math.round(it.w * s)), H = Math.max(1, Math.round(it.h * s));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const opacity = f.opacity != null ? Math.max(0, Math.min(1, f.opacity)) : 1;
  g.save();
  if (f.flipH) { g.translate(W, 0); g.scale(-1, 1); }
  if (f.flipV) { g.translate(0, H); g.scale(1, -1); }
  if (cut) { const kx = W / it.w, ky = H / it.h; g.drawImage(pic, -cut.l * fw * kx, -cut.t * fh * ky, fw * kx, fh * ky); } // (cut in the picture's own, unturned edges)
  else g.drawImage(pic, 0, 0, W, H);
  g.restore();
  const ops = colourOps(f, it.adjust);
  let alpha = opacity < 1 || !!rel || !!f.radius || !/jpeg/.test(src.type || '');
  if (ops || opacity < 1) {
    try {
      const im = g.getImageData(0, 0, W, H), d = im.data;
      let seeThrough = false;
      for (let i = 0; i < d.length; i += 4) {
        if (ops) ops(d, i);
        if (opacity < 1) d[i + 3] *= opacity;
        if (d[i + 3] < 255) seeThrough = true;
      }
      g.putImageData(im, 0, 0);
      if (!rel && !f.radius) alpha = seeThrough;
    } catch { // the browser wouldn't let us read the pixels (some SVG pictures): use its own filters
      const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; tmp.getContext('2d').drawImage(c, 0, 0);
      g.clearRect(0, 0, W, H); g.filter = cssFilter(f); g.globalAlpha = opacity; g.drawImage(tmp, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
    }
  }
  // the outline: the cut-out shape, or a rectangle with rounded corners
  const outline = () => {
    g.beginPath();
    if (rel) rel.forEach(([u, v], i) => (i ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H)));
    else roundRect(g, 0, 0, W, H, radiusPt(it, f) * s);
    g.closePath();
  };
  if (rel || f.radius) { g.save(); g.globalCompositeOperation = 'destination-in'; outline(); g.fillStyle = '#000'; g.fill(); g.restore(); }
  if (border) { // inside the outline, so nothing is cut off
    g.save(); outline(); g.clip(); outline();
    g.lineWidth = it.stroke.width * 2 * s; g.strokeStyle = it.stroke.color || '#000'; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  const type = alpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((res) => c.toBlob(res, type, 0.92));
  c.width = c.height = 0;
  if (!blob) return null;
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

function roundRect(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r);
}

const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// one function that changes the colour of a pixel in place, or null when the colours stay as they are
function colourOps(f, adjust) {
  const recolor = hexRgb(f.recolor || adjust?.recolor);
  const light = adjust?.light != null ? (adjust.light - 0.5) * 2 * 255 : 0;
  if (!f.brightness && !f.contrast && !f.grey && !f.sepia && !f.washout && !recolor && !light) return null;
  // brightness and contrast as one lookup table
  const lut = new Uint8ClampedArray(256);
  const b = ((f.brightness || 0) / 100) * 180, C = (f.contrast || 0) * 2.3;
  const k = (259 * (C + 255)) / (255 * (259 - C));
  for (let v = 0; v < 256; v++) lut[v] = k * (v + b - 128) + 128;
  return (d, i) => {
    let r = lut[d[i]], g = lut[d[i + 1]], bl = lut[d[i + 2]];
    if (f.sepia) { const r0 = r, g0 = g, b0 = bl; r = 0.393 * r0 + 0.769 * g0 + 0.189 * b0; g = 0.349 * r0 + 0.686 * g0 + 0.168 * b0; bl = 0.272 * r0 + 0.534 * g0 + 0.131 * b0; }
    else if (f.grey) { r = g = bl = 0.299 * r + 0.587 * g + 0.114 * bl; }
    if (recolor) { // shades of one colour: dark parts take the colour, white stays white
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
      r = 255 * (recolor[0] + L * (1 - recolor[0])); g = 255 * (recolor[1] + L * (1 - recolor[1])); bl = 255 * (recolor[2] + L * (1 - recolor[2]));
    }
    if (f.washout) { r = 255 - (255 - r) * 0.3; g = 255 - (255 - g) * 0.3; bl = 255 - (255 - bl) * 0.3; }
    if (light) { r += light; g += light; bl += light; }
    d[i] = r; d[i + 1] = g; d[i + 2] = bl;
  };
}
// roughly the same with the browser's own filters (used only when the pixels can't be read)
export function cssFilter(f) {
  const out = [];
  if (f.brightness) out.push(`brightness(${1 + f.brightness / 140})`);
  if (f.contrast) out.push(`contrast(${1 + f.contrast / 100})`);
  if (f.grey) out.push('grayscale(1)');
  if (f.sepia) out.push('sepia(1)');
  if (f.washout) out.push('contrast(0.3) brightness(1.6)');
  return out.join(' ') || 'none';
}

// ---------------------------------------------------------------- the soft shadow
function addShadow(box, it, f) {
  const off = Math.max(1.5, Math.min(it.w, it.h) * 0.025), blur = Math.max(2, Math.min(it.w, it.h) * 0.03), pad = off + blur * 3 + 2;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'it shape pw-picshadow');
  svg.setAttribute('viewBox', `${it.x - pad} ${it.y - pad} ${it.w + 2 * pad} ${it.h + 2 * pad}`);
  svg.setAttribute('aria-hidden', 'true');
  Object.assign(svg.style, { left: `${it.x - pad}pt`, top: `${it.y - pad}pt`, width: `${it.w + 2 * pad}pt`, height: `${it.h + 2 * pad}pt`, pointerEvents: 'none' });
  if (box.style.transform) svg.style.transform = box.style.transform;
  const id = `pws${it.id}${Math.random().toString(36).slice(2, 7)}`;
  const defs = document.createElementNS(SVGNS, 'defs'), filter = document.createElementNS(SVGNS, 'filter');
  filter.setAttribute('id', id); filter.setAttribute('x', '-30%'); filter.setAttribute('y', '-30%'); filter.setAttribute('width', '160%'); filter.setAttribute('height', '160%');
  const gb = document.createElementNS(SVGNS, 'feGaussianBlur'); gb.setAttribute('stdDeviation', blur.toFixed(2));
  filter.appendChild(gb); defs.appendChild(filter); svg.appendChild(defs);
  let node;
  if (it.points?.length > 2) {
    node = document.createElementNS(SVGNS, 'polygon');
    node.setAttribute('points', it.points.map(([x, y]) => `${(x + off).toFixed(2)},${(y + off).toFixed(2)}`).join(' '));
  } else {
    node = document.createElementNS(SVGNS, 'rect');
    node.setAttribute('x', it.x + off); node.setAttribute('y', it.y + off); node.setAttribute('width', it.w); node.setAttribute('height', it.h);
    const r = f.radius ? radiusPt(it, f) : 0; if (r) node.setAttribute('rx', r.toFixed(2));
  }
  node.setAttribute('fill', '#000000'); node.setAttribute('fill-opacity', String(0.38 * (f.opacity ?? 1)));
  // the PDF export draws filtered shapes as a picture of the area around them: the (invisible) line width makes that area big enough
  node.setAttribute('stroke', 'none'); node.setAttribute('stroke-width', (blur * 3).toFixed(2));
  node.setAttribute('filter', `url(#${id})`);
  svg.appendChild(node);
  // picked and moved together with the picture, but not a thing of its own (no data-id)
  svg.dataset.group = box.dataset.group || box.dataset.id || it.id;
  if (box.classList.contains('from-master')) svg.classList.add('from-master');
  box.before(svg);
}
