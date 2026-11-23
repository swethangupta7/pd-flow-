#!/usr/bin/env bash
# PD FLOW LAB — start the local server and open it in your browser.
# usage:  ./run.sh          (port 5173)
#         ./run.sh 5180     (custom port)
set -euo pipefail
cd "$(dirname "$0")"
exec node server.mjs "${1:-5173}"