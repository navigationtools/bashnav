/*  The wind from the isobars (W07, weather 1.0.3): the page against the
    awk, character for character, as weather-ch.js holds the 500 mb rules.
    Every refusal (no spacing, no latitude, nothing or less, a latitude
    off the earth, within 5 degrees of the equator) and a grid of real
    readings in both hemispheres, with the interval given, left out (4)
    and odd.  Then the wind itself is held to the balance written here,
    not to either program.  */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..', '..', '..');
const W = path.resolve(__dirname, '..');
global.LOG = require(path.join(W, 'deck-log', 'log.js'));
global.WX = require(path.join(W, 'weather', 'wx.js'));
const CHART = require(path.join(W, 'weather', 'chart.js'));
const ENG = ['log.awk', 'colour.awk'].map(f => REPO + '/src/common/' + f)
  .concat(['grid.awk', 'wx.awk', 'score.awk', 'chart.awk', 'teach.awk', 'screens.awk'].map(f => REPO + '/src/weather/' + f));
function awk(sp, lat, step, north) {
  const a = ['-v', 'cmode=plain', '-v', 'cmd=isobars', '-v', 'spacing=' + sp, '-v', 'lat=' + lat,
             '-v', 'north=' + north, '-v', 'LOG=/dev/null'];
  if (step !== null) a.push('-v', 'step=' + step);
  ENG.forEach(f => a.push('-f', f));
  return execFileSync('mawk', a, { input: '', encoding: 'utf8' });
}
let bad = 0, n = 0, first = null;
const sps = ['', 0, -10, 12, 50, 64.5, 100, 137, 250, 600];
const lats = ['', -3, 0, 3, 4.9, 5, 12, 30, 45.5, 50, 61, 80, 90, 95];
const steps = [null, 4, 2, 8, 0];
for (const north of [1, 0]) for (const sp of sps) for (const lat of lats)
  for (const step of [steps[(String(sp).length + String(lat).length) % steps.length]]) {
    n++;
    const want = awk(sp, lat, step, north);
    const items = CHART.isoReport(sp, lat, step === null ? '' : step, !!north);
    const worked = items.wind !== undefined;
    const got = CHART.isoTerminal(items, worked);
    if (got !== want) {
      bad++;
      if (!first) {
        const a = got.split('\n'), b = want.split('\n'), L = [];
        for (let i = 0; i < Math.max(a.length, b.length); i++)
          if (a[i] !== b[i]) L.push('    js  |' + a[i] + '|\n    awk |' + b[i] + '|');
        first = `spacing=${sp} lat=${lat} step=${step} north=${north}\n` + L.slice(0, 6).join('\n');
      }
    }
  }
//  the balance, written here: V = dp / (rho f d)
const OM = 7.292115e-5;
let pb = 0;
[[100, 50, 4, 30.68], [200, 50, 4, 15.34], [100, 30, 4, 47.00], [60, 60, 4, 45.23]].forEach(c => {
  const f = 2 * OM * Math.sin(c[1] * Math.PI / 180);
  const want = c[2] * 100 / (1.225 * f * c[0] * 1852) / 0.514444;
  const got = CHART.isoWind(c[0], c[1], c[2]);
  if (Math.abs(got - want) > 0.01 || Math.abs(got - c[3]) > 0.05) { pb++; console.log('  FAIL the balance at ' + c + ': ' + got); }
});
//  halving the spacing doubles the wind; the equator side blows harder
if (Math.abs(CHART.isoWind(50, 50, 4) / CHART.isoWind(100, 50, 4) - 2) > 1e-9) { pb++; console.log('  FAIL halving the spacing does not double the wind'); }
if (!(CHART.isoWind(100, 30, 4) > CHART.isoWind(100, 60, 4))) { pb++; console.log('  FAIL the same spacing should blow harder nearer the equator'); }
console.log(n + ' isobar cases compared with the awk, character for character');
if (first) console.log('  first disagreement:\n' + first);
console.log(bad || pb ? (bad + ' DISAGREEMENTS, ' + pb + ' balance failures') :
            'the wind from the isobars matches the awk, and the balance holds');
process.exit(bad || pb ? 1 : 0);
