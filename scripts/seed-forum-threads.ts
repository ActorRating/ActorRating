/**
 * Seed starter debate threads so /forum isn't empty on launch.
 * Idempotent: skips if any ForumThread already exists.
 *
 * Local:  npx tsx scripts/seed-forum-threads.ts
 * Prod:   node scripts/seed-forum-threads.js  (bundled into the Coolify image)
 * Requires DATABASE_URL and either ADMIN_EMAIL matching a User, or FORUM_SEED_USER_EMAIL.
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

const STARTERS: Array<{
  categorySlug: string
  title: string
  content: string
  pinned?: boolean
}> = [
  {
    categorySlug: "role-showdowns",
    title: "Best Joker: Ledger vs. Phoenix",
    content:
      "Heath Ledger’s Joker is chaotic and theatrical; Joaquin Phoenix’s is intimate and tragic. Which performance redefined the character more — and whose choices hold up on rewatch?",
    pinned: true,
  },
  {
    categorySlug: "role-showdowns",
    title: "Batman showdowns: Bale, Pattinson, or Keaton?",
    content:
      "Three very different Batmen. Who nailed the voice, the physicality, and the trauma best — and who is most overrated in fan discourse?",
  },
  {
    categorySlug: "role-showdowns",
    title: "Tony Stark vs. Sherlock Holmes: RDJ’s screen presence",
    content:
      "Same actor, two iconic brains-with-ego roles. Is Iron Man just Sherlock in a suit, or does RDJ play them with meaningfully different craft?",
  },
  {
    categorySlug: "snubs-awards",
    title: "Biggest Best Actor snubs of the 2010s",
    content:
      "Who got robbed? Name the year, the performance, and who won instead — then make the case that the Academy got it wrong.",
  },
  {
    categorySlug: "snubs-awards",
    title: "Supporting vs. Lead: category fraud debates",
    content:
      "When is a ‘supporting’ campaign actually a lead performance? Share the most egregious category placements and whether the strategy was fair game.",
  },
  {
    categorySlug: "snubs-awards",
    title: "Was Pacino better in Godfather I or II?",
    content:
      "Young Michael vs. Don Michael. Which performance is the greater piece of acting — and which scene seals it for you?",
    pinned: true,
  },
  {
    categorySlug: "craft-technique",
    title: "Best accents in film: transformative or distracting?",
    content:
      "Which accents disappear into the character, and which ones yank you out of the movie? Cite specific performances and what the actor did technically.",
  },
  {
    categorySlug: "craft-technique",
    title: "Physical transformations that actually served the role",
    content:
      "Weight change and prosthetics get headlines — but which transformations changed the performance, not just the silhouette?",
  },
  {
    categorySlug: "craft-technique",
    title: "One scene that proves an actor’s range",
    content:
      "Pick a single scene (not a whole film) where an actor flips the emotional register so hard it redefines the character. Spoiler-tag as needed.",
  },
  {
    categorySlug: "general",
    title: "Top 5 screen presences of the 2020s",
    content:
      "Not ‘best actors’ — screen presence. Who walks into a frame and owns it this decade? Defend your five.",
    pinned: true,
  },
  {
    categorySlug: "general",
    title: "Underrated TV performances people sleep on",
    content:
      "Film gets the prestige; TV often has the better season-long arcs. Which performances deserve more film-world respect?",
  },
  {
    categorySlug: "general",
    title: "Recommend a performance that changed how you watch acting",
    content:
      "The one that made you start noticing craft — breath, eye-lines, stillness. What was it, and what did you notice afterward in other films?",
  },
]

async function main() {
  const existing = await prisma.forumThread.count()
  if (existing > 0) {
    console.log(`Skipping seed: ${existing} thread(s) already exist.`)
    return
  }

  const categories = await prisma.forumCategory.findMany({
    select: { id: true, slug: true },
  })
  if (categories.length === 0) {
    throw new Error("No ForumCategory rows — run migrations first.")
  }
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  const email =
    process.env.FORUM_SEED_USER_EMAIL?.toLowerCase().trim() ||
    process.env.ADMIN_EMAIL?.toLowerCase().trim()
  if (!email) {
    throw new Error("Set ADMIN_EMAIL or FORUM_SEED_USER_EMAIL to seed threads.")
  }

  const author = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
  if (!author) {
    throw new Error(`No User found for ${email}`)
  }

  let created = 0
  for (const starter of STARTERS) {
    const categoryId = categoryBySlug[starter.categorySlug]
    if (!categoryId) {
      console.warn(`Missing category ${starter.categorySlug}, skipping`)
      continue
    }

    const base = slugify(starter.title).slice(0, 60) || "thread"
    const slug = `${base}-seed`

    await prisma.$transaction(async (tx) => {
      const thread = await tx.forumThread.create({
        data: {
          title: starter.title,
          slug,
          categoryId,
          authorId: author.id,
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
  }

  console.log(`Seeded ${created} starter forum threads as ${author.email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
