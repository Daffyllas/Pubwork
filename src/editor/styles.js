// Text styles (Title, Heading, Body text …): use one on the selected paragraphs or text boxes, save the
// look of the selected text as a new style, or change a style everywhere it is used.
// doc.styles = [{ id, name | key, para: {...}, run: {...} }]; a paragraph that uses one has para.style = id.
import { t } from '../i18n/index.js';
import { readParas, parasInRange } from './text.js';
import { cssFamily } from '../fonts.js';
import { clone, walkItems } from './model.js';
import '../editor/sections/text.css';

const DEFAULTS = [
  { id: 'title', key: 'st.s.title', para: { spaceBefore: 0, spaceAfter: 6 }, run: { size: 28, bold: true, italic: false } },
  { id: 'h1', key: 'st.s.h1', para: { spaceBefore: 6, spaceAfter: 4 }, run: { size: 18, bold: true, italic: false } },
  { id: 'h2', key: 'st.s.h2', para: { spaceBefore: 4, spaceAfter: 3 }, run: { size: 14, bold: true, italic: false } },
  { id: 'body', key: 'st.s.body', para: { spaceBefore: 0, spaceAfter: 6 }, run: { size: 11, bold: false, italic: false } },
  { id: 'caption', key: 'st.s.caption', para: { spaceBefore: 0, spaceAfter: 2 }, run: { size: 9, bold: false, italic: true } },
  { id: 'quote', key: 'st.s.quote', para: { spaceBefore: 4, spaceAfter: 4, indentLeft: 18, indentRight: 18 }, run: { size: 12, bold: false, italic: true } },
];
const PARA_PROPS = ['align', 'spaceBefore', 'spaceAfter', 'lineHeight', 'indentLeft', 'indentRight', 'indentFirst'];
const RUN_PROPS = ['font', 'size', 'bold', 'italic', 'underline', 'color', 'caps', 'tracking'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const styleName = (s) => s.name || t(s.key || '') || s.id;
export function docStyles(doc) { return doc.styles || clone(DEFAULTS); }
function ownStyles(doc) { if (!doc.styles) doc.styles = clone(DEFAULTS); return doc.styles; }

// put a style on one paragraph (the model)
export function applyStyle(pa, st) {
  pa.style = st.id;
  for (const k of PARA_PROPS) if (k in st.para) { if (st.para[k] == null) delete pa[k]; else pa[k] = clone(st.para[k]); }
  for (const r of pa.runs) for (const k of RUN_PROPS) if (k in st.run) { if (st.run[k] == null || st.run[k] === false) delete r[k]; else r[k] = st.run[k]; }
  delete pa.emptySize;
}

// which paragraphs the person means: [{ item, indexes }] (indexes in item.paras)
function target(app) {
  const ed = app.editor;
  if (ed.editing && !ed.editing.cell) {
    const ps = [...ed.editing.container.querySelectorAll(':scope > p.para')];
    const picked = parasInRange(ed.editing.container, ed.editing.range).map((p) => ps.indexOf(p));
    const first = +ps[0]?.dataset.pi || 0;
    const item = ed.editing.item;
    ed.endEdit(); // the typing becomes one undo step; the style is the next
    return [{ item, indexes: picked.map((i) => first + i) }];
  }
  const out = [];
  const rec = (it) => { if (it.type === 'group') it.items.forEach(rec); else if (it.type === 'text') out.push({ item: it, indexes: it.paras.map((_, i) => i) }); };
  ed.selectedItems().forEach(rec);
  return out;
}
// the look of the text the person picked, as a style's { para, run }
function sample(app) {
  const ed = app.editor;
  let pa = null;
  if (ed.editing && !ed.editing.cell) {
    const ps = [...ed.editing.container.querySelectorAll(':scope > p.para')];
    const p = parasInRange(ed.editing.container, ed.editing.range)[0];
    pa = readParas(ed.editing.container, ed.editing.item.paras)[Math.max(0, ps.indexOf(p))];
  } else {
    const it = ed.selectedItems().flatMap(function rec(x) { return x.type === 'group' ? x.items.flatMap(rec) : [x]; }).find((x) => x.type === 'text');
    pa = it?.paras.find((p) => p.runs.some((r) => r.text)) || it?.paras[0];
  }
  if (!pa) return null;
  const r = pa.runs.find((x) => x.text) || pa.runs[0] || {};
  const para = {}, run = {};
  for (const k of PARA_PROPS) para[k] = pa[k] === undefined ? null : clone(pa[k]);
  for (const k of RUN_PROPS) run[k] = r[k] === undefined ? (k === 'bold' || k === 'italic' ? false : null) : r[k];
  return { para, run };
}
// every paragraph in the document (pages and master pages) that uses a style
function* usersOf(doc, id) {
  const lists = [];
  for (const { it } of walkItems(doc)) if (it.type === 'text') lists.push(it);
  for (const m of doc.masters || []) { const rec = (l) => l.forEach((x) => (x.type === 'group' ? rec(x.items) : x.type === 'text' && lists.push(x))); rec(m.items || []); }
  for (const it of lists) for (const pa of it.paras) if (pa.style === id) yield { it, pa };
}

let panel = null;
export function openStyles(app) {
  if (!app.doc) return;
  if (!panel) {
    panel = document.createElement('div'); panel.className = 'panel styles-panel'; panel.id = 'stylesPanel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'stylesTitle');
    document.body.appendChild(panel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden && panel.contains(document.activeElement)) panel.hidden = true; });
  }
  panel.hidden = false;
  // Undo and Redo can bring back (or take away) a style: show the list as it is then
  const ed = app.editor;
  if (!ed.__stylesRedraw) {
    ed.__stylesRedraw = true;
    const after = ed.afterHistory;
    ed.afterHistory = function (...a) { const r = after.apply(this, a); if (panel && !panel.hidden && app.doc) draw(app); return r; };
  }
  draw(app);
}
function draw(app) {
  const doc = app.doc, list = docStyles(doc), ed = app.editor;
  const curId = (() => {
    if (ed.editing) return parasInRange(ed.editing.container, ed.editing.range)[0]?.dataset.style || null;
    const it = ed.selectedItems().find((x) => x.type === 'text'); return it?.paras[0]?.style || null;
  })();
  const prev = (s) => {
    const r = s.run, st = [`font-size:${Math.min(22, Math.max(10, r.size || 11))}px`, `font-weight:${r.bold ? 700 : 400}`, `font-style:${r.italic ? 'italic' : 'normal'}`];
    if (r.font) st.push(`font-family:${esc(cssFamily(r.font, app.embedded))}`); if (r.color) st.push(`color:${esc(r.color)}`);
    if (r.underline) st.push('text-decoration:underline'); if (r.caps === 'all') st.push('text-transform:uppercase'); if (r.caps === 'small') st.push('font-variant:small-caps');
    return st.join(';');
  };
  panel.innerHTML = `<h2 id="stylesTitle">${esc(t('st.title'))}</h2>
  <p class="hint">${esc(t('st.hint'))}</p>
  <div class="st-list">${list.map((s) => `<div class="st-row">
    <button class="st-use${s.id === curId ? ' on' : ''}" data-use="${esc(s.id)}"><span class="st-name">${esc(styleName(s))}${s.run.size ? ` · ${Number(s.run.size) || 0} pt` : ''}</span><span class="st-prev" style="${prev(s)}">${esc(styleName(s))} — ${esc(t('st.sample'))}</span></button>
    <button class="btn" data-upd="${esc(s.id)}" title="${esc(t('st.updateHint'))}">${esc(t('st.update'))}</button>
    ${s.key ? '<span></span>' : `<button class="pbtn" data-del="${esc(s.id)}" aria-label="${esc(t('st.delete'))}" title="${esc(t('st.delete'))}">×</button>`}
  </div>`).join('')}</div>
  <fieldset><legend>${esc(t('st.new'))}</legend><div class="st-new"><input id="stName" type="text" placeholder="${esc(t('st.newName'))}" aria-label="${esc(t('st.newName'))}"><button class="btn" id="stAdd">${esc(t('st.add'))}</button></div></fieldset>
  <div class="actions"><button class="btn" id="stClose">${esc(t('st.close'))}</button></div>`;
  // the buttons must not take the caret out of the text being typed
  panel.querySelectorAll('button').forEach((b) => b.addEventListener('mousedown', (e) => { if (ed.editing) e.preventDefault(); }));
  panel.querySelector('#stClose').onclick = () => { panel.hidden = true; };
  panel.querySelectorAll('[data-use]').forEach((b) => b.onclick = () => {
    const st = docStyles(doc).find((s) => s.id === b.dataset.use); if (!st) return;
    const tg = target(app); if (!tg.length) { app.toast(t('st.pick')); return; }
    if (!doc.styles) doc.styles = docStyles(doc);
    ed.change('style', () => {
      for (const { item, indexes } of tg) {
        // linked boxes share one story: every box in the chain gets the same paragraphs
        const boxes = item.chain ? [...walkItems(doc)].map((e) => e.it).filter((x) => x.chain === item.chain) : [item];
        for (const bx of boxes) { for (const i of indexes) if (bx.paras[i]) applyStyle(bx.paras[i], st); bx.edited = true; }
      }
    }, [...doc.pages.keys()]);
    app.toast(t('st.used', { name: styleName(st) }), 2000); draw(app);
  });
  panel.querySelectorAll('[data-upd]').forEach((b) => b.onclick = () => {
    const look = sample(app); if (!look) { app.toast(t('st.pick')); return; }
    if (ed.editing) ed.endEdit();
    const styles = ownStyles(doc), st = styles.find((s) => s.id === b.dataset.upd); if (!st) return;
    ed.change('style', () => {
      st.para = look.para; st.run = look.run;
      for (const { it, pa } of usersOf(doc, st.id)) { applyStyle(pa, st); it.edited = true; }
    }, [...doc.pages.keys()]);
    app.toast(t('st.changed', { name: styleName(st) }), 2500); draw(app);
  });
  panel.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
    if (ed.editing) ed.endEdit();
    const styles = ownStyles(doc); const i = styles.findIndex((s) => s.id === b.dataset.del); if (i < 0) return;
    ed.change('style', () => { styles.splice(i, 1); for (const { pa } of usersOf(doc, b.dataset.del)) delete pa.style; }, [...doc.pages.keys()]);
    draw(app);
  });
  const add = () => {
    const name = panel.querySelector('#stName').value.trim(); if (!name) { panel.querySelector('#stName').focus(); return; }
    const look = sample(app); if (!look) { app.toast(t('st.pick')); return; }
    const styles = ownStyles(doc);
    const st = { id: `s${Date.now().toString(36)}`, name, ...look };
    ed.history.save(doc, 'style'); // an undo step of its own (the text being typed stays open)
    styles.push(st); app.updateToolbar?.(); app.touched?.();
    app.toast(t('st.saved', { name }), 2000); draw(app);
  };
  panel.querySelector('#stAdd').onclick = add;
  panel.querySelector('#stName').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); add(); } });
}
