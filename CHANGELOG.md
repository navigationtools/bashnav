# Changelog

## Two photographs of the watch join the suite

**What.** `docs/web/tests/photos/` holds two photographs of the quatix —
700 px, greyscale, posterised, about 300 KB the pair — and
`docs/web/tests/qr-photo.js` decodes them through the same ladder the page
uses, checking the payload byte for byte. `docs/web/tests/png.js` is new: one
copy of the PNG reader, shared with the clean-rendering check.

**Why.** The existing check proves the decoder implements the standard. It
cannot say whether the decoder reads *the watch*, because a rendered picture
has none of what a photograph has: the screen's pixel grid, its dither, the
lens. These two do.

**What it impacts.**

1. **The downscale rule is now evidence, not just a claim.** Neither photo
   decodes at 700 px; scaled down, both do. If someone later removes the
   downscale as a pointless step, this fails and tells them why.
2. **The box average used here is cruder than the browser's**, so passing is
   conservative.
3. **Reading at native size is reported, never asserted.** A check that failed
   on good news would be deleted by whoever met it.
4. **They are published deliberately.** The payloads carry Larry's home
   position, and he ruled on that before they went in.
5. **One photograph was left out.** It decodes under nothing — not this
   decoder, not OpenCV, not zbar — and a fixture asserting "still unreadable"
   would fail the day something improved.

## The QR reader scales the frame down before decoding, and reads 13 of 14

**What.** `docs/web/shared/qr.js` now scales each captured frame down to a
ladder of small sizes — 500, 400, 600, 700 px — and decodes those instead of
the frame as captured. It reports which rung succeeded, and the platform
page prints it (`from the box at 500px`).

**Why.** Fourteen photographs of the watch, 3024×3024, were measured against
the decoder. At full size and at 1920 px most did not decode. Scaled to
400–700 px, **thirteen of the fourteen decoded, in 6 to 20 ms**.

jsQR thresholds in small fixed blocks, which suits a module a few pixels
across. At 3024 a module is twenty to forty pixels, so every block falls
wholly inside one module, there is no light and dark to threshold between, and
the block is decided by the screen's own dither — the LCD grid is visible in
the photographs. Scaling until a module is five to eight pixels removes both
problems at once.

**What it impacts.**

1. **The camera is still asked for its highest resolution.** The detail is not
   wasted; it is what survives the downscale as clean edges.
2. **A ladder rather than one size**, because each attempt is one `drawImage`
   and one decode of a small image, cheaper than missing a code and waiting
   for the next frame.
3. **`imageSmoothingQuality` is set to high** where it exists. A box filter at
   this ratio aliases the very dither being scaled away.
4. **The rung is reported**, because "always 400" and "always 700" say
   different things about how the thing is being held.
5. **The previous change's reasoning was wrong and is corrected in
   `docs/HACKING.md`.** Asking for 1920 was right for capture and useless on
   its own; "it didn't read, so give it more pixels" is the obvious move and
   it is backwards here.
6. **One photograph reads under nothing** — not this decoder, not OpenCV, not
   zbar. A photograph can be too small and too soft, and that is recorded
   rather than smoothed over.

## The camera readout was above the video, where nobody was looking

**What.** The live readout moved from `#qrsay`, which sits above the button,
to a new `#camsay` directly under the video. Starting the camera scrolls the
video and its readout into view together. A successful read turns the aiming
box solid green for 700 ms and prints `read ✓ n distinct codes, n bytes` in
larger type above the detail.

**Why.** Pointed at the watch, the probe appeared to do nothing. It was in
fact reporting every tick — into a paragraph further up a long page, off the
top of the screen, while the viewer was looking at the video and at the watch
in their other hand. A readout that is correct and invisible is the same thing
as no readout, and this is the second time in one evening that this page has
made "no" look like "broken".

**What it impacts.**

1. **A read is now visible without reading.** Both hands are full — a watch in
   one, an iPad in the other — and the text is small. The box going solid is
   the signal; the text is the detail for afterwards.
2. **"Looking… nothing read yet" is stated explicitly**, with the camera
   resolution, frame count and elapsed time beside it, so a page that is
   working and finding nothing cannot be mistaken for a page that has stopped.
3. **The static verdict stays where it was.** `#qrsay` still carries the
   on-load answer about `BarcodeDetector` and the vendored decoder; only the
   live camera text moved.
4. **Verified end to end against a fake camera feed** — chromium driven with
   the watch's own code as the video source — which reads it 15 times out of
   15 frames, from the box, in 41 ms at 1280×720. That exercises the frame
   grab, the crop and the readout; it still says nothing about optics.

## The camera probe said nothing when the answer was no

**What.** The camera test on `docs/web/platform/` now asks for a 1920×1080
stream instead of accepting the default, draws an aiming box over the video,
decodes the centred crop before the whole frame, and reports frames,
resolution, reads and the slowest decode **on every tick** rather than only on
success. `docs/web/shared/qr.js` gains `opts.crop` for the frame grab.
`tests/entity-check.awk` gains one exception.

**Why.** Pointed at the watch, it read nothing and said nothing — which looks
exactly like a broken page. A probe that is silent when the answer is "no" is
not a probe, and that was the first thing to fix, ahead of any theory about
why it failed.

The likely cause is resolution. Left to itself a browser hands out 640×480. A
version-10 code is 57 modules across, so filling a third of a 640-wide frame
gives roughly four pixels per module before the lens and the watch's own
pixels have their say — on the edge, and the edge is where it fails. 1920 is a
request rather than a demand, so whatever actually arrives is now printed on
screen.

**What it impacts.**

1. **The crop is read first, then the whole frame**, and the readout says
   which one worked. A quarter of the pixels keeps a decode inside the gap
   between frames, and it throws away the cabin, which is where a binariser
   otherwise spends its contrast budget. "Only ever the full frame" and "only
   ever the box" mean different things about where to aim, so the distinction
   is reported rather than hidden.
2. **The aiming box matches the crop exactly.** A box that does not is a box
   that teaches the wrong aim.
3. **Decodes no longer queue behind each other.** A `busy` flag skips a tick
   while one is still running, so a slow frame costs a frame instead of
   building a backlog that makes the camera look frozen.
4. **The lint learned an exception the first time it met new code.** The
   readout builds its string across several statements, so the statement scan
   could not see the `innerHTML` at the end, and one of those lines is the
   `replace(/&/g, "&amp;")` escaping idiom — which exists to produce entities
   and is correct. Two of its three flags were right; those became characters,
   and the third became a named exception.

## The row warning not to trust the platform printed an entity

**What.** `docs/web/platform/` showed `Safari reports 18_7 on iPadOS/iOS 26
&mdash; feature-detect, do not version-sniff`, with the entity spelled out on
screen. The string now carries the character. The same page's QR rows were
reordered so the native reader's verdict sits next to the native reader's row
rather than after the vendored decoder's, which could arrive late because it
waits for the picture to load. `tests/entity-check.awk` is new.

**Why.** The table helper assigns `textContent`, which is the right choice —
it cannot inject markup — and which means an entity in the string is four or
five literal characters. Found by Larry on the iPad, in a screenshot of the
row whose subject is that what the platform reports is not what it means.

**What it impacts.**

1. **The lint looks only at JavaScript.** In HTML an entity is correct, so in
   an `.html` file it examines what lies between `<script>` and `</script>`. A
   version without that rule flagged seven good lines of markup, which is how
   a check gets switched off instead of fixed.
2. **It reads statements, not lines.** The string that shipped was folded
   across two lines; a line-at-a-time rule would not have seen it.
