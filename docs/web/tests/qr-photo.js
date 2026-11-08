//  REAL PHOTOGRAPHS OF THE WATCH, AND THE RULE THEY ESTABLISHED.
//
//  docs/web/tests/qr-read.js checks a clean rendering of a QR code --
//  the picture qr_ref.py draws. This checks two PHOTOGRAPHS of Larry's
//  quatix, taken in his kitchen, with the screen's own pixel grid and
//  its dither in them. They are the difference between "the decoder
//  implements the standard" and "the decoder reads the watch".
//
//  THE RULE: SMALLER READS BETTER. At the size they are committed
//  neither photograph decodes. Scaled DOWN, both do. jsQR thresholds in
//  small fixed blocks, so when a module is tens of pixels across every
//  block lands inside one module, there is nothing to threshold
//  between, and the screen's dither decides. Scale until a module is
//  five to eight pixels and the dither averages away.
//
//  That is why docs/web/shared/qr.js asks the camera for its highest
//  resolution and then throws most of it away.
//
//  WHAT THESE FILES ARE. 700 px, greyscale, posterised to 32 levels, so
//  that two real photographs cost about 300 KB in a public repository
//  rather than eight megabytes. Larry agreed to publishing them: the
//  payloads carry his home position.
//
//  The downscale here is a box average, which is CRUDER than the
//  browser's. A check that passes with the worse filter passes with the
//  better one.
//
//    node docs/web/tests/qr-photo.js
'use strict';
var path = require('path');
var PNG = require('./png.js');

global.jsQR = require('../vendor/jsQR-1.4.0.js');
var QR = require('../shared/qr.js');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

//  The ladder docs/web/shared/qr.js uses, in its order.
var SIZES = [500, 400, 600, 700];

var PHOTOS = [
  { file: 'watch-old-format.png',
    what: 'the format the watch shipped with',
    text: '2026-11-04T03:16Z|nav|lat=41 19.9N|lon=073 21.8W|sog=0.4|cog=024|wdir=023|' +
          'wspd=5|sea=1|who=-|src=watch|~\n' +
          '2026-11-04T03:16Z|wx|mslp=1024.5|pchg=-0.6|ptend=6|airt=5.0|cloud=0|cl=0|' +
          'cm=0|ch=0|who=-|src=watch|~' },
  { file: 'watch-new-format.png',
    what: 'the build of 8 November',
    text: '2026-11-08T22:27Z|nav|lat=41 19.9N|lon=073 21.8W|sog=0.7|cog=206|wdir=203|' +
          'wspd=5|wsrc=garmin|sea=0|who=-|src=watch|~\n' +
          '2026-11-08T22:27Z|wx|mslp=1007.3|pchg=-1.0|ptend=6|airt=11.7|tsrc=garmin|' +
          'cloud=0|cl=0|cm=0|ch=0|who=-|src=watch|~' }
];

PHOTOS.forEach(function (p) {
  var pic = PNG.read(path.join(__dirname, 'photos', p.file));
  var native = QR.decode(PNG.rgba(pic), pic.w, pic.h);
  var got = null, won = 0, i, n, q, r;

  for (i = 0; i < SIZES.length; i++) {
    n = SIZES[i];
    if (n > pic.w) continue;
    q = (n === pic.w) ? pic : PNG.down(pic, n);
    r = QR.decode(PNG.rgba(q), q.w, q.h);
    if (r) { got = r; won = n; break; }
  }

  ok('a photograph of the watch decodes (' + p.what + ')', !!got,
     'none of ' + SIZES.join(', ') + ' px read ' + p.file);
  if (got) {
    ok('and byte for byte at ' + won + ' px', got.text === p.text,
       'got ' + got.text.length + ' bytes, expected ' + p.text.length);
  }

  //  Reported, never asserted. If a future decoder reads the photograph
  //  at its native size this prints "yes" and nothing fails -- that
  //  would be good news, and a check that failed on good news would
  //  just be deleted by whoever met it.
  console.log('  note  ' + p.file + ': ' + pic.w + ' px native reads ' +
              (native ? 'yes' : 'no') + ', ladder read at ' +
              (won ? won + ' px' : 'nothing'));
});

if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
console.log('  all ' + checks + ' checks');
