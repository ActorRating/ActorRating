import type { Metadata } from "next"
import { Leaderboard } from "@/components/faceoff/Leaderboard"
import { LandingLayout } from "@/components/layout"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"
import { faceOffLeaderboard } from "@/lib/faceoff/leaderboard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Face-Off rankings",
  description: "Community Face-Off rankings for actors and acting performances on ActorRating.",
  alternates: { canonical: "https://actorrating.com/faceoff/leaderboard" },
}

export default async function FaceOffLeaderboardPage() {
  if (!isFaceOffEnabled()) {
    return (
      <main className="min-h-[70vh] bg-black px-6 py-24 text-center text-white">
        <h1 className="text-4xl">Face-Off is turned off</h1>
      </main>
    )
  }
  let board: Awaited<ReturnType<typeof faceOffLeaderboard>> = {
    type: "actor",
    page: 1,
    pageSize: 20,
    total: 0,
    minimumComparisons: 8,
    rows: [],
  }
  try {
    board = await faceOffLeaderboard("actor", 1)
  } catch {
    /* Rankings stay empty until the database migration is applied. */
  }
  return (
    <LandingLayout>
      <div className="min-h-[70vh] bg-black text-white">
        <Leaderboard
          initialType="actor"
          initialRows={board.rows}
          initialTotal={board.total}
          minimumComparisons={board.minimumComparisons}
        />
      </div>
    </LandingLayout>
  )
}
