# docs/web/tests — verifying the browser builds

`tests/run-tests.sh` in the repository root is POSIX `sh` and POSIX `awk`
and nothing else, so it runs on the boat. These do not: they need `node`,
`python3` and a headless Chromium, so they run on a development machine
before a push and are deliberately kept out of that suite.

    sh docs/web/tests/run-tides-web.sh            a quick pass, 9 stations
    sh docs/web/tests/run-tides-web.sh --full     615 stations x 4 dates
    sh docs/web/tests/run-decklog-web.sh          the record layer and the page
    sh docs/web/tests/run-weather-web.sh          the reasoning, prose and all
    sh docs/web/tests/run-drill-web.sh            the study machine, end to end

## The method

Nothing here checks the browser build against a number somebody typed in.
Every reference value is **emitted by running the awk engine**, and the
harness loads the **shipped** files under `docs/web/tides/`, so a stale copy
cannot pass.

| | |
|---|---|
| `tides-ref.awk`  | dumps the awk engine's own values at full double precision |
| `tides-diff.js`  | the same quantities out of the JS engine, compared |
| `tides-ui.js`    | drives the page and checks what it *shows* against `tides today` |
| `tides-moon.js`  | re-draws the moon path into a canvas and counts the lit pixels |
| `celnav-ref.awk` | generates whole sight cases and dumps the awk's reduction and fix |
| `celnav-diff.js` | the same cases through the shipped browser engine, compared |
| `celnav-ui.js`   | types sights into the page and checks the fix it *shows* |
| `celnav-tables.js` | the almanac and the star list as the page shows them, against the shell |
| `run-figures-web.sh` | recaptures the site's pictures from the apps and diffs them |
| `serve.py`       | a static server that honours `Range`, which Python's own does not |

## The site's pictures are the apps' own screens

Fifteen figures, two or more for every app, and they are all the real thing:
six are the apps' own `<svg>`, lifted out of the running page, and nine are
screenshots of screens that are not drawings at all.

`tides`, `deck-log`, `weather` and `drill` draw nothing — they are tables,
logs, forms and prose — so showing what they do means photographing the
screen. Those PNGs are the repository's only binary files and the only ones
that cannot be diffed, so three things make them worth having:

- **The clock is frozen** to 29 Aug 2026 12:00 UT, the day the celnav worked
  example uses, and the timezone is pinned to UTC. The tides day view prints
  the date and marks the present height on the curve; deck-log heads its screen
  with the UTC stamp and the watch slot. Unfrozen, every capture differed and
  the comparison was noise — the same fault the deck-log menu picture had.
- **The viewport is fitted to the screen**, because `fullPage` takes the larger
  of the content and the window and padded the short screens with dead space.
  `document.documentElement.scrollHeight` is no use for measuring it: these apps
  hold `html` and `body` at the window height and scroll an inner container, so
  it reports the window back. The view element's own box is the screen.
- **Day mode is forced.** The palette is remembered per browser, so a capture
  that inherited night mode would be a different picture of the same screen.

All fifteen reproduce byte for byte on a second run, which is what makes
`run-figures-web.sh` a check rather than a ritual.

## The drawings are the apps' own SVG

The front page showed thirteen `ansi2svg` renderings — the *terminal's*
characters drawn as SVG. That was right while the shell build was the product.
The page leads with the browser apps now, so the pictures are the apps' own
`<svg>`, lifted out of the running page by
`docs/web/gen/make-app-figures.sh`. Nothing is redrawn and no geometry is
recomputed, which is why a picture cannot drift from what a reader sees.

Two things make a capture reproducible, and the committed files are diffed
against a fresh one:

1. **`Math.random` is seeded** before any app code runs, with the same LCG the
   awk harnesses use. The lights and day-shape screens are quizzes that pick a
   vessel at random and the encounter screen picks a scenario; unseeded, every
   capture would differ and the comparison would be noise. Seeded, *"the second
   question on the lights screen"* is a stable address for a figure.
2. **The styles are inlined.** The celnav plot resolves its colours at draw time
   and arrives with `fill` and `stroke` on every element, but the colregs
   figures take theirs from CSS *classes* so they follow the night palette — and
   a class means nothing in a standalone file. The first version skipped any
   computed value of `none`, which is the one value that matters: SVG's default
   fill is black, so every ring of the contacts radar filled in and the figure
   came out as a solid black disc.

Capturing them found a COLREGs fault the suite could not have: the browser drew
a mine clearance vessel with **four** balls, where Rule 27(f) gives three — one
at the foremast head and one at each end of the fore yard. The port had read
the shell glyph `(O)---+---(O)` as a picture and turned the `+`, which marks
where the yard crosses the mast, into a shape. `tests/app-figures-check.sh`
asserts that arrangement in the committed figure, with no browser, the way
`run-tests.sh` has asserted it for her *lights* at sixteen angles ever since
Larry found it wrong there.

## Why celnav's cases are whole and not pieces

Every piece of celnav's browser reduction had been diffed and every piece
agreed: `body_at()`, `corrections()` and `reduce_sight()` match the awk to
nine decimals and did before `celnav-ref.awk` existed. Two faults shipped
anyway, and neither lived in a piece.

