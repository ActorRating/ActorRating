"use client"

import { useEffect, useState } from "react"
import { useUser } from "@supabase/auth-helpers-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

interface UserRatingForActor {
  id: string
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  movie: {
    id: string
    title: string
    year: number
    director?: string
  }
}

export function ActorRatingSection({ actorId, actorName }: { actorId: string; actorName: string }) {
  const { user, isLoading } = useUser()
  const [userRatings, setUserRatings] = useState<UserRatingForActor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && actorId) {
      fetchUserRatings()
    }
  }, [user, actorId])

  const fetchUserRatings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/actors/${actorId}/user-rating`, { cache: 'no-store' })
      if (!res.ok) {
        setError('Failed to load your ratings')
        setUserRatings([])
        return
      }
      const data = await res.json()
      setUserRatings(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to fetch user ratings:', e)
      setError('Failed to load your ratings')
    } finally {
      setLoading(false)
    }
  }

  const calculateAverage = (r: UserRatingForActor) => {
    return (
      r.emotionalRangeDepth * 0.25 +
      r.characterBelievability * 0.25 +
      r.technicalSkill * 0.20 +
      r.screenPresence * 0.15 +
      r.chemistryInteraction * 0.15
    )
  }

  if (isLoading) {
    return null
  }

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/60 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Your Ratings for {actorName}</h2>
        <p className="text-gray-400 mb-6">Sign in to see and edit your ratings for this actor.</p>
        <Button asChild variant="premium">
          <Link href="/auth/signin">Sign in</Link>
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/60 rounded-2xl border border-gray-800 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Your Ratings for {actorName}</h2>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : userRatings.length > 0 ? (
        <div className="space-y-3">
          {userRatings.map((r) => (
            <div key={`actor-user-rating-${r.id}`} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div>
                <div className="text-white font-medium">{r.movie.title} {r.movie.year ? `(${r.movie.year})` : ''}</div>
                <div className="text-sm text-gray-400">{calculateAverage(r).toFixed(1)}/100 average</div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/rate?actor=${actorId}&movie=${r.movie.id}`}>Edit Rating</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400">You haven’t rated any performances for this actor yet.</div>
      )}
    </motion.div>
  )
}


