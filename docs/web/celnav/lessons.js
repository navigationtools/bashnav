// celnav's teaching track -- generated from bin/celnav v1.6.1 by running
// teach.awk's own lesson functions and dumping what they printed. The
// modules and their order come from syl_init(); the answers come from
// cmd=t_qmeta, because ques() only sets them on the branch that does not
// print. Do not hand-edit: regenerate with
// docs/web/celnav/gen/make-celnav-web.sh so the two cannot drift.
window.CELNAV_SYLLABUS = [
 { "id": "P1", "module": "Before the sights", "title": "Dead reckoning: course, speed and time" },
 { "id": "P2", "module": "Before the sights", "title": "Three kinds of position, and which to believe" },
 { "id": "P3", "module": "Before the sights", "title": "Set and drift: what the sea did while you were not looking" },
 { "id": "F1", "module": "Foundations", "title": "What a sight actually measures" },
 { "id": "F2", "module": "Foundations", "title": "The geographical position" },
 { "id": "F3", "module": "Foundations", "title": "Your altitude puts you on a circle" },
 { "id": "F4", "module": "Foundations", "title": "Two circles give a fix" },
 { "id": "F5", "module": "Foundations", "title": "Why we never draw the circles" },
 { "id": "T1", "module": "Time and the almanac", "title": "Universal Time, and why the clock rules" },
 { "id": "T2", "module": "Time and the almanac", "title": "GHA and declination" },
 { "id": "T3", "module": "Time and the almanac", "title": "Aries and SHA: why the stars are different" },
 { "id": "T4", "module": "Time and the almanac", "title": "LHA: the angle at the pole" },
 { "id": "T5", "module": "Time and the almanac", "title": "Using the almanac in CELNAV" },
 { "id": "S1", "module": "Sextant and corrections", "title": "Taking a sight" },
 { "id": "S2", "module": "Sextant and corrections", "title": "Index error and dip" },
 { "id": "S3", "module": "Sextant and corrections", "title": "Refraction" },
 { "id": "S4", "module": "Sextant and corrections", "title": "Semi-diameter and parallax" },
 { "id": "S5", "module": "Sextant and corrections", "title": "The whole chain, and the size of each part" },
 { "id": "R1", "module": "Reduction and the fix", "title": "The assumed position and the triangle" },
 { "id": "R2", "module": "Reduction and the fix", "title": "Hc and Zn" },
 { "id": "R3", "module": "Reduction and the fix", "title": "The intercept: toward or away" },
 { "id": "R4", "module": "Reduction and the fix", "title": "Plotting the line of position" },
 { "id": "R5", "module": "Reduction and the fix", "title": "Crossing, running, and knowing when to doubt it" },
 { "id": "L1", "module": "Latitude the direct way", "title": "The noon sight: latitude without a reduction" },
 { "id": "L2", "module": "Latitude the direct way", "title": "Polaris: latitude from one star, all night long" },
 { "id": "B1", "module": "The other bodies", "title": "The moon: where the corrections stop being bookkeeping" },
 { "id": "B2", "module": "The other bodies", "title": "The planets: a point of light that moves" },
 { "id": "C1", "module": "Choosing and checking", "title": "Choosing your bodies: the cut and the band" },
 { "id": "C2", "module": "Choosing and checking", "title": "Checking the compass against the sky" },
 { "id": "H1", "module": "The tables", "title": "What a sight reduction table actually is" },
 { "id": "H2", "module": "The tables", "title": "Volume 1: the seven selected stars" },
 { "id": "H3", "module": "The tables", "title": "Volumes 2 and 3, and the interpolation" },
 { "id": "H4", "module": "The tables", "title": "When the tables beat the calculator, and when they do not" }
];
window.CELNAV_LESSONS = [
  {
   "id": "P1",
   "title": "Dead reckoning: course, speed and time",
   "blocks": [
    {
     "t": "p",
     "s": "Everything else in this program needs a position to start from. A\nsight is reduced from an assumed position; a running fix is advanced\nalong a course and a speed; even deciding which of two circle\ncrossings is you needs a rough idea of where you are.\n\nDead reckoning is that idea, and it is the only position you can\nalways have. No sky, no satellites, no landmarks: just what you\nsteered, how fast, and for how long.\n\nIt is arithmetic and makes no claim to be true. That is not a\nweakness as long as you remember it.\n\nTHE METHOD\n\n  1. Distance run = speed x time. Nothing subtle.\n  2. Resolve it onto north and east:\n\n       northing = distance x cos(course)\n       departure = distance x sin(course)\n\n  3. Northing IS difference of latitude: one minute of latitude is\n     one nautical mile, everywhere on earth. That is what a mile is.\n\n  4. Departure is NOT difference of longitude. The meridians close\n     together toward the poles, so a mile of easting is worth more\n     than a minute of longitude:\n\n       difference of longitude = departure / cos(latitude)\n\nAt 50 degrees north, cos 50 is 0.64 - so a mile east is 1.56\nminutes of longitude. At 70 north it is nearly three. Forget this\nand your DR walks east or west of the truth, and the error grows\nwith latitude, which is exactly where the weather is worst.\nA worked run, computed by this lesson as you read it:\n\n    course 050 T    speed 6.5 kn    time 90 min\n\n                   N\n                   |\n                   |      /\n          northing |    /   distance 9.75 nm\n           6.27    |  /\n                   |/ 50 deg\n                   +------------ E\n                   departure 7.47 nm\n\n    difference of latitude      6.27'  = 6.27 nm\n    departure                   7.47 nm\n    cos(latitude 50)             0.641\n    difference of longitude    11.66'\n\nNote the last three lines. The departure and the difference of\nlongitude are different numbers for the same movement east."
    }
   ],
   "question": "Q. You steer 050 T at 6.5 knots for 90 minutes. How far north and how\n   far east are you?\n     a) 6.3 nm north and 7.5 nm east\n     b) 9.8 nm north and 9.8 nm east\n     c) 7.5 nm north and 6.3 nm east",
   "answer": "a",
   "why": "9.75 nm run; northing is distance x cos 50 = 6.3, departure is x sin 50 = 7.5. C has the sine and cosine swapped, which is the mistake to know about."
  },
  {
   "id": "P2",
   "title": "Three kinds of position, and which to believe",
   "blocks": [
    {
     "t": "p",
     "s": "A chart can carry three marks that all claim to be where you are.\nThey are not the same claim.\n\n  DR   DEAD RECKONING. Course, speed and time from the last known\n       position. No observation in it at all. It is where you would\n       be if the water had stood still and the helm had been\n       perfect.\n\n  EP   ESTIMATED POSITION. The DR with what you know about the\n       water put back in - set, drift, leeway. Better than the DR,\n       and still an assumption rather than an observation.\n\n  FIX  Two or more lines of position, each from something outside\n       the ship. The only one of the three with an observation in\n       it.\n\nThe order of confidence never changes: fix, then EP, then DR. A\nnavigator who cannot say which of the three a mark is has lost the\nonly thing that matters about it.\n\nWHY THIS MODULE COMES BEFORE THE SIGHTS\n\nA celestial fix is not independent of your DR. Three places it\nleans on it:\n\n  1. The assumed position comes from the DR. Put it far from the\n     truth and the intercept gets long, and a long intercept is\n     where the straight-line approximation starts to cost you.\n  2. A running fix advances the earlier line of position along your\n     course and speed. A log reading 5 per cent high puts that error\n     straight into the fix - and it will look like a good fix.\n  3. With one body you have a line, not a position. Which point on\n     that line you are is a DR question.\n\nSo the fix is only ever as good as the reckoning you ran it from.\nThat is the honest version of \"celestial navigation\": it is\nreckoning, corrected by observation, not observation alone.\n\nONE SHIP, THREE MARKS, FOUR HOURS APART"
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 63,
     "h": 13,
     "n": 1
    },
    {
     "t": "p",
     "s": "o = where you were   x = DR   e = EP   O = where you actually are\none row and one column = 1 nm.\n\nThe DR ran 24 miles east on course and log alone. The EP allowed\nfour miles of south-going set. The fix landed near the EP and not\non it, which is the normal case - and the reason the next set and\ndrift is worked from the fix and never from the estimate."
    }
   ],
   "question": "Q. Which of the three would you bet the ship on, and why?\n     a) the DR, because it is arithmetic and cannot be wrong\n     b) the fix, because it is the only one with an observation in it\n     c) the EP, because it allows for the current",
   "answer": "b",
   "why": "The DR's arithmetic being right is not the question - it is right about an assumption. The EP adds a better assumption. Only the fix looked outside the ship."
  },
  {
   "id": "P3",
   "title": "Set and drift: what the sea did while you were not looking",
   "blocks": [
    {
     "t": "p",
     "s": "You have a DR for 0800 and a star fix for 0800, and they are not in\nthe same place. The difference has a name and a use.\n\n  SET    the direction the water is setting TOWARD, in degrees true\n  DRIFT  its rate, in knots\n\nTake the bearing and distance from the DR to the fix. The bearing\nis the set. The distance divided by the hours since the last fix is\nthe drift. That is the whole calculation.\n\nTWO THINGS TO BE HONEST ABOUT\n\n  1. It is a remainder, not a measurement. Nothing in it was\n     observed. It is everything your reckoning failed to account\n     for, and the current is only one item on that list: leeway, a\n     log reading high or low, steering that averaged a few degrees\n     off the ordered course, and the error of the fix itself are all\n     inside the same number.\n  2. Direction is the commonest mistake. The set is FROM the DR\n     TOWARD the fix. If your reckoning put you west of where you\n     really were, the water has been setting you east - toward the\n     fix, not away from it. The reciprocal is a plausible, wrong,\n     and completely silent error.\n\nIN CELNAV\n\n  celnav current   given the DR, the fix and the hours, the set and\n                   the drift\n  celnav ep        given a position, a course, a speed and a time,\n                   the DR - and with a set and drift, the EP\n\nCarry a set and drift forward as the best estimate you have, and\nexpect the next fix to revise it. A tidal stream turns; an ocean\ncurrent does not, much. Which you are in decides how much faith the\nnumber deserves tomorrow.\nWorked as you read it, by the same code the command uses:\n\n    0800 DR               50 00.0'N  005 00.0'W\n    0800 star fix         50 02.8'N  004 55.6'W\n    hours since the DR    4\n\n    the fix lies          4.0 nm  045 T  from the DR\n    SET                   045 T\n    DRIFT                 1.00 kn\n\nReverse the two positions and the set comes out 225 T instead of\n045 T - the same magnitude, the opposite conclusion, and nothing on\nthe page to tell you which one you did."
    }
   ],
   "question": "Q. Your 0800 DR and your 0800 star fix are 4 miles apart, the fix to the\n   north-east. The last fix was at 0400. What is the set and drift?\n     a) set 045 T, drift 1.0 kn\n     b) set 225 T, drift 1.0 kn\n     c) set 045 T, drift 4.0 kn",
   "answer": "a",
   "why": "Set is FROM the DR TOWARD the fix, so 045. Drift is 4 miles over 4 hours = 1 knot. B is the reciprocal and C forgot the hours."
  },
  {
   "id": "F1",
   "title": "What a sight actually measures",
   "blocks": [
    {
     "t": "p",
     "s": "A sextant measures one thing: the angle between a body in the sky and\nyour horizon. Nothing else. It does not know where you are, and it does\nnot care.\n\n  1. You bring the body down to the horizon in the mirrors and read the\n     angle off the arc. That reading is Hs, the sextant altitude.\n  2. Straight overhead is 90 degrees. The horizon is 0. So an altitude of\n     40 degrees means the body stands 40 degrees up from the sea.\n  3. The useful quantity is the other half of that: 90 minus the altitude,\n     called the zenith distance. It is how far the body is from being\n     directly overhead.\n\nThat last number is the whole trick, and the next two lessons are about\nwhy. Hold on to it: zenith distance = 90 - altitude.\n\n     zenith (straight up)\n         |\n         |      90 - Hs = zenith distance\n         |   .-'\n         | .'        * the body\n         |'      .-'\n         |   .-'   Hs = the angle you measure\n      you o------------------------------  your horizon"
    }
   ],
   "question": "Q. You measure an altitude of 62 degrees. What is the zenith distance?\n     a) 62 degrees      b) 28 degrees      c) 152 degrees",
   "answer": "b",
   "why": "90 - 62 = 28 degrees, which is 1680 miles from the GP."
  },
  {
   "id": "F2",
   "title": "The geographical position",
   "blocks": [
    {
     "t": "p",
     "s": "At any instant, every body in the sky is directly overhead somewhere on\nthe earth. That spot is its geographical position, or GP.\n\n  1. The GP has a latitude and a longitude, like any other place.\n  2. Its latitude is the body's declination - how far north or south of\n     the celestial equator the body lies.\n  3. Its longitude comes from the body's Greenwich Hour Angle, GHA -\n     how far west of Greenwich it has swung.\n  4. The GP moves, and quickly: the earth turns 15 degrees of longitude\n     an hour, so a body's GP travels about 900 nautical miles westward\n     every hour at the equator.\n\nThe almanac exists to answer one question: at this instant of Universal\nTime, where is this body's GP? Declination gives the latitude, GHA gives\nthe longitude. That is all an almanac is for.\n\nNothing here depends on where you are. The GP is the same for every\nobserver on earth at that instant, which is exactly what makes it useful."
    }
   ],
   "question": "Q. What does a body's declination tell you?\n     a) the latitude of its GP   b) the longitude of its GP   c) its altitude",
   "answer": "a",
   "why": "Declination is the latitude of the GP; GHA gives the longitude."
  },
  {
   "id": "F3",
   "title": "Your altitude puts you on a circle",
   "blocks": [
    {
     "t": "p",
     "s": "Now put the two ideas together.\n\n  1. If a body were exactly overhead, its altitude would be 90 degrees\n     and you would be standing on its GP.\n  2. Measure an altitude of 50 degrees instead, and your zenith distance\n     is 40 degrees. You are 40 degrees away from the GP.\n  3. One degree on the earth is 60 nautical miles, so you are 2400 miles\n     from the GP - but the sextant says nothing about which direction.\n  4. Every point 2400 miles from the GP is a candidate. Those points form\n     a circle drawn on the earth, centred on the GP.\n\nThat circle is your circle of position. One sight, one circle. You are\nsomewhere on it."
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 67,
     "h": 25,
     "n": 1
    },
    {
     "t": "p",
     "s": "Altitude 50 degrees, so the zenith distance is 40 degrees, so you are\n2400 miles from the GP. Every @ satisfies the sight equally well."
    }
   ],
   "question": "Q. A sight gives a zenith distance of 30 degrees. How far are you from the GP?\n     a) 30 miles        b) 300 miles       c) 1800 miles",
   "answer": "c",
   "why": "30 degrees times 60 miles per degree = 1800 nautical miles."
  },
  {
   "id": "F4",
   "title": "Two circles give a fix",
   "blocks": [
    {
     "t": "p",
     "s": "One circle is not a position. Two are.\n\n  1. Take a second sight of a different body. It gives a second circle,\n     centred on that body's GP.\n  2. Two circles on a sphere cross in two places, and you are at one of\n     them.\n  3. The two crossings are usually hundreds or thousands of miles apart,\n     so your dead reckoning tells you at a glance which one is yours.\n  4. A third sight is the check. If all three circles pass through the\n     same small area, the round was a good one. If they enclose a large\n     triangle, one of the sights is wrong.\n\nThat is celestial navigation entire. Everything after this lesson is\nabout doing it accurately and quickly, on a small chart table, without\ndrawing circles thousands of miles across."
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 67,
     "h": 25,
     "n": 1
    },
    {
     "t": "p",
     "s": "Two bodies, two circles, and they cross in two places. Your dead\nreckoning tells you which crossing is yours - they are a long way apart."
    }
   ],
   "question": "Q. Two circles of position cross in two places. What decides which one is you?\n     a) the brighter body   b) your dead reckoning   c) the higher altitude",
   "answer": "b",
   "why": "The crossings are usually hundreds of miles apart, so a rough DR settles it."
  },
  {
   "id": "F5",
   "title": "Why we never draw the circles",
   "blocks": [
    {
     "t": "p",
     "s": "A circle of position is typically two or three thousand miles across.\nYou cannot draw one on a chart. You do not need to.\n\n  1. You already know roughly where you are - your dead reckoning.\n  2. Near your DR, a stretch of that vast circle is almost perfectly\n     straight. Over 60 miles it departs from a straight line by a\n     fraction of a mile.\n  3. So instead of the circle, we draw a short straight line: the line\n     of position, or LOP.\n  4. To place it we need two things - how far the circle passes from\n     the DR, and in what direction. Those are the intercept and the\n     azimuth, and computing them is what sight reduction does.\n\nThe picture below is the circle from lesson F3, zoomed in to a 60-mile\nstretch, with the vertical stretched so that you can see the curve at all."
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 67,
     "h": 13,
     "n": 1
    }
   ],
   "question": "Q. Why can a line of position be drawn straight?\n     a) the circle really is straight   b) over a few tens of miles the\n        curvature is a fraction of a mile   c) because the earth is flat locally",
   "answer": "b",
   "why": "Across 60 miles a typical circle departs from the chord by about 0.2 miles."
  },
  {
   "id": "T1",
   "title": "Universal Time, and why the clock rules",
   "blocks": [
    {
     "t": "p",
     "s": "Everything in celestial navigation is referred to Universal Time, which\nfor our purposes is the same as GMT. Not ship's time, not local time.\n\n  1. The earth turns 360 degrees in 24 hours: 15 degrees an hour,\n     15 minutes of arc a minute, 15 seconds of arc a second.\n  2. At the equator one minute of arc of longitude is one nautical mile.\n     So one second of clock error is a quarter of a mile of longitude.\n  3. Four seconds is a mile. Forty seconds is ten miles.\n  4. A clock error moves your longitude and leaves your latitude alone,\n     which is a useful thing to recognise: if a fix is wrong east-west\n     but right north-south, suspect the time before anything else.\n\nThe practical rules that follow from this:\n\n  - Set your watch against a known source and write down the error and\n    the date you checked it.\n  - Note the time of a sight to the second, at the instant the body\n    touches the horizon.\n  - If you are shooting alone, call the time out loud as you take it, or\n    take the sight and then read the watch - never the other way round."
    }
   ],
   "question": "Q. Your watch is 20 seconds fast and you do not allow for it. How wrong is the fix?\n     a) 5 miles of longitude   b) 20 miles of longitude   c) 5 miles of latitude",
   "answer": "a",
   "why": "Four seconds is one mile, so 20 seconds is five - and it is longitude, not latitude."
  },
  {
   "id": "T2",
   "title": "GHA and declination",
   "blocks": [
    {
     "t": "p",
     "s": "These two numbers are the GP, and the almanac's whole job is to produce\nthem for a given instant.\n\n  1. Declination is the latitude of the GP. North is positive, south\n     negative. The sun's declination swings between about 23.4 degrees\n     north in June and 23.4 south in December, and it is what gives us\n     seasons.\n  2. Greenwich Hour Angle is the longitude of the GP, measured westward\n     from Greenwich, and always written 0 to 360 degrees rather than\n     east and west.\n  3. To convert: a GHA of 45 degrees is longitude 45 degrees west. A GHA\n     of 300 degrees is longitude 60 degrees east, because 360 - 300 = 60.\n  4. GHA increases by about 15 degrees an hour for every body, because it\n     is really a measure of the earth's rotation.\n\nIn CELNAV, 'celnav alm' prints GHA and declination for any body at any\ntime. You can check it against a printed Nautical Almanac page and the\nfigures will agree to a fraction of a minute of arc."
    }
   ],
   "question": "Q. A body has GHA 300 degrees. What longitude is its GP in?\n     a) 300 degrees west   b) 60 degrees east   c) 60 degrees west",
   "answer": "b",
   "why": "GHA is measured west, so 300 west is the same place as 60 east."
  },
  {
   "id": "T3",
   "title": "Aries and SHA: why the stars are different",
   "blocks": [
    {
     "t": "p",
     "s": "The sun, moon and planets each get their own GHA in the almanac. The\nstars are handled differently, and for a good reason.\n\n  1. The stars are so far away that they do not move relative to one\n     another in any human timescale. The whole star sphere turns as one\n     rigid thing.\n  2. So the almanac gives the hour angle of one imaginary point, the\n     First Point of Aries, and then each star's fixed offset from it.\n  3. That offset is the Sidereal Hour Angle, SHA, measured westward from\n     Aries. Sirius has an SHA of about 259 degrees and will still have\n     it in twenty years.\n  4. So: GHA of a star = GHA Aries + SHA, subtracting 360 if needed.\n\nOne consequence worth knowing: the star sphere gains about four minutes\na day on the sun. A star that crosses your meridian at 2000 tonight will\ndo it at 1956 tomorrow, and two hours earlier in a month."
    }
   ],
   "question": "Q. How do you get the GHA of a star?\n     a) it is tabulated for each star   b) GHA Aries plus the star's SHA\n     c) GHA of the sun plus the star's SHA",
   "answer": "b",
   "why": "One hour angle for the whole star sphere, plus each star's fixed offset."
  },
  {
   "id": "T4",
   "title": "LHA: the angle at the pole",
   "blocks": [
    {
     "t": "p",
     "s": "GHA is measured from Greenwich. What matters to you is the angle measured\nfrom your own meridian, and that is the Local Hour Angle.\n\n  1. LHA = GHA + your longitude, counting east longitude as positive and\n     west as negative, then brought back into the range 0 to 360.\n  2. LHA 0 means the body is exactly on your meridian - due north or due\n     south of you, and at its highest for the day. That is the noon sight.\n  3. LHA 90 means the body is a quarter of the way round the sky to the\n     west of you; LHA 270 means a quarter of the way to the east.\n  4. LHA is the angle at the pole in the navigational triangle, which is\n     the shape the whole reduction is built on. You meet it again in R1.\n\nWorked example. GHA of the sun is 283 degrees 42 minutes; you are in\nlongitude 40 degrees west. LHA = 283 42 - 40 00 = 243 42. The sun is\n243 degrees west of you round the sky - which is another way of saying\n116 degrees to the east of you, and therefore still in the morning sky."
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 61,
     "h": 23,
     "n": 1
    },
    {
     "t": "p",
     "s": "  |  the Greenwich meridian      o  yours      *  the body's meridian\n  ---  GHA, measured west from Greenwich\n  ===  LHA, measured west from your own meridian\n  Looking down on the north pole. West is clockwise.\n\nGHA 283 42', longitude 040 00'W, so LHA = 283 42 - 40 00 = 243 42'."
    }
   ],
   "question": "Q. GHA is 210 degrees and you are in longitude 30 degrees east. What is LHA?\n     a) 180 degrees     b) 240 degrees     c) 330 degrees",
   "answer": "b",
   "why": "LHA = GHA + longitude east = 210 + 30 = 240 degrees."
  },
  {
   "id": "T5",
   "title": "Using the almanac in CELNAV",
   "blocks": [
    {
     "t": "p",
     "s": "CELNAV computes the almanac rather than tabulating it, so there is no\nyear to run out and no page to turn.\n\n  1. 'celnav alm \"2026-08-29 07:30:00\" sun,moon,venus' prints GHA,\n     declination, semi-diameter and horizontal parallax for those bodies.\n  2. Add a star by name - 'celnav alm \"...\" Dubhe' - and it also prints\n     the SHA, so you can cross-check against a printed almanac.\n  3. 'celnav stars' lists all 57 navigational stars plus Polaris with\n     their SHA and declination for the date.\n  4. GHA Aries is printed at the top of every almanac page, so you can\n     verify the star relation from T3 by hand.\n\nA good habit while you are learning: work a sight from a paper almanac,\nthen run the same time and body through CELNAV. Where the two disagree\nby more than a couple of tenths of a minute, one of you has made a\nmistake - and finding out which is the most useful hour you can spend."
    }
   ],
   "question": "Q. Why does CELNAV never need an almanac update?\n     a) it stores fifty years of tables   b) it computes the positions\n     c) it downloads them when it can",
   "answer": "b",
   "why": "Positions come from orbital theory in the script, so nothing expires."
  },
  {
   "id": "S1",
   "title": "Taking a sight",
   "blocks": [
    {
     "t": "p",
     "s": "The instrument work is most of the accuracy. The arithmetic that follows\nis exact; your sight is not.\n\n  1. Pre-set roughly. For a star, set the sextant to the altitude you\n     expect - CELNAV's planning list gives it - and the star will be near\n     the horizon in the mirror when you look along the bearing.\n  2. Bring the body down to the horizon, then rock the sextant gently\n     side to side. The body swings in an arc; the lowest point of that\n     arc is true vertical. Touch it to the horizon there.\n  3. Sun: bring the lower limb - the bottom edge - to sit on the horizon.\n     Use the shades. Never look at the sun without them.\n  4. Note the time at the instant of contact, then read the arc.\n\nThree practical points that matter more than they sound:\n\n  - Take three or four sights of the same body in quick succession and\n    keep them all. Their scatter tells you what your sights are worth.\n  - Shoot from as high as you can safely stand, and know that height.\n  - In a seaway, wait for the top of the roll so that you see a true\n    horizon rather than the back of a wave."
    }
   ],
   "question": "Q. Why do you rock the sextant while taking a sight?\n     a) to steady your hand   b) to find true vertical - the lowest point of the swing\n     c) to clear the mirrors",
   "answer": "b",
   "why": "A sextant not held vertical always reads too high. The bottom of the arc is vertical."
  },
  {
   "id": "S2",
   "title": "Index error and dip",
   "blocks": [
    {
     "t": "p",
     "s": "Two corrections come off before anything else. Both are about you and\nyour instrument, not about the sky.\n\n  INDEX ERROR is the sextant reading when it should read zero.\n  1. Set the sextant to zero and look at the horizon. If the two images\n     do not line up, the difference is the index error.\n  2. If the reading is on the arc - a positive reading - the error is\n     subtracted. Off the arc, it is added. Check it every day; it moves.\n\n  DIP is because you are not at sea level.\n  3. From a height, the visible horizon is slightly below true\n     horizontal, so every altitude you measure is slightly too big.\n  4. Dip in minutes of arc is about 1.76 times the square root of your\n     height of eye in metres. From 3 metres that is 3.0 minutes - three\n     miles of error if you forget it.\n\nTake both off Hs and you have Ha, the apparent altitude."
    }
   ],
   "question": "Q. Your height of eye is 9 metres. Roughly what is the dip?\n     a) 1.8 minutes     b) 5.3 minutes     c) 9 minutes",
   "answer": "b",
   "why": "1.76 times the square root of 9 = 1.76 x 3 = 5.3 minutes, always subtracted."
  },
  {
   "id": "S3",
   "title": "Refraction",
   "blocks": [
    {
     "t": "p",
     "s": "The atmosphere bends light downwards as it comes in, so every body\nappears higher than it really is. Refraction is always subtracted.\n\n  1. It depends almost entirely on altitude. At 45 degrees it is one\n     minute of arc. At 20 degrees, about 2.6. At 10 degrees, 5.3. At the\n     horizon it reaches about 34 minutes - more than the sun's diameter.\n  2. That is why the setting sun you can see is already, geometrically,\n     below the horizon.\n  3. Temperature and pressure change it by a few per cent. CELNAV asks\n     for both; they matter for low sights and are almost irrelevant\n     above 25 degrees.\n  4. Below about 15 degrees, refraction depends on the real temperature\n     profile between you and the horizon, which no formula knows. That is\n     the reason low sights are less trustworthy, not the sextant.\n\nPractical rule: prefer bodies between 15 and 70 degrees. Above 70 the\nazimuth changes quickly with position; below 15 the refraction is a guess."
    }
   ],
   "question": "Q. Which sight is least affected by uncertainty in refraction?\n     a) a body at 8 degrees   b) a body at 25 degrees   c) a body at 60 degrees",
   "answer": "c",
   "why": "Refraction shrinks fast with altitude - about 0.6 minutes at 60 degrees."
  },
  {
   "id": "S4",
   "title": "Semi-diameter and parallax",
   "blocks": [
    {
     "t": "p",
     "s": "Two more corrections, needed only for the sun and moon.\n\n  SEMI-DIAMETER, because the sun and moon are discs, not points.\n  1. You measured an edge; you want the centre. The sun's semi-diameter\n     is about 16 minutes, the moon's about 15 to 16.\n  2. Lower limb: add it. Upper limb: subtract it. Stars and planets are\n     points, so there is nothing to do.\n\n  PARALLAX, because you are on the surface of the earth, not at its\n  centre, and the almanac gives positions as seen from the centre.\n  3. For the sun this is at most 0.15 minutes - one sixth of a mile, and\n     usually ignorable but free to include.\n  4. For the moon it is enormous: up to about 61 minutes, a full degree.\n     A moon sight worked without parallax is 60 miles wrong. It is\n     largest when the moon is on the horizon and zero when overhead,\n     which is why the correction carries a cosine of the altitude."
    }
   ],
   "question": "Q. You take an upper-limb sight of the sun. What do you do with semi-diameter?\n     a) add about 16 minutes   b) subtract about 16 minutes   c) ignore it",
   "answer": "b",
   "why": "Upper limb subtract, lower limb add - you are correcting to the centre."
  },
  {
   "id": "S5",
   "title": "The whole chain, and the size of each part",
   "blocks": [
    {
     "t": "p",
     "s": "In order, always: Hs, then index error and dip to get Ha, then refraction,\nparallax and semi-diameter to get Ho. Ho is what a perfect observer at the\ncentre of the earth would have measured, and it is the number the\nreduction uses.\n\nBelow is a real sun sight with every correction drawn to scale, so you\ncan see which ones actually matter.\n\nA sun sight: Hs 34 12.0', lower limb, index error 1.5' on the arc,\nheight of eye 4 m, 15 C, 1013 mb.\n\n  Hs  sextant reading       34 12.0'\n  index error                -1.5'  =\n  dip (height of eye)        -3.5'  ==\n  Ha  apparent altitude     34 07.0'\n  refraction                 -1.4'  =\n  parallax                   +0.1'\n  semi-diameter             +15.9'  =========\n  Ho  observed altitude     34 21.6'\n\nSemi-diameter and dip dominate; refraction is small at this altitude;\nthe sun's parallax is almost nothing. For the moon the picture is\nentirely different - parallax alone can be a whole degree."
    }
   ],
   "question": "Q. Which correction is by far the largest for a low moon sight?\n     a) refraction      b) parallax        c) dip",
   "answer": "b",
   "why": "The moon's parallax reaches about 61 minutes - over a degree, or 60 miles."
  },
  {
   "id": "R1",
   "title": "The assumed position and the navigational triangle",
   "blocks": [
    {
     "t": "p",
     "s": "You cannot compute your position directly. You compute what a sight\nwould have looked like from a position you assume, and then compare.\n\n  1. Take an assumed position - in CELNAV, your DR itself.\n  2. Draw three points on the sky as seen from there: your zenith Z\n     straight overhead, the elevated pole P, and the body itself.\n  3. Those three points make a spherical triangle, and every quantity in\n     sight reduction is one of its parts:\n\n       side Z to P    = 90 - your latitude          (co-latitude)\n       side P to body = 90 - the declination        (polar distance)\n       side Z to body = 90 - the altitude           (zenith distance)\n       angle at P     = LHA\n       angle at Z     = the azimuth of the body\n\n  4. You know the first two sides and the angle between them, so the\n     triangle is fully determined. Solving it gives the third side and\n     the angle at Z - which is to say, the altitude and bearing the body\n     would have had from your assumed position."
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 61,
     "h": 25,
     "n": 1
    },
    {
     "t": "p",
     "s": "Latitude 35 N, declination 20 N, LHA 310. Z is your zenith at the\ncentre, P the pole, * the body. The rim is your horizon.\nSolving it gives Hc 43.7 degrees and Zn 95 degrees true."
    }
   ],
   "question": "Q. In the navigational triangle, what is the side from the pole to the body?\n     a) 90 minus latitude   b) 90 minus declination   c) 90 minus altitude",
   "answer": "b",
   "why": "Polar distance: 90 minus the declination. The angle at the pole is LHA."
  },
  {
   "id": "R2",
   "title": "Hc and Zn",
   "blocks": [
    {
     "t": "p",
     "s": "Solving that triangle gives two numbers, and CELNAV prints both.\n\n  1. Hc, the computed altitude:\n\n         sin Hc = sin(lat) sin(dec) + cos(lat) cos(dec) cos(LHA)\n\n  2. Zn, the true bearing of the body from the assumed position, taken\n     from the same triangle and given as 000 to 360 degrees true.\n  3. Hc is what you would have measured if you really had been at the\n     assumed position. Ho is what you did measure. They differ because\n     you are not there.\n  4. Zn is the direction of the body's GP from you - which is also the\n     direction in which the circle of position runs away from you, and\n     therefore the direction along which the whole comparison is made.\n\nTwo lines of trigonometry replace a book of tables. The tables were only\never a way of doing this arithmetic without a calculator."
    }
   ],
   "question": "Q. What is Hc?\n     a) the altitude you measured   b) the altitude you would have measured\n        from the assumed position   c) the corrected sextant reading",
   "answer": "b",
   "why": "Hc comes entirely from the assumed position and the almanac - your sextant plays no part in it."
  },
  {
   "id": "R3",
   "title": "The intercept: toward or away",
   "blocks": [
    {
     "t": "p",
     "s": "Here is where the sight finally tells you something about your position.\n\n  1. The intercept is simply Ho minus Hc, in minutes of arc - which are\n     nautical miles.\n  2. A bigger altitude means you are closer to the GP. So if Ho is\n     greater than Hc, you are nearer the body than the assumed position\n     was: the intercept is TOWARD, in the direction Zn.\n  3. If Ho is less than Hc, you are further away: AWAY, in the opposite\n     direction.\n  4. The old mnemonic is 'computed greater, away' - if Hc is the greater\n     of the two, plot away from the body.\n\nExample. Ho is 19 degrees 24.8 minutes, Hc is 19 degrees 23.3 minutes.\nThe difference is 1.5 minutes, so 1.5 miles, and Ho is the larger:\n1.5 miles TOWARD the body along its azimuth."
    }
   ],
   "question": "Q. Ho is 40 12.0' and Hc is 40 19.0'. What do you plot?\n     a) 7 miles toward the body   b) 7 miles away from the body\n     c) 31 miles toward the body",
   "answer": "b",
   "why": "Hc is the greater, so away: computed greater, away. The difference is 7.0 minutes = 7 miles."
  },
  {
   "id": "R4",
   "title": "Plotting the line of position",
   "blocks": [
    {
     "t": "p",
     "s": "Three steps, and they are the same whether you use paper or the screen.\n\n  1. Mark the assumed position.\n  2. Draw the azimuth line from it, in the direction Zn.\n  3. Measure the intercept along that line - toward the body or away from\n     it - and mark the point. That point is on your circle of position.\n  4. Through that point draw a line at right angles to the azimuth. That\n     is the line of position. You are somewhere on it.\n\nWhy at right angles: the azimuth points at the GP, and the circle of\nposition is centred on the GP, so the circle - and the straight line we\nuse in its place - must cross the azimuth square on.\n\nOn CELNAV's plot the assumed position is the + at the centre, the dotted\nline is the azimuth, the letter marks the end of the intercept, and the\nlettered line through it is the LOP.\n\n\nONE SIGHT PLOTTED, AND A SECOND CROSSING IT\n@@PLOT 2 0.000000 0.000000 0\n@@LOP 1 27.000000 1.500000 a\n@@LOP 2 128.000000 -19.000000 b"
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 73,
     "h": 27,
     "n": 1
    },
    {
     "t": "p",
     "s": "AP = +    LOP = lettered line    fix = @    1 row = 2 nm, 1 column = 1 nm\nA near-vertical LOP steps a column part way down: a cell is 1 nm\nwide, so one degree off vertical is 0.9 nm across this sheet."
    }
   ],
   "question": "Q. Which way does the line of position run?\n     a) along the azimuth   b) at right angles to the azimuth   c) east and west",
   "answer": "b",
   "why": "The circle is centred on the GP, so it crosses the azimuth square on."
  },
  {
   "id": "R5",
   "title": "Crossing, running, and knowing when to doubt it",
   "blocks": [
    {
     "t": "p",
     "s": "  CROSSING. Two LOPs from bodies well apart in azimuth cross at your\n  position. Three give you a check: a small triangle means good sights,\n  a large one means at least one is wrong.\n\n  RUNNING. Sights taken minutes or hours apart were taken from different\n  places, because the boat moved. Each earlier LOP is advanced along the\n  course made good by the distance run, and the fix is taken from the\n  advanced lines. Set course and speed and CELNAV does this for you; the\n  classic case is the sun line in the morning advanced to noon.\n\n  DOUBTING. Two things tell you how much to trust a fix:\n  1. The residuals - how far each LOP misses the final answer. This is\n     your observing error, and under a mile is good work from a small\n     boat.\n  2. The geometry - how far one minute of sight error moves the fix.\n     Bodies bunched in one quarter of the sky give a long thin error\n     ellipse and a confident-looking fix that is badly wrong along one\n     axis. CELNAV prints this in miles and warns you when the cut is weak.\n\n  Bodies about 120 degrees apart in azimuth give the tightest fix, which\n  is why the planning list suggests three with the widest spread."
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 71,
     "h": 23,
     "n": 1
    },
    {
     "t": "p",
     "s": "  .  the LOP from the first sight, where it fell at the time\n  =  the same LOP advanced along the run\n  |  the LOP from the second sight     >  the run     @  the fix"
    }
   ],
   "question": "Q. Three stars all bore between 040 and 070 degrees. What is wrong with the fix?\n     a) nothing, three sights is three sights   b) the LOPs are nearly parallel,\n        so the position is poorly fixed along one axis   c) the stars are too bright",
   "answer": "b",
   "why": "A narrow spread gives a long thin error ellipse. CELNAV reports this in miles."
  },
  {
   "id": "L1",
   "title": "The noon sight: latitude without a reduction",
   "blocks": [
    {
     "t": "p",
     "s": "Everything in modules R and S was about a sight taken at any old\nmoment, from a position you only guessed. There is one moment in the\nday when none of that is needed.\n\nAt local apparent noon the sun crosses your meridian. Its LHA is\nzero. Look at what that does to the navigational triangle:\n\n  1. The angle at the pole IS the LHA, and it has gone to zero. A\n     triangle with no angle at one corner is not a triangle: the\n     three points lie on one great circle, your own meridian.\n  2. So the azimuth has no east-west component at all. The sun bears\n     due south of you, or due north, and nothing in between.\n  3. A line of position runs square across the azimuth. Square across\n     due south is due east and west - a parallel of latitude.\n\nThat is why this sight needs no assumed position and no intercept.\nYou are not comparing what you measured with what you would have\nmeasured from somewhere else. You are measuring your latitude.\n\nThe whole method:\n\n     zenith distance  =  90 - Ho\n     latitude         =  declination  +/-  zenith distance\n\nand the sign is only which side of you the sun stood: PLUS the\nzenith distance if it bore south of you, MINUS if it bore north.\n\nThree things to know about the moment itself.\n\n  4. It is not noon by your watch, and it is not noon by local mean\n     time either. Two corrections stand between: your longitude\n     (four minutes of time per degree) and the equation of time,\n     which runs from about 14 minutes behind the clock in February\n     to 16 minutes ahead of it in November.\n  5. You do not need to know it in advance. The altitude is at a\n     maximum, so it is momentarily standing still - it changes as\n     the SQUARE of the time either side. Follow the sun up, catch\n     the highest reading it gives you, and watch it start to fall.\n     The reading is what you want; the clock is not the point.\n  6. That is the opposite of every other sight you have taken. Four\n     seconds of clock error moves a star sight a mile. Here it moves\n     almost nothing, which is why this sight was the backbone of\n     navigation for two centuries.\n\nAnd the honest limit. One sight, one line, and that line is a\nparallel of latitude: it is true on its own and needs no crossing,\nbut it tells you NOTHING about your longitude. For that you need a\nsecond body, or a second sight after a run, or the old trick of\nequal altitudes either side of noon.\n\n  celnav noon                      the moment, and what to expect\n  celnav noon \"2026-10-21\" <Hs>    the latitude from your reading\n\n          Z    your zenith - and its height above the equator\n          |    IS your latitude, which is what you want\n          |\n          |    90 - Ho, the zenith distance: how far the sun\n          |    stands from straight overhead\n          |\n          *    the sun, on your meridian, bearing due south\n          |\n          |    its declination, straight out of the almanac\n   - - - -+- - - -   the celestial equator\n\nRead it off the diagram: from the equator up to your zenith is your\nlatitude, and that same span is the declination plus the zenith\ndistance. There is nothing else in it.\n\nA worked one. Falmouth, 50 09'N 005 04'W, on 21 October 2026:\n\n  the sun crosses your meridian at   12:04:54 UT\n  its declination then is            10 48.1' S\n  so expect a meridian altitude of   29.0 degrees, bearing south\n  measure that, and 90 - Ho = 60 57.1' of zenith distance,\n  which minus 10 48.1' of southerly declination puts you\n  back on 50 09.0'."
    }
   ],
   "question": "Q. At local apparent noon your zenith distance is 60 57.0', the sun's\n   declination is 10 48.1' S, and the sun bore due south of you. Where are you?\n     a) 50 08.9' N      b) 71 45.1' N      c) 50 08.9' S",
   "answer": "a",
   "why": "Latitude is the declination plus the zenith distance, and the declination is southerly: 60 57.0 - 10 48.1 = 50 08.9 N. Adding the two instead gives (b), which is the commonest mistake of all."
  },
  {
   "id": "L2",
   "title": "Polaris: latitude from one star, all night long",
   "blocks": [
    {
     "t": "p",
     "s": "The noon sight gives you latitude at one moment of the day. There is\nanother that gives it to you any time the horizon is visible, and it\nneeds even less arithmetic.\n\nThe pole of the sky has no star on it. But one lies close: Polaris,\na little over half a degree off. Here is why that matters.\n\n  1. The altitude of the celestial pole above your horizon IS your\n     latitude. Exactly, always, by the geometry of the thing - stand\n     on the equator and the pole is on your horizon; stand at the\n     pole and it is overhead.\n  2. So if Polaris sat ON the pole, you would measure your latitude\n     directly off the sextant, with nothing to correct and no\n     almanac to open.\n  3. It does not. It circles the pole once a day at that half a\n     degree and a bit, so it stands sometimes above the pole and\n     sometimes below it and mostly to one side.\n\nThe whole correction is therefore one question: where on that little\ncircle is Polaris right now? And its LHA answers it.\n\n     at upper transit, above the pole:   latitude = Ho - p\n     at lower transit, below the pole:   latitude = Ho + p\n     anywhere between:                   latitude = Ho - p cos LHA\n\nwhere p is the polar distance, 90 minus the declination.\n\n  4. The almanac prints this as Ho - 1 degree + a0 + a1 + a2. Do not\n     let the three columns suggest three ideas: they are one\n     correction, written as a series. a0 carries almost all of it\n     and depends on the LHA of Aries; a1 is a small term in your\n     latitude and a2 a smaller one in the month. The constant degree\n     is subtracted only so that all three columns can be printed as\n     positive numbers.\n  5. CELNAV does not need the series. It has Polaris's own GHA and\n     declination, so it solves the triangle the star is standing in\n     and gets the answer in closed form. Ask it for a sight and it\n     prints both: the first-order correction above, and the exact\n     one, so you can see the size of what a1 and a2 are for.\n\nTwo honest limits, and the first is not small.\n\n  6. There is no Polaris in the southern hemisphere. Nothing bright\n     sits near the south pole - Sigma Octantis is a degree off and\n     barely visible - so this method simply does not exist below the\n     equator, and a noon sight does the work instead.\n  7. It is one line, a parallel of latitude, and tells you nothing\n     about your longitude. What it does give you is time: Polaris\n     is up all night, so you are not waiting for a particular\n     moment the way you are at noon.\n\nAnd a long slow caveat worth knowing: Polaris has not always been\nthe pole star and will not stay one. The earth's axis precesses, so\nthe pole is drifting through the sky - Polaris is closing on it now,\nwill be at its nearest around 2100, and in two thousand years will\nbe nowhere near it. That is why the star catalogue in this program\ncarries proper motion and precession rather than fixed positions.\n\n  celnav polaris                   the correction right now\n  celnav polaris \"UT\" <Hs>         the latitude from your reading\n\n            Polaris goes round the pole once a day:\n\n                      upper transit\n                           *   latitude = Ho - p\n                        .     .\n                      .         .\n              *       .    + P   .       *\n          latitude    .         .     latitude\n          = Ho        .         .     = Ho\n                        .     .\n                           *   latitude = Ho + p\n                      lower transit\n\n  P = the celestial pole, whose altitude is your latitude.\n  p = Polaris's distance from it, about 37' at present.\n\nOut at the sides, Polaris is level with the pole and its altitude IS\nyour latitude. Above and below, it is wrong by the whole of p. In\nbetween, by the part of p that lies along your meridian, which is\np cos LHA - and that is the correction, all of it.\n\nTonight, for instance, from 005 04'W at 20:00 UT:\n\n  Polaris GHA 284 03.8', so its LHA is 278 59.8'\n  its polar distance is 37.5'\n  so the correction to Ho is -5.9'"
    }
   ],
   "question": "Q. You take Polaris at its lower transit - directly below the pole -\n   and its polar distance is 37.5'. How does your latitude compare with\n   the altitude you measured?\n     a) 37.5' greater than Ho   b) 37.5' less than Ho   c) the same",
   "answer": "a",
   "why": "Below the pole, the pole stands higher than the star - and the pole's altitude is your latitude. So latitude is Ho plus the polar distance. Above the pole it is Ho minus it."
  },
  {
   "id": "B1",
   "title": "The moon: where the corrections stop being bookkeeping",
   "blocks": [
    {
     "t": "p",
     "s": "Module S walked the correction chain on a sun sight, and every term\nin it was small: a couple of minutes of dip, two of refraction,\nsixteen of semi-diameter, and a parallax of a sixth of a minute you\ncould have ignored and never noticed.\n\nThe moon is the body that makes the chain matter.\n\n  1. PARALLAX. The corrections you apply are all about turning what\n     YOU saw into what an observer at the centre of the earth would\n     have seen, because that is where the almanac stands. For the\n     sun, 93 million miles away, the earth's radius is nothing. The\n     moon is a quarter of a million miles away, so the earth's\n     radius is a real fraction of that, and the correction reaches\n     about 61 minutes - a whole degree, sixty miles of position.\n     It is not a refinement. It is the biggest number in the sum.\n  2. SEMI-DIAMETER, and it GROWS as the moon rises. You measure to\n     a limb, so you add or subtract the moon's half-width - but when\n     the moon is overhead you are one earth radius nearer to it than\n     when it is on your horizon, so it looks very slightly bigger.\n     That is augmentation, and it is about 0.3' at the zenith.\n     CELNAV applies it; most tables fold it into the main\n     correction.\n  3. WHICH LIMB. Half the month the lower limb is the lit one and\n     half the month it is not, so a moon sight is the one sight\n     where you routinely shoot the upper limb - and the\n     semi-diameter changes sign when you do. Get that wrong and you\n     are out by twice the semi-diameter, about half a degree, thirty\n     miles.\n\nThen the thing that catches people out, which is not a correction at\nall:\n\n  4. The moon moves about its own diameter in an hour. Half a degree\n     an hour is half a minute of arc a minute of time, so four\n     seconds of clock error is a tenth of a mile and a minute of it\n     is half a mile. Every sight wants the time to the second; this\n     one punishes you for less.\n\nAnd the reason to bother with all of it:\n\n  5. The moon is the only body besides the sun that is regularly up\n     in DAYLIGHT. A sun line crossed with a moon line is the one\n     two-body fix available at midday, when there is no twilight to\n     wait for and a running fix would mean two hours of hoping your\n     course and speed were honest. 'celnav plan' lists the moon\n     with its phase, and will say so when it is up with the sun.\n\nA sun sight first - the same one module S5 works through:\n\n  Hs  sextant reading       34 12.0'\n  index error                -1.5'  =\n  dip (height of eye)        -3.5'  ==\n  Ha  apparent altitude     34 07.0'\n  refraction                 -1.4'  =\n  parallax                   +0.1'\n  semi-diameter             +15.9'  =========\n  Ho  observed altitude     34 21.6'\n\nAnd a moon sight at the same height of eye, with the moon's own\nfigures for tonight out of the almanac:\n\n  (semi-diameter 15.5', horizontal parallax 57.0')\n\n  Hs  sextant reading       34 12.0'\n  index error                -1.5'  =\n  dip (height of eye)        -3.5'  ==\n  Ha  apparent altitude     34 07.0'\n  refraction                 -1.4'  =\n  parallax                  +47.2'  ==========================\n  semi-diameter             +15.7'  =========\n  Ho  observed altitude     35 08.4'\n\nSame sextant reading, same horizon, same air. The sun's corrections\nvery nearly cancel; the moon's do not come close. Read the bars\nrather than the numbers: that one long row is why a moon sight\nreduced with the sun's habits is wrong by tens of miles."
    }
   ],
   "question": "Q. You shoot the moon's UPPER limb but reduce it as a lower-limb sight.\n   Its semi-diameter is 16'. How far out is your altitude?\n     a) 16' too high   b) 32' too high   c) 16' too low",
   "answer": "b",
   "why": "The semi-diameter changes SIGN with the limb, so getting it wrong moves the answer by twice it: 32 minutes of arc, which is 32 miles of position."
  },
  {
   "id": "B2",
   "title": "The planets: a point of light that moves",
   "blocks": [
    {
     "t": "p",
     "s": "After the moon, the planets are a relief. There are four a navigator\nuses - Venus, Mars, Jupiter, Saturn - and in the sextant they behave\nalmost exactly like stars.\n\n  1. NO SEMI-DIAMETER. A planet shows a disc only in a telescope; in\n     a sextant it is a point, so you bring the point itself to the\n     horizon and there is no limb to choose and no half-width to add.\n     That alone removes the two corrections that cause most mistakes\n     on the sun and the moon.\n  2. ALMOST NO PARALLAX - but not quite none, and this program used\n     to call it none. Venus comes within 0.27 of the earth's own\n     distance from the sun, and at that range its parallax reaches\n     0.5 minutes of arc near the horizon: half a mile. Mars reaches\n     0.2'. Jupiter and Saturn, four and eight times further out,\n     give three hundredths of a minute and can be forgotten. The\n     almanac prints an extra correction for Venus and Mars for\n     exactly this reason; CELNAV computes it for all four.\n\nWhat a planet does have, and a star does not, is motion of its own.\nThat is where the almanac's two odd little columns come from:\n\n  3. The almanac tabulates GHA and declination for each whole hour,\n     and you interpolate for the minutes and seconds. For a star\n     that works perfectly, because a star's GHA advances at the same\n     rate every hour for ever - the rate the earth turns.\n  4. A planet is also moving around the sun while you watch, so its\n     GHA does NOT advance at quite that rate, and the rate itself\n     changes through the year. The 'v' correction is the difference,\n     and 'd' is the same idea for the declination.\n  5. So v and d are not physics. They are the repair work that\n     tabulating by the hour makes necessary. CELNAV has no need of\n     either: it computes the position for the second you ask about,\n     from the orbit, so there is nothing to interpolate and nothing\n     to correct for having interpolated.\n\nAnd the practical reason to care about any of this:\n\n  6. The planets are BRIGHT. Venus at magnitude -4 and Jupiter at\n     -2 are far brighter than any star, so they show while the\n     horizon is still crisp - before the stars come out in the\n     evening and after they have faded in the morning. That widens\n     the twilight window at both ends, which is the scarcest thing\n     in celestial navigation.\n  7. Venus can be found in broad daylight if you know where to\n     look, which is the one thing 'celnav plan' is for: it lists\n     every planet that is up with its altitude, azimuth and\n     magnitude, so you can point the sextant at empty-looking sky\n     and find it there.\n\nVega, at a sextant reading of 20 degrees:\n\n  Hs  sextant reading       20 00.0'\n  index error                -1.5'  =\n  dip (height of eye)        -3.5'  ==\n  Ha  apparent altitude     19 55.0'\n  refraction                 -2.7'  =\n  Ho  observed altitude     19 52.3'\n\nAnd Venus, same reading, same horizon:\n\n  (a point source, so no semi-diameter; horizontal parallax 0.54')\n\n  Hs  sextant reading       20 00.0'\n  index error                -1.5'  =\n  dip (height of eye)        -3.5'  ==\n  Ha  apparent altitude     19 55.0'\n  refraction                 -2.7'  =\n  parallax                   +0.5'\n  Ho  observed altitude     19 52.8'\n\nOne row of difference, and it is a small one - which is the point.\nA planet is a star you can shoot earlier in the evening. The work\nthat makes planets awkward is all in the almanac, and none of it is\nin the sextant."
    }
   ],
   "question": "Q. The almanac prints a “v” correction for the planets and none for the\n   stars. What is it for?\n     a) the planet's semi-diameter   b) the planet's own motion, which\n        makes its GHA advance at a slightly different rate each hour\n     c) its parallax",
   "answer": "b",
   "why": "A star's GHA advances at the rate the earth turns, every hour, for ever. A planet is moving in its own orbit as well, so the hourly rate differs and changes through the year. v is the repair that tabulating by the hour makes necessary - CELNAV computes the position for the second and needs neither v nor d."
  },
  {
   "id": "C1",
   "title": "Choosing your bodies: the cut matters more than the sights",
   "blocks": [
    {
     "t": "p",
     "s": "A fix is only as good as the angles between its lines. Three careful\nsights of three bodies in the same quarter of the sky make a worse\nfix than three rough sights spread right round you.\n\n  1. A line of position runs square across the azimuth of its body.\n     Two lines crossing at a right angle pin a position in both\n     directions at once.\n  2. Two lines crossing at fifteen degrees pin it in one direction\n     and leave it almost free in the other. One minute of sextant\n     error slides the crossing four miles along that weak axis.\n  3. So the number to weigh before you shoot is the azimuth spread,\n     not the magnitude. Want bodies 90 to 120 degrees apart, and\n     three of them rather than two.\n\nThen the altitude. A body wants to stand between about 15 and 65\ndegrees up.\n\n  4. Below 15 degrees the light has come a long way through the\n     lowest air, and refraction there depends on the real air and\n     sea temperatures, which you do not know. The correction stops\n     being arithmetic and becomes a guess.\n  5. Above about 65 the azimuth swings quickly - the body is on its\n     way to your zenith, where it has no azimuth at all - so a few\n     seconds of timing error moves the line. The circle of position\n     is tightly curved up there as well, and we draw it straight.\n\nAnd the window. A star needs a horizon to measure against and a sky\ndark enough to show it. You get both only between civil and nautical\ntwilight, which is around twenty minutes, twice a day.\n\nCELNAV does this arithmetic for you before you pick up the sextant.\n\n  celnav plan        the twilight times, every body that is up with\n                     its altitude, azimuth and magnitude, the ones\n                     too low or too high marked as such, the best\n                     three by azimuth spread, and a chart of the sky\n                     with that set numbered on it\n\nAnd afterwards it tells you what the cut was worth. 'celnav fix'\nreports the geometry in miles: what one minute of sight error does\nto the answer, and along which bearing. When it says WEAK CUT, that\nis not a style note - it is the error ellipse, computed from your\nown azimuths. Believe it.\n\nThe order of work is plan, then shoot. Not shoot, then hope.\n\n\nTHE SAME THREE SIGHTS, SPREAD 120 DEGREES APART"
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 67,
     "h": 15,
     "n": 1
    },
    {
     "t": "p",
     "s": "1 2 3 = the lines of position   o = where a pair crosses   + = the AP\none row = 1.5 nm.  The cocked hat is 1.0 nm across.\n\nEach line is one minute of arc off the true position. They close\ninto a cocked hat about a mile across, and the fix is inside it.\n\n\nAND THE SAME THREE SIGHTS BUNCHED IN ONE QUADRANT"
    },
    {
     "t": "fig",
     "kind": "grid",
     "w": 67,
     "h": 15,
     "n": 2
    },
    {
     "t": "p",
     "s": "1 2 3 = the lines of position   o = where a pair crosses   + = the AP\none row = 1.5 nm.  The cocked hat is 13.7 nm across.\n\nIdentical sights, identical errors, azimuths fifteen degrees\napart. The crossings have slid miles out along the one weak\ndirection. No amount of care with the sextant would have helped:\nthe geometry did this, and only a fourth body elsewhere in the sky\ncan undo it."
    }
   ],
   "question": "Q. A star stands 8 degrees above the horizon and is beautifully placed\n   for the cut. Why is it still a poor sight?\n     a) it is too dim that low   b) refraction down there depends on\n        air and sea temperatures you do not know   c) its azimuth\n        changes too fast to time",
   "answer": "b",
   "why": "Below about 15 degrees the refraction correction stops being arithmetic and becomes a guess. Fast azimuth change is the trouble at the other end of the scale, up near the zenith."
  },
  {
   "id": "C2",
   "title": "Checking the compass against the sky",
   "blocks": [
    {
     "t": "p",
     "s": "Every other compass reference can be wrong. A charted bearing\nassumes you already know where you are. A transit needs two marks in\nsight. Another vessel's heading is her business. The azimuth of a\nstar is none of those things: it comes from the almanac and the\nclock, and it is right.\n\nThree quantities, and it matters which is which:\n\n  1. Variation is the earth's. It is printed on the chart for your\n     area and year, and it changes slowly with place and time. It is\n     the same for every compass aboard.\n  2. Deviation is the ship's. It is the iron in her, and it changes\n     with her heading, because the iron turns when she turns.\n  3. Compass error is the two together: the whole difference between\n     what the card reads and true. A sky check measures the error.\n     Take the charted variation off it and what remains is the\n     deviation of that compass on that heading.\n\nThe method:\n\n  4. Note the time to the second and read the bearing of the body\n     over the compass.\n  5. Give CELNAV the instant, the body, the bearing you read and the\n     chart variation, west negative:\n\n       celnav compass \"2026-10-21 19:00:00\" Saturn 88 -14\n\n  6. It computes the true azimuth for that instant, subtracts to get\n     the error, and names the deviation that is left.\n\nChoose a low body, under about 20 degrees. High up the azimuth\nchanges fast, so a few seconds of clock error moves it; and a\nbearing taken steeply over a compass card is hard to take honestly.\nA body sitting on the horizon at rising or setting is the classical\nchoice, and its azimuth measured off true east or west has its own\nname: the amplitude.\n\nOne honest limit. A check on one heading gives you the deviation on\nthat heading and no other. Deviation is a curve around the card, and\nto know the whole of it you swing the ship and check on several\nheadings in turn.\n\nThat is what devcard does. Turn the ship onto each heading, take a\nbearing of the body, and note the TIME of each one separately:\n\n  celnav devcard \"2026-10-22\" sun -2 \\\n     \"000,10:00:00,147.0; 045,10:05:00,146.9; 090,10:10:00,148.4\"\n\nEach bearing keeps its own time because a swing takes twenty minutes\nand the sun moves about five degrees of azimuth in that time. Share\none time across the whole swing and that nine degrees of the sun's\nown motion lands in the card, looking exactly like deviation.\n\nIt prints the card above, computed from your own swing, and says\nwhich parts of the compass you did not cover.\n\nA compass swung on eight headings - the same compass, the same\nship, the same iron, eight different answers:\n\n     ship's head    deviation      west  <  |  >  east"
    }
   ],
   "question": "    000  T         2.2 E               |####\n    045  T         4.3 E               |#########\n    090  T         3.9 E               |########\n    135  T         1.2 E               |##\n    180  T         2.3 W          #####|\n    225  T         4.3 W      #########|\n    270  T         3.9 W       ########|\n    315  T         1.2 W             ##|\n\nOne sky check gives you one row of that table. It is the row you\nare steering on, which is the row that matters now, but it is not\nthe whole character of the compass. Swing her to learn that.\n\n----------------------------------------------------------------------\nQ. A star azimuth check gives a compass error of 6 degrees east, and the\n   chart shows variation 10 degrees west. What is the deviation?\n     a) 4 degrees east   b) 16 degrees east   c) 16 degrees west",
   "answer": "b",
   "why": "Error is variation and deviation together. 6 east with 10 west of variation leaves 16 east of deviation - the ship is pulling the card hard the other way."
  },
  {
   "id": "H1",
   "title": "What a sight reduction table actually is",
   "blocks": [
    {
     "t": "p",
     "s": "Pub. 249 is four volumes of numbers and no explanation, which makes\nit look like special knowledge. It is not. Every entry in it is the\nsame spherical triangle this program solves, worked out in advance\nfor whole degrees and printed.\n\n  sin Hc = sin L sin d + cos L cos d cos LHA\n\nThat is the whole of it. Give that formula a latitude, a\ndeclination and an LHA and it returns an altitude. Pub. 249 is that\nformula evaluated for every whole-degree combination a navigator\nmight need, by someone else, before you sailed.\n\nWHICH IS WHY THIS PROGRAM DOES NOT SHIP THE TABLES. It generates\nthem. Restrict the arguments to whole degrees and the engine IS the\ntable, so the tutor can print the exact page your sight needs\ninstead of the handful of pages an extract would carry.\n\nTHE PRICE OF PRECOMPUTING, which is the thing to understand:\n\n  1. The table only holds WHOLE degrees. So the assumed position\n     is not your DR -- it is the whole degree of latitude nearest\n     it, and whatever longitude makes the LHA come out whole.\n  2. Declination will not be a whole degree. That is what the d\n     column is for: how much Hc changes per degree of declination,\n     so you can interpolate the minutes yourself.\n  3. The azimuth is printed as an ANGLE from the elevated pole, 0\n     to 180, not as a true bearing. A rule at the foot of the page\n     converts it, and which rule depends on your hemisphere and\n     whether the LHA is more or less than 180.\n\nNone of those three is difficulty. They are the bookkeeping, which\nis the whole reason a fix can come out of a book and a pencil with\nno battery anywhere in it.\nA page, generated by this lesson as you read it:\n\n    LAT 50N   DEC 11S   CONTRARY NAME\n\n        LHA          Hc        d      Z\n        327    22 31.2'    -55.6    145\n        328    22 53.3'    -55.8    146\n        329    23 14.8'    -56.0    147\n        330    23 35.7'    -56.2    148\n        331    23 56.1'    -56.4    149\n\nNothing was looked up. Those twenty numbers came out of the same\nline of trigonometry at the top of this lesson, which is all the\nbook ever contained."
    }
   ],
   "question": "Q. Why does a sight reduction table use an assumed position rather than\n   your DR?\n     a) because the DR is not accurate enough to reduce from\n     b) because the table only holds whole degrees, and the AP is\n        where the whole degrees are\n     c) because the intercept has to be short",
   "answer": "b",
   "why": "The AP is a bookkeeping choice, not a judgement about your DR: whole-degree latitude and a longitude that makes the LHA whole, because those are the only rows the book has."
  },
  {
   "id": "H2",
   "title": "Volume 1: the seven selected stars",
   "blocks": [
    {
     "t": "p",
     "s": "Volume 1 is the odd one out and the one worth knowing about.\n\nIt is entered with two arguments only - LHA Aries and your latitude\n- and it gives you Hc and Zn DIRECTLY, for seven stars chosen for\nthat moment. No declination argument, no interpolation, no azimuth\nrule. Read seven lines, shoot them, plot them.\n\nThat is possible because the stars do not move relative to Aries\nwithin the life of an edition, so their declinations can be built\ninto the table instead of being an argument to it.\n\nTHE SELECTION IS ITSELF AN ALGORITHM. The seven are chosen bright,\nspread in azimuth, and in the honest altitude band - which is\nexactly what C1 said makes a good set, and exactly what celnav plan\ndoes when it picks the best three by azimuth spread.\n\nSo the app and the book are solving the same problem. They will\nsometimes disagree, and the disagreement is informative rather than\na fault: Volume 1 was computed for a whole degree of latitude and a\nwhole degree of LHA Aries, for an edition that has an epoch, and it\ndoes not know what the weather is doing to your horizon tonight.\n\nVolume 1 also carries the one thing this program cannot: it works\nwith no power at all, in a wet cockpit, by torchlight."
    }
   ],
   "question": "Q. What makes Volume 1 different from Volumes 2 and 3?\n     a) it is more accurate\n     b) it gives Hc and Zn directly for seven chosen stars, with no\n        declination argument and no interpolation\n     c) it covers declinations above 29 degrees",
   "answer": "b",
   "why": "The stars' declinations are built into the table instead of being an argument to it, which is why two arguments are enough and nothing needs interpolating."
  },
  {
   "id": "H3",
   "title": "Volumes 2 and 3, and the interpolation",
   "blocks": [
    {
     "t": "p",
     "s": "Volumes 2 and 3 are the general case: any body, any declination\nbetween 0 and 29 degrees, which covers the sun, the moon, the four\nplanets and the stars near the equator.\n\nThree columns per entry, and each one has a job:\n\n  Hc   the computed altitude at the WHOLE degree of declination\n  d    how much Hc changes per whole degree of declination, signed\n  Z    the azimuth angle from the elevated pole, 0 to 180\n\nTHE INTERPOLATION IS ONE MULTIPLICATION:\n\n       Hc = Hc(table) + d x (minutes of declination / 60)\n\nand the sign of d does the thinking for you, as long as you let it.\nA negative d means the altitude FALLS as the declination increases,\nso the correction is subtracted. Applying it the wrong way is the\ncommonest error in the method and it is worth twice the correction,\nbecause you move the wrong way by the amount you should have moved\nthe right way.\n\nTHE OTHER TWO MISTAKES, both of which the tutor will name for you:\n\n  * an LHA one degree out. Silent, plausible, and worth about the\n    difference between two rows - twenty minutes of arc at a\n    workaday altitude, so twenty miles.\n  * reading Zn where the page prints Z. The two agree in one\n    quadrant and differ by a reflection everywhere else, which is\n    the worst kind of error: right often enough to feel safe.\n\nWork a sight both ways - tables mode in this app does it with you,\nand shows you the exact answer alongside - until the three are\nhabits rather than things to remember.\nThe interpolation, worked as you read it:\n\n    from the page, LHA 329      Hc 23 14.8'   d -56.0\n    declination                 11 07.5'S\n    correction  -56.0 x 7.5/60    -7.0'\n    interpolated Hc             23 07.8'\n\n    and solved exactly          23 07.8'\n    the table costs you         0.0'\n\nWhich is to say: the table has cost you nothing you could plot,\nfrom arguments of whole degrees. That is what the d column buys,\nand it is why the method survived two hundred years of use at sea."
    }
   ],
   "question": "Q. The page gives Hc 23 14.8' and d -56.0. Your declination is 11 07.5'S.\n   What is the interpolated Hc?\n     a) 23 07.8'      b) 23 21.8'      c) 22 18.8'",
   "answer": "a",
   "why": "-56.0 x 7.5/60 = -7.0', so 23 14.8' - 7.0' = 23 07.8'. B added it instead of subtracting, which is worth twice the correction. C used the next whole degree of declination."
  },
  {
   "id": "H4",
   "title": "When the tables beat the calculator, and when they do not",
   "blocks": [
    {
     "t": "p",
     "s": "An honest comparison, because the answer is not that one is better.\n\nWHAT THE TABLES HAVE\n\n  They need no power. That is the whole argument and it is enough.\n  A book in a dry bag works after the batteries are flat, after the\n  lightning strike, and after the water got into the nav station.\n  They are also checkable: every number in them is public and the\n  same for everyone, so an error in your working is findable by\n  someone else looking at the same page.\n\nWHAT THEY COST\n\n  Whole-degree arguments, so an assumed position that is not where\n  you are and an intercept that has to be plotted. Interpolation by\n  hand, with three known ways to get it wrong. Volumes that have an\n  epoch and go slowly out of date. And time: a tabular reduction is\n  minutes of careful arithmetic where this program takes none.\n\nWHAT THIS PROGRAM HAS\n\n  The exact triangle for the second you asked about, from the DR\n  you actually have, with no interpolation and no assumed position.\n  And a battery, which is the whole of the case against it.\n\nTHE SENSIBLE POSITION\n\nBe fluent in both. Work sights by the tables often enough that the\nmethod is yours, and use the program when it is there - then the\nday the power goes you are not learning the method, you are using\nit. That is the same argument the About page makes about celestial\nnavigation against satellites, one level down.\n\nAnd one practical note: check the program against the tables, not\nthe other way round. If they disagree by more than a minute or two,\nthe arguments are wrong somewhere, and the tutor in tables mode\nexists to tell you which one."
    }
   ],
   "question": "Q. What is the one argument for the tables that the calculator cannot\n   answer?\n     a) they are more accurate\n     b) they need no power\n     c) they are faster",
   "answer": "b",
   "why": "They are less accurate and much slower. They work when nothing else does, which is the only argument that matters and is sufficient on its own."
  }
];

