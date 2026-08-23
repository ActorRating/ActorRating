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
import { isBlockedJournalCover, sanitizeJournalCover } from "@/lib/editorial/journal-standards"

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

      const frontmatterCover = doc.coverImage
        ? sanitizeJournalCover(upgradePosterRes(doc.coverImage) ?? doc.coverImage)
        : null

      if (doc.related.length > 0) {
        try {
          const enriched = await enrichListEntries(
            doc.related.slice(0, 3),
            `${doc.kind}:${doc.slug}`,
          )
          const posterCandidates: string[] = []

          for (const row of enriched) {
            if (!row?.exists) continue
            const poster = sanitizeJournalCover(
              upgradePosterRes(row.moviePosterUrl) ?? row.moviePosterUrl,
            )
            const headshot = upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
            if (poster) posterCandidates.push(poster)
            if (!actorImage && headshot) actorImage = headshot
            if (!moviePoster && poster) moviePoster = poster
          }

          if (frontmatterCover) {
            cover = frontmatterCover
          } else if (cover && !isBlockedJournalCover(cover)) {
            posterCandidates.unshift(cover)
            cover =
              posterCandidates.find((url) => url && !usedCovers.has(url)) ??
              posterCandidates.find(Boolean) ??
              cover ??
              null
          } else {
            cover =
              posterCandidates.find((url) => url && !usedCovers.has(url)) ??
              posterCandidates.find(Boolean) ??
              null
          }
        } catch {
          if (frontmatterCover) cover = frontmatterCover
        }
      } else if (frontmatterCover) {
        cover = frontmatterCover
      }

      cover = sanitizeJournalCover(cover)

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
  const fromFrontmatter = sanitizeJournalCover(doc.coverImage)
  if (fromFrontmatter) return fromFrontmatter
  if (doc.related.length === 0) return null
  try {
    const enriched = await enrichListEntries(doc.related.slice(0, 3), `${doc.kind}:${doc.slug}`)
    for (const row of enriched) {
      if (!row?.exists) continue
      const poster = sanitizeJournalCover(
        upgradePosterRes(row.moviePosterUrl) ?? row.moviePosterUrl,
      )
      if (poster) return poster
    }
    return null
  } catch {
    return null
  }
}
