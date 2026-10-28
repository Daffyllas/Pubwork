// Every template, in the order the gallery shows them, and their words in each language.
// This file and everything it loads is only fetched when someone opens the template gallery.
import { flyers, en as flyersEn } from './flyers.js';
import { menus, en as menusEn } from './menus.js';
import { cards, en as cardsEn } from './cards.js';
import { newsletters, en as newsEn } from './newsletters.js';
import { certificates, en as certsEn } from './certificates.js';
import { business, en as businessEn } from './business.js';
import { envelopes, en as envelopesEn } from './envelopes.js';
import { brochures, en as brochuresEn } from './brochures.js';
import { signs, en as signsEn } from './signs.js';
import { calendars, en as calendarsEn } from './calendars.js';
import { local, STR as localStr } from './local.js';
import { blockStrings } from './blocks.js';
import * as moreA from './more-community.js';
import * as moreB from './more-life.js';
import es from './strings/es.js';
import de from './strings/de.js';
import fr from './strings/fr.js';
import pt from './strings/pt.js';
import it from './strings/it.js';

export const CATEGORIES = ['local', 'flyers', 'cards', 'menus', 'news', 'business', 'envelopes', 'certs', 'brochures', 'signs', 'calendars', ...moreA.categories, ...moreB.categories].filter((c, i, a) => a.indexOf(c) === i);
export const TEMPLATES = [...local, ...flyers, ...cards, ...menus, ...newsletters, ...business, ...envelopes, ...certificates, ...brochures, ...signs, ...calendars, ...moreA.templates, ...moreB.templates];
const en = { ...flyersEn, ...menusEn, ...cardsEn, ...newsEn, ...certsEn, ...businessEn, ...envelopesEn, ...brochuresEn, ...signsEn, ...calendarsEn, ...blockStrings, ...localStr.en, ...moreA.en, ...moreB.en };
const more = (l) => ({ ...moreA.tr[l], ...moreB.tr[l] });
export const STRINGS = { en, es: { ...es, ...localStr.es, ...more('es') }, de: { ...de, ...localStr.de, ...more('de') }, fr: { ...fr, ...localStr.fr, ...more('fr') }, pt: { ...pt, ...localStr.pt, ...more('pt') }, it: { ...it, ...localStr.it, ...more('it') } };
// the language a template's words are written in: local ones keep their own
export const templateLang = (tpl, lang) => (tpl.langs && !tpl.langs.includes(lang) ? tpl.langs[0] : lang);
