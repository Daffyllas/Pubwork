// Fonts. Microsoft's fonts can't be shipped, so each common Publisher font gets a free stand-in; the
// metric-compatible ones (Carlito for Calibri, Caladea for Cambria, Arimo for Arial, Tinos for Times New
// Roman, Cousine for Courier New, Gelasio for Georgia) have identical letter widths, so lines break in
// the same places. The original name stays first in the CSS list: if the font is installed on the
// computer (most Windows PCs have Calibri), the real one is used.
import '@fontsource/carlito/400.css'; import '@fontsource/carlito/700.css'; import '@fontsource/carlito/400-italic.css'; import '@fontsource/carlito/700-italic.css';
import '@fontsource/caladea/400.css'; import '@fontsource/caladea/700.css'; import '@fontsource/caladea/400-italic.css'; import '@fontsource/caladea/700-italic.css';
import '@fontsource/arimo/400.css'; import '@fontsource/arimo/700.css'; import '@fontsource/arimo/400-italic.css'; import '@fontsource/arimo/700-italic.css';
import '@fontsource/tinos/400.css'; import '@fontsource/tinos/700.css'; import '@fontsource/tinos/400-italic.css'; import '@fontsource/tinos/700-italic.css';
import '@fontsource/cousine/400.css'; import '@fontsource/cousine/700.css';
import '@fontsource/gelasio/400.css'; import '@fontsource/gelasio/700.css'; import '@fontsource/gelasio/400-italic.css';
import '@fontsource/open-sans/400.css'; import '@fontsource/open-sans/700.css'; import '@fontsource/open-sans/400-italic.css';
import '@fontsource/source-sans-3/400.css'; import '@fontsource/source-sans-3/700.css'; import '@fontsource/source-sans-3/400-italic.css';
import '@fontsource/cabin/400.css'; import '@fontsource/cabin/700.css'; import '@fontsource/cabin/400-italic.css';
import '@fontsource/lato/400.css'; import '@fontsource/lato/700.css'; import '@fontsource/lato/400-italic.css';
import '@fontsource/montserrat/400.css'; import '@fontsource/montserrat/700.css';
import '@fontsource/libre-franklin/400.css'; import '@fontsource/libre-franklin/700.css';
import '@fontsource/eb-garamond/400.css'; import '@fontsource/eb-garamond/700.css'; import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/lora/400.css'; import '@fontsource/lora/700.css'; import '@fontsource/lora/400-italic.css';
import '@fontsource/merriweather/400.css'; import '@fontsource/merriweather/700.css';
import '@fontsource/oswald/400.css'; import '@fontsource/oswald/700.css';
import '@fontsource/archivo-narrow/400.css'; import '@fontsource/archivo-narrow/700.css';
import '@fontsource/comic-neue/400.css'; import '@fontsource/comic-neue/700.css';
import '@fontsource/roboto-slab/400.css'; import '@fontsource/roboto-slab/700.css';
import '@fontsource/dancing-script/400.css'; import '@fontsource/dancing-script/700.css';
import '@fontsource/great-vibes/400.css';
import '@fontsource/caveat/400.css';

