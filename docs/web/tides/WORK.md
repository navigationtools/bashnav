# tides — the coastal work calculators: the URL contract

This file is **the authoritative contract** for linking into the nine coastal
navigation calculators in the browser build of `tides`. The coastal navigation
course deep-links here from its lessons, so the parameter names below are
fixed: a name is never renamed or given a new meaning. New parameters may be
added; existing ones stay as written.

The same names work in the shell tool, as `key=value` arguments:

    tides work cts track=045 stw=6 streams=135:1.5,150:2.0
    https://bashnav.navigationtools.org/web/tides/?work=cts&track=045&stw=6&streams=135:1.5,150:2.0

Both builds print the same working, line for line, and
`docs/web/tests/tides-work.js` checks that they do.

## How it fits together

```
  course lesson l3-2025-4               bashnav.navigationtools.org/web/tides/
  +----------------------+   link       +-------------------------------------+
  | "work this example"  | -----------> | ?work=cts&...&lesson=l3-2025-4      |
  +----------------------+              +------------------+------------------+
            ^                                              |
            |                                              v
            |                           WORK.fromQuery()  [[key, value], ...]
            |                                              |
            |                           station needed? -> load it (atlas,
            |                                              |  twelfths by station)
            |                                              v
            |                           WORK.run(name, params, ctx)
            |                              |            |             |
            |                              v            v             v
            |                          the working   the figure    a refusal,
            |                          (same lines   (SVG, built   in words, if
            |                           as the       from the      a value is
            |                           shell)       numbers)      wrong
            |                                              |
            |     lesson=l3-2025-4 checked against         |
            +------- the lesson-name pattern, then <--------+
                     COURSE_BASE + "l3-2025.html#l3-2025-4"
                     "Back to the lesson"
```

**Why the working is the same text in both builds.** The point of these tools
is teaching: a student who has watched the arithmetic once can do it with a
pencil on a chart. The awk tool is the reference — its numbers are checked
against an independent Python working of each method — and the browser is a
port of it. Holding the port to the awk's exact lines catches every rounding,
every sign and every message in one comparison.

## What a lesson may call, and what it may not

`work.js` is a shared engine as well as the tides page's own file: a lesson in
the course is served from this origin, loads it directly, and runs a worked
example inline. Board item B10 made the promise explicit, and the file states
it as four lists at the top:

| list | what it is |
|---|---|
| `WORK_SHARED` | `NAMES`, `SPEC`, `run`, `figure` — the surface a lesson may call. Changing one of the four travels with a note to the course's inbox |
| `WORK_HOST` | everything else exposed: the tides page's and the tests'. It may change without warning |
| `WORK_PURE_CALLS` | `sind`, `cosd`, `asind` — the only tide-engine calls the pure calculators make |
| `WORK_PURE_WORK` | `twelfths` (typed times), `secondary`, `stream`, `cts`, `setdrift`, `tidal_gate` (typed `hw`), `depth` (typed turns) — the seven that stay inside that boundary |
| `WORK_MOON_CALLS` | `jdate`, `jd2cal`, `sunLon`, `moonLon`, `moonPhase` — the calendar and the Moon: five more engine calls, for `lunar` alone (Larry, 16 November 2026) |
| `WORK_MOON_WORK` | `lunar` (its typed forms) — may make the three calls above and these five, and nothing else |

**What the boundary buys a lesson:** those seven can be worked without the
2.9 MB of station data, which would otherwise have to be downloaded before a
student could see twelfths done. `atlas`, and `twelfths`, `tidal_gate` or
`depth` with `station=`, need the real engine and stay links into the full app.

**`lunar` on a lesson's page.** Its typed forms need the calendar and the Moon
as well as the three trig calls. None of the five touches station data, and a
lesson gets them all by loading `engine.js`, which is 22 KB of code. The seven
calculators above are still held to the three calls alone, so a page that
supplies only those runs them exactly as before. `lunar` with `station=`
stays a link into the full app.

**It is checked by running, not by reading.** `docs/web/tests/work-engine.js`
runs every pure case against a tide engine that answers those three calls and
records any other property asked for — a grep for `T.` would pass a call made
through a helper and fail on a mention in a comment — and it proves it is
watching by showing that `atlas` does reach past them.

## Common rules

| | |
|---|---|
| angles | degrees **true**, 0–360 (`360` is read as `0`) |
| speeds | knots |
| heights, ranges | metres |
| distances | nautical miles |
| times | `HH:MM`, or `HHMM` (four digits) |
| positions | `lat,lon` in decimal degrees, **south and west negative** |
| dates | `YYYY-MM-DD` |
| variation, deviation | degrees, **east positive, west negative** (`var=-2` is 2° W) |
| `lesson` | optional, on every calculator: see below |
| `work` | which calculator: `twelfths secondary stream atlas cts setdrift tidal_gate lunar depth` |

