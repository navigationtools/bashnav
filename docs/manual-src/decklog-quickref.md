# DECK-LOG quick reference
**Version {{VERSION}}** — append-only, UTC, offline.

## Commands

| | |
|---|---|
| `deck-log` | the menu |
| `deck-log entry` | the three-hourly entry |
| `deck-log wx` | a weather observation on its own |
| `deck-log log [n]` | the last n entries |
| `deck-log inspect` | run the engine checklist |
| `deck-log job` | work done, and the part it used |
| `deck-log open` | what is outstanding |
| `deck-log spares` | what is aboard |
| `deck-log shopping` | the list for the next port |
| `deck-log equip` / `part` | the registry |
| `deck-log stocktake` | count the locker |
| `deck-log correct` | correct an earlier entry, properly |
| `deck-log day\|night\|plain` | colour mode |
| `deck-log about` / `version` | |

## The record

```
YYYY-MM-DDThh:mmZ|type|key=value|...|~
```

`|~` is the completeness marker: without it the record is unfinished. `|` is
percent-encoded inside values, so `|~` appears nowhere else.

**Types:** `nav` deck · `wx` weather · `eng` engine · `pro` stores ·
`inv` stocktake · `cor` correction · `mrg` merge · `cel` celestial ·
`tid` tide · `con` contact · `chart` chart.

## The slots

**00 03 06 09 12 15 18 21 UTC.** Log the slot you are in. A missed slot stays
missed — do not back-date an observation you did not take.

## What to log, and why

| | |
|---|---|
| Wind **true**, not apparent | apparent changes on every tack; backing-versus-veering only works on true |
| Pressure **characteristic** | the shape of the last 3 hours, not the amount |
| Cloud **by level** (low / middle / high) | the warm-front sequence cannot be read from "overcast" |
| Swell **period** | a long-period swell from a new direction is a system out there |
| Engine **hours** | maintenance runs on hours, not dates |

## Sea state (Douglas) and visibility codes

| sea | | vis | |
|---|---|---|---|
| 0 glassy | 5 rough | 0 under 50 m | 5 2–4 km |
| 1 rippled | 6 very rough | 1 50–200 m | 6 4–10 km |
| 2 smooth | 7 high | 2 200–500 m | 7 10–20 km |
| 3 slight | 8 very high | 3 500 m–1 km | 8 20–50 km |
| 4 moderate | 9 phenomenal | 4 1–2 km | 9 over 50 km |

## Pressure characteristic

0 rising then steady · 1 rising, faster · 2 rising steadily ·
3 falling or steady, then rising · 4 steady · 5 falling then steady ·
6 falling, faster · 7 falling steadily · 8 steady or rising, then falling

## Rules that do not bend

1. **Nothing is edited. Nothing is deleted.** A correction is a new record.
2. **Export regularly.** Browser storage is not a backup — the operating
   system may reclaim it.
3. **Import merges**, it does not replace: duplicates appear once, new records
   go in by timestamp, and the merge itself is logged.
4. **Every timestamp is UTC**, whatever the screen shows.
