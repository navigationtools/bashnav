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
var zlib = require('zlib');
var crypto = require('crypto');
var path = require('path');

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

//  A small PNG reader: 8-bit greyscale, which is what qr_ref.py writes.
//  node has zlib built in, so this needs nothing installed -- the suite
//  runs offline on whatever is on the machine, like everything else.
function png(b64) {
  var buf = Buffer.from(b64, 'base64'), p = 8, w = 0, h = 0, depth = 0, ctype = 0, idat = [];
  while (p < buf.length) {
    var len = buf.readUInt32BE(p), typ = buf.toString('ascii', p + 4, p + 8);
    var d = buf.slice(p + 8, p + 8 + len);
    if (typ === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; }
    if (typ === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (depth !== 8 || ctype !== 0) throw new Error('expected 8-bit greyscale, got depth ' + depth + ' type ' + ctype);
  var raw = zlib.inflateSync(Buffer.concat(idat));
  var g = Buffer.alloc(w * h), q = 0, x, y;
  function paeth(a, b, c) {
    var e = a + b - c, pa = Math.abs(e - a), pb = Math.abs(e - b), pc = Math.abs(e - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }
  for (y = 0; y < h; y++) {
    var f = raw[q++], row = raw.slice(q, q + w); q += w;
    for (x = 0; x < w; x++) {
      var A = x ? g[y * w + x - 1] : 0, B = y ? g[(y - 1) * w + x] : 0,
          C = (x && y) ? g[(y - 1) * w + x - 1] : 0, v = row[x];
      if (f === 1) v = (v + A) & 255;
      else if (f === 2) v = (v + B) & 255;
      else if (f === 3) v = (v + ((A + B) >> 1)) & 255;
      else if (f === 4) v = (v + paeth(A, B, C)) & 255;
      g[y * w + x] = v;
    }
  }
  return { w: w, h: h, g: g };
}

var pic = png(mB[1]);
ok('the fixture is a square picture', pic.w === pic.h && pic.w > 100, pic.w + ' x ' + pic.h);

//  greyscale -> the RGBA a canvas would hand us
function rgba(g, w, h) {
  var a = new Uint8ClampedArray(w * h * 4), i;
  for (i = 0; i < w * h; i++) { a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = g[i]; a[i * 4 + 3] = 255; }
  return a;
}
function scale(g, w, h, n) {
  var W = w * n, H = h * n, o = Buffer.alloc(W * H), x, y;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) o[y * W + x] = g[((y / n) | 0) * w + ((x / n) | 0)];
  return { w: W, h: H, g: o };
}
function quiet(g, w, h, pad) {
  var W = w + pad * 2, H = h + pad * 2, o = Buffer.alloc(W * H, 255), x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) o[(y + pad) * W + x + pad] = g[y * w + x];
  return { w: W, h: H, g: o };
}
function rot90(g, w, h) {
  var o = Buffer.alloc(w * h), x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) o[x * h + (h - 1 - y)] = g[y * w + x];
  return { w: h, h: w, g: o };
}

function read(p) { return QR.decode(rgba(p.g, p.w, p.h), p.w, p.h); }

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
var p2 = scale(pic.g, pic.w, pic.h, 2);
ok('at twice the size', (read(p2) || {}).text === WANT);

var pq = quiet(pic.g, pic.w, pic.h, 40);
ok('with a wide quiet zone around it', (read(pq) || {}).text === WANT);

var r90 = rot90(pic.g, pic.w, pic.h);
ok('turned ninety degrees', (read(r90) || {}).text === WANT);

var r180 = rot90(r90.g, r90.w, r90.h);
ok('turned upside down', (read(r180) || {}).text === WANT);

var r270 = rot90(r180.g, r180.w, r180.h);
ok('and the fourth way up', (read(r270) || {}).text === WANT);

//  ---- 5. it must not invent an answer ----------------------------
//
//  A reader that returns something from noise is worse than one that
//  returns nothing: deck-log would file it.
var noise = Buffer.alloc(pic.w * pic.h);
for (var i = 0; i < noise.length; i++) noise[i] = ((i * 2654435761) >>> 24) & 255;
ok('noise decodes to nothing', read({ w: pic.w, h: pic.h, g: noise }) === null);

var blank = Buffer.alloc(pic.w * pic.h, 255);
ok('a blank frame decodes to nothing', read({ w: pic.w, h: pic.h, g: blank }) === null);

//  Half the code cut away: the finder patterns are there, the data is
//  not. ECC must not be allowed to "recover" a different message.
var half = Buffer.from(pic.g);
for (var y2 = (pic.h >> 1); y2 < pic.h; y2++)
  for (var x2 = 0; x2 < pic.w; x2++) half[y2 * pic.w + x2] = 255;
var hr = read({ w: pic.w, h: pic.h, g: half });
ok('half a code gives nothing, or at least not a different message',
   hr === null || hr.text === WANT, hr ? 'got ' + hr.text.substr(0, 40) : '');

done();

function done() {
  if (fail) { console.log('  ' + fail + ' of ' + checks + ' checks failed'); process.exit(1); }
  console.log('  all ' + checks + ' checks');
}
