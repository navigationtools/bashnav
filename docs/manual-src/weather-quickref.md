# WEATHER quick reference
**Version {{VERSION}}** — reasoning from your own observations, no network.

## Commands

| | |
|---|---|
| `weather` | the menu |
| `weather what [24\|48\|72]` | what your log says, and the glass over that many hours (48) |
| `weather learn [key]` | a lesson; no key lists them |
| `weather chart` | reason over a 500 mb radiofax chart |
| `weather isobars [nm lat [N|S] [hPa]]` | the wind from the isobars: aloft, then on deck |
| `weather forecast` | yours first, then mine, then both scored |
| `weather score` | you, the rules and persistence |
| `weather lon <deg>` | your longitude, east positive |
| `weather close <percent>` | how near the next sea state counts as close (25) |
| `weather day\|night\|plain` | colour mode |
| `weather about` / `version` | |

## The pressure, in 3 hours

| | |
|---|---|
| fall of 3.0 hPa or more | a serious fall: a deepening system and a rising wind |
| fall of 1.5 to 3.0 | a definite fall — something is coming |
| within 1.5 either way | near steady |
| rise of 1.5 or more | the gradient is easing, or a ridge building |

**The rate matters more than the level.** 1000 steady is a quiet day; 1015
falling fast is not. The figures are corrected for the atmospheric tide first,
which needs your longitude.

**The glass.** The same bands are drawn on the barograph: thin and steady,
heavier rising, heavier again falling, heaviest falling fast, with the daily
tide alone as a grey wave behind. A trace that follows the wave is only the
tide.

## The sea against your wind

The sea state the Beaufort scale gives your wind begins at: **slight 8 kt ·
moderate 14.5 · rough 21.5 · very rough 30 · high 39.3 · very high 52 ·
phenomenal 64.** **Under the scale:** still building, or short of fetch.
**Above it:** is some of it swell? **Close:** your wind is in the top quarter
of its step.

## Buys Ballot, and the storm's track

Back to the wind: **northern hemisphere, the low is on your left**; southern,
on your right; and up to 20 degrees forward of that arm.

**The wind backs on the left of a storm's track and veers on its right,**
looking the way it is going, in both hemispheres. Backing: it passes south of
you if it is going east, north if west. **A falling glass: it is closing. A
rising glass: it is drawing away.**

## Cloud base and fog

| | |
|---|---|
| Cloud base | the temperature–dew point spread closes at **2.5 °C per 1000 ft** |
| | (a parcel cools at 3, its dew point falls at 0.5; the difference is what counts) |
| Fog | watch the margin between **dew point and sea temperature** |

## The warm front, in cloud

**cirrus → cirrostratus → altostratus → nimbostratus and rain.** Logged by
level, it is readable in advance. Logged as "overcast", it is not.

## The 500 mb chart — five numbers off the fax

bearing to the **564 line** · its distance · the line's orientation ·
the 500 mb wind there · hemisphere.

**Equatorward of the 564 line is where you want to be.**

## The forecast loop

1. **Yours is written first.** Nothing of the machine's until it is.
2. Then the **rules** forecaster and **persistence**.
3. All three scored against the verifying observation: half a point per knot,
   one per millibar, a tenth per degree, two per sea state.

**Persistence is the benchmark.** A forecaster who cannot beat it is not yet
adding anything.

## What it will not do

1. It cannot forecast: no models, no GRIBs, no charts over the wire.
2. It cannot see what has not announced itself in your observations.
3. It is only as good as the instruments and the care behind the log.
