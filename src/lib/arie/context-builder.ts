import { createHash, randomUUID } from "crypto"
import type { PrismaClient } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { ARIE_CONSTITUTION_PATH, ARIE_CONSTITUTION_VERSION } from "@/lib/arie/config"
import {
  constrainEntitiesToSource,
  extractEntitiesFromText,
  isAcceptableMovieTitleMention,
  type ExtractedEntities,
} from "@/lib/arie/entity-extract"
import { traverseNeighborhood } from "@/lib/arie/graph"
import { CASTING_RE, scoreOpportunity } from "@/lib/arie/opportunity-score"
import {
  asScoreNumber,
  castingFocusActors,
  formatScoreDisplay,
  priorRelevanceScore,
} from "@/lib/arie/prior-work"
import {
  CONTEXT_BUILDER_VERSION,
  type ArieFact,
  type ContextPackage,
  type OpportunityResult,
} from "@/lib/arie/types"
import { computeContextCoverage } from "@/lib/arie/coverage"
import { buildEvidenceLayer, type CorroborationInput } from "@/lib/arie/provenance"

const DIM_KEYS = [
  "emotionalRangeDepth",
  "characterBelievability",
  "technicalSkill",
  "screenPresence",
  "chemistryInteraction",
] as const

const DIM_LABELS: Record<(typeof DIM_KEYS)[number], string> = {
  emotionalRangeDepth: "Emotional Range & Depth",
  characterBelievability: "Character Believability",
  technicalSkill: "Technical Skill",
  screenPresence: "Screen Presence",
  chemistryInteraction: "Chemistry & Interaction",
}

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "https://actorrating.com"
  )
}

/** True when the tweet likely refers to this title (avoids random filmography focus). */
export function textMentionsTitle(text: string, title: string): boolean {
  if (isAcceptableMovieTitleMention(text, title)) return true
  const head = title.trim().split(":")[0]?.trim() ?? ""
  return (
    head.length >= 6 &&
    head.toLowerCase() !== title.trim().toLowerCase() &&
    isAcceptableMovieTitleMention(text, head)
  )
}

/** Casting / farewell / audition signal — shared with Opportunity CASTING_RE. */
export function isCastingNewsText(text: string): boolean {
  return CASTING_RE.test(text)
}

function rateHref(movieSlug: string | null, actorSlug: string | null): string | null {
  if (!movieSlug || !actorSlug) return null
  return `${siteOrigin()}/rate/${movieSlug}/${actorSlug}`
}

function asOf(): string {
  return new Date().toISOString()
}

function fact(
  partial: Omit<ArieFact, "source" | "as_of"> & { source?: ArieFact["source"] },
): ArieFact {
  return {
    ...partial,
    source: "actorrating_db",
    as_of: asOf(),
  }
}

async function communityStats(
  prisma: PrismaClient,
  actorId: string,
  movieId: string,
): Promise<{ ratingCount: number; avg10: number | null; dims: Record<string, number | null> }> {
  const ratings = await prisma.rating.findMany({
    where: { actorId, movieId, userId: { not: null } },
    select: {
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
      weightedScore: true,
    },
    take: 500,
  })
  const ratingCount = ratings.length
  const dims: Record<string, number | null> = {}
  const scored: Array<{ key: (typeof DIM_KEYS)[number]; score: number }> = []

  for (const field of DIM_KEYS) {
    const vals = ratings.map((r) => r[field]).filter((v): v is number => typeof v === "number")
    if (!vals.length) {
      dims[field] = null
    } else {
      const avg100 = vals.reduce((s, v) => s + v, 0) / vals.length
      const score = Number((avg100 / 10).toFixed(1))
      dims[field] = score
      scored.push({ key: field, score })
    }
  }

  let avg10: number | null = null
  if (ratings.length) {
    const avg =
      ratings.reduce((s, r) => s + (typeof r.weightedScore === "number" ? r.weightedScore : 0), 0) /
      ratings.length
    avg10 = Number((avg / 10).toFixed(1))
  }

  return { ratingCount, avg10, dims }
}

