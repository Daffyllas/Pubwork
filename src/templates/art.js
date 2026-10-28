// The free picture library: colourful flat pictures (Fluent Emoji, MIT) and line icons (Tabler, MIT).
// The data is a separate download, fetched the first time a picture or template is needed.
let data = null;
export async function loadArt() { data ||= await import('./art-data.js'); return data; }
export const artReady = () => !!data;

const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
// the picture as SVG text; icons are drawn in the given colour
export function artSvg(id, color = '#333333') {
  if (!data) throw new Error('picture library not loaded');
  if (id.startsWith('i:')) {
    const [w, h, body] = data.ICONS[id.slice(2)] || [24, 24, ''];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 8}" height="${h * 8}" viewBox="0 0 ${w} ${h}" color="${color}">${body.replace(/currentColor/g, color)}</svg>`;
  }
  const [w, h, body] = data.PICTURES[id] || [32, 32, ''];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 8}" height="${h * 8}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}
// a picture item for the page (points); icons remember their colour so colour schemes can change it
export function artItem(id, x, y, w, h, { color = '#333333', rotate = 0 } = {}) {
  const icon = id.startsWith('i:');
  const it = { type: 'image', x, y, w, h, mime: 'image/svg+xml', data: b64(artSvg(id, color)), art: id };
  if (icon) it.tint = color;
  if (rotate) it.rotate = rotate;
  return it;
}
// change an icon's colour in place, without the library: its SVG text names the colour
export function retint(it, color) {
  if (!it.tint || !it.data) return;
  const svg = decodeURIComponent(escape(atob(it.data)));
  it.data = b64(svg.split(it.tint).join(color));
  it.tint = color;
}
export const artCategories = () => data?.CATEGORIES || {};
