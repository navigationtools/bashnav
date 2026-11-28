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

### An entity in the row that warned you not to trust the platform

`tests/entity-check.awk`. The platform page gained a row saying that Safari
caps the iPadOS version it reports, and the warning was written with `&mdash;`
in the middle of it. The table's helper sets `textContent`, so the iPad
displayed the characters `&mdash;` — inside the one row whose subject is that
what the platform tells you is not what it means.

The check looks for an HTML entity in a JavaScript string whose statement
never mentions `innerHTML`. Two limits are deliberate:

1. **Only JavaScript is examined.** In HTML an entity is correct and ordinary,
   so in an `.html` file this looks between `<script>` and `</script>` and
   nowhere else. A first version without that rule flagged seven perfectly good
   lines of markup, which is how a check gets switched off.
2. **A "statement" is everything since the last line ending in `;`, `{` or
   `}`.** The string that shipped was folded across two lines, so a line-at-a-
   time rule would have missed it; most of this code builds strings that way.

It runs under every awk on the machine, like the other lints, and for a
specific reason: the previous lint written here used a GNU `sed` extension,
passed on Linux and failed on Larry's Mac, and what let it get that far was a
guard that ran it once rather than per awk.

A third limit arrived the first time the check met new code rather than old.
The camera readout builds its string across several statements and assigns it
to `innerHTML` at the end, so the statement scan could not see where it was
going — and one of those lines is `replace(/&/g, "&amp;")`, which exists to
*produce* entities from text on its way into markup. A line containing
`replace(` is therefore allowed. **Two of the three flags it raised were
right and one was not, which is the ratio that decides whether a lint
survives**: the two were fixed by writing the character, the third by naming
the idiom.

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

### The friction figure (W01), measured off the drawing

