import type { PrismaClient, SiteEditorialKind } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import {
  countMarkdownWords,
  JOURNAL_MIN_NEWS_WORDS,
  JOURNAL_MIN_STORY_WORDS,
  meetsJournalMinimum,
  ensureJournalMinimum,
  sanitizeJournalCover,
} from "@/lib/editorial/journal-standards"
import { loadMarkdownCoverKeys } from "@/lib/editorial/load-journal-cover-keys"
import {
  buildVariedDailyNews,
  buildVariedStoryFromFacts,
  journalDayHash,
  type NewsTopic,
} from "@/lib/editorial/journal-daily-content"
import { buildPerformanceFactsPack, type PerformanceFactsPack } from "@/lib/editorial/performance-facts"

export type JournalRelated = { actorSlug: string; movieSlug: string }

export type GeneratedJournalPiece = {
  kind: SiteEditorialKind
  slug: string
  title: string
  description: string
  bodyMarkdown: string
  coverImage: string | null
  related: JournalRelated[]
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
}

function dateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}


const NEWS_TOPICS: NewsTopic[] = [
  {
    key: "vibes-vs-craft",
    title: "Vibes are not a criterion",
    description: "A daily reminder: ActorRating’s five sliders punish vibe-only scoring.",
    intro: "If you cannot name the acting choice you scored, you scored a vibe — and vibes belong in comments, not aggregates.",
    sections: [
      {
        heading: "Open the tools, not the mood ring",
        body: "Emotional Range, Character Believability, Performance Quality, Screen Presence, and Chemistry are separate questions. Collapsing them into “I liked it” is how scoreboards become noise.",
      },
      {
        heading: "Draft vs final",
        body: "Quick-rate if you must. Before you treat a number as settled, name one scene that justifies each criterion you weighted heavily.",
      },
    ],
  },
  {
    key: "edit-your-score",
    title: "Edit yesterday’s score if the scene changed you",
    description: "Scoreboard literacy includes revision. Peer pressure does not.",
    intro: "Revisit one rating from the last week. Change it only if a concrete beat changed your mind — not because a thread dunked on it.",
    sections: [
      {
        heading: "Good reasons to edit",
        body: "You rewatched a quiet scene. You separated Chemistry from Character Believability. You realized you scored the movie’s theme instead of the turn.",
      },
      {
        heading: "Bad reasons to edit",
        body: "A friend scored higher. A headline moved the movie’s gross. You want your profile to match consensus.",
      },
    ],
  },
  {
    key: "supporting-first",
    title: "Rate a supporting turn before a lead today",
    description: "Supporting craft recalibrates what presence means when the poster isn’t begging.",
    intro: "Leads absorb discourse. Supporting turns absorb temperature — they change the weather the lead walks through.",
    sections: [
      {
        heading: "Furniture test",
        body: "If deleting the character leaves the lead’s inner life identical, you watched furniture. If deleting them softens the lead’s problem, you watched acting worth scoring.",
      },
      {
        heading: "Weekly habit",
        body: "Once a day, open a supporting scorecard first. It makes lead scores more honest by comparison.",
      },
    ],
  },
  {
    key: "box-office-not-craft",
    title: "Grosses still aren’t craft scores",
    description: "Ticket sales measure want. The five criteria measure work.",
    intro: "A historic weekend can contain a soft lead. A quiet release can contain a career-best supporting knife-fight.",
    sections: [
      {
        heading: "Keep money in comments",
        body: "When grosses show up in your reasoning, say so in a comment. Do not let box office silently become the number on the card.",
      },
      {
        heading: "Separate cards",
        body: "Money is a movie story. Craft is a performance story. ActorRating is built for the second one.",
      },
    ],
  },
  {
    key: "compare-dont-blend",
    title: "Compare performances — don’t blend them",
    description: "Two scorecards beat one averaged career vibe.",
    intro: "“Who was better?” is a bar fight. “Different how?” is a scoreboard question.",
    sections: [
      {
        heading: "Method",
        body: "Keep two pages open. Name the instinct each role forbids. Argue in sentences — fusion scores hide the argument.",
      },
      {
        heading: "Same actor, different jobs",
        body: "Franchise and prestige in the same month is not one vibe score. It is two assignments that punish different bankable instincts.",
      },
    ],
  },
  {
    key: "casting-isnt-rating",
    title: "Casting news isn’t a rating",
    description: "Announcements are promises. Ratings are receipts.",
    intro: "Exciting attaches belong in Stories as anticipation — physical craft, typecasting risk, prior-turn pattern.",
    sections: [
      {
        heading: "Hard rule",
        body: "No invented numbers for unaired work. When the title unlocks, the scoreboard opens. Until then: curiosity free, scores forbidden.",
      },
      {
        heading: "What you can do today",
        body: "Name the risk in the casting: body as instrument, listening under genre cosplay, brand vs role. That is craft prep, not a score.",
      },
    ],
  },
  {
    key: "quiet-scenes",
    title: "Score the quiet scene, not the trailer beat",
    description: "If your number only works as a 15-second clip, reopen Performance Quality.",
    intro: "Trailer beats are designed to be rated by strangers. Quiet scenes are designed to be endured.",
    sections: [
      {
        heading: "Rewatch drill",
        body: "Pick one performance you already scored. Jump to a scene with no score swell. If the number collapses, you rated marketing.",
      },
      {
        heading: "Technical Skill signal",
        body: "Precision in stillness is still craft. If the actor only works loud, your Performance Quality score should notice.",
      },
    ],
  },
]

