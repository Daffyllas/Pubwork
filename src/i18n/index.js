// The app's words in six languages (no Greek, by choice). The page's own <html lang> picks the language (each search page is
// written in one language); the plain app follows the browser's language.
import en from './en.js';
import es from './es.js';
import de from './de.js';
import fr from './fr.js';
import pt from './pt.js';
import it from './it.js';

export const LANGS = { en, es, de, fr, pt, it };
// words of newer features are kept in parts/<feature>.<lang>.js until they are folded into the main files
for (const [file, mod] of Object.entries(import.meta.glob('./parts/*.js', { eager: true }))) {
  const lang = /\.(\w\w)\.js$/.exec(file)?.[1];
  if (LANGS[lang]) for (const [k, v] of Object.entries(mod.default || {})) if (!(k in LANGS[lang])) LANGS[lang][k] = v;
}
let current = en;

export function setLang(code) { current = LANGS[code] || en; return LANGS[code] ? code : 'en'; }
export function pickLang() {
  const page = document.documentElement.lang?.slice(0, 2);
  if (page && LANGS[page] && document.documentElement.hasAttribute('data-fixed-lang')) return page; // a search page in one language
  try { const saved = localStorage.getItem('pw-lang'); if (LANGS[saved]) return saved; } catch { /* storage may be blocked */ }
  for (const l of navigator.languages || [navigator.language]) { const c = String(l).slice(0, 2).toLowerCase(); if (LANGS[c]) return c; }
  return 'en';
}
export function t(key, vars = {}) {
  const s = current[key] ?? en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}
// fill elements marked data-t="key" (text) and data-t-title / data-t-aria (attributes)
export function translatePage(root = document) {
  root.querySelectorAll('[data-t]').forEach((e) => { e.textContent = t(e.dataset.t); });
  root.querySelectorAll('[data-t-title]').forEach((e) => { e.title = t(e.dataset.tTitle); });
  root.querySelectorAll('[data-t-aria]').forEach((e) => { e.setAttribute('aria-label', t(e.dataset.tAria)); });
  root.querySelectorAll('[data-t-placeholder]').forEach((e) => { e.placeholder = t(e.dataset.tPlaceholder); });
}
