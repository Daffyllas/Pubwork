// Dates for calendar templates, with month and day names in the person's language from the browser.
const SUNDAY_FIRST = /-(US|CA|MX|BR|PH|JP|IL|SA|CO|VE|PE|GT|HN|SV|NI|PA|DO|PR|ZA|AU|IN)$/i;
export function weekStartsSunday(lang) {
  const loc = (() => { try { const n = (navigator.language || '').replace(/[@.].*$/, ''); return Intl.getCanonicalLocales(n)[0] || ''; } catch { return ''; } })() || lang; // a browser language like 'en-US@posix' is not a valid tag
  if (SUNDAY_FIRST.test(loc)) return true;
  return lang === 'pt' && /BR/i.test(loc);
}
export function monthName(lang, year, month) {
  const s = new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(year, month, 1));
  return s.charAt(0).toLocaleUpperCase(lang) + s.slice(1);
}
// short weekday names in display order
export function weekdayNames(lang, sundayFirst, style = 'short') {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: style });
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, (sundayFirst ? 7 : 1) + i); // 7 Jan 2024 was a Sunday, 1 Jan a Monday
    const s = fmt.format(d).replace('.', '');
    out.push(s.charAt(0).toLocaleUpperCase(lang) + s.slice(1));
  }
  return out;
}
// weeks of a month: [[day|null × 7] …]
export function monthWeeks(year, month, sundayFirst) {
  const first = new Date(year, month, 1).getDay(); // 0 = Sunday
  const lead = sundayFirst ? first : (first + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
// the calendar year to make: next year from October on, otherwise this year
export function calendarYear() { const d = new Date(); return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear(); }
