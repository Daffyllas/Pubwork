// The WordArt style gallery: each style is a fill, an outline, a shadow and a shape. Colours named by their
// job ('primary', 'dark' …) come from the document's colour scheme, so the styles match the design.
import { schemeColors } from '../templates/schemes.js';

// outline widths, in points for 100pt letters (scaled with the letters)
export const LINES = [0, 1.5, 3, 6];

// fill: a colour, or [bottom colour, top colour] for a blend, or a list of stops
export const PRESETS = [
  { id: 'plain', fill: 'dark', line: 0, warp: 'straight' },
  { id: 'outline', fill: 'light', stroke: 'primary', line: 2, warp: 'straight' },
  { id: 'bold', fill: 'primary', line: 0, shadow: true, warp: 'straight' },
  { id: 'blend', fill: ['primary', 'secondary'], line: 0, warp: 'straight' },
  { id: 'sunset', fill: ['primary', 'accent'], stroke: 'dark', line: 1, warp: 'archUp' },
  { id: 'rainbow', fill: [[0, '#6a3fb5'], [0.25, '#1e88e5'], [0.5, '#43a047'], [0.75, '#fdd835'], [1, '#e53935']], angle: 270, stroke: '#333333', line: 1, warp: 'wave' },
  { id: 'shadow', fill: 'secondary', stroke: 'dark', line: 1, shadow: true, warp: 'archUp' },
  { id: 'gold', fill: [[0, '#9a6b00'], [0.45, '#f6d365'], [0.6, '#fff1b8'], [1, '#c99a1e']], stroke: '#6b4a00', line: 1, warp: 'bulge' },
  { id: 'silver', fill: [[0, '#6f7378'], [0.5, '#f2f3f5'], [1, '#a9adb3']], stroke: '#4a4d52', line: 1, warp: 'slantUp' },
  { id: 'ocean', fill: ['secondary', 'primary'], line: 0, shadow: true, warp: 'archDown' },
  { id: 'stamp', fill: 'primary', line: 0, warp: 'circle' },
  { id: 'retro', fill: 'accent', stroke: 'dark', line: 2, shadow: true, warp: 'triangleUp' },
  { id: 'fire', fill: [[0, '#b71c1c'], [0.5, '#f57c00'], [1, '#ffd54f']], stroke: '#7f0000', line: 1, warp: 'bulge' },
  { id: 'distance', fill: ['dark', 'primary'], line: 0, warp: 'fadeRight' },
  { id: 'squeeze', fill: 'accent', stroke: 'dark', line: 1, warp: 'pinch' },
  { id: 'ribbon', fill: 'light', stroke: 'secondary', line: 3, shadow: true, warp: 'slantDown' },
];

const SHADOW = 'rgba(0,0,0,0.35)';

// a style's look with real colours: { fill, strokeColor, line, shadow, warp }
export function presetLook(p, scheme) {
  const C = schemeColors(scheme || 'orange');
  const col = (c) => C[c] || c;
  let fill;
  if (typeof p.fill === 'string') fill = { type: 'solid', color: col(p.fill), opacity: 1 };
  else if (typeof p.fill[0] === 'string') fill = { type: 'gradient', from: col(p.fill[0]), to: col(p.fill[1]), angle: p.angle || 0 };
  else { const stops = p.fill.map(([at, c]) => ({ at, color: col(c) })); fill = { type: 'gradient', from: stops[0].color, to: stops[stops.length - 1].color, angle: p.angle || 0, stops }; }
  return { fill, strokeColor: col(p.stroke || 'dark'), line: p.line, shadow: !!p.shadow, shadowColor: SHADOW, warp: p.warp };
}
