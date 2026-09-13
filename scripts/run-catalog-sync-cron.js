/**
 * Coolify Scheduled Task (daily, e.g. 06:00 UTC):
 *   node scripts/run-catalog-sync-cron.js
 *
 * Env: CRON_SECRET (or EDITORIAL_CRON_SECRET), TMDB_API_KEY
 * Optional: CATALOG_SYNC_CRON_ENABLED=false to disable (default: enabled)
 *
 * Discovers new/upcoming theatrical titles from TMDB, ingests full cast,
 * and expands filmography for newly created top-billed actors.
 */
const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
if (!secret) {
  console.error("CRON_SECRET (or EDITORIAL_CRON_SECRET) is not set")
  process.exit(1)
}

if (process.env.CATALOG_SYNC_CRON_ENABLED === "false") {
  console.log("CATALOG_SYNC_CRON_ENABLED=false — skipping")
  process.exit(0)
}

const port = process.env.PORT || "3000"
const url = `http://127.0.0.1:${port}/api/cron/catalog-sync`

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
