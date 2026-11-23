#  Dump the colregs engine's own tables as JSON.
#
#  THE TABLES ARE CODE, NOT A FILE.  ves_init(), shp_init(), enc_init()
#  and snd_init() BUILD their rows at run time -- the light geometry comes
#  out of ar() calls and shared constants like MF and SG -- so there is
#  nothing to copy out of the source. This runs the initialisers and
#  prints what they actually built, which is the only way the web build
#  and the shell build can be the same data rather than two transcriptions
#  of it.
#
#  Run through make-colregs-web.sh, which assembles data.js around it.
#  js_dq/js_sq live in docs/web/gen/jsonesc.awk, loaded with -f before
#  this file. The doubling must not happen in gsub's replacement string;
#  see the long note there.
function jq(s){ return js_dq(s) }
function jstr(s){ return "\"" jq(s) "\"" }
#  a light tuple: x,y,h,arc,col
function light(t,   f,n){
  n=split(t,f,",")
  if(n<5) return ""
  return sprintf("{\"x\": %s, \"y\": %s, \"h\": %s, \"arc\": %s, \"col\": %s}",
                 num(f[1]), num(f[2]), num(f[3]), jstr(f[4]), jstr(f[5]))
}
#  JSON has no -0 and prints a trailing .0 where the source wrote none;
#  matching the committed file exactly is what proves this dumper is the
#  generator and not an approximation of it.
function num(x,   v){
  v = x+0
  if(v==int(v)) return sprintf("%.1f", v)
  return sprintf("%g", v)
}
function listof(s,sep,   f,n,i,out){
  n=split(s,f,sep); out=""
  for(i=1;i<=n;i++) out = out (i>1?", ":"") jstr(f[i])
  return "[" out "]"
}
BEGIN{
  ves_init(); shp_init(); enc_init(); snd_init()

  print " \"vessels\": ["
  for(i=1;i<=NVES;i++){
    split(VT[i],a,"|")
    n=split(a[4],L,";"); lt=""
    for(j=1;j<=n;j++){ s=light(L[j]); if(s!="") lt = lt (lt==""?"":", ") s }
    printf "  {\n   \"key\": %s,\n   \"name\": %s,\n   \"rule\": %s,\n   \"lights\": [%s],\n   \"note\": %s\n  }%s\n",
      jstr(a[1]), jstr(a[2]), jstr(a[3]), lt, jstr(a[5]), (i<NVES?",":"")
  }
  print " ],"

  print " \"shapes\": ["
  for(i=1;i<=NSHP;i++){
    split(SH[i],a,"|")
    printf "  {\n   \"key\": %s,\n   \"name\": %s,\n   \"rule\": %s,\n   \"stack\": %s,\n   \"note\": %s\n  }%s\n",
      jstr(a[1]), jstr(a[2]), jstr(a[3]), listof(a[4],";"), jstr(a[5]), (i<NSHP?",":"")
  }
  print " ],"

  #  ENCOUNTERS CARRY TWO FIELDS THE WEB BUILD HAS NEVER SEEN: the wind a
  #  sailing scenario is sailed in, and WHICH VESSEL the contact is -- a
  #  key into the same twenty-two the lights drill renders, so both builds
  #  can draw her at the aspect the question was drawn from instead of
  #  describing her in prose. Larry asked for a light picture on every
  #  scenario; twenty-five have one, and the three that do not are the two
  #  fog signals, where you cannot see her at all, and the seaplane, whose
  #  lights Rule 31 leaves as "as closely as possible" to Rule 23.
  #
  #  The wind is field 10 and the vessel field 11, ALWAYS -- a scenario
  #  with no wind carries an empty field 10 rather than omitting it. They
  #  were optional-and-omitted for an hour, and the vessel then sat at
  #  field 10 on twenty-five rows and field 11 on three, so every one of
  #  the twenty-five read as having no vessel at all.
  print " \"encounters\": ["
  for(i=1;i<=NENC;i++){
    split(EC[i],a,"|")
    printf "  {\n   \"own\": %s,\n   \"target\": %s,\n   \"brglo\": %d,\n   \"brghi\": %d,\n   \"thdg\": %d,\n   \"answer\": %s,\n   \"options\": %s,\n   \"why\": %s,\n   \"rule\": %s",
      jstr(a[1]), jstr(a[2]), a[3]+0, a[4]+0, a[5]+0, jstr(a[6]),
      listof(a[7],";"), jstr(a[8]), jstr(a[9])
    #  how far her heading swings either side of thdg: 15 unless the
    #  scenario says otherwise (engine.awk, ECH[], and why).  Always
    #  written, so the page never guesses a default of its own.
    printf ",\n   \"hspr\": %d", ((i in ECH) ? ECH[i]+0 : 15)
    if(a[10]!="") printf ",\n   \"wind\": %d", a[10]+0
    if(a[11]!="") printf ",\n   \"vessel\": %s", jstr(a[11])
    printf "\n  }%s\n", (i<NENC?",":"")
  }
  print " ],"

  print " \"sounds\": ["
  for(i=1;i<=NSND;i++){
    split(SD[i],a,"|")
    printf "  {\n   \"key\": %s,\n   \"pattern\": %s,\n   \"meaning\": %s,\n   \"rule\": %s,\n   \"when\": %s\n  }%s\n",
      jstr(a[1]), jstr(a[2]), jstr(a[3]), jstr(a[4]), jstr(a[5]), (i<NSND?",":"")
  }
  print " ],"
}
