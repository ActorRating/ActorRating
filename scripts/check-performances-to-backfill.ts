import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.performance.count({
    where: {
      OR: [
        { character: null },
        { character: "" },
        { character: "Unknown" },
      ],
    },
  });

  console.log("Performances needing character backfill:", count);

  // Optional: log a few examples
  const examples = await prisma.performance.findMany({
    where: {
      OR: [
        { character: null },
        { character: "" },
        { character: "Unknown" },
      ],
    },
    select: {
      id: true,
      actorId: true,
      movieId: true,
      character: true,
    },
    take: 10,
  });

  console.log("Sample performances needing backfill:", examples);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