export async function buildContextPackage(
  prisma: PrismaClient,
  input: {
    text: string
    authorHandle?: string | null
    authorId?: string | null
    externalId?: string | null
    sourceUrl?: string | null
    ageMinutes?: number
    entities?: ExtractedEntities
    opportunity?: OpportunityResult
    /** Later corrections / walk-backs attached to the story (timestamps preserved on claims). */
    corrections?: string[]
    corroborations?: CorroborationInput[]
  },
): Promise<ContextPackage> {
  const extracted = input.entities ?? (await extractEntitiesFromText(prisma, input.text))
  const entities = constrainEntitiesToSource(input.text, extracted)
  const opportunity =
    input.opportunity ??
    scoreOpportunity({
      text: input.text,
      authorHandle: input.authorHandle,
      entities,
      ageMinutes: input.ageMinutes,
    })

  const graph = await traverseNeighborhood(prisma, entities)
  const facts: ArieFact[] = []
  const links: ContextPackage["links"] = []

  const primaryActor = entities.actors[0] ?? null
  const primaryMovie =
    entities.movies.find((m) => isAcceptableMovieTitleMention(input.text, m.title)) ?? null

  // Focus must be tweet-aligned. Never fall back to a random filmography hit
  // (Batch-1: Marsden → The Notebook on a Cyclops/Secret Wars rumor).
  let focus = graph.performances.find(
    (p) =>
      Boolean(primaryActor) &&
      Boolean(primaryMovie) &&
      p.actorId === primaryActor!.id &&
      p.movieId === primaryMovie!.id,
  )
  if (!focus && primaryActor) {
    focus = graph.performances.find(
      (p) => p.actorId === primaryActor.id && textMentionsTitle(input.text, p.movieTitle),
    )
  }
  if (!focus && primaryMovie) {
    focus = graph.performances.find((p) => p.movieId === primaryMovie.id)
  }

  let movieCard: ContextPackage["movie"] = primaryMovie
    ? {
        id: primaryMovie.id,
        title: primaryMovie.title,
        year: primaryMovie.year,
        slug: primaryMovie.slug,
        director: primaryMovie.director,
        genre: primaryMovie.genre,
        indexingCohort: primaryMovie.indexingCohort,
      }
    : focus
      ? {
          id: focus.movieId,
          title: focus.movieTitle,
          year: focus.movieYear,
          slug: focus.movieSlug,
          director: focus.director,
          genre: null,
          indexingCohort: 0,
        }
      : null

  if (movieCard && !primaryMovie) {
    const full = await prisma.movie.findUnique({
      where: { id: movieCard.id },
      select: {
        id: true,
        title: true,
        year: true,
        slug: true,
        director: true,
        genre: true,
        indexingCohort: true,
      },
    })
    if (full) movieCard = full
  }

  let actorCard: ContextPackage["actor"] = primaryActor
    ? {
        id: primaryActor.id,
        name: primaryActor.name,
        slug: primaryActor.slug,
        knownFor: null,
      }
    : focus
      ? {
          id: focus.actorId,
          name: focus.actorName,
          slug: focus.actorSlug,
          knownFor: null,
        }
      : null

  if (actorCard) {
    const full = await prisma.actor.findUnique({
      where: { id: actorCard.id },
      select: { knownFor: true },
    })
    actorCard = { ...actorCard, knownFor: full?.knownFor ?? null }
    // Do not emit "in the ActorRating catalog" — models copy it as empty promo replies.
    if (actorCard.knownFor?.trim()) {
      facts.push(
        fact({
          fact_id: `actor:${actorCard.id}:known_for`,
          type: "identity",
          text: `${actorCard.name} is often associated with ${actorCard.knownFor.trim()}.`,
          value: actorCard.knownFor.trim(),
          entity_refs: [`actor:${actorCard.id}`],
        }),
      )
    }
    if (actorCard.slug) {
      links.push({
        rel: "actor",
        href: `${siteOrigin()}/actors/${actorCard.slug}`,
        label: actorCard.name,
      })
    }
  }

  if (movieCard) {
    facts.push(
      fact({
        fact_id: `movie:${movieCard.id}`,
        type: "year",
        text: `${movieCard.title} (${movieCard.year})`,
        value: movieCard.year,
        entity_refs: [`movie:${movieCard.id}`],
      }),
    )
    if (movieCard.director) {
      facts.push(
        fact({
          fact_id: `movie:${movieCard.id}:director`,
          type: "director",
          text: `${movieCard.title} directed by ${movieCard.director}`,
          value: movieCard.director,
          entity_refs: [`movie:${movieCard.id}`, `director:${movieCard.director}`],
        }),
      )
    }
    if (movieCard.slug) {
      links.push({
        rel: "movie",
        href: `${siteOrigin()}/movies/${movieCard.slug}`,
        label: `${movieCard.title} (${movieCard.year})`,
      })
    }
  }

  const directorName =
    entities.directors[0]?.name ?? movieCard?.director ?? focus?.director ?? null
  let directorCard: ContextPackage["director"] = null
  if (directorName) {
    const films = await prisma.movie.findMany({
      where: { director: { equals: directorName, mode: "insensitive" }, isFeaturette: false },
      select: { title: true, year: true },
      orderBy: { year: "desc" },
      take: 6,
    })
    directorCard = {
      name: directorName,
      filmCount: films.length,
      notableFilms: films.map((f) => `${f.title} (${f.year})`),
    }
    if (films.length) {
      facts.push(
        fact({
          fact_id: `director:${directorName}`,
          type: "director",
          text: `${directorName} directed ${films
            .slice(0, 3)
            .map((f) => `${f.title} (${f.year})`)
            .join(", ")}.`,
          value: directorName,
          entity_refs: [`director:${directorName}`],
        }),
      )
    }
  }

  let radar: ContextPackage["radar"] = null
  let communityRating: ContextPackage["communityRating"] = null

  if (focus) {
    const stats = await communityStats(prisma, focus.actorId, focus.movieId)
    const scored = DIM_KEYS.map((k) => ({
      key: k,
      score: stats.dims[k],
    })).filter((x): x is { key: (typeof DIM_KEYS)[number]; score: number } => x.score != null)
    scored.sort((a, b) => b.score - a.score)

    radar = {
      actorId: focus.actorId,
      movieId: focus.movieId,
      actorName: focus.actorName,
      movieTitle: focus.movieTitle,
      dimensions: stats.dims,
      strongest: scored.slice(0, 2).map((s) => DIM_LABELS[s.key]),
      weakest: [...scored]
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
        .map((s) => DIM_LABELS[s.key]),
      seededAggregate: focus.seededAggregate,
    }

    communityRating = {
      actorId: focus.actorId,
      movieId: focus.movieId,
      ratingCount: stats.ratingCount,
      avg10: stats.avg10 ?? focus.seededAggregate,
    }

    for (const s of scored.slice(0, 3)) {
      facts.push(
        fact({
          fact_id: `radar:${focus.movieId}:${focus.actorId}:${s.key}`,
          type: "radar_dim",
          text: `${focus.actorName} in ${focus.movieTitle}: ${DIM_LABELS[s.key]} ${s.score}/10 (community)`,
          value: s.score,
          entity_refs: [`actor:${focus.actorId}`, `movie:${focus.movieId}`],
        }),
      )
    }
    facts.push(
      fact({
        fact_id: `perf:count:${focus.movieId}:${focus.actorId}`,
        type: "rating_count",
        text: `${stats.ratingCount} community ratings for ${focus.actorName} in ${focus.movieTitle}`,
        value: stats.ratingCount,
        entity_refs: [`actor:${focus.actorId}`, `movie:${focus.movieId}`],
      }),
    )

    const href = rateHref(focus.movieSlug, focus.actorSlug)
    if (href) {
      links.push({
        rel: "rate",
        href,
        label: `Rate ${focus.actorName} in ${focus.movieTitle}`,
      })
    }
  }

  // Rating counts for top performances (batched lightly)
  const topPerformances: ContextPackage["topPerformances"] = []
  for (const p of graph.performances.slice(0, 8)) {
    const count = await prisma.rating.count({
      where: { actorId: p.actorId, movieId: p.movieId, userId: { not: null } },
    })
    topPerformances.push({
      actorId: p.actorId,
      movieId: p.movieId,
      actorName: p.actorName,
      movieTitle: p.movieTitle,
      movieYear: p.movieYear,
      character: p.character,
      seededAggregate: p.seededAggregate,
      ratingCount: count,
      href: rateHref(p.movieSlug, p.actorSlug),
    })
  }

  const relatedPerformances: ContextPackage["relatedPerformances"] = graph.performances
    .filter((p) => !focus || p.actorId !== focus.actorId || p.movieId !== focus.movieId)
    .slice(0, 6)
    .map((p) => ({
      actorName: p.actorName,
      movieTitle: p.movieTitle,
      movieYear: p.movieYear,
      href: rateHref(p.movieSlug, p.actorSlug),
      note: p.director ? `Dir. ${p.director}` : p.tier,
    }))

  // Only expose aggregates the tweet can use — never a silent filmography dump.
  const factIds = new Set<string>()
  for (const p of topPerformances) {
    const aligned =
      (focus && p.actorId === focus.actorId && p.movieId === focus.movieId) ||
      textMentionsTitle(input.text, p.movieTitle)
    if (!aligned) continue
    if (typeof p.seededAggregate !== "number") continue
    const factId = `perf:agg:${p.movieId}:${p.actorId}`
    factIds.add(factId)
    facts.push(
      fact({
        fact_id: factId,
        type: "aggregate_score",
        text: `${p.actorName} in ${p.movieTitle} (${p.movieYear}): aggregate ${p.seededAggregate}/10 on ActorRating`,
        value: p.seededAggregate,
        entity_refs: [`actor:${p.actorId}`, `movie:${p.movieId}`],
      }),
    )
  }

  const castingNews = isCastingNewsText(input.text)

  // Batch-3c: focus actors in the tweet head (ignore “interested in X” tags)
  // and prefer franchise-relevant priors over pure top aggregate.
  if (castingNews) {
    const focusActors = castingFocusActors(input.text, entities.actors)
    for (const actor of focusActors) {
      const priors = await prisma.performance.findMany({
        where: {
          userId: SYSTEM_USER_ID,
          actorId: actor.id,
          tier: { in: ["LEAD", "SUPPORTING"] },
          movie: { isFeaturette: false },
        },
        select: {
          actorId: true,
          movieId: true,
          character: true,
          seededAggregateScore: true,
          actor: { select: { name: true } },
          movie: { select: { title: true, year: true, genre: true } },
        },
        orderBy: [{ seededAggregateScore: "desc" }, { order: "asc" }],
        take: 12,
      })

      const ranked = priors
        .map((p) => {
          const score = asScoreNumber(p.seededAggregateScore)
          if (score == null) return null
          if (focus && p.actorId === focus.actorId && p.movieId === focus.movieId) return null
          return {
            p,
            score,
            rel: priorRelevanceScore(input.text, p.movie.title, p.character, p.movie.genre),
          }
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .sort((a, b) => b.rel - a.rel || b.score - a.score)

      let added = 0
      for (const row of ranked) {
        const factId = `perf:prior:${row.p.movieId}:${row.p.actorId}`
        if (factIds.has(`perf:agg:${row.p.movieId}:${row.p.actorId}`) || factIds.has(factId)) {
          continue
        }
        factIds.add(factId)
        facts.push(
          fact({
            fact_id: factId,
            type: "aggregate_score",
            text: `Prior work — ${row.p.actor.name} in ${row.p.movie.title} (${row.p.movie.year}): aggregate ${formatScoreDisplay(row.score)}/10 on ActorRating (not a score for the newly announced role)`,
            value: Number(formatScoreDisplay(row.score)),
            entity_refs: [`actor:${row.p.actorId}`, `movie:${row.p.movieId}`],
          }),
        )
        added += 1
        if (added >= 2) break
      }
    }
  }

  // Similar actors: co-stars on shared director/movies (lightweight)
  const similarActors: ContextPackage["similarActors"] = []
  if (directorName) {
    const costars = await prisma.performance.findMany({
      where: {
        userId: SYSTEM_USER_ID,
        tier: { in: ["LEAD", "SUPPORTING"] },
        movie: { director: { equals: directorName, mode: "insensitive" }, isFeaturette: false },
        actorId: primaryActor ? { not: primaryActor.id } : undefined,
      },
      select: {
        actor: { select: { id: true, name: true, slug: true } },
        seededAggregateScore: true,
      },
      orderBy: { seededAggregateScore: "desc" },
      take: 8,
    })
    const seen = new Set<string>()
    for (const c of costars) {
      if (seen.has(c.actor.id)) continue
      seen.add(c.actor.id)
      similarActors.push({
        id: c.actor.id,
        name: c.actor.name,
        slug: c.actor.slug,
        note: `Also worked with ${directorName}`,
      })
      if (similarActors.length >= 5) break
    }
  }

  const currentTrend = castingNews
    ? {
        label: "casting_news",
        note: "Casting / role news — use prior-work aggregates for craft comps; never invent a score for the unreleased role.",
      }
    : entities.actors.length
      ? {
          label: "actor_mention",
          note: "Actor mentioned with ActorRating grounding available.",
        }
      : null

  // Collaborations fact
  if (primaryActor && directorName) {
    const collabCount = graph.performances.filter(
      (p) => p.actorId === primaryActor.id && p.director?.toLowerCase() === directorName.toLowerCase(),
    ).length
    if (collabCount > 0) {
      facts.push(
        fact({
          fact_id: `collab:${primaryActor.id}:${directorName}`,
          type: "collaboration",
          text: `${primaryActor.name} has ${collabCount} tracked LEAD/SUPPORTING performance(s) with ${directorName} in ActorRating.`,
          value: collabCount,
          entity_refs: [`actor:${primaryActor.id}`, `director:${directorName}`],
        }),
      )
    }
  }

  const packageId = randomUUID()

  const { source, claims, evidence } = buildEvidenceLayer({
    text: input.text,
    authorHandle: input.authorHandle,
    externalId: input.externalId,
    sourceUrl: input.sourceUrl,
    entities,
    facts,
    corrections: input.corrections,
    corroborations: input.corroborations,
  })

  const base: Omit<ContextPackage, "coverage"> = {
    package_id: packageId,
    created_at: asOf(),
    builder_version: CONTEXT_BUILDER_VERSION,
    event: {
      text: input.text,
      platform: "X",
      external_id: input.externalId ?? null,
      author_handle: input.authorHandle ?? null,
      author_id: input.authorId ?? null,
    },
    opportunity,
    movie: movieCard,
    actor: actorCard,
    actors: entities.actors.map((a, i) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      role: i === 0 ? "primary" : "mentioned",
    })),
    director: directorCard,
    radar,
    topPerformances,
    communityRating,
    relatedPerformances,
    currentTrend,
    similarActors,
    links,
    facts,
    claims,
    sourceProvenance: source,
    evidence,
    factualConfidence: evidence.factualConfidence,
    writerMode: evidence.writerMode,
    brand: {
      constitution_version: ARIE_CONSTITUTION_VERSION,
      constitution_path: ARIE_CONSTITUTION_PATH,
    },
    unresolved: entities.unresolved,
    graph: { nodes: graph.nodes, edges: graph.edges },
    budgets: {
      max_tokens_for_writer: 700,
      max_claims: Math.min(8, Math.max(2, facts.length)),
    },
  }

  const coverage = computeContextCoverage(base)
  return { ...base, coverage }
}

export function contextPackageHash(pkg: ContextPackage): string {
  return createHash("sha256")
    .update(JSON.stringify({ facts: pkg.facts, event: pkg.event.text }))
    .digest("hex")
    .slice(0, 16)
}
