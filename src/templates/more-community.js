// Templates for churches, schools, clubs and charities: orders of service, programmes, rotas, timetables,
// permission slips, fixtures, raffle tickets, sign-up sheets and more. They draw relative to the page
// (A4 or US Letter, A5 or half letter), use the colour scheme and font pair roles, and the boxes that hold
// a name, address, phone, e-mail, web address or logo are marked so "My details" fills them in.
// en: their English words; tr: the same words in the other five languages; categories: new gallery groups.
import { infoRows, frame, bunting, confetti } from './common.js';

export const categories = ['church', 'school', 'club'];

// ---------------------------------------------------------------- small helpers
const lines = (k, key) => k.s(key).split('\n');
const rows = (k, key) => lines(k, key).map((l) => l.split('|'));

// a dashed cut line across the page with a pair of scissors at the left
function cutLine(k, y) {
  k.line(20, y, k.W - 8, y, { color: 'dark', width: 0.6, dash: [3, 2.5] });
  k.art('i:scissors', 11, y - 3, 6, 6, { color: 'dark' });
}
// a form field: a small label with a writing line under it
function field(k, x, y, w, label, o = {}) {
  k.text(x, y, w, 5.5, label, { size: o.size ?? 8.5, bold: true, caps: true, tracking: 0.6, color: o.color ?? 'primary' });
  k.line(x, y + (o.gap ?? 12), x + w, y + (o.gap ?? 12), { color: 'dark', width: 0.5 });
}
// a tick box with its words
function tickBox(k, x, y, w, label, o = {}) {
  k.rect(x, y + 0.6, 4, 4, { fill: 'none', stroke: 'dark', sw: 0.7, r: 0.6 });
  k.text(x + 6, y, w - 6, 5.5, label, { size: o.size ?? 10.5, valign: 'middle' });
}
// a list: "#Heading" lines become small section headings, "a|b" lines become a with b after a dotted leader
// (style 'leader') or b on its own line under a (style 'two')
function orderList(k, x, y, w, h, key, o = {}) {
  const size = o.size ?? 11, out = [];
  lines(k, key).forEach((l, i) => {
    if (l.startsWith('#')) { out.push({ t: l.slice(1), size: o.headSize ?? 9, bold: true, caps: true, tracking: 1.5, color: o.headColor ?? 'accent', before: i ? (o.headBefore ?? 7) : 0, after: 3 }); return; }
    const [a, b] = l.split('|');
    if (o.style === 'two') {
      out.push({ t: a, bold: true, color: o.labelColor ?? 'primary', after: b ? 0.5 : (o.after ?? 6) });
      if (b) out.push({ t: b, italic: true, size: size - 1, after: o.after ?? 6 });
    } else out.push({ runs: [{ t: a, bold: o.bold ?? true, color: o.labelColor ?? 'dark' }, ...(b ? [{ t: `\t${b}` }] : [])], tabs: [{ pos: w, align: 'right', leader: 'dot' }], after: o.after ?? 5 });
  });
  return k.text(x, y, w, h, out, { size, lh: o.lh ?? 1.2, align: o.align ?? 'left' });
}
// a heading with a short rule under it, centred
function heading(k, y, text, o = {}) {
  const { W } = k, m = o.m ?? 12;
  k.text(m, y, W - 2 * m, o.h ?? 14, text, { size: o.size ?? 22, font: 'heading', color: o.color ?? 'primary', bold: o.bold ?? true, align: 'center', valign: 'middle' });
  k.line(W / 2 - 14, y + (o.h ?? 14) + 2, W / 2 + 14, y + (o.h ?? 14) + 2, { color: o.rule ?? 'secondary', width: 1 });
}
// flowers in two opposite corners, as on the wedding invitation
function flowerCorners(k, size = 34) {
  const { W, H } = k;
  k.art('cherry-blossom', -size * 0.25, -size * 0.25, size, size);
  k.art('tulip', size * 0.45, -size * 0.12, size * 0.55, size * 0.55, { rotate: -30 });
  k.art('cherry-blossom', W - size * 0.75, H - size * 0.75, size, size);
  k.art('tulip', W - size, H - size * 0.45, size * 0.55, size * 0.55, { rotate: 150 });
}
// a table with a coloured heading row and banded rows; cells "=x" span the whole row
function bandTable(k, x, y, w, h, head, body, o = {}) {
  const nCols = head.length;
  const hRow = o.headH ?? 10, rowH = (h - hRow) / body.length;
  const data = [head.map((t, ci) => ({ t, bold: true, color: 'light', fill: 'primary', valign: 'middle', align: o.aligns?.[ci] ?? o.align ?? 'left', size: o.headSize ?? 10.5 }))];
  const spans = [];
  body.forEach((r, ri) => {
    const fill = o.fills?.[ri] ?? (ri % 2 ? '#ffffff' : 'light');
    if (r[1]?.startsWith('=')) { spans.push(ri + 1); data.push([{ t: r[0], fill: o.spanFill ?? 'secondary', bold: true, valign: 'middle' }, { t: r[1].slice(1), fill: o.spanFill ?? 'secondary', bold: true, valign: 'middle', align: 'center' }, ...Array(nCols - 2).fill({ t: '', fill: o.spanFill ?? 'secondary' })]); return; }
    data.push(r.map((t, ci) => ({ t, fill, valign: 'middle', align: o.aligns?.[ci] ?? (ci === 0 ? 'left' : (o.align ?? 'left')), bold: ci === 0 && o.boldFirst, color: o.colors?.[ci] })));
  });
  const it = k.table(x, y, w, h, data, { cols: o.cols, rowHeights: o.rowHeights ?? [hRow, ...body.map(() => rowH)], size: o.size ?? 10, borderColor: o.borderColor ?? '#d4d4d4', borderWidth: o.borderWidth ?? 0.5 });
  for (const ri of spans) { const cells = it.rows[ri].cells; cells[1].span = [nCols - 1, 1]; for (let c = 2; c < nCols; c++) cells[c].covered = true; }
  return it;
}

