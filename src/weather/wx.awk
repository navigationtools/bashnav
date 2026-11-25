# =====================================================================
#  deck-log -- the weather reasoning.
#
#  EVERY RULE SHOWS ITS WORKING.  A forecast handed over without its
#  reasoning teaches nothing; the explanation is the product.
#
#  And it can only ever be as good as the log behind it: this reasons
#  from observations the user made, and says so.  With no network there
#  is no model, no GRIB and no chart.  What there is, is the one
#  category of weather data that is never wrong.
# =====================================================================

function wx_num(s){ if(s=="" || s=="-" || s=="/") return -9999; return s+0 }
function wx_has(x){ return (x>-9000) }

#  Angle difference on the circle.  350 against 010 is 20 degrees, not
#  340, and getting this wrong would misreport every veer near north.
function wx_d180(a){ while(a>180) a-=360; while(a<-180) a+=360; return a }

#  Minutes between two of our timestamps.  Days from a civil date, so
#  month ends and leap years come out right without a date library.
function wx_mins(ts,   y,mo,d,h,mi,a,jd){
  y=substr(ts,1,4)+0; mo=substr(ts,6,2)+0; d=substr(ts,9,2)+0
  h=substr(ts,12,2)+0; mi=substr(ts,15,2)+0
  a = int((14-mo)/12); y2 = y + 4800 - a; m2 = mo + 12*a - 3
  jd = d + int((153*m2+2)/5) + 365*y2 + int(y2/4) - int(y2/100) + int(y2/400) - 32045
  return jd*1440 + h*60 + mi
}

#  Load the observation history: the nav and wx records, newest last.
#
#  THE LATITUDE IS CARRIED.  Only a deck entry has a position; a weather
#  observation taken on its own (deck-log has a form for exactly that) has
#  none.  Until weather 1.0.5 such a reading kept an empty latitude, and
#  an empty latitude was read as the EQUATOR and as NORTH: the daily tide
#  was taken off at its full tropical 1.4 hPa, which at 50 degrees is four
#  times too much, enough to turn a definite fall into "near steady".
#  Found while drawing the barograph, whose wave needs the same latitude.
#  So a reading without a position takes the last one logged before it,
#  and readings before the first position take that first one.  With no
#  latitude anywhere in the log it stays empty, and the rules then say the
#  tide is not allowed for rather than guess (see wx_tideok).
function wx_load(logfile,   i, n, lastlat, firstlat){
  WN=0; lastlat=""; firstlat=""
  lg_read(logfile, "")
  for(i=1;i<=LG_N;i++){
    if(!lg_at(i)) continue
    if(LG_TYPE!="nav" && LG_TYPE!="wx") continue
    #  merge records that share a timestamp: a nav entry and the wx
    #  entry taken with it are one observation
    if(WN>0 && WT[WN]==LG_TS) n=WN; else { WN++; n=WN; WT[n]=LG_TS
      WDIR[n]=-9999; WSPD[n]=-9999; WP[n]=-9999; WTEND[n]=""
      WAIR[n]=-9999; WDEW[n]=-9999; WSEA[n]=-9999; WCLD[n]=-9999
      WSWP[n]=-9999; WSWD[n]=-9999; WLAT[n]=lastlat
      WSST[n]=-9999; WSWH[n]=-9999
      WCL[n]=-1; WCM[n]=-1; WCH[n]=-1; WVIS[n]=-1 }
    if(LG["wdir"]!="") WDIR[n]=wx_num(LG["wdir"])
    if(LG["wspd"]!="") WSPD[n]=wx_num(LG["wspd"])
    if(LG["mslp"]!="") WP[n]  =wx_num(LG["mslp"])
    if(LG["ptend"]!="" && LG["ptend"]!="-") WTEND[n]=LG["ptend"]
    if(LG["airt"]!="") WAIR[n]=wx_num(LG["airt"])
    if(LG["dewp"]!="") WDEW[n]=wx_num(LG["dewp"])
    if(LG["seat"]!="") WSEA[n]=wx_num(LG["seat"])
    if(LG["cloud"]!="") WCLD[n]=wx_num(LG["cloud"])
    if(LG["swper"]!="") WSWP[n]=wx_num(LG["swper"])
    if(LG["swdir"]!="") WSWD[n]=wx_num(LG["swdir"])
    #  the sea state as logged (the Douglas code, 0 to 9) and the swell's
    #  height.  WSEA above is the sea TEMPERATURE, which took the name
    #  first; the state of the sea is WSST.  Until weather 1.0.7 neither
    #  of these was read, so a sea-state forecast could not be scored.
    if(LG["sea"] ~ /^[0-9]$/) WSST[n]=LG["sea"]+0
    if(LG["swht"]!="") WSWH[n]=wx_num(LG["swht"])
    if(LG["cl"]!="" && LG["cl"]!="-" && LG["cl"]!="/") WCL[n]=LG["cl"]+0
    if(LG["cm"]!="" && LG["cm"]!="-" && LG["cm"]!="/") WCM[n]=LG["cm"]+0
    if(LG["ch"]!="" && LG["ch"]!="-" && LG["ch"]!="/") WCH[n]=LG["ch"]+0
    if(LG["vis"]!="" && LG["vis"]!="-" && LG["vis"]!="/") WVIS[n]=LG["vis"]+0
    if(LG["lat"]!=""){ WLAT[n]=LG["lat"]; lastlat=LG["lat"]; if(firstlat=="") firstlat=LG["lat"] }
  }
  for(i=1;i<=WN && WLAT[i]=="";i++) WLAT[i]=firstlat
  return WN
}

#  Northern or southern, from a latitude written as "41 14.0N" or "-33.9"
function wx_north(s){
  if(s=="") return 1
  if(s ~ /[Ss]$/) return 0
  if(substr(s,1,1)=="-") return 0
  return 1
}
function wx_latdeg(s,   x){
  x = s+0; if(x<0) x=-x
  return x
}

