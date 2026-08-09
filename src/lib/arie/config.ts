/**
 * ARIE Sprint 1 — shared config (env + defaults).
 * Brand Constitution path is fixed relative to repo docs.
 */

export const ARIE_CONSTITUTION_PATH = "docs/arie/BRAND_CONSTITUTION.md"
export const ARIE_CONSTITUTION_VERSION = "1.0"

export function ariePublishEnabled(): boolean {
  return process.env.ARIE_PUBLISH_ENABLED === "true"
}

/** Narrow autonomous posting (still requires ARIE_PUBLISH_ENABLED). */
export function arieAutoPublishEnabled(): boolean {
  return process.env.ARIE_AUTO_PUBLISH_ENABLED === "true"
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
  const apiKey = process.env.ARIE_X_API_KEY?.trim() || process.env.X_API_KEY?.trim()
  const apiSecret = process.env.ARIE_X_API_SECRET?.trim() || process.env.X_API_SECRET?.trim()
  const accessToken =
    process.env.ARIE_X_ACCESS_TOKEN?.trim() || process.env.X_ACCESS_TOKEN?.trim()
  const accessSecret =
    process.env.ARIE_X_ACCESS_SECRET?.trim() ||
    process.env.ARIE_X_ACCESS_TOKEN_SECRET?.trim() ||
    process.env.X_ACCESS_SECRET?.trim() ||
    process.env.X_ACCESS_TOKEN_SECRET?.trim()
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
