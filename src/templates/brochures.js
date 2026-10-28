// Brochures (tri-fold and bi-fold, outside and inside pages) and price lists.
import { infoRows } from './common.js';

// a brochure panel: heading, text, optional icon list
function panel(k, x, y, w, head, body, o = {}) {
  if (o.icon) k.art(o.icon, x, y, 12, 12, { color: o.iconColor ?? 'primary' });
  const hx = o.icon ? x + 15 : x;
  k.text(hx, y, w - (hx - x), 13, head, { size: o.headSize ?? 17, font: 'heading', bold: true, color: o.headColor ?? 'primary', valign: 'middle' });
  k.text(x, y + 16, w, o.h ?? 50, body, { size: o.size ?? 10.5, lh: 1.35, color: o.color ?? 'dark', after: 4 });
}

export const brochures = [
  {
    id: 'bro-business', cat: 'brochures', name: 'brob.name', scheme: 'ocean', fonts: 'modern', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, p = W / 3, m = 10;
      // outside: inside flap | back | front cover
      k.photo(m, m, p - 2 * m, 60);
      panel(k, m, 76, p - 2 * m, s('brob.about'), s('brob.abouttext'), { h: 60 });
      k.rect(p, 0, p, H, { fill: 'light' });
      k.text(p + m, 20, p - 2 * m, 12, s('brob.contact'), { size: 18, font: 'heading', bold: true, color: 'primary', align: 'center' });
      infoRows(k, p + m + 4, 38, p - 2 * m - 4, [['i:map-pin', s('common.address'), 'address'], ['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web'], ['i:clock', s('brob.hours')]], { size: 11, gap: 11, icon: 5 });
      k.photo(p + m, 104, p - 2 * m, 60);
      k.rect(2 * p, 0, p, H, { fill: 'primary' });
      k.logo(2 * p + p / 2 - 14, 24, 28, 28, { art: 'i:building', color: 'light' });
      k.text(2 * p + m, 58, p - 2 * m, 36, s('common.org'), { size: 28, font: 'heading', bold: true, color: 'light', align: 'center', lh: 1, field: 'org' });
      k.text(2 * p + m, 96, p - 2 * m, 16, s('common.tagline'), { size: 12, color: 'light', align: 'center', field: 'tagline' });
      k.photo(2 * p + m, 118, p - 2 * m, H - 128);
      // inside: three panels
      k.page('paper-landscape');
      k.rect(0, 0, W, 8, { fill: 'primary' });
      const items = [['i:star', 'brob.s1', 'brob.t1'], ['i:heart', 'brob.s2', 'brob.t2'], ['i:check', 'brob.s3', 'brob.t3']];
      items.forEach(([ic, h, t], i) => {
        const x = i * p + m;
        k.photo(x, 16, p - 2 * m, 54);
        panel(k, x, 76, p - 2 * m, s(h), `${s(t)}\n${s('brob.more')}`, { icon: ic, h: 90 });
      });
    },
  },
  {
    id: 'bro-camp', cat: 'brochures', name: 'camp.name', scheme: 'sunshine', fonts: 'friendly', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, p = W / 3, m = 10;
      k.rect(0, 0, W, H, { fill: 'light' });
      panel(k, m, 14, p - 2 * m, s('camp.day'), s('camp.daylist'), { h: 100, icon: 'i:clock' });
      k.art('soccer-ball', m, H - 40, 26, 26); k.art('artist-palette', m + 30, H - 40, 26, 26); k.art('person-swimming', m + 60, H - 40, 26, 26);
      k.rect(p, 0, p, H, { fill: 'secondary', opacity: 0.35 });
      k.text(p + m, 16, p - 2 * m, 12, s('camp.book'), { size: 18, font: 'heading', color: 'primary', bold: true, align: 'center' });
      k.text(p + m, 32, p - 2 * m, 30, s('camp.price'), { size: 12, align: 'center', lh: 1.35 });
      infoRows(k, p + m, 70, p - 2 * m, [['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:map-pin', s('common.address'), 'address']], { size: 10.5, gap: 10, icon: 5 });
      k.art('camping', p + p / 2 - 22, 112, 44, 44);
      k.photo(2 * p + m, H * 0.6, p - 2 * m, H * 0.4 - m);
      k.art('sun-with-face', 2 * p + p / 2 - 22, 16, 44, 44);
      k.text(2 * p + m, 64, p - 2 * m, 40, s('camp.title'), { size: 34, font: 'heading', color: 'primary', align: 'center', bold: true, lh: 1 });
      k.text(2 * p + m, 106, p - 2 * m, 10, s('camp.ages'), { size: 13, align: 'center', bold: true, color: 'accent' });
      k.page('paper-landscape');
      k.rect(0, 0, W, H, { fill: 'light' });
      const acts = [['soccer-ball', 'camp.a1', 'camp.t1'], ['artist-palette', 'camp.a2', 'camp.t2'], ['person-swimming', 'camp.a3', 'camp.t3']];
      acts.forEach(([pic, h, t], i) => {
        const x = i * p + m;
        k.circle(x + (p - 2 * m) / 2, 40, 28, { fill: ['primary', 'secondary', 'accent'][i], opacity: 0.3 });
        k.art(pic, x + (p - 2 * m) / 2 - 20, 20, 40, 40);
        k.text(x, 74, p - 2 * m, 14, s(h), { size: 20, font: 'heading', bold: true, color: 'primary', align: 'center' });
        k.text(x, 92, p - 2 * m, 60, s(t), { size: 11, align: 'center', lh: 1.35 });
        k.photo(x, 150, p - 2 * m, H - 160);
      });
    },
  },
  {
    id: 'bro-parish', cat: 'brochures', name: 'bropar.name', scheme: 'navy', fonts: 'traditional', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, h = W / 2, m = 14;
      // outside: back | front
      panel(k, m, 20, h - 2 * m, s('bropar.find'), s('bropar.findtext'), { h: 30, icon: 'i:map-pin' });
      k.photo(m, 66, h - 2 * m, 70);
      infoRows(k, m, 146, h - 2 * m, [['i:phone', s('common.phone'), 'phone'], ['i:mail', s('common.email'), 'email'], ['i:world', s('common.web'), 'web']], { size: 11, gap: 10 });
      k.rect(h, 0, h, H, { fill: 'primary' });
      k.art('church', h + h / 2 - 22, 26, 44, 44);
      k.text(h + m, 76, h - 2 * m, 40, s('bropar.title'), { size: 36, font: 'heading', color: 'light', align: 'center', lh: 1, bold: true });
      k.line(h + h / 2 - 20, 122, h + h / 2 + 20, 122, { color: 'secondary', width: 1 });
      k.text(h + m, 128, h - 2 * m, 30, s('bropar.sub'), { size: 13, color: 'light', align: 'center', italic: true, lh: 1.3 });
      k.page('paper-landscape');
      k.photo(m, m, h - 2 * m, 74);
      panel(k, m, 96, h - 2 * m, s('bropar.h1'), `${s('bropar.t1')}\n${s('bropar.t2')}`, { h: 90 });
      k.rect(h + m, m, h - 2 * m, H - 2 * m, { fill: 'light', r: 3 });
      k.text(h + m + 6, m + 6, h - 2 * m - 12, 12, s('parish.times'), { size: 18, font: 'heading', color: 'primary', bold: true, align: 'center' });
      k.text(h + m + 6, m + 24, h - 2 * m - 12, 70, s('parish.timelist').split('\n').map((l) => { const [a, b] = l.split('|'); return { runs: [{ t: a, bold: true }, { t: b ? ` ${b}` : '' }], after: 6, align: 'center' }; }), { size: 12.5, lh: 1.3 });
      panel(k, h + m + 6, m + 96, h - 2 * m - 12, s('bropar.h2'), s('bropar.t3'), { h: 60 });
    },
  },
  {
    id: 'bro-restaurant', cat: 'brochures', name: 'brorest.name', scheme: 'earth', fonts: 'slab', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k, h = W / 2, m = 14;
      k.rect(0, 0, h, H, { fill: 'light' });
      panel(k, m, 20, h - 2 * m, s('brorest.find'), s('brorest.hours'), { h: 40, icon: 'i:clock' });
      infoRows(k, m, 76, h - 2 * m, [['i:map-pin', s('common.address'), 'address'], ['i:phone', s('common.phone'), 'phone'], ['i:world', s('common.web'), 'web']], { size: 11.5, gap: 11 });
      k.photo(m, 120, h - 2 * m, H - 134);
      k.photo(h, 0, h, H);
      k.rect(h + 18, H / 2 - 36, h - 36, 72, { fill: 'dark', opacity: 0.85 });
      k.text(h + 22, H / 2 - 30, h - 44, 40, s('common.org'), { size: 34, font: 'heading', color: 'light', align: 'center', bold: true, valign: 'middle', field: 'org' });
      k.text(h + 22, H / 2 + 12, h - 44, 18, s('brorest.sub'), { size: 13, color: 'secondary', align: 'center', italic: true });
      k.page('paper-landscape');
      panel(k, m, 18, h - 2 * m, s('brorest.story'), `${s('brorest.storytext')}\n${s('brorest.storytext2')}`, { h: 70, headSize: 22 });
      k.photo(m, 108, h - 2 * m, H - 122);
      k.rect(h, 0, h, H, { fill: 'light' });
      k.text(h + m, 18, h - 2 * m, 14, s('brorest.fav'), { size: 22, font: 'heading', color: 'primary', bold: true });
      s('rest.l2').split('\n').forEach((l, i) => {
        const [name, price, desc] = l.split('|'), y = 40 + i * 24;
        k.text(h + m, y, h - 2 * m - 22, 8, name, { size: 13, bold: true });
        k.text(h + h - m - 22, y, 22, 8, price, { size: 13, bold: true, color: 'primary', align: 'right' });
        k.text(h + m, y + 8, h - 2 * m, 12, desc || '', { size: 10.5, italic: true });
      });
    },
  },
  {
    id: 'price-salon', cat: 'brochures', name: 'salon.name', scheme: 'lavender', fonts: 'elegant',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.art('i:scissors', W / 2 - 8, 14, 16, 16, { color: 'primary' });
      k.text(14, 30, W - 28, 30, s('common.org'), { size: 46, font: 'heading', align: 'center', color: 'primary', field: 'org' });
      k.text(14, 60, W - 28, 8, s('salon.sub'), { size: 12, align: 'center', caps: true, tracking: 4 });
      const sect = (y, title, lines) => {
        k.text(30, y, W - 60, 14, title, { size: 28, font: 'heading', color: 'primary', align: 'center' });
        lines.split('\n').forEach((l, i) => {
          const [a, b] = l.split('|'), yy = y + 17 + i * 12;
          k.text(36, yy, W - 100, 9, a, { size: 15 });
          k.line(36, yy + 8, W - 36, yy + 8, { color: 'secondary', width: 0.4, dash: [1, 2] });
          k.text(W - 64, yy, 28, 9, b, { size: 15, bold: true, align: 'right' });
        });
        return y + 22 + lines.split('\n').length * 12;
      };
      let y = sect(78, s('salon.s1'), s('salon.l1'));
      y = sect(y + 2, s('salon.s2'), s('salon.l2'));
      sect(y + 2, s('salon.s3'), s('salon.l3'));
      k.text(14, H - 26, W - 28, 16, `${s('common.phone')}  ·  ${s('common.address')}`, { size: 12, align: 'center', color: 'primary' });
    },
  },
  {
    id: 'price-services', cat: 'brochures', name: 'serv.name', scheme: 'mint', fonts: 'modern', size: [99, 210],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 60, { fill: 'primary' });
      k.art('broom', W / 2 - 14, 8, 28, 28);
      k.text(6, 38, W - 12, 16, s('serv.title'), { size: 22, font: 'heading', color: 'light', align: 'center', bold: true, field: 'org' });
      s('serv.list').split('\n').forEach((l, i) => {
        const [a, b] = l.split('|'), y = 68 + i * 14;
        k.rect(6, y, W - 12, 12, { fill: 'primary', opacity: i % 2 ? 0.06 : 0.14, r: 2 });
        k.text(9, y, W - 40, 12, a, { size: 10.5, valign: 'middle' });
        k.text(W - 34, y, 26, 12, b, { size: 11, bold: true, align: 'right', valign: 'middle', color: 'primary' });
      });
      k.rect(6, H - 46, W - 12, 38, { fill: 'accent', r: 3 });
      k.text(8, H - 44, W - 16, 34, [{ t: s('serv.call'), size: 12 }, { t: s('common.phone'), size: 20, bold: true }, { t: s('serv.free'), size: 9.5 }], { color: 'light', align: 'center', valign: 'middle' });
    },
  },
];

