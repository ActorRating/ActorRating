import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Cache actor metadata for 5 min — ratings don't change every second
export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const actor = await prisma.actor.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: {
      id: true,
      name: true,
    },
  });

  if (!actor?.name) {
    return {
      title: "Actor Not Found - ActorRating",
      description: "The requested actor could not be found.",
    };
  }

  // Index only if ≥1 rated performance (value = real user engagement)
  const ratedPerformances = await prisma.rating.findMany({
    where: { actorId: actor.id },
    select: { movieId: true },
    distinct: ["movieId"],
  });
  const ratedCount = ratedPerformances.length;
  const robots = ratedCount >= 1 ? undefined : { index: false as const, follow: true as const };

  const title = `How Good Is ${actor.name}? Performances Ranked & Rated`;
  const description = `How good is ${actor.name} really? Rate their performances, see community scores, and discover their highest-rated and most debated roles.`;
  const ogTitle = `How Good Is ${actor.name}? Performances Ranked`;
  const ogDescription = `Rate ${actor.name}'s performances and see how the community ranks their most iconic and controversial roles.`;

  return {
    title,
    description,
    robots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
    },
  };
}

export default function ActorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

