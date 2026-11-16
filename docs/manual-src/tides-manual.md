# TIDES
## Harmonic tide prediction, offline, for 8,334 stations

**Version {{VERSION}}** — no network, no subscription, nothing that expires.
With nine coastal work calculators that show every step.

---

## 1. What this is, and why it is built this way

TIDES predicts the tide at a chosen station: the day's high and low water, the
curve between them, and the two questions a boat actually asks of a tide. It
runs as a POSIX shell tool and as a browser app, from the same arithmetic.

Four constraints shaped it, and each has a consequence worth knowing.

**1. It must work with the antenna down.**
Consequence: the harmonics ship with the program. There is no service to call,
no subscription to lapse, and no year in which it stops working.

**2. The arithmetic must be checkable.**
Consequence: every calculator prints its working, line by line, and the browser
prints the *same lines as the shell, character for character*. A test compares
them on every worked case. One set of arithmetic to trust, checked two ways.

**3. A prediction must never be dressed up as more than it is.**
Consequence: a subordinate station says **SECONDARY** on the screen and names
its reference. An extrapolated figure says **EXTRAPOLATED**. A course that
cannot be made good says so instead of printing a number.

**4. It is a teaching tool as much as an answer.**
Consequence: the working is the point. A student who has watched the arithmetic
once can do it with a pencil on a chart, which is the condition that matters
when the battery is flat.

---

## 2. Choosing a station, and why not a position

**A tide is not computable from a position.** It depends on the shape of the
coast and the depth and resonance of the basin, so every place needs constants
that somebody measured there. The nearest station in a straight line can be on
the wrong side of a headland, and a river station can be nothing like the water
outside it.

Two kinds of station, and the difference matters:

| | |
|---|---|
| **Reference** | constants measured there; the curve is a real synthesis |
| **Subordinate** | no constants; carries time and height corrections to a reference station, exactly as a paper tide table has always worked |

For a subordinate station the turns are the reference's turns corrected, and
the curve between them is a half cosine. **There is no honest way to synthesise
a continuous curve out of offsets, and this program does not pretend to** — it
says SECONDARY and names the reference.

### Finding one

![**Figure 2** - the station picker. The reason a position is not enough is at
the top of it, where it is read rather than looked up.](fig/tides-pick.png)

Nobody guesses a station's exact name: the database calls a place
`NEW LONDON  State Pier`. So type part of it and pick from the list. Every word
has to appear somewhere in the name, state or country, in any order and
anywhere inside a word, so `lon new` finds New London as well as `new london`.

