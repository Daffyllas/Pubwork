// Find and replace across the whole document: every text box, linked story and table cell on every page.
// "Find next" picks the box that holds the words and marks them; replacing keeps the formatting of the
// words that were there and is one undo step.
import { t } from '../i18n/index.js';
import { stories, paraText, applyEdits, showPlace, clearMarks, makePanel } from './spell/text.js';
import './spell/spell.css';

let app = null, el = null;
let current = null; // the match on show: { key, p, start, end }
let cursor = null; // search on after this place: { key, p, start }

const $ = (id) => document.getElementById(id);

export function openFind(theApp, { replace = false } = {}) {
  app = theApp;
  if (!app?.doc) return;
  // words picked while typing become the words to find
  let picked = '';
  if (app.editor.editing) { picked = getSelection().toString().trim(); app.editor.endEdit(); }
  if (app.mergePreview != null) { app.setMergePreview?.(null); app.merge?.render?.(); } // look at the fields, not a record
  const made = makePanel('findPanel', 'find.title', t);
  el = made.el;
  if (made.fresh) build();
  el.hidden = false;
  if (picked && !picked.includes('\n')) $('fwFind').value = picked;
  updateCount();
  const focus = replace && $('fwFind').value ? $('fwRepl') : $('fwFind');
  focus.focus(); focus.select();
}

function build() {
  el.querySelector('.pw-body').innerHTML = `
    <div class="pw-field"><label for="fwFind">${t('find.find')}</label><input id="fwFind" type="search" autocomplete="off" spellcheck="false"></div>
    <div class="pw-field"><label for="fwRepl">${t('find.replaceWith')}</label><input id="fwRepl" type="text" autocomplete="off"></div>
    <div class="pw-opts"><label><input type="checkbox" id="fwCase"> ${t('find.matchCase')}</label><label><input type="checkbox" id="fwWhole"> ${t('find.wholeWords')}</label></div>
    <p class="pw-count" id="fwCount" aria-live="polite"></p>
    <div class="actions"><button class="btn" id="fwReplace">${t('find.replace')}</button><button class="btn" id="fwAll">${t('find.replaceAll')}</button><button class="btn primary" id="fwNext">${t('find.next')}</button></div>`;
  const reset = () => { current = null; cursor = null; clearMarks(); updateCount(); };
  $('fwFind').addEventListener('input', reset);
  $('fwCase').addEventListener('change', reset);
  $('fwWhole').addEventListener('change', reset);
  $('fwNext').onclick = () => findNext();
  $('fwReplace').onclick = () => replaceOne();
  $('fwAll').onclick = () => replaceAll();
  el.querySelector('[data-close]').onclick = close;
  el.addEventListener('pw-closed', () => { clearMarks(); current = null; });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Enter' && e.target.id === 'fwFind') { e.preventDefault(); findNext(); }
    if (e.key === 'Enter' && e.target.id === 'fwRepl') { e.preventDefault(); replaceOne(); }
  });
}

function close() { if (el) el.hidden = true; clearMarks(); current = null; cursor = null; }

// the search as a regular expression, or null when there is nothing to look for
function finder() {
  const q = $('fwFind').value;
  if (!q) return null;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]"); // both kinds of apostrophe
  const src = $('fwWhole').checked ? `(?<![\\p{L}\\p{M}\\p{N}_])${esc}(?![\\p{L}\\p{M}\\p{N}_])` : esc;
  return new RegExp(src, $('fwCase').checked ? 'gu' : 'giu');
}

// every match in the document, in reading order: { si, key, p, start, end }
function matches() {
  const re = finder(); if (!re || !app?.doc) return [];
  const out = [];
  stories(app.doc).forEach((st, si) => st.paras.forEach((pa, p) => {
    const text = paraText(pa); re.lastIndex = 0;
    for (let m; (m = re.exec(text));) { if (!m[0].length) { re.lastIndex++; continue; } out.push({ si, st, key: st.key, p, start: m.index, end: m.index + m[0].length }); }
  }));
  return out;
}

function updateCount(list = matches(), at = null) {
  const c = $('fwCount'); if (!c) return;
  const n = list.length;
  c.textContent = !$('fwFind').value ? '' : !n ? t('find.none') : at != null ? t('find.position', { i: at + 1, n }) : n === 1 ? t('find.countOne') : t('find.count', { n });
  $('fwReplace').disabled = $('fwAll').disabled = !n;
  $('fwNext').disabled = !$('fwFind').value;
}

// is match m after the place where we are? (reading order: story, paragraph, character)
function after(m, place, keys) {
  const si = keys.indexOf(place.key);
  return m.si > si || (m.si === si && (m.p > place.p || (m.p === place.p && m.start > place.start)));
}

async function findNext() {
  const list = matches();
  if (!list.length) { current = null; clearMarks(); updateCount(list); return; }
  const keys = stories(app.doc).map((s) => s.key);
  const from = cursor || current;
  let i = from ? list.findIndex((m) => after(m, from, keys)) : 0;
  if (i < 0) { i = 0; if (from) app.toast(t('find.wrapped'), 2500); }
  const m = list[i];
  current = { key: m.key, p: m.p, start: m.start, end: m.end }; cursor = null;
  updateCount(list, i);
  await showPlace(app, m.st, m.p, m.start, m.end);
  if (el && !el.hidden) $('fwFind').focus({ preventScroll: true });
}

function replaceOne() {
  const list = matches();
  const m = current && list.find((x) => x.key === current.key && x.p === current.p && x.start === current.start && x.end === current.end);
  if (!m) { findNext(); return; } // nothing picked yet: find the first one
  const text = $('fwRepl').value;
  applyEdits(app, 'replace', [{ key: m.key, p: m.p, start: m.start, end: m.end, text }]);
  // go on after the new words (so "cat" → "cats" doesn't find itself again)
  cursor = { key: m.key, p: m.p, start: m.start + text.length - 0.5 }; current = null;
  findNext();
}

function replaceAll() {
  const list = matches(); if (!list.length) return;
  const text = $('fwRepl').value;
  const n = applyEdits(app, 'replace all', list.map((m) => ({ key: m.key, p: m.p, start: m.start, end: m.end, text })));
  current = null; cursor = null; clearMarks();
  updateCount();
  $('fwCount').textContent = n === 1 ? t('find.replacedOne') : t('find.replaced', { n });
  app.toast(n === 1 ? t('find.replacedOne') : t('find.replaced', { n }), 3000);
  $('fwFind').focus();
}

// Ctrl+F / Ctrl+H work from now on (main.js only loads this file the first time Find is used);
// Escape closes the panel, also when the keyboard is not in it
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && el && !el.hidden && !e.defaultPrevented) { close(); return; }
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
  const k = e.key.toLowerCase();
  if ((k !== 'f' && k !== 'h') || !app?.doc || $('start')?.hidden === false) return;
  e.preventDefault(); openFind(app, { replace: k === 'h' });
});
