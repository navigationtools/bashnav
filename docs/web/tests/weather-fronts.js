/*  Fronts, looked down on (weather 1.0.10, lesson `fronts`; Larry, ATR, W20).

    1. THE MODEL, THE BROWSER'S AGAINST THE AWK'S, character for character:
       `weather` cmd=frontsdump prints the pressure, the wind's bearing and
       the three-hour glass with its word at 693 points; WX.frP, frFrom,
       frGlass and frBand must print the same.  The terminal's figure and
       the browser's are both drawn from it, so they cannot say different
       things about the wind or the glass.

    2. THE FIGURE, read back off the drawing:
         the low      drawn, with its isobars, and its own wind round it:
                      every one of its arrows has the low on its left,
                      facing downwind (Buys Ballot, northern hemisphere),
                      and points the way the model says.
         the boats    hulls (Larry, ATR): five of boat A south of the low,
                      three of boat B north of it.
         the winds    each boat's arrow, measured, names the point the
                      strip names; boat A veers in two jumps, at the warm
                      front (between 2 and 3) and at the cold front
                      (between 3 and 4), and little between 1 and 2; boat
                      B backs at every step.  The words say VEERS and
                      BACKS, and the rule holds: the boat on the right of
                      the low's track veers, the one on its left backs.
       In night and day: colours from the page, nothing outside the box.

    3. THE CHECKER IS SHOWN TO CATCH THINGS: a word swapped, one wind arrow
       turned round, one strip label changed, one of the low's arrows
       reversed, and the motion arrow turned to the west: each caught.

      node weather-fronts.js   (needs the server on $PORT)  */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
const REPO = path.resolve(__dirname, '..', '..', '..');
const W = path.resolve(__dirname, '..');
global.LOG = require(path.join(W, 'deck-log', 'log.js'));
const WX = require(path.join(W, 'weather', 'wx.js'));

let checks = 0, bad = 0;
function ok(what, cond, note) {
  checks++;
  if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); }
}

/* ---- 1. the model ---------------------------------------------------- */
const ENG = ['log.awk', 'colour.awk'].map(f => REPO + '/src/common/' + f)
  .concat(['grid.awk', 'wx.awk', 'score.awk', 'chart.awk', 'teach.awk', 'screens.awk'].map(f => REPO + '/src/weather/' + f));
const AWK = process.env.AWK || 'mawk';
const args = ['-v', 'cmode=plain', '-v', 'cmd=frontsdump', '-v', 'LOG=/dev/null'];
ENG.forEach(f => args.push('-f', f));
const want = execFileSync(AWK, args, { input: '', encoding: 'utf8' });
let got = '';
for (let y = 450; y >= -550; y -= 50)
  for (let x = -750; x <= 850; x += 50)
    got += x + ' ' + y + ' ' + WX.frP(x, y).toFixed(3) + ' ' + WX.frFrom(x, y).toFixed(2) + ' ' +
           WX.frGlass(x, y).toFixed(3) + ' ' + WX.frBand(x, y) + '\n';
const nPts = want.split('\n').filter(Boolean).length;
ok('the awk dumps the 693 points', nPts === 693, String(nPts));
if (got !== want) {
  const a = got.split('\n'), b = want.split('\n');
  const i = a.findIndex((l, k) => l !== b[k]);
  ok('the browser\'s model is the awk\'s, character for character', false, 'js |' + a[i] + '| awk |' + b[i] + '|');
} else ok('the browser\'s model is the awk\'s, character for character (' + AWK + ')', true);

