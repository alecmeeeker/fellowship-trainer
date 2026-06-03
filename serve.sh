#!/usr/bin/env bash
# Fellowship Trainer — local static server.
# The app uses an ES-module Web Worker, which browsers will not load from a
# file:// URL — so it must be served over http. This is the one command.
#
# Responses carry `Cache-Control: no-store` so that editing the app and
# refreshing the browser always loads the current code. Without it the browser
# can keep a stale ES-module graph, which mounts as a blank page.
PORT="${1:-8000}"
cd "$(dirname "$0")"
echo "Fellowship Trainer running at  http://localhost:${PORT}"
echo "(Ctrl-C to stop)"
exec python3 - "$PORT" <<'PY'
import sys, http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

port = int(sys.argv[1])
http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
PY
