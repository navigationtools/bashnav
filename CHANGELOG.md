# Changelog

## The passage file: a plan for each lesson, a berth for each mark, and passing marks

**What.** A run may name a passage file and one of its plans. A plan is the
passage written down the page as it is sailed: the marks of the course in
their order, each with its own berth, and the places she must pass among them.

    PASSAGE 1
    plan two-miles
      pass  St Albans Head  50.57868 -2.05644  south within 2.0
      pass  Portland Bill   50.51353 -2.45676  south within 2.0
      mark  Eddystone Lt House                 berth 0.15
      pass  Portland Bill   50.51353 -2.45676  south within 2.0
      pass  St Albans Head  50.57868 -2.05644  south within 2.0
      mark  North Head Buoy
    end

and in the run: `passage passage_2025_v1.txt two-miles`.

**Why.** Larry asked whether PILOT would want to set these figures as part of
an analysis. A lesson is a comparison (two miles off, or one), so a variant
should be cheap to write and plain to read. Three ways were put to PILOT and
the XO: in the run file, in a passage file of named plans, or passed in when
the run is sailed. Larry chose the passage file. Nothing is passed in at
sailing time, because a run is one experiment and must be sailed again from
its files alone. The berth for each mark is PILOT's proposal: the Eddystone
wants more than a buoy.

**What Larry ruled, 13 November 2026.**

1. **The course keeps the sailing instructions' words for a mark:** `port`,
   `starboard`, `either`.
2. **A place passed on one side takes a compass word,** `north`, `east`, `south`
   or `west`. It is then a line from its point, that many miles that way, which
   she must cross. Without one it is a circle she must come into, as before.
   Words, not symbols: `<<` and `>>` are easy to swap at a glance.
3. **A berth is nautical miles,** at most two decimals, from 0.05 to 2.00. It
   means what `round` means: never nearer, at any time.
4. **The buoy at the end of the finish line takes no berth.** The 2025 line
   runs only 0.10 nm north from North Head Buoy, so a berth of 0.10 round it
   would cover the whole line but its far tip. A berth written there is refused,
   with the reason.
5. **Red, green and white belong in the drawings,** as sidelights, and not in
   the files: buoyage turns the colours round in IALA B.
6. **The line is `pass`, and the thing is a passing mark.** "Gate" was taken
   twice: B15 is the `tidal_gate`, and to a racing sailor a gate is two marks
   to sail between.

**What it affects.**

1. **A run with no passage sails exactly as before, row for row,** with
   `round`, one berth for every mark. Every published 2025 run was sailed again
   and compared row by row.
2. **A run that names a passage may not also say `round`;** both lines are
   named in the refusal.
3. **A run's `gate` line is read and refused when sailed,** with a message
   naming its line and what replaced it. The `mark` line the held gate work
   added to RUN 3 is gone, and a run that has one is told where marks are
   placed now. That work was never committed. This replaces it, and keeps its
   finding that a mark once rounded stays rounded.
4. **Every plan in the file is checked against the course,** not only the one
   sailed. Every mark is checked, in its order, matched one by one, so a course
   that rounds one buoy twice has a plan that places it twice. Every refusal
   names the file and the line.
5. **The report names the boat's polar,** so that a speed is read as that
   polar's (PILOT asked), and **the plan, each mark's berth, and each pass's
   compass word and distance**, so a result can be sailed again from what it
   prints (the XO asked).

**A fault in the search, found by a line pass, and there all along.** When she
makes a station the step is cut there, the place is noted in its square, and
she sails the rest of the step on from it. When the rest was seconds, too short
to leave the square, her continuation was judged against her own station and
dropped. Only a heading that fell back over the square's edge survived, so she
sailed a few seconds back the way she came. Her own station is no longer a
rival. **Every published run is unchanged, row for row.** The 2025 run with
the four headland passing marks as circles finishes 75 seconds sooner with tacks free, and 65
with an able crew.

**The 2025 race, from PILOT's passage file:**

| plan | tacks free | an able crew |
|---|---|---|
| `as-sailed`, Eddystone berth 0.15 | 09:37:54Z | 09:52:50Z |
| `two-miles`, the four passing marks as lines | 09:44:23Z | 10:04:03Z |

With the lines she passes Portland Bill 0.31 nm off: close under the Bill is
where the line is quickest to cross, and only the coastline's clearance holds
her off. The Portland Race and the Eddystone reef are not in the files.

**Checked.** 26 faults were put in one at a time across course.js, router.js
and sail.js, and each is caught. One got past every check at first, which
exposed the name-lookup fault above. The 12 earlier gate faults that still
apply, the 33 tack-cost faults, the 19 run-command faults and the router's
first 7 were all put back against the new code, and each is caught. 683 checks
in the eight files.

**Not done.** A mark that may be left on either hand is still refused. A pass
has no time window. A line between two given points is not yet a form. The
Eddystone reef is not in an areas file.

## A tack costs something, and a crew decides how much

**What.** A run may now name a crew, and the router charges for every tack
and every gybe. Four things changed together:

1. **A new file, CREW 1** (`COURSE.md`). For each level of crew, and for each
   grade a manoeuvre can come off in - clean, fair, slow, blown - the share of
   her tacks that come off that way and the time each loses. A second line
   gives the same for her gybes. `docs/web/route/crew_starting_v1.txt` has
   four levels to copy and change: green, ordinary, able, crack.
2. **RUN 3**, which is RUN 2 and one more line: `crew <file> <level>`.
3. **The router** (`router.js`) spends the cost: going onto the other tack she
   first makes no way through the water for as long as it costs, and the
   stream has her; then she sails.
4. **The passage log and the report** say what each tack cost and what the
   tacks came to.

**Why.** With tacks that cost nothing the router tacked every ten minutes
where no crew would, and the number of tacks in a report meant nothing. It was
the one missing piece not in doubt when the router went to the course as a
beta.

**The design is Larry's, 13 November 2026**, decided one question at a time:
a tack has a quality, four grades with "blown" at the bottom; a crew is a mix
of them, and its level sets both the mix and the times; anyone may write their
own levels in their own file; a gybe has "its own line for sure, and a blown
gybe is expensive"; and the router plans on the crew's **average** - it does
not know which tack will be the blown one, and neither does the crew.

**The figures in the starting file are estimates, not measurements.** The able
crew's tack line is the one Larry gave. The rest step sensibly from it and are
there to be changed.

