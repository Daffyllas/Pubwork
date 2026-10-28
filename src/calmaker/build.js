// The calendar maker: months from any start, in the person's language, with public holidays and their
// own dates (birthdays and the like) written in the days, and photos on the month pages.
import { makeKit } from '../templates/kit.js';
import { schemeColors, fontPair } from '../templates/schemes.js';
import { loadArt } from '../templates/art.js';
import { monthName, weekdayNames, monthWeeks } from '../templates/calendar.js';
import { holidays } from './holidays.js';

const loc = (lang) => { const n = (() => { try { const n = (navigator.language || '').replace(/[@.].*$/, ''); return Intl.getCanonicalLocales(n)[0] || ''; } catch { return ''; } })(); return n.toLowerCase().startsWith(lang) ? n : lang; };
export const LAYOUTS = ['photo', 'grid', 'year'];

// what happens on each day: Map 'y-m-d' -> { names: [], off: bool }
function dayNotes({ firstYear, lastYear, country, events }) {
  const map = new Map(), at = (y, m, d) => { const key = `${y}-${m}-${d}`; if (!map.has(key)) map.set(key, { names: [], off: false }); return map.get(key); };
  for (let y = firstYear; y <= lastYear; y++) {
    if (country) for (const h of holidays(country, y)) { const n = at(y, h.date.getMonth(), h.date.getDate()); n.names.push(h.name); n.off = true; }
    for (const e of events || []) if (e.text && e.m != null) { const days = new Date(y, e.m + 1, 0).getDate(); if (e.d <= days) at(y, e.m, e.d).names.push(e.text); }
  }
  return map;
}

// one month as a table, with the day's holidays and dates written small under the number
function monthTable(k, x, y, w, h, year, month, notes, o) {
  const lang = loc(k.lang), sun = o.sundayFirst;
  const names = weekdayNames(lang, sun, o.long ? 'long' : 'short');
  const weeks = monthWeeks(year, month, sun);
  const weekend = (ci) => (sun ? ci === 0 || ci === 6 : ci >= 5);
  const head = names.map((n, ci) => ({ t: o.mini ? n.slice(0, 2) : n, bold: true, color: 'light', fill: weekend(ci) ? 'accent' : 'primary', align: 'center', valign: 'middle', size: o.headSize ?? 9 }));
  const rows = weeks.map((wk) => wk.map((d, ci) => {
    const n = d && notes.get(`${year}-${month}-${d}`), red = weekend(ci) || n?.off;
    if (o.mini) return { t: d ? String(d) : '', align: 'center', valign: 'middle', size: o.size ?? 8.5, bold: !!n || red, color: n ? 'light' : red ? 'primary' : 'dark', fill: n ? (n.off ? 'primary' : 'secondary') : null };
    return { t: d ? String(d) : '', align: 'left', valign: 'top', bold: true, size: o.size ?? 11, color: red ? 'primary' : 'dark', fill: red && d ? 'light' : null, sub: n ? n.names : undefined, subSize: o.subSize ?? 7, subColor: n?.off ? 'primary' : 'dark' };
  }));
  const headH = o.headH ?? Math.min(8, h / 8);
  k.table(x, y, w, h, [head, ...rows], { rowHeights: [headH, ...rows.map(() => (h - headH) / rows.length)], border: o.border, borderColor: o.borderColor });
}

