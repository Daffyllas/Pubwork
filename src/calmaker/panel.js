// The calendar maker window: pick the kind, the months, the country's holidays and your own dates,
// photos and colours, see the first page, and make it.
import { t } from '../i18n/index.js';
import { renderPage, fitText } from '../render.js';
import { SCHEMES, FONT_PAIRS, fontPair } from '../templates/schemes.js';
import { monthName, weekStartsSunday, calendarYear } from '../templates/calendar.js';
import { coverCrop } from '../merge/catalogue.js';
import { COUNTRIES, guessCountry, countryName } from './holidays.js';
import { buildCalendar, LAYOUTS } from './build.js';
import { uid } from '../editor/model.js';
import { paperFor } from '../templates/kit.js';
import { track } from '../track.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PX = 96 / 72;
const DATES_KEY = 'pw-caldates';
const loadDates = () => { try { const v = JSON.parse(localStorage.getItem(DATES_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveDates = (v) => { try { localStorage.setItem(DATES_KEY, JSON.stringify(v)); } catch { /* private window: they stay for this visit */ } };

export class CalMaker {
  constructor(app) {
    this.app = app;
    this.o = null; this.photos = []; this.files = [];
    $('calClose').onclick = () => this.close();
    $('calMake').onclick = () => this.make();
    $('calPhotoFiles').onchange = async (e) => { this.files = [...e.target.files]; e.target.value = ''; this.photos = []; this.render(); this.preview(); };
  }
  get lang() { return this.app.lang; }
  open({ scheme, fonts } = {}) {
    const lang = this.lang;
    this.o ||= { layout: 'photo', year: calendarYear(), start: new Date().getMonth() >= 9 ? 0 : new Date().getMonth(), months: 12, sundayFirst: weekStartsSunday(lang), country: guessCountry(lang), scheme: 'seaside', fonts: 'modern' };
    if (this.o.year === calendarYear() && new Date().getMonth() >= 9) this.o.start = 0;
    if (scheme) this.o.scheme = scheme; if (fonts) this.o.fonts = fonts;
    this.dates = loadDates();
    this.render();
    $('calPanel').hidden = false; $('calPanel').scrollTop = 0;
    this.preview();
  }
  close() { $('calPanel').hidden = true; }
  render() {
    const o = this.o, lang = this.lang, nowY = new Date().getFullYear();
    const countries = Object.keys(COUNTRIES).map((c) => [c, countryName(c, lang)]).sort((a, b) => a[1].localeCompare(b[1], lang));
    const field = (label, html, cls = '') => `<label${cls ? ` class="${cls}"` : ''}>${esc(label)}${html}</label>`;
    $('calBody').innerHTML = `
      <div class="cal-kinds">${LAYOUTS.map((l) => `<label class="choice"><input type="radio" name="calLayout" value="${l}"${o.layout === l ? ' checked' : ''}><span class="t">${esc(t('cal.kind.' + l))}</span><span class="d">${esc(t('cal.kind.' + l + 'Hint'))}</span></label>`).join('')}</div>
      <div class="pgrid">
        ${field(t('cal.year'), `<select id="calYear">${[nowY - 1, nowY, nowY + 1, nowY + 2, nowY + 3].map((y) => `<option${y === o.year ? ' selected' : ''}>${y}</option>`).join('')}</select>`)}
        ${field(t('cal.start'), `<select id="calStart">${Array.from({ length: 12 }, (_, m) => `<option value="${m}"${m === o.start ? ' selected' : ''}>${esc(monthName(lang, 2024, m))}</option>`).join('')}</select>`)}
        ${o.layout === 'year' ? '' : field(t('cal.months'), `<select id="calMonths">${[1, 2, 3, 4, 6, 12, 13, 18, 24].map((n) => `<option${n === o.months ? ' selected' : ''}>${n}</option>`).join('')}</select>`)}
        ${field(t('cal.weekStart'), `<select id="calWeek"><option value="mon"${o.sundayFirst ? '' : ' selected'}>${esc(t('cal.monday'))}</option><option value="sun"${o.sundayFirst ? ' selected' : ''}>${esc(t('cal.sunday'))}</option></select>`)}
        ${field(t('cal.holidays'), `<select id="calCountry"><option value="">${esc(t('cal.noHolidays'))}</option>${countries.map(([c, n]) => `<option value="${c}"${c === o.country ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`, 'wide')}
      </div>
      <div><h3 class="mstep">${esc(t('cal.dates'))}</h3><p class="hint">${esc(t('cal.datesHint'))}</p>
        <div id="calDates" class="cal-dates">${this.dates.map((d, i) => `<div class="cal-date"><input type="date" data-i="${i}" data-k="date" value="${esc(d.date)}" aria-label="${esc(t('cal.date'))}"><input data-i="${i}" data-k="text" value="${esc(d.text)}" placeholder="${esc(t('cal.datePlaceholder'))}" aria-label="${esc(t('cal.dateText'))}"><button class="pbtn" data-del="${i}" aria-label="${esc(t('cal.remove'))}" title="${esc(t('cal.remove'))}">×</button></div>`).join('')}</div>
        <div class="prow"><button class="btn" id="calAddDate">${esc(t('cal.addDate'))}</button></div></div>
      ${o.layout === 'photo' ? `<div class="prow"><button class="btn" id="calPhotos">${esc(t('cal.photos'))}</button><span class="hint">${esc(this.files.length ? t('cal.photoCount', { n: this.files.length }) : t('cal.photoHint'))}</span></div>` : ''}
      <div><h3 class="mstep">${esc(t('gallery.colours'))}</h3><div class="ds-schemes">${Object.entries(SCHEMES).map(([id, c]) => `<button class="sch${o.scheme === id ? ' on' : ''}" data-cal-scheme="${id}" title="${esc(t('scheme.' + id))}" aria-label="${esc(t('scheme.' + id))}">${c.slice(0, 3).map((x) => `<i style="background:${x}"></i>`).join('')}</button>`).join('')}</div>
        <div class="prow"><select id="calFonts" aria-label="${esc(t('gallery.fonts'))}">${Object.keys(FONT_PAIRS).map((id) => { const p = fontPair(id); return `<option value="${id}"${o.fonts === id ? ' selected' : ''}>${esc(t('fonts.' + id))} · ${esc(p.heading)} + ${esc(p.body)}</option>`; }).join('')}</select></div></div>`;
    const body = $('calBody');
    body.querySelectorAll('[name=calLayout]').forEach((r) => { r.onchange = () => { o.layout = r.value; this.render(); this.preview(); }; });
    const num = (id, key, f = Number) => { const el = $(id); if (el) el.onchange = () => { o[key] = f(el.value); this.preview(); }; };
    num('calYear', 'year'); num('calStart', 'start'); num('calMonths', 'months');
    num('calWeek', 'sundayFirst', (v) => v === 'sun'); num('calCountry', 'country', String); num('calFonts', 'fonts', String);
    body.querySelectorAll('[data-cal-scheme]').forEach((b) => { b.onclick = () => { o.scheme = b.dataset.calScheme; body.querySelectorAll('[data-cal-scheme]').forEach((x) => x.classList.toggle('on', x === b)); this.preview(); }; });
    body.querySelectorAll('#calDates input').forEach((inp) => { inp.onchange = () => { this.dates[+inp.dataset.i][inp.dataset.k] = inp.value; saveDates(this.dates); this.preview(); }; });
    body.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { this.dates.splice(+b.dataset.del, 1); saveDates(this.dates); this.render(); this.preview(); }; });
    $('calAddDate').onclick = () => { this.dates.push({ date: '', text: '' }); this.render(); body.querySelector('#calDates .cal-date:last-child input')?.focus(); };
    const ph = $('calPhotos'); if (ph) ph.onclick = () => $('calPhotoFiles').click();
  }
  events() {
    return this.dates.filter((d) => d.date && d.text.trim()).map((d) => { const [, m, day] = d.date.split('-').map(Number); return { m: m - 1, d: day, text: d.text.trim() }; });
  }
  async photosFor(layout) {
    if (layout !== 'photo' || !this.files.length) return [];
    if (this.photos.length !== this.files.length) {
      const p = paperFor('paper'), ratio = p.w / (p.h * 0.52);
      this.photos = [];
      for (const f of this.files) { try { this.photos.push(await coverCrop(f, ratio)); } catch { /* not a picture */ } }
    }
    return this.photos;
  }
  async build(previewOnly) {
    const o = this.o;
    return buildCalendar({ ...o, months: previewOnly ? 1 : o.months, events: this.events(), photos: await this.photosFor(o.layout), lang: this.lang, name: t('cal.docName') });
  }
  async preview() {
    const n = (this.n = (this.n || 0) + 1);
    const doc = await this.build(true); if (n !== this.n) return;
    const pg = doc.pages[0], box = $('calPreview');
    const k = Math.min(230 / (pg.w * PX), 300 / (pg.h * PX));
    const r = renderPage(pg, doc, {});
    r.el.style.transform = `scale(${k})`; r.el.style.transformOrigin = '0 0';
    box.style.width = `${pg.w * PX * k}px`; box.style.height = `${pg.h * PX * k}px`;
    box.textContent = ''; box.appendChild(r.el);
    await r.done; await document.fonts.ready; fitText(r.el);
  }
  async make() {
    this.app.busy(true, t('busy.building'));
    try {
      const doc = await this.build(false);
      doc.uid = uid('d');
      this.close(); this.app.gallery?.close();
      this.app.show(doc); this.app.touched(); track('calendar');
    } catch (err) { console.error(err); this.app.toast(t('err.sample')); } finally { this.app.busy(false); }
  }
}
