/**
 * Script to populate slug fields for existing actors and movies
 * This is a one-time migration that adds slugs to all existing records
 * Uses batched updates for speed (1000 actors / 500 movies per batch).
 *
 * Run with: npx tsx scripts/populate-slugs.ts
 */

import { PrismaClient } from '@prisma/client'
import { createActorSlug, createMovieSlug } from '../src/lib/createSlug'

const prisma = new PrismaClient()
const ACTOR_BATCH = 1000
const MOVIE_BATCH = 500

async function populateSlugs() {
  console.log('🔄 Starting slug population (actors, then movies)...\n')

  try {
    // Populate Actor slugs (batched)
    console.log('📝 Populating actor slugs...')
    const actors = await prisma.actor.findMany({
      where: {
        OR: [{ slug: null }, { slug: '' }]
      },
      select: { id: true, name: true }
    })

    console.log(`Found ${actors.length} actors without slugs`)

    let actorCount = 0
    for (let i = 0; i < actors.length; i += ACTOR_BATCH) {
      const batch = actors.slice(i, i + ACTOR_BATCH)
      const slugToActor = new Map<string, { id: string; name: string }>()
      const updates: { id: string; slug: string }[] = []

      for (const actor of batch) {
        const baseSlug = createActorSlug(actor.name)
        slugToActor.set(baseSlug, actor)
      }

      const existingBySlug = await prisma.actor.findMany({
        where: { slug: { in: [...slugToActor.keys()] } },
        select: { id: true, slug: true }
      })
      const takenSlugs = new Set(existingBySlug.map((r) => r.slug).filter(Boolean))

      const slugCount = new Map<string, number>()
      for (const actor of batch) {
        let baseSlug = createActorSlug(actor.name)
        if (!baseSlug) baseSlug = actor.id // names that normalize to empty (e.g. CJK) -> use id
        const taken = takenSlugs.has(baseSlug)
        const sameSlugInBatch = (slugCount.get(baseSlug) ?? 0) + 1
        slugCount.set(baseSlug, sameSlugInBatch)
        const needSuffix = taken || sameSlugInBatch > 1
        let finalSlug = needSuffix ? `${baseSlug}-${actor.id}` : baseSlug
        updates.push({ id: actor.id, slug: finalSlug })
        takenSlugs.add(finalSlug)
      }

      // Dedupe: ensure every slug is unique (empty baseSlug or same slug across batch)
      const seen = new Set<string>()
      for (const u of updates) {
        let slug = u.slug
        const actor = batch.find((a) => a.id === u.id)!
        const base = createActorSlug(actor.name) || actor.id
        while (seen.has(slug)) {
          slug = `${base}-${u.id}`
        }
        u.slug = slug
        seen.add(slug)
      }

      await prisma.$transaction(
        updates.map(({ id, slug }) =>
          prisma.actor.update({ where: { id }, data: { slug } })
        )
      )
      actorCount += batch.length
      process.stdout.write(`  ✓ Actors: ${actorCount}/${actors.length}\r`)
    }
    console.log(`  ✅ Actors: ${actorCount} slugs updated\n`)

    // Populate Movie slugs (batched)
    console.log('📝 Populating movie slugs...')
    const movies = await prisma.movie.findMany({
      where: {
        OR: [{ slug: null }, { slug: '' }]
      },
      select: { id: true, title: true, year: true }
    })

    console.log(`Found ${movies.length} movies without slugs`)

    let movieCount = 0
    for (let i = 0; i < movies.length; i += MOVIE_BATCH) {
      const batch = movies.slice(i, i + MOVIE_BATCH)
      const updates: { id: string; slug: string }[] = []
      const slugs = batch.map((m) => createMovieSlug(m.title, m.year))

      const existingBySlug = await prisma.movie.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true }
      })
      const takenSlugs = new Set(existingBySlug.map((r) => r.slug).filter(Boolean))

      const slugCount = new Map<string, number>()
      for (let j = 0; j < batch.length; j++) {
        const movie = batch[j]
        let baseSlug = slugs[j]
        if (!baseSlug) baseSlug = movie.id
        const taken = takenSlugs.has(baseSlug)
        const sameInBatch = (slugCount.get(baseSlug) ?? 0) + 1
        slugCount.set(baseSlug, sameInBatch)
        const needSuffix = taken || sameInBatch > 1
        const finalSlug = needSuffix ? `${baseSlug}-${movie.id}` : baseSlug
        updates.push({ id: movie.id, slug: finalSlug })
        takenSlugs.add(finalSlug)
      }

      const seenMovie = new Set<string>()
      for (const u of updates) {
        let slug = u.slug
        const movie = batch.find((m) => m.id === u.id)!
        const base = createMovieSlug(movie.title, movie.year) || movie.id
        while (seenMovie.has(slug)) {
          slug = `${base}-${u.id}`
        }
        u.slug = slug
        seenMovie.add(slug)
      }

      await prisma.$transaction(
        updates.map(({ id, slug }) =>
          prisma.movie.update({ where: { id }, data: { slug } })
        )
      )
      movieCount += batch.length
      process.stdout.write(`  ✓ Movies: ${movieCount}/${movies.length}\r`)
    }
    console.log(`\n  ✅ Movies: ${movieCount} slugs updated\n`)

    console.log('✅ Slug population completed successfully!')
    console.log(`   - Actors: ${actorCount}`)
    console.log(`   - Movies: ${movieCount}`)
  } catch (error) {
    console.error('❌ Error populating slugs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populateSlugs()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