3. **It runs under every awk**, like the other lints, and the reason is
   recorded in `docs/TESTING.md`: the last lint written here used a GNU `sed`
   extension and failed on Larry's Mac, and what let it get that far was a
   guard that ran it once rather than per awk.
4. **Nothing else in the tree trips it**, under mawk, gawk and the system awk.

## A QR reader, and the first third-party code in this repository

**What.** `docs/web/vendor/jsQR-1.4.0.js` — jsQR, Apache 2.0, byte for byte as
published — with its licence beside it, its attribution in `NOTICE`, and its
SHA-256 pinned by the suite. `docs/web/shared/qr.js` is the only thing that
calls it. `docs/web/platform/` now decodes the watch's code with it on load,
and its camera button uses it, so the reader can be pointed at the real watch.
Nothing in deck-log is wired to it yet.

**Why.** The iPad cannot read a QR code by itself: `BarcodeDetector` is absent
on iPadOS 26.6.1 and on iOS 26, measured on Larry's own devices rather than
assumed. The system Camera app does decode, but it has nowhere to put the
result — a payload that is not a URL is handed to the default browser as a
*search*, which sends a position report off the boat, lands it in Safari
rather than in the installed app's storage, and fails entirely with no signal.
So the decoder has to be in the page.

Writing one was the alternative, and the reason it was not chosen is worth
keeping. The QR specification is finite and the watch's encoder gives us an
oracle, so a generated corpus would have passed at a hundred per cent — and
that number would have been misleading, because a corpus feeds a decoder a
clean bitmap and a camera does not. The work a QR reader earns over years is
everything before the specification starts: binarising a frame with glare
across a watch crystal, locating a code held at an angle, focus at 15 cm, a
dim red screen at three in the morning. None of it can be tested from a
fixture. What was bought is not an implementation of a published standard; it
is other people's bad lighting.

**What it impacts.**

1. **It reads the watch's actual code, byte for byte** — the real one from
   `qr_ref.py`, version 10, 231 bytes, about 55 ms. The fixture in the suite
   is that code, read out of `docs/web/platform/index.html` so there is a
   single copy of it, checked at four orientations and two scales, with noise,
   a blank frame and half a code required to decode to nothing.
2. **The suite pins both checksums.** A vendored file nobody watches is not
   vendored; this one cannot be edited, re-minified or upgraded without a
   failure and a decision.
3. **One caller, one file to change.** If jsQR ever disappoints, replacing it
   touches `docs/web/shared/qr.js` and nothing else.
4. **What is still unproven is the camera**, which is the whole reason a
   library was taken. The suite is deliberately silent about it rather than
   appearing to cover it; the camera button on the platform page is where that
   gets answered, on the foredeck.
5. **deck-log is not wired to it yet, on purpose.** What the scan screen does
   with the text depends on D10 — whether the watch's codes carry NT1 — which
   is an open question in the inbox. Building an importer for a format that is
   about to change is the one way to waste this work.
6. **`docs/web/platform/` also stopped repeating a platform lie.** Safari caps
   the iPadOS version it reports: 26.6.1 arrives as `CPU OS 18_7`. The page
   now says so beside the readout, and `docs/HACKING.md` records that a
   session was misled by it. Feature-detect; never version-sniff.

## The NT1 check code becomes a CRC-16, and stops pretending to be a signature

**What.** `docs/web/deck-log/nt1.js` — the shared module that writes and reads
NT1, the format observations travel in by inReach — now computes its four-
character check code with **CRC-16/CCITT-FALSE** (polynomial `0x1021`, initial
value `0xFFFF`, no reflection, no final XOR), written as upper-case hex, over
the UTF-8 bytes of the normalised piece. It replaces a keyed FNV-1a mix, and
the secret that went with it is gone from the module, from `encode()` and from
`decode()`. Contract `spec/contracts/navigationtools_inreach_transport.md` is
at v0.9.

**Why.** Two reasons, and the second is the one that matters.

1. **The keyed hash was defending against the wrong failure.** It tried to
   prove who built a piece. Twenty bits cannot do that, and nothing needs it
   to: every inReach mails from the same `garmin.com` address, so the Email
   Worker requires DMARC for that domain and holds what fails it. What
   actually goes wrong to a piece is mechanical — cut short by a character
   limit, pasted from part of a screen, folded by a mail client — and a CRC
   catches exactly that.
2. **Three programs have to agree on these four characters,** and one of them
   is the watch, in Monkey C, which cannot load this file. A standard
   algorithm has a published definition and a test vector, so the watch can be
   written from the specification and check itself (`123456789` → `29B1`)
   before it ever sends a message. An algorithm invented here could only be
   copied, and a copy that drifts by one bit produces messages that arrive and
   cannot be read.

**What it impacts.**

1. **Any NT1 message built before this change will not verify after it,** and
   the reverse. Nothing has been sent yet, so nothing is lost; if that stops
   being true, the piece can still be read with `decode(piece, {check: false})`
   and the held store exists for exactly this.
2. **The Send screen and settings lose the check-code secret** before they are
   built — it is no longer a setting, because there is no secret.
3. **The website's Email Worker takes a copy of this file** (decision D6) and
   must be updated with it; a Worker still running the keyed version will
   reject every piece.
4. **`docs/web/tests/nt1-roundtrip.js`** grows the published vector, a check
   that the worked example in the module header is a real code, and a
   truncation case. 49 checks, all passing.
5. **The transcription property survives the change.** The old base32 alphabet
   left out `0`/`O` and `1`/`I` for someone reading a code off a screen;
   upper-case hex has no letter that can be mistaken for a digit at all.

## Seven UK tide stations carried another station's name

**What.** Seven of the sixteen UK stations from the Channel Coastal Observatory
(the `ticon/*-cco` records) had the right constants and the right position
under the wrong name. Searching for "West Bay Harbour" returned Port Isaac's
tide; "Scarborough" returned West Bay Harbour; "Brighton" returned Hastings,
and so on round a closed loop of seven. Corrected in `src/tides/stations.dat`:

| Station id | Was named | Now named |
| --- | --- | --- |
| `ticon/brighton-btn-gbr-cco` | Teignmouth Pier | Brighton |
| `ticon/hastings_pier-hgp-gbr-cco` | Brighton | Hastings Pier |
| `ticon/port_isaac-pti-gbr-cco` | West Bay Harbour | Port Isaac |
| `ticon/scarborough-sca-gbr-cco` | Severn Bridge | Scarborough |
| `ticon/severn_bridge-ssc-gbr-cco` | Port Isaac | Severn Bridge |
| `ticon/teignmouth_pier-tnp-gbr-cco` | Hastings Pier | Teignmouth Pier |
| `ticon/west_bay_harbour-wbh-gbr-cco` | Scarborough | West Bay Harbour |

**Why.** The id, the position and the constants of each record already agreed
with each other; only the name had moved. The current Neaps tide-database
names each of these files correctly, so the names now match the id, the
position and upstream. Only the name field changed: no constant, position or
station was added or removed.

**What it impacts.**

1. **`tides find` by name** now returns the station you asked for. Before, a
   name search for any of the seven gave a curve for a port up to 400 miles
   away, with nothing on the screen to say so. "Nearest to a position" was
   always right, because it uses the coordinates.
2. **West Bay Harbour sits on the Myth of Malham and Fastnet course** (Lyme
   Bay), which is how this was found: mapping the coastal navigation course
   against the stations along the route.
3. **The browser build:** `stations.dat` and `stations.idx` are regenerated
   (byte offsets after these lines move), and the tides worker goes to
   `tides-v4` so installed copies fetch the new index.
4. **`bin/tides` and `release/bashnav-ipad.sh`** are rebuilt from the
   corrected file.