`plot.js` used `solve_fix()`'s **first pass** as the fix. `solve_fix()`
linearises the sight reduction about the position it is handed, so its
offset is only as good as that position: right to 0.02 nm from a live DR,
**43 nm out** from a DR five degrees away. The shell never had the bug —
`cmd_fix()` re-reduces from its own answer until it stops moving — and
every per-sight number the browser showed was correct, which is exactly
why nothing looked wrong. The one number a navigator plots was the one
that was wrong, and only in the circumstance where it matters.

`engine.js` set the planets' horizontal parallax to zero, with a comment
claiming the awk multiplied it by zero. The awk does not: `planet_pos()`
sets `P_HP = 0.14656667/d` and argues at length for applying it to all
four planets. 0.08' on a Venus sight at 14 degrees, more when she is close.

So the reference is a whole case — a position, a time, two to five bodies,
a DR anywhere from a mile to several hundred off — run the whole way
through the shell's own `cmd_reduce()` path. The sights are **inverted out
of `corrections()`** rather than invented, so each `Hs` is a reading a
sextant would have produced, and `converge_fix()` was lifted out of
`cmd_reduce()` so the harness compares against the shell's convergence
instead of a second copy typed into the test.

## Why the page is tested and not only the engine

The engine diff passed, over nine hundred thousand values, while the page
was visibly wrong: it predicted the **UT** day and then labelled it in the
station's time, so at Newport the previous evening's low water sat at the
top of the table and the whole curve was shifted fifteen columns. A tide
day is the station's own standard day — `jdA = jd0 - tz/1440` — and both
sides of a module diff happily used UT midnight.

A module diff proves the physics. Only driving the page proves the wiring.

## Tolerances

Set by what each quantity *means*, not by what the port happens to
achieve: a millisecond on a tide time, a nanometre on a tide height. awk
uses the platform's libm for `sin`, `cos`, `atan2`, `exp` and `log` and V8
uses its own, so the last bit or two differ and bit-equality is the wrong
test. In practice heights agree to about a femtometre and the turning
times are exact.

An earlier run reported two failures at exactly half the dump's own print
quantum — 43 ms is half of `%.12e` on a Julian Date of 2.46 million. The
fix was to dump full double precision, not to loosen the tolerance.


---

# deck-log

The log is append-only and **shared** with the awk build: the same file,
byte for byte, not two formats that look alike. A record one tool writes
that the other cannot read is permanent damage, discovered months later
by something trying to read it. So the record layer is checked in both
directions before anything else.

| | |
|---|---|
| `decklog-rt.awk` / `.js` | awk writes, JS reads; JS writes, awk reads; byte for byte |
| `decklog-views.awk` / `.js` | holdings and open defects over generated logs, up to 100,000 records |
| `decklog-imp.awk` | the plausibility limits *and their wording*, over the whole numeric range |
| `decklog-merge.js` | commutative, idempotent, lossless, conflicts kept |
| `decklog-ui.js` | a real entry made through the page, exported, read back by the awk tool |

## The corpus travels as hex

`decklog-rt.awk` emits its awkward values, and the records built from
them, as **hex**. Carrying them in any text encoding would mean the test
sharing a mechanism with the thing it is testing, and a bug in the
escaping would cancel out and pass. It is not hypothetical: an earlier
version used a tab-separated dump, and the one case whose value is a
literal tab split the record in half — the harness sharing a delimiter
with its own payload, which is the same class of bug the log format
exists to prevent.

## Two faults these found

**The confirmation was wiped by the redraw.** `commitSection` set the
message and then called `drawSection()`, which overwrote it with its own
"already logged" note — so the one message this tool most needs to
deliver, that you have just used your last impeller and are short of
your minimum, was destroyed on the way to the screen.

**The parts catalogue was invented.** An earlier `views.js` shipped
twelve plausible spares and an eighteen-item checklist written from the
specification's prose rather than from the tool. The checklist was not
the tool's checklist and the catalogue did not exist in the tool at all.
Both now come from `gen/make-decklog-web.sh`, which dumps them.

## A generated corpus can throw itself away

The 100,000-record run first reported `22176 good, 77824 bad` and still
*passed*, because both readers correctly rejected the same malformed
timestamps: the generator's month field ran past 12 after day 336 and
produced `2026-447-01T00:00Z`. A diff between two readers cannot notice
that three quarters of its corpus is being discarded by both of them.
Check the counts, not only the agreement.


---

# weather

The weather output is **prose**. Every rule shows its working, and the
working is the product — so a port that gets the numbers right and the
words approximately right has not ported it. Everything is compared
character for character against what the awk actually prints.

| | |
|---|---|
| `weather-wx.js` | 400 generated observation histories vs `weather what` |
| `weather-sc.js` | 300 generated logs vs `weather score` |
| `weather-ch.js` | 1,078 cases vs `weather chart` |
| `weather-vt.awk` | every real day 2000–2040 through the valid-time conversion |
| `weather-les.js` | the lessons reconstructed from `lessons.js` vs `weather learn` |
| `weather-ui.js` | the page driven, including the rule that it must not tell before it asks |

