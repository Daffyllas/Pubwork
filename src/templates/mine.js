// "My templates": designs people saved to start from again. Kept in this browser (IndexedDB).
import { keptPart } from '../editor/file.js';
import { clone, uid } from '../editor/model.js';

const DB = 'pubwork-templates', STORE = 'mine';
function db() {
  return new Promise((res, rej) => {
    let req; try { req = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); });
}
export async function saveMine(doc, name) {
  const copy = clone(keptPart(doc)); copy.name = name; delete copy.uid;
  try { await tx('readwrite', (s) => s.put({ id: uid('t'), name, saved: Date.now(), doc: copy })); return true; } catch { return false; }
}
export async function listMine() { try { return ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => b.saved - a.saved); } catch { return []; } }
export async function forgetMine(id) { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* fine */ } }