## The address changed: `bashnav.navigationtools.org`

**What.** The site is served at **`https://bashnav.navigationtools.org/`**, and
the repository is `github.com/navigationtools/bashnav`. Every live link names
one or the other: the help text in all six tools, the issue link
`colregs review` builds, the README and the site's own pages.

**Why.** bashnav moved into the `navigationtools` GitHub organisation, the
shared home for the navigation tools — and the site went straight to a custom
domain rather than to the organisation's `github.io` address. Browser storage
belongs to the origin, so the address is worth settling once. `bashnav.navigationtools.org`
is a name Larry owns: if the site is ever hosted somewhere other than GitHub
Pages, the address goes with it, and so does every deck log saved against it.

**The `/bashnav/` path segment is gone.** On a Pages default address the site
would sit under `navigationtools.github.io/bashnav/`; on its own subdomain it
sits at the root. The launcher is `/web/`, a tool is `/web/<tool>/`. Nothing
inside the apps needed changing for that — every service worker registers
`sw.js` with no leading slash and every manifest uses `"./"` — so they serve
correctly at whatever depth they are given.

**What it means for you.**

1. **Old repository links redirect; the old site address does not.** GitHub
   forwards the web, clone and push addresses of a transferred repository.
   It does not forward `larrys614.github.io/bashnav/`, which simply stops
   working.
2. **The iPad needs the new address added to the Home Screen once.** The old
   icon keeps working offline from its cached copy until you replace it, which
   is a convenience and not a fallback: it will not receive another update.
3. **The new address starts with empty browser storage.** A deck log in
   IndexedDB and a loaded drill pack are keyed to the origin that saved them,
   so they stay at the old address, on the device that wrote them. Nothing in
   the browser can carry them across. Export anything worth keeping before you
   rely on the new address.
4. **Links already shared** — crew, Clipper — point at the old Pages address
   and need replacing.

Both addresses are single settings rather than literals spread through the
tools. `GH_USER` in `src/colregs/10-head.sh` and `GH` in `docs/make-site.sh`
carry the repository owner; `SITE` in `docs/make-site.sh` carries the site,
substituted into the template as `{{SITE}}`. `docs/index.html` is generated
from `docs/site-template.html`, and `bin/` and `release/bashnav-ipad.sh` are
built from `src/`. The only hand-edited references are the ones in prose.

`docs/CNAME` is what tells GitHub Pages to serve the custom domain. It holds
one line and must stay in `docs/`; without it the site reverts to the
`github.io` address, and every browser-stored deck log is orphaned again.

Earlier entries below keep the old address: they record what was true when they
were written.

## The other half of the a-Shell story

a-Shell's author replied to the heredoc report:

> a-Shell has two shells: the default version, extremely lightweight … With the
> consequence that it is not fully POSIX compliant. The issue you pointed is one
> of the places where it is not complete. … For your use case, I recommend using
> `dash`.

So the heredoc failure was the lightweight default shell, and `dash` ships
alongside it and is compliant. Confirmed on the device: under `dash`, a heredoc
works.

**But it does not fix the second fault, and that one was worse.**

    { echo "cmode=$cmode"; echo "lon=$lon"; } > "$CONF"

a-Shell keeps only one line of that. `dash` does not change it, which means the
fault is not in the shell but underneath it. And the shape of it is nasty: the
config file comes back with a single line, `load_conf` reads nonsense, and the
tool hangs on the **next** launch — so the damage shows up after the run that
caused it, with no error and a clean exit status.

Seven of them, one or two in every one of the five tools: every config file and
every progress file. All now single `printf` calls, which is verified on the
device:

    printf '%s\n' a b >t     ->  a and b, on two lines.  Correct.
    { echo a; echo b; } >t    ->  fails.

Config round-trips checked for every tool — `celnav` 9 lines, `deck-log` 3,
`tides` 3, `colregs` 2, `weather` 2 — written, read back, and surviving a
relaunch.

`tests/heredoc-check.sh` becomes **`tests/ashell-check.sh`** and now covers both
constructs a-Shell cannot run, over `src/` and over the built tools up to the
payload marker. `build.sh` is exempt from the redirect rule: it runs on a
developer's machine and its own `{ … } > "$out"` is how each tool gets written.
Watched failing before being trusted.

### An awk named by hand is checked before it is used

Found while running the matrix in a fresh container with no `gawk`. Forcing
`CELNAV_AWK=gawk` was taken on faith, so the first thing that failed was the
unpacker:

    bashnav: could not write engine-1.6.awk

which names the wrong thing entirely. On a device with no debugger that is
hopeless. Each tool now runs the named awk once before trusting it:

    celnav: CELNAV_AWK is set to 'nosuchawk', which will not run.
      Unset it, or name an awk that is installed.

### The status notice is current again

The README listed two fixes and one open item. It now lists four and two: the
heredoc and the compound redirect join `$HOME` and `/tmp` as fixed, and `[ -t 1 ]`
returning false and the missing `ps` are named as still open. It also tells
a-Shell users to type `dash` once — not because the tools need it any more, but
because everything else they run there will behave better.

**Still not claimed: that the suite runs end to end on an iPad.** Nobody has run
this build on the device.

## The installer now knows how big it should be

Larry hit a 404 on the `curl` line. The file was fine and the push had landed —
he was using the URL from an earlier message, the `releases/latest/download/…`
one that never existed. The repository copy answers 200 at 3,404,214 bytes.

Nothing to fix in the code, but the question exposed something worth fixing on
sight: **a short download of a self-extracting script installs half a tool and
says nothing.** `sh` treats end-of-file as the end of an unterminated heredoc,
so the last payload is written out truncated, no error is raised, and the exit
status is 0. Same shape as the truncated log record that took a full byte-offset
sweep to find.

`bashnav-ipad.sh` now carries its own byte count and checks it before touching
anything, reporting a short download and an over-long one differently — a file
that grew has usually had its line endings rewritten in transit. The stamp is
fixed width (`__BYTES__` is nine characters, the number zero-padded to nine)
because a substitution that changed the file's length would falsify the number
it was writing; `make-ipad.sh` re-measures afterwards and fails the build if the
size moved. It caught that on the first attempt — a ten-digit pad into a
nine-character slot.

Covered in `tests/ipad-install-check.sh`: the stamp must equal the real size, a
truncated installer must refuse and install nothing, and an over-long one must
refuse too. Watched failing with the guard removed.

## The iPad installer is committed, not gitignored

Larry: *"lets fix it and push it."*

`release/bashnav-ipad.sh` was generated and ignored, and the README's install
line pointed at `releases/latest/download/…` &mdash; a URL that would exist only
after somebody cut a GitHub release by hand. That is a step to forget, and it
would be forgotten while the README told iPad users to `curl` a 404.

It is tracked now, and the install line points at the file in the repo:

    curl -O https://raw.githubusercontent.com/larrys614/bashnav/main/release/bashnav-ipad.sh

which works the moment a change is pushed. CI checks it is not stale exactly the
way it checks `bin/` &mdash; regenerate, then `git diff` &mdash; because a stale
installer hands an iPad an older tool than the repository claims and nothing on
the boat would say so. That check was watched failing before it was trusted: the
first version of it passed against an untracked file, which proved nothing.

The cost is real and is written down in `REPO-STATE.md`: the installer is a copy
of all six binaries, so every change to any tool adds ~3.4 MB to git history. If
cloning ever becomes unpleasant, the way back is a release asset.

## The iPad release: one file, one command

Larry wanted a download-and-run install, and icons on the home screen.

