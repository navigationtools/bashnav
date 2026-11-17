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

