// Writes the website's pages in 6 languages: the app's home ("open .pub files"), the converters (.pub to PDF,
// Word, JPG, PNG, many files at once), the makers (flyers, menus, invitations…), device and "Publisher
// alternative" pages, guides, privacy, terms and support; plus sitemap.xml, robots.txt and 404.html.
// Every page is plain HTML in its own language, so search engines read it without running the app.
//   node tools/make-pages.mjs   (runs automatically before `npm run dev` and `npm run build`)
// The words live in site/content/<lang>.js (first pages) and site/content/<lang>-more.js (the rest).
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const LANGS = ['en', 'es', 'de', 'fr', 'pt', 'it'];

// pages that are the app itself, ready for one job
const TOOLS = {
  home: {}, edit: {}, pdf: { convert: 'pdf' }, word: { convert: 'docx' }, jpg: { convert: 'jpg' }, png: { convert: 'png' }, batch: { convert: 'batch' },
  alternative: {}, mac: {}, chromebook: {}, mobile: {},
  flyer: { maker: 'flyers' }, menu: { maker: 'menus' }, invitation: { maker: 'cards' }, certificate: { maker: 'certs' },
  newsletter: { maker: 'news' }, calendar: { maker: 'calendar' }, labels: { maker: 'signs' },
};
// pages to read: guides and the small print
const DOCS = ['retired', 'compare', 'guide-merge', 'guide-booklet', 'guide-labels', 'it', 'support', 'privacy', 'terms'];
const KINDS = [...Object.keys(TOOLS), ...DOCS];
const NO_ADS = new Set(['privacy', 'terms', 'support']);
const GROUPS = {
  convert: ['home', 'edit', 'pdf', 'word', 'jpg', 'png', 'batch'],
  make: ['flyer', 'menu', 'invitation', 'certificate', 'newsletter', 'calendar', 'labels'],
  help: ['retired', 'compare', 'guide-merge', 'guide-booklet', 'guide-labels', 'alternative', 'mac', 'chromebook', 'mobile', 'it'],
};

const imp = async (p) => (fs.existsSync(path.join(root, p)) ? (await import(pathToFileURL(path.join(root, p)).href)).default : {});
const content = {}, words = {};
for (const l of LANGS) {
  const a = await imp(`site/content/${l}.js`), b = await imp(`site/content/${l}-more.js`);
  content[l] = { ...a, ...b, slugs: { ...a.slugs, ...b.slugs }, nav: { ...a.nav, ...b.nav }, pages: { ...a.pages, ...b.pages } };
  for (const k of ['privacy', 'terms']) if (b[k]) content[l][k] = b[k]; // newer versions of the small print
  words[l] = await imp(`src/i18n/${l}.js`);
}
const missing = [];
for (const l of LANGS) for (const k of KINDS) if (!(TOOLS[k] ? content[l].pages[k] : content[l][k]) || content[l].slugs[k] == null) missing.push(`${l}:${k}`);
if (missing.length) {
  // while translations are being written, PW_DRAFT=1 fills the gaps with English; a real build stops
  if (!process.env.PW_DRAFT) { console.error('make-pages: missing words for', missing.join(', ')); process.exit(1); }
  for (const l of LANGS.slice(1)) {
    const en = content.en, c = content[l];
    for (const k of KINDS) { if (c.slugs[k] == null) c.slugs[k] = en.slugs[k]; c.nav[k] ??= en.nav[k]; if (TOOLS[k]) c.pages[k] ??= en.pages[k]; else c[k] ??= en[k]; }
    c.navGroups ??= en.navGroups; c.openApp ??= en.openApp;
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));
const dirOf = (l, kind) => [l === 'en' ? '' : l, content[l].slugs[kind]].filter(Boolean).join('/');
const urlOf = (l, kind) => `${cfg.url}/${dirOf(l, kind)}${dirOf(l, kind) ? '/' : ''}`;
const rel = (fromDir, toDir) => {
  const up = fromDir ? fromDir.split('/').length : 0;
  return '../'.repeat(up) + (toDir ? `${toDir}/` : '') || './';
};
const FORMAT = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', word: 'Word', batch: 'PDF' };
const LOCALE = { en: 'en-GB', es: 'es-ES', de: 'de-DE', fr: 'fr-FR', pt: 'pt-BR', it: 'it-IT' };
const dateText = (l) => new Date(`${cfg.updated}T12:00:00Z`).toLocaleDateString(LOCALE[l], { day: 'numeric', month: 'long', year: 'numeric' });
const adsOn = !!cfg.ads?.client;
const vars = (l) => ({ email: cfg.email, site: cfg.url, kofi: cfg.kofi ? `https://ko-fi.com/${cfg.kofi}` : '' });