# ---------------------------------------------------------------------
#  The atmospheric tide.
#
#  Solar heating drives a wave that travels westward with the sun, and
#  it is on every barometer.  In the tropics the glass falls two to
#  three millibars between mid-morning and mid-afternoon EVERY DAY IN
#  PERFECT WEATHER, and a sailor who does not know that reads a routine
#  afternoon fall as a system approaching.
#
#  Dominantly SEMIdiurnal - twice a day, not once.  Maxima near 1000
#  and 2200 local, minima near 0400 and 1600.  Amplitude about 1.4 hPa
#  in the tropics, falling steeply with latitude.
#
#  So the correction is applied BEFORE anything is said about tendency,
#  and it is said out loud.
# ---------------------------------------------------------------------
function wx_tide(ts, lon, lat,   utch, solar, amp, la){
  utch = substr(ts,12,2)+0 + (substr(ts,15,2)+0)/60.0
  solar = utch + (lon+0)/15.0
  while(solar<0) solar+=24; while(solar>=24) solar-=24
  la = wx_latdeg(lat)
  amp = 1.4 * cos(la*3.14159265/180.0)^3
  if(amp<0) amp = -amp
  #  maxima near 1000 and 2200 local: a cosine of period 12 h peaking there
  return amp * cos(2*3.14159265*(solar-10.0)/12.0)
}

#  The tide can be allowed for only when we know where the sun is (the
#  longitude) and how big the tide is here (the latitude of both readings).
function wx_tideok(lon, lat1, lat2){ return (lon!="" && lat1!="" && lat2!="") }

# ---------------------------------------------------------------------
#  The tendency, in the four words the barograph uses.  ONE RULE, used by
#  the report's sentence, by the table of the glass and by the page's
#  barograph, so the three cannot disagree: the change per three hours,
#  with the daily tide allowed for where it can be.
#     3.6 hPa or more down   falling fast
#     1.6 or more down       falling
#     1.6 or more up         rising
#     otherwise              steady
#  THE MET OFFICE'S BANDS (weather 1.0.13; Larry, TAVL, 18 November 2026).
#  The Met Office's marine glossary, "Pressure tendency in station
#  reports": slowly 0.1 to 1.5 hPa in three hours, plain rising or falling
#  1.6 to 3.5, quickly 3.6 to 6.0, very rapidly over 6.0.  "Steady" here is
#  their slowly and less, "falling fast" their quickly and more.  The watch
#  (WeatherGlass, CelestialGlass) uses the same 1.6, and 3.6 and 6.0 for its
#  pressure figure's colours, so the wrist and bashnav read one log alike.
#  Was 1.5 and 3.0.  The same numbers are in wx.js band() and in the deck
#  log's src/decklog/wx.awk; docs/SOURCES.md has the source.
#  THE WORD FOLLOWS THE FIGURE PRINTED.  The rate is graded as the table
#  prints it, to a tenth (as the Met Office's bands are written), so a
#  line never reads "+1.6 hPa in 3 h" beside "steady" because the rate
#  was 1.57.  The table's figure is c/d*3 printed "%+.1f"; the same
#  expression and the same printf are used here.  wx.js does the same
#  with cfixed(), its copy of C's printf.
# ---------------------------------------------------------------------
function wx_band(corr, dt,   r){
  if(dt<=0) return "steady"
  r = sprintf("%.1f", corr/dt*3.0) + 0
  if(r <= -3.6) return "falling fast"
  if(r <= -1.6) return "falling"
  if(r >=  1.6) return "rising"
  return "steady"
}

# ---------------------------------------------------------------------
#  THE GLASS (W04; weather 1.0.5; Larry, AOI and AOQ, 17 November 2026).
#  The pressures of the last 24, 48 or 72 hours of the log, ending at the
#  latest one, as a barograph.  The page draws it: one bold trace, each
#  stretch coloured and weighted by its tendency, a strip of the same
#  words beneath, and behind it the daily tide alone as a wave from the
#  first reading.  The terminal prints the same thing as a table: one
#  line for each run of readings in the same tendency.
#
#  wx_glass_build fills, for the readings in the window:
#     GLN       how many          GLI[i]  which observation
#     GLM[i]    its time, minutes
#     GLC[i]    the change from the reading before, tide allowed for
#     GLD[i]    the hours between them      GLB[i]  the tendency word
#     GLTIDE    1 if the tide could be allowed for
#     GLAMP     the tide's size here, hPa each way: 1.4 cos^3(latitude)
# ---------------------------------------------------------------------
function wx_mon(m){ return substr("JanFebMarAprMayJunJulAugSepOctNovDec", 3*m-2, 3) }
function wx_day(ts){ return sprintf("%d %s", substr(ts,9,2)+0, wx_mon(substr(ts,6,2)+0)) }
function wx_glass_build(lon, hours,   i, e, t1, m, dp, la){
  GLN=0; GLTIDE=0; GLAMP=0
  for(e=WN; e>=1; e--) if(wx_has(WP[e])) break
  if(e<1) return 0
  t1 = wx_mins(WT[e]) - hours*60
  for(i=1;i<=e;i++){
    if(!wx_has(WP[i])) continue
    m = wx_mins(WT[i]); if(m < t1) continue
    GLN++; GLI[GLN]=i; GLM[GLN]=m
  }
  GLTIDE = wx_tideok(lon, WLAT[e], WLAT[e]) ? 1 : 0
  if(GLTIDE){ la = wx_latdeg(WLAT[e]); GLAMP = 1.4 * cos(la*3.14159265/180.0)^3; if(GLAMP<0) GLAMP=-GLAMP }
  for(i=2;i<=GLN;i++){
    GLD[i] = (GLM[i]-GLM[i-1])/60.0
    dp = WP[GLI[i]] - WP[GLI[i-1]]
    if(GLTIDE) dp = dp - (wx_tide(WT[GLI[i]], lon, WLAT[GLI[i]]) - wx_tide(WT[GLI[i-1]], lon, WLAT[GLI[i-1]]))
    GLC[i] = dp
    GLB[i] = wx_band(dp, GLD[i])
  }
  return GLN
}
function wx_glass(lon, hours,   i, j, c, d, lab, day){
  if(wx_glass_build(lon, hours) < 2) return 0
  print ""
  wx_say(sprintf("The glass, last %d hours:", hours))
  day = substr(WT[GLI[1]],1,10)
  wx_say(sprintf("   %-17s%7.1f", wx_day(WT[GLI[1]]) " " substr(WT[GLI[1]],12,5), WP[GLI[1]]))
  i=2
  while(i<=GLN){
    j=i; c=GLC[i]; d=GLD[i]
    while(j+1<=GLN && GLB[j+1]==GLB[i]){ j++; c+=GLC[j]; d+=GLD[j] }
    lab = "to " substr(WT[GLI[j]],12,5)
    if(substr(WT[GLI[j]],1,10)!=day){ lab = "to " wx_day(WT[GLI[j]]) " " substr(WT[GLI[j]],12,5); day = substr(WT[GLI[j]],1,10) }
    wx_say(sprintf("   %-17s%7.1f   %-14s%+.1f hPa in 3 h", lab, WP[GLI[j]], GLB[i], (d>0 ? c/d*3 : 0)))
    i=j+1
  }
  if(GLTIDE)       wx_why(sprintf("the daily tide alone is %.1f hPa each way here, and is allowed for", GLAMP))
  else if(lon=="") wx_why("no longitude set, so the daily tide is not allowed for")
  else             wx_why("no latitude in the log yet, so the daily tide is not allowed for")
  return 1
}

