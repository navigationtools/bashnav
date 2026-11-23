# =====================================================================
#  colregs -- the engine
#  Lights, shapes, encounters, sound signals and the rules themselves,
#  drawn in characters.  Pure POSIX awk.
# =====================================================================

function d2r(x){ return x*0.0174532925199432958 }
function sind(x){ return sin(x*0.0174532925199432958) }
function cosd(x){ return cos(x*0.0174532925199432958) }
function fabs(x){ return (x<0)?-x:x }
function nrm360(x){ x=x-360*int(x/360); if(x<0) x+=360; return x }
function nrm180(x){ x=nrm360(x); if(x>180) x-=360; return x }

# ---- colour ----------------------------------------------------------
#  day   : white on black, lights in their true colours
#  night : everything red, because dark adaptation is worth more than
#          a pretty screen.  Every light also carries its letter, so the
#          pattern is still unambiguous with no colour at all.
function col_init(   e){
  if(COL_READY) return
  e=sprintf("%c",27)
  if(cmode=="night"){
    C_BASE=e "[40m" e "[31m"; C_ACC=e "[1;31m"; C_DIM=e "[2;31m"
    K_W=e "[1;31m"; K_R=e "[1;31m"; K_G=e "[1;31m"; K_Y=e "[1;31m"
  } else if(cmode=="day"){
    C_BASE=e "[40m" e "[37m"; C_ACC=e "[1;32m"; C_DIM=e "[90m"
    K_W=e "[1;97m"; K_R=e "[1;91m"; K_G=e "[1;92m"; K_Y=e "[1;93m"
  } else {
    C_BASE=""; C_ACC=""; C_DIM=""; K_W=""; K_R=""; K_G=""; K_Y=""
  }
  C_RST=C_BASE
  if(cmode=="night"){ C_PANEL=e "[40m" e "[31m"; C_EOL=e "[K" C_BASE }
  else if(cmode=="day"){ C_PANEL=e "[40m" e "[37m"; C_EOL=e "[K" C_BASE }
  else { C_PANEL=""; C_EOL="" }
  COL_READY=1
  return 0
}
function cw(s,c){ col_init(); if(c=="") return s; return c s C_RST }
function cwd(s){ col_init(); return cw(s,C_DIM) }
function kcol(c){ col_init()
  if(c=="R") return K_R; if(c=="G") return K_G; if(c=="Y") return K_Y; return K_W }

# ---- canvas ----------------------------------------------------------
# ---- a reproducible pseudo-random generator -------------------------
#  awk's own srand()/rand() is not reproducible across implementations:
#  mawk re-seeds from the clock even when handed an explicit seed, which
#  would make a drill and its marking disagree.  MINSTD is exact in
#  double precision and gives the same stream everywhere.
function xsrand(s,   i){
  RS_ = int(s) % 2147483647
  if(RS_ <= 0) RS_ += 2147483646
  for(i=0;i<8;i++) RS_ = (16807*RS_) % 2147483647
  return 0
}
function xrand(){ RS_ = (16807*RS_) % 2147483647; return RS_/2147483647.0 }

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
#  The drawing is always painted as its own black panel with light text,
#  whatever the terminal profile is set to - otherwise white artwork on a
#  white Terminal background is invisible.  Only the lamps carry colour.
function gshow(   r,c,line,cur,last,cc,r0){
  r0=0
  if(!G_NOCROP)
  for(r=0;r<PH;r++){ last=-1
    for(c=0;c<PW;c++) if(G[r,c]!=" ") last=c
    if(last>=0){ r0=r; break }
  }
  for(r=r0;r<PH;r++){
    last=-1
    for(c=0;c<PW;c++) if(G[r,c]!=" ") last=c
    line=""; cur=""
    for(c=0;c<=last;c++){
      cc=GC[r,c]
      if(cc!=cur){ line=line (cc==""? C_PANEL : cc); cur=cc }
      line=line G[r,c]
    }
    print "  " C_PANEL line C_EOL
  }
  return 0
}
function hr(){ print "  ----------------------------------------------------------------------" }
function tp(s){ print "  " s }
function tb(){ print "" }

# =====================================================================
#  Lights.  Each light is  x,y,h,arc,colour
#    x   fore-and-aft position, +0.5 bow to -0.5 stern
#    y   athwartships, + to starboard
#    h   height above the waterline, 0 to 1
#    arc M masthead 225 deg | S starboard 112.5 | P port 112.5
#        T sternlight 135  | A all round        | Y towing (as stern)
#    colour W R G Y
#  Visibility is decided by the arc and the bearing of the observer from
#  the vessel, so the same table draws the vessel from any angle.
# =====================================================================
function lights_init(   i,n,a){
  if(LT_READY) return
  MF = "0.15,0,0.72,M,W"                    # masthead, forward
  MA = "-0.10,0,0.92,M,W"                   # masthead, aft and higher
  SG = "0.06,0.11,0.42,S,G"                 # starboard sidelight
  SR = "0.06,-0.11,0.42,P,R"                # port sidelight
  ST = "-0.46,0,0.36,T,W"                   # sternlight
  TY = "-0.46,0,0.50,T,Y"                   # towing light, yellow
  LT_READY=1
  return 0
}
function ar(x,y,h,c){ return sprintf("%.3f,%.3f,%.3f,A,%s,",x,y,h,c) }
#  Same, but out on a yard: the drawing joins these to their partner with
#  a spar, so three greens read as one on the mast and two on the yard
#  rather than as three greens scattered across the sky.
function yd(x,y,h,c){ return sprintf("%.3f,%.3f,%.3f,A,%s,yard",x,y,h,c) }

# vessel table: key | short name | rule | lights (semicolon list) | note
function ves_init(   i,n,a){
  if(VES_READY) return
  lights_init()
  VT[1]  = "power50|Power-driven vessel under 50 m, under way|Rule 23|" MF ";" SG ";" SR ";" ST "|One masthead light, sidelights, sternlight."
  VT[2]  = "power50p|Power-driven vessel of 50 m or more, under way|Rule 23|" MF ";" MA ";" SG ";" SR ";" ST "|Two masthead lights, the after one higher."
  VT[3]  = "sail|Sailing vessel under way|Rule 25|" SG ";" SR ";" ST "|Sidelights and a sternlight. No masthead light - that is the whole point."
  VT[4]  = "sailrg|Sailing vessel, optional all-round pair|Rule 25|" SG ";" SR ";" ST ";" ar(0.15,0,0.80,"R") ";" ar(0.15,0,0.70,"G") "|Red over green at the masthead, with normal sidelights and sternlight."
  VT[5]  = "anchor|Vessel at anchor, under 50 m|Rule 30|" ar(0.35,0,0.70,"W") "|A single all-round white light where it can best be seen."
  VT[6]  = "anchor50|Vessel at anchor, 50 m or more|Rule 30|" ar(0.38,0,0.80,"W") ";" ar(-0.35,0,0.55,"W") "|Two all-round whites, forward one higher, and she may have her decks lit (required at 100 m and over)."
  VT[7]  = "aground|Vessel aground|Rule 30|" ar(0.35,0,0.72,"W") ";" ar(0.10,0,0.88,"R") ";" ar(0.10,0,0.78,"R") "|Anchor light or lights, plus two all-round reds in a vertical line."
  VT[8]  = "nuc|Not under command, making no way|Rule 27|" ar(0.10,0,0.88,"R") ";" ar(0.10,0,0.78,"R") "|Two all-round reds. Nothing else if she is not moving through the water."
  VT[9]  = "nucway|Not under command, making way|Rule 27|" ar(0.10,0,0.88,"R") ";" ar(0.10,0,0.78,"R") ";" SG ";" SR ";" ST "|Two all-round reds, and because she is making way, sidelights and sternlight too."
  VT[10] = "ram|Restricted in her ability to manoeuvre|Rule 27|" ar(0.10,0,0.99,"R") ";" ar(0.10,0,0.89,"W") ";" ar(0.10,0,0.79,"R") ";" MF ";" SG ";" SR ";" ST "|Red, white, red in a vertical line. Making way, so the ordinary lights as well.|the lower two of her three lights are red over white, which on its own is a vessel fishing. The third light, red on top, is what makes her restricted in her ability to manoeuvre."
  VT[11] = "draught|Constrained by her draught|Rule 28|" ar(0.10,0,0.99,"R") ";" ar(0.10,0,0.89,"R") ";" ar(0.10,0,0.79,"R") ";" MF ";" SG ";" SR ";" ST "|Three all-round reds in a vertical line, over the ordinary power-driven lights."
  VT[12] = "trawl|Vessel trawling|Rule 26|" ar(0.15,0,0.88,"G") ";" ar(0.15,0,0.76,"W") ";" SG ";" SR ";" ST "|Green over white. Green for a trawl dragged along the bottom.|green over white is trawling; red over white is fishing other than trawling. Green for the gear dragged along the ground."
  VT[13] = "fishing|Fishing, other than trawling|Rule 26|" ar(0.15,0,0.88,"R") ";" ar(0.15,0,0.76,"W") ";" SG ";" SR ";" ST "|Red over white. The old rhyme: red over white, fishing at night.|red over white is fishing other than trawling; green over white is a trawler. Both keep gear streamed a long way from the vessel."
  VT[14] = "pilot|Pilot vessel on duty|Rule 29|" ar(0.15,0,0.88,"W") ";" ar(0.15,0,0.76,"R") ";" SG ";" SR ";" ST "|White over red: pilot ahead. Sidelights and sternlight when under way.|white over red is the pilot; red over white is fishing. They are the same two colours the other way up, and it is the commonest mistake made at night."
  VT[15] = "tow200|Towing, tow under 200 m|Rule 24|" MF ";" "0.15,0,0.84,M,W" ";" SG ";" SR ";" ST ";" TY "|Two masthead lights in a vertical line, and a yellow towing light above the sternlight."
  VT[16] = "tow200p|Towing, tow over 200 m|Rule 24|" MF ";" "0.15,0,0.84,M,W" ";" "0.15,0,0.96,M,W" ";" SG ";" SR ";" ST ";" TY "|Three masthead lights in a vertical line - the tow is longer than 200 m."
  VT[17] = "towed|Vessel being towed|Rule 24|" SG ";" SR ";" ST "|Sidelights and a sternlight, and nothing else. She looks like a sailing vessel until you see what is ahead of her."
  #  Rule 27(f): one green at or near the foremast head and one at each
  #  end of the FORE YARD - all three on the same mast. They used to be
  #  given different fore-and-aft positions, which threw the two yard
  #  lights off to one side and made them impossible to account for.
  VT[18] = "mineclear|Mine clearance vessel|Rule 27|" MF ";" SG ";" SR ";" ST ";" ar(0.15,0,0.98,"G") ";" yd(0.15,0.15,0.82,"G") ";" yd(0.15,-0.15,0.82,"G") "|Three all-round greens: one at the foremast head and one at each end of the fore yard. Keep 1000 m clear.|The top green sits over the masthead white, and green over white on its own is a trawler. The two greens out on the yard are what tell you it is not."
  VT[19] = "hover|Air-cushion vessel in non-displacement mode|Rule 23|" MF ";" SG ";" SR ";" ST ";" ar(0.15,0,0.60,"Y") "|The ordinary power-driven lights plus an all-round flashing yellow."
  VT[20] = "sail7|Sailing vessel under 7 m, or a vessel under oars|Rule 25|" ar(0.0,0,0.35,"W") "|If she carries nothing else she must show a torch or lantern in time to prevent collision."
  #  Rule 23(c), added to the Convention by IMO resolution A.910(22).  The
  #  flashing red is IN ADDITION to the ordinary power-driven lights, and
  #  only while taking off, landing, or in flight near the surface.
  VT[21] = "wig|WIG craft taking off, landing or in flight|Rule 23(c)|" MF ";" SG ";" SR ";" ST ";" ar(0.15,0,0.60,"R") "|The ordinary power-driven lights plus a high intensity all-round flashing red, shown only when taking off, landing or in flight near the surface."
  #  NOT A CONVENTION LIGHT.  32 CFR 707.7 is a United States Navy special
  #  rule, and the note says so, because a student must not learn this as
  #  a COLREGS light.  It is here because it is a light you will actually
  #  see, and because a submarine on the surface is hard to read: her
  #  masthead lights sit far lower and closer together than a ship's.
  #  Her ordinary lights keep their proper ARCS - masthead, the two
  #  sidelights and a sternlight - but sit low and close together, which is
  #  the point.  Written out rather than built from ar(), because ar() makes
  #  every lamp all-round and that turned her sidelights into all-round
  #  lights: the display then read her as "not making way".
  VT[22] = "submarine|Submarine on the surface (US Navy identification light)|32 CFR 707.7|0.10,0,0.30,M,W,;0.06,0.11,0.20,S,G,;0.06,-0.11,0.20,P,R,;-0.30,0,0.16,T,W,;" ar(0.10,0,0.42,"Y") "|NOT a Convention light. A US Navy special rule: an intermittent flashing amber beacon, one flash a second for three seconds then three seconds dark, shown all round the horizon. Her ordinary lights sit much lower and closer together than a ship's, which is itself the recognition."
  #  ---- vessels the tables had no entry for ---------------------------
  #  Found by sweeping the claim list against an outside reference. None
  #  of these was wrong; all six were simply absent, and each is a vessel
  #  a watchkeeper will actually meet. APPENDED at the end on purpose:
  #  rv_build() walks this table in order, so adding here leaves every
  #  existing review key pointing at the vessel it pointed at before, and
  #  a review in progress keeps its place.

  #  Rule 27(d). The two reds mark the side the obstruction is on and the
  #  two greens the side you may pass -- and the greens are to PORT here,
  #  which puts the REDS on her starboard side, where a watchkeeper
  #  expects to see a green sidelight. That is the confusion worth
  #  drawing rather than avoiding: they are not sidelights, they do not
  #  tell you her heading, and reading them as her port side sends you
  #  into the dredge.
  VT[23] = "dredge|Dredging or underwater operations, restricted|Rule 27(d)|"            ar(0.10,0,0.99,"R") ";" ar(0.10,0,0.89,"W") ";" ar(0.10,0,0.79,"R") ";"            MF ";" SG ";" SR ";" ST ";"            ar(0.10,-0.20,0.62,"G") ";" ar(0.10,-0.20,0.52,"G") ";"            ar(0.10,0.20,0.62,"R") ";" ar(0.10,0.20,0.52,"R")            "|Red, white, red for restricted in her ability to manoeuvre, and in addition two all-round reds on the side the obstruction is and two all-round greens on the side you may pass. Here the obstruction is to starboard and the way past is to port.|The two reds are out on her STARBOARD side, where you expect her green sidelight. They are not a sidelight and they are not her port side: they mark the obstruction, and Rule 27(d) says you pass on the side showing the greens."

  #  Rule 25(b). The commonest yacht at night and the table had no entry
  #  for her. All three lights from one point at the top of the mast:
  #  she carries no second light to give you her length, and the lantern
  #  being high and small makes her look further off than she is.
  VT[24] = "sailtri|Sailing vessel under 20 m, combined lantern|Rule 25(b)|"            "0.000,0.000,0.950,S,G,;0.000,0.000,0.950,P,R,;0.000,0.000,0.950,T,W,"            "|Sidelights and sternlight combined in one lantern at or near the top of the mast. Only a sailing vessel under 20 metres may do this.|She may not also show the optional red over green of Rule 25(c): it is one or the other. And every light she has comes from a single point high up, so there is nothing in her lights to tell you her length, and a small bright lantern well above the water reads as further away than she is."

  #  Rule 24(c). The same two masthead lights as a vessel towing astern
  #  with a tow under 200 m, and the whole difference is a light she does
  #  NOT carry. A confusable pair is worth a table entry of its own.
  VT[25] = "towalong|Pushing ahead, or towing alongside|Rule 24(c)|"            MF ";0.150,0.000,0.840,M,W,;" SG ";" SR ";" ST            "|Two masthead lights in a vertical line, sidelights and a sternlight -- and no towing light. She is pushing ahead or towing alongside, so nothing of hers is astern on a wire.|Her two masthead lights are what a vessel towing astern shows for a tow of 200 metres or less. The difference is the yellow towing light above the sternlight: towing astern has one, pushing or towing alongside does not. Look for the yellow before you decide what is behind her."

  #  Rule 23(d)(i). An all-round white in place of BOTH the masthead
  #  light and the sternlight, so from astern she shows one white light
  #  and nothing else -- which is also a vessel at anchor, and also a
  #  sailing vessel under 7 m with a torch.
  VT[26] = "power12|Power-driven vessel under 12 m|Rule 23(d)|"            ar(0.000,0,0.450,"W") ";" SG ";" SR            "|Under 12 metres she may show an all-round white light and sidelights, in place of the masthead light and the sternlight.|On a vessel under 12 metres that white light may also be displaced from the centreline, so do not read its position as her heading. From astern she shows one white and no sidelights, and so does a vessel at anchor."

  #  Rule 23(d)(ii). One all-round white and, if practicable, sidelights
  #  -- so at worst a single white light, identical to a vessel at anchor
  #  under 50 m and to a sailing vessel under 7 m. The quiz already pulls
  #  look-alikes out of the option pool and says so, which is the right
  #  answer: the ambiguity is the lesson, not a fault to design around.
  VT[27] = "power7|Power-driven vessel under 7 m, 7 knots or less|Rule 23(d)|"            ar(0.000,0,0.350,"W")            "|Under 7 metres, and not able to exceed 7 knots, she may show an all-round white light alone -- with sidelights as well if that is practicable.|A single white light is the most ambiguous thing you can see at night. It is this, or a vessel at anchor, or a sailing vessel under 7 m showing a torch, or the sternlight of a ship. It will not tell you which, and it will not tell you her heading."

  #  Rule 26(c)(ii). Held back from the first five because the sentence
  #  could not yet describe her: an all-round white out towards the gear
  #  sorted into the vertical stack and came out as "an all-round red
  #  over two all-round whites", which is not what the picture shows.
  #  Displaced all-round lights are named separately now, so she can be
  #  described as she looks.
  #
  #  AND NO MASTHEAD LIGHT. The first draft of this entry carried one,
  #  copied from the power-driven pattern. Rule 26(c) prescribes the
  #  red-over-white pair, the gear light, and -- when making way --
  #  sidelights and a sternlight. Nothing else. The masthead light of
  #  Rule 26(b)(ii) belongs to a TRAWLER, and there only above 50 metres.
  #  Our existing `fishing` entry has never carried one, which is what
  #  caught it.
  VT[28] = "fishgear|Fishing other than trawling, gear out over 150 m|Rule 26(c)(ii)|"            ar(0.15,0,0.88,"R") ";" ar(0.15,0,0.76,"W") ";"            SG ";" SR ";" ST ";" ar(0.10,0.22,0.55,"W")            "|Red over white for fishing other than trawling, and in addition an all-round white out towards her gear: it is streamed more than 150 metres in that direction. Here it is out to starboard.|That third white is not a masthead light and not an anchor light. It points along 150 metres or more of gear you cannot see, and she is the near end of it -- so the water to pass her in is on the other side, and the room you need is not the room she occupies."

  NVES=28
  VES_READY=1
  return 0
}
#  WHAT THE PICTURE DOES NOT TELL YOU, and the trap in asking the
#  geometry instead of the picture.
#
#  The first version of this read lt_arc alone: if you were abaft her
#  beam it said "a sternlight and no colour -- you are overtaking". That
#  is true of a power-driven vessel and false of most of the others. It
#  told a student he was overtaking a vessel AT ANCHOR, whose single
#  all-round white is not a sternlight and who is not under way at all;
#  and it called a head-on meeting with a vessel restricted in her
#  ability to manoeuvre a Rule 14 case, when Rule 18 is what decides it.
#  Rendering all twenty-eight scenarios is what showed it.
#
#  So the note is now read off the LAMPS THAT ARE ACTUALLY LIT, which is
#  also what the student is looking at:
#    stern  exactly one lamp visible and it is the white sternlight --
#           nothing else to see, so Rule 13 and nothing else matters.
#    bow    both sidelights AND a masthead light AND no all-round lamp:
#           an ordinary power-driven vessel end on, which is Rule 14.
#           An all-round lamp means she is something Rule 18 ranks above
#           you, so the head-on rule is not the one that decides it.
#    sail   her sidelights cannot tell you her tack, and Rule 12 turns
#           on the tack.
#  Anything else gets no note rather than a wrong one.
function lt_note(key,th,   i,n,a,L,f,j,nv,mast,stern,red,grn,allr){
  i=ves_find(key); if(i==0) return ""
  if(key=="sail") return "sail"
  split(VT[i],a,"|"); n=split(a[4],L,";")
  nv=0; mast=0; stern=0; red=0; grn=0; allr=0
  for(j=1;j<=n;j++){
    if(L[j]=="") continue
    split(L[j],f,",")
    if(!arc_vis(f[4],th)) continue
    nv++
    if(f[4]=="A") allr++
    else if(f[4]=="M") mast++
    else if(f[4]=="S") grn++
    else if(f[4]=="P") red++
    else if(f[4]=="T" && f[5]=="W") stern++
  }
  if(nv==1 && stern==1) return "stern"
  if(red && grn && mast && !allr) return "bow"
  return ""
}
function ves_find(key,   i,a){
  ves_init()
  for(i=1;i<=NVES;i++){ split(VT[i],a,"|"); if(a[1]==key) return i }
  return 0
}
# is a light with this arc visible from bearing th (0 = dead ahead of her)?

# ---------------------------------------------------------------------
#  The second question a lookout asks: which way is she going?
#  It follows from which lights you can see, not from what she is.
# ---------------------------------------------------------------------
function motion_of(idx,th,   a,n,L,i,f,g,r,w,m,key){
  ves_init()
  split(VT[idx],a,"|"); key=a[1]; n=split(a[4],L,";")
  g=0;r=0;w=0;m=0
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(!arc_vis(f[4],th)) continue
    if(f[4]=="S") g=1
    else if(f[4]=="P") r=1
    else if(f[4]=="T") w=1
    else if(f[4]=="M") m=1
  }
  MO_G=g; MO_R=r; MO_W=w; MO_M=m
  if(key=="anchor"||key=="anchor50"||key=="aground"||key=="sail7") return 5
  if(key=="nuc") return 5
  if(g&&r) return 1
  if(g) return 2
  if(r) return 3
  if(w) return 4
  return 5
}
function motion_text(k){
  if(k==1) return "End on, or nearly: she is coming straight at you."
  if(k==2) return "Crossing from your left to your right."
  if(k==3) return "Crossing from your right to your left."
  if(k==4) return "Going away from you - you are overtaking her."
  return "She is not under way, or not making way through the water."
}
#  WHAT HER LIGHTS TELL YOU ABOUT HER HEADING.  This half is pure
#  geometry and is the skill the drill is for: which sector of hers you
#  are standing in, and therefore which way she is going.
function motion_lights(k){
  if(k==1) return "Both sidelights at once means you are within a degree or two of her bow, and she of yours. Her red appears on your right and her green on your left, because she is facing you."
  if(k==2) return "Her green sidelight is her starboard side, so you are standing in her starboard sector and she is heading from your left to your right."
  if(k==3) return "Her red sidelight is her port side, so you are in her port sector and she is heading from your right to your left."
  if(k==4) return "A sternlight and no sidelight means you are more than 22.5 degrees abaft her beam."
  #  NOT "Anchored, aground, or stopped." Larry, on mot-16 -- a vessel
  #  not under command, making no way: "the description of the answer
  #  does not say 'not under command' which she clearly is." Two
  #  all-round reds is Rule 27(a) and nothing else; a vessel at ANCHOR
  #  shows an all-round white, Rule 30, so this sentence offered him a
  #  reading her lights had already ruled out. What she is comes from the
  #  identity sentence in front of this one and from her standing after
  #  it; this half only says that she is not moving.
  return "No sidelights and no sternlight, so she is not making way through the water."
}

