/*  The glass: the barograph on "What the log says" (W04, weather 1.0.5).

    Larry's rulings of 17 November 2026: AOI, the readings are one bold
    trace with the daily tide alone drawn behind it as a wave from the
    first reading; AOQ, each stretch of the trace is coloured AND weighted
    by its tendency, with a strip of the same words beneath.  Every claim
    is MEASURED OFF THE DRAWING and held to a working written here, not to
    the page's own arithmetic:

      1. every reading in the window is a point where the axes say it is;
      2. each stretch's tendency is the rule's: the change per 3 hours with
         the tide allowed for - 3 or more down falling fast, 1.5 or more
         down falling, 1.5 or more up rising, else steady - worked here
         from 1.4 cos^3(latitude) and the local sun time;
      3. THE LATITUDE IS CARRIED: a weather observation logged on its own
         has no position, and used to be worked as if on the equator.  At
         50 N a fall of 4.2 hPa from mid-morning to mid-afternoon is a
         definite fall; the old working took 2.8 of it off as tide and
         called it steady.  Held here on the page and in the terminal text;
      4. heavier line for worse news (steady < rising < falling < falling
         fast), each in its own colour from the page;
      5. the wave passes through the first reading, is 1.4 cos^3(lat) each
         way, and crests near 10 and 22 by the sun;
      6. the strip says the same tendencies, neighbours of a kind merged;
      7. each key line is drawn at its own slope on these axes;
      8. the window buttons show 24, 48 or 72 hours, and are remembered;
      9. the terminal's table is in "as the terminal does" and not in the
         page's reasoning, which has the drawing instead;
     10. no longitude, or no latitude anywhere: no wave, and it says which;
     11. night and day redraw in the page's colours; nothing leaves the box.

      node weather-glass.js   (needs the server on $PORT)  */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
let checks = 0, bad = 0;
function ok(what, cond, note) { checks++; if (!cond) { bad++; console.log('  FAIL ' + what + (note !== undefined ? ': ' + note : '')); } }

/*  the working, written here  */
const mins = ts => Date.UTC(+ts.slice(0, 4), +ts.slice(5, 7) - 1, +ts.slice(8, 10), +ts.slice(11, 13), +ts.slice(14, 16)) / 60000;
const amp = lat => 1.4 * Math.pow(Math.cos(lat * Math.PI / 180), 3);
const tide = (ts, lon, lat) => { const sol = (((+ts.slice(11, 13) + +ts.slice(14, 16) / 60 + lon / 15) % 24) + 24) % 24;
  return amp(lat) * Math.cos(2 * Math.PI * (sol - 10) / 12); };
const band = (c, dt) => c <= -3 * dt / 3 ? 'falling fast' : c <= -1.5 * dt / 3 ? 'falling' : c >= 1.5 * dt / 3 ? 'rising' : 'steady';

/*  the logs.  CHANNEL: a depression at 50 N, one position at the start and
    one a day and a half in; every pressure a weather observation on its own. */
const CH_P = [1018.4, 1017.7, 1017.4, 1017.2, 1015.8, 1013.1, 1010.0, 1006.3, 1002.1, 998.5, 997.2, 998.4, 1000.8, 1003.1, 1005.7, 1008.3, 1009.8];
const ts3 = i => '2026-08-' + String(29 + Math.floor(i * 3 / 24)).padStart(2, '0') + 'T' + String((i * 3) % 24).padStart(2, '0') + ':00Z';
const CHANNEL = ['2026-08-29T00:00Z|nav|lat=50 10.0N|wdir=250|wspd=12|~']
  .concat(CH_P.map((p, i) => (i === 12 ? ts3(i) + '|nav|lat=50 20.0N|wdir=300|wspd=25|~\n' : '') + ts3(i) + '|wx|mslp=' + p.toFixed(1) + '|~'))
  .join('\n').split('\n');
/*  CARRY: the fault's own case.  50 N, 3 W: 10:12 to 16:12 UTC is 10 to 16 by
    the sun there, the tide's whole fall.  A position once, the day before. */
const CARRY = ['2026-08-28T12:00Z|nav|lat=50 00.0N|wdir=240|wspd=10|~', '2026-08-29T10:12Z|wx|mslp=1012.0|~', '2026-08-29T16:12Z|wx|mslp=1007.8|~'];
const NOLAT = CH_P.slice(0, 6).map((p, i) => ts3(i) + '|wx|mslp=' + p.toFixed(1) + '|~');

