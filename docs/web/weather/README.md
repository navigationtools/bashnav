# weather — the browser build

Read your own barometer. A port of `src/weather/`, reasoning from the
observations `deck-log` keeps, with no network at all.

    index.html        the reasoning, the forecast loop, the score, the charts, the lessons
    wx.js             the rules, and the atmospheric tide correction
    score.js          the two machine forecasters, and the scoring
    chart.js          the 500 millibar rules, and the wind from the isobars (W07)
    lessons.js        the thirteen lessons (generated)
    log.js, store.js  deck-log's record layer (copied, byte-identical)
    weather.js        the app
    gen/              the generator
    ../tests/         the verification

## The honest limit, which is in `about` as well

**With no network this cannot forecast.** No GRIBs, no synoptic charts,
no models. What it does is make you your own forecaster from the
barometer, the sky and the wind. Celestial is what you do when GPS dies;
this is what you do when the sat comms die.

It works entirely in the **observation** column of the three kinds of
weather data — ground truth you measured. It cannot forecast, but what
it reasons *from* is the one category that is never wrong, and the one
still available when the antenna comes down.

## One shared store, and why that works here

This reads the log `deck-log` writes, in the same IndexedDB. Both tools
are served from one origin, and **IndexedDB is per-origin, not
per-path**, so `docs/web/weather/` and `docs/web/deck-log/` genuinely share one
store. That is the design the specification asks for: the watch stander
says the report once.

A service worker's *scope* is per-path, though, which is why `log.js`
and `store.js` are **copied** here rather than loaded from
`../deck-log/`. Out of scope, the worker would not cache them and the
tool would not work offline — which is the entire point.
`gen/make-weather-web.sh` keeps the copies byte-identical and fails if
they ever drift, because two readers of one append-only format is the
one thing this project cannot afford.

## Every rule shows its working

A forecast handed over without its reasoning teaches nothing; the
explanation is the product. So each rule emits what it concluded and,
separately, why, and the page shows both — the conclusion as a
statement, the working under it as an aside.

The **atmospheric tide** is corrected before anything is said about
tendency, and said out loud. Solar heating drives a pressure wave that
travels westward with the sun, dominantly *semi*diurnal — twice a day,
not once. In the tropics the glass falls two to three millibars between
mid-morning and mid-afternoon *every day in perfect weather*, and a
sailor who does not know that reads a routine afternoon fall as a system
approaching. It needs your longitude, which is why the home screen asks
for it.

## Never tell before you ask

The forecast screen shows **nothing** of the app's reasoning until your
own call is committed to the log. Not greyed out, not collapsed, not
behind a tap — absent, and not in the DOM either. A guess you can
glimpse is a guess you have read, and then you have not forecast
anything: it feels like learning and is not. The test asserts the
comparison table is empty before the commit, not merely hidden.

The same rule runs the lessons: each ends with a question, and the
answer is not in the page until it is asked for.

## Three are scored, not one

    you          your own call
    the rules    the app's reasoning
    persistence  "in twelve hours it will be much as it is now"

**Persistence is the honest floor.** Hard to beat at short range, and a
forecast that does not beat it has shown no skill at all. Scoring the
rules as well as you keeps the app honest — its misses go on the record
— teaches calibration, and lets you eventually win, which is the point.
A training tool that cannot be outgrown is badly built.

Weighted error points from the WxChallenge: half a point per knot, one
per millibar, a tenth per degree of wind direction, so a near miss
scores like a near miss. Wind direction is scored **on the circle** —
350° forecast against 010° observed is a 20° error, not 340°.

### The user's own column was missing

`do_forecast` wrote `by=user`; the score sheet's three names are `you`,
`rules` and `persist`. So the one column the whole learning loop exists
for was accumulated and then never looked at, and "You are beating the
rule set" could never fire. Found while porting this, fixed in the awk
too, and **normalised on read** rather than by renaming the writer
alone: the log is append-only, so every `fc` record already written says
`user` and has to keep working for ever.

The test that was supposed to cover this wrote its own fixture with
`by=you` and so never met the tool. It now drives `weather forecast`,
logs the observation the forecast was made for, and reads the tool's own
score sheet.

## Regenerating and verifying

    sh docs/web/weather/gen/make-weather-web.sh
    sh docs/web/tests/run-weather-web.sh

`lessons.js` is **captured from the awk's own output**, in colour mode,
so the words *and the author's emphasis* are carried rather than
transcribed: `lph` marks a heading, `lpd` an aside, and `cw()` inside a
line marks the words that matter. The test reconstructs the plain text
from `lessons.js` and compares it with `weather learn` — all eleven are
character-identical.

