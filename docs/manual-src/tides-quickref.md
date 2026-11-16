# TIDES quick reference
**Version {{VERSION}}** — harmonic prediction and the nine coastal calculators.

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
| **Air draught** | charted clearance **+** the level the chart measures it above **−** tide, against your mast |

Depths are below chart datum, so the tide adds. A clearance is above a
high-water level the chart's notes name (HAT on a British chart, mean high
water on an American one), so the tide subtracts and that level adds back.
Reversing the pair is how a mast meets a bridge.

**Read the zero on the height column.** `above chart datum` and `above MLLW,
the chart datum` can be added to a charted depth. `not chart datum` cannot be
trusted to better than half a metre against the chart.

## Units, everywhere

| | |
|---|---|
| angles | degrees true, 0–360 |
| speeds | knots; heights and ranges, metres; distances, nautical miles |
| times | `HH:MM` or `HHMM`, **station standard time, no summer time** |
| positions | `lat,lon` decimal, **south and west negative** |
| variation, deviation | **east positive** (`var=-2` is 2° W) |

A `+` in a URL is a space: write `tdhw2=5`, not `tdhw2=+5`.

## The nine calculators

| name | what it gives | the parameters it must have |
|---|---|---|
| `twelfths` | height at a time: twelfths, cosine, and (at a station) harmonic | `lw lwh hw hwh t`, or `station t` |
| `secondary` | a secondary port from its standard port | the HW part, the LW part, or both |
| `stream` | a rate between neaps and springs | `spr nps range sprange nprange` |
| `atlas` | which atlas page, and where the range sits | `station` (+ `date t`) |
| `cts` | course to steer | `track stw streams` |
| `setdrift` | set and drift from a DR and a fix | `start co stw hours fix` |
| `tidal_gate` | when a headland opens and shuts, and when to leave | `hw` (or `station t`), then `track streams`, or `opens shuts` |
| `lunar` | springs and neaps: the Moon, the rule, today's range, the coefficient | `date`; and `hwh lwh sprange nprange`, or `brhwh brlwh`, or `station` |
| `depth` | the depth over a shoal at a time, and the window with enough water to cross | `depth` or `dries` (exactly one), `draught`, `clear`; and `lw lwh hw hwh` (+ `lw2 lw2h`, `t`), or `station` (+ `date t`) |

`streams` is `set:rate` per hour, comma separated — `135:1.5,150:2.0` is two
hours. Vectors are summed and the triangle solved **once**, not hour by hour.

Leeway goes **into the wind**: `wind=port` means the wind is on the port side,
so heading = water track − leeway.

Atlas pages run `HW -3` … `HW` … `HW +6`, each covering half an hour either
side; **exactly half past goes to the later page**.

A tidal gate is **open while the stream is with her**: rate × cos(set − track)
on each atlas page, the turn found between two pages by a straight line. Or
from the pilot book: `opens=5 shuts=-1` is HW +5 to an hour before the next.

**Depth over a shoal:** she needs draught + clearance − charted depth of tide,
or draught + clearance + drying height over a bank that dries. One tide gives
one edge of the window; add the next low water (`lw2 lw2h`) for both. The
answer is what the twelfths and the cosine curve both allow.

**Springs follow new and full moon by a day or two; neaps follow the quarters.**
A rule of thumb: any one spring can come two or three days off it. The
coefficient is 100 × the range at Brest ÷ 6.10 m: 45 mean neaps, 95 mean springs.

## What it says when it will not guess

| | |
|---|---|
| **SECONDARY** | no constants here; turns corrected from a reference, curve a half cosine |
| **EXTRAPOLATED** | beyond springs or neaps, or outside the almanac's limits |
| **cannot make good this track** | the stream beats the boat; the working shows why |
| **not on the pages given** | a tidal gate turns outside the atlas pages typed; that end is not guessed |
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
| `tidal_gate hw=14:32 track=255 from=-3 streams=085:0.9,250:0.4 foul=0.5` | opens 11:50 |
| `tidal_gate hw=14:32 opens=5 shuts=-1 t=17:00` | open 07:07 to 13:32 and 19:32 to 01:57; at 17:00 shut, opens in 2 h 32 min |
| `lunar date=2025-05-24 brhwh=6.07 brlwh=1.26` | new moon 27 May; springs by the rule 28 to 29 May; making; coefficient 79 |
| `lunar date=2025-05-24 hwh=4.3 lwh=1.1 sprange=3.9 nprange=1.9` | range 3.20 m, 0.65 of the way from neaps to springs |

## Rules of thumb

- The twelfths rule is a rule of thumb; where it and the harmonic height
  disagree, **the harmonic height is the better number**.
- Springs 2(M2 + S2), neaps 2(M2 − S2) — Admiralty, semidiurnal only.
- **Harmonics predict the astronomical tide and nothing else.** A deep low or
  a hard onshore blow moves the real water half a metre or more.
- Where this and the published tables, the almanac, the atlas or the chart
  differ, **they are right and this is wrong.**
