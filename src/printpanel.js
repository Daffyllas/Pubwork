// The Print window and the check before printing. The sheet preview shows the real page, placed exactly
// where it will be printed, so people can see what they will get before paper comes out.
import { t } from './i18n/index.js';
import { PAPERS, LABELS, MM, labelName, layoutSheet, sheetPlan, bookletOrder, bookletPaperFor, defaultPaper, cardPaperFor, envelopeOf, posterLayout, POSTER_SIZES, isUS } from './export/layout.js';
import { checkDesign } from './check.js';
import { fontReport, embeddedFontBytes } from './fonts.js';
import { download } from './export/stage.js';
import { track } from './track.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PX = 96 / 72;
const MAX_POSTER_SHEETS = 500; // the same limit as in export/print.js
const CARDS = ['card2', 'card4'];

// the extra choices (posters, folded cards, print-shop colours) are added to the Print window here
const TILES = {
  poster: '<rect x="3" y="6" width="16" height="13" rx="1" class="sh"/><rect x="21" y="6" width="16" height="13" rx="1" class="sh"/><rect x="3" y="21" width="16" height="13" rx="1" class="sh"/><rect x="21" y="21" width="16" height="13" rx="1" class="sh"/><path d="M9 29l11-17 11 17z"/>',
  card2: '<rect x="4" y="9" width="32" height="22" rx="1" class="sh"/><rect x="6" y="11" width="13" height="18"/><rect x="21" y="11" width="13" height="18"/><path d="M20 7v26" class="ln dash"/>',
  card4: '<rect x="10" y="5" width="20" height="30" rx="1" class="sh"/><rect x="11.5" y="6.5" width="8" height="13" class="up"/><rect x="20.5" y="6.5" width="8" height="13" class="up"/><rect x="11.5" y="20.5" width="8" height="13"/><rect x="20.5" y="20.5" width="8" height="13"/><path d="M20 3v34M8 20h24" class="ln dash"/>',
};
const PANEL_CSS = `
.tile svg .dash{stroke-dasharray:2 1.5}.tile svg .up{fill:var(--panel)}
#printPanel .pshop{border-top:1px solid var(--line);padding-top:10px}
#printPanel .pshop .linkbtn{align-self:flex-start;margin-top:2px;font-size:14px}
#posterRow .plabel{min-width:auto}
.sheets{display:flex;flex-direction:column;align-items:center;gap:4px}
.sheets .cap{font:600 11px/1.2 system-ui;color:var(--muted)}
.sheet .foldline{position:absolute;border:0 dashed #888}
.sheet .ptile{position:absolute;outline:1px dashed rgba(191,78,25,.9);background:rgba(191,78,25,.07)}
.sheet .ptile span{position:absolute;left:2px;top:1px;font:700 9px/1 system-ui;color:#fff;background:var(--accent);border-radius:3px;padding:1px 3px}
`;

