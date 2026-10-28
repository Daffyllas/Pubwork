// More templates for families and small businesses: parties, folded cards, a wedding set, shop and
// restaurant pieces, stationery, social media posts. Each entry is a template like those in flyers.js;
// en: their English words; tr: the same words in the other five languages; categories: new gallery groups.
import { infoRows, tearOffs, confetti, frame } from './common.js';

const MM = 72 / 25.4;

// paragraphs of a text box as a real list (bullets or numbers), so they stay a list when edited or exported
function asList(it, kind, indent = 4.5) {
  for (const pa of it.paras) {
    if (kind === 'num') pa.num = '1'; else pa.bullet = kind;
    pa.indentLeft = indent * MM; pa.indentFirst = -indent * MM;
  }
  return it;
}

// a door-shaped arch: straight sides and a round top
function arch(k, x0, y0, x1, y1, o) {
  const r = (x1 - x0) / 2, cx = x0 + r, c = r * 0.5523;
  return k.path(`M${x0} ${y1} L${x0} ${y0 + r} C${x0} ${y0 + r - c} ${cx - c} ${y0} ${cx} ${y0} C${cx + c} ${y0} ${x1} ${y0 + r - c} ${x1} ${y0 + r} L${x1} ${y1} Z`, o);
}

// a box to tick
const tickBox = (k, x, y, size = 3.8) => k.rect(x, y, size, size, { fill: 'none', stroke: 'dark', sw: 0.7, r: 0.6 });

// a menu section: heading, rule, then "Name|price|description" one per line; returns where it ends
function menu(k, x, y, w, title, lines, o = {}) {
  const sz = o.size ?? 12, pw = o.priceW ?? 20;
  k.text(x, y, w, 10, title, { size: o.head ?? 18, font: 'heading', bold: true, color: o.headColor ?? 'primary', align: o.align });
  k.line(x, y + 10.5, x + w, y + 10.5, { color: o.ruleColor ?? 'secondary', width: 0.8 });
  let yy = y + 13.5;
  for (const line of lines.split('\n')) {
    const [name, price, desc] = line.split('|');
    k.text(x, yy, w - pw, sz * 0.5, name, { size: sz, bold: true, color: o.color ?? 'dark' });
    k.text(x + w - pw, yy, pw, sz * 0.5, price || '', { size: sz, bold: true, color: o.priceColor ?? 'primary', align: 'right' });
    yy += sz * 0.5;
    if (desc) { k.text(x, yy, w - pw, sz * 0.42, desc, { size: sz * 0.78, italic: true, color: o.descColor ?? 'dark' }); yy += sz * 0.42; }
    yy += o.gap ?? 2.2;
  }
  return yy;
}

