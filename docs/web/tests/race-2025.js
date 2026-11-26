//  The router held to a real race: the RORC Myth of Malham, 24 May 2025.
//
//  tests/router.js holds the router to courses small enough to sail in
//  your head.  This holds it to a race that was sailed: PILOT's course,
//  coastline, wind, stream and polar, and the real boats' finishing
//  times as RORC published them.  It is board item B3.
//
//  WHAT IS HELD, AND WHY THESE FOUR (Larry, 14 November 2026).
//
//    rules      The rules of the course, checked on every route this
//               file sails, by arithmetic that owes nothing to the
//               router: every step of the track against every piece of
//               the coastline, every berth, the hand each mark was left
//               on.  The router keeps its water in a table of squares
//               for speed; this goes through all of it, slowly.
//
//    orderings  Things that must be so whatever the answer is.  A
//               restriction never makes her faster.  A worse crew is
//               never quicker.  A finer step is never much slower.
//               Every fault found in the router's search so far was
//               found by one of these and not by a wrong number: the
//               crack crew that beat free tacks, the mark that could be
//               unwound, the boat lost in a light air.
//
//    pins       The times the documents and the lessons quote, written
//               down here.  A change that moves one is seen, and has to
//               be made on purpose, with its reason in the CHANGELOG.
//               Twice a published figure moved because the search
//               changed; both were right, and both were found by hand.
//
//    boats      The real boats, at the finish.  The router's boat is a
//               generic 70 ft racing yacht with free tacks and a forecast
//               it knows in advance, so it should finish ahead of every
//               real boat, and that is held against each boat's elapsed
//               time in RORC's published results (RORC_RESULTS below).
//
//               UNTIL LARRY CONFIRMS THOSE FIGURES THE PART IS NOT HELD,
//               and says so on every run; it never passes for want of
//               them.  Under Larry's ruling TBNM (25 November 2026) this
//               part no longer reads the real boats' times at nine lines
//               (PILOT's legs file).  Those times were worked out from
//               tracker data that had been fetched without its
//               publishers' permission (PILOT's record, 25 November
//               2026), so they are not used here or quoted in ROUTER.md.
//               The nine lines stay: the router's own times at them are
//               pinned, which needs no one else's data.
//
//  WHAT IS NOT HELD.  Single legs, and any boat's time between the start
//  and the finish: RORC publishes the finish.

//  THE DATA IS READ WHERE IT LIVES (Larry, 14 November 2026): PILOT's
//  folder, practical-navigator/data/2025/, beside this repository.
//  Nothing is copied, because a copy would have missed both of the
//  corrections PILOT has already made.  Each file is pinned by its
//  checksum, so a file that changes is NAMED as the cause, and a time
//  that moved is never reported without one.  If the folder is not
//  there this fails and says so: a check that passes because it could
//  not look is worse than none.
//
//  A MINUTE OR TWO IS NOT A FINDING (ROUTER.md, "What the search can
//  resolve"), so every comparison of two times here allows two minutes.
//
//  It sails the race eleven times and takes about two minutes, so it is
//  its own command and the full suite runs it once; it is not in the
//  one-second gate (Larry, 14 November 2026).
//
//    node docs/web/tests/race-2025.js                 all of it
//    node docs/web/tests/race-2025.js boats pins      some parts
//    node docs/web/tests/race-2025.js --data <folder> another copy of the data
//    node docs/web/tests/race-2025.js --show          print what it measured
//
//  The parts: files rules pins boats crews limits steps motor.
//
//  MOTOR (B21, Larry, 14 November 2026): the motorboat of Levels 1 and
//  2, derived from the as-sailed run.  What the lesson will quote is
//  pinned here: which of her rhumb lines are refused, and the Level 3
//  points offered to clear them; the arc round the Eddystone; Level 1
//  arriving on every time; Level 2's finish at the same speed; and that
//  in 2025 she never meets a stream across her line as strong as she is.
'use strict';
var fs = require('fs'), path = require('path'), crypto = require('crypto');
var ROUTE = require('../route/route.js');
var ROUTER = require('../route/router.js');
var SAIL = require('../route/sail.js');
var COURSE = require('../route/course.js');
var MOTOR = require('../route/motor.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function say(s) { console.log(s); }

// ---- what was asked -------------------------------------------------
var PARTS = ['files', 'rules', 'pins', 'boats', 'crews', 'limits', 'steps', 'motor'];
var DATA = path.join(__dirname, '..', '..', '..', '..', 'practical-navigator', 'data', '2025');
var want = [], SHOW = false, argv = process.argv.slice(2), ai;
for (ai = 0; ai < argv.length; ai++) {
  if (argv[ai] === '--data') { DATA = argv[++ai]; continue; }
  if (argv[ai] === '--show') { SHOW = true; continue; }
  if (PARTS.indexOf(argv[ai]) < 0) {
    say('race-2025: "' + argv[ai] + '" is not a part. The parts are: ' + PARTS.join(' '));
    process.exit(2);
  }
  want.push(argv[ai]);
}
if (!want.length) want = PARTS.slice();
function asked(p) { return want.indexOf(p) >= 0; }

if (!DATA || !fs.existsSync(path.join(DATA, 'course_2025_v3.txt'))) {
  say('  FAIL  the 2025 race data is not at ' + DATA);
  say('        This check reads PILOT\'s folder, practical-navigator/data/2025/, where it lives.');
  say('        Put that repository beside this one, or say where it is: --data <folder>');
  process.exit(1);
}

// ---- the files, pinned ------------------------------------------------
//  sha256, first sixteen characters.  Taken on 14 November 2026; the
//  stream and the two runs on 15 November, when this check moved to the
//  Copernicus stream (Larry: "move both").
//
//  THE STREAM IS COPERNICUS'S, not the Shom atlas's.  The atlas has no
//  data west of about Cowes, so the router sailed the western Solent as
//  still water; the Copernicus North-West Shelf model covers it.  PILOT's
//  Shom runs stay in its folder, unchanged, and are no longer read here.
//
//  LARRY'S STREAM READINGS ARE PINNED TOO, because ROUTER.md's first run
//  quotes them (the model's ebb at Hurst runs light): if they change, so
//  does what the documents say about the stream there.
var AS_SAILED = 'run_2025_as_sailed_cmems_v1.txt';
var HEADLANDS = 'run_2025_headlands_1nm_cmems_v1.txt';
var PINNED = {
  'course_2025_v3.txt':                  'e840534aa9c58780',
  'areas_rules_2025.txt':                '37d2ff50b2a3f532',
  'areas_coast_emodnet_2025.txt':        '8909ebf7ff006bd2',
  'wind_20250524_00z_v2.grid':           '6b112cc12af4944d',
  'current_20250524_cmems_v1.grid':      'c8790f97dbfaebec',
  'polar_generic70_v1.txt':              '4646a1e3b720aab6',
  'run_2025_as_sailed_cmems_v1.txt':     'c7ed2127729e5745',
  'run_2025_headlands_1nm_cmems_v1.txt': '4187a58e653a109d',
  'stream_check_readings_2025_v1.txt':   '51ecd1f0aa4c7a1f'
};
function fileText(name) {
  try { return fs.readFileSync(path.join(DATA, name), 'utf8'); } catch (e) { return null; }
}
var changed = [];
Object.keys(PINNED).forEach(function (name) {
  var buf = null;
  try { buf = fs.readFileSync(path.join(DATA, name)); } catch (e) { buf = null; }
  var sum = buf ? crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16) : 'not there';
  if (SHOW) say('  file  ' + name + '  ' + sum);
  if (sum !== PINNED[name]) changed.push(name + (buf ? '' : ' (not there)'));
  if (asked('files')) {
    ok('PILOT\'s ' + name + ' is the file these checks were held against', sum === PINNED[name],
       buf ? 'it has changed since it was pinned: is ' + sum + ', was ' + PINNED[name] +
             '. Every time below was measured on the old file; read the new one, then pin it on purpose.'
           : 'it is not in ' + DATA);
  }
});
//  said once, whatever parts were asked for, so that a failure further
//  down is read with its likely cause beside it
if (changed.length) {
  say('  NOTE  ' + changed.length + ' of PILOT\'s files differ from the ones pinned: ' + changed.join(', '));
  say('        A time or a rule that fails below may be the file, and not the router.');
}