# ---------------------------------------------------------------------
#  THE SEA AGAINST THE WIND (W09; weather 1.0.7).  Larry's rulings of
#  17 November 2026:
#     AOU  the curve is a public source's, and the score's rule for
#          turning a wind into a sea state follows it
#     AOZ  when the wind is in the top share of the step it is on, the
#          next step is marked as close; the share can be set (weather
#          close <percent>), 25 unless set, measured in knots, upward only
#     APC  the sea state is scored: one state for each wind
#     APF  the fully developed limit is given too, as a ceiling
#
#  THE CURVE is the Beaufort scale's probable wave height, the Met Office's
#  table ("Beaufort wind force scale"; the WMO's figures): for each force
#  its mean wind in knots and the probable height in metres, "for
#  well-developed wind waves of the open sea", joined by straight lines:
#     kt   2    5    9    13   19   24   30   37   44   52   60    64
#     m    0.1  0.2  0.6  1.0  2.0  3.0  4.0  5.5  7.0  9.0  11.5  14
#  (64 kt is where force 12 begins, "14 m and over".)
#
#  THE STATES are the WMO's code 3700 (the Douglas scale as NOAA's NCEI
#  tabulates it): 1 to 0.1 m, 2 to 0.5, 3 slight to 1.25, 4 moderate to
#  2.5, 5 rough to 4, 6 very rough to 6, 7 high to 9, 8 very high to 14,
#  9 phenomenal over 14.
#
#  THE STEPS are where the curve reaches each of those heights, in knots:
#  1, 2, 8, 14.5, 21.5, 30, 39 1/3, 52, 64.  They are written out, not
#  worked from the curve each time, because a step that is found by
#  comparing two floating-point heights can land either side of its own
#  edge; tests/wx-check.awk finds each edge again from the curve and
#  requires it to be the number written here.  A wind that has reached an
#  edge is in the higher state.
#
#  The Met Office's table gives one state for a whole force, and two for
#  forces 4, 7 and 8, which are the forces inside which the curve crosses
#  an edge (14.5, 30 and 39 kt).  This works from the wind itself, so it
#  turns partway through a force where the table cannot.
#
#  FULLY DEVELOPED is Pierson and Moskowitz's limit for a steady wind over
#  open ocean, H = 0.22 U^2 / g with U the wind at 10 m in metres a second
#  (Stewart, Introduction to Physical Oceanography, 16.4), which takes
#  "roughly ten-thousand wave periods" of wind over "five-thousand wave
#  lengths" of sea.  Up to about 24 kt it and the scale agree to a third
#  of a metre; above that it is well over the scale.
#
#  Until 1.0.7 the score used a table of its own (under 7 kt state 1,
#  under 13 state 2, under 19 state 3, under 25 state 4, under 34 state 5,
#  ...), which was one state under the Met Office's heights at 4 to 12 and
#  22 to 24 kt and one over at 56 to 63, and had never been checked
#  against a source.  docs/SOURCES.md, Weather.
# ---------------------------------------------------------------------
function wx_seainit(){
  if(WXS_N) return 0
  WXS_N = split("0 2 5 9 13 19 24 30 37 44 52 60 64", WXS_K, " ")
  split("0 0.1 0.2 0.6 1.0 2.0 3.0 4.0 5.5 7.0 9.0 11.5 14.0", WXS_H, " ")
  split("1 2 8 14.5 21.5 30 0 52 64", WXE, " "); WXE[7] = 118/3
  split("rippled|smooth|slight|moderate|rough|very rough|high|very high|phenomenal", WXS_NAME, "|")
  split("under 0.1 m|0.1 to 0.5 m|0.5 to 1.25 m|1.25 to 2.5 m|2.5 to 4 m|4 to 6 m|6 to 9 m|9 to 14 m|over 14 m", WXS_RNG, "|")
  return 0
}
#  the Beaufort scale's probable wave height at this wind, metres
function wx_seaht(kt,   i){
  wx_seainit()
  if(kt<=0) return 0
  for(i=2;i<=WXS_N;i++) if(kt <= WXS_K[i]+0)
    return WXS_H[i-1] + (WXS_H[i]-WXS_H[i-1])*(kt-WXS_K[i-1])/(WXS_K[i]-WXS_K[i-1])
  return 14.0
}
#  the sea state the scale gives this wind, 0 to 9
function wx_seafor(kt,   i, s){
  wx_seainit(); s=0
  for(i=1;i<=9;i++) if(kt >= WXE[i]+0) s=i
  return s
}
#  the state it is close to, or 0: in the top pct percent of its step
function wx_seaclose(kt, pct,   s){
  s = wx_seafor(kt)
  if(s<1 || s>8 || pct<=0) return 0
  if(kt >= WXE[s+1] - (WXE[s+1]-WXE[s])*pct/100.0) return s+1
  return 0
}
#  fully developed, metres: 0.22 U^2 / g, U in metres a second
function wx_seafull(kt,   v){ v = kt*0.514444; return 0.22*v*v/9.80665 }
function wx_seaname(s){ wx_seainit(); return (s<1 ? "glassy" : WXS_NAME[s]) }
function wx_searange(s){ wx_seainit(); return (s<1 ? "flat" : WXS_RNG[s]) }
function wx_kt(x){ return (x==int(x)) ? sprintf("%d", x) : sprintf("%.1f", x) }
#  the share of a step that counts as close: 25 unless set, 0 to 50
function wx_pct(x){
  if(x=="") return 25
  x = int(x+0); if(x<0) x=0; if(x>50) x=50
  return x
}
#  the sea against the wind, in words: the latest observation's wind, the
#  sea state and the swell logged with it
function wx_seasay(n, pct,   w, h, s, nx, full, ls){
  if(!wx_has(WSPD[n]) || WSPD[n]<0) return 0
  w = WSPD[n]; h = wx_seaht(w); s = wx_seafor(w); pct = wx_pct(pct)
  print ""
  if(s==0) wx_say("The sea: no wind to speak of; the scale expects a glassy sea.")
  else {
    wx_say(sprintf("The sea: at %s kt the Beaufort scale expects about %.1f m, %s.", wx_kt(w), h, wx_seaname(s)))
    wx_why("its probable wave height, for a well-developed sea in open water.")
    wx_why("The sea lags the wind: it builds after the wind does.")
  }
  nx = wx_seaclose(w, pct)
  if(nx>0){
    wx_say(cw(sprintf("Close to %s: the scale turns at %s kt.", wx_seaname(nx), wx_kt(WXE[nx])), C_ACC))
    wx_why(sprintf("your wind is in the top %d%% of the %s step, %s to %s kt.", pct, wx_seaname(s), wx_kt(WXE[s]), wx_kt(WXE[nx])))
  }
  if(wx_has(WSST[n])){
    ls = WSST[n]
    if(ls==s) wx_say(sprintf("You logged a %s sea: what the scale expects.", wx_seaname(ls)))
    else if(ls<s){
      wx_say(sprintf("You logged a %s sea, %s: under the scale.", wx_seaname(ls), wx_searange(ls)))
      wx_why("a sea still building, or short of fetch: the wind has not had the")
      wx_why("time or the distance to raise all it can.")
    } else {
      wx_say(sprintf("You logged a %s sea, %s: above the scale.", wx_seaname(ls), wx_searange(ls)))
      wx_why("more sea than the scale gives this wind. Is some of it swell?")
    }
  }
  if(wx_has(WSWH[n]) && WSWH[n]>0){
    if(wx_has(WSWP[n])) wx_say(sprintf("Your swell: %.1f m at %d seconds.", WSWH[n], int(WSWP[n])))
    else                wx_say(sprintf("Your swell: %.1f m.", WSWH[n]))
    wx_why("swell is sea that has left the wind that raised it, so it is marked")
    wx_why("on its own and not held against this wind.")
  }
  full = wx_seafull(w)
  if(full >= h + 0.1){
    wx_say(sprintf("Fully developed, this wind could raise about %.1f m.", full))
    wx_why("the limit for a steady wind over open ocean (Pierson and")
    wx_why("Moskowitz). It takes roughly ten thousand wave periods of wind")
    wx_why("over five thousand wavelengths of sea; the gap from the scale")
    wx_why("is time and fetch.")
  }
  return 1
}

