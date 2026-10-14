import "server-only"
import { Prisma, type FaceOffEntityType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { FACEOFF_MATCHUP_TTL_MS } from "@/lib/faceoff/constants"
import type { FaceOffComparisonType, FaceOffModeName } from "@/lib/faceoff/constants"
import {
  pickWeighted,
  scoreOpponent,
  shouldForceDiscovery,
  type ScoreCandidate,
} from "@/lib/faceoff/matchmaking-score"
import { canonicalPairKey, parseMode, resolveComparisonType, type FaceOffPreferences } from "@/lib/faceoff/pair"
import { blockedPairKeys, classifySessionPair, type SessionPairState } from "@/lib/faceoff/pairs"
import { hydrateFaceOffImages } from "@/lib/faceoff/portraits"
import { readEntityMetadata, type FaceOffSessionRecord } from "@/lib/faceoff/session"
import type { FaceOffPublicMatchup } from "@/lib/faceoff/types"

type PoolRow = {
  id: string
  elo: number
  comparisonCount: number
  popularity: number
  metadata: Prisma.JsonValue
  displayName: string
  imageUrl: string | null
  subtitle: string | null
  entityType: FaceOffEntityType
}

function asPreferences(value: unknown): FaceOffPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as FaceOffPreferences
}

function yearOf(row: PoolRow): number | null {
  const meta = row.metadata
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null
  const year = (meta as Record<string, unknown>).year
  return typeof year === "number" ? year : null
}

function genreOf(row: PoolRow): string | null {
  const meta = row.metadata
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null
  const genre = (meta as Record<string, unknown>).genre
  return typeof genre === "string" ? genre : null
}

function toScore(row: PoolRow): ScoreCandidate {
  return {
    id: row.id,
    elo: row.elo,
    comparisonCount: row.comparisonCount,
    popularity: row.popularity,
    year: yearOf(row),
    genre: genreOf(row),
  }
}

async function loadSessionPairs(sessionId: string): Promise<SessionPairState> {
  const [votes, matchups] = await Promise.all([
    prisma.faceOffVote.findMany({
      where: { sessionId },
      select: { pairKey: true },
    }),
    prisma.faceOffMatchup.findMany({
      where: { sessionId },
      select: { pairKey: true, consumedAt: true, expiresAt: true },
    }),
  ])
  const voted = new Set(votes.map((row) => row.pairKey))
  const now = Date.now()
  const open = new Set<string>()
  const skipped = new Set<string>()
  for (const row of matchups) {
    const kind = classifySessionPair({ ...row, voted, now })
    if (kind === "open") open.add(row.pairKey)
    if (kind === "skipped") skipped.add(row.pairKey)
  }
  return { voted, open, skipped }
}

async function pickAnchor(type: FaceOffEntityType, avoidId: string | null): Promise<PoolRow | null> {
  const rows = avoidId
    ? await prisma.$queryRaw<PoolRow[]>`
        SELECT id, elo, "comparisonCount", popularity, metadata, "displayName", "imageUrl", subtitle, "entityType"
        FROM "FaceOffEntity"
        WHERE "entityType" = ${type}::"FaceOffEntityType"
          AND eligible = true
          AND "imageUrl" IS NOT NULL
          AND id <> ${avoidId}
        ORDER BY (("comparisonCount" + 1) * random()) ASC
        LIMIT 24
      `
    : await prisma.$queryRaw<PoolRow[]>`
        SELECT id, elo, "comparisonCount", popularity, metadata, "displayName", "imageUrl", subtitle, "entityType"
        FROM "FaceOffEntity"
        WHERE "entityType" = ${type}::"FaceOffEntityType"
          AND eligible = true
          AND "imageUrl" IS NOT NULL
        ORDER BY (("comparisonCount" + 1) * random()) ASC
        LIMIT 24
      `
  if (rows.length === 0) return null
  return rows[Math.floor(Math.random() * Math.min(rows.length, 8))]
}

