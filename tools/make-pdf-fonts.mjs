// PDFs need the stand-in fonts as TrueType (the PDF library can't cut WOFF2 fonts down to the letters used).
// This turns every WOFF2 file the app uses into a .ttf in public/pdffonts/, plus manifest.json saying
// which family, weight, style and characters each file covers. The app only fetches them when saving a PDF.
//   node tools/make-pdf-fonts.mjs   (runs automatically before `npm run build`)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const decompress = require('wawoff2/decompress');
const KEEP = new Set(['latin', 'latin-ext', 'greek', 'cyrillic', 'cyrillic-ext']);
const out = path.join(root, 'public/pdffonts');
fs.mkdirSync(out, { recursive: true });

// the CSS files fonts.js imports, e.g. '@fontsource/carlito/700-italic.css'
const imports = [...fs.readFileSync(path.join(root, 'src/fonts.js'), 'utf8').matchAll(/import '(@fontsource\/[^']+\.css)'/g)].map((m) => m[1]);
const parseRanges = (s) => s.split(',').map((r) => {
  const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(r.trim()); if (!m) return null;
  if (m[1].includes('?')) return [parseInt(m[1].replace(/\?/g, '0'), 16), parseInt(m[1].replace(/\?/g, 'F'), 16)];
  return [parseInt(m[1], 16), parseInt(m[2] || m[1], 16)];
}).filter(Boolean);

const manifest = [];
for (const imp of imports) {
  const cssPath = require.resolve(imp, { paths: [root] });
  const css = fs.readFileSync(cssPath, 'utf8');
  for (const block of css.split(/(?=\/\* )/)) {
    const sub = /^\/\* [a-z0-9-]+?-((?:latin|greek|cyrillic|vietnamese|math|symbols|hebrew)(?:-ext)?)-\d{3}-/.exec(block);
    if (!sub || !KEEP.has(sub[1])) continue;
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const style = /font-style:\s*(\w+)/.exec(block)?.[1] || 'normal';
    const weight = +(/font-weight:\s*(\d+)/.exec(block)?.[1] || 400);
    const src = /url\(([^)]+\.woff2)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
    if (!family || !src) continue;
    const file = path.basename(src).replace(/\.woff2$/, '.ttf');
    const dest = path.join(out, file);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, Buffer.from(await decompress(fs.readFileSync(path.resolve(path.dirname(cssPath), src)))));
    manifest.push({ family, weight, style, ranges: range ? parseRanges(range) : [[0, 0x10ffff]], file });
  }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest));
console.log(`pdf fonts: ${manifest.length} files in public/pdffonts`);
