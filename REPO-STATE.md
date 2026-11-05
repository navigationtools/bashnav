# Repository state

Last updated 2026-10-28. Published at
**https://github.com/navigationtools/bashnav**.

New here? Start with [`CLAUDE.md`](CLAUDE.md), then
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/HACKING.md`](docs/HACKING.md) and
[`docs/TESTING.md`](docs/TESTING.md).

---

## Versions

| tool | version | size | what it is |
|---|---|---|---|
| `bin/celnav` | 1.6 | 258 KB | celestial navigation: almanac, sight reduction, plotting, fix, and a teaching track |
| `bin/colregs` | 1.15 | 255 KB | rules of the road: lights, shapes, sounds, encounters, collision-avoidance scenarios, contact management, and an interactive review |
| `bin/tides` | 1.1 | 2.8 MB | harmonic tide prediction, 8,334 stations worldwide |
| `bin/deck-log` | 1.1 | 49 KB | the boat's records &mdash; deck, engine, provisions &mdash; append-only in UTC, spares derived by replaying the log |
| `bin/weather` | 1.0 | 106 KB | reasons over the log's observations and shows its working; ten lessons, the Coriolis tier and the wind demonstration; forecast scoring |
| `bin/bashnav` | 1.0 | 3 KB | the launcher: a menu in front of the other five, and one home-screen icon on an iPad |

Those sizes are measured, not remembered: the table had carried 153 KB for
`celnav` and 175 KB for `colregs` since before several months of additions, and
nothing checks them, so they drift silently. Re-measure them when you touch this
table rather than editing the one row your change affected.

Licence **Apache 2.0** (`LICENSE`, canonical text). `NOTICE` carries the
copyright plus the data terms: NOAA harmonics public domain, TICON-4 harmonics
CC BY 4.0. **The CC BY obligation travels with the data** regardless of the
code licence.

---

## Decisions taken, and why

**Apache 2.0, not MIT.** Commercial use is welcome; the patent grant and the
explicit warranty disclaimer are what a navigation tool needs.

**One repository, site included.** One thing to maintain, one URL.

**The site is generated from real output.** `docs/make-site.sh` runs the tools
and drops their actual output into the page, so the site cannot drift from
what the programs do. Same for the README pictures, via `docs/ansi2svg.awk`.

**Contributors opt in, name only.** `CONTRIBUTORS.md`. The review session
never asks for an email address, and there is a test that it does not.

**The COLREGs content is a training aid and says so** — in `colregs about`, in
`SAFETY.md`, and on the site. Where the program and the Convention differ, the
Convention governs.

**Pick a station, not a place.** A tide cannot be computed from a position.

**No tidal current data.** *Decided 2026-08-29.* NOAA publishes 4,430
current-prediction stations with harmonic constants and the same
reference/subordinate structure the heights use — but **US waters only**.
TICON, which gives the height data worldwide coverage, is heights. Larry's
call: US-only coverage makes it a no. Worldwide is the point of carrying the
tool at all.

---

## The browser build: all six tools

*Closed 20 Oct 2026.* `docs/web/` now carries the launcher and all six tools.
a-Shell proved a dead end for colour and for running a script by path, so the
iPad gets the browser build and the shell suite is for Mac and Linux.

| | |
|---|---|
| `docs/web/celnav/` | camera sight: an altitude from a photograph |
| `docs/web/colregs/` | lights, shapes, sounds, the rules |
| `docs/web/tides/` | harmonic prediction, all 8,334 stations |
| `docs/web/deck-log/` | the boat's records, append-only in IndexedDB |
| `docs/web/weather/` | read your own barometer |
| `docs/web/drill/` | a study machine, shipped with no material in it |

### A distractor must not come from the same paragraph

*Fixed 20 Oct 2026, the third layer of the same fault.* Neither comparing
how an option reads nor comparing what words it contains catches this:

    State Rule 3, and the order it gives.
      B  Change the trim of your forward-most sail first: forward to aft.
      D  The whole sail plan works as one driving force ... trim the
         furthest forward first ...

B and D share almost no words and neither contains the other, yet both
answer the question. D is the *reason* for Rule 3, and the reason cannot be
given without stating the rule.

Both are **hand-written questions with the same `where.sub`**. That is the
structural cause: two questions about one subsection have overlapping
answers by construction. So a pool option is refused when it shares a
subsection with the question and either of them is hand-written.

Narrowed to hand-written deliberately. Extracted questions are keyed to
distinct rows, so same-subsection answers are their *best* distractors --
plausible and genuinely wrong. The hand-written ones are the only kind that
ask about the same material from several angles, which is exactly what makes
them useful and what makes them collide. The rule suppresses 210 in-section
options and leaves the extracted pool untouched.

### One answer inside another is still one answer

*Fixed 20 Oct 2026, the same fault a layer down.* Normalising the text
catches a leading "The" and a full stop. It cannot catch this:

    The vang, the mainsheet and the topping lift.
    Vang, Mainsheet, Topping lift -- depower: ease the vang and mainsheet,
    raise the boom with the topping lift.

Both name the same three controls; the second only says more about them.
Asked *which three controls govern leech tension*, they are one answer
offered twice.

So the comparison moved from how an option reads to what it says. Significant
words, stop words and short tokens removed, and if every significant word of
the shorter option is in the longer, it is not a distractor. It suppresses 46
of 6,316 in-section pairs -- narrow, not sweeping.

Two things it taught, both of which were bugs in the fix rather than in the
code it fixed:

- **A number is always significant, however short.** Dropping tokens of two
  characters or fewer threw digits away with the noise, so "6 of them" and
  "4 of them" reduced to the same words. The synthetic test pack, whose
  answers differ only by a number, is what caught it -- the small pack is
  exactly where a stricter filter bites first.
- **A section can run out.** As more questions carry their own options, the
  pool left for the rest shrinks; in `safety` it shrank to nothing, which
  would have rendered one question with a single option -- an automatic
  mark, worse than the duplicate the filtering was added to prevent. The
  last resort is now the whole pack: an easier distractor, but the reader
  still has to know their own section's answer, and a fair easy question
  beats a free one.

An acknowledged gap, written into the code: the three-word floor means a
short option inside a longer answer is still offered. "Crew briefed" sits
inside "crew briefed and ready on the foredeck". Lowering the floor would
catch those and empty the pool at the same time, since "lower" alone is
inside half the mainsail procedures. The floor is the price of the rule.

### Two options a reader would call the same option

*Fixed 20 Oct 2026.* A graded question offered both

    The sails end up in front of the forestay, and winching them back is
    hard, slow, and damages sail or hanks.
    Sails end up in front of the forestay, and winching them back is hard,
    slow, and damages sail or hanks

-- the same sentence apart from a leading "The" and a full stop. Two right
answers, one mark, and picking the better-written one was marked wrong.

`makeChoices` compared pool answers with `!==`, which only catches a match
byte for byte. It now compares on how an answer *reads*: case folded,
punctuation collapsed, and a leading article dropped. Options are also
checked against each other, not only against the answer.

The pack was not at fault and did not change. The two sentences are
answers to two different questions, which is legitimate -- the fault was
offering both inside one question, so the fix belongs where the options
are chosen.

**The first attempt at a fix was worse than the bug.** A build-time rule
that removed any answer reading the same as another in its section would
have deleted 27 sound questions to repair one offered pair: "what is the
first action" and "what comes after X" can land on the same step, and both
are fair questions. The pack builder now reports the count and removes
nothing.

The test for this was also wrong first time round. It put the near
duplicate in a pool of five and asked whether it was offered -- but the
options are shuffled, so it passed three times in four. The duplicate is
now the only same-kind candidate, and same-kind is drained first, so it is
drawn or the fix worked. Confirmed to fail with the comparison weakened.

### A new worker does not change the page that installed it

*Fixed 20 Oct 2026, and it is why several fixes appeared not to work.*

The worker is cache-first, so the page you are reading was built from the
files the **old** worker had cached. Reloading fetches the new `sw.js`,
installs it, and lets it claim the page -- but the scripts already loaded
stay as they are. The new app appears on the **second** reload, and nothing
said so.

The practical effect: an installed copy sat on **build 3** through several
reloads while builds 4 and 5 were published, and every fix shipped into it
read as a fix that had not worked. Three separate causes were chased before
this one, because each of them was also real.

The page now listens for `controllerchange` and reloads itself once, so a
published build arrives on the first reload instead of the second. Mid-test
it does not: losing a part-finished test to an automatic reload is worse
than waiting one screen, so it shows a line saying the new version loads
when the test is left.

### The build/cache check now runs without a browser

*Moved 20 Oct 2026, after it missed the thing it was for.*

`drill.js` build 5 was written to this repository, reported as written, and
committed -- and what landed was build 4. The write and the commit raced,
and nothing compared the committed bytes with the bytes that had been
tested. The published pair then said **build 4 in `drill.js` and `drill-v5`
in `sw.js`**: a mismatch whose whole purpose is to be caught.

The check existed, inside `drill-ui.js`, behind the playwright gate -- so
it ran in the container and never on the machine that does the committing,
because playwright is not installed there. It is now two lines of `sed` at
the top of `run-drill-web.sh`, before the gate, so a plain

    sh docs/web/tests/run-drill-web.sh

catches it anywhere, with no browser and no node. Confirmed to fail on a
deliberate mismatch.

The general form, for next time: **a test that runs only where the work is
done, and not where the work is delivered, does not cover delivery.**

### Replacing a pack with a file of the same name

*Fixed 20 Oct 2026, and it is the fault that caused the other three.*

A file input fires `change` only when the selection **changes**, and a file
counts as the same selection if it has the same **name**. The input's value
was never cleared, so after loading `procedures.drillpack.json` once,
picking another file of that name did nothing at all: no error, no note,
the old pack simply stayed. From the outside the app appeared to offer no
way to replace a pack.

Every pack a builder produces tends to have the same filename, so this hit
on the second pack and every pack after it. Five bug reports in one morning
were questions that had already been removed, read out of a pack that could
not be replaced.

`f-pack.value` is now cleared after every attempt, so the next selection is
always a change. Replace also prints which pack is loaded now, so replacing
it is a deliberate act with a checkable result. The harness covers it, and
the check was confirmed to fail with the one line reverted.

The lesson is the one the service worker already taught in this same tool:
**a fix that cannot be identified from the outside is not delivered.** Three
things now carry a readable identity -- the app (`build N`, matched to
`drill-vN`), the pack (`built` and `id`, on the home screen), and the file
(`procedures-<id>.drillpack.json`, from the builder).

### The home screen says which pack is loaded

*Added 20 Oct 2026.* Loading a pack replaces the one in the browser's
storage, and nothing on screen said which one was being drilled. A rebuilt
pack therefore looked identical to the one it replaced, and a question
reported as fixed came round again from the old pack -- four times in one
morning, each time read as the fix not having worked.

The home screen now shows the pack's `built` date and a short content
digest, `id`, which the builder sets. The date alone is not enough:
rebuilding twice in a morning is the normal case while the questions are
being worked on.

Two test assertions were wrong and were corrected with it. The reveal check
asked whether the FIRST question's answer was on screen while the practice
loop had moved on to another, and both it and the leak check searched
`innerHTML` for raw answer text, which an answer containing `&` or `<` can
never match -- so a leak could have been reported as absent.

### Ordering questions: put these in order, one does not belong

*Added 20 Oct 2026.* A four-option question can test which step **belongs**.
It cannot test that you know the **order** without naming a position, and
"what is number four" asks about the layout of the page rather than the
procedure -- nobody in the water recalls item four, they recall what to do
once their head is out of the water.

So a question may instead carry `seq`, the steps in their correct order, and
`extra`, at least one step from a different procedure. The app offers them
scrambled; you tap them into order and leave the intruder alone. Marked all
or nothing: partial credit would make a near miss on a sequence look like
competence, and on a MOB chain a near miss is a different outcome.

Refused at load, because none of these can be seen while drilling: fewer
than three steps, the same step listed twice, no intruder at all, or an
intruder that is also one of the real steps -- which would mark you wrong
for leaving out a step that genuinely belongs.

`CACHE` is `drill-v3` and `BUILD` is `3`; the harness still asserts they
agree. The harness also learned to drive an ordering question, which it
needed: the drive loops click `.choice`, an ordering question has none, and
without that the suite would have stopped covering the graded test the
moment a pack contained one -- silently, because the loop would simply find
nothing to click.

### A drill question may carry its own wrong options

*Added 20 Oct 2026.* `drill` builds a test's four options from the other
answers in the same section, preferring ones of the same `kind`. That holds
while the answers are mutually exclusive and fails when they are not: *which
of these is on the hoist preparation checklist?* can draw three more items
off the same checklist, and offer four right answers against one mark.

A question may now carry `ch` -- exactly three wrong options -- and when it
does the app uses those and its own answer, and nothing from the pool.
Two rules are enforced when a pack loads, because neither failure is visible
while drilling: a wrong option equal to the answer is a question with two
right options, and a repeated wrong option is three options wearing four
labels.

**`sw.js` had to change with it, and that is the part worth remembering.**
The worker is cache-first, so an installed copy keeps serving the `drill.js`
it cached, and a browser only reinstalls a worker when `sw.js` itself
changes. A fix shipped without touching `sw.js` reaches nobody who has
already used the tool, and to them it looks as though the fix did not work.
`CACHE` is now `drill-v2`, `BUILD` is `2`, and `run-drill-web.sh` asserts
the two agree -- so bumping the cache is checked rather than remembered.

The app still ships with no material in it. What uses `ch` is the pack,
which is built outside this repository and stays on Larry's own machines.

### Where the site lives, and why `docs/web/`

*Moved 20 Oct 2026.* GitHub Pages is set to **`main` → `/docs`**, which makes
`docs/` the root of the website and everything above it unpublished. The browser
build used to sit at `web/` in the repository root, so Pages never served it:
the three links to it from `docs/index.html` were 404s, and so was every tool.

Moving it to `docs/web/` fixes that without changing a single URL, because
`docs/` *is* the site root — the tools are still at
`https://bashnav.navigationtools.org/web/<tool>/`. That matters more than it
sounds: the origin and path are what a service worker caches under, what
IndexedDB keys on, and what an Add-to-Home-Screen icon points at. A layout that
changed the URL would have orphaned every installed icon and every stored log.

