# =====================================================================
#  tides -- harmonic tide prediction
#  Part of Bash Navigation Software.  Pure POSIX awk, no network.
#
#  A tide is not computable from a position.  It depends on the shape of
#  the coast, the depth and the resonance of the basin, so every place
#  needs harmonic constants measured there.  This program does the
#  synthesis; the constants come from the station file beside it.
#
#  The constituent definitions and the nodal machinery follow Foreman,
#  as carried by UTide - see src/tides/gen/make_tables.py.
# =====================================================================

function d2r(x){ return x*0.0174532925199432958 }
function sind(x){ return sin(x*0.0174532925199432958) }
function cosd(x){ return cos(x*0.0174532925199432958) }
function atan2d(y,x){ return 57.2957795130823209*atan2(y,x) }
function fabs(x){ return (x<0)?-x:x }
function ffloor(x,   n){ n=int(x); return (x<n)?n-1:n }
function frac1(x){ return x - ffloor(x) }
function nrm360(x){ x=x-360*int(x/360); if(x<0) x+=360; return x }

# ---- Julian Date from a UT calendar date ----------------------------
function jdate(y,m,d,   a,b){
  if(m<=2){ y=y-1; m=m+12 }
  a=int(y/100); b=2-a+int(a/4)
  return int(365.25*(y+4716))+int(30.6001*(m+1))+d+b-1524.5
}
function jd2cal(jd,   z,f,a,al,b,c,dd,e){
  jd=jd+0.5; z=int(jd); f=jd-z
  if(z<2299161){ a=z } else { al=int((z-1867216.25)/36524.25); a=z+1+al-int(al/4) }
  b=a+1524; c=int((b-122.1)/365.25); dd=int(365.25*c); e=int((b-dd)/30.6001)
  CAL_D=b-dd-int(30.6001*e)+f
  CAL_M=(e<14)?e-1:e-13
  CAL_Y=(CAL_M>2)?c-4716:c-4715
  CAL_FRAC=CAL_D-int(CAL_D); CAL_D=int(CAL_D)
  return CAL_Y
}
function dow(jd,   n){ n=int(jd+1.5)%7; return substr("SunMonTueWedThuFriSat",n*3+1,3) }

# ---- the astronomical variables, in cycles --------------------------
#  s  mean longitude of the moon        p   lunar perigee
#  h  mean longitude of the sun         np  NEGATIVE of the ascending node
#  tau lunar time                       pp  solar perigee
function tide_astron(jd,   d,D,i,day){
  d = jd - 2415020.0                       # days from 1899-12-31 12:00 UT
  D = d/10000.0
  AS_S  = frac1((270.434164  + 13.1763965*d   - 0.000085*D*D    + 0.000000039*D*D*D)/360.0)
  AS_H  = frac1((279.696678  +  0.9856473354*d+ 0.00002267*D*D                      )/360.0)
  AS_P  = frac1((334.329556  +  0.1114040803*d- 0.0007739*D*D   - 0.00000026*D*D*D  )/360.0)
  AS_NP = frac1((-259.183275 +  0.0529539222*d- 0.0001557*D*D   - 0.00000005*D*D*D  )/360.0)
  AS_PP = frac1((281.220844  +  0.0000470684*d+ 0.0000339*D*D   + 0.00000007*D*D*D  )/360.0)
  day   = frac1(jd + 0.5)                  # fraction of the day since midnight
  AS_TAU= day + AS_H - AS_S
  return 0
}

# ---- Foreman's nodal factors and the astronomical argument ----------
#  F  amplitude factor, U phase correction, V equilibrium argument
#  All phases are in cycles.
function tide_fuv(jd,lat,   i,k,s0,sn,rr,uu,re,im,slat,n,j,i0,c,resolved,pass){
  tide_tables_init()
  tide_astron(jd)
  slat = sind(lat)
  if(fabs(lat)<5) slat = (lat<0?-1:1)*sind(5)
  for(i=1;i<=TT_N;i++){
    if(CHN[i]>0) continue                                # shallow: later
    re=1; im=0
    s0=CS0[i]; sn=CSN[i]
    for(k=s0; k<s0+sn; k++){
      if(k<1) continue
      rr = SAMP[k]
      if(SLAT[k]==1) rr = rr*0.36309*(1.0-5.0*slat*slat)/slat
      else if(SLAT[k]==2) rr = rr*2.59808*slat
      uu = SD1[k]*AS_P + SD2[k]*AS_NP + SD3[k]*AS_PP + SPH[k]
      uu = uu - int(uu)
      re += rr*cos(6.283185307179586*uu)
      im += rr*sin(6.283185307179586*uu)
    }
    CF_[i] = sqrt(re*re+im*im)
    CU_[i] = atan2(im,re)/6.283185307179586
    CV_[i] = CD1[i]*AS_TAU + CD2[i]*AS_S + CD3[i]*AS_H + CD4[i]*AS_P \
           + CD5[i]*AS_NP + CD6[i]*AS_PP + CSEMI[i]
    CV_[i] = CV_[i] - int(CV_[i])
    CDONE[i]=1
  }
  # shallow-water constituents are products and sums of the others
  for(pass=0; pass<6; pass++){
    for(i=1;i<=TT_N;i++){
      if(CHN[i]==0 || CDONE[i]) continue
      i0=CH0[i]; resolved=1
      for(k=i0; k<i0+CHN[i]; k++) if(HIN[k]<1 || !CDONE[HIN[k]]) resolved=0
      if(!resolved) continue
      CF_[i]=1; CU_[i]=0; CV_[i]=0
      for(k=i0; k<i0+CHN[i]; k++){
        j=HIN[k]; c=HCO[k]
        CF_[i] = CF_[i] * exp(fabs(c)*log(CF_[j]))
        CU_[i] = CU_[i] + c*CU_[j]
        CV_[i] = CV_[i] + c*CV_[j]
      }
      CDONE[i]=1
    }
  }
  for(i=1;i<=TT_N;i++) CDONE[i]=0
  return 0
}

