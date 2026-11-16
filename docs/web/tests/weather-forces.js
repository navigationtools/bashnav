/*  The force triangle (weather 1.0.2): does the drawing obey the balance?

    Larry asked (16 November 2026) for a vector from the low to the wind,
    and to see with vector analysis what more friction does.  Near the
    surface three forces balance - pressure toward the low (f.G), Coriolis
    at right angles to the wind and to its right in the north (f.V), and
    friction straight against it (k.V) - and he chose a friction slider
    (AKF).  So for friction from none to the slider's end, every number is
    MEASURED OFF THE DRAWING and held to the balance written here, not to
    the page's own arithmetic:

      1. the three forces close: pressure + Coriolis + friction = 0;
      2. Coriolis and friction meet at a right angle, so the corner lies on
         the circle drawn on the pressure arrow (Thales);
      3. the wind is turned toward the low by atan(k/f), and the friction
         side lies along it, pointing against it;
      4. Coriolis lies to the RIGHT of the wind: the northern hemisphere;
      5. the layer's wind is cos(alpha) of the wind aloft, and so is the
         Coriolis side against the pressure arrow;
      6. more friction turns the wind further and slows it - never the
         other way - and with none the wind runs along the isobar;
      7. the readout gives the turn, names the ground, gives the rule of
         thumb on deck, and tells what is happening in a sailor's words;
      8. the colours come from the page, night and day; nothing leaves the
         box; the slider survives a change of mode.

      node weather-forces.js   (needs the server on $PORT)  */
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
  const page = await browser.newPage({ viewport: { width: 744, height: 1800 }, timezoneId: 'UTC' });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 20000 });
  await page.click('[data-go="learn"]');
  await page.waitForTimeout(250);
  await page.click('#les-list >> text=/Gradient wind/i');
  await page.waitForTimeout(500);
  ok('the force triangle is on the gradient lesson, once',
     await page.evaluate(() => document.querySelectorAll('.forcedemo').length) === 1);

  const set = v => page.evaluate(v => {
    const i = document.getElementById('fr-k'); i.value = v;
    i.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  const read = () => page.evaluate(() => {
    const svg = document.querySelector('.forcedemo svg');
    const L = n => { const e = svg.querySelector('[data-part="' + n + '"]');
      return e && { x1: +e.getAttribute('x1'), y1: +e.getAttribute('y1'),
                    x2: +e.getAttribute('x2'), y2: +e.getAttribute('y2'),
                    stroke: e.getAttribute('stroke') }; };
    const T = n => { const e = svg.querySelector('[data-part="' + n + '"]'); return e ? e.textContent : ''; };
    const c = svg.querySelector('[data-part="circle"]');
    const vb = svg.getAttribute('viewBox').split(' ').map(Number), bb = svg.getBBox();
    const cs = getComputedStyle(document.documentElement);
    return { pgf: L('pgf'), cor: L('cor'), fric: L('fric'), wind: L('wind'), aloft: L('aloft'),
             circle: { cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r') },
             ground: T('ground'), turn: T('turn'), deck: T('deck'),
             story: (document.querySelector('.forcestory') || {}).textContent || '',
             vb, bb: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
             text: cs.getPropertyValue('--text').trim(), acc: cs.getPropertyValue('--accent').trim() };
  });
  const vec = l => [l.x2 - l.x1, -(l.y2 - l.y1)];        /* up is positive */
  const len = v => Math.hypot(v[0], v[1]);
  const D2R = Math.PI / 180;

  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    await page.waitForTimeout(150);
    let lastA = -1, lastV = 1e9;
    for (const v of [0, 10, 27, 45, 58, 70, 84, 100]) {
      await set(v);
      const r = await read(), k = v / 100;
      const P = vec(r.pgf), C = vec(r.cor), F = vec(r.fric), Wv = vec(r.wind), A = vec(r.aloft);
      const tag = mode + ' k/f ' + k.toFixed(2);
      const want = Math.atan(k) / D2R;
      /* 1 */ ok(tag + ': the forces close', Math.hypot(P[0] + C[0] + F[0], P[1] + C[1] + F[1]) < 0.5);
      /* 1 */ ok(tag + ': head to tail', Math.abs(r.pgf.x2 - r.cor.x1) < 0.01 && Math.abs(r.cor.x2 - r.fric.x1) < 0.01 &&
                 Math.abs(r.fric.x2 - r.pgf.x1) < 0.01 && Math.abs(r.fric.y2 - r.pgf.y1) < 0.01);
      /* 1 */ ok(tag + ': pressure points to the low (up)', P[1] > 0 && Math.abs(P[0]) < 0.01);
      if (k > 0) {
        /* 2 */ ok(tag + ': Coriolis meets friction at a right angle',
                   Math.abs(C[0] * F[0] + C[1] * F[1]) / (len(C) * len(F)) < 0.01);
        const dc = Math.hypot(r.cor.x2 - r.circle.cx, r.cor.y2 - r.circle.cy);
        /* 2 */ ok(tag + ': the corner is on the circle', Math.abs(dc - r.circle.r) < 0.5, dc + ' vs ' + r.circle.r);
        /* 3 */ ok(tag + ': friction against the wind',
                   (F[0] * Wv[0] + F[1] * Wv[1]) / (len(F) * len(Wv)) < -0.999);
      }
      const ang = Math.atan2(Wv[1], Wv[0]) / D2R;
      /* 3 */ ok(tag + ': the wind turned atan(k/f) toward the low', Math.abs(ang - want) < 0.2,
                 ang.toFixed(2) + ' vs ' + want.toFixed(2));
      /* 4 */ ok(tag + ': Coriolis to the right of the wind', Wv[0] * C[1] - Wv[1] * C[0] < 1e-6);
      const cw = Math.cos(Math.atan(k));
      /* 5 */ ok(tag + ': the layer wind is cos(alpha) of the wind aloft',
                 Math.abs(len(Wv) / len(A) - cw) < 0.005, (len(Wv) / len(A)).toFixed(3));
      /* 5 */ ok(tag + ': Coriolis against pressure is cos(alpha)', Math.abs(len(C) / len(P) - cw) < 0.005);
      /* 6 */ ok(tag + ': more friction turns it further', ang > lastA - 1e-9);
      /* 6 */ ok(tag + ': and slows it', len(Wv) < lastV + 1e-9);
      lastA = ang; lastV = len(Wv);
      if (k === 0) ok(tag + ': with no friction the wind runs along the isobar', Math.abs(ang) < 0.01);
      /* 7 */ ok(tag + ': the readout gives the turn', r.turn.indexOf('turned ' + Math.round(want) + '°') === 0, r.turn);
      /* 7: the story under the slider, in a sailor's words, is the one for this ground */
      const st = want < 5 ? 'Aloft' : want < 23 ? 'Over the sea' : want < 33 ? 'Over open land' : 'Trees and buildings';
      ok(tag + ': the story is told for this ground', r.story.indexOf(st) === 0, r.story.slice(0, 40));
      const dk = want < 5 ? 'all of it' : want < 23 ? 'about 2/3' : want < 33 ? 'nearer 2/3' : 'nearer 1/3';
      ok(tag + ': the deck rule is given', r.deck.indexOf(dk) > 0, r.deck);
      const g = want < 5 ? 'none' : want < 23 ? 'the sea' : want < 33 ? 'open fields' : 'forests, towns and cities';
      /* 7 */ ok(tag + ': the ground is named', r.ground.indexOf(g) > 0, r.ground);
      /* 8 */ ok(tag + ': drawn in the page\'s colours', r.pgf.stroke === r.text && r.wind.stroke === r.acc);
      /* 8 */ ok(tag + ': nothing outside the box', r.bb.x >= -0.5 && r.bb.y >= -0.5 &&
                 r.bb.x + r.bb.w <= r.vb[2] + 0.5 && r.bb.y + r.bb.h <= r.vb[3] + 0.5, JSON.stringify(r.bb));
    }
    if (process.env.SHOTS) {
      await set(27);
      await (await page.$('.forcedemo')).screenshot({ path: process.env.SHOTS + '/forces-' + mode + '.png' });
    }
  }
  /* 8: a change of mode redraws, and keeps the reader's friction */
  await set(70);
  await page.evaluate(() => setMode('night'));
  await page.waitForTimeout(150);
  ok('the slider keeps its place across a change of mode',
     await page.evaluate(() => document.getElementById('fr-k').value) === '70');
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the force triangle, measured off the drawing' +
              (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
