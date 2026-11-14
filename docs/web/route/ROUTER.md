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

### She may stay in her own square

```
     one half-mile square of the search
    +-------------------------------+
    |                               |     in a light air, or with a short
    |    o  where she is            |     step, she sails less than half
    |     \                         |     a mile in a step, and ends it
    |      o  a step later          |     in the square she began it in
    |       \                       |
    |        o  and a step later    |
    +-------------------------------+
```

A square is kept for the first boat to reach it, because a boat that arrives
later is behind one that was already there. The first version applied that to
the boat herself.

1. **A step that did not carry her out of her square** left her in a square
   "reached earlier", by her, the step before. She was dropped.
2. **So she could only move by leaving her square,** and a boat that sails less
   than half a mile in a step could not move at all.
3. **What that did:**

   | | before | now |
   |---|---|---|
   | 20 miles on a beam reach in 2 knots of wind | no route | 8.33 hours: the distance over the speed |
   | the same reach at 10 knots, with a 2½-minute step | no route | 2.00 hours, as at ten minutes |
   | a dead beat in 3 knots of wind | 11.49 hours, 27 tacks | 11.11 hours: the distance over the speed made good |
   | the 2025 race with a 2½-minute step | 25.47 hours, 185 tacks | 23.53 hours |

4. **Now the boat that holds a square may stay in it,** step after step. A boat
   from elsewhere that comes into a square reached in an earlier step is still
   behind, and is still dropped.

**How it was found** (14 November 2026): by asking the one thing a finer step
must never do, which is make her slower, and sailing the 2025 race at five step
sizes. **The published runs were not touched by it,** row for row, all twelve:
at ten minutes in twelve knots and more she crosses three squares a step. A
race in light airs would have been.

**The station she has just made is a case of the same thing,** found the day
before by a passing mark laid exactly on a square's edge. The rest of the step
after a mark or a passing mark may be seconds, too short to leave the square;
she was judged against her own station and dropped, and only a heading that
fell back over the square's edge survived. She sailed a few seconds back the
way she came. The runs with headland circles came out 65 to 75 seconds slow.

### What the search can resolve

A step is ten minutes, and she can only put the helm down at a step. A square
is half a mile. Those two set what the search can see.

**Between two runs at the same step, a minute or two is not a finding.** The
plainest case is in the 2025 files. The run that must stay a mile off three
headlands finishes 27 seconds *before* the run that may go where it likes. A
restriction cannot make a passage faster, so that is the size of what the
search cannot tell apart, in a passage of nearly a day.

**The time itself is good to about ten minutes in a day.** The 2025 race, the
same files, at five steps:

| step | tacks free | an able crew |
|---|---|---|
| 10 min (the published runs) | 23.62 h | 23.87 h |
| 6 min 40 s | 23.51 h | |
| 5 min | 23.46 h | 23.74 h |
| 3 min 20 s | 23.49 h | |
| 2 min 30 s | 23.53 h | 23.90 h |

1. **From ten minutes to five she gains ten minutes,** eight with a crew: she
   may put the helm down twice as often.
2. **Below five minutes she gains nothing, and loses a little.** A step is then
   shorter than a square. The first boat into a square is decided to the
   minute but kept to the half mile, and the first in tends to be the one
   footing off for speed, not the one pointing. On a dead beat at one-minute
   steps that costs two parts in a hundred, and a check pins it.
3. **A smaller square gains about three minutes** (23.57 hours at a third of a
   mile), for twice the work.

So "no boat with this polar could have done better in this weather" is true
to about ten minutes in a day, and no closer. **A step much shorter than the
time she takes to cross a square buys nothing:** five minutes is as fine as
is worth asking for with a boat like this one.

**A step can also be too long for the water.** At twenty minutes the 2025 race
has no route at all: a board of three miles does not fit in the Solent, and the
router says there was nowhere left she could sail to.

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

**The berth** (Larry, 13 November 2026): she crosses that line at least the
berth out and passes no nearer at any time. A run with no passage gives every
mark the one berth it says with `round`; a run that names a passage gives each
mark the berth its plan says. The fastest route passes exactly that far off. Boats in the real race do go inside what a prudent
berth would be, and have for years; a run can be given a smaller number to see
what that is worth, and nothing here is advice to do it.

**A mark that is the end of the finish line is rounded by finishing,** and its
side is checked against the way the line is crossed. It takes no berth: a berth
round it would cover the line she must cross.

### A mark once rounded stays rounded

