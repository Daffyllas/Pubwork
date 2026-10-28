// Invitations and cards. Most are A5 (half letter in the US); a few are postcards.
import { infoRows, confetti, frame } from './common.js';

// flowers in two opposite corners
function flowerCorners(k, size = 34) {
  const { W, H } = k;
  k.art('cherry-blossom', -size * 0.25, -size * 0.25, size, size);
  k.art('tulip', size * 0.45, -size * 0.12, size * 0.55, size * 0.55, { rotate: -30 });
  k.art('cherry-blossom', W - size * 0.75, H - size * 0.75, size, size);
  k.art('tulip', W - size, H - size * 0.45, size * 0.55, size * 0.55, { rotate: 150 });
}

export const cards = [
  {
    id: 'inv-kids', cat: 'cards', name: 'kids.inv.name', scheme: 'candy', fonts: 'friendly', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      confetti(k, [4, 4, W - 8, 10], { n: 16, seed: 11 }); confetti(k, [4, H - 8, W - 8, 5], { n: 14, seed: 2 });
      k.art('balloon', 6, 14, 20, 28); k.art('balloon', W - 26, 16, 18, 25, { rotate: 12 });
      k.text(28, 18, W - 56, 16, s('kids.inv.kicker'), { size: 18, font: 'heading', color: 'secondary', align: 'center', bold: true });
      k.text(26, 34, W - 52, 30, s('kids.inv.title'), { size: 40, font: 'heading', color: 'primary', align: 'center', bold: true, lh: 1 });
      k.circle(W / 2, 90, 20, { fill: 'accent' });
      k.text(W / 2 - 20, 74, 40, 32, [{ t: '7', size: 54, bold: true }], { color: 'light', align: 'center', valign: 'middle', font: 'heading' });
      k.text(14, 114, W - 28, 12, s('kids.inv.who'), { size: 18, align: 'center', bold: true, font: 'heading' });
      infoRows(k, 26, 132, W - 52, [['i:calendar', s('common.date')], ['i:clock', s('kids.inv.time')], ['i:map-pin', s('common.address')]], { size: 13, gap: 10, icon: 5.5 });
      k.art('birthday-cake', W / 2 - 13, 168, 26, 26);
      k.text(14, H - 18, W - 28, 10, s('kids.inv.rsvp'), { size: 11, align: 'center', italic: true });
    },
  },
  {
    id: 'inv-birthday', cat: 'cards', name: 'bday.name', scheme: 'royal', fonts: 'elegant', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      frame(k, 7, { color: 'secondary', width: 1.2, gap: 2, width2: 0.5 });
      k.art('clinking-glasses', W / 2 - 18, 22, 36, 36);
      k.text(12, 60, W - 24, 10, s('bday.kicker'), { size: 13, font: 'body', color: 'secondary', align: 'center', caps: true, tracking: 4 });
      k.text(12, 70, W - 24, 32, s('bday.title'), { size: 46, font: 'heading', color: 'light', align: 'center' });
      k.text(12, 104, W - 24, 34, s('bday.big'), { size: 64, font: 'body', color: 'secondary', align: 'center', bold: true });
      k.text(18, 140, W - 36, 30, s('bday.body'), { size: 13, color: 'light', align: 'center', lh: 1.3 });
      k.text(12, 172, W - 24, 18, [{ t: s('common.date'), bold: true }, { t: s('bday.where') }], { size: 13, color: 'secondary', align: 'center' });
    },
  },
  {
    id: 'inv-wedding', cat: 'cards', name: 'wed.name', scheme: 'lavender', fonts: 'elegant', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      flowerCorners(k, 40);
      k.text(14, 34, W - 28, 20, s('wed.kicker'), { size: 12, align: 'center', caps: true, tracking: 3, color: 'dark' });
      k.text(10, 52, W - 20, 54, s('wed.names'), { size: 50, font: 'heading', color: 'primary', align: 'center', lh: 0.95 });
      k.text(18, 110, W - 36, 24, s('wed.body'), { size: 12.5, align: 'center', lh: 1.35 });
      k.line(W / 2 - 22, 136, W / 2 + 22, 136, { color: 'secondary', width: 0.8 });
      k.text(14, 140, W - 28, 30, [{ t: s('wed.date'), size: 15, bold: true }, { t: s('wed.time'), size: 12.5 }, { t: s('wed.place'), size: 12.5 }], { align: 'center', lh: 1.35 });
      k.text(18, 176, W - 36, 12, s('wed.rsvp'), { size: 11, align: 'center', italic: true, color: 'primary' });
    },
  },
  {
    id: 'save-date', cat: 'cards', name: 'std.name', scheme: 'seaside', fonts: 'elegant', size: 'quarter-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W * 0.42, H, { fill: 'primary' });
      k.photo(6, 6, W * 0.42 - 12, H - 12);
      k.text(W * 0.42 + 6, 12, W * 0.58 - 12, 34, s('std.title'), { size: 34, font: 'heading', color: 'primary', align: 'center', lh: 0.95 });
      k.art('ring', W * 0.71 - 6, 46, 12, 12);
      k.text(W * 0.42 + 6, 60, W * 0.58 - 12, 12, s('std.names'), { size: 15, align: 'center', bold: true, font: 'body' });
      k.text(W * 0.42 + 6, 72, W * 0.58 - 12, 10, s('wed.date'), { size: 13, align: 'center', color: 'accent', bold: true });
      k.text(W * 0.42 + 6, 82, W * 0.58 - 12, 14, s('std.more'), { size: 9.5, align: 'center', italic: true });
    },
  },
  {
    id: 'inv-baptism', cat: 'cards', name: 'bapt.name', scheme: 'ocean', fonts: 'traditional', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.wave(H - 32, 5, { fill: 'secondary', opacity: 0.35, waves: 3 }); k.wave(H - 24, 5, { fill: 'secondary', opacity: 0.6, waves: 2 });
      k.art('dove', W / 2 - 20, 16, 40, 40);
      k.text(12, 58, W - 24, 10, s('bapt.kicker'), { size: 12, align: 'center', caps: true, tracking: 3 });
      k.text(12, 68, W - 24, 24, s('bapt.title'), { size: 34, font: 'heading', color: 'primary', align: 'center' });
      k.text(12, 92, W - 24, 18, s('bapt.name2'), { size: 28, font: 'heading', color: 'dark', align: 'center', bold: true });
      k.text(18, 116, W - 36, 50, [{ t: s('common.date'), bold: true, size: 14 }, { t: s('bapt.time') }, { t: s('bapt.church') }, { t: s('bapt.after'), italic: true, before: 6 }], { size: 12.5, align: 'center', lh: 1.35 });
      k.text(18, H - 20, W - 36, 10, s('bapt.rsvp'), { size: 11, align: 'center', color: 'primary' });
    },
  },
  {
    id: 'inv-babyshower', cat: 'cards', name: 'baby.name', scheme: 'mint', fonts: 'handwritten', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      for (let i = 0; i < 6; i++) k.circle(16 + i * ((W - 32) / 5), 12, 10, { fill: i % 2 ? 'secondary' : 'primary', opacity: 0.35 });
      k.art('teddy-bear', W / 2 - 24, 26, 48, 48); k.art('baby-bottle', 18, 46, 20, 20, { rotate: -20 }); k.art('ribbon', W - 38, 46, 20, 20);
      k.text(12, 78, W - 24, 28, s('baby.title'), { size: 40, font: 'heading', color: 'primary', align: 'center', bold: true });
      k.text(12, 106, W - 24, 12, s('baby.for'), { size: 17, align: 'center' });
      infoRows(k, 28, 126, W - 56, [['i:calendar', s('common.date')], ['i:clock', s('baby.time')], ['i:map-pin', s('common.address')]], { size: 13, gap: 10, icon: 5.5 });
      k.text(14, 164, W - 28, 20, s('baby.note'), { size: 12, align: 'center', italic: true, lh: 1.3 });
      k.text(14, H - 18, W - 28, 10, s('baby.rsvp'), { size: 12, align: 'center', color: 'primary', bold: true });
    },
  },
  {
    id: 'card-thanks', cat: 'cards', name: 'thanks.name', scheme: 'coral', fonts: 'script', size: 'quarter-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W - 10, H - 6, 40, { fill: 'secondary', opacity: 0.35 }); k.circle(8, 4, 26, { fill: 'primary', opacity: 0.25 });
      k.text(8, H * 0.18, W - 16, 40, s('thanks.title'), { size: 64, font: 'heading', color: 'primary', align: 'center' });
      k.art('red-heart', W / 2 - 6, H * 0.58, 12, 12);
      k.text(14, H * 0.7, W - 28, 16, s('thanks.body'), { size: 11.5, align: 'center', lh: 1.3 });
    },
  },
  {
    id: 'card-christmas', cat: 'cards', name: 'xmas.name', scheme: 'festive', fonts: 'elegant', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      const flakes = [[18, 20], [W - 22, 30], [30, 80], [W - 30, 96], [14, 150], [W - 18, 170], [W / 2 + 40, 16], [W / 2 - 46, 120]];
      flakes.forEach(([x, y], i) => k.art('i:snowflake', x - 4, y - 4, 8 + (i % 3) * 3, 8 + (i % 3) * 3, { color: 'light' }));
      k.art('christmas-tree', W / 2 - 34, 26, 68, 68);
      k.text(10, 98, W - 20, 50, s('xmas.title'), { size: 52, font: 'heading', color: 'light', align: 'center', lh: 0.95 });
      k.line(W / 2 - 24, 152, W / 2 + 24, 152, { color: 'accent', width: 1 });
      k.text(18, 158, W - 36, 24, s('xmas.body'), { size: 12.5, align: 'center', color: 'light', lh: 1.35 });
      k.text(18, H - 22, W - 36, 10, s('xmas.from'), { size: 13, align: 'center', color: 'accent', italic: true });
    },
  },
  {
    id: 'card-easter', cat: 'cards', name: 'easter.name', scheme: 'spring', fonts: 'friendly', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.wave(H * 0.72, 6, { fill: 'primary', waves: 3 });
      const eggs = [['primary', 0], ['secondary', 18], ['accent', -14]];
      eggs.forEach(([c, r], i) => { const x = W / 2 - 34 + i * 24; k.ellipse(x, H * 0.62 - (i === 1 ? 6 : 0), 20, 26, { fill: c, rotate: r }); k.rect(x + 2, H * 0.62 + 8 - (i === 1 ? 6 : 0), 16, 3, { fill: 'light', opacity: 0.8, rotate: r }); });
      k.art('hatching-chick', 18, H * 0.62, 26, 26); k.art('rabbit-face', W - 44, H * 0.6, 28, 28);
      k.art('tulip', 14, 14, 20, 20); k.art('blossom', W - 34, 16, 20, 20);
      k.text(12, 40, W - 24, 60, s('easter.title'), { size: 54, font: 'heading', color: 'primary', align: 'center', bold: true, lh: 0.95 });
      k.text(18, 104, W - 36, 24, s('easter.body'), { size: 14, align: 'center', lh: 1.3 });
      k.text(18, H - 30, W - 36, 14, s('xmas.from'), { size: 13, align: 'center', color: 'light', bold: true });
    },
  },
  {
    id: 'inv-graduation', cat: 'cards', name: 'grad.name', scheme: 'navy', fonts: 'bold', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H * 0.48, { fill: 'primary' });
      confetti(k, [4, 4, W - 8, H * 0.44], { n: 30, colors: ['secondary', 'light'], seed: 5 });
      k.art('graduation-cap', W / 2 - 26, 16, 52, 52);
      k.text(10, 66, W - 20, 30, s('grad.title'), { size: 34, font: 'heading', color: 'light', align: 'center', lh: 1 });
      k.text(12, H * 0.5 + 4, W - 24, 10, s('grad.kicker'), { size: 12, caps: true, tracking: 3, align: 'center' });
      k.text(12, H * 0.5 + 14, W - 24, 18, s('grad.who'), { size: 26, font: 'heading', align: 'center', color: 'primary' });
      k.text(12, H * 0.5 + 32, W - 24, 10, s('grad.class'), { size: 14, align: 'center', color: 'secondary', bold: true });
      infoRows(k, 28, H * 0.5 + 48, W - 56, [['i:calendar', s('common.date')], ['i:clock', s('common.time')], ['i:map-pin', s('common.address')]], { size: 13, gap: 10, icon: 5.5 });
    },
  },
  {
    id: 'inv-retirement', cat: 'cards', name: 'retire.name', scheme: 'earth', fonts: 'classic', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W / 2, 64, 40, { fill: 'secondary', opacity: 0.45 });
      k.art('beach-with-umbrella', W / 2 - 30, 34, 60, 60);
      k.text(12, 108, W - 24, 32, s('retire.title'), { size: 34, font: 'heading', color: 'primary', align: 'center', bold: true, lh: 1 });
      k.text(18, 142, W - 36, 24, s('retire.body'), { size: 13, align: 'center', lh: 1.3 });
      k.text(14, 168, W - 28, 24, [{ t: s('common.date'), bold: true }, { t: s('common.place') }], { size: 13, align: 'center', color: 'accent', lh: 1.35 });
    },
  },
  {
    id: 'inv-dinner', cat: 'cards', name: 'dinner.name', scheme: 'berry', fonts: 'modern', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.rect(10, 10, W - 20, H - 20, { fill: 'light', r: 3 });
      k.art('fork-and-knife-with-plate', W / 2 - 22, 20, 44, 44);
      k.text(14, 68, W - 28, 10, s('dinner.kicker'), { size: 12, caps: true, tracking: 3, align: 'center', color: 'primary', bold: true });
      k.text(14, 78, W - 28, 30, s('dinner.title'), { size: 40, font: 'heading', align: 'center', color: 'dark', bold: true, lh: 1 });
      k.text(20, 112, W - 40, 26, s('dinner.body'), { size: 13, align: 'center', lh: 1.35 });
      k.text(14, 146, W - 28, 30, [{ t: s('common.date'), bold: true }, { t: s('dinner.time') }, { t: s('common.address') }], { size: 13, align: 'center', lh: 1.35 });
      k.text(14, H - 30, W - 28, 10, s('dinner.rsvp'), { size: 11.5, align: 'center', italic: true, color: 'primary' });
    },
  },
];

