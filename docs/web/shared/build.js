/*  WHICH BUILD IS ACTUALLY SERVING YOU.
    ---------------------------------------------------------------------
    Every tool here is cache-first: an installed copy keeps serving the
    files it already has until its worker's CACHE name changes. So the
    question a reader asks of a build label is not "what number did the
    source say" but "what is on this device right now", and those are not
    the same question during an update.

    The label used to be a second constant beside the worker's, kept in
    step by hand and checked by the suite. That is a guard rail, and a
    guard rail works until the day somebody moves one and not the other -
    which happened: six apps once displayed the previous build while
    serving the new cache, and the version line lied, which is worse than
    being out of date.

    So the number is no longer written down twice. The page asks the
    worker that is CONTROLLING it, and the worker answers with its own
    CACHE. The worker that replies is by definition the one serving the
    files, so the answer is true even mid-update, when a newer cache
    exists but the older worker is still in charge.

    WHAT IT SAYS WHEN THERE IS NO WORKER. On a first visit, with workers
    unsupported, or from a file:// origin, nothing is controlling the page
    and the files came straight from the network. "not installed" is the
    honest answer, and it is also the useful one: it tells a reader that
    what they are looking at is not what they would get offline.

    FOR TESTS: the marker below is what tests/gate.sh looks for to tell a
    derived label from a literal one. A literal must equal its cache
    version; a derived one has no second number, so there is nothing to
    compare and nothing to drift.

    NOT EVERY APP SHOULD USE THIS. drill fetches its own drill.js from
    the network and reads the BUILD literal out of the file TEXT to notice
    that a newer build exists and heal itself. For that the number must be
    independently readable without running the code, so drill keeps its
    literal and the suite keeps checking it. Derive what must agree;
    where a duplicate has to be readable on its own, keep it and check it.
    --------------------------------------------------------------------- */
var BUILD_FROM_WORKER = true;

/*  Ask the controlling worker for its cache, and call back with
    { cache: 'tides-v7', version: '7' } or null if nothing is in charge.  */
function buildAskWorker(cb) {
  var sw = navigator.serviceWorker;
  if (!sw || !sw.controller || typeof MessageChannel !== 'function') { cb(null); return; }
  var done = false;
  var finish = function (v) { if (!done) { done = true; cb(v); } };
  try {
    var ch = new MessageChannel();
    ch.port1.onmessage = function (e) {
      finish(e.data && e.data.cache ? e.data : null);
    };
    //  A worker that is starting up, or an old one without the handler,
    //  simply never answers; the label must not hang waiting for it.
    setTimeout(function () { finish(null); }, 1500);
    sw.controller.postMessage({ q: 'build' }, [ch.port2]);
  } catch (e) { finish(null); }
}

/*  Write the label into an element. `date` is optional and is the one
    thing still written by hand - it is paired with nothing, so it can
    only be stale, never in disagreement with another value.  */
function buildShow(id, date) {
  var n = document.getElementById(id);
  if (!n) return;
  n.textContent = 'build …';
  buildAskWorker(function (b) {
    n.textContent = b
      ? 'build ' + b.version + (date ? ' — ' + date : '')
      : 'not installed — served from the network';
  });
}
