// Flyers and posters. Each template draws relative to the page, so it fits A4 and US Letter alike.
import { infoRows, tearOffs, bunting, confetti } from './common.js';

export const flyers = [
  {
    id: 'flyer-party', cat: 'flyers', name: 'party.name', scheme: 'sunshine', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.wave(H * 0.46, 8, { below: false, fill: 'secondary', opacity: 0.55, waves: 3 });
      k.wave(H * 0.44, 10, { below: false, fill: 'primary' });
      confetti(k, [10, 8, W - 20, H * 0.32], { colors: ['light', 'secondary', 'accent'], n: 30 });
      k.art('party-popper', W - 78, H * 0.05, 64, 64);
      k.text(16, H * 0.08, W - 90, 30, s('party.kicker'), { size: 22, color: 'light', font: 'heading', caps: true, tracking: 2 });
      k.text(16, H * 0.15, W - 32, 62, s('party.title'), { size: 76, color: 'light', font: 'heading', lh: 0.9 });
      infoRows(k, 22, H * 0.5, W - 44, [['i:calendar', s('common.date')], ['i:clock', s('common.time')], ['i:map-pin', s('common.place')]], { size: 20, gap: 13, icon: 8 });
      k.text(22, H * 0.66, W - 44, 40, s('party.body'), { size: 15, lh: 1.25 });
      k.rect(0, H - 22, W, 22, { fill: 'dark' });
      k.text(16, H - 22, W - 32, 22, s('party.footer'), { size: 15, color: 'light', align: 'center', valign: 'middle', bold: true });
    },
  },
  {
    id: 'flyer-sale', cat: 'flyers', name: 'sale.name', scheme: 'berry', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.poly([[0, H * 0.58], [W, H * 0.38], [W, H], [0, H]], { fill: 'light' });
      k.text(14, 18, W - 28, 20, s('sale.kicker'), { size: 24, color: 'light', font: 'heading', caps: true, tracking: 3 });
      k.text(10, 34, W - 20, 70, s('sale.title'), { size: Math.min(150, 620 / Math.max(4, s('sale.title').length)), color: 'light', font: 'heading', lh: 0.85 });
      k.star(W - 52, H * 0.4, 36, { points: 14, inner: 0.82, fill: 'accent' });
      k.text(W - 86, H * 0.4 - 18, 68, 36, [{ t: s('sale.upto'), size: 14 }, { t: s('sale.pct'), size: 44, lh: 0.9 }], { color: 'dark', font: 'heading', align: 'center', valign: 'middle', bold: true });
      k.art('shopping-bags', 18, H * 0.33, 58, 58);
      k.text(18, H * 0.62, W - 36, 22, s('sale.what'), { size: 26, font: 'heading', color: 'primary' });
      k.text(18, H * 0.71, W - 36, 30, s('sale.body'), { size: 15, lh: 1.25 });
      infoRows(k, 18, H * 0.82, W - 36, [['i:calendar', s('sale.dates')], ['i:map-pin', s('common.shop')]], { size: 17, gap: 11, iconColor: 'primary' });
    },
  },
  {
    id: 'flyer-lostpet', cat: 'flyers', name: 'lost.name', scheme: 'coral', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 46, { fill: 'primary' });
      k.text(10, 4, W - 20, 40, s('lost.title'), { size: Math.min(84, 680 / Math.max(8, s('lost.title').length)), font: 'heading', color: 'light', align: 'center', valign: 'middle' });
      k.photo(25, 54, W - 50, H * 0.36);
      k.text(20, 60 + H * 0.36, W - 40, 16, s('lost.petname'), { size: 30, font: 'heading', color: 'dark', align: 'center' });
      k.text(24, 78 + H * 0.36, W - 48, 34, s('lost.desc'), { size: 14, align: 'center', lh: 1.25 });
      k.rect(18, H - 104, W - 36, 34, { fill: 'light', r: 4 });
      k.text(18, H - 102, W - 36, 14, s('lost.call'), { size: 18, font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      k.text(18, H - 88, W - 36, 16, s('common.phone'), { size: 30, font: 'heading', color: 'dark', align: 'center', valign: 'middle', field: 'phone' });
      tearOffs(k, `${s('lost.short')}\n${s('common.phone')}`, { n: 8, h: 54 });
    },
  },
  {
    id: 'flyer-yardsale', cat: 'flyers', name: 'yard.name', scheme: 'spring', fonts: 'slab',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      bunting(k, 8, { n: 11, h: 16 });
      k.text(14, 34, W - 28, 50, s('yard.title'), { size: 82, font: 'heading', color: 'primary', align: 'center', bold: true });
      k.text(14, 82, W - 28, 14, s('yard.sub'), { size: 20, align: 'center', color: 'dark' });
      k.art('house-with-garden', W / 2 - 32, 100, 64, 64);
      const items = s('yard.items').split('\n'), half = Math.ceil(items.length / 2);
      [items.slice(0, half), items.slice(half)].forEach((col, c) => col.forEach((t, i) => {
        const x = 28 + c * (W - 56) / 2, y = 176 + i * 10;
        k.art('i:check', x, y + 1.5, 6, 6, { color: 'primary' });
        k.text(x + 9, y, (W - 56) / 2 - 10, 10, t, { size: 15, valign: 'middle' });
      }));
      k.rect(18, H - 66, W - 36, 50, { fill: 'secondary', r: 5 });
      infoRows(k, 28, H - 62, W - 56, [['i:calendar', s('common.date')], ['i:clock', s('yard.time')], ['i:map-pin', s('common.address'), 'address']], { size: 16, gap: 13.5, iconColor: 'dark' });
    },
  },
  {
    id: 'flyer-class', cat: 'flyers', name: 'class.name', scheme: 'lavender', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W * 0.44, H, { fill: 'primary' });
      k.photo(14, 18, W * 0.44 - 28, H * 0.42);
      k.art('artist-palette', 22, H * 0.52, 44, 44);
      k.text(14, H * 0.7, W * 0.44 - 28, 60, s('class.side'), { size: 15, color: 'light', lh: 1.3 });
      const x = W * 0.44 + 14, w = W * 0.56 - 28;
      k.text(x, 18, w, 18, s('class.kicker'), { size: 14, color: 'primary', caps: true, tracking: 2, bold: true });
      k.text(x, 30, w, 60, s('class.title'), { size: 44, font: 'heading', color: 'dark', lh: 1 });
      k.text(x, 92, w, 30, s('class.sub'), { size: 15, lh: 1.3 });
      k.text(x, 126, w, 12, s('class.learn'), { size: 17, font: 'heading', color: 'primary', bold: true });
      s('class.points').split('\n').forEach((t, i) => { k.circle(x + 2.5, 144 + i * 11, 1.8, { fill: 'accent' }); k.text(x + 8, 139 + i * 11, w - 8, 10, t, { size: 14, valign: 'middle' }); });
      infoRows(k, x, H - 92, w, [['i:calendar', s('class.when')], ['i:clock', s('common.time')], ['i:map-pin', s('common.place')], ['i:phone', s('common.phone'), 'phone']], { size: 14, gap: 11, icon: 6 });
      // the price badge sits on the corner of the photo, clear of the list on the right
      const bx = W * 0.44 - 8, by = 18 + H * 0.42;
      k.circle(bx, by, 20, { fill: 'accent' });
      k.text(bx - 20, by - 12, 40, 24, [{ t: s('class.price'), size: 22, bold: true }, { t: s('class.per'), size: 10 }], { color: 'light', align: 'center', valign: 'middle', font: 'heading' });
    },
  },
  {
    id: 'flyer-concert', cat: 'flyers', name: 'concert.name', scheme: 'royal', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      for (let i = 0; i < 9; i++) k.circle(W / 2, H * 0.3, 18 + i * 12, { fill: 'none', stroke: i % 2 ? 'secondary' : 'primary', sw: 1.2 });
      k.art('guitar', W / 2 - 36, H * 0.3 - 36, 72, 72);
      k.text(12, H * 0.56, W - 24, 18, s('concert.kicker'), { size: 20, color: 'secondary', caps: true, tracking: 4, align: 'center', font: 'heading' });
      k.text(12, H * 0.6, W - 24, 46, s('concert.title'), { size: 70, color: 'light', align: 'center', font: 'heading', lh: 0.95 });
      k.text(12, H * 0.76, W - 24, 24, s('concert.acts'), { size: 18, color: 'light', align: 'center', lh: 1.3 });
      k.line(W / 2 - 40, H * 0.86, W / 2 + 40, H * 0.86, { color: 'secondary', width: 1.5 });
      k.text(12, H * 0.875, W - 24, 12, `${s('common.date')} · ${s('concert.doors')}`, { size: 16, color: 'secondary', align: 'center', bold: true });
      k.text(12, H * 0.915, W - 24, 12, `${s('common.place')} · ${s('concert.tickets')}`, { size: 14, color: 'light', align: 'center' });
    },
  },
  {
    id: 'flyer-bakesale', cat: 'flyers', name: 'bake.name', scheme: 'candy', fonts: 'friendly', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      confetti(k, [6, 6, W - 12, H - 12], { n: 40, seed: 3 });
      k.rect(12, 12, W - 24, H - 24, { fill: '#ffffff', r: 6, stroke: 'primary', sw: 2, dash: [6, 4] });
      k.art('cupcake', W / 2 - 26, 22, 52, 52);
      k.text(16, 76, W - 32, 34, s('bake.title'), { size: 54, font: 'heading', color: 'primary', align: 'center', bold: true });
      k.text(20, 110, W - 40, 22, s('bake.sub'), { size: 15, align: 'center', lh: 1.25 });
      k.art('cookie', 24, 136, 18, 18); k.art('doughnut', W / 2 - 9, 136, 18, 18); k.art('pie', W - 42, 136, 18, 18);
      infoRows(k, 26, 158, W - 52, [['i:calendar', s('common.date')], ['i:clock', s('bake.time')], ['i:map-pin', s('common.place')]], { size: 13, gap: 8.5, icon: 5.5 });
      k.text(20, H - 23, W - 40, 9, s('bake.footer'), { size: 12, align: 'center', italic: true, color: 'dark' });
    },
  },
  {
    id: 'flyer-fitness', cat: 'flyers', name: 'fit.name', scheme: 'ocean', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.photo(0, 0, W, H * 0.45);
      k.poly([[0, H * 0.38], [W, H * 0.3], [W, H * 0.47], [0, H * 0.55]], { fill: 'primary' });
      k.text(14, H * 0.38, W - 28, 47, s('fit.title'), { size: 64, font: 'heading', color: 'light', lh: 0.95, rotate: 4.3 });
      k.text(16, H * 0.58, W - 32, 18, s('fit.sub'), { size: 20, color: 'primary', bold: true });
      k.text(16, H * 0.64, W - 110, 34, s('fit.body'), { size: 14, lh: 1.3 });
      const days = s('fit.days').split('\n');
      days.forEach((d, i) => {
        const y = H * 0.76 + i * 12;
        k.rect(16, y, W - 32, 10, { fill: i % 2 ? 'light' : 'secondary', opacity: i % 2 ? 1 : 0.18 });
        k.text(20, y, W - 40, 10, d, { size: 14, valign: 'middle', bold: true });
      });
      k.art('flexed-biceps', W - 86, H * 0.6, 50, 50);
      k.text(16, H - 16, W - 32, 10, `${s('common.phone')} · ${s('common.web')}`, { size: 12, color: 'primary', bold: true, align: 'center' });
    },
  },
  {
    id: 'flyer-house', cat: 'flyers', name: 'house.name', scheme: 'navy', fonts: 'classic',
    build(k) {
      const { W, H, s } = k;
      k.photo(0, 0, W, H * 0.5);
      k.rect(0, H * 0.5 - 22, W * 0.62, 22, { fill: 'primary' });
      k.text(14, H * 0.5 - 22, W * 0.62 - 20, 22, s('house.title'), { size: 28, font: 'heading', color: 'light', valign: 'middle', bold: true });
      k.rect(W * 0.62, H * 0.5 - 22, W * 0.38, 22, { fill: 'secondary' });
      k.text(W * 0.62, H * 0.5 - 22, W * 0.38, 22, s('house.price'), { size: 24, font: 'heading', color: 'dark', align: 'center', valign: 'middle', bold: true });
      k.text(14, H * 0.53, W - 28, 14, s('common.address'), { size: 17, color: 'primary', bold: true, field: 'address' });
      k.text(14, H * 0.58, W - 28, 30, s('house.body'), { size: 13.5, lh: 1.35 });
      const feats = [['i:home', s('house.f1')], ['i:building', s('house.f2')], ['i:plant', s('house.f3')], ['i:car', s('house.f4')]];
      feats.forEach(([ic, t], i) => { const x = 14 + i * (W - 28) / 4; k.art(ic, x + (W - 28) / 8 - 6, H * 0.71, 12, 12, { color: 'primary' }); k.text(x, H * 0.71 + 14, (W - 28) / 4, 12, t, { size: 12, align: 'center' }); });
      k.rect(0, H - 42, W, 42, { fill: 'light' });
      k.photo(14, H - 37, 32, 32, { round: true });
      k.text(52, H - 36, W - 66, 10, s('common.yourname'), { size: 16, bold: true, font: 'heading', field: 'name' });
      k.text(52, H - 27, W - 66, 8, s('common.org'), { size: 12, field: 'org' });
      k.text(52, H - 18, W - 66, 10, `${s('common.phone')}   ${s('common.email')}`, { size: 12, color: 'primary', bold: true });
    },
  },
  {
    id: 'flyer-fundraiser', cat: 'flyers', name: 'fund.name', scheme: 'forest', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W / 2, -H * 0.2, H * 0.6, { fill: 'primary' });
      k.art('person-running', W / 2 - 26, 14, 52, 52);
      k.text(24, 70, W - 48, 44, s('fund.title'), { size: 50, font: 'heading', color: 'light', align: 'center', bold: true, lh: 1 });
      k.text(20, H * 0.42, W - 40, 26, s('fund.sub'), { size: 17, align: 'center', lh: 1.3 });
      // a thermometer of what has been raised
      const bx = 30, by = H * 0.53, bw = W - 60;
      k.text(bx, by - 2, bw, 10, s('fund.goal'), { size: 15, bold: true, color: 'primary', align: 'center' });
      k.rect(bx, by + 10, bw, 12, { fill: '#ffffff', stroke: 'primary', sw: 1.5, r: 6 });
      k.rect(bx, by + 10, bw * 0.4, 12, { fill: 'secondary', r: 6 });
      k.text(bx, by + 24, bw, 8, s('fund.raised'), { size: 11, italic: true, align: 'center' });
      infoRows(k, 34, H * 0.7, W - 68, [['i:calendar', s('common.date')], ['i:map-pin', s('common.place')], ['i:heart', s('fund.how')]], { size: 15, gap: 11 });
      k.rect(0, H - 18, W, 18, { fill: 'primary' });
      k.text(10, H - 18, W - 20, 18, s('common.web'), { size: 14, color: 'light', align: 'center', valign: 'middle', bold: true, field: 'web' });
    },
  },
  {
    id: 'flyer-hiring', cat: 'flyers', name: 'hire.name', scheme: 'mint', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.rect(14, 14, W - 28, H - 28, { fill: 'light', r: 4 });
      k.text(26, 28, W - 52, 16, s('hire.kicker'), { size: 16, caps: true, tracking: 3, color: 'primary', bold: true });
      k.text(26, 40, W - 52, 70, s('hire.title'), { size: 72, font: 'heading', color: 'dark', lh: 0.95, bold: true });
      k.art('handshake', W - 92, 112, 64, 64);
      k.text(26, 118, W - 130, 40, s('hire.sub'), { size: 15, lh: 1.3 });
      s('hire.roles').split('\n').forEach((t, i) => {
        const y = 168 + i * 15;
        k.rect(26, y, W - 52, 12, { fill: 'primary', opacity: i % 2 ? 0.12 : 0.22, r: 3 });
        k.text(32, y, W - 64, 12, t, { size: 15, bold: true, valign: 'middle' });
      });
      k.text(26, H - 66, W - 52, 12, s('hire.apply'), { size: 18, font: 'heading', color: 'primary', bold: true });
      infoRows(k, 26, H - 54, W - 52, [['i:mail', s('common.email'), 'email'], ['i:phone', s('common.phone'), 'phone']], { size: 15, gap: 11 });
    },
  },
  {
    id: 'flyer-tutoring', cat: 'flyers', name: 'tutor.name', scheme: 'seaside', fonts: 'handwritten',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#fffdf5' });
      for (let y = 40; y < H - 70; y += 9) k.line(0, y, W, y, { color: 'secondary', width: 0.4 });
      k.line(28, 0, 28, H - 54, { color: 'accent', width: 0.8 });
      k.art('pushpin', W / 2 - 10, 4, 20, 20);
      k.text(36, 22, W - 50, 30, s('tutor.title'), { size: 50, font: 'heading', color: 'primary', bold: true });
      k.text(36, 58, W - 50, 30, s('tutor.sub'), { size: 18, lh: 1.25 });
      s('tutor.points').split('\n').forEach((t, i) => { k.art('i:check', 36, 98 + i * 13, 7, 7, { color: 'primary' }); k.text(46, 96 + i * 13, W - 70, 11, t, { size: 17, valign: 'middle' }); });
      k.art('books', W - 66, 104, 44, 44);
      k.text(36, H - 104, W - 50, 30, s('tutor.price'), { size: 22, font: 'heading', color: 'dark', bold: true });
      tearOffs(k, `${s('tutor.short')}\n${s('common.phone')}`, { n: 9, h: 48, field: null });
    },
  },
  {
    id: 'flyer-market', cat: 'flyers', name: 'market.name', scheme: 'earth', fonts: 'slab',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(10, 10, W - 20, H - 20, { fill: 'none', stroke: 'primary', sw: 2 });
      k.text(16, 20, W - 32, 14, s('market.kicker'), { size: 16, caps: true, tracking: 4, align: 'center', color: 'accent', bold: true });
      k.text(16, 32, W - 32, 50, s('market.title'), { size: 64, font: 'heading', align: 'center', color: 'primary', lh: 0.95, bold: true });
      k.art('basket', W / 2 - 34, 86, 68, 68);
      const pics = ['carrot', 'tomato', 'red-apple', 'grapes', 'bread', 'cheese-wedge', 'honey-pot', 'sunflower'];
      pics.forEach((p, i) => { const a = (i / pics.length) * Math.PI * 2; k.art(p, W / 2 - 9 + Math.cos(a) * 58, 120 - 9 + Math.sin(a) * 40, 18, 18); });
      k.text(20, 172, W - 40, 30, s('market.sub'), { size: 16, align: 'center', lh: 1.3 });
      k.rect(30, H - 76, W - 60, 46, { fill: 'primary', r: 4 });
      k.text(34, H - 74, W - 68, 22, s('market.when'), { size: 22, font: 'heading', align: 'center', valign: 'middle', color: 'light', bold: true });
      k.text(34, H - 52, W - 68, 20, s('common.place'), { size: 15, align: 'center', valign: 'middle', color: 'light' });
    },
  },
  {
    id: 'flyer-cleanup', cat: 'flyers', name: 'clean.name', scheme: 'spring', fonts: 'friendly',
    build(k) {
      const { W, H, s } = k;
      k.wave(H * 0.75, 8, { fill: 'primary', opacity: 0.25 });
      k.wave(H * 0.8, 8, { fill: 'primary', waves: 3 });
      k.art('recycling-symbol', 18, 18, 40, 40);
      k.art('deciduous-tree', W - 70, 14, 54, 54);
      k.text(18, 64, W - 36, 50, s('clean.title'), { size: 54, font: 'heading', color: 'primary', bold: true, lh: 1 });
      k.text(18, 118, W - 36, 24, s('clean.sub'), { size: 17, lh: 1.3 });
      k.text(18, 146, W - 36, 10, s('clean.bring'), { size: 17, bold: true, color: 'accent', font: 'heading' });
      s('clean.items').split('\n').forEach((t, i) => { k.art('i:check', 20, 160 + i * 10, 6, 6, { color: 'primary' }); k.text(30, 158.5 + i * 10, W - 50, 9, t, { size: 14, valign: 'middle' }); });
      infoRows(k, 20, H * 0.82, W - 40, [['i:calendar', s('common.date')], ['i:map-pin', s('clean.meet')]], { size: 16, gap: 12, color: 'light', iconColor: 'light' });
    },
  },
  {
    id: 'flyer-movie', cat: 'flyers', name: 'movie.name', scheme: 'mono', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      for (let i = 0; i < 26; i++) { k.rect(4, 6 + i * 11.2, 6, 7, { fill: 'light', r: 1 }); k.rect(W - 10, 6 + i * 11.2, 6, 7, { fill: 'light', r: 1 }); }
      k.star(40, 40, 3, { fill: 'secondary' }); k.star(W - 50, 60, 2.5, { fill: 'secondary' }); k.star(70, 90, 2, { fill: 'light' }); k.star(W - 40, 120, 3, { fill: 'light' });
      k.art('popcorn', 30, H * 0.12, 64, 64); k.art('clapper-board', W - 94, H * 0.16, 64, 64);
      k.text(18, H * 0.4, W - 36, 18, s('movie.kicker'), { size: 20, caps: true, tracking: 5, color: 'accent', align: 'center', font: 'heading' });
      k.text(18, H * 0.45, W - 36, 50, s('movie.title'), { size: 72, color: 'light', align: 'center', font: 'heading', lh: 0.95 });
      k.text(18, H * 0.63, W - 36, 24, s('movie.film'), { size: 18, color: 'light', align: 'center', italic: true });
      k.rect(36, H * 0.74, W - 72, 34, { fill: 'accent', r: 3 });
      k.text(40, H * 0.74, W - 80, 34, [{ t: `${s('common.date')} · ${s('movie.time')}`, size: 18, bold: true }, { t: s('common.place'), size: 14 }], { color: 'light', align: 'center', valign: 'middle' });
      k.text(18, H - 30, W - 36, 14, s('movie.footer'), { size: 13, color: 'secondary', align: 'center' });
    },
  },
];