**A `+` in a query string is a space.** Browsers decode `tdhw2=+5` as
`tdhw2= 5`. Write positive values unsigned (`tdhw2=5`) or as `%2B5`; an
unsigned number is positive, and a leading space is trimmed, so both work.

**Station ids** are as the tool lists them, e.g. `ticon/dover-dov-gbr-bodc`,
`ticon/southampton-sou-gbr-da_idh`, `noaa/8452660` — letters, digits and
`_ . / -`. A `/` may be written as-is or as `%2F`.

**Times at a station** (`t` and `date` for `atlas` and the station forms of
`twelfths`, `tidal_gate`, `lunar` and `depth`) are the station's own **standard time** — GMT for the UK, with no
summer time — exactly as every other `tides` screen and a printed tide table.

**Every value is checked.** An unknown parameter, a value that is not a
number, an angle outside 0–360, an impossible date or time: the page shows one
plain sentence naming the parameter, and works nothing. It never shows a
partial answer from bad input.

### `lesson` and `COURSE_BASE`

When the URL carries `lesson=<name>`, every result screen shows **Back to the
lesson**, linking to

    COURSE_BASE + <the name without its lesson number> + ".html#" + <name>
    lesson=l1-3        ->   .../practical-navigator/coastal/l1.html#l1-3
    lesson=l3-2025-4   ->   .../practical-navigator/coastal/l3-2025.html#l3-2025-4

**A lesson's name** is Larry's decision of 11 November 2026, relayed by
practical-navigator: the level, the race year where the level has one, and the
lesson number.

| | Shape | Example |
|---|---|---|
| Level 1, shared by both race years | `l<level>-<n>` | `l1-3` |
| Levels 2 to 5, one track per race year | `l<level>-<year>-<n>` | `l3-2025-4` |

**The page is derived from the name,** by removing the trailing lesson number.
What is left is the track - a level, or a level and its year - and that is the
page the lesson sits on. The alternative was a table mapping names to pages,
which is a second copy of the same fact and drifts the first time a page is
renamed (README rule 8: derive rather than keep two copies).

`COURSE_BASE` is defined **once**, at the top of `docs/web/tides/work.js`.
It points at the course's coastal section on this same origin, where The
bashnav Practical Navigator lives; the first draft of this contract named
`navigationtools.org/coastal/`, from before the move, and was corrected
before it was applied:

    var COURSE_BASE = 'https://bashnav.navigationtools.org/practical-navigator/coastal/';

**What is accepted,** checked **before** any link is built, so nothing from
the URL reaches an href unless it is exactly a lesson name:

    ^(l1-[1-9][0-9]*|l[2-5]-20[0-9]{2}-[1-9][0-9]*)$

This is stricter than the pattern practical-navigator proposed
(`^l[1-5](-20[0-9]{2})?-[0-9]+$`), in three ways, each of them so that a
lesson has exactly **one** name - which is their own reason for putting the
year in the name at all:

1. **A year is refused for Level 1** (`l1-2025-3`) and **required for Levels 2
   to 5** (`l3-4` is refused), so one lesson cannot be reached by two names.
2. **The lesson number carries no leading zero** (`l1-03`) and is not zero
   (`l1-0`), for the same reason.
3. **The year is four digits beginning `20`** (`l3-25-4` is refused).

Refused with them: every old-style name (`a6-2`, `c9-14`), so a stale link in
a page that was not updated fails visibly rather than pointing at a lesson
that no longer exists under that name. Anything else - `l6-1`, `L3-2025-4`, a
value with quotes or markup in it - builds no link at all and the calculator
works as normal. The shell tool ignores `lesson`.

**What this change impacts.** Only the back link. No calculator, no working
line and no figure reads `lesson`, so a course page that still carries an old
name loses its "Back to the lesson" button and nothing else; the arithmetic on
the page is unaffected. `docs/web/tests/tides-work.js` holds 27 names against
this rule, five built and twenty-two refused.

---

## 1. `twelfths` — height at a time

Two forms. Give the four turn values, or give a station.

| parameter | | meaning |
|---|---|---|
| `lw` | required* | time of low water |
| `lwh` | required* | height of low water, m |
| `hw` | required* | time of high water |
| `hwh` | required* | height of high water, m (must be above `lwh`) |
| `t` | required | the time you want the height for |
| `station` | station form | a station id; in the shell, defaults to the station chosen with `tides use` |
| `date` | station form, default today | in the station's standard time |

\* if any of `lw lwh hw hwh` is given, all four are needed and `station` is not
allowed. HW before LW is a **falling** tide; the pair of turns is the one less
than twelve hours apart, so a tide that crosses midnight works. `t` must lie
between the two turns. In the station form, `t` defaults to now.

