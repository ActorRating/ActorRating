import "server-only"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"

export const INVITES_PER_NEW_USER = 3

/** When unset/false, signup works without invites (bootstrap). When "1"/true, hard gate. */
export function isInviteGateEnabled(): boolean {
  const raw = process.env.INVITE_GATE_ENABLED?.trim().toLowerCase()
  return raw === "1" || raw === "true" || raw === "yes"
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

export async function findUnusedInvite(codeRaw: string) {
  const code = normalizeInviteCode(codeRaw)
  if (!code || code.length < 6) return null
  return prisma.inviteCode.findFirst({
    where: { code, usedById: null },
    select: { id: true, code: true, ownerId: true },
  })
}

export async function assertInviteAvailable(
  codeRaw: string,
): Promise<{ ok: true; id: string; code: string } | { ok: false; error: string }> {
  const code = normalizeInviteCode(codeRaw)
  if (!code) return { ok: false, error: "Invite code is required" }
  const row = await prisma.inviteCode.findUnique({
    where: { code },
    select: { id: true, code: true, usedById: true },
  })
  if (!row) return { ok: false, error: "Invalid invite code" }
  if (row.usedById) return { ok: false, error: "This invite code has already been used" }
  return { ok: true, id: row.id, code: row.code }
}

export async function redeemInvite(params: {
  code: string
  userId: string
}): Promise<boolean> {
  const code = normalizeInviteCode(params.code)
  if (!code) return false
  const now = new Date()
  try {
    const updated = await prisma.inviteCode.updateMany({
      where: { code, usedById: null },
      data: { usedById: params.userId, usedAt: now },
    })
    return updated.count === 1
  } catch {
    // Unique usedById race — user already redeemed another code
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
          data: { code, ownerId: userId },
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
