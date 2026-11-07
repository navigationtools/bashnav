/* End-to-end: drive the page and check what it SHOWS against the awk
   tool's own output.  Module-level diffs cannot catch a wiring mistake --
   a wrong timezone, a date off by one, a panel that never updates -- and
   those are the bugs that actually reach the iPad. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
//  Screenshots go to a temporary folder, never the repository root: an
//  untracked PNG in the working tree is one `git add -A` from being
//  published (CLAUDE.md).  SHOTDIR keeps them somewhere you choose.
const SHOTS = process.env.SHOTDIR || fs.mkdtempSync(path.join(os.tmpdir(), 'tides-shots-'));

const BASE = 'http://127.0.0.1:8088/tides/';
const SRC = path.resolve(__dirname, '..', '..', '..', 'src', 'tides') + path.sep;

function awkDay(id, y, m, d, now) {
  return execFileSync('mawk', [
    '-v', 'cmode=plain', '-v', 'SF=' + SRC + 'stations.dat', '-v', 'cmd=day',
    '-v', 'id=' + id, '-v', 'yy=' + y, '-v', 'mm=' + m, '-v', 'dd=' + d,
    '-v', 'sky=0', '-v', 'nowdate=' + (now || '1970-01-01'), '-v', 'nowtime=00:00',
    '-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk'
  ], { input: '', encoding: 'utf8', cwd: SRC });
}
function awkTable(txt) {
  return txt.split('\n')
    .map(l => l.match(/^\s+(HIGH|low)\s+(\d\d:\d\d)\s+(-?\d+\.\d\d) m/))
    .filter(Boolean)
    .map(m => ({ k: m[1] === 'HIGH' ? 'H' : 'L', t: m[2], h: m[3] }));
}

const CASES = [
  { id: 'noaa/8452660', name: 'Newport RI (reference)',          y: 2026, m: 10, d: 20 },
  { id: 'noaa/9455920', name: 'Anchorage (69 constituents)',     y: 2026, m: 10, d: 20 },
  { id: 'noaa/8443970', name: 'Boston',                          y: 2027, m:  3, d: 15 },
  { id: 'noaa/1610367', name: 'Nonopapa (subordinate, ratio)',   y: 2026, m: 10, d: 20 },
  { id: 'noaa/1613077', name: 'subordinate, fixed offset',       y: 2026, m:  6, d: 21 },
  { id: 'ticon/ambon-133-idn-uhslc_fd', name: 'Ambon (near the equator)', y: 2026, m: 10, d: 20 },
  { id: 'ticon/albany-62120-aus-bom',   name: 'Albany (southern)',        y: 2024, m:  2, d: 29 }
];

(async () => {
  const browser = await chromium.launch();
  // iPad mini 6, portrait: the device this is for.
  const ctx = await browser.newContext({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.IDX && window.IDX.n > 0, { timeout: 20000 })
    .catch(() => {});
  const n = await page.evaluate(() => (window.IDX ? IDX.n : -1));
  console.log('station index loaded: ' + n + ' stations');
  console.log('build stamp: ' + (await page.evaluate(() => window.BUILD || '(none)')));

  let bad = 0;
  for (const c of CASES) {
    // choose the station and the date through the app's own code paths
    //  Wait for THIS station's prediction.  Waiting for any PRED let the
    //  previous station's answer through whenever the new one was still
    //  loading, and the comparison then failed on a race, not a fault.
    await page.evaluate(id => window.choose(id), c.id);
    await page.waitForFunction(id => window.PRED && !window.PRED.err && window.PRED.id === id, c.id, { timeout: 15000 });
    await page.evaluate(([y, m, d]) => {
      window.DAY = { y: y, m: m, d: d, jd0: TIDE.jdate(y, m, d) };
      window.rebuild();
    }, [c.y, c.m, c.d]);
    await page.waitForTimeout(60);

    const shown = await page.$$eval('#hl-body tr', rows => rows.map(r => ({
      k: r.children[0].textContent === 'HIGH' ? 'H' : 'L',
      t: r.children[1].textContent.trim(),
      h: r.children[2].textContent.replace(' m', '').trim()
    })));
    const want = awkTable(awkDay(c.id, c.y, c.m, c.d));

    const same = JSON.stringify(shown) === JSON.stringify(want);
    const date = c.y + '-' + String(c.m).padStart(2, '0') + '-' + String(c.d).padStart(2, '0');
    console.log((same ? '  ok   ' : '  FAIL ') + date + '  ' + c.name +
                '  (' + want.length + ' turns)');
    if (!same) {
      bad++;
      console.log('    page: ' + JSON.stringify(shown));
      console.log('    awk:  ' + JSON.stringify(want));
    }

    // the station banner must name the station the engine actually used
    const nm = await page.textContent('#st-name');
    const awkNm = awkDay(c.id, c.y, c.m, c.d).split('\n').map(x => x.trim()).filter(Boolean)[0];
    if (nm.trim() !== awkNm) { bad++; console.log('    FAIL name: page "' + nm + '" vs awk "' + awkNm + '"'); }
  }

  // ---- the terminal picture, against the awk's own grid --------------
  // A date that is not today, so neither side draws the now marker.
  await page.evaluate(id => window.choose(id), 'noaa/8452660');
  await page.waitForFunction(id => window.PRED && !window.PRED.err && window.PRED.id === id, 'noaa/8452660');
  await page.evaluate(() => {
    window.DAY = { y: 2027, m: 3, d: 15, jd0: TIDE.jdate(2027, 3, 15) };
    window.rebuild();
  });
  const termJs = await page.textContent('#term');
  const termAwk = awkDay('noaa/8452660', 2027, 3, 15);
  function grid(t) {
    const L = t.split('\n');
    const i = L.findIndex(l => /^\s{2}0?0\s{5,}03/.test(l));
    return i < 0 ? null : L.slice(i - 15, i + 1).map(l => l.replace(/\s+$/, '')).join('\n');
  }
  const gj = grid(termJs), ga = grid(termAwk);
  if (gj && ga && gj === ga) console.log('  ok   terminal picture matches the awk grid character for character');
  else {
    bad++;
    console.log('  FAIL terminal picture differs');
    if (gj && ga) {
      const a = gj.split('\n'), b = ga.split('\n');
      for (let i = 0; i < Math.max(a.length, b.length); i++)
        if (a[i] !== b[i]) { console.log('    js  |' + a[i] + '|'); console.log('    awk |' + b[i] + '|'); }
    } else console.log('    could not locate the grid: js=' + !!gj + ' awk=' + !!ga);
  }

  // ---- depth and clearance ------------------------------------------
  await page.fill('#i-charted', '2.4');
  await page.fill('#i-draft', '1.8');
  await page.fill('#i-clear', '0.5');
  await page.waitForTimeout(120);
  const depth = await page.textContent('#depth-out');
  console.log('  depth panel: ' + depth.replace(/\s+/g, ' ').slice(0, 150));
  await page.fill('#i-air', '18.0');
  await page.fill('#i-mast', '16.5');
  await page.waitForTimeout(120);
  const air = await page.textContent('#depth-out');
  if (!/clear/i.test(air)) { bad++; console.log('  FAIL bridge clearance produced nothing'); }
  else console.log('  ok   bridge clearance renders');

  // ---- the canvas actually drew something ---------------------------
  const painted = await page.evaluate(() => {
    const c = document.getElementById('curve');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let on = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) on++;
    return { w: c.width, h: c.height, lit: on, frac: on / (c.width * c.height) };
  });
  console.log('  canvas ' + painted.w + 'x' + painted.h + ', ' +
              (painted.frac * 100).toFixed(1) + '% of pixels painted');
  if (painted.frac < 0.05) { bad++; console.log('  FAIL the curve canvas is essentially blank'); }

  // ---- nothing overflows sideways at phone width --------------------
  for (const w of [744, 390, 320]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);
    const over = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth
    }));
    const ok = over.doc <= over.win + 1;
    console.log((ok ? '  ok   ' : '  FAIL ') + 'no sideways scroll at ' + w +
                'px (content ' + over.doc + ', window ' + over.win + ')');
    if (!ok) bad++;
  }

  await page.setViewportSize({ width: 744, height: 1133 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SHOTS, 'shot-day.png'), fullPage: true });
  await page.evaluate(() => window.go('pick'));
  await page.fill('#q', 'lon new');
  await page.waitForTimeout(300);
  const hits = await page.$$eval('#results .row b', e => e.map(x => x.textContent));
  console.log('  search "lon new" -> ' + JSON.stringify(hits.slice(0, 3)));
  await page.screenshot({ path: path.join(SHOTS, 'shot-pick.png'), fullPage: true });

  // ---- coastal work: opened by URL, as the course links to it ---------
  //  What the page SHOWS, against `tides work` itself: the working text
  //  either side of the figure must be the awk's, line for line.
  function awkWork(name, args) {
    const wargs = '|' + args.split(' ').join('|');
    const r = require('child_process').spawnSync('mawk', [
      '-v', 'cmode=plain', '-v', 'SF=' + SRC + 'stations.dat', '-v', 'cmd=work',
      '-v', 'wname=' + name, '-v', 'wargs=' + wargs, '-v', 'nofig=1',
      '-f', SRC + 'tables.awk', '-f', SRC + 'engine.awk', '-f', SRC + 'work.awk'
    ], { input: '', encoding: 'utf8', cwd: SRC });
    return r.stdout.replace(/^\n/, '').replace(/\n+$/, '');
  }
  const WCASES = [
    ['cts', 'track=045 stw=6 streams=135:1.5,150:2.0 leeway=5 wind=port var=-2 dev=1 dist=12', 'a6-2'],
    ['setdrift', 'start=50.10,-1.50 co=090 stw=6 hours=3 fix=50.05,-1.20', ''],
    ['stream', 'spr=2.6 nps=1.4 range=4.1 sprange=5.9 nprange=3.1', 'b2-11'],
    ['secondary', 'hw=05:36 hwh=6.4 mhws=6.8 mhwn=5.3 dhws=-0.4 dhwn=-0.3 thw1=0000 tdhw1=-10 thw2=0600 tdhw2=5', ''],
    ['twelfths', 'hw=23:10 hwh=4.0 lw=05:20 lwh=1.0 t=01:00', ''],
    ['twelfths', 'station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00', 'a5-3'],
    ['atlas', 'station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00', 'a7-1']
  ];
  for (const [name, args, lesson] of WCASES) {
    const q = 'work=' + name + '&' + args.split(' ').map(kv => {
      const e = kv.indexOf('=');
      return kv.slice(0, e) + '=' + encodeURIComponent(kv.slice(e + 1));
    }).join('&') + (lesson ? '&lesson=' + lesson : '');
    await page.goto(BASE + '?' + q, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const o = document.getElementById('w-out');
      return o && o.getAttribute('data-state');
    }, null, { timeout: 20000 });
    const got = await page.evaluate(() => {
      const pres = Array.from(document.querySelectorAll('#v-work pre.working')).map(p => p.textContent);
      const a = document.getElementById('w-lesson-a');
      return {
        state: document.getElementById('w-out').getAttribute('data-state'),
        text: pres.join('\n@@FIG\n').replace(/\n+$/, ''),
        svg: document.querySelectorAll('#w-out svg.wfig').length,
        visible: !document.getElementById('v-work').hidden,
        lesson: document.getElementById('w-lesson').hidden ? null : a.getAttribute('href'),
        url: location.search
      };
    });
    const want = awkWork(name, args);
    const wantLesson = lesson ? 'https://bashnav.navigationtools.org/practical-navigator/coastal/' + lesson.split('-')[0] + '.html#' + lesson : null;
    const okText = got.state === 'worked' && got.text === want;
    const okFig = (name === 'secondary' || name === 'atlas') ? got.svg === 0 : got.svg === 1;
    const okL = got.lesson === wantLesson;
    const ok = okText && okFig && okL && got.visible;
    console.log((ok ? '  ok   ' : '  FAIL ') + '?work=' + name + '  ' + args.slice(0, 48) +
                (lesson ? '  lesson ' + lesson : ''));
    if (!ok) {
      bad++;
      if (!got.visible) console.log('    the work view is not showing');
      if (!okFig) console.log('    figures drawn: ' + got.svg);
      if (!okL) console.log('    lesson link ' + got.lesson + ', wanted ' + wantLesson);
      if (!okText) {
        const A = want.split('\n'), B = got.text.split('\n');
        for (let i = 0, n = 0; i < Math.max(A.length, B.length) && n < 4; i++)
          if (A[i] !== B[i]) { console.log('    awk  |' + A[i] + '|'); console.log('    page |' + B[i] + '|'); n++; }
      }
    }
  }
  //  A lesson value that is not a lesson builds no link at all; bad input
  //  is a plain refusal on the screen, not an exception.
  for (const [q, what] of [
    ['work=cts&track=abc&stw=5&streams=1:1&lesson=a6-2%22%3E%3Cb%3E', 'a bad track and a lesson that is not one'],
    ['work=bogus&lesson=a6-2', 'a calculator that does not exist'],
    ['work=atlas&station=nope%2Fx&date=2026-11-07&t=10:00', 'a station that does not exist'],
    ['work=secondary&hw=05:36&hwh=6.4&mhws=6.8&mhwn=5.3&dhws=-0.4&dhwn=-0.3&thw1=0000&tdhw1=-10&thw2=0600&tdhw2=+5',
     'WORKS: a + that a URL turns into a space is trimmed away']]) {
    await page.goto(BASE + '?' + q, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.getElementById('w-out').getAttribute('data-state'), null, { timeout: 20000 });
    const r = await page.evaluate(() => ({
      state: document.getElementById('w-out').getAttribute('data-state'),
      msg: document.getElementById('w-out').textContent,
      lesson: document.getElementById('w-lesson').hidden ? null : document.getElementById('w-lesson-a').getAttribute('href')
    }));
    const lessonOk = /lesson=a6-2$/.test(q) ? r.lesson === 'https://bashnav.navigationtools.org/practical-navigator/coastal/a6.html#a6-2' : r.lesson === null;
    const ok = r.state === (/^WORKS/.test(what) ? 'worked' : 'refused') && lessonOk;
    console.log((ok ? '  ok   ' : '  FAIL ') + (/^WORKS/.test(what) ? '' : 'refused plainly: ') + what + '  ("' + r.msg.split('.')[0].slice(0, 60) + '")');
    if (!ok) { bad++; console.log('    state ' + r.state + ', lesson ' + r.lesson); }
  }
  //  The form writes itself back into the URL, and the calculators fit a phone
  await page.goto(BASE + '?work=cts&track=045&stw=6&streams=135:1.5&lesson=a6-2', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('w-out').getAttribute('data-state'));
  await page.fill('#wf-stw', '7');
  await page.click('#w-go');
  await page.waitForTimeout(150);
  const u = await page.evaluate(() => location.search);
  const uok = /work=cts/.test(u) && /stw=7/.test(u) && /lesson=a6-2/.test(u);
  console.log((uok ? '  ok   ' : '  FAIL ') + 'the form writes the URL back: ' + u.slice(0, 70));
  if (!uok) bad++;
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log((over <= 1 ? '  ok   ' : '  FAIL ') + 'the work view does not scroll sideways at ' + w + 'px');
    if (over > 1) bad++;
  }
  await page.evaluate(() => window.setMode('night'));
  await page.screenshot({ path: path.join(SHOTS, 'shot-work-night.png'), fullPage: true });
  await page.evaluate(() => window.setMode('dark'));
  await page.setViewportSize({ width: 744, height: 1133 });
  await page.screenshot({ path: path.join(SHOTS, 'shot-work.png'), fullPage: true });
  console.log('  screenshots in ' + SHOTS);

  console.log('');
  if (errs.length) { console.log('CONSOLE ERRORS (' + errs.length + '):'); errs.slice(0, 10).forEach(e => console.log('  ' + e)); bad += errs.length; }
  else console.log('no console errors');
  console.log(bad ? bad + ' FAILURES' : 'all checks passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
