import { createHash } from "crypto"

/**
 * Hash client IP for analytics dedup / rate flags without storing raw PII.
 * Prefer ANALYTICS_IP_SALT; fall back to NEXTAUTH_SECRET; else a fixed app salt.
 */
export function hashIp(ip: string): string {
  const salt =
    process.env.ANALYTICS_IP_SALT?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "actorrating-analytics"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex")
}
