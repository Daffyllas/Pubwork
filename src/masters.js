// Master pages: what repeats on many pages (a coloured band, a logo, page numbers). A page shows its master
// page's things behind its own when `page.master` is that master page's id (render.js draws them).
// Master pages live in doc.masters. To change one, the app swaps them in place of the pages for a while
// (app.editMasters / app.leaveMasters in main.js), so all the normal tools work on them.
import { t } from './i18n/index.js';
import { uid, clone, reId } from './editor/model.js';
import { renderPage } from './render.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (id) => document.getElementById(id);
const PT = 96 / 72;

// the master pages and the document's own pages, wherever they are right now
export const mastersOf = (app) => (app.masterMode ? app.doc.pages : (app.doc.masters ||= []));
export const pagesOf = (app) => (app.masterMode ? app.masterMode.pages : app.doc.pages);
const usedOn = (app, id) => pagesOf(app).filter((p) => p.master === id).length;
const usedText = (n) => (n ? t(n === 1 ? 'masters.usedOn1' : 'masters.usedOnN', { n }) : t('masters.unused'));

// every master page gets a name people can tell apart: Master A, Master B …
export function nameMasters(list) {
  const taken = new Set();
  const named = list.map((m) => { const ok = m.name && !taken.has(m.name); if (ok) taken.add(m.name); return ok; });
  let k = 0;
  list.forEach((m, i) => {
    if (named[i]) return;
    let name; do { name = t('masters.default', { letter: k < 26 ? String.fromCharCode(65 + k) : k + 1 }); k++; } while (taken.has(name));
    m.name = name; taken.add(name);
  });
  return list;
}
export const masterName = (m) => m?.name || '';

// ------------------------------------------------------------------ changing the list of master pages
// (these change doc.masters directly; choosing which pages use a master page can be undone)
export function newMaster(app) {
  const list = mastersOf(app), size = pagesOf(app)[app.masterMode ? 0 : app.current || 0] || pagesOf(app)[0];
  const m = { id: uid('m'), w: size.w, h: size.h, items: [] };
  list.push(m); nameMasters(list); changed(app);
  return m;
}
export function duplicateMaster(app, id) {
  const list = mastersOf(app), i = list.findIndex((m) => m.id === id); if (i < 0) return null;
  const copy = clone(list[i]); copy.id = uid('m'); delete copy.name; copy.items.forEach(reId);
  list.splice(i + 1, 0, copy); nameMasters(list); changed(app);
  return copy;
}
export function renameMaster(app, id, name) {
  const list = mastersOf(app), m = list.find((x) => x.id === id), v = String(name || '').trim();
  if (!m || !v || v === m.name) return;
  if (list.some((x) => x !== m && x.name === v)) return; // two master pages with one name would be confusing
  m.name = v; changed(app);
}
export function deleteMaster(app, id) {
  const list = mastersOf(app), i = list.findIndex((m) => m.id === id); if (i < 0) return;
  const n = usedOn(app, id);
  if (n && !window.confirm(t('masters.deleteAsk', { name: list[i].name, n }))) return;
  list.splice(i, 1);
  for (const p of pagesOf(app)) if (p.master === id) delete p.master;
  if (app.masterMode && !list.length) { app.leaveMasters(); renderPanel(app); return; }
  changed(app);
}
// which pages use a master page: 'this' (the page in view) or 'all'; id null = none
export function useMaster(app, id, which = 'this') {
  if (app.masterMode) return;
  const pages = app.doc.pages, idx = which === 'all' ? pages.map((_, i) => i) : [app.current || 0];
  const m = id ? mastersOf(app).find((x) => x.id === id) : null;
  app.editor.change('master page', () => { for (const i of idx) { if (m) pages[i].master = m.id; else delete pages[i].master; } }, idx);
  const n = (app.current || 0) + 1;
  app.toast(m ? t(which === 'all' ? 'masters.appliedAll' : 'masters.applied1', { name: m.name, n }) : t(which === 'all' ? 'masters.removedAll' : 'masters.removed1', { n }), 3500);
  renderPanel(app);
}
function changed(app) {
  const ed = app.editor;
  if (ed.editing) ed.endEdit();
  if (app.masterMode) {
    const last = app.doc.pages.length - 1;
    ed.sel = []; ed.pageIndex = Math.max(0, Math.min(ed.pageIndex, last)); app.current = Math.max(0, Math.min(app.current || 0, last));
  }
  app.redraw(null); app.touched(); app.renderSide(); app.updateModeBar?.();
  renderPanel(app);
}