What it impacts, and what had to change with it:

- The harnesses in `docs/web/tests/` walk up to the repository root to reach
  `src/`, so each gained a level: `../..` became `../../..`. The tides harness
  caught this itself by failing to find `stations.dat`.
- `docs/web/tides/gen/mkindex.py` and the three `gen/make-*-web.sh` scripts
  write into the build, so their output paths gained the `docs/` prefix.
- `docs/.nojekyll` stops Pages running Jekyll over 112 static files that need
  no rendering. Before the move, Jekyll was building the landing page out of
  `README.md` and serving it under its default theme — which is why the
  published front page was a plain white Markdown render rather than the
  designed site in `docs/index.html`.
- `CLAUDE.md`'s staging example is now `git add docs/ src/`, since `web/` is no
  longer a top-level directory.

The deliberate consequence: a file is published only if it is under `docs/`.
`src/`, `bin/`, `tests/` and `release/` are not served, and moving something
into `docs/` is now an explicit act rather than a side effect.

`deck-log` and `weather` **share one log**: both are served from this origin,
and IndexedDB is per-origin rather than per-path, so they genuinely share one
store. A service worker's *scope* is per-path, though, which is why
`weather/log.js` and `weather/store.js` are byte-identical copies rather than
loaded from `../deck-log/` — out of scope they would not be cached and the tool
would not work offline, which is the entire point.

### celnav: the almanac and the star list

*Task 23.* Two screens the browser did not have, both following
`cmd_almanac()` and `cmd_stars()` field for field:

- **Almanac** — Greenwich hour angle and declination for any instant, with
  semi-diameter and horizontal parallax, and sidereal hour angle and magnitude
  for the stars and planets. Aries is always shown, because every star sight is
  worked from it. Nothing is looked up: the same series the sight reduction
  uses computes it, so there is no year to run out.
- **The star list** — all 58 by number, with proper motion and precession
  applied to the date rather than reprinted from a catalogue.

`docs/web/tests/celnav-tables.js` compares both rendered tables against what the
shell prints — 389 checks over 6 bodies and 58 stars — because what goes wrong
in a table is not the arithmetic. Two things did:

