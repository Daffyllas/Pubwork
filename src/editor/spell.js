// Spelling check of the whole document, word by word, like Publisher's. Each piece of text is checked in its
// own language (set on the text, otherwise the app's language) or in the language picked in the panel.
// The dictionaries are big, so they are only downloaded when a language is first checked (in a worker).
import { t } from '../i18n/index.js';
import { stories, paraText, runAt, applyEdits, showPlace, clearMarks, context, makePanel, escHtml } from './spell/text.js';
import './spell/spell.css';

const NAMES = { en: 'English (US)', 'en-gb': 'English (UK)', es: 'Español', de: 'Deutsch', fr: 'Français', pt: 'Português (Brasil)', it: 'Italiano' };
// web addresses, e-mail addresses and mail-merge fields like «First name» are not words to check
const SKIP = /(?:https?:\/\/|www\.)\S+|[^\s@]+@[^\s@]+\.[^\s@]+|«[^«»\n]{1,60}»|\b[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|org|net|edu|gov|info|biz|co|uk|us|de|fr|es|it|pt|br|io|eu|ca|au|nz|ie)\b\S*/giu;
const WORD = /[\p{L}\p{M}\p{N}_]+(?:['’][\p{L}\p{M}]+)*/gu;

let app = null, el = null;
let override = null; // a language picked in the panel, for all the text
let cursor = null; // check on after this place: { key, p, start }
let current = null; // the word on show (a token)
let runId = 0, skippedLang = false;
const known = new Map(); // "lang\0word" → true when spelt right
const loaded = new Set(); // languages whose dictionary is ready
const ignoredAll = new Set();
let personal = null; // "Add to dictionary": kept in this browser

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- the dictionary worker
let worker = null, seq = 0;
const waiting = new Map();
function ask(op, code, extra = {}) {
  if (!worker) {
    worker = new Worker(new URL('./spell/worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => { const w = waiting.get(data.id); if (!w) return; waiting.delete(data.id); if (data.error) w.reject(new Error(data.error)); else w.resolve(data.result); };
    worker.onerror = (e) => { for (const w of waiting.values()) w.reject(new Error(e.message || 'worker')); waiting.clear(); worker = null; };
  }
  const id = ++seq;
  return new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); worker.postMessage({ id, op, code, ...extra }); });
}

// ---------------------------------------------------------------- languages and words
function dictFor(lang) {
  const s = String(lang || '').toLowerCase().replace('_', '-');
  if (/^en-(gb|au|nz|ie|za|in)\b/.test(s)) return 'en-gb';
  const base = s.slice(0, 2);
  return NAMES[base] ? base : null;
}
// text without a language: the app's language (English: US or UK spelling, as the browser prefers)
function defaultCode() {
  const pref = (navigator.languages || [navigator.language]).map((l) => String(l)).find((l) => l.toLowerCase().startsWith(app.lang));
  return dictFor(pref || app.lang) || 'en';
}
function loadPersonal() {
  if (personal) return personal;
  personal = new Set();
  try { for (const w of JSON.parse(localStorage.getItem('pw-dict') || '[]')) personal.add(w); } catch { /* storage may be blocked */ }
  return personal;
}
function savePersonal() { try { localStorage.setItem('pw-dict', JSON.stringify([...personal])); } catch { /* storage may be blocked */ } }
const skipWord = (w) => ignoredAll.has(w) || loadPersonal().has(w) || personal.has(w.toLowerCase());

// every word of the document in reading order: { si, key, st, p, start, end, word, code }
function tokens() {
  const out = [], fallback = defaultCode();
  stories(app.doc).forEach((st, si) => st.paras.forEach((pa, p) => {
    const text = paraText(pa), skip = [];
    SKIP.lastIndex = 0; for (let m; (m = SKIP.exec(text));) skip.push([m.index, m.index + m[0].length]);
    WORD.lastIndex = 0;
    for (let m; (m = WORD.exec(text));) {
      const w = m[0], start = m.index, end = start + w.length;
      if (w.length < 2 || /[\p{N}_]/u.test(w)) continue; // numbers and words with digits
      if (w === w.toUpperCase() && w.replace(/\P{L}/gu, '').length <= 6) continue; // short words in capitals (NASA, UK)
      if (skip.some(([a, b]) => start < b && end > a)) continue;
      const lang = runAt(pa, start)?.lang;
      out.push({ si, key: st.key, st, p, start, end, word: w, code: override || (lang ? dictFor(lang) : fallback) });
    }
  }));
  return out;
}
function after(tk, place, keys) {
  const si = keys.indexOf(place.key);
  return tk.si > si || (tk.si === si && (tk.p > place.p || (tk.p === place.p && tk.start > place.start)));
}

// ---------------------------------------------------------------- the panel
export function openSpell(theApp) {
  app = theApp;
  if (!app?.doc) return;
  if (app.editor.editing) app.editor.endEdit();
  if (app.mergePreview != null) { app.setMergePreview?.(null); app.merge?.render?.(); }
  const made = makePanel('spellPanel', 'spell.title', t);
  el = made.el;
  if (made.fresh) build();
  el.hidden = false;
  cursor = null; current = null; skippedLang = false;
  next();
}

function build() {
  el.querySelector('.pw-body').innerHTML = `
    <div class="pw-field"><label for="spLang">${t('spell.language')}</label><select id="spLang"><option value="">${t('spell.langAuto')}</option>${Object.entries(NAMES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></div>
    <div id="spMain" class="pw-body"></div>`;
  $('spLang').onchange = () => {
    override = $('spLang').value || null;
    if (current) cursor = { key: current.key, p: current.p, start: current.start - 0.5 }; // check the word on show again
    current = null; next();
  };
  el.querySelector('[data-close]').onclick = close;
  el.addEventListener('pw-closed', () => { runId++; clearMarks(); current = null; });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Enter' && e.target.id === 'spTo') { e.preventDefault(); change(false); }
  });
}
function close() { runId++; if (el) el.hidden = true; clearMarks(); current = null; }
function message(text, extra = '') { $('spMain').innerHTML = `<p class="pw-count">${escHtml(text)}</p>${extra}`; }

