import type { PrismaClient } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"

export type GraphNeighborhood = {
  nodes: Array<{ id: string; type: string; label: string }>
  edges: Array<{ from: string; to: string; type: string }>
  performances: Array<{
    actorId: string
    movieId: string
    actorName: string
    movieTitle: string
    movieYear: number
    movieSlug: string | null
    actorSlug: string | null
    character: string | null
    tier: string
    seededAggregate: number | null
    director: string | null
  }>
}

/**
 * Traverse ActorRating relationships from resolved seeds (no open-web search).
 */
export async function traverseNeighborhood(
  prisma: PrismaClient,
  entities: ExtractedEntities,
  opts: { maxPerformances?: number } = {},
): Promise<GraphNeighborhood> {
  const maxPerformances = opts.maxPerformances ?? 12
  const nodes: GraphNeighborhood["nodes"] = []
  const edges: GraphNeighborhood["edges"] = []
  const nodeIds = new Set<string>()

  const addNode = (id: string, type: string, label: string) => {
    if (nodeIds.has(id)) return
    nodeIds.add(id)
    nodes.push({ id, type, label })
  }

  for (const a of entities.actors) {
    addNode(`actor:${a.id}`, "Actor", a.name)
  }
  for (const m of entities.movies) {
    addNode(`movie:${m.id}`, "Movie", `${m.title} (${m.year})`)
    if (m.director) addNode(`director:${m.director}`, "Director", m.director)
  }
  for (const d of entities.directors) {
    addNode(`director:${d.name}`, "Director", d.name)
  }

  const actorIds = entities.actors.map((a) => a.id)
  const movieIds = entities.movies.map((m) => m.id)
  const directorNames = entities.directors.map((d) => d.name)

  // Films by mentioned directors
  if (directorNames.length) {
    const dirMovies = await prisma.movie.findMany({
      where: {
        isFeaturette: false,
        director: { in: directorNames, mode: "insensitive" },
      },
      select: { id: true, title: true, year: true, director: true, slug: true },
      orderBy: { year: "desc" },
      take: 12,
    })
    for (const m of dirMovies) {
      addNode(`movie:${m.id}`, "Movie", `${m.title} (${m.year})`)
      if (m.director) {
        addNode(`director:${m.director}`, "Director", m.director)
        edges.push({
          from: `director:${m.director}`,
          to: `movie:${m.id}`,
          type: "DIRECTED",
        })
      }
      movieIds.push(m.id)
    }
  }

  const uniqueMovieIds = [...new Set(movieIds)]
  const uniqueActorIds = [...new Set(actorIds)]

  const orFilters: Array<{ actorId?: { in: string[] }; movieId?: { in: string[] } }> = []
  if (uniqueActorIds.length) orFilters.push({ actorId: { in: uniqueActorIds } })
  if (uniqueMovieIds.length) orFilters.push({ movieId: { in: uniqueMovieIds } })

  if (orFilters.length === 0) {
    return { nodes, edges, performances: [] }
  }

  const perfs = await prisma.performance.findMany({
    where: {
      userId: SYSTEM_USER_ID,
      tier: { in: ["LEAD", "SUPPORTING"] },
      OR: orFilters,
    },
    select: {
      actorId: true,
      movieId: true,
      character: true,
      tier: true,
      seededAggregateScore: true,
      actor: { select: { id: true, name: true, slug: true } },
      movie: {
        select: {
          id: true,
          title: true,
          year: true,
          slug: true,
          director: true,
          isFeaturette: true,
        },
      },
    },
    orderBy: [{ seededAggregateScore: "desc" }, { order: "asc" }],
    take: maxPerformances * 3,
  })

  const performances: GraphNeighborhood["performances"] = []
  for (const p of perfs) {
    if (p.movie.isFeaturette) continue
    addNode(`actor:${p.actor.id}`, "Actor", p.actor.name)
    addNode(`movie:${p.movie.id}`, "Movie", `${p.movie.title} (${p.movie.year})`)
    edges.push({
      from: `actor:${p.actor.id}`,
      to: `movie:${p.movie.id}`,
      type: "APPEARS_IN",
    })
    if (p.movie.director) {
      addNode(`director:${p.movie.director}`, "Director", p.movie.director)
      edges.push({
        from: `director:${p.movie.director}`,
        to: `movie:${p.movie.id}`,
        type: "DIRECTED",
      })
    }
    performances.push({
      actorId: p.actorId,
      movieId: p.movieId,
      actorName: p.actor.name,
      movieTitle: p.movie.title,
      movieYear: p.movie.year,
      movieSlug: p.movie.slug,
      actorSlug: p.actor.slug,
      character: p.character,
      tier: p.tier,
      seededAggregate: p.seededAggregateScore,
      director: p.movie.director,
    })
    if (performances.length >= maxPerformances) break
  }

  return { nodes, edges, performances }
}
