# =====================================================================
#  tides -- work.  The coastal-navigation calculators.
#
#    tides work twelfths   height at a time: twelfths, cosine, harmonic
#    tides work secondary  a secondary port from a standard port
#    tides work stream     a tidal-stream rate between neaps and springs
#    tides work atlas      which page of a tidal-stream atlas you are on
#    tides work cts        course to steer across a stream
#    tides work setdrift   set and drift, from a DR and a fix
#
#  Each one SHOWS ITS WORKING, step by step, because the point is
#  teaching: a navigator who has watched the arithmetic once can do it on
#  a chart with a pencil, and that is the skill.  The answer comes last.
#
#  Parameters arrive as one string, key=value pairs separated by |, in
#  -v wargs.  The names are a CONTRACT: the coastal navigation course
#  deep-links into the browser build with the same names in a URL, and
#  docs/web/tides/WORK.md is the authoritative list.  Do not rename one.
#
#  The browser port is docs/web/tides/work.js.  It produces the same
#  lines of working, character for character, and
#  docs/web/tests/tides-work.js holds it to that.  So every line of text
#  in this file has a twin there; change one and change the other.
#
#  Loaded after engine.awk, in the same payload.  The dispatch lives in
#  this file's own BEGIN block, so engine.awk can still be loaded on its
#  own - mawk resolves every called function at parse time, and an
#  engine that called into this file would not parse without it.
# =====================================================================

#  ---- lifted from src/colregs/contacts.awk -------------------------
#  The vector machinery the tracking party uses: the bearing of a
#  vector given its east and north parts, and an angle folded into
#  -180..180.  COPIED rather than shared, because build.sh packs each
#  tool's awk into that tool alone, and contacts.awk cannot be loaded
#  into tides: it calls colregs' engine (tb(), the plot, the yards
#  arithmetic), and mawk refuses a file whose callees are missing.  The
#  same two lines, the same names, so the lineage is plain.
function rbrg(x,y){ return nrm360(atan2d(x,y)) }
function sgn180(a){ a=nrm360(a); return (a>180)?a-360:a }

# ---------------------------------------------------------------------
#  Small helpers.  Every format here has a twin in work.js.
# ---------------------------------------------------------------------
function wk_err(s){ if(W_ERR=="") W_ERR=s; return 0 }
function wl(s){ WL[++WL_N]=s; return 0 }
function wk_has(k){ return (k in WA) && WA[k]!="" }
function wk_isnum(s){ return s ~ /^[-+]?([0-9]+[.]?[0-9]*|[.][0-9]+)$/ }
#  %.Nf with the sign of a zero taken away: -0.00 is not a quantity.
function wk_f(v,d,   s){ s=sprintf("%." d "f", v); if(s ~ /^-0[.]?0*$/) s=substr(s,2); return s }
function wk_fs(v,d,   s){ s=wk_f(v,d); if(substr(s,1,1)!="-") s="+" s; return s }
#  a number as it was typed, near enough: whole numbers without a point
#  a factor in a product: negative ones in brackets, so "x (-0.10)"
function wk_p(v,d){ if(v<0) return "(" wk_f(v,d) ")"; return wk_f(v,d) }
function wk_g(v,   s){ if(v==int(v)) return sprintf("%d", v); s=wk_f(v,2); sub(/0$/,"",s); return s }
#  a bearing to a tenth, 000.0 to 359.9, for the working; the answer
#  gives the whole degree you steer
function wk_d1(a,   s){ s=wk_f(nrm360(a),1); if(s=="360.0") s="0.0"; return wk_pad0(s,5) }
function wk_r2(x){ if(x<0) return -int(-x*100+0.5)/100; return int(x*100+0.5)/100 }
function wk_mod(x,m){ x = x - m*int(x/m); if(x<0) x+=m; return x }
function wk_deg(a,   r){ r=int(nrm360(a)+0.5); if(r>=360) r-=360; return sprintf("%03d", r) }
function wk_hhmm(m){ m=ffloor(m+0.5); m=wk_mod(m,1440); return sprintf("%02d:%02d", int(m/60), m%60) }
function wk_dur(m,   h){ m=int(fabs(m)+0.5); h=int(m/60)
  if(h>0) return sprintf("%d h %02d min", h, m%60); return sprintf("%d min", m) }
function wk_ew(v){ if(v<0) return wk_g(-v) " W"; return wk_g(v) " E" }
function wk_lat(x,   a,d,mi,hm){ hm=(x<0)?"S":"N"; a=fabs(x); d=int(a); mi=(a-d)*60
  if(mi>=59.95){ mi=0; d++ }
  return sprintf("%02d %s'%s", d, wk_pad0(wk_f(mi,1),4), hm) }
function wk_lon(x,   a,d,mi,hm){ hm=(x<0)?"W":"E"; a=fabs(x); d=int(a); mi=(a-d)*60
  if(mi>=59.95){ mi=0; d++ }
  return sprintf("%03d %s'%s", d, wk_pad0(wk_f(mi,1),4), hm) }
function wk_pad0(s,n){ while(length(s)<n) s="0" s; return s }
function wk_head(s){ wl(""); wl("  " cw(s, C_HDR)); wl("  ----------------------------------------------------------------------"); return 0 }
function wk_rule(){ wl("  ----------------------------------------------------------------------"); return 0 }

# ---------------------------------------------------------------------
#  Reading the parameters.  Strict, because a URL typed by a course
#  author is exactly where a typo hides: a key nobody reads is an error
#  rather than a silently ignored value.
# ---------------------------------------------------------------------
function wk_parse(s,   n,i,p,e,k){
  split("",WA); WK_N=0
  n=split(s,p,"|")
  for(i=1;i<=n;i++){
    if(p[i]=="") continue
    e=index(p[i],"=")
    if(e<2) return wk_err(sprintf("'%s' is not key=value", p[i]))
    k=substr(p[i],1,e-1)
    if(k !~ /^[a-z][a-z0-9]*$/) return wk_err(sprintf("'%s' is not a parameter name", k))
    if(!(k in WA)) WK[++WK_N]=k
    WA[k]=substr(p[i],e+1)
  }
  return 1
}
function wk_allow(name,list,   ok,n,i,a){
  n=split(list,a," "); split("",ok)
  for(i=1;i<=n;i++) ok[a[i]]=1
  ok["work"]=1; ok["lesson"]=1          # carried by every URL
  for(i=1;i<=WK_N;i++) if(!(WK[i] in ok))
    return wk_err(sprintf("%s does not take %s=", name, WK[i]))
  return 1
}
#  A number: def "" means required.  lo and hi are strings so the
#  message prints them as written.
function wk_num(k,def,lo,hi,what,   v){
  if(W_ERR!="") return 0
  if(!wk_has(k)){
    if(def=="") return wk_err(sprintf("%s= is needed (%s)", k, what))
    return def+0
  }
  v=WA[k]
  if(!wk_isnum(v)) return wk_err(sprintf("%s=%s is not a number", k, v))
  v=v+0
  if(v<lo+0 || v>hi+0) return wk_err(sprintf("%s=%s is out of range (%s to %s)", k, WA[k], lo, hi))
  return v
}
function wk_ang(k,def,what){ return nrm360(wk_num(k,def,"0","360",what)) }
#  HH:MM or HHMM, as minutes past midnight
function wk_hm(s,   h,m,c){
  c=index(s,":")
  if(s ~ /^[0-9][0-9]?:[0-9][0-9]$/){ h=substr(s,1,c-1)+0; m=substr(s,c+1)+0 }
  else if(s ~ /^[0-9][0-9][0-9][0-9]$/){ h=substr(s,1,2)+0; m=substr(s,3,2)+0 }
  else return -1
  if(h>23 || m>59) return -1
  return h*60+m
}
function wk_time(k,what,   v){
  if(W_ERR!="") return 0
  if(!wk_has(k)) return wk_err(sprintf("%s= is needed (%s, HH:MM)", k, what))
  v=wk_hm(WA[k])
  if(v<0) return wk_err(sprintf("%s=%s is not a time (HH:MM)", k, WA[k]))
  return v
}
#  lat,lon in decimal degrees; sets WP_LAT, WP_LON
function wk_pos(k,what,   p,n){
  if(W_ERR!="") return 0
  if(!wk_has(k)) return wk_err(sprintf("%s= is needed (%s, lat,lon)", k, what))
  n=split(WA[k],p,",")
  if(n!=2 || !wk_isnum(p[1]) || !wk_isnum(p[2]))
    return wk_err(sprintf("%s=%s is not a position (lat,lon in decimal degrees)", k, WA[k]))
  WP_LAT=p[1]+0; WP_LON=p[2]+0
  if(WP_LAT<-90 || WP_LAT>90 || WP_LON<-180 || WP_LON>180)
    return wk_err(sprintf("%s=%s is out of range (lat -90 to 90, lon -180 to 180)", k, WA[k]))
  return 1
}
#  YYYY-MM-DD, checked by a round trip so 2026-02-30 is refused
function wk_date(s,   y,m,d){
  if(s !~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/) return 0
  y=substr(s,1,4)+0; m=substr(s,6,2)+0; d=substr(s,9,2)+0
  if(m<1 || m>12 || d<1 || d>31) return 0
  jd2cal(jdate(y,m,d)+0.5)
  if(CAL_Y!=y || CAL_M!=m || CAL_D!=d) return 0
  WD_Y=y; WD_M=m; WD_D=d
  return 1
}
function wk_wind(lee,   w){
  if(W_ERR!="" || lee==0) return ""
  if(!wk_has("wind")) return wk_err("leeway needs wind=port or wind=stbd (the side the wind is on)")
  w=WA["wind"]
  if(w!="port" && w!="stbd") return wk_err(sprintf("wind=%s should be port or stbd", w))
  return w
}

