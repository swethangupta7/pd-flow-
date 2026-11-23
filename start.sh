#!/usr/bin/env bash
# PD FLOW LAB — start it, or just re-open it if it is already running.
# Double-clicking the Desktop icon runs this with --quiet (no terminal output).
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")" || exit 1

QUIET=0
for a in "$@"; do [ "$a" = "--quiet" ] && QUIET=1; done
B=$'\033[1m'; C=$'\033[36m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[0m'

# locate node: PATH, then nvm, then a direct install
NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
  command -v node >/dev/null 2>&1 && NODE_BIN="$(command -v node)"
fi
if [ -z "$NODE_BIN" ]; then
  for cand in "$HOME"/.nvm/versions/node/*/bin/node /usr/bin/node /usr/local/bin/node; do
    [ -x "$cand" ] && NODE_BIN="$cand"
  done
fi

if [ -z "$NODE_BIN" ]; then
  MSG="PD Flow Lab needs Node.js. Install it with: sudo apt install nodejs"
  printf '%s\n' "$MSG" > .last-error.log
  command -v notify-send >/dev/null 2>&1 && notify-send "PD Flow Lab" "$MSG"
  if [ "$QUIET" -eq 0 ]; then
    printf '\n%s  %s%s\n\n  Press Enter to close.' "$Y" "$MSG" "$R"; read -r _
  fi
  exit 1
fi

if [ "$QUIET" -eq 0 ]; then
  printf '\n%s  PD FLOW LAB%s  — visual RTL to GDSII trainer\n' "$B$C" "$R"
  printf '  ──────────────────────────────────────────\n'
  printf '  node    %s\n' "$("$NODE_BIN" -v)"
  printf '  folder  %s\n\n' "$PWD"
  printf '%s  Opening your browser…%s\n' "$G" "$R"
  printf '  Stop it with the power button in the page, or Ctrl+C here.\n\n'
fi

"$NODE_BIN" server.mjs "$@"
STATUS=$?
if [ "$STATUS" -ne 0 ] && [ "$STATUS" -ne 130 ]; then
  printf 'server exited with code %s\n' "$STATUS" > .last-error.log
  command -v notify-send >/dev/null 2>&1 && notify-send "PD Flow Lab" "It stopped unexpectedly. See .last-error.log"
  if [ "$QUIET" -eq 0 ]; then
    printf '\n%s  It stopped (code %s).%s\n  Press Enter to close.' "$Y" "$STATUS" "$R"; read -r _
  fi
fi
exit "$STATUS"