// ---- sailing a run, and keeping it ------------------------------------
var CREW_FILE = 'crew_starting_v1.txt';
var made = {};                  //  texts this file writes, by name
function read(name) {
  if (Object.prototype.hasOwnProperty.call(made, name)) return made[name];
  if (name === CREW_FILE) {     //  the crew file is bashnav's own
    try { return fs.readFileSync(path.join(__dirname, '..', 'route', CREW_FILE), 'utf8'); } catch (e) { return null; }
  }
  return fileText(name);
}
//  a run written from PILOT's as-sailed run, by changing lines of it; a
//  line that is not there to change is said, not passed over
var BASE = fileText(AS_SAILED) || '';
function variant(name, edits) {
  var t = BASE, i;
  for (i = 0; i < edits.length; i++) {
    if (!edits[i][0].test(t)) {
      ok('PILOT\'s as-sailed run has the line the ' + name + ' run is made from', false,
         'no line matching ' + edits[i][0] + ' in ' + AS_SAILED);
      return null;
    }
    t = t.replace(edits[i][0], edits[i][1]);
  }
  made[name] = t;
  return name;
}
var V3 = [/^RUN 2[ \t]*$/m, 'RUN 3'];
function withCrew(level) {
  return variant('b3_crew_' + level + '.txt', [V3, [/^end[ \t]*$/m, 'crew ' + CREW_FILE + ' ' + level + '\nend']]);
}
function withPlan(plan) {
  return variant('b3_plan_' + plan + '.txt',
                 [V3, [/^round[ \t].*$/m, ''], [/^end[ \t]*$/m, 'passage b3_passage.txt ' + plan + '\nend']]);
}
//  the plans: the Eddystone at the berth `round` gives and at PILOT's
//  0.15, and the Level 1 headlands, as lines to cross and as circles
var HEADS = { 'St Albans Head': '50.57868 -2.05644', 'Portland Bill': '50.51353 -2.45676' };
function passes(word) {
  function p(n) { return '  pass ' + n + ' ' + HEADS[n] + ' ' + word + 'within 2.0'; }
  return [p('St Albans Head'), p('Portland Bill'), '  mark Eddystone Lt House berth 0.15',
          p('Portland Bill'), p('St Albans Head'), '  mark North Head Buoy'];
}
made['b3_passage.txt'] = ['PASSAGE 1',
  'plan berth-010', '  mark Eddystone Lt House berth 0.10', '  mark North Head Buoy',
  'plan berth-015', '  mark Eddystone Lt House berth 0.15', '  mark North Head Buoy',
  'plan lines'].concat(passes('south ')).concat(['plan circles']).concat(passes('')).concat(['end']).join('\n') + '\n';