Shows the hourly twelfths table (1, 2, 3, 3, 2, 1), the height by the rule of
twelfths, by the cosine method h = h1 + (h2 − h1)·(cos A + 1)/2 with
A = 180·((t − t1)/(t2 − t1) + 1) degrees, and the difference. The station form
takes the turns either side of `t` from the harmonic prediction — to the
minute and centimetre, as the table prints them — and adds the harmonic height
itself: three answers side by side.

    ?work=twelfths&lw=05:12&lwh=0.8&hw=11:24&hwh=4.2&t=08:30
    ?work=twelfths&station=ticon/dover-dov-gbr-bodc&date=2026-11-07&t=10:00
    tides work twelfths lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 t=08:30
    tides work twelfths station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00

## 2. `secondary` — a secondary port from its standard port

Give the HW part, the LW part, or both.

| parameter | | meaning |
|---|---|---|
| `hw`, `hwh` | HW part | standard port HW time and height |
| `mhws`, `mhwn` | HW part | standard port mean high water springs, neaps, m |
| `dhws`, `dhwn` | HW part | secondary height difference at MHWS, at MHWN, m |
| `thw1`, `tdhw1` | HW part | an almanac standard-port HW time, and the time difference there, minutes |
| `thw2`, `tdhw2` | HW part | the other almanac time, and its difference |
| `lw`, `lwh` | LW part | standard port LW time and height |
| `mlwn`, `mlws` | LW part | standard port mean low water neaps, springs, m |
| `dlwn`, `dlws` | LW part | height difference at MLWN, at MLWS, m |
| `tlw1`, `tdlw1`, `tlw2`, `tdlw2` | LW part | as for HW |

Time differences are minutes, negative for earlier (`tdhw1=-10`), positive
unsigned (`tdhw2=5`). The almanac gives them for two standard-port times
(`0000` and `0600`, say) and the same again twelve hours later, so times are
taken **modulo 12 hours** and the difference interpolated linearly round that
circle. Height differences are interpolated linearly by the **standard port's
HW height between MHWN and MHWS** (LW: its LW height between MLWN and MLWS),
not by range — the RYA method. Outside those limits the line is carried on and
the working says **EXTRAPOLATED**. The answer rounds the time difference to
the nearest minute.

    ?work=secondary&hw=05:36&hwh=6.4&mhws=6.8&mhwn=5.3&dhws=-0.4&dhwn=-0.3&thw1=0000&tdhw1=-10&thw2=0600&tdhw2=5&lw=11:51&lwh=1.1&mlwn=2.1&mlws=0.8&dlwn=0.0&dlws=0.1&tlw1=0100&tdlw1=-5&tlw2=0700&tdlw2=10
    tides work secondary hw=05:36 hwh=6.4 mhws=6.8 mhwn=5.3 dhws=-0.4 dhwn=-0.3 thw1=0000 tdhw1=-10 thw2=0600 tdhw2=5 lw=11:51 lwh=1.1 mlwn=2.1 mlws=0.8 dlwn=0.0 dlws=0.1 tlw1=0100 tdlw1=-5 tlw2=0700 tdlw2=10

## 3. `stream` — a stream rate between neaps and springs

| parameter | | meaning |
|---|---|---|
| `spr` | required | the atlas (or diamond) spring rate, kn |
| `nps` | required | the neap rate, kn |
| `range` | required | today's range at the atlas's reference port, m |
| `sprange` | required | mean spring range there, m |
| `nprange` | required | mean neap range there, m (below `sprange`) |

Rate = nps + (range − nprange)/(sprange − nprange) × (spr − nps). Beyond
springs or below neaps the line is extrapolated and flagged; a rate that would
come out below zero is taken as 0.0 kn and says so.

    ?work=stream&spr=2.6&nps=1.4&range=4.1&sprange=5.9&nprange=3.1
    tides work stream spr=2.6 nps=1.4 range=4.1 sprange=5.9 nprange=3.1

## 4. `atlas` — which page of the tidal stream atlas

| parameter | | meaning |
|---|---|---|
| `station` | required (shell: the chosen station) | the atlas's standard port, e.g. Dover |
| `date` | default today | station standard time |
| `t` | default now | station standard time |

Says which page applies: the hours from the **nearest HW** at that station,
`HW -3` … `HW` … `HW +6`. Each page covers 30 minutes either side of its
hour, and exactly half past goes to the later page (HW +0:30 is page HW +1;
HW −0:30 is page HW). Then the range of the tide you are in — that HW and
the LW on the same side of it as `t` — and where it sits between mean neaps
and mean springs. The means are the Admiralty definition from the station's
constants, springs 2(M2 + S2) and neaps 2(M2 − S2), given where the tide is
semidiurnal (form factor (K1 + O1)/(M2 + S2) up to 0.25). At a secondary
port, or a mixed or diurnal tide, the working says the means are not
available and why, and gives the range alone. The browser offers a button to
carry the range and means straight into `stream`.

    ?work=atlas&station=ticon/dover-dov-gbr-bodc&date=2026-11-07&t=10:00
    tides work atlas station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00

