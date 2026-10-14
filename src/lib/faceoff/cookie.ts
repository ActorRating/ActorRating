import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { FACEOFF_COOKIE, FACEOFF_COOKIE_MAX_AGE_SEC } from "@/lib/faceoff/constants"

export function createGuestToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function guestTokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function faceOffCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  maxAge: number
} {
  const secure =
    process.env.NODE_ENV === "production" ||
    (process.env.NEXTAUTH_URL ?? "").startsWith("https")
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: FACEOFF_COOKIE_MAX_AGE_SEC,
  }
}

export { FACEOFF_COOKIE }
