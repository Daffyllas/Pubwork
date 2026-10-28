// Exports measure and copy pages at 100% size, away from the screen's zoom. The pages on screen have
// already had their linked text flowed and their text fitted, so copies keep exactly what is shown.
export async function stagePages(pageEls) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-30000px', top: '0', zoom: '1', pointerEvents: 'none', contain: 'layout style' });
  host.className = 'pw-export-stage';
  const copies = pageEls.map((p) => {
    const c = p.cloneNode(true); c.style.margin = '0'; c.style.boxShadow = 'none';
    c.querySelectorAll('.pw-ui').forEach((n) => n.remove()); // selection frames and guides are not part of the page
    c.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    c.querySelectorAll('.editing').forEach((n) => n.classList.remove('editing'));
    c.querySelectorAll('.overflow').forEach((n) => n.classList.remove('overflow')); // the on-screen "doesn't fit" mark
    c.querySelectorAll('.pic.placeholder').forEach((n) => n.remove()); // empty photo frames print as nothing
    host.appendChild(c); return c;
  });
  document.body.appendChild(host);
  await Promise.all([...host.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => {}))));
  await document.fonts.ready;
  return { host, pages: copies, done: () => host.remove() };
}

// Hands the finished file to the person. Inside a claude.ai artifact the page may not start downloads
// itself, so it asks the viewer through the `downloads` capability. -> 'saved' | 'declined' | 'blocked'
export async function download(blob, name) {
  if (window.claude?.use) {
    let d = null; try { d = await window.claude.use('downloads'); } catch { d = null; }
    if (!d) return 'blocked';
    try { await d.save({ filename: name, data: blob }); return 'saved'; } catch (e) { return e?.code === 'declined' ? 'declined' : 'blocked'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'saved';
}

export const safeName = (s) => String(s || 'document').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').trim().slice(0, 120) || 'document';

// the language most of the document's text is in (for lang="…" tags); else the language of the page
export function docLang(doc) {
  const count = new Map();
  const rec = (items) => { for (const it of items || []) { rec(it.items); const paras = [...(it.paras || []), ...(it.rows || []).flatMap((r) => r.cells.flatMap((c) => c.paras || []))]; for (const p of paras) for (const r of p.runs || []) if (r.lang && r.text) count.set(r.lang, (count.get(r.lang) || 0) + r.text.length); } };
  for (const pg of doc?.pages || []) rec(pg.items);
  const best = [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
  try { if (best) return Intl.getCanonicalLocales(best)[0]; } catch { /* not a language tag */ }
  return document.documentElement.lang || 'en';
}
