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
  const pageViewCount = await prisma.pageView.count({
    where: { createdAt: { lt: cutoff } },
  })
  const productEventCount = await prisma.productEvent.count({
    where: { createdAt: { lt: cutoff } },
  }).catch(() => 0)

  console.log(`PageViews older than ${days}d (before ${cutoff.toISOString()}): ${pageViewCount}`)
  console.log(`ProductEvents older than ${days}d: ${productEventCount}`)
  if (dry || (pageViewCount === 0 && productEventCount === 0)) {
    if (dry) console.log("DRY RUN — no deletes")
    return
  }

  if (!dry && pageViewCount > 0) {
    const result = await prisma.pageView.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })
    console.log(`Deleted PageViews: ${result.count}`)
  }

  if (!dry && productEventCount > 0) {
    const result = await prisma.productEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    }).catch(() => ({ count: 0 }))
    console.log(`Deleted ProductEvents: ${result.count}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
