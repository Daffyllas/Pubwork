// Settings panel parts for text: letters (spacing, capitals, raised/lowered, crossed out, highlight),
// links, big first letters, tab stops and dot leaders, columns, hyphens, fields, styles, and how text
// wraps around pictures and shapes. While typing they change the selected words or paragraphs;
// otherwise the whole of the selected text boxes.
import './text.css';
import { applyRunStyle, moreAtCaret, parasInRange } from '../text.js';
import { paraExtras, layoutTabs, tabify, cleanLink, refreshDropCaps } from '../../render.js';

const SPACINGS = [['tighter2', -1.5], ['tighter', -0.75], ['normal', 0], ['looser', 0.75], ['looser2', 1.5]];
let openMore = false; // the "more text settings" part stays open once opened

const flatText = (items) => { const out = []; const rec = (l) => l.forEach((it) => (it.type === 'group' ? rec(it.items) : it.type === 'text' && out.push(it))); rec(items); return out; };
const flatAll = (items) => { const out = []; const rec = (l) => l.forEach((it) => (it.type === 'group' ? rec(it.items) : out.push(it))); rec(items); return out; };

// ---------------------------------------------------------------- reading the current settings
function runNow(ctx) {
  const { ed } = ctx;
  if (ed.editing) return moreAtCaret(ed.editing.container, ed.editing.range) || {};
  const r = flatText(ctx.items)[0]?.paras.flatMap((p) => p.runs)[0] || {};
  return { tracking: r.tracking || 0, kern: r.kern === 'off' ? 'off' : 'on', liga: r.liga === 'off' ? 'off' : 'on', caps: r.caps || '', position: r.position || null, strike: !!r.strike, highlight: r.highlight || null, link: r.link || '' };
}
function paraNow(ctx) {
  const { ed } = ctx;
  if (ed.editing) {
    const p = parasInRange(ed.editing.container, ed.editing.range)[0];
    const json = (v) => { try { return JSON.parse(v); } catch { return null; } };
    return { tabs: json(p?.dataset.tabs) || [], dropCap: json(p?.dataset.dropcap) };
  }
  const pa = flatText(ctx.items)[0]?.paras[0] || {};
  return { tabs: pa.tabs || [], dropCap: pa.dropCap || null };
}
// the width a right-hand stop at the edge sits at: the text area (or one column) of the box
function edgeOf(it) {
  const pad = it.pad || [3.6, 3.6, 3.6, 3.6], bw = it.stroke?.width || 0;
  const w = it.w - pad[1] - pad[3] - 2 * bw, n = it.columns > 1 ? it.columns : 1, gap = n > 1 ? it.columnGap || 9 : 0;
  return Math.max(10, Math.floor(((w - gap * (n - 1)) / n) * 10) / 10);
}

// ---------------------------------------------------------------- changing paragraphs
function changeParas(ctx, label, fn) {
  const { ed } = ctx;
  if (ed.editing) {
    const { container, box, item } = ed.editing;
    for (const p of parasInRange(container, ed.editing.range)) {
      const json = (v) => { try { return JSON.parse(v); } catch { return undefined; } };
      const pa = { tabs: json(p.dataset.tabs) || [], dropCap: json(p.dataset.dropcap), style: p.dataset.style, cont: p.classList.contains('cont') };
      fn(pa, item);
      const span = p.querySelector('[data-font]'), size = span ? parseFloat(getComputedStyle(span).fontSize) * 0.75 : 10;
      paraExtras(p, { ...pa, lineHeight: (item.paras[+p.dataset.pi] || {}).lineHeight }, size, span?.style.fontFamily || '');
    }
    refreshDropCaps(container); // sized from the words as they are now
    tabify(container); layoutTabs(box);
    ed.saveRange?.();
    return;
  }
  ed.setProps((it) => { if (it.type === 'text') it.paras.forEach((pa) => fn(pa, it)); }, label);
}
function runPatch(ctx, patch) { ctx.ed.textStyle(patch); if (!ctx.ed.editing) return; refresh(ctx); }

