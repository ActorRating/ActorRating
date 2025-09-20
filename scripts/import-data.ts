import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

type ExportMovie = {
  id?: string
  title: string
  year: number
  director?: string | null
  tmdbId?: number | null
  overview?: string | null
}

type ExportActor = {
  id?: string
  name: string
  bio?: string | null
  imageUrl?: string | null
  birthDate?: string | null
  nationality?: string | null
  knownFor?: string | null
  tmdbId?: number | null
}

type ExportPerformance = {
  id?: string
  user: { id?: string; email?: string | null; name?: string | null }
  actor: { id?: string; name: string }
  movie: { id?: string; title: string; year: number }
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string | null
  createdAt?: string
  updatedAt?: string
}

type ExportFile = {
  exportDate: string
  movies: ExportMovie[]
  actors: ExportActor[]
  performances: ExportPerformance[]
  summary?: unknown
}

async function ensureUser(email?: string | null, name?: string | null) {
  const fallbackEmail = email && email.trim().length > 0 ? email : undefined
  if (!fallbackEmail) {
    // Generate a deterministic placeholder email to satisfy unique constraint
    const generated = `user_${Math.random().toString(36).slice(2, 10)}@import.local`
    return prisma.user.upsert({
      where: { email: generated },
      update: {},
      create: { email: generated, password: 'imported-user-password' },
    })
  }
  return prisma.user.upsert({
    where: { email: fallbackEmail },
    update: {},
    create: { email: fallbackEmail, password: 'imported-user-password' },
  })
}

async function importData(filePath?: string) {
  const resolvedPath = filePath
    ? path.resolve(filePath)
    : findLatestExport()

  if (!resolvedPath) {
    console.error("❌ No export file found. Place a file like exports/actor-rating-export-YYYY-MM-DD.json or pass a path.")
    process.exit(1)
  }

  console.log(`📄 Reading export: ${resolvedPath}`)
  const raw = fs.readFileSync(resolvedPath, "utf8")
  const data = JSON.parse(raw) as ExportFile

  console.log("📽️  Upserting movies...")
  for (const m of data.movies || []) {
    try {
      await prisma.movie.upsert({
        where: { title_year: { title: m.title, year: m.year } },
        update: {
          director: m.director ?? undefined,
          tmdbId: m.tmdbId ?? undefined,
          overview: m.overview ?? undefined,
        },
        create: {
          title: m.title,
          year: m.year,
          director: m.director ?? undefined,
          tmdbId: m.tmdbId ?? undefined,
          overview: m.overview ?? undefined,
        },
      })
    } catch (e) {
      console.error(`  ⚠️ Movie upsert failed for ${m.title} (${m.year})`, e)
    }
  }

  console.log("🎭 Upserting actors...")
  for (const a of data.actors || []) {
    try {
      await prisma.actor.upsert({
        where: { name: a.name },
        update: {
          bio: a.bio ?? undefined,
          imageUrl: a.imageUrl ?? undefined,
          nationality: a.nationality ?? undefined,
          knownFor: a.knownFor ?? undefined,
          tmdbId: a.tmdbId ?? undefined,
        },
        create: {
          name: a.name,
          bio: a.bio ?? undefined,
          imageUrl: a.imageUrl ?? undefined,
          nationality: a.nationality ?? undefined,
          knownFor: a.knownFor ?? undefined,
          tmdbId: a.tmdbId ?? undefined,
        },
      })
    } catch (e) {
      console.error(`  ⚠️ Actor upsert failed for ${a.name}`, e)
    }
  }

  console.log("🎬 Upserting performances...")
  for (const p of data.performances || []) {
    try {
      const user = await ensureUser(p.user?.email, p.user?.name)
      const actor = await prisma.actor.findUnique({ where: { name: p.actor.name } })
      if (!actor) {
        console.warn(`  ⚠️ Actor not found, creating: ${p.actor.name}`)
        await prisma.actor.create({ data: { name: p.actor.name } })
      }
      const actorRecord = await prisma.actor.findUnique({ where: { name: p.actor.name } })

      const movie = await prisma.movie.findUnique({ where: { title_year: { title: p.movie.title, year: p.movie.year } } })
      if (!movie) {
        console.warn(`  ⚠️ Movie not found, creating: ${p.movie.title} (${p.movie.year})`)
        await prisma.movie.create({ data: { title: p.movie.title, year: p.movie.year } })
      }
      const movieRecord = await prisma.movie.findUnique({ where: { title_year: { title: p.movie.title, year: p.movie.year } } })

      if (!actorRecord || !movieRecord) continue

      await prisma.performance.upsert({
        where: {
          userId_actorId_movieId: {
            userId: user.id,
            actorId: actorRecord.id,
            movieId: movieRecord.id,
          },
        },
        update: {
          emotionalRangeDepth: p.emotionalRangeDepth,
          characterBelievability: p.characterBelievability,
          technicalSkill: p.technicalSkill,
          screenPresence: p.screenPresence,
          chemistryInteraction: p.chemistryInteraction,
          comment: p.comment ?? undefined,
        },
        create: {
          userId: user.id,
          actorId: actorRecord.id,
          movieId: movieRecord.id,
          emotionalRangeDepth: p.emotionalRangeDepth,
          characterBelievability: p.characterBelievability,
          technicalSkill: p.technicalSkill,
          screenPresence: p.screenPresence,
          chemistryInteraction: p.chemistryInteraction,
          comment: p.comment ?? undefined,
        },
      })
    } catch (e) {
      console.error(`  ⚠️ Performance upsert failed for ${p.actor.name} in ${p.movie.title}`, e)
    }
  }

  console.log("✅ Import completed.")
}

function findLatestExport(): string | undefined {
  const exportsDir = path.join(process.cwd(), "exports")
  if (!fs.existsSync(exportsDir)) return undefined
  const files = fs
    .readdirSync(exportsDir)
    .filter((f) => f.startsWith("actor-rating-export-") && f.endsWith(".json"))
    .sort()
    .reverse()
  if (files.length === 0) return undefined
  return path.join(exportsDir, files[0])
}

async function main() {
  try {
    const argPath = process.argv[2]
    await importData(argPath)
  } catch (e) {
    console.error("❌ Import failed:", e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()






