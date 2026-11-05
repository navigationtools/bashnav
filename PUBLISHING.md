# Publishing this to GitHub

Everything here is ready to push. What it needs from you is a GitHub account and
about ten minutes. Run **one block at a time** and check the output before moving
on. Blocks are marked *(read-only)* or *(changes things)*.

> **The repository does not exist until you do step 3.** Until then,
> `github.com/navigationtools/bashnav` is a 404 — which is what the link from
> `colregs review` will land on, and what any link in the README points at. That
> is expected, not a fault: nothing is lost, and a review already written is
> saved as a file on the reviewer's own machine to send once the repo is up.

## 1. Your username — (read-only)

Already filled in throughout as **`navigationtools`**. Nothing to do unless you want a
different account, in which case set it here and run step 2:

```sh
GH_USER=navigationtools
```

## 2. Put your username into the files — (changes things)

Two files carry a placeholder: the README's clone command and the site's links.

```sh
X && rm -f README.md.bak
GH_USER="$GH_USER" ./docs/make-site.sh
```

*(On macOS `sed -i.bak` is correct as written; the `.bak` file is removed for you.)*

## 3. Check it still builds and passes — (read-only)

```sh
./build.sh && ./tests/run-tests.sh && ./tests/golden.sh
```

You want `ALL TESTS PASSED` and `GOLDEN: no output changed`. If your machine has
`dash`, `mawk` and `gawk`, run the full matrix instead:

```sh
SHELLS="dash bash" AWKS="mawk gawk" ./tests/run-tests.sh
```

## 4. Make it a git repository — (changes things)

If you have never used git on this machine, set your name and email first;
they go into every commit.

```sh
git config --global user.name "Larry Sherman"
git config --global user.email "m.larry.sherman@gmail.com"
```

Then:

```sh
git init
git add .
git commit -m "Bash Navigation Software: celnav 1.5 and colregs 1.15"
git branch -M main
```

## 5. Create the repository on GitHub — (changes things)

**The simple way, in a browser.** Go to **github.com/new**. Repository name
`bashnav`, description *Marine navigation tools in POSIX shell and awk*, set it
**Public**, and **add nothing**: leave "Add a README", "Add .gitignore" and
"Choose a license" all untouched. You already have all three, and if GitHub
creates its own the push in step 6 is rejected with `Updates were rejected
because the remote contains work that you do not have locally` — which is the
single most common way a first push goes wrong. An empty repository is what you
want; GitHub will show you a page of setup commands, which you can ignore
because step 6 is the same thing.

**Or, if you have the `gh` command installed and signed in:**

```sh
gh repo create bashnav --public --source=. --description "Marine navigation tools in POSIX shell and awk"
```

If you used `gh`, skip to step 7.

## 6. Push it — (changes things)

```sh
git remote add origin https://github.com/$GH_USER/bashnav.git
git push -u origin main
```

GitHub will ask you to authenticate. It will not take your account password:
use a **personal access token** as the password. Create one at
**github.com/settings/tokens** → Generate new token (classic) → tick `repo` →
generate, then copy it. Paste it when git asks for a password. Save it in your
password manager; GitHub shows it once.

## 7. Turn on the website — (changes things)

In the repository: **Settings → Pages**. Under "Build and deployment", set
Source to **Deploy from a branch**, Branch to **main**, folder to **/docs**, and
Save.

A minute or two later the site is live at the Pages address,
`https://YOUR-USERNAME.github.io/bashnav/`.

**bashnav does not stay there.** `docs/CNAME` holds a custom domain, so once
DNS is in place Pages serves the site at:

```
https://bashnav.navigationtools.org/
```

That file is the whole mechanism: Pages reads `CNAME` from the published
folder and serves the site at the name inside it. Delete it and the site falls
back to the `github.io` address.

Put that URL into the repository's "About" panel (the gear icon top right of the
repository home page) along with a few topics: `navigation`, `celestial-navigation`,
`colregs`, `sailing`, `posix`, `shell`, `awk`.

### `github.com` and `github.io` are two different things

Worth understanding before you point anyone at either.

**`github.com` is the forge.** It holds the repository: files, history, issues,
settings. What you see there is GitHub's own application showing you your
repository — it renders the README for you and gates Settings behind your login.

**The published site is a plain web host.** Pages takes one folder from one
branch and serves it as an ordinary website. No application, no rendering, no
login. `bashnav.navigationtools.org/web/drill/` is `docs/web/drill/index.html`
handed out the way any web server hands out a file.

