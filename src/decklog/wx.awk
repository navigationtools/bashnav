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
function wx_load(logfile,   i, n){
  WN=0
  lg_read(logfile, "")
  for(i=1;i<=LG_N;i++){
    if(!lg_at(i)) continue
    if(LG_TYPE!="nav" && LG_TYPE!="wx") continue
    #  merge records that share a timestamp: a nav entry and the wx
    #  entry taken with it are one observation
    if(WN>0 && WT[WN]==LG_TS) n=WN; else { WN++; n=WN; WT[n]=LG_TS
      WDIR[n]=-9999; WSPD[n]=-9999; WP[n]=-9999; WTEND[n]=""
      WAIR[n]=-9999; WDEW[n]=-9999; WSEA[n]=-9999; WCLD[n]=-9999
      WSWP[n]=-9999; WSWD[n]=-9999; WLAT[n]="" }
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
    if(LG["lat"]!="") WLAT[n]=LG["lat"]
  }
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

function wx_report(logfile, lon,   n, i, j, dt, dp, dw, tide1, tide2, corr, k, r3)
{
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
    if(lon!=""){
      wx_say(sprintf("Allowing for the daily atmospheric tide: %+.1f hPa.", corr))
      wx_why(sprintf("the tide alone accounts for %+.1f of that. It is semidiurnal,", tide2-tide1))
      wx_why("about 1.4 hPa in the tropics and much less in high latitudes,")
      wx_why("and in the tropics it falls 2-3 mb every afternoon in fine weather.")
    } else corr = dp
    if(dt>0){
      #  The Met Office's bands, as the weather tool's wx_band (deck log
      #  1.1.1, weather 1.0.13; Larry, TAVL): 3.6 hPa in three hours is
      #  their "quickly", 1.6 their plain rising or falling.  Were 3.0, 1.5.
      #  Graded on the 3-hour rate to a tenth, as the weather tool does.
      r3 = sprintf("%.1f", corr/dt*3.0) + 0
      if(r3 <= -3.6)      wx_say(cw("That is a serious fall. Expect a deepening system and a rising wind.", C_WARN))
      else if(r3 <= -1.6) wx_say("A definite fall. Something is coming.")
      else if(r3 >=  1.6) wx_say("Rising. The gradient is easing or a ridge is building.")
      else                           wx_say("Near steady.")
      wx_why("a rate matters more than a level: 1000 hPa steady is a quiet day,")
      wx_why("1015 falling fast is not.")
    }
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
