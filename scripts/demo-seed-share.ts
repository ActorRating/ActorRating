import { prisma } from '@/lib/prisma'

async function main() {
  const actor = await prisma.actor.upsert({
    where: { name: 'Demo Actor' },
    update: {},
    create: { name: 'Demo Actor' },
  })
  const movie = await prisma.movie.upsert({
    where: { title_year: { title: 'Demo Movie', year: 2024 } as any },
    update: {},
    create: { title: 'Demo Movie', year: 2024 },
  } as any)

  const rating = await prisma.rating.create({
    data: {
      userId: (await prisma.user.upsert({ where: { email: 'demo@local.test' }, update: {}, create: { email: 'demo@local.test', password: 'demo-password-hash' } })).id,
      actorId: actor.id,
      movieId: movie.id,
      emotionalRangeDepth: 80,
      characterBelievability: 85,
      technicalSkill: 78,
      screenPresence: 90,
      chemistryInteraction: 82,
      weightedScore: 83.2,
      shareScore: 83,
      roleName: 'Lead',
      breakdown: { e: 80, b: 85, t: 78, s: 90, c: 82 },
      slug: 'demo-123',
    },
  })
  console.log('Seeded rating id:', rating.id, 'slug:', rating.slug)
}

main().finally(() => prisma.$disconnect())

