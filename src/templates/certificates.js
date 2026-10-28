// Certificates and awards, landscape, with signature lines and a seal.
import { frame, corners, confetti } from './common.js';

function signatures(k, y, o = {}) {
  const { W, s } = k, w = 60;
  [[W * 0.27, s('cert.date')], [W * 0.73, s('cert.sign')]].forEach(([cx, label]) => {
    k.line(cx - w / 2, y, cx + w / 2, y, { color: o.color ?? 'dark', width: 0.7 });
    k.text(cx - w / 2, y + 1.5, w, 8, label, { size: 10, align: 'center', color: o.color ?? 'dark', caps: true, tracking: 1.5 });
  });
}
function seal(k, cx, cy, r, o = {}) {
  k.star(cx, cy, r, { points: 20, inner: 0.86, fill: o.fill ?? 'secondary' });
  k.circle(cx, cy, r * 0.72, { fill: 'none', stroke: 'light', sw: 0.8 });
  k.art(o.art ?? 'rosette', cx - r * 0.5, cy - r * 0.5, r, r);
}

export const certificates = [
  {
    id: 'cert-achieve', cat: 'certs', name: 'achieve.name', scheme: 'navy', fonts: 'traditional', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      frame(k, 8, { color: 'primary', width: 4, gap: 4, width2: 1, color2: 'secondary' });
      corners(k, 26, { fill: 'primary' });
      k.text(30, 30, W - 60, 24, s('achieve.title'), { size: 40, font: 'heading', color: 'primary', align: 'center', bold: true, caps: true, tracking: 2 });
      k.text(30, 54, W - 60, 12, s('achieve.sub'), { size: 18, align: 'center', color: 'secondary', caps: true, tracking: 6 });
      k.text(30, 76, W - 60, 10, s('cert.presented'), { size: 14, align: 'center', italic: true });
      k.text(30, 88, W - 60, 26, s('cert.person'), { size: 40, font: 'Edwardian Script ITC', align: 'center', color: 'dark' });
      k.line(W / 2 - 70, 116, W / 2 + 70, 116, { color: 'secondary', width: 0.8 });
      k.text(40, 120, W - 80, 22, s('achieve.for'), { size: 14, align: 'center', lh: 1.3 });
      seal(k, W / 2, H - 46, 18);
      signatures(k, H - 36);
    },
  },
  {
    id: 'cert-course', cat: 'certs', name: 'course.name', scheme: 'mint', fonts: 'modern', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, 64, H, { fill: 'primary' });
      k.poly([[64, 0], [84, 0], [64, H * 0.35]], { fill: 'secondary' });
      k.logo(14, 20, 36, 36, { art: 'graduation-cap' });
      k.text(10, H - 40, 46, 30, s('common.org'), { size: 13, color: 'light', bold: true, field: 'org' });
      const x = 86, w = W - x - 20;
      k.text(x, 30, w, 14, s('course.kicker'), { size: 16, caps: true, tracking: 4, color: 'primary', bold: true });
      k.text(x, 42, w, 24, s('course.title'), { size: 38, font: 'heading', color: 'dark', bold: true });
      k.text(x, 74, w, 10, s('cert.certifies'), { size: 13 });
      k.text(x, 84, w, 22, s('cert.person'), { size: 34, font: 'heading', color: 'primary', bold: true });
      k.text(x, 110, w, 24, s('course.for'), { size: 14, lh: 1.35 });
      k.rect(x, 138, 52, 14, { fill: 'accent', r: 7 });
      k.text(x, 138, 52, 14, s('course.hours'), { size: 12, color: 'light', align: 'center', valign: 'middle', bold: true });
      const sw = 60;
      [[x, s('cert.date')], [x + w - sw, s('cert.sign')]].forEach(([lx, label]) => { k.line(lx, H - 30, lx + sw, H - 30, { color: 'dark', width: 0.7 }); k.text(lx, H - 28, sw, 8, label, { size: 10, caps: true, tracking: 1.5 }); });
    },
  },
  {
    id: 'cert-employee', cat: 'certs', name: 'emp.name', scheme: 'sunshine', fonts: 'bold', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.rect(10, 10, W - 20, H - 20, { fill: 'light', r: 4 });
      k.rect(10, 10, W - 20, 40, { fill: 'primary', r: 4 });
      k.text(20, 14, W - 40, 32, s('emp.title'), { size: 42, font: 'heading', color: 'light', align: 'center', valign: 'middle' });
      k.photo(W / 2 - 26, 58, 52, 52, { round: true });
      k.art('trophy', W / 2 + 22, 92, 22, 22);
      k.text(20, 116, W - 40, 22, s('cert.person'), { size: 34, font: 'heading', align: 'center', color: 'dark' });
      k.text(20, 138, W - 40, 10, s('emp.month'), { size: 16, align: 'center', color: 'primary', bold: true, caps: true, tracking: 3 });
      k.text(40, 150, W - 80, 20, s('emp.for'), { size: 13, align: 'center', lh: 1.3 });
      signatures(k, H - 26);
    },
  },
  {
    id: 'cert-diploma', cat: 'certs', name: 'dip.name', scheme: 'earth', fonts: 'elegant', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      frame(k, 10, { color: 'primary', width: 1.2, gap: 2.5, width2: 0.5 });
      for (let i = 0; i < 4; i++) k.art('i:sparkles', [16, W - 28, 16, W - 28][i], [16, 16, H - 28, H - 28][i], 12, 12, { color: 'secondary' });
      k.text(30, 24, W - 60, 12, s('common.org'), { size: 15, align: 'center', font: 'Garamond', caps: true, tracking: 4, color: 'primary', field: 'org' });
      k.text(30, 40, W - 60, 32, s('dip.title'), { size: 64, font: 'heading', align: 'center', color: 'dark' });
      k.text(30, 76, W - 60, 10, s('cert.awarded'), { size: 14, align: 'center', italic: true });
      k.text(30, 88, W - 60, 22, s('cert.person'), { size: 30, align: 'center', bold: true, color: 'primary', caps: true, tracking: 3 });
      k.text(40, 114, W - 80, 22, s('dip.for'), { size: 14, align: 'center', lh: 1.35 });
      seal(k, W / 2, H - 44, 16, { fill: 'primary', art: 'scroll' });
      signatures(k, H - 34);
    },
  },
  {
    id: 'cert-kids', cat: 'certs', name: 'star.name', scheme: 'candy', fonts: 'friendly', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      confetti(k, [6, 6, W - 12, H - 12], { n: 50, seed: 21 });
      k.rect(16, 16, W - 32, H - 32, { fill: '#ffffff', r: 10, stroke: 'secondary', sw: 3, dash: [8, 5] });
      k.star(46, 46, 18, { fill: 'accent' }); k.star(W - 46, 46, 18, { fill: 'accent' });
      k.text(70, 28, W - 140, 30, s('star.title'), { size: 48, font: 'heading', align: 'center', color: 'primary', bold: true });
      k.text(30, 64, W - 60, 10, s('cert.awarded'), { size: 15, align: 'center' });
      k.text(30, 76, W - 60, 24, s('star.who'), { size: 40, font: 'heading', align: 'center', color: 'secondary', bold: true });
      k.text(40, 104, W - 80, 20, s('star.for'), { size: 16, align: 'center', lh: 1.3 });
      k.art('glowing-star', W / 2 - 18, 126, 36, 36);
      signatures(k, H - 30);
    },
  },
  {
    id: 'cert-volunteer', cat: 'certs', name: 'vol.name', scheme: 'forest', fonts: 'classic', size: 'paper-landscape',
    build(k) {
      const { W, H, s } = k;
      k.wave(H - 30, 6, { fill: 'secondary', opacity: 0.4 }); k.wave(H - 22, 6, { fill: 'primary', waves: 3 });
      k.art('heart-hands', W / 2 - 18, 14, 36, 36);
      k.text(30, 52, W - 60, 24, s('vol.title'), { size: 38, font: 'heading', align: 'center', color: 'primary', bold: true });
      k.text(30, 80, W - 60, 10, s('cert.presented'), { size: 14, align: 'center', italic: true });
      k.text(30, 92, W - 60, 22, s('cert.person'), { size: 32, font: 'heading', align: 'center', color: 'dark' });
      k.text(40, 118, W - 80, 22, s('vol.for'), { size: 14, align: 'center', lh: 1.35 });
      signatures(k, H - 48);
    },
  },
];

