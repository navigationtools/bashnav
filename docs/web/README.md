# bashnav — the web build

Five tools and a launcher, as ordinary web pages. No build step, no
dependencies, no network once loaded.

    index.html        the launcher: one tile per tool
    colregs/          rules of the road, lights, shapes, sounds   (v1.15)
    celnav/           camera sight: an altitude from a photograph
    tides/            harmonic prediction, 8,334 stations         (v1.1)
    deck-log/         the boat's records, append-only              (v1.1)
    weather/          read your own barometer                      (v1.0)
    drill/            a study machine with no material in it        (v1.0)
    icons/            one icon per tool, drawn to read at 60 px
    tests/            verifying the browser builds against the awk

All six marine tools are built. `deck-log` and `weather` share one log:
both are served from this origin, and IndexedDB is per-origin rather
than per-path, so they genuinely share one store.

`drill/` is a different kind of thing. It carries **no material at
all** — no questions, no reference text, nothing of anybody's. It reads
a content pack the user loads from their own device, which never leaves
it. That is how material somebody else owns can be studied without ever
being published: the machine is published, the material is not. See
`docs/web/drill/README.md` for the pack format.

## Installing

This directory lives at `docs/web/`, and GitHub Pages is set to
**Settings → Pages → Deploy from a branch → `main` → `/docs`**. That makes
`docs/` the root of the website, so these tools are served one level below it
and the documentation site is served at the top. Each tool is its own page:

    https://bashnav.navigationtools.org/web/
    https://bashnav.navigationtools.org/web/colregs/
    https://bashnav.navigationtools.org/web/celnav/
    https://bashnav.navigationtools.org/web/tides/
    https://bashnav.navigationtools.org/web/deck-log/
    https://bashnav.navigationtools.org/web/weather/
    https://bashnav.navigationtools.org/web/drill/

Open one in **Safari** on the iPad and use **Share → Add to Home Screen**. Each
URL gets its own icon, because each has its own manifest.

### An installed copy is its own world — observed on an iPad, 20 Oct 2026

A tool added to the Home Screen or the Dock runs as an installed copy with
**its own storage and its own service worker**, separate from Safari's for the
same address. Observed directly: a Dock shortcut to `drill` stayed on build 3
while Safari moved on to build 5, and kept the first content pack it was ever
given no matter how many times a new one was loaded in Safari.

What follows from that, and it is worth knowing before relying on any of this
at sea:

- **Each copy caches its own app.** Build numbers can differ between the Dock
  icon and a Safari tab. The footer tells you which build a copy is running.
- **Each copy has its own storage.** For `drill` that means its own content
  pack and its own progress; load the pack in every copy you intend to use.
- **For `deck-log` and `weather` that means its own log.** Entries written in
  an installed copy do not appear in Safari, and the other way round — two
  separate records, both of which look like *the* log. Pick one copy per tool
  and keep to it, and check which one your existing entries are in before
  trusting either.

Whether storage is shared has varied by iOS version, so treat the above as
what this iPad does rather than as a rule. The practical habit is the same
either way: one copy per tool.

Pages publishes everything under `docs/`, and nothing above it. That is why the
browser build lives here rather than at the repository root: `src/`, `bin/`,
`tests/` and `release/` are not served, and a file has to be moved into `docs/`
deliberately before anyone outside can fetch it.

## Offline

Every tool registers a service worker scoped to its own folder and caches
itself cache-first, so each updates independently and all of them keep working
with no signal. Prove it once at the dock rather than at sea: open every
screen, turn the network off, and relaunch from the icon.

**Cache-first bites during development.** A republish serves the old code to
anyone who opened the page before, with no sign it has done so. A build can
set `window.CELNAV_NO_SW = 1`, which unregisters any worker and clears the
caches instead of installing one; the hosted test builds use it. Every page
also prints a build stamp at the bottom, because debugging remotely without
one means guessing which version is on the device.

## What is verified, and how

`colregs` geometry was diffed against the awk engine over all 361 integer
bearings, and its data was emitted by running that engine's own table
initialisers rather than transcribed.

`celnav`'s engine was diffed over 20,568 reference rows — 140 epochs × 17
bodies, 11,424 sight reductions across the whole sphere, 6,624 correction
cases — plus the fix solver, the twilight search and the drill generator.
Worst disagreement 1.7e-7 degrees. It also reproduces the shell tool's
self-test against an independent reference ephemeris at 0.151 arcmin.

The camera geometry has no awk counterpart, so it is checked by synthesis:
project a body of known altitude into a synthetic photograph, measure the
picture, and compare. The plane-normal method is exact to 2.5e-8 arcmin over
300 geometries; the obvious `atan(y/f)` approach is wrong by up to 384
arcminutes once the camera is rolled and the body off-axis.