#  HER STANDING UNDER RULE 18, which is a different question from her
#  heading and is decided by what she IS, not by where she is.
function r18_of(key){
  if(key=="nuc" || key=="nucway")        return "nuc"
  if(key=="ram" || key=="mineclear")     return "ram"
  if(key=="trawl" || key=="fishing")     return "fish"
  if(key=="sail" || key=="sailrg" || key=="sail7") return "sail"
  if(key=="draught")                     return "cbd"
  if(key=="wig")                         return "wig"
  if(key=="towed")                       return "tow"
  return ""
}

#  THE GIVE-WAY HALF, AND WHY IT IS SEPARATE.
#
#  Larry, reviewing mot-4 -- constrained by her draught, crossing from
#  your left to your right, where the program said she must keep out of
#  the way and "You stand on and hold your course":
#
#      "IF she is constrained by her draft, the sidelights dont matter,
#      you give way"
#
#  and on mot-5, where the program happened to reach the right action:
#
#      "correct for the wrong reason.  the higher reason is that she is
#      constrained by her draft."
#
#  He is right twice over.  motion_why() was handed the vessel and never
#  looked at it: the whole answer was built from the arc.  Measured
#  afterwards, 42 of the 73 distinct claims are about a vessel with a
#  standing under Rule 18 and not one of them mentioned it -- and NINE
#  told the reader to stand on against a vessel he must keep clear of or
#  must not impede: not under command, restricted in her ability to
#  manoeuvre, fishing, trawling, under sail, under tow, mine clearance,
#  and his constrained by her draught.
#
#  Rule 15 and Rule 14 are rules for two POWER-DRIVEN vessels. Where she
#  is something Rule 18 ranks above you, the geometry still says which
#  way she is going -- that is why you read the lights -- but it does not
#  decide who gives way.
#
#  Our own status has to be stated or the question does not carry its own
#  context, which is Larry's rule: the drill never said what WE are.
function r18_say(st,k){
  if(st=="nuc")  return "But she is NOT UNDER COMMAND. Rule 18(a)(i): a power-driven vessel under way keeps out of the way of a vessel not under command, whichever way she is crossing. Her lights tell you where she is going; they do not decide who gives way."
  if(st=="ram")  return "But she is RESTRICTED IN HER ABILITY TO MANOEUVRE. Rule 18(a)(ii): a power-driven vessel under way keeps out of the way of her, whatever the crossing geometry says. She may be unable to get out of your way at all."
  if(st=="fish") return "But she is ENGAGED IN FISHING. Rule 18(a)(iii): a power-driven vessel under way keeps out of the way of a vessel engaged in fishing. Her gear may be streamed a long way from her, so give the whole of her a wide berth, not just the hull."
  if(st=="sail") return "But she is UNDER SAIL. Rule 18(a)(iv): a power-driven vessel under way keeps out of the way of a sailing vessel. Rule 15 is for two power-driven vessels and does not apply here."
  if(st=="cbd")  return "But she is CONSTRAINED BY HER DRAUGHT. Rule 18(d)(i): avoid impeding her safe passage, if the circumstances of the case admit -- she may have no water to go anywhere else. Rule 8(f) says what not impeding means: act early and give her room, and do not put her in a position where she has to manoeuvre for you."
  if(st=="wig")  return "She is a WIG CRAFT taking off, landing or in flight near the surface. Rule 18(f)(i): she keeps well clear of all vessels and avoids impeding their navigation. On the water, she is a power-driven vessel like any other."
  if(st=="tow")  return "She is a vessel BEING TOWED, and a tow has no standing of her own under Rule 18. The vessel towing her may well be restricted in her ability to manoeuvre and showing the lights for it. Find the towing vessel and what is between you before you decide anything: the tow line is the hazard, and it may be a long way ahead of her."
  return ""
}
#  Her standing when she is NOT MAKING WAY. r18_say() is written for a
#  crossing - "whichever way she is crossing", "her lights tell you where
#  she is going" - and neither is true of a vessel lying stopped, so this
#  says the same rules in the situation that actually obtains.
function r18_still(st,key){
  if(st=="nuc")  return "And she is NOT UNDER COMMAND: two all-round reds, Rule 27(a), shown by a vessel that through some exceptional circumstance is unable to manoeuvre as the rules require. Rule 18(a)(i) -- you keep out of her way, and she cannot keep out of yours. That is what the lights are for."
  if(st=="ram")  return "And she is RESTRICTED IN HER ABILITY TO MANOEUVRE, Rule 27(b). Rule 18(a)(ii): you keep out of her way. Stopped or not, she may be unable to move at all."
  if(st=="fish") return "And she is ENGAGED IN FISHING, Rule 26. Rule 18(a)(iii): you keep out of her way, and her gear may be streamed a long way from her -- stopped is exactly when it is out."
  if(st=="sail") return "And she is UNDER SAIL. Rule 18(a)(iv) if you are power-driven; but lying stopped she may also be a vessel under oars, or under 7 metres, showing what she can rather than what a larger vessel must."
  if(st=="cbd")  return "And she is CONSTRAINED BY HER DRAUGHT, Rule 28. Rule 18(d)(i): do not impede her -- and a vessel this deep lying stopped has very little water to work with."
  if(key=="anchor" || key=="anchor50") return "She is AT ANCHOR, Rule 30: an all-round white forward, and a second one aft if she is 50 metres or more. Anchored is not aground and it is not under way; she is where she chose to be, and she is holding."
  if(key=="aground") return "She is AGROUND, Rule 30(d): the anchor lights plus two all-round reds. She is not going anywhere, and the water she is sitting in may be shoaler than your chart makes it look."
  return "Nothing in her lights says why she has stopped."
}
function motion_plain(k){
  if(k==1) return "Taking you as a power-driven vessel under way, Rule 14: neither of you stands on - each alters to starboard and you pass port to port."
  if(k==2) return "Taking you both as power-driven vessels under way, this also tells you who gives way: she has YOU on her starboard side, so under Rule 15 she is the one who must keep out of the way. You stand on and hold your course - while watching her like a hawk."
  if(k==3) return "Taking you both as power-driven vessels under way, that puts her on your own starboard side, which makes you the give-way vessel: alter to starboard and pass under her stern. If to starboard red appear, it is your duty to keep clear."
  return ""
}
#  OVERTAKING IS DECIDED BEFORE RULE 18 GETS A VOTE.  Rule 13(a) opens
#  "notwithstanding anything contained in the Rules of Part B, Sections I
#  and II", and Rule 18 is in Section I -- so the overtaking vessel keeps
#  clear whatever the other one is, and the plain answer was already
#  right.  Larry, on mot-7: "if the rule says you should not impeed her,
#  I would wonder if passing her has the potential to impeed her".  It
#  does, and that is Rule 18(d) sitting on top of Rule 13 rather than
#  instead of it.
#  her standing in plain words, for the sentences that name her
function r18_name(st){
  if(st=="nuc")  return "NOT UNDER COMMAND"
  if(st=="ram")  return "RESTRICTED IN HER ABILITY TO MANOEUVRE"
  if(st=="fish") return "ENGAGED IN FISHING"
  if(st=="sail") return "UNDER SAIL"
  if(st=="cbd")  return "CONSTRAINED BY HER DRAUGHT"
  if(st=="wig")  return "a WIG CRAFT"
  if(st=="tow")  return "BEING TOWED"
  return ""
}
function motion_ovt(st,   n){
  if(st=="")    return "You are overtaking her, and you keep out of her way until you are finally past and clear."
  if(st=="cbd") return "You are overtaking her, and you keep out of her way until you are finally past and clear -- Rule 13 says so whatever she is. She is also CONSTRAINED BY HER DRAUGHT, and Rule 18(d) sits on top of Rule 13 rather than under it: passing close can itself impede her safe passage, so give her room as well as way."
  if(st=="tow") return "You are overtaking her, and you keep out of her way until you are finally past and clear. She is BEING TOWED: the tow line and whatever is on the end of it may be a long way astern of the vessel showing these lights, so pass well clear of all of it."
  n = r18_name(st)
  #  Rule 13(a) opens "notwithstanding anything contained in the Rules of
  #  Part B, Sections I and II", and Rule 18 is in Section I, so
  #  overtaking is decided before her standing comes into it. She is still
  #  named: it does not change WHETHER you keep clear, it changes how
  #  much room you leave while you do it.
  return "You are overtaking her, and you keep out of her way until you are finally past and clear. Rule 13 opens \"notwithstanding anything contained in the Rules of Part B, Sections I and II\", so it decides that before Rule 18 comes into it. She is " n ", which does not change whether you keep clear -- it changes how wide you go."
}
#  WHAT SHE SHOWS COMES FIRST, AND THEN THE GEOMETRY.
#
#  This read "Her green sidelight is her starboard side, so you are
#  standing in her starboard sector... But she is ENGAGED IN FISHING" --
#  a sentence that tells the reader what they can see, names ONE light,
#  and then produces her identity from nowhere. Larry, reviewing the
#  fishing claims: "If I see just green, and not white over green ore
#  green over white, then she is either a sailboat or a small power
#  drivven vessal,,,,not a fishing boat."
#
#  He is right, and it is the wrong way round besides. The identifying
#  lights are what you read FIRST at night -- red over white, green over
#  white, red-white-red -- and the sidelight settles her aspect second.
#  A drill called "give-way calls from her lights" that names only the
#  sidelight is teaching the half that cannot identify anything.
#
#  So the identity goes in front, taken from the vessel's own light
#  table rather than written again here, which is why it cannot drift
#  from the picture the quiz draws.
function motion_why(k,idx,th,   a,st,s,sig){
  split(VT[idx],a,"|")
  st = r18_of(a[1])
  sig = seen_sig(idx,th)
  s = motion_lights(k)
  if(sig!="") s = sig " " s
  #  A STOPPED VESSEL STILL HAS A STANDING, and this returned before
  #  saying so. mot-16 ended "...she is not making way through the water.
  #  Anchored, aground, or stopped." -- with no mention that two all-round
  #  reds mean NOT UNDER COMMAND, which is the whole of what her lights
  #  are telling you and the only thing that decides what you do about
  #  her. Rule 18 does not stop applying because she has stopped.
  if(k==5) return s " " r18_still(st, a[1])
  if(k==4) return s " " motion_ovt(st)
  if(st=="") return s " " motion_plain(k)
  return s " " r18_say(st,k)
}

#  WHAT YOU CAN SEE FROM THIS BEARING -- not what she carries.
#
#  Larry, reviewing mot-28, mot-29 and mot-30 in a row:
#
#      "you say she shows two masthead lights but you only display one"
#      "here again, the description does not match the lights displayed"
#
#  Three claims, one fault.  This sentence was built from field 5 of the
#  vessel table, which is her SIGNATURE: every light she carries.  The
#  drawing beside it shows only the lights whose ARCS bear on you from
#  the bearing it was drawn at.  Those are different things, and the
#  sentence used one as if it were the other:
#
#    mot-28  drawn from 135, a vessel of 50 m or more
#            said  "She shows two masthead lights, the after one higher"
#            drew  one white - her sternlight.  Masthead lights are cut
#                  off abaft 112.5 degrees; you could see neither.
#    mot-29  drawn from 045    named both sidelights and a sternlight;
#                              only the masthead and the green bear.
#    mot-30  drawn from 270    the same the other way round.
#
#  It is general, not three cases: every vessel whose identity is carried
#  in DIRECTIONAL lights states it wrongly from some bearing, and every
#  caption that ends "...and sternlight" is false from ahead.
#
#  So the sentence is built from the lights that are in arc, which makes
#  it unable to disagree with the picture: both read the same table
#  through the same arc_vis().  All-round lights come first, highest
#  first, because they are what identifies her; then masthead lights,
#  then sidelights, then the sternlight.
#
#  AND THE SENTENCE IT PRODUCES FROM ASTERN IS THE POINT, not a loss:
#
#      She shows her sternlight.
#
#  Fifty metres or fifteen, laden or light, from abaft her beam an
#  ordinary power-driven vessel's lights identify nothing whatever.  That
#  is worth a reader meeting head-on, and no caption written from the
#  table could ever have said it.
function colname(c){
  if(c=="W") return "white"
  if(c=="G") return "green"
  if(c=="R") return "red"
  if(c=="Y") return "yellow"
  return c
}
function arphrase(c,k){
  if(k==1) return "an all-round " colname(c)
  return (k==2?"two":(k==3?"three":k)) " all-round " colname(c) "s"
}
#  The all-round lights that bear, named top down, and the counts the
#  aspect line needs. Separated from seen_sig() so that the two cannot
#  describe the same lights differently: AR_SAY is the phrase, AR_N the
#  count, AR_DIR whether any directional light bears, and AR_FA the
#  widest fore-and-aft separation between two all-round lights OF THE
#  SAME COLOUR, as projected sideways from this bearing.
function ar_look(idx,th,   a,n,L,i,f,j,t1,t2,m,allone,x1,x2,d,ARC,ARH,ARX,ARP,ARQ,SEGC,SEGK){
  ves_init()
  split(VT[idx],a,"|"); n=split(a[4],L,";")
  AR_N=0; AR_DIR=0; AR_FA=0; AR_MH=0; AR_SG=0; AR_SP=0; AR_ST=0; AR_YL=0; AR_PCOL=""
  AR_MHFA=0; AR_MHX=0; AR_DSP=0; DS_N=0; DP_N=0; DS_C=""; DP_C=""
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(!arc_vis(f[4],th)) continue
    if(f[4]=="A"){
      #  AN ALL-ROUND LIGHT OUT ON HER SIDE IS NOT PART OF THE VERTICAL
      #  STACK. A dredger shows red-white-red up the mast AND two reds on
      #  the obstructed side and two greens on the side you may pass
      #  (Rule 27(d)); sorting all seven by height alone interleaved them
      #  into "an all-round red over an all-round white over an all-round
      #  red over an all-round green over..." -- unreadable, and untrue
      #  of the picture, where two groups sit out to either side.
      #  A yard-mounted light is excluded: a mine clearance vessel's two
      #  yard-end greens belong with the green at her foremast head and
      #  are counted with it, which is what hidden_note() then explains
      #  when one hides the other.
      if((f[2]+0)!=0 && f[6]!="yard"){
        if((f[2]+0)>0){ DS_N++; DS_C=f[5] } else { DP_N++; DP_C=f[5] }
        AR_DSP=1
      } else {
        AR_N++; ARH[AR_N]=f[3]+0; ARC[AR_N]=f[5]
        ARP[AR_N]=f[1]+0; ARQ[AR_N]=f[2]+0
        ARX[AR_N]=(f[1]+0)*sind(th) - (f[2]+0)*cosd(th) } }
    else { AR_DIR=1
      #  BUCKET BY COLOUR AS WELL AS ARC. Rule 21(d): a towing light is
      #  "a yellow light having the same characteristics as the
      #  sternlight", so it is carried on the stern arc and the table
      #  gives it arc T -- correct. Bucketing on the arc alone then put
      #  it in with the sternlight, and a towing vessel seen from astern
      #  was described as showing "her sternlight" and nothing more.
      #  That is the one thing about her that matters from back there:
      #  there is something on the end of a wire ahead of you, and the
      #  gap between her towing light and her sternlight is how you tell
      #  you are looking at the towing vessel and not at the tow.
      #  TWO MASTHEAD LIGHTS MEAN DIFFERENT THINGS DEPENDING ON WHERE
      #  THEY SIT, and this said "the after one higher" for both. Rule
      #  23(a)(ii) puts the second masthead light of a vessel of 50 m or
      #  more ABAFT of and higher than the forward one; Rule 24(a)(i)
      #  puts a towing vessel's two IN A VERTICAL LINE. That is the
      #  distinction between a ship and a tug with something on the end
      #  of a wire, and the program was describing them identically.
      if(f[4]=="M"){ AR_MH++
        if(AR_MH==1) AR_MHX=f[1]+0
        else if((f[1]+0)!=AR_MHX) AR_MHFA=1 }
      else if(f[4]=="S") AR_SG=1
      else if(f[4]=="P") AR_SP=1
      else if(f[4]=="Y" || (f[4]=="T" && f[5]=="Y")) AR_YL=1
      else if(f[4]=="T") AR_ST=1 }
  }
  #  highest first: a vertical pair is named top down, which is how the
  #  rhymes are learnt and how the drawing stacks them.
  #  EVERY parallel array moves, or they desynchronise. The first
  #  version carried ARH, ARC and ARX and left ARP and ARQ where they
  #  were, so a vessel aground -- reds at 0.100, anchor light at 0.350 --
  #  came out with ARC saying "red, red" against ARP saying "0.350,
  #  0.100", and she was reported as having a fore-and-aft pair she does
  #  not have. Sorted arrays that are read together must be swapped
  #  together.
  for(i=2;i<=AR_N;i++){ t1=ARH[i]; t2=ARC[i]; d=ARX[i]; x1=ARP[i]; x2=ARQ[i]; j=i-1
    while(j>=1 && ARH[j]<t1){ ARH[j+1]=ARH[j]; ARC[j+1]=ARC[j]; ARX[j+1]=ARX[j]
                              ARP[j+1]=ARP[j]; ARQ[j+1]=ARQ[j]; j-- }
    ARH[j+1]=t1; ARC[j+1]=t2; ARX[j+1]=d; ARP[j+1]=x1; ARQ[j+1]=x2 }
  #  SAME COLOUR on purpose. Two lights of the same colour separated fore
  #  and aft are a pair you can tell apart and measure across -- Rule
  #  30(a) prescribes exactly that for a vessel of 50 m or more at
  #  anchor, second light "at or near the stern and at a lower level".
  #  A gap between lights of DIFFERENT colours, like the anchor white and
  #  the two reds of a vessel aground, is not prescribed anywhere: Rule
  #  30(d) says only "where they can best be seen", so any separation our
  #  drawing happens to show is ours and not the Convention's, and
  #  nothing may be read off it.
  AR_PAIR=0
  for(i=1;i<=AR_N;i++) for(j=i+1;j<=AR_N;j++){
    if(ARC[i]!=ARC[j]) continue
    x1=ARX[i]; x2=ARX[j]; d=x1-x2; if(d<0) d=-d
    if(d>AR_FA) AR_FA=d
    #  AR_PAIR is about the VESSEL, not this bearing: do two lights of
    #  one colour sit at different places on her at all? AR_FA is this
    #  bearing's projection of that, and it falls to zero end-on -- which
    #  is itself a reading, not an absence of one.
    if(ARP[i]!=ARP[j] || ARQ[i]!=ARQ[j]){ AR_PAIR=1; AR_PCOL=ARC[i] }
  }
  m=0
  for(i=1;i<=AR_N;i++){
    if(m>0 && SEGC[m]==ARC[i]) SEGK[m]++
    else { m++; SEGC[m]=ARC[i]; SEGK[m]=1 }
  }
  AR_SAY=""
  if(m>0){
    allone=1
    for(i=1;i<=m;i++) if(SEGK[i]>1) allone=0
    #  "green over white" and "red, white and red in a vertical line" are
    #  the words the rules are remembered in; only fall back to counting
    #  all-round lights when the stack is not one of those shapes.
    if(m==1) AR_SAY=arphrase(SEGC[1],SEGK[1])
    else if(allone && m==2) AR_SAY=colname(SEGC[1]) " over " colname(SEGC[2])
    else if(allone && m==3) AR_SAY=colname(SEGC[1]) ", " colname(SEGC[2]) " and " colname(SEGC[3]) " in a vertical line"
    else for(i=1;i<=m;i++) AR_SAY=AR_SAY (i>1?" over ":"") arphrase(SEGC[i],SEGK[i])
  }
  return AR_N
}
function seen_sig(idx,th,   i,np,txt,PH){
  ar_look(idx,th)
  np=0
  if(AR_SAY!=""){ np++; PH[np]=AR_SAY }
  if(AR_DSP){
    #  described as the picture has them -- which side carries which
    #  colour is in the table's own note and in the drawing, and that is
    #  where the rule belongs. This sentence says what you see.
    if(DS_N>0 && DP_N>0){ np++
      PH[np]=arphrase(DP_C,DP_N) " out on one side and " arphrase(DS_C,DS_N) " out on the other" }
    else if(DS_N>0){ np++; PH[np]=arphrase(DS_C,DS_N) " out on one side" }
    else if(DP_N>0){ np++; PH[np]=arphrase(DP_C,DP_N) " out on one side" }
  }
  if(AR_MH==1){ np++; PH[np]="a masthead light" }
  else if(AR_MH==2){ np++
    #  plain ifs, not a ternary split over two lines: awk allows a
    #  newline after a comma or an operator but not after the ':' of a
    #  conditional, and mawk refuses to parse the file at all.
    if(AR_MHFA) PH[np]="two masthead lights, the after one higher"
    else PH[np]="two masthead lights in a vertical line" }
  else if(AR_MH==3){ np++; PH[np]="three masthead lights in a vertical line" }
  else if(AR_MH>3){ np++; PH[np]=AR_MH " masthead lights" }
  if(AR_SG&&AR_SP){ np++; PH[np]="both sidelights" }
  else if(AR_SG){ np++; PH[np]="her green sidelight" }
  else if(AR_SP){ np++; PH[np]="her red sidelight" }
  if(AR_ST){ np++; PH[np]="her sternlight" }
  if(AR_YL){ np++; PH[np]="a yellow towing light" }
  if(np==0) return "Not one of her lights bears on you from here."
  txt=""
  for(i=1;i<=np;i++){
    if(i==1) txt=PH[i]
    else if(i==np) txt=txt " and " PH[i]
    else txt=txt ", " PH[i]
  }
  return "She shows " txt "."
}

function light_sig(idx,th,   a,n,L,i,f,cnt,j,t1,t2,sig){
  ves_init()
  split(VT[idx],a,"|"); n=split(a[4],L,";")
  cnt=0
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(!arc_vis(f[4],th)) continue
    cnt++; SGH[cnt]=f[3]+0
    #  what you can actually judge: the colour, and how far the light sits
    #  left or right of the others.  Absolute height is not something you can
    #  measure at night, so it is deliberately left out.
    SGC[cnt]=f[5] sprintf("%d", int(((f[1]+0)*sind(th) - (f[2]+0)*cosd(th))/0.06 + 100))
  }
  for(i=2;i<=cnt;i++){ t1=SGH[i]; t2=SGC[i]; j=i-1
    while(j>=1 && SGH[j]<t1){ SGH[j+1]=SGH[j]; SGC[j+1]=SGC[j]; j-- }
    SGH[j+1]=t1; SGC[j+1]=t2 }
  sig=""
  for(i=1;i<=cnt;i++) sig=sig SGC[i] ","
  return sig
}
function arc_vis(arc,th){
  th=nrm180(th)
  if(arc=="A") return 1
  if(arc=="M") return (fabs(th)<=112.5)
  #  Sidelights meet at the bow, but Annex I allows the cut-off to fall up
  #  to 3 degrees outside the prescribed sector, and in practice there is a
  #  small arc right ahead where both are seen. Without that overlap the
  #  picture claims you are dead ahead of her while showing one sidelight.
  if(arc=="S") return (th>=-2.5 && th<=112.5)
  if(arc=="P") return (th<=2.5  && th>=-112.5)
  if(arc=="T" || arc=="Y") return (fabs(th)>=112.5)
  return 0
}