The `gradient` lesson draws its two rules of thumb (weather 1.0.1). Over land
the speed is drawn as a band, 1/3 to 2/3 of the wind aloft, because the public
sources disagree and the ground decides it (Larry's ruling AJZ).
`docs/web/tests/weather-friction.js`, stage 9 of `run-weather-web.sh`, reads
the parts by name (`data-part`) in night and in day and measures them: the sea
arrow backed 10-20° and 2/3 the length of the wind aloft; the land arrow backed
30-40°, solid to 1/3 and dashed on to 2/3 on the same line; land turning
further and, at its slow end, slower than sea; the low drawn above the isobar
and both arrows turning up toward it, which is the northern hemisphere; the
colours read from the page's tokens; nothing outside the box. 32 checks. Four
faults planted and caught: a sea angle of 25, a land slow end of 1/2, the turn
drawn away from the low, and the accent fixed instead of read from the page.

**Two checks had to learn that a first-tier lesson can carry a figure.** Until
now only the deeper tier drew one. `weather-les.js` asked the awk for figure
markers (`FIGDUMP=1`) on the deeper tier only, so the first tier compared the
terminal's character art with the page's marker and failed by construction;
it asks on both now. `tests/weather-reflow-check.js` counted a panel only by
`.gundemo`; the friction figure is `.fricdemo`, because it takes the lesson's
full width, and both are named.

**A fault found by drawing it.** The terminal's coriolis wind figure, at 45 N,
drew the wind running east with the low below the isobar: the southern
hemisphere. Nothing caught it, because the golden file had recorded the wrong
picture as right. A golden file holds a drawing still; it cannot say the
drawing is true. It now draws by hemisphere, and the golden file holds the
corrected figure.


### The force triangle and the veer figures (weather 1.0.2)

`docs/web/tests/weather-forces.js` (stage 10) drags the friction slider through
eight settings, in night and in day, and holds the drawing to the balance
written in the check, not to the page's own arithmetic: pressure, Coriolis and
friction close head to tail; Coriolis meets friction at a right angle and the
corner sits on the circle drawn on the pressure arrow; the wind is turned by
the angle whose tangent is drag over Coriolis, and is that angle's cosine as
strong; Coriolis lies on the wind's right; more friction always turns it
further and slows it; the story under the slider is the one for that ground.
287 checks. Five faults planted and caught: the wind left at full strength,
the angle halved, the corner moved off the circle, Coriolis put on the left,
and a ground boundary moved.

`docs/web/tests/weather-veer.js` (stage 11) reads the veer lesson's two
figures: the veer arc runs clockwise from west toward north and the back arc
anticlockwise toward south; in the north the low is drawn on the wind's left
and the surface wind turns anticlockwise toward it, in the south the mirror;
and each panel's word (BACKED, VEERED) agrees with its drawing. 32 checks. Four
faults planted and caught: the veer swept the wrong way, the south drawn as the
north, the words swapped, the lows swapped.

**A typed count that went stale.** `weather-ui.js` expected exactly 10 lessons.
It now counts the awk's own `les()` list, so the next lesson needs no edit here.

### The wind from the isobars (weather 1.0.3)

`docs/web/tests/weather-iso.js` (stage 3b, no browser) compares the page's
reasoning with `weather isobars` character for character over 280 cases: every
refusal (no spacing, no latitude, nothing or less, a latitude off the earth,
within 5 degrees of the equator), both hemispheres, the interval given, left
out and odd. It then holds the wind to the balance written in the check, not
in either program: four worked values, halving the spacing doubling the wind,
and the same spacing blowing harder nearer the equator.

`docs/web/tests/weather-isoui.js` (stage 12) drives the screen in night and
day at six readings: the isobars drawn apart in proportion to the spacing; the
wind aloft as long as its speed; the wind on deck two thirds of it, turned 15
degrees toward the low, up in the north and down in the south; the dot on its
own latitude's curve at the spacing and the wind; no drawing near the equator;
nothing outside either box; and the gradient lesson's copy of the scale. 176
checks. Faults planted and caught: the air density changed in the port, the
deck wind turned away from the low, the spacing drawn at a fixed gap, the dot
drawn below its curve.

**The golden file's lesson list was typed, and missed one.** `tests/golden.sh`
named the ten lessons; `veer`, the eleventh, had no golden copy. It now asks the
awk for the list, as `weather-ui.js` does.

### A storm in the shared words, both hemispheres (weather 1.0.15)

**The words, the side and the band, worked again by the test.** Every advisory
in `weather-storm.js`'s grid is also run mirrored to 21.6 S, so more than 240 are
worked, and the page must print what the awk prints. The test then works out for
itself: the dangerous side (the right of the track in the north, the left in the
south) against "the dangerous side" or "the navigable side" in the text; the
shift to expect (a veer on the right, a back on the left); and the band the wind
puts the centre in, from whether the boat is ahead of the storm or behind it and
from the hemisphere, against the bearings printed. On the picture, each of the
low's eight arrows must turn round it anticlockwise in the north and clockwise
in the south, turned in, and the wedge must be that band. A storm and a boat on
opposite sides of the equator must be refused.

### The glass in the Met Office's bands (weather 1.0.13)

**Each boundary from both sides, and the figure as printed.** `tests/wx-check.awk`
holds `wx_band` to the Met Office's bands: 3.6 hPa down in three hours is
falling fast and 3.5 falling; 1.6 each way is falling or rising and 1.5 steady;
over six hours, 7.2 down is falling fast and 7.0 falling. Four more cases hold
the rule that the word follows the printed figure: 1.56 up prints +1.6 and is
rising, 1.54 prints +1.5 and is steady, 3.56 down is falling fast and 3.54
falling. `docs/web/tests/weather-glass.js` grades the page's stretches by the
same rule worked in the test, and requires each key line to fall at its own
slope (1.6 and 3.6 hPa in three hours) on the figure's axes. The golden file
shows every reading near a boundary that changed its word, and was read before
it was regenerated.

### The words off the picture (weather 1.0.12)

**Every callout outside the plot, clear of every other.** Larry found the labels
round the reported storm on top of each other. 1.0.12 moved them into the
margins as callouts with leader lines. `weather-storm.js` now measures each
callout's box on the page, as laid out. Each box must lie outside the plot's
circle, must not overlap any other callout, and must have its leader line. The
check is shown to work on the page's own drawing: a callout moved onto the plot
is caught, a callout moved onto another is caught, and with both put back the
picture is clean again. 29 checks.

### A reported storm: the words, the geometry worked again, and the picture (weather 1.0.11)

**The words.** `docs/web/tests/weather-storm.js` (stage 18) runs `weather` with
`cmd=storm` and `CHART.stormReport` over 144 advisories and 15 more cases, and
requires the two to print the same characters, under mawk and gawk. The grid
puts the centre at every eighth of the compass, 80 and 330 nm off, moving every
eighth of the compass, with and without a 34-knot radius, a course or a wind, at
ages of 0, 4 and 12.5 hours. The extra cases are the ways a position can be
typed, the dateline, the south's refusal, and each refusal of a bad number.

**The geometry, worked again.** The test does not trust either program for the
closest approach: it steps time a hundredth of an hour at a time over 400 hours
and finds the nearest the two come, and that must match the report's hours and
miles to within one. It finds the side of the track by the sign of a cross
product, with half a mile either side counting as on the track.

**The picture.** Three advisories, night and day: the low's eight arrows go
round it anticlockwise, turned in (between 60 and 90 degrees from the way to the
low); the low is drawn at the report's bearing and distance; it was moved on
from where it was reported along its movement, and its track points that way;
the band from the wind runs from wind+110 to wind+135; the closest approach is
drawn as long as the report says. Four planted faults, each caught: the low's
wind turned the wrong way, the track drawn backwards, the low in the wrong place,
the closest approach too long.

### One model in two builds, and the fronts read back off the drawing (weather 1.0.10)

**The model, character for character.** The fronts figure is drawn from a model
of a frontal low, and the terminal and the browser each have their own copy of
it (`fr_p`, `fr_from`, `fr_glass` in `wx.awk`; `WX.frP`, `frFrom`, `frGlass` in
`wx.js`). `docs/web/tests/weather-fronts.js` asks the awk for 693 points
(`weather` with `cmd=frontsdump`: the pressure, the wind's bearing, the
three-hour glass and its word) and prints the same from the browser's model.
The two must be identical, under mawk and under gawk. So the terminal's tables
and the browser's strip cannot say different things.

**The figure, measured.** Then the test reads the figure back off the drawing:
the low drawn with at least six isobars; every arrow of its own wind with the
low on its left, facing downwind; the low going east, from its motion arrow;
five hulls of boat A south of the low and three of boat B north; each boat's
wind measured from its arrow, and the strip naming that point; boat A turning
less than 20 degrees before the warm front, then veering more than 30 at each
front; boat B backing more than 20 at every step; the words VEERS and BACKS;
and the rule, that the boat on the low's right veers. Night and day, colours
from the page, nothing outside the box. 19 checks.

**Five planted faults**, each caught: a word swapped, one of boat B's arrows
turned round, one strip label changed, one of the low's arrows reversed, and
the low drawn going west.

### The shared storm cases: one fixture the whole crew answers (weather 1.0.22)

**Why.** Larry's ruling TAYT (19 November 2026): before the CelestialGlass
launch, every tool that gives the storm rule must give the same answer from
the same cases, with the same words. The cases are one fixture in spec,
`spec/contracts/storm-cases/storm-cases.txt`, with a README that says how each
was made and what is still to be ruled. NAV writes it; PILOT checks it
against Bowditch; WX's face reads it; so does bashnav.

**bashnav's copy.** `tests/storm-cases.txt` is a copy, so bashnav's suite runs
on its own. When spec is beside bashnav, the test requires the two to be
byte-identical, and the six shared lines in the test to be the README's, word
for word.

**What is checked.** `docs/web/tests/weather-storm-cases.js` (stage 20 of
`run-weather-web.sh`; no browser) runs every case in the terminal (`weather`
with `cmd=storm`, mawk or `$AWK`) and in the browser's model
(`CHART.stormReport`), and requires the two to say the same thing, character
for character, and both to give the fixture's centre and distance, its side,
ahead or behind, its shift, its shared lines word for word, and the band the
wind puts the centre in with its verdict (Larry's ruling TAYY: line 4's words,
110 ahead and 120 to 135 behind, a point or two less on the near side). Every
case is checked in full; three are also listed as pending, because the face
decides "on the track" another way and that waits on Larry. Since the cases'
r3 (Larry's ruling TAZT) it also checks bashnav's one "in its path" line, "near
its path", which comes from the advisory's track and 34-knot radius and not from
the wind's signs; bashnav gives no course to steer. 23 cases, 244 checks with
spec beside bashnav.

**What it found at once.** A centre less than half a degree past the band's
edge read "0 degrees outside that: near enough". Fixed in 1.0.22: the bearing
and the band are printed to the whole degree, so under half a degree outside
is inside.

### Seven figures from one small model, and arithmetic done in the test (weather 1.0.21)

**The model, character for character.** The routing lesson's figures are worked
on a made-up boat in one steady wind (`rt_g`, `rt_cost`, `rt_width`, `rt_allin`
in `wx.awk`; `WX.rtG` and the rest in `wx.js`). `docs/web/tests/weather-route.js`
(stage 19 of `run-weather-web.sh`) asks the awk for 941 lines (`weather` with
`cmd=routedump`: the hours to make good 845 displacements in five winds, what
162 places cost, the worked times, the lane widths, the all-in table and the
lesson's three tables) and prints the same from the browser's model. The two
must be identical, under mawk and under gawk.

**The model, against arithmetic done in the test.** Agreement between two
copies proves only that they agree. So the test also works the model's claims
itself: an hour at each of the boat's sixteen speeds makes good an hour's run;
twice as far takes twice as long; port and starboard mirror; no dog-leg beats
the straight course, over 1,000 triangles; a shifted wind is the same wind with
the chart turned; no place costs less than nothing; the corner of the laylines
costs nothing; with nothing to lose, the beat's lane is the 12-mile diamond; a
veer for the boat on the right is a back for the boat on the left; and the
right-hand boat's time after the veer is her distance over a speed between her
6.0 and her 6.9 knots. The course's three runs are held to their finishing
times by the clock.

**The figures, measured.** Each of the seven is read back off the drawing,
night and day: the isochrones against the boat's outline; the finish 22.5 miles
on 075 and on the three-hour line; ten columns as tall as NOAA's figures, with
the horizon between day 5 and day 6; every point of each lane's edge costing
ten minutes, and the widths written being the widths measured; the boards drawn
adding up to the miles written; the nine times in the all-in table, each boat's
track timed leg by leg in its own wind, and the minutes up and down; each
scaling bar against the GRIB's 20 knots; each run's bars against its hours, and
the tack marks at the times written. Then the lesson's words are held to the
same numbers.

**The checker, shown to catch things.** Seven planted faults, one in each
figure: the finish moved, a column shortened, a width and the extra miles
written wrong, two boats' times swapped, a bar lengthened, a tack mark moved.
Each is caught.

**One accommodation, stated.** The lane figure clips its isochrones to their
panels, so its "nothing outside the box" check measures everything outside the
clipped groups, and requires each clip itself to lie inside the box.

### A figure read back off the drawing, and a checker shown to catch things (weather 1.0.9)

**The passing low, measured.** `docs/web/tests/weather-pass.js` (stage 16 of
`run-weather-web.sh`) takes nothing from the figure's own arithmetic. It reads
where the three lows are and which way the track's head points, and requires
the lows in time order that way and the panel's title to agree; two isobars
centred on each low, and its eight arrows between them, going round it anticlockwise in the north and clockwise in the
south, each turned 15 degrees in; each boat on the side it is called; each of
its three winds obeying Buys Ballot against the low drawn at that time (facing
downwind, the low 75 degrees to the left in the north and to the right in the
south: 90, less the 15 the wind turns in); the label beside each arrow naming
the point it is drawn from; VEERS or BACKS as the drawn wind turns from time 1
to time 3, and as the rule says, the boat on the low's right veering; the
caption naming the three winds, and the side the low passes. Night and day:
the winds in the page's accent, the low's wind in its warning colour, nothing
outside the box. 28 checks.

**The checker is shown to catch things.** After the real figures pass, the
same checker runs on copies with one thing broken in each: a word swapped, one
wind arrow turned through a right angle, one low spun the wrong way, the
track's head turned round, and the northern figure checked as the southern.
Each must fail, and each does. A checker that has never failed proves
nothing about the figure.

**A figure nobody wired drew a gun.** The browser's table of lesson figures
fell back to the gun for a kind it did not know, and the reflow check, which
counts figures against the shell's markers, counted the gun and passed. An
unknown kind now leaves its box empty, and that the reflow check does catch.
`tests/weather-reflow-check.js` holds 23 figures (were 21).

**Two golden files did not match the code.** tides 1.4.2 changed its heading
and the October Ekelund fix changed how a zero bearing rate prints, and
neither commit carried its golden file. `tests/golden.sh` is not in
`run-tests.sh`, so the suite did not see it; on a clean checkout it reported
two files changed that nobody had changed. Both now hold the code's output.
And `tests/golden.sh` itself could not run under mawk: it loaded colregs
without `review.awk`, which mawk will not accept. It loads the four files the
suite loads, and compares clean under mawk and gawk.

### A golden file that got shorter, and a claim tested by moving a storm (weather 1.0.8)

**The golden file lost four cases and nothing said so.** In 1.0.7 a case
added to `tests/golden.sh` ended with `grep -c`, to print how many times a
line appears. When the answer is none, `grep -c` prints 0 and fails. The cases
sit in braces on the left of a pipe, so `set -e` stopped the braces there and
the pipe still succeeded: the four isobar cases that came after were simply no
longer in the file, in the committed copy and the fresh one alike, and the
comparison passed. Found when a new case added in the same place did not
appear either. Each such count now ends `|| true`, and the weather block ends
with a marker line whose absence is an error. The other blocks have no counts
in them; a marker for each would be the thorough cure.

**The words for a wind shift make a claim, so the claim is tested.**
`tests/wx-check.awk` does not test the sentence; it tests what the sentence
says.

1. **Eight cases:** each hemisphere, the storm going east or west, the boat
   north or south of its track. The wind at the boat comes from Buys Ballot
   with the turn toward the low. On the left of the track it must back, on the
   right veer.
2. **A low moved past a boat on every course.** For each bearing of the low
   and each course, which side of the track the boat is on and whether the low
   is closing are worked from the two directions alone, a cross product and a
   dot product. The quarter `wx_course` gives must hold the course, and the
   bearing it comes nearest on must be abeam of it on the boat's side. Over
   1,500 cases.
3. **The sector** is 20 degrees wide, starts at Buys Ballot's arm and runs
   forward, for every wind in both hemispheres.

The rule these cases test has since been read in Bowditch (2017, chapter 39;
`docs/SOURCES.md`, Weather). The tests did not change: they test what the rule
says, and the source confirms the rule rather than altering it.

**The card, measured.** `docs/web/tests/weather-low.js` (stage 15): the wind's
arrow on its bearing through the centre; the wedge from the arm to 20 degrees
forward in each hemisphere; the low on the middle of its bearing at the one
distance; its eight arrows going round the right way, each turned 15 degrees
in; the fan on the quarter worked in the test from first principles, in each
of its four quarters, and absent with a steady glass or a small shift; the
card straight before its own words; nothing drawn with no wind direction;
night and day. A sweep of every tenth degree in both hemispheres requires
that no label lies on another or on a compass letter and nothing leaves the
box. 207 checks. Six faults planted, each caught: the sector the wrong way
(32 failures), the wind before drawn solid (3), the quarter's closing and
opening exchanged (19), the wind round the low the wrong way (9), the low on
the edge of its bearing (9), and in an earlier form the shift's arc reversed
(3).

115 checks in `wx-check.awk` (were 101).

### A rule that was never scored, and a corpus that never asked (weather 1.0.7)

Two faults had sat behind tests that passed. The score's rule for the sea
state was a table of its own, and the only check on it was that it rose with
the wind. And the sea state was never scored at all: the scored-log corpus
gave every observation exactly the state that rule gave its wind, and no
forecast in it ever offered a sea state, so the one field that was skipped
was never missed.

1. **The curve is held to its source.** `tests/wx-check.awk` has the Met
   Office's table written out and requires the curve to give each force's
   height at its mean wind.
2. **The steps are written out and found again.** A step found by comparing
   two floating-point heights can land either side of its own edge, so the
   steps are constants in knots. The check finds each edge again from the
   curve, by halving, and requires the constant to match: move a point of the
   curve and it fails until the step moves with it.
3. **The Met Office's pairs.** Forces 4, 7 and 8 must each hold both of their
   states, and force 6 only one.
4. **Close** nests by share, is always the next state up, and 0 turns it off,
   over every tenth of a knot to 70.
5. **The limit** is worked in the check from the definition of the knot, and
   must never be under the scale from 15 knots up.
6. **The two builds on the edges.** `weather-wx.js` has a third corpus of 400
   logs ending on winds from every part of the scale, the edges themselves and
   the first wind of each close zone among them, with the share set, off and
   out of range. It fails if fewer than 400 of its logs speak of the sea.
7. **The score asks now.** `weather-sc.js` logs a sea state that is the
   scale's, one either side of it, or absent, and its forecasts offer one. It
   fails if fewer than a third of its logs score a sea state.
8. **The figure, measured.** `docs/web/tests/weather-sea.js` (stage 14): the
   scale's dots on the table; the boxed band the state that height falls in;
   28 knots close at a quarter and not at a tenth, 27 not close, 29.5 close at
   a tenth; the buttons, remembered, stopping at 0 and 50; the bar over the
   band logged; the diamond at the swell's height; the limit dashed, on
   `0.22 U^2 / g`, from 15 knots, never under the scale; the figure straight
   before its own words; nothing drawn with no wind; night and day. A sweep of
   125 winds and logs requires that the three labels never lie on each other
   and nothing leaves the box. 62 checks.
   Three faults planted, each caught: a point of the curve moved (7
   failures), the close share doubled (2), the limit drawn solid (3).

101 checks in `wx-check.awk` (were 37), 17 in `score-check.awk` (were 11).

### A lesson held to the working it describes (weather 1.0.6)

The tide lesson quoted sizes the working never used ("~1.2 hPa at the
equator, ~0.2 at 45 deg" against 1.4 and 0.5). Nothing could catch it: the
golden file pinned the lesson's words, and the rule checks pinned the working,
each on its own. `tests/wx-check.awk` now asks `wx_tide` for its size at the
equator, 45 and 50 degrees at the morning maximum, builds the lesson's line
from those two numbers, and requires `src/weather/teach.awk` to contain it.
Change the working and the check fails until the lesson is changed with it.
Shown to fail: run from a folder where the lesson cannot be read, it reports
the line it wanted. 37 checks, were 33.

### The glass, and a corpus that could not see a fault (weather 1.0.5)

**The fault.** A weather observation logged on its own has no position, and an
empty latitude was read as the equator: the daily tide was taken off at its
full tropical size, four times too much at 50 N. Both builds did it
identically, so the character-for-character comparison passed, and it passed
for a second reason too: **every generated log put a deck entry, with its
position, on every single reading**, and so did the golden log. A corpus shaped
unlike real use cannot find what real use would. `weather-wx.js` now runs a
second corpus of 400 logs kept the way one is at sea: readings at uneven
intervals over up to four days, most of them weather observations on their own,
a position now and then, sometimes never, sometimes not until late, the
longitude sometimes not set, the window 24, 48, 72 or left out. The golden file
gained five reports from such logs, one of them the fault's own case.

**The barograph, measured.** `docs/web/tests/weather-glass.js` (stage 13)
seeds the shared log store as deck-log would and reads the drawing back:
every reading where the axes say; each stretch in the tendency worked in the
check from `1.4 cos^3(latitude)` and the local sun time; heavier for worse
news, each in its own colour from the page; the wave through the first
reading, the right size, cresting near 10 and 22 by the sun; the strip's runs;
each key line at its own slope; the window buttons, remembered across a
reload; the table present in the terminal text and absent from the page's
reasoning; no wave and a plain note without a longitude or without any
latitude; the days named by their real dates. 136 checks. Six faults planted
in the drawing and caught (the wave not anchored, a weight out of order, a key
slope, the wave's phase, the weekday, the carried latitude taken out of the
page), and two in the port caught by the corpus (the carry removed, a boundary
moved).

### One rule for lesson names (tides 1.5.3, weather 1.0.4)

The lesson-name rule moved to `docs/web/shared/lesson.js` (Larry, ALI), so
`tides-work.js`'s list of names, built and refused, now tests that file through
`work.js`; six names were added for Level 3a. `work-engine.js` gained the check
that matters most for the course: `work.js` run as a course page runs it, in a
bare scope with no `lesson.js` and no `require`, must still offer its shared
surface and must build no back link. A planted load-time lookup broke exactly
that and was caught. `weather-isoui.js` opens the isobars screen from five
links: two good ones (north and south), a lesson name without its year, a
spacing that is not a number with markup in the lesson, and a latitude that is
a script.

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

### A published test vector, because the third implementation is not ours

`docs/web/tests/nt1-roundtrip.js` checks that the NT1 check code of
`123456789` is `29B1`. That one line is the whole reason the check code is
CRC-16/CCITT-FALSE rather than something invented here.

Three programs have to produce the same four characters for a message to be
readable: `docs/web/deck-log/nt1.js`, the website's Email Worker, and the
watch, written in Monkey C in a different repository by a different session.
The first two share a file. The third cannot — a watch app does not load
JavaScript — so it has to be written from the *specification*.

1. **With a published algorithm, each end validates itself.** The watch
   computes `29B1` or it does not, and that is settled before either end
   sees a real message.
2. **With an invented one, the only reference is this source.** The watch
   would have to be a careful reading of it, and a careful reading that drifts
   by one bit is a message that arrives and cannot be read — at sea, where
   nobody can compare the two files.

The round trip also checks that the worked example in `nt1.js`'s own header
comment carries a real code, so the documentation cannot quietly stop being
true, and that a piece cut short is refused — truncation being the failure
that actually happens to a message with a character limit.

### The fixture is the watch's real code, and what it still cannot prove

`docs/web/tests/qr-read.js` decodes a QR code and compares it to an expected
string. Two choices in it are worth the words.

**The fixture is not generated for the test.** It is the code
`WeatherGlass/tools/qr_ref.py` actually produces — byte mode, level L, version
10 — embedded in `docs/web/platform/index.html`, where it was first put to
find out whether an iPad could read it. The test reads the picture *and* the
expected text out of that page with a regular expression, so there is one copy
of the fixture and the thing under test is the thing Larry points his camera
at. A fixture generated by the same kind of library that decodes it would
prove the two agree, which is not the question.

**And it is checked at four orientations and two scales, plus noise, blank
and half a code.** The last three matter most: a reader that returns something
from noise is worse than one that returns nothing, because deck-log would file
it.

**What it does not prove.** Nothing in it involves a camera. Glare across a
watch crystal, focus at 15 cm, a screen dimmed to red at three in the morning
— none of that can come from a fixture, and all of it is what the decision to
take a library with field miles rather than write one rested on. That claim is
tested by pointing the iPad at the watch, which is what the camera button on
`docs/web/platform/` is for. **A hundred per cent on this file is not a
statement about the foredeck**, and saying so here is the point: the suite is
allowed to be silent about a risk, but it is not allowed to look like it has
covered it.

### Two photographs of the watch, because a clean rendering is not the question

`docs/web/tests/qr-photo.js` decodes two photographs of Larry's quatix, taken
in his kitchen, with the screen's own pixel grid and dither in them. The
difference between this and the clean-rendering check above is the difference
between *the decoder implements the standard* and *the decoder reads the
watch*.

1. **Neither photograph decodes at the size it is committed.** Scaled down,
   both do — 500 px for one, 600 px for the other. That is the rule the reader
   is built around, so the check is also the rule's evidence: if someone later
   removes the downscale as a pointless step, this fails.
2. **The downscale here is a box average, cruder than the browser's.** A check
   that passes with the worse filter passes with the better one.
3. **"Reads at native size" is printed, never asserted.** If a future decoder
   manages it, that is good news, and a check that failed on good news would
   simply be deleted by whoever met it.
4. **They cost about 300 KB**, at 700 px, greyscale, posterised to 32 levels,
   rather than eight megabytes for the originals. Larry agreed to publishing
   them; the payloads carry his home position.

5. **The payloads were cross-checked against another decoder.** All thirteen
   photographs that jsQR reads were also decoded by zxing-cpp, in the
   WeatherGlass session, and the two **agree byte for byte**. Two independent
   implementations reaching the same 205 to 271 characters is better evidence
   that the text is right than either one alone.

One of the fourteen will not read with jsQR at all — not cropped, not
sharpened, not thresholded, at any scale. zxing-cpp reads it. So the limit on
that frame is this decoder's, not the photograph's, and it is not in the
repository: a fixture asserting "still unreadable" would fail the day
something improved, which is the wrong way round for a test.

### Checksums, because a vendored file nobody watches is not vendored

The same test pins the SHA-256 of `docs/web/vendor/jsQR-1.4.0.js` and of its
licence. bashnav has exactly one piece of third-party code, and this is what
keeps it honest: the file cannot be edited, re-minified, patched in place or
upgraded without a test saying so and somebody deciding. It also checks that
`NOTICE` still names jsQR, because Apache 2.0 requires the attribution to
travel with the code and a licence obligation that depends on memory is one
that gets dropped.

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

### The coastal calculators: an independent working, then sameness

`tides work` is checked the way the harmonic engine is, in two halves.

1. **The awk against the method.** `tests/tides-work-check.awk` runs the
   cases in `tests/tides-work.dat` through `wk_run()`, the same entry the
   tool uses, and compares its results with numbers printed by
   `tests/tides-work-ref.py`. That script works each method from its
   definition and, where there is a second way, uses it: the twelfths are
   integrated from the staircase rather than read from 0-1-3-6-9-11-12, and
   the course to steer is found by bisection on the ground track rather than
   the asin of the cross-track part; the tidal gate's stream along the track
   is a dot product of two vectors rather than rate x cos, and its turn is
   found by bisection on the straight line rather than by the proportion;
   lunar's phases of the Moon are found by bisection on the elongation,
   bracketed by a scan, rather than by stepping at the mean rate, and its
   calendar is Python's own rather than the Julian Date formula.
   The coastal course's own chapter
   examples are in there too. One expected value was first typed by hand and
   was wrong; the script caught it — which is the rule above, again.
2. **The browser against the awk.** `docs/web/tests/tides-work.js` compares
   `work.js`'s working with `tides work`'s, line for line, over every case
   and every help example, refusals included; reads each SVG figure back
   through its `data-pt` marks and checks the triangle closes on the right
   bearings at one scale; and checks the lesson link is built only for a
   real lesson id.

Faults planted and caught: leeway applied the wrong way, a twelfths
cumulative of 8 for 9 (which passed until cases were added in tidal hours 1,
5 and 6 — the staircase is only tested where a case lands), `toFixed` for
printf's rounding, the falling-tide sign dropped, and the water vector drawn
three degrees off. For the tidal gate, twenty-seven in the awk and seven in
the port: among them the stream along her track with its sign turned
round, the foul limit applied with the wrong sign, a turn worked from the
unrounded stream, the mean interval used when `hw2` is given, a time across
midnight read on the wrong tide, and high water drawn off the middle of the
strip. Three were not caught at first and each became a case (rounding, a
time across midnight, tides eleven and a half hours apart). For lunar,
twenty-five in the awk and fifteen in the port, all caught: among them the
elongation taken the wrong way, springs put at the quarters, the rule a day
early, the coefficient truncated or worked on the half range, the almanac's
figure taken from the whole tide, the day drawn off the middle of the strip,
a bare number on the day's label, a call lunar does not need added to its
list, the guide lines' labels put back on the bars, two close labels left
standing on each other, a station's label without its height, and the empty
band below the dates.

**Lunar's figure is also held to its layout.** The figure check reads back
that every guide line has its label in the margin to the right of the bars,
none of it over a bar; that two labels stand clear of each other; that a
station's label carries its height; and that the drawing ends within 20 of
its dates. A label standing on the bars hid the tops of the last few, so a
month of making tides read as flat: Larry found it in the printed figure.
The Kaikoura case (`ticon/kaikoura-kait-nzl-ttw`) is a port where mean
springs and mean neaps lie close together. Only a browser can measure text,
so `tides-ui.js` checks that every word of every figure it draws lies inside
the drawing; a station's label set on one line ran past the edge, and that
check names it.

**Depth, the ninth calculator.** Its reference finds every time by bisection
on the height each rule gives at a time, where the tool turns the rule round:
the twelfths by a proportion inside the tidal hour, the cosine by an arcsine.
The two cannot share a mistake in the turning. Seventeen worked cases: both
edges, one tide rising and falling, never, always, a tide across midnight, a
height reached exactly at high water, low water below the datum, and a
crossing in every tidal hour of the staircase both ways. At a station the two
rules are held to the turns the day's table prints, and the prediction's own
edges to a walk along the same curve a minute at a time. The page prints the
same working as the shell for all of them, and its figure is read back on one
height scale: the twelfths' dots give the scale, and the line of the height
she needs, the circle and its point, the edges of the window, her keel and the
bank must all sit on it. Thirty faults were put in one at a time, seventeen in
the shell and thirteen in the page and its figure, and each is caught. One got
past at first and found a fault that had not been seen: the height she needs
is a sum of figures typed to the centimetre, and such a sum can come out a
hair over (0.1 + 0.2 is 0.30000000000000004), so a tide that reached it
exactly was called "never". The comparison now allows the hair, and two cases
hold it.

**Depth in a sea (W28).** The reference combines the swell and wind waves
with `math.hypot`, where the tool squares and adds; seven cases cover the seas
governing, the keel governing, one height only, a charted depth, a sea that
leaves never enough water, her time in water the seas would break in, and a
station. The three explanations the working prints are held line for line to
`docs/web/notes/weather-W28.txt`, the text tagged for the weather app. Ten
faults were put in, five in the shell and five in the page and figure, and
each is caught.

**What lunar's reference does not cover, and what does.** The Sun's and
Moon's longitudes are the engine's own short series in both, because that
series is the definition here; the reference checks the working built on it.
The predicted parts (the tide at a station, the tides found, Brest's
coefficient both ways) have no second working: they rest on the harmonic
engine, which is held to NOAA's tables, and on the browser and shell agreeing
line for line. The almanac's figure was measured once against the published
coefficients for Brest, November 2026: within 2 at all 56 high waters.

## The zero, the licences and the high-water levels

**The ports on chart datum** (`tests/tides-zero-check.awk`, in the suite):
the station file must agree with `src/tides/gen/corrections.dat` station by
station; no station may be named `CD` without a line there; each port is held
to the published figures in `tests/tides-zero.dat`, none of which was copied
from the station file; a twin record of the same gauge must be within 45 mm of
its port's first; and every port must have a published figure, with none
exempt (Cherbourg was, by name, until Shom's RAM gave its mean level: Larry's
ruling TBUP, 28 November 2026). **To add a port,** find
its published mean level, check that the provider's gauge zero is chart datum,
add its lines to both files, apply, and say so in the CHANGELOG.

**The words.** The suite reads the zero, the provider and the licence at seven
stations of every kind, and holds the depth sum's caution to the stations that
need it. `docs/web/tests/tides-zero.js` then opens all 8,334 stations in the
browser's engine and holds each to the line the awk prints, and to the counts
of each kind (chart 3,508, computed 4,511, mean sea level 315), so a station
moving from one kind to another is a decision and not an accident.

**The high-water levels** (`tests/tides-levels-check.awk`): the file has one
line for each reference station in the station file's order, its levels are in
order, and it matches what NOAA publishes for three stations
(`tests/tides-levels.dat`). Ten bridge checks work the level again from the two
files, apart from the engine, and hold the sum line to adding up.
`run-tides-web.sh` recomputes three stations and fails if the file has gone
stale.

**Faults planted** (`zfaults.py` in the session's scratch): twenty-six, all
caught. Among them a station file left at its old zero under the new name, a
port 0.1 m off its published level, every MLLW called chart datum, a caution
dropped, the level left out of the bridge sum or its windows, HAT offered on an
American chart, and a level off its published figure. One was left out as
undetectable: a secondary port judged by its own id, since every secondary
port and its reference are both NOAA's.

**Not covered:** the shell's typed question for the level, which is three
lines of `sh`; and a published HAT for a British or French port, which waits
for the almanac.

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

## The suite may not read a keyboard, and a failure must show its end

Two faults in the harness itself, found while applying the tides calculators.
Neither was in the patch; both had been there as long as the checks had.

### A check waited for a person, and the answer depended on who ran it

`guard()` started each check with the suite's own standard input. Run from a
Terminal, that is the person's keyboard. `tides find` lists its matches and
then asks *"Number to use it, or return to search again"* and reads a line, so
`ios-home.sh` sat on that question until `guard` killed it 180 seconds later
and reported **"a tool cannot run on iOS"**.

`guard` did what it exists for: the hang was caught, timed and named. What it
did not do was make the hang impossible, and that is the worse fault — one run
gave two failures and the next gave three, because a shell got through
whenever a key happened to be pressed.

**A suite whose answer depends on who ran it, and whether they touched the
keyboard, is worse than one that fails.** A failure is read and fixed; a
result that moves teaches you to run it again until it is green, and that
habit will one day swallow a real fault.

Standard input is now closed twice: `exec </dev/null` for the whole suite and
everything it starts, and again inside `guard`, because a guarded check is the
one that can wait for ever and a reader of `guard()` should meet the rule
where the risk is. `ios-home.sh` closes it on its own `find` step as well,
since its header invites running it alone.

Reproduced both ways before and after, with standard input a pipe that never
speaks: `tides find` was still waiting when the test gave up; afterwards
`ios-home.sh` finished in 0.4 s and the whole suite passed.

### The report cut off the only line that said what went wrong

On a failure the callers printed `head -10 "$GUARD_OUT"`. `ios-home.sh` prints
a progress line before each step, and its first ten lines are ten *version*
steps that all passed. The step it was stuck on was line 11, and `guard`'s own
*"TIMED OUT after 180s"* note is appended, so it is the last line of all.
**Both were cut off**, and the report showed ten healthy lines above a verdict
that explained nothing.

`gshow` replaces the four `head` calls. It prints the end, where a failure and
the timeout note both are, keeps the first three lines for context, and says
how many it elided. Short output is printed whole.

The general rule, since the next harness will have the same choice to make:
**a failing check's output is read from the end.** Whatever stopped it is the
last thing it managed to say.

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
