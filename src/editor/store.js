// Work is kept in the browser while people edit (so a closed tab or a crash loses nothing), and can be
// saved as a .pubwork file: a zip with the whole document inside, to open again later.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const DB = 'pubwork', STORE = 'docs', KEEP = 12;
let dbp = null;
function db() {
  dbp ||= new Promise((res, rej) => {
    let req;
    try { req = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const s = t.objectStore(STORE); const r = fn(s); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); };

export async function saveDraft(id, doc) {
  try {
    await tx('readwrite', (s) => s.put({ id, name: doc.name, pages: doc.pages.length, updated: Date.now(), doc }));
    const all = await listDrafts();
    for (const old of all.slice(KEEP)) await tx('readwrite', (s) => s.delete(old.id));
    return true;
  } catch { return false; } // private windows and some browsers refuse storage; editing still works
}
export async function listDrafts() {
  try {
    const rows = await tx('readonly', (s) => s.getAll());
    return (rows || []).map(({ id, name, pages, updated }) => ({ id, name, pages, updated })).sort((a, b) => b.updated - a.updated);
  } catch { return []; }
}
export async function loadDraft(id) { try { return (await tx('readonly', (s) => s.get(id)))?.doc || null; } catch { return null; } }
export async function deleteDraft(id) { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ } }

// ------------------------------------------------------------------ .pubwork files
export function packDocument(doc) {
  const json = JSON.stringify({ format: 'pubwork', version: 1, saved: new Date().toISOString(), doc });
  return new Blob([zipSync({ 'document.json': strToU8(json), 'mimetype': strToU8('application/x-pubwork') }, { level: 6 })], { type: 'application/zip' });
}
export function isPacked(u8) { return u8[0] === 0x50 && u8[1] === 0x4b; }
export function unpackDocument(u8) {
  const files = unzipSync(u8);
  const json = files['document.json'];
  if (!json) throw new Error('not a Pubwork file');
  const data = JSON.parse(strFromU8(json));
  if (data.format !== 'pubwork' || !data.doc?.pages) throw new Error('not a Pubwork file');
  return data.doc;
}