## 5. `cts` — course to steer

| parameter | | meaning |
|---|---|---|
| `track` | required | the track to make good, deg T |
| `stw` | required | speed through the water, kn |
| `streams` | required | `set:rate` per hour, comma separated: `135:1.5,150:2.0` is two hours. One pair is one hour. Up to 24 |
| `leeway` | default 0 | leeway, degrees |
| `wind` | needed with leeway | `port` or `stbd`: **the side the wind is on** |
| `var` | default 0 | variation, deg, **east positive** |
| `dev` | default 0 | deviation, deg, **east positive** |
| `dist` | optional | the whole leg length, nm: time = dist / SOG |

Over several hours the stream vectors are **summed and the triangle solved
once**, as taught. The working gives the water track and heading to a tenth
of a degree, and the answer the whole degree to steer. Leeway is applied
**into the wind**: `wind=port` means the wind is on the port side, she is set
to starboard, so heading = water track − leeway; `wind=stbd`, heading = water
track + leeway. Then magnetic = true − var and compass = magnetic − dev. If
the stream sets her across the track faster than she sails, or against her
harder than she can make way along it, the answer is **"cannot make good this
track"** with the working that shows why.

    ?work=cts&track=045&stw=6&streams=135:1.5,150:2.0&leeway=5&wind=port&var=-2&dev=1&dist=12
    tides work cts track=045 stw=6 streams=135:1.5,150:2.0 leeway=5 wind=port var=-2 dev=1 dist=12

## 6. `setdrift` — set and drift, from a DR and a fix

| parameter | | meaning |
|---|---|---|
| `start` | required | the position the DR runs from, `lat,lon` |
| `co` | required | the course steered, deg T |
| `stw` | required | speed through the water, kn |
| `hours` | required | time run, hours (more than 0, up to 24) |
| `fix` | required | the fix at the end of the run, `lat,lon` |
| `leeway` | default 0 | as for `cts` |
| `wind` | needed with leeway | `port` or `stbd`: with the wind to port the water track is co + leeway |

The DR runs from `start` along the water track; the vector from the DR to the
fix over the time is the set and drift, and rate = drift / hours. Plane
sailing at the mean latitude, which is right for coastal distances (it is
refused beyond latitude 80). With no leeway given, the set and drift found
includes any leeway too, and the working says so. The antimeridian is handled.

    ?work=setdrift&start=50.10,-1.50&co=090&stw=6&hours=3&fix=50.05,-1.20
    tides work setdrift start=50.10,-1.50 co=090 stw=6 hours=3 fix=50.05,-1.20

## 7. `tidal_gate` — when a headland's stream turns, and the window to get round

A headland where the stream runs hard is a gate: open while the stream is
with her, shut while it is against her. A navigator finds when it opens and
shuts in one of two ways, and this takes both (Larry, 15 November 2026).

```
   the atlas form                         the pilot-book form
   13 pages, HW -6 to HW +6               "the west-going stream begins
   set and rate at the headland            at HW Portsmouth +5"
            |                                        |
   along her track on each page:           opens= and shuts=,
   rate x cos(set - track)                 hours from high water
            |                                        |
   where it turns, between two             HW + the hours
   pages, by a straight line                         |
            +-------------------+--------------------+
                                v
              the gate, by the clock:  OPEN 12:13 to 18:18
                                |
              t=     is it open when she is there, and for how long
              dist=, sog=    when to leave to arrive while it is
```

**The high water,** one of two ways:

| parameter | | meaning |
|---|---|---|
| `hw` | typed form | time of high water at the atlas's (or pilot book's) standard port |
| `hw2` | typed form, optional | the next high water there. Without it the tides are taken as 12 h 25 min apart, the mean, and the working says so |
| `station` | station form (shell: the chosen station) | a station id: the high water nearest `t`, and the ones before and after it, are predicted |
| `date` | station form, default today | in the station's standard time |

**The gate,** one of two forms:

| parameter | | meaning |
|---|---|---|
| `track` | atlas form | her track past the headland, deg T |
| `streams` | atlas form | `set:rate` for each atlas page, comma separated, as `cts` takes them. 2 to 13 pairs |
| `from` | atlas form, default `-6` | the atlas page of the first pair: `-6` is HW −6. A whole number, −6 to 6 |
| `foul` | atlas form, default 0 | the foul stream she will accept, kn: the gate is open while the stream is no more than this against her |
| `opens` | pilot-book form | hours from high water when the fair stream begins, −6.5 to 6.5 (`4.5` is HW +4:30) |
| `shuts` | pilot-book form | hours from high water when it ends |

