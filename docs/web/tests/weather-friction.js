/*  The friction figure (W01): does the picture say what the lesson says?

    The gradient lesson gives two rules of thumb, and the figure beside it
    draws them.  Larry ruled (AJZ, 16 November 2026) that the land speed is
    drawn as a band, 1/3 to 2/3 of the wind aloft, because the public
    sources disagree (RMetS MetLink 1/3, a sea-kayak text 1/2, US Navy
    aerographer training 2/3) and because the ground decides it: forests,
    towns and cities drag most, open fields least.  So every number is
    MEASURED OFF THE DRAWING and held to the rule:

      1. over the sea the surface wind is backed 10-20 degrees and about
         2/3 the length of the wind aloft;
      2. over land it is backed 30-40 degrees, solid to 1/3 of the wind
         aloft and dashed on to 2/3 - the band, both ends;
      3. it turns TOWARD THE LOW, which is drawn above the isobar: the
         northern-hemisphere sense (backed).  A figure drawn the other way
         would teach the southern hemisphere, which is the fault the
         terminal's own wind figure carried until this was built;
      4. land turns further than sea, and is slower at its slow end;
      5. the colours come from the page's tokens, in day and in night
         alike, and the drawing is redrawn when the mode changes;
      6. nothing is drawn outside the figure's box.

      node weather-friction.js   (needs the server on $PORT)  */
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

  ok('the friction figure is on the gradient lesson, once',
     await page.evaluate(() => document.querySelectorAll('.fricdemo').length) === 1);

  const read = () => page.evaluate(() => {
    const svg = document.querySelector('.fricdemo svg');
    const L = n => { const e = svg.querySelector('[data-part="' + n + '"]');
      return e && { x1: +e.getAttribute('x1'), y1: +e.getAttribute('y1'),
                    x2: +e.getAttribute('x2'), y2: +e.getAttribute('y2'),
                    stroke: e.getAttribute('stroke') }; };
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    const bb = svg.getBBox();
    return { vb, bb: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
             sea: { aloft: L('sea-aloft'), surf: L('sea-surface'), isobar: L('sea-isobar') },
             land: { aloft: L('land-aloft'), surf: L('land-surface'), band: L('land-band'),
                     isobar: L('land-isobar') },
             low: [...svg.querySelectorAll('text')].filter(t => t.textContent === 'LOW side')
                    .map(t => +t.getAttribute('y')),
             acc: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
             dim: getComputedStyle(document.documentElement).getPropertyValue('--dim').trim() };
  });
  const len = l => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
  const ang = l => Math.atan2(l.y1 - l.y2, l.x2 - l.x1) * 180 / Math.PI;  /* up is positive */
  const alen = l => l.x2 - l.x1;

  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    await page.waitForTimeout(200);
    const r = await read();
    const S = r.sea, D = r.land;
    ok(mode + ': every part is drawn', S.aloft && S.surf && D.aloft && D.surf && D.band);
    if (!(S.aloft && S.surf && D.aloft && D.surf && D.band)) continue;
    const as = ang(S.surf), al = ang(D.surf);
    ok(mode + ': sea, backed 10-20 deg', as >= 10 && as <= 20, as.toFixed(1));
    ok(mode + ': land, backed 30-40 deg', al >= 30 && al <= 40, al.toFixed(1));
    ok(mode + ': the land band runs on the same line', Math.abs(ang({ x1: D.surf.x1, y1: D.surf.y1,
       x2: D.band.x2, y2: D.band.y2 }) - al) < 0.5);
    const fs = len(S.surf) / alen(S.aloft);
    const f1 = len(D.surf) / alen(D.aloft);
    const f2 = Math.hypot(D.band.x2 - D.surf.x1, D.band.y2 - D.surf.y1) / alen(D.aloft);
    ok(mode + ': sea, about 2/3 of the wind aloft', Math.abs(fs - 2 / 3) < 0.02, fs.toFixed(3));
    ok(mode + ': land, the slow end at 1/3', Math.abs(f1 - 1 / 3) < 0.02, f1.toFixed(3));
    ok(mode + ': land, the fast end at 2/3', Math.abs(f2 - 2 / 3) < 0.02, f2.toFixed(3));
    ok(mode + ': land turns further than sea', al > as);
    ok(mode + ': the slow end over land is slower than the sea', f1 < fs);
    /*  the sense: aloft runs to the right (east), the low is drawn above,
        and the surface wind rises toward it - the northern hemisphere  */
    ok(mode + ': the wind aloft runs along the isobar, to the right',
       S.aloft.y1 === S.aloft.y2 && S.aloft.x2 > S.aloft.x1 && D.aloft.x2 > D.aloft.x1);
    ok(mode + ': the low is marked above the isobar, in both panels',
       r.low.length === 2 && r.low.every(y => y < S.isobar.y1));
    ok(mode + ': the surface wind turns toward the low (up)',
       S.surf.y2 < S.surf.y1 && D.surf.y2 < D.surf.y1);
    ok(mode + ': drawn in the page\'s accent', S.surf.stroke === r.acc && D.band.stroke === r.acc,
       S.surf.stroke + ' vs ' + r.acc);
    ok(mode + ': the wind aloft in the page\'s dim ink', S.aloft.stroke === r.dim);
    ok(mode + ': nothing outside the box',
       r.bb.x >= -0.5 && r.bb.y >= -0.5 && r.bb.x + r.bb.w <= r.vb[2] + 0.5 &&
       r.bb.y + r.bb.h <= r.vb[3] + 0.5,
       JSON.stringify(r.bb));
    if (process.env.SHOTS) {
      const el = await page.$('.fricdemo');
      await el.screenshot({ path: process.env.SHOTS + '/friction-' + mode + '.png' });
    }
  }
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the friction figure, measured off the drawing' +
              (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
