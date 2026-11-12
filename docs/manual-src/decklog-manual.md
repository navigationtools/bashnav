# DECK-LOG
## The boat's records: deck, weather, engine and provisions

**Version {{VERSION}}** — one log, append-only, UTC, offline. The same file
whether you keep it at a prompt or on a tablet.

---

## 1. What this is, and why it is built this way

DECK-LOG keeps the records a boat has to keep: where you were and what the
weather was doing, what the engine has had done to it, and what is in the
lockers. It prompts every three hours, because that is the interval a weather
observation is worth having at.

Four constraints shaped it.

**1. The log is evidence.**
Consequence: it is **append-only**. Nothing is ever edited and nothing is ever
deleted. A correction is a new record that points at the old one, and both stay
visible for ever. That is what makes the log worth anything in an inquiry.

**2. Two builds, one log.**
Consequence: the POSIX `awk` build and the browser build read and write the
**same file, byte for byte** — not two formats that look alike. You can keep
the log on a tablet at sea and read it at a prompt afterwards.

**3. An interrupted write must be visible.**
Consequence: every record ends with a completeness marker. See section 3; it
is the one irreversible decision in the whole tool.

**4. It must say what it does not know.**
Consequence: a missed three-hourly slot is shown as missed. Logging now records
*this* slot, not the ones gone by, and the tool says so rather than quietly
filling a gap.

---

## 2. The three-hourly rhythm

![**Figure 1** — the home screen, showing the slot you are in, when the last
entry was, and what the records say about the boat.](fig/decklog-home.png)

1. **The slot, not the clock.** Observations belong to the standard
   three-hourly slots — 00, 03, 06, 09, 12, 15, 18, 21 UTC — because that is
   what makes two observations comparable, and comparability is the whole of
   weather reasoning.
2. **Position, course and speed carry forward.** They are *state*: the entry
   shows them as they were last logged and return accepts them. You type what
   changed.
3. **Wind is TRUE, not apparent.** Apparent wind changes on every tack, and
   backing-versus-veering is the most useful rule there is — it only works on
   the true wind.

![**Figure 2** — an entry. Four sections: deck, weather, engine,
stores.](fig/decklog-entry.png)

### What goes in each section

| | |
|---|---|
| **Deck** | position, course steered, speed over ground, true wind direction and speed, sea state (Douglas), a note |
| **Weather** | pressure and its *characteristic*, the 3-hour change, air and dew point, sea temperature, total cloud, low / middle / high cloud, visibility, swell direction, period and height |
| **Engine** | which machine, running hours, work done, the part used and how many, fuel remaining, oil state, notes |
| **Stores** | water and gas remaining, stores used and how many, what is short |

**Why the weather section is longer than a deck log's usually is.** The
pressure *characteristic* (the shape of the last three hours, not the amount),
the cloud types by level, and the swell period are exactly what the reasoning
in `weather` needs and exactly what an ordinary deck log leaves out. The swell
period is the one to log carefully: a long-period swell from a new direction is
a system out there, because swell outruns the storm that made it.

**Engine entries carry hours, not just dates.** Maintenance runs on running
hours, so the schedule is computable from the log with nothing else. The
intervals come from your own engine manual, never from this tool.

---

## 3. The record format, and the completeness marker

One record, one line:

```
YYYY-MM-DDThh:mmZ|type|key=value|key=value|...|~
```

**The trailing `|~` is a completeness marker, and it is the reason the format
survives an interrupted write.** Kill the app mid-write and the half-line left
behind is *structurally perfect*: right timestamp, right type, every field a
well-formed `key=value`. Nothing distinguishes it from a finished record, so a
reader accepts it — and you have silently lost whatever never reached storage.
An engine entry with the part but not the hours, and no sign anything is
missing. In an append-only log that is permanent, and it is exactly the failure
that would matter in an inquiry.

A truncation cannot forge the marker, because `|` is percent-encoded inside
values and so `|~` appears nowhere else.

