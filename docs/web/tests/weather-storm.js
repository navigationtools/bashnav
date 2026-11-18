/*  A reported storm (I20, weather 1.0.11; Larry, ATZ): the page against
    the awk, and both against arithmetic of their own.

    1. THE WORDS, character for character: CHART.stormReport rendered as
       the terminal does against `weather` cmd=storm, over a grid of
       advisories (every eighth of the compass for the centre and for its
       movement, near and far, old and new, with and without a 34-knot
       radius, a course or a wind), the forms a position can be typed in,
       the dateline, the south (worked since weather 1.0.15, Larry's TAWG:
       a mirror of the whole grid at 21.6 S), and every refusal.

    2. THE GEOMETRY, worked again here and not taken from either program:
       the closest approach found by stepping time a hundredth of an hour
       at a time, and the side of the track by the sign of a cross product,
       held to what the report says.  Since weather 1.0.15 (TAWG, the
       crew's shared words) also: the dangerous side is the right of the
       track in the north and the left in the south; the shift to expect
       is a veer on the right and a back on the left; and the band the
       wind puts the centre in is 110 ahead of the storm and 120 to 135
       behind it, to the right in the north and the left in the south, a
       point or two less (22.5 degrees) allowed on its near edge.

    3. THE PICTURE, read back off the drawing (and its words off it, since
       weather 1.0.12: every callout outside the plot, clear of the others,
       with a leader line to its mark): the low with its own wind
       going round it, anticlockwise in the north and clockwise in the
       south, turned in (Buys Ballot), the
       track drawn the way the storm moves, the centre moved on from where
       it was reported along that track, the wind's band as section 2
       works it, the closest approach as long as the report says.  Night
       and day; nothing outside the box.  Four planted faults, each caught.

      node weather-storm.js   (needs the server on $PORT)  */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8090) + '/weather/';
const REPO = path.resolve(__dirname, '..', '..', '..');
const W = path.resolve(__dirname, '..');
global.LOG = require(path.join(W, 'deck-log', 'log.js'));
global.WX = require(path.join(W, 'weather', 'wx.js'));
const CHART = require(path.join(W, 'weather', 'chart.js'));

let checks = 0, bad = 0;
function ok(what, cond, note) {
  checks++;
  if (!cond) { bad++; console.log('  FAIL ' + what + (note ? ': ' + note : '')); }
}

/* ---- 1. the words ------------------------------------------------------ */
const ENG = ['log.awk', 'colour.awk'].map(f => REPO + '/src/common/' + f)
  .concat(['grid.awk', 'wx.awk', 'score.awk', 'chart.awk', 'teach.awk', 'screens.awk'].map(f => REPO + '/src/weather/' + f));
const AWK = process.env.AWK || 'mawk';
const KEYS = ['age', 'clat', 'clon', 'mdir', 'mkn', 'r34', 'blat', 'blon', 'bcse', 'bkn', 'wind'];
function awk(c) {
  const a = ['-v', 'cmode=plain', '-v', 'cmd=storm', '-v', 'LOG=/dev/null'];
  KEYS.forEach(k => a.push('-v', k + '=' + (c[k] === undefined ? '' : c[k])));
  ENG.forEach(f => a.push('-f', f));
  return execFileSync(AWK, a, { input: '', encoding: 'utf8' });
}
const cases = [];
const base = { age: 4, blat: '21.6N', blon: '63.2W' };
const ll = (lat, lon) => [(lat < 0 ? (-lat).toFixed(2) + 'S' : lat.toFixed(2) + 'N'), (lon < 0 ? (-lon).toFixed(2) + 'W' : lon.toFixed(2) + 'E')];
let n = 0;
for (let b = 0; b < 360; b += 45) for (const d of [80, 330]) for (let m = 0; m < 360; m += 45) {
  n++;
  const lat = 21.6 + d / 60 * Math.cos(b * Math.PI / 180), lon = -63.2 + d / 60 * Math.sin(b * Math.PI / 180) / Math.cos(21.6 * Math.PI / 180);
  const [cl, co] = ll(lat, lon);
  cases.push(Object.assign({}, base, { clat: cl, clon: co, mdir: m, mkn: [12, 0, 5.5][n % 3],
    age: [4, 0, 12.5][n % 3], r34: ['', 120, 60][n % 3], bcse: ['', 270, 45][(n >> 1) % 3], bkn: ['', 6, 0][(n >> 1) % 3],
    wind: ['', 48, 200, 315][n % 4] }));
}
/*  THE SOUTH (weather 1.0.15): the same grid mirrored to 21.6 S, the boat
    there, so every case above has a southern twin  */
