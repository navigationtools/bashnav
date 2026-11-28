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
for nothing; but it did lose something. The 2025 race with free tacks, on the
Shom atlas's stream, was first sailed in 23.70 hours and in 23.62 once this was
mended. The weather and the boat were the same. The earlier figure was the
search.

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
plainest case is in the 2025 files on the Shom atlas's stream. There, the run
that must stay a mile off three headlands finished 27 seconds *before* the run
that may go where it likes. A restriction cannot make a passage faster, so that
is the size of what the search cannot tell apart, in a passage of nearly a day.

**The time itself is good to about ten minutes in a day.** The 2025 race, on
the Copernicus stream with the Eddystone at 0.25 nm, at five steps (measured
again on 28 November 2026 when the runs moved to that berth, TBSP):

| step | tacks free | an able crew |
|---|---|---|
| 10 min (the published runs) | 23.58 h | 23.77 h |
| 6 min 40 s | 23.46 h | |
| 5 min | 23.41 h | 23.65 h |
| 3 min 20 s | 23.42 h | |
| 2 min 30 s | 23.50 h | 23.72 h |

1. **From ten minutes to five she gains ten minutes,** seven with a crew: she
   may put the helm down twice as often.
2. **Below five minutes it stops paying.** Three minutes twenty is no faster
   (44 seconds slower, inside what the search resolves), and two and a half
   loses five minutes more. A step
   is then shorter than a square. The first boat into a square is decided to
   the minute but kept to the half mile, and the first in tends to be the one
   footing off for speed, not the one pointing. On a dead beat at one-minute
   steps that costs two parts in a hundred, and a check pins it.
