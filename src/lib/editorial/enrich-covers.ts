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
  const usedCovers = new Set<string>()

  return Promise.all(
    docs.map(async (doc) => {
      const card = toEditorialCard(doc)
      let cover = card.coverImage
      let actorImage: string | null | undefined
      let moviePoster: string | null | undefined

      if (doc.related.length > 0) {
        try {
          const enriched = await enrichListEntries(
            doc.related.slice(0, 3),
            `${doc.kind}:${doc.slug}`,
          )
          const candidates: string[] = []
          if (cover) candidates.push(cover)

          for (const row of enriched) {
            if (!row?.exists) continue
            const poster = upgradePosterRes(row.moviePosterUrl) ?? row.moviePosterUrl
            const headshot = upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
            if (poster) candidates.push(poster)
            if (headshot) candidates.push(headshot)
            if (!actorImage && headshot) actorImage = headshot
            if (!moviePoster && poster) moviePoster = poster
          }

          cover =
            candidates.find((url) => url && !usedCovers.has(url)) ??
            candidates.find(Boolean) ??
            cover ??
            null
        } catch {
          /* keep frontmatter cover */
        }
      }

      if (cover) usedCovers.add(cover)
      if (!cover) return card

      return {
        ...card,
        coverImage: cover,
        ...(actorImage ? { actorImage } : {}),
        ...(moviePoster ? { moviePoster } : {}),
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
