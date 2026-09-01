/**
 * Date-stable daily slices for landing / discover poster rails.
 * Pools are editorial; the live catalog query hydrates posters when available.
 */

export type PerformanceTarget = {
  actor: string
  movie: string
  character?: string
  year?: number
  posterPath?: string
}

export const DAILY_RAIL_COUNT = 8

export function utcDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function secondsUntilNextUtcMidnight(now = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  )
  return Math.max(60, Math.floor((next - now.getTime()) / 1000))
}

/** djb2 */
export function hashSeed(seed: string): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = items.slice()
  const rand = mulberry32(hashSeed(seed))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickDailySlice<T>(
  items: T[],
  opts: {
    seed: string
    count: number
    actorKey: (item: T) => string
    movieKey: (item: T) => string
    excludeActors?: Set<string>
    excludeMovies?: Set<string>
  },
): T[] {
  const seenActors = new Set(
    [...(opts.excludeActors ?? [])].map((s) => s.toLowerCase()),
  )
  const seenMovies = new Set(
    [...(opts.excludeMovies ?? [])].map((s) => s.toLowerCase()),
  )
  const out: T[] = []
  for (const item of seededShuffle(items, opts.seed)) {
    if (out.length >= opts.count) break
    const actor = opts.actorKey(item).trim().toLowerCase()
    const movie = opts.movieKey(item).trim().toLowerCase()
    if (!actor || !movie) continue
    if (seenActors.has(actor) || seenMovies.has(movie)) continue
    seenActors.add(actor)
    seenMovies.add(movie)
    out.push(item)
  }
  return out
}