export const en = {
  'common.date': 'Saturday 14 June', 'common.time': '6 pm until late', 'common.place': 'Village Hall, Church Street',
  'common.address': '12 Church Street, Springfield', 'common.shop': 'Our shop on the High Street', 'common.phone': '0123 456 789',
  'common.email': 'hello@example.com', 'common.web': 'www.example.com', 'common.yourname': 'Your Name', 'common.org': 'Your Business',
  'party.name': 'Summer party', 'party.kicker': 'You are invited', 'party.title': 'Summer\nParty!', 'party.body': 'Music, food, games for the children and a raffle with great prizes. Bring your family and friends, everyone is welcome.', 'party.footer': 'Free entry · Food and drinks for sale',
  'sale.name': 'Big sale', 'sale.kicker': 'This weekend only', 'sale.title': 'SALE', 'sale.upto': 'up to', 'sale.pct': '50%\noff', 'sale.what': 'Everything must go!', 'sale.body': 'Clothes, shoes, bags and gifts at the lowest prices of the year. While stocks last.', 'sale.dates': 'Friday 13 – Sunday 15 June',
  'lost.name': 'Lost pet', 'lost.title': 'LOST DOG', 'lost.petname': 'Have you seen Max?', 'lost.desc': 'Small brown terrier with a red collar. Very friendly. Last seen near the park on Monday evening.', 'lost.call': 'Please call', 'lost.short': 'Lost dog Max',
  'yard.name': 'Yard sale', 'yard.title': 'Yard Sale', 'yard.sub': 'Bargains for the whole family', 'yard.items': 'Furniture\nToys and games\nBooks\nKitchen things\nClothes\nGarden tools', 'yard.time': '8 am – 2 pm',
  'class.name': 'Course or class', 'class.side': 'Small groups, friendly teacher and all materials included.', 'class.kicker': 'New course', 'class.title': 'Watercolour for beginners', 'class.sub': 'Six relaxed evenings to learn painting from the very first brush stroke.', 'class.learn': 'You will learn', 'class.points': 'Mixing colours\nLandscapes and flowers\nLight and shadow\nYour own picture to take home', 'class.when': 'Every Tuesday from 3 March', 'class.price': '€90', 'class.per': 'six weeks',
  'concert.name': 'Concert', 'concert.kicker': 'One night only', 'concert.title': 'Live Music Night', 'concert.acts': 'The River Band\nAnna Lee & Friends', 'concert.doors': 'Doors 7 pm', 'concert.tickets': 'Tickets €10',
  'bake.name': 'Bake sale', 'bake.title': 'Bake Sale', 'bake.sub': 'Home-made cakes, cookies and pies. All money raised goes to our school trip.', 'bake.time': '10 am – 1 pm', 'bake.footer': 'Want to bake something? Ask at the office.',
  'fit.name': 'Fitness class', 'fit.title': 'Get Fit\nThis Summer', 'fit.sub': 'Outdoor fitness for all levels', 'fit.body': 'Fun, friendly group training in the park. Bring water and a mat. Your first class is free!', 'fit.days': 'Monday · 7 pm\nWednesday · 7 pm\nSaturday · 9 am',
  'house.name': 'House for sale', 'house.title': 'For Sale', 'house.price': '€249,000', 'house.body': 'A bright family home with a sunny garden, close to schools, shops and the station. Ready to move in.', 'house.f1': '3 bedrooms', 'house.f2': '2 bathrooms', 'house.f3': 'Garden', 'house.f4': 'Parking',
  'fund.name': 'Fundraiser', 'fund.title': 'Charity Fun Run', 'fund.sub': 'Walk, jog or run 5 km and help us raise money for the children’s hospital.', 'fund.goal': 'Our goal: €5,000', 'fund.raised': '€2,000 raised so far, thank you!', 'fund.how': 'Sign up on the day or online',
  'hire.name': 'We’re hiring', 'hire.kicker': 'Join our team', 'hire.title': 'We’re\nhiring!', 'hire.sub': 'We are a friendly local business looking for people who like working with customers.', 'hire.roles': 'Shop assistant · part time\nDelivery driver · full time\nWeekend helper', 'hire.apply': 'How to apply',
  'tutor.name': 'Tutoring with tear-offs', 'tutor.title': 'Maths tutoring', 'tutor.sub': 'Patient, experienced tutor for primary and secondary school.', 'tutor.points': 'Homework help\nExam preparation\nAt your home or online', 'tutor.price': 'First lesson free!', 'tutor.short': 'Maths tutor',
  'market.name': 'Farmers’ market', 'market.kicker': 'Fresh from the farm', 'market.title': 'Farmers’ Market', 'market.sub': 'Fruit and vegetables, bread, cheese, honey and flowers from local growers.', 'market.when': 'Every Saturday 8 – 1',
  'clean.name': 'Community clean-up', 'clean.title': 'Community Clean-up Day', 'clean.sub': 'Let’s make our neighbourhood shine. Join us for a morning of picking up litter.', 'clean.bring': 'Bring with you', 'clean.items': 'Gloves\nComfortable shoes\nA bottle of water', 'clean.meet': 'Meet at the park gate',
  'movie.name': 'Movie night', 'movie.kicker': 'Free entry', 'movie.title': 'Movie Night', 'movie.film': 'A family film under the stars', 'movie.time': '8 pm', 'movie.footer': 'Bring a blanket · Popcorn and drinks for sale',
};
