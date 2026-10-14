import "server-only"
import type { FaceOffEntity, FaceOffMode } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  FACEOFF_SESSION_TTL_MS,
} from "@/lib/faceoff/constants"
import { createGuestToken, hashGuestToken } from "@/lib/faceoff/cookie"
import type { FaceOffModeName } from "@/lib/faceoff/constants"
import type { FaceOffPublicEntity } from "@/lib/faceoff/types"

const RETURN_GAP_MS = 12 * 60 * 60 * 1000

export type FaceOffSessionRecord = {
  id: string
  userId: string | null
  mode: FaceOffMode
  choiceCount: number
  lastComparisonType: "ACTOR" | "PERFORMANCE" | null
  lastPairKey: string | null
  preferences: unknown
  expiresAt: Date
  resumed: boolean
  auth: "guest" | "authenticated"
}

function modeToPrisma(mode: FaceOffModeName): FaceOffMode {
  if (mode === "actor") return "ACTOR"
  if (mode === "performance") return "PERFORMANCE"
  return "MIXED"
}

export function prismaModeToName(mode: FaceOffMode): FaceOffModeName {
  if (mode === "ACTOR") return "actor"
  if (mode === "PERFORMANCE") return "performance"
  return "mixed"
}

function freshExpiry(): Date {
  return new Date(Date.now() + FACEOFF_SESSION_TTL_MS)
}

export function readEntityMetadata(entity: Pick<FaceOffEntity, "metadata" | "entityType" | "subtitle" | "displayName" | "imageUrl" | "id">): FaceOffPublicEntity {
  const meta = (entity.metadata && typeof entity.metadata === "object" && !Array.isArray(entity.metadata)
    ? entity.metadata
    : {}) as Record<string, unknown>
  const year = typeof meta.year === "number" ? meta.year : null
  const filmTitle = typeof meta.filmTitle === "string" ? meta.filmTitle : null
  const character = typeof meta.character === "string" ? meta.character : null
  const href = typeof meta.href === "string" ? meta.href : null
  return {
    id: entity.id,
    type: entity.entityType === "ACTOR" ? "actor" : "performance",
    name: entity.displayName,
    imageUrl: entity.imageUrl,
    subtitle: entity.subtitle,
    filmTitle,
    year,
    character,
    href,
  }
}

export async function resolveFaceOffSession(input: {
  userId: string | null
  guestToken: string | null
  mode?: FaceOffModeName | null
}): Promise<{ session: FaceOffSessionRecord; guestTokenToSet: string | null; clearGuestCookie: boolean }> {
  const now = new Date()

  if (input.userId) {
    const linked = await linkGuestSessionToUser(input.userId, input.guestToken)
    const existing = await prisma.faceOffSession.findFirst({
      where: { userId: input.userId, expiresAt: { gt: now } },
      orderBy: { lastActiveAt: "desc" },
    })
    if (existing) {
      const resumed = now.getTime() - existing.lastActiveAt.getTime() > RETURN_GAP_MS && existing.choiceCount > 0
      const data: { lastActiveAt: Date; expiresAt: Date; mode?: FaceOffMode } = {
        lastActiveAt: now,
        expiresAt: freshExpiry(),
      }
      if (input.mode) data.mode = modeToPrisma(input.mode)
      const updated = await prisma.faceOffSession.update({ where: { id: existing.id }, data })
      return {
        session: toRecord(updated, resumed, "authenticated"),
        guestTokenToSet: null,
        clearGuestCookie: linked.cleared,
      }
    }
    const created = await prisma.faceOffSession.create({
      data: {
        userId: input.userId,
        mode: input.mode ? modeToPrisma(input.mode) : "MIXED",
        expiresAt: freshExpiry(),
      },
    })
    return {
      session: toRecord(created, false, "authenticated"),
      guestTokenToSet: null,
      clearGuestCookie: linked.cleared,
    }
  }

  if (input.guestToken) {
    const hash = hashGuestToken(input.guestToken)
    const existing = await prisma.faceOffSession.findUnique({ where: { guestTokenHash: hash } })
    if (existing && existing.expiresAt > now && !existing.userId) {
      const resumed = now.getTime() - existing.lastActiveAt.getTime() > RETURN_GAP_MS && existing.choiceCount > 0
      const updated = await prisma.faceOffSession.update({
        where: { id: existing.id },
        data: {
          lastActiveAt: now,
          expiresAt: freshExpiry(),
          ...(input.mode ? { mode: modeToPrisma(input.mode) } : {}),
        },
      })
      return { session: toRecord(updated, resumed, "guest"), guestTokenToSet: null, clearGuestCookie: false }
    }
  }

  const token = createGuestToken()
  try {
    const created = await prisma.faceOffSession.create({
      data: {
        guestTokenHash: hashGuestToken(token),
        mode: input.mode ? modeToPrisma(input.mode) : "MIXED",
        expiresAt: freshExpiry(),
      },
    })
    return { session: toRecord(created, false, "guest"), guestTokenToSet: token, clearGuestCookie: false }
  } catch {
    const hash = hashGuestToken(token)
    const existing = await prisma.faceOffSession.findUnique({ where: { guestTokenHash: hash } })
    if (!existing) throw new Error("Could not start a Face-Off session.")
    return { session: toRecord(existing, false, "guest"), guestTokenToSet: token, clearGuestCookie: false }
  }
}

export async function linkGuestSessionToUser(
  userId: string,
  guestToken: string | null,
): Promise<{ linked: boolean; already: boolean; cleared: boolean }> {
  if (!guestToken) return { linked: false, already: false, cleared: false }
  const hash = hashGuestToken(guestToken)
  const guest = await prisma.faceOffSession.findUnique({ where: { guestTokenHash: hash } })
  if (!guest) return { linked: false, already: false, cleared: false }
  if (guest.userId === userId) {
    return { linked: false, already: true, cleared: false }
  }
  if (guest.userId && guest.userId !== userId) {
    return { linked: false, already: false, cleared: false }
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.faceOffSession.findUnique({ where: { id: guest.id } })
    if (!current || (current.userId && current.userId !== userId)) return
    if (current.userId === userId) return
    await tx.faceOffSession.update({
      where: { id: current.id },
      data: {
        userId,
        guestTokenHash: null,
        linkedAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: freshExpiry(),
      },
    })
  })
  return { linked: true, already: false, cleared: true }
}

function toRecord(
  row: {
    id: string
    userId: string | null
    mode: FaceOffMode
    choiceCount: number
    lastComparisonType: "ACTOR" | "PERFORMANCE" | null
    lastPairKey: string | null
    preferences: unknown
    expiresAt: Date
  },
  resumed: boolean,
  auth: "guest" | "authenticated",
): FaceOffSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    mode: row.mode,
    choiceCount: row.choiceCount,
    lastComparisonType: row.lastComparisonType,
    lastPairKey: row.lastPairKey,
    preferences: row.preferences,
    expiresAt: row.expiresAt,
    resumed,
    auth,
  }
}

export async function setSessionMode(sessionId: string, mode: FaceOffModeName): Promise<void> {
  await prisma.faceOffSession.update({
    where: { id: sessionId },
    data: { mode: modeToPrisma(mode), lastActiveAt: new Date(), expiresAt: freshExpiry() },
  })
}
