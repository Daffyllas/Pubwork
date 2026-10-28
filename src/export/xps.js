// XPS: Microsoft's fixed-page format (opens in the XPS Viewer and prints on any Windows PC). Each page
// is kept at its exact size as one sharp picture (200 dots per inch), so it looks just like the screen.
// The package follows the XPS layout: a document sequence -> one fixed document -> a fixed page per page.
import { zipSync, strToU8 } from 'fflate';
import { stagePages, safeName, docLang } from './stage.js';
import { pageCanvas } from './images.js';

const x = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const XML = '<?xml version="1.0" encoding="UTF-8"?>\n';
const XPS = 'http://schemas.microsoft.com/xps/2005/06';
const n = (v) => +v.toFixed(2);
const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('The picture could not be made'))), type, q));
const rels = (list) => `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;

export async function exportXps(doc, pageEls, { dpi = 200, onProgress = () => {} } = {}) {
  const stage = await stagePages(pageEls);
  stage.pages.forEach((pg) => pg.querySelectorAll('.overflow').forEach((n) => n.classList.remove('overflow'))); // no "text doesn't fit" marks
  const files = {}, pics = {};
  const fdoc = [];
  const lang = docLang(doc);
  try {
    for (let i = 0; i < stage.pages.length; i++) {
      onProgress(i, stage.pages.length);
      const pg = stage.pages[i];
      // XPS measures in 1/96 inch, the same as CSS pixels
      const W = n(pg.offsetWidth), H = n(pg.offsetHeight);
      const canvas = await pageCanvas(pg, { dpi });
      const pw = canvas.width, ph = canvas.height;
      let blob = await toBlob(canvas, 'image/png'), ext = 'png';
      if (blob.size > 6e6) { const jpg = await toBlob(canvas, 'image/jpeg', 0.92); if (jpg.size < blob.size) { blob = jpg; ext = 'jpg'; } }
      canvas.width = canvas.height = 0;
      const img = `/Documents/1/Resources/Images/page${i + 1}.${ext}`;
      pics[img.slice(1)] = new Uint8Array(await blob.arrayBuffer());
      // the picture (pixels counted at 96 per inch, as XPS reads a picture without its own resolution)
      // is stretched over the whole page
      files[`Documents/1/Pages/${i + 1}.fpage`] = `<FixedPage xmlns="${XPS}" Width="${W}" Height="${H}" xml:lang="${x(lang)}">`
        + `<Path Data="M 0,0 L ${W},0 ${W},${H} 0,${H} Z"><Path.Fill><ImageBrush ImageSource="${img}" Viewbox="0,0,${pw},${ph}" ViewboxUnits="Absolute" Viewport="0,0,${W},${H}" ViewportUnits="Absolute" TileMode="None"/></Path.Fill></Path></FixedPage>`;
      files[`Documents/1/Pages/_rels/${i + 1}.fpage.rels`] = rels([['R1', 'http://schemas.microsoft.com/xps/2005/06/required-resource', img]]);
      fdoc.push(`<PageContent Source="/Documents/1/Pages/${i + 1}.fpage" Width="${W}" Height="${H}"/>`);
    }
  } finally { stage.done(); }
  onProgress(stage.pages.length, stage.pages.length);
  const exts = [...new Set(Object.keys(pics).map((p) => p.split('.').pop()))];
  Object.assign(files, {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/><Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>${exts.map((e) => `<Default Extension="${e}" ContentType="${e === 'png' ? 'image/png' : 'image/jpeg'}"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    '_rels/.rels': rels([['R0', 'http://schemas.microsoft.com/xps/2005/06/fixedrepresentation', '/FixedDocSeq.fdseq'], ['R1', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', '/docProps/core.xml']]),
    'FixedDocSeq.fdseq': `${XML}<FixedDocumentSequence xmlns="${XPS}"><DocumentReference Source="/Documents/1/FixedDoc.fdoc"/></FixedDocumentSequence>`,
    'Documents/1/FixedDoc.fdoc': `${XML}<FixedDocument xmlns="${XPS}">${fdoc.join('')}</FixedDocument>`,
    'docProps/core.xml': `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(doc.name)}</dc:title>${doc.meta?.author ? `<dc:creator>${x(doc.meta.author)}</dc:creator>` : ''}<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`,
  });
  for (const k of Object.keys(files)) if (k.endsWith('.fpage')) files[k] = XML + files[k];
  const entries = {};
  for (const [k, v] of Object.entries(files)) entries[k] = strToU8(v);
  for (const [k, v] of Object.entries(pics)) entries[k] = [v, { level: 0 }];
  const bytes = zipSync(entries, { level: 6 });
  return { name: `${safeName(doc.name)}.xps`, blob: new Blob([bytes], { type: 'application/vnd.ms-xpsdocument' }), bytes };
}
