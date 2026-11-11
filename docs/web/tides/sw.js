// tides' own cache, scoped to this folder so it and the other tools
// update independently.
//
// stations.dat (2.9 MB) is deliberately NOT in the install list.  A
// single large file in addAll() fails the whole install on a flaky
// connection, and the result is that nothing at all gets cached -- the
// opposite of what a worker is for on a boat.  It is cached on first
// successful fetch instead, and the About screen has a button that
// fetches it with a progress bar.
const CACHE = 'tides-v8'
//  this tool's family, derived from CACHE so there is no second
//  constant to drift out of step with it
const FAMILY = 'tides-';
const FILES = ['./', './index.html', './tides.css', './tides.js',
               './engine.js', './tables.js', './work.js', './stations.idx',
               './manifest.webmanifest', './icon.svg',
               '../shared/build.js'];
const BIG = './stations.dat';
//  WHERE A USER'S OWN SAVED FILE LIVES, AND WHY IT IS NOT IN CACHE.
//
//  stations.dat is not shipped with the app: the reader fetches it
//  deliberately, 2.9 MB behind a progress bar, so that tides works with
//  the antenna down. It therefore belongs to THEM, not to this build.
//
//  It used to be written into the versioned cache, which activate below
//  deletes as soon as a new build arrives. So every update threw the
//  reader's own download away, and nothing put it back: it is not in
//  FILES, so it returns only on a successful network fetch. You update at
//  the dock and the tool is quietly online-only by the time you are out
//  of range - which is the promise this worker exists to keep.
//
//  An unversioned cache fixes it. The name carries no build number, so
//  there is no number to move, and activate is told to leave it alone.
const DATA = FAMILY + 'data';

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
    .then(ks => {
      const old = ks.filter(k => k.indexOf(FAMILY) === 0 &&
                                 k !== CACHE && k !== DATA);
      //  RESCUE BEFORE SWEEP.  Protecting the file from here on would
      //  leave everyone who already has it in a versioned cache about to
      //  lose it on this very update. So the big file is carried out of
      //  the old cache into DATA first, and only then is the old cache
      //  deleted. One update of grace is all anybody gets, so it is taken.
      return caches.open(DATA).then(data => data.match(BIG).then(have => {
        if (have || !old.length) return null;
        return old.reduce(function (chain, k) {
          return chain.then(function (found) {
            return found ? found
              : caches.open(k).then(c => c.match(BIG)).catch(() => null);
          });
        }, Promise.resolve(null))
        .then(r => r ? data.put(BIG, r) : null)
        .catch(() => null);
      }))
      .then(() => Promise.all(old.map(k => caches.delete(k))));
    })
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
            //  into DATA, which survives the next build
            caches.open(DATA).then(c => c.put(url.pathname, copy)).catch(() => {});
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
