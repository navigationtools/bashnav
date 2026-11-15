# =====================================================================
#  colregs -- contacts.  Managing them the way a tracking party does:
#  by bearing drift, in relative motion, with the arithmetic done in
#  your head before the plot has caught up.
#
#  Units throughout are yards, knots and minutes. A knot is 2000 yards
#  in an hour in fire-control arithmetic, so 33 1/3 yards a minute.
# =====================================================================
function ktym(){ return 33.3333333 }

#  Bearing of a relative position, rbrg(), and the signed drift between
#  two, sgn180(), are in src/common/bearing.awk, which tides uses too.
#  build.sh packs it ahead of this file in the CONTACTS payload.

# ---------------------------------------------------------------------
#  THE PLOT.  Own ship at the centre, head up, and the contact drawn
#  where she is RELATIVE to own ship. That is the only plot that answers
#  "does she pass ahead of me or astern", because in relative motion she
#  travels in a straight line and the answer is just which side of the
#  centre the line goes.
# ---------------------------------------------------------------------
function ct_plot(px,py,vx,vy,nobs,dt,showcpa,
                 i,w,h,cx,cy,mx,xs,ys,t,x,y,tc,cpx,cpy,rr,tend,st){
  w=67; h=19; cx=int(w/2); cy=int(h/2)
  rr = vx*vx+vy*vy
  tc = (rr>1e-9) ? -(px*vx+py*vy)/rr : 0
  if(tc<0) tc=0
  cpx=px+vx*tc; cpy=py+vy*tc
  CT_CPA = sqrt(cpx*cpx+cpy*cpy); CT_TCPA = tc
  CT_AHEAD = (cpy>0) ? 1 : 0
  mx=0
  for(i=0;i<nobs;i++){ t=i*dt; x=px+vx*t; y=py+vy*t
    if(fabs(x)>mx) mx=fabs(x)
    if(fabs(y)>mx) mx=fabs(y) }
  if(showcpa){ if(fabs(cpx)>mx) mx=fabs(cpx)
               if(fabs(cpy)>mx) mx=fabs(cpy) }
  if(mx<=0) mx=1
  #  THE WEB GENERATOR NEEDS THE PARAMETERS, NOT THE PICTURE. The browser
  #  draws these figures as SVG from the same numbers, and the only way to
  #  get the numbers across without typing them twice is to have the awk
  #  say what it was about to draw. Set by the generator alone; the shell
  #  never sets it, so the tool is unaffected. Printed after the CPA is
  #  worked out, so CT_CPA and friends are still set for the caller.
  if(FIGDUMP){ printf "@@FIG plot px=%.10g py=%.10g vx=%.10g vy=%.10g nobs=%.10g dt=%.10g cpa=%.10g\n",
                      px,py,vx,vy,nobs,dt,showcpa
               return 0 }
  mx=mx*1.08
  ys=(cy-1)/mx; xs=ys*2.0
  gclear(w,h); G_NOCROP=1
  #  own ship's track: the line she has to cross to get from one side of
  #  you to the other. Which side she crosses it is the whole question.
  for(i=0;i<h;i++) gputc(i,cx,"|",C_DIM)
  #  her track, drawn over it, so a crossing shows as a crossing
  tend = (showcpa && tc>(nobs-1)*dt) ? tc : (nobs-1)*dt
  if(tend>0)
    for(t=0;t<=tend;t+=tend/500.0){
      x=px+vx*t; y=py+vy*t
      gputc(cy-y*ys, cx+x*xs, ".", C_DIM) }
  gputsc(cy-1,cx-1,"^^^",C_ACC)
  gputc(cy,cx,"Y",C_ACC)
  if(showcpa) gputc(cy-cpy*ys, cx+cpx*xs, "*", C_ACC)
  #  the observations go on last: a mark you took is never hidden
  for(i=0;i<nobs;i++){ t=i*dt; x=px+vx*t; y=py+vy*t
    gputc(cy-y*ys, cx+x*xs, sprintf("%d",i+1), "") }
  gputsc(0,0,sprintf("%d yd across",int(mx*2/100+0.5)*100),C_DIM)
  gshow()
  return 0
}

