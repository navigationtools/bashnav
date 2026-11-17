#  The weather rules, as properties.  Same technique as the 700,000
#  geometries that verified the bearing-drift rule in colregs: these are
#  claims about the sky, and a claim about the sky that has not been
#  checked over its whole range is a guess.
function chk(what,got,want){ T++; if(got==want) return 0
  BAD++; printf "  FAIL %s: got [%s] want [%s]\n", what, got, want; return 1 }
BEGIN{
  # ---- Buys Ballot, over the whole circle --------------------------
  #  With your back to the wind the low is 90 to the left in the north.
  #  Check the four cardinals by hand, then sweep every degree.
  chk("NH, wind from 270, low bears", wx_bb(270,1), 0)
  chk("NH, wind from 000, low bears", wx_bb(0,1),   90)
  chk("NH, wind from 090, low bears", wx_bb(90,1),  180)
  chk("NH, wind from 180, low bears", wx_bb(180,1), 270)
  chk("SH, wind from 270, low bears", wx_bb(270,0), 180)
  chk("SH, wind from 090, low bears", wx_bb(90,0),  0)
  bad=0
  for(d=0; d<360; d++){
    n = wx_bb(d,1); s = wx_bb(d,0)
    if(n<0 || n>359 || s<0 || s>359) bad++
    #  the two hemispheres must always be exactly opposite
    if(((n - s) + 720) % 360 != 180) bad++
    #  and the low is never in the direction the wind comes from
    if(n==d || s==d) bad++
  }
  chk("Buys Ballot holds at every degree", bad, 0)

  # ---- the circle, which is where this class of bug lives ----------
  chk("350 to 010 is +20", wx_d180(10-350), 20)
  chk("010 to 350 is -20", wx_d180(350-10), -20)
  chk("000 to 180 is 180", wx_d180(180-0),  180)
  bad=0
  for(a=0;a<360;a++) for(b=0;b<360;b+=7){
    x = wx_d180(b-a); if(x<-180 || x>180) bad++
  }
  chk("wx_d180 always lands in -180..180", bad, 0)

  # ---- minutes between timestamps ----------------------------------
  chk("three hours",        wx_mins("2026-08-30T18:00Z")-wx_mins("2026-08-30T15:00Z"), 180)
  chk("across midnight",    wx_mins("2026-08-31T01:00Z")-wx_mins("2026-08-30T23:00Z"), 120)
  chk("across a month end", wx_mins("2026-09-01T00:00Z")-wx_mins("2026-08-31T23:00Z"), 60)
  chk("across a year end",  wx_mins("2027-01-01T00:00Z")-wx_mins("2026-12-31T23:00Z"), 60)
  chk("across 29 February", wx_mins("2028-03-01T00:00Z")-wx_mins("2028-02-29T23:00Z"), 60)

  # ---- the atmospheric tide ----------------------------------------
  #  semidiurnal: twelve hours apart must give the same correction
  a1 = wx_tide("2026-08-30T10:00Z", 0, "10 00.0N")
  a2 = wx_tide("2026-08-30T22:00Z", 0, "10 00.0N")
  chk("the tide is semidiurnal", (a1-a2 < 0.001 && a2-a1 < 0.001), 1)
  #  and it must be far smaller at high latitude than in the tropics
  trop = wx_tide("2026-08-30T10:00Z", 0, "05 00.0N")
  high = wx_tide("2026-08-30T10:00Z", 0, "60 00.0N")
  if(trop<0) trop=-trop
  if(high<0) high=-high
  chk("the tide is much smaller at 60N than at 5N", (high < trop/4), 1)

  # ---- hemisphere from a latitude as a person writes it -------------
  #  the tendency, in the barograph's four words (weather 1.0.5): the
  #  change per three hours, each boundary from both sides
  chk("3.0 down in 3 h is falling fast",  wx_band(-3.0, 3), "falling fast")
  chk("2.9 down in 3 h is falling",       wx_band(-2.9, 3), "falling")
  chk("1.5 down in 3 h is falling",       wx_band(-1.5, 3), "falling")
  chk("1.4 down in 3 h is steady",        wx_band(-1.4, 3), "steady")
  chk("1.4 up in 3 h is steady",          wx_band( 1.4, 3), "steady")
  chk("1.5 up in 3 h is rising",          wx_band( 1.5, 3), "rising")
  chk("5.9 down in 6 h is falling",       wx_band(-5.9, 6), "falling")
  chk("6.0 down in 6 h is falling fast",  wx_band(-6.0, 6), "falling fast")
  chk("no time between is steady",        wx_band(-9.0, 0), "steady")
  #  the tide is allowed for only with a longitude and both latitudes
  chk("tide: longitude and latitudes known", wx_tideok(-3, "50 00.0N", "50 10.0N"), 1)
  chk("tide: no longitude",                  wx_tideok("", "50 00.0N", "50 10.0N"), 0)
  chk("tide: a latitude missing",            wx_tideok(-3, "", "50 10.0N"), 0)
  chk("41 14.0N is northern", wx_north("41 14.0N"), 1)
  chk("33 55.0S is southern", wx_north("33 55.0S"), 0)
  chk("-33.9 is southern",    wx_north("-33.9"),    0)
  printf "WXRESULT %d %d\n", T, BAD+0
}
