import type { PrismaClient, SiteEditorialKind } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"

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

const NEWS_TOPICS: Array<{
  key: string
  title: string
  description: string
  body: string
}> = [
  {
    key: "vibes-vs-craft",
    title: "Vibes are not a criterion",
    description: "A daily reminder: ActorRating’s five sliders punish vibe-only scoring.",
    body: `If you cannot name the acting choice you scored, you scored a vibe.

Open Emotional Range, Character Believability, Technical Skill, Screen Presence, and Chemistry like tools — not like a mood ring. Moods belong in comments.`,
  },
  {
    key: "edit-your-score",
    title: "Edit yesterday’s score if the scene changed you",
    description: "Scoreboard literacy includes revision. Peer pressure does not.",
    body: `Revisit one rating you logged in the last week. Change it only if a concrete beat changed your mind — not because a thread dunked on it.

Editing for craft is literacy. Editing for consensus is cosplay.`,
  },
  {
    key: "supporting-first",
    title: "Rate a supporting turn before a lead today",
    description: "Supporting craft recalibrates what presence means when the poster isn’t begging.",
    body: `Leads absorb discourse. Supporting turns absorb temperature.

Once a day, open a supporting scorecard first. If deleting the character wouldn’t change the lead’s inner life, you found furniture. If it would, you found acting.`,
  },
  {
    key: "box-office-not-craft",
    title: "Grosses still aren’t craft scores",
    description: "Ticket sales measure want. The five criteria measure work.",
    body: `A historic weekend can contain a soft lead. A quiet release can contain a career-best supporting knife-fight.

When money shows up in your rating comment, you’re editorializing. Fine — just don’t pretend the number is the money.`,
  },
  {
    key: "compare-dont-blend",
    title: "Compare performances — don’t blend them",
    description: "Two scorecards beat one averaged career vibe.",
    body: `“Who was better?” is a bar fight. “Different how?” is a scoreboard question.

Keep two pages open. Name the instinct each role forbids. Argue in sentences. Fusion scores hide the argument.`,
  },
  {
    key: "casting-isnt-rating",
    title: "Casting news isn’t a rating",
    description: "Announcements are promises. Ratings are receipts.",
    body: `Exciting attaches belong in Stories as anticipation — physical craft, typecasting risk, prior-turn pattern.

They do not belong as invented numbers. When the title unlocks, the scoreboard opens. Until then: curiosity free, scores forbidden.`,
  },
  {
    key: "quiet-scenes",
    title: "Score the quiet scene, not the trailer beat",
    description: "If your number only works as a 15-second clip, reopen Technical Skill.",
    body: `Trailer beats are designed to be rated by strangers. Quiet scenes are designed to be endured.

Pick one performance you already scored. Jump to a scene with no score swell. If the number collapses, you rated marketing.`,
  },
]

async function pickRatedPerformance(prisma: PrismaClient): Promise<{
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
    GROUP BY r."actorId", r."movieId", a.name, a.slug, a."imageUrl", m.title, m.year, m.slug, m."posterUrl"
    HAVING COUNT(*) >= 1
    ORDER BY RANDOM()
    LIMIT 1
  `
  return rows[0] ?? null
}

function buildStoryFromPerformance(
  perf: NonNullable<Awaited<ReturnType<typeof pickRatedPerformance>>>,
  day: string,
): GeneratedJournalPiece {
  const role = perf.character?.trim() || "this role"
  const slug = `daily-${day}-${slugify(perf.actorSlug || perf.actorName)}-${slugify(perf.movieSlug || perf.movieTitle)}`
  const title = `${perf.actorName} in ${perf.movieTitle}: keep the scorecard honest`
  const description = `A daily craft pulse for ${perf.actorName} as ${role} in ${perf.movieTitle} (${perf.movieYear}) — ${perf.ratingCount} logged-in rating${perf.ratingCount === 1 ? "" : "s"} on the board.`
  const rateHref =
    perf.actorSlug && perf.movieSlug ? `/rate/${perf.actorSlug}/${perf.movieSlug}` : null

  const body = `## Why this turn today

${perf.actorName}’s work as **${role}** in *${perf.movieTitle}* (${perf.movieYear}) already has community heat on ActorRating (${perf.ratingCount} logged-in rating${perf.ratingCount === 1 ? "" : "s"}). Daily journal rule: don’t let that heat become vibes.

## Score it like craft

1. **Emotional Range & Depth** — name one feeling the performance holds longer than a trailer beat.
2. **Character Believability** — did you forget the actor, or only admire the brand?
3. **Performance Quality** — voice, body, timing — what was precise?
4. **Screen Presence** — who controlled the room when the plot wasn’t helping?
5. **Chemistry & Interaction** — who changed their temperature?

## Do this next

${rateHref ? `Open the live scorecard: [${perf.actorName} in ${perf.movieTitle}](${rateHref}).` : `Find the performance on ActorRating and open the five criteria.`}

If you already rated it, edit only if a concrete beat changed your mind. If you haven’t, quick-rate once, then break it down after one quiet scene.`

  return {
    kind: "story",
    slug,
    title,
    description,
    bodyMarkdown: body,
    coverImage: perf.moviePoster || perf.actorImageUrl || null,
    related:
      perf.actorSlug && perf.movieSlug
        ? [{ actorSlug: perf.actorSlug, movieSlug: perf.movieSlug }]
        : [],
  }
}

function buildDailyNews(day: string): GeneratedJournalPiece {
  const idx = Math.abs(
    [...day].reduce((s, ch) => s + ch.charCodeAt(0), 0),
  ) % NEWS_TOPICS.length
  const topic = NEWS_TOPICS[idx]!
  return {
    kind: "news",
    slug: `daily-${day}-${topic.key}`,
    title: topic.title,
    description: topic.description,
    bodyMarkdown: `*Daily journal — ${day}*\n\n${topic.body}\n\n## Keep the rails clean\n\nStories carry timely performance heat. News keeps the rules legible. Both belong on a scoreboard site — neither should go dark between event weekends.`,
    coverImage: null,
    related: [],
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
      const perf = await pickRatedPerformance(prisma)
      if (!perf) {
        result.story = { ok: false, detail: "no_rated_performance" }
      } else {
        const piece = buildStoryFromPerformance(perf, day)
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
          result.story = { ok: true, slug: piece.slug, detail: "created" }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.story = { ok: false, detail: msg }
        }
      }
    }
  }

  if (!opts.skipNews) {
    const piece = buildDailyNews(day)
    const existingNews = await prisma.siteEditorial.findUnique({
      where: { slug: piece.slug },
      select: { slug: true },
    })
    if (existingNews) {
      result.news = { ok: true, slug: existingNews.slug, detail: "already_exists" }
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
        result.news = { ok: true, slug: piece.slug, detail: "created" }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        result.news = { ok: false, detail: msg }
      }
    }
  }

  return result
}
