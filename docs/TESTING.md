# Testing

    ./tests/run-tests.sh                                       # every shell x every awk found
    SHELLS="dash bash" AWKS="mawk gawk" ./tests/run-tests.sh    # named explicitly
    ./tests/golden.sh                                          # has any screen changed?
    ./tests/golden.sh --update                                 # accept the change

`run-tests.sh` rebuilds `bin/` from `src/` before it runs. **A file you edit
in `bin/` to probe a test will be silently overwritten** — that has cost real
time; edit `src/`.

---

## The rule

**A test you have never watched fail is not a test.**

And a lint that scans for a fact cannot see a *contradiction*. `install-check`
asks whether the README mentions each tool and says the right things about an
iPad. For weeks the README carried **two** `## Install` sections — the current
one and a stale one still saying "Both tools" — and the check passed the whole
time, because everything it looks for was present in the newer one. It was
found by reading, not by running.

Break the code deliberately, watch the check go red, restore, watch it go
green. My own harnesses have been wrong four separate times, and two checks
have passed while the behaviour they claimed to test was switched off. Both
were caught only by probing.

---

## Property tests — the ones that earn their keep

These check a property rather than an output, so they keep working when the
content changes.

| Check | Why it exists |
|---|---|
| **every drill and quiz marks its own correct answer as correct** | caught mawk re-seeding `srand()` from an explicit seed, which made marking intermittently wrong |
| **scenario replays terminate** | a replay loop that never converges hangs the tool with no error |
| **drift toward the bow always crosses ahead** (400 geometries) | verifies Larry's remembered Navy bearing-drift rule numerically before it was written down as a lesson. The full sweep was 700,000 geometries, zero exceptions |
| **Ekelund recovers the true range** (300 leg pairs) | the formula was derived and verified rather than quoted |
| **Red/Green and the words agree at every degree, both sides** | five reporting styles must describe the same angle consistently |
| **light tables satisfy Annex I where it is checkable** | `tests/annex1-check.awk`; light heights and arcs against the Annex |
| **tides match NOAA's published tables** | see below — the single most important check in the repo |
| **the About numbers match the program** | the About text quotes counts of vessel types, encounters and lessons; they drifted |

## Lints — each one is a bug that shipped

| File | Catches |
|---|---|
| `awkvars-check.awk` | a variable named after an awk built-in (`RS` broke tide loading) |
| `fnparam-check.awk` | a function parameter shadowing a function name (mawk will not parse it) |
| `fields-check.awk` | a table field containing its own separator (a `;` in an option cut an answer in half) |
| `jsonesc-check.awk` | the generators' JS/JSON escaper, held to a literal answer per awk &mdash; one mawk build emitted one backslash where the rest emit two |
| `sw-cache-check.sh` | a served file that changed without its app's service-worker cache version moving &mdash; an installed copy would never receive it |
| `app-figures-check.sh` | a site picture missing, unreferenced, or drawing the wrong thing &mdash; including Rule 27(f) in the day-shape figure |
| `svg-check.awk` | an SVG that is not an exact character grid |
| `readme-check.awk` | unclosed fences, unbalanced `<details>`, `<img>` inside a fence or pointing at nothing |
| `plates-check.sh` | every plate and picture the site shows, against what the program produces &mdash; per awk, so awk-dependent site output fails |
| `count-check.awk` | counts quoted in prose against what the program actually has |
| `toolrow-check.awk` | a tool in `bin/` with no table row or no section, and any README link &mdash; anchor, published app or file &mdash; that leads nowhere |
| `install-check.awk` | an install section that has fallen behind what exists |
| `counts-check.awk` | a count in the README or the site that the engine disagrees with, and any count written as a word |
| the served-page walk in `run-tests.sh` | anything under `docs/` that serves an `index.html` with no service worker, unless named with a reason |
| `ipad-install-check.sh` | the iPad installer must install, prove the tools run, set the PATH, and survive being run twice &mdash; plus the write-probe regression at shell level |
| `ashell-check.sh` | constructs a-Shell cannot run: a heredoc feeding a command that prints, and a compound command redirected to a file |
| `ios-home.sh` | every tool must start when `$HOME` cannot be written &mdash; the iOS condition, which no tool survived until 2026-08-30 |
| `launcher-check.sh` | the launcher must offer and find every tool, fail out loud, pass arguments through — and its menu in the README is diffed against the menu it prints |
| `review-check.awk` | review keys unique and well formed; every claim renders |
| `contacts-check.awk` | the contacts lessons and the tracking exercise |
| **no network, ever** | `curl wget nc telnet ftp`, and `getline < "http…"` |

The network lint matches a **command at a command position**, not a substring:
`nc` lives inside "since" and "encounter", and a lint that cries wolf gets
switched off, which is worse than no lint. A URL printed for a person to
*read* is fine — the licence text and the review link are both just words on a
screen. What is banned is fetching one.

### Three of these changed shape when the README did

The browser-first README broke four checks, and the useful part was telling
apart the ones that encoded the old *shape* from the ones that were protecting
*content the rewrite had dropped*. Only three were shape.

1. **`toolrow-check.awk`** assumed rows of the form `| **[name](#name)** |` and
   headings at exactly `## name`. The new README has two tables — the browser
   apps linking to the published builds, the six shell scripts linking to their
   own `###` sections. Worse, its anchor was extracted with
   `sub(/^[^(]*\(#/)`, which on a row whose link is a URL with no `#` in it did
   nothing at all, so it reported *"the row for celnav links to
   #celnav](https://..."*. It now checks the property instead: every tool has a
   row and a heading, every `#anchor` lands on a heading, every link to a
   build on the site lands on one that is in `docs/web/`, and every relative
   link lands on a file in the repository.

   It finds *our own* published builds by the site host, which is passed in
   as `-v site=`. It used to find them by the literal `/bashnav/web/`, which
   appeared in every site link while the site was served from a Pages default
   address. Moving to a custom domain put the site at the root of its own
   subdomain and that path segment disappeared — and because the function
   returns when it does not find the marker, every published link would have
   passed **without being checked**. A check that silently stops checking is
   worse than one that fails, because nothing says so. The address is written
   in one place on each side: `SITE` in `docs/make-site.sh` for the links,
   `SITEHOST` in `tests/run-tests.sh` for the check.

