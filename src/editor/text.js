// Typing in text boxes. The box's own HTML is made editable, so the text stays exactly where it is on the
// page; when typing ends, the HTML is read back into paragraphs and runs (pubmodel.js's shapes).
import { cssFamily } from '../fonts.js';
import { listLabels, setMarker, paraLook, stampPara, PP_KEYS } from '../render.js';

const PARA_KEYS = ['align', 'spaceBefore', 'spaceAfter', 'indentLeft', 'indentRight', 'indentFirst', 'lineHeight', 'background', 'bullet', 'num', 'numSuffix', 'numStart', 'tabs', 'dropCap', 'style'];

const pt = (v) => { const n = parseFloat(v); if (!Number.isFinite(n)) return null; return String(v).endsWith('px') ? n * 0.75 : n; };
const hex = (c) => {
  if (!c) return null;
  if (c.startsWith('#')) return c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c.toLowerCase();
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c);
  if (!m || (m[4] != null && +m[4] === 0)) return null;
  return '#' + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('');
};

// what one element adds to the style of the text inside it
function elStyle(el) {
  const s = {}, st = el.style, tag = el.tagName;
  if (el.dataset?.font) s.font = el.dataset.font;
  const fs = el.dataset?.fs0 || st.fontSize;
  if (fs) { let v = pt(fs); if (v && (st.verticalAlign === 'super' || st.verticalAlign === 'sub')) v = v / 0.66; if (v) s.size = Math.round(v * 10) / 10; }
  if (st.fontWeight) s.bold = st.fontWeight === 'bold' || +st.fontWeight >= 600;
  if (st.fontStyle) s.italic = st.fontStyle === 'italic' || st.fontStyle === 'oblique';
  const deco = st.textDecorationLine || st.textDecoration;
  if (deco) { s.underline = /underline/.test(deco) ? (st.textDecorationStyle === 'double' ? 'double' : st.textDecorationStyle === 'dotted' ? 'dotted' : 'single') : false; s.strike = /line-through/.test(deco); }
  if (st.color && st.color !== 'transparent') s.color = hex(st.color);
  if (st.backgroundColor) s.highlight = hex(st.backgroundColor) || undefined;
  if (st.textTransform === 'uppercase') s.caps = 'all';
  if (st.fontVariant === 'small-caps') s.caps = 'small';
  if (st.verticalAlign === 'super' || st.verticalAlign === 'sub') s.position = st.verticalAlign;
  if (st.letterSpacing) s.tracking = st.letterSpacing === 'normal' ? undefined : pt(st.letterSpacing) || undefined;
  if (st.fontKerning) s.kern = st.fontKerning === 'none' ? 'off' : undefined;
  if (st.fontVariantLigatures) s.liga = st.fontVariantLigatures === 'none' ? 'off' : undefined;
  if (tag === 'A' && el.getAttribute('href')) s.link = el.getAttribute('href');
  if (tag === 'B' || tag === 'STRONG') s.bold = true;
  if (tag === 'I' || tag === 'EM') s.italic = true;
  if (tag === 'U') s.underline = 'single';
  if (tag === 'S' || tag === 'STRIKE') s.strike = true;
  if (tag === 'FONT' && el.getAttribute('color')) s.color = hex(el.getAttribute('color'));
  if (el.lang) s.lang = el.lang;
  return s;
}
const clean = (s) => { const o = {}; for (const [k, v] of Object.entries(s)) if (v !== undefined && v !== null && v !== false) o[k] = v; return o; };
const same = (a, b) => JSON.stringify(clean({ ...a, text: '' })) === JSON.stringify(clean({ ...b, text: '' }));

