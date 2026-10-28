// The settings panel for a WordArt heading: a button to change its words, shape and style.
export default [{
  id: 'wordart',
  when: ({ items, editing }) => !editing && items.length === 1 && !!items[0].wordart,
  html: ({ t, esc }) => `<h2>${esc(t('tools.wordart'))}</h2><div class="prow"><button class="btn primary" data-wa-edit>${esc(t('wa.titleEdit'))}</button></div>`,
  wire: (el, { app, items }) => { el.querySelector('[data-wa-edit]').onclick = () => app.openWordArt(items[0].id); },
}];