function headLinks(l, kind, page) {
  const alt = LANGS.map((x) => `<link rel="alternate" hreflang="${x}" href="${urlOf(x, kind)}">`).join('\n');
  return `<link rel="canonical" href="${urlOf(l, kind)}">
${alt}
<link rel="alternate" hreflang="x-default" href="${urlOf('en', kind)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${urlOf(l, kind)}">
<meta property="og:locale" content="${{ en: 'en_GB', es: 'es_ES', de: 'de_DE', fr: 'fr_FR', pt: 'pt_BR', it: 'it_IT' }[l]}">
<meta property="og:image" content="${cfg.url}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">${cfg.umami ? `\n<script defer src="https://cloud.umami.is/script.js" data-website-id="${esc(cfg.umami)}" data-domains="${esc(new URL(cfg.url).hostname)}" data-do-not-track="true"></script>` : ''}
<meta name="twitter:image" content="${cfg.url}/og-image.png">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#bf4e19">`;
}
// Advertising: only on search pages and guides, never inside the app's own screens. Nothing is loaded until
// site.config.json has an AdSense client id, and people with the ad-free plan ("pw-plus" set) get none.
const adHead = (kind) => (adsOn && !NO_ADS.has(kind)
  ? `<script>try{if(!localStorage.getItem('pw-plus')){var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.ads.client)}';document.head.appendChild(s);document.documentElement.classList.add('ads')}}catch(e){}</script>`
  : '');
const adSlot = (kind) => (adsOn && !NO_ADS.has(kind)
  ? `<div class="ad-wrap"><ins class="adsbygoogle ad-slot" data-ad-client="${esc(cfg.ads.client)}" data-ad-slot="${esc(cfg.ads.slot || '')}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>try{if(document.documentElement.classList.contains('ads'))(adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}</script></div>`
  : '');

function footer(l, kind, here) {
  const c = content[l];
  const link = (k) => `<li><a href="${rel(here, dirOf(l, k))}"${k === kind ? ' aria-current="page"' : ''}>${esc(c.nav[k])}</a></li>`;
  const groups = Object.entries(GROUPS).map(([g, ks]) => `<section><h2>${esc(c.navGroups[g])}</h2><ul class="links">${ks.map(link).join('')}</ul></section>`).join('\n');
  const langs = LANGS.map((x) => `<li><a href="${rel(here, dirOf(x, kind))}" hreflang="${x}" lang="${x}"${x === l ? ' aria-current="page"' : ''}>${esc(words[x]['lang.name'])}</a></li>`).join('');
  const legal = ['support', 'privacy', 'terms'].map(link).join('');
  return `${groups}
<section><h2>${esc(c.langTitle)}</h2><ul class="links">${langs}</ul></section>
<footer class="sitefoot"><ul class="links">${legal}${cfg.source ? `<li><a href="${esc(cfg.source)}" rel="noopener">${esc(c.sourceLabel)}</a></li>` : ''}</ul><p>${esc(c.footer)}</p></footer>`;
}

