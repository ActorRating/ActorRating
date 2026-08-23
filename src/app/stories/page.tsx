import type { Metadata } from "next"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { EditorialIndexGrid } from "@/components/editorial/EditorialIndexGrid"
import { loadAllStoriesAsync } from "@/lib/editorial/load-editorial"
import { withEditorialCovers } from "@/lib/editorial/enrich-covers"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"
const DISPLAY = 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif'

export const metadata: Metadata = {
  title: "Stories — ActorRating",
  description:
    "Punchy ActorRating editorial — scoreboards, cast carousels, and performances worth fighting about.",
  alternates: { canonical: `${BASE_URL}/stories` },
  openGraph: {
    title: "Stories — ActorRating",
    description:
      "Punchy ActorRating editorial — scoreboards, cast carousels, and performances worth fighting about.",
    url: `${BASE_URL}/stories`,
    type: "website",
  },
}

export default async function StoriesIndexPage() {
  await connection()
  const stories = await withEditorialCovers(await loadAllStoriesAsync())

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p
            className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
            style={{ color: "#FFD700" }}
          >
            From the desk
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4"
            style={{ fontFamily: DISPLAY }}
          >
            Stories
          </h1>
          <p className="text-base sm:text-lg mb-12 leading-relaxed text-zinc-400 max-w-2xl">
            Short, visual features on how we score acting — and which performances to rate next.
          </p>
          <EditorialIndexGrid items={stories} variant="stories" />
        </div>
      </main>
    </HomeLayout>
  )
}
