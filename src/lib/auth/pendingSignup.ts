import "server-only"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

export const PENDING_SIGNUP_COOKIE = "ar_pending_signup"
/** 1 hour — long enough for magic-link click. */
export const PENDING_SIGNUP_MAX_AGE_SEC = 60 * 60

export type PendingSignupPayload = {
  username: string
  termsAccepted: true
  /** When set (email magic link), only apply if it matches the new user email. */
  email?: string
  /** Normalized invite code required when INVITE_GATE_ENABLED. */
  inviteCode?: string
}

function cookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: PENDING_SIGNUP_MAX_AGE_SEC,
  }
}

export function encodePendingSignup(payload: PendingSignupPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export function decodePendingSignup(raw: string | null | undefined): PendingSignupPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<PendingSignupPayload>
    const username = normalizeUsername(parsed.username ?? "")
    if (!username || parsed.termsAccepted !== true) return null
    if (!isValidUsername(username) || containsBadWord(username)) return null
    const email = parsed.email?.trim().toLowerCase()
    const inviteCode =
      typeof parsed.inviteCode === "string"
        ? parsed.inviteCode.trim().toUpperCase().replace(/\s+/g, "")
        : undefined
    return {
      username,
      termsAccepted: true,
      ...(email ? { email } : {}),
      ...(inviteCode ? { inviteCode } : {}),
    }
  } catch {
    return null
  }
}

export async function readPendingSignupCookie(): Promise<PendingSignupPayload | null> {
  try {
    const store = await cookies()
    return decodePendingSignup(store.get(PENDING_SIGNUP_COOKIE)?.value)
  } catch {
    return null
  }
}

export async function setPendingSignupCookie(payload: PendingSignupPayload) {
  const store = await cookies()
  store.set(PENDING_SIGNUP_COOKIE, encodePendingSignup(payload), cookieOptions())
}

export async function clearPendingSignupCookie() {
  try {
    const store = await cookies()
    store.delete(PENDING_SIGNUP_COOKIE)
  } catch {
    // ignore
  }
}

/**
 * Apply pending signup (username + terms) to a brand-new or incomplete user.
 * Returns true if the account is now complete.
 */
export async function applyPendingSignupToUser(user: {
  id: string
  email: string
}): Promise<boolean> {
  const pending = await readPendingSignupCookie()
  if (!pending) return false

  const email = user.email.trim().toLowerCase()
  if (pending.email && pending.email !== email) {
    return false
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      username: true,
      onboardingCompleted: true,
      termsAcceptedAt: true,
      name: true,
    },
  })
  if (!existing) return false

  // Already complete — just clear the cookie.
  if (existing.username && existing.onboardingCompleted && existing.termsAcceptedAt) {
    await clearPendingSignupCookie()
    return true
  }

  const taken = await prisma.user.findFirst({
    where: {
      username: pending.username,
      NOT: { id: user.id },
    },
    select: { id: true },
  })
  if (taken) {
    return false
  }

  const now = new Date()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      username: existing.username ?? pending.username,
      termsAcceptedAt: existing.termsAcceptedAt ?? now,
      onboardingCompleted: true,
      onboardingStartedAt: null,
      name: existing.name?.trim() || pending.username,
    },
  })

  // Redeem invite + issue starter codes if not already done (finish-account path).
  if (pending.inviteCode) {
    const { redeemInvite, issueInvites } = await import("@/lib/invites")
    const already = await prisma.inviteCode.findFirst({
      where: { usedById: user.id },
      select: { id: true },
    })
    if (!already) {
      await redeemInvite({ code: pending.inviteCode, userId: user.id })
    }
    const owned = await prisma.inviteCode.count({ where: { ownerId: user.id } })
    if (owned === 0) {
      await issueInvites(user.id)
    }
  }

  await clearPendingSignupCookie()
  return true
}
