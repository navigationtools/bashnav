# Sources

Where the content in these tools comes from, and how each kind of source is
used. Cited so a later session can check the claims rather than trust them.

---

## The rule

**Facts and methods are free; expression is not.** Everything here is written
from the rules, the physics and standard practice, in our own words. No text,
diagram or table is reproduced from a copyrighted source, and no training
organisation's course material, assessment or procedure is used.

Standard sailing vocabulary is a case in point. The parts of a sail have been
called this for centuries, "ready about" and "lee ho" are older than anyone now
sailing, and a bow spring holds a boat the same way in every marina in the
world. None of it belongs to anybody.

---

## Lift, trim and balance

The physics is the part most often taught wrongly, so it is the part checked
hardest.

- **NASA Glenn Research Center**, *Incorrect Lift Theory* (Beginner's Guide to
  Aeronautics). Why equal-transit / longer-path is wrong, and the measurement
  that kills it — the computed lift does not match the measured lift.
  <https://www.grc.nasa.gov/WWW/K-12/VirtualAero/BottleRocket/airplane/wrong1.html>
- **McLean, D.** (2018) "Aerodynamic Lift, Part 1: The Science", *The Physics
  Teacher* **56**(8), 516–520.
- **McLean, D.** (2018) "Aerodynamic Lift, Part 2: A Comprehensive Physical
  Explanation", *The Physics Teacher* **56**(8), 521–524.
  <https://doi.org/10.1119/1.5064559> — that pressure and velocity stand in a
  reciprocal cause-and-effect relationship, and neither is prior. This is the
  source for the app refusing to pick a side between "Newton" and "Bernoulli".
- **Babinsky, H.** (2003) "How do wings work?", *Physics Education* **38**(6),
  497–503. <https://doi.org/10.1088/0031-9120/38/6/001> — where streamlines
  curve there is a pressure gradient across them, low pressure on the inside of
  the curve. The part that works without an equation.
- **Gentry, A.** (1971) "The Aerodynamics of Sail Interaction", 3rd AIAA
  Symposium on the Aero/Hydronautics of Sailing, Redondo Beach, California —
  the slot between headsail and main, and why it is not a venturi.

**Do not link gentrysailing.com.** The domain has lapsed and now redirects to a
gambling site. Cite Gentry from the symposium proceedings or a library copy.

### Book-length, for when a claim needs more than a paper

- **Marchaj, C. A.** (2002) *Sail Performance: Techniques to Maximize Sail Power*
- **Fossati, F.** (2009) *Aero-hydrodynamics and the Performance of Sailing Yachts*
- **Larsson, L. & Eliasson, R. E.** (2007) *Principles of Yacht Design* — the
  standard treatment of centre of effort, centre of lateral resistance and lead
- **Garrett, R.** (1996) *The Symmetry of Sailing: The Physics of Sailing for Yachtsmen*

---

## What each kind of source is good for

**Public-domain government data** — NOAA and the like. The only class we can use
*directly*, and `tides` does: its harmonic constants are NOAA (public domain)
and TICON-4 (CC BY 4.0). NOAA is also the right source for marine weather and
the structure of the wind over the sea — **the wind gradient is the entire
reason twist exists**, and it is a measured, published atmospheric boundary
layer rather than an assertion.

**Sailmakers' technical libraries** — North Sails, Quantum and the like.
Excellent on *practice*: nobody knows better what good trim looks like or how a
shape changes with halyard, sheet and car. But they are commercial copyrighted
publications, so read for facts and write our own words; and their *physics*
varies in quality, with some still telling the equal-transit story. Take trim
from them and mechanism from the academic sources, never the reverse.

**The aeronautical and yacht-research literature** — the AIAA sailing symposia,
the yacht research units, the experimental-fluids journals. Paywalled and
pitched high, but this is the layer that settles arguments.

**Wikipedia** — a decent map of the territory and a good reading list. A place
to find sources, never a source.

---

## COLREGS

`colregs` is written from the Convention itself. The COLREGs as published by
the IMO are what govern; where the program and the Convention differ, **the
Convention is right and the program is wrong**. Annex I light positioning is
checked mechanically in `tests/annex1-check.awk`, including Annex I 3(b) — that
sidelights sit at or abaft the forward masthead light, never in front of it.

## Celestial navigation

`celnav` computes its own almanac and solves its own triangles; nothing is
tabulated from a published almanac or from a sight reduction table. The sources
below are read for checking and for further reading, and are cited so a later
session can go to them rather than trust us.