**`bashnav-ipad.sh`** &mdash; one self-extracting script, 3.4 MB, built by
`release/make-ipad.sh` from `bin/`. `chmod +x`, run it, done.

He asked for two downloads, a tarball and a script. It is one, and the reason is
the platform: **a-Shell does not guarantee `tar`, and it definitely has no
`unzip`** &mdash; that needs `pkg install zip`, which needs the network, which is
the one thing this suite is built never to need. An installer whose first act is
to require a tool the platform may not have is an installer that fails on the
boat. So the tools travel inside the script as quoted heredocs, exactly the way
each tool already carries its own awk engine. `sh` is the only dependency, and
you have that or you could not run the installer.

What it does: writes the six tools into `~/Documents`, makes them executable,
**runs every one of them to prove it worked**, and adds a marked block to
`~/Documents/.profile` &mdash; PATH plus the five `*_HOME` variables &mdash; so
that in a new a-Shell window `weather` is a command. Run it twice and nothing is
deleted, your own `.profile` lines survive, the managed block is replaced rather
than duplicated, and the first `.profile` it met is backed up beside itself.

**Icons: a script cannot make one**, and it says so. On iOS only the Shortcuts
app can add to the home screen, and only when a person does it. What the
installer does instead is put the command on the clipboard (`pbcopy`, if
a-Shell has it), print the four-step recipe with the **In App** setting spelled
out, and tell you that `open shortcuts://` takes you there.

### A write probe that killed the installer

    mkdir -p "$d" 2>/dev/null && : > "$d/.wtest" 2>/dev/null

Two faults in one line, both invisible until the directory exists and cannot be
written &mdash; which is exactly `$HOME` on an iPad:

1. **The error reaches the terminal anyway.** Redirections apply left to right,
   so the failing `>` reports before the `2>/dev/null` meant to silence it.
2. **Under `dash` the script exits.** `:` is a POSIX *special built-in*, and a
   redirection error on a special built-in terminates a non-interactive shell.

The installer printed `cannot create /…/.wtest` and stopped dead after "checking
they run". `bash` survived and only leaked the message, which is how something
like this reaches a user at all. `( : > … )` fixes both.

The same line was in `src/common/05-home.sh` &mdash; yesterday's fix for the iOS
`$HOME` bug &mdash; and in `celnav doctor`. Fixed in all three.

### And `/tmp` is not promised either

`deck-log` and `weather` built each record in `${TMPDIR:-/tmp}`. iOS gives an app
`Documents`, `Library` and its own `tmp`; there may be no `/tmp` at all. Both now
use the tool's own data folder, which was probed for writability at startup.

### The suite got slower, then didn't

The installer, launcher and `$HOME` checks exercise `sh` and not `awk`, so
running them for every shell × awk pair did identical work twelve times. They now
run once per shell. Written as `if [ "$AW" != "$FIRSTAWK" ]; then :` and not as
`&&` on the check itself &mdash; `if [ … ] && o=$(check)` sends every skipped
pass down the `else` branch and reports a failure, which would have been a worse
bug than the slowness.

## The iPad bug: none of the tools could start on an iPad

Larry, from the boat: *"when i try and run the apps in a-shell i get a could not
create container error"*, then the path — `/private/var/mobile/Containers/Data/
Application/<uuid>`.

That was our own message: `celnav: cannot create /private/var/mobile/Containers/
…/.celnav`. The word he picked out of it, *container*, was in the path and not
in the verb. His report was accurate; reading it as a diagnosis cost the first
round, which is the third time on this project.

**The bug.** a-Shell's own README: *"In iOS, you cannot write in the `~`
directory, only in `~/Documents/`, `~/Library/` and `~/tmp`."* `$HOME` there is
the app's iOS data container. Every tool kept its engine, its config and the log
in `$HOME/.<tool>`, so **not one of the six would start on an iPad** — the only
platform this project has ever been for.

It survived a full shell × awk matrix, CI, a published release, five tools and a
launcher, because every machine the suite runs on has a writable `$HOME`. **A
test environment that shares an assumption with the code cannot test that
assumption.**

**The fix.** `src/common/05-home.sh`, spliced into every tool by `build.sh`,
takes the first of `$HOME`, `$HOME/Documents`, `$HOME/Library` that it can
create **and write a file in** — proved by writing, not guessed from the
platform, because nothing distinguishes a-Shell by name and the next constrained
platform will not announce itself either. `$HOME` is tried first, so nothing
changes on macOS, Linux, the BSDs or Termux; on a-Shell it lands in
`~/Documents/.celnav`. `<TOOL>_HOME` still overrides everything and skips the
probe.

`celnav doctor` and `tides where` print the folder that was actually chosen.

**The test.** `tests/ios-home.sh`, in the matrix, two ways:

- a `$HOME` whose dotfolder cannot be created — portable, runs as any user
  including root, and covers the fallback
- a `$HOME` with the write bit off — the real iOS condition. It needs a uid that
  `chmod` applies to, so under root it uses `setpriv`; where it cannot run it
  prints **SKIP** rather than passing quietly

It checks more than a version string: `tides` must unpack 2.9 MB and find
Falmouth, `celnav doctor` must report the folder writable and name it, and on a
normal machine the folder must still be `$HOME/.celnav` and not `~/Documents`.

I watched all five tools fail it before the fix.

**The README was also wrong about why.** It said `cd ~/Documents` mattered
because otherwise the tools "will not be able to create the folder they keep
their engine and your log in". The folder was under `$HOME` whatever directory
you stood in, so that advice never helped. Corrected, with a-Shell's rule quoted.

## bashnav 1.0 - one icon on the home screen

Larry: *"is there a way to make them icons on the screen, and have them launch
in a terminal?"*

Yes, twice over, and the two answers are different.

**Per-tool icons.** a-Shell ships an **Execute Command** action for Shortcuts,
and a Shortcut can be added to the home screen. The one thing that has to be
right is not obvious: the action must be set to run **In App**, not **In
Extension**. a-Shell prefers the extension because it is faster, and the
extension is *"a lightweight version of the App, without no graphical user
interface"*, while In App *"opens the main application to execute the
shortcut"*. Every tool here draws a menu and waits for a keystroke, so in the
extension there is no terminal to draw on and nothing to read the key from. The
recipe is in the README under **An icon on the home screen**.

**And one icon for all of them** - `bin/bashnav`, the launcher. Pure `sh`, no
awk, no engine, nothing to extract, 3.4 KB.

    bashnav              the menu
    bashnav tides        run one directly
    bashnav tides near   arguments pass straight through
    bashnav where        where each tool was found

It searches beside itself, `./bin`, `~/Documents`, `~/bin`, `.`, then `PATH`.
`~/Documents` is in that list deliberately: it is the only place iOS lets an
app write, so it is where an iPad user's tools actually are. A tool it cannot
find is **still listed**, marked `-- not found --`, with the places it looked -
a launcher that silently hides a tool one directory away has become the problem
it was built to solve.

One icon rather than five is also the honest answer for a boat. Cold hands, wet
screen: one icon and a five-line menu is easier to hit than picking the right
one of five icons on a page of forty.

`tests/launcher-check.sh` covers six things, including one that has bitten this
README repeatedly - **the menu block in the README is diffed against the menu
the program prints**, so it cannot drift the day a version number changes.

### Also

- **The README carried a duplicate `## Why it is built this way` and a second,
  stale `## Install`** - the old one, still saying "Both tools" and listing
  only `celnav` and `colregs`. `install-check.awk` passed the whole time
  because the *new* section satisfied every one of its conditions; the check
  asks whether the facts appear somewhere, and both sections were somewhere.
  Deleted. A lint that scans for a fact cannot see a contradiction.

