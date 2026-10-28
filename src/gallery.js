// The template gallery: every template as a small live picture, grouped by kind, with colour schemes and
// font pairs to try before choosing. Loaded only when someone opens it.
import { t } from './i18n/index.js';
import { renderPage, fitText } from './render.js';
import { TEMPLATES, CATEGORIES, STRINGS, templateLang } from './templates/catalog.js';
import { buildTemplate } from './templates/kit.js';
import { SCHEMES, FONT_PAIRS, fontPair } from './templates/schemes.js';
import { loadDetails, hasDetails } from './templates/details.js';
import { listMine, forgetMine } from './templates/mine.js';
import { clone, uid } from './editor/model.js';
import { track } from './track.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PX = 96 / 72;

export class Gallery {
  constructor(app) {
    this.app = app; this.scheme = ''; this.fonts = ''; this.query = '';
    $('galClose').onclick = () => this.close();
    $('galSearch').oninput = (e) => { this.query = e.target.value.trim().toLowerCase(); this.filter(); };
    $('galFonts').onchange = (e) => { this.fonts = e.target.value; this.refresh(); };
    this.io = new IntersectionObserver((entries) => { for (const en of entries) if (en.isIntersecting) { this.io.unobserve(en.target); this.drawThumb(en.target); } }, { root: $('galGrid'), rootMargin: '300px' });
  }
  get lang() { return this.app.lang; }
  name(tpl) { const l = templateLang(tpl, this.lang); return STRINGS[this.lang]?.[tpl.name] ?? STRINGS[l]?.[tpl.name] ?? STRINGS.en[tpl.name] ?? tpl.id; }
  async open(cat = null) {
    $('gallery').hidden = false; document.body.classList.add('gallery-open');
    this.renderTools(); await this.renderGrid();
    if (cat) {
      $('galGrid').querySelector(`[data-sec="${cat}"]`)?.scrollIntoView({ block: 'start' });
      $('galCats').querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === cat));
      // keyboard users land on the first template of that kind (the dialog is modal)
      ($('galGrid').querySelector(`[data-sec="${cat}"] button, [data-sec="${cat}"] [tabindex]`) || $('galSearch')).focus({ preventScroll: true });
    } else $('galSearch').focus({ preventScroll: true });
  }
  close() { $('gallery').hidden = true; document.body.classList.remove('gallery-open'); }
  renderTools() {
    const sw = $('galSchemes');
    sw.innerHTML = `<button class="sch own${this.scheme ? '' : ' on'}" data-scheme="" title="${esc(t('gallery.own'))}">${esc(t('gallery.own'))}</button>` + Object.entries(SCHEMES).map(([id, c]) => `<button class="sch${this.scheme === id ? ' on' : ''}" data-scheme="${id}" title="${esc(t('scheme.' + id))}" aria-label="${esc(t('scheme.' + id))}">${c.slice(0, 3).map((x) => `<i style="background:${x}"></i>`).join('')}</button>`).join('');
    sw.querySelectorAll('[data-scheme]').forEach((b) => { b.onclick = () => { this.scheme = b.dataset.scheme; sw.querySelectorAll('.sch').forEach((x) => x.classList.toggle('on', x === b)); this.refresh(); }; });
    $('galFonts').innerHTML = `<option value="">${esc(t('gallery.ownFonts'))}</option>` + Object.keys(FONT_PAIRS).map((id) => { const p = fontPair(id); return `<option value="${id}"${this.fonts === id ? ' selected' : ''}>${esc(t('fonts.' + id))} · ${esc(p.heading)} + ${esc(p.body)}</option>`; }).join('');
  }
  async renderGrid() {
    const grid = $('galGrid'), nav = $('galCats');
    const mine = await listMine();
    const visible = TEMPLATES.filter((tp) => !tp.langs || tp.langs.includes(this.lang));
    const cats = [...(mine.length ? ['mine'] : []), ...CATEGORIES.filter((c) => visible.some((tp) => tp.cat === c))];
    nav.innerHTML = cats.map((c) => `<button data-cat="${c}">${esc(t('cat.' + c))}</button>`).join('');
    nav.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => grid.querySelector(`[data-sec="${b.dataset.cat}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    grid.innerHTML = cats.map((c) => {
      const list = c === 'mine' ? mine.map((m) => ({ mine: m })) : visible.filter((tp) => tp.cat === c);
      const maker = c === 'calendars' ? `<div class="gcard gmaker" data-name="${esc(t('cal.title').toLowerCase())}"><button class="gpick" id="galCalMaker"><span class="gmini gmaker-ico"><svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg></span><span class="gname">${esc(t('cal.title'))}</span></button></div>` : '';
      return `<section data-sec="${c}"><h3>${esc(t('cat.' + c))}</h3><div class="gcards">${maker}${list.map((x) => x.mine
        ? `<div class="gcard" data-mine="${esc(x.mine.id)}" data-name="${esc(x.mine.name.toLowerCase())}"><button class="gpick" aria-label="${esc(x.mine.name)}"><span class="gmini"></span><span class="gname">${esc(x.mine.name)}</span></button><button class="gforget" data-forget="${esc(x.mine.id)}" title="${esc(t('gallery.forget'))}" aria-label="${esc(t('gallery.forget'))}">×</button></div>`
        : `<div class="gcard" data-id="${x.id}" data-name="${esc(this.name(x).toLowerCase())}"><button class="gpick"><span class="gmini"></span><span class="gname">${esc(this.name(x))}</span></button></div>`).join('')}</div></section>`;
    }).join('');
    this.mine = new Map(mine.map((m) => [m.id, m]));
    const mk = $('galCalMaker'); if (mk) mk.onclick = () => this.app.openCalMaker({ scheme: this.scheme || undefined, fonts: this.fonts || undefined });
    grid.querySelectorAll('.gcard:not(.gmaker)').forEach((card) => {
      card.querySelector('.gpick').onclick = () => this.choose(card);
      this.io.observe(card);
    });
    grid.querySelectorAll('[data-forget]').forEach((b) => { b.onclick = async (e) => { e.stopPropagation(); await forgetMine(b.dataset.forget); this.renderGrid(); }; });
    this.filter();
  }
  filter() {
    const q = this.query;
    $('galGrid').querySelectorAll('section').forEach((sec) => {
      let any = false;
      sec.querySelectorAll('.gcard').forEach((c) => { const hit = !q || c.dataset.name.includes(q); c.hidden = !hit; any ||= hit; });
      sec.hidden = !any;
    });
  }
  // draw the pictures again with the chosen colours or fonts
  refresh() { $('galGrid').querySelectorAll('.gcard[data-id]').forEach((c) => { c.dataset.drawn = ''; this.io.unobserve(c); this.io.observe(c); }); }
  async docFor(card) {
    if (card.dataset.mine) { const m = this.mine.get(card.dataset.mine); return m ? clone(m.doc) : null; }
    const tpl = TEMPLATES.find((x) => x.id === card.dataset.id);
    return buildTemplate(tpl, { lang: templateLang(tpl, this.lang), strings: STRINGS, scheme: this.scheme || undefined, fonts: this.fonts || undefined });
  }
  async drawThumb(card) {
    const doc = await this.docFor(card); if (!doc) return;
    const pg = doc.pages[0], box = card.querySelector('.gmini');
    const k = Math.min(168 / (pg.w * PX), 210 / (pg.h * PX));
    const r = renderPage(pg, doc, {});
    r.el.style.transform = `scale(${k})`;
    box.style.width = `${pg.w * PX * k}px`; box.style.height = `${pg.h * PX * k}px`;
    box.textContent = ''; box.appendChild(r.el);
    await r.done; await document.fonts.ready;
    fitText(r.el);
  }
  async choose(card) {
    this.app.busy(true, t('busy.building'));
    try {
      let doc;
      if (card.dataset.mine) doc = await this.docFor(card);
      else {
        const tpl = TEMPLATES.find((x) => x.id === card.dataset.id);
        doc = await buildTemplate(tpl, { lang: templateLang(tpl, this.lang), strings: STRINGS, scheme: this.scheme || undefined, fonts: this.fonts || undefined, details: hasDetails() ? loadDetails() : null });
      }
      doc.uid = uid('d'); doc.notes ||= {};
      track('template', { id: card.dataset.mine ? 'my-design' : card.dataset.id });
      this.close();
      this.app.show(doc); this.app.touched();
    } finally { this.app.busy(false); }
  }
}