const north = cases.length;
for (let i = 0; i < north; i++) {
  const c = cases[i], lat = -(+String(c.clat).replace(/[NS]$/, '')), lon = c.clon;
  cases.push(Object.assign({}, c, { clat: (-lat).toFixed(2) + 'S', blat: '21.6S', clon: lon }));
}
/*  the forms a position can take, the dateline, the south, and the refusals  */
cases.push({ age: 4, clat: 17.2, clon: -62.4, mdir: 330, mkn: 12, r34: 120, blat: 21.6, blon: -63.2, bcse: 270, bkn: 6, wind: 65 });
cases.push({ age: 4, clat: '17.2 n', clon: '62.4 w', mdir: 330, mkn: 12, blat: '+21.6', blon: '-63.2' });
cases.push({ age: 2, clat: '15N', clon: '179.5E', mdir: 270, mkn: 10, blat: '16N', blon: '179.5W', wind: 90 });
cases.push({ age: 2, clat: '15S', clon: '160E', mdir: 200, mkn: 10, blat: '16S', blon: '161E' });
cases.push({ age: 2, clat: '15S', clon: '160E', mdir: 200, mkn: 10, blat: '16S', blon: '161E', wind: 60 });
cases.push({ age: 2, clat: '2S', clon: '160E', mdir: 200, mkn: 10, blat: '1N', blon: '161E' });
cases.push({ age: 2, clat: '2N', clon: '160E', mdir: 200, mkn: 10, blat: '1S', blon: '161E', wind: 90 });
cases.push({});
cases.push({ age: 4, clat: '17.2N' });
cases.push({ age: -1, clat: 17, clon: -62, mdir: 0, mkn: 10, blat: 20, blon: -62 });
cases.push({ age: 'x', clat: 17, clon: -62, mdir: 0, mkn: 10, blat: 20, blon: -62 });
cases.push({ age: 1, clat: 95, clon: -62, mdir: 0, mkn: 10, blat: 20, blon: -62 });
cases.push({ age: 1, clat: 17, clon: '190E', mdir: 0, mkn: 10, blat: 20, blon: -62 });
cases.push({ age: 1, clat: 17, clon: -62, mdir: 360, mkn: 10, blat: 20, blon: -62 });
cases.push({ age: 1, clat: 17, clon: -62, mdir: 10, mkn: -2, blat: 20, blon: -62 });
cases.push({ age: 1, clat: 17, clon: -62, mdir: 10, mkn: 2, r34: -5, blat: 20, blon: -62 });
cases.push({ age: 1, clat: 17, clon: -62, mdir: 10, mkn: 2, blat: 20, blon: -62, bcse: 400 });
cases.push({ age: 1, clat: 17, clon: -62, mdir: 10, mkn: 2, blat: 20, blon: -62, wind: 'NE' });
cases.push({ age: 1, clat: 17, clon: -62, mdir: 10, mkn: 6, blat: 20, blon: -62, bcse: 10, bkn: 6 });
let diff = 0, first = '';
const parsed = [];
cases.forEach(c => {
  const want = awk(c), items = CHART.stormReport(c), got = CHART.stormTerminal(items);
  if (got !== want) {
    diff++;
    if (!first) {
      const a = got.split('\n'), b = want.split('\n'), i = a.findIndex((l, k) => l !== b[k]);
      first = JSON.stringify(c) + '\n    js  |' + a[i] + '|\n    awk |' + b[i] + '|';
    }
  }
  if (items.geo) parsed.push({ c, items, text: want });
});
ok(cases.length + ' advisories: the page says what the terminal says, character for character (' + AWK + ')', diff === 0, first);
ok('most of them are worked, not refused', parsed.length >= 240, String(parsed.length));
ok('a storm and a boat across the equator from each other are refused', /opposite sides of the equator/.test(awk({ age: 2, clat: '2S', clon: '160E', mdir: 200, mkn: 10, blat: '1N', blon: '161E' })));