async function loadOpponents(type: FaceOffEntityType, anchor: PoolRow, discovery: boolean): Promise<PoolRow[]> {
  if (discovery) {
    return prisma.$queryRaw<PoolRow[]>`
      SELECT id, elo, "comparisonCount", popularity, metadata, "displayName", "imageUrl", subtitle, "entityType"
      FROM "FaceOffEntity"
      WHERE "entityType" = ${type}::"FaceOffEntityType"
        AND eligible = true
        AND "imageUrl" IS NOT NULL
        AND id <> ${anchor.id}
      ORDER BY "comparisonCount" ASC, random()
      LIMIT 40
    `
  }
  return prisma.$queryRaw<PoolRow[]>`
    SELECT id, elo, "comparisonCount", popularity, metadata, "displayName", "imageUrl", subtitle, "entityType"
    FROM "FaceOffEntity"
    WHERE "entityType" = ${type}::"FaceOffEntityType"
      AND eligible = true
      AND "imageUrl" IS NOT NULL
      AND id <> ${anchor.id}
    ORDER BY ABS(elo - ${anchor.elo}) ASC, random()
    LIMIT 48
  `
}

async function presentMatchup(matchup: {
  id: string
  mode: FaceOffEntityType
  expiresAt: Date
  left: PoolRow | FaceOffEntityLike
  right: PoolRow | FaceOffEntityLike
}): Promise<FaceOffPublicMatchup> {
  const left = readEntityMetadata(matchup.left)
  const right = readEntityMetadata(matchup.right)
  await hydrateFaceOffImages([left, right])
  return {
    id: matchup.id,
    mode: matchup.mode === "ACTOR" ? "actor" : "performance",
    left,
    right,
    expiresAt: matchup.expiresAt.toISOString(),
  }
}

type FaceOffEntityLike = {
  id: string
  entityType: FaceOffEntityType
  displayName: string
  imageUrl: string | null
  subtitle: string | null
  metadata: Prisma.JsonValue
}

export async function createMatchupForEntities(input: {
  sessionId: string
  leftId: string
  rightId: string
  mode: FaceOffEntityType
}): Promise<FaceOffPublicMatchup | null> {
  if (input.leftId === input.rightId) return null
  const entities = await prisma.faceOffEntity.findMany({
    where: { id: { in: [input.leftId, input.rightId] }, eligible: true },
  })
  if (entities.length !== 2) return null
  if (entities.some((entity) => entity.entityType !== input.mode)) return null
  if (entities.some((entity) => !entity.imageUrl)) return null
  const left = entities.find((entity) => entity.id === input.leftId)
  const right = entities.find((entity) => entity.id === input.rightId)
  if (!left || !right) return null
  const pairKey = canonicalPairKey(left.id, right.id)
  const created = await prisma.faceOffMatchup.create({
    data: {
      sessionId: input.sessionId,
      leftId: left.id,
      rightId: right.id,
      pairKey,
      mode: input.mode,
      expiresAt: new Date(Date.now() + FACEOFF_MATCHUP_TTL_MS),
    },
  })
  return presentMatchup({ ...created, left, right })
}

