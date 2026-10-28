// Pictures from .pub files: JPEG, PNG and GIF show as they are; old Windows formats (WMF, EMF, BMP
// without a file header) are converted so the browser can show them. Results are cached per picture.
const cache = new Map();
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const bytesToB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };

function sniff(u8, mime) {
  if (u8[0] === 0x89 && u8[1] === 0x50) return 'image/png';
  if (u8[0] === 0xff && u8[1] === 0xd8) return 'image/jpeg';
  if (u8[0] === 0x47 && u8[1] === 0x49) return 'image/gif';
  if (u8[0] === 0x42 && u8[1] === 0x4d) return 'image/bmp';
  if (u8[0] === 0xd7 && u8[1] === 0xcd && u8[2] === 0xc6 && u8[3] === 0x9a) return 'image/wmf'; // placeable WMF
  if (u8[0] === 1 && u8[1] === 0 && u8[2] === 0 && u8[3] === 0 && u8[40] === 0x20 && u8[41] === 0x45) return 'image/emf';
  if ((u8[0] === 0x49 && u8[1] === 0x49) || (u8[0] === 0x4d && u8[1] === 0x4d)) return 'image/tiff';
  if (u8[0] === 0x3c || (u8[0] === 0xef && u8[3] === 0x3c)) return 'image/svg+xml'; // '<svg' or '<?xml' (pictures from the library)
  return mime;
}
// A DIB (bitmap without its 14-byte file header) gets one so it can be shown as BMP
function dibToBmp(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const hdr = dv.getUint32(0, true), bpp = dv.getUint16(14, true), clr = dv.getUint32(32, true) || (bpp <= 8 ? 1 << bpp : 0);
  const off = 14 + hdr + clr * 4;
  const out = new Uint8Array(u8.length + 14), ov = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d; ov.setUint32(2, out.length, true); ov.setUint32(10, off, true); out.set(u8, 14);
  return out;
}
let WMF = null, EMF = null;
async function metafileToSvg(u8, type, w, h) {
  if (type === 'image/wmf') {
    if (!WMF) { WMF = (await import('rtf.js/dist/WMFJS.bundle.js')).default || window.WMFJS; WMF.loggingEnabled?.(false); } // its debug log is thousands of lines per picture
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let xExt = 1000, yExt = 1000;
    if (dv.getUint32(0, true) === 0x9ac6cdd7) { xExt = Math.abs(dv.getInt16(10, true) - dv.getInt16(6, true)) || 1000; yExt = Math.abs(dv.getInt16(12, true) - dv.getInt16(8, true)) || 1000; }
    const r = new WMF.Renderer(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    return r.render({ width: `${w}pt`, height: `${h}pt`, xExt, yExt, mapMode: 8 });
  }
  if (!EMF) { EMF = (await import('rtf.js/dist/EMFJS.bundle.js')).default || window.EMFJS; EMF.loggingEnabled?.(false); }
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const fx = dv.getInt32(24, true), fy = dv.getInt32(28, true), fx2 = dv.getInt32(32, true), fy2 = dv.getInt32(36, true); // rclFrame in 0.01 mm
  const r = new EMF.Renderer(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
  return r.render({ width: `${w}pt`, height: `${h}pt`, wExt: fx2 - fx || 1000, hExt: fy2 - fy || 1000, xExt: fx2 - fx || 1000, yExt: fy2 - fy || 1000, mapMode: 8 });
}
// -> { url } for an <img>, or { svg } element, or { error }
export async function pictureSource(item) {
  if (!item.data) return { error: 'empty', empty: true };
  // small pictures (icons differ only in colour, deep inside) are keyed by their whole data
  const d = item.data, key = d.length < 200000 ? d : `${d.length}:${d.slice(0, 64)}${d.slice(d.length >> 1, (d.length >> 1) + 64)}${d.slice(-64)}`;
  if (cache.has(key)) return cache.get(key);
  let res;
  try {
    let u8 = b64ToBytes(item.data);
    let type = sniff(u8, item.mime);
    if (type === 'image/bmp' && !(u8[0] === 0x42 && u8[1] === 0x4d)) u8 = dibToBmp(u8);
    if (type === 'image/png' || type === 'image/jpeg' || type === 'image/gif' || type === 'image/bmp' || type === 'image/svg+xml') res = { url: `data:${type};base64,${type === 'image/bmp' ? bytesToB64(u8) : item.data}`, type };
    else if (type === 'image/wmf' || type === 'image/emf') {
      const svg = await metafileToSvg(u8, type, item.w, item.h);
      res = { url: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg)))), type, converted: true };
    } else res = { error: `This picture format (${type || 'unknown'}) can't be shown yet`, note: ['note.picFormat', { type: String(type || '?').replace('image/', '').toUpperCase() }], type };
  } catch (err) {
    res = { error: `This picture could not be read (${err.message})`, note: ['note.picBroken'] };
  }
  cache.set(key, res);
  return res;
}
