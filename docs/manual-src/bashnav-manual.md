# BASHNAV
## One icon, all the tools behind it

**Version {{VERSION}}** — the launcher: a list at a prompt, and a page in a
browser. Six tools for a boat with no signal.

---

## 1. What this is

BASHNAV is not a tool in its own right. It is the way in to the others:

| | |
|---|---|
| **celnav** | celestial navigation: sight reduction and the fix |
| **colregs** | the rules of the road, lights, and collision avoidance |
| **tides** | tide prediction for 8,334 stations |
| **deck-log** | the boat's records: deck, engine, provisions |
| **weather** | read your own barometer |
| **drill** | a study machine, browser build only |

It exists in two forms, and both of them are a list: one you read at a prompt,
one you tap.

---

## 2. Why a list rather than five icons

On an iPad each tool *can* have its own home-screen icon through a Shortcut —
but that needs the Shortcuts action set to run **in app** and not in the
extension, because the extension has no terminal and an interactive menu has
nothing to talk to. That is a setting people get wrong once and cannot
diagnose.

The launcher is the version that always works. It is also the honest answer on
a boat: **you are cold, the screen is wet, and finding the right icon among
five is worse than reading a list of five.**

---

## 3. At a prompt

Run `bashnav`. It prints the list, you pick a number, it runs that tool and
returns you to the list when the tool exits.

**How it finds the tools,** in this order, because a launcher that cannot find
them is worse than no launcher:

1. next to the launcher script itself;
2. a `bin/` directory beside it;
3. `~/Documents` — which is the place iOS actually lets an app write;
4. `~/bin`;
5. the current directory;
6. anything on your `PATH`.

A tool that is not found is shown as missing rather than failing when you pick
it.

---

## 4. In a browser

![**Figure 1** — the launcher page: six tools, the three display modes, and
what to do once.](fig/bashnav-launcher.png)

**Each tool is a separate page, so each one gets its own icon.** There is no
installer and nothing to update by hand: a tool reloads itself when its page
changes.

1. Open a tool.
2. In Safari, **Share → Add to Home Screen**.
3. Repeat for each tool you want on the screen.

### What offline actually means here

The first time you open a tool it caches itself. After that it runs with **no
network at all** — airplane mode, out of range, antenna down.

**Prove it once at the dock rather than discovering it at sea:** open every
screen of the tool, turn the network off, close it completely, and relaunch it
from the icon. A tool that was only ever opened online has never shown you
that it works offline; it has only shown you that the network works.

---

## 5. The display modes

The launcher page carries the same three modes as the tools, and they share one
setting across the whole suite.

{{INCLUDE:common-display-modes.md}}

---

## 6. Cautions

1. **Training aids and working tools, not a substitute for judgement.** Where
   any of these and the published rules, almanac or chart differ, the published
   source is right and this is wrong.
2. **The browser tools keep their data on the device they run on.** Nothing is
   uploaded and nothing is synchronised. Export anything you would mind losing.
3. **Prove offline before you need it.** See section 4; it takes five minutes
   alongside and cannot be done at sea.