**And, with either form:**

| parameter | | meaning |
|---|---|---|
| `t` | optional (required with `station`; default now) | the time she expects to be at the gate. With `hw`, it is taken as the time nearest that high water |
| `dist`, `sog` | optional, together | miles to the gate and her speed over the ground on the way: when to leave |

**The atlas form** resolves the stream on each page along her track, rate ×
cos(set − track): with her is +, against her is −. The gate turns where that
passes zero (or minus `foul`), found between two pages by a straight line, as
it is done with a pencil.

**A window that runs across low water.** Many gates open late on one tide and
shut early on the next. On one tide's pages alone that window is in two
pieces, its end on the first pages and its start on the last:

```
 the tide before      this tide                              the next tide
 +3 +4 +5 +6    -6 -5 -4 -3 -2 -1 HW +1 +2 +3 +4 +5 +6    -6 -5 -4 -3
  .  =  =  =     =  =  =  .  .  .  .  .  .  .  =  =  =     =  =  =  .
     |<-- one window -->|                      |<-- the next window -->|

 = with her, the gate open        . against her, the gate shut
```

An atlas page gives the stream at so many hours from high water, whichever
high water that is. With all thirteen pages given, the same thirteen are laid
down three times, against the high water before, this one and the one after,
so the opening is found on one tide's pages and the shutting on the next's,
and the window is given whole. The working names the tide a page belongs to
(`HW -3 of the next tide`). A page that would fall at or before the one
already laid down is left out, which happens only when two high waters are
twelve hours apart or less.

With fewer than thirteen pages nothing is laid down again, because what the
missing pages say is not known. The working then says which end is not on the
pages given (`it is already open on HW -6, the first page given`), the answer
is `open until ...` or `open from ...`, and the figure marks the times outside
the pages with `?`. An end is never guessed.

**The pilot-book form** adds the hours to the high water. When `shuts` is not
after `opens`, the gate opens on one tide and shuts on the next.

**Worked from the figures as printed.** The stream along her track is taken to
a hundredth of a knot and a turn of the gate to the whole minute, as each is
printed, and every later step uses the printed figure. A student with the
working and a pencil gets the same minute.

**What it does not do.** Springs and neaps: *when* the stream turns does not
depend on them; how hard it runs does, and `stream` gives the day's rate. And
a gate here is a place and a time, not a passage of miles through it.

    ?work=tidal_gate&hw=14:32&track=255&streams=075:2.2,078:2.6,080:2.0,085:0.9,250:0.4,255:1.5,258:2.4,260:2.7,258:2.1,255:1.0,080:0.3,078:1.4,076:2.1&t=17:00&dist=22&sog=7
    ?work=tidal_gate&hw=14:32&opens=5&shuts=-1&t=17:00&dist=22&sog=7
    tides work tidal_gate hw=14:32 track=255 streams=075:2.2,078:2.6,080:2.0,085:0.9,250:0.4,255:1.5,258:2.4,260:2.7,258:2.1,255:1.0,080:0.3,078:1.4,076:2.1 t=17:00 dist=22 sog=7
    tides work tidal_gate hw=14:32 opens=5 shuts=-1 t=17:00 dist=22 sog=7

---

## 8. `lunar` — springs and neaps: the Moon, the rule, today's range, the coefficient

Where the day sits in the Moon's month, when springs and neaps fall, how big
today's tide is, and the tide coefficient. It works from the Moon and from the
tide tables, with whichever part it is given, and a station supplies both.
Larry ruled its design one decision at a time on 16 November 2026.

```
   what she gives                      what it works
   --------------                      -------------
   date=  (t=)                 --->    1  the Moon: her age, the last and
                                          the next phase
                                       2  the rule of thumb: springs a day or
                                          two after new and full moon, neaps
                                          after the quarters
   hwh= lwh=  (or range=)      --->    3  today's range, and its place between
   sprange= nprange=                      the port's mean neaps and springs
   brhwh= brlwh=               --->    4  the coefficient, by pencil:
                                          100 x the Brest range / 6.10 m
   station=                    --->    all of it, predicted: the tide there,
                                       the biggest and smallest tides FOUND
                                       beside the rule, and the coefficient
                                       both by pencil and as an almanac
                                       prints it
```

**The Moon:**

| parameter | | meaning |
|---|---|---|
| `date` | default today | the day. Without a station, in UT |
| `t` | default 12:00 (now, when no date is given) | the time. With a station it picks the high water nearest it |

**The tide tables,** for any standard port:

