// Take to a print shop (Publisher's Pack and Go): one .zip with the print-ready PDF (bleed, crop marks,
// print-shop colours), the Pubwork file so the shop can still make changes, the list of fonts and a
// short "Read me" with the page size, the bleed and the number of pages.
import { zipSync, strToU8 } from 'fflate';
import { t } from '../i18n/index.js';
import { download, safeName } from './stage.js';
import { MM, isUS } from './layout.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// the small window: what goes in the package, and one button
export async function packAndGo(app) {
  if (!app.doc) return;
  if (app.editor?.editing) app.editor.endEdit();
  let panel = $('packPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'packPanel'; panel.className = 'panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'packTitle');
    document.body.appendChild(panel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) panel.hidden = true; });
  }
  panel.innerHTML = `<h2 id="packTitle">${esc(t('pack.title'))}</h2>
    <p class="hint">${esc(t('pack.intro'))}</p>
    <ul class="hint" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>${esc(t('pack.itemPdf'))}</li><li>${esc(t('pack.itemFile'))}</li><li>${esc(t('pack.itemFonts'))}</li><li>${esc(t('pack.itemReadme'))}</li>
    </ul>
    <div class="actions"><button class="btn" id="packCancel">${esc(t('save.cancel'))}</button><button class="btn primary" id="packGo">${esc(t('pack.go'))}</button></div>`;
  panel.hidden = false;
  $('packCancel').onclick = () => { panel.hidden = true; };
  $('packGo').onclick = () => { panel.hidden = true; makePackage(app); };
  $('packGo').focus({ preventScroll: true });
}

const fmt = (v) => +v.toFixed(1);
function sizeText(pg) {
  return `${fmt(pg.w / MM)} × ${fmt(pg.h / MM)} mm (${+(pg.w / 72).toFixed(2)} × ${+(pg.h / 72).toFixed(2)} in)`;
}

export async function makePackage(app) {
  if (app.saving) return;
  app.saving = true;
  const doc = app.doc, total = app.pageEls.length;
  const progress = (k, n) => app.busy(true, k >= n ? t('busy.finishing') : t('busy.page', { n: k + 1, total: n }));
  progress(0, total);
  try {
    await app.settled;
    const [{ makePrintPdf }, { toPubwork }, fonts] = await Promise.all([import('./print.js'), import('../editor/file.js'), import('../fonts.js')]);
    const o = { layout: 'one', paper: 'page', bleed: true, marks: true, cmyk: true };
    const pdf = await makePrintPdf(doc, app.pageEls, o, { embeddedFonts: fonts.embeddedFontBytes, onProgress: progress });
    const base = safeName(doc.name);
    const used = await fonts.fontReport(doc, app.embedded || new Map()).catch(() => []);
    const pg = doc.pages[0], us = isUS(pg);
    const sizes = [...new Set(doc.pages.map((p) => sizeText(p)))];
    const fontLines = used.length
      ? used.map((f) => `- ${f.original}${f.embedded ? ` (${t('pack.fontInFile')})` : f.standIn && f.standIn !== f.original && !f.installed ? ` (${t('pack.fontShownWith', { font: f.standIn })})` : ''}`).join('\n')
      : `- ${t('pack.noFonts')}`;
    const readme = [
      t('pack.readmeTitle', { name: doc.name || base }),
      '',
      `${t('pack.readmeSize')}: ${sizes.join(', ')} ${sizes.length === 1 ? `(${app.sizeName(pg)})` : ''}`.trim(),
      `${t('pack.readmePages')}: ${doc.pages.length}`,
      `${t('pack.readmeBleed')}: ${us ? '1/8 in (3.2 mm)' : '3 mm'} ${t('pack.readmeBleedHow')}`,
      `${t('pack.readmeColours')}`,
      '',
      t('pack.readmeFiles'),
      `- ${pdf.name}: ${t('pack.readmePdf')}`,
      `- ${base}.pubwork: ${t('pack.readmeFile')}`,
      `- ${t('pack.fontsFile')}.txt: ${t('pack.readmeFonts')}`,
      '',
      t('pack.readmeMade', { date: new Date().toISOString().slice(0, 10) }),
    ].join('\r\n');
    const fontsTxt = `${t('pack.fontsTitle', { name: doc.name || base })}\r\n\r\n${fontLines.replace(/\n/g, '\r\n')}\r\n`;
    const files = {
      [pdf.name]: [pdf.bytes, { level: 0 }],
      [`${base}.pubwork`]: [new Uint8Array(await toPubwork(doc).arrayBuffer()), { level: 0 }],
      [`${t('pack.fontsFile')}.txt`]: strToU8(fontsTxt),
      [`${t('pack.readmeName')}.txt`]: strToU8(readme),
    };
    const blob = new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
    const name = `${base} (${t('pack.zipName')}).zip`;
    window.__lastPack = { name, blob, readme, fontsTxt };
    app.busy(false);
    const how = await download(blob, name);
    if (how === 'saved') app.toast(t('pack.done', { name }), 9000);
    else if (how === 'blocked') app.toast(t('save.blocked'), 9000);
  } catch (err) {
    console.error(err);
    app.toast(t('err.save', { why: err?.message || String(err) }), 9000);
  } finally { app.saving = false; app.busy(false); }
}
