/**
 * Coolify Scheduled Task (daily recommended, e.g. 04:00 UTC):
 *   node scripts/run-generate-sitemaps-cron.js
 *
 * Regenerates /app/public/sitemaps so newly indexable /rate pages
 * (community rating_count ≥ 2, non-MINOR) appear without waiting for a redeploy.
 *
 * Also runs automatically on every container start via docker-entrypoint.sh.
 * This cron closes the gap between deploys as anonymous ratings accumulate.
 *
 * Disable: SITEMAP_CRON_ENABLED=false
 */
if (process.env.SITEMAP_CRON_ENABLED === "false") {
  console.log("SITEMAP_CRON_ENABLED=false — skipping sitemap generation")
  process.exit(0)
}

const { spawnSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const scriptJs = path.join(__dirname, "generate-sitemaps.js")
if (!fs.existsSync(scriptJs)) {
  console.error(`Sitemap generator missing at ${scriptJs}`)
  process.exit(1)
}

console.log(`[sitemaps-cron] Starting ${scriptJs} at ${new Date().toISOString()}`)
const result = spawnSync(process.execPath, [scriptJs], {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(__dirname, ".."),
})

if (result.error) {
  console.error("[sitemaps-cron] Failed to spawn generator:", result.error)
  process.exit(1)
}

const code = result.status ?? 1
console.log(`[sitemaps-cron] Finished with exit code ${code}`)
process.exit(code)
