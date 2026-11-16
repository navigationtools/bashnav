const path = require('path');
/*  Drive the weather page.  The check that matters most is not a number:
    it is that NOTHING of the app's reasoning is on the page until the
    user's own call is in the log. A guess you can glimpse is a guess you
    have read. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const REPO = path.resolve(__dirname, '..', '..', '..');
const BASE = 'http://127.0.0.1:8090/weather/';
const TMP = process.env.TMPDIR || '/tmp';

const ENG = ['-f', REPO + '/src/common/log.awk', '-f', REPO + '/src/common/colour.awk',
             '-f', REPO + '/src/weather/grid.awk', '-f', REPO + '/src/weather/wx.awk', '-f', REPO + '/src/weather/score.awk',
             '-f', REPO + '/src/weather/chart.awk', '-f', REPO + '/src/weather/teach.awk',
             '-f', REPO + '/src/weather/screens.awk'];
function awk(args) {
  return execFileSync('mawk', ['-v', 'cmode=plain'].concat(args).concat(ENG),
                      { input: '', encoding: 'utf8' });
}

const OBS = [
  "2026-10-18T06:00Z|nav|lat=41 14.0N|lon=-72.0|crs=096|sog=8.5|wdir=200|wspd=12|sea=3|~",
  "2026-10-18T06:00Z|wx|mslp=1019.4|ptend=4|airt=14.0|dewp=9.0|seat=15.0|cloud=2|cl=1|cm=0|ch=2|vis=8|~",
  "2026-10-18T09:00Z|nav|lat=41 16.0N|lon=-72.0|crs=096|sog=8.2|wdir=190|wspd=15|sea=3|~",
  "2026-10-18T09:00Z|wx|mslp=1017.1|ptend=7|airt=13.6|dewp=10.2|seat=14.8|cloud=5|cl=1|cm=3|ch=4|vis=7|~",
  "2026-10-18T12:00Z|nav|lat=41 18.0N|lon=-72.0|crs=096|sog=7.9|wdir=175|wspd=22|sea=4|~",
  "2026-10-18T12:00Z|wx|mslp=1012.6|ptend=6|airt=13.1|dewp=12.4|seat=14.5|cloud=8|cl=6|cm=2|ch=7|vis=4|swper=14|swdir=160|~"
];

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.RECS !== 'undefined', { timeout: 15000 });
  console.log('build ' + await page.evaluate(() => window.BUILD));
  let bad = 0;
  const fail = m => { bad++; console.log('  FAIL ' + m); };

  // seed the SHARED deck-log store, exactly as deck-log would have
  await page.evaluate(ls => STORE.append(ls).then(() => reload()), OBS);
  const nobs = await page.evaluate(() => OBS.length);
  if (nobs !== 3) fail('expected 3 merged observations from 6 records, got ' + nobs);
  else console.log('  ok   read deck-log\'s own store: 6 records merged into 3 observations');

  await page.evaluate(() => { lsSet('lon', '-72'); });

  // ---- the reasoning, against `weather what` ------------------------
  const f = path.join(TMP, 'wx-ui.log');
  fs.writeFileSync(f, OBS.join('\n') + '\n');
  const wantWhat = awk(['-v', 'LOG=' + f, '-v', 'lon=-72', '-v', 'cmd=what']);
  await page.evaluate(() => go('what'));
  await page.waitForTimeout(150);
  const gotWhat = await page.textContent('#what-term');
  if (gotWhat !== wantWhat) {
    fail('the page\'s reasoning differs from `weather what`');
    const a = gotWhat.split('\n'), b = wantWhat.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (a[i] !== b[i]) { console.log('    page |' + a[i] + '|'); console.log('    awk  |' + b[i] + '|'); break; }
  } else console.log('  ok   the reasoning matches `weather what` character for character');

  const shown = await page.textContent('#what-out');
  if (!/serious fall/.test(shown) || !/Buys Ballot/.test(shown))
    fail('the web rendering of the reasoning is missing its conclusions');
  else console.log('  ok   the web rendering shows both the conclusion and the working');

  // ---- NEVER TELL BEFORE YOU ASK ------------------------------------
  await page.evaluate(() => go('fcast'));
  await page.waitForTimeout(150);
  const hiddenBefore = await page.evaluate(() => document.getElementById('fc-compare').hidden);
  const bodyBefore = await page.textContent('#v-fcast');
  if (!hiddenBefore) fail('the comparison panel is visible before the user has committed');
  else console.log('  ok   the app\'s forecast is absent from the page before yours is in');
  //  not merely hidden: the numbers must not be in the DOM at all
  const leaked = await page.evaluate(() => {
    const t = document.getElementById('fc-table');
    return t ? t.textContent.trim() : '';
  });
  if (leaked !== '') fail('the comparison table already holds values: ' + JSON.stringify(leaked));
  else console.log('  ok   and not in the DOM either, so it cannot be glimpsed');

  // commit the user's call
  await page.evaluate(() => {
    document.getElementById('f-wdir').value = '150';
    document.getElementById('f-wspd').value = '30';
    document.getElementById('f-mslp').value = '1002';
    document.getElementById('f-sea').value = '5';
  });
  await page.click('#b-commit');
  await page.waitForFunction(() => !document.getElementById('fc-compare').hidden, { timeout: 8000 });
  const after = await page.textContent('#fc-table');
  if (!/you/.test(after) || !/rules/.test(after) || !/persist/.test(after))
    fail('the comparison is missing a forecaster: ' + after.replace(/\s+/g, ' '));
  else console.log('  ok   all three forecasts appear once yours is committed');

  // the user's record must be by=you, which is what the score sheet reports
  const byVals = await page.evaluate(() => RECS.filter(r => r.type === 'fc').map(r => r.v.by));
  if (byVals.indexOf('you') < 0)
    fail('the page records the user\'s forecast as ' + JSON.stringify(byVals) +
         '; the score sheet reports you/rules/persist');
  else console.log('  ok   the user\'s forecast is recorded as by=you (' + byVals.join(', ') + ')');

  // ---- the score, against `weather score` ---------------------------
  //  log the observation the forecast was made for
  const valid = await page.evaluate(() => document.getElementById('i-valid').value);
  await page.evaluate(v => STORE.append([
    LOG.make(v, 'nav', [['lat', '42 00.0N'], ['lon', '-72.0'], ['wdir', '150'], ['wspd', '32'], ['sea', '5']]),
    LOG.make(v, 'wx', [['mslp', '1003.0']])
  ]).then(() => reload()), valid);
  const allLines = await page.evaluate(() => STORE.allLines().then(l => STORE.canonical(l)));
  fs.writeFileSync(f, allLines.join('\n') + '\n');
  const wantScore = awk(['-v', 'LOG=' + f, '-v', 'cmd=score']);
  await page.evaluate(() => go('score'));
  await page.waitForTimeout(150);
  const gotScore = await page.textContent('#score-term');
  if (gotScore !== wantScore) {
    fail('the score sheet differs from `weather score`');
    const a = gotScore.split('\n'), b = wantScore.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (a[i] !== b[i]) { console.log('    page |' + a[i] + '|'); console.log('    awk  |' + b[i] + '|'); break; }
  } else console.log('  ok   the score sheet matches `weather score` character for character');
  const sheet = await page.textContent('#score-out');
  if (!/you/.test(sheet)) fail('the user is missing from the web score table');
  else console.log('  ok   the user is on the web score table: ' + sheet.replace(/\s+/g, ' ').slice(0, 110));

  // ---- the 500 mb chart ---------------------------------------------
  await page.evaluate(() => go('chart'));
  await page.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    set('c-brg', '15'); set('c-dist', '300'); set('c-or', '260'); set('c-w5', '65');
  });
  await page.waitForTimeout(200);
  const wantCh = awk(['-v', 'cmd=chart', '-v', 'brg=15', '-v', 'dist=300', '-v', 'orient=260',
                      '-v', 'w500=65', '-v', 'north=1', '-v', 'LOG=/dev/null']);
  const gotCh = await page.textContent('#chart-term');
  if (gotCh !== wantCh) {
    fail('the chart rules differ from `weather chart`');
    const a = gotCh.split('\n'), b = wantCh.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (a[i] !== b[i]) { console.log('    page |' + a[i] + '|'); console.log('    awk  |' + b[i] + '|'); break; }
  } else console.log('  ok   the 500 mb rules match `weather chart` character for character');

  // ---- the lessons, and the answer not being given away -------------
  await page.evaluate(() => go('learn'));
  await page.waitForTimeout(120);
  const nles = await page.$$eval('#les-list .row', r => r.length);
  //  HOW MANY: as many as the awk lists, counted from its own les() calls,
  //  not a number typed here - it was 10 until the veer lesson made it 11.
  const wantLes = (fs.readFileSync(REPO + '/src/weather/teach.awk', 'utf8').match(/^\s*les\("/gm) || []).length;
  if (nles !== wantLes) fail('expected ' + wantLes + ' lessons (the awk lists them), found ' + nles);
  await page.evaluate(() => showLesson('tide'));
  await page.waitForTimeout(120);
  const les = await page.textContent('#les-text');
  if (!/SEMIdiurnal/.test(les)) fail('the lesson text is missing its emphasis');
  const q = await page.textContent('#les-q');
  const ansRec = await page.evaluate(() => LESSONS.filter(l => l.key === 'tide')[0].a);
  if (q.indexOf(ansRec) >= 0) fail('the lesson gives its answer away before it is asked for');
  else console.log('  ok   the lesson asks before it tells (' + nles + ' lessons, emphasis intact)');
  await page.evaluate(() => { const b = document.querySelector('#les-q button'); if (b) b.click(); });
  await page.waitForTimeout(100);
  const q2 = await page.textContent('#les-q');
  if (q2.indexOf(ansRec) < 0) fail('the answer does not appear when asked for');
  else console.log('  ok   and tells when asked');

  // ---- LEARN MORE: OFFERED, AND NOT IN THE PAGE UNTIL ASKED FOR ------
  //  Same rule as the answer. The lesson is the length it was written to
  //  be; the deeper section is there for the reader who wants it, and a
  //  deeper section that is merely hidden is one that has been read.
  const deep = await page.evaluate(() => {
    const l = LESSONS.filter(x => x.more && x.more.length)[0];
    //  NOT the first line: drawLines renders that as a trimmed heading, so
    //  a probe taken from it carries leading spaces the page never shows.
    //  Take a body line, and trim it, because the page trims too.
    const lines = l.more.map(b => (b.p || []).map(p => p.t).join('').trim())
                        .filter(t => t.length > 30);
    return l ? { key: l.key, probe: lines[2] } : null;
  });
  if (!deep) fail('no lesson in lessons.js carries a deeper section');
  else {
    await page.evaluate(k => showLesson(k), deep.key);
    await page.waitForTimeout(120);
    const before = await page.evaluate(() => document.getElementById('les-more').textContent);
    const btn = await page.evaluate(() => !!document.querySelector('#les-more [data-more]'));
    if (!btn) fail('the deeper section is not offered on a lesson that has one');
    else if (before.indexOf(deep.probe) >= 0)
      fail('the deeper section is already in the page before it is asked for');
    else {
      await page.evaluate(() => document.querySelector('#les-more [data-more]').click());
      await page.waitForTimeout(120);
      const after = await page.evaluate(() => document.getElementById('les-more').textContent);
      if (after.indexOf(deep.probe) < 0) fail('the deeper section does not appear when asked for');
      else console.log('  ok   learn more is offered, absent until asked, and appears (' + deep.key + ')');
    }
  }

  // ---- layout --------------------------------------------------------
  for (const w of [744, 390, 320]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);
    const o = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    if (o.doc > o.win + 1) fail('sideways scroll at ' + w + 'px (' + o.doc + ' > ' + o.win + ')');
  }
  console.log('  ok   no sideways scroll at 744, 390 and 320 px');

  await page.setViewportSize({ width: 744, height: 1133 });
  await page.evaluate(() => go('what'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(TMP, 'wx-what.png'), fullPage: true });
  await page.evaluate(() => showLesson('tide'));
  await page.evaluate(() => go('learn'));
  await page.evaluate(() => showLesson('tide'));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(TMP, 'wx-lesson.png'), fullPage: true });

  console.log('');
  if (errs.length) { console.log('CONSOLE ERRORS (' + errs.length + '):'); errs.slice(0,8).forEach(e => console.log('  ' + e)); bad += errs.length; }
  else console.log('no console errors');
  console.log(bad ? bad + ' FAILURES' : 'all checks passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
