// Envelopes: the sender's address top left (from "My details") and the address of the person it goes to,
// where the post office looks for it. One is ready for mail merge: «First name» «Last name» «Address» «Town»
// fill in from a list, one envelope per person. Countries on Letter paper get US envelope sizes.
import { usPaper } from './kit.js';

// the merge fields use the column names of the sample list in the person's language
const mergeFields = (s) => { const [a, b, c, d] = s('env.mergeCols').split('|'); return `«${a}» «${b}»\n«${c}»\n«${d}»`; };

// the sender: organisation (or name) on top, address under it
function sender(k, x, y, w, o = {}) {
  const { s } = k;
  k.text(x, y, w, 6, s(o.who === 'name' ? 'common.yourname' : 'common.org'), { size: o.size ?? 10, bold: true, color: o.color ?? 'primary', font: o.font ?? 'body', field: o.who ?? 'org' });
  k.text(x, y + 6, w, 14, s('env.from'), { size: (o.size ?? 10) - 1.5, color: o.sub ?? 'dark', lh: 1.25, field: 'address' });
}
// the address block, where the post office reads it: right of the middle, a little below the middle
function recipient(k, content, o = {}) {
  const { W, H } = k;
  const x = o.x ?? W * 0.44, y = o.y ?? H * 0.46;
  return k.text(x, y, W - x - 12, H - y - 8, content, { size: o.size ?? 11.5, color: 'dark', lh: 1.3, font: o.font ?? 'body', align: o.align ?? 'left' });
}

export const envelopes = [
  {
    id: 'env-plain', cat: 'envelopes', name: 'env1.name', scheme: 'navy', fonts: 'classic',
    get size() { return usPaper() ? 'env-10' : 'env-dl'; },
    build(k) {
      const { W, s } = k;
      sender(k, 12, 10, W * 0.42);
      k.line(12, 32, 52, 32, { color: 'secondary', width: 0.6 });
      recipient(k, s('env.to'));
    },
  },
  {
    id: 'env-logo', cat: 'envelopes', name: 'env2.name', scheme: 'ocean', fonts: 'modern',
    get size() { return usPaper() ? 'env-10' : 'env-c5'; },
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, 6, H, { fill: 'primary' });
      k.logo(14, 10, 16, 16, { art: 'i:building', color: 'primary' });
      k.text(34, 10, W * 0.4, 8, s('common.org'), { size: 13, font: 'heading', bold: true, color: 'primary', field: 'org' });
      k.text(34, 18, W * 0.4, 14, s('env.from'), { size: 8.5, lh: 1.25, field: 'address' });
      k.text(14, H - 12, W * 0.4, 6, s('common.web'), { size: 8, color: 'secondary', field: 'web' });
      recipient(k, s('env.to'), { size: 12 });
    },
  },
  {
    id: 'env-merge', cat: 'envelopes', name: 'env3.name', scheme: 'forest', fonts: 'modern',
    get size() { return usPaper() ? 'env-10' : 'env-dl'; },
    build(k) {
      const { W } = k;
      sender(k, 12, 10, W * 0.42);
      recipient(k, mergeFields(s));
    },
  },
  {
    id: 'env-greeting', cat: 'envelopes', name: 'env4.name', scheme: 'berry', fonts: 'script',
    get size() { return usPaper() ? 'env-a7' : 'env-c6'; },
    build(k) {
      const { W, H, s } = k;
      k.rect(4, 4, W - 8, H - 8, { fill: 'none', stroke: 'secondary', sw: 0.6 });
      k.art('cherry-blossom', W - 30, 8, 20, 20);
      k.art('tulip', 9, H - 25, 15, 15);
      sender(k, 10, 9, W * 0.5, { who: 'name', size: 8.5, color: 'dark' });
      recipient(k, [{ t: s('env.toName'), size: 20, font: 'heading', after: 4 }, { t: s('env.toAddr'), size: 10 }], { x: W * 0.22, y: H * 0.42, align: 'center' });
    },
  },
];

export const en = {
  'env1.name': 'Envelope · plain', 'env2.name': 'Envelope · with logo', 'env3.name': 'Envelope · for mail merge', 'env4.name': 'Envelope · for a card',
  'env.from': '12 Church Street\nSpringfield AB1 2CD', 'env.mergeCols': 'First name|Last name|Address|Town',
  'env.to': 'Mrs Jane Smith\n24 Station Road\nSpringfield\nAB1 2CD',
  'env.toName': 'Jane and Tom Smith', 'env.toAddr': '24 Station Road\nSpringfield AB1 2CD',
};