```
        out   - - - - - - - - - >  \
                                    \   she reaches past the buoy,
                         buoy  M ====\======>  the line out from it
                                    /   hooks across the line,
        home  < - - - - - - - - - /    and comes back the side she
                                        went out.  NOT a rounding.
```

Crossing the line out from a mark the right way is how she rounds it. Nothing
then stopped her crossing it back the other way a moment later, which unwinds
the turn: the string drawn along her track no longer goes round the mark at
all. A headland to pass found it. With one before the buoy and again after
it, that hook was the fastest way, and the check that measures how far the
track swings round the mark read two degrees where it should read a full turn.

So the line of every mark she has rounded is a wall to her from the wrong
side, for the rest of the passage. Behind the mark she may cross its line
freely: that is only the far side of going round it. Courses with nothing to
pass had not been tempted, and their routes are unchanged to the row.

## Passing marks, and a berth for each mark

A run that names a passage sails one plan of it (`COURSE.md`, "PASSAGE 1"): the
marks of the course in their order, each with its berth, and the passing marks
among them, written down the page as she sails it. The line is `pass`; the
thing is a passing mark (Larry, 13 November 2026), and "gate" is left to B15,
the `tidal_gate`.

    plan two-miles
      pass  St Albans Head  50.57868 -2.05644  south within 2.0
      pass  Portland Bill   50.51353 -2.45676  south within 2.0
      mark  Eddystone Lt House                 berth 0.15
      pass  Portland Bill   50.51353 -2.45676  south within 2.0
      pass  St Albans Head  50.57868 -2.05644  south within 2.0
      mark  North Head Buoy

**The marks and the passing marks together are the stations of the passage,** in the
order she must make them, and a leg runs from one station to the next.

```
 start --> pass --> pass --> MARK --> pass --> pass --> finish
   leg 0     leg 1    leg 2     leg 3    leg 4    leg 5
```

**A passing mark is one of two shapes.**

```
   with a compass word: a LINE          with none: a CIRCLE

        Portland Bill *                         .  -  ~  -  .
                      |                     .                   .
     out  <-----------+-----------        .     *  the point      .
                      |                - - o - - - - - - - - - - - - ->
     home ------------+---------->        .                       .
                      |                     .                   .
                      + 2 nm south              '  -  ~  -  '

   made where she crosses it,           made the moment she comes within
   either way: the plan's order         its distance, here at o
   says which way she is going
```

1. **A line is made where she crosses it,** and a circle where she first comes
   within its distance. The step is cut there, as it is at a mark, so the log
   has the moment.
2. **A circle she is already inside is made where she is.** One drawn round
   the start line is made as the gun goes; two that overlap are made one after
   the other as she enters each. **A line has no inside:** it is made only by
   crossing it.
3. **A passing mark puts nothing in her way, and has no berth.** An `avoid` is
   water she may not enter; a passing mark is the opposite.
4. **Each mark has its berth from the plan,** and keeps it all the way round.
   The mark that ends the finish line takes none.
5. **The line out from a mark is laid by the stations either side of it,**
   which may be passing marks. A headland to be passed on the way to a mark changes
   the way she comes at it, and so the height of her turn.
6. **A plan that gave every mark the berth `round` gave sails the same route,
   row for row.** That is checked on the small courses and on the 2025 race.

**What the route says it sailed to.** Each mark rounded carries its berth in
the summary and the report, and each place passed carries its compass word and
distance, so a result can be sailed again from what it prints (the XO's
point). The report also names the polar, so that a speed in it is read as that
polar's and not as a fact about boats (PILOT's).

### The 2025 race with its passing marks

PILOT's passage file (`passage_2025_v1.txt`): the race as set, with the
Eddystone at the 0.15 nm berth the tracked Clipper 68s show; and Level 1, south
of St Alban's Head and Portland Bill inside two miles, out and home. The same
boat and weather as the first run below.

| plan | tacks free: finish, 25 May | an able crew: finish, 25 May |
|---|---|---|
| `as-sailed`: Eddystone berth 0.15 | 09:37:54Z | 09:52:50Z |
| `two-miles`: the four passing marks as lines | 09:44:23Z (6½ min later) | 10:04:03Z (11 min later) |
| `two-mile-circles`: the same as circles | 09:44:46Z | |

With tacks free on `two-miles` she passes St Alban's at 13:55Z and Portland
Bill at 16:07Z, rounds the Eddystone at 01:13Z, and on the way home passes the
Bill at 06:54Z and St Alban's at 08:08Z.

