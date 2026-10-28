// Extra parts of the settings panel on the right. Each feature adds its own sections in its own file;
// a section is { id, when(ctx), html(ctx), wire(el, ctx) } where ctx = { app, ed, items, editing, t, esc }.
// Sections are shown after the built-in ones, in this order (a section with early: true comes before Position).
import picture from './picture.js';
import arrange from './arrange.js';
import text from './text.js';
import wordart from './wordart.js';
import table from './table.js';
export const SECTIONS = [...wordart, ...text, ...table, ...picture, ...arrange];
