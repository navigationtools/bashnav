// =====================================================================
//  Sail a run: from the name of a run file to a route and its log.
//
//      node docs/web/route/sail.js <folder> <run file> [--json <file>]
//
//      node docs/web/route/sail.js ../practical-navigator/data/2025 \
//           run_2025_as_sailed_v1.txt
//
//  WHY THIS EXISTS. The router is five files that must be called in the
//  right order: the run is read first because it names everything else;
//  then the course, the areas, the two grids and the polar; then the
//  run is checked against each of them; and only then is anything
//  sailed. Until this file that order lived in scratch scripts, which
//  meant nobody but their author could sail a run. It is written down
//  here once, with its own checks, so that the course's pages and
//  anyone at a command line reach the router the same way.
//
//  IT ADDS NOTHING TO THE ROUTER AND TAKES NOTHING AWAY. The route it
//  returns is the one ROUTER.run returns for the same files, and
//  tests/sail.js holds it to that.
//
//  THIS IS A BETA (Larry, 13 November 2026). The router is handed to
//  the course to be tried before it is finished, and the report says so
//  on its first line together with the two things most likely to
//  mislead: a tack costs it nothing, and gates are refused rather than
//  sailed. See "What it does not do yet" in ROUTER.md.
//
//  EVERY REFUSAL NAMES THE FILE. A run names six or more files, and
//  "rows 18 but 17 found" is no use without knowing which of them it
//  was said about.
//
//  It reads files through a function it is given - read(name) returns
//  the text, or null when there is no such file - so that a page can
//  hand it what it fetched and the checks can hand it a folder that
//  exists only in memory. The command at the bottom gives it a real
//  folder.
// =====================================================================
'use strict';

