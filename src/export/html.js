// A web page (.html): one file with everything inside it (pictures and fonts too), so it can be put on
// a website or opened from a USB stick. Every page is shown centred at its own size, as real text that
// can be selected and read aloud, and shrinks to fit on a phone.
import { stagePages, safeName, docLang } from './stage.js';
import { embeddedFontBytes } from '../fonts.js';
import { bytesToB64, blobToB64, pageText } from './pagetext.js';
import { t } from '../i18n/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unq = (s) => s.trim().replace(/^["']|["']$/g, '');

// the app's own drawing rules for pages (.page …), without anything that belongs to the editor
function pageCss() {
  const out = [];
  const skip = /pw-ui|editing|placeholder|has-doc|overflow::after|contenteditable|#pages|\.thumb|\.mini|cal-preview|\.slot|gmini|bmini/;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules || []) {
      if (!(r instanceof CSSStyleRule)) continue;
      const sels = r.selectorText.split(',').map((s) => s.trim()).filter((s) => s.startsWith('.page') && !skip.test(s));
      if (sels.length) out.push(`${sels.join(',')}{${r.style.cssText}}`);
    }
  }
  return ['.page,.page *,.page *::before,.page *::after{box-sizing:border-box}', ...out].join('\n'); // the app sizes every box this way
}

// "U+0000-00FF, U+0131" -> does any of these characters fall inside?
function inRange(range, codes) {
  if (!range) return true;
  return range.split(',').some((part) => {
    const m = /U\+([0-9a-f?]+)(?:-([0-9a-f]+))?/i.exec(part.trim()); if (!m) return false;
    const a = parseInt(m[1].replace(/\?/g, '0'), 16), b = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'f'), 16);
    for (const c of codes) if (c >= a && c <= b) return true;
    return false;
  });
}

// @font-face rules for the fonts the pages use, with the font files inside (only the styles and
// character sets that are really needed, to keep the file small)
async function fontCss(pages) {
  const used = new Map(); // family (lower case) -> Set of "weight style"
  const codes = new Set();
  for (const pg of pages) {
    for (const ch of pg.textContent) codes.add(ch.codePointAt(0));
    for (const el of pg.querySelectorAll('.text, .table, .text *, .table *')) {
      const cs = getComputedStyle(el);
      const key = `${+cs.fontWeight >= 600 ? 700 : 400} ${cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique') ? 'italic' : 'normal'}`;
      for (const f of cs.fontFamily.split(',')) { const n = unq(f).toLowerCase(); if (!used.has(n)) used.set(n, new Set()); used.get(n).add(key); }
    }
  }
  const out = [];
  // fonts that came inside the .pub file
  for (const [name, bytes] of embeddedFontBytes) {
    if (used.has(`pw-embedded-${name}`.toLowerCase())) out.push(`@font-face{font-family:"pw-embedded-${String(name).replace(/[^\p{L}\p{N} _.&+-]/gu, '')}";src:url(data:font/ttf;base64,${bytesToB64(bytes)})}`);
  }
  // the free stand-in fonts the app loads
  const faces = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules || []) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = unq(r.style.getPropertyValue('font-family'));
      if (!used.has(fam.toLowerCase())) continue;
      const range = r.style.getPropertyValue('unicode-range');
      if (!inRange(range, codes)) continue;
      const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(r.style.getPropertyValue('src')); if (!m) continue;
      const weight = /bold|[6-9]00/.test(r.style.getPropertyValue('font-weight')) ? 700 : 400;
      const style = /italic|oblique/.test(r.style.getPropertyValue('font-style')) ? 'italic' : 'normal';
      faces.push({ fam, weight, style, range, url: new URL(m[1], sheet.href || document.baseURI).href });
    }
  }
  // each style a family is used in; where the family has no such face (a bold of a font that only
  // comes in regular), the browser makes it from the nearest face, so that one comes along
  const pick = new Set();
  for (const [fam, keys] of used) {
    const mine = faces.filter((f) => f.fam.toLowerCase() === fam); if (!mine.length) continue;
    for (const key of keys) {
      const [w, st] = key.split(' ');
      let hit = mine.filter((f) => f.weight === +w && f.style === st);
      if (!hit.length) hit = mine.filter((f) => f.style === st);
      if (!hit.length) hit = mine.filter((f) => f.weight === 400 && f.style === 'normal');
      if (!hit.length) hit = mine;
      const best = hit.find((f) => f.weight === +w) ? hit.filter((f) => f.weight === +w) : hit.filter((f) => f.weight === hit[0].weight);
      best.forEach((f) => pick.add(f));
    }
  }
  const jobs = [...pick].map(({ fam, weight, style, range, url }) => fetch(url).then((res) => (res.ok ? res.blob() : null)).then(async (b) => {
    if (!b) return null;
    const type = /\.woff2(\?|$)/.test(url) ? 'font/woff2' : /\.woff(\?|$)/.test(url) ? 'font/woff' : 'font/ttf';
    return `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};font-display:swap;src:url(data:${type};base64,${await blobToB64(b)})${range ? `;unicode-range:${range}` : ''}}`;
  }).catch(() => null));
  for (const s of await Promise.all(jobs)) if (s) out.push(s);
  return out.join('\n');
}