async function open(browser, lines, lon, mode) {
  const ctx = await browser.newContext({ viewport: { width: 744, height: 1500 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.RECS !== 'undefined', { timeout: 15000 });
  await page.evaluate(([ls, lon, mode]) => { lsSet('lon', lon); setMode(mode); return STORE.append(ls).then(() => reload()); }, [lines, lon, mode]);
  await page.evaluate(() => go('what'));
  await page.waitForTimeout(200);
  return { page, ctx, errs };
}
const read = page => page.evaluate(() => {
  const box = document.getElementById('what-glass'), svg = box.querySelector('svg');
  if (box.hidden || !svg) return { shown: false, out: document.getElementById('what-out').innerText,
                                    term: document.getElementById('what-term').textContent };
  const A = (e, ks) => { const o = {}; ks.forEach(k => { const v = e.getAttribute(k); o[k.replace('data-', '')] = (v !== null && v !== '' && isFinite(+v)) ? +v : v; }); return o; };
  const all = n => [...svg.querySelectorAll('[data-part="' + n + '"]')];
  const b = svg.getBBox(), vb = svg.getAttribute('viewBox').split(' ').map(Number);
  const cs = getComputedStyle(document.documentElement), tk = k => cs.getPropertyValue(k).trim();
  const wave = svg.querySelector('[data-part="tide-wave"]');
  return { shown: true,
    frame: A(svg, ['data-ymin', 'data-ymax', 'data-t0', 'data-t1']),
    pts: all('pt').map(e => A(e, ['cx', 'cy', 'data-ts', 'data-p'])),
    segs: all('seg').map(e => A(e, ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'data-band'])),
    runs: all('run').map(e => A(e, ['x', 'width', 'fill', 'data-band', 'data-from', 'data-to'])),
    keys: all('key').map(e => A(e, ['x1', 'y1', 'x2', 'y2', 'data-band', 'data-hours', 'stroke-width'])),
    wave: wave ? { ref: +wave.getAttribute('data-ref'), amp: +wave.getAttribute('data-amp'),
                   pts: wave.getAttribute('points').split(' ').map(p => p.split(',').map(Number)) } : null,
    note: (svg.querySelector('[data-part="tide-note"]') || {}).textContent || '',
    title: svg.querySelector('text').textContent,
    pressed: [...box.querySelectorAll('.win')].filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.getAttribute('data-win')),
    inbox: b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= vb[2] + 0.5 && b.y + b.height <= vb[3] + 0.5,
    tok: { acc: tk('--accent'), ok: tk('--ok'), att: tk('--att'), warn: tk('--warn') || tk('--bad') },
    out: document.getElementById('what-out').innerText, term: document.getElementById('what-term').textContent };
});

