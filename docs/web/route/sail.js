// =====================================================================
//  Sail a run: from the name of a run file to a route and its log.
//
//      node docs/web/route/sail.js <folder> <run file> [--json <file>]
//
//      node docs/web/route/sail.js ../practical-navigator/data/2025 \
//           run_2025_as_sailed_v1.txt
//
//  WHY THIS EXISTS. The router is several files that must be called in the
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
//  mislead. With no crew: a tack costs it nothing, so the number of
//  tacks means nothing. With a crew: every tack costs the crew's
//  average, so no one tack is the bad one. See "What it does not do
//  yet" in ROUTER.md.
//
//  THE ORDER, now that a run may name a crew and a passage: the run;
//  the course, the areas, the two grids, the polar, the crew file and
//  the passage file; the run checked against the course, the grids, the
//  crew file, and its passage against the course; then the router.
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
                       'grids: it needs to be RUN 2 or later to be sailed from its name alone');
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

    //  the crew, when the run names one: how well she is tacked
    var crew = null;
    if (run.crew) {
      got = one('crew', run.crew.file, C.crew);
      if (got.bad) return got.bad;
      crew = got.v;
    }
    //  the passage, when the run names one: the plan she sails, and the
    //  berth of each mark in it
    var passage = null;
    if (run.passage) {
      got = one('passage', run.passage.file, C.passage);
      if (got.bad) return got.bad;
      passage = got.v;
    }

    //  the run against the course and the water it names ...
    var chk = C.check(run, course, areas);
    if (!chk.ok) return no('check', runName + ': ' + chk.err);
    //  ... and against the grids: a current handed in as the wind, or a
    //  wind from 925 hPa, would route without complaint and be wrong
    chk = C.checkGrids(run, { wind: wind, current: current });
    if (!chk.ok) return no('check', runName + ': ' + chk.err);
    //  ... and against its crew file: the level it asks for is in it
    chk = C.checkCrew(run, crew);
    if (!chk.ok) return no('check', runName + ': ' + chk.err);
    //  ... and its passage against the course: every mark in every plan,
    //  in order, each with a berth but the one that ends the finish line
    chk = C.checkPassage(run, passage, course);
    if (!chk.ok) return no('check', runName + ': ' + chk.err);

    return { ok: true, runName: runName, run: run, course: course, areas: areas,
             wind: wind, current: current, polar: polar, crew: crew, passage: passage };
  }

  // ---------------------------------------------------------------
  //  sail(read, runName, opt) -> { ok, run, course, route, log, title }
  //  or { ok:false, stage, err }.  opt goes to the router unchanged.
  // ---------------------------------------------------------------
  function sail(read, runName, opt) {
    var env = load(read, runName);
    if (!env.ok) return env;
    var route = X.run({ course: env.course, run: env.run, areas: env.areas,
                        wind: env.wind, current: env.current, polar: env.polar,
                        crew: env.crew, passage: env.passage }, opt);
    if (!route.ok) return no('route', runName + ': ' + route.why);
    var log = L.log(route.rows);
    if (!log.ok) return no('log', runName + ': ' + log.err);
    var title = env.course.name || 'a course with no name';
    if (env.run.start && env.run.start.by === 'class') title += ', ' + env.run.start.name;
    return { ok: true, runName: runName, run: env.run, course: env.course, crew: env.crew,
             route: route, log: log, title: title };
  }

  // ---------------------------------------------------------------
  //  The report: what was sailed, what to know before trusting it, and
  //  the passage log. No line is wider than 80 columns.
  // ---------------------------------------------------------------
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function span(min) { min = Math.round(min); return Math.floor(min / 60) + 'h' + two(min % 60); }

  function secs(s) {
    s = Math.round(s);
    if (s < 90) return s + ' s';
    if (s < 3600) return Math.floor(s / 60) + ' min ' + two(s % 60) + ' s';
    return Math.floor(s / 3600) + ' h ' + two(Math.floor(s % 3600 / 60)) + ' min';
  }

  //  THE FIRST LINES SAY WHAT KIND OF ANSWER THIS IS, and the two
  //  things most likely to mislead. Which two depends on the run: with
  //  no crew a tack is free and the tack count means nothing; with a
  //  crew every tack costs the same average, so the report must not be
  //  read as saying which tack was the bad one.
  var BETA_FREE = [
    'BETA. This is the fastest passage this polar could make in this forecast:',
    'a bound and a shape, not a prediction and not advice. A tack costs the',
    'router nothing, so do not believe how often she tacks.'
  ];
  var BETA_CREW = [
    'BETA. This is the fastest passage this polar and this crew could make in',
    'this forecast: a bound and a shape, not a prediction and not advice. Every',
    'tack costs the crew\'s average; no one tack is the bad one.'
  ];

  //  one manoeuvre's lines: how many, what each costs, what that came to,
  //  and how this crew's manoeuvres come off
  function crewLines(word, doing, n, each, total, level, grades) {
    var out = [], sh = [];
    out.push('  ' + word + (n === 1 ? ' ' : 's') + '     ' + n + ', at ' + secs(each) + ' each on average: ' +
             secs(total) + ' given to ' + doing);
    grades.forEach(function (g, i) { sh.push(level.share[i] + '% ' + g); });
    out.push('            of this crew\'s ' + word + 's: ' + sh.join(', '));
    return out;
  }

  function report(s) {
    if (!s || !s.ok) return s && s.err ? s.err : '';
    var sum = s.route.summary, st = s.route.stats, out = (sum.crew ? BETA_CREW : BETA_FREE).slice();
    out.push('');
    out.push(s.title);
    out.push('  run       ' + s.runName);
    //  THE BOAT AND THE BERTHS, so that the speeds below are read as this
    //  polar's (PILOT, 13 November 2026: "9.2 kt through the water" is
    //  read as a fact about boats unless the polar is named) and the
    //  route can be sailed again from what is printed
    out.push('  boat      ' + s.run.polar + ' (every speed below is this polar\'s)');
    if (sum.passage) out.push('  passage   plan ' + sum.passage.plan + ', from ' + sum.passage.file);
    else out.push('  berth     ' + sum.round.toFixed(2) + ' nm round every mark (the run\'s "round")');
    out.push('  start     ' + sum.start);
    out.push('  finish    ' + sum.finish + '   ' + span(sum.hours * 60) +
             ' (' + sum.hours.toFixed(2) + ' hours)');
    out.push('  sailed    ' + sum.ground.toFixed(1) + ' nm over the ground, ' +
             sum.water.toFixed(1) + ' through the water');
    if (sum.crew && s.crew) {
      var lv = s.crew.level(sum.crew.level);
      out.push('  crew      ' + sum.crew.level + ', from ' + sum.crew.file);
      crewLines('tack', 'tacking', sum.tacks, sum.crew.tack, sum.tackSeconds, lv.tack, s.crew.grades)
        .forEach(function (x) { out.push(x); });
      crewLines('gybe', 'gybing', sum.gybes, sum.crew.gybe, sum.gybeSeconds, lv.gybe, s.crew.grades)
        .forEach(function (x) { out.push(x); });
    } else {
      out.push('  tacks     ' + sum.tacks + ', and ' + sum.gybes + (sum.gybes === 1 ? ' gybe' : ' gybes') +
               ', each costing nothing: the run names no crew');
    }
    //  the marks she rounded and the places she passed, in the order
    //  she made them, each with the figure it was sailed to
    var made = (sum.rounded || []).map(function (r) {
      return { at: r.at, say: '  rounded   ' + r.mark + ', berth ' + r.berth.toFixed(2) + ' nm, at ' + r.at };
    }).concat((sum.passed || []).map(function (p) {
      return { at: p.at, say: '  passed    ' + p.name + ', ' + (p.dir ? p.dir + ' ' : '') + 'within ' + p.nm + ' nm, at ' + p.at };
    }));
    made.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
    made.forEach(function (m) { out.push(m.say); });
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
