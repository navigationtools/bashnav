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
#     3.0 hPa or more down   falling fast
#     1.5 or more down       falling
#     1.5 or more up         rising
#     otherwise              steady
# ---------------------------------------------------------------------
function wx_band(corr, dt){
  if(dt<=0) return "steady"
  if(corr <= -3.0*(dt/3.0)) return "falling fast"
  if(corr <= -1.5*(dt/3.0)) return "falling"
  if(corr >=  1.5*(dt/3.0)) return "rising"
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
    if(wx_north(WLAT[n])){
      if(dw > 10)       wx_why("northern hemisphere: veering with a rising glass usually means the")
      if(dw > 10)       wx_why("centre has passed to the north of you and the cold front is through.")
      if(dw < -10)      wx_why("northern hemisphere: backing with a falling glass puts the centre")
      if(dw < -10)      wx_why("to your north and closing. This is the one to take seriously.")
    } else {
      wx_why("southern hemisphere: the sense of all of this reverses.")
    }
  }
  #  Buys Ballot
  if(wx_has(WDIR[n])){
    print ""
    wx_say(sprintf("Back to the wind: the low is roughly %03d from you.",
           wx_bb(WDIR[n], wx_north(WLAT[n]))))
    wx_why("Buys Ballot. Stand with your back to the wind: in the northern")
    wx_why("hemisphere the low is on your left, in the southern, on your right.")
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
    wx_why("the lapse rate alone: that would put the base a fifth too low.")
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