2. **`readme-check.awk`** was given `-v WANT=6`. A number typed in two places
   is the trap that left three site plates silently empty when `make-site.sh`
   named engine versions by hand, and the rewrite took the README from six
   pictures to two, so it went red for something that was not a fault. It now
   counts every `<img>` in the file, fenced or not, and requires that all of
   them render — which is precisely the bug it exists for, since a fence
   swallowing a picture leaves the tag in the raw count and out of the rendered
   one. What that no longer guards is a picture deleted outright; deleting one
   is an edit rather than a fault, and the typed number had started costing
   more than it saved.

3. **`plates-check.sh`** diffed two ASCII blocks pasted into the README. Those
   blocks are gone — the README shows the SVGs `make-site.sh` renders from the
   same output. The property is unchanged, the target moved: it now rebuilds
   the whole site with a given awk and diffs `docs/plates/` and `docs/img/`
   against what is committed, covering all eight plates and fifteen pictures.

The two that were *not* shape — the launcher's menu block and the install
section's "no app to install" and `~/Documents` — went back into the README,
because an iPad reader still needs all three and the launcher menu still
drifts. `launcher-check.sh` matches the `bashnav` heading at any depth now, so
it does not have to move again the next time the README is reorganised.

### What running the site build per awk found immediately

`plates-check.sh` builds the site with each awk in the matrix, so **site output
that depends on which awk produced it is a failure**. On the first run it found
one: `encounter.txt` and `scenario.txt` were generated from the colregs engine
alone, with `contacts` assigned to a shell variable and never used. gawk and
one-true-awk resolve a function at the call and never reach `rv_keys()`, which
lives in `review.awk`; mawk resolves at parse time and refuses the file
outright. And the awk sat at the **head of a pipeline**, where `set -e` cannot
see it — a pipeline's status is the last command's, `sed` succeeds on empty
input, and the script wrote a zero-byte plate and carried on. Rebuilding the
site on a machine whose `awk` is mawk blanked two front-page plates silently.

`make-site.sh` now checks its text plates for emptiness the way it already
checked its pictures, which is what should have caught it. It also no longer
exits 1 on success: the last statement in the script was
`grep -c '{{' docs/index.html >/dev/null && { … }`, and `grep -c` returns 1
when the count is zero, so under `set -e` a clean build always reported
failure. Nothing was reading that status, which is the only reason it survived.

And an **unfilled `{{PLACEHOLDER}}`** now fails the build rather than printing
`warning:` and carrying on. It is the same class of fault as a blank plate —
visible on the front page, and arriving the same way, a template name changed in
one place and not the other — so it had no business being the one that only
warned. `plates-check.sh` inherits it: a site that will not build under an awk
is reported as a failure under that awk.

> Running a build under every awk costs a second a time. Both of these had been
> in the repository for weeks, and neither was findable any other way.

### What regenerate-and-compare cannot see

Six generated browser files are regenerated during the suite and diffed against
what is committed, which is the check that catches a change to the shell that
has not reached the browser. It has a blind spot, and it is not obvious: **the
generator is compared with itself**, on whichever awk is running. If the
generator is wrong on that awk, the check reports the *committed* file as stale
and advises regenerating it — and following that advice commits the wrong file.

That is exactly what nine generators were doing. All of them escaped their
output with `gsub(/\\/,"\\\\",s)`, which does the doubling inside gsub's
replacement string, where POSIX leaves backslashes to the implementation. On
mawk 1.3.4 20200120 — Debian's and Ubuntu's for years — one backslash came out
where two were needed, so a celnav lesson showing a shell line continuation
rendered a literal `\n` with no line break.

`tests/jsonesc-check.awk` closes it by holding the escaper to a **literal
answer** under every awk instead of to its own output. Its expectations are
written in a safe alphabet — `<BS>`, `<DQ>`, `<SQ>`, `<NL>`, `<TAB>` — because a
check for escaping that spells its own expectations with backslashes is resting
on the thing it is testing. Verified red on the broken build (3 of 8 cases) and
green on the fix.

The same sweep found two more gaps of the ordinary kind: `weather`'s and
`deck-log`'s generators had no regenerate-and-compare at all, and
`docs/web/weather/lessons.js` had gone stale — the committed file was missing a
passage of the Coriolis lesson that `src/weather` prints. Both are compared now.

### A golden file cannot tell you the output is missing something

`deck-log`'s entry screen asks for the TRUE wind as `wdir` and `wspd` and
writes both on the nav record. The log listing printed `LG["wind"]` — a field
no writer in either build has ever set — so every nav record in `deck-log log`
showed eight spaces where the wind belonged. The data was in the log the whole
time; only the view had the wrong name for it.

**The golden file had the blank committed as correct.** `tests/golden/decklog.txt`
carried `crs 096    8.5 kn  wind          sea 3` and had done for as long as the
file existed, so the regression check was faithfully comparing the output
against a record of the fault. That is the limit of a golden file and it is
worth stating plainly: it tells you whether the output CHANGED, and it cannot
tell you the output is missing something, because a missing field looks exactly
like a field that was always missing.

So `tests/decklog-check.sh` now asserts the VALUE rather than the layout: it
logs a nav record with a wind nobody would produce by accident — 287 degrees at
33 knots — and requires both halves to come back out of the listing. Verified
red with the old `LG["wind"]` put back and green on the fix.

