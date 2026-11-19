# =====================================================================
#  weather -- reasoning over a 500 mb chart the user is holding.
#
#  The app cannot fetch a chart and never will.  But a 500 mb chart
#  arrives by HF RADIOFAX, on an SSB receiver, at sea, with no
#  connectivity at all - which is exactly the situation the rest of
#  bashnav is built for.  So this is the reasoning layer over a fax:
#  read three numbers off it and the rules do the rest, showing every
#  step.
#
#  Rules from Sienkiewicz & Chesneau, Mariner's Guide to the
#  500-Millibar Chart, NOAA - public domain.  See docs/SOURCES.md.
# =====================================================================
function ch_say(s){ printf "  %s\n", s; return 0 }
function ch_why(s){ printf "  %s\n", cwd("   " s); return 0 }

#  brg    bearing FROM you TO the nearest point of the 564 line
#  dist   its distance in nm
#  orient the line's own orientation, as a bearing (either end)
#  w500   the 500 mb wind speed there, knots
#  north  1 northern hemisphere, 0 southern
function ch_report(brg, dist, orient, w500, north,   pole, side, mn, mx, smn, smx){
  print ""
  printf "  %s\n", cw("FROM THE 500 MILLIBAR CHART", C_ACC)
  hr()
  pole = north ? "north" : "south"

  if(dist=="" || brg==""){
    ch_say("Give me where the 564 line runs and I will walk the rules.")
    print ""
    return 0
  }
  ch_say(sprintf("The 5640 m contour is %g nm away, bearing %03d, lying %03d/%03d.",
         dist+0, brg+0, orient+0, (orient+180)%360))
  print ""

  # ---- 1. the storm track -------------------------------------------
  ch_say(cw("The surface storm track", C_ACC) sprintf(" runs parallel to that line, %s of it,", pole))
  ch_say("between 300 and 600 nm away from it.")
  ch_why("so the depressions are travelling along " sprintf("%03d/%03d", orient+0, (orient+180)%360) ", not toward you")

  # ---- 2. the gale boundary, which is the one that matters ----------
  print ""
  ch_say(cw("All the gale force winds are on the " pole " side of the 564 line.", C_WARN))
  if(ch_poleward(brg, north)){
    ch_say(cw("You are on the equatorward side of it. That is the right side.", C_OK))
    ch_why("stay there and you stay out of the gales - that is the routing rule,")
    ch_why("and it is why the standard book on this is called Heavy Weather Avoidance")
  } else {
    ch_say(cw("The line is equatorward of you, so you are on the gale side of it.", C_WARN))
    ch_why("getting equatorward of the 564 line is the single most useful thing")
    ch_why("you can do about the weather from here")
  }

  # ---- 3 and 4. speed and strength, if the wind was read ------------
  if(w500!=""){
    print ""
    mn = (w500+0)/3.0; mx = (w500+0)/2.0
    ch_say(sprintf("At %g knots aloft, systems below move at %.0f to %.0f knots.",
           w500+0, mn, mx))
    ch_why("a surface low or front travels at a third to a half of the 500 mb wind")
    if(dist+0 > 0){
      ch_say(sprintf("So a system 300 nm off would be on you in %.0f to %.0f hours.",
             300.0/mx, 300.0/mn))
    }
    print ""
    ch_say(sprintf("Behind it, in the cold air, expect about %.0f knots on deck.", (w500+0)/2.0))
    ch_why("surface wind in the west-to-southwest quadrant is about half the 500 mb")
    ch_why("wind - which is the number that decides what sail you are carrying")
  }
  hr()
  printf "  %s\n", cwd("Rules from Sienkiewicz and Chesneau, Mariner's Guide to the")
  printf "  %s\n", cwd("500-Millibar Chart, NOAA. They are rules of thumb: good ones,")
  printf "  %s\n", cwd("and still rules of thumb.")
  print ""
  return 0
}
#  Is the 564 line on my POLEWARD side?  If it bears north of me in the
#  northern hemisphere, I am equatorward of it, which is where I want
#  to be.
function ch_poleward(brg, north,   b){
  b = brg+0
  while(b<0) b+=360
  while(b>=360) b-=360
  if(north) return (b < 90 || b > 270)     # the line lies to my north
  return (b > 90 && b < 270)               # southern: to my south
}

