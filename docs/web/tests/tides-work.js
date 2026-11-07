/* The work calculators: the browser port against the awk tool.

   The awk is the reference -- its numbers are held to an independent
   Python working by tests/tides-work-check.awk -- so the only question
   here is SAMENESS: does work.js print the same working, character for
   character, for the same input?  That covers every number, every
   rounding (fx() against C's printf on exact ties), every refusal
   message and where the figure goes (@@FIG).

   Then the drawings, which the text cannot see: each SVG figure is read
   back through its data-pt marks and checked against the geometry it
   claims -- the triangle closes, the ground track lies along the track,
   one scale both ways -- and the lesson link is checked for what it
   builds and what it refuses.

     node docs/web/tests/tides-work.js [awk]
*/
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var REPO = path.resolve(__dirname, '..', '..', '..');
var WEB = path.join(REPO, 'docs', 'web', 'tides') + path.sep;
var SRC = path.join(REPO, 'src', 'tides') + path.sep;
var tabs = require(WEB + 'tables.js');
global.TT_CONST = tabs.TT_CONST; global.TT_SAT = tabs.TT_SAT; global.TT_SHAL = tabs.TT_SHAL;
var TIDE = require(WEB + 'engine.js');
var M = require(WEB + 'work.js'), WORK = M.WORK;
WORK.useTide(TIDE);
var AWK = process.argv[2] || 'mawk';

// ---- the station file, for the station-backed calculators ------------
var LINES = {};
fs.readFileSync(SRC + 'stations.dat', 'utf8').split('\n').forEach(function (L) {
  if (!L || L[0] === '#') return;
  LINES[L.split('|')[1]] = L;
});
function load(id) {
  if (!LINES[id]) return { err: 'no station with that id' };
  var st = TIDE.parseStation(LINES[id]);
  if (st.kind !== 'S') return { st: st, ref: null };
  if (!LINES[st.ref]) return { err: 'its reference station is missing' };
  var ref = TIDE.parseStation(LINES[st.ref]);
  if (ref.kind !== 'R') return { err: 'its reference station is not a reference station' };
  return { st: st, ref: ref };
}

// ---- the cases: every worked case, every help example, and a few more -
var CASES = [];
fs.readFileSync(path.join(REPO, 'tests', 'tides-work.dat'), 'utf8').split('\n').forEach(function (L) {
  if (!L || L[0] === '#') return;
  var f = L.split('|');
  CASES.push({ name: f[0], args: f[1] });
});
var help = cp.execFileSync(AWK, ['-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk', '-f', SRC + 'work.awk',
  '-v', 'cmd=work', '-v', 'wname=help', '-v', 'cmode=plain'], { input: '', encoding: 'utf8' });
var nex = 0;
help.split('\n').forEach(function (L) {
  var m = L.match(/^    tides work (\S+) (.*)$/);
  if (m) { CASES.push({ name: m[1], args: m[2] }); nex++; }
});
//  the page's own examples must be the help's examples
Object.keys(WORK.EXAMPLES).forEach(function (k) {
  if (help.indexOf('tides work ' + k + ' ' + WORK.EXAMPLES[k]) < 0) {
    console.log('  FAIL the page\'s example for ' + k + ' is not the one `tides work help` prints');
    process.exitCode = 1;
  }
});
CASES.push(
  // twelfths of 0.125 m: an exact tie at two decimals, where toFixed and printf disagree
  { name: 'twelfths', args: 'lw=00:00 lwh=0 hw=06:00 hwh=1.5 t=01:00' },
  { name: 'twelfths', args: 'lw=00:00 lwh=0.625 hw=05:00 hwh=2.125 t=04:45' },
  // the defaults: station, date and time from "now", in the station's standard time
  { name: 'atlas', args: '', def: 'ticon/dover-dov-gbr-bodc', now: ['2026-11-07', '09:31'] },
  { name: 'twelfths', args: 'station=noaa/8452660', now: ['2026-08-30', '23:50'] },
  { name: 'atlas', args: 'station=noaa/8452660 date=2027-03-15 t=00:20' },
  { name: 'twelfths', args: 'station=ticon/albany-62120-aus-bom date=2024-02-29 t=11:11' },
  { name: 'cts', args: 'track=000 stw=4 streams=270:1,280:1.5,290:2,300:1.5 leeway=10 wind=stbd var=12.5 dev=-3 dist=20' },
  { name: 'setdrift', args: 'start=41.30,-71.90 co=0 stw=5 hours=2 fix=41.30,-71.90' },
  { name: 'stream', args: 'spr=1 nps=2 range=3 sprange=4 nprange=2' },
  { name: 'secondary', args: 'lw=23:50 lwh=0.5 mlwn=2.1 mlws=0.8 dlwn=0.2 dlws=0.1 tlw1=0300 tdlw1=-25 tlw2=0900 tdlw2=15' },
  { name: 'cts', args: 'track=045 stw=6 streams=135:1.5 lesson=a6-2 work=cts' }
);