window.CELNAV_WALK_CASE = { "utc": "2026-08-29 07:30:00", "body": "Dubhe",
  "lat": 35.0000000000, "lon": -40.0000000000, "dec": 61.6081060649, "lha": 243.6930148132,
  "hs": 19.5350000000, "ie": 1.5000, "he": 3.0000, "temp": 18.0000, "press": 1013.0000,
  "ho": 19.4139707696, "hc": 19.3879384923, "zn": 26.8642543170, "intercept": 1.5619366376 };

window.CELNAV_WALK = [
  {
   "step": 1,
   "title": "The situation.",
   "blocks": [
    {
     "t": "p",
     "s": "  Morning twilight in the North Atlantic. You believe you are near\n35 00.0'N  040 00.0'W, and you have no way on.\n\n  You put the sextant on Dubhe, bring it to the horizon, and at\n2026-08-29 07:30:00 UT you read 19 32.1' off the arc.\n\n  Your index error is +1.5' on the arc and your eye is 3 m above the\n  water. It is 18 C and 1013 mb.\n\n  That is everything the reduction will use. Nothing else is needed,\n  and nothing else is allowed to creep in."
    }
   ]
  },
  {
   "step": 2,
   "title": "What we are trying to do.",
   "blocks": [
    {
     "t": "p",
     "s": "  The sight puts you somewhere on a circle centred on Dubhe's\n  geographical position. We cannot draw a circle two thousand miles\n  across, so instead we ask a smaller question:\n\n     if I really were at my DR, what altitude would Dubhe have had?\n\n  Compare that with what you actually measured, and the difference\n  tells you how far your DR is from the circle - and the azimuth\n  tells you in which direction. That is the whole method."
    }
   ]
  },
  {
   "step": 3,
   "title": "Step 1 - the almanac. Where is Dubhe's GP?",
   "blocks": [
    {
     "t": "p",
     "s": "   GHA  283 41.6'        the longitude of the GP, measured west\n   Dec  N61 36.5'        the latitude of the GP\n\n  So at that instant Dubhe was directly overhead a point in the far\nnorth, latitude 61 36.5'N, longitude 076 18.4'E.\n\n  Nothing about you enters here. Two navigators anywhere on earth\n  would use the same two numbers for this instant."
    }
   ]
  },
  {
   "step": 4,
   "title": "Step 2 - LHA. Bring it round to your own meridian.",
   "blocks": [
    {
     "t": "p",
     "s": "   LHA = GHA + longitude = 283 41.6' + (040 00.0'W)\n       = 243 41.6'\n\n  Longitude west counts as negative. LHA is measured westward from\n  you, so 243 degrees west is the same as 117 degrees to the east of\n  you - which fits: this is a morning sight and the star is in the\n  northern sky, well round to the east."
    }
   ]
  },
  {
   "step": 5,
   "title": "Step 3 - correct the sextant reading.",
   "blocks": [
    {
     "t": "p",
     "s": "  Hs  sextant reading       19 32.1'\n  index error                -1.5'  =\n  dip (height of eye)        -3.0'  ==\n  Ha  apparent altitude     19 27.6'\n  refraction                 -2.7'  =\n  Ho  observed altitude     19 24.8'\n\n  A star is a point of light, so there is no semi-diameter, and it is\n  far enough away that parallax does not arise. Only index error, dip\n  and refraction apply.\nHo = 19 24.8'. That is the sight, cleaned up."
    }
   ]
  },
  {
   "step": 6,
   "title": "Step 4 - the triangle. This is the geometry the arithmetic solves.",
   "blocks": [
    {
     "t": "fig",
     "kind": "grid",
     "title": ""
    },
    {
     "t": "p",
     "s": "  Z is your zenith, P the north pole, * is Dubhe. You know the side\n  Z-P (90 minus your latitude), the side P-* (90 minus declination),\n  and the angle between them at P (that is LHA). Everything else\n  follows."
    }
   ]
  },
  {
   "step": 7,
   "title": "Step 5 - solve it for Hc and Zn.",
   "blocks": [
    {
     "t": "p",
     "s": "   sin Hc = sin(35.000) sin(61.608) + cos(35.000) cos(61.608) cos(243.693)\n   Hc = 19 23.3'          Zn = 026 51.9'\n\n  Hc is the altitude Dubhe would have had if you really were at your\n  DR. Zn is the bearing it would have had from there. Note that your\n  sextant has played no part at all in these two numbers."
    }
   ]
  },
  {
   "step": 8,
   "title": "Step 6 - compare, and get the intercept.",
   "blocks": [
    {
     "t": "p",
     "s": "   Ho (measured)  19 24.8'\n   Hc (computed)  19 23.3'\n   difference     1.6 minutes of arc = 1.6 nautical miles\n\nHo is the greater, so you are nearer to the star than the DR was:\n1.6 miles TOWARD, along Zn 026 51.9'.\n\n  A bigger altitude means a smaller zenith distance, and a smaller\n  zenith distance means you are closer to the GP. That is the whole\n  reason the rule runs that way."
    }
   ]
  },
  {
   "step": 9,
   "title": "Step 7 - plot it.",
   "blocks": [
    {
     "t": "plot",
     "title": "ONE SIGHT, PLOTTED",
     "fixN": 0.000000,
     "fixE": 0.000000,
     "fix": false,
     "lops": [{ "zn": 26.864254, "p": 1.561937, "label": "a" }]
    },
    {
     "t": "p",
     "s": "  From the AP, go along the azimuth by the intercept, and draw the\n  line of position square across it. You are somewhere on that line.\n  One sight can do no more than this - and it is already worth having,\n  because it is a hard constraint on where you can be."
    }
   ]
  },
  {
   "step": 10,
   "title": "Step 8 - cross it with two more.",
   "blocks": [
    {
     "t": "plot",
     "title": "THREE SIGHTS: THE FIX",
     "fixN": 9.900000,
     "fixE": -16.400000,
     "fix": true,
     "lops": [{ "zn": 26.864254, "p": 1.561937, "label": "a" }, { "zn": 128.300000, "p": -19.000000, "label": "b" }, { "zn": 269.200000, "p": 16.200000, "label": "c" }]
    },
    {
     "t": "p",
     "s": "  Bellatrix and Markab were shot in the same few minutes. Three lines,\n  one crossing point, and the fix is about 10 miles north and 16 west\n  of where you thought you were.\n\n  That is a complete reduction. Everything else CELNAV does - the\n  running fix, the geometry warning, the planning list - is built on\n  exactly these eight steps."
    }
   ]
  }
];