function toolPage(l, kind) {
  const c = content[l], page = c.pages[kind], here = dirOf(l, kind), tool = TOOLS[kind];
  let s = fs.readFileSync(path.join(root, 'site/app.html'), 'utf8');
  const attrs = ` data-fixed-lang${tool.convert ? ` data-convert="${tool.convert}"` : ''}`;
  s = s.replace('<html lang="en"<!--HTMLATTR-->>', `<html lang="${l}"${attrs}>`);
  s = s.replace(/<title>[^<]*<\/title>\n<meta name="description" content="[^"]*">\n<!--HEAD-->/,
    `<title>${esc(page.title)}</title>\n<meta name="description" content="${esc(page.desc)}">\n<meta name="pw-root" content="${rel(here, '')}">\n${headLinks(l, kind, page)}\n<script type="application/ld+json">${JSON.stringify(jsonLd(l, kind)).replace(/</g, '\\u003c')}</script>\n${adHead(kind)}`);
  s = s.replace(/<!--H1-->[\s\S]*?<!--\/H1-->/, esc(page.h1)).replace(/<!--LEDE-->[\s\S]*?<!--\/LEDE-->/, esc(page.lede));
  s = s.replace('id="supportLink" href="support/"', `id="supportLink" href="${rel(here, dirOf(l, 'support'))}"`);
  if (tool.maker) s = s.replace('<!--MAKER-->', `<div class="maker"><button class="btn primary big" id="bMaker" data-maker="${tool.maker}">${esc(page.cta)}</button><p class="hint">${esc(page.ctaHint || '')}</p></div>`);
  // interface words written into the page in its own language
  s = s.replace(/(<([a-z0-9]+)\b[^>]*\sdata-t="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, _txt, close) => `${open}${esc(words[l][key] ?? words.en[key] ?? _txt)}${close}`);
  s = s.replace(/(<[a-z0-9]+\b[^>]*\sdata-t-(title|aria)="([^"]+)"[^>]*>)/g, (tagStr) => tagStr
    .replace(/\stitle="[^"]*"/, (m) => { const k = /data-t-title="([^"]+)"/.exec(tagStr)?.[1]; return k ? ` title="${esc(words[l][k] ?? words.en[k])}"` : m; })
    .replace(/\saria-label="[^"]*"/, (m) => { const k = /data-t-aria="([^"]+)"/.exec(tagStr)?.[1]; return k ? ` aria-label="${esc(words[l][k] ?? words.en[k])}"` : m; }));
  const v = { format: FORMAT[kind] || 'PDF' };
  const stepList = page.steps || (tool.convert ? c.stepsConvert : c.stepsHome);
  const steps = stepList.map(([t, d]) => `<li><b>${esc(fill(t, v))}</b><span>${esc(fill(d, v))}</span></li>`).join('');
  const why = (page.why || c.why).map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('');
  const faq = faqOf(l, kind).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  const intro = page.intro ? `<section class="intro">${page.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</section>` : '';
  const article = `<article class="seo">
${intro}
<section><h2>${esc(page.howTitle || c.howTitle)}</h2><ol class="steps">${steps}</ol></section>
${adSlot(kind)}
<section><h2>${esc(c.whyTitle)}</h2><div class="why">${why}</div></section>
<section class="faq"><h2>${esc(c.faqTitle)}</h2>${faq}</section>
${footer(l, kind, here)}
</article>`;
  return s.replace('<!--ARTICLE-->', article);
}
const faqOf = (l, kind) => content[l].pages[kind].faq || content[l].faq;
function jsonLd(l, kind) {
  const page = content[l].pages[kind];
  return [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: cfg.name, url: urlOf(l, kind), description: page.desc, applicationCategory: 'DesignApplication', operatingSystem: 'Windows, macOS, ChromeOS, Linux, iPadOS, Android', inLanguage: l, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqOf(l, kind).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
}

// a guide or small-print page; body items: ['h', text] ['p', text] ['ol'|'ul', [text…]] ['tip', text]
// ['go', label, kind] (a button to one of the tool pages) ['kofi', label] ['adsOn'|'adsOff', text] (privacy: shown
// depending on whether advertising is switched on)
function docPage(l, kind) {
  const c = content[l], d = c[kind], here = dirOf(l, kind), v = vars(l);
  // no contact e-mail set yet: leave out the lines that show it (and a heading left with nothing under it)
  const hasEmail = (it) => JSON.stringify(it).includes('{email}');
  const items = cfg.email ? d.body : d.body.filter((it, i, all) => {
    if (hasEmail(it)) return false;
    if (it[0] !== 'h') return true;
    for (let j = i + 1; j < all.length && all[j][0] !== 'h'; j++) if (!hasEmail(all[j])) return true;
    return false;
  });
  const body = items.map(([t, x, y]) => {
    if (t === 'h') return `<h2>${esc(x)}</h2>`;
    if (t === 'ol' || t === 'ul') return `<${t}>${x.map((i) => `<li>${esc(fill(i, v))}</li>`).join('')}</${t}>`;
    if (t === 'tip') return `<p class="tip">${esc(fill(x, v))}</p>`;
    if (t === 'table') return `<div class="tablewrap" role="region" aria-label="${esc(d.h1)}" tabindex="0"><table class="cmp"><thead><tr>${x.map((h, i) => `<th scope="col"${i === 1 ? ' class="us"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${y.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((c, i) => `<td${i === 0 ? ' class="us"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (t === 'go') return `<p><a class="go" href="${rel(here, dirOf(l, y))}">${esc(x)}</a></p>`;
    if (t === 'source') return cfg.source ? `<p><a class="go" href="${esc(cfg.source)}" rel="noopener">${esc(x)}</a></p>` : '';
    if (t === 'kofi') return cfg.kofi ? `<p><a class="go" href="https://ko-fi.com/${esc(cfg.kofi)}" rel="noopener">${esc(x)}</a></p>` : '';
    if (t === 'adsOn') return adsOn ? `<p>${esc(fill(x, v))}</p>` : '';
    if (t === 'adsOff') return adsOn ? '' : `<p>${esc(fill(x, v))}</p>`;
    if (t === 'ad') return adSlot(kind);
    return `<p>${esc(fill(x, v))}</p>`;
  }).join('\n');
  const home = rel(here, dirOf(l, 'home'));
  const ld = DOCS.slice(0, 5).includes(kind) ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: d.h1, description: d.desc, inLanguage: l, dateModified: cfg.updated, author: { '@type': 'Organization', name: cfg.name }, publisher: { '@type': 'Organization', name: cfg.name } }).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.desc)}">