export const en = {
  'brob.name': 'Tri-fold brochure · business', 'brob.about': 'About us', 'brob.abouttext': 'Tell people who you are, what you do and why they can trust you. Two or three short paragraphs are plenty.', 'brob.contact': 'Get in touch', 'brob.hours': 'Mon – Fri 9 am – 5 pm', 'brob.s1': 'What we do', 'brob.t1': 'Describe your main service in a few friendly sentences.', 'brob.s2': 'Why choose us', 'brob.t2': 'Experience, care and fair prices. Say what makes you different.', 'brob.s3': 'How it works', 'brob.t3': 'Call us, we visit, you get a clear price, and we get to work.', 'brob.more': 'Add details, examples or a short quote from a happy customer here.',
  'camp.name': 'Tri-fold brochure · summer camp', 'camp.day': 'A day at camp', 'camp.daylist': '9.00  Welcome and games\n10.30  Sports\n12.30  Lunch\n13.30  Arts and crafts\n15.00  Swimming\n16.30  Home time', 'camp.book': 'Book a place', 'camp.price': '€120 per week, lunch included. Brothers and sisters get 10% off.', 'camp.title': 'Summer Fun Camp', 'camp.ages': 'Ages 6 to 12 · July and August', 'camp.a1': 'Sports', 'camp.t1': 'Football, races and team games every day, led by trained coaches.', 'camp.a2': 'Arts', 'camp.t2': 'Painting, crafts and music. Every child takes something home.', 'camp.a3': 'Swimming', 'camp.t3': 'Safe, fun sessions in the pool with qualified lifeguards.',
  'bropar.name': 'Bi-fold brochure · parish', 'bropar.find': 'How to find us', 'bropar.findtext': 'We are in the centre of the village, next to the school. There is parking behind the church.', 'bropar.title': 'Welcome to St Mary’s', 'bropar.sub': 'A friendly community where everyone belongs', 'bropar.h1': 'Who we are', 'bropar.t1': 'We are a parish family of all ages. Whether you are new to the area or coming back to church, you are very welcome.', 'bropar.t2': 'There is something for everyone: children’s groups, a choir, a youth club and a lunch club for older people.', 'bropar.h2': 'Get involved', 'bropar.t3': 'Join the choir, help with flowers, or come to our coffee morning. Ask anyone after the service!',
  'brorest.name': 'Bi-fold brochure · restaurant', 'brorest.find': 'Opening times', 'brorest.hours': 'Tuesday – Sunday\nLunch 12 – 3 pm · Dinner 7 – 11 pm\nClosed on Mondays', 'brorest.sub': 'Home cooking since 1985', 'brorest.story': 'Our story', 'brorest.storytext': 'It all started in grandmother’s kitchen. Today the third generation of our family cooks the same recipes with the best local ingredients.', 'brorest.storytext2': 'Come for a quick lunch or a long dinner with friends. We will make you feel at home.', 'brorest.fav': 'Our favourites',
  'salon.name': 'Price list · salon', 'salon.sub': 'Hair & beauty', 'salon.s1': 'Women', 'salon.l1': 'Cut and blow-dry|€35\nColour|€55\nHighlights|€70\nUpdo|€40', 'salon.s2': 'Men', 'salon.l2': 'Cut|€18\nCut and beard|€25\nBeard trim|€10', 'salon.s3': 'Beauty', 'salon.l3': 'Manicure|€20\nPedicure|€28\nEyebrow shaping|€12',
  'serv.name': 'Price list · services (DL)', 'serv.title': 'Sparkle Cleaning', 'serv.list': 'Regular home clean, per hour|€18\nDeep clean, flat|€120\nDeep clean, house|€180\nEnd of tenancy|€220\nOven clean|€55\nWindows, inside and out|€45\nCarpet clean, per room|€30\nOffice cleaning|ask us', 'serv.call': 'Call for a free quote', 'serv.free': 'Insured · Own products · Same-week visits',
};