# =====================================================================
#  Generating a contact.  True frame first (north up), because that is
#  what a bearing is; then rotated head up for the plot.
# =====================================================================
function ct_gen(seed,   try,rb,ok,i,t,x,y,b0,b12,tc0,cr,vxp,vyp,pxp,pyp,band,d){
  xsrand(seed+0)
  #  Aim for a spread of outcomes rather than whatever the geometry
  #  happens to throw up: one run in five is a genuine collision.
  CG_WANT = (xrand()<0.2) ? 1 : (2 + int(xrand()*3))
  for(try=0; try<6000; try++){
    CG_OC = int(xrand()*360)
    CG_OS = 8 + int(xrand()*13)
    rb    = -80 + xrand()*160
    CG_TB = nrm360(CG_OC + rb)
    CG_R0 = 9000 + int(xrand()*90)*100
    CG_CC = int(xrand()*360)
    CG_CS = 4 + int(xrand()*17)
    CG_PX = CG_R0*sind(CG_TB);  CG_PY = CG_R0*cosd(CG_TB)
    CG_VX = CG_CS*ktym()*sind(CG_CC) - CG_OS*ktym()*sind(CG_OC)
    CG_VY = CG_CS*ktym()*cosd(CG_CC) - CG_OS*ktym()*cosd(CG_OC)
    if(CG_PX*CG_VX + CG_PY*CG_VY >= 0) continue            # not closing
    CG_TC = -(CG_PX*CG_VX+CG_PY*CG_VY)/(CG_VX*CG_VX+CG_VY*CG_VY)
    if(CG_TC < 14 || CG_TC > 50) continue                  # 12 min of marks must fit
    CG_CPA = sqrt((CG_PX+CG_VX*CG_TC)^2 + (CG_PY+CG_VY*CG_TC)^2)
    #  head-up frame: own course is +y, so her track crossing x=0 is her
    #  crossing your bow or your stern
    pxp =  CG_PX*cosd(CG_OC) - CG_PY*sind(CG_OC)
    pyp =  CG_PX*sind(CG_OC) + CG_PY*cosd(CG_OC)
    vxp =  CG_VX*cosd(CG_OC) - CG_VY*sind(CG_OC)
    vyp =  CG_VX*sind(CG_OC) + CG_VY*cosd(CG_OC)
    CG_PXP=pxp; CG_PYP=pyp; CG_VXP=vxp; CG_VYP=vyp
    if(fabs(vxp) < 1e-6) continue
    tc0 = -pxp/vxp
    if(tc0 <= 0.5) continue            # she must actually cross your track
    CG_AHEAD = ((pyp+vyp*tc0) > 0) ? 1 : 0
    #  drift over the twelve minutes of the run
    b0  = rbrg(CG_PX, CG_PY)
    b12 = rbrg(CG_PX+CG_VX*12, CG_PY+CG_VY*12)
    d   = sgn180(b12-b0)
    if(fabs(d) > 0.6 && fabs(d) < 4.0) continue     # neither clearly one nor the other
    CG_DRIFT = (fabs(d)<=0.6) ? "steady" : ((d>0) ? "right" : "left")
    #  a steady bearing is a collision, so the answer to "ahead or astern"
    #  has to be "neither" - keep those cases genuinely tight
    #  A steady bearing IS the collision, so the two must agree
    if(CG_DRIFT=="steady" && CG_CPA > 900) continue
    if(CG_DRIFT!="steady" && CG_CPA < 900) continue
    #  CPA band, kept clear of its own boundaries
    if(CG_CPA<1000)      band=1
    else if(CG_CPA<3000) band=2
    else if(CG_CPA<6000) band=3
    else                 band=4
    if(band==1 && CG_CPA>870) continue
    if(band==2 && (CG_CPA<1180 || CG_CPA>2650)) continue
    if(band==3 && (CG_CPA<3400 || CG_CPA>5400)) continue
    if(band==4 && (CG_CPA<6800 || CG_CPA>14000)) continue
    if(sqrt((CG_PX+CG_VX*12)^2+(CG_PY+CG_VY*12)^2) < 4000) continue
    if(band != CG_WANT) continue
    CG_BAND=band
    if(CG_DRIFT=="steady") CG_AHEAD = -1        # neither: she is CBDR
    return 1
  }
  return 0
}
function ct_obs(i){ return i*3 }
function ct_brg(i){ return rbrg(CG_PX+CG_VX*ct_obs(i), CG_PY+CG_VY*ct_obs(i)) }
function ct_rng(i){ return sqrt((CG_PX+CG_VX*ct_obs(i))^2 + (CG_PY+CG_VY*ct_obs(i))^2) }

# =====================================================================
#  The exercise: you have the plot, and the OOD is waiting.
# =====================================================================
function ct_track(seed,   i,b,r){
  if(!ct_gen(seed)){ print "  could not build a contact for that seed"; return 1 }
  print ""
  printf "  %s\n", cw("TRACKING PARTY -- you have the plot",C_ACC)
  hr()
  printf "  Own ship steady on course %s, speed %s knots.\n",
     cw(sprintf("%03d",CG_OC),C_ACC), cw(sprintf("%d",CG_OS),C_ACC)
  printf "  Night orders: nothing is to come inside %s.\n", cw("3,000 yards",C_ACC)
  print ""
  #  the relative column is as wide as the style needs, and vanishes
  #  entirely when the style is a true bearing and nothing else
  if(rstyle=="none") printf "      %-8s %-8s %9s\n", "time", "bearing", "range"
  else printf "      %-8s %-8s %-23s %9s\n", "time", "bearing", "relative", "range"
  for(i=0;i<5;i++){
    b=ct_brg(i); r=ct_rng(i)
    if(rstyle=="none")
      printf "      %04d     %03d      %9s\n", ct_obs(i), int(b+0.5)%360, ct_yd(r)
    else
      printf "      %04d     %03d      %-23s %9s\n", ct_obs(i), int(b+0.5)%360,
         rel_style(b-CG_OC), ct_yd(r) }
  hr()
  print ""
  printf "  %s\n", cw("Q1  Which way is her bearing drawing?",C_ACC)
  print  "     a) left      b) right      c) steady"
  print ""
  printf "  %s\n", cw("Q2  Where does she go?",C_ACC)
  print  "     a) she will cross ahead of you"
  print  "     b) she will pass astern of you"
  print  "     c) neither - the bearing is steady, and she is on a collision course"
  print ""
  printf "  %s\n", cw("Q3  Roughly what is her CPA?",C_ACC)
  print  "     a) under 1,000 yards          b) 1,000 to 3,000 yards"
  print  "     c) 3,000 to 6,000 yards       d) over 6,000 yards"
  print ""
  return 0
}
function ct_yd(v,   n,s,o){    # 14200 -> 14,200
  n=sprintf("%d", int(v/100+0.5)*100); s=""
  while(length(n)>3){ s="," substr(n,length(n)-2) s; n=substr(n,1,length(n)-3) }
  return n s
}
function ct_cpaline(){
  if(CG_CPA<250) return sprintf("CPA nil - she hits you in %d minutes", int(CG_TC+0.5))
  return sprintf("CPA %s yards at %d minutes", ct_yd(CG_CPA), int(CG_TC+0.5)) }