function awkRun(c) {
  var wargs = c.args === '' ? '' : '|' + c.args.split(/ +/).join('|');
  var a = ['-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk', '-f', SRC + 'work.awk',
           '-v', 'cmd=work', '-v', 'wname=' + c.name, '-v', 'wargs=' + wargs, '-v', 'nofig=1',
           '-v', 'cmode=plain', '-v', 'SF=' + SRC + 'stations.dat', '-v', 'defstation=' + (c.def || '')];
  if (c.now) a.push('-v', 'nowdate=' + c.now[0], '-v', 'nowtime=' + c.now[1]);
  var r = cp.spawnSync(AWK, a, { input: '', encoding: 'utf8' });
  return { out: r.stdout, status: r.status, stderr: r.stderr };
}
function jsRun(c) {
  var params = c.args === '' ? [] : c.args.split(/ +/).map(function (kv) {
    var e = kv.indexOf('=');
    return e < 0 ? [kv, ''] : [kv.substr(0, e), kv.substr(e + 1)];
  });
  //  a pair with no '=' is a refusal in the awk; the page never sees one,
  //  because a URL always has key=value, so it is skipped here
  var r = WORK.run(c.name, params, { defStation: c.def || '', load: load,
    nowdate: c.now ? c.now[0] : '', nowtime: c.now ? c.now[1] : '' });
  r.text = r.ok ? r.lines.join('\n') + '\n\n' : r.msg + '\n';
  return r;
}

var bad = 0, same = 0, refused = 0, JS = {};
CASES.forEach(function (c, i) {
  var a = awkRun(c), j = jsRun(c);
  JS[i] = j;
  if (a.stderr) { bad++; console.log('  FAIL awk wrote to stderr for ' + c.name + ' ' + c.args + ': ' + a.stderr.trim()); return; }
  var wantStatus = j.ok ? 0 : 2;
  if (a.status !== wantStatus) { bad++; console.log('  FAIL exit status ' + a.status + ', the page says ' + (j.ok ? 'answered' : 'refused') + ': ' + c.name + ' ' + c.args); }
  if (a.out === j.text) { same++; if (!j.ok) refused++; return; }
  bad++;
  console.log('  FAIL ' + c.name + ' ' + c.args);
  var A = a.out.split('\n'), B = j.text.split('\n');
  for (var k = 0, shown = 0; k < Math.max(A.length, B.length) && shown < 4; k++) {
    if (A[k] !== B[k]) { console.log('    awk |' + A[k] + '|'); console.log('    js  |' + B[k] + '|'); shown++; }
  }
});
console.log('  ' + same + ' of ' + CASES.length + ' cases print the same working under ' + AWK +
            ' (' + refused + ' of them refusals, ' + nex + ' help examples)');

