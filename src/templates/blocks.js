// Building blocks: ready-made pieces to drop onto a page (headings, coupons, tear-off strips, page borders,
// badges, contact details, a QR code). They are drawn with the template kit, in the document's own colour
// scheme and fonts, and arrive as one group that moves together.
import qrcode from 'qrcode-generator';
import { makeKit } from './kit.js';
import { schemeColors, fontPair } from './schemes.js';
import { loadArt } from './art.js';
import { moveItem, uid } from '../editor/model.js';
import { tearOffs, frame, corners, infoRows } from './common.js';

const MM = 72 / 25.4;

// size: [w, h] in mm, or 'page' for pieces that go round the whole page
export const BLOCKS = [
  { id: 'h-ribbon', cat: 'headings', size: [150, 26], build(k) {
    const { W, H, s } = k;
    k.poly([[0, 6], [14, 6], [10, 13], [14, 20], [0, 20]], { fill: 'secondary' }); k.poly([[W, 6], [W - 14, 6], [W - 10, 13], [W - 14, 20], [W, 20]], { fill: 'secondary' });
    k.rect(10, 2, W - 20, H - 4, { fill: 'primary' });
    k.text(14, 2, W - 28, H - 4, s('blk.heading'), { size: 26, font: 'heading', color: 'light', bold: true, align: 'center', valign: 'middle' });
  } },
  { id: 'h-underline', cat: 'headings', size: [150, 22], build(k) {
    k.text(0, 0, k.W, 16, k.s('blk.heading'), { size: 28, font: 'heading', color: 'dark', bold: true });
    k.rect(0, 17, 34, 2.4, { fill: 'primary' });
  } },
  { id: 'h-tab', cat: 'headings', size: [110, 16], build(k) {
    k.rect(0, 0, k.W, k.H, { fill: 'secondary', r: 8 });
    k.text(4, 0, k.W - 8, k.H, k.s('blk.heading'), { size: 20, font: 'heading', color: 'dark', bold: true, align: 'center', valign: 'middle' });
  } },
  { id: 'h-side', cat: 'headings', size: [150, 18], build(k) {
    k.rect(0, 0, 4, k.H, { fill: 'primary' });
    k.text(8, 0, k.W - 8, k.H, [{ t: k.s('blk.kicker'), size: 10, caps: true, tracking: 2, color: 'primary', bold: true }, { t: k.s('blk.heading'), size: 22, font: 'heading', bold: true }], { lh: 1 });
  } },
  { id: 'b-burst', cat: 'badges', size: [50, 50], build(k) {
    k.star(25, 25, 25, { points: 16, inner: 0.78, fill: 'accent' });
    k.text(7, 13, 36, 24, [{ t: k.s('blk.sale'), size: 15, bold: true }, { t: '-20%', size: 24, bold: true }], { color: 'light', font: 'heading', align: 'center', valign: 'middle', lh: 0.95 });
  } },
  { id: 'b-circle', cat: 'badges', size: [40, 40], build(k) {
    k.circle(20, 20, 20, { fill: 'primary' }); k.circle(20, 20, 17, { fill: 'none', stroke: 'light', sw: 1, dash: [2, 2] });
    k.text(4, 10, 32, 20, k.s('blk.new'), { size: 20, bold: true, color: 'light', font: 'heading', align: 'center', valign: 'middle' });
  } },
  { id: 'b-tag', cat: 'badges', size: [70, 30], build(k) {
    k.poly([[0, 15], [12, 0], [70, 0], [70, 30], [12, 30]], { fill: 'secondary' });
    k.circle(9, 15, 2.5, { fill: 'light' });
    k.text(16, 0, 52, 30, '€9.99', { size: 28, bold: true, font: 'heading', color: 'dark', align: 'center', valign: 'middle' });
  } },
  { id: 'b-speech', cat: 'badges', size: [80, 50], build(k) {
    k.path('M6 0 L74 0 Q80 0 80 6 L80 32 Q80 38 74 38 L30 38 L18 50 L20 38 L6 38 Q0 38 0 32 L0 6 Q0 0 6 0 Z', { fill: 'light', stroke: 'primary', sw: 1.5 });
    k.text(6, 3, 68, 32, k.s('blk.speech'), { size: 15, align: 'center', valign: 'middle', font: 'heading', color: 'dark' });
  } },
  { id: 'b-quote', cat: 'badges', size: [140, 44], build(k) {
    k.rect(0, 0, k.W, k.H, { fill: 'primary', opacity: 0.1, r: 3 });
    k.text(4, -4, 20, 24, '“', { size: 64, font: 'Georgia', color: 'primary', bold: true });
    k.text(22, 6, k.W - 30, 24, k.s('blk.quote'), { size: 15, italic: true, font: 'heading', lh: 1.25 });
    k.text(22, 32, k.W - 30, 8, k.s('blk.quoteBy'), { size: 11, bold: true, color: 'primary' });
  } },
  { id: 'c-coupon', cat: 'coupons', size: [120, 56], build(k) {
    const { W, H, s } = k;
    k.rect(0, 0, W, H, { fill: 'light', stroke: 'dark', sw: 1, dash: [4, 3] });
    k.art('i:scissors', -3, -3, 7, 7, { color: 'dark' });
    k.text(6, 6, W - 12, 22, s('blk.off'), { size: 34, font: 'heading', bold: true, color: 'primary', align: 'center' });
    k.text(6, 28, W - 12, 12, s('blk.couponText'), { size: 12, align: 'center' });
    k.text(6, 42, W - 12, 8, s('blk.valid'), { size: 9.5, align: 'center', italic: true });
  } },
  { id: 'c-ticket', cat: 'coupons', size: [140, 50], build(k) {
    const { W, H, s } = k;
    k.rect(0, 0, W, H, { fill: 'primary', r: 3 });
    k.circle(0, H / 2, 6, { fill: '#ffffff' }); k.circle(W, H / 2, 6, { fill: '#ffffff' });
    k.line(W - 36, 4, W - 36, H - 4, { color: 'light', width: 0.8, dash: [3, 2] });
    k.text(10, 6, W - 52, 14, s('blk.ticket'), { size: 22, font: 'heading', bold: true, color: 'light', caps: true, tracking: 2 });
    k.text(10, 22, W - 52, 22, `${s('common.date')}\n${s('common.place')}`, { size: 11, color: 'light', lh: 1.3 });
    k.text(W - 34, 6, 30, H - 12, 'Nº\n0001', { size: 14, color: 'light', bold: true, align: 'center', valign: 'middle', rotate: 90 });
  } },
  { id: 'c-tearoff', cat: 'coupons', size: 'page', build(k) { tearOffs(k, `${k.s('blk.tearoff')}\n${k.s('common.phone')}`, { n: 8, h: 46 }); } },
  { id: 'p-frame', cat: 'borders', size: 'page', build(k) { frame(k, 8, { color: 'primary', width: 2.5, gap: 3, width2: 0.8 }); } },
  { id: 'p-dots', cat: 'borders', size: 'page', build(k) { k.rect(7, 7, k.W - 14, k.H - 14, { fill: 'none', stroke: 'primary', sw: 2.5, dash: [0.1, 6], r: 6 }); } },
  { id: 'p-corners', cat: 'borders', size: 'page', build(k) { corners(k, 34, { fill: 'primary' }); } },
  { id: 'p-band', cat: 'borders', size: 'page', build(k) { k.rect(0, 0, k.W, 12, { fill: 'primary' }); k.rect(0, k.H - 12, k.W, 12, { fill: 'primary' }); k.rect(0, 12, k.W, 2, { fill: 'secondary' }); k.rect(0, k.H - 14, k.W, 2, { fill: 'secondary' }); } },
  { id: 'p-flowers', cat: 'borders', size: 'page', build(k) {
    const { W, H } = k, s = 36;
    k.art('cherry-blossom', -6, -6, s, s); k.art('tulip', s * 0.55, -3, s * 0.5, s * 0.5, { rotate: -30 });
    k.art('cherry-blossom', W - s + 6, H - s + 6, s, s); k.art('tulip', W - s * 1.05, H - s * 0.45, s * 0.5, s * 0.5, { rotate: 150 });
  } },
  { id: 'p-stars', cat: 'borders', size: 'page', build(k) {
    const { W, H } = k, n = 9;
    for (let i = 0; i <= n; i++) { const x = 10 + (i * (W - 20)) / n; k.star(x, 8, 3, { fill: i % 2 ? 'secondary' : 'accent' }); k.star(x, H - 8, 3, { fill: i % 2 ? 'accent' : 'secondary' }); }
    const m = Math.round(n * H / W);
    for (let i = 1; i < m; i++) { const y = 8 + (i * (H - 16)) / m; k.star(8, y, 3, { fill: i % 2 ? 'accent' : 'secondary' }); k.star(W - 8, y, 3, { fill: i % 2 ? 'secondary' : 'accent' }); }
  } },
  { id: 'i-contact', cat: 'info', size: [90, 44], build(k) {
    infoRows(k, 0, 0, k.W, [['i:phone', k.s('common.phone'), 'phone'], ['i:mail', k.s('common.email'), 'email'], ['i:world', k.s('common.web'), 'web'], ['i:map-pin', k.s('common.address'), 'address']], { size: 12, gap: 11, icon: 6 });
  } },
  { id: 'i-hours', cat: 'info', size: [80, 62], build(k) {
    k.rect(0, 0, k.W, k.H, { fill: 'light', r: 3 });
    k.text(4, 3, k.W - 8, 10, k.s('blk.hours'), { size: 15, font: 'heading', bold: true, color: 'primary', align: 'center' });
    k.text(6, 15, k.W - 12, 44, k.s('blk.hourlist').split('\n').map((l) => { const [a, b] = l.split('|'); return { runs: [{ t: a, bold: true }, { t: b ? `   ${b}` : '' }], after: 3 }; }), { size: 11 });
  } },
  { id: 'i-find', cat: 'info', size: [100, 30], build(k) {
    k.circle(12, 15, 12, { fill: 'primary' }); k.art('i:map-pin', 5, 8, 14, 14, { color: 'light' });
    k.text(28, 2, k.W - 28, 26, [{ t: k.s('blk.find'), bold: true, size: 15, font: 'heading', color: 'primary' }, { t: k.s('common.address'), size: 12 }], { valign: 'middle', lh: 1.25 });
  } },
  { id: 'i-social', cat: 'info', size: [100, 16], build(k) {
    k.text(0, 0, 36, 16, k.s('blk.follow'), { size: 13, bold: true, valign: 'middle', font: 'heading' });
    ['i:brand-facebook', 'i:brand-instagram', 'i:brand-whatsapp'].forEach((ic, i) => k.art(ic, 38 + i * 12, 3, 10, 10, { color: 'primary' }));
    k.text(76, 0, 24, 16, '@yourname', { size: 10, valign: 'middle', color: 'primary' });
  } },
  { id: 'q-code', cat: 'qr', size: [40, 48], qr: true, build(k, opts) {
    qrInto(k, opts.url || 'https://www.example.com', 0, 0, 40);
    k.text(0, 41, 40, 7, k.s('blk.scan'), { size: 10, align: 'center', bold: true, color: 'dark' });
  } },
  // page parts, as in Publisher: a sidebar, a pull quote, a story with a drop cap, a table of contents
  { id: 'pp-sidebar', cat: 'parts', size: [70, 92], build(k) {
    k.rect(0, 0, k.W, k.H, { fill: 'light', r: 3 }); k.rect(0, 0, k.W, 3, { fill: 'primary' });
    k.text(6, 7, k.W - 12, 12, k.s('blk.sideHead'), { size: 17, font: 'heading', bold: true, color: 'primary' });
    k.text(6, 22, k.W - 12, k.H - 28, k.s('blk.sideList').split('\n').map((t) => ({ t, bullet: '•', after: 5 })), { size: 11, lh: 1.2 });
  } },
  { id: 'pp-pull', cat: 'parts', size: [90, 40], build(k) {
    k.rect(0, 0, k.W, 1.4, { fill: 'primary' }); k.rect(0, k.H - 1.4, k.W, 1.4, { fill: 'primary' });
    k.text(2, 3, k.W - 4, k.H - 6, (([a, b]) => `${a}${k.s('blk.pull')}${b}`)({ fr: ['«\u202f', '\u202f»'], de: ['„', '“'], es: ['«', '»'], it: ['«', '»'] }[k.lang] || ['“', '”']), { size: 17, italic: true, font: 'heading', color: 'secondary', align: 'center', valign: 'middle', lh: 1.15 });
  } },
  { id: 'pp-story', cat: 'parts', size: [150, 82], build(k) {
    k.text(0, 0, k.W, 13, k.s('blk.storyHead'), { size: 24, font: 'heading', bold: true, color: 'dark' });
    k.rect(0, 14, 30, 1.4, { fill: 'primary' });
    k.text(0, 19, k.W, k.H - 19, [{ t: k.s('blk.storyText'), dropCap: { lines: 3 }, after: 6 }, { t: k.s('blk.storyMore') }], { size: 11, columns: 2, gap: 6, lh: 1.25, align: 'justify' });
  } },
  { id: 'pp-contents', cat: 'parts', size: [80, 52], build(k) {
    k.text(0, 0, k.W, 11, k.s('blk.toc'), { size: 16, font: 'heading', bold: true, color: 'primary' });
    k.rect(0, 12, k.W, 0.8, { fill: 'secondary' });
    k.text(0, 16, k.W, k.H - 16, k.s('blk.tocList').split('\n').map((l) => { const [a, b] = l.split('|'); return { t: `${a}\t${b}`, tabs: [{ pos: k.W, align: 'right', leader: 'dot' }], after: 4 }; }), { size: 11 });
  } },
];
export const BLOCK_CATS = ['headings', 'parts', 'badges', 'coupons', 'borders', 'info', 'qr'];