#  ---------------------------------------------------------------------
#  THE WORDS THE MARKING USES, AS FUNCTIONS.
#
#  These were printf statements inside ct_trackm(), which made them
#  impossible to check and impossible to port without typing them a
#  second time. The browser says the same things now, and
#  tests/contacts-web-diff.sh compares them seed by seed -- so "the same
#  exercise in both places" is a diff and not a claim. Same move as
#  lt_note(): a sentence the reader is given should come from one place.
#  ---------------------------------------------------------------------
function ct_side(){ return (sgn180(CG_TB - CG_OC) < 0) ? "port" : "starboard" }
function ct_toward(   rb){
  rb = sgn180(CG_TB - CG_OC)
  return ((rb<0 && CG_DRIFT=="right") || (rb>0 && CG_DRIFT=="left")) ? 1 : 0
}
function ct_q1state(){ return (CG_DRIFT=="steady") ? "steady" : ("drawing " CG_DRIFT) }
function ct_q1lead(){
  if(CG_DRIFT=="steady")
    return sprintf("She is on your %s bow and the bearing is not changing,", ct_side())
  return sprintf("She is on your %s bow and the bearing is drawing %s,",
                 ct_side(), (ct_toward() ? "TOWARD your bow" : "AWAY from your bow"))
}
function ct_q1why(){
  if(CG_DRIFT=="steady")
    return "which is the one thing that means collision. Constant bearing,\n" \
           "decreasing range. Rule 7(d)(i). Act now."
  if(ct_toward())
    return "so she is going to cross ahead of you. The miss is being built\n" \
           "in front of your bow, and it shrinks to nothing if the drift\n" \
           "stops. This is the one you keep calling out."
  return "so she cannot cross ahead of you. A contact drawing away from\n" \
         "your bow passes astern - the relative track is a straight line\n" \
         "and the bearing can never come back."
}
function ct_q2line(){
  #  plain ifs, not a split ternary: mawk refuses a newline at the ':'
  #  and gawk refuses it here too. CLAUDE.md rule 4, learned again.
  if(CG_AHEAD<0)  return "neither - she is CBDR"
  if(CG_AHEAD==1) return "she crosses ahead"
  return "she passes astern"
}
function ct_report(   rel){
  rel = rel_style(ct_brg(4)-CG_OC)
  return sprintf("Master 2, bearing %03d, %s%s, range %s, CPA %s at %d minutes.",
     int(ct_brg(4)+0.5)%360,
     (rel=="") ? "" : (rel ", "),
     ct_q1state(),
     ct_yd(ct_rng(4)),
     (CG_CPA<250) ? "nil" : ct_yd(CG_CPA), int(CG_TC+0.5))
}
function ct_findher(){
  return sprintf("(and if he still cannot find her: she is %s.)",
                 rel_other(ct_brg(4)-CG_OC))
}
function ct_advice(){
  if(CG_CPA >= 3000) return ""
  if(CG_CPA < 250)   return "Recommend coming right immediately to open the bearing."
  return "That is inside night orders. Recommend a course change."
}

function ct_ans1(){ return (CG_DRIFT=="left")?"a":((CG_DRIFT=="right")?"b":"c") }
function ct_ans2(){ return (CG_AHEAD<0)?"c":((CG_AHEAD==1)?"a":"b") }
function ct_ans3(){ return substr("abcd",CG_BAND,1) }

function ct_trackm(seed,a1,a2,a3,   ok,n,n2,i2){
  if(!ct_gen(seed)) return 1
  a1=tolower(substr(a1,1,1)); a2=tolower(substr(a2,1,1)); a3=tolower(substr(a3,1,1))
  n=0
  if(a1==ct_ans1()) n++
  if(a2==ct_ans2()) n++
  if(a3==ct_ans3()) n++
  print ""
  ct_plot(CG_PXP,CG_PYP,CG_VXP,CG_VYP,5,3,1)
  printf "  %s\n", cwd("Y = you, head up. 1 to 5 = her, three minutes apart. * = CPA.")
  printf "  %s\n", cwd("The upright line is your own track. Which side of you she")
  printf "  %s\n", cwd("crosses it is the whole question.")
  print ""
  printf "  Q1  bearing %s   %s\n", cw(ct_q1state(),C_ACC),
     (a1==ct_ans1()? cw("- right",C_ACC) : "- you said " toupper(a1==""?"-":a1))
  printf "      %s\n", ct_q1lead()
  n2 = split(ct_q1why(), WHY, "\n")
  for(i2=1;i2<=n2;i2++) printf "      %s\n", WHY[i2]
  print ""
  printf "  Q2  %s   %s\n", cw(ct_q2line(),C_ACC),
     (a2==ct_ans2()? cw("- right",C_ACC) : "- you said " toupper(a2==""?"-":a2))
  printf "  Q3  %s   %s\n",
     cw(ct_cpaline(),C_ACC),
     (a3==ct_ans3()? cw("- right",C_ACC) : "- you said " toupper(a3==""?"-":a3))
  print ""
  printf "  %s\n", cw("What you would say:",C_ACC)
  printf "  \"%s\"\n", ct_report()
  printf "  %s\n", cwd(ct_findher())
  if(ct_advice()!="") printf "  \"%s\"\n", ct_advice()
  print ""
  printf "  %s\n", cw(sprintf("%d of 3.",n),C_ACC)
  print ""
  return (n==3)?0:1
}