# =====================================================================
#  The station-backed tools need a prediction.  Opens the station, works
#  out the date and time asked for (or now, in the station's own
#  standard time), and lists the turns over three days around it.
#
#  Times are STANDARD time at the station, as in a printed table.
# =====================================================================
function wk_station(   id,y,m,d,jdn,jl,i,n){
  if(W_ERR!="") return 0
  id = wk_has("station") ? WA["station"] : defstation
  if(id=="") return wk_err("station= is needed (a station id, e.g. ticon/dover-dov-gbr-bodc)")
  if(id !~ /^[A-Za-z0-9_.\/-]+$/) return wk_err(sprintf("station=%s is not a station id", id))
  jdn = -1
  if(nowdate!="" && wk_date(nowdate)){
    split(nowtime,NT_,":")
    jdn = jdate(WD_Y,WD_M,WD_D) + (NT_[1]+0)/24.0 + (NT_[2]+0)/1440.0
  }
  if(wk_has("date")){
    if(!wk_date(WA["date"])) return wk_err(sprintf("date=%s is not a date (YYYY-MM-DD)", WA["date"]))
  } else if(jdn<0) return wk_err("date= is needed (YYYY-MM-DD)")
  #  open on the date asked for, or today's UT date for now
  if(!wk_has("date")) wk_date(nowdate)
  if(!tide_open(SF, id, jdate(WD_Y,WD_M,WD_D)+0.5)) return wk_err(sprintf("station=%s: %s", id, TD_ERR))
  ST_TZOFF = TD_TZ
  if(!wk_has("date")){
    #  now, carried into the station's standard time
    jl = jdn + TD_TZ/1440.0
    jd2cal(jl); WD_Y=CAL_Y; WD_M=CAL_M; WD_D=CAL_D
  }
  if(wk_has("t")){
    WS_T = wk_hm(WA["t"])
    if(WS_T<0) return wk_err(sprintf("t=%s is not a time (HH:MM)", WA["t"]))
  } else if(jdn>=0){
    WS_T = ffloor(((jdn + TD_TZ/1440.0) - jdate(WD_Y,WD_M,WD_D))*1440 + 0.5)
    if(WS_T<0 || WS_T>=1440) return wk_err("t= is needed (HH:MM)")
  } else return wk_err("t= is needed (HH:MM)")
  WS_ID = id
  WS_DATE = sprintf("%04d-%02d-%02d", WD_Y, WD_M, WD_D)
  WS_JD0 = jdate(WD_Y,WD_M,WD_D)                      # local midnight, local frame
  WS_JDA = WS_JD0 - TD_TZ/1440.0                       # local midnight, in UT
  WS_JDT = WS_JDA + WS_T/1440.0
  n = tide_table(WS_JDA-1, WS_JDA+2)
  WT_N=0
  for(i=1;i<=n;i++){
    WT_N++
    WT_K[WT_N]=HL_K[i]
    WT_JD[WT_N]=HL_T[i]
    #  the turn as a table prints it: to the minute, to the centimetre
    WT_M[WT_N]=ffloor((HL_T[i]-WS_JDA)*1440 + 0.5)
    WT_H[WT_N]=wk_r2(HL_H[i])
  }
  tide_curve_prep(WS_JDA-1, WS_JDA+2)
  return 1
}
function wk_sthead(   k){
  k = TD_NAME
  if(TD_REGION!="") k = k ", " TD_REGION
  wl("  " cw(k, C_ACC) "   " cwd(WS_ID))
  wl("  " cwd(sprintf("%s at %s, the station's standard time (no summer time)", WS_DATE, wk_hhmm(WS_T))))
  if(TD_KIND=="S") wl("  " cwd(sprintf("a secondary port, worked from %s", TD_REFNAME)))
  return 0
}
function wk_kname(k){ if(k=="H") return "HW"; return "LW" }