# ---- rates of the astronomical variables, cycles per day -----------
#  NOT named RS, RH and so on: RS is awk's record separator, and setting
#  it to 0.0366 makes the next getline read a whole file as one record.
#  Nothing warns you; the file simply appears to be one line long.
function tide_rates(jd,   d,D){
  d = jd - 2415020.0; D = d/10000.0
  R_S  = (13.1763965    - 2*0.000085*D/10000    + 3*0.000000039*D*D/10000)/360.0
  R_H  = ( 0.9856473354 + 2*0.00002267*D/10000                            )/360.0
  R_P  = ( 0.1114040803 - 2*0.0007739*D/10000   - 3*0.00000026*D*D/10000  )/360.0
  R_NP = ( 0.0529539222 - 2*0.0001557*D/10000   - 3*0.00000005*D*D/10000  )/360.0
  R_PP = ( 0.0000470684 + 2*0.0000339*D/10000   + 3*0.00000007*D*D/10000  )/360.0
  R_TAU= 1.0 + R_H - R_S
  return 0
}
# ---- prepare a station for a day: nodal factors and speeds ---------
#  F and U change over months, not hours, so they are computed once at the
#  middle of the interval and held.  V is linear in time and stepped.
function tide_prep(jd0,lat,   i,j,k,pass,left,w,ok){
  tide_fuv(jd0,lat)
  tide_rates(jd0)
  #  Constituents with Doodson numbers of their own.
  for(i=1;i<=TT_N;i++){
    CWOK[i]=0
    if(!CDOK[i]) continue
    CW_[i] = CD1[i]*R_TAU + CD2[i]*R_S + CD3[i]*R_H + CD4[i]*R_P + CD5[i]*R_NP + CD6[i]*R_PP
    CWOK[i]=1
  }
  #  A shallow-water constituent is a PRODUCT of others and has no
  #  Doodson numbers of its own, so its speed is the same weighted sum
  #  of its parents' speeds that its phase is of theirs. Leaving it at
  #  zero turns an overtide into a constant offset that drifts with the
  #  date - which is exactly what it did, to five centimetres.
  for(pass=0; pass<6; pass++){
    left=0
    for(i=1;i<=TT_N;i++){
      if(CWOK[i] || CHN[i]<=0) continue
      w=0; ok=1
      for(k=CH0[i]; k<CH0[i]+CHN[i]; k++){
        j=HIN[k]
        if(!CWOK[j]){ ok=0; break }
        w += HCO[k]*CW_[j]
      }
      if(ok){ CW_[i]=w; CWOK[i]=1 } else left++
    }
    if(left==0) break
  }
  TP_JD0 = jd0
  return 0
}
# ---- the height at a time, metres above the station's datum --------
function tide_h(jd,   i,ph,s){
  s = ST_Z0
  for(i=1;i<=ST_N;i++){
    ph = 360.0*(CV_[ST_C[i]] + CU_[ST_C[i]] + CW_[ST_C[i]]*(jd-TP_JD0)) - ST_P[i]
    s += ST_F[i]*cosd(ph)
  }
  return s
}
# load the amplitudes and phases for the station, with the nodal factor
function tide_station_prep(   i){
  for(i=1;i<=ST_N;i++) ST_F[i] = ST_A[i]*CF_[ST_C[i]]
  return 0
}

# =====================================================================
#  The station file.
#
#    R|id|name|region|country|lat|lon|tzmin|z0mm|datum|lostmm|i:amp:ph,...
#    S|id|name|region|country|lat|lon|tzmin|refid|htype|hhi|hlo|thi|tlo
#
#  Reference stations carry harmonic constants measured there.
#  Subordinate stations carry offsets from a reference station: a time
#  offset in minutes for high and for low water, and either a ratio or a
#  fixed correction on the height.  That is how a real tide table is
#  built, and it is why "nearest station" is a question about a HARBOUR
#  and not about a position.
# =====================================================================
function st_reset(   i){
  ST_N=0; ST_Z0=0; ST_ID=""; ST_NAME=""; ST_REGION=""; ST_COUNTRY=""
  ST_LAT=0; ST_LON=0; ST_TZ=0; ST_DATUM=""; ST_KIND=""
  SB_REF=""; SB_TYPE=""; SB_HHI=1; SB_HLO=1; SB_THI=0; SB_TLO=0
  return 0
}
#  Take one R line and load the constants. Amplitudes are in millimetres
#  and phases in tenths of a degree in the file, to keep it small.
function st_take_ref(line,   f,n,cs,nc,i,t,nt){
  n=split(line,f,"|")
  if(n<12) return 0
  ST_KIND="R"
  ST_ID=f[2]; ST_NAME=f[3]; ST_REGION=f[4]; ST_COUNTRY=f[5]
  ST_LAT=f[6]+0; ST_LON=f[7]+0; ST_TZ=f[8]+0
  ST_Z0=(f[9]+0)/1000.0; ST_DATUM=f[10]
  ST_LOST=(f[11]+0)/1000.0
  nc=split(f[12],cs,",")
  ST_N=0
  for(i=1;i<=nc;i++){
    nt=split(cs[i],t,":")
    if(nt<3) continue
    ST_N++
    ST_C[ST_N]=t[1]+0            # index into the constituent table
    ST_A[ST_N]=(t[2]+0)/1000.0   # metres
    ST_P[ST_N]=(t[3]+0)/10.0     # degrees
  }
  return ST_N
}
function st_take_sub(line,   f,n){
  n=split(line,f,"|")
  if(n<14) return 0
  ST_KIND="S"
  ST_ID=f[2]; ST_NAME=f[3]; ST_REGION=f[4]; ST_COUNTRY=f[5]
  ST_LAT=f[6]+0; ST_LON=f[7]+0; ST_TZ=f[8]+0
  SB_REF=f[9]; SB_TYPE=f[10]
  SB_HHI=f[11]+0; SB_HLO=f[12]+0
  SB_THI=f[13]+0; SB_TLO=f[14]+0
  return 1
}
#  Find one station by exact id. Returns 1 if found.
function st_load(file,id,   line,f,got){
  st_reset(); got=0
  while((getline line < file) > 0){
    if(substr(line,1,1)=="#") continue
    split(line,f,"|")
    if(f[2]!=id) continue
    if(f[1]=="R") got=(st_take_ref(line)>0)
    else if(f[1]=="S") got=st_take_sub(line)
    break
  }
  close(file)
  return got
}
# ---- great-circle distance, nautical miles --------------------------
function st_dist(la1,lo1,la2,lo2,   dla,dlo,a,c){
  dla=d2r(la2-la1); dlo=d2r(lo2-lo1)
  a = sin(dla/2)*sin(dla/2) + cosd(la1)*cosd(la2)*sin(dlo/2)*sin(dlo/2)
  if(a<0) a=0
  if(a>1) a=1
  c = 2*atan2(sqrt(a), sqrt(1-a))
  return c*3437.74677    # radians to nautical miles
}
function st_bearing(la1,lo1,la2,lo2,   y,x){
  y = sind(lo2-lo1)*cosd(la2)
  x = cosd(la1)*sind(la2) - sind(la1)*cosd(la2)*cosd(lo2-lo1)
  return nrm360(atan2d(y,x))
}
#  Insert into a fixed-size "best so far" list kept sorted ascending.
function st_keep(k,d,id,nm,rg,cy,la,lo,kind,   i,j){
  if(SR_N>=k && d>=SR_D[SR_N]) return 0
  i = (SR_N<k) ? ++SR_N : SR_N
  while(i>1 && SR_D[i-1]>d){
    SR_D[i]=SR_D[i-1]; SR_ID[i]=SR_ID[i-1]; SR_NM[i]=SR_NM[i-1]
    SR_RG[i]=SR_RG[i-1]; SR_CY[i]=SR_CY[i-1]
    SR_LA[i]=SR_LA[i-1]; SR_LO[i]=SR_LO[i-1]; SR_KD[i]=SR_KD[i-1]
    i--
  }
  SR_D[i]=d; SR_ID[i]=id; SR_NM[i]=nm; SR_RG[i]=rg; SR_CY[i]=cy
  SR_LA[i]=la; SR_LO[i]=lo; SR_KD[i]=kind
  return 1
}
#  Nearest k stations to a position, by great-circle distance.
function st_near(file,lat,lon,k,   line,f,d,n){
  SR_N=0; SR_HASD=1
  while((getline line < file) > 0){
    if(substr(line,1,1)=="#") continue
    n=split(line,f,"|")
    if(n<8) continue
    d = st_dist(lat,lon,f[6]+0,f[7]+0)
    st_keep(k,d,f[2],f[3],f[4],f[5],f[6]+0,f[7]+0,f[1])
  }
  close(file)
  return SR_N
}
#  ------------------------------------------------------------------
#  Searching for a station by name
#
#  Typing a station's exact name is hopeless: the database calls a place
#  "Falmouth  Cornwall" with two spaces, or "New London  Thames River",
#  and nobody guesses that.  So the search is deliberately loose.
#
#  Two modes, chosen from the query itself:
#
#    plain words   every word has to appear somewhere in the name, the
#                  region or the country, in any order and anywhere
#                  inside a word.  "lon new" finds New London.
#
#    a regex       if the query contains regular-expression characters
#                  it is used as one extended regular expression against
#                  the same text.  "^st " or "falmouth|penzance" or
#                  "port.*bay" all work.
#
#  A malformed regex is fatal in awk - it aborts the run, it cannot be
#  caught - so the pattern is checked first and a query that does not
#  survive the check is searched as plain text instead.  Refusing to
#  answer is worse than answering the obvious way.
#  ------------------------------------------------------------------