3. **A smaller square gains about four minutes** (23.44 hours at a third of a
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

PILOT's passage file (`passage_2025_v2.txt`): the race as set, with the
Eddystone at a berth of 0.25 nm, Larry's pilotage choice set from his chart
(TBSG): clear of everything that dries and of every sounding under 20 ft. Boats
in the real race go closer; we do not advise it. And Level 1, south
of St Alban's Head and Portland Bill inside two miles, out and home. The same
boat, weather and Copernicus stream as the first run below.

| plan | tacks free: finish, 25 May | an able crew: finish, 25 May |
|---|---|---|
| `as-sailed`: Eddystone berth 0.25 | 09:34:51Z | 09:46:21Z |
| `two-miles`: the four passing marks as lines | 09:45:31Z (11 min later) | 09:58:42Z (12 min later) |
| `two-mile-circles`: the same as circles | 09:42:51Z | |

With tacks free on `two-miles` she passes St Alban's at 13:40Z and Portland
Bill at 15:47Z, rounds the Eddystone at 01:15Z, and on the way home passes the
Bill at 06:55Z and St Alban's at 08:08Z.

Checked by brute force, with none of the router's own index:

1. **No step crosses the coastline,** the Casquets scheme or the Sowley boom.
2. **She is never nearer the Eddystone than 0.268 nm,** against a berth of
   0.25, and the track goes once round the light, leaving it to port.
3. **Each line is crossed out and home.**
4. **She passes Portland Bill 0.23 nm off and St Alban's 0.82.** Close under
   the Bill is where the line is quickest to cross, and the only thing holding
   her off is the coastline's clearance of a tenth of a mile. The Portland Race
   is not in these files.

**The berth of 0.25 at the Eddystone costs under five minutes** against the
old 0.10 (09:34:51 against 09:30:15), and two and a half against 0.15: about
what the search can resolve. **The NE Rock now lies inside the berth.** It
dries 1 m about 0.15 nm north-east of the light, and PILOT's `eddystone-reef`
layer, a keep-out area round it, is still switched on; it changes nothing.

**Going by the headlands costs her eleven to twelve minutes on this day.** A
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
| `bounds` in an areas file with a live layer | she is kept inside the box; a step that ends outside is not taken |

A place on the start line that is already inside a clearance — one end of the
2025 line is a flagstaff ashore — is not a place a boat can start from, and is
left out and counted.

**The bounds (Larry, AIF, 16 November 2026).** A coastline cut to a box stops
at the box's edge, and the end of a line can be sailed round: past it and in
behind the coast, where nothing stops her. In the 2025 race the search went
round the end at 0.5 W off Littlehampton and spread west overland. No route
ever used such a boat, because she could only return to the sea by crossing a
coastline, but about a third of everything the search held was such a boat,
and the course's isochrones showed them as positions on land. PILOT found it
drawing the isochrones.

```
   bounds 49.50 -5.00 to 51.00 -0.50          her step from A
                                               ends at B
   +--------------------------------------+
   |                                      |  B   outside: not taken
   |   sea                         A -----+->
   |                                      |
   +--------------------------------------+
```

An areas file cut to a box now says so (`COURSE.md`, "`bounds`"). While any
of its layers is switched on, a step that ends outside the box is not taken,
and is counted in `stats.outside`. A step is tested at its end only: a box has
no dents, so a step whose two ends are inside it is inside it all the way.
With two such files she is kept inside both. A start line, a finish line or a
mark outside the box is refused by name, because no route could reach it.

**The routes are the same.** All thirteen sailings of the 2025 race, with the
coast file's box added, give the same rows and the same report to the letter.
The search holds about a third fewer positions (22,655 for the as-sailed run,
where it held 35,215, both measured with the Eddystone at the old 0.10 nm
berth), none of them outside the box, and the run takes 11 seconds where it
took 16.

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
| (tacks free) | nothing | 30 | nothing | 09:35Z | |
| crack | 17 s | 15 | 4 min 51 s | 09:36Z | 1 min |
| able | 41 s | 13 | 10 min 9 s | 09:46Z | 11 min |
| ordinary | 81 s | 13 | 20 min 25 s | 09:55Z | 20 min |
| green | 2 min 39 s | 10 | 32 min 15 s | 10:19Z | 44 min |

Each crew gybed once, after the Eddystone.

**What it shows.** Between the crack crew and the green one there are 43 minutes
in a race of a day. The green crew gives 32 minutes of that to the manoeuvres
themselves. The rest is the price of tacking less: longer boards, further
from where the wind and the stream would have had her.

**What it does not show.** The tack counts do not fall evenly from crew to
crew, and differences of a tack or two, or a minute or two, are inside what
the search can resolve. And these are a generic boat's passages with invented
crews: the shape is the lesson, not the minutes.

## What a route says about itself

A route is three pieces: its `rows`, its `summary`, and its `isochrones`, which
have a section of their own below.

Every row is one step: where and when it began, the heading and tack, both
winds, the stream, the speed through the water and over the ground, and where
it ended. The summary adds them up, and says three things a reader should know
before trusting the rest:

| | |
|---|---|
| `noStreamMinutes` | how long she sailed where the stream grid has no data, through still water |
| `clampedMinutes` | how long the wind was above the strongest in the polar |
| `optimumMinutes` | how long she was on the polar's beat or run rows rather than its table |
| `rounded` | each mark she rounded, with the time and the berth it was rounded at |
| `passed` | each place she passed, with the time, its distance and its compass word, or none for a circle |
| `passage`, `round` | the passage file and plan sailed; or, for a run with none, the one berth it gave every mark |
| `tacks`, `gybes` | how many of each she made, counted apart |
| `tackSeconds`, `gybeSeconds` | the time given to each, when the run names a crew |
| `crew` | the crew file, the level, and what a tack and a gybe cost that crew; nothing, when the run names none |

## The isochrones

An isochrone is every place she could have reached by one time. It is the
standard picture of weather routing: where the lines bulge, the wind or the
stream on that side is paying, and the route can be seen to follow the bulge
rather than be taken on trust. The course's Level 3 draws them (Larry, AGE, 16
November 2026).

The search already holds them. At the end of every step it has a list of every
position it has kept for that time, and that list is the isochrone. So once an
hour the list is written down as it stands:

```
   the search, a step at a time            what is written, once an hour

   10:00  o          the start line        nothing: it is in the course file
   10:10  . . .
   10:20  . . . . .  every position kept
    ...              at the end of a step
   11:00  . . . . . . . . .   ---------->  "t": "2025-05-24T11:00:00Z",
   11:10  . . . . . . . . . .              "hours": 1, "n": 83,
    ...                                    "at": [[50.72666,-1.50277,0], ...]
   12:00  . . . . . . . . . . . .  ----->  "t": "2025-05-24T12:00:00Z",
    ...                                    "hours": 2, "n": 556, "at": [...]
   the step that finishes                  nothing after it
```

Seen from above, each hour's positions lie along a line, and the route runs
through one position of every line:

```
                      2  2        3   3   3
                1  1     2    2  3         3   4  4
     start   1        2        3              4      4
       o-----1--------2--------3--------------4-------->  the route
             1        2        3              4      4
                1  1     2    2  3         3   4  4
                      2  2        3   3   3

     each figure is one position; the same figure is the same hour
```

**What is written, and what is not (Larry, AGL).**

1. **Every position the search holds at that hour,** each with its latitude,
   its longitude and the leg she is on there. Nothing is thinned.
