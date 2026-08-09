/**
 * Helpers for casting-news prior selection + varied fallback replies.
 */

export function castingFocusActors<T extends { id: string; name: string }>(
  text: string,
  actors: T[],
): T[] {
  if (!actors.length) return []
  const lower = text.toLowerCase()
  const cut = lower.search(
    /\b(interested in|also reportedly|also considered|rumou?red alongside|among others)\b/i,
  )
  const head = cut >= 0 ? text.slice(0, cut) : text
  const headLower = head.toLowerCase()
  const inHead = actors.filter((a) => headLower.includes(a.name.toLowerCase()))
  if (inHead.length) return inHead.slice(0, 2)
  // Fall back to earliest-mentioned actor in full text
  const ranked = [...actors].sort((a, b) => {
    const ia = lower.indexOf(a.name.toLowerCase())
    const ib = lower.indexOf(b.name.toLowerCase())
    return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib)
  })
  return ranked.slice(0, 1)
}

export function asScoreNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (v != null && typeof v === "object" && "toNumber" in v) {
    try {
      const n = (v as { toNumber: () => number }).toNumber()
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    }
  }
  if (typeof v === "string" && v.trim()) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Short/common title words that falsely match tweet filler ("going back to…"). */
const WEAK_TITLE_TOKENS = new Set([
  "want",
  "back",
  "with",
  "from",
  "that",
  "this",
  "love",
  "life",
  "night",
  "time",
  "film",
  "movie",
  "part",
  "story",
  "house",
  "last",
  "first",
  "good",
  "best",
  "next",
  "year",
  "years",
  "days",
  "into",
  "over",
  "under",
  "after",
  "before",
  "about",
  "just",
  "only",
  "very",
  "more",
  "most",
  "some",
  "when",
  "what",
  "your",
  "their",
  "been",
  "have",
  "will",
  "make",
  "made",
  "like",
  "come",
  "goes",
  "going",
  "here",
  "there",
  "world",
  "little",
  "great",
  "true",
  "real",
  "american",
])

function significantTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((x) => x.length > 3 && !WEAK_TITLE_TOKENS.has(x))
}

/**
 * Tweet cues → title/genre affinity for casting comps
 * (e.g. Crawl water-horror sequel → Fall over a romcom).
 */
const THEME_PACKS: Array<{
  tweet: string[]
  titles: string[]
  genres: string[]
  boost: number
}> = [
  {
    tweet: [
      "crawl",
      "water",
      "ocean",
      "shark",
      "alligator",
      "crocodile",
      "creature",
      "sleeper hit",
    ],
    titles: [
      "fall",
      "crawl",
      "the meg",
      "47 meters",
      "deep blue",
      "the shallows",
      "jaws",
      "prey",
      "a quiet place",
      "don't breathe",
    ],
    genres: ["horror", "thriller", "action", "adventure"],
    boost: 14,
  },
  {
    tweet: ["supermax", "prison", "action-thriller", "action thriller"],
    titles: ["mudbound", "zero dark", "sicario", "the town", "prisoners"],
    genres: ["thriller", "action", "crime", "drama"],
    boost: 10,
  },
  {
    tweet: ["romcom", "romantic comedy", "romance"],
    titles: ["want you back", "anyone but you", "crazy rich"],
    genres: ["comedy", "romance"],
    boost: 10,
  },
]