# ---- draw one vessel's lights as seen from bearing th ----------------
function draw_lights(key,th,   i,idx,a,n,L,j,f,w,h,sea,us,vs,cx,u,v,hw,c,col,maxv,cnt,r0,ylo,yhi,yv){
  idx=ves_find(key); if(idx==0){ print "  unknown vessel: " key; return 1 }
  split(VT[idx],a,"|")
  V_NAME=a[2]; V_RULE=a[3]; V_NOTE=a[5]; V_TRAP=a[6]; V_IDX=idx; V_TH=th
  n=split(a[4],L,";")
  w=67; h=17; sea=h-3; cx=int(w/2); us=(w-8)/1.5; vs=sea-1
  gclear(w,h)
  G_NOCROP=1
  gputsc(0,0,"masthead height",C_DIM)
  gputsc(sea-1,0,"deck",C_DIM)
  for(i=0;i<w;i++) gputw(sea+1,i,"~")
  hw = (1.00*fabs(sind(th)) + 0.22*fabs(cosd(th)))/2.0
  for(i=-hw;i<=hw;i+=0.01) gputw(sea, cx+i*us, "=")
  gputw(sea, cx-hw*us, "\\"); gputw(sea, cx+hw*us, "/")
  # a faint line under each light, so the vertical grouping is plain
  cnt=0
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(!arc_vis(f[4],th)) continue
    u = (f[1]+0)*sind(th) - (f[2]+0)*cosd(th)
    for(v=0;v<=(f[3]+0);v+=0.02) gputwc(sea-v*vs, cx+u*us, ":", C_DIM)
  }
  #  the yard the outboard lights are hung from, drawn before the lights
  #  so the lights sit on top of it
  ylo=99; yhi=-99; yv=-1
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(f[6]!="yard" || !arc_vis(f[4],th)) continue
    u = (f[1]+0)*sind(th) - (f[2]+0)*cosd(th)
    if(u<ylo) ylo=u
    if(u>yhi) yhi=u
    yv = f[3]+0
  }
  if(yv>=0 && yhi>ylo)
    for(u=ylo;u<=yhi;u+=0.01) gputwc(sea-yv*vs, cx+u*us, "-", C_DIM)
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(!arc_vis(f[4],th)) continue
    u = (f[1]+0)*sind(th) - (f[2]+0)*cosd(th)
    v = f[3]+0
    c = f[5]
    gputc(sea - v*vs, cx + u*us, c, kcol(c))
    cnt++
  }
  V_SEEN=cnt
  return 0
}
# ---- the relative-bearing vocabulary --------------------------------
#  One set of words, used for where SHE is from you and for where YOU
#  are from her, so the same phrase always means the same angle.
#  The boundaries are conventional, not legal: they are centred on the
#  old points of the compass - broad on the bow is four points, 45
#  degrees; broad on the quarter is four points from astern, 135.
function rel_phrase(rel,poss,ahead,   t,s){
  if(ahead=="") ahead=5
  t=nrm180(rel); s=(t<0)?"port":"starboard"; t=fabs(t)
  if(t<=ahead)  return "right ahead"
  if(t>=180-ahead) return "right astern"
  if(t<35)  return "fine on " poss " " s " bow"
  if(t<65)  return "broad on " poss " " s " bow"
  if(t<115) return "on " poss " " s " beam"
  if(t<145) return "broad on " poss " " s " quarter"
  return "fine on " poss " " s " quarter"
}
#  Red for port, green for starboard - the sidelights, which is the whole
#  reason the convention is remembered. Nought to 180 each side.
function red_green(rel,   t){
  t=nrm180(rel)
  if(fabs(t)<=0.5)      return "right ahead"
  if(fabs(t)>=179.5)    return "right astern"
  if(t<0) return sprintf("Red %d", int(-t+0.5))
  return sprintf("Green %d", int(t+0.5))
}
#  Four ways of saying the same angle. The style is a setting because
#  which one is right depends entirely on who is listening.
function rel_style(rel,   t,d,s){
  t=nrm180(rel)
  if(rstyle=="words") return rel_phrase(rel,"the")
  if(rstyle=="rel360") return sprintf("%03d relative", nrm360(rel))
  if(rstyle=="none")  return ""
  if(fabs(t)<=0.5)   return "right ahead"
  if(fabs(t)>=179.5) return "right astern"
  d = int(fabs(t)+0.5); s = (t<0) ? "port" : "starboard"
  if(rstyle=="usn") return sprintf("%s %d", (t<0)?"Port":"Starboard", d)
  return sprintf("%s %d", (t<0)?"Red":"Green", d)      # rn, the default
}
#  The other way of saying it, for the line that follows the report when
#  he still cannot find her. Never the same form twice.
function rel_other(rel){
  if(rstyle=="words") return red_green(rel)
  return rel_phrase(rel,"your")
}
function aspect_words(th,   t,p){
  t=nrm180(th); p=rel_phrase(th,"her",2.5)
  if(p=="right ahead")  return "You are right ahead of her: you are looking at her bow."
  if(p=="right astern") return "You are right astern of her: you are looking at her stern."
  if(index(p,"beam")>0) return "You are " p ": you see her whole " ((t<0)?"port":"starboard") " side."
  return "You are " p "."
}
#  AN ASPECT YOU CANNOT READ MUST NOT BE STATED AS ONE.
#
#  aspect_words() takes the true bearing and says where you are standing,
#  which is right for a vessel whose sidelights, masthead lights or
#  sternlight bear on you -- that is the whole skill the drill teaches.
#  Five vessels in the table show ONLY all-round lights, at every bearing
#  of the 360:
#
#      anchor      Vessel at anchor, under 50 m
#      anchor50    Vessel at anchor, 50 m or more
#      aground     Vessel aground
#      nuc         Not under command, making no way
#      sail7       Sailing vessel under 7 m, or a vessel under oars
#
#  For those the program printed, beside a picture of one all-round white
#  light, "You are on her starboard beam: you see her whole starboard
#  side." In the lights reference that is at worst incomplete -- you
#  typed the bearing. In the QUIZ REVEAL it is the answer, presented as
#  something the lights told you, and nothing on that screen can give a
#  side at all.
#
#  THE ONE EXCEPTION IS PRESCRIBED, which is why it can be read. Rule
#  30(a) puts a second anchor light on a vessel of 50 metres or more "at
#  or near the stern and at a lower level": a same-coloured pair set
#  deliberately fore and aft, so how far apart they open tells you
#  roughly how far off end-on you are, though never which side or which
#  end. A gap between lights of DIFFERENT colours is not prescribed --
#  Rule 30(d) says only "where they can best be seen" for the two reds of
#  a vessel aground -- so any separation our own drawing happens to show
#  between her anchor light and her reds is ours, not the Convention's,
#  and nothing may be read off it.
function aspect_line(idx,th,   v){
  ar_look(idx,th)
  if(AR_DIR) return aspect_words(th)
  if(AR_N==0) return "Not one of her lights bears on you from here."
  if(AR_PAIR){
    v = "Her two " colname(AR_PCOL) "s are "
    if(AR_FA >= 0.45) return v "wide apart, so you are nearer her beam than end-on -- but which side is not in her lights."
    if(AR_FA <= 0.20) return v "nearly in line, so you are nearer end-on than abeam -- but whether that is her bow or her stern is not in her lights."
    return v "part-way open, so you are between end-on and abeam -- but which side, and which end, are not in her lights."
  }
  return "Her lights give you no aspect at all: " AR_SAY " " (AR_N>1?"look":"looks") " the same from every bearing."
}

#  WHEN ONE LIGHT HIDES ANOTHER, SAY SO.
#
#  Larry marked mot-13 wrong: "here you say she shows three greens, but
#  the picture shows two greens.....which is correct?" Both are. The
#  claim is drawn from 270 - exactly abeam - and her two yard-end greens
#  sit at the same height, one each side of the mast, so from abeam you
#  are looking ALONG the fore yard and one is directly behind the other.
#  Projected sideways they land on the same spot:
#
#      bearing      foremast    yard+    yard-
#      000             0.000   -0.150    0.150   separated by 0.30
#      045             0.106   -0.000    0.212   separated by 0.21
#      090             0.150    0.150    0.150   SUPERIMPOSED
#      270            -0.150   -0.150   -0.150   SUPERIMPOSED
#
#  So the drawing was right, the sentence was right, and the two together
#  said one thing and showed another with nothing to reconcile them. That
#  is a display fault and he was right to flag it.
#
#  It is also worth teaching rather than papering over: a mine clearance
#  vessel seen from abeam shows TWO greens, and a mariner who has only
#  ever been told "three" will not recognise her.
function hidden_note(key,th,   a,i,j,n,L,f,nv,X,H,C,pairs,col,d1,d2){
  ves_init()
  for(i=1;i<=NVES;i++){ split(VT[i],a,"|"); if(a[1]==key) break }
  n=split(a[4],L,";")
  nv=0
  for(i=1;i<=n;i++){
    split(L[i],f,",")
    if(!arc_vis(f[4],th)) continue
    nv++
    X[nv] = (f[1]+0)*sind(th) - (f[2]+0)*cosd(th)
    H[nv] = f[3]+0
    C[nv] = f[5]
  }
  pairs=0; col=""
  for(i=1;i<nv;i++){
    for(j=i+1;j<=nv;j++){
      if(C[i]!=C[j]) continue
      d1 = X[i]-X[j]; if(d1<0) d1 = -d1
      d2 = H[i]-H[j]; if(d2<0) d2 = -d2
      if(d1<0.02 && d2<0.02){ pairs++; col=C[i] }
    }
  }
  if(pairs==0) return ""
  #  COUNT ONLY THE COLOUR THAT COLLIDES. "She shows 5, you can see 4" is
  #  true of every light on her and buries the thing that matters, which
  #  is the one a reader is counting: three greens against two.
  d1=0
  for(i=1;i<=nv;i++) if(C[i]==col) d1++
  return sprintf("She shows %d %s lights and you can see %d: two of them are exactly in line from this bearing, one behind the other. Swing a few degrees either way and they open up.",
                 d1, (col=="G" ? "green" : (col=="R" ? "red" : "white")), d1-pairs)
}

#  WHY SHE IS A PLAIN SHAPE.  draw_lights() draws the hull the same at
#  both ends on purpose: its length follows her aspect, but nothing in it
#  says which end is her bow, because the drill is to read her lights,
#  not her shape.  Without saying so the shape looks like a clue, or a
#  mistake.  Larry approved these words on 22 November 2026, for the
#  lights drill, the encounters' picture and the manual.
function sil_note(){
  print "  She is drawn as a plain silhouette, the same at both ends: it grows"
  print "  longer as you see more of her side, but it never shows which end is"
  print "  her bow. Read her lights, not her shape: at night the lights are all"
  print "  a lookout has."
  return 0
}
function show_lights(key,th){
  if(draw_lights(key,th)) return 1
  print ""
  printf "  %s\n", cw("WHAT DO YOU SEE?",C_ACC)
  hr()
  gshow()
  hr()
  #  Browsing tells you the aspect.  The quiz must not: Q2 is asking
  #  you to work the aspect out from the lights themselves.
  if(!Q_NOASPECT) printf "  %s\n", aspect_line(V_IDX,th)
  #  Same guard as the aspect, and for the same reason: "she shows three
  #  green lights" answers Q1 before it is asked. The quiz gets this in
  #  the reveal instead, where it is teaching rather than telling.
  if(!Q_NOASPECT && hidden_note(key,th)!="")
    printf "  %s\n", cw(hidden_note(key,th),C_ACC)
  printf "  Letters are the colours: %s white  %s red  %s green  %s yellow\n",
     cw("W",K_W), cw("R",K_R), cw("G",K_G), cw("Y",K_Y)
  sil_note()
  #  Left-and-right is where a light sits along her hull, seen from close
  #  to, and it reads backwards to a seaman's eye: a sidelight looks as
  #  though it ought to be forward, toward the bow, and it is drawn aft
  #  of the masts.  That is not the drawing being wrong.  Annex I 3(b)
  #  says the sidelights "shall not be placed in front of the forward
  #  masthead lights", so aft of the masts is where they belong - and at
  #  a bow aspect you are looking across her beam more than along her
  #  length, which swings her starboard light further to your left
  #  still.  It is the same geometry as bow-on, where her green is on
  #  your left and her red on your right; it just fades out as she comes
  #  beam-on.  None of it survives to any real range: a 5 m offset at
  #  2 miles is a fifteenth of a degree.  Height and colour are what you
  #  actually get.  This question has been asked twice; hence the note.
  printf "  %s\n", cwd("Sideways spacing is where the lights sit along her hull, close to.")
  printf "  %s\n", cwd("Annex I keeps sidelights abaft the forward masthead light, so a")
  printf "  %s\n", cwd("sidelight falls toward her stern here, never toward her bow. And")
  printf "  %s\n", cwd("at a bow aspect you see across her beam more than along her length,")
  printf "  %s\n", cwd("so her green swings left - as it does bow-on. Not a heading cue:")
  printf "  %s\n", cwd("at any real range every one of them is in line.")
  print ""
  return 0
}
function reveal_lights(   rk,ra){
  printf "  %s\n", cw(V_NAME,C_ACC)
  printf "  %s.  %s\n", V_RULE, V_NOTE
  if(V_TRAP!="") printf "  %s %s\n", cw("Watch out:",C_ACC), V_TRAP
  if(V_IDX>0){
    split(VT[V_IDX],ra,"|"); rk = ra[1]
    if(hidden_note(rk,V_TH)!="")
      printf "  %s %s\n", cw("And from this bearing:",C_ACC), hidden_note(rk,V_TH)
  }
  if(V_IDX>0){
    print ""
    printf "  %s\n", cw(motion_text(motion_of(V_IDX,V_TH)),C_ACC)
    printf "  %s\n", motion_why(motion_of(V_IDX,V_TH),V_IDX,V_TH)
  }
  print ""
  return 0
}

# =====================================================================
#  Day shapes.  Black shapes on a mast: what the lights become by day.
# =====================================================================
function shp_init(){
  if(SHP_READY) return
  # key | name | rule | glyph stack, top first, separated by ; | note
  SH[1] = "anchor|Vessel at anchor|Rule 30|ball|One black ball, forward, where it can best be seen."
  SH[2] = "aground|Vessel aground|Rule 30|ball;ball;ball|Three balls in a vertical line."
  SH[3] = "nuc|Not under command|Rule 27|ball;ball|Two balls in a vertical line."
  SH[4] = "ram|Restricted in her ability to manoeuvre|Rule 27|ball;diamond;ball|Ball, diamond, ball. The diamond in the middle is the one to remember."
  SH[5] = "draught|Constrained by her draught|Rule 28|cyl|A black cylinder."
  SH[6] = "motorsail|Sailing vessel also under power|Rule 25|conedn|A cone, point down, forward. She is a power-driven vessel now, whatever her sails are doing."
  #  THE BASKET IS HISTORY, AND KEPT AS HISTORY. Larry's ruling, after
  #  the sources were put to him: keep it, but say plainly that it is no
  #  longer prescribed. Rule 26(b)(i) and (c)(i) as they now stand give
  #  the two cones and no alternative -- the basket was in the 1972 text
  #  and is not in the current one. It stays on the screen because it is
  #  still in older books and still occasionally on an older boat, and a
  #  reader who meets one should know what he is looking at and that it
  #  is not what the Convention asks for.
  SH[7] = "fishing|Vessel fishing|Rule 26|hourglass|Two cones with their points together. The 1972 text let a vessel under 20 m show a basket instead; that alternative is no longer in Rule 26, so you may still see one but it is not what the rule now asks for."
  SH[8] = "tow200p|Towing, tow over 200 m|Rule 24|diamond|A diamond, shown by the towing vessel and by the tow."
  SH[9] = "mineclear|Mine clearance|Rule 27|ball;ballpair|Three balls: one at the foremast head and one at each end of the fore yard."
  SH[10]= "divers|Vessel with divers down|Rule 27|flagA|A rigid replica of flag A, at least 1 m high. She is restricted in her ability to manoeuvre."
  NSHP=10
  SHP_READY=1
  return 0
}
function glyph_rows(g,n){
  if(g=="ball"){      GLY[1]="(O)"; return 1 }
  if(g=="diamond"){   GLY[1]="/|\\"; GLY[2]="\\|/"; return 2 }
  if(g=="cyl"){       GLY[1]="[#]"; GLY[2]="[#]"; return 2 }
  if(g=="conedn"){    GLY[1]="\\|/"; GLY[2]=" V "; return 2 }
  if(g=="coneup"){    GLY[1]=" A "; GLY[2]="/|\\"; return 2 }
  if(g=="hourglass"){ GLY[1]="\\|/"; GLY[2]=" X "; GLY[3]="/|\\"; return 3 }
  if(g=="flagA"){     GLY[1]="+---\\"; GLY[2]="|   >"; GLY[3]="+---/"; return 3 }
  if(g=="ballpair"){  GLY[1]="(O)---+---(O)"; return 1 }
  GLY[1]="???"; return 1
}
function shp_find(key,   i,a){ shp_init()
  for(i=1;i<=NSHP;i++){ split(SH[i],a,"|"); if(a[1]==key) return i }
  return 0 }
function draw_shapes(key,   idx,a,n,st,i,j,rows,w,h,sea,cx,r,g,OCC){
  G_NOCROP=0
  idx=shp_find(key); if(idx==0){ print "  unknown shape: " key; return 1 }
  split(SH[idx],a,"|")
  S_NAME=a[2]; S_RULE=a[3]; S_NOTE=a[5]
  n=split(a[4],st,";")
  w=61; h=18; sea=h-3; cx=int(w/2)
  gclear(w,h)
  for(i=0;i<w;i++) gputwc(sea+1,i,"~",C_DIM)
  for(i=-6;i<=6;i++) gputw(sea,cx+i,"=")
  gputw(sea,cx-7,"\\"); gputw(sea,cx+7,"/")
  r=sea-1
  for(i=0;i<h;i++) OCC[i]=0
  for(i=n;i>=1;i--){
    rows=glyph_rows(st[i])
    for(j=rows;j>=1;j--){ gputsc(r, cx-int(length(GLY[j])/2), GLY[j], C_ACC); OCC[r]=1; r-- }
    r--
  }
  for(i=r+1;i<sea;i++) if(!OCC[i]) gputwc(i,cx,"|",C_DIM)
  return 0
}
function show_shapes(key){
  if(draw_shapes(key)) return 1
  print ""
  printf "  %s\n", cw("WHAT IS SHE SHOWING?",C_ACC)
  hr(); gshow(); hr()
  print ""
  return 0
}
function reveal_shapes(){
  printf "  %s\n", cw(S_NAME,C_ACC)
  printf "  %s.  %s\n", S_RULE, S_NOTE
  print ""
  return 0
}