1. **The star list opened at Ankaa.** The awk indexes its star arrays from 1 and
   the port indexes them from 0, so star 1 was absent and the loop ran one past
   the end. Every value in the list was right; the list was wrong. `engine.js`
   says `// i is 0-based here` on `star_pos`, which is exactly the comment that
   exists because this is easy to get wrong.
2. **A GHA has no hemisphere.** Rendered with the latitude formatter, Aries came
   out as `091 01.8' E`, which is not a thing. `dm3()` is awk's `fmt_dm(x, 3)`.

The home screen also led with camera sight and a lede reading "an altitude from
a photograph" — the same framing corrected on the launcher tile. Sight reduction
is first now, with the almanac and the star list beside it.

### celnav: the noon sight, Polaris, planning and the compass check

*Tasks 24 and 25.* The four screens that completed the browser port of the
celnav command set, all following their `cmd_*()` in `src/celnav/engine.awk`.

- **Noon sight** — when the sun crosses your meridian, the equation of time, the
  altitude to expect, and after a reading, the latitude. In two halves because
  the command is: what to take on deck, and what the reading gave.
- **Polaris** — latitude from one star, all night. Both corrections are printed
  every time, the first-order `-p cos LHA` and the exact solution, because the
  gap between them is why the almanac's Polaris table needs three columns.
- **Sight planning** — twilight in UT and local mean time, the moon, everything
  above five degrees by azimuth, the best three, and a sky view drawn as SVG.
- **Compass check** — the true azimuth of any body against what your compass
  says, giving compass error and, with the chart variation, the deviation of
  your own compass.

**Three shared functions were extracted or written in both implementations
rather than read twice.** `lan_jd()` and `pol_lat()` did not exist in the JS
engine at all; `plan_sky()` was sixty lines inside `cmd_plan()`, which would
have made the port a second reading of its prose — and the selection of three
bodies is exactly where a second reading goes quietly wrong. The extraction was
proved output-identical first, fifteen position/date/awk combinations byte for
byte, and `celnav-diff.js` now holds all three to the awk at full precision,
with the planner's recommendation compared **by name**.

Eighteen faults were planted across the four screens and watched go red. Two of
them are worth keeping:

1. **Letting the last triple win a tie, instead of the first.** Ties in the
   azimuth-spread search are not hypothetical; this changed the recommendation
   on four cases in sixty.
2. **`printf`'s `%.1f` is not `toFixed(1)`.** C rounds a tie to the even last
   digit and JavaScript rounds it up. Deneb's catalogue magnitude is exactly
   1.25, so the shell's planning table printed `1.2` and the page printed `1.3`
   — one star in 58, and invisible to anything numerical because both are the
   same number. `celnav-app.js` has `f(v, dec)` now and everything the shell
   also prints goes through it.

The two halves of the browser verification caught disjoint faults here, cleanly
enough to be worth stating: cutting `lan_jd()`'s five iterations to one is 3e-5
of a day out on every case and leaves `16:46:29 UT` on the screen unchanged,
while printing Polaris's GHA with the latitude formatter leaves every function
in the engine agreeing to twelve decimals. See `docs/TESTING.md`.

### And then the other four, which completed the port

*Task 26.* **Pub. 249**, generated rather than shipped &mdash; every entry is the
navigational triangle solved for whole degrees, so the engine *is* the table and
the exact page a sight needs is printed instead of the handful an extract would
carry &mdash; with the tutor that marks what you read off it and **attributes**
the difference: the table's rounding is small and bounded, while each common slip
has a size of its own. **The sandbox**, where three sliders move the triangle's
three given parts and the sides are drawn as the actual great circles.
**The walkthrough**, ten steps generated from `teach.awk`, with all three of its
figures drawn by the app rather than left as named gaps. And **the drills**, six
kinds, generated from the real almanac and marked.

With those, **every celnav command that computes anything has a browser screen.**
`sh docs/web/tests/run-celnav-web.sh` is nine stages.

Four things found while proving them, all in `docs/TESTING.md`:

1. **`printf`'s `%.1f` is not `toFixed(1)`.** C rounds a tie to the even last
   digit; JavaScript rounds it up. Deneb's magnitude is exactly 1.25, so the
   shell printed `1.2` and the page `1.3`.
2. **A screenshot is not byte-stable.** Two consecutive captures of an unchanged
   page differ by tens of pixels. The figure check compares pixels now, and the
   put-back belongs to the capture rather than to the check.
3. **A seed is the problem's name**, so the drill generator's pseudo-random
   sequence is part of the specification and is diffed seed for seed.
4. **The reference emitter is code too.** Porting Pub. 249 produced 91
   disagreements, every one of them in the harness and none in the browser.

And a shape change worth knowing about: celnav's home screen reached thirteen
tiles, which on a phone is a scroll and not a menu. They are grouped now &mdash;
working a sight, what the almanac gives you, learning it.

### The site's pictures are the apps' own drawings

The front page showed thirteen `ansi2svg` renderings — the terminal's
characters drawn as SVG — on a page that now leads with the browser apps. They
are the apps' own `<svg>` now, captured out of the running page by
`docs/web/gen/make-app-figures.sh`: the celnav plotting sheet, a vessel's
lights, her day shapes, an encounter, and the tracking party's relative-motion
plot. Captures are reproducible because `Math.random` is seeded before any app
code runs, and `docs/web/tests/run-figures-web.sh` recaptures and diffs.

**Then two or more per app**, which needed screenshots: `tides`, `deck-log`,
`weather` and `drill` draw nothing at all — they are tables, logs, forms and
prose — so nine of the fifteen figures are pictures of the real screen. They
are the repository's only binary files. The clock is frozen, the timezone
pinned, day mode forced and the viewport fitted to the screen, and all fifteen
reproduce byte for byte.

Two things fell out of doing it. `drill` had **no section on the site at all**,
only a row in the table of tools — it has one now. And the launcher's celnav
tile still read *"Camera sight — an altitude from a photograph"*, which was the
whole of the app when the tile was written; celnav is a sight reduction
calculator first, a teaching track second, and the camera third.

The sound-signal timeline turned out to be a real drawing too, not the text
table it was retired as. What stayed retired are the screens that do not exist
in the browser yet — the sky view and the navigational triangle, which are the
planner, task 25 — and the terminal menus.

**Capturing them found a COLREGs fault**: the browser drew a mine clearance
vessel with four balls, where Rule 27(f) gives three. The port had read the
shell glyph `(O)---+---(O)` as a picture and turned the `+` — which marks where
the yard crosses the mast — into a shape. Her *lights* have been checked at
sixteen angles since Larry found that same arrangement wrong there;
`tests/app-figures-check.sh` now asserts it for her shapes too.

### Three apps were shipping to nobody

Every app's worker is cache-first with no revalidation, so bumping `CACHE` is
the only way an installed copy ever sees new files. Three had not been bumped:

| app | was | served files that never reached an install |
|---|---|---|
| `celnav` | `celnav-v3`, displaying "build 8" | the sight-reduction screen, the 43 nm fix, the planets' parallax |
| `colregs` | `colregs-v10` | `colregs.js` |
| `weather` | `weather-v3`, displaying "build 2" | `weather.js`, `lessons.js` |

All three are bumped, and every app's displayed build now equals its cache
version so the number you read answers the question you are asking.

The check for this existed — for `colregs` only, written after Larry reloaded
against `colregs-v1` for an afternoon, and later copied for `drill`. It is one
loop over all six apps now, plus `tests/sw-cache-check.sh`, which compares the
files each worker precaches against the commit that set its cache value. A
`BUILD` label can be bumped while a served file is left out of the bump; the
label check cannot see that and this one can.

### One escaper for every generator

Nine generators — celnav, four colregs files, three weather, deck-log, plus
`tests/review-pack.awk` — each carried their own copy of

    gsub(/\\/,"\\\\",s); gsub(/"/,"\\\"",s)

and all nine were wrong the same way: the doubling happens inside gsub's
**replacement string**, the one place POSIX leaves backslashes to the
implementation. mawk 1.3.4 20200120, which Debian and Ubuntu shipped for years,
emits one backslash where every other build emits two. On such a machine every
generated browser file came out silently wrong — a celnav lesson showing a
shell line continuation lost its backslash and rendered a literal `\n`.

