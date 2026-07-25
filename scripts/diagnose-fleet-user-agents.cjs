/**
 * Distinct userAgents among fleet-shaped traffic (last N hours).
 * Coolify:
 *   NODE_PATH=/app/node_modules node /tmp/diag-fleet-uas.cjs
 */
const { PrismaClient } = require("@prisma/client")

const WINDOW_MS = 10 * 60 * 1000
const FLEET_MIN_IPS = 25
const FLEET_MIN_PATHS = 25
const FLEET_MIN_VIEWS = 40
const INTERNAL = new Set(["actorrating.com"])
const HOURS = 2

function isInternal(ref) {
  if (!ref || !String(ref).trim()) return false
  try {
    const host = new URL(ref).hostname.replace(/^www\./i, "").toLowerCase()
    return INTERNAL.has(host)
  } catch {
    return false
  }
}

function isFleetEligible(r) {
  if ((r.path || "").startsWith("/admin")) return false
  if (r.userId) return false
  if (!isInternal(r.referrer)) return false
  if ((r.utmSource || "").trim()) return false
  if ((r.utmMedium || "").trim()) return false
  if ((r.utmCampaign || "").trim()) return false
  return true
}

function matchesFleet(window) {
  if (window.length <= FLEET_MIN_VIEWS) return false
  const ips = new Set(window.map((w) => w.ipHash))
  const paths = new Set(window.map((w) => w.path))
  return ips.size > FLEET_MIN_IPS && paths.size > FLEET_MIN_PATHS
}

function collectFleetIds(rows) {
  const eligible = rows.filter(isFleetEligible).sort((a, b) => a.createdAt - b.createdAt)
  const flagged = new Set()
  let left = 0
  for (let right = 0; right < eligible.length; right++) {
    const rt = eligible[right].createdAt.getTime()
    while (left <= right && rt - eligible[left].createdAt.getTime() > WINDOW_MS) left++
    const win = eligible.slice(left, right + 1)
    if (matchesFleet(win)) for (const w of win) flagged.add(w.id)
  }
  return flagged
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const since = new Date(Date.now() - HOURS * 60 * 60 * 1000)
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
        userId: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const fleetIds = collectFleetIds(rows)
    const fleetRows = rows.filter((r) => fleetIds.has(r.id))

    const uaCounts = new Map()
    for (const r of fleetRows) {
      const ua = r.userAgent || "(empty)"
      uaCounts.set(ua, (uaCounts.get(ua) || 0) + 1)
    }
    const byUa = [...uaCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([userAgent, count]) => ({ count, pct: ((100 * count) / Math.max(fleetRows.length, 1)).toFixed(1) + "%", userAgent }))

    // Also: all internal-no-utm traffic UAs (even if below fleet threshold) for comparison
    const allEligible = rows.filter(isFleetEligible)
    const allUa = new Map()
    for (const r of allEligible) {
      const ua = r.userAgent || "(empty)"
      allUa.set(ua, (allUa.get(ua) || 0) + 1)
    }
    const allByUa = [...allUa.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([userAgent, count]) => ({ count, userAgent }))

    console.log(
      JSON.stringify(
        {
          hours: HOURS,
          totalRows: rows.length,
          fleetEligibleRows: allEligible.length,
          fleetMatchedRows: fleetRows.length,
          distinctFleetIps: new Set(fleetRows.map((r) => r.ipHash)).size,
          distinctFleetUserAgents: byUa.length,
          fleetUserAgents: byUa,
          topUserAgentsAmongAllInternalNoUtm: allByUa,
          identityHint:
            byUa.length <= 1
              ? "ONE_IDENTITY: single UA across rotating IPs (one operator / tool)"
              : byUa.length <= 5 && byUa[0] && byUa[0].count / fleetRows.length > 0.7
                ? "MOSTLY_ONE_IDENTITY: dominant UA with a few variants"
                : "MANY_IDENTITIES: diverse UAs — looks more botnet / spoof pool",
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
