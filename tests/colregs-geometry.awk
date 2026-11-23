#  THE PICTURE MUST BE THE SITUATION THE ANSWER IS ABOUT, FOR EVERY DRAW.
#
#  PILOT's QA of the 28 encounters (22 November 2026) stepped every
#  bearing and heading the draw can make and found two answers the
#  picture contradicted:
#
#    12  "windward gives way" drew her more than 22.5 degrees abaft your
#        beam in three draws out of four.  She was then overtaking you,
#        and Rule 13 overrides Rule 12: she keeps clear, you stand on.
#        The app told you to give way.
#    1   "head-on" said both sidelights and drew one in most draws.
#
#  and NAV, re-running his method over every scenario, found the same
#  fault the other way round at the far end of a 15-degree heading
#  swing in 6, 11, 15, 20 and 28: YOU came out more than 22.5 degrees
#  abaft HER beam, which makes you the overtaking vessel.  In 20 that
#  reverses the answer.  Each check had passed on its own; nothing
#  asked whether the drawn geometry was the encounter the words name.
#
#  Asserted here over 3000 draws of every scenario in which both vessels
#  are under way and the call turns on a meeting, crossing or Rule 18:
#
#    1  she is never more than 22.5 degrees abaft your beam (Rule 13(b));
#    2  you are never more than 22.5 degrees abaft hers;
#    3  the range is closing -- a scenario about who keeps clear has to
#       draw two vessels that are converging.  Scenario 9 is left out of
#       this one only: a vessel restricted in her ability to manoeuvre
#       may be dredging or laying cable at almost no speed, and whether
#       she closes does not change what you do;
#    4  the head-on scenario shows both her sidelights in every draw,
#       as its words say, using the same arc_vis() the picture uses;
#       and a scenario whose words name ONE sidelight ("her red
#       sidelight", "her green sidelight": 2 and 3) shows that one
#       alone, with you at least 5 degrees off her bow (Larry's ruling
#       TBGL, 1.20: about one draw in a hundred showed both);
#    5  in the three sailing scenarios both boats are at least 35
#       degrees off the wind, so each could actually be sailing that
#       heading (PILOT: 11 was drawn with both boats 30 degrees off).
#
#  Equal speed for both vessels, which is the convergence PILOT tested;
#  the plan draws no speeds.
#
#  Run as:  awk -f src/colregs/engine.awk -f tests/colregs-geometry.awk /dev/null
BEGIN{
  enc_init()
  split("1 2 3 6 7 8 9 10 11 12 15 16 20 21 22 23 26 28", S, " ")
  SAIL[11]=1; SAIL[12]=1; SAIL[20]=1
  NOCLOSE[9]=1
  bad=0; n=0
  for(j=1; j in S; j++){
    k=S[j]+0; split(EC[k],a,"|"); w=a[10]
    for(sd=1;sd<=3000;sd++){
      enc_geom(k,sd); bg=ENC_BG; th=ENC_THDG; r=ENC_RNG; n++
      if(bg>112.5 && bg<247.5){
        printf "  FAIL scenario %d seed %d: she bears %05.1f, more than 22.5 abaft your beam -- she is overtaking you\n", k, sd, bg; bad++; break }
      me=nrm180(bg+180-th)
      if(fabs(me)>112.5){
        printf "  FAIL scenario %d seed %d: you bear %05.1f off her bow -- you are overtaking her\n", k, sd, nrm360(me); bad++; break }
      x=r*sind(bg); y=r*cosd(bg); vx=sind(th); vy=cosd(th)-1
      if(!(k in NOCLOSE) && x*vx+y*vy>=0){
        printf "  FAIL scenario %d seed %d: she bears %05.1f heading %05.1f and the range is opening\n", k, sd, bg, th; bad++; break }
      if(k==1 && !(arc_vis("S",me) && arc_vis("P",me))){
        printf "  FAIL scenario 1 seed %d: one sidelight only (you are %+.1f off her bow), the text says both\n", sd, me; bad++; break }
      if(a[2] ~ /her (red|green) sidelight/){
        want = (a[2] ~ /red/) ? "P" : "S"; other = (want=="P") ? "S" : "P"
        if(!arc_vis(want,me) || arc_vis(other,me) || fabs(me)<5){
          why = arc_vis(other,me) ? (arc_vis(want,me) ? "the picture shows both" : "the picture shows the other one") : "that is within 5 degrees of her bow"
          printf "  FAIL scenario %d seed %d: you are %+.1f off her bow -- the words name one sidelight; %s\n", k, sd, me, why; bad++; break }
      }
      if(k in SAIL){
        if(fabs(nrm180(w))<35 || fabs(nrm180(w-th))<35){
          printf "  FAIL scenario %d seed %d: wind %03d, her heading %05.1f -- one boat is under 35 degrees off the wind\n", k, sd, w, th; bad++; break }
      }
    }
  }
  if(bad==0) printf "  ok    every drawn encounter is the one its answer is about (%d scenario-draws)\n", n
  else       printf "  FAIL  %d encounter(s) can be drawn as a different situation\n", bad
  exit (bad==0?0:1)
}
