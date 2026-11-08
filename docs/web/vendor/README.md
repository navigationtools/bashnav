# `docs/web/vendor/` — code this project did not write

Everything else under `docs/web/` was written for bashnav and can be read as
one piece of work. This folder is the exception, and it has exactly one
occupant.

## jsQR 1.4.0

| | |
|---|---|
| File | `jsQR-1.4.0.js` |
| Upstream | https://github.com/cozmo/jsQR |
| Fetched from | `https://registry.npmjs.org/jsqr/-/jsqr-1.4.0.tgz`, `package/dist/jsQR.js` |
| SHA-256 | `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859` |
| Licence | Apache License 2.0 — the same licence as bashnav. Text in `LICENSE-jsQR.txt` (SHA-256 `c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08`) |
| Copyright | the jsQR authors (Cosmo Wolfe and contributors) |
| Modified | **no.** Byte for byte as published |

`docs/web/tests/qr-read.js` checks both checksums on every run, so the file
cannot be edited, re-minified or quietly upgraded without a test failing.

### Why there is third-party code here at all

The iPad cannot read a QR code by itself. `BarcodeDetector`, the browser API
that would do it, is absent on iPadOS 26.6.1 and on iOS — measured on Larry's
own devices with `docs/web/platform/`, not assumed. So reading the watch's
codes means a decoder in the page.

Writing one was the alternative and it was seriously considered. The QR
specification is finite and we have an oracle — the watch's own encoder — so a
generated corpus would have exercised every version, mask and payload and
passed at a hundred per cent. **That number would have been misleading.** A
generated corpus feeds a decoder a clean bitmap; a camera does not. The real
work in a QR reader is everything before the specification starts: binarising
an image with glare across a watch crystal, finding the code in a frame held
at an angle, holding focus at 15 cm, coping with motion and with a dim
red-lit screen at three in the morning. None of that can be tested from a
fixture, and all of it is what a decoder with years of field use already
has.

So what was bought is not an implementation of a published standard. It is
other people's bad lighting.

### Why it is vendored and not loaded from a CDN

These tools work at sea with no signal. A `<script src="https://…">` is a
tool that stops working exactly when it is needed. The same reasoning keeps
every other asset in this repository.

### Why the version is in the filename

So that an upgrade is visible at every place that loads it, rather than being
a silent change to a file whose name stayed the same.

### Upgrading

1. Fetch the tarball for the new version and take `package/dist/jsQR.js`
   unmodified.
2. Commit it as `jsQR-<version>.js` beside this file; delete the old one in
   the same commit.
3. Update the table above, including the new SHA-256, and the checksums in
   `docs/web/tests/qr-read.js`.
4. Update every `<script src>` and every service-worker precache list that
   names the old file. The suite will tell you if you miss one.
5. Run the suite. The watch's real code is a fixture in it, so a new version
   that cannot read it fails before it reaches the boat.

### What happens if it is ever a problem

Nothing in bashnav calls jsQR directly. `docs/web/shared/qr.js` is the only
caller, and everything else goes through that. Replacing the decoder — with
another library, or with one written here — is a change to one file.