# ---------------------------------------------------------------------
#  Buys Ballot.
#
#  Wind direction is where it comes FROM, so with your back to it you
#  face wdir+180.  The low is 90 degrees to your left in the northern
#  hemisphere, which is (wdir+180) - 90 = wdir + 90.  To your right in
#  the southern: wdir + 270.
#
#  The first version added and subtracted the 90 the other way round and
#  pointed at the exact opposite side of the sky - 080 for a low that
#  was at 260.  Plausible-looking, completely wrong, and the sort of
#  thing that survives a read-through and not a test.  Sanity check:
#  a westerly in the northern hemisphere (270) gives 000, and a low to
#  the north with a westerly is what a mid-latitude depression does.
function wx_bb(wdir, north,   b){
  b = north ? wdir + 90 : wdir + 270
  while(b>=360) b-=360
  while(b<0)    b+=360
  return int(b+0.5)%360
}
#  THE LOW IS A SECTOR, NOT A LINE (weather 1.0.8; Larry, APK, 17 November
#  2026).  wx_bb is the rule for a wind that runs along the isobars.  The
#  wind on deck does not: the sea turns it 10 to 20 degrees in toward the
#  low (the gradient lesson, W01), so with your back to it the low lies
#  that much FORWARD of the arm Buys Ballot gives.  The report and the
#  page's compass card give the sector from straight off that arm to 20
#  degrees forward of it: clockwise from wx_bb in the north, where the low
#  is on your left; anticlockwise from it in the south, where it is on
#  your right.  wx_bbfar is the forward edge, and wx_bblo and wx_bbhi are
#  the two edges in clockwise order, as bearings are read.
#  Source: Penn State METEO 3 ("with the surface wind at your back ... low
#  pressure is still on your left, but on average, it will lie about 30
#  degrees clockwise from your left arm"; less over water); docs/SOURCES.md.
function wx_bbfar(wdir, north,   b){
  b = wx_bb(wdir, north) + (north ? 20 : 340)
  return b%360
}
function wx_bblo(wdir, north){ return north ? wx_bb(wdir, north) : wx_bbfar(wdir, north) }
function wx_bbhi(wdir, north){ return north ? wx_bbfar(wdir, north) : wx_bb(wdir, north) }

# ---------------------------------------------------------------------
#  THE QUARTER THE LOW IS HEADING INTO (weather 1.0.8; Larry, APR, 17
#  November 2026).  One boat's log cannot give a storm's course.  With two
#  things in it, it can give the quarter of the compass the course lies in:
#
#    the wind has shifted more than 10 degrees: backed, you are on the
#      LEFT of its track, looking the way it is going; veered, the right
#      (APO and APP, above).  On the left, the course lies within the half
#      turn clockwise of the bearing FROM the low TO you; on the right,
#      anticlockwise of it.
#    the glass is falling or rising (wx_band): falling, the low is CLOSING,
#      so its course is within 90 degrees of that same bearing; rising, it
#      is opening, and its course is more than 90 from it.
#
#  Together, with t the bearing from the low to you (the middle of the
#  sector, turned about), the course is in:
#      left and closing     t      to t+90        left and opening   t+90 to t+180
#      right and closing    t-90   to t           right and opening  t-180 to t-90
#  and, holding its course, it comes nearest to you a quarter turn round
#  from it: clockwise of the course on the left, anticlockwise on the right.
#
#  THESE ARE TWO RULES OF THUMB, and the report says so: a low can deepen
#  without moving, or fill where it lies, and the picture is of a straight
#  track and a boat that is slow against the storm.  tests/wx-check.awk
#  moves a low past a boat on every course and requires the course to be
#  inside the quarter this gives.
#
#  Sets WXC_0 and WXC_1 (the quarter, clockwise), WXC_CPA (the bearing it
#  comes nearest on), WXC_LEFT and WXC_CLOSING; returns 0 when the log does
#  not have both things.
# ---------------------------------------------------------------------
function wx_course(lo, hi, dw, band,   t, tr, c0){
  if(dw+0 <= 10 && dw+0 >= -10) return 0
  if(band=="falling" || band=="falling fast") tr=1
  else if(band=="rising") tr=0
  else return 0
  WXC_LEFT = (dw+0 < 0) ? 1 : 0
  WXC_CLOSING = tr
  t = lo + ((hi-lo+360)%360)/2 + 180
  if(WXC_LEFT)  c0 = tr ? t : t+90
  else          c0 = tr ? t-90 : t-180
  WXC_0 = (c0%360+360)%360
  WXC_1 = (WXC_0+90)%360
  WXC_CPA = ((WXC_0 + 45 + (WXC_LEFT ? 90 : 270))%360+360)%360
  return 1
}
function wx_pt8(b,   n, P){
  n = split("north north-east east south-east south south-west west north-west", P, " ")
  return P[int((b%360+360)%360/45 + 0.5)%8 + 1]
}