async function collectUsedCoverKeys(
  prisma: PrismaClient,
  kind: SiteEditorialKind,
): Promise<Set<string>> {
  const keys = loadMarkdownCoverKeys(kind === "story" ? "story" : "news")
  const rows = await prisma.siteEditorial.findMany({
    where: { kind, status: "PUBLISHED", coverImage: { not: null } },
    select: { coverImage: true },
  })
  for (const row of rows) {
    if (row.coverImage) keys.add(normalizeCoverKey(row.coverImage))
  }
  return keys
}

async function pickRatedPerformance(
  prisma: PrismaClient,
  usedCoverKeys: Set<string>,
): Promise<{
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  actorImageUrl: string | null
  movieTitle: string
  movieYear: number
  movieSlug: string | null
  moviePoster: string | null
  character: string | null
  ratingCount: number
} | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      actorId: string
      movieId: string
      actorName: string
      actorSlug: string | null
      actorImageUrl: string | null
      movieTitle: string
      movieYear: number
      movieSlug: string | null
      moviePoster: string | null
      character: string | null
      ratingCount: number
    }>
  >`
    SELECT
      r."actorId",
      r."movieId",
      a.name AS "actorName",
      a.slug AS "actorSlug",
      a."imageUrl" AS "actorImageUrl",
      m.title AS "movieTitle",
      m.year AS "movieYear",
      m.slug AS "movieSlug",
      m."posterUrl" AS "moviePoster",
      (
        SELECT p.character
        FROM "Performance" p
        WHERE p."actorId" = r."actorId"
          AND p."movieId" = r."movieId"
        ORDER BY CASE WHEN p."userId" = ${SYSTEM_USER_ID} THEN 0 ELSE 1 END, p."updatedAt" DESC
        LIMIT 1
      ) AS character,
      COUNT(*)::int AS "ratingCount"
    FROM "Rating" r
    JOIN "Actor" a ON a.id = r."actorId"
    JOIN "Movie" m ON m.id = r."movieId"
    WHERE r."userId" IS NOT NULL
      AND NOT m."isFeaturette"
      AND a.slug IS NOT NULL
      AND m.slug IS NOT NULL
      AND m."posterUrl" IS NOT NULL
    GROUP BY r."actorId", r."movieId", a.name, a.slug, a."imageUrl", m.title, m.year, m.slug, m."posterUrl"
    HAVING COUNT(*) >= 1
    ORDER BY RANDOM()
    LIMIT 40
  `
  for (const row of rows) {
    const actorCover = sanitizeJournalCover(upgradeActorImageRes(row.actorImageUrl))
    const poster = sanitizeJournalCover(row.moviePoster)
    const options: Array<{ url: string; key: string }> = []
    if (actorCover && row.actorSlug) {
      options.push({ url: actorCover, key: normalizeCoverKey(actorCover, row.actorSlug) })
    }
    if (poster) {
      options.push({ url: poster, key: normalizeCoverKey(poster) })
    }
    for (const opt of options) {
      if (!usedCoverKeys.has(opt.key)) {
        return row
      }
    }
  }
  return rows[0] ?? null
}