## What `weather-ui.js` is really for

It asserts the comparison table is **empty before the commit**, not
merely hidden. Hidden is not good enough: a guess you can glimpse is a
guess you have read, and then the user has not forecast anything.

## Three faults these found

**The user was never scored.** `do_forecast` wrote `by=user` while the
report's three names are `you rules persist`, so the one column the
learning loop exists for was accumulated and never printed. The existing
`score-e2e.sh` wrote its own fixture with `by=you` and so never met the
tool; it now drives `weather forecast`, logs the observation the forecast
was made for, and reads the tool's own score sheet.

**C's `printf` rounds half to even; JavaScript's `toFixed` does not.**
`%.0f` of 12.5 is 12 in C and 13 in JavaScript. The 500 mb rules divide
the wind by two, which lands on an exact half for every even wind speed:
506 of 1,078 chart cases disagreed on exactly that.

**C prints `inf`, not `Infinity`.** A 500 mb wind of zero divides by
zero, and the awk prints "inf to inf hours".

## And one in the harness, twice

A generated corpus can throw itself away and still pass. The valid-time
check first reported 276 round-trip failures — which is precisely the
number of impossible dates in 2000–2040, because the loop ran `d=1..31`
in every month. `sc_jdn` of 31 February is a perfectly good day number
and `sc_civil` correctly maps it back to 3 March. The same mistake, in a
different costume, had already discarded three quarters of the deck-log
size corpus. **Check the counts, not only the agreement.**


---

# drill

The only suite here that is **entirely** a browser test, because the app
is entirely a browser app: there is no awk engine behind it to diff
against. So the harness builds its own synthetic pack and drives the
whole thing. Pass a real pack as an argument to run the same checks
against it.

What it asserts, in order: it ships empty; a pack loads; a pack whose
questions point at missing sections is refused whole; section 1 is open
and 2 is locked; **a locked section's reference is still fully
readable**; only its test waits, with the reason given; **the answer is
absent from the DOM before the reveal, not merely hidden**; failing
leaves the next section locked; passing unlocks it and records the best
mark; progress survives a reload; the diagnostic names unstudied
sections instead of scoring them zero; the document view renders and
searches; and nothing scrolls sideways at 744, 390 or 320 px.

## The selector that matched its own payload

The harness found the Next button by matching the word "next" in button
text. A real pack contained an answer reading *"It authorizes the next
action"* — so it clicked the answer, the question never advanced, and
the loop spun until the page died. Seven minutes of nothing, and the
first run with the synthetic pack had passed, because none of the
invented answers happened to contain the word.

Two fixes, and the first one is the real one: the app's advance, reveal
and self-mark buttons now carry `data-advance`, `data-reveal` and
`data-mark-self`, so **nothing has to match prose**. And every drill
loop has a guard, so a drill that cannot advance fails loudly instead of
hanging.

This is the third time in this repository that a harness has shared a
mechanism with its own payload: a tab-separated dump split a record
whose value was a literal tab, and a `pkill -f` pattern matched the
shell running it. The lesson has a shape — **never key a test on
something the data can also contain.**

# The Probe page

`docs/web/platform/` is a measuring instrument, not an app: what the iPad
reports about itself, and a live QR reader for the watch's codes.

| | |
|---|---|
| `probe-nt1.js` | the NT1 panel: a good piece reads OK, a changed character fails its check code, a missing piece is named, WG Log's form is recognised |
| `probe-camera-stop.js` | the camera turns off on "stop" and stays off, twice, in a browser with a fake camera |

**Two handlers on one button.** The camera button started the camera from
an `addEventListener` handler and stopped it from `btn.onclick`. A press on
"stop" ran both: one stopped the stream and the other asked for a new one,
so on Larry's iPad the camera came straight back. Now there is one handler
with two states, and the test failed on the old page before it passed on
the new one.

# colregs

The colregs tests are mostly in `tests/` (the shell goldens, and
`tests/colregs-web-diff.sh`, which runs the shared functions in node and
in every awk on the machine and compares them line for line). One lives
here, because it taps the browser's drill:

| | |
|---|---|
| `colregs-twins.js` | no lights or sounds draw marks a look-alike wrong: every pair of vessels from every bearing, then the drill itself tapped row by row on a stand-in page; every "what tells them apart" line is checked against the lamps it describes |

**The test found two faults before it passed, one of them in the shell.**
Larry's ruling TBKP (24 November 2026) says a tap on a vessel that would
show the same lamps is right. The first build used the shell's
`light_sig()` as "the same", and the test failed on two counts. First,
`light_sig()` placed each lamp from the vessel's own reference point, so
one degree off her stern a lone sternlight and a lone anchor light were
"different", although both are one white light; the shell's quiz had the
same fault, and both now measure from the top lamp. Second, even then
`light_sig()` counts spacing, and a sailing vessel and the combined lantern
seen from ahead were still "Not her", while the line it gave read the same
words twice ("she shows white over red, and ... shows white over red"). The
look-alike test is now what a lookout would say she shows; spacing only
decides whether to say that spacing is the one difference left.