| parameter | | meaning |
|---|---|---|
| `hwh`, `lwh` | together | today's high and low water heights there, m |
| `range` | in place of the two heights | today's range, m |
| `sprange`, `nprange` | required with either | the port's mean spring and neap ranges, m, as `stream` takes them |

**The coefficient:**

| parameter | | meaning |
|---|---|---|
| `brhwh`, `brlwh` | together | Brest's high and low water heights for the day, m |
| `coef` | carried, not yet used | the coefficient an almanac prints, 20 to 120. Lunar checks it, says in one line that it is noted and not used yet, and works everything else. Its working and its entry field are on the backlog |

**A station:**

| parameter | | meaning |
|---|---|---|
| `station` | station form | a station id. Used when it is named, or when nothing is typed from a tide table and one is chosen. Not with typed heights |

**A link that carries typed heights never uses the visitor's chosen station,**
so it gives every reader the same working. A link with a date alone gives the
Moon and the rule, and a reader who has chosen a station also sees what was
found there.

**The Moon's phases are given to the hour.** The engine's series for the Sun
and Moon is a short one; it puts a phase within about an hour of the almanac.

**The rule of thumb, and what is found.** The rule is always shown: springs a
day or two after new and full moon, neaps a day or two after the quarters. It
is right on average and can be two or three days out for any one Moon. With a
station the biggest and smallest tides are found in the prediction and shown
beside it, with how far they fell from the rule. Race week is the example:
new moon on 27 May 2025, the biggest tide at Brest that evening and at
Portsmouth the evening before.

**The range of a tide at a station** is its high water less the mean of the
low waters either side of it. Typed, it is the high water less the low water
she gives.

**The coefficient is Brest's,** by Shom's definition, and is applied to the
whole of metropolitan France: 45 at mean neaps, 95 at mean springs, 20 to 120
at the extremes. So at any other port lunar gives the place between that
port's own mean neaps and springs, and predicts Brest for the coefficient.

**Two coefficients, side by side.** By pencil, from the heights a tide table
prints: 100 x the range / 6.10 m. And, in the station form, as an almanac
prints it: the same sum on the part of the tide that comes twice a day, with
the once-a-day part left out. Measured on the 57 high waters of November 2026
at Brest against the published figures, the pencil figure is 2 points out on
average and up to 6, alternating between the two tides of a day; the second is
1 point out on average and never more than 2. Shom's own sheet does not say
its figure leaves the once-a-day part out: that is a finding from the
published figures.

**The figure.** A strip of the Moon's month, thirty days with the day in the
middle: her four phases, and a band where the rule of thumb puts springs and
neaps. With a station, a bar for every tide stands above it, a dot marks each
biggest and smallest tide found, and two dashed lines mark mean springs and
mean neaps. Their labels stand in a margin to the right of the bars, so no
label hides a bar (Larry, ADJ, 16 November 2026); a station's label is two
lines, its name and then its height, because on one line it is wider than
the margin. Where the two lines come close, at a port with little difference
between springs and neaps, the labels move apart about their midpoint,
springs above. The day's label, top left, carries its working. The drawing
ends 12 below its dates, as the other figures do.

**What it does not do.** Use `coef` (above). Give a coefficient for a port
other than Brest. Correct for the weather.

    ?work=lunar&date=2025-05-24&brhwh=6.07&brlwh=1.26
    ?work=lunar&date=2025-05-24&hwh=4.3&lwh=1.1&sprange=3.9&nprange=1.9
    ?work=lunar&station=ticon/brest-3-fra-refmar&date=2025-05-24&t=14:00
    tides work lunar date=2025-05-24 brhwh=6.07 brlwh=1.26
    tides work lunar date=2025-05-24 hwh=4.3 lwh=1.1 sprange=3.9 nprange=1.9
    tides work lunar station=ticon/brest-3-fra-refmar date=2025-05-24 t=14:00

---

## 9. `depth` — the depth over a shoal, and the window to cross it

Two questions in one working (Larry, AGT, 16 November 2026): how much water is
there at a given time, and between what times is there enough.

```
   surface  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                 ^              |  |
   height of     |      draught |  |
   tide          |              v  |  depth of water
   chart datum - + - - - - - - -   |  = charted depth + height of tide
                 |      clearance  |    (over a drying bank:
   charted depth |      under keel |     height of tide - drying height)
                 v                 v
   sea bed  ___________________________________

   the height of tide she needs = draught + clearance - charted depth
                              or = draught + clearance + drying height
```

