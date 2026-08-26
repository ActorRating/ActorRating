/**
 * Backfill: flag PageView rows matching internal-crawl patterns:
 *  1) Per-IP: >6 distinct paths / 10m, all internal referrer + no UTM (guest, not /admin)
 *  2) Entity: ≥4 distinct /actors|/directors / 30m, same guest internal/no-UTM shape
 *  3) Fleet: rotating-IP internal crawl window
 *
 * Sets botCategory from userAgent (KNOWN_CRAWLER vs UNIDENTIFIED).
 *
 * Coolify after redeploy:
 *   node scripts/backfill-internal-crawl-bots.js --hours 168
 *   node scripts/backfill-internal-crawl-bots.js --hours 168 --dry
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient, type BotCategory } from "@prisma/client"
import { resolveBotCategory } from "../src/lib/analytics/bot-category"
import {
  collectInternalCrawlIds,
  collectInternalEntityCrawlIds,
  collectInternalFleetIds,
} from "../src/lib/analytics/internal-crawl"

const prisma = new PrismaClient()

async function main() {
  const hoursIdx = process.argv.indexOf("--hours")
  const hours =
    hoursIdx !== -1 && process.argv[hoursIdx + 1]
      ? Math.max(1, parseInt(process.argv[hoursIdx + 1], 10) || 168)
      : 168
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
      userId: true,
      userAgent: true,
    },
    orderBy: [{ createdAt: "asc" }],
  })

  console.log(`Loaded ${rows.length} rows`)

  const byIp = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byIp.get(row.ipHash)
    if (list) list.push(row)
    else byIp.set(row.ipHash, [row])
  }

  const perIpIds = new Set<string>()
  const entityIds = new Set<string>()
  for (const [, group] of byIp) {
    for (const id of collectInternalCrawlIds(group)) perIpIds.add(id)
    for (const id of collectInternalEntityCrawlIds(group)) entityIds.add(id)
  }

  const fleetIds = collectInternalFleetIds(rows)

  const toFlag = new Set<string>([...perIpIds, ...entityIds, ...fleetIds])
  const byId = new Map(rows.map((r) => [r.id, r]))
  let alreadyBot = 0
  const needUpdate: string[] = []
  for (const id of toFlag) {
    const row = byId.get(id)
    if (!row) continue
    if (row.isLikelyBot) alreadyBot += 1
    else needUpdate.push(id)
  }

  console.log(`Per-IP crawl matches: ${perIpIds.size}`)
  console.log(`Entity crawl matches: ${entityIds.size}`)
  console.log(`Fleet crawl matches: ${fleetIds.size}`)
  console.log(`Union to flag: ${toFlag.size}`)
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

  const byCategory = new Map<BotCategory, string[]>()
  for (const id of needUpdate) {
    const row = byId.get(id)
    if (!row) continue
    const cat = resolveBotCategory(true, row.userAgent) ?? "UNIDENTIFIED"
    const list = byCategory.get(cat)
    if (list) list.push(id)
    else byCategory.set(cat, [id])
  }

  const BATCH = 500
  let updated = 0
  for (const [botCategory, ids] of byCategory) {
    console.log(`  writing ${botCategory}: ${ids.length}`)
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      const result = await prisma.pageView.updateMany({
        where: { id: { in: chunk }, isLikelyBot: false },
        data: { isLikelyBot: true, botCategory },
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
