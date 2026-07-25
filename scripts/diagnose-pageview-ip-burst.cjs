/**
 * Diagnose PageView IP burst shape (last 2h).
 * Coolify /app — self-contained, no tsx:
 *
 *   cat > /tmp/diag-pv-ip.cjs << 'EOF'
 *   ... (or copy this file) ...
 *   EOF
 *   node /tmp/diag-pv-ip.cjs
 */
const { PrismaClient } = require("@prisma/client")

const WINDOW_MS = 10 * 60 * 1000
const MIN_DISTINCT = 15
const INTERNAL = new Set(["actorrating.com"])
const HOURS = 2

function referrerHost(ref) {
  if (!ref || !String(ref).trim()) return null
  try {
    return new URL(ref).hostname.replace(/^www\./i, "").toLowerCase()
  } catch {
    return "(unparseable)"
  }
}

function isInternal(ref) {
  const h = referrerHost(ref)
  return h != null && INTERNAL.has(h)
}

function isInternalOnlyNoUtm(r) {
  if (!isInternal(r.referrer)) return false
  if ((r.utmSource || "").trim()) return false
  if ((r.utmMedium || "").trim()) return false
  if ((r.utmCampaign || "").trim()) return false
  return true
}

function maxDistinctPathsInWindow(rows) {
  if (rows.length === 0) return 0
  const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt)
  let left = 0
  let maxDistinct = 0
  const counts = new Map() // path -> count in window

  const add = (path) => counts.set(path, (counts.get(path) || 0) + 1)
  const remove = (path) => {
    const n = (counts.get(path) || 0) - 1
    if (n <= 0) counts.delete(path)
    else counts.set(path, n)
  }

  for (let right = 0; right < sorted.length; right++) {
    add(sorted[right].path)
    const rt = sorted[right].createdAt.getTime()
    while (left <= right && rt - sorted[left].createdAt.getTime() > WINDOW_MS) {
      remove(sorted[left].path)
      left++
    }
    if (counts.size > maxDistinct) maxDistinct = counts.size
  }
  return maxDistinct
}

function wouldMatchRule(rows) {
  const sorted = [...rows].sort((a, b) => a.createdAt - b.createdAt)
  let left = 0
  for (let right = 0; right < sorted.length; right++) {
    const rt = sorted[right].createdAt.getTime()
    while (left <= right && rt - sorted[left].createdAt.getTime() > WINDOW_MS) left++
    const win = sorted.slice(left, right + 1)
    if (win.every(isInternalOnlyNoUtm) && new Set(win.map((w) => w.path)).size > MIN_DISTINCT) {
      return true
    }
  }
  return false
}

function pct(n, d) {
  return d === 0 ? "0%" : `${((100 * n) / d).toFixed(1)}%`
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
        isLikelyBot: true,
      },
      orderBy: { createdAt: "asc" },
    })

    let internalNoUtm = 0
    let nullReferrer = 0
    let externalReferrer = 0
    let withUtm = 0
    const hostCounts = new Map()
    const sampleRefs = []

    for (const r of rows) {
      const host = referrerHost(r.referrer)
      const key = host == null ? "(null/direct)" : host
      hostCounts.set(key, (hostCounts.get(key) || 0) + 1)
      if (sampleRefs.length < 15 && r.referrer) sampleRefs.push(r.referrer)

      const hasUtm = Boolean(
        (r.utmSource || "").trim() ||
          (r.utmMedium || "").trim() ||
          (r.utmCampaign || "").trim(),
      )
      if (hasUtm) withUtm++
      if (!r.referrer || !String(r.referrer).trim()) nullReferrer++
      else if (isInternal(r.referrer)) {
        if (!hasUtm) internalNoUtm++
      } else externalReferrer++
    }

    const byIp = new Map()
    for (const r of rows) {
      if (!byIp.has(r.ipHash)) byIp.set(r.ipHash, [])
      byIp.get(r.ipHash).push(r)
    }

    const perIp = []
    for (const [ipHash, group] of byIp) {
      const maxDistinct = maxDistinctPathsInWindow(group)
      const allInternalNoUtm = group.every(isInternalOnlyNoUtm)
      const internalNoUtmCount = group.filter(isInternalOnlyNoUtm).length
      perIp.push({
        ipHashShort: ipHash.slice(0, 12),
        rows: group.length,
        distinctPathsTotal: new Set(group.map((g) => g.path)).size,
        maxDistinctPathsIn10m: maxDistinct,
        allInternalNoUtm,
        internalNoUtmRows: internalNoUtmCount,
        wouldMatchRule: wouldMatchRule(group),
        alreadyBotRows: group.filter((g) => g.isLikelyBot).length,
      })
    }

    perIp.sort(
      (a, b) =>
        b.maxDistinctPathsIn10m - a.maxDistinctPathsIn10m || b.rows - a.rows,
    )

    const matchCount = perIp.filter((p) => p.wouldMatchRule).length
    const overThreshold = perIp.filter((p) => p.maxDistinctPathsIn10m > MIN_DISTINCT)
    const overButNotAllInternal = overThreshold.filter((p) => !p.allInternalNoUtm)

    const topHosts = [...hostCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([host, count]) => ({ host, count }))

    console.log(
      JSON.stringify(
        {
          windowHours: HOURS,
          since: since.toISOString(),
          totalRows: rows.length,
          distinctIpHashes: byIp.size,
          referrerBreakdown: {
            internalNoUtm,
            nullOrDirect: nullReferrer,
            external: externalReferrer,
            withAnyUtm: withUtm,
          },
          topReferrerHosts: topHosts,
          sampleRawReferrers: [...new Set(sampleRefs)].slice(0, 10),
          rule: {
            minDistinctPathsExclusive: MIN_DISTINCT,
            ipsOverDistinctThreshold: overThreshold.length,
            ipsThatWouldMatchFullRule: matchCount,
            ipsOverThresholdButNotAllInternalNoUtm: overButNotAllInternal.length,
          },
          // Top 30 IPs by max distinct paths in any 10m window
          topIpsByBurst: perIp.slice(0, 30),
          // Distribution: how many IPs have maxDistinct in buckets
          maxDistinctDistribution: {
            "1": perIp.filter((p) => p.maxDistinctPathsIn10m === 1).length,
            "2-5": perIp.filter((p) => p.maxDistinctPathsIn10m >= 2 && p.maxDistinctPathsIn10m <= 5).length,
            "6-15": perIp.filter((p) => p.maxDistinctPathsIn10m >= 6 && p.maxDistinctPathsIn10m <= 15).length,
            "16-50": perIp.filter((p) => p.maxDistinctPathsIn10m >= 16 && p.maxDistinctPathsIn10m <= 50).length,
            "51+": perIp.filter((p) => p.maxDistinctPathsIn10m >= 51).length,
          },
          interpretationHint:
            matchCount > 0
              ? "BUG: rule should have matched these IPs — check backfill scan window / deploy"
              : overThreshold.length > 0
                ? "IPs exceed path burst but fail internal-only-no-utm gate — check referrer/UTM shapes"
                : byIp.size > 50 && perIp.every((p) => p.maxDistinctPathsIn10m <= MIN_DISTINCT)
                  ? "FLEET: many IPs each below threshold — need fleet-level signal"
                  : "Inspect topIpsByBurst + referrerBreakdown",
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
