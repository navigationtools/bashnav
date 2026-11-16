/*  Backing and veering (weather 1.0.2, lesson `veer`; Larry, AKI): do the
    two figures say what the words say?

      veertime   veering is CLOCKWISE round the compass and backing
                 ANTICLOCKWISE.  Read off the arcs: each starts beside the
                 wind now (west) and runs the stated way - toward north for
                 the veer, toward south for the back - with the sweep that
                 goes that way on the screen.
      veerhemi   the surface wind turns TOWARD THE LOW in both panels; the
                 low is drawn above the wind aloft in the north (its left,
                 looking downwind) and below it in the south (its right);
                 so the turn is anticlockwise (backed) in the north and
                 clockwise (veered) in the south, and the panel's word
                 agrees with the drawing.
    In night and day: colours from the page, nothing outside the box.

      node weather-veer.js   (needs the server on $PORT)  */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';

let checks = 0, bad = 0;
function ok(what, cond, note) {
  checks++;
  if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 744, height: 2600 }, timezoneId: 'UTC' });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 20000 });
  await page.click('[data-go="learn"]');
  await page.waitForTimeout(250);
  await page.click('#les-list >> text=/Backing and veering/i');
  await page.waitForTimeout(500);
  ok('the veer lesson carries both figures',
     await page.evaluate(() => document.querySelectorAll('#les-body .veerdemo').length) === 2);

  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const figs = document.querySelectorAll('#les-body .veerdemo svg');
      const q = (svg, n) => svg.querySelector('[data-part="' + n + '"]');
      const L = e => e && { x1: +e.getAttribute('x1'), y1: +e.getAttribute('y1'),
                            x2: +e.getAttribute('x2'), y2: +e.getAttribute('y2'),
                            stroke: e.getAttribute('stroke') };
      const A = e => e && { from: +e.getAttribute('data-from'), to: +e.getAttribute('data-to'),
                            sweep: +e.getAttribute('data-sweep'), d: e.getAttribute('d'),
                            stroke: e.getAttribute('stroke') };
      const bb = s => { const b = s.getBBox(), v = s.getAttribute('viewBox').split(' ').map(Number);
                        return b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v[2] + 0.5 && b.y + b.height <= v[3] + 0.5; };
      const [t, h] = figs;
      const T = (svg, n) => { const e = q(svg, n); return e && { y: +e.getAttribute('y'), s: e.textContent }; };
      const cs = getComputedStyle(document.documentElement);
      return { veer: A(q(t, 'veer-arc')), back: A(q(t, 'back-arc')), now: L(q(t, 'wind-now')),
               nS: L(q(h, 'north-surface')), nA: L(q(h, 'north-aloft')), nLow: T(h, 'north-low'), nW: T(h, 'north-word'),
               sS: L(q(h, 'south-surface')), sA: L(q(h, 'south-aloft')), sLow: T(h, 'south-low'), sW: T(h, 'south-word'),
               box: [bb(t), bb(h)], acc: cs.getPropertyValue('--accent').trim() };
    });
    const tag = mode + ': ';
    /* the compass: bearings increase clockwise */
    ok(tag + 'the veer starts beside west and runs toward north', Math.abs(r.veer.from - 270) < 15 && r.veer.to > r.veer.from && r.veer.to <= 360);
    ok(tag + 'the veer sweeps clockwise on the screen', r.veer.sweep === 1);
    ok(tag + 'the back starts beside west and runs toward south', Math.abs(r.back.from - 270) < 15 && r.back.to < r.back.from && r.back.to >= 180);
    ok(tag + 'the back sweeps anticlockwise on the screen', r.back.sweep === 0);
    ok(tag + 'the wind now is from the west, blowing east', r.now.x2 > r.now.x1 && Math.abs(r.now.y2 - r.now.y1) < 0.01);
    /* the hemispheres */
    const turn = (S) => Math.atan2(-(S.y2 - S.y1), S.x2 - S.x1) * 180 / Math.PI;   /* + is anticlockwise */
    ok(tag + 'both winds aloft run the same way, east', r.nA.x2 > r.nA.x1 && r.sA.x2 > r.sA.x1);
    ok(tag + 'north: the low is above the wind (its left)', r.nLow.y < r.nS.y1);
    ok(tag + 'south: the low is below the wind (its right)', r.sLow.y > r.sS.y1);
    ok(tag + 'north: the surface wind turns toward the low, anticlockwise', turn(r.nS) > 5 && turn(r.nS) < 25, turn(r.nS));
    ok(tag + 'south: the surface wind turns toward the low, clockwise', turn(r.sS) < -5 && turn(r.sS) > -25, turn(r.sS));
    ok(tag + 'the same turn, mirrored', Math.abs(turn(r.nS) + turn(r.sS)) < 0.01);
    ok(tag + 'north is called backed', /BACKED/.test(r.nW.s) && /anticlockwise/.test(r.nW.s));
    ok(tag + 'south is called veered', /VEERED/.test(r.sW.s) && /clockwise/.test(r.sW.s) && !/anticlockwise/.test(r.sW.s));
    ok(tag + 'drawn in the page\'s accent', r.veer.stroke === r.acc && r.nS.stroke === r.acc);
    ok(tag + 'nothing outside either box', r.box[0] && r.box[1]);
    if (process.env.SHOTS) {
      const els = await page.$$('#les-body .veerdemo');
      await els[0].screenshot({ path: process.env.SHOTS + '/veertime-' + mode + '.png' });
      await els[1].screenshot({ path: process.env.SHOTS + '/veerhemi-' + mode + '.png' });
    }
  }
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the backing and veering figures' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
