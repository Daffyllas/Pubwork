// A small window over the page for a few questions (rows and columns, chart data …), in the look of the
// other panels. openDialog() -> the panel element; onOk(el) closes it unless it returns false.
import { t } from '../i18n/index.js';
import './pics.css';

let open = null;
export function closeDialog() { if (open) { open.remove(); open = null; document.removeEventListener('keydown', onKey, true); } }
function onKey(e) {
  if (!open) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDialog(); return; }
  // Enter in a field presses the main button (in a box of several lines: Ctrl+Enter; on a button: that button)
  if (e.key !== 'Enter' || e.isComposing || e.shiftKey || e.altKey || !open.contains(e.target)) return;
  const tag = e.target.tagName;
  if (tag === 'BUTTON' || tag === 'A' || (tag === 'TEXTAREA' && !(e.ctrlKey || e.metaKey))) return;
  if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) && e.target !== open) return;
  e.preventDefault(); e.stopPropagation();
  open.querySelector('[data-dlg="ok"]')?.click();
}

export function openDialog({ title, body, okLabel, onOk, wire, wide = false }) {
  closeDialog();
  const el = document.createElement('div');
  el.className = 'panel pw-dlg' + (wide ? ' wide' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-label', title);
  el.innerHTML = `<h2>${esc(title)}</h2>${body}
    <div class="actions"><button class="btn" data-dlg="cancel">${esc(t('pics.cancel'))}</button><button class="btn primary" data-dlg="ok">${esc(okLabel)}</button></div>`;
  document.body.appendChild(el); open = el;
  document.addEventListener('keydown', onKey, true);
  el.querySelector('[data-dlg="cancel"]').addEventListener('click', closeDialog);
  el.querySelector('[data-dlg="ok"]').addEventListener('click', async () => { if ((await onOk(el)) !== false) closeDialog(); });
  wire?.(el);
  el.querySelector('input, textarea, select, button')?.focus();
  return el;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ask for a file of the given kinds -> File or null
export function pickFile(accept) {
  return new Promise((res) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
    inp.addEventListener('change', () => { res(inp.files[0] || null); inp.remove(); });
    document.body.appendChild(inp); inp.click();
  });
}
