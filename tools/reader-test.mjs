// Corpus gate for the Publisher reader: every file in tests/corpus must open with pages and content,
// and every file in tests/corpus-bad (damaged, fuzzed or hostile files) must be turned away calmly
// rather than crash. Extra folders of .pub files can be passed as arguments.
//   npm run test:reader               the built-in corpus
//   npm run test:reader -- ~/my-pubs  plus your own folder (counted towards the 90% gate)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { buildDocument, summarize } from '../src/pubmodel.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = 0.9;
process.setMaxListeners(0); // each fresh reader instance adds its own error hooks

// Emscripten's ES module guesses its environment; give it require/__dirname so it runs in Node too.
const src = fs.readFileSync(path.join(root, 'public/pubreader/pubreader.mjs'), 'utf8');
const shim = "import { createRequire } from 'module'; import { fileURLToPath as __f } from 'url'; import { dirname as __d } from 'path';\n" +
  'const require = createRequire(import.meta.url); const __filename = __f(import.meta.url); const __dirname = __d(__filename);\n';
const tmp = path.join(os.tmpdir(), `pubreader-node-${process.pid}.mjs`);
fs.writeFileSync(tmp, shim + src);
const create = (await import(pathToFileURL(tmp).href)).default;
fs.unlinkSync(tmp);
const wasmBinary = fs.readFileSync(path.join(root, 'public/pubreader/pubreader.wasm'));

const listPubs = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter((f) => /\.pub$/i.test(f)).map((f) => path.join(dir, f)) : [];

async function readOne(file) {
  const M = await create({ wasmBinary, print() {}, printErr() {} }); // fresh instance each time, like a fresh worker
  const bytes = fs.readFileSync(file);
  const t0 = performance.now();
  if (!(bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0)) return { result: 'notpub', ms: 0 };
  const p = M._malloc(bytes.length); M.HEAPU8.set(bytes, p);
  let rc;
  try { rc = M._pub_convert(p, bytes.length); } catch (e) { return { result: 'crash', why: String(e).slice(0, 120) }; }
  if (rc === 1) return { result: 'notpub', ms: performance.now() - t0 };
  const ops = JSON.parse(M.UTF8ToString(M._pub_result(), M._pub_result_size()));
  const doc = buildDocument(ops, { source: 'pub' });
  const ms = performance.now() - t0;
  if (!doc.pages.length) return { result: rc === 2 ? 'damaged' : 'empty', ms };
  const s = summarize(doc);
  const content = s.text + s.image + s.shape + (s.table || 0);
  return { result: content ? (rc === 2 ? 'partial' : 'ok') : 'blank', ms, s, fonts: Object.keys(doc.fonts || {}).length };
}

const good = [...listPubs(path.join(root, 'tests/corpus')), ...process.argv.slice(2).flatMap((d) => listPubs(path.resolve(d)))];
const bad = listPubs(path.join(root, 'tests/corpus-bad'));
let opened = 0, failures = [], slow = 0;
const pad = (s, n) => String(s).padEnd(n);

console.log(`Reading ${good.length} Publisher files…\n`);
for (const f of good) {
  const r = await readOne(f);
  const ok = r.result === 'ok' || r.result === 'partial';
  if (ok) opened++; else failures.push([f, r.result, r.why]);
  if (r.ms > 2000) slow++;
  const detail = r.s ? `${r.s.pages} pages, ${r.s.text} text, ${r.s.image} pictures, ${r.s.shape} shapes${r.s.table ? `, ${r.s.table} tables` : ''}` : r.why || '';
  console.log(`${ok ? '✓' : '✗'} ${pad(path.basename(f), 34)} ${pad(r.result, 8)} ${pad(`${Math.round(r.ms || 0)} ms`, 8)} ${detail}`);
}
console.log(`\nChecking ${bad.length} damaged or hostile files are turned away safely…\n`);
let badCrash = 0;
for (const f of bad) {
  const r = await readOne(f);
  if (r.result === 'crash') badCrash++;
  console.log(`${r.result === 'crash' ? '✗' : '✓'} ${pad(path.basename(f).slice(0, 34), 34)} ${r.result}`);
}

const rate = good.length ? opened / good.length : 0;
console.log(`\nOpened ${opened} of ${good.length} (${(rate * 100).toFixed(1)}%), gate is ${GATE * 100}%.`);
console.log(`Damaged files that crashed the reader: ${badCrash}. Files slower than 2 s: ${slow}.`);
if (good.length < 300) console.log(`Note: the full gate needs at least 300 files; this run had ${good.length}.`);
for (const [f, why, d] of failures) console.log(`  failed: ${f} (${why}${d ? `: ${d}` : ''})`);
process.exit(rate >= GATE && badCrash === 0 ? 0 : 1);
