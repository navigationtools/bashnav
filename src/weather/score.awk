# =====================================================================
#  deck-log -- forecast, verify, score.
#
#  THE ORDER IS THE POINT.  The user's forecast is committed to the log
#  BEFORE the app shows any of its own reasoning.  Print the guess first
#  and the person has not forecast anything - they have read an answer
#  and agreed with it.  It feels like learning and is not.  Same bug as
#  the colregs lights quiz telling you the aspect and then asking for
#  it; house rule now: never tell before you ask.
#
#  AND THREE ARE SCORED, not one.  Scoring only the user would make this
#  an oracle and it is not one: every rule in it is a rule of thumb.
#  Scoring the rules too keeps it honest, teaches calibration, and lets
#  the user eventually win - which is the point, because a training tool
#  that cannot be outgrown is badly built.
#
#  The third is PERSISTENCE: "in twelve hours it will be much as it is
#  now."  It is the honest floor.  Hard to beat at short range, and a
#  forecast that does not beat it has shown no skill at all.  Standard
#  practice in operational meteorology, and free.
# =====================================================================

#  Error points, taken from the WxChallenge: weighted, continuous, low
#  score wins.  A near miss should score like a near miss, which one
#  right/wrong verdict per forecast cannot express.
function sc_pts(field, a, b,   d){
  if(a<=-9000 || b<=-9000) return -1          # not comparable
  if(field=="wdir"){ d = wx_d180(a-b); if(d<0) d=-d; return d * 0.1 }
  d = a-b; if(d<0) d=-d
  if(field=="wspd") return d * 0.5
  if(field=="mslp") return d * 1.0
  if(field=="sea")  return d * 2.0
  return d
}
function sc_label(f){
  if(f=="wdir") return "wind direction"
  if(f=="wspd") return "wind speed"
  if(f=="mslp") return "pressure"
  if(f=="sea")  return "sea state"
  return f
}
#  distinct short names: truncating the long ones gives "wind" twice,
#  which is a column of numbers nobody can read
function sc_short(f){
  if(f=="wdir") return "dir"
  if(f=="wspd") return "spd"
  if(f=="mslp") return "hPa"
  if(f=="sea")  return "sea"
  return f
}

#  A fully developed sea for a given wind, roughly.  Used only to turn a
#  forecast wind into a forecast sea state; it is a rule of thumb and is
#  scored like everything else.
function sc_sea(kt){
  if(kt<1)  return 0
  if(kt<7)  return 1
  if(kt<13) return 2
  if(kt<19) return 3
  if(kt<25) return 4
  if(kt<34) return 5
  if(kt<41) return 6
  if(kt<48) return 7
  if(kt<56) return 8
  return 9
}