The same class of fault already had a guard in `weather`, written after the
cloud-type fields were asked for and ignored: *"visibility is asked for and
still ignored"*. A field a tool asks a human to fill in and then never shows is
how you teach somebody to stop filling in the form.

### A check that printed "emphasis preserved" and did not check it

Larry asked for the top line of a table in the coriolis lesson to be bold. It is
one `cw(..., C_ACC)` away, and the accent renders bold in both builds — `C_ACC`
is `ESC[1;32m`, and `.lesson .acc` is `font-weight: 600`. The change was easy.
Verifying it was not, because **nothing was verifying emphasis at all.**

Two checks looked as though they were:

- `docs/web/tests/weather-les.js` rebuilds each lesson from `lessons.js` and
  compares it with what the awk prints, character for character, and signed off
  with *"every lesson is character-identical, emphasis preserved"*. It ran the
  awk in `cmode=plain`, **where `C_ACC` is the empty string** — so emphasis was
  not in either side of the comparison. The claim was counting spans by style
  and calling that a check.
- `tests/weather-reflow-check.js` does compare emphasis, but in the other
  direction: it holds the *renderer* to `lessons.js`. If `lessons.js` has lost
  an accent, both sides agree and it passes.

Between them, nothing compared `lessons.js` with the awk it is generated from.
Proved by taking the accent off one table heading in `lessons.js` by hand: the
whole suite, both browser harnesses included, stayed green.

`weather-les.js` now runs the awk a second time in `cmode=day` and walks the
escape sequences **using the same code table as
`docs/web/weather/gen/dumplessons.awk`** — deliberately the same, because a
check that invented its own mapping would be testing its own opinion of what
`1;32` means. It compares styled WORDS rather than runs, since the generator may
split a run at a line end and rejoin it into a different span shape without
losing an emphasis. 1,039 emphasised words across ten lessons.

One documented exclusion: `acc:Question:`. The shell prints that label accented
at the foot of a lesson, and `lessons.js` keeps the question in its own field so
the page can ask before it tells — the same asymmetry `render()` already handles
by hand on the text side. It is the label's styling, not a word of the lesson.

Three faults planted and caught: the bold taken off the new heading, an accent
downgraded to `dim`, and an accent invented where the awk has none. The last one
matters as much as the first — a check that only looks for missing emphasis will
not notice a build that emphasises everything.

### Checking the science before building the demonstration

Larry asked for a second demonstration in the coriolis lesson: isobars round a
low, wind arrowing in from eight points, sliders for latitude and for the low's
pressure — with the wind following the isobars *more closely* as the pressure
differential rose, centrifugal force being the cause. He also asked for the
science to be checked, which is the only reason this section exists.

**It does not work that way, and the check is shaped by the wrongness:**

1. In a frictionless balance the wind **already follows the isobars exactly**,
   at every gradient and every latitude — geostrophic, gradient and cyclostrophic
   alike. There is nothing for centrifugal force to improve on.
2. **Friction** is what turns the wind across them, and with a linear drag the
   balance solves to `tan α = k/f` exactly: the pressure gradient **cancels out
   of the angle**. Verified across the whole pressure slider — 1 to 8 mb per
   100 km, same angle to a tenth of a degree.
3. With the quadratic drag water really has, the angle **grows** with the wind.
   A hurricane's boundary layer runs 20–30° of inflow, which is the clearest
   refutation available: the strongest lows have the largest inflow angles.
4. **Latitude** is the real dial, through `f = 2Ω sin φ` — 48° of inflow at 10° N
   over water against 11° at 75°.
5. Centrifugal force changes the **speed**: subgeostrophic round a low,
   supergeostrophic round a high, and for a high a hard limit at `f²R = 4G` past
   which **no solution exists at all**. That is why a deep tight low is ordinary
   and a tight intense high does not occur.

`docs/web/tests/weather-wind.js` holds the panel to a balance written from
scratch in the check, and asserts the angle does *not* move with the gradient —
if it ever does, the demonstration has gone back to the intuitive story. The
high's limit is checked from both sides, and every arrow's angle to its own
isobar tangent is measured off the SVG and compared with the stated angle, with
the circulation sense taken from a cross product. 67 checks.

Five faults planted and caught, the first of them the wrong physics itself: the
angle made to depend on the gradient, the curvature term dropped, the high's
limit removed, the circulation reversed, and inflow turned into outflow.

**Two faults of my own that the harness found first.** `var WX` for the new
demonstration's state clobbered the app's own `WX` object — the one carrying
`load()` and `renderTerminal()` — and the page died with "WX.load is not a
function". That is CLAUDE.md's rule 2 in JavaScript: a name that already means
something is not available just because the file you are editing has not used it
yet. And `weather-gun.js` counted `.gcrow` across the whole document, which
became 7 the moment a second panel existed; scoping it to `.gundemo:first-of-type`
then matched **nothing**, because that pseudo-class means the first element of
its *tag* among its siblings and these panels are divs among divs. Both were
found by a check going red, not by reading.

### One panel, two pages, and the check that was hiding a gap

Larry: *"It belongs on the main page."* The front page was pure static HTML with
inline CSS and **no JavaScript at all**, and he asked for the live panel in the
header rather than a screenshot of one. So `windDemo`, its physics and the panel
stylesheet moved to `docs/web/shared/`, loaded by both the weather app and the
site page — one implementation, which is the rule this project already applies
to the shell and browser builds. A second copy would have been quicker and wrong
by the third edit.

The panel reads five custom properties off `:root` at draw time — `--accent`,
`--dim`, `--line`, `--text`, `--warn` — so it takes whatever palette the page it
is on uses. The site maps them onto its own, and the same file comes out magenta
there and blue in the app. A `<noscript>` carries the static picture, so the page
still says something useful with JavaScript off.