// original font (lower case) -> [stand-in, generic, same widths?]
const MAP = {
  calibri: ['Carlito', 'sans-serif', true], 'calibri light': ['Carlito', 'sans-serif', false],
  cambria: ['Caladea', 'serif', true],
  arial: ['Arimo', 'sans-serif', true], helvetica: ['Arimo', 'sans-serif', true], 'arial narrow': ['Archivo Narrow', 'sans-serif', false], 'arial black': ['Arimo', 'sans-serif', false],
  'times new roman': ['Tinos', 'serif', true], times: ['Tinos', 'serif', true],
  'courier new': ['Cousine', 'monospace', true], courier: ['Cousine', 'monospace', true],
  georgia: ['Gelasio', 'serif', true],
  verdana: ['Open Sans', 'sans-serif', false], tahoma: ['Open Sans', 'sans-serif', false], 'segoe ui': ['Open Sans', 'sans-serif', false], 'lucida sans': ['Open Sans', 'sans-serif', false], 'lucida sans unicode': ['Open Sans', 'sans-serif', false], 'microsoft sans serif': ['Arimo', 'sans-serif', false],
  'trebuchet ms': ['Source Sans 3', 'sans-serif', false], candara: ['Source Sans 3', 'sans-serif', false], corbel: ['Source Sans 3', 'sans-serif', false],
  'gill sans mt': ['Cabin', 'sans-serif', false], 'gill sans': ['Cabin', 'sans-serif', false], 'gill sans mt condensed': ['Archivo Narrow', 'sans-serif', false],
  'century gothic': ['Montserrat', 'sans-serif', false], futura: ['Montserrat', 'sans-serif', false], 'tw cen mt': ['Montserrat', 'sans-serif', false],
  'franklin gothic book': ['Libre Franklin', 'sans-serif', false], 'franklin gothic medium': ['Libre Franklin', 'sans-serif', false], 'franklin gothic demi': ['Libre Franklin', 'sans-serif', false],
  garamond: ['EB Garamond', 'serif', false], 'adobe garamond pro': ['EB Garamond', 'serif', false],
  'book antiqua': ['Lora', 'serif', false], palatino: ['Lora', 'serif', false], 'palatino linotype': ['Lora', 'serif', false], constantia: ['Lora', 'serif', false], 'century schoolbook': ['Lora', 'serif', false],
  'bookman old style': ['Merriweather', 'serif', false],
  impact: ['Oswald', 'sans-serif', false], haettenschweiler: ['Oswald', 'sans-serif', false], 'agency fb': ['Oswald', 'sans-serif', false],
  'comic sans ms': ['Comic Neue', 'cursive', false],
  rockwell: ['Roboto Slab', 'serif', false], 'rockwell extra bold': ['Roboto Slab', 'serif', false], 'courier std': ['Cousine', 'monospace', false],
  'monotype corsiva': ['Dancing Script', 'cursive', false], 'brush script mt': ['Dancing Script', 'cursive', false], 'lucida calligraphy': ['Dancing Script', 'cursive', false],
  'edwardian script itc': ['Great Vibes', 'cursive', false], 'vivaldi': ['Great Vibes', 'cursive', false], 'french script mt': ['Great Vibes', 'cursive', false], 'kunstler script': ['Great Vibes', 'cursive', false],
  'lucida handwriting': ['Caveat', 'cursive', false], 'bradley hand itc': ['Caveat', 'cursive', false], 'segoe print': ['Caveat', 'cursive', false], 'segoe script': ['Caveat', 'cursive', false], 'kristen itc': ['Caveat', 'cursive', false],
};
const SCRIPTY = /script|hand|callig|brush|pen|kunstler|vivaldi|curlz|jokerman|chiller/i;
const SERIFY = /roman|serif|garamond|book|times|bodoni|baskerville|caslon|century|georgia|cambria|antiqua|palatino|goudy|minion|perpetua|rockwell|elephant|bell mt|centaur|constantia/i;
const MONO = /mono|courier|consolas|lucida console|typewriter/i;

export function fontInfo(name) {
  const key = String(name || '').trim().toLowerCase();
  const hit = MAP[key];
  if (hit) return { original: name, standIn: hit[0], generic: hit[1], sameWidths: hit[2] };
  const generic = SCRIPTY.test(key) ? 'cursive' : MONO.test(key) ? 'monospace' : SERIFY.test(key) ? 'serif' : 'sans-serif';
  const standIn = generic === 'cursive' ? 'Dancing Script' : generic === 'monospace' ? 'Cousine' : generic === 'serif' ? 'Tinos' : 'Arimo';
  return { original: name, standIn, generic, sameWidths: false };
}
const q = (s) => `"${String(s).replace(/"/g, '')}"`;
// CSS font-family list for a font name used in a document
export function cssFamily(name, embedded = null) {
  if (!name) return '"Carlito", sans-serif';
  const f = fontInfo(name);
  const list = [];
  if (embedded?.has(name)) list.push(q(`pw-embedded-${name}`));
  list.push(q(name), q(f.standIn), f.generic);
  return list.join(', ');
}
// Fonts embedded in the .pub file become real web fonts for this document; their bytes are kept for PDFs
export const embeddedFontBytes = new Map();
export function loadEmbeddedFonts(doc) {
  const names = new Set();
  embeddedFontBytes.clear();
  for (const f of doc.embeddedFonts || []) {
    try {
      const bin = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
      const face = new FontFace(`pw-embedded-${f.name}`, bin);
      document.fonts.add(face); face.load().catch(() => {});
      names.add(f.name); embeddedFontBytes.set(f.name, bin);
    } catch { /* unusable font data */ }
  }
  return names;
}
// Which fonts in the document are missing on this computer and what stands in for them
export async function fontReport(doc, embedded) {
  const out = [];
  for (const name of Object.keys(doc.fonts || {})) {
    const f = fontInfo(name);
    let installed = false;
    try { installed = document.fonts.check(`12px ${q(name)}`) && !(await isFallback(name)); } catch { installed = false; }
    out.push({ ...f, embedded: embedded.has(name), installed, uses: doc.fonts[name] });
  }
  return out.sort((a, b) => b.uses - a.uses);
}
// document.fonts.check() says true for any unknown font; compare widths with a fallback to be sure
async function isFallback(name) {
  const c = document.createElement('canvas').getContext('2d');
  const probe = 'mmmmmmmmmmlli1WWQ@@';
  c.font = `40px ${q(name)}, monospace`; const a = c.measureText(probe).width;
  c.font = '40px monospace'; const b = c.measureText(probe).width;
  c.font = `40px ${q(name)}, serif`; const a2 = c.measureText(probe).width;
  c.font = '40px serif'; const b2 = c.measureText(probe).width;
  return a === b && a2 === b2;
}
