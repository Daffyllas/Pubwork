// Calendars: the dates come from the browser, with month and day names in the person's language.
import { monthName, weekdayNames, monthWeeks, weekStartsSunday, calendarYear } from './calendar.js';

const loc = (lang) => { const n = (() => { try { const n = (navigator.language || '').replace(/[@.].*$/, ''); return Intl.getCanonicalLocales(n)[0] || ''; } catch { return ''; } })(); return n.toLowerCase().startsWith(lang) ? n : lang; };

// one month as a table; weekend columns tinted
function monthTable(k, x, y, w, h, year, month, o = {}) {
  const lang = loc(k.lang), sun = weekStartsSunday(k.lang);
  const names = weekdayNames(lang, sun, o.long ? 'long' : 'short');
  const weeks = monthWeeks(year, month, sun);
  const weekend = (ci) => (sun ? ci === 0 || ci === 6 : ci >= 5);
  const head = names.map((n, ci) => ({ t: o.mini ? n.slice(0, 2) : n, bold: true, color: 'light', fill: weekend(ci) ? 'accent' : 'primary', align: 'center', valign: 'middle', size: o.headSize ?? 9 }));
  const rows = weeks.map((wk) => wk.map((d, ci) => ({ t: d ? String(d) : '', align: o.mini ? 'center' : 'left', valign: o.mini ? 'middle' : 'top', bold: !o.mini, size: o.size ?? 11, color: weekend(ci) ? 'accent' : 'dark', fill: weekend(ci) && !o.mini ? 'light' : null })));
  const headH = o.headH ?? Math.min(8, h / 8);
  k.table(x, y, w, h, [head, ...rows], { rowHeights: [headH, ...rows.map(() => (h - headH) / rows.length)], border: o.border, borderColor: o.borderColor });
}

export const calendars = [
  {
    id: 'cal-photo', cat: 'calendars', name: 'calp.name', scheme: 'seaside', fonts: 'modern',
    build(k) {
      const year = calendarYear(), lang = loc(k.lang);
      for (let m = 0; m < 12; m++) {
        if (m) k.page('paper');
        const { W, H } = k;
        k.photo(0, 0, W, H * 0.52);
        k.text(14, H * 0.54, W - 80, 20, monthName(lang, year, m), { size: 36, font: 'heading', bold: true, color: 'primary' });
        k.text(W - 70, H * 0.54 + 6, 56, 14, String(year), { size: 22, align: 'right', color: 'secondary', bold: true });
        monthTable(k, 14, H * 0.54 + 24, W - 28, H * 0.46 - 36, year, m);
      }
    },
  },
  {
    id: 'cal-year', cat: 'calendars', name: 'caly.name', scheme: 'forest', fonts: 'slab',
    build(k) {
      const { W, H } = k, year = calendarYear(), lang = loc(k.lang);
      k.text(14, 10, W - 28, 30, String(year), { size: 60, font: 'heading', bold: true, color: 'primary', align: 'center' });
      const cw = (W - 28 - 16) / 3, ch = (H - 56 - 30) / 4;
      for (let m = 0; m < 12; m++) {
        const x = 14 + (m % 3) * (cw + 8), y = 48 + Math.floor(m / 3) * (ch + 10);
        k.text(x, y, cw, 8, monthName(lang, year, m), { size: 13, bold: true, color: 'primary', font: 'heading' });
        monthTable(k, x, y + 9, cw, ch - 10, year, m, { mini: true, size: 8.5, headSize: 7.5, headH: 5, border: false });
      }
    },
  },
  {
    id: 'cal-month', cat: 'calendars', name: 'calm.name', scheme: 'berry', fonts: 'handwritten', size: 'paper-landscape',
    build(k) {
      const { W, H } = k, now = new Date(), month = (now.getMonth() + 1) % 12, year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
      k.text(14, 8, W - 28, 20, `${monthName(loc(k.lang), year, month)} ${year}`, { size: 32, font: 'heading', bold: true, color: 'primary' });
      monthTable(k, 14, 30, W - 28, H - 42, year, month, { long: true, size: 12, headH: 8 });
    },
  },
  {
    id: 'cal-week', cat: 'calendars', name: 'calw.name', scheme: 'lavender', fonts: 'modern', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, lang = loc(k.lang), sun = weekStartsSunday(k.lang);
      k.text(14, 8, W * 0.5, 18, s('calw.title'), { size: 30, font: 'heading', bold: true, color: 'primary' });
      k.text(W * 0.5, 12, W * 0.5 - 14, 10, s('calw.week'), { size: 13, align: 'right', color: 'dark' });
      const names = weekdayNames(lang, sun, 'long');
      const head = names.map((n) => ({ t: n, bold: true, color: 'light', fill: 'primary', align: 'center', valign: 'middle', size: 11 }));
      k.table(14, 30, W - 28, H * 0.55, [head, Array(7).fill('')], { rowHeights: [9, H * 0.55 - 9] });
      const half = (W - 34) / 2, y = 34 + H * 0.55;
      k.text(14, y, half, 8, s('calw.todo'), { size: 13, bold: true, color: 'primary', font: 'heading' });
      for (let i = 0; i < 5; i++) { k.rect(14, y + 12 + i * 8, 4, 4, { fill: 'none', stroke: 'primary', sw: 0.6 }); k.line(21, y + 16 + i * 8, 14 + half, y + 16 + i * 8, { color: '#c9c4bf', width: 0.4 }); }
      k.text(20 + half, y, half, 8, s('calw.notes'), { size: 13, bold: true, color: 'primary', font: 'heading' });
      for (let i = 0; i < 5; i++) k.line(20 + half, y + 16 + i * 8, W - 14, y + 16 + i * 8, { color: '#c9c4bf', width: 0.4 });
    },
  },
];

export const en = {
  'calp.name': 'Photo calendar (12 months)', 'caly.name': 'Year planner', 'calm.name': 'Monthly planner', 'calw.name': 'Weekly planner',
  'calw.title': 'My week', 'calw.week': 'Week of ____________', 'calw.todo': 'To do', 'calw.notes': 'Notes',
};
