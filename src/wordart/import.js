// WordArt from older .pub files arrives as words plus the shape Publisher bent them into. Draw the words
// with Pubwork's own WordArt, stretched to fill that shape's box as Publisher does, so they show and print.
import { textOutlines } from './outline.js';
import { applyWarp, toPath } from './warp.js';
import { walkItems, resizeItem } from '../editor/model.js';

export async function drawImportedWordArt(doc) {
  const items = [...walkItems(doc)].map((e) => e.it).filter((it) => it.needsWordArt);
  for (const it of items) {
    try {
      const { contours } = await textOutlines(it.wordart);
      if (!contours.length) { delete it.needsWordArt; continue; }
      const box = { x: it.x, y: it.y, w: Math.max(it.w, 1), h: Math.max(it.h, 1) };
      const g = toPath(applyWarp(contours, it.wordart.warp), box.x, box.y, box.w);
      it.d = g.d; it.w = g.w; it.h = g.h;
      resizeItem(it, { x: box.x, y: box.y, w: g.w, h: g.h }, box); // stretch to the shape's box
      if (!it.fill && !it.stroke) it.fill = { type: 'solid', color: '#000000', opacity: 1 };
    } catch (err) { console.warn('WordArt could not be drawn', err); }
    delete it.needsWordArt;
  }
  return items.length;
}
