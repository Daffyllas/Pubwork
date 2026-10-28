// Signs and labels. The label templates are exactly one label of a common sheet, so "Print → Labels"
// picks the right sheet by itself.

export const signs = [
  {
    id: 'sign-hours', cat: 'signs', name: 'hours.name', scheme: 'navy', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.logo(W / 2 - 16, 18, 32, 32, { art: 'i:clock', color: 'primary' });
      k.text(14, 56, W - 28, 16, s('common.org'), { size: 22, align: 'center', bold: true, color: 'primary', field: 'org' });
      k.text(14, 74, W - 28, 30, s('hours.title'), { size: 50, font: 'heading', align: 'center', bold: true, color: 'dark' });
      const days = s('hours.days').split('\n');
      days.forEach((l, i) => {
        const [d, t] = l.split('|'), y = 116 + i * 17;
        k.rect(24, y, W - 48, 14, { fill: i % 2 ? 'light' : 'primary', opacity: i % 2 ? 1 : 0.1, r: 2 });
        k.text(30, y, (W - 60) / 2, 14, d, { size: 19, valign: 'middle', bold: true });
        k.text(W / 2, y, (W - 60) / 2, 14, t, { size: 19, valign: 'middle', align: 'right', color: t === s('hours.closed') ? 'accent' : 'dark' });
      });
      k.text(14, H - 30, W - 28, 14, s('common.phone'), { size: 18, align: 'center', color: 'primary', bold: true, field: 'phone' });
    },
  },
  {
    id: 'label-price', cat: 'signs', name: 'ptag.name', scheme: 'coral', fonts: 'bold', size: [63.5, 38.1],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 9, { fill: 'primary' });
      k.text(3, 0, W - 6, 9, s('ptag.offer'), { size: 9, color: 'light', bold: true, valign: 'middle', caps: true, tracking: 1 });
      k.text(3, 11, W - 6, 8, s('ptag.product'), { size: 11, bold: true });
      k.text(3, 18.5, W - 6, 6, s('ptag.detail'), { size: 7.5 });
      k.text(3, 24, W - 6, 13, s('ptag.price'), { size: 26, font: 'heading', color: 'primary', align: 'right', valign: 'middle' });
    },
  },
  {
    id: 'label-badge', cat: 'signs', name: 'badge.name', scheme: 'ocean', fonts: 'friendly', size: [99.1, 67.7],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 22, { fill: 'primary' });
      k.text(4, 1, W - 8, 13, s('badge.hello'), { size: 22, font: 'heading', bold: true, color: 'light', align: 'center' });
      k.text(4, 13, W - 8, 8, s('badge.my'), { size: 10, color: 'light', align: 'center' });
      k.text(6, 26, W - 12, 26, s('badge.name2'), { size: 34, font: 'heading', align: 'center', valign: 'middle', color: 'dark' });
      k.rect(0, H - 8, W, 8, { fill: 'primary' });
    },
  },
  {
    id: 'label-address', cat: 'signs', name: 'addr.name', scheme: 'forest', fonts: 'classic', size: [99.1, 38.1],
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, 5, H, { fill: 'primary' });
      k.text(10, 5, W - 16, 7, s('common.yourname'), { size: 12, bold: true, field: 'name' });
      k.text(10, 12, W - 16, 22, s('addr.lines'), { size: 10.5, lh: 1.25, field: 'address' });
    },
  },
  {
    id: 'sign-back', cat: 'signs', name: 'back.name', scheme: 'sunshine', fonts: 'bold', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'primary' });
      k.rect(14, 14, W - 28, H - 28, { fill: 'light', r: 8 });
      k.art('alarm-clock', W / 2 - 30, 24, 60, 60);
      k.text(20, 88, W - 40, 50, s('back.title'), { size: Math.min(96, 1000 / Math.max(10, s('back.title').length)), font: 'heading', align: 'center', color: 'primary', bold: true });
      k.text(20, 140, W - 40, 20, s('back.sub'), { size: 26, align: 'center' });
      k.text(40, 164, W - 80, 14, '____ : ____', { size: 30, align: 'center', bold: true, color: 'dark' });
    },
  },
  {
    id: 'sign-wifi', cat: 'signs', name: 'wifi.name', scheme: 'mint', fonts: 'modern', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W / 2, 48, 32, { fill: 'primary' });
      k.art('i:wifi', W / 2 - 20, 28, 40, 40, { color: 'light' });
      k.text(10, 86, W - 20, 22, s('wifi.title'), { size: 38, font: 'heading', align: 'center', bold: true, color: 'dark' });
      k.text(14, 116, W - 28, 8, s('wifi.network'), { size: 12, align: 'center', caps: true, tracking: 2, color: 'primary', bold: true });
      k.text(14, 124, W - 28, 14, s('wifi.netname'), { size: 22, align: 'center', bold: true });
      k.text(14, 146, W - 28, 8, s('wifi.password'), { size: 12, align: 'center', caps: true, tracking: 2, color: 'primary', bold: true });
      k.rect(20, 154, W - 40, 18, { fill: '#ffffff', r: 4, stroke: 'secondary', sw: 1 });
      k.text(20, 154, W - 40, 18, s('wifi.pass'), { size: 22, align: 'center', valign: 'middle', bold: true, font: 'Courier New' });
      k.text(14, H - 20, W - 28, 10, s('wifi.enjoy'), { size: 12, align: 'center', italic: true });
    },
  },
  {
    id: 'sign-notice', cat: 'signs', name: 'notice.name', scheme: 'coral', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 60, { fill: 'primary' });
      k.text(14, 6, W - 28, 48, s('notice.kicker'), { size: 56, font: 'heading', color: 'light', align: 'center', valign: 'middle', caps: true, tracking: 6 });
      k.art('warning', W / 2 - 40, 80, 80, 80);
      k.text(16, 170, W - 32, 50, s('notice.title'), { size: 48, font: 'heading', align: 'center', color: 'dark', lh: 1 });
      k.text(24, 226, W - 48, 30, s('notice.body'), { size: 18, align: 'center', lh: 1.3 });
      k.text(16, H - 20, W - 32, 10, s('notice.thanks'), { size: 16, align: 'center', bold: true, color: 'primary' });
    },
  },
  {
    id: 'sign-arrow', cat: 'signs', name: 'arrow.name', scheme: 'candy', fonts: 'friendly', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.text(20, 22, W - 40, 50, s('arrow.title'), { size: Math.min(80, 600 / Math.max(5, s('arrow.title').length)), font: 'heading', align: 'center', color: 'primary', bold: true });
      k.poly([[30, 110], [W - 90, 110], [W - 90, 90], [W - 24, 135], [W - 90, 180], [W - 90, 160], [30, 160]], { fill: 'secondary' });
      k.text(40, 118, W - 140, 34, s('arrow.sub'), { size: 54, font: 'heading', color: 'light', bold: true, valign: 'middle' });
      k.art('balloon', 20, 20, 30, 40); k.art('balloon', W - 46, 18, 28, 38, { rotate: 10 });
    },
  },
];

