// the seven contacts lessons -- generated from bin/colregs v1.21 by
// running the awk's own ct_lesson() and dumping what it printed. The
// figures are the parameters ct_plot() and ct_rose() were called with,
// not a picture of the character grid: the browser draws SVG from the
// same numbers. Do not hand-edit: regenerate with
// docs/web/colregs/gen/make-colregs-web.sh so the two cannot drift.
window.CONTACTS_LESSONS = [
  {
   "id": "C1",
   "title": "Relative motion - the only plot that answers the question",
   "blocks": [
    {
     "t": "p",
     "s": "You cannot steer a ship by watching how a contact moves over the ground.\nWhat matters is how she moves relative to YOU, and in relative motion\nshe does something very simple: she travels in a straight line.\n\nPut yourself at the centre and plot where she is relative to you every\nthree minutes. Those marks fall on a straight line. Extend it. Where it\npasses you is the CPA, and which side of you it passes is the whole\nquestion - ahead, or astern."
    },
    {
     "t": "fig",
     "kind": "plot",
     "px": -9000,
     "py": 13000,
     "vx": 760,
     "vy": -1120,
     "nobs": 5,
     "dt": 3,
     "cpa": 1
    },
    {
     "t": "p",
     "s": "Y = you, head up.  1 to 5 = her, three minutes apart.  * = CPA\n\nTwo things follow, and everything else in this section comes out of them:\n\n  1. Because the line is straight, the bearing sweeps one way and one\n     way only. It can never reverse. Whatever it is doing now, it will\n     go on doing until somebody alters course.\n  2. If the line goes through the centre, the bearing does not change\n     at all - and that is a collision."
    }
   ]
  },
  {
   "id": "C2",
   "title": "Drift toward the bow, and drift away from it",
   "blocks": [
    {
     "t": "p",
     "s": "This is the whole trade, and it is one sentence:\n\n  A bearing drawing AWAY from your bow will pass astern of you.\n  A bearing drawing TOWARD your bow will cross ahead of you.\n\nOn the left, drawing left: she goes down your side and astern.\nOn the left, drawing right: she is going to cross your bow.\nOn the right, drawing right: astern.  On the right, drawing left: ahead.\n\nThis is not a rule of thumb. It is a consequence of the straight line in\nC1: the bearing sweeps one way, so a contact drawing away from your bow\ncan never come back to it. There are no exceptions and no edge cases.\n\nWhich is why one of the two is a report and the other is a warning.\nDrawing away, the miss is behind you and it is getting bigger. Drawing\ntoward, the miss is being built in front of your bow - and it shrinks to\nnothing the moment the drift slows. A contact drawing slowly toward your\nbow is a collision that has not finished making up its mind.\n\nSay it as a pair, always, because one word without the other is useless:\n\n  \"On the left, drawing left.\"   \"On the left, drawing right.\""
    }
   ]
  },
  {
   "id": "C3",
   "title": "Constant bearing, decreasing range",
   "blocks": [
    {
     "t": "p",
     "s": "Rule 7(d)(i): risk of collision shall be deemed to exist if the compass\nbearing of an approaching vessel does not appreciably change.\n\nDeemed. Not estimated, not assessed - deemed. You do not get to argue\nwith it, and you do not wait for the range to confirm it."
    },
    {
     "t": "fig",
     "kind": "plot",
     "px": -7000,
     "py": 11000,
     "vx": 466,
     "vy": -733,
     "nobs": 5,
     "dt": 3,
     "cpa": 1
    },
    {
     "t": "p",
     "s": "A steady bearing. The line goes through the middle. That is all a\ncollision is: two ships keeping the same bearing on each other.\n\nBut read the second half of the rule, which is the half that kills people:\n\n  7(d)(ii): such risk may sometimes exist even when an appreciable\n  bearing change is evident, particularly when approaching a very\n  large vessel or a tow, or when approaching a vessel at close range.\n\nThree reasons, and they are all about the ship being bigger than the dot\nyou are plotting:\n\n  1. A very large vessel. You take the bearing of her bridge.\n     She is 300 metres long. Her bow is a cable and a half from the mark\n     you plotted, and it is the bow that reaches you.\n  2. A tow. The tug draws clear beautifully. The barge 200 metres\n     astern of her on a wire does not, and at night you may not see it.\n  3. Close range. Bearing drift goes as range squared. At two miles a\n     degree a minute is comfortable; at four cables the same drift rate\n     is a miss of a few yards."
    }
   ]
  },
  {
   "id": "C4",
   "title": "The report",
   "blocks": [
    {
     "t": "p",
     "s": "The report exists so that a man who is not looking at the plot can act on\nit without asking a question. It has a fixed shape for the same reason a\nhelm order does.\n\n  \"Master 2, bearing 311, Red 20, drawing left, range 14,200,\n     CPA 4,100 yards at 18 minutes.\"\n\n   Master 2     which contact. Numbered so that nobody has to say\n                \"the one on the left\" with four of them on the left.\n   bearing 311  where she is. True, and said in three digits,\n                because that is what goes on the plot and what\n                agrees with the radar.\n   Red 20       where to LOOK. Twenty degrees off the port bow.\n                Nobody at the wheel can turn 311 true into a\n                direction to point his face in, and he should not\n                have to. See C7 - and note that this half of the\n                report goes stale the moment you alter course.\n   drawing left what she is DOING. A word, not a number, because\n                this is the part the OOD acts on and he must not have\n                to work it out from two bearings in his head.\n   range 14,200 how long you have.\n   CPA and time how bad it gets, and when.\n\nBearing before drift, always. The bearing tells him where to look; the\ndrift tells him whether to care. Reversed, he spends the first half of\nthe sentence not knowing which contact you mean.\n\nAnd say the drift even when there is not any. \"Steady\" is the most\nimportant word in the report. Silence about the drift reads as \"I have\nnot looked\", which is the same as \"steady\" but arrives too late.\n\nWhat he does with it: nothing at all, if she is drawing away and the CPA\nis outside night orders. That is most of them, and the discipline is to\nreport those the same way and in the same voice as the one that is not."
    }
   ]
  },
  {
   "id": "C5",
   "title": "The arithmetic you do in your head",
   "blocks": [
    {
     "t": "p",
     "s": "The plot is the truth, but it is always four minutes old. These get you\nclose enough to open your mouth now.\n\n  The three-minute rule\n  Yards in three minutes = speed in knots times 100.\n  12 knots is 1,200 yards in three minutes. That is why marks are taken\n  every three minutes: the range change IS the speed, with two noughts.\n\n  The six-minute rule\n  Miles in six minutes = speed divided by 10. 15 knots, 1.5 miles.\n\n  Time to CPA\n  Range divided by closing rate. Closing rate is the range change per\n  minute - read it straight off two marks, no trigonometry.\n  8,000 yards closing 600 a minute is thirteen minutes. That is the\n  number that decides whether you have time to be polite about it.\n\n  One in sixty, for the CPA itself\n  One degree at one mile is about 35 yards. So:\n\n     CPA  =  range in miles  x  degrees she still has to drift  x  35\n\n  She will drift, from now until CPA, at the rate she is drifting now.\n  So take the drift per minute, multiply by the minutes to CPA, and that\n  is the degrees. Worked: 4 miles, drifting 1.5 degrees a minute, 13\n  minutes to run. 1.5 x 13 = 20 degrees. 4 x 20 x 35 = 2,800 yards.\n\n  It is rough. It is meant to be. It tells you which side of the night\n  orders you are on before the plot can, and that is the whole job."
    }
   ]
  },
  {
   "id": "C6",
   "title": "Ekelund - range out of a course change",
   "blocks": [
    {
     "t": "p",
     "s": "On a steady course, bearing rate alone cannot give you range. A slow\ncontact close in and a fast one far out produce exactly the same drift,\nand no amount of watching will separate them.\n\nSo you change the geometry yourself. Run a leg, note the bearing rate;\nalter course or speed, settle, run another leg, note it again. Her\nmotion across your line of sight has not changed - she is doing what she\nwas doing. Every bit of the change in bearing rate is YOURS, and it is\nyours by a known amount. That gives you the range:\n\n  range in kiloyards  =  1.91 x (change in your speed across the\n                          line of sight, knots)\n                          / (change in bearing rate, deg per min)\n\n  Your speed across the line of sight is your speed times the sine of\n  the angle between your course and her bearing. Beam on, all of it;\n  dead ahead, none of it.\n\n  The 1.91 is just units: 2,000 yards to the mile over 60 minutes,\n  times 57.3 degrees to the radian.\n\nWorked. She bears 040. You are on 000 at 12 knots and her bearing is\nopening 0.9 degrees a minute. You come round to 090, still 12 knots,\nand it settles at 2.4 a minute.\n\n  across, leg 1 = 12 x sin(000 - 040) = -7.7 knots\n  across, leg 2 = 12 x sin(090 - 040) =  9.2 knots\n  range = 1.91 x (9.2 - -7.7) / (0.9 - 2.4) = 1.91 x 16.9 / -1.5\n        = -21.5 ... take the size: 21,500 yards.\n\nThree things will ruin it, and they are worth knowing better than the\nformula:\n  1. She manoeuvres during the legs. The whole method assumes she did\n     not, and it cannot tell you that she did - it just gives you a\n     confident wrong answer.\n  2. The legs are too short, or you take the rate before the ship has\n     settled on the new course.\n  3. You barely changed your speed across the line of sight. Then the\n     top of the fraction is small, the bottom is smaller, and the noise\n     runs the answer. Turn far enough to matter.\n\nWhich is the real lesson of it: a solution you have not manoeuvred\nagainst is a guess wearing a number."
    }
   ]
  },
  {
   "id": "C7",
   "title": "Relative bearings - so he can find her",
   "blocks": [
    {
     "t": "p",
     "s": "A true bearing is for the plot. A relative bearing is for the eye.\n\nNobody standing at the wheel on a black night can turn 311 degrees\ntrue into a direction to look in. He would have to remember the\nheading, subtract, and work out which side the answer fell on, while\nsteering. Tell him she is fine on the starboard bow and his head is\nalready turning."
    },
    {
     "t": "fig",
     "kind": "rose"
    },
    {
     "t": "p",
     "s": "Two ways of saying the number, and you will hear both.\n\n  Red and Green. Red 20 is 20 degrees to port, Green 30 is 30\n  to starboard, nought to 180 each side. Royal Navy and British\n  practice, and the reason it sticks is that the colours are the\n  sidelights: your own red light looks out over your port bow, so\n  Red is port. It is unambiguous over a bad intercom because the\n  side is a word, not a number that can be misheard.\n\n  Port and starboard. \"Port 20\", \"Starboard 30\". The same thing\n  in plainer words. United States practice also uses the full\n  circle - \"bearing 340 relative\" - measured clockwise from your\n  own bow, which is neater on a plot and worse in the dark.\n\nAnd the words, which need no number at all:\n\n    right ahead                       000\n    fine on the bow         out to about 35\n    broad on the bow                   045\n    on the beam                        090\n    broad on the quarter               135\n    fine on the quarter     in from about 145\n    right astern                       180\n\nBroad on the bow is four points, and four points is 45 degrees.\nBroad on the quarter is four points the other way from astern.\nEverything in the middle is fine, and everything near the beam is\nthe beam. The edges are convention, not law - nobody will correct\nyou for calling 40 degrees fine rather than broad, and nobody will\nmisunderstand you either. That is the point of them.\n\n  Now the trap, and it is a real one.\n\nA relative bearing changes when SHE moves. It also changes when YOU\nmove, by exactly as much, and it cannot tell you which happened.\n\nAlter twenty degrees to starboard and every contact on the board\ndraws twenty degrees left, all at once, with nothing at all having\nchanged out in the water. A contact that holds Green 30 through your\nturn has in fact swung twenty degrees - which is the opposite of the\ncomfort a steady relative bearing seems to offer.\n\nSo: bearing drift is measured in TRUE bearings, or on a steady\n  course, and never across a turn. Everything in C2 and C3\nassumes it. If you take marks either side of an alteration and read\nthe drift off them, you will get a confident answer that is wholly\ninvented. Take the marks, alter, settle, and start a fresh plot.\n\nThis is also, from the other end, exactly why Ekelund works: the\nchange you put in yourself is known, so it can be subtracted out.\n\nOn a yacht it is the same problem in cheaper equipment. A hand\nbearing compass gives you a magnetic bearing you can plot. A pair\nof eyes and a shroud gives you a relative bearing, instantly, in\nthe dark, with no instrument at all - and the shroud stays where it\nis only while you hold your course. Steer straight for the two\nminutes you are watching her, or the drift is worthless.\n\nWhich of these this program uses is a setting, because the right\nanswer depends entirely on who is listening.  colregs style, or s\nfrom the contacts menu, and it describes each one before you pick.\n\nSay both, when it matters: the true bearing so it can be plotted,\nthe relative so it can be seen.\n\n  \"Master 2, bearing 311, Red 20, drawing left, range 14,200.\""
    }
   ]
  }
];