They now share `docs/web/gen/jsonesc.awk`, which uses `index()` and `substr()`
only. `split` was tried first and is also unusable: one-true-awk compiles a
single-character separator as a regex, and a lone backslash is a dangling
escape, so it split on newlines too.

`tests/jsonesc-check.awk` holds the escaper to a literal answer per awk, which
is the check the regenerate-and-compare ones could never be — they compare the
generator with itself, so on the broken awk they call the *committed* file stale
and following their advice commits the broken one.

Three more things fell out of the same sweep:

1. `weather`'s and `deck-log`'s generators had **no regenerate-and-compare at
   all**, and `docs/web/weather/lessons.js` had gone stale: the committed file
   was missing a passage of the Coriolis lesson. Both are compared now.
2. The contacts card was built by an **inline awk program**, so adding the
   shared `-f` file silently deleted the program and the card generated as five
   empty strings. It is `docs/web/colregs/gen/dumpcard.awk` now. `docs/HACKING.md`
   has had that entry since a truncation test did the same thing.
3. The container clone was committing as `Claude <noreply@anthropic.com>`
   rather than as Larry. Its `user.name`/`user.email` are set now.

### The README and the site, browser-first

The README was rewritten to lead with the browser apps rather than the shell
build, and `docs/site-template.html` with it. Four suite checks broke, and
sorting them was the useful part: three encoded the README's old *shape* and
were reshaped to check the property instead; two were protecting *content the
rewrite had dropped* — the launcher's pasted menu, and the install section's
"no app to install" and `~/Documents` — and that content went back in, because
an iPad reader still needs it. `docs/TESTING.md` has the detail on each.

Reshaping `plates-check.sh` to rebuild the whole site under each awk found two
faults the same afternoon, both weeks old:

1. **Two front-page plates blanked silently under mawk.** They were generated
   from the colregs engine alone; gawk and one-true-awk resolve a function at
   the call and never reach `rv_keys()`, mawk refuses the file at parse time.
   The awk was at the head of a pipeline, so `set -e` could not see it fail.
2. **`make-site.sh` exited 1 on success.** `grep -c` returns 1 for a zero
   count, and that `grep` was the script's last statement under `set -e`. That
   same statement only warned about an unfilled `{{PLACEHOLDER}}`; it fails the
   build now, like the blank-picture check beside it.

`make-site.sh` now checks its text plates for emptiness the way it already
checked its pictures, and threads an `AWK` setting through every invocation so
the site can be rebuilt under a named awk.

### How the browser builds are verified

`tests/run-tests.sh` stays POSIX `sh` and `awk` so it runs on the boat. The
browser suites need `node`, `python3` and a headless Chromium, so they live in
`docs/web/tests/` and are run before a push:

    sh docs/web/tests/run-tides-web.sh [--full]
    sh docs/web/tests/run-decklog-web.sh
    sh docs/web/tests/run-weather-web.sh
    sh docs/web/tests/run-drill-web.sh
    sh docs/web/tests/run-celnav-web.sh [--full]

Nothing in them is checked against a number somebody typed. Every reference
value is **emitted by running the awk engine**, and the harnesses load the
**shipped** files under `docs/web/`, so a stale copy cannot pass. The browser
stages skip themselves with a message when playwright is absent rather than
failing.

**A module diff proves the physics; only driving the page proves the wiring.**
The tides engine agreed with the awk over 955,255 values while the page was
visibly wrong — it predicted the UT day and labelled it in the station's time,
so at Newport the previous evening's low water sat at the top of the table.
Both sides of a module diff happily used UT midnight.

### Three faults in the shipped tools, found by those diffs

1. **`deck-log` was completely dead under mawk 1.3.3.** See the loose end
   below; this is the serious one.
2. **`weather` never scored the user.** `do_forecast` wrote `by=user` while
   the score sheet's three names are `you rules persist`, so the one column
   the learning loop exists for was accumulated and never printed.
3. **`colregs`' `about` still said twenty vessels** after the WIG craft and
   the submarine took the tables to 22, and the give-way calls to 73. That one
   `run-tests.sh` was already reporting.

### Two faults in the browser celnav, found the day its harness was written

Both were in the port, not in the shell, and both had survived because the
port had only ever been checked a function at a time.

1. **The fix was `solve_fix()`'s first pass.** `solve_fix()` linearises the
   reduction about the position it is handed. From a live DR the first pass is
   right to 0.02 nm; from a DR five degrees stale it is **43 nm out**, and the
   camera flow had been reading it since it was written. `cmd_fix()` in the
   shell never had the bug — it re-reduces from its own answer until the
   correction falls under 0.02 nm. Every per-sight number the page showed was
   correct, so nothing looked wrong.
2. **The planets' horizontal parallax was zero**, under a comment claiming the
   awk multiplied it by zero. It does not. 0.08' on a Venus sight at 14°.

The convergence loop is now `converge_fix()` in `engine.awk`, called by both
`cmd_reduce()` and the harness, so the test cannot agree with a second copy of
itself. `docs/web/tests/run-celnav-web.sh` runs 21,468 comparisons per 400
generated cases under every awk on the machine, then types five scenarios into
the real page and checks the fix it *shows* against the shell's own working.

### And three in the harnesses, the same mistake three times

A generated corpus can throw itself away and still pass, because both readers
reject the same bad input. The 100,000-record deck-log run reported *22,176
good, 77,824 bad* and passed; the valid-time check reported 276 round-trip
failures, which is exactly the number of impossible dates in 2000–2040.
**Check the counts, not only the agreement.**

The third was the same error one level up. `celnav-ui.js` exists to catch a
fix displayed as `35 010.0' N`; the fault was planted and the check passed,
twice, because the zero-pad only goes wrong for minutes in **[9.95, 10)** and
no angle in the scenario was in that window. The window is invisible in the
output, so the harness now reads it off the input sights and **refuses to pass
a scenario without one**. *Break it and watch it go red* is only evidence when
the break is the one that ships.

---

## weather: a second tier, and the Coriolis lesson

*Added 20 Oct 2026.* Each lesson stays short enough to read on a pitching
boat. Where there is more to say, it sits behind a prompt -- `there is more
on this one` in the shell, a **Learn more** button in the browser -- and it
is not in the page until it is asked for, the same rule the answers follow.

`coriolis` has the first one, to Larry's design: the phenomenon seen from an
inertial frame, where nothing curves and nothing pushes, and what is
conserved is angular momentum about the earth's axis. The demonstration is
naval gunfire. Fired north from 45 N a shell carries that latitude's
eastward speed, moves closer to the axis, must speed up eastward to conserve
`u x r`, and outruns the slower ground beneath: it lands east of the aim.
Fired south it lags the faster ground and lands west. Going north, east is
to the right; going south, west is to the right. **Both deflect right**, and
both deflect left in the southern hemisphere.

Then the payoff: pressure pushes air from the high toward the low, the same
bookkeeping turns it right the instant it moves, so it circles rather than
running down the gradient -- and friction at the surface tips the balance
back toward pressure, which is the net inflow to a low and outflow from a
high, convergence and rain against subsidence and clear.

Three honesty notes are written into the lesson, because each is a place it
could mislead:

- Angular momentum about the axis settles the **north-south** case
  completely, which is why the two shells are the demonstration. East-west
  motion needs the gravity and centrifugal balance as well, and the lesson
  says so rather than implying one principle covers both.
- The shell feels *almost* no torque about the axis. Drag shrinks the
  effect; it does not change its sign.
- Gunnery **drift** is the deviation from the shell's own spin on a rifled
  barrel, a different cause, and only the earth-rotation part reverses with
  hemisphere. Long-range tables correct for both.

The figures are computed, not recalled: ground speed east 1,674 km/h at the
equator, 1,184 at 45 degrees; a 16 inch shell at 38 km and about 90 seconds
of flight arrives where the ground runs 7.1 km/h slower east, giving ~89 m
of sideways error -- the hundred yards the tables carry.

**Written in the awk, which is the point.** `lesson_more()` sits beside
`lesson_body()`, the generator captures it the same way, and
`weather-les.js` reconstructs it from `lessons.js` and compares it with the
awk character for character. Deeper content is exactly where a quiet
divergence between the two builds would matter most, and that diff is the
only thing that would notice; confirmed to catch a single changed word.
`golden.sh` captures it too, and the browser suite drives the button:
offered, absent from the DOM until pressed, present after.

