import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Cache actor metadata for 6 hours — reduce ISR writes from crawlers
export const revalidate = 21600;

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const actor = await prisma.actor.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!actor?.name) {
      return {
        title: "Actor Not Found - ActorRating",
        description: "The requested actor could not be found.",
      };
    }

    // Index if ≥1 rated performance (engagement) OR ≥5 performances (first lever: expand indexable actors)
    const [ratedPerformances, performanceCount] = await Promise.all([
      prisma.rating.findMany({
        where: { actorId: actor.id },
        select: { movieId: true },
        distinct: ["movieId"],
      }),
      prisma.performance.count({
        where: { actorId: actor.id, movie: { is: { isFeaturette: false } } },
      }),
    ]);
    const ratedCount = ratedPerformances.length;
    const shouldIndex = ratedCount >= 1 || performanceCount >= 5;
    const robots = shouldIndex ? undefined : { index: false as const, follow: true as const };

    const title = `How Good Is ${actor.name}? Performances Ranked & Rated`;
    const description = `How good is ${actor.name} really? Rate their performances, see community scores, and discover their highest-rated and most debated roles.`;
    const ogTitle = `How Good Is ${actor.name}? Performances Ranked`;
    const ogDescription = `Rate ${actor.name}'s performances and see how the community ranks their most iconic and controversial roles.`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://www.actorrating.com";
    const canonicalPath = `/actors/${actor.slug || actor.id}`;
    const canonical = `${baseUrl}${canonicalPath}`;

    return {
      title,
      description,
      robots,
      alternates: { canonical },
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
  } catch (err) {
    console.error("Actor layout generateMetadata failed:", err);
    return {
      title: "ActorRating",
      description: "Rate acting performances.",
    };
  }
}

export default function ActorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