# =====================================================================
#  THE WIND FROM THE ISOBARS (W07; weather 1.0.3; Larry, AKY and ALF,
#  16 November 2026).  The second chart a navigator reads, the surface
#  chart: measure the spacing between two isobars, and the balance of
#  the push toward the low against the earth's turn gives the wind aloft
#  (the geostrophic wind).  W01's rules then take it down to the deck.
#  It teaches the course's "Reading the forecast" level (3A).
#
#      wind aloft = (isobar interval) / (air density x f x spacing)
#      f = 2 x 7.292115e-5 x sin(latitude), the earth's turn where you are
#
#  Air density 1.225 kg/m3, as the wind panel uses (grid.awk wx_pgf).
#  Sources: the American Meteorological Society's glossary,
#  "geostrophic wind scale"; US Navy aerographer's mate training (tpub
#  weather2 7-10); docs/SOURCES.md.  The deck rules are W01's: about 2/3
#  backed 10-20 degrees over the sea, 1/3 to 2/3 backed 30-40 over land.
#  Within 5 degrees of the equator the balance does not hold (the earth's
#  turn is too weak there), so the tool refuses rather than give a number.
# =====================================================================
function iso_wind(sp, lat, step,   f){
  f = 2 * 7.292115e-5 * sin(wx_rad(lat < 0 ? -lat : lat))
  return (step * 100.0) / (1.225 * f * sp * 1852.0) * 1.943844
}
function iso_table(step, north,   r,c,line,SP,LT,ns,nl,h){
  ns = split("50 75 100 150 200 300", SP, " ")
  nl = split("30 40 50 60", LT, " ")
  h = north ? "N" : "S"
  ch_say(cw("The scale", C_ACC) sprintf(": the wind aloft in knots, isobars %g hPa apart", step))
  line = "   spacing, nm"
  for(c=1;c<=nl;c++) line = line sprintf("%8s", LT[c] " " h)
  ch_say(line)
  for(r=1;r<=ns;r++){
    line = sprintf("%14s", SP[r])
    for(c=1;c<=nl;c++) line = line sprintf("%8.0f", iso_wind(SP[r], LT[c], step))
    ch_say(line)
  }
  return 0
}
#  spacing  nm between two neighbouring isobars (minutes of latitude)
#  lat      latitude, degrees, 0 to 90
#  step     the isobar interval, hPa (4 on most charts)
#  north    1 northern hemisphere, 0 southern
function iso_report(spacing, lat, step, north,   v, h, turn){
  print ""
  printf "  %s\n", cw("THE WIND FROM THE ISOBARS", C_ACC)
  hr()
  if(step == "") step = 4
  h = north ? "N" : "S"
  turn = north ? "backed" : "veered"
  if(spacing == "" || lat == ""){
    ch_say("Give me the spacing between two isobars and your latitude, and I")
    ch_say("will work the wind.")
    print ""
    return 0
  }
  if(spacing+0 <= 0){ ch_say("The spacing must be more than nothing: measure it in nautical miles."); print ""; return 0 }
  if(step+0 <= 0){ ch_say("The isobar interval must be more than nothing: 4 hPa on most charts."); print ""; return 0 }
  if(lat+0 < 0 || lat+0 > 90){ ch_say("A latitude runs from 0 to 90 degrees; say north or south apart."); print ""; return 0 }
  ch_say(sprintf("Isobars %g hPa apart and %g nm between them, at %g degrees %s.", step+0, spacing+0, lat+0, h))
  print ""
  if(lat+0 < 5){
    ch_say(cw("Within 5 degrees of the equator the isobars do not give the wind.", C_WARN))
    ch_why("the earth's turn is too weak there to balance the push toward the")
    ch_why("low, so there is no steady wind along the isobars to work out;")
    ch_why("believe the wind you can see")
    print ""
    return 0
  }
  v = iso_wind(spacing+0, lat+0, step+0)
  ch_say(cw(sprintf("The wind aloft runs along the isobars at %.0f knots.", v), C_ACC))
  ch_why("the closer the isobars, the harder the push toward the low; the")
  ch_why("earth's turn bends the wind until the bend matches the push")
  ch_say(sprintf("On deck, over the sea: about %.0f knots, %s 10 to 20 degrees.", v*2/3, turn))
  ch_why("the drag of the sea slows it and turns it in toward the low")
  ch_say(sprintf("Over land: %.0f to %.0f knots, %s 30 to 40 degrees.", v/3, v*2/3, turn))
  ch_why("towns and forests at the slow end, open fields at the fast end")
  print ""
  ch_say("This is the wind for straight isobars. Round a tight low expect")
  ch_say("less, round a high more.")
  ch_why("the curve of the isobars changes the speed; the coriolis lesson's")
  ch_why("wind panel shows by how much")
  print ""
  iso_table(step+0, north)
  print ""
  hr()
  ch_say("The geostrophic wind: the push toward the low balanced by the")
  ch_say("earth's turn, air density 1.225 kg/m3. The spacing in nautical")
  ch_say("miles is minutes of latitude: measure it on the chart's side scale.")
  print ""
  return 0
}