**`tests/sw-precache-check.sh` could not see the new files, and the reason is
worth keeping.** Its list of precached files was built with
`sed -n 's|^\./||p'`, and `-n` with `p` prints only the lines the substitution
**matched** — so every entry without a leading `./` was dropped from the list
entirely and then reported as not precached. `../shared/demo.css` was precached
correctly and the check said it was not.

Dropping the `-n` is not the fix either: that filter was doing double duty,
stripping `./` *and* discarding the tokens around the array — `const`, `FILES`,
`=`, `[`, `];` — which then arrived in the existence loop as files that are not
there, 35 of them across seven workers. The quoted strings are taken deliberately
now rather than being whatever survives a `tr`. Verified red both ways: a
`../shared` entry removed from `FILES`, and a `./nope.js` added that does not
exist.

**And `weather-reflow-check.js` had to learn that the page loads two files.** It
evaluates `weather.js` in Node, whose render loop calls `windDemo` for a demo
block of kind `wind` — so loading `weather.js` alone threw *ReferenceError:
windDemo is not defined*, which is the check doing its job: a page that loaded
one file and not the other would fail in front of a reader the same way. Loading
them as two separate `new Function` calls still failed, because **each gets a
scope of its own** and the second could not see the first's declarations. The
sources are joined into one now, which is what reproduces a browser's shared
global scope.

### Ten minutes of cache, and an offline promise that could not be tested

Larry: *"it still has not showed up... it seem to take time... it took like 5 min
when I was looking for it on the correolis page."* An accurate symptom, and it
was neither the service worker nor the browser alone. Measured on the live site
from his own network:

```
cache-control: max-age=600
last-modified:  Tue, 27 Oct 2026 02:16:13 GMT     <- the push
date:           Tue, 27 Oct 2026 02:20:46 GMT     <- the fetch, 4.5 min later
x-served-by:    cache-ewr-kewr1740087-EWR
x-cache:        MISS
```

**GitHub Pages sends `max-age=600` on everything**, with a Fastly edge in front
carrying an `age` of its own. His five minutes is the tail of a ten-minute
window, enforced in two places at once.

That is a nuisance for the front page and a **fault** for the apps, in two
compounding ways:

1. **A browser only re-checks `sw.js` through the HTTP cache**, unless the
   previous script's `max-age` was over 24 hours. At 600 seconds it compares the
   new worker against a *cached copy of the old one*, finds no difference, and
   installs nothing. "Open it once with a signal" is then a no-op that looks
   exactly like the app being stuck.
2. **And `addAll(FILES)` reads that same cache.** So a worker that *did* install
   could fill a brand-new cache with the previous version's files — reporting
   its new `CACHE` name while serving old content. That is worse than being
   plainly out of date: the version says one thing and the bytes say another,
   and the build line at the foot of the page, the one thing a reader can check,
   would lie to them.

Both are fixed in all seven workers. Registration passes
`updateViaCache: 'none'`, and `install` fetches every file with
`cache: 'reload'` — still all-or-nothing, because a cache half-filled from two
versions is the state nothing can diagnose, and that was `addAll`'s one virtue.

`tests/sw-precache-check.sh` guards both, and **took two attempts to write
correctly, in the same way twice.** The first matched the sentence in `sw.js`
that explains why `addAll(FILES)` is not used, and reported all seven workers as
broken. Stripping `//` comments fixed that and not the second one: the paragraph
above each `register()` call is a `/* */` block, so the check passed on a file
where `updateViaCache` had been taken off the code and left in the prose.
Matching the register line itself is immune to both. Verified red four ways.

**Two things found while running every harness, neither fixed here.**
`run-drill-web.sh` fails on *"no runner questions found in this pack"* at the
previous commit as well, so it predates this work. And the tides harness writes
`shot-day.png` and `shot-pick.png` **into the repository root** rather than a
temporary directory — untracked PNGs in a repo that is one `git add -A` from
publication, which is the hazard `CLAUDE.md` opens with.

### A number in the prose that nobody was retyping

The site and the README described colregs as covering "22 vessel types" and,
two hundred lines further down the same template, "twenty vessel types" and
"Fourteen scenarios". The engine had `NVES=28` and `NENC=28`. None of the
three was a disagreement about the rules — they were counts typed by hand into
the two documents a reader meets first, and then not retyped when the engine
grew.

It is the same fault as `make-site.sh` naming engine versions by hand, and it
has the same rule: **a number that describes the code is derived from the
code, never typed twice.** Where prose has to carry the figure, something must
compare the two, because nothing else will — a wrong count reads perfectly
well, which is exactly why it survives.

`tests/counts-check.awk` reads `NVES` and `NENC` out of the engine and compares
them with every `<n> vessel types` and `<n> scenarios` in `README.md`,
`docs/site-template.html` and the generated `docs/index.html`. The generated
page is included on purpose: it catches a stale build as well as a stale
template.

**It is awk, and it runs per awk, because the first version was neither.**
That version parsed with `sed` and wrote `\(encounter \)\?` to make a word
optional — a GNU extension to *basic* regular expressions. GNU sed matches it;
BSD sed on macOS does not. So on Larry's Mac the pattern matched nothing,
every number was extracted as empty, and the check reported

    README.md:14 says  scenarios, engine has NENC=28

against all six lines: a check failing for a reason with nothing to do with
what it checks, which is worse than no check, because the next person learns
to ignore it. It passed here and failed there, and it was guarded by
`$AW != $FIRSTAWK` so it ran once rather than across the matrix — the one
arrangement that could not catch a portability fault.

