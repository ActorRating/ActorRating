/**
 * Attach poster/actor imagery to editorial cards from related performances.
 */
import "server-only"
import {
  toEditorialCard,
  type EditorialCard,
  type ParsedEditorialDocument,
} from "@/lib/editorial/load-editorial"
import { enrichListEntries } from "@/lib/lists/enrich-entries"
import { upgradeActorImageRes } from "@/lib/tmdb"

function upgradePosterRes(url: string | null | undefined): string | null {
  if (!url) return null
  return url
    .replace("/t/p/w92/", "/t/p/w780/")
    .replace("/t/p/w154/", "/t/p/w780/")
    .replace("/t/p/w185/", "/t/p/w780/")
    .replace("/t/p/w342/", "/t/p/w780/")
    .replace("/t/p/w500/", "/t/p/w780/")
}

export async function withEditorialCovers(
  docs: ParsedEditorialDocument[],
): Promise<EditorialCard[]> {
  return Promise.all(
    docs.map(async (doc) => {
      const card = toEditorialCard(doc)
      if (card.coverImage) return card
      if (doc.related.length === 0) return card

      try {
        const enriched = await enrichListEntries(doc.related.slice(0, 1), `${doc.kind}:${doc.slug}`)
        const first = enriched[0]
        if (!first?.exists) return card
        const poster = upgradePosterRes(first.moviePosterUrl) ?? first.moviePosterUrl ?? null
        const headshot =
          upgradeActorImageRes(first.actorImageUrl) ?? first.actorImageUrl ?? null
        return {
          ...card,
          coverImage: poster ?? headshot,
          actorImage: headshot,
          moviePoster: poster,
        }
      } catch {
        return card
      }
    }),
  )
}

export async function resolveEditorialHeroImage(
  doc: ParsedEditorialDocument,
): Promise<string | null> {
  if (doc.coverImage) return doc.coverImage
  if (doc.related.length === 0) return null
  try {
    const enriched = await enrichListEntries(doc.related.slice(0, 1), `${doc.kind}:${doc.slug}`)
    const first = enriched[0]
    if (!first?.exists) return null
    return (
      upgradePosterRes(first.moviePosterUrl) ??
      first.moviePosterUrl ??
      upgradeActorImageRes(first.actorImageUrl) ??
      first.actorImageUrl ??
      null
    )
  } catch {
    return null
  }
}
