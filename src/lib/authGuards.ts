import { createHmac, timingSafeEqual } from "crypto"
import disposableEmailDomains from "disposable-email-domains"

/** 15-minute sliding window for magic-link requests. */
const WINDOW_MS = 15 * 60 * 1000
/** Max magic-link sends per email address per window. */
const EMAIL_MAX_REQUESTS = 3
/** Max magic-link sends per IP per window (user-requested: 3 / 15 min). */
const IP_MAX_REQUESTS = 3

/** Short-lived gate proving the client passed honeypot + pre-checks. */
export const MAGIC_LINK_GATE_COOKIE = "ar_ml_gate"
const GATE_TTL_MS = 2 * 60 * 1000

type GuardErrorCode = "RATE_LIMIT" | "DISPOSABLE_EMAIL" | "GATE_REQUIRED"

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

function gateSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-magic-link-gate-secret"
  )
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

export function createMagicLinkGateToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ e: email.trim().toLowerCase(), exp: Date.now() + GATE_TTL_MS }),
    "utf8",
  ).toString("base64url")
  const sig = createHmac("sha256", gateSecret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function verifyMagicLinkGateToken(
  token: string | null | undefined,
  email: string,
): boolean {
  if (!token) return false
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return false
  const expected = createHmac("sha256", gateSecret()).update(payload).digest("base64url")
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      e?: string
      exp?: number
    }
    if (typeof parsed.e !== "string" || typeof parsed.exp !== "number") return false
    if (parsed.exp < Date.now()) return false
    return parsed.e === email.trim().toLowerCase()
  } catch {
    return false
  }
}

export function magicLinkGateCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.ceil(GATE_TTL_MS / 1000),
  }
}

function readCookie(request: Request | undefined, name: string): string | null {
  if (!request) return null
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=")
    if (rawKey === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

export function validateMagicLinkRequest({
  email,
  ip,
  request,
}: {
  email: string
  ip: string
  /** When provided, requires a valid honeypot gate cookie from /api/auth/magic-link-gate. */
  request?: Request
}): GuardResult {
  const normalizedEmail = email.trim().toLowerCase()
  if (isDisposableEmail(normalizedEmail)) {
    return {
      allowed: false,
      code: "DISPOSABLE_EMAIL",
      message: "Please use a valid email provider.",
    }
  }

  if (request) {
    const gate = readCookie(request, MAGIC_LINK_GATE_COOKIE)
    if (!verifyMagicLinkGateToken(gate, normalizedEmail)) {
      return {
        allowed: false,
        code: "GATE_REQUIRED",
        message: "Unable to send magic link. Please try again.",
      }
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
