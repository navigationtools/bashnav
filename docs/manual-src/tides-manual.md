# TIDES
## Harmonic tide prediction, offline, for 8,334 stations

**Version {{VERSION}}** — no network, no subscription, nothing that expires.
With six coastal work calculators that show every step.

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

### Is there enough water?

Charted depth **plus** the tide, against your draught and whatever you want
under the keel — with the stretches of the day when it is there.

### Does the mast go under?

Charted clearance **minus** the tide, against your air draught.

**The signs are opposite, and that is the trap.** Charted depths are measured
*below* datum, so the tide adds to them. Charted vertical clearances are
measured *above* HAT, so the tide takes them away. Getting that pair the wrong
way round is the classic way to put a mast into a bridge. They are therefore
separate functions in the engine and separately labelled on the screen, rather
than one function with a sign argument.

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

## 5. The six coastal calculators

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

### 5.6 `setdrift` — set and drift from a DR and a fix

The DR runs from the start along the water track; the vector from the DR to the
fix over the time run is the set and drift, and rate = drift / hours. Plane
sailing at the mean latitude, which is right for coastal distances — it is
**refused beyond latitude 80**. The antimeridian is handled.

With no leeway given, the set and drift found **includes any leeway too**, and
the working says so.

---

## 6. Linking into a calculator, and the parameter contract

In the browser, a URL opens any calculator directly:

    ?work=cts&track=045&stw=6&streams=135:1.5,150:2.0&lesson=a6-2

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
4. **The pictures are the one place the builds differ on purpose:** the shell
   draws characters, the page draws SVG from the same numbers, and the SVG's
   points are read back and checked against the geometry they claim.

---

## 8. Offline, and how the station data is shipped

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

---

## 10. Cautions

**This is a training and cross-checking aid, not a substitute for judgement.**

Where this program and the published tide tables for the port differ, **the
published tables are right and this is wrong.** The same goes for the almanac,
the tidal stream atlas and the chart.

---

*Figures for this manual are not yet included. Under the standing rule that
documentation figures come from the output of the browser build, they are
waiting on a decision about a day mode for the browser apps — the current
screens are near-black and do not print. The text above is complete without
them; the figures are owed, not dropped.*
