// Reads a .pub file off the main thread: runs libmspub (WebAssembly) and builds our page model.
import { buildDocument } from './pubmodel.js';

let modP = null;
async function reader() {
  if (!modP) {
    // public/pubreader, next to assets/ (each path written out whole: the dev server drops a trailing slash)
    const mod = new URL('../pubreader/pubreader.mjs', import.meta.url);
    modP = import(/* @vite-ignore */ mod.href).then((m) => m.default({ locateFile: (f) => new URL(f, mod).href, print() {}, printErr() {} }));
  }
  return modP;
}
// does the file say it was made by Publisher? (the CompObj stream names the program)
function has(b, text) {
  const tag = [...text].map((c) => c.charCodeAt(0));
  outer: for (let i = 0, n = Math.min(b.length, 1 << 22) - tag.length; i < n; i++) {
    for (let j = 0; j < tag.length; j++) if (b[i + j] !== tag[j]) continue outer;
    return true;
  }
  return false;
}
const isPublisher = (b) => has(b, 'MSPublisher') || has(b, 'Microsoft Publisher');
// an OLE file whose sector tables point past its end was cut off (an interrupted download or copy)
function cutShort(b) {
  if (b.length < 512) return true;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ss = 1 << dv.getUint16(0x1e, true); if (ss !== 512 && ss !== 4096) return false;
  const sectors = Math.floor((b.length - ss) / ss), fat = [];
  for (let i = 0; i < 109; i++) { const s = dv.getUint32(0x4c + i * 4, true); if (s < 0xfffffffa) fat.push(s); }
  let maxUsed = -1;
  for (const s of fat) {
    if (s >= sectors) return true;
    const off = ss + s * ss;
    for (let k = 0; k < ss / 4; k++) { const v = dv.getUint32(off + k * 4, true); if (v !== 0xffffffff) maxUsed = Math.max(maxUsed, fat.indexOf(s) * (ss / 4) + k); }
  }
  return maxUsed >= sectors;
}
// the CompObj stream names the program: "MSPublisher.2" is Publisher 2.0
function isPublisher2(b) {
  const tag = [77, 83, 80, 117, 98, 108, 105, 115, 104, 101, 114, 46, 50, 0]; // "MSPublisher.2\0"
  outer: for (let i = 0, n = Math.min(b.length, 1 << 20) - tag.length; i < n; i++) {
    for (let j = 0; j < tag.length; j++) if (b[i + j] !== tag[j]) continue outer;
    return true;
  }
  return false;
}
self.onmessage = async (ev) => {
  const { buf, name } = ev.data;
  try {
    self.postMessage({ status: 'busy.reading' });
    const M = await reader();
    const bytes = new Uint8Array(buf);
    const p = M._malloc(bytes.length); M.HEAPU8.set(bytes, p);
    let rc;
    try { rc = M._pub_convert(p, bytes.length); } finally { M._free(p); }
    if (rc === 1) { self.postMessage({ error: isPublisher(bytes) || cutShort(bytes) ? 'damaged' : 'notpub' }); return; } // a Publisher file that can't be read is damaged, not too old
    const json = M.UTF8ToString(M._pub_result(), M._pub_result_size());
    const ops = JSON.parse(json);
    self.postMessage({ status: 'busy.building' });
    const doc = buildDocument(ops, { source: 'pub' });
    doc.name = name.replace(/\.pub$/i, '');
    doc.partial = rc === 2;
    // Publisher 2.0 (1993) files carry a format the reader does not know: it finds the pages but nothing on them
    const empty = !doc.pages.some((pg) => pg.items?.length);
    if (empty && isPublisher2(bytes)) { self.postMessage({ error: 'oldpub' }); return; }
    if (!doc.pages.length && rc === 2) { self.postMessage({ error: 'damaged' }); return; }
    // a publication with nothing on it (Publisher shows one blank page): open it as one blank page, and say so
    if (!doc.pages.length && cutShort(bytes)) { self.postMessage({ error: 'damaged' }); return; } // a half-downloaded file is not an empty publication
    if (!doc.pages.length) { doc.pages.push({ id: 'p-empty', w: 612, h: 792, items: [] }); doc.emptyFile = true; }
    self.postMessage({ doc });
  } catch (err) {
    self.postMessage({ error: 'crash', detail: String(err?.message || err) });
  }
};
