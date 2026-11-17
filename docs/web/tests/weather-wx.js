const path = require('path');
/*  Hold the JS reasoning to the awk's own output, character for
    character.  The report is prose -- every rule shows its working, and
    the working IS the product -- so a port that gets the numbers right
    and the words approximately right has not ported it. */
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '..', '..', '..');
const W = path.resolve(__dirname, '..');
global.LOG = require(path.join(W, 'deck-log', 'log.js'));
const WX = require(path.join(W, 'weather', 'wx.js'));

function awkWhat(logfile, lon, hours) {
  return execFileSync('mawk', ['-v', 'cmode=plain', '-v', 'LOG=' + logfile,
    '-v', 'lon=' + lon, '-v', 'cmd=what', '-v', 'hours=' + (hours === undefined ? '' : hours),
    '-f', REPO + '/src/common/log.awk', '-f', REPO + '/src/common/colour.awk',
    '-f', REPO + '/src/weather/grid.awk', '-f', REPO + '/src/weather/wx.awk', '-f', REPO + '/src/weather/score.awk',
    '-f', REPO + '/src/weather/chart.awk', '-f', REPO + '/src/weather/teach.awk',
    '-f', REPO + '/src/weather/screens.awk'], { input: '', encoding: 'utf8' });
}

function jsWhat(text, lon, hours) {
  const rd = LOG.read(text, '');
  const obs = WX.load(rd.recs);
  const items = WX.report(obs, lon, hours);
  return WX.renderTerminal(items, obs.length >= 2);
}

// ---- a generated corpus of observation histories --------------------
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function genLog(seed) {
  const r = rnd(seed), lines = [];
  const n = 1 + Math.floor(r() * 10);
  let p = 990 + r() * 35, wd = Math.floor(r() * 360), air = -5 + r() * 35;
  const south = r() < 0.35;
  const latn = (10 + r() * 55).toFixed(3);
  const lat = south ? '-' + latn : latn;
  const lon = (-179 + r() * 358).toFixed(2);
  for (let i = 0; i < n; i++) {
    const h = (i * 3) % 24, d = 10 + Math.floor(i * 3 / 24);
    const ts = '2026-07-' + String(d).padStart(2, '0') + 'T' + String(h).padStart(2, '0') + ':00Z';
    p += -6 + r() * 12;
    wd = (wd + Math.floor(-40 + r() * 80) + 360) % 360;
    air += -2 + r() * 4;
    const dew = air - r() * 12;
    const sea = air + (-3 + r() * 6);
    const nav = [['lat', lat], ['lon', lon], ['crs', String(Math.floor(r() * 360))],
                 ['sog', (r() * 10).toFixed(1)]];
    if (r() > 0.1) nav.push(['wdir', String(wd)]);
    if (r() > 0.1) nav.push(['wspd', String(Math.floor(r() * 45))]);
    lines.push(LOG.make(ts, 'nav', nav));
    if (r() > 0.12) {
      const wxf = [];
      //  the four states appear as they do in life: a value, a zero, a
      //  not-taken and a not-observable
      if (r() > 0.15) wxf.push(['mslp', p.toFixed(1)]);
      else if (r() > 0.5) wxf.push(['mslp', '-']);
      if (r() > 0.3) wxf.push(['ptend', String(Math.floor(r() * 9))]);
      if (r() > 0.2) wxf.push(['airt', air.toFixed(1)]);
      if (r() > 0.2) wxf.push(['dewp', dew.toFixed(1)]);
      if (r() > 0.25) wxf.push(['seat', sea.toFixed(1)]);
      if (r() > 0.2) wxf.push(['cloud', String(Math.floor(r() * 9))]);
      const code = () => { const x = r(); return x < 0.1 ? '/' : x < 0.2 ? '-' : String(Math.floor(r() * 10)); };
      if (r() > 0.2) wxf.push(['cl', code()]);
      if (r() > 0.2) wxf.push(['cm', code()]);
      if (r() > 0.2) wxf.push(['ch', code()]);
      if (r() > 0.25) wxf.push(['vis', code()]);
      if (r() > 0.6) { wxf.push(['swper', String(Math.floor(5 + r() * 15))]);
                       wxf.push(['swdir', String(Math.floor(r() * 360))]); }
      if (wxf.length) lines.push(LOG.make(ts, 'wx', wxf));
    }
    //  a record of another type in the same slot, which must not break
    //  the nav/wx merge
    if (r() > 0.8) lines.push(LOG.make(ts, 'eng', [['hrs', (1000 + i).toFixed(1)]]));
  }
  return { text: lines.join('\n') + '\n', lon: lon };
}

