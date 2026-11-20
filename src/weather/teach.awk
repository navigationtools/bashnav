# =====================================================================
#  weather -- the lessons.
#
#  THE ORGANISING RULE, and it is the reason this file is not longer:
#
#     Every piece of physics has to earn its place by changing what the
#     app says or what you would do.  Otherwise it is a lecture with a
#     barometer attached.
#
#  Ordered from what you can see today outward to why the planet works
#  this way.  Each lesson ends with a question, as in colregs.
#  Sources are in docs/SOURCES.md; nothing here is copied from anywhere.
# =====================================================================

function les_init(){
  if(LES_READY) return
  LS_N=0
  les("fluid",    "Air is a fluid, and moist air is lighter")
  les("data",     "The three kinds of weather data, and which one you have")
  les("runs",     "Run time and valid time, always in UTC")
  les("models",   "Global and high-resolution models, and how far to trust them")
  les("racing",   "What weather you may use while racing (rule 41)")
  les("routing",  "Routing: what a router does, and how far to trust it")
  les("tide",     "The atmospheric tide: why the glass falls every afternoon")
  les("coriolis", "Coriolis, which is not a force")
  les("gradient", "Gradient wind, surface wind, and friction")
  les("veer",     "Backing and veering, and why the south is the other way round")
  les("fronts",   "Fronts: what passes over you, and in what order")
  les("lapse",    "Lapse rates, stability, and where the cloud base is")
  les("cells",    "The heat engine, and the three cells")
  les("h500",     "The 500 millibar chart and the 564 line")
  les("cyclone",  "How a tropical cyclone is made, and how to keep away")
  les("seasons",  "The tilt, the seasons, and an honest boundary")
  LES_READY=1
  return 0
}
function les(k,t){ LS_N++; LS_K[LS_N]=k; LS_T[LS_N]=t; return 0 }

#  THE SHORT FORM OF THE VEER LESSON, for any lesson that benefits from
#  hearing it again (Larry, 16 November 2026: "tell them once, tell them
#  twice, tell them as many times as you need").
function veer_repeat(){
  lp(cw("Backed and veered, again.",C_ACC) " The surface wind always turns toward")
  lp("the low. In the north the low is on the wind's left, so the turn is")
  lp("anticlockwise - backed. In the south it is on the right, so the turn is")
  lp("clockwise - veered. More in the lesson " cw("veer",C_ACC) ".")
  print ""
  return 0
}

function lp(s){ printf "  %s\n", s; return 0 }
function lpd(s){ printf "  %s\n", cwd(s); return 0 }
function lph(s){ print ""; printf "  %s\n", cw(s,C_ACC); hr(); return 0 }

