# The router — how a route is found

`docs/web/route/router.js`, with `route.js` and `polar.js` under it. It reads
the files described in `GRID.md` and `COURSE.md` and answers one question:

> With this boat, this wind and this stream, starting at this time, what is
> the earliest she could finish, and by what track?

**It is not a tactician.** It knows nothing of other boats, of sail changes, of
a crew that has been up all night, or of the difference between a wind
forecast and a wind. What it gives is a *bound* and a *shape*: no boat with
that polar could have done better in that weather, and this is where the
fastest water was.

## Built from the bottom, in four layers

An isochrone router draws a plausible track from almost any arithmetic, which
makes it one of the hardest kinds of program to tell is wrong. So each layer
was finished and checked while it was still small enough to check by hand.

| | layer | what it does | its check |
|---|---|---|---|
| 1 | `ROUTE.vec`, `advance` | the boat's vector plus the stream's; the position after it | `route-vector.js` |
| 2 | `POLAR.speed`, `sail` | the boat's speed at an angle and a wind speed | `polar.js` |
| 3 | `ROUTE.step` | one time step, from the grids and the polar | `route-step.js` |
| 4 | `ROUTER.run` | every heading from everywhere she could be, until one finishes | `router.js` |

## One step

```
                 wind over the ground, 12 kt from the west
      ------------------------------------------------>
      --------->  the stream, 2 kt, going the same way

      ---------------------------------------->
                 wind over the WATER, 10 kt:  the boat's wind
```

**The boat sails in the wind over the water.** A polar is measured through the
water, so it is entered with the ground wind less the stream. With the stream
running *against* the wind the two add, which is why wind against tide is
windier as well as rougher. Every row of a route carries both winds.

The polar then gives her speed through the water at her angle to that wind;
the stream is added to it; and she is moved over the ground for the length of
the step. The conditions are those at the start of the step, held for the
whole of it.

**Beating and running come from the polar file's own optimum rows.** A table
that starts at 52 degrees says nothing about 45, and a boat that could not sail
closer than that could not beat. The file's `beat_angle` and `beat_vmg` rows
say where the best upwind angle is and what it makes good, so `POLAR.sail`
answers out to that angle and no further; the same deep downwind, where the
boat gybes rather than runs square. Nothing is invented: every speed lies
between two numbers that are in the file.

## The search

```
        the fan: every 5 degrees, plus the best           the water, cut into
        beat and run angle on each tack                   half-mile squares

                 \  |  /                                  +----+----+----+
                  \ | /                                   |    | 2nd|    |
              ----- o -----   <- where she is             +----+----+----+
                  / | \                                   | 1st|    |    |
                 /  |  \                                  +----+----+----+
                                                          of two ways into one
     (headings the polar cannot                           square, the EARLIER
      answer for are not tried)                           is kept
```

From every place she could be, every heading is tried for one time step. Of all
the ways of reaching a half-mile square on the same tack, only the earliest is
kept; of two that arrive in the same step, the one that has made more ground
along the leg. Then the same again from all the places kept, until a step
crosses the finish line.

**The one assumption in it:** that being somewhere sooner is never worse than
being there later. That is true of a boat that could always stop and wait, and
near enough true of one that cannot. It is what makes the search finish, and
it is the ordinary assumption of an isochrone router, stated here rather than
left to be found.

When a mark or the finish is within a step, one more heading is tried: the one
that lays it exactly. A finish line a tenth of a mile long would otherwise fall
between two headings of the fan.

### What counts as the same place

