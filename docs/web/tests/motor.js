//  The motorboat of Levels 1 and 2 (route/motor.js), board item B21:
//  held to answers worked by hand.
//
//  Everything is laid on the equator, where a mile is a minute of arc
//  both ways, and Level 3's "route" is written here by hand, not
//  sailed: ten knots east for three hours, then ten knots north for
//  three.  So every waypoint, every leg and every speed can be worked
//  out on paper, and the motorboat is held to them:
//
//    waypoints  where Level 3 crosses a meridian, comes closest to a
//               mark, and the arc of track points round that mark
//    legs       Level 3's time on each, shared by distance where a
//               clearing waypoint splits one, and Level 1's speed
//    sailing    in still water she keeps every time exactly; in a
//               steady stream across her line she heads up by the
//               triangle's angle, and "on time" finds the speed the
//               triangle gives
//    failing    a stream across her line stronger than she is sets her
//               off it, and the report says when, where and how far
//    refusing   a rhumb line over water Level 3 was kept out of is
//               refused, naming the leg and where, with Level 3's own
//               tack point to clear it; and the arc round a mark grows
//               for a danger near the mark, but not for one far off
//
//    node docs/web/tests/motor.js
'use strict';
var GRID = require('../route/grid.js');
var COURSE = require('../route/course.js');
var MOTOR = require('../route/motor.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function near(a, b, tol) { return typeof a === 'number' && Math.abs(a - b) <= tol; }
//  Positions are written into the files below to six decimals of a
//  degree, as the real files are, which is 0.00002 nm.  So a place is
//  held to a ten-thousandth of a mile, and a time to 50 ms: at ten
//  knots that rounding moves an arrival by about 7 ms.
var NM = 1e-4, MS = 50;
function d(nm) { return nm / 60; }                      //  miles to degrees, on the equator
function f6(nm) { return d(nm).toFixed(6); }
var T0 = Date.parse('2025-05-24T00:00:00Z'), MIN = 60000, HOUR = 3600000;
function at(h) { return T0 + h * HOUR; }

// ---- Level 3, by hand ------------------------------------------------
//  36 steps of ten minutes.  Tack changes: starboard at 01:00 (a tack),
//  port at 03:00 at the corner (a tack), starboard at 04:30 (a gybe).
var ROWS = [], i;
for (i = 0; i < 36; i++) {
  var east = i < 18, k = east ? i : i - 18;
  var lat = east ? 0 : d(k * 10 / 6), lon = east ? d(i * 10 / 6) : d(30);
  var tack = i < 6 ? 'port' : i < 18 ? 'starboard' : i < 27 ? 'port' : 'starboard';
  ROWS.push({ ok: true, lat: lat, lon: lon, lat2: east ? 0 : d((k + 1) * 10 / 6), lon2: east ? d((i + 1) * 10 / 6) : d(30),
              ms: T0 + i * 10 * MIN, minutes: 10, heading: east ? 90 : 0, tack: tack, twa: i >= 27 ? 150 : 45 });
}
var L3 = { run: 'run.txt', summary: { start: '2025-05-24T00:00:00Z', finish: '2025-05-24T06:00:00Z' }, rows: ROWS };

function course(marks, finish) {
  var c = COURSE.course(['COURSE 1', 'name A test course', 'source Invented for this test. Not a real course.',
    'start line ' + f6(-0.1) + ' 0 to ' + f6(0.1) + ' 0 cross east', 'start class All 2025-05-24T00:00Z']
    .concat(marks).concat([finish || ('finish line ' + f6(30) + ' ' + f6(29.9) + ' to ' + f6(30) + ' ' + f6(30.1) + ' cross north'), 'end']).join('\n'));
  if (!c.ok) throw new Error('the test wrote a bad course: ' + c.err);
  return c;
}
function runFile(lines) {
  var r = COURSE.run(['RUN 2', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current c.grid',
    'start at 2025-05-24T00:00Z', 'step time 600 heading 5', 'scale wind 1.0 current 1.0']
    .concat(lines || []).concat(['round 0.10', 'end']).join('\n'));
  if (!r.ok) throw new Error('the test wrote a bad run: ' + r.err);
  return r;
}
function areas(layer, kind, pts) {
  var a = COURSE.areas(['AREAS 1', 'source Invented for this test.', 'layer ' + layer, kind]
    .concat(pts.map(function (p) { return '  ' + f6(p[0]) + ' ' + f6(p[1]); })).concat(['end ' + kind, 'end']).join('\n'));
  if (!a.ok) throw new Error('the test wrote bad areas: ' + a.err);
  return a;
}
//  a stream the same everywhere, changing only at the times given
function stream(times, vs) {
  var L = ['GRID 1', 'kind current', 'units kt', 'u east', 'v north', 'lat -1.0 1.0 1.0', 'lon -1.0 1.0 1.0',
           'times ' + times.join(' '), 'fields u v', 'order time lat lon', 'rows ' + times.length * 9];
  vs.forEach(function (v) { for (var n = 0; n < 9; n++) L.push(v[0] + ' ' + v[1]); });
  var g = GRID.parse(L.join('\n') + '\n');
  if (!g.ok) throw new Error(g.err);
  return g;
}
var DAY = ['2025-05-24T00:00Z', '2025-05-24T12:00Z'];
var NORTH2 = stream(DAY, [[0, 2], [0, 2]]);

function motor(lines) {
  var m = COURSE.motor(['MOTOR 1', 'follow run.txt'].concat(lines).concat(['end']).join('\n'));
  if (!m.ok) throw new Error('the test wrote a bad motor file: ' + m.err);
  return m;
}
//  the mark 0.5 nm east of the northward leg, 14 miles up it
var EAST_BUOY = 'mark East Buoy ' + f6(14) + ' ' + f6(30.5) + ' port';
function env(o) {
  return { course: o.course || course([EAST_BUOY]), run: o.run || runFile(), areas: o.areas || [],
           current: o.current === undefined ? NORTH2 : o.current };
}
var BASIC = ['waypoint Half way out meridian ' + f6(15), 'waypoint East Buoy mark'];
function plan(o) {
  return MOTOR.plan(env(o), o.route || L3, motor(['speed ' + (o.speed || 'same'), 'scale current ' + (o.scale === undefined ? 0 : o.scale),
                                                  'step time ' + (o.step || 600)].concat(o.points || BASIC)));
}

// =====================================================================
console.log('the motor file');
// =====================================================================
var good = COURSE.motor('MOTOR 1\nfollow r.txt\nspeed on-time\nscale current 0.5\nstep time 300\n' +
                        'waypoint Hurst narrows meridian -1.550\nclear off the point 50.2 -3.68\nwaypoint Eddystone Lt House mark\nend\n');
ok('a good file is read', good.ok, good.err);
ok('everything in it is kept', good.ok && good.follow === 'r.txt' && good.speed === 'on-time' && good.scale === 0.5 && good.step === 300);
ok('waypoints keep their order, names and kinds', good.ok && good.points.length === 3 &&
   good.points[0].kind === 'meridian' && good.points[0].name === 'Hurst narrows' && good.points[0].lon === -1.55 &&
   good.points[1].kind === 'clear' && good.points[1].lat === 50.2 && good.points[1].lon === -3.68 &&
   good.points[2].kind === 'mark' && good.points[2].name === 'Eddystone Lt House');
function refused(what, text, says) {
  var m = COURSE.motor(text);
  ok('refused: ' + what, !m.ok && (!says || (m.err || '').indexOf(says) >= 0), m.ok ? 'it was read' : m.err);
}
var HEAD = 'MOTOR 1\nfollow r.txt\nspeed same\nscale current 0\nstep time 600\n';
refused('an empty file', '', 'empty');
refused('another format', 'RUN 2\nend\n', 'MOTOR 1');
refused('no follow', 'MOTOR 1\nspeed same\nscale current 0\nstep time 600\nwaypoint A meridian 1\nend\n', 'follow');
refused('two follows', HEAD + 'follow s.txt\nwaypoint A meridian 1\nend\n', 'one run');
refused('no speed', 'MOTOR 1\nfollow r.txt\nscale current 0\nstep time 600\nwaypoint A meridian 1\nend\n', 'speed');
refused('a speed it does not know', 'MOTOR 1\nfollow r.txt\nspeed fast\nscale current 0\nstep time 600\nwaypoint A meridian 1\nend\n', 'on-time');
refused('no scale: still water must be written down', 'MOTOR 1\nfollow r.txt\nspeed same\nstep time 600\nwaypoint A meridian 1\nend\n', 'scale current');
refused('a negative scale', 'MOTOR 1\nfollow r.txt\nspeed same\nscale current -1\nstep time 600\nwaypoint A meridian 1\nend\n', 'zero or more');
refused('no step', 'MOTOR 1\nfollow r.txt\nspeed same\nscale current 0\nwaypoint A meridian 1\nend\n', 'time step');
refused('a step under ten seconds', 'MOTOR 1\nfollow r.txt\nspeed same\nscale current 0\nstep time 5\nwaypoint A meridian 1\nend\n', '10 to 3600');
refused('a meridian off the globe', HEAD + 'waypoint A meridian 200\nend\n', 'longitude');
refused('a waypoint with no name', HEAD + 'waypoint meridian 1\nend\n', 'name');
refused('a waypoint of no kind', HEAD + 'waypoint A 50 -1\nend\n', 'meridian');
refused('a clearing waypoint with no position', HEAD + 'clear A\nend\n', 'clear');
refused('only clearing waypoints', HEAD + 'clear A 50 -1\nend\n', 'Level 3');
refused('a line it does not know', HEAD + 'waypoint A meridian 1\nhurry up\nend\n', 'unknown');
refused('no end: it may have been cut short', HEAD + 'waypoint A meridian 1\n', 'cut short');
refused('a line after end', HEAD + 'waypoint A meridian 1\nend\nwaypoint B meridian 2\n', 'follow "end"');

// =====================================================================
console.log('waypoints, from Level 3');
// =====================================================================
var w = MOTOR.waypoints(L3, course([EAST_BUOY]), motor(['speed same', 'scale current 0', 'step time 600'].concat(BASIC)));
ok('the waypoints are found', w.ok, w.why);
var P = w.ok ? w.points : [];
ok('start, meridian, arc of three, finish', P.length === 6 &&
   P.map(function (p) { return p.kind; }).join(' ') === 'start meridian arc mark arc finish', P.map(function (p) { return p.kind; }).join(' '));
if (P.length === 6) {
  ok('the start is Level 3\'s, at its time', P[0].lat === 0 && P[0].lon === 0 && P[0].ms === T0);
  //  15 miles east at ten knots: 01:30
  ok('the meridian 15 miles east is crossed on the equator at 01:30',
     near(P[1].lat, 0, 1e-12) && near(P[1].lon * 60, 15, 1e-9) && near(P[1].ms, at(1.5), 1));
  //  the buoy is 14 miles up the northward leg: 3 h + 1.4 h = 04:24, 0.5 nm off
  ok('the closest point to the buoy is 14 miles up at 04:24, 0.5 nm off',
     near(P[3].lat * 60, 14, NM) && near(P[3].lon * 60, 30, 1e-9) && near(P[3].ms, at(4.4), MS) && near(P[3].off, 0.5, NM));
  //  it falls inside the 04:20 step, so the arc is 04:20 and 04:30
  ok('the arc takes the track point before it, 04:20, 13.33 miles up',
     P[2].ms === at(4 + 20 / 60) && near(P[2].lat * 60, 13 + 1 / 3, 1e-9) && P[2].arc === P[3].arc);
  ok('and the one after it, 04:30, 15 miles up', P[4].ms === at(4.5) && near(P[4].lat * 60, 15, 1e-9));
  ok('the finish is Level 3\'s, at its time', near(P[5].lat * 60, 30, 1e-9) && P[5].ms === at(6));
}
var LG = w.ok ? MOTOR.legs(P) : [];
//  Level 1's speeds: distance over Level 3's time
//    start to the meridian       15 nm in 1h30           10 kn
//    to 04:20, (0,15) to (13.33,30)  hypot = 20.069 nm in 2h50   7.083 kn
//    to the closest point        0.667 nm in 4 min       10 kn
//    to 04:30                    1 nm in 6 min           10 kn
//    to the finish               15 nm in 1h30           10 kn
var DIAG = Math.hypot(13 + 1 / 3, 15);
ok('five legs', LG.length === 5);
if (LG.length === 5) {
  ok('leg 1: 15 nm, 1h30, 10 kn', near(LG[0].nm, 15, 1e-9) && near(LG[0].minutes, 90, 1e-6) && near(LG[0].still, 10, 1e-9));
  ok('leg 2: 20.069 nm, 2h50, 7.083 kn', near(LG[1].nm, DIAG, 1e-4) && near(LG[1].minutes, 170, 1e-6) && near(LG[1].still, DIAG / (170 / 60), 1e-4));
  ok('leg 2 runs 048.4 degrees', near(LG[1].course, Math.atan2(15, 13 + 1 / 3) * 180 / Math.PI, 0.01));
  ok('legs 3 and 4: the arc, at 10 kn', near(LG[2].still, 10, 1e-6) && near(LG[3].still, 10, 1e-6));
  ok('leg 5: 15 nm, 1h30, 10 kn', near(LG[4].still, 10, 1e-9));
}

function wrefused(what, pts, says, c) {
  var r = MOTOR.waypoints(L3, c || course([EAST_BUOY]), motor(['speed same', 'scale current 0', 'step time 600'].concat(pts)));
  ok('refused: ' + what, !r.ok && r.why.indexOf(says) >= 0, r.ok ? 'it was found' : r.why);
}
wrefused('a meridian Level 3 never crosses', ['waypoint West meridian ' + f6(-5)], 'does not cross');
wrefused('a meridian crossed only before the waypoint before it',
         ['waypoint Far meridian ' + f6(20), 'waypoint Near meridian ' + f6(10)], 'after Far');
wrefused('a mark that is not on the course', ['waypoint West Buoy mark'], 'not a mark');
//  both meridians fall in the step from 15 to 16.67 miles east: the
//  second is crossed before the first, so not after it
wrefused('a meridian crossed earlier in the same step', ['waypoint A meridian ' + f6(15.5), 'waypoint B meridian ' + f6(15.2)], 'does not cross');

//  a clearing waypoint splits a leg's time by distance: at the corner
//  (0, 30), 15 nm and 13.33 nm from the meridian and from 04:20
var wc = MOTOR.waypoints(L3, course([EAST_BUOY]), motor(['speed same', 'scale current 0', 'step time 600',
  'waypoint Half way out meridian ' + f6(15), 'clear The corner 0 ' + f6(30), 'waypoint East Buoy mark']));
var LC = wc.ok ? MOTOR.legs(wc.points) : [];
ok('a clearing waypoint makes two legs of one', LC.length === 6);
if (LC.length === 6) {
  ok('its time is shared by distance: 15 + 13.33 nm in 2h50, so 90 and 80 minutes',
     near(LC[1].minutes, 170 * 15 / (15 + 13 + 1 / 3), 1e-6) && near(LC[2].minutes, 170 * (13 + 1 / 3) / (15 + 13 + 1 / 3), 1e-6));
  ok('so her speed is the same on both parts', near(LC[1].still, LC[2].still, 1e-9));
  ok('and the timed waypoints keep Level 3\'s times', LC[2].t1 === at(4 + 20 / 60) && LC[1].t0 === at(1.5));
}

// =====================================================================
console.log('sailing');
// =====================================================================
var l1 = plan({ scale: 0 });
ok('Level 1 sails', l1.ok, l1.why);
if (l1.ok) {
  ok('Level 1 arrives at every one of Level 3\'s times', l1.legs.every(function (l) { return l.sailed.arrived && Math.abs(l.sailed.ms - l.t1) < 1; }));
  ok('and never leaves her line', l1.legs.every(function (l) { return Math.abs(l.sailed.maxOff) < 1e-9; }));
  ok('in still water she heads where she goes', l1.legs[0].sailed.rows.every(function (r) { return near(r.heading, 90, 1e-9); }));
}
var l1scaled = plan({ scale: 0, current: stream(DAY, [[0, 50], [0, 50]]) });
ok('"scale current 0" is still water, whatever the grid says', l1scaled.ok && Math.abs(l1scaled.legs[4].sailed.ms - at(6)) < 1);

//  TWO KNOTS NORTH, everywhere.  Same speed:
//    leg 1, east at 10: heads up asin(2/10) = 11.54 deg, makes sqrt(96) = 9.798
//    leg 2, 048.4 at 7.083: across 2 sin(48.4) = 1.495, along 2 cos(48.4) = 1.329,
//           makes sqrt(7.083^2 - 1.495^2) + 1.329
//    the rest north at 10: makes 12
var same = plan({ scale: 1, speed: 'same' });
ok('Level 2, same speed, sails', same.ok, same.why);
if (same.ok) {
  var a1 = Math.atan2(15, 13 + 1 / 3), v2 = DIAG / (170 / 60);
  var mg2 = Math.sqrt(v2 * v2 - Math.pow(2 * Math.sin(a1), 2)) + 2 * Math.cos(a1);
  var h1 = 15 / Math.sqrt(96), h2 = DIAG / mg2, h3 = (2 / 3) / 12, h4 = 1 / 12, h5 = 15 / 12;
  var hand = [h1, h1 + h2, h1 + h2 + h3, h1 + h2 + h3 + h4, h1 + h2 + h3 + h4 + h5];
  ok('leg 1: heads 101.54, into the stream', near(same.legs[0].sailed.rows[0].heading, 90 + Math.asin(0.2) * 180 / Math.PI, 1e-9));
  ok('leg 1: makes good 9.798 kn along her line', near(same.legs[0].sailed.rows[0].made, Math.sqrt(96), 1e-9));
  same.legs.forEach(function (l, j) {
    ok('leg ' + l.n + ': arrives when the triangle says, ' + new Date(T0 + hand[j] * HOUR).toISOString().slice(11, 19),
       near(l.sailed.ms, T0 + hand[j] * HOUR, MS), ((l.sailed.ms - T0 - hand[j] * HOUR) / 1000).toFixed(3) + ' s out');
  });
  ok('and holds every line exactly', same.legs.every(function (l) { return Math.abs(l.sailed.maxOff) < 1e-9 && !l.sailed.held.length; }));
  ok('the report says she finishes before Level 3', /0h3\d before Level 3/.test(MOTOR.report(same)), MOTOR.report(same).split('\n').filter(function (x) { return /finishes/.test(x); })[0]);
}

//  On time: the speed whose triangle makes good exactly Level 1's speed
//    leg 1   sqrt(10^2 + 2^2)                      = 10.198
//    leg 2   sqrt((7.083 - 1.329)^2 + 1.495^2)      =  5.946
//    north   10 - 2                                 =  8
var on = plan({ scale: 1, speed: 'on-time' });
ok('Level 2, on time, sails', on.ok, on.why);
if (on.ok) {
  var b1 = Math.atan2(15, 13 + 1 / 3), u2 = DIAG / (170 / 60);
  var need = [Math.sqrt(104), Math.hypot(u2 - 2 * Math.cos(b1), 2 * Math.sin(b1)), 8, 8, 8];
  on.legs.forEach(function (l, j) {
    ok('leg ' + l.n + ': needs ' + need[j].toFixed(3) + ' kn', near(l.v, need[j], 0.001), l.v);
    ok('leg ' + l.n + ': and so keeps Level 3\'s time to a second', l.sailed.arrived && Math.abs(l.sailed.ms - l.t1) < 1000 && l.sailed.ms <= l.t1);
  });
}

//  HALF THE STREAM: scale 0.5 of two knots is one, so leg 1 needs
//  sqrt(10^2 + 1^2) = 10.050
var half = plan({ scale: 0.5, speed: 'on-time' });
ok('scale 0.5 halves the stream: leg 1 needs 10.050 kn', half.ok && near(half.legs[0].v, Math.sqrt(101), 0.001), half.ok && half.legs[0].v);

//  TWELVE KNOTS NORTH FOR AN HOUR, then slack by 01:10 and still after.
//  Across her eastward line and stronger than her ten knots, so she
//  cannot hold it: she heads at right angles to it, into the stream.
var SURGE = stream(['2025-05-24T00:00Z', '2025-05-24T01:00Z', '2025-05-24T01:10Z', '2025-05-24T12:00Z'],
                   [[0, 12], [0, 12], [0, 0], [0, 0]]);
var set = plan({ scale: 1, speed: 'same', current: SURGE });
ok('a stream she cannot hold against is sailed, not refused', set.ok, set.why);
if (set.ok) {
  var s1 = set.legs[0].sailed, r0 = s1.rows[0];
  ok('the first step: she cannot hold the line', r0.held === false);
  ok('she heads 180, at right angles to her line and into the stream', near(r0.heading, 180, 1e-9));
  ok('and is set north at 12 - 10 = 2 knots', near(r0.cog, 0, 1e-9) && near(r0.sog, 2, 1e-9));
  ok('the report has the time it began, 00:00', s1.held.length >= 1 && s1.held[0].from === T0);
  ok('and that the stream across her was 12 kn, against her 10', s1.held.length && near(s1.held[0].across, 12, 0.05) && s1.held[0].v === 10);
  ok('she was set at least 2 miles off in the hour', s1.held.length && s1.held[0].worst >= 2 - 1e-6, s1.held.length && s1.held[0].worst);
  ok('she still gets there, late', s1.arrived && s1.ms > set.legs[0].t1 + 30 * MIN);
  ok('she ends on her waypoint', near(set.points[1].lon * 60, 15, 1e-9));
  var txt = MOTOR.report(set);
  ok('the report says where she could not hold the line', /could not hold the line/.test(txt) && /north of the line/.test(txt), txt);
  ok('and does not say she held every line', !/held every line/.test(txt));
}
var setOn = plan({ scale: 1, speed: 'on-time', current: SURGE });
ok('on time against the surge: a speed is found', setOn.ok, setOn.why);
if (setOn.ok) {
  var lz = setOn.legs[0];
  ok('it is more than the 12 knots across her', lz.v > 12, lz.v);
  ok('and keeps the time to a second', Math.abs(lz.sailed.ms - lz.t1) < 1000);
  var slower = MOTOR.sailLeg({ a: lz.from, b: lz.to, v: lz.v - 0.01, t0: lz.t0, current: SURGE, scale: 1, step: 600, limit: lz.t0 + 12 * HOUR });
  ok('a hundredth of a knot less is late: it is the least that will do', slower.ms > lz.t1, (slower.ms - lz.t1) / 1000);
}
//  a stream she can never stem: she stops, and says so
var STUCK = stream(DAY, [[-12, 0], [-12, 0]]);
var stuck = plan({ scale: 1, speed: 'same', current: STUCK });
ok('ten knots into twelve of foul stream does not arrive', stuck.ok && !stuck.legs[0].sailed.arrived);
ok('and the report says so', stuck.ok && /SHE DID NOT ARRIVE/.test(MOTOR.report(stuck)));
ok('on time, it finds the speed the triangle gives: 12 + 10', (function () {
  var s = plan({ scale: 1, speed: 'on-time', current: STUCK });
  return s.ok && near(s.legs[0].v, 22, 0.001);
})());

// =====================================================================
console.log('refusing');
// =====================================================================
//  A wall from 2 to 8 miles north at 20 miles east.  Leg 2 runs from
//  (0, 15) to (13.33, 30), and at 20 miles east it is 4.444 miles north.
var WALL = areas('wall', 'line', [[2, 20], [8, 20]]);
var walled = plan({ areas: [WALL], run: runFile(['layers wall', 'clear wall 0']) });
ok('a leg across a wall is refused', !walled.ok && walled.refused && walled.refused.length === 1, walled.why);
if (walled.refused) {
  var rf = walled.refused[0];
  ok('it names leg 2', rf.leg.n === 2);
  ok('and where it crosses: 4.444 miles north, 20 east', near(rf.hits[0].at.lat * 60, 4 + 4 / 9, NM) && near(rf.hits[0].at.lon * 60, 20, NM));
  ok('it offers Level 3\'s tack at the corner, 03:00, which clears it',
     rf.clears && rf.suggest.length === 1 && rf.suggest[0].kind === 'tack' && rf.suggest[0].ms === at(3) &&
     near(rf.suggest[0].lon * 60, 30, 1e-9) && near(rf.suggest[0].lat, 0, 1e-12));
  var rt = MOTOR.report(walled);
  ok('the report gives the line to add', /clear  L3 tack 03:00  0\.00000 0\.50000/.test(rt), rt);
  ok('and where to put it', /after "Half way out"/.test(rt));
}
//  two walls on leg 2: the refusal names the first she would meet
var twice = plan({ areas: [WALL, areas('wall', 'line', [[6, 25], [12, 25]])], run: runFile(['layers wall', 'clear wall 0']) });
ok('a leg that crosses two things names the first along it first', twice.refused && twice.refused[0].hits.length === 2 &&
   near(twice.refused[0].hits[0].at.lon * 60, 20, NM) && near(twice.refused[0].hits[1].at.lon * 60, 25, NM));
var cleared = plan({ areas: [WALL], run: runFile(['layers wall', 'clear wall 0']),
                     points: ['waypoint Half way out meridian ' + f6(15), 'clear L3 tack 03:00 0 ' + f6(30), 'waypoint East Buoy mark'] });
ok('with the waypoint it offers, she sails', cleared.ok, cleared.why);
ok('a wall in a layer the run does not use is no wall', plan({ areas: [WALL], run: runFile([]) }).ok);

//  a clearance: a line ending 0.2 nm short of leg 1
var SHORT = areas('shoal', 'line', [[0.2, 7], [3, 7]]);
var tooNear = plan({ areas: [SHORT], run: runFile(['layers shoal', 'clear shoal 0.25']) });
ok('passing 0.2 nm from what is kept 0.25 off is refused', !tooNear.ok && tooNear.refused && /passes 0\.20 nm from/.test(tooNear.refused[0].hits[0].how), tooNear.why);
ok('passing 0.2 nm from what is kept 0.1 off is not', plan({ areas: [SHORT], run: runFile(['layers shoal', 'clear shoal 0.1']) }).ok);
//  an area a clearing waypoint is put inside
var BOX = areas('rock', 'area', [[-1, 21], [1, 21], [1, 23], [-1, 23]]);
var inBox = plan({ areas: [BOX], run: runFile(['layers rock']),
                   points: ['waypoint Half way out meridian ' + f6(15), 'clear On the rock 0 ' + f6(22), 'waypoint East Buoy mark'] });
function says(r, leg, how) {
  return r.refused && r.refused.some(function (b) { return b.leg.n === leg && b.hits.some(function (h) { return h.how === how; }); });
}
ok('a waypoint inside an area: the leg to it ends inside', !inBox.ok && says(inBox, 2, 'ends inside'), inBox.why);
ok('and the leg from it starts inside', says(inBox, 3, 'starts inside'));
//  the berth round a mark: Near Rock 0.05 nm off leg 1, the berth 0.10
var berth = plan({ course: course(['mark Near Rock ' + f6(0.05) + ' ' + f6(10) + ' port', EAST_BUOY]) });
ok('a leg inside a mark\'s berth is refused', !berth.ok && berth.refused && /berth round Near Rock/.test(berth.refused[0].hits[0].what), berth.why);
//  the finish pin has no berth: the last mark, 0.05 nm west of the finish
var pinned = plan({ course: course([EAST_BUOY, 'mark Pin Buoy ' + f6(30) + ' ' + f6(29.95) + ' starboard'],
                                   'finish line ' + f6(30) + ' ' + f6(29.95) + ' to ' + f6(30) + ' ' + f6(30.5) + ' cross north') });
ok('a mark that ends the finish line keeps no berth, as in the router', pinned.ok, pinned.why);
var avoidF = plan({ run: runFile(['avoid The Rock 0 ' + f6(5) + ' off 0.5']) });
ok('water the run says to avoid is avoided', !avoidF.ok && avoidF.refused && /off The Rock/.test(avoidF.refused[0].hits[0].what), avoidF.why);

// =====================================================================
console.log('the arc round a mark');
// =====================================================================
//  A rock on leg 2, 2.16 nm from the buoy -- nearer than Level 3's
//  04:10 point (2.39 nm), so the arc takes 04:10 and goes round it.
var NEAR_ROCK = areas('rock', 'area', [[12.394, 28.95], [12.494, 28.95], [12.494, 29.05], [12.394, 29.05]]);
var grown = plan({ areas: [NEAR_ROCK], run: runFile(['layers rock']) });
ok('a danger near the mark grows the arc, and she sails', grown.ok, grown.why);
if (grown.ok) {
  var arc = grown.points[2].arc;
  ok('the arc takes 04:10 as well: two points before, one after', arc.before === 2 && arc.after === 1 && grown.points[2].ms === at(4 + 10 / 60));
  ok('and says what it grew to clear', arc.grew.indexOf('rock') >= 0 && /grown to clear rock/.test(MOTOR.report(grown)));
  ok('04:10 keeps Level 3\'s time, so leg 2 is now 2h40', near(grown.legs[1].minutes, 160, 1e-6));
}
//  The same rock half-way along leg 2 is 11.5 nm from the buoy, far past
//  any arc point: the leg is refused and the arc left alone.
var FAR_ROCK = areas('rock', 'area', [[6.172, 21.95], [6.272, 21.95], [6.272, 22.05], [6.172, 22.05]]);
var far = plan({ areas: [FAR_ROCK], run: runFile(['layers rock']) });
ok('a danger far from the mark does not grow the arc', !far.ok && far.points[2].arc.before === 1, far.why);
ok('it is refused as the leg\'s, with Level 3\'s corner to clear it', far.refused && far.refused[0].leg.n === 2 &&
   far.refused[0].clears && far.refused[0].suggest[0].ms === at(3));

// =====================================================================
console.log('what PILOT draws');
// =====================================================================
if (same.ok) {
  var D = MOTOR.data(same);
  ok('every waypoint, with Level 3\'s time', D.points.length === 6 && D.points.every(function (p) { return p.l3; }));
  ok('the arc points say whose arc they are', D.points[2].arc === 'East Buoy' && D.points[4].arc === 'East Buoy');
  ok('every leg, with its track step by step', D.legs.length === 5 && D.legs.every(function (l) { return l.sailed && l.sailed.track.length > 0; }));
  ok('each step has where, the heading, the stream and how far off the line',
     ['at', 'lat', 'lon', 'heading', 'stw', 'set', 'drift', 'cog', 'sog', 'off', 'held'].every(function (k) { return k in D.legs[0].sailed.track[0]; }));
  ok('and how early or late, in minutes', near(D.legs[0].sailed.late, (15 / Math.sqrt(96) - 1.5) * 60, 0.001));
}
if (walled.refused) {
  var DR = MOTOR.data(walled);
  ok('a refusal is drawn too: the leg, where, and the waypoint offered', DR.ok === false && DR.refused[0].leg === 2 &&
     DR.refused[0].hits.length >= 1 && DR.refused[0].suggest.length === 1 && DR.refused[0].clears === true);
}
ok('every report line fits 80 columns', [l1, same, on, set, walled, grown, far].every(function (r) {
  return MOTOR.report(r).split('\n').every(function (x) { return x.length <= 80; });
}));

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');
