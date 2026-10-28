// The "Line up" settings for whatever is picked: line up, spread out, turn, flip, group, lock.
import { group, ungroup, align, distribute, flip, rotate, setAngle, toggleLock } from '../arrange.js';
import { angleOf } from '../model.js';
import '../pics.css';

const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  left: S('<path d="M4 3v18"/><rect x="7" y="6" width="12" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>'),
  center: S('<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>'),
  right: S('<path d="M20 3v18"/><rect x="5" y="6" width="12" height="4" rx="1"/><rect x="10" y="14" width="7" height="4" rx="1"/>'),
  top: S('<path d="M3 4h18"/><rect x="6" y="7" width="4" height="12" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>'),
  middle: S('<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>'),
  bottom: S('<path d="M3 20h18"/><rect x="6" y="5" width="4" height="12" rx="1"/><rect x="14" y="10" width="4" height="7" rx="1"/>'),
  spreadH: S('<path d="M3 4v16M21 4v16"/><rect x="9" y="8" width="6" height="8" rx="1"/>'),
  spreadV: S('<path d="M4 3h16M4 21h16"/><rect x="8" y="9" width="8" height="6" rx="1"/>'),
  turnL: S('<path d="M9 4 5 8l4 4"/><path d="M5 8h9a5 5 0 0 1 0 10h-3"/>'),
  turnR: S('<path d="m15 4 4 4-4 4"/><path d="M19 8h-9a5 5 0 0 0 0 10h3"/>'),
  flipH: S('<path d="M12 3v18"/><path d="M9 7 4 17h5z"/><path d="m15 7 5 10h-5z"/>'),
  flipV: S('<path d="M3 12h18"/><path d="M7 9 17 4v5z"/><path d="m7 15 10 5v-5z"/>'),
  group: S('<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><rect x="6" y="6" width="7" height="6" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/>'),
  ungroup: S('<rect x="3" y="3" width="9" height="8" rx="1"/><rect x="12" y="13" width="9" height="8" rx="1"/>'),
  lock: S('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  unlock: S('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
  chart: S('<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="7"/><rect x="12" y="7" width="3" height="11"/><rect x="17" y="13" width="2" height="5"/>'),
};

function lockBadge(app, sel) {
  const items = app.editor?.selectedItems() || [];
  if (!sel || sel.querySelector('.lockbadge') || !items.length || !items.every((it) => it.locked)) return;
  sel.classList.add('locked');
  const badge = document.createElement('div'); badge.className = 'pw-ui lockbadge'; badge.innerHTML = ICON.lock; sel.appendChild(badge);
}
function watchSelection(app) {
  const pages = document.getElementById('pages'); if (!pages || app._lockWatch) return;
  app._lockWatch = new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.addedNodes) if (n.classList?.contains('sel')) lockBadge(app, n);
  });
  app._lockWatch.observe(pages, { childList: true, subtree: true });
}

const arrange = {
  id: 'arrange',
  when: ({ items, editing }) => !editing && items.length > 0,
  html({ items, t, esc }) {
    const n = items.length, locked = items.every((it) => it.locked);
    const onePic = n === 1 && items[0].type === 'image'; // the picture settings have their own flip buttons
    const flippable = items.some(function f(it) { return it.type === 'group' ? it.items.some(f) : it.type === 'shape' || it.type === 'image'; });
    const btn = (act, key, icon, extra = '') => `<button class="btn" data-arr="${act}"${extra}>${ICON[icon]}${esc(t(key))}</button>`;
    let h = `<div class="parr"><h2>${esc(t('pics.lineUp'))}</h2>`;
    if (locked) h += `<div class="lockline">${ICON.lock}<span>${esc(t('pics.lockedHint'))}</span></div>`;
    h += `<div class="prow seg">${['left', 'center', 'right'].map((k) => `<button class="pbtn" data-al="${k}" data-arr="align" title="${esc(t('pics.align.' + k))}" aria-label="${esc(t('pics.align.' + k))}"${locked ? ' disabled' : ''}>${ICON[k]}</button>`).join('')}
      ${['top', 'middle', 'bottom'].map((k) => `<button class="pbtn" data-al="${k}" data-arr="align" title="${esc(t('pics.align.' + k))}" aria-label="${esc(t('pics.align.' + k))}"${locked ? ' disabled' : ''}>${ICON[k]}</button>`).join('')}</div>
      <p class="hint">${esc(t(n === 1 ? 'pics.alignPage' : 'pics.alignEach'))}</p>`;
    if (!locked) { // turning: a quarter at a time, or to an exact angle (shown clockwise, like other programs)
      const cw = items.map((it) => Math.round(((-angleOf(it) % 360) + 360) % 360 * 10) / 10 % 360);
      const same = cw.every((v) => Math.abs(v - cw[0]) < 0.05);
      h += `<div class="prow wrap parr-turn">${btn('turnL', 'pics.turnL', 'turnL')}${btn('turnR', 'pics.turnR', 'turnR')}
        <label class="field parr-angle" title="${esc(t('obj.angleHint'))}">${esc(t('obj.angle'))} <input id="arrAngle" type="number" inputmode="decimal" min="-360" max="360" step="1" value="${same ? cw[0] : ''}"${same ? '' : ' placeholder="–"'}> °</label></div>
      <p class="hint">${esc(t('obj.turnHint'))}</p>`;
    }
    h += '<div class="prow wrap">';
    if (n >= 3) h += btn('spreadH', 'pics.spreadH', 'spreadH') + btn('spreadV', 'pics.spreadV', 'spreadV');
    if (!locked && flippable && !onePic) h += btn('flipH', 'pics.flipH', 'flipH') + btn('flipV', 'pics.flipV', 'flipV');
    if (n >= 2) h += btn('group', 'pics.group', 'group');
    if (items.some((it) => it.type === 'group')) h += btn('ungroup', 'pics.ungroup', 'ungroup');
    h += btn('lock', locked ? 'pics.unlock' : 'pics.lock', locked ? 'unlock' : 'lock');
    if (n === 1 && items[0].type === 'group' && items[0].chart) h += btn('chart', 'pics.changeChart', 'chart');
    h += '</div></div>';
    return h;
  },
  wire(el, { app, ed, items }) {
    const go = {
      align: (b) => align(app, b.dataset.al), spreadH: () => distribute(app, 'h'), spreadV: () => distribute(app, 'v'),
      turnL: () => rotate(app, 90), turnR: () => rotate(app, -90), flipH: () => flip(app, 'h'), flipV: () => flip(app, 'v'),
      group: () => group(app), ungroup: () => ungroup(app), lock: () => toggleLock(app),
      chart: async () => (await import('../chart.js')).openChart(app, items[0]),
    };
    el.querySelectorAll('[data-arr]').forEach((b) => b.addEventListener('click', () => go[b.dataset.arr]?.(b)));
    const ang = el.querySelector('#arrAngle');
    ang?.addEventListener('change', () => { const v = parseFloat(String(ang.value).replace(',', '.')); if (Number.isFinite(v)) setAngle(app, -v); });
    ang?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ang.blur(); } });
    // a padlock on the selection frame of things that can't be moved (the frame is drawn again often, so watch for it)
    watchSelection(app);
    lockBadge(app, ed.pageEl?.querySelector('.pw-ui.sel'));
  },
};

export default [arrange];
