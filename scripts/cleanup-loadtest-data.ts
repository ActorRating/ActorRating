import { prisma } from '@/lib/prisma'

async function main() {
  console.log('🧹 Cleaning up load test data...')

  // Delete test users created during load testing
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        contains: 'loadtest'
      }
    }
  })
  
  if (testUsers.length > 0) {
    console.log(`🗑️  Deleting ${testUsers.length} test users...`)
    for (const user of testUsers) {
      // Delete related ratings first
      await prisma.rating.deleteMany({
        where: { userId: user.id }
      })
      // Delete related performances
      await prisma.performance.deleteMany({
        where: { userId: user.id }
      })
      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      })
    }
  }

  // Delete test actors created during load testing
  const testActors = await prisma.actor.findMany({
    where: {
      name: {
        contains: 'Test Actor'
      }
    }
  })
  
  if (testActors.length > 0) {
    console.log(`🗑️  Deleting ${testActors.length} test actors...`)
    for (const actor of testActors) {
      // Delete related ratings first
      await prisma.rating.deleteMany({
        where: { actorId: actor.id }
      })
      // Delete related performances
      await prisma.performance.deleteMany({
        where: { actorId: actor.id }
      })
      // Delete the actor
      await prisma.actor.delete({
        where: { id: actor.id }
      })
    }
  }

  // Delete test movies created during load testing
  const testMovies = await prisma.movie.findMany({
    where: {
      title: {
        contains: 'Test Movie'
      }
    }
  })
  
  if (testMovies.length > 0) {
    console.log(`🗑️  Deleting ${testMovies.length} test movies...`)
    for (const movie of testMovies) {
      // Delete related ratings first
      await prisma.rating.deleteMany({
        where: { movieId: movie.id }
      })
      // Delete related performances
      await prisma.performance.deleteMany({
        where: { movieId: movie.id }
      })
      // Delete the movie
      await prisma.movie.delete({
        where: { id: movie.id }
      })
    }
  }

  console.log('✅ Load test data cleanup complete!')
}

main().finally(() => prisma.$disconnect())