// Read an edited box (or table cell) back into paragraphs. base: the paragraphs it was drawn from.
export function readParas(container, base = []) {
  const out = [];
  let lastStyle = base.find((p) => p.runs.length)?.runs[0] || {};
  // the invisible floats that make text wrap around pictures are not text
  const blocks = [...container.children].filter((e) => e.nodeType === 1 && !e.classList.contains('pw-float'));
  for (const p of blocks) {
    const orig = base[+p.dataset?.pi] || out[out.length - 1] || {};
    const para = {};
    for (const k of PARA_KEYS) if (orig[k] !== undefined) para[k] = orig[k];
    if (p.style.textAlign) para.align = p.style.textAlign;
    // tab stops, drop cap and style name are kept on the paragraph's element (they can change while typing)
    if (p.dataset) {
      const json = (v) => { try { return JSON.parse(v); } catch { return undefined; } };
      if (p.tagName === 'P' && p.classList.contains('para')) {
        delete para.tabs; delete para.dropCap; delete para.style;
        for (const k of PP_KEYS) delete para[k];
        const pp = json(p.dataset.pp || '{}') || {};
        for (const k of PP_KEYS) if (pp[k] != null && pp[k] !== '') para[k] = pp[k];
      }
      if (p.dataset.tabs) para.tabs = json(p.dataset.tabs);
      if (p.dataset.dropcap) para.dropCap = json(p.dataset.dropcap);
      if (p.dataset.style) para.style = p.dataset.style;
      for (const k of ['tabs', 'dropCap', 'style']) if (para[k] === undefined) delete para[k];
    }
    para.runs = [];
    const push = (text, style) => {
      const r = { ...clean(style), text };
      const last = para.runs[para.runs.length - 1];
      if (last && !r.field && !last.field && same(last, r)) last.text += text; else para.runs.push(r);
      lastStyle = r;
    };
    const visit = (node, style) => {
      const kids = [...node.childNodes];
      kids.forEach((n, i) => {
        if (n.nodeType === 3) { const t = n.data.replace(/​/g, ''); if (t) push(t, style); return; }
        if (n.nodeType !== 1 || n.classList?.contains('bullet') || n.classList?.contains('pw-ui') || n.classList?.contains('pw-gen') || n.classList?.contains('pw-float')) return;
        if (n.tagName === 'BR') { if (i < kids.length - 1) push('\n', style); return; }
        if (n.classList?.contains('tab')) { push('\t', style); return; } // a tab with its leader dots
        // a span drawn from a run carries that run's whole style; anything else adds to what is around it
        const own = n.dataset?.font && n.parentElement?.closest('[data-font]') == null ? { lang: style.lang, link: style.link, ...elStyle(n) } : { ...style, ...elStyle(n) };
        if (n.dataset?.field) { push(n.dataset.ph || '#', { ...own, field: n.dataset.field }); return; } // page number, date …: kept as a field
        visit(n, own);
      });
    };
    const inherit = { ...lastStyle }; delete inherit.text; delete inherit.field; delete inherit.link;
    visit(p, { ...inherit, ...elStyle(p) });
    if (!para.runs.length && p.dataset?.fs0) para.emptySize = pt(p.dataset.fs0);
    // a paragraph continued from the previous box joins it again
    if (p.classList.contains('cont') && out.length) { out[out.length - 1].runs.push(...para.runs); continue; }
    out.push(para);
  }
  return out;
}