export const en = {
  'hours.name': 'Opening hours', 'hours.title': 'Opening Hours', 'hours.days': 'Monday|9:00 – 18:00\nTuesday|9:00 – 18:00\nWednesday|9:00 – 18:00\nThursday|9:00 – 20:00\nFriday|9:00 – 18:00\nSaturday|10:00 – 14:00\nSunday|Closed', 'hours.closed': 'Closed',
  'ptag.name': 'Price tag (label)', 'ptag.offer': 'Special offer', 'ptag.product': 'Product name', 'ptag.detail': 'Size, colour or weight', 'ptag.price': '€9.99',
  'badge.name': 'Name badge (label)', 'badge.hello': 'HELLO', 'badge.my': 'my name is', 'badge.name2': 'Anna',
  'addr.name': 'Address label', 'addr.lines': '12 Church Street\nSpringfield\nAB1 2CD',
  'back.name': 'Back soon sign', 'back.title': 'Back soon!', 'back.sub': 'We will be back at',
  'wifi.name': 'Wi-Fi sign', 'wifi.title': 'Free Wi-Fi', 'wifi.network': 'Network', 'wifi.netname': 'Cafe-Guest', 'wifi.password': 'Password', 'wifi.pass': 'coffee2027', 'wifi.enjoy': 'Enjoy your stay!',
  'notice.name': 'Notice', 'notice.kicker': 'Notice', 'notice.title': 'Please keep this door closed', 'notice.body': 'Write a short explanation here, so people know why.', 'notice.thanks': 'Thank you!',
  'arrow.name': 'Direction sign', 'arrow.title': 'Party', 'arrow.sub': 'This way',
};