## weather 1.0 - its own tool, with the teaching in it

Larry: *"i think it perhaps should be its own app... separate app everything we
discussed."* He was right, and for a better reason than size.

`deck-log`'s own governing rule is that the log records what happened on this
boat and training never writes to it. A weather app with lessons and drills IS
training - the same animal as `colregs` and `seamanship`, not the same animal
as a log. Trying to be both is exactly why the teaching material got left out
of the first build: the operational half went in and the pedagogy had nowhere
to live.

    weather what        what your log says is coming, and why
    weather learn       ten lessons
    weather chart       reason over a 500 mb radiofax chart
    weather forecast    yours first, then mine, then both are scored
    weather score       how you, the rules and persistence are doing

`deck-log` captures and owns the log; `weather` reads it. No second store, no
duplication - which is what the shared record format was designed to allow.
`log.awk` and the colour helpers moved to `src/common/`.

### Ten lessons, and one rule for all of them

**A piece of physics has to earn its place by changing what the app says or
what you would do.** Otherwise it is a lecture with a barometer attached.

`fluid` `data` `tide` `coriolis` `gradient` `lapse` `cells` `h500` `cyclone`
`seasons` - air as a fluid and warm moist air being *lighter*; the three kinds
of weather data and why a GRIB is the one to distrust; the atmospheric tide;
Coriolis and why no cyclone forms on the equator; friction and the chart-to-deck
translation; lapse rates and where the cloud base really is; the heat engine and
the deserts at 30 degrees; the 500 mb chart and the 564 line; the five
ingredients of a cyclone; and the tilt.

The last one says plainly where the physics stops being any of a sailor's
business. Precession is real and drives ice ages and **nothing on a passage
depends on it** - and saying so is the rule working, not an exception to it.

### The six dead fields, now used

An audit found that `cl`, `cm`, `ch`, `vis`, `pchg` and `swht` were asked for
every three hours and **never read by anything**. Asking somebody at 0400 for
three cloud codes and never mentioning them again is how you teach them to stop
filling in the form.

The cloud-type codes now drive the **warm-front sequence** rule - cirrus
thickening to altostratus to nimbostratus, a front announcing itself hours
ahead - which is what those three fields are *for*. Visibility trend is read
too.

### The 564 line

`weather chart` takes three numbers off a radiofax chart and walks Chesneau's
rules with the working shown: the storm track 300-600 nm poleward and parallel;
all the gale force winds on the poleward side, which is the routing rule;
systems moving at a third to a half of the 500 mb wind; and the surface wind
behind at about half of it.

### tests/fnvar-check.awk

**A function name used as an ordinary variable**, which is the other half of
what `fnparam-check` catches - and it bit within the hour: `teach.awk` defined
`p()` while `screens.awk` used `p` as a local, and the tool died at startup with
a message about a space before a bracket that tells you nothing at all. The
lint now runs over every engine as the program it actually is.

## deck-log 1.1 - the learning loop

The weather section completed: forecast, verify, score.

    deck-log forecast    yours first, then mine, then both are scored
    deck-log score       how you, the rules and persistence are doing

**You forecast first, and the app shows nothing of its own until yours is
written down.** Print the machine's guess first and the person has not
forecast anything - they have read an answer and agreed with it. It feels like
learning and is not. Same bug as the colregs lights quiz printing the aspect
and then asking for it; the house rule is now **never tell before you ask**,
and `tests/forecast-order.sh` enforces it as an ordering property of the
transcript and of the log.

**Three are scored, not one.** Scoring only the user would make the app an
oracle and it is not one: every rule in it is a rule of thumb. Scoring the
rules keeps it honest, teaches calibration - a rule right seven times in ten is
useful *once you know it is seven in ten* - and lets the user win, which is the
point, because a training tool that cannot be outgrown is badly built.

The third is **persistence**: "in twelve hours it will be much as it is now."
It is the honest floor, it is hard to beat at short range, and a forecast that
does not beat it has shown no skill at all.

Weighted error points from the WxChallenge - half a point per knot, one per
millibar, a tenth per degree - so a near miss scores like a near miss rather
than as a failure.

### What the tests caught

- **The valid-time calculation returned the year 4600** for a date in 2026.
  Date arithmetic written from memory is a reliable way to be confidently
  wrong. `tests/date-check.awk` now round-trips every day for forty years and
  checks every valid time lands on a synoptic hour and in the future.
- **Wind direction had to be scored on the circle**: 350 against 010 is 20
  degrees, not 340. Scored linearly, every forecast near north would have been
  marked a catastrophe, and it would have looked for a whole season like the
  forecaster being bad at north.

`tests/score-e2e.sh` checks all three scores against an answer worked by hand
in the comments, so the arithmetic can be verified by reading it.

## deck-log 1.0 - the boat's records

The fourth tool. The deck log, the engine log and the provisions list in one
place, because they are the same book with different tabs.

    deck-log            the menu, and the three-hourly entry
    deck-log inspect    the engine checklist
    deck-log job        work done, and the part it used
    deck-log shopping   the list for the next port
    deck-log what       what the log says about the weather

**The record format is the one irreversible decision in the tool**, so it was
built and tested first, before anything that uses it.

- **Append only, UTC, corrections as new entries** that reference the old one,
  with both visible for ever.
- **Values are percent-encoded** for `| = %` and newline. Free text will
  contain the delimiters - `note=belt squeals|check at 1300hrs`, a plate
  reading `E/G 3TNV88=B` - and unescaped those still LOOK like records, just
  with the wrong field count and the tail gone. Silent, and permanent.
- **Every record ends with a `~`,** and that came out of the truncation test.
  Kill the app mid-write and the half-line left on disk is structurally
  perfect: right timestamp, right type, every field well formed. Nothing
  distinguished it from a finished record, so a reader accepted it and quietly
  lost whatever never reached the disk. A truncation cannot forge the marker,
  because `|` is encoded inside values.
- **Four states, not two**: a value, a zero (which is a reading), `-` asked and
  not taken, `/` could not be observed, and a key absent because it was never
  asked.
- **Inventory is derived, never stored.** The catalogue is registry; the count
  is a replay of the log. A stored count drifts, and then you have two numbers
  and no way to know which lied.
- **Stock is keyed by part alone.** The first version keyed it by part *and*
  the equipment a job named, which looks careful and is wrong: cannibalise the
  main engine's impeller for the generator - exactly when a boat does that -
  and a second bucket appears, the holding never drops, and the shopping list
  stops asking for the part you just used.
- **Open defects.** A "needs attention" is not an event that ends when it is
  written; it stays open until a job records that it closed it.

### The weather reasoning

Reasons from the observations in the log and shows its working. Barometric
tendency **corrected for the daily atmospheric tide** and said out loud - in
the tropics the glass falls 2-3 mb every afternoon in fine weather, and a
sailor who does not know that reads it as a system approaching. Backing and
veering, Buys Ballot, fog from dew point against sea temperature, cloud base
from the spread over 2.5 C per 1000 ft, and long-period swell as the earliest
warning there is.

The observation form follows NOAA's Voluntary Observing Ship standard: its
coded fields are exactly the ones a human estimates by eye, so a menu here is
the standard rather than a coarsening of it.

**Buys Ballot pointed at the wrong half of the sky** in the first version -
080 for a low that was at 260 - and it took a test sweeping all 360 degrees to
find it. Plausible-looking, completely wrong, and the sort of thing that
survives a read-through.

### Testing