var RUNS = {};
function sailed(label, runName) {
  if (RUNS[label]) return RUNS[label];
  var t0 = Date.now(), out = { label: label, ok: false, why: 'the run could not be written' };
  if (runName) {
    var env = SAIL.load(read, runName);
    if (!env.ok) out.why = env.err;
    else {
      var r = ROUTER.run({ course: env.course, run: env.run, areas: env.areas, wind: env.wind,
                           current: env.current, polar: env.polar, crew: env.crew, passage: env.passage });
      if (!r.ok) out.why = r.why;
      else {
        out = { label: label, ok: true, env: env, rows: r.rows, sum: r.summary, iso: r.isochrones,
                gun: Date.parse(r.summary.start), end: Date.parse(r.summary.finish) };
        out.faults = rules(out);
      }
    }
  }
  say('  sailed  ' + label + ': ' + (out.ok ? out.sum.finish + ', ' + out.sum.hours.toFixed(2) + ' h' : 'NO ROUTE - ' + out.why) +
      '  (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  RUNS[label] = out;
  return out;
}
//  every route this file uses is found, and keeps the rules
function sound(r) {
  ok('the ' + r.label + ' run is sailed', r.ok, r.why);
  if (!r.ok) return false;
  ok('the ' + r.label + ' route keeps every rule of the course, checked step by step against all of the water',
     r.faults.length === 0, r.faults.slice(0, 6).join('\n        ') + (r.faults.length > 6 ? '\n        ... and ' + (r.faults.length - 6) + ' more' : ''));
  //  THE ISOCHRONES (Larry, AGE and AGL, 16 November 2026): the search's
  //  own lines, written down once an hour for Level 3 to draw.  What is
  //  held on a real race is what makes them worth drawing: there is one
  //  for every hour she was out, and the route runs through every one of
  //  them, so where she was at that hour is one of the positions the
  //  line holds, on the leg she was on.
  var lost = isoLost(r);
  ok('the ' + r.label + ' route has an isochrone for every hour, and runs through every one of them',
     lost.length === 0, lost.slice(0, 4).join('\n        '));
  return true;
}
function isoLost(r) {
  var bad = [], L = r.iso ? r.iso.lines : null, k;
  if (!L) return ['the route has no isochrones'];
  var want = Math.floor((r.rows[r.rows.length - 1].ms - r.gun) / 3600000 + 1e-9);
  if (L.length !== want) bad.push(L.length + ' isochrones for a finishing step that began ' + want + ' whole hours out');
  L.forEach(function (h, n) {
    var ms = Date.parse(h.t), at = -1;
    if (ms !== r.gun + (n + 1) * 3600000 || h.hours !== n + 1) bad.push('isochrone ' + (n + 1) + ' is at ' + h.t + ' and says ' + h.hours + ' h');
    if (h.n !== h.at.length || h.n < 1) bad.push(h.t + ' says ' + h.n + ' positions and holds ' + h.at.length);
    for (k = 0; k < r.rows.length; k++) if (Math.abs(r.rows[k].ms + r.rows[k].minutes * 60000 - ms) < 1) at = k;
    if (at < 0 || at + 1 >= r.rows.length) { bad.push('no step of the route ends at ' + h.t); return; }
    var w = r.rows[at], leg = r.rows[at + 1].leg;
    if (!h.at.some(function (p) {
      return Math.abs(p[0] - w.lat2) < 0.6e-5 && Math.abs(p[1] - w.lon2) < 0.6e-5 && p[2] === leg;
    })) bad.push('at ' + h.t + ' she was at ' + w.lat2.toFixed(5) + ' ' + w.lon2.toFixed(5) + ' on leg ' + leg + ', which the isochrone does not hold');
  });
  return bad;
}

// ---- the rules, by arithmetic of this file's own ----------------------
//  Miles on a flat chart laid at the place being measured: a minute of
//  latitude is a mile, a minute of longitude a mile times the cosine of
//  the latitude THERE.  The router lays one chart for the whole course,
//  so its tenth of a mile and this one's differ by the flatness of that
//  chart: three parts in a thousand between the Solent and the
//  Eddystone.  Distances are held to one part in a hundred.
var RAD = Math.PI / 180, SLACK = 0.99, EPS = 1e-4;
function chartAt(lat) { var k = 60 * Math.cos(lat * RAD); return function (p) { return { x: p[1] * k, y: p[0] * 60 }; }; }
function ptSeg(p, a, b) {
  var vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy, t = 0;
  if (L > 0) { t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L; t = t < 0 ? 0 : (t > 1 ? 1 : t); }
  return Math.hypot(a.x + t * vx - p.x, a.y + t * vy - p.y);
}
function side(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
function crosses(a, b, c, d) {      //  the two cut each other, each strictly between the other's ends
  var s1 = side(a, b, c), s2 = side(a, b, d), s3 = side(c, d, a), s4 = side(c, d, b);
  return ((s1 > 0 && s2 < 0) || (s1 < 0 && s2 > 0)) && ((s3 > 0 && s4 < 0) || (s3 < 0 && s4 > 0));
}
function segSeg(a, b, c, d) {
  if (crosses(a, b, c, d)) return 0;
  return Math.min(ptSeg(a, c, d), ptSeg(b, c, d), ptSeg(c, a, b), ptSeg(d, a, b));
}
//  how near the track comes to a point, and when
function nearest(rows, lat, lon) {
  var ch = chartAt(lat), p = ch([lat, lon]), best = { nm: 1e9, ms: 0 };
  rows.forEach(function (w) {
    var a = ch([w.lat, w.lon]), b = ch([w.lat2, w.lon2]);
    var vx = b.x - a.x, vy = b.y - a.y, L = vx * vx + vy * vy, t = 0;
    if (L > 0) { t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L; t = t < 0 ? 0 : (t > 1 ? 1 : t); }
    var d = Math.hypot(a.x + t * vx - p.x, a.y + t * vy - p.y);
    if (d < best.nm) best = { nm: d, ms: w.ms + t * w.minutes * 60000 };
  });
  return best;
}
//  how far round a point the track swings, in compass degrees:
//  clockwise is positive, so a mark left to port is about -360
function swing(rows, lat, lon) {
  var ch = chartAt(lat), c = ch([lat, lon]), tot = 0, last = null;
  rows.forEach(function (w) {
    [[w.lat, w.lon], [w.lat2, w.lon2]].forEach(function (q) {
      var p = ch(q), b = Math.atan2(p.x - c.x, p.y - c.y) / RAD;
      if (last !== null) { var d = b - last; while (d > 180) d -= 360; while (d < -180) d += 360; tot += d; }
      last = b;
    });
  });
  return tot;
}
function rules(r) {
  var out = [], rows = r.rows, env = r.env, run = env.run, i;
  function fault(s) { out.push(s); }

  //  1. the rows hand on, and each is a step the lower layers would own
  for (i = 0; i < rows.length; i++) {
    var w = rows[i];
    if (ROUTE.consistent(w, w.heading, w.stw, w.set === null ? 0 : w.set, w.drift) !== true) fault('row ' + i + ' is not a step the vector layer would make');
    if (!(w.minutes > 0)) fault('row ' + i + ' takes no time');
    if (i) {
      var q = rows[i - 1];
      if (Math.abs(q.lat2 - w.lat) > 1e-9 || Math.abs(q.lon2 - w.lon) > 1e-9) fault('row ' + i + ' does not begin where row ' + (i - 1) + ' ended');
      if (Math.abs(q.ms + q.minutes * 60000 - w.ms) > 1) fault('row ' + i + ' does not begin when row ' + (i - 1) + ' ended');
    }
  }

  //  2. she starts at the gun, on the course side of the start line
  var cls = run.start.by === 'class' ? env.course.classOf(run.start.name) : null;
  var gun = Date.parse((cls ? cls.at : run.start.at).replace(/Z$/, ':00Z'));
  if (rows[0].ms !== gun) fault('she starts at ' + new Date(rows[0].ms).toISOString() + ', and the gun is at ' + new Date(gun).toISOString());
  var st = env.course.start, chs = chartAt(st.a.lat);
  var d0 = ptSeg(chs([rows[0].lat, rows[0].lon]), chs([st.a.lat, st.a.lon]), chs([st.b.lat, st.b.lon]));
  if (d0 > 0.05) fault('she starts ' + d0.toFixed(3) + ' nm from the start line');
  //  ... and finishes on the finish line, crossing it the way the course says
  var fin = env.course.finish, chf = chartAt(fin.a.lat), lastRow = rows[rows.length - 1];
  var d1 = ptSeg(chf([lastRow.lat2, lastRow.lon2]), chf([fin.a.lat, fin.a.lon]), chf([fin.b.lat, fin.b.lon]));
  if (d1 > 0.002) fault('her last row ends ' + d1.toFixed(4) + ' nm from the finish line');
  var a1 = chf([lastRow.lat, lastRow.lon]), b1 = chf([lastRow.lat2, lastRow.lon2]);
  if ((b1.x - a1.x) * Math.sin(fin.cross * RAD) + (b1.y - a1.y) * Math.cos(fin.cross * RAD) <= 0) fault('she crosses the finish line the wrong way');
  if (Math.abs(lastRow.ms + lastRow.minutes * 60000 - r.end) > 1000) fault('the finish time is not when her last row ends');

  //  3. the water: every step against every piece of every live layer
  var live = {};
  (run.layers || []).forEach(function (l) { live[l] = { clear: (run.clear && run.clear[l]) || 0, min: 1e9, cut: 0 }; });
  var boxes = rows.map(function (w) {
    return { s: Math.min(w.lat, w.lat2) - 0.02, n: Math.max(w.lat, w.lat2) + 0.02,
             w: Math.min(w.lon, w.lon2) - 0.03, e: Math.max(w.lon, w.lon2) + 0.03 };
  });
  env.areas.forEach(function (af) {
    af.shapes.forEach(function (sh) {
      var L = live[sh.layer];
      if (!L) return;
      var p = sh.points, n = p.length, lim = sh.kind === 'area' ? n : n - 1, j, k;
      for (j = 0; j < lim; j++) {
        var c = p[j], d = p[(j + 1) % n];
        var cs = Math.min(c[0], d[0]), cn = Math.max(c[0], d[0]), cw = Math.min(c[1], d[1]), ce = Math.max(c[1], d[1]);
        for (k = 0; k < rows.length; k++) {
          var bx = boxes[k];
          if (cn < bx.s || cs > bx.n || ce < bx.w || cw > bx.e) continue;
          var ch = chartAt(rows[k].lat);
          var dist = segSeg(ch([rows[k].lat, rows[k].lon]), ch([rows[k].lat2, rows[k].lon2]), ch(c), ch(d));
          if (dist === 0) L.cut++;
          if (dist < L.min) L.min = dist;
        }
      }
    });
  });
  Object.keys(live).forEach(function (l) {
    if (live[l].cut) fault(live[l].cut + ' step(s) cross ' + l);
    else if (live[l].clear > 0 && live[l].min < live[l].clear * SLACK - EPS) {
      fault('she comes within ' + live[l].min.toFixed(4) + ' nm of ' + l + ', and the run keeps her ' + live[l].clear + ' off');
    }
  });
  r.water = live;

  //  4. what the run keeps her off, and the berth of each mark she rounds
  (run.gates || []).forEach(function (g) {
    if (g.rule !== 'avoid') return;
    var n1 = nearest(rows, g.lat, g.lon).nm;
    if (n1 < g.nm * SLACK - EPS) fault('she comes within ' + n1.toFixed(4) + ' nm of ' + g.name + ', and the run keeps her ' + g.nm + ' off');
  });
  //  The berth is read from what was ASKED -- the plan's line for that
  //  mark, or the run's `round` -- and not from what the route says it
  //  kept.  (The first form of this read the route's own summary, and a
  //  router that ignored the plan's berth passed: it was held to the
  //  figure it had used.)
  r.berths = [];
  var rounded = r.sum.rounded || [], mk = 0, planMarks = [];
  if (run.passage && env.passage) {
    planMarks = env.passage.plans[run.passage.plan].items.filter(function (it) { return it.kind === 'mark'; });
  }
  env.course.marks.forEach(function (m, mi) {
    if (r.sum.pin === m.name) return;
    var asked = run.passage ? (planMarks[mi] && planMarks[mi].name === m.name ? planMarks[mi].berth : null) : run.round;
    var got = rounded[mk++];
    if (!got || got.mark !== m.name) { fault('the summary does not say she rounded ' + m.name); return; }
    if (!(asked > 0)) { fault('nothing says what berth ' + m.name + ' was to be given'); return; }
    if (got.berth !== asked) fault('the route says it gave ' + m.name + ' a berth of ' + got.berth + ', and ' + asked + ' was asked');
    var n2 = nearest(rows, m.lat, m.lon).nm, sw = swing(rows, m.lat, m.lon);
    r.berths.push({ mark: m.name, berth: asked, nearest: n2, swing: sw });
    if (n2 < asked * SLACK - EPS) fault('she comes within ' + n2.toFixed(4) + ' nm of ' + m.name + ', inside its berth of ' + asked);
    //  an out-and-back mark is gone right round: a whole turn, the way
    //  its side says
    if (m.side === 'port' && !(sw < -300)) fault(m.name + ' is to be left to port, and the track swings ' + sw.toFixed(0) + ' degrees round it');
    if (m.side === 'starboard' && !(sw > 300)) fault(m.name + ' is to be left to starboard, and the track swings ' + sw.toFixed(0) + ' degrees round it');
  });

  //  5. each passing mark of the plan is made: a circle come into, a line crossed
  if (run.passage && env.passage) {
    var DEG = { north: 0, east: 90, south: 180, west: 270 };
    env.passage.plans[run.passage.plan].items.forEach(function (it) {
      if (it.kind !== 'pass') return;
      if (!it.dir) {
        var n3 = nearest(rows, it.lat, it.lon).nm;
        if (n3 > it.nm / SLACK + EPS) fault('she never comes within ' + it.nm + ' nm of ' + it.name + ': nearest ' + n3.toFixed(3));
        return;
      }
      var ch = chartAt(it.lat), a = ch([it.lat, it.lon]);
      var b = { x: a.x + Math.sin(DEG[it.dir] * RAD) * it.nm, y: a.y + Math.cos(DEG[it.dir] * RAD) * it.nm }, hit = 0;
      rows.forEach(function (w) { if (segSeg(ch([w.lat, w.lon]), ch([w.lat2, w.lon2]), a, b) < 1e-3) hit++; });
      if (!hit) fault('no step of the track reaches the line ' + it.nm + ' nm ' + it.dir + ' from ' + it.name);
    });
    var planPasses = env.passage.plans[run.passage.plan].items.filter(function (it) { return it.kind === 'pass'; }).length;
    if ((r.sum.passed || []).length !== planPasses) fault('the plan has ' + planPasses + ' passing marks and the summary says she made ' + (r.sum.passed || []).length);
  }
  return out;
}

// ---- times -------------------------------------------------------------
var TOL = 120;                       //  seconds: a minute or two is not a finding
function secs(r) { return (r.end - r.gun) / 1000; }
function hms(s) { s = Math.round(s); return Math.floor(s / 3600) + 'h' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + 'm' + ('0' + s % 60).slice(-2) + 's'; }
function notFaster(what, slow, fast) {
  //  `slow` is the run that has more asked of it: it may not finish
  //  more than the search resolves before `fast`
  if (!slow.ok || !fast.ok) return;
  ok(what, secs(slow) >= secs(fast) - TOL,
     slow.label + ' finishes after ' + hms(secs(slow)) + ' and ' + fast.label + ' after ' + hms(secs(fast)) +
     ': ' + Math.round(secs(fast) - secs(slow)) + ' s the wrong way, and ' + TOL + ' s is all the search can fail to tell apart');
}
//  THE PUBLISHED TIMES.  Seconds from the gun to the finish, as sailed
//  on 14 November 2026 with the files pinned above.  ROUTER.md, the
//  CHANGELOG and PILOT's lessons quote these.  To change one, change the
//  router on purpose, say why in the CHANGELOG, and write the new time.
//  Re-pinned on 15 November 2026 when the stream became Copernicus's
//  (Larry: "move both"); the reason is in the CHANGELOG.
var FINISH = {
  'as-sailed':        84615,   //  09:30:15Z, 23.50 hours: tacks free, PILOT's run as it stands
  'headlands':        84615,   //  09:30:15Z: a mile off three headlands costs nothing on this stream
  'crack crew':       84843,   //  09:34:03Z
  'able crew':        85443,   //  09:44:03Z
  'ordinary crew':    86052,   //  09:54:12Z
  'green crew':       87322,   //  10:15:22Z
  'berth 0.15':       84739,   //  09:32:19Z: the Eddystone at PILOT's berth
  'lines':            85167,   //  09:39:27Z: the Level 1 headlands, south within two miles
  'circles':          85111,   //  09:38:31Z: the same as circles
  'five-minute step': 84184    //  09:23:04Z, 23.38 hours
};
function pinned(r) {
  if (!r.ok) return;
  if (SHOW) say('  time  ' + JSON.stringify(r.label) + ': ' + Math.round(secs(r)) + ',   // ' + r.sum.finish + ', ' + hms(secs(r)));
  ok('the ' + r.label + ' run finishes when the documents say it does: ' + hms(FINISH[r.label]) + ' after the gun',
     Math.abs(secs(r) - FINISH[r.label]) <= TOL,
     'it now finishes after ' + hms(secs(r)) + ', ' + Math.round(secs(r) - FINISH[r.label]) + ' s from the published time. ' +
     'If the router was changed on purpose, say why in the CHANGELOG and pin the new time; if not, something moved it.');
}

// ---- the nine lines the router is timed at -------------------------------
//  PILOT's lines: a meridian crossed westward going out and eastward
//  coming home, off each headland; the Eddystone row is the closest she
//  came to the light; the finish is the finish.  They are geometry, and
//  the router's own times at them are pinned below.
var LIGHT = [50.1807, -4.2657];
var LINES = [
  { name: 'Hurst narrows (out)', lon: -1.550, way: 'w' },
  { name: "St Alban's Head (out)", lon: -2.057, way: 'w' },
  { name: 'Portland Bill (out)', lon: -2.457, way: 'w' },
  { name: 'Start Point (out)', lon: -3.640, way: 'w' },
  { name: 'Eddystone (rounding)' },
  { name: 'Start Point (back)', lon: -3.640, way: 'e' },
  { name: 'Portland Bill (back)', lon: -2.457, way: 'e' },
  { name: "St Alban's Head (back)", lon: -2.057, way: 'e' },
  { name: 'North Head (finish)' }
];
function hoursAt(r) {
  var turn = nearest(r.rows, LIGHT[0], LIGHT[1]).ms, out = {};
  LINES.forEach(function (ln) {
    if (ln.name === 'Eddystone (rounding)') { out[ln.name] = (turn - r.gun) / 3600000; return; }
    if (ln.name === 'North Head (finish)') { out[ln.name] = (r.end - r.gun) / 3600000; return; }
    var i, w;
    for (i = 0; i < r.rows.length; i++) {
      w = r.rows[i];
      if (ln.way === 'w' && w.ms >= turn) break;
      if (ln.way === 'e' && w.ms + w.minutes * 60000 <= turn) continue;
      var hit = ln.way === 'w' ? (w.lon > ln.lon && w.lon2 <= ln.lon) : (w.lon < ln.lon && w.lon2 >= ln.lon);
      if (hit) { out[ln.name] = (w.ms + (ln.lon - w.lon) / (w.lon2 - w.lon) * w.minutes * 60000 - r.gun) / 3600000; return; }
    }
    out[ln.name] = null;
  });
  return out;
}
//  the published times at the lines, hours from the gun, for the pins
var AT_LINES = {
  'Hurst narrows (out)': 1.2676,
  "St Alban's Head (out)": 4.0181,
  'Portland Bill (out)': 5.9126,
  'Start Point (out)': 12.4226,
  'Eddystone (rounding)': 15.1574,
  'Start Point (back)': 16.9360,
  'Portland Bill (back)': 20.6961,
  "St Alban's Head (back)": 21.8904,
  'North Head (finish)': 23.5042
};
//  THE REAL BOATS' FINISHES, FROM RORC'S PUBLISHED RESULTS (TBNM).
//  Each entry: the boat as RORC lists her (type is enough), her elapsed
//  time as "h:mm:ss", and `source` the page it was read from.  EMPTY
//  UNTIL LARRY CONFIRMS THE FIGURES: then the part below holds them.
//  Example of the form, not a figure:  { boat: '68-foot ocean racer A', elapsed: 'h:mm:ss' }
var RORC_RESULTS = {
  source: '',
  boats: []
};
function hrs(hms) {
  var m = /^(\d+):(\d\d):(\d\d)$/.exec(hms || '');
  return m ? +m[1] + m[2] / 60 + m[3] / 3600 : null;
}

// =====================================================================
say('  the 2025 race data: ' + DATA);

var base = null;
function asSailed() { return base || (base = sailed('as-sailed', AS_SAILED)); }

if (asked('rules')) {
  var r0 = asSailed();
  if (sound(r0)) {
    var cw = r0.water['coast-emodnet-lat'];
    ok('the coastline was really looked at: she comes within a mile of it, and no nearer than the run allows',
       cw && cw.min < 1 && cw.min >= cw.clear * SLACK - EPS, cw ? cw.min.toFixed(4) + ' nm' : 'no such layer in the run');
    ok('she goes once round the Eddystone, leaving it to port, and no nearer than its berth',
       r0.berths.length === 1 && Math.abs(r0.berths[0].swing + 360) < 15 && r0.berths[0].nearest >= r0.berths[0].berth * SLACK - EPS &&
       r0.berths[0].nearest < r0.berths[0].berth + 0.1,
       r0.berths.length ? r0.berths[0].swing.toFixed(0) + ' degrees, nearest ' + r0.berths[0].nearest.toFixed(4) + ' nm' : 'no mark rounded');
    if (SHOW) say('  rule  coast nearest ' + cw.min.toFixed(4) + ', Eddystone nearest ' + r0.berths[0].nearest.toFixed(4) + ', swing ' + r0.berths[0].swing.toFixed(1));
  }
}

if (asked('pins')) {
  var r1 = asSailed();
  if (sound(r1)) {
    pinned(r1);
    var h1 = hoursAt(r1);
    LINES.forEach(function (ln) {
      if (SHOW) say('  line  ' + JSON.stringify(ln.name) + ': ' + (h1[ln.name] === null ? 'null' : h1[ln.name].toFixed(4)) + ',');
      ok('at ' + ln.name + ' she is when the documents say: ' + (AT_LINES[ln.name] || 0).toFixed(2) + ' hours from the gun',
         h1[ln.name] !== null && Math.abs(h1[ln.name] - AT_LINES[ln.name]) * 3600 <= TOL,
         h1[ln.name] === null ? 'the track never crosses it' : 'now ' + h1[ln.name].toFixed(4) + ' hours');
    });
  }
}

if (asked('boats')) {
  if (!RORC_RESULTS.boats.length) {
    //  not a pass and not a fail: a part that has nothing to hold says so
    say('  --    boats: NOT HELD YET. RORC\'s published finishing times are awaited (TBNM);');
    say('        no time worked out from the tracker is used. Fill RORC_RESULTS to hold it.');
  } else {
    var r2 = asSailed();
    ok('RORC\'s results name their source', !!RORC_RESULTS.source, 'RORC_RESULTS.source is empty');
    ok('every RORC time reads as h:mm:ss', RORC_RESULTS.boats.every(function (b) { return hrs(b.elapsed) !== null; }));
    if (sound(r2)) {
      var mine = secs(r2) / 3600, behind = [];
      RORC_RESULTS.boats.forEach(function (b) {
        var h = hrs(b.elapsed);
        if (h !== null && (h - mine) * 3600 <= TOL) behind.push(b.boat + ' ' + b.elapsed);
      });
      ok('the router finishes ahead of every real boat in RORC\'s results, by more than ' + TOL + ' s',
         behind.length === 0, 'not ahead of: ' + behind.join('; '));
    }
  }
}

if (asked('crews')) {
  var free = asSailed(), crews = ['crack', 'able', 'ordinary', 'green'].map(function (lv) { return sailed(lv + ' crew', withCrew(lv)); });
  var chain = [free].concat(crews);
  chain.forEach(function (r) { if (sound(r)) pinned(r); });
  for (var ci = 1; ci < chain.length; ci++) {
    notFaster('the ' + chain[ci].label + ' is no quicker than ' + (ci === 1 ? 'tacks that cost nothing' : 'the ' + chain[ci - 1].label),
              chain[ci], chain[ci - 1]);
  }
  crews.forEach(function (r) {
    if (!r.ok) return;
    ok('the ' + r.label + ' pays for every tack and gybe she makes, at her crew\'s cost',
       Math.abs(r.sum.tackSeconds - r.sum.tacks * r.sum.crew.tack) < 1 && Math.abs(r.sum.gybeSeconds - r.sum.gybes * r.sum.crew.gybe) < 1,
       r.sum.tacks + ' tacks, ' + r.sum.tackSeconds.toFixed(1) + ' s; ' + r.sum.gybes + ' gybes, ' + r.sum.gybeSeconds.toFixed(1) + ' s');
  });
}

if (asked('limits')) {
  var f2 = asSailed(), hl = sailed('headlands', HEADLANDS);
  var b10 = sailed('berth 0.10', withPlan('berth-010')), b15 = sailed('berth 0.15', withPlan('berth-015'));
  var li = sailed('lines', withPlan('lines')), ci2 = sailed('circles', withPlan('circles'));
  [f2, hl, b10, b15, li, ci2].forEach(function (r) { if (sound(r) && FINISH.hasOwnProperty(r.label)) pinned(r); });
  notFaster('keeping a mile off three headlands does not make her faster', hl, f2);
  if (b10.ok && f2.ok) {
    ok('a plan that gives the Eddystone the berth `round` gave sails the same route, row for row',
       JSON.stringify(b10.rows) === JSON.stringify(f2.rows), b10.rows.length + ' rows against ' + f2.rows.length);
  }
  notFaster('a wider berth at the Eddystone does not make her faster', b15, b10);
  notFaster('four passing marks do not make her faster', li, b15);
  notFaster('nor do the same four as circles', ci2, b15);
  notFaster('a line is no easier than the circle it lies inside', li, ci2);
}

if (asked('steps')) {
  var ten = asSailed(), five = sailed('five-minute step', variant('b3_step_300.txt', [[/^step[ \t].*$/m, 'step   time 300 heading 5']]));
  if (sound(five)) pinned(five);
  //  A FINER STEP MUST NOT MAKE HER SLOWER: the check that found the
  //  boat lost in a light air
  notFaster('a five-minute step does not make her slower than a ten-minute one', ten, five);
  //  AND HOW FAR THE TIME ITSELF CAN BE TRUSTED: the documents say about
  //  ten minutes in a day.  If halving the step ever buys more than a
  //  quarter of an hour, that sentence has stopped being true.
  if (ten.ok && five.ok) {
    ok('halving the step buys less than a quarter of an hour: the time is good to about ten minutes in a day',
       secs(ten) - secs(five) < 900, 'ten minutes: ' + hms(secs(ten)) + '; five: ' + hms(secs(five)) +
       '; the difference is ' + Math.round(secs(ten) - secs(five)) + ' s');
  }
}

if (asked('motor')) {
  var rm = asSailed();
  if (sound(rm)) {
    var l3 = { run: AS_SAILED, summary: rm.sum, rows: rm.rows };
    //  PILOT's nine timing lines, as the lesson's motor files give them
    //  On the Copernicus stream one clearing waypoint does it: Level 3's
    //  tack at 11:00 takes Level 1 clear of the shore into the Hurst
    //  narrows.  The leg from Start Point no longer crosses Prawle Point.
    var CLEARS = { before: 'clear    L3 tack 11:00        50.73404 -1.51447' };
    var motorFile = function (speed, scale, clears) {
      var L = ['MOTOR 1', 'follow   ' + AS_SAILED, 'speed    ' + speed, 'scale    current ' + scale, 'step     time 600'];
      if (clears) L.push(CLEARS.before);
      L = L.concat(['waypoint Hurst narrows        meridian -1.550', 'waypoint St Alban\'s Head      meridian -2.057',
                    'waypoint Portland Bill        meridian -2.457', 'waypoint Start Point          meridian -3.640']);
      L = L.concat(['waypoint Eddystone Lt House   mark', 'waypoint Start Point          meridian -3.640',
                    'waypoint Portland Bill        meridian -2.457', 'waypoint St Alban\'s Head      meridian -2.057', 'end']);
      var m = COURSE.motor(L.join('\n') + '\n');
      if (!m.ok) return { ok: false, why: 'the motor file: ' + m.err };
      var r = MOTOR.plan(rm.env, l3, m); r.motor = m;
      return r;
    };
    var on1 = function (r) { return r.ok && r.legs.every(function (l) { return l.sailed && l.sailed.arrived && Math.abs(l.sailed.ms - l.t1) < 1000; }); };

    var bare = motorFile('same', 0, false);
    ok('Level 1 with no clearing waypoints is refused', !bare.ok && !!bare.refused, bare.why);
    if (bare.refused) {
      var legsOf = bare.refused.map(function (b) { return b.leg.n; }).join(' ');
      ok('the one refused rhumb line is leg 1, into the Hurst narrows', legsOf === '1', legsOf);
      var offer = bare.refused.map(function (b) {
        return b.clears + ' ' + b.suggest.map(function (p) { return p.kind + ' ' + new Date(p.ms).toISOString().slice(11, 16) + ' ' + p.lat.toFixed(5) + ' ' + p.lon.toFixed(5); }).join(', ');
      }).join(' | ');
      ok('it is cleared by Level 3\'s own tack at 11:00',
         offer === 'true tack 11:00 50.73404 -1.51447', offer);
      if (SHOW) say('  motor  refused: ' + offer);
    }
    var eddy = (bare.points || []).filter(function (p) { return p.kind === 'mark'; })[0];
    ok('the arc round the Eddystone is Level 3\'s closest point, two track points before and one after, grown to clear the light\'s berth',
       eddy && eddy.arc.before === 2 && eddy.arc.after === 1 && eddy.arc.grew.join() === 'the berth round Eddystone Lt House',
       eddy ? eddy.arc.before + ' before, ' + eddy.arc.after + ' after, grew for ' + eddy.arc.grew.join() : 'no mark waypoint');

    var lv1 = motorFile('same', 0, true);
    ok('Level 1 with it sails 13 legs', lv1.ok && lv1.legs.length === 13, lv1.why);
    ok('and arrives at every one of Level 3\'s times, to a second', on1(lv1));
    var lv1nm = lv1.ok ? lv1.legs.reduce(function (a, l) { return a + l.nm; }, 0) : 0;
    if (SHOW && lv1.ok) say('  motor  Level 1: ' + lv1nm.toFixed(1) + ' nm of rhumb lines');

    var same = motorFile('same', '1.0', true);
    ok('Level 2 at the same speed sails', same.ok, same.why);
    if (same.ok) {
      var fin = same.legs[same.legs.length - 1].sailed.ms, want2 = Date.parse('2025-05-25T08:39:07Z');
      ok('PINNED: at Level 1\'s speeds the stream brings her in at 08:39:07, 51 minutes before Level 3',
         Math.abs(fin - want2) <= 120000, new Date(fin).toISOString());
      ok('PINNED: in 2025 she never meets a stream across her line as strong as she is',
         same.legs.every(function (l) { return !l.sailed.held.length; }));
      if (SHOW) say('  motor  Level 2, same speed: finishes ' + new Date(fin).toISOString());
    }
    var ontime = motorFile('on-time', '1.0', true);
    ok('Level 2 on time keeps every one of Level 3\'s times, to a second', on1(ontime), ontime.why);
    if (ontime.ok) {
      var vs = ontime.legs.map(function (l) { return l.v; });
      var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
      ok('PINNED: the speeds it needs run from 7.4 to 13.8 knots', Math.abs(lo - 7.4) < 0.1 && Math.abs(hi - 13.8) < 0.1,
         lo.toFixed(2) + ' to ' + hi.toFixed(2));
      if (SHOW) say('  motor  Level 2, on time: ' + vs.map(function (v) { return v.toFixed(1); }).join(' '));
    }
  }
}

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');
