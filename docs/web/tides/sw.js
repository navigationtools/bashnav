// tides' own cache, scoped to this folder so it and the other tools
// update independently.
//
// stations.dat (2.9 MB) is deliberately NOT in the install list.  A
// single large file in addAll() fails the whole install on a flaky
// connection, and the result is that nothing at all gets cached -- the
// opposite of what a worker is for on a boat.  It is cached on first
// successful fetch instead, and the About screen has a button that
// fetches it with a progress bar.
const CACHE = 'tides-v2'
//  this tool's family, derived from CACHE so there is no second
//  constant to drift out of step with it
const FAMILY = 'tides-';
const FILES = ['./', './index.html', './tides.css', './tides.js',
               './engine.js', './tables.js', './stations.idx',
               './manifest.webmanifest', './icon.svg'];
const BIG = './stations.dat';

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
  const url = new URL(e.request.url);
  const isBig = url.pathname.endsWith('/stations.dat');

  if (isBig) {
    // A cached copy answers a ranged request in full; the page checks the
    // status and slices the bytes itself, so that is correct and cheap.
    e.respondWith(
      caches.match(new Request(url.pathname)).then(hit => {
        if (hit) return hit;
        return fetch(e.request).then(r => {
          // NEVER store a 206.  A partial response saved under this URL
          // would make every later read return a few hundred bytes of the
          // file, and the failure looks like corrupt data rather than a
          // caching mistake.
          if (r.status === 200) {
            const copy = r.clone();
            caches.open(CACHE).then(c => c.put(url.pathname, copy)).catch(() => {});
          }
          return r;
        });
      })
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(hit => hit ||
    fetch(e.request).catch(() => caches.match('./'))));
});