# ---------------------------------------------------------------------
#  The relative-bearing rose, drawn from the definitions rather than
#  laid out by hand, so it cannot disagree with rel_phrase().
# ---------------------------------------------------------------------
function ct_rose(   w,h,cx,cy,rx,ry,t,i,lab,c,r){
  if(FIGDUMP){ print "@@FIG rose"; return 0 }     # see the note in ct_plot
  w=67; h=17; cx=int(w/2); cy=int(h/2); rx=cx-11; ry=cy-2
  gclear(w,h); G_NOCROP=1
  for(t=0;t<360;t+=1.2) gputwc(cy-ry*cosd(t), cx+rx*sind(t), ".", C_DIM)
  for(t=-135;t<=135;t+=45){
    if(t==0) continue
    for(r=0.25;r<=1.0;r+=0.04) gputwc(cy-ry*r*cosd(t), cx+rx*r*sind(t), "/", C_DIM) }
  for(i=1;i<=ry;i++) gputwc(cy-i,cx,"|",C_DIM)
  gputsc(cy-1,cx-1,"^^^",C_ACC); gputc(cy,cx,"Y",C_ACC)
  gputsc(0,cx-7,"000 RIGHT AHEAD",C_ACC)
  gputsc(h-1,cx-8,"180 RIGHT ASTERN",C_ACC)
  gputsc(cy-int(ry*0.72), cx+int(rx*0.72)+2, "Green 45", "")
  gputsc(cy-int(ry*0.72), cx-int(rx*0.72)-10, "Red 45", "")
  gputsc(cy, cx+rx+2, "Green 90", "")
  gputsc(cy, cx-rx-8, "Red 90", "")
  gputsc(cy+int(ry*0.72), cx+int(rx*0.72)+2, "Green 135", "")
  gputsc(cy+int(ry*0.72), cx-int(rx*0.72)-9, "Red 135", "")
  gshow()
  return 0
}