#  Does the query look like somebody meant a regular expression?
function re_meta(p){ return (p ~ /[][^$.|()*+?{}\\]/) }

#  A conservative structural check on an extended regular expression.
#  It cannot prove a pattern is valid, but it rejects every malformed
#  one seen in practice: unbalanced brackets or parens, a trailing
#  backslash, a repetition with nothing to repeat.
function re_ok(p,   i,n,c,par,brk,prev){
  n=length(p); par=0; brk=0; prev=""
  if(n==0) return 0
  for(i=1;i<=n;i++){
    c=substr(p,i,1)
    if(c=="\\"){
      if(i==n) return 0            # trailing backslash
      i++; prev="x"; continue
    }
    if(brk){                       # inside [ ... ]
      if(c=="]" && prev!="[" && prev!="^") brk=0
      prev=c; continue
    }
    if(c=="["){ brk=1; prev="["; continue }
    if(c=="]") return 0            # unmatched ]
    if(c=="("){ par++; prev="("; continue }
    if(c==")"){ par--; if(par<0) return 0; prev=")"; continue }
    if(c=="*" || c=="+" || c=="?" || c=="{"){
      if(prev=="" || prev=="(" || prev=="|") return 0   # nothing to repeat
    }
    if(c=="|" && (prev=="" || prev=="(" || prev=="|")) return 0
    prev=c
  }
  if(par!=0 || brk) return 0
  if(prev=="|") return 0
  return 1
}

#  Insert into a fixed-size best-so-far list ordered by rank, then by
#  name, so the same query always produces the same list in the same
#  order - the menu picks by number and the number has to mean the same
#  thing when the list is rebuilt.
function st_keeprank(k,rank,nm,id,rg,cy,la,lo,kind,   i,key,ki){
  key = sprintf("%d|%s", rank, tolower(nm))
  if(SR_N>=k && key >= SR_KEY[SR_N]) return 0
  i = (SR_N<k) ? ++SR_N : SR_N
  while(i>1 && SR_KEY[i-1] > key){
    SR_KEY[i]=SR_KEY[i-1]; SR_ID[i]=SR_ID[i-1]; SR_NM[i]=SR_NM[i-1]
    SR_RG[i]=SR_RG[i-1]; SR_CY[i]=SR_CY[i-1]; SR_D[i]=0
    SR_LA[i]=SR_LA[i-1]; SR_LO[i]=SR_LO[i-1]; SR_KD[i]=SR_KD[i-1]
    i--
  }
  SR_KEY[i]=key; SR_ID[i]=id; SR_NM[i]=nm; SR_RG[i]=rg; SR_CY[i]=cy
  SR_D[i]=0; SR_LA[i]=la; SR_LO[i]=lo; SR_KD[i]=kind
  return 1
}

#  Rank a hit: the lower the number the higher it sits in the list.
#  A place whose name IS what you typed should never be buried under
#  thirty places that merely contain it.
function st_rank(q,nm,rg,cy,   lnm){
  lnm = tolower(nm)
  if(lnm==q)                       return 1
  if(index(lnm,q)==1)              return 2
  if(index(" " lnm, " " q)>0)      return 3   # a word of the name starts with it
  if(index(lnm,q)>0)               return 4
  return 5                                    # matched on region or country
}

