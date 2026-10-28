// "My details", like Publisher's business information: typed in once, filled into any template.
// Kept in this browser only. Template boxes say which detail they hold (item.field).
import { walkItems } from '../editor/model.js';

export const FIELDS = ['name', 'title', 'org', 'tagline', 'address', 'phone', 'email', 'web'];
const KEY = 'pw-details';
export function loadDetails() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
export function saveDetails(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; } }
export const hasDetails = (d = loadDetails()) => FIELDS.some((f) => d[f]) || !!d.logo;

// put the details into every box that asks for one; returns how many changed
export function fillDetails(doc, d = loadDetails()) {
  let n = 0;
  for (const { it } of walkItems(doc)) {
    if (!it.field && it.details && it.type === 'text') { // sample contact details inside a longer line
      let hit = false;
      for (const [sample, key] of it.details) {
        const v = (d[key] || '').trim().replace(/\s*\r?\n\s*/g, ', '); if (!v) continue;
        for (const pa of it.paras) for (const r of pa.runs) if (r.text.includes(sample)) { r.text = r.text.split(sample).join(v); hit = true; }
      }
      if (hit) n++;
      continue;
    }
    if (!it.field) continue;
    if (it.field === 'logo') {
      if (it.type !== 'image' || !d.logo) continue;
      // keep the frame, fit the logo inside it
      const fx = it.fx ?? it.x, fy = it.fy ?? it.y, fw = it.fw ?? it.w, fh = it.fh ?? it.h;
      const k = Math.min(fw / d.logo.w, fh / d.logo.h);
      Object.assign(it, { fx, fy, fw, fh, w: d.logo.w * k, h: d.logo.h * k, mime: d.logo.mime, data: d.logo.data });
      it.x = fx + (fw - it.w) / 2; it.y = fy + (fh - it.h) / 2;
      delete it.tint; delete it.art; delete it.points; delete it.round;
      n++; continue;
    }
    const v = (d[it.field] || '').trim(); if (!v || it.type !== 'text') continue;
    const first = it.paras[0] || { runs: [] };
    const style = { ...(first.runs.find((r) => r.text) || first.runs[0] || {}) };
    const { text, ...rest } = style; void text;
    it.paras = v.split(/\r?\n/).map((line) => ({ ...first, cont: undefined, runs: [{ ...rest, text: line }] }));
    n++;
  }
  return n;
}