/* ---- 2. the geometry, again ------------------------------------------- */
function deg(s, lim) {
  let t = String(s).replace(/\s/g, ''), sg = 1;
  if (/[NE]$/i.test(t)) t = t.slice(0, -1); else if (/[SW]$/i.test(t)) { t = t.slice(0, -1); sg = -1; }
  return sg * +t;
}
let gbad = 0, gfirst = '', nCpa = 0;
parsed.forEach(({ c, text }) => {
  const by = deg(c.blat), bx = deg(c.blon), cy = deg(c.clat), cx = deg(c.clon);
  const k = Math.cos((cy + by) / 2 * Math.PI / 180);
  let dl = cx - bx; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
  const age = +c.age, md = +c.mdir, mk = +c.mkn, cs = c.bcse === '' || c.bcse === undefined ? 0 : +c.bcse, bk = c.bkn === '' || c.bkn === undefined ? 0 : +c.bkn;
  const C = t => [dl * 60 * k + mk * Math.sin(md * Math.PI / 180) * (age + t), (cy - by) * 60 + mk * Math.cos(md * Math.PI / 180) * (age + t)];
  const B = t => [bk * Math.sin(cs * Math.PI / 180) * t, bk * Math.cos(cs * Math.PI / 180) * t];
  /*  the closest approach, by stepping time  */
  let best = Infinity, bt = 0;
  for (let t = 0; t <= 400; t += 0.01) { const p = C(t), q = B(t), d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < best) { best = d; bt = t; } }
  const m = text.match(/comes closest in (\d+) hours: (\d+) nm/);
  if (m) {
    nCpa++;
    if (Math.abs(+m[1] - bt) > 1 || Math.abs(+m[2] - best) > 1) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ' says ' + m[1] + ' h ' + m[2] + ' nm; stepping finds ' + bt.toFixed(2) + ' h ' + best.toFixed(1) + ' nm'; }
  } else if (/passes over you in (\d+) hours/.test(text)) {
    nCpa++;
    const h = +text.match(/passes over you in (\d+) hours/)[1];
    if (Math.abs(h - bt) > 1 || best > 1) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ' says it passes over at ' + h + ' h; stepping finds ' + bt.toFixed(2) + ' h ' + best.toFixed(1) + ' nm'; }
  } else if (/drawing away/.test(text)) {
    if (bt > 0.02) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ' says drawing away; stepping finds the closest at ' + bt.toFixed(2) + ' h'; }
  }
  /*  the side, by a cross product: the boat from the centre now, against the movement  */
  if (mk > 0) {
    const p = C(0), cr = Math.sin(md * Math.PI / 180) * (-p[1]) - Math.cos(md * Math.PI / 180) * (-p[0]);
    const says = /on the right of its track/.test(text) ? 1 : /on the left of its track/.test(text) ? -1 : /on its track/.test(text) ? 0 : 9;
    /*  a positive cross (movement x boat) puts the boat on the left, looking along the movement;
        within half a mile of the track it is on it, neither side  */
    const exp = Math.abs(cr) < 0.5 ? 0 : (cr < 0 ? 1 : -1);
    if (says !== exp) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ': the side is wrong'; }
    /*  the shared words (TAWG): the right is dangerous in the north, the
        left in the south; a veer on the right, a back on the left  */
    const south = cy < 0;
    if (exp !== 0) {
      const danger = (exp === 1) !== south;
      if (danger !== /: the dangerous side\./.test(text) || danger === /: the navigable side\./.test(text)) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ': the dangerous side is wrong'; }
      if (!new RegExp('expect yours to ' + (exp === 1 ? 'veer' : 'back') + ' as it passes').test(text)) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ': the shift to expect is wrong'; }
    }
    /*  the band from the wind: ahead of it (the boat from the centre along
        its movement) 87.5 to 110, behind it 97.5 to 135; to the right of
        the wind in the north, the left in the south  */
    const wb = text.match(/puts the centre between (\d+) and (\d+)\./);
    if (c.wind !== '' && c.wind !== undefined) {
      const along = -(p[0] * Math.sin(md * Math.PI / 180) + p[1] * Math.cos(md * Math.PI / 180));
      const lo = along > 0 ? 87.5 : 97.5, hi = along > 0 ? 110 : 135, w = +c.wind;
      const elo = south ? w - hi : w + lo, ehi = south ? w - lo : w + hi;
      const nrm = x => Math.trunc(((x % 360) + 360) % 360 + 0.5) % 360;
      if (!wb || +wb[1] !== nrm(elo) || +wb[2] !== nrm(ehi)) { gbad++; if (!gfirst) gfirst = JSON.stringify(c) + ': the band is ' + (wb ? wb[1] + ' to ' + wb[2] : 'missing') + ', the rule gives ' + nrm(elo) + ' to ' + nrm(ehi); }
    }
  }
});
ok(parsed.length + ' worked advisories: the closest approach, the side, the dangerous side, the shift and the band, against arithmetic of the test\'s own (' + nCpa + ' approaches)', gbad === 0, gfirst);

