/**
 * Seed starter debate threads so /forum isn't empty on launch.
 *
 * Local:  npm run seed:forum:dev
 * Prod:   FORUM_SEED_FORCE=1 npm run seed:forum
 *
 * FORUM_SEED_FORCE=1 deletes existing *-seed threads and recreates them
 * (varied authors + actor/movie cover images).
 *
 * Authors: creates lightweight seed personas if missing.
 * Images: links some threads to Actor/Movie rows (UI shows headshot/poster).
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "")
}

/** Community personas used only for seeded debate threads. */
const SEED_PERSONAS = [
  { username: "maya_takes", name: "Maya R.", email: "seed.maya@actorrating.local" },
  { username: "jordan_frames", name: "Jordan K.", email: "seed.jordan@actorrating.local" },
  { username: "elena_cut", name: "Elena V.", email: "seed.elena@actorrating.local" },
  { username: "omar_reels", name: "Omar S.", email: "seed.omar@actorrating.local" },
  { username: "priya_screen", name: "Priya N.", email: "seed.priya@actorrating.local" },
  { username: "leo_blocking", name: "Leo M.", email: "seed.leo@actorrating.local" },
] as const

type Starter = {
  categorySlug: string
  title: string
  content: string
  pinned?: boolean
  /** Prefer showing this actor's headshot on the thread card */
  actorName?: string
  /** Prefer showing this movie's poster (used if no actor image) */
  movieTitle?: string
  movieYear?: number
  /** Index into SEED_PERSONAS */
  authorIndex: number
}

const STARTERS: Starter[] = [
  {
    categorySlug: "role-showdowns",
    title: "Best Joker: Ledger vs. Phoenix",
    content:
      "Heath Ledger’s Joker is chaotic and theatrical; Joaquin Phoenix’s is intimate and tragic. Which performance redefined the character more — and whose choices hold up on rewatch?",
    pinned: true,
    actorName: "Heath Ledger",
    movieTitle: "The Dark Knight",
    movieYear: 2008,
    authorIndex: 0,
  },
  {
    categorySlug: "role-showdowns",
    title: "Batman showdowns: Bale, Pattinson, or Keaton?",
    content:
      "Three very different Batmen. Who nailed the voice, the physicality, and the trauma best — and who is most overrated in fan discourse?",
    actorName: "Christian Bale",
    movieTitle: "The Dark Knight",
    movieYear: 2008,
    authorIndex: 1,
  },
  {
    categorySlug: "role-showdowns",
    title: "Tony Stark vs. Sherlock Holmes: RDJ’s screen presence",
    content:
      "Same actor, two iconic brains-with-ego roles. Is Iron Man just Sherlock in a suit, or does RDJ play them with meaningfully different craft?",
    actorName: "Robert Downey Jr.",
    movieTitle: "Iron Man",
    movieYear: 2008,
    authorIndex: 2,
  },
  {
    categorySlug: "snubs-awards",
    title: "Biggest Best Actor snubs of the 2010s",
    content:
      "Who got robbed? Name the year, the performance, and who won instead — then make the case that the Academy got it wrong.",
    actorName: "Leonardo DiCaprio",
    movieTitle: "The Wolf of Wall Street",
    movieYear: 2013,
    authorIndex: 3,
  },
  {
    categorySlug: "snubs-awards",
    title: "Supporting vs. Lead: category fraud debates",
    content:
      "When is a ‘supporting’ campaign actually a lead performance? Share the most egregious category placements and whether the strategy was fair game.",
    authorIndex: 4,
  },
  {
    categorySlug: "snubs-awards",
    title: "Was Pacino better in Godfather I or II?",
    content:
      "Young Michael vs. Don Michael. Which performance is the greater piece of acting — and which scene seals it for you?",
    pinned: true,
    actorName: "Al Pacino",
    movieTitle: "The Godfather",
    movieYear: 1972,
    authorIndex: 5,
  },
  {
    categorySlug: "craft-technique",
    title: "Best accents in film: transformative or distracting?",
    content:
      "Which accents disappear into the character, and which ones yank you out of the movie? Cite specific performances and what the actor did technically.",
    actorName: "Meryl Streep",
    authorIndex: 0,
  },
  {
    categorySlug: "craft-technique",
    title: "Physical transformations that actually served the role",
    content:
      "Weight change and prosthetics get headlines — but which transformations changed the performance, not just the silhouette?",
    actorName: "Charlize Theron",
    movieTitle: "Monster",
    movieYear: 2003,
    authorIndex: 1,
  },
  {
    categorySlug: "craft-technique",
    title: "One scene that proves an actor’s range",
    content:
      "Pick a single scene (not a whole film) where an actor flips the emotional register so hard it redefines the character. Spoiler-tag as needed.",
    authorIndex: 2,
  },
  {
    categorySlug: "general",
    title: "Top 5 screen presences of the 2020s",
    content:
      "Not ‘best actors’ — screen presence. Who walks into a frame and owns it this decade? Defend your five.",
    pinned: true,
    actorName: "Timothée Chalamet",
    authorIndex: 3,
  },
  {
    categorySlug: "general",
    title: "Underrated TV performances people sleep on",
    content:
      "Film gets the prestige; TV often has the better season-long arcs. Which performances deserve more film-world respect?",
    actorName: "Brian Cox",
    authorIndex: 4,
  },
  {
    categorySlug: "general",
    title: "Recommend a performance that changed how you watch acting",
    content:
      "The one that made you start noticing craft — breath, eye-lines, stillness. What was it, and what did you notice afterward in other films?",
    authorIndex: 5,
  },
]

