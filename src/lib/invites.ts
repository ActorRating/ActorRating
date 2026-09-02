import "server-only"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

export const INVITES_PER_NEW_USER = 3

/** Open registration — invite gate permanently disabled (table retained for analytics). */
export function isInviteGateEnabled(): boolean {
  return false
}

/** Normalize user-entered codes: uppercase, strip spaces, allow hyphen. */
export function normalizeInviteCode(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
}

/** CRAFT-XXXX style codes. */
export function generateInviteCode(prefix = "CRAFT"): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase().slice(0, 4)
  return `${prefix}-${suffix}`
}

function isInviteExhausted(row: {
  usedCount: number
  maxUses: number
  usedById: string | null
}): boolean {
  // maxUses <= 0 means unlimited redemptions
  if (row.maxUses <= 0) return false
  if (row.usedCount >= row.maxUses) return true
  // Legacy single-use: usedById set before usedCount existed
  if (row.maxUses === 1 && row.usedById) return true
  return false
}

export async function findUnusedInvite(codeRaw: string) {
  const code = normalizeInviteCode(codeRaw)
  if (!code || code.length < 6) return null
  const row = await prisma.inviteCode.findFirst({
    where: { code },
    select: {
      id: true,
      code: true,
      ownerId: true,
      maxUses: true,
      usedCount: true,
      usedById: true,
    },
  })
  if (!row || isInviteExhausted(row)) return null
  return { id: row.id, code: row.code, ownerId: row.ownerId }
}

export async function assertInviteAvailable(
  codeRaw: string,
): Promise<{ ok: true; id: string; code: string } | { ok: false; error: string }> {
  const code = normalizeInviteCode(codeRaw)
  if (!code) return { ok: false, error: "Invite code is required" }
  const row = await prisma.inviteCode.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      usedById: true,
      maxUses: true,
      usedCount: true,
    },
  })
  if (!row) return { ok: false, error: "Invalid invite code" }
  if (isInviteExhausted(row)) {
    return { ok: false, error: "This invite code has already been used" }
  }
  return { ok: true, id: row.id, code: row.code }
}

export async function userHasRedeemedInvite(userId: string): Promise<boolean> {
  const [redemption, legacy] = await Promise.all([
    prisma.inviteRedemption.findUnique({
      where: { userId },
      select: { id: true },
    }),
    prisma.inviteCode.findFirst({
      where: { usedById: userId },
      select: { id: true },
    }),
  ])
  return Boolean(redemption || legacy)
}

export async function redeemInvite(params: {
  code: string
  userId: string
}): Promise<boolean> {
  const code = normalizeInviteCode(params.code)
  if (!code) return false

  if (await userHasRedeemedInvite(params.userId)) return false

  const now = new Date()

  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.inviteCode.findUnique({
        where: { code },
        select: {
          id: true,
          maxUses: true,
          usedCount: true,
          usedById: true,
        },
      })
      if (!row || isInviteExhausted(row)) return false

      const updated = await tx.inviteCode.updateMany({
        where: {
          id: row.id,
          // Unlimited (maxUses <= 0): no usedCount cap. Otherwise race-safe lt check.
          ...(row.maxUses > 0 ? { usedCount: { lt: row.maxUses } } : {}),
        },
        data: {
          usedCount: { increment: 1 },
          usedAt: now,
          ...(row.maxUses === 1
            ? { usedById: params.userId }
            : {}),
        },
      })
      if (updated.count !== 1) return false

      await tx.inviteRedemption.create({
        data: {
          inviteCodeId: row.id,
          userId: params.userId,
        },
      })
      return true
    })
  } catch {
    // Unique userId race — user already redeemed another code
    return false
  }
}

export async function issueInvites(userId: string, count = INVITES_PER_NEW_USER): Promise<string[]> {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    let attempts = 0
    while (attempts < 8) {
      attempts += 1
      const code = generateInviteCode()
      try {
        await prisma.inviteCode.create({
          data: { code, ownerId: userId, maxUses: 1, usedCount: 0 },
        })
        codes.push(code)
        break
      } catch {
        // unique collision — retry
      }
    }
  }
  return codes
}

export function inviteRegisterUrl(code: string, baseUrl?: string): string {
  const base =
    (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com").replace(/\/$/, "")
  return `${base}/auth/register?code=${encodeURIComponent(normalizeInviteCode(code))}`
}
