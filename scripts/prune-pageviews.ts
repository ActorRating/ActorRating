/**
 * Prune PageView rows older than 90 days so the table stays bounded.
 *
 * Manual for now (Coolify Terminal after image includes scripts, or local with DATABASE_URL):
 *   npx tsx scripts/prune-pageviews.ts
 *   npx tsx scripts/prune-pageviews.ts --days 90
 *   npx tsx scripts/prune-pageviews.ts --dry
 *
 * Later: Coolify Scheduled Task daily.
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const daysIdx = process.argv.indexOf("--days")
  const days =
    daysIdx !== -1 && process.argv[daysIdx + 1]
      ? Math.max(1, parseInt(process.argv[daysIdx + 1], 10) || 90)
      : 90
  const dry = process.argv.includes("--dry")

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const count = await prisma.pageView.count({
    where: { createdAt: { lt: cutoff } },
  })

  console.log(`PageViews older than ${days}d (before ${cutoff.toISOString()}): ${count}`)
  if (dry || count === 0) {
    if (dry) console.log("DRY RUN — no deletes")
    return
  }

  const result = await prisma.pageView.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  console.log(`Deleted: ${result.count}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
