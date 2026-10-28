// Charts: bar, column, line and pie, made of ordinary shapes and text boxes in a group, in the document's
// colours, so they print sharp everywhere and can be moved and resized like anything else. The group keeps
// `chart: { type, title, data }` so "Change chart data" can make it again.
import { uid, unionBounds } from './model.js';
import { schemeColors, fontPair } from '../templates/schemes.js';
import { readList } from '../merge/data.js';
import { openDialog, pickFile, esc } from './dialog.js';
import { t } from '../i18n/index.js';

const TYPES = {
  column: '<svg viewBox="0 0 24 24"><path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="10"/><rect x="10.5" y="6" width="3.5" height="15"/><rect x="16" y="13" width="3.5" height="8"/></svg>',
  bar: '<svg viewBox="0 0 24 24"><path d="M3 3v18"/><rect x="3" y="5" width="10" height="3.5"/><rect x="3" y="10.5" width="16" height="3.5"/><rect x="3" y="16" width="7" height="3.5"/></svg>',
  line: '<svg viewBox="0 0 24 24"><path d="M3 21h18M3 3v18"/><path d="m5 16 5-6 4 3 6-8"/></svg>',
  pie: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l7 5.5"/></svg>',
};
const SAMPLE = () => `${t('pics.chart.sampleHead')}\n${t('pics.chart.sample').split('|').join('\n')}`;