async function ensurePersonas(): Promise<Array<{ id: string; username: string }>> {
  const out: Array<{ id: string; username: string }> = []
  for (const p of SEED_PERSONAS) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: p.email }, { username: p.username }] },
      select: { id: true, username: true },
    })
    if (existing) {
      out.push({ id: existing.id, username: existing.username || p.username })
      continue
    }
    const created = await prisma.user.create({
      data: {
        email: p.email,
        username: p.username,
        name: p.name,
        emailVerified: new Date(),
      },
      select: { id: true, username: true },
    })
    out.push({ id: created.id, username: created.username || p.username })
  }
  return out
}

async function resolveActorId(name: string | undefined): Promise<string | null> {
  if (!name) return null
  const actor = await prisma.actor.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, imageUrl: true },
  })
  return actor?.id ?? null
}

async function resolveMovieId(
  title: string | undefined,
  year: number | undefined,
): Promise<string | null> {
  if (!title) return null
  const movie = await prisma.movie.findFirst({
    where: {
      title: { equals: title, mode: "insensitive" },
      ...(year ? { year } : {}),
    },
    select: { id: true },
  })
  if (movie) return movie.id
  // Fallback without year if exact year miss
  const any = await prisma.movie.findFirst({
    where: { title: { equals: title, mode: "insensitive" } },
    select: { id: true },
  })
  return any?.id ?? null
}

async function main() {
  const force = process.env.FORUM_SEED_FORCE === "1" || process.argv.includes("--force")

  if (force) {
    const deleted = await prisma.forumThread.deleteMany({
      where: { slug: { endsWith: "-seed" } },
    })
    console.log(`Force reseed: deleted ${deleted.count} seed thread(s).`)
  } else {
    const existing = await prisma.forumThread.count()
    if (existing > 0) {
      console.log(
        `Skipping seed: ${existing} thread(s) already exist. Re-run with FORUM_SEED_FORCE=1 to replace seed threads.`,
      )
      return
    }
  }

  const categories = await prisma.forumCategory.findMany({
    select: { id: true, slug: true },
  })
  if (categories.length === 0) {
    throw new Error("No ForumCategory rows — run migrations first.")
  }
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  const personas = await ensurePersonas()
  console.log(`Using ${personas.length} seed authors: ${personas.map((p) => `@${p.username}`).join(", ")}`)

  let created = 0
  let withImage = 0
  for (const starter of STARTERS) {
    const categoryId = categoryBySlug[starter.categorySlug]
    if (!categoryId) {
      console.warn(`Missing category ${starter.categorySlug}, skipping`)
      continue
    }

    const author = personas[starter.authorIndex % personas.length]!
    const [actorId, movieId] = await Promise.all([
      resolveActorId(starter.actorName),
      resolveMovieId(starter.movieTitle, starter.movieYear),
    ])
    if (actorId || movieId) withImage += 1

    const base = slugify(starter.title).slice(0, 60) || "thread"
    const slug = `${base}-seed`

    await prisma.$transaction(async (tx) => {
      const thread = await tx.forumThread.create({
        data: {
          title: starter.title,
          slug,
          categoryId,
          authorId: author.id,
          actorId,
          movieId,
          isPinned: Boolean(starter.pinned),
        },
      })
      await tx.forumPost.create({
        data: {
          threadId: thread.id,
          authorId: author.id,
          content: starter.content,
          isOriginal: true,
        },
      })
    })
    created += 1
    console.log(
      `  · ${starter.title} — @${author.username}` +
        (actorId || movieId ? " [image]" : ""),
    )
  }

  console.log(`Seeded ${created} threads (${withImage} with actor/movie cover).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