### Three latent faults the move had left in the generators

Found while regenerating `lessons.js`, and none had bitten because nothing
had run these since the site moved under `docs/`:

1. **`ROOT` was three levels up, not four.** These scripts live at
   `docs/web/<tool>/gen/`, so `../../..` is `docs/`, not the repository
   root.
2. **The paths still said `$ROOT/web/...`.** The path sweep after the move
   skipped anything preceded by a slash, to protect the
   `github.io/bashnav/web/` URLs, and `$ROOT/web` looked like one of those.
3. **So the two cancelled exactly** -- a wrong root plus an un-updated path
   landed on the right directory, and the scripts kept working while both
   halves were wrong. Correcting one alone broke them, which is how they
   were found. All three generators now reproduce their committed output
   byte for byte.

And `weather.js` had the service worker's cache name written out a second
time, to report offline status -- so bumping the worker, which every change
to a cached file requires, would have left the page looking in a cache that
no longer existed and reporting "not cached" on a tool that was cached. It
now finds the cache by prefix instead of naming it.

## Next: set and drift

*Agreed 2026-08-29. Designed, not built.* Lives **in `tides`**.

Larry's framing, and he is right about the priority: the daily navigational
problem underway is not clearance under a bridge, it is what the water is
doing to you and what to steer to allow for it. The README claimed "the two
questions a tide table is actually for — is there enough water, and does the
mast clear the bridge". That was a tidy pair rather than an honest ranking,
and it has been corrected.

**The module needs no flow data at all**, which is why the decision above
costs nothing. Both halves are vector geometry:

1. **Measuring set and drift.** Run a DR from a known fix; take a second fix.
   The vector from DR to fix, over the elapsed time, is set and drift. This is
   the honest number, because it contains *everything* that moved you — tidal
   stream, wind-driven current, leeway, log error, helmsman's bias — not just
   the part a table predicted.

2. **Using it — the current triangle.** Intended track and boat speed through
   the water on one side, set and drift on another; course to steer and speed
   over ground fall out. And the reverse, from what was observed.

It is the same triangle Larry solved by hand in the fire control tracking
party — own ship's vector, the relative vector, the target's vector. In
collision work you solve for the target's motion; in current sailing you solve
for the water's. `src/colregs/contacts.awk` already has that machinery and it
should be lifted, not rewritten.

**The one honest link to the tide data**, and worth building because it works
worldwide with the constants already present: tidal stream atlases are indexed
by **hours from high water at a standard port** ("HW Dover −3"). `tides`
already knows HW time everywhere it has a station, so it can say *which page
of the atlas you are on*. That is a real, useful connection between the height
data and the stream — as opposed to computing a stream from a height curve,
which is not possible. In a standing-wave basin the stream runs hardest at
half-tide and goes slack at HW and LW; in a progressive wave the flood peaks
*at* HW; which one you are in depends on the shape of the coast.

---

## The platform bug, 2026-08-30

**None of the tools could start on an iPad**, from the first release until this
morning. iOS refuses writes in `$HOME`; every tool kept its data there. Found by
Larry the first time he tried to run them on the boat, not by the suite. Fixed
(`src/common/05-home.sh`) and covered (`tests/ios-home.sh`). Full account in
`CHANGELOG.md` and `docs/HACKING.md`.

The lesson worth carrying: **the suite ran on machines that shared the code's
assumption.** Everything else this project targets — a-Shell's awk, a small
screen, no network — is modelled somewhere in the tests. A writable `$HOME` was
not, because it never looked like a platform question.

## The iPad release

`release/make-ipad.sh` builds **`release/bashnav-ipad.sh`**, one self-extracting
installer carrying all six tools.

**It is generated *and committed*, like `bin/`.** It was gitignored for a day, on
the reasoning that a release asset should not be a tracked file. That reasoning
assumed somebody would be cutting GitHub releases by hand, and the README's
`curl` line pointed at a `releases/latest/download/` URL that did not exist.
Larry's call: track it. The install line now points at the file in the repo and
works the moment a change is pushed, with no release step at all.

**The cost, stated so it stays a decision.** The installer is a copy of all six
binaries, so every change to any tool writes a fresh ~3.4 MB blob into git
history &mdash; on top of the 2.9 MB `bin/tides` already costs. If the repository
ever becomes unpleasant to clone, the fix is to go back to a release asset and
point the README at it; nothing else depends on the file being tracked.

CI checks it is not stale, the same way it checks `bin/` &mdash; regenerate, then
`git diff`. A stale installer would hand an iPad an older tool than the repo
claims, and nothing on the boat would say so.

## Loose ends

1. ~~**`docs/index.html` still describes two tools.**~~ **Closed 19 Oct 2026.**
   The site now covers all six tools and the browser build, shows the real
   output as pictures with the terminal text folded underneath each one, and
   `make-site.sh` fails the build if any picture comes out blank. Every SVG it
   generates is now used by something.
2. ~~**Five orphaned SVGs on GitHub** from before a rename.~~ **Closed 19 Oct
   2026** — `contacts.svg`, `lights.svg`, `lights-mineclear.svg`, `plot.svg`
   and `sky.svg` removed with `git rm`. They were byte-identical duplicates of
   the `colregs-*` and `celnav-*` names and nothing referenced them.
3. ~~**POSIX interval expressions in an awk regex.**~~ **Closed 20 Oct 2026**,
   and worth reading even though it is closed. `lg_parse` guarded the record
   type with `/^[a-z][a-z0-9]{0,4}$/`. That is correct POSIX ERE, and **mawk
   1.3.3 does not implement it** — it reads `{0,4}` as four literal
   characters, so `eng` did not match and *every record was rejected*.
   `deck-log` then refused to write an entry and read an existing log as
   empty: total failure, on the awk that `awk` is on Debian, Ubuntu and
   a-Shell, which is also the first name `pick_awk()` tries.

   The guard that refuses to write a record it cannot read back did its job —
   nothing was ever corrupted — but a sailor would have seen a tool that
   silently declines to keep the log. gawk implements intervals, which is why
   it reached a release.

   Written out instead, and proved equivalent over 137,257 generated strings:

       ^[a-z]([a-z0-9]([a-z0-9]([a-z0-9][a-z0-9]?)?)?)?$

   `tests/interval-check.awk` now forbids the construct in any awk source and
   is wired into `run-tests.sh`. It was checked against three bad forms *and*
   three innocent ones — a check that cannot fail is worth nothing.

4. **`src/decklog/log.awk` is a dead byte-identical duplicate** of
   `src/common/log.awk`. `build.sh` uses the one in `common/`; nothing uses
   the other. Both carry the interval fix, but the duplicate is a trap: a
   future edit to it would silently never reach the build. It should be
   deleted.

5. **A Shortcuts recipe for iPad GPS → `tides near`**, so a position can be
   handed to the tool without typing it. The Shortcuts groundwork is now in the
   README — a-Shell's **Execute Command** action, set to run **In App** — and
   this one differs only in passing an argument the Shortcut computes. *Not
   tested on hardware.* Larry has the iPad; the recipe is written from a-Shell's
   own documentation and needs one run to confirm.
6. **The Clipper training app.** Larry has emailed Clipper for permission to
   build an interactive trainer from their course PDFs. Nothing is to be built
   from those materials without written permission — their text is
   copyrighted. Facts and methods are not, and can be taught freely in our own
   words.
7. **Tag a release** and attach `release/bashnav-ipad.sh` and the six binaries,
   so people who only want the tools do not have to clone 2.9 MB of station
   data through git. The README's iPad instructions already point at
   `releases/latest/download/bashnav-ipad.sh`, so this is now load bearing.
9. ~~**The `ansi2svg` pipeline is now dead weight.**~~ **Settled 25 Oct 2026 —
   it stays.** The front page leads with the browser apps and its figures are
   those apps' own drawings, so most of the fifteen `docs/img/*.svg` terminal
   renderings are not referenced by a page; `{{PLOT}}` and `{{ENCOUNTER}}` still
   feed the collapsed "the same thing, as your terminal prints it" block under
   each figure. Larry's decision was to keep the lot and say in the comments
   that it is first-generation, which is now written at the head of
   `docs/ansi2svg.awk` and above the picture section of `docs/make-site.sh`.
   The reasoning, so it is not revisited: this is the only thing in the
   repository that can photograph a terminal, `tests/plates-check.sh` rebuilds
   all of it under every awk so it cannot rot quietly, and adding a picture is
   reasonable where removing one for want of a link is not.

