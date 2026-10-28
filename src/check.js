// The check before printing: things that come out wrong on paper, found on the pages as they are drawn.
// Each finding names the page and the thing on it, so a click can take the person straight there.
import { walkItems } from './editor/model.js';

const MM = 72 / 25.4;
const textOf = (it) => (it.paras || []).map((p) => p.runs.map((r) => r.text).join('')).join('').replace(/[\s​]/g, '');

// -> [{ page: index|null, unit: id|null, key, vars, level: 'warn'|'info' }]
export function checkDesign(doc, pageEls, { fonts = [], bleed = false } = {}) {
  const issues = [];
  const model = new Map(); for (const { it } of walkItems(doc)) model.set(it.id, it);
  pageEls.forEach((pel, pi) => {
    const pg = doc.pages[pi]; if (!pg || !pel) return;
    const pr = pel.getBoundingClientRect(), k = pg.w / (pr.width || 1); // points per screen pixel
    const els = [...pel.querySelectorAll(':scope > .it')];
    if (!els.length) { issues.push({ page: pi, unit: null, key: 'check.emptyPage', vars: { n: pi + 1 }, level: 'info' }); return; }
    const seen = new Set();
    for (const el of els) {
      const it = model.get(el.dataset.id); if (!it) continue;
      const unit = el.dataset.group || el.dataset.id;
      const add = (key, vars = {}, level = 'warn') => { const sig = key + unit; if (seen.has(sig)) return; seen.add(sig); issues.push({ page: pi, unit, key, vars, level }); };
      const x0 = it.x, y0 = it.y, x1 = it.x + it.w, y1 = it.y + it.h;
      const outside = x1 <= 0 || y1 <= 0 || x0 >= pg.w || y0 >= pg.h;
      if (outside) { add('check.offPage'); continue; }
      const textish = it.type === 'text' || it.type === 'table';
      if (textish && el.classList.contains('overflow')) add('check.overflow');
      if (it.type === 'text' && !textOf(it) && !it.fill && !it.stroke && !it.chain) add('check.empty', {}, 'info');
      if (textish && textOf(it)) {
        const past = x0 < -1 || y0 < -1 || x1 > pg.w + 1 || y1 > pg.h + 1;
        if (past) add('check.pastEdge');
        else if (!it.rotate) {
          // where the letters really are, not the box around them
          const range = document.createRange(); range.selectNodeContents(el);
          let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
          for (const r of range.getClientRects()) { if (!r.width || !r.height) continue; L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom); }
          if (Number.isFinite(L)) {
            const d = Math.min((L - pr.left) * k, (T - pr.top) * k, (pr.right - R) * k, (pr.bottom - B) * k);
            if (d < 5 * MM && d > -1) add('check.nearEdge', {}, 'info');
          }
        }
      }
      if (it.type === 'image') {
        const img = el.querySelector('img');
        if (el.classList.contains('placeholder')) add('check.placeholder', {}, 'info');
        else if (el.classList.contains('missing') || !img) add('check.picMissing');
        else if (img.naturalWidth && it.w > 36 && it.h > 36 && !img.src.startsWith('data:image/svg')) {
          const dpi = Math.round(Math.min(img.naturalWidth / (it.w / 72), img.naturalHeight / (it.h / 72)));
          if (dpi < 150) add('check.blurry', { dpi }, dpi < 100 ? 'warn' : 'info');
        }
        if (bleed && !it.rotate) {
          const e = 0.75, touches = Math.abs(x0) < e || Math.abs(y0) < e || Math.abs(x1 - pg.w) < e || Math.abs(y1 - pg.h) < e;
          if (touches) add('check.noBleed', {}, 'info');
        }
      }
    }
  });
  for (const f of fonts) if (!f.embedded && !f.installed && !f.sameWidths) issues.push({ page: null, unit: null, key: 'check.font', vars: { font: f.original, standIn: f.standIn }, level: 'info' });
  return issues;
}
