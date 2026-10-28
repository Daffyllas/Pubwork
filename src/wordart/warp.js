// Shapes of WordArt text. Every warp is a function that moves a point of the letters: either an envelope
// (the text's box, x and y from 0 to 1, is mapped into a curved outline) or a path the text follows (arch,
// circle). Curves keep their control points, which are moved too; long pieces are cut into short ones
// first so that straight strokes bend smoothly.

export const WARPS = ['straight', 'archUp', 'archDown', 'circle', 'wave', 'bulge', 'pinch', 'slantUp', 'slantDown', 'triangleUp', 'fadeRight'];
const AFFINE = new Set(['straight', 'slantUp', 'slantDown']);

// a point of a curve (one piece: start point a, control points, end point)
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function splitQ(a, c, b, t) { const p = lerp(a, c, t), q = lerp(c, b, t), m = lerp(p, q, t); return [[a, p, m], [m, q, b]]; }
function splitC(a, c1, c2, b, t) {
  const p1 = lerp(a, c1, t), p2 = lerp(c1, c2, t), p3 = lerp(c2, b, t), q1 = lerp(p1, p2, t), q2 = lerp(p2, p3, t), m = lerp(q1, q2, t);
  return [[a, p1, q1, m], [m, q2, p3, b]];
}
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// cut every segment into pieces no longer than maxLen
function subdivide(contours, maxLen) {
  return contours.map((ct) => {
    const out = []; let cur = null, start = null;
    for (const s of ct) {
      if (s.c === 'M') { cur = start = s.p[0]; out.push(s); continue; }
      if (s.c === 'Z') { out.push(s); cur = start; continue; }
      const end = s.p[s.p.length - 1];
      const pts = [cur, ...s.p];
      let len = 0; for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
      const n = Math.min(64, Math.max(1, Math.ceil(len / maxLen)));
      if (n === 1) { out.push(s); cur = end; continue; }
      if (s.c === 'L') { for (let i = 1; i <= n; i++) out.push({ c: 'L', p: [lerp(cur, end, i / n)] }); }
      else {
        let rest = pts;
        for (let i = 0; i < n - 1; i++) {
          const t = 1 / (n - i);
          const [a, b] = s.c === 'Q' ? splitQ(...rest, t) : splitC(...rest, t);
          out.push({ c: s.c, p: a.slice(1) }); rest = b;
        }
        out.push({ c: s.c, p: rest.slice(1) });
      }
      cur = end;
    }
    return out;
  });
}

// the box the outlines cover (curves sampled, so control points far outside don't count)
export function boxOf(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = ([x, y]) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (const ct of contours) {
    let cur = null, start = null;
    for (const s of ct) {
      if (s.c === 'M') { cur = start = s.p[0]; add(cur); continue; }
      if (s.c === 'Z') { cur = start; continue; }
      const end = s.p[s.p.length - 1];
      if (s.c === 'Q') for (const t of [0.25, 0.5, 0.75]) add(splitQ(cur, s.p[0], end, t)[0][2]);
      if (s.c === 'C') for (const t of [0.2, 0.4, 0.6, 0.8]) add(splitC(cur, s.p[0], s.p[1], end, t)[0][3]);
      add(end); cur = end;
    }
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
}

// point function for a warp, given the text's box b (y down)
function warpFn(warp, b) {
  const W = b.w || 1, H = b.h || 1;
  const uv = ([x, y]) => [(x - b.x) / W, (y - b.y) / H];
  // envelope: top and bottom edges as functions of u; x may be squeezed too
  const envelope = (top, bottom, xs = (u) => u * W) => (p) => { const [u, v] = uv(p); const t = top(u), bt = bottom(u); return [xs(u, v), t + (bt - t) * v]; };
  const hump = (u) => Math.sin(Math.PI * u);
  switch (warp) {
    case 'slantUp': return (p) => { const [u, v] = uv(p); return [u * W, v * H - u * W * 0.22]; };
    case 'slantDown': return (p) => { const [u, v] = uv(p); return [u * W, v * H + u * W * 0.22]; };
    case 'bulge': { const a = Math.min(W * 0.07, H * 0.3); return envelope((u) => -a * hump(u), (u) => H + a * hump(u)); }
    case 'pinch': { const a = H * 0.22; return envelope((u) => a * hump(u), (u) => H - a * hump(u)); }
    case 'triangleUp': { const a = Math.min(W * 0.25, H * 1.1); return envelope((u) => -a * (1 - Math.abs(2 * u - 1)), () => H); }
    case 'fadeRight': return envelope((u) => H * 0.3 * u, (u) => H - H * 0.3 * u, (u) => W * (u - 0.12 * u * u));
    case 'wave': { const a = Math.min(W * 0.06, H * 0.35); return (p) => { const [u, v] = uv(p); return [u * W, v * H + a * Math.sin(2 * Math.PI * u)]; }; }
    case 'archUp': case 'archDown': case 'circle': {
      // the text's middle line follows a circle; letters stand on it (arch down: hang below it)
      const full = warp === 'circle' ? Math.PI * 1.9 : Math.PI;
      const R = Math.max(W / full, H * (warp === 'circle' ? 1.1 : 0.9));
      const span = W / R; // angle the text covers
      const down = warp === 'archDown';
      return (p) => {
        const [u, v] = uv(p);
        const r = R + (down ? (v - 0.5) : (0.5 - v)) * H;
        const a = down ? -Math.PI / 2 - span / 2 + span * u : Math.PI / 2 + span / 2 - span * u;
        return [r * Math.cos(a), -r * Math.sin(a)];
      };
    }
    default: return (p) => p;
  }
}

// bend the outlines; returns new contours (any position, normalised later)
export function applyWarp(contours, warp) {
  const b = boxOf(contours);
  if (!b.w) return contours;
  const f = warpFn(warp, b);
  const src = AFFINE.has(warp) ? contours : subdivide(contours, Math.max(b.w, b.h) / 70);
  return src.map((ct) => ct.map((s) => ({ c: s.c, p: s.p.map(f) })));
}

// outlines -> SVG path data scaled to width w, top-left at (x, y); -> { d, w, h, k }
export function toPath(contours, x, y, w) {
  const b = boxOf(contours);
  const k = b.w ? w / b.w : 1;
  const n = (v) => +v.toFixed(2);
  const P = ([px, py]) => `${n(x + (px - b.x) * k)} ${n(y + (py - b.y) * k)}`;
  const parts = [];
  for (const ct of contours) for (const s of ct) parts.push(s.c === 'Z' ? 'Z' : `${s.c}${s.p.map(P).join(' ')}`);
  return { d: parts.join(''), w: b.w * k, h: b.h * k, k };
}
