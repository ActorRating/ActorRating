import {
  DAILY_RAIL_COUNT,
  POPULAR_RIGHT_NOW_POOL,
  RECENT_FAVORITES_POOL,
  pickDailySlice,
  popularRightNowTargets,
  recentFavoritesTargets,
  utcDateKey,
} from "../daily-rail-picks"

describe("daily rail picks", () => {
  it("uses UTC YYYY-MM-DD as the date key", () => {
    expect(utcDateKey(new Date("2026-09-01T03:00:00.000Z"))).toBe("2026-09-01")
    expect(utcDateKey(new Date("2026-09-01T23:59:59.000Z"))).toBe("2026-09-01")
  })

  it("returns the same popular slice for the same UTC day", () => {
    const a = popularRightNowTargets(new Date("2026-09-01T01:00:00.000Z"))
    const b = popularRightNowTargets(new Date("2026-09-01T22:00:00.000Z"))
    expect(a).toEqual(b)
    expect(a).toHaveLength(DAILY_RAIL_COUNT)
  })

  it("can change popular titles between days", () => {
    const a = popularRightNowTargets(new Date("2026-09-01T12:00:00.000Z"))
    const b = popularRightNowTargets(new Date("2026-09-08T12:00:00.000Z"))
    const keys = (list: typeof a) => list.map((t) => `${t.actor}:${t.movie}`).sort()
    expect(keys(a)).not.toEqual(keys(b))
  })

  it("keeps unique actors and movies within a slice", () => {
    const popular = popularRightNowTargets(new Date("2026-09-01T12:00:00.000Z"))
    const recent = recentFavoritesTargets(new Date("2026-09-01T12:00:00.000Z"))
    const actors = new Set(popular.map((t) => t.actor))
    const movies = new Set(popular.map((t) => t.movie))
    expect(actors.size).toBe(popular.length)
    expect(movies.size).toBe(popular.length)

    const overlapMovies = recent.filter((t) => movies.has(t.movie))
    const overlapActors = recent.filter((t) => actors.has(t.actor))
    expect(overlapMovies).toEqual([])
    expect(overlapActors).toEqual([])
    expect(recent).toHaveLength(DAILY_RAIL_COUNT)
  })

  it("has pools large enough to rotate", () => {
    expect(POPULAR_RIGHT_NOW_POOL.length).toBeGreaterThan(DAILY_RAIL_COUNT)
    expect(RECENT_FAVORITES_POOL.length).toBeGreaterThan(DAILY_RAIL_COUNT)
  })

  it("honors exclude sets when picking", () => {
    const picked = pickDailySlice(POPULAR_RIGHT_NOW_POOL, {
      seed: "test",
      count: 3,
      actorKey: (t) => t.actor,
      movieKey: (t) => t.movie,
      excludeActors: new Set(["Matt Damon"]),
      excludeMovies: new Set(["Sinners"]),
    })
    expect(picked.some((t) => t.actor === "Matt Damon")).toBe(false)
    expect(picked.some((t) => t.movie === "Sinners")).toBe(false)
    expect(picked).toHaveLength(3)
  })
})
