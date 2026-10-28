// Shared by "Find and replace" and the spelling check: the document's text as a list of stories (a text box,
// a table cell, or one story running through linked boxes), replacing words while keeping their formatting,
// and picking + marking on the page the place where a word is.
import { clone } from '../model.js';

// Every story in page order: { key, pageIndex, unitId (the top-level item you pick), item, cell, paras }
export function stories(doc) {
  const out = [], chains = new Set();
  doc.pages.forEach((pg, pageIndex) => {
    const walk = (items, unitId) => {
      for (const it of items) {
        const unit = unitId || it.id;
        if (it.type === 'group') walk(it.items || [], unit);
        else if (it.type === 'text' && it.paras) {
          if (it.chain) { if (chains.has(it.chain)) continue; chains.add(it.chain); } // linked boxes: one story
          out.push({ key: it.chain ? `chain:${it.chain}` : it.id, pageIndex, unitId: unit, item: it, cell: null, paras: it.paras });
        } else if (it.type === 'table') {
          (it.rows || []).forEach((row, ri) => row.cells.forEach((c, ci) => {
            if (!c.covered && c.paras) out.push({ key: `${it.id}:${ri}:${ci}`, pageIndex, unitId: unit, item: it, cell: c, paras: c.paras });
          }));
        }
      }
    };
    walk(pg.items, null);
  });
  return out;
}

// all boxes of a chain of linked text boxes, in order
export function chainBoxes(doc, chain) {
  const out = [];
  doc.pages.forEach((pg, pageIndex) => {
    const walk = (items, unitId) => { for (const it of items) { if (it.type === 'group') walk(it.items || [], unitId || it.id); else if (it.chain === chain) out.push({ it, pageIndex, unitId: unitId || it.id }); } };
    walk(pg.items, null);
  });
  return out.sort((a, b) => a.it.chainIndex - b.it.chainIndex);
}

export const paraText = (pa) => pa.runs.map((r) => r.text || '').join('');

// the run (and so the language) at a character of a paragraph
export function runAt(pa, pos) {
  let at = 0;
  for (const r of pa.runs) { const n = (r.text || '').length; if (pos < at + n) return r; at += n; }
  return pa.runs[pa.runs.length - 1] || null;
}

// Replace characters start..end of a paragraph with text. The new words get the formatting of the run where
// the old words began; runs that only held the old words go away.
export function replaceRange(pa, start, end, text) {
  const out = []; let pos = 0, done = false;
  for (const r of pa.runs) {
    const s = r.text || '', a = pos, b = pos + s.length; pos = b;
    if (!s.length || b <= start || a >= end) { out.push(r); continue; } // not part of the old words
    if (!done) { out.push({ ...r, text: s.slice(0, Math.max(0, start - a)) + text + (end < b ? s.slice(end - a) : '') }); done = true; } else if (end < b) out.push({ ...r, text: s.slice(end - a) });
  }
  const kept = out.filter((r) => r.text);
  pa.runs = kept.length ? kept : out.slice(0, 1).map((r) => ({ ...r, text: '' }));
}

// Change the document: edits = [{ key, p, start, end, text }] (positions of the text before the change).
// One undo step; linked boxes all get the same new story. Returns how many were changed.
export function applyEdits(app, label, edits) {
  if (!edits.length) return 0;
  const byKey = new Map(); for (const e of edits) { if (!byKey.has(e.key)) byKey.set(e.key, []); byKey.get(e.key).push(e); }
  const all = new Map(stories(app.doc).map((s) => [s.key, s]));
  const boxesOf = (st) => (st.item.chain ? chainBoxes(app.doc, st.item.chain) : [{ it: st.item, pageIndex: st.pageIndex }]);
  const pages = new Set([...byKey.keys()].flatMap((key) => (all.has(key) ? boxesOf(all.get(key)).map((b) => b.pageIndex) : [])));
  app.editor.change(label, () => {
    for (const [key, list] of byKey) {
      const st = all.get(key); if (!st) continue;
      // from the end backwards, so earlier positions stay right
      list.sort((x, y) => y.p - x.p || y.start - x.start);
      for (const e of list) { const pa = st.paras[e.p]; if (pa) replaceRange(pa, e.start, e.end, e.text); }
      for (const b of boxesOf(st)) if (b.it.paras !== st.paras) b.it.paras = clone(st.paras); // linked boxes: same story
    }
  }, [...pages]);
  return edits.length;
}