(async () => {
  const browser = await chromium.launch();
  const LON = -3;
  for (const mode of ['night', 'day']) {
    const { page, ctx, errs } = await open(browser, CHANNEL, String(LON), mode);
    for (const hours of [48, 24, 72]) {
      await page.click('#what-glass .win[data-win="' + hours + '"]');
      await page.waitForTimeout(120);
      const r = await read(page), tag = mode + ' ' + hours + ' h: ';
      ok(tag + 'the barograph is drawn', r.shown);
      if (!r.shown) continue;
      /* the readings the window should hold, worked here */
      const all = CH_P.map((p, i) => ({ ts: ts3(i), p, m: mins(ts3(i)), lat: i < 12 ? 50 : 50 }));
      const end = all[all.length - 1].m, win = all.filter(o => o.m >= end - hours * 60);
      /* 1 */
      ok(tag + 'every reading in the window is drawn, and no other', r.pts.length === win.length &&
         r.pts.every((p, i) => p.ts === win[i].ts && p.p === win[i].p), r.pts.length + ' of ' + win.length);
      const X = m => 62 + (m - win[0].m) / (win[win.length - 1].m - win[0].m) * 568, Y = p => 214 - (p - r.frame.ymin) / (r.frame.ymax - r.frame.ymin) * 170;
      ok(tag + 'each point is where the axes say', r.pts.every((p, i) => Math.abs(p.cx - X(win[i].m)) < 0.01 && Math.abs(p.cy - Y(win[i].p)) < 0.01));
      ok(tag + 'the frame holds every reading, on round numbers, at least 10 hPa tall',
         win.every(o => o.p >= r.frame.ymin && o.p <= r.frame.ymax) && r.frame.ymax - r.frame.ymin >= 10 && r.frame.ymin % 2 === 0);
      /* 2 */
      const want = win.slice(1).map((o, i) => { const a = win[i], dt = (o.m - a.m) / 60;
        return band((o.p - a.p) - (tide(o.ts, LON, 50) - tide(a.ts, LON, 50)), dt); });
      ok(tag + 'each stretch has the tendency the rule gives', r.segs.length === want.length && r.segs.every((s, i) => s.band === want[i]),
         r.segs.map(s => s.band).join('|') + ' vs ' + want.join('|'));
      /* 4 */
      const wOf = b => (r.segs.find(s => s.band === b) || r.keys.find(k => k.band === b))['stroke-width'];
      ok(tag + 'heavier for worse news', wOf('steady') < wOf('rising') && wOf('rising') < wOf('falling') && wOf('falling') < wOf('falling fast'));
      const col = { 'steady': r.tok.acc, 'rising': r.tok.ok, 'falling': r.tok.att, 'falling fast': r.tok.warn };
      ok(tag + 'each tendency in its own colour from the page', r.segs.every(s => s.stroke === col[s.band]));
      /* 5 */
      ok(tag + 'the wave is drawn', !!r.wave);
      if (r.wave) {
        ok(tag + 'the tide is 1.4 cos^3(lat) each way', Math.abs(r.wave.amp - amp(50)) < 1e-6, r.wave.amp);
        const f = r.pts[0], near = r.wave.pts.reduce((m, q) => Math.min(m, Math.hypot(q[0] - f.cx, q[1] - f.cy)), 1e9);
        ok(tag + 'the wave passes through the first reading', near < 0.6, near);
        /* crests: the highest points of the wave (smallest y), by the sun */
        const ymin = Math.min(...r.wave.pts.map(q => q[1]));
        const crests = r.wave.pts.filter(q => q[1] - ymin < 0.02).map(q => r.frame.t0 + (q[0] - 62) / 568 * (r.frame.t1 - r.frame.t0))
          .map(m => ((((m % 1440) / 60 + LON / 15) % 24) + 24) % 24);
        ok(tag + 'the wave crests near 10 and 22 by the sun', crests.length > 0 && crests.every(h => Math.abs(h - 10) < 0.6 || Math.abs(h - 22) < 0.6),
           crests.map(h => h.toFixed(1)).join(','));
        ok(tag + 'the wave says its size', /0\.4 hPa each way/.test(r.note), r.note);
      }
      /* 6 */
      const merged = []; want.forEach((b, i) => { const L = merged[merged.length - 1];
        if (L && L.band === b) L.to = win[i + 1].ts; else merged.push({ band: b, from: win[i].ts, to: win[i + 1].ts }); });
      ok(tag + 'the strip says the same, neighbours merged', r.runs.length === merged.length &&
         r.runs.every((u, i) => u.band === merged[i].band && u.from === merged[i].from && u.to === merged[i].to),
         r.runs.map(u => u.band).join('|'));
      ok(tag + 'each strip block lies under its own stretch', r.runs.every(u => {
        const a = r.pts.find(p => p.ts === u.from), z = r.pts.find(p => p.ts === u.to);
        return Math.abs(u.x - (a.cx + 1)) < 0.01 && Math.abs(u.x + u.width - (z.cx - 1)) < 0.01; }));
      /* 7 */
      const perPx = 170 / (r.frame.ymax - r.frame.ymin), thr = { 'steady': 0, 'falling': -1.5, 'falling fast': -3, 'rising': 1.5 };
      ok(tag + 'each key line is at its own slope', r.keys.length === 4 && r.keys.every(k =>
        Math.abs((-(k.y2 - k.y1) / perPx) / k.hours * 3 - thr[k.band]) < 0.01 &&
        Math.abs(k.hours - (k.x2 - k.x1) / (568 / ((r.frame.t1 - r.frame.t0) / 60))) < 0.01));
      /* the days are named by their own dates: 29 August 2026 was a Saturday */
      const days = await page.evaluate(() => [...document.querySelectorAll('#what-glass [data-part="day"]')].map(e => e.textContent));
      ok(tag + 'the midnights carry the right day and date', days.length > 0 && days.every(d => ['Sat 29', 'Sun 30', 'Mon 31'].indexOf(d) >= 0), days.join(','));
      /* 8 */
      ok(tag + 'the button pressed is the window shown', r.pressed.length === 1 && +r.pressed[0] === hours && r.title.indexOf('last ' + hours + ' hours') > 0);
      /* 9 */
      ok(tag + 'the table is in the terminal text', r.term.indexOf('The glass, last ' + hours + ' hours:') > 0 && /falling fast +-3\.[0-9] hPa in 3 h/.test(r.term));
      ok(tag + 'and not in the page\'s reasoning', r.out.indexOf('The glass, last') < 0 && /Rising\./.test(r.out));
      /* 11 */
      ok(tag + 'nothing outside the box', r.inbox);
      if (process.env.SHOTS && mode === 'day' && hours === 48)
        await (await page.$('#what-glass')).screenshot({ path: process.env.SHOTS + '/glass-channel.png' });
    }
    /* 8: remembered across a reload */
    await page.click('#what-glass .win[data-win="24"]');
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.RECS !== 'undefined' && OBS.length > 0, { timeout: 15000 });
    await page.evaluate(() => go('what')); await page.waitForTimeout(150);
    ok(mode + ': the window is remembered', (await read(page)).pressed[0] === '24');
    /* 11: a change of mode redraws in the new colours */
    const before = (await read(page)).segs[0].stroke;
    await page.evaluate(m => setMode(m), mode === 'night' ? 'day' : 'night'); await page.waitForTimeout(150);
    const after = await read(page);
    ok(mode + ': a change of mode redraws in the page\'s colours', after.segs[0].stroke !== before && after.segs.every(s =>
       s.stroke === { 'steady': after.tok.acc, 'rising': after.tok.ok, 'falling': after.tok.att, 'falling fast': after.tok.warn }[s.band]));
    ok(mode + ': no script errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* 3: the carried latitude */
  {
    const { page, ctx } = await open(browser, CARRY, '-3', 'day');
    const r = await read(page);
    const t50 = tide('2026-08-29T16:12Z', -3, 50) - tide('2026-08-29T10:12Z', -3, 50);
    const t0 = tide('2026-08-29T16:12Z', -3, 0) - tide('2026-08-29T10:12Z', -3, 0);
    ok('carry: the case is the one meant (the old working would say steady)', band(-4.2 - t50, 6) === 'falling' && band(-4.2 - t0, 6) === 'steady');
    ok('carry: a reading without a position takes the last one logged: falling', r.shown && r.segs.length === 1 && r.segs[0].band === 'falling', r.shown && r.segs[0].band);
    ok('carry: the wave is the tide at 50 N, not the equator', r.wave && Math.abs(r.wave.amp - amp(50)) < 1e-6);
    ok('carry: the words say a definite fall, tide allowed for', /A definite fall/.test(r.out) && /Allowing for the daily atmospheric tide: -3\.[45] hPa/.test(r.out), r.out.slice(0, 160));
    await ctx.close();
  }
  /* 10: no longitude; no latitude anywhere */
  {
    const a = await open(browser, CHANNEL, '', 'day');
    const r = await read(a.page);
    ok('no longitude: the trace is drawn without a wave', r.shown && !r.wave && r.pts.length === 17);
    ok('no longitude: it says so', /no longitude is set/.test(r.note) && /no longitude set/.test(r.term), r.note);
    const raw = CH_P.slice(1).map((p, i) => band(p - CH_P[i], 3));
    ok('no longitude: the tendencies are the plain change', r.segs.every((s, i) => s.band === raw[i]));
    await a.ctx.close();
    const b = await open(browser, NOLAT, '-3', 'day');
    const q = await read(b.page);
    ok('no latitude anywhere: the trace is drawn without a wave', q.shown && !q.wave && q.pts.length === 6);
    ok('no latitude anywhere: it says so, on the figure and in the words', /no latitude in the log/.test(q.note) &&
       /not allowed for: no latitude in the log/.test(q.out) && /no latitude in the log yet/.test(q.term), q.note);
    await b.ctx.close();
    /* one reading: nothing to draw */
    const c = await open(browser, NOLAT.slice(0, 1), '-3', 'day');
    ok('one reading: no barograph', (await read(c.page)).shown === false);
    await c.ctx.close();
  }
  await browser.close();
  console.log(checks + ' checks on the barograph, measured off the drawing' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