2. **No outline.** Where the edge of a line runs, once it has folded round a
   headland or split onto two tacks, is a judgement. A first attempt at
   joining the outermost positions came out as a tangle. The positions are
   facts; whoever draws them may join them, and can always go back to them.
3. **No reason.** Like the passage log, the isochrones say where and when and
   never why.

**Where they are (Larry, AGO).** `ROUTER.run` returns them as a piece of their
own, `isochrones`, beside `rows` and `summary`. `sail.js --json` always writes
them into the one route file, last, with no flag to remember:

| | |
|---|---|
| `stepSeconds` | 3600: one line an hour |
| `fields` | `lat`, `lon`, `leg`: the order of the three figures in every position |
| `lines` | the isochrones, in order of time |
| `lines[].t` | the time the line is for, as the rows write a time |
| `lines[].hours` | hours since the start |
| `lines[].n` | how many positions the line holds |
| `lines[].at` | the positions, each `[lat, lon, leg]` |

Latitude and longitude are in degrees, north and east positive, to five places:
about a metre, far finer than the half-mile squares the search sorts them by.
The leg is counted as the rows count it: 0 until the first mark or passing
place is made, then 1, and so on.

**Things to know before drawing them.**

1. **The first is one hour after the start, and there is none after she
   finishes.** A passage of 23 hours 30 minutes has 23.
2. **Every position is inside the bounds** of the areas files the run
   switches on ("The water she may not cross"). Before the bounds, a third of
   them had gone round the end of the coast and lay on land.
3. **After a mark is rounded, the line starts again from the mark.** A leg is
   not searched for long once the first boat has completed it, so the boats
   still coming up to the mark are dropped a step later. The line for the hour
   after a rounding holds the boats that have rounded, and is short. In the
   2025 race the Eddystone was rounded at 01:08; the line at 01:00 holds 1,576
   positions, all on leg 0, and the line at 02:00 holds 669, all on leg 1.
4. **The same water can be in two lines on two legs.** She sails out past
   Start Point and back past it. A page should draw one leg at a time, or tell
   them apart, which is what the leg in every position is for.
5. **A step that does not divide an hour.** The line kept is the first that
   ends on or after each whole hour, and it says its own time. At a step of
   ten minutes that is exactly the hour. At seven minutes the first line is at
   63 minutes and says `"hours": 1.05`.
6. **The positions are in no order.** They are as the search holds them, which
   is not along the line.

**How big.** The 2025 race, as sailed, on the Copernicus stream with the
Eddystone at 0.25 nm: 23 lines, 35,120 positions, from 83 at the first hour to
3,204 at the nineteenth. The route file goes from 107 KB to 873 KB. So that it stays under a megabyte, each
isochrone is one line of the file; the summary, the log and the rows are still
laid out a figure to a line, to be read. With the coast file's `bounds` the
same race held 22,655 positions at the old 0.10 nm berth, and the file is
smaller in proportion.

**The search is not changed.** It reads none of this. The 2025 race, on both
streams, gives the same report and the same rows to the letter as before, the
motorboat that follows it gives the same passage, and the run takes the same
sixteen seconds.

## The passage log

`docs/web/route/passagelog.js`. The router answers with one row for every step -
143 of them for the 2025 race - which is right for a chart and too much for a
person. The passage log folds those rows into the lines a navigator would have
written in the deck log, and beside each line sets down **what had changed**
since the line before.

```
 rows     10:00 port 280 | 10:10 port 280 | 10:20 port 281 | ...
            \__________ the same tack, on the same leg _________/
                                   |
 boards   14:40  port, heading 273, for 4h50, 39.1 nm
                                   |
            three or more boards of twenty minutes or less
                                   |
 lines    10:00  short-tacking, 8 boards in 1h30
```

**It states facts and never gives a reason** (Larry, 13 November 2026). The
search keeps the earliest arrival out of every heading tried from every place.
It holds no reasons, so a "because" in the log would be invented. The log says
that the wind veered 15 degrees between 23:20 and twenty to one, and that at
twenty to one she tacked to starboard. Whether the one led to
the other is for the
reader, and the lesson, to say. One of the log's own checks reads every word
the others produced and fails on a reason-word.

**An entry is made at a time, as in a deck log.** It is laid out down the
page, and no line is wider than 80 columns, so it prints and reads on a small
tablet without wrapping where the screen chooses:

```
14:40  tacked to port, heading 273   4h50  39.1 nm                      (1)
         wind 241 at 20 kt (20 over the water)                          (2)
         stream foul 1.4 kt   9.5 kt through the water, 8.1 made good   (3)
         since 14:30: stream foul on this line, slack on the last       (4)

 (1) what she did, and how long and how far the board was
 (2) the wind as the line begins
 (3) the board as a whole: the stream along her track, and her speeds
 (4) what had changed since the line before
```

