# tides — the coastal work calculators: the URL contract

This file is **the authoritative contract** for linking into the six coastal
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
| `work` | which calculator: `twelfths secondary stream atlas cts setdrift` |

**A `+` in a query string is a space.** Browsers decode `tdhw2=+5` as
`tdhw2= 5`. Write positive values unsigned (`tdhw2=5`) or as `%2B5`; an
unsigned number is positive, and a leading space is trimmed, so both work.

**Station ids** are as the tool lists them, e.g. `ticon/dover-dov-gbr-bodc`,
`ticon/southampton-sou-gbr-da_idh`, `noaa/8452660` — letters, digits and
`_ . / -`. A `/` may be written as-is or as `%2F`.

**Times at a station** (`t` and `date` for `atlas` and the station form of
`twelfths`) are the station's own **standard time** — GMT for the UK, with no
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

---

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

**A training and cross-checking aid, not a substitute for judgement.** Where
this and the almanac, the atlas or the chart differ, they are right.
