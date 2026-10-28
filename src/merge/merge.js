// Mail merge: text holds fields like «First name»; each row of the list fills them in.
// A picture frame can hold a photo field too (it.mergePhoto = column): each copy gets its own photo.
import { clone, uid, walkItems } from '../editor/model.js';
import { coverCrop } from './catalogue.js';

export const FIELD = /«([^«»\n]{1,60})»/g;
export const fieldText = (name) => `«${name}»`;

function* allRuns(pages) {
  for (const page of pages) {
    const rec = function* (items) {
      for (const it of items) {
        if (it.items) yield* rec(it.items);
        for (const p of it.paras || []) yield* p.runs;
        if (it.type === 'table') for (const row of it.rows) for (const c of row.cells) for (const p of c.paras || []) yield* p.runs;
      }
    };
    yield* rec(page.items);
  }
}
// every picture frame that takes a photo from the list
export function* photoFrames(pages) {
  const rec = function* (items, pi) { for (const it of items) { if (it.items) yield* rec(it.items, pi); if (it.type === 'image' && it.mergePhoto) yield { it, page: pi }; } };
  for (let i = 0; i < pages.length; i++) yield* rec(pages[i].items, i);
}
// the fields a document uses (photo columns included)
export function fieldsIn(doc) {
  const out = new Set();
  for (const r of allRuns(doc.pages)) for (const m of r.text.matchAll(FIELD)) out.add(m[1]);
  for (const { it } of photoFrames(doc.pages)) out.add(it.mergePhoto);
  return [...out];
}
export const fillText = (text, row) => String(text ?? '').replace(FIELD, (m, name) => (row && name in row ? row[name] : m));

// ------------------------------------------------------------------ photos
// The photo files live here in memory only, never in the saved document. Cut-to-fit copies are kept
// so the preview and the merged pages can be filled in at once.
const bank = { byName: new Map(), byStem: new Map(), crops: new Map(), count: 0 };
// "C:\Photos\Anna.JPG" -> { name: "anna.jpg", stem: "anna" }
export function photoKey(value) {
  const name = String(value ?? '').trim().split(/[\\/]/).pop().trim().toLowerCase();
  return { name, stem: name.replace(/\.[a-z0-9]{1,5}$/, '') };
}
export function setPhotoFiles(files) {
  bank.byName.clear(); bank.byStem.clear(); bank.crops.clear(); bank.count = files.length;
  for (const f of files) { const k = photoKey(f.name); bank.byName.set(k.name, f); if (!bank.byStem.has(k.stem)) bank.byStem.set(k.stem, f); }
}
export const photoCount = () => bank.count;
// the photo file for a value in the list, or null
export function photoFile(value) {
  const k = photoKey(value);
  if (!k.name) return null;
  return bank.byName.get(k.name) || bank.byStem.get(k.name) || bank.byStem.get(k.stem) || null;
}
const ratioOf = (it) => Math.round((it.w / (it.h || 1)) * 1000) / 1000;
const cropKey = (file, it) => `${file.name}|${file.size}|${ratioOf(it)}`;
// cut the photos these rows need to the shape of each frame (call before fillPages / mergedDocument)
export async function preparePhotos(pages, rows) {
  for (const { it } of photoFrames(pages)) {
    const max = Math.min(1200, Math.max(300, Math.round((Math.max(it.w, it.h) / 72) * 300))); // about 300 dots per inch
    for (const row of rows) {
      const file = row && photoFile(row[it.mergePhoto]);
      if (!file || bank.crops.has(cropKey(file, it))) continue;
      try { bank.crops.set(cropKey(file, it), await coverCrop(file, ratioOf(it), max)); } catch (err) { console.warn('photo', file.name, err); bank.crops.set(cropKey(file, it), null); }
    }
  }
}
function fillPhoto(it, row) {
  if (!bank.count) return; // no photos chosen yet: the frame stays as it is
  const file = row && photoFile(row[it.mergePhoto]), crop = file && bank.crops.get(cropKey(file, it));
  if (crop) { it.data = crop.data; it.mime = crop.mime; delete it.placeholder; }
  else { delete it.data; delete it.mime; it.placeholder = true; } // no photo for this person: an empty frame
}

