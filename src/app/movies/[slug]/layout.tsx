import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdultContentMovie, isAdultContentSlug } from "@/lib/adult-content-filter";
import { isJunkMovieSlug, isAllowedMovieSlug } from "@/lib/junk-movie-slugs";

// Cache movie metadata for 1 hour — reduce ISR writes from crawlers
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

function isBlockedMovie(
  slug: string | null,
  title: string,
  genre: string | null,
  overview: string | null
): boolean {
  if (slug && isAllowedMovieSlug(slug)) return false;
  if (slug && isJunkMovieSlug(slug)) return true;
  if (slug && isAdultContentSlug(slug)) return true;
  if (isAdultContentMovie({ title, genre, overview })) return true;
  return false;
}

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
      },
    });

    if (!movie?.title) {
      return {
        title: "Movie Not Found - ActorRating",
        description: "The requested movie could not be found.",
      };
    }

    // Junk/adult content: treat as not found (410-style handling at page level)
    if (isBlockedMovie(movie.slug ?? null, movie.title, movie.genre ?? null, movie.overview ?? null)) {
      notFound();
    }

    // Index if ≥1 rated performance OR ≥5 total performances (actor–movie pairs in Performance table)
    const [ratedPerformances, performanceCount] = await Promise.all([
      prisma.rating.findMany({
        where: { movieId: movie.id },
        select: { actorId: true },
        distinct: ["actorId"],
      }),
      prisma.performance.count({ where: { movieId: movie.id } }),
    ]);
    const ratedCount = ratedPerformances.length;
    const isIndexable = ratedCount >= 1 || performanceCount >= 5;
    const robots = isIndexable ? undefined : { index: false as const, follow: true as const };

    const yearPart = movie.year ? ` (${movie.year})` : "";
    const title = `Who Gave the Best Performance in ${movie.title}${yearPart}?`;
    const description = `Vote on the best acting performance in ${movie.title}${yearPart}. See community scores and rate each actor yourself.`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://www.actorrating.com";
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
      title: "ActorRating",
      description: "Rate acting performances.",
    };
  }
}

export default function MovieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