// ---------------------------------------------------------------- the part for text
const esc2 = (ctx, k, v) => ctx.esc(ctx.t(k, v));
function textHtml(ctx) {
  const { t, esc, ed, panel } = ctx;
  // one text box, or a group holding one text box (a box from a .pub file grouped with its frame)
  const texts = flatText(ctx.items);
  const one = !ed.editing && ctx.items.length === 1 && texts.length === 1 && ['text', 'group'].includes(ctx.items[0].type) ? texts[0] : null;
  const unit = panel?.unit || 'cm';
  const step = unit === 'in' ? '½ in' : '1.27 cm';
  return `<details class="tx-more"${openMore ? ' open' : ''}><summary>${esc(t('tx.more'))}</summary>
  <h3>${esc(t('tx.letters'))}</h3>
  <div class="prow"><label class="field">${esc(t('tx.spacing'))} <select id="txSpacing">${SPACINGS.map(([k, v]) => `<option value="${v}">${esc(t('tx.sp.' + k))}</option>`).join('')}<option value="custom" hidden>…</option></select></label>
    <input id="txTrack" type="number" step="0.1" min="-10" max="50" aria-label="${esc(t('tx.spacing'))}"> pt</div>
  <div class="prow wrap tx-toggles">
    <button class="pbtn wide" data-tx="strike" aria-pressed="false"><s>${esc(t('tx.strike'))}</s></button>
    <button class="pbtn wide" data-tx="super" aria-pressed="false">${esc(t('tx.super'))}</button>
    <button class="pbtn wide" data-tx="sub" aria-pressed="false">${esc(t('tx.sub'))}</button>
    <button class="pbtn wide" data-tx="small" aria-pressed="false" style="font-variant:small-caps">${esc(t('tx.smallCaps'))}</button>
    <button class="pbtn wide" data-tx="all" aria-pressed="false">${esc(t('tx.allCaps'))}</button>
  </div>
  <div class="prow wrap"><label class="check"><input type="checkbox" id="txKern"> ${esc(t('tx.kern'))}</label><label class="check"><input type="checkbox" id="txLiga"> ${esc(t('tx.liga'))}</label></div>
  <div class="prow"><label class="field">${esc(t('tx.highlight'))} <input id="txHl" type="color" value="#fff59d"></label><button class="btn" id="txHlNone">${esc(t('tx.noHighlight'))}</button></div>
  ${ed.editing ? `<div class="prow"><button class="btn" id="txLink">${esc(t('tx.link'))}</button></div>
  <div class="tx-linkrow" hidden><p class="hint">${esc(t('tx.linkHint'))}</p><input id="txLinkUrl" type="text" inputmode="url" placeholder="${esc(t('tx.linkPlaceholder'))}" aria-label="${esc(t('tx.link'))}">
    <div class="prow"><button class="btn primary" id="txLinkAdd">${esc(t('tx.linkAdd'))}</button><button class="btn" id="txLinkDel">${esc(t('tx.linkRemove'))}</button></div><p class="hint">${esc(t('tx.linkOpen'))}</p></div>` : ''}
  <h3>${esc(t('tx.paragraph'))}</h3>
  <div class="prow"><label class="field">${esc(t('tx.dropCap'))} <select id="txDrop"><option value="0">${esc(t('tx.dropNone'))}</option>${[2, 3, 4, 5].map((n) => `<option value="${n}">${esc2(ctx, 'tx.dropLines', { n })}</option>`).join('')}</select></label></div>
  <label class="check"><input type="checkbox" id="txLeaders"> ${esc(t('tx.leaders'))}</label>
  <p class="hint">${esc(t('tx.leadersHint'))}</p>
  <div class="tx-tabs"><div class="tx-tabhead">${esc(t('tx.tabs'))}</div><div id="txTabList"></div>
    <p class="hint" id="txTabNone">${esc2(ctx, 'tx.tabsNone', { step })}</p>
    <button class="btn" id="txTabAdd">${esc(t('tx.tabAdd'))}</button></div>
  ${one ? `<h3>${esc(t('tx.box'))}</h3>
  <div class="prow"><label class="field">${esc(t('tx.columns'))} <select id="txCols">${[1, 2, 3, 4].map((n) => `<option${(one.columns || 1) === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="field">${esc(t('tx.colGap'))} <input id="txColGap" type="number" min="0" max="200" step="0.5" value="${+(panel ? panel.toUnit(one.columnGap || 9) : one.columnGap || 9).toFixed(2)}"> ${esc(unit)}</label></div>
  <label class="check"><input type="checkbox" id="txHyph"${one.hyphenate ? ' checked' : ''}> ${esc(t('tx.hyphenate'))}</label>` : ''}
  <h3>${esc(t('tx.insert'))}</h3>
  <div class="prow wrap"><button class="btn" data-field="page">${esc(t('tx.f.page'))}</button><button class="btn" data-field="pages">${esc(t('tx.f.pages'))}</button><button class="btn" data-field="date">${esc(t('tx.f.date'))}</button></div>
  <div class="prow"><button class="btn" id="txStyles">${esc(t('tx.styles'))}</button></div>
  </details>`;
}

function tabRows(ctx, el, tabs) {
  const { t, esc, panel } = ctx;
  const f = (v) => +(panel ? panel.toUnit(v) : v).toFixed(2);
  const list = el.querySelector('#txTabList'); if (!list) return;
  list.innerHTML = tabs.map((tb, i) => `<div class="tx-tab" data-i="${i}">
    <input type="number" step="0.05" min="0" data-k="pos" value="${f(tb.pos)}" aria-label="${esc(t('tx.tabPos'))}">
    <select data-k="align" aria-label="${esc(t('tx.tabs'))}">${['left', 'center', 'right', 'decimal'].map((a) => `<option value="${a}"${tb.align === a ? ' selected' : ''}>${esc(t('tx.al.' + a))}</option>`).join('')}</select>
    <select data-k="leader" aria-label="${esc(t('tx.tabs'))}">${['none', 'dot', 'dash', 'line'].map((a) => `<option value="${a}"${(tb.leader || 'none') === a ? ' selected' : ''}>${esc(t('tx.ld.' + a))}</option>`).join('')}</select>
    <button class="pbtn" data-del="${i}" aria-label="${esc(t('tx.tabRemove'))}" title="${esc(t('tx.tabRemove'))}">×</button></div>`).join('');
  el.querySelector('#txTabNone').hidden = tabs.length > 0;
}

// show the settings of the text at the caret (called again as the caret moves)
function refresh(ctx) {
  const el = ctx.el; if (!el?.isConnected) return;
  const r = runNow(ctx), pa = paraNow(ctx);
  const sp = el.querySelector('#txSpacing'), tr = el.querySelector('#txTrack');
  if (sp && document.activeElement !== tr) { const v = +(r.tracking || 0); const hit = SPACINGS.find(([, x]) => Math.abs(x - v) < 0.05); sp.value = hit ? String(hit[1]) : 'custom'; tr.value = v; }
  const press = (k, on) => el.querySelector(`[data-tx="${k}"]`)?.setAttribute('aria-pressed', String(!!on));
  press('strike', r.strike); press('super', r.position === 'super'); press('sub', r.position === 'sub'); press('small', r.caps === 'small'); press('all', r.caps === 'all');
  const kern = el.querySelector('#txKern'); if (kern) kern.checked = r.kern !== 'off';
  const liga = el.querySelector('#txLiga'); if (liga) liga.checked = r.liga !== 'off';
  if (r.highlight) el.querySelector('#txHl').value = r.highlight;
  const url = el.querySelector('#txLinkUrl'); if (url && document.activeElement !== url) url.value = (r.link || '').replace(/^mailto:/, '');
  const drop = el.querySelector('#txDrop'); if (drop) drop.value = String(pa.dropCap?.lines || 0);
  const lead = el.querySelector('#txLeaders'); if (lead) lead.checked = pa.tabs.some((tb) => tb.align === 'right' && tb.leader === 'dot');
  if (!el.querySelector('.tx-tab input:focus, .tx-tab select:focus')) tabRows(ctx, el, pa.tabs);
}

function wireText(el, ctx) {
  ctx = { ...ctx, el }; // this part's own copy: it remembers where it is drawn
  const { ed, app, panel } = ctx;
  const $ = (s) => el.querySelector(s);
  el.querySelectorAll('button, input[type=checkbox]').forEach((b) => b.addEventListener('mousedown', (e) => { if (ed.editing) e.preventDefault(); }));
  $('details').addEventListener('toggle', (e) => { openMore = e.target.open; });
  $('details > summary').addEventListener('mousedown', (e) => { if (ed.editing) e.preventDefault(); }); // keep the caret in the text
  refresh(ctx);
  // while typing: a tab typed becomes a tab span at once, so tab stops and leaders show straight away
  const ec = ed.editing?.container;
  if (ec && !ec.__txInput) {
    ec.__txInput = true;
    ec.addEventListener('input', () => {
      const cur = ed.editing; if (!cur || cur.container !== ec) return;
      const had = tabify(ec);
      if (had || ec.querySelector('span.tab')) { layoutTabs(cur.box); ed.saveRange(); }
    });
  }
  // keep up with the caret while typing; stop once this panel is replaced
  const onSel = () => { if (!el.isConnected) { document.removeEventListener('selectionchange', onSel); return; } if (ed.editing) refresh(ctx); };
  document.addEventListener('selectionchange', onSel);

  $('#txSpacing').addEventListener('change', (e) => { if (e.target.value === 'custom') return; runPatch(ctx, { tracking: +e.target.value }); $('#txTrack').value = e.target.value; });
  $('#txTrack').addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) runPatch(ctx, { tracking: v }); });
  el.querySelectorAll('[data-tx]').forEach((b) => b.addEventListener('click', () => {
    const r = runNow(ctx), k = b.dataset.tx;
    if (k === 'strike') runPatch(ctx, { strike: !r.strike });
    else if (k === 'super' || k === 'sub') runPatch(ctx, { position: r.position === k ? null : k });
    else runPatch(ctx, { caps: r.caps === k ? null : k });
    if (!ed.editing) return; refresh(ctx);
  }));
  $('#txKern').addEventListener('change', (e) => runPatch(ctx, { kern: e.target.checked ? null : 'off' }));
  $('#txLiga').addEventListener('change', (e) => runPatch(ctx, { liga: e.target.checked ? null : 'off' }));
  $('#txHl').addEventListener('change', (e) => runPatch(ctx, { highlight: e.target.value }));
  $('#txHlNone').addEventListener('click', () => runPatch(ctx, { highlight: null }));

  // links (while typing): the words selected become a link
  $('#txLink')?.addEventListener('click', () => { const row = $('.tx-linkrow'); row.hidden = !row.hidden; if (!row.hidden) $('#txLinkUrl').focus(); });
  const addLink = () => {
    const href = cleanLink($('#txLinkUrl').value);
    if (!href) { app.toast(ctx.t('tx.linkBad')); return; }
    const r = ed.restoreRange(); if (!r) return;
    const had = !!moreAtCaret(ed.editing.container, r)?.link;
    applyRunStyle(ed.editing.container, r, had ? { link: href } : { link: href, underline: true, color: '#0563c1' }, app.embedded);
    ed.saveRange(); refresh(ctx);
  };
  $('#txLinkAdd')?.addEventListener('click', addLink);
  $('#txLinkUrl')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addLink(); } if (e.key === 'Escape') e.stopPropagation(); });
  $('#txLinkDel')?.addEventListener('click', () => { const r = ed.restoreRange(); if (!r) return; applyRunStyle(ed.editing.container, r, { link: '' }, app.embedded); ed.saveRange(); refresh(ctx); });

  // paragraphs
  // a big first letter: on the paragraphs being typed in, or on the first paragraph of each box
  $('#txDrop').addEventListener('change', (e) => { const n = +e.target.value; changeParas(ctx, 'drop cap', (pa, it) => { if (!ed.editing && it.paras[0] !== pa) return; if (n) pa.dropCap = { ...(pa.dropCap || {}), lines: n }; else delete pa.dropCap; }); });
  $('#txLeaders').addEventListener('change', (e) => {
    const on = e.target.checked;
    changeParas(ctx, 'tabs', (pa, it) => {
      const edge = edgeOf(it);
      pa.tabs = (pa.tabs || []).filter((tb) => !(tb.align === 'right' && tb.leader === 'dot') && (!on || tb.pos < edge - 1));
      if (on) pa.tabs.push({ pos: edge, align: 'right', leader: 'dot' });
      if (!pa.tabs.length) delete pa.tabs;
    });
    if (ed.editing) refresh(ctx);
  });
  const setTabs = (tabs) => {
    const list = tabs.filter((tb) => tb.pos > 0).sort((a, b) => a.pos - b.pos);
    changeParas(ctx, 'tabs', (pa) => { if (list.length) pa.tabs = list.map((tb) => ({ ...tb })); else delete pa.tabs; });
    if (ed.editing) refresh(ctx);
  };
  const readRows = () => [...el.querySelectorAll('.tx-tab')].map((row) => ({ pos: panel ? panel.fromUnit(parseFloat(row.querySelector('[data-k=pos]').value) || 0) : parseFloat(row.querySelector('[data-k=pos]').value) || 0, align: row.querySelector('[data-k=align]').value, leader: row.querySelector('[data-k=leader]').value }));
  $('#txTabList').addEventListener('change', () => setTabs(readRows()));
  $('#txTabList').addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (!d) return; const rows = readRows(); rows.splice(+d.dataset.del, 1); setTabs(rows); });
  $('#txTabList').addEventListener('mousedown', (e) => { if (ed.editing && e.target.closest('button')) e.preventDefault(); });
  $('#txTabAdd').addEventListener('click', () => {
    const rows = readRows(), last = rows.length ? Math.max(...rows.map((r) => r.pos)) : 0;
    rows.push({ pos: Math.round((last + 72) * 10) / 10, align: 'left', leader: 'none' }); setTabs(rows);
  });

  // the box
  $('#txCols')?.addEventListener('change', (e) => ed.setProps((it) => { if (it.type === 'text') { it.columns = +e.target.value; if (!it.columnGap) it.columnGap = 9; } }, 'columns'));
  $('#txColGap')?.addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (v >= 0) ed.setProps((it) => { if (it.type === 'text') it.columnGap = panel ? panel.fromUnit(v) : v; }, 'columns'); });
  $('#txHyph')?.addEventListener('change', (e) => ed.setProps((it) => { if (it.type === 'text') { if (e.target.checked) it.hyphenate = true; else delete it.hyphenate; } }, 'hyphens'));

  el.querySelectorAll('[data-field]').forEach((b) => b.addEventListener('click', async () => (await import('../fields.js')).insertField(app, b.dataset.field)));
  $('#txStyles').addEventListener('click', async () => (await import('../styles.js')).openStyles(app));
}

// ---------------------------------------------------------------- the part for wrapping text around things
function wrapHtml(ctx) {
  const { t, esc, panel } = ctx;
  const first = flatAll(ctx.items)[0] || {};
  const now = first.wrap || 'none', unit = panel?.unit || 'cm';
  const gap = Number.isFinite(+first.wrapGap) && first.wrapGap !== null ? +first.wrapGap : 6;
  return `<h2>${esc(t('tx.wrap'))}</h2>
  <div class="prow seg">${['none', 'square', 'topBottom'].map((k) => `<button class="pbtn wide" data-wrap="${k}" aria-pressed="${now === k}">${esc(t('tx.wrap.' + k))}</button>`).join('')}</div>
  <div class="prow"${now === 'none' ? ' hidden' : ''}><label class="field">${esc(t('tx.wrapGap'))} <input id="txWrapGap" type="number" min="0" max="100" step="0.05" value="${+(panel ? panel.toUnit(gap) : gap).toFixed(2)}"> ${esc(unit)}</label></div>
  <p class="hint">${esc(t('tx.wrapHint'))}</p>`;
}
function wireWrap(el, ctx) {
  const { ed, panel } = ctx;
  // the whole page is drawn again, so text boxes under the item follow at once
  el.querySelectorAll('[data-wrap]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.wrap;
    ed.change('wrap', () => ed.selectedItems().forEach((it) => { const rec = (x) => { if (x.type === 'group') x.items.forEach(rec); else if (k === 'none') delete x.wrap; else x.wrap = k; }; rec(it); }), [ed.pageIndex]);
  }));
  el.querySelector('#txWrapGap')?.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value); if (!(v >= 0)) return;
    ed.setProps((it) => { it.wrapGap = Math.round((panel ? panel.fromUnit(v) : v) * 100) / 100; }, 'wrap');
  });
}

export default [
  { id: 'text-more', when: (ctx) => ctx.editing ? !ctx.ed.editing.cell : flatText(ctx.items).length > 0 && ctx.items.every((it) => it.type !== 'table'), html: textHtml, wire: wireText },
  { id: 'text-wrap', when: (ctx) => !ctx.editing && ctx.items.length > 0 && flatAll(ctx.items).every((it) => ['image', 'shape', 'text'].includes(it.type)), html: wrapHtml, wire: wireWrap },
];
