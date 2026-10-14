import { FACEOFF_K_FACTOR, FACEOFF_STARTING_ELO } from "@/lib/faceoff/constants"

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
}

export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k: number = FACEOFF_K_FACTOR,
): { ratingA: number; ratingB: number } {
  const expectedA = expectedScore(ratingA, ratingB)
  const expectedB = 1 - expectedA
  const scoreB = 1 - scoreA
  return {
    ratingA: ratingA + k * (scoreA - expectedA),
    ratingB: ratingB + k * (scoreB - expectedB),
  }
}

export { FACEOFF_STARTING_ELO }
