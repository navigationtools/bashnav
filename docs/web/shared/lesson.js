/* =====================================================================
   THE LESSON NAMES, ONCE, FOR EVERY TOOL (Larry's ruling ALI,
   17 November 2026).  A course lesson links a tool with ?lesson=<name>,
   and the tool shows "Back to the lesson".  tides has done this since
   11 November; the weather app's "wind from the isobars" screen does it
   for Level 3a.  The rule for what a lesson name is lives here, in one
   file both tools load, so the two can never disagree about it (README
   rule 8: derive rather than keep two copies).

   A lesson is named by its level, its race year where it has one, and
   its number (Larry, 11 November 2026; Level 3a added by ALA,
   16 November 2026):

       l1-3          Level 1, lesson 3.  Level 1 is shared by both race
                     years, so it carries no year.
       l3-2025-4     Level 3, 2025, lesson 4.  Levels 2 to 5 run one
                     track per race year, so the year is part of the name.
       l3a-2025-1    Level 3a, Reading the forecast, the same way.

       ?lesson=l3-2025-4 -> COURSE_BASE + 'l3-2025.html#l3-2025-4'
       ?lesson=l1-3      -> COURSE_BASE + 'l1.html#l1-3'

   THE PAGE IS DERIVED FROM THE NAME: the name without its trailing
   lesson number is the track, and that is the page.  No table of pages.

   The check runs BEFORE a link is built, so nothing from a URL reaches
   an href unless it is exactly a lesson name.  It is strict so that a
   lesson has exactly ONE name:
     1. a year is REFUSED for Level 1 (l1-2025-3) and REQUIRED for the
        others (l3-4, l3a-4 are refused);
     2. the lesson number has no leading zero (l1-03) and is not zero;
     3. the year is four digits beginning 20 (l3-25-4 is refused);
     4. the levels are exactly 1, 2, 3, 3a, 4, 5 (l6-1, l3b-2025-1 are
        refused); a new level is one change here, with its tests.
   Refused with them: every old-style name (a6-2, c9-14), so a stale
   link in a page that was not updated fails visibly.
   ===================================================================== */
'use strict';
var LESSON_NAMES = (function () {
  /*  The Practical Navigator course, its coastal section: the one
      constant every back link starts from.  Same origin as the tools. */
  var COURSE_BASE = 'https://bashnav.navigationtools.org/practical-navigator/coastal/';
  var NAME = /^(l1-[1-9][0-9]*|l(?:[2-5]|3a)-20[0-9]{2}-[1-9][0-9]*)$/;
  function href(lesson) {
    if (typeof lesson !== 'string' || !NAME.test(lesson)) return null;
    return COURSE_BASE + lesson.replace(/-[1-9][0-9]*$/, '') + '.html#' + lesson;
  }
  return { COURSE_BASE: COURSE_BASE, NAME: NAME, href: href };
})();
if (typeof module !== 'undefined') module.exports = LESSON_NAMES;