**Every change is the difference of two printed numbers.** Each reading is
rounded first and subtracted second, so a reader with the log in front of them
can check "backed 7" by subtraction: 248 at 10:00, 241 at 11:30.

| the log says | when |
|---|---|
| wind veered / backed N degrees | its direction has moved 5 degrees or more, clockwise or anticlockwise |
| wind freshened / eased N kt | its speed has changed by 3 knots or more |
| stream data begins / no stream data from here | the stream grid starts, or stops, having data where she is |
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
current handed in as the wind, a wind from 925 hPa, or a wind worked out from
the isobars does not fail: it sails, wrongly. All three are refused before
anything is sailed.

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
the track. It saves the isochrones after them, always ("The isochrones").
`SAIL.json(s)` gives the same text to a page that wants to save the file.

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

Sailed on the course's own files — the GFS wind of 00Z on race day, the
Copernicus North-West Shelf stream (which covers the western Solent), the
low-water coastline kept a tenth of a mile off, a generic 70 ft polar, and
tacks that cost nothing — in about fifteen seconds.

| | |
|---|---|
| Start, IRC One | 10:00Z, 24 May, towards the outer end of the line |
| The wind | 248 at 16 knots at the start: **a dead beat to the Eddystone** |
| Eddystone, left to port | 01:11Z, after 15 hours and 30 tacks, 0.26 miles off (the berth is 0.25) |
| Finish | 09:35Z, 25 May: **23.6 hours**, 262 miles over the ground |
| Nearest the coast | 0.135 miles, against the 0.1 allowed |
| Where the stream data is silent | nowhere: the model covers the Solent |

Checked afterwards by brute force, with none of the router's own bookkeeping:
no step crosses the coastline, the nearest it comes is 0.135 miles against the
0.1 allowed, the traffic scheme is never approached, and the track swings 360
degrees anticlockwise round the lighthouse.

