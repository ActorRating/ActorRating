// src/app/about/page.tsx
import { HomeLayout } from "@/components/layout";
import dynamic from "next/dynamic";
import type { Metadata } from "next";

// Dynamically import the client component (animations, icons)
const AboutContent = dynamic(() => import("./AboutContent"), { ssr: false });

// ✅ Metadata works here because this is a server component
export const metadata: Metadata = {
  title: "About ActorRating — Our Mission & Vision",
  description:
    "Learn about ActorRating's mission to create the world's most comprehensive and community-driven database of acting performance ratings. Discover what makes us different and how we bring movie lovers together.",
  keywords: [
    "about actor rating",
    "actor rating platform",
    "acting performance ratings",
    "rate actors",
    "actor ranking",
    "community-driven film platform",
  ],
  openGraph: {
    title: "About ActorRating — Our Mission & Vision",
    description:
      "ActorRating is the community-driven platform where fans rate and discover the best acting performances in cinema.",
    url: "https://www.actorrating.com/about",
    siteName: "ActorRating",
    images: [
      {
        url: "https://www.actorrating.com/logo.png",
        width: 1200,
        height: 630,
        alt: "ActorRating Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About ActorRating — Our Mission & Vision",
    description:
      "Learn how ActorRating brings together a global community to rate acting performances across cinema.",
    images: ["https://www.actorrating.com/logo.png"],
  },
};

export const dynamic = "force-dynamic";

// Server component wraps the client component
export default function AboutPage() {
  return (
    <HomeLayout>
      <AboutContent />
    </HomeLayout>
  );
}