import "server-only"
import { prisma } from "@/lib/prisma"
import type { FaceOffModeName } from "@/lib/faceoff/constants"
import { nextMatchup, takeOpenMatchup } from "@/lib/faceoff/matchmaking"
import type { FaceOffSessionRecord } from "@/lib/faceoff/session"
import type { FaceOffPublicMatchup } from "@/lib/faceoff/types"
import { FaceOffRequestError } from "@/lib/faceoff/vote"

/**
 * Marks the current matchup consumed and loads another pair.
 * Does not create a vote, change Elo, or increment the accepted-choice count.
 */
export async function skipFaceOffMatchup(input: {
  session: FaceOffSessionRecord
  matchupId: string
}): Promise<{
  choiceCount: number
  matchup: FaceOffPublicMatchup | null
  mode: FaceOffModeName
  empty: string | null
}> {
  const matchup = await prisma.faceOffMatchup.findUnique({ where: { id: input.matchupId } })
  if (!matchup || matchup.sessionId !== input.session.id) {
    throw new FaceOffRequestError(401, "That matchup is not part of this session.")
  }

  if (!matchup.consumedAt) {
    const now = new Date()
    await prisma.$transaction([
      prisma.faceOffMatchup.update({
        where: { id: matchup.id },
        data: { consumedAt: now },
      }),
      prisma.faceOffSession.update({
        where: { id: input.session.id },
        data: { lastComparisonType: matchup.mode, lastActiveAt: now },
      }),
    ])
  }

  const queued = await takeOpenMatchup(input.session.id, matchup.id)
  if (queued) {
    return {
      choiceCount: input.session.choiceCount,
      matchup: queued,
      mode: queued.mode,
      empty: null,
    }
  }

  const next = await nextMatchup({
    session: { ...input.session, lastComparisonType: matchup.mode },
  })
  return {
    choiceCount: input.session.choiceCount,
    matchup: next.matchup,
    mode: next.mode,
    empty: next.matchup ? null : next.reason ?? "No other matchup is available.",
  }
}
