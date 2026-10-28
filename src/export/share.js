// Share the document (as a PDF) through the device's own share sheet: on phones, tablets and some
// computers that offers e-mail, WhatsApp, Messages and so on. Where the browser can't share files, a
// small window explains the other way: save it as a PDF and attach that.
import { t } from '../i18n/index.js';
import { embeddedFontBytes } from '../fonts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function canShareFiles() {
  try { return !!navigator.canShare?.({ files: [new File(['%PDF-1.7'], 'test.pdf', { type: 'application/pdf' })] }); } catch { return false; }
}

export async function share(app) {
  if (!app.doc) return;
  if (app.editor?.editing) app.editor.endEdit();
  if (!canShareFiles()) { openPanel(app, 'help'); return; }
  let file;
  app.busy(true, t('share.making'));
  try {
    await app.settled;
    const { exportPdf } = await import('./pdf.js');
    const out = await exportPdf(app.doc, app.pageEls, { embeddedFonts: embeddedFontBytes });
    file = new File([out.blob], out.name, { type: 'application/pdf' });
  } catch (err) {
    console.error(err); app.toast(t('err.save', { why: err?.message || String(err) }), 9000); return;
  } finally { app.busy(false); }
  if (!navigator.canShare({ files: [file] })) { openPanel(app, 'help'); return; }
  await shareFile(app, file, false);
}

async function shareFile(app, file, secondTry) {
  try {
    await navigator.share({ files: [file], title: app.doc?.name || file.name });
    closePanel();
  } catch (err) {
    if (err?.name === 'AbortError') { closePanel(); return; } // the person closed the share sheet
    // making the PDF took a while, and browsers only share straight after a tap: ask for one more tap
    if (err?.name === 'NotAllowedError' && !secondTry) { openPanel(app, 'ready', file); return; }
    openPanel(app, 'help');
  }
}

// ------------------------------------------------------------------ the small window
let panel = null;
function closePanel() { if (panel) panel.hidden = true; }

function openPanel(app, mode, file = null) {
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'panel'; panel.id = 'sharePanel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'shareTitle');
    document.body.appendChild(panel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
    document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && !document.getElementById('busy')?.contains(e.target)) closePanel(); });
  }
  const ready = mode === 'ready';
  panel.innerHTML = `<h2 id="shareTitle">${esc(t(ready ? 'share.readyTitle' : 'share.title'))}</h2>`
    + (ready ? `<p class="hint">${esc(t('share.readyText'))}</p>`
      : `<p class="hint">${esc(t('share.cant'))}</p><ol class="hint" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px"><li>${esc(t('share.step1'))}</li><li>${esc(t('share.step2'))}</li><li>${esc(t('share.step3'))}</li></ol>`)
    + `<div class="actions"><button class="btn" id="shareClose">${esc(t('share.close'))}</button><button class="btn primary" id="shareGo">${esc(t(ready ? 'share.go' : 'share.savePdf'))}</button></div>`;
  panel.querySelector('#shareClose').onclick = closePanel;
  panel.querySelector('#shareGo').onclick = () => {
    if (ready) { shareFile(app, file, true); return; }
    closePanel(); app.save({ format: 'pdf', size: 'print', pages: null });
  };
  panel.hidden = false;
  panel.querySelector('#shareGo').focus({ preventScroll: true });
}
