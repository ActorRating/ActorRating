/** ARIE Sprint 2 — shared types for Context Packages & Opportunity Score. */

export const CONTEXT_BUILDER_VERSION = "context-builder@2.0"

export type ArieFact = {
  fact_id: string
  type:
    | "identity"
    | "radar_dim"
    | "aggregate_score"
    | "rating_count"
    | "cast"
    | "year"
    | "director"
    | "collaboration"
  text: string
  value?: number | string | null
  entity_refs: string[]
  source: "actorrating_db"
  as_of: string
}

export type ArieLink = {
  rel: string
  href: string
  label: string
}

export type OpportunityBreakdown = {
  relevance: number
  virality: number
  arContext: number
  uniqueness: number
  competition: number
  freshness: number
}

export type OpportunityResult = {
  score: number
  breakdown: OpportunityBreakdown
  decision: "ignore" | "process"
  suggestedFormat: "reply" | "quote" | "ignore"
  reasonCodes: string[]
  priorityAuthor: boolean
}

/** Canonical package every agent consumes — LLM must not invent fetch plans. */
export type ContextPackage = {
  package_id: string
  created_at: string
  builder_version: string
  event: {
    text: string
    platform: "X"
    external_id?: string | null
    author_handle?: string | null
    author_id?: string | null
  }
  opportunity: OpportunityResult
  movie: null | {
    id: string
    title: string
    year: number
    slug: string | null
    director: string | null
    genre: string | null
    indexingCohort: number
  }
  actor: null | {
    id: string
    name: string
    slug: string | null
    knownFor: string | null
  }
  actors: Array<{ id: string; name: string; slug: string | null; role: "primary" | "mentioned" }>
  director: null | { name: string; filmCount: number; notableFilms: string[] }
  radar: null | {
    actorId: string
    movieId: string
    actorName: string
    movieTitle: string
    dimensions: Record<string, number | null>
    strongest: string[]
    weakest: string[]
    seededAggregate: number | null
  }
  topPerformances: Array<{
    actorId: string
    movieId: string
    actorName: string
    movieTitle: string
    movieYear: number
    character: string | null
    seededAggregate: number | null
    ratingCount: number
    href: string | null
  }>
  communityRating: null | {
    actorId: string
    movieId: string
    ratingCount: number
    avg10: number | null
  }
  relatedPerformances: Array<{
    actorName: string
    movieTitle: string
    movieYear: number
    href: string | null
    note: string
  }>
  currentTrend: null | {
    label: string
    note: string
  }
  similarActors: Array<{ id: string; name: string; slug: string | null; note: string }>
  links: ArieLink[]
  facts: ArieFact[]
  brand: {
    constitution_version: string
    constitution_path: string
  }
  unresolved: Array<{ mention: string; reason: string }>
  graph: {
    nodes: Array<{ id: string; type: string; label: string }>
    edges: Array<{ from: string; to: string; type: string }>
  }
  budgets: {
    max_tokens_for_writer: number
    max_claims: number
  }
}