The verification compares **prose, character for character**: 400
generated observation histories against `weather what`, 300 logs against
`weather score`, 1,078 cases against `weather chart`, every real day
from 2000 to 2040 through the valid-time conversion both ways, and the
page driven end to end.

Two formatting faults it caught:

- **C's `printf` rounds half to even; JavaScript's `toFixed` does not.**
  `%.0f` of 12.5 is 12 in C and 13 in JavaScript. The 500 mb rules
  divide the wind by two, which lands on an exact half for every even
  wind speed, and 506 of 1,078 chart cases disagreed on precisely that.
  `WX.cfixed` expands the double's exact decimal and rounds the string.
- **C prints `inf`, not `Infinity`.** A 500 mb wind of zero divides by
  zero and the awk prints "inf to inf hours". The port says so too; the
  page refuses zero and explains why instead.

**Rules of thumb: good ones, and still rules of thumb.** What is tested
is that the app applies its stated rules correctly and reports its own
score honestly — not that the forecast is right. It will often be wrong;
that is the nature of the subject, and it is why both scorers exist.

**Figures.** Where the awk draws a figure in a lesson, `gshow()` under
`FIGDUMP=1` prints a marker, `@@FIG <kind> <w> <h>`, and the page draws its
own figure for that kind: `wind` (the panel in `../shared/winddemo.js`),
`friction` (`frictionDemo` in `weather.js`, the `gradient` lesson, W01),
`forces` (`forcesDemo`, the force triangle with its friction slider, in the
same lesson), `veertime` and `veerhemi` (the lesson `veer`), `isoscale` (the
wind from the isobars, in the same `gradient` lesson), and the gun for
anything else.

**The wind from the isobars** (weather 1.0.3) is a screen of its own: the
spacing between two isobars, the latitude and the isobar interval in; the wind
aloft from the geostrophic balance and the wind on deck from W01's rules out.
`CHART.isoReport` is a port of `iso_report` in `chart.awk`, held to it
character for character by `docs/web/tests/weather-iso.js`; its two drawings
(`isoPicture`, `isoCurves` in `weather.js`) are measured by
`weather-isoui.js`.

**The glass** (weather 1.0.5, W04) is the barograph at the top of "What the
log says". `WX.glass(obs, lon, hours)` gives the readings in the window, the
change between each pair with the daily tide allowed for, the tendency word
(`WX.band`, one rule shared with the report) and the tide's size;
`WX.runs` merges neighbours of a kind. `glassFigure` in `weather.js` draws
them: the trace coloured and weighted by tendency, the strip of words, the
tide's wave behind from the first reading, the key at its own slopes. The
terminal prints the same runs as a table, which the page keeps for "Show it as
the terminal does" and leaves out of its reasoning. **The latitude is
carried** in `WX.load`: a weather observation on its own takes the position of
the last deck entry. Checked by `docs/web/tests/weather-glass.js` and the
second corpus in `weather-wx.js`.

**Where the low lies** (weather 1.0.8; Larry's rulings APK, APO, APP and APR)
is a compass card beside its own words in "What the log says". The report's
`low` holds the wind now and before, the hemisphere, the two edges of the
low's sector in clockwise order (`WX.bbLo`, `WX.bbHi`: from the arm Buys
Ballot gives to 20 degrees forward of it) and, when the wind has shifted more
than 10 degrees and the glass is falling or rising, its `course`
(`WX.course`): the quarter of the compass it is heading into and the bearing
it would come nearest on. `lowFigure` in `weather.js` draws the wind through
the centre, the wind before dashed, the sector as a wedge, the low out on its
bearing with its wind round it, and the quarter as a dashed fan; the card is
as tall as what is on it. The words for a backing or veering wind have no
hemisphere in them: on the left of a storm's track the wind backs, on the
right it veers. Checked by `docs/web/tests/weather-low.js`, by
`tests/wx-check.awk` (which moves a low past a boat on every course) and by
the corpora in `weather-wx.js`.

**A low passing a boat** (weather 1.0.9; Larry's ruling AQN, the first part of
card I19) is two figures in the lesson `veer`, one for each hemisphere, the
shell naming them `passnorth` and `passsouth` in its `@@FIG` markers.
`passDemo(host, north)` in `weather.js` draws two panels, the low going east
and going west: the low at three times with two isobars and its eight wind arrows (Larry, 18
November: any figure that describes the wind in a low shows the low itself,
with its wind arrows), and a boat each side of the track with the wind it
feels at each time, from the same model and geometry as `pass_figure()` in
`grid.awk`. The words under each boat are worked from the drawing's own
numbers. An unknown figure kind now draws nothing; until 1.0.9 it drew the
gun. Checked by `docs/web/tests/weather-pass.js`.

