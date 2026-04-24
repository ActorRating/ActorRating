#!/bin/sh
# Starts the Next.js server immediately, then generates sitemaps in the background.
# The server is never blocked or delayed by sitemap generation.

(
  echo "[sitemaps] Generation started in background…"
  if node /app/scripts/generate-sitemaps.js; then
    echo "[sitemaps] Generation complete."
  else
    echo "[sitemaps] WARNING: Generation failed – stale or missing sitemaps will be served until next restart."
  fi
) &

exec node server.js
