# tides — the browser build

Harmonic tide prediction for 8,334 stations, running entirely in the
browser with no network. It is the same engine as the POSIX `awk` tool in
`src/tides/`, ported line by line and checked against it.

    index.html        the day: curve, table, clearance, sun and moon
    engine.js         the port: astronomy, nodal factors, synthesis
    tables.js         the UTide constituent tables  (generated)
    tides.js          the app
    work.js           the six coastal calculators: a port of src/tides/work.awk
    WORK.md           the URL contract the coastal course links with
    tides.css         two modes, dark and night
    stations.idx      the search index, with byte offsets  (generated)
    stations.dat      the harmonic constants  (copied from src/tides/)
    gen/              the generators
    ../tests/         the verification

## What it does

Pick a station — by name, or nearest to a position — and it gives the
day's high and low water, the curve, and the two questions a boat actually
asks of a tide:

**Is there enough water?** Charted depth plus the tide, against your
draught and whatever you want under the keel, with the stretches of the
day when it is there.

**Does the mast go under?** Charted clearance minus the tide, against your
air draught. Charted depths are *below* datum and the tide adds to them;
charted vertical clearances are *above* HAT and the tide takes them away.
Getting that pair of signs the wrong way round is the classic way to put a
mast into a bridge, so the two are separate functions in the engine and
separately labelled on the screen.

## Coastal work

Six calculators, each showing its working step by step, because the point is
teaching: the rule of twelfths (with the cosine method and, at a station, the
harmonic height beside it), a secondary port from its standard port, a stream
rate between neaps and springs, which page of the tidal stream atlas you are
on, the course to steer, and set and drift from a DR and a fix. They are on
the day screen and the station picker, and a URL opens one directly:

    ?work=cts&track=045&stw=6&streams=135:1.5,150:2.0&lesson=l3-2025-4

The coastal navigation course links into them that way, so **the parameter
names are a contract**, written down in [`WORK.md`](WORK.md) with every unit
and default. `lesson=` adds a link back to the lesson, built from the one
constant `COURSE_BASE` at the top of `work.js`.

```
   URL  ?work=..&..&lesson=..          form  "Work it"
          |                              |   (writes the URL back)
          v                              v
   WORK.fromQuery() ----> WORK.run(name, params, ctx) ----> lines + figure
                              ^                               |
                    station loaded first,            <pre> working, SVG,
                    for atlas and twelfths           "Back to the lesson"
```

**Why a port and not a page of its own.** `work.js` prints the same lines of
working as `tides work` in the shell, character for character, and
`docs/web/tests/tides-work.js` compares the two on every worked case. The awk
is held to an independent Python working (`tests/tides-work-ref.py`), so
there is one set of arithmetic to trust and the browser is checked against
it, the same arrangement as the harmonic engine. The pictures are the one
place the builds differ on purpose: the shell draws characters, the page
draws SVG from the same numbers, and the SVG's points are read back and
checked against the geometry they claim.

## Why you pick a station and not a place

A tide is not computable from a position. It depends on the shape of the
coast and the depth and resonance of the basin, so every place needs
constants somebody measured there. The nearest station in a straight line
can be on the wrong side of a headland, and a river station can be nothing
like the water outside it.

A **reference** station has constants measured there and its curve is a
real synthesis. A **subordinate** station has none: it carries time and
height corrections to a reference station, which is how a paper tide table
has always worked. For those the turns are the reference's turns
corrected, and the curve between them is a half cosine. There is no honest
way to synthesise a continuous curve out of offsets and this build does
not pretend to — it says "SECONDARY" on the screen and names the
reference.

Times are the station's own **standard time**: no summer time, exactly
like a printed table.

## How the data is shipped

The station file is 2.9 MB, which is not something to download before the
app will draw anything. So `stations.idx` — every station's name, region,
country and position, plus the **byte offset and length** of its line —
loads at startup, about 250 kB over the wire, and one station's harmonic
constants come out of `stations.dat` with a `Range` request of a few
hundred bytes. If the server will not do ranges, the whole file is fetched
once and sliced in the page.

Three things about that are easy to get wrong:

- The offsets are **byte** offsets. Four station names are not ASCII, so
  the file is held as bytes and sliced as bytes. Slicing a decoded
  JavaScript string by a byte offset lands mid-line for every station
  after Saint Barthélemy.
- A **206 must never be cached as the whole file**. Stored under the
  `stations.dat` URL it would make every later read return four hundred
  bytes, and the failure looks like corrupt data rather than a caching
  mistake. The worker caches status 200 only.
- `stations.dat` is a **copy** of `src/tides/stations.dat` rather than a
  link to it. GitHub Pages serves the whole repository, so a relative path
  into `src/` would resolve — but a service worker only serves what is
  inside its own scope, so the file would be fetched from the network
  every time and the tool would not work offline, which is the entire
  point. `gen/make-tides-web.sh` keeps the copy byte-identical and fails
  if it ever is not.

## Offline

The worker caches the app, the calculators and the index on install. `stations.dat` is
deliberately **not** in that list: one large file in `addAll()` fails the
whole install on a flaky connection, and then nothing at all is cached.
It is cached on first successful fetch instead, and the About screen has a
button that fetches it with a progress bar. That button writes into the
worker's current cache, named from `BUILD` (`tides-v5` for build 5), so a
later update keeps the saved file rather than evicting it with the old
cache. Prove it once at the dock:
open a station, turn the network off, relaunch from the icon.

## Regenerating

    sh docs/web/tides/gen/make-tides-web.sh

`tables.js` is **dumped from the awk engine's own runtime strings** — the
70 constituents with their satellite and shallow-water terms are
UTide-generated and are never retyped by hand. `stations.idx` is rebuilt
from `stations.dat`, and nothing is written unless every offset slices its
own line back out byte for byte.

## Verifying

    sh docs/web/tests/run-tides-web.sh            quick
    sh docs/web/tests/run-tides-web.sh --full     615 stations x 4 dates

Stage 2 is the coastal calculators: every worked case and help example,
the working compared line for line with `tides work`, the figures read back,
the lesson link built and refused. It needs only node.

See `docs/web/tests/README.md`. Heights agree with the awk engine to about a
femtometre and the turning times are exact. The page is driven and
compared against `tides today` as well, because a module diff proves the
physics and only driving the page proves the wiring.

## What it does not know

Nothing here knows about the weather. A deep low or a hard onshore blow
moves the real water by half a metre or more, and a river in flood moves
it further. Harmonics predict the astronomical tide and nothing else.

**A training and cross-checking aid, not a substitute for judgement.**
Where this and the published tide tables for the port differ, the
published tables are right and this is wrong.

Data assembled from [neaps/tide-database](https://github.com/neaps/tide-database)
(CC BY 4.0). NOAA harmonics are public domain; TICON-4 harmonics are
CC BY 4.0.