Two boats in one half-mile square are treated as being in the same place, and
only the earlier is kept. When a tack came to cost something (see "The cost
of a tack") that turned out to need saying more carefully, three times over,
and each time it was a check worked by hand that found it.

```
   the mark                 A can fetch the mark on this tack.
      *                     B, a few lengths to leeward, cannot:
       \                    she must tack twice more.
        \   A
   +-----\--------+         A and B are in the same square, on the
   |      \  B    |         same tack.  B got there first.
   |       \      |
   +---------------+        Keep only B, and the boat that judged
                            her layline is thrown away.
```

1. **Port and starboard are different places.** A boat here on port and a boat
   here on starboard are a tack apart, and each is kept.
2. **So are "can fetch it" and "cannot".** A boat that can sail straight at
   where she is bound, on the tack she is on, is kept apart from one that
   cannot. Before this, a dead beat of twenty miles was sailed with one tack
   and a 37-minute overstand.
3. **Of two boats that arrive together, the one further along the leg is
   kept,** not the one nearer the mark in a straight line. The boat that sails
   five degrees wider for speed is a tenth of a mile outside the other after
   one step: further from the mark, and ahead. Before this, a dead run of
   twenty miles was sailed five degrees too deep all the way and took nine
   minutes longer than its one gybe accounts for.

**These rules are used for every run, with a crew or without.** When tacks are
free the old rule lost little, because the boat it kept could always tack back
for nothing; but it did lose something. The 2025 race with free tacks, first
sailed in 23.70 hours, is now sailed in 23.62. The weather and the boat are the
same. The earlier figure was the search.

### What the search can resolve

A step is ten minutes, and she can only put the helm down at a step. A square
is half a mile. So two runs that differ by a minute or two have not been told
apart, and should not be reported as if they had.

The plainest case is in the 2025 files. The run that must stay a mile off
three headlands finishes 27 seconds *before* the run that may go where it
likes. A restriction cannot make a passage faster, so that is the size of what
the search cannot see, in a passage of nearly a day.

So "no boat with this polar could have done better in this weather" is true
to within a few minutes, and no closer.

## Rounding a mark

```
                            <-- outbound
    .------------------<---------------------
   /
  |   - - - - - - - - x======M   the mark, left to port
   \                  ^
    '------------------>---------------------
                            --> homeward

    x    `round` from the mark
    ==   nearer than that: not sailed
    - -  the line she must cross, here or further out
```

The racing rule is a string: drawn taut along the track, it must pass each mark
on the required side. The router lays a line out from the mark through the
middle of the turn, and she has rounded it when she crosses that line going the
right way round — anticlockwise to leave it to port, clockwise for starboard.
A track that cuts inside never crosses the line; one that passes on the wrong
hand crosses it backwards and is refused.

**`round` is a berth** (Larry, 13 November 2026): she crosses that line at
least `round` miles out and passes no nearer at any time. The fastest route
passes exactly that far off. Boats in the real race do go inside what a prudent
berth would be, and have for years; a run can be given a smaller number to see
what that is worth, and nothing here is advice to do it.

**A mark that is the end of the finish line is rounded by finishing,** and its
side is checked against the way the line is crossed.

## The water she may not cross

| in the files | what the router does |
|---|---|
| a `line` in a live layer | never crosses it, and stays the layer's clearance off it |
| an `area` in a live layer | never enters it; its edges are lines |
| `avoid <name> ... off <nm>` | stays at least that far from the point |
| a layer the run does not name | is not in the water at all |
| the start line, on the first leg | is a wall behind her |

A place on the start line that is already inside a clearance — one end of the
2025 line is a flagstaff ashore — is not a place a boat can start from, and is
left out and counted.

## The cost of a tack

A run may name a crew (`COURSE.md`, CREW 1), and a crew has a cost for a tack
and a cost for a gybe: the time lost, averaged over how well that crew's
manoeuvres come off. A run that names none is sailed with manoeuvres that cost
nothing.

**Every tack costs the crew's average** (Larry, 13 November 2026). The router
does not know which tack will be the blown one, and neither does the crew. A
route that knew would put its bad tacks where they hurt least.

**How the time is spent.** When she goes onto the other tack she first makes
no way through the water for as long as the manoeuvre costs, and then sails.

```
        one step, ten minutes                 the next step
 |---------------------------------|---------------------------------|
   port tack ...........| TACK |.. starboard tack ....................
                        ^      ^
                helm down      she sails again
                        <------>
                    41 s: no way through the water.
                    The stream has her.
```

1. **The stream has her while she tacks.** So a tack in a fair stream costs
   less ground than the same tack in a foul one, as it does afloat.
2. **A manoeuvre longer than what is left of the step is carried into the
   next.** A fifteen-minute disaster begun four minutes before a step ends is
   four minutes, ten, and one.
3. **Nothing is forgiven at a mark or at the finish.** If the stream carries
   her across the line she must cross to round a mark while she has no way on,
   the time not yet served is still owed on the far side of it.
4. **The manoeuvre is a row of its own,** marked `manoeuvre`, with a speed
   through the water of nothing, head to wind in a tack and stern to it in a
   gybe. It belongs to the tack she is going onto, so a board begins where
   the helm went down.

**Tack or gybe is which end of the wind her bow passes through.** She turns
from the old heading to the new by the shorter way. If the direction the wind
comes from lies inside that turn, she tacked; if not, she gybed. Each has its
own line in the crew file.

**She tacks less when it costs more,** and that is the router's doing, not a
setting: fewer, longer boards are a slower way up a beat, and the router takes
them when the tacks saved are worth more than the ground lost.

### The 2025 race, sailed by four crews

The same boat, the same wind and stream, the same course. Only the crew
changes. The crews are the four in `crew_starting_v1.txt`, whose figures are
estimates.

| crew | a tack costs | tacks | given to tacking and gybing | finish, 25 May | behind free tacks |
|---|---|---|---|---|---|
| (tacks free) | nothing | 20 | nothing | 09:37Z | |
| crack | 17 s | 14 | 4 min 34 s | 09:41Z | 4 min |
| able | 41 s | 15 | 11 min 31 s | 09:52Z | 15 min |
| ordinary | 81 s | 13 | 20 min 25 s | 10:11Z | 34 min |
| green | 2 min 39 s | 11 | 34 min 54 s | 10:35Z | 57 min |

Each crew gybed once, after the Eddystone.

**What it shows.** Between the crack crew and the green one there are 54 minutes
in a race of a day. The green crew gives 35 minutes of that to the manoeuvres
themselves. The rest is the price of tacking less: longer boards, further
from where the wind and the stream would have had her.

**What it does not show.** The tack counts do not fall evenly from crew to
crew, and differences of a tack or two, or a minute or two, are inside what
the search can resolve. And these are a generic boat's passages with invented
crews: the shape is the lesson, not the minutes.

## What a route says about itself

Every row is one step: where and when it began, the heading and tack, both
winds, the stream, the speed through the water and over the ground, and where
it ended. The summary adds them up, and says three things a reader should know
before trusting the rest:

| | |
|---|---|
| `noStreamMinutes` | how long she sailed where the atlas has no data, through still water |
| `clampedMinutes` | how long the wind was above the strongest in the polar |
| `optimumMinutes` | how long she was on the polar's beat or run rows rather than its table |
| `tacks`, `gybes` | how many of each she made, counted apart |
| `tackSeconds`, `gybeSeconds` | the time given to each, when the run names a crew |
| `crew` | the crew file, the level, and what a tack and a gybe cost that crew; nothing, when the run names none |

## The passage log

`docs/web/route/passage.js`. The router answers with one row for every step -
144 of them for the 2025 race - which is right for a chart and too much for a
person. The passage log folds those rows into the lines a navigator would have
written in the deck log, and beside each line sets down **what had changed**
since the line before.

```
 rows     10:00 port 280 | 10:10 port 280 | 10:20 port 281 | ...
            \__________ the same tack, on the same leg _________/
                                   |
 boards   13:00  port, heading 280, for 2h20, 22.8 nm
                                   |
            three or more boards of twenty minutes or less
                                   |
 lines    10:00  short-tacking, 10 boards in 1h40
```

**It states facts and never gives a reason** (Larry, 13 November 2026). The
search keeps the earliest arrival out of every heading tried from every place.
It holds no reasons, so a "because" in the log would be invented. The log says
that the wind veered 19 degrees between 22:30 and twenty past midnight, and
that at twenty past midnight she tacked to starboard. Whether the one led to
the other is for the
reader, and the lesson, to say. One of the log's own checks reads every word
the others produced and fails on a reason-word.

**An entry is made at a time, as in a deck log.** It is laid out down the
page, and no line is wider than 80 columns, so it prints and reads on a small
tablet without wrapping where the screen chooses:

```
13:10  tacked to port, heading 282   2h20  23.3 nm                      (1)
         wind 242 at 20 kt (21 over the water)                          (2)
         stream fair 0.3 kt   9.6 kt through the water, 10.0 made good  (3)
         since 11:40: wind freshened 4 kt                               (4)

 (1) what she did, and how long and how far the board was
 (2) the wind as the line begins
 (3) the board as a whole: the stream along her track, and her speeds
 (4) what had changed since the line before
```

**Every change is the difference of two printed numbers.** Each reading is
rounded first and subtracted second, so a reader with the log in front of them
can check "backed 8" by subtraction: 248 at 10:00, 240 at 11:40.

| the log says | when |
|---|---|
| wind veered / backed N degrees | its direction has moved 5 degrees or more, clockwise or anticlockwise |
| wind freshened / eased N kt | its speed has changed by 3 knots or more |
| stream data begins / no stream data from here | the atlas starts, or stops, having data where she is |
| stream has turned, now setting ... | where the stream goes has swung through more than a right angle, and both readings are 0.3 knots or more: near slack water a direction is noise |
| stream fair / foul / slack on this line, ... on the last | the stream along her track is different from the last line's; under a quarter of a knot is slack |
| tacked / gybed | which end of the wind her bow passed through |
| bore away / hardened up N degrees | the same tack on a new heading, 5 degrees or more further from the wind or nearer it |
| short-tacking, N boards | three or more boards together, each of twenty minutes or less |

Fair and foul are about her as much as about the water: a tack can make a
stream foul that has not changed at all. So that line says what it was and
what it is, and not that the stream did it.

The numbers in that table are choices, not physics. They are in one place in
the file, they come back with every log so a page can say what they were, and
a caller can set them.

**What a page gets.** `PASSAGE.log(rows)` returns the lines as data: each has
its kind, its time, its readings, its changes, and the first and last row it
covers, so a page can light the piece of track a line is about.
`PASSAGE.text()` prints them as above.

## Sailing a run

`docs/web/route/sail.js` takes the name of a run file and does the rest.

```
node docs/web/route/sail.js <folder> <run file>
node docs/web/route/sail.js <folder> <run file> --json <file to save>
```

The router is several files that must be called in the right order, and this
is the one place that order is written down:

```
 the run file            read first, because it names everything else
      |
      +--> the course, each areas file, the wind grid, the current
      |    grid, the polar, and the crew file when the run names
      |    one: each by its own reader
      |
 the run is checked against the course and the water it names,
 against the grids, and against its crew file
      |
 ROUTER.run  -->  the rows  -->  PASSAGE.log
      |
 the report:   what was sailed
               what to know before trusting it
               the passage log
```

The report also says what the run asked her to keep off, so that it can be
read without the run file beside it.

**Every refusal names the file.** A run names six files or more, and "rows 18
but 17 found" is no use without knowing which of them it was said about.

**The checks before sailing are the ones that would otherwise route.** A
current handed in as the wind, or a wind from 925 hPa, does not fail: it
sails, wrongly. Both are refused before anything is sailed.

**It adds nothing to the router and takes nothing away.** The route is the
one `ROUTER.run` returns for the same files, row for row, and a check holds it
to that.

| the command ends with | when |
|---|---|
| 0 | the run was sailed; the report is printed |
| 1 | it was refused; the reason is printed, and nothing else |
| 2 | it was not asked properly; it says how to ask |

`--json` saves the summary, the log's lines and every row of the route, each
row with the position at both its ends, which is what a chart needs to draw
the track.

A page reaches the router the same way. `SAIL.sail(read, runName)` is given a
function that returns a file's text by name, so a page hands it what it
fetched and the command hands it a folder.

**This is a beta** (Larry, 13 November 2026). The router is handed to the
course to be tried before it is finished, so that what gets built next is
what the lessons turn out to need. The report says so on its first line,
with the two things most likely to mislead. For a run with no crew: a tack
costs the router nothing, and gates are refused rather than sailed. For a run
with one: every tack costs the crew's average, so no one tack is the bad one,
and gates are refused. With a crew the report also gives what a tack and a
gybe cost on average, what they came to over the passage, and how that crew's
manoeuvres come off.

## The first run: the 2025 Myth of Malham

Sailed on the course's own files — the GFS wind of 00Z on race day, the Shom
stream atlas, the low-water coastline kept a tenth of a mile off, a generic
70 ft polar, and tacks that cost nothing — in about eight seconds.

| | |
|---|---|
| Start, IRC One | 10:00Z, 24 May, towards the outer end of the line |
| The wind | 248 at 16 knots at the start: **a dead beat to the Eddystone** |
| Eddystone, left to port | 01:11Z, after 15 hours and 20 tacks, 0.13 miles off |
| Finish | 09:37Z, 25 May: **23.6 hours**, 263 miles over the ground |
| Nearest a headland | Start Point, at 0.22 miles; Portland Bill at 0.88 |
| Where the atlas is silent | the first 100 minutes, in the Solent |

Checked afterwards by brute force, with none of the router's own bookkeeping:
no step crosses the coastline, the nearest it comes is 0.106 miles against the
0.1 allowed, the traffic scheme is never approached, and the track swings 360
degrees anticlockwise round the lighthouse.

**The real Clipper 68s took about 44 hours.** The difference is the point, not
a fault: this is the fastest a generic 70-footer could go, tacking for nothing,
steered perfectly, in a forecast that came exactly true.

**Staying a mile off the three headlands cost nothing the router can
measure.** The same race with `avoid` lines at St Alban's Head, Portland Bill
and Start Point finishes within the same minute, a difference smaller than the
search itself can resolve.

**How close she passes a headland is not a finding either.** The first time
this race was sailed, before the search was sharpened, the track passed
Portland Bill at 0.21 miles. Now it passes the Bill at 0.88 and comes within
0.22 of Start Point, for a finish about five minutes earlier. Where there is
little to choose between two ways round, the router chooses one, and a small
change chooses the other.

### The same race, as the passage log has it

Every line below is the log's own output from that run, nothing added.

```
-- 24 May 2025, times UTC --
10:00  START  Myth of Malham 2025, IRC One
10:00  short-tacking, 10 boards   1h40  15.4 nm
         wind 248 at 16 kt (16 over the water)
         no stream data   9.2 kt through the water, 9.2 made good
11:40  starboard, heading 205   1h30  15.3 nm
         wind 240 at 16 kt (17 over the water)
         stream fair 0.9 kt   9.4 kt through the water, 10.2 made good
         since 10:00: wind backed 8 degrees; stream data begins
13:10  tacked to port, heading 282   2h20  23.3 nm
         wind 242 at 20 kt (21 over the water)
         stream fair 0.3 kt   9.6 kt through the water, 10.0 made good
         since 11:40: wind freshened 4 kt
15:30  tacked to starboard, heading 200   0h30  4.3 nm
         wind 239 at 19 kt (19 over the water)
         stream foul 0.8 kt   9.5 kt through the water, 8.6 made good
         since 13:10: stream has turned, now setting 007 at 0.7 kt;
           stream foul on this line, fair on the last
16:00  tacked to port, heading 272   3h40  31.9 nm
         wind 237 at 21 kt (19 over the water)
         stream foul 0.9 kt   9.7 kt through the water, 8.7 made good
19:40  tacked to starboard, heading 192   1h00  9.7 nm
         wind 231 at 19 kt (19 over the water)
         stream slack   9.6 kt through the water, 9.7 made good
         since 16:00: wind backed 6 degrees;
           stream slack on this line, foul on the last
20:40  tacked to port, heading 272   0h50  8.2 nm
         wind 234 at 21 kt (21 over the water)
         stream fair 0.3 kt   9.5 kt through the water, 9.8 made good
         since 19:40: stream has turned, now setting 215 at 0.3 kt;
           stream fair on this line, slack on the last
21:30  tacked to starboard, heading 196   0h30  5.2 nm
         wind 235 at 20 kt (21 over the water)
         stream fair 0.9 kt   9.6 kt through the water, 10.5 made good
22:00  tacked to port, heading 275   0h10  1.8 nm
         wind 237 at 22 kt (24 over the water)
         stream fair 1.0 kt   9.6 kt through the water, 10.6 made good
22:10  tacked to starboard, heading 198   0h20  3.7 nm
         wind 238 at 22 kt (24 over the water)
         stream fair 1.5 kt   9.7 kt through the water, 11.2 made good
22:30  tacked to port, heading 289   1h50  19.7 nm
         wind 240 at 23 kt (25 over the water)
         stream fair 1.2 kt   9.6 kt through the water, 10.7 made good
```

And through the night to the finish:

```
-- 25 May 2025, times UTC --
00:20  tacked to starboard, heading 215   0h51  8.6 nm
         wind 259 at 21 kt (21 over the water)
         stream slack   10.1 kt through the water, 10.0 made good
         since 22:30: wind veered 19 degrees;
           stream slack on this line, fair on the last
01:11  ROUNDED Eddystone Lt House  15h11 from the start
01:11  bore away 107 degrees, still starboard, heading 109   2h19  33.0 nm
         wind 261 at 23 kt (22 over the water)
         stream fair 0.8 kt   13.6 kt through the water, 14.3 made good
         since 00:20: stream has turned, now setting 050 at 0.3 kt;
           stream fair on this line, slack on the last
03:30  gybed to port, heading 057   6h07  83.0 nm
         wind 262 at 22 kt (21 over the water)
         stream fair 1.3 kt   12.3 kt through the water, 13.6 made good
09:37  FINISH  23h37 from the start
```

The first line is ten boards in an hour and forty minutes. With tacks that
cost nothing the router has no reason not to, and that is the first item in
the list below. The same race sailed by four crews is under "The cost of a
tack".

## What it does not do yet, and what it assumes

1. **A tack costs nothing unless the run names a crew.** Without one she
   short-tacks the Solent because nothing says she should not. With one,
   every tack costs that crew's average: no one tack is the bad one, and the
   cost is the same in thirty knots as in ten.
2. **No gates.** `avoid` is sailed; `gate ... within` is refused with the
   reason rather than ignored.
3. **A mark that may be left on either hand** is refused likewise.
4. **The polar is the boat.** A generic polar gives a generic boat's passage.
5. **The forecast is taken as the truth,** and the stream atlas as the stream.
6. **She tacks, and gybes, only at a step.** Ten minutes apart, in these
   runs. A layline is therefore judged to within a few minutes, never
   exactly.
7. **A minute or two is not a finding.** See "What the search can resolve".
8. **It is not for navigation.** It is for understanding a race after it was
   sailed, and for asking what a different choice would have cost.

## Running the checks

    node docs/web/tests/route-vector.js     the vector step
    node docs/web/tests/polar.js            the polar
    node docs/web/tests/route-step.js       one step, against hand-worked answers
    node docs/web/tests/router.js           whole routes small enough to sail in your head
    node docs/web/tests/passage.js          the passage log, on rows written by hand
    node docs/web/tests/sail.js             a run sailed from its name, and the refusals
    node docs/web/tests/course.js           the course, areas, run and crew files

Each course in `router.js` is laid on the equator, in a wind and a stream that
do not change, so that the fastest passage is one triangle and can be worked
out: twenty miles on a beam reach at ten knots is two hours, and a dead beat is
the distance over the best speed made good. Eight faults were put into the
router one at a time — marks rounded the wrong way, no berth, clearances
ignored, an area left open, the finish crossed either way, finishing without
rounding, `avoid` dropped, unnamed layers left live — and each is caught.

The cost of a tack is checked the same way. A crew file with one grade makes
every tack cost exactly the figure written, and then a dead beat with a
five-minute tack is the beat and five minutes, with one tack; a dead run is
the run and its one gybe, at the gybe's own cost; two crews that each make one
tack differ by the difference in what it costs. Eleven faults were put in —
the tack not charged, a gybe costed as a tack, time owed forgiven at the end
of a step or at a mark, the fetching boat not kept apart, the nearer boat kept
and not the one further along — and each is caught. Two of them got past
every check at first, and a check was added for each.

The passage log is checked on rows written by hand, in round numbers: six
ten-minute rows at nine knots are an hour and nine miles, and 242 less 233 is
nine degrees backed. Twenty-four faults were put into it one at a time —
veered and backed swapped, fair and foul the wrong way round, a shift taken
before the numbers are rounded, the board that rounds the mark folded away
with the short tacks, a reason written into a line — and each is caught. Six
more were put in for a costed tack: the manoeuvre row dragging the board's
heading round, a tack carried over two rows counted twice, the cost not
printed.

The run command is checked against a folder that exists only in memory, so
each refusal can be provoked by taking one file out or spoiling one line.
Nineteen faults were put into it one at a time — the grids not checked, a
refusal that does not name its file, the areas not read, a refusal that ends
with 0 — and each is caught. Six more were put in for the crew: the crew file
not read, the crew not handed to the router, a crew's report opening by
saying that tacks are free.

The crew file's reader is checked in `course.js`, with the other formats:
seven faults, among them shares that need not add to 100 and a level allowed
to have no gybe line.
