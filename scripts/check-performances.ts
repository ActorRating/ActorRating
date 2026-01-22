import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get a sample actor with performances
  const actorWithPerformances = await prisma.actor.findFirst({
    where: {
      performances: {
        some: {}
      }
    },
    include: {
      performances: {
        take: 5,
        include: {
          movie: {
            select: {
              title: true,
              year: true
            }
          }
        }
      }
    }
  });
  
  if (actorWithPerformances) {
    console.log(`\n🎭 Actor: ${actorWithPerformances.name}`);
    console.log(`📊 Total performances: ${actorWithPerformances.performances.length}`);
    console.log(`\n📽️  Sample performances:`);
    actorWithPerformances.performances.forEach((perf, i) => {
      console.log(`${i+1}. ${perf.movie.title} (${perf.movie.year})`);
      console.log(`   Character: ${perf.character || 'N/A'}`);
      console.log(`   User ID: ${perf.userId}`);
    });
  }
  
  // Check if there are "system" users
  const performanceCount = await prisma.performance.count();
  const uniqueUserIds = await prisma.performance.groupBy({
    by: ['userId'],
    _count: true
  });
  
  console.log(`\n📊 Database Stats:`);
  console.log(`Total performances: ${performanceCount}`);
  console.log(`Unique user IDs: ${uniqueUserIds.length}`);
  console.log(`\nTop 5 users by performance count:`);
  uniqueUserIds
    .sort((a, b) => b._count - a._count)
    .slice(0, 5)
    .forEach((user, i) => {
      console.log(`${i+1}. User ${user.userId}: ${user._count} performances`);
    });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
