/*  Where the low lies: the compass card on "What the log says" (weather
    1.0.8; item 6 of the weather work before the launch), and what the
    report says of a wind that has backed or veered.

    Larry's rulings of 17 November 2026: APK, the low is a sector from
    straight off the arm Buys Ballot gives to 20 degrees forward of it;
    APO and APP, a shift is read by the side of the storm's track, the same
    words in both hemispheres.  Every claim is MEASURED OFF THE DRAWING and
    held to a working written here:

      1. the wind's arrow comes from the wind's bearing and blows through
         the centre, where you are;
      2. the low's wedge runs clockwise from its first edge to its second,
         20 degrees wide: in the north from wind+90 (your left arm) to
         wind+110; in the south from wind-110 to wind-90 (your right arm);
      3. the edge that is not the arm is the FORWARD one: 70 degrees from
         the way you face, where the arm is 90;
      4. the label and the words give the same two bearings, and the
         terminal text has them;
      5. a wind that has shifted more than 10 degrees is drawn dashed where
         it was, and the key says how far and which way; a smaller shift,
         or no earlier wind, draws nothing for it;
      6. the card says which hemisphere and which arm;
      7. the card is straight before its own words, and the sea's figure
         is still straight before the sea's;
      8. no wind direction in the latest observation: no card, no words;
      9. over a sweep of every tenth degree in both hemispheres nothing
         leaves the box and no label lies on another;
     10. night and day redraw in the page's colours; the wedge is filled,
         the wind solid and the wind before dashed, so form carries it;
     11. THE WORDS FOR A SHIFT: backed, "on the left of the storm's track";
         veered, "on the right"; the same in a southern log; and neither
         of the lines they replaced is said anywhere;
     12. THE LOW ITSELF (Larry, APR) is drawn out on the middle of its
         bearing, always at the one distance, with eight small arrows of
         its wind round it: anticlockwise in the north, clockwise in the
         south, each turned 15 degrees in toward the centre;
     13. ITS COURSE: when the wind has shifted more than 10 degrees AND the
         glass is falling or rising, a dashed fan from the low marks the
         quarter it is heading into, and a line says where it passes or
         that it is drawing away.  The quarter is worked here from first
         principles: on the left of the track the course is within the
         half turn clockwise of the bearing from the low to you, on the
         right anticlockwise; closing, within 90 degrees of that bearing;
         opening, more than 90 from it.  With a steady glass, or a shift
         of 10 degrees or less, there is no fan and the card says the
         course cannot be told yet.

      node weather-low.js   (needs the server on $PORT)  */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
let checks = 0, bad = 0;
function ok(what, cond, note) { checks++; if (!cond) { bad++; console.log('  FAIL ' + what + (note !== undefined ? ': ' + note : '')); } }
const norm = a => ((a % 360) + 360) % 360;
const adiff = (a, b) => { let d = norm(a - b); if (d > 180) d = 360 - d; return d; };
const d3 = x => String(x).padStart(3, '0');

/*  p2 is the later pressure: 1004.0 is a fall of 8.4 in six hours (falling
    fast), 1020.0 a rise, 1012.5 steady  */
const mk = (was, now, lat, extra, p2) => ['2026-08-30T06:00Z|nav|lat=' + lat + (was === null ? '' : '|wdir=' + was) + '|wspd=14|sea=3|~', '2026-08-30T06:00Z|wx|mslp=1012.4|~',
  '2026-08-30T12:00Z|nav|lat=' + lat + (now === null ? '' : '|wdir=' + now) + '|wspd=28|sea=4|~', '2026-08-30T12:00Z|wx|mslp=' + (p2 || '1004.0') + (extra || '') + '|~'];
/*  the quarter, worked here: mid the low's bearing from you, dw the shift
    (negative backed), trend +1 closing, -1 opening  */
const quarter = (mid, dw, trend) => { const t = mid + 180, left = dw < 0;
  const c0 = left ? (trend > 0 ? t : t + 90) : (trend > 0 ? t - 90 : t - 180);
  return { c0: norm(c0), c1: norm(c0 + 90), cpa: norm(c0 + 45 + (left ? 90 : -90)) }; };
const PT8 = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const pt8 = b => PT8[Math.round(norm(b) / 45) % 8];

