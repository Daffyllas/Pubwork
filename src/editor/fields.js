// Fields in text that fill themselves in: page number, number of pages, today's date.
// While typing, the field goes in at the caret; otherwise a small text box with it is put at the
// bottom centre of the page. A field is a run with `field: 'page'|'pages'|'date'` (its text is a
// placeholder); render.js shows the real value for the page being drawn.
import { fieldText } from '../render.js';
import { t } from '../i18n/index.js';

const PLACEHOLDER = '#';

export function insertField(app, kind) {
  if (!app.doc || !['page', 'pages', 'date'].includes(kind)) return;
  const ed = app.editor;
  const shown = { pageNumber: ed.pageIndex + 1, pageCount: app.doc.pages.length };
  if (ed.editing) {
    const { container } = ed.editing;
    let r = ed.restoreRange();
    if (!r || !container.contains(r.startContainer)) { r = document.createRange(); r.selectNodeContents(container.querySelector('p.para:last-of-type') || container); r.collapse(false); }
    const span = document.createElement('span');
    span.dataset.field = kind; span.dataset.ph = PLACEHOLDER; span.dataset.len = PLACEHOLDER.length; span.contentEditable = 'false';
    span.textContent = fieldText(kind, shown);
    r.deleteContents();
    // never inside another field or a tab
    const host = (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer).closest?.('[data-field], .tab');
    if (host && container.contains(host)) r.setStartAfter(host);
    r.insertNode(span);
    // an invisible character after the field keeps the next words in the same style (it is not saved)
    const keep = document.createTextNode('\u200b'); span.after(keep);
    const after = document.createRange(); after.setStart(keep, 1); after.collapse(true);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(after);
    ed.saveRange();
    container.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // not typing: a little box at the bottom centre of the page
  const pg = app.targetPage();
  const runs = pg.items.flatMap((it) => (it.type === 'text' ? it.paras.flatMap((p) => p.runs) : []));
  const font = runs.find((r) => r.font)?.font || 'Arial';
  const w = kind === 'date' ? 180 : 110, h = 22;
  ed.add({ type: 'text', x: (pg.w - w) / 2, y: pg.h - Math.min(54, pg.h * 0.06) - h, w, h, pad: [3.6, 3.6, 3.6, 3.6], valign: 'top', columns: 1, columnGap: 0,
    edited: true, autoGrow: true, fill: null, stroke: null,
    paras: [{ align: 'center', runs: [{ text: PLACEHOLDER, font, size: 10, field: kind }] }] });
  app.toast(t('tx.fieldAdded'), 2500);
}
