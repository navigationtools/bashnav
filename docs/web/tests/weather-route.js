/*  Routing (weather 1.0.21, lesson `routing`; gap list W35; Larry, TAYO).

    1. THE MODEL, THE BROWSER'S AGAINST THE AWK'S, character for character:
       `weather` cmd=routedump prints the hours to make good 845 displacements
       in five winds, what 162 places cost on the beat and the reach, the
       worked times, the lane widths, the all-in table and the lesson's
       three tables; WX.rtG, rtCost, rtWidth, rtAllin and rtHm must print
       the same.  The terminal's figures and the browser's are both drawn
       from it.

    2. THE MODEL AGAINST ARITHMETIC DONE HERE, not by either build: a mile
       an hour at each of the boat's speeds takes an hour; twice as far
       takes twice as long; port and starboard mirror; no dog-leg is faster
       than the straight course (1,000 triangles); the beat is 12 miles at
       6 cos 45; a place on the route costs nothing and no place costs less;
       a veer for the boat on the right is a back for the boat on the left.

    3. THE SEVEN FIGURES, read back off the drawing, night and day:
         rtfan      each isochrone is the boat's outline times its hours;
                    the finish is 22.5 miles on 075, on the third; the
                    route's points lie on the first and second
         rthorizon  ten columns, each as tall as its NOAA figure; the
                    horizon stands between day 5 and day 6
         rtlane     every point of each lane's edge costs ten minutes; the
                    widths written are the widths measured; on the reach
                    the lines touch a third and two thirds of the way
         rtmotor    the boards drawn add up to the miles written; the
                    straight line is 12; the extra miles are the difference
         rtallin    the nine times in the table are the model's; each boat's
                    track starts at the start, passes her one-hour mark and
                    ends at the finish; the minutes up and down are the table's
         rtscale    each bar is the GRIB's 20 knots plus the scaling; the
                    stream's too
         rtwhatif   each bar is the time going right at that speed; the
                    three times written are the model's; going right is the
                    fastest at every speed; the veer stands an hour in on
                    every bar; the spread is the first less the last
       Colours from the page; nothing outside the box.

    4. THE LESSON'S WORDS carry the figures' numbers.

    5. THE CHECKER IS SHOWN TO CATCH THINGS: seven planted faults, one in
       each figure.

      node weather-route.js   (needs the server on $PORT)  */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
const REPO = path.resolve(__dirname, '..', '..', '..');
const W = path.resolve(__dirname, '..');
global.LOG = require(path.join(W, 'deck-log', 'log.js'));
const WX = require(path.join(W, 'weather', 'wx.js'));
const RT = WX.RT;

let checks = 0, bad = 0;
function ok(what, cond, note) {
  checks++;
  if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); }
}
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-9);

/* ---- 1. the model, against the awk ----------------------------------- */
const ENG = ['log.awk', 'colour.awk'].map(f => REPO + '/src/common/' + f)
  .concat(['grid.awk', 'wx.awk', 'score.awk', 'chart.awk', 'teach.awk', 'screens.awk'].map(f => REPO + '/src/weather/' + f));
const AWK = process.env.AWK || 'mawk';
const args = ['-v', 'cmode=plain', '-v', 'cmd=routedump', '-v', 'LOG=/dev/null'];
ENG.forEach(f => args.push('-f', f));
const want = execFileSync(AWK, args, { input: '', encoding: 'utf8' });
let got = '';
for (let w = -20; w <= 20; w += 10)
  for (let y = 24; y >= -24; y -= 4)
    for (let x = -24; x <= 24; x += 4) got += 'g ' + x + ' ' + y + ' ' + w + ' ' + WX.rtG(x, y, w).toFixed(4) + '\n';
for (let y = 14; y >= -2; y -= 2)
  for (let x = -8; x <= 8; x += 2)
    got += 'c ' + x + ' ' + y + ' ' + WX.rtCost(x, y, 0, RT.BEAT).toFixed(4) + ' ' + WX.rtCost(y + 6, x, RT.REACH, 0).toFixed(4) + '\n';