#  Search the station file.  Sets SR_* to the best k hits, SR_TOTAL to
#  how many matched altogether and SR_MODE to how the query was read.
function st_search(file,q,k,   line,f,n,hay,cnt,w,nw,i,ok,rank,rx){
  SR_N=0; cnt=0; SR_HASD=0
  q=tolower(q)
  gsub(/^[ \t]+|[ \t]+$/,"",q)
  if(q==""){ SR_TOTAL=0; SR_MODE="empty"; return 0 }
  rx=0
  if(re_meta(q)){
    if(re_ok(q)) rx=1
    else SR_MODE="badregex"
  }
  if(rx) SR_MODE="regex"
  else if(SR_MODE!="badregex") SR_MODE="words"
  nw = rx ? 0 : split(q,w,/[ \t]+/)
  while((getline line < file) > 0){
    if(substr(line,1,1)=="#") continue
    n=split(line,f,"|")
    if(n<8) continue
    hay = tolower(f[3] "  " f[4] "  " f[5])
    if(rx){
      #  A regex is matched against the name, the state and the country
      #  SEPARATELY, not against the three run together.  Otherwise ^
      #  and $ - the whole reason somebody reached for a regex - anchor
      #  to the start of the name and the end of the country, and
      #  "bay$" matches nothing on earth.
      if(tolower(f[3]) ~ q) rank=3
      else if(tolower(f[4]) ~ q || tolower(f[5]) ~ q) rank=5
      else continue
    } else {
      ok=1
      for(i=1;i<=nw;i++) if(index(hay,w[i])==0){ ok=0; break }
      if(!ok) continue
      rank = (nw>1) ? 4 : st_rank(q,f[3],f[4],f[5])
    }
    cnt++
    st_keeprank(k,rank,f[3],f[2],f[4],f[5],f[6]+0,f[7]+0,f[1])
  }
  close(file)
  SR_TOTAL=cnt
  return SR_N
}

# =====================================================================
#  High and low water.
#
#  Scan on a five-minute grid for a sign change in the slope, then fit a
#  parabola through the three points and evaluate the curve at its
#  vertex.  A semi-diurnal tide turns over slowly, so five minutes is
#  ample to bracket a turn and the parabola places it to well under a
#  minute.
# =====================================================================
function tide_hilo(jdA,jdB,   step,t,h0,h1,h2,den,dl,tv,hv){
  HL_N=0
  step = 5.0/1440.0
  h0 = tide_h(jdA-step)
  h1 = tide_h(jdA)
  for(t=jdA; t<=jdB; t+=step){
    h2 = tide_h(t+step)
    if((h1>h0 && h1>=h2) || (h1<h0 && h1<=h2)){
      den = h0 - 2*h1 + h2
      dl  = (den!=0) ? 0.5*(h0-h2)/den : 0
      if(dl>1) dl=1
      if(dl<-1) dl=-1
      tv = t + dl*step
      hv = tide_h(tv)              # the curve itself, not the parabola
      HL_N++
      HL_T[HL_N]=tv; HL_H[HL_N]=hv; HL_K[HL_N]=(h1>h0)?"H":"L"
    }
    h0=h1; h1=h2
  }
  return HL_N
}

# =====================================================================
#  Opening a station.
#
#  A reference station predicts directly.  A subordinate station has no
#  constants of its own: it is a set of corrections to a reference
#  station's high and low waters, which is exactly how a paper tide
#  table works.  So for a subordinate the times and heights of the
#  turns are corrected, and the curve between them is interpolated -
#  there is no honest way to synthesise a continuous curve from offsets.
# =====================================================================
function tide_open(file,id,jdmid,   ok){
  TD_ERR=""
  if(!st_load(file,id)){ TD_ERR="no station with that id"; return 0 }
  TD_KIND=ST_KIND
  TD_ID=ST_ID; TD_NAME=ST_NAME; TD_REGION=ST_REGION; TD_COUNTRY=ST_COUNTRY
  TD_LAT=ST_LAT; TD_LON=ST_LON; TD_TZ=ST_TZ
  if(ST_KIND=="R"){
    TD_DATUM=ST_DATUM; TD_REF=""; TD_REFNAME=""
    tide_prep(jdmid, ST_LAT)
    tide_station_prep()
    return 1
  }
  #  subordinate: keep its own identity, borrow the reference's physics
  TD_REF=SB_REF; TD_TYPE=SB_TYPE
  TD_HHI=SB_HHI; TD_HLO=SB_HLO; TD_THI=SB_THI; TD_TLO=SB_TLO
  if(!st_load(file,SB_REF)){ TD_ERR="its reference station is missing"; return 0 }
  if(ST_KIND!="R"){ TD_ERR="its reference station is not a reference station"; return 0 }
  TD_REFNAME=ST_NAME; TD_DATUM=ST_DATUM
  tide_prep(jdmid, ST_LAT)
  tide_station_prep()
  return 1
}
#  High and low water at the station, whichever kind it is.
function tide_table(jdA,jdB,   i,n,t,h,k,pad){
  if(TD_KIND=="R") return tide_hilo(jdA,jdB)
  #  Work the reference over a wider window, because a time offset can
  #  carry a turn into or out of the day being asked for.
  pad = 0.35
  n = tide_hilo(jdA-pad, jdB+pad)
  TB_N=0
  for(i=1;i<=n;i++){
    k = HL_K[i]
    t = HL_T[i] + ((k=="H") ? TD_THI : TD_TLO)/1440.0
    if(TD_TYPE=="ratio") h = HL_H[i] * ((k=="H") ? TD_HHI : TD_HLO)
    else                 h = HL_H[i] + ((k=="H") ? TD_HHI : TD_HLO)
    if(t<jdA || t>jdB) continue
    TB_N++; TB_T[TB_N]=t; TB_H[TB_N]=h; TB_K[TB_N]=k
  }
  #  hand it back in the same arrays the caller reads
  HL_N=TB_N
  for(i=1;i<=TB_N;i++){ HL_T[i]=TB_T[i]; HL_H[i]=TB_H[i]; HL_K[i]=TB_K[i] }
  return HL_N
}
#  The curve. At a reference station this is the real synthesis; at a
#  subordinate it is a cosine drawn between corrected turning points,
#  which is what a tide table's curve has always been.
function tide_curve_prep(jdA,jdB,   i,n,pad,t,h,k){
  if(TD_KIND=="R"){ CV_OK=1; return 1 }
  pad=0.6
  n = tide_hilo(jdA-pad, jdB+pad)
  CVN=0
  for(i=1;i<=n;i++){
    k = HL_K[i]
    t = HL_T[i] + ((k=="H") ? TD_THI : TD_TLO)/1440.0
    if(TD_TYPE=="ratio") h = HL_H[i] * ((k=="H") ? TD_HHI : TD_HLO)
    else                 h = HL_H[i] + ((k=="H") ? TD_HHI : TD_HLO)
    CVN++; CVT[CVN]=t; CVH[CVN]=h
  }
  CV_OK=(CVN>=2)
  return CV_OK
}
function tide_height(jd,   i,a,b,x){
  if(TD_KIND=="R") return tide_h(jd)
  if(!CV_OK) return 0
  if(jd<=CVT[1]) return CVH[1]
  if(jd>=CVT[CVN]) return CVH[CVN]
  for(i=1;i<CVN;i++) if(jd>=CVT[i] && jd<=CVT[i+1]) break
  a=CVH[i]; b=CVH[i+1]
  x=(jd-CVT[i])/(CVT[i+1]-CVT[i])
  #  half a cosine: the right height and a flat top at each turn
  return (a+b)/2 + (a-b)/2*cos(3.14159265358979*x)
}

