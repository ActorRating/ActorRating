import disposableEmailDomains from "disposable-email-domains"

const WINDOW_MS = 5 * 60 * 1000
const EMAIL_MAX_REQUESTS = 3
const IP_MAX_REQUESTS = 5

type GuardErrorCode = "RATE_LIMIT" | "DISPOSABLE_EMAIL"

type GuardResult =
  | { allowed: true }
  | { allowed: false; code: GuardErrorCode; message: string }

type Buckets = Map<string, number[]>

const globalBuckets = globalThis as typeof globalThis & {
  __magicLinkRateLimitBuckets?: Buckets
}

const requestBuckets: Buckets =
  globalBuckets.__magicLinkRateLimitBuckets ?? new Map<string, number[]>()

if (!globalBuckets.__magicLinkRateLimitBuckets) {
  globalBuckets.__magicLinkRateLimitBuckets = requestBuckets
}

const disposableSet = new Set((disposableEmailDomains as string[]).map((d) => d.toLowerCase()))

function pruneOldTimestamps(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS)
}

function consumeBucket(key: string, maxRequests: number, now: number): boolean {
  const existing = requestBuckets.get(key) ?? []
  const fresh = pruneOldTimestamps(existing, now)
  if (fresh.length >= maxRequests) {
    requestBuckets.set(key, fresh)
    return false
  }
  fresh.push(now)
  requestBuckets.set(key, fresh)
  return true
}

function parseDomain(email: string): string {
  const [, domain = ""] = email.split("@")
  return domain.toLowerCase()
}

export function isDisposableEmail(email: string): boolean {
  return disposableSet.has(parseDomain(email))
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) return firstIp
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}

export function validateMagicLinkRequest({
  email,
  ip,
}: {
  email: string
  ip: string
}): GuardResult {
  const normalizedEmail = email.trim().toLowerCase()
  if (isDisposableEmail(normalizedEmail)) {
    return {
      allowed: false,
      code: "DISPOSABLE_EMAIL",
      message: "Please use a valid email provider.",
    }
  }

  const now = Date.now()
  const emailAllowed = consumeBucket(`email:${normalizedEmail}`, EMAIL_MAX_REQUESTS, now)
  if (!emailAllowed) {
    return {
      allowed: false,
      code: "RATE_LIMIT",
      message: "Too many requests. Try again later.",
    }
  }

  const ipAllowed = consumeBucket(`ip:${ip}`, IP_MAX_REQUESTS, now)
  if (!ipAllowed) {
    return {
      allowed: false,
      code: "RATE_LIMIT",
      message: "Too many requests. Try again later.",
    }
  }

  return { allowed: true }
}