# =====================================================================
#  Encounters.  A plan view, head up, you in the middle.
# =====================================================================
function arrowchar(hdg,   h){
  h=nrm360(hdg)
  if(h<22.5||h>=337.5) return "^"
  if(h<67.5)  return "/"
  if(h<112.5) return ">"
  if(h<157.5) return "\\"
  if(h<202.5) return "v"
  if(h<247.5) return "/"
  if(h<292.5) return "<"
  return "\\"
}
function draw_plan(bg,rng,thdg,tlab,wnd,   w,h,cx,cy,rx,ry,t,r,tr,tc,i,dr,dc,m,ch,wr,wc){
  w=63; h=25; cx=int(w/2); cy=int(h/2); rx=cx-2; ry=cy-1
  gclear(w,h)
  for(t=0;t<360;t+=1.0){
    gputwc(cy-ry*cosd(t), cx+rx*sind(t), ".", C_DIM)
    gputwc(cy-ry*0.5*cosd(t), cx+rx*0.5*sind(t), ".", C_DIM)
  }
  for(t=0;t<360;t+=30) gputwc(cy-ry*1.0*cosd(t), cx+rx*1.0*sind(t), "+", C_DIM)
  # you, head up
  gputc(cy-1,cx,"^",C_ACC); gputc(cy,cx,"|",C_ACC)
  gputsc(cy+1,cx-1,"YOU",C_ACC)
  # the other vessel
  tr = cy - ry*rng*cosd(bg)
  tc = cx + rx*rng*sind(bg)
  ch = arrowchar(thdg)
  dr = -cosd(thdg); dc = sind(thdg)
  m = fabs(dr); if(fabs(dc)>m) m=fabs(dc)
  dr=dr/m; dc=dc/m
  for(i=1;i<=4;i++) gputw(tr - dr*i, tc - dc*i, ":")
  gput(tr,tc,ch)
  gputs(tr + (tr<cy?-1:1), tc+2, tlab)
  #  THE WIND, WHERE THE SCENARIO HAS ONE.  Rule 12 is decided by which
  #  side the wind is on, so a sailing scenario that names windward and
  #  leeward has to draw the wind or the reader cannot check the premise.
  #  Drawn from the upwind edge pointing downwind, which is the way a
  #  wind arrow is read on a chart.
  if(wnd!=""){
    #  IN A CORNER, NOT ON THE RIM.  Drawn at the upwind edge it lands on
    #  top of the contact in every windward scenario -- she IS upwind, so
    #  the two markers are the same place. A chart draws wind as an arrow
    #  of fixed length and position pointing downwind: the direction is
    #  the information, the position is not.
    wr = 3; wc = 7
    dr = -cosd(wnd+180); dc = sind(wnd+180)
    m = fabs(dr); if(fabs(dc)>m) m=fabs(dc)
    dr=dr/m; dc=dc/m
    for(i=-2;i<=1;i++) gputwc(wr + dr*i, wc + dc*i*2, "=", C_DIM)
    gputc(wr + dr*2, wc + dc*4, arrowchar(nrm360(wnd+180)), C_DIM)
    gputsc(wr+4, wc-2, "WIND", C_DIM)
  }
  gputsc(0,cx-6,"HEAD  UP",C_DIM)
  return 0
}
#  A SOUND SIGNAL IS HEARD, NOT SEEN.  One predicate, used by the stem
#  and by the lights view, so the two cannot disagree about whether she
#  is visible -- they did, and the stem was the one that was wrong.
#  Checked against all twenty-eight targets: it matches the two fog
#  signals and nothing else.
function heard(t){ return (t ~ /blast|fog signal/) }
function enc_init(){
  if(ENC_READY) return
  # own | target label | brglo | brghi | target heading | answer | options | why | rule | wind | vessel
  #
  #  THE LAST TWO FIELDS ARE ALWAYS PRESENT, empty or not. They were
  #  optional-and-omitted for an hour on 22 October, and the vessel key
  #  then sat at field 10 on the rows with no wind and field 11 on the
  #  rows with one -- so twenty-five scenarios read as having no vessel
  #  at all and drew no picture, silently, because an absent key and a
  #  deliberate blank look identical from here. tests/colregs-vessel.awk
  #  now counts the fields and resolves every key.
  #
  #  wind:   the true wind direction, relative to YOUR head, where Rule
  #          12 turns on which side it is. Empty on a power scenario.
  #  vessel: a key into the twenty-eight the lights drill renders, so the
  #          scenario can draw her at the aspect it was drawn from
  #          instead of describing her. Empty on the two fog signals,
  #          where you cannot see her, and on the seaplane, whose lights
  #          Rule 31 leaves as "as closely as possible" to Rule 23.
  EC[1]="You are a power-driven vessel under way.|a power-driven vessel, both her sidelights and two masthead lights in line|359|1|180|d|"\
"Stand on: keep your course and speed.;Give way: alter to port and pass down her starboard side.;Sound one short blast and hold on.;Alter course to starboard, and expect her to do the same.|"\
"Head-on, or nearly so, between two power-driven vessels. Neither is the stand-on vessel: each alters to starboard so that they pass port to port. Seeing both her sidelights is the classic sign.|Rule 14||power50p"
  EC[2]="You are a power-driven vessel under way.|a power-driven vessel showing her red sidelight|030|090|290|b|"\
"Stand on: she must keep clear of you.;Give way: alter to starboard and pass under her stern.;Give way: alter to port to cut across ahead of her.;Slow down and let her decide.|"\
"She is crossing from your starboard side, so you are the give-way vessel. Rule 15 says keep out of her way and, if the circumstances admit, avoid crossing ahead of her - so you alter to starboard and go under her stern.|Rule 15||power50"
  EC[3]="You are a power-driven vessel under way.|a power-driven vessel showing her green sidelight|270|330|070|a|"\
"Stand on: keep your course and speed, and watch her.;Give way: alter to starboard.;Give way: alter to port.;Stop your engines at once.|"\
"She is crossing from your port side, so she must keep out of your way and you are the stand-on vessel. Keep your course and speed - but Rule 17 also allows you to act as soon as it is clear she is not, and requires you to act when collision cannot be avoided by her action alone.|Rule 17||power50"
  EC[4]="You are a power-driven vessel making 18 knots.|a power-driven vessel making 8 knots, showing only her sternlight|350|010|000|b|"\
"Stand on: you are the faster vessel.;Give way: you are overtaking, so keep clear until you are finally past and clear.;Sound two short blasts and pass down her port side.;Alter to starboard only if she alters first.|"\
"You are coming up on her from more than 22.5 degrees abaft her beam - you can see only her sternlight, which is the test. Any subsequent alteration of bearing does not make you a crossing vessel: you remain the give-way vessel until finally past and clear.|Rule 13||power50"
  EC[5]="You are a power-driven vessel making 8 knots.|a large power-driven vessel coming up astern|170|200|000|a|"\
"Stand on: keep your course and speed.;Give way: alter to starboard.;Give way: slow down and let her pass.;Alter to port to open the distance.|"\
"She is overtaking you, so she must keep out of your way. You are the stand-on vessel and should hold your course and speed so that she can plan around you.|Rule 13||power50p"
  EC[6]="You are a power-driven vessel under way.|a sailing vessel under sail alone|020|080|300|b|"\
"Stand on: she is smaller than you.;Give way: keep out of her way.;Give way only if she is on your starboard side.;Sound five short blasts.|"\
"A power-driven vessel under way keeps out of the way of a sailing vessel. Which side she is on does not come into it, and neither does her size.|Rule 18||sail"
  EC[7]="You are a sailing vessel under sail alone.|a power-driven vessel|300|350|080|a|"\
"Stand on: she must keep out of your way.;Give way: alter to starboard.;Give way: tack away.;Bear away and pass under her stern.|"\
"She is a power-driven vessel and you are under sail, so she keeps clear. Stand on - but keep watching, and be ready to act under Rule 17 if she does nothing.|Rule 18||power50"
  EC[8]="You are a power-driven vessel under way.|a vessel showing red over white all-round lights, with sidelights|300|060|150|b|"\
"Stand on: she is fishing and must keep clear.;Give way: keep well out of her way.;Give way only if she is on your starboard side.;Pass close ahead to give her room astern.|"\
"Red over white means a vessel engaged in fishing other than trawling. A power-driven vessel keeps out of the way of a vessel engaged in fishing, and you should also expect gear to be streamed a long way astern of her.|Rule 18||fishing"
  EC[9]="You are a power-driven vessel under way.|a vessel showing red, white, red in a vertical line|280|080|170|b|"\
"Stand on: she is the give-way vessel.;Give way: keep well out of her way.;Sound one short blast and alter to starboard.;Stand on but sound five short blasts.|"\
"Red over white over red: restricted in her ability to manoeuvre. She may be dredging, laying cable or transferring stores, and she cannot get out of your way. Everything keeps clear of her except a vessel not under command.|Rule 18||ram"
  EC[10]="You are a power-driven vessel in a deep-water channel.|a vessel showing three all-round red lights in a vertical line|300|060|170|b|"\
"Stand on: a constrained vessel has no special status.;Give way: avoid impeding her safe passage.;Overtake her quickly on her starboard side.;Anchor until she has passed.|"\
"Three all-round reds means a vessel constrained by her draught. She is not technically a stand-on vessel under Rule 18, but every vessel must avoid impeding her safe passage, and she may have very little water under her.|Rule 18(d)||draught"
  EC[11]="You are a sailing vessel on the port tack.|a sailing vessel on the starboard tack|020|070|265|b|"\
"Stand on: you were there first.;Give way: keep out of her way.;Give way only if she is to windward.;Tack immediately.|"\
"When two sailing vessels have the wind on different sides, the one with the wind on the port side keeps out of the way of the other. You are on port tack, so you give way.|Rule 12|315|sail"
  EC[12]="You are a sailing vessel to windward.|a sailing vessel to leeward, both of you on the same tack|070|100|345|b|"\
"Stand on: windward has right of way.;Give way: the windward vessel keeps clear of the leeward vessel.;Give way only in a narrow channel.;Both alter to starboard.|"\
"With the wind on the same side, the vessel to windward keeps out of the way of the vessel to leeward. Windward gives way - the opposite of what many people first guess.|Rule 12|300|sail"
  EC[13]="You are a power-driven vessel under way.|a vessel showing two all-round red lights and no sidelights|280|080|000|b|"\
"Stand on: she is not moving.;Give way: keep well out of her way - she is not under command.;Sound five short blasts and hold on.;Pass close ahead - she cannot move.|"\
"Two all-round reds and nothing else: not under command, and making no way through the water. She cannot manoeuvre at all. Everything keeps out of her way.|Rule 18||nuc"
  EC[14]="You are a power-driven vessel under way in fog, hearing but not seeing her.|a fog signal of one prolonged blast followed by two short|300|060|170|b|"\
"Stand on: the signal tells you she will keep clear.;Reduce to bare steerage way - she may be not under command, restricted in her ability to manoeuvre, constrained by her draught, sailing, fishing, or towing or pushing.;Alter boldly to port.;Sound five short blasts and continue.|"\
"One prolonged and two short is the signal for a vessel not under command, restricted in her ability to manoeuvre, constrained by her draught, sailing, fishing, or towing or pushing another vessel. In restricted visibility there is no stand-on vessel: Rule 19 requires you to reduce to the minimum at which you can be kept on course, and if necessary take all way off.|Rule 19||"
  EC[15]="You are a yacht of 11 m, under power, crossing a narrow buoyed channel.|a laden bulk carrier coming down the channel, which she cannot leave|020|090|300|b|"\
"Stand on: you are crossing and she is on your starboard side, so Rule 15 applies.;Keep clear early: do not impede a vessel that can only navigate within the channel.;Cross ahead quickly to get out of her way.;Anchor in the channel until she has passed.|"\
"Rule 9(b): a vessel of less than 20 metres or a sailing vessel shall not impede the passage of a vessel which can safely navigate only within a narrow channel. Shall not impede is stronger than give way - keep clear early enough that the question never arises.|Rule 9||draught"
  EC[16]="You are a 12 m yacht under sail, crossing a traffic separation scheme.|a container ship following the lane|030|080|300|b|"\
"Stand on: you are under sail, so power keeps clear of you.;Keep clear: a sailing vessel shall not impede a power-driven vessel following a lane, and cross on a heading at right angles to the flow.;Motor along the lane until there is a gap.;Cross at a shallow angle to spend less time in the lane.|"\
"Rule 10(j): a vessel under 20 metres or a sailing vessel shall not impede the safe passage of a power-driven vessel following a traffic lane. And Rule 10(c) says cross on a heading as nearly as practicable at right angles to the flow - heading, not ground track, because a beam-on aspect is what makes you visible and predictable.|Rule 10||power50p"
  EC[17]="You are a coaster overtaking a slower vessel in a narrow channel.|the vessel ahead, whose agreement you need before you pass|350|010|000|c|"\
"Alter to starboard and pass, sounding one short blast.;Pass on whichever side has more water, without signalling.;Sound two prolonged and one short - I intend to overtake you on your starboard side - and wait for her answer.;Call her on VHF and pass when she does not object.|"\
"Rule 9(e) with Rule 34(c): in a narrow channel, when she has to take action to let you pass safely, you need her agreement before you overtake. You signal two prolonged and one short for her starboard side, two prolonged and two short for her port side, and she answers prolonged, short, prolonged, short if she agrees.|Rule 9(e)||power50"
  EC[18]="You are a power-driven vessel in thick fog, hearing but not seeing her.|two prolonged blasts, about two seconds apart|300|010|000|b|"\
"Stand on: two prolonged means she is stopped, so she is no danger.;Reduce to the least speed at which you can be kept on course, and be ready to take all way off.;Alter boldly to port and pass down her starboard side.;Sound five short blasts and hold your speed.|"\
"Two prolonged blasts is a power-driven vessel under way but stopped and making no way. In restricted visibility there is no stand-on vessel: Rule 19(e) requires you to reduce to bare steerage way on hearing a fog signal apparently forward of the beam, and if necessary take all your way off.|Rule 19||"
  EC[19]="You are a yacht under sail alone.|a vessel showing two all-round red lights and nothing else|280|080|000|b|"\
"Stand on: you are under sail, so everything keeps clear of you.;Keep well out of her way: she is not under command and cannot manoeuvre at all.;Pass close under her stern to see what is wrong.;Sound five short blasts.|"\
"Being under sail does not put you at the top of the order. Rule 18(b): a sailing vessel keeps out of the way of a vessel not under command, of one restricted in her ability to manoeuvre, and of one engaged in fishing.|Rule 18(b)||nuc"
  EC[20]="You are a sailing vessel, and the vessel to windward is on the same tack.|another sailing vessel to windward, converging|020|080|300|a|"\
"Stand on: the windward vessel keeps clear of the leeward vessel.;Give way: you are the leeward vessel and must bear away.;Give way: tack immediately.;Both alter to starboard.|"\
"Rule 12(a)(ii): when two sailing vessels have the wind on the same side, the vessel which is to windward keeps out of the way of the vessel to leeward. You are to leeward, so you stand on.|Rule 12|050|sail"
  EC[21]="You are a power-driven vessel in a deep-water route.|a loaded tanker showing three all-round red lights in a vertical line|300|060|170|b|"\
"Stand on: she has no special status under Rule 18.;Avoid impeding her safe passage - she may have very little water under her keel.;Overtake her briskly on her starboard side.;Cross close ahead of her to clear the route.|"\
"Three all-round reds means constrained by her draught. Rule 18(d) says every vessel shall, if the circumstances of the case admit, avoid impeding her safe passage, and she must navigate with particular caution.|Rule 18(d)||draught"
  #  ON YOUR PORT BOW (1.19, Larry's ruling TBGH, 23 Nov 2026).  She was
  #  on the starboard bow, where Rule 18(e) says she keeps clear "in
  #  general" but, once risk of collision exists, Rule 15 makes YOU give
  #  way to a power-driven vessel on your starboard side -- so the marked
  #  "stand on" was wrong, and the why text stated the exception that
  #  contradicted it (PILOT's QA, rated (a)).  To port, both rules give
  #  the same answer and the answer stands.
  EC[22]="You are a power-driven vessel under way.|a seaplane on the water|290|340|080|a|"\
"Stand on: a seaplane on the water in general keeps well clear of all vessels.;Give way: an aircraft has right of way.;Give way: alter to starboard and pass astern of her.;Stop your engines.|"\
"Rule 18(e): a seaplane on the water shall, in general, keep well clear of all vessels and avoid impeding their navigation. Once risk of collision exists she complies with the rules of this part like any other vessel - and here she is on your port side, so Rule 15 makes her the give-way vessel too. Either way you stand on, and keep watching her under Rule 17.|Rule 18(e)||"
  EC[23]="You are a power-driven vessel under way.|a vessel showing three all-round green lights, one at the masthead and one at each yardarm|300|060|170|c|"\
"Stand on: green lights mean she is under way and keeping clear.;Give way: alter to starboard and pass a cable astern of her.;Keep at least 1000 metres clear of her: she is engaged in mine clearance.;Sound one short blast and pass close ahead.|"\
"Rule 27(f): three all-round greens marks a vessel engaged in mine clearance operations. Other vessels shall keep at least 1000 metres clear of her - much further than ordinary avoiding action.|Rule 27(f)||mineclear"
  EC[24]="You are a power-driven vessel closing the coast at night.|two all-round red lights in a line, with a white light below and forward, and no sidelights|300|060|000|b|"\
"Stand on: she is showing red over red, so she is not under command and under way.;Keep clear: anchor lights with two all-round reds means she is aground, so there is shoal water where she sits.;Close her to offer assistance without altering course.;Sound one prolonged blast and hold on.|"\
"Rule 30(d): a vessel aground shows the anchor lights plus two all-round reds in a vertical line. The important part is not only that she cannot move - it is that you now know exactly where the shoal is.|Rule 30(d)||aground"
  EC[25]="You are entering a busy anchorage after dark.|a single all-round white light, low down, not moving|350|030|000|b|"\
"Stand on: a single white light is a sternlight, so she is going away from you.;Treat her as a vessel at anchor and pass well clear: she is not under way and cannot get out of your way.;Assume it is a small boat under oars and hold your course.;Sound two short blasts and pass down her port side.|"\
"One all-round white is a vessel of under 50 metres at anchor. A single white light is genuinely ambiguous at first sight - it may be a sternlight, an anchor light or a small craft - so the answer is to keep watching the bearing and pass well clear until you know which.|Rule 30||anchor"
  EC[26]="You are a power-driven vessel approaching a pilot station.|a pilot vessel showing white over red, with sidelights and a sternlight, crossing from your port side|280|340|070|a|"\
"Stand on: she is crossing from your port side, and being a pilot vessel gives her no special status.;Give way: pilot vessels always have right of way.;Give way: sound one short blast and alter to starboard.;Stop and let her cross.|"\
"White over red - pilot ahead. Rule 29 says what a pilot vessel shows, not that she is privileged. Unless she is also restricted in her ability to manoeuvre, the ordinary steering rules apply, and here she is on your port side crossing.|Rule 29||pilot"
  EC[27]="You are a yacht under sail alone, overhauling a fishing boat that is under way and making 5 knots.|the vessel ahead, showing only her sternlight|350|010|000|b|"\
"Stand on: you are under sail, so she keeps clear of you.;Give way: you are overtaking, and Rule 13 overrides the order of Rule 18.;Give way only if she starts fishing.;Sound one short blast and pass to starboard.|"\
"Rule 13 applies notwithstanding anything contained in Rules 4 to 18 - so an overtaking vessel keeps clear whatever the two vessels are. Sailing does not help you here, and you only see her sternlight, which is the test for overtaking.|Rule 13||power50"
  EC[28]="You are a power-driven vessel crossing ahead of a tug and her tow at night.|three masthead lights in a vertical line, sidelights and a yellow light above her sternlight|020|080|300|c|"\
"Stand on: the tug is restricted and will keep clear of you.;Give way: alter to port and pass between the tug and her tow.;Give way: alter to starboard and pass well astern of the whole tow - it is more than 200 metres long.;Cross close ahead of the tug to stay clear of the tow.|"\
"Three masthead lights in a vertical line means the tow exceeds 200 metres. The tow itself may show only sidelights and a sternlight and is easy to miss, and the towline between them is not lit at all. Never pass between a tug and her tow.|Rule 24||tow200p"
  #  HOW FAR HER DRAWN HEADING MAY SWING, either side of the target
  #  heading, where 15 degrees is too much.  PILOT's QA of the 28
  #  encounters (22 Nov 2026) stepped every bearing and heading the draw
  #  can make and found pictures that contradicted their own answer:
  #
  #    1   head-on drawn with one sidelight in 83% of draws -- the text
  #        says both.  1 degree each way on bearing and heading keeps
  #        her within the 2.5-degree overlap arc_vis() allows, so every
  #        draw shows both sidelights.
  #    12  she was drawn abaft your beam in three draws out of four, so
  #        she was overtaking you and Rule 13, not Rule 12, decided it.
  #    6, 11, 15, 20, 28
  #        at the far end of a 15-degree swing YOU come out more than
  #        22.5 degrees abaft HER beam, which makes you the overtaking
  #        vessel.  In 20 that reverses the answer (you would keep
  #        clear, not stand on); in the others the answer survives but
  #        the picture teaches the wrong rule.  10 degrees closes it.
  #
  #    2, 3 (1.20, Larry's ruling TBGL, 23 Nov 2026)
  #        the words name ONE sidelight, red in 2 and green in 3, and in
  #        about one draw in a hundred she was drawn within 2.5 degrees
  #        of end-on, where arc_vis() shows both.  Not by the swing: by
  #        the bearing range, trimmed 10 degrees at the end nearest her
  #        bow (2: 030-090, was 030-100; 3: 270-330, was 260-330), so
  #        you are always at least 5 degrees off her bow and the picture
  #        shows the one sidelight named.
  #
  #  tests/colregs-geometry.awk holds every encounter to these over
  #  thousands of draws.  A scenario not named here swings 15 degrees.
  ECH[1]=1; ECH[6]=10; ECH[11]=10; ECH[12]=5; ECH[15]=10; ECH[20]=10; ECH[28]=10
  NENC=28
  ENC_READY=1
  return 0
}
#  ONE DEFINITION OF THE GEOMETRY, used by the question, by the answer
#  and by the test.  The bearing and heading are drawn from the seed, and
#  they were being derived in enc_show only -- so the answer could not
#  quote the bearing it had just asked about, and the wind test had to
#  reproduce the draw itself, which is two more places for it to drift.
function enc_geom(i,seed,   a,hi,sw){
  split(EC[i],a,"|")
  sw = (i in ECH) ? ECH[i]+0 : 15
  xsrand(seed+0); xrand()
  ENC_BG = a[3]+0; hi = a[4]+0
  if(hi < ENC_BG) hi += 360
  ENC_BG   = nrm360(ENC_BG + xrand()*(hi-ENC_BG))
  ENC_RNG  = 0.55 + xrand()*0.35
  ENC_THDG = nrm360(a[5]+0 + (xrand()*2*sw-sw))
  ENC_WND  = (10 in a ? a[10] : "")
  return 0
}
function enc_pick(i,seed,   a){
  enc_init(); split(EC[i],a,"|")
  ENC_ANS=a[6]; ENC_WHY=a[8]; ENC_RULE=a[9]
  if(seed!="") { enc_geom(i,seed+0); ENC_BRG=ENC_BG }
  return 0
}
function enc_show(i,seed,   a,o,bg,rng,thdg,n,wnd){
  enc_init()
  split(EC[i],a,"|")
  enc_geom(i,seed+0)
  bg=ENC_BG; rng=ENC_RNG; thdg=ENC_THDG; wnd=ENC_WND
  #  RESOLVE THE WIND TO A SCALAR BEFORE PASSING IT.  Most scenarios have
  #  no tenth field, and handing the unset element a[10] straight to a
  #  function argument aborted gawk 5.2 on exit -- "free(): double free
  #  detected in tcache" -- AFTER printing the whole scenario correctly.
  #  27 of the 30 scenarios, which is every power-driven one, and the
  #  three sailing ones were fine because theirs is set.  Referencing
  #  a[10] also creates it, so `10 in a` asks without writing.
  draw_plan(bg,rng,thdg,"HER",wnd)
  print ""
  printf "  %s\n", cw("WHAT DO YOU DO?",C_ACC)
  hr()
  gshow()
  hr()
  printf "  %s\n", a[1]
  #  A BEARING BY NAME, NOT BY NUMBER.  Larry: "names instead of degrees
  #  for bearing to contact: she is fine on your port bow as opposed to
  #  331 degrees."  He is right, and the app already had the vocabulary --
  #  rel_phrase is what the lookout-report styles are built on, and the
  #  encounter stem was the one place left printing a raw number.
  #
  #  A lookout reports the arc, not the angle, and the arc is what you act
  #  on: "fine on your port bow" is a situation, "331 relative" is a
  #  figure to look up. The exact bearing is printed with the ANSWER
  #  instead, where it is a check on your plot rather than the thing being
  #  tested.
  #  AND YOU DO NOT SEE A SOUND SIGNAL.  Larry, reviewing the claims:
  #  '"You see a fog signal of one prolonged blast followed by two
  #  short, forward of your beam." should be "You hear".'  Two of the
  #  twenty-eight scenarios are sound signals in fog, and both of them
  #  opened by telling the reader he could see one. The whole point of
  #  those two is that you CANNOT see her -- it is why neither gets a
  #  light picture, and the lights view says so in as many words, above
  #  a stem that contradicted it.
  printf "  You %s %s, %s, heading as drawn.\n",
     (heard(a[2]) ? "hear" : "see"), a[2], rel_phrase(bg,"your")
  #  In words as well as in the drawing: the figure can be read wrongly,
  #  and on a phone the dim characters are easy to miss.
  if(wnd!="")
    printf "  The wind is from %03d relative, as drawn.\n", nrm360(wnd+0)
  hr()
  n=split(a[7],o,";")
  printf "   a) %s\n   b) %s\n   c) %s\n   d) %s\n", o[1],o[2],o[3],o[4]
  print ""
  ENC_ANS=a[6]; ENC_WHY=a[8]; ENC_RULE=a[9]; ENC_BRG=bg
  return 0
}
#  WHAT YOU WOULD ACTUALLY SEE.  Larry: "I thought you had added the
#  button to turn on the nav lights in the colregs scenarios section, so
#  we could see what was visable."  It exists in the developing-collision
#  flow and not in this one, which is the flow he was drilling.
#
#  Only for the scenarios that describe her by TYPE. Sixteen of the
#  twenty-eight describe her by her lights already, so a light picture
#  there would repeat the stem or contradict it, and two are fog signals.
#  Those say so rather than drawing nothing.
#
#  Our own kind comes from the stem, which always states it.
function enc_lights(i,   a,relher,we){
  split(EC[i],a,"|")
  print ""
  printf "  %s\n", cw("WHAT YOU WOULD SEE",C_ACC)
  hr()
  if(a[11]==""){
    #  Three scenarios have no picture, for two different reasons, and
    #  saying which is the teaching point rather than an apology.
    if(a[2] ~ /blast|fog signal/){
      print "  Nothing. You cannot see her at all -- that is the whole point of a"
      print "  sound signal, and why the rule hangs on hearing rather than seeing."
    } else {
      print "  Rule 31 says a seaplane shows lights \"as closely as possible\" to the"
      print "  rules for a power-driven vessel, so there is no one right picture to"
      print "  draw. Expect something approximating Rule 23 and treat her as one."
    }
    hr(); print ""
    return 0
  }
  #  THE SAME RENDERER THE LIGHTS DRILL USES, at the aspect this question
  #  was drawn from.  draw_lights handles a stack of all-round lights --
  #  red over white over red and the rest -- which is exactly the part
  #  that would have been painful to describe in prose, and it is already
  #  written. Larry: "maybe we show them at the top, over the diagram, in
  #  a bar....just an idea."  The idea is right; the renderer existed.
  relher = nrm360(ENC_BG + 180 - ENC_THDG)   # where WE are, off HER bow
  if(draw_lights(a[11], relher)) return 1
  gshow()
  hr()
  printf "  %s\n", aspect_line(V_IDX,relher)
  printf "  Letters are the colours: %s white  %s red  %s green  %s yellow\n",
     cw("W",K_W), cw("R",K_R), cw("G",K_G), cw("Y",K_Y)
  sil_note()
  hr()
  #  WHAT THE PICTURE DOES NOT TELL YOU, which is the half the rule turns
  #  on in two of these scenarios.
  we = lt_note(a[11], relher)
  #  and no empty band where there is nothing to say: most vessels now
  #  get no note, and two rules with nothing between them read as a
  #  missing paragraph.
  if(we!=""){
    if(we=="sail"){
      print "  Her sidelights say she is there and which way she is pointing. They"
      print "  say nothing about which tack she is on, and Rule 12 turns on that."
    } else if(we=="stern")
      print "  A sternlight and no colour: you are overtaking (Rule 13), whatever else\n  is true of her."
    else
      print "  Both sidelights and a masthead light: an ordinary power-driven vessel\n  end on. Rule 14, and nobody stands on."
    hr()
  }
  print ""
  return 0
}
#  A SCENARIO NUMBER THAT DOES NOT EXIST IS AN ERROR, not a scenario.
#  `which=29` used to split an unset EC element, which in awk is the
#  empty string, and go on to draw a plan view of nobody with an empty
#  question under it -- and exit 0 doing it. The suite's own exit-status
#  loop reported "all 40 scenarios exit cleanly" when there are 28 of
#  them, which is the kind of number that looks like coverage and is not.
function enc_range(n){
  enc_init()
  if(n==int(n) && n>=1 && n<=NENC) return 0
  printf "colregs: there is no scenario %s (1 to %d)\n", n, NENC > "/dev/stderr"
  return 1
}
#  THE CONFIRMING NUMBER, as a function so the browser can be held to
#  it. The arc asks and the number confirms, and the number is followed
#  by the reader's own way of saying it -- which is the whole point of
#  the reporting style being a setting.
#
#  AND NOT TWICE. The prefix is already the rel360 style, so for a
#  reader set to rel360 the line said the same angle twice and rounded
#  it two different ways -- "she bore 003 relative -- 002 relative" --
#  while a reader set to "none" got a dangling "-- )" with nothing after
#  it. Both were live until 24 October 2026, and both only became
#  visible when this was pulled out of enc_reveal() and printed in each
#  of the five styles. An older comment here claimed the double-rounding
#  was already fixed; it was fixed for one style and not for that one.
#
#  So the suffix is dropped when it says nothing, and when it is the
#  same FORM as the prefix -- matched on shape, not on the string and
#  not on a style's name. Comparing the strings is not enough and that
#  is the bug itself: the prefix rounds the angle and rel_style's %03d
#  truncates it, so the two spellings of one bearing differ by a degree
#  exactly when it matters, and "003 relative" != "002 relative" while
#  being the same thing said twice. Matching the shape means a sixth
#  style needs nothing here either.
function enc_bore(bg,   pre,suf){
  pre = sprintf("%03d relative", int(nrm360(bg)+0.5)%360)
  suf = rel_style(bg)
  if(suf=="" || suf ~ /^[0-9][0-9][0-9] relative$/) return "she bore " pre
  return "she bore " pre " -- " suf
}
function enc_reveal(){
  printf "  %s -- %s\n", cw(toupper(ENC_ANS) " is right",C_ACC), ENC_RULE
  printf "  %s\n", ENC_WHY
  #  The number, now that it can give nothing away: it is the check
  #  against your own plot.
  #  rounded once, not twice: %03d truncates and rel_style rounds, so the
  #  same angle printed both ways read "006 relative -- Green 7".
  if(ENC_BRG!="") printf "  (%s)\n", enc_bore(ENC_BRG)
  print ""
  return 0
}