awk's regular expressions are *extended* and POSIX, so `?` is simply `?`, and
awk is the one tool this repository already guarantees everywhere. The check
now runs under every awk on the machine, like everything else.

It also **refuses a count written as a word**. "twenty vessel types" cannot be
compared with 28 by any cheap means, and writing it that way is how one of the
three hid in plain sight beside a digit that was also wrong. Digits only, so
they can be checked.

Confirmed both ways: with `28` the check passes, and changing one occurrence
to `26` produces

    README.md:297 says 26 vessel types, engine has NVES=28
    COUNTS 1

Only derivable counts are checked. "Fifteen lessons on the rules" is not in
there, because the engine exposes no lesson count to compare it with; if one
is added, this check is where it goes.

### A check written for one tool, when the fault belongs to all of them

Every app's service worker is cache-first with no revalidation, so a file
already in the cache is served from it for ever. The cache is only refilled
when `install` runs, and `install` only runs when the worker changes — in
practice when `CACHE` is bumped. **An app on somebody's home screen therefore
keeps the old version indefinitely, with no error and nothing to see.**

This happened to `colregs` first — Larry reloaded repeatedly against
`colregs-v1`, which had never moved — and a check was added comparing
`colregs.js`'s `BUILD` to the cache version. `drill` later got a second copy of
that check. Then it happened twice more, in the two apps that had neither:
`celnav` shipped a sight-reduction screen and two arithmetic fixes at
`celnav-v3` while displaying "build 8", and `weather` shipped at `weather-v3`
displaying "build 2". Larry found both the only way they can be found — by
opening the app and seeing the old one.

Two checks now, because the first does not imply the second:

1. **Every app's displayed build matches its cache version**, as one loop over
   all six rather than a copy per tool.
2. **`sw-cache-check.sh`** compares the files each worker *precaches* against
   the commit that set its current cache value. A `BUILD` label can be bumped
   while a served file is left out of the bump, or a file can change in a later
   commit that touches nothing else, and the first check sees neither.

The second treats a cache value with no commit in history as an *uncommitted
bump* and passes it: nothing can have changed since a bump that is happening
now. Its first draft failed there, which would have meant a red suite for every
correct bump until it was committed.

---

## Validation: against the published answer, never against another implementation

`tests/tides-check.awk` + `tests/tides-noaa.dat` compare high and low water
against **NOAA's own published tide tables** — the numbers a mariner would
actually read — at six stations spanning small and large ranges and mixed and
diurnal regimes.

    24 turns.  mean |dt| 2.4 min, worst 5.9.  mean |dh| 1.0 cm, worst 2.0.

Three real bugs were found this way: shallow-water constituents with zero
speed, the SA phase reference, and the amplitude floor. **Every one of them
would have passed a comparison against another harmonic library**, because
both implementations would have been wrong in the same way.

The fixture is committed, so the check runs offline like everything else.

> Once I fabricated a station's fixture values by eye instead of fetching
> them, and spent an afternoon chasing a 38-minute error that did not exist.
> **Invented reference data in a validation test is worse than no test.** If
> you cannot fetch the reference, do not write the check.

### The exception: a port, where the awk *is* the published answer

`docs/web/tests/` compares the browser builds against the awk engines, which is
a comparison against another implementation and would be worthless for the
physics — so it is never used for the physics. It is used for *sameness*: the
awk tool is the thing that was validated against NOAA and against the
Convention, the browser is a port of it, and the only question is whether the
port says the same thing.

That question is answered on **whole cases**, not on functions. celnav's
browser fix was 43 nm wrong from a stale DR while every function in it agreed
with the awk to nine decimals, because what it got wrong was the loop that
drives them. `docs/web/tests/celnav-ref.awk` therefore generates a position, a
time, two to five bodies and a DR up to several hundred miles off, inverts each
`Hs` out of `corrections()` so the sights are readings rather than inventions,
and runs the shell's own `cmd_reduce()` path over them — 21,468 comparisons per
400 cases, under every awk on the machine.

#### And then the other half, because the two halves catch different faults

A module diff and a rendered page catch disjoint sets of faults, and the
noon-sight port made the division unusually clean. Cutting `lan_jd()`'s five
iterations down to one is a real fault: the awk does five, and the port's own
comment says why the count is fixed rather than a tolerance. `celnav-diff.js`
catches it on all 120 cases, 3e-5 of a day out. `celnav-latitude.js`, which
reads the rendered screen, does **not** — the iteration converges fast enough
that `Sun on your meridian at 16:46:29 UT` is unchanged to the second.

It runs the other way too. Flipping which side of you the sun bore, or printing
Polaris's GHA with the formatter that appends a hemisphere, leaves every
function in the engine agreeing to twelve decimals; the rendered table goes red
immediately. So:

| | |
|---|---|
| `celnav-diff.js` | the arithmetic, at full precision, over generated cases |
| `celnav-ui.js`, `celnav-tables.js`, `celnav-latitude.js`, `celnav-plan.js`, `celnav-tables249.js`, `celnav-sandbox.js` | what the page *shows*, against the shell's own printed working |
| `fmt-check.js` | one-decimal formatting, against awk's `printf` |
| `drill-check.js` | the drill generator, seed for seed, body for body |
| `celnav-drill.js` | the drills as put, and the marking tolerances |

Neither is the belt and neither is the braces. Each is the only thing that sees
its own class of fault, and every fault above was planted and watched to go red
before the check was believed.

#### A seed is the problem's name, so the generator is a specification

`drill red 4821` has to be the same sight in the shell and in the browser, or a
drill worked on deck and checked at a terminal has two different right answers.
That makes the pseudo-random sequence part of what is being ported — not an
implementation detail — so `drill-check.js` compares every value the generator
produces over 200 seeds: the position, the instant, **which body it picked, by
name**, and which seeds it refused for want of a body between 12° and 72°.
Worst disagreement 6e-14, under every awk on the machine.

