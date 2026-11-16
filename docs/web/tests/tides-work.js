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
//  rbrg() and sgn180(), shared with colregs, loaded as build.sh packs them (B13)
var BEARING = path.join(REPO, 'src', 'common', 'bearing.awk');
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
var help = cp.execFileSync(AWK, ['-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk', '-f', BEARING, '-f', SRC + 'work.awk',
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
  { name: 'cts', args: 'track=045 stw=6 streams=135:1.5 lesson=l1-6 work=cts' }
);

function awkRun(c) {
  var wargs = c.args === '' ? '' : '|' + c.args.split(/ +/).join('|');
  var a = ['-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk', '-f', BEARING, '-f', SRC + 'work.awk',
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
  } else if (F.kind === 'gate') {
    //  the strip is a time line: high water, the turn of the gate and her
    //  own time must all sit on it at ONE scale, read from the answer
    if (!P.hw) { ok = false; why = 'high water is not marked'; }
    else if (Math.abs(P.hw[0] - 320) > 0.6) { ok = false; why = 'high water is not in the middle of the strip'; }
    else if (R.n > 0 && R.ok1 && R.sk1) {
      if (!(P.open && P.shut)) { ok = false; why = 'the gate\'s opening or shutting is not marked'; }
      else {
        var ppm = (P.shut[0] - P.open[0]) / (R.s1 - R.o1);
        if (!(ppm > 0)) { ok = false; why = 'the gate is drawn shutting before it opens'; }
        if (Math.abs(P.open[0] - (P.hw[0] + ppm * (R.o1 - R.hw))) > 0.6) { ok = false; why = 'the opening is not where its time puts it'; }
        if (R.t !== undefined && Math.abs(P.now[0] - (P.hw[0] + ppm * (R.t - R.hw))) > 0.6) { ok = false; why = 'her time is not where the clock puts it'; }
        if (Math.abs(ppm - (640 - 28) / 840) > 0.001) { ok = false; why = 'the strip is not seven hours either side of high water'; }
      }
    }
    if (R.t !== undefined && !P.now) { ok = false; why = 'her time is not marked'; }
    //  an open rectangle for every window in view, and none when it is shut throughout
    var nopen = (svg.match(/class="g-open"/g) || []).length;
    if (R.n === 0 && nopen !== 0) { ok = false; why = 'a gate that is shut throughout is drawn open'; }
    if (R.n > 0 && nopen < R.n) { ok = false; why = 'a window the answer gives is not drawn'; }
    if (F.atl && (svg.match(/class="g-(fair|foul)"/g) || []).length !== F.pages.filter(function (p) { return p.m >= F.hw - 420 && p.m <= F.hw + 420; }).length) {
      ok = false; why = 'the bars are not one for each page';
    }
  } else if (F.kind === 'lunar') {
    //  the strip is thirty days at one scale, the day in the middle; every
    //  mark is placed from the answer, not from the figure's own numbers.
    //  With bars, a margin of 112 on the right holds the guide lines'
    //  labels (Larry, ADJ), so the strip is 14 to 528, otherwise 14 to 626
    var LR = F.bars.length > 0 ? 112 : 14, ppd = (640 - 14 - LR) / 30, MID = 14 + 15 * ppd;
    var all = function (name) {
      var o = [], re = new RegExp('data-pt="' + name + '" cx="([-0-9.]+)"', 'g'), m;
      while ((m = re.exec(svg))) o.push(+m[1]);
      return o;
    };
    var pname = function (q) { return q === 0 ? 'new' : q === 180 ? 'full' : 'quarter'; };
    var hasAt = function (list, x, tol) { return list.some(function (v) { return Math.abs(v - x) <= tol; }); };
    var xOfHour = function (h) { return MID + (h * 60 - R.tmin) / 1440 * ppd; };
    if (!P.day) { ok = false; why = 'the day is not marked'; }
    else if (Math.abs(P.day[0] - MID) > 0.6) { ok = false; why = 'the day is not in the middle of the strip'; }
    //  a phase is given to the hour, so its mark may sit half an hour off
    else if (!hasAt(all(pname(R.pq)), xOfHour(R.ph), 1.1)) { ok = false; why = 'the last phase of the Moon is not where its time puts it'; }
    else if (!hasAt(all(pname(R.nq)), xOfHour(R.nh), 1.1)) { ok = false; why = 'the next phase of the Moon is not where its time puts it'; }
    else {
      //  the rule's band starts a day after its phase and is a day wide
      var bands = [], reb = /class="l-(spr|np)" x="([-0-9.]+)" y="[0-9.]+" width="([-0-9.]+)"/g, mb;
      while ((mb = reb.exec(svg))) bands.push([mb[1], +mb[2], +mb[3]]);
      var want = (R.pq === 0 || R.pq === 180) ? 'spr' : 'np';
      if (!bands.some(function (b) { return b[0] === want && Math.abs(b[1] - (xOfHour(R.ph) + ppd)) <= 1.1 && Math.abs(b[2] - ppd) <= 0.1; })) {
        ok = false; why = 'the rule\'s band for the last phase is not a day after it and a day wide';
      }
    }
    //  the drawing ends with its dates: no empty band between it and its key
    if (ok) {
      var vbH = +svg.match(/viewBox="0 0 [0-9.]+ ([0-9.]+)"/)[1], tyMax = 0, rty = /<text x="[-0-9.]+" y="([-0-9.]+)"/g, mty;
      while ((mty = rty.exec(svg))) tyMax = Math.max(tyMax, +mty[1]);
      if (vbH - tyMax > 20) { ok = false; why = 'the figure runs on ' + Math.round(vbH - tyMax) + ' below its dates'; }
    }
    if (ok && svg.indexOf(F.label.replace(/&/g, '&amp;')) < 0) { ok = false; why = 'the day\'s label is not drawn'; }
    if (ok && R.coef !== undefined && (/brhwh=/.test(c.args) || /brest-3-fra-refmar/.test(c.args)) &&
        F.label.indexOf('coefficient ' + R.coef + ' = 100') < 0) { ok = false; why = 'the day\'s label does not carry the coefficient\'s working'; }
    var nbar = (svg.match(/class="l-bar( l-day)?"/g) || []).length, nday = (svg.match(/class="l-bar l-day"/g) || []).length;
    if (ok && nbar !== F.bars.length) { ok = false; why = 'the bars are not one for each tide'; }
    if (ok && F.st && (F.bars.length < 50 || nday !== 1)) { ok = false; why = 'a month of tides is not drawn, or the day\'s tide is not marked'; }
    if (ok && !F.st && nbar !== 0) { ok = false; why = 'bars are drawn with no station to predict them'; }
    //  no label may stand over a bar: a label there hid the bars' tops,
    //  so a month of making tides read as flat (fault found by Larry).
    //  The labels stand in the margin, one for each line, clear of each other
    if (ok && nbar > 0) {
      var bright = 0, rbx = /class="l-bar[^"]*" x="([-0-9.]+)" y="[-0-9.]+" width="([-0-9.]+)"/g, mx;
      while ((mx = rbx.exec(svg))) bright = Math.max(bright, +mx[1] + +mx[2]);
      var rlx = /<text x="([-0-9.]+)" y="([-0-9.]+)" class="[^"]*"( text-anchor="([a-z]+)")?>(\d+ )?mean (springs|neaps)</g, ml, nl = 0, ly2 = [], two = false, lxs = '';
      while ((ml = rlx.exec(svg))) {
        nl++; ly2.push(+ml[2]); lxs = ml[1]; if (!ml[5]) two = true;
        if (+ml[1] < bright || ml[4] !== 'start') { ok = false; why = 'a guide line\'s label stands over the bars'; }
      }
      //  a station's label is two lines, its name and then its height in metres
      var nm = (svg.match(new RegExp('<text x="' + lxs.replace('.', '\\.') + '"[^>]*text-anchor="start">[-0-9.]+ m<', 'g')) || []).length;
      if (ok && two && nm !== nl) { ok = false; why = 'a station\'s guide line is labelled without its height'; }
      if (ok && nl !== F.lines.length) { ok = false; why = 'a guide line has no label in the margin beside the bars'; }
      if (ok && nl === 2 && Math.abs(ly2[0] - ly2[1]) < (two ? 27 : 13)) { ok = false; why = 'the two guide lines\' labels stand on each other'; }
    }
    if (ok && R.fpm !== undefined && !hasAt(all((R.pq === 0 || R.pq === 180) ? 'biggest' : 'smallest'), MID + (R.fpm - R.tmin) / 1440 * ppd, 0.6)) {
      ok = false; why = 'the tide found near the last phase is not where its time puts it';
    }
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
//  Lesson names: Larry's decision of 11 November 2026. l1-3 for Level 1,
//  which both race years share; l3-2025-4 for Levels 2 to 5, one track per
//  year. The page is the name without its lesson number, so there is no
//  table of pages to keep in step. Each refusal below is here because
//  accepting it would give one lesson two names, or put something from
//  the URL into an href.
var want = [
  //  built
  ['l1-3', M.COURSE_BASE + 'l1.html#l1-3'],
  ['l1-12', M.COURSE_BASE + 'l1.html#l1-12'],
  ['l2-2025-1', M.COURSE_BASE + 'l2-2025.html#l2-2025-1'],
  ['l3-2025-4', M.COURSE_BASE + 'l3-2025.html#l3-2025-4'],
  ['l5-2027-10', M.COURSE_BASE + 'l5-2027.html#l5-2027-10'],
  //  the old names, now gone: a stale link must fail visibly
  ['a6-2', null], ['c9-14', null],
  //  one lesson, one name
  ['l1-2025-3', null],   // Level 1 is shared by both years: no year in its name
  ['l3-4', null],        // Levels 2 to 5 run per year: the year is not optional
  ['l1-03', null],       // a leading zero would be a second name for l1-3
  ['l1-0', null],        // there is no lesson zero
  //  not a lesson name at all
  ['l6-1', null], ['l0-1', null], ['l3a-4', null], ['l3-25-4', null],
  ['L3-2025-4', null], ['l3-2025', null], ['l3-2025-', null], ['l1-', null],
  ['l1', null], ['l1-3x', null], ['l1 -3', null],
  //  nothing from the URL reaches an href
  ['l1-3"><script>', null], ['javascript:alert(1)', null],
  ['l1-3#../../etc', null], ['', null], [undefined, null]
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