// money the way each language writes it
const LOCALE = { en: 'en-IE', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', pt: 'pt-BR', it: 'it-IT' };
const money = (k, v) => new Intl.NumberFormat(LOCALE[k.lang] || 'en-IE', { style: 'currency', currency: k.lang === 'pt' ? 'BRL' : 'EUR' }).format(v).replace(/[  ]/g, ' ');

// a small "made with love" back page for folded cards
function cardBack(k, s, art = 'red-heart') {
  const { W, H } = k;
  k.rect(0, 0, W, H, { fill: 'light' });
  k.art(art, W / 2 - 5, H - 36, 10, 10);
  k.text(10, H - 24, W - 20, 6, s('lf.made'), { size: 9, align: 'center', italic: true, color: 'dark' });
}

// contact details in a row of columns, each with its icon
function contactColumns(k, x, y, w, rows, o = {}) {
  const n = rows.length, cw = w / n;
  rows.forEach((r, i) => infoRows(k, x + i * cw, y, cw - 3, [r], { size: o.size ?? 8.5, gap: o.gap ?? 10, icon: o.icon ?? 4, color: o.color, iconColor: o.iconColor }));
}

export const categories = ['family', 'wedding', 'shop', 'social'];

export const templates = [
  // ------------------------------------------------------------------ family and parties
  {
    id: 'lf-party-adult', cat: 'family', name: 'lf.ad.name', scheme: 'berry', fonts: 'modern', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      confetti(k, [6, 5, W - 12, 16], { n: 26, colors: ['accent', 'secondary', 'light'], seed: 19 });
      confetti(k, [6, H - 16, W - 12, 11], { n: 20, colors: ['accent', 'secondary', 'light'], seed: 4 });
      k.text(12, 24, W - 24, 8, s('lf.ad.kicker'), { size: 12, color: 'secondary', align: 'center', caps: true, tracking: 4, bold: true });
      k.text(30, 31, W - 60, 58, s('lf.ad.num'), { size: 150, font: 'heading', color: 'accent', align: 'center', bold: true, lh: 0.85 });
      k.art('bottle-with-popping-cork', 10, 48, 24, 24, { rotate: 18 });
      k.art('clinking-glasses', W - 34, 48, 24, 24);
      k.text(12, 91, W - 24, 26, s('lf.ad.title'), { size: 28, font: 'heading', color: 'light', align: 'center', valign: 'middle', bold: true, lh: 1 });
      k.line(W / 2 - 16, 121, W / 2 + 16, 121, { color: 'accent', width: 1.2 });
      infoRows(k, 28, 127, W - 52, [['i:calendar', s('lf.ad.date')], ['i:clock', s('lf.ad.time')], ['i:map-pin', s('lf.ad.place')]], { size: 12.5, gap: 10, icon: 5.5, color: 'light', iconColor: 'accent' });
      k.text(16, 160, W - 32, 14, s('lf.ad.body'), { size: 12, color: 'light', align: 'center', italic: true, lh: 1.2 });
      k.text(12, H - 33, W - 24, 9, s('lf.ad.rsvp'), { size: 10.5, color: 'secondary', align: 'center', bold: true });
    },
  },
  {
    id: 'lf-party-surprise', cat: 'family', name: 'lf.sp.name', scheme: 'sunshine', fonts: 'bold', size: 'half-landscape',
    build(k) {
      const { W, H, s } = k, L = W * 0.4;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, L, H, { fill: 'primary' });
      confetti(k, [4, 3, L - 8, 9], { n: 10, colors: ['secondary', 'light', 'accent'], seed: 23 });
      confetti(k, [4, 74, L - 8, H - 78], { n: 26, colors: ['secondary', 'light', 'accent'], seed: 5 });
      k.text(6, 12, L - 12, 40, s('lf.sp.shh'), { size: 70, font: 'heading', color: 'light', align: 'center', valign: 'middle' });
      k.text(8, 52, L - 16, 18, s('lf.sp.secret'), { size: 17, color: 'light', align: 'center', bold: true, lh: 1.1 });
      k.circle(L / 2, H - 42, 24, { fill: 'light', opacity: 0.25 });
      k.art('wrapped-gift', L / 2 - 18, H - 60, 36, 36);
      const x = L + 12, w = W - L - 22;
      k.text(x, 14, w, 7, s('lf.sp.kicker'), { size: 12, caps: true, tracking: 2, bold: true, color: 'primary' });
      k.text(x, 21, w, 29, s('lf.sp.title'), { size: 36, font: 'heading', color: 'dark', lh: 0.95, valign: 'bottom' });
      k.text(x, 51, w, 9, s('lf.sp.for'), { size: 16, bold: true, color: 'primary' });
      infoRows(k, x, 63, w, [['i:calendar', s('lf.sp.date')], ['i:clock', s('lf.sp.time')], ['i:map-pin', s('lf.sp.place')]], { size: 12, gap: 9.5, icon: 5.5 });
      k.rect(x, H - 42, w, 22, { fill: 'secondary', opacity: 0.35, r: 3 });
      k.art('i:alert-triangle', x + 4, H - 34.5, 7, 7, { color: 'primary' });
      k.text(x + 14, H - 42, w - 18, 22, s('lf.sp.note'), { size: 11, valign: 'middle', lh: 1.15 });
      k.text(x, H - 15, w, 8, s('lf.sp.rsvp'), { size: 11, bold: true, color: 'primary' });
    },
  },
  {
    id: 'lf-party-space', cat: 'family', name: 'lf.ks.name', scheme: 'ocean', fonts: 'friendly', size: 'quarter',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      const stars = [[7, 6, 1.4], [30, 4, 1], [52, 9, 1.5], [62, 37, 0.9], [36, 40, 1.1], [101, 82, 1.2], [3, 76, 1.2], [100, 90, 1], [4, 113, 1], [100, 116, 1.4], [16, 128, 1.1], [90, 128, 1], [40, 145, 0.8], [70, 146, 1]];
      stars.forEach(([x, y, r], i) => k.star(x * W / 105, y * H / 148, r * 1.7, { fill: i % 3 ? 'light' : 'accent' }));
      // a planet with the age on it
      const px = W - 24, py = 24;
      k.ellipse(px - 23, py - 5, 46, 10, { fill: 'none', stroke: 'accent', sw: 1.6, rotate: 15 });
      k.circle(px, py, 15, { fill: 'secondary' });
      k.text(px - 15, py - 13, 30, 26, s('lf.ks.age'), { size: 40, font: 'heading', bold: true, color: 'light', align: 'center', valign: 'middle' });
      k.text(8, 12, W - 52, 24, s('lf.ks.kicker'), { size: 15, font: 'heading', bold: true, color: 'accent', lh: 1.05 });
      k.text(6, 44, W - 12, 24, s('lf.ks.title'), { size: 25, font: 'heading', bold: true, color: 'light', align: 'center', valign: 'middle', lh: 1 });
      k.text(8, 70, W - 16, 7, s('lf.ks.sub'), { size: 12, bold: true, color: 'secondary', align: 'center' });
      k.art('rocket', 6, 82, 30, 30);
      infoRows(k, 40, 82, W - 46, [['i:calendar', s('lf.ks.date')], ['i:clock', s('lf.ks.time')], ['i:map-pin', s('lf.ks.place')]], { size: 9.5, gap: 9.5, icon: 4.5, color: 'light', iconColor: 'accent' });
      k.text(8, 118, W - 16, 7, s('lf.ks.note'), { size: 10.5, italic: true, color: 'light', align: 'center' });
      k.text(8, H - 15, W - 16, 7, s('lf.ks.rsvp'), { size: 9, bold: true, color: 'accent', align: 'center' });
    },
  },
  {
    id: 'lf-card-birthday', cat: 'family', name: 'lf.cb.name', scheme: 'coral', fonts: 'script', size: 'half',
    build(k) {
      const { W, H, s } = k;
      // 1 · front
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W / 2, H * 0.45, 56, { fill: 'secondary', opacity: 0.22 });
      confetti(k, [6, 4, W - 12, 12], { n: 16, seed: 31, colors: ['primary', 'secondary', 'accent', 'secondary'] });
      confetti(k, [6, H - 22, W - 12, 18], { n: 22, seed: 12, colors: ['primary', 'secondary', 'accent', 'secondary'] });
      k.art('balloon', 10, 16, 28, 40, { rotate: 10 }); k.art('balloon', W - 38, 12, 28, 40, { rotate: -10 });
      k.text(10, 46, W - 20, 80, s('lf.cb.title'), { size: 64, font: 'heading', color: 'primary', align: 'center', valign: 'middle', lh: 0.92 });
      k.art('birthday-cake', W / 2 - 24, 134, 48, 48);
      // 2 · inside left
      k.page('half');
      k.rect(0, 0, W, H, { fill: 'light' });
      confetti(k, [10, 10, W - 20, 18], { n: 16, seed: 8, colors: ['primary', 'secondary', 'accent', 'secondary'] }); confetti(k, [10, H - 28, W - 20, 18], { n: 16, seed: 13, colors: ['primary', 'secondary', 'accent', 'secondary'] });
      k.text(18, H / 2 - 40, W - 36, 80, s('lf.cb.quote'), { size: 30, font: 'heading', color: 'primary', align: 'center', valign: 'middle', lh: 1.05 });
      // 3 · inside right
      k.page('half');
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.text(16, 30, W - 32, 18, s('lf.cb.dear'), { size: 34, font: 'heading', color: 'primary', align: 'center' });
      k.text(20, 60, W - 40, 56, s('lf.cb.wish'), { size: 14, align: 'center', lh: 1.35 });
      k.text(16, 116, W - 32, 8, s('lf.cb.love'), { size: 14, align: 'center' });
      k.text(16, 125, W - 32, 20, s('lf.cb.from'), { size: 36, font: 'heading', color: 'primary', align: 'center' });
      k.art('sparkles', W / 2 - 8, H - 34, 16, 16);
      // 4 · back
      k.page('half');
      cardBack(k, s);
    },
  },
  {
    id: 'lf-card-congrats', cat: 'family', name: 'lf.cg.name', scheme: 'forest', fonts: 'elegant', size: 'quarter',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(6, 6, W - 12, H - 12, { fill: 'none', stroke: 'secondary', sw: 0.6 });
      k.art('leaf-fluttering-in-wind', 10, 12, 22, 22); k.art('herb', W - 32, 12, 22, 22);
      k.text(10, 44, W - 20, 38, s('lf.cg.title'), { size: 40, font: 'heading', color: 'primary', align: 'center', valign: 'middle', lh: 0.95 });
      k.line(W / 2 - 14, 86, W / 2 + 14, 86, { color: 'accent', width: 1 });
      k.text(12, 90, W - 24, 14, s('lf.cg.sub'), { size: 10.5, caps: true, tracking: 2, align: 'center', lh: 1.2 });
      k.art('sparkles', W / 2 - 9, 112, 18, 18);
      // inside left: left plain for a photo or a few words
      k.page('quarter');
      k.rect(0, 0, W, H, { fill: 'light' });
      k.art('herb', W / 2 - 8, H - 30, 16, 16);
      // inside right
      k.page('quarter');
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.text(10, 22, W - 20, 24, s('lf.cg.happy'), { size: 30, font: 'heading', color: 'primary', align: 'center', valign: 'middle', lh: 0.95 });
      k.text(14, 52, W - 28, 44, s('lf.cg.wish'), { size: 11.5, align: 'center', lh: 1.35 });
      k.text(10, 94, W - 20, 7, s('lf.cg.love'), { size: 11.5, align: 'center', italic: true });
      k.text(10, 102, W - 20, 16, s('lf.cg.from'), { size: 28, font: 'heading', color: 'primary', align: 'center' });
      // back
      k.page('quarter');
      cardBack(k, s, 'leaf-fluttering-in-wind');
    },
  },
  {
    id: 'lf-baby-hello', cat: 'family', name: 'lf.bb.name', scheme: 'mint', fonts: 'modern', size: 'quarter-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W * 0.25, H * 0.5, 35, { fill: 'secondary', opacity: 0.35 });
      k.photo(W * 0.25 - 30, H / 2 - 30, 60, 60, { round: true });
      k.art('baby-bottle', 6, H - 26, 16, 16, { rotate: 20 });
      const x = W * 0.52, w = W * 0.48 - 8;
      k.text(x, 12, w, 7, s('lf.bb.hello'), { size: 12, caps: true, tracking: 2, bold: true, color: 'primary' });
      k.text(x, 20, w, 26, s('lf.bb.baby'), { size: 30, font: 'heading', bold: true, color: 'dark', lh: 0.95 });
      k.line(x, 48.5, x + 18, 48.5, { color: 'accent', width: 1.4 });
      k.text(x, 52, w, 14, [{ t: s('lf.bb.born'), bold: true }, { t: s('lf.bb.facts') }], { size: 10.5, lh: 1.25 });
      k.text(x, 68, w, 18, s('lf.bb.parents'), { size: 10, italic: true, lh: 1.25 });
      k.art('baby-chick', W - 20, H - 18, 12, 12);
    },
  },
  {
    id: 'lf-reunion', cat: 'family', name: 'lf.fr.name', scheme: 'sunshine', fonts: 'slab',
    build(k) {
      const { W, H, s } = k, top = H * 0.36;
      k.photo(0, 0, W, top + 6);
      k.wave(top, 7, { fill: 'light', waves: 2 });
      k.circle(W - 44, top - 2, 24, { fill: 'secondary' });
      k.art('people-hugging', W - 62, top - 20, 36, 36);
      k.text(18, top + 8, W - 90, 9, s('lf.fr.kicker'), { size: 15, caps: true, tracking: 3, bold: true, color: 'primary' });
      k.text(18, top + 18, W - 36, 40, s('lf.fr.title'), { size: 48, font: 'heading', bold: true, color: 'dark', lh: 0.95 });
      k.text(18, top + 60, W - 36, 10, s('lf.fr.sub'), { size: 17, italic: true, color: 'accent' });
      const y0 = top + 76;
      k.text(18, y0, 100, 10, s('lf.fr.day'), { size: 20, font: 'heading', bold: true, color: 'primary' });
      s('lf.fr.plan').split('\n').forEach((l, i) => {
        const [t, d] = l.split('|'), y = y0 + 13 + i * 11;
        k.rect(18, y, 104, 9.5, { fill: 'secondary', opacity: i % 2 ? 0.12 : 0.28, r: 2 });
        k.text(21, y, 22, 9.5, t, { size: 12, bold: true, color: 'primary', valign: 'middle' });
        k.text(44, y, 76, 9.5, d, { size: 12, valign: 'middle' });
      });
      const x = 132, w = W - x - 16;
      k.rect(x, y0, w, 42, { fill: 'primary', r: 4 });
      infoRows(k, x + 5, y0 + 3, w - 8, [['i:calendar', s('lf.fr.date')], ['i:clock', s('lf.fr.time')], ['i:map-pin', s('lf.fr.place')]], { size: 11.5, gap: 12, icon: 5, color: 'light', iconColor: 'light' });
      k.text(x, y0 + 47, w, 9, s('lf.fr.bring'), { size: 15, font: 'heading', bold: true, color: 'primary' });
      s('lf.fr.items').split('\n').forEach((t, i) => { const y = y0 + 57 + i * 8.5; k.art('i:check', x, y + 1.5, 5, 5, { color: 'accent' }); k.text(x + 7, y, w - 7, 8, t, { size: 11.5, valign: 'middle' }); });
      k.rect(0, H - 20, W, 20, { fill: 'dark' });
      k.text(14, H - 20, W - 28, 20, s('lf.fr.rsvp'), { size: 12.5, color: 'light', align: 'center', valign: 'middle', bold: true });
    },
  },
  {
    id: 'lf-recipe', cat: 'family', name: 'lf.rc.name', scheme: 'earth', fonts: 'traditional', size: 'half-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 5, { fill: 'primary' });
      k.text(14, 10, W - 76, 6, s('lf.rc.kicker'), { size: 10, caps: true, tracking: 2, bold: true, color: 'accent' });
      k.text(14, 16, W - 76, 16, s('lf.rc.title'), { size: 30, font: 'heading', color: 'primary', bold: true });
      k.art('red-apple', W - 58, 10, 20, 20); k.art('pie', W - 38, 13, 24, 24);
      [['i:user', s('lf.rc.serves')], ['i:clock', s('lf.rc.prep')], ['i:clock-hour-4', s('lf.rc.bake')]].forEach(([ic, t], i) => {
        const x = 14 + i * 54;
        k.rect(x, 35, 50, 9, { fill: 'secondary', opacity: 0.35, r: 4.5 });
        k.art(ic, x + 3.5, 37, 5, 5, { color: 'primary' });
        k.text(x + 10, 35, 39, 9, t, { size: 10, bold: true, valign: 'middle' });
      });
      k.line(14, 49, W - 14, 49, { color: 'secondary', width: 0.6 });
      k.text(14, 53, 66, 8, s('lf.rc.ing'), { size: 15, font: 'heading', bold: true, color: 'primary' });
      asList(k.text(14, 62, 66, H - 80, s('lf.rc.ings'), { size: 11, lh: 1.1, lineAfter: 2 }), '•', 4);
      k.line(86, 54, 86, H - 20, { color: 'secondary', width: 0.5 });
      k.text(92, 53, W - 106, 8, s('lf.rc.method'), { size: 15, font: 'heading', bold: true, color: 'primary' });
      asList(k.text(92, 62, W - 106, H - 80, s('lf.rc.steps'), { size: 11, lh: 1.1, lineAfter: 4 }), 'num', 5);
      k.text(14, H - 14, W - 28, 7, s('lf.rc.tip'), { size: 10, italic: true, color: 'accent' });
    },
  },
  {
    id: 'lf-housewarming', cat: 'family', name: 'lf.hw.name', scheme: 'coral', fonts: 'modern', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W / 2, 46, 36, { fill: 'secondary', opacity: 0.35 });
      k.art('house-with-garden', W / 2 - 28, 18, 56, 56);
      k.art('potted-plant', 14, 60, 18, 18); k.art('key', W - 32, 60, 16, 16, { rotate: -20 });
      k.text(12, 87, W - 24, 7, s('lf.hw.kicker'), { size: 13, caps: true, tracking: 3, bold: true, color: 'primary', align: 'center' });
      k.text(12, 95, W - 24, 28, s('lf.hw.title'), { size: 32, font: 'heading', bold: true, color: 'dark', align: 'center', lh: 0.95 });
      k.text(22, 124, W - 44, 16, s('lf.hw.body'), { size: 12, align: 'center', lh: 1.2 });
      infoRows(k, 32, 143, W - 60, [['i:calendar', s('lf.hw.date')], ['i:clock', s('lf.hw.time')], ['i:map-pin', s('lf.hw.addr')]], { size: 12, gap: 9.5, icon: 5, iconColor: 'primary' });
      k.rect(0, H - 20, W, 20, { fill: 'primary' });
      k.text(10, H - 20, W - 20, 20, s('lf.hw.foot'), { size: 11.5, color: 'light', align: 'center', valign: 'middle', italic: true });
    },
  },
  {
    id: 'lf-anniversary', cat: 'family', name: 'lf.an.name', scheme: 'navy', fonts: 'elegant', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      frame(k, 7, { color: 'secondary', width: 1.2, gap: 2, width2: 0.5 });
      k.circle(W / 2, 40, 25, { fill: 'none', stroke: 'secondary', sw: 0.6 });
      k.circle(W / 2, 40, 22, { fill: 'secondary' });
      k.text(W / 2 - 22, 26, 44, 28, s('lf.an.num'), { size: 50, bold: true, color: 'light', align: 'center', valign: 'middle' });
      k.text(14, 70, W - 28, 7, s('lf.an.kicker'), { size: 10.5, caps: true, tracking: 3, align: 'center' });
      k.text(14, 78, W - 28, 31, s('lf.an.title'), { size: 36, font: 'heading', color: 'primary', align: 'center', valign: 'middle', lh: 0.95 });
      k.text(14, 110, W - 28, 10, s('lf.an.names'), { size: 18, bold: true, align: 'center' });
      k.text(14, 121, W - 28, 7, s('lf.an.years'), { size: 12, align: 'center', color: 'secondary', tracking: 3, bold: true });
      k.text(20, 132, W - 40, 14, s('lf.an.body'), { size: 12, italic: true, align: 'center', lh: 1.15 });
      k.text(14, 150, W - 28, 22, [{ t: s('lf.an.date'), bold: true }, { t: s('lf.an.time') }, { t: s('lf.an.place') }], { size: 12, align: 'center', lh: 1.2 });
      k.text(14, H - 25, W - 28, 8, s('lf.an.rsvp'), { size: 10.5, italic: true, color: 'primary', align: 'center' });
    },
  },
  // ------------------------------------------------------------------ wedding
  {
    id: 'lf-wed-modern', cat: 'wedding', name: 'lf.wm.name', scheme: 'forest', fonts: 'modern', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      arch(k, 16, 14, W - 16, H - 14, { fill: 'light', stroke: 'primary', sw: 0.8 });
      k.art('leaf-fluttering-in-wind', 6, 6, 24, 24); k.art('herb', W - 30, 6, 24, 24);
      k.text(W / 2 - 42, 33, 84, 9, s('lf.wm.kicker'), { size: 9, caps: true, tracking: 1.5, align: 'center', lh: 1.1 });
      k.text(24, 45, W - 48, 42, s('lf.wm.names'), { size: 28, font: 'heading', caps: true, tracking: 3, color: 'primary', align: 'center', valign: 'middle', lh: 0.95 });
      k.text(24, 89, W - 48, 12, s('lf.wm.invite'), { size: 11, italic: true, align: 'center', lh: 1.1 });
      const y = 104, cx = W / 2;
      k.line(22, y + 2, cx - 16, y + 2, { color: 'primary', width: 0.5 }); k.line(22, y + 14, cx - 16, y + 14, { color: 'primary', width: 0.5 });
      k.line(cx + 16, y + 2, W - 22, y + 2, { color: 'primary', width: 0.5 }); k.line(cx + 16, y + 14, W - 22, y + 14, { color: 'primary', width: 0.5 });
      k.text(22, y + 2, cx - 40, 12, s('lf.wm.day'), { size: 9, caps: true, tracking: 1.5, bold: true, align: 'center', valign: 'middle' });
      k.text(cx - 16, y - 1, 32, 18, s('lf.wm.num'), { size: 34, font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      k.text(cx + 18, y + 2, cx - 40, 12, s('lf.wm.month'), { size: 9, caps: true, tracking: 1.5, bold: true, align: 'center', valign: 'middle' });
      k.text(22, 124, W - 44, 7, s('lf.wm.time'), { size: 10.5, align: 'center' });
      k.text(22, 133, W - 44, 13, s('lf.wm.place'), { size: 11, bold: true, align: 'center', lh: 1.1 });
      k.text(22, 149, W - 44, 7, s('lf.wm.after'), { size: 10.5, italic: true, align: 'center' });
      k.text(24, 162, W - 48, 11, s('lf.wm.rsvp'), { size: 9, color: 'primary', align: 'center', lh: 1.15 });
      k.art('ring', W / 2 - 5, H - 30, 10, 10);
    },
  },
  {
    id: 'lf-wed-savedate', cat: 'wedding', name: 'lf.sd.name', scheme: 'berry', fonts: 'elegant', size: 'quarter',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.art('cherry-blossom', -6, -6, 26, 26); k.art('cherry-blossom', W - 20, H - 20, 26, 26);
      k.text(14, 12, W - 28, 20, s('lf.sd.title'), { size: 34, font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      k.text(10, 33, W - 20, 6, s('lf.sd.names'), { size: 11, caps: true, tracking: 2, align: 'center', bold: true });
      // a small calendar of the month with the day marked (June 2027 starts on a Tuesday)
      const x0 = 12, cw = (W - 24) / 7, y0 = 47;
      k.text(x0, y0, W - 24, 6, s('lf.sd.month'), { size: 12, bold: true, align: 'center', color: 'primary' });
      s('lf.sd.days').split(' ').forEach((d, i) => k.text(x0 + i * cw, y0 + 8, cw, 5, d, { size: 7.5, align: 'center', bold: true, color: 'secondary' }));
      k.line(x0, y0 + 14, W - x0, y0 + 14, { color: 'secondary', width: 0.4 });
      for (let d = 1; d <= 30; d++) {
        const p = d, col = p % 7, row = Math.floor(p / 7), cx = x0 + col * cw + cw / 2, cy = y0 + 20 + row * 7.5;
        if (d === 19) k.circle(cx, cy, 3.6, { fill: 'primary' });
        k.text(cx - cw / 2, cy - 3, cw, 6, String(d), { size: 8.5, align: 'center', valign: 'middle', bold: d === 19, color: d === 19 ? 'light' : 'dark' });
      }
      k.text(10, 104, W - 20, 7, s('lf.sd.follow'), { size: 11, italic: true, align: 'center' });
      k.text(10, 112, W - 20, 12, s('lf.sd.place'), { size: 10, align: 'center', lh: 1.15 });
      k.art('two-hearts', W / 2 - 6, 127, 12, 12);
    },
  },
  {
    id: 'lf-wed-rsvp', cat: 'wedding', name: 'lf.rv.name', scheme: 'forest', fonts: 'modern', size: 'quarter-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(5, 5, W - 10, H - 10, { fill: 'none', stroke: 'primary', sw: 0.6 });
      k.art('leaf-fluttering-in-wind', 9, 8, 13, 13); k.art('herb', W - 22, 8, 13, 13);
      k.text(24, 8, W - 48, 12, s('lf.rv.title'), { size: 24, font: 'heading', color: 'primary', align: 'center', bold: true, valign: 'middle' });
      k.text(14, 20, W - 28, 5, s('lf.rv.by'), { size: 9.5, italic: true, align: 'center' });
      const label = (x, y, w, key) => k.text(x, y, w, 5, s(key), { size: 7.5, caps: true, tracking: 1, bold: true, color: 'primary' });
      label(14, 28, W - 28, 'lf.rv.names'); k.line(14, 37, W - 14, 37, { color: 'dark', width: 0.4 });
      [['lf.rv.yes', 14], ['lf.rv.no', W / 2 + 2]].forEach(([key, x]) => { tickBox(k, x, 41.5); k.text(x + 6, 40.5, W / 2 - 22, 9, s(key), { size: 10, lh: 1.05 }); });
      label(14, 52, W / 2 - 20, 'lf.rv.count'); k.line(14, 60, W / 2 - 6, 60, { color: 'dark', width: 0.4 });
      label(W / 2 + 2, 52, W / 2 - 16, 'lf.rv.diet'); k.line(W / 2 + 2, 60, W - 14, 60, { color: 'dark', width: 0.4 });
      label(14, 64, W - 28, 'lf.rv.meal');
      const cw = (W - 28) / 3;
      s('lf.rv.meals').split('\n').forEach((m, i) => { const x = 14 + i * cw; tickBox(k, x, 70.5); k.text(x + 6, 69.5, cw - 7, 6, m, { size: 10 }); });
      k.text(14, H - 16, W - 28, 7, s('lf.rv.foot'), { size: 10, italic: true, align: 'center', color: 'primary' });
    },
  },
  {
    id: 'lf-wed-programme', cat: 'wedding', name: 'lf.pg.name', scheme: 'forest', fonts: 'modern', size: [99, 210],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(4, 4, W - 8, H - 8, { fill: 'none', stroke: 'primary', sw: 0.5 });
      k.art('ring', W / 2 - 9, 11, 18, 18);
      k.text(8, 31, W - 16, 18, s('lf.pg.title'), { size: 18, font: 'heading', caps: true, tracking: 2, color: 'primary', align: 'center', bold: true, valign: 'middle', lh: 1 });
      k.text(8, 50, W - 16, 6, s('lf.pg.sub'), { size: 10, align: 'center', italic: true });
      const items = s('lf.pg.items').split('\n'), y0 = 68, step = 21;
      k.line(31, y0 + 2, 31, y0 + (items.length - 1) * step + 2, { color: 'secondary', width: 1 });
      items.forEach((l, i) => {
        const [t, a, b] = l.split('|'), y = y0 + i * step;
        k.text(6, y - 1, 21, 6, t, { size: 10, bold: true, color: 'primary', align: 'right' });
        k.circle(31, y + 2, 2.2, { fill: 'primary' }); k.circle(31, y + 2, 0.9, { fill: 'light' });
        k.text(37, y - 1, W - 43, 6, a, { size: 11.5, bold: true });
        if (b) k.text(37, y + 5, W - 43, 10, b, { size: 9.5, italic: true, lh: 1.1 });
      });
      k.text(8, H - 18, W - 16, 7, s('lf.pg.foot'), { size: 10, align: 'center', color: 'primary', bold: true });
    },
  },
  {
    id: 'lf-wed-welcome', cat: 'wedding', name: 'lf.wl.name', scheme: 'forest', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      arch(k, 20, 20, W - 20, H - 20, { fill: 'light', stroke: 'primary', sw: 1.2 });
      k.art('leaf-fluttering-in-wind', 8, 8, 40, 40); k.art('herb', W - 48, 8, 40, 40);
      k.art('herb', 12, H - 50, 36, 36); k.art('leaf-fluttering-in-wind', W - 48, H - 50, 36, 36);
      const y = H * 0.29;
      k.text(32, y, W - 64, 32, s('lf.wl.title'), { size: Math.min(64, 560 / s('lf.wl.title').length), font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      k.text(32, y + 36, W - 64, 9, s('lf.wl.to'), { size: 15, caps: true, tracking: 4, align: 'center' });
      k.text(32, y + 50, W - 64, 48, s('lf.wl.names'), { size: 48, font: 'heading', color: 'dark', align: 'center', valign: 'middle', lh: 0.95 });
      k.line(W / 2 - 20, y + 104, W / 2 + 20, y + 104, { color: 'accent', width: 1.5 });
      k.text(32, y + 110, W - 64, 9, s('lf.wl.date'), { size: 15, caps: true, tracking: 4, align: 'center', bold: true, color: 'primary' });
      k.text(40, y + 126, W - 80, 20, s('lf.wl.note'), { size: 16, italic: true, align: 'center', lh: 1.25 });
    },
  },
  // ------------------------------------------------------------------ shops, cafés and restaurants
  {
    id: 'lf-specials', cat: 'shop', name: 'lf.ts.name', scheme: 'forest', fonts: 'handwritten',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.rect(7, 7, W - 14, H - 14, { fill: 'none', stroke: 'accent', sw: 3 });
      k.rect(12, 12, W - 24, H - 24, { fill: 'none', stroke: 'light', sw: 0.6, dash: [2, 2] });
      k.art('i:tools-kitchen-2', W / 2 - 8, 18, 16, 16, { color: 'light' });
      k.text(16, 34, W - 32, 22, s('lf.ts.title'), { size: 44, font: 'heading', color: 'light', align: 'center', valign: 'middle' });
      k.path(`M${W / 2 - 40} 60 Q${W / 2 - 20} 56 ${W / 2} 60 T${W / 2 + 40} 60`, { open: true, stroke: 'accent', sw: 1.2 });
      k.text(16, 63, W - 32, 8, s('lf.ts.when'), { size: 13, color: 'secondary', align: 'center', italic: true });
      // the dishes fill the board: sizes follow the room there is (A4 or US Letter)
      const groups = [['lf.ts.s1', 'lf.ts.l1'], ['lf.ts.s2', 'lf.ts.l2'], ['lf.ts.s3', 'lf.ts.l3']].map(([h, l]) => [s(h), s(l).split('\n')]);
      const units = groups.reduce((n, [, list]) => n + 15 + list.length * 23.5 + 4, 0);
      const f = Math.min(1.15, (H - 42 - 78) / units);
      let y = 78;
      groups.forEach(([head, list]) => {
        k.text(16, y, W - 32, 12 * f, head, { size: 25 * f, font: 'heading', color: 'accent', align: 'center', valign: 'middle' });
        y += 15 * f;
        for (const line of list) {
          const [name, price, desc] = line.split('|');
          k.text(18, y, W - 36, 11 * f, [{ runs: [{ t: name, color: 'light' }, { t: `   ${price}`, color: 'accent' }] }], { size: 19 * f, bold: true, align: 'center' });
          k.text(24, y + 11 * f, W - 48, 8 * f, desc, { size: 13.5 * f, italic: true, color: 'secondary', align: 'center' });
          y += 23.5 * f;
        }
        y += 4 * f;
      });
      k.text(20, H - 34, W - 40, 12, s('lf.ts.foot'), { size: 12.5, color: 'light', align: 'center', italic: true });
    },
  },
  {
    id: 'lf-takeaway', cat: 'shop', name: 'lf.tk.name', scheme: 'festive', fonts: 'slab',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 56, { fill: 'primary' });
      k.circle(W - 40, 28, 25, { fill: 'light', opacity: 0.2 });
      k.art('steaming-bowl', W - 61, 7, 42, 42);
      k.text(16, 12, W - 90, 20, s('lf.tk.org'), { size: Math.min(38, 560 / s('lf.tk.org').length), font: 'heading', bold: true, color: 'light', field: 'org' });
      k.text(16, 34, W - 90, 14, s('lf.tk.sub'), { size: 13, color: 'light', field: 'tagline' });
      k.rect(0, 56, W, 14, { fill: 'accent' });
      k.text(10, 56, W - 20, 14, s('lf.tk.call', { phone: s('common.phone') }), { size: 16, bold: true, align: 'center', valign: 'middle', color: 'dark' });
      const cw = (W - 44) / 2, o = { size: 11.5, head: 17, gap: 2, priceW: 16 };
      const y1 = menu(k, 16, 78, cw, s('lf.tk.s1'), s('lf.tk.l1'), o);
      const y2 = menu(k, 16, y1 + 3, cw, s('lf.tk.s2'), s('lf.tk.l2'), o);
      const y3 = menu(k, 28 + cw, 78, cw, s('lf.tk.s3'), s('lf.tk.l3'), o);
      const y4 = menu(k, 28 + cw, y3 + 3, cw, s('lf.tk.s4'), s('lf.tk.l4'), o);
      const py = Math.max(y2, y4) + 4;
      if (H - 34 - py > 25) k.photo(16, py, W - 32, H - 38 - py);
      k.rect(0, H - 30, W, 30, { fill: 'dark' });
      const rows = (list) => list.map(([ic, t, f]) => [ic, t, f]);
      infoRows(k, 16, H - 28, (W - 40) / 2, rows([['i:truck', s('lf.tk.deliver')], ['i:clock', s('lf.tk.hours')]]), { size: 11, gap: 12, icon: 5, color: 'light', iconColor: 'accent' });
      infoRows(k, W / 2 + 4, H - 28, (W - 40) / 2, rows([['i:map-pin', s('common.address'), 'address'], ['i:world', s('common.web'), 'web']]), { size: 11, gap: 12, icon: 5, color: 'light', iconColor: 'accent' });
    },
  },
  {
    id: 'lf-cocktails', cat: 'shop', name: 'lf.ck.name', scheme: 'seaside', fonts: 'classic', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.rect(5, 5, W - 10, H - 10, { fill: 'none', stroke: 'accent', sw: 0.6 });
      k.art('tropical-drink', W / 2 - 14, 11, 28, 28);
      k.text(10, 40, W - 20, 16, s('lf.ck.title'), { size: 32, font: 'heading', color: 'accent', align: 'center', valign: 'middle' });
      k.text(10, 56, W - 20, 6, s('lf.ck.sub'), { size: 10, italic: true, color: 'light', align: 'center' });
      const o = { size: 11, head: 15, gap: 1.8, color: 'light', descColor: 'secondary', priceColor: 'accent', headColor: 'accent', ruleColor: 'secondary', priceW: 18 };
      const y = menu(k, 16, 66, W - 32, s('lf.ck.s1'), s('lf.ck.l1'), o);
      menu(k, 16, y + 2, W - 32, s('lf.ck.s2'), s('lf.ck.l2'), o);
      k.rect(W / 2 - 52, H - 21, 104, 10, { fill: 'accent', r: 5 });
      k.text(W / 2 - 52, H - 21, 104, 10, s('lf.ck.happy'), { size: 10, bold: true, color: 'dark', align: 'center', valign: 'middle' });
    },
  },
  {
    id: 'lf-coupons', cat: 'shop', name: 'lf.cp.name', scheme: 'coral', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(0, 0, W, 24, { fill: 'primary' });
      k.text(14, 3, W - 100, 18, s('common.org'), { size: 22, font: 'heading', color: 'light', valign: 'middle', field: 'org' });
      k.text(W - 92, 3, 78, 18, s('lf.cp.head'), { size: 11, color: 'light', align: 'right', valign: 'middle', italic: true, lh: 1.1 });
      const m = 10, gap = 6, top = 32, cw = (W - 2 * m - gap) / 2, ch = (H - top - m - 2 * gap) / 3;
      const offers = s('lf.cp.offers').split('\n'), icons = ['i:discount', 'i:coffee', 'i:bread', 'i:tag', 'i:truck', 'i:cake'], tones = ['primary', 'accent'];
      offers.forEach((line, i) => {
        const [big, desc] = line.split('|'), x = m + (i % 2) * (cw + gap), y = top + Math.floor(i / 2) * (ch + gap), c = tones[(i + Math.floor(i / 2)) % 2];
        k.rect(x, y, cw, ch, { fill: 'none', stroke: 'dark', sw: 0.7, dash: [3, 2] });
        k.rect(x + 3, y + 3, cw - 6, ch - 6, { fill: c, opacity: 0.08, r: 3 });
        k.rect(x + 3, y + 3, 5, ch - 6, { fill: c });
        k.art('i:scissors', x + 10, y - 2.5, 5, 5, { color: 'dark' });
        k.text(x + 13, y + 7, cw - 22, 28, big, { size: 34, font: 'heading', color: c, valign: 'middle', lh: 0.92 });
        k.text(x + 13, y + 37, cw - 44, 18, desc, { size: 13, lh: 1.15 });
        k.circle(x + cw - 19, y + 45, 11, { fill: c });
        k.art(icons[i % icons.length], x + cw - 25.5, y + 38.5, 13, 13, { color: 'light' });
        k.line(x + 13, y + ch - 19, x + cw - 9, y + ch - 19, { color: 'dark', width: 0.4, dash: [1, 1.5] });
        k.text(x + 13, y + ch - 17, cw - 22, 11, s('lf.cp.valid'), { size: 8.5, lh: 1.15 });
      });
    },
  },
  {
    id: 'lf-giftcert', cat: 'shop', name: 'lf.gc.name', scheme: 'lavender', fonts: 'elegant', size: 'half-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      frame(k, 6, { color: 'primary', width: 1.5, gap: 2.5, width2: 0.6 });
      k.art('hibiscus', 13, 13, 22, 22); k.art('cherry-blossom', W - 35, 13, 22, 22);
      k.text(40, 15, W - 80, 7, s('common.org'), { size: 11, caps: true, tracking: 3, bold: true, color: 'primary', align: 'center', field: 'org' });
      k.text(30, 23, W - 60, 28, s('lf.gc.title'), { size: 52, font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      k.text(30, 53, W - 60, 7, s('lf.gc.entitles'), { size: 11.5, italic: true, align: 'center' });
      k.line(50, 70, W - 50, 70, { color: 'dark', width: 0.5 });
      k.text(30, 73, W - 60, 12, s('lf.gc.what'), { size: 13, align: 'center', bold: true, lh: 1.1 });
      const by = H - 46;
      k.circle(44, by + 15, 16, { fill: 'primary' });
      k.circle(44, by + 15, 13.5, { fill: 'none', stroke: 'light', sw: 0.5 });
      k.text(29, by + 5, 30, 20, s('lf.gc.value'), { size: 22, bold: true, color: 'light', align: 'center', valign: 'middle' });
      ['lf.gc.from', 'lf.gc.valid'].forEach((key, i) => { const y = by + 6 + i * 11; k.text(66, y, 42, 6, s(key), { size: 10.5, bold: true, color: 'primary', align: 'right' }); k.line(110, y + 5, W - 20, y + 5, { color: 'dark', width: 0.5 }); });
      k.text(20, H - 17, W - 40, 6, s('lf.gc.book', { phone: s('common.phone') }), { size: 9.5, italic: true, align: 'center' });
    },
  },
  {
    id: 'lf-grand-opening', cat: 'shop', name: 'lf.go.name', scheme: 'royal', fonts: 'bold',
    build(k) {
      const { W, H, s } = k, band = H * 0.52;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, band, { fill: 'primary' });
      const cf = { colors: ['secondary', 'light', 'accent'] };
      confetti(k, [8, 5, W - 16, H * 0.1 - 8], { ...cf, n: 22, seed: 41 });
      confetti(k, [6, H * 0.1, 26, band - H * 0.1 - 14], { ...cf, n: 14, seed: 7 });
      confetti(k, [W - 32, H * 0.1, 26, band - H * 0.1 - 14], { ...cf, n: 14, seed: 17 });
      k.text(14, H * 0.1, W - 28, 13, s('lf.go.kicker'), { size: 22, caps: true, tracking: 6, color: 'secondary', align: 'center', font: 'heading' });
      k.text(14, H * 0.16, W - 28, 80, s('lf.go.title'), { size: 90, font: 'heading', color: 'light', align: 'center', valign: 'middle', lh: 0.88 });
      k.rect(0, band - 9, W, 18, { fill: 'secondary' });
      k.art('ribbon', W / 2 - 22, band - 22, 44, 44);
      k.art('scissors', 18, band - 17, 28, 28);
      k.text(14, band + 17, W - 28, 18, s('lf.go.when'), { size: 34, font: 'heading', color: 'primary', align: 'center', valign: 'middle' });
      const offers = s('lf.go.offers').split('\n'), oy = band + 40, og = Math.min(17, (H - 42 - oy) / offers.length);
      offers.forEach((t, i) => {
        k.star(30, oy + i * og + og / 2, 3.2, { fill: 'secondary' });
        k.text(38, oy + i * og, W - 56, og, t, { size: 18, valign: 'middle', lh: 1.05 });
      });
      k.rect(0, H - 34, W, 34, { fill: 'dark' });
      k.text(14, H - 31, W - 28, 13, s('common.org'), { size: 22, font: 'heading', color: 'light', align: 'center', valign: 'middle', field: 'org' });
      k.text(14, H - 17, W - 28, 9, s('common.address'), { size: 13, color: 'secondary', align: 'center', field: 'address' });
    },
  },
  {
    id: 'lf-postcard', cat: 'shop', name: 'lf.pc.name', scheme: 'mint', fonts: 'modern', size: 'quarter-landscape',
    build(k) {
      const { W, H, s } = k;
      // front: a photo and the news
      k.photo(0, 0, W, H);
      k.rect(0, H - 36, W * 0.72, 27, { fill: 'primary' });
      k.text(8, H - 34, W * 0.72 - 14, 13, s('lf.pc.title'), { size: Math.min(26, 440 / s('lf.pc.title').length), font: 'heading', bold: true, color: 'light', valign: 'middle' });
      k.text(8, H - 21, W * 0.72 - 14, 11, s('lf.pc.sub'), { size: 10, color: 'light', lh: 1.05 });
      // back: message on the left, address on the right
      k.page('quarter-landscape');
      const mid = W * 0.56;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.line(mid, 10, mid, H - 10, { color: 'secondary', width: 0.6 });
      k.text(8, 9, mid - 14, H - 34, s('lf.pc.msg', { addr: s('common.address') }), { size: 9, lh: 1.25, lineAfter: 3 });
      k.logo(8, H - 21, 11, 11, { art: 'i:building', color: 'primary' });
      k.text(21, H - 21.5, mid - 27, 6, s('common.org'), { size: 9.5, bold: true, color: 'primary', field: 'org' });
      k.text(21, H - 16, mid - 27, 6, s('common.web'), { size: 8.5, field: 'web' });
      k.rect(W - 28, 8, 20, 24, { fill: 'none', stroke: 'secondary', sw: 0.6, dash: [1.5, 1.5] });
      k.text(W - 28, 8, 20, 24, s('lf.pc.stamp'), { size: 7, align: 'center', valign: 'middle', color: 'secondary' });
      for (let i = 0; i < 4; i++) k.line(mid + 6, 50 + i * 11, W - 8, 50 + i * 11, { color: 'dark', width: 0.4 });
    },
  },
  // ------------------------------------------------------------------ stationery
  {
    id: 'lf-invoice', cat: 'business', name: 'lf.iv.name', scheme: 'ocean', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(0, 0, W, 6, { fill: 'primary' });
      k.logo(16, 15, 20, 20, { art: 'i:building', color: 'primary' });
      k.text(40, 15, 90, 9, s('common.org'), { size: 16, font: 'heading', bold: true, color: 'primary', field: 'org' });
      k.text(40, 24, 90, 6, s('common.address'), { size: 9.5, field: 'address' });
      k.text(40, 29.5, 90, 6, `${s('common.phone')}  ·  ${s('common.email')}`, { size: 9.5 });
      k.text(W - 106, 13, 90, 15, s('lf.iv.title'), { size: 28, font: 'heading', bold: true, color: 'primary', align: 'right', caps: true, tracking: 2 });
      [[s('lf.iv.no'), '2027-014'], [s('lf.iv.date'), s('lf.iv.dateV')], [s('lf.iv.due'), s('lf.iv.dueV')]].forEach(([a, b], i) => {
        k.text(W - 106, 31 + i * 6, 50, 6, a, { size: 9.5, color: 'primary', bold: true, align: 'right' });
        k.text(W - 54, 31 + i * 6, 38, 6, b, { size: 9.5, align: 'right' });
      });
      k.text(16, 56, 90, 6, s('lf.iv.to'), { size: 9, caps: true, tracking: 1.5, bold: true, color: 'primary' });
      k.text(16, 62, 100, 18, s('lf.iv.client'), { size: 10.5, lh: 1.2 });
      // the work done: description from the words, numbers here so the sums are right
      const nums = s('lf.iv.prices').split('|').map((p, i) => [i === 4 ? 12 : 1, parseFloat(p) || 0]);
      const lines = s('lf.iv.items').split('\n'), tw = W - 32;
      const head = [s('lf.iv.desc'), s('lf.iv.qty'), s('lf.iv.price'), s('lf.iv.amount')].map((t, i) => ({ t, bold: true, color: 'light', fill: 'primary', valign: 'middle', align: i ? 'right' : 'left', size: 9.5 }));
      let sub = 0;
      const rows = lines.map((d, i) => {
        const [q, p] = nums[i] || [1, 0]; sub += q * p;
        const fill = i % 2 ? '#ffffff' : 'light';
        return [{ t: d, fill, valign: 'middle' }, { t: String(q), fill, align: 'right', valign: 'middle' }, { t: money(k, p), fill, align: 'right', valign: 'middle' }, { t: money(k, q * p), fill, align: 'right', valign: 'middle' }];
      });
      const rh = 9, ty = 88;
      k.table(16, ty, tw, rh * (rows.length + 1), [head, ...rows], { cols: [tw - 86, 18, 34, 34], rowHeights: Array(rows.length + 1).fill(rh), border: false, size: 10 });
      const rate = parseFloat(s('lf.iv.rate')) || 0, tax = Math.round(sub * rate) / 100;
      let y = ty + rh * (rows.length + 1) + 5;
      [[s('lf.iv.sub'), sub], [s('lf.iv.tax'), tax]].forEach(([a, v]) => {
        k.text(W - 110, y, 58, 6, a, { size: 10, align: 'right' }); k.text(W - 52, y, 36, 6, money(k, v), { size: 10, align: 'right' }); y += 7;
      });
      k.rect(W - 112, y, 96, 10, { fill: 'primary' });
      k.text(W - 110, y, 58, 10, s('lf.iv.total'), { size: 11, bold: true, color: 'light', align: 'right', valign: 'middle' });
      k.text(W - 52, y, 34, 10, money(k, sub + tax), { size: 11, bold: true, color: 'light', align: 'right', valign: 'middle' });
      y += 22;
      k.text(16, y, 110, 6, s('lf.iv.payhead'), { size: 10, bold: true, color: 'primary', caps: true, tracking: 1.5 });
      k.text(16, y + 7, 120, 20, s('lf.iv.pay'), { size: 10, lh: 1.25 });
      k.text(16, H - 44, W - 32, 10, s('lf.iv.thanks'), { size: 17, font: 'heading', color: 'primary', bold: true });
      k.line(16, H - 22, W - 16, H - 22, { color: 'secondary', width: 0.6 });
      k.text(16, H - 19, W - 32, 7, `${s('common.web')}  ·  ${s('common.email')}  ·  ${s('common.phone')}`, { size: 9, align: 'center', color: 'primary' });
    },
  },
  {
    id: 'lf-bc-twosided', cat: 'business', name: 'lf.b2.name', scheme: 'forest', fonts: 'modern', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.circle(W - 6, H - 4, 22, { fill: 'secondary', opacity: 0.25 });
      k.logo(W / 2 - 9, 8, 18, 18, { art: 'i:leaf', color: 'light' });
      k.text(6, 29, W - 12, 8, s('common.org'), { size: 13, font: 'heading', bold: true, color: 'light', align: 'center', valign: 'middle', field: 'org' });
      k.text(10, 38, W - 20, 9, s('common.tagline'), { size: 6.5, color: 'light', align: 'center', lh: 1.1, field: 'tagline' });
      k.page('card');
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(0, 0, 3, H, { fill: 'primary' });
      k.text(8, 7, W - 14, 7, s('common.yourname'), { size: 12, font: 'heading', bold: true, color: 'dark', field: 'name' });
      k.text(8, 14, W - 14, 5, s('common.jobtitle'), { size: 7, caps: true, tracking: 1, color: 'primary', field: 'title' });
      infoRows(k, 8, H - 28, W - 12, [['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web'], ['i:map-pin', s('common.address'), 'address']], { size: 7, gap: 5.8, icon: 3 });
    },
  },
  {
    id: 'lf-bc-trade', cat: 'business', name: 'lf.bt.name', scheme: 'sunshine', fonts: 'bold', size: 'card',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.circle(W - 4, H / 2, 24, { fill: 'primary' });
      k.circle(W - 4, H / 2, 28, { fill: 'none', stroke: 'secondary', sw: 0.8 });
      k.logo(W - 22, H / 2 - 10, 20, 20, { art: 'light-bulb' });
      const w = W - 38;
      k.text(6, 5, w, 9, s('lf.bt.org'), { size: 15, font: 'heading', color: 'light', field: 'org' });
      k.text(6, 14, w, 8, s('lf.bt.what'), { size: 6.5, color: 'secondary', caps: true, tracking: 0.5, bold: true, lh: 1.1 });
      k.text(6, 24, w, 5, s('common.yourname'), { size: 8.5, color: 'light', bold: true, field: 'name' });
      k.text(6, 30, w, 8, s('common.phone'), { size: 13, color: 'secondary', bold: true, font: 'heading', field: 'phone' });
      k.text(6, 38.5, w, 4.5, s('common.email'), { size: 6.5, color: 'light', field: 'email' });
      k.text(6, 43, w, 4.5, s('lf.bt.free'), { size: 6.5, color: 'secondary', italic: true });
    },
  },
  {
    id: 'lf-letter-corner', cat: 'business', name: 'lf.lc.name', scheme: 'mint', fonts: 'classic',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.poly([[W - 74, 0], [W, 0], [W, 48]], { fill: 'primary' });
      k.poly([[W - 34, 0], [W, 0], [W, 22]], { fill: 'secondary' });
      k.poly([[0, H], [40, H], [0, H - 26]], { fill: 'secondary', opacity: 0.6 });
      k.logo(18, 15, 20, 20, { art: 'i:leaf', color: 'primary' });
      k.text(42, 15, W - 122, 11, s('common.org'), { size: 20, font: 'heading', bold: true, color: 'primary', field: 'org' });
      k.text(42, 26, W - 122, 9, s('common.tagline'), { size: 9.5, italic: true, field: 'tagline' });
      k.line(18, 44, W - 18, 44, { color: 'primary', width: 0.5 });
      k.text(W - 80, 52, 62, 6, s('lf.lc.date'), { size: 10.5, align: 'right' });
      k.text(25, 56, 90, 24, s('lf.lc.to'), { size: 10.5, lh: 1.25 });
      k.text(25, 92, W - 50, H - 132, s('lh.letter'), { size: 11, lh: 1.4, after: 8 });
      k.line(18, H - 30, W - 18, H - 30, { color: 'primary', width: 0.5 });
      contactColumns(k, 22, H - 26, W - 40, [['i:map-pin', s('common.address'), 'address'], ['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web']], { size: 8.5, icon: 4, iconColor: 'primary' });
    },
  },
  {
    id: 'lf-slip-corner', cat: 'business', name: 'lf.sl.name', scheme: 'mint', fonts: 'classic', size: [210, 99],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.poly([[W - 60, 0], [W, 0], [W, 38]], { fill: 'primary' });
      k.poly([[W - 28, 0], [W, 0], [W, 18]], { fill: 'secondary' });
      k.logo(14, 12, 18, 18, { art: 'i:leaf', color: 'primary' });
      k.text(36, 12, W - 104, 10, s('common.org'), { size: 17, font: 'heading', bold: true, color: 'primary', field: 'org' });
      k.text(36, 22, W - 104, 8, s('common.tagline'), { size: 9, italic: true, field: 'tagline' });
      k.text(14, 38, W - 28, 22, s('lf.sl.title'), { size: 36, font: 'heading', italic: true, color: 'primary', valign: 'middle' });
      k.line(14, H - 26, W - 14, H - 26, { color: 'primary', width: 0.5 });
      contactColumns(k, 16, H - 22, W - 30, [['i:map-pin', s('common.address'), 'address'], ['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web']], { size: 8.5, icon: 4, iconColor: 'primary' });
    },
  },
  {
    id: 'lf-trifold-garden', cat: 'brochures', name: 'lf.tf.name', scheme: 'spring', fonts: 'slab', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, p = W / 3, m = 10, pw = p - 2 * m;
      // outside: inside flap | back | front cover
      k.rect(0, 0, p, H, { fill: 'light' });
      k.text(m, 12, pw, 18, s('lf.tf.sayhead'), { size: 18, font: 'heading', bold: true, color: 'primary', lh: 1, valign: 'middle' });
      s('lf.tf.quotes').split('\n').forEach((q, i) => {
        const [t, who] = q.split('|'), y = 38 + i * 50;
        k.text(m - 1, y - 6, 16, 24, '“', { size: 48, font: 'heading', color: 'secondary' });
        k.text(m + 10, y, pw - 10, 44, [{ t, italic: true, after: 5 }, { t: who, bold: true, color: 'primary', size: 9.5 }], { size: 10.5, lh: 1.3 });
      });
      k.photo(m, 140, pw, H - 150);
      k.text(p + m, 12, pw, 18, s('lf.tf.contact'), { size: 18, font: 'heading', bold: true, color: 'primary', align: 'center', valign: 'middle' });
      infoRows(k, p + m + 2, 32, pw - 2, [['i:map-pin', s('common.address'), 'address'], ['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web'], ['i:clock', s('lf.tf.hours')]], { size: 10.5, gap: 11, icon: 5 });
      k.rect(p + m, 96, pw, 34, { fill: 'accent', r: 4 });
      k.text(p + m + 4, 96, pw - 8, 34, [{ t: s('lf.tf.quote'), size: 15, bold: true, font: 'heading' }, { t: s('lf.tf.quote2'), size: 10 }], { color: 'light', align: 'center', valign: 'middle', lh: 1.15 });
      k.art('seedling', p + p / 2 - 18, 142, 36, 36);
      k.rect(2 * p, 0, p, H, { fill: 'primary' });
      k.logo(2 * p + p / 2 - 15, 20, 30, 30, { art: 'i:leaf', color: 'light' });
      k.text(2 * p + m, 54, pw, 34, s('lf.tf.org'), { size: 28, font: 'heading', bold: true, color: 'light', align: 'center', valign: 'middle', lh: 1, field: 'org' });
      k.text(2 * p + m, 90, pw, 14, s('lf.tf.tag'), { size: 12, color: 'light', align: 'center', lh: 1.15, field: 'tagline' });
      k.photo(2 * p + m, 110, pw, H - 120);
      // inside: services | prices | about us
      k.page('paper-landscape');
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(0, 0, W, 7, { fill: 'primary' });
      k.text(m, 16, pw, 12, s('lf.tf.serv'), { size: 20, font: 'heading', bold: true, color: 'primary' });
      s('lf.tf.servlist').split('\n').forEach((t, i) => { const y = 32 + i * 10; k.art('i:circle-check', m, y + 1.5, 5.5, 5.5, { color: 'primary' }); k.text(m + 8, y, pw - 8, 9, t, { size: 11, valign: 'middle' }); });
      k.photo(m, 120, pw, H - 130);
      k.text(p + m, 16, pw, 12, s('lf.tf.prices'), { size: 20, font: 'heading', bold: true, color: 'primary' });
      s('lf.tf.pricelist').split('\n').forEach((l, i) => {
        const [a, b] = l.split('|'), y = 32 + i * 13;
        k.rect(p + m, y, pw, 11, { fill: 'secondary', opacity: i % 2 ? 0.12 : 0.3, r: 2 });
        k.text(p + m + 3, y, pw - 34, 11, a, { size: 10.5, valign: 'middle' });
        k.text(p + p - m - 31, y, 28, 11, b, { size: 10.5, bold: true, align: 'right', valign: 'middle', color: 'primary' });
      });
      k.text(p + m, 114, pw, 22, s('lf.tf.pricenote'), { size: 9.5, italic: true, lh: 1.25 });
      k.art('sunflower', p + p / 2 - 20, 146, 40, 40);
      k.text(2 * p + m, 16, pw, 12, s('lf.tf.about'), { size: 20, font: 'heading', bold: true, color: 'primary' });
      k.text(2 * p + m, 31, pw, 50, s('lf.tf.abouttext'), { size: 10.5, lh: 1.3, after: 4 });
      k.photo(2 * p + m, 86, pw, 50);
      s('lf.tf.badges').split('\n').forEach((t, i) => { const y = 142 + i * 10; k.art('i:award', 2 * p + m, y + 1.5, 5.5, 5.5, { color: 'accent' }); k.text(2 * p + m + 8, y, pw - 8, 9, t, { size: 10.5, bold: true, valign: 'middle' }); });
    },
  },
  // ------------------------------------------------------------------ flyers and posters
  {
    id: 'lf-gig', cat: 'flyers', name: 'lf.gg.name', scheme: 'mono', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      // a slanting band with the date on it
      const a = H * 0.66, b = H * 0.48, t = 32;
      k.poly([[0, a], [W, b], [W, b + t], [0, a + t]], { fill: 'accent' });
      const ang = Math.atan2(a - b, W) * 180 / Math.PI;
      k.text(W / 2 - 100, (a + b) / 2 + t / 2 - 14, 200, 28, s('lf.gg.date'), { size: 48, font: 'heading', color: 'light', align: 'center', valign: 'middle', rotate: ang });
      k.text(16, 18, W - 32, 10, s('lf.gg.kicker'), { size: 18, caps: true, tracking: 6, color: 'accent', font: 'heading' });
      k.text(14, 30, W - 28, 80, s('lf.gg.title'), { size: 90, font: 'heading', color: 'light', caps: true, lh: 0.85, valign: 'middle' });
      k.text(16, 114, W - 32, 8, s('lf.gg.with'), { size: 14, caps: true, tracking: 3, color: 'secondary' });
      k.text(16, 123, W - 32, 12, s('lf.gg.acts'), { size: 22, bold: true, color: 'light' });
      k.art('studio-microphone', W - 76, H - 82, 60, 60, { rotate: -12 });
      const y = H * 0.79;
      k.text(16, y, W - 96, 11, s('lf.gg.doors'), { size: 20, bold: true, color: 'light', font: 'heading' });
      k.text(16, y + 12, W - 96, 9, s('lf.gg.place'), { size: 15, color: 'light' });
      k.text(16, y + 22, W - 96, 8, s('lf.gg.tickets'), { size: 13, color: 'secondary' });
      k.text(16, y + 31, W - 96, 8, s('common.web'), { size: 13, color: 'accent', bold: true, field: 'web' });
    },
  },
  {
    id: 'lf-workshop', cat: 'flyers', name: 'lf.ws.name', scheme: 'earth', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k, L = W * 0.48;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.photo(L, 0, W - L, H * 0.4);
      k.circle(L, H * 0.4 - 4, 22, { fill: 'light' });
      k.art('bread', L - 17, H * 0.4 - 21, 34, 34);
      k.text(16, 22, L - 28, 8, s('lf.ws.kicker'), { size: 13, caps: true, tracking: 3, bold: true, color: 'accent' });
      k.text(16, 32, L - 24, 56, s('lf.ws.title'), { size: Math.min(40, 370 / Math.max(...s('lf.ws.title').split(/\s+/).map((w) => w.length))), font: 'heading', bold: true, color: 'primary', lh: 1 });
      k.text(16, 91, L - 36, 34, s('lf.ws.sub'), { size: 13, lh: 1.2 });
      const y0 = H * 0.47, cw = (W - 48) / 3;
      k.text(16, y0, W - 32, 11, s('lf.ws.do'), { size: 20, font: 'heading', bold: true, color: 'primary' });
      s('lf.ws.steps').split('\n').forEach((l, i) => {
        const [a, b] = l.split('|'), x = 16 + i * (cw + 8);
        k.circle(x + 7, y0 + 21, 7, { fill: 'accent' });
        k.text(x, y0 + 14, 14, 14, String(i + 1), { size: 16, bold: true, color: 'light', align: 'center', valign: 'middle', font: 'heading' });
        k.text(x + 17, y0 + 15, cw - 17, 12, a, { size: 14, bold: true, valign: 'middle', lh: 1 });
        k.text(x, y0 + 31, cw, 30, b, { size: 12, lh: 1.25 });
      });
      const py = Math.max(H * 0.47 + 66, H - 84), ph = 52;
      k.rect(16, py, W - 32, ph, { fill: 'primary', r: 4 });
      infoRows(k, 22, py + 6, (W - 44) / 2, [['i:calendar', s('lf.ws.date')], ['i:clock', s('lf.ws.time')], ['i:map-pin', s('lf.ws.place')]], { size: 12, gap: 13, icon: 5.5, color: 'light', iconColor: 'secondary' });
      const rx = W / 2 + 6, rw = W / 2 - 28;
      k.text(rx, py + 5, rw, 14, s('lf.ws.price'), { size: 30, bold: true, color: 'light', font: 'heading' });
      k.text(rx, py + 20, rw, 16, s('lf.ws.incl'), { size: 10.5, color: 'light', lh: 1.2 });
      k.text(rx, py + 38, rw, 9, s('lf.ws.places'), { size: 12, bold: true, color: 'secondary' });
      k.text(16, py + ph + 5, W - 32, 9, s('lf.ws.book', { phone: s('common.phone'), email: s('common.email') }), { size: 13, bold: true, color: 'primary', align: 'center' });
    },
  },
  {
    id: 'lf-petsitting', cat: 'flyers', name: 'lf.pt.name', scheme: 'sunshine', fonts: 'friendly',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      const g = Math.max(0, H - 260) / 4; // extra room on A4, shared out between the parts
      [[12, 8, -20], [W - 28, 10, 25], [W - 22, 112, -10], [W / 2 + 46, 201 + 3 * g, 30], [12, 201 + 3 * g, 15]].forEach(([x, y, r]) => k.art('i:paw', x, y, 12, 12, { color: 'secondary', rotate: r }));
      k.text(18, 14, W - 36, 42, s('lf.pt.title'), { size: 44, font: 'heading', bold: true, color: 'primary', align: 'center', valign: 'middle', lh: 0.95 });
      k.circle(50, 92 + g, 30, { fill: 'secondary' });
      k.photo(24, 66 + g, 52, 52, { round: true });
      k.art('dog', 62, 100 + g, 28, 28);
      k.text(96, 64 + g, W - 112, 58, s('lf.pt.about'), { size: 14, lh: 1.3, valign: 'middle' });
      s('lf.pt.points').split('\n').forEach((t, i) => { const y = 132 + 2 * g + i * 13; k.art('i:check', 20, y + 3, 7, 7, { color: 'primary' }); k.text(30, y, W - 104, 13, t, { size: 14, valign: 'middle', lh: 1.05 }); });
      k.star(W - 42, 156 + 2 * g, 27, { points: 16, inner: 0.84, fill: 'accent' });
      k.text(W - 65, 144 + 2 * g, 46, 24, s('lf.pt.price'), { size: 15, bold: true, color: 'light', align: 'center', valign: 'middle', lh: 1.05 });
      k.rect(20, 188 + 3 * g, W - 40, 12, { fill: 'secondary', opacity: 0.3, r: 6 });
      k.art('i:map-pin', 26, 191 + 3 * g, 6, 6, { color: 'primary' });
      k.text(34, 188 + 3 * g, W - 58, 12, s('lf.pt.area'), { size: 13, bold: true, valign: 'middle' });
      tearOffs(k, `${s('lf.pt.short')}\n${s('common.phone')}`, { n: 8, h: 50, size: 10 });
    },
  },
  {
    id: 'lf-openhouse', cat: 'flyers', name: 'lf.oh.name', scheme: 'ocean', fonts: 'classic',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: '#ffffff' });
      k.rect(0, 0, W, 30, { fill: 'primary' });
      k.text(14, 0, W * 0.5, 30, s('lf.oh.title'), { size: 32, font: 'heading', bold: true, color: 'light', valign: 'middle', caps: true, tracking: 1 });
      k.text(W * 0.5, 0, W * 0.5 - 14, 30, s('lf.oh.when'), { size: 14, bold: true, color: 'accent', align: 'right', valign: 'middle', lh: 1.1 });
      const big = H * 0.34, small = H * 0.13, pw = (W - 32) / 2;
      k.photo(14, 38, W - 28, big);
      k.photo(14, 42 + big, pw, small); k.photo(18 + pw, 42 + big, pw, small);
      let y = 48 + big + small;
      k.text(14, y, W * 0.42, 14, s('lf.oh.price'), { size: 28, font: 'heading', bold: true, color: 'primary', valign: 'middle' });
      k.text(W * 0.42, y, W * 0.58 - 14, 14, s('common.address'), { size: 13, bold: true, align: 'right', valign: 'middle', field: 'address' });
      y += 17;
      const feats = [['bed', 'lf.oh.f1'], ['couch-and-lamp', 'lf.oh.f2'], ['deciduous-tree', 'lf.oh.f3'], ['automobile', 'lf.oh.f4']], fw = (W - 28) / 4;
      k.rect(14, y, W - 28, 20, { fill: 'light', r: 3 });
      feats.forEach(([pic, key], i) => { const x = 14 + i * fw; k.art(pic, x + 5, y + 4, 12, 12); k.text(x + 19, y, fw - 21, 20, s(key), { size: 11.5, valign: 'middle', lh: 1.05 }); });
      y += 24;
      k.text(14, y, W - 28, 20, s('lf.oh.body'), { size: 12.5, lh: 1.3 });
      k.rect(0, H - 34, W, 34, { fill: 'light' });
      k.photo(14, H - 30, 26, 26, { round: true });
      k.text(46, H - 30, W - 60, 8, s('common.yourname'), { size: 15, bold: true, font: 'heading', field: 'name' });
      k.text(46, H - 22, W - 60, 6, s('common.org'), { size: 11, field: 'org' });
      k.text(46, H - 15, W - 60, 8, `${s('common.phone')}   ${s('common.email')}`, { size: 12, color: 'primary', bold: true });
    },
  },
  // ------------------------------------------------------------------ social media posts
  {
    id: 'lf-social-new', cat: 'social', name: 'lf.sq.name', scheme: 'candy', fonts: 'bold', size: 'square',
    build(k) {
      const { W, H, s } = k, top = H * 0.6;
      k.photo(0, 0, W, top);
      k.rect(0, top, W, H - top, { fill: 'light' });
      k.rect(14, top - 13, 72, 22, { fill: 'primary', rotate: 4 });
      k.text(14, top - 13, 72, 22, s('lf.sq.tag'), { size: 28, font: 'heading', color: 'light', align: 'center', valign: 'middle', rotate: 4 });
      k.text(16, top + 13, W - 32, 30, s('lf.sq.title'), { size: 34, font: 'heading', color: 'dark', lh: 1, valign: 'middle' });
      k.text(16, top + 46, W - 32, 9, s('lf.sq.sub'), { size: 15 });
      k.art('i:brand-instagram', 16, H - 16, 7, 7, { color: 'primary' });
      k.text(26, H - 17.5, W - 42, 9, s('lf.sq.handle', { web: s('common.web') }), { size: 13, bold: true, color: 'primary', valign: 'middle' });
    },
  },
  {
    id: 'lf-social-event', cat: 'social', name: 'lf.se.name', scheme: 'berry', fonts: 'classic', size: 'post45',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.circle(W - 30, 46, 64, { fill: 'secondary', opacity: 0.25 });
      k.circle(14, H - 6, 46, { fill: 'secondary', opacity: 0.18 });
      k.art('wine-glass', W - 74, 22, 52, 52, { rotate: -8 });
      k.text(18, 24, W - 100, 10, s('lf.se.kicker'), { size: 16, caps: true, tracking: 4, color: 'accent', bold: true });
      k.text(18, 36, W - 96, 64, s('lf.se.title'), { size: 44, font: 'heading', color: 'light', lh: 1, valign: 'middle' });
      const y = 108;
      k.rect(18, y, 48, 54, { fill: 'light', r: 4 });
      k.text(18, y + 4, 48, 8, s('lf.se.dow'), { size: 13, caps: true, bold: true, color: 'primary', align: 'center' });
      k.text(18, y + 12, 48, 28, s('lf.se.day'), { size: 56, bold: true, color: 'dark', align: 'center', valign: 'middle', font: 'heading' });
      k.text(18, y + 42, 48, 8, s('lf.se.mon'), { size: 13, caps: true, bold: true, color: 'primary', align: 'center' });
      k.text(76, y + 2, W - 94, 52, [{ t: s('lf.se.time'), bold: true, size: 20, after: 4 }, { t: s('lf.se.what'), size: 15 }], { color: 'light', lh: 1.2 });
      k.line(18, H - 52, W - 18, H - 52, { color: 'accent', width: 1 });
      k.text(18, H - 46, W - 36, 11, s('lf.se.book'), { size: 17, color: 'accent', bold: true });
      k.text(18, H - 33, W - 36, 10, s('lf.se.place'), { size: 15, color: 'light' });
    },
  },
];