# =====================================================================
#  Drawing.  The same canvas the other two tools use.
# =====================================================================
function col_init(   e){
  if(COL_READY) return
  e=sprintf("%c",27)
  if(cmode=="night"){ C_BASE=e "[40m" e "[31m"; C_ACC=e "[1;31m"; C_DIM=e "[2;31m"; C_HDR=e "[1;31m" }
  else if(cmode=="day"){ C_BASE=e "[40m" e "[37m"; C_ACC=e "[1;32m"; C_DIM=e "[90m"; C_HDR=e "[1;36m" }
  else { C_BASE=""; C_ACC=""; C_DIM=""; C_HDR="" }
  C_RST=C_BASE
  if(cmode=="night"){ C_PANEL=e "[40m" e "[31m"; C_EOL=e "[K" C_BASE }
  else if(cmode=="day"){ C_PANEL=e "[40m" e "[37m"; C_EOL=e "[K" C_BASE }
  else { C_PANEL=""; C_EOL="" }
  COL_READY=1
  return 0
}
function cw(s,c){ col_init(); if(c=="") return s; return c s C_RST }
function cwd(s){ col_init(); return cw(s,C_DIM) }
function hr(){ print "  ----------------------------------------------------------------------" }
function gclear(w,h,   r,c){ col_init(); PW=w; PH=h
  for(r=0;r<h;r++) for(c=0;c<w;c++){ G[r,c]=" "; GC[r,c]="" } }
function gput(r,c,ch){ r=int(r+0.5); c=int(c+0.5)
  if(r>=0&&r<PH&&c>=0&&c<PW){ G[r,c]=ch; GC[r,c]="" } }
function gputc(r,c,ch,col){ r=int(r+0.5); c=int(c+0.5)
  if(r>=0&&r<PH&&c>=0&&c<PW){ G[r,c]=ch; GC[r,c]=col } }
function gputw(r,c,ch){ r=int(r+0.5); c=int(c+0.5)
  if(r>=0&&r<PH&&c>=0&&c<PW&&G[r,c]==" "){ G[r,c]=ch; GC[r,c]="" } }
function gputwc(r,c,ch,col){ r=int(r+0.5); c=int(c+0.5)
  if(r>=0&&r<PH&&c>=0&&c<PW&&G[r,c]==" "){ G[r,c]=ch; GC[r,c]=col } }
function gputs(r,c,s,   i){ for(i=1;i<=length(s);i++) gput(r,c+i-1,substr(s,i,1)) }
function gputsc(r,c,s,col,   i){ for(i=1;i<=length(s);i++) gputc(r,c+i-1,substr(s,i,1),col) }
function gshow(   r,c,line,cur,cc){
  col_init()
  for(r=0;r<PH;r++){
    line=""; cur=""
    for(c=0;c<PW;c++){
      cc=GC[r,c]
      if(cc!=cur){ line=line (cc==""? C_PANEL : cc); cur=cc }
      line=line G[r,c]
    }
    print "  " C_PANEL line C_EOL
  }
  return 0
}
# ---- time formatting, in the station's standard time ----------------
function tz_jd(jd){ return jd + ST_TZOFF/1440.0 }
function fmt_hm(jd,   fr,hh,mm){
  jd2cal(jd); fr=CAL_FRAC*24
  hh=int(fr); mm=int((fr-hh)*60+0.5)
  if(mm>=60){ mm-=60; hh++ }
  if(hh>=24) hh-=24
  return sprintf("%02d:%02d",hh,mm)
}
function fmt_date(jd){ jd2cal(jd); return sprintf("%04d-%02d-%02d",CAL_Y,CAL_M,CAL_D) }

# =====================================================================
#  The moon and the sun.
#
#  Low-precision series, which is all a tide panel needs: the phase to a
#  few hours and the times of rise and set to a minute or two. celnav is
#  the tool for anything that has to be accurate.
# =====================================================================
function sun_lon(jd,   n,L,g){
  n=jd-2451545.0
  L=nrm360(280.460 + 0.9856474*n)
  g=nrm360(357.528 + 0.9856003*n)
  return nrm360(L + 1.915*sind(g) + 0.020*sind(2*g))
}
function moon_lon(jd,   T,L,M,Mm,D,F){
  T=(jd-2451545.0)/36525.0
  L =nrm360(218.316 + 481267.881*T)
  M =nrm360(357.529 +  35999.050*T)
  Mm=nrm360(134.963 + 477198.867*T)
  D =nrm360(297.850 + 445267.115*T)
  F =nrm360( 93.272 + 483202.018*T)
  return nrm360(L + 6.289*sind(Mm) - 1.274*sind(Mm-2*D) - 0.658*sind(2*D) \
                  - 0.214*sind(2*Mm) - 0.186*sind(M) - 0.114*sind(2*F))
}
#  Age in days since the new moon, and the illuminated fraction.
function moon_phase(jd,   d){
  d = nrm360(moon_lon(jd) - sun_lon(jd))
  MP_ELONG = d
  MP_AGE   = d/360.0*29.530589
  MP_ILLUM = (1 - cosd(d))/2.0
  if(d<  1.5 || d>358.5) MP_NAME="new"
  else if(d< 88.5) MP_NAME="waxing crescent"
  else if(d< 91.5) MP_NAME="first quarter"
  else if(d<178.5) MP_NAME="waxing gibbous"
  else if(d<181.5) MP_NAME="full"
  else if(d<268.5) MP_NAME="waning gibbous"
  else if(d<271.5) MP_NAME="last quarter"
  else MP_NAME="waning crescent"
  #  Springs follow new and full by a day or two; neaps follow the
  #  quarters. The tide does not care which of the two syzygies it is.
  if(d<45 || d>315 || (d>135 && d<225)) MP_TIDE="springs"
  else if((d>67.5 && d<112.5) || (d>247.5 && d<292.5)) MP_TIDE="neaps"
  else MP_TIDE="between"
  return MP_AGE
}
#  A body's altitude, from its ecliptic longitude. Good enough to find a
#  rising and a setting to a minute or two.
function body_alt(lam,beta,jd,lat,lon,   eps,ra,dec,gst,ha,T){
  T=(jd-2451545.0)/36525.0
  eps=23.439291 - 0.0130042*T
  ra = nrm360(atan2d(sind(lam)*cosd(eps) - tand(beta)*sind(eps), cosd(lam)))
  dec= asind(sind(beta)*cosd(eps) + cosd(beta)*sind(eps)*sind(lam))
  gst= nrm360(280.46061837 + 360.98564736629*(jd-2451545.0))
  ha = nrm360(gst + lon - ra)
  return asind(sind(lat)*sind(dec) + cosd(lat)*cosd(dec)*cosd(ha))
}
function tand(x){ return sind(x)/cosd(x) }
function asind(x){ if(x>=1) return 90; if(x<=-1) return -90
  return atan2d(x, sqrt(1-x*x)) }