**The stream in the western Solent is a model's, and it runs light at Hurst.**
Larry read the chart's streams at Hurst, the Needles and Yarmouth Road and set
them beside the model (PILOT's `stream_check_readings_2025_v1.txt`). The timing
is right everywhere. The model's ebb at Hurst is about a quarter weaker than
the chart's: 2.7 knots against 3.6. Larry's ruling: teach the model as it is,
with that caveat.

**The real 68-foot ocean racers took far longer,** as RORC's published results show:
43:56:37 to 48:43:24 elapsed, against her 23h35 (Source: RORC, Myth of Malham
Race 2025 results, published on SailRaceHQ; Larry's ruling TBRV). The
difference is the point, not
a fault: this is the fastest a generic 70-footer could go, tacking for nothing,
steered perfectly, in a forecast that came exactly true.

**Staying a mile off the three headlands cost nothing the router can
measure.** The same race with `avoid` lines at St Alban's Head, Portland Bill
and Start Point finishes at the same second.

**How close she passes a headland is not a finding either.** On the Shom
atlas's stream the track passed Portland Bill at 0.88 miles; on the Copernicus
stream it passes 3.5 miles off, for a finish seven minutes earlier. Where there
is little to choose between two ways round, the router chooses one, and a
small change chooses the other.

### The same race, as the passage log has it

Every line below is the log's own output from that run, nothing added.

```
-- 24 May 2025, times UTC --
10:00  START  Myth of Malham 2025, IRC One
10:00  short-tacking, 8 boards   1h30  15.8 nm
         wind 248 at 16 kt (17 over the water)
         stream fair 1.0 kt   9.5 kt through the water, 10.5 made good
11:30  starboard, heading 205   1h20  13.9 nm
         wind 241 at 16 kt (17 over the water)
         stream fair 1.1 kt   9.4 kt through the water, 10.4 made good
         since 10:00: wind backed 7 degrees
12:50  short-tacking, 4 boards   0h50  8.9 nm
         wind 242 at 20 kt (21 over the water)
         stream fair 1.2 kt   9.5 kt through the water, 10.6 made good
         since 11:30: wind freshened 4 kt
13:40  port, heading 281   0h50  8.3 nm
         wind 242 at 20 kt (21 over the water)
         stream fair 0.5 kt   9.5 kt through the water, 10.0 made good
14:30  tacked to starboard, heading 203   0h10  1.5 nm
         wind 241 at 20 kt (20 over the water)
         stream slack   9.5 kt through the water, 9.3 made good
         since 13:40: stream slack on this line, fair on the last
14:40  tacked to port, heading 273   4h50  39.1 nm
         wind 241 at 20 kt (20 over the water)
         stream foul 1.4 kt   9.5 kt through the water, 8.1 made good
         since 14:30: stream foul on this line, slack on the last
19:30  short-tacking, 5 boards   1h10  11.0 nm
         wind 232 at 20 kt (19 over the water)
         stream slack   9.5 kt through the water, 9.4 made good
         since 14:40: wind backed 9 degrees;
           stream slack on this line, foul on the last
20:40  port, heading 274   0h40  6.4 nm
         wind 234 at 21 kt (21 over the water)
         stream slack   9.8 kt through the water, 9.7 made good
21:20  tacked to starboard, heading 195   0h40  7.1 nm
         wind 234 at 20 kt (21 over the water)
         stream fair 1.1 kt   9.5 kt through the water, 10.6 made good
         since 20:40: stream fair on this line, slack on the last
22:00  short-tacking, 6 boards   1h20  14.8 nm
         wind 237 at 23 kt (24 over the water)
         stream fair 1.6 kt   9.6 kt through the water, 11.1 made good
         since 21:20: wind freshened 3 kt
23:20  port, heading 293   1h20  13.9 nm
         wind 246 at 24 kt (25 over the water)
         stream fair 0.9 kt   9.6 kt through the water, 10.4 made good
         since 22:00: wind veered 9 degrees
-- 25 May 2025, times UTC --
00:40  tacked to starboard, heading 219   0h31  5.1 nm
         wind 261 at 22 kt (22 over the water)
         stream slack   9.8 kt through the water, 9.7 made good
         since 23:20: wind veered 15 degrees;
           stream slack on this line, fair on the last
01:11  ROUNDED Eddystone Lt House  15h11 from the start
01:11  bore away 20 degrees, still starboard, heading 110   2h19  33.2 nm
         wind 261 at 23 kt (22 over the water)
         stream fair 0.7 kt   13.7 kt through the water, 14.4 made good
         since 00:40: stream fair on this line, slack on the last
03:30  gybed to port, heading 057   6h05  83.4 nm
         wind 262 at 22 kt (21 over the water)
         stream fair 1.4 kt   12.3 kt through the water, 13.7 made good
09:35  FINISH  23h35 from the start
```

The first line is eight boards in an hour and a half. With tacks that
cost nothing the router has no reason not to, and that is the first item in
the list below. The same race sailed by four crews is under "The cost of a
tack".

## Held to the real race

`docs/web/tests/race-2025.js` holds the router to the race that was sailed:
PILOT's course, coastline, wind, stream and polar, and the real boats'
finishing times as RORC published them. It is board item B3.

**It reads PILOT's v2 runs, with the Eddystone at 0.25 nm** (Larry's rulings
TBSH and TBSP, 27 and 28 November 2026). Every time it pins was measured again
on them. The v1 runs, at the old `round 0.10`, are kept in PILOT's folder and
no longer read.

```
   W                                                                        E
   Eddystone    Start Point       Portland Bill   St Alban's    Hurst    start,
       *            |                  |              |           |      finish
     4.27W        3.640W             2.457W         2.057W      1.550W    ][

       <------------+------------------+--------------+-----------+------  out
       -------------+------------------+--------------+------------------>  home

       the router's own time at each of the nine lines is pinned
```

The nine lines are four meridians off the headlands, out and home, the
nearest she comes to the light, and the finish. The router is timed at
each, from the gun.

### What is held (Larry, 14 November 2026; the boats, TBNM, 25 November, and TBRV, 27 November 2026)

| | what it checks | why |
|---|---|---|
| **rules** | Every step of every route against every piece of the coastline and each layer's clearance; each berth; the hand each mark was left on; each passing mark made; the start and the finish; each row handing on to the next. | By arithmetic of the test's own, that owes nothing to the router. The router keeps its water in a table of squares for speed; this goes through all of it. |
| **orderings** | A restriction never makes her faster: headlands to keep off, a wider berth, passing marks. A worse crew is never quicker. A five-minute step is never slower than a ten-minute one. | These must be so whatever the answer is. Every fault found in the search so far was found by one of them and not by a wrong number. |
| **pins** | The sixteen finishing times the documents and lessons quote, and the as-sailed run's time at each of the nine lines. | A change that moves one is seen, and must be made on purpose, with its reason in the CHANGELOG. |
| **boats** | 1. At full speed the router finishes ahead of every real boat's elapsed time in RORC's published results. 2. Level 3's crews (the generic polar times 0.5236, TBON) finish in order, crack, able, ordinary, green, and every one inside the real spread of the four 68-foot ocean racers, 43:56:37 to 48:43:24. | 1. Its boat is a generic 70 ft racing yacht with free tacks and a forecast it knows in advance. It should finish first. 2. Level 3 shows what good and bad crews look like on one boat; each should be a time a real crew made on the day. |

**RORC's times, and where they come from (Larry's ruling TBRV, 27 November
2026).** The test holds five elapsed times, each cited in the file: "Source:
RORC, Myth of Malham Race 2025 results (published on SailRaceHQ)". They are
PILOT's fact list, rows F1 and F3, which PILOT checked against RORC's results:

