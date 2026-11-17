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
degrees and 0.4 at 50. The `tide` lesson quotes "~1.2 hPa at the equator, ~0.2
at 45 deg", which is not what the working does. Raised with Larry, 17 November
2026.