**A reported storm** (weather 1.0.11; Larry's rulings I20 and ATZ) is a screen
of its own, `v-storm`. `CHART.stormReport(fields)` in `chart.js` is a port of
`st_report` in `chart.awk`, word for word: the advisory moved on to now, the
side of its track, the closest approach, and your wind's band, wind+110 to
wind+135. Its `geo` carries the numbers `stormPicture` draws: north up, the boat
at the centre, the storm as a low with its own wind, the track, the 34-knot
circle, the closest approach and the band. Since 1.0.12 every label is a
callout in the margin, on its mark's side, with a leader line to the mark,
stacked so none touches another, and a caption under the picture says how to
read it (Larry: the labels round the storm were on top of each other).
Northern hemisphere only for now.
Checked by `docs/web/tests/weather-storm.js`.

**Fronts** (weather 1.0.10; Larry's ruling ATR, W20) is the lesson `fronts`
and its figure, kind `fronts`. The model is in `wx.js` (`WX.frP`, `frFrom`,
`frGlass`, `frBand`, the stations `FR_A` and `FR_B`) and is the same as
`fr_p`, `fr_from` and `fr_glass` in `wx.awk`: a round low with each front in a
trough, the wind 75 degrees round from the way the pressure rises, and the
low moving east at 30 knots for the glass. `frontsDemo(host)` in `weather.js`
traces its isobars by marching squares, draws the fronts with their barbs, the
low's own wind, the two boats as hulls with their winds, and a strip of what
boat A meets in order. Checked by `docs/web/tests/weather-fronts.js`, which
holds the model to the awk's character for character and reads the figure
back off the drawing.

**The sea against the wind** (weather 1.0.7, W09; Larry's rulings AOU, AOZ,
APC and APF) is a figure beside its own words in "What the log says".
`WX.sea(observation, percent)` gives, for the latest observation's wind: the
height and the sea state the Beaufort scale gives it (`WX.seaHt`, `WX.seaFor`),
the two ends of that step in knots, the state it is close to (`WX.seaClose`:
the top share of the step, 25 percent unless set, 0 to 50), the fully developed
height (`WX.seaFull`, Pierson and Moskowitz), and the sea state and swell
logged with it. The report's words and `seaFigure` in `weather.js` are both
written from it. The report marks its sea items, and `drawWhat` puts the
figure in before the first of them, with the two buttons that set the share
(`weather-sea-close` in the browser's store; `weather close <percent>` in the
terminal). The steps are written out in knots and held to the curve by
`tests/wx-check.awk`. `SCORE.sea` is `WX.seaFor`, and the sea state is scored
against the state logged (`o.sst`; `o.sea` is the sea temperature). Checked by
`docs/web/tests/weather-sea.js`, the third corpus in `weather-wx.js` and the
sea-state forecasts in `weather-sc.js`.

**A lesson can open it with an example** (weather 1.0.4, Larry's ruling ALI),
as the course's lessons open the tides calculators:

    ?view=isobars&sp=100&lat=50&hemi=N&step=4&lesson=l3a-2025-1

| name | | meaning |
|---|---|---|
| `view` | required | `isobars` |
| `sp` | required | the spacing between the isobars, nm |
| `lat` | required | latitude, degrees, 0 to 90 |
| `hemi` | optional | `N` (the default) or `S` |
| `step` | optional | the isobar interval, hPa; 4 if left out |
| `lesson` | optional | the lesson to go back to; "Back to the lesson" leads to its page |

Only numbers reach the fields: anything else leaves the field empty and the
screen asks for it. The back link is built only from an exact lesson name, by
the rule in `../shared/lesson.js` that tides uses too, so nothing from the URL
reaches an href otherwise. These names are a contract with the course: a name
is never renamed or given a new meaning. Each reads its colours from the page's tokens when
it draws, and is redrawn when the display mode changes. The friction figure is
checked by `docs/web/tests/weather-friction.js`, the force triangle by
`weather-forces.js` and the veer figures by `weather-veer.js`, each measuring
the drawing rather than trusting the page's own arithmetic.

The 500 mb rules are from Sienkiewicz and Chesneau, *Mariner's Guide to
the 500-Millibar Chart*, NOAA — public domain. Sources are in
`docs/SOURCES.md`; nothing in the lessons is copied from anywhere.
