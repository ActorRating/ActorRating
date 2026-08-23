/**
 * Attach poster imagery to editorial cards from related performances.
 * Index pages: one unique, relevant cover per card (sequential de-dupe).
 */
import "server-only"
import {
  toEditorialCard,
  type EditorialCard,
  type ParsedEditorialDocument,
} from "@/lib/editorial/load-editorial"
import { enrichListEntries } from "@/lib/lists/enrich-entries"
import { upgradeActorImageRes } from "@/lib/tmdb"
import {
  buildEditorialCoverCandidates,
  normalizeCoverKey,
  pickEditorialHeroCover,
  pickUniqueCover,
} from "@/lib/editorial/resolve-editorial-cover"

export async function withEditorialCovers(
  docs: ParsedEditorialDocument[],
): Promise<EditorialCard[]> {
  const enrichedBatch = await Promise.all(
    docs.map(async (doc) => {
      let enriched: Awaited<ReturnType<typeof enrichListEntries>> = []
      if (doc.related.length > 0) {
        try {
          enriched = await enrichListEntries(
            doc.related.slice(0, 5),
            `${doc.kind}:${doc.slug}`,
          )
        } catch {
          enriched = []
        }
      }
      return { doc, enriched }
    }),
  )

  const usedCoverKeys = new Set<string>()
  const cards: EditorialCard[] = []

  for (const { doc, enriched } of enrichedBatch) {
    const card = toEditorialCard(doc)
    const candidates = buildEditorialCoverCandidates(doc, enriched)
    const cover = pickUniqueCover(candidates, usedCoverKeys)

    let actorImage: string | null | undefined
    let moviePoster: string | null | undefined
    for (const row of enriched) {
      if (!row?.exists) continue
      const headshot = upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
      const poster = row.moviePosterUrl
      if (!actorImage && headshot) actorImage = headshot
      if (!moviePoster && poster) moviePoster = poster
    }

    if (cover) {
      usedCoverKeys.add(normalizeCoverKey(cover))
      cards.push({
        ...card,
        coverImage: cover,
        ...(actorImage ? { actorImage } : {}),
        ...(moviePoster ? { moviePoster } : {}),
      })
    } else {
      cards.push(card)
    }
  }

  return cards
}

export async function resolveEditorialHeroImage(
  doc: ParsedEditorialDocument,
): Promise<string | null> {
  if (doc.related.length === 0) {
    return pickEditorialHeroCover(doc, [])
  }
  try {
    const enriched = await enrichListEntries(doc.related.slice(0, 5), `${doc.kind}:${doc.slug}`)
    return pickEditorialHeroCover(doc, enriched)
  } catch {
    return pickEditorialHeroCover(doc, [])
  }
}
