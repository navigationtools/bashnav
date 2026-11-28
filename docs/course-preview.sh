#!/bin/sh
#  Serve a private copy of PILOT's course from this Mac, for Larry's
#  read-through before anything is published (TBTY, 28 Nov 2026).
#
#    sh docs/course-preview.sh            (from the bashnav folder)
#
#  NOT READ-ONLY.  It writes one new folder,
#    ~/Downloads/claude_downloads/bashnav/course-preview-<date-time>/
#  and serves it until you press Ctrl-C.  It changes no repository and
#  commits nothing.  Each run makes a new folder and deletes none; move
#  old ones to ~/Downloads/_to_delete/ when you are done with them.
#
#  WHO CAN SEE IT.  While it runs: this Mac, and any device on the same
#  Wi-Fi, which is how the iPad reaches it.  Nobody on the internet.  macOS
#  may ask once whether Python may accept incoming connections: Allow lets
#  the iPad in; Deny keeps it to this Mac.
#
#  SETTINGS:  PORT (default 8765), PN_DIR (PILOT's folder, default
#  ../practical-navigator), PREVIEW_DIR (a different folder to write).
set -e
cd "$(dirname "$0")/.."
stamp=$(date +%Y%m%d-%H%M%S)
dest=${PREVIEW_DIR:-$HOME/Downloads/claude_downloads/bashnav/course-preview-$stamp}
mkdir -p "$(dirname "$dest")"
sh docs/course-copy.sh "$dest"
port=${PORT:-8765}
ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
echo
echo "  On this Mac:                http://localhost:$port/"
[ -n "$ip" ] && echo "  On the iPad, same Wi-Fi:    http://$ip:$port/"
echo "  Stop it with Ctrl-C.  The copy stays in $dest"
echo
exec python3 -m http.server "$port" --bind 0.0.0.0 --directory "$dest"