**The types**: `nav` deck, `wx` weather, `eng` engine, `pro` stores, `inv`
stocktake, `cor` correction, `mrg` merge, `cel` celestial, `tid` tide, `con`
contact, `chart` chart.

**Every timestamp is UTC**, in exactly that 17-character form, whatever the
screen displays.

---

## 4. Reading the log

![**Figure 3** — the log, most recent first, as records rather than as
prose.](fig/decklog-log.png)

The log view shows the records themselves. That is deliberate: the record is
what is kept, so the record is what you check. Nothing in this view can edit
anything.

**Correcting an entry.** `deck-log correct` (or the same from the menu) writes
a **new** record of type `cor` that references the one it corrects. Both stay.
A reader shows the correction against the original rather than replacing it,
because which is which, and when each was written, is the point.

---

## 5. The boat: registry, holdings, defects, shopping

![**Figure 4** — what the records add up to: equipment, what is aboard, what
is outstanding, and what to buy next port.](fig/decklog-boat.png)

Nothing here is a second database. **Every one of these is derived from the
log**: the holdings are stores received minus stores used, the open defects are
jobs raised and not yet closed, the shopping list is what has fallen below what
you said you wanted to carry. Add a record and the views move; there is nothing
to keep in step by hand.

| command | |
|---|---|
| `deck-log inspect` | run the engine checklist |
| `deck-log job` | record work done, and the part it used |
| `deck-log open` | what is outstanding |
| `deck-log spares` | what is aboard |
| `deck-log shopping` | the list for the next port |
| `deck-log equip` / `part` | the registry |
| `deck-log stocktake` | count the locker |

---

## 6. Backup, export and merge

**Browser storage is not a backup.** The operating system is entitled to
reclaim it, and it will not ask first. The home screen counts the records
written since your last export and says so.

1. **Export** writes the whole log out as text — the same text the `awk` build
   reads.
2. **Import** brings a log back in, and **merges** rather than replaces:
   identical records appear once, and anything new is added in timestamp order.
   This is what lets the tablet and the laptop both keep the log on passage.
3. **The merge is previewed before it is applied**, with the count of records
   that are new, already held, in conflict, and any line it could not read at
   all.

A merge itself is recorded, as type `mrg`, so the log says when it absorbed
another copy of itself.

---

## 7. Commands

| | |
|---|---|
| `deck-log` | the menu |
| `deck-log entry` | a deck log entry — the three-hourly one |
| `deck-log wx` | a weather observation on its own |
| `deck-log log [n]` | the last n entries |
| `deck-log inspect` | run the engine checklist |
| `deck-log job` | record work done, and the part it used |
| `deck-log open` | what is outstanding |
| `deck-log spares` | what is aboard |
| `deck-log shopping` | the list for the next port |
| `deck-log equip` / `deck-log part` | the registry |
| `deck-log stocktake` | count the locker |
| `deck-log correct` | correct an earlier entry, properly |
| `deck-log day` / `night` / `plain` | colour mode |
| `deck-log about` / `version` | |

**The weather reasoning lives in its own tool.** `deck-log` writes the
observations; `weather` reads them. They share one log and one store, so
nothing is copied between them.

---

## 8. The display modes

{{INCLUDE:common-display-modes.md}}

---

## 9. Offline, and putting it on the home screen

1. Open the browser build once with a signal.
2. **Share → Add to Home Screen.**
3. It then runs with the antenna down, keeps the log on the device, and needs
   no network at any point.

The log lives in the browser's own database on that device. It is not sent
anywhere, by this tool or by anything in it.

---

## 10. Cautions

1. **Export regularly, and keep the export somewhere else.** Browser storage
   can be reclaimed by the operating system; a log you cannot produce is not a
   log.
2. **The log is not edited.** If something is wrong, correct it with a `cor`
   record. Editing the exported text by hand breaks the one property the format
   exists to give you.
3. **Maintenance intervals are yours**, from your engine's own manual. This
   tool computes against what you tell it, and knows nothing about your engine.
4. **A missed slot stays missed.** Logging later records the slot you are in.
   Do not back-date an observation you did not take.
