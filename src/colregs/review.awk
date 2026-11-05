# =====================================================================
#  colregs -- review.  The claims a test cannot check, put to a person
#  one at a time, with the picture in front of them.
#
#  Nothing here touches the network.  The session is local, the answers
#  are a file in your own home directory, and submitting is a URL the
#  program prints for you to open - so there is no credential in this
#  code to leak and no server for anybody to run.
# =====================================================================

#  Every reviewable claim, in a fixed order, as  key | section | title
#  WHICH CLAIMS ARE WORTH A REVIEWER'S EVENING.
#
#  Larry, asked what he wanted to review out of the 190: "I really only
#  want to review the ones you are not confident of."
#
#  That is only answerable if the confidence rests on something that can
#  be named, so this returns a REASON rather than a score, and returns
#  nothing at all for a claim that has been checked. The rule used:
#
#    CHECKED means a specific outside check that agreed -- the light
#    tables, day shapes, sound signals and arcs were put against a
#    reference guide and against the Convention text, claim by claim;
#    and the geometry half of a give-way call (what she shows, which way
#    she is going) is proved by tests over every vessel at every degree.
#
#    NOT CHECKED means written from the Convention by Claude and read by
#    nobody else. That is most of Part B: who gives way, and what to do.
#    It is also every note and warning written this session for the
#    vessels that were added, because the lights in those entries come
#    from the rule but the prose around them does not.
#
#  The honest list is about seventy of the hundred and ninety, and the
#  reason is on the screen with the claim, so the reviewer knows what to
#  check rather than being told merely to look harder.
function rv_doubt(i,   s,k,a,st,m){
  s=RV_S[i]; k=RV_K[i]

  #  Part B conduct. The most dangerous thing in the program if wrong --
  #  a wrong light table makes you misname a ship, a wrong verdict makes
  #  you turn the wrong way -- and the first review round found two
  #  faults in this section.
  if(s=="enc") return "the verdict and the action. Written from Rules 8 to 19 and never checked against anything outside the program."

  if(s=="les") return "the answer the lesson marks right, and the reason under it. Written from the Convention and not checked against an outside source."

  if(s=="mot"){
    split(VT[RV_MI[i]],a,"|")
    st = r18_of(a[1])
    m = motion_of(RV_MI[i], RV_MT[i])
    #  what she shows and which way she is heading are proved by
    #  tests/motion-seen-check.awk and tests/aspect-check.awk over every
    #  vessel at every degree. What is NOT proved is the half that tells
    #  you what to do about her.
    if(m==5) return "what a vessel lying stopped is told about her standing. Rule 18 does not stop applying because she has stopped, and these sentences are new."
    if(m==4) return "Rule 13 against Rule 18. The claim says an overtaking vessel keeps clear whatever the other one is, and that her status changes how wide you go rather than who gives way."
    if(st!="") return "her standing under Rule 18, and the action that follows from it. Written from the Convention; the lights half of this claim is machine-checked, this half is not."
    if(rv_newves(a[1])) return "a vessel added this session. Her lights come from the rule; the give-way sentence around them has been read by nobody."
    return ""
  }

  if(s=="lig"){
    split(VT[RV_I[i]],a,"|")
    if(rv_newves(a[1])) return "a vessel added this session. The lights are from the rule and the arcs are checked; the note and the warning are new prose and have been read by nobody."
    return ""
  }

  if(s=="shp"){
    split(SH[RV_I[i]],a,"|")
    if(a[1]=="fishing") return "the basket. Kept deliberately as something no longer prescribed, so the wording has to be right about what it is and is not."
    return ""
  }

  return ""
}
#  TWO CLAIMS THAT CARRY THE SAME UNCHECKED SENTENCE ARE ONE THING TO
#  READ. A give-way call is built in two halves: what she shows and
#  which way she is heading, which tests prove over every vessel at
#  every degree, and then her standing and what you do about it, which
#  nothing outside the program has checked. The second half is the same
#  sentence at every bearing that produces it, so putting it to a
#  reviewer four times spends his evening on one assertion. The unsure
#  walk shows one claim per distinct unchecked sentence: 23 rather than
#  73 in the give-way section, and the geometry half of the ones it
#  skips is proved anyway.
function rv_dkey(i,   m,full,pre){
  if(RV_S[i]!="mot") return RV_K[i]
  m    = motion_of(RV_MI[i], RV_MT[i])
  full = motion_why(m, RV_MI[i], RV_MT[i])
  pre  = seen_sig(RV_MI[i], RV_MT[i]) " " motion_lights(m)
  return "mot\t" substr(full, length(pre)+2)
}

