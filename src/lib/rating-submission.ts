import "server-only"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
import { isFeaturetteMovie, isSelfOrArchiveCredit, matchesFeaturetteTitle } from "@/lib/non-rateable"
import { isMovieComingSoon } from "@/lib/movie-release"
import {
  parseIsSpoiler,
  sanitizeRatingComment,
} from "@/lib/validation/ratingComment"

export type RatingScoresInput = {
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
}

export function computeWeightedScore(scores: RatingScoresInput): number {
  return (
    scores.emotionalRangeDepth * 0.25 +
    scores.characterBelievability * 0.25 +
    scores.technicalSkill * 0.2 +
    scores.screenPresence * 0.15 +
    scores.chemistryInteraction * 0.15
  )
}

export function validateRatingScores(scores: RatingScoresInput): string | null {
  const values = Object.values(scores)
  for (const rating of values) {
    if (typeof rating !== "number" || rating < 0 || rating > 100) {
      return "All ratings must be numbers between 0 and 100"
    }
  }
  return null
}

export async function validateRatingTarget(actorId: string, movieId: string) {
  const [actor, movie] = await Promise.all([
    prisma.actor.findUnique({ where: { id: actorId } }),
    prisma.movie.findUnique({ where: { id: movieId } }),
  ])

  if (!actor) return { ok: false as const, status: 400, error: "Actor not found" }
  if (!movie) return { ok: false as const, status: 400, error: "Movie not found" }

  if (isFeaturetteMovie(movie)) {
    if (!movie.isFeaturette && matchesFeaturetteTitle(movie.title)) {
      void prisma.movie
        .update({ where: { id: movie.id }, data: { isFeaturette: true } })
        .catch(() => {})
    }
    return { ok: false as const, status: 400, error: "This title is not available for rating" }
  }

  if (isMovieComingSoon(movie)) {
    return {
      ok: false as const,
      status: 400,
      error: "This movie is not out yet — rating opens on release day",
    }
  }

  const existingPerf = await prisma.performance.findFirst({
    where: { actorId, movieId },
    select: { character: true },
    orderBy: { createdAt: "asc" },
  })
  if (isSelfOrArchiveCredit(existingPerf?.character)) {
    return { ok: false as const, status: 400, error: "This credit is not available for rating" }
  }

  return { ok: true as const, actor, movie }
}

const ratingInclude = {
  actor: { select: { name: true, imageUrl: true } },
  movie: { select: { title: true, year: true, director: true } },
} as const

export async function upsertUserRating(params: {
  userId: string
  actorId: string
  movieId: string
  scores: RatingScoresInput
  comment?: string | null
  isSpoiler?: boolean
  breakdown?: unknown
  ratingId?: string
  providedWeightedScore?: number
  isUpdate?: boolean
}) {
  const scoreError = validateRatingScores(params.scores)
  if (scoreError) throw new Error(scoreError)

  const commentResult = sanitizeRatingComment(params.comment)
  if (!commentResult.ok) throw new Error(commentResult.error)
  const sanitizedComment = commentResult.comment
  const isSpoiler = sanitizedComment ? parseIsSpoiler(params.isSpoiler) : false

  const calculated = computeWeightedScore(params.scores)
  const weightedScore =
    typeof params.providedWeightedScore === "number" &&
    params.providedWeightedScore >= 0 &&
    params.providedWeightedScore <= 100
      ? params.providedWeightedScore
      : calculated
  const shareScore = Math.round(weightedScore)

  if (params.isUpdate) {
    if (!params.ratingId) {
      throw new Error("Rating ID required for update")
    }
    return prisma.rating.update({
      where: { id: params.ratingId },
      data: {
        emotionalRangeDepth: params.scores.emotionalRangeDepth,
        characterBelievability: params.scores.characterBelievability,
        technicalSkill: params.scores.technicalSkill,
        screenPresence: params.scores.screenPresence,
        chemistryInteraction: params.scores.chemistryInteraction,
        weightedScore,
        shareScore,
        comment: sanitizedComment,
        isSpoiler,
        breakdown: params.breakdown !== undefined ? params.breakdown : undefined,
      },
      include: ratingInclude,
    })
  }

  const existing = await prisma.rating.findFirst({
    where: { userId: params.userId, actorId: params.actorId, movieId: params.movieId },
  })

  if (existing) {
    return prisma.rating.update({
      where: { id: existing.id },
      data: {
        emotionalRangeDepth: params.scores.emotionalRangeDepth,
        characterBelievability: params.scores.characterBelievability,
        technicalSkill: params.scores.technicalSkill,
        screenPresence: params.scores.screenPresence,
        chemistryInteraction: params.scores.chemistryInteraction,
        weightedScore,
        shareScore,
        comment: sanitizedComment,
        isSpoiler,
        breakdown: params.breakdown !== undefined ? params.breakdown : existing.breakdown,
      },
      include: ratingInclude,
    })
  }

  return prisma.rating.create({
    data: {
      id: `rating_${nanoid()}`,
      userId: params.userId,
      anonId: null,
      actorId: params.actorId,
      movieId: params.movieId,
      emotionalRangeDepth: params.scores.emotionalRangeDepth,
      characterBelievability: params.scores.characterBelievability,
      technicalSkill: params.scores.technicalSkill,
      screenPresence: params.scores.screenPresence,
      chemistryInteraction: params.scores.chemistryInteraction,
      weightedScore,
      shareScore,
      comment: sanitizedComment,
      isSpoiler,
      breakdown: params.breakdown ?? null,
    },
    include: ratingInclude,
  })
}

/** Anonymous ratings: no comments, upsert per anonId + performance. */
export async function upsertAnonRating(params: {
  anonId: string
  actorId: string
  movieId: string
  scores: RatingScoresInput
}) {
  const scoreError = validateRatingScores(params.scores)
  if (scoreError) throw new Error(scoreError)

  const weightedScore = computeWeightedScore(params.scores)
  const shareScore = Math.round(weightedScore)

  const existing = await prisma.rating.findFirst({
    where: {
      anonId: params.anonId,
      actorId: params.actorId,
      movieId: params.movieId,
      userId: null,
    },
  })

  if (existing) {
    return prisma.rating.update({
      where: { id: existing.id },
      data: {
        emotionalRangeDepth: params.scores.emotionalRangeDepth,
        characterBelievability: params.scores.characterBelievability,
        technicalSkill: params.scores.technicalSkill,
        screenPresence: params.scores.screenPresence,
        chemistryInteraction: params.scores.chemistryInteraction,
        weightedScore,
        shareScore,
      },
      select: { id: true, weightedScore: true, createdAt: true },
    })
  }

  return prisma.rating.create({
    data: {
      id: `rating_${nanoid()}`,
      userId: null,
      anonId: params.anonId,
      actorId: params.actorId,
      movieId: params.movieId,
      emotionalRangeDepth: params.scores.emotionalRangeDepth,
      characterBelievability: params.scores.characterBelievability,
      technicalSkill: params.scores.technicalSkill,
      screenPresence: params.scores.screenPresence,
      chemistryInteraction: params.scores.chemistryInteraction,
      weightedScore,
      shareScore,
      comment: null,
      isSpoiler: false,
    },
    select: { id: true, weightedScore: true, createdAt: true },
  })
}

/** Reject bot submissions that fill hidden honeypot fields. */
export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}