export const en = {
  'cert.presented': 'This certificate is proudly presented to', 'cert.certifies': 'This is to certify that', 'cert.awarded': 'is awarded to', 'cert.person': 'Name Surname', 'cert.date': 'Date', 'cert.sign': 'Signature',
  'achieve.name': 'Certificate of achievement', 'achieve.title': 'Certificate', 'achieve.sub': 'of achievement', 'achieve.for': 'in recognition of outstanding effort and excellent results throughout the year.',
  'course.name': 'Course certificate', 'course.kicker': 'Certificate', 'course.title': 'of Completion', 'course.for': 'has successfully completed the course “First Aid at Work”.', 'course.hours': '20 hours',
  'emp.name': 'Employee of the month', 'emp.title': 'Employee of the Month', 'emp.month': 'June', 'emp.for': 'Thank you for your hard work, your smile and your help to everyone in the team.',
  'dip.name': 'Diploma', 'dip.title': 'Diploma', 'dip.for': 'for completing the full course of study with distinction.',
  'star.name': 'Award for children', 'star.title': 'Super Star Award', 'star.who': 'Emma', 'star.for': 'for being kind, helpful and a great friend to everyone!',
  'vol.name': 'Volunteer thank-you', 'vol.title': 'Certificate of Appreciation', 'vol.for': 'with heartfelt thanks for your time, energy and kindness as a volunteer.',
};