# ---------------------------------------------------------------------
#  A FRONTAL LOW, LOOKED DOWN ON (W20, weather 1.0.10; Larry, ATR, 18
#  November 2026).  The model behind the lesson `fronts` and its figure:
#  one depression of the northern hemisphere going east, with a warm front
#  running east and south-east from its centre and a cold front running
#  south-west, and the two boats of the figure, one each side of its track.
#
#  THE PRESSURE.  A round low, 990 hPa at the centre and 26 hPa shallower
#  far out, falling off as exp(-(r/700)^2), r in nautical miles from the
#  centre.  EACH FRONT LIES IN A TROUGH (Bowditch 2017, 3810 to 3812): on
#  top of the round low, 2.5 hPa times tanh(d/150), d the distance to the
#  front, so the pressure is lowest along the front and the isobars kink
#  there.  That kink is why the wind shifts at a front.  The fronts only
#  reach south of the centre, so the trough term is weighted by
#  1/(1+exp(y/40)), which is near 1 south of the centre and near 0 north.
#
#  THE WIND.  Along the isobars with the low on its left (Buys Ballot),
#  turned 15 degrees in toward lower pressure: it blows from 75 degrees
#  round from the direction the pressure rises, taken from the local
#  gradient.  So a kink in the isobars is a shift in the wind, and nothing
#  about the shift is written in: it is worked.
#
#  THE GLASS.  The low moves east at 30 knots (an assumption of the
#  figure, said so in it), so a boat that stays put runs west through it,
#  90 nm in three hours.  Its change over those three hours is graded by
#  wx_band(), the barograph's own rule.
#
#  wx.js holds the same model (WX.frP, WX.frFrom, WX.frGlass), and
#  docs/web/tests/weather-fronts.js holds the two to each other character
#  for character over a grid of points (`weather` cmd=frontsdump).
# ---------------------------------------------------------------------
function fr_init(){
  if(FR_READY) return 0
  FRWN = split("0 0 180 -40 330 -150 450 -330 520 -520", FRW, " ") / 2
  FRCN = split("0 0 -60 -160 -110 -330 -140 -520", FRC, " ") / 2
  #  the stations: boat A south of the track, boat B north of it, in the
  #  order the low brings them (x is the low's position east of the boat)
  FRA_N = split("680 440 160 -130 -450", FRAX, " "); FRA_Y = -250
  FRB_N = split("560 0 -560", FRBX, " ");            FRB_Y = 250
  split("ahead of the warm front|the warm front coming|the warm sector|just behind the cold front|well behind the cold front", FRAS, "|")
  split("cirrus, then cirrostratus|altostratus, nimbostratus, rain|stratus, drizzle, haze or fog|cumulonimbus, squalls, showers|clearing, showers, good visibility", FRAK, "|")
  split("cool|cool, warming|warm, moist|turning cold|cold, clear", FRAT, "|")
  split("the low ahead|the low at its nearest|the low past", FRBS, "|")
  FR_READY = 1
  return 0
}
function fr_tanh(x,   e){ e = exp(-2 * (x < 0 ? -x : x)); return (x < 0 ? -1 : 1) * (1 - e) / (1 + e) }
function fr_segd(px, py, ax, ay, bx, by,   dx, dy, t){
  dx = bx - ax; dy = by - ay
  t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  if(t < 0) t = 0; if(t > 1) t = 1
  dx = px - (ax + t * dx); dy = py - (ay + t * dy)
  return sqrt(dx * dx + dy * dy)
}
function fr_dist(px, py, L, n,   i, d, m){
  m = -1
  for(i = 1; i < n; i++){
    d = fr_segd(px, py, L[2*i-1], L[2*i], L[2*i+1], L[2*i+2])
    if(m < 0 || d < m) m = d
  }
  return m
}
function fr_p(x, y,   p, s){
  fr_init()
  p = 990 + 26 * (1 - exp(-(x * x + y * y) / 490000))
  s = 1 / (1 + exp(y / 40))
  p += s * 2.5 * fr_tanh(fr_dist(x, y, FRW, FRWN) / 150)
  p += s * 2.5 * fr_tanh(fr_dist(x, y, FRC, FRCN) / 150)
  return p
}
#  the bearing the wind blows FROM, degrees true
function fr_from(x, y,   gx, gy, gb){
  gx = (fr_p(x + 1, y) - fr_p(x - 1, y)) / 2
  gy = (fr_p(x, y + 1) - fr_p(x, y - 1)) / 2
  gb = atan2(gx, gy) * 57.29577951308232
  return ((gb + 75) % 360 + 360) % 360
}
#  the glass at a boat over three hours, in hPa: the low moving east at 30 kn
function fr_glass(x, y){ return fr_p(x - 45, y) - fr_p(x + 45, y) }
#  the same, in the barograph's words
function fr_band(x, y){ return wx_band(fr_glass(x, y), 3) }
#  sixteen points
function fr_pt16(b,   P){
  split("N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW", P, " ")
  return P[int((b % 360 + 360) % 360 / 22.5 + 0.5) % 16 + 1]
}
#  the dump the browser's model is held to
function fr_dump(   x, y){
  for(y = 450; y >= -550; y -= 50)
    for(x = -750; x <= 850; x += 50)
      printf "%d %d %.3f %.2f %.3f %s\n", x, y, fr_p(x, y), fr_from(x, y), fr_glass(x, y), fr_band(x, y)
  return 0
}

