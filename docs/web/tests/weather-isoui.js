/*  The wind from the isobars, on the page (W07, weather 1.0.3; Larry,
    AKY and ALF).  weather-iso.js holds the words to the awk; this holds
    the screen and its two drawings to the balance:

      1. the screen is on the home menu, and its words and its terminal
         rendering are CHART.isoReport's;
      2. the picture: the isobars drawn apart in proportion to the
         spacing; the wind aloft along them, as long as its speed (6 px a
         knot, held to 440); the wind on deck two thirds of it, turned 15
         degrees TOWARD THE LOW - up in the north, where the low is on the
         wind's left, down in the south; halving the spacing doubles the
         arrow;
      3. the curves: the reading's dot sits on the curve for its own
         latitude, at the spacing typed and the wind worked; the same
         spacing blows harder nearer the equator;
      4. within 5 degrees of the equator no drawing, only the refusal;
      5. day and night redraw in the page's colours; nothing leaves a box;
      6. the gradient lesson carries the same scale, its example marked;
      7. a lesson's link fills the screen and builds "Back to the lesson"
         only from an exact lesson name (weather 1.0.4, Larry ALI).

      node weather-isoui.js   (needs the server on $PORT)  */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
let checks = 0, bad = 0;
function ok(what, cond, note) { checks++; if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); } }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 744, height: 2400 }, timezoneId: 'UTC' });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 20000 });
  ok('the home menu offers the screen', await page.$('[data-go="isobars"]') !== null);
  await page.click('[data-go="isobars"]');
  await page.waitForTimeout(200);
  const set = (sp, lat, north, step) => page.evaluate(([sp, lat, north, step]) => {
    const f = (id, v) => { const e = document.getElementById(id); e.value = v;
      e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
    f('i-step', step); f('i-hemi', north ? '1' : '0'); f('i-lat', lat); f('i-sp', sp);
  }, [sp, lat, north, step]);
  const read = () => page.evaluate(() => {
    const svgs = document.querySelectorAll('#iso-figs svg');
    const P = (svg, n) => { const e = svg && svg.querySelector('[data-part="' + n + '"]'); if (!e) return null;
      const o = {}; ['x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'data-len', 'data-wind', 'data-sp'].forEach(a => {
        if (e.hasAttribute(a)) o[a] = +e.getAttribute(a); });
      o.stroke = e.getAttribute('stroke'); o.fill = e.getAttribute('fill'); o.y = +e.getAttribute('y');
      o.points = e.getAttribute('points'); return o; };
    const box = s => { if (!s) return true; const b = s.getBBox(), v = s.getAttribute('viewBox').split(' ').map(Number);
      return b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v[2] + 0.5 && b.y + b.height <= v[3] + 0.5; };
    const [pic, cur] = svgs;
    const cs = getComputedStyle(document.documentElement);
    return { n: svgs.length, lowL: P(pic, 'iso-low'), highL: P(pic, 'iso-high'), low: P(pic, 'low'),
             aloft: P(pic, 'aloft'), deck: P(pic, 'deck'), dot: P(cur, 'dot'),
             curves: cur ? [...cur.querySelectorAll('[data-part^="curve-"]')].map(e => ({
               lat: +e.getAttribute('data-part').slice(6), pts: e.getAttribute('points'),
               w: +e.getAttribute('stroke-width') })) : [],
             out: document.getElementById('iso-out').innerText, term: document.getElementById('iso-term').textContent,
             boxes: [box(pic), box(cur)], acc: cs.getPropertyValue('--accent').trim() };
  });
  const CH = await page.evaluate(() => ({ ok: typeof CHART === 'object' }));
  ok('CHART is on the page', CH.ok);

  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    for (const [sp, lat, north, step] of [[100, 50, true, 4], [200, 50, true, 4], [100, 50, false, 4],
                                           [60, 30, true, 4], [150, 45, false, 2], [30, 60, true, 4]]) {
      await set(sp, lat, north, step);
      await page.waitForTimeout(60);
      const r = await read();
      const tag = `${mode} ${sp} nm ${lat}${north ? 'N' : 'S'} ${step} hPa: `;
      const want = await page.evaluate(([sp, lat, north, step]) => {
        const it = CHART.isoReport(String(sp), String(lat), String(step), north);
        return { v: it.wind, term: CHART.isoTerminal(it, true),
                 says: it.filter(i => i.k !== 'tab' && i.k !== 'gap').map(i => i.t) };
      }, [sp, lat, north, step]);
      /* 1 */ ok(tag + 'the terminal rendering is the report\'s', r.term === want.term);
      /* 1 */ ok(tag + 'every line of reasoning is shown', want.says.every(s => r.out.indexOf(s) >= 0));
      /* 2 */ ok(tag + 'two drawings', r.n === 2);
      const gapPx = Math.abs(r.highL.y1 - r.lowL.y1), wantGap = Math.max(26, Math.min(230, sp * 0.9));
      ok(tag + 'the isobars drawn apart in proportion', Math.abs(gapPx - wantGap) < 0.01, gapPx);
      ok(tag + (north ? 'the low above (on the wind\'s left)' : 'the low below (on the wind\'s right)'),
         north ? r.lowL.y1 < r.highL.y1 && r.low.y < r.lowL.y1 : r.lowL.y1 > r.highL.y1 && r.low.y > r.lowL.y1);
      const L = Math.min(440, want.v * 6);
      ok(tag + 'the wind aloft is as long as its speed', Math.abs(r.aloft['data-len'] - L) < 1e-6 &&
         Math.abs((r.aloft.x2 + 8 - r.aloft.x1) - L) < 0.01 && r.aloft.y1 === r.aloft.y2);
      ok(tag + 'the wind on deck is two thirds of it', Math.abs(r.deck['data-len'] - L * 2 / 3) < 1e-6);
      const ang = Math.atan2(-(r.deck.y2 - r.deck.y1), r.deck.x2 - r.deck.x1) * 180 / Math.PI;
      ok(tag + 'turned 15 degrees toward the low', Math.abs(Math.abs(ang) - 15) < 0.2 && (north ? ang > 0 : ang < 0), ang);
      /* 3 */
      ok(tag + 'the dot carries the wind worked', Math.abs(r.dot['data-wind'] - want.v) < 1e-9);
      const X = d => 70 + (d - 40) / 260 * 520, Y = w => 330 - w / 80 * 290;
      const inScale = sp >= 40 && sp <= 300 && want.v <= 80;
      if (inScale) ok(tag + 'the dot sits at the spacing and the wind', Math.abs(r.dot.cx - X(sp)) < 0.01 && Math.abs(r.dot.cy - Y(want.v)) < 0.01);
      else ok(tag + 'a reading off the scale is pinned to its edge', r.dot.cx >= 69.9 && r.dot.cx <= 590.1 && r.dot.cy >= 39.9);
      const mine = r.curves.find(c => Math.abs(c.lat - lat) < 0.5);
      ok(tag + 'the reader\'s latitude is drawn bold', mine && mine.w === 3);
      if (inScale && mine) {
        const pts = mine.pts.split(' ').map(p => p.split(',').map(Number));
        const near = pts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - r.dot.cx, p[1] - r.dot.cy)), 1e9);
        ok(tag + 'the dot is on its curve', near < 4, near);
      }
      ok(tag + 'drawn in the page\'s accent', r.deck.stroke === r.acc);
      ok(tag + 'nothing outside either box', r.boxes[0] && r.boxes[1]);
    }
    /* 2: halving the spacing doubles the arrow (inside the clamp) */
    await set(200, 50, true, 4); const a = (await read()).aloft['data-len'];
    await set(100, 50, true, 4); const b = (await read()).aloft['data-len'];
    ok(mode + ': halving the spacing doubles the wind aloft', Math.abs(b / a - 2) < 1e-9);
    /* 3: nearer the equator blows harder: the 30 degree curve is above the 60 */
    const r = await read();
    const at = (c, x) => { const p = c.pts.split(' ').map(q => q.split(',').map(Number)); return p.reduce((m, q) => Math.abs(q[0] - x) < Math.abs(m[0] - x) ? q : m, p[0])[1]; };
    const c30 = r.curves.find(c => c.lat === 30), c60 = r.curves.find(c => c.lat === 60);
    ok(mode + ': nearer the equator the same spacing blows harder', at(c30, 400) < at(c60, 400));
    /* 4 */
    await set(100, 3, true, 4); const q = await read();
    ok(mode + ': within 5 degrees of the equator, no drawing', q.n === 0 && /do not give the wind/.test(q.out));
  }
  /* 7: a lesson's link (weather 1.0.4, Larry ALI): the example filled in,
     and "Back to the lesson" built only from an exact lesson name, by the
     rule in docs/web/shared/lesson.js  */
  const CB = 'https://bashnav.navigationtools.org/practical-navigator/coastal/';
  for (const [q, want] of [
    ['view=isobars&sp=100&lat=50&hemi=N&step=4&lesson=l3a-2025-1',
       { sp: '100', lat: '50', hemi: '1', step: '4', back: CB + 'l3a-2025.html#l3a-2025-1', wind: 31 }],
    ['view=isobars&sp=150&lat=45&hemi=S&lesson=l3-2025-4',
       { sp: '150', lat: '45', hemi: '0', step: '', back: CB + 'l3-2025.html#l3-2025-4', wind: null }],
    ['view=isobars&sp=100&lat=50&lesson=l3a-4', { sp: '100', lat: '50', hemi: '1', step: '', back: null, wind: 31 }],
    ['view=isobars&sp=abc&lat=50&lesson=l3a-2025-1%22%3E%3Cb%3E', { sp: '', lat: '50', hemi: '1', step: '', back: null, wind: null }],
    ['view=isobars&sp=100&lat=javascript:alert(1)', { sp: '100', lat: '', hemi: '1', step: '', back: null, wind: null }]]) {
    const p2 = await browser.newPage({ viewport: { width: 744, height: 1600 } });
    p2.on('pageerror', e => errs.push(String(e)));
    await p2.goto(BASE + 'index.html?' + q, { waitUntil: 'load' });
    await p2.waitForTimeout(250);
    const r = await p2.evaluate(() => ({
      view: VIEW, sp: document.getElementById('i-sp').value, lat: document.getElementById('i-lat').value,
      hemi: document.getElementById('i-hemi').value, step: document.getElementById('i-step').value,
      shown: !document.getElementById('iso-lesson').hidden,
      href: document.getElementById('iso-lesson-a').getAttribute('href'),
      out: document.getElementById('iso-out').innerText }));
    const tag = 'link ?' + q + ': ';
    ok(tag + 'opens the isobars screen', r.view === 'isobars');
    ok(tag + 'fills the fields from numbers only', r.sp === want.sp && r.lat === want.lat && r.hemi === want.hemi && r.step === want.step,
       JSON.stringify(r));
    ok(tag + (want.back ? 'shows the way back to the lesson' : 'builds no way back'),
       want.back ? (r.shown && r.href === want.back) : !r.shown, r.href);
    if (want.wind) ok(tag + 'works the example', r.out.indexOf('at ' + want.wind + ' knots') >= 0);
    await p2.close();
  }

  /* 6: the gradient lesson's scale */
  await page.evaluate(() => go('learn')); await page.waitForTimeout(150);
  await page.click('#les-list >> text=/Gradient wind/i'); await page.waitForTimeout(400);
  const ls = await page.evaluate(() => {
    const d = document.querySelector('#les-body .isodemo [data-part="dot"]');
    return d ? { sp: +d.getAttribute('data-sp'), w: +d.getAttribute('data-wind') } : null;
  });
  ok('the gradient lesson carries the scale, 100 nm at 50 N marked', ls && ls.sp === 100 && Math.abs(ls.w - 30.68) < 0.01, JSON.stringify(ls));
  if (process.env.SHOTS) {
    await page.evaluate(() => setMode('day'));
    await page.evaluate(() => go('isobars')); await set(100, 50, true, 4); await page.waitForTimeout(150);
    const els = await page.$$('#iso-figs .isodemo');
    await els[0].screenshot({ path: process.env.SHOTS + '/iso-picture.png' });
    await els[1].screenshot({ path: process.env.SHOTS + '/iso-curves.png' });
    await (await page.$('#v-isobars')).screenshot({ path: process.env.SHOTS + '/iso-screen.png' });
  }
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the wind from the isobars, on the page' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