// a QR code as one shape: rows of dark squares merged into strips, so it stays sharp at any size
export function qrInto(k, text, x, y, size, color = 'dark') {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'M'); q.addData(String(text)); q.make();
  const n = q.getModuleCount(), quiet = 2, cell = size / (n + 2 * quiet);
  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!q.isDark(r, c)) { c++; continue; }
      let e = c; while (e < n && q.isDark(r, e)) e++;
      const x0 = +(x + (quiet + c) * cell).toFixed(3), x1 = +(x + (quiet + e) * cell).toFixed(3), y0 = +(y + (quiet + r) * cell).toFixed(3), y1 = +(y + (quiet + r + 1) * cell + 0.02).toFixed(3);
      d += `M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} L${x0} ${y1} Z `;
      c = e;
    }
  }
  k.rect(x, y, size, size, { fill: '#ffffff' });
  const it = k.path(d.trim(), { fill: color });
  it.qr = String(text);
  return it;
}

// the block as items (points) placed in the middle of a page of size pg; returns one group (or the items of a page border)
export async function blockItems(block, { scheme = 'orange', fonts = 'modern', strings, lang = 'en', page, url } = {}) {
  await loadArt();
  const s = (key) => strings?.[lang]?.[key] ?? strings?.en?.[key] ?? key;
  const k = makeKit({ scheme: schemeColors(scheme), fonts: fontPair(fonts), s, lang });
  const whole = block.size === 'page';
  k.page(whole ? [page.w / MM, page.h / MM] : block.size);
  block.build(k, { url });
  const items = k.pages[0].items;
  if (!whole) { const dx = (page.w - k.pages[0].w) / 2, dy = (page.h - k.pages[0].h) / 2; for (const it of items) moveItem(it, dx, dy); }
  const xs = items.map((it) => it.x), ys = items.map((it) => it.y);
  return { type: 'group', id: uid(), x: Math.min(...xs), y: Math.min(...ys), items, block: block.id };
}
// the block drawn on its own little page, for the picker
export async function blockPreview(block, opts) {
  const size = block.size === 'page' ? [105, 148] : block.size;
  const page = { id: 'pv', w: size[0] * MM, h: size[1] * MM, items: [] };
  const g = await blockItems(block, { ...opts, page });
  page.items = g.items;
  return page;
}