# =====================================================================
#  1.  THE RULE OF TWELFTHS, AND THE COSINE CURVE
# =====================================================================
#  t1 < t <= t2 in minutes, h1/h2 the heights, k1/k2 the kinds.
function wk_12core(t1,h1,k1,t2,h2,k2,t,   D,R,i,cum,stp,x,ix,fr,c12,h12,fa,A,ca,hc,sg,hh,tw){
  D = t2-t1; R = h2-h1; WK_K1=k1; WK_K2=k2
  split("1 2 3 3 2 1",stp," "); split("0 1 3 6 9 11 12",cum," ")
  sg = (R>=0) ? "+" : "-"
  if(k1=="L") tw="a rising tide"; else tw="a falling tide"
  wl(sprintf("  %s %s  %s m   to   %s %s  %s m      %s",
     wk_kname(k1), wk_hhmm(t1), wk_f(h1,2), wk_kname(k2), wk_hhmm(t2), wk_f(h2,2), tw))
  wl(sprintf("  range %s m over %s, so a tidal hour here is %s",
     wk_f(fabs(R),2), wk_dur(D), wk_dur(D/6)))
  x = (t-t1)/(D/6.0)
  wl(sprintf("  height wanted at %s: %s after %s = %s tidal hours",
     wk_hhmm(t), wk_dur(t-t1), wk_kname(k1), wk_f(x,2)))
  if(D<240 || D>480) wl("  " cwd(sprintf("the rule assumes about six hours from turn to turn; this one is %s", wk_dur(D))))
  wl("")
  wl("  1  The twelfths, tidal hour by tidal hour")
  wl("     hour  time     this hour        so far    height")
  wl(sprintf("       0   %s        -           0/12   %6s m", wk_hhmm(t1), wk_f(h1,2)))
  for(i=1;i<=6;i++){
    hh = h1 + R*cum[i+1]/12.0
    wl(sprintf("       %d   %s    %d/12  %s%s m   %2d/12   %6s m", i, wk_hhmm(t1+i*D/6.0),
       stp[i], sg, wk_f(fabs(R)*stp[i]/12.0,2), cum[i+1], wk_f(hh,2)))
  }
  ix = int(x); if(ix>5) ix=5
  fr = x-ix
  c12 = cum[ix+1] + fr*stp[ix+1]
  h12 = h1 + R*c12/12.0
  wl("")
  wl(sprintf("  2  At %s: %d tidal hours give %d/12, and %s of hour %d's %d/12 adds %s/12",
     wk_hhmm(t), ix, cum[ix+1], wk_f(fr,2), ix+1, stp[ix+1], wk_f(fr*stp[ix+1],2)))
  wl(sprintf("     %s/12 of %s m = %s m, so h = %s %s %s = %s m",
     wk_f(c12,2), wk_f(fabs(R),2), wk_f(fabs(R)*c12/12.0,2), wk_f(h1,2), sg,
     wk_f(fabs(R)*c12/12.0,2), cw(wk_f(h12,2), C_ACC)))
  fa = (t-t1)/D
  A = 180.0*(fa+1)
  ca = cosd(A)
  hc = h1 + R*(ca+1)/2.0
  wl("")
  wl("  3  The cosine curve:  h = h1 + (h2 - h1) x (cos A + 1)/2")
  wl("     where A = 180 x (fraction of the time from turn to turn + 1) degrees")
  wl(sprintf("     fraction of the way from %s to %s = %s / %s = %s",
     wk_kname(k1), wk_kname(k2), wk_dur(t-t1), wk_dur(D), wk_f(fa,3)))
  wl(sprintf("     A = %s deg, cos A = %s", wk_f(A,1), wk_f(ca,3)))
  wl(sprintf("     h = %s + (%s) x (%s + 1)/2 = %s m",
     wk_f(h1,2), wk_f(R,2), wk_f(ca,3), cw(wk_f(hc,2), C_ACC)))
  wl("")
  wl(sprintf("  4  Twelfths minus cosine: %s m.  The twelfths are a staircase laid over", wk_fs(h12-hc,2)))
  wl("     the cosine: they agree at the turns, at half tide and at hours 2 and 4,")
  wl("     and differ most an hour either side of a turn.")
  WR["t12"]=h12; WR["tcos"]=hc; WR["range"]=fabs(R); WR["dur"]=D
  WR["kind"]=(k1=="L")?"rise":"fall"
  WF_T1=t1; WF_T2=t2; WF_H1=h1; WF_H2=h2; WF_T=t; WF_12=h12; WF_C=hc
  return 1
}
function wk_twelfths(   t1,t2,tt,h1,h2,k1,k2,d,lwm,hwm,lwh,hwh,manual,i,ip,inx,hv){
  manual = wk_has("lw") || wk_has("hw") || wk_has("lwh") || wk_has("hwh")
  if(manual){
    wk_allow("twelfths", "lw lwh hw hwh t")
    lwm=wk_time("lw","time of low water"); lwh=wk_num("lwh","","-20","30","height of low water, m")
    hwm=wk_time("hw","time of high water"); hwh=wk_num("hwh","","-20","30","height of high water, m")
    tt=wk_time("t","the time you want the height for")
    if(W_ERR!="") return 0
    if(hwh<=lwh) return wk_err("hwh= must be higher than lwh=")
    if(lwm==hwm) return wk_err("lw= and hw= are the same time")
    #  which way round: the turn-to-turn interval is the one under twelve
    #  hours, so a tide that crosses midnight works and HW-first is a
    #  falling tide.
    d = wk_mod(hwm-lwm,1440)
    if(d<=720){ t1=lwm; h1=lwh; t2=lwm+d; h2=hwh; k1="L"; k2="H" }
    else      { t1=hwm; h1=hwh; t2=hwm+(1440-d); h2=lwh; k1="H"; k2="L" }
    tt = t1 + wk_mod(tt-t1,1440)
    if(tt>t2) return wk_err(sprintf("t=%s is not between the two turns (%s and %s)", WA["t"], wk_hhmm(t1), wk_hhmm(t2)))
    wk_head("RULE OF TWELFTHS, AND THE COSINE CURVE")
    wk_12core(t1,h1,k1,t2,h2,k2,tt)
    wl("@@FIG")
    wl(sprintf("  ANSWER   twelfths %s m    cosine %s m", wk_f(WR["t12"],2), wk_f(WR["tcos"],2)))
    wk_rule()
    return 1
  }
  wk_allow("twelfths", "station date t")
  if(!wk_station()) return 0
  #  the turns either side of t, as the table prints them
  ip=0; inx=0
  for(i=1;i<=WT_N;i++){
    if(WT_JD[i]<=WS_JDT) ip=i
    else if(!inx) inx=i
  }
  if(!ip || !inx) return wk_err("no turn of the tide either side of that time")
  if(WT_K[ip]==WT_K[inx]) return wk_err(sprintf("the turns either side of %s are both %s: no twelfths between them", wk_hhmm(WS_T), wk_kname(WT_K[ip])))
  hv = tide_height(WS_JDT)
  wk_head("RULE OF TWELFTHS, THE COSINE CURVE AND THE HARMONIC PREDICTION")
  wk_sthead()
  wl(sprintf("  from the prediction, the turns either side of %s:", wk_hhmm(WS_T)))
  wl("")
  tt = WS_T
  if(tt<WT_M[ip]) tt=WT_M[ip]
  if(tt>WT_M[inx]) tt=WT_M[inx]
  wk_12core(WT_M[ip],WT_H[ip],WT_K[ip],WT_M[inx],WT_H[inx],WT_K[inx],tt)
  wl("")
  wl(sprintf("  5  The harmonic prediction itself at %s: %s m", wk_hhmm(WS_T), cw(wk_f(hv,2), C_ACC)))
  wl(sprintf("     twelfths minus harmonic %s m, cosine minus harmonic %s m",
     wk_fs(WR["t12"]-hv,2), wk_fs(WR["tcos"]-hv,2)))
  if(TD_KIND=="S"){
    wl("     " cwd("At a secondary port the curve between the turns is itself a half"))
    wl("     " cwd("cosine, so those two agree but for the table's rounding."))
  } else {
    wl("     " cwd("The harmonic curve is the sum of every constituent, so it carries the"))
    wl("     " cwd("shape a real tide has: a long stand, a fast flood, a double high water."))
  }
  WR["tharm"]=hv; WF_HV=hv
  wl("@@FIG")
  wl(sprintf("  ANSWER   twelfths %s m    cosine %s m    harmonic %s m",
     wk_f(WR["t12"],2), wk_f(WR["tcos"],2), wk_f(hv,2)))
  wk_rule()
  return 1
}
#  The figure: the three ways of filling in between the turns.
function wk_fig12(   w,h,i,x,tt,v,lo,hi,j,cc,ix,fr,c12,cum,stp,R){
  w=61; h=13
  split("1 2 3 3 2 1",stp," "); split("0 1 3 6 9 11 12",cum," ")
  R = WF_H2-WF_H1
  lo=WF_H1; hi=WF_H2; if(lo>hi){ lo=WF_H2; hi=WF_H1 }
  if(WF_HV!=""){ if(WF_HV<lo) lo=WF_HV; if(WF_HV>hi) hi=WF_HV }
  if(hi-lo<0.2){ hi+=0.1; lo-=0.1 }
  gclear(w,h)
  for(i=0;i<w;i++){
    tt = WF_T1 + (WF_T2-WF_T1)*i/(w-1.0)
    x = (tt-WF_T1)/((WF_T2-WF_T1)/6.0); ix=int(x); if(ix>5) ix=5
    fr = x-ix; c12 = cum[ix+1] + fr*stp[ix+1]
    v = WF_H1 + R*(cosd(180.0*((tt-WF_T1)/(WF_T2-WF_T1)+1))+1)/2.0
    gputwc((h-1)-(v-lo)/(hi-lo)*(h-1), i, ".", C_DIM)
    v = WF_H1 + R*c12/12.0
    gputc((h-1)-(v-lo)/(hi-lo)*(h-1), i, "#", "")
    if(WF_HV!=""){
      v = tide_height(WS_JDA + tt/1440.0)
      gputc((h-1)-(v-lo)/(hi-lo)*(h-1), i, "h", C_ACC)
    }
  }
  cc = (WF_T-WF_T1)/(WF_T2-WF_T1)*(w-1)
  for(j=0;j<h;j++) gputwc(j, cc, "|", C_HDR)
  gputc((h-1)-(WF_12-lo)/(hi-lo)*(h-1), cc, "@", C_HDR)
  print ""
  gshow()
  printf "  %s\n", cwd(sprintf("%s %s on the left, %s %s on the right; %s m at the top, %s m at the foot",
     wk_kname(WK_K1), wk_hhmm(WF_T1), wk_kname(WK_K2), wk_hhmm(WF_T2), wk_f(hi,2), wk_f(lo,2)))
  if(WF_HV!="") printf "  %s\n", cwd("# twelfths   . cosine   h harmonic   | the time asked   @ the twelfths answer")
  else          printf "  %s\n", cwd("# twelfths   . cosine   | the time asked   @ the twelfths answer")
  return 0
}