It bites on exactly the things it should: seven warm-up steps instead of eight,
two throwaway draws instead of three, the altitude window widened, the moon's
semi-diameter not grown with altitude, the fix's intercepts not rounded to a
tenth the way a plotted sheet rounds them. It does *not* bite on cutting
`invert_corr`'s twelve passes to eleven, and that is worth recording beside the
`lan_jd` note above: twelve was chosen with margin and eleven has already
converged below the tolerance. A fixed iteration count is a specification only
where the count is observable.

#### The marking tolerances are the drill

Half a mile on an intercept, 0.3′ on an Ho, 1.0′ on a GHA, 0.6° on a Zn in the
reduction drill and 1.0° in the full one, two miles on a fix. A drill that marks
to a different standard than the tool is a different drill, and **nothing on
screen would show it** — the numbers, the working and the plot would all be
right.

So `celnav-drill.js` marks each kind three times: with the shell's own correct
answer, with one placed just outside the shell's tolerance, and — for the two
intercept drills — with the right distance plotted the wrong way. The second
catches a widened tolerance; the third catches a dropped sign check, which the
second cannot, because it keeps the sign. "Computed greater, away" is the rule a
navigator gets backwards, and a reversed intercept is the same number of miles on
the wrong side of the assumed position with nothing on the sheet to say so.

Writing that check found a fault that was not about marking at all: the answer
boxes were **rebuilt** on every change of kind or seed. Focusing a box blurs the
seed field, the blur fires that field's change handler, the handler rebuilds the
boxes, and the keystrokes land on an element no longer in the page. Every answer
the harness typed came back empty. A reader who edits the seed and then types an
answer loses the answer; the boxes are relabelled now, not rebuilt.

#### When one build renders a block differently, say so in the checks

The gunnery demonstration is a character figure in the terminal and an
interactive panel in the browser. `teach.awk` prints `@@FIG grid W H` under
`-v FIGDUMP=1` where the figure goes, so the shell marks **where** the
demonstration belongs and each build decides **how** — and two checks that
compare the two builds word for word had to be told about it:

- `weather-les.js` reconstructs the browser lesson and diffs it against the
  awk's own output, character for character. It now runs the awk **the way the
  generator does**, with `FIGDUMP=1`, so both sides carry the same marker. The
  alternative — comparing 21 lines of character art against one panel — fails
  by construction while saying nothing about the prose, which is what the check
  is for.
- `weather-reflow-check.js` compares the words the shell printed with the words
  the page rendered. The panel's labels, readout and caption are the browser's
  own text and were never in the shell lesson, so the panel's subtree comes out
  of that comparison. **Excluding a subtree is how a check goes quietly blind**,
  so its presence is asserted separately: the shell's marker count and the
  page's panel count must match. Dropping the panel, or rendering it twice, now
  fails.

The terminal's own drawing is still covered — `gun_figure()` is byte-identical
under all three awks — and the physics the panel displays has its own check,
below.

#### A demonstration that shows a number is held to an independent computation

`weather-gun.js` drives the panel and checks what it says against a computation
written here rather than read from the page. It began as three claims checked
against `2Ω v sin φ`: the magnitude does not depend on the bearing, it is zero
on the equator, and it reverses with hemisphere as sin(latitude). The drawing
was checked too — the fall has to sit on the side the words say, which is a
cross product of the line of fire with the aim-to-fall vector.

Five faults planted and caught, including **the factor of two coming back**: the
lesson's deflection had been computed from the ground's slowing alone, leaving
out the shell's own speed-up, which halves the answer. That one is now a
regression guard rather than a fixed comment.

#### Then a reader's question showed the check was verifying the wrong model

Larry asked why a shell fired **east** showed the same deflection as one fired
north, when the lesson's angular-momentum story is about changing your distance
from the earth's axis — which an east-west shot does not do. He was right that
something was missing and right about its name, the Eötvös effect; working it
through turned up a third term as well. The demonstration reports three
components now, and the check had to change with it.

**The check no longer restates a formula; it integrates the equations.** The
page's three closed forms are the first-order perturbation — Coriolis evaluated
along the unperturbed trajectory, integrated twice — and a check that repeats
those formulas can only confirm the arithmetic, never the derivation. So
`fly()` integrates `a = -2Ω × V - g` directly, knowing nothing but the
acceleration, and lands the shell by interpolating the step in which it crosses
zero. Everything the page reports is compared against that.

**Why the tolerance is 2.5 m and not a rounding allowance.** The two answers
differ by the second-order terms the derivation drops, and that difference is a
real quantity worth bounding rather than absorbing. Swept over every setting the
sliders can reach, the worst disagreement is **1.39 m of drift and 1.67 m of
range**; the page rounds to the metre on top of that. At 1.5 m the check failed
on four settings and every one of them was the truncation, not a fault.

The claims checked now:

1. **Both corrections against the integration**, at twelve settings spread over
   both hemispheres and the whole training arc — and the three components must
   **add up** to them, or the rows are decoration rather than a decomposition.
2. **The turning term** is still bearing-blind, still reverses, still goes as
   sin(latitude). Unchanged, because it is still true.
3. **The Eötvös term** is exactly zero due north and due south, largest on the
   equator, and opposite between east and west — and it is asserted to *depend*
   on bearing, which is the fault that started this.
4. **The climb-and-fall term does not reverse with hemisphere.** `cos φ` is
   positive on both sides of the equator. This is the counter-intuitive one and
   it is why the southern hemisphere is not quite the mirror of the northern.
5. **The equator** still says why no cyclone forms there, and no longer claims
   the shell lands on the aim — fired north on the equator it goes 87 m west,
   all of it the climb-and-fall term, which is largest exactly where the
   turning term vanishes.