export const blockStrings = {
  'blk.heading': 'Your heading here', 'blk.kicker': 'Small line above', 'blk.sale': 'SALE', 'blk.new': 'NEW!', 'blk.speech': 'Write something fun here!',
  'blk.quote': 'The best coffee in town, and such friendly people!', 'blk.quoteBy': '— Anna, a happy customer',
  'blk.off': '10% OFF', 'blk.couponText': 'Bring this coupon with you', 'blk.valid': 'Valid until 31 December', 'blk.ticket': 'Admit one',
  'blk.tearoff': 'Call us', 'blk.hours': 'Opening hours', 'blk.hourlist': 'Mon – Fri|9:00 – 18:00\nSaturday|10:00 – 14:00\nSunday|Closed',
  'blk.sideHead': 'Did you know?', 'blk.sideList': 'Put a short fact here\nAnd another one here\nKeep each point to one line or two',
  'blk.pull': 'A short, striking line taken from the story', 'blk.storyHead': 'Your story heading',
  'blk.storyText': 'Write your story here. Start with the most important news, then add the details people will want to know: who, what, when and where.',
  'blk.storyMore': 'Finish with what readers can do next, such as a date to remember, a place to visit or someone to contact.',
  'blk.toc': 'In this issue', 'blk.tocList': 'Welcome|1\nNews from the team|2\nComing up|3\nPuzzle corner|4',
  'blk.find': 'Find us', 'blk.follow': 'Follow us', 'blk.scan': 'Scan me',
};
