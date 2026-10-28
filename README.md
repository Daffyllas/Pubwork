# Pubwork

**Open, edit, print and convert Microsoft Publisher (.pub) files in your web browser — free, with no upload.**

Live: **https://pubwork.pages.dev**

Microsoft retired Publisher in October 2026. Schools, churches, clubs and small businesses still have years of
newsletters, flyers, menus and certificates saved as `.pub` files. Pubwork opens them in any modern browser, on
Windows, Mac, Linux, Chromebook, iPhone, iPad and Android.

## What it does

- **Opens .pub files** from Publisher 98 to 365, including text, pictures, shapes, tables, WordArt and linked text boxes
- **Edits** text, fonts, colours, pictures and layout: bulleted and numbered lists, line and paragraph spacing, free rotation,
  picture cropping, table rows/columns/merged cells, drag-to-reorder pages, styles, master pages, guides, spell checking and undo
- **Saves as** PDF (searchable text, embedded fonts, optional print-ready CMYK with bleed and crop marks),
  Word (.docx), PowerPoint (.pptx), LibreOffice Draw (.odg), XPS, web page, e-mail, PNG and JPG — and, for designers,
  SVG, Scribus (.sla) and Adobe InDesign (.idml) with the text still editable
- **Prints** booklets, posters on several sheets, folded cards, labels and business cards
- **Makes new documents** from over 150 templates (flyers, menus, newsletters, invitations, certificates, calendars,
  labels, church and community notices, family and life events…) with colour schemes and font sets
- **Mail merge** from CSV or Excel, with a photo per copy, catalogues, and one e-mail per person
- **Converts many files at once**
- **Works offline** after the first visit (service worker made by `tools/make-sw.mjs`)
- Works in English, Spanish, German, French, Portuguese (Brazil) and Italian

## Privacy

Files are read **inside the browser**. They are never uploaded: there is no server-side processing, no account and no
cookies. The site counts page views and a few anonymous actions (e.g. "a PDF was saved") with Cloudflare Web
Analytics and Umami — never file names or contents. See `src/track.js` and the privacy page.

## How it works

- `tools/reader/` builds **libmspub** (LibreOffice's Publisher import library) and librevenge to **WebAssembly** with
  Emscripten. A small bridge (`bridge/pubjson.cpp`) turns libmspub's drawing calls into JSON. The result is
  `public/pubreader/pubreader.{mjs,wasm}`, which runs in a Web Worker (`src/readworker.js`).
- `src/` is plain JavaScript (no framework), built with Vite. The document is rebuilt as editable HTML/CSS
  (`src/render.js`); exports are made in the browser (`src/export/`, PDF with pdf-lib).
- `site/` and `tools/make-pages.mjs` make the information pages in six languages, the sitemap and `index.html`.

## Run it yourself

Needs Node.js 18 or newer.

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # the finished site goes to dist/ (deployable to any static host)
```

The WebAssembly reader is already built in `public/pubreader/`. To build it again from source (needs Emscripten):

```sh
sh tools/reader/fetch.sh    # downloads libmspub, librevenge, zlib and Boost headers at pinned versions and applies libmspub.patch
sh tools/reader/build.sh
```

Test files: `sh tools/fetch-test-files.sh` downloads public .pub test files into `tests/corpus-extra/`, then
`node tools/reader-test.mjs tests/corpus-extra`.

Settings for your own copy (site address, contact e-mail, analytics) are in `site.config.json`.

## Licence

Pubwork is open source under the **Mozilla Public License 2.0** (see `LICENSE`). Third-party parts keep their own
licences; see `NOTICE.md`.

Pubwork is not made by or connected with Microsoft. Microsoft and Publisher are trademarks of Microsoft Corporation.