Without a custom domain the mapping is mechanical — account name becomes the
subdomain, repository name becomes the first path segment:

    github.com/navigationtools/bashnav      the repository
    navigationtools.github.io/bashnav/      what Pages would serve by default

**`docs/CNAME` replaces that**, and it changes the shape of the address as
well as the name. The site moves to the root of its own subdomain, so the
`/bashnav/` path segment disappears:

    bashnav.navigationtools.org/            the front page
    bashnav.navigationtools.org/web/        the launcher
    bashnav.navigationtools.org/web/drill/  one tool

Nothing inside the apps had to change for that, and it is worth knowing why:
every service worker registers `sw.js` with no leading slash, and every
manifest uses `"./"` for `start_url` and `scope`. They are relative throughout,
so they work at whatever depth they are served from. The only things that knew
the old path were the links on the front page, and those come from one setting
in `docs/make-site.sh`.

**Why two domains rather than one.** A published page can run JavaScript. Served
from `github.com`, that JavaScript would share an origin with the cookie that
keeps you logged in — and a browser lets same-origin code read it, so anyone
publishing a page could harvest the logins of whoever visited. A separate domain
is a separate origin, so published code cannot reach GitHub's session at all.

The browser build depends on the same mechanism: its origin is
`bashnav.navigationtools.org`, and a deck log in IndexedDB or a drill pack in
storage is keyed to that origin. A changed URL is a changed storage key, so
anything saved in the browser belongs to the address it was saved at. The
earlier move of the apps to `docs/web/` was arranged to keep the URL identical
for exactly that reason.

**The move to the organisation changed it**, from `larrys614.github.io/bashnav/`
to `bashnav.navigationtools.org/`, and that cost was accepted deliberately: the
new address starts with empty browser storage. A deck log written at the old
address stays there, on the device that wrote it, and is still readable while
that device holds the old cached copy — but it does not follow the app to the
new address, and nothing in the browser can carry it across. Export anything
worth keeping from the old address before relying on the new one.

**The custom domain is the reason this is a one-off.** `bashnav.navigationtools.org`
is a name Larry owns, so the origin is no longer tied to where the files happen
to be hosted. If the site later moves off GitHub Pages, the address — and
therefore every saved deck log and loaded drill pack — goes with it.

**The distinction that matters most here:** `.io` serves only what is under the
published folder. `.com` shows **everything in the repository**, served or not.
`src/`, `bin/`, `tests/` and `release/` are not part of the website, and are
still fully visible to anyone on `.com`, because the repository is public.
*Not served* is not *not public*. See `CLAUDE.md` on staging.

## 8. Offer the two files as a release — (changes things, optional)

People who only want the tools should not have to clone anything.

```sh
git tag -a v1.1 -m "celnav 1.1, colregs 1.0"
git push origin v1.1
```

Then on GitHub: **Releases → Draft a new release**, choose tag `v1.1`, and drag
`bin/celnav` and `bin/colregs` into the binaries box. Now anyone can download a
single working file straight from the release page.

---

## Afterwards

**Changing anything.** Edit files in `src/`, never in `bin/`. Then:

```sh
./build.sh && ./tests/run-tests.sh && ./docs/make-site.sh
```

CI runs the same three things on every push and will tell you if `bin/` was left
out of date.

**The site rebuilds from real output.** `docs/make-site.sh` runs the tools and
drops their actual output into the page, so the screenshots on the site can never
drift away from what the programs do.

**Issues and pull requests.** `CONTRIBUTING.md` sets out what you will want from
contributors: POSIX shell and awk only, no dependencies, edit `src/` not `bin/`,
add a test. It also tells people how to report an error in the COLREGs content —
which is the class of bug most worth catching.

## After the first push — check the review link works

`colregs review` builds a link to an issue on the repository you have just
created. Until the repository exists that link is a 404; once it exists, walk it
once yourself end to end:

```sh
./bin/colregs review     # 2, flag one thing, q, then 9
```

Open the link it prints. GitHub should show a **new issue form, already filled
in**, with a title like `colregs review: 1 flagged` and your note in the body.
Do not submit it — just check it arrives complete, then close the tab.

Two things to know about that link:

- It carries no `labels=` parameter on purpose, so it does not depend on a label
  existing in the repository. Label review issues yourself once they arrive.
- A very long review will not fit in a URL. The tool detects that, writes the
  report to `~/.colregs/review-report.md` instead, and tells the reviewer to
  attach it to a new issue. Worth testing that path too if you want to be
  thorough: answer thirty or forty claims with notes and try to submit.