Checked by brute force, with none of the router's own index:

1. **No step crosses the coastline,** the Casquets scheme or the Sowley boom.
2. **She is never nearer the Eddystone than 0.152 nm,** against a berth of
   0.15, and the track goes once round the light, leaving it to port.
3. **Each line is crossed out and home.**
4. **She passes Portland Bill 0.31 nm off and St Alban's 0.81.** Close under
   the Bill is where the line is quickest to cross, and the only thing holding
   her off is the coastline's clearance of a tenth of a mile. The Portland Race
   is not in these files.

**The berth of 0.15 at the Eddystone costs 35 seconds** against 0.10, which is
inside what the search can resolve. **It does not keep a route off the reef:**
Larry's chart shows the NE Rock, drying, about 0.15 nm out, and rocks to about
0.23 nm north-east. The reef is to go into an areas file.

**Going by the headlands costs her six to eleven minutes on this day.** A
minute or two of any such figure is inside what the search can resolve, and it
is one day and a generic boat: a thing to show, not a rule to teach.

## The water she may not cross

| in the files | what the router does |
|---|---|
| a `line` in a live layer | never crosses it, and stays the layer's clearance off it |
| an `area` in a live layer | never enters it; its edges are lines |
| `avoid <name> ... off <nm>` | stays at least that far from the point |
| a mark of the course | stays at least its berth off it, all the way round |
| a passing mark | nothing: it is a place to go, not water to keep off |
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
| `rounded` | each mark she rounded, with the time and the berth it was rounded at |
| `passed` | each place she passed, with the time, its distance and its compass word, or none for a circle |
| `passage`, `round` | the passage file and plan sailed; or, for a run with none, the one berth it gave every mark |
| `tacks`, `gybes` | how many of each she made, counted apart |
| `tackSeconds`, `gybeSeconds` | the time given to each, when the run names a crew |
| `crew` | the crew file, the level, and what a tack and a gybe cost that crew; nothing, when the run names none |

## The passage log

`docs/web/route/passagelog.js`. The router answers with one row for every step -
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
      |    grid, the polar, and the crew file and the passage file
      |    when the run names them: each by its own reader
      |
 the run is checked against the course and the water it names,
 against the grids, and against its crew file; its passage is
 checked against the course, every plan in it
      |
 ROUTER.run  -->  the rows  -->  PASSAGE.log
      |
 the report:   what was sailed
               what to know before trusting it
               the passage log
