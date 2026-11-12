# DRILL
## A study machine with no material in it

**Build {{VERSION}}** — sections, recall practice and a graded test that opens
the next section when you pass it. It ships empty, and what you load into it
never leaves your device.

---

## 1. What this is, and why it is empty

DRILL is the machine, not the material. It holds no questions, no reference
text and nothing of anybody's. You load a **content pack** from your own
device; it is read here in the browser, and it stays on the device it was
loaded on.

That is not a limitation, it is the design:

1. **Material somebody else owns can be studied without ever being
   published.** The machine is published; the material is yours and stays
   yours.
2. **It makes the permission conversation a short one.** You can show somebody
   the machine running, empty, and say "your material drops in as a pack —
   here is what it looks like loaded". If they say yes, publish the pack or
   hand it to them to maintain. If they say no, nothing needs undoing.
3. **Nothing is uploaded, ever.** The file is read by the page. There is no
   server to send it to.

![**Figure 1** — what a new copy looks like: the machine, empty, and one
pack of its own to show what a loaded one does.](fig/drill-empty.png)

### The sample pack

A new copy is not quite bare. **Try the sample pack** loads a small pack
about this tool itself — four sections, twenty-five questions and a pass
mark — so the sections opening in order, a graded test being marked, an
ordering question and the diagnostic can all be seen working before
anybody has written a pack.

It is fetched from beside the app and then goes through the same
validation and the same storage as a pack from your own device. That is
deliberate: a demonstration path of its own would be a second thing to
get wrong, and it would stop proving that the format works. Loading your
own pack replaces it.

---

## 2. How you study with it

| | |
|---|---|
| **The reference** | the pack's own text, always open — including for sections you have not reached |
| **Practice** | recall prompts: the question with no choices, and you check yourself |
| **The test** | graded questions, marked, with the answer and its source |
| **Where am I weak?** | a diagnostic across everything you have worked |

**Sections open in order.** The first is open from the start; each later one
opens when the one before it is **passed**. The pass mark is the pack's own,
and 80 per cent if the pack does not say.

**The reference is never locked.** Being locked out of a procedure you are
carrying this for is the one failure that would matter, so the text is always
readable even when the test is not yet open.

**Studied means worked, not opened.** Reading the reference does not count as
studying a section; a recall prompt marked or a test taken does.

**Recall first, then the graded ones.** A section's practice run puts the
author's own recall prompts first, because they are the harder kind, and then
asks the graded questions as recall rather than as a list of choices.

---

## 3. The content pack

A pack is a single JSON file named `*.drillpack.json`. It is loaded from the
page, validated whole, and kept in the browser's own database. Loading a pack
**replaces** the one that was there.

### The shape of it

```json
{
  "format":   "bashnav-drill-pack/1",
  "title":    "Rx72 deck procedures",
  "note":     "shipshape, private",
  "built":    "2026-11-12",
  "pass":     80,
  "sections": [
    { "id": "s1", "title": "Reefing", "html": "<p>The reference text…</p>" }
  ],
  "questions": [
    {
      "section": "s1",
      "q":  "What is the first action on the call to reef?",
      "a":  "Ease the kicker and take the weight on the topping lift.",
      "ch": ["Drop the halyard", "Bear away to dead downwind"],
      "where": { "part": "Deck", "sub": "Reefing", "row": "3" },
      "kind": "hand"
    }
  ],
  "back": "<p>Anything to print after the last section.</p>"
}
```

### Every field

**The pack**

| field | required | |
|---|---|---|
| `format` | **yes** | must begin `bashnav-drill-pack/`; anything else is refused as not a pack |
| `sections` | **yes** | a non-empty list |
| `questions` | **yes** | a non-empty list |
| `title` | no | shown at the top; "Content pack" if absent |
| `note` | no | a line under the title — who it is from, whether it is private |
| `built` | no | the pack's own date, shown beside the app's build. **Worth setting:** it is how you tell a rebuilt pack from the one it replaced |
| `pass` | no | the pass mark as a percentage; 80 if absent |
| `back` | no | HTML printed after the last section in the reference |

**A section**

| field | required | |
|---|---|---|
| `id` | **yes** | unique within the pack; questions refer to it |
| `title` | **yes** | |
| `html` | no | the reference text for this section |

**A question**

| field | required | |
|---|---|---|
| `section` | **yes** | must be the `id` of a section in this pack |
| `q` | **yes** | the prompt |
| `a` | no | the answer. **Its presence is what makes a question graded;** a question with no `a` is a recall prompt, and you mark yourself against the reference |
| `ch` | no | wrong options to offer alongside the answer. None may equal `a`, and none may repeat |
| `seq` | no | an ordering question: the steps in their right order, three or more, none repeated |
| `extra` | no | required when `seq` is present: one or more steps that do **not** belong, none of which may also be in `seq` |
| `where` | no | the citation shown under the question: `{ "part": …, "sub": …, "row": … }` |
| `kind` | no | `"hand"` marks a question written by hand rather than generated, and it is labelled as such when asked |

### What a pack is refused for

The pack is validated **whole** and rejected whole, because loading half of one
gives a drill with silent holes in it. The reasons, in the tool's own words:

1. *that file does not declare itself a drill pack* — the `format` string.
2. *the pack has no sections* / *no questions*.
3. *section N has no id or title*, or *two sections share the id X*.
4. *N questions belong to sections the pack does not contain*.
5. *question N offers its own answer as a wrong option* — that is a question
   with two right answers, and the mark it gives is a lie either way. Cheap to
   check here; impossible to notice while drilling.
6. *question N offers the same wrong option twice*.
7. *question N has fewer than three steps to order*, *lists the same step
   twice*, *has no step that does not belong*, or *offers a real step as the
   one that does not belong*.

### Writing a pack

1. **Generate it.** A pack is data; hand-maintained JSON drifts from whatever
   the questions came out of. Keep the generator with the source material.
2. **Set `built`.** Without it, a rebuilt pack is indistinguishable from the
   one it replaced, and a question you were sure you had fixed comes round
   again.
3. **Cite with `where`.** A question whose answer cannot be traced back to the
   material is a question nobody can settle an argument about.
4. **Keep the reference complete.** It is the part that is always open, and the
   part that is actually carried.

---

## 4. Where the material lives, and who writes packs

The machine is published at `bashnav.navigationtools.org/web/drill/`. Packs
are not published with it. Three kinds are expected:

1. **Public packs** to go with the Practical Navigator's lessons.
2. **Private packs** for a particular boat's equipment, never published.
3. **Material owned by somebody else**, kept wherever its owner wants it kept
   and loaded by the person entitled to it.

---

## 5. Offline, and putting it on the home screen

1. Open it once with a signal.
2. **Share → Add to Home Screen.**
3. It runs with the antenna down. The pack and your progress are in the
   browser's own database on that device.

**A pack is not a backup.** It lives in one browser on one device. Keep the
file itself somewhere you can load it again.

---

## 6. The display modes

{{INCLUDE:common-display-modes.md}}

---

## 7. Cautions

1. **The pack is the authority, and this tool is not.** A graded answer is the
   pack author's answer. Where a pack and the real procedure differ, the
   procedure is right.
2. **Your progress is per device and per browser.** Clearing site data clears
   it, and it does not follow you to another device.
3. **Loading a pack replaces the one held.** Progress is kept per section id,
   so a rebuilt pack that keeps its ids keeps your progress — which is what you
   want, and also why `built` matters when the questions have changed.
4. **Do not load a pack you were not given.** The material is somebody's
   property and this tool makes no claim on it either way.