// ---------------------------------------------------------------- reading the numbers
export function parseNumber(s) {
  let v = String(s ?? '').trim().replace(/[\s '’]/g, '').replace(/[^\d.,\-−]/g, '').replace('−', '-');
  if (!/\d/.test(v)) return null;
  if (v.includes(',') && v.includes('.')) v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  else if (v.includes(',')) v = /,\d{3}$/.test(v) && !/^-?0,/.test(v) ? v.replace(/,/g, '') : v.replace(',', '.');
  const n = parseFloat(v); return Number.isFinite(n) ? n : null;
}
// text pasted from a spreadsheet (or typed) -> { labels, series: [{ name, values }] }
export function parseData(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  if (!lines.length) return null;
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : ',';
  let rows = lines.map((l) => l.split(sep).map((c) => c.trim()));
  const width = Math.max(...rows.map((r) => r.length)); if (width < 2) return null;
  let names = null;
  // the first line holds the names of the columns when it has words (or years, like 2023 and 2024) instead of numbers
  const head = rows[0].slice(1).filter((c) => c !== '');
  const years = head.length && head.every((c) => /^(19|20)\d\d$/.test(c)) && rows.length > 1;
  if (rows[0][0] === '' || years || head.every((c) => parseNumber(c) === null)) { names = rows[0]; rows = rows.slice(1); }
  const cols = [];
  for (let c = 1; c < width; c++) if (rows.some((r) => parseNumber(r[c]) !== null)) cols.push(c);
  if (!cols.length || !rows.length) return null;
  return {
    labels: rows.map((r) => r[0] || ''),
    series: cols.map((c, i) => ({ name: names?.[c] || (cols.length > 1 ? `${t('pics.chart.series')} ${i + 1}` : ''), values: rows.map((r) => parseNumber(r[c]) ?? 0) })),
  };
}
const dataText = (d) => [['', ...d.series.map((s) => s.name)].join('\t'), ...d.labels.map((l, i) => [l, ...d.series.map((s) => s.values[i])].join('\t'))].join('\n');

// ---------------------------------------------------------------- drawing
const fmt = (v) => new Intl.NumberFormat(undefined, { maximumFractionDigits: Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 1 : 0 }).format(v);
function niceStep(range, n = 5) {
  const raw = range / n || 1, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
const mix = (hex, k, to = 255) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * k)); return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`; };

export function buildChart({ type, title, data }, box, doc) {
  const sc = schemeColors(doc.scheme || 'orange'), fp = doc.fontPair ? fontPair(doc.fontPair) : { heading: 'Arial', body: 'Arial' };
  const base = [sc.primary, sc.secondary, sc.accent, sc.dark];
  const colours = [...base, ...base.slice(0, 3).map((c) => mix(c, 0.45)), mix(sc.dark, 0.5), ...base.slice(0, 3).map((c) => mix(c, 0.35, 0))];
  const colour = (i) => colours[i % colours.length];
  const ink = sc.dark, grid = mix(sc.dark, 0.85), items = [];
  const { x, y, w, h } = box;
  const shape = (o) => items.push({ id: uid(), type: 'shape', fill: null, stroke: null, ...o });
  const rect = (x0, y0, ww, hh, fill) => shape({ kind: 'rect', x: x0, y: y0, w: Math.max(0.01, ww), h: Math.max(0.01, hh), rx: 0, fill: fill ? { type: 'solid', color: fill, opacity: 1 } : null });
  const line = (pts, color, width) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); shape({ kind: 'polyline', points: pts, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), stroke: { color, width, ...(width > 1.2 ? { cap: 'round' } : {}) } }); };
  const text = (x0, y0, ww, hh, s, o = {}) => items.push({ id: uid(), type: 'text', x: x0, y: y0, w: ww, h: hh, pad: [0, 1, 0, 1], valign: o.valign || 'middle', columns: 1, columnGap: 0, fill: null, stroke: null,
    paras: [{ align: o.align || 'center', runs: [{ text: String(s), font: o.font || fp.body, size: o.size || 8, color: o.color || ink, ...(o.bold ? { bold: true } : {}) }] }] });

  rect(x, y, w, h, null); // the chart's area (keeps the group's size, and gives something to click)
  const labels = data.labels, series = data.series, n = labels.length;
  const S = Math.min(w, h * 1.6) / 400; // text grows with the chart
  const fs = Math.max(6, Math.min(11, 8.5 * S));
  let top = y + 6 * S, bottom = y + h - 4 * S;
  if (title) { text(x, y, w, 22 * S, title, { size: Math.max(9, 14 * S), bold: true, font: fp.heading }); top = y + 28 * S; }
  const legendItems = type === 'pie' ? labels : series.length > 1 ? series.map((s) => s.name) : [];

  if (type === 'pie') {
    const vals = series[0].values.map((v) => Math.max(0, v)), total = vals.reduce((a, b) => a + b, 0) || 1;
    const legendW = Math.min(w * 0.42, 150 * S), d = Math.min(bottom - top, w - legendW - 16 * S);
    const cx = x + 6 * S + d / 2, cy = top + (bottom - top) / 2, r = d / 2;
    let a = -Math.PI / 2;
    vals.forEach((v, i) => {
      if (!v) return;
      const a1 = a + (v / total) * Math.PI * 2, steps = Math.max(2, Math.ceil(((a1 - a) * 180) / Math.PI / 3));
      const pts = v >= total ? [] : [[cx, cy]];
      for (let k = 0; k <= steps; k++) { const t0 = a + ((a1 - a) * k) / steps; pts.push([cx + r * Math.cos(t0), cy + r * Math.sin(t0)]); }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      shape({ kind: 'polygon', points: pts.map(([px, py]) => [+px.toFixed(2), +py.toFixed(2)]), x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), fill: { type: 'solid', color: colour(i), opacity: 1 }, stroke: { color: '#ffffff', width: Math.max(0.75, S) } });
      if (v / total >= 0.06) { // the share, written on the slice
        const m = (a + a1) / 2, lx = cx + r * 0.62 * Math.cos(m), ly = cy + r * 0.62 * Math.sin(m);
        text(lx - 22 * S, ly - 7 * S, 44 * S, 14 * S, `${Math.round((v / total) * 100)}%`, { size: fs, bold: true, color: pickInk(colour(i)) });
      }
      a = a1;
    });
    legend(x + w - legendW, cy, legendW, legendItems.map((l, i) => [l, colour(i), `${fmt(series[0].values[i])}`]));
  } else {
    if (legendItems.length) bottom -= 16 * S;
    const all = series.flatMap((s) => s.values);
    let lo = Math.min(0, ...all), hi = Math.max(0, ...all); if (lo === hi) hi = lo + 1;
    const step = niceStep(hi - lo); lo = Math.floor(lo / step + 1e-9) * step; hi = Math.ceil(hi / step - 1e-9) * step;
    const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toPrecision(12));
    const horiz = type === 'bar';
    const valW = Math.max(...ticks.map((v) => fmt(v).length)) * fs * 0.55 + 6 * S;
    const catW = horiz ? Math.min(w * 0.3, Math.max(...labels.map((l) => l.length)) * fs * 0.5 + 8 * S) : 0;
    const left = x + (horiz ? catW : valW), right = x + w - 6 * S, pb = bottom - (horiz ? 14 * S : 16 * S), pt = top;
    const pos = (v) => (horiz ? left + ((v - lo) / (hi - lo)) * (right - left) : pb - ((v - lo) / (hi - lo)) * (pb - pt));
    for (const v of ticks) { // grid lines and their numbers
      const p = pos(v);
      if (horiz) { line([[p, pt], [p, pb]], v === 0 ? mix(ink, 0.4) : grid, v === 0 ? 0.9 : 0.5); text(p - 30 * S, pb + 2 * S, 60 * S, 11 * S, fmt(v), { size: fs * 0.92, color: mix(ink, 0.3) }); }
      else { line([[left, p], [right, p]], v === 0 ? mix(ink, 0.4) : grid, v === 0 ? 0.9 : 0.5); text(x, p - 6 * S, valW - 4 * S, 12 * S, fmt(v), { size: fs * 0.92, align: 'right', color: mix(ink, 0.3) }); }
    }
    const span = horiz ? pb - pt : right - left, slot = span / n;
    labels.forEach((l, i) => { // the names of the things
      if (horiz) text(x, pt + i * slot, catW - 6 * S, slot, l, { size: fs, align: 'right' });
      else text(left + i * slot, pb + 2 * S, slot, 14 * S, l, { size: n > 8 ? fs * 0.85 : fs });
    });
    if (type === 'line') {
      series.forEach((s, si) => {
        const pts = s.values.map((v, i) => [left + (i + 0.5) * slot, pos(v)]);
        if (pts.length > 1) line(pts, colour(si), Math.max(1.5, 2.2 * S));
        const r = Math.max(1.8, 2.8 * S);
        for (const [px, py] of pts) shape({ kind: 'ellipse', x: px - r, y: py - r, w: 2 * r, h: 2 * r, fill: { type: 'solid', color: colour(si), opacity: 1 }, stroke: { color: '#ffffff', width: Math.max(0.6, 0.8 * S) } });
        if (series.length === 1 && n <= 14) pts.forEach(([px, py], i) => text(px - 25 * S, py - 15 * S, 50 * S, 11 * S, fmt(s.values[i]), { size: fs * 0.9 }));
      });
    } else {
      const band = slot * 0.72, bw = band / series.length, zero = pos(Math.max(lo, Math.min(hi, 0)));
      series.forEach((s, si) => s.values.forEach((v, i) => {
        const a = (horiz ? pt : left) + i * slot + (slot - band) / 2 + si * bw, p = pos(v);
        if (horiz) rect(Math.min(zero, p), a, Math.abs(p - zero), bw * 0.92, colour(si));
        else rect(a, Math.min(zero, p), bw * 0.92, Math.abs(p - zero), colour(si));
        if (series.length === 1 && n <= 16) { // the number at the end of each bar
          if (horiz) text(v >= 0 ? p + 2 * S : p - 52 * S, a, 50 * S, bw * 0.92, fmt(v), { size: fs * 0.9, align: v >= 0 ? 'left' : 'right' });
          else text(a - 10 * S, v >= 0 ? p - 12 * S : p + 1 * S, bw * 0.92 + 20 * S, 11 * S, fmt(v), { size: fs * 0.9 });
        }
      }));
    }
    if (legendItems.length) {
      const ww = Math.min(w, legendItems.length * 110 * S);
      legendRow(x + (w - ww) / 2, y + h - 14 * S, ww, legendItems.map((l, i) => [l, colour(i)]));
    }
  }
  function legend(lx, cy, lw, rows) {
    const rh = Math.min(16 * S, (h - 10) / Math.max(1, rows.length)), y0 = cy - (rows.length * rh) / 2, sq = Math.min(9 * S, rh * 0.7);
    rows.forEach(([name, c, val], i) => {
      rect(lx, y0 + i * rh + (rh - sq) / 2, sq, sq, c);
      text(lx + sq + 4 * S, y0 + i * rh, lw - sq - 4 * S, rh, val ? `${name} (${val})` : name, { size: fs, align: 'left' });
    });
  }
  function legendRow(lx, ly, lw, rows) {
    const cw = lw / rows.length, sq = 8 * S;
    rows.forEach(([name, c], i) => { rect(lx + i * cw, ly + 3 * S, sq, sq, c); text(lx + i * cw + sq + 3 * S, ly, cw - sq - 4 * S, 14 * S, name, { size: fs, align: 'left' }); });
  }
  return { type: 'group', id: uid('g'), items, chart: { type, title: title || '', data } };
}
// dark or white writing on a colour
function pickInk(hex) { const n = parseInt(hex.slice(1), 16); const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); return l > 150 ? '#222222' : '#ffffff'; }

// ---------------------------------------------------------------- the window
export function openChart(app, existing = null) {
  const old = existing?.chart;
  const type0 = old?.type || 'column';
  openDialog({
    title: t(old ? 'pics.chart.change' : 'pics.chart.title'), okLabel: t(old ? 'pics.chart.update' : 'pics.chart.insert'), wide: true,
    body: `<div class="ctypes" role="radiogroup" aria-label="${esc(t('pics.chart.kind'))}">${Object.entries(TYPES).map(([k, svg]) => `<label><input type="radio" name="ctype" value="${k}"${k === type0 ? ' checked' : ''}>${svg}<span>${esc(t('pics.chart.' + k))}</span></label>`).join('')}</div>
      <label class="pfx-alt" for="cTitle">${esc(t('pics.chart.titleLabel'))}</label><input type="text" id="cTitle" value="${esc(old ? old.title : t('pics.chart.sampleTitle'))}">
      <label class="pfx-alt" for="cData">${esc(t('pics.chart.data'))}</label>
      <textarea id="cData" spellcheck="false">${esc(old ? dataText(old.data) : SAMPLE())}</textarea>
      <p class="hint">${esc(t('pics.chart.dataHint'))}</p>
      <div><button class="btn" id="cFile">${esc(t('pics.chart.fromFile'))}</button></div>
      <p class="err" id="cErr" hidden></p>`,
    wire(el) {
      el.querySelector('#cData').addEventListener('keydown', (e) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertText', false, '\t'); } });
      el.querySelector('#cFile').addEventListener('click', async () => {
        const f = await pickFile('.xlsx,.ods,.csv,.txt,.tsv'); if (!f) return;
        try {
          const list = await readList(f);
          const rows = list.rows.slice(0, 40);
          el.querySelector('#cData').value = [list.columns.join('\t'), ...rows.map((r) => list.columns.map((c) => r[c]).join('\t'))].join('\n');
          if (list.rows.length > 40) app.toast(t('pics.chart.first40'));
        } catch (err) { app.toast(t(err.code === 'xls' ? 'pics.oldExcel' : 'pics.badList')); }
      });
    },
    onOk(el) {
      const data = parseData(el.querySelector('#cData').value), err = el.querySelector('#cErr');
      if (!data) { err.hidden = false; err.textContent = t('pics.chart.noNumbers'); return false; }
      data.labels = data.labels.slice(0, 60); data.series = data.series.slice(0, 8).map((s) => ({ ...s, values: s.values.slice(0, 60) }));
      const spec = { type: el.querySelector('input[name=ctype]:checked').value, title: el.querySelector('#cTitle').value.trim(), data };
      const ed = app.editor;
      if (existing) {
        const cur = ed.page.items.find((it) => it.id === existing.id) || existing, b = unionBounds([cur]);
        const g = buildChart(spec, b, app.doc); g.id = existing.id; if (cur.locked) g.locked = true;
        ed.change('chart', () => { const list = ed.page.items, i = list.findIndex((it) => it.id === existing.id); if (i >= 0) list[i] = g; });
        ed.select([g.id]);
      } else {
        const pg = app.targetPage(), w = Math.min(pg.w * 0.75, 440), h = w * 0.62;
        ed.add(buildChart(spec, { x: (pg.w - w) / 2, y: (pg.h - h) / 2, w, h }, app.doc));
      }
    },
  });
}
