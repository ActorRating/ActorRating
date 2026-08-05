export const revalidate = 60;

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isActorCatalogIndexable } from "@/lib/entity-seo";

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
        title: "Actor Not Found",
        description: "The requested actor could not be found.",
        robots: { index: false, follow: false },
      };
    }

    // Match sitemap: ≥1 rating OR ≥5 performances on non-featurette titles.
    const shouldIndex = await isActorCatalogIndexable(prisma, actor.id);
    const robots = shouldIndex ? undefined : { index: false as const, follow: true as const };

    const title = `${actor.name} Performances Ranked & Rated`;
    const description = `How good is ${actor.name} really? Rate their performances, see community scores, and discover their highest-rated and most debated roles.`;
    const ogTitle = `${actor.name} Performances Ranked`;
    const ogDescription = `Rate ${actor.name}'s performances and see how the community ranks their most iconic and controversial roles.`;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com";
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
      description: "Rate acting performances.",
    };
  }
}

export default function ActorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