export const en = {
  'lf.made': 'Made with love',
  // grown-up birthday
  'lf.ad.name': 'Birthday party · grown-ups', 'lf.ad.kicker': 'Let’s celebrate', 'lf.ad.num': '30', 'lf.ad.title': 'Tom’s Birthday Party', 'lf.ad.date': 'Saturday 14 June', 'lf.ad.time': 'From 8 pm until late', 'lf.ad.place': 'The Loft Bar, 21 Market Street', 'lf.ad.body': 'Drinks, music and dancing. Bring your best moves!', 'lf.ad.rsvp': 'Please reply to Sarah by 1 June · 0123 456 789',
  // surprise party
  'lf.sp.name': 'Surprise party', 'lf.sp.shh': 'Shh…', 'lf.sp.secret': 'It’s a surprise!', 'lf.sp.kicker': 'You are invited to a', 'lf.sp.title': 'Surprise Party', 'lf.sp.for': 'for Anna’s 40th birthday', 'lf.sp.date': 'Friday 20 June', 'lf.sp.time': 'Please arrive by 7.30 pm', 'lf.sp.place': 'Rosie’s Restaurant, 5 Park Lane', 'lf.sp.note': 'Anna thinks we are just going out for dinner, so please keep it a secret!', 'lf.sp.rsvp': 'Reply to Mark · 0123 456 789',
  // kids space party
  'lf.ks.name': 'Children’s party · space', 'lf.ks.age': '5', 'lf.ks.kicker': '3, 2, 1…\nBlast off!', 'lf.ks.title': 'Leo’s Space Party', 'lf.ks.sub': 'Leo is turning 5!', 'lf.ks.date': 'Sunday 8 June', 'lf.ks.time': '2 – 5 pm', 'lf.ks.place': 'Star Play Centre', 'lf.ks.note': 'Space costumes welcome!', 'lf.ks.rsvp': 'RSVP to Emma · 0123 456 789',
  // folded birthday card
  'lf.cb.name': 'Folded card · birthday', 'lf.cb.title': 'Happy\nBirthday', 'lf.cb.quote': '“Count your age by friends, not years.”', 'lf.cb.dear': 'Dear Sophie,', 'lf.cb.wish': 'Wishing you a year full of laughter, adventures and lots of cake. Have a wonderful day, you deserve it!', 'lf.cb.love': 'With love,', 'lf.cb.from': 'Tom',
  // folded congratulations card
  'lf.cg.name': 'Folded card · congratulations', 'lf.cg.title': 'Congratulations', 'lf.cg.sub': 'on your wonderful news', 'lf.cg.happy': 'So happy for you!', 'lf.cg.wish': 'Wishing you every happiness as you start this exciting new chapter. Nobody deserves it more.', 'lf.cg.love': 'With love,', 'lf.cg.from': 'Anna & Mark',
  // birth announcement
  'lf.bb.name': 'Birth announcement', 'lf.bb.hello': 'Hello, world!', 'lf.bb.baby': 'Mia\nRose', 'lf.bb.born': 'Born 3 March 2027', 'lf.bb.facts': '7.42 am · 3.2 kg · 50 cm', 'lf.bb.parents': 'With love from Anna and Mark, and big brother Leo',
  // family reunion
  'lf.fr.name': 'Family reunion', 'lf.fr.kicker': 'You’re invited to the', 'lf.fr.title': 'Miller Family Reunion', 'lf.fr.sub': 'Three generations, one big picnic!', 'lf.fr.day': 'The day', 'lf.fr.plan': '12:00|Welcome and lunch\n14:00|Games for all ages\n15:30|Big family photo\n17:00|Barbecue\n19:00|Music and stories', 'lf.fr.date': 'Sunday 3 August', 'lf.fr.time': 'From 12 noon', 'lf.fr.place': 'Oak Park, picnic area', 'lf.fr.bring': 'Please bring', 'lf.fr.items': 'A dish to share\nOld family photos\nA chair or a blanket', 'lf.fr.rsvp': 'Please let Aunt Mary know if you can come: 0123 456 789',
  // recipe card
  'lf.rc.name': 'Recipe card', 'lf.rc.kicker': 'From Grandma’s kitchen', 'lf.rc.title': 'Apple Crumble', 'lf.rc.serves': 'Serves 6', 'lf.rc.prep': 'Prep 20 min', 'lf.rc.bake': 'Bake 40 min', 'lf.rc.ing': 'Ingredients', 'lf.rc.ings': '6 apples, peeled and sliced\n2 tbsp sugar\n1 tsp cinnamon\n150 g plain flour\n100 g cold butter\n75 g brown sugar\n50 g oats\nA pinch of salt', 'lf.rc.method': 'Method', 'lf.rc.steps': 'Heat the oven to 180 °C.\nPut the apples in a baking dish with the sugar and cinnamon.\nRub the flour, salt and butter together until it looks like breadcrumbs. Stir in the brown sugar and oats.\nScatter over the apples and bake for 40 minutes until golden.\nServe warm with custard or ice cream.', 'lf.rc.tip': 'Tip: add a handful of blackberries in the autumn.',
  // housewarming
  'lf.hw.name': 'Housewarming party', 'lf.hw.kicker': 'We’ve moved!', 'lf.hw.title': 'Housewarming Party', 'lf.hw.body': 'Come and see our new home, raise a glass and help us fill it with friends.', 'lf.hw.date': 'Saturday 21 June', 'lf.hw.time': 'From 4 pm', 'lf.hw.addr': '8 Rose Avenue, Springfield', 'lf.hw.foot': 'Bring nothing but yourselves! · Ellie & Sam',
  // golden anniversary
  'lf.an.name': 'Wedding anniversary', 'lf.an.num': '50', 'lf.an.kicker': 'Celebrating fifty years', 'lf.an.title': 'Golden Wedding\nAnniversary', 'lf.an.names': 'Helen & George', 'lf.an.years': '1977 – 2027', 'lf.an.body': 'Please join us for afternoon tea in their honour', 'lf.an.date': 'Sunday 12 September', 'lf.an.time': 'at 3 pm', 'lf.an.place': 'The Grand Hotel, Station Road', 'lf.an.rsvp': 'Kindly reply to Claire by 1 September',
  // wedding · modern invitation
  'lf.wm.name': 'Wedding invitation · arch', 'lf.wm.kicker': 'Together with their families', 'lf.wm.names': 'Laura\n&\nBen', 'lf.wm.invite': 'invite you to celebrate their wedding', 'lf.wm.day': 'Saturday', 'lf.wm.num': '19', 'lf.wm.month': 'June 2027', 'lf.wm.time': 'at two o’clock in the afternoon', 'lf.wm.place': 'The Old Mill Barn\nRiver Road, Ashford', 'lf.wm.after': 'Dinner and dancing to follow', 'lf.wm.rsvp': 'Kindly reply by 1 May\nlaura.ben@example.com',
  // save the date with calendar
  'lf.sd.name': 'Save the date · calendar', 'lf.sd.title': 'Save the Date', 'lf.sd.names': 'Laura & Ben', 'lf.sd.month': 'June 2027', 'lf.sd.days': 'M T W T F S S', 'lf.sd.follow': 'Invitation to follow', 'lf.sd.place': 'The Old Mill Barn · Ashford',
  // RSVP card
  'lf.rv.name': 'Wedding reply card', 'lf.rv.title': 'RSVP', 'lf.rv.by': 'Kindly reply by 1 May 2027', 'lf.rv.names': 'Name(s)', 'lf.rv.yes': 'Joyfully accepts', 'lf.rv.no': 'Regretfully declines', 'lf.rv.count': 'Number of guests', 'lf.rv.diet': 'Dietary needs', 'lf.rv.meal': 'Main course', 'lf.rv.meals': 'Beef\nFish\nVegetarian', 'lf.rv.foot': 'We can’t wait to celebrate with you!',
  // order of the day
  'lf.pg.name': 'Wedding day programme', 'lf.pg.title': 'Our Wedding Day', 'lf.pg.sub': 'Laura & Ben · 19 June 2027', 'lf.pg.items': '2 pm|Ceremony|In the garden by the river\n3 pm|Drinks and photos|Lawn games for everyone\n5 pm|Wedding dinner|In the Old Mill Barn\n7.30 pm|Speeches and cake\n8.30 pm|First dance|Then the party begins!\n11.30 pm|Farewell|Thank you for coming', 'lf.pg.foot': 'Share your photos: #LauraAndBen',
  // welcome sign
  'lf.wl.name': 'Wedding welcome sign', 'lf.wl.title': 'Welcome', 'lf.wl.to': 'to the wedding of', 'lf.wl.names': 'Laura\n& Ben', 'lf.wl.date': '19 June 2027', 'lf.wl.note': 'We are so happy you are here to share our day',
  // specials board
  'lf.ts.name': 'Today’s specials board', 'lf.ts.title': 'Today’s Specials', 'lf.ts.when': 'Served from 12 noon until sold out', 'lf.ts.s1': 'Soup', 'lf.ts.l1': 'Roasted tomato and basil|€5.50|With warm bread and butter', 'lf.ts.s2': 'Mains', 'lf.ts.l2': 'Fish and chips|€13.50|Crispy batter, peas and tartare sauce\nChicken and leek pie|€12.00|With mash and seasonal greens\nMushroom risotto|€11.50|Parmesan, rocket and truffle oil', 'lf.ts.s3': 'Dessert', 'lf.ts.l3': 'Sticky toffee pudding|€6.00|With vanilla ice cream', 'lf.ts.foot': 'Ask us about vegetarian and gluten-free dishes',
  // takeaway menu
  'lf.tk.name': 'Takeaway menu', 'lf.tk.org': 'Noodle House', 'lf.tk.sub': 'Fresh Asian kitchen · takeaway and delivery', 'lf.tk.call': 'Call to order: {phone}',
  'lf.tk.s1': 'Starters', 'lf.tk.l1': 'Spring rolls (4)|4.50\nChicken satay|5.90\nPrawn crackers|2.50\nVegetable gyoza (6)|5.50\nMiso soup|3.50',
  'lf.tk.s2': 'Noodles', 'lf.tk.l2': 'Pad Thai|10.50|Rice noodles, egg, peanuts, lime\nChicken chow mein|9.90|Egg noodles and vegetables\nSpicy beef ramen|12.50|Rich broth, soft egg, chilli\nTofu udon|9.50|Thick noodles, greens, ginger',
  'lf.tk.s3': 'Rice and curry', 'lf.tk.l3': 'Thai green curry|11.50|Chicken or tofu, jasmine rice\nKatsu curry|11.90|Crispy chicken, mild sauce\nEgg fried rice|5.50|With peas and spring onion\nSweet and sour chicken|10.50|Pineapple and peppers',
  'lf.tk.s4': 'Sides and drinks', 'lf.tk.l4': 'Steamed rice|3.00\nPrawn toast|4.90\nEdamame|3.90\nCan of soft drink|1.80\nJasmine tea|2.50',
  'lf.tk.deliver': 'Free delivery over €20', 'lf.tk.hours': 'Tue – Sun · 5 – 10 pm',
  // cocktail menu
  'lf.ck.name': 'Cocktail menu', 'lf.ck.title': 'Cocktail Hour', 'lf.ck.sub': 'Shaken, stirred and made with love',
  'lf.ck.s1': 'Cocktails', 'lf.ck.l1': 'Mojito|8.50|White rum, lime, mint and soda\nEspresso martini|9.00|Vodka, coffee liqueur, fresh espresso\nPassion fruit martini|9.50|Vanilla vodka and passion fruit\nNegroni|9.00|Gin, red vermouth and bitters\nMargarita|8.50|Tequila, lime and orange liqueur',
  'lf.ck.s2': 'Alcohol-free', 'lf.ck.l2': 'Virgin mojito|5.50|Lime, mint, apple and soda\nTropical cooler|5.50|Mango, pineapple and ginger',
  'lf.ck.happy': 'Happy hour 5 – 7 pm · two cocktails for €14',
  // coupons
  'lf.cp.name': 'Coupon sheet', 'lf.cp.head': 'Cut out and bring with you', 'lf.cp.offers': '20% off|Everything in the shop\nFree coffee|With any cake or pastry\n2 for 1|On sandwiches every Monday\n€5 off|When you spend €30 or more\nFree delivery|On your next order\nBirthday treat|A free cupcake on your birthday', 'lf.cp.valid': 'Valid until 31 May 2027. One coupon per customer.',
  // gift certificate
  'lf.gc.name': 'Gift certificate', 'lf.gc.title': 'Gift Certificate', 'lf.gc.entitles': 'This certificate entitles', 'lf.gc.what': 'to a relaxing full-body massage (60 minutes)', 'lf.gc.value': '€60', 'lf.gc.from': 'From', 'lf.gc.valid': 'Valid until', 'lf.gc.book': 'To book, call {phone}. Please bring this certificate with you.',
  // grand opening
  'lf.go.name': 'Grand opening poster', 'lf.go.kicker': 'You’re invited', 'lf.go.title': 'Grand\nOpening', 'lf.go.when': 'Saturday 5 June · 10 am', 'lf.go.offers': 'Free coffee and cake for our first 100 visitors\n10% off everything all weekend\nBalloons and face painting for the children',
  // postcard
  'lf.pc.name': 'Postcard · we’ve moved', 'lf.pc.title': 'We’ve moved!', 'lf.pc.sub': 'Come and see our new shop from 1 June', 'lf.pc.msg': 'Dear customer,\nAfter ten happy years on Mill Lane we have moved to a bigger, brighter shop at {addr}.\nCome and say hello: your first coffee is on us!\nSee you soon,\nThe whole team', 'lf.pc.stamp': 'Stamp',
  // invoice
  'lf.iv.name': 'Invoice', 'lf.iv.title': 'Invoice', 'lf.iv.no': 'Invoice no.', 'lf.iv.date': 'Date', 'lf.iv.dateV': '3 May 2027', 'lf.iv.due': 'Due', 'lf.iv.dueV': '17 May 2027', 'lf.iv.to': 'Bill to', 'lf.iv.client': 'Green Leaf Café\nAnna Fischer\n4 Market Square, Springfield', 'lf.iv.desc': 'Description', 'lf.iv.qty': 'Qty', 'lf.iv.price': 'Unit price', 'lf.iv.amount': 'Amount', 'lf.iv.items': 'Website design\nLogo and business cards\nProduct photos, half day\nPrinting of 500 flyers\nWebsite hosting, per month', 'lf.iv.prices': '450|180|220|95|8', 'lf.iv.sub': 'Subtotal', 'lf.iv.rate': '20', 'lf.iv.tax': 'VAT 20%', 'lf.iv.total': 'Total due', 'lf.iv.payhead': 'How to pay', 'lf.iv.pay': 'Bank transfer to the account below\nIBAN: IE12 BOFI 9000 0112 3456 78\nPlease use the invoice number as the reference.', 'lf.iv.thanks': 'Thank you for your business!',
  // stationery
  'lf.b2.name': 'Business card · two-sided', 'lf.bt.name': 'Business card · trades', 'lf.bt.org': 'Bright Spark', 'lf.bt.what': 'Electrician · repairs · lighting', 'lf.bt.free': 'Free quotes · no call-out charge',
  'lf.lc.name': 'Letterhead · corner', 'lf.lc.date': '3 May 2027', 'lf.lc.to': 'Mrs Jane Smith\nGreen Leaf Café\n4 Market Square\nSpringfield',
  'lf.sl.name': 'Compliment slip · corner', 'lf.sl.title': 'With compliments',
  // tri-fold garden service
  'lf.tf.name': 'Tri-fold brochure · garden service', 'lf.tf.sayhead': 'What our customers say', 'lf.tf.quotes': 'They turned our overgrown garden into a place we love to sit in. Friendly, tidy and always on time.|Margaret, Springfield\nGreat value and lovely people. Our lawn has never looked so good!|David and Sue, Oakwood', 'lf.tf.contact': 'Get in touch', 'lf.tf.hours': 'Mon – Sat · 8 am – 6 pm', 'lf.tf.quote': 'Free quote', 'lf.tf.quote2': 'We visit, listen and give you a clear price. No obligation.', 'lf.tf.org': 'Green Thumb Gardens', 'lf.tf.tag': 'Lovely gardens, all year round',
  'lf.tf.serv': 'Our services', 'lf.tf.servlist': 'Lawn mowing and edging\nHedge and tree trimming\nWeeding and borders\nPlanting and new beds\nPatio and path cleaning\nFences and garden repairs\nLeaf clearing in autumn\nGreen waste taken away',
  'lf.tf.prices': 'Prices', 'lf.tf.pricelist': 'Lawn mowing|from €25\nHedge trimming|from €40\nGarden tidy, half day|€90\nPatio cleaning|from €60\nRegular care, monthly|from €80\nGreen waste, per load|€30', 'lf.tf.pricenote': 'Prices depend on the size of your garden. Pensioners get 10% off.',
  'lf.tf.about': 'About us', 'lf.tf.abouttext': 'We are a small family business with fifteen years of experience. We treat every garden as if it were our own.\nWe use quiet, modern tools and recycle all green waste.', 'lf.tf.badges': 'Fully insured\n15 years’ experience\nLocal and family-run',
  // gig poster
  'lf.gg.name': 'Gig poster', 'lf.gg.kicker': 'Live at The Cellar', 'lf.gg.title': 'The Night\nOwls', 'lf.gg.with': 'With special guests', 'lf.gg.acts': 'Paper Planes · Lucy Grey', 'lf.gg.date': 'Friday 12 March', 'lf.gg.doors': 'Doors 8 pm · Music from 9 pm', 'lf.gg.place': 'The Cellar Bar, 9 High Street', 'lf.gg.tickets': 'Tickets €12 in advance · €15 on the door',
  // workshop
  'lf.ws.name': 'Workshop flyer', 'lf.ws.kicker': 'Hands-on workshop', 'lf.ws.title': 'Sourdough Bread Baking', 'lf.ws.sub': 'Learn to bake crusty, tasty sourdough bread at home, step by step, in one friendly morning.', 'lf.ws.do': 'What you will do', 'lf.ws.steps': 'Feed a starter|Learn how to keep your own starter happy and bubbly.\nMix and shape|Make the dough, fold it and shape a perfect loaf.\nBake and taste|Bake in a hot oven, then enjoy it with butter and jam.', 'lf.ws.date': 'Saturday 18 October', 'lf.ws.time': '9 am – 1 pm', 'lf.ws.place': 'The Old Bakery, Mill Lane', 'lf.ws.price': '€45', 'lf.ws.incl': 'Ingredients, an apron and your own starter to take home', 'lf.ws.places': 'Only 10 places!', 'lf.ws.book': 'Book now: {phone} · {email}',
  // pet sitting
  'lf.pt.name': 'Pet sitting with tear-offs', 'lf.pt.title': 'Dog Walking &\nPet Sitting', 'lf.pt.about': 'Hi, I’m Jess! I love animals and live just around the corner. I will look after your pets as if they were my own.', 'lf.pt.points': 'Walks of 30 or 60 minutes\nFeeding and cuddles while you are away\nFully insured, with references\nPhoto updates on your phone', 'lf.pt.price': 'From\n€10 a walk', 'lf.pt.short': 'Jess · pet sitter', 'lf.pt.area': 'Springfield and nearby villages · evenings and weekends too',
  // open house
  'lf.oh.name': 'Open house', 'lf.oh.title': 'Open House', 'lf.oh.when': 'Sunday 14 June\n2 – 4 pm', 'lf.oh.price': '€385,000', 'lf.oh.f1': '4 bedrooms', 'lf.oh.f2': 'Large living room', 'lf.oh.f3': 'South garden', 'lf.oh.f4': 'Garage', 'lf.oh.body': 'A light, spacious family home on a quiet street, a short walk from schools, shops and the park. Come and have a look, no appointment needed.',
  // social posts
  'lf.sq.name': 'Social post · new in', 'lf.sq.tag': 'New in!', 'lf.sq.title': 'Our spring collection is here', 'lf.sq.sub': 'Come in and try it on, or shop online.', 'lf.sq.handle': '@yourshop · {web}',
  'lf.se.name': 'Social post · event', 'lf.se.kicker': 'Join us', 'lf.se.title': 'Wine Tasting\nEvening', 'lf.se.dow': 'Friday', 'lf.se.day': '17', 'lf.se.mon': 'October', 'lf.se.time': '7 – 10 pm', 'lf.se.what': 'Six wines from small local vineyards, with cheese and bread. €25 per person.', 'lf.se.book': 'Book your place now: only 30 seats', 'lf.se.place': 'The Corner Wine Shop, 3 Bridge Street',
};

