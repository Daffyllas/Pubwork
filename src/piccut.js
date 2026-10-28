// Cutting the edges off a picture ("crop"). it.fx.cut = { left, top, right, bottom }: the part of the WHOLE
// picture cut off each of its own edges (0–1, before any flip). The item's box (x, y, w, h) is the part that
// is left, so the picture never stretches: the whole picture is w / (1 - left - right) wide.
// src/picfx.js bakes the cut into the picture it shows, so the screen and every export show the same thing.

// the cut as { l, t, r, b } (kept sensible), or null when nothing is cut off
export function cutOf(f) {
  const c = f?.cut; if (!c || typeof c !== 'object') return null;
  const k = (v) => Math.max(0, Math.min(0.98, Number(v) || 0));
  const l = k(c.left), t = k(c.top);
  const r = Math.min(k(c.right), Math.max(0, 0.98 - l)), b = Math.min(k(c.bottom), Math.max(0, 0.98 - t));
  return l > 1e-4 || t > 1e-4 || r > 1e-4 || b > 1e-4 ? { l, t, r, b } : null;
}
// the same, as seen on the page: a picture turned over shows its right edge on the left
export function shownCut(f) {
  const c = cutOf(f); if (!c) return null;
  return { l: f.flipH ? c.r : c.l, r: f.flipH ? c.l : c.r, t: f.flipV ? c.b : c.t, b: f.flipV ? c.t : c.b };
}
// until the cut copy of the picture is ready, show the right part of the whole one. Returns a function
// that takes this away again (once the copy is in).
export function cutPreview(box, img, it, f) {
  const c = shownCut(f); if (!c) return null;
  const W = 1 - c.l - c.r, H = 1 - c.t - c.b;
  box.style.overflow = 'hidden';
  Object.assign(img.style, { position: 'absolute', left: `${(-c.l / W) * 100}%`, top: `${(-c.t / H) * 100}%`, width: `${100 / W}%`, height: `${100 / H}%` });
  if (f.flipH || f.flipV) img.style.transform = `scale(${f.flipH ? -1 : 1}, ${f.flipV ? -1 : 1})`;
  return () => {
    box.style.overflow = '';
    for (const k of ['position', 'left', 'top', 'width', 'height', 'transform']) img.style[k] = '';
  };
}
