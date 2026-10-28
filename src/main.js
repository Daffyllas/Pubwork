// Pubwork: open Publisher files in the browser, change them, and save them as PDF, JPG, PNG or a Pubwork file.
import { renderPage, flowLinkedText, fitText } from './render.js';
import { loadEmbeddedFonts, fontReport, embeddedFontBytes } from './fonts.js';
import { summarize } from './pubmodel.js';
import { t, setLang, pickLang, translatePage, LANGS } from './i18n/index.js';
import { download, safeName } from './export/stage.js';
import { Editor } from './editor/editor.js';
import { Panel } from './editor/panel.js';
import { PrintPanel } from './printpanel.js';
import { MergePanel } from './merge/panel.js';
import { fillPages } from './merge/merge.js';
import { SCHEMES, FONT_PAIRS, fontPair, schemeColors, applyScheme, applyFonts } from './templates/schemes.js';
import { FIELDS, loadDetails, saveDetails, fillDetails } from './templates/details.js';
import { loadArt, artItem, artCategories } from './templates/art.js';
import { saveMine } from './templates/mine.js';
import { findItem } from './editor/model.js';
import { snapLines, drawGuides, openGuides, sideHtml as guidesSide, wireSide as wireGuidesSide, renderPanel as renderGuidesPanel } from './layoutguides.js';
import { openMasters, nameMasters, sideHtml as mastersSide, wireSide as wireMastersSide, renderPanel as renderMastersPanel } from './masters.js';
import { startTour, addTourLink, offerTour } from './tour.js';
import './mastersguides.css';
import { clone, uid, reId, blankDocument, PAGE_SIZES, transformItem, scaleStyle, History } from './editor/model.js';
import { toPubwork, fromPubwork, isZip, keepLocally, listLocal, loadLocal, forgetLocal, trimLocal } from './editor/file.js';
import { track } from './track.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PT = 96 / 72; // CSS px per point at 100%
// pages generated into sub-folders say where the site's root is, so shared files are found from anywhere
const ROOT = new URL(document.querySelector('meta[name="pw-root"]')?.content || './', document.baseURI);
const FORMAT_NAME = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', pubwork: 'Pubwork', docx: 'Word', odg: 'ODG', pptx: 'PowerPoint', html: 'HTML', eml: 'E-mail', xps: 'XPS' };
// inside a claude.ai artifact only some file endings may be saved, so the Pubwork file goes in a .zip
const IN_ARTIFACT = !!window.claude?.use;
const OWN_EXT = IN_ARTIFACT ? '.pubwork.zip' : '.pubwork';
const sizeLabel = (s) => (s.key ? t(s.key) : s.name);

