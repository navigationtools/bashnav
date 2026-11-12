# colregs — the web build

Drop this directory in at `docs/web/colregs/` in the bashnav repo.

## What it is

The colregs training aid, rebuilt for a browser. Lights, day shapes, sound
signals, encounters and the fifteen rule lessons — the same content as
`bin/colregs` v1.15, because the content was extracted *by running that
engine*, not retyped.

## Why it is not just a port

Three things a terminal could not do:

1. **Night mode that works.** `[ -t 1 ]` returns false under a-Shell, so the
   terminal version's red-on-black mode never appeared on an iPad. Here it is a
   token swap in CSS and it cannot be lied about. Every lamp goes red and the
   W/R/G/Y letters carry the pattern — exactly the fallback the awk engine was
   written with.
2. **The lamps are lamps.** They were characters on a grid because that was the
   only output a terminal had. Now they are drawn, with the hull, the mast
   droplines and the sea, from any bearing you drag to.
3. **Sound signals make a sound.** The awk engine says, in a comment, "a script
   cannot make a noise, so it draws one." A browser can. Short blasts, prolonged
   blasts and the bell are synthesised, at their real durations — a prolonged
   blast is supposed to feel long.

## Files

| file | |
|---|---|
| `index.html` | structure only |
| `colregs.css` | two modes as a token swap: dark, and NIGHT |
| `colregs.js` | geometry, rendering, audio, drills |
| `data.js` | **generated** — see below |
| `sw.js` | service worker, cache-first |
| `manifest.webmanifest`, `icon.svg` | home-screen install |

## The data is generated, not transcribed

`data.js` was produced by appending a dumper to the awk engine's own table
initialisers and printing what they built — `ves_init()`, `shp_init()`,
`enc_init()`, `snd_init()`, and the fifteen `les()` lessons. Twenty-eight
vessels, ten shapes, twenty-eight encounters, fifteen signals, fifteen
lessons. The page no longer writes those counts down: each reference list
labels itself from the data it is about to render, because the data grows
when the shell engine does and prose cannot follow it.

**Do not hand-edit it.** Regenerate it, so the web build and the shell build
cannot drift. The dumper is in `work/` alongside this.

## The geometry is verified, not assumed

`arc_vis`, `nrm180`, `nrm360`, the `u = x·sin θ − y·cos θ` projection and the
hull half-width are ported function-for-function, with the same names, so the
awk and the JS can be read side by side.

They are also **diffed**: both implementations are run over all 361 integer
bearings from −180 to +180 and the output compared. It is identical.

That check earned its keep immediately. The first port used `±0.001` for the
sidelight cut-off, from an older copy of the engine. v1.15 uses **±2.5°**, with
a comment explaining that Annex I allows the cut-off to fall up to 3° outside
the prescribed sector, so there is a small arc right ahead where both
sidelights are seen. Without it the drawing claims you are dead ahead of her
while showing one sidelight. The diff caught the regression on four bearings.

## The drill, and why the reveal button went away

The lights, day-shapes and sound-signal views originally ended in a single
**Show me what she is** button. That trains the wrong thing: recognising a
correct answer once it is in front of you is far easier than producing it,
and the second is what a watch leader actually has to do at night.

Each of those three views now asks the question properly. Six tappable rows:
five candidates, one of them right, and a sixth row that gives up and tells
you. Rows rather than a dropdown because a native picker on iOS costs three
gestures — tap, scroll, confirm — where a row costs one, and because a row
can turn right or wrong in place.

**The four wrong answers are chosen to be confusable with the right one.**
Each candidate is scored on how much of its signature it shares with the
answer — lamp colours for lights, the glyph stack for day shapes, the
sequence of blast kinds for sounds — and the closest four are offered, with
a little noise so the same question is not always the same five rows.
Measured over the whole data set, the candidates offered share 3.79 lamp
colours with the answer against 2.74 for random picks; shapes 0.68 against
0.38; sounds 2.05 against 1.25. A trawler is therefore set against a mine
clearance vessel and a pilot vessel on duty, not against a seaplane.

A wrong tap marks that row and leaves the other rows live, so a miss costs
you another look at the picture rather than ending the question.

**This also repaired a night-mode fault in the encounter rows.** Right and
wrong were distinguished by a green or red border, and in NIGHT mode every
colour token collapses to red — so the two states were identical where it
matters most. The verdict now carries a tick or a cross, which is the same
discipline the W/R/G/Y lamp letters already follow: the pattern has to work
with no colour at all.

## Offline

The service worker caches everything on first visit, cache-first, because
nothing here changes while you are offshore and a network lookup you cannot
satisfy is only latency. Add to the home screen and it behaves like an app.

Opened straight from Files it also works — the data is in a script rather than
fetched — but there is no cache to install and no icon.

## One deliberate inversion

Day shapes are **black**. Drawing them white on a night sky would be backwards,
so in dark mode that one view gets a daylight sky and black shapes. In night
mode it stays red on black: if you are dark-adapted, a bright panel costs you
twenty minutes, and that outranks fidelity.

## Not in this build

**The collision-avoidance scenario** — the radar plot, three timed
observations, the vector triangle, CPA and the true-motion animation. It is the
largest single piece in the engine and deserves its own pass rather than being
rushed in alongside everything else. Everything needed for it is already in
`bin/colregs`; nothing here blocks it.

## Still a training aid

The notice in the footer is the same one `colregs about` prints, and it means
the same thing. The rules are published by the IMO and are what govern at sea.