6. **The drawing** puts the fall on the side the readout states and long or
   short as the range line says.

Five faults planted and caught again, each a plausible slip rather than a
nonsense: the Eötvös term made bearing-blind, the climb-and-fall term reversed
with hemisphere, that term dropped altogether, the Eötvös sign flipped, and the
turning term halved. 99 checks when it is right.

#### And then the check caught an error in the check

Larry asked for the gun to train the full 360°, which it should: with the slider
running west-north-east, `cos` of the bearing is never negative and the westward
climb-and-fall term **could only ever subtract** from the drift. The half that
was unreachable is the half where it adds, and that is where the lesson's second
number lives — 115 m fired north at 45 N against 238 m fired south.

The new assertion for it was wrong. It said the drift is larger fired south *in
both hemispheres*; it is not. The term is always westward, while the drift lies
right of the track in the north and left of it in the south, so the bearing on
which the two agree flips over: **at 45 S the larger shot is the one fired
north.** The failure was mine and the check reported it as a disagreement
between the page and the computation, which is exactly what it is for — a check
written from the physics rather than from the page can be wrong about the
physics, and then it is the check that is wrong, not the program.

The replacement is hemisphere-free and is the term's own signature: *of the two,
the larger is always the one whose drift points west, and they differ by exactly
twice the term.* Four faults planted and caught, **the narrowed slider among
them**, so 180° cannot come back quietly. 158 checks.

#### A no-sideways-scroll check does not see a figure clipped inside its own box

`run-weather-web.sh` asserts that the page does not scroll sideways at 744, 390
and 320 px, and it is a good check. It passed with a figure whose right-hand
half was off the screen.

The gunnery figure was first drawn 69 columns wide — comfortable on a laptop,
and at 390 px the whole second panel sat outside the viewport. The page did not
scroll sideways, because the **block** scrolled inside its own container
instead, which is exactly what that container is for. So `documentElement
.scrollWidth > clientWidth` was false and the check was satisfied, while the one
thing the figure exists to show — east one way, west the other — was the part
you could not see.

What found it was rendering the lesson at 390 px and looking at the picture. The
figure is 33 columns now, narrower than weather's own tables, and fits without
scrolling at all. The lesson for the suite: a check on the page's overflow says
nothing about the overflow of a scroller inside it, and a figure whose job is a
side-by-side comparison has to be measured against the narrowest screen the tool
is used on, not the widest.

#### A drawing has to be checked, not just the numbers beside it

The sandbox draws the navigational triangle, and its arithmetic is
`reduce_sight()` — already diffed to twelve decimals. Everything that can go
wrong in it is in the picture, and four planted faults show how little the
numbers would notice:

- the elevated pole drawn at the **north** point in both hemispheres
- the pole drawn at the **signed** latitude, so it sinks below the horizon in
  the south
- the projection **mirrored**, east for west
- the radius taken from the altitude instead of the zenith distance

Every one leaves Hc, Zn and all the prose on the screen correct. So the three
marks carry a `data-pt` attribute saying what they are, and `celnav-sandbox.js`
reads their drawn coordinates back and checks each against the projection —
radius `(90 − alt) / 90`, azimuth from the centre — plus that **nothing is drawn
outside the horizon circle**, which is what makes "the body is below the horizon"
honest rather than merely written.

Two of the seven positions are southern for exactly this reason. With only
northern cases, two of those four faults pass.

One plant that *was* harmless is worth recording too: replacing the arcs' slerp
with linear interpolation of the unit vectors. The points are renormalised onto
the sphere afterwards, so they still lie on the same great circle — only spaced
unevenly. The check reports no difference because there is none to see.

#### A screenshot is not byte-stable, so do not compare its bytes

`run-figures-web.sh` recaptures the site's pictures and diffs them against what
is committed. It compared bytes, and went red on pictures that were correct: the
launcher came back 69 pixels different out of 773,140 and the celnav noon screen
97 out of 1,083,600, maximum channel delta 6 — font antialiasing, invisible
under a crop, and gone on the next capture. **Two consecutive captures of an
unchanged page differ.** A check that cries wolf is a check nobody reads.

It compares *pixels* now, with a threshold of 400 differing pixels and a maximum
channel delta of 24. Decoding a PNG needs an image library, and the one thing
the harness can be sure of is the headless Chromium it has just driven, so the
browser does the decoding: both files go in as data URLs, onto a canvas, and out
as a pixel count (`docs/web/tests/figures-diff.js`).

**The put-back belongs to the capture, not to the check.** `make-app-figures.sh`
calls `docs/web/gen/figures-putback.sh` as its last step, so capturing never
leaves sub-threshold noise in the working tree. That matters because
`tests/plates-check.sh` is a POSIX check with no browser that only asks whether
`docs/img` is clean — so every run of the capture used to turn the whole suite
red on pictures that were correct, and the pixel threshold in the browser-only
harness could do nothing about it.

Both thresholds earn their place, and a planted fault shows why each is there.
Deleting the latitude row from the noon screen changes the picture's *height*,
which never reaches a pixel comparison at all. Printing the meridian altitude
ten degrees high changes two glyphs: **128 pixels, which is under the count
threshold, at a channel delta of 225, which is nowhere near the delta
threshold.** The count catches a large faint shift and the delta catches a small
stark one, and antialiasing is small *and* faint.

#### The reference emitter is code too, and it reported 91 false failures

Porting Pub. 249 produced 91 disagreements, every one of them in the reference
and none in the browser. Two faults, both in `celnav-ref.awk`:

- **`%d` on a value that is not an integer.** The assumed longitude is
  `int(gha + lon + 0.5) - gha`, and `gha` is fractional, so the assumed longitude
  is the *fraction* that makes the LHA whole. Printed with `%d` it truncated, and
  the diff called the browser a degree out on six cases in forty.
