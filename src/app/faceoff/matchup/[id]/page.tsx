import type { Metadata } from "next"
import { FaceOffExperience } from "@/components/faceoff/FaceOffExperience"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"
import { getShare } from "@/lib/faceoff/share"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  const canonical = `https://actorrating.com/faceoff/matchup/${id}`
  let title = "Face-Off matchup"
  let description = "Which performance wins? Make your pick on ActorRating."
  let image = "https://actorrating.com/logo.png"
  try {
    const share = await getShare(id)
    if (share) {
      title = share.mode === "actor"
        ? `${share.left.name} vs ${share.right.name}`
        : `${share.left.name} vs ${share.right.name}`
      description = share.mode === "performance"
        ? `Which performance wins: ${share.left.name}${share.left.filmTitle ? ` in ${share.left.filmTitle}` : ""} or ${share.right.name}${share.right.filmTitle ? ` in ${share.right.filmTitle}` : ""}?`
        : `Who wins: ${share.left.name} or ${share.right.name}?`
      if (share.left.imageUrl?.startsWith("https://")) image = share.left.imageUrl
    }
  } catch {
    /* Metadata falls back to the site image. */
  }
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: image, alt: title }],
    },
  }
}

export default async function SharedMatchupPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  if (!isFaceOffEnabled()) {
    return (
      <main className="min-h-[70vh] bg-black px-6 py-24 text-center text-white">
        <h1 className="text-4xl">Face-Off is turned off</h1>
      </main>
    )
  }
  return <FaceOffExperience shareId={id} />
}
