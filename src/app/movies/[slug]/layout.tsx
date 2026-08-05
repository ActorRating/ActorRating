export const revalidate = 60;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPublicSeoBlockedMovie } from "@/lib/public-movie-seo-block";
import { isFeaturetteMovie, matchesFeaturetteTitle } from "@/lib/non-rateable";
import { isMovieCatalogIndexable } from "@/lib/entity-seo";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const movie = await prisma.movie.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: {
        id: true,
        title: true,
        year: true,
        slug: true,
        genre: true,
        overview: true,
        isFeaturette: true,
      },
    });

    if (!movie?.title) {
      return {
        title: "Movie Not Found",
        description: "The requested movie could not be found.",
        robots: { index: false, follow: false },
      };
    }

    if (isFeaturetteMovie(movie)) {
      if (!movie.isFeaturette && matchesFeaturetteTitle(movie.title)) {
        void prisma.movie
          .update({ where: { id: movie.id }, data: { isFeaturette: true } })
          .catch(() => {});
      }
      notFound();
    }

    // Junk/adult content: treat as not found (410-style handling at page level)
    if (isPublicSeoBlockedMovie(movie.slug ?? null, movie.title, movie.genre ?? null, movie.overview ?? null)) {
      notFound();
    }

    // Match sitemap: ≥1 rating OR ≥5 performances.
    const isIndexable = await isMovieCatalogIndexable(prisma, movie.id);
    const robots = isIndexable ? undefined : { index: false as const, follow: true as const };

    const yearPart = movie.year ? ` (${movie.year})` : "";
    const title = `Best Performances in ${movie.title}${yearPart}`;
    const description = `Vote on the best acting performance in ${movie.title}${yearPart}. See community scores and rate each actor yourself.`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com";
    const canonical = `${baseUrl}/movies/${movie.slug ?? movie.id}`;

    return {
      title,
      description,
      robots,
      alternates: { canonical },
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
  } catch (err) {
    console.error("Movie layout generateMetadata failed:", err);
    return {
      description: "Rate acting performances.",
    };
  }
}

export default function MovieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

