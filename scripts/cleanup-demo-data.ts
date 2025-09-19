import { prisma } from '@/lib/prisma'

async function main() {
  // Delete the specific demo rating, actor, and movie if they exist
  const demoRating = await prisma.rating.findFirst({ where: { slug: 'demo-123' } })
  if (demoRating) {
    await prisma.shortLink.deleteMany({ where: { ratingId: demoRating.id } }).catch(() => {})
    await prisma.shareImage.deleteMany({ where: { ratingId: demoRating.id } }).catch(() => {})
    await prisma.rating.delete({ where: { id: demoRating.id } }).catch(() => {})
  }

  await prisma.actor.deleteMany({ where: { name: 'Demo Actor' } }).catch(() => {})
  await prisma.movie.deleteMany({ where: { title: 'Demo Movie', year: 2024 } }).catch(() => {})

  // Remove the demo user created by demo seed if unused
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@local.test' } })
  if (demoUser) {
    const ratingCount = await prisma.rating.count({ where: { userId: demoUser.id } })
    const performanceCount = await prisma.performance.count({ where: { userId: demoUser.id } })
    if (ratingCount === 0 && performanceCount === 0) {
      await prisma.user.delete({ where: { id: demoUser.id } }).catch(() => {})
    }
  }

  console.log('Demo data cleanup complete')
}

main().finally(() => prisma.$disconnect())



