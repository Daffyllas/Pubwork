# Third-party software and files

Pubwork includes or uses the following. Each keeps its own licence.

| Part | Used for | Licence |
|---|---|---|
| [libmspub](https://github.com/LibreOffice/libmspub) (with the changes in `tools/reader/libmspub.patch`) | reading .pub files (built into `public/pubreader/`) | MPL-2.0 |
| [librevenge](https://sourceforge.net/projects/libwpd/) 0.0.5 | document interface used by libmspub | MPL-2.0 (or LGPL-2.1+) |
| [zlib](https://zlib.net) 1.3 | compressed data inside .pub files | zlib |
| [Boost](https://www.boost.org) 1.83 (headers) | used by libmspub | BSL-1.0 |
| [pdf-lib](https://github.com/Hopding/pdf-lib), @pdf-lib/fontkit | making PDFs | MIT |
| [fflate](https://github.com/101arrowz/fflate) | zip files (.docx, .pptx, .pubwork…) | MIT |
| [rtf.js](https://github.com/tbluemel/rtf.js) (WMF/EMF parts) | old Windows pictures inside .pub files | MIT |
| [modern-screenshot](https://github.com/qq15725/modern-screenshot) | page pictures | MIT |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) | QR codes | MIT |
| [hunspell-wasm](https://www.npmjs.com/package/hunspell-wasm) | spell checking | LGPL-2.0 / GPL-2.0 / MPL-1.1 |
| Spelling dictionaries (`dictionary-en`, `-en-gb`, `-es`, `-de`, `-fr`, `-pt`, `-it`) | spell checking; loaded as separate data files | their own licences (MIT/BSD, GPL, LGPL, MPL), see each package |
| Fonts from [Fontsource](https://fontsource.org) (Arimo, Tinos, Cousine, Carlito, Caladea, Open Sans, Lato, Montserrat and others) | showing and embedding text | SIL OFL-1.1 or Apache-2.0 |
| [Iconify](https://iconify.design) Tabler icons and Fluent Emoji Flat (in `src/templates/art-data.js`) | icons and clip art | MIT |
| `public/samples/` (SampleNewsletter.pub, SampleBrochure.pub) | the "Try a sample" files | from the [Apache POI](https://poi.apache.org) test data, Apache-2.0 |
