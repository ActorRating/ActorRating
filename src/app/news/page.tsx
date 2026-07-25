import type { Metadata } from "next"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { EditorialIndexGrid } from "@/components/editorial/EditorialIndexGrid"
import { loadAllNews } from "@/lib/editorial/load-editorial"
import { withEditorialCovers } from "@/lib/editorial/enrich-covers"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"
const DISPLAY = 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif'

export const metadata: Metadata = {
  title: "News — ActorRating",
  description:
    "ActorRating Journal — essays on craft, criteria, and building a scoreboard for acting.",
  alternates: { canonical: `${BASE_URL}/news` },
  openGraph: {
    title: "News — ActorRating",
    description:
      "ActorRating Journal — essays on craft, criteria, and building a scoreboard for acting.",
    url: `${BASE_URL}/news`,
    type: "website",
  },
}

export default async function NewsIndexPage() {
  await connection()
  const news = await withEditorialCovers(loadAllNews())

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p
            className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
            style={{ color: "#FFD700" }}
          >
            Journal
          </p>
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4"
            style={{ fontFamily: DISPLAY }}
          >
            News
          </h1>
          <p className="text-base sm:text-lg mb-12 leading-relaxed text-zinc-400 max-w-2xl">
            Longer pieces from the team — why performance scores matter, and how to use the five
            criteria.
          </p>
          <EditorialIndexGrid items={news} variant="news" />
        </div>
      </main>
    </HomeLayout>
  )
}
