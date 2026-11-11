// Service worker: the whole point is that this works with no network at sea.
// Cache-first, because none of these files change while you are offshore and
// a network lookup you cannot satisfy is just latency you did not need.
const CACHE = 'colregs-v19'
const FAMILY = 'colregs-';
const FILES = [
  './', './index.html', './colregs.css', './colregs.js',
  './data.js', './contacts.js', './contacts-lessons.js', './contacts-figs.js', './contacts-card.js', './contacts-ex.js',
  './manifest.webmanifest', './icon.svg'
];
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
  e.waitUntil(
    caches.keys()
      //  DELETE ONLY THIS TOOL'S OWN OLD CACHES.  caches.delete() is
      //  ORIGIN-wide, not scope-wide: every tool on bashnav.navigationtools.org
      //  shares one CacheStorage, so "delete everything that is not
      //  mine" had each worker evicting all the others. Visit colregs
      //  then drill and colregs' cache is gone -- and it does not come
      //  back, because install runs once per worker version, so from
      //  then on that tool is silently online-only. On a boat with no
      //  signal that is the whole promise broken.
      //  The family is derived from CACHE rather than written out
      //  again, so there is no second constant to drift.
      .then(ks => Promise.all(ks
            .filter(k => k.indexOf(FAMILY) === 0 && k !== CACHE)
            .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