#  THE SCALE, IN A LESSON (W07, weather 1.0.3): the wind aloft against the
#  spacing of the isobars, for the gradient lesson.  The terminal prints it
#  as a table; the browser draws it as curves (kind "isoscale"), with the
#  lesson's example marked, 100 nm at 50 N.  It lives here, beside
#  iso_wind, and not in grid.awk with the other figures: the rule checks
#  load grid.awk without chart.awk, and mawk refuses a file that calls a
#  function it cannot see (found by the suite the first time it ran).
function iso_scale_figure(   w,h,r,c,SP,LT,ns,nl,line){
  w=64; h=9
  gclear(w,h)
  FIGNAME = "isoscale"
  ns = split("50 75 100 150 200 300", SP, " ")
  nl = split("30 40 50 60", LT, " ")
  gputsc(0, 2, "THE WIND ALOFT, KNOTS, ISOBARS 4 hPa APART", C_ACC)
  line = " spacing, nm"
  for(c=1;c<=nl;c++) line = line sprintf("%8s", LT[c] " N")
  gputsc(2, 2, line, C_DIM)
  for(r=1;r<=ns;r++){
    line = sprintf("%12s", SP[r])
    for(c=1;c<=nl;c++) line = line sprintf("%8.0f", iso_wind(SP[r], LT[c], 4))
    if(SP[r] == 100) gputsc(2 + r, 2, line, C_ACC); else gputs(2 + r, 2, line)
  }
  return 0
}