/*  A SECOND CORPUS, FOR THE GLASS AND THE CARRIED LATITUDE (weather 1.0.5).
    The first corpus logs a deck entry, with its position, at every single
    observation - which is exactly why it never saw that a weather
    observation taken on its own had no latitude and was read as the
    equator.  These histories are shaped the way a log is kept: up to four
    days of readings at uneven intervals, most of them weather
    observations on their own, a position only now and then (sometimes
    never, sometimes not until late), the longitude sometimes not set, and
    the window asked for as 24, 48, 72 or left out.  */
function genGlass(seed) {
  const r = rnd(seed * 7919 + 13), lines = [];
  const n = 2 + Math.floor(r() * 34);
  let p = 985 + r() * 40, t = Math.floor(r() * 24) * 60;       // minutes from 1 July
  const south = r() < 0.3;
  const latd = Math.floor(r() * 66), latm = (r() * 59.9).toFixed(1).padStart(4, '0');
  const lat = String(latd).padStart(2, '0') + ' ' + latm + (south ? 'S' : 'N');
  const posMode = r();                     // < .15 never a position; < .35 only late; else now and then
  const lon = r() < 0.15 ? '' : (-179 + r() * 358).toFixed(2);
  const hours = [undefined, 24, 48, 72, 36][Math.floor(r() * 5)];
  for (let i = 0; i < n; i++) {
    t += [60, 120, 180, 180, 180, 240, 360, 540][Math.floor(r() * 8)];
    const d = 1 + Math.floor(t / 1440), hh = Math.floor((t % 1440) / 60), mm = t % 60;
    const ts = '2026-07-' + String(d).padStart(2, '0') + 'T' + String(hh).padStart(2, '0') + ':' +
               String(mm).padStart(2, '0') + 'Z';
    p += [-0.3, 0.2, -1.4, 1.6, -2.9, -3.1, -4.4, 3.2, 0][Math.floor(r() * 9)] + (r() - 0.5);
    const pos = posMode < 0.15 ? false : posMode < 0.35 ? i > n * 0.6 && r() < 0.5 : r() < 0.3;
    if (pos) lines.push(LOG.make(ts, 'nav', [['lat', lat], ['wdir', String(Math.floor(r() * 360))],
                                               ['wspd', String(Math.floor(r() * 40))]]));
    else if (r() < 0.2) lines.push(LOG.make(ts, 'nav', [['wdir', String(Math.floor(r() * 360))]]));
    if (r() > 0.1) lines.push(LOG.make(ts, 'wx', [['mslp', p.toFixed(1)]]));
    else if (r() > 0.5) lines.push(LOG.make(ts, 'wx', [['airt', '15.0']]));
  }
  return { text: lines.join('\n') + '\n', lon: lon, hours: hours };
}

const TMP = process.env.TMPDIR || '/tmp';
let bad = 0, n = 0, firstDiff = null;
const N = +(process.argv[2] || 400);
for (let seed = 1; seed <= 2 * N; seed++) {
  const g = seed <= N ? genLog(seed) : genGlass(seed - N);
  const f = path.join(TMP, 'wxdiff.log');
  fs.writeFileSync(f, g.text);
  const want = awkWhat(f, g.lon, g.hours);
  const got = jsWhat(g.text, g.lon, g.hours);
  n++;
  if (got !== want) {
    bad++;
    if (!firstDiff) {
      const a = got.split('\n'), b = want.split('\n');
      let lines = [];
      for (let i = 0; i < Math.max(a.length, b.length); i++)
        if (a[i] !== b[i]) lines.push('    js  |' + a[i] + '|\n    awk |' + b[i] + '|');
      firstDiff = 'seed ' + seed + ' (lon ' + g.lon + ', hours ' + g.hours + ')\n' + lines.slice(0, 6).join('\n');
      fs.writeFileSync(path.join(TMP, 'wxdiff-fail.log'), g.text);
    }
  }
}
console.log(n + ' generated observation histories compared, character for character');
console.log('  (' + N + ' with a position at every reading, ' + N + ' kept the way a log is: the glass, the carried latitude)');
if (firstDiff) console.log('  first disagreement:\n' + firstDiff);
console.log(bad ? bad + ' DISAGREEMENTS' : 'the reasoning matches the awk exactly, wording and all');
process.exit(bad ? 1 : 0);