# =====================================================================
#  2.  A SECONDARY PORT
#
#  The almanac gives the time differences at two standard-port times,
#  0000 and 0600 say, and the same again twelve hours later.  So times
#  are taken modulo twelve hours and the difference is interpolated
#  round that circle; heights interpolate between neaps and springs by
#  the standard port's height, which is the RYA method.
# =====================================================================
#  linear interpolation round a 12-hour circle: nodes a (diff d1) and b
#  (diff d2), all in minutes
function wk_cyc(x,a,d1,b,d2,   L,p){
  x=wk_mod(x,720); a=wk_mod(a,720); b=wk_mod(b,720)
  L=wk_mod(b-a,720); p=wk_mod(x-a,720)
  if(p<=L){ WC_F=p/L; WC_A=a; WC_B=b; WC_DA=d1; WC_DB=d2; WC_P=p; WC_L=L; return d1+WC_F*(d2-d1) }
  WC_F=(p-L)/(720-L); WC_A=b; WC_B=a; WC_DA=d2; WC_DB=d1; WC_P=p-L; WC_L=720-L
  return d2+WC_F*(d1-d2)
}
function wk_hm12(m){ m=wk_mod(m,720); return wk_hhmm(m) " and " wk_hhmm(m+720) }
function wk_secpart(K,n,tm,hh,ta,da,tb,db,ms,mn,ds,dn,   td,tdr,f,dd,lab,sl,nl,st,ht){
  if(K=="H"){ lab="High"; sl="MHWS"; nl="MHWN" } else { lab="Low"; sl="MLWS"; nl="MLWN" }
  wl("")
  wl(sprintf("  %d  %s water time difference", n, lab))
  wl(sprintf("     the almanac gives %s min at %s, %s min at %s",
     wk_fs(da,0), wk_hm12(ta), wk_fs(db,0), wk_hm12(tb)))
  td = wk_cyc(tm,ta,da,tb,db)
  tdr = ffloor(td+0.5)
  #  the two almanac times shown on the same half of the day as the turn
  wl(sprintf("     standard port %s %s lies between %s (%s) and %s (%s):",
     wk_kname(K), wk_hhmm(tm), wk_hhmm(tm-WC_P), wk_fs(WC_DA,0), wk_hhmm(tm-WC_P+WC_L), wk_fs(WC_DB,0)))
  wl(sprintf("     %s of %s = %s of the way", wk_dur(WC_P), wk_dur(WC_L), wk_f(WC_F,2)))
  wl(sprintf("     difference = %s + %s x %s = %s min, call it %s",
     wk_fs(WC_DA,0), wk_f(WC_F,2), wk_p(WC_DB-WC_DA,0), wk_fs(td,1), wk_fs(tdr,0)))
  st = tm + tdr
  wl(sprintf("     secondary %s = %s %s %d min = %s", wk_kname(K), wk_hhmm(tm),
     (tdr<0)?"-":"+", fabs(tdr), cw(wk_hhmm(st), C_ACC)))
  wl("")
  wl(sprintf("  %d  %s water height difference", n+1, lab))
  f = (hh-mn)/(ms-mn)
  wl(sprintf("     %s m is %s of the way from %s %s to %s %s",
     wk_f(hh,2), wk_f(f,2), nl, wk_f(mn,2), sl, wk_f(ms,2)))
  if(f<0) wl("     " cw(sprintf("below %s: the difference is EXTRAPOLATED beyond the almanac's range", nl), C_ACC))
  if(f>1) wl("     " cw(sprintf("beyond %s: the difference is EXTRAPOLATED beyond the almanac's range", sl), C_ACC))
  dd = dn + f*(ds-dn)
  wl(sprintf("     difference = %s + %s x %s = %s m",
     wk_fs(dn,2), wk_f(f,2), wk_p(ds-dn,2), wk_fs(dd,2)))
  ht = hh + dd
  wl(sprintf("     secondary %s height = %s %s %s = %s m", wk_kname(K), wk_f(hh,2),
     (dd<0)?"-":"+", wk_f(fabs(dd),2), cw(wk_f(ht,2), C_ACC)))
  WR[K "time"]=wk_mod(st,1440); WR[K "tdiff"]=td; WR[K "hdiff"]=dd; WR[K "height"]=ht
  WR[K "f"]=f; WR[K "x"]=(f<0 || f>1)
  return 1
}
function wk_secondary(   doh,dol,hw,hwh,lw,lwh,ms,mn,ln,ls,ds,dn,dln,dls,a1,a2,b1,b2,c1,c2,e1,e2,ans){
  wk_allow("secondary", "hw hwh lw lwh mhws mhwn mlwn mlws dhws dhwn dlwn dlws thw1 tdhw1 thw2 tdhw2 tlw1 tdlw1 tlw2 tdlw2")
  doh = wk_has("hw") || wk_has("hwh")
  dol = wk_has("lw") || wk_has("lwh")
  if(W_ERR!="") return 0
  if(!doh && !dol) return wk_err("give the standard port's hw= and hwh=, or lw= and lwh=, or both")
  if(doh){
    hw=wk_time("hw","standard port high water"); hwh=wk_num("hwh","","-20","30","standard port HW height, m")
    ms=wk_num("mhws","","-20","30","standard port MHWS, m"); mn=wk_num("mhwn","","-20","30","standard port MHWN, m")
    ds=wk_num("dhws","","-10","10","secondary height difference at MHWS, m"); dn=wk_num("dhwn","","-10","10","height difference at MHWN, m")
    a1=wk_time("thw1","first standard-port HW time in the almanac"); a2=wk_num("tdhw1","","-720","720","time difference there, min")
    b1=wk_time("thw2","second standard-port HW time"); b2=wk_num("tdhw2","","-720","720","time difference there, min")
    if(W_ERR!="") return 0
    if(ms==mn) return wk_err("mhws= and mhwn= are the same, so there is nothing to interpolate between")
    if(wk_mod(a1-b1,720)==0) return wk_err("thw1= and thw2= are the same time (modulo 12 hours)")
  }
  if(dol){
    lw=wk_time("lw","standard port low water"); lwh=wk_num("lwh","","-20","30","standard port LW height, m")
    ln=wk_num("mlwn","","-20","30","standard port MLWN, m"); ls=wk_num("mlws","","-20","30","standard port MLWS, m")
    dln=wk_num("dlwn","","-10","10","height difference at MLWN, m"); dls=wk_num("dlws","","-10","10","height difference at MLWS, m")
    c1=wk_time("tlw1","first standard-port LW time in the almanac"); c2=wk_num("tdlw1","","-720","720","time difference there, min")
    e1=wk_time("tlw2","second standard-port LW time"); e2=wk_num("tdlw2","","-720","720","time difference there, min")
    if(W_ERR!="") return 0
    if(ln==ls) return wk_err("mlwn= and mlws= are the same, so there is nothing to interpolate between")
    if(wk_mod(c1-e1,720)==0) return wk_err("tlw1= and tlw2= are the same time (modulo 12 hours)")
  }
  wk_head("SECONDARY PORT, FROM A STANDARD PORT")
  if(doh) wl(sprintf("  standard port HW %s  %s m      MHWS %s  MHWN %s", wk_hhmm(hw), wk_f(hwh,2), wk_f(ms,2), wk_f(mn,2)))
  if(dol) wl(sprintf("  standard port LW %s  %s m      MLWN %s  MLWS %s", wk_hhmm(lw), wk_f(lwh,2), wk_f(ln,2), wk_f(ls,2)))
  wl("  " cwd("differences interpolate linearly: times by the standard port's time,"))
  wl("  " cwd("heights by the standard port's height between neaps and springs"))
  if(doh) wk_secpart("H",1,hw,hwh,a1,a2,b1,b2,ms,mn,ds,dn)
  if(dol) wk_secpart("L",doh?3:1,lw,lwh,c1,c2,e1,e2,ls,ln,dls,dln)
  wl("")
  ans="  ANSWER  "
  if(doh) ans = ans sprintf(" secondary HW %s  %s m", wk_hhmm(WR["Htime"]), wk_f(WR["Hheight"],2))
  if(doh && dol) ans = ans "   "
  if(dol) ans = ans sprintf(" LW %s  %s m", wk_hhmm(WR["Ltime"]), wk_f(WR["Lheight"],2))
  wl(ans)
  wk_rule()
  return 1
}

