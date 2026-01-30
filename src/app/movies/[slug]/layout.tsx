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
      title: true,
      year: true,
      _count: { select: { performances: true } },
    },
  });

  if (!movie?.title) {
    return {
      title: "Movie Not Found - ActorRating",
      description: "The requested movie could not be found.",
    };
  }

  const yearPart = movie.year ? ` (${movie.year})` : "";
  const title = `${movie.title}${yearPart} — Actor Performances Ranked & Rated`;
  const description = `Rate the acting performances in ${movie.title}. See which actors stood out — and which didn’t.`;

  const hasPerformances = movie._count.performances > 0;

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

export default function MovieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

