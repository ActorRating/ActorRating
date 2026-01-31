import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Cache movie metadata for 5 min — ratings don't change every second
export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const movie = await prisma.movie.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      title: true,
      year: true,
    },
  });

  if (!movie?.title) {
    return {
      title: "Movie Not Found - ActorRating",
      description: "The requested movie could not be found.",
    };
  }

  // Index only if ≥3 rated performances (real comparison value)
  const ratedPerformances = await prisma.rating.findMany({
    where: { movieId: movie.id },
    select: { actorId: true },
    distinct: ["actorId"],
  });
  const ratedCount = ratedPerformances.length;
  const robots = ratedCount >= 3 ? undefined : { index: false as const, follow: true as const };

  const yearPart = movie.year ? ` (${movie.year})` : "";
  const title = `Who Gave the Best Performance in ${movie.title}${yearPart}?`;
  const description = `Vote on the best acting performance in ${movie.title}${yearPart}. See community scores and rate each actor yourself.`;

  return {
    title,
    description,
    robots,
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

export default function MovieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

