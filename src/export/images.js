// Pages as pictures (PNG or JPG), one per page. The page copy is drawn exactly as the browser shows it,
// fonts included, at the chosen resolution.
import { domToCanvas } from 'modern-screenshot';
import { zipSync } from 'fflate';
import { stagePages, safeName } from './stage.js';
import { t } from '../i18n/index.js';

// presets people pick from; dpi is relative to the printed page size
export const IMAGE_SIZES = {
  screen: { dpi: 96 },
  social: { long: 2048 }, // longest side 2048 px: sharp on Facebook, Instagram and WhatsApp
  print: { dpi: 300 },
};

const MAX_PIXELS = 36e6; // keep within what browsers can hold in one canvas

function scaleFor(pageEl, size) {
  const wPx = pageEl.offsetWidth, hPx = pageEl.offsetHeight; // CSS px at 100% (96 per inch)
  let k = size.long ? size.long / Math.max(wPx, hPx) : (size.dpi || 96) / 96;
  if (wPx * hPx * k * k > MAX_PIXELS) k = Math.sqrt(MAX_PIXELS / (wPx * hPx));
  return k;
}

export async function pageCanvas(stagedPage, size = IMAGE_SIZES.print) {
  const scale = scaleFor(stagedPage, size);
  return domToCanvas(stagedPage, { scale, backgroundColor: '#ffffff', font: {}, timeout: 30000 });
}

// write the resolution into the file, so other programs place a 300 dpi picture at its real size
let CRC;
const crc32 = (u8) => { CRC ||= Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }); let c = 0xffffffff; for (const b of u8) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export async function withDpi(blob, dpi) {
  if (!dpi) return blob;
  const u8 = new Uint8Array(await blob.arrayBuffer());
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[12] === 0x49 && u8[13] === 0x48) { // PNG: a pHYs chunk after IHDR
    const ppm = Math.round(dpi / 0.0254), chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    const at = 8 + 12 + new DataView(u8.buffer).getUint32(8);
    return new Blob([u8.subarray(0, at), chunk, u8.subarray(at)], { type: blob.type });
  }
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff && u8[3] === 0xe0 && u8[6] === 0x4a && u8[7] === 0x46) { // JPEG: the JFIF header's density
    u8[13] = 1; u8[14] = dpi >> 8; u8[15] = dpi & 255; u8[16] = dpi >> 8; u8[17] = dpi & 255;
    return new Blob([u8], { type: blob.type });
  }
  return blob;
}
const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('The picture could not be made'))), type, q));

// -> { blob, name } : one picture, or a .zip when several pages are saved
export async function exportImages(doc, pageEls, { format = 'png', size = 'print', pages = null, onProgress = () => {} } = {}) {
  const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const which = pages || pageEls.map((_, i) => i);
  const stage = await stagePages(which.map((i) => pageEls[i]));
  try {
    const files = [];
    for (let k = 0; k < stage.pages.length; k++) {
      onProgress(k, stage.pages.length);
      const canvas = await pageCanvas(stage.pages[k], IMAGE_SIZES[size] || IMAGE_SIZES.print);
      const blob = await withDpi(await toBlob(canvas, type, 0.92), (IMAGE_SIZES[size] || IMAGE_SIZES.print).dpi);
      const pageNo = which[k] + 1;
      files.push({ name: `${safeName(doc.name)}${pageEls.length > 1 ? ` - ${t('export.page', { n: pageNo })}` : ''}.${format}`, blob });
      canvas.width = canvas.height = 0;
    }
    if (files.length === 1) return files[0];
    const entries = {};
    for (const f of files) entries[f.name] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
    return { name: `${safeName(doc.name)} (${format.toUpperCase()}).zip`, blob: new Blob([zipSync(entries)], { type: 'application/zip' }) };
  } finally { stage.done(); }
}