export class PrintPanel {
  constructor(app) {
    this.app = app; this.opts = null;
    $('bPrint').onclick = () => ($('printPanel').hidden ? this.open() : this.close());
    $('printCancel').onclick = () => this.close();
    $('printPanel').addEventListener('change', (e) => this.update(e.target));
    $('printGo').onclick = () => this.run(true);
    $('printSave').onclick = () => this.run(false);
    $('printCheckShow').onclick = () => { this.close(); this.openCheck(); };
    this.addControls();
    $('pPack').onclick = async () => { this.close(); (await import('./export/pack.js')).packAndGo(this.app); };
    $('tCheck').onclick = () => ($('checkPanel').hidden ? this.openCheck() : this.closeCheck());
    $('checkClose').onclick = () => this.closeCheck();
    $('checkAgain').onclick = () => this.openCheck();
    document.addEventListener('pointerdown', (e) => {
      if (!$('printPanel').hidden && !$('printPanel').contains(e.target) && !$('bPrint').contains(e.target) && !$('busy').contains(e.target)) this.close();
    });
  }
  // new tiles and rows, put into the Print window from here (its HTML belongs to the app page)
  addControls() {
    if ($('posterRow')) return;
    const st = document.createElement('style'); st.textContent = PANEL_CSS; document.head.appendChild(st);
    const lay = document.querySelector('#printPanel .layouts');
    for (const [id, svg] of Object.entries(TILES)) {
      lay.insertAdjacentHTML('beforeend', `<label class="tile"><input type="radio" name="lay" value="${id}"><svg viewBox="0 0 40 40" aria-hidden="true">${svg}</svg><span data-t="print.${id}">${esc(t('print.' + id))}</span></label>`);
    }
    $('paperRow').insertAdjacentHTML('afterend', `<div class="prow" id="posterRow" hidden><label for="posterSize" class="plabel" data-t="print.posterSize">${esc(t('print.posterSize'))}</label><select id="posterSize"></select><label for="posterOverlap" class="plabel" data-t="print.overlap">${esc(t('print.overlap'))}</label><select id="posterOverlap" style="flex:0 0 auto"></select></div>`);
    $('bleedRow').insertAdjacentHTML('afterend', `<fieldset class="pchecks pshop" id="shopRow"><legend data-t="print.shop">${esc(t('print.shop'))}</legend>
      <label class="check"><input type="checkbox" id="pCmyk"> <span data-t="print.cmyk">${esc(t('print.cmyk'))}</span></label>
      <label class="check"><input type="checkbox" id="pSeps"> <span data-t="print.seps">${esc(t('print.seps'))}</span></label>
      <button type="button" class="linkbtn" id="pPack" data-t="print.packLink">${esc(t('print.packLink'))}</button></fieldset>`);
  }
  get doc() { return this.app.doc; }
  get page() { return this.doc.pages[this.app.current || 0]; }

