# Architecture

Why the code is shaped the way it is. Read `HACKING.md` for the rules;
this file is the map.

---

## The constraint that decided everything

The target is an iPad running [a-Shell](https://holzschu.github.io/a-Shell_iOS/),
at sea, out of signal, on a boat where the chartplotter is the thing that just
failed. From that one requirement, everything else follows:

- **No dependencies.** POSIX `sh` and POSIX `awk` are what a-Shell has. Not
  Python, not bash, not gawk.
- **No network, ever.** Not at install, not at runtime, not for data. There is
  a test that greps the whole tree for `curl`, `wget`, `nc -`, `telnet`, `ftp`
  and `getline < "http…"` and fails the build if any appears.
- **No install step.** Each tool is one executable file. Copy it, `chmod +x`,
  run it. Nothing to unpack, nothing to `pip`, no second file to lose.
- **Nothing to configure.** A config file appears on first use with sensible
  defaults, in the tool's own dotfolder.

Everything awkward about the codebase — the heredoc packing, the shell/awk
split, the hand-rolled random number generator — is downstream of that list.

---

## One tool, one file

`build.sh` concatenates `src/<tool>/*` into a single executable in `bin/`.
The awk engines are embedded as **quoted heredocs** inside a shell function,
so the file is a shell script that carries its own awk source as data:

    install_engine() {
      ...
      cat > "$ENGINE" <<'__COLREGS_ENGINE__'
      ...the whole of src/colregs/engine.awk...
    __COLREGS_ENGINE__
    }

The quoting on `<<'__COLREGS_ENGINE__'` matters: it stops the shell expanding
`$1`, backticks and `\` inside the awk source. Without the quotes the awk gets
silently mangled.

On first run the tool writes its engines into its own dotfolder and from then on
runs them from there. **Where that folder goes is decided at run time, not
fixed to `$HOME`** — see below. The extracted files are **versioned by filename**
(`engine-1.15.awk`), so a newer binary never runs an older engine; and
extraction repeats if the executable is newer than the extracted engine
(`[ "$0" -nt "$ENGINE" ]`), so editing and re-running just works.

    ~/.celnav/    engine-1.6.awk  teach-1.6.awk  celnav.conf
    ~/.colregs/   engine-1.15.awk  contacts-1.15.awk  review-1.15.awk  colregs.conf
    ~/.tides/     engine-1.2.awk  tables-1.2.awk  stations.dat  config  lastlist
    ~/.bashnav/   decklog-1.1.awk  weather-1.0.awk  log  boat  *.conf

### `$HOME` is not writable on iOS, so the folder is chosen, not assumed

`src/common/05-home.sh` defines `bn_home`, spliced into every tool by
`build.sh` between the shebang and the first use. It takes the first of
`$HOME`, `$HOME/Documents`, `$HOME/Library` that it can **create and write in**,
proved by writing a file rather than by guessing from the platform.

`$HOME` is tried first, so nothing changes on macOS, Linux, the BSDs or Termux.
On a-Shell it lands in `~/Documents/.celnav`, because `$HOME` there is the app's
iOS data container and every write to it is refused. A `<TOOL>_HOME` environment
variable still overrides the lot and skips the probe, which is what the test
suite uses.

This is not a nicety. Every tool defaulted to `$HOME/.<tool>` and **not one of
them would start on an iPad** — the platform the whole project exists for.
`tests/ios-home.sh` takes a writable `$HOME` away and is now part of the matrix.

`bin/tides` is 2.9 MB because it carries 8,334 stations of harmonic constants
inline. Extraction takes about 48 ms, once.

**`bin/bashnav` is the exception and carries nothing.** It is a launcher: pure
`sh`, no awk, no engine, no dotfolder, no config. It exists because an iPad
puts *one* icon on a home screen far more easily than five, and because a
Shortcut that runs an interactive tool has to be set to run **In App** rather
than in a-Shell's extension - the extension has no terminal, so a menu has
nothing to draw on. Both routes are documented in the README; the launcher is
the one that needs no Shortcut at all.

**`bin/` is generated. Never edit it.** CI rebuilds and fails if the result
differs from what is committed.

---

## The shell/awk split

The division is strict and worth preserving:

| | |
|---|---|
| **shell** (`10-head.sh`, `30-ui.sh`) | menus, prompts, reading keystrokes, config, colour mode, choosing an awk |
| **awk** (`engine.awk`, …) | every calculation and every drawing |

The shell never computes anything and awk never reads from the keyboard. That
is what makes the engines testable: every screen the user sees can be produced
by one `awk -f engine.awk -v cmd=… ` invocation with no terminal, which is
exactly what the golden-file suite does with 27,245 lines of expected output.

### The engine interface

The shell calls awk through a one-line wrapper defined in `10-head.sh`:

    eng()   { $AWK -f "$TABLES" -f "$ENGINE" -v cmode="$(cmode_now)" -v SF="$STATIONS" "$@" </dev/null; }

Everything is passed as `-v` variables; a `BEGIN` block dispatches on `cmd`:

    cmd=day  cmd=near  cmd=search  cmd=info  cmd=height            (tides)
    cmd=light  cmd=shape  cmd=enc  cmd=scen  cmd=track  cmd=rv…    (colregs, 37 of them)
    cmd=reduce  cmd=almanac  cmd=plan  cmd=stars  cmd=compass      (celnav)

Note the `</dev/null` on every call. awk with no file arguments reads stdin,
and an engine that is only supposed to compute will otherwise sit there
swallowing the terminal.

Commands that *mark* an answer are separate from commands that *pose* the
question — `enc` and `encm`, `qlight` and `qlightm`, `scen` and `scenm`. Both
are driven from the same seed, so a drill can be regenerated exactly for
marking without the shell having to remember anything. That is also what makes
"every drill marks its own correct answer as correct" a testable property.

---

## Per-tool layout

    src/common/20-about.sh        the About menu shared by the tools
    src/common/log.awk            the append-only record layer (deck-log, weather)
    src/common/colour.awk         col_init/cw/cwd/hr, shared

    src/celnav/10-head.sh         config, colour, awk detection, eng()/teach()
    src/celnav/engine.awk         almanac, sight reduction, plotting, fix
    src/celnav/teach.awk          the lessons and drills
    src/celnav/25-about.sh        celnav's part of the About menu
    src/celnav/30-ui.sh           commands and menu

    src/colregs/10-head.sh        as above, plus the reporting style
    src/colregs/engine.awk        lights, shapes, sounds, encounters, scenarios
    src/colregs/contacts.awk      the Navy contact-management section
    src/colregs/review.awk        153 reviewable claims and the report builder
    src/colregs/26-review.sh      the interactive review session
    src/colregs/30-ui.sh          commands and menu

    src/tides/10-head.sh          config, colour, awk detection, eng()
    src/tides/tables.awk          generated: constituent definitions
    src/tides/engine.awk          harmonic prediction, station search, drawing
    src/tides/work.awk            the coastal work calculators (in the engine payload)
    src/tides/stations.dat        generated: 8,334 stations
    src/tides/30-ui.sh            commands and menu
    src/tides/gen/*.py            the generators (run offline, output committed)

    src/decklog/10-head.sh        config, colour, awk detection, the append path
    src/decklog/engine.awk        record building and validation
    src/decklog/views.awk         the derived views: holdings, shopping list
    src/decklog/30-ui.sh          commands, menu, the three-hourly prompt

    src/weather/10-head.sh        config, colour, awk detection
    src/weather/wx.awk            the reasoning: tendency, veering, Buys Ballot
    src/weather/teach.awk         ten lessons
    src/weather/score.awk         WxChallenge scoring, valid times
    src/weather/chart.awk         the 500 mb chart and Chesneau's rules
    src/weather/30-ui.sh          commands and menu

    src/launcher/bashnav.sh       the launcher, whole. No awk, nothing embedded.

The numeric prefixes are concatenation order, nothing more.

---

## Drawing

Every picture is a character grid built in awk and coloured with ANSI escape
sequences. Three modes, remembered in the config:

- **day** — light text on a black panel
- **night** — deep red on black, *no green at all*, because rebuilding dark
  adaptation takes twenty minutes and a bright screen costs every one of them
- **plain** — no escape sequences whatsoever

Plain is chosen automatically whenever stdout is not a terminal, so redirected
output is always clean text. **The tty test must happen at the top level of
the script, not inside `cmode_now()`** — see `HACKING.md`; this ate the colour
on every real terminal for weeks.

Every drawing paints its own black background edge-to-edge rather than only
setting a foreground colour, because a user on Apple Terminal's default light
profile otherwise gets white text on white.

---

## The tide data pipeline

    neaps/tide-database  ──►  src/tides/gen/make_stations.py  ──►  stations.dat
    (NOAA + TICON-4)          src/tides/gen/make_tables.py    ──►  tables.awk

The generators run offline on a developer's machine and their **output is
committed**. They are not part of the build and the tools never run them.

`stations.dat` is one station per line, pipe-separated:

    R|id|name|region|country|lat|lon|tzmin|z0mm|datum|idx:amp_mm:phase_tenths,...
    S|id|name|region|country|lat|lon|tzmin|refid|htype|hhi|hlo|thi|tlo

`R` is a **reference** station with its own harmonic constants (6,090 of them).
`S` is a **subordinate** station with no constants of its own — only time and
height corrections applied to a reference station's high and low waters, which
is exactly how a printed tide table is built (2,244 of them).

Amplitudes are stored in millimetres and phases in tenths of a degree — finer
than the constants are actually known, and it keeps the file near a megabyte.

Times are always the **station's own standard time**, never summer time,
because that is what the offsets in the source data are referenced to. A tide
table has always been in standard time.

### Data licensing, which travels with the data

- NOAA harmonics: **public domain**
- TICON-4 harmonics: **CC BY 4.0**
- assembled via `neaps/tide-database`, itself CC BY 4.0

The CC BY obligation travels with the data regardless of the Apache 2.0 licence
on the code. `NOTICE` carries it and must not be dropped.

---

## The browser build: three boundaries

The shell tools are one file each, run by a shell you can see. The browser
build runs inside a platform with rules of its own, and almost everything that
surprises somebody about it comes from three ideas. They explain why moving the
site address emptied every saved deck log, why each tool carries a version
number for its cache, and why an app opened from a home-screen icon has no
address bar.

```
   ORIGIN      https://bashnav.navigationtools.org
   ========================================================
   the name everything is filed under. Change any part of
   it and the browser treats it as a different machine.

      +------------------------------------------------+
      |  STORAGE, keyed to the origin                   |
      |                                                 |
      |    IndexedDB .... the deck log                  |
      |    Cache ........ the files each tool precaches |
      |    localStorage . settings, the loaded pack     |
      +------------------------------------------------+

      +------------------------------------------------+
      |  SERVICE WORKER, one per tool, scoped to its    |
      |  own directory                                  |
      |                                                 |
      |     the app  -->  worker  -->  network          |
      |                     |                           |
      |                     +-->  its own Cache         |
      |                                                 |
      |  Answers from the Cache when the network is     |
      |  gone. Outlives the page that installed it.     |
      +------------------------------------------------+

      +------------------------------------------------+
      |  DISPLAY: the same files, two ways to run them  |
      |                                                 |
      |    in Safari ....... a page. Address bar,       |
      |                      Share button, back.        |
      |    from the icon ... an app. Own container,     |
      |                      own task-switcher entry,   |
      |                      no browser chrome at all.  |
      +------------------------------------------------+
```

**1. The origin is the identity.** Scheme and host together —
`https://bashnav.navigationtools.org`. Every stored thing is filed under it. Two
origins are two different machines as far as the browser is concerned, even
when they serve byte-identical files. A deck log written at one address cannot
be read at another, and nothing in the browser can carry it across. That is
why the site address is worth settling once, on a name we own, rather than
moving it twice.

**2. A service worker is a local proxy that outlives the page.** Each tool
installs a small script that sits between the app and the network, scoped to
its own directory. When the network is gone it answers from its own cache — and
it keeps running after the tab is closed, updates on its own schedule, and
serves the files it cached until a new version replaces them. That last part is
why `CACHE` in each `sw.js` carries a version: it is the only thing that tells
a returning browser to throw the old files away. A served file changed without
that version moving is a tool that quietly disagrees with the program it was
generated from, which is what `tests/run-tests.sh` checks on every run.

Each tool has its own worker and its own cache on purpose. `caches.delete()` is
origin-wide rather than scope-wide, so a worker written to evict "every cache
that is not mine" would take the other five with it. They evict only their own
family.

**3. An installed web app is a separate process, not a tab.** Add to Home
Screen and the manifest's `"display": "standalone"` says *run this like an
app*: its own container, its own entry in the task switcher, and no browser
chrome. The consequence that catches people is navigation — the launcher's
scope is `./`, so every tool reached from the launcher's icon stays inside that
installed app, with no address bar and no Share button. To add a tool to the
home screen on its own, open that tool's URL **in Safari**, where it is a page
rather than an app.

Every path inside the apps is relative for the same family of reasons: each
worker registers `'sw.js'` with no leading slash, each manifest uses `"./"` for
`start_url` and `scope`, and no precached path is absolute. They therefore
serve correctly at whatever depth they are given — which is what let the site
move from a path under `github.io` to the root of its own domain without a
single change inside the apps.

---

## What is deliberately not here

- **No position input.** A tide cannot be computed from a position — it depends
  on the shape of the coast and the depth and resonance of the basin, so every
  place needs constants somebody measured there. You pick a *station*, not a
  place. The nearest one by straight line can be on the wrong side of a
  headland and behave nothing like you.
- **No tidal streams.** The 8,334 stations are height stations. Set and drift
  is a different measurement made at different places; nothing here predicts a
  current. `tides work` does the arithmetic AROUND a stream — the rate from an
  atlas's two figures, which atlas page, the course to steer, set and drift
  from a fix — with the stream itself taken from the atlas or the chart.
- **No weather.** A prediction is the astronomical tide and nothing else. A
  deep low can raise the sea half a metre above it.
- **No GPS, no AIS, no charts.** These are cross-checking and training tools.
