// =====================================================================
//  READING A QR CODE -- the one place bashnav talks to a decoder.
//
//  Nothing else in this project calls jsQR. Everything goes through
//  here, so replacing the decoder later -- with another library, or
//  with one written here -- is a change to this file and nowhere else.
//
//  WHY THERE IS A DECODER IN THE PAGE AT ALL. BarcodeDetector, the
//  browser API that would do this, is absent on iPadOS 26.6.1 and on
//  iOS 26. That was measured on Larry's own iPad and iPhone with
//  docs/web/platform/, not read in a table somewhere. The system Camera
//  app does decode, but it has nowhere to put the result: a payload
//  that is not a URL goes to the default browser as a SEARCH, which
//  means a position report leaves the boat, lands in Safari rather than
//  in the installed app's storage, and fails entirely with no signal.
//  All three are disqualifying, and the third on its own would be.
//
//  See docs/web/vendor/README.md for what was bought and why it was not
//  written here.
// =====================================================================
'use strict';

var QR = (function () {

  //  jsQR is a global, loaded by a <script> before this file.
  function reader() {
    return (typeof jsQR === 'function') ? jsQR : null;
  }

  function available() { return !!reader(); }

  // ---------------------------------------------------------------
  //  decode(rgba, w, h) -> { text, version, corners } or null
  //
  //  rgba is a Uint8ClampedArray of w*h*4, which is what a canvas's
  //  getImageData() hands back.
  //
  //  inversionAttempts: 'attemptBoth' because a watch face at night is
  //  white-on-black as often as black-on-white, and the cost of trying
  //  is one more pass over an image we already have.
  // ---------------------------------------------------------------
  function decode(rgba, w, h) {
    var f = reader();
    if (!f) return null;
    var r;
    try {
      r = f(rgba, w, h, { inversionAttempts: 'attemptBoth' });
    } catch (e) {
      return null;              //  a decoder must never take the page down
    }
    if (!r || typeof r.data !== 'string' || r.data === '') return null;
    return { text: r.data, version: r.version, corners: r.location || null };
  }

  // ---------------------------------------------------------------
  //  fromVideo(video, canvas, opts) -> { text, version, corners, how }
  //                                    or null
  //
  //  The CALLER owns getUserMedia and the loop. Deck-log and the probe
  //  want different screens around this; what they share is the frame
  //  grab, which is fiddly, identical, and -- as fourteen photographs
  //  of Larry's watch established -- the entire difficulty.
  //
  //  SMALLER READS BETTER. THIS IS THE OPPOSITE OF WHAT IT SOUNDS LIKE.
  //
  //  Thirteen of those fourteen photographs, 3024x3024 off an iPhone,
  //  decode in 6 to 20 ms when scaled DOWN to 400-700 px. At 1920 and
  //  at full size most of them do not decode at all.
  //
  //  The reason is the binariser. jsQR thresholds in small fixed
  //  blocks, which is the right design when a module is a few pixels
  //  across. Photograph a watch at 3024 and a module is twenty to forty
  //  pixels, so every block lands wholly inside one module, there is no
  //  light and dark in the block to threshold between, and what decides
  //  the block is the screen's own dither -- the LCD pixel grid, which
  //  is plainly visible in the photographs. Scale the frame down until
  //  a module is five to eight pixels and that disappears: the dither
  //  averages away and each block spans an edge again.
  //
  //  So the camera is asked for the HIGHEST resolution it has, and then
  //  most of it is thrown away before decoding. The detail is not
  //  wasted -- it is what survives the downscale as clean edges.
  //
  //  opts.crop (0 < f <= 1): a centred square of that fraction of the
  //  shorter side. It throws away the galley, the horizon and the rest
  //  of the cabin, which are where a binariser otherwise spends its
  //  contrast budget, and it means the pixels that remain are the ones
  //  aimed at. The caller must show the viewer where the crop is; an
  //  aiming box that lies about what is read is worse than none.
  //
  //  opts.sizes: the ladder of widths to try, in order. Each attempt is
  //  one drawImage and one decode of a small image -- 6 to 40 ms -- so
  //  trying several costs less than missing the code and waiting for
  //  the next frame. The order below is the order the photographs came
  //  out in: 500 read most often, 400 and 600 next, 700 recovered a few
  //  that nothing else did.
  //
  //  'how' says which rung won, because "always 400" and "always 700"
  //  mean different things about how the thing is being held, and that
  //  is worth seeing rather than averaging away.
  // ---------------------------------------------------------------
  var SIZES = [500, 400, 600, 700];

  function fromVideo(video, canvas, opts) {
    opts = opts || {};
    var vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;            //  no frame yet

    var sx = 0, sy = 0, sw = vw, sh = vh;
    if (opts.crop && opts.crop > 0 && opts.crop < 1) {
      var side = Math.round(Math.min(vw, vh) * opts.crop);
      sx = Math.round((vw - side) / 2);
      sy = Math.round((vh - side) / 2);
      sw = side; sh = side;
    }

    var sizes = opts.sizes || SIZES, i, n, r;
    for (i = 0; i < sizes.length; i++) {
      n = sizes[i];
      if (n > Math.min(sw, sh)) n = Math.min(sw, sh);   //  never upscale
      if (canvas.width !== n) canvas.width = n;
      if (canvas.height !== n) canvas.height = n;
      var cx = canvas.getContext('2d', { willReadFrequently: true });
      //  Ask for the better downscale filter where it exists. A box
      //  filter at this ratio aliases the very dither we are scaling
      //  away, which would defeat the point of scaling.
      cx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in cx) cx.imageSmoothingQuality = 'high';
      cx.drawImage(video, sx, sy, sw, sh, 0, 0, n, n);
      var img;
      try {
        img = cx.getImageData(0, 0, n, n);
      } catch (e) {
        return null;                        //  tainted canvas; not our case
      }
      r = decode(img.data, n, n);
      if (r) { r.how = n + 'px'; return r; }
      if (n === Math.min(sw, sh)) break;    //  the ladder hit the source size
    }
    return null;
  }

  return { available: available, decode: decode, fromVideo: fromVideo };
})();

if (typeof module !== 'undefined') module.exports = QR;
