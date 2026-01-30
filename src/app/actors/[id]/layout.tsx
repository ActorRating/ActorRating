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
      name: true,
      _count: { select: { performances: true } },
    },
  });

  if (!actor?.name) {
    return {
      title: "Actor Not Found - ActorRating",
      description: "The requested actor could not be found.",
    };
  }

  const title = `${actor.name} Performances Ranked — Ratings & Reviews`;
  const description = `All ${actor.name} performances rated scene by scene. See their highest-rated roles and most controversial performances.`;
  const hasPerformances = actor._count.performances > 0;

  return {
    title,
    description,
    ...(hasPerformances ? {} : { robots: "noindex, nofollow" }),
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ActorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

