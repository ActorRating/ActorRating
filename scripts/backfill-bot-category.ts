/**
 * Backfill PageView.botCategory from userAgent for bot-flagged rows.
 *
 * Coolify after migrate + redeploy:
 *   node scripts/backfill-bot-category.js
 *   node scripts/backfill-bot-category.js --hours 168 --dry
 *
 * Local:
 *   npx tsx scripts/backfill-bot-category.ts --hours 168
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient, type BotCategory } from "@prisma/client"
import { resolveBotCategory } from "../src/lib/analytics/bot-category"

const prisma = new PrismaClient()

async function main() {
  const hoursIdx = process.argv.indexOf("--hours")
  const hours =
    hoursIdx !== -1 && process.argv[hoursIdx + 1]
      ? Math.max(1, parseInt(process.argv[hoursIdx + 1], 10) || 168)
      : undefined
  const dry = process.argv.includes("--dry")
  const force = process.argv.includes("--force")

  const since = hours
    ? new Date(Date.now() - hours * 60 * 60 * 1000)
    : undefined

  console.log(
    `Backfill botCategory${since ? ` since ${since.toISOString()}` : " (all bots)"}${dry ? " [DRY]" : ""}${force ? " [FORCE]" : ""}`,
  )

  const rows = await prisma.pageView.findMany({
    where: {
      isLikelyBot: true,
      ...(force ? {} : { botCategory: null }),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: { id: true, userAgent: true },
  })

  console.log(`Rows to classify: ${rows.length}`)

  const byCategory = new Map<BotCategory, string[]>()
  for (const row of rows) {
    const cat = resolveBotCategory(true, row.userAgent) ?? "UNIDENTIFIED"
    const list = byCategory.get(cat)
    if (list) list.push(row.id)
    else byCategory.set(cat, [row.id])
  }

  for (const [cat, ids] of byCategory) {
    console.log(`  ${cat}: ${ids.length}`)
  }

  if (dry || rows.length === 0) {
    if (dry) console.log("DRY RUN — no writes")
    return
  }

  const BATCH = 500
  let updated = 0
  for (const [botCategory, ids] of byCategory) {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      const result = await prisma.pageView.updateMany({
        where: { id: { in: chunk } },
        data: { botCategory },
      })
      updated += result.count
    }
  }

  console.log(`Updated: ${updated}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
