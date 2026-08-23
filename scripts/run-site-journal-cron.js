/**
 * Coolify Scheduled Task (daily, e.g. 05:00 UTC):
 *   node scripts/run-site-journal-cron.js
 *
 * Env: CRON_SECRET (or EDITORIAL_CRON_SECRET)
 * Optional: SITE_JOURNAL_CRON_ENABLED=false to disable (default: enabled)
 *
 * Publishes 1 Story + 1 News to SiteEditorial (merged into /stories and /news).
 */
const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
if (!secret) {
  console.error("CRON_SECRET (or EDITORIAL_CRON_SECRET) is not set")
  process.exit(1)
}

if (process.env.SITE_JOURNAL_CRON_ENABLED === "false") {
  console.log("SITE_JOURNAL_CRON_ENABLED=false — skipping")
  process.exit(0)
}

const port = process.env.PORT || "3000"
const url = `http://127.0.0.1:${port}/api/cron/site-journal`

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
