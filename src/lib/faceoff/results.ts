import "server-only"
import { prisma } from "@/lib/prisma"
import { FACEOFF_MIN_COMPARISONS, FACEOFF_REVEAL_EVERY } from "@/lib/faceoff/constants"
import { readEntityMetadata } from "@/lib/faceoff/session"
import type { FaceOffChoiceSummary, FaceOffRankSnippet } from "@/lib/faceoff/types"

export async function sessionResults(sessionId: string) {
  const total = await prisma.faceOffVote.count({ where: { sessionId } })
  const votes = await prisma.faceOffVote.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: FACEOFF_REVEAL_EVERY,
    include: { left: true, right: true, winner: true },
  })
  const choices: FaceOffChoiceSummary[] = votes.map((vote) => {
    const loser = vote.winnerId === vote.leftId ? vote.right : vote.left
    return {
      winner: readEntityMetadata(vote.winner),
      loser: readEntityMetadata(loser),
      createdAt: vote.createdAt.toISOString(),
    }
  })

  const rankedIds = [...new Set(choices.map((choice) => choice.winner.id))]
  const snippets: FaceOffRankSnippet[] = []
  if (rankedIds.length > 0) {
    const entities = await prisma.faceOffEntity.findMany({
      where: { id: { in: rankedIds } },
      select: { id: true, displayName: true, elo: true, comparisonCount: true, entityType: true, eligible: true },
    })
    for (const entity of entities) {
      if (entity.comparisonCount < FACEOFF_MIN_COMPARISONS) {
        snippets.push({
          entityId: entity.id,
          name: entity.displayName,
          rank: null,
          comparisons: entity.comparisonCount,
          developing: true,
        })
        continue
      }
      const ahead = await prisma.faceOffEntity.count({
        where: {
          entityType: entity.entityType,
          eligible: true,
          comparisonCount: { gte: FACEOFF_MIN_COMPARISONS },
          elo: { gt: entity.elo },
        },
      })
      snippets.push({
        entityId: entity.id,
        name: entity.displayName,
        rank: ahead + 1,
        comparisons: entity.comparisonCount,
        developing: false,
      })
    }
  }

  let closeContest: { leftName: string; rightName: string; gap: number } | null = null
  const withBoth = votes.filter((vote) =>
    vote.left.comparisonCount >= FACEOFF_MIN_COMPARISONS &&
    vote.right.comparisonCount >= FACEOFF_MIN_COMPARISONS,
  )
  const closest = withBoth
    .map((vote) => ({
      leftName: vote.left.displayName,
      rightName: vote.right.displayName,
      gap: Math.abs(vote.left.elo - vote.right.elo),
    }))
    .sort((a, b) => a.gap - b.gap)[0]
  if (closest && closest.gap <= 40) closeContest = closest

  return {
    heading: total > FACEOFF_REVEAL_EVERY
      ? "Your latest five decisions."
      : "Your first five decisions.",
    choices,
    rankings: snippets,
    closeContest,
    developing: snippets.every((row) => row.developing) || snippets.length === 0,
  }
}