# ---------------------------------------------------------------------
#  THE ROUTING LESSON'S BOAT AND WATER (weather 1.0.21; gap list W35,
#  book of work B22; Larry's ruling TAYO, 19 November 2026).
#
#  The lesson `routing` teaches how a router works and how far to trust
#  one.  This app does not route (gap list rule 3), so its figures are
#  worked on a made-up boat in a steady wind, small enough to check by
#  hand:
#
#    the boat    her speed at eight angles off the wind, 45 to 150
#                degrees (RT_A, RT_S).  She cannot point above 45 and
#                gybes downwind of 150, as bashnav's router answers only
#                out to a polar's beat and run rows (ROUTER.md, "One
#                step").
#    the water   still, with one wind everywhere.
#
#  In one wind, everywhere she can be after t hours, tacking and gybing
#  as she likes, is t times the outline through her sixteen speeds: the
#  isochrone.  So the time to make good a displacement is the largest of
#  sixteen dot products, one for each side of that outline (rt_g).  The
#  same sum runs backwards from the finish, which is the reverse
#  isochrone, and the two added are the cost of passing through a place.
#
#  Mirrored in docs/web/weather/wx.js (WX.rt*), and held to it character
#  for character by docs/web/tests/weather-route.js (cmd=routedump).
# ---------------------------------------------------------------------
function rt_init(   i, n, a){
  if(RT_N) return 0
  n = split("45 6.0 60 6.9 75 7.5 90 8.0 105 8.1 120 7.9 135 7.5 150 7.0", a, " ")
  RT_M = n / 2
  for(i = 1; i <= RT_M; i++){ RT_A[i] = a[2*i-1] + 0; RT_S[i] = a[2*i] + 0 }
  #  the outline, clockwise from close-hauled on port tack (heading 045
  #  in a northerly) round to close-hauled on starboard (heading 315)
  for(i = 1; i <= RT_M; i++){
    RT_X[i] = RT_S[i] * sin(wx_rad(RT_A[i])); RT_Y[i] = RT_S[i] * cos(wx_rad(RT_A[i]))
  }
  for(i = 1; i <= RT_M; i++){ RT_X[RT_M+i] = -RT_X[RT_M+1-i]; RT_Y[RT_M+i] = RT_Y[RT_M+1-i] }
  RT_N = 2 * RT_M
  #  the worked legs: a reach of 24 miles, a beat of 12, and the finish
  #  of the first figure, 22.5 miles off bearing 075
  RT_REACH = 24; RT_BEAT = 12; RT_LANE = 10
  #  the all-in case: a shift forecast one hour in, of 20 degrees
  RT_TS = 1; RT_SHIFT = 20
  #  how often a forecast is right, by days ahead (NOAA SciJinks)
  split("1 5 90 6 7 80 8 10 50", RT_HZ, " "); RT_HZN = 3
  #  the wind and the stream scaled before routing (Stan Honey's rule of
  #  thumb; docs/SOURCES.md says what was read)
  split("tropics 1.15 mid-latitudes 1.20 high-latitudes 1.25", RT_SC, " "); RT_SCN = 3
  RT_CUR = 1.30
  #  TEST THE ROUTE: the all-in beat sailed three times, her speeds scaled
  #  as a lighter and a stronger wind would scale them (rt_allin_k).
  #  Until weather 1.0.26 this was three router runs of the 2025 Myth of
  #  Malham on a polar built from tracker data fetched without its
  #  publishers' permission; Larry's ruling TBOK, 25 November 2026, put
  #  the app's own boat in their place.  CHANGELOG, weather 1.0.26, says
  #  how to bring the race back if permission is given.
  split("0.9 1.0 1.1", RT_K, " "); RT_KN = 3
  return 0
}
#  hours to make good (dx east, dy north) miles in a wind from wd
function rt_g(dx, dy, wd,   r, x, y, m, i, j, nx, ny, h, q){
  rt_init()
  r = wx_rad(wd); x = dx * cos(r) - dy * sin(r); y = dx * sin(r) + dy * cos(r)
  m = 0
  for(i = 1; i <= RT_N; i++){
    j = (i % RT_N) + 1
    nx = RT_Y[j] - RT_Y[i]; ny = -(RT_X[j] - RT_X[i]); h = nx * RT_X[i] + ny * RT_Y[i]
    if(h < 0){ nx = -nx; ny = -ny; h = -h }
    q = (nx * x + ny * y) / h; if(q > m) m = q
  }
  return m
}
#  the time lost by going through (px, py) on the way from the start, at
#  the origin, to (fx, fy), in hours: forward time plus reverse time,
#  less the best
function rt_cost(px, py, fx, fy,   c){
  c = rt_g(px, py, 0) + rt_g(fx - px, fy - py, 0) - rt_g(fx, fy, 0)
  return (c < 0.000000001 ? 0 : c)      # never negative: the last digits of a sum
}
#  how wide the water is, across the middle of the leg, that costs no
#  more than `mins` minutes
function rt_width(fx, fy, mins,   L, ux, uy, s, lo, hi, mid, k, tot){
  L = sqrt(fx*fx + fy*fy); ux = -fy / L; uy = fx / L; tot = 0
  for(s = 1; s >= -1; s -= 2){
    lo = 0; hi = 40
    for(k = 0; k < 40; k++){
      mid = (lo + hi) / 2
      if(rt_cost(fx/2 + s*mid*ux, fy/2 + s*mid*uy, fx, fy) <= mins / 60) lo = mid; else hi = mid
    }
    tot += lo
  }
  return tot
}
#  the all-in case.  She beats for RT_TS hours with a share `a` of it on
#  port tack (1: all of it, the right-hand side; 0: the left), then
#  sails the rest as well as she can in a wind from `wd`
function rt_allin(a, wd){ return rt_allin_k(a, wd, 1) }
#  the same, with every speed of hers times k: the first hour covers k
#  times the ground, and the rest takes 1/k of the time.  The shift still
#  comes RT_TS hours in, at the forecast's own time, whatever her speed.
function rt_allin_k(a, wd, k,   px, py){
  rt_init()
  px = RT_TS * k * (a * RT_X[1] + (1 - a) * RT_X[RT_N]); py = RT_TS * k * RT_Y[1]
  return RT_TS + rt_g(0 - px, RT_BEAT - py, wd) / k
}
function rt_hm(t,   m){ m = int(t * 60 + 0.5); return sprintf("%d h %02d", int(m / 60), m % 60) }
function rt_dump(   x, y, w, i, a){
  rt_init()
  for(w = -20; w <= 20; w += 10)
    for(y = 24; y >= -24; y -= 4)
      for(x = -24; x <= 24; x += 4)
        printf "g %d %d %d %.4f\n", x, y, w, rt_g(x, y, w)
  for(y = 14; y >= -2; y -= 2)
    for(x = -8; x <= 8; x += 2)
      printf "c %d %d %.4f %.4f\n", x, y, rt_cost(x, y, 0, RT_BEAT), rt_cost(y + 6, x, RT_REACH, 0)
  printf "t %s %s %s\n", rt_hm(rt_g(RT_REACH, 0, 0)), rt_hm(rt_g(0, RT_BEAT, 0)), rt_hm(rt_g(22.5*sin(wx_rad(75)), 22.5*cos(wx_rad(75)), 0))
  printf "w %.1f %.1f\n", rt_width(RT_REACH, 0, RT_LANE), rt_width(0, RT_BEAT, RT_LANE)
  for(a = 0; a <= 1; a += 0.5)
    printf "a %.1f %s %s %s\n", a, rt_hm(rt_allin(a, RT_SHIFT)), rt_hm(rt_allin(a, 0)), rt_hm(rt_allin(a, -RT_SHIFT))
  for(i = 1; i <= RT_HZN; i++) printf "h %d %d %d\n", RT_HZ[3*i-2], RT_HZ[3*i-1], RT_HZ[3*i]
  for(i = 1; i <= RT_SCN; i++) printf "s %s %.2f %.0f\n", RT_SC[2*i-1], RT_SC[2*i], 20 * RT_SC[2*i]
  printf "s stream %.2f %.1f\n", RT_CUR, 2 * RT_CUR
  for(i = 1; i <= RT_KN; i++)
    printf "k %.1f %s %s %s\n", RT_K[i], rt_hm(rt_allin_k(1, RT_SHIFT, RT_K[i])), rt_hm(rt_allin_k(0.5, RT_SHIFT, RT_K[i])), rt_hm(rt_allin_k(0, RT_SHIFT, RT_K[i]))
  return 0
}