const R75 = 75 * Math.PI / 180, FX = 22.5 * Math.sin(R75), FY = 22.5 * Math.cos(R75);
got += 't ' + WX.rtHm(WX.rtG(RT.REACH, 0, 0)) + ' ' + WX.rtHm(WX.rtG(0, RT.BEAT, 0)) + ' ' + WX.rtHm(WX.rtG(FX, FY, 0)) + '\n';
got += 'w ' + WX.rtWidth(RT.REACH, 0, RT.LANE).toFixed(1) + ' ' + WX.rtWidth(0, RT.BEAT, RT.LANE).toFixed(1) + '\n';
[0, 0.5, 1].forEach(a => { got += 'a ' + a.toFixed(1) + ' ' + WX.rtHm(WX.rtAllin(a, RT.SHIFT)) + ' ' + WX.rtHm(WX.rtAllin(a, 0)) + ' ' + WX.rtHm(WX.rtAllin(a, -RT.SHIFT)) + '\n'; });
RT.HZ.forEach(h => { got += 'h ' + h.join(' ') + '\n'; });
RT.SC.forEach(s => { got += 's ' + s[0] + ' ' + s[1].toFixed(2) + ' ' + (20 * s[1]).toFixed(0) + '\n'; });
got += 's stream ' + RT.CUR.toFixed(2) + ' ' + (2 * RT.CUR).toFixed(1) + '\n';
RT.K.forEach(k => { got += 'k ' + k.toFixed(1) + ' ' + WX.rtHm(WX.rtAllinK(1, RT.SHIFT, k)) + ' ' + WX.rtHm(WX.rtAllinK(0.5, RT.SHIFT, k)) + ' ' + WX.rtHm(WX.rtAllinK(0, RT.SHIFT, k)) + '\n'; });
const nLines = want.split('\n').filter(Boolean).length;
ok('the awk dumps the model: 941 lines', nLines === 941, String(nLines));
if (got !== want) {
  const a = got.split('\n'), b = want.split('\n');
  const i = a.findIndex((l, k) => l !== b[k]);
  ok('the browser\'s model is the awk\'s, character for character', false, 'js |' + a[i] + '| awk |' + b[i] + '|');
} else ok('the browser\'s model is the awk\'s, character for character (' + AWK + ')', true);

