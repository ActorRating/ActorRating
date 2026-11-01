import type { Metadata } from "next"
import { FaceOffExperience } from "@/components/faceoff/FaceOffExperience"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"
import { DEFAULT_OG_IMAGE, TWITTER_CREATOR } from "@/lib/seo/social"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Face-Off",
  description: "Compare actors and acting performances. Two choices, one winner, ranked by the ActorRating community.",
  alternates: { canonical: "https://actorrating.com/faceoff" },
  openGraph: {
    title: "ActorRating Face-Off",
    description: "Which performance wins? Make your pick on ActorRating.",
    url: "https://actorrating.com/faceoff",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "ActorRating Face-Off",
    description: "Which performance wins? Make your pick on ActorRating.",
    images: [DEFAULT_OG_IMAGE.url],
    creator: TWITTER_CREATOR,
  },
}

export default function FaceOffPage() {
  if (!isFaceOffEnabled()) {
    return (
      <main className="min-h-[70vh] bg-black px-6 py-24 text-center text-white">
        <h1 className="text-4xl" style={{ fontFamily: 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif' }}>
          Face-Off is turned off
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Rating performances is unchanged.</p>
      </main>
    )
  }
  return (
    <>
      {/*
        Server-rendered heading + intro for crawlers (the experience below is
        client-rendered). Visually hidden: the interactive UI is unchanged.
      */}
      <section className="sr-only" aria-label="About Face-Off">
        <h1>Face-Off: which acting performance wins?</h1>
        <p>
          Compare actors and acting performances head to head. Pick the stronger
          performance in each matchup, see how the ActorRating community voted, and
          watch the Face-Off rankings change. Scores judge acting craft, not the
          overall film.
        </p>
      </section>
      <FaceOffExperience />
    </>
  )
}
