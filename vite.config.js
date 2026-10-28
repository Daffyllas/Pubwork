import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// every page tools/make-pages.mjs wrote (6 languages × app, converters, privacy, terms)
const pages = fs.existsSync('site/pages.json') ? JSON.parse(fs.readFileSync('site/pages.json', 'utf8')) : ['index.html'];

// The stand-in fonts come from @fontsource. Every browser Pubwork supports reads woff2, and Publisher
// files rarely need more than Latin, Greek and Cyrillic, so the older woff copies and the other subsets
// are left out. That keeps the app at ~150 font files instead of ~620.
const KEEP_SUBSETS = new Set(['latin', 'latin-ext', 'greek', 'cyrillic', 'cyrillic-ext']);
const slimFonts = {
  name: 'pubwork-slim-fonts',
  enforce: 'pre',
  transform(code, id) {
    if (!/@fontsource[\\/].*\.css$/.test(id)) return null;
    const blocks = code.split(/(?=\/\* )/).filter((b) => {
      const m = /^\/\* [a-z0-9-]+?-((?:latin|greek|cyrillic|vietnamese|math|symbols|hebrew|devanagari|arabic|khmer|thai)(?:-ext)?)-\d{3}-/.exec(b);
      return !m || KEEP_SUBSETS.has(m[1]);
    });
    return { code: blocks.join('').replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, ''), map: null };
  },
};

export default defineConfig({
  base: './',
  plugins: [slimFonts],
  worker: { format: 'es' },
  esbuild: { charset: 'ascii' }, // write non-ASCII characters in the scripts as \u escapes
  build: { outDir: 'dist', assetsInlineLimit: 0, target: 'es2020', chunkSizeWarningLimit: 3000, rollupOptions: { input: Object.fromEntries(pages.map((p) => [p.replace(/\/?index\.html$/, '') || 'home', path.resolve(p)])) } },
  server: { host: true },
});