| Boat (by type; TBPS) | Elapsed | Fact |
|---|---|---|
| Ker 46, monohull line honours | 29:04:25 | F1 |
| 68-foot ocean racer A | 43:56:37 | F3 |
| 68-foot ocean racer B | 44:58:09 | F3 |
| 68-foot ocean racer C | 45:58:46 | F3 |
| 68-foot ocean racer D | 48:43:24 | F3 |

Finishing times only: no track, and no other boat data.

**The factor was fitted to these times, so part of the check holds by
construction.** TBON's factor, 0.5236, was chosen (TBOW) so that the able
crew finishes at the median of the four 68-foot ocean racers' times, 45:28:28.
An able crew inside their spread is therefore no finding. What the check
holds is the rest: the crews keep their order, and the best and the worst of
them stay inside what real crews did. They sit about 48 minutes apart, where
the real boats were 4 h 47 min apart; one factor cannot make beating cost
more than running, and Larry ruled that this is enough for the launch.

**If RORC objects,** the five times come out of the test (TBRV's undo). It
then holds the crews' order only, and says so on every run, and so does the
suite.

**Every comparison of two times allows two minutes,** which is what the search
cannot tell apart ("What the search can resolve").

### Why the real boats are held at the finish only

The real boats' times at the nine lines were worked out from the race's
tracker positions. Those positions had been fetched from a public replay site
by script, without its publishers' permission (PILOT's record, 25 November
2026). Under Larry's ruling TBNM the router is no longer compared with them,
and no time taken from them is quoted here. RORC publishes every boat's
finish, so the router is held to that.

What the stream at Hurst teaches still stands without the boats: Larry's own
chart readings show the model's ebb there about a quarter weaker than the
chart's ("The first run").

### What is not held, and why

1. **Single legs, and any time between the start and the finish.** RORC
   publishes the finish. The router makes the best passage, not the best of
   every leg.
2. **A model of the 68-foot ocean racers.** No polar for the class is
   published. Level 3's crews sail the generic polar slowed by one factor,
   which puts them among the real boats at the finish and says nothing about
   how the class sails a beat or a run.

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
   as-sailed run, so that each differs from it in one thing. Level 3's TBON
   crews are PILOT's own run files, read as they are and pinned.

### Running it, and changing a pinned time

    node docs/web/tests/race-2025.js                  all of it: about three minutes
    node docs/web/tests/race-2025.js boats pins       some parts
    node docs/web/tests/race-2025.js --show           print what it measured
    node docs/web/tests/race-2025.js --data <folder>  another copy of the data

The parts are `files`, `rules`, `pins`, `boats`, `crews`, `limits`, `steps`
and `motor`.
It sails the race sixteen times, so it is its own command and the full suite
runs it once, outside its loop over shells; it is not in the one-second gate.

**To change a pinned time:** change the router on purpose, say why in the
CHANGELOG, run with `--show`, and write the new figure into `FINISH` or
`AT_LINES`. **To move to a new file of PILOT's:** read what changed, run with
`--show`, and write the new checksum into `PINNED`.

## The motorboat of Levels 1 and 2

Board item B21, "fixed speed per leg, instead of a polar." It is sailed by
`docs/web/route/motor.js` from a MOTOR 1 file (COURSE.md).

**Larry, 14 November 2026:** "to illustrate the impact of each level's layer
of reality (tides, wind, weather), we map to the L3 waypoints and times, so
L1's sailing directions are derived from the L3 run." So Levels 1 and 2 are
not routed. They take Level 3's places and times, and show what one layer
less would ask of a boat that goes straight.

```
   Level 3, as routed     S ~~\/\/\~~~~~ W1 ~~~~\/\/~~~~~~~ W2 ~~~~~ ...
                          |               |                  |
   Levels 1 and 2         S ------------- W1 --------------- W2 ----- ...
                            rhumb lines, between Level 3's places,
                            to be sailed in Level 3's times
```

| | the water | her speed on each leg | what it shows |
|---|---|---|---|
| **Level 1** | still | rhumb distance over Level 3's time | what the times ask, with no tide |
| **Level 2, same speed** | the stream | Level 1's | how early or late the tide makes her |
| **Level 2, on time** | the stream | whatever keeps Level 3's time | what speed the tide asks for instead |

