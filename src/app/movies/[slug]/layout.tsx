import type { Metadata } from "next";

// Cache movie metadata for 5 min — ratings don't change every second
export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

async function fetchMovie(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/movies/${slug}`, {
      next: { revalidate: 300 },
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const movie = await fetchMovie(slug);

  if (!movie?.title) {
    return {
      title: "Movie Not Found - ActorRating",
      description: "The requested movie could not be found.",
    };
  }

  const yearPart = movie.year ? ` (${movie.year})` : "";
  const title = `${movie.title}${yearPart} — Actor Performances Ranked & Rated`;
  const description = `Rate the acting performances in ${movie.title}. See which actors stood out — and which didn’t.`;

  return {
    title,
    description,
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