export const templates = [
  // ============================================================ church
  {
    id: 'cm-bulletin', cat: 'church', name: 'cm.bul.name', scheme: 'navy', fonts: 'traditional', size: 'half',
    build(k) {
      const { s } = k;
      let { W, H } = k;
      // 1 · cover
      k.rect(0, 0, W, H, { fill: 'light' });
      k.photo(0, 0, W, H * 0.46);
      k.circle(W / 2, H * 0.46, 13, { fill: 'primary', stroke: 'light', sw: 2 });
      k.art('i:cross', W / 2 - 6.5, H * 0.46 - 6.5, 13, 13, { color: 'light' });
      let y = H * 0.46 + 18;
      k.text(12, y, W - 24, 7, s('cm.church'), { size: 10.5, align: 'center', caps: true, tracking: 2, color: 'accent', bold: true, field: 'org' });
      k.text(10, y + 8, W - 20, 18, s('cm.bul.title'), { size: 32, font: 'heading', align: 'center', color: 'primary', bold: true, valign: 'middle' });
      k.text(12, y + 27, W - 24, 7, s('cm.bul.date'), { size: 11.5, align: 'center', italic: true });
      k.line(W / 2 - 18, y + 38, W / 2 + 18, y + 38, { color: 'secondary', width: 1 });
      k.text(16, y + 43, W - 32, 26, s('cm.bul.welcome'), { size: 10.5, align: 'center', lh: 1.35 });
      k.rect(0, H - 13, W, 13, { fill: 'primary' });
      k.text(8, H - 13, W - 16, 13, s('common.address'), { size: 9, color: 'light', align: 'center', valign: 'middle', field: 'address' });
      // 2 · order of service
      k.page('half'); ({ W, H } = k);
      k.rect(0, 0, W, 4, { fill: 'primary' });
      heading(k, 10, s('cm.bul.order'));
      orderList(k, 16, 34, W - 32, H - 56, 'cm.bul.items', { size: 11, after: 5.5, headBefore: 8 });
      k.text(14, H - 18, W - 28, 10, s('cm.bul.stand'), { size: 9, italic: true, align: 'center', color: 'primary' });
      // 3 · notices
      k.page('half'); ({ W, H } = k);
      k.rect(0, 0, W, 4, { fill: 'primary' });
      heading(k, 10, s('cm.bul.notices'));
      k.text(16, 34, W - 32, H - 112, rows(k, 'cm.bul.notes').flatMap(([a, b]) => [{ t: a, bold: true, color: 'primary', size: 12.5, after: 1.5 }, { t: b, after: 9 }]), { size: 10.5, lh: 1.35 });
      k.rect(12, H - 72, W - 24, 60, { fill: 'light', r: 3, stroke: 'secondary', sw: 0.6 });
      k.text(18, H - 68, W - 36, 9, s('cm.bul.week'), { size: 14, font: 'heading', bold: true, color: 'primary' });
      k.text(18, H - 57, W - 36, 42, rows(k, 'cm.bul.weeklist').map(([a, b]) => ({ runs: [{ t: a, bold: true, color: 'accent' }, { t: `\t${b}` }], tabs: [{ pos: 24, align: 'left' }], after: 3 })), { size: 9.5, lh: 1.2 });
      // 4 · back
      k.page('half'); ({ W, H } = k);
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.logo(W / 2 - 14, 16, 28, 28, { art: 'church' });
      k.text(12, 48, W - 24, 16, s('cm.church'), { size: 17, font: 'heading', color: 'light', align: 'center', bold: true, valign: 'middle', field: 'org' });
      k.rect(14, 70, W - 28, 46, { fill: 'light', r: 3 });
      k.text(18, 74, W - 36, 9, s('cm.bul.times'), { size: 14, font: 'heading', bold: true, color: 'primary', align: 'center' });
      k.text(18, 86, W - 36, 28, rows(k, 'cm.bul.timelist').map(([a, b]) => ({ runs: [{ t: a, bold: true }, { t: `  ${b}` }], align: 'center', after: 3 })), { size: 10, lh: 1.2 });
      infoRows(k, 20, 128, W - 40, [['i:user', s('cm.bul.vicar')], ['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web']], { size: 10.5, gap: 10, icon: 4.5, iconColor: 'secondary', color: 'light' });
      k.text(14, H - 16, W - 28, 8, s('cm.bul.take'), { size: 9, italic: true, color: 'secondary', align: 'center' });
    },
  },
  {
    id: 'cm-funeral', cat: 'church', name: 'cm.fun.name', scheme: 'earth', fonts: 'elegant', size: 'half',
    build(k) {
      const { s } = k;
      let { W, H } = k;
      const border = () => { k.rect(0, 0, W, H, { fill: 'light' }); frame(k, 6, { color: 'secondary', width: 0.8, gap: 2, width2: 0.4 }); };
      // 1 · cover
      border();
      k.photo(W / 2 - 30, 18, 60, 74, { round: true });
      k.ellipse(W / 2 - 31.5, 16.5, 63, 77, { fill: 'none', stroke: 'secondary', sw: 1 });
      k.text(12, 100, W - 24, 7, s('cm.fun.memory'), { size: 10, align: 'center', caps: true, tracking: 3, color: 'primary' });
      k.text(12, 108, W - 24, 26, s('cm.fun.person'), { size: 34, font: 'heading', align: 'center', valign: 'middle', color: 'dark' });
      k.text(12, 135, W - 24, 7, s('cm.fun.dates'), { size: 11, align: 'center', bold: true, color: 'primary' });
      k.line(W / 2 - 26, 149, W / 2 - 6, 149, { color: 'secondary', width: 0.6 }); k.line(W / 2 + 6, 149, W / 2 + 26, 149, { color: 'secondary', width: 0.6 });
      k.art('i:leaf', W / 2 - 3, 146, 6, 6, { color: 'secondary' });
      k.text(16, 156, W - 32, H - 172, [{ t: s('cm.fun.service'), bold: true, size: 11.5, after: 2 }, { t: s('cm.fun.when') }], { size: 10.5, align: 'center', lh: 1.35 });
      // 2 · order of service
      k.page('half'); ({ W, H } = k); border();
      heading(k, 14, s('cm.fun.order'), { size: 30, h: 16, bold: false });
      orderList(k, 18, 42, W - 36, H - 70, 'cm.fun.items', { style: 'two', size: 12.5, after: 6, align: 'center' });
      k.line(W / 2 - 26, H - 22, W / 2 - 6, H - 22, { color: 'secondary', width: 0.6 }); k.line(W / 2 + 6, H - 22, W / 2 + 26, H - 22, { color: 'secondary', width: 0.6 });
      k.art('i:leaf', W / 2 - 3, H - 25, 6, 6, { color: 'secondary' });
      // 3 · a life well lived
      k.page('half'); ({ W, H } = k); border();
      heading(k, 14, s('cm.fun.life'), { size: 30, h: 16, bold: false });
      const pw = (W - 40) / 2;
      k.photo(16, 40, pw, 40); k.photo(24 + pw, 40, pw, 40);
      k.text(16, 86, W - 32, H - 130, s('cm.fun.story'), { size: 11, lh: 1.35, align: 'justify', lineAfter: 5 });
      k.text(16, H - 42, W - 32, 26, [{ t: s('cm.fun.verse'), italic: true, size: 12 }, { t: s('cm.fun.verseref'), size: 8.5, caps: true, tracking: 1, color: 'primary', before: 2 }], { size: 10.5, align: 'center', lh: 1.3 });
      // 4 · thank you
      k.page('half'); ({ W, H } = k); border();
      k.art('dove', W / 2 - 16, 18, 32, 32);
      heading(k, 54, s('cm.fun.thanks'), { size: 30, h: 16, bold: false });
      k.text(18, 80, W - 36, 48, s('cm.fun.thankstext'), { size: 12, align: 'center', lh: 1.4 });
      k.rect(16, 132, W - 32, 32, { fill: '#ffffff', r: 2, stroke: 'secondary', sw: 0.6 });
      k.text(20, 134, W - 40, 28, [{ t: s('cm.fun.gifts'), bold: true, color: 'primary', after: 1.5, size: 12 }, { t: s('cm.fun.giftstext') }], { size: 11, align: 'center', valign: 'middle', lh: 1.3 });
      k.text(18, 172, W - 36, H - 184, s('cm.fun.after'), { size: 11.5, italic: true, align: 'center', lh: 1.35 });
    },
  },
  {
    id: 'cm-wedprog', cat: 'church', name: 'cm.wp.name', scheme: 'lavender', fonts: 'elegant', size: [99, 210],
    build(k) {
      const { s } = k;
      let { W, H } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      flowerCorners(k, 34);
      k.text(10, 40, W - 20, 8, s('cm.wp.kicker'), { size: 10, align: 'center', caps: true, tracking: 3 });
      k.text(6, 52, W - 12, 64, s('cm.wp.names'), { size: 40, font: 'heading', color: 'primary', align: 'center', valign: 'middle', lh: 0.95 });
      k.line(W / 2 - 16, 122, W / 2 + 16, 122, { color: 'secondary', width: 0.8 });
      k.text(10, 128, W - 20, 30, [{ t: s('cm.wp.date'), bold: true, size: 12 }, { t: s('cm.wp.place') }, { t: s('cm.wp.time') }], { size: 10, align: 'center', lh: 1.4 });
      k.text(10, 166, W - 20, 10, s('cm.wp.order'), { size: 9, caps: true, tracking: 3, align: 'center', color: 'primary', bold: true });
      k.page([99, 210]); ({ W, H } = k);
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.art('cherry-blossom', W / 2 - 9, 8, 18, 18);
      k.text(8, 28, W - 16, 16, s('cm.wp.ordertitle'), { size: 28, font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      orderList(k, 8, 50, W - 16, H - 86, 'cm.wp.items', { style: 'two', size: 10.5, after: 4, align: 'center' });
      k.line(W / 2 - 16, H - 33, W / 2 + 16, H - 33, { color: 'secondary', width: 0.8 });
      k.text(10, H - 30, W - 20, 22, s('cm.wp.thanks'), { size: 9, italic: true, align: 'center', lh: 1.35, color: 'primary' });
    },
  },
  {
    id: 'cm-prayer', cat: 'church', name: 'cm.pr.name', scheme: 'royal', fonts: 'traditional', size: 'quarter',
    build(k) {
      const { s } = k;
      let { W, H } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(5, 5, W - 10, H - 10, { fill: 'none', stroke: 'secondary', sw: 0.8 });
      k.photo(10, 10, W - 20, H * 0.6);
      k.text(8, H * 0.6 + 14, W - 16, 6, s('cm.fun.memory'), { size: 8, align: 'center', caps: true, tracking: 2.5, color: 'primary' });
      k.text(8, H * 0.6 + 20, W - 16, 14, s('cm.fun.person'), { size: 17, font: 'heading', align: 'center', valign: 'middle', bold: true, color: 'dark' });
      k.text(8, H * 0.6 + 35, W - 16, 6, s('cm.pr.years'), { size: 9.5, align: 'center', color: 'primary', bold: true });
      k.page('quarter'); ({ W, H } = k);
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(5, 5, W - 10, H - 10, { fill: 'none', stroke: 'secondary', sw: 0.8 });
      k.art('i:cross', W / 2 - 5, 12, 10, 10, { color: 'primary' });
      k.text(12, 26, W - 24, H - 58, [{ t: s('cm.pr.prayer'), italic: true }, { t: s('cm.pr.ref'), size: 7.5, caps: true, tracking: 1.2, color: 'primary', before: 4 }], { size: 9.5, align: 'center', lh: 1.35, valign: 'middle' });
      k.line(W / 2 - 12, H - 29, W / 2 + 12, H - 29, { color: 'secondary', width: 0.6 });
      k.text(10, H - 26, W - 20, 14, [{ t: s('cm.fun.person'), bold: true }, { t: s('cm.pr.years') }], { size: 8.5, align: 'center', lh: 1.3, color: 'dark' });
    },
  },
  {
    id: 'cm-carols', cat: 'church', name: 'cm.car.name', scheme: 'festive', fonts: 'traditional', size: 'half',
    build(k) {
      const { s } = k;
      let { W, H } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      [[16, 18, 8], [W - 22, 26, 10], [26, 70, 6], [W - 18, 84, 7], [12, 160, 7], [W - 14, 168, 6], [W / 2 + 38, 12, 6], [W / 2 - 44, 46, 5]].forEach(([x, y, r]) => k.art('i:snowflake', x - r / 2, y - r / 2, r, r, { color: 'light' }));
      k.circle(W / 2, 58, 30, { fill: 'light', opacity: 0.12 });
      k.art('candle', W / 2 - 22, 30, 44, 56);
      k.text(12, 96, W - 24, 7, s('cm.church'), { size: 10, align: 'center', caps: true, tracking: 2.5, color: 'accent', bold: true, field: 'org' });
      k.text(10, 104, W - 20, 42, s('cm.car.title'), { size: 38, font: 'heading', align: 'center', valign: 'middle', color: 'light', bold: true, lh: 0.95 });
      k.line(W / 2 - 20, 150, W / 2 + 20, 150, { color: 'accent', width: 1 });
      k.text(14, 155, W - 28, 16, [{ t: s('cm.car.date'), bold: true, size: 12.5 }, { t: s('cm.car.time') }], { size: 11, align: 'center', color: 'light', lh: 1.35 });
      k.text(16, H - 28, W - 32, 16, s('cm.car.after'), { size: 10, align: 'center', italic: true, color: 'accent', lh: 1.3 });
      k.page('half'); ({ W, H } = k);
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 4, { fill: 'primary' }); k.rect(0, H - 4, W, 4, { fill: 'primary' });
      k.art('christmas-tree', W / 2 - 9, 10, 18, 18);
      heading(k, 29, s('cm.car.prog'), { size: 22, rule: 'accent' });
      const items = rows(k, 'cm.car.items');
      k.text(18, 52, W - 36, H - 84, items.flatMap(([a, b]) => [{ t: a, size: 8, caps: true, tracking: 1.5, color: 'secondary', bold: true, after: 0.5 }, { t: b, bold: true, after: 5 }]), { size: 11, align: 'center', lh: 1.2 });
      k.text(16, H - 28, W - 32, 18, s('cm.car.collect'), { size: 9.5, italic: true, align: 'center', lh: 1.3, color: 'primary' });
    },
  },
  {
    id: 'cm-easter', cat: 'church', name: 'cm.eas.name', scheme: 'spring', fonts: 'classic',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 72, { fill: 'primary' });
      k.wave(72, 5, { below: false, fill: 'primary', waves: 2 });
      k.art('sunrise-over-mountains', W - 64, 12, 50, 50);
      k.text(16, 14, W - 90, 9, s('cm.eas.kicker'), { size: 14, color: 'light', caps: true, tracking: 3, bold: true });
      k.text(16, 24, W - 90, 32, s('cm.eas.title'), { size: 40, font: 'heading', color: 'light', bold: true, valign: 'middle', lh: 0.95 });
      k.text(16, 58, W - 90, 8, s('cm.church'), { size: 13, color: 'light', field: 'org' });
      const list = rows(k, 'cm.eas.list'), y0 = 88, rh = (H - y0 - 40) / list.length;
      list.forEach(([day, num, mon, time, what], i) => {
        const y = y0 + i * rh;
        if (i) k.line(16, y - 2, W - 16, y - 2, { color: 'secondary', width: 0.5, dash: [2, 2] });
        k.rect(16, y + 1, 26, rh - 7, { fill: i === list.length - 1 ? 'accent' : 'secondary', r: 3 });
        k.text(16, y + 1, 26, rh - 7, [{ t: num, size: 22, bold: true, lh: 0.9 }, { t: mon, size: 8.5, caps: true, tracking: 1, bold: true }], { color: 'dark', align: 'center', valign: 'middle', font: 'heading' });
        k.text(48, y + 1, W - 100, 9, day, { size: 15, font: 'heading', bold: true, color: 'primary' });
        k.text(48, y + 10.5, W - 100, rh - 13, what, { size: 12, lh: 1.25 });
        k.text(W - 52, y + 1, 36, 9, time, { size: 15, font: 'heading', bold: true, color: 'dark', align: 'right' });
      });
      k.rect(0, H - 30, W, 30, { fill: 'dark' });
      k.text(16, H - 27, W - 32, 9, s('cm.eas.welcome'), { size: 14, font: 'heading', bold: true, color: 'light', align: 'center' });
      k.text(16, H - 17, W - 32, 12, `${s('common.address')}  ·  ${s('common.phone')}  ·  ${s('common.web')}`, { size: 9.5, color: 'light', align: 'center', valign: 'middle' });
    },
  },
  {
    id: 'cm-rota', cat: 'church', name: 'cm.rota.name', scheme: 'forest', fonts: 'modern', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(0, 0, 6, H, { fill: 'primary' });
      k.logo(16, 11, 18, 18, { art: 'church' });
      k.text(40, 10, W * 0.5, 7, s('cm.church'), { size: 10, caps: true, tracking: 2, bold: true, color: 'primary', field: 'org' });
      k.text(40, 17, W * 0.5, 14, s('cm.rota.title'), { size: 26, font: 'heading', bold: true, color: 'dark', valign: 'middle' });
      k.text(W * 0.5, 13, W * 0.5 - 14, 16, [{ t: s('cm.rota.when'), bold: true, color: 'primary' }, { t: s('cm.rota.service') }], { size: 11, align: 'right', lh: 1.3 });
      const head = s('cm.rota.head').split('|'), dates = lines(k, 'cm.rota.dates'), names = lines(k, 'cm.names');
      const body = dates.map((d, r) => [d, ...head.slice(1).map((_, c) => names[(r * 4 + c * 3 + (r % 3)) % names.length])]);
      const tw = W - 30, c0 = 34, cw = (tw - c0) / (head.length - 1);
      bandTable(k, 16, 38, tw, H - 74, head, body, { cols: [c0, ...Array(head.length - 1).fill(cw)], size: 10, boldFirst: true, headH: 11 });
      k.art('i:info-circle', 16, H - 29, 7, 7, { color: 'primary' });
      k.text(26, H - 31, W - 42, 11, `${s('cm.rota.swap')} ${s('common.phone')}`, { size: 10.5, valign: 'middle' });
    },
  },
  {
    id: 'cm-bapcert', cat: 'church', name: 'cm.bc.name', scheme: 'ocean', fonts: 'elegant', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      frame(k, 9, { color: 'primary', width: 2.5, gap: 3, width2: 0.8, color2: 'secondary' });
      [[16, 16], [W - 30, 16], [16, H - 30], [W - 30, H - 30]].forEach(([x, y]) => k.art('i:sparkles', x, y, 14, 14, { color: 'secondary' }));
      k.art('dove', W / 2 - 14, 16, 28, 28);
      k.text(30, 44, W - 60, 24, s('cm.bc.title'), { size: 46, font: 'heading', align: 'center', valign: 'middle', color: 'primary' });
      k.text(30, 72, W - 60, 8, s('cert.certifies'), { size: 13, align: 'center', italic: true });
      k.text(30, 81, W - 60, 20, s('cm.bc.child'), { size: 36, font: 'heading', align: 'center', valign: 'middle', color: 'dark' });
      k.line(W / 2 - 70, 103, W / 2 + 70, 103, { color: 'secondary', width: 0.8 });
      k.text(40, 107, W - 80, 16, s('cm.bc.text'), { size: 13, align: 'center', lh: 1.3 });
      k.text(40, 124, W - 80, 7, s('cm.bc.date'), { size: 13, align: 'center', bold: true });
      k.text(40, 131, W - 80, 8, s('cm.church'), { size: 13, align: 'center', bold: true, color: 'primary', field: 'org' });
      const cw = (W - 100) / 2;
      [[s('cm.bc.parents'), s('cm.bc.parentnames')], [s('cm.bc.god'), s('cm.bc.godnames')]].forEach(([a, b], i) => {
        k.text(50 + i * cw, 144, cw - 6, 13, [{ t: a, size: 9, caps: true, tracking: 1.5, color: 'primary', bold: true }, { t: b, size: 12 }], { align: 'center', lh: 1.3 });
      });
      const sy = H - 30;
      k.line(46, sy, 116, sy, { color: 'dark', width: 0.7 });
      k.text(46, sy + 1.5, 70, 6, s('cm.bc.minister'), { size: 9.5, align: 'center', caps: true, tracking: 1.5 });
      k.circle(W - 80, sy - 8, 14, { fill: 'none', stroke: 'secondary', sw: 0.8, dash: [1.5, 1.5] });
      k.text(W - 94, sy - 12, 28, 8, s('cm.bc.seal'), { size: 7.5, align: 'center', valign: 'middle', caps: true, tracking: 1, color: 'secondary' });
    },
  },
  // ============================================================ school
  {
    id: 'cm-classnews', cat: 'school', name: 'cm.cn.name', scheme: 'sunshine', fonts: 'friendly',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 44, { fill: 'primary' });
      confetti(k, [W - 30, 4, 24, 36], { n: 9, colors: ['light', 'secondary', 'accent'], seed: 9 });
      k.art('backpack', 12, 6, 32, 32);
      k.text(50, 7, W - 84, 18, s('cm.cn.title'), { size: 32, font: 'heading', bold: true, color: 'light', valign: 'middle' });
      k.text(50, 26, W - 64, 12, s('cm.cn.sub'), { size: 11, color: 'light', valign: 'middle' });
      k.text(14, 50, W - 28, 10, s('cm.cn.learned'), { size: 17, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      const subj = rows(k, 'cm.cn.subjects'), pics = ['open-book', 'abacus', 'globe-showing-europe-africa'], cw = (W - 28 - 12) / 3;
      subj.forEach(([t, b], i) => {
        const x = 14 + i * (cw + 6);
        k.rect(x, 63, cw, 54, { fill: 'light', r: 4 });
        k.art(pics[i], x + 4, 67, 13, 13);
        k.text(x + 19, 67, cw - 22, 13, t, { size: 12.5, bold: true, color: 'primary', valign: 'middle' });
        k.text(x + 4, 83, cw - 8, 32, b, { size: 10, lh: 1.3 });
      });
      const lw = W * 0.56 - 14, rx = W * 0.56 + 6, rw = W - rx - 14, by = 124, bh = H - by - 78;
      k.rect(14, by, lw, bh, { fill: 'none', stroke: 'secondary', sw: 1.2, r: 4 });
      k.art('i:calendar', 19, by + 5, 7, 7, { color: 'primary' });
      k.text(29, by + 4, lw - 20, 9, s('cm.cn.dates'), { size: 14, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      k.text(19, by + 16, lw - 10, bh - 18, rows(k, 'cm.cn.datelist').flatMap(([a, b]) => [{ t: a, bold: true, color: 'accent', after: 0 }, { t: b, after: 4 }]), { size: 10, lh: 1.25 });
      k.rect(rx, by, rw, bh, { fill: 'secondary', opacity: 0.3, r: 4 });
      k.art('glowing-star', rx + 4, by + 4, 10, 10);
      k.text(rx + 16, by + 4, rw - 20, 10, s('cm.cn.star'), { size: 14, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      k.photo(rx + rw / 2 - 15, by + 17, 30, 30, { round: true });
      k.text(rx + 4, by + 49, rw - 8, 8, s('cm.cn.starname'), { size: 13, bold: true, align: 'center' });
      k.text(rx + 4, by + 58, rw - 8, bh - 60, s('cm.cn.starwhy'), { size: 9.5, align: 'center', lh: 1.3 });
      const ry = H - 70;
      k.text(14, ry, W - 28, 10, s('cm.cn.remind'), { size: 15, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      const rem = lines(k, 'cm.cn.remlist'), hw = (W - 28) / 2;
      rem.forEach((t, i) => {
        const x = 14 + (i % 2) * hw, y = ry + 13 + Math.floor(i / 2) * 12;
        k.circle(x + 4, y + 5, 4, { fill: 'accent' });
        k.art('i:check', x + 1.5, y + 2.5, 5, 5, { color: 'light' });
        k.text(x + 11, y, hw - 14, 10, t, { size: 10, valign: 'middle', lh: 1.15 });
      });
      k.rect(0, H - 14, W, 14, { fill: 'primary' });
      k.text(10, H - 14, W - 20, 14, `${s('common.phone')}  ·  ${s('common.email')}  ·  ${s('common.web')}`, { size: 9.5, color: 'light', align: 'center', valign: 'middle', bold: true });
    },
  },
  {
    id: 'cm-timetable', cat: 'school', name: 'cm.tt.name', scheme: 'ocean', fonts: 'modern', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.art('alarm-clock', 14, 9, 20, 20);
      k.text(40, 8, W - 120, 15, s('cm.tt.title'), { size: 28, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      k.text(40, 22, W - 120, 8, s('cm.tt.sub'), { size: 11.5 });
      k.text(W - 90, 10, 76, 18, s('cm.school'), { size: 10, align: 'right', bold: true, color: 'primary', caps: true, tracking: 1, valign: 'middle', field: 'org' });
      const head = s('cm.tt.head').split('|'), body = rows(k, 'cm.tt.rows');
      const short = body.map((r) => r[1].startsWith('=')), tw = W - 28, th = H - 34 - 28;
      const unit = (th - 10) / short.reduce((a, b) => a + (b ? 0.45 : 1), 0);
      const pe = new Set(lines(k, 'cm.tt.special'));
      const it = bandTable(k, 14, 34, tw, th, head, body, { cols: [30, ...Array(5).fill((tw - 30) / 5)], rowHeights: [10, ...short.map((b) => (b ? unit * 0.45 : unit))], align: 'center', size: 11, headSize: 11.5, boldFirst: true, spanFill: 'accent', fills: body.map(() => 'light'), borderColor: '#ffffff', borderWidth: 2 });
      // the lively lessons stand out in the second colour
      it.rows.forEach((row) => row.cells.forEach((c) => { const txt = c.paras[0].runs[0].text; if (pe.has(txt)) { c.fill = k.C('secondary'); c.paras[0].runs[0].bold = true; } }));
      k.art('i:info-circle', 14, H - 20, 7, 7, { color: 'primary' });
      k.text(24, H - 22, W - 38, 11, s('cm.tt.note'), { size: 11, valign: 'middle', bold: true, color: 'dark' });
    },
  },
  {
    id: 'cm-readcert', cat: 'school', name: 'cm.rc.name', scheme: 'lavender', fonts: 'friendly', size: 'half-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      confetti(k, [4, 4, W - 8, H - 8], { n: 36, seed: 14 });
      k.rect(10, 10, W - 20, H - 20, { fill: '#ffffff', r: 8, stroke: 'primary', sw: 2, dash: [6, 4] });
      k.art('books', 18, 16, 30, 30, { rotate: -8 });
      k.art('glowing-star', W - 44, 18, 24, 24);
      k.text(48, 18, W - 96, 24, s('cm.rc.title'), { size: 32, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'primary' });
      k.text(20, 46, W - 40, 7, s('cm.rc.to'), { size: 12, align: 'center' });
      k.text(20, 54, W - 40, 18, s('star.who'), { size: 32, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'accent' });
      k.line(W / 2 - 40, 73, W / 2 + 40, 73, { color: 'secondary', width: 1 });
      k.text(26, 76, W - 52, 16, s('cm.rc.for'), { size: 13, align: 'center', lh: 1.3 });
      k.text(26, 93, W - 52, 9, s('cm.school'), { size: 11, align: 'center', bold: true, color: 'primary', field: 'org' });
      const sy = H - 24, lw = 56;
      [[W * 0.27, s('cm.rc.teacher')], [W * 0.73, s('cert.date')]].forEach(([cx, label]) => {
        k.line(cx - lw / 2, sy, cx + lw / 2, sy, { color: 'dark', width: 0.7 });
        k.text(cx - lw / 2, sy + 1.5, lw, 6, label, { size: 9, align: 'center', caps: true, tracking: 1.2 });
      });
      k.art('open-book', W / 2 - 10, sy - 14, 20, 20);
    },
  },
  {
    id: 'cm-permission', cat: 'school', name: 'cm.ps.name', scheme: 'mint', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.logo(14, 12, 20, 20, { art: 'school' });
      k.text(40, 12, W - 54, 10, s('cm.school'), { size: 18, font: 'heading', bold: true, color: 'primary', valign: 'middle', field: 'org' });
      k.text(40, 23, W - 54, 8, `${s('common.address')}  ·  ${s('common.phone')}`, { size: 9.5, valign: 'middle' });
      k.rect(14, 36, W - 28, 1.2, { fill: 'primary' });
      k.text(14, 42, W - 28, 13, s('cm.ps.title'), { size: 22, font: 'heading', bold: true, color: 'dark', valign: 'middle' });
      k.text(14, 57, W - 28, 33, s('cm.ps.letter'), { size: 11, lh: 1.35, lineAfter: 3 });
      const info = rows(k, 'cm.ps.info'), icons = ['i:calendar', 'i:clock', 'i:currency-euro', 'i:school'], bw = (W - 34) / 2;
      info.forEach(([a, b], i) => {
        const x = 14 + (i % 2) * (bw + 6), y = 92 + Math.floor(i / 2) * 20;
        k.rect(x, y, bw, 17, { fill: 'light', r: 3 });
        k.art(icons[i], x + 4, y + 4.5, 8, 8, { color: 'primary' });
        k.text(x + 15, y + 1.5, bw - 18, 14, [{ t: a, size: 8, caps: true, tracking: 1, bold: true, color: 'primary' }, { t: b, size: 10.5, bold: true }], { valign: 'middle', lh: 1.15 });
      });
      k.text(14, 134, W - 28, 12, s('cm.ps.return'), { size: 10.5, lh: 1.3, bold: true });
      k.text(14, 147, W - 28, 7, s('cm.ps.sign'), { size: 10.5, italic: true });
      const cut = Math.max(160, H * 0.56);
      cutLine(k, cut);
      const fy = cut + 7, g = Math.min(16, (H - fy - 30) / 5.4);
      k.text(14, fy, W - 28, 10, s('cm.ps.slip'), { size: 13, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      const fw = W - 28;
      field(k, 14, fy + 13, fw * 0.66, s('cm.ps.child')); field(k, 14 + fw * 0.7, fy + 13, fw * 0.3, s('cm.ps.class'));
      k.text(14, fy + 13 + g, fw, 6, s('cm.ps.agree'), { size: 10.5, bold: true, valign: 'middle' });
      tickBox(k, 14, fy + 20 + g, fw / 2, s('cm.ps.money')); tickBox(k, 14 + fw / 2, fy + 20 + g, fw / 2, s('cm.ps.lunch'));
      field(k, 14, fy + 15 + 2 * g, fw, s('cm.ps.medical'));
      field(k, 14, fy + 15 + 3 * g, fw * 0.48, s('cm.ps.emergency')); field(k, 14 + fw * 0.52, fy + 15 + 3 * g, fw * 0.48, s('cm.ps.parent'));
      field(k, 14, fy + 15 + 4 * g, fw * 0.66, s('cm.ps.signed')); field(k, 14 + fw * 0.7, fy + 15 + 4 * g, fw * 0.3, s('cert.date'));
    },
  },
  {
    id: 'cm-sportsday', cat: 'school', name: 'cm.sd.name', scheme: 'coral', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      bunting(k, 6, { n: 12, h: 14 });
      k.text(10, 19, W - 20, 42, s('cm.sd.title'), { size: 72, font: 'heading', align: 'center', valign: 'middle', color: 'primary' });
      k.text(12, 59, W - 24, 9, s('cm.school'), { size: 16, align: 'center', bold: true, color: 'dark', field: 'org' });
      k.rect(24, 71, W - 48, 15, { fill: 'accent', r: 7.5 });
      k.text(28, 71, W - 56, 15, s('cm.sd.when'), { size: 15, align: 'center', valign: 'middle', bold: true, color: 'light' });
      k.circle(W / 2, 118, 27, { fill: 'secondary', opacity: 0.45 });
      k.art('person-running', W / 2 - 24, 94, 48, 48);
      k.art('trophy', 30, 102, 34, 34, { rotate: -8 }); k.art('1st-place-medal', W - 64, 102, 34, 34, { rotate: 8 });
      k.text(14, 152, W - 28, 11, s('cm.sd.events'), { size: 20, font: 'heading', align: 'center', color: 'primary', valign: 'middle' });
      const ev = lines(k, 'cm.sd.list'), hw = (W - 48) / 2;
      ev.forEach((t, i) => {
        const x = 24 + (i % 2) * hw, y = 167 + Math.floor(i / 2) * 12;
        k.art('i:star', x, y + 2, 7, 7, { color: 'primary' });
        k.text(x + 10, y, hw - 12, 11, t, { size: 15, valign: 'middle' });
      });
      const ih = Math.min(36, H - 26 - (167 + Math.ceil(ev.length / 2) * 12 + 4)), iy = (H - 18 + 167 + Math.ceil(ev.length / 2) * 12) / 2 - ih / 2;
      k.rect(20, iy, W - 40, ih, { fill: '#ffffff', r: 4, stroke: 'secondary', sw: 1.2 });
      k.art('sun-with-face', 26, iy + ih / 2 - 11, 22, 22);
      k.text(54, iy + 2, W - 80, ih - 4, s('cm.sd.info'), { size: 13, lh: 1.3, valign: 'middle' });
      k.rect(0, H - 18, W, 18, { fill: 'dark' });
      k.text(12, H - 18, W - 24, 18, s('cm.sd.rain'), { size: 12, align: 'center', valign: 'middle', color: 'light', bold: true });
    },
  },
  {
    id: 'cm-rules', cat: 'school', name: 'cm.ru.name', scheme: 'candy', fonts: 'handwritten',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.star(22, 22, 9, { fill: 'accent' }); k.star(W - 22, 22, 9, { fill: 'accent' });
      k.text(34, 10, W - 68, 26, s('cm.ru.title'), { size: 40, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'primary' });
      const rules = lines(k, 'cm.ru.list'), pics = ['speech-balloon', 'heart-hands', 'flexed-biceps', 'raising-hands', 'backpack', 'broom'];
      const roles = ['primary', 'secondary', 'accent'], y0 = 44, gap = 5, rh = (H - y0 - 30 - gap * (rules.length - 1)) / rules.length;
      rules.forEach((t, i) => {
        const y = y0 + i * (rh + gap), c = roles[i % 3];
        k.rect(14, y, W - 28, rh, { fill: '#ffffff', r: 6, stroke: c, sw: 1.5 });
        k.circle(30, y + rh / 2, 10, { fill: c });
        k.text(20, y + rh / 2 - 10, 20, 20, String(i + 1), { size: 24, bold: true, color: 'light', align: 'center', valign: 'middle', font: 'body' });
        k.text(46, y + 2, W - 46 - 50, rh - 4, t, { size: 24, font: 'heading', bold: true, valign: 'middle', lh: 1.05 });
        k.art(pics[i % pics.length], W - 44, y + rh / 2 - 12, 24, 24);
      });
      k.text(14, H - 25, W - 28, 14, s('cm.ru.sign'), { size: 17, font: 'heading', italic: true, align: 'center', valign: 'middle', color: 'primary' });
    },
  },
  {
    id: 'cm-bookmarks', cat: 'school', name: 'cm.bm.name', scheme: 'royal', fonts: 'slab',
    build(k) {
      const { W, H, s } = k;
      const n = 4, gap = 6, bw = Math.min(46, (W - 24 - gap * (n - 1)) / n), bh = Math.min(190, H - 40);
      const x0 = (W - n * bw - (n - 1) * gap) / 2, y0 = (H - bh) / 2;
      const quotes = lines(k, 'cm.bm.quotes'), pics = ['rocket', 'open-book', 'owl', 'books'];
      const fills = ['primary', 'secondary', 'accent', 'dark'], inks = ['light', 'dark', 'light', 'light'], marks = ['secondary', 'primary', 'secondary', 'secondary'];
      k.text(14, y0 - 14, W - 28, 8, s('cm.bm.cut'), { size: 9, italic: true, align: 'center', color: 'dark' });
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (bw + gap), cx = x + bw / 2, ink = inks[i];
        k.rect(x - 0.5, y0 - 0.5, bw + 1, bh + 1, { fill: 'none', stroke: 'dark', sw: 0.3, dash: [2, 2] });
        k.rect(x, y0, bw, bh, { fill: fills[i] });
        k.circle(cx, y0 + 9, 2.6, { fill: '#ffffff' });
        k.circle(cx, y0 + 36, 17, { fill: 'light', opacity: 0.25 });
        k.art(pics[i], cx - 13, y0 + 23, 26, 26);
        const q = quotes[i] || '', longest = Math.max(...q.split(/\s+/).map((w) => w.length));
        k.text(x + 4, y0 + 60, bw - 8, 64, q, { size: Math.min(17, (bw - 9) / (longest * 0.215)), font: 'heading', bold: true, align: 'center', valign: 'middle', color: ink, lh: 1.1 });
        [-8, 0, 8].forEach((d) => k.star(cx + d, y0 + 132, 2.2, { fill: marks[i] }));
        k.text(x + 3, y0 + bh - 46, bw - 6, 11, s('cm.bm.belongs'), { size: 8.5, align: 'center', valign: 'bottom', bold: true, color: ink, lh: 1.1 });
        k.line(x + 6, y0 + bh - 26, x + bw - 6, y0 + bh - 26, { color: ink, width: 0.5 });
        k.text(x + 3, y0 + bh - 16, bw - 6, 10, s('cm.library'), { size: 7.5, align: 'center', valign: 'middle', color: ink, field: 'org' });
      }
    },
  },
  {
    id: 'cm-lunch', cat: 'school', name: 'cm.lu.name', scheme: 'seaside', fonts: 'friendly', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.art('fork-and-knife-with-plate', W - 42, 8, 28, 28);
      k.text(14, 8, W - 70, 15, s('cm.lu.title'), { size: 28, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      k.text(14, 24, W - 70, 6, s('cm.school'), { size: 9.5, bold: true, caps: true, tracking: 1.2, color: 'primary', field: 'org' });
      k.text(14, 30.5, W - 70, 7, s('cm.lu.week'), { size: 11.5, bold: true, color: 'dark' });
      const days = rows(k, 'cm.lu.days'), labels = s('cm.lu.labels').split('|'), pics = ['spaghetti', 'poultry-leg', 'fish', 'cooked-rice', 'pizza'];
      const n = days.length, gap = 5, cw = (W - 28 - gap * (n - 1)) / n, y0 = 42, ch = H - y0 - 26;
      days.forEach(([day, ...dishes], i) => {
        const x = 14 + i * (cw + gap);
        k.rect(x, y0, cw, ch, { fill: '#ffffff', r: 4 });
        k.rect(x, y0, cw, 13, { fill: i % 2 ? 'secondary' : 'primary', r: 4 });
        k.rect(x, y0 + 8, cw, 5, { fill: i % 2 ? 'secondary' : 'primary' });
        k.text(x + 2, y0, cw - 4, 13, day, { size: 13, bold: true, align: 'center', valign: 'middle', color: i % 2 ? 'dark' : 'light' });
        k.art(pics[i % pics.length], x + cw / 2 - 12, y0 + 17, 24, 24);
        const sec = (ch - 46) / 3;
        dishes.forEach((d, j) => {
          const y = y0 + 45 + j * sec;
          if (j) k.line(x + 8, y - 2, x + cw - 8, y - 2, { color: 'secondary', width: 0.5, dash: [1.5, 1.5] });
          k.text(x + 3, y, cw - 6, 5.5, labels[j], { size: 8, caps: true, tracking: 1, bold: true, color: 'primary', align: 'center' });
          k.text(x + 3, y + 6, cw - 6, sec - 8, d, { size: 12, align: 'center', lh: 1.2 });
        });
      });
      k.art('red-apple', 14, H - 20, 10, 10); k.art('potable-water', 26, H - 20, 10, 10);
      k.text(40, H - 21, W - 54, 12, s('cm.lu.note'), { size: 11, valign: 'middle', bold: true });
    },
  },
  // ============================================================ clubs, charities and groups
  {
    id: 'cm-agenda', cat: 'club', name: 'cm.ag.name', scheme: 'mint', fonts: 'classic',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 5, { fill: 'primary' });
      k.logo(14, 14, 22, 22, { art: 'busts-in-silhouette' });
      k.text(42, 11, W * 0.5 - 30, 15, s('cm.club'), { size: 15, font: 'heading', bold: true, color: 'primary', valign: 'bottom', lh: 1, field: 'org' });
      k.text(42, 27, W * 0.5 - 30, 8, s('cm.ag.meeting'), { size: 10, caps: true, tracking: 1.5, color: 'dark' });
      k.text(14, 42, W * 0.56 - 18, 22, s('cm.ag.title'), { size: Math.min(40, 440 / Math.max(10, s('cm.ag.title').length)), font: 'heading', bold: true, color: 'dark', valign: 'middle' });
      const meta = rows(k, 'cm.ag.meta'), mx = W * 0.56, mw = W - 14 - mx;
      k.rect(mx, 14, mw, 50, { fill: 'light', r: 3 });
      meta.forEach(([a, b], i) => {
        k.text(mx + 5, 18 + i * 11, 26, 9, a, { size: 9, bold: true, caps: true, tracking: 0.8, color: 'primary', valign: 'middle' });
        k.text(mx + 32, 18 + i * 11, mw - 36, 9, b, { size: 10.5, valign: 'middle' });
      });
      k.line(14, 71, W - 14, 71, { color: 'secondary', width: 1 });
      const items = rows(k, 'cm.ag.items'), y0 = 78, rh = (H - y0 - 66) / items.length;
      items.forEach(([t, who, time], i) => {
        const y = y0 + i * rh;
        if (i) k.line(31, y - 2, W - 14, y - 2, { color: 'secondary', width: 0.4, dash: [1, 1.5] });
        k.circle(21, y + 3.6, 5, { fill: 'primary' });
        k.text(16, y - 1.4, 10, 10, String(i + 1), { size: 12, bold: true, color: 'light', align: 'center', valign: 'middle' });
        k.text(31, y, W - 31 - 40, rh - 1, [{ t, size: 12.5, bold: true }, ...(who ? [{ t: who, size: 9.5, italic: true, color: 'primary' }] : [])], { lh: 1.2 });
        k.text(W - 40, y, 26, 8, time, { size: 11.5, bold: true, align: 'right', color: 'accent' });
      });
      const ny = H - 60;
      k.rect(14, ny, W - 28, 44, { fill: 'light', r: 3 });
      k.text(19, ny + 3, W - 38, 8, s('cm.ag.notes'), { size: 12, font: 'heading', bold: true, color: 'primary' });
      for (let i = 0; i < 3; i++) k.line(19, ny + 20 + i * 9, W - 19, ny + 20 + i * 9, { color: 'secondary', width: 0.5, dash: [1, 1.5] });
      k.text(14, H - 13, W - 28, 8, `${s('cm.ag.apologies')} ${s('common.email')}`, { size: 9.5, align: 'center', italic: true });
    },
  },
  {
    id: 'cm-fixtures', cat: 'club', name: 'cm.fx.name', scheme: 'ocean', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 58, { fill: 'primary' });
      k.poly([[W * 0.62, 0], [W, 0], [W, 58], [W * 0.5, 58]], { fill: 'secondary', opacity: 0.35 });
      k.logo(W - 54, 9, 40, 40, { art: 'soccer-ball' });
      k.text(14, 9, W - 84, 8, s('cm.team'), { size: 12, color: 'light', caps: true, tracking: 2, bold: true, field: 'org' });
      k.text(14, 16, W - 84, 30, s('cm.fx.title'), { size: 50, font: 'heading', color: 'light', valign: 'middle' });
      k.text(14, 45, W - 84, 8, s('cm.fx.season'), { size: 13, color: 'accent', bold: true });
      const head = s('cm.fx.head').split('|'), body = rows(k, 'cm.fx.rows').map((r) => [...r, '']);
      const tw = W - 28, cols = [34, 0, 16, 24, 26]; cols[1] = tw - cols.reduce((a, b) => a + b, 0);
      const home = s('cm.fx.home');
      bandTable(k, 14, 66, tw, H - 66 - 34, head, body, { cols, size: 11, headSize: 11, boldFirst: true, headH: 11, aligns: ['left', 'left', 'center', 'center', 'center'], fills: body.map((r) => (r[2] === home ? 'light' : '#ffffff')) });
      k.art('i:map-pin', 14, H - 23, 7, 7, { color: 'primary' });
      k.text(24, H - 25, W - 38, 11, s('cm.fx.ground'), { size: 11, valign: 'middle', bold: true });
      k.text(24, H - 15, W - 38, 8, `${s('cm.fx.key')}  ·  ${s('common.web')}`, { size: 9.5, color: 'primary' });
    },
  },
  {
    id: 'cm-roster', cat: 'club', name: 'cm.ro.name', scheme: 'berry', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 50, { fill: 'primary' });
      k.art('sports-medal', W - 50, 8, 36, 36);
      k.text(14, 8, W - 70, 8, s('cm.team'), { size: 12, caps: true, tracking: 2, bold: true, color: 'light', field: 'org' });
      k.text(14, 16, W - 70, 24, s('cm.ro.title'), { size: 40, font: 'heading', color: 'light', valign: 'middle' });
      k.text(14, 40, W - 70, 7, s('cm.fx.season'), { size: 11, color: 'light', bold: true });
      const pl = rows(k, 'cm.ro.players'), cols = 4, gap = 5, y0 = 57, cw = (W - 28 - gap * (cols - 1)) / cols, rn = Math.ceil(pl.length / cols), ch = (H - y0 - 34 - gap * (rn - 1)) / rn;
      pl.forEach(([name, pos], i) => {
        const x = 14 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap), r = Math.min(19, ch * 0.29), top = y + Math.max(4, (ch - 2 * r - 26) / 2);
        k.rect(x, y, cw, ch, { fill: '#ffffff', r: 3 });
        k.rect(x, y + ch - 2.5, cw, 2.5, { fill: i % 2 ? 'secondary' : 'primary' });
        k.photo(x + cw / 2 - r, top, 2 * r, 2 * r, { round: true });
        k.circle(x + cw / 2 + r * 0.8, top + r * 1.75, 4.6, { fill: 'accent', stroke: '#ffffff', sw: 1 });
        k.text(x + cw / 2 + r * 0.8 - 5, top + r * 1.75 - 4, 10, 8, String([1, 4, 5, 6, 3, 8, 10, 7, 9, 11, 2, 12][i] ?? i + 1), { size: 10, bold: true, align: 'center', valign: 'middle', color: 'dark' });
        k.text(x + 2, top + 2 * r + 4, cw - 4, 7, name, { size: 11, bold: true, align: 'center', valign: 'middle' });
        k.text(x + 2, top + 2 * r + 11, cw - 4, 6, pos, { size: 8.5, caps: true, tracking: 1, align: 'center', color: 'primary', bold: true });
      });
      k.rect(14, H - 28, W - 28, 18, { fill: 'dark', r: 3 });
      k.text(20, H - 28, W - 40, 18, [{ t: s('cm.ro.coach'), bold: true }, { t: `${s('cm.ro.training')}  ·  ${s('common.phone')}` }], { size: 10, color: 'light', valign: 'middle', align: 'center', lh: 1.3 });
    },
  },
  {
    id: 'cm-signup', cat: 'club', name: 'cm.su.name', scheme: 'forest', fonts: 'friendly',
    build(k) {
      const { W, H, s } = k;
      k.art('raising-hands', 14, 10, 30, 30);
      k.text(50, 9, W - 64, 18, s('cm.su.title'), { size: 30, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      k.text(50, 28, W - 64, 8, s('cm.su.event'), { size: 12, bold: true });
      k.text(14, 43, W - 28, 12, s('cm.su.intro'), { size: 10.5, lh: 1.3 });
      const head = s('cm.su.head').split('|'), body = rows(k, 'cm.su.rows').map((r) => [...r, '', '']);
      const tw = W - 28, cols = [30, 48, 0, 46]; cols[2] = tw - cols.reduce((a, b) => a + b, 0);
      bandTable(k, 14, 58, tw, H - 58 - 24, head, body, { cols, size: 10, headSize: 10.5, boldFirst: true, headH: 10 });
      k.art('i:phone', 14, H - 17, 6, 6, { color: 'primary' });
      k.text(23, H - 18.5, W - 37, 9, `${s('cm.su.ask')} ${s('common.phone')}`, { size: 10.5, valign: 'middle', bold: true });
    },
  },
  {
    id: 'cm-raffle', cat: 'club', name: 'cm.ra.name', scheme: 'sunshine', fonts: 'slab',
    build(k) {
      const { W, H, s } = k;
      const n = 5, m = 8, th = (H - 2 * m) / n, sw = 52;
      for (let i = 0; i < n; i++) {
        const y = m + i * th, no = String(i + 1).padStart(3, '0'), x = 10, w = W - 20, h = th - 5;
        if (i) k.line(4, y - 0.5, W - 4, y - 0.5, { color: 'dark', width: 0.3, dash: [2, 2] });
        k.rect(x, y + 2, w, h, { fill: '#ffffff', stroke: 'primary', sw: 1, r: 2.5 });
        k.rect(x + w - 46, y + 2.5, 45.5, h - 1, { fill: 'secondary', opacity: 0.25, r: 2.5 });
        k.rect(x, y + 2, sw, h, { fill: 'light', r: 2.5 });
        k.line(x + sw, y + 3, x + sw, y + 2 + h - 1, { color: 'dark', width: 0.6, dash: [1.5, 1.5] });
        // the stub, kept by the seller
        k.text(x + 3, y + 5, sw - 6, 8, `${s('cm.ra.no')} ${no}`, { size: 13, bold: true, color: 'primary' });
        field(k, x + 3, y + 15, sw - 6, s('cm.ra.buyer'), { gap: 11, size: 7 });
        field(k, x + 3, y + 29, sw - 6, s('cm.ra.phone'), { gap: 11, size: 7 });
        // the ticket
        const tx = x + sw + 5, tw = w - sw - 46;
        k.text(tx, y + 4, tw, 13, s('cm.ra.title'), { size: 24, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
        k.text(tx, y + 17, tw, 6, s('cm.club'), { size: 8.5, caps: true, tracking: 1.2, bold: true, field: 'org' });
        k.text(tx, y + 24, tw, h - 25, [{ t: s('cm.ra.draw'), bold: true, after: 1 }, { t: s('cm.ra.prizes'), size: 8.5 }], { size: 9.5, lh: 1.2 });
        const px = x + w - 22, py = y + 2 + h / 2 - 4;
        k.star(px, py, 14, { points: 16, inner: 0.84, fill: 'accent' });
        k.text(px - 12, py - 9, 24, 18, [{ t: s('cm.ra.price'), size: 17, bold: true }, { t: s('cm.ra.each'), size: 7 }], { color: 'light', align: 'center', valign: 'middle', lh: 1 });
        k.text(px - 20, y + 2 + h - 8, 40, 6, `${s('cm.ra.no')} ${no}`, { size: 9, bold: true, align: 'center', color: 'dark' });
      }
    },
  },
  {
    id: 'cm-ticket', cat: 'club', name: 'cm.tk.name', scheme: 'navy', fonts: 'elegant', size: [180, 64],
    build(k) {
      const { W, H, s } = k;
      const sx = W - 44;
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.rect(sx, 0, 44, H, { fill: 'secondary' });
      k.rect(3, 3, sx - 6, H - 6, { fill: 'none', stroke: 'secondary', sw: 0.6 });
      k.line(sx, 4, sx, H - 4, { color: 'light', width: 0.8, dash: [1.5, 1.5] });
      k.circle(sx, 0, 3.5, { fill: '#ffffff' }); k.circle(sx, H, 3.5, { fill: '#ffffff' });
      k.art('mirror-ball', 9, H / 2 - 13, 26, 26);
      k.text(40, 6, sx - 46, 6, s('cm.club'), { size: 8, caps: true, tracking: 2, color: 'secondary', bold: true, field: 'org' });
      k.text(40, 12, sx - 46, 20, s('cm.tk.title'), { size: 36, font: 'heading', color: 'light', valign: 'middle' });
      k.text(40, 34, sx - 46, 16, [{ t: s('cm.tk.when'), bold: true }, { t: s('cm.tk.where') }], { size: 9.5, color: 'light', lh: 1.3 });
      k.text(40, H - 13, sx - 72, 7, s('cm.tk.dress'), { size: 8, italic: true, color: 'secondary' });
      k.text(sx - 34, H - 17, 26, 10, s('cm.tk.price'), { size: 15, bold: true, color: 'secondary', align: 'right', valign: 'middle', font: 'body' });
      k.text(sx + 3, 8, 38, 8, s('cm.tk.admit'), { size: 9, bold: true, caps: true, tracking: 1.2, align: 'center', color: 'dark' });
      k.text(sx + 3, 20, 38, 12, s('cm.tk.no'), { size: 15, bold: true, align: 'center', valign: 'middle', color: 'dark', font: 'body' });
      k.text(sx + 3, 36, 38, 18, s('cm.tk.short'), { size: 7.5, align: 'center', color: 'dark', lh: 1.25 });
    },
  },
  {
    id: 'cm-badge', cat: 'club', name: 'cm.nb.name', scheme: 'mint', fonts: 'modern', size: [99.1, 57],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 15, { fill: 'primary' });
      k.logo(4, 2.5, 10, 10, { art: 'i:heart', color: 'light' });
      k.text(17, 0, W - 21, 15, s('cm.club'), { size: 10, bold: true, color: 'light', valign: 'middle', field: 'org' });
      k.text(5, 18, W - 10, 18, s('cm.nb.person'), { size: 22, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'dark' });
      k.text(5, 36, W - 10, 7, s('cm.nb.role'), { size: 10, caps: true, tracking: 2, bold: true, align: 'center', color: 'primary' });
      k.rect(0, H - 9, W, 9, { fill: 'accent' });
      k.text(4, H - 9, W - 8, 9, s('cm.nb.event'), { size: 8, caps: true, tracking: 1.5, bold: true, align: 'center', valign: 'middle', color: 'light' });
    },
  },
  {
    id: 'cm-tent', cat: 'club', name: 'cm.tt2.name', scheme: 'mono', fonts: 'elegant', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, hh = H / 2;
      // each half is drawn the same; the top half is turned upside down so both read right once folded
      const half = (flip) => {
        const at = (x, y, w, h) => (flip ? [W - x - w, hh - y - h] : [x, hh + y]);
        const r = (x, y, w, h, o) => { const [X, Y] = at(x, y, w, h); k.rect(X, Y, w, h, o); };
        const t = (x, y, w, h, c, o) => { const [X, Y] = at(x, y, w, h); k.text(X, Y, w, h, c, { ...o, rotate: flip ? 180 : 0 }); };
        r(10, 10, W - 20, hh - 20, { fill: 'none', stroke: 'secondary', sw: 0.8 });
        r(13, 13, W - 26, hh - 26, { fill: 'light', stroke: 'accent', sw: 0.4 });
        r(W / 2 - 60, 24, 34, 0.6, { fill: 'secondary' }); r(W / 2 + 26, 24, 34, 0.6, { fill: 'secondary' });
        [W / 2 - 40, W / 2 + 32].forEach((x) => { const [X, Y] = at(x, 44, 8, 8); k.star(X + 4, Y + 4, 4, { fill: 'accent' }); });
        t(20, 14, W - 40, 20, s('cm.tt2.table'), { size: 34, font: 'heading', align: 'center', valign: 'middle', color: 'dark' });
        t(20, 30, W - 40, 40, '5', { size: 80, align: 'center', valign: 'middle', color: 'accent', font: 'body' });
        t(20, hh - 36, W - 40, 8, s('cm.tt2.event'), { size: 11, caps: true, tracking: 3, align: 'center', bold: true, color: 'dark' });
        t(20, hh - 27, W - 40, 7, s('cm.club'), { size: 10.5, italic: true, align: 'center', color: 'secondary', field: 'org' });
      };
      half(true); half(false);
      k.line(4, hh, W - 4, hh, { color: 'secondary', width: 0.3, dash: [3, 3] });
    },
  },
  {
    id: 'cm-thermo', cat: 'club', name: 'cm.th.name', scheme: 'orange', fonts: 'slab',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.text(14, 14, W - 28, 10, s('cm.th.kicker'), { size: 18, caps: true, tracking: 3, bold: true, align: 'center', color: 'dark' });
      k.text(14, 23, W - 28, 34, s('cm.th.goal'), { size: 68, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'primary' });
      k.text(20, 56, W - 40, 16, s('cm.th.cause'), { size: 16, align: 'center', lh: 1.2 });
      // the thermometer
      const tx = 34, tw = 22, top = 82, bulbY = H - 62, bot = bulbY - 10, lvl = 0.65, ticks = lines(k, 'cm.th.ticks');
      k.rect(tx, top, tw, bulbY - top, { fill: '#ffffff', stroke: 'dark', sw: 1.5, r: tw / 2 });
      k.circle(tx + tw / 2, bulbY + 4, 17, { fill: 'primary', stroke: 'dark', sw: 1.5 });
      const fy = bot - (bot - top - 8) * lvl;
      k.rect(tx + 5, fy, tw - 10, bulbY - fy + 4, { fill: 'primary', r: 2 });
      k.circle(tx + tw / 2, bulbY + 4, 14, { fill: 'primary' });
      ticks.forEach((t, i) => {
        const y = bot - (bot - top - 8) * ((i + 1) / ticks.length);
        k.line(tx + tw, y, tx + tw + 5, y, { color: 'dark', width: 1 });
        k.text(tx + tw + 7, y - 4, 34, 8, t, { size: 11, bold: true, valign: 'middle' });
      });
      // how far we have got
      const bx = 102, bw = W - bx - 14;
      k.poly([[bx - 7, fy], [bx + 1, fy - 5], [bx + 1, fy + 5]], { fill: 'secondary' });
      k.rect(bx, fy - 13, bw, 26, { fill: 'secondary', r: 4 });
      k.text(bx + 4, fy - 13, bw - 8, 26, [{ t: s('cm.th.raised'), size: 22, bold: true, font: 'heading' }, { t: s('cm.th.sofar'), size: 11 }], { align: 'center', valign: 'middle', color: 'dark', lh: 1.1 });
      const hy = Math.max(fy + 22, 150);
      k.text(bx, hy, bw, 10, s('cm.th.how'), { size: 17, font: 'heading', bold: true, color: 'primary' });
      const ways = lines(k, 'cm.th.ways').map((t) => t.replace('{web}', s('common.web'))), icons = ['i:heart', 'i:world', 'i:cake', 'i:gift'];
      infoRows(k, bx, hy + 12, bw, ways.map((t, i) => [icons[i], t]), { size: 11, gap: 12, icon: 6 });
      const py = hy + 12 + ways.length * 12 + 6;
      if (H - 34 - py > 30) k.photo(bx, py, bw, H - 34 - py);
      k.rect(0, H - 26, W, 26, { fill: 'primary' });
      k.text(14, H - 25, W - 28, 13, s('cm.th.thanks'), { size: 15, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'light' });
      k.text(14, H - 13, W / 2 - 17, 9, s('cm.church'), { size: 10, align: 'right', color: 'light', field: 'org' });
      k.text(W / 2 - 3, H - 13, 6, 9, '·', { size: 10, align: 'center', color: 'light' });
      k.text(W / 2 + 3, H - 13, W / 2 - 17, 9, s('common.phone'), { size: 10, color: 'light', field: 'phone' });
    },
  },
  {
    id: 'cm-appeal', cat: 'club', name: 'cm.ap.name', scheme: 'forest', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k;
      k.logo(16, 13, 24, 24, { art: 'heart-hands' });
      k.text(46, 10, W * 0.56 - 40, 17, s('cm.charity'), { size: 17, font: 'heading', bold: true, color: 'primary', valign: 'bottom', lh: 1, field: 'org' });
      k.text(46, 28, W * 0.56 - 40, 10, s('cm.ap.tagline'), { size: 9.5, italic: true, field: 'tagline' });
      k.text(W * 0.6, 13, W * 0.4 - 16, 24, [{ t: s('common.address') }, { t: s('common.phone') }, { t: s('common.email') }, { t: s('cm.ap.regno'), size: 7.5, color: 'primary' }], { size: 8.5, align: 'right', lh: 1.25 });
      k.rect(16, 42, W - 32, 1.4, { fill: 'primary' });
      const cut = H * 0.66;
      const lw = W * 0.6;
      k.text(20, 52, lw - 20, cut - 60, s('cm.ap.letter'), { size: 11.5, lh: 1.4, lineAfter: 6 });
      const sx = lw + 8, sw = W - sx - 16;
      k.rect(sx, 52, sw, cut - 64, { fill: 'light', r: 3 });
      k.art('basket', sx + sw / 2 - 12, 57, 24, 24);
      k.text(sx + 3, 83, sw - 6, 13, s('cm.ap.what'), { size: 12, lh: 1.05, font: 'heading', bold: true, color: 'primary', align: 'center', valign: 'middle' });
      rows(k, 'cm.ap.gifts').forEach(([a, b], i) => {
        const y = 100 + i * ((cut - 14 - 100) / 3);
        k.text(sx + 4, y, sw - 8, 9, a, { size: 18, font: 'heading', bold: true, color: 'primary', align: 'center' });
        k.text(sx + 4, y + 10, sw - 8, 14, b, { size: 9.5, align: 'center', lh: 1.25 });
      });
      cutLine(k, cut);
      const fy = cut + 7, fw = W - 32;
      const g = Math.min(15, (H - fy - 40) / 3.4);
      k.rect(16, fy, fw, Math.min(H - fy - 10, 40 + 2 * g), { fill: 'light', r: 3 });
      k.text(22, fy + 3, fw - 12, 10, s('cm.ap.yes'), { size: 15, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      const amts = s('cm.ap.amounts').split('|'), aw = (fw - 12) / amts.length;
      amts.forEach((a, i) => tickBox(k, 22 + i * aw, fy + 16, aw, a, { size: 11 }));
      field(k, 22, fy + 26, fw * 0.5 - 12, s('cm.ap.fname')); field(k, 16 + fw * 0.5 + 4, fy + 26, fw * 0.5 - 10, s('cm.ap.femail'));
      field(k, 22, fy + 26 + g, fw - 12, s('cm.ap.faddress'));
      k.text(22, fy + 26 + 2 * g, fw - 12, 12, `${s('cm.ap.online')} ${s('common.web')}`, { size: 9.5, italic: true, lh: 1.25 });
    },
  },
  {
    id: 'cm-gratitude', cat: 'club', name: 'cm.gr.name', scheme: 'spring', fonts: 'handwritten', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W / 2, 36, 26, { fill: 'secondary', opacity: 0.4 });
      k.art('heart-hands', W / 2 - 20, 16, 40, 40);
      k.text(10, 64, W - 20, 22, s('cm.gr.title'), { size: 40, font: 'heading', bold: true, align: 'center', valign: 'middle', color: 'primary' });
      k.text(14, 87, W - 28, 9, s('cm.gr.sub'), { size: 12, bold: true, align: 'center' });
      const st = rows(k, 'cm.gr.stats'), roles = ['primary', 'accent', 'secondary'], cw = (W - 24) / 3;
      st.forEach(([n, l], i) => {
        const cx = 12 + cw * i + cw / 2;
        k.circle(cx, 113, 13, { fill: roles[i] });
        k.text(cx - 13, 104, 26, 18, n, { size: 18, bold: true, align: 'center', valign: 'middle', color: i === 2 ? 'dark' : 'light', font: 'body' });
        k.text(cx - cw / 2 + 1, 128, cw - 2, 12, l, { size: 9, align: 'center', lh: 1.15 });
      });
      k.text(16, 144, W - 32, 30, s('cm.gr.text'), { size: 10.5, align: 'center', lh: 1.35 });
      k.text(14, H - 34, W - 28, 9, s('cm.gr.from'), { size: 11, align: 'center', italic: true });
      k.text(14, H - 25, W - 28, 10, s('cm.charity'), { size: 13, font: 'heading', bold: true, align: 'center', color: 'primary', field: 'org' });
      k.rect(0, H - 6, W, 6, { fill: 'primary' });
    },
  },
];

