/**
 * Backfill: flag PageView rows that match the internal-referrer path-crawl pattern.
 *
 * Same ipHash, >15 distinct paths in any 10-minute window, every view in that
 * window has an actorrating.com referrer and no UTM params.
 *
 * Usage:
 *   npx tsx scripts/backfill-internal-crawl-bots.ts
 *   npx tsx scripts/backfill-internal-crawl-bots.ts --hours 48
 *   npx tsx scripts/backfill-internal-crawl-bots.ts --hours 48 --dry
 *
 * Coolify after redeploy (bundled into the image):
 *   node scripts/backfill-internal-crawl-bots.js --hours 48
 *   node scripts/backfill-internal-crawl-bots.js --hours 48 --dry
 *
 * Local:
 *   npx tsx scripts/backfill-internal-crawl-bots.ts --hours 48
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { collectInternalCrawlIds } from "../src/lib/analytics/internal-crawl"

const prisma = new PrismaClient()

async function main() {
  const hoursIdx = process.argv.indexOf("--hours")
  const hours =
    hoursIdx !== -1 && process.argv[hoursIdx + 1]
      ? Math.max(1, parseInt(process.argv[hoursIdx + 1], 10) || 48)
      : 48
  const dry = process.argv.includes("--dry")

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  console.log(`Scanning PageViews since ${since.toISOString()} (${hours}h)${dry ? " [DRY]" : ""}`)

  const rows = await prisma.pageView.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      ipHash: true,
      path: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      createdAt: true,
      isLikelyBot: true,
    },
    orderBy: [{ ipHash: "asc" }, { createdAt: "asc" }],
  })

  console.log(`Loaded ${rows.length} rows`)

  const byIp = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byIp.get(row.ipHash)
    if (list) list.push(row)
    else byIp.set(row.ipHash, [row])
  }

  const toFlag = new Set<string>()
  for (const [, group] of byIp) {
    for (const id of collectInternalCrawlIds(group)) {
      toFlag.add(id)
    }
  }

  const byId = new Map(rows.map((r) => [r.id, r]))
  let alreadyBot = 0
  const needUpdate: string[] = []
  for (const id of toFlag) {
    const row = byId.get(id)
    if (!row) continue
    if (row.isLikelyBot) alreadyBot += 1
    else needUpdate.push(id)
  }

  console.log(`Matching crawl pattern: ${toFlag.size} rows`)
  console.log(`  already isLikelyBot: ${alreadyBot}`)
  console.log(`  to update: ${needUpdate.length}`)
  console.log(
    `  distinct ipHashes involved: ${
      new Set([...toFlag].map((id) => byId.get(id)?.ipHash).filter(Boolean)).size
    }`,
  )

  if (dry || needUpdate.length === 0) {
    if (dry) console.log("DRY RUN — no writes")
    return
  }

  const BATCH = 500
  let updated = 0
  for (let i = 0; i < needUpdate.length; i += BATCH) {
    const chunk = needUpdate.slice(i, i + BATCH)
    const result = await prisma.pageView.updateMany({
      where: { id: { in: chunk }, isLikelyBot: false },
      data: { isLikelyBot: true },
    })
    updated += result.count
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