The text becomes a regular expression the moment it contains any of
`^ $ . [ ] | ( ) * + ? { } \` —

    tides find "^st mary"        names that start with St Mary
    tides find "bay$"            names that end in Bay
    tides find "falmouth|mystic" either one

A pattern that is not valid is searched as plain text rather than refused.

**Times are the station's own standard time.** No summer time, exactly like a
printed table. GMT for the UK, all year.

---

## 3. The two questions a boat asks

![**Figure 1** - a day at a reference station: the turns, the curve, and the
heights above chart datum. The banner says REFERENCE, so these are computed
from constants measured here rather than offset from somewhere
else.](fig/tides-day.png)

### Is there enough water?

Charted depth **plus** the tide, against your draught and whatever you want
under the keel — with the stretches of the day when it is there.

**That sum needs the tide measured from the chart's own zero,** chart datum,
because the charted depth is. So every table names the zero its heights are
from, on the height column itself:

| The heading says | What it means | Where |
|---|---|---|
| `above chart datum` | the zero of the chart and of the printed tide table | Portsmouth, Weymouth, Devonport, Cherbourg, Brest and Le Conquet, each held to figures its hydrographic office published |
| `above MLLW, the chart datum` | NOAA's own published datum, which American charts use | every NOAA station |
| `above a computed LAT, not chart datum` | a lowest tide worked out from the tide's constants. It can sit either side of the chart's zero | most other stations |
| `above mean sea level, not chart datum` | no low-water zero at all | 315 stations |

At a station that is not on chart datum the depth sum carries a caution: against
the chart it can be more than half a metre out, either way. Among 132 British
and French stations measured, the widest read 0.61 m high and 1.40 m low. The
verdict is still given; the caution says how far to trust it. Use the printed
tide table for the port where the answer matters.

### Does the mast go under?

Charted clearance, **plus the level the chart measures it above, minus** the
tide, against your air draught.

![**Figure 8** - the two sums. A depth is charted below chart datum and the tide
adds to it. A clearance is charted above a high-water level, here HAT, so the
room under the bridge is the charted figure, plus that level, less the tide.
HAT and the tide are measured from the same zero, so in the clearance sum the
zero cancels.](fig/tides-two-sums.png)

**Which level is on the chart, in its notes, and it is the first thing to
read.** A British chart says "Overhead clearance heights are above Highest
Astronomical Tide". An American chart measures them above mean high water. Some
older charts, and some other countries, use mean high water springs. So the
tool asks, and offers the station's usual one:

| You choose | The level | Offered at |
|---|---|---|
| `hat` | Highest Astronomical Tide: the highest tide predicted in nineteen years | every station but NOAA's |
| `mhw` | mean high water: the mean of every high water in those years | NOAA stations |
| `mhws` | mean high water springs: the mean level + M2 + S2 | on request |

The working prints the level and its height, so both can be checked against the
chart's note and an almanac. At Portsmouth an 18.0 m clearance above HAT, with
HAT at 5.18 m and the tide at 2.62 m, leaves 18.0 + 5.18 − 2.62 = 20.56 m.

**The signs are opposite, and that is the trap.** The tide adds to a depth and
takes away from a clearance. Getting that pair the wrong way round is the
classic way to put a mast into a bridge. They are therefore separate functions
in the engine and separately labelled on the screen, rather than one function
with a sign argument.

**Where a station has no level, no clearance is worked.** Sixty reference
stations have no real tide, or are river gauges where a season's rise and fall
swamps it. The tool says so there.

---

## 4. Command reference (shell)

| | |
|---|---|
| `tides` | the menu |
| `tides near <lat> <lon>` | the stations nearest a position |
| `tides find <text>` | search by name |
| `tides use <id>` | choose a station |
| `tides today [date]` | the day's table, curve and depth helper |
| `tides sky [date]` | the same, with the moon and sun panel |
| `tides work <name> k=v …` | coastal navigation, working shown |
| `tides where` | which station is chosen, and where the files are |
| `tides day\|night\|plain` | colour mode |
| `tides about` | what this is, where the data comes from |
| `tides version` | |

Dates are `YYYY-MM-DD`.

In the browser the same things are on screen, and a URL opens any calculator
directly — see section 6.

---

## 5. The nine coastal calculators

Each shows its working step by step, because the point is teaching. They are on
the day screen and the station picker in the browser, and are `tides work
<name>` in the shell.

### 5.1 `twelfths` — height at a time

The hourly twelfths table (1, 2, 3, 3, 2, 1), the height by the rule of
twelfths, and the height by the cosine method

        h = h1 + (h2 - h1) x (cos A + 1) / 2
        A = 180 x ((t - t1) / (t2 - t1) + 1) degrees

with the difference between them. Two forms: give the four turn values, or give
a station and let the harmonic prediction supply the turns — then you get three
answers side by side, twelfths, cosine and the harmonic height itself.

HW before LW is a **falling** tide. The pair of turns used is the one less than
twelve hours apart, so a tide crossing midnight works.

![**Figure 3** - the rule of twelfths worked out, with the cosine height beside
it and the difference between the two stated. The working is the deliverable:
a reader who has watched it once can do it on paper with the tide table
alone.](fig/tides-twelfths.png)

    tides work twelfths lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 t=08:30

### 5.2 `secondary` — a secondary port from its standard port

Give the HW part, the LW part, or both.

1. **Time differences** are interpolated round the clock. The almanac gives
   them for two standard-port times and the same again twelve hours later, so
   times are taken **modulo 12 hours** and interpolated linearly round that
   circle.
2. **Height differences** are interpolated by the **standard port's HW height
   between MHWN and MHWS** — not by range. That is the RYA method.
3. Outside those limits the line is carried on and the working says
   **EXTRAPOLATED**.
4. The time difference is rounded to the nearest minute.

### 5.3 `stream` — a rate between neaps and springs

        rate = nps + (range - nprange) / (sprange - nprange) x (spr - nps)

Beyond springs or below neaps the line is extrapolated and flagged. A rate that
would come out below zero is taken as 0.0 kn and says so.

    tides work stream spr=2.6 nps=1.4 range=4.1 sprange=5.9 nprange=3.1

### 5.4 `atlas` — which page of the tidal stream atlas

Which page applies, as hours from the **nearest HW** at the atlas's standard
port: `HW -3` … `HW` … `HW +6`. Each page covers thirty minutes either side of
its hour, and **exactly half past goes to the later page** — HW +0:30 is page
HW +1, HW −0:30 is page HW.

Then the range of the tide you are in, and where it sits between mean neaps and
mean springs. The means are the Admiralty definition taken from the station's
own constants, springs 2(M2 + S2) and neaps 2(M2 − S2) — given only where the
tide is semidiurnal, which is a form factor (K1 + O1)/(M2 + S2) up to 0.25. At
a secondary port, or a mixed or diurnal tide, the working says the means are
not available **and why**, and gives the range alone.

### 5.5 `cts` — course to steer

Over several hours the stream vectors are **summed and the triangle solved
once**, as taught — not solved hour by hour.

1. The working gives the water track and heading to a tenth of a degree; the
   answer is the whole degree to steer.
2. **Leeway is applied into the wind.** `wind=port` means the wind is on the
   port side, so she is set to starboard and heading = water track − leeway.
   `wind=stbd` is the other way.
3. Then magnetic = true − variation, and compass = magnetic − deviation.
   Variation and deviation are **east positive**, so `var=-2` is 2° W.
4. If the stream sets her across the track faster than she sails, the answer is
   **"cannot make good this track"**, with the working that shows why.

    tides work cts track=045 stw=6 streams=135:1.5,150:2.0 leeway=5 wind=port

![**Figure 4** - that example worked: the streams summed, the triangle solved
once, leeway applied into the wind, then variation and deviation. The drawing
is the same triangle, with the ground track, the water track and the stream
each carrying their own number of arrows so they are told apart with no colour
at all.](fig/tides-work.png)

### 5.6 `setdrift` — set and drift from a DR and a fix

The DR runs from the start along the water track; the vector from the DR to the
fix over the time run is the set and drift, and rate = drift / hours. Plane
sailing at the mean latitude, which is right for coastal distances — it is
**refused beyond latitude 80**. The antimeridian is handled.

With no leeway given, the set and drift found **includes any leeway too**, and
the working says so.

### 5.7 `tidal_gate` — when a headland opens and shuts

A headland where the stream runs hard is a gate: open while the stream is with
her, shut while it is against her. A navigator finds the times in one of two
ways, and this takes both.

**From the stream atlas.** Give her track past the headland and the set and
rate there on each atlas page, `HW -6` to `HW +6`. On each page the stream is
resolved along her track,

        along = rate x cos(set - track)        with her +, against her -

and the gate turns where that passes zero, found between two pages by a
straight line, as it is done with a pencil. `foul=0.5` keeps the gate open
while the stream is no more than half a knot against her.

**From the pilot book.** "The west-going stream begins at HW Portsmouth +5"
is `opens=5`; give `shuts` the same way. When `shuts` is not after `opens`
the gate opens on one tide and shuts on the next.

1. **The high water** is typed (`hw`, and `hw2` for the next one if the tables
   give it) or predicted at a station. Without `hw2` the tides are taken as
   12 h 25 min apart, the mean, and the working says so.
2. **A window that runs across low water, and why all thirteen pages
   matter.** Many gates open late on one tide and shut early on the next:
   open from about HW +3, through low water, to about HW -3 of the tide that
   follows. On one tide's pages alone that window is in two pieces, its end on
   the first pages and its start on the last:

   ```
    the tide before      this tide                              the next tide
    +3 +4 +5 +6    -6 -5 -4 -3 -2 -1 HW +1 +2 +3 +4 +5 +6    -6 -5 -4 -3
     .  =  =  =     =  =  =  .  .  .  .  .  .  .  =  =  =     =  =  =  .
        |<-- one window -->|                      |<-- the next window -->|
        opens on the       shuts on               opens on            shuts on
        tide before        this tide              this tide      the next tide

    = with her, the gate open        . against her, the gate shut
   ```

   An atlas page gives the stream at so many hours from high water, whichever
   high water that is. So when all thirteen pages are given, the same thirteen
   are laid down three times: against the high water before, against this one,
   and against the one after. The opening is then found between two pages of
   one tide and the shutting between two pages of the next, and the window is
   given whole, as `OPEN  18:18 to 00:39 next day`. The working names the tide
   each page belongs to: `HW -3 of the next tide (23:57)`.

   The high waters either side are the ones from step 1: typed, predicted, or
   taken as 12 h 25 min away. HW +6 of one tide and HW -6 of the next are then
   25 minutes apart, and both are used. If two high waters are twelve hours
   apart or less, a page that would fall at or before the one already laid
   down is left out.

   **With fewer than thirteen pages nothing is laid down again,** because what
   the missing pages say is not known. If the stream is already with her on
   the first page given, the working says `it is already open on HW -6, the
   first page given: when it opened is on an earlier page`, the answer is
   `open until 14:18`, and the strip marks every time outside the pages with
   `?`. The other end is treated the same way: `it is still open on HW, the
   last page given: when it shuts is on a later page`, and the answer is `open
   from 13:24`. An end that cannot be seen is reported as **not on the pages
   given**. It is never guessed.
3. `t` is when she expects to be there: the answer says OPEN or SHUT, how
   hard the stream is running, and how long until it turns.
4. `dist` and `sog` together give the passage to the gate, and from that
   **when to leave** to arrive while it is open.
5. **It is worked from the figures as printed.** The stream along her track is
   taken to a hundredth of a knot and a turn to the whole minute, and every
   later step uses the printed figure, so a student with the working and a
   pencil gets the same minute.

The two forms, for the same headland. The first is one command: each `\`
only carries it on to the next line of this page.

```
tides work tidal_gate hw=14:32 track=255 t=17:00 dist=22 sog=7 \
streams=075:2.2,078:2.6,080:2.0,085:0.9,250:0.4,255:1.5,258:2.4,\
260:2.7,258:2.1,255:1.0,080:0.3,078:1.4,076:2.1