function perfRowToFacts(
  perf: NonNullable<Awaited<ReturnType<typeof pickRatedPerformance>>>,
): PerformanceFactsPack {
  return {
    actorName: perf.actorName,
    actorSlug: perf.actorSlug,
    movieTitle: perf.movieTitle,
    movieYear: perf.movieYear,
    movieSlug: perf.movieSlug,
    director: null,
    genres: [],
    character: perf.character,
    tier: null,
    ratingCount: perf.ratingCount,
    avg10: null,
    dimensions: {},
    strongestDimensions: [],
    weakestDimensions: [],
    relatedPerformanceLabels: [],
  }
}

async function resolveStoryFacts(
  prisma: PrismaClient,
  perf: NonNullable<Awaited<ReturnType<typeof pickRatedPerformance>>>,
): Promise<PerformanceFactsPack> {
  const facts = await buildPerformanceFactsPack(prisma, perf.actorId, perf.movieId)
  return facts ?? perfRowToFacts(perf)
}

function buildStoryPiece(
  facts: PerformanceFactsPack,
  day: string,
  perf: NonNullable<Awaited<ReturnType<typeof pickRatedPerformance>>>,
): GeneratedJournalPiece {
  const varied = buildVariedStoryFromFacts(facts, day)
  const slug = `daily-${day}-${slugify(facts.actorSlug || facts.actorName)}-${slugify(facts.movieSlug || facts.movieTitle)}`
  const actorCover = sanitizeJournalCover(upgradeActorImageRes(perf.actorImageUrl))
  const poster = sanitizeJournalCover(perf.moviePoster)

  return {
    kind: "story",
    slug,
    title: varied.title,
    description: varied.description,
    bodyMarkdown: varied.bodyMarkdown,
    coverImage: actorCover || poster || null,
    related:
      facts.actorSlug && facts.movieSlug
        ? [{ actorSlug: facts.actorSlug, movieSlug: facts.movieSlug }]
        : [],
  }
}

async function buildNewsPiece(
  prisma: PrismaClient,
  day: string,
  perf: Awaited<ReturnType<typeof pickRatedPerformance>>,
): Promise<GeneratedJournalPiece> {
  const topic = NEWS_TOPICS[journalDayHash(day) % NEWS_TOPICS.length]!
  const facts = perf
    ? (await buildPerformanceFactsPack(prisma, perf.actorId, perf.movieId)) ??
      perfRowToFacts(perf)
    : null
  const varied = buildVariedDailyNews(topic, day, facts)

  return {
    kind: "news",
    slug: `daily-${day}-${topic.key}`,
    title: topic.title,
    description: topic.description,
    bodyMarkdown: varied.bodyMarkdown,
    coverImage: sanitizeJournalCover(perf?.moviePoster) || null,
    related:
      perf?.actorSlug && perf?.movieSlug
        ? [{ actorSlug: perf.actorSlug, movieSlug: perf.movieSlug }]
        : [],
  }
}

export type DailyJournalResult = {
  story: { ok: boolean; slug?: string; detail: string }
  news: { ok: boolean; slug?: string; detail: string }
}

/**
 * Publish one story + one news item for today if missing.
 * Enabled by default; set SITE_JOURNAL_CRON_ENABLED=false to disable.
 */