# ---------------------------------------------------------------------
#  The report
# ---------------------------------------------------------------------
function wx_say(s){ printf "  %s\n", s; return 0 }
function wx_why(s){ printf "  %s\n", cwd("   " s); return 0 }

function wx_report(logfile, lon, hours, pct,   n, i, j, dt, dp, dw, tide1, tide2, corr, k, b)
{
  if(hours!=24 && hours!=72) hours = 48
  n = wx_load(logfile)
  print ""
  printf "  %s\n", cw("WHAT THE LOG SAYS", C_ACC)
  hr()
  if(n < 2){
    wx_say("Not enough observations yet.")
    wx_why("Almost every rule here needs history, not a snapshot: a tendency")
    wx_why("is a rate, backing is a change, a front is a sequence. Log a few")
    wx_why("three-hourly entries and this page starts working.")
    print ""
    return 0
  }
  j = n
  #  the most recent earlier observation with a pressure, for the trend
  for(i=n-1; i>=1; i--) if(wx_has(WP[i]) && wx_has(WP[n])) break
  k = i

  # ---- pressure -----------------------------------------------------
  if(k>=1 && wx_has(WP[n]) && wx_has(WP[k])){
    dt = (wx_mins(WT[n]) - wx_mins(WT[k]))/60.0
    dp = WP[n] - WP[k]
    tide1 = wx_tide(WT[k], lon, WLAT[k]); tide2 = wx_tide(WT[n], lon, WLAT[n])
    corr = dp - (tide2 - tide1)
    wx_say(sprintf("Pressure %.1f, %+.1f hPa in %.1f hours.", WP[n], dp, dt))
    if(wx_tideok(lon, WLAT[k], WLAT[n])){
      wx_say(sprintf("Allowing for the daily atmospheric tide: %+.1f hPa.", corr))
      wx_why(sprintf("the tide alone accounts for %+.1f of that. It is semidiurnal,", tide2-tide1))
      wx_why("about 1.4 hPa in the tropics and much less in high latitudes,")
      wx_why("and in the tropics it falls 2-3 mb every afternoon in fine weather.")
    } else {
      corr = dp
      if(lon!=""){
        wx_say("The daily atmospheric tide is not allowed for: no latitude in the log.")
        wx_why("its size depends on where you are, 1.4 hPa near the equator and a")
        wx_why("quarter of that at 50 degrees. Log a deck entry with your position.")
      }
    }
    if(dt>0){
      b = wx_band(corr, dt)
      if(b=="falling fast")   wx_say(cw("That is a serious fall. Expect a deepening system and a rising wind.", C_WARN))
      else if(b=="falling")   wx_say("A definite fall. Something is coming.")
      else if(b=="rising")    wx_say("Rising. The gradient is easing or a ridge is building.")
      else                    wx_say("Near steady.")
      wx_why("a rate matters more than a level: 1000 hPa steady is a quiet day,")
      wx_why("1015 falling fast is not.")
    }
    wx_glass(lon, hours)
  } else {
    wx_say("No pressure trend - fewer than two entries carry a pressure.")
  }

  # ---- wind: backing or veering, and Buys Ballot --------------------
  if(k>=1 && wx_has(WDIR[n]) && wx_has(WDIR[k])){
    dw = wx_d180(WDIR[n] - WDIR[k])
    print ""
    if(dw > 10)       wx_say(sprintf("Wind has VEERED %d degrees, %03d to %03d.", int(dw+0.5), WDIR[k], WDIR[n]))
    else if(dw < -10) wx_say(sprintf("Wind has BACKED %d degrees, %03d to %03d.", int(-dw+0.5), WDIR[k], WDIR[n]))
    else              wx_say(sprintf("Wind steady in direction, about %03d.", WDIR[n]))
    #  WHAT A SHIFT TELLS YOU, WHICHEVER WAY THE STORM IS GOING (weather
    #  1.0.8; Larry, APO and APP, 17 November 2026).  Until then this said,
    #  in the north, "backing with a falling glass puts the centre to your
    #  north and closing", and in the south only "the sense of all of this
    #  reverses".  The first is true of a storm going WEST and false of
    #  one going east, which is what the veer lesson describes; Larry asked
    #  for the picture from above, and it showed the two were one rule with
    #  the storm going opposite ways.  Worked for all eight cases (each
    #  hemisphere, the storm going east or west, the boat north or south
    #  of its track): the low's bearing from a boat that stays put swings
    #  the same way whichever way the wind goes round the low, so on the
    #  left of the track the wind backs and on the right it veers, in both
    #  hemispheres.  tests/wx-check.awk works the eight again.
    if(dw > 10){
      wx_why("if the wind goes on veering, you are on the right of the storm's")
      wx_why("track, looking the way it is going: it passes north of you if it")
      wx_why("is going east, south of you if it is going west.")
    }
    if(dw < -10){
      wx_why("if the wind goes on backing, you are on the left of the storm's")
      wx_why("track, looking the way it is going: it passes south of you if it")
      wx_why("is going east, north of you if it is going west.")
    }
  }
  #  Buys Ballot
  if(wx_has(WDIR[n])){
    print ""
    wx_say(sprintf("Back to the wind: the low is between %03d and %03d from you.",
           wx_bblo(WDIR[n], wx_north(WLAT[n])), wx_bbhi(WDIR[n], wx_north(WLAT[n]))))
    wx_why("Buys Ballot. Stand with your back to the wind: in the northern")
    wx_why("hemisphere the low is on your left, in the southern, on your right,")
    wx_why("and up to 20 degrees forward of that arm, because the sea turns the")
    wx_why("wind on deck in toward the low.")
    #  the quarter it is heading into, when the log has a shift and a
    #  moving glass (APR)
    if(wx_course(wx_bblo(WDIR[n], wx_north(WLAT[n])), wx_bbhi(WDIR[n], wx_north(WLAT[n])), dw, b)){
      wx_say(sprintf("Its course is somewhere between %03d and %03d.", WXC_0, WXC_1))
      if(WXC_CLOSING) wx_say(sprintf("If it holds that, it passes to your %s.", wx_pt8(WXC_CPA)))
      else            wx_say("It is drawing away.")
      wx_why(sprintf("the wind has %s, so you are on the %s of its track; the glass", (WXC_LEFT ? "backed" : "veered"), (WXC_LEFT ? "left" : "right")))
      wx_why(sprintf("is %s, so it is %s. A low can deepen without", (WXC_CLOSING ? "falling" : "rising"), (WXC_CLOSING ? "closing" : "opening")))
      wx_why("moving, or fill where it lies: this is where to watch, not a fix.")
    }
  }

  # ---- fog -----------------------------------------------------------
  if(wx_has(WDEW[n]) && wx_has(WSEA[n])){
    print ""
    if(WDEW[n] >= WSEA[n] - 0.5){
      wx_say(cw("Fog is likely: the dew point is at or above the sea temperature.", C_WARN))
      wx_why("air moving over water colder than its own dew point condenses.")
    } else {
      wx_say(sprintf("Fog unlikely: dew point %.1f, sea %.1f, a margin of %.1f.",
             WDEW[n], WSEA[n], WSEA[n]-WDEW[n]))
    }
  }

  # ---- cloud base ----------------------------------------------------
  if(wx_has(WAIR[n]) && wx_has(WDEW[n])){
    print ""
    wx_say(sprintf("Cloud base about %d ft (%d m).",
           int((WAIR[n]-WDEW[n])*400), int((WAIR[n]-WDEW[n])*125)))
    wx_why("the spread closes at about 2.5 C per 1000 ft - a parcel cools at 3,")
    wx_why("its dew point falls at 0.5, and the difference is what counts. Not")
    wx_why("the lapse rate alone: that would put the base a sixth too low.")
  }

  # ---- the cloud sequence -------------------------------------------
  wx_cloud(logfile)

  # ---- visibility, which we also used to ask for and ignore ---------
  if(WVIS[n]>=0 && k>=1 && WVIS[k]>=0 && WVIS[n]!=WVIS[k]){
    print ""
    if(WVIS[n] < WVIS[k]){
      wx_say(sprintf("Visibility is closing in: code %d down to %d.", WVIS[k], WVIS[n]))
      wx_why("with a falling glass that is usually rain arriving ahead of a front;")
      wx_why("with the dew point near the sea temperature it is fog.")
    } else {
      wx_say(sprintf("Visibility improving: code %d up to %d.", WVIS[k], WVIS[n]))
    }
  }

  # ---- the sea against the wind (W09) --------------------------------
  wx_seasay(n, pct)

  # ---- swell, the earliest warning there is --------------------------
  if(wx_has(WSWP[n]) && WSWP[n] >= 12){
    print ""
    wx_say(cw(sprintf("A %d-second swell from %03d.", int(WSWP[n]), WSWD[n]), C_ACC))
    wx_why("long-period swell outruns the storm that made it. This can be the")
    wx_why("first news of a system, with a steady glass and a clear sky.")
  }
  hr()
  wx_say(cwd("This reasons only from what you logged. It is not a forecast:"))
  wx_say(cwd("no model, no chart, no GRIB. It is you, reading your own barometer."))
  print ""
  return 0
}