/* ---- 3. the picture ---------------------------------------------------- */
function checkStorm(svg, want) {
  const F = [], bad = s => F.push(s);
  const num = (e, a) => +e.getAttribute(a);
  const norm = d => ((d % 360) + 360) % 360;
  const diff = (a, b) => ((a - b + 540) % 360) - 180;
  const brg = (dx, dy) => norm(Math.atan2(dx, -dy) * 180 / Math.PI);
  const q = s => Array.from(svg.querySelectorAll(s));
  const K = +svg.getAttribute('data-k'), cx = +svg.getAttribute('data-cx'), cy = +svg.getAttribute('data-cy');
  const low = svg.querySelector('[data-part="low"]');
  if (!low) { bad('no low'); return F; }
  const LX = num(low, 'cx'), LY = num(low, 'cy');
  const spins = q('[data-part="spin"]');
  if (spins.length !== 8) bad('eight arrows of the low\'s own wind, found ' + spins.length);
  spins.forEach(s => {
    const go = brg(num(s, 'x2') - num(s, 'x1'), num(s, 'y2') - num(s, 'y1'));
    const toLow = brg(LX - (num(s, 'x1') + num(s, 'x2')) / 2, LY - (num(s, 'y1') + num(s, 'y2')) / 2);
    const rel = diff(toLow, go);
    if (want.south ? !(rel > 60 && rel < 90) : !(rel < -60 && rel > -90))
      bad('an arrow of the low\'s wind is not round it ' + (want.south ? 'clockwise' : 'anticlockwise') + ' and turned in (' + rel.toFixed(0) + ')');
  });
  /*  the centre now, against the report's bearing and distance  */
  const b = brg(LX - cx, LY - cy), d = Math.hypot(LX - cx, LY - cy) / K;
  if (Math.abs(diff(b, want.brg)) > 1 || Math.abs(d - want.dist) > 1) bad('the low is drawn at ' + b.toFixed(0) + ' ' + d.toFixed(0) + ' nm, the report says ' + want.brg + ' ' + want.dist);
  /*  moved on from where it was reported, along its track  */
  const rp = svg.querySelector('[data-part="reported"]');
  if (want.mkn > 0 && want.age > 0) {
    const mv = brg(LX - num(rp, 'cx'), LY - num(rp, 'cy'));
    if (Math.abs(diff(mv, want.mdir)) > 2) bad('the centre was moved on along ' + mv.toFixed(0) + ', not its movement ' + want.mdir);
    const tr = svg.querySelector('[data-part="track"]');
    const td = brg(num(tr, 'x2') - num(tr, 'x1'), num(tr, 'y2') - num(tr, 'y1'));
    if (Math.abs(diff(td, want.mdir)) > 2) bad('the track is drawn toward ' + td.toFixed(0) + ', not ' + want.mdir);
  }
  /*  the wind's band  */
  const band = svg.querySelector('[data-part="band"]');
  if (want.wind !== null) {
    if (!band) bad('no band from the wind');
    else {
      const m = band.getAttribute('d').match(/^M([\d.]+),([\d.]+)L([\d.]+),([\d.]+)A[\d.]+,[\d.]+ 0 0 1 ([\d.]+),([\d.]+)Z$/);
      const lo = brg(+m[3] - +m[1], +m[4] - +m[2]), hi = brg(+m[5] - +m[1], +m[6] - +m[2]);
      if (Math.abs(diff(lo, want.band[0])) > 1 || Math.abs(diff(hi, want.band[1])) > 1) bad('the band runs ' + lo.toFixed(0) + ' to ' + hi.toFixed(0) + ', not ' + want.band[0].toFixed(1) + ' to ' + want.band[1].toFixed(1));
    }
  }
  /*  the closest approach  */
  const cpa = svg.querySelector('[data-part="cpa"]');
  if (want.cpa !== null) {
    if (!cpa) bad('no closest approach drawn');
    else {
      const L = Math.hypot(num(cpa, 'x2') - num(cpa, 'x1'), num(cpa, 'y2') - num(cpa, 'y1')) / K;
      if (Math.abs(L - want.cpa) > 1) bad('the closest approach is drawn ' + L.toFixed(1) + ' nm, the report says ' + want.cpa);
    }
  }
  return F;
}
/*  THE WORDS ARE NOT ON THE PICTURE (weather 1.0.12; Larry: "the text
    underneath the cyclone is all on top of it").  Every callout lies
    outside the plot's circle and clear of every other, and has a leader
    line to its mark.  getBBox needs the drawing laid out, so this runs on
    the page's own svg.  */
