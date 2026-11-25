# =====================================================================
#  weather -- the character grid, for the one figure this tool draws.
#
#  WHY THIS IS A FOURTH COPY, and what the alternative is.
#
#  celnav, colregs and tides each carry their own grid. The SETTERS are
#  the same in all three; `gshow` is not, and that is the point: celnav's
#  carries the FIGDUMP path the web generator needs, colregs' paints its
#  own panel so the artwork is legible whatever the terminal profile is,
#  and tides' calls col_init() itself. Extracting the lot would mean
#  rewriting `gshow` in three working tools to serve a figure in a fourth,
#  which is a large blast radius for a small gain.
#
#  So this is celnav's grid, FIGDUMP path included, copied rather than
#  shared. The honest version of that trade: if a fifth tool ever needs
#  one, extract the setters into src/common/ and leave each tool its own
#  `gshow` - the setters are nine lines and genuinely identical, and the
#  divergence is all in the painting.
#
#  Drawing conventions, so this reads the same as the other three:
#    row 0 is the TOP, column 0 is the left
#    gput overwrites, gputw writes only into blank space
#    the c-suffixed forms take a colour; the others inherit the panel's
# =====================================================================
#  THE PANEL COLOURS ARE DEFINED HERE, not in src/common/colour.awk.
#  That file is shared with another tool and gives C_BASE and C_RST; it
#  has no panel concept. celnav's own col_init() adds C_PANEL and C_EOL,
#  and gshow() below needs them -- copied without this, every name would
#  be the empty string and the figure would print with no panel at all.
#  On a light terminal profile that is white artwork on white, which is
#  the exact failure docs/HACKING.md records for the colregs lights.
function gcol_init(   e){
  if(GCOL_READY) return
  col_init()
  e=sprintf("%c",27)
  if(cmode=="night"){ C_PANEL = e "[40m" e "[31m"; C_EOL = e "[K" C_BASE }
  else if(cmode=="day"){ C_PANEL = e "[40m" e "[37m"; C_EOL = e "[K" C_BASE }
  else { C_PANEL=""; C_EOL="" }
  GCOL_READY=1
  return 0
}
function gclear(w,h,   r,c){ gcol_init(); PW=w; PH=h; FIGNAME=""
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
#  The plot is painted as its own panel, so it is legible whatever the
#  terminal's own background happens to be.
function gshow(   r,c,line,cur,last,cc){
  #  THE WEB GENERATOR WANTS A GAP, NOT A PICTURE OF A TERMINAL. These
  #  figures are drawn on a character grid -- the globe with its
  #  graticule and circles of position, the celestial triangle, the LOP
  #  zoom -- and 25 rows of 67 characters is a picture of a terminal,
  #  not a figure, in a browser 380px wide. Under -v FIGDUMP=1 the grid
  #  is replaced by a marker the dumper turns into a named gap, and the
  #  prose around it still prints. Set by the generator alone; the tool
  #  never sets it. Same move as ct_plot() in colregs.
  #
  #  The grid is still cleared, so a figure built and skipped cannot
  #  leave its marks inside the next one.
  #  THE MARKER CARRIES THE FIGURE'S NAME, not just the word "grid". With
  #  one figure in the tool the name was a constant and nobody noticed;
  #  with two, the browser has to know WHICH demonstration a gap stands
  #  for, and the shell is the only thing that knows. Each figure function
  #  sets FIGNAME at its head, gclear() resets it, and the default stays
  #  "grid" so the other three tools' figures are unaffected if this file
  #  is ever the one that gets extracted.
  if(FIGDUMP){ print "@@FIG " (FIGNAME=="" ? "grid" : FIGNAME) " " PW " " PH
               gclear(PW,PH); return 0 }
  for(r=0;r<PH;r++){
    last=-1
    for(c=0;c<PW;c++) if(G[r,c]!=" ") last=c
    line=""; cur=""
    for(c=0;c<=last;c++){
      cc=GC[r,c]
      if(cc!=cur){ line = line (cc==""? C_PANEL : cc); cur=cc }
      line = line G[r,c]
    }
    print "  " C_PANEL line C_EOL
  }
  return 0
}

# ---------------------------------------------------------------------
#  THE TWO SHELLS, DRAWN.  Coriolis's demonstration, as a picture.
#
#  WHY THIS FRAME AND NOT THE OTHER ONE.  The lesson tells the story in
#  the inertial frame, where nothing curves and nothing pushes, and that
#  is the honest account.  It does not DRAW: at true proportions a
#  shell's path in that frame is a straight radial line and the ground
#  turns under it by an invisible amount -- which is exactly why the real
#  deflection is a couple of hundred metres and not ninety miles.  Drawn
#  at a scale
#  where the rotation shows, the "straight line" wraps most of the way
#  round the pole and stops looking like gunnery at all.
#
#  So this is the GUNNER'S frame, which is what a range table's diagram
#  shows: the line of fire, the track, and where the shell actually
#  lands.  Two panels side by side, because the point of the figure is
#  the punchline -- fired north it lands east, fired south it lands west,
#  and both of those are to the RIGHT of the line of fire.  One panel
#  cannot show that; two show it without a word.
#
#  WHAT IS COMPUTED AND WHAT IS SCALED.  The cross-track deflection goes
#  as the SQUARE of the time of flight -- the rotating frame's
#  acceleration 2*Omega x v is constant along the track, so the offset is
#  a parabola -- and the curve drawn here is that parabola, computed, not
#  a hand-drawn arc.  Its SIZE is scaled to the width of the panel and
#  the caption says so, with the real figure beside it.  A figure that
#  silently exaggerated would be teaching the wrong magnitude, which in
#  gunnery is the whole game.
# ---------------------------------------------------------------------
function gun_track(x0,ytop,ybot,dirn,sign,   i,n,t,dx,row,col){
  #  dirn  -1 fires up the page (north), +1 fires down it (south)
  #  sign  +1 deflects to page-right, -1 to page-left
  n = ybot - ytop
  for(i=0;i<=n;i++){
    t   = i/n                       # fraction of the flight
    dx  = sign * GUN_DEF * t * t    # the parabola: offset goes as t^2
    row = (dirn<0 ? ybot - i : ytop + i)
    col = x0 + dx
    gputc(row, col, (i==n ? "*" : "."), (i==n ? C_ACC : C_DIM))
  }
  return 0
}
function gun_panel(x0,ylo,yhi,dirn,sign,fired,   r,yimp,c){
  #  the line of fire: straight, the way the gun was laid
  for(r=ylo;r<=yhi;r++) gputw(r, x0, "|")
  yimp = (dirn<0 ? ylo : yhi)          # the row the shell arrives on
  gun_track(x0, ylo, yhi, dirn, sign)
  #  THE GAP IS THE WHOLE POINT, so it is drawn and not left to be
  #  inferred from two marks at different columns: this is the quantity a
  #  range table carries a column for.
  for(c=1;c<GUN_DEF;c++) gputwc(yimp, x0 + sign*c, "-", C_DIM)
  gputc(yimp, x0, "+", C_DIM)                    # aim: a still earth
  gputc(yimp, x0 + sign*GUN_DEF, "*", C_ACC)     # fall: the real one
  gputsc(yimp + (dirn<0 ? -1 : 1), x0-1, "aim", C_DIM)
  #  the gun at the breech end, and which way it was laid
  gputsc((dirn<0 ? yhi+1 : ylo-1), x0-1, "GUN", C_DIM)
  gputsc((dirn<0 ? ylo-2 : yhi+2), x0-int(length(fired)/2), fired, C_ACC)
  return 0
}
function gun_figure(   w,h,xl,xr,ylo,yhi){
  #  THIRTY-FOUR COLUMNS, NOT SIXTY-NINE. Drawn two panels wide at a
  #  comfortable 69 it was legible on a laptop and useless on the device
  #  this tool is for: at 390 px the whole FIRED SOUTH panel sat off the
  #  right-hand edge, so the one thing the figure exists to show -- east
  #  one way, west the other, both to the right -- was the part you could
  #  not see. A phone fits about 34 monospace columns, which is narrower
  #  than weather's own tables, so this now fits where they do not.
  w=34; h=21
  gclear(w,h)
  FIGNAME = "gun"
  GUN_DEF = 6                       # columns of deflection at impact
  xl = 8; xr = 25; ylo = 3; yhi = 15

  gun_panel(xl, ylo, yhi, -1, +1, "FIRED NORTH")
  gun_panel(xr, ylo, yhi, +1, -1, "FIRED SOUTH")

  #  where each one falls, named OUTBOARD of the fall and on the row it
  #  falls on - away from the aim, so the word lands in empty space
  #  instead of across the line of fire.
  gputsc(ylo, xl + GUN_DEF + 2, "EAST", C_ACC)
  gputsc(yhi, xr - GUN_DEF - 6, "WEST", C_ACC)

  #  and the sentence the picture exists to make obvious, wrapped to fit.
  #  The latitude is named HERE rather than in the lesson's heading,
  #  because the browser's version of this demonstration has a slider and
  #  a heading naming one latitude would be false there the moment it moved.
  gputsc(yhi+3, 0, "both are to the RIGHT of", C_ACC)
  gputsc(yhi+4, 0, "the line of fire", C_ACC)
  gputsc(yhi+5, 0, "drawn from 45 N", C_DIM)
  return 0
}

# =====================================================================
#  THE SURFACE WIND ROUND A LOW, and the arithmetic under it.
#
#  Larry asked for this demonstration and asked me to check the science
#  first, which was the right instinct: the version he described had the
#  wind crossing the isobars LESS as the pressure gradient rose, with
#  centrifugal force as the cause. That is not what happens, and the
#  reason is worth stating where the code is, because the wrong version
#  is the intuitive one.
#
#  1. IN A FRICTIONLESS BALANCE THE WIND ALREADY FOLLOWS THE ISOBARS
#     EXACTLY, at every gradient and every latitude -- geostrophic,
#     gradient and cyclostrophic balance alike. So "follows them more
#     closely" cannot be a centrifugal effect. There is nothing for it
#     to improve on.
#
#  2. FRICTION is what turns the wind across the isobars. Slowed air
#     feels less Coriolis, so pressure wins a little and the flow spirals
#     in. With a linear drag k the steady balance solves exactly:
#
#            tan(alpha) = k / f        |V| / Vg = cos(alpha)
#
#     and the pressure gradient CANCELS OUT of the angle. A deeper low
#     gives more wind at the same angle, not a smaller angle.
#
#  3. WITH REALISTIC QUADRATIC DRAG IT GOES THE OTHER WAY. Friction over
#     water goes as V squared, so the angle GROWS with the gradient. The
#     strongest lows on earth have the largest inflow angles -- a
#     hurricane's boundary layer runs 20-30 degrees of inflow -- which is
#     the clearest refutation available.
#
#  4. LATITUDE IS THE REAL DIAL, through f = 2*Omega*sin(lat). Same drag,
#     50 degrees of inflow at 10 N and 12 at 75 N.
#
#  5. CENTRIFUGAL IS REAL AND CHANGES THE SPEED, NOT THE ANGLE. Round a
#     low it points outward, adding to Coriolis against the pressure
#     gradient, so the gradient wind is SUBgeostrophic; round a high it
#     subtracts and the wind is supergeostrophic. The high has a hard
#     limit where no solution exists at all, which is why tight intense
#     highs do not occur and tight intense lows do.
#
#  This lives here beside the figure that draws it rather than in wx.awk,
#  because nothing in the tool's own reasoning uses it. If `weather what`
#  ever reasons from a gradient, it moves to wx.awk.
# =====================================================================
function wx_pi(){ return 3.14159265358979 }
function wx_rad(d){ return d * wx_pi() / 180 }
function wx_tan(a){ return sin(a)/cos(a) }
function wx_cor(lat){ return 2 * 7.292115e-5 * sin(wx_rad(lat)) }

#  The drag is pinned by what is actually observed -- the inflow angle at
#  45 degrees over a given surface -- and the model carries it to other
#  latitudes. That is the honest direction: the angle is the measurement
#  and k is the fitted constant, not the other way round.
function wx_drag(a45){ return wx_cor(45) * wx_tan(wx_rad(a45)) }

#  the inflow angle at this latitude for that surface, in degrees
function wx_alpha(lat, a45,   f){
  f = wx_cor(lat); if(f < 0) f = -f
  if(f <= 0) return 90
  return atan2(wx_drag(a45), f) * 180 / wx_pi()
}

#  pressure gradient force per unit mass, from millibars per 100 km
function wx_pgf(mb100){ return (mb100 * 100.0 / 1.0e5) / 1.225 }

#  The gradient wind: pressure against Coriolis AND curvature.
#    low   G = f*V + V^2/R      ->  subgeostrophic
#    high  G = f*V - V^2/R      ->  supergeostrophic, and limited
#  Returns -1 for a high too tight and too steep to exist, which is a
#  real answer and not an error: f^2*R < 4*G has no root.
function wx_vgrad(mb100, lat, rkm, isLow,   f,g,r,disc){
  f = wx_cor(lat); if(f < 0) f = -f
  g = wx_pgf(mb100); r = rkm * 1000.0
  if(f <= 0 || g <= 0) return 0
  if(isLow) return r/2 * (-f + sqrt(f*f + 4*g/r))
  disc = f*f - 4*g/r
  if(disc < 0) return -1
  return r/2 * (f - sqrt(disc))
}

#  The wind crossing an isobar, in characters.  Thirty-four columns, like
#  the gun, so it fits the device the tool is for.
#
#  WHY THIS IS NOT THE CIRCLE THE BROWSER DRAWS, and it was built as the
#  circle first. Eight arrows round an isobar need eight unambiguous
#  arrowheads, and a character cell has four: > < ^ v. The diagonals have
#  to be "/" and "\\", which carry an AXIS and not a direction - so on the
#  flanks of the circle, where the wind blows up-and-inward, the arrow
#  reads equally well as down-and-outward, and the figure says the
#  opposite of what it means to half its readers. Drawn and looked at
#  before it was thrown away.
#
#  So the terminal gets the one claim the figure exists to make, drawn so
#  it cannot be misread: ONE isobar, the gradient wind along it, and the
#  surface wind crossing it toward the low at the computed angle. The
#  browser, which has real arrowheads at any angle, draws the circle with
#  its eight.
#
#  The cell aspect is deliberately IGNORED here. Cells are about twice as
#  tall as wide, so halving the vertical component the way wind_glyph()
#  does would draw a true 15 degrees as about 8 on screen - correct
#  geometry, and useless as a picture of an angle. The angle is drawn as
#  it reads and printed as it is.
function wind_figure(lat, a45, isLow,   w,h,i,al,a,yiso,x0,up,bs,r,xe,ye,lo,hi){
  #  WHICH SIDE THE LOW IS ON.  In the northern hemisphere the wind blows
  #  with the low on its LEFT (Buys Ballot), so with the gradient wind
  #  running to the right the low is ABOVE the isobar and friction turns
  #  the surface wind UP toward it.  In the southern hemisphere the low is
  #  below and the turn is down.  (Until 16 November 2026 this drew the
  #  southern picture at 45 N, the low below a wind running east: found
  #  while drawing the friction figure beside it.)
  w=34; h=16
  gclear(w,h)
  FIGNAME = "wind"
  a = wx_alpha(lat, a45)
  al = wx_rad(a)
  up = (lat >= 0)
  bs = sprintf("%c", 92)              # a backslash, without the escaping
  x0 = 3
  if(up){ yiso = 9; lo = 1; hi = yiso }   # the surface wind rises toward the low
  else  { yiso = 4; lo = yiso; hi = h - 4 }

  #  the gradient wind, along the isobar, drawn on the HIGH side of it
  if(up){
    for(i=x0;i<=x0+13;i++) gputc(yiso+2, i, "-", C_DIM)
    gputc(yiso+2, x0+14, ">", C_DIM)
    gputsc(yiso+2, x0+17, "HIGH side", C_DIM)
    gputsc(yiso+3, x0, "gradient wind", C_DIM)
    gputsc(0, w-9, "LOW side", C_DIM)
  } else {
    gputsc(yiso-3, x0, "gradient wind", C_DIM)
    for(i=x0;i<=x0+13;i++) gputc(yiso-2, i, "-", C_DIM)
    gputc(yiso-2, x0+14, ">", C_DIM)
    gputsc(yiso-2, x0+17, "HIGH side", C_DIM)
  }

  #  the isobar itself
  for(i=1;i<w-1;i++) gputc(yiso, i, ".", C_DIM)

  #  the surface wind, the same flow turned toward the low by alpha.
  #  It stops at the panel edge rather than running off it: at 10 degrees
  #  of latitude alpha is nearly 50 and the line would leave the figure.
  xe = x0; ye = yiso
  for(i=0;i<=18;i++){
    r = yiso + (up ? -1 : 1) * i * wx_tan(al)
    if(r < lo || r > hi) break
    gputc(r, x0 + i, (up ? "/" : bs), C_ACC)
    xe = x0 + i; ye = r
  }
  gputc(ye + (up ? -1 : 1), xe + 1, (up ? "^" : "v"), C_ACC)
  #  the label goes beside the head, pulled back inside the panel when the
  #  head has run far enough right that it would be clipped - at 15
  #  degrees the line reaches column 21 and "surface wind" lost its last
  #  two characters off the edge.
  i = xe + 3; if(i + 7 > w - 1) i = w - 1 - 7
  gputsc(ye + (up ? -1 : 1), i, "surface", C_ACC)
  gputsc(h-2, x0, sprintf("crosses the isobar at %d deg", int(a + 0.5)), C_ACC)
  gputsc(h-1, x0, (isLow ? "toward the LOW" : "away from the HIGH"), C_DIM)
  return 0
}

#  FRICTION, OVER THE SEA AND OVER LAND (W01; Larry, AJZ, 16 November 2026).
#  Two panels side by side, each the northern-hemisphere picture of the
#  wind figure above: the wind aloft along the isobar, and the surface
#  wind turned toward the low.  Over the sea it is backed 10-20 degrees
#  and about 2/3 of the speed aloft; over land backed 30-40 degrees, and
#  slowed by however rough the ground is, which the public sources put
#  anywhere from 1/3 to 2/3 (RMetS MetLink 1/3, a sea-kayak text 1/2, US
#  Navy aerographer training 2/3).  Larry, from his classes: towns,
#  cities and forests slow it most, open ground least.  So the land arrow
#  is solid to 1/3 and dotted on to 2/3: a band, not one figure.
#  The angle is drawn at the middle of its range, as it reads; the cell
#  aspect is ignored, as in the wind figure, and for the same reason.
function friction_panel(x0, title, ang, f1, f2,   L,i,n1,n2,al,r,c,xe,ye,yiso,bs){
  yiso = 10; L = 22
  al = wx_rad(ang)
  gputsc(0, x0, title, C_ACC)
  gputsc(1, x0 + 20, "LOW side", C_DIM)
  for(i=x0-1;i<=x0+L+5;i++) gputc(yiso, i, ".", C_DIM)
  for(i=x0;i<x0+L;i++) gputc(yiso+2, i, "-", C_DIM)
  gputc(yiso+2, x0+L, ">", C_DIM)
  gputsc(yiso+3, x0, "the wind aloft", C_DIM)
  n1 = L * f1; n2 = L * f2
  xe = x0; ye = yiso
  for(i=1;i<=n2;i++){
    c = x0 + i * cos(al); r = yiso - i * sin(al)
    gputc(r, c, (i <= n1 ? "/" : ":"), C_ACC)
    xe = c; ye = r
  }
  gputc(ye - 1, xe + 1, "^", C_ACC)
  return 0
}
function friction_figure(   w,h){
  w=66; h=18
  gclear(w,h)
  FIGNAME = "friction"
  friction_panel(2,  "OVER THE SEA", 15, 2/3, 2/3)
  friction_panel(35, "OVER LAND",    35, 1/3, 2/3)
  gputsc(15, 2,  "backed 10-20 deg", C_ACC)
  gputsc(16, 2,  "about 2/3 of the speed aloft", C_ACC)
  gputsc(15, 35, "backed 30-40 deg", C_ACC)
  gputsc(16, 35, "1/3 to 2/3 of the speed aloft", C_ACC)
  gputsc(17, 35, "1/3 towns, forests; 2/3 open", C_DIM)
  return 0
}

#  THE FORCES BEHIND THE TURN (weather 1.0.2; Larry, AKF, 16 November 2026).
#  Near the surface three forces balance: the pressure gradient, pushing
#  toward the low and fixed by the isobars; Coriolis, at right angles to
#  the wind and to its right in the north; and friction, straight against
#  the wind.  Drawn head to tail they close into a triangle.  Coriolis and
#  friction always meet at a right angle, so that corner sits on the
#  circle whose diameter is the pressure arrow (Thales), and the friction
#  side lies along the wind itself.  With a drag of k against Coriolis f:
#  tan(alpha) = k/f, and the layer's wind is cos(alpha) of the gradient
#  wind - the same balance the coriolis lesson's wind panel is held to.
#  Sources: Penn State METEO 300 (friction and the force balance); US Navy
#  aerographer's mate training (tpub weather2 4-28).
#  The terminal draws two fixed cases, sea and land; the browser puts a
#  friction slider on one.  Cells are taken as twice as tall as wide.
function fline(r1,c1,r2,c2,col,   n,i,dr,dc,s,ch){
  dr = r2 - r1; dc = c2 - c1
  n = (dr < 0 ? -dr : dr); if((dc < 0 ? -dc : dc) > n) n = (dc < 0 ? -dc : dc)
  n = int(n + 0.5); if(n < 1) n = 1
  if(dc == 0) ch = "|"
  else {
    s = dr / dc
    if(s > -0.15 && s < 0.15) ch = "_"
    else if(s > 4 || s < -4) ch = "|"
    else if(s < 0) ch = "/"
    else ch = sprintf("%c", 92)
  }
  for(i=1;i<n;i++) gputc(r1 + dr*i/n, c1 + dc*i/n, ch, col)
}
function forces_panel(x0, title, ang,   D,al,r0,c0,rt,rc,cc){
  D = 10; al = wx_rad(ang)
  r0 = 12; c0 = x0 + 10            # O, the foot of the pressure arrow
  rt = r0 - D                      # T, its head, toward the low
  rc = r0 - D * sin(al) * sin(al)  # C, the right angle, on the circle
  cc = c0 + 2 * D * cos(al) * sin(al)
  gputsc(0, x0, title, C_ACC)
  gputsc(rt - 1, c0 - 3, "LOW side", C_DIM)
  fline(r0, c0, rt, c0, C_DIM);  gputc(rt, c0, "^", C_DIM)
  fline(rt, c0, rc, cc, C_ACC)
  fline(rc, cc, r0, c0, C_ACC);  gputc(r0, c0, "o", C_ACC)
  gputsc(int((r0+rt)/2), x0, "pressure", C_DIM)
  gputsc(int((rt+rc)/2), int((c0+cc)/2) + 3, "Coriolis", C_ACC)
  gputsc(r0 + 1, c0 - 2, "friction", C_ACC)
  gputsc(r0 + 2, x0, sprintf("turned %d deg toward the low", ang), C_ACC)
  return 0
}
function forces_figure(   w,h){
  w=66; h=17
  gclear(w,h)
  FIGNAME = "forces"
  forces_panel(2,  "SEA: little friction", 15)
  forces_panel(35, "LAND: more friction",  35)
  gputsc(15, 2, "friction lies along the wind, Coriolis across it", C_DIM)
  gputsc(16, 2, "more friction: a longer friction side, a shorter Coriolis side", C_DIM)
  return 0
}

#  BACKING AND VEERING (weather 1.0.2; Larry, AKI, 16 November 2026).
#  Two figures for the lesson `veer`, written as functions so any lesson
#  that benefits can show them again ("tell them as many times as you
#  need" - Larry).
#
#  veer_time_figure: the words over time.  Veering is clockwise round the
#  compass, backing anticlockwise; compass words, so the same either side
#  of the equator.
function veer_time_figure(   w,h){
  w=64; h=8
  gclear(w,h)
  FIGNAME = "veertime"
  gputsc(0, 2, "THE WIND SHIFTS, OVER TIME", C_ACC)
  gputsc(2, 4, "backs: anticlockwise", C_DIM)
  gputsc(2, 38, "veers: clockwise", C_ACC)
  gputsc(4, 2,  "S  <--  SW  <--", C_DIM)
  gputsc(4, 19, "W", C_ACC)
  gputsc(4, 23, "-->  NW  -->  N", C_ACC)
  gputsc(6, 2, "compass words: the same north and south of the equator", C_DIM)
  return 0
}
#  veer_hemi_figure: against the wind aloft.  The surface wind is turned
#  toward the low; the low is on the wind's left in the north (so the turn
#  is anticlockwise: backed) and on its right in the south (clockwise:
#  veered).  Drawn as two panels on the wind figure's conventions.
function veer_hemi_panel(x0, north,   yiso,ya,ye,L){
  L = 22
  if(north){
    gputsc(0, x0, "NORTH OF THE EQUATOR", C_ACC)
    gputsc(1, x0 + 20, "LOW side", C_DIM)
    yiso = 8; ya = 10; ye = 3
    gputsc(2, x0 + L - 8, "surface", C_ACC)
    gputsc(11, x0, "the wind aloft", C_DIM)
    gputsc(13, x0, "low on the left: BACKED", C_ACC)
  } else {
    gputsc(0, x0, "SOUTH OF THE EQUATOR", C_ACC)
    gputsc(2, x0, "the wind aloft", C_DIM)
    yiso = 5; ya = 3; ye = 10
    gputsc(11, x0 + L - 8, "surface", C_ACC)
    gputsc(12, x0 + 20, "LOW side", C_DIM)
    gputsc(13, x0, "low on the right: VEERED", C_ACC)
  }
  gline_iso(yiso, x0, x0 + 28)
  gline_aloft(ya, x0, x0 + L)
  fline(yiso, x0, ye, x0 + L, C_ACC)
  gputc(ye, x0 + L, (north ? "^" : "v"), C_ACC)
  return 0
}
function gline_iso(r, c1, c2,   i){ for(i=c1;i<=c2;i++) gputc(r, i, ".", C_DIM); return 0 }
function gline_aloft(r, c1, c2,   i){ for(i=c1;i<c2;i++) gputc(r, i, "-", C_DIM); gputc(r, c2, ">", C_DIM); return 0 }
function veer_hemi_figure(   w,h){
  w=66; h=16
  gclear(w,h)
  FIGNAME = "veerhemi"
  veer_hemi_panel(2, 1)
  veer_hemi_panel(35, 0)
  gputsc(15, 2, "the surface wind always turns toward the low", C_DIM)
  return 0
}

#  A LOW PASSING A BOAT, LOOKED DOWN ON (weather 1.0.9; Larry, AQN, the
#  first part of card I19).  North at the top.  The low is drawn at three
#  times, 1 then 2 then 3, each with its wind round it (Larry, 18 November:
#  any figure that describes the wind in a low shows the low itself, with
#  its wind arrows).  Two boats stay where they are, one each side of the
#  track, and the words under each say what their wind does.
#
#  THE WORDS ARE WORKED, NOT WRITTEN.  Each boat's wind at each time comes
#  from the same model the browser draws: the bearing from the boat to the
#  low, turned 105 degrees (90 for the circulation and 15 in toward the
#  centre) - against the clock in the north, with it in the south.  The
#  geometry is the browser's too: the lows 130 units apart along the track,
#  the boats 94 off it.  So the two builds cannot say different things, and
#  a fault in the turn shows in the golden as a wrong compass point.
#
#  What it shows, in both hemispheres and both directions: looking the way
#  the low is going, a boat on its right has the wind veer, a boat on its
#  left has it back.
function pass_pt16(b,   P){
  split("N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW", P, " ")
  return P[int((b%360+360)%360/22.5 + 0.5)%16 + 1]
}
#  the wind's bearing (from) at a boat, the low dx east and dn north of it
function pass_from(dx, dn, north,   brg){
  brg = atan2(dx, dn) * 180 / 3.14159265358979
  return ((north ? brg - 105 : brg + 105) % 360 + 360) % 360
}
#  one boat's three winds and what they do, as PASS_W (the three points)
#  and PASS_T (VEERS or BACKS); side is +1 for the boat north of the track
function pass_boat(east, side, north,   i, f, f1, t){
  PASS_W = ""
  for(i = 1; i <= 3; i++){
    f = pass_from((i - 2) * 130 * (east ? 1 : -1), -side * 94, north)
    if(i == 1) f1 = f
    PASS_W = PASS_W (i > 1 ? ", " : "") pass_pt16(f)
  }
  t = f - f1; t = ((t + 540) % 360) - 180
  PASS_T = (t > 0 ? "VEERS" : "BACKS")
  return 0
}
#  one low on the track: L and its time, its wind at the four sides
function pass_low(r, c, n, north){
  gputsc(r, c, "L" n, C_ACC)
  gputc(r, c - 1, " ", ""); gputc(r, c + 2, " ", "")
  if(north){
    gputsc(r - 1, c, "<-", C_DIM); gputsc(r + 1, c, "->", C_DIM)
    gputc(r, c - 2, "v", C_DIM);   gputc(r, c + 3, "^", C_DIM)
  } else {
    gputsc(r - 1, c, "->", C_DIM); gputsc(r + 1, c, "<-", C_DIM)
    gputc(r, c - 2, "^", C_DIM);   gputc(r, c + 3, "v", C_DIM)
  }
  return 0
}
function pass_panel(x0, east, north,   i, c, tr){
  tr = 9
  gputsc(2, x0, (east ? "GOING EAST  -->" : "<--  GOING WEST"), C_ACC)
  for(i = 0; i <= 30; i++) gputc(tr, x0 + i, "-", C_DIM)
  if(east) gputc(tr, x0 + 30, ">", C_DIM); else gputc(tr, x0, "<", C_DIM)
  for(i = 1; i <= 3; i++){
    c = x0 + 13 + (i - 2) * 10 * (east ? 1 : -1)
    pass_low(tr, c, i, north)
  }
  #  the boat north of the track, then the boat south of it
  pass_boat(east, 1, north)
  gputsc(3, x0, "wind " PASS_W ": ", C_DIM)
  gputsc(3, x0 + length("wind " PASS_W ": "), PASS_T, C_ACC)
  gputsc(4, x0, "the low passes to its south", C_DIM)
  gputsc(5, x0 + 13, "o boat", C_ACC)
  pass_boat(east, -1, north)
  gputsc(13, x0 + 13, "o boat", C_ACC)
  gputsc(14, x0, "wind " PASS_W ": ", C_DIM)
  gputsc(14, x0 + length("wind " PASS_W ": "), PASS_T, C_ACC)
  gputsc(15, x0, "the low passes to its north", C_DIM)
  return 0
}
function pass_figure(north,   w,h){
  w=66; h=20
  gclear(w,h)
  FIGNAME = (north ? "passnorth" : "passsouth")
  gputsc(0, 2, (north ? "NORTH" : "SOUTH") " OF THE EQUATOR, LOOKING DOWN, NORTH AT THE TOP", C_ACC)
  pass_panel(2, 1, north)
  pass_panel(35, 0, north)
  gputsc(17, 2, "the boats stay put; the low moves 1, 2, 3", C_DIM)
  gputsc(18, 2, "looking the way the low goes: on its right the wind veers,", C_DIM)
  gputsc(19, 2, "on its left it backs - north and south of the equator alike", C_DIM)
  return 0
}

#  FRONTS, LOOKED DOWN ON (W20, weather 1.0.10; Larry, ATR, 18 November
#  2026).  The terminal's drawing of the model in wx.awk (fr_p): north at
#  the top, a column 25 nm and a row 50 nm, so the map is to scale on a
#  terminal's two-to-one characters.  The isobars are where the 4-hPa band
#  changes between neighbouring cells; the fronts are sampled every 10 nm
#  along their lines; the low has its own wind round it (Larry, 18
#  November: a figure that describes the wind in a low shows the low).
#  Boat A runs through it along the row south of the centre, boat B north,
#  and the two tables under the map are worked from the same model: the
#  wind by fr_from(), the glass by fr_band(), the barograph's own words.
function fr_c(x){ return int((x + 760) / 25 + 0.5) }
function fr_r(y){ return int((480 - y) / 50 + 0.5) }
function fr_line(L, n, ch, col,   i, k, m, x, y){
  for(i = 1; i < n; i++){
    m = int(sqrt((L[2*i+1]-L[2*i-1])^2 + (L[2*i+2]-L[2*i])^2) / 10)
    for(k = 0; k <= m; k++){
      x = L[2*i-1] + (L[2*i+1] - L[2*i-1]) * k / m
      y = L[2*i]   + (L[2*i+2] - L[2*i])   * k / m
      if(fr_r(y) >= 0 && fr_r(y) < 22) gputc(fr_r(y), fr_c(x), ch, col)
    }
  }
  return 0
}
function fronts_figure(   w, h, r, c, lv, lr, ld, i, rA, rB, s, f){
  fr_init()
  w = 66; h = 37
  gclear(w, h)
  FIGNAME = "fronts"
  for(r = 0; r < 22; r++) for(c = 0; c < w; c++) LV[r, c] = int((fr_p(-760 + 25*c, 480 - 50*r) - 988) / 4)
  #  a cell is on an isobar when a neighbour (right, left, above or below)
  #  is in a LOWER band: one cell wide, on the high side of the line
  for(r = 0; r < 22; r++) for(c = 0; c < w; c++)
    if((c + 1 < w && LV[r, c] > LV[r, c+1]) || (c > 0 && LV[r, c] > LV[r, c-1]) ||
       (r + 1 < 22 && LV[r, c] > LV[r+1, c]) || (r > 0 && LV[r, c] > LV[r-1, c])) gputc(r, c, ".", C_DIM)
  fr_line(FRW, FRWN, "o", C_WARN)
  fr_line(FRC, FRCN, "#", C_ACC)
  #  the low, with its wind round it: anticlockwise in the north
  r = fr_r(0); c = fr_c(0)
  gputsc(r, c - 1, " L ", C_WARN)
  gputsc(r - 1, c - 1, "<-", C_DIM); gputsc(r + 1, c, "->", C_DIM)
  gputc(r, c - 2, "v", C_DIM); gputc(r, c + 2, "^", C_DIM)
  gputsc(0, 44, "the low moves east -->", C_WARN)
  #  the boats' runs through it, right to left
  rA = fr_r(FRA_Y); rB = fr_r(FRB_Y)
  for(c = 7; c < w; c++){ gputc(rA, c, "-", C_DIM); gputc(rB, c, "-", C_DIM) }
  gputc(rA, 7, "<", C_DIM); gputc(rB, 7, "<", C_DIM)
  gputsc(rA, 0, "boat A", C_ACC); gputsc(rB, 0, "boat B", C_ACC)
  for(i = 1; i <= FRA_N; i++) gputc(rA, fr_c(FRAX[i]), i, C_ACC)
  split("a b c", s, " ")
  for(i = 1; i <= FRB_N; i++) gputc(rB, fr_c(FRBX[i]), s[i], C_ACC)
  #  what each boat meets, in order
  gputsc(23, 0, "boat A, south of the track: the fronts pass over her", C_ACC)
  gputsc(24, 0, "     where                      wind glass        air", C_DIM)
  for(i = 1; i <= FRA_N; i++){
    f = fr_from(FRAX[i], FRA_Y)
    gputsc(24 + i, 0, sprintf("  %d  %-26s %-4s %-12s %s", i, FRAS[i], fr_pt16(f), fr_band(FRAX[i], FRA_Y), FRAT[i]), "")
  }
  gputsc(31, 0, "boat B, north of the track: no front passes over her", C_ACC)
  for(i = 1; i <= FRB_N; i++){
    f = fr_from(FRBX[i], FRB_Y)
    gputsc(31 + i, 0, sprintf("  %s  %-26s %-4s %s", s[i], FRBS[i], fr_pt16(f), fr_band(FRBX[i], FRB_Y)), "")
  }
  gputsc(35, 0, "o o warm front   # # cold front   . . isobars every 4 hPa", C_DIM)
  gputsc(36, 0, "the low moving east at 30 knots; each boat stays put", C_DIM)
  return 0
}

# =====================================================================
#  THE ROUTING LESSON'S FIGURES (weather 1.0.21; W35; Larry, TAYO: "many,
#  spaced through the lesson at each key point").  Seven, one for each
#  point the lesson makes, all drawn from the made-up boat of rt_init()
#  in wx.awk, so the terminal's figure and the browser's say the same
#  numbers.  Cells are taken as twice as tall as wide.
#
#    rtfan      how a router works: the isochrones at 1, 2 and 3 hours
#    rthorizon  how often a forecast is right, by days ahead
#    rtlane     forward plus reverse isochrones: what a place costs
#    rtmotor    the motorboat beside the sailing boat: the extra miles
#    rtallin    three ways up a beat, in three winds: the router's risk
#    rtscale    the GRIB's wind and the stream, scaled before routing
#    rtwhatif   one race routed in three winds: what held, what moved
# =====================================================================
function rt_fan_figure(   w, h, k, i, j, n, m, x, y, c, r0, c0, fx, fy){
  rt_init()
  w = 66; h = 21; r0 = 8; c0 = 27
  gclear(w, h)
  FIGNAME = "rtfan"
  gputsc(0, 0, "the wind, the same everywhere:  v  v  v  v", C_DIM)
  for(k = 3; k >= 1; k--)
    for(i = 1; i <= RT_N; i++){
      j = (i % RT_N) + 1
      m = 40
      for(n = 0; n < m; n++){
        x = k * (RT_X[i] + (RT_X[j] - RT_X[i]) * n / m)
        y = k * (RT_Y[i] + (RT_Y[j] - RT_Y[i]) * n / m)
        gputwc(r0 - y / 2, c0 + x, k, (k == 3 ? C_ACC : C_DIM))
      }
    }
  #  the finish, 22.5 miles off on 075, and the route back from it
  fx = 22.5 * sin(wx_rad(75)); fy = 22.5 * cos(wx_rad(75))
  for(c = 1; c < fx; c++) gputc(r0 - (fy * c / fx) / 2, c0 + c, "-", C_ACC)
  gputc(r0, c0, "S", C_ACC); gputc(r0 - fy / 2, c0 + fx, "F", C_ACC)
  gputsc(h - 3, 0, "1 2 3  everywhere she could be after 1, 2 and 3 hours", C_ACC)
  gputsc(h - 2, 0, "S to F is 22.5 miles on 075. F is on the 3: " rt_hm(rt_g(fx, fy, 0)), "")
  gputsc(h - 1, 0, "flat across the top: she cannot point there, so she tacks", C_DIM)
  return 0
}
function rt_horizon_figure(   w, h, i, n, k, s){
  rt_init()
  w = 66; h = 8
  gclear(w, h)
  FIGNAME = "rthorizon"
  gputsc(0, 0, "days ahead    how often the forecast is right", C_DIM)
  for(i = 1; i <= RT_HZN; i++){
    gputsc(1 + i, 0, sprintf("%2d to %-2d", RT_HZ[3*i-2], RT_HZ[3*i-1]), "")
    n = int(RT_HZ[3*i] / 5 + 0.5); s = ""
    for(k = 0; k < n; k++) s = s "#"
    gputsc(1 + i, 14, s, (i == 1 ? C_ACC : C_DIM))
    gputsc(1 + i, 36, sprintf("about %d in 100", RT_HZ[3*i]), (i == 1 ? C_ACC : ""))
  }
  gputsc(6, 0, "NOAA's figures. Route on five days; past that it is a sketch.", C_DIM)
  return 0
}
function rt_lane_cell(r, c, x, y, fx, fy,   q){
  q = rt_cost(x, y, fx, fy) * 60
  if(q <= RT_LANE) gputc(r, c, "#", C_ACC)
  else if(q <= 30) gputc(r, c, ".", C_DIM)
  return 0
}
function rt_lane_figure(   w, h, r, c){
  rt_init()
  w = 66; h = 17
  gclear(w, h)
  FIGNAME = "rtlane"
  gputsc(0, 0, "REACHING, 24 miles", C_ACC)
  gputsc(0, 36, "BEATING, 12 miles upwind", C_ACC)
  #  the reach: S at row 6, column 3, a mile to a column
  for(r = 2; r <= 10; r++) for(c = 0; c <= 31; c++) rt_lane_cell(r, c, c - 3, 2 * (6 - r), RT_REACH, 0)
  gputc(6, 3, "S", ""); gputc(6, 27, "F", "")
  #  the beat: S at row 11, column 50, F six rows above it
  for(r = 3; r <= 13; r++) for(c = 36; c <= 64; c++) rt_lane_cell(r, c, c - 50, 2 * (11 - r), 0, RT_BEAT)
  gputc(11, 50, "S", ""); gputc(5, 50, "F", "")
  gputsc(12, 0, sprintf("the lane is %.1f miles wide", rt_width(RT_REACH, 0, RT_LANE)), "")
  gputsc(14, 36, sprintf("the lane is %.1f miles wide", rt_width(0, RT_BEAT, RT_LANE)), "")
  gputsc(15, 0, sprintf("#  under %d minutes lost by passing through here", RT_LANE), C_ACC)
  gputsc(16, 0, ".  under 30 minutes lost       the wind is from the top", C_DIM)
  return 0
}
function rt_motor_figure(   w, h, t, sail){
  rt_init()
  w = 66; h = 14
  gclear(w, h)
  FIGNAME = "rtmotor"
  t = rt_g(0, RT_BEAT, 0); sail = t * RT_S[1]
  #  half a mile to a column, a mile to a row: S at the foot, F 12 up
  fline(12, 8, 6, 20, C_ACC); fline(6, 20, 0, 8, C_ACC)
  fline(12, 8, 0, 8, C_DIM)
  gputc(12, 8, "S", ""); gputc(0, 8, "F", ""); gputc(6, 20, "+", C_ACC)
  gputsc(13, 0, "the wind is from the top", C_DIM)
  gputsc(1, 26, "SAILING: two boards, tacking at +", C_ACC)
  gputsc(2, 26, sprintf("  %.1f miles through the water", sail), "")
  gputsc(3, 26, sprintf("  at %.1f knots", RT_S[1]), "")
  gputsc(5, 26, "MOTORBOAT: straight up the middle", C_ACC)
  gputsc(6, 26, sprintf("  %.1f miles at %.1f knots", RT_BEAT, RT_BEAT / t), "")
  gputsc(8, 26, "both take " rt_hm(t), "")
  gputsc(10, 26, sprintf("the wind's price: %.1f extra miles", sail - RT_BEAT), C_ACC)
  return 0
}
function rt_min(t){ return int(t * 60 + 0.5) }
function rt_allin_figure(   w, h, i, a, nm, s){
  rt_init()
  w = 66; h = 14
  gclear(w, h)
  FIGNAME = "rtallin"
  #  the first hour of each: half a mile to a column, a mile to a row
  fline(12, 11, 8, 2, C_DIM); fline(12, 11, 8, 11, ""); fline(12, 11, 8, 20, C_ACC)
  gputc(12, 11, "S", ""); gputc(0, 11, "F", "")
  gputc(8, 2, "L", C_DIM); gputc(8, 11, "M", ""); gputc(8, 20, "R", C_ACC)
  gputsc(13, 0, "the first hour of each", C_DIM)
  gputsc(0, 26, "the wind, an hour in:", C_DIM)
  gputsc(1, 26, sprintf("           veers %d   holds   backs %d", RT_SHIFT, RT_SHIFT), C_DIM)
  split("right middle left", nm, " ")
  for(i = 1; i <= 3; i++){
    a = (3 - i) / 2
    s = sprintf("%s %-7s   %s    %s    %s", substr("RML", i, 1), nm[i],
                rt_hm(rt_allin(a, RT_SHIFT)), rt_hm(rt_allin(a, 0)), rt_hm(rt_allin(a, -RT_SHIFT)))
    gputsc(2 + i, 26, s, (i == 1 ? C_ACC : ""))
  }
  gputsc(7, 26, sprintf("The forecast says it veers %d. The", RT_SHIFT), "")
  gputsc(8, 26, "router goes right, all the way:", "")
  gputsc(9, 26, sprintf("%d minutes up on the middle if it", rt_min(rt_allin(0.5, RT_SHIFT)) - rt_min(rt_allin(1, RT_SHIFT))), C_ACC)
  gputsc(10, 26, sprintf("veers, %d down if it backs instead.", rt_min(rt_allin(1, -RT_SHIFT)) - rt_min(rt_allin(0.5, -RT_SHIFT))), C_WARN)
  return 0
}
function rt_scale_figure(   w, h, i, n, k, s, nm){
  rt_init()
  w = 66; h = 9
  gclear(w, h)
  FIGNAME = "rtscale"
  gputsc(0, 0, "The GRIB says 20 knots. Route on:", "")
  for(i = 1; i <= RT_SCN; i++){
    nm = RT_SC[2*i-1]; sub(/-/, " ", nm)
    if(i == 2) nm = RT_SC[2*i-1]
    n = int(20 * RT_SC[2*i] + 0.5); s = ""
    for(k = 0; k < n; k++) s = s (k < 20 ? "=" : "#")
    gputsc(1 + i, 0, sprintf("%-15s x %.2f", nm, RT_SC[2*i]), "")
    gputsc(1 + i, 24, s, C_ACC)
    gputsc(1 + i, 51, sprintf("%d knots", n), C_ACC)
  }
  gputsc(6, 0, sprintf("%-15s x %.2f  2.0 knots in the file is %.1f", "the stream", RT_CUR, 2 * RT_CUR), "")
  gputsc(8, 0, "Rules of thumb. What you measure on deck outranks them.", C_DIM)
  return 0
}
#  TEST THE ROUTE (weather 1.0.26, Larry's ruling TBOK): the all-in beat
#  above, sailed with her speeds at 0.9, 1.0 and 1.1, as a lighter and a
#  stronger wind would make them.  Each bar is the time going right, an
#  = for five minutes; the | is the veer, an hour in at every speed.
function rt_whatif_figure(   w, h, i, k, n, m, s, t, r, a){
  rt_init()
  w = 66; h = 11
  gclear(w, h)
  FIGNAME = "rtwhatif"
  gputsc(0, 0, "The beat above, sailed three times, her speeds scaled", C_ACC)
  gputsc(2, 0, "speed     going right: each = is 5 minutes", C_DIM)
  gputsc(2, 44, "right   middle  left", C_DIM)
  for(i = 1; i <= RT_KN; i++){
    k = RT_K[i]; r = rt_allin_k(1, RT_SHIFT, k)
    n = int(rt_min(r) / 5 + 0.5); s = ""
    for(m = 0; m < n; m++) s = s "="
    gputsc(2 + i, 0, sprintf("x %.1f", k), "")
    gputsc(2 + i, 10, s, C_ACC)
    gputc(2 + i, 10 + int(60 * RT_TS / 5 + 0.5), "|", C_WARN)
    gputsc(2 + i, 44, rt_hm(r), C_ACC)
    gputsc(2 + i, 52, rt_hm(rt_allin_k(0.5, RT_SHIFT, k)), "")
    gputsc(2 + i, 60, rt_hm(rt_allin_k(0, RT_SHIFT, k)), "")
    t = t (i > 1 ? (i < RT_KN ? ", " : " and ") : "") rt_hm(r)
  }
  gputsc(6, 10 + int(60 * RT_TS / 5 + 0.5), sprintf("| the veer of %d, an hour in, every time", RT_SHIFT), C_WARN)
  gputsc(8, 0, "Right is fastest at every speed: the same call each time.", C_ACC)
  gputsc(9, 0, "Going right: " t ". The clock moved.", "")
  return 0
}