/* ---- 2. the model, against arithmetic done here ---------------------- */
{
  const RAD = Math.PI / 180;
  let e = 0;
  RT.A.forEach((a, i) => { [1, -1].forEach(s => { if (!near(WX.rtG(s * RT.S[i] * Math.sin(a * RAD), RT.S[i] * Math.cos(a * RAD), 0), 1, 1e-9)) e++; }); });
  ok('an hour at each of her sixteen speeds makes good an hour\'s run', e === 0, e + ' off');
  ok('dead upwind she makes good 6 cos 45, by tacking', near(WX.rtG(0, 6 * Math.cos(45 * RAD), 0), 1, 1e-9));
  ok('dead downwind she makes good 7 cos 30, by gybing', near(WX.rtG(0, -7 * Math.cos(30 * RAD), 0), 1, 1e-9));
  ok('the beat of 12 miles takes 12 / (6 cos 45) hours', near(WX.rtG(0, RT.BEAT, 0), 12 / (6 * Math.cos(45 * RAD)), 1e-9));
  ok('the reach of 24 miles takes 3 hours at 8 knots', near(WX.rtG(RT.REACH, 0, 0), 3, 1e-9));
  ok('the first figure\'s finish, 22.5 miles on 075, is 3 hours at 7.5 knots', near(WX.rtG(FX, FY, 0), 3, 1e-9));
  let seed = 20261119; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let tri = 0, sym = 0, hom = 0, rot = 0, neg = 0;
  for (let i = 0; i < 1000; i++) {
    const ax = rnd() * 40 - 20, ay = rnd() * 40 - 20, bx = rnd() * 40 - 20, by = rnd() * 40 - 20, wd = Math.round(rnd() * 40 - 20);
    if (WX.rtG(ax + bx, ay + by, wd) > WX.rtG(ax, ay, wd) + WX.rtG(bx, by, wd) + 1e-9) tri++;
    if (!near(WX.rtG(ax, ay, 0), WX.rtG(-ax, ay, 0), 1e-9)) sym++;
    if (!near(WX.rtG(2 * ax, 2 * ay, wd), 2 * WX.rtG(ax, ay, wd), 1e-9)) hom++;
    /*  a wind from wd is the wind from north with the chart turned: the
        same displacement, turned back, takes the same time  */
    const r = wd * RAD;
    if (!near(WX.rtG(ax, ay, wd), WX.rtG(ax * Math.cos(r) - ay * Math.sin(r), ax * Math.sin(r) + ay * Math.cos(r), 0), 1e-9)) rot++;
    if (WX.rtCost(ax, ay, 0, RT.BEAT) < 0 || WX.rtCost(ax, ay, RT.REACH, 0) < 0) neg++;
  }
  ok('no dog-leg beats the straight course: 1,000 triangles', tri === 0, tri + ' did');
  ok('port and starboard mirror: 1,000 places', sym === 0, sym + ' off');
  ok('twice as far takes twice as long: 1,000 places', hom === 0, hom + ' off');
  ok('a shifted wind is the same wind with the chart turned: 1,000 places', rot === 0, rot + ' off');
  ok('no place costs less than nothing: 2,000 places', neg === 0, neg + ' did');
  let on = 0;
  for (let k = 0; k <= 10; k++) { if (WX.rtCost(RT.REACH * k / 10, 0, RT.REACH, 0) > 1e-9) on++; if (WX.rtCost(0, RT.BEAT * k / 10, 0, RT.BEAT) > 1e-9) on++; }
  ok('a place on the straight course costs nothing', on === 0, on + ' did');
  ok('on the beat, the corner of the laylines costs nothing', WX.rtCost(6, 6, 0, RT.BEAT) < 1e-9 && WX.rtCost(-6, 6, 0, RT.BEAT) < 1e-9);
  ok('a mile outside the layline costs something', WX.rtCost(7, 6, 0, RT.BEAT) > 0.05);
  ok('the lane on the beat is wider than the diamond between the laylines (12 miles)', WX.rtWidth(0, RT.BEAT, RT.LANE) > 12);
  ok('with nothing to lose, the beat\'s lane is the diamond: 12 miles', near(WX.rtWidth(0, RT.BEAT, 0.0001), 12, 0.01));
  ok('the reach\'s lane is narrower than the beat\'s', WX.rtWidth(RT.REACH, 0, RT.LANE) < WX.rtWidth(0, RT.BEAT, RT.LANE));
  ok('a veer for the boat on the right is a back for the boat on the left',
     near(WX.rtAllin(1, RT.SHIFT), WX.rtAllin(0, -RT.SHIFT), 1e-9) && near(WX.rtAllin(1, -RT.SHIFT), WX.rtAllin(0, RT.SHIFT), 1e-9));
  ok('the middle boat does as well either way', near(WX.rtAllin(0.5, RT.SHIFT), WX.rtAllin(0.5, -RT.SHIFT), 1e-9));
  ok('in a wind that holds, all three take the beat\'s time',
     [0, 0.5, 1].every(a => near(WX.rtAllin(a, 0), WX.rtG(0, RT.BEAT, 0), 1e-9)));
  ok('if it veers the right wins and the left loses', WX.rtAllin(1, RT.SHIFT) < WX.rtAllin(0.5, RT.SHIFT) && WX.rtAllin(0.5, RT.SHIFT) < WX.rtAllin(0, RT.SHIFT));
  /*  the right-hand boat's time worked by hand: an hour on port, then
      straight for the finish, 49 degrees off the veered wind, at a speed
      between the polar's 6.0 at 45 and 6.9 at 60 along its outline  */
  const px = 6 * Math.sin(45 * RAD), py = 6 * Math.cos(45 * RAD), d = Math.hypot(px, 12 - py);
  const off = RT.SHIFT - (Math.atan2(-px, 12 - py) / RAD);
  ok('the right-hand boat lays the finish ' + off.toFixed(0) + ' degrees off the veered wind', off > 45 && off < 60, off.toFixed(1));
  const v = d / (WX.rtAllin(1, RT.SHIFT) - 1);
  ok('and does it at ' + v.toFixed(2) + ' knots, between her 6.0 and her 6.9', v > 6.0 && v < 6.9, v.toFixed(3));
  ok('hours and minutes: 2.5 is 2 h 30, 0.99 is 0 h 59, 41.9753 is 41 h 59',
     WX.rtHm(2.5) === '2 h 30' && WX.rtHm(0.99) === '0 h 59' && WX.rtHm(41.9753) === '41 h 59');
  /*  TEST THE ROUTE (weather 1.0.26, TBOK): her speeds scaled.  At 1.0 it
      is the all-in case itself; the shift still comes an hour in, so the
      first hour covers k times the ground; and at every speed going right
      is the fastest, which is the call the lesson says holds.  */
  ok('at her own speeds the scaled beat is the all-in case', [1, 0.5, 0].every(a => WX.rtAllinK(a, RT.SHIFT, 1) === WX.rtAllin(a, RT.SHIFT)));
  ok('twice her speed covers the beat in the first hour plus half the rest',
     near(WX.rtAllinK(1, 0, 2) - RT.TS, WX.rtG(-2 * RT.TS * RT.V[0][0], RT.BEAT - 2 * RT.TS * RT.V[0][1], 0) / 2, 1e-12));
  ok('at 0.9, 1.0 and 1.1 going right is the fastest of the three', RT.K.every(k =>
     WX.rtAllinK(1, RT.SHIFT, k) < WX.rtAllinK(0.5, RT.SHIFT, k) && WX.rtAllinK(1, RT.SHIFT, k) < WX.rtAllinK(0, RT.SHIFT, k)));
  ok('and a faster boat is never slower', RT.K.every((k, i) => i === 0 || WX.rtAllinK(1, RT.SHIFT, k) < WX.rtAllinK(1, RT.SHIFT, RT.K[i - 1])));
}

