import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

async function fetchActor(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/actors/${id}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const actor = await fetchActor(id);

  if (!actor?.name) {
    return {
      title: "Actor Not Found - ActorRating",
      description: "The requested actor could not be found.",
    };
  }

  const title = `${actor.name} Performances Ranked — Ratings & Reviews`;
  const description = `All ${actor.name} performances rated scene by scene. See their highest-rated roles and most controversial performances.`;

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

export default function ActorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

