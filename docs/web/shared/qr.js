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
  //  fromVideo(video, canvas) -> the same, for one frame
  //
  //  The CALLER owns getUserMedia and the loop. Deck-log and the probe
  //  want different screens around this; what they share is the frame
  //  grab, which is fiddly and identical.
  //
  //  The canvas is sized to the video's own pixels, not to how big it
  //  looks: a code photographed at 1280 wide and sampled at 320 is a
  //  code that will not decode, and the CSS size of an element has
  //  nothing to do with the camera behind it.
  // ---------------------------------------------------------------
  function fromVideo(video, canvas) {
    var w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;            //  no frame yet
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    var cx = canvas.getContext('2d', { willReadFrequently: true });
    cx.drawImage(video, 0, 0, w, h);
    var img;
    try {
      img = cx.getImageData(0, 0, w, h);
    } catch (e) {
      return null;                        //  tainted canvas; not our case
    }
    return decode(img.data, w, h);
  }

  return { available: available, decode: decode, fromVideo: fromVideo };
})();

if (typeof module !== 'undefined') module.exports = QR;