// ---- the drawings, read back -----------------------------------------
function pts(svg) {
  var o = {}, re = /data-pt="([a-z]+)" cx="([-0-9.]+)" cy="([-0-9.]+)"/g, m;
  while ((m = re.exec(svg))) o[m[1]] = [+m[2], +m[3]];
  return o;
}
function brgOf(a, b) {   // screen y grows downward; north is up
  var d = Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / Math.PI;
  return (d + 360) % 360;
}
function adiff(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
function len(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
var figs = 0;
CASES.forEach(function (c, i) {
  var j = JS[i];
  if (!j.ok || !j.fig) return;
  var svg = WORK.figure(j);
  if (j.lines.indexOf('@@FIG') >= 0 && j.fig.kind !== 'atlas' && !(j.fig.kind === 'cts' && !j.fig.ok) && !svg) {
    bad++; console.log('  FAIL no figure drawn for ' + c.name + ' ' + c.args); return;
  }
  if (!svg) return;
  if (/NaN|undefined|Infinity/.test(svg)) { bad++; console.log('  FAIL the figure carries NaN for ' + c.name + ' ' + c.args); return; }
  var P = pts(svg), F = j.fig, R = j.res, ok = true, why = '';
  if (F.kind === 'cts') {
    //  S -> T is the summed stream, T -> E the water track, S -> E the track
    var sc = len(P.start, P.tide) / R.drift;
    if (adiff(brgOf(P.start, P.tide), R.set) > 0.6) { ok = false; why = 'stream drawn on the wrong bearing'; }
    if (adiff(brgOf(P.tide, P.end), R.water) > 0.6) { ok = false; why = 'water track drawn on the wrong bearing'; }
    if (adiff(brgOf(P.start, P.end), F.track) > 0.6) { ok = false; why = 'the ground track is not along the track'; }
    var W = +(c.args.match(/stw=([0-9.]+)/)[1]) * F.n;
    if (Math.abs(len(P.tide, P.end) / sc - W) > 0.03 * W) { ok = false; why = 'water vector is not ' + W + ' nm at the stream\'s scale'; }
    if (Math.abs(len(P.start, P.end) / sc - R.mg) > 0.03 * R.mg) { ok = false; why = 'ground vector is not the distance made good'; }
  } else if (F.kind === 'setdrift') {
    if (R.drift >= 0.05 && adiff(brgOf(P.dr, P.fix), R.set) > 0.6) { ok = false; why = 'set drawn on the wrong bearing'; }
    var s2 = len(P.start, P.dr) / Math.hypot(F.D[0], F.D[1]);
    if (R.drift >= 0.05 && Math.abs(len(P.dr, P.fix) / s2 - R.drift) > 0.03 * R.drift) { ok = false; why = 'drift drawn at another scale from the DR'; }
  } else if (F.kind === 'twelfths') {
    //  the twelfths answer must sit on the drawn time line, above or below
    //  the cosine answer as the numbers say
    if (Math.abs(P.twelfths[0] - P.cosine[0]) > 0.01) { ok = false; why = 'the two answers are not at the same time'; }
    if ((R.t12 - R.tcos) * (P.cosine[1] - P.twelfths[1]) < -1e-9) { ok = false; why = 'twelfths and cosine drawn the wrong way up'; }
  } else if (F.kind === 'stream') {
    if (!(P.today && P.neaps && P.springs)) { ok = false; why = 'a point is missing'; }
    else {
      //  today's point lies on the line through neaps and springs, unless clamped
      var t = (P.today[0] - P.neaps[0]) / (P.springs[0] - P.neaps[0]);
      var y = P.neaps[1] + t * (P.springs[1] - P.neaps[1]);
      if (!R.clamp && Math.abs(y - P.today[1]) > 0.6) { ok = false; why = 'today\'s rate is off the neap-spring line'; }
    }
  }
  figs++;
  if (!ok) { bad++; console.log('  FAIL figure for ' + c.name + ' ' + c.args + ': ' + why); }
});
console.log('  ' + figs + ' figures read back against their geometry');

// ---- the lesson link -------------------------------------------------
var L = WORK.lessonHref;
var want = [
  ['a6-2', M.COURSE_BASE + 'a6.html#a6-2'], ['c9-14', M.COURSE_BASE + 'c9.html#c9-14'],
  ['d1-1', null], ['a6', null], ['A6-2', null], ['a6-2x', null], ['a6-', null], ['a10-2', null],
  ['a6-2"><script>', null], ['javascript:alert(1)', null], ['', null], [undefined, null]
];
var lb = 0;
want.forEach(function (w) { if (L(w[0]) !== w[1]) { lb++; console.log('  FAIL lesson=' + w[0] + ' gave ' + L(w[0])); } });
if (M.COURSE_BASE !== 'https://bashnav.navigationtools.org/practical-navigator/coastal/') { lb++; console.log('  FAIL COURSE_BASE is ' + M.COURSE_BASE); }
bad += lb;
console.log('  ' + (want.length - lb) + ' of ' + want.length + ' lesson values built or refused as they should be');

// ---- printf's rounding, on the ties the calculators can meet --------
var ties = [[0.125, 2, '0.12'], [0.375, 2, '0.38'], [2.5, 0, '2'], [3.5, 0, '4'], [-0.125, 2, '-0.12'], [1.25, 1, '1.2']];
ties.forEach(function (t) { if (WORK.fx(t[0], t[1]) !== t[2]) { bad++; console.log('  FAIL fx(' + t[0] + ',' + t[1] + ') = ' + WORK.fx(t[0], t[1])); } });

console.log(bad ? bad + ' FAILURES' : 'TIDES WORK: the port agrees with the awk');
process.exit(bad ? 1 : 0);
