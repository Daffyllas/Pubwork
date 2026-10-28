// The mail merge window: choose a list, choose who gets a copy, put «fields» (and photos) in, look through
// the records, make all pages or one e-mail per person.
import { t } from '../i18n/index.js';
import { download } from '../export/stage.js';
import { readList, parseDelimited } from './data.js';
import { fieldsIn, fieldText, mergedDocument, chosenIndexes, chosenRows, orderedRows, passes, FILTER_OPS, photoFrames, setPhotoFiles, photoFile, photoCount, preparePhotos, growMerged } from './merge.js';
import { renderPage } from '../render.js';
import { buildCatalogue, coverCrop } from './catalogue.js';
import { guessEmailColumn, isEmail, makeEmails } from './email.js';
import './merge.css';
import { track } from '../track.js';

const GUESS = {
  name: /^(name|product|item|title|dish|nombre|producto|art[ií]culo|produkt|artikel|bezeichnung|nom|produit|article|nome|prodotto|articolo|piatto)$/i,
  price: /^(price|cost|precio|preis|prix|prezzo|pre[çc]o|valor|euro|€|\$)$/i,
  desc: /^(desc|description|details|descripci[oó]n|beschreibung|descrizione|descri[çc][aã]o|info)$/i,
  section: /^(section|category|group|type|secci[oó]n|categor[ií]a|kategorie|gruppe|cat[ée]gorie|rubrique|categoria|sezione|se[çc][aã]o)$/i,
  photo: /^(photo|picture|image|img|file|foto|imagen|bild|immagine|imagem|photo file|picture file)$/i,
};
const PIC_FILE = /\.(jpe?g|png|gif|webp|bmp|heic|tiff?)$/i;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const options = (cols, sel, none) => `${none != null ? `<option value="">${esc(none)}</option>` : ''}${cols.map((c) => `<option value="${esc(c)}"${c === sel ? ' selected' : ''}>${esc(c)}</option>`).join('')}`;

