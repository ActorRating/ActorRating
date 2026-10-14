import { expectedScore, updateElo } from "@/lib/faceoff/elo"
import { FACEOFF_K_FACTOR, FACEOFF_STARTING_ELO } from "@/lib/faceoff/constants"

describe("face-off elo", () => {
  it("starts from 1500 and uses K 32", () => {
    expect(FACEOFF_STARTING_ELO).toBe(1500)
    expect(FACEOFF_K_FACTOR).toBe(32)
  })

  it("treats equal ratings as a coin flip", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5)
  })

  it("moves the winner up and the loser down by the same amount", () => {
    const next = updateElo(1500, 1500, 1)
    expect(next.ratingA).toBeCloseTo(1516)
    expect(next.ratingB).toBeCloseTo(1484)
    expect(next.ratingA + next.ratingB).toBeCloseTo(3000)
  })

  it("gives a smaller gain to a heavy favorite", () => {
    const upset = updateElo(1700, 1500, 1)
    const even = updateElo(1500, 1500, 1)
    expect(upset.ratingA - 1700).toBeLessThan(even.ratingA - 1500)
  })
})
