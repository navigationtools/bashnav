#!/usr/bin/env node
/*  The high-water levels a charted clearance is measured above, for every
    reference station (bridge clearance; Larry's rulings AEZ and AFC, 16
    November 2026).

      node src/tides/gen/make_levels.js                 all of them, about 90 minutes
      node src/tides/gen/make_levels.js 3 8 part.3      shard 3 of 8, to a part file
      node src/tides/gen/make_levels.js --merge part.*  join the parts into levels.dat
      node src/tides/gen/make_levels.js --one <id>      one station, printed (the suite's check)

    A chart gives a bridge's clearance above a high-water level, and which
    level depends on the chart: Highest Astronomical Tide on a British chart,
    mean high water on an American one.  So the tool must know those levels.

      HAT   the highest high water in 19 years of prediction
      MHW   the mean of every high water in the same 19 years

    Mean high water springs needs no file: it is the mean level + M2 + S2,
    the Admiralty approximation, which the engine works on the spot.

    Both are stored ABOVE MEAN SEA LEVEL, in millimetres, so a correction to
    a station's zero (src/tides/gen/corrections.dat) does not touch them: the
    engine adds the station's own z0.

    THE PERIOD is 2007 to 2025, nineteen whole years: one full turn of the
    Moon's nodes, which is what makes a HAT a HAT.  It is the period the
    tide database uses for its own datums, so the two can be compared.

    THE ENGINE is the browser's (docs/web/tides/engine.js), which is held to
    the awk line for line by docs/web/tests/run-tides-web.sh.  It does one
    station in about a second; the awk would take about a minute.

    WHAT IT WAS MADE FROM is written into the file's header: the checksums of
    the station file and the engine, and the day.  If either changes in a way
    that moves a tide, remake the file; tests/tides-levels-check.sh recomputes
    a sample and fails if the file has gone stale.  */
'use strict';
var fs = require('fs'), path = require('path'), crypto = require('crypto');
var ROOT = path.resolve(__dirname, '..', '..', '..');
var WEB = path.join(ROOT, 'docs', 'web', 'tides') + path.sep;
var SF = path.join(ROOT, 'src', 'tides', 'stations.dat');
var OUT = path.join(ROOT, 'src', 'tides', 'levels.dat');
var Y0 = 2007, Y1 = 2025;                 // inclusive: nineteen years

var tabs = require(WEB + 'tables.js');
global.TT_CONST = tabs.TT_CONST; global.TT_SAT = tabs.TT_SAT; global.TT_SHAL = tabs.TT_SHAL;
var TIDE = require(WEB + 'engine.js');

function stations() {
  var out = [];
  fs.readFileSync(SF, 'utf8').split('\n').forEach(function (L) {
    if (L.slice(0, 2) !== 'R|') return;
    var st = TIDE.parseStation(L);
    if (st) out.push(st);
  });
  return out;
}
/*  One station: every high water of the nineteen years, a month at a time
    so the nodal corrections are never more than a fortnight from the tide
    they are applied to (the engine fixes them at the middle of what it is
    opened for).  */
function levels(st) {
  var hi = -1e9, sum = 0, n = 0;
  for (var y = Y0; y <= Y1; y++) for (var m = 1; m <= 12; m++) {
    var a = TIDE.jdate(y, m, 1), b = (m === 12) ? TIDE.jdate(y + 1, 1, 1) : TIDE.jdate(y, m + 1, 1);
    var P = TIDE.open(st, null, (a + b) / 2);
    if (P.err) return null;
    var hl = P.hilo(a, b);
    for (var i = 0; i < hl.length; i++) {
      if (hl[i].k !== 'H' || hl[i].t < a || hl[i].t >= b) continue;
      var h = hl[i].h - P._z0;
      sum += h; n++;
      if (h > hi) hi = h;
    }
  }
  if (n < 19 * 300) return null;          // no real tide to speak of
  //  At a few river gauges a season's rise and fall dwarfs the tide, and the
  //  mean of the "high waters" comes out below mean sea level.  Those are
  //  not levels a chart measures a clearance above: the station gets none.
  if (sum / n <= 0) return null;
  return { hat: Math.round(hi * 1000), mhw: Math.round(sum / n * 1000), n: n };
}
function line(st) {
  var v = levels(st);
  return st.id + '|' + (v ? v.hat + '|' + v.mhw : '|');
}
function sha(f) { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16); }
function header() {
  return [
    '# High-water levels above MEAN SEA LEVEL, mm, for every reference station.',
    '# Made by src/tides/gen/make_levels.js; do not edit by hand.',
    '#   id | HAT | MHW      (empty where a station has no tide to speak of)',
    '#   HAT  the highest high water predicted, ' + Y0 + ' to ' + Y1,
    '#   MHW  the mean of every high water predicted in those years',
    '# Made from: stations.dat ' + sha(SF) + ', engine.js ' + sha(WEB + 'engine.js') +
      ', tables.js ' + sha(WEB + 'tables.js'),
    '# The constants decide these, not a station\'s zero: a chart-datum',
    '# correction does not change this file.'
  ];
}
var a = process.argv.slice(2);
if (a[0] === '--one') {
  var one = stations().filter(function (s) { return s.id === a[1]; })[0];
  if (!one) { console.error('no such reference station'); process.exit(2); }
  console.log(line(one));
} else if (a[0] === '--merge') {
  var got = {};
  a.slice(1).forEach(function (f) {
    fs.readFileSync(f, 'utf8').split('\n').forEach(function (l) {
      if (!l) return;
      var q = l.split('|');
      //  the same rule as levels(), for a part file made before it was added
      if (q[2] !== '' && +q[2] <= 0) l = q[0] + '||';
      got[q[0]] = l;
    });
  });
  var all = stations(), miss = all.filter(function (s) { return !got[s.id]; });
  if (miss.length) { console.error(miss.length + ' stations missing, first ' + miss[0].id); process.exit(1); }
  fs.writeFileSync(OUT, header().concat(all.map(function (s) { return got[s.id]; })).join('\n') + '\n');
  console.log('levels.dat: ' + all.length + ' stations, ' + all.filter(function (s) { return /\|$/.test(got[s.id]); }).length + ' with no levels');
} else {
  var k = a.length >= 2 ? +a[0] : 0, n = a.length >= 2 ? +a[1] : 1, out = a[2] || OUT;
  var mine = stations().filter(function (s, i) { return i % n === k; });
  //  A shard that was stopped picks up where it left off: a part file is
  //  written a line at a time, and a station already in it is not redone.
  var done = {};
  if (n > 1 && fs.existsSync(out)) fs.readFileSync(out, 'utf8').split('\n').forEach(function (l) {
    if (/^[^|]+\|[-0-9]*\|[-0-9]*$/.test(l)) done[l.split('|')[0]] = 1;
  });
  var fd = fs.openSync(out, n > 1 ? 'a' : 'w');
  if (n === 1) fs.writeSync(fd, header().join('\n') + '\n');
  mine.forEach(function (s) { if (!done[s.id]) fs.writeSync(fd, line(s) + '\n'); });
  fs.closeSync(fd);
  console.log('shard ' + k + ' of ' + n + ': ' + mine.length + ' stations');
}
