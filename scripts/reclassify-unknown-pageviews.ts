/**
 * Flag visitors (ar_vid) with ≥5 pageviews in the last 48h and zero engagement
 * signals as UNIDENTIFIED bots (botReason = reclassified_no_engagement).
 *
 * Run on VPS inside /app:
 *   npx tsx scripts/reclassify-unknown-pageviews.ts          # apply
 *   npx tsx scripts/reclassify-unknown-pageviews.ts --dry    # preview only
 *
 * Coolify Scheduled Task (daily, e.g. 03:30 UTC):
 *   node scripts/run-reclassify-pageviews-cron.js
 */
import { PrismaClient } from "@prisma/client"
import { reclassifyUnknownPageViews } from "../src/lib/analytics/reclassify"

const prisma = new PrismaClient()
const dryRun = process.argv.includes("--dry")

async function main() {
  const result = await reclassifyUnknownPageViews(prisma, { dryRun })
  console.log(
    `[reclassify] ${result.dryRun ? "DRY RUN — " : ""}visitors=${result.candidateVisitors} pageviews=${result.flaggedPageviews}`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
