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

