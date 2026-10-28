// Settings panel parts for text: letters (spacing, capitals, raised/lowered, crossed out, highlight),
// links, big first letters, tab stops and dot leaders, columns, hyphens, fields, styles, and how text
// wraps around pictures and shapes. While typing they change the selected words or paragraphs;
// otherwise the whole of the selected text boxes.
import './text.css';
import { applyRunStyle, moreAtCaret, parasInRange, ppOf, setParaProps, relist, listInput, unlistPatch, LIST_STEP } from '../text.js';
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
      paraExtras(p, { ...pa, lineHeight: ppOf(p).lineHeight }, size, span?.style.fontFamily || '');
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

// ---------------------------------------------------------------- the part for lists and spacing
// Bullets and numbering, moving paragraphs left and right, line spacing and the space before and after
// paragraphs. While typing they change the paragraphs selected (or the one with the caret); otherwise every
// paragraph of the selected text boxes (and tables).
const BULLETS = [['dot', '•'], ['dash', '–'], ['check', '✓'], ['square', '■']];
const NUMBERS = [['1', '1.'], ['a', 'a.'], ['i', 'i.']];
const LINES = [['1', 'tl.l.single'], ['1.15', '1.15'], ['1.5', '1.5'], ['2', 'tl.l.double']];
const last = { bullet: '•', num: '1' }; // the kind of bullet or numbers used last: Bullets and Numbering start with it
const ICONS = {
  bullet: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="14.5" r="1.4" fill="currentColor" stroke="none"/><path d="M8 5.5h9M8 10h9M8 14.5h9"/></svg>',
  num: '<svg viewBox="0 0 20 20" aria-hidden="true"><text x="1.2" y="7.4" font-size="6" font-family="system-ui,sans-serif" font-weight="700" fill="currentColor" stroke="none">1</text><text x="1.2" y="12" font-size="6" font-family="system-ui,sans-serif" font-weight="700" fill="currentColor" stroke="none">2</text><text x="1.2" y="16.6" font-size="6" font-family="system-ui,sans-serif" font-weight="700" fill="currentColor" stroke="none">3</text><path d="M8 5.5h9M8 10h9M8 14.5h9"/></svg>',
  outdent: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M9 8h8M9 12h8M3 16h14M6 7.5 3.2 10 6 12.5"/></svg>',
  indent: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h14M9 8h8M9 12h8M3 16h14M3.2 7.5 6 10l-2.8 2.5"/></svg>',
};
// the paragraph lists of the picked things: text boxes, also inside groups, and the cells of tables
const paraLists = (it) => (it.type === 'text' ? [it.paras] : it.type === 'table' ? it.rows.flatMap((r) => r.cells.filter((c) => !c.covered).map((c) => c.paras)) : []);
const holders = (items) => { const out = []; const rec = (l) => l.forEach((it) => (it.type === 'group' ? rec(it.items) : (it.type === 'text' || it.type === 'table') && out.push(it))); rec(items); return out; };
const hasWords = (pa) => pa.runs?.some((r) => r.text && r.text.trim());
const isList = (pa) => !!(pa.bullet || pa.num);

// the paragraph whose settings are shown
function listNow(ctx) {
  const { ed } = ctx;
  if (ed.editing) { const p = parasInRange(ed.editing.container, ed.editing.range)[0]; return { ...ppOf(p), size: p ? parseFloat(getComputedStyle(p.querySelector('[data-font]') || p).fontSize) * 0.75 : 10 }; }
  const all = holders(ctx.items).flatMap(paraLists).flat();
  const pa = all.find(hasWords) || all[0] || {};
  return { ...pa, size: pa.runs?.find((r) => r.size)?.size || 10 };
}
// a change to the picked paragraphs. fn(pa) -> the settings to change (null: take away); onlyWords: leave empty lines alone
function changeLists(ctx, fn, onlyWords = false) {
  const { ed } = ctx;
  if (ed.editing) {
    const { container, box, item } = ed.editing;
    for (const p of parasInRange(container, ed.editing.range)) { if (p.classList.contains('cont')) continue; setParaProps(p, fn(ppOf(p))); }
    afterTyping(ctx, container, box, item);
    return;
  }
  ed.setProps((it) => {
    const lists = paraLists(it); if (!lists.length) return;
    for (const paras of lists) for (const pa of paras) {
      if (onlyWords && !hasWords(pa)) continue;
      for (const [k, v] of Object.entries(fn(pa))) if (v == null || v === '') delete pa[k]; else pa[k] = v;
    }
    if (it.type === 'text') it.edited = true; // spacing the person chose is never squeezed to fit
  }, 'style');
}
// after a change while typing: numbers counted again, tabs laid out again, the change kept
function afterTyping(ctx, container, box, item) {
  const { ed } = ctx;
  const first = container.querySelector(':scope > p.para');
  relist(container, ed.editing?.cell ? [] : (item.paras || []).slice(0, first ? +first.dataset.pi || 0 : 0));
  if (container.querySelector('span.tab')) layoutTabs(box);
  refreshDropCaps(container);
  ed.editing?.fitCheck?.(); ed.flushSoon(); ed.saveRange?.();
  refreshList(ctx);
}
const listOn = (kind, value) => (pa) => {
  const patch = kind === 'bullet' ? { bullet: value, num: null, numSuffix: null, numStart: null } : { num: value, bullet: null };
  if (!isList(pa)) { patch.indentLeft = (pa.indentLeft || 0) + LIST_STEP; patch.indentFirst = -LIST_STEP; } // the words go in, the bullet hangs in front
  return patch;
};

