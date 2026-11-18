/*  A low passing a boat, looked down on (weather 1.0.9, lesson `veer`;
    Larry, AQN, the first part of card I19): does the drawing say what the
    words say, and does it say what the rule says?

    Everything is read back off the drawing - where the lows are, which
    way the track's head points, where each boat sits, which way every
    arrow runs - and nothing is taken from the figure's own arithmetic:

      the low      three of them on the track, in time order the way the
                   head points, the title saying the same; two isobars
                   centred on each, and between them,
                   eight arrows that go round it anticlockwise in the north
                   and clockwise in the south, each turned 15 degrees in
                   toward the centre (Larry, 18 November: any figure that
                   describes the wind in a low shows the low itself, with
                   its wind arrows).
      each boat    one north and one south of the track.  Its three winds
                   obey Buys Ballot against the low drawn at that time:
                   facing the way the wind blows, the low lies 75 degrees
                   to the left in the north and to the right in the south
                   (90, less the 15 the wind turns in).  The label beside
                   each arrow names the point it is drawn from.
      the words    VEERS or BACKS, as the drawn winds turn from time 1 to
                   time 3; and as the rule says, looking the way the low
                   goes: the boat on its right veers, the boat on its left
                   backs.  "The low passes to its south" for the boat
                   north of the track, and the other way.

    THE CHECKER IS SHOWN TO CATCH THINGS.  After the real figures pass, the
    same checker is run on copies with one thing broken in each - a word
    swapped, one wind arrow drawn the wrong way, one low spun the wrong
    way, the track's head turned round - and each copy must fail.

    In night and day: colours from the page, nothing outside the box.

      node weather-pass.js   (needs the server on $PORT)  */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';

let checks = 0, bad = 0;
function ok(what, cond, note) {
  checks++;
  if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); }
}