10. **celnav's browser port is four screens from complete.** The commands with
    no browser screen are the drills, the annotated walkthrough, the sandbox and
    the generated Pub. 249 tables. The first three are teaching surfaces rather
    than arithmetic; the tables generator is `tab_page()` and already a
    function, so it ports the way `plan_sky()` did. `drill` also still has only
    one figure on the site, and a second needs a synthetic demo pack — which
    must not be Clipper material.

8. **`seamanship` is held**, on the local `seamanship-hold` tag and not in this
   repository, pending Clipper's answer. Larry has a personal binary. See the
   note above: if Clipper objects even to the generic build, it stays on his
   iPad and never enters `bashnav`.

---

## Three figures that were owed — all built, and a fourth thread off the last one

*Opened 26 Oct 2026, after Larry went looking for them on the site and found
them missing.* They are listed here rather than mentioned in passing because
one of them had already been discussed once and lost — he asked, in as many
words, that they be kept track of.

### 1. ~~The README has pictures for two of the six tools~~ **— all six now**

`README.md` carried three pictures — the celnav plotting sheet and two colregs
drawings — and nothing for tides, deck-log, weather or drill. It carries seven
now, and the four new ones arrived as full worked examples rather than
decoration: prose, a real run printed as text, then the app's own picture of the
same thing. **Every line in those blocks is verbatim output of a live run**, not
a hand-written sample; 52 lines across the three blocks that have one were
compared against the tools' actual output before the commit.

The fourth, `drill`, has no output block and should not have one — it is the one
tool with no shell build, because reading a file the user chooses and keeping it
in that browser's own storage is not something a terminal can do.

**Where each block comes from, so a later session can re-derive them rather than
trust them:**

| | |
|---|---|
| deck-log | `sh docs/web/gen/decklog-fixture.sh <dir>`, then `deck-log spares` and `deck-log shopping` with `DECKLOG_HOME=<dir>` |
| tides | `tides find "new london"`, pick 1, then `tides sky 2026-08-29` |
| weather | the four-line warm-front log in `tests/run-tests.sh`, then `weather what` |

Also corrected while in there: the celnav section still said its nine lesson
diagrams were "still being drawn for the browser". They have been real drawings
since the port finished, and the README was telling readers a finished feature
was unfinished.

### 2. ~~The weather example has no illustration at all~~ **— and deck-log's was a picture of an empty app**

"Forecast before you look" now shows what the tool finds in four observations
and then the screen that refuses to forecast until you have.

The thing worth recording is what turned up on the way. **Both deck-log figures
were photographs of an EMPTY app** — "No equipment yet", "No part has moved
yet", "Nothing outstanding" — and they were on the live site as well as absent
from the README. The one claim that makes the tool worth having is the one
thing an empty locker cannot show: the holding is DERIVED by replaying the log
and is never stored. You cannot see a count come down from a job that used a
part when no part was ever used.

`docs/web/gen/decklog-fixture.sh` is the fix and it is deliberately ONE file for
both builds: a small boat — two machines, three parts, a stocktake, an open
finding and a job that consumed a spare — fed to `bin/deck-log` for the README's
text and to the browser's own store for the picture. The registry and the log
are byte-identical formats in the two builds, which `views.awk` and `views.js`
both say was deliberate, so one fixture cannot drift into two boats. That
matters because this project has already shipped a figure and its prose as two
different runs once: the celnav plot sheet was captured with ie 0 and he 2.5
while the text beside it quoted 1.5 and 3.0.

The entry screen was the same story and is fixed by the same fixture — position,
course and speed are state in deck-log, shown as they were last logged, and a
blank form cannot show that either. It now reads "carried forward" against real
values.

**And the fixture found a bug.** See `docs/TESTING.md`, "A golden file cannot
tell you the output is missing something": the log listing printed a field name
no writer has ever set, so the wind was blank on every nav record ever logged,
and the golden file had the blank committed as correct.

### 3. ~~The naval gunfire figure~~ **— built, and then made to move**

The *lesson* shipped on 20 Oct: it is the Learn-more tier behind `coriolis` in
`src/weather/teach.awk`, with the figures computed rather than recalled, and it
reaches the browser build as well. What was never built is the **drawing** — the
two shells fired north and south from 45 N, both deflecting right.

`weather` had **no figure pipeline of any kind** — no character-grid calls in any
of its awk — which is why this did not happen when it was first discussed: it was
not "add a figure", it was "give the tool its first figure". It has one now,
`src/weather/grid.awk`, and the figure is `gun_figure()` in it. The file's head
explains why it is a fourth copy of the grid rather than a shared one, and what
to do if a fifth tool ever needs it.

**And then Larry asked for it to move.** The browser's version is now a
drawing you operate: the gun trains round the compass, it fires and the
shell traces its arc, and a latitude slider runs from 80° S to 80° N. That makes
the lesson's argument stronger rather than only prettier — for horizontal motion
the deflecting acceleration is `2Ω v sin φ` perpendicular to the track *whatever
the bearing*, so training the gun and watching the number hold turns "fired
north" and "fired south" from two curiosities into two cases of one rule. The
metres shown are real for the latitude on the dial; only the drawn track is
exaggerated, by a factor derived from a pixel budget so it cannot leave the box.

**It also found a factor of two in the lesson's own arithmetic.** The deflection
had been computed from the ground's slowing alone — 7 km/h — leaving out the
shell's own speed-up, which the prose states and the sum omitted. The two
together are 14 km/h and the offset is about **175 m**, not 90. Both routes to
it are now in the lesson, and `weather-gun.js` guards against the halving coming
back.

The shell build keeps the static character figure, because a terminal has no
slider. That is the one place the two builds deliberately differ, and both
checks that compare them word for word were taught the correspondence rather
than silenced — see `docs/TESTING.md`.

Two things the build turned up, both recorded where they belong:

- Weather's `col_init()` is the shared `src/common/colour.awk`, which has no panel
  concept. celnav's own adds `C_PANEL` and `C_EOL`, and `gshow()` needs them —
  copied without that the figure would print unpainted, which on a light terminal
  profile is white artwork on white, the exact failure `docs/HACKING.md` records
  for the colregs lights. `grid.awk` defines them itself.
- Adding one file to weather's engine meant editing **ten separate file lists** —
  `build.sh`, four in the suite, `golden.sh`, the web generator and five browser
  harnesses. They are all correct now, and the duplication is the next thing to
  tidy if weather gains another file.

**The frame it is drawn in was the design decision.** The lesson tells the story
in the inertial frame, where nothing curves and nothing pushes, and that is the
honest account — but it does not *draw*. At true proportions a shell's path in
that frame is a straight radial line and the ground turns under it by an
invisible amount, which is precisely why the real deflection is a couple of
hundred metres and not ninety miles; drawn at a scale where the rotation shows,
the straight line wraps most of the way round the pole and stops looking like
gunnery at all.

So it is the gunner's frame, which is what a range table's diagram shows: the
line of fire, the track, and where the shell actually falls. Two panels, because
the point is the punchline — fired north it falls east, fired south it falls
west, and both of those are to the *right* of the line of fire. One panel cannot
show that; two show it without a word.

The curve is computed, not drawn by hand: the rotating frame's sideways
acceleration is steady along the track, so the offset goes as the square of the
time of flight and the figure draws that parabola. Its **size** is scaled to the
width of the picture and the lesson says so, with the real number beside it — a
figure that silently exaggerated would be teaching the wrong magnitude, which in
gunnery is the whole game.

### Not on this list, because it exists

**The moon.** `tides` has a Sun-and-moon panel in its day view — the phase disc
drawn as an SVG whose terminator is an ellipse of width cos(elongation), the
phase name and age, sun and moon rise and set, and civil twilight — and it is in
`tides-day.png` on the site. What it lacks is a figure of its own: it sits below
the curve, the high-and-low table and the depth calculator in a 1,716-pixel
picture. Larry saw it in the app and said so; this entry is here so nobody
"rediscovers" it as missing again.

---

### 4. And then Larry asked the question that broke the single number