# =====================================================================
#  3.  A TIDAL STREAM RATE BETWEEN NEAPS AND SPRINGS
#
#  The atlas gives two rates per arrow, the spring rate and the neap
#  rate; the day's rate is between them in proportion to the day's range
#  at the reference port.  Outside the two mean ranges the line is
#  carried on, and the answer says so: nothing promises the stream keeps
#  to a straight line beyond springs.
# =====================================================================
function wk_stream(   spr,nps,rg,sp,np,f,rate,clamp){
  wk_allow("stream", "spr nps range sprange nprange")
  spr=wk_num("spr","","0","15","the atlas spring rate, kn"); nps=wk_num("nps","","0","15","the atlas neap rate, kn")
  rg=wk_num("range","","0","20","today's range at the reference port, m")
  sp=wk_num("sprange","","0","20","mean spring range at the reference port, m")
  np=wk_num("nprange","","0","20","mean neap range at the reference port, m")
  if(W_ERR!="") return 0
  if(sp<=np) return wk_err("sprange= must be larger than nprange=")
  wk_head("TIDAL STREAM RATE, BY THE RANGE")
  wl(sprintf("  1  The atlas: %s kn at springs, %s kn at neaps", wk_f(spr,1), wk_f(nps,1)))
  if(spr<nps) wl("     " cwd("the spring rate is normally the larger: check the two figures"))
  wl(sprintf("  2  The reference port: today's range %s m", wk_f(rg,2)))
  wl(sprintf("     its mean ranges: springs %s m, neaps %s m", wk_f(sp,2), wk_f(np,2)))
  f = (rg-np)/(sp-np)
  wl(sprintf("  3  How far from neaps to springs: (%s - %s) / (%s - %s) = %s",
     wk_f(rg,2), wk_f(np,2), wk_f(sp,2), wk_f(np,2), wk_f(f,2)))
  if(f>1) wl("     " cw("beyond springs: the rate is EXTRAPOLATED past the spring figure", C_ACC))
  if(f<0) wl("     " cw("below neaps: the rate is EXTRAPOLATED past the neap figure", C_ACC))
  rate = nps + f*(spr-nps); clamp=0
  wl(sprintf("  4  Rate = %s + %s x (%s - %s) = %s kn",
     wk_f(nps,2), wk_f(f,2), wk_f(spr,2), wk_f(nps,2), wk_f(rate,2)))
  if(rate<0){ rate=0; clamp=1; wl("     " cw("a rate below nothing is no rate: taken as 0.0 kn", C_ACC)) }
  WR["rate"]=rate; WR["f"]=f; WR["x"]=(f<0 || f>1); WR["clamp"]=clamp
  WF_SPR=spr; WF_NPS=nps; WF_RG=rg; WF_SP=sp; WF_NP=np; WF_RATE=rate
  wl("@@FIG")
  wl(sprintf("  ANSWER   %s kn%s", wk_f(rate,1), (f<0 || f>1) ? "   (extrapolated)" : ""))
  wk_rule()
  return 1
}
#  rate against range: the line through the neap and spring points
function wk_figstream(   w,h,i,x0,x1,y1,x,y,r,c){
  w=49; h=11
  x0=WF_NP; if(WF_RG<x0) x0=WF_RG
  x1=WF_SP; if(WF_RG>x1) x1=WF_RG
  r=(x1-x0)*0.1; x0-=r; x1+=r
  if(x0<0) x0=0
  y1=WF_SPR; if(WF_NPS>y1) y1=WF_NPS
  if(WF_RATE>y1) y1=WF_RATE
  y1 = y1*1.15 + 0.1
  gclear(w,h)
  for(i=0;i<w;i++){
    x = x0+(x1-x0)*i/(w-1.0)
    y = WF_NPS + (x-WF_NP)/(WF_SP-WF_NP)*(WF_SPR-WF_NPS)
    if(y>=0) gputwc((h-1)-y/y1*(h-1), i, ".", C_DIM)
  }
  gputc((h-1)-WF_NPS/y1*(h-1), (WF_NP-x0)/(x1-x0)*(w-1), "N", C_ACC)
  gputc((h-1)-WF_SPR/y1*(h-1), (WF_SP-x0)/(x1-x0)*(w-1), "S", C_ACC)
  c = (WF_RG-x0)/(x1-x0)*(w-1)
  for(i=0;i<h;i++) gputwc(i, c, "|", C_HDR)
  gputc((h-1)-WF_RATE/y1*(h-1), c, "@", C_HDR)
  print ""
  gshow()
  printf "  %s\n", cwd(sprintf("range %s m on the left to %s m on the right; 0 to %s kn up", wk_f(x0,1), wk_f(x1,1), wk_f(y1,1)))
  printf "  %s\n", cwd("N neaps   S springs   | today's range   @ today's rate")
  return 0
}