// ------------------------------------------------------------------ the "Master pages" panel
export function openMasters(app) {
  if (!app.doc) return;
  let p = $('mastersPanel');
  if (!p) {
    p = document.createElement('div'); p.id = 'mastersPanel'; p.className = 'panel ms-panel';
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'false'); p.setAttribute('aria-labelledby', 'msTitle');
    document.body.appendChild(p);
  }
  $('guidesPanel')?.setAttribute('hidden', '');
  p.hidden = false;
  renderPanel(app);
  p.querySelector('button')?.focus({ preventScroll: true });
}
export function closeMasters() { const p = $('mastersPanel'); if (p) p.hidden = true; }

function preview(m, doc, box) {
  const k = Math.min(64 / (m.w * PT), 64 / (m.h * PT));
  const r = renderPage(m, doc, {});
  r.el.style.transform = `scale(${k})`; r.el.style.boxShadow = 'none';
  box.style.width = `${m.w * PT * k}px`; box.style.height = `${m.h * PT * k}px`;
  box.appendChild(r.el);
}

export function renderPanel(app) {
  const p = $('mastersPanel'); if (!p || p.hidden) return;
  if (!app.doc) { p.hidden = true; return; }
  const list = nameMasters(mastersOf(app)), cur = app.masterMode ? null : app.doc.pages[app.current || 0];
  const rows = list.map((m) => `<div class="ms-row" data-id="${esc(m.id)}"><span class="ms-mini"></span><div class="ms-info"><b class="ms-name">${esc(m.name)}</b><small>${esc(usedText(usedOn(app, m.id)))}</small>
    <div class="ms-acts"><button type="button" data-ms="edit">${esc(t('masters.edit'))}</button><button type="button" data-ms="dup">${esc(t('masters.duplicate'))}</button><button type="button" data-ms="ren">${esc(t('masters.rename'))}</button><button type="button" data-ms="del" class="danger">${esc(t('masters.delete'))}</button></div></div></div>`).join('');
  const opts = (sel) => `<option value="">${esc(t('masters.none'))}</option>` + list.map((m) => `<option value="${esc(m.id)}"${sel === m.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
  p.innerHTML = `<h2 id="msTitle">${esc(t('masters.title'))}</h2>
    <p class="hint">${esc(t('masters.hint'))}</p>
    <div class="ms-list">${rows || `<p class="hint">${esc(t('masters.empty'))}</p>`}</div>
    <div><button class="btn" type="button" id="msNew">+ ${esc(t('masters.new'))}</button></div>
    ${!app.masterMode && list.length ? `<fieldset><legend>${esc(t('masters.use'))}</legend>
      <div class="prow"><select id="msPick" aria-label="${esc(t('masters.which'))}">${opts(typeof cur?.master === 'string' ? cur.master : list[0].id)}</select></div>
      <div class="prow wrap"><button class="btn" type="button" id="msThis">${esc(t('masters.onThis'))} (${esc(t('thumb.page', { n: (app.current || 0) + 1 }))})</button><button class="btn" type="button" id="msAll">${esc(t('masters.onAll'))}</button></div></fieldset>` : ''}
    <div class="actions">${app.masterMode ? `<button class="btn primary" type="button" id="msDone">${esc(t('masters.done'))}</button>` : ''}<button class="btn" type="button" id="msClose">${esc(t('guides.close'))}</button></div>`;
  p.querySelectorAll('.ms-row').forEach((row) => {
    const id = row.dataset.id, m = list.find((x) => x.id === id);
    preview(m, app.doc, row.querySelector('.ms-mini'));
    row.querySelector('[data-ms="edit"]').onclick = () => { p.hidden = true; app.editMasters(list.indexOf(m)); };
    row.querySelector('[data-ms="dup"]').onclick = () => duplicateMaster(app, id);
    row.querySelector('[data-ms="del"]').onclick = () => deleteMaster(app, id);
    row.querySelector('[data-ms="ren"]').onclick = () => {
      const b = row.querySelector('.ms-name'), inp = document.createElement('input');
      inp.className = 'ms-rename'; inp.value = m.name; inp.setAttribute('aria-label', t('masters.nameLabel'));
      b.replaceWith(inp); inp.focus(); inp.select();
      let done = false;
      const finish = (keep) => { if (done) return; done = true; if (keep) renameMaster(app, id, inp.value); renderPanel(app); };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
      inp.addEventListener('blur', () => finish(true));
    };
  });
  $('msNew').onclick = () => newMaster(app);
  $('msClose').onclick = () => { p.hidden = true; };
  if ($('msDone')) $('msDone').onclick = () => { p.hidden = true; app.leaveMasters(); };
  if ($('msThis')) $('msThis').onclick = () => useMaster(app, $('msPick').value || null, 'this');
  if ($('msAll')) $('msAll').onclick = () => useMaster(app, $('msPick').value || null, 'all');
}

// ------------------------------------------------------------------ the part of the page panel on the right
// with nothing picked: which master page this page uses
export function sideHtml(app) {
  const list = nameMasters(mastersOf(app)), cur = app.doc.pages[app.current || 0];
  const sel = typeof cur?.master === 'string' ? cur.master : '';
  if (app.masterMode) {
    const m = app.doc.pages[app.current || 0];
    return `<p class="hint tip">${esc(t('masters.sideHint'))}</p><h2>${esc(t('masters.sideTitle'))}</h2>
      <div class="prow"><input id="msSideName" class="ms-rename" value="${esc(m?.name)}" aria-label="${esc(t('masters.nameLabel'))}"></div>
      <p class="hint">${esc(usedText(usedOn(app, m?.id)))}</p>
      <div class="prow wrap"><button class="btn primary" type="button" id="msSideDone">${esc(t('masters.done'))}</button><button class="btn" type="button" id="msSideManage">${esc(t('masters.manage'))}</button></div>`;
  }
  return `<h2>${esc(t('masters.sideTitle'))}</h2>
    ${list.length ? `<label class="ms-uses" for="msSide">${esc(t('masters.thisPage', { n: (app.current || 0) + 1 }))}</label>
    <div class="prow"><select id="msSide"><option value="">${esc(t('masters.none'))}</option>${list.map((m) => `<option value="${esc(m.id)}"${sel === m.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>` : ''}
    <div class="prow wrap">${sel && app.doc.pages.length > 1 ? `<button class="btn" type="button" id="msSideAll">${esc(t('masters.onAll'))}</button>` : ''}<button class="btn" type="button" id="msSideEdit">${esc(t(list.length ? 'masters.editAll' : 'masters.new'))}</button><button class="btn" type="button" id="msSideManage">${esc(t('masters.manage'))}</button></div>`;
}
export function wireSide(app) {
  const s = $('msSide'); if (s) s.onchange = () => useMaster(app, s.value || null, 'this');
  const all = $('msSideAll'); if (all) all.onclick = () => useMaster(app, $('msSide').value || null, 'all');
  const ed = $('msSideEdit');
  if (ed) ed.onclick = () => { const list = mastersOf(app), i = list.findIndex((m) => m.id === $('msSide')?.value); app.editMasters(Math.max(0, i)); };
  const man = $('msSideManage'); if (man) man.onclick = () => openMasters(app);
  const done = $('msSideDone'); if (done) done.onclick = () => app.leaveMasters();
  const nm = $('msSideName');
  if (nm) { const m = app.doc.pages[app.current || 0]; nm.onchange = () => renameMaster(app, m.id, nm.value); nm.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') nm.blur(); }); }
}
