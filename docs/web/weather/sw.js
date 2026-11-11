// weather's own cache, scoped to this folder so it and the other tools
// update independently.
//
// The log itself is never cached: it lives in IndexedDB, shared with
// deck-log, and a cache is something the browser may throw away.
//  Bump on any change to a cached file. The worker is cache-first, so an
//  installed copy serves what it already has until THIS file's bytes
//  differ. The page no longer names this string -- it finds the cache by
//  prefix -- so bumping it here is all that is needed.
const CACHE = 'weather-v17'
//  this tool's family, derived from CACHE so there is no second
//  constant to drift out of step with it
const FAMILY = 'weather-';
//  ../shared/ IS PRECACHED TOO. The wind demonstration and the panel
//  stylesheet live one folder up, because the project's front page shows
//  the same live panel and one copy serves both. A file the page loads
//  and the worker does not precache is fetched from the network on first
//  use - fine at the dock, and at sea it is a section of the app that
//  never arrives. tests/sw-precache-check.sh compares these two lists.
const FILES = ['./', './index.html', './weather.css', './weather.js',
               '../shared/demo.css', '../shared/winddemo.js',
               './log.js', './store.js', './wx.js', './score.js',
               './chart.js', './lessons.js',
               './manifest.webmanifest', './icon.svg',
               '../shared/build.js'];
//  EVERY FILE IS FETCHED PAST THE HTTP CACHE, and that is the whole point
//  of this block rather than a plain addAll(FILES).
//
//  GitHub Pages serves every file with  cache-control: max-age=600  -
//  measured, not assumed: ten minutes, and a Fastly edge in front of it
//  with an age of its own. So for ten minutes after a push, addAll() is
//  entitled to fill a brand new cache with the PREVIOUS version's files.
//  The worker would then report its new CACHE name while serving old
//  content, which is worse than being plainly out of date: the version
//  says one thing and the bytes say another, and the one check a reader
//  has - the build line at the foot of the page - would lie to them.
//
//  'reload' bypasses the browser's cache for each fetch and goes to the
//  network. Still all-or-nothing: every response is fetched and checked
//  before anything is written, because a cache half-filled from two
//  versions is the state nothing can diagnose. That was addAll()'s one
//  virtue and it is kept deliberately.
self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all(FILES.map(f => fetch(f, { cache: 'reload' })))
      .then(rs => {
        if (rs.some(r => !r.ok)) {
          throw new Error('precache: a file did not fetch, so nothing is cached');
        }
        return caches.open(CACHE)
                 .then(c => Promise.all(rs.map((r, i) => c.put(FILES[i], r))));
      })
      .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    //  DELETE ONLY THIS TOOL'S OWN OLD CACHES.  caches.delete() is
    //  ORIGIN-wide, not scope-wide: every tool on bashnav.navigationtools.org
    //  shares one CacheStorage, so "delete everything that is not mine"
    //  had each worker evicting all the others.  Visit colregs then
    //  drill and colregs' cache is gone -- and it does not come back,
    //  because install runs once per worker version, so from then on
    //  that tool is silently online-only.  On a boat with no signal
    //  that is the whole promise broken.
    .then(ks => Promise.all(ks
          .filter(k => k.indexOf(FAMILY) === 0 && k !== CACHE)
          .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit ||
    fetch(e.request).catch(() => caches.match('./'))));
});

/*  WHICH BUILD IS SERVING THIS PAGE.  The page no longer keeps a second
    copy of the version to display; it asks whichever worker is actually
    controlling it, and that is this one. Answering with CACHE makes the
    label true even mid-update, when a newer cache exists but this worker
    is still the one in charge. See docs/web/shared/build.js.  */
self.addEventListener('message', e => {
  if (!e.data || e.data.q !== 'build') return;
  const v = CACHE.indexOf(FAMILY) === 0
    ? CACHE.slice(FAMILY.length).replace(/^v/, '')
    : CACHE;
  if (e.ports && e.ports[0]) e.ports[0].postMessage({ cache: CACHE, version: v });
});
