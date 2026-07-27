import { Suspense } from "react"
import type { Metadata } from "next"
import NewForumThreadClient from "./NewForumThreadClient"

export const metadata: Metadata = {
  title: "New thread — Debate Forum — ActorRating",
  robots: { index: false, follow: false },
}

export default function NewForumThreadPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-zinc-500">Loading…</p>
        </main>
      }
    >
      <NewForumThreadClient />
    </Suspense>
  )
}