  // ---------------------------------------------------------------- the Print window
  open() {
    const app = this.app; if (!app.doc) return;
    if (app.editor.editing) app.editor.endEdit();
    app.closeSave?.(); this.closeCheck();
    const pg = this.page;
    // labels: the sheet whose labels are the size of this page, if there is one
    const match = Object.keys(LABELS).find((id) => { const l = LABELS[id], w = l.w * l.u, h = l.h * l.u; return !l.card && ((Math.abs(w - pg.w) < MM && Math.abs(h - pg.h) < MM) || (Math.abs(h - pg.w) < MM && Math.abs(w - pg.h) < MM)); });
    if (!this.opts || this.opts.doc !== app.doc.uid) {
      const small = pg.w * pg.h < (110 * MM) * (160 * MM) && !envelopeOf(pg); // business cards, tickets, postcards
      const big = pg.w * pg.h > PAPERS.a4.w * PAPERS.a4.h * 1.1; // a poster can be printed in pieces
      this.opts = { doc: app.doc.uid, layout: match ? 'labels' : small ? 'fill' : 'one', paper: 'page', label: match || (defaultPaper(pg) === 'letter' ? '5160' : 'L7160'), marks: small && !match, bleed: false, posterSize: big ? '1' : 'fit4', overlap: '10', cmyk: false, seps: false };
    }
    this.fillSelects();
    const set = (name, v) => { const r = document.querySelector(`#printPanel input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
    set('lay', this.opts.layout); set('ppages', 'all');
    $('pMarks').checked = this.opts.marks; $('pBleed').checked = this.opts.bleed; $('pSeq').checked = this.opts.sequence ?? !!app.doc.merged;
    $('posterSize').value = this.opts.posterSize; $('posterOverlap').value = this.opts.overlap;
    $('pCmyk').checked = this.opts.cmyk; $('pSeps').checked = this.opts.seps;
    $('ppagesCur').textContent = t('save.thisPage', { n: (app.current || 0) + 1 });
    this.update();
    $('printPanel').hidden = false; $('bPrint').setAttribute('aria-expanded', 'true');
    $('printGo').focus({ preventScroll: true }); $('printPanel').scrollTop = 0;
    this.precheck();
  }
  close() { $('printPanel').hidden = true; $('bPrint').setAttribute('aria-expanded', 'false'); }
  fillSelects() {
    const pg = this.page, lab = $('labelSel');
    const groups = [['print.labelsA4', (l) => l.paper === 'a4' && !l.card], ['print.labelsLetter', (l) => l.paper === 'letter' && !l.card], ['print.cards', (l) => l.card]];
    lab.innerHTML = groups.map(([key, test]) => `<optgroup label="${esc(t(key))}">${Object.keys(LABELS).filter((id) => test(labelName(id))).map((id) => { const n = labelName(id); return `<option value="${id}">${esc(`${n.maker} ${n.code} · ${t('print.perSheet', { n: n.count })} · ${n.size}`)}</option>`; }).join('')}</optgroup>`).join('');
    lab.value = this.opts.label;
    this.paperList = ['page', 'a4', 'letter', 'a3', 'a5', 'legal', 'tabloid'];
    $('paperSel').innerHTML = this.paperList.map((id) => `<option value="${id}">${esc(id === 'page' ? t('print.paperPage', { size: this.app.sizeName(pg) }) : PAPERS[id].name)}</option>`).join('');
    $('posterSize').innerHTML = POSTER_SIZES.map((v) => `<option value="${v}">${esc(v.startsWith('fit') ? t('print.posterFit', { n: v.slice(3) }) : `${Math.round(+v * 100)}%${v === '1' ? ` (${t('print.posterActual')})` : ''}`)}</option>`).join('');
    $('posterOverlap').innerHTML = [0, 5, 10, 15, 20].map((v) => `<option value="${v}">${v} mm</option>`).join('');
  }
  read() {
    const v = (name) => document.querySelector(`#printPanel input[name="${name}"]:checked`)?.value;
    const o = this.opts;
    o.layout = v('lay') || 'one';
    o.paper = $('paperSel').value || 'page';
    o.label = $('labelSel').value || o.label;
    o.marks = $('pMarks').checked; o.bleed = $('pBleed').checked; o.sequence = $('pSeq').checked;
    o.posterSize = $('posterSize').value || o.posterSize; o.overlap = $('posterOverlap').value || o.overlap;
    o.cmyk = $('pCmyk').checked; o.seps = $('pSeps').checked;
    const pages = v('ppages') === 'current' && this.doc.pages.length > 1 ? [this.app.current || 0] : null;
    return { layout: o.layout, paper: o.layout === 'labels' ? null : o.paper, label: o.label, marks: o.marks && ['one', 'n2', 'n4', 'fill'].includes(o.layout), bleed: o.bleed && o.layout === 'one' && o.paper === 'page', pages, sequence: o.sequence && ['n2', 'n4', 'fill', 'labels'].includes(o.layout) && (pages ? pages.length : this.doc.pages.length) > 1,
      poster: { size: o.posterSize, overlap: +o.overlap }, cmyk: o.cmyk, seps: o.seps };
  }
  update(changed = null) {
    const o = this.opts, pg = this.page;
    if (changed?.name === 'lay') {
      const lay = changed.value;
      // a sensible paper for each choice: the sheet itself for one page, real paper for the rest
      if (lay === 'one') $('paperSel').value = 'page';
      else if (lay === 'booklet') { const nat = bookletPaperFor(pg); $('paperSel').value = nat === 'a4' || nat === 'letter' ? nat : defaultPaper(pg); }
      else if (CARDS.includes(lay)) { const nat = cardPaperFor(pg, lay === 'card2' ? 2 : 4); $('paperSel').value = nat === 'a4' || nat === 'letter' ? nat : defaultPaper(pg); }
      else if ($('paperSel').value === 'page') $('paperSel').value = defaultPaper(pg);
      if (lay === 'fill') $('pMarks').checked = true;
    }
    if (changed?.id === 'paperSel' && changed.value === 'page' && o.layout !== 'one') document.querySelector('#printPanel input[name="lay"][value="one"]').checked = true;
    const r = this.read();
    $('paperSel').querySelector('option[value="page"]').hidden = r.layout !== 'one';
    if (r.layout !== 'one' && $('paperSel').value === 'page') { $('paperSel').value = defaultPaper(pg); r.paper = $('paperSel').value; o.paper = r.paper; }
    $('labelRow').hidden = r.layout !== 'labels';
    $('paperRow').hidden = r.layout === 'labels';
    $('marksRow').hidden = !['one', 'n2', 'n4', 'fill'].includes(r.layout);
    $('bleedRow').hidden = !(r.layout === 'one' && $('paperSel').value === 'page');
    $('printPagesRow').hidden = this.doc.pages.length < 2;
    $('seqRow').hidden = !(['n2', 'n4', 'fill', 'labels'].includes(r.layout) && this.doc.pages.length > 1);
    $('posterRow').hidden = r.layout !== 'poster';
    this.choice = r;
    this.preview(r);
  }
  preview(r) {
    const box = $('sheetPrev'), pageIdx = r.pages ? r.pages[0] : this.app.current || 0, pg = this.doc.pages[pageIdx];
    const indices = r.pages || this.doc.pages.map((_, i) => i);
    if (r.layout === 'poster') { this.previewPoster(r, pg, pageIdx, indices); return; }
    const L = layoutSheet(pg, r);
    const plan = sheetPlan(indices, r, L.count);
    const card = CARDS.includes(r.layout);
    // half-fold cards show both sides of the sheet
    const sides = r.layout === 'card2' ? plan.slice(0, 2) : [r.layout === 'booklet' || r.sequence || card ? plan[0] : null];
    const capH = sides.length > 1 ? 18 : 0;
    const k = Math.min(230 / L.sheet.w, ((box.clientHeight || 250) - sides.length * capH) / sides.length / L.sheet.h) * 0.96;
    const wrap = document.createElement('div'); wrap.className = 'sheets';
    sides.forEach((onSheet) => {
      if (capH) { const c = document.createElement('div'); c.className = 'cap'; c.textContent = t(onSheet.side === 'in' ? 'print.inside' : 'print.outside'); wrap.appendChild(c); }
      wrap.appendChild(this.sheetEl(L, onSheet, k, pageIdx, r));
    });
    box.textContent = ''; box.appendChild(wrap);
    // what will happen, in words
    const pct = Math.round((L.slots[0]?.scale || 1) * 100), smaller = pct < 99;
    const hint = [];
    const n = indices.length;
    // a card smaller than its part of the sheet: cut off the white edges after folding
    const parts = r.layout === 'card4' ? [2, 2] : L.fold === 'top' ? [1, 2] : [2, 1];
    const trim = card && L.slots[0] && (L.sheet.w / parts[0] - L.slots[0].w > 3 * MM || L.sheet.h / parts[1] - L.slots[0].h > 3 * MM);
    if (r.seps) hint.push(t('print.hintSeps'));
    else if (r.layout === 'one') {
      const env = envelopeOf(pg);
      if (r.bleed) hint.push(t('print.hintBleed'));
      else if (env && (!r.paper || r.paper === 'page')) hint.push(t('print.hintEnvelope', { size: this.app.sizeName(pg) }));
      else if (!r.paper || r.paper === 'page') hint.push(t('print.hintOne'));
      else hint.push(smaller ? t('print.hintSmaller', { pct }) : t('print.hintCentred'));
    } else if (r.sequence) {
      hint.push(t('print.hintDifferent', { n: L.count, sheets: plan.length }));
      if (smaller && r.layout !== 'labels') hint.push(t('print.hintSmaller', { pct }));
    } else if (r.layout === 'n2' || r.layout === 'n4') {
      hint.push(t('print.hintCopies', { n: L.count }));
      if (smaller) hint.push(t('print.hintSmaller', { pct }));
    } else if (r.layout === 'fill') {
      hint.push(L.count > 1 ? t('print.hintFill', { n: L.count }) : t('print.hintFillOne'));
    } else if (r.layout === 'labels') {
      hint.push(t('print.hintLabels', { n: L.count }));
      if (pct < 95) hint.push(t('print.hintLabelSize'));
    } else if (r.layout === 'booklet') {
      const sheets = plan.length / 2, blanks = Math.max(4, Math.ceil(n / 4) * 4) - n;
      hint.push(t(sheets === 1 ? 'print.hintBooklet1' : 'print.hintBooklet', { n: sheets }));
      if (blanks) hint.push(t('print.hintBlank', { n: blanks }));
      if (smaller) hint.push(t('print.hintSmaller', { pct }));
    } else if (r.layout === 'card2') {
      const cards = Math.ceil(n / 4), twoSided = plan.some((p) => p.side === 'in');
      const m = Math.min(4, n), top = L.fold === 'top';
      if (n === 1) hint.push(t('print.hintCard1'));
      else hint.push(t(m === 2 ? 'print.hintCard2Two' : m === 3 ? 'print.hintCard2Three' : top ? 'print.hintCard2Top' : 'print.hintCard2Side'));
      hint.push(t(twoSided ? (top ? 'print.hintCard2HowTop' : 'print.hintCard2HowSide') : (top ? 'print.hintCard2TopOne' : 'print.hintCard2SideOne')));
      if (twoSided) hint.push(t('print.hintOneSided'));
      if (cards > 1) hint.push(t('print.hintCards', { n: cards }));
      if (smaller) hint.push(t('print.hintSmaller', { pct }));
      else if (trim) hint.push(t('print.hintCardTrim'));
    } else if (r.layout === 'card4') {
      const cards = Math.ceil(n / 4);
      hint.push(t(L.fold === 'top' ? 'print.hintCard4Top' : 'print.hintCard4Side'));
      if (cards > 1) hint.push(t('print.hintCards', { n: cards }));
      if (smaller) hint.push(t('print.hintSmaller', { pct }));
      else if (trim) hint.push(t('print.hintCardTrim'));
    }
    if (!r.seps && (r.layout !== 'one' || r.paper !== 'page')) hint.push(t('print.hintActual'));
    if (r.cmyk) hint.push(t('print.hintCmyk'));
    $('printHint').textContent = hint.join(' ');
  }
  // one sheet of paper with the pages on it, as it will be printed
  sheetEl(L, onSheet, k, pageIdx, r) {
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    Object.assign(sheet.style, { width: `${L.sheet.w * k}px`, height: `${L.sheet.h * k}px` });
    const slots = onSheet?.side === 'in' ? L.inside : L.slots;
    slots.forEach((sl, si) => {
      const d = document.createElement('div'); d.className = 'slot';
      Object.assign(d.style, { left: `${sl.x * k}px`, top: `${sl.y * k}px`, width: `${sl.w * k}px`, height: `${sl.h * k}px` });
      const idx = onSheet ? onSheet[si] : pageIdx;
      if (idx == null) d.classList.add('blank');
      else if (si < 40) {
        const copy = this.app.pageEls[idx].cloneNode(true);
        copy.querySelectorAll('.pw-ui').forEach((n) => n.remove());
        const s = sl.scale * k / PX;
        copy.style.transform = sl.rot === 1 ? `translate(0, ${sl.h * k}px) rotate(-90deg) scale(${s})` : sl.rot === 2 ? `translate(${sl.w * k}px, ${sl.h * k}px) rotate(180deg) scale(${s})` : `scale(${s})`;
        d.appendChild(copy);
      }
      if (onSheet && idx != null) { const no = document.createElement('span'); no.className = 'no'; no.textContent = idx + 1; d.appendChild(no); }
      sheet.appendChild(d);
    });
    if (r.layout === 'booklet') { const f = document.createElement('div'); f.className = 'fold'; sheet.appendChild(f); }
    for (const [x1, y1, x2, y2] of L.folds || []) {
      const f = document.createElement('div'); f.className = 'foldline';
      Object.assign(f.style, { left: `${x1 * k}px`, top: `${y1 * k}px`, width: `${(x2 - x1) * k}px`, height: `${(y2 - y1) * k}px`, [x1 === x2 ? 'borderLeftWidth' : 'borderTopWidth']: '1px' });
      sheet.appendChild(f);
    }
    for (const [x1, y1, x2, y2] of L.marks) {
      const m = document.createElement('div'); m.className = 'mk';
      Object.assign(m.style, { left: `${Math.min(x1, x2) * k}px`, top: `${Math.min(y1, y2) * k}px`, width: `${Math.max(1, Math.abs(x2 - x1) * k)}px`, height: `${Math.max(1, Math.abs(y2 - y1) * k)}px` });
      sheet.appendChild(m);
    }
    return sheet;
  }
  // a poster: the whole page, with the sheets it is printed on drawn over it
  previewPoster(r, pg, pageIdx, indices) {
    const box = $('sheetPrev'), P = posterLayout(pg, r);
    const k = Math.min(230 / P.size.w, (box.clientHeight || 250) / P.size.h) * 0.96;
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    Object.assign(sheet.style, { width: `${P.size.w * k}px`, height: `${P.size.h * k}px` });
    const copy = this.app.pageEls[pageIdx].cloneNode(true);
    copy.querySelectorAll('.pw-ui').forEach((n) => n.remove());
    copy.style.transform = `scale(${P.scale * k / PX})`; copy.style.transformOrigin = '0 0'; copy.style.position = 'absolute'; copy.style.left = '0'; copy.style.top = '0'; copy.style.margin = '0'; copy.style.boxShadow = 'none';
    sheet.appendChild(copy);
    const label = P.tiles.length <= 40 && P.size.h * k / P.rows > 14;
    for (const T of P.tiles) {
      const d = document.createElement('div'); d.className = 'ptile';
      Object.assign(d.style, { left: `${T.x0 * k}px`, top: `${T.y0 * k}px`, width: `${T.w * k}px`, height: `${T.h * k}px` });
      if (label) { const s = document.createElement('span'); s.textContent = P.tiles.indexOf(T) + 1; d.appendChild(s); }
      sheet.appendChild(d);
    }
    box.textContent = ''; box.appendChild(sheet);
    const us = isUS(pg), size = us ? `${+(P.size.w / 72).toFixed(1)} × ${+(P.size.h / 72).toFixed(1)} in` : `${+(P.size.w / MM / 10).toFixed(1)} × ${+(P.size.h / MM / 10).toFixed(1)} cm`;
    const n = P.tiles.length * indices.length;
    const vars = { n, cols: P.cols, rows: P.rows, size, pct: Math.round(P.scale * 100), pages: indices.length };
    const hint = [t(indices.length > 1 ? 'print.hintPosterPages' : n === 1 ? 'print.hintPoster1' : 'print.hintPoster', vars)];
    if (n > MAX_POSTER_SHEETS) hint.push(t('print.hintPosterTooMany', { max: MAX_POSTER_SHEETS }));
    else if (n > 1) hint.push(t('print.hintPosterHow'));
    hint.push(t('print.hintActual'));
    if (r.cmyk) hint.push(t('print.hintCmyk'));
    $('printHint').textContent = hint.join(' ');
  }
  async precheck() {
    const line = $('printCheck');
    const issues = await this.check();
    const warn = issues.filter((i) => i.level === 'warn').length;
    line.hidden = false; line.classList.toggle('ok', !warn);
    line.querySelector('span').textContent = warn ? `⚠ ${t(warn === 1 ? 'check.count1' : 'check.count', { n: warn })}` : `✓ ${t('check.allGood')}`;
    $('printCheckShow').hidden = !issues.length;
  }
  async check() {
    const app = this.app;
    await app.settled;
    const fonts = await fontReport(app.doc, app.embedded).catch(() => []);
    return checkDesign(app.doc, app.pageEls, { fonts, bleed: !!this.opts?.bleed && this.opts.layout === 'one' });
  }
  async run(print) {
    const app = this.app, o = this.choice || this.read();
    if (app.saving) return;
    if (o.layout === 'poster' && !o.seps) {
      const n = posterLayout(this.doc.pages[o.pages ? o.pages[0] : 0], o).tiles.length * (o.pages || this.doc.pages).length;
      if (n > MAX_POSTER_SHEETS) { app.toast(t('print.hintPosterTooMany', { max: MAX_POSTER_SHEETS }), 8000); return; }
    }
    this.close();
    app.saving = true;
    const progress = (k, total) => app.busy(true, k >= total ? t('busy.finishing') : t('busy.page', { n: k + 1, total }));
    progress(0, (o.pages || app.pageEls).length);
    try {
      await app.settled;
      const { makePrintPdf, printPdf } = await import('./export/print.js');
      const out = o.seps
        ? await (await import('./export/separations.js')).makeSeparations(app.doc, app.pageEls, o, { embeddedFonts: embeddedFontBytes, onProgress: progress })
        : await makePrintPdf(app.doc, app.pageEls, o, { embeddedFonts: embeddedFontBytes, onProgress: progress });
      window.__lastPrint = out;
      app.busy(false);
      track(print ? 'print' : 'print-pdf', { layout: o.seps ? 'separations' : o.layout, paper: o.paper || 'same', cmyk: o.cmyk ? 1 : 0 });
      if (print && !window.claude?.use) {
        const how = await printPdf(out.blob);
        if (how === 'printing') return;
        if (how === 'opened') { app.toast(t('print.opened'), 8000); return; }
      }
      const how = await download(out.blob, out.name);
      if (how === 'saved') app.toast(print ? t('print.savedToPrint', { name: out.name }) : t('save.done', { name: out.name }), 8000);
      else if (how === 'blocked') app.toast(t('save.blocked'), 9000);
    } catch (err) {
      console.error(err);
      app.toast(t('err.save', { why: err?.message || String(err) }), 9000);
    } finally { app.saving = false; app.busy(false); }
  }

  // ---------------------------------------------------------------- the check
  async openCheck() {
    const app = this.app; if (!app.doc) return;
    if (app.editor.editing) app.editor.endEdit();
    const issues = await this.check();
    const list = $('checkList');
    if (!issues.length) list.innerHTML = `<div class="allgood"><span>✓</span><span>${esc(t('check.allGood'))}</span></div>`;
    else {
      const byPage = new Map();
      for (const i of issues) { const k = i.page == null ? -1 : i.page; if (!byPage.has(k)) byPage.set(k, []); byPage.get(k).push(i); }
      const many = app.doc.pages.length > 1 || byPage.has(-1);
      list.innerHTML = [...byPage.keys()].sort((a, b) => (a === -1 ? 1 : b === -1 ? -1 : a - b)).map((pk) => {
        const head = many ? `<h3>${esc(pk === -1 ? t('check.doc') : t('thumb.page', { n: pk + 1 }))}</h3>` : '';
        return head + byPage.get(pk).map((i, n) => `<button class="issue" data-page="${i.page ?? ''}" data-unit="${esc(i.unit || '')}"><span class="ic" aria-hidden="true">${i.level === 'warn' ? '⚠' : 'ℹ'}</span><span class="tx">${esc(t(i.key, i.vars))}</span><small>${esc(t(i.key + 'Why', i.vars))}</small></button>`).join('');
      }).join('');
      list.querySelectorAll('.issue').forEach((b) => b.addEventListener('click', () => this.goTo(b.dataset.page === '' ? null : +b.dataset.page, b.dataset.unit)));
    }
    $('checkPanel').hidden = false; $('tCheck').setAttribute('aria-expanded', 'true');
  }
  closeCheck() { $('checkPanel').hidden = true; $('tCheck')?.setAttribute('aria-expanded', 'false'); }
  goTo(page, unit) {
    const app = this.app; if (page == null) return;
    app.current = page;
    if (unit) {
      app.editor.select([unit], page);
      const el = app.pageEls[page].querySelector(`[data-id="${CSS.escape(unit)}"], [data-group="${CSS.escape(unit)}"]`);
      (el || app.pageEls[page]).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else app.pageEls[page].scrollIntoView({ behavior: 'smooth', block: 'start' });
    app.renderThumbs();
    if (innerWidth < 900) this.closeCheck();
  }
}
export { bookletOrder };