// ------------------------------------------------------------------ changing the style of selected text
function textNodesIn(container, range) {
  const list = []; const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (n.data.replace(/​/g, '') && range.intersectsNode(n) && !n.parentElement.closest('.bullet, .pw-gen, .pw-float')) list.push(n);
  return list;
}
// make the selected words a link (url) or plain text again (url = '')
function setLink(container, nodes, url) {
  for (const node of nodes) {
    const a = node.parentElement.closest('a');
    if (a && container.contains(a)) { if (url) { a.setAttribute('href', url); a.title = url.replace(/^mailto:/, ''); } else a.replaceWith(...a.childNodes); continue; }
    if (!url) continue;
    // just these words: their own span (made by the style loop) or the bare text
    const span = node.parentElement;
    const target = span.tagName === 'SPAN' && span.childNodes.length === 1 && span !== container && !span.dataset.field ? span : node;
    const link = document.createElement('a'); link.className = 'pwlink'; link.setAttribute('href', url); link.title = url.replace(/^mailto:/, '');
    target.replaceWith(link); link.appendChild(target);
  }
}
function splitAtRange(range) {
  let { startContainer: sc, startOffset: so, endContainer: ec, endOffset: eo } = range;
  if (ec.nodeType === 3 && eo > 0 && eo < ec.length) ec.splitText(eo);
  if (sc.nodeType === 3 && so > 0 && so < sc.length) { const rest = sc.splitText(so); if (ec === sc) { ec = rest; eo = eo - so; } sc = rest; so = 0; }
  const r = document.createRange(); r.setStart(sc, so); r.setEnd(ec, ec.nodeType === 3 ? Math.min(eo, ec.length) : eo);
  return r;
}
// the word around the caret, used when nothing is selected
function wordRange(range) {
  const n = range.startContainer; if (n.nodeType !== 3) return range;
  let a = range.startOffset, b = a; const t = n.data;
  while (a > 0 && /\S/.test(t[a - 1])) a--; while (b < t.length && /\S/.test(t[b])) b++;
  if (a === b) return range;
  const r = document.createRange(); r.setStart(n, a); r.setEnd(n, b); return r;
}
export function applyRunStyle(container, range, patch, embedded) {
  if (!range) return;
  if (range.collapsed) range = wordRange(range);
  if (range.collapsed) return;
  range = splitAtRange(range);
  const nodes = textNodesIn(container, range);
  for (const node of nodes) {
    let span = node.parentElement;
    if (!(span.tagName === 'SPAN' && span.childNodes.length === 1)) { const ns = document.createElement('span'); node.replaceWith(ns); ns.appendChild(node); span = ns; }
    const st = span.style;
    if ('bold' in patch) st.fontWeight = patch.bold ? '700' : '400';
    if ('italic' in patch) st.fontStyle = patch.italic ? 'italic' : 'normal';
    if ('underline' in patch || 'strike' in patch) {
      const now = decoAt(span, container);
      const u = 'underline' in patch ? patch.underline : now.underline, s = 'strike' in patch ? patch.strike : now.strike;
      st.textDecorationLine = [u && 'underline', s && 'line-through'].filter(Boolean).join(' ') || 'none';
    }
    if ('size' in patch) { st.fontSize = `${patch.position || st.verticalAlign === 'super' || st.verticalAlign === 'sub' ? patch.size * 0.66 : patch.size}pt`; delete span.dataset.fs0; }
    if ('color' in patch) st.color = patch.color;
    if ('highlight' in patch) st.backgroundColor = patch.highlight || 'transparent';
    if ('font' in patch) { span.dataset.font = patch.font; st.fontFamily = cssFamily(patch.font, embedded); }
    if ('caps' in patch) { st.textTransform = patch.caps === 'all' ? 'uppercase' : 'none'; st.fontVariant = patch.caps === 'small' ? 'small-caps' : 'normal'; }
    if ('position' in patch) {
      const was = st.verticalAlign === 'super' || st.verticalAlign === 'sub';
      const size = parseFloat(getComputedStyle(span).fontSize) * 0.75, base = was ? size / 0.66 : size;
      if (patch.position) { st.verticalAlign = patch.position; st.fontSize = `${(base * 0.66).toFixed(2)}pt`; } else { st.verticalAlign = 'baseline'; st.fontSize = `${base.toFixed(2)}pt`; }
      delete span.dataset.fs0;
    }
    if ('tracking' in patch) st.letterSpacing = patch.tracking ? `${patch.tracking}pt` : 'normal';
    if ('kern' in patch) st.fontKerning = patch.kern === 'off' ? 'none' : 'auto';
    if ('liga' in patch) st.fontVariantLigatures = patch.liga === 'off' ? 'none' : 'normal';
  }
  if ('link' in patch) setLink(container, nodes, patch.link || '');
  if (nodes.length) { const sel = getSelection(); const r = document.createRange(); r.setStart(nodes[0], 0); const last = nodes[nodes.length - 1]; r.setEnd(last, last.length); sel.removeAllRanges(); sel.addRange(r); }
}
export function applyParaStyle(container, range, patch) {
  const ps = [...container.querySelectorAll('p.para')].filter((p) => !range || range.intersectsNode(p));
  for (const p of ps) if ('align' in patch) p.style.textAlign = patch.align;
}
// underline / strike-through drawn on this text by it or the elements around it
function decoAt(node, container) {
  const out = { underline: false, strike: false };
  for (let e = node; e && e !== container; e = e.parentElement) {
    const d = e.style?.textDecorationLine || '';
    if (/none/.test(d) && e === node) return out;
    if (/underline/.test(d)) out.underline = true;
    if (/line-through/.test(d)) out.strike = true;
    if (e.tagName === 'U') out.underline = true;
    if (e.tagName === 'S' || e.tagName === 'STRIKE') out.strike = true;
  }
  return out;
}
// the paragraphs touched by the selection (or holding the caret)
export function parasInRange(container, range) {
  const ps = [...container.querySelectorAll(':scope > p.para')];
  if (!range) return ps;
  const hit = ps.filter((p) => range.intersectsNode(p));
  return hit.length ? hit : ps.slice(-1);
}
// the less common character settings at the caret, for the "more text settings" part of the panel
export function moreAtCaret(container, range) {
  if (!range) return null;
  let n = range.startContainer; if (n.nodeType === 3) n = n.parentElement;
  if (!container.contains(n) && n !== container) return null;
  const cs = getComputedStyle(n);
  let pos = null; for (let e = n; e && e !== container; e = e.parentElement) if (e.style?.verticalAlign === 'super' || e.style?.verticalAlign === 'sub') { pos = e.style.verticalAlign; break; }
  let hl = null; for (let e = n; e && e !== container && !e.classList?.contains('para'); e = e.parentElement) { const c = hex(e.style?.backgroundColor || ''); if (c) { hl = c; break; } }
  const ls = parseFloat(cs.letterSpacing);
  return {
    tracking: Number.isFinite(ls) ? Math.round(ls * 0.75 * 10) / 10 : 0, kern: cs.fontKerning === 'none' ? 'off' : 'on', liga: cs.fontVariantLigatures === 'none' ? 'off' : 'on',
    caps: cs.textTransform === 'uppercase' ? 'all' : cs.fontVariantCaps === 'small-caps' ? 'small' : '', position: pos, strike: decoAt(n, container).strike, highlight: hl,
    link: n.closest('a')?.getAttribute('href') || '',
  };
}
// style of the text at the caret, for the toolbar
export function styleAtCaret(container) {
  const sel = getSelection(); if (!sel.rangeCount) return null;
  let n = sel.getRangeAt(0).startContainer; if (n.nodeType === 3) n = n.parentElement;
  if (!container.contains(n)) return null;
  const cs = getComputedStyle(n), p = n.closest('p.para');
  return {
    font: n.closest('[data-font]')?.dataset.font || null, size: Math.round(parseFloat(cs.fontSize) * 0.75 * 10) / 10,
    bold: +cs.fontWeight >= 600, italic: cs.fontStyle === 'italic', underline: /underline/.test(cs.textDecorationLine),
    color: hex(cs.color), align: p ? getComputedStyle(p).textAlign.replace('start', 'left').replace('end', 'right') : 'left',
  };
}

