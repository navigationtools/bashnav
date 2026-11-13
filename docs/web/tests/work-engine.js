/* work.js as a SHARED ENGINE: the promise, checked.
 *
 *   node docs/web/tests/work-engine.js
 *
 *  The Practical Navigator course embeds a copy of docs/web/tides/work.js
 *  so a lesson can run a worked example inline, offline, without leaving
 *  the page. Two things were promised to it, and neither is the sort of
 *  thing that stays true on its own:
 *
 *    1. a SURFACE it may call -- WORK_SHARED -- which does not change
 *       without a note to its inbox;
 *    2. a BOUNDARY -- WORK_PURE_CALLS -- so that the five calculators in
 *       WORK_PURE_WORK need three trig functions from the tide engine and
 *       nothing else, and the course can supply those in a short shim
 *       instead of shipping 2.9 MB of station data.
 *
 *  This file reads both lists OUT OF work.js rather than keeping its own
 *  copy, so there is one statement of the promise and this is a check on
 *  it rather than a second place to update.
 *
 *  THE BOUNDARY IS CHECKED BY RUNNING, NOT BY READING. A grep for `T.`
 *  would pass a calculator that reaches the engine through a helper, and
 *  would fail on a mention in a comment. So the calculators are run
 *  against a tide engine that is a Proxy: it answers the three allowed
 *  calls and records every other property anybody asks it for. What the
 *  course would do, done here.
 */
'use strict';
var fs = require('fs');
var path = require('path');

var REPO = path.resolve(__dirname, '..', '..', '..');
var WEB  = path.join(REPO, 'docs', 'web', 'tides') + path.sep;
var SRC  = path.join(REPO, 'src', 'tides') + path.sep;

var tabs = require(WEB + 'tables.js');
global.TT_CONST = tabs.TT_CONST; global.TT_SAT = tabs.TT_SAT; global.TT_SHAL = tabs.TT_SHAL;
var TIDE = require(WEB + 'engine.js');
var M = require(WEB + 'work.js');
var WORK = M.WORK;

var fails = 0;
function fail(msg) { console.log('  FAIL ' + msg); fails++; }
function ok(msg) { console.log('  ok   ' + msg); }

/* ---- 1. the surface is exactly what the two lists say ---------------
   A member added to WORK without being put on one side of the line or
   the other is the fault this catches: it would be reachable by the
   course, and nobody would have decided that it should be. */
(function () {
  var have = Object.keys(WORK).sort();
  var want = M.SHARED.concat(M.HOST).sort();
  var extra   = have.filter(function (k) { return want.indexOf(k) < 0; });
  var missing = want.filter(function (k) { return have.indexOf(k) < 0; });
  if (extra.length) fail('WORK exposes ' + extra.join(', ') + ', which is in neither WORK_SHARED nor WORK_HOST');
  if (missing.length) fail('WORK_SHARED/WORK_HOST name ' + missing.join(', ') + ', which WORK does not expose');
  if (!extra.length && !missing.length)
    ok('the surface is exactly ' + M.SHARED.length + ' shared and ' + M.HOST.length + ' host members');
  M.SHARED.forEach(function (k) {
    if (typeof WORK[k] === 'undefined') fail('the course is promised ' + k + ' and it is undefined');
  });
})();

/* ---- the shim: three calls, and a record of anything else asked for -- */
function shim() {
  var reached = [];
  var base = {};
  M.PURE_CALLS.forEach(function (k) { base[k] = TIDE[k]; });
  var p = new Proxy(base, {
    get: function (t, k) {
      if (typeof k !== 'string') return t[k];
      if (M.PURE_CALLS.indexOf(k) >= 0) return t[k];
      if (reached.indexOf(k) < 0) reached.push(k);
      return undefined;
    }
  });
  return { tide: p, reached: reached };
}

/* ---- the cases: every pure case the sameness test runs --------------
   Read out of tests/tides-work.dat, so a case added there is covered
   here too, and filtered to the calculators the boundary names. A case
   that mentions a station is not a pure case whatever its name. */
