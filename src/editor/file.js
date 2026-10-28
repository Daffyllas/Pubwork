import { sanitizeDoc } from './sanitize.js';
// Pubwork's own file (.pubwork): a small zip holding the document, so work can be opened and changed
// later. Also keeps the latest work in this browser (IndexedDB), so nothing is lost if the tab closes.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const FORMAT = 'pubwork';
const VERSION = 1;
// what is saved: the pages and what is needed to draw them again
const keep = (doc) => ({ name: doc.name, uid: doc.uid, pages: doc.pages, masters: doc.masters || [], fonts: doc.fonts || {}, embeddedFonts: doc.embeddedFonts || [], meta: doc.meta || {}, source: doc.source, scheme: doc.scheme, fontPair: doc.fontPair, template: doc.template, mergeData: doc.mergeData, merged: doc.merged, guides: doc.guides });

export { keep as keptPart };
// a picture used many times (a logo on every page, a sheet of labels) is stored once: big 'data' strings
// become { $media: n } and the strings themselves go in a list beside the document
function pack(obj) {
  const media = [], index = new Map();
  const json = JSON.stringify(obj, (k, v) => {
    if (k !== 'data' || typeof v !== 'string' || v.length < 2048) return v;
    let n = index.get(v); if (n == null) { n = media.length; media.push(v); index.set(v, n); }
    return { $media: n };
  });
  return { json, media };
}
function unpack(json, media = []) {
  return JSON.parse(json, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && typeof v.$media === 'number' && Object.keys(v).length === 1
    ? (typeof media[v.$media] === 'string' ? media[v.$media] : '') : v));
}
export function toPubwork(doc) {
  const { json, media } = pack(keep(doc));
  const files = {
    'mimetype': [strToU8('application/x-pubwork'), { level: 0 }],
    'pubwork.json': strToU8(JSON.stringify({ format: FORMAT, version: VERSION, app: 'Pubwork', saved: new Date().toISOString() })),
    'document.json': strToU8(json),
  };
  media.forEach((m, i) => { files[`media/${i}.txt`] = strToU8(m); });
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
}
export const isZip = (u8) => u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04;
export function fromPubwork(u8) {
  const files = unzipSync(u8);
  const info = files['pubwork.json'] ? JSON.parse(strFromU8(files['pubwork.json'])) : null;
  if (!info || info.format !== FORMAT || !files['document.json']) throw Object.assign(new Error('not a Pubwork file'), { code: 'notpubwork' });
  if (info.version > VERSION) throw Object.assign(new Error('made by a newer Pubwork'), { code: 'newer' });
  const media = [];
  for (const [path, bytes] of Object.entries(files)) { const m = /^media\/(\d+)\.txt$/.exec(path); if (m) media[+m[1]] = strFromU8(bytes); }
  const doc = sanitizeDoc(unpack(strFromU8(files['document.json']), media));
  doc.notes ||= {};
  return doc;
}

// ------------------------------------------------------------------ keeping work in this browser
const DB = 'pubwork', STORE = 'work';
function db() {
  return new Promise((res, rej) => {
    let req; try { req = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'uid' });
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); });
}
export async function keepLocally(doc, thumb = null) {
  try {
    const { json, media } = pack(keep(doc)); // a picture repeated on every page is kept once
    await tx('readwrite', (s) => s.put({ uid: doc.uid, name: doc.name, updated: Date.now(), pages: doc.pages.length, thumb, packed: json, media }));
    return true;
  } catch { return false; }
}
export async function listLocal() {
  try {
    const all = await tx('readonly', (s) => s.getAll());
    return (all || []).sort((a, b) => b.updated - a.updated).map(({ uid, name, updated, pages, thumb }) => ({ uid, name, updated, pages, thumb }));
  } catch { return []; }
}
export async function loadLocal(uid) {
  try {
    const rec = await tx('readonly', (s) => s.get(uid));
    if (!rec) return null;
    return rec.packed ? unpack(rec.packed, rec.media) : rec.doc || null; // older records hold the document as it is
  } catch { return null; }
}
export async function forgetLocal(uid) { try { await tx('readwrite', (s) => s.delete(uid)); } catch { /* fine */ } }
// keep the newest 12 pieces of work
export async function trimLocal(max = 12) { const list = await listLocal(); for (const w of list.slice(max)) await forgetLocal(w.uid); }