# =====================================================================
#  4.  WHICH PAGE OF THE TIDAL STREAM ATLAS
#
#  An atlas has a page for each hour from HW-6 to HW+6 at its standard
#  port.  The page for HW+2 covers HW+1:30 to HW+2:30, so the time is
#  rounded to the nearest hour, and exactly half past goes to the later
#  page.  The day's range says where between the neap and spring rates
#  to read; the station's mean ranges come from M2 and S2, which is the
#  Admiralty definition of springs and neaps.
# =====================================================================
function wk_atlas(   i,ihw,best,dt,pg,lab,il,rg,iM2,iS2,iK1,iO1,aM2,aS2,aK1,aO1,ff,sp,np,f,gauge,pos,j,strip,cl){
  wk_allow("atlas", "station date t")
  if(!wk_station()) return 0
  ihw=0; best=1e9
  for(i=1;i<=WT_N;i++) if(WT_K[i]=="H" && fabs(WT_M[i]-WS_T)<best){ best=fabs(WT_M[i]-WS_T); ihw=i }
  if(!ihw) return wk_err("no high water near that time at this station")
  wk_head("WHICH PAGE OF THE TIDAL STREAM ATLAS")
  wk_sthead()
  dt = WS_T - WT_M[ihw]
  wl("")
  wl(sprintf("  1  The high water nearest %s: HW %s  %s m", wk_hhmm(WS_T), wk_hhmm(WT_M[ihw]), wk_f(WT_H[ihw],2)))
  if(dt<0) wl(sprintf("     %s is %s before it", wk_hhmm(WS_T), wk_dur(dt)))
  else if(dt>0) wl(sprintf("     %s is %s after it", wk_hhmm(WS_T), wk_dur(dt)))
  else wl(sprintf("     %s is high water", wk_hhmm(WS_T)))
  pg = ffloor((dt+30)/60.0)
  if(pg==0) lab="HW"; else lab=sprintf("HW %s", wk_fs(pg,0))
  wl("")
  wl("  2  Each page covers 30 minutes either side of its hour, and exactly half")
  wl(sprintf("     past goes to the later page: %s from HW is the page for %s",
     (dt<0) ? ("-" wk_dur(dt)) : ("+" wk_dur(dt)), cw(lab, C_ACC)))
  strip="     "
  for(j=-6;j<=6;j++){
    if(j==0) cl="HW"; else cl=wk_fs(j,0)
    if(j==pg) strip = strip "[" cl "]"
    else strip = strip " " cl " "
  }
  wl(strip)
  if(pg<-6 || pg>6) wl("     " cw("outside the atlas's thirteen pages: the tide here is not the twice-daily kind an atlas is drawn for", C_ACC))
  #  the range of THIS tide: the LW on the side of HW that t is on
  il=0
  if(dt<=0){ for(i=ihw-1;i>=1;i--) if(WT_K[i]=="L"){ il=i; break } }
  else     { for(i=ihw+1;i<=WT_N;i++) if(WT_K[i]=="L"){ il=i; break } }
  wl("")
  if(!il) return wk_err("no low water beside that high water to take a range from")
  rg = WT_H[ihw]-WT_H[il]
  wl(sprintf("  3  The range of the tide you are in: HW %s m - LW %s m (%s) = %s m",
     wk_f(WT_H[ihw],2), wk_f(WT_H[il],2), wk_hhmm(WT_M[il]), cw(wk_f(rg,2), C_ACC)))
  WR["page"]=pg; WR["dt"]=dt; WR["range"]=rg; WR["hw"]=WT_M[ihw]; WR["means"]=0
  wl("")
  if(TD_KIND=="S"){
    wl("  4  Mean ranges are not available here: a secondary port carries no")
    wl("     constants of its own.  Its standard port is " TD_REFNAME ",")
    wl("     " TD_REF)
    wl("@@FIG")
    wl(sprintf("  ANSWER   atlas page %s    range %s m", lab, wk_f(rg,2)))
    wk_rule()
    return 1
  }
  iM2=CIDX["M2"]; iS2=CIDX["S2"]; iK1=CIDX["K1"]; iO1=CIDX["O1"]
  aM2=0; aS2=0; aK1=0; aO1=0
  for(i=1;i<=ST_N;i++){
    if(ST_C[i]==iM2) aM2=ST_A[i]
    if(ST_C[i]==iS2) aS2=ST_A[i]
    if(ST_C[i]==iK1) aK1=ST_A[i]
    if(ST_C[i]==iO1) aO1=ST_A[i]
  }
  if(aM2+aS2<=0){
    wl("  4  Mean ranges are not available: this station has no M2 or S2.")
    wl("@@FIG")
    wl(sprintf("  ANSWER   atlas page %s    range %s m", lab, wk_f(rg,2)))
    wk_rule()
    return 1
  }
  ff = (aK1+aO1)/(aM2+aS2)
  if(ff>0.25){
    wl(sprintf("  4  Mean ranges are not available: the form factor (K1+O1)/(M2+S2) is %s,", wk_f(ff,2)))
    wl("     so the tide here is mixed or diurnal and its springs and neaps are not")
    wl("     set by M2 and S2.  The range above is the honest number.")
    wl("@@FIG")
    wl(sprintf("  ANSWER   atlas page %s    range %s m", lab, wk_f(rg,2)))
    wk_rule()
    return 1
  }
  sp = 2*(aM2+aS2); np = 2*(aM2-aS2)
  wl(sprintf("  4  Mean ranges from the constants: M2 %s m, S2 %s m (form factor %s)",
     wk_f(aM2,3), wk_f(aS2,3), wk_f(ff,2)))
  wl(sprintf("     springs 2 x (M2 + S2) = %s m, neaps 2 x (M2 - S2) = %s m", wk_f(sp,2), wk_f(np,2)))
  wl("     " cwd("the Admiralty definition; an almanac's figures can differ by a"))
  wl("     " cwd("decimetre where shallow-water tides matter - use them if you have them"))
  f = (rg-np)/(sp-np)
  wl(sprintf("     today's range sits (%s - %s) / (%s - %s) = %s",
     wk_f(rg,2), wk_f(np,2), wk_f(sp,2), wk_f(np,2), wk_f(f,2)))
  wl("     of the way from neaps to springs")
  gauge=""
  pos = int(f*20+0.5)
  for(j=0;j<=20;j++){ if(j==pos) gauge=gauge "*"; else gauge=gauge "-" }
  if(pos<0) gauge="<" substr(gauge,2)
  if(pos>20) gauge=substr(gauge,1,20) ">"
  wl("     neaps |" gauge "| springs")
  if(f<0) wl("     " cwd("below mean neaps"))
  if(f>1) wl("     " cwd("above mean springs"))
  WR["means"]=1; WR["sprange"]=sp; WR["nprange"]=np; WR["f"]=f
  wl("@@FIG")
  wl(sprintf("  ANSWER   atlas page %s    range %s m, %s of the way from neaps to springs",
     lab, wk_f(rg,2), wk_f(f,2)))
  wl("  " cwd("the rate on that page, with the atlas's two figures for spr= and nps=:"))
  wl("  " cwd(sprintf("  tides work stream spr=.. nps=.. range=%s sprange=%s nprange=%s",
     wk_f(rg,2), wk_f(sp,2), wk_f(np,2))))
  wk_rule()
  return 1
}

# =====================================================================
#  Vector figures.  x east, y north, in nautical miles, drawn at one
#  scale both ways - and a character cell is about twice as tall as it
#  is wide, so a row is two columns' worth of distance.
# =====================================================================
function wk_vfit(n,w,h,   i,x0,x1,y0,y1,sx,sy){
  x0=VX[1]; x1=VX[1]; y0=VY[1]; y1=VY[1]
  for(i=2;i<=n;i++){
    if(VX[i]<x0) x0=VX[i]
    if(VX[i]>x1) x1=VX[i]
    if(VY[i]<y0) y0=VY[i]
    if(VY[i]>y1) y1=VY[i]
  }
  if(x1-x0<1e-6){ x0-=0.5; x1+=0.5 }
  if(y1-y0<1e-6){ y0-=0.5; y1+=0.5 }
  sx=(w-5)/(x1-x0); sy=(h-3)*2/(y1-y0)
  VS=(sx<sy)?sx:sy
  VC0 = (w-1)/2.0 - (x0+x1)/2*VS
  VR0 = (h-1)/2.0 + (y0+y1)/2*VS/2
  gclear(w,h)
  return 0
}
function wk_vc(x){ return VC0 + x*VS }
function wk_vr(y){ return VR0 - y*VS/2 }
function wk_vseg(a,b,ch,col,   n,i,f){
  n = int(sqrt((wk_vc(VX[b])-wk_vc(VX[a]))^2 + (wk_vr(VY[b])-wk_vr(VY[a]))^2)*2)+2
  for(i=0;i<=n;i++){ f=i/n
    gputwc(wk_vr(VY[a]+(VY[b]-VY[a])*f), wk_vc(VX[a]+(VX[b]-VX[a])*f), ch, col) }
  return 0
}
function wk_vlab(a,ch){ gputc(wk_vr(VY[a]), wk_vc(VX[a]), ch, C_ACC); return 0 }

