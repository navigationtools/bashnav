/*  The sea against the wind: the figure on "What the log says" (W09,
    weather 1.0.7).

    Larry's rulings of 17 November 2026: AOU, the curve is a public
    source's and the score's rule follows it; AOZ, a wind in the top share
    of its step marks the next step as close, the share adjustable, 25%
    unless set, in knots, upward only; APC, the sea state is scored; APF,
    the fully developed limit is drawn as a dashed ceiling.  Every claim is
    MEASURED OFF THE DRAWING and held to a working written here, from the
    sources and not from the page's own arithmetic:

      1. the scale's dots are the Met Office's table: each force's mean
         wind against its probable wave height, where the axes put them;
      2. your wind's line is at your wind, and the scale's answer on it is
         the table's height, by straight lines between its points;
      3. the boxed band is the sea state that height falls in (WMO code
         3700), and the margin names it in bold;
      4. CLOSE: rough runs from 21.5 to 30 kt, so its top quarter begins
         at 27.875: 27 kt marks nothing, 28 kt marks very rough with a
         dashed box; at 10% 28 kt marks nothing and 29.5 does; the share
         is set by the two buttons, remembered, stops at 0 and 50, and 0
         says "not marked";
      5. your sea is a bar over exactly the band you logged;
      6. your swell is a diamond at its height, with its period;
      7. the limit is dashed, lies on 0.22 U^2 / g, begins at 15 kt, is
         never under the scale, and ends on the frame;
      8. the figure sits beside its own words, and the words give the same
         height and state; the terminal text has them too;
      9. no wind in the latest observation: no figure and no words;
     10. the frame grows with the wind; nothing leaves the box; the three
         labels never lie on each other, over a sweep of winds and logs;
     11. night and day redraw in the page's colours, and the limit is told
         from the scale by its dashes, not its colour.

      node weather-sea.js   (needs the server on $PORT)  */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
let checks = 0, bad = 0;
function ok(what, cond, note) { checks++; if (!cond) { bad++; console.log('  FAIL ' + what + (note !== undefined ? ': ' + note : '')); } }
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.6 : tol);

/*  the working, written here from the sources  */
const MO = [[2, 0.1], [5, 0.2], [9, 0.6], [13, 1.0], [19, 2.0], [24, 3.0], [30, 4.0], [37, 5.5], [44, 7.0], [52, 9.0], [60, 11.5]];
const PTS = [[0, 0]].concat(MO, [[64, 14]]);
const scale = kt => { if (kt >= 64) return 14; for (let i = 1; i < PTS.length; i++) if (kt <= PTS[i][0]) {
  const a = PTS[i - 1], b = PTS[i]; return a[1] + (b[1] - a[1]) * (kt - a[0]) / (b[0] - a[0]); } };
const TOPS = [0, 0.1, 0.5, 1.25, 2.5, 4, 6, 9, 14];                 // WMO 3700: the top of each state
const NAMES = ['glassy', 'rippled', 'smooth', 'slight', 'moderate', 'rough', 'very rough', 'high', 'very high', 'phenomenal'];
const stateOf = h => { let s = h > 0 ? 1 : 0; for (let i = 1; i <= 8; i++) if (h > TOPS[i] - 1e-9) s = i + 1; return s; };
const full = kt => { const u = kt * 1852 / 3600; return 0.22 * u * u / 9.80665; };

const mk = (w, sea, sw) => ['2026-08-30T06:00Z|nav|lat=41 14.0N|wdir=210|wspd=14|sea=3|~', '2026-08-30T06:00Z|wx|mslp=1012.4|~',
  '2026-08-30T12:00Z|nav|lat=41 20.0N|wdir=170' + (w === null ? '' : '|wspd=' + w) + (sea === null ? '' : '|sea=' + sea) + '|~',
  '2026-08-30T12:00Z|wx|mslp=1008.1' + (sw || '') + '|~'];

