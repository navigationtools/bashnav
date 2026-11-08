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
  //  fromVideo(video, canvas, opts) -> the same, for one frame
  //
  //  The CALLER owns getUserMedia and the loop. Deck-log and the probe
  //  want different screens around this; what they share is the frame
  //  grab, which is fiddly and identical.
  //
  //  The canvas is sized to the video's own pixels, not to how big it
  //  looks: a code photographed at 1280 wide and sampled at 320 is a
  //  code that will not decode, and the CSS size of an element has
  //  nothing to do with the camera behind it.
  //
  //  opts.crop (0 < f <= 1) takes a centred square of that fraction of
  //  the shorter side instead of the whole frame. Two reasons, and the
  //  second is the one that matters on a watch:
  //
  //  1. A 1920x1080 frame is fourteen times the pixels of a 390x390
  //     picture, and the decoder's work goes up with it. Cropping keeps
  //     a frame inside the interval between frames, so the camera stays
  //     live instead of queueing up behind the decoder.
  //  2. It throws away the galley, the horizon and the rest of the
  //     cabin, which are where a binariser spends its contrast budget.
  //     A watch face is small and dim; it wants the whole budget.
  //
  //  The caller is expected to show the viewer where the crop is. An
  //  aiming box that lies about what is being read is worse than none.
  // ---------------------------------------------------------------
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

    if (canvas.width !== sw) canvas.width = sw;
    if (canvas.height !== sh) canvas.height = sh;
    var cx = canvas.getContext('2d', { willReadFrequently: true });
    cx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    var img;
    try {
      img = cx.getImageData(0, 0, sw, sh);
    } catch (e) {
      return null;                          //  tainted canvas; not our case
    }
    return decode(img.data, sw, sh);
  }

  return { available: available, decode: decode, fromVideo: fromVideo };
})();

if (typeof module !== 'undefined') module.exports = QR;
