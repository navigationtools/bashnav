/* =====================================================================
   The launcher.  No framework, no build step; this file is the app.

   The tile list is the single source of truth for what exists.  A tool
   ships by flipping `ready` to true once its folder is published - the
   launcher needs no other edit, and a tool that is not ready renders as
   plainly unavailable rather than as a link that goes nowhere.
   ===================================================================== */
var TOOLS = [
  { id: 'celnav',   name: 'celnav',   ver: '1.6',
    /*  SIGHT REDUCTION FIRST. The tile led with camera sight because that
        was the whole of the app when it was written; celnav is a sight
        reduction calculator first, a teaching track second, and the camera
        is the third way of getting an altitude into it.  */
    desc: 'Sight reduction, the fix, and 33 lessons', ready: true },
  { id: 'colregs',  name: 'colregs',  ver: '1.15',
    desc: 'Lights, shapes, sounds and the rules of the road', ready: true },
  { id: 'tides',    name: 'tides',    ver: '1.1',
    desc: 'Harmonic prediction, 8,334 stations', ready: true },
  { id: 'weather',  name: 'weather',  ver: '1.0',
    desc: 'Read your own barometer', ready: true },
  { id: 'deck-log', name: 'deck-log', ver: '1.1',
    desc: "The boat's records: deck, engine, provisions", ready: true },
  { id: 'drill',    name: 'drill',    ver: '1.0',
    desc: 'Study machine \u2014 load your own material', ready: true }
];

function $(id) { return document.getElementById(id); }

/*  The display modes, as a list rather than a branch.  Adding a fourth
    palette - a high-contrast day, say - is one entry here and one block in
    the stylesheet, and touches no logic.  */
var MODES = ['day', 'dark', 'night'];
var MODE_KEY = 'visual-mode';   /* one name for the whole suite, so a mode set
                                   in one tool is the mode in the next, and in
                                   the course pages that embed them */

/*  night is the default: a tool opened on deck must not start bright.  */
function savedMode() {
  var s = null;
  try { s = localStorage.getItem(MODE_KEY); } catch (e) {}
  return MODES.indexOf(s) >= 0 ? s : 'night';
}

/*  Only night -> day is guarded.  Going darker is never harmful; going
    bright when dark-adapted costs about twenty minutes, so that one change
    takes a deliberate half second and can be released to cancel.  */
function wireModes() {
  var btns = document.querySelectorAll('#modes .mb');
  var HOLD_MS = 500, holdT = null, holdB = null;
  function guarded(m) {
    return m === 'day' &&
           document.documentElement.getAttribute('data-mode') === 'night';
  }
  function cancelHold() {
    if (holdT) clearTimeout(holdT);
    holdT = null;
    if (holdB) holdB.classList.remove('holding');
    holdB = null;
  }
  for (var i = 0; i < btns.length; i++) {
    (function (btn) {
      var m = btn.getAttribute('data-mode');
      btn.addEventListener('pointerdown', function (e) {
        if (!guarded(m)) return;
        e.preventDefault();
        holdB = btn; btn.classList.add('holding');
        holdT = setTimeout(function () { cancelHold(); setMode(m); }, HOLD_MS);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        btn.addEventListener(ev, cancelHold);
      });
      btn.addEventListener('click', function (e) {
        if (guarded(m)) { e.preventDefault(); return; }   /* the hold does it */
        setMode(m);
      });
      /*  A keyboard activation is already deliberate, so it is not held. */
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode(m); }
      });
    })(btns[i]);
  }
}

function setMode(m) {
  if (MODES.indexOf(m) < 0) m = 'night';
  document.documentElement.setAttribute('data-mode', m);
  var mbs = document.querySelectorAll('#modes .mb');
  for (var mi = 0; mi < mbs.length; mi++)
    mbs[mi].setAttribute('aria-pressed',
      String(mbs[mi].getAttribute('data-mode') === m));
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content',
      getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
      || '#060101');
  try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* private mode */ }
}

function tiles() {
  var box = $('tiles');
  TOOLS.forEach(function (t) {
    var el = document.createElement(t.ready ? 'a' : 'div');
    el.className = 'tile';
    if (t.ready) { el.href = t.id + '/'; }
    else { el.setAttribute('aria-disabled', 'true'); }

    var img = document.createElement('img');
    img.src = 'icons/' + t.id + '.svg'; img.alt = '';
    var tx = document.createElement('div');
    var b = document.createElement('b'); b.textContent = t.name;
    var s = document.createElement('span'); s.textContent = t.desc;
    tx.appendChild(b); tx.appendChild(s);
    el.appendChild(img); el.appendChild(tx);

    if (!t.ready) {
      var tag = document.createElement('span');
      tag.className = 'soon'; tag.textContent = 'NOT YET';
      el.appendChild(tag);
    }
    box.appendChild(el);
  });
}

window.addEventListener('DOMContentLoaded', function () {
  setMode(savedMode());
  wireModes();

  tiles();

  var ready = TOOLS.filter(function (t) { return t.ready; }).length;
  $('ver').textContent = ready + ' of ' + TOOLS.length +
    ' tools published. The rest are being built.';

  /* Add to Home Screen is a Safari function; inside another app's web
     view the menu item does not exist, and saying so beats the user
     hunting for it. */
  var standalone = window.navigator.standalone === true ||
                   window.matchMedia('(display-mode: standalone)').matches;
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !standalone && window.navigator.standalone === undefined) {
    $('warn').textContent = 'This looks like an in-app browser rather than Safari. ' +
      'Add to Home Screen only exists in Safari itself — open this page there.';
    $('warn').hidden = false;
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    /*  updateViaCache: 'none' IS THE OTHER HALF OF THE SAME FAULT.
        A browser only checks sw.js for updates on navigation, and that check
        goes through the HTTP cache unless the previous script's max-age was
        over 24 hours. GitHub Pages sends max-age=600, so for ten minutes
        after a push the browser compares the new sw.js against a CACHED COPY
        of the old one, sees no difference, and installs nothing. "Open it
        once with a signal" is then a no-op that looks exactly like the app
        being stuck - which is what it looked like.  */
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
  }
});