# ---------------------------------------------------------------------
#  The two machine forecasters.
#
#  Both are deliberately simple and both are honest about it.  The whole
#  reason they are scored is that nobody, including whoever wrote them,
#  knows how good they are until a season of observations says so.
# ---------------------------------------------------------------------
function sc_persist(n){
  F_WDIR = WDIR[n]; F_WSPD = WSPD[n]; F_MSLP = WP[n]
  F_SEA  = (wx_has(WSPD[n]) ? sc_sea(WSPD[n]) : -9999)
  F_WHY  = "nothing changes"
  return 0
}
function sc_rules(n, k, hours, lon,   dt, dp, dw, rate, damp, p, w, d, tide1, tide2){
  F_WDIR=-9999; F_WSPD=-9999; F_MSLP=-9999; F_SEA=-9999; F_WHY=""
  if(k<1){ sc_persist(n); F_WHY="only one observation - nothing but persistence to offer"; return 0 }
  dt = (wx_mins(WT[n]) - wx_mins(WT[k]))/60.0
  if(dt<=0){ sc_persist(n); return 0 }
  #  a trend does not continue for ever: damp it
  damp = 0.7

  if(wx_has(WP[n]) && wx_has(WP[k])){
    dp = WP[n] - WP[k]
    if(wx_tideok(lon, WLAT[k], WLAT[n])){
      tide1 = wx_tide(WT[k], lon, WLAT[k]); tide2 = wx_tide(WT[n], lon, WLAT[n])
      dp = dp - (tide2 - tide1)
    }
    rate = dp/dt
    F_MSLP = WP[n] + rate*hours*damp
    F_WHY = sprintf("pressure trend %+.2f hPa/h, damped, carried %g h", rate, hours)
    #  a falling glass is a rising wind: the classic rule, crudely
    if(wx_has(WSPD[n])){
      w = WSPD[n] - rate*hours*2.0
      if(w<0) w=0
      F_WSPD = w
    }
  } else if(wx_has(WSPD[n])) F_WSPD = WSPD[n]

  if(wx_has(WDIR[n]) && wx_has(WDIR[k])){
    dw = wx_d180(WDIR[n]-WDIR[k])/dt
    d = WDIR[n] + dw*hours*damp
    while(d<0) d+=360
    while(d>=360) d-=360
    F_WDIR = d
    if(F_WHY!="") F_WHY = F_WHY sprintf("; turning %+.1f deg/h, damped", dw)
  } else F_WDIR = WDIR[n]

  if(wx_has(F_WSPD)) F_SEA = sc_sea(F_WSPD)
  return 0
}

#  Find the observation nearest a valid time, within a tolerance.
function sc_nearest(target, tolmin,   i, d, best, bd){
  best=0; bd=999999
  for(i=1;i<=WN;i++){
    d = wx_mins(WT[i]) - wx_mins(target); if(d<0) d=-d
    if(d<bd){ bd=d; best=i }
  }
  if(best==0 || bd>tolmin) return 0
  return best
}

# ---------------------------------------------------------------------
#  Verify and score.  Reads the fc records out of the log, finds the
#  observation each was made for, and scores every forecaster on every
#  field it offered.
# ---------------------------------------------------------------------
function sc_verify(logfile,   i, j, by, fo, o, f, p, nf, any, tot, cnt, fields, nfld){
  wx_load(logfile)
  nfld = split("wdir wspd mslp sea", fields, " ")
  for(i in TOT) delete TOT[i]
  for(i in CNT) delete CNT[i]
  for(i in FTOT) delete FTOT[i]
  for(i in FCNT) delete FCNT[i]
  VN=0
  lg_read(logfile, "fc")
  for(i=1;i<=LG_N;i++){
    if(!lg_at(i)) continue
    fo = LG["for"]; by = LG["by"]
    if(fo=="" || by=="") continue
    #  THE USER'S OWN FORECASTS WERE NEVER SCORED.  do_forecast writes
    #  by=user; this report's three names are "you rules persist", so
    #  TOT["user"] was accumulated and then never looked at -- the one
    #  column the whole learning loop exists for was silently missing,
    #  and "You are beating the rule set" could never fire.
    #
    #  Fixed by NORMALISING ON READ rather than by renaming the writer
    #  alone: the log is append-only, so every fc record already written
    #  says user and has to keep working for ever.  New records say you.
    if(by=="user") by="you"
    o = sc_nearest(fo, 180)
    if(o==0) continue                       # nothing observed yet
    VN++
    VBY[VN]=by; VFOR[VN]=fo; VMADE[VN]=LG_TS; VWHY[VN]=LG["why"]
    for(j=1;j<=nfld;j++){
      f = fields[j]
      if(LG[f]=="" || LG[f]=="-") continue
      if(f=="wdir") p = sc_pts(f, LG[f]+0, WDIR[o])
      else if(f=="wspd") p = sc_pts(f, LG[f]+0, WSPD[o])
      else if(f=="mslp") p = sc_pts(f, LG[f]+0, WP[o])
      else p = -1
      if(p<0) continue
      TOT[by] += p; CNT[by]++
      FTOT[by SUBSEP f] += p; FCNT[by SUBSEP f]++
      any=1
    }
  }
  return VN
}