/*  Runs in the page.  Returns a list of faults for one svg; empty is good. */
function checkFigure(svg, expectNorth) {
  const F = [];
  const bad = (s) => F.push(s);
  const num = (e, a) => +e.getAttribute(a);
  const RAD = Math.PI / 180;
  const norm = (d) => ((d % 360) + 360) % 360;
  const diff = (a, b) => ((a - b + 540) % 360) - 180;          /* a - b in (-180, 180] */
  const PT = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const nm = (d) => PT[Math.round(norm(d) / 22.5) % 16];
  /*  a compass bearing from a screen vector (y down)  */
  const brg = (dx, dy) => norm(Math.atan2(dx, -dy) / RAD);
  const north = svg.getAttribute('data-north') === '1';
  if (north !== expectNorth) bad('the figure is for the other hemisphere');
  const panels = svg.querySelectorAll('[data-part="panel"]');
  if (panels.length !== 2) { bad('two panels, found ' + panels.length); return F; }
  const texts = Array.from(svg.querySelectorAll('text'));
  const tops = Array.from(panels).map(g => +g.querySelector('line').getAttribute('y1'));
  const H = +svg.getAttribute('viewBox').split(' ')[3];
  const seen = { east: 0, west: 0 };
  Array.from(panels).forEach((g, pi) => {
    const y0 = tops[pi], y1 = pi + 1 < tops.length ? tops[pi + 1] : H;
    const inP = (t) => +t.getAttribute('y') > y0 && +t.getAttribute('y') < y1;
    const ptexts = texts.filter(inP);
    const q = (sel) => Array.from(svg.querySelectorAll(sel)).filter(e => {
      const y = e.hasAttribute('cy') ? +e.getAttribute('cy') : e.hasAttribute('y1') ? (+e.getAttribute('y1') + +e.getAttribute('y2')) / 2 : +e.getAttribute('y');
      return y > y0 && y < y1;
    });
    /*  the track and the way it goes  */
    const track = g.querySelector('[data-part="track"]');
    const ty = num(track, 'y1');
    const head = g.querySelector('[data-part="track-head"]').getAttribute('d').match(/^M([\d.]+),/);
    const hx = +head[1], mid = (num(track, 'x1') + num(track, 'x2')) / 2;
    const east = hx > mid;
    seen[east ? 'east' : 'west']++;
    const title = ptexts.find(t => /^GOING (EAST|WEST)$/.test(t.textContent));
    if (!title || title.textContent !== (east ? 'GOING EAST' : 'GOING WEST'))
      bad('panel ' + pi + ': the title does not say the way the head points');
    /*  the low at its three times, in order along the way it goes  */
    const lows = q('[data-part="low"]').sort((a, b) => num(a, 'data-t') - num(b, 'data-t'));
    if (lows.length !== 3) { bad('panel ' + pi + ': three lows, found ' + lows.length); return; }
    const LX = lows.map(l => num(l, 'cx'));
    lows.forEach(l => { if (Math.abs(num(l, 'cy') - ty) > 0.5) bad('panel ' + pi + ': a low off its track'); });
    if (!((LX[1] - LX[0]) * (east ? 1 : -1) > 0 && (LX[2] - LX[1]) * (east ? 1 : -1) > 0))
      bad('panel ' + pi + ': the lows are not in time order the way the head points');
    /*  each low drawn as a low: two isobars round it, on its centre  */
    const isos = q('[data-part="isobar"]');
    const isoR = [1, 2, 3].map(t => isos.filter(c => num(c, 'data-t') === t));
    isoR.forEach((cs, k) => {
      if (cs.length !== 2) bad('panel ' + pi + ': two isobars round the low at ' + (k + 1) + ', found ' + cs.length);
      cs.forEach(c => { if (Math.hypot(num(c, 'cx') - LX[k], num(c, 'cy') - ty) > 0.5) bad('panel ' + pi + ': an isobar off its low'); });
    });
    /*  each low's wind: round it the hemisphere's way, turned in 15  */
    const spins = q('[data-part="spin"]');
    if (spins.length !== 24) bad('panel ' + pi + ': eight arrows round each low, found ' + spins.length);
    spins.forEach(s => {
      const t = num(s, 'data-t'), lx = LX[t - 1];
      const x1 = num(s, 'x1'), y1 = num(s, 'y1'), x2 = num(s, 'x2'), y2 = num(s, 'y2');
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const out = brg(mx - lx, my - ty);                     /* the low to the arrow */
      const go = brg(x2 - x1, y2 - y1);                       /* the way it blows */
      /*  anticlockwise round the low is out - 90; inward adds 15 more  */
      const want = north ? out - 105 : out + 105;
      /*  between its low's two isobars, so it is seen crossing them  */
      const rr = isoR[t - 1].map(c => num(c, 'r')).sort((a, b) => a - b), dm = Math.hypot(mx - lx, my - ty);
      if (rr.length === 2 && !(dm > rr[0] && dm < rr[1])) bad('panel ' + pi + ': a spin arrow not between its isobars');
      if (Math.abs(diff(go, want)) > 2)
        bad('panel ' + pi + ': a spin arrow at ' + out.toFixed(0) + ' blows ' + go.toFixed(0) + ', wants ' + norm(want).toFixed(0));
    });
    /*  the boats  */
    [1, -1].forEach(side => {
      const boat = q('[data-part="boat"]').find(b => +b.getAttribute('data-side') === side);
      if (!boat) { bad('panel ' + pi + ': no boat on side ' + side); return; }
      const bx = num(boat, 'cx'), by = num(boat, 'cy');
      const isNorth = by < ty;
      if (isNorth !== (side > 0)) bad('panel ' + pi + ': the boat called north is not above the track');
      const winds = q('[data-part="wind"]').filter(w => +w.getAttribute('data-side') === side)
        .sort((a, b) => num(a, 'data-t') - num(b, 'data-t'));
      if (winds.length !== 3) { bad('panel ' + pi + ': three winds at a boat, found ' + winds.length); return; }
      const from = winds.map((w, k) => {
        const x1 = num(w, 'x1'), y1 = num(w, 'y1'), x2 = num(w, 'x2'), y2 = num(w, 'y2');
        /*  it runs at the boat: its head is the nearer end  */
        if (Math.hypot(x2 - bx, y2 - by) >= Math.hypot(x1 - bx, y1 - by)) bad('panel ' + pi + ': a wind arrow runs away from its boat');
        const go = brg(x2 - x1, y2 - y1);
        const toLow = brg(LX[k] - bx, ty - by);
        /*  Buys Ballot: facing downwind the low is 75 degrees to the
            left in the north, to the right in the south  */
        const rel = diff(toLow, go);
        if (Math.abs(rel - (north ? -75 : 75)) > 2)
          bad('panel ' + pi + ' side ' + side + ' time ' + (k + 1) + ': the low is ' + rel.toFixed(0) + ' off the wind, wants ' + (north ? -75 : 75));
        const f = norm(go + 180);
        const lab = q('[data-part="wind-label"]').find(l => +l.getAttribute('data-side') === side && +l.getAttribute('data-t') === k + 1);
        if (!lab || lab.textContent !== (k + 1) + ' ' + nm(f))
          bad('panel ' + pi + ': the label "' + (lab && lab.textContent) + '" for a wind drawn from ' + nm(f));
        return f;
      });
      const turn = diff(from[2], from[0]), veers = turn > 0;
      const word = q('[data-part="word"]').find(w => +w.getAttribute('data-side') === side);
      if (!word || !new RegExp(veers ? 'VEERS' : 'BACKS').test(word.textContent) || /VEERS.*BACKS|BACKS.*VEERS/.test(word.textContent))
        bad('panel ' + pi + ' side ' + side + ': the word does not match the turn drawn (' + (veers ? 'veers' : 'backs') + ')');
      /*  the rule: looking the way the low goes, its right is south when
          it goes east and north when it goes west  */
      const onRight = east ? !isNorth : isNorth;
      if (veers !== onRight)
        bad('panel ' + pi + ' side ' + side + ': on the low\'s ' + (onRight ? 'right' : 'left') + ' the drawn wind ' + (veers ? 'veers' : 'backs'));
      const seq = ptexts.find(t => t.textContent === nm(from[0]) + ', then ' + nm(from[1]) + ', then ' + nm(from[2]));
      if (!seq) bad('panel ' + pi + ' side ' + side + ': no caption naming the three winds drawn');
      const pass = q('[data-part="passes"]').find(w => +w.getAttribute('data-side') === side);
      if (!pass || pass.textContent !== 'the low passes to its ' + (isNorth ? 'south' : 'north'))
        bad('panel ' + pi + ' side ' + side + ': the wrong side for the low to pass');
    });
  });
  if (seen.east !== 1 || seen.west !== 1) bad('one panel going each way');
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
  await page.click('#les-list >> text=/Backing and veering/i');
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: checkFigure.toString() });
  ok('the veer lesson carries the two passing-low figures',
     await page.evaluate(() => document.querySelectorAll('#les-body .passdemo').length) === 2);
  ok('the north one comes first, after the northern words, and the south one after the southern',
     await page.evaluate(() => {
       const f = Array.from(document.querySelectorAll('#les-body .passdemo svg')).map(s => s.getAttribute('data-north'));
       return f.join() === '1,0';
     }));

  for (const mode of ['night', 'day']) {
    await page.evaluate(m => setMode(m), mode);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const figs = Array.from(document.querySelectorAll('#les-body .passdemo svg'));
      const cs = getComputedStyle(document.documentElement);
      const tk = (k) => cs.getPropertyValue(k).trim();
      const warn = tk('--warn') || tk('--bad') || '#e23a2c';
      const bb = s => { const b = s.getBBox(), v = s.getAttribute('viewBox').split(' ').map(Number);
                        return b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v[2] + 0.5 && b.y + b.height <= v[3] + 0.5; };
      const strokes = (s, p) => Array.from(s.querySelectorAll('[data-part="' + p + '"]')).map(e => e.getAttribute('stroke'));
      return figs.map((s, i) => ({
        faults: checkFigure(s, i === 0),
        box: bb(s),
        windCol: strokes(s, 'wind').every(c => c === tk('--accent')),
        spinCol: strokes(s, 'spin').every(c => c === warn),
        rule: !!Array.from(s.querySelectorAll('[data-part="rule"]')).find(t =>
          /on its right the wind veers, on its left it backs/.test(t.textContent))
      }));
    });
    r.forEach((f, i) => {
      const tag = mode + ', ' + (i === 0 ? 'north' : 'south') + ': ';
      ok(tag + 'the drawing agrees with itself, with Buys Ballot and with the rule', f.faults.length === 0, f.faults.join(' | '));
      ok(tag + 'the winds in the page\'s accent', f.windCol);
      ok(tag + 'the low\'s wind in the page\'s warning colour', f.spinCol);
      ok(tag + 'the rule is written under it', f.rule);
      ok(tag + 'nothing outside the box', f.box);
    });
    if (process.env.SHOTS) {
      const els = await page.$$('#les-body .passdemo');
      await els[0].screenshot({ path: process.env.SHOTS + '/pass-north-' + mode + '.png' });
      await els[1].screenshot({ path: process.env.SHOTS + '/pass-south-' + mode + '.png' });
    }
  }

  /*  the checker catches things: break one thing in a copy, expect a fault  */
  const planted = await page.evaluate(() => {
    const src = document.querySelectorAll('#les-body .passdemo svg')[0];
    const copy = () => src.cloneNode(true);
    const out = {};
    let c = copy();
    let w = c.querySelector('[data-part="word"]');
    w.textContent = /VEERS/.test(w.textContent) ? 'the wind BACKS' : 'the wind VEERS';
    out.word = checkFigure(c, true).length;
    c = copy();
    w = c.querySelector('[data-part="wind"][data-t="2"]');
    const x1 = w.getAttribute('x1'), y1 = w.getAttribute('y1');
    /*  the arrow turned through a right angle about its head  */
    const X2 = +w.getAttribute('x2'), Y2 = +w.getAttribute('y2'), dx = +x1 - X2, dy = +y1 - Y2;
    w.setAttribute('x1', X2 - dy); w.setAttribute('y1', Y2 + dx);
    out.arrow = checkFigure(c, true).length;
    c = copy();
    c.querySelectorAll('[data-part="spin"][data-t="1"]').forEach(s => {
      const a = [s.getAttribute('x1'), s.getAttribute('y1')];
      s.setAttribute('x1', s.getAttribute('x2')); s.setAttribute('y1', s.getAttribute('y2'));
      s.setAttribute('x2', a[0]); s.setAttribute('y2', a[1]);
    });
    out.spin = checkFigure(c, true).length;
    c = copy();
    const h = c.querySelector('[data-part="track-head"]');
    h.setAttribute('d', h.getAttribute('d').replace(/^M[\d.]+,/, 'M24,'));
    out.head = checkFigure(c, true).length;
    out.hemi = checkFigure(copy(), false).length;
    return out;
  });
  ok('planted: a word swapped is caught', planted.word > 0);
  ok('planted: one wind arrow turned is caught', planted.arrow > 0);
  ok('planted: one low spun the wrong way is caught', planted.spin > 0);
  ok('planted: the track\'s head turned round is caught', planted.head > 0);
  ok('planted: the north figure checked as the south is caught', planted.hemi > 0);

  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on the passing-low figures' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
