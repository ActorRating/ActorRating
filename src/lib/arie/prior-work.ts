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

/** Higher = better prior for this tweet (franchise/title/character overlap). */
export function priorRelevanceScore(
  tweet: string,
  movieTitle: string,
  character?: string | null,
): number {
  const t = tweet.toLowerCase()
  const title = movieTitle.toLowerCase()
  let score = 0

  for (const w of title.split(/[^a-z0-9]+/).filter((x) => x.length > 3)) {
    if (t.includes(w)) score += 4
  }
  if (character) {
    const c = character.toLowerCase()
    for (const w of c.split(/[^a-z0-9]+/).filter((x) => x.length > 3)) {
      if (t.includes(w)) score += 6
    }
  }

  const packs: string[][] = [
    ["x-men", "xmen", "cyclops", "wolverine", "mutant", "jean grey", "professor x"],
    ["avengers", "marvel", "mcu", "captain america", "scarlet witch", "iron man", "spider-man", "spiderman"],
    ["star wars", "jedi", "sith"],
    ["batman", "gotham", "dc"],
  ]
  for (const pack of packs) {
    const tweetHit = pack.some((k) => t.includes(k))
    const titleHit = pack.some((k) => title.includes(k))
    if (tweetHit && titleHit) score += 10
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

const TEMPLATES: Array<
  (p: { name: string; movie: string; year: string; score: string }) => string
> = [
  (p) =>
    `${p.name}'s ${p.movie} (${p.year}) is ${p.score}/10 on ActorRating — solid craft context for this casting talk.`,
  (p) =>
    `Craft check: ${p.name} in ${p.movie} clocks ${p.score}/10 with us.`,
  (p) =>
    `On ActorRating, ${p.name}'s ${p.movie} performance sits at ${p.score}/10 — a useful baseline here.`,
  (p) =>
    `${p.movie} (${p.year}) put ${p.name} at ${p.score}/10 on ActorRating; worth keeping in mind for this role news.`,
  (p) =>
    `${p.name} already has a ${p.score}/10 mark from us for ${p.movie} — that craft history is the interesting part of this announcement.`,
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
