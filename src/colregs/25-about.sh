# swap: CC17 (colregs 1.21, Larry's ruling TBJN): the "why" paragraph below no
# longer names the race he is sailing; the original is in the crew's
# private register, until the race consents (TBID).
about_why() {
  printf '%s\n' \
    '' \
    '  WHY THIS EXISTS' \
    '  ---------------------------------------------------------------' \
    '  Larry Sherman asked for it.' \
    '' \
    '  He served in the United States Navy from 1984 to 1990 as an' \
    '  FTG2/SS - a fire control technician, submarines - in USS Alaska' \
    '  (SSBN-732), USS Lafayette (SSBN-616), USS Gato (SSN-615) and USS' \
    '  Greenling (SSN-614).  Two ballistic missile boats and two fast' \
    '  attacks, which is two quite different trades: one hides and one' \
    '  goes looking.  He stood the manoeuvring watch on the fire control' \
    '  tracking party, managing contacts and avoiding collisions through' \
    '  places like the Strait of Gibraltar and the Race - the tide gate' \
    '  at the mouth of Long Island Sound, and the door you go out of' \
    '  from Groton.' \
    '' \
    '  Thirty-six years on he is sailing round the world, and he wanted' \
    '  a few things that would work on an iPad in the middle of an ocean:' \
    '  no signal, no subscription, no account to log in to, no data to' \
    '  download first.' \
    '' \
    '  So: the rules of the road, drawn.  You learn lights by looking' \
    '  at lights, from the angle you would actually see them, and by' \
    '  being asked what you see and getting it wrong.  Reciting Rule 25' \
    '  does not teach you to recognise a sailing vessel at two miles on' \
    '  a black night.  Being shown one, guessing, and being told why' \
    '  you were wrong does.' \
    '' \
    '  The contacts section is the method he was taught in the Navy,' \
    '  written down: on the left drawing left, on the left drawing' \
    '  right, and what each of those means before the plot catches up.' \
    '' \
    '  Everything follows from "no internet".  The light patterns, the' \
    '  rules, the drills and the plotting are all inside the single' \
    '  file you are running.  It is text.  You can read every line of' \
    '  it, and you should be able to check it.' \
    ''
}
about_sources() {
  printf '%s\n' \
    '' \
    '  SOURCES' \
    '  ---------------------------------------------------------------' \
    '  THE RULES' \
    '    The International Regulations for Preventing Collisions at' \
    '    Sea, 1972, as amended - the Convention itself, including' \
    '    Annex I on the positioning of lights and Annex III on sound' \
    '    signal appliances.  Published by the International Maritime' \
    '    Organization.' \
    '' \
    '    Rule text is quoted only in short extracts, for teaching.' \
    '    Where this program and the Convention differ, the Convention' \
    '    is right and this program has a bug in it.' \
    '' \
    '  THE PICTURES' \
    '    Each vessel is a table of lights - position along the hull,' \
    '    position across it, height, arc of visibility, colour - and' \
    '    the drawing is computed from the bearing you ask for.  So the' \
    '    same table draws her from any angle, and a mistake in the' \
    '    table shows up as a picture that cannot be accounted for.' \
    '    Annex I is what the numbers are built from.' \
    '' \
    '  CONTACTS' \
    '    Relative-motion analysis as it is done on a warship'\''s plot.' \
    '    The rule at the centre of it - a bearing drawing away from' \
    '    your bow can never cross ahead of you - was tested against' \
    '    700,000 randomly generated geometries before it was written' \
    '    down, and is re-checked against 400 more on every test run.' \
    '    Ekelund'\''s range formula was derived from scratch rather than' \
    '    quoted, and is checked to floating point on every run.' \
    '' \
    '  CHECKED BY' \
    '    A test suite that runs the tools under four different awk' \
    '    implementations and requires every drill to mark its own' \
    '    correct answer as correct.  Run it yourself: tests/run-tests.sh' \
    '    in the repository.' \
    ''
}
about_tested() {
  printf '%s\n' \
    '' \
    '  WHAT IS TESTED, AND WHAT IS NOT' \
    '  ---------------------------------------------------------------' \
    '  Two suites run on every change, under four different awk' \
    '  implementations and two shells.' \
    '' \
    '  THE INVARIANTS.  tests/run-tests.sh' \
    '' \
    '    - every drill marks its own correct answer as correct' \
    '    - every lights question has exactly one right answer: six' \
    '      hundred are generated and checked, and no two vessels may' \
    '      look identical from the angle being asked about' \
    '    - the light tables satisfy Annex I wherever Annex I is' \
    '      geometry rather than judgement - sidelights paired, level,' \
    '      opposite each other and no higher than three quarters of' \
    '      the masthead light; the arcs summing to a full circle with' \
    '      no gap; no two lights in the same place' \
    '    - a bearing drawing away from your bow never crosses ahead.' \
    '      Four hundred fresh geometries every run, and seven hundred' \
    '      thousand were checked before the lesson was written' \
    '    - Ekelund recovers the range the geometry was built from' \
    '    - Red, Green, the words and the side agree at every degree of' \
    '      the circle' \
    '    - colour appears on a terminal, and never when piped' \
    '' \
    '  THE GOLDEN FILES.  tests/golden.sh' \
    '' \
    '    Every screen the program can produce deterministically is' \
    '    captured as text and committed - about thirty-four thousand' \
    '    lines of it. Any change to any of it turns up as a diff that' \
    '    somebody has to read and accept on purpose. That is how a' \
    '    small edit to one function gets caught quietly changing' \
    '    forty other screens.' \
    '' \
    '  NOW THE HONEST PART.' \
    '' \
    '  None of that can tell you whether Rule 27 says what this' \
    '  program says it says.' \
    '' \
    '  A test can check that the quiz marks answer C as correct. It' \
    '  cannot check that C is the right answer. It can check that a' \
    '  light table is geometrically consistent. It cannot check that a' \
    '  mine clearance vessel shows those lights. It can check that' \
    '  encounter 14 marks the answer the author intended. It cannot' \
    '  check that the vessel which gives way in it is the one the' \
    '  Convention says gives way - nor even that one of the other' \
    '  three options is not equally defensible.' \
    '' \
    '  Those are judgements against a document, and they need a person' \
    '  holding the document. Which is what the next screen is about.' \
    ''
}
about_needs() {
  printf '%s\n' \
    '  AND HERE IS WHERE IT IS WORTH MOST.' \
    '' \
    '  These are the claims no test can check, in the order of how' \
    '  much damage a wrong one would do.' \
    '' \
    '  1  WHO GIVES WAY, AND WHAT TO DO.  The twenty-eight encounters,' \
    '     and the ninety-four distinct give-way calls the lights quiz' \
    '     can make.  A wrong light table makes you misname a ship.  A' \
    '     wrong verdict here makes you TURN THE WRONG WAY, which is' \
    '     the difference between a training aid that is imperfect and' \
    '     one that is dangerous.  This logic was written backwards' \
    '     once during development and caught by hand, by a reader, not' \
    '     by any test.  Rules 12 to 18.' \
    '' \
    '  2  THE LIGHT TABLES.  Twenty-eight vessels, and every picture,' \
    '     question and answer is computed from them.  Two errors in' \
    '     them have already been found by users - both by somebody' \
    '     looking at a picture, trying to account for every light in' \
    '     it, and failing.  That is the most productive thing you can' \
    '     do with this program.  Rules 20 to 31 and Annex I.' \
    '' \
    '  3  THE LESSONS.  They paraphrase the rules rather than quote' \
    '     them.  A paraphrase that is nearly right is worse than one' \
    '     that is obviously wrong, because nobody checks it.' \
    '' \
    '  4  DISTRACTORS THAT ARE ALSO CORRECT.  The lights questions are' \
    '     proved to have a single right answer.  The encounters are' \
    '     not.  An option that is also defensible would mark you wrong' \
    '     for being right, and only a person can notice that.' \
    '' \
    '  And there is a tool for exactly this: "colregs review".  It walks' \
    '  through every one of those claims, one at a time, with the drawing' \
    '  in front of you, and builds a report you can send as a GitHub' \
    '  issue.  It does not send anything itself - it prints a link and' \
    '  you open it, so there is no credential in this program to leak and' \
    '  no server for anybody to run.  Credit is opt-in and by name; no' \
    '  email address is asked for or kept.' \
    '' \
    '  5  WHAT IS MISSING.  No test notices an absent vessel, an' \
    '     absent rule, or an exception that goes unmentioned.  Only' \
    '     somebody who knows the rules will see the hole.' \
    ''
}