// fill one record into pages (a copy); a field the list doesn't have stays as it is
const hasField = (it) => (it.paras || []).some((p) => p.runs.some((r) => r.text.includes('«')));
export function fillPages(pages, row) {
  const copy = clone(pages);
  // a box with a field may now hold longer text: one made in Pubwork grows to fit it (see growMerged),
  // any other box may shrink its text a little to fit, as Publisher's merge does
  const mark = (items) => items.forEach((it) => { if (it.items) mark(it.items); if (it.type === 'text' && hasField(it)) { if (it.autoGrow) it.mergeGrow = true; else delete it.edited; } });
  for (const pg of copy) mark(pg.items);
  for (const r of allRuns(copy)) if (r.text.includes('«')) r.text = fillText(r.text, row);
  for (const { it } of photoFrames(copy)) fillPhoto(it, row);
  return copy;
}
// a new document with the pages once for every record
export function mergedDocument(doc, rows) {
  const pages = [];
  for (const row of rows) {
    const chains = new Map(); // linked text boxes stay linked within each copy
    for (const pg of fillPages(doc.pages, row)) {
      pg.id = uid('p');
      const fresh = (items) => items.forEach((it) => { it.id = uid(); delete it.mergePhoto; if (it.chain) { if (!chains.has(it.chain)) chains.set(it.chain, uid('c')); it.chain = chains.get(it.chain); } if (it.items) fresh(it.items); });
      fresh(pg.items);
      pages.push(pg);
    }
  }
  const out = { ...clone({ ...doc, pages: [] }), pages, name: `${doc.name} (${rows.length})`, uid: uid('d'), merged: { per: doc.pages.length, count: rows.length } };
  delete out.mergeData;
  return out;
}
// rows that are not completely empty in the fields used
export const usableRows = (data, fields) => data.rows.filter((r) => fields.some((f) => (r[f] || '').trim()));
export const anyItem = (doc) => { for (const e of walkItems(doc)) return e; return null; };

// ------------------------------------------------------------------ choosing and sorting records
// data.skip: row numbers that are unticked; data.filter: { col, op, val }; data.sort: { col, dir: 'up'|'down' }
export const FILTER_OPS = ['is', 'not', 'has', 'empty', 'full'];
export function passes(row, f) {
  if (!f || !f.col) return true;
  const v = String(row[f.col] ?? '').trim().toLowerCase(), w = String(f.val ?? '').trim().toLowerCase();
  switch (f.op) {
    case 'not': return v !== w;
    case 'has': return v.includes(w);
    case 'empty': return !v;
    case 'full': return !!v;
    default: return v === w;
  }
}
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
// row numbers in the order they are shown (sorted), each with whether the filter lets it through
export function orderedRows(data) {
  const idx = data.rows.map((_, i) => i), s = data.sort;
  if (s && s.col) {
    idx.sort((a, b) => {
      const x = String(data.rows[a][s.col] ?? '').trim(), y = String(data.rows[b][s.col] ?? '').trim();
      if (!x !== !y) return x ? -1 : 1; // empty ones last either way
      return (s.dir === 'down' ? -1 : 1) * collator.compare(x, y) || a - b;
    });
  }
  return idx;
}
// the row numbers that will be used, in order
export function chosenIndexes(data) {
  const skip = new Set(data.skip || []);
  return orderedRows(data).filter((i) => !skip.has(i) && passes(data.rows[i], data.filter));
}
// the rows that will be used, in order, leaving out rows empty in every field used
export function chosenRows(data, fields) {
  return chosenIndexes(data).map((i) => data.rows[i]).filter((r) => !fields || fields.some((f) => String(r[f] ?? '').trim()));
}

// grow each filled box made in Pubwork until its text fits (needs the page drawn, so it runs in the app)
export async function growMerged(doc, renderPage) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(host);
  try {
    for (const pg of doc.pages) {
      const grow = []; walk(pg.items, (it) => { if (it.mergeGrow) grow.push(it); });
      if (!grow.length) continue;
      const { el, done } = renderPage(pg, doc); host.appendChild(el);
      try { await done; } catch { /* draw what we can */ }
      for (const box of el.querySelectorAll('.text')) {
        const it = box.__item; if (!it?.mergeGrow) continue;
        const flow = box.querySelector('.flow'); if (!flow || !box.offsetHeight) continue;
        const cs = getComputedStyle(box), pads = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const room = box.clientHeight - pads, need = flow.scrollHeight;
        if (need > room + 0.5) it.h = Math.min(pg.h - it.y, (need + pads) * (it.h / box.offsetHeight) + 1);
      }
      el.remove();
    }
  } finally { host.remove(); walk(doc.pages.flatMap((p) => p.items), (it) => { delete it.mergeGrow; }); }
}
function walk(items, fn) { for (const it of items) { fn(it); if (it.items) walk(it.items, fn); } }
