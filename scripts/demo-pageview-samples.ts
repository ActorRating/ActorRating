/**
 * Prints sample PageView rows that *would* be logged for a few request shapes.
 * Does not write to the DB — use to verify bot flags + UTM parsing.
 *
 *   npx tsx scripts/demo-pageview-samples.ts
 */
import { hashIp } from "../src/lib/analytics/ip-hash"
import {
  evaluatePageViewBot,
  normalizePageViewPath,
  parseUtmParams,
  truncateReferrer,
} from "../src/lib/analytics/pageview"

type Sample = {
  label: string
  path: string
  search?: string
  referrer?: string | null
  userAgent: string
  acceptLanguage: string | null
  ip: string
  userId?: string | null
}

const samples: Sample[] = [
  {
    label: "Human — TikTok landing on rate page",
    path: "/rate/the-dark-knight-2008/heath-ledger",
    search: "?utm_source=tiktok&utm_medium=social&utm_campaign=jul_launch",
    referrer: "https://www.tiktok.com/@actorrating/video/123",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    acceptLanguage: "en-US,en;q=0.9",
    ip: "203.0.113.42",
    userId: null,
  },
  {
    label: "Human — logged-in home (direct)",
    path: "/",
    search: "",
    referrer: null,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    acceptLanguage: "en-GB,en;q=0.8",
    ip: "198.51.100.10",
    userId: "clxyz_example_user",
  },
  {
    label: "Bot — Googlebot",
    path: "/movies/inception-2010",
    search: "",
    referrer: null,
    userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    acceptLanguage: null,
    ip: "66.249.66.1",
  },
  {
    label: "Junk path — malformed movie slug",
    path: "/rate/-2019/some-actor",
    search: "",
    referrer: "https://spam.example/",
    userAgent: "Mozilla/5.0",
    acceptLanguage: "en",
    ip: "203.0.113.99",
  },
  {
    label: "Junk path — literal null actor id segment",
    path: "/rate/bullet-train-2022/null",
    search: "",
    referrer: null,
    userAgent: "python-requests/2.31.0",
    acceptLanguage: null,
    ip: "203.0.113.100",
  },
]

function buildRow(s: Sample) {
  const path = normalizePageViewPath(s.path)!
  const utm = parseUtmParams(s.search ?? "")
  const ipHash = hashIp(s.ip)
  const bot = evaluatePageViewBot({
    path,
    userAgent: s.userAgent,
    acceptLanguage: s.acceptLanguage,
    ipHash,
  })

  return {
    path,
    referrer: truncateReferrer(s.referrer),
    ...utm,
    userId: s.userId ?? null,
    ipHash: `${ipHash.slice(0, 12)}…`,
    userAgent: s.userAgent.slice(0, 80) + (s.userAgent.length > 80 ? "…" : ""),
    isLikelyBot: bot.isLikelyBot,
    botReasons: bot.reasons,
  }
}

console.log("Sample PageView payloads (not written to DB):\n")
for (const s of samples) {
  console.log(`--- ${s.label}`)
  console.log(JSON.stringify(buildRow(s), null, 2))
  console.log()
}