# ---------------------------------------------------------------------
#  The cloud sequence - the rule those three cloud codes are FOR.
#
#  A warm front announces itself hours ahead, in order: cirrus, then
#  cirrostratus thickening and lowering, then altostratus, then rain.
#  Reading it needs cloud TYPE over time, which is why the observation
#  asks for CL, CM and CH separately and why total cover cannot do it.
#
#  In the first build we asked for all three and never used them, which
#  is how you teach somebody to stop filling in a form.
# ---------------------------------------------------------------------
function wx_cloud(logfile,   n, i, j, hi, mid, lo, seq, prev){
  n = WN
  if(n<2) return 0
  print ""
  #  did high cloud appear and then middle cloud follow it?
  hi=0; mid=0; lo=0
  for(i=1;i<=n;i++){
    if(WCH[i]>0) hi=i
    if(WCM[i]>0 && i>=hi && hi>0) mid=i
    if(WCL[i]>=6 && mid>0 && i>=mid) lo=i
  }
  if(lo>0){
    printf "  %s\n", cw("The cloud has run the whole warm-front sequence: high, then", C_WARN)
    printf "  %s\n", cw("middle, and now low stratus. The front is on you or past.", C_WARN)
  } else if(mid>0 && mid>hi-1){
    printf "  %s\n", cw("Cirrus has thickened to middle cloud - the classic warm front", C_ACC)
    printf "  %s\n", cw("sequence, and it is well under way.", C_ACC)
    printf "  %s\n", cwd("   expect the glass to keep falling, the wind to back, and rain")
  } else if(hi>0 && WCH[n]>0){
    printf "  %s\n", "High cloud is in. On its own it means very little -"
    printf "  %s\n", "but if it thickens and lowers over the next watches, that is a"
    printf "  %s\n", "warm front announcing itself hours ahead."
  } else return 0
  printf "  %s\n", cwd("   cirrus -> cirrostratus -> altostratus -> nimbostratus and rain")
  return 1
}
