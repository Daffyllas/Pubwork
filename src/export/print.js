// Printing. The pages are first made into a PDF at their own size (pdf.js), then placed on sheets of
// paper: one per sheet, several copies per sheet, on a sheet of labels, as a folded booklet or card, or
// as a poster in pieces. For a print shop, a page can get 3 mm of bleed and crop marks, and the colours
// can be turned into printing inks (CMYK). All sizes are in points (1/72 inch).
import { PDFDocument, StandardFonts, cmyk, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath } from 'pdf-lib';
import { buildPdf } from './pdf.js';
import { safeName } from './stage.js';
import { MM, IN, isUS, layoutSheet, sheetPlan, posterLayout } from './layout.js';
import { t } from '../i18n/index.js';

export const MAX_POSTER_SHEETS = 500;
const BLACK = cmyk(0, 0, 0, 1), GREY = cmyk(0, 0, 0, 0.55);
// the built-in PDF font only knows Western European letters
const winAnsi = (s) => String(s).replace(/[^\x20-\x7e\xa0-\xff·–—‘’“”•…]/g, '?');

// a page drawn on a sheet, turned as the slot says (rot 1: 90°, rot 2: 180°); b = bleed around the page
function drawSlot(sheet, e, sl, H, b) {
  if (sl.rot === 1) sheet.drawPage(e, { x: sl.x + sl.w + b, y: H - sl.y - sl.h - b, xScale: sl.scale, yScale: sl.scale, rotate: degrees(90) });
  else if (sl.rot === 2) sheet.drawPage(e, { x: sl.x + sl.w + b, y: H - sl.y + b, xScale: sl.scale, yScale: sl.scale, rotate: degrees(180) });
  else sheet.drawPage(e, { x: sl.x - b, y: H - sl.y - sl.h - b, xScale: sl.scale, yScale: sl.scale });
}

// One poster page in pieces: each sheet shows its part of the picture inside a white edge, with marks
// for cutting and glueing, and says where it goes ("Row 1, column 2") with a little map of all sheets.
async function posterSheets(out, e, page, o, font, label) {
  const P = posterLayout(page, o), m = P.edge, ov = P.overlap, s = P.scale;
  const tick = (sheet, H, x1, y1, x2, y2, dashed) => sheet.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: 0.4, color: dashed ? GREY : BLACK, ...(dashed ? { dashArray: [2, 1.5] } : {}) });
  const total = P.tiles.length;
  for (const [n, T] of P.tiles.entries()) {
    const sheet = out.addPage([P.sheet.w, P.sheet.h]), W = P.sheet.w, H = P.sheet.h;
    // the piece of the poster, clipped to its place on the sheet
    sheet.pushOperators(pushGraphicsState(), rectangle(m, H - m - T.h, T.w, T.h), clip(), endPath());
    sheet.drawPage(e, { x: m - T.x0, y: H - m + T.y0 - P.size.h, xScale: s, yScale: s });
    sheet.pushOperators(popGraphicsState());
    // where to cut: the left and top edges always (the white edge goes), right and bottom at the poster's end
    const xL = m, yT = m, xR = m + T.w, yB = m + T.h, a = 1 * MM, z = m - 1.5 * MM;
    const vTicks = (x, dashed) => { tick(sheet, H, x, a, x, z, dashed); tick(sheet, H, x, H - z, x, H - a - 3 * MM, dashed); };
    const hTicks = (y, dashed) => { tick(sheet, H, a, y, z, y, dashed); tick(sheet, H, W - z, y, W - a, y, dashed); };
    vTicks(xL); hTicks(yT);
    if (T.c === P.cols - 1) vTicks(xR); else { vTicks(m + P.aw - ov, true); sheet.drawText(winAnsi(t('print.posterGlue')), { x: m + P.aw - ov + 1.2, y: H - m + 2.2 * MM, size: 5.5, font, color: GREY }); }
    if (T.r === P.rows - 1) hTicks(yB); else { hTicks(m + P.ah - ov, true); sheet.drawText(winAnsi(t('print.posterGlue')), { x: m - 2.2 * MM, y: H - (m + P.ah - ov) - 1.2, size: 5.5, font, color: GREY, rotate: degrees(-90) }); }
    // the label at the bottom, and a small map of all the sheets with this one filled in
    const text = winAnsi(`${label ? `${label} · ` : ''}${t('print.posterSheet', { r: T.r + 1, c: T.c + 1, n: n + 1, total })}`);
    const ty = (m - 2.2 * MM) / 2 + 0.5;
    sheet.drawText(text, { x: m + 3 * MM, y: ty, size: 6.5, font, color: BLACK });
    const cell = Math.min(2.2 * MM, (m - 3 * MM) / P.rows, (W / 3) / P.cols), mx = m + 3 * MM + font.widthOfTextAtSize(text, 6.5) + 3 * MM, my = (m - cell * P.rows) / 2;
    if (mx + cell * P.cols < W - m - 4 * MM) for (let r = 0; r < P.rows; r++) for (let c = 0; c < P.cols; c++) {
      sheet.drawRectangle({ x: mx + c * cell, y: my + (P.rows - 1 - r) * cell, width: cell, height: cell, borderWidth: 0.3, borderColor: BLACK, color: r === T.r && c === T.c ? BLACK : undefined });
    }
  }
  return total;
}

