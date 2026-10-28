# Fonts to hand over with Scribus, InDesign and SVG files ("Document Fonts" in the download).
# The app has each free font cut into pieces by alphabet (latin, latin-ext, greek, cyrillic…) so pages load
# fast. Installed on a computer, those pieces would clash (same name, part of the letters each), so this
# joins them back into one complete .ttf per family and style, and copies each font's licence.
#   python3 tools/make-doc-fonts.py   (runs before `npm run build`; needs fontTools: pip install fonttools)
# Reads public/pdffonts/manifest.json (made by tools/make-pdf-fonts.mjs); writes public/docfonts/.
import json, os, re, shutil, sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = os.path.join(root, 'public', 'pdffonts')
out = os.path.join(root, 'public', 'docfonts')
try:
    from fontTools.ttLib import TTFont
    from fontTools.merge import Merger, Options
except ImportError:
    print('make-doc-fonts: fontTools is not installed (pip install fonttools); Scribus/InDesign/SVG downloads will come without fonts')
    sys.exit(0)

manifest = json.load(open(os.path.join(src, 'manifest.json'), encoding='utf-8'))
ORDER = ['latin', 'latin-ext', 'greek', 'greek-ext', 'cyrillic', 'cyrillic-ext']
def subset_of(file):
    m = re.search(r'-((?:latin|greek|cyrillic)(?:-ext)?)-\d{3}-', file)
    return ORDER.index(m.group(1)) if m and m.group(1) in ORDER else 99

groups = {}
for f in manifest:
    groups.setdefault((f['family'], f['weight'], f['style']), []).append(f['file'])

STYLE = {(400, 'normal'): 'Regular', (700, 'normal'): 'Bold', (400, 'italic'): 'Italic', (700, 'italic'): 'BoldItalic'}
os.makedirs(out, exist_ok=True)
index = {}
for (family, weight, style), files in sorted(groups.items()):
    files.sort(key=subset_of)
    name = f"{family.replace(' ', '')}-{STYLE.get((weight, style), f'{weight}{style.title()}')}.ttf"
    dest = os.path.join(out, name)
    newest = max(os.path.getmtime(os.path.join(src, x)) for x in files)
    if not (os.path.exists(dest) and os.path.getmtime(dest) >= newest):
        paths = [os.path.join(src, x) for x in files]
        try:
            font = Merger(options=Options(drop_tables=['vmtx', 'vhea', 'MATH'])).merge(paths) if len(paths) > 1 else TTFont(paths[0])
        except Exception as e:  # some fonts won't join: the Latin piece alone still covers most text
            print(f'make-doc-fonts: {family} {weight} {style}: kept the Latin letters only ({e})')
            font = TTFont(paths[0])
        font.save(dest)
    entry = index.setdefault(family, {'files': {}})
    entry['files'][f'{weight} {style}'] = name

# each family's licence, from its @fontsource package
for family, entry in index.items():
    pkg = os.path.join(root, 'node_modules', '@fontsource', family.lower().replace(' ', '-'), 'LICENSE')
    if os.path.exists(pkg):
        lic = f"{family.replace(' ', '')}-LICENSE.txt"
        shutil.copyfile(pkg, os.path.join(out, lic))
        entry['licence'] = lic

json.dump(index, open(os.path.join(out, 'fonts.json'), 'w', encoding='utf-8'), indent=1)
print(f'make-doc-fonts: {sum(len(e["files"]) for e in index.values())} fonts in {len(index)} families -> public/docfonts')
