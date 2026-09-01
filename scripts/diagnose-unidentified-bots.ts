/**
 * Break down UNIDENTIFIED bot PageViews (last N days).
 *
 * Run on VPS inside /app:
 *   npx tsx scripts/diagnose-unidentified-bots.ts
 *   npx tsx scripts/diagnose-unidentified-bots.ts 7
 */
import { PrismaClient } from "@prisma/client"

const days = Math.max(1, Math.min(30, Number(process.argv[2] || 7) || 7))
const prisma = new PrismaClient()

function uaFamily(ua: string | null): string {
  const s = (ua || "").trim()
  if (!s) return "(empty UA)"
  const lower = s.toLowerCase()
  if (lower.includes("headlesschrome")) return "HeadlessChrome"
  if (/chrome\/[\d.]+/.test(lower) && lower.includes("linux")) return "Chrome/Linux (spoof-ish)"
  if (/chrome\/[\d.]+/.test(lower) && lower.includes("windows")) return "Chrome/Windows"
  if (/chrome\/[\d.]+/.test(lower) && lower.includes("mac")) return "Chrome/Mac"
  if (/firefox\/[\d.]+/.test(lower)) return "Firefox"
  if (/safari\/[\d.]+/.test(lower) && !lower.includes("chrome")) return "Safari"
  if (lower.includes("bot") || lower.includes("spider") || lower.includes("crawl")) {
    return `named-ish: ${s.slice(0, 60)}`
  }
  return `other: ${s.slice(0, 80)}`
}

async function main() {
  console.log(`\n=== UNIDENTIFIED bots — last ${days}d ===\n`)

  const totals = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`
    SELECT COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
  `)
  console.log("total unidentified pageviews:", totals[0]?.n ?? 0)

  const ips = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`
    SELECT COUNT(DISTINCT "ipHash")::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
  `)
  console.log("distinct ipHashes:", ips[0]?.n ?? 0)

  const topPaths = await prisma.$queryRawUnsafe<
    Array<{ path: string; n: number }>
  >(`
    SELECT path, COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY path
    ORDER BY n DESC
    LIMIT 25
  `)
  console.log("\n--- top paths ---")
  for (const r of topPaths) console.log(String(r.n).padStart(6), r.path)

  const pathPrefix = await prisma.$queryRawUnsafe<
    Array<{ prefix: string; n: number }>
  >(`
    SELECT
      CASE
        WHEN path LIKE '/actors/%' THEN '/actors/*'
        WHEN path LIKE '/movies/%' THEN '/movies/*'
        WHEN path LIKE '/rate/%' THEN '/rate/*'
        WHEN path LIKE '/directors/%' THEN '/directors/*'
        WHEN path LIKE '/genres/%' THEN '/genres/*'
        WHEN path LIKE '/search%' THEN '/search*'
        WHEN path LIKE '/lists/%' THEN '/lists/*'
        WHEN path LIKE '/forum%' THEN '/forum*'
        WHEN path LIKE '/craft/%' THEN '/craft/*'
        WHEN path LIKE '/stories/%' THEN '/stories/*'
        WHEN path LIKE '/news/%' THEN '/news/*'
        WHEN path = '/' THEN '/'
        ELSE 'other'
      END AS prefix,
      COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY 1
    ORDER BY n DESC
  `)
  console.log("\n--- path prefixes ---")
  for (const r of pathPrefix) console.log(String(r.n).padStart(6), r.prefix)

  const refBuckets = await prisma.$queryRawUnsafe<
    Array<{ bucket: string; n: number }>
  >(`
    SELECT
      CASE
        WHEN referrer IS NULL OR referrer = '' THEN '(none/direct)'
        WHEN referrer ILIKE '%actorrating.com%' THEN 'internal actorrating.com'
        WHEN referrer ILIKE '%twitter.com%' OR referrer ILIKE '%x.com%' OR referrer ILIKE '%t.co%' THEN 'x/twitter'
        WHEN referrer ILIKE '%google.%' THEN 'google'
        ELSE 'external other'
      END AS bucket,
      COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY 1
    ORDER BY n DESC
  `)
  console.log("\n--- referrer buckets ---")
  for (const r of refBuckets) console.log(String(r.n).padStart(6), r.bucket)

  const utm = await prisma.$queryRawUnsafe<Array<{ has_utm: boolean; n: number }>>(`
    SELECT
      ("utmSource" IS NOT NULL OR "utmMedium" IS NOT NULL OR "utmCampaign" IS NOT NULL) AS has_utm,
      COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY 1
  `)
  console.log("\n--- utm present? ---")
  for (const r of utm) console.log(String(r.n).padStart(6), r.has_utm ? "with UTM" : "no UTM")

  const sampleUas = await prisma.$queryRawUnsafe<
    Array<{ userAgent: string | null; n: number }>
  >(`
    SELECT "userAgent", COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY "userAgent"
    ORDER BY n DESC
    LIMIT 40
  `)
  console.log("\n--- UA families (aggregated from top raw UAs) ---")
  const families = new Map<string, number>()
  for (const r of sampleUas) {
    const fam = uaFamily(r.userAgent)
    families.set(fam, (families.get(fam) ?? 0) + r.n)
  }
  const famSorted = [...families.entries()].sort((a, b) => b[1] - a[1])
  for (const [fam, n] of famSorted) console.log(String(n).padStart(6), fam)

  console.log("\n--- top raw UAs ---")
  for (const r of sampleUas.slice(0, 15)) {
    console.log(String(r.n).padStart(6), (r.userAgent || "(empty)").slice(0, 120))
  }

  const signedIn = await prisma.$queryRawUnsafe<Array<{ signed_in: boolean; n: number }>>(`
    SELECT ("userId" IS NOT NULL) AS signed_in, COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY 1
  `)
  console.log("\n--- signed in? ---")
  for (const r of signedIn) console.log(String(r.n).padStart(6), r.signed_in ? "signed-in" : "guest")

  const hourly = await prisma.$queryRawUnsafe<Array<{ hour: Date; n: number }>>(`
    SELECT date_trunc('hour', "createdAt") AS hour, COUNT(*)::int AS n
    FROM "PageView"
    WHERE "createdAt" >= NOW() - INTERVAL '48 hours'
      AND "isLikelyBot" = true
      AND "botCategory" = 'UNIDENTIFIED'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 24
  `)
  console.log("\n--- last 24h by hour (most recent first) ---")
  for (const r of hourly) console.log(r.hour?.toISOString?.() ?? r.hour, r.n)

  console.log("")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