async function open(browser, lines, mode) {
  const ctx = await browser.newContext({ viewport: { width: 744, height: 2000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.RECS !== 'undefined', { timeout: 15000 });
  await page.evaluate(([ls, mode]) => { lsSet('lon', '-72'); setMode(mode); return STORE.append(ls).then(() => reload()); }, [lines, mode || 'day']);
  await page.evaluate(() => go('what'));
  await page.waitForTimeout(150);
  return { page, ctx, errs };
}
const read = page => page.evaluate(() => {
  const box = document.getElementById('what-low'), out = document.getElementById('what-out');
  const res = { shown: !!box, out: out.innerText, term: document.getElementById('what-term').textContent };
  const sea = document.getElementById('what-sea');
  res.seaNext = sea && sea.nextElementSibling ? sea.nextElementSibling.textContent : '';
  if (!box) return res;
  const svg = box.querySelector('svg');
  const num = v => (v !== null && v !== '' && isFinite(+v)) ? +v : v;
  const A = e => { const o = { tag: e.tagName }; for (const a of e.attributes) o[a.name.replace('data-', '')] = num(a.value); o.text = e.textContent; return o; };
  const all = n => [...svg.querySelectorAll('[data-part="' + n + '"]')].map(A);
  res.c = { cx: +svg.dataset.cx, cy: +svg.dataset.cy, r: +svg.dataset.r, rl: +svg.dataset.rl };
  res.vb = svg.getAttribute('viewBox').split(' ').map(Number);
  ['wind', 'low', 'L', 'low-label', 'wind-label', 'was', 'hemi', 'key-was', 'key-wind', 'you', 'lowmark', 'spin', 'course',
   'course-arrow', 'key-course', 'key-pass', 'key-low'].forEach(n => { res[n] = all(n); });
  res.boxes = [...svg.querySelectorAll('text')].map(t => { const b = t.getBBox(); return { part: t.dataset.part || '', s: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height }; });
  res.nextText = box.nextElementSibling ? box.nextElementSibling.textContent : '';
  res.inOut = box.parentElement === out;
  res.label = svg.getAttribute('aria-label');
  const cs = getComputedStyle(document.documentElement), tk = k => cs.getPropertyValue(k).trim();
  res.tok = { text: tk('--text'), acc: tk('--accent'), warn: tk('--warn') || tk('--bad') };
  return res;
});
/*  the bearing of a point from the card's centre, degrees clockwise from north  */
const brg = (c, x, y) => norm(Math.atan2(x - c.cx, c.cy - y) * 180 / Math.PI);
const wedge = low => { const n = low.d.match(/-?[\d.]+/g).map(Number);      // M cx cy L x1 y1 A r r 0 0 sweep x2 y2
  return { x1: n[2], y1: n[3], sweep: n[8], large: n[7], x2: n[9], y2: n[10] }; };

function measure(r, wdir, north, tag) {
  const c = r.c, w = r.wind[0], g = wedge(r.low[0]);
  ok(tag + ' 1: the wind\'s arrow comes from ' + d3(wdir), adiff(brg(c, w.x1, w.y1), wdir) < 0.6, brg(c, w.x1, w.y1));
  ok(tag + ' 1: and blows through the centre to the far side', adiff(brg(c, w.x2, w.y2), wdir + 180) < 0.6);
  const lo = north ? norm(wdir + 90) : norm(wdir - 110), hi = north ? norm(wdir + 110) : norm(wdir - 90);
  ok(tag + ' 2: the wedge runs from ' + d3(lo) + ' to ' + d3(hi), adiff(brg(c, g.x1, g.y1), lo) < 0.6 && adiff(brg(c, g.x2, g.y2), hi) < 0.6,
     brg(c, g.x1, g.y1).toFixed(1) + ' to ' + brg(c, g.x2, g.y2).toFixed(1));
  ok(tag + ' 2: clockwise, the short way', g.sweep === 1 && g.large === 0);
  ok(tag + ' 2: and says so in its own numbers', r.low[0].lo === lo && r.low[0].hi === hi);
  const arm = north ? lo : hi, far = north ? hi : lo;
  ok(tag + ' 3: the far edge is the forward one', adiff(far, wdir + 180) === 70 && adiff(arm, wdir + 180) === 90 && r.low[0].arm === arm);
  ok(tag + ' 4: the label gives the two bearings', r['low-label'][0].text === d3(lo) + ' to ' + d3(hi), r['low-label'][0].text);
  ok(tag + ' 4: the words give the same two', r.out.includes('Back to the wind: the low is between ' + d3(lo) + ' and ' + d3(hi) + ' from you.'));
  ok(tag + ' 4: and the terminal text', r.term.includes('\n  Back to the wind: the low is between ' + d3(lo) + ' and ' + d3(hi) + ' from you.\n'));
  ok(tag + ' 6: it says which hemisphere and which arm', r.hemi[0].text === (north ? 'northern hemisphere: on your left' : 'southern hemisphere: on your right'));
  /* 12 */
  const m = r.lowmark[0], mid = norm(lo + 10), dist = Math.hypot(m.cx - c.cx, m.cy - c.cy);
  ok(tag + ' 12: the low is drawn on the middle of its bearing, ' + d3(mid), adiff(brg(c, m.cx, m.cy), mid) < 0.6, brg(c, m.cx, m.cy));
  ok(tag + ' 12: at the one distance, outside the ring', Math.abs(dist - c.rl) < 0.6 && c.rl > c.r + 40, dist);
  ok(tag + ' 12: with eight arrows of its wind round it', r.spin.length === 8);
  const lc = { cx: m.cx, cy: m.cy };
  let spinBad = 0;
  r.spin.forEach(a => {
    const mx = (a.x1 + a.x2) / 2, my = (a.y1 + a.y2) / 2;
    const heading = norm(Math.atan2(a.x2 - a.x1, a.y1 - a.y2) * 180 / Math.PI);
    if (adiff(brg(lc, mx, my), a.b) > 1.5) spinBad++;                      // where it says it is, round the low
    if (adiff(heading, north ? a.b - 105 : a.b + 105) > 1.5) spinBad++;    // going round the right way, 15 degrees in
  });
  ok(tag + ' 12: ' + (north ? 'anticlockwise' : 'clockwise') + ', each turned 15 degrees in toward the centre', spinBad === 0, spinBad);
  ok(tag + ' 12: the key names the low and its bearings', r['key-low'][0].text.includes('between ' + d3(lo) + ' and ' + d3(hi)));
}
/* 13: the course's fan, against the quarter worked here; trend 0 means none is expected */
function course(r, mid, dw, trend, tag) {
  if (!trend || Math.abs(dw) <= 10) {
    ok(tag + ' 13: no fan', r.course.length === 0 && r['course-arrow'].length === 0);
    ok(tag + ' 13: the card says the course cannot be told yet', /cannot be told from this log yet/.test(r['key-course'][0].text) && r['key-pass'].length === 0);
    ok(tag + ' 13: and the words say nothing of a course', !/Its course is/.test(r.out) && !/Its course is/.test(r.term));
    return;
  }
  const q = quarter(mid, dw, trend), f = r.course[0], m = r.lowmark[0], lc = { cx: m.cx, cy: m.cy };
  const n = f.d.match(/-?[\d.]+/g).map(Number);          // M lx ly L x1 y1 A r r 0 0 sweep x2 y2
  ok(tag + ' 13: the fan starts at the low', Math.hypot(n[0] - m.cx, n[1] - m.cy) < 0.6);
  ok(tag + ' 13: and runs from ' + d3(q.c0) + ' to ' + d3(q.c1) + ', clockwise', adiff(brg(lc, n[2], n[3]), q.c0) < 0.8 && adiff(brg(lc, n[9], n[10]), q.c1) < 0.8 && n[8] === 1,
     brg(lc, n[2], n[3]).toFixed(1) + ' to ' + brg(lc, n[9], n[10]).toFixed(1));
  ok(tag + ' 13: it says so in its own numbers', f.c0 === q.c0 && f.c1 === q.c1 && f.left === (dw < 0 ? 1 : 0) && f.closing === (trend > 0 ? 1 : 0));
  ok(tag + ' 13: the fan is dashed', !!f['stroke-dasharray']);
  const a = r['course-arrow'][0];
  ok(tag + ' 13: its arrow points down the middle of the quarter', adiff(norm(Math.atan2(a.x2 - a.x1, a.y1 - a.y2) * 180 / Math.PI), q.c0 + 45) < 1);
  ok(tag + ' 13: the words give the quarter', r.out.includes('Its course is somewhere between ' + d3(q.c0) + ' and ' + d3(q.c1) + '.') &&
     r.term.includes('\n  Its course is somewhere between ' + d3(q.c0) + ' and ' + d3(q.c1) + '.\n'));
  if (trend > 0) {
    ok(tag + ' 13: closing: it passes to your ' + pt8(q.cpa), r['key-pass'][0].text === 'If it holds its course, it passes to your ' + pt8(q.cpa) + '.' &&
       r.out.includes('If it holds that, it passes to your ' + pt8(q.cpa) + '.'), r['key-pass'][0].text);
    ok(tag + ' 13: and the working is said: ' + (dw < 0 ? 'backed, left' : 'veered, right') + '; falling, closing',
       new RegExp('the wind has ' + (dw < 0 ? 'backed' : 'veered') + ', so you are on the ' + (dw < 0 ? 'left' : 'right') + ' of its track; the glass\\s+is falling, so it is closing').test(r.out));
  } else {
    ok(tag + ' 13: opening: it is drawing away', r['key-pass'][0].text === 'It is drawing away.' && r.out.includes('It is drawing away.'));
    ok(tag + ' 13: and the working is said: rising, opening', /is rising, so it is opening/.test(r.out));
  }
  ok(tag + ' 13: and the caution', /A low can deepen without\s+moving, or fill where it lies: this is where to watch, not a fix\./.test(r.out));
}

(async () => {
  const browser = await chromium.launch();
  let o, r;

  /*  A: the report's own case.  North, the wind backed from 210 to 170.  */
  o = await open(browser, mk(210, 170, '41 14.0N', '|swht=3.0|swper=13|swdir=250'));
  r = await read(o.page);
  ok('A: the card is drawn, in the reasoning', r.shown && r.inOut);
  ok('A: no page errors', o.errs.length === 0, o.errs.join('; '));
  measure(r, 170, true, 'A');
  ok('A 2: so the low is between 260 and 280', r.low[0].lo === 260 && r.low[0].hi === 280);
  /* 5 */
  ok('A 5: the wind before is dashed, from 210', r.was.length === 1 && !!r.was[0]['stroke-dasharray'] && adiff(brg(r.c, r.was[0].x1, r.was[0].y1), 210) < 0.6);
  ok('A 5: the key says how far and which way', r['key-was'][0].text === 'it has backed 40 degrees from 210', r['key-was'][0] && r['key-was'][0].text);
  /* 13: backed and falling fast: on its left, closing */
  course(r, 270, -40, 1, 'A');
  ok('A 13: so it is heading between 090 and 180 and passes to the south-west', r.course[0].c0 === 90 && r.course[0].c1 === 180 && /south-west/.test(r['key-pass'][0].text));
  /* 7 */
  ok('A 7: the card comes straight before its own words', /^Back to the wind: the low is between 260 and 280 from you\.$/.test(r.nextText), r.nextText);
  ok('A 7: and the sea\'s figure straight before the sea\'s', /^The sea: at 28 kt/.test(r.seaNext), r.seaNext);
  ok('A 7: described for a reader who cannot see it', /wind is from 170/.test(r.label) && /between 260 and 280/.test(r.label) && /left/.test(r.label) &&
     /course is somewhere between 090 and 180/.test(r.label) && /passes to your south-west/.test(r.label));
  /* 10 */
  ok('A 10: day: the wind in the page\'s accent, the low in its warning colour', r.wind[0].stroke === r.tok.acc && r.low[0].stroke === r.tok.warn && r.L[0].fill === r.tok.warn);
  ok('A 10: the wedge is filled, the wind solid', r.low[0].fill === r.tok.warn && +r.low[0]['fill-opacity'] > 0 && !r.wind[0]['stroke-dasharray']);
  const dayAcc = r.tok.acc;
  await o.page.evaluate(() => setMode('night')); await o.page.waitForTimeout(150);
  r = await read(o.page);
  ok('A 10: night redraws in the night colours', r.wind[0].stroke === r.tok.acc && r.low[0].stroke === r.tok.warn && r.tok.acc !== dayAcc);
  ok('A 10: at night form still carries it', +r.low[0]['fill-opacity'] > 0 && !r.wind[0]['stroke-dasharray'] && !!r.was[0]['stroke-dasharray'] && !!r.course[0]['stroke-dasharray']);
  /* 11 */
  ok('A 11: backed: on the left of the storm\'s track', /if the wind goes on backing, you are on the left of the storm's\s+track, looking the way it is going: it passes south of you if it\s+is going east, north of you if it is going west\./.test(r.out), r.out.slice(0, 600));
  ok('A 11: the old lines are gone', !/puts the centre/.test(r.out + r.term) && !/the sense of all of this reverses/.test(r.out + r.term) && !/has passed to the north of you/.test(r.out + r.term));
  await o.ctx.close();

  /*  B: the same wind and shift, south of the equator  */
  o = await open(browser, mk(210, 170, '41 14.0S'));
  r = await read(o.page);
  measure(r, 170, false, 'B');
  ok('B 2: in the south the low is between 060 and 080', r.low[0].lo === 60 && r.low[0].hi === 80);
  ok('B 11: the same words for a backing wind in the south', /if the wind goes on backing, you are on the left of the storm's/.test(r.out) && !/the sense of all of this reverses/.test(r.out + r.term));
  course(r, 70, -40, 1, 'B');
  ok('B 13: in the south, heading between 250 and 340, passing to the north-east', r.course[0].c0 === 250 && r.course[0].c1 === 340 && /north-east/.test(r['key-pass'][0].text));
  await o.ctx.close();

  /*  C: veered, through north  */
  o = await open(browser, mk(350, 5, '50 00.0N', '', '1020.0'));
  r = await read(o.page);
  measure(r, 5, true, 'C');
  ok('C 5: the key says veered 15 from 350', r['key-was'][0].text === 'it has veered 15 degrees from 350');
  /* 13: veered and rising: on its right, opening */
  course(r, 105, 15, -1, 'C');
  ok('C 11: veered: on the right of the storm\'s track', /if the wind goes on veering, you are on the right of the storm's\s+track, looking the way it is going: it passes north of you if it\s+is going east, south of you if it is going west\./.test(r.out));
  await o.ctx.close();

  /*  D: a shift of 3 degrees, and E: no earlier wind: neither is drawn as a shift  */
  o = await open(browser, mk(265, 268, '10 00.0N'));
  r = await read(o.page);
  measure(r, 268, true, 'D');
  ok('D 2: the wedge runs through north, 358 to 018', r.low[0].lo === 358 && r.low[0].hi === 18);
  ok('D 5: a shift of 3 degrees draws no wind before', r.was.length === 0 && r['key-was'].length === 0);
  course(r, 8, 3, 0, 'D');
  ok('D 11: and says nothing of the storm\'s track', !/storm's/.test(r.out));
  await o.ctx.close();
  o = await open(browser, mk(null, 90, '20 00.0S'));
  r = await read(o.page);
  measure(r, 90, false, 'E');
  ok('E 5: no earlier wind: no wind before', r.was.length === 0);
  course(r, 350, 0, 0, 'E');
  await o.ctx.close();
  /*  F: veered and falling: on its right, closing.  G: backed and rising.  H: a shift with a steady glass.  */
  o = await open(browser, mk(100, 180, '50 00.0N'));
  r = await read(o.page);
  measure(r, 180, true, 'F');
  course(r, 280, 80, 1, 'F');
  ok('F 13: veered and falling: between 010 and 100, passing to the north-west', r.course[0].c0 === 10 && r.course[0].c1 === 100 && /north-west/.test(r['key-pass'][0].text));
  await o.ctx.close();
  o = await open(browser, mk(90, 40, '50 00.0S', '', '1020.0'));
  r = await read(o.page);
  measure(r, 40, false, 'G');
  course(r, 300, -50, -1, 'G');
  await o.ctx.close();
  o = await open(browser, mk(300, 250, '50 00.0N', '', '1012.5'));
  r = await read(o.page);
  measure(r, 250, true, 'H');
  ok('H 13: a shift with a steady glass is still drawn as a shift', r.was.length === 1);
  course(r, 350, -50, 0, 'H');
  await o.ctx.close();

  /*  8: no wind direction in the latest observation  */
  o = await open(browser, mk(210, null, '41 14.0N'));
  r = await read(o.page);
  ok('8: no wind direction, no card', r.shown === false);
  ok('8: and no words about the low', !/Back to the wind/.test(r.out) && !/Back to the wind/.test(r.term));
  await o.ctx.close();

  /*  9: the sweep.  Each wind is logged after one 40 degrees round from it,
      backed and veered by turns, with the glass falling, rising and steady
      by turns, so the fan is drawn in each of its four quarters and not at
      all.  */
  let swept = 0, over = 0, outs = 0, wrong = 0, c = 0, fans = 0, fanWrong = 0;
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const stamp = () => new Date(Date.UTC(2026, 8, 1, 0, 0) + (c++) * 3600000).toISOString().slice(0, 16) + 'Z';
  for (const lat of ['45 00.0N', '45 00.0S']) {
    o = await open(browser, mk(0, 0, lat));
    for (let wd = 0; wd < 360; wd += 10) {
      const t0 = stamp(), ts = stamp(), k = wd / 10, dwv = k % 2 ? 40 : -40, trend = [1, -1, 0][k % 3];
      await o.page.evaluate(ls => STORE.append(ls).then(() => reload()),
        [t0 + '|nav|lat=' + lat + '|wdir=' + norm(wd - dwv) + '|wspd=20|~', t0 + '|wx|mslp=1010.0|~',
         ts + '|nav|lat=' + lat + '|wdir=' + wd + '|wspd=20|~', ts + '|wx|mslp=' + (trend > 0 ? '1008.0' : trend < 0 ? '1012.0' : '1010.1') + '|~']);
      await o.page.evaluate(() => go('what'));
      r = await read(o.page);
      if (!r.shown) { outs++; continue; }
      swept++;
      const north = lat.endsWith('N'), g = wedge(r.low[0]);
      const lo = north ? norm(wd + 90) : norm(wd - 110), hi = north ? norm(wd + 110) : norm(wd - 90);
      if (adiff(brg(r.c, g.x1, g.y1), lo) > 0.6 || adiff(brg(r.c, g.x2, g.y2), hi) > 0.6 || adiff(brg(r.c, r.wind[0].x1, r.wind[0].y1), wd) > 0.6) { wrong++; console.log('    wrong at ' + wd + ' ' + lat); }
      if (trend) { fans++; const q = quarter(norm((lo + hi + (hi < lo ? 360 : 0)) / 2), dwv, trend);
        if (!r.course[0] || r.course[0].c0 !== q.c0 || r.course[0].c1 !== q.c1) { fanWrong++; console.log('    fan wrong at ' + wd + ' ' + lat + ': ' + JSON.stringify(r.course[0] && [r.course[0].c0, r.course[0].c1]) + ' want ' + q.c0 + ',' + q.c1); } }
      else if (r.course.length) { fanWrong++; console.log('    a fan with a steady glass at ' + wd); }
      const labs = r.boxes.filter(b => b.part === 'wind-label' || b.part === 'low-label' || b.part === 'hemi' || b.s === 'Where the low lies' || /^[NESW]$/.test(b.s));
      for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (hit(labs[i], labs[j])) { over++; console.log('    overlap at ' + wd + ' ' + lat + ': ' + labs[i].s + ' / ' + labs[j].s); }
      r.boxes.forEach(b => { if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > r.vb[2] + 0.5 || b.y + b.h > r.vb[3] + 0.5) { outs++; console.log('    outside the box at ' + wd + ': ' + b.s); } });
    }
    await o.ctx.close();
  }
  ok('9: every tenth degree, both hemispheres, was drawn', swept === 72, swept);
  ok('9: the wind and the wedge are on their bearings every time', wrong === 0, wrong);
  ok('9: no label lies on another, or on a compass letter', over === 0, over);
  ok('9: nothing leaves the box', outs === 0, outs);
  ok('13: the fan is the quarter worked here in every one of the sweep (' + fans + ' fans), and absent with a steady glass', fanWrong === 0 && fans === 48, fanWrong + ' of ' + fans);

  await browser.close();
  console.log(checks + ' checks on where the low lies, measured off the drawing' + (bad ? ', ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})();
