// Tells Bing (and the other IndexNow search engines) about every page in the sitemap after an update.
// The key file public/<key>.txt proves the site is ours. Run from a computer that can reach api.indexnow.org:
//   node tools/indexnow.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const key = fs.readdirSync(path.join(root, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
if (!key) throw new Error('No IndexNow key file in public/');
const urls = [...fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = new URL(cfg.url).host;
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `${cfg.url}/${key}.txt`, urlList: urls }),
});
console.log(`IndexNow: sent ${urls.length} pages, answer ${r.status}`);