/* ---- 2. the figure: the checker, run in the page --------------------- */
function checkFronts(svg) {
  const F = [], bad = s => F.push(s);
  const num = (e, a) => +e.getAttribute(a);
  const norm = d => ((d % 360) + 360) % 360;
  const diff = (a, b) => ((a - b + 540) % 360) - 180;
  const brg = (dx, dy) => norm(Math.atan2(dx, -dy) * 180 / Math.PI);
  const PT = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const nm = d => PT[Math.round(norm(d) / 22.5) % 16];
  const q = s => Array.from(svg.querySelectorAll(s));
  const low = svg.querySelector('[data-part="low"]');
  if (!low) { bad('no low drawn'); return F; }
  const LX = num(low, 'cx'), LY = num(low, 'cy');
  if (q('[data-part="isobar"]').length < 6) bad('fewer than six isobars');
  /*  the way it goes, from the motion arrow  */
  const mv = svg.querySelector('[data-part="motion"]');
  const east = num(mv, 'x2') > num(mv, 'x1');
  if (!east) bad('the low is not drawn going east');
  /*  the low's own wind: low on the left, facing downwind  */
  const spins = q('[data-part="spin"]');
  if (spins.length < 40) bad('the low\'s own wind is not drawn round it (' + spins.length + ' arrows)');
  spins.forEach(s => {
    const x1 = num(s, 'x1'), y1 = num(s, 'y1'), x2 = num(s, 'x2'), y2 = num(s, 'y2');
    const go = brg(x2 - x1, y2 - y1), toLow = brg(LX - (x1 + x2) / 2, LY - (y1 + y2) / 2), rel = diff(toLow, go);
    if (!(rel < 0 && rel > -180)) bad('an arrow of the low\'s wind at ' + s.getAttribute('data-x') + ',' + s.getAttribute('data-y') + ' has the low on its right');
  });
  /*  the boats  */
  const boats = { A: q('[data-part="boat"][data-boat="A"]'), B: q('[data-part="boat"][data-boat="B"]') };
  if (boats.A.length !== 5 || boats.B.length !== 3) bad('five hulls of boat A and three of boat B, found ' + boats.A.length + ' and ' + boats.B.length);
  const hullY = b => { const m = b.getAttribute('d').match(/^M([\d.]+),([\d.]+)/); return +m[2] + 11; };
  if (boats.A.some(b => hullY(b) <= LY)) bad('boat A is not south of the low');
  if (boats.B.some(b => hullY(b) >= LY)) bad('boat B is not north of the low');
  /*  their winds, measured  */
  const from = k => q('[data-part="wind"][data-boat="' + k + '"]').sort((a, b) => num(a, 'data-i') - num(b, 'data-i')).map(w =>
    norm(brg(num(w, 'x2') - num(w, 'x1'), num(w, 'y2') - num(w, 'y1')) + 180));
  const fa = from('A'), fb = from('B');
  if (fa.length !== 5 || fb.length !== 3) { bad('a wind arrow at every boat'); return F; }
  fa.forEach((f, i) => {
    const t = svg.querySelector('[data-part="strip-wind"][data-i="' + (i + 1) + '"]');
    if (!t || t.textContent !== 'wind from ' + nm(f)) bad('station ' + (i + 1) + ': the strip says "' + (t && t.textContent) + '", the arrow is from ' + nm(f));
  });
  const ta = [1, 2, 3, 4].map(i => diff(fa[i], fa[i - 1])), tb = [1, 2].map(i => diff(fb[i], fb[i - 1]));
  if (!(Math.abs(ta[0]) < 20)) bad('boat A shifts ' + ta[0].toFixed(0) + ' between 1 and 2, before the warm front');
  if (!(ta[1] > 30)) bad('boat A does not veer at the warm front (' + ta[1].toFixed(0) + ')');
  if (!(ta[2] > 30)) bad('boat A does not veer at the cold front (' + ta[2].toFixed(0) + ')');
  if (!tb.every(t => t < -20)) bad('boat B does not back at every step (' + tb.map(t => t.toFixed(0)).join(', ') + ')');
  const aw = svg.querySelector('[data-part="a-word"]'), bw = svg.querySelector('[data-part="b-word"]');
  if (!aw || !/VEERS/.test(aw.textContent) || /BACKS/.test(aw.textContent)) bad('boat A\'s line does not say VEERS');
  if (!bw || !/BACKS/.test(bw.textContent) || /VEERS/.test(bw.textContent)) bad('boat B\'s line does not say BACKS');
  if (bw && bw.textContent.indexOf(fb.map(nm).join(', ')) < 0) bad('boat B\'s line does not name the winds drawn: ' + fb.map(nm).join(', '));
  /*  the rule: the boat on the right of the track, looking the way the low goes, veers  */
  const aRight = east ? true : false;      /* A is south of the track */
  if (aRight !== (ta[1] + ta[2] > 0)) bad('the rule: on the low\'s right the wind veers');
  return F;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 744, height: 2600 }, timezoneId: 'UTC' });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 20000 });
  await page.click('[data-go="learn"]');
  await page.waitForTimeout(250);
  await page.click('#les-list >> text=/Fronts: what passes over you/i');
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: checkFronts.toString() });
  ok('the fronts lesson carries its figure', await page.evaluate(() => document.querySelectorAll('#les-body .frontdemo').length) === 1);
  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const s = document.querySelector('#les-body .frontdemo svg');
      const cs = getComputedStyle(document.documentElement), tk = k => cs.getPropertyValue(k).trim();
      const warn = tk('--warn') || tk('--bad') || '#e23a2c';
      const b = s.getBBox(), v = s.getAttribute('viewBox').split(' ').map(Number);
      return { faults: checkFronts(s),
               box: b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v[2] + 0.5 && b.y + b.height <= v[3] + 0.5,
               windCol: Array.from(s.querySelectorAll('[data-part="wind"]')).every(e => e.getAttribute('stroke') === tk('--accent')),
               spinCol: Array.from(s.querySelectorAll('[data-part="spin"]')).every(e => e.getAttribute('stroke') === warn),
               rule: !!s.querySelector('[data-part="rule"]') };
    });
    const tag = mode + ': ';
    ok(tag + 'the drawing agrees with itself, with Buys Ballot and with the rule', r.faults.length === 0, r.faults.join(' | '));
    ok(tag + 'the boats\' winds in the page\'s accent', r.windCol);
    ok(tag + 'the low\'s wind in the page\'s warning colour', r.spinCol);
    ok(tag + 'the rule is written under it', r.rule);
    ok(tag + 'nothing outside the box', r.box);
    if (process.env.SHOTS) await (await page.$('#les-body .frontdemo')).screenshot({ path: process.env.SHOTS + '/fronts-' + mode + '.png' });
  }
  /* ---- 3. planted faults ---- */
  const planted = await page.evaluate(() => {
    const src = document.querySelector('#les-body .frontdemo svg'), copy = () => src.cloneNode(true), out = {};
    let c = copy(); c.querySelector('[data-part="a-word"]').textContent = 'Boat A: the wind BACKS';
    out.word = checkFronts(c).length;
    c = copy(); let w = c.querySelector('[data-part="wind"][data-boat="B"][data-i="2"]');
    let a = [w.getAttribute('x1'), w.getAttribute('y1')];
    w.setAttribute('x1', w.getAttribute('x2')); w.setAttribute('y1', w.getAttribute('y2')); w.setAttribute('x2', a[0]); w.setAttribute('y2', a[1]);
    out.arrow = checkFronts(c).length;
    c = copy(); c.querySelector('[data-part="strip-wind"][data-i="3"]').textContent = 'wind from S';
    out.label = checkFronts(c).length;
    c = copy(); w = c.querySelector('[data-part="spin"]');
    a = [w.getAttribute('x1'), w.getAttribute('y1')];
    w.setAttribute('x1', w.getAttribute('x2')); w.setAttribute('y1', w.getAttribute('y2')); w.setAttribute('x2', a[0]); w.setAttribute('y2', a[1]);
    out.spin = checkFronts(c).length;
    c = copy(); w = c.querySelector('[data-part="motion"]');
    a = [w.getAttribute('x1'), w.getAttribute('y1')];
    w.setAttribute('x1', w.getAttribute('x2')); w.setAttribute('x2', a[0]);
    out.motion = checkFronts(c).length;
    return out;
  });
  ok('planted: a word swapped is caught', planted.word > 0);
  ok('planted: one wind arrow turned round is caught', planted.arrow > 0);
  ok('planted: one strip label changed is caught', planted.label > 0);
  ok('planted: one of the low\'s arrows reversed is caught', planted.spin > 0);
  ok('planted: the low drawn going west is caught', planted.motion > 0);
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the fronts figure and its model' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
