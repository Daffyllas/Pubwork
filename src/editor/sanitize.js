// A .pubwork file is data anyone could hand-edit. Before it is shown, every field that should be a number is made a
// number, colours must look like colours, and names that end up in CSS lose characters that could break out of it.
// (Files read from .pub come out of the reader already typed; this is for our own format.)
const NUM = new Set(('angle at chainIndex chainLength col cols columnGap columns dash dx dy h indentFirst indentLeft indentRight ' +
  'mult opacity pad points pt rotate size spaceAfter spaceBefore span turn w width wrapGap x y brightness contrast radius lines ' +
  'pos tracking blur gap rows step offset gutter top bottom left right copies scale sizeX sizeY').split(' '));
const COLOR_KEYS = new Set(['color', 'from', 'to', 'recolor', 'background', 'shadowColor', 'glowColor']);
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[0-9.%\s,]+\)|hsla?\(\s*[0-9.%\sdeg,]+\)|[a-z]{3,24})$/i;
export const safeFontName = (s) => String(s ?? '').replace(/[^\p{L}\p{N} _.&+-]/gu, '').slice(0, 120);

const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
function numDeep(v) {
  if (Array.isArray(v)) return v.map(numDeep);
  if (v && typeof v === 'object') return v; // e.g. a size object; its own keys are checked by the walk
  if (typeof v === 'boolean' || v == null) return v;
  return toNum(v);
}
function walk(o, depth = 0) {
  if (depth > 60 || !o || typeof o !== 'object') return;
  if (Array.isArray(o)) { o.forEach((v) => walk(v, depth + 1)); return; }
  for (const k of Object.keys(o)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') { delete o[k]; continue; }
    const v = o[k];
    if (NUM.has(k) && (typeof v === 'string' || Array.isArray(v))) o[k] = numDeep(v);
    else if (COLOR_KEYS.has(k) && typeof v === 'string' && !COLOR.test(v.trim())) o[k] = '#000000';
    else if (k === 'mime' && typeof v === 'string' && !/^[a-z]+\/[a-z0-9.+-]+$/i.test(v)) o[k] = 'application/octet-stream';
    else if (v && typeof v === 'object') walk(v, depth + 1);
  }
}
export function sanitizeDoc(doc) {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.pages) || !doc.pages.length || !doc.pages.every((p) => p && typeof p === 'object')) throw Object.assign(new Error('not a Pubwork file'), { code: 'notpubwork' });
  walk(doc);
  for (const f of doc.embeddedFonts || []) if (f && 'name' in f) f.name = safeFontName(f.name);
  return doc;
}