tides work tidal_gate hw=14:32 opens=5 shuts=-1 t=17:00 dist=22 sog=7
```

![**Figure 6** - the first example worked. The bars are the stream along her
track on each atlas page, above the line with her and below it against her, so
the two are told apart with no colour at all; the strip beneath is the gate by
the clock, with high water and the time she is there marked on
it.](fig/tides-gate.png)

*When* the stream turns does not depend on springs and neaps; how hard it runs
does, and `stream` (5.3) gives the day's rate. And a gate here is a place and
a time, not a passage of miles through it.

### 5.8 `lunar` — springs and neaps

Where the day sits in the Moon's month, when springs and neaps fall, how big
today's tide is, and the tide coefficient. It works from the Moon and from the
tide tables, with whichever part it is given; a station supplies both.

**From the Moon.** Give a `date`. It gives her age, the last and the next of
her four phases, and the rule of thumb:

        springs follow new and full moon by a day or two
        neaps follow the quarters the same way

with the dates that gives, and whether the tides are **making** (growing
toward springs) or **taking off** (falling toward neaps). The phases are given
to the hour: the engine's series for the Moon is a short one.

**From the tide tables.** Give today's `hwh` and `lwh` at the standard port
(or the `range`), and the port's `sprange` and `nprange`. It places the day
between mean neaps and mean springs, with the same figures `stream` (5.3)
takes for the rate.

**The coefficient.** Give Brest's heights, `brhwh` and `brlwh`:

        coefficient = 100 x the range at Brest / 6.10 m

45 is mean neaps and 95 mean springs. The coefficient is Brest's by
definition, and French almanacs print it for every tide.

**At a station** everything is predicted, and two things are added beside the
pencil work:

1. **Springs and neaps as they are found.** The biggest and smallest tides
   round the day are found in the prediction and set beside the rule, with how
   far they fell from it. The rule is right on average and can be two or three
   days out for any one Moon. Round the new moon of 27 May 2025 the biggest
   tide at Brest came that same evening, and at Portsmouth the evening before;
   the rule says the 28th to the 29th.
2. **The coefficient both ways.** By pencil, from the heights a tide table
   prints; and as an almanac prints it, which is the same sum on the part of
   the tide that comes twice a day. The two can differ by up to 6 points,
   because the once-a-day part makes one tide of each day bigger than the
   other and the almanac leaves it out. Brest is predicted for this whatever
   the station.

The range of a tide at a station is its high water less the mean of the low
waters either side of it.

```
tides work lunar date=2025-05-24 brhwh=6.07 brlwh=1.26
tides work lunar date=2025-05-24 hwh=4.3 lwh=1.1 sprange=3.9 nprange=1.9
tides work lunar station=ticon/brest-3-fra-refmar date=2025-05-24 t=14:00
```

![**Figure 7** - the third example. The strip is the Moon's month, thirty days
with the day in the middle: her four phases, and a band where the rule of
thumb puts springs and neaps. The bars above it are the range of every tide,
and a dot marks each biggest and smallest tide found: round the new moon the
dot sits ahead of the rule's band. The dashed lines are mean springs and mean
neaps, labelled in the margin to the right so that no label hides a bar. The
day's label carries its working, not a bare number.](fig/tides-lunar.png)

`coef=`, the coefficient an almanac prints, may be carried in a link: it is
checked and noted, and not used yet.

### 5.9 `depth` — the depth over a shoal, and the window to cross it

A bar, a sill or a bank lies on her way. Two things are wanted: how much water
there is over it at a given time, and between what times there is enough. This
works both, and shows the arithmetic a navigator does on the chart table.

**The height of tide she needs** is a sum:

        over a charted depth    draught + clearance - charted depth
        over a drying bank      draught + clearance + drying height

A chart prints a drying height as an underlined figure, so the shoal is given
by one of two names, `depth` or `dries`, exactly one, each as the chart prints
it. No minus sign is ever typed. `clear`, the clearance under the keel, is hers
to choose and must be given; `clear=0` is the moment she touches.

**When the tide reaches that height** is worked by two rules, side by side:

1. **The twelfths.** The hour-by-hour table, then a straight line inside the
   tidal hour that holds the height.
2. **The cosine curve,** turned round to give the time. The curve is a point
   going round a circle, half a turn from one turn of the tide to the next.
   The height tells how far round it is, and that fraction of the half turn is
   the fraction of the time.

One low water and one high water give one edge of the window: when it opens on
a rising tide, or shuts on a falling one. Give the low water after as well
(`lw2`, `lw2h`) and the window has both its edges. Give a time (`t`) and the
depth then is worked too.

**The answer is what both rules agree on:** the later opening, the earlier
shutting and the lesser depth. Each rule's own figures are printed above it.

**At a station** the tool takes the low water, high water and low water round
the time asked, works the two rules on them, and adds its own prediction as a
third. The prediction carries the shape a real tide has. Both rules assume a
regular tide of about six hours, and where it stands or has a double high
water, as in the Solent, they are wrong: at Portsmouth on 24 May 2025 they
open the window 13 minutes before the prediction does and shut it 25 minutes
early. The answer takes the latest opening and the earliest shutting of the
three. Where a station's heights are not above chart datum the working says
so, as section 3 explains.

```
tides work depth dries=0.3 draught=1.8 clear=0.5 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 lw2=17:40 lw2h=0.9 t=09:00
tides work depth depth=0.6 draught=1.8 clear=0.5 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2
tides work depth depth=1.0 draught=1.8 clear=0.5 station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00
```

![**Figure 9** - the first example. Three drawings on one height scale, so the
height she needs, 2.60 m, is a single line through all of them. On the left,
the circle the cosine curve comes from: the point has gone 93 of the 180
degrees round, so 0.519 of the time from low water to high. In the middle, the
tide against the clock, the twelfths as dots joined by straight lines, with
the window shaded. On the right, her keel: draught, clearance and the bank,
stacked from chart datum.](fig/tides-depth.png)

It does not allow for the weather, a swell or squat, and it does not know the
chart: the depth and the clearance are hers.

---

## 6. Linking into a calculator, and the parameter contract

In the browser, a URL opens any calculator directly:

    ?work=cts&track=045&stw=6&streams=135:1.5,150:2.0&lesson=l3-2025-4

The coastal navigation course deep-links into these from its lessons, so **the
parameter names are a contract**: a name is never renamed or given a new
meaning. `docs/web/tides/WORK.md` is the authoritative list, with every unit
and default.

### Common rules

| | |
|---|---|
| angles | degrees **true**, 0–360 (`360` reads as `0`) |
| speeds | knots |
| heights, ranges | metres |
| distances | nautical miles |
| times | `HH:MM`, or `HHMM` |
| positions | `lat,lon` decimal degrees, **south and west negative** |
| dates | `YYYY-MM-DD` |
| variation, deviation | degrees, **east positive** |

**A `+` in a query string is a space.** A browser reads `tdhw2=+5` as
`tdhw2= 5`. Write positive values unsigned, or as `%2B5`.

**Every value is checked.** An unknown parameter, a value that is not a number,
an angle outside 0–360, an impossible date: the page shows one plain sentence
naming the parameter and works nothing. **It never shows a partial answer from
bad input.**

---

## 7. Where the numbers come from

1. **Seventy constituents**, with their satellite and shallow-water terms,
   UTide-generated. They are **dumped from the engine's own runtime strings**
   and never retyped by hand.
2. **The browser is a port of the shell engine,** line by line, and checked
   against it. Heights agree to about a femtometre and the turning times are
   exact.
3. **The shell engine is held to an independent Python working** of each
   method. So the browser is checked against the awk, and the awk against
   something that shares none of its code.
4. **The zero at the six ports on chart datum is each port's mean sea level
   above chart datum,** from its own gauge, held to published figures: Shom's
   mean level at Brest and Le Conquet, the Admiralty's springs level at
   Portsmouth, and chart datum's height against Ordnance Datum at the three
   British ports. Cherbourg's published mean level is still to be checked.
5. **HAT and mean high water come from nineteen years of the tool's own
   prediction,** 2007 to 2025, and are held to what NOAA publishes for three
   of its stations: within 15 mm on all six figures.
6. **The pictures are the one place the builds differ on purpose:** the shell
   draws characters, the page draws SVG from the same numbers, and the SVG's
   points are read back and checked against the geometry they claim.

---

## 8. Offline, and how the station data is shipped

![**Figure 5** - the foot of the About screen: where the data comes from, and
the Offline panel, which says what is actually in the cache rather than what
should be. On a first visit it says so plainly: not yet cached, and on the
last line, not installed, served from the network.](fig/tides-about.png)

The station file is 2.9 MB, which is not something to download before the app
will draw anything. So an index of every station — name, region, country,
position, and the **byte offset and length** of its line — loads at startup, and
one station's constants come out of the big file with a range request of a few
hundred bytes.

Three things about that are easy to get wrong, and are worth knowing if you
ever see odd behaviour:

1. **The offsets are byte offsets.** Four station names are not ASCII, so the
   file is held and sliced as bytes. Slicing a decoded string by a byte offset
   lands mid-line for every station after Saint Barthélemy.
2. **A partial response must never be cached as the whole file.** Stored under
   the main file's name it would make every later read return a few hundred
   bytes, and the failure looks like corrupt data rather than a caching
   mistake.
3. **The station file is cached on first successful fetch,** not at install —
   one large file in the install list fails the whole install on a flaky
   connection, and then nothing at all is cached. The About screen has a button
   that fetches it with a progress bar.

**Prove it once at the dock:** open a station, turn the network off, relaunch
from the icon.

---

## 9. Accuracy, and what it does not know

**Nothing here knows about the weather.** A deep low or a hard onshore blow
moves the real water by half a metre or more, and a river in flood moves it
further. Harmonics predict the **astronomical** tide and nothing else.

A few other limits worth carrying in your head:

1. **A subordinate station's curve is a half cosine** between corrected turns.
   It is a tide table's answer, not a synthesis.
2. **Mean springs and neaps are only given for a semidiurnal tide** at a
   reference station. Elsewhere the program says why it will not give them.
3. **Set and drift is plane sailing** at the mean latitude, refused beyond 80°.
4. **The twelfths rule is a rule of thumb**, which is why the cosine method and
   — at a station — the harmonic height are printed beside it. Where they
   disagree, the harmonic height is the better number.
5. **Most stations are not on chart datum,** and the heading of every table
   says which are (section 3). A height from a computed zero is right in its
   range and its times and can be decimetres out in its level.
6. **A port on chart datum is good to a few centimetres, not millimetres.** Its
   mean sea level comes from one to five years of readings some years ago, and
   the sea has risen since.
7. **HAT here is computed,** not copied from a chart. It agrees with published
   figures to a centimetre or two where it could be checked.

---

{{INCLUDE:common-display-modes.md}}

---

## 10. Cautions

**This is a training and cross-checking aid, not a substitute for judgement.**

Where this program and the published tide tables for the port differ, **the
published tables are right and this is wrong.** The same goes for the almanac,
the tidal stream atlas and the chart.
