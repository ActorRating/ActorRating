/**
 * Crawler policy constants for robots.txt generation.
 * AI_TRAINING_ALLOWED toggles training-oriented bots in one place.
 */

/** Search / user-initiated fetch bots we always allow (plus Googlebot/Bingbot via *). */
export const AI_SEARCH_AND_USER_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
] as const

/** Training / extended-index bots. Gated by AI_TRAINING_ALLOWED. */
export const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Bytespider",
  "Amazonbot",
] as const

/**
 * When false, AI_TRAINING_BOTS get Disallow: /.
 * Default true — allow training crawlers the same public corpus as search bots.
 */
export const AI_TRAINING_ALLOWED = true

export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/admin",
  "/admin/",
  "/auth/",
  "/dashboard",
  "/dashboard/",
  "/onboarding",
  "/onboarding/",
  "/profile",
  "/profile/",
  "/search",
  "/search?",
] as const

export function buildRobotsTxt(opts?: {
  baseUrl?: string
  trainingAllowed?: boolean
}): string {
  const base = (opts?.baseUrl ?? "https://actorrating.com").replace(/\/$/, "")
  const trainingAllowed = opts?.trainingAllowed ?? AI_TRAINING_ALLOWED
  const lines: string[] = [
    "# Generated from src/lib/seo/ai-bot-policy.ts",
    "# AI / agent entrypoint: /llms.txt · /llms-full.txt",
    "",
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW_PATHS.map((p) => `Disallow: ${p}`),
    "",
    "# AI search / user bots (always allowed)",
  ]
  for (const bot of AI_SEARCH_AND_USER_BOTS) {
    lines.push(`User-agent: ${bot}`, "Allow: /", "")
  }
  lines.push(
    `# AI training / extended bots (AI_TRAINING_ALLOWED=${trainingAllowed})`,
  )
  for (const bot of AI_TRAINING_BOTS) {
    lines.push(`User-agent: ${bot}`)
    lines.push(trainingAllowed ? "Allow: /" : "Disallow: /")
    lines.push("")
  }
  lines.push(`Sitemap: ${base}/sitemap.xml`, "")
  return lines.join("\n")
}