/* ---- 3. the figures --------------------------------------------------- */
/*  Runs in the page.  `figs` are the seven svgs (or copies with a fault
    planted); the model is the page's own WX.  Returns what is wrong.  */
function checkRoute(figs) {
  var RT = WX.RT, bad = [], RAD = Math.PI / 180;
  function fail(s) { bad.push(s); }
  function q(svg, n) { return svg.querySelector('[data-part="' + n + '"]'); }
  function num(e, a) { return parseFloat(e.getAttribute(a)); }
  function pts(e) { return e.getAttribute('points').trim().split(/\s+/).map(function (p) { return p.split(',').map(Number); }); }
  function near(a, b, e) { return Math.abs(a - b) <= e; }
  var byKind = {};
  figs.forEach(function (s) { byKind[s.getAttribute('data-kind')] = s; });
  var s, K, i, k, p, e, x, y, t;

  /* rtfan */
  s = byKind.rtfan; K = num(s, 'data-k'); var sx = num(s, 'data-sx'), sy = num(s, 'data-sy');
  [1, 2, 3].forEach(function (k) {
    p = pts(q(s, 'iso-' + k));
    if (p.length !== RT.V.length) fail('fan: isochrone ' + k + ' has ' + p.length + ' corners');
    p.forEach(function (c, i) {
      if (!near((c[0] - sx) / K, k * RT.V[i][0], 0.02) || !near((sy - c[1]) / K, k * RT.V[i][1], 0.02)) fail('fan: isochrone ' + k + ' corner ' + i);
    });
  });
  e = q(s, 'finish'); x = (num(e, 'cx') - sx) / K; y = (sy - num(e, 'cy')) / K;
  if (!near(Math.hypot(x, y), 22.5, 0.03)) fail('fan: the finish is ' + Math.hypot(x, y).toFixed(2) + ' miles off');
  if (!near(Math.atan2(x, y) / RAD, 75, 0.2)) fail('fan: the finish bears ' + (Math.atan2(x, y) / RAD).toFixed(1));
  if (!near(WX.rtG(x, y, 0), 3, 0.01)) fail('fan: the finish is not on the 3-hour line');
  if (q(s, 'time').textContent !== WX.rtHm(WX.rtG(x, y, 0))) fail('fan: the time written is ' + q(s, 'time').textContent);
  [1, 2].forEach(function (k) {
    e = q(s, 'via-' + k);
    t = WX.rtG((num(e, 'cx') - sx) / K, (sy - num(e, 'cy')) / K, 0);
    if (!near(t, k, 0.01)) fail('fan: the route\'s point ' + k + ' is at ' + t.toFixed(2) + ' hours');
  });
  if (s.querySelectorAll('[data-part="ray"]').length !== RT.V.length) fail('fan: the rays');
  Array.prototype.forEach.call(s.querySelectorAll('[data-part="ray"]'), function (r) {
    i = +r.getAttribute('data-i');
    if (!near((num(r, 'x2') - sx) / K, RT.V[i][0], 0.02) || !near((sy - num(r, 'y2')) / K, RT.V[i][1], 0.02)) fail('fan: ray ' + i);
  });

  /* rthorizon */
  s = byKind.rthorizon; var days = s.querySelectorAll('[data-part="day"]'), per = null;
  if (days.length !== 10) fail('horizon: ' + days.length + ' columns');
  Array.prototype.forEach.call(days, function (r) {
    var d = +r.getAttribute('data-day'), pct = +r.getAttribute('data-pct'), want = null;
    RT.HZ.forEach(function (h) { if (d >= h[0] && d <= h[1]) want = h[2]; });
    if (pct !== want) fail('horizon: day ' + d + ' says ' + pct);
    if (per === null) per = num(r, 'height') / pct;
    if (!near(num(r, 'height') / pct, per, 0.001)) fail('horizon: day ' + d + ' is not as tall as its figure');
  });
  var d5 = s.querySelector('[data-day="5"]'), d6 = s.querySelector('[data-day="6"]'), hx = num(q(s, 'horizon'), 'x1');
  if (!(hx >= num(d5, 'x') + num(d5, 'width') && hx <= num(d6, 'x'))) fail('horizon: the line is not between day 5 and day 6');
  RT.HZ.forEach(function (h, g) { if (q(s, 'pct-' + g).textContent !== 'about ' + h[2] + ' in 100') fail('horizon: label ' + g); });

  /* rtlane */
  s = byKind.rtlane; K = num(s, 'data-k');
  [['reach', RT.REACH, 0], ['beat', 0, RT.BEAT]].forEach(function (L) {
    e = q(s, 'lane-' + L[0]);
    var px = num(e, 'data-px'), x0 = num(e, 'data-x0'), y1 = num(e, 'data-y1'), top = 64, worst = 0;
    var P = pts(e).map(function (c) { return [x0 + (c[0] - px) / K, y1 - (c[1] - top) / K]; });
    P.forEach(function (c) { worst = Math.max(worst, Math.abs(WX.rtCost(c[0], c[1], L[1], L[2]) * 60 - RT.LANE)); });
    if (worst > 0.6) fail('lane: the ' + L[0] + '\'s edge is ' + worst.toFixed(1) + ' minutes off ten');
    /*  the width across the middle, measured off the drawn edge  */
    var mx = L[1] / 2, my = L[2] / 2, along = L[1] ? 0 : 1, lo = 1e9, hi = -1e9;
    P.forEach(function (c) { if (Math.abs(c[along] - (along ? my : mx)) < 0.05) { lo = Math.min(lo, c[1 - along]); hi = Math.max(hi, c[1 - along]); } });
    var w = WX.rtWidth(L[1], L[2], RT.LANE);
    if (!near(hi - lo, w, 0.1)) fail('lane: the ' + L[0] + '\'s lane measures ' + (hi - lo).toFixed(1) + ', not ' + w.toFixed(1));
    if (q(s, L[0] + '-width').textContent.indexOf(w.toFixed(1) + ' miles wide') < 0) fail('lane: the ' + L[0] + '\'s width is written ' + q(s, L[0] + '-width').textContent);
    /*  the isochrones: forward k is the outline times k thirds of the
        time; reverse k is the same turned about, from the finish  */
    var T = WX.rtG(L[1], L[2], 0);
    [1, 2].forEach(function (k) {
      var f = pts(q(s, L[0] + '-fwd-' + k)), r = pts(q(s, L[0] + '-rev-' + k)), off = 0;
      f.forEach(function (c, i) {
        off = Math.max(off, Math.abs(x0 + (c[0] - px) / K - k * T / 3 * RT.V[i][0]), Math.abs(y1 - (c[1] - top) / K - k * T / 3 * RT.V[i][1]));
      });
      r.forEach(function (c, i) {
        off = Math.max(off, Math.abs(x0 + (c[0] - px) / K - (L[1] - k * T / 3 * RT.V[i][0])), Math.abs(y1 - (c[1] - top) / K - (L[2] - k * T / 3 * RT.V[i][1])));
      });
      if (off > 0.03) fail('lane: the ' + L[0] + '\'s isochrones at ' + k + ' thirds are ' + off.toFixed(2) + ' miles out');
    });
  });
  [1, 2].forEach(function (k) {
    e = q(s, 'lane-reach'); var px = num(e, 'data-px'), x0 = num(e, 'data-x0');
    x = x0 + (num(q(s, 'reach-touch-' + k), 'cx') - px) / K;
    if (!near(WX.rtG(x, 0, 0), k, 0.01) || !near(WX.rtG(RT.REACH - x, 0, 0), 3 - k, 0.01)) fail('lane: the reach\'s touching point ' + k);
  });

  /* rtmotor */
  s = byKind.rtmotor; K = num(s, 'data-k');
  p = pts(q(s, 'sail')); var len = 0;
  for (i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) / K;
  var T = WX.rtG(0, RT.BEAT, 0), sail = T * RT.S[0];
  if (!near(len, sail, 0.05)) fail('motor: the boards drawn are ' + len.toFixed(2) + ' miles');
  if (q(s, 'sail-miles').textContent.indexOf(sail.toFixed(1) + ' miles') !== 0) fail('motor: the sailing miles are written ' + q(s, 'sail-miles').textContent);
  e = q(s, 'motor'); var straight = Math.abs(num(e, 'y1') - p[p.length - 1][1]) / K;
  if (!near(straight, RT.BEAT, 0.01) || !near(num(e, 'x1'), num(e, 'x2'), 0.01)) fail('motor: the straight line is ' + straight.toFixed(2) + ' miles');
  /*  each board 45 degrees off the wind  */
  for (i = 1; i < p.length; i++) {
    var b = Math.abs(Math.atan2(p[i][0] - p[i - 1][0], -(p[i][1] - p[i - 1][1])) / RAD);
    if (!near(b, 45, 0.5)) fail('motor: board ' + i + ' is ' + b.toFixed(1) + ' degrees off the wind');
  }
  if (q(s, 'motor-knots').textContent !== 'at ' + (RT.BEAT / T).toFixed(1) + ' knots') fail('motor: her speed is written ' + q(s, 'motor-knots').textContent);
  if (q(s, 'both').textContent !== 'BOTH TAKE ' + WX.rtHm(T)) fail('motor: the time is written ' + q(s, 'both').textContent);
  if (q(s, 'extra').textContent !== (sail - RT.BEAT).toFixed(1) + ' extra miles') fail('motor: the extra miles are written ' + q(s, 'extra').textContent);
  if (!near(parseFloat(q(s, 'extra').textContent), parseFloat(q(s, 'sail-miles').textContent) - parseFloat(q(s, 'motor-miles').textContent), 0.051))
    fail('motor: the extra miles are not the difference of the two written');

  /* rtallin */
  s = byKind.rtallin; K = num(s, 'data-k'); sx = num(s, 'data-sx'); sy = num(s, 'data-sy');
  var A = [1, 0.5, 0], Wd = [RT.SHIFT, 0, -RT.SHIFT], cell = [], mn = function (t) { return Math.trunc(t * 60 + 0.5); };
  A.forEach(function (a, i) {
    cell.push([]);
    Wd.forEach(function (wd, j) {
      t = q(s, 'cell-' + i + '-' + j).textContent; cell[i].push(t);
      if (t !== WX.rtHm(WX.rtAllin(a, wd))) fail('allin: row ' + i + ' column ' + j + ' says ' + t);
    });
    p = pts(q(s, 'track-' + i)).map(function (c) { return [(c[0] - sx) / K, (sy - c[1]) / K]; });
    if (!near(p[0][0], 0, 0.01) || !near(p[0][1], 0, 0.01)) fail('allin: track ' + i + ' does not start at the start');
    var last = p[p.length - 1];
    if (!near(last[0], 0, 0.01) || !near(last[1], RT.BEAT, 0.01)) fail('allin: track ' + i + ' does not end at the finish');
    /*  the time along the track as drawn, each leg in its own wind  */
    var tt = WX.rtG(p[1][0], p[1][1], 0);
    for (k = 2; k < p.length; k++) tt += WX.rtG(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1], RT.SHIFT);
    if (i !== 1 && !near(tt, WX.rtAllin(a, RT.SHIFT), 0.01)) fail('allin: track ' + i + ' as drawn takes ' + tt.toFixed(2) + ' hours');
    if (!near(WX.rtG(p[1][0], p[1][1], 0), RT.TS, 0.01)) fail('allin: track ' + i + '\'s first leg is not an hour');
    e = q(s, 'hour-' + i);
    if (!near((num(e, 'cx') - sx) / K, p[1][0], 0.02) || !near((sy - num(e, 'cy')) / K, p[1][1], 0.02)) fail('allin: the one-hour mark ' + i);
  });
  function hmMin(t) { var m = t.match(/(\d+) h (\d+)/); return m ? +m[1] * 60 + +m[2] : NaN; }
  if (parseInt(q(s, 'up').textContent, 10) !== hmMin(cell[1][0]) - hmMin(cell[0][0])) fail('allin: the minutes up are not the table\'s');
  if (parseInt(q(s, 'down').textContent, 10) !== hmMin(cell[0][2]) - hmMin(cell[1][2])) fail('allin: the minutes down are not the table\'s');
  /*  the wind after the first hour is drawn veered: blowing from the
      right of north  */
  e = q(s, 'wind-after');
  var from = Math.atan2(num(e, 'x1') - num(e, 'x2'), -(num(e, 'y1') - num(e, 'y2'))) / RAD;
  if (!near(from, RT.SHIFT, 3)) fail('allin: the veered wind is drawn from ' + from.toFixed(0));

  /* rtscale */
  s = byKind.rtscale;
  RT.SC.forEach(function (c, i) {
    var g = num(q(s, 'grib-' + i), 'width'), x2 = num(q(s, 'extra-' + i), 'width');
    if (!near((g + x2) / g, c[1], 0.001)) fail('scale: bar ' + i + ' is ' + ((g + x2) / g).toFixed(3) + ' of the GRIB\'s');
    if (q(s, 'kn-' + i).textContent !== (20 * c[1]).toFixed(0) + ' knots') fail('scale: bar ' + i + ' is written ' + q(s, 'kn-' + i).textContent);
  });
  var sf = num(q(s, 'stream-file'), 'width'), se = num(q(s, 'stream-extra'), 'width');
  if (!near((sf + se) / sf, RT.CUR, 0.001)) fail('scale: the stream\'s bar is ' + ((sf + se) / sf).toFixed(3));
  if (q(s, 'stream-kn').textContent !== (2 * RT.CUR).toFixed(1) + ' knots') fail('scale: the stream is written ' + q(s, 'stream-kn').textContent);

  /* rtwhatif (weather 1.0.26, TBOK): the beat sailed at three speeds */
  s = byKind.rtwhatif; var pxm = null, x0b = null;
  RT.K.forEach(function (k, i) {
    var b = q(s, 'right-' + i), t = [1, 0.5, 0].map(function (a) { return WX.rtAllinK(a, RT.SHIFT, k); });
    if (pxm === null) { pxm = num(b, 'width') / (t[0] * 60); x0b = num(b, 'x'); }
    if (!near(num(b, 'width') / pxm / 60, t[0], 0.02)) fail('whatif: speed ' + k + '\'s bar is ' + (num(b, 'width') / pxm / 60).toFixed(2) + ' hours');
    ['right', 'middle', 'left'].forEach(function (w, j) {
      if (q(s, w + '-lab-' + i).textContent !== WX.rtHm(t[j])) fail('whatif: speed ' + k + '\'s ' + w + ' is written ' + q(s, w + '-lab-' + i).textContent);
    });
    if (!(t[0] < t[1] && t[0] < t[2])) fail('whatif: going right is not the fastest at speed ' + k);
    if (!near((num(q(s, 'veer-' + i), 'x1') - x0b) / pxm / 60, RT.TS, 0.02)) fail('whatif: speed ' + k + '\'s veer is not an hour in');
  });
  var sp = Math.trunc(WX.rtAllinK(1, RT.SHIFT, RT.K[0]) * 60 + 0.5) - Math.trunc(WX.rtAllinK(1, RT.SHIFT, RT.K[RT.K.length - 1]) * 60 + 0.5);
  if (q(s, 'spread').textContent.indexOf(sp + ' minutes') < 0) fail('whatif: the spread is written ' + q(s, 'spread').textContent);
  return bad;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 744, height: 3000 }, timezoneId: 'UTC' });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 20000 });
  await page.click('[data-go="learn"]');
  await page.waitForTimeout(250);
  await page.click('#les-list >> text=/Routing: what a router does/i');
  await page.waitForTimeout(600);
  await page.addScriptTag({ content: checkRoute.toString() });
  const KINDS = ['rtfan', 'rthorizon', 'rtlane', 'rtmotor', 'rtallin', 'rtscale', 'rtwhatif'];
  /*  the lesson's demonstrations, in the order the shell put them  */
  const order = await page.evaluate(() => LESSONS.filter(l => l.key === 'routing')[0].body.filter(b => b.s === 'demo').map(b => b.kind));
  ok('the lesson carries seven figures, in the order of its seven points', order.join(' ') === KINDS.join(' '), order.join(' '));
  ok('all seven are drawn', await page.evaluate(() => document.querySelectorAll('#les-body .routedemo svg').length) === 7);
  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    await page.waitForTimeout(200);
    const r = await page.evaluate((KINDS) => {
      const figs = Array.from(document.querySelectorAll('#les-body .routedemo svg'));
      figs.forEach((s, i) => s.setAttribute('data-kind', KINDS[i]));
      const cs = getComputedStyle(document.documentElement), tk = k => cs.getPropertyValue(k).trim();
      /*  the lane figure clips its isochrones to their panels, so what is
          measured is everything outside a clipped group, and each clip
          itself  */
      const box = figs.map(s => {
        const v = s.getAttribute('viewBox').split(' ').map(Number), cl = Array.from(s.querySelectorAll('[clip-path]'));
        cl.forEach(g => { g.style.display = 'none'; });
        const b = s.getBBox();
        cl.forEach(g => { g.style.display = ''; });
        const clips = Array.from(s.querySelectorAll('clipPath rect')).every(r =>
          +r.getAttribute('x') >= 0 && +r.getAttribute('y') >= 0 &&
          +r.getAttribute('x') + +r.getAttribute('width') <= v[2] && +r.getAttribute('y') + +r.getAttribute('height') <= v[3]);
        return clips && b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v[2] + 0.5 && b.y + b.height <= v[3] + 0.5; });
      const q = (i, n) => figs[i].querySelector('[data-part="' + n + '"]');
      return { faults: checkRoute(figs), box,
               accent: ['iso-3'].every(n => q(0, n).getAttribute('stroke') === tk('--accent')) &&
                       q(3, 'sail').getAttribute('stroke') === tk('--accent') && q(4, 'track-0').getAttribute('stroke') === tk('--accent') &&
                       q(6, 'right-0').getAttribute('fill') === tk('--accent'),
               warn: q(6, 'veer-0').getAttribute('stroke') === (tk('--warn') || tk('--bad')) &&
                     q(1, 'horizon').getAttribute('stroke') === (tk('--warn') || tk('--bad')),
               text: q(0, 'route').getAttribute('stroke') === tk('--text') };
    }, KINDS);
    const tag = mode + ': ';
    ok(tag + 'the seven drawings agree with the model and with what is written on them', r.faults.length === 0, r.faults.join(' | '));
    ok(tag + 'isochrones, the sailing track, the router\'s track and the run home in the page\'s accent', r.accent);
    ok(tag + 'the horizon and the tack marks in the page\'s warning colour', r.warn);
    ok(tag + 'the route in the page\'s text colour', r.text);
    ok(tag + 'nothing outside any of the seven boxes', r.box.every(Boolean), r.box.map((b, i) => b ? '' : KINDS[i]).join(' '));
    if (process.env.SHOTS) {
      const els = await page.$$('#les-body .routedemo');
      for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: process.env.SHOTS + '/' + KINDS[i] + '-' + mode + '.png' });
    }
  }

  /* ---- 4. the lesson's words carry the figures' numbers ---- */
  const words = await page.evaluate(() => document.getElementById('les-text').innerText.replace(/\s+/g, ' '));
  const mn = t => Math.trunc(t * 60 + 0.5);
  const up = mn(WX.rtAllin(0.5, RT.SHIFT)) - mn(WX.rtAllin(1, RT.SHIFT)), down = mn(WX.rtAllin(1, -RT.SHIFT)) - mn(WX.rtAllin(0.5, -RT.SHIFT));
  const far = mn(WX.rtAllin(1, -RT.SHIFT)) - mn(WX.rtAllin(0, -RT.SHIFT));
  ok('the words give the reach\'s lane: ' + WX.rtWidth(RT.REACH, 0, RT.LANE).toFixed(1) + ' miles wide',
     words.includes(WX.rtWidth(RT.REACH, 0, RT.LANE).toFixed(1) + ' miles wide'));
  ok('the words give the beat\'s lane: ' + WX.rtWidth(0, RT.BEAT, RT.LANE).toFixed(1) + ' miles wide',
     words.includes('it is ' + WX.rtWidth(0, RT.BEAT, RT.LANE).toFixed(1) + ' miles wide'));
  ok('the words give the router\'s gain: ' + up + ' minutes up', words.includes('is ' + up + ' minutes up on the boat in the middle'));
  ok('the words give its loss: ' + down + ' behind the middle, ' + far + ' behind the left',
     words.includes('she is ' + down + ' minutes behind the middle, and ' + far + ' behind the boat that went left'));
  ok('the words give the scaling: 1.15, 1.20, 1.25 and 1.30',
     words.includes('times 1.15 in the tropics, 1.20 in mid-latitudes and 1.25 in high latitudes') && words.includes('times 1.30'));
  ok('the words give NOAA\'s figures as nine, eight and half', /nine times in ten.*eight in ten.*about half/.test(words));
  const spread = Math.trunc(WX.rtAllinK(1, RT.SHIFT, RT.K[0]) * 60 + 0.5) - Math.trunc(WX.rtAllinK(1, RT.SHIFT, RT.K[RT.K.length - 1]) * 60 + 0.5);
  ok('the words give the three speeds\' spread: ' + spread + ' minutes', words.includes('by ' + spread + ' minutes'));
  ok('the lesson says the app does not route (gap list rule 3)', words.includes('bashnav weather does not route, and never forecasts from a model'));

  /* ---- 5. planted faults ---- */
  const planted = await page.evaluate(() => {
    const src = Array.from(document.querySelectorAll('#les-body .routedemo svg'));
    const copy = () => src.map(s => s.cloneNode(true)), out = {};
    const q = (c, i, n) => c[i].querySelector('[data-part="' + n + '"]');
    let c = copy(), e = q(c, 0, 'finish'); e.setAttribute('cx', +e.getAttribute('cx') + 12);
    out.fan = checkRoute(c).length;
    c = copy(); e = c[1].querySelector('[data-day="7"]'); e.setAttribute('height', +e.getAttribute('height') * 0.8);
    out.horizon = checkRoute(c).length;
    c = copy(); q(c, 2, 'reach-width').textContent = '8.6 miles wide';
    out.lane = checkRoute(c).length;
    c = copy(); q(c, 3, 'extra').textContent = '3.0 extra miles';
    out.motor = checkRoute(c).length;
    c = copy(); const a = q(c, 4, 'cell-0-2'), b = q(c, 4, 'cell-2-2'), t = a.textContent; a.textContent = b.textContent; b.textContent = t;
    out.allin = checkRoute(c).length;
    c = copy(); e = q(c, 5, 'extra-0'); e.setAttribute('width', +e.getAttribute('width') * 2);
    out.scale = checkRoute(c).length;
    c = copy(); e = q(c, 6, 'veer-2'); e.setAttribute('x1', +e.getAttribute('x1') + 30);
    out.whatif = checkRoute(c).length;
    return out;
  });
  ok('planted: the finish moved off the 3-hour line is caught', planted.fan > 0);
  ok('planted: day 7 drawn shorter than its figure is caught', planted.horizon > 0);
  ok('planted: a lane width written wrong is caught', planted.lane > 0);
  ok('planted: the extra miles written wrong is caught', planted.motor > 0);
  ok('planted: the right and left boats\' times swapped is caught', planted.allin > 0);
  ok('planted: a wind bar drawn too long is caught', planted.scale > 0);
  ok('planted: a veer mark moved is caught', planted.whatif > 0);
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the routing lesson, its model and its seven figures' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
