import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { FACEOFF_K_FACTOR, FACEOFF_MAX_CHOICES, FACEOFF_REVEAL_EVERY } from "@/lib/faceoff/constants"
import { updateElo } from "@/lib/faceoff/elo"
import { canonicalPairKey } from "@/lib/faceoff/pair"
import { evaluateVoteRules } from "@/lib/faceoff/vote-rules"
import { recordFaceOffServerEvent } from "@/lib/faceoff/analytics"

export class FaceOffRequestError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type LockedEntity = {
  id: string
  elo: number
  comparisonCount: number
  eligible: boolean
  entityType: string
}

export async function submitFaceOffVote(input: {
  sessionId: string
  matchupId: string
  winnerId: string
  auth: "guest" | "authenticated"
  mode: string
  ip?: string | null
  userAgent?: string | null
  userId?: string | null
}): Promise<{ choiceCount: number; reveal: boolean; milestone: number }> {
  const now = new Date()
  try {
    const result = await prisma.$transaction(async (tx) => {
      const matchupRows = await tx.$queryRaw<Array<{
        id: string
        sessionId: string
        leftId: string
        rightId: string
        pairKey: string
        mode: string
        expiresAt: Date
        consumedAt: Date | null
      }>>`
        SELECT id, "sessionId", "leftId", "rightId", "pairKey", mode::text AS mode, "expiresAt", "consumedAt"
        FROM "FaceOffMatchup"
        WHERE id = ${input.matchupId}
        FOR UPDATE
      `
      const matchup = matchupRows[0]
      if (!matchup) {
        throw new FaceOffRequestError(409, "This matchup is no longer available.")
      }

      const locked = await tx.$queryRaw<LockedEntity[]>`
        SELECT id, elo, "comparisonCount", eligible, "entityType"::text AS "entityType"
        FROM "FaceOffEntity"
        WHERE id IN (${matchup.leftId}, ${matchup.rightId})
        ORDER BY id
        FOR UPDATE
      `
      const left = locked.find((row) => row.id === matchup.leftId)
      const right = locked.find((row) => row.id === matchup.rightId)
      const session = await tx.faceOffSession.findUnique({
        where: { id: input.sessionId },
        select: { id: true, choiceCount: true },
      })
      if (!session) throw new FaceOffRequestError(401, "Your Face-Off session has expired.")

      const prior = await tx.faceOffVote.findUnique({
        where: { sessionId_pairKey: { sessionId: input.sessionId, pairKey: matchup.pairKey } },
        select: { id: true },
      })
      const rules = evaluateVoteRules({
        sessionId: input.sessionId,
        matchupSessionId: matchup.sessionId,
        leftId: matchup.leftId,
        rightId: matchup.rightId,
        winnerId: input.winnerId,
        expiresAt: new Date(matchup.expiresAt),
        consumedAt: matchup.consumedAt ? new Date(matchup.consumedAt) : null,
        now,
        leftEligible: Boolean(left?.eligible),
        rightEligible: Boolean(right?.eligible),
        sameType: Boolean(left && right && left.entityType === right.entityType),
        alreadyVoted: Boolean(prior),
        choiceCount: session.choiceCount,
        maxChoices: FACEOFF_MAX_CHOICES,
      })
      if (!rules.ok) throw new FaceOffRequestError(rules.status, rules.error)
      if (!left || !right) throw new FaceOffRequestError(409, "This matchup is no longer available.")

      const scoreA = input.winnerId === left.id ? 1 : 0
      const next = updateElo(left.elo, right.elo, scoreA, FACEOFF_K_FACTOR)
      await tx.faceOffEntity.update({
        where: { id: left.id },
        data: { elo: next.ratingA, comparisonCount: { increment: 1 } },
      })
      await tx.faceOffEntity.update({
        where: { id: right.id },
        data: { elo: next.ratingB, comparisonCount: { increment: 1 } },
      })
      await tx.faceOffVote.create({
        data: {
          sessionId: input.sessionId,
          leftId: matchup.leftId,
          rightId: matchup.rightId,
          winnerId: input.winnerId,
          pairKey: canonicalPairKey(matchup.leftId, matchup.rightId),
        },
      })
      await tx.faceOffMatchup.update({
        where: { id: matchup.id },
        data: { consumedAt: now },
      })
      const updated = await tx.faceOffSession.update({
        where: { id: input.sessionId },
        data: {
          choiceCount: { increment: 1 },
          lastPairKey: matchup.pairKey,
          lastComparisonType: left.entityType === "ACTOR" ? "ACTOR" : "PERFORMANCE",
          lastActiveAt: now,
        },
        select: { choiceCount: true },
      })
      return {
        choiceCount: updated.choiceCount,
        reveal: updated.choiceCount > 0 && updated.choiceCount % FACEOFF_REVEAL_EVERY === 0,
        milestone: FACEOFF_REVEAL_EVERY,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 })

    void recordFaceOffServerEvent({
      name: "faceoff_vote_accepted",
      auth: input.auth,
      mode: input.mode,
      choiceNumber: result.choiceCount,
      ip: input.ip,
      userAgent: input.userAgent,
      userId: input.userId,
    })
    if (result.choiceCount === FACEOFF_REVEAL_EVERY) {
      void recordFaceOffServerEvent({
        name: "faceoff_five_choices_completed",
        auth: input.auth,
        mode: input.mode,
        choiceNumber: result.choiceCount,
      })
    }
    return result
  } catch (error) {
    if (error instanceof FaceOffRequestError) {
      void recordFaceOffServerEvent({
        name: "faceoff_vote_rejected",
        auth: input.auth,
        mode: input.mode,
        reason: error.message,
      })
      throw error
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      void recordFaceOffServerEvent({
        name: "faceoff_vote_rejected",
        auth: input.auth,
        mode: input.mode,
        reason: "duplicate",
      })
      throw new FaceOffRequestError(409, "You already chose a winner for this matchup.")
    }
    throw error
  }
}