*26 Oct.* He trained the gun east, saw the same deflection as due north, and
said so: the lesson's angular-momentum story is about changing your **distance
from the earth's axis**, and an east-west shot does not change it. He named what
he thought was missing — the **Eötvös effect** — and asked whether I concurred.

**He was right, and there was a third term neither of us had mentioned.** The
demonstration reports three components now:

| | | |
|---|---|---|
| turning with the earth | `2Ω·V·sin φ` | 176 m right at 45 N, any bearing |
| the Eötvös effect | `2Ω·u·cos φ` | 169 m of range, east-west only |
| its own climb and fall | `2Ω·w·cos φ` | 61 m west, any bearing |

**Where he was right.** For purely eastward motion the Coriolis acceleration is
`2Ωu` pointing straight **away from the earth's axis** — verified against the
axis-outward unit vector `(0, -sin φ, cos φ)` to twelve decimal places at every
latitude. At latitude φ that direction is tilted: up by `cos φ`, equatorward by
`sin φ`. So the two famous effects are **one vector's two shadows**. The vertical
share is Eötvös — apparent weight, and therefore range, because the shell lands
on the ground rather than staying up to enjoy it. The horizontal share is the
ordinary right-hand deflection. Their latitude dependence falls straight out of
the geometry, which is why one is largest exactly where the other vanishes.

**Where the program was right and the intuition was not.** An east shot *does*
deflect sideways, by the same `2Ω·V·sin φ`. Fired due east at 45 N a shell drifts
south, which is to its right. The angular-momentum account simply does not cover
that case — it is a second mechanism arriving at the same number.

**The third term, found while checking.** `-2Ω·w·cos φ` acts east-west on the
shell's own vertical speed: climbing pushes west, falling pushes east, and they
do not cancel, because the double integral is the integral of height over time.
What survives is `Ω·g·T³·cos φ / 6`, about **61 m west at any bearing**. Same
physics as the eastward deflection of a dropped stone, with the climb run
backwards. **It does not reverse with hemisphere** — `cos φ` is positive on both
sides — so the southern hemisphere is not quite the mirror of the northern.

**Which means the single number was wrong in detail at nearly every bearing.**
Fired north from 45 N the drift is **115 m**, not 176, because the westward term
takes 61 off it; fired south it is **238 m**. Both still right, which is the
lesson; not right by the same amount, which the lesson used to imply. Two things
that had already shipped said so and are corrected here: the browser readout's
equator case claimed *"the shell falls where it was aimed"* (fired north on the
equator it goes 87 m west, all of it this term), and the **site's figure caption
still carried the old halved 90 m** — it had never been updated when the lesson
was corrected at `ce27ca9`, because `docs/site-template.html` is a separate file
from the lesson and nothing compares them.

**One thing this does not touch: the wind.** Air moving horizontally has no
vertical speed worth the name, so only the turning term applies to it. The
meteorology in the rest of the lesson stands, including the five-degree rule.

All three are first-order, in vacuum, over a flat earth — the same idealisation
as the 38 km in 90 seconds. `weather-gun.js` was rewritten to hold the panel to
a **numerical integration** of the full equations rather than to a restatement
of its own formulas; the two agree to within 1.7 m everywhere the sliders reach,
which is where its tolerance comes from. See `docs/TESTING.md`.

The site figure changed with it. Photographing the whole Learn-more tier now
produces a picture 5,641 px tall and 790 KB — over the size cap in
`tests/app-figures-check.sh` and unreadable besides — so `app-figures.js` grew a
`crop` option and `weather-coriolis.png` is the demonstration itself, 710×657
and 59 KB.

### 5. And the gun only trained through half the circle

*Same day, straight after.* Larry: **"we need to add the ability to train the gun
the full 360."** He is right, and the reason is the one above rather than
completeness for its own sake.

With the slider running −90° to +90° — west through north to east — `cos φ` of the
bearing is never negative, so the **westward climb-and-fall term could only ever
subtract** from the drift. The half that was out of reach is the half where it
*adds*, and that is where the lesson's own second number lives: 115 m fired north
at 45 N against **238 m fired south**. A demonstration of three components that
cannot reach the setting where two of them add was demonstrating one and a half.

The gun now sits at the centre of a full compass rose in a square box rather than
at the foot of an arc, with all eight points labelled radially outward — "above
the point" put S, SE and SW *inside* the drawing, where the track runs. The
bearing namer went from five sectors to eight, which matters because the readout
and the figure's own `aria-label` both quote it: a sector the slider can reach and
the namer cannot would leave the picture describing itself wrongly.

**And the check caught an error of mine rather than the program's.** The new
assertion said the drift is larger fired south "in both hemispheres". It is not.
The term is always westward while the drift is right of the track in the north
and left of it in the south, so the bearing on which the two agree flips over: at
45 S the larger shot is the one fired **north**. The hemisphere-free statement is
better and is the term's whole signature — *of the two, the larger is always the
one whose drift points west, and they differ by exactly twice the term.* That is
what is checked now, and the reasoning is in the check beside it.

Four faults planted and caught, **the narrowed slider among them**, so the 180°
cannot come back quietly. 158 checks. weather-v8, build 8.

---

## The wind demonstration, and where it ended up

`weather` grew a second figure beside the gunnery one: a circular plot of
isobars round a low, with the surface wind crossing them, and sliders for
latitude and for the pressure gradient. The physics is in `grid.awk` —
`wx_cor`, `wx_drag`, `wx_alpha`, `wx_pgf`, `wx_vgrad` — and two results in
it are worth knowing because they are counter-intuitive:

- **With linear drag the cross-isobar angle does not depend on the pressure
  gradient at all.** `tan α = k/f` exactly; the gradient cancels. A stronger
  low gives you more wind at the same angle, not a different angle.
- **A gradient-wind high has a speed limit.** Round a high the balance is
  `G = fV − V²/R`, which has no solution when `f²R < 4G`: there is a
  tightest possible high for a given gradient, and the panel refuses the
  slider settings that ask for one.