${headLinks(l, kind, d)}
${ld}
${adHead(kind)}
<style>
:root{--bg:#f6f2ee;--panel:#ffffff;--ink:#221d1a;--muted:#6b625c;--line:#e2dbd4;--accent:#bf4e19;--accent-ink:#ffffff;--accent-soft:#fbe9df;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1a1614;--panel:#23201d;--ink:#ece7e3;--muted:#a39a93;--line:#3a332e;--accent:#f0874d;--accent-ink:#16181b;--accent-soft:#3b2519;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1a1614;--panel:#23201d;--ink:#ece7e3;--muted:#a39a93;--line:#3a332e;--accent:#f0874d;--accent-ink:#16181b;--accent-soft:#3b2519;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;background:var(--panel);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:19px;color:var(--ink);text-decoration:none}
.open{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:8px;background:var(--accent);color:var(--accent-ink);font-weight:700;text-decoration:none;font-size:15px}
main{max-width:760px;margin:0 auto;padding-block:32px 48px;padding-inline:16px;display:flex;flex-direction:column;gap:32px}
h1{font-size:clamp(28px,5vw,38px);line-height:1.15;margin:0;letter-spacing:-.015em;text-wrap:balance}
.updated{color:var(--muted);margin:6px 0 0;font-size:14px}
.tablewrap{overflow-x:auto;margin:6px 0 18px calc(50% - min(560px, 50vw - 16px));width:min(1120px, calc(100vw - 32px));border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.cmp{border-collapse:collapse;font-size:14px;line-height:1.45;min-width:760px;width:100%}
.cmp th,.cmp td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.cmp thead th{font-size:14px;background:var(--bg)}
.cmp tbody th{font-weight:600;position:sticky;left:0;background:var(--panel);min-width:150px}
.cmp .us{background:var(--accent-soft);font-weight:600}
.cmp tbody tr:last-child>*{border-bottom:0}
.doc h2{font-size:20px;margin:28px 0 6px}
.doc p,.doc li{max-width:65ch}
.doc p{margin:0 0 10px}
.doc ol,.doc ul{margin:0 0 12px;padding-left:24px;display:flex;flex-direction:column;gap:6px}
.doc .tip{background:var(--accent-soft);border-radius:10px;padding:12px 14px}
.go{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:9px;background:var(--accent);color:var(--accent-ink);font-weight:700;text-decoration:none;margin:4px 0}
.seo{display:flex;flex-direction:column;gap:28px}
.seo h2{font-size:20px;margin:0 0 12px}
.links{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0;padding:0;list-style:none}
.links a{color:var(--accent);font-weight:600;text-underline-offset:3px}
.links a[aria-current]{color:var(--ink);text-decoration:none}
.sitefoot{border-top:1px solid var(--line);padding-top:18px;color:var(--muted);font-size:14px;display:flex;flex-direction:column;gap:10px}
.ad-wrap{min-height:120px}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
</head>
<body>
<header><a class="brand" href="${home}"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="2" width="18" height="20" rx="2.5" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/><rect x="6" y="5.5" width="12" height="5" rx="1" fill="var(--accent)"/><path d="M6 14h12M6 17h8" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/></svg>${esc(cfg.name)}</a><a class="open" href="${home}">${esc(c.openApp)}</a></header>
<main>
<div><h1>${esc(d.h1)}</h1>${d.updated ? `<p class="updated">${esc(fill(d.updated, { date: dateText(l) }))}</p>` : ''}</div>
<div class="doc">
${body}
</div>
<div class="seo">${footer(l, kind, here)}</div>
</main>
</body>
</html>
`;
}

// ------------------------------------------------------------------ write everything
const written = [];
// pages from an older version of this script that no longer exist are removed (only our own index.html files)
const old = fs.existsSync(path.join(root, 'site/pages.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'site/pages.json'), 'utf8')) : [];
for (const l of LANGS) for (const kind of KINDS) {
  const dir = dirOf(l, kind), file = path.join(root, dir, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, TOOLS[kind] ? toolPage(l, kind) : docPage(l, kind));
  written.push(path.relative(root, file).split(path.sep).join('/'));
}
for (const f of old) if (!written.includes(f) && f !== 'index.html' && /\/index\.html$/.test(f) && fs.existsSync(path.join(root, f))) { fs.unlinkSync(path.join(root, f)); try { fs.rmdirSync(path.dirname(path.join(root, f))); } catch { /* not empty */ } }
fs.writeFileSync(path.join(root, 'site/pages.json'), JSON.stringify(written, null, 1));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => KINDS.map((kind) => `<url><loc>${urlOf(l, kind)}</loc><lastmod>${cfg.updated}</lastmod>${LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${urlOf(x, kind)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${urlOf('en', kind)}"/></url>`)).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root, 'public/sitemap.xml'), sitemap);
// a plain summary for AI assistants and search tools (llmstxt.org)
{
  const e = content.en, link = (k) => `- [${e.nav[k] || k}](${urlOf('en', k)})`;
  fs.writeFileSync(path.join(root, 'public/llms.txt'), `# ${cfg.name}

> ${cfg.name} is a free web app that opens, edits, prints and converts Microsoft Publisher (.pub) files in any browser, on Windows, Mac, Linux, Chromebook, iPhone, iPad and Android. Files are read inside the browser and never uploaded. No account, no watermark, no limits. Open source (MPL 2.0)${cfg.source ? `: ${cfg.source}` : ''}.

Microsoft retired Publisher in October 2026; ${cfg.name} lets people keep using their .pub newsletters, flyers, menus, cards and brochures.

## What it does
- Opens .pub files from Publisher 97 to Microsoft 365, with text, pictures, shapes, tables, WordArt and linked text boxes
- Edits text, fonts, colours, pictures, tables and layout; lists, styles, master pages, spell check, undo
- Saves as PDF (searchable, embedded fonts, print-ready CMYK with bleed and crop marks), Word (.docx), PowerPoint (.pptx), LibreOffice Draw (.odg), XPS, web page, e-mail, JPG and PNG, plus SVG, Scribus (.sla) and Adobe InDesign (.idml) for designers
- Prints booklets, posters over several sheets, folded cards, labels and business cards
- More than 150 templates (flyers, menus, newsletters, invitations, certificates, calendars, labels, community and family events)
- Mail merge from CSV or Excel, with a photo per copy, catalogues and one e-mail per person
- Converts many .pub files at once
- Works offline after the first visit
- Interface in English, Spanish, German, French, Portuguese and Italian
- Cannot save back to .pub (no tool can); keeps your original file unchanged

## Pages
- [Open and edit .pub files](${cfg.url}/)
${['edit', 'pdf', 'word', 'jpg', 'png', 'batch', 'compare', 'retired', 'alternative', 'mobile', 'mac', 'chromebook', 'guide-merge', 'guide-booklet', 'guide-labels', 'it', 'privacy'].map(link).join('\n')}

## Other languages
${LANGS.filter((x) => x !== 'en').map((x) => `- ${words[x]['lang.name']}: ${urlOf(x, 'home')}`).join('\n')}
`);
}
fs.writeFileSync(path.join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cfg.url}/sitemap.xml\n`);
// a page for addresses that don't exist, in English with links to every language's home
fs.writeFileSync(path.join(root, 'public/404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | ${esc(cfg.name)}</title><meta name="robots" content="noindex"><style>body{margin:0;font:17px/1.6 system-ui,sans-serif;background:#f6f2ee;color:#221d1a;display:grid;place-items:center;min-height:100vh;padding:16px}main{max-width:520px}a{color:#bf4e19;font-weight:700}@media (prefers-color-scheme:dark){body{background:#1a1614;color:#ece7e3}a{color:#f0874d}}</style></head><body><main><h1>Page not found</h1><p>This page doesn’t exist, but ${esc(cfg.name)} does: <a href="/">open your Publisher files here</a>.</p><p>${LANGS.filter((l) => l !== 'en').map((l) => `<a href="/${l}/" lang="${l}">${esc(words[l]['lang.name'])}</a>`).join(' · ')}</p></main></body></html>\n`);
console.log(`pages: ${written.length} written, sitemap.xml, robots.txt and 404.html in public/`);
