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

  # ---- the tide lesson quotes the working (Larry, AOR; weather 1.0.6) --
  #  The lesson once said "~1.2 hPa at the equator, ~0.2 at 45 deg" while
  #  the working took off 1.4 and 0.5.  The sizes are taken here from
  #  wx_tide itself, at its morning maximum, and the lesson's line is
  #  built from them: change the working and this fails until the lesson
  #  is changed with it.
  a0  = wx_tide("2026-08-30T10:00Z", 0, "00 00.0N")
  a45 = wx_tide("2026-08-30T10:00Z", 0, "45 00.0N")
  a50 = wx_tide("2026-08-30T10:00Z", 0, "50 00.0N")
  chk("the tide at the equator, hPa each way", sprintf("%.1f", a0),  "1.4")
  chk("the tide at 45 degrees",                sprintf("%.1f", a45), "0.5")
  chk("the tide at 50 degrees",                sprintf("%.1f", a50), "0.4")
  want = sprintf("%.1f hPa at the equator, %.1f at 45 deg", a0, a45)
  found = 0
  while((getline ln < "src/weather/teach.awk") > 0) if(index(ln, want)) found = 1
  close("src/weather/teach.awk")
  chk("the tide lesson quotes the working (" want ")", found, 1)

  # ---- the sea against the wind (W09, weather 1.0.7) -----------------
  #  THE CURVE IS THE MET OFFICE'S TABLE.  At each force's mean wind it
  #  must give that force's probable wave height, to the figure printed.
  nmo = split("2:0.1 5:0.2 9:0.6 13:1.0 19:2.0 24:3.0 30:4.0 37:5.5 44:7.0 52:9.0 60:11.5 64:14.0", MO, " ")
  for(i=1;i<=nmo;i++){ split(MO[i], kv, ":")
    chk("Beaufort curve at " kv[1] " kt, m", sprintf("%.2f", wx_seaht(kv[1]+0)), sprintf("%.2f", kv[2]+0)) }
  chk("no wind, no sea", wx_seaht(0), 0)
  chk("over 64 kt the curve stays at 14 m", wx_seaht(90), 14)
  #  it never falls as the wind rises, and neither does the state
  bad=0; lh=-1; ls=-1
  for(w=0; w<=800; w++){ h=wx_seaht(w/10); s=wx_seafor(w/10)
    if(h<lh || s<ls || s<0 || s>9) bad++; lh=h; ls=s }
  chk("height and state never fall as the wind rises, 0 to 80 kt by tenths", bad, 0)
  #  THE STEPS ARE WRITTEN OUT, AND MUST BE WHERE THE CURVE PUTS THEM.
  #  Each edge is found again here from the curve, by halving, and held
  #  to the written number: move a point of the curve and this fails
  #  until the step is moved with it.
  ntop = split("0.1 0.5 1.25 2.5 4 6 9 14", TOP, " ")
  for(s=2; s<=9; s++){
    lo=0; hi=64
    for(it=0; it<60; it++){ mid=(lo+hi)/2; if(wx_seaht(mid) >= TOP[s-1]+0) hi=mid; else lo=mid }
    d = hi - WXE[s]; if(d<0) d=-d
    chk("state " s " begins where the curve reaches " TOP[s-1] " m (" sprintf("%.2f", WXE[s]) " kt)", (d < 0.000001), 1)
  }
  chk("under 1 kt is calm",        wx_seafor(0.9), 0)
  chk("1 kt is rippled",           wx_seafor(1),   1)
  chk("7.9 kt is smooth",          wx_seafor(7.9), 2)
  chk("8 kt is slight",            wx_seafor(8),   3)
  chk("14 kt is slight",           wx_seafor(14),  3)
  chk("14.5 kt is moderate",       wx_seafor(14.5),4)
  chk("21 kt is moderate",         wx_seafor(21),  4)
  chk("22 kt is rough",            wx_seafor(22),  5)
  chk("29 kt is rough",            wx_seafor(29),  5)
  chk("30 kt is very rough",       wx_seafor(30),  6)
  chk("39 kt is very rough",       wx_seafor(39),  6)
  chk("40 kt is high",             wx_seafor(40),  7)
  chk("51 kt is high",             wx_seafor(51),  7)
  chk("52 kt is very high",        wx_seafor(52),  8)
  chk("63 kt is very high",        wx_seafor(63),  8)
  chk("64 kt is phenomenal",       wx_seafor(64),  9)
  #  the Met Office gives two states for forces 4, 7 and 8: each of those
  #  forces must hold both of its states, and force 6 only one
  chk("force 4 (11-16 kt) holds slight and moderate",   wx_seafor(11) "," wx_seafor(16), "3,4")
  chk("force 7 (28-33 kt) holds rough and very rough",  wx_seafor(28) "," wx_seafor(33), "5,6")
  chk("force 8 (34-40 kt) holds very rough and high",   wx_seafor(34) "," wx_seafor(40), "6,7")
  chk("force 6 (22-27 kt) is rough throughout",         wx_seafor(22) "," wx_seafor(27), "5,5")
  #  CLOSE TO THE NEXT STEP (Larry, AOZ): the top share of the step, in
  #  knots.  Rough runs 21.5 to 30, so a quarter of it begins at 27.875.
  chk("27 kt is not yet close at 25%",   wx_seaclose(27, 25), 0)
  chk("28 kt is close to very rough",    wx_seaclose(28, 25), 6)
  chk("29 kt is not close at 10%",       wx_seaclose(29, 10), 0)
  chk("29.5 kt is close at 10%",         wx_seaclose(29.5, 10), 6)
  chk("a calm is close to nothing",      wx_seaclose(0.9, 50), 0)
  chk("phenomenal has no next step",     wx_seaclose(70, 50), 0)
  bad=0; any=0
  for(w=0; w<=700; w++){ k=w/10
    if(wx_seaclose(k, 0) != 0) bad++                       # 0 turns it off
    c = wx_seaclose(k, 25); if(c){ any++; if(c != wx_seafor(k)+1) bad++ }
    if(wx_seaclose(k, 10) && !wx_seaclose(k, 25)) bad++    # a wider share holds the narrower
    if(wx_seaclose(k, 25) && !wx_seaclose(k, 50)) bad++ }
  chk("close is the next state up, nests by share, and 0 turns it off", bad ":" (any>0), "0:1")
  chk("the share is 25 unless set",   wx_pct(""), 25)
  chk("the share stops at 50",        wx_pct(70), 50)
  chk("the share is not negative",    wx_pct(-3), 0)
  chk("a share that is not a number is off", wx_pct("x"), 0)
  chk("the share is whole percent",   wx_pct("33.9"), 33)
  #  FULLY DEVELOPED: 0.22 U^2 / g, worked here in metres a second from
  #  the definition of the knot, not from the constant the function uses
  for(k=10; k<=60; k+=10){ u = k*1852/3600; d = wx_seafull(k) - 0.22*u*u/9.80665; if(d<0) d=-d
    chk("fully developed at " k " kt is 0.22 U^2/g", (d < 0.0001), 1) }
  chk("fully developed at 34 kt, m", sprintf("%.1f", wx_seafull(34)), "6.9")
  #  it is drawn and spoken of as a ceiling: from 19 kt up it is over the
  #  scale by a tenth of a metre or more, and never under it from 15
  bad=0; for(w=150; w<=700; w++) if(wx_seafull(w/10) < wx_seaht(w/10)) bad++
  chk("the limit is never under the scale from 15 kt up", bad, 0)
  bad=0; for(w=190; w<=700; w++) if(wx_seafull(w/10) < wx_seaht(w/10) + 0.1) bad++
  chk("from 19 kt the limit is over the scale by 0.1 m or more", bad, 0)

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