// find the next word that isn't in the dictionary and show it
async function next() {
  const gen = ++runId;
  const all = tokens();
  if (!all.length) { finished(gen, t('spell.noText')); return; }
  const keys = stories(app.doc).map((s) => s.key);
  const rest = cursor ? all.filter((tk) => after(tk, cursor, keys)) : all;
  if (rest.some((tk) => !tk.code)) skippedLang = true;
  const todo = rest.filter((tk) => tk.code && !skipWord(tk.word));
  // ask the dictionary about words it hasn't seen yet (downloading it the first time)
  const unknown = new Map();
  for (const tk of todo) if (!known.has(`${tk.code}\0${tk.word}`)) { if (!unknown.has(tk.code)) unknown.set(tk.code, new Set()); unknown.get(tk.code).add(tk.word); }
  try {
    for (const [code, set] of unknown) {
      message(loaded.has(code) ? t('spell.checking') : `${t('spell.loading')} (${NAMES[code]})`);
      const words = [...set], bad = new Set(await ask('check', code, { words }));
      loaded.add(code);
      for (const w of words) known.set(`${code}\0${w}`, !bad.has(w));
      if (gen !== runId) return;
    }
  } catch (e) {
    if (gen !== runId) return;
    console.warn('spelling', e);
    message(t('spell.loadError'), `<div class="actions"><button class="btn primary" id="spAgain">${t('spell.checkAgain')}</button></div>`);
    $('spAgain').onclick = () => next();
    return;
  }
  if (gen !== runId) return;
  const tk = todo.find((x) => known.get(`${x.code}\0${x.word}`) === false);
  if (!tk) { finished(gen); return; }
  show(tk, gen);
}

function finished(gen, text = t('spell.finished')) {
  if (gen !== runId) return;
  current = null; clearMarks();
  $('spMain').innerHTML = `<p class="pw-done" role="status">${escHtml(text)}</p>${skippedLang ? `<p class="hint">${t('spell.someSkipped')}</p>` : ''}
    <div class="actions"><button class="btn" id="spAgain">${t('spell.checkAgain')}</button><button class="btn primary" id="spDone">${t('find.close')}</button></div>`;
  $('spAgain').onclick = () => { cursor = null; skippedLang = false; next(); };
  $('spDone').onclick = close;
  $('spDone').focus();
  if (text === t('spell.finished')) app.toast(text, 3000);
}

