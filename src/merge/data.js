// Lists for mail merge: Excel (.xlsx), LibreOffice (.ods), CSV and text pasted from any spreadsheet.
// Everything is read here in the browser. The first row holds the column names.
import { unzipSync, strFromU8 } from 'fflate';

const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');
const colName = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

// rows of text -> { columns, rows: [{column: value}] } with empty rows and columns dropped
function table(grid) {
  grid = grid.map((r) => r.map((v) => String(v ?? '').trim())).filter((r) => r.some((v) => v));
  if (!grid.length) return { columns: [], rows: [] };
  const width = Math.max(...grid.map((r) => r.length));
  const used = Array.from({ length: width }, (_, c) => grid.some((r) => r[c]));
  const head = grid[0], seen = new Map();
  const columns = [];
  for (let c = 0; c < width; c++) {
    if (!used[c]) continue;
    let name = (head[c] || '').replace(/[«»]/g, '') || `Column ${colName(c)}`;
    if (seen.has(name)) { seen.set(name, seen.get(name) + 1); name = `${name} ${seen.get(name)}`; } else seen.set(name, 1);
    columns.push([c, name]);
  }
  const rows = grid.slice(1).map((r) => Object.fromEntries(columns.map(([c, name]) => [name, r[c] || ''])));
  return { columns: columns.map(([, n]) => n), rows };
}

// ------------------------------------------------------------------ CSV and pasted text
export function parseDelimited(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/).slice(0, 5).join('\n');
  const count = (ch) => (first.match(new RegExp(ch === '\t' ? '\t' : `\\${ch}`, 'g')) || []).length;
  const sep = ['\t', ';', ','].map((ch) => [ch, count(ch)]).sort((a, b) => b[1] - a[1])[0][0];
  const grid = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"' && cell === '') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); grid.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); grid.push(row); }
  return table(grid);
}
// a CSV saved by Excel in Europe is often not UTF-8: fall back to the Windows Western code page
function decode(bytes) {
  const utf = new TextDecoder('utf-8').decode(bytes);
  return utf.includes('�') ? new TextDecoder('windows-1252').decode(bytes) : utf;
}

// ------------------------------------------------------------------ Excel
const BUILTIN_DATES = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
function excelDate(serial, withTime) {
  const ms = Math.round((serial - 25569) * 86400000); // days since 1899-12-30
  const d = new Date(ms);
  const opts = { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}
function parseXlsx(bytes) {
  const z = unzipSync(bytes);
  const get = (p) => (z[p] ? strFromU8(z[p]) : null);
  const wb = xml(get('xl/workbook.xml'));
  const firstSheet = wb.getElementsByTagName('sheet')[0];
  const rid = firstSheet?.getAttribute('r:id') || firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  let path = 'xl/worksheets/sheet1.xml';
  const rels = get('xl/_rels/workbook.xml.rels');
  if (rels && rid) {
    const rel = [...xml(rels).getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid);
    if (rel) { const tg = rel.getAttribute('Target'); path = tg.startsWith('/') ? tg.slice(1) : `xl/${tg.replace(/^\.\//, '')}`; }
  }
  const shared = [];
  const ss = get('xl/sharedStrings.xml');
  if (ss) for (const si of xml(ss).getElementsByTagName('si')) shared.push([...si.getElementsByTagName('t')].map((t) => t.textContent).join(''));
  // which styles are dates
  const dateStyle = [];
  const st = get('xl/styles.xml');
  if (st) {
    const sd = xml(st), custom = new Map();
    for (const f of sd.getElementsByTagName('numFmt')) custom.set(+f.getAttribute('numFmtId'), f.getAttribute('formatCode') || '');
    const xfs = sd.getElementsByTagName('cellXfs')[0];
    if (xfs) for (const xf of xfs.getElementsByTagName('xf')) {
      const id = +xf.getAttribute('numFmtId'), code = (custom.get(id) || '').replace(/"[^"]*"|\[[^\]]*\]/g, '');
      dateStyle.push(BUILTIN_DATES.has(id) || (custom.has(id) && /[dy]/i.test(code) && !/^[#0.,%\s]*$/.test(code)) ? (/[hs]/i.test(code) || id === 22 ? 'datetime' : 'date') : null);
    }
  }
  const sheet = xml(get(path) || '<x/>');
  const grid = [];
  for (const r of sheet.getElementsByTagName('row')) {
    const ri = (+r.getAttribute('r') || grid.length + 1) - 1, row = [];
    for (const c of r.getElementsByTagName('c')) {
      const ref = c.getAttribute('r') || '', letters = ref.replace(/\d+/g, '');
      let ci = 0; for (const ch of letters) ci = ci * 26 + (ch.charCodeAt(0) - 64); ci = Math.max(0, ci - 1);
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      let val;
      if (t === 's') val = shared[+v] ?? '';
      else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
      else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
      else if (t === 'str' || t === 'e') val = v;
      else {
        const kind = dateStyle[+c.getAttribute('s')];
        val = v === '' ? '' : kind ? excelDate(+v, kind === 'datetime') : String(+(+v).toPrecision(12));
      }
      row[ci] = val;
    }
    grid[ri] = row;
  }
  return table(Array.from(grid, (r) => r || []));
}

// ------------------------------------------------------------------ LibreOffice / OpenDocument
function parseOds(bytes) {
  const z = unzipSync(bytes);
  const doc = xml(strFromU8(z['content.xml']));
  const T = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0', O = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0';
  const sheet = doc.getElementsByTagNameNS(T, 'table')[0]; if (!sheet) return table([]);
  const grid = [];
  for (const r of sheet.getElementsByTagNameNS(T, 'table-row')) {
    const rep = Math.min(+(r.getAttributeNS(T, 'number-rows-repeated') || 1), 1000), row = [];
    for (const c of r.children) {
      if (c.localName !== 'table-cell' && c.localName !== 'covered-table-cell') continue;
      const n = Math.min(+(c.getAttributeNS(T, 'number-columns-repeated') || 1), 200);
      const type = c.getAttributeNS(O, 'value-type');
      let v = [...c.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'p')].map((p) => p.textContent).join('\n');
      if (type === 'date') { const dv = c.getAttributeNS(O, 'date-value'); if (dv) v = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC' }).format(new Date(dv.length <= 10 ? `${dv}T00:00:00Z` : `${dv}Z`)); }
      for (let i = 0; i < n; i++) row.push(v);
    }
    for (let i = 0; i < rep; i++) grid.push(row);
    if (grid.length > 20000) break;
  }
  return table(grid);
}

// -> { columns, rows, name }
export async function readList(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name || 'list';
  let out;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const z = unzipSync(bytes, { filter: (f) => f.name === 'mimetype' || f.name === 'xl/workbook.xml' });
    if (z['xl/workbook.xml']) out = parseXlsx(bytes);
    else if (z.mimetype && strFromU8(z.mimetype).includes('spreadsheet')) out = parseOds(bytes);
    else throw Object.assign(new Error('not a spreadsheet'), { code: 'list' });
  } else if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw Object.assign(new Error('old Excel file'), { code: 'xls' });
  else out = parseDelimited(decode(bytes));
  if (!out.columns.length || !out.rows.length) throw Object.assign(new Error('empty list'), { code: 'empty' });
  return { ...out, name };
}