### Holding the line

```
                      she heads up
                     /
                    /  v (her speed through the water)
                   /
   W1 ============*=====================> W2   made good along the line
                  |
                  v  the stream's part across the line, cancelled
```

Each step she looks at the next waypoint from where she is. She splits the
stream into the part along that bearing and the part across it. If the part
across is less than her speed, she heads up into it by exactly enough to
cancel it (the angle whose sine is the part across over her speed). The part
along adds to, or takes from, what she makes good. She moves on the leg's own
flat chart, so a line she holds is held to a millionth of a mile.

**Where it cannot be done, it says so, and the report says when, where and
how far** (Larry: the teachable part). If the stream across her line is as
strong as she is, she cannot hold the line. She heads straight into the
cross-stream, which is the least she can be set, and she is set. When the
stream eases she makes for the waypoint from where she is, as a navigator
would, rather than regaining the old line. Her distance off the old line is
in every step of her track.

**There is no top speed** (Larry: "lets see what comes out the other side").
`on-time` halves its way to the least speed that arrives in time, so the
speed it reports is the least that will do.

### Where she may not go

She is held to the water Level 3 was held to: the run's layers and their
clearances, the berth round each mark (the finish buoy excepted, as in the
router), and the run's `avoid`s. **A rhumb line over any of it is refused**,
naming the leg and where it crosses. The refusal offers clearing waypoints
taken from where Level 3 went, Larry's "tack points". Each is a ready line
for the motor file. A clearing waypoint takes a share of its leg's time by
distance, so her speed does not change.

**A mark is an arc.** Level 3's closest point, plus a track point before and
after it. The arc grows a track point at a time while the line into or out of
it crosses something nearer the mark than that point is. COURSE.md, "A mark
is an arc", gives the reason and the limit.

### The 2025 race

On the Copernicus stream, Level 1's bare file, nine of PILOT's timing lines and
the Eddystone, is refused once. Leg 1 passes 0.08 nm from the low-water shore
in the Hurst narrows, and Level 3's tack at 11:00 clears it. The arc round the
Eddystone is 01:11, the closest point and 01:20. With the berth at 0.25 nm
(TBSH) Level 3's own track already keeps clear of it, so the arc takes no
extra point; at the old 0.10 nm it took one more on the way in.

| leg | to | nm | course | Level 3 time | Level 1 speed | Level 2, same speed | Level 2, on time |
|---|---|---|---|---|---|---|---|
| 1 | L3 tack 11:00 | 8.4 | 249 | 0h57 | 8.9 kn | 7 min early | 7.6 kn |
| 2 | Hurst narrows | 2.9 | 208 | 0h19 | 8.9 kn | 10 min early | 7.4 kn |
| 3 | St Alban's Head | 24.7 | 231 | 2h45 | 9.0 kn | 33 min early | 7.8 kn |
| 4 | Portland Bill | 15.3 | 275 | 1h54 | 8.1 kn | 31 min early | 8.9 kn |
| 5 | Start Point | 48.1 | 250 | 6h31 | 7.4 kn | 10 min late | 8.2 kn |
| 6 | Eddystone 01:11 | 24.4 | 269 | 2h46 | 8.8 kn | 6 min early | 7.9 kn |
| 7 | Eddystone, closest | 0.2 | 124 | 0h01 | 14.8 kn | 6 min early | 14.5 kn |
| 8 | Eddystone 01:20 | 1.9 | 124 | 0h08 | 14.9 kn | 6 min early | 14.5 kn |
| 9 | Start Point | 23.8 | 108 | 1h40 | 14.4 kn | 9 min early | 13.8 kn |
| 10 | Portland Bill | 50.7 | 064 | 3h46 | 13.4 kn | 34 min early | 11.7 kn |
| 11 | St Alban's Head | 16.8 | 065 | 1h12 | 14.1 kn | 45 min early | 11.8 kn |
| 12 | finish | 20.9 | 058 | 1h37 | 12.9 kn | 52 min early | 12.8 kn |

The same-speed column is how early or late she is at each waypoint, carried
from the legs before. Level 1 sails 238.1 nm of rhumb lines, against Level 3's
262.4 over the ground. In the stream at Level 1's speeds she finishes at
08:43, 52 minutes before Level 3. The Solent has a stream now, so she is
already early at Hurst.

**In 2025 she holds every line.** At 7 to 15 knots, no stream across her line
is as strong as she is. The "it cannot be done" case is held by
`tests/motor.js`, on a stream made to do it. These figures are pinned by
`tests/race-2025.js motor`.