# =====================================================================
#  The lessons.
# =====================================================================
function ct_lesson(id,   x){
  if(id=="C1"){ thead("C1","Relative motion - the only plot that answers the question")
    tp("You cannot steer a ship by watching how a contact moves over the ground.")
    tp("What matters is how she moves relative to YOU, and in relative motion")
    tp("she does something very simple: she travels in a straight line.")
    tb()
    tp("Put yourself at the centre and plot where she is relative to you every")
    tp("three minutes. Those marks fall on a straight line. Extend it. Where it")
    tp("passes you is the CPA, and which side of you it passes is the whole")
    tp("question - ahead, or astern.")
    tb()
    ct_plot(-9000,13000,760,-1120,5,3,1)
    tp(cwd("Y = you, head up.  1 to 5 = her, three minutes apart.  * = CPA"))
    tb()
    tp("Two things follow, and everything else in this section comes out of them:")
    tb()
    tp("  1. Because the line is straight, the bearing sweeps one way and one")
    tp("     way only. It can never reverse. Whatever it is doing now, it will")
    tp("     go on doing until somebody alters course.")
    tp("  2. If the line goes through the centre, the bearing does not change")
    tp("     at all - and that is a collision.")
    tb() }
  else if(id=="C2"){ thead("C2","Drift toward the bow, and drift away from it")
    tp("This is the whole trade, and it is one sentence:")
    tb()
    tp("  " cw("A bearing drawing AWAY from your bow will pass astern of you.",C_ACC))
    tp("  " cw("A bearing drawing TOWARD your bow will cross ahead of you.",C_ACC))
    tb()
    tp("On the left, drawing left: she goes down your side and astern.")
    tp("On the left, drawing right: she is going to cross your bow.")
    tp("On the right, drawing right: astern.  On the right, drawing left: ahead.")
    tb()
    tp("This is not a rule of thumb. It is a consequence of the straight line in")
    tp("C1: the bearing sweeps one way, so a contact drawing away from your bow")
    tp("can never come back to it. There are no exceptions and no edge cases.")
    tb()
    tp("Which is why one of the two is a report and the other is a warning.")
    tp("Drawing away, the miss is behind you and it is getting bigger. Drawing")
    tp("toward, the miss is being built in front of your bow - and it shrinks to")
    tp("nothing the moment the drift slows. A contact drawing slowly toward your")
    tp("bow is a collision that has not finished making up its mind.")
    tb()
    tp("Say it as a pair, always, because one word without the other is useless:")
    tb()
    tp("  " cw("\"On the left, drawing left.\"   \"On the left, drawing right.\"",C_ACC))
    tb() }
  else if(id=="C3"){ thead("C3","Constant bearing, decreasing range")
    tp("Rule 7(d)(i): risk of collision shall be deemed to exist if the compass")
    tp("bearing of an approaching vessel does not appreciably change.")
    tb()
    tp("Deemed. Not estimated, not assessed - deemed. You do not get to argue")
    tp("with it, and you do not wait for the range to confirm it.")
    tb()
    ct_plot(-7000,11000,466,-733,5,3,1)
    tp(cwd("A steady bearing. The line goes through the middle. That is all a"))
    tp(cwd("collision is: two ships keeping the same bearing on each other."))
    tb()
    tp("But read the second half of the rule, which is the half that kills people:")
    tb()
    tp("  " cw("7(d)(ii): such risk may sometimes exist even when an appreciable",C_ACC))
    tp("  " cw("bearing change is evident, particularly when approaching a very",C_ACC))
    tp("  " cw("large vessel or a tow, or when approaching a vessel at close range.",C_ACC))
    tb()
    tp("Three reasons, and they are all about the ship being bigger than the dot")
    tp("you are plotting:")
    tb()
    tp("  1. " cw("A very large vessel.",C_ACC) " You take the bearing of her bridge.")
    tp("     She is 300 metres long. Her bow is a cable and a half from the mark")
    tp("     you plotted, and it is the bow that reaches you.")
    tp("  2. " cw("A tow.",C_ACC) " The tug draws clear beautifully. The barge 200 metres")
    tp("     astern of her on a wire does not, and at night you may not see it.")
    tp("  3. " cw("Close range.",C_ACC) " Bearing drift goes as range squared. At two miles a")
    tp("     degree a minute is comfortable; at four cables the same drift rate")
    tp("     is a miss of a few yards.")
    tb() }
  else if(id=="C4"){ thead("C4","The report")
    tp("The report exists so that a man who is not looking at the plot can act on")
    tp("it without asking a question. It has a fixed shape for the same reason a")
    tp("helm order does.")
    tb()
    tp("  " cw("\"Master 2, bearing 311, Red 20, drawing left, range 14,200,",C_ACC))
    tp("  " cw("   CPA 4,100 yards at 18 minutes.\"",C_ACC))
    tb()
    tp("   " cw("Master 2",C_ACC) "     which contact. Numbered so that nobody has to say")
    tp("                \"the one on the left\" with four of them on the left.")
    tp("   " cw("bearing 311",C_ACC) "  where she is. True, and said in three digits,")
    tp("                because that is what goes on the plot and what")
    tp("                agrees with the radar.")
    tp("   " cw("Red 20",C_ACC) "       where to LOOK. Twenty degrees off the port bow.")
    tp("                Nobody at the wheel can turn 311 true into a")
    tp("                direction to point his face in, and he should not")
    tp("                have to. See C7 - and note that this half of the")
    tp("                report goes stale the moment you alter course.")
    tp("   " cw("drawing left",C_ACC) " what she is DOING. A word, not a number, because")
    tp("                this is the part the OOD acts on and he must not have")
    tp("                to work it out from two bearings in his head.")
    tp("   " cw("range 14,200",C_ACC) " how long you have.")
    tp("   " cw("CPA and time",C_ACC) " how bad it gets, and when.")
    tb()
    tp("Bearing before drift, always. The bearing tells him where to look; the")
    tp("drift tells him whether to care. Reversed, he spends the first half of")
    tp("the sentence not knowing which contact you mean.")
    tb()
    tp("And say the drift even when there is not any. " cw("\"Steady\"",C_ACC) " is the most")
    tp("important word in the report. Silence about the drift reads as \"I have")
    tp("not looked\", which is the same as \"steady\" but arrives too late.")
    tb()
    tp("What he does with it: nothing at all, if she is drawing away and the CPA")
    tp("is outside night orders. That is most of them, and the discipline is to")
    tp("report those the same way and in the same voice as the one that is not.")
    tb() }
  else if(id=="C7"){ thead("C7","Relative bearings - so he can find her")
    tp("A true bearing is for the plot. A relative bearing is for the eye.")
    tb()
    tp("Nobody standing at the wheel on a black night can turn 311 degrees")
    tp("true into a direction to look in. He would have to remember the")
    tp("heading, subtract, and work out which side the answer fell on, while")
    tp("steering. Tell him she is fine on the starboard bow and his head is")
    tp("already turning.")
    tb()
    ct_rose()
    tb()
    tp("Two ways of saying the number, and you will hear both.")
    tb()
    tp("  " cw("Red and Green.",C_ACC) " Red 20 is 20 degrees to port, Green 30 is 30")
    tp("  to starboard, nought to 180 each side. Royal Navy and British")
    tp("  practice, and the reason it sticks is that the colours are the")
    tp("  sidelights: your own red light looks out over your port bow, so")
    tp("  Red is port. It is unambiguous over a bad intercom because the")
    tp("  side is a word, not a number that can be misheard.")
    tb()
    tp("  " cw("Port and starboard.",C_ACC) " \"Port 20\", \"Starboard 30\". The same thing")
    tp("  in plainer words. United States practice also uses the full")
    tp("  circle - \"bearing 340 relative\" - measured clockwise from your")
    tp("  own bow, which is neater on a plot and worse in the dark.")
    tb()
    tp("And the words, which need no number at all:")
    tb()
    tp("    " cw("right ahead",C_ACC) "                       000")
    tp("    " cw("fine on the bow",C_ACC) "         out to about 35")
    tp("    " cw("broad on the bow",C_ACC) "                   045")
    tp("    " cw("on the beam",C_ACC) "                        090")
    tp("    " cw("broad on the quarter",C_ACC) "               135")
    tp("    " cw("fine on the quarter",C_ACC) "     in from about 145")
    tp("    " cw("right astern",C_ACC) "                       180")
    tb()
    tp("Broad on the bow is four points, and four points is 45 degrees.")
    tp("Broad on the quarter is four points the other way from astern.")
    tp("Everything in the middle is fine, and everything near the beam is")
    tp("the beam. The edges are convention, not law - nobody will correct")
    tp("you for calling 40 degrees fine rather than broad, and nobody will")
    tp("misunderstand you either. That is the point of them.")
    tb()
    tp(cw("  Now the trap, and it is a real one.",C_ACC))
    tb()
    tp("A relative bearing changes when SHE moves. It also changes when YOU")
    tp("move, by exactly as much, and it cannot tell you which happened.")
    tb()
    tp("Alter twenty degrees to starboard and every contact on the board")
    tp("draws twenty degrees left, all at once, with nothing at all having")
    tp("changed out in the water. A contact that holds Green 30 through your")
    tp("turn has in fact swung twenty degrees - which is the opposite of the")
    tp("comfort a steady relative bearing seems to offer.")
    tb()
    tp("So: " cw("bearing drift is measured in TRUE bearings, or on a steady",C_ACC))
    tp(cw("  course, and never across a turn.",C_ACC) " Everything in C2 and C3")
    tp("assumes it. If you take marks either side of an alteration and read")
    tp("the drift off them, you will get a confident answer that is wholly")
    tp("invented. Take the marks, alter, settle, and start a fresh plot.")
    tb()
    tp("This is also, from the other end, exactly why Ekelund works: the")
    tp("change you put in yourself is known, so it can be subtracted out.")
    tb()
    tp("On a yacht it is the same problem in cheaper equipment. A hand")
    tp("bearing compass gives you a magnetic bearing you can plot. A pair")
    tp("of eyes and a shroud gives you a relative bearing, instantly, in")
    tp("the dark, with no instrument at all - and the shroud stays where it")
    tp("is only while you hold your course. Steer straight for the two")
    tp("minutes you are watching her, or the drift is worthless.")
    tb()
    tp("Which of these this program uses is a setting, because the right")
    tp("answer depends entirely on who is listening.  " cw("colregs style",C_ACC) ", or s")
    tp("from the contacts menu, and it describes each one before you pick.")
    tb()
    tp("Say both, when it matters: the true bearing so it can be plotted,")
    tp("the relative so it can be seen.")
    tb()
    tp("  " cw("\"Master 2, bearing 311, Red 20, drawing left, range 14,200.\"",C_ACC))
    tb() }
  else if(id=="C5"){ thead("C5","The arithmetic you do in your head")
    tp("The plot is the truth, but it is always four minutes old. These get you")
    tp("close enough to open your mouth now.")
    tb()
    tp(cw("  The three-minute rule",C_ACC))
    tp("  Yards in three minutes = speed in knots times 100.")
    tp("  12 knots is 1,200 yards in three minutes. That is why marks are taken")
    tp("  every three minutes: the range change IS the speed, with two noughts.")
    tb()
    tp(cw("  The six-minute rule",C_ACC))
    tp("  Miles in six minutes = speed divided by 10. 15 knots, 1.5 miles.")
    tb()
    tp(cw("  Time to CPA",C_ACC))
    tp("  Range divided by closing rate. Closing rate is the range change per")
    tp("  minute - read it straight off two marks, no trigonometry.")
    tp("  8,000 yards closing 600 a minute is thirteen minutes. That is the")
    tp("  number that decides whether you have time to be polite about it.")
    tb()
    tp(cw("  One in sixty, for the CPA itself",C_ACC))
    tp("  " cw("One degree at one mile is about 35 yards.",C_ACC) " So:")
    tb()
    tp("     CPA  =  range in miles  x  degrees she still has to drift  x  35")
    tb()
    tp("  She will drift, from now until CPA, at the rate she is drifting now.")
    tp("  So take the drift per minute, multiply by the minutes to CPA, and that")
    tp("  is the degrees. Worked: 4 miles, drifting 1.5 degrees a minute, 13")
    tp("  minutes to run. 1.5 x 13 = 20 degrees. 4 x 20 x 35 = 2,800 yards.")
    tb()
    tp("  It is rough. It is meant to be. It tells you which side of the night")
    tp("  orders you are on before the plot can, and that is the whole job.")
    tb() }
  else if(id=="C6"){ thead("C6","Ekelund - range out of a course change")
    tp("On a steady course, bearing rate alone cannot give you range. A slow")
    tp("contact close in and a fast one far out produce exactly the same drift,")
    tp("and no amount of watching will separate them.")
    tb()
    tp("So you change the geometry yourself. Run a leg, note the bearing rate;")
    tp("alter course or speed, settle, run another leg, note it again. Her")
    tp("motion across your line of sight has not changed - she is doing what she")
    tp("was doing. Every bit of the change in bearing rate is YOURS, and it is")
    tp("yours by a known amount. That gives you the range:")
    tb()
    tp("  " cw("range in kiloyards  =  1.91 x (change in your speed across the",C_ACC))
    tp("  " cw("                        line of sight, knots)",C_ACC))
    tp("  " cw("                        / (change in bearing rate, deg per min)",C_ACC))
    tb()
    tp("  Your speed across the line of sight is your speed times the sine of")
    tp("  the angle between your course and her bearing. Beam on, all of it;")
    tp("  dead ahead, none of it.")
    tb()
    tp("  The 1.91 is just units: 2,000 yards to the mile over 60 minutes,")
    tp("  times 57.3 degrees to the radian.")
    tb()
    tp("Worked. She bears 040. You are on 000 at 12 knots and her bearing is")
    tp("opening 0.9 degrees a minute. You come round to 090, still 12 knots,")
    tp("and it settles at 2.4 a minute.")
    tb()
    tp("  across, leg 1 = 12 x sin(000 - 040) = -7.7 knots")
    tp("  across, leg 2 = 12 x sin(090 - 040) =  9.2 knots")
    tp("  range = 1.91 x (9.2 - -7.7) / (0.9 - 2.4) = 1.91 x 16.9 / -1.5")
    tp("        = -21.5 ... take the size: 21,500 yards.")
    tb()
    tp("Three things will ruin it, and they are worth knowing better than the")
    tp("formula:")
    tp("  1. She manoeuvres during the legs. The whole method assumes she did")
    tp("     not, and it cannot tell you that she did - it just gives you a")
    tp("     confident wrong answer.")
    tp("  2. The legs are too short, or you take the rate before the ship has")
    tp("     settled on the new course.")
    tp("  3. You barely changed your speed across the line of sight. Then the")
    tp("     top of the fraction is small, the bottom is smaller, and the noise")
    tp("     runs the answer. Turn far enough to matter.")
    tb()
    tp("Which is the real lesson of it: a solution you have not manoeuvred")
    tp("against is a guess wearing a number.")
    tb() }
  return 0
}

