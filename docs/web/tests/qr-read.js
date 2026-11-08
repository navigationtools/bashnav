//  READING THE WATCH'S OWN QR CODE.
//
//  The fixture is not a code generated to suit the decoder. It is the
//  real one, made by WeatherGlass's qr_ref.py -- byte mode, level L,
//  version 10, mask 0 -- and embedded in docs/web/platform/index.html,
//  which is where it was first put to find out whether the iPad could
//  read it at all. This test reads the picture and the expected text
//  STRAIGHT OUT OF THAT PAGE, so there is one copy of the fixture and
//  it cannot drift from the one Larry points his camera at.
//
//  WHAT THIS PROVES AND WHAT IT DOES NOT. It proves the decoder reads a
//  clean rendering of the watch's output, at several scales and
//  orientations, byte for byte. It does NOT prove anything about a
//  camera: glare on a crystal, focus at 15 cm, a dim screen at night.
//  That question cannot be answered from a fixture and is answered by
//  pointing the iPad at the watch, which is what the camera button on
//  the platform page is for.
//
//    node docs/web/tests/qr-read.js
'use strict';
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var PNG = require('./png.js');

var ROOT = path.join(__dirname, '..', '..', '..');
var WEB = path.join(ROOT, 'docs', 'web');

var fail = 0, checks = 0;
function ok(what, cond, detail) {
  checks++;
  if (!cond) { fail++; console.log('  FAIL  ' + what + (detail ? '\n        ' + detail : '')); }
}

//  ---- 1. the vendored file is the one we vetted ------------------
//
//  A vendored dependency with no checksum is a dependency nobody is
//  watching. These two lines are what stop the file being edited,
//  re-minified or upgraded without anyone deciding to.
var PIN = {
  'vendor/jsQR-1.4.0.js':
    'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859',
  'vendor/LICENSE-jsQR.txt':
    'c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08'
};
Object.keys(PIN).forEach(function (rel) {
  var sum = crypto.createHash('sha256')
              .update(fs.readFileSync(path.join(WEB, rel))).digest('hex');
  ok(rel + ' is byte for byte the file in docs/web/vendor/README.md',
     sum === PIN[rel], 'recorded ' + PIN[rel] + '\n        on disk   ' + sum);
});

//  Apache 2.0 requires the licence to travel with the code. If this
//  fails, bashnav is redistributing someone's work without its terms.
ok('the licence travels with it',
   fs.existsSync(path.join(WEB, 'vendor', 'LICENSE-jsQR.txt')));
ok('and NOTICE says whose work it is',
   /jsQR/.test(fs.readFileSync(path.join(ROOT, 'NOTICE'), 'utf8')));

global.jsQR = require('../vendor/jsQR-1.4.0.js');
var QR = require('../shared/qr.js');
ok('the wrapper finds a decoder', QR.available());

//  ---- 2. the fixture, read out of the probe page -----------------
var page = fs.readFileSync(path.join(WEB, 'platform', 'index.html'), 'utf8');
var mB = /var QR_B64 = "([^"]+)"/.exec(page);
var mT = /var QR_TEXT = "([^"]*)"/.exec(page);
ok('the platform page still carries the watch\'s code and its text', !!mB && !!mT);
if (!mB || !mT) { done(); }
var WANT = JSON.parse('"' + mT[1] + '"');

//  The picture is decoded by docs/web/tests/png.js, which the
//  photograph check uses too: one copy of the filter arithmetic.

var pic = PNG.read(Buffer.from(mB[1], 'base64'));
ok('the fixture is a square picture', pic.w === pic.h && pic.w > 100, pic.w + ' x ' + pic.h);

function scale(g, w, h, n) {
  var W = w * n, H = h * n, o = Buffer.alloc(W * H), x, y;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) o[y * W + x] = g[((y / n) | 0) * w + ((x / n) | 0)];
  return { w: W, h: H, grey: o };
}
function quiet(g, w, h, pad) {
  var W = w + pad * 2, H = h + pad * 2, o = Buffer.alloc(W * H, 255), x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) o[(y + pad) * W + x + pad] = g[y * w + x];
  return { w: W, h: H, grey: o };
}
function read(p) { return QR.decode(PNG.rgba(p), p.w, p.h); }

//  ---- 3. the watch's code, byte for byte -------------------------
var r = read(pic);
ok('the watch\'s code decodes', !!r);
if (r) {
  ok('byte for byte, all ' + WANT.length + ' of them', r.text === WANT,
     'want ' + WANT.length + ' chars, got ' + r.text.length);
  ok('and it is the version qr_ref.py writes', r.version === 10, 'version ' + r.version);
}

//  ---- 4. the shapes a camera actually delivers --------------------
//
//  Not decoration: a code held at arm's length is small in the frame, a
//  code filling the frame has no quiet zone of its own, and nobody holds
//  an iPad square to a watch. Each of these is a different path through
//  the locator.
var p2 = scale(pic.grey, pic.w, pic.h, 2);
ok('at twice the size', (read(p2) || {}).text === WANT);

var pq = quiet(pic.grey, pic.w, pic.h, 40);
ok('with a wide quiet zone around it', (read(pq) || {}).text === WANT);

var r90 = PNG.rot90(pic);
ok('turned ninety degrees', (read(r90) || {}).text === WANT);

var r180 = PNG.rot90(r90);
ok('turned upside down', (read(r180) || {}).text === WANT);

var r270 = PNG.rot90(r180);
ok('and the fourth way up', (read(r270) || {}).text === WANT);

//  ---- 5. it must not invent an answer ----------------------------
//
//  A reader that returns something from noise is worse than one that
//  returns nothing: deck-log would file it.
var noise = Buffer.alloc(pic.w * pic.h);
for (var i = 0; i < noise.length; i++) noise[i] = ((i * 2654435761) >>> 24) & 255;
ok('noise decodes to nothing', read({ w: pic.w, h: pic.h, grey: noise }) === null);

var blank = Buffer.alloc(pic.w * pic.h, 255);
ok('a blank frame decodes to nothing', read({ w: pic.w, h: pic.h, grey: blank }) === null);

//  Half the code cut away: the finder patterns are there, the data is
//  not. ECC must not be allowed to "recover" a different message.
var half = Buffer.from(pic.grey);
for (var y2 = (pic.h >> 1); y2 < pic.h; y2++)
  for (var x2 = 0; x2 < pic.w; x2++) half[y2 * pic.w + x2] = 255;
var hr = read({ w: pic.w, h: pic.h, grey: half });
ok('half a code gives nothing, or at least not a different message',
   hr === null || hr.text === WANT, hr ? 'got ' + hr.text.substr(0, 40) : '');

done();

function done() {
  if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
  console.log('  all ' + checks + ' checks');
}