// ------------------------------------------------------------------ lists and spacing while typing
export const LIST_STEP = 18; // pt: how far one list level (or one "move right") goes in, as in Publisher
const jsonOr = (v, d) => { try { return JSON.parse(v) ?? d; } catch { return d; } };
// a drawn paragraph's spacing, indents and list settings
export function ppOf(p) { return jsonOr(p?.dataset.pp || '{}', {}); }
// change them (a null value takes the setting away) and show the change at once
export function setParaProps(p, patch) {
  const pa = { ...ppOf(p) };
  for (const [k, v] of Object.entries(patch)) if (v == null || v === '') delete pa[k]; else pa[k] = v;
  stampPara(p, pa);
  paraLook(p, { ...pa, cont: p.classList.contains('cont') });
  return pa;
}
// the look of a paragraph's first words, for its bullet or number
function wordsLook(p) {
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.replace(/[​]/g, '') && !t.parentElement.closest('.bullet, .pw-gen') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  let e = w.nextNode()?.parentElement;
  if (!e) e = [...p.querySelectorAll('span')].find((s) => !s.closest('.bullet, .pw-gen, .tab')) || null; // an empty line keeps the style of the words it came from
  if (!e || e === p) return null;
  const cs = getComputedStyle(e);
  return { fontFamily: cs.fontFamily, fontSize: `${+(parseFloat(cs.fontSize) * 0.75).toFixed(2)}pt`, color: cs.color };
}
// the words of a paragraph, without its bullet or number
export function wordsOf(p) {
  let s = ''; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (!n.parentElement.closest('.bullet, .pw-gen')) s += n.data;
  return s.replace(/[​]/g, '');
}
// Count the bullets and numbers of the paragraphs being typed in again, after Enter, a deleted line or a
// changed setting. before: the story's paragraphs shown in earlier linked boxes (they count on into this one).
export function relist(container, before = []) {
  const ps = [...container.querySelectorAll(':scope > p.para')];
  const props = ps.map((p) => ({ ...ppOf(p), cont: p.classList.contains('cont') }));
  // a line split from a list item that starts the numbers again: only the first of the two starts again
  props.forEach((pa, i) => { if (i && pa.numStart && ps[i].dataset.pp === ps[i - 1].dataset.pp) { delete pa.numStart; setParaProps(ps[i], { numStart: null }); } });
  const labels = listLabels([...before, ...props]).slice(before.length);
  ps.forEach((p, i) => {
    const lab = labels[i], pa = props[i], cur = [...p.querySelectorAll('.bullet')];
    if (!lab || pa.cont) { cur.forEach((b) => b.remove()); return; }
    let look = wordsLook(p);
    if (!look && i && ps[i - 1].firstChild?.classList?.contains('bullet')) { const s = ps[i - 1].firstChild.style; look = { fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.color }; }
    const probe = setMarker(document.createElement('p'), lab.text, pa, look);
    if (cur.length === 1 && p.firstChild === cur[0] && cur[0].outerHTML === probe.outerHTML) return;
    setMarker(p, lab.text, pa, look);
  });
  caretOffMarker(container);
}
// The caret (or the start of the selection) never stays before or inside a bullet or number: it goes to
// the start of the words, so what is typed there takes their style. True when it was moved.
export function caretOffMarker(container) {
  const sel = getSelection(); if (!sel.rangeCount) return false;
  const r = sel.getRangeAt(0), n = r.startContainer;
  // the paragraph the selection starts in (or right before: a selection of the whole box starts in the box)
  const p = n === container ? container.childNodes[r.startOffset] : (n.nodeType === 1 ? n : n.parentElement)?.closest('p.para'), b = p?.firstChild;
  if (!p?.classList?.contains('para') || p.parentElement !== container || !b?.classList?.contains('bullet')) return false;
  const after = document.createRange(); after.setStart(p, 1);
  if (r.compareBoundaryPoints(Range.START_TO_START, after) >= 0) return false; // already at or past the words
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (b.contains(t) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const t = w.nextNode(), c = document.createRange();
  if (t) c.setStart(t, 0); else c.setStart(p, 1);
  if (r.collapsed || r.comparePoint(c.startContainer, c.startOffset) > 0) c.collapse(true); else c.setEnd(r.endContainer, r.endOffset);
  sel.removeAllRanges(); sel.addRange(c);
  return true;
}
// is the caret at the very start of the paragraph's words?
function caretAtStart(p, r) {
  const pre = document.createRange(); pre.setStart(p, 0);
  try { pre.setEnd(r.startContainer, r.startOffset); } catch { return false; }
  const frag = pre.cloneContents(); frag.querySelectorAll('.bullet').forEach((b) => b.remove());
  return !frag.textContent.replace(/[​]/g, '');
}
// the list settings taken away; the words stay where they are (keepIndent) or go back to where the list starts
export function unlistPatch(pa, keepIndent = false) {
  const hang = pa.indentFirst < 0 ? -pa.indentFirst : 0;
  return { bullet: null, num: null, numSuffix: null, numStart: null, indentFirst: hang ? null : pa.indentFirst, indentLeft: keepIndent ? pa.indentLeft : Math.max(0, (pa.indentLeft || 0) - hang) || null };
}
// Enter on an empty list item ends the list (or, deeper in, moves the item one level out);
// Backspace at the start of an item's words takes its bullet or number away. True when handled.
export function listInput(e, container) {
  if (e.inputType !== 'insertParagraph' && e.inputType !== 'deleteContentBackward') return false;
  if (e.isComposing) return false;
  const sel = getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return false;
  const r = sel.getRangeAt(0), n = r.startContainer;
  const p = (n.nodeType === 1 ? n : n.parentElement)?.closest('p.para');
  if (!p || p.parentElement !== container) return false;
  const pa = ppOf(p); if (!pa.bullet && !pa.num) return false;
  if (e.inputType === 'insertParagraph') {
    if (wordsOf(p).trim()) return false; // the browser makes the next item
    const hang = pa.indentFirst < 0 ? -pa.indentFirst : 0;
    if ((pa.indentLeft || 0) > hang + 0.5) setParaProps(p, shiftPatch(pa, -1));
    else setParaProps(p, unlistPatch(pa));
  } else {
    if (p.classList.contains('cont') || !caretAtStart(p, r)) return false;
    setParaProps(p, unlistPatch(pa, true));
  }
  e.preventDefault();
  return true;
}
// one step in (dir 1) or out (-1); numbers one level deeper go 1, a, i, as in Word
const NEXT_NUM = { 1: 'a', a: 'i', i: '1', A: 'I', I: '1' }, PREV_NUM = { 1: 'i', a: '1', i: 'a', A: '1', I: 'A' };
export function shiftPatch(pa, dir) {
  const hang = pa.indentFirst < 0 ? -pa.indentFirst : 0, now = pa.indentLeft || 0;
  const left = Math.round(Math.max(hang, now + dir * LIST_STEP) * 100) / 100, patch = { indentLeft: left || null };
  if (pa.num && left !== now) patch.num = (dir > 0 ? NEXT_NUM : PREV_NUM)[pa.num] || pa.num;
  return patch;
}
// Tab at the start of a list item's words (or with several list items selected) moves the items one level in;
// Shift+Tab one level out. ed: the editor. True when handled (then the Tab is not typed).
// (to be called from the editor's key handling, before a Tab is typed)
export function listTab(ed, back = false) {
  const cur = ed?.editing; if (!cur) return false;
  const sel = getSelection(); if (!sel.rangeCount) return false;
  const r = sel.getRangeAt(0), ps = parasInRange(cur.container, r).filter((p) => !p.classList.contains('cont'));
  if (!ps.length || !ps.every((p) => { const pa = ppOf(p); return pa.bullet || pa.num; })) return false;
  if (r.collapsed && !caretAtStart(ps[0], r)) return false;
  for (const p of ps) setParaProps(p, shiftPatch(ppOf(p), back ? -1 : 1));
  const first = cur.container.querySelector(':scope > p.para');
  relist(cur.container, cur.cell ? [] : (cur.item.paras || []).slice(0, first ? +first.dataset.pi || 0 : 0));
  cur.fitCheck?.(); ed.flushSoon?.(); ed.saveRange?.(); ed.app?.panel?.refreshText?.();
  return true;
}
