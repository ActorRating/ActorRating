/**
 * Coolify Scheduled Task (every 5–15 min):
 *   node scripts/run-waitlist-invite-cron.js
 *
 * Uses CRON_SECRET from the app env. Hits the local Next.js server.
 */
const secret = (process.env.CRON_SECRET || "").trim()
if (!secret) {
  console.error("CRON_SECRET is not set")
  process.exit(1)
}

const port = process.env.PORT || "3000"
const url = `http://127.0.0.1:${port}/api/cron/waitlist-invite-emails`

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