# =====================================================================
#  Sound signals.  A script cannot make a noise, so it draws one.
#    #      one short blast, about a second
#    ####   one prolonged blast, four to six seconds
#    * *    distinct strokes on the bell
#    *****  the bell rung rapidly
# =====================================================================
function snd_init(){
  if(SND_READY) return
  # key | pattern | meaning | rule | when
  SD[1] ="stbd|#|I am altering my course to starboard|Rule 34(a)|In sight of one another, power-driven, when manoeuvring as authorised or required by these rules."
  SD[2] ="port|# #|I am altering my course to port|Rule 34(a)|In sight of one another, power-driven."
  SD[3] ="astern|# # #|I am operating astern propulsion|Rule 34(a)|Note that this says what the engines are doing, not that the vessel is moving astern."
  SD[4] ="doubt|# # # # #|I do not understand your intentions, or I doubt you are taking sufficient action|Rule 34(d)|Five or more short and rapid blasts. Use it early and use it loudly; it is the only signal that says something is wrong."
  SD[5] ="ovtstbd|#### #### #|I intend to overtake you on your starboard side|Rule 34(c)|In a narrow channel or fairway, where overtaking needs the other vessel's cooperation."
  SD[6] ="ovtport|#### #### # #|I intend to overtake you on your port side|Rule 34(c)|In a narrow channel or fairway."
  SD[7] ="agree|#### # #### #|I agree: go ahead and overtake|Rule 34(c)|The vessel about to be overtaken answers prolonged, short, prolonged, short."
  SD[8] ="bend|####|I am approaching a bend where other vessels may be hidden|Rule 34(e)|Answered by any vessel within hearing round the bend with the same signal."
  SD[9] ="fogpower|####|Power-driven vessel making way through the water|Rule 35(a)|At intervals of not more than two minutes."
  SD[10]="fogstop|#### ####|Power-driven vessel under way but stopped and making no way|Rule 35(b)|Two prolonged blasts, about two seconds apart, every two minutes."
  #  "OR PUSHING" was missing. Rule 35(c) covers "a vessel engaged in
  #  towing or pushing another vessel", and a vessel pushing ahead sounds
  #  the same one-prolonged-two-short as the rest -- she was simply not
  #  in the list. Still six categories, because towing and pushing are
  #  one of them.
  SD[11]="fogram|#### # #|Not under command, restricted in ability to manoeuvre, constrained by draught, sailing, fishing, or towing or pushing|Rule 35(c)|One prolonged and two short, every two minutes. Six different kinds of vessel share this signal, so it tells you to be careful rather than exactly what she is."
  SD[12]="fogtowed|#### # # #|A vessel being towed, and manned|Rule 35(e)|One prolonged and three short, sounded immediately after the towing vessel's signal."
  SD[13]="foganchor|*****|At anchor|Rule 35(g)|The bell rung rapidly for about five seconds, every minute. A vessel of 100 m or more also sounds a gong aft, and any vessel may add one short, one prolonged and one short to warn an approaching vessel."
  SD[14]="fogaground|* * * ***** * * *|Aground|Rule 35(h)|Three distinct strokes, the rapid ringing, then three distinct strokes again."
  SD[15]="pilot|# # # #|Pilot vessel on duty - identity signal|Rule 35(k)|Four short blasts, in addition to whatever signal her situation requires."
  NSND=15
  SND_READY=1
  return 0
}
function snd_draw(pat,   n,a,i,j,line,ruler,t){
  line=""; ruler=""
  n=split(pat,a," ")
  for(i=1;i<=n;i++){
    if(i>1){ line=line "   "; ruler=ruler "   " }
    line=line a[i]
    for(j=1;j<=length(a[i]);j++) ruler=ruler "-"
  }
  print ""
  printf "        %s\n", cw(line,C_ACC)
  printf "        %s\n", cw(ruler,C_DIM)
  printf "        %s\n", cw("time ->",C_DIM)
  print ""
  return 0
}
function snd_find(key,   i,a){ snd_init()
  for(i=1;i<=NSND;i++){ split(SD[i],a,"|"); if(a[1]==key) return i }
  return 0 }
function snd_show(i,   a){
  snd_init(); split(SD[i],a,"|")
  print ""
  printf "  %s\n", cw("WHAT IS SHE SAYING?",C_ACC)
  hr()
  snd_draw(a[2])
  hr()
  print "  #  short blast, about one second      ####  prolonged, four to six seconds"
  print "  *  a stroke on the bell               ***** the bell rung rapidly"
  print ""
  SND_MEAN=a[3]; SND_RULE=a[4]; SND_WHEN=a[5]
  return 0
}
function snd_reveal(){
  printf "  %s\n", cw(SND_MEAN,C_ACC)
  printf "  %s.  %s\n", SND_RULE, SND_WHEN
  print ""
  return 0
}
function snd_table(   i,a){
  snd_init()
  print ""
  printf "  %s\n", cw("SOUND SIGNALS",C_ACC)
  hr()
  print "  In sight of one another (Rule 34)"
  for(i=1;i<=8;i++){ split(SD[i],a,"|")
    printf "    %-18s %s\n", a[2], a[3] }
  print ""
  print "  In or near an area of restricted visibility (Rule 35)"
  for(i=9;i<=15;i++){ split(SD[i],a,"|")
    printf "    %-18s %s\n", a[2], a[3] }
  hr()
  print "  #  short blast (one second)     ####  prolonged blast (four to six seconds)"
  print "  *  stroke on the bell           ***** bell rung rapidly for five seconds"
  print ""
  return 0
}

# ---------------------------------------------------------------------
#  THE LIGHTS' ARCS, FROM ABOVE (B30; Larry's peer review, 21 November
#  2026: "lots of pictures").  Her lights seen from overhead, head up:
#  the masthead light's 225 degrees on the inner ring, the sidelights'
#  112.5 each and the sternlight's 135 on the outer one, and dotted lines
#  22.5 degrees abaft each beam, where the sidelights end and the
#  sternlight begins.  Rule 13 calls a vessel overtaking when she comes
#  up from behind those lines, so L8 draws the same picture with the
#  overtaking sector filled.
#
#  EVERY MARK IS ASKED OF arc_vis(), the function that decides what the
#  lights drill shows, rather than drawn from the numbers again here.
#  So the picture cannot teach an arc the drill does not use, and
#  tests/colregs-arcs-check.awk walks the ring to hold it to that.
#
#  Under -v FIGDUMP=1 (the web generator only) it prints a marker in its
#  place, and the browser draws the same figure as SVG: rules-figs.js.
# ---------------------------------------------------------------------
function lt_arcs(mode,   w,h,cy,cx,ro,ri,b,r,c,ch,k,s,p,t,rr){
  if(FIGDUMP){ print "@@FIG arcs mode=" mode; return 0 }
  w=67; h=19; cy=9; cx=33; ro=8; ri=5
  gclear(w,h); G_NOCROP=1
  #  the overtaking sector, filled, under everything else
  if(mode=="overtake")
    for(b=115;b<=245;b+=5) for(rr=ri+1;rr<ro;rr+=0.5)
      gputc(cy-rr*cosd(b), cx+2*rr*sind(b), ".", C_DIM)
  #  22.5 degrees abaft each beam: the edge between sidelight and stern
  for(rr=1.5;rr<=ro+0.5;rr+=0.25){
    gputc(cy-rr*cosd(112.5), cx+2*rr*sind(112.5), ":", C_DIM)
    gputc(cy-rr*cosd(-112.5), cx+2*rr*sind(-112.5), ":", C_DIM) }
  #  the outer ring: which of her side and stern lights you see from
  #  each bearing.  Dead ahead both sidelights show (the 2.5 degrees
  #  Annex I allows), so the bow is marked with a bar, not a letter.
  for(b=2.5;b<360;b+=2.5){
    s=arc_vis("S",b); p=arc_vis("P",b); t=arc_vis("T",b)
    if(s && p) continue
    ch = s ? "G" : (p ? "R" : (t ? "W" : ""))
    k  = s ? K_G : (p ? K_R : K_W)
    if(ch!="") gputc(cy-ro*cosd(b), cx+2*ro*sind(b), ch, k)
  }
  gputc(cy-ro, cx, "|", C_DIM)
  #  the inner ring: the masthead light
  for(b=0;b<360;b+=5)
    if(arc_vis("M",b)) gputc(cy-ri*cosd(b), cx+2*ri*sind(b), "M", K_W)
  #  her, head up
  gputs(cy-2,cx,"^"); gputs(cy-1,cx-1,"/ \\"); gputs(cy,cx-1,"| |")
  gputs(cy+1,cx-1,"\\_/")
  #  the words, in the margins, each beside the thing it names
  gputsc(0,cx-2,"ahead",C_DIM)
  gputs(3,51,"G  starboard"); gputs(4,51,"   112.5 deg")
  gputs(3,4,"port  R"); gputs(4,1,"112.5 deg")
  gputs(7,1,"M  masthead"); gputs(8,1,"   225 deg")
  gputs(12,51,"22.5 deg"); gputs(13,51,"abaft the beam")
  gputs(12,2,"22.5 deg"); gputs(13,0,"abaft the beam")
  gputs(18,cx-8,"W  stern 135 deg")
  if(mode=="overtake") gputsc(15,cx-5,"overtaking",C_ACC)
  gshow()
  return 0
}

# ---------------------------------------------------------------------
#  ONE VESSEL FROM THREE SIDES (B30, second piece).  Her lights from
#  ahead, from her starboard beam and from astern, side by side, so the
#  lesson shows what the lights drill asks you to read: the same vessel
#  changes her picture as you go round her.  Each panel asks arc_vis()
#  which lights show from that bearing, exactly as draw_lights() does,
#  and places each lamp across by the same u projection and up by its
#  height, on a smaller grid.  The browser draws it as SVG from the same
#  vessel table (rules-figs.js); tests/rules-figs-check.js holds its
#  lamps to arc_vis() for every vessel the lesson draws.
# ---------------------------------------------------------------------
function lt_views(key,   idx,a,n,L,i,f,p,th,pc,w,h,hw,j,u,r,c,TH,TN,t){
  if(FIGDUMP){ print "@@FIG views key=" key; return 0 }
  ves_init()
  idx=ves_find(key); if(idx==0){ print "  unknown vessel: " key; return 1 }
  split(VT[idx],a,"|"); n=split(a[4],L,";")
  w=67; h=12
  gclear(w,h); G_NOCROP=1
  t=a[2] " (" a[3] ")"
  gputsc(0,0,t,C_ACC)
  TH[0]=0; TH[1]=90; TH[2]=180
  TN[0]="from ahead"; TN[1]="starboard beam"; TN[2]="from astern"
  for(p=0;p<3;p++){
    th=TH[p]; pc=11+p*22
    gputsc(1, pc-int(length(TN[p])/2), TN[p], C_DIM)
    hw=(1.00*fabs(sind(th))+0.22*fabs(cosd(th)))/2.0
    for(j=-hw;j<=hw;j+=0.02) gputw(10, pc+j*16, "=")
    for(c=pc-10;c<=pc+10;c++) gputw(11,c,"~")
    for(i=1;i<=n;i++){
      if(split(L[i],f,",")<5) continue
      if(!arc_vis(f[4],th)) continue
      u=f[1]*sind(th)-f[2]*cosd(th)
      r=2+int((1-f[3])*10+0.5)
      #  two lamps in one place (a combined lantern seen bow-on shows
      #  red and green together): set the second beside the first, so
      #  neither hides the other
      c=int(pc+u*16+0.5)
      while(G[r,c] ~ /^[WRGY]$/) c+=2
      gputc(r, c, f[5], kcol(f[5]))
    }
  }
  gshow()
  return 0
}

# ---------------------------------------------------------------------
#  THE DAY SHAPES ON ONE CHART (B30, third piece).  The shapes drill
#  shows one vessel's shapes at a time; this hangs all ten side by side,
#  so the ones that are easy to confuse are seen together: one ball and
#  two, two and three, ball-diamond-ball and the diamond alone.  Each
#  stack is drawn by glyph_rows() from the shape table, shp_init(), the
#  same table and the same glyphs as the drill, top first.  The short
#  names under each are this chart's own (the table's are too long for a
#  column); rules-figs.js carries the same ten, and its check requires
#  one for every shape in the table.
# ---------------------------------------------------------------------
function lt_shlab(k){
  if(k=="anchor")    return "At anchor||Rule 30"
  if(k=="aground")   return "Aground||Rule 30"
  if(k=="nuc")       return "Not under|command|Rule 27"
  if(k=="ram")       return "Restricted||Rule 27"
  if(k=="draught")   return "Constrained|by draught|Rule 28"
  if(k=="motorsail") return "Sailing,|under power|Rule 25"
  if(k=="fishing")   return "Fishing||Rule 26"
  if(k=="tow200p")   return "Towing, tow|over 200 m|Rule 24"
  if(k=="mineclear") return "Mine|clearance|Rule 27"
  if(k=="divers")    return "Divers|down|Rule 27"
  return k "||"
}
function lt_shapechart(   w,h,i,a,n,st,j,k,rows,col,band,cx,base,r,lb,nl){
  if(FIGDUMP){ print "@@FIG shapes"; return 0 }
  shp_init()
  w=67; h=20
  gclear(w,h); G_NOCROP=1
  for(i=1;i<=NSHP;i++){
    split(SH[i],a,"|"); n=split(a[4],st,";")
    band=int((i-1)/5); col=(i-1)%5
    cx=6+col*13; base=(band==0 ? 7 : 16)
    gputs(base, cx-3, "\\_____/")
    r=base-1
    for(j=n;j>=1;j--){
      rows=glyph_rows(st[j])
      for(k=rows;k>=1;k--){ gputsc(r, cx-int(length(GLY[k])/2), GLY[k], C_ACC); r-- }
      r--
    }
    nl=split(lt_shlab(a[1]),lb,"|")
    for(k=1;k<=nl;k++) if(lb[k]!="")
      gputsc(base+k, cx-int(length(lb[k])/2), lb[k], (k==3 ? C_DIM : ""))
  }
  gshow()
  return 0
}