export async function nextMatchup(input: {
  session: FaceOffSessionRecord
  requestedMode?: string | null
  sharePublicId?: string | null
}): Promise<{ matchup: FaceOffPublicMatchup | null; mode: FaceOffModeName; reason?: string }> {
  const requested = parseMode(input.requestedMode)
  const modeName = requested ?? (input.session.mode === "ACTOR"
    ? "actor"
    : input.session.mode === "PERFORMANCE"
      ? "performance"
      : "mixed")

  if (requested && requested !== (
    input.session.mode === "ACTOR" ? "actor" : input.session.mode === "PERFORMANCE" ? "performance" : "mixed"
  )) {
    await prisma.faceOffSession.update({
      where: { id: input.session.id },
      data: { mode: requested === "actor" ? "ACTOR" : requested === "performance" ? "PERFORMANCE" : "MIXED" },
    })
  }

  if (input.sharePublicId) {
    const share = await prisma.faceOffShare.findUnique({
      where: { publicId: input.sharePublicId },
      include: { left: true, right: true },
    })
    if (!share || !share.left.eligible || !share.right.eligible || share.left.entityType !== share.right.entityType) {
      return { matchup: null, mode: modeName, reason: "That shared matchup is no longer available." }
    }
    const matchup = await createMatchupForEntities({
      sessionId: input.session.id,
      leftId: share.leftId,
      rightId: share.rightId,
      mode: share.mode,
    })
    return { matchup, mode: share.mode === "ACTOR" ? "actor" : "performance" }
  }

  const comparison = resolveComparisonType(
    modeName,
    input.session.lastComparisonType === "ACTOR"
      ? "actor"
      : input.session.lastComparisonType === "PERFORMANCE"
        ? "performance"
        : null,
  )
  const type: FaceOffEntityType = comparison === "actor" ? "ACTOR" : "PERFORMANCE"
  const pairs = await loadSessionPairs(input.session.id)
  if (input.session.lastPairKey) pairs.voted.add(input.session.lastPairKey)

  const filterAvailable = (anchor: PoolRow, opponents: PoolRow[], relaxSkips: boolean) => {
    const blocked = blockedPairKeys(pairs, relaxSkips)
    return opponents.filter((row) => row.id !== anchor.id && !blocked.has(canonicalPairKey(anchor.id, row.id)))
  }

  let anchor = await pickAnchor(type, null)
  if (!anchor) {
    return {
      matchup: null,
      mode: modeName,
      reason: comparison === "actor"
        ? "Not enough actors with portraits are ready for Face-Off yet."
        : "Not enough performances with portraits are ready for Face-Off yet.",
    }
  }

  const discovery = shouldForceDiscovery()
  let opponents = await loadOpponents(type, anchor, discovery)
  let available = filterAvailable(anchor, opponents, false)
  if (available.length === 0) {
    const nextAnchor = await pickAnchor(type, anchor.id)
    if (nextAnchor) {
      anchor = nextAnchor
      opponents = await loadOpponents(type, anchor, true)
      available = filterAvailable(anchor, opponents, false)
    }
  }
  if (available.length === 0) {
    opponents = await loadOpponents(type, anchor, true)
    available = filterAvailable(anchor, opponents, true)
  }
  if (available.length === 0) {
    const fresh = await pickAnchor(type, anchor.id)
    if (fresh) {
      anchor = fresh
      opponents = await loadOpponents(type, anchor, true)
      available = filterAvailable(anchor, opponents, true)
    }
  }
  if (available.length === 0) {
    return { matchup: null, mode: modeName, reason: "You have compared the available pool. Try another mode." }
  }

  const preferences = asPreferences(input.session.preferences)
  const pool = available.map(toScore)
  const anchorScore = toScore(anchor)
  const picked = pickWeighted(available, (row) => scoreOpponent(anchorScore, toScore(row), pool, preferences))
  if (!picked || picked.id === anchor.id) {
    return { matchup: null, mode: modeName, reason: "A new matchup is not available yet." }
  }

  const [left, right] = Math.random() < 0.5 ? [anchor, picked] : [picked, anchor]
  const matchup = await createMatchupForEntities({
    sessionId: input.session.id,
    leftId: left.id,
    rightId: right.id,
    mode: type,
  })
  return { matchup, mode: modeName }
}

export async function takeOpenMatchup(sessionId: string, exceptId: string): Promise<FaceOffPublicMatchup | null> {
  const queued = await prisma.faceOffMatchup.findFirst({
    where: {
      sessionId,
      id: { not: exceptId },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { left: true, right: true },
  })
  if (!queued) return null
  return presentMatchup(queued)
}

export type { FaceOffComparisonType }
