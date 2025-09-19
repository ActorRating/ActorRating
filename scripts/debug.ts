import { prisma } from '@/lib/prisma';

async function main() {
  const performances = await prisma.performance.findMany({
    include: {
      actor: true,
      movie: true,
    }
  });

  console.log(JSON.stringify(performances, null, 2));
  await prisma.$disconnect();
}

main(); 