#  The six appended when the sweep found the tables had no entry for
#  them. Listed rather than derived from the index, so that appending a
#  seventh does not silently mark it checked.
function rv_newves(key){
  if(key=="dredge" || key=="sailtri" || key=="towalong") return 1
  if(key=="power12" || key=="power7" || key=="fishgear") return 1
  return 0
}

#  A REVIEW KEY MUST NOT MOVE WHEN THE TABLE DOES.
#
#  The keys were positions: mot-28 meant "the twenty-ninth give-way claim
#  in sorted order". Adding six vessels the tables had no entry for moved
#  65 of the 95 existing keys onto different claims, because the claims
#  are sorted by vessel name and the new ones insert in the middle. A
#  reviewer's saved verdicts point at keys; move the keys and his work
#  silently attaches to claims he never read.
#
#  It cost nothing this time, by luck -- the give-way section had no
#  saved marks. It would have cost a whole evening's work the next time.
#
#  So a key now names the thing it is about, and nothing about where it
#  sits: mot-power50p-135, lig-trawl, snd-fogram, shp-aground. They are
#  stable under insertion, and they say what they are, which matters
#  when the reviewer is reading his own notes weeks later or when a
#  report arrives as a GitHub issue.
#
#  enc-N keeps its number. The encounter table is indexed and not
#  sorted, so those keys have never moved -- and the first review round
#  is written up against enc-13 and enc-15, which stay what they were.
#  les-N likewise: lessons are L1..L15 by number.
function rv_build(   i,j,n,a,L,f,t,m,k,cnt,tmp,x,xi,xt){
  if(RV_READY) return RV_N
  ves_init(); shp_init(); enc_init(); snd_init()
  RV_N=0
  #  encounters first: they say what to DO, so a wrong one is the
  #  most dangerous thing in the program
  for(i=1;i<=NENC;i++){
    split(EC[i],a,"|")
    RV_N++; RV_K[RV_N]=sprintf("enc-%d",i-1); RV_S[RV_N]="enc"
    RV_T[RV_N]=substr(a[2],1,58); RV_I[RV_N]=i
  }
  #  the distinct give-way calls the lights quiz can make
  cnt=0
  for(i=1;i<=NVES;i++){
    split(VT[i],a,"|")
    for(t=0;t<360;t+=45){
      m=motion_of(i,t)
      k = a[2] "\t" motion_text(m) "\t" motion_why(m,i,t)
      if(k in RVSEEN) continue
      #  KEEP THE VESSEL AND THE BEARING, not just the sentence. The
      #  review screen showed the claim with her type handed over as a
      #  given and no lights at all -- for a section called "give-way
      #  calls from her lights", which is backwards. Larry, reviewing the
      #  fishing ones: "you dont show all lights....just say you see a
      #  green or red bow light and the statment that shee is fishing...
      #  If I see just green, and not white over green ore green over
      #  white, then she is either a sailboat or a small power drivven
      #  vessal,,,,not a fishing boat." Exactly so: a sidelight alone
      #  identifies nothing. The claim is only judgeable with the picture
      #  that produced it, so the first bearing that yields each distinct
      #  call is kept and drawn.
      RVSEEN[k]=1; cnt++; MOK[cnt]=k; MOI[cnt]=i; MOT[cnt]=t
    }
  }
  #  sorted, so the order does not depend on the order vessels happen
  #  to be listed in
  for(i=2;i<=cnt;i++){ x=MOK[i]; xi=MOI[i]; xt=MOT[i]; j=i-1
    while(j>=1 && MOK[j]>x){ MOK[j+1]=MOK[j]; MOI[j+1]=MOI[j]; MOT[j+1]=MOT[j]; j-- }
    MOK[j+1]=x; MOI[j+1]=xi; MOT[j+1]=xt }
  for(i=1;i<=cnt;i++){
    split(MOK[i],a,"\t")
    split(VT[MOI[i]],f,"|")
    RV_N++; RV_K[RV_N]=sprintf("mot-%s-%03d",f[1],MOT[i]); RV_S[RV_N]="mot"
    RV_T[RV_N]=substr(a[1] " -- " a[2],1,58); RV_M[RV_N]=MOK[i]
    RV_MI[RV_N]=MOI[i]; RV_MT[RV_N]=MOT[i]
  }
  for(i=1;i<=NVES;i++){
    split(VT[i],a,"|")
    RV_N++; RV_K[RV_N]=sprintf("lig-%s",a[1]); RV_S[RV_N]="lig"
    RV_T[RV_N]=substr(a[2],1,58); RV_I[RV_N]=i
  }
  j=0
  for(i=1;i<=15;i++){
    Q_A=""; les_q("L" i,0)
    if(Q_A=="") continue
    RV_N++; RV_K[RV_N]=sprintf("les-%d",j); RV_S[RV_N]="les"
    RV_T[RV_N]="Lesson L" i; RV_I[RV_N]=i; j++
  }
  for(i=1;i<=NSND;i++){
    split(SD[i],a,"|")
    RV_N++; RV_K[RV_N]=sprintf("snd-%s",a[1]); RV_S[RV_N]="snd"
    RV_T[RV_N]=substr(a[3],1,58); RV_I[RV_N]=i
  }
  for(i=1;i<=NSHP;i++){
    split(SH[i],a,"|")
    RV_N++; RV_K[RV_N]=sprintf("shp-%s",a[1]); RV_S[RV_N]="shp"
    RV_T[RV_N]=substr(a[2],1,58); RV_I[RV_N]=i
  }
  RV_READY=1
  return RV_N
}
function rv_secname(s){
  if(s=="enc") return "Encounter verdicts - who gives way, and what to do"
  if(s=="mot") return "Give-way calls from her lights"
  if(s=="lig") return "The light tables"
  if(s=="les") return "Rules lesson answers"
  if(s=="snd") return "Sound signals"
  if(s=="shp") return "Day shapes"
  return s
}
function rv_secrule(s){
  if(s=="enc") return "Rules 8 to 19"
  if(s=="mot") return "Rules 12 to 18"
  if(s=="lig") return "Rules 20 to 31 and Annex I"
  if(s=="les") return "the Convention itself"
  if(s=="snd") return "Rules 34 and 35, Annex III"
  if(s=="shp") return "Rules 24 to 30"
  return ""
}
#  WHAT THIS CLAIM IS ASSERTING, said on the screen rather than inferred
#  from the section heading. Larry, after three claims where the words
#  and the drawing disagreed: "lets add a sperate line saying TESTING:
#  blah blah". Each section asserts a different thing, so each gets its
#  own sentence -- one line reused across six sections could only be
#  true of one of them.
function rv_testing(s){
  if(s=="enc") return "who gives way in this encounter, and what each of you does about it"
  if(s=="mot") return "what her lights tell you about her heading, and who gives way"
  if(s=="lig") return "the lights she carries: colour, arc and height, against Annex I"
  if(s=="les") return "the answer the lesson marks right, and the reason it gives for it"
  if(s=="snd") return "what the signal means, and the rule that prescribes it"
  if(s=="shp") return "the day shape she carries, and what it identifies her as"
  return ""
}
function rv_find(key,   i){ rv_build()
  for(i=1;i<=RV_N;i++) if(RV_K[i]==key) return i
  return 0 }