# =====================================================================
#  5.  COURSE TO STEER
#
#  Over several hours the stream vectors are added and the triangle is
#  solved ONCE, which is how it is taught: lay the whole tide off from
#  the start, swing the distance run through the water from its end onto
#  the track, and read the course.  Leeway is then applied INTO the
#  wind, and variation and deviation turn true into compass.
# =====================================================================
function wk_cts(   T,V,ns,ps,i,q,s,r,tx,ty,set,drift,n,W,c,a,x,H,MG,sog,lee,wind,hd,var,dev,tr,mg,cc,dist,tm,ans){
  wk_allow("cts", "track stw streams leeway wind var dev dist")
  T=wk_ang("track","","the track you want to make good, deg true")
  V=wk_num("stw","","0","40","boat speed through the water, kn")
  if(W_ERR!="") return 0
  if(V<=0) return wk_err("stw= must be more than 0")
  if(!wk_has("streams")) return wk_err("streams= is needed (set:rate for each hour, e.g. 135:1.5,150:2.0)")
  ns=split(WA["streams"],ps,",")
  if(ns<1 || ns>24) return wk_err("streams= takes 1 to 24 set:rate pairs, one per hour")
  for(i=1;i<=ns;i++){
    if(split(ps[i],q,":")!=2 || !wk_isnum(q[1]) || !wk_isnum(q[2]))
      return wk_err(sprintf("streams= pair %d '%s' is not set:rate", i, ps[i]))
    if(q[1]+0<0 || q[1]+0>360 || q[2]+0<0 || q[2]+0>15)
      return wk_err(sprintf("streams= pair %d '%s' is out of range (set 0 to 360, rate 0 to 15)", i, ps[i]))
    WS_S[i]=nrm360(q[1]+0); WS_R[i]=q[2]+0
  }
  lee=wk_num("leeway","0","0","45","leeway, deg")
  wind=wk_wind(lee)
  var=wk_num("var","0","-90","90","variation, deg, east +")
  dev=wk_num("dev","0","-30","30","deviation, deg, east +")
  dist=wk_num("dist","0","0","1000","distance to go along the track, nm")
  if(W_ERR!="") return 0
  n = ns
  wk_head("COURSE TO STEER")
  wl(sprintf("  track to make good %s T, %s kn through the water, %d %s of stream",
     wk_deg(T), wk_g(V), n, (n==1)?"hour":"hours"))
  wl("")
  wl("  1  The stream, hour by hour, added up")
  tx=0; ty=0
  VX[1]=0; VY[1]=0
  for(i=1;i<=n;i++){
    tx += WS_R[i]*sind(WS_S[i]); ty += WS_R[i]*cosd(WS_S[i])
    wl(sprintf("     hour %d   set %s T  %s kn   -> %s nm", i, wk_deg(WS_S[i]), wk_f(WS_R[i],1), wk_f(WS_R[i],2)))
    VX[i+1]=tx; VY[i+1]=ty
  }
  set=rbrg(tx,ty); drift=sqrt(tx*tx+ty*ty)
  wl(sprintf("     together the water moves %s nm toward %s T in %d h", wk_f(drift,2), wk_deg(set), n))
  W = V*n
  wl("")
  wl(sprintf("  2  She sails %s kn x %d h = %s nm through the water", wk_g(V), n, wk_f(W,2)))
  c = drift*sind(set-T); a = drift*cosd(set-T)
  wl("")
  wl(sprintf("  3  Across the track the stream sets her %s nm to %s;", wk_f(fabs(c),2), (c>=0)?"starboard":"port"))
  wl(sprintf("     along it, %s nm %s", wk_f(fabs(a),2), (a>=0)?"with her":"against her"))
  WR["set"]=set; WR["drift"]=drift; WR["ok"]=0
  WF_TX=tx; WF_TY=ty; WF_N=n; WF_T=T; WF_OK=0
  if(fabs(c)>=W){
    wl("     " cw(sprintf("she sails only %s nm in that time, less than the stream sets her across it", wk_f(W,2)), C_ACC))
    wl("")
    wl("  ANSWER   " cw("cannot make good this track: the stream is faster across it than she is", C_ACC))
    wk_rule()
    return 1
  }
  x = asind(c/W)
  H = T - x
  wl(sprintf("     to cancel it, point %s: sin x = %s / %s = %s, x = %s deg",
     (c>=0)?"to port":"to starboard", wk_f(fabs(c),2), wk_f(W,2), wk_f(fabs(c)/W,3), wk_f(fabs(x),1)))
  wl(sprintf("     water track = %s %s %s = %s T", wk_deg(T), (x>=0)?"-":"+", wk_f(fabs(x),1), wk_d1(H)))
  MG = W*cosd(x) + a
  wl("")
  wl(sprintf("  4  Made good along the track: %s x cos %s + (%s) = %s nm in %d h",
     wk_f(W,2), wk_f(fabs(x),1), wk_f(a,2), wk_f(MG,2), n))
  if(MG<=0){
    wl("")
    wl("  ANSWER   " cw("cannot make good this track: the stream against her is stronger than her speed along it", C_ACC))
    wk_rule()
    return 1
  }
  sog = MG/n
  wl(sprintf("     speed over the ground %s kn", wk_f(sog,2)))
  hd = H
  wl("")
  if(lee>0){
    if(wind=="port"){ hd = H - lee
      wl(sprintf("  5  Leeway %s deg, wind on the port side: she slides to starboard,", wk_g(lee)))
      wl(sprintf("     so steer %s deg to port of the water track: %s - %s = %s T", wk_g(lee), wk_d1(H), wk_g(lee), wk_d1(hd))) }
    else { hd = H + lee
      wl(sprintf("  5  Leeway %s deg, wind on the starboard side: she slides to port,", wk_g(lee)))
      wl(sprintf("     so steer %s deg to starboard of the water track: %s + %s = %s T", wk_g(lee), wk_d1(H), wk_g(lee), wk_d1(hd))) }
  } else wl(sprintf("  5  No leeway given: the course to steer is the water track, %s T", wk_d1(hd)))
  wl(sprintf("     steer the whole degree: %s T", wk_deg(hd)))
  tr = int(nrm360(hd)+0.5); if(tr>=360) tr-=360
  mg = tr - var
  cc = mg - dev
  wl(sprintf("  6  Variation %s: %s T %s %s = %s M", wk_ew(var), wk_deg(tr), (var>0)?"-":"+", wk_g(fabs(var)), wk_deg(mg)))
  wl(sprintf("     deviation %s: %s M %s %s = %s C", wk_ew(dev), wk_deg(mg), (dev>0)?"-":"+", wk_g(fabs(dev)), wk_deg(cc)))
  WR["ok"]=1; WR["water"]=nrm360(H); WR["cts"]=tr; WR["mag"]=nrm360(mg); WR["comp"]=nrm360(cc)
  WR["sog"]=sog; WR["mg"]=MG; WF_OK=1; WF_HX=W*sind(H); WF_HY=W*cosd(H)
  ans = sprintf("  ANSWER   steer %s T  %s M  %s C    SOG %s kn",
     wk_deg(tr), wk_deg(mg), wk_deg(cc), wk_f(sog,1))
  if(dist>0){
    tm = dist/sog*60
    wl(sprintf("  7  %s nm at %s kn takes %s", wk_g(dist), wk_f(sog,2), wk_dur(tm)))
    if(dist>MG+0.05) wl("     " cwd(sprintf("longer than the %d h the streams cover: this assumes the same", n)))
    if(dist>MG+0.05) wl("     " cwd("stream carries on"))
    WR["time"]=tm
    ans = ans sprintf("    %s for %s nm", wk_dur(tm), wk_g(dist))
  }
  wl("@@FIG")
  wl(ans)
  wk_rule()
  return 1
}
function wk_figcts(   n,k,e,i){
  n=WF_N
  #  points: 1 start, 2..n+1 the stream hour by hour, then the end on the track
  k=n+1
  VX[k+1]=WF_TX+WF_HX; VY[k+1]=WF_TY+WF_HY
  wk_vfit(k+1, 61, 17)
  e=k+1
  wk_vseg(1, e, "=", "")
  for(i=1;i<=n;i++) wk_vseg(i, i+1, "~", C_DIM)
  wk_vseg(k, e, ".", "")
  wk_vlab(1,"S"); wk_vlab(k,"T"); wk_vlab(e,"E")
  print ""
  gshow()
  printf "  %s\n", cwd("S start   ~ the stream (three arrows on a chart), ending at T")
  printf "  %s\n", cwd(". the water track (one arrow)   = the ground track (two arrows), to E")
  return 0
}

