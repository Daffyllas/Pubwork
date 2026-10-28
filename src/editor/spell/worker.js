// Spelling worker: Hunspell (the spell checker of LibreOffice and Firefox) running in WebAssembly, so checking
// never freezes the page. Each language's dictionary is downloaded the first time that language is needed.
import { createHunspellFromStrings } from 'hunspell-wasm';
// the dictionaries (LibreOffice's, packaged by wooorm/dictionaries): only their web addresses are here
import enAff from '../../../node_modules/dictionary-en/index.aff?url';
import enDic from '../../../node_modules/dictionary-en/index.dic?url';
import gbAff from '../../../node_modules/dictionary-en-gb/index.aff?url';
import gbDic from '../../../node_modules/dictionary-en-gb/index.dic?url';
import esAff from '../../../node_modules/dictionary-es/index.aff?url';
import esDic from '../../../node_modules/dictionary-es/index.dic?url';
import deAff from '../../../node_modules/dictionary-de/index.aff?url';
import deDic from '../../../node_modules/dictionary-de/index.dic?url';
import frAff from '../../../node_modules/dictionary-fr/index.aff?url';
import frDic from '../../../node_modules/dictionary-fr/index.dic?url';
import ptAff from '../../../node_modules/dictionary-pt/index.aff?url';
import ptDic from '../../../node_modules/dictionary-pt/index.dic?url';
import itAff from '../../../node_modules/dictionary-it/index.aff?url';
import itDic from '../../../node_modules/dictionary-it/index.dic?url';

const FILES = { en: [enAff, enDic], 'en-gb': [gbAff, gbDic], es: [esAff, esDic], de: [deAff, deDic], fr: [frAff, frDic], pt: [ptAff, ptDic], it: [itAff, itDic] };
const ready = {};

function load(code) {
  if (!FILES[code]) return Promise.reject(new Error(`no dictionary for ${code}`));
  ready[code] ||= (async () => {
    const [aff, dic] = await Promise.all(FILES[code].map(async (u) => { const r = await fetch(new URL(u, self.location.href)); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.text(); }));
    return createHunspellFromStrings(aff, dic);
  })();
  ready[code].catch(() => { ready[code] = null; }); // try again next time (e.g. back online)
  return ready[code];
}

// typographic apostrophes are written as plain ones in the dictionaries
const plain = (w) => w.replace(/’/g, "'");

self.onmessage = async ({ data }) => {
  const { id, op, code } = data;
  try {
    const h = await load(code);
    let result = true;
    if (op === 'check') result = data.words.filter((w) => !h.testSpelling(plain(w))); // the words that are wrong
    else if (op === 'suggest') result = h.getSpellingSuggestions(plain(data.word)).filter((s) => s !== data.word).slice(0, 5);
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({ id, error: String(e?.message || e) });
  }
};
