//  THE PROBE PAGE'S CAMERA STOPS WHEN TOLD TO, AND STAYS STOPPED.
//
//  Larry, 23 November 2026, on his iPad after the GlassLog hike: "I press
//  stop and it keeps starting up again."  The button started the camera
//  from an addEventListener handler and stopped it from btn.onclick, so a
//  press on "stop" ran BOTH: one stopped the stream, the other asked for a
//  new one.  Reproduced here before the fix: 2.5 s after "stop" the
//  camera was still live and the button still said "stop".
//
//  Driven in Chromium with its fake camera:
//    1. start: a live track, the button says "stop", the video shows;
//    2. stop: 2.5 s later no live track, the button is back, video hidden;
//    3. start and stop a second time: the same, so the fix is not one-shot.
//
//  Needs a browser. Where one cannot be launched it prints PROBE-CAMERA
//  SKIP and exits 0, as display-mode.js does.
//
//    node docs/web/tests/probe-camera-stop.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}
function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rep) => {
      let u = decodeURIComponent(req.url.split('?')[0]);
      if (u.endsWith('/')) u += 'index.html';
      const f = path.join(ROOT, u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        rep.writeHead(404); rep.end('no'); return;
      }
      rep.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rep);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { console.log('PROBE-CAMERA SKIP playwright is not installed'); return; }
  let browser;
  try {
    browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream',
                                             '--use-fake-ui-for-media-stream'] });
  } catch (e) {
    console.log('PROBE-CAMERA SKIP no browser to drive: ' + e.message.split('\n')[0]);
    return;
  }
  const server = await serve();
  //  127.0.0.1 is a secure context, so the page will ask for the camera
  const BASE = 'http://127.0.0.1:' + server.address().port + '/';
  const ctx = await browser.newContext({ permissions: ['camera'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + 'platform/');
  await page.waitForTimeout(400);

  const state = () => page.evaluate(() => {
    const v = document.getElementById('cam'), s = v.srcObject;
    return {
      live: s ? s.getTracks().filter(t => t.readyState === 'live').length : 0,
      label: document.getElementById('camgo').textContent,
      shown: document.getElementById('camwrap').style.display
    };
  });

  for (let round = 1; round <= 2; round++) {
    await page.click('#camgo');
    await page.waitForFunction(() => document.getElementById('camgo').textContent === 'stop',
                               null, { timeout: 8000 }).catch(() => {});
    let s = await state();
    ok('round ' + round + ': start gives a live camera', s.live === 1 && s.label === 'stop' &&
       s.shown === 'block', JSON.stringify(s));
    await page.click('#camgo');
    await page.waitForTimeout(2500);
    s = await state();
    ok('round ' + round + ': 2.5 s after stop the camera is off and stays off',
       s.live === 0 && s.label === 'try the camera on it' && s.shown === 'none', JSON.stringify(s));
  }
  ok('no page errors', errs.length === 0, errs.join(' | '));

  await browser.close();
  server.close();
  console.log((fail ? '  ' + fail + ' FAILED of ' : '  all ') + checks + ' checks');
  process.exit(fail ? 1 : 0);
})();
