// The list of files on the "convert" pages. People add files or folders, pick one format for all of them
// and convert them in one go. Each file is drawn out of sight (offscreen.js) instead of being opened in
// the editor, and the next file is read while the last one is saved. The results stay here to download
// one by one or all in one .zip; picking another format converts the same files again.
import { t } from '../i18n/index.js';
import { download } from '../export/stage.js';
import { openDialog } from '../editor/dialog.js';
import { loadEmbeddedFonts } from '../fonts.js';
import { track } from '../track.js';
import { drawOffscreen } from './offscreen.js';
import './batch.css';

const FORMATS = ['pdf', 'docx', 'jpg', 'png', 'svg', 'sla', 'idml'];
// Everything stays in this tab's memory until the .zip is made. Above about this much the browser may give
// up, so people are asked first. Pictures of whole pages come out much bigger than the .pub files.
const WARN_BYTES = 400 * 1024 * 1024;
const GROWTH = { jpg: 3, png: 8 };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sizeText = (b) => {
  const lang = document.documentElement.lang || undefined;
  return b >= 1048576 ? `${(b / 1048576).toLocaleString(lang, { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024)).toLocaleString(lang)} KB`;
};
const keyOf = (f) => `${f.webkitRelativePath || f.name}|${f.size}|${f.lastModified || 0}`;
const ICON = {
  done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>',
  failed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
};
let lastId = 0;

export class BatchList {
  constructor(app, { formatName }) {
    this.app = app; this.formatName = formatName;
    this.items = []; this.running = false; this.stopping = false; this.at = 0;
    this.el = document.createElement('section');
    this.el.className = 'blist'; this.el.hidden = true;
    $('batchBox').after(this.el);
    this.said = document.createElement('p'); // one lasting place for screen readers to hear how it is going
    this.said.className = 'blist-sr'; this.said.setAttribute('aria-live', 'polite');
    this.el.after(this.said);
    this.el.addEventListener('click', (e) => this.click(e));
  }
  get pubs() { return this.items.filter((x) => !x.skip); }
  // one format for every file, shared with the chips the "many files" page shows before any are chosen
  get format() { return this.app.batchFormat || 'pdf'; }
  set format(f) { this.app.batchFormat = f; }

  add(files) {
    if (this.running) return;
    const seen = new Set(this.items.map((x) => keyOf(x.file)));
    for (const file of files) {
      const k = keyOf(file); if (seen.has(k)) continue; seen.add(k);
      this.items.push({ id: ++lastId, file, label: (file.webkitRelativePath || file.name).replace(/^\/+/, ''), skip: !/\.pub$/i.test(file.name), state: 'ready' });
    }
    this.render();
  }

  click(e) {
    const b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act, item = this.items.find((x) => x.id === +b.dataset.id);
    if (act === 'add') $('file').click();
    else if (act === 'folder') $('folder').click();
    else if (act === 'clear') { this.items = []; this.render(); $('eOpen').focus(); }
    else if (act === 'remove' && item) {
      const i = this.items.indexOf(item); this.items.splice(i, 1);
      const next = this.items[i] || this.items[i - 1];
      this.render(next ? `remove-${next.id}` : null);
      if (!this.items.length) $('eOpen').focus();
    } else if (act === 'format' && b.dataset.f !== this.format) {
      this.format = b.dataset.f;
      for (const x of this.items) if (!x.skip) { x.state = 'ready'; x.out = null; x.why = null; } // the files are converted again in the new format
      this.render(`format-${this.format}`);
    } else if (act === 'go') this.convert();
    else if (act === 'stop') { this.stopping = true; b.disabled = true; }
    else if (act === 'all') this.downloadAll();
    else if (act === 'one' && item?.out) download(item.out.blob, item.out.name).then((how) => { if (how === 'blocked') this.app.toast(t('save.blocked'), 9000); });
  }

