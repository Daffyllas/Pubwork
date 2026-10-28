// "Text as shapes" for SVG: each word becomes the outlines of its letters, drawn with the very font the page
// used, so the file looks the same in every program (Inkscape, Illustrator, cutting machines) with no fonts
// installed. The trade-off: the words can no longer be edited as text.
// A word in a font that is only on this computer (we can't read its letters) stays ordinary text.

const siteRoot = () => new URL(document.querySelector('meta[name="pw-root"]')?.content || './', document.baseURI);
const GENERIC = { serif: 'Tinos', 'sans-serif': 'Arimo', monospace: 'Cousine', cursive: 'Dancing Script' };
const n = (v) => +v.toFixed(2);

export class Outliner {
  constructor(embeddedBytes) {
    this.embedded = embeddedBytes; this.kits = new Map(); this.local = new Map();
    this.ready = (async () => {
      this.fontkit = (await import('@pdf-lib/fontkit')).default;
      let list = [];
      try { const r = await fetch(new URL('pdffonts/manifest.json', siteRoot())); if (r.ok) list = await r.json(); } catch { /* no fonts: words stay text */ }
      this.families = new Map();
      for (const f of list) { const k = f.family.toLowerCase(); if (!this.families.has(k)) this.families.set(k, []); this.families.get(k).push(f); }
    })();
  }
  // is this a font installed on the computer (not one of ours)? Then the browser drew it and we can't
  isLocal(name) {
    if (this.local.has(name)) return this.local.get(name);
    const c = document.createElement('canvas').getContext('2d'), probe = 'mmmmmmmmmmlli1WWQ@@';
    const w = (font) => { c.font = font; return c.measureText(probe).width; };
    const yes = w(`40px "${name}", monospace`) !== w('40px monospace') || w(`40px "${name}", serif`) !== w('40px serif');
    this.local.set(name, yes); return yes;
  }
  async kit(id, getBytes) {
    if (!this.kits.has(id)) this.kits.set(id, (async () => { try { return this.fontkit.create(await getBytes()); } catch { return null; } })());
    return this.kits.get(id);
  }
  // the font file that draws code point cp for this style: { kit, synthBold, synthItalic } | 'local' | null
  async pick(fams, weight, italic, cp) {
    for (const raw of fams) {
      const name = GENERIC[raw.toLowerCase()] || raw;
      if (this.embedded.has(name)) {
        const kit = await this.kit(`e:${name}`, () => this.embedded.get(name));
        if (kit?.hasGlyphForCodePoint(cp)) return { kit, synthBold: false, synthItalic: false };
        continue;
      }
      const list = this.families.get(name.toLowerCase());
      if (list) {
        const cover = list.filter((f) => f.ranges.some(([a, b]) => cp >= a && cp <= b));
        if (!cover.length) continue;
        const want = italic ? 'italic' : 'normal';
        cover.sort((a, b) => ((a.style === want ? 0 : 1000) + Math.abs(a.weight - weight)) - ((b.style === want ? 0 : 1000) + Math.abs(b.weight - weight)));
        const f = cover[0];
        const kit = await this.kit(f.file, async () => new Uint8Array(await (await fetch(new URL(`pdffonts/${f.file}`, siteRoot()))).arrayBuffer()));
        if (kit) return { kit, synthBold: weight >= 600 && f.weight < 600, synthItalic: italic && f.style !== 'italic' };
        continue;
      }
      if (this.isLocal(name)) return 'local';
    }
    return null;
  }
  // a word -> SVG path data in page units, or null to keep it as text
  // x, y: where the word starts on the baseline (pt); size: font size (pt); spacing: extra space after each letter (pt)
  async word(text, st, x, y, size, spacing) {
    await this.ready;
    const chars = [...text];
    // runs of letters drawn with the same font
    const runs = [];
    for (const ch of chars) {
      const face = await this.pick(st.fams, st.weight, st.italic, ch.codePointAt(0));
      if (!face || face === 'local') return null;
      const last = runs[runs.length - 1];
      if (last && last.face.kit === face.kit && last.face.synthBold === face.synthBold && last.face.synthItalic === face.synthItalic) last.text += ch;
      else runs.push({ face, text: ch });
    }
    let pen = x, d = '', bold = false;
    for (const run of runs) {
      const { kit, synthBold, synthItalic } = run.face, s = size / kit.unitsPerEm;
      let glyphs;
      try { glyphs = kit.layout(run.text); } catch { return null; }
      glyphs.glyphs.forEach((g, i) => {
        const pos = glyphs.positions[i];
        let p = g.path.scale(s, -s).translate(pen + pos.xOffset * s, y - pos.yOffset * s);
        if (synthItalic) p = p.transform(1, 0, -0.21, 1, 0.21 * y, 0); // lean about 12 degrees, around the baseline
        d += p.toSVG();
        pen += pos.xAdvance * s + spacing;
      });
      bold ||= synthBold;
    }
    return { d: d.replace(/-?\d+\.\d{3,}/g, (m) => String(n(+m))), end: pen, bold };
  }
}
export const pathNum = n;