**Henning Umland, *A Short Guide to Celestial Navigation*** — first published
1997, revised 1 October 2011, `http://www.celnav.de`. Seventeen chapters
covering the whole subject, and the one authoritative treatment that is itself
freely licensed: released under the **GNU Free Documentation License 1.3 or
any later version, with no Invariant Sections and no Cover Texts**. That
licence permits copying and modification, but it is copyleft and therefore
**incompatible with this repository's Apache 2.0 licence** — so the guide is
used the way every other source here is used: as something to check our
mathematics against, and to recommend. Useful for cross-checking in
particular: Ch. 5 (the advancing vessel), Ch. 6 (latitude and longitude by
direct calculation), Ch. 8 (rise, set and twilight), Ch. 14 (magnetic
declination) and Ch. 16 (navigational errors). A free copy is published by the
Marion–Bermuda Race:
<https://www.marionbermuda.com/images/celestial/celestialUmmland.pdf>

**Walter O'Donnell and Caroline Stanton Chlaupek, "Ships Must Practice
Celestial Navigation", *U.S. Naval Institute Proceedings*, January 2025,
Vol. 151/1/1,463.** The case for the skill, from two people who have done it:
the authors describe USS *Essex* crossing from Hawaii to California in 2022 —
about 1,800 nautical miles in five days — with no electronic navigation aids,
and argue that satellite positioning is among the first things an adversary
will try to deny. *Proceedings* is a membership magazine and reserves its
rights; the article is cited and never reproduced.
<https://www.usni.org/magazines/proceedings/2025/january/ships-must-practice-celestial-navigation>

**Ocean Navigator celestial navigation series**, index at
<https://www.celestialnavigation.info/ocean-navigator-celestial-navigation-series/>
(Celestaire, Inc.). Used as a topic list and a reading order only — the site's
notice reserves duplication and adaptation of its content. The lessons that
follow its topics are written here from first principles.

## Tides

Validated against **NOAA's own published tide tables**, not against another
implementation of the same theory. See `docs/TESTING.md` for why that
distinction found three real bugs that a library-to-library comparison would
have passed.

---

## Weather

The 500 mb rules are from Sienkiewicz and Chesneau, *Mariner's Guide to the
500-Millibar Chart* (NOAA, public domain).

**Friction: the surface wind against the wind aloft** (the `gradient` lesson
and its figure, W01; checked 16 November 2026, as the weather gap list's rule 4
requires):

| the rule | the lesson | the sources |
|---|---|---|
| over the sea, the angle | backed 10-20° | US Navy aerographer's mate training, 10-20°; aviationweather.ws, about 10°; a sea-kayaking text (bookdown), about 15° |
| over the sea, the speed | about 2/3 | the Royal Meteorological Society's MetLink; the same sea-kayaking text |
| over land, the angle | backed 30-40° | the sea-kayaking text, 30°; US Navy training, 35° |
| over land, the speed | 1/3 to 2/3, by the ground | they disagree: MetLink 1/3, the sea-kayaking text 1/2, US Navy training 2/3. ECMWF: drag depends on the surface, high over rough terrain and forest, moderate over open grass, low over the sea |

The land speed is drawn as a band for that reason (Larry's ruling AJZ, from his
own classes: buildings, towns, cities and forests drag the wind differently).

**Why the wind turns: the force balance near the surface** (the force triangle
in the `gradient` lesson, weather 1.0.2). Pressure toward the low, Coriolis at
right angles to the wind, friction against it, balancing: Penn State METEO 300
(friction and the force balance); LibreTexts, Brune, *Fundamentals of
Atmospheric Science*, 10.01; US Navy aerographer's mate training (tpub weather2
4-28). The drawing uses a simple drag, so the angle's tangent is drag over
Coriolis and the layer's wind is the angle's cosine of the wind aloft; the
lesson gives the turn from it and the wind on deck from the rules of thumb.

**Backing and veering** (the lesson `veer`, weather 1.0.2). Veering clockwise,
backing anticlockwise; the surface wind backed in the north and veered in the
south; the shifts as a depression passes: US Navy aerographer's mate training;
aircraftpilots.com, *Southern hemisphere winds*; thewisepilot.com, *Veering and
backing*.

**The wind from the isobars** (weather 1.0.3, W07). The geostrophic wind from
the spacing of the isobars and the latitude, the scale printed in chart margins:
the American Meteorological Society's glossary, "geostrophic wind scale"; US
Navy aerographer's mate training (tpub weather2 7-10). Air density 1.225 kg/m3.
The wind on deck from it is W01's rules, above.

