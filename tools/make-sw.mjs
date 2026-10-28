// After `vite build`: writes dist/sw.js, the service worker that lets Pubwork work offline after the first visit.
// The app's code (all scripts, styles and the .pub reader) is stored when the worker installs; pages, fonts,
// pictures and spelling dictionaries are stored the first time they are used. A new build gets a new cache name,
// so visitors always move to the newest version and old files are cleaned away.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dist = path.resolve('dist');
const all = [];
(function walk(dir) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else all.push(path.relative(dist, p).split(path.sep).join('/')); } })(dist);
const core = all.filter((f) => /^assets\/.*\.(js|css)$/.test(f) || /^pubreader\//.test(f)).sort();
const list = ['./', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', ...core];
const hash = crypto.createHash('sha256');
for (const f of [...core, 'index.html']) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// Pubwork service worker (made by tools/make-sw.mjs): offline use after the first visit. Files never leave your device.
const CACHE = 'pubwork-${version}';
const CORE = ${JSON.stringify(list)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new URL(u, self.registration.scope).href))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('pubwork-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // counters and anything else: straight to the network
  if (req.mode === 'navigate') { // pages: newest from the network, the stored copy when offline
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(new URL('./', self.registration.scope).href))));
    return;
  }
  if (/\\/(assets|pubreader|pdffonts|samples)\\//.test(url.pathname)) { // files that never change under the same name
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => put(req, res))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => { const net = fetch(req).then((res) => put(req, res)); return r || net; }));
});
`;
fs.writeFileSync(path.join(dist, 'sw.js'), sw);
const kb = core.reduce((n, f) => n + fs.statSync(path.join(dist, f)).size, 0) / 1024;
console.log(`sw.js: cache ${version}, ${list.length} files stored at install (${Math.round(kb)} KB)`);