**Why RUN 3 and not a line added to RUN 2.** It was first written as an
optional RUN 2 line. The format's own rule caught that: a reader that did not
know the line would sail the run with free tacks and report it as this run.
A RUN 2 file with a `crew` line is refused; every RUN 2 file without one
reads as it did.

**Three things about the search that the cost exposed**, each found by a
check worked by hand that failed:

1. A boat here on port and a boat here on starboard are different places.
2. So are a boat that can fetch the mark from here and one that cannot. Before
   this, a twenty-mile dead beat was sailed with one tack and a 37-minute
   overstand.
3. Of two boats that reach a square together, the one further along the leg
   is kept, not the one nearer the mark. Before this, a twenty-mile run was
   sailed five degrees too deep all the way.

**What it affects - and this changes a figure already published.** The three
rules are used for every run, with a crew or without, so that a run with free
tacks is the limit of the crews and not a different search. The 2025 race with
free tacks, first sailed in 23.70 hours, is now sailed in 23.62: about five
minutes better, in the same weather with the same boat. The track changed
with it - it now passes Portland Bill at 0.88 miles, not 0.21. `ROUTER.md` is
rewritten where it quoted the old run, and has a new part on what the search
can and cannot resolve: a minute or two between two runs is not a finding. A
run takes about eight seconds where it took three.

**The 2025 race by four crews**, same boat, same weather: crack 4 minutes
behind free tacks, able 15, ordinary 34, green 57. The green crew gives 35 of
its 57 to the manoeuvres; the rest is the price of tacking less.

**Checked.** Every expected answer is worked in the comment beside its check.
A dead beat with a five-minute tack is the beat and five minutes, with one
tack. A dead run is the run and its one gybe, at the gybe's own cost. Two
crews that each make one tack differ by the difference in what it costs. A
tack longer than a step is carried into the next; a tack in a stream goes
where the stream goes; one cut short at a mark is still paid in full. A run
with no crew has no manoeuvre rows and its log reads as it did. 33 faults were
put in one at a time across the five files and each is caught; two got past
every check at first and a check was added for each. One check of mine asked
for more than a ten-minute step can give, and says so now.

**Not done.** No one tack is the bad one: the story of one race in which one
particular tack went wrong is a different question and a later piece of work.
The cost does not depend on the wind or the sea. Gates are still refused.

## A run can be sailed from its name, and the router goes to the course as a beta

**What.** `docs/web/route/sail.js`: one command that takes a folder and the
name of a run file, reads everything the run names, checks it, sails it, and
prints a report with the passage log in it.

    node docs/web/route/sail.js <folder> <run file> [--json <file>]

**Why.** The router is five files that must be called in the right order.
That order had been written only in working scripts kept outside the
repository, so the router could be run by one person. It is now written down
once, with its own checks, and a page can use the same function the command
does.

**The router is a beta** - Larry's decision of 13 November 2026. It goes to
the course to be tried before it is finished, so that what is built next is
what the lessons turn out to need. Two things are known to be missing and the
report says both on its first lines: a tack costs the router nothing, so the
number of tacks is not to be believed; and a `gate ... within` is refused
rather than sailed.

**Every refusal names the file,** and two files that would otherwise route
wrongly without complaint - a current given as the wind, an upper-level wind
- are refused before anything is sailed.

**Checked.** `docs/web/tests/sail.js`, 44 checks, on a folder that exists
only in memory. The route must be the router's own for the same files, row
for row. Nineteen faults were put in one at a time and each is caught; one,
the areas files not being read, got past every check at first and a check
was added.

**What it affects.** Nothing a user sees. `router.js` and `passage.js` are
not touched. The test suite gains one check. `ROUTER.md` gains a section,
"Sailing a run".

## The router's passage log: what she did, what she had, what had changed

**What.** `docs/web/route/passage.js` (board item B2). The router answers with
one row for every step - 144 for the 2025 race. This folds them into the lines
a navigator would have written in the deck log: one line for each board, runs
of short tacks as a single line, and the start, each rounding and the finish.
Beside each line it sets down what had changed since the line before.
`ROUTER.md` has a new section on it, with pictures, and the 2025 race as the
log has it.

**Why.** A lesson cannot be read off 144 rows, and a chart shows where she
went without saying what she had when she turned. The log is the part a lesson
reads.

**It states facts and never gives a reason** - Larry's decision of 13 November
2026. The search keeps the earliest arrival out of every heading tried from
every place and holds no reasons, so a "because" would be invented. The log
says the wind veered 16 degrees and that she then tacked; the lesson draws the
line between them, or does not.

**How an entry reads.** The wind is the wind when the line begins, as in a
deck log; distance, time, speeds and whether the stream was fair are for the
board as a whole. Every change is the difference of two printed numbers, each
rounded before it is subtracted, so a reader can check it by subtraction. What
counts as a change - 5 degrees, 3 knots, a stream swung through more than a
right angle - is a choice and not physics: the numbers sit in one place in the
file, come back with every log, and can be set. No line of the printed log is
wider than 80 columns.

**Checked.** `docs/web/tests/passage.js`, 84 checks, on rows written by hand
in round numbers. One reads every word the others made and fails on a
reason-word. Twenty-four faults were put in one at a time and each is caught;
one of them - a board after short-tacking measured against the board before
it - got past every check at first, and a check was added for it. The fixture
itself was wrong once: it called a boat heading 105 in a wind from 259 "port",
and the log printed a bear-away that was really a gybe. The fixture now
refuses a tack that its own heading and wind deny.

**What it affects.** No page loads it yet, so nothing a user sees has changed.
`router.js` is not touched: the log reads its rows and needs nothing else. The
test suite gains one check.

## The router sails a whole race

**What.** `docs/web/route/router.js`: the isochrone search, the last of the
four layers the router is built in (board item B2). Given a course, the water,
a run, the two grids and a polar, it returns the earliest finish and the track
that makes it, one row per step. `docs/web/route/ROUTER.md` describes how it
works, with pictures.

**How it searches.** From every place the boat could be, every heading is
tried for one time step: the fan the run asks for, the best beat and run angle
on each tack, and - when a mark or the finish is within a step - the heading
that lays it exactly. The water is cut into half-mile squares and of all the
ways into a square only the earliest is kept. The one assumption in that is
stated in the file: being somewhere sooner is never worse than being there
later.

