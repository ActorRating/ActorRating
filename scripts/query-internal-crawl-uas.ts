/**
 * One-off: last 50 PageViews matching internal-crawl rule → distinct userAgents.
 *   npx tsx scripts/query-internal-crawl-uas.ts
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { collectInternalCrawlIds } from "../src/lib/analytics/internal-crawl"

const prisma = new PrismaClient()

async function main() {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000)
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
      userAgent: true,
    },
    orderBy: [{ ipHash: "asc" }, { createdAt: "asc" }],
  })

  const byIp = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byIp.get(row.ipHash)
    if (list) list.push(row)
    else byIp.set(row.ipHash, [row])
  }

  const flaggedIds = new Set<string>()
  for (const [, group] of byIp) {
    for (const id of collectInternalCrawlIds(group)) flaggedIds.add(id)
  }

  const flagged = rows
    .filter((r) => flaggedIds.has(r.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50)

  const uas = [...new Set(flagged.map((r) => r.userAgent))].sort()

  console.log(
    JSON.stringify(
      {
        scannedRows: rows.length,
        matchingRuleIn48h: flaggedIds.size,
        last50Count: flagged.length,
        distinctUserAgentCount: uas.length,
        distinctUserAgents: uas,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
