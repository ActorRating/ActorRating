/**
 * Coolify Scheduled Task (daily recommended, e.g. 03:30 UTC):
 *   node scripts/run-reclassify-pageviews-cron.js
 *
 * Retro-flags visitors with many pageviews and zero engagement as bots so the
 * admin Traffic tab's Unknown bucket shrinks over time.
 *
 * Disable: RECLASSIFY_CRON_ENABLED=false
 */
if (process.env.RECLASSIFY_CRON_ENABLED === "false") {
  console.log("RECLASSIFY_CRON_ENABLED=false — skipping pageview reclassification")
  process.exit(0)
}

const { spawnSync } = require("child_process")
const path = require("path")

const script = path.join(__dirname, "reclassify-unknown-pageviews.ts")
console.log(`[reclassify-cron] Starting ${script} at ${new Date().toISOString()}`)
const result = spawnSync("npx", ["tsx", script], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
})
process.exit(result.status ?? 1)