class App {
  constructor() {
    this.lang = setLang(pickLang());
    document.documentElement.lang = this.lang;
    translatePage();
    this.doc = null; this.zoom = 1; this.notes = new Map();
    this.editor = new Editor(this); this.panel = new Panel(this); this.print = new PrintPanel(this); this.merge = new MergePanel(this); this.mergePreview = null;
    // a search page like "pub to PDF" saves straight away once a file is open
    const fromHash = /^#to-(pdf|jpg|png|docx|batch)$/.exec(location.hash)?.[1];
    this.convert = document.documentElement.dataset.convert || fromHash || null;
    if (fromHash && fromHash !== 'batch' && $('convertNote')) { $('convertNote').textContent = t('convert.ready', { format: FORMAT_NAME[this.convert] }); $('convertNote').hidden = false; }
    // converters take many files at once, or a whole folder, and give one .zip back
    this.batchFormat = this.convert === 'batch' ? 'pdf' : this.convert;
    if (this.convert) { $('file').multiple = true; $('batchBox').hidden = false; }
    if (this.convert === 'batch') {
      this.renderBatchFormats(); $('drop').before($('batchFormats'));
      $('eOpen').textContent = t('batch.choose'); $('drop').querySelector('.big').textContent = t('batch.drop');
    }
    $('bFolder').onclick = () => $('folder').click();
    $('folder').onchange = (e) => { const fs = [...e.target.files]; e.target.value = ''; this.openMany(fs); };
    // the "support" link goes to the website's page, which a page inside claude.ai doesn't have
    if (IN_ARTIFACT) $('supportLine').hidden = true; // the website's pages aren't part of the claude.ai page
    // search pages like "free flyer maker" start with the matching templates
    const maker = $('bMaker'); if (maker) maker.onclick = () => (maker.dataset.maker === 'calendar' ? this.openCalMaker() : this.openGallery(maker.dataset.maker));

    $('bOpen').onclick = $('eOpen').onclick = () => $('file').click();
    $('file').onchange = (e) => { const fs = [...e.target.files]; e.target.value = ''; this.openMany(fs); };
    const drop = $('drop');
    document.body.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    document.body.addEventListener('dragleave', (e) => { if (!e.relatedTarget) drop.classList.remove('over'); });
    document.body.addEventListener('drop', (e) => {
      e.preventDefault(); drop.classList.remove('over');
      const f = e.dataTransfer.files[0]; if (!f) return;
      // a picture dropped on an open document goes onto the page
      if (this.doc && f.type.startsWith('image/')) this.insertPicture(f);
      else if (this.convert) filesFromDrop(e.dataTransfer).then((fs) => this.openMany(fs));
      else this.openMany([...e.dataTransfer.files]);
    });
    const sample = async (file, nameKey) => {
      const name = `${t(nameKey)}.pub`;
      this.busy(true, t('busy.opening', { name }));
      try {
        const r = await fetch(new URL(`samples/${file}`, ROOT)); if (!r.ok) throw new Error(r.status);
        const bin = atob((await r.text()).trim());
        this.openFile(new File([Uint8Array.from(bin, (c) => c.charCodeAt(0))], name));
      } catch { this.busy(false); this.toast(t('err.sample')); }
    };
    $('sNews').onclick = () => sample('newsletter.b64.txt', 'open.sampleNews');
    $('sBroch').onclick = () => sample('brochure.b64.txt', 'open.sampleBroch');
    document.querySelectorAll('[data-new]').forEach((b) => { b.onclick = () => this.newDocument(b.dataset.new); });
    this.fillNewSizes();
    $('newMore').onchange = (e) => { const v = e.target.value; e.target.value = ''; if (v) this.newDocument(v); };
    $('zIn').onclick = () => this.setZoom(this.zoom * 1.25);
    $('zOut').onclick = () => this.setZoom(this.zoom / 1.25);
    $('zFit').onclick = () => this.fit();
    $('desk').addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
    $('desk').addEventListener('scroll', () => this.trackPage());
    window.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' && !$('savePanel').hidden) { this.closeSave(); return; }
      if (e.key === 'Escape' && !$('printPanel').hidden) { this.print.close(); return; }
      if (e.key === 'Escape' && !$('checkPanel').hidden) { this.print.closeCheck(); return; }
      if (mod && e.key.toLowerCase() === 'p' && this.doc) { e.preventDefault(); this.print.open(); return; }
      if (e.key === 'Escape' && (!$('shapeMenu').hidden || !$('picMenu').hidden || !$('moreMenu').hidden)) { this.closeMenu(true); return; }
      if (e.key === 'Escape' && !$('calPanel').hidden) { this.calMaker?.close(); return; }
      if (e.key === 'Escape' && !$('gallery').hidden) { this.gallery?.close(); return; }
      if (e.key === 'Escape' && !$('artPanel').hidden) { $('artPanel').hidden = true; return; }
      if (e.key === 'Escape' && !$('detailsPanel').hidden) { $('detailsPanel').hidden = true; return; }
      if (e.key === 'Escape' && !$('mergePanel').hidden) { this.merge.close(); return; }
      if (e.key === 'Escape') for (const id of ['mastersPanel', 'guidesPanel']) if ($(id) && !$(id).hidden) { $(id).hidden = true; return; }
      if (mod && !e.altKey && ['f', 'h'].includes(e.key.toLowerCase()) && this.doc) { e.preventDefault(); this.runAction('find'); return; }
      if (e.key === 'F7' && this.doc) { e.preventDefault(); this.runAction('spell'); return; }
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); $('file').click(); }
      if (mod && e.key.toLowerCase() === 's' && this.doc) { e.preventDefault(); if (e.shiftKey) this.openSave(); else this.saveOwn(); }
      if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); this.setZoom(this.zoom * 1.25); }
      if (mod && e.key === '-') { e.preventDefault(); this.setZoom(this.zoom / 1.25); }
      if (mod && e.key === '0') { e.preventDefault(); this.fit(); }
    });
    window.addEventListener('resize', () => { if (this.autoFit) this.fit(); });
    if ('launchQueue' in window) window.launchQueue.setConsumer(async (p) => { const h = p.files?.[0]; if (h) this.openFile(await h.getFile()); });
    // fonts that arrive late change how text fits: measure again once they are in
    document.fonts.addEventListener?.('loadingdone', () => { if (!this.doc || this.saving || this.editor.editing) return; clearTimeout(this._refl); this._refl = setTimeout(() => this.settle(), 150); });

    // tools
    $('tUndo').onclick = () => this.editor.undo();
    $('tRedo').onclick = () => this.editor.redo();
    $('tText').onclick = () => this.insertText();
    $('tPic').onclick = (e) => { e.stopPropagation(); $('picMenu').hidden ? this.openMenu('picMenu', 'tPic') : this.closeMenu(); };
    $('picFromFile').onclick = () => { this.closeMenu(); this.pickPicture((f) => this.insertPicture(f)); };
    $('picFromLib').onclick = () => { this.closeMenu(); this.openArt(); };
    $('picFrame').onclick = () => { this.closeMenu(); this.insertFrame(); };
    $('tBlocks').onclick = () => ($('blocksPanel').hidden ? this.openBlocks() : ($('blocksPanel').hidden = true));
    $('blocksClose').onclick = () => { $('blocksPanel').hidden = true; };
    $('artClose').onclick = () => { $('artPanel').hidden = true; };
    $('bTemplates').onclick = () => this.openGallery();
    $('bCalendar').onclick = () => this.openCalMaker();
    $('bHome').onclick = () => this.goHome();
    $('detCancel').onclick = () => { $('detailsPanel').hidden = true; };
    $('detSave').onclick = () => this.saveDetailsForm(false);
    $('detFill').onclick = () => this.saveDetailsForm(true);
    $('detLogoPick').onclick = () => this.pickPicture(async (f) => { try { const p = await this.readPicture(f, 600); this._logo = p; this.showLogo(); } catch { this.toast(t('err.picture')); } });
    $('detLogoClear').onclick = () => { this._logo = null; this.showLogo(); };
    $('tDelete').onclick = () => this.editor.remove();
    $('tTable').onclick = () => this.runAction('table');
    $('tWordArt').onclick = () => this.runAction('wordart');
    this.menuKeys();
    $('tMore').onclick = (e) => { e.stopPropagation(); $('moreMenu').hidden ? this.openMenu('moreMenu', 'tMore') : this.closeMenu(); };
    $('moreMenu').querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => { this.closeMenu(); this.runAction(b.dataset.act); }; });
    $('tShape').onclick = (e) => { e.stopPropagation(); $('shapeMenu').hidden ? this.openMenu('shapeMenu', 'tShape') : this.closeMenu(); };
    $('shapeMenu').querySelectorAll('[data-shape]').forEach((b) => { b.onclick = () => { this.closeMenu(); this.insertShape(b.dataset.shape); }; });
    $('picFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f && this._picCb) this._picCb(f); };
    document.addEventListener('pointerdown', (e) => { for (const [m, b] of [['shapeMenu', 'tShape'], ['picMenu', 'tPic'], ['moreMenu', 'tMore']]) if (!$(m).hidden && !$(m).contains(e.target) && !$(b).contains(e.target)) this.closeMenu(); });

    // saving
    $('bKeep').onclick = () => this.saveOwn();
    $('bSave').onclick = () => ($('savePanel').hidden ? this.openSave() : this.closeSave());
    $('saveCancel').onclick = () => this.closeSave();
    $('savePanel').addEventListener('change', () => this.updateSavePanel());
    $('saveGo').onclick = () => { const o = this.saveChoice(); this.closeSave(); o.format === 'pubwork' ? this.saveOwn() : this.save(o); };
    document.addEventListener('pointerdown', (e) => { if (!$('savePanel').hidden && !$('savePanel').contains(e.target) && !$('bSave').contains(e.target)) this.closeSave(); });
    // text being typed is written into the document first, so closing the tab keeps it
    const keepBeforeLeaving = () => { try { this.editor?.flush?.(); } catch { /* keep what we have */ } if (this.dirty) this.keepNow(); };
    window.addEventListener('beforeunload', keepBeforeLeaving);
    window.addEventListener('pagehide', keepBeforeLeaving);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keepBeforeLeaving(); });

    // language
    const sel = $('langSel');
    if (sel) {
      sel.innerHTML = Object.entries(LANGS).map(([code, d]) => `<option value="${code}"${code === this.lang ? ' selected' : ''}>${esc(d['lang.name'])}</option>`).join('');
      sel.onchange = () => {
        const alt = document.querySelector(`.seo a[hreflang="${sel.value}"]`);
        if (alt && document.documentElement.hasAttribute('data-fixed-lang')) { location.href = alt.href; return; } // the same page in that language
        try { localStorage.setItem('pw-lang', sel.value); } catch { /* fine without */ }
        this.lang = setLang(sel.value); document.documentElement.lang = this.lang; translatePage(); this.updateSavePanel(); this.fillNewSizes();
        this.renderRecent(); this.renderTabs();
        if (this.doc) { this.panel.show(); this.renderThumbs(); }
      };
    }
    this.renderRecent();
    $('fname').onclick = () => this.rename();

    // several documents can be open at once, each in its own tab with its own undo steps
    this.tabs = []; // { doc, history, dirty, current, zoom }
    this.tabsEl = document.createElement('div'); this.tabsEl.id = 'docTabs'; this.tabsEl.setAttribute('role', 'tablist'); this.tabsEl.hidden = true;
    // the bar shown while master pages are being changed
    this.modeBar = document.createElement('div'); this.modeBar.id = 'modeBar'; this.modeBar.hidden = true; this.modeBar.setAttribute('role', 'status');
    document.querySelector('main').before(this.tabsEl, this.modeBar);
    addTourLink(this);
    // printing and mail merge work on the pages, not on the master pages: go back to the pages first
    for (const [obj, fn] of [[this.print, 'open'], [this.print, 'openCheck'], [this.merge, 'open']]) {
      const f = obj[fn]; if (typeof f === 'function') obj[fn] = (...a) => { this.leaveMasters('export'); return f.apply(obj, a); };
    }
  }
  // the document's name, changed in place in the header
  rename() {
    if (!this.doc) return;
    const btn = $('fname'), inp = document.createElement('input');
    inp.id = 'fnameInput'; inp.value = this.doc.name; inp.setAttribute('aria-label', t('doc.rename'));
    btn.hidden = true; btn.after(inp); inp.focus(); inp.select();
    let ended = false; // removing the box fires blur too: finish only once
    const done = (keep) => {
      if (ended) return; ended = true;
      const v = inp.value.trim(), back = document.activeElement === inp;
      btn.hidden = false; inp.remove();
      if (keep && v && v !== this.doc.name) { this.doc.name = v; this.touched(); }
      this.setTitle();
      if (back) btn.focus();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); } e.stopPropagation(); });
    inp.addEventListener('blur', () => done(true));
  }
  busy(on, text = '') { $('busy').hidden = !on; $('busyText').textContent = text; }
  toast(msg, ms = 4500) { const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(this._t); this._t = setTimeout(() => (el.hidden = true), ms); }

  // ---------------------------------------------------------------- opening
  openMany(files) {
    if (!files.length) return;
    const pubs = files.filter((f) => /\.pub$/i.test(f.name));
    if (this.convert && (files.length > 1 || this.convert === 'batch')) this.convertMany(pubs.length ? pubs : files);
    else this.openFile(files[0]);
  }
  renderBatchFormats() {
    const box = $('batchFormats'); box.hidden = false;
    box.innerHTML = ['pdf', 'docx', 'jpg', 'png'].map((f) => `<button data-f="${f}" class="${f === this.batchFormat ? 'on' : ''}" aria-pressed="${f === this.batchFormat}">${esc(t('batch.to', { format: FORMAT_NAME[f] }))}</button>`).join('');
    box.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { this.batchFormat = b.dataset.f; this.renderBatchFormats(); }; });
  }
  // many .pub files -> one .zip with a PDF (or Word file, or pictures) for each, and a list of what happened
  async convertMany(files) {
    const format = this.batchFormat || 'pdf', { zipSync, unzipSync } = await import('fflate');
    const entries = {}, lines = [], used = new Set();
    let ok = 0, bad = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i], label = f.webkitRelativePath || f.name;
      this.busy(true, t('batch.progress', { i: i + 1, n: files.length, name: f.name }));
      try {
        const doc = await this.readPub(f);
        this.show(doc, { quiet: true });
        await this.settled;
        const out = await this.exportOut(format, { size: 'print', pages: null });
        let name = (f.webkitRelativePath ? f.webkitRelativePath.replace(/\.pub$/i, '') + out.name.slice(out.name.lastIndexOf('.')) : out.name).replace(/^\/+/, '');
        for (let k = 2; used.has(name.toLowerCase()); k++) name = name.replace(/( \(\d+\))?(\.[^.]+)$/, ` (${k})$2`);
        used.add(name.toLowerCase());
        const bytes = new Uint8Array(await out.blob.arrayBuffer());
        if (/\.zip$/i.test(name) && format !== 'pubwork') { // pictures of several pages: a folder inside the one .zip, not a .zip in a .zip
          const dir = name.replace(/\.zip$/i, '');
          for (const [inner, data] of Object.entries(unzipSync(bytes))) entries[`${dir}/${inner}`] = [data, { level: 0 }];
          name = `${dir}/`;
        } else entries[name] = [bytes, { level: 0 }];
        const diff = out.report?.picturePages ? ` · ${t('batch.pictures', { n: out.report.picturePages })}` : '';
        lines.push(`OK  ${label} -> ${name}${diff}`); ok++;
      } catch (err) {
        console.error(err);
        lines.push(`--  ${label}: ${t(`err.${err.code}`) !== `err.${err.code}` ? t(`err.${err.code}`) : t('batch.failed')}`); bad++;
      }
    }
    this.busy(true, t('busy.finishing'));
    const report = [t('batch.reportTitle', { n: files.length }), '', ...lines, '', t('batch.reportEnd', { ok, bad })].join('\r\n');
    entries[`${t('batch.reportName')}.txt`] = [new TextEncoder().encode('\ufeff' + report), { level: 6 }];
    const blob = new Blob([zipSync(entries)], { type: 'application/zip' });
    this.goHome();
    this.busy(false);
    track('batch-convert', { format, files: files.length, ok, bad });
    const how = await download(blob, `Pubwork ${FORMAT_NAME[format]} (${ok}).zip`);
    if (how === 'blocked') this.toast(t('save.blocked'), 9000);
    else this.toast(t(bad ? 'batch.doneSome' : ok === 1 ? 'batch.doneOne' : 'batch.done', { ok, bad }), 12000);
  }
  // read a .pub file into a document (throws with err.code)
  async readPub(file) {
    const name = file.name || 'document.pub', buf = await file.arrayBuffer();
    const head = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    if (!(head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0)) throw Object.assign(new Error('notPubFile'), { code: /\.pub$/i.test(name) ? 'notPubFile' : 'choosePub' });
    const doc = await this.readInWorker(buf, name);
    if (doc.hasWordArt) { delete doc.hasWordArt; await (await import('./wordart/import.js')).drawImportedWordArt(doc); }
    for (const pg of [...doc.pages, ...doc.masters]) { pg.id = uid('p'); const rec = (list) => list.forEach((it) => { const chain = it.chain, ci = it.chainIndex, cl = it.chainLength, story = it.story; it.id = uid(); if (chain) Object.assign(it, { chain, chainIndex: ci, chainLength: cl, story }); if (it.items) rec(it.items); }); rec(pg.items); }
    doc.uid = uid('d');
    return doc;
  }
  async openFile(file) {
    const name = file.name || 'document.pub';
    const srcKey = `${name}|${file.size}|${file.lastModified || 0}`;
    const already = this.convert ? null : this.tabs.find((x) => x.doc.srcKey === srcKey);
    if (already) { this.switchTab(already); this.toast(t('open.already', { name })); return; } // the same file twice: one tab
    this.busy(true, t('busy.opening', { name }));
    let buf;
    try { buf = await file.arrayBuffer(); } catch { this.busy(false); this.toast(t('err.unreadable')); return; }
    const head = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    if (isZip(head) && !/\.(pubwork|zip)$/i.test(name)) { // a Word, Excel or other zip-based file, not our own
      this.busy(false); track('open-failed', { why: 'other-zip' }); this.toast(t(/\.pub$/i.test(name) ? 'err.notPubFile' : 'err.choosePub')); return;
    }
    if (isZip(head)) { // a Pubwork file
      try {
        const doc = fromPubwork(new Uint8Array(buf));
        doc.uid ||= uid('d');
        this.show(doc); track('open-pubwork', { pages: doc.pages.length });
      } catch (err) { track('open-failed', { why: 'pubwork' }); this.toast(t(err.code === 'newer' ? 'err.newer' : 'err.notPubwork'), 8000); console.error(err); }
      this.busy(false); return;
    }
    if (!(head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0)) {
      this.busy(false); track('open-failed', { why: 'not-pub' });
      this.toast(t(/\.pub$/i.test(name) ? 'err.notPubFile' : 'err.choosePub'));
      return;
    }
    let doc;
    try {
      doc = await this.readInWorker(buf, name);
      if (doc.hasWordArt) { delete doc.hasWordArt; await (await import('./wordart/import.js')).drawImportedWordArt(doc); }
    } catch (err) {
      this.busy(false); track('open-failed', { why: String(err.code || 'error') });
      this.toast(t(`err.${err.code}`) !== `err.${err.code}` ? t(`err.${err.code}`) : err.message, 8000);
      console.error(err.detail || err);
      return;
    }
    // ids from the reader are only unique inside one file; give everything fresh ones for editing
    for (const pg of [...doc.pages, ...doc.masters]) { pg.id = uid('p'); const rec = (list) => list.forEach((it) => { const chain = it.chain, ci = it.chainIndex, cl = it.chainLength, story = it.story; it.id = uid(); if (chain) Object.assign(it, { chain, chainIndex: ci, chainLength: cl, story }); if (it.items) rec(it.items); }); rec(pg.items); }
    doc.uid = uid('d'); doc.srcKey = srcKey;
    this.show(doc);
    track(this.convert ? `convert-${this.convert}` : 'open-pub', { pages: doc.pages.length, empty: doc.emptyFile ? 1 : 0 });
    if (doc.emptyFile) { delete doc.emptyFile; this.toast(t('err.emptyOpened'), 8000); }
    if (this.convert) { await this.settled; this.busy(false); this.save({ format: this.convert, size: 'print', pages: null }); }
    else this.busy(false);
  }
  readInWorker(buf, name) {
    return new Promise((resolve, reject) => {
      const w = new Worker(new URL('./readworker.js', import.meta.url), { type: 'module' });
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.status) { this.busy(true, t(m.status)); return; }
        w.terminate();
        if (m.error) reject(Object.assign(new Error(m.error), { code: m.error, detail: m.detail })); else resolve(m.doc);
      };
      w.onerror = (ev) => { w.terminate(); reject(Object.assign(new Error(ev.message || 'worker failed'), { code: 'crash' })); };
      w.postMessage({ buf, name });
    });
  }
  fillNewSizes() {
    const groups = [['paper', 'pagesize.paper'], ['us', 'pagesize.us'], ['small', 'pagesize.small'], ['envelope', 'pagesize.envelope'], ['screen', 'pagesize.screen']];
    $('newMore').innerHTML = `<option value="">${esc(t('new.more'))}</option>` + groups.map(([g, key]) => `<optgroup label="${esc(t(key))}">${PAGE_SIZES.filter((p) => p.group === g).map((p) => `<option value="${p.id}">${esc(sizeLabel(p))}</option>`).join('')}</optgroup>`).join('');
  }
  newDocument(size) {
    const doc = blankDocument(size, t('new.untitled'));
    doc.uid = uid('d'); track('new-blank', { size: typeof size === 'string' ? size : 'custom' });
    this.show(doc);
    this.touched();
  }
  async openLocal(id) {
    const open = this.tabs.find((x) => x.doc.uid === id); // already open in a tab
    if (open) { this.switchTab(open); return; }
    const doc = await loadLocal(id);
    if (!doc) { this.toast(t('err.notPubwork')); this.renderRecent(); return; }
    doc.notes ||= {};
    this.show(doc);
  }

  // show a document: one that is already open switches tabs, another one opens in a new tab
  show(doc) {
    this.stashDoc();
    if (this.convert) this.tabs = []; // converters work on one file at a time
    let tab = this.tabs.find((x) => x.doc === doc);
    const fresh = !tab;
    if (fresh) {
      this.tabs = this.tabs.filter((x) => !(doc.uid && x.doc.uid === doc.uid)); // the same work opened again replaces the open copy
      tab = { doc, history: new History(), dirty: false, current: 0 };
      this.tabs.push(tab);
      // at most 10 open at once: the one left longest closes (its changes are kept in this browser)
      if (this.tabs.length > 10) { const old = this.tabs.filter((x) => x.doc !== this.doc && x !== tab).sort((a, b) => (a.used || 0) - (b.used || 0))[0]; if (old) { if (old.dirty) keepLocally(old.doc); this.tabs.splice(this.tabs.indexOf(old), 1); } }
    }
    this.enterDoc(tab);
    if (fresh && doc.partial) this.toast(t('err.partial'), 7000);
    if (fresh && !this.convert) setTimeout(() => { if (this.doc) offerTour(this); }, 800);
  }
  // put the open document aside (kept in this browser if changed), remembering where it was
  stashDoc() {
    if (!this.doc) return;
    this.leaveMasters();
    if (this.editor.editing) this.editor.endEdit();
    if (this.dirty) this.keepNow();
    const tab = this.tabs.find((x) => x.doc === this.doc);
    if (tab) Object.assign(tab, { dirty: this.dirty, current: this.current || 0, zoom: this.autoFit ? null : this.zoom, used: Date.now() });
  }
  enterDoc(tab) {
    const doc = tab.doc, ed = this.editor;
    this.doc = doc; this.notes.clear(); this.current = Math.min(tab.current || 0, doc.pages.length - 1); this.dirty = !!tab.dirty; this.mergePreview = null; $('mergePanel').hidden = true;
    ed.history = tab.history; ed.sel = []; ed.editing = null; ed.pageIndex = this.current; this.updateToolbar();
    clearTimeout(this._t); $('toast').hidden = true; // drop any message left from the last file
    window.__doc = doc; // handy in tests
    $('start').hidden = true; $('thumbs').hidden = false; $('side').hidden = false; $('zoomBox').hidden = false;
    $('bSave').hidden = false; $('bKeep').hidden = false; $('bPrint').hidden = false; this.print.close(); this.print.closeCheck(); $('tools').hidden = false;
    for (const id of ['mastersPanel', 'guidesPanel']) if ($(id)) $(id).hidden = true;
    document.body.classList.add('has-doc');
    this.setTitle();
    this.embedded = loadEmbeddedFonts(doc);
    this.redraw(null);
    if (tab.zoom) this.setZoom(tab.zoom); else this.fit();
    this.renderSide();
    if (this.current) requestAnimationFrame(() => this.pageEls[this.current]?.scrollIntoView({ block: 'start' }));
  }
  switchTab(tab) { if (!tab || tab.doc === this.doc) return; this.stashDoc(); this.enterDoc(tab); }
  // closing a tab: changes are kept in this browser, as when leaving a document
  closeTab(tab) {
    const i = this.tabs.indexOf(tab); if (i < 0) return;
    const active = tab.doc === this.doc;
    if (active) this.stashDoc(); else if (tab.dirty) keepLocally(tab.doc);
    this.tabs.splice(i, 1);
    if (active) { const next = this.tabs[Math.min(i, this.tabs.length - 1)]; if (next) this.enterDoc(next); else this.goHome(); }
    this.renderTabs();
    if (tab.dirty) this.toast(t('tabs.kept', { name: tab.doc.name }), 7000);
  }
  // the strip of tabs shows when two or more documents are open (or one, from the start screen)
  renderTabs() {
    const box = this.tabsEl; if (!box) return;
    const show = this.tabs.length > 1 || (!this.doc && this.tabs.length > 0);
    box.hidden = !show; if (!show) { box.textContent = ''; return; }
    box.setAttribute('aria-label', t('tabs.label'));
    box.innerHTML = this.tabs.map((x, i) => {
      const on = x.doc === this.doc, dirty = on ? this.dirty : x.dirty, name = x.doc.name || '';
      return `<div class="dtab${on ? ' on' : ''}"><button type="button" class="dt-open" role="tab" aria-selected="${on}" data-tab="${i}" title="${esc(name)}">${esc(name)}${dirty ? `<span class="dt-dot" title="${esc(t('tabs.changed'))}">•</span>` : ''}</button><button type="button" class="dt-x" data-close="${i}" title="${esc(t('tabs.close', { name }))}" aria-label="${esc(t('tabs.close', { name }))}">×</button></div>`;
    }).join('');
    box.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => this.switchTab(this.tabs[+b.dataset.tab]); });
    box.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => this.closeTab(this.tabs[+b.dataset.close]); });
  }
  setTitle() { $('fname').hidden = false; $('fname').textContent = `${this.doc.name}${this.doc.source === 'pub' ? '.pub' : ''}${this.dirty ? ' •' : ''}`; document.title = `${this.doc.name} · Pubwork`; this.renderTabs(); }

  // ---------------------------------------------------------------- master pages
  // While master pages are changed they take the place of the pages (doc.pages), so every tool works on
  // them; they have their own undo steps. Saving puts them back where they belong (savable()).
  editMasters(index = 0) {
    if (!this.doc) return;
    if (!this.masterMode) {
      if (this.editor.editing) this.editor.endEdit();
      if (this.mergePreview != null) this.setMergePreview(null);
      this.merge.close(); this.print.close(); this.print.closeCheck(); this.closeSave();
      const d = this.doc; d.masters ||= [];
      if (!d.masters.length) { const pg = d.pages[this.current || 0]; d.masters.push({ id: uid('m'), w: pg.w, h: pg.h, items: [] }); this.touched(); }
      nameMasters(d.masters);
      this.masterMode = { pages: d.pages, current: this.current || 0, history: this.editor.history };
      d.pages = d.masters;
      this.editor.history = new History();
      document.body.classList.add('master-mode');
    }
    this.editor.sel = []; this.editor.pageIndex = this.current = Math.max(0, Math.min(index, this.doc.pages.length - 1));
    this.redraw(null); this.fit(); this.renderSide(); this.updateModeBar(); this.updateToolbar(); renderMastersPanel(this); renderGuidesPanel(this);
    if (this.current) requestAnimationFrame(() => this.pageEls[this.current]?.scrollIntoView({ block: 'start' }));
  }
  // back to the pages; why = 'export' says so (saving, printing and merging use the pages)
  leaveMasters(why = null) {
    const mm = this.masterMode; if (!mm || !this.doc) return false;
    if (this.editor.editing) this.editor.endEdit();
    const d = this.doc;
    d.masters = d.pages; d.pages = mm.pages; this.masterMode = null;
    const ids = new Set(d.masters.map((m) => m.id));
    for (const p of d.pages) if (typeof p.master === 'string' && !ids.has(p.master)) delete p.master; // its master page was deleted
    this.editor.history = mm.history; this.editor.sel = []; this.editor.pageIndex = this.current = Math.min(mm.current, d.pages.length - 1);
    document.body.classList.remove('master-mode');
    this.redraw(null); this.fit(); this.renderSide(); this.updateModeBar(); this.updateToolbar(); renderMastersPanel(this); renderGuidesPanel(this);
    if (this.current) requestAnimationFrame(() => this.pageEls[this.current]?.scrollIntoView({ block: 'start' }));
    if (why === 'export') this.toast(t('masters.closedFirst'), 4000);
    return true;
  }
  // the document as it is saved: while master pages are changed, everything back in its place
  savable() { return this.masterMode ? { ...this.doc, pages: this.masterMode.pages, masters: this.doc.pages } : this.doc; }
  updateModeBar() {
    const bar = this.modeBar; if (!bar) return;
    bar.hidden = !this.masterMode; if (!this.masterMode) { bar.textContent = ''; return; }
    const m = this.doc.pages[this.current || 0];
    bar.innerHTML = `<div class="mb-text"><b>${esc(t('masters.banner', { name: m?.name || '' }))}</b><span>${esc(t('masters.bannerHint'))}</span></div><button class="btn" type="button" id="mbManage">${esc(t('masters.manage'))}</button><button class="btn primary" type="button" id="mbDone">${esc(t('masters.done'))}</button>`;
    $('mbManage').onclick = () => openMasters(this);
    $('mbDone').onclick = () => this.leaveMasters();
  }
  // the "Master page" part of the panel on the right follows the page in view
  refreshMasterSide() { const box = $('msSideBox'); if (box && !this.masterMode) { box.innerHTML = mastersSide(this); wireMastersSide(this); } }
  // mail merge: show record i of the list on the pages (null: show the fields)
  setMergePreview(i) {
    const on = i != null && this.doc?.mergeData?.rows?.length;
    const next = on ? i : null;
    if (next === this.mergePreview) return false;
    if (this.editor.editing) this.editor.endEdit();
    this.mergePreview = next; this.editor.clear(); this.redraw(null);
    return true;
  }
  // draw pages again from the document: the given page numbers, or all (null)
  redraw(which) {
    const doc = this.doc, pagesEl = $('pages');
    const shown = this.mergePreview != null && doc.mergeData ? fillPages(doc.pages, doc.mergeData.rows[this.mergePreview]) : doc.pages;
    const note = (key, vars) => { const k = JSON.stringify([key, vars || {}]); this.notes.set(k, (this.notes.get(k) || 0) + 1); };
    const all = which == null || !this.pageEls || this.pageEls.length !== doc.pages.length;
    if (all) { pagesEl.textContent = ''; this.notes.clear(); this.pageEls = []; }
    const done = [];
    shown.forEach((pg, i) => {
      if (!all && !which.includes(i)) return;
      const r = renderPage(pg, doc, { embedded: this.embedded, note: all ? note : () => {} });
      if (all) pagesEl.appendChild(r.el); else this.pageEls[i].replaceWith(r.el);
      this.pageEls[i] = r.el; done.push(r.done);
      drawGuides(this, r.el, pg); // layout guides, over the page (never printed)
    });
    pagesEl.style.setProperty('--z', this.zoom);
    const f = this.atFullSize(() => { flowLinkedText(pagesEl, { embedded: this.embedded }); return fitText(all ? pagesEl : { querySelectorAll: (s) => (which || []).flatMap((i) => [...(this.pageEls[i]?.querySelectorAll(s) || [])]) }); });
    if (all) { this.overflowing = f.overflowing; this.fitted = f.fitted; }
    this.pictures = Promise.all(done);
    this.settled = this.settle(all);
    clearTimeout(this._thumbT); this._thumbT = setTimeout(() => this.renderThumbs(), all ? 0 : 250);
  }
  // text is flowed and fitted at 100%, so the result (and every export) is the same at any zoom or window size
  atFullSize(fn) {
    const pagesEl = $('pages'), desk = $('desk'), z = pagesEl.style.zoom;
    if (!z || +z === 1) return fn();
    const { scrollTop, scrollLeft } = desk;
    pagesEl.style.zoom = 1;
    try { return fn(); } finally { pagesEl.style.zoom = z; desk.scrollTop = scrollTop; desk.scrollLeft = scrollLeft; }
  }
  // text can only be measured once its fonts are in: then flow linked boxes and fit text again
  async settle(full = true) {
    await this.pictures; await document.fonts.ready;
    if (this.editor.editing) return;
    const pages = $('pages');
    const f = this.atFullSize(() => { flowLinkedText(pages, { embedded: this.embedded }); return fitText(pages); });
    if (full) { this.overflowing = f.overflowing; this.fitted = f.fitted; }
    this.editor.drawSelection();
    this.renderThumbs(); if (!this.editor.sel.length) this.renderSide();
  }
  renderThumbs() {
    const box = $('thumbs'); if (!this.doc) return;
    box.textContent = '';
    const many = this.doc.pages.length > 1;
    if (this.masterMode) { nameMasters(this.doc.pages); this.updateModeBar(); }
    this.doc.pages.forEach((pg, i) => {
      const b = document.createElement('button'); b.className = 'thumb' + (i === this.current ? ' on' : '');
      const k = 118 / (pg.w * PT);
      const mini = document.createElement('div'); mini.className = 'mini'; mini.style.width = `${pg.w * PT * k}px`; mini.style.height = `${pg.h * PT * k}px`;
      const copy = this.pageEls[i].cloneNode(true); // already flowed
      copy.querySelectorAll('.pw-ui').forEach((n) => n.remove());
      copy.style.transform = `scale(${k})`;
      mini.appendChild(copy); b.appendChild(mini);
      b.appendChild(document.createTextNode(this.masterMode ? pg.name || '' : t('thumb.page', { n: i + 1 })));
      b.onclick = () => { this.current = i; this.pageEls[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); this.renderThumbs(); };
      box.appendChild(b);
      if (i === this.current) {
        const bar = document.createElement('div'); bar.className = 'pagebar';
        const act = (key, fn, show = true) => { if (!show) return; const x = document.createElement('button'); x.textContent = t(key); x.onclick = fn; bar.appendChild(x); };
        act('page.up', () => this.movePage(i, -1), many && i > 0);
        act('page.down', () => this.movePage(i, 1), many && i < this.doc.pages.length - 1);
        act('page.copy', () => this.duplicatePage(i));
        act('page.delete', () => this.deletePage(i), many);
        box.appendChild(bar);
      }
    });
    const add = document.createElement('button'); add.className = 'addpage'; add.textContent = `+ ${t(this.masterMode ? 'masters.new' : 'page.add')}`;
    add.onclick = () => this.addPage(); box.appendChild(add);
  }
  setZoom(z, auto = false) {
    this.zoom = Math.min(8, Math.max(0.1, z)); this.autoFit = auto;
    $('pages').style.zoom = this.zoom; $('pages').style.setProperty('--z', this.zoom);
    $('zoomPct').textContent = `${Math.round(this.zoom * 100)}%`;
  }
  fit() {
    if (!this.doc) return;
    const desk = $('desk'), pg = this.doc.pages[0];
    // the padding around the pages is zoomed with them, so it is part of what has to fit
    const pad = 2 * (parseFloat(getComputedStyle($('pages')).paddingLeft) || 28);
    const k = Math.min(desk.clientWidth / (pg.w * PT + pad), desk.clientHeight / (pg.h * PT + pad)) * 0.98;
    this.setZoom(Math.max(0.1, k), true);
  }
  trackPage() {
    if (!this.pageEls) return;
    const top = $('desk').getBoundingClientRect().top + 80;
    let cur = 0; this.pageEls.forEach((p, i) => { if (p.getBoundingClientRect().top < top) cur = i; });
    if (cur !== this.current) { this.current = cur; this.renderThumbs(); this.refreshMasterSide(); }
  }
  // "A4 portrait", "US Letter landscape" or "85 × 55 mm"
  sizeName(pg) {
    const w = pg.w / 72 * 25.4, h = pg.h / 72 * 25.4; const near = (a, b) => Math.abs(a - b) < 1.5;
    for (const s of PAGE_SIZES) { if (s.plain && ((near(w, s.w) && near(h, s.h)) || (near(w, s.h) && near(h, s.w)))) return sizeLabel(s); if (near(w, s.w) && near(h, s.h)) return t('size.portrait', { name: sizeLabel(s) }); if (near(w, s.h) && near(h, s.w)) return t('size.landscape', { name: sizeLabel(s) }); }
    const inch = this.panel.unit === 'in';
    return inch ? `${+(pg.w / 72).toFixed(2)} × ${+(pg.h / 72).toFixed(2)} in` : `${Math.round(w)} × ${Math.round(h)} mm`;
  }
  async renderSide() {
    const d = this.doc; if (!d || this.editor.sel.length || this.editor.editing) return;
    const side = $('side');
    if (this.masterMode) { // changing master pages: what this master page is, and the guides
      side.innerHTML = `<div id="msSideBox">${mastersSide(this)}</div>${guidesSide(this)}`;
      wireMastersSide(this); wireGuidesSide(this); return;
    }
    const s = summarize(d);
    const sizeName = (pg) => this.sizeName(pg);
    const fonts = await fontReport(d, this.embedded);
    if (this.editor.sel.length || this.editor.editing || this.masterMode || d !== this.doc) return; // something got picked meanwhile
    const fontRows = fonts.map((f) => `<div class="fontrow"><span>${esc(f.original)}</span>${f.embedded ? `<span class="badge">${esc(t('font.inFile'))}</span>` : f.installed ? `<span class="badge">${esc(t('font.onComputer'))}</span>` : `<span class="badge${f.sameWidths ? '' : ' warn'}">${esc(t(f.sameWidths ? 'font.exact' : 'font.similar'))}</span>`}${!f.embedded && !f.installed ? `<small>${esc(t(f.sameWidths ? 'font.sameWidths' : 'font.shownWith', { font: f.standIn }))}</small>` : ''}</div>`).join('');
    const notes = [...this.notes].map(([k, n]) => { const [key, vars] = JSON.parse(k); return `<li>${esc(t(key, vars))}${n > 1 ? ` (${n})` : ''}</li>`; }).join('');
    const extra = (this.fitted ? `<li>${esc(t(this.fitted === 1 ? 'note.fitted1' : 'note.fittedN', { n: this.fitted }))}</li>` : '') + (this.overflowing ? `<li>${esc(t(this.overflowing === 1 ? 'note.over1' : 'note.overN', { n: this.overflowing }))}</li>` : '');
    side.innerHTML = `<p class="hint tip">${esc(t('side.tip'))}</p><h2>${esc(t('side.thisFile'))}</h2>
      <dl class="kv"><dt>${esc(t('side.pages'))}</dt><dd>${s.pages}</dd><dt>${esc(t('side.pageSize'))}</dt><dd>${esc(sizeName(d.pages[0]))}</dd><dt>${esc(t('side.textBoxes'))}</dt><dd>${s.text}</dd><dt>${esc(t('side.pictures'))}</dt><dd>${s.image}</dd><dt>${esc(t('side.shapes'))}</dt><dd>${s.shape}</dd>${s.table ? `<dt>${esc(t('side.tables'))}</dt><dd>${s.table}</dd>` : ''}${d.meta?.author ? `<dt>${esc(t('side.madeBy'))}</dt><dd>${esc(d.meta.author)}</dd>` : ''}</dl>
      ${this.designHtml()}
      ${this.pageSizeHtml()}
      <div id="msSideBox">${mastersSide(this)}</div>
      ${guidesSide(this)}
      ${fonts.length ? `<h2>${esc(t('side.fonts'))}</h2>${fontRows}` : ''}
      ${notes || extra ? `<h2>${esc(t('side.shownDifferently'))}</h2><ul class="notes">${notes}${extra}</ul>` : ''}`;
    this.wirePageSize(); this.wireDesign(); wireMastersSide(this); wireGuidesSide(this);
  }
  // ---------------------------------------------------------------- page size
  pageSizeHtml() {
    const pg = this.doc.pages[0], u = this.panel.unit, f = (v) => +this.panel.toUnit(v).toFixed(2);
    const groups = [['paper', 'pagesize.paper'], ['us', 'pagesize.us'], ['small', 'pagesize.small'], ['envelope', 'pagesize.envelope'], ['screen', 'pagesize.screen']];
    const opts = groups.map(([g, key]) => `<optgroup label="${esc(t(key))}">${PAGE_SIZES.filter((p) => p.group === g).map((p) => `<option value="${p.id}">${esc(sizeLabel(p))}</option>`).join('')}</optgroup>`).join('');
    return `<h2>${esc(t('pagesize.title'))}</h2>
      <div class="prow"><select id="psSel" aria-label="${esc(t('pagesize.title'))}"><option value="">${esc(t('pagesize.custom'))}</option>${opts}</select></div>
      <div class="pgrid"><label>${esc(t('panel.w'))}<input type="number" id="psW" step="0.1" min="1" value="${f(pg.w)}"></label><label>${esc(t('panel.h'))}<input type="number" id="psH" step="0.1" min="1" value="${f(pg.h)}"></label></div>
      <p class="hint">${esc(t('panel.units.' + u))}</p>
      <div class="prow"><button class="pbtn wide" id="psTurn" type="button">⟲ ${esc(t('pagesize.turn'))}</button></div>
      <label class="check"><input type="checkbox" id="psFit" checked> ${esc(t('pagesize.fit'))}</label>
      <div class="prow"><button class="btn primary" id="psApply" type="button" disabled>${esc(t('pagesize.apply'))}</button></div>`;
  }
  wirePageSize() {
    const sel = $('psSel'); if (!sel) return;
    const pg = this.doc.pages[0], W = $('psW'), H = $('psH'), P = this.panel;
    const MMPT = 72 / 25.4;
    const match = () => { const w = P.fromUnit(+W.value), h = P.fromUnit(+H.value); const s = PAGE_SIZES.find((p) => (Math.abs(p.w * MMPT - w) < 2 && Math.abs(p.h * MMPT - h) < 2) || (Math.abs(p.h * MMPT - w) < 2 && Math.abs(p.w * MMPT - h) < 2)); sel.value = s ? s.id : ''; };
    const dirty = () => { const w = P.fromUnit(+W.value), h = P.fromUnit(+H.value); $('psApply').disabled = !(w > 2 && h > 2) || (Math.abs(w - pg.w) < 0.5 && Math.abs(h - pg.h) < 0.5); };
    match(); dirty();
    sel.onchange = () => {
      const s = PAGE_SIZES.find((p) => p.id === sel.value); if (!s) return;
      let w = s.w * MMPT, h = s.h * MMPT;
      if (!s.plain && (pg.w > pg.h) !== (w > h)) [w, h] = [h, w]; // keep the page's way round
      W.value = +P.toUnit(w).toFixed(2); H.value = +P.toUnit(h).toFixed(2); dirty();
    };
    W.oninput = H.oninput = () => { match(); dirty(); };
    $('psTurn').onclick = () => { [W.value, H.value] = [H.value, W.value]; dirty(); };
    $('psApply').onclick = () => this.setPageSize(P.fromUnit(+W.value), P.fromUnit(+H.value), $('psFit').checked);
  }
  // every page gets the new size; the design is scaled to fit and centred, or left where it is
  setPageSize(w, h, fit) {
    if (!(w > 2 && h > 2)) return;
    this.pageChange(() => {
      for (const pg of [...this.doc.pages, ...(this.masterMode ? [] : this.doc.masters || [])]) { // master pages get the new size too
        if (fit) {
          const k = Math.min(w / pg.w, h / pg.h), dx = (w - pg.w * k) / 2, dy = (h - pg.h * k) / 2;
          for (const it of pg.items) { transformItem(it, ([x, y]) => [x * k + dx, y * k + dy], [k, k]); scaleStyle(it, k); }
        }
        pg.w = w; pg.h = h;
      }
    }, this.current || 0);
    this.fit();
  }
  updateToolbar() {
    const ed = this.editor;
    $('tUndo').disabled = !ed.history.canUndo && !ed.editing;
    $('tRedo').disabled = !ed.history.canRedo;
    $('tDelete').disabled = !ed.sel.length || !!ed.editing;
  }
  // the newer tools live in their own files and are loaded the first time they're used
  async runAction(act) {
    if (!this.doc && !['tour'].includes(act)) return;
    if (this.editor.editing && !['pageNumber', 'date', 'pageCount', 'find', 'spell', 'styles'].includes(act)) this.editor.endEdit();
    if (['share', 'pack'].includes(act)) this.leaveMasters('export');
    const go = {
      find: async () => (await import('./editor/find.js')).openFind(this),
      spell: async () => (await import('./editor/spell.js')).openSpell(this),
      styles: async () => (await import('./editor/styles.js')).openStyles(this),
      pageNumber: async () => (await import('./editor/fields.js')).insertField(this, 'page'),
      pageCount: async () => (await import('./editor/fields.js')).insertField(this, 'pages'),
      date: async () => (await import('./editor/fields.js')).insertField(this, 'date'),
      textFile: async () => (await import('./editor/insert.js')).insertTextFile(this),
      table: async () => (await import('./editor/insert.js')).insertTable(this),
      tableFromFile: async () => (await import('./editor/insert.js')).insertTableFromFile(this),
      chart: async () => (await import('./editor/insert.js')).insertChart(this),
      wordart: async () => (await import('./wordart/panel.js')).openWordArt(this, null),
      guides: async () => openGuides(this),
      masters: async () => openMasters(this),
      share: async () => (await import('./export/share.js')).share(this),
      pack: async () => (await import('./export/pack.js')).packAndGo(this),
      tour: async () => startTour(this),
    }[act];
    try { await go?.(); } catch (err) { console.error(err); this.toast(t('err.save', { why: err?.message || String(err) }), 8000); }
  }
  openWordArt(id) { import('./wordart/panel.js').then((m) => m.openWordArt(this, id)); }
  snapLines(page) { return snapLines(this, page); }
  openMenu(menu = 'shapeMenu', btn = 'tShape') { this.closeMenu(); const r = $(btn).getBoundingClientRect(), m = $(menu); m.hidden = false; m.style.left = `${Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8))}px`; m.style.top = `${r.bottom + 4}px`; $(btn).setAttribute('aria-expanded', 'true'); m.querySelector('button').focus(); }
  // focusBack: Esc puts the keyboard back on the button that opened the menu
  closeMenu(focusBack = false) { for (const [m, b] of [['shapeMenu', 'tShape'], ['picMenu', 'tPic'], ['moreMenu', 'tMore']]) { const was = !$(m).hidden; $(m).hidden = true; $(b).setAttribute('aria-expanded', 'false'); if (was && focusBack) $(b).focus(); } }
  // arrow keys, Home and End move through a menu's choices
  menuKeys() {
    for (const id of ['shapeMenu', 'picMenu', 'moreMenu']) $(id).addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: 'first', End: 'last' };
      if (!(e.key in keys)) return;
      const items = [...$(id).querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null);
      if (!items.length) return;
      e.preventDefault(); e.stopPropagation();
      const i = items.indexOf(document.activeElement), k = keys[e.key];
      const next = k === 'first' ? 0 : k === 'last' ? items.length - 1 : (i + k + items.length) % items.length;
      items[i < 0 && typeof k === 'number' ? (k > 0 ? 0 : items.length - 1) : next].focus();
    });
  }

  // ---------------------------------------------------------------- adding things
  // the page in view, where new things go
  targetPage() { const i = this.editor.sel.length ? this.editor.pageIndex : this.current || 0; this.editor.pageIndex = i; return this.doc.pages[i]; }
  insertText() {
    if (!this.doc) return;
    const pg = this.targetPage(), w = pg.w * 0.6;
    this.editor.add({ type: 'text', x: (pg.w - w) / 2, y: pg.h * 0.25, w, h: 44, pad: [3.6, 3.6, 3.6, 3.6], valign: 'top', columns: 1, columnGap: 0, edited: true, autoGrow: true, fill: null, stroke: null,
      paras: [{ align: 'center', runs: [{ text: t('new.text'), font: 'Arial', size: 28 }] }] }, { edit: true });
  }
  pickPicture(cb) { this._picCb = cb; $('picFile').click(); }
  async readPicture(file, max = 2400) {
    // big phone photos are made smaller so documents stay quick to save and open
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    const img = new Image(); img.src = url; await img.decode();
    let w = img.naturalWidth, h = img.naturalHeight, data = url, mime = file.type || 'image/png';
    if (Math.max(w, h) > max || !/^image\/(png|jpeg|gif)$/.test(mime)) {
      const k = Math.min(1, max / Math.max(w, h)); const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      mime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
      data = c.toDataURL(mime, 0.9); w = c.width; h = c.height;
    }
    return { mime, data: data.slice(data.indexOf(',') + 1), w, h };
  }
  async insertPicture(file) {
    if (!this.doc) return;
    try {
      const p = await this.readPicture(file), pg = this.targetPage();
      const k = Math.min((pg.w * 0.6) / p.w, (pg.h * 0.6) / p.h);
      const w = p.w * k, h = p.h * k;
      this.editor.add({ type: 'image', x: (pg.w - w) / 2, y: (pg.h - h) / 2, w, h, mime: p.mime, data: p.data, wrap: 'square' });
    } catch { this.toast(t('err.picture')); }
  }
  async replacePicture(file) {
    const pics = this.editor.selectedItems().filter((it) => it.type === 'image');
    if (pics.length === 1) { await this.fillPicture(pics[0].id, file); return; }
    try {
      const p = await this.readPicture(file);
      // keep the box, fill it the way Publisher does: the new picture keeps its own shape inside it
      this.editor.setProps((it) => { if (it.type !== 'image') return; const k = Math.min(it.w / p.w, it.h / p.h), w = p.w * k, h = p.h * k; it.x += (it.w - w) / 2; it.y += (it.h - h) / 2; it.w = w; it.h = h; it.mime = p.mime; it.data = p.data; delete it.adjust; delete it.points; }, 'picture');
    } catch { this.toast(t('err.picture')); }
  }
  insertShape(kind) {
    if (!this.doc) return;
    const pg = this.targetPage(), w = Math.min(200, pg.w * 0.4), h = kind === 'line' ? 0 : kind === 'ellipse' || kind === 'star' ? w : w * 0.6;
    const x = (pg.w - w) / 2, y = (pg.h - h) / 2;
    const fill = { type: 'solid', color: '#f0874d', opacity: 1 };
    let item;
    if (kind === 'line') item = { type: 'shape', kind: 'polyline', x, y, w, h: 0, points: [[x, y], [x + w, y]], fill: null, stroke: { color: '#222222', width: 2 } };
    else if (kind === 'star') {
      const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? w * 0.2 : w / 2; pts.push([x + w / 2 + r * Math.cos(a), y + h / 2 + r * Math.sin(a) + w * 0.05]); }
      const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
      item = { type: 'shape', kind: 'polygon', x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), points: pts, fill, stroke: null };
    } else item = { type: 'shape', kind: kind === 'ellipse' ? 'ellipse' : 'rect', x, y, w, h, rx: kind === 'rounded' ? 14 : 0, fill, stroke: null };
    this.editor.add(item);
  }

  // ---------------------------------------------------------------- start screen, templates, pictures
  // back to the start screen; open documents stay open in their tabs
  goHome() {
    if (!this.doc) return;
    this.stashDoc();
    if (this.convert) this.tabs = [];
    this.print.close(); this.print.closeCheck(); this.closeSave(); $('artPanel').hidden = true; $('detailsPanel').hidden = true; $('mergePanel').hidden = true; $('calPanel').hidden = true; this.mergePreview = null;
    for (const id of ['mastersPanel', 'guidesPanel']) if ($(id)) $(id).hidden = true;
    this.editor.history = new History(); // the documents' own undo steps stay with their tabs
    this.editor.reset(); this.doc = null; this.dirty = false; window.__doc = null;
    $('pages').textContent = ''; this.pageEls = [];
    $('start').hidden = false; for (const id of ['thumbs', 'side', 'zoomBox', 'bSave', 'bKeep', 'tools', 'bPrint']) $(id).hidden = true;
    document.body.classList.remove('has-doc', 'has-sel');
    $('fname').textContent = ''; $('fname').hidden = true; document.title = 'Pubwork';
    this.renderRecent(); this.renderTabs();
  }
  async openGallery(cat = null) {
    this.busy(true, t('busy.building'));
    try {
      const { Gallery } = await import('./gallery.js');
      this.gallery ||= new Gallery(this);
      await this.gallery.open(cat);
    } catch (err) { console.error(err); this.toast(t('err.sample')); } finally { this.busy(false); }
  }
  async openCalMaker(o = {}) {
    try {
      const { CalMaker } = await import('./calmaker/panel.js');
      this.calMaker ||= new CalMaker(this);
      this.calMaker.open(o);
    } catch (err) { console.error(err); this.toast(t('err.sample')); }
  }
  async openArt(cat = null) {
    if (!this.doc) return;
    await loadArt();
    const cats = artCategories(), names = Object.keys(cats);
    this._artCat = cat || this._artCat || names[0];
    $('artCats').innerHTML = names.map((c) => `<button data-cat="${c}" class="${c === this._artCat ? 'on' : ''}">${esc(t('art.' + c))}</button>`).join('');
    $('artCats').querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => this.openArt(b.dataset.cat); });
    const col = this.doc.scheme ? schemeColors(this.doc.scheme).primary : '#333333';
    $('artGrid').innerHTML = cats[this._artCat].map((id) => { const it = artItem(id, 0, 0, 1, 1, { color: col }); return `<button data-art="${esc(id)}" title="${esc(id.replace(/^i:/, '').replace(/-/g, ' '))}"><img alt="${esc(id.replace(/^i:/, '').replace(/-/g, ' '))}" src="data:image/svg+xml;base64,${it.data}"></button>`; }).join('');
    $('artGrid').querySelectorAll('[data-art]').forEach((b) => { b.onclick = () => this.insertArt(b.dataset.art); });
    $('artPanel').hidden = false;
  }
  insertArt(id) {
    const pg = this.targetPage(), icon = id.startsWith('i:'), size = Math.min(pg.w, pg.h) * (icon ? 0.12 : 0.25);
    const col = this.doc.scheme ? schemeColors(this.doc.scheme).primary : '#333333';
    this.editor.add(artItem(id, (pg.w - size) / 2, (pg.h - size) / 2, size, size, { color: col }));
    if (innerWidth < 700) $('artPanel').hidden = true;
  }
  // ready-made pieces, drawn in this document's colours and fonts
  async openBlocks(cat = null) {
    if (!this.doc) return;
    const [{ BLOCKS, BLOCK_CATS, blockPreview }, { STRINGS }, { renderPage }] = await Promise.all([import('./templates/blocks.js'), import('./templates/catalog.js'), import('./render.js')]);
    this._blockCat = cat || this._blockCat || BLOCK_CATS[0];
    $('blockCats').innerHTML = BLOCK_CATS.map((c) => `<button data-cat="${c}" class="${c === this._blockCat ? 'on' : ''}">${esc(t('blk.cat.' + c))}</button>`).join('');
    $('blockCats').querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => this.openBlocks(b.dataset.cat); });
    $('qrRow').hidden = this._blockCat !== 'qr';
    const grid = $('blockGrid'); grid.textContent = '';
    const opts = { scheme: this.doc.scheme || 'orange', fonts: this.doc.fontPair || 'modern', strings: STRINGS, lang: this.lang };
    $('blocksPanel').hidden = false;
    for (const bl of BLOCKS.filter((b) => b.cat === this._blockCat)) {
      const btn = document.createElement('button'); btn.className = 'blk'; btn.title = t('blk.' + bl.id);
      const page = await blockPreview(bl, { ...opts, url: $('qrUrl').value || undefined });
      const r = renderPage(page, this.doc, {}), k = Math.min(150 / (page.w * PT), 110 / (page.h * PT));
      r.el.style.transform = `scale(${k})`; r.el.style.boxShadow = 'none';
      const mini = document.createElement('span'); mini.className = 'bmini'; mini.style.width = `${page.w * PT * k}px`; mini.style.height = `${page.h * PT * k}px`;
      mini.appendChild(r.el); btn.appendChild(mini);
      const lab = document.createElement('span'); lab.textContent = t('blk.' + bl.id); btn.appendChild(lab);
      btn.onclick = () => this.insertBlock(bl.id);
      grid.appendChild(btn);
      if (r.el.querySelector('.flow span.tab')) { const { layoutTabs } = await import('./render.js'); r.el.querySelectorAll('.it.text').forEach((b) => layoutTabs(b)); } // leaders need the box on screen
    }
  }
  async insertBlock(id) {
    const [{ BLOCKS, blockItems }, { STRINGS }] = await Promise.all([import('./templates/blocks.js'), import('./templates/catalog.js')]);
    const bl = BLOCKS.find((b) => b.id === id); if (!bl) return;
    const pg = this.targetPage();
    const url = $('qrUrl').value.trim() || loadDetails().web || 'https://www.example.com';
    const g = await blockItems(bl, { scheme: this.doc.scheme || 'orange', fonts: this.doc.fontPair || 'modern', strings: STRINGS, lang: this.lang, page: pg, url: /^https?:/i.test(url) || !/\./.test(url) ? url : `https://${url}` });
    for (const it of g.items) for (const p of it.paras || []) for (const r of p.runs) this.doc.fonts[r.font] = (this.doc.fonts[r.font] || 0) + 1;
    fillDetails({ pages: [{ items: [g] }] }, loadDetails());
    this.editor.add(g);
    if (innerWidth < 700) $('blocksPanel').hidden = true;
  }
  insertFrame() {
    if (!this.doc) return;
    const pg = this.targetPage(), w = pg.w * 0.5, h = pg.h * 0.3;
    this.editor.add({ type: 'image', x: (pg.w - w) / 2, y: (pg.h - h) / 2, w, h, placeholder: true, wrap: 'square' });
  }
  // put a picture into a picture frame: it fills the frame, and what sticks out is cut off
  async fillPicture(id, file) {
    let p; try { p = await this.readPicture(file); } catch { this.toast(t('err.picture')); return; }
    const hit = findItem(this.doc, id); if (!hit || hit.it.type !== 'image') return;
    const it = hit.it, ratio = it.w / Math.max(1, it.h);
    let { data, mime } = p;
    if (Math.abs(p.w / p.h - ratio) > 0.01) {
      const img = new Image(); img.src = `data:${p.mime};base64,${p.data}`; await img.decode();
      let sw = p.w, sh = p.h; if (p.w / p.h > ratio) sw = p.h * ratio; else sh = p.w / ratio;
      const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
      c.getContext('2d').drawImage(img, (p.w - sw) / 2, (p.h - sh) / 2, sw, sh, 0, 0, c.width, c.height);
      mime = p.mime === 'image/png' ? 'image/png' : 'image/jpeg';
      const url = c.toDataURL(mime, 0.9); data = url.slice(url.indexOf(',') + 1);
    }
    const pageIndex = this.doc.pages.indexOf(hit.page);
    this.editor.change('picture', () => {
      it.data = data; it.mime = mime;
      delete it.placeholder; delete it.art; delete it.tint; delete it.adjust;
      if (it.round) { const pts = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push([it.x + it.w / 2 + (it.w / 2) * Math.cos(a), it.y + it.h / 2 + (it.h / 2) * Math.sin(a)]); } it.points = pts; }
    }, [pageIndex]);
  }
  // ---------------------------------------------------------------- design: colours, fonts, my details
  designHtml() {
    const d = this.doc, cur = d.scheme || '';
    return `<h2>${esc(t('design.title'))}</h2>
      <p class="hint">${esc(t('design.colours'))}</p>
      <div class="ds-schemes">${Object.entries(SCHEMES).map(([id, c]) => `<button class="sch${cur === id ? ' on' : ''}" data-ds-scheme="${id}" title="${esc(t('scheme.' + id))}" aria-label="${esc(t('scheme.' + id))}">${c.slice(0, 3).map((x) => `<i style="background:${x}"></i>`).join('')}</button>`).join('')}</div>
      <div class="prow"><select id="dsFonts" aria-label="${esc(t('design.fonts'))}"><option value="">${esc(t('design.fonts'))}…</option>${Object.keys(FONT_PAIRS).map((id) => { const p = fontPair(id); return `<option value="${id}"${d.fontPair === id ? ' selected' : ''}>${esc(t('fonts.' + id))} · ${esc(p.heading)} + ${esc(p.body)}</option>`; }).join('')}</select></div>
      <div class="prow wrap"><button class="btn" id="dsDetails">${esc(t('details.button'))}</button><button class="btn" id="dsMine">${esc(t('design.saveMine'))}</button></div>`;
  }
  wireDesign() {
    document.querySelectorAll('[data-ds-scheme]').forEach((b) => { b.onclick = () => this.changeDesign(() => applyScheme(this.doc, b.dataset.dsScheme)); });
    const f = $('dsFonts'); if (f) f.onchange = () => { if (f.value) this.changeDesign(() => applyFonts(this.doc, f.value)); };
    const det = $('dsDetails'); if (det) det.onclick = () => this.openDetails();
    const mine = $('dsMine'); if (mine) mine.onclick = async () => { const ok = await saveMine(this.doc, this.doc.name); this.toast(t(ok ? 'design.savedMine' : 'err.save', { name: this.doc.name, why: '' }), 5000); };
  }
  changeDesign(fn) { this.editor.change('design', fn, this.doc.pages.map((_, i) => i)); }
  openDetails() {
    const d = loadDetails();
    $('detFields').innerHTML = FIELDS.map((f) => f === 'address'
      ? `<label class="wide">${esc(t(f === 'title' ? 'details.title2' : 'details.' + f))}<textarea data-field="${f}">${esc(d[f] || '')}</textarea></label>`
      : `<label${f === 'tagline' ? ' class="wide"' : ''}>${esc(t(f === 'title' ? 'details.title2' : 'details.' + f))}<input data-field="${f}" value="${esc(d[f] || '')}"${f === 'email' ? ' type="email"' : f === 'phone' ? ' type="tel"' : ''}></label>`).join('');
    this._logo = d.logo || null; this.showLogo();
    $('detFill').hidden = !this.doc;
    $('detailsPanel').hidden = false;
    $('detFields').querySelector('input')?.focus();
  }
  showLogo() { $('detLogo').innerHTML = this._logo ? `<img alt="" src="data:${this._logo.mime};base64,${this._logo.data}">` : ''; $('detLogoClear').hidden = !this._logo; }
  saveDetailsForm(fill) {
    const d = {}; $('detFields').querySelectorAll('[data-field]').forEach((e) => { d[e.dataset.field] = e.value.trim(); });
    if (this._logo) d.logo = this._logo;
    if (!saveDetails(d)) this.toast(t('details.notSaved'), 6000);
    $('detailsPanel').hidden = true;
    if (fill && this.doc) {
      let n = 0; this.changeDesign(() => { n = fillDetails(this.doc, d); });
      this.toast(t(n ? 'details.filled' : 'details.nothing', { n }), 5000);
    } else this.toast(t('details.saved'), 4000);
  }

  // ---------------------------------------------------------------- pages
  pageChange(fn, focus) {
    const ed = this.editor; if (ed.editing) ed.endEdit();
    ed.history.save(this.doc, 'pages'); fn();
    ed.sel = []; ed.pageIndex = Math.max(0, Math.min(focus, this.doc.pages.length - 1)); this.current = ed.pageIndex;
    this.redraw(null); this.panel.show(); this.updateToolbar(); this.touched();
    requestAnimationFrame(() => this.pageEls[this.current]?.scrollIntoView({ block: 'start' }));
  }
  addPage() { const i = this.current || 0, pg = this.doc.pages[i]; this.pageChange(() => this.doc.pages.splice(i + 1, 0, { id: uid(this.masterMode ? 'm' : 'p'), w: pg.w, h: pg.h, items: [] }), i + 1); }
  duplicatePage(i) {
    const copy = clone(this.doc.pages[i]); copy.id = uid(this.masterMode ? 'm' : 'p'); copy.items.forEach(reId);
    if (this.masterMode) delete copy.name; // a copy of a master page gets a name of its own
    this.pageChange(() => this.doc.pages.splice(i + 1, 0, copy), i + 1);
  }
  deletePage(i) { if (this.doc.pages.length > 1) this.pageChange(() => this.doc.pages.splice(i, 1), i - 1 < 0 ? 0 : i - 1); }
  movePage(i, d) { const j = i + d; if (j < 0 || j >= this.doc.pages.length) return; this.pageChange(() => { const p = this.doc.pages; [p[i], p[j]] = [p[j], p[i]]; }, j); }

  // ---------------------------------------------------------------- keeping work
  touched() { this.dirty = true; this.setTitle(); clearTimeout(this._keepT); this._keepT = setTimeout(() => this.keepNow(), 1500); }
  async keepNow() {
    if (!this.doc) return;
    try { this.editor?.flush?.(); } catch { /* keep what we have */ }
    clearTimeout(this._keepT);
    const ok = await keepLocally(this.savable());
    if (ok) { this.kept = Date.now(); trimLocal(); }
  }
  async saveOwn() {
    if (!this.doc) return;
    if (this.editor.editing) this.editor.endEdit();
    const blob = toPubwork(this.savable()), name = `${safeName(this.doc.name)}${OWN_EXT}`;
    const how = await download(blob, name);
    if (how === 'saved') track('save', { format: 'pubwork' });
    if (how === 'saved') { this.dirty = false; this.setTitle(); this.keepNow(); this.toast(t('keep.done', { name }), 5000); }
    else if (how === 'blocked') this.toast(t('save.blocked'), 9000);
  }
  async renderRecent() {
    const box = $('recent'); if (!box) return;
    const list = await listLocal();
    box.hidden = !list.length;
    const fmt = new Intl.DateTimeFormat(this.lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    box.querySelector('ul').innerHTML = list.slice(0, 6).map((w) => `<li><button class="open" data-uid="${esc(w.uid)}"><span>${esc(w.name)}</span><small>${esc(fmt.format(w.updated))}</small></button><button class="forget" data-forget="${esc(w.uid)}" aria-label="${esc(t('recent.forget', { name: w.name }))}" title="${esc(t('recent.forget', { name: w.name }))}">×</button></li>`).join('');
    box.querySelectorAll('[data-uid]').forEach((b) => { b.onclick = () => this.openLocal(b.dataset.uid); });
    box.querySelectorAll('[data-forget]').forEach((b) => { b.onclick = async () => { await forgetLocal(b.dataset.forget); this.renderRecent(); }; });
  }

  // ---------------------------------------------------------------- saving copies
  openSave() {
    if (!this.doc) return;
    this.leaveMasters('export');
    this.print.close(); this.print.closeCheck();
    if (this.editor.editing) this.editor.endEdit();
    const n = this.doc.pages.length;
    $('pagesRow').hidden = n < 2;
    $('pagesCur').textContent = t('save.thisPage', { n: (this.current || 0) + 1 });
    this.updateSavePanel();
    $('savePanel').hidden = false; $('bSave').setAttribute('aria-expanded', 'true');
    $('saveGo').focus({ preventScroll: true });
  }
  closeSave() { $('savePanel').hidden = true; $('bSave').setAttribute('aria-expanded', 'false'); }
  saveChoice() {
    const v = (name) => document.querySelector(`#savePanel input[name="${name}"]:checked`)?.value;
    const pages = v('pages') === 'current' && this.doc.pages.length > 1 ? [this.current || 0] : null;
    return { format: v('fmt') || 'pdf', size: v('size') || 'social', pages };
  }
  updateSavePanel() {
    if (!this.doc) return;
    const o = this.saveChoice();
    $('sizeRow').hidden = !(o.format === 'jpg' || o.format === 'png');
    $('pagesRow').hidden = this.doc.pages.length < 2 || !['pdf', 'jpg', 'png'].includes(o.format);
    $('fmtOdg').hidden = $('fmtXps').hidden = $('fmtEml').hidden = IN_ARTIFACT; // the artifact viewer can't save .odg, .xps or .eml files
    $('saveGo').textContent = t('save.go', { format: FORMAT_NAME[o.format] });
    const many = (o.pages ? o.pages.length : this.doc.pages.length) > 1;
    $('saveHint').textContent = (o.format === 'jpg' || o.format === 'png') && many ? t('save.zipHint') : '';
    $('saveHint').hidden = !$('saveHint').textContent;
  }
  async save({ format, size, pages }) {
    if (this.saving) return;
    if (this.editor.editing) this.editor.endEdit();
    this.leaveMasters('export');
    this.saving = true;
    const progress = (k, total) => this.busy(true, k >= total ? t('busy.finishing') : t('busy.page', { n: k + 1, total }));
    progress(0, (pages || this.pageEls).length);
    if (!['pdf', 'jpg', 'png'].includes(format)) this.busy(true, t('busy.finishing'));
    try {
      await this.settled;
      const out = await this.exportOut(format, { size, pages, onProgress: progress });
      window.__lastSave = out; // tests read the result here
      const how = await download(out.blob, out.name);
      if (how === 'saved') track('save', { format, size: ['jpg', 'png'].includes(format) ? size : undefined, pages: (pages || this.pageEls).length });
      const pics = out.report?.picturePages;
      if (how === 'saved') this.toast(pics ? t('save.donePictures', { name: out.name, n: pics }) : t('save.done', { name: out.name }), 6000);
      else if (how === 'blocked') this.toast(t('save.blocked'), 9000);
    } catch (err) {
      console.error(err); track('save-failed', { format });
      this.toast(t('err.save', { why: err?.message || String(err) }), 9000);
    } finally { this.saving = false; this.busy(false); }
  }
}
// files dropped on the page, with the files inside any dropped folders (their paths kept)
async function filesFromDrop(dt) {
  const entries = [...dt.items || []].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.some((e) => e.isDirectory)) return [...dt.files];
  const out = [];
  const walk = async (entry, prefix) => {
    if (entry.isFile) { const f = await new Promise((res, rej) => entry.file(res, rej)); out.push(Object.defineProperty(f, 'webkitRelativePath', { value: prefix + f.name, configurable: true })); return; }
    const reader = entry.createReader();
    for (;;) { const batch = await new Promise((res, rej) => reader.readEntries(res, rej)); if (!batch.length) break; for (const e of batch) await walk(e, `${prefix}${entry.name}/`); }
  };
  for (const e of entries) await walk(e, '');
  return out;
}
// a PDF, Word, ODG or pictures of the open document -> { blob, name, report? }
App.prototype.exportOut = async function exportOut(format, { size = 'print', pages = null, onProgress } = {}) {
  if (format === 'pdf') { const { exportPdf } = await import('./export/pdf.js'); return exportPdf(this.doc, this.pageEls, { pages, embeddedFonts: embeddedFontBytes, onProgress }); }
  if (format === 'docx') { const { exportDocx } = await import('./export/docx.js'); return exportDocx(this.doc, this.pageEls); }
  if (format === 'odg') { const { exportOdg } = await import('./export/odg.js'); return exportOdg(this.doc, this.pageEls); }
  if (format === 'pptx') { const { exportPptx } = await import('./export/pptx.js'); return exportPptx(this.doc, this.pageEls); }
  if (format === 'html') { const { exportHtml } = await import('./export/html.js'); return exportHtml(this.doc, this.pageEls); }
  if (format === 'eml') { const { exportEml } = await import('./export/eml.js'); return exportEml(this.doc, this.pageEls); }
  if (format === 'xps') { const { exportXps } = await import('./export/xps.js'); return exportXps(this.doc, this.pageEls); }
  const { exportImages } = await import('./export/images.js');
  return exportImages(this.doc, this.pageEls, { format, size, pages, onProgress });
};
window.app = new App();
