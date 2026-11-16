/*  The zero a height is measured from, its provider and its licence, at
    EVERY station: the browser's engine against the awk's (board item B24).

      node docs/web/tests/tides-zero.js [awk]

    The words a student reads are built twice, once in engine.awk and once
    in engine.js.  This opens all 8,334 stations in the browser's engine and
    holds each to the line the awk prints for it, so the two cannot drift at
    a station nobody thought to try.  It also counts the kinds, so a change
    to the station file that moves a station from one kind to another is
    seen here and not on the water.  */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process');
var REPO = path.resolve(__dirname, '..', '..', '..');
var WEB = path.join(REPO, 'docs', 'web', 'tides') + path.sep;
var SRC = path.join(REPO, 'src', 'tides') + path.sep;
var AWK = process.argv[2] || 'mawk';
var tabs = require(WEB + 'tables.js');
global.TT_CONST = tabs.TT_CONST; global.TT_SAT = tabs.TT_SAT; global.TT_SHAL = tabs.TT_SHAL;
var TIDE = require(WEB + 'engine.js');

var ref = cp.execFileSync(AWK, ['-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk',
  '-f', path.join(__dirname, 'tides-zero-ref.awk'), '-v', 'SF=' + SRC + 'stations.dat'],
  { input: '', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);

var ST = {}, order = [];
fs.readFileSync(WEB + 'stations.dat', 'utf8').split('\n').forEach(function (L) {
  if (!L || L[0] === '#') return;
  var st = TIDE.parseStation(L);
  if (st) { ST[st.id] = st; order.push(st.id); }
});
var jd = TIDE.jdate(2025, 5, 24) + 0.5, bad = 0, n = 0, kinds = {};
var A = {};
ref.forEach(function (l) { A[l.split('|')[0]] = l; });
order.forEach(function (id) {
  var st = ST[id], P = TIDE.open(st, st.kind === 'S' ? ST[st.ref] : null, jd);
  if (P.err) return;
  n++;
  var mine = [id, P.zero, P.zeroWords, P.zeroCaution.length, P.provider, P.licence].join('|');
  kinds[P.zero] = (kinds[P.zero] || 0) + 1;
  if (mine !== A[id]) {
    bad++;
    if (bad <= 5) { console.log('  FAIL ' + id); console.log('    awk  |' + A[id] + '|'); console.log('    page |' + mine + '|'); }
  }
});
if (n !== ref.length) { bad++; console.log('  FAIL the page opened ' + n + ' stations, the awk ' + ref.length); }
//  the counts, stated: a station moving between kinds must be a decision
var want = { chart: 3508, computed: 4511, msl: 315 };
Object.keys(want).forEach(function (k) {
  if (kinds[k] !== want[k]) { bad++; console.log('  FAIL ' + (kinds[k] || 0) + ' stations with a zero of kind ' + k + ', wanted ' + want[k]); }
});
console.log('  ' + (n - Math.min(bad, n)) + ' of ' + n + ' stations name the same zero, provider and licence under ' + AWK +
            ' (chart ' + kinds.chart + ', computed ' + kinds.computed + ', mean sea level ' + kinds.msl + ')');
console.log(bad ? bad + ' FAILURES' : 'TIDES ZERO: the page names every zero as the awk does');
process.exit(bad ? 1 : 0);
