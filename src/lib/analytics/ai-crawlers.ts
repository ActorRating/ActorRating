/**
 * AI crawler families detected from stored PageView.userAgent (read-time).
 * UA strings can be spoofed — treat counts as directional.
 *
 * Verification notes (as of implementation; re-check vendor docs periodically):
 * - OpenAI: GPTBot, ChatGPT-User, OAI-SearchBot — documented on platform.openai.com/docs/bots
 * - Anthropic: ClaudeBot, Claude-User, Claude-SearchBot — docs.anthropic.com/claude/docs/crawl-and-index
 * - Perplexity: PerplexityBot, Perplexity-User — docs.perplexity.ai
 * - Google-Extended — developers.google.com/search/docs/crawling-indexing/overview-google-crawlers
 * - Applebot-Extended — support.apple.com (Applebot)
 * - CCBot — commoncrawl.org/faq
 * - Bytespider — ByteDance (less formal public docs)
 * - Amazonbot — developer.amazon.com
 * - meta-externalagent — Meta (Facebook) crawler docs
 * Flagged unverified below if docs were thin at authoring time.
 */

export type AiCrawlerFamily = {
  id: string
  label: string
  /** Substrings matched case-insensitively against UA */
  uaIncludes: string[]
  /** true when we could not confirm against a clear official bot list */
  unverified?: boolean
}

export const AI_CRAWLER_FAMILIES: AiCrawlerFamily[] = [
  {
    id: "openai_search",
    label: "OAI-SearchBot",
    uaIncludes: ["oai-searchbot"],
  },
  {
    id: "gptbot",
    label: "GPTBot",
    uaIncludes: ["gptbot"],
  },
  {
    id: "chatgpt_user",
    label: "ChatGPT-User",
    uaIncludes: ["chatgpt-user"],
  },
  {
    id: "claudebot",
    label: "ClaudeBot",
    uaIncludes: ["claudebot"],
  },
  {
    id: "claude_search",
    label: "Claude-SearchBot",
    uaIncludes: ["claude-searchbot"],
  },
  {
    id: "claude_user",
    label: "Claude-User",
    uaIncludes: ["claude-user"],
  },
  {
    id: "perplexitybot",
    label: "PerplexityBot",
    uaIncludes: ["perplexitybot"],
  },
  {
    id: "perplexity_user",
    label: "Perplexity-User",
    uaIncludes: ["perplexity-user"],
  },
  {
    id: "google_extended",
    label: "Google-Extended",
    uaIncludes: ["google-extended"],
  },
  {
    id: "googlebot_ref",
    label: "Googlebot (reference)",
    uaIncludes: ["googlebot"],
  },
  {
    id: "applebot_extended",
    label: "Applebot-Extended",
    uaIncludes: ["applebot-extended"],
  },
  {
    id: "bytespider",
    label: "Bytespider",
    uaIncludes: ["bytespider"],
    unverified: true,
  },
  {
    id: "ccbot",
    label: "CCBot",
    uaIncludes: ["ccbot"],
  },
  {
    id: "amazonbot",
    label: "Amazonbot",
    uaIncludes: ["amazonbot"],
  },
  {
    id: "meta_external",
    label: "meta-externalagent",
    uaIncludes: ["meta-externalagent"],
  },
]

/** First matching family wins (order matters: more specific before Googlebot). */
export function classifyAiCrawlerFamily(
  userAgent: string | null | undefined,
): AiCrawlerFamily | null {
  const ua = (userAgent || "").toLowerCase()
  if (!ua.trim()) return null
  for (const family of AI_CRAWLER_FAMILIES) {
    if (family.uaIncludes.some((needle) => ua.includes(needle))) {
      return family
    }
  }
  return null
}

export function aiCrawlerFamilyId(
  userAgent: string | null | undefined,
): string | null {
  return classifyAiCrawlerFamily(userAgent)?.id ?? null
}
