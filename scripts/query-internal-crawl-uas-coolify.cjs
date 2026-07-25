/**
 * Paste into Coolify /app after redeploy, or:
 *   node -e "$(cat scripts/query-internal-crawl-uas-coolify.cjs)"
 *
 * Self-contained: no tsx, uses /app Prisma client.
 */
const { PrismaClient } = require("@prisma/client")

const MIN_DISTINCT = 15
const WINDOW_MS = 10 * 60 * 1000
const INTERNAL = new Set(["actorrating.com"])

function isInternal(ref) {
  if (!ref || !String(ref).trim()) return false
  try {
    const host = new URL(ref).hostname.replace(/^www\./i, "").toLowerCase()
    return INTERNAL.has(host)
  } catch {
    return false
  }
}

function isInternalOnlyNoUtm(r) {
  if (!isInternal(r.referrer)) return false
  if ((r.utmSource || "").trim()) return false
  if ((r.utmMedium || "").trim()) return false
  if ((r.utmCampaign || "").trim()) return false
  return true
}

function collectIds(rows) {
  const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt)
  const flagged = new Set()
  let left = 0
  for (let right = 0; right < sorted.length; right++) {
    const rt = sorted[right].createdAt.getTime()
    while (left <= right && rt - sorted[left].createdAt.getTime() > WINDOW_MS) left++
    const win = sorted.slice(left, right + 1)
    if (!win.every(isInternalOnlyNoUtm)) continue
    if (new Set(win.map((w) => w.path)).size > MIN_DISTINCT) {
      for (const w of win) flagged.add(w.id)
    }
  }
  return flagged
}

async function main() {
  const prisma = new PrismaClient()
  try {
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

    const byIp = new Map()
    for (const row of rows) {
      if (!byIp.has(row.ipHash)) byIp.set(row.ipHash, [])
      byIp.get(row.ipHash).push(row)
    }

    const flaggedIds = new Set()
    for (const group of byIp.values()) {
      for (const id of collectIds(group)) flaggedIds.add(id)
    }

    const last50 = rows
      .filter((r) => flaggedIds.has(r.id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)

    const uas = [...new Set(last50.map((r) => r.userAgent))].sort()

    console.log(
      JSON.stringify(
        {
          scannedRows: rows.length,
          matchingRuleIn48h: flaggedIds.size,
          last50Count: last50.length,
          distinctUserAgentCount: uas.length,
          distinctUserAgents: uas,
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