function listHtml(ctx) {
  const { t, esc } = ctx;
  return `<h2>${esc(t('tl.title'))}</h2>
  <div class="prow seg tl-kinds"><button class="pbtn wide" data-list="bullet" aria-pressed="false">${ICONS.bullet}<span>${esc(t('tl.bullets'))}</span></button><button class="pbtn wide" data-list="num" aria-pressed="false">${ICONS.num}<span>${esc(t('tl.numbers'))}</span></button></div>
  <div class="prow tl-row">
    <div class="tl-chips" data-for="bullet" role="group" aria-label="${esc(t('tl.bulletStyle'))}" hidden>${BULLETS.map(([k, c]) => `<button class="pbtn" data-bullet="${esc(c)}" aria-pressed="false" aria-label="${esc(t('tl.b.' + k))}" title="${esc(t('tl.b.' + k))}">${esc(c)}</button>`).join('')}</div>
    <div class="tl-chips" data-for="num" role="group" aria-label="${esc(t('tl.numberStyle'))}" hidden>${NUMBERS.map(([k, c]) => `<button class="pbtn" data-num="${k}" aria-pressed="false" aria-label="${esc(t('tl.n.' + k))}" title="${esc(t('tl.n.' + k))}">${esc(c)}</button>`).join('')}</div>
    <span class="tl-push"></span>
    <button class="pbtn" data-indent="-1" aria-label="${esc(t('tl.outdent'))}" title="${esc(t('tl.outdent'))}">${ICONS.outdent}</button><button class="pbtn" data-indent="1" aria-label="${esc(t('tl.indent'))}" title="${esc(t('tl.indent'))}">${ICONS.indent}</button>
  </div>
  ${ctx.editing ? `<p class="hint tl-endhint" hidden>${esc(t('tl.endHint'))}</p>` : ''}
  <div class="prow"><label class="field tl-line">${esc(t('tl.line'))} <select id="tlLine">${LINES.map(([v, k]) => `<option value="${v}">${esc(k.startsWith('tl.') ? t(k) : k)}</option>`).join('')}<option value="cur" hidden></option><option value="exact">${esc(t('tl.l.exact'))}</option></select></label></div>
  <div class="prow tl-exact" hidden><label class="field">${esc(t('tl.l.exactPt'))} <input id="tlLinePt" type="number" min="1" max="500" step="0.5"></label> pt</div>
  <div class="pgrid tl-space"><label>${esc(t('tl.before'))}<input id="tlBefore" type="number" min="0" max="500" step="1"></label><label>${esc(t('tl.after'))}<input id="tlAfter" type="number" min="0" max="500" step="1"></label></div>`;
}