#  One function for either body, so no call site has to choose inside an
#  expression - a ternary split over two lines is something gawk accepts
#  in some places and mawk in none.
function alt_of(which,jd,lat,lon){
  if(which=="sun") return body_alt(sun_lon(jd),0,jd,lat,lon)
  return body_alt(moon_lon(jd),0,jd,lat,lon)
}
#  Scan a day for a body crossing an altitude, either way. h0 is the
#  altitude that counts as the event: -0.833 for the upper limb of the
#  sun or moon allowing for refraction, -6 for civil twilight.
function rise_set(jd0,lat,lon,which,h0,   t,a,b,lo,hi,i,mid,step,up){
  RS_RISE=""; RS_SET=""
  step=1/144.0
  a = alt_of(which,jd0,lat,lon)
  for(t=step; t<=1.0+1e-9; t+=step){
    b = alt_of(which,jd0+t,lat,lon)
    if((a<h0 && b>=h0) || (a>h0 && b<=h0)){
      up=(a<h0)
      lo=jd0+t-step; hi=jd0+t
      for(i=0;i<30;i++){
        mid=(lo+hi)/2
        if((alt_of(which,mid,lat,lon) < h0) == up) lo=mid
        else hi=mid
      }
      if(up){ if(RS_RISE=="") RS_RISE=(lo+hi)/2 }
      else  { if(RS_SET=="")  RS_SET=(lo+hi)/2 }
    }
    a=b
  }
  return 0
}

# =====================================================================
#  The day's tide table.
# =====================================================================
function td_head(   k){
  print ""
  printf "  %s\n", cw(TD_NAME, C_HDR)
  k = sprintf("%s, %s   %.4f %.4f   heights above %s",
        TD_REGION, TD_COUNTRY, TD_LAT, TD_LON, TD_DATUM)
  printf "  %s\n", cwd(k)
  #  No ternary spanning a line anywhere in this file: gawk accepts it
  #  in some positions and mawk in none, and the failure is a parse error
  #  on a file the tool cannot then load at all.
  if(TD_KIND=="S"){
    if(TD_TYPE=="ratio") k=sprintf("x%.2f/%.2f", TD_HHI, TD_HLO)
    else                 k=sprintf("%+.2f/%+.2f m", TD_HHI, TD_HLO)
    printf "  %s\n", cwd(sprintf("a secondary port: %+d/%+d min and %s on %s",
       TD_THI, TD_TLO, k, TD_REFNAME))
  }
  return 0
}
function td_table(jdA,jdB,   i,n,k){
  n = tide_table(jdA,jdB)
  hr()
  printf "  %-6s %-6s %8s\n", "", "time", "height"
  for(i=1;i<=n;i++){
    k = (HL_K[i]=="H") ? "HIGH" : "low"
    printf "  %-6s %-6s %7.2f m\n",
       cw(k, (HL_K[i]=="H") ? C_ACC : ""), fmt_hm(tz_jd(HL_T[i])), HL_H[i]
  }
  hr()
  return n
}
# =====================================================================
#  The curve.  Twenty-four hours across, the range up, with the turns
#  marked and now shown if now is inside the day.
# =====================================================================
function td_curve(jdA,jdB,jdnow,   w,h,i,j,t,v,lo,hi,r,c,n,col,lab,mark){
  w=71; h=15
  lo=1e9; hi=-1e9
  for(i=0;i<=w*2;i++){
    t=jdA+(jdB-jdA)*i/(w*2.0)
    v=tide_height(t)
    if(v<lo) lo=v
    if(v>hi) hi=v
  }
  if(hi-lo < 0.2){ hi=hi+0.1; lo=lo-0.1 }
  r=hi-lo
  gclear(w,h)
  #  the datum, if it falls inside the picture
  if(lo<0 && hi>0){
    j = (h-1) - (0 - lo)/r*(h-1)
    for(i=0;i<w;i++) gputwc(j,i,".",C_DIM)
    gputsc(j, 0, "0", C_DIM)
  }
  for(i=0;i<w;i++){
    t=jdA+(jdB-jdA)*i/(w-1.0)
    v=tide_height(t)
    j=(h-1) - (v-lo)/r*(h-1)
    gputc(j,i,"*","")
  }
  #  the turns
  n=tide_table(jdA,jdB)
  for(i=1;i<=n;i++){
    c=(HL_T[i]-jdA)/(jdB-jdA)*(w-1)
    j=(h-1) - (HL_H[i]-lo)/r*(h-1)
    gputc(j,c,(HL_K[i]=="H")?"H":"L", C_ACC)
  }
  if(jdnow>=jdA && jdnow<=jdB){
    c=(jdnow-jdA)/(jdB-jdA)*(w-1)
    for(j=0;j<h;j++) gputwc(j,c,"|",C_HDR)
    v=tide_height(jdnow)
    j=(h-1)-(v-lo)/r*(h-1)
    gputc(j,c,"@",C_HDR)
  }
  print ""
  gshow()
  #  the hour scale, positioned rather than padded: 24 hours across w
  #  columns does not divide evenly, and a label that drifts from its
  #  own tick is worse than no label
  for(i=0;i<w;i++) SC_[i]=" "
  for(i=0;i<=24;i+=3){
    c=int(i/24.0*(w-1)+0.5)
    lab=sprintf("%02d",i%24)
    if(c+1>=w) c=w-2
    SC_[c]=substr(lab,1,1); SC_[c+1]=substr(lab,2,1)
  }
  lab=""
  for(i=0;i<w;i++) lab=lab SC_[i]
  printf "  %s\n", cwd(lab)
  mark=""
  if(jdnow>=jdA && jdnow<=jdB) mark="   @ = now"
  printf "  %s\n", cwd(sprintf("%.2f m at the top, %.2f m at the foot%s", hi, lo, mark))
  return 0
}

