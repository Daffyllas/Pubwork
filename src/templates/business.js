// Business cards, letterheads, a compliment slip, a gift voucher and a loyalty card. They use
// "My details" (name, job, phone…) so a business card comes out already filled in.
import { infoRows } from './common.js';

const contact = (k) => [['i:phone', k.s('common.phone'), 'phone'], ['i:mail', k.s('common.email'), 'email'], ['i:world', k.s('common.web'), 'web']];

export const business = [
  {
    id: 'bc-classic', cat: 'business', name: 'bc1.name', scheme: 'navy', fonts: 'classic', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, 4, H, { fill: 'primary' });
      k.logo(W - 20, 6, 14, 14, { art: 'i:building', color: 'primary' });
      k.text(10, 8, W - 34, 8, s('common.yourname'), { size: 14, font: 'heading', bold: true, color: 'primary', field: 'name' });
      k.text(10, 15.5, W - 34, 5, s('common.jobtitle'), { size: 8, color: 'secondary', caps: true, tracking: 1, field: 'title' });
      infoRows(k, 10, H - 26, W - 16, contact(k), { size: 7.5, gap: 6, icon: 3 });
    },
  },
  {
    id: 'bc-modern', cat: 'business', name: 'bc2.name', scheme: 'mint', fonts: 'modern', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W * 0.38, H, { fill: 'primary' });
      k.logo(W * 0.19 - 9, 10, 18, 18, { art: 'i:leaf', color: 'light' });
      k.text(3, 31, W * 0.38 - 6, 12, s('common.org'), { size: 8.5, color: 'light', align: 'center', bold: true, field: 'org' });
      const x = W * 0.38 + 5, w = W * 0.62 - 9;
      k.text(x, 8, w, 7, s('common.yourname'), { size: 12, font: 'heading', bold: true, color: 'dark', field: 'name' });
      k.text(x, 15, w, 5, s('common.jobtitle'), { size: 7.5, color: 'primary', field: 'title' });
      infoRows(k, x, H - 26, w, contact(k), { size: 7, gap: 6, icon: 3 });
    },
  },
  {
    id: 'bc-bold', cat: 'business', name: 'bc3.name', scheme: 'coral', fonts: 'bold', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.rect(8, 23, 16, 1.4, { fill: 'primary' });
      k.text(8, 8, W - 16, 14, s('common.yourname'), { size: 20, font: 'heading', color: 'light', field: 'name' });
      k.text(8, 26, W - 16, 5, s('common.jobtitle'), { size: 8, color: 'primary', caps: true, tracking: 1.5, bold: true, field: 'title' });
      k.text(8, H - 17, W - 16, 12, [{ t: s('common.phone') }, { t: s('common.email') }], { size: 7.5, color: 'light', lh: 1.3 });
    },
  },
  {
    id: 'bc-elegant', cat: 'business', name: 'bc4.name', scheme: 'earth', fonts: 'traditional', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(3, 3, W - 6, H - 6, { fill: 'none', stroke: 'secondary', sw: 0.5 });
      k.text(6, 9, W - 12, 6, s('common.org'), { size: 7.5, align: 'center', caps: true, tracking: 3, color: 'primary', field: 'org' });
      k.text(6, 17, W - 12, 8, s('common.yourname'), { size: 14, font: 'heading', align: 'center', color: 'dark', field: 'name' });
      k.text(6, 25, W - 12, 5, s('common.jobtitle'), { size: 8, align: 'center', italic: true, field: 'title' });
      k.line(W / 2 - 8, 32, W / 2 + 8, 32, { color: 'secondary', width: 0.5 });
      k.text(6, 35, W - 12, 14, [{ t: `${s('common.phone')}  ·  ${s('common.email')}` }, { t: s('common.address') }], { size: 7, align: 'center', lh: 1.35 });
    },
  },
  {
    id: 'bc-creative', cat: 'business', name: 'bc5.name', scheme: 'candy', fonts: 'friendly', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.poly([[W * 0.55, 0], [W, 0], [W, H], [W * 0.35, H]], { fill: 'primary' });
      k.circle(W * 0.72, H / 2, 15, { fill: 'secondary' });
      k.photo(W * 0.72 - 13, H / 2 - 13, 26, 26, { round: true });
      k.text(6, 9, W * 0.5, 8, s('common.yourname'), { size: 13, font: 'heading', bold: true, color: 'primary', field: 'name' });
      k.text(6, 17, W * 0.5, 5, s('common.jobtitle'), { size: 8, field: 'title' });
      k.text(6, H - 22, W * 0.42, 18, [{ t: s('common.phone') }, { t: s('common.email') }, { t: s('common.web') }], { size: 7, lh: 1.3 });
    },
  },
  {
    id: 'letter-band', cat: 'business', name: 'lh1.name', scheme: 'ocean', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 34, { fill: 'primary' });
      k.logo(16, 7, 20, 20, { art: 'i:building', color: 'light' });
      k.text(42, 8, W - 58, 12, s('common.org'), { size: 22, font: 'heading', bold: true, color: 'light', field: 'org' });
      k.text(42, 20, W - 58, 7, s('common.tagline'), { size: 10.5, color: 'light', field: 'tagline' });
      k.text(25, 52, W - 50, 120, s('lh.letter'), { size: 11, lh: 1.4, after: 8 });
      k.line(16, H - 22, W - 16, H - 22, { color: 'secondary', width: 0.8 });
      k.text(16, H - 19, W - 32, 10, `${s('common.address')}  ·  ${s('common.phone')}  ·  ${s('common.email')}  ·  ${s('common.web')}`, { size: 8.5, align: 'center', color: 'primary' });
    },
  },
  {
    id: 'letter-side', cat: 'business', name: 'lh2.name', scheme: 'forest', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, 8, H, { fill: 'primary' });
      k.logo(W - 44, 14, 28, 28, { art: 'i:leaf', color: 'primary' });
      k.text(22, 16, W - 80, 12, s('common.org'), { size: 22, font: 'heading', color: 'primary', field: 'org' });
      k.text(22, 28, W - 80, 20, `${s('common.address')}\n${s('common.phone')} · ${s('common.email')}`, { size: 9.5, lh: 1.35 });
      k.line(22, 50, W - 16, 50, { color: 'secondary', width: 0.6 });
      k.text(22, 60, W - 46, 120, s('lh.letter'), { size: 11, lh: 1.4, after: 8 });
      k.text(22, H - 14, W - 38, 6, s('common.web'), { size: 9, color: 'primary', align: 'right', field: 'web' });
    },
  },
  {
    id: 'comp-slip', cat: 'business', name: 'slip.name', scheme: 'royal', fonts: 'elegant', size: [210, 99],
    build(k) {
      const { W, H, s } = k;
      k.logo(14, 12, 22, 22, { art: 'i:crown', color: 'primary' });
      k.text(40, 12, W - 54, 10, s('common.org'), { size: 15, color: 'primary', bold: true, font: 'body', field: 'org' });
      k.text(40, 22, W - 54, 8, s('common.tagline'), { size: 9.5, italic: true, field: 'tagline' });
      k.text(14, 40, W - 28, 24, s('slip.title'), { size: 44, font: 'heading', align: 'center', color: 'dark' });
      k.rect(0, H - 16, W, 16, { fill: 'primary' });
      k.text(10, H - 16, W - 20, 16, `${s('common.phone')}  ·  ${s('common.email')}  ·  ${s('common.web')}`, { size: 9.5, color: 'light', align: 'center', valign: 'middle' });
    },
  },
  {
    id: 'voucher', cat: 'business', name: 'voucher.name', scheme: 'berry', fonts: 'script', size: [210, 99],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, 62, H, { fill: 'primary' });
      for (let y = 4; y < H; y += 6) k.circle(62, y, 1.4, { fill: 'light' });
      k.art('wrapped-gift', 13, 14, 36, 36);
      k.text(4, 56, 54, 20, s('voucher.value'), { size: 34, bold: true, color: 'light', align: 'center', font: 'body' });
      k.text(4, 78, 54, 10, s('voucher.no'), { size: 8.5, color: 'light', align: 'center' });
      k.text(72, 10, W - 82, 24, s('voucher.title'), { size: 44, font: 'heading', color: 'primary' });
      k.text(72, 34, W - 82, 8, s('common.org'), { size: 11, caps: true, tracking: 2, bold: true, field: 'org' });
      ['voucher.to', 'voucher.from'].forEach((key, i) => { k.text(72, 48 + i * 12, 22, 8, s(key), { size: 11, bold: true, color: 'primary' }); k.line(94, 54 + i * 12, W - 12, 54 + i * 12, { color: 'dark', width: 0.5 }); });
      k.text(72, H - 16, W - 82, 8, s('voucher.valid'), { size: 9.5, italic: true });
    },
  },
  {
    id: 'loyalty', cat: 'business', name: 'loyal.name', scheme: 'earth', fonts: 'slab', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 15, { fill: 'primary' });
      k.text(4, 0, W - 8, 15, s('common.org'), { size: 11, color: 'light', bold: true, valign: 'middle', align: 'center', field: 'org' });
      for (let i = 0; i < 10; i++) {
        const cx = 10 + (i % 5) * ((W - 20) / 4), cy = 23 + Math.floor(i / 5) * 12;
        k.circle(cx, cy, 4.6, { fill: i === 9 ? 'accent' : 'none', stroke: 'primary', sw: 0.6 });
        if (i === 9) k.art('i:gift', cx - 2.6, cy - 2.6, 5.2, 5.2, { color: 'light' });
      }
      k.text(4, H - 10, W - 8, 7, s('loyal.rule'), { size: 7.5, align: 'center', bold: true });
    },
  },
];

export const en = {
  'common.jobtitle': 'Job title', 'common.tagline': 'Your motto or a few words about what you do',
  'bc1.name': 'Business card · classic', 'bc2.name': 'Business card · modern', 'bc3.name': 'Business card · bold', 'bc4.name': 'Business card · elegant', 'bc5.name': 'Business card · with photo',
  'lh1.name': 'Letterhead · band', 'lh2.name': 'Letterhead · side line',
  'lh.letter': 'Dear Mrs Smith,\nThank you for your letter of 3 May. Type your letter here: it can run to the bottom of the page.\nA second paragraph goes here.\nKind regards,\n\nYour Name',
  'slip.name': 'Compliment slip', 'slip.title': 'With compliments',
  'voucher.name': 'Gift voucher', 'voucher.title': 'Gift Voucher', 'voucher.value': '€50', 'voucher.no': 'No. 0001', 'voucher.to': 'For', 'voucher.from': 'From', 'voucher.valid': 'Valid for 12 months from the date of issue.',
  'loyal.name': 'Loyalty card', 'loyal.rule': 'Collect 9 stamps · your 10th coffee is free',
};