### Running it

    node docs/web/route/motor.js <folder> <motor file> [--route <json>] [--json <file>]

The folder is the run's, as for `sail.js`, and the motor file is a name in
it, as a run is for `sail.js`. A name that is not in the folder is read as a
path, so a motor file kept elsewhere still works. `--route` takes the route
`sail.js --json` wrote for the same run, so it is not sailed twice. A route of
another run is refused. `--json` writes what PILOT draws: every waypoint with
Level 3's time, and every leg with its step-by-step track (heading, stream,
course and speed over the ground, distance off the line) and where she could
not hold it. A refusal is written too, with the crossings and the waypoints
offered. Exit 0: sailed, even if she did not arrive, which is itself an
answer. Exit 1: refused, with the reason. Exit 2: not asked properly.

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
5. **The forecast is taken as the truth,** and the stream grid as the stream:
   in 2025 a model, which runs light at Hurst ("The first run").
6. **She tacks, and gybes, only at a step.** Ten minutes apart, in these
   runs. A layline is therefore judged to within a few minutes, never
   exactly.
7. **A minute or two is not a finding, and the time itself is good to about
   ten minutes in a day.** A step under five minutes buys nothing. See "What
   the search can resolve".
8. **Of the rocks round the Eddystone, only the NE Rock is in the files.**
   The coastline is EMODnet's, which does not hold them. PILOT's
   `eddystone-reef` layer is a keep-out area round the NE Rock, which dries
   1 m, and both as-sailed runs switch it on. The reef's outline stays on the
   chart. (Until 14 November this item said no rock was in the files.)
9. **The isochrones are positions, not a drawn line,** and after a rounding
   they hold only the boats that have rounded ("The isochrones").
10. **It is not for navigation.** It is for understanding a race after it was
    sailed, and for asking what a different choice would have cost.

## Running the checks

    node docs/web/tests/route-vector.js     the vector step
    node docs/web/tests/polar.js            the polar
    node docs/web/tests/route-step.js       one step, against hand-worked answers
    node docs/web/tests/router.js           whole routes small enough to sail in your head
    node docs/web/tests/passagelog.js       the passage log, on rows written by hand
    node docs/web/tests/sail.js             a run sailed from its name, and the refusals
    node docs/web/tests/course.js           the course, areas, run, crew and passage files
    node docs/web/tests/motor.js            the motorboat of Levels 1 and 2, worked by hand
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

The isochrones are checked on the same courses. On the beam reach it can all
be worked out: she makes ten knots at best, so after one hour nothing is more
than ten miles from the start line, and the farthest east is ten miles out.
Everywhere else they are held to the rule that makes them worth drawing: the
route runs through every one, so where she was at that hour is one of the
positions the line holds, on the leg she was on. `race-2025.js` holds every
route it sails to the same rule, and to one line for every hour. How many
positions a line holds cannot be worked out, so the counts on the reach and the
beat are pinned. Twenty-four faults were put in one at a time: the line of the
step before, the time a step early, latitude and longitude changed over, the
leg wrong, positions thinned or left out, a line every step, a line after the
finish, only the steps that land on the hour, the isochrones left out of the
file or written a figure to a line. Each is caught. One got past at first, the
last three positions left out, and the pinned counts were added for it.

The bounds are checked on a coast of their own: a line two miles north of the
course that stops a mile west of the start. Without bounds the search goes
round its end and holds positions on the land behind it; with them it holds
none, the route is the same row for row, and a start, a finish or two boxes
that do not meet are refused by name. Eight faults were put in, in the reader
and the router, and each is caught.

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

The real race is checked in `race-2025.js`: 104 checks while the real boats'
finishes are not yet held (55 in the files, rules, pins, boats and crews parts,
and 49 in limits, steps and motor). Its own checks were proven the same way,
with faults put only into scratch copies of the router and of PILOT's data,
never into either repository. In the router: the coastline clearance ignored,
no berth, the stream not sampled, a crew not charged, a plan's berth or its
passing marks ignored, an `avoid` dropped. In the data: a pinned file changed
in place, the folder taken away. Each is caught by the check meant for it. The
faults once put into the real boats' leg times went with those times, under
TBNM ("Why the real boats are held at the finish only"); the finish check that
replaced them was tried both ways, empty and with a boat level with the router,
which it catches. One got through at first. A router that ignored the
plan's berth passed, because the test read the berth from the route's own
summary and so held it to the figure it had used; it now reads what was asked.

The crew file's reader is checked in `course.js`, with the other formats:
seven faults, among them shares that need not add to 100 and a level allowed
to have no gybe line.
