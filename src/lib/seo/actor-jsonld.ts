import type { ActorPageData } from "@/lib/actor-page-data"

/**
 * Person JSON-LD for actor pages. Never includes aggregateRating
 * (invalid on Person per Google / Schema.org guidance for our use).
 */
export function buildActorJsonLd(
  data: ActorPageData,
  baseUrl: string,
): Record<string, unknown> {
  const base = baseUrl.replace(/\/$/, "")
  const personUrl = `${base}/actors/${data.slug || data.id}`

  const hasPartRaw =
    Array.isArray(data.performances) &&
    data.performances
      .filter((p) => p?.movie?.title)
      .map((p) => ({
        "@type": "Movie" as const,
        name: p.movie!.title,
        url: `${base}/movies/${p.movie!.slug || p.movie!.id}`,
      }))
  const hasPart = Array.isArray(hasPartRaw) ? hasPartRaw.slice(0, 25) : []

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.name,
    url: personUrl,
    ...(hasPart.length > 0 && { hasPart }),
  }
}
