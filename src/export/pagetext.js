// Small helpers shared by the web page and e-mail exports.

// bytes -> base64, in slices so long files don't overflow the call stack
export function bytesToB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
export const blobToB64 = async (blob) => bytesToB64(new Uint8Array(await blob.arrayBuffer()));

// The words on a page (copied with stagePages), box by box, as plain text with blank lines between boxes
export function pageText(pageEl) {
  const parts = [];
  for (const box of pageEl.querySelectorAll(':scope > .it.text, :scope > .it.table')) {
    let s = '';
    if (box.classList.contains('table')) {
      s = [...box.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join('\t')).join('\n');
    } else {
      s = [...box.querySelectorAll('p.para')].map((p) => p.innerText).join('\n');
    }
    s = s.replace(/[\u200b\u00ad]/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (s) parts.push(s);
  }
  return parts.join('\n\n');
}
