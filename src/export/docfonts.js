// Fonts for the designers' formats (Scribus, InDesign, SVG). The screen draws a Microsoft font that isn't on
// this computer with a free look-alike (Impact -> Oswald). Writing "Impact" in the file would make the other
// program use different letters (or its own default) and lines would no longer fit, so:
//  - a font that is on this computer, came inside the .pub file, or has a look-alike with the very same
//    letter widths (Calibri/Carlito…) keeps its own name;
//  - otherwise the file names the look-alike the page was really drawn with, in the styles it has,
//    and the download comes as a .zip with those fonts in a "Document Fonts" folder (InDesign uses that
//    folder by itself; other programs need the fonts installed), their licences and a short read-me.
import { zipSync, strToU8 } from 'fflate';
import { fontReport, embeddedFontBytes } from '../fonts.js';
import { safeName } from './stage.js';
import { t } from '../i18n/index.js';

const siteRoot = () => new URL(document.querySelector('meta[name="pw-root"]')?.content || './', document.baseURI);
const FOLDER = 'Document Fonts';
let indexP = null;
const loadIndex = () => (indexP ||= fetch(new URL('docfonts/fonts.json', siteRoot())).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
const lc = (s) => String(s || '').trim().toLowerCase();
const key = (bold, italic) => `${bold ? 700 : 400} ${italic ? 'italic' : 'normal'}`;

export async function fontPlan(doc, embedded = new Map()) {
  const [report, index] = await Promise.all([fontReport(doc, embedded).catch(() => []), loadIndex()]);
  const swap = new Map(); // original (lower case) -> { family, avail }
  const keepEmbedded = new Set();
  for (const f of report) {
    if (f.embedded) { keepEmbedded.add(f.original); continue; }
    if (f.installed || f.sameWidths || !f.standIn || lc(f.standIn) === lc(f.original)) continue;
    const entry = index[f.standIn];
    swap.set(lc(f.original), { family: f.standIn, avail: entry ? Object.keys(entry.files) : ['400 normal', '700 normal', '400 italic', '700 italic'] });
  }
  const usedFamilies = new Set(), usedEmbedded = new Set(), instead = new Map(); // look-alike -> originals it stands in for
  return {
    // the name to write for a font, and whether bold/italic exist in it (the screen fakes the missing ones)
    face(name, bold = false, italic = false) {
      if (keepEmbedded.has(String(name || '').trim())) usedEmbedded.add(String(name).trim());
      const s = swap.get(lc(name));
      if (!s) return { family: String(name || '').trim(), bold, italic };
      const [b, i] = [[bold, italic], [bold, false], [false, italic], [false, false]].find(([x, y]) => s.avail.includes(key(x, y))) || [false, false];
      usedFamilies.add(s.family);
      if (!instead.has(s.family)) instead.set(s.family, new Set());
      instead.get(s.family).add(String(name).trim());
      return { family: s.family, bold: b, italic: i };
    },
    // the look-alike's name for a CSS family name, or null when the name stays
    standIn: (name) => swap.get(lc(name))?.family || null,
    // the font files to hand over: [{ path, bytes }]
    async files() {
      const out = [], jobs = [];
      for (const fam of usedFamilies) {
        const entry = index[fam]; if (!entry) continue;
        for (const file of [...Object.values(entry.files), entry.licence].filter(Boolean)) {
          jobs.push(fetch(new URL(`docfonts/${file}`, siteRoot())).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => b && out.push({ path: `${FOLDER}/${file}`, bytes: new Uint8Array(b) })).catch(() => {}));
        }
      }
      await Promise.all(jobs);
      for (const name of usedEmbedded) {
        const bytes = embeddedFontBytes.get(name); if (!bytes) continue;
        const sig = String.fromCharCode(...bytes.subarray(0, 4));
        if (sig === 'wOF2' || sig === 'wOFF') continue; // web-only formats: no program installs them
        out.push({ path: `${FOLDER}/${safeName(name)}${sig === 'OTTO' ? '.otf' : '.ttf'}`, bytes });
      }
      return out.sort((a, b) => a.path.localeCompare(b.path));
    },
    families: () => [...usedFamilies],
    instead: (fam) => [...(instead.get(fam) || [])],
  };
}

// { name, blob } (or several files) + the fonts -> one .zip; unchanged when there are no fonts to add
// files: [{ name, bytes }] the program's own file(s); what: 'Scribus' | 'InDesign' | 'SVG'
export async function withFonts(doc, files, plan, what, single) {
  const fonts = plan ? await plan.files() : [];
  if (!fonts.length) return single;
  const files2 = fonts.filter((f) => /\.(ttf|otf)$/i.test(f.path)).map((f) => f.path.slice(FOLDER.length + 1));
  // one line per font: its files, and the font it stands in for (to swap back by anyone who has that one)
  const lines = [];
  for (const fam of plan.families()) {
    const mine = files2.filter((f) => f.startsWith(`${fam.replace(/ /g, '')}-`)); if (!mine.length) continue;
    const was = plan.instead(fam);
    lines.push(`- ${was.length ? t('fonts.readmeInstead', { font: fam, original: was.join(', ') }) : fam}: ${mine.join(', ')}`);
  }
  for (const f of files2) if (!lines.some((l) => l.includes(f))) lines.push(`- ${f}`);
  const readme = [
    t('fonts.readmeTitle', { name: doc.name || 'Document' }),
    '',
    t('fonts.readmeWhy', { folder: FOLDER }),
    '',
    `- ${t('fonts.readmeInDesign', { folder: FOLDER })}`,
    `- ${t('fonts.readmeOthers')}`,
    '',
    t('fonts.readmeList'),
    ...lines,
    '',
    t('fonts.readmeLicence'),
    '',
  ].join('\r\n');
  const entries = {};
  for (const f of files) entries[f.name] = [f.bytes, { level: 6 }];
  for (const f of fonts) entries[f.path] = [f.bytes, { level: 6 }];
  entries[`${t('fonts.readmeFile')}.txt`] = [strToU8(readme), { level: 6 }];
  return { name: `${safeName(doc.name)} (${what}).zip`, blob: new Blob([zipSync(entries)], { type: 'application/zip' }) };
}
