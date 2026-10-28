// Public holidays for calendars, worked out for any year. Names are in the country's own language, as
// they would be printed on a calendar there. Only national days off are listed, not regional ones.

// Easter Sunday (Gregorian), as [month 0-11, day]
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
// Orthodox Easter Sunday: Julian date moved to the Gregorian calendar (right for 1900-2099)
function orthodoxEaster(y) {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return new Date(y, month - 1, day + 13);
}
const plus = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
// nth weekday (0 = Sunday) of a month; n = -1 for the last one
function nth(y, m, wd, n) {
  if (n > 0) { const first = new Date(y, m, 1).getDay(); return new Date(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7); }
  const last = new Date(y, m + 1, 0); return new Date(y, m, last.getDate() - ((last.getDay() - wd + 7) % 7));
}
// the given weekday on or after a date
const onOrAfter = (y, m, d, wd) => { const x = new Date(y, m, d); return plus(x, (wd - x.getDay() + 7) % 7); };

// a rule: 'MM-DD' | 'E±n' (Easter) | 'O±n' (Orthodox Easter) | 'n/wd/MM' (nth weekday) | function(year) -> Date|null
function day(rule, y) {
  if (typeof rule === 'function') return rule(y);
  let m;
  if ((m = /^(\d\d)-(\d\d)$/.exec(rule))) return new Date(y, +m[1] - 1, +m[2]);
  if ((m = /^([EO])([+-]\d+)$/.exec(rule))) return plus(m[1] === 'E' ? easter(y) : orthodoxEaster(y), +m[2]);
  if ((m = /^(-?\d)\/(\d)\/(\d\d)$/.exec(rule))) return nth(y, +m[3] - 1, +m[2], +m[1]);
  return null;
}

