//  Sailing a run from its name: the order the files are read in, the
//  refusals, and the report.
//
//  The folder here exists only in memory - a table of file names and
//  their text - so every refusal can be provoked by taking one file out
//  or spoiling one line, and nothing is left on disk. The course is the
//  router test's own: twenty miles due east on the equator in a steady
//  northerly, which is a beam reach at ten knots and takes two hours.
//
//  WHAT IS HELD TO HERE is that the runner adds nothing to the router
//  and takes nothing away: the route it returns is ROUTER.run's own for
//  the same files, row for row.
//
//    node docs/web/tests/sail.js
'use strict';
var GRID = require('../route/grid.js');
var POLAR = require('../route/polar.js');
var COURSE = require('../route/course.js');
var ROUTER = require('../route/router.js');
var PASSAGE = require('../route/passage.js');
var SAIL = require('../route/sail.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function d(nm) { return (nm / 60).toFixed(6); }       //  miles to degrees, on the equator

function field(kind, u, v) {
  var L = ['GRID 1', 'kind ' + kind, 'units kt', 'u east', 'v north',
           'lat -1.0 1.0 1.0', 'lon -1.0 1.0 1.0', 'times 2025-05-24T00:00Z 2025-05-24T12:00Z',
           'fields u v', 'order time lat lon', 'rows 18'];
  for (var i = 0; i < 18; i++) L.push(u + ' ' + v);
  return L.join('\n') + '\n';
}
function runText(extra) {
  return ['RUN 2', 'course c.txt', 'polar p.txt', 'wind w.grid', 'current s.grid',
          'start class All', 'step time 600 heading 5', 'scale wind 1.0 current 1.0',
          'round 0.10'].concat(extra || []).concat(['end']).join('\n') + '\n';
}
//  A whole folder, fresh each time so one check cannot spoil the next.
function folder(change) {
  var f = {
    'run.txt': runText(),
    'c.txt': ['COURSE 1', 'name A test course', 'source Invented for this test. Not a real course.',
              'start line ' + d(-0.1) + ' 0 to ' + d(0.1) + ' 0 cross east',
              'start class All 2025-05-24T00:00Z',
              'mark Far Buoy ' + d(0.1) + ' ' + d(20) + ' port',
              'finish line ' + d(-0.1) + ' ' + d(20) + ' to ' + d(0.1) + ' ' + d(20) + ' cross east',
              'end'].join('\n') + '\n',
    'w.grid': field('wind', 0, -10),
    's.grid': field('current', 0, 0),
    'p.txt': ['twa/tws\t5\t10\t20', '50\t4\t6\t8', '90\t6\t10\t14', '150\t2\t4\t10',
              '#  beat_angle\t40\t38\t36', '#  beat_vmg\t3\t4.5\t6'].join('\n') + '\n'
  };
  if (change) change(f);
  return function (name) { return Object.prototype.hasOwnProperty.call(f, name) ? f[name] : null; };
}
function refusal(change, run) { return SAIL.sail(folder(change), run || 'run.txt'); }

//  ---- 1. it sails, and it is the router's own route ----------------
var s = SAIL.sail(folder(), 'run.txt');
ok('a run is sailed from its name', s.ok, s.err);
if (!s.ok) { console.log('  cannot go on'); process.exit(1); }
ok('twenty miles on a beam reach at ten knots takes two hours',
   s.route.summary.hours > 1.99 && s.route.summary.hours < 2.02, s.route.summary.hours.toFixed(4));
(function () {
  var rd = folder();
  var direct = ROUTER.run({ course: COURSE.course(rd('c.txt')), run: COURSE.run(rd('run.txt')), areas: [],
                            wind: GRID.parse(rd('w.grid')), current: GRID.parse(rd('s.grid')),
                            polar: POLAR.parse(rd('p.txt')) });
  ok('the route is the one the router gives for the same files, row for row',
     direct.ok && JSON.stringify(direct.rows) === JSON.stringify(s.route.rows) &&
     JSON.stringify(direct.summary) === JSON.stringify(s.route.summary));
  ok('and the log is the passage log of those rows',
     JSON.stringify(PASSAGE.log(direct.rows)) === JSON.stringify(s.log));
})();
ok('the title is the course and the class', s.title === 'A test course, All', s.title);

//  THE WATER FILES ARE READ TOO. A wall across the direct line, ending
//  half a mile north of it, in an areas file the run names: she must go
//  round, which takes longer than the two hours, and no step crosses.
(function () {
  var w = SAIL.sail(folder(function (f) {
    f['a.txt'] = ['AREAS 1', 'source Invented for this test.', 'layer wall', 'line',
                  '  ' + d(-3) + ' ' + d(10), '  ' + d(0.5) + ' ' + d(10), 'end line', 'end'].join('\n') + '\n';
    f['run.txt'] = runText(['areas a.txt', 'layers wall', 'clear wall 0.25']);
  }), 'run.txt');
  ok('a run that names an areas file is sailed with that water in it', w.ok, w.err);
  if (!w.ok) return;
  var crossed = w.route.rows.some(function (r) {
    return ROUTER.cross(r.lon * 60, r.lat * 60, r.lon2 * 60, r.lat2 * 60, 10, -3, 10, 0.5) >= 0;
  });
  ok('the wall is not crossed, and going round it costs time',
     !crossed && w.route.summary.hours > s.route.summary.hours && w.route.summary.hours < 2.2,
     crossed + ' ' + w.route.summary.hours.toFixed(4));
})();
ok('it says which run it sailed', s.runName === 'run.txt');

//  ---- 2. the refusals, each naming the file ------------------------
var r = SAIL.sail(folder(), 'other.txt');
ok('a run file that is not there is named', !r.ok && r.stage === 'run' &&
   r.err === 'there is no run file other.txt in the folder', r.err);
ok('no run named at all', !SAIL.sail(folder(), '').ok && !SAIL.sail(folder()).ok);

[['course', 'c.txt'], ['wind', 'w.grid'], ['current', 's.grid'], ['polar', 'p.txt']].forEach(function (p) {
  r = refusal(function (f) { delete f[p[1]]; });
  ok('a missing ' + p[0] + ' file is named, and what it was wanted as',
     !r.ok && r.stage === p[0] &&
     r.err === 'the run names a ' + p[0] + ' file, ' + p[1] + ', which is not in the folder', r.err);
});
r = refusal(function (f) { f['run.txt'] = runText(['areas a.txt']); });
ok('and a missing areas file', !r.ok && r.stage === 'areas' && /a\.txt, which is not in the folder/.test(r.err), r.err);

//  A file that is there and wrong: the reader's own words, with the
//  file's name in front, because a run names six files and the reader
//  does not know which one it was handed.
r = refusal(function (f) { f['w.grid'] = f['w.grid'].replace('rows 18', 'rows 17'); });
ok('a grid that will not read is refused in the grid reader\'s words, with its name',
   !r.ok && r.stage === 'wind' && /^w\.grid: /.test(r.err) &&
   r.err === 'w.grid: ' + GRID.parse(field('wind', 0, -10).replace('rows 18', 'rows 17')).err, r.err);
r = refusal(function (f) { f['c.txt'] = f['c.txt'].replace('COURSE 1', 'COURSE 9'); });
ok('a course that will not read', !r.ok && r.stage === 'course' && /^c\.txt: /.test(r.err), r.err);
r = refusal(function (f) { f['p.txt'] = 'not a polar\n'; });
ok('a polar that will not read', !r.ok && r.stage === 'polar' && /^p\.txt: /.test(r.err), r.err);
r = refusal(function (f) { f['run.txt'] = f['run.txt'].replace('round 0.10\n', ''); });
ok('a run that will not read', !r.ok && r.stage === 'run' && /^run\.txt: .*how far off she rounds/.test(r.err), r.err);
r = refusal(function (f) { f['run.txt'] = f['run.txt'].replace('RUN 2', 'RUN 1').replace(/wind w\.grid\n|current s\.grid\n/g, ''); });
ok('a RUN 1 file names no grids, and is refused for that',
   !r.ok && r.stage === 'run' && /RUN 1 file/.test(r.err), r.err);

//  A file that reads and is the wrong file. Each of these would route.
r = refusal(function (f) { f['w.grid'] = f['s.grid']; });
ok('a current handed in as the wind is refused before anything is sailed',
   !r.ok && r.stage === 'check' && /w\.grid was given as the wind grid, but it says kind current/.test(r.err), r.err);
r = refusal(function (f) { f['run.txt'] = f['run.txt'].replace('start class All', 'start class Nobody'); });
ok('a class the course does not list', !r.ok && r.stage === 'check' && /Nobody/.test(r.err), r.err);

//  What the router will not sail yet comes out as its own reason.
r = refusal(function (f) { f['run.txt'] = runText(['gate Headland ' + d(1) + ' ' + d(10) + ' within 2']); });
ok('a gate is refused with the router\'s reason, not sailed round or ignored',
   !r.ok && r.stage === 'route' && /^run\.txt: /.test(r.err) && /gate/.test(r.err), r.err);

//  A read that throws is a file that is not there, not a crash.
r = SAIL.sail(function () { throw new Error('disk on fire'); }, 'run.txt');
ok('a reader that throws is a missing file', !r.ok && r.stage === 'run', r.err);

//  ---- 3. the report ------------------------------------------------
var t = SAIL.report(s), lines = t.split('\n');
ok('the report opens by saying it is a beta', /^BETA\. /.test(lines[0]), lines[0]);
ok('and names the two things most likely to mislead',
   /A tack costs the\nrouter nothing/.test(t) && /Gates are not sailed/.test(t), lines.slice(0, 3).join(' / '));
ok('it names the course, the run, the start and the finish',
   /\nA test course, All\n/.test(t) && /\n  run       run\.txt\n/.test(t) &&
   t.indexOf('\n  start     ' + s.route.summary.start + '\n') > 0 &&
   t.indexOf('\n  finish    ' + s.route.summary.finish + '   ') > 0, t);
//  1.999 hours is 119.9 minutes, which is two hours to the minute.
ok('the time is given both ways', /   2h00 \(2\.00 hours\)\n/.test(t), t);
ok('a route with nothing to warn of says so, in so many words',
   /Before trusting it:\n  nothing to report/.test(t), t);
ok('the passage log is in it whole',
   t.indexOf(PASSAGE.text(s.log, { title: s.title })) > 0);
//  A point on the direct line that the run says to keep a mile off.
(function () {
  var av = SAIL.sail(folder(function (f) {
    f['run.txt'] = runText(['avoid The Rock 0 ' + d(10) + ' off 1.0']);
  }), 'run.txt');
  ok('what the run asked her to keep off is in the report',
     av.ok && /\n  kept off  The Rock, by 1 nm \(the run asks it\)\n/.test(SAIL.report(av)),
     av.ok ? SAIL.report(av).split('\n').slice(4, 12).join(' / ') : av.err);
  ok('and a run that asks for none says nothing of it', !/kept off/.test(t));
})();
var wide = lines.filter(function (x) { return x.length > 80; });
ok('no line of the report is wider than 80 columns', wide.length === 0, wide[0]);
ok('a refusal reports its reason and nothing else', SAIL.report(r) === r.err && SAIL.report(null) === '');

//  A stream grid in which every node is dry ("-"): she sails the whole
//  two hours on no information, and the report must say so.
(function () {
  var dry = SAIL.sail(folder(function (f) {
    f['s.grid'] = f['s.grid'].replace(/0 0\n/g, '- -\n');
  }), 'run.txt');
  if (!dry.ok) { ok('a run over water with no stream data still sails', false, dry.err); return; }
  var tt = SAIL.report(dry);
  ok('a run over water with no stream data still sails', dry.route.summary.noStreamMinutes > 0);
  ok('and the report says for how long, before the log',
     /Before trusting it:\n  2h00 sailed where the stream grid has no data, as still water\n/.test(tt), tt);
})();

//  ---- 4. the same twice, and hands off -----------------------------
ok('the same folder twice gives the same report', SAIL.report(SAIL.sail(folder(), 'run.txt')) === t);

//  ---- 5. the command -----------------------------------------------
(function () {
  var cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
  var cmd = path.join(__dirname, '..', 'route', 'sail.js');
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sail-'));
  var rd = folder();
  ['run.txt', 'c.txt', 'w.grid', 's.grid', 'p.txt'].forEach(function (n) {
    fs.writeFileSync(path.join(dir, n), rd(n));
  });
  function go(args) { return cp.spawnSync(process.execPath, [cmd].concat(args), { encoding: 'utf8' }); }

  var x = go([dir, 'run.txt']);
  ok('the command sails the folder and prints the report', x.status === 0 && x.stdout === t + '\n',
     'status ' + x.status + ' ' + x.stderr);
  x = go([]);
  ok('asked for nothing, it says how to ask and exits 2', x.status === 2 && /^usage: /.test(x.stderr) && x.stdout === '');
  x = go([dir]);
  ok('asked for half, the same', x.status === 2);
  x = go([dir, 'none.txt']);
  ok('a refusal goes to the error stream and exits 1',
     x.status === 1 && x.stdout === '' && x.stderr === 'there is no run file none.txt in the folder\n', x.stderr);
  x = go([path.join(dir, 'no-such-folder'), 'run.txt']);
  ok('a folder that is not there is said, not thrown', x.status === 1 && /^there is no folder /.test(x.stderr), x.stderr);

  var out = path.join(dir, 'out.json');
  x = go([dir, 'run.txt', '--json', out]);
  var j = x.status === 0 && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
  ok('--json saves the rows, the lines and the summary',
     j && j.rows.length === s.route.rows.length && j.lines.length === s.log.lines.length &&
     j.summary.finish === s.route.summary.finish && j.thresholds.shift === 5 && j.run === 'run.txt',
     x.stderr);
  x = go([dir, 'run.txt', '--json']);
  ok('--json with no file is not asked properly', x.status === 2);

  ['run.txt', 'c.txt', 'w.grid', 's.grid', 'p.txt', 'out.json'].forEach(function (n) {
    try { fs.unlinkSync(path.join(dir, n)); } catch (e) {}
  });
  try { fs.rmdirSync(dir); } catch (e) {}
})();

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');