```

The report also says what the run asked her to keep off, the boat's polar,
and the plan sailed or the one berth given every mark, so that it can be read
without the run file beside it.

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
costs the router nothing, so the number of tacks means nothing. For a run with
one: every tack costs the crew's average, so no one tack is the bad one. The
report lists each mark she rounded and each place she passed, in the order she
made them, with the time and the figure it was sailed to. With a crew it also gives what a tack and a
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

## Held to the real race

`docs/web/tests/race-2025.js` holds the router to the race that was sailed:
PILOT's course, coastline, wind, stream and polar, and what eleven real boats
did, from the race's tracker. It is board item B3.

```
   W                                                                        E
   Eddystone    Start Point       Portland Bill   St Alban's    Hurst    start,
       *            |                  |              |           |      finish
     4.27W        3.640W             2.457W         2.057W      1.550W    ][

       <------------+------------------+--------------+-----------+------  out
                  held               held          EXCEPTED    EXCEPTED

       -------------+------------------+--------------+------------------>  home
     held         held               held           held            held
```

PILOT timed every real boat where she crossed four meridians, out and home,
where she came closest to the light, and at the finish: nine lines. The router
is timed at the same nine, from the same gun.

### What is held (Larry, 14 November 2026)

| | what it checks | why |
|---|---|---|
| **rules** | Every step of every route against every piece of the coastline and each layer's clearance; each berth; the hand each mark was left on; each passing mark made; the start and the finish; each row handing on to the next. | By arithmetic of the test's own, that owes nothing to the router. The router keeps its water in a table of squares for speed; this goes through all of it. |
| **orderings** | A restriction never makes her faster: headlands to keep off, a wider berth, passing marks. A worse crew is never quicker. A five-minute step is never slower than a ten-minute one. | These must be so whatever the answer is. Every fault found in the search so far was found by one of them and not by a wrong number. |
| **pins** | The ten finishing times the documents and lessons quote, and the as-sailed run's time at each of the nine lines. | A change that moves one is seen, and must be made on purpose, with its reason in the CHANGELOG. |
| **boats** | From Portland Bill on, the router leads every real boat at every line it was observed at. | Its boat is a generic 70 ft racing yacht with free tacks and a forecast it knows in advance. It should lead. |

**Every comparison of two times allows two minutes,** which is what the search
cannot tell apart ("What the search can resolve").

### The router beside the real boats

Hours from each boat's own gun. The router is the as-sailed run: tacks free.

| line | router | Ker 46 | Sydney GTS 43 | Open 50 | Carroll Marine 60 | fastest Clipper 68 |
|---|---|---|---|---|---|---|
| Hurst narrows (out) | 1.47 | **1.16** | **1.20** | **1.29** | **1.27** | 1.50 |
| St Alban's Head (out) | 4.07 | **4.04** | 4.29 | 4.91 | 5.12 | 7.36 |
| Portland Bill (out) | 6.10 | 6.62 | 6.70? | 8.05? | 8.22 | 10.98 |
| Start Point (out) | 12.35 | 14.27 | 14.38 | 16.53 | 15.08 | 23.43 |
| Eddystone | 15.17 | 18.60 | 18.89 | 21.37 | 19.62 | 28.48 |
| Start Point (back) | 16.98 | 20.60 | 21.24 | 24.55 | 23.95 | 31.23 |
| Portland Bill (back) | 20.78 | 25.65 | 26.68? | 29.93 | 31.16 | 37.68 |
| St Alban's Head (back) | 22.00 | 27.49 | 28.50? | 31.04 | 32.67 | 41.16 |
| finish | 23.62 | 29.07? | 30.44 | 32.92 | 35.52 | 43.94 |

**Bold** is a real boat ahead of the router. `?` is a time the tracker did not
observe: it was silent across the line, the time is interpolated, and it is
not held either way. The test prints all eleven boats.

1. **From Portland Bill on she leads every boat,** at 69 observed times. The
   closest is the Ker 46 at Portland Bill, 31 minutes behind her.
2. **At Hurst six real boats lead her, and at St Alban's Head the Ker 46 still
   does.** The stream data does not cover the Solent, so the router sails its
   first hour and forty minutes as still water while the real boats had the ebb
   (PILOT's finding). Those two lines are a **stated exception**.
3. **The exception is itself checked.** It stands only while a real boat does
   lead her there. When the Solent stream data comes and she leads at Hurst
   too, the test fails until the exception is taken out, and the line is then
   held like the rest.

### What is not held, and why

1. **Single legs.** She is slower than the fastest real boat on three of the
   nine legs. One is the Solent. One is fair: the Open 50 had a better tide from
   Portland Bill to St Alban's for arriving at a different hour. The last leg is
   a tie, against an interpolated time. The router makes the best passage, not
   the best of every leg.
2. **PILOT's Clipper 68 run against the real Clipper 68s.** That polar was
   measured in this same race, so it would be the method agreeing with itself.

### The data is read where it lives

The test reads PILOT's folder, `practical-navigator/data/2025/`, beside this
repository. Nothing is copied: a copy would have missed both of the corrections
PILOT has already made. It only reads.

1. **Each file is pinned by its checksum.** If one changes, the test names the
   file and says so, and a note at the top says that any failure below may be
   the file and not the router.
2. **If the folder is not there, the test fails and says where it looked.** A
   check that passes because it could not look is worse than none.
3. **The crews and the passage plans are written by the test,** from PILOT's
   as-sailed run, so that each differs from it in one thing.

### Running it, and changing a pinned time

    node docs/web/tests/race-2025.js                  all of it: two to three minutes
    node docs/web/tests/race-2025.js boats pins       some parts
    node docs/web/tests/race-2025.js --show           print what it measured
    node docs/web/tests/race-2025.js --data <folder>  another copy of the data

The parts are `files`, `rules`, `pins`, `boats`, `crews`, `limits` and `steps`.
It sails the race eleven times, so it is its own command and the full suite
runs it once, outside its loop over shells; it is not in the one-second gate.

**To change a pinned time:** change the router on purpose, say why in the
CHANGELOG, run with `--show`, and write the new figure into `FINISH` or
`AT_LINES`. **To move to a new file of PILOT's:** read what changed, run with
`--show`, and write the new checksum into `PINNED`.

## What it does not do yet, and what it assumes

1. **A tack costs nothing unless the run names a crew.** Without one she
   short-tacks the Solent because nothing says she should not. With one,
   every tack costs that crew's average: no one tack is the bad one, and the
   cost is the same in thirty knots as in ten.
2. **A mark that may be left on either hand** is refused, with the reason
   rather than ignored.
3. **A passing mark has no time window.** She must make it in its turn; when
   she makes it is hers to choose.
4. **The polar is the boat.** A generic polar gives a generic boat's passage.
5. **The forecast is taken as the truth,** and the stream atlas as the stream.
6. **She tacks, and gybes, only at a step.** Ten minutes apart, in these
   runs. A layline is therefore judged to within a few minutes, never
   exactly.
7. **A minute or two is not a finding, and the time itself is good to about
   ten minutes in a day.** A step under five minutes buys nothing. See "What
   the search can resolve".
8. **The Eddystone reef is not in the files.** The coastline is EMODnet's,
   which does not hold the rocks round the light, and a berth alone does not
   keep a route off them.
9. **It is not for navigation.** It is for understanding a race after it was
   sailed, and for asking what a different choice would have cost.

## Running the checks

    node docs/web/tests/route-vector.js     the vector step
    node docs/web/tests/polar.js            the polar
    node docs/web/tests/route-step.js       one step, against hand-worked answers
    node docs/web/tests/router.js           whole routes small enough to sail in your head
    node docs/web/tests/passagelog.js       the passage log, on rows written by hand
    node docs/web/tests/sail.js             a run sailed from its name, and the refusals
    node docs/web/tests/course.js           the course, areas, run, crew and passage files
    node docs/web/tests/race-2025.js        the real 2025 race: two to three minutes (see "Held to the real race")

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

Passing marks are checked on the same small courses. A circle on the straight line
costs nothing and is made at the minute the distance gives; a line across her
way costs nothing and is crossed between its ends; a line two miles north of
her way is crossed north of the point, one south of it south, and a circle of
the same size is entered a mile from the point and costs least; two passes
written the wrong way round send her there and back again; a pass written
before a mark is made before it, after it after, and both sides twice; a wider
berth is kept all the way round, and costs time. Twenty-six faults were put in
across the three files: a line sailed as a circle, a line drawn the wrong way,
the plan's berth ignored, a berth on the finish buoy, a line given an inside,
her own station a rival again, the figures paired to the wrong pass. Each is
caught. One got past every check at first. The order check, put back, caught
nothing, because the plan's marks were looked up by name, and a name looked up
can never be out of turn. That was a fault in its own right: a course that
rounds one buoy twice could have no plan. The marks are now matched one by one,
and a check was added for a buoy rounded twice. Twelve of the gate faults that
still apply were put back against the new code — a circle made where she
leaves it, a mark allowed to be unwound, a row that makes two stations logged
as one — and each is caught.

Light airs and fine steps are checked on the same courses. Twenty miles on a
beam reach in 2 knots of wind is the distance over the speed; the reach at
one-minute steps takes the two hours it takes at ten; a dead beat in 3 knots of
wind is the distance over the speed made good, to one part in a hundred, and
with a crew every tack is still paid for; the dead beat at 2½-minute steps is
no slower than at ten. Five faults were put in, among them the rule left out,
the rule kept for a station only, and the square forgetting which boat holds
it, and each is caught. A variant that let a square stay with its first boat
whoever else came was tried, could not be told from this one by any check or
by the 2025 race, and was taken out. Every earlier fault list was then put
back against the new search, 97 faults in all, and each is still caught.

The real race is checked in `race-2025.js`, 86 checks. Its own checks were
proven the same way, with 24 faults, none of them put into either repository:
the router was faulted in a scratch copy, and PILOT's data in a scratch copy of
the folder. In the router: the coastline clearance ignored, no berth, the
stream not sampled, a crew not charged, a plan's berth or its passing marks
ignored, an `avoid` dropped. In the data: a pinned file changed in place, a real
boat put ahead of the router at Portland Bill, the leg times cut short, the
exception made unnecessary, the folder taken away. Each is caught by the check
meant for it, and an interpolated time put ahead of the router, which is not
evidence, rightly passes. One got through at first. A router that ignored the
plan's berth passed, because the test read the berth from the route's own
summary and so held it to the figure it had used; it now reads what was asked.

The crew file's reader is checked in `course.js`, with the other formats:
seven faults, among them shares that need not add to 100 and a level allowed
to have no gybe line.
