# GRID 1 — the wind and current grids

The format the router reads, and the format the course's converters write.
`docs/web/route/grid.js` is the reference: **what it refuses, this format does
not allow**, and where this document and that file differ, the file is right.

## Why it exists on its own

Two converters write it — GRIB to wind, the Shom atlas to current — and the
router reads it. The weather app may read it later. A format defined inside
its first consumer becomes whatever that consumer happens to do, so it is
defined here, with a reader that is strict on purpose.

**Strict on purpose**, because of what a bad grid becomes. It does not become
an error; it becomes a *route* — a boat sailing through a gap in the wind, or
an hour of stream applied to the wrong hour. A grid that is wrong in a way
nothing notices is worse than one that will not load, because the router will
draw a perfectly convincing track from it.

## The shape

Plain text. Blank lines and lines beginning `#` are ignored anywhere. Values
are separated by spaces or tabs. `\r\n` is read the same as `\n`.

    GRID 1
    kind wind
    units kt
    u east
    v north
    lat 49.00 51.00 0.25
    lon -6.00 -1.00 0.25
    times 2025-05-24T00:00Z 2025-05-24T03:00Z 2025-05-24T06:00Z
    fields u v gust
    order time lat lon
    rows 2187
    12.4 -3.1 18.0
    12.1 -3.4 17.6
    - - -
    …

### The header

| Line | Value | Notes |
|---|---|---|
| `GRID 1` | — | Must be the first line. The version is the whole line. |
| `kind` | `wind` or `current` | |
| `units` | `kt` | Only knots. See below. |
| `u` | `east` | Positive east. Stated in the file, not only here. |
| `v` | `north` | Positive north. |
| `lat` | from to step | Increasing, step > 0, the span a whole number of steps. |
| `lon` | from to step | The same. No wrap across ±180 in GRID 1. |
| `times` | one or more | `YYYY-MM-DDTHH:MMZ`, UTC, strictly increasing. |
| `fields` | `u v` then extras | `gust` may follow on a `wind` grid. |
| `order` | `time lat lon` | The only order GRID 1 has. |
| `rows` | a whole number | **Last line of the header.** |

Each line appears **once**. Any other key is refused rather than ignored: a
header line nothing reads is a line somebody believes.

### The data

One row per cell, `fields` values each, in the order `order` gives: time
slowest, then latitude, then longitude fastest. A value of `-` means **no data
here**, which is not the same as zero and does not read back as zero.

## The three things worth explaining

### One unit, one sign convention, one order

A format that accepts knots and metres per second is a format where half the
files are in the other one and nothing says which until a boat is doing forty
knots in a gale. The same goes for sign and for index order. Each is fixed,
each is written in the file, and the reader refuses anything else. Half the
bugs in this class of code are a sign, and a convention that lives only in a
document is one that gets assumed.

### The row count is checked twice, against two independent things

1. `rows` against `times × lat × lon`, derived from the grid description.
2. `rows` against the number of data rows actually in the file.

The first catches a header that disagrees with itself. **The second catches a
truncated file**, which is the failure that actually happens to a text file: a
copy that stopped, a pipe that closed, a disk that filled. It is one number in
the header and one comparison in the reader, and it is the same reasoning the
NT1 check code is built on — the realistic fault is mechanical, not malicious.

### Spans must be a whole number of steps

`(to − from) / step` is floating point. Quarter-degree steps over two degrees
must give 8, not 7.999999999999999, so the count is rounded and then checked
against the rounding. A span that is not a whole number of steps is refused
rather than silently truncated, because a silently truncated grid is a grid
with a missing edge and no sign of one.

## Reading one

```js
var g = GRID.parse(text);
if (!g.ok) { /* g.err is one sentence; g.line is where */ }
g.meta.times.length           // how many times
g.at(ti, yi, xi)              // { u: …, v: …, gust: … }, null values where "-"
g.lat(yi)  g.lon(xi)          // the position of an index
```

It never throws. A bad grid is a result with one plain sentence and a line
number, because a reader that throws in a router is a route that disappears
rather than a grid that is wrong.

## What GRID 1 does not do

1. **No interpolation.** Reading a grid and sampling it between cells are
   different jobs; the second belongs to the router.
2. **No wrap at ±180.** The Channel does not need it. When something does, it
   is GRID 2 and old files still read.
3. **No projection, no levels, no ensembles.** Surface wind and surface
   current on a regular latitude–longitude grid is the whole of it.

## Changing it

A new field on an existing kind is not a version change: `fields` says what
each row carries, and a reader that does not know an extra field still reads
`u` and `v`. Anything else — a unit, a sign, an order, a new header line that
must be understood — is **GRID 2**, and `grid.js` keeps reading GRID 1.