// show the settings of the paragraph at the caret (or of the picked boxes)
function refreshList(ctx) {
  const el = ctx.el; if (!el?.isConnected) return;
  const pa = listNow(ctx), kind = pa.num ? 'num' : pa.bullet ? 'bullet' : null;
  el.querySelectorAll('[data-list]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.list === kind)));
  el.querySelectorAll('.tl-chips').forEach((g) => { g.hidden = g.dataset.for !== kind; });
  el.querySelectorAll('[data-bullet]').forEach((b) => b.setAttribute('aria-pressed', String(kind === 'bullet' && b.dataset.bullet === pa.bullet)));
  el.querySelectorAll('[data-num]').forEach((b) => b.setAttribute('aria-pressed', String(kind === 'num' && b.dataset.num === String(pa.num).toLowerCase())));
  const hint = el.querySelector('.tl-endhint'); if (hint) hint.hidden = !kind;
  const sel = el.querySelector('#tlLine'), exact = el.querySelector('.tl-exact'), lpt = el.querySelector('#tlLinePt');
  if (document.activeElement !== sel && document.activeElement !== lpt) {
    const lh = pa.lineHeight, cur = sel.querySelector('option[value="cur"]');
    cur.hidden = true;
    if (lh?.pt) { sel.value = 'exact'; lpt.value = +(+lh.pt).toFixed(2); }
    else {
      const m = lh?.mult ? +(+lh.mult).toFixed(2) : 1;
      const hit = LINES.find(([v]) => Math.abs(+v - m) < 0.005);
      if (hit) sel.value = hit[0]; else { cur.hidden = false; cur.textContent = String(m); sel.value = 'cur'; }
      lpt.value = +(Math.round((m * 1.2 * (pa.size || 10)) * 2) / 2).toFixed(1);
    }
    exact.hidden = sel.value !== 'exact';
  }
  for (const [id, k] of [['#tlBefore', 'spaceBefore'], ['#tlAfter', 'spaceAfter']]) { const i = el.querySelector(id); if (i && document.activeElement !== i) i.value = +(+(pa[k] || 0)).toFixed(1); }
}

function wireList(el, ctx) {
  ctx = { ...ctx, el };
  const { ed } = ctx;
  const $ = (s) => el.querySelector(s);
  // right under the text settings (font, size, alignment), where people look for lists
  const after = el.parentElement?.querySelector('[data-align]')?.closest('.prow');
  const anchor = after?.nextElementSibling?.classList.contains('hint') ? after.nextElementSibling : after;
  if (anchor && anchor.parentElement === el.parentElement) anchor.after(el);
  el.querySelectorAll('button').forEach((b) => b.addEventListener('mousedown', (e) => { if (ed.editing) e.preventDefault(); })); // the caret stays in the text
  refreshList(ctx);
  // while typing: Enter on an empty item ends the list, Backspace at its start takes the bullet away,
  // and the numbers follow every line added or taken away
  const ec = ed.editing?.container;
  if (ec && !ec.__tlInput) {
    ec.__tlInput = true;
    ec.addEventListener('beforeinput', (e) => {
      const cur = ed.editing; if (!cur || cur.container !== ec) return;
      if (listInput(e, ec)) afterTyping({ ...ctx, el: document.querySelector('#side [data-sec="text-lists"]') }, ec, cur.box, cur.item);
    });
    ec.addEventListener('input', () => {
      const cur = ed.editing; if (!cur || cur.container !== ec) return;
      if (!ec.querySelector(':scope > p.para[data-pp*="bullet"], :scope > p.para[data-pp*="num"], :scope > p.para > .bullet')) return;
      const first = ec.querySelector(':scope > p.para');
      relist(ec, cur.cell ? [] : (cur.item.paras || []).slice(0, first ? +first.dataset.pi || 0 : 0));
    });
  }
  const onSel = () => { if (!el.isConnected) { document.removeEventListener('selectionchange', onSel); return; } if (ed.editing) refreshList(ctx); };
  document.addEventListener('selectionchange', onSel);

  el.querySelectorAll('[data-list]').forEach((b) => b.addEventListener('click', () => {
    const kind = b.dataset.list, now = listNow(ctx);
    const on = kind === 'num' ? !!now.num : !!now.bullet && !now.num;
    if (on) changeLists(ctx, (pa) => (isList(pa) ? unlistPatch(pa) : {}));
    else changeLists(ctx, listOn(kind, last[kind]), true);
  }));
  el.querySelectorAll('[data-bullet]').forEach((b) => b.addEventListener('click', () => { last.bullet = b.dataset.bullet; changeLists(ctx, listOn('bullet', last.bullet), true); }));
  el.querySelectorAll('[data-num]').forEach((b) => b.addEventListener('click', () => { last.num = b.dataset.num; changeLists(ctx, listOn('num', last.num), true); }));
  el.querySelectorAll('[data-indent]').forEach((b) => b.addEventListener('click', () => {
    const d = +b.dataset.indent * LIST_STEP;
    changeLists(ctx, (pa) => { const hang = pa.indentFirst < 0 ? -pa.indentFirst : 0; return { indentLeft: Math.round(Math.max(hang, (pa.indentLeft || 0) + d) * 100) / 100 || null }; });
  }));
  const setLine = (lh) => changeLists(ctx, () => ({ lineHeight: lh }));
  $('#tlLine').addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'exact') { $('.tl-exact').hidden = false; const n = parseFloat($('#tlLinePt').value); if (n > 0) setLine({ pt: n }); return; }
    if (v === 'cur') return;
    $('.tl-exact').hidden = true; setLine({ mult: +v });
  });
  $('#tlLinePt').addEventListener('change', (e) => { const n = parseFloat(e.target.value); if (n > 0) { $('#tlLine').value = 'exact'; setLine({ pt: Math.min(500, n) }); } });
  for (const [id, k] of [['#tlBefore', 'spaceBefore'], ['#tlAfter', 'spaceAfter']]) {
    $(id).addEventListener('change', (e) => { const n = parseFloat(e.target.value); if (n >= 0) changeLists(ctx, () => ({ [k]: Math.min(500, Math.round(n * 10) / 10) || null })); });
  }
}

export default [
  { id: 'text-lists', when: (ctx) => ctx.editing || holders(ctx.items).length > 0, html: listHtml, wire: wireList },
  { id: 'text-more', when: (ctx) => ctx.editing ? !ctx.ed.editing.cell : flatText(ctx.items).length > 0 && ctx.items.every((it) => it.type !== 'table'), html: textHtml, wire: wireText },
  { id: 'text-wrap', when: (ctx) => !ctx.editing && ctx.items.length > 0 && flatAll(ctx.items).every((it) => ['image', 'shape', 'text'].includes(it.type)), html: wrapHtml, wire: wireWrap },
];
