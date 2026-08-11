/**
 * ARIE Sprint 1 — shared config (env + defaults).
 * Brand Constitution path is fixed relative to repo docs.
 */

export const ARIE_CONSTITUTION_PATH = "docs/arie/BRAND_CONSTITUTION.md"
export const ARIE_CONSTITUTION_VERSION = "1.1"

export function ariePublishEnabled(): boolean {
  return process.env.ARIE_PUBLISH_ENABLED === "true"
}

/** Narrow autonomous posting (still requires ARIE_PUBLISH_ENABLED). */
export function arieAutoPublishEnabled(): boolean {
  return process.env.ARIE_AUTO_PUBLISH_ENABLED === "true"
}

/**
 * Human-approved original posts via Publisher.
 * Default OFF. Still requires ARIE_PUBLISH_ENABLED=true at the choke point.
 * Does NOT enable unattended publishing.
 */
export function arieOriginalPublishEnabled(): boolean {
  return process.env.ARIE_ORIGINAL_PUBLISH_ENABLED === "true"
}

export function arieAutoPublishMinOpportunity(): number {
  const raw = Number(process.env.ARIE_AUTO_PUBLISH_MIN_OPPORTUNITY ?? "72")
  return Number.isFinite(raw) ? raw : 72
}

export function arieAutoPublishDailyCap(): number {
  const raw = Number(process.env.ARIE_AUTO_PUBLISH_DAILY_CAP ?? "12")
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 12
}

export function arieIngestEnabled(): boolean {
  return process.env.ARIE_INGEST_ENABLED !== "false"
}

export function arieServiceKey(): string | null {
  const key = process.env.ARIE_SERVICE_KEY?.trim()
  return key || null
}

export function arieMonthlyBudgetUsd(): number {
  const raw = Number(process.env.ARIE_MONTHLY_BUDGET_USD ?? "20")
  return Number.isFinite(raw) && raw > 0 ? raw : 20
}

export function arieCostGovernorEnabled(): boolean {
  return process.env.ARIE_COST_GOVERNOR_ENABLED !== "false"
}

export function arieGroqApiKey(): string | null {
  return process.env.GROQ_API_KEY?.trim() || process.env.ARIE_GROQ_API_KEY?.trim() || null
}

export function arieXBearerToken(): string | null {
  return process.env.ARIE_X_BEARER_TOKEN?.trim() || process.env.X_BEARER_TOKEN?.trim() || null
}

/** User-context OAuth 1.0a credentials for posting as @ActorRating. */
export function arieXWriteCredentials(): {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessSecret: string
} | null {
  const clean = (v: string | undefined) => {
    if (!v) return ""
    let s = v.trim()
    // Coolify/people often paste secrets wrapped in quotes
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).trim()
    }
    return s.replace(/\r?\n/g, "")
  }
  const apiKey = clean(process.env.ARIE_X_API_KEY) || clean(process.env.X_API_KEY)
  const apiSecret = clean(process.env.ARIE_X_API_SECRET) || clean(process.env.X_API_SECRET)
  const accessToken =
    clean(process.env.ARIE_X_ACCESS_TOKEN) || clean(process.env.X_ACCESS_TOKEN)
  const accessSecret =
    clean(process.env.ARIE_X_ACCESS_SECRET) ||
    clean(process.env.ARIE_X_ACCESS_TOKEN_SECRET) ||
    clean(process.env.X_ACCESS_SECRET) ||
    clean(process.env.X_ACCESS_TOKEN_SECRET)
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null
  return { apiKey, apiSecret, accessToken, accessSecret }
}

export function arieXWriteConfigured(): boolean {
  return Boolean(arieXWriteCredentials())
}

/** YYYY-MM period key in UTC for monthly budgeting. */
export function currentBudgetPeriodKey(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}