var CASES = [];
fs.readFileSync(path.join(REPO, 'tests', 'tides-work.dat'), 'utf8').split('\n').forEach(function (L) {
  if (!L || L[0] === '#') return;
  var f = L.split('|');
  if (M.PURE_WORK.indexOf(f[0]) < 0) return;
  if (/station=/.test(f[1] || '')) return;
  CASES.push({ name: f[0], args: f[1] });
});
function params(args) {
  return args === '' ? [] : args.split(/ +/).map(function (kv) {
    var e = kv.indexOf('=');
    return e < 0 ? [kv, ''] : [kv.substr(0, e), kv.substr(e + 1)];
  });
}
function run(c) {
  //  A CALCULATOR THAT REACHES PAST THE BOUNDARY THROWS, because the shim
  //  has nothing to give it. Caught here and turned into a line of text:
  //  the comparison below then reports which case broke and what it asked
  //  for, instead of this file ending in a stack trace that says neither.
  var r;
  try {
    r = WORK.run(c.name, params(c.args), { defStation: '', load: function () { return { err: 'no station' }; },
                                           nowdate: '', nowtime: '' });
  } catch (e) {
    return 'THREW: ' + e.message;
  }
  return r.ok ? r.lines.join('\n') : 'REFUSED: ' + r.msg;
}

/* ---- 2. the five calculators answer with the shim alone, and say the
          same thing they say with the whole engine behind them -------- */
(function () {
  if (!CASES.length) { fail('no pure cases found in tests/tides-work.dat -- is the filter right?'); return; }
  WORK.useTide(TIDE);
  var full = CASES.map(run);
  var sh = shim();
  WORK.useTide(sh.tide);
  var thin = CASES.map(run);
  WORK.useTide(TIDE);

  var differ = 0, first = null;
  for (var i = 0; i < CASES.length; i++) {
    if (full[i] !== thin[i]) { differ++; if (!first) first = CASES[i]; }
  }
  if (differ) fail(differ + ' of ' + CASES.length + ' pure cases print something different with the shim; first: ' +
                   first.name + ' ' + first.args);
  else ok('all ' + CASES.length + ' pure cases print the same working with three engine calls as with the whole engine');

  if (sh.reached.length)
    fail('a pure calculator reached the engine for ' + sh.reached.join(', ') +
         ' -- either the calculator or WORK_PURE_CALLS is wrong');
  else
    ok('and none of them reached past ' + M.PURE_CALLS.join(', '));

  var seen = {};
  CASES.forEach(function (c) { seen[c.name] = 1; });
  var untested = M.PURE_WORK.filter(function (n) { return !seen[n]; });
  if (untested.length)
    fail('WORK_PURE_WORK names ' + untested.join(', ') + ' but no case exercises ' +
         (untested.length === 1 ? 'it' : 'them') + ': the promise is untested for ' + untested.join(', '));
  else ok('every calculator in WORK_PURE_WORK is exercised by at least one case');
})();

/* ---- 3. and the shim really can tell -------------------------------
   A check that cannot fail is not a check. The station-backed side of
   the file must reach past the three calls -- that is WHY it is outside
   the boundary -- so if this passes silently, the Proxy above is not
   watching anything. */
(function () {
  var sh = shim();
  WORK.useTide(sh.tide);
  //  It is EXPECTED to break: the shim answers three calls and nothing
  //  else, and a station-backed calculator needs more than three. The
  //  throw is the proof, so it is caught rather than avoided.
  try {
    WORK.run('atlas', params('station=noaa/8452660 date=2027-03-15 t=00:20'),
             { defStation: '', load: function () { return { err: 'no station' }; }, nowdate: '', nowtime: '' });
  } catch (e) { /* expected */ }
  WORK.useTide(TIDE);
  if (!sh.reached.length)
    fail('a station-backed calculator reached nothing past the three calls, so this check is watching nothing');
  else
    ok('the shim does detect reaching: atlas asks it for ' + sh.reached.join(', '));
})();

console.log(fails ? '\nWORK ENGINE: ' + fails + ' FAILURE(S)' : '\nWORK ENGINE: the shared surface and the engine boundary both hold');
process.exitCode = fails ? 1 : 0;
