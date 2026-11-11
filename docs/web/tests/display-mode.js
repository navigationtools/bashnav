//  THE DISPLAY MODE, DRIVEN IN A REAL BROWSER.
//
//  Every check here is a fault that shipped. None of them could have been
//  found by reading: in each case the file parses, the page loads and
//  nothing throws.
//
//    1. THE PALETTE PAINTS BEFORE THE SCRIPTS ARRIVE. The mode is set from
//       a script in <head> so the attribute is right at the first paint.
//       Moved to the foot of the body - which is where it was - a slow
//       first visit paints the shipped default and then jumps. Measured at
//       173ms of the wrong palette at 150ms of latency. It did no harm only
//       because the shipped value was dark; shipped as day it would have
//       been half a second of white in a reader's night vision.
//
//    2. NIGHT IS THE DEFAULT, including when nothing is stored and when
//       what is stored is rubbish. A stale or mistyped value must fall back,
//       not pass through onto the root.
//
//    3. NIGHT TO DAY NEEDS A HELD PRESS. Every other change is a tap. The
//       one transition that can cost twenty minutes of dark adaptation is
//       the one you cannot do by accident in the dark.
//
//    4. THE BROWSER'S OWN CONTROLS FOLLOW THE PALETTE. accent-color tints
//       only the filled half of a slider; the unfilled track is the
//       browser's, drawn light unless color-scheme says otherwise. That put
//       nine white bars across the suite, five of them full width in one
//       weather lesson, on a night screen.
//
//    5. HIGH CONTRAST IS RESPECTED, NOT OVERRIDDEN - but a button whose
//       state was a background fill must still read as pressed when forced
//       colours take the fill away.
//
//    6. A DRAWING MADE BEFORE THE MODE CHANGED KEEPS THE OLD COLOURS, and
//       weather's two lesson figures APPEND rather than clear, so a repaint
//       that forgets to empty its box stacks a second drawing on the first.
//       They were also once registered against the lesson container, so a
//       repaint would have deleted the lesson's prose.
//
//  Needs a browser. Where one cannot be launched it prints DISPLAY-MODE
//  SKIP and exits 0, because a suite that fails for want of a browser
//  teaches people to ignore it.
//
//    node docs/web/tests/display-mode.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPS = [
  ['launcher', ''], ['celnav', 'celnav/'], ['colregs', 'colregs/'],
  ['deck-log', 'deck-log/'], ['drill', 'drill/'], ['tides', 'tides/'],
  ['weather', 'weather/']
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                '.json': 'application/json', '.svg': 'image/svg+xml',
                '.webmanifest': 'application/manifest+json' };

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