const NEW_YEAR = '01-01', XMAS = '12-25', BOXING = '12-26';
export const COUNTRIES = {
  US: [[NEW_YEAR, 'New Year’s Day'], ['3/1/01', 'Martin Luther King Jr. Day'], ['3/1/02', 'Presidents’ Day'], ['-1/1/05', 'Memorial Day'], ['06-19', 'Juneteenth'], ['07-04', 'Independence Day'], ['1/1/09', 'Labor Day'], ['2/1/10', 'Columbus Day'], ['11-11', 'Veterans Day'], ['4/4/11', 'Thanksgiving'], [XMAS, 'Christmas Day']],
  CA: [[NEW_YEAR, 'New Year’s Day'], ['E-2', 'Good Friday'], [(y) => plus(onOrAfter(y, 4, 18, 1), 0), 'Victoria Day'], ['07-01', 'Canada Day'], ['1/1/09', 'Labour Day'], ['09-30', 'Truth and Reconciliation Day'], ['2/1/10', 'Thanksgiving'], ['11-11', 'Remembrance Day'], [XMAS, 'Christmas Day'], [BOXING, 'Boxing Day']],
  GB: [[NEW_YEAR, 'New Year’s Day'], ['E-2', 'Good Friday'], ['E+1', 'Easter Monday'], ['1/1/05', 'Early May bank holiday'], ['-1/1/05', 'Spring bank holiday'], ['-1/1/08', 'Summer bank holiday'], [XMAS, 'Christmas Day'], [BOXING, 'Boxing Day']],
  IE: [[NEW_YEAR, 'New Year’s Day'], [(y) => (new Date(y, 1, 1).getDay() === 5 ? new Date(y, 1, 1) : nth(y, 1, 1, 1)), 'St Brigid’s Day'], ['03-17', 'St Patrick’s Day'], ['E+1', 'Easter Monday'], ['1/1/05', 'May bank holiday'], ['1/1/06', 'June bank holiday'], ['1/1/08', 'August bank holiday'], ['-1/1/10', 'October bank holiday'], [XMAS, 'Christmas Day'], [BOXING, 'St Stephen’s Day']],
  AU: [[NEW_YEAR, 'New Year’s Day'], ['01-26', 'Australia Day'], ['E-2', 'Good Friday'], ['E+1', 'Easter Monday'], ['04-25', 'Anzac Day'], ['2/1/06', 'King’s Birthday'], [XMAS, 'Christmas Day'], [BOXING, 'Boxing Day']],
  NZ: [[NEW_YEAR, 'New Year’s Day'], ['01-02', 'Day after New Year’s Day'], ['02-06', 'Waitangi Day'], ['E-2', 'Good Friday'], ['E+1', 'Easter Monday'], ['04-25', 'Anzac Day'], ['1/1/06', 'King’s Birthday'],
    [(y) => { const d = { 2025: '06-20', 2026: '07-10', 2027: '06-25', 2028: '07-14', 2029: '07-06', 2030: '06-21' }[y]; return d ? day(d, y) : null; }, 'Matariki'], ['4/1/10', 'Labour Day'], [XMAS, 'Christmas Day'], [BOXING, 'Boxing Day']],
  ZA: [[NEW_YEAR, 'New Year’s Day'], ['03-21', 'Human Rights Day'], ['E-2', 'Good Friday'], ['E+1', 'Family Day'], ['04-27', 'Freedom Day'], ['05-01', 'Workers’ Day'], ['06-16', 'Youth Day'], ['08-09', 'National Women’s Day'], ['09-24', 'Heritage Day'], ['12-16', 'Day of Reconciliation'], [XMAS, 'Christmas Day'], [BOXING, 'Day of Goodwill']],
  DE: [[NEW_YEAR, 'Neujahr'], ['E-2', 'Karfreitag'], ['E+0', 'Ostersonntag'], ['E+1', 'Ostermontag'], ['05-01', 'Tag der Arbeit'], ['E+39', 'Christi Himmelfahrt'], ['E+49', 'Pfingstsonntag'], ['E+50', 'Pfingstmontag'], ['10-03', 'Tag der Deutschen Einheit'], [XMAS, '1. Weihnachtstag'], [BOXING, '2. Weihnachtstag']],
  AT: [[NEW_YEAR, 'Neujahr'], ['01-06', 'Heilige Drei Könige'], ['E+0', 'Ostersonntag'], ['E+1', 'Ostermontag'], ['05-01', 'Staatsfeiertag'], ['E+39', 'Christi Himmelfahrt'], ['E+50', 'Pfingstmontag'], ['E+60', 'Fronleichnam'], ['08-15', 'Mariä Himmelfahrt'], ['10-26', 'Nationalfeiertag'], ['11-01', 'Allerheiligen'], ['12-08', 'Mariä Empfängnis'], [XMAS, 'Christtag'], [BOXING, 'Stefanitag']],
  CH: [[NEW_YEAR, 'Neujahr'], ['E-2', 'Karfreitag'], ['E+1', 'Ostermontag'], ['E+39', 'Auffahrt'], ['E+50', 'Pfingstmontag'], ['08-01', 'Bundesfeier'], [XMAS, 'Weihnachten'], [BOXING, 'Stephanstag']],
  FR: [[NEW_YEAR, 'Jour de l’an'], ['E+1', 'Lundi de Pâques'], ['05-01', 'Fête du Travail'], ['05-08', 'Victoire 1945'], ['E+39', 'Ascension'], ['E+50', 'Lundi de Pentecôte'], ['07-14', 'Fête nationale'], ['08-15', 'Assomption'], ['11-01', 'Toussaint'], ['11-11', 'Armistice 1918'], [XMAS, 'Noël']],
  BE: [[NEW_YEAR, 'Jour de l’an'], ['E+1', 'Lundi de Pâques'], ['05-01', 'Fête du Travail'], ['E+39', 'Ascension'], ['E+50', 'Lundi de Pentecôte'], ['07-21', 'Fête nationale'], ['08-15', 'Assomption'], ['11-01', 'Toussaint'], ['11-11', 'Armistice'], [XMAS, 'Noël']],
  NL: [[NEW_YEAR, 'Nieuwjaarsdag'], ['E-2', 'Goede Vrijdag'], ['E+0', 'Eerste Paasdag'], ['E+1', 'Tweede Paasdag'], [(y) => (new Date(y, 3, 27).getDay() === 0 ? new Date(y, 3, 26) : new Date(y, 3, 27)), 'Koningsdag'], ['05-05', 'Bevrijdingsdag'], ['E+39', 'Hemelvaartsdag'], ['E+49', 'Eerste Pinksterdag'], ['E+50', 'Tweede Pinksterdag'], [XMAS, 'Eerste Kerstdag'], [BOXING, 'Tweede Kerstdag']],
  ES: [[NEW_YEAR, 'Año Nuevo'], ['01-06', 'Epifanía del Señor'], ['E-2', 'Viernes Santo'], ['05-01', 'Fiesta del Trabajo'], ['08-15', 'Asunción de la Virgen'], ['10-12', 'Fiesta Nacional de España'], ['11-01', 'Todos los Santos'], ['12-06', 'Día de la Constitución'], ['12-08', 'Inmaculada Concepción'], [XMAS, 'Navidad']],
  MX: [[NEW_YEAR, 'Año Nuevo'], ['1/1/02', 'Día de la Constitución'], ['3/1/03', 'Natalicio de Benito Juárez'], ['05-01', 'Día del Trabajo'], ['09-16', 'Día de la Independencia'], ['3/1/11', 'Día de la Revolución'], [XMAS, 'Navidad']],
  PT: [[NEW_YEAR, 'Ano Novo'], ['E-2', 'Sexta-feira Santa'], ['E+0', 'Páscoa'], ['04-25', 'Dia da Liberdade'], ['05-01', 'Dia do Trabalhador'], ['E+60', 'Corpo de Deus'], ['06-10', 'Dia de Portugal'], ['08-15', 'Assunção de Nossa Senhora'], ['10-05', 'Implantação da República'], ['11-01', 'Dia de Todos os Santos'], ['12-01', 'Restauração da Independência'], ['12-08', 'Imaculada Conceição'], [XMAS, 'Natal']],
  BR: [[NEW_YEAR, 'Confraternização Universal'], ['E-48', 'Carnaval'], ['E-47', 'Carnaval'], ['E-2', 'Sexta-feira Santa'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['E+60', 'Corpus Christi'], ['09-07', 'Independência do Brasil'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Dia da Consciência Negra'], [XMAS, 'Natal']],
  IT: [[NEW_YEAR, 'Capodanno'], ['01-06', 'Epifania'], ['E+0', 'Pasqua'], ['E+1', 'Lunedì dell’Angelo'], ['04-25', 'Festa della Liberazione'], ['05-01', 'Festa dei Lavoratori'], ['06-02', 'Festa della Repubblica'], ['08-15', 'Ferragosto'], [(y) => (y >= 2026 ? new Date(y, 9, 4) : null), 'San Francesco d’Assisi'], ['11-01', 'Ognissanti'], ['12-08', 'Immacolata Concezione'], [XMAS, 'Natale'], [BOXING, 'Santo Stefano']],
  GR: [[NEW_YEAR, 'Πρωτοχρονιά'], ['01-06', 'Θεοφάνεια'], ['O-48', 'Καθαρά Δευτέρα'], ['03-25', 'Ευαγγελισμός'], ['O-2', 'Μεγάλη Παρασκευή'], ['O+0', 'Πάσχα'], ['O+1', 'Δευτέρα του Πάσχα'], ['05-01', 'Πρωτομαγιά'], ['O+50', 'Αγίου Πνεύματος'], ['08-15', 'Κοίμηση της Θεοτόκου'], ['10-28', 'Επέτειος του «Όχι»'], [XMAS, 'Χριστούγεννα'], [BOXING, 'Σύναξη της Θεοτόκου']],
  PL: [[NEW_YEAR, 'Nowy Rok'], ['01-06', 'Trzech Króli'], ['E+0', 'Wielkanoc'], ['E+1', 'Poniedziałek Wielkanocny'], ['05-01', 'Święto Pracy'], ['05-03', 'Święto Konstytucji 3 Maja'], ['E+49', 'Zielone Świątki'], ['E+60', 'Boże Ciało'], ['08-15', 'Wniebowzięcie NMP'], ['11-01', 'Wszystkich Świętych'], ['11-11', 'Święto Niepodległości'], [(y) => (y >= 2025 ? new Date(y, 11, 24) : null), 'Wigilia'], [XMAS, 'Boże Narodzenie'], [BOXING, 'Drugi dzień świąt']],
  SE: [[NEW_YEAR, 'Nyårsdagen'], ['01-06', 'Trettondedag jul'], ['E-2', 'Långfredagen'], ['E+0', 'Påskdagen'], ['E+1', 'Annandag påsk'], ['05-01', 'Första maj'], ['E+39', 'Kristi himmelsfärdsdag'], ['E+49', 'Pingstdagen'], ['06-06', 'Sveriges nationaldag'], [(y) => onOrAfter(y, 5, 19, 5), 'Midsommarafton'], [(y) => onOrAfter(y, 5, 20, 6), 'Midsommardagen'], [(y) => onOrAfter(y, 9, 31, 6), 'Alla helgons dag'], ['12-24', 'Julafton'], [XMAS, 'Juldagen'], [BOXING, 'Annandag jul'], ['12-31', 'Nyårsafton']],
};

// the holidays of one country in one year: [{ date, name }], in date order
export function holidays(country, year) {
  const rules = COUNTRIES[country]; if (!rules) return [];
  const out = [];
  for (const [rule, name] of rules) { const d = day(rule, year); if (d && d.getFullYear() === year) out.push({ date: d, name }); }
  // a fixed-date holiday on a weekend gives a day off on a weekday instead, in these countries
  const how = OBSERVED[country];
  if (how) {
    const taken = new Set(out.map((h) => h.date.toDateString()));
    for (const [rule, name] of rules) {
      if (typeof rule !== 'string' || !/^\d\d-\d\d$/.test(rule) || (how.only && !how.only.includes(rule))) continue;
      for (const y of [year - 1, year, year + 1]) { // a 31 December Saturday is observed the Friday before, a 1 January Sunday on the 2nd
        const d = day(rule, y), wd = d.getDay();
        let o = null;
        if (how.rule === 'us') o = wd === 6 ? plus(d, -1) : wd === 0 ? plus(d, 1) : null;
        else if (how.rule === 'sunday') o = wd === 0 ? plus(d, 1) : null;
        else if (wd === 6 || wd === 0) { o = plus(d, wd === 6 ? 2 : 1); while (o.getDay() === 0 || o.getDay() === 6 || taken.has(o.toDateString())) o = plus(o, 1); }
        if (o && o.getFullYear() === year && !taken.has(o.toDateString())) { taken.add(o.toDateString()); out.push({ date: o, name: `${name} (${how.label})` }); }
      }
    }
  }
  return out.sort((a, b) => a.date - b.date);
}
const OBSERVED = {
  US: { rule: 'us', label: 'observed' },
  GB: { rule: 'next', label: 'substitute day' },
  AU: { rule: 'next', label: 'substitute day', only: ['01-01', '01-26', '12-25', '12-26'] },
  NZ: { rule: 'next', label: 'observed' },
  ZA: { rule: 'sunday', label: 'observed' },
};
// the person's country, guessed from the browser's language setting (en-GB -> GB)
export function guessCountry(lang) {
  for (const l of [...(navigator.languages || []), navigator.language || '']) {
    const m = /-([A-Z]{2})$/i.exec(l); if (m && COUNTRIES[m[1].toUpperCase()]) return m[1].toUpperCase();
  }
  return { de: 'DE', fr: 'FR', es: 'ES', it: 'IT', pt: 'BR' }[lang] || '';
}
export const countryName = (code, lang) => { try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code); } catch { return code; } };
