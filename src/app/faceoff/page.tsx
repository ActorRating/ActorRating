import type { Metadata } from "next"
import { FaceOffExperience } from "@/components/faceoff/FaceOffExperience"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Face-Off",
  description: "Compare actors and acting performances. Two choices, one winner, ranked by the ActorRating community.",
  alternates: { canonical: "https://actorrating.com/faceoff" },
  openGraph: {
    title: "ActorRating Face-Off",
    description: "Which performance wins? Make your pick on ActorRating.",
    url: "https://actorrating.com/faceoff",
    images: [{ url: "https://actorrating.com/logo.png", width: 1200, height: 630, alt: "ActorRating" }],
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
  return <FaceOffExperience />
}