function checkCallouts(svg) {
  const F = [];
  const cx = +svg.getAttribute('data-cx'), cy = +svg.getAttribute('data-cy'), R = +svg.getAttribute('data-r');
  const cs = Array.from(svg.querySelectorAll('[data-part="callout"]'));
  if (cs.length < 5) F.push('fewer than five callouts (' + cs.length + ')');
  const boxes = cs.map(g => {
    const b = g.getBBox(), m = g.getCTM && g.transform && g.transform.baseVal.numberOfItems ? g.transform.baseVal.consolidate().matrix : null;
    const dx = m ? m.e : 0, dy = m ? m.f : 0;
    return { x: b.x + dx, y: b.y + dy, w: b.width, h: b.height, f: g.getAttribute('data-for') };
  });
  boxes.forEach(b => {
    const nx = Math.max(b.x, Math.min(cx, b.x + b.w)), ny = Math.max(b.y, Math.min(cy, b.y + b.h));
    if (Math.hypot(nx - cx, ny - cy) < R + 2) F.push('the callout for ' + b.f + ' lies on the plot');
    if (!svg.querySelector('[data-part="leader"][data-for="' + b.f + '"]')) F.push('the callout for ' + b.f + ' has no leader line');
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) F.push('the callouts for ' + a.f + ' and ' + b.f + ' overlap');
  }
  return F;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 744, height: 2400 }, timezoneId: 'UTC' });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 20000 });
  await page.click('[data-go="storm"]');
  await page.waitForTimeout(200);
  await page.addScriptTag({ content: checkStorm.toString() });
  await page.addScriptTag({ content: checkCallouts.toString() });
  const sets = [
    { age: 4, clat: '17.2N', clon: '62.4W', mdir: 330, mkn: 12, r34: 120, blat: '21.6N', blon: '63.2W', bcse: 270, bkn: 6, wind: 65 },
    { age: 6, clat: '30N', clon: '70W', mdir: 45, mkn: 15, r34: '', blat: '31N', blon: '72W', bcse: '', bkn: '', wind: 300 },
    { age: 0, clat: '25N', clon: '80W', mdir: 290, mkn: 8, r34: 90, blat: '24N', blon: '82W', bcse: 90, bkn: 5, wind: '' },
    { age: 2, clat: '15S', clon: '160E', mdir: 200, mkn: 10, r34: 60, blat: '16S', blon: '161E', bcse: '', bkn: '', wind: 60 }
  ];
  /*  the band the picture should draw, worked here from the test's own
      geometry: ahead of the storm or behind it, north or south  */
  const bandOf = (s, G) => {
    if (s.wind === '') return null;
    const md = +s.mdir * Math.PI / 180, along = -(G.now[0] * Math.sin(md) + G.now[1] * Math.cos(md));
    const lo = +s.mkn > 0 && along > 0 ? 87.5 : +s.mkn > 0 ? 97.5 : 87.5, hi = +s.mkn > 0 && along > 0 ? 110 : 135, w = +s.wind;
    return /S$/.test(s.clat) ? [w - hi, w - lo] : [w + lo, w + hi];
  };
  for (const s of sets) {
    for (const k of KEYS) await page.fill('#s-' + k, String(s[k]));
    await page.waitForTimeout(150);
    const items = CHART.stormReport(s), G = items.geo;
    const want = { brg: Math.round(((G.brg % 360) + 360) % 360), dist: Math.round(G.dist), mdir: +s.mdir, mkn: +s.mkn, age: +s.age,
                   wind: s.wind === '' ? null : +s.wind, cpa: G.cpa ? G.cpa.d : null,
                   south: /S$/.test(s.clat), band: bandOf(s, G) };
    for (const mode of ['night', 'day']) {
      await page.evaluate(m => setMode(m), mode);
      await page.waitForTimeout(120);
      const r = await page.evaluate(w => {
        const s = document.querySelector('#storm-fig svg');
        const b = s.getBBox(), v = s.getAttribute('viewBox').split(' ').map(Number);
        return { faults: checkStorm(s, w).concat(checkCallouts(s)), box: b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= v[2] + 0.5 && b.y + b.height <= v[3] + 0.5,
                 text: document.getElementById('storm-term').textContent };
      }, want);
      const tag = mode + ', ' + s.clat + ' ' + s.clon + ': ';
      ok(tag + 'the picture agrees with the report and with Buys Ballot', r.faults.length === 0, r.faults.join(' | '));
      ok(tag + 'nothing outside the box', r.box);
      ok(tag + 'the terminal view is the awk\'s', r.text === awk(s));
    }
  }
  /*  planted faults, on copies of the last picture  */
  const S = sets[0], G0 = CHART.stormReport(S).geo;
  for (const k of KEYS) await page.fill('#s-' + k, String(S[k]));
  await page.waitForTimeout(150);
  const want0 = { brg: Math.round(((G0.brg % 360) + 360) % 360), dist: Math.round(G0.dist), mdir: S.mdir, mkn: S.mkn, age: S.age, wind: S.wind, cpa: G0.cpa.d,
                  south: false, band: bandOf(S, G0) };
  const planted = await page.evaluate(w => {
    const src = document.querySelector('#storm-fig svg'), copy = () => src.cloneNode(true), out = {};
    const flip = e => { const a = [e.getAttribute('x1'), e.getAttribute('y1')]; e.setAttribute('x1', e.getAttribute('x2')); e.setAttribute('y1', e.getAttribute('y2')); e.setAttribute('x2', a[0]); e.setAttribute('y2', a[1]); };
    let c = copy(); c.querySelectorAll('[data-part="spin"]').forEach(flip); out.spin = checkStorm(c, w).length;
    c = copy(); flip(c.querySelector('[data-part="track"]')); out.track = checkStorm(c, w).length;
    c = copy(); const l = c.querySelector('[data-part="low"]'); l.setAttribute('cx', +l.getAttribute('cx') + 30); out.low = checkStorm(c, w).length;
    c = copy(); const p = c.querySelector('[data-part="cpa"]'); p.setAttribute('x2', +p.getAttribute('x2') + 40); out.cpa = checkStorm(c, w).length;
    return out;
  }, want0);
  ok('planted: the low\'s wind turned the wrong way is caught', planted.spin > 0);
  ok('planted: the track drawn backwards is caught', planted.track > 0);
  ok('planted: the low drawn in the wrong place is caught', planted.low > 0);
  ok('planted: the closest approach drawn too long is caught', planted.cpa > 0);
  /*  and the callouts' check, on the page's own drawing, put back after  */
  const plantedC = await page.evaluate(() => {
    const s = document.querySelector('#storm-fig svg'), cs = s.querySelectorAll('[data-part="callout"]'), out = {};
    const cx = +s.getAttribute('data-cx'), cy = +s.getAttribute('data-cy');
    const b0 = cs[0].getBBox();
    cs[0].setAttribute('transform', 'translate(' + (cx - b0.x - b0.width / 2) + ',' + (cy - b0.y - b0.height / 2) + ')');
    out.onplot = checkCallouts(s).length; cs[0].removeAttribute('transform');
    const b1 = cs[1].getBBox();
    cs[0].setAttribute('transform', 'translate(' + (b1.x - b0.x) + ',' + (b1.y - b0.y) + ')');
    out.overlap = checkCallouts(s).length; cs[0].removeAttribute('transform');
    out.clean = checkCallouts(s).length;
    return out;
  });
  ok('planted: a callout moved onto the plot is caught', plantedC.onplot > 0);
  ok('planted: a callout moved onto another is caught', plantedC.overlap > 0);
  ok('and put back, the callouts are clean again', plantedC.clean === 0);
  ok('no script errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(checks + ' checks on a reported storm' + (bad ? ': ' + bad + ' FAILED' : ', all hold'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