**How a mark is rounded, and what `round` means.** The racing rule is a
string, drawn taut along the track. The router lays a line out from the mark
through the middle of the turn, and the mark is rounded when she crosses it
going the right way round. **`round` is a berth** - Larry's decision of 13
November 2026: she crosses that line at least that far out and passes no
nearer at any time. `COURSE.md` had said "how close counts as having rounded",
under which the fastest route shaves the mark at no distance at all; at the
Eddystone that is over a reef the coastline data does not hold. Boats in the
real race do go inside what a prudent berth would be. The router does not, and
the documents say so without advising it.

**A mark that is the end of the finish line is rounded by finishing,** and a
course whose mark and finish line disagree about the hand is refused.

**What it will not sail yet,** each refused with its reason rather than
ignored: a `gate ... within`, and a mark that may be left on either hand.

**Checked.** `docs/web/tests/router.js`, 42 checks, on courses small enough to
sail in the head: twenty miles on a beam reach at ten knots is two hours, a
dead beat is the distance over the best speed made good. Eight faults were put
in one at a time and each is caught. One of the hand-worked answers was itself
wrong - it forgot that a start line and a finish line have width, and the
router beat it - and the comment now says so.

**The first real run** was the 2025 Myth of Malham on the course's own files:
23.7 hours with a generic 70 ft polar, a dead beat to the Eddystone in a
south-westerly of 16 to 24 knots, in three seconds of computing. Checked
afterwards by brute force: no step crosses the coastline. The real boats took
about 44 hours, which is the difference between a generic racing polar sailed
perfectly and a heavy boat sailed by people.

**What it affects.** No page loads the router yet, so nothing a user sees has
changed. `route.js`'s `step()` is split into `conditions()` and `sailFrom()`
so that the grids are read once for a whole fan of headings; its 38 checks are
unchanged and pass.

## The router takes one step, from the grids and the polar

**What.** `docs/web/route/route.js` gains `sample()`, which reads a wind or
current grid at a place and a time, and `step()`, which makes one time step of
a route: the grids sampled, the polar asked for the boat's speed, the vector
step made. `polar.js` gains `sail()`, the boat's speed on every point of sail
the polar file can answer for. This is layer three of the four the router is
built in (board item B2); the isochrone expansion comes next and rests on it.

**Why one step, and not a route.** An isochrone router draws a plausible track
from almost any arithmetic, so the only place a wrong step can be seen is
where there is one of them. `docs/web/tests/route-step.js` holds 38 checks
whose expected answers are each derived in the comment beside them, and seven
faults were put back one at a time to see that each is caught.

**The boat sails in the wind over the water, not over the ground.** A polar is
measured through the water, so it is entered with the ground wind less the
stream: twelve knots of westerly over two knots of east-going stream is ten
knots to the boat, and over two knots of west-going stream it is fourteen.
That is why wind against tide is windier as well as rougher. A router that
enters the polar with the ground wind gets every tidal gate slightly wrong, in
the direction that flatters it. Each row of a route carries both winds, so a
lesson can show the difference.

**Beating and running come from the polar file's own optimum rows.** The
generic 70 ft table runs from 52 to 150 degrees, and a boat that could not
sail closer than 52 could not beat. The file's `beat_angle`/`beat_vmg` and
`run_angle`/`run_vmg` rows say where the best angles are and what they make
good, so `sail()` answers out to those angles with a straight line between two
speeds that are both in the file - and still refuses anything closer to the
wind or deeper than that. Nothing is invented; a row says whether its speed
came from the table or from an optimum row.

**A node with no data is left out, not counted as nothing.** A tidal atlas has
dry nodes along every coast. Averaging one in as zero would halve the stream
exactly where it runs hardest, off the headlands, so the nodes that have data
carry the whole weight and a value is missing only when none of the four has
one.

**No wind stops a step; no stream does not.** Off the atlas the boat still
sails, through still water, and the row is marked so a route can report how
much of it was sailed on no information. Tried against the real 2025 grids:
the atlas has **no stream data at the start line in the Solent**, so the first
miles of that race will be reported as sailed in still water - which the
Solent is not.

**What it affects.** Nothing that exists yet reads these functions; the
vector step and the polar table lookup are unchanged, and their checks pass as
before.

## A sample pack, so the empty machine can be seen working

**What.** drill ships `sample.drillpack.json` beside the app and a **Try the
sample pack** button on the empty screen. Four sections, twenty-five
questions and a pass mark, all about the tool itself. Build 26.

**Why.** The tool's first screen was an argument and a file picker. Anybody
without a pack already written saw a machine with nothing in it and no way to
find out what loading one does - which is the wrong first impression of a
tool whose whole claim is that the material is yours and the machine is
published. Now there is something to press.

**One way in.** The sample is fetched and then handed to the same
`validate()` and the same store as a pack picked off the device; the loader
was split into `installPack(text)` with the picker and the sample both
calling it. A demonstration path of its own would be a second route to get
wrong, and it would stop proving that the pack format works.

**Offline too.** `sample.drillpack.json` is in the worker's precache, so the
button works with the antenna down. That is not an exception to the rule that
the pack is never cached: the user's pack lives in IndexedDB and is never
cached, and this one is a published file of the app, like the stylesheet.

**Verified** by driving the real app: the button loads the pack, all four
sections pass at 100 per cent and unlock in order, the ordering question
marks correctly, and with the network switched off after one visit the button
still loads it.

## A figure has to fit on a page

**What.** `docs/manual-src/style.css` caps a figure's height as well as its
width, and the eight screenshots that were taller than a page are cropped to
the part their caption is about. Every manual is rebuilt.

**The fault, found by Larry in the printed deck-log manual.** `figure img`
set `width: 100%` and nothing else, so a tall screenshot was scaled to the
column width and kept whatever height that gave it. A figure taller than the
paper was then pushed to a page of its own, did not fit that either, and
printed over the footer - while the page it was pushed off came out nearly
empty. Three of deck-log's fourteen pages were half blank and one figure was
cut off mid-record.

**Why the cap works.** An image is a replaced element: given both a
`max-width` and a `max-height` it scales to satisfy both and keeps its shape.
Cropping as well keeps the figure legible, because a 1,500-pixel screenshot
squeezed into 20 cm of page is not readable whatever else is true of it.

**One figure was simply wrong,** and that is worth saying plainly: the
launcher page was captured from a copy of the site that did not include
`launcher.js`, so the six tiles - the whole subject of the picture - were
never drawn. It is recaptured, and the tiles are in it.

**What it impacts.** Every manual's layout, nothing else; no tool's code is
touched. deck-log drops from 14 pages to 11 and tides from 20 to 13, because
the half-empty pages are gone.

## Every tool has a manual now