# =====================================================================
#  Ekelund drill: two legs, two bearing rates, how far off is she?
# =====================================================================
#  NOT a parameter called tb: tb() is the blank-line helper in the engine,
#  and awk will not let a function name be used as a variable. gawk lets
#  it pass; mawk refuses to parse the file at all.
function ek_across(sp,co,bg){ return sp*sind(co-bg) }
function ek_rate(R,bg,cs,cc,os,oc){
  return ((ek_across(cs,cc,bg) - ek_across(os,oc,bg))*ktym()/R)*57.2957795130823 }
#  WHAT A PLOT AT A TENTH OF A DEGREE A MINUTE WOULD GIVE YOU.
#
#  A small negative rate rounds to zero, and IEEE gives that zero a
#  sign. gawk and mawk keep the sign bit; one-true-awk, which is macOS's
#  /usr/bin/awk, normalises it away. So the same exercise, from the same
#  seed, printed "-0.0 deg/min" on Linux and "+0.0" on a Mac -- and the
#  legend directly under it says a rate is + when the bearing is drawing
#  right. Three of the sixty seeds told a Mac reader the bearing was
#  going the other way. Found by tests/contacts-web-diff.sh on Larry's
#  machine; it passed on every awk I had.
#
#  Resolved by not making the claim: a plot at this resolution cannot
#  tell you the direction of so small a drift, so neither does this.
#  Zero is zero, unsigned, on every platform.
function ek_plot(r,   v){
  v = int(r*10 + (r<0 ? -0.5 : 0.5))/10
  if(v==0) v = 0                       # -0 and +0 compare equal; this stores +0
  return v
}
#  and the sign is forced on everything EXCEPT that zero
function ek_rfmt(r){
  return (r==0) ? sprintf("%5.1f", 0) : sprintf("%+5.1f", r)
}
function ek_gen(seed,   try,r1,r2,a1,a2,est,band,eband){
  xsrand(seed+0)
  EK_WANT = 1 + int(xrand()*4)
  for(try=0; try<6000; try++){
    EK_R  = 5000 + int(xrand()*300)*100
    EK_TB = int(xrand()*360)
    EK_CC = int(xrand()*360); EK_CS = 4 + int(xrand()*17)
    EK_C1 = int(xrand()*360); EK_S1 = 6 + int(xrand()*15)
    EK_C2 = int(xrand()*360); EK_S2 = 6 + int(xrand()*15)
    a1 = ek_across(EK_S1,EK_C1,EK_TB); a2 = ek_across(EK_S2,EK_C2,EK_TB)
    if(fabs(a2-a1) < 6) continue                  # too small a change to be worth it
    r1 = ek_rate(EK_R,EK_TB,EK_CS,EK_CC,EK_S1,EK_C1)
    r2 = ek_rate(EK_R,EK_TB,EK_CS,EK_CC,EK_S2,EK_C2)
    EK_R1 = ek_plot(r1)                           # what the plot would give you
    EK_R2 = ek_plot(r2)
    if(fabs(EK_R1)>9 || fabs(EK_R2)>9) continue
    if(fabs(EK_R1-EK_R2) < 0.6) continue
    est = 1909.86*(a2-a1)/(EK_R1-EK_R2)
    if(est<0) est=-est
    if(fabs(est-EK_R)/EK_R > 0.06) continue       # rounding must not move the answer
    EK_EST = est
    band  = (EK_R<8000)?1:((EK_R<15000)?2:((EK_R<25000)?3:4))
    eband = (est<8000)?1:((est<15000)?2:((est<25000)?3:4))
    if(band!=eband || band!=EK_WANT) continue
    if(band==1 && EK_R>7200) continue
    if(band==2 && (EK_R<8900 || EK_R>13800)) continue
    if(band==3 && (EK_R<16200 || EK_R>23200)) continue
    if(band==4 && EK_R<27000) continue
    EK_A1=a1; EK_A2=a2; EK_BAND=band
    return 1
  }
  return 0
}
function ek_show(seed){
  if(!ek_gen(seed)){ print "  could not build a leg pair"; return 1 }
  print ""
  printf "  %s\n", cw("EKELUND -- how far off is she?",C_ACC)
  hr()
  printf "  She bears %s and holds her course and speed throughout.\n", cw(sprintf("%03d",EK_TB),C_ACC)
  print  "  You have bearings only. No range."
  print ""
  printf "     leg 1   own course %03d, speed %2d   bearing rate %s deg/min\n", EK_C1, EK_S1, ek_rfmt(EK_R1)
  printf "     leg 2   own course %03d, speed %2d   bearing rate %s deg/min\n", EK_C2, EK_S2, ek_rfmt(EK_R2)
  print ""
  print  "     (a bearing rate is + when the bearing is drawing right)"
  hr()
  print ""
  printf "  %s\n", cw("How far off is she?",C_ACC)
  print  "     a) under 8,000 yards           b) 8,000 to 15,000 yards"
  print  "     c) 15,000 to 25,000 yards      d) over 25,000 yards"
  print ""
  return 0
}
function ek_mark(seed,ans,   ok){
  if(!ek_gen(seed)) return 1
  ans=tolower(substr(ans,1,1))
  ok = (ans==substr("abcd",EK_BAND,1))
  print ""
  if(!ok) printf "  %s\n", cw("Not quite.",C_ACC)
  printf "  %s\n", cw(sprintf("%s is right -- she is %s yards off.",
     toupper(substr("abcd",EK_BAND,1)), ct_yd(EK_R)),C_ACC)
  print ""
  printf "     across the line of sight, leg 1 = %2d x sin(%03d - %03d) = %+6.1f kt\n",
     EK_S1, EK_C1, EK_TB, EK_A1
  printf "     across the line of sight, leg 2 = %2d x sin(%03d - %03d) = %+6.1f kt\n",
     EK_S2, EK_C2, EK_TB, EK_A2
  printf "     change in across = %+.1f     change in rate = %+.1f deg/min\n",
     EK_A2-EK_A1, EK_R1-EK_R2
  printf "     range = 1.91 x %.1f / %.1f = %s yards\n",
     EK_A2-EK_A1, EK_R1-EK_R2, ct_yd(EK_EST)
  print ""
  print  "  Her motion across your line of sight never changed. All of the"
  print  "  change in bearing rate was yours, and you knew exactly how much"
  print  "  of it you put in. That is the whole trick."
  print ""
  return ok?0:1
}

