/**
 * First-touch AI-referral hosts (read-time classification; no migration).
 * Extend AI_REFERRAL_HOST_SUFFIXES when new answer-engine referrers appear.
 */

/** Host suffixes (lowercase, no leading dot). Match hostname === suffix or endsWith('.'+suffix). */
export const AI_REFERRAL_HOST_SUFFIXES = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
] as const

/** Path prefixes on otherwise-generic hosts that count as AI chat. */
export const AI_REFERRAL_HOST_PATH_RULES: Array<{
  hostSuffix: string
  pathPrefix: string
}> = [
  { hostSuffix: "bing.com", pathPrefix: "/chat" },
  { hostSuffix: "duckduckgo.com", pathPrefix: "/aichat" },
]

/** Channel key used in by-source tables for the rolled-up AI row. */
export const AI_REFERRAL_CHANNEL_KEY = "ai_referral"

export function hostnameFromReferrer(
  referrer: string | null | undefined,
): string | null {
  const raw = referrer?.trim()
  if (!raw) return null
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase()
    return host || null
  } catch {
    return null
  }
}

export function pathFromReferrer(referrer: string | null | undefined): string {
  const raw = referrer?.trim()
  if (!raw) return ""
  try {
    return new URL(raw).pathname.toLowerCase() || ""
  } catch {
    return ""
  }
}

function hostMatchesSuffix(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`)
}

/** True when the referrer URL is from a known AI answer / chat surface. */
export function isAiReferralReferrer(
  referrer: string | null | undefined,
): boolean {
  const host = hostnameFromReferrer(referrer)
  if (!host) return false
  if (AI_REFERRAL_HOST_SUFFIXES.some((s) => hostMatchesSuffix(host, s))) {
    return true
  }
  const path = pathFromReferrer(referrer)
  return AI_REFERRAL_HOST_PATH_RULES.some(
    (rule) =>
      hostMatchesSuffix(host, rule.hostSuffix) &&
      path.startsWith(rule.pathPrefix),
  )
}

/**
 * Map a stored utmSource / referrer into the AI channel key when applicable.
 * Prefer explicit utm_source=ai_* only if we also know the referrer — here we
 * classify by referrer at read time (PageView.referrer).
 */
export function aiReferralChannelKeyFromReferrer(
  referrer: string | null | undefined,
): string | null {
  return isAiReferralReferrer(referrer) ? AI_REFERRAL_CHANNEL_KEY : null
}