#  Written as plain ifs rather than nested ternaries split over lines:
#  awk permits a newline after a comma or an operator, but not after the
#  ':' of a conditional. gawk accepts it anyway, mawk does not, and the
#  file then fails to parse at all.
function rv_colour(c){
  if(c=="W") return "white"
  if(c=="R") return "red"
  if(c=="G") return "green"
  if(c=="Y") return "yellow"
  return c
}
function rv_arc(a){
  if(a=="A") return "all-round 360"
  if(a=="M") return "masthead 225"
  if(a=="S") return "starboard side 112.5"
  if(a=="P") return "port side 112.5"
  if(a=="T") return "stern 135"
  if(a=="Y") return "towing 135"
  return a
}

# ---- show one claim, in full ----------------------------------------
function rv_show(key,   i,s,a,n,O,j,idx,parts){
  i=rv_find(key); if(i==0){ print "  no such item: " key; return 1 }
  s=RV_S[i]
  print ""
  printf "  %s\n", cw(sprintf("%s   %s", RV_K[i], rv_secname(s)),C_ACC)
  printf "  %s\n", cwd("check against " rv_secrule(s))
  hr()
  if(s=="enc"){
    idx=RV_I[i]; split(EC[idx],a,"|")
    printf "  You are %s\n", tolower(substr(a[1],9))
    printf "  You see %s.\n", a[2]
    print ""
    n=split(a[7],O,";")
    for(j=1;j<=n;j++) printf "     %s) %s\n", substr("abcd",j,1), O[j]
    print ""
    printf "  %s   %s\n", cw("TESTING",C_ACC), cwd(rv_testing(s))
    if(rv_doubt(i)!="")
      printf "  %s   %s\n", cw("UNCHECKED",C_ACC), cwd(rv_doubt(i))
    print ""
    printf "  %s   %s\n", cw("The program says " toupper(a[6]),C_ACC), a[9]
    printf "  %s\n", a[8]
  }
  else if(s=="mot"){
    split(RV_M[i],a,"\t")
    printf "  Vessel   %s\n", a[1]
    #  HER LIGHTS, FROM THE BEARING THAT PRODUCES THIS CALL. Without the
    #  picture the claim cannot be judged as framed: her type arrives as
    #  an assertion rather than as something read off her lights, and the
    #  one thing the section is about - that you identify her first and
    #  work the geometry second - is missing from the screen.
    if(RV_MI[i]!=""){
      split(VT[RV_MI[i]],parts,"|")
      print ""
      G_NOCROP=1
      draw_lights(parts[1], RV_MT[i]); gshow()
      G_NOCROP=0
      #  "drawn from 135 - Two masthead lights, the after one higher."
      #  read as a caption for the picture, and the picture showed one
      #  sternlight: field 5 is her SIGNATURE, every light she carries,
      #  and from 135 you can see none of the three it names. The words
      #  above now say what bears on you; this line says what she
      #  carries, and says which it is.
      printf "  %s\n", cwd(sprintf("drawn from %03d - she carries %s", RV_MT[i],
                                    tolower(substr(parts[5],1,1)) substr(parts[5],2)))
      if(hidden_note(parts[1], RV_MT[i])!="")
        printf "  %s\n", cw(hidden_note(parts[1], RV_MT[i]),C_ACC)
    }
    print ""
    printf "  %s   %s\n", cw("TESTING",C_ACC), cwd(rv_testing(s))
    if(rv_doubt(i)!="")
      printf "  %s   %s\n", cw("UNCHECKED",C_ACC), cwd(rv_doubt(i))
    print ""
    printf "  %s   %s\n", cw("The program says",C_ACC), a[2]
    print ""
    printf "  %s\n", a[3]
  }
  else if(s=="lig"){
    idx=RV_I[i]; split(VT[idx],a,"|")
    G_NOCROP=1
    draw_lights(a[1], 305); gshow()
    printf "  %s\n", cwd("drawn from 305 - use 'colregs light " a[1] " <brg>' for any angle")
    print ""
    printf "  %s   %s\n", cw("TESTING",C_ACC), cwd(rv_testing(s))
    if(rv_doubt(i)!="")
      printf "  %s   %s\n", cw("UNCHECKED",C_ACC), cwd(rv_doubt(i))
    print ""
    printf "  %s   %s.  %s\n", cw(a[2],C_ACC), a[3], a[5]
    if(a[6]!="") printf "  %s %s\n", cw("Watch out:",C_ACC), a[6]
    print ""
    n=split(a[4],O,";")
    for(j=1;j<=n;j++){
      split(O[j],parts,",")
      printf "     %-6s %-22s height %.2f   %+.2f along   %+.2f across\n",
        rv_colour(parts[5]), rv_arc(parts[4]),
        parts[3]+0, parts[1]+0, parts[2]+0
    }
  }
  else if(s=="les"){
    idx=RV_I[i]
    les_q("L" idx,1)
    Q_A=""; les_q("L" idx,0)
    print ""
    printf "  %s   %s\n", cw("TESTING",C_ACC), cwd(rv_testing(s))
    if(rv_doubt(i)!="")
      printf "  %s   %s\n", cw("UNCHECKED",C_ACC), cwd(rv_doubt(i))
    print ""
    printf "  %s   %s\n", cw("The program says " toupper(Q_A),C_ACC), Q_W
    printf "  %s\n", cwd("the lesson body itself is 'colregs lesson L" idx "'")
  }
  else if(s=="snd"){
    idx=RV_I[i]; split(SD[idx],a,"|")
    print ""
    printf "  %s   %s\n", cw("TESTING",C_ACC), cwd(rv_testing(s))
    if(rv_doubt(i)!="")
      printf "  %s   %s\n", cw("UNCHECKED",C_ACC), cwd(rv_doubt(i))
    print ""
    printf "  %s\n", cw(a[2],C_ACC)
    printf "  %s   %s\n", a[3], a[4]
    print ""
    printf "  %s\n", a[5]
  }
  else if(s=="shp"){
    idx=RV_I[i]; split(SH[idx],a,"|")
    draw_shapes(a[1]); gshow()
    print ""
    printf "  %s   %s\n", cw("TESTING",C_ACC), cwd(rv_testing(s))
    if(rv_doubt(i)!="")
      printf "  %s   %s\n", cw("UNCHECKED",C_ACC), cwd(rv_doubt(i))
    print ""
    printf "  %s   %s\n", cw(a[2],C_ACC), a[3]
    printf "  %s\n", a[5]
  }
  hr()
  return 0
}
# ---- the list, with what has been answered so far -------------------
function rv_list(rfile,   i,line,f,n,done,fl,s,lastsec){
  rv_build()
  while((getline line < rfile) > 0){
    n=split(line,f,"\t"); if(n<2) continue
    ST_[f[1]]=f[2]; if(n>=3) NT_[f[1]]=f[3]
  }
  close(rfile)
  print ""
  printf "  %s\n", cw("REVIEW -- the claims no test can check",C_ACC)
  hr()
  done=0; fl=0
  for(i=1;i<=RV_N;i++){
    if(RV_S[i]!=lastsec){
      lastsec=RV_S[i]
      printf "\n  %s   %s\n", cw(rv_secname(lastsec),C_ACC), cwd(rv_secrule(lastsec))
    }
    s = (RV_K[i] in ST_) ? ST_[RV_K[i]] : ""
    if(s=="ok") done++
    if(s=="flag"){ done++; fl++ }
    printf "   [%s] %-18s %s\n",
      (s=="ok"?"x":(s=="flag"?cw("!",C_ACC):" ")), RV_K[i], RV_T[i]
  }
  hr()
  printf "  %d of %d looked at, %s flagged.\n", done, RV_N, (fl?cw(fl "",C_ACC):"0")
  print ""
  return 0
}
#  "CARRY ON FROM WHERE I LEFT OFF" PLUS SKIP WAS AN INFINITE LOOP.
#  rv_next() returns the first claim with no row in review.tsv, and
#  [return] deliberately writes no row -- so the same claim came back,
#  and came back, and came back. The menu offers skip, so skip has to
#  mean "not this one, now", not "ask me again immediately".
#
#  The keys skipped during THIS run are passed in and stepped over.
#  Nothing is written for them, so the next run offers them again, which
#  is what a reviewer means by skipping: he has not judged it yet.
function rv_next(rfile,skips,   i,line,f,n,SK,j,m){
  rv_build()
  while((getline line < rfile) > 0){
    n=split(line,f,"\t"); if(n<2) continue
    ST_[f[1]]=f[2]
  }
  close(rfile)
  m=split(skips,SK," ")
  for(i=1;i<=RV_N;i++){
    if(RV_K[i] in ST_) continue
    for(j=1;j<=m;j++) if(SK[j]==RV_K[i]) break
    if(j<=m) continue
    print RV_K[i]; return 0
  }
  print ""
  return 0
}

