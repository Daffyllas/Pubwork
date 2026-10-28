// Counts what people do, for the site owner's Umami dashboard (see the privacy page). Only the action's name
// and a few fixed words (a format, a layout, a template's id) are ever sent: never a file, its name or its text.
const SAFE = /^[\w .:+-]{1,40}$/;
export function track(name, data) {
  try {
    if (typeof window.umami?.track !== 'function') return; // not loaded (blocked, offline, artifact or a test copy)
    const clean = {};
    for (const [k, v] of Object.entries(data || {})) if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && SAFE.test(v))) clean[k] = v;
    window.umami.track(name, Object.keys(clean).length ? clean : undefined);
  } catch { /* counting must never get in the way */ }
}