// -> { name, blob, bytes, report, sheets }
export async function makePrintPdf(doc, pageEls, o, { embeddedFonts, onProgress } = {}) {
  const indices = o.pages || doc.pages.map((_, i) => i);
  const page0 = doc.pages[indices[0]];
  const one = o.layout === 'one' && (!o.paper || o.paper === 'page') && !o.bleed && !o.marks;
  const bleedPt = o.layout === 'one' && (!o.paper || o.paper === 'page') && o.bleed ? (isUS(page0) ? IN / 8 : 3 * MM) : 0;
  const { pdf: base, report } = await buildPdf(doc, pageEls, { pages: indices, embeddedFonts, onProgress, bleed: bleedPt });
  const kind = t(`printfile.${{ booklet: 'booklet', poster: 'poster', card2: 'card', card4: 'card' }[o.layout] || 'print'}`);
  const name = `${safeName(doc.name)}${o.layout === 'one' ? '' : ` (${kind})`}${o.cmyk ? ' (CMYK)' : ''}.pdf`;
  const finish = async (pdf, sheets) => {
    let bytes = await pdf.save({ useObjectStreams: true });
    if (o.cmyk) bytes = (await (await import('./cmyk.js')).cmykPdf(bytes)).bytes;
    return { name, bytes, blob: new Blob([bytes], { type: 'application/pdf' }), report, sheets };
  };
  if (one) return finish(base, indices.length);
  // pages are copied out of the finished PDF, so its fonts are complete
  const src = await PDFDocument.load(await base.save());
  const out = await PDFDocument.create();
  out.setTitle(doc.name || 'Document'); out.setCreator('Pubwork'); out.setProducer('Pubwork');
  const cache = new Map();
  const embed = async (k) => {
    if (!cache.has(k)) {
      const pg = doc.pages[indices[k]], b = bleedPt;
      cache.set(k, out.embedPage(src.getPage(k), { left: -b, bottom: -b, right: pg.w + b, top: pg.h + b }));
    }
    return cache.get(k);
  };
  if (o.layout === 'poster') {
    const font = await out.embedFont(StandardFonts.Helvetica);
    let sheets = 0;
    for (let k = 0; k < indices.length; k++) {
      const label = indices.length > 1 ? t('thumb.page', { n: indices[k] + 1 }) : '';
      sheets += await posterSheets(out, await embed(k), doc.pages[indices[k]], o, font, label);
    }
    return finish(out, sheets);
  }
  const plan = sheetPlan(indices.map((_, k) => k), o, layoutSheet(page0, o).count);
  const each = o.layout === 'booklet' || o.sequence || o.layout === 'card2' || o.layout === 'card4';
  for (const onSheet of plan) {
    const k0 = onSheet.find((k) => k != null) ?? 0;
    const L = layoutSheet(doc.pages[indices[k0]], o);
    const sheet = out.addPage([L.sheet.w, L.sheet.h]);
    const H = L.sheet.h;
    const slots = onSheet.side === 'in' ? L.inside : L.slots;
    for (let si = 0; si < slots.length; si++) {
      const k = each ? onSheet[si] : onSheet[0];
      if (k == null) continue;
      const sl = slots[si];
      drawSlot(sheet, await embed(k), sl, H, bleedPt * sl.scale);
    }
    for (const [x1, y1, x2, y2] of L.marks) sheet.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: 0.3, color: cmyk(0, 0, 0, 1) });
    if (L.trim) {
      const tb = L.trim;
      sheet.setTrimBox(tb.x, H - tb.y - tb.h, tb.w, tb.h);
      sheet.setBleedBox(tb.x - L.bleed, H - tb.y - tb.h - L.bleed, tb.w + 2 * L.bleed, tb.h + 2 * L.bleed);
    }
  }
  return finish(out, plan.length);
}

// Opens the browser's print window for a PDF. -> 'printing' | 'opened' | 'failed'
// Desktop Chrome, Edge and Firefox print a PDF from a hidden frame; Safari and phones show the PDF instead.
export async function printPdf(blob) {
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  if (!mobile && !safari) {
    try {
      const fr = document.createElement('iframe');
      fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      Object.assign(fr.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0' });
      const loaded = new Promise((res, rej) => { fr.onload = res; setTimeout(() => rej(new Error('timeout')), 15000); });
      fr.src = url; document.body.appendChild(fr);
      await loaded;
      await new Promise((r) => setTimeout(r, 400)); // the PDF viewer inside the frame needs a moment
      fr.contentWindow.focus(); fr.contentWindow.print();
      setTimeout(() => fr.remove(), 5 * 60 * 1000);
      return 'printing';
    } catch { /* fall through to showing the PDF */ }
  }
  const w = window.open(url, '_blank');
  return w ? 'opened' : 'failed';
}
