# =====================================================================
#  bearing.awk -- two pieces of vector arithmetic, shared by colregs and
#  tides.  Board item B13.
#
#    rbrg(x, y)   the bearing, 0 to 360 degrees true, of a vector given
#                 its EAST part first and its NORTH part second: a
#                 contact's relative position, or a stream's set from
#                 its east and north rates
#    sgn180(a)    an angle folded into -180 to 180: how far, and which
#                 way, one bearing lies from another (+ to starboard)
#
#  WHY THEY ARE HERE.  They were written for colregs' contact
#  management (src/colregs/contacts.awk), and the coastal calculators
#  in src/tides/work.awk needed the same two.  build.sh packs each
#  tool's awk into that tool alone, and contacts.awk cannot be loaded
#  into tides: it calls colregs' engine, and mawk refuses a file whose
#  callees are missing.  So tides had to carry a copy.  A copy is two
#  places to mend; one file, packed into both tools, is one.
#
#  WHAT THEY NEED.  nrm360() and atan2d(y, x) from the engine they are
#  packed with.  Each of colregs' and tides' engine.awk defines both,
#  the same way, so this file is loaded AFTER the engine and before the
#  file that calls it:
#
#    colregs   engine.awk, then (CONTACTS payload) bearing.awk, contacts.awk
#    tides     (ENGINE payload) engine.awk, bearing.awk, work.awk
#
#  It defines nothing else and has no BEGIN, so loading it adds no
#  behaviour, only the two names.
# =====================================================================
function rbrg(x,y){ return nrm360(atan2d(x,y)) }
function sgn180(a){ a=nrm360(a); return (a>180)?a-360:a }