- **An insertion that landed inside an unbraced `if`.** The amplitude guard was
  written `if(cond)` with a comment on the next line and its statement after
  that. A later edit put the whole Pub. 249 block between the `if` and its
  statement, so `tab_args()` never ran on the cases where the amplitude is out of
  domain, `TARG` printed the *previous* case's arguments, and seven rows of
  table entries were compared against the wrong page.

The lesson is not "write braces" — though the braces are there now, with the
reason beside them. It is that **a cross-implementation diff reporting a
disagreement is not evidence about which side is wrong**, and the cheapest first
move is to call the function directly with the case's own arguments and see which
answer changes.

#### printf's `%.1f` is not JavaScript's `toFixed(1)`

C rounds a tie to the even last digit; `toFixed` rounds it up. Deneb's catalogue
magnitude is exactly 1.25, so the shell's planning table printed `1.2` and the
browser printed `1.3`. Nothing numerical could see it — both are the same
number — and `celnav-plan.js` found it by diffing that table row for row.

A tie at *d* decimals needs the value to be an odd multiple of 1/2^(d+1); any
other `x.x5` is not exactly representable and the two languages already agree
which side of it they fall. Of the 58 star magnitudes exactly two are such a
value, Deneb at 1.25 and Zubenelgenubi at 2.75, and only Deneb's preceding digit
is even — one star in 58.

`C.fx(v, dec)` in `engine2.js` is the fix — in the engine, so there is one of
it, and `engine2.js`'s own `pad()` and `celnav-app.js`'s `f()` both go through
it. `tests/fmt-check.js` pins it: the awk prints 3,488 values, 2,108 of them
exact ties, and the JavaScript has to agree with every one under every awk on the
machine. Two things about how that check is built:

- **It requires the engine and calls the exported function.** It began as a copy
  kept in the check, which needed a guard that the copy had not drifted — and
  when a plain `toFixed()` was planted in the page to prove the check worked, the
  *guard* fired and not one value was ever compared. Scraping the function out of
  the source and evaluating it was better, and putting it in the engine where it
  belongs was better still.
- **The reference includes the near-ties.** `2.45` is stored as
  2.4500000000000001776 and rounds up in both languages. A formatter that
  multiplies by ten first sees exactly 24.5, calls it a tie, rounds to even and
  prints `2.4`. That is the obvious implementation of this fix and it is wrong;
  the near-ties are what fail it, 32 of them.

---

## Golden files

`tests/golden/` holds 27,245 lines of expected screen output across 13 files —
lights from every angle, every encounter, every lesson, the scenarios, the
tracking plots, the tide tables and curves, the station searches.

    ./tests/golden.sh              # compare
    ./tests/golden.sh --update     # rewrite, then READ THE DIFF before committing

This is a change detector, not a correctness check. It answers "did anything a
user sees change, and did I mean it?" CI runs the comparison, so an unintended
change to a screen fails the build instead of being noticed months later.

**Two of the thirteen files are not awk-portable, so regenerate on the machine
that owns them.** `tests/golden/ekelund.txt` and `tests/golden/celnav-polaris.txt`
differ between awks on formatting alone — a bearing rate that rounds to zero
from below prints `-0.0 deg/min` under one awk and ` 0.0` under another, which
is a real difference in what a reader sees and arguably a display fault in its
own right, since a bearing rate of minus zero is not a thing. The other eleven
reproduce byte for byte under gawk and one-true-awk alike. Run `--update` under
an awk that already reproduces the committed files, read the diff, and never
commit a file whose only change is `-0.0` becoming `0.0`: that is the machine
talking, not the program.

`run-tests.sh` does not call `golden.sh`; it only checks the line count of
`tests/golden/`, so a stale golden file does not fail the suite. Run the
comparison by hand after changing anything a screen prints.

---

## Test the platform, not a convenient stand-in

Every check in this suite ran green while **not one of the six tools could start
on an iPad**, because each kept its data in `$HOME/.<tool>` and iOS refuses
writes to `$HOME`. The suite runs on machines with a writable `$HOME`, so it
shared the assumption the code was making, and a test that shares an assumption
with the code cannot test it.

`tests/ios-home.sh` takes the assumption away two ways: a `$HOME` whose dotfolder
cannot be created (portable, runs as any user, root included), and a `$HOME` with
the write bit off, which is the real condition. The second needs a uid that
`chmod` applies to, so under root it uses `setpriv`; where it cannot run it says
**SKIP** out loud rather than passing quietly.

## Shell-only checks run once per shell

The installer, the launcher and the `$HOME` checks exercise `sh`, not `awk`, so
running them for every shell × awk pair repeated identical work twelve times and
made the suite slow enough to skip. They now run when `$AW` is the first awk in
the list. The guard is written as `if [ "$AW" != "$FIRSTAWK" ]; then :` rather
than `&&`-ed onto the check, because `if [ … ] && o=$(check)` sends every
skipped pass down the `else` branch and reports a **failure** — which is worse
than the slowness it was meant to fix.

## What still needs a human

Two things the suite cannot judge, and where feedback is genuinely wanted:

1. **Whether the COLREGs content is correct and not misleading.** The suite
   checks that a light table satisfies Annex I and that a quiz marks itself
   correctly. It cannot check that the *rule cited* is the right rule, or that
   an explanation is sound. That is why `colregs review` exists: 153 claims,
   each reviewable by a person, submitted through a GitHub issue link.

2. **Whether a drawing reads correctly to a seaman's eye.** Larry found the
   mine-clearance light arrangement, the towing light geometry and the quiz
   that told you the answer before asking. None of those were test failures.
   All three were somebody who knew what a ship looks like at night, looking.