  async convert() {
    const todo = this.items.filter((x) => !x.skip && x.state === 'ready');
    if (!todo.length || this.running) return;
    const held = this.items.reduce((s, x) => s + (x.out?.blob.size || 0), 0);
    const guess = held + todo.reduce((s, x) => s + x.file.size, 0) * (GROWTH[this.format] || 1);
    if (guess > WARN_BYTES && !(await this.askBig(guess))) return;
    const format = this.format;
    this.running = true; this.stopping = false; this.total = todo.length;
    const read = (x) => this.app.readPub(x.file, { quiet: true }).then((doc) => ({ doc }), (err) => ({ err }));
    let ahead = read(todo[0]);
    let ok = 0, bad = 0;
    for (let i = 0; i < todo.length && !this.stopping; i++) {
      const x = todo[i];
      x.state = 'working'; this.at = i; this.render(i === 0 ? 'stop' : null);
      const got = await ahead;
      ahead = i + 1 < todo.length ? read(todo[i + 1]) : null; // read the next file while this one is saved
      try {
        if (got.err) throw got.err;
        const drawn = await drawOffscreen(got.doc);
        try { x.out = await this.app.exportOut(format, { size: 'print', pages: null }, drawn); } finally { drawn.remove(); }
        x.state = 'done'; ok++;
      } catch (err) {
        console.error(err);
        x.state = 'failed'; bad++;
        x.why = t(`err.${err?.code}`) !== `err.${err?.code}` ? t(`err.${err.code}`) : t('batch.failed');
      }
    }
    this.running = false; this.stopping = false;
    if (this.app.doc) this.app.embedded = loadEmbeddedFonts(this.app.doc); // the open document's own fonts again
    track('batch-convert', { format, files: todo.length, ok, bad });
    this.render(this.items.some((x) => x.state === 'done') ? 'all' : 'go');
  }

  askBig(bytes) {
    return new Promise((resolve) => {
      let yes = false;
      const dlg = openDialog({
        title: t('batch.bigTitle'),
        body: `<p class="blist-big">${esc(t('batch.big', { size: sizeText(bytes) }))}</p>`,
        okLabel: t('batch.bigGo'),
        onOk: () => { yes = true; },
      });
      // either button, or Escape, takes the window away: that is the answer
      const gone = new MutationObserver(() => { if (!dlg.isConnected) { gone.disconnect(); resolve(yes); } });
      gone.observe(document.body, { childList: true });
    });
  }

  // every converted file in one .zip, the folders kept, with a list of what happened
  async downloadAll() {
    const { zipSync, unzipSync } = await import('fflate');
    const entries = {}, lines = [], used = new Set(), format = this.format;
    let ok = 0, bad = 0;
    for (const x of this.pubs) {
      if (x.state === 'failed') { lines.push(`--  ${x.label}: ${x.why}`); bad++; continue; }
      if (x.state !== 'done') continue;
      const f = x.file, out = x.out;
      let name = (f.webkitRelativePath ? f.webkitRelativePath.replace(/\.pub$/i, '') + out.name.slice(out.name.lastIndexOf('.')) : out.name).replace(/^\/+/, '');
      for (let k = 2; used.has(name.toLowerCase()); k++) name = name.replace(/( \(\d+\))?(\.[^.]+)$/, ` (${k})$2`);
      used.add(name.toLowerCase());
      const bytes = new Uint8Array(await out.blob.arrayBuffer());
      if (/\.zip$/i.test(name)) { // pictures of several pages: a folder inside the one .zip, not a .zip in a .zip
        const dir = name.replace(/\.zip$/i, '');
        for (const [inner, data] of Object.entries(unzipSync(bytes))) entries[`${dir}/${inner}`] = [data, { level: 0 }];
        name = `${dir}/`;
      } else entries[name] = [bytes, { level: 0 }];
      const pics = out.report?.picturePages ? ` · ${t('batch.pictures', { n: out.report.picturePages })}` : '';
      lines.push(`OK  ${x.label} -> ${name}${pics}`); ok++;
    }
    const report = [t('batch.reportTitle', { n: ok + bad }), '', ...lines, '', t('batch.reportEnd', { ok, bad })].join('\r\n');
    entries[`${t('batch.reportName')}.txt`] = [new TextEncoder().encode('\ufeff' + report), { level: 6 }];
    const blob = new Blob([zipSync(entries)], { type: 'application/zip' });
    const how = await download(blob, `Pubwork ${this.formatName[format]} (${ok}).zip`);
    if (how === 'blocked') this.app.toast(t('save.blocked'), 9000);
    else this.app.toast(t(bad ? 'batch.doneSome' : ok === 1 ? 'batch.doneOne' : 'batch.done', { ok, bad }), 12000);
  }

