// colregs data -- generated from bin/colregs v1.19 by running the awk
// engine's own table initialisers and dumping what they built.  Do not
// hand-edit: regenerate with docs/web/colregs/gen/make-colregs-web.sh so
// the two cannot drift.
window.COLREGS_DATA = {
 "version": "1.19",
 "vessels": [
  {
   "key": "power50",
   "name": "Power-driven vessel under 50 m, under way",
   "rule": "Rule 23",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "One masthead light, sidelights, sternlight."
  },
  {
   "key": "power50p",
   "name": "Power-driven vessel of 50 m or more, under way",
   "rule": "Rule 23",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": -0.1, "y": 0.0, "h": 0.92, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Two masthead lights, the after one higher."
  },
  {
   "key": "sail",
   "name": "Sailing vessel under way",
   "rule": "Rule 25",
   "lights": [{"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Sidelights and a sternlight. No masthead light - that is the whole point."
  },
  {
   "key": "sailrg",
   "name": "Sailing vessel, optional all-round pair",
   "rule": "Rule 25",
   "lights": [{"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.8, "arc": "A", "col": "R"}, {"x": 0.15, "y": 0.0, "h": 0.7, "arc": "A", "col": "G"}],
   "note": "Red over green at the masthead, with normal sidelights and sternlight."
  },
  {
   "key": "anchor",
   "name": "Vessel at anchor, under 50 m",
   "rule": "Rule 30",
   "lights": [{"x": 0.35, "y": 0.0, "h": 0.7, "arc": "A", "col": "W"}],
   "note": "A single all-round white light where it can best be seen."
  },
  {
   "key": "anchor50",
   "name": "Vessel at anchor, 50 m or more",
   "rule": "Rule 30",
   "lights": [{"x": 0.38, "y": 0.0, "h": 0.8, "arc": "A", "col": "W"}, {"x": -0.35, "y": 0.0, "h": 0.55, "arc": "A", "col": "W"}],
   "note": "Two all-round whites, forward one higher, and she may have her decks lit (required at 100 m and over)."
  },
  {
   "key": "aground",
   "name": "Vessel aground",
   "rule": "Rule 30",
   "lights": [{"x": 0.35, "y": 0.0, "h": 0.72, "arc": "A", "col": "W"}, {"x": 0.1, "y": 0.0, "h": 0.88, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.78, "arc": "A", "col": "R"}],
   "note": "Anchor light or lights, plus two all-round reds in a vertical line."
  },
  {
   "key": "nuc",
   "name": "Not under command, making no way",
   "rule": "Rule 27",
   "lights": [{"x": 0.1, "y": 0.0, "h": 0.88, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.78, "arc": "A", "col": "R"}],
   "note": "Two all-round reds. Nothing else if she is not moving through the water."
  },
  {
   "key": "nucway",
   "name": "Not under command, making way",
   "rule": "Rule 27",
   "lights": [{"x": 0.1, "y": 0.0, "h": 0.88, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.78, "arc": "A", "col": "R"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Two all-round reds, and because she is making way, sidelights and sternlight too."
  },
  {
   "key": "ram",
   "name": "Restricted in her ability to manoeuvre",
   "rule": "Rule 27",
   "lights": [{"x": 0.1, "y": 0.0, "h": 0.99, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.89, "arc": "A", "col": "W"}, {"x": 0.1, "y": 0.0, "h": 0.79, "arc": "A", "col": "R"}, {"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Red, white, red in a vertical line. Making way, so the ordinary lights as well."
  },
  {
   "key": "draught",
   "name": "Constrained by her draught",
   "rule": "Rule 28",
   "lights": [{"x": 0.1, "y": 0.0, "h": 0.99, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.89, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.79, "arc": "A", "col": "R"}, {"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Three all-round reds in a vertical line, over the ordinary power-driven lights."
  },
  {
   "key": "trawl",
   "name": "Vessel trawling",
   "rule": "Rule 26",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.88, "arc": "A", "col": "G"}, {"x": 0.15, "y": 0.0, "h": 0.76, "arc": "A", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Green over white. Green for a trawl dragged along the bottom."
  },
  {
   "key": "fishing",
   "name": "Fishing, other than trawling",
   "rule": "Rule 26",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.88, "arc": "A", "col": "R"}, {"x": 0.15, "y": 0.0, "h": 0.76, "arc": "A", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Red over white. The old rhyme: red over white, fishing at night."
  },
  {
   "key": "pilot",
   "name": "Pilot vessel on duty",
   "rule": "Rule 29",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.88, "arc": "A", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.76, "arc": "A", "col": "R"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "White over red: pilot ahead. Sidelights and sternlight when under way."
  },
  {
   "key": "tow200",
   "name": "Towing, tow under 200 m",
   "rule": "Rule 24",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.84, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": -0.46, "y": 0.0, "h": 0.5, "arc": "T", "col": "Y"}],
   "note": "Two masthead lights in a vertical line, and a yellow towing light above the sternlight."
  },
  {
   "key": "tow200p",
   "name": "Towing, tow over 200 m",
   "rule": "Rule 24",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.84, "arc": "M", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.96, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": -0.46, "y": 0.0, "h": 0.5, "arc": "T", "col": "Y"}],
   "note": "Three masthead lights in a vertical line - the tow is longer than 200 m."
  },
  {
   "key": "towed",
   "name": "Vessel being towed",
   "rule": "Rule 24",
   "lights": [{"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Sidelights and a sternlight, and nothing else. She looks like a sailing vessel until you see what is ahead of her."
  },
  {
   "key": "mineclear",
   "name": "Mine clearance vessel",
   "rule": "Rule 27",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.98, "arc": "A", "col": "G"}, {"x": 0.15, "y": 0.15, "h": 0.82, "arc": "A", "col": "G"}, {"x": 0.15, "y": -0.15, "h": 0.82, "arc": "A", "col": "G"}],
   "note": "Three all-round greens: one at the foremast head and one at each end of the fore yard. Keep 1000 m clear."
  },
  {
   "key": "hover",
   "name": "Air-cushion vessel in non-displacement mode",
   "rule": "Rule 23",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.6, "arc": "A", "col": "Y"}],
   "note": "The ordinary power-driven lights plus an all-round flashing yellow."
  },
  {
   "key": "sail7",
   "name": "Sailing vessel under 7 m, or a vessel under oars",
   "rule": "Rule 25",
   "lights": [{"x": 0.0, "y": 0.0, "h": 0.35, "arc": "A", "col": "W"}],
   "note": "If she carries nothing else she must show a torch or lantern in time to prevent collision."
  },
  {
   "key": "wig",
   "name": "WIG craft taking off, landing or in flight",
   "rule": "Rule 23(c)",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.6, "arc": "A", "col": "R"}],
   "note": "The ordinary power-driven lights plus a high intensity all-round flashing red, shown only when taking off, landing or in flight near the surface."
  },
  {
   "key": "submarine",
   "name": "Submarine on the surface (US Navy identification light)",
   "rule": "32 CFR 707.7",
   "lights": [{"x": 0.1, "y": 0.0, "h": 0.3, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.2, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.2, "arc": "P", "col": "R"}, {"x": -0.3, "y": 0.0, "h": 0.16, "arc": "T", "col": "W"}, {"x": 0.1, "y": 0.0, "h": 0.42, "arc": "A", "col": "Y"}],
   "note": "NOT a Convention light. A US Navy special rule: an intermittent flashing amber beacon, one flash a second for three seconds then three seconds dark, shown all round the horizon. Her ordinary lights sit much lower and closer together than a ship's, which is itself the recognition."
  },
  {
   "key": "dredge",
   "name": "Dredging or underwater operations, restricted",
   "rule": "Rule 27(d)",
   "lights": [{"x": 0.1, "y": 0.0, "h": 0.99, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.0, "h": 0.89, "arc": "A", "col": "W"}, {"x": 0.1, "y": 0.0, "h": 0.79, "arc": "A", "col": "R"}, {"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": 0.1, "y": -0.2, "h": 0.62, "arc": "A", "col": "G"}, {"x": 0.1, "y": -0.2, "h": 0.52, "arc": "A", "col": "G"}, {"x": 0.1, "y": 0.2, "h": 0.62, "arc": "A", "col": "R"}, {"x": 0.1, "y": 0.2, "h": 0.52, "arc": "A", "col": "R"}],
   "note": "Red, white, red for restricted in her ability to manoeuvre, and in addition two all-round reds on the side the obstruction is and two all-round greens on the side you may pass. Here the obstruction is to starboard and the way past is to port."
  },
  {
   "key": "sailtri",
   "name": "Sailing vessel under 20 m, combined lantern",
   "rule": "Rule 25(b)",
   "lights": [{"x": 0.0, "y": 0.0, "h": 0.95, "arc": "S", "col": "G"}, {"x": 0.0, "y": 0.0, "h": 0.95, "arc": "P", "col": "R"}, {"x": 0.0, "y": 0.0, "h": 0.95, "arc": "T", "col": "W"}],
   "note": "Sidelights and sternlight combined in one lantern at or near the top of the mast. Only a sailing vessel under 20 metres may do this."
  },
  {
   "key": "towalong",
   "name": "Pushing ahead, or towing alongside",
   "rule": "Rule 24(c)",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.72, "arc": "M", "col": "W"}, {"x": 0.15, "y": 0.0, "h": 0.84, "arc": "M", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}],
   "note": "Two masthead lights in a vertical line, sidelights and a sternlight -- and no towing light. She is pushing ahead or towing alongside, so nothing of hers is astern on a wire."
  },
  {
   "key": "power12",
   "name": "Power-driven vessel under 12 m",
   "rule": "Rule 23(d)",
   "lights": [{"x": 0.0, "y": 0.0, "h": 0.45, "arc": "A", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}],
   "note": "Under 12 metres she may show an all-round white light and sidelights, in place of the masthead light and the sternlight."
  },
  {
   "key": "power7",
   "name": "Power-driven vessel under 7 m, 7 knots or less",
   "rule": "Rule 23(d)",
   "lights": [{"x": 0.0, "y": 0.0, "h": 0.35, "arc": "A", "col": "W"}],
   "note": "Under 7 metres, and not able to exceed 7 knots, she may show an all-round white light alone -- with sidelights as well if that is practicable."
  },
  {
   "key": "fishgear",
   "name": "Fishing other than trawling, gear out over 150 m",
   "rule": "Rule 26(c)(ii)",
   "lights": [{"x": 0.15, "y": 0.0, "h": 0.88, "arc": "A", "col": "R"}, {"x": 0.15, "y": 0.0, "h": 0.76, "arc": "A", "col": "W"}, {"x": 0.06, "y": 0.11, "h": 0.42, "arc": "S", "col": "G"}, {"x": 0.06, "y": -0.11, "h": 0.42, "arc": "P", "col": "R"}, {"x": -0.46, "y": 0.0, "h": 0.36, "arc": "T", "col": "W"}, {"x": 0.1, "y": 0.22, "h": 0.55, "arc": "A", "col": "W"}],
   "note": "Red over white for fishing other than trawling, and in addition an all-round white out towards her gear: it is streamed more than 150 metres in that direction. Here it is out to starboard."
  }
 ],
 "shapes": [
  {
   "key": "anchor",
   "name": "Vessel at anchor",
   "rule": "Rule 30",
   "stack": ["ball"],
   "note": "One black ball, forward, where it can best be seen."
  },
  {
   "key": "aground",
   "name": "Vessel aground",
   "rule": "Rule 30",
   "stack": ["ball", "ball", "ball"],
   "note": "Three balls in a vertical line."
  },
  {
   "key": "nuc",
   "name": "Not under command",
   "rule": "Rule 27",
   "stack": ["ball", "ball"],
   "note": "Two balls in a vertical line."
  },
  {
   "key": "ram",
   "name": "Restricted in her ability to manoeuvre",
   "rule": "Rule 27",
   "stack": ["ball", "diamond", "ball"],
   "note": "Ball, diamond, ball. The diamond in the middle is the one to remember."
  },
  {
   "key": "draught",
   "name": "Constrained by her draught",
   "rule": "Rule 28",
   "stack": ["cyl"],
   "note": "A black cylinder."
  },
  {
   "key": "motorsail",
   "name": "Sailing vessel also under power",
   "rule": "Rule 25",
   "stack": ["conedn"],
   "note": "A cone, point down, forward. She is a power-driven vessel now, whatever her sails are doing."
  },
  {
   "key": "fishing",
   "name": "Vessel fishing",
   "rule": "Rule 26",
   "stack": ["hourglass"],
   "note": "Two cones with their points together. The 1972 text let a vessel under 20 m show a basket instead; that alternative is no longer in Rule 26, so you may still see one but it is not what the rule now asks for."
  },
  {
   "key": "tow200p",
   "name": "Towing, tow over 200 m",
   "rule": "Rule 24",
   "stack": ["diamond"],
   "note": "A diamond, shown by the towing vessel and by the tow."
  },
  {
   "key": "mineclear",
   "name": "Mine clearance",
   "rule": "Rule 27",
   "stack": ["ball", "ballpair"],
   "note": "Three balls: one at the foremast head and one at each end of the fore yard."
  },
  {
   "key": "divers",
   "name": "Vessel with divers down",
   "rule": "Rule 27",
   "stack": ["flagA"],
   "note": "A rigid replica of flag A, at least 1 m high. She is restricted in her ability to manoeuvre."
  }
 ],
 "encounters": [
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a power-driven vessel, both her sidelights and two masthead lights in line",
   "brglo": 359,
   "brghi": 1,
   "thdg": 180,
   "answer": "d",
   "options": ["Stand on: keep your course and speed.", "Give way: alter to port and pass down her starboard side.", "Sound one short blast and hold on.", "Alter course to starboard, and expect her to do the same."],
   "why": "Head-on, or nearly so, between two power-driven vessels. Neither is the stand-on vessel: each alters to starboard so that they pass port to port. Seeing both her sidelights is the classic sign.",
   "rule": "Rule 14",
   "hspr": 1,
   "vessel": "power50p"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a power-driven vessel showing her red sidelight",
   "brglo": 30,
   "brghi": 100,
   "thdg": 290,
   "answer": "b",
   "options": ["Stand on: she must keep clear of you.", "Give way: alter to starboard and pass under her stern.", "Give way: alter to port to cut across ahead of her.", "Slow down and let her decide."],
   "why": "She is crossing from your starboard side, so you are the give-way vessel. Rule 15 says keep out of her way and, if the circumstances admit, avoid crossing ahead of her - so you alter to starboard and go under her stern.",
   "rule": "Rule 15",
   "hspr": 15,
   "vessel": "power50"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a power-driven vessel showing her green sidelight",
   "brglo": 260,
   "brghi": 330,
   "thdg": 70,
   "answer": "a",
   "options": ["Stand on: keep your course and speed, and watch her.", "Give way: alter to starboard.", "Give way: alter to port.", "Stop your engines at once."],
   "why": "She is crossing from your port side, so she must keep out of your way and you are the stand-on vessel. Keep your course and speed - but Rule 17 also allows you to act as soon as it is clear she is not, and requires you to act when collision cannot be avoided by her action alone.",
   "rule": "Rule 17",
   "hspr": 15,
   "vessel": "power50"
  },
  {
   "own": "You are a power-driven vessel making 18 knots.",
   "target": "a power-driven vessel making 8 knots, showing only her sternlight",
   "brglo": 350,
   "brghi": 10,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: you are the faster vessel.", "Give way: you are overtaking, so keep clear until you are finally past and clear.", "Sound two short blasts and pass down her port side.", "Alter to starboard only if she alters first."],
   "why": "You are coming up on her from more than 22.5 degrees abaft her beam - you can see only her sternlight, which is the test. Any subsequent alteration of bearing does not make you a crossing vessel: you remain the give-way vessel until finally past and clear.",
   "rule": "Rule 13",
   "hspr": 15,
   "vessel": "power50"
  },
  {
   "own": "You are a power-driven vessel making 8 knots.",
   "target": "a large power-driven vessel coming up astern",
   "brglo": 170,
   "brghi": 200,
   "thdg": 0,
   "answer": "a",
   "options": ["Stand on: keep your course and speed.", "Give way: alter to starboard.", "Give way: slow down and let her pass.", "Alter to port to open the distance."],
   "why": "She is overtaking you, so she must keep out of your way. You are the stand-on vessel and should hold your course and speed so that she can plan around you.",
   "rule": "Rule 13",
   "hspr": 15,
   "vessel": "power50p"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a sailing vessel under sail alone",
   "brglo": 20,
   "brghi": 80,
   "thdg": 300,
   "answer": "b",
   "options": ["Stand on: she is smaller than you.", "Give way: keep out of her way.", "Give way only if she is on your starboard side.", "Sound five short blasts."],
   "why": "A power-driven vessel under way keeps out of the way of a sailing vessel. Which side she is on does not come into it, and neither does her size.",
   "rule": "Rule 18",
   "hspr": 10,
   "vessel": "sail"
  },
  {
   "own": "You are a sailing vessel under sail alone.",
   "target": "a power-driven vessel",
   "brglo": 300,
   "brghi": 350,
   "thdg": 80,
   "answer": "a",
   "options": ["Stand on: she must keep out of your way.", "Give way: alter to starboard.", "Give way: tack away.", "Bear away and pass under her stern."],
   "why": "She is a power-driven vessel and you are under sail, so she keeps clear. Stand on - but keep watching, and be ready to act under Rule 17 if she does nothing.",
   "rule": "Rule 18",
   "hspr": 15,
   "vessel": "power50"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a vessel showing red over white all-round lights, with sidelights",
   "brglo": 300,
   "brghi": 60,
   "thdg": 150,
   "answer": "b",
   "options": ["Stand on: she is fishing and must keep clear.", "Give way: keep well out of her way.", "Give way only if she is on your starboard side.", "Pass close ahead to give her room astern."],
   "why": "Red over white means a vessel engaged in fishing other than trawling. A power-driven vessel keeps out of the way of a vessel engaged in fishing, and you should also expect gear to be streamed a long way astern of her.",
   "rule": "Rule 18",
   "hspr": 15,
   "vessel": "fishing"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a vessel showing red, white, red in a vertical line",
   "brglo": 280,
   "brghi": 80,
   "thdg": 170,
   "answer": "b",
   "options": ["Stand on: she is the give-way vessel.", "Give way: keep well out of her way.", "Sound one short blast and alter to starboard.", "Stand on but sound five short blasts."],
   "why": "Red over white over red: restricted in her ability to manoeuvre. She may be dredging, laying cable or transferring stores, and she cannot get out of your way. Everything keeps clear of her except a vessel not under command.",
   "rule": "Rule 18",
   "hspr": 15,
   "vessel": "ram"
  },
  {
   "own": "You are a power-driven vessel in a deep-water channel.",
   "target": "a vessel showing three all-round red lights in a vertical line",
   "brglo": 300,
   "brghi": 60,
   "thdg": 170,
   "answer": "b",
   "options": ["Stand on: a constrained vessel has no special status.", "Give way: avoid impeding her safe passage.", "Overtake her quickly on her starboard side.", "Anchor until she has passed."],
   "why": "Three all-round reds means a vessel constrained by her draught. She is not technically a stand-on vessel under Rule 18, but every vessel must avoid impeding her safe passage, and she may have very little water under her.",
   "rule": "Rule 18(d)",
   "hspr": 15,
   "vessel": "draught"
  },
  {
   "own": "You are a sailing vessel on the port tack.",
   "target": "a sailing vessel on the starboard tack",
   "brglo": 20,
   "brghi": 70,
   "thdg": 265,
   "answer": "b",
   "options": ["Stand on: you were there first.", "Give way: keep out of her way.", "Give way only if she is to windward.", "Tack immediately."],
   "why": "When two sailing vessels have the wind on different sides, the one with the wind on the port side keeps out of the way of the other. You are on port tack, so you give way.",
   "rule": "Rule 12",
   "hspr": 10,
   "wind": 315,
   "vessel": "sail"
  },
  {
   "own": "You are a sailing vessel to windward.",
   "target": "a sailing vessel to leeward, both of you on the same tack",
   "brglo": 70,
   "brghi": 100,
   "thdg": 345,
   "answer": "b",
   "options": ["Stand on: windward has right of way.", "Give way: the windward vessel keeps clear of the leeward vessel.", "Give way only in a narrow channel.", "Both alter to starboard."],
   "why": "With the wind on the same side, the vessel to windward keeps out of the way of the vessel to leeward. Windward gives way - the opposite of what many people first guess.",
   "rule": "Rule 12",
   "hspr": 5,
   "wind": 300,
   "vessel": "sail"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a vessel showing two all-round red lights and no sidelights",
   "brglo": 280,
   "brghi": 80,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: she is not moving.", "Give way: keep well out of her way - she is not under command.", "Sound five short blasts and hold on.", "Pass close ahead - she cannot move."],
   "why": "Two all-round reds and nothing else: not under command, and making no way through the water. She cannot manoeuvre at all. Everything keeps out of her way.",
   "rule": "Rule 18",
   "hspr": 15,
   "vessel": "nuc"
  },
  {
   "own": "You are a power-driven vessel under way in fog, hearing but not seeing her.",
   "target": "a fog signal of one prolonged blast followed by two short",
   "brglo": 300,
   "brghi": 60,
   "thdg": 170,
   "answer": "b",
   "options": ["Stand on: the signal tells you she will keep clear.", "Reduce to bare steerage way - she may be not under command, restricted in her ability to manoeuvre, constrained by her draught, sailing, fishing, or towing or pushing.", "Alter boldly to port.", "Sound five short blasts and continue."],
   "why": "One prolonged and two short is the signal for a vessel not under command, restricted in her ability to manoeuvre, constrained by her draught, sailing, fishing, or towing or pushing another vessel. In restricted visibility there is no stand-on vessel: Rule 19 requires you to reduce to the minimum at which you can be kept on course, and if necessary take all way off.",
   "rule": "Rule 19",
   "hspr": 15
  },
  {
   "own": "You are a yacht of 11 m, under power, crossing a narrow buoyed channel.",
   "target": "a laden bulk carrier coming down the channel, which she cannot leave",
   "brglo": 20,
   "brghi": 90,
   "thdg": 300,
   "answer": "b",
   "options": ["Stand on: you are crossing and she is on your starboard side, so Rule 15 applies.", "Keep clear early: do not impede a vessel that can only navigate within the channel.", "Cross ahead quickly to get out of her way.", "Anchor in the channel until she has passed."],
   "why": "Rule 9(b): a vessel of less than 20 metres or a sailing vessel shall not impede the passage of a vessel which can safely navigate only within a narrow channel. Shall not impede is stronger than give way - keep clear early enough that the question never arises.",
   "rule": "Rule 9",
   "hspr": 10,
   "vessel": "draught"
  },
  {
   "own": "You are a 12 m yacht under sail, crossing a traffic separation scheme.",
   "target": "a container ship following the lane",
   "brglo": 30,
   "brghi": 80,
   "thdg": 300,
   "answer": "b",
   "options": ["Stand on: you are under sail, so power keeps clear of you.", "Keep clear: a sailing vessel shall not impede a power-driven vessel following a lane, and cross on a heading at right angles to the flow.", "Motor along the lane until there is a gap.", "Cross at a shallow angle to spend less time in the lane."],
   "why": "Rule 10(j): a vessel under 20 metres or a sailing vessel shall not impede the safe passage of a power-driven vessel following a traffic lane. And Rule 10(c) says cross on a heading as nearly as practicable at right angles to the flow - heading, not ground track, because a beam-on aspect is what makes you visible and predictable.",
   "rule": "Rule 10",
   "hspr": 15,
   "vessel": "power50p"
  },
  {
   "own": "You are a coaster overtaking a slower vessel in a narrow channel.",
   "target": "the vessel ahead, whose agreement you need before you pass",
   "brglo": 350,
   "brghi": 10,
   "thdg": 0,
   "answer": "c",
   "options": ["Alter to starboard and pass, sounding one short blast.", "Pass on whichever side has more water, without signalling.", "Sound two prolonged and one short - I intend to overtake you on your starboard side - and wait for her answer.", "Call her on VHF and pass when she does not object."],
   "why": "Rule 9(e) with Rule 34(c): in a narrow channel, when she has to take action to let you pass safely, you need her agreement before you overtake. You signal two prolonged and one short for her starboard side, two prolonged and two short for her port side, and she answers prolonged, short, prolonged, short if she agrees.",
   "rule": "Rule 9(e)",
   "hspr": 15,
   "vessel": "power50"
  },
  {
   "own": "You are a power-driven vessel in thick fog, hearing but not seeing her.",
   "target": "two prolonged blasts, about two seconds apart",
   "brglo": 300,
   "brghi": 10,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: two prolonged means she is stopped, so she is no danger.", "Reduce to the least speed at which you can be kept on course, and be ready to take all way off.", "Alter boldly to port and pass down her starboard side.", "Sound five short blasts and hold your speed."],
   "why": "Two prolonged blasts is a power-driven vessel under way but stopped and making no way. In restricted visibility there is no stand-on vessel: Rule 19(e) requires you to reduce to bare steerage way on hearing a fog signal apparently forward of the beam, and if necessary take all your way off.",
   "rule": "Rule 19",
   "hspr": 15
  },
  {
   "own": "You are a yacht under sail alone.",
   "target": "a vessel showing two all-round red lights and nothing else",
   "brglo": 280,
   "brghi": 80,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: you are under sail, so everything keeps clear of you.", "Keep well out of her way: she is not under command and cannot manoeuvre at all.", "Pass close under her stern to see what is wrong.", "Sound five short blasts."],
   "why": "Being under sail does not put you at the top of the order. Rule 18(b): a sailing vessel keeps out of the way of a vessel not under command, of one restricted in her ability to manoeuvre, and of one engaged in fishing.",
   "rule": "Rule 18(b)",
   "hspr": 15,
   "vessel": "nuc"
  },
  {
   "own": "You are a sailing vessel, and the vessel to windward is on the same tack.",
   "target": "another sailing vessel to windward, converging",
   "brglo": 20,
   "brghi": 80,
   "thdg": 300,
   "answer": "a",
   "options": ["Stand on: the windward vessel keeps clear of the leeward vessel.", "Give way: you are the leeward vessel and must bear away.", "Give way: tack immediately.", "Both alter to starboard."],
   "why": "Rule 12(a)(ii): when two sailing vessels have the wind on the same side, the vessel which is to windward keeps out of the way of the vessel to leeward. You are to leeward, so you stand on.",
   "rule": "Rule 12",
   "hspr": 10,
   "wind": 50,
   "vessel": "sail"
  },
  {
   "own": "You are a power-driven vessel in a deep-water route.",
   "target": "a loaded tanker showing three all-round red lights in a vertical line",
   "brglo": 300,
   "brghi": 60,
   "thdg": 170,
   "answer": "b",
   "options": ["Stand on: she has no special status under Rule 18.", "Avoid impeding her safe passage - she may have very little water under her keel.", "Overtake her briskly on her starboard side.", "Cross close ahead of her to clear the route."],
   "why": "Three all-round reds means constrained by her draught. Rule 18(d) says every vessel shall, if the circumstances of the case admit, avoid impeding her safe passage, and she must navigate with particular caution.",
   "rule": "Rule 18(d)",
   "hspr": 15,
   "vessel": "draught"
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a seaplane on the water",
   "brglo": 290,
   "brghi": 340,
   "thdg": 80,
   "answer": "a",
   "options": ["Stand on: a seaplane on the water keeps well clear of all vessels.", "Give way: an aircraft has right of way.", "Give way: alter to starboard and pass astern of her.", "Stop your engines."],
   "why": "Rule 18(e): a seaplane on the water shall, in general, keep well clear of all vessels and avoid impeding their navigation. Once risk of collision exists she complies with the rules of this part like any other vessel - and here she is on your port side, so Rule 15 makes her the give-way vessel too. Either way you stand on, and keep watching her under Rule 17.",
   "rule": "Rule 18(e)",
   "hspr": 15
  },
  {
   "own": "You are a power-driven vessel under way.",
   "target": "a vessel showing three all-round green lights, one at the masthead and one at each yardarm",
   "brglo": 300,
   "brghi": 60,
   "thdg": 170,
   "answer": "c",
   "options": ["Stand on: green lights mean she is under way and keeping clear.", "Give way: alter to starboard and pass a cable astern of her.", "Keep at least 1000 metres clear of her: she is engaged in mine clearance.", "Sound one short blast and pass close ahead."],
   "why": "Rule 27(f): three all-round greens marks a vessel engaged in mine clearance operations. Other vessels shall keep at least 1000 metres clear of her - much further than ordinary avoiding action.",
   "rule": "Rule 27(f)",
   "hspr": 15,
   "vessel": "mineclear"
  },
  {
   "own": "You are a power-driven vessel closing the coast at night.",
   "target": "two all-round red lights in a line, with a white light below and forward, and no sidelights",
   "brglo": 300,
   "brghi": 60,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: she is showing red over red, so she is not under command and under way.", "Keep clear: anchor lights with two all-round reds means she is aground, so there is shoal water where she sits.", "Close her to offer assistance without altering course.", "Sound one prolonged blast and hold on."],
   "why": "Rule 30(d): a vessel aground shows the anchor lights plus two all-round reds in a vertical line. The important part is not only that she cannot move - it is that you now know exactly where the shoal is.",
   "rule": "Rule 30(d)",
   "hspr": 15,
   "vessel": "aground"
  },
  {
   "own": "You are entering a busy anchorage after dark.",
   "target": "a single all-round white light, low down, not moving",
   "brglo": 350,
   "brghi": 30,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: a single white light is a sternlight, so she is going away from you.", "Treat her as a vessel at anchor and pass well clear: she is not under way and cannot get out of your way.", "Assume it is a small boat under oars and hold your course.", "Sound two short blasts and pass down her port side."],
   "why": "One all-round white is a vessel of under 50 metres at anchor. A single white light is genuinely ambiguous at first sight - it may be a sternlight, an anchor light or a small craft - so the answer is to keep watching the bearing and pass well clear until you know which.",
   "rule": "Rule 30",
   "hspr": 15,
   "vessel": "anchor"
  },
  {
   "own": "You are a power-driven vessel approaching a pilot station.",
   "target": "a pilot vessel showing white over red, with sidelights and a sternlight, crossing from your port side",
   "brglo": 280,
   "brghi": 340,
   "thdg": 70,
   "answer": "a",
   "options": ["Stand on: she is crossing from your port side, and being a pilot vessel gives her no special status.", "Give way: pilot vessels always have right of way.", "Give way: sound one short blast and alter to starboard.", "Stop and let her cross."],
   "why": "White over red - pilot ahead. Rule 29 says what a pilot vessel shows, not that she is privileged. Unless she is also restricted in her ability to manoeuvre, the ordinary steering rules apply, and here she is on your port side crossing.",
   "rule": "Rule 29",
   "hspr": 15,
   "vessel": "pilot"
  },
  {
   "own": "You are a yacht under sail alone, overhauling a fishing boat that is under way and making 5 knots.",
   "target": "the vessel ahead, showing only her sternlight",
   "brglo": 350,
   "brghi": 10,
   "thdg": 0,
   "answer": "b",
   "options": ["Stand on: you are under sail, so she keeps clear of you.", "Give way: you are overtaking, and Rule 13 overrides the order of Rule 18.", "Give way only if she starts fishing.", "Sound one short blast and pass to starboard."],
   "why": "Rule 13 applies notwithstanding anything contained in Rules 4 to 18 - so an overtaking vessel keeps clear whatever the two vessels are. Sailing does not help you here, and you only see her sternlight, which is the test for overtaking.",
   "rule": "Rule 13",
   "hspr": 15,
   "vessel": "power50"
  },
  {
   "own": "You are a power-driven vessel crossing ahead of a tug and her tow at night.",
   "target": "three masthead lights in a vertical line, sidelights and a yellow light above her sternlight",
   "brglo": 20,
   "brghi": 80,
   "thdg": 300,
   "answer": "c",
   "options": ["Stand on: the tug is restricted and will keep clear of you.", "Give way: alter to port and pass between the tug and her tow.", "Give way: alter to starboard and pass well astern of the whole tow - it is more than 200 metres long.", "Cross close ahead of the tug to stay clear of the tow."],
   "why": "Three masthead lights in a vertical line means the tow exceeds 200 metres. The tow itself may show only sidelights and a sternlight and is easy to miss, and the towline between them is not lit at all. Never pass between a tug and her tow.",
   "rule": "Rule 24",
   "hspr": 10,
   "vessel": "tow200p"
  }
 ],
 "sounds": [
  {
   "key": "stbd",
   "pattern": "#",
   "meaning": "I am altering my course to starboard",
   "rule": "Rule 34(a)",
   "when": "In sight of one another, power-driven, when manoeuvring as authorised or required by these rules."
  },
  {
   "key": "port",
   "pattern": "# #",
   "meaning": "I am altering my course to port",
   "rule": "Rule 34(a)",
   "when": "In sight of one another, power-driven."
  },
  {
   "key": "astern",
   "pattern": "# # #",
   "meaning": "I am operating astern propulsion",
   "rule": "Rule 34(a)",
   "when": "Note that this says what the engines are doing, not that the vessel is moving astern."
  },
  {
   "key": "doubt",
   "pattern": "# # # # #",
   "meaning": "I do not understand your intentions, or I doubt you are taking sufficient action",
   "rule": "Rule 34(d)",
   "when": "Five or more short and rapid blasts. Use it early and use it loudly; it is the only signal that says something is wrong."
  },
  {
   "key": "ovtstbd",
   "pattern": "#### #### #",
   "meaning": "I intend to overtake you on your starboard side",
   "rule": "Rule 34(c)",
   "when": "In a narrow channel or fairway, where overtaking needs the other vessel's cooperation."
  },
  {
   "key": "ovtport",
   "pattern": "#### #### # #",
   "meaning": "I intend to overtake you on your port side",
   "rule": "Rule 34(c)",
   "when": "In a narrow channel or fairway."
  },
  {
   "key": "agree",
   "pattern": "#### # #### #",
   "meaning": "I agree: go ahead and overtake",
   "rule": "Rule 34(c)",
   "when": "The vessel about to be overtaken answers prolonged, short, prolonged, short."
  },
  {
   "key": "bend",
   "pattern": "####",
   "meaning": "I am approaching a bend where other vessels may be hidden",
   "rule": "Rule 34(e)",
   "when": "Answered by any vessel within hearing round the bend with the same signal."
  },
  {
   "key": "fogpower",
   "pattern": "####",
   "meaning": "Power-driven vessel making way through the water",
   "rule": "Rule 35(a)",
   "when": "At intervals of not more than two minutes."
  },
  {
   "key": "fogstop",
   "pattern": "#### ####",
   "meaning": "Power-driven vessel under way but stopped and making no way",
   "rule": "Rule 35(b)",
   "when": "Two prolonged blasts, about two seconds apart, every two minutes."
  },
  {
   "key": "fogram",
   "pattern": "#### # #",
   "meaning": "Not under command, restricted in ability to manoeuvre, constrained by draught, sailing, fishing, or towing or pushing",
   "rule": "Rule 35(c)",
   "when": "One prolonged and two short, every two minutes. Six different kinds of vessel share this signal, so it tells you to be careful rather than exactly what she is."
  },
  {
   "key": "fogtowed",
   "pattern": "#### # # #",
   "meaning": "A vessel being towed, and manned",
   "rule": "Rule 35(e)",
   "when": "One prolonged and three short, sounded immediately after the towing vessel's signal."
  },
  {
   "key": "foganchor",
   "pattern": "*****",
   "meaning": "At anchor",
   "rule": "Rule 35(g)",
   "when": "The bell rung rapidly for about five seconds, every minute. A vessel of 100 m or more also sounds a gong aft, and any vessel may add one short, one prolonged and one short to warn an approaching vessel."
  },
  {
   "key": "fogaground",
   "pattern": "* * * ***** * * *",
   "meaning": "Aground",
   "rule": "Rule 35(h)",
   "when": "Three distinct strokes, the rapid ringing, then three distinct strokes again."
  },
  {
   "key": "pilot",
   "pattern": "# # # #",
   "meaning": "Pilot vessel on duty - identity signal",
   "rule": "Rule 35(k)",
   "when": "Four short blasts, in addition to whatever signal her situation requires."
  }
 ],
 "lessons": [
  {
   "id": "L1",
   "title": "Rule 5 - Look-out",
   "body": "Every vessel shall at all times maintain a proper look-out by sight and\nhearing as well as by all available means appropriate in the prevailing\ncircumstances and conditions so as to make a full appraisal of the\nsituation and of the risk of collision.\n\n  1. It is the first substantive rule, and it is the one most often\n     broken. More collisions are put down to a failure of look-out than\n     to any other cause.\n  2. 'By sight and hearing' means a person, outside, looking and\n     listening - not only a radar screen.\n  3. 'All available means' does include radar, AIS and VHF, and if you\n     have them and do not use them properly, that is a breach too.\n  4. 'At all times' has no exceptions for singlehanders, for tiredness,\n     or for the middle of an ocean.\n\nThe look-out must be able to appraise the situation. Someone at the\nwheel whose forward view is blocked by the sprayhood is not, by\nthemselves, a proper look-out.",
   "question": "Q. Which of these on its own satisfies Rule 5?\n     a) a radar with ARPA, watched from the chart table\n     b) AIS with a CPA alarm set    c) none of them",
   "answer": "c",
   "why": "Rule 5 requires sight and hearing as well as all available means. Electronics supplement a look-out; they do not replace one."
  },
  {
   "id": "L2",
   "title": "Rule 6 - Safe speed",
   "body": "Every vessel shall at all times proceed at a safe speed so that she can\ntake proper and effective action to avoid collision and be stopped\nwithin a distance appropriate to the prevailing circumstances.\n\n  1. There is no number in this rule. Safe speed depends on visibility,\n     traffic density, manoeuvrability, background lights, the state of\n     wind, sea and current, the proximity of hazards and your draught.\n  2. If you are using radar there are further factors: its limitations,\n     the scale in use, sea and weather clutter, and the possibility that\n     small vessels and ice may not be detected at all.\n  3. 'Be stopped within a distance appropriate' is the practical test.\n     In thick fog with shipping about, that usually means slower than\n     feels comfortable.\n  4. A sailing vessel is not exempt. Reducing sail is reducing speed.",
   "question": "Q. What speed does Rule 6 specify in fog?\n     a) six knots     b) half your normal speed     c) no number at all",
   "answer": "c",
   "why": "Rule 6 gives factors, not numbers. The test is that you can stop within a distance appropriate to the circumstances."
  },
  {
   "id": "L3",
   "title": "Rule 7 - Risk of collision",
   "body": "Every vessel shall use all available means appropriate to determine if\nrisk of collision exists. If there is any doubt, such risk shall be\ndeemed to exist.\n\n  1. The test is compass bearing. If the compass bearing of an\n     approaching vessel does not appreciably change, risk of collision\n     exists.\n  2. It can exist even with an appreciable bearing change - with a very\n     large vessel, a tow, or anything at close range.\n  3. Radar must be used properly if fitted and working: long-range\n     scanning, and systematic observation of detected objects. A\n     glance at the screen is not plotting.\n  4. Assumptions shall not be made on the basis of scanty information,\n     especially scanty radar information. One AIS target is not a\n     picture of the traffic.\n\nTake the bearing with a hand bearing compass over several minutes, or\nline her up against a stanchion and keep your head still. Steady\nbearing, decreasing range: you are going to hit her.",
   "question": "Q. A ship's compass bearing is steady and the range is closing. What does Rule 7 say?\n     a) risk of collision exists    b) risk exists only inside two miles\n     c) no risk while she is more than 30 degrees off the bow",
   "answer": "a",
   "why": "A steady compass bearing with decreasing range is the definition of risk of collision. And if in any doubt, risk shall be deemed to exist."
  },
  {
   "id": "L4",
   "title": "Rule 8 - Action to avoid collision",
   "body": "Any action shall be positive, made in ample time and with due regard to\ngood seamanship.\n\n  1. Alterations of course or speed shall be large enough to be readily\n     apparent to another vessel observing visually or by radar. A\n     succession of small alterations is exactly what the rule forbids.\n  2. If there is sea room, an alteration of course alone may be the most\n     effective action - provided it is made in good time, is substantial,\n     and does not result in another close-quarters situation.\n  3. Action to avoid collision shall result in passing at a safe\n     distance, and its effectiveness shall be carefully checked until\n     the other vessel is finally past and clear.\n  4. If necessary to avoid collision or allow more time to assess, slack\n     off, stop, or reverse. Taking all way off is always available to you.\n\nA ten degree alteration at four miles is invisible on the other bridge.\nThirty degrees, early, is a signal in itself.",
   "question": "Q. Which action best meets Rule 8?\n     a) five degrees now, and five more if she does not respond\n     b) a single alteration of 30 degrees, made early\n     c) hold on until one mile, then alter hard",
   "answer": "b",
   "why": "Action must be positive, made in ample time, and large enough to be readily apparent to the other vessel visually or by radar."
  },
  {
   "id": "L5",
   "title": "Rule 9 - Narrow channels",
   "body": "A vessel proceeding along the course of a narrow channel or fairway\nshall keep as near to the outer limit which lies on her starboard side\nas is safe and practicable.\n\n  1. Keep to the starboard side of the channel. That is the whole rule\n     in one line.\n  2. A vessel of less than 20 metres, or a sailing vessel, shall not\n     impede the passage of a vessel which can safely navigate only\n     within the channel. Nor shall a vessel engaged in fishing.\n  3. Do not cross a channel if it impedes a vessel that can only\n     navigate within it. If in doubt about her intentions, the doubt\n     signal - five or more short blasts - is available.\n  4. Overtaking in a narrow channel, when she has to take action to let\n     you pass safely, needs her agreement, signalled by sound: two\n     prolonged and one short means you intend to pass on her starboard\n     side.\n\n'Shall not impede' is not the same as give way. It means you must keep\nclear early enough that the question of who gives way never arises.",
   "question": "Q. In a narrow channel, which side do you keep to?\n     a) the port side     b) the starboard side     c) the deepest water",
   "answer": "b",
   "why": "As near to the outer limit on your starboard side as is safe and practicable."
  },
  {
   "id": "L6",
   "title": "Rule 10 - Traffic separation schemes",
   "body": "A vessel using a traffic separation scheme shall proceed in the\nappropriate lane in the general direction of traffic flow, keep clear of\nthe separation line or zone, and normally join or leave at the ends.\n\n  1. If you must join at the side, do so at as small an angle to the\n     general direction of flow as practicable.\n  2. If you must cross, cross on a heading as nearly as practicable at\n     right angles to the direction of flow. Heading, not track - so you\n     do not crab across with the tide to make a right-angled ground\n     track. This was changed deliberately: a beam-on aspect is what makes\n     you visible and predictable.\n  3. A vessel under 20 metres, a sailing vessel, or a vessel fishing\n     shall not impede the safe passage of a power-driven vessel\n     following a lane.\n  4. Inshore traffic zones are not for through traffic, with limited\n     exceptions - vessels under 20 metres, sailing vessels, fishing\n     vessels, and vessels going to or from a place inside the zone.",
   "question": "Q. Crossing a traffic separation scheme, what should be at right angles to the flow?\n     a) your heading     b) your ground track     c) your wake",
   "answer": "a",
   "why": "Rule 10(c) says heading. Do not crab across with the tide to make the track square - a beam-on aspect is what makes you visible."
  },
  {
   "id": "L7",
   "title": "Rule 12 - Sailing vessels",
   "body": "When two sailing vessels are approaching one another so as to involve\nrisk of collision:\n\n  1. When each has the wind on a different side, the vessel with the\n     wind on her port side shall keep out of the way of the other.\n     Port tack gives way to starboard tack.\n  2. When both have the wind on the same side, the vessel to windward\n     shall keep out of the way of the vessel to leeward. Windward gives\n     way - which surprises most people the first time.\n  3. If a vessel with the wind on the port side sees a vessel to\n     windward and cannot tell whether that vessel has the wind on the\n     port or the starboard side, she shall keep out of the way.\n  4. The windward side is the side opposite that on which the mainsail\n     is carried - or, for a square-rigged vessel, the largest fore-and-\n     aft sail.\n\nNote that this rule applies between two sailing vessels only. Rule 18\ngoverns a sailing vessel meeting anything else.",
   "question": "Q. Two sailing vessels, both with the wind on the starboard side. Who gives way?\n     a) the vessel to windward     b) the vessel to leeward     c) the overtaking vessel",
   "answer": "a",
   "why": "Same tack: windward keeps out of the way of leeward."
  },
  {
   "id": "L8",
   "title": "Rule 13 - Overtaking",
   "body": "Any vessel overtaking any other shall keep out of the way of the vessel\nbeing overtaken. This rule overrides everything in the other steering\nrules - it applies notwithstanding anything in Rules 4 to 18.\n\n  1. A vessel is overtaking when coming up on another from a direction\n     more than 22.5 degrees abaft her beam.\n  2. The practical test at night: if you can see only her sternlight,\n     and neither of her sidelights, you are overtaking.\n\n@@FIG arcs mode=overtake\n\nHer lights from above, head up, as you would see them from each\nbearing round her. Come up from inside the marked sector and you see\nonly W, her sternlight: you are overtaking.\n\n  3. When in any doubt whether you are overtaking, assume that you are\n     and act accordingly.\n  4. Any subsequent alteration of the bearing between the two shall not\n     make you a crossing vessel or relieve you of the duty to keep clear\n     until you are finally past and clear.\n\nA sailing vessel overtaking a power-driven vessel keeps clear. This is\nthe case that most often catches sailors out.",
   "question": "Q. At night you can see another vessel's sternlight and neither sidelight. What are you?\n     a) crossing     b) overtaking     c) head-on",
   "answer": "b",
   "why": "Sternlight only means you are more than 22.5 degrees abaft her beam: you are overtaking, and you keep clear until finally past and clear."
  },
  {
   "id": "L9",
   "title": "Rule 14 - Head-on situation",
   "body": "When two power-driven vessels are meeting on reciprocal or nearly\nreciprocal courses so as to involve risk of collision, each shall alter\nher course to starboard so that each shall pass on the port side of the\nother.\n\n  1. Neither vessel is the stand-on vessel. Both act.\n  2. The situation shall be deemed to exist when a vessel sees the other\n     ahead or nearly ahead - by night, both sidelights, or the masthead\n     lights in a line or nearly in a line.\n  3. When in doubt whether such a situation exists, assume that it does\n     and act accordingly.\n  4. This rule is between power-driven vessels only.\n\nAlter to starboard, early and boldly, and pass port to port: red to red.",
   "question": "Q. Two power-driven vessels meeting head-on. Who is the stand-on vessel?\n     a) the larger     b) the one to starboard     c) neither",
   "answer": "c",
   "why": "In a head-on situation there is no stand-on vessel. Each alters to starboard and they pass port to port."
  },
  {
   "id": "L10",
   "title": "Rules 15 and 16 - Crossing, and the give-way vessel",
   "body": "When two power-driven vessels are crossing so as to involve risk of\ncollision, the vessel which has the other on her own starboard side\nshall keep out of the way and shall, if the circumstances of the case\nadmit, avoid crossing ahead of the other vessel.\n\n  1. Starboard side, so at night you see her red sidelight. Red means\n     stop: she is on your right and you give way.\n  2. Avoid crossing ahead. In practice, alter to starboard and pass\n     under her stern: it is the action that is unmistakable from her\n     bridge.\n  3. Rule 16 tells the give-way vessel to take early and substantial\n     action to keep well clear. Early and substantial.\n  4. This rule is between power-driven vessels. A crossing sailing\n     vessel is a Rule 18 problem.",
   "question": "Q. You are power-driven and see another power-driven vessel's red sidelight, crossing. What do you do?\n     a) stand on     b) give way, and avoid crossing ahead of her\n     c) give way by altering to port",
   "answer": "b",
   "why": "Her red light means she is on your starboard side. You give way, and Rule 15 says avoid crossing ahead - so alter to starboard and pass under her stern."
  },
  {
   "id": "L11",
   "title": "Rule 17 - Action by the stand-on vessel",
   "body": "Where one vessel is to keep out of the way, the other shall keep her\ncourse and speed. But standing on is not a licence to do nothing.\n\n  1. Normally: keep your course and speed, so that the give-way vessel\n     can work out a solution around you.\n  2. You MAY take action as soon as it becomes apparent to you that she\n     is not taking appropriate action. This is permission, not duty.\n  3. You SHALL take such action as will best aid to avoid collision when\n     you find yourself so close that collision cannot be avoided by the\n     give-way vessel's action alone. This is a duty.\n  4. If you are a power-driven vessel taking action in a crossing\n     situation, do not alter to port for a vessel on your own port side.\n\nThe give-way vessel's obligation does not go away because you have\nacted. Both of you remain bound to avoid collision.",
   "question": "Q. You are the stand-on vessel and she is doing nothing about it. What does Rule 17 allow?\n     a) nothing until collision is unavoidable    b) you may act as soon as it is\n        apparent she is not acting    c) you must alter to port",
   "answer": "b",
   "why": "Rule 17(a)(ii) permits you to act as soon as it becomes apparent she is not taking appropriate action, and 17(b) requires you to act when collision cannot be avoided by her action alone."
  },
  {
   "id": "L12",
   "title": "Rule 18 - Responsibilities between vessels",
   "body": "Except where Rules 9, 10 and 13 otherwise require, the pecking order\nruns from the least manoeuvrable to the most:\n\n     not under command\n     restricted in her ability to manoeuvre\n     engaged in fishing\n     sailing\n     power-driven\n\n  1. Each keeps out of the way of everything above it in that list.\n  2. A vessel constrained by her draught sits slightly outside the list:\n     Rule 18(d) says every vessel shall avoid impeding her safe passage,\n     and she must navigate with particular caution.\n  3. A seaplane on the water keeps well clear of all vessels; a\n     wing-in-ground craft, when taking off, landing or in flight near\n     the surface, keeps well clear of all vessels.\n  4. The exceptions matter: in a narrow channel, in a traffic scheme,\n     and when overtaking, the ordinary order can be reversed.\n\nSailing vessels are third from the bottom, not at the top. A yacht keeps\nout of the way of a fishing vessel, and out of the way of anything not\nunder command.",
   "question": "Q. A yacht under sail meets a vessel engaged in fishing. Who keeps clear?\n     a) the fishing vessel     b) the yacht     c) neither, it is a crossing situation",
   "answer": "b",
   "why": "Rule 18: a sailing vessel keeps out of the way of a vessel engaged in fishing, and of one restricted in her ability to manoeuvre, and of one not under command."
  },
  {
   "id": "L13",
   "title": "Rule 19 - Restricted visibility",
   "body": "This rule applies to vessels not in sight of one another when navigating\nin or near an area of restricted visibility. It is a different world\nfrom Rules 11 to 18.\n\n  1. There is no stand-on vessel. Nobody has right of way. The give-way\n     and stand-on rules simply do not apply.\n  2. Every vessel shall proceed at a safe speed adapted to the\n     circumstances, with engines ready for immediate manoeuvre.\n  3. A vessel which detects by radar alone another vessel shall\n     determine if a close-quarters situation is developing, and if so\n     take avoiding action in ample time. If that action is an alteration\n     of course, avoid: an alteration to port for a vessel forward of the\n     beam other than for a vessel being overtaken, and an alteration\n     towards a vessel abeam or abaft the beam.\n  4. A vessel which hears apparently forward of her beam the fog signal\n     of another vessel, or which cannot avoid a close-quarters situation\n     with a vessel forward of her beam, shall reduce to the minimum at\n     which she can be kept on course - and if necessary take all her way\n     off, and in any event navigate with extreme caution until the\n     danger of collision is over.",
   "question": "Q. In fog, you hear one prolonged and two short forward of the beam. Who is the stand-on vessel?\n     a) you     b) she is     c) neither - Rule 19 has no stand-on vessel",
   "answer": "c",
   "why": "Rule 19 applies to vessels not in sight of one another, and it has no give-way and stand-on. Reduce to the minimum steerage way and, if necessary, take all way off."
  },
  {
   "id": "L14",
   "title": "Rules 20 to 31 - Lights and shapes",
   "body": "Lights are shown from sunset to sunrise, and in restricted visibility,\nand may be shown at any other time when it is considered necessary.\nShapes are shown by day.\n\n  1. The arcs are fixed and worth knowing by heart: masthead light 225\n     degrees, sidelights 112.5 each, sternlight 135. Sidelights plus\n     sternlight make the full circle.\n\n@@FIG arcs mode=lights\n\nHer lights from above, head up. M is the masthead light, G and R the\nsidelights, W the sternlight: the letter on each ring is what you see\nfrom that bearing. The broken lines are 22.5 degrees abaft the beam.\n\n  2. What you see tells you her aspect. Both sidelights: she is nearly\n     bow-on. One sidelight and a masthead light: she is crossing. Only a\n     white light: she may be a sternlight, an anchor light, or a small\n     boat - keep watching until you know which.\n  3. All-round lights in a vertical line are the vessel telling you what\n     she is doing and what she cannot do. Red over white, fishing at\n     night. Red over red, the captain is dead - not under command.\n     Red, white, red - restricted in her ability to manoeuvre.\n  4. Day shapes carry the same meanings: a ball for anchored, three\n     balls aground, two balls not under command, ball-diamond-ball\n     restricted, a cone point down for a sailing vessel under power.\n\n@@FIG shapes\n\nThe ten day shapes on one chart, as the shapes drill hangs them, top\nfirst. Shapes are black and are shown by day. Look at the pairs that\nare easy to confuse: one ball and two, two and three, and the diamond\nalone against ball, diamond, ball.\n\nTwelve vessels, each from ahead, from her starboard beam and from\nastern. Only the lights shown toward you are drawn. The letters are\nthe colours: W white, R red, G green, Y yellow.\n\n@@FIG views key=power50\n\n@@FIG views key=power50p\n\n@@FIG views key=sail\n\n@@FIG views key=sailtri\n\n@@FIG views key=tow200\n\n@@FIG views key=trawl\n\n@@FIG views key=fishing\n\n@@FIG views key=pilot\n\n@@FIG views key=nucway\n\n@@FIG views key=ram\n\n@@FIG views key=draught\n\n@@FIG views key=anchor",
   "question": "Q. What arc does a masthead light cover?\n     a) 112.5 degrees     b) 225 degrees     c) 360 degrees",
   "answer": "b",
   "why": "225 degrees, from right ahead to 22.5 degrees abaft the beam on each side. The sidelights cover 112.5 each and the sternlight the remaining 135."
  },
  {
   "id": "L15",
   "title": "Rules 32 to 37 - Sound and light signals",
   "body": "Sound signals fall into two groups, and the difference matters more\nthan the signals themselves.\n\n  1. Rule 34 signals are for vessels IN SIGHT of one another. They say\n     what you are doing right now: one short, I am altering to\n     starboard; two short, to port; three short, my engines are going\n     astern.\n  2. Rule 35 signals are for RESTRICTED VISIBILITY, when you cannot see\n     each other. They say what kind of vessel you are: one prolonged\n     for a power-driven vessel making way; one prolonged and two short\n     for anything from not-under-command to a sailing vessel.\n  3. Five or more short and rapid blasts is the doubt signal, and the\n     most under-used signal at sea. It means: I do not understand what\n     you are doing, or I do not think you are doing enough.\n  4. A prolonged blast is four to six seconds. A short blast is about\n     one second. Vessels of 100 metres or more carry a bell and a gong;\n     under 12 metres you need not carry the equipment, but you must make\n     some other efficient sound signal.",
   "question": "Q. What does one prolonged blast mean from a vessel you cannot see, in fog?\n     a) I am altering to starboard     b) a power-driven vessel making way\n     c) I am approaching a bend",
   "answer": "b",
   "why": "In restricted visibility (Rule 35) one prolonged every two minutes is a power-driven vessel making way through the water. The same signal in sight of another vessel, at a bend, is Rule 34(e)."
  }
 ]
};
