/**
 * Coolify Scheduled Task (daily, e.g. 04:00 UTC):
 *   node scripts/run-performance-editorial-cron.js
 *
 * Env: CRON_SECRET (or EDITORIAL_CRON_SECRET)
 * Optional: EDITORIAL_CRON_LIMIT (default 25)
 *
 * Uses deterministic templates (no OpenAI).
 * Hits the local Next.js server so it uses the app DB connection.
 */
const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
if (!secret) {
  console.error("CRON_SECRET (or EDITORIAL_CRON_SECRET) is not set")
  process.exit(1)
}

const port = process.env.PORT || "3000"
const limit = (process.env.EDITORIAL_CRON_LIMIT || "25").trim()
const url = `http://127.0.0.1:${port}/api/cron/performance-editorial?limit=${encodeURIComponent(limit)}`

fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
  },
})
  .then(async (res) => {
    const body = await res.text()
    console.log(body)
    if (!res.ok) process.exit(1)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