  render(focusKey) {
    const shown = this.items.length > 0;
    this.before ||= ['batchFormats', 'drop', 'batchBox'].filter((id) => !$(id).hidden); // what the list stands in for
    this.el.hidden = !shown; for (const id of this.before) $(id).hidden = shown;
    if (!shown) { this.el.textContent = ''; this.said.textContent = ''; if (this.before.includes('batchFormats')) this.app.renderBatchFormats(); return; }
    const had = this.el.contains(document.activeElement) ? document.activeElement.dataset.key : null;
    const run = this.running, pubs = this.pubs, name = this.formatName[this.format];
    // while converting, the rest of the start screen (samples, new documents) waits, as it did under the old busy cover
    for (const sib of this.el.parentElement.children) if (sib !== this.el) sib.inert = run;
    const ready = pubs.filter((x) => x.state === 'ready').length;
    const done = pubs.filter((x) => x.state === 'done');
    const rows = this.items.map((x) => {
      const where = x.label.includes('/') ? x.label.slice(0, x.label.lastIndexOf('/') + 1) : '';
      const base = x.label.slice(where.length);
      let note = where, mark = ICON.file, cls = x.state, act = '';
      if (x.skip) { note = t('batch.skip'); cls = 'skip'; }
      else if (x.state === 'working') { note = t('batch.working'); mark = '<span class="blist-spin" aria-hidden="true"></span>'; }
      else if (x.state === 'ready' && run) note = t('batch.waiting');
      else if (x.state === 'done') { mark = ICON.done; note = `${x.out.name} · ${sizeText(x.out.blob.size)}${x.out.report?.picturePages ? ` · ${t('batch.pictures', { n: x.out.report.picturePages })}` : ''}`; }
      else if (x.state === 'failed') { mark = ICON.failed; note = x.why; }
      if (x.state === 'done') act = `<button class="blist-one" data-act="one" data-id="${x.id}" data-key="one-${x.id}">${ICON.down}${esc(t('batch.download'))}</button>`;
      else if (!run) act = `<button class="blist-x" data-act="remove" data-id="${x.id}" data-key="remove-${x.id}" aria-label="${esc(t('batch.remove', { name: x.label }))}" title="${esc(t('batch.remove', { name: x.label }))}">${ICON.x}</button>`;
      return `<li class="${cls}"><span class="blist-mark">${mark}</span><span class="blist-name"><b>${esc(base)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span><span class="blist-size">${sizeText(x.file.size)}</span>${act}</li>`;
    }).join('');
    const chips = FORMATS.map((f) => `<button class="${f === this.format ? 'on' : ''}" aria-pressed="${f === this.format}" data-act="format" data-f="${f}" data-key="format-${f}"${run ? ' disabled' : ''}>${esc(t('batch.to', { format: this.formatName[f] }))}</button>`).join('');
    const total = done.reduce((s, x) => s + x.out.blob.size, 0);
    let actions = '';
    if (run) {
      actions = `<div class="blist-progress"><p>${esc(t('batch.running', { i: this.at + 1, n: this.total, format: name }))}</p><progress max="${this.total}" value="${this.at}"></progress></div>
        <button class="btn" data-act="stop" data-key="stop"${this.stopping ? ' disabled' : ''}>${esc(t('batch.stop'))}</button>`;
    } else {
      const summary = done.length ? `<p class="blist-summary">${esc(t('batch.summary', { ok: done.length, n: pubs.length, format: name }))}</p>` : '';
      const go = ready ? `<button class="btn ${done.length ? '' : 'primary'} big" data-act="go" data-key="go">${esc(t(ready === 1 ? 'batch.goOne' : 'batch.go', { n: ready, format: name }))}</button>` : '';
      const all = done.length ? `<button class="btn ${ready ? '' : 'primary'} big" data-act="all" data-key="all">${ICON.down}${esc(t('batch.downloadAll', { size: sizeText(total) }))}</button>` : '';
      actions = `${summary}${all}${go}`;
    }
    this.el.innerHTML = `<div class="blist-head"><h2>${esc(t('batch.files', { n: pubs.length }))}</h2>
      <div class="blist-tools"><button class="btn" data-act="add" data-key="add"${run ? ' disabled' : ''}>${esc(t('batch.add'))}</button><button class="btn" data-act="folder" data-key="folder"${run ? ' disabled' : ''}>${esc(t('batch.folder'))}</button><button class="btn" data-act="clear" data-key="clear"${run ? ' disabled' : ''}>${esc(t('batch.clear'))}</button></div></div>
      <ul class="blist-rows">${rows}</ul>
      <h2>${esc(t('batch.formatTitle'))}</h2>
      <div class="chips">${chips}</div>
      ${GROWTH[this.format] || this.format === 'svg' ? `<p class="hint">${esc(t('batch.picturesHint'))}</p>` : ''}
      <div class="blist-go">${actions}</div>`;
    const news = run ? t('batch.running', { i: this.at + 1, n: this.total, format: name }) : done.length ? t('batch.summary', { ok: done.length, n: pubs.length, format: name }) : '';
    if (this.said.textContent !== news) this.said.textContent = news;
    const key = focusKey || had;
    if (key) this.el.querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
  }
}