**A reported storm** (`weather storm`; weather 1.0.11, I20, Larry's ruling
ATZ; read 18 November 2026). Bowditch, *The American Practical Navigator*, 2017,
chapter 39, as below under "Where the low lies": the centre 110 degrees round
from dead astern in front of a storm and 120 to 135 behind it (p. 655); the
dangerous semicircle on the right of the track in the north (pp. 657 to 658);
on the storm's track, ahead of the centre or behind it, as cases of their own
(pp. 659 to 661); and that a plot of reported positions lags, since the
bulletin is hours old and a storm can turn (p. 658). Worked, not read: the
flat chart round the boat, the closest approach, and the app's own lines for
"near its path" and for how near counts as agreeing.

**Since weather 1.0.15 (Larry's ruling TAWG, 18 November 2026)** the screen and
the lesson `cyclone` use the crew's shared words, kept in the navigationtools
design system under "Shared words" and checked line by line against the 2017
chapter by PILOT: the rule (from p. 658), which side is dangerous in each
hemisphere (p. 658; the south's words are Bowditch's own, "the dangerous
semicircle is to the left"), how firm a shift is (pp. 658 to 659), the centre
facing the wind (p. 655, with its limit that nearer the centre the angle is "a
point or two less"), and that the navigable side is not safe, only less
dangerous. The angle is split as Bowditch splits it, 110 ahead of the storm and
120 to 135 behind it, the same on the watch faces and in the course. **The
app's own reading of the words:** "a point or two less" is taken as up to 22.5
degrees off the near edge of each band, at any distance, since the screen
cannot tell how near "nearer" is; and a storm and a boat on opposite sides of
the equator are refused. **Still to read before a
danger area is drawn:** the National Hurricane Center's guidance for mariners;
Bowditch's Figure 3912a calls the 1-2-3 rule graphic "former".

**Fronts** (the lesson `fronts` and its figure; weather 1.0.10, W20, Larry's
ruling ATR; read 18 November 2026). Bowditch, *The American Practical
Navigator*, 2017 edition, Volume 1, chapter 38, "Weather Elements"
(PILOT's copy of Part 10; see the next entry for where it came from).

1. **Air masses** (3809, p. 611): named for where they formed, warm or cold,
   maritime or continental.
2. **Why the wind shifts at a front** (3810 to 3811, pp. 611 to 612): the
   fronts lie in troughs, where the isobars change direction, and the wind
   follows the isobars. In the northern hemisphere the wind shifts clockwise
   as a warm or a cold front passes; on the poleward side of the path of a
   frontal wave the shifts are reversed. That is boat B.
3. **What passes over a boat, in order** (3812, pp. 613 to 617): the falling
   glass and the cloud sequence ahead of a warm front (cirrus, cirrostratus,
   altostratus, altocumulus, nimbostratus, steady rain); the warm front's
   veer, rising temperature and the end of the rain; the warm sector's
   little change in glass or temperature, its stratus, drizzle, haze or fog;
   the cold front's squalls, convective cloud, sharp veer, falling temperature
   and rising glass; squalls up to 200 miles ahead of it; clearing behind it;
   the occlusion; the chart symbols; and "no two are ever exactly alike".
   With the centre passing on the equator side of the observer the abrupt
   changes are not felt.

**What is worked, not read.** The figure's numbers (the wind at each boat, and
the glass in the barograph's four words) come from a model of one tidy low, in
`wx.awk` and `wx.js`: a round low, each front in a trough, the wind 75 degrees
round from the way the pressure rises (Buys Ballot, turned 15 in), and the low
moving east at 30 knots, which is an assumption of the figure and is said in it.
The model agrees with Bowditch's sequence: south of the track the wind is south,
south, south-west, north-west, north-west and the glass falling, falling fast,
steady, rising, rising; north of it the wind backs, south-east, east-north-east,
north.

**Where the low lies, and what a wind shift tells you** (the compass card and
its words in "What the log says"; weather 1.0.8; read 17 November 2026).

1. **The low is forward of the arm Buys Ballot gives.** Penn State, METEO 3,
   *Introductory Meteorology*: with the wind along the isobars at your back
   "low pressure should be on your left"; with the surface wind at your back
   "low pressure is still on your left, but on average, it will lie about 30
   degrees clockwise from your left arm"; "over land, the wind crosses the
   isobars at approximately 30 degrees, on average", and over water "generally
   less than 30 degrees". The app's own figure for the sea is 10 to 20 degrees
   (the friction rule above), and the card's sector runs from the arm to 20
   degrees forward of it (Larry's ruling APK).
2. **The dangerous side of a storm.** The Hong Kong Observatory, *Wind and
   Wave Distribution around a Tropical Cyclone*: in the northern hemisphere
   "the right-hand side of the moving cyclone" is the dangerous semicircle; in
   the southern "the dangerous semicircle is to the left and the navigable
   semicircle to the right". Bowditch says the same (item 3.2). The app does
   not name a dangerous side; this is recorded for the card with the XO on the
   southern hemisphere's words.

3. **Bowditch, read 18 November 2026** (Larry's ruling ATP). *The American
   Practical Navigator*, Pub. No. 9, 2017 edition, National Geospatial-
   Intelligence Agency, Volume 1, chapter 39, "Tropical Cyclones"; the copy
   read is PILOT's, of Part 10, from TheNauticalAlmanac.com's free copy of
   NGA's text (`~/Downloads/claude_downloads/practical-navigator/sources/`).
   The same material is chapter 35 of the 2002 single volume, which was used to
   cross-check it.
   1. **What a shift tells you** (p. 658): "a wind shifting to the right in the
      northern hemisphere and to the left in the southern hemisphere indicates
      the vessel is probably in the dangerous semicircle. A steady wind shift
      opposite to this indicates the vessel is probably in the less dangerous
      semicircle." Shifting right is veering, and shifting left is backing.
   2. **Which semicircle is dangerous** (pp. 657 to 658): the part to the right
      of the storm track, facing the way the storm is moving, in the northern
      hemisphere; "In the Southern Hemisphere, the dangerous semicircle is to
      the left of the storm track". With item 1, that is the rule the app
      teaches: on the right of the track the wind veers, on the left it backs,
      in both hemispheres.
   3. **Where the centre lies** (p. 655): with your back to the wind, the
      centre is "between perhaps 90° to 135°" from dead astern; "A good average
      is perhaps 110° in front and 120-135° in the rear", while the storm is
      several hundred miles away, and less closer to the eye. The card's sector,
      from the arm to 20 degrees forward of it (90 to 110 from dead astern), is
      Bowditch's figure for the front of a storm.
   4. **A boat under way** (p. 658): her own motion can give the opposite
      effect, and "If in doubt, the safest action is usually to stop long enough
      to define the proper semicircle."
   5. **Steady wind** (p. 659): steady with increasing speed and a falling
      glass, in or near the storm's path; steady with decreasing speed and a
      rising glass, near the track, behind the centre.

**Read, as well as worked and tested.** That a wind which goes on backing puts
you on the left of a storm's track, and one which goes on veering on its right,
in both hemispheres (Larry's rulings APO and APP), is Bowditch's rule (item 3
above). The quarter of the compass a low is heading into, from that and a glass
that is falling or rising (APR), is built on it and on item 3.5. Both follow
from Buys Ballot for a low on a straight track past a boat that is slow against
it: `tests/wx-check.awk` works the eight cases, and moves a low past a boat on
every course. The report says the quarter is "where to watch, not a fix",
because a low can deepen without moving or fill where it lies. weather 1.0.9
draws the same rule in the lesson `veer` (the passing low, both hemispheres,
both directions). Bowditch's wider angle behind a storm (120 to 135 degrees)
and his caution for a boat under way (item 3.4) are not yet in the app; each
is a separate choice for Larry. The American Meteorological Society's glossary
entry for Buys Ballot's law would not load on 17 November.

**The sea against the wind** (the figure and words in "What the log says",
and the sea state the score gives a wind; weather 1.0.7, W09; read 17 November
2026, as the weather gap list's rule 4 requires).

1. **The curve: the Beaufort scale's probable wave height.** The Met Office,
   "Beaufort wind force scale" (weather.metoffice.gov.uk, coast and sea
   guides): for each force its limits and mean wind in knots, its probable
   wave height and probable maximum, and its sea state. The page says: "These
   values refer to well-developed wind waves of the open sea", and "The lag
   effect between the wind getting up and the sea increasing should be borne
   in mind."

   | force | mean wind, kt | probable height, m | sea state it gives |
   |---|---|---|---|
   | 1 | 2 | 0.1 | 1 |
   | 2 | 5 | 0.2 | 2 |
   | 3 | 9 | 0.6 | 3 |
   | 4 | 13 | 1.0 | 3 to 4 |
   | 5 | 19 | 2.0 | 4 |
   | 6 | 24 | 3.0 | 5 |
   | 7 | 30 | 4.0 | 5 to 6 |
   | 8 | 37 | 5.5 | 6 to 7 |
   | 9 | 44 | 7.0 | 7 |
   | 10 | 52 | 9.0 | 8 |
   | 11 | 60 | 11.5 | 8 |
   | 12 | 64 and over | 14 and over | 9 |

2. **The sea states.** NOAA's National Centers for Environmental Information,
   World Ocean Database code table "sea state", headed WMO code 3700: 0 calm,
   glassy, 0 m; 1 calm, rippled, to 0.1; 2 smooth, 0.1 to 0.5; 3 slight, 0.5
   to 1.25; 4 moderate, 1.25 to 2.5; 5 rough, 2.5 to 4; 6 very rough, 4 to 6;
   7 high, 6 to 9; 8 very high, 9 to 14; 9 phenomenal, over 14.
3. **Fully developed.** R. H. Stewart, *Introduction to Physical
   Oceanography*, section 16.4, "Ocean-Wave Spectra" (LibreTexts; CC BY-NC-SA
   4.0): Pierson and Moskowitz's significant wave height for a fully developed
   sea, `0.21 (U19.5)^2 / g`, about `0.22 (U10)^2 / g`; a fully developed sea
   needs the wind to blow steadily over "roughly ten-thousand wave periods"
   and an area "roughly five-thousand wave lengths on a side". The app uses
   the second form with the logged wind.

**What is the app's own, and not the sources'.** The curve joins the table's
points with straight lines, and the sea state changes at the wind where that
line reaches each state's height (1, 2, 8, 14.5, 21.5, 30, 39.3, 52 and 64
knots; a calm is under 1 knot, as force 0 is). The Met Office gives one state
for a whole force, and two for forces 4, 7 and 8, which are the forces inside
which the line crosses a step; where the line crosses inside force 3 (at 8
knots) and force 10 (at 52) the table gives one state. So at 7 knots, and
from 48 to 51, the app is one state under the table, and at 2 and 3 knots one
over it. "Close to the next state" and its share of a step are Larry's (AOZ),
not a published rule. The readings "still building, or short of fetch" for a
sea under the scale follow from the two notes quoted above; "is some of it
swell?" for a sea above it is a question, not a finding.

**The glass's four words: the Met Office's bands** (`wx_band` in `wx.awk`,
`band` in `wx.js`, the deck log's pressure sentence; weather 1.0.13 and deck log
1.1.1, Larry's ruling TAVL, 18 November 2026). The Met Office's *Marine forecasts
glossary*, "Pressure tendency in station reports"
(<https://weather.metoffice.gov.uk/guides/coast-and-sea/glossary>, read 18
November 2026), grades the change in the preceding three hours:

| Met Office | change in 3 h | `weather` |
|---|---|---|
| rising or falling slowly | 0.1 to 1.5 hPa | steady |
| rising or falling | 1.6 to 3.5 | rising, falling |
| rising or falling quickly | 3.6 to 6.0 | falling fast (a rise stays "rising") |
| rising or falling very rapidly | more than 6.0 | falling fast |

The rate is graded as it is printed, to a tenth of a hectopascal, because the
Met Office's bands are written in tenths: "+1.6 hPa in 3 h" is always rising.
The WeatherGlass and CelestialGlass watch faces use the same 1.6 for their
trend and 3.6 and 6.0 for their pressure figure's colours, so the watch and
`weather` read one log alike. What is the app's own: joining *slowly* to
*steady* and *quickly* to *very rapidly*, so that the barograph keeps four
words.

**The daily pressure tide** (the correction in "What the log says", the
barograph's wave and the `tide` lesson). Confirmed from sources read:

1. It is mainly semidiurnal, largest in the tropics and small in high
   latitudes, with maxima near 10:00 and 22:00 local time; its semidiurnal part
   is "somewhat over 1 hPa" in the tropics and its once-a-day part about a
   third of that (K. Hamilton's history of the atmospheric tides, preprints.org
   2024; Ray and Ponte, *Barometric tides from ECMWF operational analyses*,
   Annales Geophysicae 21, 2003).
2. "In the Tropics pressure varies little; the normal diurnal pressure change
   is only about 3 hPa" (Bowditch, *American Practical Navigator*, 2002,
   article 3506; public domain). The working's 1.4 hPa each way near the
   equator is that 3 hPa from top to bottom.

**Not yet confirmed from a source read:** how it falls off with latitude. The
working uses `cos^3(latitude)`, the shape of the classical fit usually quoted
(Haurwitz and Cowley, 1973, not read here), which gives 0.5 hPa each way at 45
degrees and 0.4 at 50.

**Larry's ruling (AOR, 17 November 2026):** the `tide` lesson quotes the
working. Until weather 1.0.6 it said "~1.2 hPa at the equator, ~0.2 at 45
deg", which the working never did; it now says 1.4 at the equator and 0.5 at
45 degrees, gives Bowditch for the tropics, and says the fall-off is the app's
own rule. `tests/wx-check.awk` holds the lesson's line to `wx_tide`.

**Read before launch: the cloud sequence, stability, and the three kinds of
data** (gap list W05, W08 and W30; Larry's ruling TAUW, 18 November 2026, that
the sources December's pages lean on are read first; read 18 November 2026).

1. **W05, the warm-front cloud sequence** (the cloud rule in "What the log
   says", `wx_cloud`). Bowditch, *American Practical Navigator*, 2017, article
   3812, p. 616: a well-developed warm front is heralded by falling pressure
   and "a more-or-less regular sequence of clouds": cirrus, then cirrostratus,
   altostratus, altocumulus and nimbostratus, with brief showers before the
   steady rain. The rule's own order (high, then middle, then low; cirrus,
   cirrostratus, altostratus, nimbostratus and rain) is that sequence, with
   altocumulus left out because the log's middle-cloud code counts both.
2. **W08, lapse rates, stability and the cloud base** (the lesson `lapse`, and
   the cloud base in "What the log says").
   1. The FAA's *Pilot's Handbook of Aeronautical Knowledge*, chapter 12,
      "Weather Theory" (US Government, public domain;
      <https://www.faa.gov/sites/faa.gov/files/14_phak_ch12.pdf>): the dry
      adiabatic lapse rate is 3 °C per 1,000 ft; the moist rate varies from
      1.1 to 2.8 °C per 1,000 ft; an inversion is where the temperature rises
      with height, and is stable; the cloud base is the temperature-dew point
      spread divided by 4.4 °F per 1,000 ft (a 5.4 °F lapse less a 1 °F fall in
      dew point). In Celsius that is 2.5 °C per 1,000 ft: the lesson's "x 400".
      The lesson's "about 1.5" for the saturated rate is inside the FAA's range.
   2. Bowditch 2017, article 3809, p. 611: air colder than the surface beneath
      it is unstable, the temperature falling markedly with height; air warmer
      than the surface is stable, the temperature rising with height.
   3. NOAA, *JetStream*, "Severe Weather" (<https://www.noaa.gov/jetstream/upperair/severe-weather>):
      CAPE, the convective available potential energy, is the potential energy
      per kilogram of a lifted parcel, in J/kg; a large CAPE means an unstable
      atmosphere aloft; a strong low inversion, the "cap", holds convection
      down until it is broken. This is the source for the gap list's "add CAPE
      and inversions" when the lesson gains them.
   4. **Corrected with this reading (weather 1.0.14):** the lesson and the
      cloud-base line said that dividing by the lapse rate alone puts the base
      "a fifth too low". It puts it a sixth too low: 2,000 ft against 2,400
      for a 6 °C spread. Now "a sixth".
   5. **Not yet confirmed from a source read:** the lesson's "trade inversion"
      capping the marine layer under flat-topped cumulus.
3. **W30, observation, analysis and model** (the lesson `data`).
   1. Bowditch 2017, article 3826, p. 631: observations from stations and
      ships are plotted on synoptic charts; analyses and prognoses are drawn
      from them; numerical models analyse and forecast; and the accuracy of a
      forecast falls with its length, a 12-hour forecast being likely to be
      more reliable than a 24-hour one.
   2. NOAA, *Unified Surface Analysis Manual* (21 November 2013;
      <https://www.nhc.noaa.gov/pdf/UASfcManualVersion1.pdf>): the surface
      analysis is drawn by analysts at NHC, WPC, OPC and HFO, is "subjective in
      nature", and uses model fields only with corroboration from other tools.
      That is the lesson's "a chart drawn from observations and then edited and
      verified by a human forecaster".
   3. **The app's own words:** "Nobody has looked at it" for model output is
      the lesson's way of saying that a GRIB is the model's numbers with no
      analyst between them and the reader. No source read says it in those
      words.