# =====================================================================
#  The moon and sun panel.
# =====================================================================
function td_sky(jd0,   a,r,s,ph,i,disc,row,col,x,y,rr,lit,ch){
  moon_phase(jd0+0.5)
  print ""
  printf "  %s\n", cw("SUN AND MOON", C_HDR)
  hr()
  rise_set(jd0,TD_LAT,TD_LON,"sun",-0.833)
  printf "  Sun     rises %-6s  sets %-6s\n",
     (RS_RISE==""?"--":fmt_hm(tz_jd(RS_RISE))), (RS_SET==""?"--":fmt_hm(tz_jd(RS_SET)))
  rise_set(jd0,TD_LAT,TD_LON,"sun",-6)
  printf "  %s\n", cwd(sprintf("civil twilight begins %-6s  ends %-6s",
     (RS_RISE==""?"--":fmt_hm(tz_jd(RS_RISE))), (RS_SET==""?"--":fmt_hm(tz_jd(RS_SET)))))
  rise_set(jd0,TD_LAT,TD_LON,"moon",-0.833)
  printf "  Moon    rises %-6s  sets %-6s\n",
     (RS_RISE==""?"--":fmt_hm(tz_jd(RS_RISE))), (RS_SET==""?"--":fmt_hm(tz_jd(RS_SET)))
  printf "  %s  %.0f%% lit, %.1f days old\n", cw(MP_NAME,C_ACC), MP_ILLUM*100, MP_AGE
  #  the disc, drawn from the terminator
  print ""
  for(row=-4;row<=4;row++){
    line="        "
    for(col=-9;col<=9;col++){
      x=col/9.0; y=row/4.0
      if(x*x+y*y > 1.0){ line=line " "; continue }
      #  the lit limb: the terminator is an ellipse whose width is the
      #  cosine of the elongation
      lit = 0
      rr = sqrt(1 - y*y)
      if(MP_ELONG<=180){ if(x >= -rr*cosd(MP_ELONG)) lit=1 }
      else             { if(x <= -rr*cosd(MP_ELONG)) lit=1 }
      if(lit) ch="#"; else ch="."
      line=line ch
    }
    printf "  %s\n", line
  }
  printf "  %s\n", cwd(sprintf("Springs follow new and full by a day or two; neaps follow the quarters."))
  printf "  %s\n", cwd(sprintf("This moon is %s of springs.", MP_TIDE))
  return 0
}
# =====================================================================
#  Depth and clearance.  The two questions a tide table is actually for.
# =====================================================================
function td_depth(jdA,jdB,jdnow,charted,draft,clear,air,mast,   i,n,v,ok,t,step,best,worst){
  print ""
  printf "  %s\n", cw("DEPTH AND CLEARANCE", C_HDR)
  hr()
  if(charted!=""){
    v=tide_height(jdnow)
    printf "  charted depth %.1f m + tide %.2f m = %s under the surface now\n",
       charted, v, cw(sprintf("%.2f m", charted+v), C_ACC)
    if(draft!=""){
      printf "  your draught %.1f m", draft
      if(clear!="") printf " and %.1f m under the keel wanted", clear
      print ""
      #  when is there enough water?
      step=1/288.0; ok=0
      for(t=jdA;t<=jdB;t+=step){
        v=charted+tide_height(t)
        if(v >= draft + (clear==""?0:clear)){ ok++ }
      }
      if(ok==0) printf "  %s\n", cw("Never enough water here today.", C_ACC)
      else td_windows(jdA,jdB,charted,draft+(clear==""?0:clear))
    }
  }
  if(air!="" && mast!=""){
    print ""
    v=tide_height(jdnow)
    printf "  charted height of the bridge %.1f m - tide %.2f m = %s clear now\n",
       air, v, cw(sprintf("%.2f m", air-v), C_ACC)
    printf "  %s\n", cwd("charted heights are above HAT, so the tide takes it away")
    printf "  your air draught %.1f m\n", mast
    td_airwindows(jdA,jdB,air,mast)
  }
  hr()
  return 0
}
#  Report the stretches of the day when the water is deep enough.
function td_windows(jdA,jdB,charted,need,   t,step,inw,st,v,n){
  step=1/288.0; inw=0; n=0
  for(t=jdA;t<=jdB+step/2;t+=step){
    v=charted+tide_height(t)
    if(v>=need && !inw){ inw=1; st=t }
    else if(v<need && inw){
      inw=0; n++
      printf "  enough water   %s to %s\n", fmt_hm(tz_jd(st)), fmt_hm(tz_jd(t))
    }
  }
  if(inw){ n++; printf "  enough water   %s to %s\n", fmt_hm(tz_jd(st)), fmt_hm(tz_jd(jdB)) }
  if(n==0) printf "  %s\n", cw("Never enough water today.", C_ACC)
  return n
}
function td_airwindows(jdA,jdB,air,mast,   t,step,inw,st,v,n){
  step=1/288.0; inw=0; n=0
  for(t=jdA;t<=jdB+step/2;t+=step){
    v=air-tide_height(t)
    if(v>=mast && !inw){ inw=1; st=t }
    else if(v<mast && inw){
      inw=0; n++
      printf "  clears the bridge  %s to %s\n", fmt_hm(tz_jd(st)), fmt_hm(tz_jd(t))
    }
  }
  if(inw){ n++; printf "  clears the bridge  %s to %s\n", fmt_hm(tz_jd(st)), fmt_hm(tz_jd(jdB)) }
  if(n==0) printf "  %s\n", cw("It never clears today.", C_ACC)
  return n
}