export const en = {
  'cm.church': 'St Mary’s Parish Church', 'cm.school': 'Greenfield Primary School', 'cm.club': 'Riverside Walking Club', 'cm.team': 'Springfield United FC', 'cm.charity': 'Springfield Food Bank', 'cm.library': 'Greenfield School Library',
  'cm.names': 'Anne Hughes\nPeter Grant\nMary Collins\nDavid Lewis\nRuth Morgan\nJohn Baker\nSusan Price\nTom Hughes\nHelen Carter\nMichael Ward\nClaire Evans\nJames Turner\nMargaret Hall\nPaul Roberts\nLinda Shaw',
  // bulletin
  'cm.bul.name': 'Sunday bulletin (folded)', 'cm.bul.title': 'Sunday Bulletin', 'cm.bul.date': 'Third Sunday of Easter · 4 May',
  'cm.bul.welcome': 'Welcome! Whether you are a regular or visiting for the first time, we are so glad you are here.',
  'cm.bul.order': 'Order of Service',
  'cm.bul.items': '#The Gathering\nEntrance hymn|No. 245\nWelcome and greeting|\nPrayer of confession|\n#The Word\nFirst reading|Acts 2:14, 22–33\nPsalm|Psalm 16\nSecond reading|1 Peter 1:17–21\nGospel|Luke 24:13–35\nSermon|Revd Sarah Lewis\n#The Prayers\nPrayers of intercession|\nOffertory hymn|No. 112\n#The Sending Out\nClosing hymn|No. 378\nBlessing and dismissal|',
  'cm.bul.stand': 'Please stand for the hymns if you are able.',
  'cm.bul.notices': 'Notices',
  'cm.bul.notes': 'Coffee after the service|Everyone is welcome to stay for tea, coffee and cake in the church hall.\nChildren’s corner|Books, crayons and soft toys are at the back of the church for little ones.\nFood bank collection|Please leave tins and dry food in the basket by the door. Thank you!\nPrayer requests|Write a name in the prayer book by the font, and we will pray for them this week.',
  'cm.bul.week': 'This week', 'cm.bul.weeklist': 'Tue|Toddler group, 10 am\nWed|Midweek communion, 10 am\nThu|Choir practice, 7.30 pm\nSat|Church garden tidy-up, 9 am',
  'cm.bul.times': 'Service times', 'cm.bul.timelist': 'Sunday|8 am and 10 am\nWednesday|10 am\nFirst Sunday|Family service, 11.30 am',
  'cm.bul.vicar': 'Revd Sarah Lewis, Vicar', 'cm.bul.take': 'Please take this bulletin home with you.',
  // funeral
  'cm.fun.name': 'Funeral order of service (folded)', 'cm.fun.memory': 'In loving memory of', 'cm.fun.person': 'Margaret Anne Wilson', 'cm.fun.dates': '12 March 1941 – 2 October 2027',
  'cm.fun.service': 'A celebration of her life', 'cm.fun.when': 'St Mary’s Parish Church\nFriday 15 October 2027 at 11 am',
  'cm.fun.order': 'Order of Service',
  'cm.fun.items': 'Entrance music|Pie Jesu, Gabriel Fauré\nWelcome|Revd Sarah Lewis\nHymn|The Lord’s My Shepherd\nReading|Ecclesiastes 3:1–8, read by James Wilson\nTribute|Helen Carter, Margaret’s daughter\nPrayers|\nHymn|Abide with Me\nCommendation and farewell|\nExit music|What a Wonderful World',
  'cm.fun.life': 'A Life Well Lived',
  'cm.fun.story': 'Margaret was born in Springfield in 1941, the youngest of four children. She trained as a nurse and cared for patients at the town hospital for almost forty years.\nShe married Robert in 1964, and together they raised three children. Margaret loved her garden, her grandchildren and a good cup of tea, and she was never happier than with her family around the kitchen table.\nShe sang in the church choir for over thirty years and will be remembered for her warmth, her laughter and her kindness to everyone she met.',
  'cm.fun.verse': 'Blessed are those who mourn, for they will be comforted.', 'cm.fun.verseref': 'Matthew 5:4',
  'cm.fun.thanks': 'Thank You',
  'cm.fun.thankstext': 'Margaret’s family would like to thank everyone for their cards, flowers, kind words and support at this sad time. Your love has meant so much to us.',
  'cm.fun.gifts': 'Donations in Margaret’s memory', 'cm.fun.giftstext': 'may be given to St Luke’s Hospice, as you leave the church.',
  'cm.fun.after': 'Everyone is welcome to join the family after the service at The Rose Garden Hotel, Mill Lane.',
  // wedding programme
  'cm.wp.name': 'Wedding order of service', 'cm.wp.kicker': 'The marriage of', 'cm.wp.names': 'Sophie\n&\nJames', 'cm.wp.date': 'Saturday 12 September 2027', 'cm.wp.place': 'St Mary’s Church, Oak Lane', 'cm.wp.time': 'at three o’clock', 'cm.wp.order': 'Order of Service',
  'cm.wp.ordertitle': 'Order of Service',
  'cm.wp.items': 'Entrance of the bride|Canon in D, Pachelbel\nWelcome|Revd Sarah Lewis\nHymn|Love Divine, All Loves Excelling\nReading|1 Corinthians 13, read by Emma Wilson\nThe marriage vows|\nThe giving of rings|\nPrayers|\nSigning of the register|Ave Maria, Schubert\nThe blessing|\nExit of the bride and groom|Wedding March, Mendelssohn',
  'cm.wp.thanks': 'Thank you for sharing our special day. Please join us afterwards at Oakwood Barn.',
  // prayer card
  'cm.pr.name': 'Memorial prayer card', 'cm.pr.years': '1941 – 2027',
  'cm.pr.prayer': 'The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.',
  'cm.pr.ref': 'Psalm 23',
  // carols
  'cm.car.name': 'Carol service programme', 'cm.car.title': 'Carols by Candlelight', 'cm.car.date': 'Sunday 19 December', 'cm.car.time': '6 pm · All welcome',
  'cm.car.after': 'Mince pies and mulled wine after the service',
  'cm.car.prog': 'Programme',
  'cm.car.items': 'Carol|Once in Royal David’s City\nFirst reading|Isaiah 9:2, 6–7\nCarol|O Little Town of Bethlehem\nSecond reading|Luke 1:26–38\nChoir|In the Bleak Midwinter\nThird reading|Luke 2:1–7\nCarol|Silent Night\nGospel|John 1:1–14\nCarol|Hark! The Herald Angels Sing',
  'cm.car.collect': 'Tonight’s collection is for the homeless shelter. Thank you for your kindness.',
  // easter
  'cm.eas.name': 'Easter services poster', 'cm.eas.kicker': 'Join us for', 'cm.eas.title': 'Holy Week and Easter',
  'cm.eas.list': 'Palm Sunday|13|April|10 am|Procession with palms, then Holy Communion\nMaundy Thursday|17|April|7.30 pm|Supper and foot washing, remembering the Last Supper\nGood Friday|18|April|3 pm|A quiet hour at the cross, with music and prayers\nEaster Vigil|19|April|8 pm|The new fire is lit and the Easter candle carried in\nEaster Sunday|20|April|10 am|Festival service with joyful hymns and an egg hunt for children',
  'cm.eas.welcome': 'Everyone is welcome',
  // rota
  'cm.rota.name': 'Church rota', 'cm.rota.title': 'Sunday Rota', 'cm.rota.when': 'September – November 2027', 'cm.rota.service': '10 am service',
  'cm.rota.head': 'Date|Reader|Prayers|Welcome|Flowers|Coffee',
  'cm.rota.dates': '7 September\n14 September\n21 September\n28 September\n5 October\n12 October\n19 October\n26 October\n2 November\n9 November',
  'cm.rota.swap': 'Can’t make your Sunday? Please swap with someone on the list and let the office know:',
  // baptism certificate
  'cm.bc.name': 'Baptism certificate', 'cm.bc.title': 'Certificate of Baptism', 'cm.bc.child': 'Lucas James Taylor',
  'cm.bc.text': 'was baptised in the name of the Father, and of the Son, and of the Holy Spirit', 'cm.bc.date': 'on Sunday 6 June 2027 at',
  'cm.bc.parents': 'Parents', 'cm.bc.parentnames': 'Anna and Mark Taylor', 'cm.bc.god': 'Godparents', 'cm.bc.godnames': 'Claire Evans and Tom Hughes', 'cm.bc.minister': 'Minister', 'cm.bc.seal': 'Church stamp',
  // class newsletter
  'cm.cn.name': 'Class newsletter', 'cm.cn.title': 'Class 3 News', 'cm.cn.sub': 'Autumn term · Week 6 · Mrs Patel', 'cm.cn.learned': 'This week we learned…',
  'cm.cn.subjects': 'Reading|We started our new class book and wrote letters to the main character.\nMaths|We practised adding and taking away numbers up to 100 with lots of games.\nTopic|We found Europe on the globe and learned the names of the seas.',
  'cm.cn.dates': 'Dates for your diary', 'cm.cn.datelist': 'Friday 17 October|Harvest assembly at 9 am, parents welcome\nMonday 20 October|Class photos, please wear full uniform\n27 – 31 October|Half-term holiday\nThursday 6 November|Parents’ evening, 3.30 – 6.30 pm',
  'cm.cn.star': 'Star of the week', 'cm.cn.starname': 'Oliver', 'cm.cn.starwhy': 'for always helping others and trying his very best in maths!',
  'cm.cn.remind': 'Reminders', 'cm.cn.remlist': 'PE kit every Tuesday and Thursday\nLibrary books back on Fridays\nPlease label coats and jumpers\nA healthy snack and a water bottle every day',
  // timetable
  'cm.tt.name': 'Class timetable', 'cm.tt.title': 'Class 4 Timetable', 'cm.tt.sub': 'Mr Bennett · Room 12',
  'cm.tt.head': 'Time|Monday|Tuesday|Wednesday|Thursday|Friday',
  'cm.tt.rows': '8.50|=Registration and assembly\n9.00|Maths|Maths|Maths|Maths|Maths\n10.00|Reading|Spelling|Reading|Spelling|Reading\n10.30|=Break\n10.45|English|English|English|English|English\n12.00|=Lunch\n13.00|Science|History|Art|Geography|Music\n14.00|PE|Computing|PE|French|Golden time\n15.15|=Home time',
  'cm.tt.special': 'PE\nArt\nMusic\nGolden time', 'cm.tt.note': 'Please bring your PE kit on Mondays and Wednesdays.',
  // reading certificate
  'cm.rc.name': 'Reading award', 'cm.rc.title': 'Reading Champion', 'cm.rc.to': 'This award goes to', 'cm.rc.for': 'for reading 25 books this term. Keep turning those pages!', 'cm.rc.teacher': 'Teacher',
  // permission slip
  'cm.ps.name': 'School trip permission slip', 'cm.ps.title': 'School trip: Science Museum',
  'cm.ps.letter': 'Dear parents and carers,\nAs part of our topic on space, Class 4 will visit the Science Museum. The children will see real rockets, take part in a workshop and visit the planetarium. We will travel by coach and be back in time for the end of the school day.',
  'cm.ps.info': 'Date|Tuesday 21 October\nTimes|Leave 9 am · back 3 pm\nCost|€12 (coach and entry)\nPlease bring|Packed lunch, water and a coat',
  'cm.ps.return': 'Please fill in the slip below and return it with the money by Friday 10 October.', 'cm.ps.sign': 'Mrs J. Patel, Class teacher',
  'cm.ps.slip': 'Permission slip · Science Museum trip', 'cm.ps.child': 'Child’s name', 'cm.ps.class': 'Class',
  'cm.ps.agree': 'I give permission for my child to go on the trip.', 'cm.ps.money': 'I enclose €12', 'cm.ps.lunch': 'Please provide a school packed lunch',
  'cm.ps.medical': 'Medical needs or allergies', 'cm.ps.emergency': 'Emergency phone number', 'cm.ps.parent': 'Parent or carer’s name', 'cm.ps.signed': 'Signature',
  // sports day
  'cm.sd.name': 'Sports day poster', 'cm.sd.title': 'Sports Day', 'cm.sd.when': 'Friday 20 June · 1.30 – 3.30 pm', 'cm.sd.events': 'Races and games',
  'cm.sd.list': 'Sprint\nEgg and spoon race\nSack race\nRelay\nTug of war\nObstacle course\nThree-legged race\nParents’ race',
  'cm.sd.info': 'Families are very welcome! Please give your child a hat, sun cream and a water bottle. Ice lollies on sale for 50 cents.',
  'cm.sd.rain': 'If it rains, sports day moves to Monday 23 June.',
  // class rules
  'cm.ru.name': 'Class rules poster', 'cm.ru.title': 'Our Class Rules',
  'cm.ru.list': 'We listen when others are talking\nWe are kind and gentle\nWe always try our best\nWe put our hand up to speak\nWe look after our things\nWe tidy up together',
  'cm.ru.sign': 'Agreed and signed by everyone in Class 2',
  // bookmarks
  'cm.bm.name': 'Bookmarks (4 on a sheet)', 'cm.bm.cut': 'Print, then cut along the dotted lines',
  'cm.bm.quotes': 'Reading takes you places\nEvery book is a new adventure\nBe curious. Read!\nSo many books, so little time', 'cm.bm.belongs': 'This book belongs to',
  // lunch menu
  'cm.lu.name': 'School lunch menu', 'cm.lu.title': 'School Lunch Menu', 'cm.lu.week': 'Week 1 · 8 – 12 September', 'cm.lu.labels': 'Main|Vegetarian|Dessert',
  'cm.lu.days': 'Monday|Spaghetti bolognese|Pasta with tomato sauce|Apple crumble\nTuesday|Roast chicken and potatoes|Cheese and onion pie|Yoghurt and fruit\nWednesday|Fish fingers and peas|Veggie fingers and peas|Chocolate sponge\nThursday|Chicken curry and rice|Lentil curry and rice|Fresh fruit salad\nFriday|Cheese and tomato pizza|Bean burger and salad|Ice cream',
  'cm.lu.note': 'Fresh fruit, salad and water every day. Please tell the kitchen about any allergies.',
  // agenda
  'cm.ag.name': 'Meeting agenda', 'cm.ag.meeting': 'Committee meeting', 'cm.ag.title': 'Agenda',
  'cm.ag.meta': 'Date|Tuesday 9 September\nTime|7.30 pm\nPlace|The Old School Room\nChair|Ruth Morgan',
  'cm.ag.items': 'Welcome and apologies|Chair|7.30\nMinutes of the last meeting|Secretary|7.35\nMatters arising||7.45\nTreasurer’s report|Treasurer|7.50\nSpring walks programme|Walks leader|8.05\nNew members and the website|Membership secretary|8.25\nAny other business||8.40\nDate of the next meeting||8.50',
  'cm.ag.notes': 'Notes', 'cm.ag.apologies': 'If you cannot come, please send your apologies to',
  // fixtures
  'cm.fx.name': 'Sports fixtures', 'cm.fx.title': 'Fixtures', 'cm.fx.season': 'Season 2027/28 · Under-14s',
  'cm.fx.head': 'Date|Opponent|H/A|Kick-off|Score', 'cm.fx.home': 'H',
  'cm.fx.rows': 'Sat 6 Sep|Riverside Rovers|H|10.30\nSat 13 Sep|Oakfield Town|A|11.00\nSat 20 Sep|St Peter’s Juniors|H|10.30\nSat 27 Sep|Millbrook Athletic|A|10.00\nSat 4 Oct|Hillside United|H|10.30\nSat 11 Oct|Westgate Wanderers|A|11.00\nSat 18 Oct|Cup: Northfield FC|H|10.30\nSat 1 Nov|Riverside Rovers|A|10.00\nSat 8 Nov|Oakfield Town|H|10.30\nSat 15 Nov|St Peter’s Juniors|A|11.00\nSat 22 Nov|Millbrook Athletic|H|10.30\nSat 29 Nov|Hillside United|A|10.00',
  'cm.fx.ground': 'Home games at Memorial Park, Station Road. Come and support us!', 'cm.fx.key': 'H = home · A = away',
  // roster
  'cm.ro.name': 'Team roster', 'cm.ro.title': 'Our Squad',
  'cm.ro.players': 'Jack Wilson|Goalkeeper\nNoah Patel|Defender\nLeo Hughes|Defender\nAlfie Turner|Defender\nOscar Davies|Defender\nHarry Evans|Midfielder\nCharlie Shaw|Midfielder\nGeorge Ward|Midfielder\nThomas Hall|Midfielder\nFreddie Price|Forward\nArthur Lewis|Forward\nJacob Morgan|Goalkeeper',
  'cm.ro.coach': 'Coach: Mark Davies · Captain: Harry Evans', 'cm.ro.training': 'Training Tuesdays and Thursdays, 6 pm',
  // sign-up sheet
  'cm.su.name': 'Volunteer sign-up sheet', 'cm.su.title': 'Volunteers needed!', 'cm.su.event': 'Summer Fair · Saturday 14 June · Village Hall',
  'cm.su.intro': 'Can you spare an hour or two? Please write your name next to a job. Every helper makes a big difference. Thank you!',
  'cm.su.head': 'Time|Job|Name|Phone or e-mail',
  'cm.su.rows': '9 – 11 am|Setting up tables\n9 – 11 am|Putting up bunting\n11 am – 1 pm|Cake stall\n11 am – 1 pm|Tombola\n11 am – 1 pm|Car park\n1 – 3 pm|Cake stall\n1 – 3 pm|Children’s games\n1 – 3 pm|Tea and coffee\n2 – 4 pm|Raffle tickets\n2 – 4 pm|Face painting\n4 – 5 pm|Tidying up\n4 – 5 pm|Taking down tables',
  'cm.su.ask': 'Questions? Please call',
  // raffle
  'cm.ra.name': 'Raffle tickets (5 on a sheet)', 'cm.ra.no': 'No.', 'cm.ra.buyer': 'Name', 'cm.ra.phone': 'Phone', 'cm.ra.title': 'Grand Raffle',
  'cm.ra.draw': 'Draw: Saturday 14 June, 4 pm, at the Summer Fair', 'cm.ra.prizes': '1st prize: a weekend for two · 2nd prize: a food hamper · and lots more!',
  'cm.ra.price': '€2', 'cm.ra.each': 'per ticket',
  // ticket
  'cm.tk.name': 'Event ticket', 'cm.tk.title': 'Spring Dance', 'cm.tk.when': 'Saturday 18 April · 7.30 pm until midnight', 'cm.tk.where': 'Village Hall, Church Street', 'cm.tk.dress': 'Dress code: smart', 'cm.tk.price': '€15',
  'cm.tk.admit': 'Admit one', 'cm.tk.no': 'No. 0001', 'cm.tk.short': 'Spring Dance\n18 April',
  // name badge
  'cm.nb.name': 'Name badge for clubs (label)', 'cm.nb.person': 'Sarah Thompson', 'cm.nb.role': 'Volunteer', 'cm.nb.event': 'Summer Fair 2027',
  // table tent
  'cm.tt2.name': 'Table number card (folded)', 'cm.tt2.table': 'Table', 'cm.tt2.event': 'Spring Dinner',
  // thermometer
  'cm.th.name': 'Fundraising thermometer', 'cm.th.kicker': 'Help us raise', 'cm.th.goal': '€5,000', 'cm.th.cause': 'for a new roof on our church hall',
  'cm.th.ticks': '€1,000\n€2,000\n€3,000\n€4,000\n€5,000', 'cm.th.raised': '€3,250', 'cm.th.sofar': 'raised so far. Thank you!',
  'cm.th.how': 'How you can help', 'cm.th.ways': 'Give in the collection after any service\nDonate online at {web}\nBake, walk or run for us\nBring a friend to our coffee mornings',
  'cm.th.thanks': 'Every gift, big or small, makes a difference',
  // appeal letter
  'cm.ap.name': 'Charity appeal letter with reply form', 'cm.ap.tagline': 'No one in our town should go hungry', 'cm.ap.regno': 'Registered charity no. 1234567',
  'cm.ap.letter': 'Dear friend,\nLast winter more families than ever came to us for help. Parents who had lost their jobs, older people living alone, young people starting out with nothing. Every one of them left with a bag of food and a friendly word.\nThis year we expect even more. With your help we can keep our shelves full: €25 buys a week of food for a family of four.\nPlease fill in the form below and send it back to us, or give online. Whatever you can give, thank you for standing with your neighbours.\nWith warm wishes,\nRuth Morgan, Chair of trustees',
  'cm.ap.what': 'What your gift can do', 'cm.ap.gifts': '€10|buys fresh fruit and milk for a family\n€25|fills a food bag for a week\n€50|keeps our van on the road for a month',
  'cm.ap.yes': 'Yes, I would like to help', 'cm.ap.amounts': '€10|€25|€50|€100|Other: ______',
  'cm.ap.fname': 'Name', 'cm.ap.femail': 'E-mail', 'cm.ap.faddress': 'Address', 'cm.ap.online': 'You can also give online at',
  // thank-you card
  'cm.gr.name': 'Charity thank-you card', 'cm.gr.title': 'Thank you!', 'cm.gr.sub': 'Your gift is making a real difference',
  'cm.gr.stats': '1,200|meals served\n85|families helped\n30|new volunteers',
  'cm.gr.text': 'Because of kind people like you, our town is a warmer, friendlier place. We could not do it without you.',
  'cm.gr.from': 'With heartfelt thanks from everyone at',
};


