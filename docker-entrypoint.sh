#!/bin/sh
set -e
# Sitemaps must be complete before any HTTP traffic: Googlebot may crawl immediately after deploy.
echo "[sitemaps] Starting synchronous generation…"
if ! node /app/scripts/generate-sitemaps.js; then
  echo "[sitemaps] FATAL: Sitemap generation failed — refusing to start server."
  exit 1
fi
echo "[sitemaps] Generation complete. Starting Next.js…"
exec node server.js