function rv_keys(sec,   i,d,line,f,n,SEEN2){
  rv_build()
  if(sec=="unsure"){
    #  What is LEFT to check, not the whole list: a claim already
    #  answered is not offered again, and -- because two claims carrying
    #  the same unchecked sentence are one thing to read -- answering
    #  one of them settles the rest. Without that second part the walk
    #  would hand back the same standing sentence at the next bearing
    #  the moment the reviewer marked it.
    if(rfile!=""){
      while((getline line < rfile) > 0){
        n=split(line,f,"\t"); if(n<2) continue
        ST_[f[1]]=f[2]
      }
      close(rfile)
      for(i=1;i<=RV_N;i++) if(RV_K[i] in ST_) SEEN2[rv_dkey(i)]=1
    }
    for(i=1;i<=RV_N;i++){
      if(rv_doubt(i)=="") continue
      d=rv_dkey(i); if(d in SEEN2) continue
      SEEN2[d]=1; print RV_K[i]
    }
    return 0
  }
  for(i=1;i<=RV_N;i++) if(sec=="" || RV_S[i]==sec) print RV_K[i]
  return 0
}

# ---- the report ------------------------------------------------------
function rv_load(rfile,   line,f,n){
  while((getline line < rfile) > 0){
    n=split(line,f,"\t"); if(n<2) continue
    ST_[f[1]]=f[2]; NT_[f[1]] = (n>=3) ? f[3] : ""
  }
  close(rfile)
  return 0
}
#  What the program claims for one item, in one line, so an issue can be
#  acted on without anybody having to go and look it up.
function rv_claim(i,   s,a,idx){
  s=RV_S[i]; idx=RV_I[i]
  if(s=="enc"){ split(EC[idx],a,"|")
    return "\"" a[2] "\" -- program says " toupper(a[6]) " (" a[9] ")" }
  if(s=="mot"){ split(RV_M[i],a,"\t")
    return a[1] " -- program says: " a[2] }
  if(s=="lig"){ split(VT[idx],a,"|")
    return a[2] " (" a[3] ") -- " a[5] }
  if(s=="les"){ Q_A=""; les_q("L" idx,0)
    return "Lesson L" idx " -- program says " toupper(Q_A) }
  if(s=="snd"){ split(SD[idx],a,"|")
    return a[2] " = " a[3] " (" a[4] ")" }
  if(s=="shp"){ split(SH[idx],a,"|")
    return a[2] " (" a[3] ") -- " a[4] }
  return RV_T[i]
}
function rv_report(rfile,   i,nf,nn,nok,body,lastsec){
  rv_build(); rv_load(rfile)
  nf=0; nn=0; nok=0
  for(i=1;i<=RV_N;i++){
    if(!(RV_K[i] in ST_)) continue
    if(ST_[RV_K[i]]=="flag") nf++
    else { nok++; if(NT_[RV_K[i]]!="") nn++ }
  }
  print "### colregs review"
  print ""
  printf "colregs %s. %d of %d claims looked at: %d flagged as wrong or misleading, %d marked correct.\n",
     rvver, nf+nok, RV_N, nf, nok
  if(rvwho!="") printf "\nReviewer: %s\n", rvwho
  if(rvdrill!="") printf "\nDrill record: %s\n", rvdrill
  if(rvcredit=="yes" && rvwho!="") print "\nHappy to be credited."
  else if(rvcredit=="no") print "\nPlease do not credit me."
  if(nf>0){
    print ""
    print "### Flagged"
    print ""
    for(i=1;i<=RV_N;i++){
      if(!(RV_K[i] in ST_) || ST_[RV_K[i]]!="flag") continue
      printf "- **%s** %s  \n", RV_K[i], rv_claim(i)
      if(NT_[RV_K[i]]!="") printf "  > %s\n", NT_[RV_K[i]]
      else print "  > (no note given)"
    }
  }
  if(nn>0){
    print ""
    print "### Notes on claims marked correct"
    print ""
    for(i=1;i<=RV_N;i++){
      if(!(RV_K[i] in ST_) || ST_[RV_K[i]]=="flag" || NT_[RV_K[i]]=="") continue
      printf "- **%s** %s  \n", RV_K[i], rv_claim(i)
      printf "  > %s\n", NT_[RV_K[i]]
    }
  }
  if(nf==0 && nn==0){
    print ""
    printf "Nothing flagged. %d claims checked and found correct.\n", nok
  }
  print ""
  print "---"
  print "Sent from `colregs review`. The tool never touched the network -"
  print "this issue was opened by hand from a link it printed."
  return 0
}
# ---- percent-encoding, for the issue link ---------------------------
function rv_hexinit(   i){
  if(HEXR) return
  for(i=0;i<256;i++) ORD_[sprintf("%c",i)]=i
  HEXR=1
}
function rv_enc(s,   i,c,o,n){
  rv_hexinit()
  o=""
  for(i=1;i<=length(s);i++){
    c=substr(s,i,1)
    if(c ~ /[A-Za-z0-9._~-]/) o=o c
    else { n=ORD_[c]; if(n=="") n=63; o=o sprintf("%%%02X", n) }
  }
  return o
}
function rv_url(rfile,   line,body,t,i,nf){
  rv_build(); rv_load(rfile)
  nf=0
  for(i=1;i<=RV_N;i++) if((RV_K[i] in ST_) && ST_[RV_K[i]]=="flag") nf++
  body=""
  while((getline line < rbody) > 0) body = body line "\n"
  close(rbody)
  t = sprintf("colregs review: %d flagged", nf)
  #  No labels= parameter. A label that does not exist in the repository
  #  is one more thing that has to have been set up correctly before a
  #  stranger's careful review will go anywhere, and the title already
  #  says what this is. Maintainers can label it themselves.
  printf "https://github.com/%s/bashnav/issues/new?title=%s&body=%s\n",
     (rvrepo!=""?rvrepo:"navigationtools"), rv_enc(t), rv_enc(body)
  return 0
}
