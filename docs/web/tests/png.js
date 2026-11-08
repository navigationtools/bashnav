//  A small PNG reader for the test suite: 8-bit, greyscale or RGB(A).
//
//  node has zlib built in, so this needs nothing installed and the
//  suite stays offline on whatever is on the machine. It exists
//  because two checks want to feed real pictures to the QR decoder and
//  neither should carry its own copy of the filter arithmetic.
'use strict';
var fs = require('fs');
var zlib = require('zlib');

function paeth(a, b, c) {
  var e = a + b - c, pa = Math.abs(e - a), pb = Math.abs(e - b), pc = Math.abs(e - c);
  return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
}

//  read(fileOrBuffer) -> { w, h, grey: Buffer }
function read(src) {
  var buf = Buffer.isBuffer(src) ? src : fs.readFileSync(src);
  var p = 8, w = 0, h = 0, depth = 0, ctype = 0, idat = [];
  while (p < buf.length) {
    var len = buf.readUInt32BE(p), typ = buf.toString('ascii', p + 4, p + 8);
    var d = buf.slice(p + 8, p + 8 + len);
    if (typ === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; }
    if (typ === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('expected 8 bits per channel, got ' + depth);
  var ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error('unsupported colour type ' + ctype);

  var raw = zlib.inflateSync(Buffer.concat(idat));
  var stride = w * ch, out = Buffer.alloc(h * stride), q = 0, x, y;
  for (y = 0; y < h; y++) {
    var f = raw[q++], row = raw.slice(q, q + stride); q += stride;
    for (x = 0; x < stride; x++) {
      var A = x >= ch ? out[y * stride + x - ch] : 0,
          B = y ? out[(y - 1) * stride + x] : 0,
          C = (x >= ch && y) ? out[(y - 1) * stride + x - ch] : 0,
          v = row[x];
      if (f === 1) v = (v + A) & 255;
      else if (f === 2) v = (v + B) & 255;
      else if (f === 3) v = (v + ((A + B) >> 1)) & 255;
      else if (f === 4) v = (v + paeth(A, B, C)) & 255;
      out[y * stride + x] = v;
    }
  }

  var grey = Buffer.alloc(w * h), i;
  for (i = 0; i < w * h; i++) {
    if (ch <= 2) grey[i] = out[i * ch];
    else grey[i] = (out[i * ch] * 299 + out[i * ch + 1] * 587 + out[i * ch + 2] * 114) / 1000 | 0;
  }
  return { w: w, h: h, grey: grey };
}

//  Greyscale -> the RGBA a canvas would hand back.
function rgba(p) {
  var a = new Uint8ClampedArray(p.w * p.h * 4), i;
  for (i = 0; i < p.w * p.h; i++) {
    a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = p.grey[i];
    a[i * 4 + 3] = 255;
  }
  return a;
}

//  A box average down to n x n. DELIBERATELY CRUDER than the browser's
//  downscale, which the page asks for with imageSmoothingQuality high:
//  a check that passes with the worse filter passes with the better one.
function down(p, n) {
  var o = Buffer.alloc(n * n), r = p.w / n, x, y, i, j;
  for (y = 0; y < n; y++) {
    for (x = 0; x < n; x++) {
      var s = 0, c = 0;
      for (j = 0; j < r; j++) {
        for (i = 0; i < r; i++) {
          var sy = (y * r + j) | 0, sx = (x * r + i) | 0;
          if (sy < p.h && sx < p.w) { s += p.grey[sy * p.w + sx]; c++; }
        }
      }
      o[y * n + x] = (s / c) | 0;
    }
  }
  return { w: n, h: n, grey: o };
}

//  Centred square crop, as a fraction of the shorter side.
function crop(p, f) {
  var s = Math.round(Math.min(p.w, p.h) * f),
      x0 = Math.round((p.w - s) / 2), y0 = Math.round((p.h - s) / 2),
      o = Buffer.alloc(s * s), x, y;
  for (y = 0; y < s; y++) for (x = 0; x < s; x++) o[y * s + x] = p.grey[(y0 + y) * p.w + x0 + x];
  return { w: s, h: s, grey: o };
}

//  Quarter turn, for the orientation checks.
function rot90(p) {
  var o = Buffer.alloc(p.w * p.h), x, y;
  for (y = 0; y < p.h; y++) for (x = 0; x < p.w; x++) o[x * p.h + (p.h - 1 - y)] = p.grey[y * p.w + x];
  return { w: p.h, h: p.w, grey: o };
}

module.exports = { read: read, rgba: rgba, down: down, crop: crop, rot90: rot90 };
