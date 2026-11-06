// Asking for a coffee on Ko-fi, kindly:
// 1. askBeforeDownload: when a file is ready, a small "Your PDF is ready" window with Download and a coffee
//    button. Every way out of it (Download, coffee, ✕, Esc) still gives the person their file.
// 2. the "Enjoying Pubwork?" message that pops up by itself on the start page (never while someone is working on a document).
// Both stay away when the site has no Ko-fi page, inside a claude.ai artifact, and for automated test runs.
import { t } from './i18n/index.js';
import { track } from './track.js';

const KOFI = document.querySelector('meta[name="pubwork-kofi"]')?.content?.trim() || '';
const URL_KOFI = KOFI ? `https://ko-fi.com/${encodeURIComponent(KOFI)}` : '';
const OFF = !KOFI || !!window.claude?.use || navigator.webdriver && !/[?&]tips\b/.test(location.search);
const SUPPORTED_FOR = 90 * 864e5;

const get = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const set = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* fine without */ } };
const supportedRecently = () => Date.now() - get('pw-tip-already') < SUPPORTED_FOR;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const CUP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M7 2v2M11 2v2M15 2v2"/></svg>';
const openKofi = (where) => { track('tip-coffee', { where }); window.open(URL_KOFI, '_blank', 'noopener'); };

// -> resolves once the person has chosen; give(file) is then called while the click is still "fresh",
// so the browser lets the download start
export function askBeforeDownload({ format, give }) {
  if (OFF || supportedRecently()) return give();
  track('tip-shown', { where: 'save' });
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const box = el(`<div class="tipwrap" role="presentation"><div class="tipbox" role="dialog" aria-modal="true" aria-labelledby="tipTitle">
      <button class="tipx" type="button" aria-label="${esc(t('tip.close'))}">✕</button>
      <div class="tipok" aria-hidden="true">✓</div>
      <h2 id="tipTitle">${esc(t('tip.ready', { format }))}</h2>
      <p>${esc(t('tip.text'))}</p>
      <button class="btn primary tipgo" type="button"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></svg>${esc(t('tip.download', { format }))}</button>
      <button class="btn tipcoffee" type="button">${CUP}${esc(t('tip.coffee'))}</button>
      <button class="tiplink" type="button">${esc(t('tip.already'))}</button>
    </div></div>`);
    let done = false;
    const finish = async (how) => {
      if (done) return; done = true;
      if (how === 'coffee') openKofi('save');
      if (how === 'already') { set('pw-tip-already', Date.now()); track('tip-already'); }
      const result = give(); // first, while the click still counts
      box.remove(); document.removeEventListener('keydown', onKey, true);
      try { prev?.focus?.({ preventScroll: true }); } catch { /* gone */ }
      resolve(await result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish('close'); }
      else if (e.key === 'Tab') { // keep the keyboard inside the window
        const f = [...box.querySelectorAll('button')], i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    box.querySelector('.tipgo').onclick = () => finish('download');
    box.querySelector('.tipcoffee').onclick = () => finish('coffee');
    box.querySelector('.tipx').onclick = () => finish('close');
    box.querySelector('.tiplink').onclick = () => finish('already');
    box.addEventListener('click', (e) => { if (e.target === box) finish('close'); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(box);
    box.querySelector('.tipgo').focus({ preventScroll: true });
  });
}

// the "Enjoying Pubwork?" message that pops up by itself when the start page opens (no button in the corner).
// It pops up every time a start page opens, and goes away as soon as a document is opened.
export function setupFloating({ busyWithDocument }) {
  if (OFF) return;
  if (supportedRecently()) return; // they told us they've already supported Pubwork
  const card = el(`<div class="tipcard" id="tipCard" hidden role="dialog" aria-labelledby="tipCardTitle">
      <div class="tiphead"><img src="/maker.png" alt="" width="48" height="48"><h2 id="tipCardTitle">${esc(t('tip.cardTitle'))}</h2></div>
      <p>${esc(t('tip.cardText'))}</p>
      <a class="btn primary" href="${URL_KOFI}" target="_blank" rel="noopener">${CUP}<span>${esc(t('tip.coffee'))}</span></a>
      <button class="btn tiplater" type="button">${esc(t('tip.later'))}</button>
    </div>`);
  const close = () => { card.remove(); watch.disconnect(); };
  card.querySelector('.tiplater').onclick = close;
  card.querySelector('a').onclick = () => { track('tip-coffee', { where: 'card' }); close(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && card.isConnected && !card.hidden && !document.querySelector('.tipwrap')) close(); });
  // a document was opened: the message has done its job on the start page
  const watch = new MutationObserver(() => { if (busyWithDocument() && card.isConnected) { card.remove(); watch.disconnect(); } });
  watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.body.appendChild(card);
  setTimeout(() => { if (card.isConnected && !busyWithDocument()) { card.hidden = false; track('tip-shown', { where: 'open' }); } }, 800);
  return { refresh: () => { // after the language changes
    card.querySelector('h2').textContent = t('tip.cardTitle');
    card.querySelector('p').textContent = t('tip.cardText');
    card.querySelector('a span').textContent = t('tip.coffee');
    card.querySelector('.tiplater').textContent = t('tip.later');
  } };
}