| parameter | | meaning |
|---|---|---|
| `depth` or `dries` | exactly one of the two | `depth` is the charted depth, m; `dries` is the drying height, m, the underlined figure on the chart. Both are written as the chart prints them, never with a minus sign |
| `draught` | required | her draught, m |
| `clear` | required | the clearance wanted under the keel, m. Never defaulted; `clear=0` is the moment she touches |
| `swell`, `waves` | optional, either or both | the swell's height and the wind waves' height, m, as a forecast gives them: the sea (below) |
| `lw` `lwh` `hw` `hwh` | typed form | the low water and the high water, time and height, as `twelfths` takes them. HW before LW is a falling tide |
| `lw2` `lw2h` | typed form, optional | the low water after high water. With it `lw` must be the low water before |
| `t` | optional when typed | the time she wants the depth for; it must lie between the turns given |
| `station` | station form | a station id; in the shell, defaults to the station chosen with `tides use` |
| `date`, `t` | station form, default now | in the station's standard time |

**Exactly one of `depth` and `dries` (Larry, AGV).** A chart prints a drying
height as a plain underlined figure. Typing it under its own name means the
sign is never hers to remember, and a forgotten minus cannot put a metre of
water over a bank that has none.

**One tide gives one edge of the window; the low water either side of high
water gives both (AHF).** With `lw lwh hw hwh` the answer is when the window
opens on a rising tide, or when it shuts on a falling one. Add `lw2 lw2h` and it
is the whole window. At a station the tool takes the low water, the high water
and the low water round `t` itself.

**Two rules side by side, and the prediction as a third at a station (AHI).**
Each tide is worked by the twelfths, with the hour-by-hour table and a
straight line inside the hour that holds the height, and by the cosine curve
turned round to give the time: (cos A + 1)/2 is the fraction of the range, and
A/180 − 1 the fraction of the time. Both assume a regular tide of about six
hours. Where it stands or has a double high water, as in the Solent, they are
wrong, the typed form says so, and the station form shows by how much: at
Portsmouth on 24 May 2025 the rules open the window 13 minutes before the
prediction and shut it 25 minutes early.

**The answer is what every method agrees on (AHK):** the latest opening, the
earliest shutting, and the least depth at her time. Each method's own times
are printed above it. All methods start from the same turns, so they always
agree on whether there is enough water at all.

**The sea: the minimum safe depth (W28; Larry, AJK and AJP, 16 November
2026).** Over a shoal in a sea the danger is not only her keel: a wave
breaks when the water under it is about 1.3 times its height, and a breaking
sea can roll her or drop her on the bottom. So with `swell` or `waves` given
there are two depths of water she needs, and the greater governs:

```
   for her keel    draught + clearance
   for the seas    2.5 x the combined sea, the swell and the wind waves
                   combined as forecasters combine them:
                   sqrt(swell^2 + waves^2)

   the water she needs = the greater of the two
   the height of tide  = that water - charted depth  (or + drying height)
```

Why 2.5: the largest wave in a sea is about twice the significant height a
forecast gives, and 2 x 1.3 = 2.6. With 2.5 times the significant height
under her, even the largest wave runs on without breaking.

Why the root of the sum of the squares (AJK): swell and wind waves ride on one
another at random, so what adds is their energy, and height goes as the square
root of energy. NOAA's buoys and the "seas" of a forecast are combined this
way. The class rule adds the two heights; the working prints that too, with
how much more water it asks for, and why it errs safe.

The three explanations the working prints are written once, in
`docs/web/notes/weather-W28.txt`, tagged `W28.why`, `W28.rss` and `W28.sum`
for the weather app to take (Larry). The shell and the page print them line
for line, and `docs/web/tests/tides-work.js` fails if they ever differ from
the file. Their sources are named at its head.

With no `swell` or `waves` the working is exactly as before. When the seas
govern, the figure's keel stands in the water the seas need, its gap is
labelled `under keel`, and a sea is drawn along the surface. If at her time
the water is less than the seas need, the answer says they may break there.

**At a station whose heights are not above chart datum** the working carries
the same two-line caution as the tide screen's depth sum ("The zero a
station's heights are from", below).

**The figure (AHP, AID).** Three drawings on one height scale, so that the
height she needs is a single line through all of them. On the left, the circle
the cosine curve comes from: a point going round it, half a turn from one turn
of the tide to the next, and how far round it is when the height is reached.
In the middle, the tide against the clock: the cosine curve, the twelfths as
dots joined by straight lines, the prediction at a station, and the window
shaded. On the right, her keel: draught, clearance and the bank or sea bed,
stacked from chart datum. A sea bed far below the tide is left off the foot of
the drawing, and the figure says so. The shell draws the curve and the keel in
characters.