// any picture not already inside the page (blob: or web addresses) becomes a data: address
async function inlinePictures(pg) {
  const toData = async (url) => {
    if (!url || url.startsWith('data:')) return url;
    try { const b = await (await fetch(url)).blob(); return `data:${b.type || 'image/png'};base64,${await blobToB64(b)}`; } catch { return url; }
  };
  for (const img of pg.querySelectorAll('img')) { img.setAttribute('src', await toData(img.getAttribute('src'))); img.removeAttribute('draggable'); if (!img.hasAttribute('alt')) img.alt = ''; }
  for (const im of pg.querySelectorAll('image')) {
    const h = im.getAttribute('href') || im.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (h && !h.startsWith('data:') && !h.startsWith('#')) im.setAttribute('href', await toData(h));
  }
}

// keep only what the page needs to look right: no editor marks or bookkeeping
function tidy(pg) {
  pg.querySelectorAll('.pic.missing').forEach((n) => n.remove());
  for (const el of [pg, ...pg.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) if (a.name.startsWith('data-') && a.name !== 'data-valign' && a.name !== 'data-empty') el.removeAttribute(a.name);
    if (el.classList?.length) for (const c of ['fitted', 'overflow', 'from-master', 'selected', 'sel']) el.classList.remove(c);
  }
  pg.removeAttribute('aria-hidden');
  pg.style.margin = ''; pg.style.boxShadow = '';
}

export async function exportHtml(doc, pageEls) {
  const stage = await stagePages(pageEls);
  try {
    const fonts = await fontCss(stage.pages);
    const css = pageCss();
    const sheets = [];
    let firstText = '';
    for (let i = 0; i < stage.pages.length; i++) {
      const pg = stage.pages[i];
      if (!firstText) firstText = pageText(pg);
      await inlinePictures(pg);
      tidy(pg);
      const w = pg.offsetWidth || 1, h = pg.offsetHeight || 1;
      sheets.push(`<section class="pw-sheet" aria-label="${esc(t('export.page', { n: i + 1 }))}" style="width:${w}px;aspect-ratio:${w} / ${h}">${pg.outerHTML}</section>`);
    }
    const lang = esc(docLang(doc));
    const desc = firstText.replace(/\s+/g, ' ').slice(0, 160);
    const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.name || 'Document')}</title>
${desc ? `<meta name="description" content="${esc(desc)}">\n` : ''}<meta name="generator" content="Pubwork">
<style>
${fonts}
html{background:#e9e6e2}
body{margin:0;padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:24px}
.pw-sheet{position:relative;max-width:100%;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18)}
.pw-sheet>.page{position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(var(--k,1));margin:0;box-shadow:none}
${css}
.pw-sheet>.page{box-shadow:none}
@media (max-width:600px){body{padding:12px 8px;gap:12px}}
@media print{html{background:none}body{padding:0;gap:0;display:block}.pw-sheet{box-shadow:none;margin:0;max-width:none;break-after:page}.pw-sheet>.page{transform:none}@page{margin:0}}
</style>
</head>
<body>
${sheets.join('\n')}
<script>
// shrink each page to fit narrow screens (phones); full size everywhere else
(function () {
  function fit() { document.querySelectorAll('.pw-sheet').forEach(function (s) { var p = s.firstElementChild; s.style.setProperty('--k', Math.min(1, s.clientWidth / (p.offsetWidth || 1))); }); }
  fit(); addEventListener('resize', fit); addEventListener('load', fit);
})();
</script>
</body>
</html>
`;
    return { name: `${safeName(doc.name)}.html`, blob: new Blob([html], { type: 'text/html;charset=utf-8' }) };
  } finally { stage.done(); }
}