function show(tk, gen) {
  current = tk;
  const text = paraText(tk.st.paras[tk.p]);
  const [before, word, afterText] = context(text, tk.start, tk.end);
  $('spLang').options[0].textContent = `${t('spell.langAuto')} (${NAMES[tk.code]})`;
  $('spMain').innerHTML = `
    <p class="pw-count">${t('spell.notInDict')}</p>
    <p class="pw-ctx">${escHtml(before)}<mark>${escHtml(word)}</mark>${escHtml(afterText)}</p>
    <div class="pw-field"><label for="spTo">${t('spell.changeTo')}</label><input id="spTo" type="text" autocomplete="off" spellcheck="false" value="${escHtml(word)}"></div>
    <div class="pw-field"><label>${t('spell.suggestions')}</label><div class="pw-sugs" id="spSugs"><span class="hint">${t('spell.looking')}</span></div></div>
    <div class="pw-grid">
      <button class="btn" id="spIgnore">${t('spell.ignore')}</button><button class="btn" id="spIgnoreAll">${t('spell.ignoreAll')}</button>
      <button class="btn primary" id="spChange">${t('spell.change')}</button><button class="btn" id="spChangeAll">${t('spell.changeAll')}</button>
      <button class="btn" id="spAdd" style="grid-column:1/-1">${t('spell.add')}</button>
    </div>`;
  $('spIgnore').onclick = () => { cursor = { key: tk.key, p: tk.p, start: tk.start }; next(); };
  $('spIgnoreAll').onclick = () => { ignoredAll.add(tk.word); cursor = { key: tk.key, p: tk.p, start: tk.start }; next(); };
  $('spAdd').onclick = () => { loadPersonal().add(tk.word); savePersonal(); cursor = { key: tk.key, p: tk.p, start: tk.start }; next(); };
  $('spChange').onclick = () => change(false);
  $('spChangeAll').onclick = () => change(true);
  showPlace(app, tk.st, tk.p, tk.start, tk.end).then(() => { if (gen === runId) $('spChange')?.focus({ preventScroll: true }); });
  // suggestions take a moment: they come in when ready
  ask('suggest', tk.code, { word: tk.word }).then((list) => {
    if (gen !== runId) return;
    if (tk.word.includes('’')) list = list.map((s) => s.replace(/'/g, '’')); // keep the apostrophe the text uses
    const box = $('spSugs'); if (!box) return;
    if (!list.length) { box.innerHTML = `<span class="hint">${t('spell.noSuggestions')}</span>`; return; }
    box.innerHTML = list.map((s, i) => `<button type="button" class="${i ? '' : 'on'}" data-s="${escHtml(s)}">${escHtml(s)}</button>`).join('');
    $('spTo').value = list[0];
    box.querySelectorAll('button').forEach((b) => {
      b.onclick = () => { box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); $('spTo').value = b.dataset.s; };
      b.ondblclick = () => { $('spTo').value = b.dataset.s; change(false); };
    });
  }).catch(() => { if (gen === runId && $('spSugs')) $('spSugs').innerHTML = `<span class="hint">${t('spell.noSuggestions')}</span>`; });
}

// Change (this word) or Change all (every place with the same word)
function change(all) {
  const tk = current; if (!tk) return;
  const text = $('spTo').value;
  if (!text || text === tk.word) { cursor = { key: tk.key, p: tk.p, start: tk.start }; next(); return; }
  const list = all ? tokens().filter((x) => x.word === tk.word) : [tk];
  applyEdits(app, 'spelling', list.map((x) => ({ key: x.key, p: x.p, start: x.start, end: x.end, text })));
  // go on after the new word; earlier changes in the same paragraph move it along
  const shift = list.filter((x) => x.key === tk.key && x.p === tk.p && x.start < tk.start).length * (text.length - tk.word.length);
  cursor = { key: tk.key, p: tk.p, start: tk.start + shift + text.length - 0.5 };
  current = null; next();
}

// F7 checks the spelling (as in Publisher), once this file is loaded; Escape closes the panel
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && el && !el.hidden && !e.defaultPrevented) { close(); return; }
  if (e.key !== 'F7' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || !app?.doc || $('start')?.hidden === false) return;
  e.preventDefault(); openSpell(app);
});