# =====================================================================
#  The rules themselves.  Fifteen lessons, each with a check question.
# =====================================================================
function thead(id,title,   i,u){
  print ""
  printf "  %s\n", cw(sprintf("%s  %s",id,title),C_ACC)
  u=""; for(i=0;i<length(title)+6;i++) u=u "-"
  print "  " u
  print ""
}
function les(id,   vk,vn,vi){
  if(id=="L1"){ thead("L1","Rule 5 - Look-out")
    tp("Every vessel shall at all times maintain a proper look-out by sight and")
    tp("hearing as well as by all available means appropriate in the prevailing")
    tp("circumstances and conditions so as to make a full appraisal of the")
    tp("situation and of the risk of collision.")
    tb()
    tp("  1. It is the first substantive rule, and it is the one most often")
    tp("     broken. More collisions are put down to a failure of look-out than")
    tp("     to any other cause.")
    tp("  2. 'By sight and hearing' means a person, outside, looking and")
    tp("     listening - not only a radar screen.")
    tp("  3. 'All available means' does include radar, AIS and VHF, and if you")
    tp("     have them and do not use them properly, that is a breach too.")
    tp("  4. 'At all times' has no exceptions for singlehanders, for tiredness,")
    tp("     or for the middle of an ocean.")
    tb()
    #  THE SPRAYHOOD IS FORWARD OF THE COCKPIT, so it blocks the helm's
    #  view AHEAD, over the coachroof -- not astern. Larry: "If you are at
    #  the wheel, the sprayhood would block your forward view, not your
    #  astern view." Written the wrong way round, the example was not
    #  merely inaccurate, it was backwards about the thing Rule 5 is for:
    #  the helm's blind sector is the one ahead, which is where the risk
    #  of collision is, and that is precisely why somebody else has to be
    #  looking there.
    tp("The look-out must be able to appraise the situation. Someone at the")
    tp("wheel whose forward view is blocked by the sprayhood is not, by")
    tp("themselves, a proper look-out.")
    tb() }
  else if(id=="L2"){ thead("L2","Rule 6 - Safe speed")
    tp("Every vessel shall at all times proceed at a safe speed so that she can")
    tp("take proper and effective action to avoid collision and be stopped")
    tp("within a distance appropriate to the prevailing circumstances.")
    tb()
    tp("  1. There is no number in this rule. Safe speed depends on visibility,")
    tp("     traffic density, manoeuvrability, background lights, the state of")
    tp("     wind, sea and current, the proximity of hazards and your draught.")
    tp("  2. If you are using radar there are further factors: its limitations,")
    tp("     the scale in use, sea and weather clutter, and the possibility that")
    tp("     small vessels and ice may not be detected at all.")
    tp("  3. 'Be stopped within a distance appropriate' is the practical test.")
    tp("     In thick fog with shipping about, that usually means slower than")
    tp("     feels comfortable.")
    tp("  4. A sailing vessel is not exempt. Reducing sail is reducing speed.")
    tb() }
  else if(id=="L3"){ thead("L3","Rule 7 - Risk of collision")
    tp("Every vessel shall use all available means appropriate to determine if")
    tp("risk of collision exists. If there is any doubt, such risk shall be")
    tp("deemed to exist.")
    tb()
    tp("  1. The test is compass bearing. If the compass bearing of an")
    tp("     approaching vessel does not appreciably change, risk of collision")
    tp("     exists.")
    tp("  2. It can exist even with an appreciable bearing change - with a very")
    tp("     large vessel, a tow, or anything at close range.")
    tp("  3. Radar must be used properly if fitted and working: long-range")
    tp("     scanning, and systematic observation of detected objects. A")
    tp("     glance at the screen is not plotting.")
    tp("  4. Assumptions shall not be made on the basis of scanty information,")
    tp("     especially scanty radar information. One AIS target is not a")
    tp("     picture of the traffic.")
    tb()
    tp("Take the bearing with a hand bearing compass over several minutes, or")
    tp("line her up against a stanchion and keep your head still. Steady")
    tp("bearing, decreasing range: you are going to hit her.")
    tb() }
  else if(id=="L4"){ thead("L4","Rule 8 - Action to avoid collision")
    tp("Any action shall be positive, made in ample time and with due regard to")
    tp("good seamanship.")
    tb()
    tp("  1. Alterations of course or speed shall be large enough to be readily")
    tp("     apparent to another vessel observing visually or by radar. A")
    tp("     succession of small alterations is exactly what the rule forbids.")
    tp("  2. If there is sea room, an alteration of course alone may be the most")
    tp("     effective action - provided it is made in good time, is substantial,")
    tp("     and does not result in another close-quarters situation.")
    tp("  3. Action to avoid collision shall result in passing at a safe")
    tp("     distance, and its effectiveness shall be carefully checked until")
    tp("     the other vessel is finally past and clear.")
    tp("  4. If necessary to avoid collision or allow more time to assess, slack")
    tp("     off, stop, or reverse. Taking all way off is always available to you.")
    tb()
    tp("A ten degree alteration at four miles is invisible on the other bridge.")
    tp("Thirty degrees, early, is a signal in itself.")
    tb() }
  else if(id=="L5"){ thead("L5","Rule 9 - Narrow channels")
    tp("A vessel proceeding along the course of a narrow channel or fairway")
    tp("shall keep as near to the outer limit which lies on her starboard side")
    tp("as is safe and practicable.")
    tb()
    tp("  1. Keep to the starboard side of the channel. That is the whole rule")
    tp("     in one line.")
    tp("  2. A vessel of less than 20 metres, or a sailing vessel, shall not")
    tp("     impede the passage of a vessel which can safely navigate only")
    tp("     within the channel. Nor shall a vessel engaged in fishing.")
    tp("  3. Do not cross a channel if it impedes a vessel that can only")
    tp("     navigate within it. If in doubt about her intentions, the doubt")
    tp("     signal - five or more short blasts - is available.")
    tp("  4. Overtaking in a narrow channel, when she has to take action to let")
    tp("     you pass safely, needs her agreement, signalled by sound: two")
    tp("     prolonged and one short means you intend to pass on her starboard")
    tp("     side.")
    tb()
    tp("'Shall not impede' is not the same as give way. It means you must keep")
    tp("clear early enough that the question of who gives way never arises.")
    tb() }
  else if(id=="L6"){ thead("L6","Rule 10 - Traffic separation schemes")
    tp("A vessel using a traffic separation scheme shall proceed in the")
    tp("appropriate lane in the general direction of traffic flow, keep clear of")
    tp("the separation line or zone, and normally join or leave at the ends.")
    tb()
    tp("  1. If you must join at the side, do so at as small an angle to the")
    tp("     general direction of flow as practicable.")
    tp("  2. If you must cross, cross on a heading as nearly as practicable at")
    tp("     right angles to the direction of flow. Heading, not track - so you")
    tp("     do not crab across with the tide to make a right-angled ground")
    tp("     track. This was changed deliberately: a beam-on aspect is what makes")
    tp("     you visible and predictable.")
    tp("  3. A vessel under 20 metres, a sailing vessel, or a vessel fishing")
    tp("     shall not impede the safe passage of a power-driven vessel")
    tp("     following a lane.")
    tp("  4. Inshore traffic zones are not for through traffic, with limited")
    tp("     exceptions - vessels under 20 metres, sailing vessels, fishing")
    tp("     vessels, and vessels going to or from a place inside the zone.")
    tb() }
  else if(id=="L7"){ thead("L7","Rule 12 - Sailing vessels")
    tp("When two sailing vessels are approaching one another so as to involve")
    tp("risk of collision:")
    tb()
    tp("  1. When each has the wind on a different side, the vessel with the")
    tp("     wind on her port side shall keep out of the way of the other.")
    tp("     Port tack gives way to starboard tack.")
    tp("  2. When both have the wind on the same side, the vessel to windward")
    tp("     shall keep out of the way of the vessel to leeward. Windward gives")
    tp("     way - which surprises most people the first time.")
    tp("  3. If a vessel with the wind on the port side sees a vessel to")
    tp("     windward and cannot tell whether that vessel has the wind on the")
    tp("     port or the starboard side, she shall keep out of the way.")
    tp("  4. The windward side is the side opposite that on which the mainsail")
    tp("     is carried - or, for a square-rigged vessel, the largest fore-and-")
    tp("     aft sail.")
    tb()
    tp("Note that this rule applies between two sailing vessels only. Rule 18")
    tp("governs a sailing vessel meeting anything else.")
    tb() }
  else if(id=="L8"){ thead("L8","Rule 13 - Overtaking")
    tp("Any vessel overtaking any other shall keep out of the way of the vessel")
    tp("being overtaken. This rule overrides everything in the other steering")
    tp("rules - it applies notwithstanding anything in Rules 4 to 18.")
    tb()
    tp("  1. A vessel is overtaking when coming up on another from a direction")
    tp("     more than 22.5 degrees abaft her beam.")
    tp("  2. The practical test at night: if you can see only her sternlight,")
    tp("     and neither of her sidelights, you are overtaking.")
    tb()
    lt_arcs("overtake")
    tb()
    tp("Her lights from above, head up, as you would see them from each")
    tp("bearing round her. Come up from inside the marked sector and you see")
    tp("only W, her sternlight: you are overtaking.")
    tb()
    tp("  3. When in any doubt whether you are overtaking, assume that you are")
    tp("     and act accordingly.")
    tp("  4. Any subsequent alteration of the bearing between the two shall not")
    tp("     make you a crossing vessel or relieve you of the duty to keep clear")
    tp("     until you are finally past and clear.")
    tb()
    tp("A sailing vessel overtaking a power-driven vessel keeps clear. This is")
    tp("the case that most often catches sailors out.")
    tb() }
  else if(id=="L9"){ thead("L9","Rule 14 - Head-on situation")
    tp("When two power-driven vessels are meeting on reciprocal or nearly")
    tp("reciprocal courses so as to involve risk of collision, each shall alter")
    tp("her course to starboard so that each shall pass on the port side of the")
    tp("other.")
    tb()
    tp("  1. Neither vessel is the stand-on vessel. Both act.")
    tp("  2. The situation shall be deemed to exist when a vessel sees the other")
    tp("     ahead or nearly ahead - by night, both sidelights, or the masthead")
    tp("     lights in a line or nearly in a line.")
    tp("  3. When in doubt whether such a situation exists, assume that it does")
    tp("     and act accordingly.")
    tp("  4. This rule is between power-driven vessels only.")
    tb()
    tp("Alter to starboard, early and boldly, and pass port to port: red to red.")
    tb() }
  else if(id=="L10"){ thead("L10","Rules 15 and 16 - Crossing, and the give-way vessel")
    tp("When two power-driven vessels are crossing so as to involve risk of")
    tp("collision, the vessel which has the other on her own starboard side")
    tp("shall keep out of the way and shall, if the circumstances of the case")
    tp("admit, avoid crossing ahead of the other vessel.")
    tb()
    tp("  1. Starboard side, so at night you see her red sidelight. Red means")
    tp("     stop: she is on your right and you give way.")
    tp("  2. Avoid crossing ahead. In practice, alter to starboard and pass")
    tp("     under her stern: it is the action that is unmistakable from her")
    tp("     bridge.")
    tp("  3. Rule 16 tells the give-way vessel to take early and substantial")
    tp("     action to keep well clear. Early and substantial.")
    tp("  4. This rule is between power-driven vessels. A crossing sailing")
    tp("     vessel is a Rule 18 problem.")
    tb() }
  else if(id=="L11"){ thead("L11","Rule 17 - Action by the stand-on vessel")
    tp("Where one vessel is to keep out of the way, the other shall keep her")
    tp("course and speed. But standing on is not a licence to do nothing.")
    tb()
    tp("  1. Normally: keep your course and speed, so that the give-way vessel")
    tp("     can work out a solution around you.")
    tp("  2. You MAY take action as soon as it becomes apparent to you that she")
    tp("     is not taking appropriate action. This is permission, not duty.")
    tp("  3. You SHALL take such action as will best aid to avoid collision when")
    tp("     you find yourself so close that collision cannot be avoided by the")
    tp("     give-way vessel's action alone. This is a duty.")
    tp("  4. If you are a power-driven vessel taking action in a crossing")
    tp("     situation, do not alter to port for a vessel on your own port side.")
    tb()
    tp("The give-way vessel's obligation does not go away because you have")
    tp("acted. Both of you remain bound to avoid collision.")
    tb() }
  else if(id=="L12"){ thead("L12","Rule 18 - Responsibilities between vessels")
    tp("Except where Rules 9, 10 and 13 otherwise require, the pecking order")
    tp("runs from the least manoeuvrable to the most:")
    tb()
    tp("     not under command")
    tp("     restricted in her ability to manoeuvre")
    tp("     engaged in fishing")
    tp("     sailing")
    tp("     power-driven")
    tb()
    tp("  1. Each keeps out of the way of everything above it in that list.")
    tp("  2. A vessel constrained by her draught sits slightly outside the list:")
    tp("     Rule 18(d) says every vessel shall avoid impeding her safe passage,")
    tp("     and she must navigate with particular caution.")
    tp("  3. A seaplane on the water keeps well clear of all vessels; a")
    tp("     wing-in-ground craft, when taking off, landing or in flight near")
    tp("     the surface, keeps well clear of all vessels.")
    tp("  4. The exceptions matter: in a narrow channel, in a traffic scheme,")
    tp("     and when overtaking, the ordinary order can be reversed.")
    tb()
    tp("Sailing vessels are third from the bottom, not at the top. A yacht keeps")
    tp("out of the way of a fishing vessel, and out of the way of anything not")
    tp("under command.")
    tb() }
  else if(id=="L13"){ thead("L13","Rule 19 - Restricted visibility")
    tp("This rule applies to vessels not in sight of one another when navigating")
    tp("in or near an area of restricted visibility. It is a different world")
    tp("from Rules 11 to 18.")
    tb()
    tp("  1. There is no stand-on vessel. Nobody has right of way. The give-way")
    tp("     and stand-on rules simply do not apply.")
    tp("  2. Every vessel shall proceed at a safe speed adapted to the")
    tp("     circumstances, with engines ready for immediate manoeuvre.")
    tp("  3. A vessel which detects by radar alone another vessel shall")
    tp("     determine if a close-quarters situation is developing, and if so")
    tp("     take avoiding action in ample time. If that action is an alteration")
    tp("     of course, avoid: an alteration to port for a vessel forward of the")
    tp("     beam other than for a vessel being overtaken, and an alteration")
    tp("     towards a vessel abeam or abaft the beam.")
    tp("  4. A vessel which hears apparently forward of her beam the fog signal")
    tp("     of another vessel, or which cannot avoid a close-quarters situation")
    tp("     with a vessel forward of her beam, shall reduce to the minimum at")
    tp("     which she can be kept on course - and if necessary take all her way")
    tp("     off, and in any event navigate with extreme caution until the")
    tp("     danger of collision is over.")
    tb() }
  else if(id=="L14"){ thead("L14","Rules 20 to 31 - Lights and shapes")
    tp("Lights are shown from sunset to sunrise, and in restricted visibility,")
    tp("and may be shown at any other time when it is considered necessary.")
    tp("Shapes are shown by day.")
    tb()
    tp("  1. The arcs are fixed and worth knowing by heart: masthead light 225")
    tp("     degrees, sidelights 112.5 each, sternlight 135. Sidelights plus")
    tp("     sternlight make the full circle.")
    tb()
    lt_arcs("lights")
    tb()
    tp("Her lights from above, head up. M is the masthead light, G and R the")
    tp("sidelights, W the sternlight: the letter on each ring is what you see")
    tp("from that bearing. The broken lines are 22.5 degrees abaft the beam.")
    tb()
    tp("  2. What you see tells you her aspect. Both sidelights: she is nearly")
    tp("     bow-on. One sidelight and a masthead light: she is crossing. Only a")
    tp("     white light: she may be a sternlight, an anchor light, or a small")
    tp("     boat - keep watching until you know which.")
    tp("  3. All-round lights in a vertical line are the vessel telling you what")
    tp("     she is doing and what she cannot do. Red over white, fishing at")
    tp("     night. Red over red, the captain is dead - not under command.")
    tp("     Red, white, red - restricted in her ability to manoeuvre.")
    tp("  4. Day shapes carry the same meanings: a ball for anchored, three")
    tp("     balls aground, two balls not under command, ball-diamond-ball")
    tp("     restricted, a cone point down for a sailing vessel under power.")
    tb()
    lt_shapechart()
    tb()
    tp("The ten day shapes on one chart, as the shapes drill hangs them, top")
    tp("first. Shapes are black and are shown by day. Look at the pairs that")
    tp("are easy to confuse: one ball and two, two and three, and the diamond")
    tp("alone against ball, diamond, ball.")
    tb()
    #  B30, second piece: twelve vessels from three sides.  The set is the
    #  one a watchkeeper meets most, and the pairs most often confused sit
    #  together: one and two masthead lights, fishing and the pilot (the
    #  same two colours the other way up), restricted and constrained.
    tp("Twelve vessels, each from ahead, from her starboard beam and from")
    tp("astern. Only the lights shown toward you are drawn. The letters are")
    tp("the colours: W white, R red, G green, Y yellow.")
    vn=split("power50 power50p sail sailtri tow200 trawl fishing pilot nucway ram draught anchor", vk, " ")
    for(vi=1; vi<=vn; vi++){ tb(); lt_views(vk[vi]) }
    tb() }
  else { thead("L15","Rules 32 to 37 - Sound and light signals")
    tp("Sound signals fall into two groups, and the difference matters more")
    tp("than the signals themselves.")
    tb()
    tp("  1. Rule 34 signals are for vessels IN SIGHT of one another. They say")
    tp("     what you are doing right now: one short, I am altering to")
    tp("     starboard; two short, to port; three short, my engines are going")
    tp("     astern.")
    tp("  2. Rule 35 signals are for RESTRICTED VISIBILITY, when you cannot see")
    tp("     each other. They say what kind of vessel you are: one prolonged")
    tp("     for a power-driven vessel making way; one prolonged and two short")
    tp("     for anything from not-under-command to a sailing vessel.")
    tp("  3. Five or more short and rapid blasts is the doubt signal, and the")
    tp("     most under-used signal at sea. It means: I do not understand what")
    tp("     you are doing, or I do not think you are doing enough.")
    tp("  4. A prolonged blast is four to six seconds. A short blast is about")
    tp("     one second. Vessels of 100 metres or more carry a bell and a gong;")
    tp("     under 12 metres you need not carry the equipment, but you must make")
    tp("     some other efficient sound signal.")
    tb() }
  return 0
}
function les_q(id,show){
  if(id=="L1"){ if(show){ tp("Q. Which of these on its own satisfies Rule 5?")
      tp("     a) a radar with ARPA, watched from the chart table")
      tp("     b) AIS with a CPA alarm set    c) none of them") }
    else { Q_A="c"; Q_W="Rule 5 requires sight and hearing as well as all available means. Electronics supplement a look-out; they do not replace one." } }
  else if(id=="L2"){ if(show){ tp("Q. What speed does Rule 6 specify in fog?")
      tp("     a) six knots     b) half your normal speed     c) no number at all") }
    else { Q_A="c"; Q_W="Rule 6 gives factors, not numbers. The test is that you can stop within a distance appropriate to the circumstances." } }
  else if(id=="L3"){ if(show){ tp("Q. A ship's compass bearing is steady and the range is closing. What does Rule 7 say?")
      tp("     a) risk of collision exists    b) risk exists only inside two miles")
      tp("     c) no risk while she is more than 30 degrees off the bow") }
    else { Q_A="a"; Q_W="A steady compass bearing with decreasing range is the definition of risk of collision. And if in any doubt, risk shall be deemed to exist." } }
  else if(id=="L4"){ if(show){ tp("Q. Which action best meets Rule 8?")
      tp("     a) five degrees now, and five more if she does not respond")
      tp("     b) a single alteration of 30 degrees, made early")
      tp("     c) hold on until one mile, then alter hard") }
    else { Q_A="b"; Q_W="Action must be positive, made in ample time, and large enough to be readily apparent to the other vessel visually or by radar." } }
  else if(id=="L5"){ if(show){ tp("Q. In a narrow channel, which side do you keep to?")
      tp("     a) the port side     b) the starboard side     c) the deepest water") }
    else { Q_A="b"; Q_W="As near to the outer limit on your starboard side as is safe and practicable." } }
  else if(id=="L6"){ if(show){ tp("Q. Crossing a traffic separation scheme, what should be at right angles to the flow?")
      tp("     a) your heading     b) your ground track     c) your wake") }
    else { Q_A="a"; Q_W="Rule 10(c) says heading. Do not crab across with the tide to make the track square - a beam-on aspect is what makes you visible." } }
  else if(id=="L7"){ if(show){ tp("Q. Two sailing vessels, both with the wind on the starboard side. Who gives way?")
      tp("     a) the vessel to windward     b) the vessel to leeward     c) the overtaking vessel") }
    else { Q_A="a"; Q_W="Same tack: windward keeps out of the way of leeward." } }
  else if(id=="L8"){ if(show){ tp("Q. At night you can see another vessel's sternlight and neither sidelight. What are you?")
      tp("     a) crossing     b) overtaking     c) head-on") }
    else { Q_A="b"; Q_W="Sternlight only means you are more than 22.5 degrees abaft her beam: you are overtaking, and you keep clear until finally past and clear." } }
  else if(id=="L9"){ if(show){ tp("Q. Two power-driven vessels meeting head-on. Who is the stand-on vessel?")
      tp("     a) the larger     b) the one to starboard     c) neither") }
    else { Q_A="c"; Q_W="In a head-on situation there is no stand-on vessel. Each alters to starboard and they pass port to port." } }
  else if(id=="L10"){ if(show){ tp("Q. You are power-driven and see another power-driven vessel's red sidelight, crossing. What do you do?")
      tp("     a) stand on     b) give way, and avoid crossing ahead of her")
      tp("     c) give way by altering to port") }
    else { Q_A="b"; Q_W="Her red light means she is on your starboard side. You give way, and Rule 15 says avoid crossing ahead - so alter to starboard and pass under her stern." } }
  else if(id=="L11"){ if(show){ tp("Q. You are the stand-on vessel and she is doing nothing about it. What does Rule 17 allow?")
      tp("     a) nothing until collision is unavoidable    b) you may act as soon as it is")
      tp("        apparent she is not acting    c) you must alter to port") }
    else { Q_A="b"; Q_W="Rule 17(a)(ii) permits you to act as soon as it becomes apparent she is not taking appropriate action, and 17(b) requires you to act when collision cannot be avoided by her action alone." } }
  else if(id=="L12"){ if(show){ tp("Q. A yacht under sail meets a vessel engaged in fishing. Who keeps clear?")
      tp("     a) the fishing vessel     b) the yacht     c) neither, it is a crossing situation") }
    else { Q_A="b"; Q_W="Rule 18: a sailing vessel keeps out of the way of a vessel engaged in fishing, and of one restricted in her ability to manoeuvre, and of one not under command." } }
  else if(id=="L13"){ if(show){ tp("Q. In fog, you hear one prolonged and two short forward of the beam. Who is the stand-on vessel?")
      tp("     a) you     b) she is     c) neither - Rule 19 has no stand-on vessel") }
    else { Q_A="c"; Q_W="Rule 19 applies to vessels not in sight of one another, and it has no give-way and stand-on. Reduce to the minimum steerage way and, if necessary, take all way off." } }
  else if(id=="L14"){ if(show){ tp("Q. What arc does a masthead light cover?")
      tp("     a) 112.5 degrees     b) 225 degrees     c) 360 degrees") }
    else { Q_A="b"; Q_W="225 degrees, from right ahead to 22.5 degrees abaft the beam on each side. The sidelights cover 112.5 each and the sternlight the remaining 135." } }
  else { if(show){ tp("Q. What does one prolonged blast mean from a vessel you cannot see, in fog?")
      tp("     a) I am altering to starboard     b) a power-driven vessel making way")
      tp("     c) I am approaching a bend") }
    else { Q_A="b"; Q_W="In restricted visibility (Rule 35) one prolonged every two minutes is a power-driven vessel making way through the water. The same signal in sight of another vessel, at a bend, is Rule 34(e)." } }
  return 0
}
#  THE LESSON LIST, ONCE.  It was a literal inside syl_show, and the rule
#  number drill below needs the same fifteen pairs.  Two copies of a table
#  is how this repository has lost material before, so there is one, and
#  both readers take it from here.
function rul_init(   i,n,ids,a,p){
  if(NRUL>0) return 0
  n=split("L1|Rule 5 - Look-out;L2|Rule 6 - Safe speed;L3|Rule 7 - Risk of collision;" \
          "L4|Rule 8 - Action to avoid collision;L5|Rule 9 - Narrow channels;" \
          "L6|Rule 10 - Traffic separation schemes;L7|Rule 12 - Sailing vessels;" \
          "L8|Rule 13 - Overtaking;L9|Rule 14 - Head-on;" \
          "L10|Rules 15 and 16 - Crossing and the give-way vessel;" \
          "L11|Rule 17 - Action by the stand-on vessel;" \
          "L12|Rule 18 - Responsibilities between vessels;" \
          "L13|Rule 19 - Restricted visibility;L14|Rules 20-31 - Lights and shapes;" \
          "L15|Rules 32-37 - Sound signals", ids, ";")
  for(i=1;i<=n;i++){
    split(ids[i],a,"|")
    p=index(a[2]," - ")
    RUL_ID[i]=a[1]
    RUL_N[i]=substr(a[2],1,p-1)
    RUL_T[i]=substr(a[2],p+3)
  }
  NRUL=n
  return 0
}

#  THE NUMBERS, BOTH WAYS.  Memorising rule numbers is the standard and it
#  is rote, but the numbers are what an examiner asks for and what gets
#  quoted at you on the water.  The distractors are the other fourteen
#  rules, which makes them the confusable ones by construction -- 15
#  against 16 against 17, 12 against 13 against 18 -- and that is the part
#  that is actually hard.  No new rule content is written here: every
#  number and title already drove the fifteen lessons.
function qpick_rule(seed,   i,c){
  rul_init(); xsrand(seed+0)
  for(i=0;i<3;i++) xrand()
  c = 1+int(xrand()*NRUL)
  QZ_C=c
  QZ_DIR = (xrand()<0.5 ? 1 : 2)     # 1: number -> title.  2: title -> number
  pick_opts(NRUL,c,seed+53); QZ_ANS=OPT_ANS
  return 0
}
function quiz_rule(seed,   i){
  qpick_rule(seed)
  print ""
  #  "What is Rules 15 and 16?" -- three of the fifteen entries cover more
  #  than one rule ("Rules 15 and 16", "Rules 20-31", "Rules 32-37"), and
  #  the singular stem reads wrong on all three.  The label says which it
  #  is: it starts "Rules" when it is plural.
  if(QZ_DIR==1) printf "  %s\n", cw((RUL_N[QZ_C] ~ /^Rules/ ? "What are " : "What is ") RUL_N[QZ_C] "?",C_ACC)
  else          printf "  %s\n", cw("Which rule is \"" RUL_T[QZ_C] "\"?",C_ACC)
  print ""
  for(i=1;i<=4;i++)
    printf "   %s) %s\n", substr("abcd",i,1), (QZ_DIR==1 ? RUL_T[OPT[i]] : RUL_N[OPT[i]])
  print ""
  return 0
}
function quiz_rule_reveal(){
  printf "  %s -- %s - %s\n", cw(toupper(QZ_ANS) " is right",C_ACC),
                               RUL_N[QZ_C], RUL_T[QZ_C]
  printf "  Lesson %s covers it: 'colregs lesson %s'.\n", RUL_ID[QZ_C], RUL_ID[QZ_C]
  print ""
  return 0
}
function syl_show(done,   i,a,n,ids,ttl,mark){
  rul_init()
  n=NRUL
  print ""
  printf "  %s\n", cw("THE RULES -- fifteen lessons",C_ACC)
  hr()
  ttl=0
  for(i=1;i<=n;i++){
    mark = (index("," done ",", "," RUL_ID[i] ",")>0) ? "x" : " "
    if(mark=="x") ttl++
    printf "   [%s]  %-4s %s - %s\n", mark, RUL_ID[i], RUL_N[i], RUL_T[i]
  }
  hr()
  printf "  %d of %d done.  Type a code (L1 ... L15), or n for the next one.\n", ttl, n
  print ""
  return 0
}

