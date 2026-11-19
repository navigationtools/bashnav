/*  The shared storm cases (Larry's ruling TAYT, 19 November 2026): bashnav
    weather against the fixture the crew agreed, before the CelestialGlass
    launch.  "We all have to be in agreement on what those storm cases are
    and have the exact same documentation" (Larry).

    The fixture is spec/contracts/storm-cases/storm-cases.txt.  A copy lives
    here, tests/storm-cases.txt, so bashnav's suite runs without spec beside
    it; when spec is beside it (../spec), the two must be byte-identical.

    For every case, in the terminal (`weather` cmd=storm, mawk or $AWK) and
    in the browser's model (CHART.stormReport, rendered as the terminal
    renders it), bashnav must say:

      the centre now      the fixture's bearing and distance
      the side            dangerous, navigable, or on its track
      ahead or behind     the fixture's
      the shift           veer on the right, back on the left; none on the track
      the shared lines    the fixture's lines, word for word as the design
                          system's "Shared words" have them (TAWG): 1, 2, 4 on
                          the dangerous side; 1, 4, 5 on the navigable; 4 on
                          the track
      the band            where the wind puts the centre, and the verdict:
                          agrees, or near enough by so many degrees (Larry's
                          ruling TAYY: line 4's words, 110 ahead and 120 to
                          135 behind, a point or two less on the near side)

    bashnav's answer is checked in full for every case.  Cases marked
    pending ("on the track", decided two ways) are listed as well: what
    waits on Larry is the other tool's answer, not bashnav's.

      node weather-storm-cases.js   (no browser needed)  */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..', '..', '..');
const W = path.resolve(__dirname, '..');
global.LOG = require(path.join(W, 'deck-log', 'log.js'));
global.WX = require(path.join(W, 'weather', 'wx.js'));
const CHART = require(path.join(W, 'weather', 'chart.js'));

let checks = 0, bad = 0;
function ok(what, cond, note) {
  checks++;
  if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); }
}

/*  THE SIX LINES, as the design system's "Shared words" have them (Larry's
    ruling TAWG, 18 November 2026).  Copied here, and held to the fixture's
    README, which carries them too.  */
const LINES = {
  1: 'Look the way the storm is going: on its right the wind veers, on its left it backs.',
  2: 'North of the equator its right is the dangerous side; south of it, its left.',
  4: 'Face the wind: north of the equator the centre is about 110 degrees to your right ahead of the storm, and 120 to 135 behind it; south of the equator, to your left. Nearer the centre, a point or two less.',
  5: 'The navigable side is not safe, only less dangerous.'
};

/* ---- the fixture, and its copy ----------------------------------------- */
const here = path.join(REPO, 'tests', 'storm-cases.txt');
const spec = path.resolve(REPO, '..', 'spec', 'contracts', 'storm-cases', 'storm-cases.txt');
const txt = fs.readFileSync(here, 'utf8');
if (fs.existsSync(spec)) ok("bashnav's copy of the storm cases is spec's, byte for byte", fs.readFileSync(spec, 'utf8') === txt);
else console.log('  --    spec is not beside bashnav: the copy is not compared');
const readme = path.resolve(path.dirname(spec), 'README.md');
if (fs.existsSync(readme)) {
  const r = fs.readFileSync(readme, 'utf8').replace(/\s+/g, ' ');
  ok("the six lines here are the fixture README's, word for word", Object.keys(LINES).every(k => r.includes(LINES[k])));
}
const CASES = txt.split('\n').filter(l => l && l[0] !== '#').map(l => {
  const f = {};
  l.split('|').forEach(kv => { const i = kv.indexOf('='); if (i > 0) f[kv.slice(0, i)] = kv.slice(i + 1); });
  return f;
});
ok('the fixture holds 21 cases', CASES.length === 21, String(CASES.length));