New in kind, because everything before this was stateless. `tests/log-check.awk`
(27 assertions on the record layer), `tests/log-trunc.sh` (truncate at every
byte offset inside the last record), `tests/wx-check.awk` (the rules over their
whole range, including all 360 degrees of Buys Ballot), and
`tests/decklog-check.sh` (end to end: registry, job, derived holding, shopping
list, and append-only across every write path). Every one was watched fail
before it was trusted.

`docs/HACKING.md` gained the gotcha that cost the most: **mixing `-f file` with
an inline `awk 'BEGIN{...}'` makes the inline program a filename.** awk looks
for a file called `BEGIN{...}`, does not find it, and exits 0 having run
nothing. A truncation test written that way reported success across 86 offsets
while executing no test code at all.

## Documentation - so this can be picked up cold

Four documents so a later session, or anybody else, can understand what is
here without reading eight thousand lines of awk:

- `CLAUDE.md` - the orientation file. What this is, the five rules that break
  things silently, and where to look next.
- `docs/ARCHITECTURE.md` - why one tool is one file, how the engines are
  packed as heredocs and extracted on first run, the strict shell/awk split
  and the `cmd=` engine interface, the tide data pipeline and its licensing.
- `docs/HACKING.md` - the portability traps, each tied to the bug that taught
  it: awk built-in variable names, parameter/function shadowing, mawk
  resolving functions at parse time, the tty test inside a command
  substitution, `while read ... done < file` eating the loop body's stdin.
  Plus the full bug ledger.
- `docs/TESTING.md` - what the suite checks and why each check exists, why
  validation is against NOAA's published tables rather than another
  implementation, and the two things that still need a human eye.

`REPO-STATE.md` rewritten - it still said MIT and "nothing is published yet".

Also: the README described "the two questions a tide table is actually for -
is there enough water, and does the mast clear the bridge." That was a tidy
pair rather than an honest ranking. Enough water is the real question;
clearance is narrow. Corrected, and a paragraph added saying plainly that a
tide height is not a tidal stream - the rise and fall is the vertical, set and
drift is the horizontal, and nothing in this tool predicts a current.

## README - the lights picture was never rendering