/** Higher = better prior for this tweet (franchise/title/character/theme overlap). */
export function priorRelevanceScore(
  tweet: string,
  movieTitle: string,
  character?: string | null,
  genre?: string | null,
): number {
  const t = tweet.toLowerCase()
  const title = movieTitle.toLowerCase()
  let score = 0

  const titleTokens = significantTitleTokens(movieTitle)
  let tokenHits = 0
  for (const w of titleTokens) {
    if (t.includes(w)) {
      score += 4
      tokenHits += 1
    }
  }
  // Prefer real multi-token title overlap; single weak hits are ignored above
  if (tokenHits >= 2) score += 4
  if (title.length > 5 && t.includes(title)) score += 8

  if (character) {
    const c = character.toLowerCase()
    for (const w of c.split(/[^a-z0-9]+/).filter((x) => x.length > 3 && !WEAK_TITLE_TOKENS.has(x))) {
      if (t.includes(w)) score += 6
    }
  }

  const packs: string[][] = [
    ["x-men", "xmen", "cyclops", "wolverine", "mutant", "jean grey", "professor x"],
    [
      "avengers",
      "marvel",
      "mcu",
      "captain america",
      "scarlet witch",
      "iron man",
      "spider-man",
      "spiderman",
      "captain britain",
    ],
    ["star wars", "jedi", "sith"],
    ["batman", "gotham", "dc", "justice league", "superman"],
  ]
  for (const pack of packs) {
    const tweetHit = pack.some((k) => t.includes(k))
    const titleHit = pack.some((k) => title.includes(k))
    if (tweetHit && titleHit) score += 10
  }

  const genreLower = (genre ?? "").toLowerCase()
  for (const theme of THEME_PACKS) {
    const tweetHit = theme.tweet.some((k) => t.includes(k))
    if (!tweetHit) continue
    const titleHit = theme.titles.some((k) => title.includes(k))
    const genreHit = theme.genres.some((g) => genreLower.includes(g))
    if (titleHit) score += theme.boost
    else if (genreHit) score += Math.round(theme.boost * 0.6)
  }

  // Soft penalty: romcom title when tweet is clearly creature/water thriller
  if (
    THEME_PACKS[0]!.tweet.some((k) => t.includes(k)) &&
    /\b(want you back|romantic|rom-?com)\b/i.test(title + " " + genreLower)
  ) {
    score -= 8
  }

  return score
}

export function pickPriorWorkFact<
  T extends { text: string; value?: number | string | null; fact_id: string; type: string },
>(facts: T[], tweet: string): T | null {
  const priors = facts.filter(
    (f) => f.type === "aggregate_score" && f.fact_id.startsWith("perf:prior:") && asScoreNumber(f.value) != null,
  )
  if (!priors.length) return null

  const scored = priors.map((f) => {
    const m = f.text.match(/^Prior work — (.+?) in (.+?) \((\d+)\): aggregate/i)
    const movie = m?.[2] ?? ""
    const rel = priorRelevanceScore(tweet, movie)
    const score = asScoreNumber(f.value) ?? 0
    return { f, rel, score }
  })
  scored.sort((a, b) => b.rel - a.rel || b.score - a.score)
  return scored[0]?.f ?? null
}

/** Engaging but brand-safe: grounded score + a short hook that invites discussion. */
const TEMPLATES: Array<
  (p: { name: string; movie: string; year: string; score: string }) => string
> = [
  (p) =>
    `${p.name}'s ${p.movie} (${p.year}) is ${p.score}/10 on ActorRating — does that craft baseline change how you read this casting?`,
  (p) =>
    `ActorRating has ${p.name} at ${p.score}/10 for ${p.movie} — what should we expect them to bring here?`,
  (p) =>
    `${p.score}/10 on ActorRating for ${p.name} in ${p.movie} (${p.year}). Fair reference point for this news?`,
  (p) =>
    `${p.movie} put ${p.name} at ${p.score}/10 with us — the interesting question is whether that same register shows up in this role.`,
  (p) =>
    `Before this news hits the discourse: ${p.name}'s ${p.movie} sits at ${p.score}/10 on ActorRating. Agree with that read?`,
  (p) =>
    `${p.name} already earned ${p.score}/10 from us on ${p.movie} — is that the right craft bar for this announcement?`,
  (p) =>
    `Craft check from us: ${p.name} in ${p.movie} = ${p.score}/10. Which part of that performance do you want more of here?`,
  (p) =>
    `On ActorRating, ${p.name}'s ${p.movie} lands ${p.score}/10 — curious what you think transfers to this project.`,
  (p) =>
    `${p.name} · ${p.movie} · ${p.score}/10 on ActorRating. Does that number match your take going into this cast news?`,
  (p) =>
    `We have ${p.name} at ${p.score}/10 for ${p.movie} (${p.year}) — soft or strong floor for judging this move?`,
]

export function formatPriorWorkReply(input: {
  name: string
  movie: string
  year: string
  score: number
  seed: string
}): string {
  const idx =
    Math.abs(
      [...input.seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 0),
    ) % TEMPLATES.length
  const score = Number(input.score.toFixed(input.score % 1 === 0 ? 0 : 1))
  return TEMPLATES[idx]!({
    name: input.name,
    movie: input.movie,
    year: input.year,
    score: String(score),
  })
}
