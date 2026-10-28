// Shapes a picture can be cut to ("crop to shape"). Each shape is an outline made of many points in a 1×1
// square; shapePoints() stretches it over the picture and gives page points, which go into it.points
// (render.js clips the picture to them, and the exports follow).

const ring = (n, f) => Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2));

// the corners of a box with rounded corners, r as a share of the shorter side, for a w×h box
function rounded(w, h, r, out = [], y1 = 1) {
  const R = Math.min(w, h * y1) * r, rx = R / w, ry = R / h, steps = 8;
  const arc = (cx, cy, a0) => { for (let i = 0; i <= steps; i++) { const a = a0 + (i / steps) * (Math.PI / 2); out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } };
  arc(1 - rx, ry, -Math.PI / 2); arc(1 - rx, y1 - ry, 0); arc(rx, y1 - ry, Math.PI / 2); arc(rx, ry, Math.PI);
  return out;
}

const SHAPES = {
  oval: () => ring(96, (a) => [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]),
  rounded: (w, h) => rounded(w, h, 0.16),
  star: () => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.2 : 0.5; return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)]; }),
  heart: () => ring(120, (t) => [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]),
  hexagon: () => [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  triangle: () => [[0.5, 0], [1, 1], [0, 1]],
  bubble: (w, h) => {
    // a rounded box with a little tail at the bottom left
    const body = 0.8, pts = rounded(w, h, 0.14, [], body);
    // the bottom edge runs from the third corner arc (index 18..26); put the tail after the bottom-right arc
    const i = 18; // start of the bottom-left arc: the edge before it is the bottom side
    pts.splice(i, 0, [0.42, body], [0.18, 1], [0.26, body]);
    return pts;
  },
  arrow: () => [[0, 0.3], [0.6, 0.3], [0.6, 0], [1, 0.5], [0.6, 1], [0.6, 0.7], [0, 0.7]],
  cloud: () => ring(180, (a) => { const r = 0.86 + 0.14 * Math.sqrt(Math.abs(Math.sin(4.5 * a))); return [Math.cos(a) * r, Math.sin(a) * r * 0.8]; }),
};
export const CROP_SHAPES = Object.keys(SHAPES);

// -> [[x, y], …] in page points over the box x, y, w, h (the shape fills the box exactly)
export function shapePoints(name, x, y, w, h) {
  const raw = SHAPES[name]?.(w, h); if (!raw) return null;
  const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), sx = Math.max(...xs) - x0 || 1, sy = Math.max(...ys) - y0 || 1;
  return raw.map(([u, v]) => [+(x + ((u - x0) / sx) * w).toFixed(2), +(y + ((v - y0) / sy) * h).toFixed(2)]);
}

// small icons for the buttons (24×24, drawn with the same outlines)
export function shapeIcon(name) {
  if (name === 'none') return '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="1"/></svg>';
  const pts = shapePoints(name, 4, 5, 16, 14);
  return `<svg viewBox="0 0 24 24"><polygon points="${pts.map((p) => p.join(',')).join(' ')}"/></svg>`;
}