**What.** deck-log, weather, drill and the launcher each gain a manual and a
quick-reference card, built by `sh docs/manual-src/mkpdf.sh <tool>` like the
others, with eleven more figures from the browser builds in day mode. With
celnav, tides and colregs already done, that is the whole suite.

**Why it is worth the pages.** Documentation is part of the product, and for a
new reader most of it. These are printed and read away from the computer, which
is also why every page carries the tool's version and the build date.

**drill's manual carries the content-pack format,** which is what
navigationtools asked for on behalf of practical-navigator, shipshape and
clipper-drill: every field, which are required, what makes a question graded
rather than a recall prompt, how sections unlock, and every reason a pack is
refused - taken from the validator itself rather than described from memory.

**Three changes to `mkpdf.sh`, each for a tool that is not shaped like the
others:**

1. It looks for a version in `src/<tool>/10-head.sh`, in
   `src/<tool-without-hyphens>/` (deck-log's source is `src/decklog`), in
   `src/launcher/<tool>.sh`, and finally in a browser-only tool's own build
   number.
2. A document may only claim a checksum it was given: a tool with a program
   still refuses to build without one, and a browser-only tool whose document
   asks for none builds without it.
3. The new rows. Adding a tool is still one line.

**And the tides manual has its figures at last.** It has been ending with a
note explaining that its figures were waiting on a day mode for the browser
apps, because the screens were near-black and would not print. Day mode went
in, so the note was describing a state of affairs that no longer existed.
Five figures now: a day at a reference station, the station picker, the rule
of twelfths worked out, the course-to-steer triangle, and the About screen
saying what is actually cached. The note is gone.

**What it impacts.** Documents only - no tool's code is touched. `tests/gate.sh`
check 4 now governs seven documents instead of three, and fails if a source
committed after a PDF has changed.

## colregs has a manual, and its reference lists count themselves

**What.** `docs/colregs-manual.pdf` and `docs/colregs-quickref.pdf`: the
sections, the drill, contact management, the spoken bearing styles and the
cautions, with eight figures taken from the browser build in day mode. The
manual is the first of the five that were waiting on a day mode to print.

**Why now.** Every screen in the suite was near-black until day mode went in,
so a figure would have printed as a black rectangle. That is what the tides
manual's closing note was waiting for, and it is no longer true.

**A fault the figures found.** The lights view's reference list was headed
"All twenty, as a list" and rendered twenty-eight. The data is generated from
the shell engine and grows when that engine does; the words in `index.html`
could not follow it. All three lists now label themselves from the data they
are about to render, so the count cannot be wrong again - the same rule that
took the build labels out of the pages.

**What it impacts.** The summary text of the three reference lists, nothing
else; no drill, no drawing and no data. colregs' cache moves to
`colregs-v21`, because `colregs.js` and `index.html` are served files and the
worker is cache-first.

## Lesson names: the course's links have a shape, and tides enforces it

**What.** `?lesson=` on the tides work calculators now takes the lesson names
Larry settled on 11 November 2026 - `l1-3` for Level 1, which both race years
share, and `l3-2025-4` for Levels 2 to 5, which run one track per year. The
old `a6-2` form is refused. The page the link goes to is **derived** from the
name by removing its lesson number, so `l3-2025-4` leads to
`l3-2025.html#l3-2025-4`.

**Why.** The course needs a name it can put in a link before it can build its
lesson pages (its items P4, P5 and P6 and the draft page's final address), and
the old form had no room for the race year: 2027, and later the Fastnet and
Clipper material, would have needed invented letters. A name now says which
race it belongs to when read on its own.

**Why the page is derived rather than looked up.** A table of names to pages
is a second copy of the same fact and drifts the first time a page is renamed.
Removing the trailing number leaves the track - a level, or a level and its
year - which is the page. This is README rule 8: derive one from the other
where you can.

**Stricter than proposed, on purpose.** practical-navigator proposed
`^l[1-5](-20[0-9]{2})?-[0-9]+$`. tides refuses a year on Level 1
(`l1-2025-3`), requires one on Levels 2 to 5 (`l3-4`), and refuses a leading
zero or a zero lesson (`l1-03`, `l1-0`). Each would otherwise give one lesson
two names, which is the very thing putting the year in the name was for.

**What it impacts.** Only the back link. No calculator, working line or figure
reads `lesson`, so a course page still carrying an old name loses its "Back to
the lesson" button and nothing else. The contract is in
`docs/web/tides/WORK.md`; 27 names are held against it in
`docs/web/tests/tides-work.js`, five built and twenty-two refused. tides'
cache moves to `tides-v9`, because `work.js` and `tides.js` are served files
and a cache-first worker serves the old ones until the cache name changes.

## A day mode, and a mode control you cannot trip over

**What.** All seven browser pages — the launcher and the six tools — gain a
**day** palette, and the two-state toggle becomes **three labelled buttons**:
DAY, DARK, NIGHT, with the current one shown selected. **night is now the
default.**

**Why.** Documentation figures have to come from the browser build, and every
screen in the suite was near-black, so no figure would print. The second
reason is better: the suite has always thought about dark adaptation and had
nothing at all for bright sun on a white deck.

**The safety design, which is the point of the control.**

1. **night is the default.** A tool opened on deck in the dark must not start
   bright. A bright panel costs a dark-adapted eye about twenty minutes.
2. **Three buttons, not a cycle.** A cycle can land you on DAY from NIGHT with
   one stray press, and it can only tell you what the *next* press does, never
   where you are.
3. **night to day takes a deliberate half-second hold**, filling in the
   current mode's colour, releasing early cancels, and nothing bright appears
   until it completes. That is the only guarded transition: going darker is
   never harmful.
4. **Selected is never a filled bright patch** — in night mode that would be a
   small lamp in the corner of a dark-adapted screen.
5. A browser `confirm()` was considered for the guard and rejected: it renders
   white on iOS, so the guard against a white flash would have been one.

**The palette was measured, not chosen.** The dark accents are unusable on
white — the blue scores 2.3:1 and the green 2.0:1. Darkened, every one clears
4.6:1, and the worst contrast anywhere on a page is 5.8:1.

**Two findings worth keeping.**

1. **Recessive tokens invert.** `--none`, `--carry`, `--locked`, `--unseen`
   and `--persist` mean *less important*. On a dark ground that is darker; on
   a white one it is **lighter**. Left to a contrast rule they came out at
   9.9:1 — "not studied yet" rendered as strongly as body text. Their ordering
   is preserved, inverted, all still above 4.6:1.
2. **Sunlight beats every palette.** Glare lands on the ink and the paper
   alike, so contrast collapses together: about 10:1 indoors, 6:1 overcast,
   3.5:1 bright, 2.3:1 in full sun — and pure black on pure white measures the
   same 2.3:1 there. The manual says so, and says what does work: screen
   brightness, shade, then day mode. A different shade of white changes the
   contrast by under 4%, which is below what an eye can see.

**What it impacts.**

1. **One storage name, `visual-mode`,** replacing five (`bashnav-mode`,
   `colregs.mode`, `tides-mode`, `decklog-mode`, `weather-mode`,
   `drill-mode`). A mode set in one tool is the mode in the next, and in the
   course pages that embed them. Anyone who had set a mode gets the default
   once.
2. **The modes are a list, not a branch.** A fourth palette — a high-contrast
   day, say — is one array entry and one stylesheet block, touching no logic.
3. **Two surfaces stay black in every mode, day included:** the terminal
   blocks and colregs' lights stage. A terminal is black and navigation lights
   are seen against a night sky.
4. **The button styling is `.modes .mb`, not `.mb`.** Four apps style their
   header with `.bar button`, which is more specific and would otherwise win
   on background, padding and radius.
5. **Documented once, not six times.** `docs/manual-src/common-display-modes.md`
   is included by each manual through a new `{{INCLUDE:}}` in the generator; a
   named file that does not exist is a loud failure.
6. **The shell keeps its own names** — `day|night|plain`, where its `day` is
   this build's `dark`. Deliberate, and recorded in `docs/ARCHITECTURE.md`
   with the reasoning, because it looks like an oversight.

**Verified by driving all seven pages**: night on a first visit, exactly one
button selected, DARK and DAY immediate where they should be, a quick tap on
DAY from night doing nothing, a hold released at 200 ms cancelling, a 650 ms
hold reaching day, the choice stored and surviving a reload, and the browser
chrome following the palette. Two faults were caught that way and by nothing
else: five orphaned click handlers left behind on a button that no longer
exists — every file still parsed — and a stylesheet left with an unclosed
`@media` block.

## The camera sight is documented, including the errors large enough to matter

**What.** `manual.md` gains **section 13, The camera sight** — the browser
build's measurement of an altitude from a photograph — and `quickref.md` gains
a deck-side summary of it. Both rebuilt: the manual is 19 pages, the card 6.

**Why.** The feature had no documentation at all. Nothing in the manual
mentioned it, and it is the most consequential thing in `celnav`: an instrument
whose errors are measured in tens of miles if it is used without calibration.
Documentation is part of the product, and to someone meeting the tool for the
first time it is most of it.

**What the section says, all of it taken from the program rather than
described from the outside.**

1. **The measurement.** The horizon is a plane through the camera centre, so
   its normal `n` and the body's ray `b` give `Hs = asin(b . n)`. Exact
   anywhere in the frame, and camera roll cancels — which is the property that
   makes a sextant a differential instrument. The tempting `atan(y/f)` is right
   only on the frame's centre line. `Hs` then goes through the same
   corrections chain as a real sight, so the working is still checkable by
   hand.
2. **Calibration is not optional, and one star pair cannot do it.** Barrel
   distortion at `k1 = -0.05` costs up to **44 arcminutes — forty-four miles**
   — and at a single radius "longer lens" and "more barrel" are the same
   measurement. A field of stars at different radii is what breaks the
   degeneracy.
3. **Calibration needs no time and no position,** because the angle between
   two stars is a property of the sky and precession is a rigid rotation.
   Refraction is the exception, so it says to calibrate high up.
4. **Where it refuses,** in a table: three stars minimum, a residual above
   3 arcminutes rejected, a warning when every star sits at a similar radius,
   and physical bounds that exist because the search once reached `k1 = +1.4`
   and a 28 % focal-length error without distress.
5. **Why there is a tap-then-refine step.** One pixel is **1.18 arcminutes,
   1.2 miles**, and a fingertip covers about forty. Dragging alone cannot beat
   tens of miles; an automatic edge-finder alone cannot be corrected when haze
   or a wake fools it.
6. **Digital zoom gets its own warning,** because a zoomed frame is a crop
   upscaled and a wrong plate scale produces a confident sight in the wrong
   place.
7. **The five steps as the screen labels them** — Photograph, Horizon, Body,
   Sight, Plot — and the two cautions it already gives: a second body at least
   40 degrees away in azimuth, and parallel lines are not a fix.

**What it impacts.**

1. **The section says plainly that it describes the browser build,** and
   section 1 now points to it. Sections 2 to 12 document the shell program,
   which has no camera. That split is worth a decision of its own: the manual
   is still shaped around the shell tool while the browser build is what gets
   used.
2. **A code comment is now one step behind the page.** `camui.js` describes
   four numbered steps; `index.html` has five, the fifth being Plot. The
   documentation follows the page.
3. **The card is 6 pages and that is deliberate.** Larry's instruction: do not
   trim to a page limit, document what is actually there. The release
   checklist's "one page" line needs changing at its owner, not working around
   here.
4. **Verified by counting, not by trusting the build.** The footer must appear
   on as many pages as the document has: 19 of 19, and 6 of 6.

## The documents now take their version from the program, not from a typist

**What.** `docs/manual-src/mkpdf.sh` rebuilt: it takes a tool name, reads that
tool's version from `src/<tool>/10-head.sh`, fills the document's placeholders
from the built program, and puts the version and build date in a footer on
every page. `README.md` gains a **Release documents** section listing what each
tool owes, under `spec/contracts/release_checklist.md`.

**Why.** The manual said **Version 1.1** while `celnav` was **1.6**, and it
printed two numbers for the reader to check their copy against:

| | |
|---|---|
| the manual said | `4175943417 142889 celnav`, "about 140 kB" |
| the program is | `1147339436 263990 celnav`, 257 kB |

A navigator following those lines would conclude a sound copy was corrupt.
Bumping the version by hand was not the fix, because a hand-typed number is
what went stale. `manual.md` now carries `{{VERSION}}`, `{{SIZE_KB}}` and
`{{CKSUM}}`, and the generator fills them from `bin/<tool>` — and refuses to
build at all if that program is missing, rather than describing a guess.

**What it impacts.**

1. **Two engine faults found by checking the output instead of the exit code.**
   1. `wkhtmltopdf` built against unpatched Qt **ignores every `--footer-*`
      switch**, warns, and exits 0. The document comes out undated and the run
      looks successful.
   2. A `position: fixed` footer does not repeat either: it landed on 1 page
      of 11.
   3. So `weasyprint` is now preferred, and the check is a count — the footer
      must appear on as many pages as the document has. 16 of 16, and 5 of 5.
2. **The engine is chosen at run time** from weasyprint, wkhtmltopdf, then
   pandoc with xelatex, and if none is present the script says which to install
   and stops. This matters because the generator could not run on the Mac that
   owns this repository at all: none of the three was installed there, so
   "generated from the source" was true only on another machine.
3. **Adding a tool's manual is one line** in `DOCS`, not a forked script.
4. **The PDFs are smaller** — 3.26 MB to 1.54 MB for the manual — because the
   new engine compresses the figures better. Same figures, same text.

**Still owed, and written down rather than quietly left.** `colregs`, `tides`,
`deck-log`, `weather` and the launcher have no manual or card. Larry's rule of
9 November: touching a tool triggers writing its manual, so they come with the
next work that goes into them rather than as a backlog.

## The polar, and the three things it refuses to guess

**What.** `docs/web/route/polar.js` — reads a boat's polar in the
Expedition-style table the course uses, and interpolates bilinearly between
its points. `docs/web/tests/polar.js`, 38 checks.

**Why the refusals are the design.** A polar that invents a speed closer to
the wind than its table goes will send a router beating to windward in a
straight line. The route then arrives hours early on paper and is wrong in a
way that looks like skill, which is the worst kind of wrong a routing program
can be.

1. **Outside the angles, the answer is `null` — no data — and not zero.** The
   two are different instructions to a router: zero means "you cannot go that
   way", `null` means "this table does not say". Upwind and downwind work
   belongs to the optimum VMG angles, which the generator writes into the file
   as comments and which this reads when they are there.
2. **Above the strongest wind in the table it clamps, and says it clamped.** A
   polar extrapolated into a gale is a boat doing fifteen knots under full
   main in forty knots of wind. The flag travels with the answer so a route
   can report that it was carrying a number from a different wind.
3. **Below the lightest wind it runs to zero at zero wind**, which is the one
   extrapolation that is physically honest.

**What it impacts.**

1. **The optimum angles are read from comment lines**, and their absence is
   not an error. They are comments in the course's file on purpose — a reader
   that does not know about them still reads the table — so they are optional
   here too.
2. **Bilinear, not splined.** The error between gridded points is far smaller
   than the error in the wind field the router is given, and a spline through
   a coarse table invents inflections nobody measured.
3. **The polar is symmetric about the wind**, so −90°, 90° and 270° are one
   question.
4. **Checked against the course's real generic-70 table as well as the toy
   one in the suite**: grid points come back exactly, and the table's own beat
   angles (38–44°) sit *closer to the wind than its first row at 52°* — which
   is precisely why the reader must not interpolate down there.

## The router's vector step, and a boat held by the tide that was given a course

**What.** `docs/web/route/route.js` — `vec()` (the boat's vector through the
water plus the water's over the ground), `advance()` (the position after one
step), and `consistent()` (the invariant both must satisfy).
`docs/web/tests/route-vector.js` checks all three: by hand, over 20,736
generated cases, and for determinism.

**Why this first.** An isochrone router draws a plausible-looking track from
almost any arithmetic, which makes it one of the hardest kinds of program to
tell is wrong. So it is built from the bottom, each layer verified while it is
still small enough to check on paper: the vector step, then the polar lookup,
then one leg at one time step, then isochrones — which by then is bookkeeping
over parts that are already known good.

**Everything above inherits the sign conventions set here**, so they are
stated once in the file: bearings true and clockwise from north, speeds in
knots, and **set is the direction the current flows towards** — wind is named
for where it comes from and current for where it goes to, and in a router the
two live three lines apart.

**What it impacts.**

1. **A boat held exactly by the stream now has no course, and the first
   version gave it one.** Five knots on 090 against five knots setting 270 is
   a real situation, not a contrived one. The east components cancel exactly,
   but `cos(90°)` is 6.1e-17 rather than zero, so a residue of about 6e-16
   knots remained — and `atan2` resolved it into a confident course of 180 for
   a boat that was not moving. The test is now a tolerance rather than
   `=== 0`, and anything below a billionth of a knot is not a speed.
2. **The invariant is the part that will keep earning.** Over every heading at
   5°, every set at 15° and a range of speeds, the reported track must *be*
   the sum of the two vectors. It needs no oracle, and it catches sign errors,
   unit mixups and a stale current lookup without anyone knowing what the
   right answer was. It is exported, so the router will run it over every row
   of every route.
3. **And the check itself is checked**: a deliberately wrong course and a
   deliberately wrong speed must both be caught, or the invariant is
   decoration.
4. **The departure is taken at the middle latitude of the step**, not the
   start. At 50° over ten minutes that is nothing; at 70° over an hour it is
   not, and it costs one line.
5. **At the pole it refuses to invent a longitude** rather than dividing by a
   cosine near zero and returning a position several thousand degrees east.

## GRID 1: the format the router reads, written before the router

**What.** `docs/web/route/GRID.md` and `docs/web/route/grid.js` — a plain-text
format for wind and current grids, and a reader that refuses anything outside
it. `docs/web/tests/grid.js` checks 43 cases, most of them malformed files
paired with the sentence each must be refused with.

**Why first.** Two converters write this format — GRIB to wind, the Shom atlas
to current, both in the course's repository — and the router reads it. The
weather app may read it later. **A format defined inside its first consumer
becomes whatever that consumer happens to do**, so it is defined on its own,
and it is the smallest piece of the router with the most depending on it.

**Why strict.** A bad grid does not become an error. It becomes a *route* — a
boat sailing through a gap in the wind, or an hour of stream applied to the
wrong hour. A grid that is wrong in a way nothing notices is worse than one
that will not load, because the router will draw a perfectly convincing track
from it.

**What it impacts.**

1. **The row count is checked twice**, against two independent things: `rows`
   against `times × lat × lon` from the grid description, and `rows` against
   the number of data rows on disk. The second catches a truncated file, which
   is the failure that actually happens to a text file. Same reasoning as the
   NT1 check code: the realistic fault is mechanical, not malicious.
2. **One unit, one sign convention, one index order**, each written in the
   file and not only in the document. A format that takes knots and metres per
   second is one where half the files are in the other and nothing says which.
   Half the bugs in this class of code are a sign.
3. **Spans must be a whole number of steps.** Quarter-degree steps over two
   degrees must give 8, not 7.999999999999999 — rounded, then checked against
   the rounding, and refused rather than silently truncated.
4. **`-` means no data, and does not read back as zero.** A gap over land that
   arrives as a calm is a route through it.
5. **The reader never throws.** A bad grid is a result with one sentence and a
   line number: a reader that throws inside a router is a route that
   disappears rather than a grid that is wrong.
6. **The test file's own builder had the bug it was written to catch.** Its
   defaults used `o.x || default`, which swallows an empty string, so the "no
   times" case quietly tested the default instead — a check that passed by not
   running. Fixed, and recorded here because it is the second time this week a
   check has looked like it was working.

## The suite could wait for a keypress, and hid the line that said so

**What.** `tests/run-tests.sh` closes standard input for the whole suite
(`exec </dev/null`) and again inside `guard()`; `tests/ios-home.sh` closes it
on its own `tides find` step; and the four `head -8/-10/-12 "$GUARD_OUT"`
calls become `gshow`, which prints the **end** of a failed check's output.

**Why.** Found by the practical-navigator session while applying the tides
calculators, and neither fault was in that patch.

1. **A check waited for a person.** `guard()` ran each check with the suite's
   own standard input, which from a Terminal is the keyboard. `tides find`
   asks *"Number to use it, or return to search again"* and reads a line, so
   `ios-home.sh` sat there until `guard` killed it after 180 seconds and the
   run reported "a tool cannot run on iOS".
2. **The report cut off the explanation.** `ios-home.sh` prints a progress
   line per step; its first ten are ten *version* steps that all passed. The
   step it hung on was line 11, and `guard`'s timeout note is appended last.
   `head -10` showed neither.

**What it impacts.**

1. **The run is deterministic again.** One run gave two failures and the next
   gave three, because a shell got through whenever a key happened to be
   pressed. A suite whose answer depends on who ran it is worse than one that
   fails: it teaches you to re-run until green.
2. **`guard` was working.** It caught the hang, timed it and named the check.
   Catching a hang and making it impossible are different jobs, and only the
   first was done.
3. **A failing check is now read from the end**, where whatever stopped it is
   the last thing it managed to say. `gshow` keeps the first three lines for
   context and says how many it elided; short output prints whole.
4. **Verified against the real condition**, with standard input a pipe that
   never speaks: before, `tides find` was still waiting when the test gave up;
   after, `ios-home.sh` finished in 0.4 s and the full suite passed with
   nothing on its input.

## tides 1.2 — the coastal work calculators

**What.** Six calculators in `tides`, in the shell (`tides work <name>
key=value ...`, and menu item 7) and in the browser build (a Coastal work
screen, opened directly by `?work=<name>&...`). Each shows its working step
by step and ends with the answer:

| name | what it works out |
| --- | --- |
| `twelfths` | height at a time by the rule of twelfths and by the cosine method, with the hourly table and the difference; from a station it takes the turns from the prediction and adds the harmonic height — three answers side by side |
| `secondary` | a secondary port's HW and LW from its standard port: time differences interpolated round the 12-hour circle, height differences between neaps and springs, extrapolation flagged |
| `stream` | a stream rate between the atlas's neap and spring figures, by the day's range; extrapolation flagged |
| `atlas` | which page of the tidal stream atlas you are on (hours from the nearest HW, ±30 min rounding stated), the range of the tide you are in, and where it sits between mean neaps and springs |
| `cts` | course to steer across one or more hours of stream, solved once on the summed stream as taught; leeway into the wind; true, magnetic and compass; SOG and time for the leg; "cannot make good this track" when the stream wins |
| `setdrift` | set and drift from a DR and a fix, by plane sailing at the mean latitude |

**Why.** The daily navigational question underway is what the water is doing
to you and what to steer for it — the set-and-drift and atlas-page design
`REPO-STATE.md` has carried since August. And a coastal navigation course is
being written that teaches these methods and wants a working tool beside each
lesson; it links into the browser build with fixed URL parameters, so those
names are now a contract, written down in `docs/web/tides/WORK.md`, and every
result carries a link back to the lesson when the URL names one.

**How it is built, and why that way.**

1. **One set of arithmetic.** The calculators are `src/tides/work.awk`,
   packed into the tides engine payload after `engine.awk`. Its dispatch is
   its own `BEGIN` block, so `engine.awk` still loads on its own — mawk
   resolves every call at parse time.
2. **The vector helpers are lifted from `src/colregs/contacts.awk`** — the
   bearing of a vector and the signed angle, the tracking party's tools —
   and copied rather than shared, because contacts.awk calls colregs'
   engine and cannot be loaded into tides.
3. **The browser prints the same lines.** `docs/web/tides/work.js` is a port
   whose working is the awk's, character for character, including printf's
   round-half-even on exact ties (a 1.50 m range gives twelfths of
   0.125 m). Where the shell draws a character figure the page draws SVG
   from the same numbers.
4. **The working shows bearings to a tenth and the answer the whole degree
   you steer**, so a lesson's 246.3° is visible in the working and the
   helm gets 246.

**What it impacts.**

1. `tides` goes to **1.2**; its engine file is `engine-1.2.awk`.
2. The browser worker goes to **`tides-v5`** and the page to **build 5**,
   with `work.js` precached, so installed copies pick it up.
3. **The offline panel now uses the worker's current cache.** It had named
   `tides-v1` by hand, which the worker deletes as an old member of its own
   family when it updates, so "Save everything for offline use" saved into a
   cache the next update threw away. The name is now derived from `BUILD`.
4. **The tides page harness waits for the station it chose.** It waited for
   any prediction, so on a fast machine the previous station's answer was
   sometimes compared and the terminal-picture check failed on a race. It
   also writes its screenshots to a temporary folder now, not the
   repository root.
5. Tests: `tests/tides-work-check.awk` holds 60 worked cases to values from
   `tests/tides-work-ref.py`, an independent Python working; `run-tests.sh`
   runs every help example through the real tool and checks `WORK.md` still
   carries each; `docs/web/tests/tides-work.js` compares the port with the
   awk and reads every figure back; `tides-ui.js` opens the calculators by
   URL and compares what the page shows.
6. **`COURSE_BASE` is `https://bashnav.navigationtools.org/practical-navigator/coastal/`.**
   The first build of this patch carried `https://navigationtools.org/coastal/`,
   written before the course moved onto this origin under its settled name.
   It was corrected before the patch was applied, so the stale address never
   enters the history. Impact: every *Back to the lesson* link lands on the
   course where it now lives, on the same origin, so inside one installed
   icon it stays in the app rather than opening the browser panel. The
   lesson pattern `^[a-c][0-9]-[0-9]+$` is unchanged; the course's new level
   structure may need it widened later, which will be its own change.
7. `bin/tides` and `release/bashnav-ipad.sh` are rebuilt.

## A scope probe: can one icon hold the course and tides, offline?

**What.** `docs/web/platform/scope/` — a second probe, with its own manifest
declaring `"scope": "/"`. It reports the display mode, the scope the manifest
actually declared, whether a worker controls the page, the state of a
registration of `/web/tides/sw.js`, which tides cache exists, whether
`stations.dat` is in it, and online/offline. It registers that worker on a
tap, offers two links into tides, and carries the steps to run. Linked from
the window-control probe.

**Why.** The Practical Navigator wants to be one installed icon that works at
sea. A lesson linking to `/web/tides/` is the problem: on iPadOS a link out of
an installed app opens the in-app browser panel, which has its own storage, so
tides can find nothing cached. The proposed fix is a manifest scope wider than
the app's own folder — allowed by the standard when `start_url` is inside it
— plus registering tides' worker from the course page so tides precaches
itself into *this* app's storage. None of that is worth building on until it
is seen to work on Larry's iPad.

**What it impacts.**

1. **The tides cache is found by prefix, never by a version written here.**
   The request named `tides-v5`; a constant in this page would be a second
   home for a number that lives in tides' worker, and the first place it would
   go stale. It would then report "no cache" the day tides moved — the wrong
   answer at the worst moment. It matches `tides-` and prints what it found.
2. **`stations.dat` is reported separately from the app being cached**, since
   the 2.9 MB station file is fetched on demand rather than precached. In a
   local run the app cached and the station file did not, which is exactly the
   gap the course asked about.
3. **It does not use `navigator.serviceWorker.ready`.** That resolves when a
   worker controls *this* page, and the one being registered is scoped to
   `/web/tides/`, which this page is not inside — so it never resolves. The
   first version sat on it reporting "not registered" while the registration
   had succeeded, which is a probe lying about the one thing it exists to
   measure. It polls the registration instead and refreshes while waiting.
4. **Reads are numbered**, so one finishing after a newer one started throws
   its results away. Without that the summary showed every row twice, on the
   one screen the test asks to be photographed.
5. **Nothing here is precached, deliberately.** Same as the window-control
   probe: a cached probe is a lying probe.
6. **No check of ours refuses a wide manifest scope** — there is no manifest
   check at all — so nothing needs relaxing for this page or for the course.

## Sea temperature gets its own band, because water freezes before air does

**What.** `implausible()` gave `airt`, `seat` and `dewp` one shared band of
−60 to +60 °C. `seat` now has its own: **−2 to +40 °C**, with its own message
below the floor — *"sea water freezes near −1.9"*. Changed in
`src/decklog/screens.awk`, which is the reference, and in the browser port
`docs/web/deck-log/views.js`; `bin/` and the iPad bundle are rebuilt, and
deck-log's cache and build move to 4.

**Why.** A WG Log test code carried `seat=-17.8`. That is 0 °F — a screen that
opened on zero and was pressed through — and sea water freezes at about
−1.9 °C, so no sea anywhere has ever been that cold. The log accepted it
without a word, because the band it was checked against was written for air.

**Two mistakes had to line up** for a 0 °F sea to reach a record: the watch
offering the value, and the log taking it. WeatherGlass is fixing the first.
This is the second, and it is the one that matters more, because a log that
accepts an impossible reading will accept the next one too, from a source
nobody is fixing.

**What it impacts.**

1. **−2 rather than −1.9**, to leave room for brackish water, which freezes
   nearer 0 and can be measured a shade under. The ceiling, 40, is above the
   warmest sea recorded.
2. **`airt` and `dewp` are unchanged.** Air at −40 is a real reading in the
   Southern Ocean; the shared band was right for them all along.
3. **The message names the physics**, so the reason is on the screen at the
   moment of the mistake rather than in a file nobody reads at sea.
4. **The awk and the browser are diffed over the whole numeric range** by the
   suite — 23,430 comparisons under three awks — so the two cannot drift.
5. **Found by decoding a photograph of the watch**, not by review. The value
   arrived in a QR code, was read by the decoder added this week, and looked
   wrong to a human. None of the checks had anything to say about it.

## A threshold fallback, and the score corrected to 13 of 14

**What.** `docs/web/shared/qr.js` now tries an Otsu-thresholded copy of each
frame when the plain one fails at that rung, and reports which it was
(`500px threshold`). The claim that one photograph "reads under nothing" is
corrected wherever it appears.

**Why.** The WeatherGlass session decoded all fourteen photographs with
zxing-cpp and wrote the text beside them. Two things came out of comparing
that with ours.

1. **The thirteen we read agree byte for byte** — two independent decoders,
   the same 205 to 271 characters each time. That is much better evidence than
   either alone, and it is the kind of check a port can almost never get.
2. **The fourteenth is jsQR's limit, not the photograph's.** It will not read
   here cropped, sharpened or thresholded, at any scale tried; zxing-cpp reads
   it. The earlier wording was true of the decoders to hand and false in
   general, so it is corrected rather than left standing.

**What it impacts.**

1. **The threshold fallback is a real gain, measured not assumed.** Of the
   thirteen photographs that read, **eight needed it** at the rung that
   worked: the plain frame failed and the thresholded one succeeded. One of
   the two committed fixtures now reads a rung earlier because of it.
2. **It is global where jsQR's own is local**, which is why it is worth trying
   second rather than instead. A watch face is a small bright disc in a dark
   cabin — the case a global threshold handles well and a local one can be
   confused by.
3. **It costs a millisecond or two**, on an image already reduced to a few
   hundred pixels square.
4. **The legacy WG Log format is now written down** in the inbox note, and the
   deck-log reader will have to accept it alongside contract 4.6: `sog` before
   `cog`, `swdir` inside `nav`, `pchg` before `ptend`, calm as `wdir=-|wspd=0`,
   and an observation that can span two codes.

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
6. **One photograph does not read.** *(Corrected after the WeatherGlass
   session decoded all fourteen with zxing-cpp: the limit on that frame is
   jsQR's, not the photograph's. The original wording here said it read under
   nothing, which was true of the decoders tried at the time and not true in
   general.)*

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