function lesson_body(k){
  # ------------------------------------------------------------------
  if(k=="fluid"){
    lph("AIR IS A FLUID, AND MOIST AIR IS LIGHTER")
    lp("Air is a fluid. At the speeds anything on a boat moves it barely")
    lp("compresses, so it behaves very much like water - and the weather is")
    lp("fluid dynamics happening to a very large, very thin bath.")
    print ""
    lp(cw("And here is the counterintuitive one:",C_ACC))
    print ""
    lp("  " cw("Warm MOIST air is LIGHTER than warm DRY air.",C_ACC))
    print ""
    lp("Humid air feels heavy. It is not. At the same temperature and pressure")
    lp("a given volume holds a fixed NUMBER of molecules - so water vapour does")
    lp("not add molecules to the box, it " cw("replaces",C_ACC) " them:")
    print ""
    lp("       H2O  18      pushing out      N2  28")
    lp("                                     O2  32")
    print ""
    lp("Every water molecule that goes in evicts something heavier. Same count,")
    lp("less mass, lower density.")
    print ""
    lp(cw("This is the engine of everything else.",C_ACC) " Warm moist air is buoyant")
    lp("twice over - once for being warm, once for being wet - which is why the")
    lp("tropics convect so violently, and why a thunderstorm is a heat engine")
    lp("rather than a wind event.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="data"){
    #  W30 (weather 1.0.17; book of work B22, at the XO's word under rule
    #  16): brought up to the sources read on 18 November 2026 (TAUW) and
    #  given the part the gap list said was missing, how to tell which of
    #  the three you are holding.  Bowditch 2017, art. 3826, p. 631; NOAA's
    #  Unified Surface Analysis Manual; NOAA NCEI's GFS page; ECMWF's
    #  ecCodes time keys.  docs/SOURCES.md has each.
    lph("THE THREE KINDS OF WEATHER DATA")
    lp("Most sailors never learn this, and it decides how much to believe.")
    print ""
    lp(cw("OBSERVATION",C_ACC) "   an instrument reading of what is happening now:")
    lp("              your barometer, a buoy, a ship's report.")
    lp("              Not a forecast - but it is " cw("true",C_ACC) ".")
    print ""
    lp(cw("ANALYSIS",C_ACC) "      a chart drawn " cw("by forecasters",C_ACC) " from the observations,")
    lp("              with the fronts on it; a model is used only where")
    lp("              other evidence agrees. A surface analysis. The best")
    lp("              picture of the weather " cw("at its time",C_ACC) " - and it reaches")
    lp("              you a few hours after that time.")
    print ""
    lp(cw("MODEL OUTPUT",C_ACC) "  a computer's projection. What sailors call a GRIB.")
    lp("              " cw("Straight from the model: no forecaster has drawn",C_NO))
    lp("              " cw("or checked it.",C_NO))
    print ""
    lp("The trap is the third. A GRIB arrives in colour, at high resolution, out")
    lp("to sixteen days, looking authoritative - and the further ahead it reads")
    lp("the less sure it is. Sailors treat it as gospel.")
    print ""
    lph("HOW TO TELL WHICH YOU ARE HOLDING")
    lp("  " cw("two times on it",C_ACC) "     a run time and a later valid time (a step,")
    lp("                      +24 h, T+24): a model's forecast")
    lp("  " cw("step zero",C_ACC) "           the model's own starting picture - a")
    lp("                      computer's analysis, not a forecaster's")
    lp("  " cw("ANALYSIS, fronts",C_ACC) "    one time, already past, fronts drawn in:")
    lp("                      a forecasters' surface analysis")
    lp("  " cw("a place and a time",C_ACC) "  a reading from an instrument: an observation")
    print ""
    lp(cw("And it places this tool honestly.",C_ACC) " It works entirely in the first")
    lp("column. Every number in it is something you measured. It never")
    lp("forecasts from a model - but what it reasons FROM is the one category")
    lp("that is never wrong, and the only one still there when the antenna")
    lp("comes down.")
    print ""
    lpd("Bowditch, The American Practical Navigator, 2017, art. 3826; NOAA,")
    lpd("the Unified Surface Analysis Manual.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="runs"){
    #  W31 (weather 1.0.18; book of work B22, at the XO's word under rule
    #  16): run time and valid time, in the words agreed with PILOT on 19
    #  November 2026, so that this lesson and the course's forecast models
    #  page say the same thing.  Lines 1 and 2: ECMWF's ecCodes time keys
    #  (the example is the race-morning GRIB itself); line 4: NOAA NCEI's
    #  GFS page; line 5: Bowditch 2017, art. 3826, p. 631.  The last
    #  paragraph is the app's own (gap list rule 3).  docs/SOURCES.md.
    lph("RUN TIME AND VALID TIME")
    lp(cw("Every forecast has two times.",C_ACC) " The " cw("run time",C_ACC) " is when the model")
    lp("started: it begins from its picture of the weather at that moment.")
    lp("The " cw("valid time",C_ACC) " is the moment the forecast describes.")
    print ""
    lp("    " cw("valid time  =  run time  +  the step (the forecast hour)",C_ACC))
    print ""
    lp("The GFS run of 00:00 UTC on 24 May 2025 at step 27 is valid at")
    lp("03:00 UTC on 25 May: the hour the trough reached Lyme Bay.")
    print ""
    lp("    run    00Z 24 May  ---- step 27 h ---->  valid  03Z 25 May")
    print ""
    lp(cw("Always UTC.",C_ACC) " Run and valid times are in UTC (Z). Ship's time is")
    lp("yours to work out: in May, British Summer Time is UTC + 1.")
    print ""
    lp(cw("How often.",C_ACC) " GFS runs four times a day, at 00, 06, 12 and 18 UTC,")
    lp("and its files go out to 16 days, three-hourly. A run reaches you")
    lp("some hours after its run time.")
    print ""
    lp(cw("Further ahead is less sure.",C_ACC) " The further ahead the valid time,")
    lp("the less sure the forecast: a 12-hour forecast is likely to be better")
    lp("than a 24-hour one (Bowditch). " cw("Check which run you are holding, and",C_WARN))
    lp(cw("how far ahead of it you are reading.",C_WARN))
    print ""
    lp(cw("And this tool?",C_ACC) " bashnav weather never forecasts from a model. It")
    lp("reasons from what you observe, and it helps you read a model you got")
    lp("elsewhere.")
    print ""
    lpd("ECMWF, ecCodes, the time keys; NOAA NCEI, the Global Forecast")
    lpd("System; Bowditch, The American Practical Navigator, 2017, art. 3826.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="models"){
    #  W29 (weather 1.0.19; book of work B22, at the XO's word under rule
    #  16): global against high-resolution, judging a model, and when to
    #  look, following the course's forecast models page (practical-
    #  navigator, site/drafts/forecast-models) so the two say the same
    #  thing.  Sources read 19 November 2026: the Met Office's numerical
    #  models page (grids; the UKV's edges from the global model; why a
    #  fine grid matters near coasts and hills); ECMWF's Forecast User
    #  Guide 8.1.2 (spread and accuracy); NWS Juneau's brochure (comparing
    #  runs and centres; low spread, high confidence); NOAA NCEI's GFS
    #  page.  docs/SOURCES.md has each.  Gap list rule 3: the last
    #  paragraph says the app never forecasts from a model.
    lph("GLOBAL AND HIGH-RESOLUTION MODELS")
    lp("A " cw("global",C_ACC) " model covers the whole earth on a coarse grid and looks a")
    lp("week or more ahead. A " cw("regional or high-resolution",C_ACC) " model covers one")
    lp("area on a much finer grid, for a day or two, starting from a global")
    lp("model at its edges.")
    print ""
    lp("  GFS (NOAA)          the whole earth       about 28 km apart")
    lp("  UKV (Met Office)    the UK and Ireland    1.5 km apart")
    print ""
    lph("THE RULE, IN TWO PARTS")
    lp(cw("The big picture: global models.",C_ACC) " The lows, highs and fronts, and")
    lp("when they arrive. They see the whole ocean and look far enough ahead,")
    lp("so the passage is planned on them.")
    print ""
    lp(cw("The local detail: high-resolution models.",C_ACC) " Near the coast and the")
    lp("land, in the last day or two: headlands, sea breezes, wind bent round")
    lp("high ground.")
    print ""
    lp("  " cw("Never the other way round.",C_WARN))
    print ""
    lp("Why: a high-resolution model's edges come from a global one, so it")
    lp("cannot know the synoptic story better than its parent, and it does")
    lp("not look far enough ahead to plan a passage on.")
    print ""
    lph("WHAT A MODEL CANNOT SEE")
    lp(cw("Anything smaller than a few grid boxes.",C_ACC) " GFS's points are about")
    lp("28 km apart: a sea breeze, a headland, the lull under a cliff are all")
    lp("smaller.")
    print ""
    lp(cw("Gusts.",C_ACC) " A model's wind is an average over its box and its step.")
    print ""
    lp(cw("The exact hour.",C_ACC) " A front may come hours early or late, and the")
    lp("error grows the further ahead the run looks.")
    print ""
    lph("JUDGING ONE")
    lp("  " cw("between runs",C_ACC) "     the same model, run after run: if the low")
    lp("                   arrives at the same time each run, believe it more")
    lp("  " cw("between models",C_ACC) "   GFS and ECMWF agree: confidence rises. Where")
    lp("                   they disagree, the race is likely decided there")
    lp("  " cw("the ensemble",C_ACC) "     one model run many times from slightly")
    lp("                   different starts: a tight bunch, confidence;")
    lp("                   a wide spread, low confidence")
    lp("  " cw("your own log",C_ACC) "     if the model is already wrong about now,")
    lp("                   it will be wrong about later")
    print ""
    lph("WHEN TO LOOK")
    lp("  " cw("5 to 7 days",C_ACC) "      the big picture: which systems, and is the")
    lp("                   global models' story steady?")
    lp("  " cw("2 days",C_ACC) "           the timing: when do the fronts and shifts")
    lp("                   arrive, and do the models agree?")
    lp("  " cw("race morning",C_ACC) "     the detail: the latest runs against the")
    lp("                   plan, and high-resolution models for the coast")
    lp("  " cw("at sea",C_ACC) "           only what the race allows aboard, checked")
    lp("                   against your own observations")
    print ""
    lp(cw("And this tool?",C_ACC) " bashnav weather never forecasts from a model. It")
    lp("keeps the observations you judge one against: your glass, your")
    lp("wind, your sky.")
    print ""
    lpd("The Met Office, numerical weather prediction models; ECMWF, Forecast")
    lpd("User Guide 8.1.2; NWS Juneau, Numerical Weather Prediction; NOAA")
    lpd("NCEI, the Global Forecast System.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="racing"){
    #  W33 (weather 1.0.24; book of work B22, Larry's yes of 19 November
    #  2026 at 17:15, through the XO): which weather a boat may use while
    #  racing, following the course's page "What weather you may use
    #  while racing" (practical-navigator, site/drafts/race-weather-rules)
    #  so the app and the course say the same thing, in fewer words.
    #  Sources read 19 November 2026 (TAUW), each in docs/SOURCES.md:
    #  the Racing Rules of Sailing 2025-2028, rule 41 and rule 86.1;
    #  World Sailing Case 120; the RYA's outside-help guidance; and,
    #  through the course page, the RORC notices and the Clipper Race's
    #  sailing instructions.  The race lines are the course page's, not
    #  re-read here.  Gap list rule 3: the last paragraph says what the
    #  app fetches (nothing).
    lph("THE RULE: OUTSIDE HELP")
    lp("Rule 41 of the Racing Rules of Sailing: while she is racing, from")
    lp("her preparatory signal until she finishes, a boat may take no help")
    lp("from outside, with four exceptions:")
    print ""
    lp("  (a)  help for a crew member who is ill, injured or in danger")
    lp("  (b)  after a collision, help from the other boat to get clear")
    lp("  (c)  " cw("information freely available to all boats",C_ACC))
    lp("  (d)  information nobody asked for, from a source with no interest")
    lp("       in the result")
    print ""
    lp("Weather is (c).")
    print ""
    lph("WHAT \"FREELY AVAILABLE\" MEANS")
    lp("World Sailing's Case 120 reads it narrowly: it costs nothing,")
    lp("however little, and every boat could find it easily, as near the")
    lp("top of an ordinary internet search.")
    print ""
    lp("  " cw("allowed",C_ACC) "   paying for the satellite link or the phone that fetches")
    lp("            a free forecast: the link is not the information")
    lp("  " cw("not",C_WARN) "       a forecast you pay for, even a small subscription")
    lp("  " cw("not",C_WARN) "       data that only one paid program can open")
    lp("  " cw("not",C_WARN) "       data put out so late that others cannot find it")
    print ""
    lph("EACH RACE WRITES ITS OWN")
    lp("A notice of race or sailing instructions may change rule 41 (rule")
    lp("86.1), and offshore races usually do. " cw("The race's own words are what",C_ACC))
    lp(cw("counts:",C_ACC) " read them before you race. The two this course follows:")
    print ""
    lp("  " cw("RORC races",C_ACC) "     any forecast or GRIB any boat could get, paid or")
    lp("                 free; nothing worked out for your boat ashore")
    lp("  " cw("Clipper Race",C_ACC) "   free information only, and at sea nothing comes")
    lp("                 aboard unless Race Management forwards it; no")
    lp("                 phone or tablet used for advantage; from seven")
    lp("                 days out, no routing advice or weather training")
    lp("                 but the organiser's")
    print ""
    lp("In every race, " cw("advice for your boat from someone ashore is outside",C_WARN))
    lp(cw("help.",C_WARN))
    print ""
    lph("WHAT IS ALWAYS YOURS")
    lp("What the boat sees for herself is not help from outside: your")
    lp("barometer, your wind, the sky, the sea, your log. When the forecasts")
    lp("stop coming aboard, they are what you have left, with what you")
    lp("prepared before the start. So learn first to work the wind from a")
    lp("chart (" cw("gradient",C_ACC) ", " cw("fronts",C_ACC) ") and to time the shift from the glass and")
    lp("the sky (" cw("tide",C_ACC) ", " cw("veer",C_ACC) "). Behind the rules, a navigator uses them")
    lp("every watch.")
    print ""
    lp(cw("And this tool?",C_ACC) " bashnav weather fetches nothing: everything it says")
    lp("is worked from what you enter. But in the Clipper Race a tablet may")
    lp("not be used for advantage, so ask Race Management before you use")
    lp("any app on your own device at sea. The course page has the questions")
    lp("to put to the skipper and the organiser.")
    print ""
    lpd("World Sailing, the Racing Rules of Sailing 2025-2028, rules 41 and")
    lpd("86.1, and Case 120; the RYA, outside help; the Practical Navigator")
    lpd("course, What weather you may use while racing, and the race")
    lpd("documents it names. Read the race's own documents: they decide.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="routing"){
    #  W35 (weather 1.0.21; book of work B22; Larry's ruling TAYO, 19
    #  November 2026): what a router does and how far to trust it, with a
    #  figure at each point (Larry: "many, spaced through the lesson at
    #  each key point").  The figures are worked on the made-up boat of
    #  rt_init() in wx.awk; the last one is the course's three runs of
    #  bashnav's own router.  Sources read 19 November 2026 and recorded
    #  in docs/SOURCES.md: NOAA SciJinks (how often a forecast is right);
    #  LuckGrib's routing manual and bashnav's ROUTER.md (isochrones);
    #  Stan Honey's Pacific Cup article and talks (reverse isochrones,
    #  the router's bias, scaling, saying the route in sailing terms);
    #  Frank Singleton's GRIB notes (the wind reads low); the course's
    #  routing page.  Gap list rule 3: the lesson says the app does not
    #  route.
    lph("ROUTING: WHAT A ROUTER DOES")
    lp("A router takes two things: a " cw("forecast",C_ACC) " of the wind everywhere, hour")
    lp("by hour (and the tidal stream, where there is one), and a " cw("polar",C_ACC) ",")
    lp("the table of how fast the boat sails at each wind speed and angle. It")
    lp("answers one question: by what track could she finish soonest?")
    print ""
    lp("It works outward from the start. She is sent off on every heading")
    lp("for one step of time, at the speed the polar gives. The far edge of")
    lp("where those boats get to is an " cw("isochrone",C_ACC) ": every place she could")
    lp("have reached by that time. From that edge it does the same again,")
    lp("until an isochrone reaches the finish. The route is read backwards")
    lp("from there, through one point on each isochrone.")
    print ""
    rt_fan_figure()
    gshow()
    print ""
    lp("Here the wind is the same everywhere, so each isochrone is the last")
    lp("one grown bigger. In real weather they bend. Where an isochrone")
    lp("bulges toward the finish, the wind or the stream on that side is")
    lp("paying.")
    print ""
    lph("HOW FAR AHEAD: THE FIVE-DAY HORIZON")
    lp("A route is only as good as its forecast, and a forecast fades. NOAA")
    lp("puts a five-day forecast right about nine times in ten, a seven-day")
    lp("one about eight in ten, and one for ten days or more about half the")
    lp("time.")
    print ""
    rt_horizon_figure()
    gshow()
    print ""
    lp(cw("So route on about five days.",C_ACC) " Past that the route is a sketch of")
    lp("what may come, to be drawn again with each new run.")
    print ""
    lph("REVERSE ISOCHRONES: WHAT A PLACE COSTS")
    lp("Run the same sum backwards from the finish and you have " cw("reverse",C_ACC))
    lp(cw("isochrones",C_ACC) ": every place from which she could still finish in so")
    lp("many hours. Lay them over the forward ones. At any place, the hours")
    lp("to get there plus the hours to finish from there is the time of a")
    lp("route through that place. Where that sum stays close to the best, it")
    lp("hardly matters where you are: a don't-care area. Where it climbs fast,")
    lp("the route is a narrow lane.")
    print ""
    rt_lane_figure()
    gshow()
    print ""
    lp("On the reach, the water that costs under ten minutes is a lane")
    lp(sprintf("%.1f miles wide. On the beat it is %.1f miles wide: in a steady wind,", rt_width(RT_REACH, 0, RT_LANE), rt_width(0, RT_BEAT, RT_LANE)))
    lp("anywhere between the laylines takes the same time. " cw("Look before you",C_ACC))
    lp(cw("fight for a side.",C_ACC) " Inside a wide lane you can sail for the crew, the")
    lp("sea or the other boats at little cost. On that beat, the router's")
    lp("side is only worth what the shift it expects is worth.")
    print ""
    lph("THE MOTORBOAT: WHAT THE WIND COSTS")
    lp("A motorboat goes the same speed on every heading, so in still water")
    lp("her fastest course is the straight line. Set her beside the sailing")
    lp("route and the difference is what the wind asks of you: extra miles.")
    print ""
    rt_motor_figure()
    gshow()
    print ""
    lp(cw("Extra miles are what a route spends.",C_ACC) " Know how many, and what they")
    lp("buy. The Practical Navigator course does this with bashnav's own")
    lp("motorboat: straight lines between the routed boat's places, in her")
    lp("times, to show what the tide and the wind each add.")
    print ""
    #  HONEY'S MOTORBOAT COURSE IS NAMED, NOT YET DRAWN (weather 1.0.23,
    #  Larry's ruling TAZH, 19 November 2026).  In Stan Honey's "15 minutes
    #  on routing" (slides 8 and 10) the motorboat course is the course
    #  square to the reverse isochrones, which is not the straight line
    #  above.  The section keeps its figure and gains this paragraph; the
    #  drawn version is a later feature (docs/SOURCES.md, Routing item 4).
    lp("The ocean navigator Stan Honey means something more by")
    lp(cw("the motorboat course",C_ACC) ": the course square to the reverse isochrones,")
    lp("the way the hours to finish fall fastest. On a beat it points up")
    lp("the wind, not at the mark; on a reach, nearly at the mark. His")
    lp("crews hear it at every briefing, and take any shift the forecast")
    lp("missed that lets them sail nearer to it. A later release of this")
    lp("lesson will draw it.")
    print ""
    lph("WHERE A ROUTER IS BIASED")
    lp(cw("It believes the forecast completely.",C_ACC) " A shift forecast for 02:00 is,")
    lp("to the router, a fact, to the minute.")
    print ""
    lp(cw("Its boat sails the polar, always.",C_ACC) " A steady wind, a perfect helm, a")
    lp("fresh crew, and never a bad hour.")
    print ""
    lp(cw("It goes all in.",C_ACC) " If one side is a minute faster, it takes that side,")
    lp("however much it would lose were the forecast a little out. " cw("It measures",C_WARN))
    lp(cw("time, never risk.",C_WARN))
    print ""
    rt_allin_figure()
    gshow()
    print ""
    lp(sprintf("Here the forecast has the wind veering %d degrees, an hour into a", RT_SHIFT))
    lp(sprintf("%d-mile beat. The router goes right, all the way, and is %d minutes", RT_BEAT, rt_min(rt_allin(0.5, RT_SHIFT)) - rt_min(rt_allin(1, RT_SHIFT))))
    lp("up on the boat in the middle - if the veer comes. If the wind backs")
    lp(sprintf("instead she is %d minutes behind the middle, and %d behind the boat", rt_min(rt_allin(1, -RT_SHIFT)) - rt_min(rt_allin(0.5, -RT_SHIFT)), rt_min(rt_allin(1, -RT_SHIFT)) - rt_min(rt_allin(0, -RT_SHIFT))))
    lp(sprintf("that went left. The middle is never more than %d minutes from the", rt_min(rt_allin(0.5, RT_SHIFT)) - rt_min(rt_allin(1, RT_SHIFT))))
    lp("best. The router cannot see that. You can.")
    print ""
    lph("SCALE THE WIND AND THE STREAM")
    lp("A model's wind is an average over its grid, and over the open sea it")
    lp("reads low: by about a Beaufort force, or 20 percent, in one")
    lp("forecaster's account. The ocean navigator Stan Honey's rule of thumb")
    lp("is to route on the GRIB's wind " cw("times 1.15 in the tropics, 1.20 in",C_ACC))
    lp(cw("mid-latitudes and 1.25 in high latitudes",C_ACC) ", and on the stream " cw("times",C_ACC))
    lp(cw("1.30",C_ACC) "; then to correct both to what is measured on deck.")
    print ""
    rt_scale_figure()
    gshow()
    print ""
    lp("Your own log is the better guide: if the GRIB said 20 and you have")
    lp("logged 24 all day, 24 is your number. bashnav's router takes this as")
    lp("one line of a run: " cw("scale wind 1.2 current 1.3",C_ACC) ".")
    print ""
    lph("TEST THE ROUTE")
    lp("Change what the router was told, and see whether the route changes.")
    print ""
    lp("  " cw("the wind",C_ACC) "       lighter, and stronger")
    lp("  " cw("the forecast",C_ACC) "   the next run, and another model")
    lp("  " cw("the timing",C_ACC) "     the weather arriving sooner, and later")
    lp("  " cw("the stream",C_ACC) "     switched off, to see what it was worth")
    print ""
    lp(cw("A route that holds is one to trust.",C_ACC) " A route that swaps sides is")
    lp("one to hold loosely, and where it swaps is where you must be awake.")
    print ""
    rt_whatif_figure()
    gshow()
    print ""
    lp("So the call in Lyme Bay is one to trust, as far as the wind's")
    lp(sprintf("strength goes; the finishing time is not, by %s. " cw("And the test has",C_ACC), rt_hm(RT_RUN[3] - RT_RUN[11])))
    lp(cw("a limit.",C_ACC) " Scaling the speed leaves every shift at the forecast's own")
    lp("time. Testing the timing takes another run or another model.")
    print ""
    lph("SAY IT IN SAILING TERMS")
    lp("You are not done until you can explain the route to the watch in")
    lp("sailors' words. For that night in Lyme Bay:")
    print ""
    lp("  " cw("what we are doing",C_ACC) "    port tack up into the bay, for four hours")
    lp("  " cw("why",C_ACC) "                  the wind is forecast to veer, and a veer")
    lp("                       lifts starboard tack")
    lp("  " cw("what we expect",C_ACC) "       the wind at its strongest near midnight,")
    lp("                       then the first degrees of veer")
    lp("  " cw("what we do then",C_ACC) "      tack when it has veered 15 degrees and held")
    lp("  " cw("if it does not come",C_ACC) "  no veer by 04:00, or it backs: call the")
    lp("                       navigator")
    print ""
    lp("If you cannot say it that way you do not yet understand the route,")
    lp("and should not sail it.")
    print ""
    lp(cw("And this tool?",C_ACC) " bashnav weather does not route, and never forecasts")
    lp("from a model. It keeps the other voices: your glass, your wind, your")
    lp("sky and your log, which are what a route is tested against at sea.")
    lp("bashnav's router sails the Practical Navigator course's races.")
    print ""
    lpd("NOAA SciJinks, how reliable are weather forecasts; LuckGrib, the")
    lpd("routing manual; Stan Honey, Pacific Cup Weather and Tactics, and")
    lpd("his navigator's talks (honeynav.com); Frank Singleton, a note on")
    lpd("GRIB files; the Practical Navigator course, the routing page.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="tide"){
    lph("THE ATMOSPHERIC TIDE")
    lp("The sun heats the air, the earth turns under it, and a pressure wave")
    lp("travels westward with the sun. It is on your barometer, every day.")
    print ""
    lp("The odd part: the dominant component is " cw("SEMIdiurnal - twice a day",C_ACC) ",")
    lp("not once. Why once-a-day heating produces a twice-a-day pressure signal")
    lp("is a genuine puzzle in meteorology.")
    print ""
    lp("  size in the tropics          about 1.4 hPa each way")
    lp("  maxima                       about 1000 and 2200 local")
    lp("  minima                       about 0400 and " cw("1600",C_ACC) " local")
    #  THE SIZES ARE THE WORKING'S (Larry, AOR, 17 November 2026).  The
    #  correction in wx.awk is 1.4 * cos^3(latitude) hPa each way: 1.4 at
    #  the equator, 0.5 at 45 degrees, 0.4 at 50.  Until weather 1.0.6
    #  this line said "~1.2 hPa at the equator, ~0.2 at 45 deg", which
    #  the working never did; a lesson must quote the rule the app
    #  applies.  The tropics' size is Bowditch's (American Practical
    #  Navigator, 2002, art. 3506: "about 3 hPa", top to bottom).  The
    #  fall-off with latitude is not yet confirmed from a source read
    #  (docs/SOURCES.md, Weather).
    lp("  falling off with latitude    1.4 hPa at the equator, 0.5 at 45 deg")
    print ""
    lpd("The tropics' size is Bowditch's: about 3 hPa from top to bottom, so")
    lpd("1.4 each way. The fall-off with latitude is the rule this app uses.")
    print ""
    lp(cw("Which is a trap worth knowing about.",C_WARN) " In the tropics the glass")
    lp("falls two to three millibars between mid-morning and mid-afternoon")
    lp(cw("every single day, in perfect weather.",C_ACC) " A sailor who does not know")
    lp("that reads a routine afternoon fall as a system approaching.")
    print ""
    lpd("This app corrects for it before saying anything about tendency, and")
    lpd("tells you how much of the change was the tide. Give it your longitude")
    lpd("- it needs local solar time to know where in the cycle you are.")
    print ""
    lp("In the browser, the barograph on " cw("What the log says",C_ACC) " draws this wave")
    lp("behind your own readings. A trace that follows the wave is only the")
    lp("tide; one that leaves it is weather.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="coriolis"){
    lph("CORIOLIS, WHICH IS NOT A FORCE")
    lp("The earth turns underneath you. Describe anything's motion relative to")
    lp("the ground and it appears to curve. The \"force\" is the bookkeeping")
    lp("entry for having chosen a rotating frame - nothing is pushing.")
    print ""
    lp("Its size goes as " cw("sin(latitude)",C_ACC) ":")
    print ""
    lp("  at the poles     full strength")
    lp("  at 45 degrees    about 0.7 of it")
    lp("  " cw("at the equator   ZERO",C_ACC))
    print ""
    #  WHERE THE SINE COMES FROM.  The lesson asserted sin(latitude) and
    #  stopped, which is the one question a thoughtful reader asks of it --
    #  Larry did, and arrived at the earth's oblateness, which is not the
    #  reason and would not matter on a perfectly round planet.  Both
    #  derivations are given because the second is the one that makes the
    #  result feel inevitable rather than remembered.
    lp(cw("Where the sine comes from",C_ACC) ", because it is not arbitrary:")
    print ""
    lp("The earth's spin points along its axis. What can deflect something")
    lp("moving HORIZONTALLY is only the part of that axis pointing straight")
    lp("UP where you are standing - and that part is sin(latitude) of it.")
    print ""
    lp("  at the pole      the axis IS straight up, so all of it counts")
    lp("  at the equator   the axis lies flat along your horizon, so none")
    print ""
    lp("Nothing about the shape of the earth comes into this. It would be")
    lp("exactly the same on a perfect sphere.")
    print ""
    lp("The same answer from the other side, which is the one that makes it")
    lp("feel inevitable: what matters to a moving parcel is how far it is")
    lp("from the AXIS, and that goes as cos(latitude). At the equator cos is")
    lp("at its maximum, so it is " cw("flat",C_ACC) " there - move a few degrees north or")
    lp("south and your distance from the axis barely changes, so your spin")
    lp("barely changes, so there is nothing to turn you.")
    print ""
    lp("And read that ZERO honestly. At 5 degrees the factor is sin 5, which")
    lp("is 0.09 - under a tenth of polar strength. " cw("Small, not absent",C_ACC) ". The")
    lp("five degree rule below is a threshold for getting a storm started,")
    lp("not a line where the physics switches off.")
    print ""
    lp(cw("Two consequences: where a cyclone cannot form, and which way",C_ACC))
    lp(cw("to turn for the low.",C_ACC))
    print ""
    lp("First: " cw("no tropical cyclone forms within about 5 degrees of the",C_ACC))
    lp(cw("equator",C_ACC) ", because there is too little there to spin it up. All that")
    lp("heat and moisture, and not enough rotation to organise it.")
    print ""
    lp("Second: it is half of Buys Ballot, which is the most useful rule this")
    lp("app has. Stand with your back to the wind and the low is on your left")
    lp("in the northern hemisphere - and on your right in the southern, because")
    lp("the sense of the rotation reverses.")
    print ""
    veer_repeat()
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="gradient"){
    lph("GRADIENT WIND, SURFACE WIND, AND FRICTION")
    lp("Well above the sea the wind balances the pressure gradient against")
    lp("Coriolis and runs " cw("along",C_ACC) " the isobars. That is the gradient wind, and")
    lp("it is what a weather chart draws.")
    print ""
    lp("Down where you are, friction slows the air. Slower air feels less")
    lp("Coriolis. So pressure wins a little, and the surface wind blows")
    lp(cw("across",C_ACC) " the isobars, toward the low:")
    print ""
    lp("  over water   backed 10-20 degrees, and about 2/3 of gradient speed")
    lp("  over land    backed 30-40 degrees, and 1/3 to 2/3 of gradient speed")
    lp("  " cw("southern hemisphere: veered, not backed",C_ACC))
    print ""
    lp("How much the land slows it depends on the ground. Open fields and")
    lp("farmland drag least; forests, towns and cities, with their trees and")
    lp("buildings, drag most, and turn the wind further across the isobars.")
    lpd("These are rules of thumb. The sources disagree on the land figure,")
    lpd("from 1/3 (Royal Meteorological Society) to 2/3 (US Navy training).")
    print ""
    veer_repeat()
    friction_figure()
    gshow()
    print ""
    lp(cw("How strong, from the chart.",C_ACC) " The gradient wind's speed comes from")
    lp("how close the isobars are: the closer they are, the harder the push")
    lp("toward the low and the stronger the wind. Nearer the equator the")
    lp("earth's turn is weaker, so the same spacing blows harder. The scale:")
    print ""
    iso_scale_figure()
    gshow()
    print ""
    lp("At 100 nm apart and 50 degrees north that is 31 knots aloft, so about")
    lp("20 on deck over the sea. Measure the gap on your own chart and the")
    lp("screen " cw("The wind from the isobars",C_ACC) " works it for you, down to the deck.")
    print ""
    lp(cw("This is the chart-to-deck translation",C_ACC) " - what the isobars mean for")
    lp("what you will actually get on the wind instrument.")
    print ""
    lp("And the same boundary layer does something else you already know about.")
    lp("Friction slows the lowest air, so wind speed climbs with height, and")
    lp("the apparent wind aloft is stronger and further aft than at the boom.")
    lp("That is why a sail is " cw("twisted",C_ACC) ". One piece of physics, two apps.")
    print ""
    lp(cw("Why it turns: three forces",C_ACC))
    lp("Three things act on the wind down here. The " cw("push",C_ACC) " from high pressure")
    lp("toward low - what the isobars show - drives it. The " cw("earth turning",C_ACC))
    lp("beneath it bends it: to the right in the north (Coriolis). And the")
    lp(cw("drag",C_ACC) " of the sea or the land slows it.")
    print ""
    lp("Aloft, with nothing to drag on, the bend grows until it matches the")
    lp("push, and the wind runs straight along the isobars. Down here the drag")
    lp("slows it, a slower wind is bent less, and the push toward the low")
    lp("wins: the wind slants in across the isobars. Drawn head to tail, the")
    lp("three close into a triangle:")
    print ""
    forces_figure()
    gshow()
    print ""
    lp("The rougher the surface, the longer the drag side and the shorter the")
    lp("bend: the wind turns further in toward the low, and slows. Over the")
    lp("sea, a little. Over towns and forests, a lot.")
    lpd("The triangle is for the lowest kilometre or so of air. On deck the")
    lpd("wind is slower again, because it drops toward the surface - the same")
    lpd("drop that twists a sail - so the rule says about 2/3 over the sea.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  #  BACKING AND VEERING (weather 1.0.2; Larry, AKI, 16 November 2026).
  #  A lesson of its own because the main screen uses the words ("Wind
  #  has VEERED 30 degrees") and the gradient lesson uses them in their
  #  other sense.  Told in a sailor's terms, light on mathematics: the aim
  #  is to understand what is happening, not to work it.  Its pieces are
  #  functions (veer_repeat here, the two figures in grid.awk) so other
  #  lessons can tell it again.
  if(k=="veer"){
    lph("BACKING AND VEERING, AND WHY THE SOUTH IS THE OTHER WAY ROUND")
    lp("Two words a sailor uses all the time, and they have two jobs.")
    print ""
    lp(cw("Over time",C_ACC) ", they say which way the wind has shifted. The wind")
    lp(cw("veers",C_ACC) " when it shifts clockwise round the compass: west, then")
    lp("north-west, then north. It " cw("backs",C_ACC) " when it shifts anticlockwise:")
    lp("west, then south-west, then south.")
    print ""
    veer_time_figure()
    gshow()
    print ""
    lp("These are compass words, so they mean the same on either side of the")
    lp("equator. What changes is what a shift is telling you.")
    print ""
    lp(cw("What a shift tells you, in the north.",C_ACC) " Depressions here mostly run")
    lp("west to east. When one passes on your " cw("north",C_ACC) " side, as most do in")
    lp("the Channel, the wind " cw("veers",C_ACC) " as its fronts go through: south-west")
    lp("ahead of it, west at the warm front, north-west behind the cold front.")
    lp("When the centre passes on your " cw("south",C_ACC) " side, the wind " cw("backs",C_ACC))
    lp("steadily instead: east, north-east, north.")
    print ""
    pass_figure(1)
    gshow()
    print ""
    lp(cw("One rule covers both.",C_ACC) " Look the way the low is going. On its")
    lp(cw("right",C_ACC) " the wind " cw("veers",C_ACC) "; on its " cw("left",C_ACC) " the wind " cw("backs",C_ACC) ". A depression")
    lp("going east has its left on the north side, so a boat there has the wind")
    lp("back. A storm going west - in the trade-wind belt, before it turns - has")
    lp("its left on the south side, and a boat there has the centre pass to its")
    lp("north while the wind backs.")
    print ""
    lp(cw("South of the equator it runs the other way.",C_ACC) " The wind goes round a")
    lp("low clockwise there, so the same picture plays backwards. A low passing")
    lp("on your poleward side - the south - makes the wind " cw("back",C_ACC) ": north, then")
    lp("north-west, then south-west as the cold front comes through.")
    print ""
    pass_figure(0)
    gshow()
    print ""
    lp(cw("Against the wind aloft",C_ACC) ", the same two words describe the friction")
    lp("turn from the gradient lesson. Down where you are, the sea slows the")
    lp("wind and it turns in toward the low. In the north the low is on the")
    lp("wind's left, so turning toward it is turning anticlockwise: the surface")
    lp("wind is " cw("backed",C_ACC) " from the isobars. In the south the low is on the right,")
    lp("so the same turn is clockwise: " cw("veered",C_ACC) ".")
    print ""
    veer_hemi_figure()
    gshow()
    print ""
    lp(cw("Why the south is the other way round",C_ACC) ", without the mathematics. The")
    lp("earth turns under the moving air, and that bends anything moving: to")
    lp("its right in the north, to its left in the south. So air drawn into a")
    lp("low swings round it anticlockwise in the north and clockwise in the")
    lp("south, and the low ends up on the wind's left in one and on its right")
    lp("in the other. Friction always lets the wind slip toward the low - and")
    lp("that is backed in one hemisphere and veered in the other.")
    print ""
    lp("And the rule that carries all of it to the cockpit is Buys Ballot:")
    lp(cw("back to the wind, the low is on your left",C_ACC) " in the north, and on your")
    lp("right in the south.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  #  FRONTS (W20, weather 1.0.10; Larry, ATR, 18 November 2026).  Built
  #  on the passing low of the lesson `veer`: the same low, now with its
  #  fronts, and the same two boats either side of its track.  The words
  #  for each stage are Bowditch's (2017, 3809 to 3812), in our own words;
  #  the wind and the glass in the figure are worked from wx.awk's model.
  #  Northern hemisphere only, until Larry rules on the south's own words.
  if(k=="fronts"){
    lph("FRONTS: WHAT PASSES OVER YOU, AND IN WHAT ORDER")
    lp("A body of air takes on the character of where it sat: cold or warm,")
    lp("wet over the sea or dry over land. That is an " cw("air mass",C_ACC) ". Where two")
    lp("meet there is a zone of change, drawn on the chart as a line: a " cw("front",C_ACC) ".")
    print ""
    lp(cw("Why the wind shifts at a front.",C_ACC) " A front lies in a trough: the")
    lp("pressure is lower along it, so the isobars kink where they cross it.")
    lp("The wind follows the isobars, so a kink in the isobars is a shift in")
    lp("the wind. A trough with no front does the same, and that is the veer")
    lp("of the 2025 race: a trough swinging past, the isobar through the boat")
    lp("turning clockwise.")
    print ""
    lp("Here is the low from the lesson " cw("veer",C_ACC) " with its fronts on, going east.")
    lp("The boats stay put, so each runs through it, right to left.")
    print ""
    fronts_figure()
    gshow()
    print ""
    lp(cw("Boat A, on the low's right, south of its track.",C_ACC) " Both fronts pass")
    lp("over her, in this order:")
    lp("  1  The glass starts to fall. High cloud comes first, mares' tails")
    lp("     of cirrus, then a milky sheet of cirrostratus.")
    lp("  2  The cloud lowers and thickens to altostratus, then nimbostratus")
    lp("     and steady rain. The glass falls faster.")
    lp("  3  The warm front passes: the wind " cw("veers",C_ACC) ", south to south-west, the")
    lp("     rain stops and it turns warmer. In the warm sector the glass is")
    lp("     about steady; low stratus, drizzle, haze or fog are usual.")
    lp("  4  The cold front: cumulonimbus, squalls, heavy showers, perhaps")
    lp("     thunder. The wind " cw("veers",C_ACC) " sharply to north-west, the air turns")
    lp("     cold, and the glass rises, often quickly. Squalls can run up to")
    lp("     200 miles ahead of the front itself.")
    lp("  5  Behind it: cold, clear air, scattered showers, good visibility.")
    print ""
    lp(cw("Boat B, on the low's left, north of its track.",C_ACC) " No front passes over")
    lp("her. The weather changes slowly, and the wind " cw("backs",C_ACC) ": south-east,")
    lp("east-north-east, north.")
    print ""
    lp("It is the rule from the passing low, with the fronts added: looking")
    lp("the way the low goes, on its right the wind " cw("veers",C_ACC) ", in two jumps at")
    lp("the two fronts; on its left it " cw("backs",C_ACC) ", steadily.")
    print ""
    lp(cw("Later in its life",C_ACC) " the cold front catches the warm front, lifting the")
    lp("warm sector off the surface: an " cw("occluded front",C_ACC) ". The low is near its")
    lp("deepest then, and soon starts to fill.")
    print ""
    lp(cw("On a chart:",C_ACC) " a warm front has round barbs, a cold front triangles,")
    lp("both on the side it is moving toward; an occluded front has both,")
    lp("alternating; a stationary front has both, on opposite sides.")
    print ""
    lp("No two lows are alike. The figure's numbers come from a model of one")
    lp("tidy low; a real glass and a real sky are the evidence.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="lapse"){
    lph("LAPSE RATES, STABILITY, AND THE CLOUD BASE")
    lp("Air cools as it rises, because it expands. How fast is the whole game.")
    print ""
    lp("  " cw("dry adiabatic",C_ACC) "     about 3.0 C per 1000 ft   an unsaturated parcel")
    lp("  " cw("saturated",C_ACC) "         about 1.5 C per 1000 ft   condensing gives heat back")
    lp("  " cw("environmental",C_ACC) "     whatever the air actually does - measured")
    print ""
    lp("Compare the environmental rate with the adiabatic and you have")
    lp(cw("stability",C_ACC) ". If the surrounding air cools FASTER with height than the")
    lp("parcel does, the parcel stays warmer than its surroundings, keeps")
    lp("rising, and you get towering cloud. That is instability, and it is why")
    lp("a saturated parcel can keep going where a dry one would have stopped.")
    print ""
    lp(cw("THE CLOUD BASE",C_ACC) " falls straight out of it, and the arithmetic is")
    lp("something you can do on deck:")
    print ""
    lp("  a rising parcel cools at         3.0 C / 1000 ft")
    lp("  its dew point falls at           0.5 C / 1000 ft")
    lp("  " cw("so the spread closes at          2.5 C / 1000 ft",C_ACC))
    print ""
    lp("  " cw("height (ft) = (air temp - dew point, in C) x 400",C_ACC))
    print ""
    lp("400, not 333. " cw("It is not the lapse rate, it is the DIFFERENCE",C_WARN) " between")
    lp("two of them. Divide by the lapse rate alone and you put the base a")
    lp("sixth too low. And it is " cw("air",C_ACC) " temperature, not sea temperature - the")
    lp("sea is a fair proxy offshore and badly wrong near a front.")
    print ""
    #  The trade inversion (weather 1.0.20): only in the trade winds, and a
    #  lid over the moist layer that few cumulus get through (AMS Glossary,
    #  "Trade inversion"; NWS training, "Cloud-topped and marine boundary
    #  layers").  It said before that the lid was always there and that
    #  the flat tops were its underside, which no source read gives.
    lp("A field of cumulus with flat bases all at one height IS that level made")
    lp("visible. In the trade winds there is a lid above it as well: the")
    lp(cw("trade inversion",C_ACC) ", warm dry air sinking from above, caps the moist")
    lp("layer the cumulus grow in, and few of them get through it.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="cells"){
    lph("THE HEAT ENGINE, AND THE THREE CELLS")
    lp("The tropics take in more energy from the sun than they radiate away.")
    lp("The poles do the reverse. The atmosphere and the ocean exist, as far as")
    lp("weather is concerned, to move the difference poleward.")
    print ""
    lp("Most of the atmosphere's share travels as " cw("latent heat",C_ACC) " - water")
    lp("evaporated in the tropics and released as rain somewhere else. The")
    lp("water cycle is not a side effect of the weather. It is the working")
    lp("fluid.")
    print ""
    lp("  " cw("Hadley",C_ACC) "    rises at the equator, descends near 30 degrees")
    lp("  " cw("Ferrel",C_ACC) "    30 to 60, and the one you probably sail in")
    lp("  " cw("Polar",C_ACC) "     60 to the pole")
    print ""
    lp("The air descending at 30 degrees has already rained out everything it")
    lp("had, so it arrives warm and dry. That gives you the subtropical highs,")
    lp("the horse latitudes, the trade winds on their equatorward side - and")
    lp("most of the world's deserts sit at that latitude for this reason.")
    print ""
    lp(cw("And it closes the loop with the last lesson:",C_ACC) " that same descending")
    lp("warm air is the trade inversion capping the trade winds' moist layer.")
    lp("The lid over the trade-wind cumulus is the far end of a circulation")
    lp("that started as thunderstorms on the equator.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="h500"){
    lph("THE 500 MILLIBAR CHART, AND THE 564 LINE")
    lp("A 500 mb chart is a " cw("topographic map of a pressure surface",C_ACC) ": the")
    lp("contours are the HEIGHT at which the pressure is 500 millibars, drawn")
    lp("in decametres. So \"564\" means the 5,640 metre contour. Low heights are")
    lp("cold air, high heights are warm.")
    print ""
    lp("It is around 18,000 feet, with about half the atmosphere's mass above")
    lp("and half below - which is why its flow is a fair proxy for where a")
    lp("whole system gets carried. The " cw("steering level",C_ACC) ".")
    print ""
    lp(cw("Five rules a mariner can use from one chart:",C_ACC))
    print ""
    lp("  " cw("1.",C_ACC) " The surface storm track lies " cw("300 to 600 nm poleward",C_ACC) " of the")
    lp("     5640 m contour, and runs " cw("parallel",C_ACC) " to it.")
    print ""
    lp("  " cw("2.",C_ACC) " " cw("All the gale force winds are poleward of the 564 line.",C_WARN))
    lp("     Stay on its equatorward side and you stay out of the gales. This")
    lp("     is the routing rule, and it is why the standard book on the")
    lp("     subject is called Heavy Weather Avoidance.")
    print ""
    lp("  " cw("3.",C_ACC) " Surface lows and fronts move at " cw("a third to a half",C_ACC) " of the")
    lp("     500 mb wind speed above them.")
    print ""
    lp("  " cw("4.",C_ACC) " Surface wind behind the system, in the cold air to the west")
    lp("     and southwest, is about " cw("half",C_ACC) " the 500 mb wind speed.")
    print ""
    lp("  " cw("5.",C_ACC) " Tighter contours mean stronger wind - the upper-air version of")
    lp("     close isobars. And the " cw("588",C_ACC) " contour marks the subtropical ridge,")
    lp("     which is what steers tropical systems.")
    print ""
    lp(cw("You do not need the internet for this.",C_ACC) " A 500 mb chart comes in by HF")
    lp("radiofax, on an SSB receiver, at sea, with no connectivity at all. Read")
    lp("three numbers off it and " cw("weather chart",C_ACC) " will walk the rules with you.")
    print ""
    lpd("From the Mariner's Guide to the 500-Millibar Chart, by Joe Sienkiewicz")
    lpd("of NOAA's Ocean Prediction Center and Lee Chesneau - US Navy, then OPC,")
    lpd("who spent his retirement teaching this to sailors. See docs/SOURCES.md.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="cyclone"){
    lph("HOW A TROPICAL CYCLONE IS MADE, AND HOW TO KEEP AWAY")
    lp("This is the payoff for the other lessons: it needs all of them.")
    print ""
    lp("  " cw("warm deep water",C_ACC) "    about 26.5 C, and 50 m deep, or the storm")
    lp("                     stirs up cold water and kills itself")
    lp("  " cw("enough Coriolis",C_ACC) "    so not within ~5 degrees of the equator")
    lp("  " cw("a moist unstable column",C_ACC) "  moist air is buoyant twice over")
    lp("  " cw("weak wind shear",C_ACC) "    or the tower is torn apart before it organises")
    lp("  " cw("something to start it",C_ACC) "  a wave, a trough, an old front")
    print ""
    lp("Take any one away and you get a lot of rain and no cyclone. Which is")
    lp("useful: it tells you which conditions to worry about.")
    print ""
    lp(cw("AND AVOIDANCE IS A PROBLEM YOU ALREADY KNOW.",C_ACC))
    print ""
    lp("A storm centre has a position, a course and a speed. So do you. You")
    lp("want the largest possible closest point of approach. " cw("That is exactly",C_ACC))
    lp(cw("the relative-motion problem from colregs",C_ACC) " - the same vector triangle,")
    lp("the same bearing drift, the same answer. The dangerous side is just")
    lp("the half where the storm's own motion adds to its wind.")
    print ""
    #  THE CREW'S SHARED WORDS (Larry, TAWG, 18 November 2026): copied as
    #  they stand in the navigationtools design system, "Shared words", so
    #  the lesson, "weather storm", the watch faces and the course say the
    #  same thing.  From Bowditch 2017, chapter 39, pp. 655-659.
    lp(cw("WHICH SIDE YOU ARE ON, IN EITHER HEMISPHERE",C_ACC))
    print ""
    lp("  1. Look the way the storm is going: on its right the wind veers, on")
    lp("     its left it backs.")
    lp("  2. North of the equator its right is the dangerous side; south of")
    lp("     it, its left.")
    lp("  3. A steady shift says " cw("probably",C_ACC) ". A boat under way can see the")
    lp("     opposite shift from her own motion; if in doubt, stop and watch.")
    lp("  4. Face the wind: north of the equator the centre is about 110")
    lp("     degrees to your right ahead of the storm, and 120 to 135 behind")
    lp("     it; south of the equator, to your left. Nearer the centre, a")
    lp("     point or two less.")
    lp("  5. " cw("The navigable side is not safe, only less dangerous.",C_WARN))
    print ""
    lpd("Bowditch, The American Practical Navigator, 2017, chapter 39. Given an")
    lpd("advisory, \"weather storm\" sets these beside your own wind.")
    print ""
    lpd("Which is why the tools in this suite keep turning out to be the same")
    lpd("few ideas wearing different hats.")
    print ""
    return 1
  }
  # ------------------------------------------------------------------
  if(k=="seasons"){
    lph("THE TILT, THE SEASONS, AND AN HONEST BOUNDARY")
    lp("The earth's axis leans " cw("23.5 degrees",C_ACC) " and keeps pointing the same way")
    lp("as it goes round. So each hemisphere leans toward the sun for half the")
    lp("year. That is the whole of the seasons - not distance from the sun,")
    lp("which barely varies and is at its smallest in northern winter.")
    print ""
    lp("At sea you meet it as migration: the whole belt of weather moves north")
    lp("and south with the tilt. The equatorial convergence, the subtropical")
    lp("ridge, the storm tracks. " cw("A cyclone season is a season because the tilt",C_ACC))
    lp(cw("makes it one",C_ACC) " - warm water and a ridge in the right place at once.")
    print ""
    lp(cw("Now the honest part.",C_ACC))
    print ""
    lp("The axis also wobbles, a full circle every 26,000 years, and the orbit")
    lp("stretches and relaxes on cycles of 100,000. Those are real and they")
    lp("drive ice ages.")
    print ""
    lp("They are " cw("climate, not weather",C_ACC) ", and " cw("nothing on your passage depends",C_ACC))
    lp(cw("on them.",C_ACC) " They are in this lesson because they are interesting and")
    lp("because you asked, and they are labelled so you know which is which.")
    print ""
    lpd("Every other lesson here earns its place by changing what you would do.")
    lpd("This half of this one does not, and pretending otherwise would be the")
    lpd("beginning of a tool full of things that sound like knowledge.")
    print ""
    return 1
  }
  return 0
}
function lesson_q(k){
  if(k=="fluid")    return "It is 30 C and very humid. Is that air heavier or lighter than 30 C and dry?|Lighter. Water molecules at 18 replace nitrogen at 28 and oxygen at 32, and a given volume holds a fixed number of molecules. Warm and wet is buoyant twice over, which is what builds thunderstorms."
  if(k=="data")     return "The latest surface analysis and a GRIB's forecast for the same hour put the low in different places. Which do you believe?|The analysis. Forecasters drew it from the observations and used the model only where other evidence agreed. The GRIB is the model's numbers, which no forecaster has checked, and the further ahead of its run time it reads, the less it is worth."
  if(k=="runs")     return "A GRIB says: run 18Z 23 May, step 33. What hour does it describe, and what is that on the boat's clock in the Channel?|03:00 UTC on 25 May: 18:00 plus 33 hours. In May that is 04:00 British Summer Time. The run of 00Z 24 May at step 27 describes the same hour from six hours later and less far ahead, so if you hold both, the newer one is likely the better."
  if(k=="models")   return "Five days before the start, a 1.5 km model shows a fine sea breeze on race day. Do you plan on it?|Not yet. Five days out is for the big picture, from the global models: which systems, and whether their story holds run after run. A sea breeze is local detail, and a high-resolution model cannot know the synoptic story better than the global model at its edges. Look at it again on race morning, for the coast."
  if(k=="racing")   return "At sea, rule 41 as written. A free GFS file comes in over the boat's paid satellite link, and a crewmate offers his paid high-resolution subscription on his phone. Which may you use?|The GFS file: it costs nothing to anyone, and paying for the link does not make the information paid (Case 120). Not the subscription: a fee for the information itself, however small, takes it outside 41(c). Then read your race's own words. A RORC race allows paid data any boat could get; the Clipper Race allows only what Race Management forwards, and no phone used for advantage."
  if(k=="routing")  return "The router sends you to the far right-hand corner, for a gain of four minutes over the middle. What do you ask before you sail it?|What it loses if the forecast is wrong. The router goes all in for any gain, however small: it measures time, never risk. Route it again with the wind lighter and stronger, on the next run and on another model. If the corner loses half an hour when the shift is late or goes the other way, and the middle loses four minutes when the forecast is right, the middle is the route."
  if(k=="tide")     return "You are at 12N. The glass has fallen 2 hPa between 1000 and 1600. Worry?|Probably not - that is very close to the daily atmospheric tide, which is about 1.4 hPa of semidiurnal swing in the tropics with a minimum near 1600. Correct for it before reading anything into it. At 50N the same fall would mean much more."
  if(k=="coriolis") return "Why does no hurricane ever form on the equator?|Coriolis goes as sin(latitude) and is zero there. All the heat and moisture in the world, and nothing to start it rotating. About 5 degrees is the practical minimum."
  if(k=="gradient") return "The chart shows a 30 knot gradient wind. What do you expect on deck, offshore, in the northern hemisphere?|Around 20 knots - roughly two thirds - and backed 10 to 20 degrees from the isobar direction, because friction slows the surface air, which weakens Coriolis, so pressure gradient wins a little and the wind blows across the isobars toward the low."
  if(k=="veer")     return "Off the Isle of Wight the wind goes from south-west to west to north-west over six hours, and the glass starts to rise. Backed or veered - and where did the low go?|Veered: it shifted clockwise round the compass. In the northern hemisphere that is a depression whose centre has passed on your north side, and the shift to north-west with a rising glass says the cold front is through."
  if(k=="fronts")   return "Off Start Point the glass has been falling for six hours. Mares' tails became a grey sheet, and now it is raining steadily with the wind at south. What comes next, and which way will the wind go?|The warm front is close. When it passes the rain stops, the wind veers to south-west and it turns warm and muggy, with drizzle or fog and a steady glass: the warm sector. Then the cold front: squalls and heavy showers, the wind veering to north-west, the glass rising and the air clearing. If instead the wind backs steadily, the centre is passing on your south side and the fronts will miss you."
  if(k=="lapse")    return "Air 18 C, dew point 12 C. How high is the cloud base?|About 2,400 ft: a spread of 6 C, and the spread closes at 2.5 C per 1000 ft, so 6 x 400. Not 6 x 333 - the divisor is the DIFFERENCE between the parcel's lapse rate and the dew point's, not the lapse rate itself."
  if(k=="cells")    return "Why are so many of the world's deserts near 30 degrees latitude?|That is where the Hadley cell descends. The air rose at the equator, rained out everything it had, and comes back down warm and dry. The subtropical highs, the horse latitudes and the deserts are all the same descending branch."
  if(k=="h500")     return "The 564 line runs east-west 200 nm north of you. Where is the storm track, and are you in the gales?|The track is 300 to 600 nm poleward of the 564 line and parallel to it, so well north of you. And all the gale force winds are poleward of that line - so at 200 nm south of it you are on the right side of it. That is the routing rule."
  if(k=="cyclone")  return "Sea surface 27 C, moist unstable air, a nice tropical wave - and 40 knots of shear aloft. Cyclone?|No. Shear tears the tower apart before it can organise. Four of the five ingredients is not a storm, which is exactly why knowing the list is useful."
  if(k=="seasons")  return "Northern winter is when the earth is CLOSEST to the sun. So why is it cold?|Because the seasons are the 23.5 degree tilt, not the distance. The northern hemisphere is leaning away, so the sun is low, the days are short, and the same energy is spread over more ground. The distance varies by about 3 percent and is swamped by it."
  return ""
}

# =====================================================================
#  A SECOND TIER.  Each lesson stays short enough to read on a pitching
#  boat; the deeper material sits behind a prompt, for the reader who
#  wants to know why and not only what.  Same rule as the lessons
#  themselves: it has to change what the app says or what you would do.
# =====================================================================
function les_has_more(k){
  return (k=="coriolis")
}

function lesson_more(k){
  if(k=="coriolis"){
    lph("FROM OUTSIDE, IT IS ANGULAR MOMENTUM")
    lp("Stand off the planet and watch. In that frame nothing curves and")
    lp("nothing is pushing. What is conserved is " cw("angular momentum",C_ACC))
    lp("about the earth's axis.")
    print ""
    lp("A point at latitude L sits " cw("a cos L",C_ACC) " from the axis, so the ground")
    lp("there is already running east at:")
    print ""
    lp("  equator        1,674 km/h")
    lp("  30 degrees     1,450")
    lp("  45 degrees     1,184")
    lp("  60 degrees       837")
    lp("  " cw("pole               0",C_ACC))
    print ""
    lp("A shell in flight feels almost no torque about that axis - drag")
    lp("aside, gravity acts straight at the centre - so its own")
    lp(cw("u x r",C_ACC) " is fixed. Carry it closer to the axis and it must run")
    lp("faster east; carry it further out and it must run slower.")
    print ""
    lph("TWO SHELLS, FIRED NORTH AND FIRED SOUTH")
    lp("  " cw("fired    distance from axis   ground below      the shell",C_ACC))
    lp("  north    shrinks              east SLOWER       outruns it")
    lp("  south    grows                east FASTER       lags it")
    print ""
    #  THE PICTURE GOES HERE, between the table that states the mechanism
    #  and the sentence that states the punchline, because the punchline is
    #  the part a reader doubts: "both deflect right" reads as a
    #  contradiction until you see one shell go east and the other west in
    #  the same drawing.
    gun_figure()
    gshow()
    print ""
    lpd("The curve is a parabola because the sideways acceleration is steady")
    lpd("along the track, so the offset goes as the SQUARE of the time of")
    lpd("flight. Its SIZE here is scaled to the width of the picture; the real")
    lpd("figure is two paragraphs down, and it is small.")
    print ""
    lp("Fired north it lands EAST of the aim. Fired south it lands WEST.")
    lp("Going north, east is to your right. Going south, west is to your")
    lp("right. " cw("Both deflect right",C_ACC) " - and in the southern hemisphere")
    lp("both deflect left. That is Coriolis, with no force anywhere in it.")
    print ""
      lp("The size is real and small, and it takes BOTH halves of the story.")
      lp("A 16 inch shell at full range - 38 km, about 90 seconds of flight -")
      lp("ends up 27 km nearer the axis. The ground there runs 7 km/h slower")
      lp("east; the shell itself runs 7 km/h faster to keep " cw("u x r",C_ACC) ". So it")
      lp("arrives " cw("14 km/h",C_ACC) " ahead of the ground, not 7, and since that excess")
      lp("grows from nothing the offset is the mean of it: about " cw("175 metres",C_ACC) ".")
      print ""
      lpd("Checked the other way, which is the form a textbook gives: the")
      lpd("sideways acceleration is 2 x Omega x v x sin(latitude), here 0.044")
      lpd("m/s2, and half of that times ninety seconds squared is the same")
      lpd("175 metres. Counting only the ground slowing, and forgetting that")
      lpd("the shell speeds up, halves the answer - which is the easiest")
      lpd("mistake to make here, because the first half is the memorable one.")
    print ""
    lph("FIRED EAST OR WEST, THE MOMENTUM STORY RUNS OUT")
    lp("Everything above is about changing your DISTANCE FROM THE AXIS, so")
    lp("it explains a shot fired north or south and says nothing at all")
    lp("about one fired east or west - which does not change that distance.")
    lp("Yet an east shot gets the same " cw("175 metre",C_ACC) " sideways push. That looks")
    lp("like a contradiction and it is not: it is a " cw("second mechanism",C_ACC) " that")
    lp("happens to give the same answer.")
    print ""
    lp("Fire east and you are now going round the axis FASTER than the")
    lp("ground is. A faster circle needs more centripetal force than")
    lp("gravity was already supplying, and what it does not get, it loses")
    lp("as an outward push. The push is " cw("away from the EARTH'S AXIS",C_ACC) " - not")
    lp("away from the centre, and not straight up.")
    print ""
    lp("And that is the whole answer, because at latitude L the direction")
    lp("away from the axis is tilted. It points:")
    print ""
    lp("  up                   by cos L")
    lp("  toward the equator   by sin L")
    print ""
    lp("One push, resolved two ways. The equatorward part is an ordinary")
    lp("sideways deflection - south, which fired east is to your right -")
    lp("and it is " cw("2 x Omega x u x sin L",C_ACC) ", the same size as before. The")
    lp("upward part reduces the shell's apparent weight, and that is the")
    lp(cw("Eotvos effect",C_ACC) ".")
    print ""
    lpd("Checkable, and it checks exactly: for purely eastward motion the")
    lpd("Coriolis acceleration is 2 x Omega x u at EVERY latitude, and its")
    lpd("direction is the axis-outward unit vector (0, -sin L, cos L) in")
    lpd("east-north-up to twelve decimal places. The two famous components")
    lpd("are not two effects. They are one vector's two shadows.")
    print ""
    lp("The symmetry is worth holding on to. The sideways part goes as")
    lp("sin L and the vertical part as cos L, so they trade places:")
    print ""
    lp("  on the equator   away from the axis is STRAIGHT UP")
    lp("                   no sideways deflection, Eotvos at its largest")
    lp("  at the pole      away from the axis is HORIZONTAL")
    lp("                   all sideways deflection, no Eotvos at all")
    print ""
    lp("A shell does not stay up to enjoy its lost weight, so the thing you")
    lp("measure is not height but " cw("RANGE",C_ACC) ". Lighter, it hangs on past the")
    lp("moment it should have landed: at 45 N our 16 inch shell carries")
    lp(cw("169 metres further",C_ACC) " fired east and 169 metres short fired west.")
    lp("Due north or south, nothing - there is no east component to act on.")
    print ""
    lph("AND THE SHELL'S OWN CLIMB AND FALL")
    lp("One more, and it is the one nobody mentions. The same cos L term")
    lp("acts on the shell's VERTICAL speed, east-west:")
    print ""
    lp("  climbing   pushed west")
    lp("  falling    pushed east")
    print ""
    lp("Those do not cancel. The shell spends the whole flight above the")
    lp("ground, so the westward push acts on a rising shell for the first")
    lp("half and the eastward push on a falling one for the second, and")
    lp("what survives is the time the shell spent up there at all. For a")
    lp("90 second flight it is about " cw("61 metres to the west",C_ACC) ", whichever way")
    lp("the gun is trained.")
    print ""
    lpd("It is the same physics as the eastward deflection of a dropped")
    lpd("stone, with the climb run backwards. And note what it does NOT do:")
    lpd("cos L is positive on both sides of the equator, so unlike the other")
    lpd("two this term does not reverse with hemisphere. The southern")
    lpd("hemisphere is therefore not quite the mirror of the northern.")
    print ""
    lph("THE THREE, AND WHAT THE GUN CAPTAIN CORRECTS")
    lp("A 16 inch shell, 38 km, 90 seconds, from 45 N:")
    print ""
    lp("  turning with the earth    176 m right    any bearing")
    lp("  the Eotvos effect         169 m range    east-west only")
    lp("  its own climb and fall     61 m west     any bearing")
    print ""
    lpd("The 175 above and the 176 here are the same quantity; the first")
    lpd("came from speeds rounded to whole km/h.")
    print ""
    lp("Which add up, by bearing, to two corrections:")
    print ""
    lp("  fired      across the track      along it")
    lp("  north      115 m right           -")
    lp("  east       176 m right           107 m long")
    lp("  south      238 m right           -")
    lp("  west       176 m right           107 m short")
    print ""
    lp("So the deflection is NOT the same at every bearing after all - the")
    lp("turning term is, and the climb-and-fall term adds to it going south")
    lp("and subtracts going north. " cw("Both still deflect right",C_ACC) ", which is the")
    lp("lesson; they do not deflect right by the same amount.")
    print ""
    lpd("All three are first-order, in vacuum, over a flat earth - the same")
    lpd("idealisation as the 38 km in 90 seconds. Air resistance makes the")
    lpd("climb and the fall unequal and moves the third figure in")
    lpd("particular. Real firing tables are built from measurement.")
    print ""
    lpd("ONE THING THIS DOES NOT TOUCH: the wind. Air moving horizontally")
    lpd("has no vertical speed worth the name and no east-west component")
    lpd("going round the axis fast enough to matter, so of the three only")
    lpd("the turning term applies to it. Everything below stands.")
    print ""
    lpd("Not to be confused with DRIFT, which in gunnery means the sideways")
    lpd("deviation from the shell's own spin on a rifled barrel. Long range")
    lpd("tables correct for both. They are different things with different")
    lpd("causes, and only one of them reverses with hemisphere.")
    print ""
    lph("AND NOW THE WIND")
    lp("Pressure pushes air from the high toward the low. The instant it")
    lp("moves, the same bookkeeping turns it right, so it never runs")
    lp("straight down the gradient. It ends up going " cw("around",C_ACC) ":")
    print ""
    lp("  northern hemisphere   anticlockwise around a low")
    lp("                        clockwise around a high")
    lp("  " cw("southern hemisphere   both the other way",C_ACC))
    print ""
    lp("Friction is what turns circling into weather. At the surface the")
    lp("air is slowed, feels less deflection, and pressure wins a little,")
    lp("so the flow spirals " cw("IN to a low",C_ACC) " and " cw("OUT of a high",C_ACC) ":")
    print ""
    lp("  in   ->  convergence  ->  air must rise  ->  cloud, and rain")
    lp("  out  ->  divergence   ->  air must sink  ->  clearing, and dry")
    print ""
    lp("That is why a low is wet and a high is dry. It is the same friction")
    lp("that puts twist in a sail - see " cw("gradient",C_ACC) " for the numbers.")
    print ""
    lph("HOW FAR ACROSS, AND WHAT DOES NOT CHANGE IT")
    lp("With a drag that goes as the wind, the balance solves exactly:")
    print ""
    lp("  " cw("tan(alpha) = k / f",C_ACC) "       speed / gradient = cos(alpha)")
    print ""
    lp("and the " cw("pressure gradient cancels out of the angle",C_ACC) ". A deeper low")
    lp("gives you more wind at the same angle, not a straighter wind.")
    print ""
    lp("That is worth dwelling on, because the opposite is the intuitive")
    lp("answer: surely a hard blow is dragged round into the isobars? No -")
    lp("and with the quadratic drag water really has, the angle " cw("GROWS",C_ACC))
    lp("with the wind. The strongest lows on earth have the largest inflow")
    lp("angles: a hurricane's boundary layer runs 20 to 30 degrees of it.")
    print ""
    lp("Nor can centrifugal force be the reason, because in a frictionless")
    lp("balance the wind " cw("already follows the isobars exactly",C_ACC) ", at every")
    lp("gradient and every latitude. There is nothing for it to improve.")
    print ""
    lp("What does set the angle is the surface you are over, and " cw("latitude",C_ACC) ".")
    lp("Take 15 degrees over water at 45 N and carry the same drag north")
    lp("and south:")
    print ""
    lp("  " cw("latitude   over water   over land",C_ACC))
    lp("  10            48            71")
    lp("  20            29            55")
    lp("  30            21            45")
    lp("  45            15            35")
    lp("  60            12            30")
    lp("  75            11            27")
    print ""
    lp("Near the equator the air pours almost straight down the gradient")
    lp("into the low. At high latitude it nearly follows the isobars. Same")
    lp("physics as the two shells: less sin(latitude), less turning.")
    print ""
    wind_figure(45, 15, 1)
    gshow()
    print ""
    lph("AND THE CENTRIFUGAL TERM CHANGES THE SPEED")
    lp("Round a low it points outward, so it ADDS to Coriolis against the")
    lp("pressure gradient and the wind comes out " cw("below",C_ACC) " geostrophic. Round")
    lp("a high it subtracts, and the wind runs above it. One isobar")
    lp("spacing, 4 mb in 100 km at 45 N, which is 62 knots geostrophic:")
    print ""
    lp("  " cw("curvature    round a low   round a high",C_ACC))
    lp("  2000 km         54 kn         76 kn")
    lp("  1000 km         49 kn         " cw("impossible",C_WARN))
    lp("   500 km         43 kn         " cw("impossible",C_WARN))
    lp("   250 km         36 kn         " cw("impossible",C_WARN))
    print ""
    lp("That word is the arithmetic, not a shrug. For a high the balance")
    lp("needs f squared R to be at least 4G, and past that there is " cw("no",C_ACC))
    lp(cw("solution at all",C_ACC) " - no wind can hold that pressure field up. So a")
    lp("deep tight low is ordinary and a tight intense high does not exist,")
    lp("which is why every chart you have ever read looks the way it does.")
    print ""
    lpd("And the limit tightens as you go equatorward, because it goes as f")
    lpd("squared. At 1000 km of curvature the steepest high that can exist")
    lpd("is 6.1 mb per 100 km at 75 degrees, 3.3 at 45, and 0.2 at 10. The")
    lpd("tropics get their weather from lows for a reason.")
    print ""
    lpd("Honest boundary: these are steady-state balances with a drag law")
    lpd("fitted to an observed angle, not a boundary-layer model. The 10")
    lpd("metre wind is lower again than cos(alpha) says, because most of")
    lpd("that reduction is shear between the anemometer and the gradient")
    lpd("level rather than the balance above.")
    print ""
    return 1
  }
  return 0
}