# =====================================================================
#  6.  SET AND DRIFT, FROM A DR AND A FIX
#
#  Run the DR from a known position on the course through the water;
#  the vector from the DR to the fix, over the time, is the set and
#  drift.  It is the honest number, because it holds everything that
#  moved her - stream, wind-driven current, log error, the helmsman -
#  and not just the part a table predicted.  Plane sailing at the mean
#  latitude, which is right to a fraction of a cable over coastal
#  distances.
# =====================================================================
function wk_dlon(d){ while(d>180) d-=360; while(d<-180) d+=360; return d }
function wk_setdrift(   la1,lo1,co,V,hrs,fla,flo,lee,wind,wt,d,dn,de,la2,ml,dlo,lo2,fn,fe,ml2,set,drift,rate){
  wk_allow("setdrift", "start co stw hours fix leeway wind")
  wk_pos("start","the position the DR runs from"); la1=WP_LAT; lo1=WP_LON
  co=wk_ang("co","","the course steered, deg true")
  V=wk_num("stw","","0","40","speed through the water, kn")
  hrs=wk_num("hours","","0","24","time run, hours")
  wk_pos("fix","the fix at the end of the run"); fla=WP_LAT; flo=WP_LON
  lee=wk_num("leeway","0","0","45","leeway, deg")
  wind=wk_wind(lee)
  if(W_ERR!="") return 0
  if(hrs<=0) return wk_err("hours= must be more than 0")
  if(fabs(la1)>80 || fabs(fla)>80) return wk_err("plane sailing is no good this close to a pole (latitude beyond 80)")
  wk_head("SET AND DRIFT, FROM A DR AND A FIX")
  wl(sprintf("  from %s %s, steering %s T at %s kn for %s h",
     wk_lat(la1), wk_lon(lo1), wk_deg(co), wk_g(V), wk_g(hrs)))
  wl("  " cwd("plane sailing at the mean latitude: right for coastal distances"))
  wl("")
  wt = co
  if(lee>0 && wind=="port"){ wt=co+lee
    wl(sprintf("  1  Leeway %s deg with the wind to port pushes her to starboard:", wk_g(lee)))
    wl(sprintf("     water track %s + %s = %s T", wk_deg(co), wk_g(lee), wk_deg(wt))) }
  else if(lee>0){ wt=co-lee
    wl(sprintf("  1  Leeway %s deg with the wind to starboard pushes her to port:", wk_g(lee)))
    wl(sprintf("     water track %s - %s = %s T", wk_deg(co), wk_g(lee), wk_deg(wt))) }
  else {
    wl(sprintf("  1  No leeway given, so the water track is the course, %s T", wk_deg(wt)))
    wl("     " cwd("the set and drift found below then includes any leeway as well"))
  }
  d = V*hrs
  dn = d*cosd(wt); de = d*sind(wt)
  la2 = la1 + dn/60.0
  ml = (la1+la2)/2
  dlo = de/(60.0*cosd(ml))
  lo2 = lo1 + dlo; if(lo2>180) lo2-=360; if(lo2<-180) lo2+=360
  wl("")
  wl(sprintf("  2  The DR: %s kn x %s h = %s nm on %s T", wk_g(V), wk_g(hrs), wk_f(d,2), wk_deg(wt)))
  wl(sprintf("     d.lat = %s x cos %s = %s nm;  departure = %s x sin %s = %s nm",
     wk_f(d,2), wk_deg(wt), wk_f(dn,2), wk_f(d,2), wk_deg(wt), wk_f(de,2)))
  wl(sprintf("     d.long = departure / cos(mean lat %s) = %s'", wk_f(ml,2), wk_f(dlo*60,2)))
  wl(sprintf("     DR %s %s", wk_lat(la2), wk_lon(lo2)))
  fn = (fla-la2)*60.0
  ml2 = (fla+la2)/2
  fe = wk_dlon(flo-lo2)*60.0*cosd(ml2)
  wl("")
  wl(sprintf("  3  DR to the fix %s %s:", wk_lat(fla), wk_lon(flo)))
  wl(sprintf("     d.lat %s nm;  d.long %s' x cos %s = departure %s nm",
     wk_fs(fn,2), wk_fs(wk_dlon(flo-lo2)*60,2), wk_f(ml2,2), wk_fs(fe,2)))
  set = rbrg(fe,fn); drift = sqrt(fn*fn+fe*fe); rate = drift/hrs
  WR["drlat"]=la2; WR["drlon"]=lo2; WR["drift"]=drift; WR["rate"]=rate; WR["set"]=set
  VX[1]=0; VY[1]=0; VX[2]=de; VY[2]=dn; VX[3]=de+fe; VY[3]=dn+fn
  wl("")
  if(drift<0.05){
    wl("  4  The fix is on the DR: no set and drift to speak of")
    WR["set"]=0
    wl("@@FIG")
    wl(sprintf("  ANSWER   no measurable set:  drift %s nm in %s h", wk_f(drift,2), wk_g(hrs)))
    wk_rule()
    return 1
  }
  wl(sprintf("  4  set = the direction of that vector = %s T", cw(wk_deg(set), C_ACC)))
  wl(sprintf("     drift = %s nm in %s h, so the rate is %s kn", wk_f(drift,2), wk_g(hrs), wk_f(rate,2)))
  wl("@@FIG")
  wl(sprintf("  ANSWER   set %s T    drift %s nm in %s h    rate %s kn",
     wk_deg(set), wk_f(drift,1), wk_g(hrs), wk_f(rate,1)))
  wk_rule()
  return 1
}
function wk_figsd(){
  wk_vfit(3, 61, 15)
  wk_vseg(1, 3, "=", "")
  wk_vseg(1, 2, ".", "")
  wk_vseg(2, 3, "~", C_DIM)
  wk_vlab(1,"S"); wk_vlab(2,"D"); wk_vlab(3,"F")
  print ""
  gshow()
  printf "  %s\n", cwd("S start   . the DR run through the water to D   ~ set and drift, D to the fix F")
  printf "  %s\n", cwd("= what she actually made good over the ground")
  return 0
}

# =====================================================================
#  The list, with an example of each.  WORK.md carries the same six
#  examples and tests/run-tests.sh checks that it still does.
# =====================================================================
function wk_help(){
  print ""
  printf "  %s\n", cw("TIDES WORK -- coastal navigation, with the working shown", C_HDR)
  print ""
  print "  tides work <name> key=value ...     angles deg true, speeds kn, heights m,"
  print "                                      times HH:MM, positions lat,lon"
  print ""
  print "  twelfths   height at a time: rule of twelfths, cosine, and the harmonic"
  print "    tides work twelfths lw=05:12 lwh=0.8 hw=11:24 hwh=4.2 t=08:30"
  print "    tides work twelfths station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00"
  print "  secondary  a secondary port's HW and LW from its standard port"
  print "    tides work secondary hw=05:36 hwh=6.4 mhws=6.8 mhwn=5.3 dhws=-0.4 dhwn=-0.3 thw1=0000 tdhw1=-10 thw2=0600 tdhw2=5 lw=11:51 lwh=1.1 mlwn=2.1 mlws=0.8 dlwn=0.0 dlws=0.1 tlw1=0100 tdlw1=-5 tlw2=0700 tdlw2=10"
  print "  stream     a stream rate between the atlas's neap and spring figures"
  print "    tides work stream spr=2.6 nps=1.4 range=4.1 sprange=5.9 nprange=3.1"
  print "  atlas      which page of the tidal stream atlas: hours from HW"
  print "    tides work atlas station=ticon/dover-dov-gbr-bodc date=2026-11-07 t=10:00"
  print "  cts        course to steer across one or more hours of stream"
  print "    tides work cts track=045 stw=6 streams=135:1.5,150:2.0 leeway=5 wind=port var=-2 dev=1 dist=12"
  print "  setdrift   set and drift, from a DR and a fix"
  print "    tides work setdrift start=50.10,-1.50 co=090 stw=6 hours=3 fix=50.05,-1.20"
  print ""
  print "  station= defaults to the station chosen with 'tides use'; date= and t="
  print "  default to now, in the station's standard time.  The same names work in"
  print "  the browser build's URL:  .../web/tides/?work=cts&track=045&stw=6&..."
  print ""
  return 0
}

# =====================================================================
#  Dispatch.  Every tool fills WL[] and WR[]; the figure goes where the
#  working says @@FIG, or the marker itself is printed under nofig=1 so
#  the browser comparison can see where the picture belongs.
# =====================================================================
function wk_run(name,args,   ok){
  W_ERR=""; WL_N=0; split("",WR); WF_HV=""
  if(!wk_parse(args)) return 0
  if(name=="twelfths") ok=wk_twelfths()
  else if(name=="secondary") ok=wk_secondary()
  else if(name=="stream") ok=wk_stream()
  else if(name=="atlas") ok=wk_atlas()
  else if(name=="cts") ok=wk_cts()
  else if(name=="setdrift") ok=wk_setdrift()
  else return wk_err(sprintf("there is no calculator called '%s' (twelfths secondary stream atlas cts setdrift)", name))
  if(W_ERR!="") return 0
  return ok
}
function wk_print(name,   i){
  for(i=1;i<=WL_N;i++){
    if(WL[i]!="@@FIG"){ print WL[i]; continue }
    if(nofig=="1"){ print "@@FIG"; continue }
    if(name=="twelfths") wk_fig12()
    else if(name=="stream") wk_figstream()
    else if(name=="cts" && WF_OK) wk_figcts()
    else if(name=="setdrift") wk_figsd()
  }
  print ""
  return 0
}
BEGIN{
  if(cmd=="work"){
    if(wname=="" || wname=="help"){ wk_help(); exit 0 }
    if(!wk_run(wname, wargs)){ printf "  work %s: %s\n", wname, W_ERR; exit 2 }
    wk_print(wname)
  }
}