var SAIL = (function () {
  var G = (typeof GRID !== 'undefined') ? GRID : require('./grid.js');
  var P = (typeof POLAR !== 'undefined') ? POLAR : require('./polar.js');
  var C = (typeof COURSE !== 'undefined') ? COURSE : require('./course.js');
  var X = (typeof ROUTER !== 'undefined') ? ROUTER : require('./router.js');
  var L = (typeof PASSAGE !== 'undefined') ? PASSAGE : require('./passage.js');

  function no(stage, err) { return { ok: false, stage: stage, err: err }; }

  // ---------------------------------------------------------------
  //  load(read, runName) -> everything the router needs, or the first
  //  thing that is wrong and the file it is wrong in.
  // ---------------------------------------------------------------
  function load(read, runName) {
    function text(name) {
      var t;
      try { t = read(name); } catch (e) { t = null; }
      return (t === null || t === undefined) ? null : String(t);
    }
    //  one named file: found, read by its reader, and accepted by it
    function one(what, name, reader) {
      var t = text(name);
      if (t === null) {
        return { bad: no(what, 'the run names a ' + what + ' file, ' + name + ', which is not in the folder') };
      }
      var v = reader(t);
      if (!v.ok) return { bad: no(what, name + ': ' + v.err) };
      return { v: v };
    }

    if (!runName) return no('run', 'no run file was named');
    var t = text(runName);
    if (t === null) return no('run', 'there is no run file ' + runName + ' in the folder');
    var run = C.run(t);
    if (!run.ok) return no('run', runName + ': ' + run.err);
    if (run.version < 2) {
      return no('run', runName + ' is a RUN 1 file, which does not name its wind and current ' +
                       'grids: it needs to be RUN 2 to be sailed from its name alone');
    }

    var got = one('course', run.course, C.course);
    if (got.bad) return got.bad;
    var course = got.v;

    var areas = [], i;
    for (i = 0; i < run.areas.length; i++) {
      got = one('areas', run.areas[i], C.areas);
      if (got.bad) return got.bad;
      areas.push(got.v);
    }

    got = one('wind', run.wind, G.parse);
    if (got.bad) return got.bad;
    var wind = got.v;
    got = one('current', run.current, G.parse);
    if (got.bad) return got.bad;
    var current = got.v;
    got = one('polar', run.polar, P.parse);
    if (got.bad) return got.bad;
    var polar = got.v;

    //  the run against the course and the water it names ...
    var chk = C.check(run, course, areas);
    if (!chk.ok) return no('check', runName + ': ' + chk.err);
    //  ... and against the grids: a current handed in as the wind, or a
    //  wind from 925 hPa, would route without complaint and be wrong
    chk = C.checkGrids(run, { wind: wind, current: current });
    if (!chk.ok) return no('check', runName + ': ' + chk.err);

    return { ok: true, runName: runName, run: run, course: course, areas: areas,
             wind: wind, current: current, polar: polar };
  }

  // ---------------------------------------------------------------
  //  sail(read, runName, opt) -> { ok, run, course, route, log, title }
  //  or { ok:false, stage, err }.  opt goes to the router unchanged.
  // ---------------------------------------------------------------
  function sail(read, runName, opt) {
    var env = load(read, runName);
    if (!env.ok) return env;
    var route = X.run({ course: env.course, run: env.run, areas: env.areas,
                        wind: env.wind, current: env.current, polar: env.polar }, opt);
    if (!route.ok) return no('route', runName + ': ' + route.why);
    var log = L.log(route.rows);
    if (!log.ok) return no('log', runName + ': ' + log.err);
    var title = env.course.name || 'a course with no name';
    if (env.run.start && env.run.start.by === 'class') title += ', ' + env.run.start.name;
    return { ok: true, runName: runName, run: env.run, course: env.course,
             route: route, log: log, title: title };
  }

  // ---------------------------------------------------------------
  //  The report: what was sailed, what to know before trusting it, and
  //  the passage log. No line is wider than 80 columns.
  // ---------------------------------------------------------------
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function span(min) { min = Math.round(min); return Math.floor(min / 60) + 'h' + two(min % 60); }

  var BETA = [
    'BETA. This is the fastest passage this polar could make in this forecast:',
    'a bound and a shape, not a prediction and not advice. A tack costs the',
    'router nothing, so do not believe how often she tacks. Gates are not sailed.'
  ];

  function report(s) {
    if (!s || !s.ok) return s && s.err ? s.err : '';
    var sum = s.route.summary, st = s.route.stats, out = BETA.slice();
    out.push('');
    out.push(s.title);
    out.push('  run       ' + s.runName);
    out.push('  start     ' + sum.start);
    out.push('  finish    ' + sum.finish + '   ' + span(sum.hours * 60) +
             ' (' + sum.hours.toFixed(2) + ' hours)');
    out.push('  sailed    ' + sum.ground.toFixed(1) + ' nm over the ground, ' +
             sum.water.toFixed(1) + ' through the water');
    out.push('  tacks     ' + sum.tacks + ' changes of tack');
    (sum.rounded || []).forEach(function (r) {
      out.push('  rounded   ' + r.mark + ' at ' + r.at);
    });
    //  what the run asked her to keep off, so that a report can be read
    //  without the run file beside it
    (s.run.gates || []).forEach(function (g) {
      if (g.rule === 'avoid') out.push('  kept off  ' + g.name + ', by ' + g.nm + ' nm (the run asks it)');
    });

    //  WHAT A READER SHOULD KNOW BEFORE TRUSTING THE REST. Each line is
    //  printed only when there is something to say; a route with none
    //  of them says so, because silence would read the same as a
    //  report that had not looked.
    var warn = [];
    if (sum.noStreamMinutes > 0) {
      warn.push(span(sum.noStreamMinutes) + ' sailed where the stream grid has no data, as still water');
    }
    if (sum.clampedMinutes > 0) {
      warn.push(span(sum.clampedMinutes) + ' in more wind than the polar goes up to');
    }
    if (st && st.startDropped > 0) {
      warn.push(st.startDropped + ' of ' + st.startPoints +
                ' places along the start line were inside a clearance, and not used');
    }
    out.push('');
    out.push('Before trusting it:');
    if (warn.length) warn.forEach(function (w) { out.push('  ' + w); });
    else out.push('  nothing to report: stream data throughout, and the wind within the polar');
    out.push('');
    out.push(L.text(s.log, { title: s.title }));
    return out.join('\n');
  }

  return { load: load, sail: sail, report: report };
})();

if (typeof module !== 'undefined') module.exports = SAIL;

// ---------------------------------------------------------------------
//  The command.  0: sailed.  1: refused, with the reason.  2: not asked
//  properly.
// ---------------------------------------------------------------------
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  (function () {
    var fs = require('fs'), path = require('path');
    var a = process.argv.slice(2), json = null, rest = [], i;
    for (i = 0; i < a.length; i++) {
      if (a[i] === '--json') { json = a[++i] || ''; } else rest.push(a[i]);
    }
    if (rest.length !== 2 || json === '') {
      console.error('usage: node docs/web/route/sail.js <folder> <run file> [--json <file>]');
      process.exit(2);
    }
    var folder = rest[0];
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      console.error('there is no folder ' + folder);
      process.exit(1);
    }
    function read(name) {
      var p = path.join(folder, name);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    }
    var s = SAIL.sail(read, rest[1]);
    if (!s.ok) { console.error(s.err); process.exit(1); }
    console.log(SAIL.report(s));
    if (json) {
      fs.writeFileSync(json, JSON.stringify({
        run: s.runName, title: s.title, summary: s.route.summary,
        thresholds: s.log.thresholds, lines: s.log.lines, rows: s.route.rows
      }, null, 1) + '\n');
    }
  })();
}