// options: { layout, year, start (0-11), months, sundayFirst, country, events: [{m, d, text}], photos: [{mime,data}], scheme, fonts, lang, name }
export async function buildCalendar(o) {
  await loadArt();
  const { layout = 'photo', year, start = 0, sundayFirst = false, country = '', events = [], photos = [], scheme = 'seaside', fonts = 'modern', lang = 'en' } = o;
  const months = layout === 'year' ? 12 : Math.max(1, Math.min(24, o.months || 12));
  const list = Array.from({ length: months }, (_, i) => ({ y: year + Math.floor((start + i) / 12), m: (start + i) % 12 }));
  const notes = dayNotes({ firstYear: list[0].y, lastYear: list[list.length - 1].y, country, events });
  const k = makeKit({ scheme: schemeColors(scheme), fonts: fontPair(fonts), s: (x) => x, lang });
  const L = loc(lang), opt = { sundayFirst };
  const yearsText = list[0].y === list[list.length - 1].y ? String(list[0].y) : `${list[0].y}–${list[list.length - 1].y}`;
  if (layout === 'photo') {
    list.forEach(({ y, m }, i) => {
      k.page('paper');
      const { W, H } = k, ph = H * 0.52;
      const p = photos.length ? photos[i % photos.length] : null;
      const it = k.photo(0, 0, W, ph); if (p) { it.data = p.data; it.mime = p.mime; delete it.placeholder; }
      k.text(14, ph + 6, W - 80, 20, monthName(L, y, m), { size: 36, font: 'heading', bold: true, color: 'primary' });
      k.text(W - 70, ph + 12, 56, 14, String(y), { size: 22, align: 'right', color: 'secondary', bold: true });
      monthTable(k, 14, ph + 30, W - 28, H - ph - 42, y, m, notes, opt);
    });
  } else if (layout === 'grid') {
    for (const { y, m } of list) {
      k.page('paper-landscape');
      const { W, H } = k;
      k.text(14, 8, W - 28, 20, `${monthName(L, y, m)} ${y}`, { size: 32, font: 'heading', bold: true, color: 'primary' });
      monthTable(k, 14, 30, W - 28, H - 42, y, m, notes, { ...opt, long: true, size: 13, headH: 8, subSize: 8 });
    }
  } else {
    k.page('paper');
    const { W, H } = k;
    k.text(14, 8, W - 28, 26, yearsText, { size: 54, font: 'heading', bold: true, color: 'primary', align: 'center' });
    // the year's dates listed under the months
    const listed = [];
    for (const { y, m } of list) for (let d = 1; d <= 31; d++) { const n = notes.get(`${y}-${m}-${d}`); if (n) listed.push({ y, m, d, n }); }
    const fmt = new Intl.DateTimeFormat(L, { day: 'numeric', month: 'short' });
    const listH = listed.length ? Math.min(70, 8 + Math.ceil(listed.length / 3) * 4.2) : 0;
    const top = 40, cw = (W - 28 - 16) / 3, ch = (H - top - listH - 50) / 4;
    list.forEach(({ y, m }, i) => {
      const x = 14 + (i % 3) * (cw + 8), yy = top + Math.floor(i / 3) * (ch + 10);
      k.text(x, yy, cw, 8, monthName(L, y, m) + (list[0].y !== y || list[0].y !== list[11].y ? ` ${y}` : ''), { size: 13, bold: true, color: 'primary', font: 'heading' });
      monthTable(k, x, yy + 9, cw, ch - 10, y, m, notes, { ...opt, mini: true, size: 8.5, headSize: 7.5, headH: 5, border: false });
    });
    if (listed.length) {
      const y0 = H - 14 - listH, per = Math.ceil(listed.length / 3);
      k.line(14, y0 - 3, W - 14, y0 - 3, { color: 'secondary', width: 0.6 });
      for (let c = 0; c < 3; c++) {
        const part = listed.slice(c * per, (c + 1) * per); if (!part.length) continue;
        k.text(14 + c * (cw + 8), y0, cw, listH, part.map((e) => ({ runs: [{ t: fmt.format(new Date(e.y, e.m, e.d)) + '  ', bold: true, color: e.n.off ? 'primary' : 'secondary' }, { t: e.n.names.join(', ') }], after: 1 })), { size: 8, lh: 1.15 });
      }
    }
  }
  const doc = { version: 1, name: o.name || yearsText, pages: k.pages, masters: [], fonts: {}, embeddedFonts: [], meta: {}, source: 'calendar', notes: {}, scheme, fontPair: fonts };
  for (const pg of doc.pages) for (const it of pg.items) {
    for (const p of it.paras || []) for (const r of p.runs) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1;
    if (it.type === 'table') for (const row of it.rows) for (const c of row.cells) for (const p of c.paras) for (const r of p.runs) doc.fonts[r.font] = (doc.fonts[r.font] || 0) + 1;
  }
  return doc;
}
