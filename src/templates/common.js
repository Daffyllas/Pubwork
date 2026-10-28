// Pieces several templates share.

// rows of an icon and a line of text: [['i:calendar', 'Saturday 14 June'], …]
export function infoRows(k, x, y, w, rows, o = {}) {
  const gap = o.gap ?? 11, size = o.size ?? 16, icon = o.icon ?? 7;
  rows.forEach(([ic, text, field], i) => {
    const yy = y + i * gap;
    k.art(ic, x, yy + (gap - icon) / 2, icon, icon, { color: o.iconColor ?? 'primary' });
    k.text(x + icon + 4, yy, w - icon - 4, gap, text, { size, color: o.color ?? 'dark', bold: o.bold, font: o.font ?? 'body', valign: 'middle', field });
  });
  return y + rows.length * gap;
}

// a strip of tear-off tabs along the bottom with the contact turned on its side
export function tearOffs(k, text, o = {}) {
  const n = o.n ?? 8, h = o.h ?? 42, y = k.H - h, w = k.W / n;
  k.line(0, y, k.W, y, { color: 'dark', width: 0.8, dash: [4, 3] });
  for (let i = 0; i < n; i++) {
    if (i) k.line(i * w, y, i * w, k.H, { color: 'dark', width: 0.6, dash: [3, 3] });
    const bw = h - 4, bh = w - 2, cx = i * w + w / 2, cy = y + h / 2; // the box is laid out upright, then turned
    k.text(cx - bw / 2, cy - bh / 2, bw, bh, text, { size: o.size ?? 9.5, bold: true, color: 'dark', align: 'center', valign: 'middle', rotate: 90, field: o.field });
  }
}

// a frame of two lines around the page, as on certificates and invitations
export function frame(k, inset, o = {}) {
  k.rect(inset, inset, k.W - 2 * inset, k.H - 2 * inset, { fill: 'none', stroke: o.color ?? 'primary', sw: o.width ?? 3 });
  if (o.double !== false) k.rect(inset + (o.gap ?? 3), inset + (o.gap ?? 3), k.W - 2 * (inset + (o.gap ?? 3)), k.H - 2 * (inset + (o.gap ?? 3)), { fill: 'none', stroke: o.color2 ?? o.color ?? 'primary', sw: o.width2 ?? 1 });
}

// corner ornaments: little filled triangles in each corner
export function corners(k, size, o = {}) {
  const W = k.W, H = k.H, s = size, c = o.fill ?? 'secondary';
  k.poly([[0, 0], [s, 0], [0, s]], { fill: c });
  k.poly([[W, 0], [W - s, 0], [W, s]], { fill: c });
  k.poly([[0, H], [s, H], [0, H - s]], { fill: c });
  k.poly([[W, H], [W - s, H], [W, H - s]], { fill: c });
}

// a row of little bunting flags across the top
export function bunting(k, y, o = {}) {
  const n = o.n ?? 12, w = k.W / n, h = o.h ?? 14, colors = o.colors ?? ['primary', 'secondary', 'accent'];
  k.path(`M0 ${y} Q${k.W / 2} ${y + 8} ${k.W} ${y}`, { open: true, stroke: 'dark', sw: 0.8 });
  for (let i = 0; i < n; i++) {
    const x = i * w, sag = 8 * (1 - Math.pow((x + w / 2 - k.W / 2) / (k.W / 2), 2)) * 0.5;
    k.poly([[x + 1, y + sag], [x + w - 1, y + sag], [x + w / 2, y + sag + h]], { fill: colors[i % colors.length] });
  }
}

// confetti dots scattered by a fixed pattern (the same every time)
export function confetti(k, box, o = {}) {
  const [x0, y0, w, h] = box, n = o.n ?? 26, colors = o.colors ?? ['primary', 'secondary', 'accent'];
  let seed = o.seed ?? 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * w, y = y0 + rnd() * h, r = 1 + rnd() * 2.4, c = colors[i % colors.length];
    if (i % 3 === 0) k.rect(x, y, r * 1.6, r * 0.8, { fill: c, rotate: Math.round(rnd() * 90 - 45) });
    else k.circle(x, y, r * 0.8, { fill: c });
  }
}

// dotted leader line between a dish and its price
export function priceRow(k, x, y, w, name, price, o = {}) {
  const size = o.size ?? 13;
  k.text(x, y, w - 22, size * 0.55, name, { size, font: o.font ?? 'body', bold: o.bold ?? true, color: o.color ?? 'dark' });
  k.text(x + w - 22, y, 22, size * 0.55, price, { size, font: o.font ?? 'body', bold: true, color: o.priceColor ?? 'primary', align: 'right' });
  if (o.desc) k.text(x, y + size * 0.5, w - 26, size * 0.45, o.desc, { size: size * 0.75, italic: true, color: o.descColor ?? 'dark' });
}