# =====================================================================
#  Station lists
# =====================================================================
#  Two shapes, because the two lists answer different questions.  A
#  nearest-first list is read for its distances; a name search is read
#  for the rest of the name, which is where the disambiguation lives -
#  "Long Beach" and "Long Beach  Bridgewater Yacht Club  New York" are
#  the same first ten characters and a hundred miles apart.  The id is
#  not drawn: it can be seventy characters long, and the list is picked
#  by number.
function td_showlist(   i,d,w){
  hr()
  if(SR_HASD){
    for(i=1;i<=SR_N;i++){
      d = SR_ID[i]; sub(/\/.*/,"",d)
      printf "  %2d %6.1f nm  %-32s %-3s %-5s %s\n", i, SR_D[i], substr(SR_NM[i],1,32),
         (SR_KD[i]=="R" ? "" : "sec"), d, substr(SR_CY[i],1,16)
    }
  } else {
    for(i=1;i<=SR_N;i++){
      w = SR_NM[i]
      if(SR_RG[i]!="") w = w "  (" SR_RG[i] ")"
      d = SR_ID[i]; sub(/\/.*/,"",d)      # which dataset it came from
      printf "  %2d  %-44s %-3s %-5s %s\n", i, substr(w,1,44),
         (SR_KD[i]=="R" ? "" : "sec"), d, substr(SR_CY[i],1,16)
    }
  }
  hr()
  return SR_N
}
#  The same list with nothing in it but numbers and ids, written to a
#  side file so the drawing and the machine-readable form come out of
#  ONE scan of the station file.  Two scans could disagree - and the
#  number somebody types has to mean the row they are looking at.
function td_rawlist(f,   i){
  if(f=="") return 0
  printf "" > f
  for(i=1;i<=SR_N;i++) printf "%d|%s|%s\n", i, SR_ID[i], SR_NM[i] > f
  close(f)
  return SR_N
}
BEGIN{
  col_init()
  ST_TZOFF = (tzoff=="") ? 0 : tzoff+0
  if(cmd=="near"){
    st_near(SF, lat+0, lon+0, (k==""?10:k+0))
    td_rawlist(rawto)
    print ""
    printf "  %s\n", cw(sprintf("STATIONS NEAREST %.4f %.4f", lat+0, lon+0), C_HDR)
    td_showlist()
    printf "  %s\n", cwd("Distance is a straight line. The nearest station can be on")
    printf "  %s\n", cwd("the other side of a headland and behave nothing like you.")
    print ""
  }
  else if(cmd=="search"){
    st_search(SF, q, (k==""?20:k+0))
    td_rawlist(rawto)
    print ""
    printf "  %s\n", cw(sprintf("STATIONS MATCHING '%s'", q), C_HDR)
    if(SR_MODE=="regex")
      printf "  %s\n", cwd("read as a regular expression")
    else if(SR_MODE=="badregex")
      printf "  %s\n", cwd("not a valid regular expression - searched as plain text instead")
    if(SR_N==0){
      print ""
      printf "  %s\n", cwd("Nothing matched. The names in the database are not always the")
      printf "  %s\n", cwd("ones on the chart, so try less of the name rather than more:")
      printf "  %s\n", cwd("one distinctive word usually finds it.")
      print ""
      printf "  %s\n", cwd("Every word you type has to appear somewhere in the name, the")
      printf "  %s\n", cwd("state or the country, but in any order. A regular expression")
      printf "  %s\n", cwd("works too:  ^st  starts with;  bay$  ends with;  a|b  either;")
      printf "  %s\n", cwd("port.*bay  with anything in between.")
    } else {
      td_showlist()
      if(SR_TOTAL>SR_N)
        printf "  %s\n", cwd(sprintf("%d matched; the %d closest to what you typed are shown.", SR_TOTAL, SR_N))
      else
        printf "  %s\n", cwd(sprintf("%d matched.", SR_TOTAL))
      if(SR_MODE=="words")
        printf "  %s\n", cwd("Any order, any part of a word. Regular expressions work: ^st  bay$  a|b  port.*bay")
    }
    print ""
  }
  else if(cmd=="day"){
    jd0 = jdate(yy+0, mm+0, dd+0)
    if(!tide_open(SF, id, jd0+0.5)){ printf "  tides: %s\n", TD_ERR; exit 2 }
    ST_TZOFF = TD_TZ
    #  the day is the station's own standard day, so work in UT from its
    #  midnight - a tide table has always been in local standard time
    jdA = jd0 - TD_TZ/1440.0
    jdB = jdA + 1
    td_head()
    printf "  %s   %s\n", cw(fmt_date(tz_jd(jdA+0.5)),C_ACC), cwd(dow(jd0) "   times in the station's standard time")
    td_table(jdA,jdB)
    tide_curve_prep(jdA,jdB)
    jdnow=-1
    if(nowdate!=""){
      split(nowdate,ND,"-"); split(nowtime,NT,":")
      jdnow = jdate(ND[1]+0,ND[2]+0,ND[3]+0) + (NT[1]+0)/24.0 + (NT[2]+0)/1440.0
    }
    td_curve(jdA,jdB,jdnow)
    if(sky=="1") td_sky(jdA)
    if(charted!="" || air!=""){
      jdref=jdnow
      if(jdref<jdA || jdref>jdB) jdref=jdA+0.5
      td_depth(jdA,jdB,jdref,charted,draft,clear,air,mast)
    }
    print ""
  }
  else if(cmd=="height"){
    jd0 = jdate(yy+0, mm+0, dd+0)
    if(!tide_open(SF, id, jd0+0.5)){ printf "  tides: %s\n", TD_ERR; exit 2 }
    ST_TZOFF = TD_TZ
    jdA = jd0 - TD_TZ/1440.0
    tide_curve_prep(jdA, jdA+1)
    printf "%.3f\n", tide_height(jdA + (hh+0)/24.0 + (mi+0)/1440.0)
  }
  else if(cmd=="info"){
    jd0 = jdate(yy+0, mm+0, dd+0)
    if(!tide_open(SF, id, jd0+0.5)){ printf "  tides: %s\n", TD_ERR; exit 2 }
    printf "%s|%s|%s|%s|%.5f|%.5f|%d|%s\n",
      TD_ID, TD_NAME, TD_REGION, TD_COUNTRY, TD_LAT, TD_LON, TD_TZ, TD_KIND
  }
  #  cmd=work is dispatched by work.awk's own BEGIN block, which runs after
  #  this one: see the head of that file for why it is not called from here.
  else if(cmd!="" && cmd!="work"){ print "tides: unknown cmd " cmd; exit 2 }
}