// ---------------------------------------------------------------- the same words in the other languages
const es = {
  'cm.church': 'Parroquia de Santa María', 'cm.school': 'Colegio Los Pinos', 'cm.club': 'Club de Senderismo El Río', 'cm.team': 'C. D. Villanueva', 'cm.charity': 'Banco de Alimentos de Villanueva', 'cm.library': 'Biblioteca del Colegio Los Pinos',
  'cm.names': 'Ana Martínez\nPedro Gómez\nMaría López\nJavier Ruiz\nCarmen Díaz\nJosé Fernández\nLucía Moreno\nManuel Torres\nIsabel Romero\nAntonio Navarro\nElena Gil\nFrancisco Molina\nPilar Ortega\nLuis Serrano\nRosa Castillo',
  'cm.bul.name': 'Hoja parroquial (plegada)', 'cm.bul.title': 'Hoja Parroquial', 'cm.bul.date': 'III Domingo de Pascua · 4 de mayo',
  'cm.bul.welcome': '¡Bienvenidos! Tanto si venís cada domingo como si es la primera vez, nos alegra mucho que estéis aquí.',
  'cm.bul.order': 'Orden de la celebración',
  'cm.bul.items': '#Ritos iniciales\nCanto de entrada|N.º 245\nSaludo y bienvenida|\nActo penitencial|\n#Liturgia de la Palabra\nPrimera lectura|Hch 2,14.22-33\nSalmo|Sal 16\nSegunda lectura|1 Pe 1,17-21\nEvangelio|Lc 24,13-35\nHomilía|P. Javier Ruiz\n#Oración de los fieles\nPreces|\nCanto de ofertorio|N.º 112\n#Rito de conclusión\nCanto final|N.º 378\nBendición y despedida|',
  'cm.bul.stand': 'Si podéis, poneos de pie durante los cantos.',
  'cm.bul.notices': 'Avisos',
  'cm.bul.notes': 'Café después de misa|Todos estáis invitados a un café con pastas en el salón parroquial.\nRincón infantil|Al fondo de la iglesia hay cuentos, lápices y peluches para los más pequeños.\nRecogida de alimentos|Dejad las latas y los alimentos no perecederos en la cesta junto a la puerta. ¡Gracias!\nIntenciones|Escribe un nombre en el libro de intenciones junto a la pila y rezaremos por esa persona esta semana.',
  'cm.bul.week': 'Esta semana', 'cm.bul.weeklist': 'Mar|Grupo de bebés, 10:00\nMié|Misa entre semana, 10:00\nJue|Ensayo del coro, 19:30\nSáb|Limpieza del jardín, 9:00',
  'cm.bul.times': 'Horario de misas', 'cm.bul.timelist': 'Domingo|9:00 y 12:00\nMiércoles|10:00\nPrimer domingo|Misa familiar, 11:30',
  'cm.bul.vicar': 'P. Javier Ruiz, párroco', 'cm.bul.take': 'Podéis llevaros esta hoja a casa.',
  'cm.fun.name': 'Recordatorio de funeral (plegado)', 'cm.fun.memory': 'En memoria de', 'cm.fun.person': 'Carmen López García', 'cm.fun.dates': '12 de marzo de 1941 – 2 de octubre de 2027',
  'cm.fun.service': 'Misa funeral', 'cm.fun.when': 'Parroquia de Santa María\nViernes 15 de octubre de 2027, a las 11:00',
  'cm.fun.order': 'Orden de la celebración',
  'cm.fun.items': 'Música de entrada|Pie Jesu, Gabriel Fauré\nAcogida|P. Javier Ruiz\nCanto|El Señor es mi pastor\nLectura|Eclesiastés 3,1-8, leída por José López\nPalabras de recuerdo|Isabel Romero, su hija\nOración de los fieles|\nCanto|Quédate junto a mí\nÚltima despedida|\nMúsica de salida|What a Wonderful World',
  'cm.fun.life': 'Una vida plena',
  'cm.fun.story': 'Carmen nació en Villanueva en 1941, la menor de cuatro hermanos. Estudió enfermería y cuidó de los enfermos del hospital comarcal durante casi cuarenta años.\nSe casó con Antonio en 1964 y juntos criaron a tres hijos. Le encantaban su huerto, sus nietos y una buena taza de café, y nunca era tan feliz como con toda la familia alrededor de la mesa.\nCantó en el coro de la parroquia durante más de treinta años. La recordaremos por su cariño, su risa y su bondad con todos.',
  'cm.fun.verse': 'Bienaventurados los que lloran, porque ellos serán consolados.', 'cm.fun.verseref': 'Mateo 5,4',
  'cm.fun.thanks': 'Gracias',
  'cm.fun.thankstext': 'La familia de Carmen agradece de corazón las flores, las palabras de cariño y todo el apoyo recibido en estos momentos tan tristes.',
  'cm.fun.gifts': 'Donativos en su memoria', 'cm.fun.giftstext': 'pueden dejarse para el Hospital San Lucas de cuidados paliativos, a la salida.',
  'cm.fun.after': 'Después de la misa, la familia os invita a acompañarla en el Hotel Los Rosales, calle del Molino.',
  'cm.wp.name': 'Librito de boda', 'cm.wp.kicker': 'La boda de', 'cm.wp.names': 'Lucía\n&\nPablo', 'cm.wp.date': 'Sábado, 12 de septiembre de 2027', 'cm.wp.place': 'Iglesia de Santa María', 'cm.wp.time': 'a las cinco de la tarde', 'cm.wp.order': 'Programa de la ceremonia',
  'cm.wp.ordertitle': 'La Ceremonia',
  'cm.wp.items': 'Entrada de la novia|Canon en re, Pachelbel\nAcogida|P. Javier Ruiz\nCanto|Himno al amor\nLectura|1 Corintios 13, leída por Elena Gil\nConsentimiento|\nEntrega de los anillos|\nOración de los fieles|\nFirma de los testigos|Ave María, Schubert\nBendición nupcial|\nSalida de los novios|Marcha nupcial, Mendelssohn',
  'cm.wp.thanks': 'Gracias por compartir con nosotros este día tan especial. Os esperamos después en la Finca El Robledal.',
  'cm.pr.name': 'Recordatorio con oración', 'cm.pr.years': '1941 – 2027',
  'cm.pr.prayer': 'El Señor es mi pastor; nada me faltará. En lugares de verdes pastos me hará descansar; junto a aguas tranquilas me conducirá. Confortará mi alma; me guiará por sendas de justicia por amor de su nombre. Aunque ande en valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo; tu vara y tu cayado me infundirán aliento.',
  'cm.pr.ref': 'Salmo 23',
  'cm.car.name': 'Programa de concierto de villancicos', 'cm.car.title': 'Concierto de Villancicos', 'cm.car.date': 'Domingo 19 de diciembre', 'cm.car.time': '19:00 · Entrada libre',
  'cm.car.after': 'Al terminar, chocolate caliente y turrón para todos',
  'cm.car.prog': 'Programa',
  'cm.car.items': 'Villancico|Noche de paz\nPrimera lectura|Isaías 9,1-6\nVillancico|Campana sobre campana\nSegunda lectura|Lucas 1,26-38\nCoro|Los peces en el río\nTercera lectura|Lucas 2,1-7\nVillancico|Adeste fideles\nEvangelio|Juan 1,1-14\nVillancico|Hacia Belén va una burra',
  'cm.car.collect': 'La colecta de hoy es para el albergue de personas sin hogar. ¡Gracias por vuestra generosidad!',
  'cm.eas.name': 'Cartel de Semana Santa', 'cm.eas.kicker': 'Os invitamos a', 'cm.eas.title': 'Semana Santa y Pascua',
  'cm.eas.list': 'Domingo de Ramos|13|abril|10:00|Bendición de los ramos, procesión y misa\nJueves Santo|17|abril|19:30|Misa de la Cena del Señor y lavatorio de los pies\nViernes Santo|18|abril|17:00|Celebración de la Pasión, con música y oración\nVigilia Pascual|19|abril|22:00|Bendición del fuego nuevo y del cirio pascual\nDomingo de Pascua|20|abril|12:00|Misa de Resurrección y búsqueda de huevos para los niños',
  'cm.eas.welcome': 'Todos sois bienvenidos',
  'cm.rota.name': 'Turnos de la parroquia', 'cm.rota.title': 'Turnos del domingo', 'cm.rota.when': 'Septiembre – noviembre de 2027', 'cm.rota.service': 'Misa de las 12:00',
  'cm.rota.head': 'Fecha|Lector|Preces|Acogida|Flores|Café',
  'cm.rota.dates': '7 de sept.\n14 de sept.\n21 de sept.\n28 de sept.\n5 de oct.\n12 de oct.\n19 de oct.\n26 de oct.\n2 de nov.\n9 de nov.',
  'cm.rota.swap': '¿No puedes venir tu domingo? Cambia el turno con otra persona de la lista y avisa al despacho parroquial:',
  'cm.bc.name': 'Certificado de bautismo', 'cm.bc.title': 'Certificado de Bautismo', 'cm.bc.child': 'Lucas Martínez Gil',
  'cm.bc.text': 'fue bautizado en el nombre del Padre, y del Hijo, y del Espíritu Santo', 'cm.bc.date': 'el domingo 6 de junio de 2027 en',
  'cm.bc.parents': 'Padres', 'cm.bc.parentnames': 'Ana Gil y Marcos Martínez', 'cm.bc.god': 'Padrinos', 'cm.bc.godnames': 'Elena Gil y Tomás Ruiz', 'cm.bc.minister': 'Sacerdote', 'cm.bc.seal': 'Sello parroquial',
  'cm.cn.name': 'Boletín de clase', 'cm.cn.title': 'Noticias de 3.º B', 'cm.cn.sub': 'Primer trimestre · Semana 6 · Laura Pérez', 'cm.cn.learned': 'Esta semana hemos aprendido…',
  'cm.cn.subjects': 'Lectura|Empezamos nuestro nuevo libro de clase y escribimos cartas al protagonista.\nMatemáticas|Practicamos sumas y restas hasta el 100 con muchos juegos.\nSociales|Buscamos Europa en el globo terráqueo y aprendimos los nombres de los mares.',
  'cm.cn.dates': 'Fechas importantes', 'cm.cn.datelist': 'Viernes 17 de octubre|Fiesta de otoño a las 9:00, familias bienvenidas\nLunes 20 de octubre|Fotos de clase, venid con el uniforme completo\n31 de octubre – 3 de noviembre|Puente de Todos los Santos\nJueves 6 de noviembre|Reunión con las familias, 15:30 – 18:30',
  'cm.cn.star': 'Estrella de la semana', 'cm.cn.starname': 'Hugo', 'cm.cn.starwhy': '¡por ayudar siempre a los demás y esforzarse mucho en matemáticas!',
  'cm.cn.remind': 'Recordatorios', 'cm.cn.remlist': 'Ropa de deporte los martes y jueves\nDevolved los libros de la biblioteca los viernes\nMarcad abrigos y jerséis con el nombre\nUn almuerzo sano y una botella de agua cada día',
  'cm.tt.name': 'Horario de clase', 'cm.tt.title': 'Horario de 4.º A', 'cm.tt.sub': 'Tutor: Sr. Navarro · Aula 12',
  'cm.tt.head': 'Hora|Lunes|Martes|Miércoles|Jueves|Viernes',
  'cm.tt.rows': '9:00|=Entrada y asamblea\n9:15|Matemáticas|Matemáticas|Matemáticas|Matemáticas|Matemáticas\n10:15|Lectura|Dictado|Lectura|Dictado|Lectura\n11:00|=Recreo\n11:30|Lengua|Lengua|Lengua|Lengua|Lengua\n12:30|Ciencias|Historia|Plástica|Geografía|Música\n13:30|=Comida\n15:00|Ed. Física|Informática|Ed. Física|Inglés|Juego libre\n16:00|=Salida',
  'cm.tt.special': 'Ed. Física\nPlástica\nMúsica\nJuego libre', 'cm.tt.note': 'Traed la ropa de deporte los lunes y los miércoles.',
  'cm.rc.name': 'Diploma de lectura', 'cm.rc.title': 'Premio a la Lectura', 'cm.rc.to': 'Este premio es para', 'cm.rc.for': 'por leer 25 libros este trimestre. ¡Sigue pasando páginas!', 'cm.rc.teacher': 'Profesor/a',
  'cm.ps.name': 'Autorización para excursión', 'cm.ps.title': 'Excursión: Museo de la Ciencia',
  'cm.ps.letter': 'Estimadas familias:\nDentro de nuestro proyecto sobre el espacio, 4.º A visitará el Museo de la Ciencia. Los niños verán cohetes de verdad, participarán en un taller y visitarán el planetario. Iremos en autocar y volveremos antes de la hora de salida.',
  'cm.ps.info': 'Fecha|Martes 21 de octubre\nHorario|Salida 9:00 · vuelta 15:00\nPrecio|12 € (autocar y entrada)\nQué traer|Almuerzo, agua y un abrigo',
  'cm.ps.return': 'Rellenad la autorización de abajo y entregadla con el dinero antes del viernes 10 de octubre.', 'cm.ps.sign': 'Laura Pérez, tutora de 4.º A',
  'cm.ps.slip': 'Autorización · Excursión al Museo de la Ciencia', 'cm.ps.child': 'Nombre del alumno/a', 'cm.ps.class': 'Curso',
  'cm.ps.agree': 'Autorizo a mi hijo/a a participar en la excursión.', 'cm.ps.money': 'Adjunto 12 €', 'cm.ps.lunch': 'Necesita comida del comedor',
  'cm.ps.medical': 'Necesidades médicas o alergias', 'cm.ps.emergency': 'Teléfono de emergencia', 'cm.ps.parent': 'Nombre del padre, madre o tutor', 'cm.ps.signed': 'Firma',
  'cm.sd.name': 'Cartel de jornada deportiva', 'cm.sd.title': 'Día del Deporte', 'cm.sd.when': 'Viernes 20 de junio · 10:00 – 13:00', 'cm.sd.events': 'Carreras y juegos',
  'cm.sd.list': 'Carrera de velocidad\nHuevo y cuchara\nCarrera de sacos\nRelevos\nTira y afloja\nCircuito de obstáculos\nCarrera a tres pies\nCarrera de padres',
  'cm.sd.info': '¡Las familias son bienvenidas! Traed gorra, crema solar y una botella de agua. Venta de polos a 50 céntimos.',
  'cm.sd.rain': 'Si llueve, la jornada se traslada al lunes 23 de junio.',
  'cm.ru.name': 'Cartel de normas de clase', 'cm.ru.title': 'Nuestras normas',
  'cm.ru.list': 'Escuchamos cuando otros hablan\nSomos amables con todos\nSiempre lo intentamos\nLevantamos la mano para hablar\nCuidamos nuestras cosas\nRecogemos entre todos',
  'cm.ru.sign': 'Aprobadas y firmadas por toda la clase de 2.º',
  'cm.bm.name': 'Marcapáginas (4 por hoja)', 'cm.bm.cut': 'Imprime y recorta por las líneas de puntos',
  'cm.bm.quotes': 'Leer te lleva lejos\nCada libro es una aventura\n¡Sé curioso, lee!\nTantos libros, tan poco tiempo', 'cm.bm.belongs': 'Este libro es de',
  'cm.lu.name': 'Menú del comedor escolar', 'cm.lu.title': 'Menú del Comedor', 'cm.lu.week': 'Semana 1 · 8 – 12 de septiembre', 'cm.lu.labels': 'Primero|Segundo|Postre',
  'cm.lu.days': 'Lunes|Macarrones con tomate|Merluza con ensalada|Fruta del tiempo\nMartes|Lentejas con verduras|Pollo asado con patatas|Yogur\nMiércoles|Crema de calabacín|Albóndigas con arroz|Naranja\nJueves|Paella de verduras|Tortilla de patatas|Natillas\nViernes|Sopa de fideos|Pizza de jamón y queso|Helado',
  'cm.lu.note': 'Pan, agua y fruta todos los días. Avisad a la cocina de cualquier alergia.',
  'cm.ag.name': 'Orden del día de reunión', 'cm.ag.meeting': 'Reunión de la junta directiva', 'cm.ag.title': 'Orden del día',
  'cm.ag.meta': 'Fecha|Martes 9 de septiembre\nHora|19:30\nLugar|Antigua escuela\nPreside|Carmen Díaz',
  'cm.ag.items': 'Bienvenida y excusas|Presidenta|19:30\nLectura del acta anterior|Secretario|19:35\nAsuntos pendientes||19:45\nInforme de tesorería|Tesorera|19:50\nRutas de primavera|Responsable de rutas|20:05\nNuevos socios y página web|Secretaría de socios|20:25\nRuegos y preguntas||20:40\nFecha de la próxima reunión||20:50',
  'cm.ag.notes': 'Notas', 'cm.ag.apologies': 'Si no puedes venir, avisa a',
  'cm.fx.name': 'Calendario de partidos', 'cm.fx.title': 'Partidos', 'cm.fx.season': 'Temporada 2027/28 · Infantil',
  'cm.fx.head': 'Fecha|Rival|C/F|Hora|Resultado', 'cm.fx.home': 'C',
  'cm.fx.rows': 'Sáb 6 sep|C. D. Ribera|C|10:30\nSáb 13 sep|Atlético Robledo|F|11:00\nSáb 20 sep|U. D. San Pedro|C|10:30\nSáb 27 sep|C. F. Molinos|F|10:00\nSáb 4 oct|Deportivo Colina|C|10:30\nSáb 11 oct|C. D. Puerta Oeste|F|11:00\nSáb 18 oct|Copa: Norteño C. F.|C|10:30\nSáb 1 nov|C. D. Ribera|F|10:00\nSáb 8 nov|Atlético Robledo|C|10:30\nSáb 15 nov|U. D. San Pedro|F|11:00\nSáb 22 nov|C. F. Molinos|C|10:30\nSáb 29 nov|Deportivo Colina|F|10:00',
  'cm.fx.ground': 'Partidos en casa en el Campo Municipal, calle de la Estación. ¡Ven a animarnos!', 'cm.fx.key': 'C = en casa · F = fuera',
  'cm.ro.name': 'Plantilla del equipo', 'cm.ro.title': 'Nuestro Equipo',
  'cm.ro.players': 'Pablo García|Portero\nHugo Sánchez|Defensa\nMario Díaz|Defensa\nÁlvaro Ruiz|Defensa\nDiego Romero|Defensa\nAdrián Navarro|Medio\nDaniel Torres|Medio\nMarcos Gil|Medio\nJorge Molina|Medio\nLucas Ortega|Delantero\nIván Serrano|Delantero\nSergio Castillo|Portero',
  'cm.ro.coach': 'Entrenador: Marcos Díaz · Capitán: Adrián Navarro', 'cm.ro.training': 'Entrenamientos martes y jueves, 18:00',
  'cm.su.name': 'Hoja de voluntarios', 'cm.su.title': '¡Se buscan voluntarios!', 'cm.su.event': 'Fiesta de verano · Sábado 14 de junio · Centro Cívico',
  'cm.su.intro': '¿Tienes una o dos horas libres? Escribe tu nombre junto a una tarea. Cada ayuda cuenta. ¡Gracias!',
  'cm.su.head': 'Hora|Tarea|Nombre|Teléfono o e-mail',
  'cm.su.rows': '9 – 11 h|Montar las mesas\n9 – 11 h|Colgar banderines\n11 – 13 h|Puesto de dulces\n11 – 13 h|Tómbola\n11 – 13 h|Aparcamiento\n13 – 15 h|Puesto de dulces\n13 – 15 h|Juegos infantiles\n13 – 15 h|Café y refrescos\n14 – 16 h|Venta de rifas\n14 – 16 h|Pintacaras\n16 – 17 h|Recoger\n16 – 17 h|Desmontar las mesas',
  'cm.su.ask': '¿Dudas? Llama al',
  'cm.ra.name': 'Papeletas de rifa (5 por hoja)', 'cm.ra.no': 'N.º', 'cm.ra.buyer': 'Nombre', 'cm.ra.phone': 'Teléfono', 'cm.ra.title': 'Gran Rifa',
  'cm.ra.draw': 'Sorteo: sábado 14 de junio a las 16:00, en la fiesta de verano', 'cm.ra.prizes': '1.er premio: un fin de semana para dos · 2.º premio: una cesta de productos · ¡y muchos más!',
  'cm.ra.price': '2 €', 'cm.ra.each': 'la papeleta',
  'cm.tk.name': 'Entrada para eventos', 'cm.tk.title': 'Baile de Primavera', 'cm.tk.when': 'Sábado 18 de abril · de 20:00 a 00:00', 'cm.tk.where': 'Centro Cívico, calle de la Iglesia', 'cm.tk.dress': 'Vestimenta: elegante', 'cm.tk.price': '15 €',
  'cm.tk.admit': 'Entrada', 'cm.tk.no': 'N.º 0001', 'cm.tk.short': 'Baile de Primavera\n18 de abril',
  'cm.nb.name': 'Identificador para clubes (etiqueta)', 'cm.nb.person': 'Sara Jiménez', 'cm.nb.role': 'Voluntaria', 'cm.nb.event': 'Fiesta de verano 2027',
  'cm.tt2.name': 'Número de mesa (plegado)', 'cm.tt2.table': 'Mesa', 'cm.tt2.event': 'Cena de primavera',
  'cm.th.name': 'Termómetro de donativos', 'cm.th.kicker': 'Ayúdanos a reunir', 'cm.th.goal': '5.000 €', 'cm.th.cause': 'para el nuevo tejado del salón parroquial',
  'cm.th.ticks': '1.000 €\n2.000 €\n3.000 €\n4.000 €\n5.000 €', 'cm.th.raised': '3.250 €', 'cm.th.sofar': 'recaudados hasta ahora. ¡Gracias!',
  'cm.th.how': 'Cómo puedes ayudar', 'cm.th.ways': 'Deja tu donativo en la colecta de cualquier misa\nDona en línea en {web}\nOrganiza una venta de pasteles o una marcha\nTrae a un amigo a nuestros cafés de los sábados',
  'cm.th.thanks': 'Cada donativo, grande o pequeño, cuenta',
  'cm.ap.name': 'Carta de petición de donativos con cupón', 'cm.ap.tagline': 'Que nadie en nuestro pueblo pase hambre', 'cm.ap.regno': 'Asociación sin ánimo de lucro · CIF G12345678',
  'cm.ap.letter': 'Querido amigo, querida amiga:\nEl invierno pasado acudieron a nosotros más familias que nunca. Padres que se habían quedado sin trabajo, personas mayores que viven solas, jóvenes que empiezan sin nada. Todos se fueron con una bolsa de comida y una palabra amable.\nEste año esperamos aún más. Con tu ayuda podemos mantener llenas las estanterías: con 25 € compramos la comida de una semana para una familia de cuatro.\nRellena el cupón de abajo y envíanoslo, o haz tu donativo en línea. Sea cual sea tu aportación, gracias por estar al lado de tus vecinos.\nUn afectuoso saludo,\nCarmen Díaz, presidenta',
  'cm.ap.what': 'Lo que logra tu donativo', 'cm.ap.gifts': '10 €|compra fruta fresca y leche para una familia\n25 €|llena una bolsa de comida para una semana\n50 €|mantiene nuestra furgoneta en marcha un mes',
  'cm.ap.yes': 'Sí, quiero colaborar', 'cm.ap.amounts': '10 €|25 €|50 €|100 €|Otra: ____',
  'cm.ap.fname': 'Nombre', 'cm.ap.femail': 'E-mail', 'cm.ap.faddress': 'Dirección', 'cm.ap.online': 'También puedes donar en línea en',
  'cm.gr.name': 'Tarjeta de agradecimiento solidaria', 'cm.gr.title': '¡Gracias!', 'cm.gr.sub': 'Tu donativo está cambiando muchas vidas',
  'cm.gr.stats': '1.200|comidas servidas\n85|familias ayudadas\n30|nuevos voluntarios',
  'cm.gr.text': 'Gracias a personas como tú, nuestro pueblo es un lugar más cálido y solidario. Sin ti no sería posible.',
  'cm.gr.from': 'Con todo nuestro agradecimiento, de parte del equipo de',
};