export async function runDailySiteJournal(
  prisma: PrismaClient,
  opts: { forceDate?: Date; skipStory?: boolean; skipNews?: boolean } = {},
): Promise<DailyJournalResult> {
  const when = opts.forceDate ?? new Date()
  const day = dateKey(when)
  const publishedAt = new Date(`${day}T12:00:00.000Z`)

  const result: DailyJournalResult = {
    story: { ok: false, detail: "skipped" },
    news: { ok: false, detail: "skipped" },
  }

  const storyCoverKeys = await collectUsedCoverKeys(prisma, "story")
  const newsCoverKeys = await collectUsedCoverKeys(prisma, "news")

  const perfForNews = await pickRatedPerformance(prisma, newsCoverKeys)

  if (!opts.skipStory) {
    const existingStory = await prisma.siteEditorial.findFirst({
      where: {
        kind: "story",
        status: "PUBLISHED",
        slug: { startsWith: `daily-${day}-` },
      },
      select: { slug: true },
    })
    if (existingStory) {
      result.story = { ok: true, slug: existingStory.slug, detail: "already_exists" }
    } else {
      const perf = await pickRatedPerformance(prisma, storyCoverKeys)
      if (!perf) {
        result.story = { ok: false, detail: "no_rated_performance" }
      } else {
        const facts = await resolveStoryFacts(prisma, perf)
        const piece = buildStoryPiece(facts, day, perf)
        piece.bodyMarkdown = ensureJournalMinimum("story", piece.bodyMarkdown)
        if (!meetsJournalMinimum("story", piece.bodyMarkdown)) {
          const w = countMarkdownWords(piece.bodyMarkdown)
          result.story = { ok: false, detail: `story_below_min_words (${w}/${JOURNAL_MIN_STORY_WORDS})` }
        } else {
          try {
            await prisma.siteEditorial.create({
              data: {
                kind: piece.kind,
                slug: piece.slug,
                title: piece.title,
                description: piece.description,
                bodyMarkdown: piece.bodyMarkdown,
                publishedAt,
                coverImage: piece.coverImage,
                related: piece.related,
                status: "PUBLISHED",
                source: "cron",
              },
            })
            result.story = {
              ok: true,
              slug: piece.slug,
              detail: `created (${countMarkdownWords(piece.bodyMarkdown)}w)`,
            }
            const poster = piece.coverImage
            if (poster) storyCoverKeys.add(normalizeCoverKey(poster))
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            result.story = { ok: false, detail: msg }
          }
        }
      }
    }
  }

  if (!opts.skipNews) {
    const piece = await buildNewsPiece(prisma, day, perfForNews)
    piece.bodyMarkdown = ensureJournalMinimum("news", piece.bodyMarkdown)
    const existingNews = await prisma.siteEditorial.findUnique({
      where: { slug: piece.slug },
      select: { slug: true },
    })
    if (existingNews) {
      result.news = { ok: true, slug: existingNews.slug, detail: "already_exists" }
    } else if (!meetsJournalMinimum("news", piece.bodyMarkdown)) {
      const w = countMarkdownWords(piece.bodyMarkdown)
      result.news = { ok: false, detail: `news_below_min_words (${w}/${JOURNAL_MIN_NEWS_WORDS})` }
    } else {
      try {
        await prisma.siteEditorial.create({
          data: {
            kind: piece.kind,
            slug: piece.slug,
            title: piece.title,
            description: piece.description,
            bodyMarkdown: piece.bodyMarkdown,
            publishedAt,
            coverImage: piece.coverImage,
            related: piece.related,
            status: "PUBLISHED",
            source: "cron",
          },
        })
        result.news = {
          ok: true,
          slug: piece.slug,
          detail: `created (${countMarkdownWords(piece.bodyMarkdown)}w)`,
        }
        const poster = piece.coverImage
        if (poster) newsCoverKeys.add(normalizeCoverKey(poster))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        result.news = { ok: false, detail: msg }
      }
    }
  }

  return result
}