// the same words in the other languages, with local names, places, dates and prices (pt is Brazilian)
export const tr = {
  es: {
    'lf.made': 'Hecho con cariño',
    'lf.ad.name': 'Fiesta de cumpleaños · adultos', 'lf.ad.kicker': '¡Vamos a celebrarlo!', 'lf.ad.num': '30', 'lf.ad.title': 'El cumpleaños de Javier', 'lf.ad.date': 'Sábado 14 de junio', 'lf.ad.time': 'Desde las 21:00 hasta tarde', 'lf.ad.place': 'Bar El Desván, Calle del Mercado 21', 'lf.ad.body': 'Copas, música y baile. ¡Trae tus mejores pasos!', 'lf.ad.rsvp': 'Confirma a Sara antes del 1 de junio · 912 345 678',
    'lf.sp.name': 'Fiesta sorpresa', 'lf.sp.shh': '¡Chis!', 'lf.sp.secret': '¡Es una sorpresa!', 'lf.sp.kicker': 'Te invitamos a una', 'lf.sp.title': 'Fiesta sorpresa', 'lf.sp.for': 'por los 40 de Ana', 'lf.sp.date': 'Viernes 20 de junio', 'lf.sp.time': 'Llega antes de las 21:30', 'lf.sp.place': 'Restaurante Rosa, Calle del Parque 5', 'lf.sp.note': 'Ana cree que solo vamos a cenar, ¡así que no digas nada!', 'lf.sp.rsvp': 'Confirma a Marcos · 912 345 678',
    'lf.ks.name': 'Fiesta infantil · espacio', 'lf.ks.age': '5', 'lf.ks.kicker': '3, 2, 1…\n¡Despegue!', 'lf.ks.title': 'La fiesta espacial de Leo', 'lf.ks.sub': '¡Leo cumple 5 años!', 'lf.ks.date': 'Domingo 8 de junio', 'lf.ks.time': '17:00 – 20:00', 'lf.ks.place': 'Parque infantil Estrellas', 'lf.ks.note': '¡Ven disfrazado de astronauta!', 'lf.ks.rsvp': 'Confirma a Elena · 912 345 678',
    'lf.cb.name': 'Tarjeta plegada · cumpleaños', 'lf.cb.title': '¡Feliz\ncumpleaños!', 'lf.cb.quote': '«Cuenta tu edad por amigos, no por años.»', 'lf.cb.dear': 'Querida Sofía:', 'lf.cb.wish': 'Te deseo un año lleno de risas, aventuras y mucha tarta. ¡Que pases un día maravilloso, te lo mereces!', 'lf.cb.love': 'Con cariño,', 'lf.cb.from': 'Tomás',
    'lf.cg.name': 'Tarjeta plegada · enhorabuena', 'lf.cg.title': '¡Enhorabuena!', 'lf.cg.sub': 'por la maravillosa noticia', 'lf.cg.happy': '¡Qué alegría!', 'lf.cg.wish': 'Os deseamos toda la felicidad en esta nueva etapa tan emocionante. Nadie se lo merece más.', 'lf.cg.love': 'Con cariño,', 'lf.cg.from': 'Ana y Marcos',
    'lf.bb.name': 'Anuncio de nacimiento', 'lf.bb.hello': '¡Hola, mundo!', 'lf.bb.baby': 'Mía\nRosa', 'lf.bb.born': 'Nació el 3 de marzo de 2027', 'lf.bb.facts': '7:42 · 3,2 kg · 50 cm', 'lf.bb.parents': 'Con cariño de Ana y Marcos, y su hermano mayor Leo',
    'lf.fr.name': 'Reunión familiar', 'lf.fr.kicker': 'Te invitamos a la', 'lf.fr.title': 'Reunión de la familia García', 'lf.fr.sub': '¡Tres generaciones y un gran pícnic!', 'lf.fr.day': 'El programa', 'lf.fr.plan': '13:00|Bienvenida y comida\n15:00|Juegos para todas las edades\n16:30|Gran foto de familia\n18:00|Barbacoa\n20:00|Música e historias', 'lf.fr.date': 'Domingo 3 de agosto', 'lf.fr.time': 'Desde las 13:00', 'lf.fr.place': 'Parque de los Robles, zona de pícnic', 'lf.fr.bring': 'Por favor, trae', 'lf.fr.items': 'Un plato para compartir\nFotos antiguas de la familia\nUna silla o una manta', 'lf.fr.rsvp': 'Avisa a la tía María si puedes venir: 912 345 678',
    'lf.rc.name': 'Ficha de receta', 'lf.rc.kicker': 'De la cocina de la abuela', 'lf.rc.title': 'Crumble de manzana', 'lf.rc.serves': '6 raciones', 'lf.rc.prep': 'Preparación 20 min', 'lf.rc.bake': 'Horno 40 min', 'lf.rc.ing': 'Ingredientes', 'lf.rc.ings': '6 manzanas peladas y en láminas\n2 cucharadas de azúcar\n1 cucharadita de canela\n150 g de harina\n100 g de mantequilla fría\n75 g de azúcar moreno\n50 g de copos de avena\nUna pizca de sal', 'lf.rc.method': 'Preparación', 'lf.rc.steps': 'Precalienta el horno a 180 °C.\nPon las manzanas en una fuente con el azúcar y la canela.\nMezcla con los dedos la harina, la sal y la mantequilla hasta que parezca arena. Añade el azúcar moreno y la avena.\nRepártelo sobre las manzanas y hornea 40 minutos hasta que esté dorado.\nSírvelo templado con natillas o helado.', 'lf.rc.tip': 'Truco: en otoño, añade un puñado de moras.',
    'lf.hw.name': 'Fiesta de inauguración de casa', 'lf.hw.kicker': '¡Nos hemos mudado!', 'lf.hw.title': 'Fiesta de casa nueva', 'lf.hw.body': 'Ven a conocer nuestro nuevo hogar, a brindar con nosotros y a llenarlo de amigos.', 'lf.hw.date': 'Sábado 21 de junio', 'lf.hw.time': 'Desde las 18:00', 'lf.hw.addr': 'Avenida de las Rosas 8, Madrid', 'lf.hw.foot': '¡No traigas nada, solo ganas de fiesta! · Elena y Samuel',
    'lf.an.name': 'Aniversario de boda', 'lf.an.num': '50', 'lf.an.kicker': 'Cincuenta años juntos', 'lf.an.title': 'Bodas de Oro', 'lf.an.names': 'Carmen y Jorge', 'lf.an.years': '1977 – 2027', 'lf.an.body': 'Acompáñanos a una merienda en su honor', 'lf.an.date': 'Domingo 12 de septiembre', 'lf.an.time': 'a las 18:00', 'lf.an.place': 'Gran Hotel, Paseo de la Estación 4', 'lf.an.rsvp': 'Se ruega confirmación a Clara antes del 1 de septiembre',
    'lf.wm.name': 'Invitación de boda · arco', 'lf.wm.kicker': 'Junto con sus familias', 'lf.wm.names': 'Lucía\n&\nPablo', 'lf.wm.invite': 'tienen el placer de invitarte a su boda', 'lf.wm.day': 'Sábado', 'lf.wm.num': '19', 'lf.wm.month': 'Junio 2027', 'lf.wm.time': 'a las seis de la tarde', 'lf.wm.place': 'Finca El Molino\nCamino del Río, Aranjuez', 'lf.wm.after': 'A continuación, cena y baile', 'lf.wm.rsvp': 'Se ruega confirmación antes del 1 de mayo\nlucia.pablo@example.com',
    'lf.sd.name': 'Reserva la fecha · calendario', 'lf.sd.title': 'Reserva la fecha', 'lf.sd.names': 'Lucía y Pablo', 'lf.sd.month': 'Junio 2027', 'lf.sd.days': 'L M X J V S D', 'lf.sd.follow': 'Pronto recibirás la invitación', 'lf.sd.place': 'Finca El Molino · Aranjuez',
    'lf.rv.name': 'Tarjeta de confirmación de boda', 'lf.rv.title': 'Confirmación', 'lf.rv.by': 'Por favor, responde antes del 1 de mayo de 2027', 'lf.rv.names': 'Nombre(s)', 'lf.rv.yes': 'Asistiré con alegría', 'lf.rv.no': 'Lamentablemente, no podré ir', 'lf.rv.count': 'Número de invitados', 'lf.rv.diet': 'Alergias o intolerancias', 'lf.rv.meal': 'Plato principal', 'lf.rv.meals': 'Carne\nPescado\nVegetariano', 'lf.rv.foot': '¡Estamos deseando celebrarlo contigo!',
    'lf.pg.name': 'Programa del día de la boda', 'lf.pg.title': 'Nuestra boda', 'lf.pg.sub': 'Lucía y Pablo · 19 de junio de 2027', 'lf.pg.items': '18:00|Ceremonia|En el jardín junto al río\n19:00|Cóctel y fotos|Juegos en el césped\n21:00|Cena|En el salón del Molino\n23:00|Discursos y tarta\n23:30|Primer baile|¡Y empieza la fiesta!\n03:00|Despedida|Gracias por venir', 'lf.pg.foot': 'Comparte tus fotos: #LuciayPablo',
    'lf.wl.name': 'Cartel de bienvenida de boda', 'lf.wl.title': 'Bienvenidos', 'lf.wl.to': 'a la boda de', 'lf.wl.names': 'Lucía\ny Pablo', 'lf.wl.date': '19 de junio de 2027', 'lf.wl.note': 'Gracias por compartir con nosotros este día tan especial',
    'lf.ts.name': 'Pizarra · platos del día', 'lf.ts.title': 'Platos del día', 'lf.ts.when': 'Desde las 13:00 hasta agotar existencias', 'lf.ts.s1': 'Sopa', 'lf.ts.l1': 'Crema de tomate asado|5,50 €|Con pan caliente y mantequilla', 'lf.ts.s2': 'Principales', 'lf.ts.l2': 'Merluza a la romana|13,50 €|Con patatas y alioli\nPastel de pollo y puerro|12,00 €|Con puré y verduras de temporada\nRisotto de setas|11,50 €|Parmesano, rúcula y aceite de trufa', 'lf.ts.s3': 'Postre', 'lf.ts.l3': 'Tarta de queso casera|6,00 €|Con mermelada de frutos rojos', 'lf.ts.foot': 'Pregúntanos por platos vegetarianos y sin gluten',
    'lf.tk.name': 'Carta para llevar', 'lf.tk.org': 'Casa de los Fideos', 'lf.tk.sub': 'Cocina asiática fresca · para llevar y a domicilio', 'lf.tk.call': 'Haz tu pedido: {phone}',
    'lf.tk.s1': 'Entrantes', 'lf.tk.l1': 'Rollitos de primavera (4)|4,50\nSatay de pollo|5,90\nPan de gambas|2,50\nGyozas de verduras (6)|5,50\nSopa de miso|3,50',
    'lf.tk.s2': 'Fideos', 'lf.tk.l2': 'Pad thai|10,50|Fideos de arroz, huevo, cacahuete\nChow mein de pollo|9,90|Fideos de huevo y verduras\nRamen picante de ternera|12,50|Caldo intenso, huevo, guindilla\nUdon con tofu|9,50|Fideos gruesos, verduras, jengibre',
    'lf.tk.s3': 'Arroz y curry', 'lf.tk.l3': 'Curry verde tailandés|11,50|Pollo o tofu, arroz jazmín\nCurry katsu|11,90|Pollo crujiente, salsa suave\nArroz frito con huevo|5,50|Con guisantes y cebolleta\nPollo agridulce|10,50|Piña y pimientos',
    'lf.tk.s4': 'Guarniciones y bebidas', 'lf.tk.l4': 'Arroz blanco|3,00\nTostada de gambas|4,90\nEdamame|3,90\nRefresco en lata|1,80\nTé de jazmín|2,50',
    'lf.tk.deliver': 'Envío gratis desde 20 €', 'lf.tk.hours': 'Mar – Dom · 19:00 – 23:30',
    'lf.ck.name': 'Carta de cócteles', 'lf.ck.title': 'Hora del cóctel', 'lf.ck.sub': 'Agitados, removidos y hechos con cariño',
    'lf.ck.s1': 'Cócteles', 'lf.ck.l1': 'Mojito|8,50|Ron blanco, lima, hierbabuena y soda\nEspresso martini|9,00|Vodka, licor de café, café recién hecho\nMartini de maracuyá|9,50|Vodka de vainilla y maracuyá\nNegroni|9,00|Ginebra, vermut rojo y bitter\nMargarita|8,50|Tequila, lima y licor de naranja',
    'lf.ck.s2': 'Sin alcohol', 'lf.ck.l2': 'Mojito sin alcohol|5,50|Lima, hierbabuena, manzana y soda\nTropical|5,50|Mango, piña y jengibre',
    'lf.ck.happy': 'Happy hour 19 – 21 h · dos cócteles por 14 €',
    'lf.cp.name': 'Hoja de cupones', 'lf.cp.head': 'Recórtalos y tráelos', 'lf.cp.offers': '20 % de descuento|En toda la tienda\nCafé gratis|Con cualquier tarta o bollo\n2 x 1|En bocadillos todos los lunes\n5 € de descuento|En compras de 30 € o más\nEnvío gratis|En tu próximo pedido\nTu cumpleaños|Un cupcake gratis el día de tu cumple', 'lf.cp.valid': 'Válido hasta el 31 de mayo de 2027. Un cupón por cliente.',
    'lf.gc.name': 'Cheque regalo', 'lf.gc.title': 'Cheque regalo', 'lf.gc.entitles': 'Este cheque da derecho a', 'lf.gc.what': 'un masaje relajante de cuerpo entero (60 minutos)', 'lf.gc.value': '60 €', 'lf.gc.from': 'De parte de', 'lf.gc.valid': 'Válido hasta', 'lf.gc.book': 'Pide cita en el {phone}. Trae este cheque contigo.',
    'lf.go.name': 'Cartel de inauguración', 'lf.go.kicker': 'Estás invitado', 'lf.go.title': 'Gran\ninauguración', 'lf.go.when': 'Sábado 5 de junio · 10:00', 'lf.go.offers': 'Café y bizcocho gratis para los 100 primeros\n10 % de descuento en todo durante el fin de semana\nGlobos y pintacaras para los niños',
    'lf.pc.name': 'Postal · nos mudamos', 'lf.pc.title': '¡Nos mudamos!', 'lf.pc.sub': 'Ven a ver nuestra nueva tienda desde el 1 de junio', 'lf.pc.msg': 'Querido cliente:\nTras diez años felices en la calle del Molino, nos hemos mudado a una tienda más grande y luminosa en {addr}.\n¡Ven a saludarnos: el primer café corre de nuestra cuenta!\nHasta pronto,\nTodo el equipo', 'lf.pc.stamp': 'Sello',
    'lf.iv.name': 'Factura', 'lf.iv.title': 'Factura', 'lf.iv.no': 'N.º de factura', 'lf.iv.date': 'Fecha', 'lf.iv.dateV': '3 de mayo de 2027', 'lf.iv.due': 'Vencimiento', 'lf.iv.dueV': '17 de mayo de 2027', 'lf.iv.to': 'Facturar a', 'lf.iv.client': 'Café Hoja Verde\nAna Fernández\nPlaza Mayor 4, Madrid', 'lf.iv.desc': 'Concepto', 'lf.iv.qty': 'Cant.', 'lf.iv.price': 'Precio', 'lf.iv.amount': 'Importe', 'lf.iv.items': 'Diseño de la página web\nLogotipo y tarjetas de visita\nFotos de producto, media jornada\nImpresión de 500 folletos\nAlojamiento web, por mes', 'lf.iv.sub': 'Base imponible', 'lf.iv.rate': '21', 'lf.iv.tax': 'IVA 21 %', 'lf.iv.total': 'Total', 'lf.iv.payhead': 'Forma de pago', 'lf.iv.pay': 'Transferencia a la siguiente cuenta\nIBAN: ES12 3456 7890 1234 5678 9012\nIndica el número de factura como concepto.', 'lf.iv.thanks': '¡Gracias por confiar en nosotros!',
    'lf.b2.name': 'Tarjeta de visita · dos caras', 'lf.bt.name': 'Tarjeta de visita · oficios', 'lf.bt.org': 'Chispa Electricidad', 'lf.bt.what': 'Instalaciones · reparaciones · iluminación', 'lf.bt.free': 'Presupuesto sin compromiso',
    'lf.lc.name': 'Papel de carta · esquina', 'lf.lc.date': '3 de mayo de 2027', 'lf.lc.to': 'Sra. Juana Sánchez\nCafé Hoja Verde\nPlaza Mayor 4\n28001 Madrid',
    'lf.sl.name': 'Saluda · esquina', 'lf.sl.title': 'Con nuestros saludos',
    'lf.tf.name': 'Tríptico · jardinería', 'lf.tf.sayhead': 'Lo que dicen nuestros clientes', 'lf.tf.quotes': 'Convirtieron nuestro jardín abandonado en un lugar donde nos encanta estar. Amables, limpios y puntuales.|Margarita, Madrid\nBuen precio y gente encantadora. ¡El césped nunca había estado tan bonito!|David y Susana, Alcobendas', 'lf.tf.contact': 'Contacto', 'lf.tf.hours': 'Lun – Sáb · 8:00 – 18:00', 'lf.tf.quote': 'Presupuesto gratis', 'lf.tf.quote2': 'Vamos a verte, te escuchamos y te damos un precio claro. Sin compromiso.', 'lf.tf.org': 'Jardines Pulgar Verde', 'lf.tf.tag': 'Jardines bonitos todo el año',
    'lf.tf.serv': 'Nuestros servicios', 'lf.tf.servlist': 'Corte y perfilado de césped\nPoda de setos y árboles\nDesbroce y parterres\nPlantación y nuevos arriates\nLimpieza de patios y caminos\nVallas y pequeñas reparaciones\nRecogida de hojas en otoño\nRetirada de restos vegetales',
    'lf.tf.prices': 'Precios', 'lf.tf.pricelist': 'Corte de césped|desde 25 €\nPoda de setos|desde 40 €\nMedia jornada de jardín|90 €\nLimpieza de patio|desde 60 €\nMantenimiento mensual|desde 80 €\nRestos vegetales, por carga|30 €', 'lf.tf.pricenote': 'El precio depende del tamaño del jardín. Los jubilados tienen un 10 % de descuento.',
    'lf.tf.about': 'Quiénes somos', 'lf.tf.abouttext': 'Somos una pequeña empresa familiar con quince años de experiencia. Cuidamos cada jardín como si fuera el nuestro.\nUsamos herramientas modernas y silenciosas y reciclamos todos los restos vegetales.', 'lf.tf.badges': 'Seguro a todo riesgo\n15 años de experiencia\nEmpresa familiar y local',
    'lf.gg.name': 'Cartel de concierto', 'lf.gg.kicker': 'En directo en La Bodega', 'lf.gg.title': 'The Night\nOwls', 'lf.gg.with': 'Con artistas invitados', 'lf.gg.acts': 'Paper Planes · Lucy Grey', 'lf.gg.date': 'Viernes 12 de marzo', 'lf.gg.doors': 'Puertas 21:00 · Concierto 22:00', 'lf.gg.place': 'Sala La Bodega, Calle Mayor 9', 'lf.gg.tickets': 'Entradas 12 € anticipada · 15 € en taquilla',
    'lf.ws.name': 'Folleto de taller', 'lf.ws.kicker': 'Taller práctico', 'lf.ws.title': 'Pan de masa madre', 'lf.ws.sub': 'Aprende a hacer en casa un pan de masa madre crujiente y sabroso, paso a paso, en una mañana agradable.', 'lf.ws.do': 'Lo que harás', 'lf.ws.steps': 'Alimentar la masa madre|Aprende a mantener tu masa madre activa y burbujeante.\nAmasar y formar|Prepara la masa, pliégala y forma una hogaza perfecta.\nHornear y probar|Hornéalo bien caliente y disfrútalo con mantequilla y mermelada.', 'lf.ws.date': 'Sábado 18 de octubre', 'lf.ws.time': '10:00 – 14:00', 'lf.ws.place': 'La Vieja Panadería, Calle del Molino 2', 'lf.ws.price': '45 €', 'lf.ws.incl': 'Ingredientes, delantal y tu propia masa madre para llevar', 'lf.ws.places': '¡Solo 10 plazas!', 'lf.ws.book': 'Reserva: {phone} · {email}',
    'lf.pt.name': 'Cuidado de mascotas con pestañas', 'lf.pt.title': 'Paseo de perros y\ncuidado de mascotas', 'lf.pt.about': '¡Hola, soy Jessica! Me encantan los animales y vivo aquí al lado. Cuidaré de tus mascotas como si fueran mías.', 'lf.pt.points': 'Paseos de 30 o 60 minutos\nComida y mimos mientras estás fuera\nCon seguro y referencias\nFotos en tu móvil', 'lf.pt.price': 'Desde\n10 € el paseo', 'lf.pt.short': 'Jessica · mascotas', 'lf.pt.area': 'Madrid centro y alrededores · también tardes y fines de semana',
    'lf.oh.name': 'Jornada de puertas abiertas', 'lf.oh.title': 'Puertas abiertas', 'lf.oh.when': 'Domingo 14 de junio\n12:00 – 14:00', 'lf.oh.price': '385.000 €', 'lf.oh.f1': '4 dormitorios', 'lf.oh.f2': 'Salón amplio', 'lf.oh.f3': 'Jardín al sur', 'lf.oh.f4': 'Garaje', 'lf.oh.body': 'Una casa familiar luminosa y amplia en una calle tranquila, a un paso de colegios, tiendas y el parque. Ven a verla, no hace falta cita.',
    'lf.sq.name': 'Publicación · novedades', 'lf.sq.tag': '¡Novedad!', 'lf.sq.title': 'Ya ha llegado la colección de primavera', 'lf.sq.sub': 'Ven a probártela o compra en línea.', 'lf.sq.handle': '@tutienda · {web}',
    'lf.se.name': 'Publicación · evento', 'lf.se.kicker': 'Te esperamos', 'lf.se.title': 'Cata de vinos', 'lf.se.dow': 'Viernes', 'lf.se.day': '17', 'lf.se.mon': 'Octubre', 'lf.se.time': '20:00 – 23:00', 'lf.se.what': 'Seis vinos de pequeñas bodegas de la zona, con queso y pan. 25 € por persona.', 'lf.se.book': 'Reserva ya: solo 30 plazas', 'lf.se.place': 'Vinoteca La Esquina, Calle del Puente 3',
  },
  de: {
    'lf.made': 'Mit Liebe gemacht',
    'lf.ad.name': 'Geburtstagsparty · Erwachsene', 'lf.ad.kicker': 'Lasst uns feiern', 'lf.ad.num': '30', 'lf.ad.title': 'Toms Geburtstagsparty', 'lf.ad.date': 'Samstag, 14. Juni', 'lf.ad.time': 'Ab 20 Uhr bis spät', 'lf.ad.place': 'Loft Bar, Marktstraße 21', 'lf.ad.body': 'Drinks, Musik und Tanz. Bringt eure besten Moves mit!', 'lf.ad.rsvp': 'Bitte bis 1. Juni bei Sarah melden · 030 1234567',
    'lf.sp.name': 'Überraschungsparty', 'lf.sp.shh': 'Pssst…', 'lf.sp.secret': 'Es ist eine Überraschung!', 'lf.sp.kicker': 'Herzliche Einladung zur', 'lf.sp.title': 'Überraschungsparty', 'lf.sp.for': 'zu Annas 40. Geburtstag', 'lf.sp.date': 'Freitag, 20. Juni', 'lf.sp.time': 'Bitte bis 19:30 Uhr da sein', 'lf.sp.place': 'Restaurant Rosi, Parkweg 5', 'lf.sp.note': 'Anna denkt, wir gehen nur essen. Bitte nichts verraten!', 'lf.sp.rsvp': 'Antwort an Markus · 030 1234567',
    'lf.ks.name': 'Kindergeburtstag · Weltraum', 'lf.ks.age': '5', 'lf.ks.kicker': '3, 2, 1…\nStart!', 'lf.ks.title': 'Leos Weltraum-Party', 'lf.ks.sub': 'Leo wird 5!', 'lf.ks.date': 'Sonntag, 8. Juni', 'lf.ks.time': '14 – 17 Uhr', 'lf.ks.place': 'Spielwelt Sternchen', 'lf.ks.note': 'Kommt gern als Astronauten!', 'lf.ks.rsvp': 'Bitte Bescheid an Emma · 030 1234567',
    'lf.cb.name': 'Klappkarte · Geburtstag', 'lf.cb.title': 'Alles Gute\nzum\nGeburtstag', 'lf.cb.quote': '„Zähl dein Alter an Freunden, nicht an Jahren.“', 'lf.cb.dear': 'Liebe Sophie,', 'lf.cb.wish': 'ich wünsche dir ein Jahr voller Lachen, Abenteuer und ganz viel Kuchen. Hab einen wunderschönen Tag, du hast ihn verdient!', 'lf.cb.love': 'Alles Liebe,', 'lf.cb.from': 'Tom',
    'lf.cg.name': 'Klappkarte · Glückwunsch', 'lf.cg.title': 'Herzlichen Glückwunsch', 'lf.cg.sub': 'zu den wunderbaren Neuigkeiten', 'lf.cg.happy': 'Wir freuen uns so für euch!', 'lf.cg.wish': 'Alles Glück der Welt für diesen spannenden neuen Abschnitt. Niemand hat es mehr verdient.', 'lf.cg.love': 'Alles Liebe,', 'lf.cg.from': 'Anna & Markus',
    'lf.bb.name': 'Geburtsanzeige', 'lf.bb.hello': 'Hallo Welt!', 'lf.bb.baby': 'Mia\nRosa', 'lf.bb.born': 'Geboren am 3. März 2027', 'lf.bb.facts': '7:42 Uhr · 3.200 g · 50 cm', 'lf.bb.parents': 'In Liebe: Anna und Markus mit dem großen Bruder Leo',
    'lf.fr.name': 'Familientreffen', 'lf.fr.kicker': 'Einladung zum', 'lf.fr.title': 'Familientreffen Müller', 'lf.fr.sub': 'Drei Generationen, ein großes Picknick!', 'lf.fr.day': 'Der Tag', 'lf.fr.plan': '12:00|Begrüßung und Mittagessen\n14:00|Spiele für Groß und Klein\n15:30|Großes Familienfoto\n17:00|Grillen\n19:00|Musik und Geschichten', 'lf.fr.date': 'Sonntag, 3. August', 'lf.fr.time': 'Ab 12 Uhr', 'lf.fr.place': 'Eichenpark, Picknickwiese', 'lf.fr.bring': 'Bitte mitbringen', 'lf.fr.items': 'Etwas fürs Buffet\nAlte Familienfotos\nStuhl oder Decke', 'lf.fr.rsvp': 'Bitte bei Tante Maria melden, ob ihr kommt: 030 1234567',
    'lf.rc.name': 'Rezeptkarte', 'lf.rc.kicker': 'Aus Omas Küche', 'lf.rc.title': 'Apfel-Crumble', 'lf.rc.serves': '6 Portionen', 'lf.rc.prep': 'Vorbereitung 20 Min.', 'lf.rc.bake': 'Backen 40 Min.', 'lf.rc.ing': 'Zutaten', 'lf.rc.ings': '6 Äpfel, geschält und in Scheiben\n2 EL Zucker\n1 TL Zimt\n150 g Mehl\n100 g kalte Butter\n75 g brauner Zucker\n50 g Haferflocken\n1 Prise Salz', 'lf.rc.method': 'Zubereitung', 'lf.rc.steps': 'Den Ofen auf 180 °C vorheizen.\nDie Äpfel mit Zucker und Zimt in eine Auflaufform geben.\nMehl, Salz und Butter zu Streuseln verkneten. Braunen Zucker und Haferflocken untermischen.\nÜber die Äpfel streuen und 40 Minuten goldbraun backen.\nWarm mit Vanillesoße oder Eis servieren.', 'lf.rc.tip': 'Tipp: Im Herbst eine Handvoll Brombeeren dazugeben.',
    'lf.hw.name': 'Einweihungsparty', 'lf.hw.kicker': 'Wir sind umgezogen!', 'lf.hw.title': 'Einweihungs-\nparty', 'lf.hw.body': 'Kommt vorbei, schaut euch unser neues Zuhause an und stoßt mit uns an.', 'lf.hw.date': 'Samstag, 21. Juni', 'lf.hw.time': 'Ab 16 Uhr', 'lf.hw.addr': 'Rosenweg 8, Musterstadt', 'lf.hw.foot': 'Bringt nur euch selbst mit! · Elli & Sam',
    'lf.an.name': 'Hochzeitstag', 'lf.an.num': '50', 'lf.an.kicker': 'Fünfzig gemeinsame Jahre', 'lf.an.title': 'Goldene\nHochzeit', 'lf.an.names': 'Helga & Georg', 'lf.an.years': '1977 – 2027', 'lf.an.body': 'Feiert mit uns bei Kaffee und Kuchen', 'lf.an.date': 'Sonntag, 12. September', 'lf.an.time': 'um 15 Uhr', 'lf.an.place': 'Hotel zur Post, Bahnhofstraße 4', 'lf.an.rsvp': 'Um Antwort bis 1. September an Claudia wird gebeten',
    'lf.wm.name': 'Hochzeitseinladung · Bogen', 'lf.wm.kicker': 'Gemeinsam mit ihren Familien', 'lf.wm.names': 'Laura\n&\nBen', 'lf.wm.invite': 'laden euch herzlich zu ihrer Hochzeit ein', 'lf.wm.day': 'Samstag', 'lf.wm.num': '19', 'lf.wm.month': 'Juni 2027', 'lf.wm.time': 'um 14 Uhr', 'lf.wm.place': 'Alte Mühle\nAm Mühlbach 3, Musterstadt', 'lf.wm.after': 'Anschließend Essen und Tanz', 'lf.wm.rsvp': 'Bitte gebt uns bis 1. Mai Bescheid\nlaura.ben@example.com',
    'lf.sd.name': 'Save the Date · Kalender', 'lf.sd.title': 'Save the Date', 'lf.sd.names': 'Laura & Ben', 'lf.sd.month': 'Juni 2027', 'lf.sd.days': 'Mo Di Mi Do Fr Sa So', 'lf.sd.follow': 'Einladung folgt', 'lf.sd.place': 'Alte Mühle · Musterstadt',
    'lf.rv.name': 'Antwortkarte zur Hochzeit', 'lf.rv.title': 'Antwort', 'lf.rv.by': 'Bitte bis 1. Mai 2027 zurücksenden', 'lf.rv.names': 'Name(n)', 'lf.rv.yes': 'Wir kommen gern', 'lf.rv.no': 'Leider können wir nicht', 'lf.rv.count': 'Anzahl der Gäste', 'lf.rv.diet': 'Unverträglichkeiten', 'lf.rv.meal': 'Hauptgang', 'lf.rv.meals': 'Rind\nFisch\nVegetarisch', 'lf.rv.foot': 'Wir freuen uns sehr auf euch!',
    'lf.pg.name': 'Ablauf des Hochzeitstags', 'lf.pg.title': 'Unser Hochzeitstag', 'lf.pg.sub': 'Laura & Ben · 19. Juni 2027', 'lf.pg.items': '14:00|Trauung|Im Garten am Fluss\n15:00|Sektempfang und Fotos|Spiele auf der Wiese\n17:00|Hochzeitsessen|In der Alten Mühle\n19:30|Reden und Torte\n20:30|Eröffnungstanz|Dann wird gefeiert!\n23:30|Ausklang|Danke, dass ihr da wart', 'lf.pg.foot': 'Teilt eure Fotos: #LauraUndBen',
    'lf.wl.name': 'Willkommensschild Hochzeit', 'lf.wl.title': 'Willkommen', 'lf.wl.to': 'zur Hochzeit von', 'lf.wl.names': 'Laura\n& Ben', 'lf.wl.date': '19. Juni 2027', 'lf.wl.note': 'Schön, dass ihr diesen Tag mit uns feiert',
    'lf.ts.name': 'Tafel · Tagesgerichte', 'lf.ts.title': 'Tagesgerichte', 'lf.ts.when': 'Ab 12 Uhr, solange der Vorrat reicht', 'lf.ts.s1': 'Suppe', 'lf.ts.l1': 'Tomatensuppe mit Basilikum|5,50 €|Mit warmem Brot und Butter', 'lf.ts.s2': 'Hauptgerichte', 'lf.ts.l2': 'Backfisch mit Pommes|13,50 €|Mit Erbsen und Remoulade\nHähnchen-Lauch-Pie|12,00 €|Mit Kartoffelpüree und Gemüse\nPilzrisotto|11,50 €|Parmesan, Rucola und Trüffelöl', 'lf.ts.s3': 'Nachtisch', 'lf.ts.l3': 'Apfelstrudel|6,00 €|Mit Vanilleeis', 'lf.ts.foot': 'Fragen Sie nach vegetarischen und glutenfreien Gerichten',
    'lf.tk.name': 'Speisekarte zum Mitnehmen', 'lf.tk.org': 'Nudelhaus', 'lf.tk.sub': 'Frische asiatische Küche · Abholung und Lieferung', 'lf.tk.call': 'Jetzt bestellen: {phone}',
    'lf.tk.s1': 'Vorspeisen', 'lf.tk.l1': 'Frühlingsrollen (4)|4,50\nHähnchen-Satay|5,90\nKrabbenchips|2,50\nGemüse-Gyoza (6)|5,50\nMisosuppe|3,50',
    'lf.tk.s2': 'Nudeln', 'lf.tk.l2': 'Pad Thai|10,50|Reisnudeln, Ei, Erdnüsse, Limette\nGebratene Nudeln|9,90|Mit Hähnchen und Gemüse\nScharfe Rindfleisch-Ramen|12,50|Kräftige Brühe, Ei, Chili\nTofu-Udon|9,50|Dicke Nudeln, Gemüse, Ingwer',
    'lf.tk.s3': 'Reis und Curry', 'lf.tk.l3': 'Grünes Thai-Curry|11,50|Hähnchen oder Tofu, Jasminreis\nKatsu-Curry|11,90|Knuspriges Hähnchen, milde Soße\nGebratener Reis mit Ei|5,50|Mit Erbsen und Lauchzwiebeln\nHähnchen süß-sauer|10,50|Ananas und Paprika',
    'lf.tk.s4': 'Beilagen und Getränke', 'lf.tk.l4': 'Reis|3,00\nGarnelentoast|4,90\nEdamame|3,90\nSoftdrink (Dose)|1,80\nJasmintee|2,50',
    'lf.tk.deliver': 'Gratis-Lieferung ab 20 €', 'lf.tk.hours': 'Di – So · 17 – 22 Uhr',
    'lf.ck.name': 'Cocktailkarte', 'lf.ck.title': 'Cocktail Hour', 'lf.ck.sub': 'Geschüttelt, gerührt und mit Liebe gemixt',
    'lf.ck.s1': 'Cocktails', 'lf.ck.l1': 'Mojito|8,50|Weißer Rum, Limette, Minze, Soda\nEspresso Martini|9,00|Wodka, Kaffeelikör, Espresso\nPassion Fruit Martini|9,50|Vanillewodka und Maracuja\nNegroni|9,00|Gin, roter Wermut, Bitter\nMargarita|8,50|Tequila, Limette, Orangenlikör',
    'lf.ck.s2': 'Alkoholfrei', 'lf.ck.l2': 'Virgin Mojito|5,50|Limette, Minze, Apfel, Soda\nTropical Cooler|5,50|Mango, Ananas und Ingwer',
    'lf.ck.happy': 'Happy Hour 17 – 19 Uhr · zwei Cocktails für 14 €',
    'lf.cp.name': 'Gutscheinbogen', 'lf.cp.head': 'Ausschneiden und mitbringen', 'lf.cp.offers': '20 % Rabatt|Auf das ganze Sortiment\nGratis-Kaffee|Zu jedem Stück Kuchen\n2 für 1|Montags auf alle Sandwiches\n5 € Rabatt|Ab einem Einkauf von 30 €\nGratis-Lieferung|Bei Ihrer nächsten Bestellung\nGeburtstag|Ein Cupcake gratis an Ihrem Geburtstag', 'lf.cp.valid': 'Gültig bis 31. Mai 2027. Ein Gutschein pro Person.',
    'lf.gc.name': 'Geschenkgutschein', 'lf.gc.title': 'Geschenkgutschein', 'lf.gc.entitles': 'Dieser Gutschein ist gültig für', 'lf.gc.what': 'eine entspannende Ganzkörpermassage (60 Minuten)', 'lf.gc.value': '60 €', 'lf.gc.from': 'Von', 'lf.gc.valid': 'Gültig bis', 'lf.gc.book': 'Termin unter {phone}. Bitte bringen Sie diesen Gutschein mit.',
    'lf.go.name': 'Plakat · Neueröffnung', 'lf.go.kicker': 'Herzlich willkommen', 'lf.go.title': 'Große\nEröffnung', 'lf.go.when': 'Samstag, 5. Juni · 10 Uhr', 'lf.go.offers': 'Kaffee und Kuchen gratis für die ersten 100 Gäste\n10 % auf alles, das ganze Wochenende\nLuftballons und Kinderschminken',
    'lf.pc.name': 'Postkarte · Umzug', 'lf.pc.title': 'Wir sind umgezogen!', 'lf.pc.sub': 'Besuchen Sie uns ab 1. Juni im neuen Laden', 'lf.pc.msg': 'Liebe Kundinnen und Kunden,\nnach zehn schönen Jahren in der Mühlgasse sind wir in einen größeren, helleren Laden gezogen: {addr}.\nSchauen Sie vorbei, der erste Kaffee geht auf uns!\nBis bald,\nIhr ganzes Team', 'lf.pc.stamp': 'Briefmarke',
    'lf.iv.name': 'Rechnung', 'lf.iv.title': 'Rechnung', 'lf.iv.no': 'Rechnungs-Nr.', 'lf.iv.date': 'Datum', 'lf.iv.dateV': '3. Mai 2027', 'lf.iv.due': 'Fällig am', 'lf.iv.dueV': '17. Mai 2027', 'lf.iv.to': 'Rechnung an', 'lf.iv.client': 'Café Grünes Blatt\nAnna Fischer\nMarktplatz 4, Musterstadt', 'lf.iv.desc': 'Beschreibung', 'lf.iv.qty': 'Menge', 'lf.iv.price': 'Einzelpreis', 'lf.iv.amount': 'Betrag', 'lf.iv.items': 'Gestaltung der Website\nLogo und Visitenkarten\nProduktfotos, halber Tag\nDruck von 500 Flyern\nWebhosting, pro Monat', 'lf.iv.sub': 'Zwischensumme', 'lf.iv.rate': '19', 'lf.iv.tax': 'MwSt. 19 %', 'lf.iv.total': 'Gesamtbetrag', 'lf.iv.payhead': 'Zahlung', 'lf.iv.pay': 'Überweisung auf folgendes Konto\nIBAN: DE12 3456 7890 1234 5678 90\nBitte geben Sie die Rechnungsnummer als Verwendungszweck an.', 'lf.iv.thanks': 'Vielen Dank für Ihren Auftrag!',
    'lf.b2.name': 'Visitenkarte · zweiseitig', 'lf.bt.name': 'Visitenkarte · Handwerk', 'lf.bt.org': 'Elektro Funke', 'lf.bt.what': 'Elektroarbeiten · Reparaturen · Licht', 'lf.bt.free': 'Kostenloser Kostenvoranschlag',
    'lf.lc.name': 'Briefpapier · Ecke', 'lf.lc.date': '3. Mai 2027', 'lf.lc.to': 'Frau Johanna Schmidt\nCafé Grünes Blatt\nMarktplatz 4\n12345 Musterstadt',
    'lf.sl.name': 'Kurzmitteilung · Ecke', 'lf.sl.title': 'Mit freundlichen Grüßen',
    'lf.tf.name': 'Faltblatt · Gartenservice', 'lf.tf.sayhead': 'Das sagen unsere Kunden', 'lf.tf.quotes': 'Aus unserem verwilderten Garten ist ein Ort geworden, an dem wir gern sitzen. Freundlich, ordentlich und pünktlich.|Margarete, Musterstadt\nFaire Preise und nette Leute. Unser Rasen sah noch nie so gut aus!|Dieter und Susanne, Eichenau', 'lf.tf.contact': 'Kontakt', 'lf.tf.hours': 'Mo – Sa · 8 – 18 Uhr', 'lf.tf.quote': 'Kostenloses Angebot', 'lf.tf.quote2': 'Wir kommen vorbei, hören zu und nennen Ihnen einen klaren Preis. Unverbindlich.', 'lf.tf.org': 'Grüner Daumen Gartenpflege', 'lf.tf.tag': 'Schöne Gärten, das ganze Jahr',
    'lf.tf.serv': 'Unsere Leistungen', 'lf.tf.servlist': 'Rasenmähen und Kanten\nHecken- und Baumschnitt\nUnkraut jäten und Beete\nBepflanzung und neue Beete\nTerrassen- und Wegereinigung\nZäune und kleine Reparaturen\nLaub entfernen im Herbst\nAbfuhr von Grünschnitt',
    'lf.tf.prices': 'Preise', 'lf.tf.pricelist': 'Rasenmähen|ab 25 €\nHeckenschnitt|ab 40 €\nGartenpflege, halber Tag|90 €\nTerrassenreinigung|ab 60 €\nRegelmäßige Pflege, monatlich|ab 80 €\nGrünschnitt, pro Ladung|30 €', 'lf.tf.pricenote': 'Die Preise hängen von der Größe Ihres Gartens ab. Rentner erhalten 10 % Rabatt.',
    'lf.tf.about': 'Über uns', 'lf.tf.abouttext': 'Wir sind ein kleiner Familienbetrieb mit fünfzehn Jahren Erfahrung. Wir pflegen jeden Garten wie unseren eigenen.\nWir arbeiten mit leisen, modernen Geräten und verwerten allen Grünschnitt.', 'lf.tf.badges': 'Voll versichert\n15 Jahre Erfahrung\nFamilienbetrieb aus der Region',
    'lf.gg.name': 'Konzertplakat', 'lf.gg.kicker': 'Live im Keller', 'lf.gg.title': 'The Night\nOwls', 'lf.gg.with': 'Mit besonderen Gästen', 'lf.gg.acts': 'Paper Planes · Lucy Grey', 'lf.gg.date': 'Freitag, 12. März', 'lf.gg.doors': 'Einlass 20 Uhr · Beginn 21 Uhr', 'lf.gg.place': 'Kellerbar, Hauptstraße 9', 'lf.gg.tickets': 'Vorverkauf 12 € · Abendkasse 15 €',
    'lf.ws.name': 'Workshop-Flyer', 'lf.ws.kicker': 'Mitmach-Workshop', 'lf.ws.title': 'Sauerteig-\nbrot backen', 'lf.ws.sub': 'Lernen Sie an einem gemütlichen Vormittag Schritt für Schritt, wie Sie zu Hause knuspriges Sauerteigbrot backen.', 'lf.ws.do': 'Das erwartet Sie', 'lf.ws.steps': 'Sauerteig füttern|So bleibt Ihr eigener Sauerteig aktiv und munter.\nKneten und formen|Teig ansetzen, falten und zu einem schönen Laib formen.\nBacken und kosten|Im heißen Ofen backen und mit Butter und Marmelade genießen.', 'lf.ws.date': 'Samstag, 18. Oktober', 'lf.ws.time': '9 – 13 Uhr', 'lf.ws.place': 'Alte Bäckerei, Mühlgasse 2', 'lf.ws.price': '45 €', 'lf.ws.incl': 'Mit Zutaten, Schürze und eigenem Sauerteig zum Mitnehmen', 'lf.ws.places': 'Nur 10 Plätze!', 'lf.ws.book': 'Anmeldung: {phone} · {email}',
    'lf.pt.name': 'Tierbetreuung mit Abreißzetteln', 'lf.pt.title': 'Gassi-Service &\nTierbetreuung', 'lf.pt.about': 'Hallo, ich bin Jessi! Ich liebe Tiere und wohne gleich um die Ecke. Ich kümmere mich um Ihre Lieblinge wie um meine eigenen.', 'lf.pt.points': 'Gassirunden von 30 oder 60 Minuten\nFüttern und Kuscheln im Urlaub\nVersichert, mit Referenzen\nFoto-Updates aufs Handy', 'lf.pt.price': 'Ab 10 €\npro Runde', 'lf.pt.short': 'Jessi · Tierbetreuung', 'lf.pt.area': 'Musterstadt und Umgebung · auch abends und am Wochenende',
    'lf.oh.name': 'Besichtigung', 'lf.oh.title': 'Besichtigung', 'lf.oh.when': 'Sonntag, 14. Juni\n14 – 16 Uhr', 'lf.oh.price': '385.000 €', 'lf.oh.f1': '4 Schlafzimmer', 'lf.oh.f2': 'Großes Wohnzimmer', 'lf.oh.f3': 'Südgarten', 'lf.oh.f4': 'Garage', 'lf.oh.body': 'Ein helles, geräumiges Familienhaus in ruhiger Straße, nur wenige Gehminuten von Schulen, Geschäften und Park. Schauen Sie vorbei, ganz ohne Termin.',
    'lf.sq.name': 'Social-Media-Beitrag · Neuheiten', 'lf.sq.tag': 'Neu da!', 'lf.sq.title': 'Unsere Frühjahrskollektion ist da', 'lf.sq.sub': 'Kommen Sie vorbei oder bestellen Sie online.', 'lf.sq.handle': '@ihrladen · {web}',
    'lf.se.name': 'Social-Media-Beitrag · Veranstaltung', 'lf.se.kicker': 'Seien Sie dabei', 'lf.se.title': 'Weinprobe\nam Abend', 'lf.se.dow': 'Freitag', 'lf.se.day': '17', 'lf.se.mon': 'Oktober', 'lf.se.time': '19 – 22 Uhr', 'lf.se.what': 'Sechs Weine von kleinen Weingütern aus der Region, dazu Käse und Brot. 25 € pro Person.', 'lf.se.book': 'Jetzt reservieren: nur 30 Plätze', 'lf.se.place': 'Weinhandlung am Eck, Brückenstraße 3',
  },
  fr: {
    'lf.made': 'Fait avec amour',
    'lf.ad.name': 'Fête d’anniversaire · adultes', 'lf.ad.kicker': 'On fait la fête', 'lf.ad.num': '30', 'lf.ad.title': 'L’anniversaire de Thomas', 'lf.ad.date': 'Samedi 14 juin', 'lf.ad.time': 'De 20 h jusqu’au bout de la nuit', 'lf.ad.place': 'Le Loft, 21 rue du Marché', 'lf.ad.body': 'Cocktails, musique et danse. Venez avec vos plus beaux pas !', 'lf.ad.rsvp': 'Réponse à Sarah avant le 1er juin · 01 23 45 67 89',
    'lf.sp.name': 'Fête surprise', 'lf.sp.shh': 'Chut…', 'lf.sp.secret': 'C’est une surprise !', 'lf.sp.kicker': 'Vous êtes invités à une', 'lf.sp.title': 'Fête surprise', 'lf.sp.for': 'pour les 40 ans d’Anne', 'lf.sp.date': 'Vendredi 20 juin', 'lf.sp.time': 'Arrivée avant 19 h 30', 'lf.sp.place': 'Chez Rosie, 5 allée du Parc', 'lf.sp.note': 'Anne pense qu’on va juste dîner, alors gardez le secret !', 'lf.sp.rsvp': 'Réponse à Marc · 01 23 45 67 89',
    'lf.ks.name': 'Anniversaire enfant · espace', 'lf.ks.age': '5', 'lf.ks.kicker': '3, 2, 1…\nDécollage !', 'lf.ks.title': 'La fête spatiale de Léo', 'lf.ks.sub': 'Léo a 5 ans !', 'lf.ks.date': 'Dimanche 8 juin', 'lf.ks.time': '14 h – 17 h', 'lf.ks.place': 'Parc de jeux Étoile', 'lf.ks.note': 'Déguisements d’astronaute bienvenus !', 'lf.ks.rsvp': 'Réponse à Emma · 01 23 45 67 89',
    'lf.cb.name': 'Carte pliée · anniversaire', 'lf.cb.title': 'Joyeux\nanniversaire', 'lf.cb.quote': '« Compte ton âge en amis, pas en années. »', 'lf.cb.dear': 'Chère Sophie,', 'lf.cb.wish': 'Je te souhaite une année pleine de rires, d’aventures et de gâteaux. Passe une merveilleuse journée, tu le mérites !', 'lf.cb.love': 'Je t’embrasse,', 'lf.cb.from': 'Thomas',
    'lf.cg.name': 'Carte pliée · félicitations', 'lf.cg.title': 'Félicitations', 'lf.cg.sub': 'pour cette merveilleuse nouvelle', 'lf.cg.happy': 'Tellement heureux pour vous !', 'lf.cg.wish': 'Tous nos vœux de bonheur pour ce nouveau chapitre si excitant. Personne ne le mérite plus que vous.', 'lf.cg.love': 'Avec toute notre affection,', 'lf.cg.from': 'Anne et Marc',
    'lf.bb.name': 'Faire-part de naissance', 'lf.bb.hello': 'Coucou le monde !', 'lf.bb.baby': 'Mia\nRose', 'lf.bb.born': 'Née le 3 mars 2027', 'lf.bb.facts': '7 h 42 · 3,2 kg · 50 cm', 'lf.bb.parents': 'Avec tout l’amour d’Anne et Marc, et de son grand frère Léo',
    'lf.fr.name': 'Réunion de famille', 'lf.fr.kicker': 'Vous êtes invités aux', 'lf.fr.title': 'Retrouvailles de la famille Martin', 'lf.fr.sub': 'Trois générations, un grand pique-nique !', 'lf.fr.day': 'Le programme', 'lf.fr.plan': '12 h|Accueil et déjeuner\n14 h|Jeux pour tous les âges\n15 h 30|Grande photo de famille\n17 h|Barbecue\n19 h|Musique et souvenirs', 'lf.fr.date': 'Dimanche 3 août', 'lf.fr.time': 'À partir de midi', 'lf.fr.place': 'Parc des Chênes, aire de pique-nique', 'lf.fr.bring': 'À apporter', 'lf.fr.items': 'Un plat à partager\nDe vieilles photos de famille\nUne chaise ou un plaid', 'lf.fr.rsvp': 'Dites à tante Marie si vous venez : 01 23 45 67 89',
    'lf.rc.name': 'Fiche recette', 'lf.rc.kicker': 'La cuisine de Mamie', 'lf.rc.title': 'Crumble aux pommes', 'lf.rc.serves': '6 personnes', 'lf.rc.prep': 'Préparation 20 min', 'lf.rc.bake': 'Cuisson 40 min', 'lf.rc.ing': 'Ingrédients', 'lf.rc.ings': '6 pommes pelées et coupées\n2 c. à soupe de sucre\n1 c. à café de cannelle\n150 g de farine\n100 g de beurre froid\n75 g de cassonade\n50 g de flocons d’avoine\nUne pincée de sel', 'lf.rc.method': 'Préparation', 'lf.rc.steps': 'Préchauffez le four à 180 °C.\nMettez les pommes dans un plat avec le sucre et la cannelle.\nSablez la farine, le sel et le beurre du bout des doigts. Ajoutez la cassonade et l’avoine.\nParsemez sur les pommes et enfournez 40 minutes, jusqu’à ce que ce soit doré.\nServez tiède avec de la crème anglaise ou une glace.', 'lf.rc.tip': 'Astuce : en automne, ajoutez une poignée de mûres.',
    'lf.hw.name': 'Pendaison de crémaillère', 'lf.hw.kicker': 'On a déménagé !', 'lf.hw.title': 'Pendaison de crémaillère', 'lf.hw.body': 'Venez découvrir notre nouveau chez-nous, trinquer avec nous et le remplir d’amis.', 'lf.hw.date': 'Samedi 21 juin', 'lf.hw.time': 'À partir de 16 h', 'lf.hw.addr': '8 avenue des Roses, Villeneuve', 'lf.hw.foot': 'Venez les mains vides ! · Élodie et Samuel',
    'lf.an.name': 'Anniversaire de mariage', 'lf.an.num': '50', 'lf.an.kicker': 'Cinquante ans d’amour', 'lf.an.title': 'Noces d’Or', 'lf.an.names': 'Hélène et Georges', 'lf.an.years': '1977 – 2027', 'lf.an.body': 'Rejoignez-nous pour un goûter en leur honneur', 'lf.an.date': 'Dimanche 12 septembre', 'lf.an.time': 'à 15 h', 'lf.an.place': 'Grand Hôtel, avenue de la Gare', 'lf.an.rsvp': 'Merci de répondre à Claire avant le 1er septembre',
    'lf.wm.name': 'Faire-part de mariage · arche', 'lf.wm.kicker': 'Avec leurs familles', 'lf.wm.names': 'Camille\n&\nLouis', 'lf.wm.invite': 'ont la joie de vous inviter à leur mariage', 'lf.wm.day': 'Samedi', 'lf.wm.num': '19', 'lf.wm.month': 'Juin 2027', 'lf.wm.time': 'à quatorze heures', 'lf.wm.place': 'Le Moulin de la Rivière\nChemin du Moulin, Villeneuve', 'lf.wm.after': 'Suivi d’un dîner dansant', 'lf.wm.rsvp': 'Merci de répondre avant le 1er mai\ncamille.louis@example.com',
    'lf.sd.name': 'Save the date · calendrier', 'lf.sd.title': 'Réservez la date', 'lf.sd.names': 'Camille et Louis', 'lf.sd.month': 'Juin 2027', 'lf.sd.days': 'L M M J V S D', 'lf.sd.follow': 'Faire-part à suivre', 'lf.sd.place': 'Le Moulin de la Rivière · Villeneuve',
    'lf.rv.name': 'Carton-réponse de mariage', 'lf.rv.title': 'Réponse', 'lf.rv.by': 'Merci de répondre avant le 1er mai 2027', 'lf.rv.names': 'Nom(s)', 'lf.rv.yes': 'Sera présent(e) avec joie', 'lf.rv.no': 'Ne pourra pas venir', 'lf.rv.count': 'Nombre de personnes', 'lf.rv.diet': 'Régime ou allergies', 'lf.rv.meal': 'Plat principal', 'lf.rv.meals': 'Bœuf\nPoisson\nVégétarien', 'lf.rv.foot': 'Nous avons hâte de fêter ça avec vous !',
    'lf.pg.name': 'Programme du mariage', 'lf.pg.title': 'Notre mariage', 'lf.pg.sub': 'Camille et Louis · 19 juin 2027', 'lf.pg.items': '14 h|Cérémonie|Dans le jardin, au bord de la rivière\n15 h|Vin d’honneur et photos|Jeux sur la pelouse\n17 h|Dîner|Dans la salle du Moulin\n19 h 30|Discours et gâteau\n20 h 30|Ouverture du bal|Et la fête commence !\n23 h 30|Au revoir|Merci d’être venus', 'lf.pg.foot': 'Partagez vos photos : #CamilleEtLouis',
    'lf.wl.name': 'Panneau de bienvenue de mariage', 'lf.wl.title': 'Bienvenue', 'lf.wl.to': 'au mariage de', 'lf.wl.names': 'Camille\n& Louis', 'lf.wl.date': '19 juin 2027', 'lf.wl.note': 'Merci d’être là pour partager notre journée',
    'lf.ts.name': 'Ardoise · suggestions du jour', 'lf.ts.title': 'Suggestions du jour', 'lf.ts.when': 'Servies dès midi, dans la limite des stocks', 'lf.ts.s1': 'Soupe', 'lf.ts.l1': 'Velouté de tomates rôties|5,50 €|Avec pain chaud et beurre', 'lf.ts.s2': 'Plats', 'lf.ts.l2': 'Fish and chips|13,50 €|Pâte croustillante, petits pois, sauce tartare\nTourte poulet-poireaux|12,00 €|Purée maison et légumes de saison\nRisotto aux champignons|11,50 €|Parmesan, roquette, huile de truffe', 'lf.ts.s3': 'Dessert', 'lf.ts.l3': 'Tarte Tatin|6,00 €|Avec crème fraîche', 'lf.ts.foot': 'Demandez-nous nos plats végétariens et sans gluten',
    'lf.tk.name': 'Menu à emporter', 'lf.tk.org': 'La Maison des Nouilles', 'lf.tk.sub': 'Cuisine asiatique fraîche · à emporter et en livraison', 'lf.tk.call': 'Commandez au {phone}',
    'lf.tk.s1': 'Entrées', 'lf.tk.l1': 'Nems (4)|4,50\nSaté de poulet|5,90\nChips de crevettes|2,50\nGyozas aux légumes (6)|5,50\nSoupe miso|3,50',
    'lf.tk.s2': 'Nouilles', 'lf.tk.l2': 'Pad thaï|10,50|Nouilles de riz, œuf, cacahuètes\nChow mein au poulet|9,90|Nouilles aux œufs et légumes\nRamen épicé au bœuf|12,50|Bouillon riche, œuf, piment\nUdon au tofu|9,50|Grosses nouilles, légumes, gingembre',
    'lf.tk.s3': 'Riz et curry', 'lf.tk.l3': 'Curry vert thaï|11,50|Poulet ou tofu, riz jasmin\nCurry katsu|11,90|Poulet croustillant, sauce douce\nRiz cantonais|5,50|Petits pois et oignon nouveau\nPoulet aigre-doux|10,50|Ananas et poivrons',
    'lf.tk.s4': 'Extras et boissons', 'lf.tk.l4': 'Riz nature|3,00\nToasts aux crevettes|4,90\nEdamame|3,90\nSoda en canette|1,80\nThé au jasmin|2,50',
    'lf.tk.deliver': 'Livraison offerte dès 20 €', 'lf.tk.hours': 'Mar – Dim · 18 h – 22 h 30',
    'lf.ck.name': 'Carte des cocktails', 'lf.ck.title': 'L’heure du cocktail', 'lf.ck.sub': 'Secoués, mélangés et préparés avec amour',
    'lf.ck.s1': 'Cocktails', 'lf.ck.l1': 'Mojito|8,50|Rhum blanc, citron vert, menthe, soda\nEspresso martini|9,00|Vodka, liqueur de café, espresso\nPornstar martini|9,50|Vodka vanille et fruit de la passion\nNegroni|9,00|Gin, vermouth rouge, bitter\nMargarita|8,50|Tequila, citron vert, triple sec',
    'lf.ck.s2': 'Sans alcool', 'lf.ck.l2': 'Virgin mojito|5,50|Citron vert, menthe, pomme, soda\nTropical|5,50|Mangue, ananas et gingembre',
    'lf.ck.happy': 'Happy hour 18 h – 20 h · deux cocktails pour 14 €',
    'lf.cp.name': 'Planche de bons de réduction', 'lf.cp.head': 'À découper et à apporter', 'lf.cp.offers': '-20 %|Sur toute la boutique\nCafé offert|Avec une part de gâteau\n2 pour 1|Sur les sandwichs, tous les lundis\n-5 €|Dès 30 € d’achat\nLivraison offerte|Sur votre prochaine commande\nAnniversaire|Un cupcake offert le jour J', 'lf.cp.valid': 'Valable jusqu’au 31 mai 2027. Un bon par client.',
    'lf.gc.name': 'Bon cadeau', 'lf.gc.title': 'Bon cadeau', 'lf.gc.entitles': 'Ce bon donne droit à', 'lf.gc.what': 'un massage relaxant du corps entier (60 minutes)', 'lf.gc.value': '60 €', 'lf.gc.from': 'Offert par', 'lf.gc.valid': 'Valable jusqu’au', 'lf.gc.book': 'Réservation au {phone}. Merci d’apporter ce bon.',
    'lf.go.name': 'Affiche d’inauguration', 'lf.go.kicker': 'Vous êtes invités', 'lf.go.title': 'Grande\nouverture', 'lf.go.when': 'Samedi 5 juin · 10 h', 'lf.go.offers': 'Café et gâteau offerts aux 100 premiers visiteurs\n-10 % sur tout le week-end\nBallons et maquillage pour les enfants',
    'lf.pc.name': 'Carte postale · déménagement', 'lf.pc.title': 'On a déménagé !', 'lf.pc.sub': 'Découvrez notre nouvelle boutique dès le 1er juin', 'lf.pc.msg': 'Chère cliente, cher client,\nAprès dix belles années rue du Moulin, nous avons emménagé dans une boutique plus grande et plus lumineuse, au {addr}.\nPassez nous dire bonjour : le premier café est offert !\nÀ très vite,\nToute l’équipe', 'lf.pc.stamp': 'Timbre',
    'lf.iv.name': 'Facture', 'lf.iv.title': 'Facture', 'lf.iv.no': 'Facture n°', 'lf.iv.date': 'Date', 'lf.iv.dateV': '3 mai 2027', 'lf.iv.due': 'Échéance', 'lf.iv.dueV': '17 mai 2027', 'lf.iv.to': 'Facturé à', 'lf.iv.client': 'Café La Feuille Verte\nAnne Fischer\n4 place du Marché, Villeneuve', 'lf.iv.desc': 'Désignation', 'lf.iv.qty': 'Qté', 'lf.iv.price': 'Prix unitaire', 'lf.iv.amount': 'Montant', 'lf.iv.items': 'Création du site web\nLogo et cartes de visite\nPhotos produits, une demi-journée\nImpression de 500 flyers\nHébergement du site, par mois', 'lf.iv.sub': 'Total HT', 'lf.iv.rate': '20', 'lf.iv.tax': 'TVA 20 %', 'lf.iv.total': 'Total TTC', 'lf.iv.payhead': 'Règlement', 'lf.iv.pay': 'Virement sur le compte suivant\nIBAN : FR76 1234 5678 9012 3456 7890 123\nMerci d’indiquer le numéro de facture en référence.', 'lf.iv.thanks': 'Merci pour votre confiance !',
    'lf.b2.name': 'Carte de visite · recto verso', 'lf.bt.name': 'Carte de visite · artisan', 'lf.bt.org': 'L’Étincelle', 'lf.bt.what': 'Électricité · dépannage · éclairage', 'lf.bt.free': 'Devis gratuit · sans frais de déplacement',
    'lf.lc.name': 'Papier à en-tête · coin', 'lf.lc.date': '3 mai 2027', 'lf.lc.to': 'Madame Jeanne Petit\nCafé La Feuille Verte\n4 place du Marché\n12345 Villeneuve',
    'lf.sl.name': 'Carte de correspondance · coin', 'lf.sl.title': 'Avec nos compliments',
    'lf.tf.name': 'Dépliant 3 volets · jardinier', 'lf.tf.sayhead': 'Ce que disent nos clients', 'lf.tf.quotes': 'Notre jardin en friche est devenu un endroit où l’on adore s’asseoir. Aimables, soigneux et toujours à l’heure.|Marguerite, Villeneuve\nDes prix justes et une équipe charmante. Notre pelouse n’a jamais été aussi belle !|David et Sophie, Chêneville', 'lf.tf.contact': 'Nous contacter', 'lf.tf.hours': 'Lun – Sam · 8 h – 18 h', 'lf.tf.quote': 'Devis gratuit', 'lf.tf.quote2': 'Nous venons, nous écoutons et nous vous donnons un prix clair. Sans engagement.', 'lf.tf.org': 'Les Jardins de la Main Verte', 'lf.tf.tag': 'De beaux jardins toute l’année',
    'lf.tf.serv': 'Nos services', 'lf.tf.servlist': 'Tonte et bordures\nTaille de haies et d’arbres\nDésherbage et massifs\nPlantations et nouveaux massifs\nNettoyage de terrasses et allées\nClôtures et petites réparations\nRamassage des feuilles\nÉvacuation des déchets verts',
    'lf.tf.prices': 'Tarifs', 'lf.tf.pricelist': 'Tonte de pelouse|dès 25 €\nTaille de haie|dès 40 €\nEntretien, demi-journée|90 €\nNettoyage de terrasse|dès 60 €\nEntretien mensuel|dès 80 €\nDéchets verts, par chargement|30 €', 'lf.tf.pricenote': 'Les prix dépendent de la taille de votre jardin. 10 % de réduction pour les retraités.',
    'lf.tf.about': 'Qui sommes-nous', 'lf.tf.abouttext': 'Nous sommes une petite entreprise familiale avec quinze ans d’expérience. Nous soignons chaque jardin comme le nôtre.\nNous utilisons des outils modernes et silencieux et recyclons tous les déchets verts.', 'lf.tf.badges': 'Entièrement assurés\n15 ans d’expérience\nEntreprise familiale et locale',
    'lf.gg.name': 'Affiche de concert', 'lf.gg.kicker': 'En live à La Cave', 'lf.gg.title': 'The Night\nOwls', 'lf.gg.with': 'Avec en invités', 'lf.gg.acts': 'Paper Planes · Lucy Grey', 'lf.gg.date': 'Vendredi 12 mars', 'lf.gg.doors': 'Ouverture 20 h · Concert 21 h', 'lf.gg.place': 'La Cave, 9 Grande Rue', 'lf.gg.tickets': 'Billets 12 € en prévente · 15 € sur place',
    'lf.ws.name': 'Affiche d’atelier', 'lf.ws.kicker': 'Atelier pratique', 'lf.ws.title': 'Pain au levain', 'lf.ws.sub': 'Apprenez à faire chez vous un pain au levain croustillant et savoureux, étape par étape, le temps d’une matinée conviviale.', 'lf.ws.do': 'Au programme', 'lf.ws.steps': 'Nourrir le levain|Apprenez à garder votre levain actif et bien vivant.\nPétrir et façonner|Préparez la pâte, rabattez-la et façonnez une belle miche.\nCuire et goûter|Cuisez au four bien chaud, puis dégustez avec beurre et confiture.', 'lf.ws.date': 'Samedi 18 octobre', 'lf.ws.time': '9 h – 13 h', 'lf.ws.place': 'Le Vieux Fournil, rue du Moulin', 'lf.ws.price': '45 €', 'lf.ws.incl': 'Ingrédients, tablier et votre propre levain à emporter', 'lf.ws.places': 'Seulement 10 places !', 'lf.ws.book': 'Inscriptions : {phone} · {email}',
    'lf.pt.name': 'Garde d’animaux avec languettes', 'lf.pt.title': 'Promenade de chiens\n& garde d’animaux', 'lf.pt.about': 'Bonjour, moi c’est Jessica ! J’adore les animaux et j’habite juste à côté. Je m’occuperai de vos compagnons comme des miens.', 'lf.pt.points': 'Balades de 30 ou 60 minutes\nRepas et câlins pendant vos absences\nAssurée, avec références\nDes photos sur votre téléphone', 'lf.pt.price': 'À partir de\n10 € la balade', 'lf.pt.short': 'Jessica · animaux', 'lf.pt.area': 'Villeneuve et alentours · aussi le soir et le week-end',
    'lf.oh.name': 'Visite libre', 'lf.oh.title': 'Portes ouvertes', 'lf.oh.when': 'Dimanche 14 juin\n14 h – 16 h', 'lf.oh.price': '385 000 €', 'lf.oh.f1': '4 chambres', 'lf.oh.f2': 'Grand séjour', 'lf.oh.f3': 'Jardin plein sud', 'lf.oh.f4': 'Garage', 'lf.oh.body': 'Une maison familiale lumineuse et spacieuse dans une rue calme, à deux pas des écoles, des commerces et du parc. Passez la visiter, sans rendez-vous.',
    'lf.sq.name': 'Publication · nouveautés', 'lf.sq.tag': 'Nouveau !', 'lf.sq.title': 'La collection de printemps est arrivée', 'lf.sq.sub': 'Venez l’essayer en boutique ou commandez en ligne.', 'lf.sq.handle': '@votreboutique · {web}',
    'lf.se.name': 'Publication · événement', 'lf.se.kicker': 'Rejoignez-nous', 'lf.se.title': 'Soirée\ndégustation', 'lf.se.dow': 'Vendredi', 'lf.se.day': '17', 'lf.se.mon': 'Octobre', 'lf.se.time': '19 h – 22 h', 'lf.se.what': 'Six vins de petits domaines de la région, avec fromages et pain. 25 € par personne.', 'lf.se.book': 'Réservez vite : 30 places seulement', 'lf.se.place': 'La Cave du Coin, 3 rue du Pont',
  },
  pt: {
    'lf.made': 'Feito com carinho',
    'lf.ad.name': 'Festa de aniversário · adultos', 'lf.ad.kicker': 'Vamos comemorar', 'lf.ad.num': '30', 'lf.ad.title': 'Aniversário do João', 'lf.ad.date': 'Sábado, 14 de junho', 'lf.ad.time': 'A partir das 21h', 'lf.ad.place': 'Bar do Sótão, Rua do Mercado, 21', 'lf.ad.body': 'Drinks, música e muita dança. Traga seus melhores passos!', 'lf.ad.rsvp': 'Confirme com a Sara até 1º de junho · (11) 91234-5678',
    'lf.sp.name': 'Festa surpresa', 'lf.sp.shh': 'Psiu…', 'lf.sp.secret': 'É surpresa!', 'lf.sp.kicker': 'Você está convidado para uma', 'lf.sp.title': 'Festa surpresa', 'lf.sp.for': 'pelos 40 anos da Ana', 'lf.sp.date': 'Sexta, 20 de junho', 'lf.sp.time': 'Chegue até as 19h30', 'lf.sp.place': 'Restaurante da Rosa, Rua do Parque, 5', 'lf.sp.note': 'A Ana acha que vamos só jantar, então não conte para ninguém!', 'lf.sp.rsvp': 'Confirme com o Marcos · (11) 91234-5678',
    'lf.ks.name': 'Festa infantil · espaço', 'lf.ks.age': '5', 'lf.ks.kicker': '3, 2, 1…\nDecolar!', 'lf.ks.title': 'Festa espacial do Léo', 'lf.ks.sub': 'O Léo faz 5 anos!', 'lf.ks.date': 'Domingo, 8 de junho', 'lf.ks.time': '14h – 17h', 'lf.ks.place': 'Buffet Estrelinha', 'lf.ks.note': 'Venha fantasiado de astronauta!', 'lf.ks.rsvp': 'Confirme com a Ema · (11) 91234-5678',
    'lf.cb.name': 'Cartão dobrado · aniversário', 'lf.cb.title': 'Feliz\naniversário', 'lf.cb.quote': '“Conte sua idade pelos amigos, não pelos anos.”', 'lf.cb.dear': 'Querida Sofia,', 'lf.cb.wish': 'Desejo a você um ano cheio de risadas, aventuras e muito bolo. Tenha um dia maravilhoso, você merece!', 'lf.cb.love': 'Com carinho,', 'lf.cb.from': 'Tomás',
    'lf.cg.name': 'Cartão dobrado · parabéns', 'lf.cg.title': 'Parabéns', 'lf.cg.sub': 'pela notícia maravilhosa', 'lf.cg.happy': 'Que alegria!', 'lf.cg.wish': 'Desejamos toda a felicidade nesta nova fase tão especial. Ninguém merece mais do que vocês.', 'lf.cg.love': 'Com carinho,', 'lf.cg.from': 'Ana e Marcos',
    'lf.bb.name': 'Anúncio de nascimento', 'lf.bb.hello': 'Olá, mundo!', 'lf.bb.baby': 'Mia\nRosa', 'lf.bb.born': 'Nasceu em 3 de março de 2027', 'lf.bb.facts': '7h42 · 3,2 kg · 50 cm', 'lf.bb.parents': 'Com amor, Ana e Marcos, e o irmão mais velho Léo',
    'lf.fr.name': 'Encontro de família', 'lf.fr.kicker': 'Você está convidado para o', 'lf.fr.title': 'Encontro da Família Silva', 'lf.fr.sub': 'Três gerações, um grande piquenique!', 'lf.fr.day': 'Programação', 'lf.fr.plan': '12h|Boas-vindas e almoço\n14h|Brincadeiras para todas as idades\n15h30|Foto da família toda\n17h|Churrasco\n19h|Música e histórias', 'lf.fr.date': 'Domingo, 3 de agosto', 'lf.fr.time': 'A partir do meio-dia', 'lf.fr.place': 'Parque dos Ipês, área de piquenique', 'lf.fr.bring': 'Por favor, traga', 'lf.fr.items': 'Um prato para dividir\nFotos antigas da família\nUma cadeira ou uma canga', 'lf.fr.rsvp': 'Avise a tia Maria se você vem: (11) 91234-5678',
    'lf.rc.name': 'Ficha de receita', 'lf.rc.kicker': 'Da cozinha da vovó', 'lf.rc.title': 'Crumble de maçã', 'lf.rc.serves': 'Rende 6 porções', 'lf.rc.prep': 'Preparo 20 min', 'lf.rc.bake': 'Forno 40 min', 'lf.rc.ing': 'Ingredientes', 'lf.rc.ings': '6 maçãs descascadas e fatiadas\n2 colheres (sopa) de açúcar\n1 colher (chá) de canela\n150 g de farinha de trigo\n100 g de manteiga gelada\n75 g de açúcar mascavo\n50 g de aveia em flocos\nUma pitada de sal', 'lf.rc.method': 'Modo de preparo', 'lf.rc.steps': 'Preaqueça o forno a 180 °C.\nColoque as maçãs numa travessa com o açúcar e a canela.\nMisture com as pontas dos dedos a farinha, o sal e a manteiga até virar uma farofa. Junte o açúcar mascavo e a aveia.\nEspalhe sobre as maçãs e asse por 40 minutos, até dourar.\nSirva morno com sorvete de creme.', 'lf.rc.tip': 'Dica: acrescente um punhado de amoras.',
    'lf.hw.name': 'Chá de casa nova', 'lf.hw.kicker': 'Mudamos!', 'lf.hw.title': 'Chá de casa nova', 'lf.hw.body': 'Venha conhecer nosso novo lar, brindar com a gente e enchê-lo de amigos.', 'lf.hw.date': 'Sábado, 21 de junho', 'lf.hw.time': 'A partir das 16h', 'lf.hw.addr': 'Avenida das Rosas, 8 – Centro', 'lf.hw.foot': 'Traga só você e a sua alegria! · Elisa e Samuel',
    'lf.an.name': 'Bodas de casamento', 'lf.an.num': '50', 'lf.an.kicker': 'Cinquenta anos juntos', 'lf.an.title': 'Bodas de Ouro', 'lf.an.names': 'Helena e Jorge', 'lf.an.years': '1977 – 2027', 'lf.an.body': 'Venha para um café da tarde em homenagem a eles', 'lf.an.date': 'Domingo, 12 de setembro', 'lf.an.time': 'às 16h', 'lf.an.place': 'Grande Hotel, Avenida da Estação, 4', 'lf.an.rsvp': 'Confirme presença com a Clara até 1º de setembro',
    'lf.wm.name': 'Convite de casamento · arco', 'lf.wm.kicker': 'Junto com suas famílias', 'lf.wm.names': 'Inês\n&\nTiago', 'lf.wm.invite': 'convidam você para celebrar o seu casamento', 'lf.wm.day': 'Sábado', 'lf.wm.num': '19', 'lf.wm.month': 'Junho 2027', 'lf.wm.time': 'às dezesseis horas', 'lf.wm.place': 'Sítio do Moinho\nEstrada do Rio, Atibaia', 'lf.wm.after': 'Em seguida, jantar e festa', 'lf.wm.rsvp': 'Confirme presença até 1º de maio\nines.tiago@example.com',
    'lf.sd.name': 'Save the date · calendário', 'lf.sd.title': 'Reserve a data', 'lf.sd.names': 'Inês e Tiago', 'lf.sd.month': 'Junho 2027', 'lf.sd.days': 'S T Q Q S S D', 'lf.sd.follow': 'Convite em breve', 'lf.sd.place': 'Sítio do Moinho · Atibaia',
    'lf.rv.name': 'Cartão de confirmação de casamento', 'lf.rv.title': 'Confirmação', 'lf.rv.by': 'Por favor, responda até 1º de maio de 2027', 'lf.rv.names': 'Nome(s)', 'lf.rv.yes': 'Vou com alegria', 'lf.rv.no': 'Infelizmente não poderei ir', 'lf.rv.count': 'Número de convidados', 'lf.rv.diet': 'Restrições alimentares', 'lf.rv.meal': 'Prato principal', 'lf.rv.meals': 'Carne\nPeixe\nVegetariano', 'lf.rv.foot': 'Mal podemos esperar para celebrar com você!',
    'lf.pg.name': 'Programa do casamento', 'lf.pg.title': 'Nosso casamento', 'lf.pg.sub': 'Inês e Tiago · 19 de junho de 2027', 'lf.pg.items': '16h|Cerimônia|No jardim, à beira do rio\n17h|Coquetel e fotos|Brincadeiras no gramado\n19h|Jantar|No salão do Sítio\n21h|Discursos e bolo\n21h30|Primeira dança|E a festa começa!\n2h|Despedida|Obrigado por virem', 'lf.pg.foot': 'Compartilhe suas fotos: #InesETiago',
    'lf.wl.name': 'Placa de boas-vindas de casamento', 'lf.wl.title': 'Bem-vindos', 'lf.wl.to': 'ao casamento de', 'lf.wl.names': 'Inês\n& Tiago', 'lf.wl.date': '19 de junho de 2027', 'lf.wl.note': 'Que alegria ter você aqui neste dia tão especial',
    'lf.ts.name': 'Lousa · pratos do dia', 'lf.ts.title': 'Pratos do dia', 'lf.ts.when': 'A partir do meio-dia, enquanto durar', 'lf.ts.s1': 'Sopa', 'lf.ts.l1': 'Creme de tomate assado|R$ 18|Com pão quentinho e manteiga', 'lf.ts.s2': 'Pratos principais', 'lf.ts.l2': 'Peixe empanado com fritas|R$ 42|Com salada e molho tártaro\nEscondidinho de frango|R$ 38|Com purê de mandioca e legumes\nRisoto de cogumelos|R$ 36|Parmesão, rúcula e azeite trufado', 'lf.ts.s3': 'Sobremesa', 'lf.ts.l3': 'Pudim de leite|R$ 16|Feito na casa', 'lf.ts.foot': 'Pergunte pelas opções vegetarianas e sem glúten',
    'lf.tk.name': 'Cardápio para viagem', 'lf.tk.org': 'Casa do Lámen', 'lf.tk.sub': 'Cozinha asiática fresca · retirada e delivery', 'lf.tk.call': 'Peça já: {phone}',
    'lf.tk.s1': 'Entradas', 'lf.tk.l1': 'Rolinho primavera (4)|16,00\nSatay de frango|19,90\nChips de camarão|9,00\nGuioza de legumes (6)|18,00\nMissoshiru|12,00',
    'lf.tk.s2': 'Macarrão', 'lf.tk.l2': 'Pad thai|36,00|Talharim de arroz, ovo, amendoim\nYakisoba de frango|32,90|Macarrão com legumes\nLámen apimentado de carne|42,00|Caldo encorpado, ovo, pimenta\nUdon com tofu|32,00|Macarrão grosso, legumes, gengibre',
    'lf.tk.s3': 'Arroz e curry', 'lf.tk.l3': 'Curry verde tailandês|39,00|Frango ou tofu, arroz jasmim\nCurry katsu|39,90|Frango empanado, molho suave\nArroz frito com ovo|18,00|Com ervilhas e cebolinha\nFrango agridoce|35,00|Abacaxi e pimentões',
    'lf.tk.s4': 'Extras e bebidas', 'lf.tk.l4': 'Arroz branco|10,00\nTorrada de camarão|16,90\nEdamame|14,00\nRefrigerante lata|7,00\nChá de jasmim|8,00',
    'lf.tk.deliver': 'Entrega grátis acima de R$ 80', 'lf.tk.hours': 'Ter – Dom · 18h – 23h',
    'lf.ck.name': 'Carta de drinks', 'lf.ck.title': 'Hora do drink', 'lf.ck.sub': 'Batidos, mexidos e feitos com carinho',
    'lf.ck.s1': 'Drinks', 'lf.ck.l1': 'Caipirinha|28,00|Cachaça, limão e açúcar\nEspresso martini|34,00|Vodca, licor de café, espresso\nMartini de maracujá|34,00|Vodca de baunilha e maracujá\nNegroni|36,00|Gim, vermute tinto e bitter\nMojito|30,00|Rum branco, limão, hortelã e soda',
    'lf.ck.s2': 'Sem álcool', 'lf.ck.l2': 'Mojito sem álcool|18,00|Limão, hortelã, maçã e soda\nTropical|18,00|Manga, abacaxi e gengibre',
    'lf.ck.happy': 'Happy hour 17h – 19h · dois drinks por R$ 50',
    'lf.cp.name': 'Folha de cupons', 'lf.cp.head': 'Recorte e traga com você', 'lf.cp.offers': '20% de desconto|Em toda a loja\nCafé grátis|Na compra de um bolo ou doce\n2 por 1|Em sanduíches, toda segunda-feira\nR$ 20 de desconto|Em compras acima de R$ 100\nEntrega grátis|No seu próximo pedido\nAniversário|Um cupcake grátis no seu dia', 'lf.cp.valid': 'Válido até 31 de maio de 2027. Um cupom por cliente.',
    'lf.gc.name': 'Vale-presente', 'lf.gc.title': 'Vale-presente', 'lf.gc.entitles': 'Este vale dá direito a', 'lf.gc.what': 'uma massagem relaxante de corpo inteiro (60 minutos)', 'lf.gc.value': 'R$ 200', 'lf.gc.from': 'De', 'lf.gc.valid': 'Válido até', 'lf.gc.book': 'Agende pelo {phone}. Traga este vale com você.',
    'lf.go.name': 'Cartaz de inauguração', 'lf.go.kicker': 'Você está convidado', 'lf.go.title': 'Grande\ninauguração', 'lf.go.when': 'Sábado, 5 de junho · 10h', 'lf.go.offers': 'Café e bolo grátis para os 100 primeiros clientes\n10% de desconto em tudo no fim de semana\nBalões e pintura facial para as crianças',
    'lf.pc.name': 'Cartão-postal · mudança', 'lf.pc.title': 'Mudamos!', 'lf.pc.sub': 'Venha conhecer nossa nova loja a partir de 1º de junho', 'lf.pc.msg': 'Querido cliente,\nDepois de dez anos felizes na Rua do Moinho, mudamos para uma loja maior e mais iluminada: {addr}.\nVenha nos visitar: o primeiro cafezinho é por nossa conta!\nAté breve,\nToda a equipe', 'lf.pc.stamp': 'Selo',
    'lf.iv.name': 'Fatura', 'lf.iv.title': 'Fatura', 'lf.iv.no': 'Fatura nº', 'lf.iv.date': 'Data', 'lf.iv.dateV': '3 de maio de 2027', 'lf.iv.due': 'Vencimento', 'lf.iv.dueV': '17 de maio de 2027', 'lf.iv.to': 'Cliente', 'lf.iv.client': 'Café Folha Verde\nAna Fischer\nPraça do Mercado, 4 – Centro', 'lf.iv.desc': 'Descrição', 'lf.iv.qty': 'Qtd.', 'lf.iv.price': 'Valor unit.', 'lf.iv.amount': 'Total', 'lf.iv.items': 'Criação do site\nLogotipo e cartões de visita\nFotos de produtos, meio período\nImpressão de 500 panfletos\nHospedagem do site, por mês', 'lf.iv.prices': '1500|600|750|320|30', 'lf.iv.sub': 'Subtotal', 'lf.iv.rate': '5', 'lf.iv.tax': 'ISS 5%', 'lf.iv.total': 'Total a pagar', 'lf.iv.payhead': 'Pagamento', 'lf.iv.pay': 'PIX ou transferência bancária\nChave PIX (CNPJ): 12.345.678/0001-90\nInforme o número da fatura no pagamento.', 'lf.iv.thanks': 'Obrigado pela preferência!',
    'lf.b2.name': 'Cartão de visita · frente e verso', 'lf.bt.name': 'Cartão de visita · serviços', 'lf.bt.org': 'Faísca Elétrica', 'lf.bt.what': 'Instalações · consertos · iluminação', 'lf.bt.free': 'Orçamento grátis · sem taxa de visita',
    'lf.lc.name': 'Papel timbrado · canto', 'lf.lc.date': '3 de maio de 2027', 'lf.lc.to': 'Sra. Joana Souza\nCafé Folha Verde\nPraça do Mercado, 4\n01234-567 São Paulo – SP',
    'lf.sl.name': 'Cartão de cumprimentos · canto', 'lf.sl.title': 'Com os nossos cumprimentos',
    'lf.tf.name': 'Folheto de 3 dobras · jardinagem', 'lf.tf.sayhead': 'O que dizem nossos clientes', 'lf.tf.quotes': 'Transformaram nosso jardim abandonado num lugar onde adoramos ficar. Simpáticos, caprichosos e sempre pontuais.|Margarida, São Paulo\nPreço justo e gente muito boa. Nosso gramado nunca esteve tão bonito!|Davi e Suzana, Campinas', 'lf.tf.contact': 'Fale com a gente', 'lf.tf.hours': 'Seg – Sáb · 8h – 18h', 'lf.tf.quote': 'Orçamento grátis', 'lf.tf.quote2': 'Visitamos, ouvimos e passamos um preço claro. Sem compromisso.', 'lf.tf.org': 'Dedo Verde Jardinagem', 'lf.tf.tag': 'Jardins bonitos o ano todo',
    'lf.tf.serv': 'Nossos serviços', 'lf.tf.servlist': 'Corte e acabamento de grama\nPoda de cercas vivas e árvores\nCapina e canteiros\nPlantio e canteiros novos\nLimpeza de quintais e calçadas\nCercas e pequenos reparos\nRecolhimento de folhas\nRetirada de resíduos verdes',
    'lf.tf.prices': 'Preços', 'lf.tf.pricelist': 'Corte de grama|a partir de R$ 80\nPoda de cerca viva|a partir de R$ 120\nManutenção, meio período|R$ 250\nLimpeza de quintal|a partir de R$ 150\nManutenção mensal|a partir de R$ 300\nResíduos verdes, por carga|R$ 90', 'lf.tf.pricenote': 'Os preços dependem do tamanho do jardim. Aposentados têm 10% de desconto.',
    'lf.tf.about': 'Quem somos', 'lf.tf.abouttext': 'Somos uma pequena empresa familiar com quinze anos de experiência. Cuidamos de cada jardim como se fosse nosso.\nUsamos ferramentas modernas e silenciosas e reciclamos todos os resíduos verdes.', 'lf.tf.badges': 'Com seguro completo\n15 anos de experiência\nEmpresa familiar e local',
    'lf.gg.name': 'Cartaz de show', 'lf.gg.kicker': 'Ao vivo no Porão', 'lf.gg.title': 'The Night\nOwls', 'lf.gg.with': 'Com participação especial', 'lf.gg.acts': 'Paper Planes · Lucy Grey', 'lf.gg.date': 'Sexta, 12 de março', 'lf.gg.doors': 'Abertura 21h · Show 22h', 'lf.gg.place': 'Bar do Porão, Rua Direita, 9', 'lf.gg.tickets': 'Ingressos R$ 40 antecipado · R$ 50 na porta',
    'lf.ws.name': 'Panfleto de oficina', 'lf.ws.kicker': 'Oficina prática', 'lf.ws.title': 'Pão de fermentação natural', 'lf.ws.sub': 'Aprenda a fazer em casa um pão de fermentação natural crocante e saboroso, passo a passo, numa manhã gostosa.', 'lf.ws.do': 'O que você vai fazer', 'lf.ws.steps': 'Alimentar o fermento|Aprenda a manter seu fermento natural ativo e borbulhante.\nSovar e modelar|Prepare a massa, faça as dobras e modele um pão perfeito.\nAssar e provar|Asse em forno bem quente e saboreie com manteiga e geleia.', 'lf.ws.date': 'Sábado, 18 de outubro', 'lf.ws.time': '9h – 13h', 'lf.ws.place': 'Antiga Padaria, Rua do Moinho, 2', 'lf.ws.price': 'R$ 150', 'lf.ws.incl': 'Ingredientes, avental e seu próprio fermento para levar', 'lf.ws.places': 'Só 10 vagas!', 'lf.ws.book': 'Inscrições: {phone} · {email}',
    'lf.pt.name': 'Pet sitter com destacáveis', 'lf.pt.title': 'Passeio de cães e\ncuidado de pets', 'lf.pt.about': 'Oi, eu sou a Jéssica! Adoro animais e moro aqui pertinho. Vou cuidar do seu pet como se fosse meu.', 'lf.pt.points': 'Passeios de 30 ou 60 minutos\nComida e carinho quando você viajar\nCom seguro e referências\nFotos no seu celular', 'lf.pt.price': 'A partir de\nR$ 30 o passeio', 'lf.pt.short': 'Jéssica · pet sitter', 'lf.pt.area': 'Centro e bairros vizinhos · também à noite e nos fins de semana',
    'lf.oh.name': 'Casa aberta para visitas', 'lf.oh.title': 'Visita aberta', 'lf.oh.when': 'Domingo, 14 de junho\n14h – 16h', 'lf.oh.price': 'R$ 850.000', 'lf.oh.f1': '4 quartos', 'lf.oh.f2': 'Sala ampla', 'lf.oh.f3': 'Quintal com jardim', 'lf.oh.f4': 'Garagem', 'lf.oh.body': 'Uma casa de família clara e espaçosa numa rua tranquila, pertinho de escolas, comércio e do parque. Venha conhecer, não precisa agendar.',
    'lf.sq.name': 'Post para redes · novidades', 'lf.sq.tag': 'Chegou!', 'lf.sq.title': 'Nossa coleção de primavera chegou', 'lf.sq.sub': 'Venha experimentar ou compre on-line.', 'lf.sq.handle': '@sualoja · {web}',
    'lf.se.name': 'Post para redes · evento', 'lf.se.kicker': 'Venha com a gente', 'lf.se.title': 'Noite de degustação de vinhos', 'lf.se.dow': 'Sexta', 'lf.se.day': '17', 'lf.se.mon': 'Outubro', 'lf.se.time': '19h – 22h', 'lf.se.what': 'Seis vinhos de pequenas vinícolas da região, com queijos e pães. R$ 90 por pessoa.', 'lf.se.book': 'Reserve já: só 30 lugares', 'lf.se.place': 'Adega da Esquina, Rua da Ponte, 3',
  },
  it: {
    'lf.made': 'Fatto con amore',
    'lf.ad.name': 'Festa di compleanno · adulti', 'lf.ad.kicker': 'Festeggiamo insieme', 'lf.ad.num': '30', 'lf.ad.title': 'La festa di Luca', 'lf.ad.date': 'Sabato 14 giugno', 'lf.ad.time': 'Dalle 21 fino a tardi', 'lf.ad.place': 'Loft Bar, Via del Mercato 21', 'lf.ad.body': 'Drink, musica e balli. Porta i tuoi passi migliori!', 'lf.ad.rsvp': 'Conferma a Sara entro il 1° giugno · 06 1234 5678',
    'lf.sp.name': 'Festa a sorpresa', 'lf.sp.shh': 'Sst…', 'lf.sp.secret': 'È una sorpresa!', 'lf.sp.kicker': 'Sei invitato a una', 'lf.sp.title': 'Festa a sorpresa', 'lf.sp.for': 'per i 40 anni di Anna', 'lf.sp.date': 'Venerdì 20 giugno', 'lf.sp.time': 'Arriva entro le 20:30', 'lf.sp.place': 'Trattoria da Rosa, Viale del Parco 5', 'lf.sp.note': 'Anna crede che andiamo solo a cena: mi raccomando, acqua in bocca!', 'lf.sp.rsvp': 'Conferma a Marco · 06 1234 5678',
    'lf.ks.name': 'Festa per bambini · spazio', 'lf.ks.age': '5', 'lf.ks.kicker': '3, 2, 1…\nSi parte!', 'lf.ks.title': 'La festa spaziale di Leo', 'lf.ks.sub': 'Leo compie 5 anni!', 'lf.ks.date': 'Domenica 8 giugno', 'lf.ks.time': '16:00 – 19:00', 'lf.ks.place': 'Ludoteca Stelline', 'lf.ks.note': 'Vieni vestito da astronauta!', 'lf.ks.rsvp': 'Conferma a Emma · 06 1234 5678',
    'lf.cb.name': 'Biglietto piegato · compleanno', 'lf.cb.title': 'Buon\ncompleanno', 'lf.cb.quote': '«Conta gli anni dagli amici, non dalle candeline.»', 'lf.cb.dear': 'Cara Sofia,', 'lf.cb.wish': 'ti auguro un anno pieno di risate, avventure e tanta torta. Passa una giornata meravigliosa, te la meriti!', 'lf.cb.love': 'Con affetto,', 'lf.cb.from': 'Tommaso',
    'lf.cg.name': 'Biglietto piegato · congratulazioni', 'lf.cg.title': 'Congratulazioni', 'lf.cg.sub': 'per la splendida notizia', 'lf.cg.happy': 'Che gioia per voi!', 'lf.cg.wish': 'Vi auguriamo tanta felicità per questo nuovo, emozionante capitolo. Nessuno se lo merita più di voi.', 'lf.cg.love': 'Con affetto,', 'lf.cg.from': 'Anna e Marco',
    'lf.bb.name': 'Annuncio di nascita', 'lf.bb.hello': 'Ciao, mondo!', 'lf.bb.baby': 'Mia\nRosa', 'lf.bb.born': 'Nata il 3 marzo 2027', 'lf.bb.facts': 'Ore 7:42 · 3,2 kg · 50 cm', 'lf.bb.parents': 'Con amore, Anna e Marco e il fratellone Leo',
    'lf.fr.name': 'Raduno di famiglia', 'lf.fr.kicker': 'Sei invitato al', 'lf.fr.title': 'Raduno della famiglia Rossi', 'lf.fr.sub': 'Tre generazioni, un grande picnic!', 'lf.fr.day': 'Il programma', 'lf.fr.plan': '12:30|Benvenuto e pranzo\n15:00|Giochi per tutte le età\n16:30|Grande foto di famiglia\n18:00|Grigliata\n20:00|Musica e racconti', 'lf.fr.date': 'Domenica 3 agosto', 'lf.fr.time': 'Dalle 12:30', 'lf.fr.place': 'Parco delle Querce, area picnic', 'lf.fr.bring': 'Porta con te', 'lf.fr.items': 'Un piatto da condividere\nVecchie foto di famiglia\nUna sedia o una coperta', 'lf.fr.rsvp': 'Fai sapere a zia Maria se vieni: 06 1234 5678',
    'lf.rc.name': 'Scheda ricetta', 'lf.rc.kicker': 'Dalla cucina della nonna', 'lf.rc.title': 'Crumble di mele', 'lf.rc.serves': 'Per 6 persone', 'lf.rc.prep': 'Preparazione 20 min', 'lf.rc.bake': 'Cottura 40 min', 'lf.rc.ing': 'Ingredienti', 'lf.rc.ings': '6 mele sbucciate e a fette\n2 cucchiai di zucchero\n1 cucchiaino di cannella\n150 g di farina 00\n100 g di burro freddo\n75 g di zucchero di canna\n50 g di fiocchi d’avena\nUn pizzico di sale', 'lf.rc.method': 'Procedimento', 'lf.rc.steps': 'Accendi il forno a 180 °C.\nMetti le mele in una pirofila con lo zucchero e la cannella.\nSbriciola con le dita farina, sale e burro. Aggiungi lo zucchero di canna e l’avena.\nCospargi sulle mele e cuoci per 40 minuti, finché è dorato.\nServi tiepido con crema o gelato.', 'lf.rc.tip': 'Consiglio: in autunno aggiungi una manciata di more.',
    'lf.hw.name': 'Festa per la casa nuova', 'lf.hw.kicker': 'Abbiamo traslocato!', 'lf.hw.title': 'Festa per la casa nuova', 'lf.hw.body': 'Vieni a vedere la nostra nuova casa, a brindare con noi e a riempirla di amici.', 'lf.hw.date': 'Sabato 21 giugno', 'lf.hw.time': 'Dalle 17', 'lf.hw.addr': 'Viale delle Rose 8, Roma', 'lf.hw.foot': 'Non portare niente, solo te stesso! · Elena e Sam',
    'lf.an.name': 'Anniversario di matrimonio', 'lf.an.num': '50', 'lf.an.kicker': 'Cinquant’anni insieme', 'lf.an.title': 'Nozze d’Oro', 'lf.an.names': 'Elena e Giorgio', 'lf.an.years': '1977 – 2027', 'lf.an.body': 'Festeggia con noi a un rinfresco in loro onore', 'lf.an.date': 'Domenica 12 settembre', 'lf.an.time': 'alle 16', 'lf.an.place': 'Grand Hotel, Viale della Stazione 4', 'lf.an.rsvp': 'Si prega di confermare a Chiara entro il 1° settembre',
    'lf.wm.name': 'Partecipazione di nozze · arco', 'lf.wm.kicker': 'Insieme alle loro famiglie', 'lf.wm.names': 'Giulia\n&\nMarco', 'lf.wm.invite': 'sono felici di invitarvi al loro matrimonio', 'lf.wm.day': 'Sabato', 'lf.wm.num': '19', 'lf.wm.month': 'Giugno 2027', 'lf.wm.time': 'alle ore sedici', 'lf.wm.place': 'Tenuta Il Mulino\nStrada del Fiume, Frascati', 'lf.wm.after': 'Seguiranno cena e festa', 'lf.wm.rsvp': 'Si prega di confermare entro il 1° maggio\ngiulia.marco@example.com',
    'lf.sd.name': 'Save the date · calendario', 'lf.sd.title': 'Save the Date', 'lf.sd.names': 'Giulia e Marco', 'lf.sd.month': 'Giugno 2027', 'lf.sd.days': 'L M M G V S D', 'lf.sd.follow': 'Seguirà partecipazione', 'lf.sd.place': 'Tenuta Il Mulino · Frascati',
    'lf.rv.name': 'Cartoncino di risposta per le nozze', 'lf.rv.title': 'Conferma', 'lf.rv.by': 'Si prega di rispondere entro il 1° maggio 2027', 'lf.rv.names': 'Nome/i', 'lf.rv.yes': 'Parteciperò con gioia', 'lf.rv.no': 'Purtroppo non potrò esserci', 'lf.rv.count': 'Numero di ospiti', 'lf.rv.diet': 'Allergie o intolleranze', 'lf.rv.meal': 'Secondo piatto', 'lf.rv.meals': 'Carne\nPesce\nVegetariano', 'lf.rv.foot': 'Non vediamo l’ora di festeggiare con te!',
    'lf.pg.name': 'Programma del matrimonio', 'lf.pg.title': 'Il nostro matrimonio', 'lf.pg.sub': 'Giulia e Marco · 19 giugno 2027', 'lf.pg.items': '16:00|Cerimonia|In giardino, vicino al fiume\n17:00|Aperitivo e foto|Giochi sul prato\n19:30|Cena|Nella sala del Mulino\n22:00|Discorsi e torta\n22:30|Primo ballo|E la festa comincia!\n01:30|Saluti|Grazie di essere venuti', 'lf.pg.foot': 'Condividi le tue foto: #GiuliaEMarco',
    'lf.wl.name': 'Cartello di benvenuto per le nozze', 'lf.wl.title': 'Benvenuti', 'lf.wl.to': 'al matrimonio di', 'lf.wl.names': 'Giulia\n& Marco', 'lf.wl.date': '19 giugno 2027', 'lf.wl.note': 'Siamo felici che siate qui a condividere questo giorno',
    'lf.ts.name': 'Lavagna · piatti del giorno', 'lf.ts.title': 'Piatti del giorno', 'lf.ts.when': 'Dalle 12:30 fino a esaurimento', 'lf.ts.s1': 'Zuppa', 'lf.ts.l1': 'Pappa al pomodoro|€ 7,00|Con basilico e olio nuovo', 'lf.ts.s2': 'Secondi', 'lf.ts.l2': 'Frittura di paranza|€ 15,00|Con insalata e limone\nPollo al forno|€ 12,00|Con patate al rosmarino\nRisotto ai funghi|€ 11,50|Parmigiano e olio al tartufo', 'lf.ts.s3': 'Dolce', 'lf.ts.l3': 'Tiramisù della casa|€ 6,00|Con caffè espresso', 'lf.ts.foot': 'Chiedeteci dei piatti vegetariani e senza glutine',
    'lf.tk.name': 'Menù da asporto', 'lf.tk.org': 'Casa dei Noodles', 'lf.tk.sub': 'Cucina asiatica fresca · asporto e consegna', 'lf.tk.call': 'Ordina ora: {phone}',
    'lf.tk.s1': 'Antipasti', 'lf.tk.l1': 'Involtini primavera (4)|4,50\nSatay di pollo|5,90\nNuvole di gamberi|2,50\nRavioli di verdure (6)|5,50\nZuppa di miso|3,50',
    'lf.tk.s2': 'Noodles', 'lf.tk.l2': 'Pad thai|10,50|Noodles di riso, uovo, arachidi\nChow mein di pollo|9,90|Noodles all’uovo e verdure\nRamen piccante di manzo|12,50|Brodo ricco, uovo, peperoncino\nUdon con tofu|9,50|Noodles spessi, verdure, zenzero',
    'lf.tk.s3': 'Riso e curry', 'lf.tk.l3': 'Curry verde thai|11,50|Pollo o tofu, riso jasmine\nCurry katsu|11,90|Pollo croccante, salsa delicata\nRiso alla cantonese|5,50|Con piselli e cipollotto\nPollo in agrodolce|10,50|Ananas e peperoni',
    'lf.tk.s4': 'Contorni e bevande', 'lf.tk.l4': 'Riso bianco|3,00\nToast di gamberi|4,90\nEdamame|3,90\nBibita in lattina|1,80\nTè al gelsomino|2,50',
    'lf.tk.deliver': 'Consegna gratis sopra i 20 €', 'lf.tk.hours': 'Mar – Dom · 18:30 – 23:00',
    'lf.ck.name': 'Lista dei cocktail', 'lf.ck.title': 'Ora dell’aperitivo', 'lf.ck.sub': 'Shakerati, mescolati e preparati con amore',
    'lf.ck.s1': 'Cocktail', 'lf.ck.l1': 'Spritz|7,00|Aperol, prosecco e soda\nNegroni|9,00|Gin, vermouth rosso e bitter\nEspresso martini|9,00|Vodka, liquore al caffè, espresso\nMojito|8,50|Rum bianco, lime, menta e soda\nMargarita|8,50|Tequila, lime e liquore all’arancia',
    'lf.ck.s2': 'Analcolici', 'lf.ck.l2': 'Virgin mojito|5,50|Lime, menta, mela e soda\nTropical|5,50|Mango, ananas e zenzero',
    'lf.ck.happy': 'Happy hour 18 – 20 · due cocktail a 14 €',
    'lf.cp.name': 'Foglio di buoni sconto', 'lf.cp.head': 'Ritaglia e porta con te', 'lf.cp.offers': '20% di sconto|Su tutto il negozio\nCaffè omaggio|Con una fetta di torta o una brioche\nPrendi 2, paghi 1|Sui panini, ogni lunedì\n5 € di sconto|Con una spesa di almeno 30 €\nConsegna gratis|Sul tuo prossimo ordine\nCompleanno|Un cupcake in regalo per il tuo compleanno', 'lf.cp.valid': 'Valido fino al 31 maggio 2027. Un buono per cliente.',
    'lf.gc.name': 'Buono regalo', 'lf.gc.title': 'Buono regalo', 'lf.gc.entitles': 'Questo buono dà diritto a', 'lf.gc.what': 'un massaggio rilassante total body (60 minuti)', 'lf.gc.value': '60 €', 'lf.gc.from': 'Da parte di', 'lf.gc.valid': 'Valido fino al', 'lf.gc.book': 'Prenota al {phone}. Ricordati di portare questo buono.',
    'lf.go.name': 'Manifesto di inaugurazione', 'lf.go.kicker': 'Sei invitato', 'lf.go.title': 'Grande\ninaugurazione', 'lf.go.when': 'Sabato 5 giugno · ore 10', 'lf.go.offers': 'Caffè e torta gratis per i primi 100 visitatori\n10% di sconto su tutto per l’intero weekend\nPalloncini e trucca-bimbi per i più piccoli',
    'lf.pc.name': 'Cartolina · trasloco', 'lf.pc.title': 'Ci siamo trasferiti!', 'lf.pc.sub': 'Vieni a trovarci nel nuovo negozio dal 1° giugno', 'lf.pc.msg': 'Gentile cliente,\ndopo dieci anni felici in Vicolo del Mulino ci siamo trasferiti in un negozio più grande e luminoso: {addr}.\nVieni a salutarci: il primo caffè lo offriamo noi!\nA presto,\nTutto lo staff', 'lf.pc.stamp': 'Francobollo',
    'lf.iv.name': 'Fattura', 'lf.iv.title': 'Fattura', 'lf.iv.no': 'Fattura n.', 'lf.iv.date': 'Data', 'lf.iv.dateV': '3 maggio 2027', 'lf.iv.due': 'Scadenza', 'lf.iv.dueV': '17 maggio 2027', 'lf.iv.to': 'Destinatario', 'lf.iv.client': 'Caffè Foglia Verde\nAnna Fischer\nPiazza del Mercato 4, Roma', 'lf.iv.desc': 'Descrizione', 'lf.iv.qty': 'Q.tà', 'lf.iv.price': 'Prezzo unit.', 'lf.iv.amount': 'Importo', 'lf.iv.items': 'Realizzazione del sito web\nLogo e biglietti da visita\nFoto dei prodotti, mezza giornata\nStampa di 500 volantini\nHosting del sito, al mese', 'lf.iv.sub': 'Imponibile', 'lf.iv.rate': '22', 'lf.iv.tax': 'IVA 22%', 'lf.iv.total': 'Totale', 'lf.iv.payhead': 'Pagamento', 'lf.iv.pay': 'Bonifico sul seguente conto\nIBAN: IT60 X054 2811 1010 0000 0123 456\nIndica il numero di fattura nella causale.', 'lf.iv.thanks': 'Grazie per averci scelto!',
    'lf.b2.name': 'Biglietto da visita · fronte e retro', 'lf.bt.name': 'Biglietto da visita · artigiani', 'lf.bt.org': 'Scintilla Impianti', 'lf.bt.what': 'Impianti elettrici · riparazioni · luci', 'lf.bt.free': 'Preventivi gratuiti · nessun costo di uscita',
    'lf.lc.name': 'Carta intestata · angolo', 'lf.lc.date': '3 maggio 2027', 'lf.lc.to': 'Gentile Sig.ra Giovanna Bianchi\nCaffè Foglia Verde\nPiazza del Mercato 4\n00100 Roma',
    'lf.sl.name': 'Biglietto di cortesia · angolo', 'lf.sl.title': 'Con i nostri complimenti',
    'lf.tf.name': 'Pieghevole a 3 ante · giardinaggio', 'lf.tf.sayhead': 'Cosa dicono i nostri clienti', 'lf.tf.quotes': 'Hanno trasformato il nostro giardino incolto in un posto dove amiamo stare. Gentili, ordinati e sempre puntuali.|Margherita, Roma\nPrezzi onesti e persone splendide. Il nostro prato non è mai stato così bello!|Davide e Susanna, Frascati', 'lf.tf.contact': 'Contatti', 'lf.tf.hours': 'Lun – Sab · 8:00 – 18:00', 'lf.tf.quote': 'Preventivo gratuito', 'lf.tf.quote2': 'Veniamo da te, ascoltiamo e ti diamo un prezzo chiaro. Senza impegno.', 'lf.tf.org': 'Pollice Verde Giardini', 'lf.tf.tag': 'Giardini belli tutto l’anno',
    'lf.tf.serv': 'I nostri servizi', 'lf.tf.servlist': 'Taglio e rifinitura del prato\nPotatura di siepi e alberi\nDiserbo e aiuole\nPiantumazioni e nuove aiuole\nPulizia di terrazze e vialetti\nRecinzioni e piccole riparazioni\nRaccolta delle foglie\nSmaltimento del verde',
    'lf.tf.prices': 'Prezzi', 'lf.tf.pricelist': 'Taglio del prato|da 25 €\nPotatura siepi|da 40 €\nCura del giardino, mezza giornata|90 €\nPulizia terrazza|da 60 €\nManutenzione mensile|da 80 €\nSmaltimento verde, a carico|30 €', 'lf.tf.pricenote': 'I prezzi dipendono dalle dimensioni del giardino. Sconto del 10% per i pensionati.',
    'lf.tf.about': 'Chi siamo', 'lf.tf.abouttext': 'Siamo una piccola azienda di famiglia con quindici anni di esperienza. Curiamo ogni giardino come se fosse il nostro.\nUsiamo attrezzi moderni e silenziosi e ricicliamo tutti gli scarti verdi.', 'lf.tf.badges': 'Completamente assicurati\n15 anni di esperienza\nAzienda familiare del territorio',
    'lf.gg.name': 'Locandina di concerto', 'lf.gg.kicker': 'Dal vivo alla Cantina', 'lf.gg.title': 'The Night\nOwls', 'lf.gg.with': 'Con ospiti speciali', 'lf.gg.acts': 'Paper Planes · Lucy Grey', 'lf.gg.date': 'Venerdì 12 marzo', 'lf.gg.doors': 'Apertura 21:00 · Concerto 22:00', 'lf.gg.place': 'La Cantina, Via Roma 9', 'lf.gg.tickets': 'Biglietti 12 € in prevendita · 15 € alla porta',
    'lf.ws.name': 'Volantino di laboratorio', 'lf.ws.kicker': 'Laboratorio pratico', 'lf.ws.title': 'Pane con lievito madre', 'lf.ws.sub': 'Impara a fare a casa un pane con lievito madre croccante e saporito, passo dopo passo, in una mattinata in compagnia.', 'lf.ws.do': 'Cosa farai', 'lf.ws.steps': 'Rinfrescare il lievito|Impara a tenere il tuo lievito madre vivo e attivo.\nImpastare e formare|Prepara l’impasto, fai le pieghe e forma una bella pagnotta.\nCuocere e assaggiare|Cuoci in forno ben caldo e gustalo con burro e marmellata.', 'lf.ws.date': 'Sabato 18 ottobre', 'lf.ws.time': '9:00 – 13:00', 'lf.ws.place': 'Il Vecchio Forno, Vicolo del Mulino 2', 'lf.ws.price': '45 €', 'lf.ws.incl': 'Ingredienti, grembiule e il tuo lievito madre da portare a casa', 'lf.ws.places': 'Solo 10 posti!', 'lf.ws.book': 'Prenotazioni: {phone} · {email}',
    'lf.pt.name': 'Pet sitter con linguette', 'lf.pt.title': 'Passeggiate per cani\n& pet sitting', 'lf.pt.about': 'Ciao, sono Jessica! Adoro gli animali e abito qui vicino. Mi prenderò cura dei tuoi amici a quattro zampe come se fossero miei.', 'lf.pt.points': 'Passeggiate da 30 o 60 minuti\nPappa e coccole quando sei via\nAssicurata, con referenze\nFoto aggiornate sul telefono', 'lf.pt.price': 'Da 10 €\na passeggiata', 'lf.pt.short': 'Jessica · pet sitter', 'lf.pt.area': 'Roma centro e dintorni · anche la sera e nel weekend',
    'lf.oh.name': 'Casa aperta', 'lf.oh.title': 'Open house', 'lf.oh.when': 'Domenica 14 giugno\n15:00 – 17:00', 'lf.oh.price': '385.000 €', 'lf.oh.f1': '4 camere', 'lf.oh.f2': 'Ampio soggiorno', 'lf.oh.f3': 'Giardino a sud', 'lf.oh.f4': 'Box auto', 'lf.oh.body': 'Una casa di famiglia luminosa e spaziosa in una via tranquilla, a pochi passi da scuole, negozi e parco. Vieni a vederla, senza appuntamento.',
    'lf.sq.name': 'Post social · novità', 'lf.sq.tag': 'Novità!', 'lf.sq.title': 'È arrivata la collezione primavera', 'lf.sq.sub': 'Vieni a provarla in negozio o acquista online.', 'lf.sq.handle': '@iltuonegozio · {web}',
    'lf.se.name': 'Post social · evento', 'lf.se.kicker': 'Ti aspettiamo', 'lf.se.title': 'Serata di degustazione', 'lf.se.dow': 'Venerdì', 'lf.se.day': '17', 'lf.se.mon': 'Ottobre', 'lf.se.time': '19:00 – 22:00', 'lf.se.what': 'Sei vini di piccole cantine del territorio, con formaggi e pane. 25 € a persona.', 'lf.se.book': 'Prenota subito: solo 30 posti', 'lf.se.place': 'Enoteca all’Angolo, Via del Ponte 3',
  },
};