//  night to day is the guarded one: press and HOLD. Everything else is a tap.
async function press(page, mode, holdMs) {
  const el = await page.$('.mb[data-mode="' + mode + '"]');
  if (!el) return null;
  const box = await el.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(220);
  return page.evaluate(() => document.documentElement.getAttribute('data-mode'));
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { console.log('DISPLAY-MODE SKIP playwright is not installed'); return; }

  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    console.log('DISPLAY-MODE SKIP no browser to drive: ' + e.message.split('\n')[0]);
    return;
  }

  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port + '/';

  for (const [name, dir] of APPS) {
    const url = BASE + dir;

    // ---- the buttons, the default, and the guard both ways -----------
    {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(350);

      const btns = await page.evaluate(() => document.querySelectorAll('#modes .mb').length);
      ok(name + ': three labelled buttons, not a cycle', btns === 3, 'found ' + btns);
      const dflt = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
      ok(name + ': night with nothing stored', dflt === 'night', 'got ' + dflt);

      ok(name + ': a quick tap will not go night to day', await press(page, 'day', 120) === 'night');
      ok(name + ': a held press does', await press(page, 'day', 700) === 'day');
      ok(name + ': day to dark is a tap', await press(page, 'dark', 120) === 'dark');
      ok(name + ': dark to night is a tap', await press(page, 'night', 120) === 'night');
      await press(page, 'dark', 120);
      ok(name + ': dark to day is a tap', await press(page, 'day', 120) === 'day');

      const stored = await page.evaluate(() => { try { return localStorage.getItem('visual-mode'); } catch (e) { return null; } });
      ok(name + ': the choice is stored under visual-mode', stored === 'day', 'got ' + stored);
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(300);
      ok(name + ': and survives a reload',
         await page.evaluate(() => document.documentElement.getAttribute('data-mode')) === 'day');
      ok(name + ': the button shows which mode is on',
         await page.evaluate(() => [].filter.call(document.querySelectorAll('#modes .mb'),
           b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.mode).join()) === 'day');
      ok(name + ': no errors while driving it', errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // ---- color-scheme follows the palette ----------------------------
    {
      const want = { night: 'dark', dark: 'dark', day: 'light' };
      for (const mode of ['night', 'dark', 'day']) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(m => { try { localStorage.setItem('visual-mode', m); } catch (e) {} }, mode);
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(250);
        const cs = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
        ok(name + ': color-scheme is ' + want[mode] + ' in ' + mode + ' mode', cs === want[mode], 'got ' + cs);
        await ctx.close();
      }
    }

    // ---- forced colours: pressed still reads as pressed ---------------
    {
      const ctx = await browser.newContext({ forcedColors: 'active' });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(350);
      //  COMPARE THE TEXT COLOUR, NOT THE WHOLE DECLARATION. Without the
      //  forced-colours rules the two buttons still differ on paper - the
      //  pressed one resolves to an OPAQUE canvas background and the other
      //  to a transparent one - so a check that only asked "are these two
      //  strings different" passed either way while a reader saw two
      //  identical buttons. Forced colours flatten a fill; what survives
      //  is the system's Highlight/HighlightText pair, and that shows in
      //  the text colour.
      const r = await page.evaluate(() => {
        const bs = [].slice.call(document.querySelectorAll('#modes .mb'));
        const on = bs.filter(b => b.getAttribute('aria-pressed') === 'true')[0];
        const off = bs.filter(b => b.getAttribute('aria-pressed') !== 'true')[0];
        const c = e => getComputedStyle(e);
        return { media: matchMedia('(forced-colors: active)').matches,
                 onFg: on ? c(on).color : '', offFg: off ? c(off).color : '',
                 onBg: on ? c(on).backgroundColor : '' };
      });
      ok(name + ': the forced-colours rules are in force', r.media === true);
      ok(name + ': in forced colours the pressed button takes the system highlight',
         r.onFg !== '' && r.onFg !== r.offFg,
         'pressed text ' + r.onFg + ', unpressed text ' + r.offFg +
         ' - identical, so the pressed state is invisible');
      await ctx.close();
    }

    // ---- the palette is right at the FIRST paint ----------------------
    for (const [stored, want] of [['night', 'night'], ['day', 'day'], [null, 'night'], ['DAY-ish', 'night']]) {
      const ctx = await browser.newContext({ viewport: { width: 500, height: 400 } });
      const page = await ctx.newPage();
      if (stored !== null) {
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(m => { try { localStorage.setItem('visual-mode', m); } catch (e) {} }, stored);
      }
      //  hold every script back, as a first visit on a poor link does
      await page.route('**/*.js', async r => { await new Promise(x => setTimeout(x, 600)); await r.continue(); });
      await page.goto(url, { waitUntil: 'commit' });
      await page.waitForTimeout(200);                 // scripts still 400ms away
      const early = await page.evaluate(() => document.documentElement.getAttribute('data-mode'));
      ok(name + ': paints ' + want + ' before the scripts arrive (stored: ' + stored + ')',
         early === want, 'painted ' + early);
      await ctx.close();
    }
  }

  // ---- weather's two lesson figures, which append rather than clear ----
  {
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1200 } });
    const page = await ctx.newPage();
    await page.goto(BASE + 'weather/', { waitUntil: 'load' });
    await page.evaluate(() => { try { localStorage.setItem('visual-mode', 'night'); } catch (e) {} });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.evaluate(() => { go('learn'); showLesson('coriolis'); });
    await page.waitForTimeout(250);
    await page.click('button[data-more="coriolis"]');
    await page.waitForTimeout(900);
    const look = () => page.evaluate(() => {
      const hosts = ['les-text', 'les-more'].map(i => document.getElementById(i)).filter(Boolean);
      const svgs = [];
      let text = 0;
      hosts.forEach(h => { text += h.textContent.length; [].push.apply(svgs, h.querySelectorAll('svg')); });
      const seen = {};
      svgs.forEach(s => s.querySelectorAll('*').forEach(e => ['stroke', 'fill'].forEach(a => {
        const v = e.getAttribute(a);
        if (v && v !== 'none' && v.charAt(0) === '#') seen[v] = 1;
      })));
      return { svg: svgs.length, nodes: svgs.reduce((n, s) => n + s.querySelectorAll('*').length, 0),
               boxes: document.querySelectorAll('.figbox').length,
               text: text, colours: Object.keys(seen).sort().join(' ') };
    });
    const a = await look();
    ok('weather: both lesson figures draw, each in its own box', a.svg === 2 && a.boxes === 2,
       a.svg + ' svg, ' + a.boxes + ' boxes');
    await page.click('.mb[data-mode="dark"]'); await page.waitForTimeout(500);
    const d = await look();
    await page.click('.mb[data-mode="day"]'); await page.waitForTimeout(500);
    const c = await look();
    ok('weather: a repaint does not stack a second drawing on the first',
       a.nodes === d.nodes && d.nodes === c.nodes, [a, d, c].map(x => x.nodes).join(' / '));
    ok('weather: and does not take the lesson prose with it',
       a.text > 3000 && a.text === c.text, [a, d, c].map(x => x.text).join(' / '));
    ok('weather: the figures follow the mode', a.colours !== c.colours && d.colours !== c.colours,
       a.colours + '  ->  ' + c.colours);
    await ctx.close();
  }

  await browser.close();
  server.close();

  if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
  console.log('  all ' + checks + ' checks');
})();