**What it does not do.** Allow for the weather, squat, or the boat's own
heave and pitch, beyond the seas' safe depth above. Know the
chart: the depth and the clearance are hers to choose. Give more than one
window in a day; ask again for the next tide.

    ?work=depth&dries=0.3&draught=1.8&clear=0.5&lw=05:12&lwh=0.8&hw=11:24&hwh=4.2&lw2=17:40&lw2h=0.9&t=09:00
    ?work=depth&depth=0.6&draught=1.8&clear=0.5&lw=05:12&lwh=0.8&hw=11:24&hwh=4.2
    ?work=depth&depth=1.0&draught=1.8&clear=0.5&station=ticon/dover-dov-gbr-bodc&date=2026-11-07&t=10:00
    tides work depth dries=0.3 draught=1.8 clear=0.5 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 lw2=17:40 lw2h=0.9 t=09:00
    tides work depth depth=0.6 draught=1.8 clear=0.5 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2
    tides work depth depth=1.0 draught=1.8 clear=0.5 station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00
    ?work=depth&dries=0.3&draught=1.8&clear=0.5&swell=1.0&waves=1.0&lw=05:12&lwh=0.8&hw=11:24&hwh=4.2&lw2=17:40&lw2h=0.9&t=09:00
    tides work depth dries=0.3 draught=1.8 clear=0.5 swell=1.0 waves=1.0 lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 lw2=17:40 lw2h=0.9 t=09:00

---

## The zero a station's heights are from

Every station form (`twelfths`, `atlas`, `tidal_gate`, `lunar`, `depth`) prints, under
the station's name and the time, one line saying what its heights are measured
from: `heights above chart datum`, `heights above MLLW, the chart datum`,
`heights above a computed LAT, not chart datum` or `heights above mean sea
level, not chart datum`. Six ports are on chart datum (Portsmouth, Weymouth,
Devonport, Cherbourg, Brest, Le Conquet); NOAA's stations are on NOAA's own.
A typed form prints no such line: the heights are hers, from her tide table.
Ranges, times and coefficients do not depend on the zero. The manual's section
3 has the table; `src/tides/gen/corrections.dat` has the ports and their
figures.

## Checked answers

The coastal course's own chapter examples are in `tests/tides-work.dat`, each
confirmed first by `tests/tides-work-ref.py`:

| URL parameters | answer |
|---|---|
| `work=twelfths&lw=04:30&lwh=1.50&hw=10:52&hwh=4.39&t=07:00` | twelfths 2.48 m, cosine 2.47 m |
| `work=stream&spr=4.2&nps=2.0&range=2.61&sprange=3.9&nprange=1.9` | 2.78 kn |
| `work=cts&track=255&stw=7.0&streams=030:1.5` | water track 246.3 T (steer 246), SOG 5.86 kn |
| the same with `&leeway=5&wind=port` | heading 241.3 T (steer 241) |
| `work=cts&track=250&stw=7.5&streams=290:1.2,285:0.9,280:0.4,100:0.3,105:0.8,110:1.1&dist=48.4` | water track 249.8 T (steer 250) |
| `work=setdrift&start=50.4630,-2.4550&co=250&stw=6.5&hours=2&fix=50.3660,-2.8260` | set 235 T, drift 2.4 nm, 1.2 kn |
| `work=secondary&hw=10:52&hwh=4.39&lw=04:30&lwh=1.50&mhws=5.5&mhwn=4.4&mlwn=2.2&mlws=0.8&dhws=-0.2&dhwn=-0.1&dlwn=0.0&dlws=0.1&thw1=0000&tdhw1=20&thw2=0600&tdhw2=10&tlw1=0000&tdlw1=5&tlw2=0600&tdlw2=25` | HW 11:10 4.29 m, LW 04:50 1.55 m |
| `work=tidal_gate&hw=14:32&track=255&streams=075:2.2,...,076:2.1&t=17:00&dist=22&sog=7` (the example above) | open 12:13 to 18:18; at 17:00 open, shuts in 1 h 18 min; leave between 09:04 and 15:09 |
| `work=tidal_gate&hw=14:32&opens=5&shuts=-1&t=17:00&dist=22&sog=7` | open 07:07 to 13:32, and 19:32 to 01:57 next day; at 17:00 shut, opens in 2 h 32 min |
| `work=lunar&date=2025-05-24&brhwh=6.07&brlwh=1.26` | last quarter 20 May, new moon 27 May; springs by the rule about 28 to 29 May; making; coefficient 79 |
| `work=lunar&date=2025-05-24&hwh=4.3&lwh=1.1&sprange=3.9&nprange=1.9` | range 3.20 m, 0.65 of the way from neaps to springs |
| `work=lunar&station=ticon/brest-3-fra-refmar&date=2025-05-24&t=14:00` | range 4.78 m; found: neaps 20 May, springs 27 May 17:04 (6.17 m); coefficient 78 by pencil, 79 as an almanac prints it |

**A training and cross-checking aid, not a substitute for judgement.** Where
this and the almanac, the atlas or the chart differ, they are right.
