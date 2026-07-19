import type { Metadata } from "next"
import Link from "next/link"
import { HomeLayout } from "@/components/layout"
import { loadAllLists } from "@/lib/lists/load-lists"

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

export const metadata: Metadata = {
  title: "Lists — ActorRating",
  description:
    "Hand-authored performance listicles that dig into acting — with real links to ActorRating community scores.",
  alternates: { canonical: `${BASE_URL}/lists` },
  openGraph: {
    title: "Lists — ActorRating",
    description:
      "Hand-authored performance listicles that dig into acting — with real links to ActorRating community scores.",
    url: `${BASE_URL}/lists`,
    type: "website",
  },
}

export default function ListsIndexPage() {
  const lists = loadAllLists()

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#71717a" }}>
            Curated
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Lists</h1>
          <p className="text-base sm:text-lg mb-12 leading-relaxed" style={{ color: "#a1a1aa" }}>
            Hand-written comparisons and deep-dives that link into real ActorRating performance pages —
            not templated filmography dumps.
          </p>

          {lists.length === 0 ? (
            <p style={{ color: "#71717a" }}>No lists published yet.</p>
          ) : (
            <ul className="space-y-6">
              {lists.map((list) => (
                <li key={list.slug}>
                  <Link
                    href={`/lists/${list.slug}`}
                    className="block rounded-2xl p-5 sm:p-6 transition-colors hover:bg-white/[0.04]"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{list.title}</h2>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: "#a1a1aa" }}>
                      {list.description}
                    </p>
                    <time
                      dateTime={list.publishedAt.toISOString()}
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "#52525b" }}
                    >
                      {list.publishedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </HomeLayout>
  )
}