# =====================================================================
#  Quizzes: pick an item, three distractors, and shuffle
# =====================================================================
function pick_opts(nitems,correct,seed,   i,j,t,pool,np){
  xsrand(seed+0); xrand(); xrand()
  np=0
  for(i=1;i<=nitems;i++) if(i!=correct){ np++; pool[np]=i }
  for(i=np;i>1;i--){ j=1+int(xrand()*i); t=pool[i]; pool[i]=pool[j]; pool[j]=t }
  OPT[1]=correct; OPT[2]=pool[1]; OPT[3]=pool[2]; OPT[4]=pool[3]
  for(i=4;i>1;i--){ j=1+int(xrand()*i); t=OPT[i]; OPT[i]=OPT[j]; OPT[j]=t }
  for(i=1;i<=4;i++) if(OPT[i]==correct) OPT_ANS=substr("abcd",i,1)
  return 0
}
function qpick_lights(seed,   i,c,sig,np,j,t,pool){
  QZ_MOT=0
  ves_init(); xsrand(seed+0)
  for(i=0;i<3;i++) xrand()
  c = 1+int(xrand()*NVES)
  QZ_TH = int(xrand()*360)-180
  QZ_C = c
  sig = light_sig(c,QZ_TH)
  # everything that looks exactly the same from this angle
  QZ_SAME=""
  np=0
  for(i=1;i<=NVES;i++){
    if(i==c) continue
    if(light_sig(i,QZ_TH)==sig){ QZ_SAME = QZ_SAME (QZ_SAME==""?"":"; ") ves_name(i); continue }
    np++; pool[np]=i
  }
  for(i=np;i>1;i--){ j=1+int(xrand()*i); t=pool[i]; pool[i]=pool[j]; pool[j]=t }
  OPT[1]=c; OPT[2]=pool[1]; OPT[3]=pool[2]; OPT[4]=pool[3]
  for(i=4;i>1;i--){ j=1+int(xrand()*i); t=OPT[i]; OPT[i]=OPT[j]; OPT[j]=t }
  for(i=1;i<=4;i++) if(OPT[i]==c) QZ_ANS=substr("abcd",i,1)
  #  and the four possible answers to "which way is she going"
  QZ_MOT = motion_of(c,QZ_TH)
  np=0
  for(i=1;i<=5;i++) if(i!=QZ_MOT){ np++; pool[np]=i }
  for(i=np;i>1;i--){ j=1+int(xrand()*i); t=pool[i]; pool[i]=pool[j]; pool[j]=t }
  MOPT[1]=QZ_MOT; MOPT[2]=pool[1]; MOPT[3]=pool[2]; MOPT[4]=pool[3]
  for(i=4;i>1;i--){ j=1+int(xrand()*i); t=MOPT[i]; MOPT[i]=MOPT[j]; MOPT[j]=t }
  for(i=1;i<=4;i++) if(MOPT[i]==QZ_MOT) QZ_MANS=substr("abcd",i,1)
  return 0
}
function ves_name(i,   a){ split(VT[i],a,"|"); return a[2] }
function quiz_lights(seed,   i,a,j,t,pool,np,mc){
  qpick_lights(seed)
  split(VT[QZ_C],a,"|")
  Q_NOASPECT=1
  show_lights(a[1],QZ_TH)
  Q_NOASPECT=0
  printf "  %s\n", cw("Q1  What is she?",C_ACC)
  for(i=1;i<=4;i++){ split(VT[OPT[i]],a,"|"); printf "     %s) %s\n", substr("abcd",i,1), a[2] }
  print ""
  printf "  %s\n", cw("Q2  Which way is she going?",C_ACC)
  for(i=1;i<=4;i++) printf "     %s) %s\n", substr("abcd",i,1), motion_text(MOPT[i])
  print ""
  return 0
}
function quiz_lights_reveal(){
  split(VT[QZ_C],QA,"|")
  printf "  Q1  %s -- %s\n", cw(toupper(QZ_ANS) " is right",C_ACC), QA[2]
  printf "      %s.  %s\n", QA[3], QA[5]
  if(QA[6]!="") printf "      %s %s\n", cw("Watch out:",C_ACC), QA[6]
  print ""
  printf "  Q2  %s -- %s\n", cw(toupper(QZ_MANS) " is right",C_ACC), motion_text(QZ_MOT)
  printf "      %s\n", motion_why(QZ_MOT,QZ_C,QZ_TH)
  printf "      %s\n", aspect_line(QZ_C,QZ_TH)
  if(QZ_SAME!=""){
    print ""
    printf "  %s\n", cw("But from this angle she is genuinely ambiguous.",C_ACC)
    printf "  These would look exactly the same to you: %s.\n", QZ_SAME
    print  "  That is a real limitation of a single look, not a fault in the"
    print  "  question - it is why you keep watching until the bearing, the"
    print  "  range or a change of aspect tells you which one she is. Those"
    print  "  were left out of the answers above so the question had one answer."
  }
  print ""
  return 0
}
function qpick_shapes(seed,   i,c){
  shp_init(); xsrand(seed+0)
  for(i=0;i<3;i++) xrand()
  c = 1+int(xrand()*NSHP)
  QZ_C=c; pick_opts(NSHP,c,seed+23); QZ_ANS=OPT_ANS
  return 0
}
function quiz_shapes(seed,   i,a){
  qpick_shapes(seed)
  split(SH[QZ_C],a,"|")
  show_shapes(a[1])
  for(i=1;i<=4;i++){ split(SH[OPT[i]],a,"|"); printf "   %s) %s\n", substr("abcd",i,1), a[2] }
  print ""
  return 0
}
function quiz_shapes_reveal(){
  split(SH[QZ_C],QA,"|")
  printf "  %s -- %s\n", cw(toupper(QZ_ANS) " is right",C_ACC), QA[2]
  printf "  %s.  %s\n", QA[3], QA[5]
  print ""
  return 0
}
function qpick_sound(seed,   i,c){
  snd_init(); xsrand(seed+0)
  for(i=0;i<3;i++) xrand()
  c = 1+int(xrand()*NSND)
  QZ_C=c; pick_opts(NSND,c,seed+37); QZ_ANS=OPT_ANS
  return 0
}
function quiz_sound(seed,   i,a){
  qpick_sound(seed)
  snd_show(QZ_C)
  for(i=1;i<=4;i++){ split(SD[OPT[i]],a,"|"); printf "   %s) %s\n", substr("abcd",i,1), a[3] }
  print ""
  return 0
}
function quiz_sound_reveal(){
  split(SD[QZ_C],QA,"|")
  printf "  %s -- %s\n", cw(toupper(QZ_ANS) " is right",C_ACC), QA[3]
  printf "  %s.  %s\n", QA[4], QA[5]
  print ""
  return 0
}
function colour_check(   e){
  col_init()
  print ""
  printf "  %s\n", cw("COLOUR CHECK",C_ACC)
  hr()
  printf "  mode        %s\n", (cmode==""?"plain":cmode)
  printf "  the lamps   %s  %s  %s  %s\n", cw("W white",K_W), cw("R red",K_R), cw("G green",K_G), cw("Y yellow",K_Y)
  printf "  the vessel  hull and sea in the panel text colour\n"
  printf "  %s\n", cw("  faint       masts and droplines, like this",C_DIM)
  hr()
  print "  If the four lamps above are not four different colours, your terminal"
  print "  is not showing them. Try 'colregs day' - and note that colour is turned"
  print "  off on purpose whenever output is piped to a file or another program."
  print ""
  return 0
}
function ref_lights(   i,a){
  ves_init()
  print ""
  printf "  %s\n", cw("LIGHTS -- the whole set",C_ACC)
  hr()
  for(i=1;i<=NVES;i++){ split(VT[i],a,"|")
    printf "  %-14s %s\n", a[1], a[2]
    printf "  %-14s %s  %s\n", "", a[3], a[5] }
  hr()
  print "  Show any one from any angle:  colregs light <key> <bearing>"
  print ""
  return 0
}
function ref_shapes(   i,a){
  shp_init()
  print ""
  printf "  %s\n", cw("DAY SHAPES",C_ACC)
  hr()
  for(i=1;i<=NSHP;i++){ split(SH[i],a,"|")
    printf "  %-12s %-42s %s\n", a[1], a[2], a[3] }
  hr()
  print "  Draw any one:  colregs shape <key>"
  print ""
  return 0
}

#  A picture must have exactly one right answer among the four offered.
function sigcheck(   sd,i,sig,bad,n){
  bad=0; n=0
  for(sd=1; sd<=600; sd++){
    qpick_lights(sd)
    sig = light_sig(QZ_C,QZ_TH)
    for(i=1;i<=4;i++){
      if(OPT[i]==QZ_C) continue
      if(light_sig(OPT[i],QZ_TH)==sig){
        printf "  seed %d: %s and %s look identical at %d and are both offered\n",
               sd, ves_name(QZ_C), ves_name(OPT[i]), QZ_TH
        bad++
      }
    }
    if(OPT[index("abcd",QZ_ANS)]!=QZ_C){ printf "  seed %d: the marked answer is not the right option\n", sd; bad++ }
    n++
  }
  printf "  checked %d lights questions: %s\n", n, (bad==0 ? "every one has a single right answer" : bad " PROBLEM(S)")
  exit (bad==0?0:1)
}

BEGIN{
  col_init()
  q1=0; q2=0
  if(cmd=="sigcheck") sigcheck()
  else if(cmd=="light"){        show_lights(key, th+0); if(reveal=="1") reveal_lights() }
  else if(cmd=="shape"){   show_shapes(key); if(reveal=="1") reveal_shapes() }
  else if(cmd=="reflights") ref_lights()
  else if(cmd=="colours")   colour_check()
  else if(cmd=="refshapes") ref_shapes()
  else if(cmd=="sndtable")  snd_table()
  else if(cmd=="qlight"){  quiz_lights(seed+0) }
  else if(cmd=="qlightm"){ qpick_lights(seed+0)
                           q1 = (tolower(ans)==QZ_ANS); q2 = (tolower(ans2)==QZ_MANS)
                           if(!q1 || !q2) printf "  %s\n", cw("Not quite.",C_ACC)
                           quiz_lights_reveal(); exit ((q1&&q2)?0:1) }
  else if(cmd=="qshape"){  quiz_shapes(seed+0) }
  else if(cmd=="qshapem"){ qpick_shapes(seed+0)
                           if(tolower(ans)!=QZ_ANS) printf "  %s\n", cw("Not right.",C_ACC)
                           quiz_shapes_reveal(); exit (tolower(ans)==QZ_ANS?0:1) }
  else if(cmd=="qsound"){  quiz_sound(seed+0) }
  else if(cmd=="qsoundm"){ qpick_sound(seed+0)
                           if(tolower(ans)!=QZ_ANS) printf "  %s\n", cw("Not right.",C_ACC)
                           quiz_sound_reveal(); exit (tolower(ans)==QZ_ANS?0:1) }
  else if(cmd=="enc"){     enc_init(); xsrand(seed+0); xrand()
                           ENCN = (which!="" ? which+0 : 1+int(xrand()*NENC))
                           if(enc_range(ENCN)) exit 2
                           enc_show(ENCN,seed+0) }
  else if(cmd=="encm"){    enc_init(); xsrand(seed+0); xrand()
                           ENCN = (which!="" ? which+0 : 1+int(xrand()*NENC))
                           if(enc_range(ENCN)) exit 2
                           enc_pick(ENCN,seed+0)
                           if(tolower(ans)!=ENC_ANS) printf "  %s\n", cw("Not right.",C_ACC)
                           enc_reveal(); exit (tolower(ans)==ENC_ANS?0:1) }
  else if(cmd=="enclights"){ enc_init(); xsrand(seed+0); xrand()
                           ENCN = (which!="" ? which+0 : 1+int(xrand()*NENC))
                           if(enc_range(ENCN)) exit 2
                           enc_geom(ENCN,seed+0); enc_lights(ENCN) }
  else if(cmd=="lesson"){  les(les_id); les_q(les_id,1); print "" }
  #  FOR THE GENERATOR, not for a reader: the question's answer and its
  #  explanation, machine-readably, so docs/web/colregs/gen does not have
  #  to parse "Not quite - the answer is C." out of prose written for a
  #  person.  One line here against a brittle regex there.
  else if(cmd=="lessonmeta"){ les_q(les_id,0); printf "%s\t%s\n", Q_A, Q_W }
  else if(cmd=="check"){   les_q(les_id,0)
                           if(tolower(ans)==Q_A){ printf "\n  %s  %s\n\n", cw("Correct.",C_ACC), Q_W; exit 0 }
                           printf "\n  Not quite - the answer is %s.  %s\n\n", toupper(Q_A), Q_W; exit 1 }
  else if(cmd=="qrule"){   quiz_rule(seed+0) }
  else if(cmd=="qrulem"){  qpick_rule(seed+0)
                           if(tolower(ans)!=QZ_ANS) printf "  %s\n", cw("Not right.",C_ACC)
                           quiz_rule_reveal(); exit (tolower(ans)==QZ_ANS?0:1) }
  else if(cmd=="syllabus") syl_show(done)
  else if(cmd=="scenlights"){ if(!scen_gen(seed+0)){ print "  no scenario"; exit 2 }
                           scen_lights() }
  else if(cmd=="scen"){    if(!scen_gen(seed+0)){ print "  could not build a scenario"; exit 2 }
                           scen_show() }
  else if(cmd=="scenm"){   if(!scen_gen(seed+0)){ print "  could not build a scenario"; exit 2 }
                           scen_opts()
                           scen_mark(a1,a2,a3); exit (SCEN_OK?0:1) }
  else if(cmd=="scenframe"){ if(!scen_gen(seed+0)) exit 2
                           scen_opts()
                           SC_PICK = SO_[index("abcd",tolower(ans))>0 ? index("abcd",tolower(ans)) : 1]
                           cpa_under(SC_PICK)
                           plot_true((tmin+0)/60.0, SC_PICK)
                           printf "\n  %s\n", cw(sprintf("  t + %2d min   she bears %03d T, range %.2f nm%s",
                                    tmin+0, TP_B, TP_R,
                                    (fabs((tmin+0)-CPA_T)<3.5 ? "   <- closest approach" : "")), C_ACC)
                           gshow()
                           if((tmin+0) > CPA_T + 6) exit 3
                           exit 0 }
  else if(cmd=="scenout"){ if(!scen_gen(seed+0)) exit 2
                           scen_opts()
                           SC_PICK = SO_[index("abcd",tolower(ans))>0 ? index("abcd",tolower(ans)) : 1]
                           scen_outcome(SC_PICK) }
  #  contacts: these live in contacts.awk, which is always loaded with
  #  the engine, so the functions are here by the time we call them
  else if(cmd=="csyl")     ct_syl(done)
  else if(cmd=="clesson")  ct_lesson(les_id)
  else if(cmd=="cref")     ct_ref()
  else if(cmd=="track"){   if(ct_track(seed+0)) exit 2 }
  else if(cmd=="trackm")   exit ct_trackm(seed+0,a1,a2,a3)
  else if(cmd=="ek"){      if(ek_show(seed+0)) exit 2 }
  else if(cmd=="ekm")      exit ek_mark(seed+0,ans)
  #  review: the claims a test cannot check, put to a person
  else if(cmd=="rvlist")   rv_list(rfile)
  else if(cmd=="rvshow")   exit rv_show(key)
  else if(cmd=="rvnext")   rv_next(rfile,skips)
  else if(cmd=="rvreport") rv_report(rfile)
  else if(cmd=="rvurl")    rv_url(rfile)
  else if(cmd=="rvcount"){ print rv_build() }
  else if(cmd=="rvkeys")   rv_keys(which)
  else if(cmd!=""){ print "colregs: unknown cmd " cmd; exit 2 }
}

# =====================================================================
#  Collision avoidance: the radar plot
#
#  A developing situation rather than a snapshot. Three timed
#  observations of bearing and range; you decide whether risk exists,
#  how close she will come, and what to do. Then you watch it run.
#
#  Everything is worked in nautical miles and hours, in a north-up
#  frame:  E is +x, N is +y, bearings are atan2(E,N).
# =====================================================================
function vE(c,s){ return s*sind(c) }
function vN(c,s){ return s*cosd(c) }
function brg(e,n){ return nrm360(atan2d(e,n)) }
function asind(x){ if(x>=1) return 90; if(x<=-1) return -90
  return atan2d(x,sqrt(1-x*x)) }
function atan2d(y,x){ return 57.2957795130823209*atan2(y,x) }
function acosd(x){ if(x>=1) return 0; if(x<=-1) return 180
  return atan2d(sqrt(1-x*x),x) }