export const en = {
  'kids.inv.name': 'Children’s party', 'kids.inv.kicker': 'Hooray!', 'kids.inv.title': 'Come to my party!', 'kids.inv.who': 'Emma is turning 7', 'kids.inv.time': '3 – 6 pm', 'kids.inv.rsvp': 'Please let us know by 7 June: 0123 456 789',
  'bday.name': 'Birthday invitation', 'bday.kicker': 'Join us to celebrate', 'bday.title': 'Maria’s', 'bday.big': '50th', 'bday.body': 'An evening of good food, music and old friends. Your presence is the only present we need.', 'bday.where': '8 pm · The Garden Restaurant',
  'wed.name': 'Wedding invitation', 'wed.kicker': 'Together with their families', 'wed.names': 'Sophie\n& James', 'wed.body': 'request the pleasure of your company at the celebration of their marriage', 'wed.date': 'Saturday 12 September', 'wed.time': 'at three o’clock in the afternoon', 'wed.place': 'St Mary’s Church, Oak Lane', 'wed.rsvp': 'Kindly reply by 1 August',
  'std.name': 'Save the date', 'std.title': 'Save the Date', 'std.names': 'Sophie & James', 'std.more': 'Invitation to follow',
  'bapt.name': 'Baptism invitation', 'bapt.kicker': 'Please join us for the', 'bapt.title': 'Baptism of', 'bapt.name2': 'Lucas', 'bapt.time': 'at 11 am', 'bapt.church': 'St Nicholas Church', 'bapt.after': 'followed by lunch at our home', 'bapt.rsvp': 'Please reply to Anna and Mark',
  'baby.name': 'Baby shower', 'baby.title': 'Baby Shower', 'baby.for': 'for Anna', 'baby.time': '2 – 5 pm', 'baby.note': 'Tea, cake and lots of love. Gifts are welcome but not needed!', 'baby.rsvp': 'RSVP to Kate · 0123 456 789',
  'thanks.name': 'Thank-you card', 'thanks.title': 'Thank you', 'thanks.body': 'Your kindness meant so much to us. With love and warm wishes.',
  'xmas.name': 'Christmas card', 'xmas.title': 'Merry Christmas', 'xmas.body': 'Wishing you peace, joy and happiness this Christmas and in the New Year.', 'xmas.from': 'With love from all of us',
  'easter.name': 'Easter card', 'easter.title': 'Happy Easter', 'easter.body': 'Warm wishes for a joyful spring and a happy Easter with your family.',
  'grad.name': 'Graduation party', 'grad.title': 'Graduation Party', 'grad.kicker': 'Please join us to celebrate', 'grad.who': 'Daniel Smith', 'grad.class': 'Class of 2027',
  'retire.name': 'Retirement party', 'retire.title': 'Happy Retirement, Peter!', 'retire.body': 'After 35 wonderful years, join us to say thank you and wish him well.',
  'dinner.name': 'Dinner party', 'dinner.kicker': 'You are invited to', 'dinner.title': 'Dinner with Friends', 'dinner.body': 'Good food, good wine and good company. Come hungry!', 'dinner.time': '7.30 pm', 'dinner.rsvp': 'Let us know if you can come',
};