/* ---- every case, in both builds ---------------------------------------- */
const ENG = ['log.awk', 'colour.awk'].map(f => REPO + '/src/common/' + f)
  .concat(['grid.awk', 'wx.awk', 'score.awk', 'chart.awk', 'teach.awk', 'screens.awk'].map(f => REPO + '/src/weather/' + f));
const AWK = process.env.AWK || 'mawk';
const KEYS = ['age', 'clat', 'clon', 'mdir', 'mkn', 'r34', 'blat', 'blon', 'bcse', 'bkn', 'wind'];
function awk(c) {
  const a = ['-v', 'cmode=plain', '-v', 'cmd=storm', '-v', 'LOG=/dev/null'];
  KEYS.forEach(k => a.push('-v', k + '=' + (c[k] === undefined ? '' : c[k])));
  ENG.forEach(f => a.push('-f', f));
  return execFileSync(AWK, a, { input: '', encoding: 'utf8' });
}
const flat = s => s.replace(/\s+/g, ' ').toLowerCase();
let pend = [];
CASES.forEach(c => {
  const t = awk(c), j = CHART.stormTerminal(CHART.stormReport(c));
  const id = c.case + ' (' + c.group + ')';
  ok(id + ': the browser says what the terminal says', t === j);
  const m = t.match(/The centre now: (\d{3}), (\d+) nm/);
  ok(id + ': the centre now, ' + c.centre + ', ' + c.dist + ' nm', m && m[1] === c.centre && m[2] === c.dist, m ? m[1] + ' ' + m[2] : 'none');
  const side = /on its track/.test(t) ? 'track' : (/the dangerous side/.test(t) ? 'dangerous' : (/the navigable side/.test(t) ? 'navigable' : '?'));
  ok(id + ': ' + c.side, side === c.side, side);
  const pos = /you are ahead of it: 110/.test(flat(t)) ? 'ahead' : (/you are behind it: 120/.test(flat(t)) ? 'behind' : '?');
  ok(id + ': ' + c.pos + ' of it', pos === c.pos, pos);
  const sh = /expect yours to veer/.test(t) ? 'veer' : (/expect yours to back/.test(t) ? 'back' : 'none');
  ok(id + ': the shift, ' + c.shift, sh === c.shift, sh);
  /*  the lines, as said: the why lines joined, the "(Bowditch)" and what
      follows each line taken as its own  */
  const said = flat(t);
  c.lines.split(',').forEach(n => {
    const want = flat(LINES[n]).replace(/\.$/, '');
    ok(id + ': shared line ' + n + ', word for word', said.includes(want), LINES[n]);
  });
  /*  the band the wind puts the centre in, and the verdict (Larry's
      ruling TAYY: line 4's words everywhere, 110 ahead and 120 to 135
      behind, a point or two less on the near side)  */
  const b = t.match(/puts the centre between (\d{3}) and (\d{3})/);
  ok(id + ': the wind puts the centre ' + c.band, b && b[1] + '-' + b[2] === c.band, b ? b[1] + '-' + b[2] : 'none');
  const v = /The report agrees with your wind/.test(t) ? 'agrees' :
            (t.match(/is (\d+) degrees outside that: near enough/) ? 'near,' + RegExp.$1 :
            (t.match(/disagree, by (\d+) degrees/) ? 'disagrees,' + RegExp.$1 : '?'));
  ok(id + ': the report and the wind: ' + c.verdict.replace(',', ' '), v === c.verdict, v);
  /*  pending: what the other tool decides differently; bashnav's own
      answer is checked above, in full  */
  if (c.pending !== '-') pend.push('  ' + c.case + '  pending (' + c.pending + '): bashnav says ' + c.side + ', ' + c.pos +
                                   ', from the advisory\'s track, ' + c.off + ' nm off it');
});
if (pend.length) { console.log('  the cases pending a ruling, bashnav\'s answer checked:'); pend.forEach(p => console.log(p)); }
console.log(checks + ' checks on the shared storm cases (' + AWK + ')' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
process.exit(bad ? 1 : 0);