function sc_report(logfile,   n, by, i, f, fields, nfld, j, names, nn){
  n = sc_verify(logfile)
  print ""
  printf "  %s\n", cw("THE SCORE", C_ACC)
  hr()
  if(n==0){
    printf "  %s\n", cwd("No forecast has reached its valid time yet, or no observation")
    printf "  %s\n", cwd("has been logged near one. Make a forecast, then log the")
    printf "  %s\n", cwd("observation it was for, and this page fills in.")
    print ""
    return 0
  }
  nn = split("you rules persist", names, " ")
  nfld = split("wdir wspd mslp", fields, " ")
  printf "  %-10s %8s  %s\n", "", "points", "per field, points per forecast"
  for(i=1;i<=nn;i++){
    by = names[i]
    if(!(by in CNT)) continue
    printf "  %-10s %8.1f ", by, TOT[by]
    for(j=1;j<=nfld;j++){
      f = fields[j]
      if((by SUBSEP f) in FCNT)
        printf "  %s %.1f", sc_short(f), FTOT[by SUBSEP f]/FCNT[by SUBSEP f]
    }
    print ""
  }
  hr()
  printf "  %s\n", cwd("Lower is better. Half a point per knot, one per millibar, a tenth")
  printf "  %s\n", cwd("per degree of wind direction - so a near miss scores like one.")
  print ""
  if(("persist" in CNT) && ("rules" in CNT)){
    if(TOT["rules"]/CNT["rules"] > TOT["persist"]/CNT["persist"])
      printf "  %s\n", cw("The rules are not beating persistence. That is the honest result", C_WARN)
    if(TOT["rules"]/CNT["rules"] > TOT["persist"]/CNT["persist"])
      printf "  %s\n", cw("so far, and it is worth knowing.", C_WARN)
  }
  if(("you" in CNT) && ("rules" in CNT)){
    if(TOT["you"]/CNT["you"] < TOT["rules"]/CNT["rules"])
      printf "  %s\n", cw("You are beating the rule set. Trust yourself over it here.", C_ACC)
  }
  print ""
  return n
}

#  Round a time forward to the next multiple of 3 hours, <hours> ahead.
#  Forecasts are made FOR a synoptic hour, so the observation that
#  verifies one is an entry somebody would have made anyway.
#
#  The first version of the inverse conversion below returned the year
#  4600 for a date in 2026.  Date arithmetic written from memory is a
#  reliable way to be confidently wrong, which is why there is now a
#  test that round-trips every day for forty years.
function sc_jdn(y, mo, d,   a, y2, m2){
  a = int((14-mo)/12); y2 = y + 4800 - a; m2 = mo + 12*a - 3
  return d + int((153*m2+2)/5) + 365*y2 + int(y2/4) - int(y2/100) + int(y2/400) - 32045
}
#  Fliegel and Van Flandern, the standard inverse.  Sets SC_Y/SC_M/SC_D.
function sc_civil(jd,   a, b, c, dd, e, m){
  a = jd + 32044
  b = int((4*a+3)/146097)
  c = a - int(146097*b/4)
  dd = int((4*c+3)/1461)
  e = c - int(1461*dd/4)
  m = int((5*e+2)/153)
  SC_D = e - int((153*m+2)/5) + 1
  SC_M = m + 3 - 12*int(m/10)
  SC_Y = 100*b + dd - 4800 + int(m/10)
  return 0
}
function sc_validtime(ts, hours,   y,mo,d,h,tot,jd,rh){
  y=substr(ts,1,4)+0; mo=substr(ts,6,2)+0; d=substr(ts,9,2)+0
  h=substr(ts,12,2)+0
  jd = sc_jdn(y, mo, d)
  tot = jd*24 + h + hours
  rh = tot % 3
  if(rh!=0) tot += (3-rh)
  jd = int(tot/24); h = tot - jd*24
  sc_civil(jd)
  return sprintf("%04d-%02d-%02dT%02d:00Z", SC_Y, SC_M, SC_D, h)
}