#  ---- what each vessel sees of the other, and what decides it -------
#  Larry's idea, and his worked example: a boat on the port bow shows us
#  her green, she sees our red, so she has us on her starboard side and
#  she keeps clear.  Right -- for a power-driven crossing.
#
#  The finding that shaped this: of the nine situations the generator
#  builds, the colour decides TWO of them.  In three it is actively
#  misleading, because a sailing vessel, a vessel fishing and a vessel
#  restricted in her ability to manoeuvre can all show you GREEN and
#  still be the vessel you keep clear of.  "Green means go" is the exact
#  wrong reflex there.  So the panel shows the lights, and then says what
#  actually governs -- which is the colour sometimes, and Rule 13, 14 or
#  18 the rest of the time.
#
#  The arcs, from Rule 21: sidelights 112.5 degrees each, from right
#  ahead to 22.5 abaft the beam; sternlight 135 degrees; masthead 225.
function tpw(str,   w,n,a,i,line,vis,plain){
  #  WRAP ON VISIBLE WIDTH, not on string length: the verdict lines carry
  #  colour escapes, and counting those as characters wraps at the wrong
  #  place and ragged.  The escapes are stripped for measuring only.
  w = 68
  n = split(str, a, " ")
  line = ""
  for(i=1;i<=n;i++){
    plain = line " " a[i]
    gsub(/\033\[[0-9;]*m/, "", plain)
    if(line=="") line = a[i]
    else if(length(plain) <= w + 1) line = line " " a[i]
    else { print "  " line; line = a[i] }
  }
  if(line!="") print "  " line
  return 0
}
function lt_arc(rel,   r){
  #  `rel` is the viewer's bearing FROM the subject, relative to the
  #  subject's bow.  What the viewer can see follows from that alone.
  r = nrm360(rel)
  #  2.5, the same overlap arc_vis() draws (Annex I lets the cut-off fall
  #  outside the sector), so the words never say one sidelight while the
  #  picture beside them shows two.  It was 1.5 until 1.19.
  if(r <= 2.5 || r >= 357.5) return "both"
  if(r < 112.5)              return "green"
  if(r > 247.5)              return "red"
  return "stern"
}
function lt_phrase(arc,kind,mine,   s){
  if(arc=="green")     s = cw("green",K_G) " starboard light"
  else if(arc=="red")  s = cw("red",K_R) " port light"
  else if(arc=="both") s = cw("both",K_W) " sidelights, bow-on,"
  else                 s = cw("white",K_W) " sternlight"
  if(mine) return s
  #  AN ALL-ROUND LIGHT IS VISIBLE FROM EVERY DIRECTION, including from
  #  astern -- that is what "all-round" means, and it is the whole reason
  #  those lights outrank the colour.  Skipping them in the stern arc
  #  would have shown a trawler overtaken from astern as nothing but a
  #  white sternlight.
  if(kind=="fishing")  return s ", under " cw("red over white",K_R) " -- engaged in fishing"
  if(kind=="ram")      return s ", under " cw("red, white, red",K_R) " -- restricted in her ability to manoeuvre"
  if(arc=="stern")     return s
  if(kind=="sail")     return s " (no masthead light -- she is under sail)"
  return s " and her masthead light"
}
#  ---- relative bearing, by name -------------------------------------
#  Larry: "for releative bearings by name, we should have fine on bow,
#  broad on bow, on beam, fwd of beam, aft of beam, on quarter, etc.  We
#  can look up angles to refine meaning."
#
#  Looked up.  The named positions are not approximations -- they are the
#  four-point marks, and a point is 11.25 degrees:
#
#      broad on the bow   four points ahead of the beam   045
#      on the beam        eight points                    090
#      on the quarter     the fourth point aft of the beam 135
#
#  "Fine" is a point or two off the fore-and-aft line.  So the sectors
#  are centred on those names with their boundaries at the TWO-point
#  marks: 22.5, 67.5, 112.5, 157.5.
#
#  Which lands somewhere worth noticing in this app of all places: 112.5
#  is both where "broad on the quarter" begins AND the outer edge of the
#  sidelight arc -- 22.5 degrees abaft the beam, Rule 21.  The lights are
#  cut at the same marks the bearing names are cut at, so "her green has
#  just gone out" and "she has come broad on my quarter" are the same
#  observation.
function lt_sector(rel,   r, side){
  r = nrm360(rel)
  if(r <= 2 || r >= 358)    return "right ahead"
  if(r >= 178 && r <= 182)  return "right astern"
  side = (r < 180) ? "starboard" : "port"
  if(r >= 180) r = 360 - r                 # fold onto one side
  if(r < 22.5)   return "fine on the " side " bow"
  if(r < 67.5)   return "broad on the " side " bow"
  if(r < 88)     return "forward of the " side " beam"
  if(r <= 92)    return "on the " side " beam"
  if(r < 112.5)  return "abaft the " side " beam"
  if(r < 157.5)  return "broad on the " side " quarter"
  return "fine on the " side " quarter"
}
function scen_lights(   relus, relher, we, she, bow, v){
  relus  = nrm360(SC_B0 - SC_CO)            # where she is, off our bow
  relher = nrm360(SC_B0 + 180 - SC_CT)      # where we are, off her bow
  we  = lt_arc(relher)                      # so this is what WE see of HER
  she = lt_arc(relus)                       # and this is what SHE sees of US
  bow = (relus < 180) ? "starboard" : "port"
  print ""
  printf "  %s\n", cw("THE LIGHTS",C_ACC)
  hr()
  #  THE RELATIVE BEARING IS THE USEFUL ONE.  "Port of your bow" is true
  #  of anything from one degree to a hundred and seventy-nine, and an
  #  overtaking at ten degrees off the bow read the same as a crossing at
  #  a hundred.  The number is what you would take off the plot, and the
  #  words name the arc it falls in.
  printf "  She bears %03d T, %03d relative -- %s, %.1f nm.\n", SC_B0, relus, lt_sector(relus), SC_R0
  printf "  You see   %s\n", lt_phrase(we,SC_KIND,0)
  printf "  She sees  %s\n", lt_phrase(she,"power",1)
  hr()
  v = ""
  if(SC_KEY=="cross_stbd"){
    v = "Her " cw("red",K_R) " on your starboard side. \"If to starboard red appear,"
    v = v " 'tis your duty to keep clear\" -- you give way (Rule 15), and Rule 8"
    v = v " wants it early and large enough to be obvious." }
  else if(SC_KEY=="cross_port"){
    v = "Her " cw("green",K_G) " on your port side: she has you on HER starboard,"
    v = v " so she keeps clear (Rule 15). You stand on -- and Rule 17 means hold"
    v = v " your course and speed, which is an instruction, not permission to stop looking." }
  else if(SC_KEY=="headon"){
    v = "Both her sidelights: she is bow-on, and this is Rule 14. "
    v = v cw("Nobody stands on.",C_ACC) " Both of you alter to starboard. The colour"
    v = v " decides nothing here, because you can see them both." }
  else if(SC_KEY=="overtaking"){
    v = "Her " cw("sternlight",K_W) " -- no colour to read at all. You are the"
    v = v " overtaking vessel, so you keep clear until you are past and clear"
    v = v " (Rule 13), whatever else you can see." }
  else if(SC_KEY=="overtaken"){
    v = "She sees your " cw("sternlight",K_W) ". She is overtaking you, so she keeps"
    v = v " clear (Rule 13) and you stand on (Rule 17)." }
  else if(SC_KEY=="sail"){
    v = cw("The colour tells you nothing here.",C_ACC) " She is under sail and you"
    v = v " are under power, so you keep out of her way (Rule 18) -- and between two"
    v = v " sailing vessels it is Rule 12, decided by tack and by windward or leeward,"
    v = v " not by which light you happen to see." }
  else if(SC_KEY=="fishing"){
    v = cw("The all-round lights outrank the colour.",C_ACC) " Red over white is the"
    v = v " signal that governs: you keep out of the way of a vessel engaged in"
    v = v " fishing (Rule 18), even when she is showing you green." }
  else if(SC_KEY=="ram"){
    v = cw("The all-round lights outrank the colour.",C_ACC) " Red, white, red is the"
    v = v " signal that governs: you keep out of the way of a vessel restricted in"
    v = v " her ability to manoeuvre (Rule 18), even when she is showing you green." }
  else {
    v = "The lights read like a crossing, but the bearing is opening and the CPA is"
    v = v " wide -- no risk of collision exists yet (Rule 7). Keep taking the bearing;"
    v = v " that, not the colour, is what tells you." }
  tpw(v)
  tb()
  v = cw("What the colour is worth:",C_ACC) " it decides a power-driven crossing and"
  v = v " nothing else. An all-round light above a sidelight outranks it, a sailing"
  v = v " vessel's right of way is decided by tack rather than by aspect, and head-on"
  v = v " or overtaking are settled before you look at the colour at all."
  tpw(v)
  tb()
  return 0
}
function scen_class(k){
  # key | description | rel-bearing lo | hi | cpa band | target kind
  if(k==1) return "cross_stbd|crossing from starboard|20|95|near|power"
  if(k==2) return "cross_port|crossing from port|265|340|near|power"
  if(k==3) return "headon|meeting head-on|352|8|near|power"
  if(k==4) return "overtaking|you overtaking her|345|15|near|slow"
  if(k==5) return "overtaken|she overtaking you|160|200|near|fast"
  if(k==6) return "clear|passing clear|20|340|far|power"
  if(k==7) return "sail|a sailing vessel crossing|20|340|near|sail"
  if(k==8) return "fishing|a vessel engaged in fishing|300|60|near|fishing"
  if(k==9) return "ram|a vessel restricted in her ability to manoeuvre|300|60|near|ram"
  return "cross_stbd|crossing from starboard|20|95|near|power"
}
function scen_gen(seed,   i,a,k,lo,hi,rb,d,T,side,beta,alpha,thr,vr,p0e,p0n,vte,vtn,ok,band){
  xsrand(seed+0)
  for(i=0;i<4;i++) xrand()
  ok=0
  for(i=0;i<400 && !ok;i++){
    k = 1+int(xrand()*9)
    split(scen_class(k),a,"|")
    SC_KEY=a[1]; SC_DESC=a[2]; lo=a[3]+0; hi=a[4]+0; band=a[5]; SC_KIND=a[6]
    SC_CO = int(xrand()*360)
    SC_SO = 6 + int(xrand()*11)
    if(hi<lo) rb = nrm360(lo + xrand()*(hi+360-lo)); else rb = lo + xrand()*(hi-lo)
    SC_B0 = nrm360(SC_CO + rb)
    SC_R0 = 6 + xrand()*4
    if(band=="far"){ SC_CPA = 3.4 + xrand()*1.8; SC_BAND=4 }
    else {
      SC_BAND = 1 + int(xrand()*3)
      if(SC_BAND==1) SC_CPA = 0.15 + xrand()*0.3
      else if(SC_BAND==2) SC_CPA = 0.85 + xrand()*0.3
      else SC_CPA = 1.85 + xrand()*0.3
    }
    p0e = SC_R0*sind(SC_B0); p0n = SC_R0*cosd(SC_B0)

    #  ---- COURSE FIRST, for the three classes that ARE a course -------
    #  Head-on, overtaking and overtaken are defined by her course
    #  relative to ours.  The construction below picks a CPA and lets her
    #  course fall out of the geometry -- and it almost never falls within
    #  25 degrees of reciprocal, so the acceptance test threw those draws
    #  away and the loop quietly replaced them with another class.
    #
    #  Measured before fixing it: across 400 consecutive seeds, "meeting
    #  head-on" and "you overtaking her" NEVER appeared.  Two of the nine
    #  declared classes were dead, and they are two of the four the rules
    #  spend the most time on -- and the two where the light colour
    #  decides nothing at all.
    #
    #  So for these three, choose her course and speed first and DERIVE
    #  the CPA and the time to it, which is the honest direction: at sea
    #  you measure the bearings and work out the CPA, you do not choose it.
    if(SC_KEY=="headon" || SC_KEY=="overtaking" || SC_KEY=="overtaken"){
      if(SC_KEY=="headon"){
        SC_CT = nrm360(SC_CO + 180 + (xrand()*20 - 10))
        SC_ST = 5 + xrand()*13 }
      else {
        #  AN OVERTAKING PLOT STARTS CLOSE, and it has to.  The closing
        #  speed is only the difference between the two speeds -- three
        #  to six knots -- so from six to ten miles the CPA is an hour
        #  and a half away, not the sixteen to thirty-eight minutes this
        #  drill is built around.  Head-on closes at the SUM of the
        #  speeds and works at any range; overtaking does not, and
        #  keeping the long range is why these two still did not appear
        #  after her course was chosen first.  At sea you would not plot
        #  an overtaking at eight miles either: you would watch it.
        SC_R0 = 1.2 + xrand()*2.2
        p0e = SC_R0*sind(SC_B0); p0n = SC_R0*cosd(SC_B0)
        SC_CT = nrm360(SC_CO + (xrand()*20 - 10))
        if(SC_KEY=="overtaking") SC_ST = SC_SO - (3 + xrand()*3)
        else                     SC_ST = SC_SO + (3 + xrand()*3) }
      if(SC_ST < 3.5 || SC_ST > 26) continue
      vte = vE(SC_CT,SC_ST) - vE(SC_CO,SC_SO)      # relative velocity
      vtn = vN(SC_CT,SC_ST) - vN(SC_CO,SC_SO)
      vr = sqrt(vte*vte + vtn*vtn)
      if(vr < 1.5) continue                        # no useful relative motion
      T = -(p0e*vte + p0n*vtn)/(vr*vr)             # hours to CPA
      if(T <= 0.26 || T > 0.64) continue           # 16 to 38 minutes, as above
      SC_CPA = sqrt((p0e + vte*T)^2 + (p0n + vtn*T)^2)
      if(SC_CPA <= 0.45)       SC_BAND = 1
      else if(SC_CPA <= 1.15)  SC_BAND = 2
      else if(SC_CPA <= 2.15)  SC_BAND = 3
      else continue                                # too wide to be the drill
      thr = brg(vte,vtn)                           # so the tail below holds
      SC_TCPA = T*60.0
      ok = 1
      continue
    }

    T = (16 + xrand()*22)/60.0                    # time to CPA, hours
    side = (xrand()<0.5) ? 1 : -1
    beta = brg(-p0e,-p0n)                          # from her, towards us
    alpha = asind(SC_CPA/SC_R0)
    thr = nrm360(beta + side*alpha)                # relative-motion direction
    vr = sqrt(SC_R0*SC_R0 - SC_CPA*SC_CPA)/T
    vte = vr*sind(thr) + vE(SC_CO,SC_SO)
    vtn = vr*cosd(thr) + vN(SC_CO,SC_SO)
    SC_ST = sqrt(vte*vte+vtn*vtn)
    SC_CT = brg(vte,vtn)
    SC_TCPA = T*60.0
    if(SC_ST<3.5 || SC_ST>26) continue
    if(SC_KEY=="clear" && SC_CPA<3.0) continue
    ok=1
  }
  if(!ok) return 0
  SC_P0E=p0e; SC_P0N=p0n
  SC_VRE=vr*sind(thr); SC_VRN=vr*cosd(thr)
  # three observations, six minutes apart, with the scatter a hand bearing
  # compass actually gives you
  for(i=0;i<3;i++){
    T=i*0.1
    OB_E[i]=SC_P0E+SC_VRE*T; OB_N[i]=SC_P0N+SC_VRN*T
    OB_R[i]=sqrt(OB_E[i]^2+OB_N[i]^2)
    OB_B[i]=brg(OB_E[i],OB_N[i])
    OB_BN[i]=nrm360(OB_B[i] + (xrand()*3.0-1.5))     # bearing scatter
    OB_RN[i]=OB_R[i] + (xrand()*0.16-0.08)           # range scatter
    OB_T[i]=i*6
  }
  scen_answers()
  return 1
}
# what the rules make of it
function scen_answers(   rb,rbher){
  rb    = nrm180(SC_B0 - SC_CO)              # she bears this, from your bow
  rbher = nrm180(nrm360(SC_B0+180) - SC_CT)  # you bear this, from her bow
  SC_RB=rb
  if(SC_CPA >= 3.0){ SC_ACT="none"; SC_RULE="Rule 7"
    SC_WHY="The bearing is drawing steadily and she will pass three miles or more off. There is no risk of collision, so no action is called for - but keep taking the bearing, because that is the only thing that tells you it stays true." }
  else if(SC_KIND=="sail" || SC_KIND=="fishing" || SC_KIND=="ram"){
    SC_ACT="giveway"; SC_RULE="Rule 18"
    SC_WHY="You are a power-driven vessel and she is " ((SC_KIND=="sail")?"under sail":((SC_KIND=="fishing")?"engaged in fishing":"restricted in her ability to manoeuvre")) ". You keep out of her way, whichever side she is on." }
  else if(SC_KEY=="overtaking"){ SC_ACT="overtake"; SC_RULE="Rule 13"
    SC_WHY="You are coming up on her from more than 22.5 degrees abaft her beam, so you are overtaking. You keep out of her way, and you stay the give-way vessel until you are finally past and clear." }
  else if(SC_KEY=="overtaken"){ SC_ACT="standon"; SC_RULE="Rule 13"
    SC_WHY="She is overtaking you, so she must keep out of your way. Hold your course and speed so that she can plan around you - and watch her." }
  else if(SC_KEY=="headon"){ SC_ACT="headon"; SC_RULE="Rule 14"
    SC_WHY="Reciprocal courses, and closing. Neither of you is the stand-on vessel: each alters to starboard so that you pass port to port." }
  else if(rb>=0 && rb<112.5){ SC_ACT="giveway"; SC_RULE="Rule 15"
    SC_WHY="She is crossing from your starboard side, so you give way - and Rule 15 says avoid crossing ahead of her. A bold alteration to starboard takes you under her stern." }
  else { SC_ACT="standon"; SC_RULE="Rule 17"
    SC_WHY="She is crossing from your port side, so she keeps out of your way and you stand on. Hold your course and speed, but be ready to act the moment it is clear she is not." }
  return 0
}
function act_text(k){
  if(k=="none")     return "No risk of collision: hold your course and speed, and keep checking the bearing."
  if(k=="standon")  return "Stand on: hold your course and speed; she must keep out of your way."
  if(k=="giveway")  return "Give way: a bold alteration to starboard, passing under her stern."
  if(k=="headon")   return "Both alter to starboard, and pass port to port."
  if(k=="overtake") return "Give way: you are overtaking; keep well clear until finally past and clear."
  if(k=="slow")     return "Give way: take off speed and let her pass ahead."
  return "?"
}

# ---- the relative plot: you at the centre, north up -------------------
function plot_rel(solution,   w,h,cx,cy,i,sc,mx,e,n,t,r,c,tc,ce,cn,step){
  w=61; h=25; cx=int(w/2); cy=int(h/2)
  mx=SC_R0*1.15
  sc=(cy-1)/mx
  gclear(w,h)
  for(t=0;t<360;t+=0.7){
    gputwc(cy-(cy-1)*cosd(t), cx+(cx-1)*sind(t), ".", C_DIM)
    gputwc(cy-(cy-1)*0.5*cosd(t), cx+(cx-1)*0.5*sind(t), ".", C_DIM)
  }
  gputsc(0,cx-1,"N",C_DIM)
  gputsc(cy,0,"W",C_DIM); gputsc(cy,w-1,"E",C_DIM)
  gputsc(h-1,cx-1,"S",C_DIM)
  if(solution){
    step=0.04
    for(t=-0.02;t<=1.6;t+=step){
      e=SC_P0E+SC_VRE*(SC_TCPA/60.0)*t; n=SC_P0N+SC_VRN*(SC_TCPA/60.0)*t
      gputwc(cy-n*sc*(cy-1)/mx/sc*1, cx+e*sc*(cx-1)/mx/sc*1, "-", C_DIM)
    }
  }
  for(i=0;i<3;i++){
    r=cy-OB_N[i]*(cy-1)/mx; c=cx+OB_E[i]*(cx-1)/mx
    gputc(r,c,sprintf("%d",i+1),C_ACC)
  }
  if(solution){
    tc=SC_TCPA/60.0
    ce=SC_P0E+SC_VRE*tc; cn=SC_P0N+SC_VRN*tc
    gputc(cy-cn*(cy-1)/mx, cx+ce*(cx-1)/mx, "X", C_ACC)
    gputsc(cy-cn*(cy-1)/mx, cx+ce*(cx-1)/mx+2, "CPA", C_ACC)
  }
  gputc(cy,cx,"+",C_ACC)
  gputsc(cy+1,cx-1,"YOU",C_ACC)
  return 0
}
function scen_show(   i,o,n){
  print ""
  printf "  %s\n", cw("COLLISION AVOIDANCE -- a radar plot",C_ACC)
  hr()
  printf "  You are a power-driven vessel, steering %03d T at %d knots.\n", SC_CO, SC_SO
  printf "  Visibility is good and you have her in sight.\n"
  hr()
  print "  Three observations, six minutes apart:"
  print ""
  printf "      %-8s %-12s %s\n","time","bearing","range"
  for(i=0;i<3;i++)
    printf "      %-8s %03.0f T        %.1f nm\n", sprintf("%02d min",OB_T[i]), OB_BN[i], OB_RN[i]
  print ""
  if(SC_KIND=="sail")         print "  She is under sail alone."
  else if(SC_KIND=="fishing") print "  She shows red over white: she is engaged in fishing."
  else if(SC_KIND=="ram")     print "  She shows red over white over red: restricted in her ability to manoeuvre."
  else                        print "  She is a power-driven vessel."
  plot_rel(0)
  hr(); gshow(); hr()
  print "  The marks are where she was, relative to you, at each observation."
  print ""
  printf "  %s\n", cw("Q1  Is there a risk of collision?",C_ACC)
  print "     a) Yes - the bearing is steady and the range is closing"
  print "     b) No - the bearing is drawing and she will pass well clear"
  print "     c) Three observations are not enough to say"
  print ""
  printf "  %s\n", cw("Q2  How close will she come?",C_ACC)
  print "     a) under half a mile    b) about one mile"
  print "     c) about two miles      d) three miles or more"
  print ""
  printf "  %s\n", cw("Q3  What do you do?",C_ACC)
  scen_opts()
  for(i=1;i<=4;i++) printf "     %s) %s\n", substr("abcd",i,1), act_text(SO_[i])
  print ""
  return 0
}
function scen_opts(   i,j,t,pool,np,seedx){
  # four actions, always including the right one
  np=0
  split("none standon giveway headon overtake slow",pool," ")
  SO_N=0
  SO_[1]=SC_ACT
  j=1
  for(i=1;i<=6;i++){
    if(pool[i]==SC_ACT) continue
    if(pool[i]=="headon" && SC_ACT!="headon" && j>3) continue
    j++; if(j<=4) SO_[j]=pool[i]
  }
  # shuffle, reproducibly
  xsrand(SC_CO*1000+SC_SO*37+int(SC_CPA*100))
  for(i=4;i>1;i--){ j=1+int(xrand()*i); t=SO_[i]; SO_[i]=SO_[j]; SO_[j]=t }
  for(i=1;i<=4;i++) if(SO_[i]==SC_ACT) SC_A3=substr("abcd",i,1)
  SC_A1 = (SC_CPA<3.0) ? "a" : "b"
  SC_A2 = substr("abcd",SC_BAND,1)
  return 0
}

# ---- own position under a chosen action ------------------------------
#  The alteration is made at the third observation, twelve minutes in.
function act_course(k){ if(k=="giveway"||k=="headon") return nrm360(SC_CO+30)
                        if(k=="overtake") return nrm360(SC_CO+35); return SC_CO }
function act_speed(k){  if(k=="slow") return SC_SO*0.35; return SC_SO }
function ownE(t,k,   td){ td=0.2
  if(t<=td) return vE(SC_CO,SC_SO)*t
  return vE(SC_CO,SC_SO)*td + vE(act_course(k),act_speed(k))*(t-td) }
function ownN(t,k,   td){ td=0.2
  if(t<=td) return vN(SC_CO,SC_SO)*t
  return vN(SC_CO,SC_SO)*td + vN(act_course(k),act_speed(k))*(t-td) }
function tgtE(t){ return SC_P0E + vE(SC_CT,SC_ST)*t }
function tgtN(t){ return SC_P0N + vN(SC_CT,SC_ST)*t }
function rng_at(t,k,   de,dn){ de=tgtE(t)-ownE(t,k); dn=tgtN(t)-ownN(t,k)
  return sqrt(de*de+dn*dn) }
function cpa_under(k,   t,r,best,bt){ best=1e9
  for(t=0.2;t<=2.0;t+=0.002){ r=rng_at(t,k); if(r<best){ best=r; bt=t } }
  CPA_T=bt*60.0
  return best }

# ---- true-motion plot: the two tracks on the water -------------------
function plot_true(tnow,k,   w,h,i,t,mnE,mxE,mnN,mxN,sc,cx,cy,e,n,r,c,pad,de,dn){
  w=63; h=23
  mnE=0;mxE=0;mnN=0;mxN=0
  for(t=0;t<=tnow+0.001;t+=0.02){
    e=ownE(t,k); n=ownN(t,k)
    if(e<mnE)mnE=e; if(e>mxE)mxE=e; if(n<mnN)mnN=n; if(n>mxN)mxN=n
    e=tgtE(t); n=tgtN(t)
    if(e<mnE)mnE=e; if(e>mxE)mxE=e; if(n<mnN)mnN=n; if(n>mxN)mxN=n
  }
  pad=0.8
  mnE-=pad; mxE+=pad; mnN-=pad; mxN+=pad
  sc=(w-4)/(mxE-mnE); if((h-3)/((mxN-mnN)*0.5) < sc) sc=(h-3)/((mxN-mnN)*0.5)
  cx=(mnE+mxE)/2; cy=(mnN+mxN)/2
  gclear(w,h)
  for(t=0;t<=tnow+0.001;t+=0.01){
    gputwc(h/2-(ownN(t,k)-cy)*sc*0.5, w/2+(ownE(t,k)-cx)*sc, ".", C_DIM)
    gputwc(h/2-(tgtN(t)-cy)*sc*0.5,   w/2+(tgtE(t)-cx)*sc,   ",", C_DIM)
  }
  gputc(h/2-(ownN(tnow,k)-cy)*sc*0.5, w/2+(ownE(tnow,k)-cx)*sc, "A", C_ACC)
  gputc(h/2-(tgtN(tnow)-cy)*sc*0.5,   w/2+(tgtE(tnow)-cx)*sc,   "B", C_ACC)
  gputs(h/2-(ownN(tnow,k)-cy)*sc*0.5+1, w/2+(ownE(tnow,k)-cx)*sc-1, "you")
  gputsc(0,1,"north up, true motion    A you    B her",C_DIM)
  gputsc(h-1,1,sprintf("%.1f nm per column",1/sc),C_DIM)
  TP_R = rng_at(tnow,k)
  de=tgtE(tnow)-ownE(tnow,k); dn=tgtN(tnow)-ownN(tnow,k)
  TP_B = brg(de,dn)
  return 0
}
function scen_mark(a1,a2,a3,   ok,c1,c2,c3,cpa0,cpaN,i){
  print ""
  c1=(tolower(a1)==SC_A1); c2=(tolower(a2)==SC_A2); c3=(tolower(a3)==SC_A3)
  ok=(c1&&c2&&c3)
  printf "  Q1 risk      you said %s   %s\n", toupper(a1), (c1?cw("right",C_ACC):"the answer is " toupper(SC_A1))
  printf "  Q2 how close you said %s   %s\n", toupper(a2), (c2?cw("right",C_ACC):"the answer is " toupper(SC_A2))
  printf "  Q3 action    you said %s   %s\n", toupper(a3), (c3?cw("right",C_ACC):"the answer is " toupper(SC_A3))
  hr()
  printf "  Her true course and speed:   %03d T at %.1f knots\n", SC_CT, SC_ST
  printf "  Closest point of approach:   %.1f nm, in %.0f minutes\n", SC_CPA, SC_TCPA
  hr()
  print "  How the plot gives you that. The three marks lie on a straight line -"
  print "  her motion relative to you. Extend it: the nearest it passes to the"
  print "  centre is the CPA, and how long she takes to get there is the time to it."
  print ""
  print "  Her true course comes from the vector triangle:"
  printf "     your vector      %03d T  %4.1f kn  over 12 minutes\n", SC_CO, SC_SO
  printf "     relative vector  %03d T  %4.1f kn  (the line through the marks)\n",
         brg(SC_VRE,SC_VRN), sqrt(SC_VRE^2+SC_VRN^2)
  printf "     her true vector  %03d T  %4.1f kn  = yours plus the relative one\n", SC_CT, SC_ST
  plot_rel(1)
  hr(); gshow(); hr()
  printf "  %s -- %s\n", cw(act_text(SC_ACT),C_ACC), SC_RULE
  printf "  %s\n", SC_WHY
  print ""
  SCEN_OK = ok
  return 0
}
function scen_outcome(k,   c0,cn,t0,tn){
  c0=cpa_under("none"); t0=CPA_T
  cn=cpa_under(k);      tn=CPA_T
  printf "\n  You chose: %s\n", act_text(k)
  printf "  If you hold on:            %.2f nm at %.0f minutes\n", c0, t0
  printf "  With the action you chose: %.2f nm at %.0f minutes  %s\n", cn, tn,
     (cn>c0+0.15 ? cw("- opened up",C_ACC) : (cn<c0-0.05 ? cw("- CLOSER. That is the wrong way.",C_ACC) : "- barely changed"))
  print ""
  return 0
}