// ---------------------------------------------------------------- showing a place on the page
// characters of a rendered paragraph in order (the bullet is not part of the text)
function textNodes(pEl) {
  const nodes = [], w = document.createTreeWalker(pEl, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('.bullet') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  let n, total = 0; while ((n = w.nextNode())) { nodes.push([n, total]); total += n.length; }
  return { nodes, total };
}
// where on screen story st shows paragraph p, character start: { pageIndex, unitId, node, pEl, c0 }
function locate(app, st, p, start) {
  const boxes = st.item.chain ? chainBoxes(app.doc, st.item.chain) : [{ it: st.item, pageIndex: st.pageIndex, unitId: st.unitId }];
  let last = null;
  for (const b of boxes) {
    const node = app.pageEls?.[b.pageIndex]?.querySelector(`:scope > [data-id="${b.it.id}"]`);
    if (!node) continue;
    last = { ...b, node };
    const scope = st.cell ? [...node.querySelectorAll('td')].find((td) => td.__cell === st.cell) : node;
    for (const pEl of scope?.querySelectorAll(`p.para[data-pi="${p}"]`) || []) {
      const c0 = +pEl.dataset.c0 || 0, { total } = textNodes(pEl);
      if (start >= c0 && start < c0 + Math.max(total, 1)) return { ...b, node, pEl, c0 };
    }
  }
  return last || { pageIndex: st.pageIndex, unitId: st.unitId };
}

export function clearMarks() { document.querySelectorAll('.pw-ui.pw-hit').forEach((n) => n.remove()); }

// Select the item that holds the words, scroll to them and mark them with a yellow highlight
export async function showPlace(app, st, p, start, end) {
  clearMarks();
  let at = locate(app, st, p, start);
  app.editor.select([at.unitId], at.pageIndex);
  // pages are drawn again once fonts are in; mark the words after that
  try { await app.settled; } catch { /* drawing problems are shown elsewhere */ }
  at = locate(app, st, p, start);
  const pageEl = app.pageEls?.[at.pageIndex];
  if (!pageEl) return;
  (at.pEl || at.node || pageEl).scrollIntoView({ block: 'center', inline: 'nearest' });
  if (!at.pEl) return;
  const { nodes, total } = textNodes(at.pEl);
  const from = Math.max(0, start - at.c0), to = Math.min(total, end - at.c0);
  if (to <= from || !nodes.length) return;
  const r = document.createRange();
  const put = (i, setter) => { let j = nodes.length - 1; while (j > 0 && nodes[j][1] > i) j--; const [n, o] = nodes[j]; setter.call(r, n, Math.min(i - o, n.length)); };
  put(from, r.setStart); put(to, r.setEnd);
  const pr = pageEl.getBoundingClientRect(), k = (pageEl.__page?.w || pr.width) / pr.width;
  for (const q of r.getClientRects()) {
    if (!q.width) continue;
    const m = document.createElement('div'); m.className = 'pw-ui pw-hit';
    Object.assign(m.style, { left: `${(q.left - pr.left) * k - 1}pt`, top: `${(q.top - pr.top) * k}pt`, width: `${q.width * k + 2}pt`, height: `${q.height * k}pt` });
    pageEl.appendChild(m);
  }
}

// a short bit of text around a word, for showing it in its sentence: [before, word, after]
export function context(text, start, end, room = 70) {
  let a = start, cutA = false, b = end, cutB = false;
  while (a > 0) { if (start - a >= room) { cutA = true; break; } if (/\s/.test(text[a - 1]) && /[.!?…]/.test(text[a - 2] || '')) break; a--; }
  while (b < text.length) { if (b - end >= room) { cutB = true; break; } b++; if (/[.!?…]/.test(text[b - 1]) && (b >= text.length || /\s/.test(text[b]))) break; }
  if (cutA) { const sp = text.slice(a, start).search(/\s/); if (sp >= 0) a += sp + 1; } // never start or end mid-word
  if (cutB) { const sp = text.slice(end, b).search(/\s\S*$/); if (sp > 0) b = end + sp; }
  const tidy = (x) => x.replace(/\s+/g, ' ');
  return [(cutA ? '…' : '') + tidy(text.slice(a, start)), text.slice(start, end), tidy(text.slice(end, b)) + (cutB ? '…' : '')];
}

// put the panels of this family (find, spelling) at the same place; only one shows at a time
export function makePanel(id, titleKey, t) {
  for (const other of document.querySelectorAll('.panel.pw-tool')) if (other.id !== id) { other.hidden = true; other.dispatchEvent(new Event('pw-closed')); }
  let el = document.getElementById(id);
  if (el) return { el, fresh: false };
  el = document.createElement('div'); el.id = id; el.className = 'panel pw-tool'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', `${id}Title`);
  el.innerHTML = `<div class="pw-head"><h2 id="${id}Title">${t(titleKey)}</h2><button type="button" class="pw-x" data-close aria-label="${t('find.close')}" title="${t('find.close')}">×</button></div><div class="pw-body"></div>`;
  document.body.appendChild(el);
  return { el, fresh: true };
}

export const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