export class MergePanel {
  constructor(app) {
    this.app = app; this.pasting = false; this.cat = null; this.photos = []; this.parts = {};
    $('tMerge').onclick = () => ($('mergePanel').hidden ? this.open() : this.close());
    $('mergeClose').onclick = () => this.close();
    $('listFile').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await this.load(() => readList(f)); };
    $('photoFiles').onchange = (e) => { this.photos = [...e.target.files]; e.target.value = ''; this.photosChosen(); };
  }
  get doc() { return this.app.doc; }
  open() { if (!this.doc) return; this.app.closeOverlays?.('merge'); this.render(); $('mergePanel').hidden = false; $('tMerge').setAttribute('aria-expanded', 'true'); }
  close() { $('mergePanel').hidden = true; $('tMerge')?.setAttribute('aria-expanded', 'false'); this.app.setMergePreview(null); }
  async load(fn) {
    try {
      const data = await fn();
      this.app.setMergePreview(null);
      this.app.editor.change('list', () => { this.doc.mergeData = { name: data.name, columns: data.columns, rows: data.rows }; }, []);
      this.pasting = false; this.render();
      this.app.toast(t('merge.loaded', { n: data.rows.length, name: data.name }), 4000);
    } catch (err) {
      console.error(err);
      this.app.toast(t(err.code === 'xls' ? 'merge.errXls' : err.code === 'empty' ? 'merge.errEmpty' : 'merge.errList'), 8000);
    }
  }
  sample() {
    const cols = t('merge.sampleCols').split('|');
    const rows = ['Anna|Rossi|Via Roma 12|Milano', 'Jonas|Weber|Lindenstraße 4|Berlin', 'Lucía|García|Calle Mayor 8|Madrid', 'Marie|Dubois|12 rue de la Paix|Lyon', 'João|Silva|Rua das Flores 21|Porto', 'Emma|Smith|5 Church Street|York'];
    return { name: t('merge.sampleName'), columns: cols, rows: rows.map((r) => Object.fromEntries(r.split('|').map((v, i) => [cols[i], v]))) };
  }

  // ---------------------------------------------------------------- drawing the window
  render() {
    const d = this.doc?.mergeData, box = $('mergeBody');
    if (d && this.cat) { box.innerHTML = this.catalogueHtml(d); this.wireCatalogue(d); return; }
    // keep the place in the list and the box being typed in when the window is drawn again
    const scroll = $('mergeRows')?.scrollTop || 0, focus = document.activeElement?.closest?.('#mergeBody') ? document.activeElement : null;
    const fid = focus?.id, caret = focus && 'selectionStart' in focus ? [focus.selectionStart, focus.selectionEnd] : null;
    let html = `<p class="hint">${esc(t('merge.intro'))}</p><h3 class="mstep"><b>1</b>${esc(t('merge.step1'))}</h3>`;
    if (this.pasting) {
      html += `<textarea id="mergePaste" class="mpaste" placeholder="${esc(t('merge.pasteHint'))}"></textarea><div class="prow"><button class="btn primary" id="mergeUsePaste">${esc(t('merge.usePaste'))}</button><button class="btn" id="mergeCancelPaste">${esc(t('save.cancel'))}</button></div>`;
    } else if (!d) {
      html += `<div class="prow wrap"><button class="btn primary" id="mergeChoose">${esc(t('merge.choose'))}</button><button class="btn" id="mergePasteBtn">${esc(t('merge.paste'))}</button><button class="btn" id="mergeSample">${esc(t('merge.sample'))}</button></div><p class="hint">${esc(t('merge.formats'))}</p>`;
    } else {
      html += `<p class="mlist"><b>${esc(d.name)}</b> · ${esc(t('merge.size', { n: d.rows.length, c: d.columns.length }))} <button class="linkbtn" id="mergeChange">${esc(t('merge.change'))}</button></p>`;
      html += this.recordsHtml(d);
      html += `<h3 class="mstep"><b>3</b>${esc(t('merge.step2'))}</h3><div class="chips" id="mergeFields">${d.columns.map((c) => `<button data-field="${esc(c)}">${esc(fieldText(c))}</button>`).join('')}</div><p class="hint">${esc(t('merge.fieldHint'))}</p>`;
      html += this.part('photo', t('mphoto.title'), this.photoHtml(d));
      const used = fieldsIn(this.doc), chosen = chosenIndexes(d), i = this.app.mergePreview;
      html += `<h3 class="mstep"><b>4</b>${esc(t('merge.step3'))}</h3>`;
      if (!used.length) html += `<p class="hint">${esc(t('merge.noFields'))}</p>`;
      else if (!chosen.length) html += `<p class="checkline">⚠ ${esc(t('mpick.none'))}</p>`;
      else {
        const pos = chosen.indexOf(i);
        html += `<div class="prow"><label class="check"><input type="checkbox" id="mergeShow"${i != null ? ' checked' : ''}> ${esc(t('merge.show'))}</label></div>
          <div class="prow mnav"><button class="pbtn" id="mergePrev" aria-label="${esc(t('merge.prev'))}"${i == null ? ' disabled' : ''}>‹</button><span>${i == null || pos < 0 ? '–' : esc(t('merge.of', { i: pos + 1, n: chosen.length }))}</span><button class="pbtn" id="mergeNext" aria-label="${esc(t('merge.next'))}"${i == null ? ' disabled' : ''}>›</button></div>`;
        const unknown = used.filter((f) => !d.columns.includes(f));
        if (unknown.length) html += `<p class="checkline">⚠ ${esc(t('merge.unknown', { fields: unknown.map(fieldText).join(', ') }))}</p>`;
        html += `<h3 class="mstep"><b>5</b>${esc(t('merge.step4'))}</h3><div class="prow"><button class="btn primary" id="mergeMake">${esc(t('merge.make', { n: chosenRows(d, used).length }))}</button></div><p class="hint">${esc(t('merge.makeHint'))}</p>`;
        html += this.part('mail', t('mail.title'), this.mailHtml(d, used));
      }
      html += `<div class="divider"><span>${esc(t('catm.or'))}</span></div><div class="prow"><button class="btn" id="catOpen">${esc(t('catm.open'))}</button></div><p class="hint">${esc(t('catm.intro'))}</p>`;
    }
    box.innerHTML = html;
    if ($('mergeRows')) $('mergeRows').scrollTop = scroll;
    if (fid && $(fid)) { const e = $(fid); e.focus(); if (caret) try { e.setSelectionRange(...caret); } catch { /* not a text box */ } }
    this.wire();
  }
  // an optional part that folds open and shut
  part(key, title, inner) { return `<details class="mpart" data-part="${key}"${this.parts[key] ? ' open' : ''}><summary>${esc(title)}</summary><div class="mpart-in">${inner}</div></details>`; }

  // step 2: tick the people who get a copy, filter and sort them
  recordsHtml(d) {
    const f = d.filter || {}, s = d.sort || {}, skip = new Set(d.skip || []), chosen = chosenIndexes(d).length, cur = this.app.mergePreview;
    const needsValue = f.op !== 'empty' && f.op !== 'full';
    let html = `<h3 class="mstep"><b>2</b>${esc(t('mpick.step'))}</h3>`;
    html += `<div class="mfilter"><span>${esc(t('mpick.only'))}</span><select id="mFilterCol" aria-label="${esc(t('mpick.column'))}">${options(d.columns, f.col, t('mpick.everyone'))}</select>`;
    if (f.col) {
      html += `<select id="mFilterOp" aria-label="${esc(t('mpick.how'))}">${FILTER_OPS.map((o) => `<option value="${o}"${(f.op || 'is') === o ? ' selected' : ''}>${esc(t('mpick.op.' + o))}</option>`).join('')}</select>`;
      if (needsValue) html += `<input id="mFilterVal" value="${esc(f.val || '')}" placeholder="${esc(t('mpick.value'))}" aria-label="${esc(t('mpick.value'))}" list="mFilterVals"><datalist id="mFilterVals">${[...new Set(d.rows.map((r) => String(r[f.col] ?? '').trim()).filter(Boolean))].slice(0, 200).map((v) => `<option value="${esc(v)}">`).join('')}</datalist>`;
    }
    html += `</div><div class="mfilter"><span>${esc(t('mpick.sort'))}</span><select id="mSortCol" aria-label="${esc(t('mpick.column'))}">${options(d.columns, s.col, t('mpick.asIs'))}</select>`;
    if (s.col) html += `<select id="mSortDir" aria-label="${esc(t('mpick.order'))}"><option value="up"${s.dir !== 'down' ? ' selected' : ''}>${esc(t('mpick.up'))}</option><option value="down"${s.dir === 'down' ? ' selected' : ''}>${esc(t('mpick.down'))}</option></select>`;
    html += `</div><div class="mtable mrecords" id="mergeRows"><table><tr><th class="mtick"><span class="sr">${esc(t('mpick.use'))}</span></th><th class="mnum">#</th>${d.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
    for (const i of orderedRows(d)) {
      const r = d.rows[i], out = !passes(r, d.filter);
      html += `<tr data-row="${i}" class="${out ? 'out' : ''}${i === cur ? ' cur' : ''}"${out ? ` title="${esc(t('mpick.filtered'))}"` : ''}><td class="mtick"><input type="checkbox" data-tick="${i}"${!skip.has(i) && !out ? ' checked' : ''}${out ? ' disabled' : ''} aria-label="${esc(t('mpick.useRow', { n: i + 1 }))}"></td><td class="mnum">${i + 1}</td>${d.columns.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`;
    }
    html += `</table></div><div class="prow mticks"><button class="btn" id="mTickAll">${esc(t('mpick.all'))}</button><button class="btn" id="mTickNone">${esc(t('mpick.noneBtn'))}</button><span class="mcount">${esc(t('mpick.count', { n: chosen, total: d.rows.length }))}</span></div><p class="hint">${esc(t('mpick.hint'))}</p>`;
    return html;
  }

  // a photo on each copy: which frames take one, from which column, and the photo files
  photoHtml(d) {
    const frames = [...photoFrames(this.doc.pages)], col = this.photoCol || this.guessPhotoColumn(d);
    let html = `<p class="hint">${esc(t('mphoto.intro'))}</p><ol class="msteps"><li>${esc(t('mphoto.s1'))}</li><li>${esc(t('mphoto.s2'))}</li></ol>`;
    html += `<div class="prow"><select id="mPhotoCol" aria-label="${esc(t('mphoto.column'))}">${options(d.columns, col)}</select><button class="btn" id="mPhotoUse">${esc(t('mphoto.use'))}</button></div>`;
    if (frames.length) {
      html += `<ul class="mframes">${frames.map((f, k) => `<li>${esc(t('mphoto.frame', { page: f.page + 1, col: fieldText(f.it.mergePhoto) }))} <button class="linkbtn" data-unphoto="${k}">${esc(t('mphoto.stop'))}</button></li>`).join('')}</ul>`;
      html += `<div class="prow"><button class="btn${photoCount() ? '' : ' primary'}" id="mPhotoPick">${esc(t('mphoto.pick'))}</button><span class="hint">${esc(photoCount() ? t('catm.photoCount', { n: photoCount() }) : t('mphoto.noneYet'))}</span></div>`;
      if (photoCount()) {
        const idx = chosenIndexes(d), rows = idx.map((i) => d.rows[i]), cols = [...new Set(frames.map((f) => f.it.mergePhoto))];
        const lacking = idx.filter((i) => cols.some((c) => !photoFile(d.rows[i][c])));
        // name each row by its photo name, or else by the first thing written in it (a name), or its row number
        const label = (i) => { const r = d.rows[i]; const v = cols.map((c) => String(r[c] ?? '').trim()).find(Boolean) || d.columns.map((c) => String(r[c] ?? '').trim()).find(Boolean); return v ? (v.length > 30 ? v.slice(0, 29) + '…' : v) : `#${i + 1}`; };
        html += `<p class="checkline${lacking.length ? '' : ' ok'}">${esc(t('mphoto.found', { n: rows.length - lacking.length, total: rows.length }))}${lacking.length ? `<br>${esc(t('mphoto.missing', { list: lacking.slice(0, 6).map(label).join(' · ') + (lacking.length > 6 ? ' …' : '') }))}` : ''}</p>`;
      }
    }
    html += `<p class="hint">${esc(t('mphoto.how'))}</p>`;
    return html;
  }
  guessPhotoColumn(d) {
    return d.columns.find((c) => GUESS.photo.test(c.trim())) || d.columns.find((c) => d.rows.some((r) => PIC_FILE.test(String(r[c] ?? '').trim()))) || d.columns[0];
  }

  // one e-mail per person
  mailHtml(d, used) {
    const m = this.mailSettings(d), rows = chosenRows(d, used), ok = m.col ? rows.filter((r) => isEmail(r[m.col])).length : 0;
    let html = `<p class="hint">${esc(t('mail.intro'))}</p>
      <div class="pgrid"><label class="wide">${esc(t('mail.column'))}<select id="mMailCol">${options(d.columns, m.col, t('mail.noColumn'))}</select></label>
      <label class="wide">${esc(t('mail.subject'))}<input id="mMailSubject" value="${esc(m.subject)}"></label></div>
      <div class="chips mini" id="mMailFields">${d.columns.map((c) => `<button data-sfield="${esc(c)}">${esc(fieldText(c))}</button>`).join('')}</div><p class="hint">${esc(t('mail.subjectHint'))}</p>`;
    if (!m.col) html += `<p class="checkline">⚠ ${esc(t('mail.needColumn'))}</p>`;
    else {
      if (ok < rows.length) html += `<p class="checkline">${esc(t('mail.someMissing', { n: rows.length - ok }))}</p>`;
      html += `<div class="prow"><button class="btn primary" id="mMailMake"${ok ? '' : ' disabled'}>${esc(t('mail.make', { n: ok }))}</button></div>`;
    }
    html += `<div class="mhow"><b>${esc(t('mail.howTitle'))}</b><ol>${['how1', 'how2', 'how3', 'how4'].map((k) => `<li>${esc(t('mail.' + k))}</li>`).join('')}</ol><p class="hint">${esc(t('mail.how5'))}</p></div>`;
    return html;
  }
  mailSettings(d) {
    if (!d.mail) d.mail = { col: guessEmailColumn(d), subject: this.doc.name && this.doc.name !== t('new.untitled') ? this.doc.name : '' };
    if (d.mail.col && !d.columns.includes(d.mail.col)) d.mail.col = '';
    return d.mail;
  }

  // ---------------------------------------------------------------- what the buttons do
  wire() {
    const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
    on('mergeChoose', () => $('listFile').click());
    on('mergePasteBtn', () => { this.pasting = true; this.render(); $('mergePaste').focus(); });
    on('mergeCancelPaste', () => { this.pasting = false; this.render(); });
    on('mergeUsePaste', () => { const text = $('mergePaste').value; this.load(async () => { const r = parseDelimited(text); if (!r.rows.length) throw Object.assign(new Error('empty'), { code: 'empty' }); return { ...r, name: t('merge.pastedName') }; }); });
    on('mergeSample', () => this.load(async () => this.sample()));
    on('mergeChange', () => { this.app.setMergePreview(null); this.app.editor.change('list', () => { delete this.doc.mergeData; }, []); this.render(); });
    $('mergeFields')?.querySelectorAll('[data-field]').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault()); // keep the caret where it is
      b.onclick = () => this.insertField(b.dataset.field);
    });
    $('mergeBody').querySelectorAll('details[data-part]').forEach((x) => { x.ontoggle = () => { this.parts[x.dataset.part] = x.open; }; });
    const show = $('mergeShow'); if (show) show.onchange = () => { if (show.checked) this.preview(chosenIndexes(this.doc.mergeData)[0]); else { this.app.setMergePreview(null); this.render(); } };
    on('mergePrev', () => this.step(-1)); on('mergeNext', () => this.step(1));
    on('mergeMake', () => this.make());
    on('catOpen', () => { const d = this.doc.mergeData; this.cat = { map: Object.fromEntries(Object.keys(GUESS).map((k) => [k, d.columns.find((c) => GUESS[k].test(c.trim())) || ''])), layout: 'list', title: !this.doc.name || this.doc.name === t('new.untitled') ? t('catm.docName') : this.doc.name }; if (!this.cat.map.name) this.cat.map.name = d.columns[0]; this.render(); });
    if (this.doc?.mergeData && !this.cat) { this.wireRecords(); this.wirePhotos(); this.wireMail(); }
  }
  // a change to who gets a copy: saved with the document, the preview follows
  pick(fn) {
    const d = this.doc.mergeData; fn(d);
    this.app.touched?.();
    const chosen = chosenIndexes(d), cur = this.app.mergePreview;
    if (cur != null && !chosen.includes(cur)) { if (chosen.length) { this.preview(chosen[0]); return; } this.app.setMergePreview(null); }
    this.render();
  }
  wireRecords() {
    const d = this.doc.mergeData, body = $('mergeBody');
    const set = (id, fn) => { const e = $(id); if (e) e.onchange = () => this.pick((dd) => fn(dd, e.value)); };
    set('mFilterCol', (dd, v) => { dd.filter = v ? { col: v, op: dd.filter?.op || 'is', val: dd.filter?.val || '' } : null; });
    set('mFilterOp', (dd, v) => { dd.filter.op = v; });
    const val = $('mFilterVal'); if (val) val.oninput = () => this.pick((dd) => { dd.filter.val = val.value; });
    set('mSortCol', (dd, v) => { dd.sort = v ? { col: v, dir: dd.sort?.dir || 'up' } : null; });
    set('mSortDir', (dd, v) => { dd.sort.dir = v; });
    body.querySelectorAll('[data-tick]').forEach((c) => {
      c.onchange = () => this.pick((dd) => { const s = new Set(dd.skip || []), i = +c.dataset.tick; if (c.checked) s.delete(i); else s.add(i); dd.skip = [...s].sort((a, b) => a - b); });
    });
    // clicking a row (not its tick box) shows that person's copy
    body.querySelectorAll('#mergeRows tr[data-row]').forEach((tr) => {
      tr.onclick = (e) => { if (e.target.closest('input') || tr.classList.contains('out') || !fieldsIn(this.doc).length) return; const i = +tr.dataset.row; if ((d.skip || []).includes(i)) return; this.preview(i); };
    });
    const visible = () => orderedRows(d).filter((i) => passes(d.rows[i], d.filter));
    on2('mTickAll', () => this.pick((dd) => { const v = new Set(visible()); dd.skip = (dd.skip || []).filter((i) => !v.has(i)); }));
    on2('mTickNone', () => this.pick((dd) => { dd.skip = [...new Set([...(dd.skip || []), ...visible()])].sort((a, b) => a - b); }));
  }
  wirePhotos() {
    const col = $('mPhotoCol'); if (!col) return;
    col.onchange = () => { this.photoCol = col.value; };
    const use = $('mPhotoUse');
    use.addEventListener('mousedown', (e) => e.preventDefault());
    use.onclick = () => this.usePhotos(col.value);
    on2('mPhotoPick', () => $('photoFiles').click());
    $('mergeBody').querySelectorAll('[data-unphoto]').forEach((b) => {
      b.onclick = () => {
        const f = [...photoFrames(this.doc.pages)][+b.dataset.unphoto]; if (!f) return;
        this.app.editor.change('photo', () => { delete f.it.mergePhoto; }, [f.page]);
        this.render();
      };
    });
  }
  wireMail() {
    const d = this.doc.mergeData, col = $('mMailCol'), subj = $('mMailSubject');
    if (!col) return;
    col.onchange = () => { d.mail.col = col.value; this.app.touched?.(); this.render(); };
    subj.oninput = () => { d.mail.subject = subj.value; this.app.touched?.(); };
    $('mMailFields').querySelectorAll('[data-sfield]').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.onclick = () => { subj.focus(); subj.setRangeText(fieldText(b.dataset.sfield), subj.selectionStart, subj.selectionEnd, 'end'); d.mail.subject = subj.value; this.app.touched?.(); };
    });
    on2('mMailMake', () => this.makeMails());
  }

  // ---------------------------------------------------------------- looking through the copies
  // show record i (a row number of the list); its photos are cut to size first
  async preview(i) {
    const d = this.doc.mergeData;
    if (i == null || !d) { this.app.setMergePreview(null); this.render(); return; }
    await preparePhotos(this.doc.pages, [d.rows[i]]);
    if (!this.app.setMergePreview(i)) this.app.redraw(null);
    this.render();
  }
  step(dir) {
    const chosen = chosenIndexes(this.doc.mergeData); if (!chosen.length) return;
    const pos = chosen.indexOf(this.app.mergePreview);
    this.preview(chosen[pos < 0 ? 0 : (pos + dir + chosen.length) % chosen.length]);
  }
  photosChosen() {
    setPhotoFiles(this.photos);
    if (this.app.mergePreview != null) this.preview(this.app.mergePreview); else this.render();
  }
  // the selected picture (or empty picture frame) takes its photo from the column
  usePhotos(col) {
    const ed = this.app.editor;
    const pics = [], find = (it) => { if (it.type === 'image') pics.push(it); (it.items || []).forEach(find); }; // pictures inside a group count too
    ed.selectedItems().forEach(find);
    if (!pics.length || !col) { this.app.toast(t('mphoto.selectFirst'), 6000); return; }
    ed.change('photo', () => pics.forEach((it) => { it.mergePhoto = col; }));
    this.parts.photo = true;
    this.app.toast(t('mphoto.done', { col: fieldText(col) }), 5000);
    if (this.app.mergePreview != null) this.preview(this.app.mergePreview); else this.render();
  }
  insertField(name) {
    const app = this.app, ed = app.editor, text = fieldText(name);
    if (ed.editing) {
      ed.restoreRange();
      document.execCommand('insertText', false, text);
      ed.saveRange();
      return;
    }
    const items = ed.selectedItems();
    if (items.length === 1 && items[0].type === 'text') {
      ed.change('field', () => {
        const it = items[0], pa = it.paras[it.paras.length - 1] || { runs: [] };
        if (!it.paras.length) it.paras.push(pa);
        const last = pa.runs[pa.runs.length - 1] || { font: 'Arial', size: 14 };
        pa.runs.push({ ...last, text: (last.text && !/\s$/.test(last.text) ? ' ' : '') + text });
        it.edited = true;
      });
    } else {
      const pg = app.targetPage(), w = pg.w * 0.5;
      ed.add({ type: 'text', x: (pg.w - w) / 2, y: pg.h * 0.4, w, h: 30, pad: [3.6, 3.6, 3.6, 3.6], valign: 'top', columns: 1, columnGap: 0, edited: true, autoGrow: true, fill: null, stroke: null, paras: [{ align: 'left', runs: [{ text, font: 'Arial', size: 16 }] }] });
    }
    this.render();
  }

  // ---------------------------------------------------------------- catalogue
  catalogueHtml(d) {
    const c = this.cat, opt = (sel) => `<option value="">—</option>${d.columns.map((col) => `<option${col === sel ? ' selected' : ''}>${esc(col)}</option>`).join('')}`;
    return `<p class="hint">${esc(t('catm.intro'))}</p>
      <div class="pgrid">${['name', 'price', 'desc', 'section', 'photo'].map((k) => `<label>${esc(t('catm.' + k))}<select data-map="${k}">${opt(c.map[k])}</select></label>`).join('')}</div>
      <div class="row">${['list', 'cards'].map((l) => `<label class="choice"><input type="radio" name="catLayout" value="${l}"${c.layout === l ? ' checked' : ''}><span class="t">${esc(t('catm.' + l))}</span></label>`).join('')}</div>
      <div class="pgrid"><label class="wide">${esc(t('catm.title'))}<input id="catTitle" value="${esc(c.title)}"></label></div>
      <div class="prow"><button class="btn" id="catPhotos">${esc(t('catm.photos'))}</button><span class="hint">${esc(this.photos.length ? t('catm.photoCount', { n: this.photos.length }) : t('catm.photoHint'))}</span></div>
      <div class="prow"><button class="btn primary" id="catMake">${esc(t('catm.make', { n: d.rows.length }))}</button><button class="btn" id="catBack">${esc(t('catm.back'))}</button></div>`;
  }
  wireCatalogue(d) {
    const c = this.cat;
    $('mergeBody').querySelectorAll('[data-map]').forEach((s) => { s.onchange = () => { c.map[s.dataset.map] = s.value; }; });
    $('mergeBody').querySelectorAll('input[name="catLayout"]').forEach((r) => { r.onchange = () => { c.layout = r.value; }; });
    $('catTitle').oninput = (e) => { c.title = e.target.value; };
    $('catPhotos').onclick = () => $('photoFiles').click();
    $('catBack').onclick = () => { this.cat = null; this.render(); };
    $('catMake').onclick = () => this.makeCatalogue(d);
  }
  async makeCatalogue(d) {
    const c = this.cat, app = this.app;
    app.busy(true, t('busy.building'));
    try {
      const byName = new Map(this.photos.map((f) => [f.name.toLowerCase().replace(/\.[^.]+$/, ''), f]));
      const rows = [];
      let next = 0;
      for (const r of d.rows) {
        const name = (r[c.map.name] || '').trim(); if (!name) continue;
        let file = null;
        if (c.map.photo && r[c.map.photo]) file = byName.get(String(r[c.map.photo]).toLowerCase().replace(/\.[^.]+$/, '').split(/[\\/]/).pop()) || null;
        else if (!c.map.photo && this.photos[next]) file = this.photos[next++];
        let photo = null;
        if (file && c.layout === 'cards') { try { photo = await coverCrop(file, 1.45); } catch { photo = null; } }
        rows.push({ name, price: (r[c.map.price] || '').trim(), desc: (r[c.map.desc] || '').trim(), section: (r[c.map.section] || '').trim(), photo });
      }
      const doc = await buildCatalogue(rows, { title: c.title, layout: c.layout, scheme: this.doc.scheme || 'orange', fonts: this.doc.fontPair || 'modern', lang: app.lang, name: c.title || t('catm.docName') });
      doc.uid = (await import('../editor/model.js')).uid('d');
      this.cat = null; this.close();
      app.show(doc); app.touched(); track('catalogue', { layout: c.layout, items: rows.length });
    } finally { app.busy(false); }
  }

  // ---------------------------------------------------------------- making the copies and e-mails
  async make() {
    const d = this.doc.mergeData, used = fieldsIn(this.doc), rows = chosenRows(d, used);
    if (!rows.length) return;
    const app = this.app;
    if ([...photoFrames(this.doc.pages)].length && photoCount()) {
      app.busy(true, t('mphoto.busy'));
      try { await preparePhotos(this.doc.pages, rows); } finally { app.busy(false); }
    }
    const merged = mergedDocument(this.doc, rows);
    try { await growMerged(merged, renderPage); } catch (err) { console.warn('grow', err); }
    this.close();
    app.show(merged); app.touched();
    app.toast(t('merge.made', { n: merged.pages.length }), 9000); track('mail-merge', { copies: rows.length });
  }
  async makeMails() {
    const d = this.doc.mergeData, app = this.app, rows = chosenRows(d, fieldsIn(this.doc));
    if (!rows.length || !d.mail?.col) return;
    const keep = app.mergePreview;
    if (app.editor.editing) app.editor.endEdit();
    app.busy(true, t('mail.busy', { i: 1, n: rows.length }));
    try {
      const r = await makeEmails(app, rows, d.mail, (i, n) => app.busy(true, t('mail.busy', { i: i + 1, n })));
      track('mail-merge-emails', { emails: r.made });
      const how = await download(r.blob, r.name);
      if (how === 'saved') app.toast(t('mail.made', { n: r.made }) + (r.missing ? ' ' + t('mail.skipped', { n: r.missing }) : ''), 12000);
    } catch (err) {
      console.error(err); app.toast(t('mail.failed'), 8000);
    } finally { app.busy(false); if (keep != null && app.mergePreview !== keep) this.preview(keep); }
  }
}

function on2(id, fn) { const e = $(id); if (e) e.onclick = fn; }