# ---------------------------------------------------------------------
#  A REPORTED STORM, AS A CHECK ON YOUR OWN WIND (I20, weather 1.0.11;
#  Larry, ATZ, 18 November 2026).  You type in an official advisory: how
#  long ago it was issued, the centre's position, its movement, and how far
#  out its 34-knot winds reach; and where you are, your course and speed,
#  and the wind you have.  It answers five things:
#
#    1. where the centre is NOW: the advisory's position moved on along its
#       track for the hours since it was issued;
#    2. which side of the track you are on, looking the way the storm goes,
#       and so which side is dangerous: north of the equator its right,
#       south of it its left (Bowditch 2017, 3913, pp. 657-658), and which
#       way your wind will shift as it passes: veer on its right, back on
#       its left;
#    3. how close it comes, and when, if both hold their course and speed,
#       and whether that is inside its 34-knot winds;
#    4. whether your own wind agrees.  Facing the wind, the centre is about
#       110 degrees to your right ahead of the storm and 120 to 135 behind
#       it, to your left south of the equator; nearer the centre, a point or
#       two less (Bowditch, p. 655).  So ahead of it the band runs from 110
#       less two points (22.5 degrees) to 110; behind it, from 120 less two
#       points to 135; with no track to be ahead of or behind, from 87.5 to
#       135.  Within the band it agrees; within 15 degrees of it, near
#       enough for a wind read by eye; further off, the two disagree and one
#       of them is wrong or old;
#    5. that it is not a forecast: an advisory is hours old when it arrives,
#       and a storm can turn (Bowditch, p. 658).
#
#  THE CHART IS FLAT, ROUND YOU: east and north in nautical miles, a degree
#  of latitude 60 nm and of longitude 60 cos(mean latitude).  Within a few
#  hundred miles that is good to a few miles, and the report says so.
#
#  NEAR ITS PATH means ahead of the centre and closer to its track than its
#  34-knot winds reach (30 nm when the advisory gives no radius): a line of
#  the app's own, said as a fact and not as an order, since what to do
#  there is seamanship (PILOT's) and not this tool's.
#
#  THE WORDS ARE THE CREW'S SHARED WORDS (Larry, TAWG, 18 November 2026;
#  the navigationtools design system, "Shared words"): lines 1, 2, 4 and 5
#  are printed as they stand there, and the angle is the one used on the
#  watch faces and in the course, 110 ahead and 120 to 135 behind.
#  weather 1.0.15.  Before it this screen used one band, 110 to 135,
#  whether ahead or behind, and refused the south.
#
#  BOTH HEMISPHERES (TAWG settled card I19, part three): the same rule,
#  its left the dangerous side in the south, the centre to your left.
#  Which hemisphere is the storm's; a storm and a boat on opposite sides
#  of the equator are refused, since its side and its wind turn the other
#  way across it.
#
#  chart.js holds the same reasoning (CHART.stormReport) and
#  docs/web/tests/weather-storm.js holds the two to each other character
#  for character, and the closest approach to a brute-force search.
# ---------------------------------------------------------------------
function st_r(x){ return int(x + 0.5) }
function st_b(x){ x = (x % 360 + 360) % 360; return int(x + 0.5) % 360 }
#  a latitude or longitude typed as signed degrees, or with N S E W after
function st_deg(s, lim,   t, sg, v){
  t = s; gsub(/[ \t]/, "", t); sg = 1
  if(t ~ /[NnEe]$/){ t = substr(t, 1, length(t) - 1) }
  else if(t ~ /[SsWw]$/){ t = substr(t, 1, length(t) - 1); sg = -1 }
  if(t !~ /^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/) return "x"
  v = sg * (t + 0)
  if(v < -lim || v > lim) return "x"
  return v
}
function st_num(s,   t){
  t = s; gsub(/[ \t]/, "", t)
  if(t == "") return ""
  if(t !~ /^[-+]?([0-9]+\.?[0-9]*|\.[0-9]+)$/) return "x"
  return t + 0
}
function st_report(age, clat, clon, mdir, mkn, r34, blat, blon, bcse, bkn, wind,
                   a, cy, cx, by, bx, md, mk, rr, cs, bk, wd, k, dx, dy, vx, vy, ux, uy,
                   nx, ny, dist, brg, rel, cross, along, rx, ry, vv, t, px, py, cpa, lo, hi, off,
                   sh, pos, sd, alo, ahi){
  print ""
  printf "  %s\n", cw("A REPORTED STORM", C_ACC)
  hr()
  a = st_num(age); cy = st_deg(clat, 90); cx = st_deg(clon, 180); md = st_num(mdir); mk = st_num(mkn)
  rr = st_num(r34); by = st_deg(blat, 90); bx = st_deg(blon, 180); cs = st_num(bcse); bk = st_num(bkn); wd = st_num(wind)
  if(a == "" || clat == "" || clon == "" || md == "" || mk == "" || blat == "" || blon == ""){
    ch_say("Give me the advisory - how many hours ago it was issued, the centre's")
    ch_say("latitude and longitude, its direction and speed of movement - and your")
    ch_say("own position, and I will set it beside your wind.")
    print ""
    return 0
  }
  if(a == "x" || a < 0){ ch_say("The advisory's age is a number of hours, 0 or more."); print ""; return 0 }
  if(cy == "x" || by == "x"){ ch_say("A latitude runs from 90 S to 90 N: a number, or one with N or S after it."); print ""; return 0 }
  if(cx == "x" || bx == "x"){ ch_say("A longitude runs from 180 W to 180 E: a number, or one with E or W after it."); print ""; return 0 }
  if(md == "x" || md < 0 || md >= 360 || mk == "x" || mk < 0){ ch_say("The movement is a direction, 0 to 359, and a speed in knots."); print ""; return 0 }
  if(rr == "x" || (rr != "" && rr < 0)){ ch_say("The 34-knot radius is in nautical miles; leave it out if the advisory has none."); print ""; return 0 }
  if(cs == "x" || bk == "x" || (cs != "" && (cs < 0 || cs >= 360)) || (bk != "" && bk < 0)){ ch_say("Your course is 0 to 359 and your speed knots; leave both out if you are stopped."); print ""; return 0 }
  if(wd == "x" || (wd != "" && (wd < 0 || wd >= 360))){ ch_say("Your wind is the direction it blows from, 0 to 359; leave it out if you have none."); print ""; return 0 }
  if((by < 0 && cy > 0) || (by > 0 && cy < 0)){
    ch_say(cw("You and the storm are on opposite sides of the equator.", C_WARN))
    ch_why("its side and its wind turn the other way across it: not worked")
    print ""
    return 0
  }
  #  the storm's hemisphere: 1 north, -1 south
  sh = (cy < 0 || (cy == 0 && by < 0)) ? -1 : 1
  pos = 0
  if(cs == "") cs = 0; if(bk == "") bk = 0
  k = cos((cy + by) / 2 * 3.141592653589793 / 180)
  dx = cx - bx; if(dx > 180) dx -= 360; if(dx < -180) dx += 360
  dx = dx * 60 * k; dy = (cy - by) * 60
  vx = mk * sin(md * 3.141592653589793 / 180); vy = mk * cos(md * 3.141592653589793 / 180)
  ux = bk * sin(cs * 3.141592653589793 / 180); uy = bk * cos(cs * 3.141592653589793 / 180)
  nx = dx + vx * a; ny = dy + vy * a
  dist = sqrt(nx * nx + ny * ny); brg = atan2(nx, ny) * 57.29577951308232
  ch_say(sprintf("Reported %g hours ago: the centre at %s, %s, moving %03d at %g knots.", a, st_ll(cy, "N", "S"), st_ll(cx, "E", "W"), st_b(md), mk))
  if(rr != "") ch_say(sprintf("Its 34-knot winds reach %g nm from the centre.", rr))
  ch_say(sprintf("You: %s, %s, %s.", st_ll(by, "N", "S"), st_ll(bx, "E", "W"), (bk > 0 ? sprintf("steering %03d at %g knots", st_b(cs), bk) : "stopped")))
  print ""
  ch_say(cw(sprintf("The centre now: %03d, %d nm from you.", st_b(brg), st_r(dist)), C_ACC))
  ch_why(sprintf("the advisory's position moved on %g hours along its track", a))
  #  the side: you from the centre, against the way it goes
  if(mk > 0){
    rel = atan2(-nx, -ny) * 57.29577951308232 - md
    cross = dist * sin(rel * 3.141592653589793 / 180); along = dist * cos(rel * 3.141592653589793 / 180)
    off = (cross < 0 ? -cross : cross)
    pos = (along > 0 ? 1 : (along < 0 ? -1 : 0))
    #  ON ITS TRACK: under half a mile off it, where the sign of a
    #  cross product is only rounding, it is neither side
    if(off < 0.5){
      ch_say(cw(sprintf("You are on its track, %s it.", (along > 0 ? "ahead of" : "behind")), C_WARN))
      ch_why("neither side: ahead of it the centre is coming at you, behind")
      ch_why("it the centre is going away (Bowditch)")
    } else {
      sd = (cross > 0 ? "right" : "left")
      if((sh > 0) == (cross > 0)){
        ch_say(cw(sprintf("You are on the %s of its track, %d nm off it: the dangerous side.", sd, st_r(off)), C_WARN))
        ch_why("north of the equator its right is the dangerous side; south of it,")
        ch_why("its left. Its own speed adds to its wind there, and the wind and sea")
        ch_why("carry you toward its path (Bowditch)")
      } else {
        ch_say(sprintf("You are on the %s of its track, %d nm off it: the navigable side.", sd, st_r(off)))
        ch_why("the navigable side is not safe, only less dangerous. Its speed takes")
        ch_why("from its wind there, and the wind carries you away from its path")
        ch_why("(Bowditch)")
      }
      ch_why("look the way the storm is going: on its right the wind veers, on its")
      ch_why(sprintf("left it backs. Here, expect yours to %s as it passes", (cross > 0 ? "veer" : "back")))
    }
    #  NEAR ITS PATH: ahead of it and within its 34-knot radius of the
    #  track (30 nm when the advisory gives no radius), the app's own line
    if(along > 0 && ((rr != "" && off < rr) || (rr == "" && off < 30)))
      ch_say(cw("And you are ahead of it, near its path: its winds reach your water.", C_WARN))
  } else ch_say("It is reported stationary, so it has no track to be either side of.")
  print ""
  #  the closest approach, both holding course and speed
  rx = vx - ux; ry = vy - uy; vv = rx * rx + ry * ry
  if(vv < 0.25){
    ch_say(sprintf("It is keeping its distance from you: about %d nm while both hold on.", st_r(dist)))
  } else {
    t = -(nx * rx + ny * ry) / vv
    if(t <= 0){
      ch_say("It is drawing away from you: its closest was before now.")
      if(rr != "" && dist < rr) ch_say(cw("You are inside its 34-knot winds.", C_WARN))
    } else {
      px = nx + rx * t; py = ny + ry * t; cpa = sqrt(px * px + py * py)
      if(cpa < 0.5) ch_say(cw(sprintf("If both hold on, its centre passes over you in %d hours.", st_r(t)), C_WARN))
      else ch_say(cw(sprintf("If both hold on, it comes closest in %d hours: %d nm, bearing %03d.", st_r(t), st_r(cpa), st_b(atan2(px, py) * 57.29577951308232)), C_ACC))
      if(rr != ""){
        if(dist < rr) ch_say(cw("You are inside its 34-knot winds now.", C_WARN))
        else if(cpa < rr) ch_say(cw(sprintf("That is inside its 34-knot winds, which reach %g nm.", rr), C_WARN))
        else ch_say(sprintf("That is outside its 34-knot winds, which reach %g nm.", rr))
      }
      ch_why("a storm can turn, speed up or stop; work it again with each advisory")
    }
  }
  print ""
  #  your own wind
  if(wd == ""){
    ch_say("Give me your wind and I will check the report against it.")
  } else {
    if(pos > 0){ alo = 87.5; ahi = 110 } else if(pos < 0){ alo = 97.5; ahi = 135 } else { alo = 87.5; ahi = 135 }
    if(sh > 0){ lo = wd + alo; hi = wd + ahi } else { lo = wd - ahi; hi = wd - alo }
    ch_say(sprintf("Your wind from %03d puts the centre between %03d and %03d.", st_b(wd), st_b(lo), st_b(hi)))
    ch_why("face the wind: north of the equator the centre is about 110 degrees to")
    ch_why("your right ahead of the storm, and 120 to 135 behind it; south of the")
    ch_why("equator, to your left. Nearer the centre, a point or two less (Bowditch)")
    if(pos > 0)      ch_why("you are ahead of it: 110, or a point or two less")
    else if(pos < 0) ch_why("you are behind it: 120 to 135, or a point or two less")
    else             ch_why("it has no track to be ahead of or behind: 110 to 135, or two points less")
    #  UNDER HALF A DEGREE OUTSIDE IS INSIDE (weather 1.0.22, found by the
    #  shared storm cases, TAYT): the bearing and the band are printed to
    #  the whole degree, so a centre 0.4 degrees past the band's edge used
    #  to read "0 degrees outside that: near enough".  Now it agrees.
    off = st_out(brg, lo, hi)
    if(st_r(off) == 0) ch_say(cw("The report agrees with your wind.", C_ACC))
    else if(off <= 15) ch_say(sprintf("The report is %d degrees outside that: near enough, for a wind read by eye.", st_r(off)))
    else {
      ch_say(cw(sprintf("The report and your wind disagree, by %d degrees.", st_r(off)), C_WARN))
      ch_why("one of them is wrong or old: the advisory's age, a storm that has")
      ch_why("turned, or your log. The wind on deck is the newer evidence.")
    }
  }
  print ""
  hr()
  ch_say("Not a forecast. An advisory is hours old when it arrives, and a storm")
  ch_say("can turn; plot each one as it comes (Bowditch). Worked on a flat chart")
  ch_say("round you: good to a few miles within a few hundred.")
  print ""
  return 0
}
#  how far a bearing lies outside a band, lo clockwise to hi; 0 inside
function st_out(b, lo, hi,   w, d, e){
  w = ((hi - lo) % 360 + 360) % 360
  d = ((b - lo) % 360 + 360) % 360
  if(d <= w) return 0
  e = 360 - d
  return (d - w < e ? d - w : e)
}
function st_ll(v, p, n){ return sprintf("%g %s", (v < 0 ? -v : v), (v < 0 ? n : p)) }