/** Currently-in-conversation / theatrical-era performances (2024–2026). */
export const POPULAR_RIGHT_NOW_POOL: PerformanceTarget[] = [
  { actor: "Matt Damon", movie: "The Odyssey", character: "Odysseus", year: 2026, posterPath: "/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg" },
  { actor: "Ryan Gosling", movie: "Project Hail Mary", character: "Ryland Grace", year: 2026, posterPath: "/tYUu5AWnDUoeBnRI1uRv0kzlKWK.jpg" },
  { actor: "Leonardo DiCaprio", movie: "One Battle After Another", character: "Bob", year: 2025, posterPath: "/tYWXhJ4FwvQMo6hbLQKQXk1gZvq.jpg" },
  { actor: "Michael B. Jordan", movie: "Sinners", character: "Smoke / Stack", year: 2025, posterPath: "/tvRgDns7bJuIWkEaF6JJMKr8kNA.jpg" },
  { actor: "Timothée Chalamet", movie: "Marty Supreme", character: "Marty Mauser", year: 2025, posterPath: "/pIcPHrIvC02KBwXbRqBd3jOhELU.jpg" },
  { actor: "Jessie Buckley", movie: "Hamnet", character: "Agnes", year: 2025, posterPath: "/lncg31XDBdfYxrOnhrzVAUw8geT.jpg" },
  { actor: "Brad Pitt", movie: "F1", character: "Sonny Hayes", year: 2025, posterPath: "/825brjnT8bJGLSaP6GEw5mIGjZp.jpg" },
  { actor: "David Corenswet", movie: "Superman", character: "Clark Kent", year: 2025, posterPath: "/mndGq35yDCm8QSuTKRdF2o0KkB7.jpg" },
  { actor: "Robert Pattinson", movie: "Mickey 17", character: "Mickey Barnes", year: 2025, posterPath: "/ewHfahsUgKtvYJwmwVuNsKwkc39.jpg" },
  { actor: "Tom Cruise", movie: "Mission: Impossible - The Final Reckoning", character: "Ethan Hunt", year: 2025, posterPath: "/d2HIdVIzuIUgIBxL4N0C9XeNeSX.jpg" },
  { actor: "Julia Garner", movie: "Weapons", character: "Justine", year: 2025, posterPath: "/xhOBuRRfQFH0IQyLPJeMOCa4hlY.jpg" },
  { actor: "Demi Moore", movie: "The Substance", character: "Elisabeth Sparkle", year: 2024, posterPath: "/uYJvxMWMb9W4zIY3cbM50sj3dpC.jpg" },
  { actor: "Mikey Madison", movie: "Anora", character: "Ani", year: 2024, posterPath: "/zdJP1EvyL6G58NIQJj0n5T2l7u7.jpg" },
  { actor: "Adrien Brody", movie: "The Brutalist", character: "László Tóth", year: 2024, posterPath: "/66UKVKW6sqeYPDYYHxriomXMkEL.jpg" },
  { actor: "Ralph Fiennes", movie: "Conclave", character: "Cardinal Lawrence", year: 2024, posterPath: "/eJ0KIFewo6jw51f2Dy0iujEXmqd.jpg" },
  { actor: "Timothée Chalamet", movie: "Dune: Part Two", character: "Paul Atreides", year: 2024, posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { actor: "Zendaya", movie: "Challengers", character: "Tashi Duncan", year: 2024, posterPath: "/H6vke7zGiuLsz4v4RPeReb9rsv.jpg" },
  { actor: "Cynthia Erivo", movie: "Wicked", character: "Elphaba", year: 2024, posterPath: "/qaqQqYRjK3djrOZAeKQBdVFtQqh.jpg" },
  { actor: "Timothée Chalamet", movie: "A Complete Unknown", character: "Bob Dylan", year: 2024, posterPath: "/yzqHt4m1SeY9FbPrfZ0C2Hi9x1s.jpg" },
  { actor: "Lily-Rose Depp", movie: "Nosferatu", character: "Ellen Hutter", year: 2024, posterPath: "/osBGGlyIwsnSDIJ3vy83JpH1OUY.jpg" },
  { actor: "Cillian Murphy", movie: "Oppenheimer", character: "J. Robert Oppenheimer", year: 2023, posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  { actor: "Austin Butler", movie: "Elvis", character: "Elvis Presley", year: 2022, posterPath: "/qBOKWqAFbveZ4ryjJJwbie6tXkQ.jpg" },
]

/** Acclaimed turns from roughly the last few years — not the same as “out this week”. */
export const RECENT_FAVORITES_POOL: PerformanceTarget[] = [
  { actor: "Michael B. Jordan", movie: "Sinners", character: "Smoke / Stack", year: 2025, posterPath: "/tvRgDns7bJuIWkEaF6JJMKr8kNA.jpg" },
  { actor: "Jessie Buckley", movie: "Hamnet", character: "Agnes", year: 2025, posterPath: "/lncg31XDBdfYxrOnhrzVAUw8geT.jpg" },
  { actor: "Leonardo DiCaprio", movie: "One Battle After Another", character: "Bob", year: 2025, posterPath: "/tYWXhJ4FwvQMo6hbLQKQXk1gZvq.jpg" },
  { actor: "Timothée Chalamet", movie: "Marty Supreme", character: "Marty Mauser", year: 2025, posterPath: "/pIcPHrIvC02KBwXbRqBd3jOhELU.jpg" },
  { actor: "Robert Pattinson", movie: "Mickey 17", character: "Mickey Barnes", year: 2025, posterPath: "/ewHfahsUgKtvYJwmwVuNsKwkc39.jpg" },
  { actor: "Mikey Madison", movie: "Anora", character: "Ani", year: 2024, posterPath: "/zdJP1EvyL6G58NIQJj0n5T2l7u7.jpg" },
  { actor: "Adrien Brody", movie: "The Brutalist", character: "László Tóth", year: 2024, posterPath: "/66UKVKW6sqeYPDYYHxriomXMkEL.jpg" },
  { actor: "Ralph Fiennes", movie: "Conclave", character: "Cardinal Lawrence", year: 2024, posterPath: "/eJ0KIFewo6jw51f2Dy0iujEXmqd.jpg" },
  { actor: "Demi Moore", movie: "The Substance", character: "Elisabeth Sparkle", year: 2024, posterPath: "/uYJvxMWMb9W4zIY3cbM50sj3dpC.jpg" },
  { actor: "Emma Stone", movie: "Poor Things", character: "Bella Baxter", year: 2023, posterPath: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg" },
  { actor: "Cillian Murphy", movie: "Oppenheimer", character: "J. Robert Oppenheimer", year: 2023, posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  { actor: "Zendaya", movie: "Challengers", character: "Tashi Duncan", year: 2024, posterPath: "/H6vke7zGiuLsz4v4RPeReb9rsv.jpg" },
  { actor: "Timothée Chalamet", movie: "Dune: Part Two", character: "Paul Atreides", year: 2024, posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { actor: "Cynthia Erivo", movie: "Wicked", character: "Elphaba", year: 2024, posterPath: "/qaqQqYRjK3djrOZAeKQBdVFtQqh.jpg" },
  { actor: "Lily-Rose Depp", movie: "Nosferatu", character: "Ellen Hutter", year: 2024, posterPath: "/osBGGlyIwsnSDIJ3vy83JpH1OUY.jpg" },
  { actor: "Timothée Chalamet", movie: "A Complete Unknown", character: "Bob Dylan", year: 2024, posterPath: "/yzqHt4m1SeY9FbPrfZ0C2Hi9x1s.jpg" },
  { actor: "Leonardo DiCaprio", movie: "Killers of the Flower Moon", character: "Ernest Burkhart", year: 2023, posterPath: "/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg" },
  { actor: "Margot Robbie", movie: "Barbie", character: "Barbie", year: 2023, posterPath: "/o1BB6Cimho6R72QzJDwcwnCkp2a.jpg" },
  { actor: "Michelle Yeoh", movie: "Everything Everywhere All at Once", character: "Evelyn Wang", year: 2022, posterPath: "/vt5Fd1wouNEL7HN3TQ0PMls4auE.jpg" },
  { actor: "Ke Huy Quan", movie: "Everything Everywhere All at Once", character: "Waymond Wang", year: 2022, posterPath: "/vt5Fd1wouNEL7HN3TQ0PMls4auE.jpg" },
  { actor: "Colin Farrell", movie: "The Banshees of Inisherin", character: "Pádraic Súilleabháin", year: 2022, posterPath: "/4yFG6cSPaCaPhyJ1vtGOtMD1lgh.jpg" },
  { actor: "Paul Mescal", movie: "Aftersun", character: "Calum", year: 2022, posterPath: "/evKz85EKouVbIr51zy5fOtpNRPg.jpg" },
  { actor: "Austin Butler", movie: "Elvis", character: "Elvis Presley", year: 2022, posterPath: "/qBOKWqAFbveZ4ryjJJwbie6tXkQ.jpg" },
]

const targetActor = (t: PerformanceTarget) => t.actor
const targetMovie = (t: PerformanceTarget) => t.movie

export function popularRightNowTargets(now = new Date()): PerformanceTarget[] {
  return pickDailySlice(POPULAR_RIGHT_NOW_POOL, {
    seed: `popular:${utcDateKey(now)}`,
    count: DAILY_RAIL_COUNT,
    actorKey: targetActor,
    movieKey: targetMovie,
  })
}

export function recentFavoritesTargets(now = new Date()): PerformanceTarget[] {
  const popular = popularRightNowTargets(now)
  return pickDailySlice(RECENT_FAVORITES_POOL, {
    seed: `recent:${utcDateKey(now)}`,
    count: DAILY_RAIL_COUNT,
    actorKey: targetActor,
    movieKey: targetMovie,
    excludeActors: new Set(popular.map((t) => t.actor)),
    excludeMovies: new Set(popular.map((t) => t.movie)),
  })
}
