// Draws a document's pages out of sight, so it can be saved without opening it in the editor. It goes
// through the same steps as the pages on screen (main.js redraw + settle): draw, flow linked text and fit
// it, then once the pictures and fonts are in, flow and fit again. -> { doc, pageEls, embedded, remove() }
import { renderPage, flowLinkedText, fitText } from '../render.js';
import { loadEmbeddedFonts } from '../fonts.js';

export async function drawOffscreen(doc) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.className = 'pw-offscreen';
  Object.assign(host.style, { position: 'fixed', left: '-30000px', top: '0', zoom: '1', pointerEvents: 'none', contain: 'layout style', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '28px' });
  document.body.appendChild(host);
  try {
    const embedded = loadEmbeddedFonts(doc);
    const pictures = doc.pages.map((pg) => { const r = renderPage(pg, doc, { embedded }); host.appendChild(r.el); return r.done; });
    flowLinkedText(host, { embedded }); fitText(host);
    await Promise.all(pictures); await document.fonts.ready;
    flowLinkedText(host, { embedded }); fitText(host);
    return { doc, pageEls: [...host.children], embedded, remove: () => host.remove() };
  } catch (err) { host.remove(); throw err; }
}