const de = {
  'cm.church': 'Pfarrkirche St. Marien', 'cm.school': 'Grundschule am Lindenhof', 'cm.club': 'Wanderverein Lindenau', 'cm.team': 'SV Blau-Weiß Lindenau', 'cm.charity': 'Lindenauer Tafel e. V.', 'cm.library': 'Schulbücherei am Lindenhof',
  'cm.names': 'Anna Schmidt\nPeter Becker\nMaria Wagner\nThomas Müller\nRuth Hoffmann\nJohannes Weber\nSabine Koch\nMichael Richter\nHelga Klein\nStefan Wolf\nClaudia Schröder\nMartin Neumann\nUrsula Braun\nKlaus Zimmer\nPetra Krüger',
  'cm.bul.name': 'Pfarrbrief (gefaltet)', 'cm.bul.title': 'Pfarrbrief', 'cm.bul.date': '3. Sonntag der Osterzeit · 4. Mai',
  'cm.bul.welcome': 'Herzlich willkommen! Ob Sie jeden Sonntag hier sind oder zum ersten Mal: Wir freuen uns, dass Sie da sind.',
  'cm.bul.order': 'Gottesdienstordnung',
  'cm.bul.items': '#Eröffnung\nEingangslied|GL 245\nBegrüßung|\nSchuldbekenntnis|\n#Wortgottesdienst\nErste Lesung|Apg 2,14.22–33\nAntwortpsalm|Ps 16\nZweite Lesung|1 Petr 1,17–21\nEvangelium|Lk 24,13–35\nPredigt|Pfarrer Michael Richter\n#Gebet\nFürbitten|\nLied zur Gabenbereitung|GL 112\n#Abschluss\nSchlusslied|GL 378\nSegen und Entlassung|',
  'cm.bul.stand': 'Bitte stehen Sie zu den Liedern auf, wenn es Ihnen möglich ist.',
  'cm.bul.notices': 'Vermeldungen',
  'cm.bul.notes': 'Kirchencafé nach dem Gottesdienst|Alle sind herzlich zu Kaffee, Tee und Kuchen ins Pfarrheim eingeladen.\nKinderecke|Hinten in der Kirche liegen Bücher, Stifte und Kuscheltiere für die Kleinen bereit.\nSammlung für die Tafel|Bitte legen Sie Konserven und haltbare Lebensmittel in den Korb an der Tür. Danke!\nGebetsanliegen|Schreiben Sie einen Namen in das Fürbittbuch am Taufbecken. Wir beten diese Woche dafür.',
  'cm.bul.week': 'Diese Woche', 'cm.bul.weeklist': 'Di|Krabbelgruppe, 10 Uhr\nMi|Werktagsmesse, 10 Uhr\nDo|Chorprobe, 19.30 Uhr\nSa|Gartenaktion an der Kirche, 9 Uhr',
  'cm.bul.times': 'Gottesdienste', 'cm.bul.timelist': 'Sonntag|8 und 10 Uhr\nMittwoch|10 Uhr\nJeden 1. Sonntag|Familienmesse, 11.30 Uhr',
  'cm.bul.vicar': 'Pfarrer Michael Richter', 'cm.bul.take': 'Gerne dürfen Sie diesen Pfarrbrief mitnehmen.',
  'cm.fun.name': 'Ablauf der Trauerfeier (gefaltet)', 'cm.fun.memory': 'In liebevoller Erinnerung an', 'cm.fun.person': 'Margarete Anna Weber', 'cm.fun.dates': '12. März 1941 – 2. Oktober 2027',
  'cm.fun.service': 'Trauergottesdienst', 'cm.fun.when': 'Pfarrkirche St. Marien\nFreitag, 15. Oktober 2027, 11 Uhr',
  'cm.fun.order': 'Ablauf der Feier',
  'cm.fun.items': 'Musik zum Eingang|Pie Jesu, Gabriel Fauré\nBegrüßung|Pfarrer Michael Richter\nLied|Der Herr ist mein getreuer Hirt\nLesung|Kohelet 3,1–8, gelesen von Johannes Weber\nNachruf|Helga Klein, Tochter\nFürbitten|\nLied|So nimm denn meine Hände\nVerabschiedung und Segen|\nMusik zum Ausgang|What a Wonderful World',
  'cm.fun.life': 'Ein erfülltes Leben',
  'cm.fun.story': 'Margarete wurde 1941 in Lindenau als jüngstes von vier Kindern geboren. Sie wurde Krankenschwester und pflegte fast vierzig Jahre lang Patienten im Kreiskrankenhaus.\n1964 heiratete sie Robert, gemeinsam zogen sie drei Kinder groß. Sie liebte ihren Garten, ihre Enkel und eine gute Tasse Kaffee – am glücklichsten war sie, wenn die ganze Familie um den Küchentisch saß.\nÜber dreißig Jahre sang sie im Kirchenchor. Wir behalten sie für ihre Herzlichkeit, ihr Lachen und ihre Güte in Erinnerung.',
  'cm.fun.verse': 'Selig sind, die da Leid tragen; denn sie sollen getröstet werden.', 'cm.fun.verseref': 'Matthäus 5,4',
  'cm.fun.thanks': 'Danke',
  'cm.fun.thankstext': 'Margaretes Familie dankt allen von Herzen für die Karten, Blumen, tröstenden Worte und die Unterstützung in dieser schweren Zeit.',
  'cm.fun.gifts': 'Statt Blumen', 'cm.fun.giftstext': 'bitten wir um eine Spende für das Hospiz St. Lukas, gerne am Ausgang der Kirche.',
  'cm.fun.after': 'Im Anschluss sind alle herzlich zum Beisammensein im Hotel Rosengarten, Mühlenweg, eingeladen.',
  'cm.wp.name': 'Kirchenheft zur Hochzeit', 'cm.wp.kicker': 'Die Trauung von', 'cm.wp.names': 'Sophie\n&\nJonas', 'cm.wp.date': 'Samstag, 12. September 2027', 'cm.wp.place': 'Kirche St. Marien, Eichenweg', 'cm.wp.time': 'um 15 Uhr', 'cm.wp.order': 'Ablauf des Gottesdienstes',
  'cm.wp.ordertitle': 'Der Gottesdienst',
  'cm.wp.items': 'Einzug der Braut|Kanon in D, Pachelbel\nBegrüßung|Pfarrer Michael Richter\nLied|Lobe den Herren\nLesung|1. Korinther 13, gelesen von Emma Weber\nTrauversprechen|\nRingwechsel|\nFürbitten|\nUnterschrift|Ave Maria, Schubert\nSegen|\nAuszug des Brautpaares|Hochzeitsmarsch, Mendelssohn',
  'cm.wp.thanks': 'Danke, dass ihr diesen besonderen Tag mit uns teilt. Anschließend feiern wir gemeinsam auf Gut Eichenhof.',
  'cm.pr.name': 'Sterbebild mit Gebet', 'cm.pr.years': '1941 – 2027',
  'cm.pr.prayer': 'Der Herr ist mein Hirte; mir wird nichts mangeln. Er weidet mich auf einer grünen Aue und führet mich zum frischen Wasser. Er erquicket meine Seele; er führet mich auf rechter Straße um seines Namens willen. Und ob ich schon wanderte im finstern Tal, fürchte ich kein Unglück; denn du bist bei mir, dein Stecken und Stab trösten mich.',
  'cm.pr.ref': 'Psalm 23',
  'cm.car.name': 'Programm für ein Adventssingen', 'cm.car.title': 'Adventssingen bei Kerzenschein', 'cm.car.date': 'Sonntag, 19. Dezember', 'cm.car.time': '18 Uhr · Eintritt frei',
  'cm.car.after': 'Im Anschluss Glühwein, Punsch und Plätzchen',
  'cm.car.prog': 'Programm',
  'cm.car.items': 'Lied|Macht hoch die Tür\nErste Lesung|Jesaja 9,1–6\nLied|Es ist ein Ros entsprungen\nZweite Lesung|Lukas 1,26–38\nChor|Maria durch ein Dornwald ging\nDritte Lesung|Lukas 2,1–7\nLied|Stille Nacht, heilige Nacht\nEvangelium|Johannes 1,1–14\nLied|O du fröhliche',
  'cm.car.collect': 'Die heutige Kollekte ist für die Wohnungslosenhilfe bestimmt. Vielen Dank für Ihre Gabe!',
  'cm.eas.name': 'Plakat für Ostergottesdienste', 'cm.eas.kicker': 'Feiern Sie mit uns', 'cm.eas.title': 'Karwoche und Ostern',
  'cm.eas.list': 'Palmsonntag|13|April|10 Uhr|Palmweihe und Prozession, anschließend Messe\nGründonnerstag|17|April|19.30 Uhr|Abendmahlsmesse mit Fußwaschung\nKarfreitag|18|April|15 Uhr|Feier vom Leiden und Sterben Christi\nOsternacht|19|April|21 Uhr|Das Osterfeuer wird entzündet, die Osterkerze hereingetragen\nOstersonntag|20|April|10 Uhr|Festgottesdienst mit Osterliedern und Eiersuche für Kinder',
  'cm.eas.welcome': 'Alle sind herzlich willkommen',
  'cm.rota.name': 'Dienstplan der Gemeinde', 'cm.rota.title': 'Dienstplan Sonntag', 'cm.rota.when': 'September – November 2027', 'cm.rota.service': 'Gottesdienst um 10 Uhr',
  'cm.rota.head': 'Datum|Lesung|Fürbitten|Begrüßung|Blumen|Kirchencafé',
  'cm.rota.dates': '7. September\n14. September\n21. September\n28. September\n5. Oktober\n12. Oktober\n19. Oktober\n26. Oktober\n2. November\n9. November',
  'cm.rota.swap': 'Sie können an Ihrem Sonntag nicht? Bitte tauschen Sie mit jemandem auf der Liste und sagen Sie dem Pfarrbüro Bescheid:',
  'cm.bc.name': 'Taufurkunde', 'cm.bc.title': 'Taufurkunde', 'cm.bc.child': 'Lukas Johannes Becker',
  'cm.bc.text': 'wurde getauft im Namen des Vaters und des Sohnes und des Heiligen Geistes', 'cm.bc.date': 'am Sonntag, 6. Juni 2027, in der',
  'cm.bc.parents': 'Eltern', 'cm.bc.parentnames': 'Anna und Markus Becker', 'cm.bc.god': 'Paten', 'cm.bc.godnames': 'Claudia Schröder und Thomas Koch', 'cm.bc.minister': 'Pfarrer', 'cm.bc.seal': 'Kirchensiegel',
  'cm.cn.name': 'Klassenbrief', 'cm.cn.title': 'Neues aus der 3b', 'cm.cn.sub': 'Herbst · Woche 6 · Frau Wagner', 'cm.cn.learned': 'Das haben wir diese Woche gelernt …',
  'cm.cn.subjects': 'Lesen|Wir haben unser neues Klassenbuch angefangen und Briefe an die Hauptfigur geschrieben.\nMathe|Wir haben Plus- und Minusaufgaben bis 100 mit vielen Spielen geübt.\nSachkunde|Wir haben Europa auf dem Globus gefunden und die Namen der Meere gelernt.',
  'cm.cn.dates': 'Termine', 'cm.cn.datelist': 'Freitag, 17. Oktober|Erntedankfeier um 9 Uhr, Eltern willkommen\nMontag, 20. Oktober|Klassenfoto\n27. – 31. Oktober|Herbstferien\nDonnerstag, 6. November|Elternsprechtag, 15.30 – 18.30 Uhr',
  'cm.cn.star': 'Stern der Woche', 'cm.cn.starname': 'Paul', 'cm.cn.starwhy': 'weil er immer anderen hilft und sich in Mathe so viel Mühe gibt!',
  'cm.cn.remind': 'Bitte denken Sie an', 'cm.cn.remlist': 'Sportzeug jeden Dienstag und Donnerstag\nBüchereibücher freitags zurückgeben\nJacken und Pullis mit Namen versehen\nJeden Tag ein gesundes Frühstück und Wasser',
  'cm.tt.name': 'Stundenplan', 'cm.tt.title': 'Stundenplan Klasse 4a', 'cm.tt.sub': 'Herr Neumann · Raum 12',
  'cm.tt.head': 'Zeit|Montag|Dienstag|Mittwoch|Donnerstag|Freitag',
  'cm.tt.rows': '7.50|=Ankommen und Morgenkreis\n8.00|Mathe|Mathe|Mathe|Mathe|Mathe\n8.45|Deutsch|Deutsch|Deutsch|Deutsch|Deutsch\n9.30|=Große Pause\n9.50|Sachkunde|Englisch|Kunst|Religion|Musik\n10.35|Lesen|Rechtschreibung|Lesen|Rechtschreibung|Lesen\n11.20|=Pause\n11.35|Sport|Englisch|Sport|Werken|Klassenrat\n12.20|=Schulschluss',
  'cm.tt.special': 'Sport\nKunst\nMusik\nKlassenrat', 'cm.tt.note': 'Bitte am Montag und Mittwoch an das Sportzeug denken.',
  'cm.rc.name': 'Leseurkunde', 'cm.rc.title': 'Leseprofi', 'cm.rc.to': 'Diese Urkunde erhält', 'cm.rc.for': 'für 25 gelesene Bücher in diesem Halbjahr. Lies weiter so!', 'cm.rc.teacher': 'Klassenleitung',
  'cm.ps.name': 'Einverständniserklärung für Ausflug', 'cm.ps.title': 'Klassenausflug: Technikmuseum',
  'cm.ps.letter': 'Liebe Eltern,\nim Rahmen unseres Themas „Weltraum“ besucht die Klasse 4a das Technikmuseum. Die Kinder sehen echte Raketen, machen bei einem Workshop mit und besuchen das Planetarium. Wir fahren mit dem Bus und sind zum Schulschluss wieder zurück.',
  'cm.ps.info': 'Datum|Dienstag, 21. Oktober\nZeiten|Abfahrt 8 Uhr · zurück 13 Uhr\nKosten|12 € (Bus und Eintritt)\nBitte mitbringen|Pausenbrot, Getränk und Jacke',
  'cm.ps.return': 'Bitte füllen Sie den Abschnitt unten aus und geben Sie ihn mit dem Geld bis Freitag, 10. Oktober, ab.', 'cm.ps.sign': 'J. Wagner, Klassenlehrerin',
  'cm.ps.slip': 'Rückmeldung · Ausflug ins Technikmuseum', 'cm.ps.child': 'Name des Kindes', 'cm.ps.class': 'Klasse',
  'cm.ps.agree': 'Mein Kind darf am Ausflug teilnehmen.', 'cm.ps.money': '12 € liegen bei', 'cm.ps.lunch': 'Bitte Lunchpaket der Schule',
  'cm.ps.medical': 'Krankheiten oder Allergien', 'cm.ps.emergency': 'Telefon für Notfälle', 'cm.ps.parent': 'Name eines Elternteils', 'cm.ps.signed': 'Unterschrift',
  'cm.sd.name': 'Plakat für ein Sportfest', 'cm.sd.title': 'Sportfest', 'cm.sd.when': 'Freitag, 20. Juni · 9 – 12 Uhr', 'cm.sd.events': 'Wettkämpfe und Spiele',
  'cm.sd.list': 'Sprint\nEierlauf\nSackhüpfen\nStaffellauf\nTauziehen\nHindernislauf\nDreibeinlauf\nElternlauf',
  'cm.sd.info': 'Familien sind herzlich willkommen! Bitte geben Sie Ihrem Kind Sonnenhut, Sonnencreme und eine Trinkflasche mit. Eis am Stiel gibt es für 50 Cent.',
  'cm.sd.rain': 'Bei Regen findet das Sportfest am Montag, 23. Juni, statt.',
  'cm.ru.name': 'Plakat mit Klassenregeln', 'cm.ru.title': 'Unsere Klassenregeln',
  'cm.ru.list': 'Wir hören zu, wenn andere sprechen\nWir sind freundlich zueinander\nWir geben immer unser Bestes\nWir melden uns, bevor wir sprechen\nWir passen auf unsere Sachen auf\nWir räumen gemeinsam auf',
  'cm.ru.sign': 'Gemeinsam beschlossen von der ganzen Klasse 2a',
  'cm.bm.name': 'Lesezeichen (4 pro Blatt)', 'cm.bm.cut': 'Drucken und an den gestrichelten Linien ausschneiden',
  'cm.bm.quotes': 'Lesen öffnet Welten\nJedes Buch ist ein Abenteuer\nSei neugierig. Lies!\nSo viele Bücher, so wenig Zeit', 'cm.bm.belongs': 'Dieses Buch gehört',
  'cm.lu.name': 'Speiseplan der Schule', 'cm.lu.title': 'Speiseplan der Mensa', 'cm.lu.week': 'Woche 1 · 8. – 12. September', 'cm.lu.labels': 'Hauptgericht|Vegetarisch|Nachtisch',
  'cm.lu.days': 'Montag|Spaghetti Bolognese|Nudeln mit Tomatensoße|Apfelkompott\nDienstag|Hähnchen mit Kartoffeln|Gemüsepfanne mit Reis|Joghurt mit Obst\nMittwoch|Fischstäbchen mit Püree|Gemüsebratlinge mit Püree|Schokopudding\nDonnerstag|Hähnchencurry mit Reis|Linsencurry mit Reis|Obstsalat\nFreitag|Pizza Margherita|Kartoffelpuffer mit Apfelmus|Eis',
  'cm.lu.note': 'Jeden Tag frisches Obst, Salat und Wasser. Bitte sagen Sie der Küche Bescheid, wenn Ihr Kind Allergien hat.',
  'cm.ag.name': 'Tagesordnung für Sitzungen', 'cm.ag.meeting': 'Vorstandssitzung', 'cm.ag.title': 'Tagesordnung',
  'cm.ag.meta': 'Datum|Dienstag, 9. September\nZeit|19.30 Uhr\nOrt|Alte Schule, Raum 2\nLeitung|Ruth Hoffmann',
  'cm.ag.items': 'Begrüßung und Entschuldigungen|Vorsitzende|19.30\nProtokoll der letzten Sitzung|Schriftführer|19.35\nOffene Punkte||19.45\nKassenbericht|Kassenwartin|19.50\nWanderprogramm Frühjahr|Wanderwart|20.05\nNeue Mitglieder und Webseite|Mitgliederbetreuung|20.25\nVerschiedenes||20.40\nTermin der nächsten Sitzung||20.50',
  'cm.ag.notes': 'Notizen', 'cm.ag.apologies': 'Wenn Sie nicht kommen können, melden Sie sich bitte ab bei',
  'cm.fx.name': 'Spielplan', 'cm.fx.title': 'Spielplan', 'cm.fx.season': 'Saison 2027/28 · C-Jugend',
  'cm.fx.head': 'Datum|Gegner|H/A|Anstoß|Ergebnis', 'cm.fx.home': 'H',
  'cm.fx.rows': 'Sa 6.9.|TSV Rheinfeld|H|10.30\nSa 13.9.|FC Eichstädt|A|11.00\nSa 20.9.|SpVgg St. Peter|H|10.30\nSa 27.9.|SV Mühlbach|A|10.00\nSa 4.10.|TuS Hohenberg|H|10.30\nSa 11.10.|FC Westtor|A|11.00\nSa 18.10.|Pokal: VfB Nordheim|H|10.30\nSa 1.11.|TSV Rheinfeld|A|10.00\nSa 8.11.|FC Eichstädt|H|10.30\nSa 15.11.|SpVgg St. Peter|A|11.00\nSa 22.11.|SV Mühlbach|H|10.30\nSa 29.11.|TuS Hohenberg|A|10.00',
  'cm.fx.ground': 'Heimspiele im Waldstadion, Bahnhofstraße. Kommt vorbei und feuert uns an!', 'cm.fx.key': 'H = Heimspiel · A = Auswärtsspiel',
  'cm.ro.name': 'Mannschaftskader', 'cm.ro.title': 'Unser Team',
  'cm.ro.players': 'Jonas Müller|Tor\nLeon Schmidt|Abwehr\nFinn Weber|Abwehr\nLuca Becker|Abwehr\nElias Wagner|Abwehr\nPaul Hoffmann|Mittelfeld\nBen Koch|Mittelfeld\nNoah Richter|Mittelfeld\nFelix Klein|Mittelfeld\nMax Wolf|Sturm\nEmil Schröder|Sturm\nJakob Neumann|Tor',
  'cm.ro.coach': 'Trainer: Markus Braun · Kapitän: Paul Hoffmann', 'cm.ro.training': 'Training dienstags und donnerstags, 18 Uhr',
  'cm.su.name': 'Liste für Helfer', 'cm.su.title': 'Helfer gesucht!', 'cm.su.event': 'Sommerfest · Samstag, 14. Juni · Gemeindehaus',
  'cm.su.intro': 'Haben Sie ein, zwei Stunden Zeit? Bitte tragen Sie sich bei einer Aufgabe ein. Jede helfende Hand zählt. Vielen Dank!',
  'cm.su.head': 'Zeit|Aufgabe|Name|Telefon oder E-Mail',
  'cm.su.rows': '9 – 11 Uhr|Tische aufbauen\n9 – 11 Uhr|Wimpel aufhängen\n11 – 13 Uhr|Kuchenstand\n11 – 13 Uhr|Tombola\n11 – 13 Uhr|Parkplatz\n13 – 15 Uhr|Kuchenstand\n13 – 15 Uhr|Kinderspiele\n13 – 15 Uhr|Kaffee und Tee\n14 – 16 Uhr|Losverkauf\n14 – 16 Uhr|Kinderschminken\n16 – 17 Uhr|Aufräumen\n16 – 17 Uhr|Tische abbauen',
  'cm.su.ask': 'Fragen? Bitte anrufen unter',
  'cm.ra.name': 'Lose für eine Tombola (5 pro Blatt)', 'cm.ra.no': 'Nr.', 'cm.ra.buyer': 'Name', 'cm.ra.phone': 'Telefon', 'cm.ra.title': 'Große Tombola',
  'cm.ra.draw': 'Ziehung: Samstag, 14. Juni, 16 Uhr, beim Sommerfest', 'cm.ra.prizes': '1. Preis: ein Wochenende für zwei · 2. Preis: ein Präsentkorb · und viele mehr!',
  'cm.ra.price': '2 €', 'cm.ra.each': 'pro Los',
  'cm.tk.name': 'Eintrittskarte', 'cm.tk.title': 'Frühlingsball', 'cm.tk.when': 'Samstag, 18. April · 19.30 bis 24 Uhr', 'cm.tk.where': 'Gemeindehaus, Kirchstraße', 'cm.tk.dress': 'Kleidung: festlich', 'cm.tk.price': '15 €',
  'cm.tk.admit': 'Einlass', 'cm.tk.no': 'Nr. 0001', 'cm.tk.short': 'Frühlingsball\n18. April',
  'cm.nb.name': 'Namensschild für Vereine (Etikett)', 'cm.nb.person': 'Sabine Schäfer', 'cm.nb.role': 'Helferin', 'cm.nb.event': 'Sommerfest 2027',
  'cm.tt2.name': 'Tischnummer (gefaltet)', 'cm.tt2.table': 'Tisch', 'cm.tt2.event': 'Frühlingsessen',
  'cm.th.name': 'Spendenbarometer', 'cm.th.kicker': 'Unser Spendenziel', 'cm.th.goal': '5.000 €', 'cm.th.cause': 'für ein neues Dach auf unserem Gemeindehaus',
  'cm.th.ticks': '1.000 €\n2.000 €\n3.000 €\n4.000 €\n5.000 €', 'cm.th.raised': '3.250 €', 'cm.th.sofar': 'sind schon zusammengekommen. Danke!',
  'cm.th.how': 'So können Sie helfen', 'cm.th.ways': 'Spenden Sie in der Kollekte nach dem Gottesdienst\nOnline spenden unter {web}\nBacken, wandern oder laufen Sie für uns\nBringen Sie Freunde zum Kirchencafé mit',
  'cm.th.thanks': 'Jede Spende, ob groß oder klein, hilft',
  'cm.ap.name': 'Spendenbrief mit Antwortabschnitt', 'cm.ap.tagline': 'Niemand in unserer Stadt soll hungern', 'cm.ap.regno': 'Gemeinnütziger Verein · VR 1234',
  'cm.ap.letter': 'Liebe Freundinnen und Freunde,\nim letzten Winter kamen mehr Familien zu uns als je zuvor. Eltern, die ihre Arbeit verloren hatten, ältere Menschen, die allein leben, junge Leute, die mit nichts anfangen. Alle gingen mit einer Tüte Lebensmittel und einem freundlichen Wort nach Hause.\nIn diesem Jahr erwarten wir noch mehr. Mit Ihrer Hilfe bleiben unsere Regale voll: 25 € reichen für eine Woche Lebensmittel für eine vierköpfige Familie.\nBitte schicken Sie uns den Abschnitt unten zurück oder spenden Sie online. Danke, dass Sie Ihren Nachbarn zur Seite stehen!\nMit herzlichen Grüßen\nRuth Hoffmann, Vorsitzende',
  'cm.ap.what': 'Das bewirkt Ihre Spende', 'cm.ap.gifts': '10 €|Obst und Milch für eine Familie\n25 €|eine Woche Lebensmittel für eine Familie\n50 €|einen Monat Sprit für unseren Lieferwagen',
  'cm.ap.yes': 'Ja, ich möchte helfen', 'cm.ap.amounts': '10 €|25 €|50 €|100 €|Betrag: ____',
  'cm.ap.fname': 'Name', 'cm.ap.femail': 'E-Mail', 'cm.ap.faddress': 'Anschrift', 'cm.ap.online': 'Sie können auch online spenden unter',
  'cm.gr.name': 'Dankeskarte für Spender', 'cm.gr.title': 'Danke!', 'cm.gr.sub': 'Ihre Spende bewirkt so viel',
  'cm.gr.stats': '1.200|ausgegebene Mahlzeiten\n85|unterstützte Familien\n30|neue Ehrenamtliche',
  'cm.gr.text': 'Dank Menschen wie Ihnen ist unsere Stadt ein wärmerer, freundlicherer Ort. Ohne Sie wäre das nicht möglich.',
  'cm.gr.from': 'Mit herzlichem Dank von allen bei der',
};
const fr = {
  'cm.church': 'Paroisse Sainte-Marie', 'cm.school': 'École primaire des Tilleuls', 'cm.club': 'Club de randonnée du Val', 'cm.team': 'US Saint-Julien', 'cm.charity': 'Épicerie solidaire de Saint-Julien', 'cm.library': 'Bibliothèque de l’école des Tilleuls',
  'cm.names': 'Anne Martin\nPierre Bernard\nMarie Dubois\nJacques Thomas\nCatherine Robert\nJean Petit\nSylvie Durand\nMichel Leroy\nHélène Moreau\nPhilippe Simon\nClaire Laurent\nFrançois Lefèvre\nMonique Michel\nAlain Garcia\nNathalie Roux',
  'cm.bul.name': 'Feuille paroissiale (pliée)', 'cm.bul.title': 'Feuille dominicale', 'cm.bul.date': '3e dimanche de Pâques · 4 mai',
  'cm.bul.welcome': 'Bienvenue ! Que vous veniez chaque dimanche ou pour la première fois, nous sommes heureux de vous accueillir.',
  'cm.bul.order': 'Déroulement de la messe',
  'cm.bul.items': '#Ouverture\nChant d’entrée|n° 245\nAccueil et salutation|\nPréparation pénitentielle|\n#Liturgie de la Parole\nPremière lecture|Ac 2, 14.22-33\nPsaume|Ps 15\nDeuxième lecture|1 P 1, 17-21\nÉvangile|Lc 24, 13-35\nHomélie|Père Michel Leroy\n#Prière universelle\nIntentions de prière|\nChant d’offertoire|n° 112\n#Envoi\nChant final|n° 378\nBénédiction et envoi|',
  'cm.bul.stand': 'Merci de vous lever pour les chants si vous le pouvez.',
  'cm.bul.notices': 'Annonces',
  'cm.bul.notes': 'Café après la messe|Vous êtes tous invités à partager un café et une part de gâteau à la salle paroissiale.\nCoin des enfants|Des livres, des crayons et des peluches attendent les plus petits au fond de l’église.\nCollecte alimentaire|Merci de déposer conserves et denrées sèches dans le panier près de la porte.\nIntentions de prière|Inscrivez un prénom dans le cahier près des fonts baptismaux : nous prierons pour cette personne cette semaine.',
  'cm.bul.week': 'Cette semaine', 'cm.bul.weeklist': 'Mar.|Éveil des tout-petits, 10 h\nMer.|Messe en semaine, 10 h\nJeu.|Répétition de la chorale, 19 h 30\nSam.|Entretien du jardin, 9 h',
  'cm.bul.times': 'Horaires des messes', 'cm.bul.timelist': 'Dimanche|9 h et 11 h\nMercredi|10 h\n1er dimanche du mois|Messe des familles, 11 h 30',
  'cm.bul.vicar': 'Père Michel Leroy, curé', 'cm.bul.take': 'Vous pouvez emporter cette feuille chez vous.',
  'cm.fun.name': 'Livret d’obsèques (plié)', 'cm.fun.memory': 'En souvenir de', 'cm.fun.person': 'Marguerite Anne Dubois', 'cm.fun.dates': '12 mars 1941 – 2 octobre 2027',
  'cm.fun.service': 'Célébration des obsèques', 'cm.fun.when': 'Église Sainte-Marie\nVendredi 15 octobre 2027 à 11 h',
  'cm.fun.order': 'La célébration',
  'cm.fun.items': 'Musique d’entrée|Pie Jesu, Gabriel Fauré\nAccueil|Père Michel Leroy\nChant|Le Seigneur est mon berger\nLecture|Ecclésiaste 3, 1-8, lue par Jean Dubois\nHommage|Hélène Moreau, sa fille\nPrière universelle|\nChant|Je vous ai choisis\nUltime adieu|\nMusique de sortie|What a Wonderful World',
  'cm.fun.life': 'Une vie bien remplie',
  'cm.fun.story': 'Marguerite est née à Saint-Julien en 1941, la plus jeune de quatre enfants. Devenue infirmière, elle a soigné les malades de l’hôpital de la ville pendant près de quarante ans.\nElle a épousé Robert en 1964 et ensemble ils ont élevé trois enfants. Elle aimait son jardin, ses petits-enfants et une bonne tasse de thé, et n’était jamais aussi heureuse qu’avec toute la famille autour de la table.\nElle a chanté dans la chorale paroissiale pendant plus de trente ans. Nous garderons le souvenir de sa chaleur, de son rire et de sa bonté.',
  'cm.fun.verse': 'Heureux les affligés, car ils seront consolés !', 'cm.fun.verseref': 'Matthieu 5, 4',
  'cm.fun.thanks': 'Merci',
  'cm.fun.thankstext': 'La famille de Marguerite vous remercie pour les cartes, les fleurs, les mots de réconfort et le soutien reçus en ces moments difficiles.',
  'cm.fun.gifts': 'En mémoire de Marguerite', 'cm.fun.giftstext': 'vous pouvez faire un don à la maison de soins palliatifs Saint-Luc, à la sortie.',
  'cm.fun.after': 'À l’issue de la cérémonie, la famille vous invite à la rejoindre à l’Hôtel La Roseraie, rue du Moulin.',
  'cm.wp.name': 'Livret de messe de mariage', 'cm.wp.kicker': 'Le mariage de', 'cm.wp.names': 'Sophie\n&\nJulien', 'cm.wp.date': 'Samedi 12 septembre 2027', 'cm.wp.place': 'Église Sainte-Marie, rue des Chênes', 'cm.wp.time': 'à quinze heures', 'cm.wp.order': 'Livret de célébration',
  'cm.wp.ordertitle': 'La Célébration',
  'cm.wp.items': 'Entrée de la mariée|Canon en ré, Pachelbel\nAccueil|Père Michel Leroy\nChant|Que tes œuvres sont belles\nLecture|1 Corinthiens 13, lue par Emma Dubois\nÉchange des consentements|\nRemise des alliances|\nPrière universelle|\nSignature des registres|Ave Maria, Schubert\nBénédiction nuptiale|\nSortie des mariés|Marche nuptiale, Mendelssohn',
  'cm.wp.thanks': 'Merci de partager ce jour si particulier avec nous. Nous vous attendons ensuite au Domaine des Chênes.',
  'cm.pr.name': 'Image souvenir avec prière', 'cm.pr.years': '1941 – 2027',
  'cm.pr.prayer': 'L’Éternel est mon berger : je ne manquerai de rien. Il me fait reposer dans de verts pâturages, il me dirige près des eaux paisibles. Il restaure mon âme, il me conduit dans les sentiers de la justice, à cause de son nom. Quand je marche dans la vallée de l’ombre de la mort, je ne crains aucun mal, car tu es avec moi : ta houlette et ton bâton me rassurent.',
  'cm.pr.ref': 'Psaume 23',
  'cm.car.name': 'Programme de concert de Noël', 'cm.car.title': 'Chants de Noël aux chandelles', 'cm.car.date': 'Dimanche 19 décembre', 'cm.car.time': '18 h · Entrée libre',
  'cm.car.after': 'Vin chaud et petits gâteaux après le concert',
  'cm.car.prog': 'Programme',
  'cm.car.items': 'Chant|Il est né, le divin Enfant\nPremière lecture|Isaïe 9, 1-6\nChant|Les anges dans nos campagnes\nDeuxième lecture|Luc 1, 26-38\nChorale|Douce nuit\nTroisième lecture|Luc 2, 1-7\nChant|Peuple fidèle\nÉvangile|Jean 1, 1-14\nChant|Minuit, chrétiens',
  'cm.car.collect': 'La quête de ce soir est destinée à l’accueil de nuit des sans-abri. Merci pour votre générosité.',
  'cm.eas.name': 'Affiche de la Semaine sainte', 'cm.eas.kicker': 'Venez célébrer', 'cm.eas.title': 'Semaine sainte et Pâques',
  'cm.eas.list': 'Dimanche des Rameaux|13|avril|10 h|Bénédiction des rameaux, procession et messe\nJeudi saint|17|avril|19 h 30|Messe de la Cène du Seigneur et lavement des pieds\nVendredi saint|18|avril|15 h|Chemin de croix, prière et musique\nVeillée pascale|19|avril|21 h|Bénédiction du feu nouveau et du cierge pascal\nDimanche de Pâques|20|avril|10 h 30|Messe de la Résurrection et chasse aux œufs pour les enfants',
  'cm.eas.welcome': 'Tout le monde est le bienvenu',
  'cm.rota.name': 'Planning des services', 'cm.rota.title': 'Planning du dimanche', 'cm.rota.when': 'Septembre – novembre 2027', 'cm.rota.service': 'Messe de 10 h 30',
  'cm.rota.head': 'Date|Lecture|Prières|Accueil|Fleurs|Café',
  'cm.rota.dates': '7 septembre\n14 septembre\n21 septembre\n28 septembre\n5 octobre\n12 octobre\n19 octobre\n26 octobre\n2 novembre\n9 novembre',
  'cm.rota.swap': 'Vous n’êtes pas disponible ? Échangez avec une personne de la liste et prévenez le secrétariat :',
  'cm.bc.name': 'Certificat de baptême', 'cm.bc.title': 'Certificat de Baptême', 'cm.bc.child': 'Lucas Jean Martin',
  'cm.bc.text': 'a été baptisé au nom du Père, et du Fils, et du Saint-Esprit', 'cm.bc.date': 'le dimanche 6 juin 2027,',
  'cm.bc.parents': 'Parents', 'cm.bc.parentnames': 'Anne et Marc Martin', 'cm.bc.god': 'Parrain et marraine', 'cm.bc.godnames': 'Claire Laurent et Thomas Bernard', 'cm.bc.minister': 'Le prêtre', 'cm.bc.seal': 'Cachet de la paroisse',
  'cm.cn.name': 'Lettre de la classe', 'cm.cn.title': 'Les nouvelles du CE2', 'cm.cn.sub': 'Période 1 · Semaine 6 · Mme Dubois', 'cm.cn.learned': 'Cette semaine, nous avons appris…',
  'cm.cn.subjects': 'Lecture|Nous avons commencé notre nouveau livre et écrit des lettres au héros de l’histoire.\nMaths|Nous avons pratiqué additions et soustractions jusqu’à 100 avec plein de jeux.\nGéographie|Nous avons trouvé l’Europe sur le globe et appris le nom des mers.',
  'cm.cn.dates': 'Dates à retenir', 'cm.cn.datelist': 'Jeudi 9 octobre|Photo de classe\nVendredi 17 octobre|Fête des récoltes à 9 h, parents bienvenus\n18 octobre – 3 novembre|Vacances de la Toussaint\nJeudi 6 novembre|Réunion parents-professeurs, 16 h 30 – 18 h 30',
  'cm.cn.star': 'L’étoile de la semaine', 'cm.cn.starname': 'Louis', 'cm.cn.starwhy': 'pour son aide auprès des autres et ses gros efforts en maths !',
  'cm.cn.remind': 'À ne pas oublier', 'cm.cn.remlist': 'Tenue de sport le mardi et le jeudi\nLivres de bibliothèque à rendre le vendredi\nMarquez le nom sur les manteaux et pulls\nUn goûter sain et une gourde chaque jour',
  'cm.tt.name': 'Emploi du temps', 'cm.tt.title': 'Emploi du temps · CM1', 'cm.tt.sub': 'M. Simon · Salle 12',
  'cm.tt.head': 'Heure|Lundi|Mardi|Mercredi|Jeudi|Vendredi',
  'cm.tt.rows': '8 h 20|=Accueil\n8 h 30|Français|Français|Français|Français|Français\n9 h 30|Mathématiques|Mathématiques|Mathématiques|Mathématiques|Mathématiques\n10 h 30|=Récréation\n10 h 45|Lecture|Dictée|Lecture|Dictée|Lecture\n12 h|=Cantine\n13 h 30|Sciences|Histoire|Arts plastiques|Géographie|Musique\n14 h 30|EPS|Informatique|EPS|Anglais|Jeux de société\n16 h 30|=Sortie',
  'cm.tt.special': 'EPS\nArts plastiques\nMusique\nJeux de société', 'cm.tt.note': 'Pensez à la tenue de sport le lundi et le mercredi.',
  'cm.rc.name': 'Diplôme de lecture', 'cm.rc.title': 'As de la lecture', 'cm.rc.to': 'Ce diplôme est décerné à', 'cm.rc.for': 'pour avoir lu 25 livres ce trimestre. Continue à tourner les pages !', 'cm.rc.teacher': 'Enseignant',
  'cm.ps.name': 'Autorisation de sortie scolaire', 'cm.ps.title': 'Sortie scolaire : Cité des sciences',
  'cm.ps.letter': 'Chers parents,\nDans le cadre de notre projet sur l’espace, la classe de CM1 visitera la Cité des sciences. Les enfants verront de vraies fusées, participeront à un atelier et découvriront le planétarium. Nous voyagerons en car et serons de retour pour la fin de la journée.',
  'cm.ps.info': 'Date|Mardi 21 octobre\nHoraires|Départ 9 h · retour 16 h\nParticipation|12 € (car et entrée)\nÀ prévoir|Pique-nique, eau et manteau',
  'cm.ps.return': 'Merci de remplir le coupon ci-dessous et de le rendre avec la participation avant le vendredi 10 octobre.', 'cm.ps.sign': 'Mme J. Dubois, enseignante',
  'cm.ps.slip': 'Autorisation · Sortie à la Cité des sciences', 'cm.ps.child': 'Nom de l’enfant', 'cm.ps.class': 'Classe',
  'cm.ps.agree': 'J’autorise mon enfant à participer à la sortie.', 'cm.ps.money': 'Je joins 12 €', 'cm.ps.lunch': 'Pique-nique fourni par la cantine',
  'cm.ps.medical': 'Problèmes de santé ou allergies', 'cm.ps.emergency': 'Téléphone en cas d’urgence', 'cm.ps.parent': 'Nom du parent', 'cm.ps.signed': 'Signature',
  'cm.sd.name': 'Affiche de journée sportive', 'cm.sd.title': 'Fête du sport', 'cm.sd.when': 'Vendredi 20 juin · 13 h 30 – 16 h 30', 'cm.sd.events': 'Courses et jeux',
  'cm.sd.list': 'Sprint\nCourse à l’œuf\nCourse en sac\nRelais\nTir à la corde\nParcours d’obstacles\nCourse à trois jambes\nCourse des parents',
  'cm.sd.info': 'Les familles sont les bienvenues ! Pensez à la casquette, à la crème solaire et à une gourde. Glaces en vente à 50 centimes.',
  'cm.sd.rain': 'En cas de pluie, la fête est reportée au lundi 23 juin.',
  'cm.ru.name': 'Affiche des règles de classe', 'cm.ru.title': 'Nos règles de classe',
  'cm.ru.list': 'Nous écoutons quand les autres parlent\nNous sommes gentils les uns avec les autres\nNous faisons toujours de notre mieux\nNous levons la main pour parler\nNous prenons soin de nos affaires\nNous rangeons ensemble',
  'cm.ru.sign': 'Approuvé et signé par toute la classe de CP',
  'cm.bm.name': 'Marque-pages (4 par feuille)', 'cm.bm.cut': 'Imprimez, puis découpez le long des pointillés',
  'cm.bm.quotes': 'Lire, c’est voyager\nChaque livre est une aventure\nSois curieux. Lis !\nTant de livres, si peu de temps', 'cm.bm.belongs': 'Ce livre appartient à',
  'cm.lu.name': 'Menu de la cantine', 'cm.lu.title': 'Menu de la cantine', 'cm.lu.week': 'Semaine 1 · du 8 au 12 septembre', 'cm.lu.labels': 'Entrée|Plat|Dessert',
  'cm.lu.days': 'Lundi|Carottes râpées|Spaghetti bolognaise|Compote de pommes\nMardi|Salade de tomates|Poulet rôti et pommes de terre|Yaourt\nMercredi|Potage de légumes|Poisson pané et purée|Mousse au chocolat\nJeudi|Taboulé|Curry de lentilles et riz|Salade de fruits\nVendredi|Concombre à la crème|Pizza au fromage|Glace',
  'cm.lu.note': 'Pain, eau et fruits frais chaque jour. Merci de signaler toute allergie à la cantine.',
  'cm.ag.name': 'Ordre du jour de réunion', 'cm.ag.meeting': 'Réunion du bureau', 'cm.ag.title': 'Ordre du jour',
  'cm.ag.meta': 'Date|Mardi 9 septembre\nHeure|19 h 30\nLieu|Ancienne école\nPrésidente|Catherine Robert',
  'cm.ag.items': 'Accueil et excusés|Présidente|19 h 30\nCompte rendu de la dernière réunion|Secrétaire|19 h 35\nSuivi des décisions||19 h 45\nRapport financier|Trésorière|19 h 50\nProgramme des randonnées de printemps|Responsable des sorties|20 h 05\nNouveaux adhérents et site internet|Chargé des adhésions|20 h 25\nQuestions diverses||20 h 40\nDate de la prochaine réunion||20 h 50',
  'cm.ag.notes': 'Notes', 'cm.ag.apologies': 'En cas d’absence, merci de prévenir',
  'cm.fx.name': 'Calendrier des matchs', 'cm.fx.title': 'Calendrier', 'cm.fx.season': 'Saison 2027/28 · U14',
  'cm.fx.head': 'Date|Adversaire|D/E|Heure|Score', 'cm.fx.home': 'D',
  'cm.fx.rows': 'Sam. 6/9|AS Rivière|D|10 h 30\nSam. 13/9|FC Chênaie|E|11 h\nSam. 20/9|Jeunesse Saint-Pierre|D|10 h 30\nSam. 27/9|Stade Moulinois|E|10 h\nSam. 4/10|US Colline|D|10 h 30\nSam. 11/10|FC Porte Ouest|E|11 h\nSam. 18/10|Coupe : FC Nord|D|10 h 30\nSam. 1/11|AS Rivière|E|10 h\nSam. 8/11|FC Chênaie|D|10 h 30\nSam. 15/11|Jeunesse Saint-Pierre|E|11 h\nSam. 22/11|Stade Moulinois|D|10 h 30\nSam. 29/11|US Colline|E|10 h',
  'cm.fx.ground': 'Matchs à domicile au stade municipal, avenue de la Gare. Venez nous encourager !', 'cm.fx.key': 'D = domicile · E = extérieur',
  'cm.ro.name': 'Effectif de l’équipe', 'cm.ro.title': 'Notre équipe',
  'cm.ro.players': 'Hugo Martin|Gardien\nLucas Bernard|Défenseur\nLéo Dubois|Défenseur\nGabriel Thomas|Défenseur\nArthur Robert|Défenseur\nRaphaël Petit|Milieu\nLouis Durand|Milieu\nJules Leroy|Milieu\nAdam Moreau|Milieu\nNathan Simon|Attaquant\nTom Laurent|Attaquant\nNoé Lefèvre|Gardien',
  'cm.ro.coach': 'Entraîneur : Marc Garcia · Capitaine : Raphaël Petit', 'cm.ro.training': 'Entraînements mardi et jeudi, 18 h',
  'cm.su.name': 'Tableau d’inscription des bénévoles', 'cm.su.title': 'On cherche des bénévoles !', 'cm.su.event': 'Kermesse · samedi 14 juin · salle des fêtes',
  'cm.su.intro': 'Vous avez une heure ou deux ? Inscrivez votre nom en face d’une tâche. Chaque coup de main compte. Merci !',
  'cm.su.head': 'Horaire|Tâche|Nom|Téléphone ou e-mail',
  'cm.su.rows': '9 h – 11 h|Installer les tables\n9 h – 11 h|Accrocher les fanions\n11 h – 13 h|Stand de gâteaux\n11 h – 13 h|Tombola\n11 h – 13 h|Parking\n13 h – 15 h|Stand de gâteaux\n13 h – 15 h|Jeux pour enfants\n13 h – 15 h|Buvette\n14 h – 16 h|Vente de billets\n14 h – 16 h|Maquillage\n16 h – 17 h|Rangement\n16 h – 17 h|Démonter les tables',
  'cm.su.ask': 'Des questions ? Appelez le',
  'cm.ra.name': 'Billets de tombola (5 par feuille)', 'cm.ra.no': 'N°', 'cm.ra.buyer': 'Nom', 'cm.ra.phone': 'Téléphone', 'cm.ra.title': 'Grande Tombola',
  'cm.ra.draw': 'Tirage : samedi 14 juin à 16 h, à la kermesse', 'cm.ra.prizes': '1er prix : un week-end pour deux · 2e prix : un panier garni · et bien d’autres lots !',
  'cm.ra.price': '2 €', 'cm.ra.each': 'le billet',
  'cm.tk.name': 'Billet d’entrée', 'cm.tk.title': 'Bal de printemps', 'cm.tk.when': 'Samedi 18 avril · de 19 h 30 à minuit', 'cm.tk.where': 'Salle des fêtes, rue de l’Église', 'cm.tk.dress': 'Tenue : élégante', 'cm.tk.price': '15 €',
  'cm.tk.admit': 'Entrée', 'cm.tk.no': 'N° 0001', 'cm.tk.short': 'Bal de printemps\n18 avril',
  'cm.nb.name': 'Badge pour associations (étiquette)', 'cm.nb.person': 'Sophie Lambert', 'cm.nb.role': 'Bénévole', 'cm.nb.event': 'Kermesse 2027',
  'cm.tt2.name': 'Numéro de table (plié)', 'cm.tt2.table': 'Table', 'cm.tt2.event': 'Dîner de printemps',
  'cm.th.name': 'Thermomètre de collecte', 'cm.th.kicker': 'Aidez-nous à réunir', 'cm.th.goal': '5 000 €', 'cm.th.cause': 'pour la nouvelle toiture de notre salle paroissiale',
  'cm.th.ticks': '1 000 €\n2 000 €\n3 000 €\n4 000 €\n5 000 €', 'cm.th.raised': '3 250 €', 'cm.th.sofar': 'déjà collectés. Merci !',
  'cm.th.how': 'Comment nous aider', 'cm.th.ways': 'Donnez lors de la quête à chaque messe\nFaites un don en ligne sur {web}\nCuisinez, marchez ou courez pour nous\nVenez avec un ami à nos cafés-rencontres',
  'cm.th.thanks': 'Chaque don, petit ou grand, compte',
  'cm.ap.name': 'Lettre d’appel aux dons avec coupon', 'cm.ap.tagline': 'Personne ne devrait avoir faim dans notre ville', 'cm.ap.regno': 'Association loi 1901 d’intérêt général',
  'cm.ap.letter': 'Chère amie, cher ami,\nL’hiver dernier, plus de familles que jamais sont venues nous demander de l’aide. Des parents qui avaient perdu leur emploi, des personnes âgées seules, des jeunes qui démarrent sans rien. Tous sont repartis avec un sac de courses et un mot chaleureux.\nCette année, nous en attendons encore plus. Avec votre aide, nos rayons resteront pleins : 25 € nourrissent une famille de quatre personnes pendant une semaine.\nMerci de nous renvoyer le coupon ci-dessous, ou de donner en ligne. Quel que soit votre don, merci d’être aux côtés de vos voisins.\nBien chaleureusement,\nCatherine Robert, présidente',
  'cm.ap.what': 'Ce que permet votre don', 'cm.ap.gifts': '10 €|des fruits frais et du lait pour une famille\n25 €|un sac de courses pour une semaine\n50 €|un mois de carburant pour notre camionnette',
  'cm.ap.yes': 'Oui, je souhaite aider', 'cm.ap.amounts': '10 €|25 €|50 €|100 €|Autre : ____',
  'cm.ap.fname': 'Nom', 'cm.ap.femail': 'E-mail', 'cm.ap.faddress': 'Adresse', 'cm.ap.online': 'Vous pouvez aussi donner en ligne sur',
  'cm.gr.name': 'Carte de remerciement aux donateurs', 'cm.gr.title': 'Merci !', 'cm.gr.sub': 'Votre don change vraiment les choses',
  'cm.gr.stats': '1 200|repas servis\n85|familles aidées\n30|nouveaux bénévoles',
  'cm.gr.text': 'Grâce à des personnes comme vous, notre ville est plus chaleureuse et plus solidaire. Nous ne pourrions rien faire sans vous.',
  'cm.gr.from': 'Un immense merci de la part de toute l’équipe :',
};
const pt = {
  'cm.church': 'Paróquia de Santa Maria', 'cm.school': 'Escola Básica do Pinhal', 'cm.club': 'Clube de Caminhada do Rio', 'cm.team': 'Grupo Desportivo de Vila Nova', 'cm.charity': 'Banco Alimentar de Vila Nova', 'cm.library': 'Biblioteca da Escola do Pinhal',
  'cm.names': 'Ana Silva\nPedro Santos\nMaria Ferreira\nJoão Pereira\nTeresa Oliveira\nJosé Costa\nIsabel Rodrigues\nManuel Martins\nHelena Sousa\nAntónio Fernandes\nClara Gonçalves\nFrancisco Lopes\nRosa Marques\nLuís Almeida\nMarta Ribeiro',
  'cm.bul.name': 'Folha paroquial (dobrada)', 'cm.bul.title': 'Folha Dominical', 'cm.bul.date': '3.º Domingo da Páscoa · 4 de maio',
  'cm.bul.welcome': 'Bem-vindos! Quer venha todos os domingos, quer seja a primeira vez, estamos muito contentes por estar connosco.',
  'cm.bul.order': 'Ordem da celebração',
  'cm.bul.items': '#Ritos iniciais\nCântico de entrada|N.º 245\nSaudação e acolhimento|\nAto penitencial|\n#Liturgia da Palavra\nPrimeira leitura|At 2, 14.22-33\nSalmo|Sl 15\nSegunda leitura|1 Pe 1, 17-21\nEvangelho|Lc 24, 13-35\nHomilia|Padre Manuel Martins\n#Oração dos fiéis\nPreces|\nCântico do ofertório|N.º 112\n#Ritos finais\nCântico final|N.º 378\nBênção e despedida|',
  'cm.bul.stand': 'Se puder, levante-se durante os cânticos.',
  'cm.bul.notices': 'Avisos',
  'cm.bul.notes': 'Café depois da missa|Todos estão convidados para um café e um bolo no salão paroquial.\nCantinho das crianças|Ao fundo da igreja há livros, lápis e peluches para os mais pequenos.\nRecolha de alimentos|Deixe latas e alimentos secos no cesto junto à porta. Obrigado!\nIntenções de oração|Escreva um nome no livro junto à pia batismal e rezaremos por essa pessoa esta semana.',
  'cm.bul.week': 'Esta semana', 'cm.bul.weeklist': 'Ter|Grupo de bebés, 10h\nQua|Missa semanal, 10h\nQui|Ensaio do coro, 19h30\nSáb|Limpeza do jardim, 9h',
  'cm.bul.times': 'Horário das missas', 'cm.bul.timelist': 'Domingo|9h e 11h\nQuarta-feira|10h\n1.º domingo|Missa das famílias, 11h30',
  'cm.bul.vicar': 'Padre Manuel Martins, pároco', 'cm.bul.take': 'Pode levar esta folha para casa.',
  'cm.fun.name': 'Livrete de funeral (dobrado)', 'cm.fun.memory': 'Em memória de', 'cm.fun.person': 'Margarida Ana Ferreira', 'cm.fun.dates': '12 de março de 1941 – 2 de outubro de 2027',
  'cm.fun.service': 'Missa de exéquias', 'cm.fun.when': 'Igreja de Santa Maria\nSexta-feira, 15 de outubro de 2027, às 11h',
  'cm.fun.order': 'Ordem da celebração',
  'cm.fun.items': 'Música de entrada|Pie Jesu, Gabriel Fauré\nAcolhimento|Padre Manuel Martins\nCântico|O Senhor é meu pastor\nLeitura|Eclesiastes 3, 1-8, lida por José Ferreira\nHomenagem|Helena Sousa, sua filha\nOração dos fiéis|\nCântico|Fica comigo, Senhor\nÚltima despedida|\nMúsica de saída|What a Wonderful World',
  'cm.fun.life': 'Uma vida plena',
  'cm.fun.story': 'A Margarida nasceu em Vila Nova em 1941, a mais nova de quatro irmãos. Formou-se em enfermagem e cuidou dos doentes do hospital da cidade durante quase quarenta anos.\nCasou com o Roberto em 1964 e juntos criaram três filhos. Adorava o seu jardim, os netos e uma boa chávena de chá, e nunca era tão feliz como com a família toda à volta da mesa.\nCantou no coro da paróquia durante mais de trinta anos e será lembrada pelo seu carinho, pelo seu riso e pela bondade com todos.',
  'cm.fun.verse': 'Bem-aventurados os que choram, porque eles serão consolados.', 'cm.fun.verseref': 'Mateus 5, 4',
  'cm.fun.thanks': 'Obrigado',
  'cm.fun.thankstext': 'A família da Margarida agradece a todos os cartões, as flores, as palavras de conforto e o apoio recebido neste momento tão difícil.',
  'cm.fun.gifts': 'Em memória da Margarida', 'cm.fun.giftstext': 'pode deixar um donativo para os Cuidados Paliativos de São Lucas, à saída.',
  'cm.fun.after': 'No final da celebração, a família convida todos a juntarem-se a ela no Hotel Roseiral, Rua do Moinho.',
  'cm.wp.name': 'Folheto da cerimónia de casamento', 'cm.wp.kicker': 'O casamento de', 'cm.wp.names': 'Sofia\n&\nTiago', 'cm.wp.date': 'Sábado, 12 de setembro de 2027', 'cm.wp.place': 'Igreja de Santa Maria', 'cm.wp.time': 'às 15 horas', 'cm.wp.order': 'Ordem da cerimónia',
  'cm.wp.ordertitle': 'A Cerimónia',
  'cm.wp.items': 'Entrada da noiva|Cânone em Ré, Pachelbel\nAcolhimento|Padre Manuel Martins\nCântico|Hino ao amor\nLeitura|1 Coríntios 13, lida por Clara Ferreira\nConsentimento|\nTroca das alianças|\nOração dos fiéis|\nAssinatura do registo|Ave Maria, Schubert\nBênção nupcial|\nSaída dos noivos|Marcha nupcial, Mendelssohn',
  'cm.wp.thanks': 'Obrigado por partilharem connosco este dia tão especial. Esperamos por vós depois na Quinta do Carvalhal.',
  'cm.pr.name': 'Santinho de lembrança com oração', 'cm.pr.years': '1941 – 2027',
  'cm.pr.prayer': 'O Senhor é o meu pastor; nada me faltará. Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas. Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome. Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
  'cm.pr.ref': 'Salmo 23',
  'cm.car.name': 'Programa de concerto de Natal', 'cm.car.title': 'Cânticos de Natal à luz das velas', 'cm.car.date': 'Domingo, 19 de dezembro', 'cm.car.time': '18h · Entrada livre',
  'cm.car.after': 'No final, chocolate quente e bolo-rei para todos',
  'cm.car.prog': 'Programa',
  'cm.car.items': 'Cântico|Noite Feliz\nPrimeira leitura|Isaías 9, 1-6\nCântico|Ó Vinde, Fiéis\nSegunda leitura|Lucas 1, 26-38\nCoro|Alegrem-se os céus e a terra\nTerceira leitura|Lucas 2, 1-7\nCântico|Bate o Sino\nEvangelho|João 1, 1-14\nCântico|Natal de Elvas',
  'cm.car.collect': 'O ofertório desta noite destina-se ao abrigo para pessoas sem-abrigo. Obrigado pela vossa generosidade.',
  'cm.eas.name': 'Cartaz da Semana Santa', 'cm.eas.kicker': 'Venha celebrar connosco', 'cm.eas.title': 'Semana Santa e Páscoa',
  'cm.eas.list': 'Domingo de Ramos|13|abril|10h|Bênção dos ramos, procissão e missa\nQuinta-feira Santa|17|abril|19h30|Missa da Ceia do Senhor e lava-pés\nSexta-feira Santa|18|abril|15h|Celebração da Paixão, com música e oração\nVigília Pascal|19|abril|21h|Bênção do lume novo e do círio pascal\nDomingo de Páscoa|20|abril|11h|Missa da Ressurreição e caça aos ovos para as crianças',
  'cm.eas.welcome': 'Todos são bem-vindos',
  'cm.rota.name': 'Escala da paróquia', 'cm.rota.title': 'Escala de domingo', 'cm.rota.when': 'Setembro – novembro de 2027', 'cm.rota.service': 'Missa das 11h',
  'cm.rota.head': 'Data|Leitor|Preces|Acolhimento|Flores|Café',
  'cm.rota.dates': '7 de set.\n14 de set.\n21 de set.\n28 de set.\n5 de out.\n12 de out.\n19 de out.\n26 de out.\n2 de nov.\n9 de nov.',
  'cm.rota.swap': 'Não pode no seu domingo? Troque com alguém da lista e avise o cartório paroquial:',
  'cm.bc.name': 'Certificado de batismo', 'cm.bc.title': 'Certificado de Batismo', 'cm.bc.child': 'Lucas Silva Santos',
  'cm.bc.text': 'foi batizado em nome do Pai, e do Filho, e do Espírito Santo', 'cm.bc.date': 'no domingo, 6 de junho de 2027,',
  'cm.bc.parents': 'Pais', 'cm.bc.parentnames': 'Ana e Marco Santos', 'cm.bc.god': 'Padrinhos', 'cm.bc.godnames': 'Clara Gonçalves e Tomás Costa', 'cm.bc.minister': 'Sacerdote', 'cm.bc.seal': 'Selo da paróquia',
  'cm.cn.name': 'Jornal da turma', 'cm.cn.title': 'Notícias do 3.º B', 'cm.cn.sub': '1.º período · Semana 6 · Professora Ana', 'cm.cn.learned': 'Esta semana aprendemos…',
  'cm.cn.subjects': 'Português|Começámos o nosso novo livro e escrevemos cartas à personagem principal.\nMatemática|Praticámos somas e subtrações até 100 com muitos jogos.\nEstudo do Meio|Encontrámos a Europa no globo e aprendemos os nomes dos mares.',
  'cm.cn.dates': 'Datas a lembrar', 'cm.cn.datelist': 'Sexta, 17 de outubro|Festa das colheitas às 9h, pais bem-vindos\nSegunda, 20 de outubro|Fotografias da turma\nSábado, 1 de novembro|Feriado de Todos os Santos\nQuinta, 6 de novembro|Reunião de pais, 17h30 – 19h',
  'cm.cn.star': 'Estrela da semana', 'cm.cn.starname': 'Tomás', 'cm.cn.starwhy': 'por ajudar sempre os colegas e se esforçar imenso na matemática!',
  'cm.cn.remind': 'Lembretes', 'cm.cn.remlist': 'Equipamento de ginástica às terças e quintas\nLivros da biblioteca devolvidos à sexta\nIdentifique casacos e camisolas com o nome\nUm lanche saudável e água todos os dias',
  'cm.tt.name': 'Horário da turma', 'cm.tt.title': 'Horário do 4.º A', 'cm.tt.sub': 'Professor Rui Costa · Sala 12',
  'cm.tt.head': 'Hora|Segunda|Terça|Quarta|Quinta|Sexta',
  'cm.tt.rows': '9h00|=Acolhimento\n9h10|Matemática|Matemática|Matemática|Matemática|Matemática\n10h10|Leitura|Ditado|Leitura|Ditado|Leitura\n10h30|=Intervalo\n11h00|Português|Português|Português|Português|Português\n12h00|=Almoço\n13h30|Estudo do Meio|História|Expressão Plástica|Geografia|Música\n14h30|Educação Física|Informática|Educação Física|Inglês|Jogos\n16h00|=Saída',
  'cm.tt.special': 'Educação Física\nExpressão Plástica\nMúsica\nJogos', 'cm.tt.note': 'Traga o equipamento de Educação Física às segundas e quartas.',
  'cm.rc.name': 'Diploma de leitura', 'cm.rc.title': 'Prémio de Leitura', 'cm.rc.to': 'Este prémio é atribuído a', 'cm.rc.for': 'por ter lido 25 livros neste período. Continua a virar páginas!', 'cm.rc.teacher': 'Professor(a)',
  'cm.ps.name': 'Autorização para visita de estudo', 'cm.ps.title': 'Visita de estudo: Museu da Ciência',
  'cm.ps.letter': 'Caros pais e encarregados de educação,\nNo âmbito do nosso projeto sobre o espaço, o 4.º A vai visitar o Museu da Ciência. As crianças vão ver foguetões verdadeiros, participar numa oficina e visitar o planetário. Viajaremos de autocarro e voltaremos antes do fim do dia de aulas.',
  'cm.ps.info': 'Data|Terça-feira, 21 de outubro\nHorário|Partida 9h · regresso 15h\nCusto|12 € (autocarro e entrada)\nLevar|Lanche, água e um casaco',
  'cm.ps.return': 'Preencha o destacável abaixo e entregue-o com o dinheiro até sexta-feira, 10 de outubro.', 'cm.ps.sign': 'Prof.ª Ana Pereira, professora titular',
  'cm.ps.slip': 'Autorização · Visita ao Museu da Ciência', 'cm.ps.child': 'Nome do aluno', 'cm.ps.class': 'Turma',
  'cm.ps.agree': 'Autorizo o meu educando a participar na visita de estudo.', 'cm.ps.money': 'Junto 12 €', 'cm.ps.lunch': 'Precisa de lanche da escola',
  'cm.ps.medical': 'Problemas de saúde ou alergias', 'cm.ps.emergency': 'Telefone de emergência', 'cm.ps.parent': 'Encarregado de educação', 'cm.ps.signed': 'Assinatura',
  'cm.sd.name': 'Cartaz do dia do desporto', 'cm.sd.title': 'Dia do Desporto', 'cm.sd.when': 'Sexta, 20 de junho · 14h – 16h30', 'cm.sd.events': 'Corridas e jogos',
  'cm.sd.list': 'Sprint\nCorrida da colher\nCorrida de sacos\nEstafetas\nJogo da corda\nPercurso de obstáculos\nCorrida a três pés\nCorrida dos pais',
  'cm.sd.info': 'As famílias são bem-vindas! Tragam chapéu, protetor solar e uma garrafa de água. Gelados à venda por 50 cêntimos.',
  'cm.sd.rain': 'Se chover, o Dia do Desporto passa para segunda, 23 de junho.',
  'cm.ru.name': 'Cartaz de regras da turma', 'cm.ru.title': 'As nossas regras',
  'cm.ru.list': 'Ouvimos quando os outros falam\nSomos simpáticos e gentis\nFazemos sempre o nosso melhor\nPomos o dedo no ar para falar\nCuidamos das nossas coisas\nArrumamos todos juntos',
  'cm.ru.sign': 'Aprovado e assinado por toda a turma do 2.º A',
  'cm.bm.name': 'Marcadores de livros (4 por folha)', 'cm.bm.cut': 'Imprima e recorte pelas linhas tracejadas',
  'cm.bm.quotes': 'Ler leva-te longe\nCada livro é uma aventura\nSê curioso. Lê!\nTantos livros, tão pouco tempo', 'cm.bm.belongs': 'Este livro pertence a',
  'cm.lu.name': 'Ementa da cantina', 'cm.lu.title': 'Ementa da Cantina', 'cm.lu.week': 'Semana 1 · 8 a 12 de setembro', 'cm.lu.labels': 'Sopa|Prato|Sobremesa',
  'cm.lu.days': 'Segunda|Sopa de legumes|Esparguete à bolonhesa|Maçã\nTerça|Creme de abóbora|Frango assado com batatas|Iogurte\nQuarta|Caldo verde|Douradinhos com puré|Pera\nQuinta|Sopa de feijão|Arroz de pato|Salada de fruta\nSexta|Canja|Pizza de queijo|Gelado',
  'cm.lu.note': 'Pão, água e fruta todos os dias. Informe a cozinha de qualquer alergia.',
  'cm.ag.name': 'Ordem de trabalhos de reunião', 'cm.ag.meeting': 'Reunião da direção', 'cm.ag.title': 'Ordem de Trabalhos',
  'cm.ag.meta': 'Data|Terça, 9 de setembro\nHora|19h30\nLocal|Antiga escola\nPresidente|Teresa Oliveira',
  'cm.ag.items': 'Boas-vindas e faltas justificadas|Presidente|19h30\nAta da última reunião|Secretário|19h35\nAssuntos pendentes||19h45\nRelatório de contas|Tesoureira|19h50\nPrograma de caminhadas da primavera|Responsável pelas caminhadas|20h05\nNovos sócios e site|Responsável pelos sócios|20h25\nOutros assuntos||20h40\nData da próxima reunião||20h50',
  'cm.ag.notes': 'Notas', 'cm.ag.apologies': 'Se não puder vir, por favor avise',
  'cm.fx.name': 'Calendário de jogos', 'cm.fx.title': 'Jogos', 'cm.fx.season': 'Época 2027/28 · Iniciados',
  'cm.fx.head': 'Data|Adversário|C/F|Hora|Resultado', 'cm.fx.home': 'C',
  'cm.fx.rows': 'Sáb 6/9|Atlético do Rio|C|10h30\nSáb 13/9|Carvalhal FC|F|11h00\nSáb 20/9|Juventude São Pedro|C|10h30\nSáb 27/9|Moinhos Atlético|F|10h00\nSáb 4/10|União da Colina|C|10h30\nSáb 11/10|Porta Oeste FC|F|11h00\nSáb 18/10|Taça: Norte FC|C|10h30\nSáb 1/11|Atlético do Rio|F|10h00\nSáb 8/11|Carvalhal FC|C|10h30\nSáb 15/11|Juventude São Pedro|F|11h00\nSáb 22/11|Moinhos Atlético|C|10h30\nSáb 29/11|União da Colina|F|10h00',
  'cm.fx.ground': 'Jogos em casa no Estádio Municipal, Rua da Estação. Venham apoiar-nos!', 'cm.fx.key': 'C = em casa · F = fora',
  'cm.ro.name': 'Plantel da equipa', 'cm.ro.title': 'O Nosso Plantel',
  'cm.ro.players': 'Rodrigo Silva|Guarda-redes\nMartim Santos|Defesa\nTiago Ferreira|Defesa\nAfonso Pereira|Defesa\nDuarte Oliveira|Defesa\nGonçalo Costa|Médio\nSantiago Rocha|Médio\nDiogo Martins|Médio\nTomás Sousa|Médio\nSalvador Reis|Avançado\nGustavo Lopes|Avançado\nVicente Marques|Guarda-redes',
  'cm.ro.coach': 'Treinador: Marco Lopes · Capitão: Gonçalo Costa', 'cm.ro.training': 'Treinos às terças e quintas, 18h',
  'cm.su.name': 'Folha de inscrição de voluntários', 'cm.su.title': 'Precisamos de voluntários!', 'cm.su.event': 'Arraial de verão · Sábado, 14 de junho · Salão paroquial',
  'cm.su.intro': 'Tem uma ou duas horas livres? Escreva o seu nome ao lado de uma tarefa. Cada ajuda faz a diferença. Obrigado!',
  'cm.su.head': 'Hora|Tarefa|Nome|Telefone ou e-mail',
  'cm.su.rows': '9h – 11h|Montar as mesas\n9h – 11h|Pendurar bandeirinhas\n11h – 13h|Banca de bolos\n11h – 13h|Tômbola\n11h – 13h|Estacionamento\n13h – 15h|Banca de bolos\n13h – 15h|Jogos para crianças\n13h – 15h|Bar de café\n14h – 16h|Venda de rifas\n14h – 16h|Pinturas faciais\n16h – 17h|Arrumar\n16h – 17h|Desmontar as mesas',
  'cm.su.ask': 'Dúvidas? Ligue para o',
  'cm.ra.name': 'Rifas (5 por folha)', 'cm.ra.no': 'N.º', 'cm.ra.buyer': 'Nome', 'cm.ra.phone': 'Telefone', 'cm.ra.title': 'Grande Rifa',
  'cm.ra.draw': 'Sorteio: sábado, 14 de junho, às 16h, no arraial de verão', 'cm.ra.prizes': '1.º prémio: um fim de semana para dois · 2.º prémio: um cabaz · e muito mais!',
  'cm.ra.price': '2 €', 'cm.ra.each': 'por rifa',
  'cm.tk.name': 'Bilhete para eventos', 'cm.tk.title': 'Baile da Primavera', 'cm.tk.when': 'Sábado, 18 de abril · das 19h30 à meia-noite', 'cm.tk.where': 'Salão paroquial, Rua da Igreja', 'cm.tk.dress': 'Traje: elegante', 'cm.tk.price': '15 €',
  'cm.tk.admit': 'Entrada', 'cm.tk.no': 'N.º 0001', 'cm.tk.short': 'Baile da Primavera\n18 de abril',
  'cm.nb.name': 'Crachá para clubes (etiqueta)', 'cm.nb.person': 'Sara Fonseca', 'cm.nb.role': 'Voluntária', 'cm.nb.event': 'Arraial de Verão 2027',
  'cm.tt2.name': 'Número de mesa (dobrado)', 'cm.tt2.table': 'Mesa', 'cm.tt2.event': 'Jantar da Primavera',
  'cm.th.name': 'Termómetro de angariação', 'cm.th.kicker': 'Ajude-nos a angariar', 'cm.th.goal': '5000 €', 'cm.th.cause': 'para o novo telhado do salão paroquial',
  'cm.th.ticks': '1000 €\n2000 €\n3000 €\n4000 €\n5000 €', 'cm.th.raised': '3250 €', 'cm.th.sofar': 'angariados até agora. Obrigado!',
  'cm.th.how': 'Como pode ajudar', 'cm.th.ways': 'Contribua no ofertório de qualquer missa\nFaça um donativo online em {web}\nFaça bolos, caminhe ou corra por nós\nTraga um amigo aos nossos cafés de convívio',
  'cm.th.thanks': 'Cada donativo, grande ou pequeno, conta',
  'cm.ap.name': 'Carta de angariação com destacável', 'cm.ap.tagline': 'Ninguém na nossa terra deve passar fome', 'cm.ap.regno': 'IPSS · NIF 500 000 000',
  'cm.ap.letter': 'Caro amigo, cara amiga,\nNo inverno passado, mais famílias do que nunca vieram pedir-nos ajuda. Pais que tinham perdido o emprego, idosos que vivem sozinhos, jovens que começam a vida sem nada. Todos saíram com um saco de alimentos e uma palavra amiga.\nEste ano esperamos ainda mais. Com a sua ajuda, as nossas prateleiras continuarão cheias: 25 € compram os alimentos de uma semana para uma família de quatro pessoas.\nPreencha o destacável abaixo e envie-o para nós, ou contribua online. Seja qual for o seu donativo, obrigado por estar ao lado dos seus vizinhos.\nCom amizade,\nTeresa Oliveira, presidente da direção',
  'cm.ap.what': 'O que o seu donativo faz', 'cm.ap.gifts': '10 €|fruta fresca e leite para uma família\n25 €|um saco de alimentos para uma semana\n50 €|um mês de combustível para a carrinha',
  'cm.ap.yes': 'Sim, quero ajudar', 'cm.ap.amounts': '10 €|25 €|50 €|100 €|Outro: ____',
  'cm.ap.fname': 'Nome', 'cm.ap.femail': 'E-mail', 'cm.ap.faddress': 'Morada', 'cm.ap.online': 'Também pode contribuir online em',
  'cm.gr.name': 'Cartão de agradecimento solidário', 'cm.gr.title': 'Obrigado!', 'cm.gr.sub': 'O seu donativo está a fazer a diferença',
  'cm.gr.stats': '1200|refeições servidas\n85|famílias apoiadas\n30|novos voluntários',
  'cm.gr.text': 'Graças a pessoas como você, a nossa terra é um lugar mais acolhedor e solidário. Não conseguiríamos sem si.',
  'cm.gr.from': 'Com um enorme obrigado de toda a equipa do',
};