# =====================================================================
function ct_syl(done,   i,n,ids,a,ttl,mark){
  n=split("C1|Relative motion - the only plot that answers the question;" \
          "C2|Drift toward the bow, and drift away from it;" \
          "C3|Constant bearing, decreasing range;" \
          "C4|The report;" \
          "C5|The arithmetic you do in your head;" \
          "C6|Ekelund - range out of a course change;" \
          "C7|Relative bearings - so he can find her", ids, ";")
  print ""
  printf "  %s\n", cw("CONTACTS -- seven lessons",C_ACC)
  hr()
  ttl=0
  for(i=1;i<=n;i++){
    split(ids[i],a,"|")
    mark = (index("," done ",", "," a[1] ",")>0) ? "x" : " "
    if(mark=="x") ttl++
    printf "   [%s]  %-4s %s\n", mark, a[1], a[2]
  }
  hr()
  printf "  %d of %d done.  Type a code (C1 ... C7), t to track a contact,\n", ttl, n
  print  "  e for an Ekelund leg pair, or return to go back."
  print ""
  return 0
}
function ct_ref(){
  print ""
  printf "  %s\n", cw("CONTACTS -- the card",C_ACC)
  hr()
  print  "  Away from your bow  ->  she passes ASTERN. Always. No exceptions."
  print  "  Toward your bow     ->  she CROSSES AHEAD. The miss is in front"
  print  "                          of you, and it shrinks as the drift slows."
  print  "  No drift at all     ->  collision. Rule 7(d)(i). Deemed, not judged."
  print ""
  print  "  On the left, drawing left ... she goes astern."
  print  "  On the left, drawing right ... she crosses your bow."
  print  "  On the right, drawing right ... astern.  Drawing left ... ahead."
  print ""
  print  "  Risk anyway, even with good drift -- Rule 7(d)(ii):"
  print  "    a very large vessel   you plotted her bridge, her bow is nearer"
  print  "    a tow                 the tug clears, the barge astern does not"
  print  "    close range           drift goes as range squared"
  print ""
  printf "  Report:  Master 2, bearing 311, %sdrawing left,\n",
     (rel_style(-20)=="") ? "" : (rel_style(-20) ", ")
  print  "           range 14,200, CPA 4,100 yards at 18 minutes."
  print  "           Bearing before drift. Say \"steady\" out loud."
  print  "           True for the plot, relative for the eye."
  print ""
  print  "  Relative:  Red = port, Green = starboard, 0 to 180 each side."
  print  "    000 right ahead   ~35 fine on the bow   045 broad on the bow"
  print  "    090 on the beam   135 broad on the quarter   180 right astern"
  print  "  Relative bearings move when YOU turn. Drift is measured in"
  print  "  TRUE bearings, or on a steady course. Never across a turn."
  print ""
  print  "  3 min : yards = knots x 100      6 min : miles = knots / 10"
  print  "  time to CPA = range / closing rate per minute"
  print  "  CPA  =  miles  x  degrees left to drift  x  35"
  print  "  Ekelund kyd = 1.91 x change in speed across / change in rate"
  hr()
  print ""
  return 0
}
