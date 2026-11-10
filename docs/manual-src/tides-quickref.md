# TIDES quick reference
**Version {{VERSION}}** — harmonic prediction and the six coastal calculators.

## Commands

| | |
|---|---|
| `tides` | the menu |
| `tides find <text>` | search by name (every word must appear, any order) |
| `tides near <lat> <lon>` | stations nearest a position |
| `tides use <id>` | choose a station |
| `tides today [date]` | the day's table, curve, depth helper |
| `tides sky [date]` | the same, with sun and moon |
| `tides work <name> k=v …` | a calculator, working shown |
| `tides where` | the chosen station and the file locations |
| `tides day\|night\|plain` | colour mode |

Search becomes a regular expression if it contains `^ $ . [ ] | ( ) * + ? { } \`
— `"^st mary"`, `"bay$"`, `"falmouth|mystic"`.

## The two signs that matter

| | |
|---|---|
| **Depth** | charted depth **+** tide, against draught and clearance wanted |
| **Air draught** | charted clearance **−** tide, against your mast |

Depths are below datum, so the tide adds. Clearances are above HAT, so the
tide subtracts. Reversing that pair is how a mast meets a bridge.

## Units, everywhere

| | |
|---|---|
| angles | degrees true, 0–360 |
| speeds | knots; heights and ranges, metres; distances, nautical miles |
| times | `HH:MM` or `HHMM`, **station standard time, no summer time** |
| positions | `lat,lon` decimal, **south and west negative** |
| variation, deviation | **east positive** (`var=-2` is 2° W) |

A `+` in a URL is a space: write `tdhw2=5`, not `tdhw2=+5`.

## The six calculators

| name | what it gives | the parameters it must have |
|---|---|---|
| `twelfths` | height at a time: twelfths, cosine, and (at a station) harmonic | `lw lwh hw hwh t`, or `station t` |
| `secondary` | a secondary port from its standard port | the HW part, the LW part, or both |
| `stream` | a rate between neaps and springs | `spr nps range sprange nprange` |
| `atlas` | which atlas page, and where the range sits | `station` (+ `date t`) |
| `cts` | course to steer | `track stw streams` |
| `setdrift` | set and drift from a DR and a fix | `start co stw hours fix` |

`streams` is `set:rate` per hour, comma separated — `135:1.5,150:2.0` is two
hours. Vectors are summed and the triangle solved **once**, not hour by hour.

Leeway goes **into the wind**: `wind=port` means the wind is on the port side,
so heading = water track − leeway.

Atlas pages run `HW -3` … `HW` … `HW +6`, each covering half an hour either
side; **exactly half past goes to the later page**.

## What it says when it will not guess

| | |
|---|---|
| **SECONDARY** | no constants here; turns corrected from a reference, curve a half cosine |
| **EXTRAPOLATED** | beyond springs or neaps, or outside the almanac's limits |
| **cannot make good this track** | the stream beats the boat; the working shows why |
| means not available | not semidiurnal, or a secondary port — range given alone |
| one plain sentence naming a parameter | bad input; **nothing is worked** |

## Checked answers, for testing your own working

| | |
|---|---|
| `twelfths lw=04:30 lwh=1.50 hw=10:52 hwh=4.39 t=07:00` | twelfths 2.48 m, cosine 2.47 m |
| `stream spr=4.2 nps=2.0 range=2.61 sprange=3.9 nprange=1.9` | 2.78 kn |
| `cts track=255 stw=7.0 streams=030:1.5` | water track 246.3 T (steer 246), SOG 5.86 kn |
| the same `+ leeway=5 wind=port` | heading 241.3 T (steer 241) |
| `setdrift start=50.4630,-2.4550 co=250 stw=6.5 hours=2 fix=50.3660,-2.8260` | set 235 T, drift 2.4 nm, 1.2 kn |

## Rules of thumb

- The twelfths rule is a rule of thumb; where it and the harmonic height
  disagree, **the harmonic height is the better number**.
- Springs 2(M2 + S2), neaps 2(M2 − S2) — Admiralty, semidiurnal only.
- **Harmonics predict the astronomical tide and nothing else.** A deep low or
  a hard onshore blow moves the real water half a metre or more.
- Where this and the published tables, the almanac, the atlas or the chart
  differ, **they are right and this is wrong.**