async function open(browser, lines, mode, close) {
  const ctx = await browser.newContext({ viewport: { width: 744, height: 1700 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.RECS !== 'undefined', { timeout: 15000 });
  await page.evaluate(([ls, mode, close]) => { lsSet('lon', '-72'); if (close !== null) lsSet('sea-close', close); setMode(mode);
    return STORE.append(ls).then(() => reload()); }, [lines, mode || 'day', close === undefined ? null : close]);
  await page.evaluate(() => go('what'));
  await page.waitForTimeout(150);
  return { page, ctx, errs };
}
const read = page => page.evaluate(() => {
  const box = document.getElementById('what-sea'), out = document.getElementById('what-out');
  const res = { shown: !!box, out: out.innerText, term: document.getElementById('what-term').textContent };
  if (!box) return res;
  const svg = box.querySelector('svg');
  const num = v => (v !== null && v !== '' && isFinite(+v)) ? +v : v;
  const A = e => { const o = { tag: e.tagName }; for (const a of e.attributes) o[a.name.replace('data-', '')] = num(a.value); o.text = e.textContent; return o; };
  const all = n => [...svg.querySelectorAll('[data-part="' + n + '"]')].map(A);
  res.fr = { xm: +svg.dataset.xm, ym: +svg.dataset.ym, x0: +svg.dataset.x0, x1: +svg.dataset.x1, top: +svg.dataset.top, bot: +svg.dataset.bot };
  res.vb = svg.getAttribute('viewBox').split(' ').map(Number);
  ['force', 'wind', 'expected', 'band-on', 'band-close', 'logged', 'swell', 'full', 'curve', 'state-label', 'close-note',
   'wind-label', 'logged-label', 'swell-label', 'gap', 'band'].forEach(n => { res[n] = all(n); });
  res.boxes = [...svg.querySelectorAll('text')].map(t => { const b = t.getBBox(); return { part: t.dataset.part || '', s: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height }; });
  res.val = document.getElementById('sea-close-val').textContent;
  res.dn = document.getElementById('sea-close-down').disabled; res.up = document.getElementById('sea-close-up').disabled;
  res.row = box.querySelector('.closerow').innerText.replace(/\s+/g, ' ');
  /*  what comes straight after the figure in the reasoning  */
  res.nextText = box.nextElementSibling ? box.nextElementSibling.textContent : '';
  res.inOut = box.parentElement === out;
  res.label = svg.getAttribute('aria-label');
  const cs = getComputedStyle(document.documentElement), tk = k => cs.getPropertyValue(k).trim();
  res.tok = { text: tk('--text'), acc: tk('--accent'), att: tk('--att'), ground: tk('--ground') };
  return res;
});
const XY = fr => ({ X: k => fr.x0 + (fr.x1 - fr.x0) * k / fr.xm, Y: m => fr.bot - (fr.bot - fr.top) * Math.min(m, fr.ym) / fr.ym });
const polyPts = p => p.points.trim().split(/\s+/).map(q => q.split(',').map(Number));

(async () => {
  const browser = await chromium.launch();
  let o, r, f;

  /*  A: 28 kt, a moderate sea logged, a 3.6 m swell at 13 s  */
  o = await open(browser, mk(28, 4, '|swper=13|swdir=250|swht=3.6'));
  r = await read(o.page); f = XY(r.fr);
  ok('A: the figure is drawn', r.shown && r.inOut);
  ok('A: no page errors', o.errs.length === 0, o.errs.join('; '));
  /* 1 */
  const want = MO.filter(p => p[0] <= r.fr.xm);
  ok('1: one dot for each force whose mean wind is in the frame', r.force.length === want.length, r.force.length + ' of ' + want.length);
  want.forEach((p, i) => { const d = r.force[i];
    ok('1: force dot ' + p[0] + ' kt is the table\'s ' + p[1] + ' m, where the axes say', d && d.kt === p[0] && d.m === p[1] && near(d.cx, f.X(p[0])) && near(d.cy, f.Y(p[1])), JSON.stringify(d)); });
  const cv = polyPts(r.curve[0]);
  ok('1: the scale\'s line passes through every dot', want.every(p => cv.some(q => near(q[0], f.X(p[0])) && near(q[1], f.Y(p[1])))));
  /* 2 */
  ok('2: your wind\'s line is at 28 kt', r.wind.length === 1 && near(r.wind[0].x1, f.X(28)) && near(r.wind[0].x2, f.X(28)) && r.wind[0].kt === 28);
  ok('2: the scale\'s answer at 28 kt is 3.67 m, on the line', near(r.expected[0].cx, f.X(28)) && near(r.expected[0].cy, f.Y(scale(28))) && near(scale(28), 3.6667, 0.001));
  /* 3 */
  ok('3: the boxed band is rough, 2.5 to 4 m', r['band-on'].length === 1 && r['band-on'][0].state === 5 &&
     near(r['band-on'][0].y, f.Y(4)) && near(r['band-on'][0].y + r['band-on'][0].height, f.Y(2.5)));
  ok('3: the margin names rough in bold', r['state-label'].some(l => l.state === 5 && +l['font-weight'] === 700 && /rough/.test(l.text)));
  ok('3: and no other state in bold', r['state-label'].filter(l => +l['font-weight'] === 700).length === 1);
  /* 4 */
  ok('4: 28 kt is close to very rough: a dashed box on 4 to 6 m', r['band-close'].length === 1 && r['band-close'][0].state === 6 &&
     !!r['band-close'][0]['stroke-dasharray'] && near(r['band-close'][0].y, f.Y(6)) && near(r['band-close'][0].y + r['band-close'][0].height, f.Y(4)));
  ok('4: the boxed band is solid', !r['band-on'][0]['stroke-dasharray']);
  ok('4: the share shown is 25%', r.val === '25%' && /top 25% of a step/.test(r['close-note'][0].text));
  ok('4: the words say close to very rough, at 30 kt', /Close to very rough: the scale turns at 30 kt\./.test(r.out));
  /* 5 */
  ok('5: your sea is a bar over the moderate band, 1.25 to 2.5 m', r.logged.length === 1 && r.logged[0].state === 4 &&
     near(Math.min(r.logged[0].y1, r.logged[0].y2), f.Y(2.5)) && near(Math.max(r.logged[0].y1, r.logged[0].y2), f.Y(1.25)) && near(r.logged[0].x1, f.X(28)));
  ok('5: and is named', r['logged-label'][0].text === 'your sea: 4, moderate');
  /* 6 */
  const dia = r.swell[0].d.match(/-?[\d.]+/g).map(Number);
  ok('6: your swell is a diamond centred at 3.6 m on your wind', near((dia[1] + dia[5]) / 2, f.Y(3.6)) && near(dia[0], f.X(28)) && r.swell[0].m === 3.6);
  ok('6: with its height and period', r['swell-label'][0].text === 'your swell: 3.6 m, 13 s');
  /* 7 */
  const fp = polyPts(r.full[0]), kOf = x => (x - r.fr.x0) / (r.fr.x1 - r.fr.x0) * r.fr.xm, mOf = y => (r.fr.bot - y) / (r.fr.bot - r.fr.top) * r.fr.ym;
  ok('7: the limit is dashed', !!r.full[0]['stroke-dasharray'] && !r.curve[0]['stroke-dasharray']);
  ok('7: it begins at 15 kt', near(kOf(fp[0][0]), 15, 0.05));
  ok('7: every point of it is on 0.22 U^2 / g', fp.every(q => near(mOf(q[1]), Math.min(full(kOf(q[0])), r.fr.ym), 0.03)), JSON.stringify(fp.slice(-2)));
  ok('7: it is never under the scale', fp.every(q => mOf(q[1]) >= scale(kOf(q[0])) - 0.02));
  ok('7: and it ends on the frame', near(fp[fp.length - 1][1], r.fr.top) || near(fp[fp.length - 1][0], r.fr.x1));
  ok('7: the words give the limit at 28 kt: 4.7 m', /Fully developed, this wind could raise about 4\.7 m\./.test(r.out) && near(full(28), 4.655, 0.01));
  /* 8 */
  ok('8: the figure comes straight before its own words', /^The sea: at 28 kt the Beaufort scale expects about 3\.7 m, rough\.$/.test(r.nextText), r.nextText);
  ok('8: the words name the logged sea as under the scale', /You logged a moderate sea, 1\.25 to 2\.5 m: under the scale\./.test(r.out));
  ok('8: the terminal text has the same lines', /\n  The sea: at 28 kt the Beaufort scale expects about 3\.7 m, rough\.\n/.test(r.term) &&
     /\n  Your swell: 3\.6 m at 13 seconds\.\n/.test(r.term));
  ok('8: the figure is described for a reader who cannot see it', /28 knots/.test(r.label) && /rough/.test(r.label) && /3\.6 metres/.test(r.label));
  /* 11, day */
  ok('11: day: the scale in the page\'s text colour, your wind in its accent, the limit in its amber',
     r.curve[0].stroke === r.tok.text && r.wind[0].stroke === r.tok.acc && r.full[0].stroke === r.tok.att);
  const dayTok = r.tok;
  await o.page.evaluate(() => setMode('night')); await o.page.waitForTimeout(150);
  r = await read(o.page);
  ok('11: night redraws in the night colours', r.curve[0].stroke === r.tok.text && r.wind[0].stroke === r.tok.acc && r.tok.text !== dayTok.text);
  ok('11: at night the limit is still told by its dashes', !!r.full[0]['stroke-dasharray'] && !r.curve[0]['stroke-dasharray']);
  await o.page.evaluate(() => setMode('day')); await o.page.waitForTimeout(100);

  /* 4, the buttons: down three times to 10% - 28 kt is no longer close */
  for (let i = 0; i < 3; i++) await o.page.click('#sea-close-down');
  r = await read(o.page);
  ok('4: three presses down is 10%', r.val === '10%' && /top 10% of a step/.test(r['close-note'][0].text));
  ok('4: at 10%, 28 kt marks nothing', r['band-close'].length === 0 && !/the scale turns at/.test(r.out));
  await o.page.reload({ waitUntil: 'load' });
  await o.page.waitForFunction(() => typeof window.RECS !== 'undefined');
  await o.page.evaluate(() => go('what')); await o.page.waitForTimeout(150);
  r = await read(o.page);
  ok('4: the share is remembered', r.val === '10%');
  for (let i = 0; i < 2; i++) await o.page.click('#sea-close-down');
  r = await read(o.page);
  ok('4: it stops at 0, and says not marked', r.val === '0%' && r.dn === true && /not marked/.test(r.row) && /not marked/.test(r['close-note'][0].text));
  for (let i = 0; i < 12; i++) { if (await o.page.$eval('#sea-close-up', b => b.disabled)) break; await o.page.click('#sea-close-up'); }
  r = await read(o.page);
  ok('4: and at 50', r.val === '50%' && r.up === true && r['band-close'].length === 1);
  await o.ctx.close();

  /* 4: 27 kt at 25% marks nothing; 29.5 at 10% marks very rough */
  o = await open(browser, mk(27, 5, ''));
  r = await read(o.page);
  ok('4: 27 kt is not yet close at 25%', r['band-close'].length === 0 && r['band-on'][0].state === 5 && !/the scale turns at/.test(r.out));
  ok('8: a rough sea logged at 27 kt is what the scale expects', /You logged a rough sea: what the scale expects\./.test(r.out));
  await o.ctx.close();
  o = await open(browser, mk(29.5, null, ''), 'day', '10');
  r = await read(o.page);
  ok('4: 29.5 kt is close at 10%', r['band-close'].length === 1 && r['band-close'][0].state === 6);
  ok('5: no sea logged, no bar', r.logged.length === 0 && r['logged-label'].length === 0);
  ok('6: no swell logged, no diamond', r.swell.length === 0);
  await o.ctx.close();

  /* 3: at an edge the wind is in the higher state */
  o = await open(browser, mk(30, 7, ''));
  r = await read(o.page);
  ok('3: 30 kt is very rough', r['band-on'][0].state === 6 && /expects about 4\.0 m, very rough\./.test(r.out));
  ok('8: a high sea logged at 30 kt is above the scale', /You logged a high sea, 6 to 9 m: above the scale\./.test(r.out));
  await o.ctx.close();

  /* 9: no wind in the latest observation */
  o = await open(browser, mk(null, 4, '|swht=2.0'));
  r = await read(o.page);
  ok('9: no wind, no figure', r.shown === false);
  ok('9: and no words about the sea', !/The sea:/.test(r.out) && !/The sea:/.test(r.term));
  await o.ctx.close();

  /* 10: the frame, and a sweep */
  o = await open(browser, mk(5, 1, '|swht=1.2|swper=9|swdir=200'));
  r = await read(o.page);
  ok('10: a light air gets a small frame', r.fr.xm === 20 && r.fr.ym <= 3, JSON.stringify(r.fr));
  ok('3: 5 kt is smooth', r['band-on'][0].state === 2);
  await o.ctx.close();
  o = await open(browser, mk(62, 9, ''));
  r = await read(o.page); f = XY(r.fr);
  ok('10: a storm gets a large one', r.fr.xm === 70 && r.fr.ym >= 15, JSON.stringify(r.fr));
  ok('3: 62 kt is very high, close to phenomenal', r['band-on'][0].state === 8 && r['band-close'][0].state === 9);
  ok('2: the scale at 62 kt is 12.75 m', near(r.expected[0].cy, f.Y(12.75)) && near(scale(62), 12.75, 0.001));
  await o.ctx.close();

  let swept = 0, over = 0, out = 0, wrongBand = 0, wrongDot = 0;
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  o = await open(browser, mk(10, 3, ''));
  let c = 0;
  const stamp = () => new Date(Date.UTC(2026, 8, 1, 0, 0) + (c++) * 3600000).toISOString().slice(0, 16) + 'Z';
  for (let w = 0; w <= 72; w += 3) for (const v of [[null, ''], [0, '|swht=0.4'], [3, '|swht=2.5|swper=11|swdir=10'], [5, '|swht=5.5'], [9, '|swht=9.0|swper=16|swdir=90']]) {
    const ts = stamp(), wv = w + (w % 2 ? 0.5 : 0);
    await o.page.evaluate(ls => STORE.append(ls).then(() => reload()),
      [ts + '|nav|lat=41 20.0N|wdir=170|wspd=' + wv + (v[0] === null ? '' : '|sea=' + v[0]) + '|~', ts + '|wx|mslp=1008.1' + v[1] + '|~']);
    await o.page.evaluate(() => go('what'));
    r = await read(o.page);
    if (!r.shown) { out++; continue; }
    swept++;
    const kt = r.wind[0].kt; f = XY(r.fr);
    const labs = r.boxes.filter(b => /-label$/.test(b.part) && b.part !== 'state-label' && b.part !== 'force-label');
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (hit(labs[i], labs[j])) { over++; console.log('    labels overlap at ' + kt + ' kt: ' + labs[i].s + ' / ' + labs[j].s); }
    r.boxes.forEach(b => { if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > r.vb[2] + 0.5 || b.y + b.h > r.vb[3] + 0.5) { out++; console.log('    outside the box at ' + kt + ' kt: ' + b.s); } });
    const h = scale(kt), st = kt < 1 ? 0 : stateOf(h);
    if (st >= 1 && (!r['band-on'][0] || r['band-on'][0].state !== st)) { wrongBand++; console.log('    band at ' + kt + ' kt: ' + (r['band-on'][0] && r['band-on'][0].state) + ' want ' + st); }
    if (!near(r.expected[0].cy, f.Y(h)) || !near(r.expected[0].cx, f.X(kt))) wrongDot++;
  }
  ok('10: a sweep of winds and logs was drawn', swept >= 100, swept);
  ok('10: the three labels never lie on each other (' + swept + ' drawings)', over === 0, over);
  ok('10: nothing leaves the box', out === 0, out);
  ok('3: the boxed band is the table\'s state at every wind of the sweep', wrongBand === 0, wrongBand);
  ok('2: the scale\'s answer is on the line at every wind of the sweep', wrongDot === 0, wrongDot);
  await o.ctx.close();

  await browser.close();
  console.log(checks + ' checks on the sea against the wind, measured off the drawing' + (bad ? ', ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})();