An unclosed ```` ```sh ```` fence in "Colour and night vision" swallowed the
whole block that follows it: the `<img>` for `colregs-lights.svg`, the
`<details>` around the copyable text, and the plain-text version of the
picture itself. GitHub printed the img tag as source and rendered no image at
all - and a missing picture and a colourless one look identical from the
outside, which is how it was reported and why it took three rounds to find.
The picture itself was correct the whole time.

Fixed, and `tests/readme-check.awk` now runs in the suite: fences must close,
`<details>` must balance, every `<img>` must sit outside every fence and point
at a file that exists, and all four pictures must be present. All three
failure modes were watched fail before the check was trusted.

## tides 1.1 - 2026-08-29

Finding a station without knowing its name.

Typing a station's exact name was hopeless, and that put the whole tool
behind a wall: the database calls a place `NEW LONDON  State Pier`, or
`Chappaquoit Point  West Falmouth Harbor`, and nobody guesses that.

- **Every word has to appear, in any order, anywhere inside a word.**
  `lon new` finds New London just as well as `new london` does, and both
  find it whatever the database calls it.
- **Regular expressions**, used automatically the moment the text
  contains any of `^ $ . [ ] | ( ) * + ? { } \` - `^st mary`, `bay$`,
  `falmouth|mystic`, `port.*bay`, `^boston$`. The pattern is matched
  against the name, the state and the country *separately*, so anchors
  anchor to the name rather than to the three fields run together.
- **A malformed pattern is caught before it is used.** awk cannot catch a
  bad regular expression - it aborts the run - so the pattern is checked
  first and anything that fails the check is searched as plain text.
  Refusing to answer is worse than answering the obvious way.
- **The list is ranked**, so a place whose name *is* what you typed is not
  buried under thirty places that merely contain it.
- **Searching from the menu keeps asking** until you choose something or
  give up. A first guess is usually wrong, and walking back out to the
  menu to try again is what makes people stop looking.
- The list drops the station id, which can run to seventy characters, and
  shows the rest of the name, the state and which dataset it came from -
  which is where the disambiguation actually lives.
- The number you pick now comes from a machine-readable list the engine
  writes during the same run that drew the screen, rather than from
  scraping the drawing. A station called "Pier 39" would have broken that.

## tides 1.0 - 2026-08-29

The third tool. Harmonic tide prediction with no network and no
subscription: 8,334 stations, 6,090 with their own harmonic constants and
2,244 that offset from a neighbour, which is exactly how a printed tide
table is built.

    tides near 41.2333 -72.0833     the stations nearest a position
    tides find "new lon"            or by name
    tides use noaa/8461490          choose one
    tides today                     the table, the curve, and now
    tides sky                       the same, with the moon and the sun

- **The day's table** in the station's own standard time, no summer time,
  exactly like a printed table - that is what the offsets in the data are
  referenced to.
- **The curve**, 24 hours across with the turns marked and now shown.
- **The moon and the sun**: rise, set, civil twilight, the phase drawn
  from its terminator, and whether this moon is springs or neaps.
- **Depth and clearance** - the two questions a tide table is actually
  for. Charted depth plus tide against your draught and the water you want
  under the keel, reported as the stretches of the day when there is
  enough; and a bridge's charted height minus the tide against your air
  draught.

Checked against NOAA's own published tables rather than against another
implementation of the same theory: 24 turns at six stations spanning small
and large ranges, mixed and diurnal regimes. Mean 2.4 minutes and 1.0 cm,
worst 5.9 minutes and 2.0 cm. The fixture is committed, so it runs offline.

Three bugs found by that comparison, all invisible to a test that only
checked the code against itself: a rate variable named RS (awk's record
separator, which made the next getline swallow the whole station file),
shallow-water constituents left with a speed of zero (every overtide
became a DC offset that drifted with the date), and SA carrying Foreman's
Doodson numbers while the constants are referenced to h alone - a phase
thrown by 283 degrees, worth 8 cm in August and -6 cm in February.


## celnav 1.6 - 2026-08-29

Added
- The plot legend now says why a near-vertical line of position steps a
  column part way down, and how far off vertical that is in miles. It
  looks like a drawing fault and is not: a cell is half as wide as it is
  tall, so a line within a couple of degrees of vertical must either step
  once or be drawn wrong - and one degree over the height of the sheet is
  a real distance, not a rounding error. Reported by a reader who counted
  the columns.

## colregs 1.15 - 2026-08-29

Fixed
- **Picking a section in `colregs review` ignored everything you typed.**
  The loop read the key list with `while read ... done < keyfile`, which
  redirects the loop body's stdin to that file - so every prompt inside it
  read the next KEY as if it were the answer, and the whole section
  scrolled past unanswered. "Carry on from where I left off" was fine;
  choosing Encounter verdicts, or any other section, was not. Now tested
  by driving the session the way a person does, which is the only way this
  class of bug is ever visible.
- The issue link no longer asks for a `review` label. A label that does not
  exist in the repository is one more thing that has to be set up
  correctly before a stranger's careful review will go anywhere, and the
  title already says what it is.
- If the link cannot be found, the tool now says why: the repository is not
  published yet, nothing was lost, and the report is a file on your own
  machine that can be sent whenever it is up.

## colregs 1.14 - 2026-08-29

Added
- **`colregs review`** - the claims no test can check, put to a person one
  at a time, with the drawing in front of them. All 153 of them: the 28
  encounter verdicts first because they say what to DO, then the 65
  distinct give-way calls, the 20 light tables, the lesson answers, the
  sound signals and the day shapes. Each says what the program claims and
  which rules to check it against. Mark it right, mark it wrong and say
  why, or skip. Progress is a file in your own home directory and the
  session resumes where you left it.
- **Sending it back, without a network.** `review` then builds a report and
  prints a link that opens a GitHub issue with the findings already in it.
  The program does not send anything: you open the link, and GitHub signs
  the issue with your own account. So there is no credential in this
  open-source code to leak, no server for anyone to run, and no email
  address collected by anybody - the identity comes free from GitHub. A
  review too long for a URL is written to a file instead, with the same
  instructions, rather than being silently truncated.
- Your drill record can be attached to the report as signal for triage. It
  is not a gate: a reviewer who disagrees with the program is the one most
  worth hearing from, and a score threshold would select precisely for
  people who agree with it.
- `CONTRIBUTORS.md`, opt-in and name only.
- **A test that neither tool can reach the network** - no curl, wget, nc,
  /dev/tcp, no URL read with getline, nothing piped to a fetcher. The
  founding promise of both tools is now enforced by the build rather than
  by good intentions. Verified to bite by injecting each in turn.
- A test that the review session never prompts for an email address.
- Tests that all 153 claims render, that their keys are unique and well
  formed, and that a flagged item survives the round trip into the issue
  link and back out byte for byte - a review is somebody's careful work.

## colregs 1.13 - 2026-08-29

Fixed
- **Encounters 13 and 14 showed five options, with the right answer cut in
  half.** The options are separated by semicolons, and both of those
  encounters had a semicolon inside option b. So b was truncated to "Give
  way: keep well out of her way", a nonsense option c appeared reading "she
  is not under command.", and the real fourth option - "Pass close ahead -
  she cannot move." - fell off the end and was never shown at all. The
  correct answer is b in both, so a reader was being shown a mutilated
  version of the right answer next to a fragment of it.

  Found by a reader looking at the review sheet, exactly as the about
  section says these things get found. Every drill test passed throughout,
  because marking works on the letter and the letter was still b.

Added
- A separator-collision test over every packed table in the program:
  encounters (four options and a single-letter answer), day shapes, the
  twenty light tables, sound signals, and two hundred generated lights
  questions. A delimiter inside a field is silent by nature - the field
  truncates, a nonsense one appears after it, and the last falls off the
  end - so it needed a test of its own rather than an eye.

## celnav 1.5 / colregs 1.12 - 2026-08-29

Added
- **A third suite: golden files.** `tests/golden.sh` captures every screen
  the tools produce deterministically - about 26,000 lines - and commits
  them. Any change to what a user sees now appears as a readable diff that
  has to be accepted on purpose rather than noticed later. It runs in CI.
- **Annex I structural checks on the light tables.** Sidelights paired,
  level, opposite each other and no higher than three quarters of the
  masthead light; arcs summing to a full circle with no gap; no two lights
  in the same place. Each check was verified to bite by breaking that rule
  in turn.
- **`about` section 3: what is tested, and what is not.** Both tools now
  list what the suites cover and then say plainly what no test can reach:
  that a test can check the quiz marks answer C as correct but not that C
  is right; that it can check a light table is geometrically consistent but
  not that a mine clearance vessel shows those lights.
- **The feedback screen now ranks where feedback is worth most**, by how
  much damage a wrong claim would do - give-way verdicts first, because a
  wrong light table makes you misname a ship and a wrong verdict makes you
  turn the wrong way. Same list on the site.
- `tests/review-pack.awk` dumps every claim a machine cannot check,
  generated from the same tables the code runs on. `tests/REVIEW.md` is the
  plan for reviewing them.
- A test that the numbers the about section quotes still match the program,
  so the documentation cannot quietly start lying about itself.

Fixed
- `docs/make-site.sh` named engine versions by hand, so three plates on the
  site had been silently failing to render since the last version bump. It
  now takes the version from the tools.

## celnav 1.4 / colregs 1.11 - 2026-08-29

Added
- **`colregs style`** - a setting for how a relative bearing is spoken,
  because the right answer depends on who is listening. Five choices, each
  described on the selection screen before you pick: Red and Green (Royal
  Navy and British), Port and starboard (United States and merchant),
  relative full circle ("340 relative"), words only ("fine on the port
  bow"), or true bearing alone. It changes the report and the relative
  column on the tracking plot. The true bearing is always given as well,
  because that is what goes on the chart.
  Reachable as `colregs style`, `s` from the contacts menu, or `s` from
  the main menu. It persists between runs.
- The reveal's follow-up line now always gives the OTHER form - if the
  style is words, it offers Red/Green, and the other way round.
- The About section now names the boats: USS Alaska (SSBN-732), USS
  Lafayette (SSBN-616), USS Gato (SSN-615) and USS Greenling (SSN-614),
  1984 to 1990.

Changed
- `YOUR-GITHUB-USERNAME` is now `larrys614` throughout - the README, the
  site, and the feedback screen inside both tools. Nothing is left blocking
  a first push.

## colregs 1.10 - 2026-08-29

Added
- **Relative bearings, throughout.** A true bearing is for the plot; a
  relative bearing is for the eye. The report now carries both, the
  tracking exercise shows a relative column beside the true one, and the
  reveal ends with the plain-words version for anyone who still cannot
  find her.
- **C7, relative bearings** - Red and Green (and why the colours are the
  sidelights), port and starboard, the American full-circle relative
  bearing, and the words that need no number: right ahead, fine on the bow,
  broad on the bow (four points, 45), on the beam, broad on the quarter,
  fine on the quarter, right astern. With a rose drawn from the same
  definitions the code uses, so the picture cannot disagree with the words.
- C7 also carries the trap: **a relative bearing moves when YOU turn.**
  Alter twenty degrees and every contact draws twenty degrees the other way
  with nothing having happened in the water. So bearing drift is measured in
  true bearings, or on a steady course, and never across a turn - which
  everything in C2 and C3 quietly assumed and never said.
- C4 now includes the relative bearing in the anatomy of the report, and
  notes that this half of it goes stale the moment you alter course.

Changed
- One relative-bearing vocabulary now serves the whole tool. The lights
  reveal ("you are broad on her port bow") and the contacts report come
  from the same function, so the same phrase always means the same angle.
  A test walks every degree of the circle and checks that Red/Green, the
  words and the side all agree.

## celnav 1.3 / colregs 1.9 - 2026-08-29

Changed
- **Licence: MIT to Apache 2.0.** Same freedoms - use it, sell it, fork it
  closed - with three things MIT does not give: an explicit patent grant
  from every contributor, a requirement that modified versions say they
  were modified, and protection of the author's name from being used to
  endorse a fork. A NOTICE file now carries the copyright and the
  third-party attributions that travel with the tide data (NOAA public
  domain; TICON-4 under CC BY 4.0, whose terms this licence does not
  change).

Added
- **`about` in both tools**, in five parts: why it exists and who wanted it,
  how it was written and what went wrong while it was, where the numbers
  come from, how to send feedback, and the licence and warranty. Reachable
  as `celnav about` / `colregs about`, or `a` from either menu.
- The "how it was written" section names the three bugs that testing and
  users found and that reading the code did not, because that is the honest
  argument for sending feedback.
- Tests that the about section has all five parts in both tools, and that
  the licence the programs claim is the licence actually in LICENSE and
  NOTICE - with no MIT left anywhere in the built files.

## colregs 1.8 - 2026-08-29

Added
- **`colregs contacts`** - managing contacts by bearing drift, the way a
  tracking party does it. Six lessons and two exercises.
  - C1 relative motion: she travels in a straight line relative to you, so
    the bearing sweeps one way and can never reverse.
  - C2 the rule itself: a bearing drawing AWAY from your bow passes astern,
    a bearing drawing TOWARD it crosses ahead. Not a rule of thumb - a
    consequence of the straight line, checked against 700,000 random
    geometries with no exceptions, and against every contact the exercise
    generates on every test run.
  - C3 constant bearing, decreasing range, and the half of Rule 7 that kills
    people: 7(d)(ii), risk despite good drift - a very large vessel whose
    bow is nearer than the bridge you plotted, a tow, close range.
  - C4 the report: designation, bearing, drift, range, CPA and time, why
    bearing comes before drift, and why "steady" must be said out loud.
  - C5 the arithmetic - three-minute rule, six-minute rule, time to CPA, and
    one degree at one mile is 35 yards.
  - C6 Ekelund: range from the change in bearing rate across a leg change.
    R(kyd) = 1.91 x change in speed across the line of sight / change in
    bearing rate. Derived, and verified to floating point over 59,000
    geometries.
- `colregs track` - the tracking watch. Five marks three minutes apart, and
  you call the drift, where she goes, and her CPA before the plot does. The
  reveal draws the relative-motion plot and gives you the report you would
  have made.
- `colregs ekelund` - two legs, two bearing rates, how far off is she.
- `colregs card` - the whole section on one screen.

## colregs 1.6 - 2026-08-29

Fixed
- **The mine clearance vessel's three greens were on two different masts.**
  Rule 27(f) puts one green at or near the foremast head and one at each end
  of the fore yard - all on the same mast. The two yard lights had been given
  a fore-and-aft position half a hull-length forward of the masthead one, so
  at an oblique aspect they swung off to one side of the mast where nothing
  could account for them. All three now share a mast.

Added
- Lights hung on a yard are drawn joined by the yard, so three greens read as
  one on the mast and two out on the yard rather than as three scattered
  lights. Seen from dead abeam the yard is end-on and no spar is drawn,
  because the two lights really are in line.
- A "Watch out" line on the vessels whose lights contain another vessel's
  whole signal as a sub-pattern: the mine clearance vessel's top green over
  the masthead white looks like a trawler; the lower two of a restricted
  vessel's red-white-red are a fishing vessel; white over red and red over
  white are the pilot and the fisherman the other way up.

## celnav 1.2 / colregs 1.5 - 2026-08-29

Fixed
- **Colour never appeared on any terminal.** Both tools asked "am I writing
  to a terminal?" inside a command substitution, where stdout is a pipe by
  definition. The answer was always no, so every session ran in plain mode
  and the coloured lights, the highlighted AP and night mode were all dead
  code on a real terminal. The test suite only checked the other half - that
  output is clean when piped - which passed for the wrong reason. Both halves
  are now tested, on a real pty.
- Panel lines now return to the tool's own base colour at the end of the
  line instead of resetting to the terminal's profile, so text after a
  drawing is not handed back to a light background mid-screen.
- The lights quiz no longer prints the aspect ("You are fine on her port
  bow") above a question that asks you to work the aspect out. It is given
  in the answer instead, where it belongs.


## Unreleased

## colregs 1.4 — 2026-08-29
- **The lights quiz now asks two questions**, as a lookout does: what is she,
  and which way is she going. The second is answered from the lights alone —
  her green means you are in her starboard sector and she is crossing left to
  right; her red means right to left; both sidelights means end on; a
  sternlight alone means you are overtaking her; nothing but all-round lights
  means she is not making way.
- The answer also draws out who gives way, because the sidelight tells you
  that too: **see her green and you are the stand-on vessel; see her red and
  you give way.** Suggested by a user, who put it better than the rule book.
- `colregs light <key> <bearing>` says which way she is going as well.

## colregs 1.3 — 2026-08-29
- **Sidelights now overlap slightly right ahead.** The arcs were modelled as
  meeting at exactly 000, so at four degrees off her bow the picture showed one
  sidelight while the caption said you were dead ahead of her. Annex I allows
  the cut-off to fall up to three degrees outside the prescribed sector, and in
  practice there is a small arc right ahead where both sidelights are seen. The
  model now reflects that, and the aspect wording matches what is drawn.
  Reported by a user.

## colregs 1.2 — 2026-08-29
- **The lights picture no longer crops.** It was trimming blank rows off the
  top, which threw away the one thing that distinguishes a sternlight from a
  masthead light from an anchor light: how high it is. A power-driven vessel
  seen from dead astern showed her sternlight at the top of the frame, reading
  as a masthead light. The frame is now fixed, with masthead height and deck
  marked. Found by a user, which is the only way this kind of bug gets found.
- **Look-alike vessels are never offered as alternatives to each other.** Some
  views are genuinely ambiguous — a sailing vessel and a vessel under tow show
  the same lights from every angle, and from dead astern a sternlight, an
  anchor light and a small craft's torch are the same single white light. The
  quiz now computes what is actually visible from that bearing and excludes any
  vessel that would look identical, so every question has one right answer.
- When the view *is* ambiguous, the answer says so and names the vessels it
  could equally have been. That is a real lesson about looking at lights, not a
  fault to be hidden.
- `colregs sigcheck` verifies over 600 generated questions that no question
  offers two equally correct answers. It runs in CI.

## colregs 1.1 — 2026-08-29
- **Collision avoidance**: a developing situation rather than a snapshot. Three
  timed observations of bearing and range, with the scatter a hand bearing
  compass actually gives you; you decide whether risk exists, how close she will
  come, and what to do. Then the worked solution — CPA, time to CPA, and her true
  course and speed from the vector triangle — and a frame-by-frame replay of both
  tracks under the action you chose, with the CPA it actually produced.
- Snapshot encounters extended from 14 to 28: narrow channels, traffic
  separation schemes, overtaking signals, restricted visibility, aground and
  anchored vessels, mine clearance, seaplanes, pilot vessels and long tows.
- The drawing now paints itself as a black panel with light text, edge to edge,
  so it is legible whatever the terminal's own profile is. Previously a white
  foreground was set without a background, which made the artwork invisible on a
  light Terminal profile — only the coloured lamps showed.
- `colregs colours` prints a swatch so you can confirm your terminal.
- An unknown command now lists the commands that do exist instead of saying
  "try colregs help".

## celnav 1.1 — 2026-08-29
- Training mode: twenty lessons, an annotated walkthrough of a real sight, six
  kinds of marked drill, and a what-if sandbox for the navigational triangle.
- Colour, with three modes: day, night (deep red, to protect dark adaptation)
  and plain. Chosen automatically as plain when output is not a terminal.
- Replaced awk's `srand()`/`rand()` with an internal MINSTD generator. mawk
  re-seeds from the clock even when given an explicit seed, which would have
  made a drill and its marking disagree.
- The plot paints itself as its own black panel with light text, so it is
  legible whatever the terminal's own profile is. A white foreground had been
  set without a background, which made the artwork invisible on a light
  Terminal profile.
- `celnav help` lists every command, grouped into Working, Learning and Setup;
  it had been omitting everything added in 1.1. An unknown command now prints
  the list of commands that do exist.

## celnav 1.0 — 2026-08-29
- First release. Sight reduction with the full working shown, iterated
  least-squares fix, running fix, sight planning with twilight times, compass
  check, ASCII sky view and intercept plot, and an offline self test.
- Almanac computed from orbital theory: Sun, Moon, four planets, 57 navigational
  stars and Polaris. Measured against an independent ephemeris over 1990–2076.

## colregs 1.0 — 2026-08-29
- First release. Lights drawn from any angle from a physical model of each
  light's arc; day shapes; encounter scenarios with the rule that governs them;
  sound signals; and fifteen lessons on the rules themselves.