An earlier design drew eight arrows round a full circle and was thrown away
in favour of one isobar and one wind vector. In characters, `/` and `\`
carry an axis but not a direction, so the flank arrows read as outflow —
the opposite of what the figure is about.

**It is on the front page, live.** `docs/site-template.html` carries the
panel in the header, which made it the first page in the project to run
JavaScript at all. The code is in `docs/web/shared/winddemo.js` and
`docs/web/shared/demo.css`, loaded by both the weather app and the site, so
the two cannot drift. A `<noscript>` fallback shows the still picture.

One naming trap worth recording: the state object was called `WX` and
**clobbered the weather app's own `WX`**, which is a module of the
application. "WX.load is not a function" in the console. It is `WIND` now.
Two files loaded separately each get their own `new Function` scope, so they
cannot see each other's declarations either — the reflow test joins them
with a newline and loads them as one.

---

## A push was invisible for ten minutes

Measured on the live site rather than guessed at: GitHub Pages serves
`cache-control: max-age=600` behind a Fastly edge. A browser re-checks
`sw.js` through the HTTP cache unless the previous response allowed more
than 24 hours, and `cache.addAll()` reads that same cache — so a service
worker could install, report its new cache name, and then serve the previous
version's files out from under it. The app looked updated and was not.

Fixed in all seven workers, two changes that have to go together:

- `serviceWorker.register(..., { updateViaCache: 'none' })`, so the worker
  script itself is always fetched from the network;
- `fetch(f, { cache: 'reload' })` for every precached file in `install`,
  in place of `cache.addAll(FILES)`, so the files cannot come from the
  stale HTTP cache either.

`tests/sw-precache-check.sh` now asserts all three properties — no
`addAll(FILES)`, `cache: 'reload'` present, and `updateViaCache: 'none'` on
the register call itself. Fixing that check also taught a small lesson about
`sed`: `sed -n 's|^\./||p'` prints only the lines the substitution
*matched*, so every entry that did not begin with `./` was silently dropped
from the comparison.

**What is still slow, and cannot be fixed here:** `docs/index.html` has no
service worker, and Pages still sends `max-age=600` for it. A hard reload is
the way past that one.

---

## Saying what the tools can already do

Measured rather than guessed: each tool's command surface was compared
against the README and the front page. `colregs review` appeared on the
front page zero times. `celnav devcard`, `syllabus`, `stocktake` and
`amplitude` appeared in neither.

The review tool was the worse omission, because the page was already making
the argument and leaving out the thing that acts on it. "What the tests
cover, and what they cannot" said plainly that nothing in the suite can tell
you whether Rule 27 says what the program says it says — and then asked the
reader to open an issue, without mentioning that the program will walk them
through the claims one at a time and build the issue for them.

The front page now ends that section with the tool, and says what has **no**
such tool: celnav, tides and weather make claims a test can only check for
self-consistency.

---

## The claim review, round two

Five faults, and **not one of them was about the rules** — every one was the
screen saying something other than what it showed, or the tool losing what
the reviewer typed. Written up in full in the project notes; the short
version, because each taught something general:

1. **Three greens, two visible.** A mine clearance vessel's two yard-end
   greens sit at the same height, one at each end of the fore yard, so from
   abeam you look *along* the yard and one is directly behind the other. The
   drawing was right and the sentence was right and nothing reconciled them.
   `hidden_note()` now finds any two same-coloured lights within a fiftieth
   of a hull length in both height and projected sideways position and says
   so — and it is worth teaching, because a mine clearance vessel seen from
   abeam shows two greens and abeam is when the 1000 metre clearance matters.
2. **A stopped vessel still has a standing.** `motion_why()` returned before
   reaching Rule 18 for any vessel lying stopped, so two all-round reds never
   produced the words "not under command" — and the sentence ended by
   offering "anchored", which her own lights rule out.
3. **The wording must match the display.** The identity sentence was built
   from the vessel's *signature* — every light she carries — while the
   drawing shows only the lights whose *arcs bear on you*. A vessel of 50 m
   or more drawn from 135 was described as showing two masthead lights and
   drawn showing one sternlight. The sentence is generated from the lights in
   arc now, so the two read the same table through the same `arc_vis()`. What
   it produces from astern is the teaching point: **"She shows her
   sternlight."** — from abaft her beam an ordinary power-driven vessel's
   lights identify nothing whatever.
4. **The menu hid the option.** `[f]` already took a comment and never said
   so. It reads `[r] right  [f] wrong, say why  [c] right, but a comment`
   now, and every section carries a `TESTING` line stating what the claim
   asserts.
5. **Three marks were never saved.** The sharpest one, because it destroyed
   work rather than misinforming anyone. The verdict was written *after* the
   note was asked for, so interrupting at the note prompt — which is what you
   do when you want to copy the screen into a chat — killed the script
   between the keypress and the save. Every claim the reviewer had something
   to say about was the vulnerable kind. The verdict reaches disk the instant
   the key is pressed now; a note follows as a second row and supersedes.
   Reproducing it needed a fifo held open, because a pipe reaches EOF and
   `read` returns instead of blocking.

A second fault found while reproducing that one: "carry on from where I left
off" plus `[return]` was an infinite loop, because `rv_next` returns the
first claim with no row and skipping deliberately writes no row.

**And a harness fault the new check exposed**, worth more than the fault:
`guard()` reaps its watchdog with `wait`, which returns 143 for a process
just terminated — and under `set -e` that ends the script. It had never
fired because every caller wrote `if guard ...; then`, and **`set -e` is
suspended for the whole body of a function run as an `if` condition.** The
first bare `guard` call stopped the suite three quarters of the way through,
with every check passing and no failure reported.

---

## Checking the claims against an outside reference

A lights, shapes and sound-signals guide was put to the tables. It confirmed
all 15 sound signals, all 10 day shapes, every arc, and 18 of the then 22
light tables — and it corroborated two of round two's findings from a source
that has never seen the program.

It found two more display faults:

- **An aspect stated that her lights cannot give.** Five vessels show only
  all-round lights at every bearing of the 360. The aspect line came from
  the true bearing and was stated with equal confidence for all of them —
  beside a picture of one all-round white light. In the reference that is at
  worst incomplete, since the bearing was typed; **in the quiz reveal it is
  the answer.** The one exception is the one the rules prescribe: Rule 30(a)
  puts a 50 m vessel's second anchor light at or near the stern and lower, so
  how far that same-coloured pair opens gives an approximate aspect — never
  which side, never which end. A gap between lights of *different* colours
  is not prescribed, so nothing is read off it.
- **A towing light reported as a sternlight.** Rule 21(d) makes it a yellow
  light with the sternlight's characteristics, so it carries the stern arc —
  and bucketing on the arc alone merged the two. A towing vessel from abaft
  her beam read "She shows her sternlight", when the gap between her towing
  light and her sternlight is how you tell her from the tow, and seeing one
  white alone may mean you are *between* them.

**The test written for that exact class of fault could not see it**, because
it derived "is this a towing light?" from the same field the bug lived in.
*A check that re-derives its expectation from the same field as the code is
not an independent check of that field; it only proves the code is consistent
with itself.* Both `motion-seen-check` and `aspect-check` assert the converse
as well now.

### Six vessels the tables had no entry for

None of the existing tables was wrong; these were absent.

| | | |
|---|---|---|
| `dredge` | Rule 27(d) | two reds on the obstructed side, two greens on the side you may pass |
| `sailtri` | Rule 25(b) | sidelights and sternlight in one lantern at the masthead |
| `towalong` | Rule 24(c) | pushing ahead or towing alongside — and **no** towing light |
| `power12` | Rule 23(d) | an all-round white in place of masthead light and sternlight |
| `power7` | Rule 23(d) | a single white light, and nothing to say which of four things it is |
| `fishgear` | Rule 26(c)(ii) | an all-round white out towards gear streamed over 150 m |

They are **appended** to the vessel table rather than inserted, so the light
table claims keep their keys.

Two faults in earlier work surfaced as soon as they were added:

- **Two masthead lights were described identically** whether they sat fore
  and aft (Rule 23(a)(ii), a vessel of 50 m or more) or in a vertical line
  (Rule 24(a)(i), a towing vessel) — which is exactly how you tell a ship
  from a tug with something on the end of a wire. Read off the geometry now.
- **An all-round light out on her side is not part of the vertical stack.**
  Sorting a dredger's by height alone produced seven lights in one
  unreadable chain. Displaced lights are named separately; a yard-mounted
  light is excluded, so a mine clearance vessel's yard greens still count
  with the green at her foremast head.

Two exceptions were added to `tests/annex1-check.awk`, both read off the
lights rather than off a vessel's name — **a check that exempts a key by name
stops checking that vessel at all**: a combined lantern may put several
lights at one point and show one sidelight rather than an opposed pair, and
an all-round white may stand in for the sternlight.

### Two rules rulings

- **Rule 35(c) covers pushing.** The signal line listed six categories and
  stopped at towing, so a vessel pushing ahead sounded a signal the program
  did not attribute to her.
- **The basket is kept, as history.** Rule 26 as it now stands gives two
  cones and no alternative; the basket a vessel under 20 m could show was in
  the 1972 text. Larry's ruling was to keep it on the screen and date it,
  because it is still in older books and occasionally on an older boat, and a
  reference that silently drops a signal leaves the reader who sees one with
  nothing.

### What the review has shown about the tool

Across both rounds: **every fault was wider than the claim that exposed it**
— one claim became two, one became nine, one became the whole give-way
section, one became every annotated claim in the file. A reviewer reading
one screen is sampling; the thing to do with a flag is measure the class it
belongs to.

And the faults have moved. Round one found three and all three were about
the rules. Round two and the sweep found seven and **not one was** — the
rules engine has now been checked against an outside source across Part C
and Part D and holds. What keeps failing is the layer that turns the tables
into sentences, and **that layer still has no golden coverage on the review
screen**: adding a line to all six review screens moved no golden file,
because no golden file contains one. That is the next gap to close.

---

## Working agreement

Larry has the sea time and the ideas; Claude writes the code. He is a market
data systems engineer and scripts in Bash, Perl and Python, so the explanations
should be engineering-grade — but he does not guess at this codebase, and that
is what makes his reports worth so much.

He tests by using the tools the way a sailor would, and he has found things the
suite could not: the mine-clearance light arrangement, the towing light
geometry, a quiz that told you the answer before it asked, a picture that was
missing rather than colourless, and — on the first morning he tried them at sea
— that **not one of the tools would start on an iPad**.

He reports symptoms accurately and does not diagnose. Treating his report as a
diagnosis has now cost several rounds three separate times. Reproduce first;
each of the three took one command once somebody went and looked.