const it = {
  'cm.church': 'Parrocchia di Santa Maria', 'cm.school': 'Scuola Primaria G. Rodari', 'cm.club': 'Gruppo Escursionisti del Fiume', 'cm.team': 'A.S.D. Borgo Nuovo', 'cm.charity': 'Banco Alimentare di Borgo Nuovo', 'cm.library': 'Biblioteca della Scuola Rodari',
  'cm.names': 'Anna Rossi\nPietro Russo\nMaria Ferrari\nGiovanni Esposito\nTeresa Bianchi\nGiuseppe Romano\nLucia Colombo\nMarco Ricci\nElena Marino\nAntonio Greco\nChiara Bruno\nFrancesco Gallo\nRosa Conti\nLuigi De Luca\nPaola Costa',
  'cm.bul.name': 'Foglietto parrocchiale (piegato)', 'cm.bul.title': 'Foglio Domenicale', 'cm.bul.date': 'III Domenica di Pasqua · 4 maggio',
  'cm.bul.welcome': 'Benvenuti! Che veniate ogni domenica o per la prima volta, siamo felici di avervi qui.',
  'cm.bul.order': 'Liturgia della Messa',
  'cm.bul.items': '#Riti di introduzione\nCanto d’ingresso|n. 245\nSaluto e accoglienza|\nAtto penitenziale|\n#Liturgia della Parola\nPrima lettura|At 2,14.22-33\nSalmo|Sal 15\nSeconda lettura|1 Pt 1,17-21\nVangelo|Lc 24,13-35\nOmelia|Don Marco Ricci\n#Preghiera dei fedeli\nIntenzioni|\nCanto d’offertorio|n. 112\n#Riti di conclusione\nCanto finale|n. 378\nBenedizione e congedo|',
  'cm.bul.stand': 'Chi può, si alzi in piedi durante i canti.',
  'cm.bul.notices': 'Avvisi',
  'cm.bul.notes': 'Caffè dopo la Messa|Siete tutti invitati a un caffè con dolci nel salone parrocchiale.\nAngolo dei bambini|In fondo alla chiesa ci sono libri, matite e peluche per i più piccoli.\nRaccolta alimentare|Lasciate scatolame e alimenti a lunga conservazione nel cesto vicino alla porta. Grazie!\nIntenzioni di preghiera|Scrivete un nome nel quaderno vicino al fonte battesimale: pregheremo per questa persona.',
  'cm.bul.week': 'Questa settimana', 'cm.bul.weeklist': 'Mar|Gruppo mamme e bimbi, ore 10\nMer|Messa feriale, ore 10\nGio|Prove del coro, ore 19.30\nSab|Pulizia del giardino, ore 9',
  'cm.bul.times': 'Orari delle Messe', 'cm.bul.timelist': 'Domenica|ore 8.30 e 11\nMercoledì|ore 10\nPrima domenica|Messa delle famiglie, ore 11.30',
  'cm.bul.vicar': 'Don Marco Ricci, parroco', 'cm.bul.take': 'Potete portare a casa questo foglio.',
  'cm.fun.name': 'Libretto per funerale (piegato)', 'cm.fun.memory': 'In ricordo di', 'cm.fun.person': 'Margherita Anna Ferrari', 'cm.fun.dates': '12 marzo 1941 – 2 ottobre 2027',
  'cm.fun.service': 'Santa Messa esequiale', 'cm.fun.when': 'Chiesa di Santa Maria\nVenerdì 15 ottobre 2027, ore 11',
  'cm.fun.order': 'Liturgia esequiale',
  'cm.fun.items': 'Musica d’ingresso|Pie Jesu, Gabriel Fauré\nAccoglienza|Don Marco Ricci\nCanto|Il Signore è il mio pastore\nLettura|Qoèlet 3,1-8, letta da Giuseppe Ferrari\nRicordo|Elena Marino, la figlia\nPreghiera dei fedeli|\nCanto|Resta con noi, Signore\nUltimo saluto|\nMusica d’uscita|What a Wonderful World',
  'cm.fun.life': 'Una vita piena',
  'cm.fun.story': 'Margherita nacque a Borgo Nuovo nel 1941, ultima di quattro figli. Diventata infermiera, si prese cura dei pazienti dell’ospedale cittadino per quasi quarant’anni.\nNel 1964 sposò Roberto e insieme crebbero tre figli. Amava il suo orto, i nipoti e una buona tazza di caffè, e non era mai così felice come con tutta la famiglia intorno alla tavola.\nHa cantato nel coro parrocchiale per più di trent’anni. La ricorderemo per il suo calore, la sua risata e la sua gentilezza verso tutti.',
  'cm.fun.verse': 'Beati quelli che piangono, perché saranno consolati.', 'cm.fun.verseref': 'Matteo 5,4',
  'cm.fun.thanks': 'Grazie',
  'cm.fun.thankstext': 'La famiglia di Margherita ringrazia di cuore per i biglietti, i fiori, le parole di conforto e la vicinanza in questo momento di dolore.',
  'cm.fun.gifts': 'In ricordo di Margherita', 'cm.fun.giftstext': 'si possono fare offerte per l’Hospice San Luca all’uscita della chiesa.',
  'cm.fun.after': 'Al termine della funzione, la famiglia vi aspetta all’Hotel Il Roseto, via del Mulino.',
  'cm.wp.name': 'Libretto della cerimonia di nozze', 'cm.wp.kicker': 'Il matrimonio di', 'cm.wp.names': 'Sofia\n&\nLuca', 'cm.wp.date': 'Sabato 12 settembre 2027', 'cm.wp.place': 'Chiesa di Santa Maria, via delle Querce', 'cm.wp.time': 'alle ore 15', 'cm.wp.order': 'Libretto della cerimonia',
  'cm.wp.ordertitle': 'La Cerimonia',
  'cm.wp.items': 'Ingresso della sposa|Canone in re, Pachelbel\nAccoglienza|Don Marco Ricci\nCanto|Inno alla carità\nLettura|1 Corinzi 13, letta da Chiara Bruno\nConsenso degli sposi|\nScambio degli anelli|\nPreghiera dei fedeli|\nFirma dei registri|Ave Maria, Schubert\nBenedizione nuziale|\nUscita degli sposi|Marcia nuziale, Mendelssohn',
  'cm.wp.thanks': 'Grazie per condividere con noi questo giorno speciale. Vi aspettiamo poi alla Tenuta Le Querce.',
  'cm.pr.name': 'Santino in ricordo con preghiera', 'cm.pr.years': '1941 – 2027',
  'cm.pr.prayer': 'Il Signore è il mio pastore, nulla mi mancherà. Egli mi fa giacere in verdeggianti paschi, mi guida lungo le acque chete. Egli mi ristora l’anima, mi conduce per sentieri di giustizia, per amor del suo nome. Quand’anche camminassi nella valle dell’ombra della morte, io non temerei male alcuno, perché tu sei con me; il tuo bastone e la tua verga mi consolano.',
  'cm.pr.ref': 'Salmo 23',
  'cm.car.name': 'Programma del concerto di Natale', 'cm.car.title': 'Concerto di Natale a lume di candela', 'cm.car.date': 'Domenica 19 dicembre', 'cm.car.time': 'Ore 18 · Ingresso libero',
  'cm.car.after': 'Al termine, vin brulé e panettone per tutti',
  'cm.car.prog': 'Programma',
  'cm.car.items': 'Canto|Tu scendi dalle stelle\nPrima lettura|Isaia 9,1-6\nCanto|Astro del ciel\nSeconda lettura|Luca 1,26-38\nCoro|Adeste fideles\nTerza lettura|Luca 2,1-7\nCanto|Dormi, dormi, bel bambin\nVangelo|Giovanni 1,1-14\nCanto|Gli angeli delle campagne',
  'cm.car.collect': 'La raccolta di stasera è per il dormitorio dei senzatetto. Grazie per la vostra generosità.',
  'cm.eas.name': 'Manifesto della Settimana Santa', 'cm.eas.kicker': 'Vi aspettiamo per', 'cm.eas.title': 'Settimana Santa e Pasqua',
  'cm.eas.list': 'Domenica delle Palme|13|aprile|ore 10|Benedizione degli ulivi, processione e Messa\nGiovedì Santo|17|aprile|ore 20.30|Messa nella Cena del Signore e lavanda dei piedi\nVenerdì Santo|18|aprile|ore 15|Celebrazione della Passione, con musica e preghiera\nVeglia Pasquale|19|aprile|ore 21|Benedizione del fuoco nuovo e del cero pasquale\nDomenica di Pasqua|20|aprile|ore 11|Messa di Risurrezione e caccia alle uova per i bambini',
  'cm.eas.welcome': 'Tutti sono i benvenuti',
  'cm.rota.name': 'Turni della parrocchia', 'cm.rota.title': 'Turni della domenica', 'cm.rota.when': 'Settembre – novembre 2027', 'cm.rota.service': 'Messa delle ore 11',
  'cm.rota.head': 'Data|Lettore|Preghiere|Accoglienza|Fiori|Caffè',
  'cm.rota.dates': '7 settembre\n14 settembre\n21 settembre\n28 settembre\n5 ottobre\n12 ottobre\n19 ottobre\n26 ottobre\n2 novembre\n9 novembre',
  'cm.rota.swap': 'Non puoi nella tua domenica? Fai cambio con qualcuno della lista e avvisa la segreteria parrocchiale:',
  'cm.bc.name': 'Certificato di battesimo', 'cm.bc.title': 'Certificato di Battesimo', 'cm.bc.child': 'Luca Giovanni Rossi',
  'cm.bc.text': 'è stato battezzato nel nome del Padre e del Figlio e dello Spirito Santo', 'cm.bc.date': 'domenica 6 giugno 2027,',
  'cm.bc.parents': 'Genitori', 'cm.bc.parentnames': 'Anna e Marco Rossi', 'cm.bc.god': 'Padrino e madrina', 'cm.bc.godnames': 'Chiara Bruno e Tommaso Greco', 'cm.bc.minister': 'Il parroco', 'cm.bc.seal': 'Timbro parrocchiale',
  'cm.cn.name': 'Giornalino di classe', 'cm.cn.title': 'Notizie dalla 3ª B', 'cm.cn.sub': 'Primo quadrimestre · Settimana 6 · Maestra Lucia', 'cm.cn.learned': 'Questa settimana abbiamo imparato…',
  'cm.cn.subjects': 'Lettura|Abbiamo iniziato il nuovo libro di classe e scritto lettere al protagonista.\nMatematica|Abbiamo fatto addizioni e sottrazioni fino a 100 con tanti giochi.\nGeografia|Abbiamo trovato l’Europa sul mappamondo e imparato i nomi dei mari.',
  'cm.cn.dates': 'Date da ricordare', 'cm.cn.datelist': 'Venerdì 17 ottobre|Festa d’autunno alle 9, genitori benvenuti\nLunedì 20 ottobre|Foto di classe\nSabato 1 novembre|Ognissanti, scuola chiusa\nGiovedì 6 novembre|Colloqui con i genitori, 16.30 – 18.30',
  'cm.cn.star': 'Stella della settimana', 'cm.cn.starname': 'Leonardo', 'cm.cn.starwhy': 'perché aiuta sempre i compagni e si impegna tantissimo in matematica!',
  'cm.cn.remind': 'Promemoria', 'cm.cn.remlist': 'Tuta da ginnastica il martedì e il giovedì\nRiportare i libri della biblioteca il venerdì\nScrivere il nome su giacche e maglioni\nUna merenda sana e una borraccia ogni giorno',
  'cm.tt.name': 'Orario della classe', 'cm.tt.title': 'Orario della 4ª A', 'cm.tt.sub': 'Maestro Bianchi · Aula 12',
  'cm.tt.head': 'Ora|Lunedì|Martedì|Mercoledì|Giovedì|Venerdì',
  'cm.tt.rows': '8.20|=Accoglienza\n8.30|Italiano|Italiano|Italiano|Italiano|Italiano\n9.30|Matematica|Matematica|Matematica|Matematica|Matematica\n10.30|=Intervallo\n10.45|Lettura|Dettato|Lettura|Dettato|Lettura\n12.30|=Mensa\n14.00|Scienze|Storia|Arte|Geografia|Musica\n15.00|Ed. fisica|Informatica|Ed. fisica|Inglese|Giochi\n16.30|=Uscita',
  'cm.tt.special': 'Ed. fisica\nArte\nMusica\nGiochi', 'cm.tt.note': 'Ricordate la tuta da ginnastica il lunedì e il mercoledì.',
  'cm.rc.name': 'Attestato di lettura', 'cm.rc.title': 'Premio Lettura', 'cm.rc.to': 'Questo premio va a', 'cm.rc.for': 'per aver letto 25 libri in questo quadrimestre. Continua a sfogliare pagine!', 'cm.rc.teacher': 'Insegnante',
  'cm.ps.name': 'Autorizzazione per uscita didattica', 'cm.ps.title': 'Uscita didattica: Museo della Scienza',
  'cm.ps.letter': 'Gentili genitori,\nnell’ambito del nostro progetto sullo spazio, la classe 4ª A visiterà il Museo della Scienza. I bambini vedranno veri razzi, parteciperanno a un laboratorio e visiteranno il planetario. Viaggeremo in pullman e rientreremo per l’orario di uscita.',
  'cm.ps.info': 'Data|Martedì 21 ottobre\nOrari|Partenza 9 · rientro 15\nQuota|12 € (pullman e ingresso)\nPortare|Pranzo al sacco, acqua e giacca',
  'cm.ps.return': 'Compilate il tagliando qui sotto e restituitelo con la quota entro venerdì 10 ottobre.', 'cm.ps.sign': 'Maestra Lucia Colombo',
  'cm.ps.slip': 'Autorizzazione · Uscita al Museo della Scienza', 'cm.ps.child': 'Nome dell’alunno', 'cm.ps.class': 'Classe',
  'cm.ps.agree': 'Autorizzo mio figlio/mia figlia a partecipare all’uscita.', 'cm.ps.money': 'Allego 12 €', 'cm.ps.lunch': 'Pranzo al sacco della mensa',
  'cm.ps.medical': 'Problemi di salute o allergie', 'cm.ps.emergency': 'Telefono per le emergenze', 'cm.ps.parent': 'Nome del genitore', 'cm.ps.signed': 'Firma',
  'cm.sd.name': 'Manifesto della festa dello sport', 'cm.sd.title': 'Festa dello Sport', 'cm.sd.when': 'Venerdì 20 giugno · 9 – 12', 'cm.sd.events': 'Gare e giochi',
  'cm.sd.list': 'Velocità\nCorsa col cucchiaio\nCorsa nei sacchi\nStaffetta\nTiro alla fune\nPercorso a ostacoli\nCorsa a tre gambe\nGara dei genitori',
  'cm.sd.info': 'Le famiglie sono le benvenute! Portate cappellino, crema solare e una borraccia. Ghiaccioli in vendita a 50 centesimi.',
  'cm.sd.rain': 'In caso di pioggia, la festa è rinviata a lunedì 23 giugno.',
  'cm.ru.name': 'Cartellone delle regole di classe', 'cm.ru.title': 'Le nostre regole',
  'cm.ru.list': 'Ascoltiamo quando gli altri parlano\nSiamo gentili con tutti\nFacciamo sempre del nostro meglio\nAlziamo la mano per parlare\nAbbiamo cura delle nostre cose\nRiordiniamo insieme',
  'cm.ru.sign': 'Approvate e firmate da tutta la classe 2ª',
  'cm.bm.name': 'Segnalibri (4 per foglio)', 'cm.bm.cut': 'Stampa e ritaglia lungo le linee tratteggiate',
  'cm.bm.quotes': 'Leggere ti porta lontano\nOgni libro è un’avventura\nSii curioso. Leggi!\nTanti libri, poco tempo', 'cm.bm.belongs': 'Questo libro appartiene a',
  'cm.lu.name': 'Menù della mensa scolastica', 'cm.lu.title': 'Menù della Mensa', 'cm.lu.week': 'Settimana 1 · 8 – 12 settembre', 'cm.lu.labels': 'Primo|Secondo|Frutta e dolce',
  'cm.lu.days': 'Lunedì|Pasta al pomodoro|Polpette con piselli|Mela\nMartedì|Risotto alla zucca|Pollo arrosto e patate|Yogurt\nMercoledì|Minestrone|Bastoncini di pesce e purè|Pera\nGiovedì|Riso e lenticchie|Frittata con spinaci|Macedonia\nVenerdì|Pasta al pesto|Pizza margherita|Gelato',
  'cm.lu.note': 'Pane, acqua e frutta fresca ogni giorno. Segnalate alla cucina eventuali allergie.',
  'cm.ag.name': 'Ordine del giorno per riunioni', 'cm.ag.meeting': 'Consiglio direttivo', 'cm.ag.title': 'Ordine del giorno',
  'cm.ag.meta': 'Data|Martedì 9 settembre\nOra|19.30\nLuogo|Vecchia scuola\nPresiede|Teresa Bianchi',
  'cm.ag.items': 'Saluti e assenze giustificate|Presidente|19.30\nVerbale della riunione precedente|Segretario|19.35\nQuestioni in sospeso||19.45\nRelazione del tesoriere|Tesoriera|19.50\nProgramma delle escursioni di primavera|Responsabile escursioni|20.05\nNuovi soci e sito internet|Responsabile soci|20.25\nVarie ed eventuali||20.40\nData della prossima riunione||20.50',
  'cm.ag.notes': 'Note', 'cm.ag.apologies': 'Se non potete venire, avvisate',
  'cm.fx.name': 'Calendario delle partite', 'cm.fx.title': 'Calendario', 'cm.fx.season': 'Stagione 2027/28 · Under 14',
  'cm.fx.head': 'Data|Avversario|C/T|Ora|Risultato', 'cm.fx.home': 'C',
  'cm.fx.rows': 'Sab 6/9|Atletico Fiume|C|10.30\nSab 13/9|Quercia FC|T|11.00\nSab 20/9|Juniores San Pietro|C|10.30\nSab 27/9|Mulino Calcio|T|10.00\nSab 4/10|Polisportiva Collina|C|10.30\nSab 11/10|Porta Ovest|T|11.00\nSab 18/10|Coppa: Nord Calcio|C|10.30\nSab 1/11|Atletico Fiume|T|10.00\nSab 8/11|Quercia FC|C|10.30\nSab 15/11|Juniores San Pietro|T|11.00\nSab 22/11|Mulino Calcio|C|10.30\nSab 29/11|Polisportiva Collina|T|10.00',
  'cm.fx.ground': 'Partite in casa allo Stadio Comunale, via della Stazione. Venite a fare il tifo per noi!', 'cm.fx.key': 'C = in casa · T = in trasferta',
  'cm.ro.name': 'Rosa della squadra', 'cm.ro.title': 'La Nostra Squadra',
  'cm.ro.players': 'Lorenzo Rossi|Portiere\nMattia Russo|Difensore\nAndrea Ferrari|Difensore\nTommaso Fabbri|Difensore\nRiccardo Neri|Difensore\nGabriele Romano|Centrocampista\nEdoardo Conti|Centrocampista\nDavide Ricci|Centrocampista\nMatteo Marino|Centrocampista\nAlessio Greco|Attaccante\nFederico Bruno|Attaccante\nSimone Gallo|Portiere',
  'cm.ro.coach': 'Allenatore: Marco Gallo · Capitano: Gabriele Romano', 'cm.ro.training': 'Allenamenti martedì e giovedì, ore 18',
  'cm.su.name': 'Foglio iscrizione volontari', 'cm.su.title': 'Cercasi volontari!', 'cm.su.event': 'Festa d’estate · Sabato 14 giugno · Oratorio',
  'cm.su.intro': 'Hai un’ora o due libere? Scrivi il tuo nome accanto a un compito. Ogni aiuto fa la differenza. Grazie!',
  'cm.su.head': 'Orario|Compito|Nome|Telefono o e-mail',
  'cm.su.rows': '9 – 11|Montare i tavoli\n9 – 11|Appendere le bandierine\n11 – 13|Banco dei dolci\n11 – 13|Pesca di beneficenza\n11 – 13|Parcheggio\n13 – 15|Banco dei dolci\n13 – 15|Giochi per bambini\n13 – 15|Bar\n14 – 16|Vendita biglietti\n14 – 16|Truccabimbi\n16 – 17|Riordino\n16 – 17|Smontare i tavoli',
  'cm.su.ask': 'Domande? Chiama il',
  'cm.ra.name': 'Biglietti della lotteria (5 per foglio)', 'cm.ra.no': 'N.', 'cm.ra.buyer': 'Nome', 'cm.ra.phone': 'Telefono', 'cm.ra.title': 'Grande Lotteria',
  'cm.ra.draw': 'Estrazione: sabato 14 giugno alle 16, alla festa d’estate', 'cm.ra.prizes': '1° premio: un weekend per due · 2° premio: un cesto gastronomico · e tanti altri!',
  'cm.ra.price': '2 €', 'cm.ra.each': 'a biglietto',
  'cm.tk.name': 'Biglietto per eventi', 'cm.tk.title': 'Ballo di Primavera', 'cm.tk.when': 'Sabato 18 aprile · dalle 19.30 a mezzanotte', 'cm.tk.where': 'Salone dell’oratorio, via della Chiesa', 'cm.tk.dress': 'Abbigliamento: elegante', 'cm.tk.price': '15 €',
  'cm.tk.admit': 'Ingresso', 'cm.tk.no': 'N. 0001', 'cm.tk.short': 'Ballo di Primavera\n18 aprile',
  'cm.nb.name': 'Cartellino nominativo (etichetta)', 'cm.nb.person': 'Sara Moretti', 'cm.nb.role': 'Volontaria', 'cm.nb.event': 'Festa d’estate 2027',
  'cm.tt2.name': 'Numero del tavolo (piegato)', 'cm.tt2.table': 'Tavolo', 'cm.tt2.event': 'Cena di primavera',
  'cm.th.name': 'Termometro della raccolta fondi', 'cm.th.kicker': 'Aiutaci a raccogliere', 'cm.th.goal': '5.000 €', 'cm.th.cause': 'per il nuovo tetto del salone parrocchiale',
  'cm.th.ticks': '1.000 €\n2.000 €\n3.000 €\n4.000 €\n5.000 €', 'cm.th.raised': '3.250 €', 'cm.th.sofar': 'raccolti finora. Grazie!',
  'cm.th.how': 'Come puoi aiutare', 'cm.th.ways': 'Fai un’offerta alla raccolta di ogni Messa\nDona online su {web}\nCucina, cammina o corri per noi\nPorta un amico ai nostri caffè della domenica',
  'cm.th.thanks': 'Ogni offerta, grande o piccola, conta',
  'cm.ap.name': 'Lettera di raccolta fondi con tagliando', 'cm.ap.tagline': 'Nessuno nella nostra città deve soffrire la fame', 'cm.ap.regno': 'Ente del Terzo Settore · C.F. 90000000000',
  'cm.ap.letter': 'Caro amico, cara amica,\nlo scorso inverno sono venute a chiederci aiuto più famiglie che mai. Genitori che avevano perso il lavoro, anziani che vivono soli, giovani che partono da zero. Tutti sono andati via con una borsa della spesa e una parola gentile.\nQuest’anno ne aspettiamo ancora di più. Con il tuo aiuto i nostri scaffali resteranno pieni: con 25 € compriamo la spesa di una settimana per una famiglia di quattro persone.\nCompila il tagliando qui sotto e rispediscilo, oppure dona online. Qualunque sia la tua offerta, grazie per stare accanto ai tuoi vicini.\nUn caro saluto,\nTeresa Bianchi, presidente',
  'cm.ap.what': 'Cosa fa la tua offerta', 'cm.ap.gifts': '10 €|frutta fresca e latte per una famiglia\n25 €|una borsa della spesa per una settimana\n50 €|un mese di carburante per il furgone',
  'cm.ap.yes': 'Sì, voglio aiutare', 'cm.ap.amounts': '10 €|25 €|50 €|100 €|Altro: ____',
  'cm.ap.fname': 'Nome', 'cm.ap.femail': 'E-mail', 'cm.ap.faddress': 'Indirizzo', 'cm.ap.online': 'Puoi donare anche online su',
  'cm.gr.name': 'Biglietto di ringraziamento per donatori', 'cm.gr.title': 'Grazie!', 'cm.gr.sub': 'La tua offerta fa davvero la differenza',
  'cm.gr.stats': '1.200|pasti serviti\n85|famiglie aiutate\n30|nuovi volontari',
  'cm.gr.text': 'Grazie a persone come te, la nostra città è un posto più caldo e solidale. Senza di te non potremmo farcela.',
  'cm.gr.from': 'Con tanta gratitudine da tutti noi del',
};

export const tr = { es, de, fr, pt, it };
