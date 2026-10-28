// Colour separations (a proof): for every page, the page itself and then one page per printing ink
// (cyan, magenta, yellow, black), each shown in grey: the darker, the more of that ink. Useful to see
// what a print shop will print on each plate, e.g. that black text uses black ink only.
// The pages are drawn as the browser shows them (pageCanvas), turned into inks pixel by pixel.
import { PDFDocument, PDFRawStream, StandardFonts, cmyk, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } from 'pdf-lib';
import { zlibSync } from 'fflate';
import { buildPdf } from './pdf.js';
import { stagePages, safeName } from './stage.js';
import { pageCanvas } from './images.js';
import { convertDocument } from './cmyk.js';
import { MM } from './layout.js';
import { t } from '../i18n/index.js';

const INKS = [
  { key: 'print.sepCyan', color: cmyk(1, 0, 0, 0) },
  { key: 'print.sepMagenta', color: cmyk(0, 1, 0, 0) },
  { key: 'print.sepYellow', color: cmyk(0, 0, 1, 0) },
  { key: 'print.sepBlack', color: cmyk(0, 0, 0, 1) },
];
const STRIP = 12 * MM; // the label strip under each page
const winAnsi = (s) => String(s).replace(/[^\x20-\x7e\xa0-\xff·–—‘’“”•…]/g, '?');

// a canvas -> 4 grey pictures (one byte per pixel; white = no ink), with the same simple conversion as cmyk.js
function splitInks(canvas) {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const plates = [0, 1, 2, 3].map(() => new Uint8Array(w * h));
  const [C, M, Y, K] = plates;
  for (let i = 0, j = 0; j < w * h; i += 4, j++) {
    const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b);
    // ink amounts from 0 to 255; grey value = 255 - ink
    K[j] = mx;
    if (mx === 0) { C[j] = M[j] = Y[j] = 255; continue; }
    C[j] = 255 - Math.round((255 * (mx - r)) / mx);
    M[j] = 255 - Math.round((255 * (mx - g)) / mx);
    Y[j] = 255 - Math.round((255 * (mx - b)) / mx);
  }
  return plates;
}

// -> { name, blob, bytes, report, sheets }
export async function makeSeparations(doc, pageEls, o = {}, { embeddedFonts, onProgress = () => {} } = {}) {
  const indices = o.pages || doc.pages.map((_, i) => i);
  // the pages themselves, sharp, with print-shop colours
  const { pdf: base, report } = await buildPdf(doc, pageEls, { pages: indices, embeddedFonts });
  convertDocument(base);
  const src = await PDFDocument.load(await base.save());
  const out = await PDFDocument.create();
  out.setTitle(`${doc.name || 'Document'} – ${t('printfile.seps')}`); out.setCreator('Pubwork'); out.setProducer('Pubwork');
  const font = await out.embedFont(StandardFonts.Helvetica), bold = await out.embedFont(StandardFonts.HelveticaBold);
  const label = (sheet, w, title, sub, swatch) => {
    const y = STRIP / 2 - 3;
    let x = 8 * MM;
    if (swatch) { sheet.drawRectangle({ x, y: y - 1, width: 9, height: 9, color: swatch, borderColor: cmyk(0, 0, 0, 0.5), borderWidth: 0.3 }); x += 13; }
    sheet.drawText(winAnsi(title), { x, y, size: 10, font: bold, color: cmyk(0, 0, 0, 1) });
    sheet.drawText(winAnsi(sub), { x: x + bold.widthOfTextAtSize(winAnsi(title), 10) + 8, y, size: 8, font, color: cmyk(0, 0, 0, 0.6) });
    sheet.drawLine({ start: { x: 0, y: STRIP }, end: { x: w, y: STRIP }, thickness: 0.5, color: cmyk(0, 0, 0, 0.35) });
  };
  const stage = await stagePages(indices.map((i) => pageEls[i]));
  try {
    for (let k = 0; k < indices.length; k++) {
      onProgress(k, indices.length);
      const pg = doc.pages[indices[k]], W = pg.w, H = pg.h + STRIP;
      const pageNo = t('thumb.page', { n: indices[k] + 1 });
      // 1. the page with all inks
      const all = out.addPage([W, H]);
      all.drawPage(await out.embedPage(src.getPage(k)), { x: 0, y: STRIP });
      label(all, W, t('print.sepAll'), pageNo, null);
      // 2-5. one page per ink
      const canvas = await pageCanvas(stage.pages[k], { dpi: 150 });
      const plates = splitInks(canvas);
      const iw = canvas.width, ih = canvas.height;
      canvas.width = canvas.height = 0;
      plates.forEach((bytes, n) => {
        const sheet = out.addPage([W, H]);
        const img = PDFRawStream.of(out.context.obj({ Type: 'XObject', Subtype: 'Image', Width: iw, Height: ih, ColorSpace: 'DeviceGray', BitsPerComponent: 8, Filter: 'FlateDecode' }), zlibSync(bytes, { level: 6 }));
        const name = sheet.node.newXObject('Plate', out.context.register(img));
        sheet.pushOperators(pushGraphicsState(), concatTransformationMatrix(W, 0, 0, pg.h, 0, STRIP), drawObject(name), popGraphicsState());
        label(sheet, W, t(INKS[n].key), pageNo, INKS[n].color);
      });
    }
  } finally { stage.done(); }
  onProgress(indices.length, indices.length);
  const bytes = await out.save({ useObjectStreams: true });
  return { name: `${safeName(doc.name)} (${t('printfile.seps')}).pdf`, bytes, blob: new Blob([bytes], { type: 'application/pdf' }), report, sheets: indices.length * 5 };
}
