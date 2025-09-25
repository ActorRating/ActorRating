"use client"

import { useState, useEffect } from "react"
import { useUser } from "@supabase/auth-helpers-react"
import { Button } from "@/components/ui/Button"
import { PerformanceRatingForm } from "./PerformanceRatingForm"
import { PerformanceSlider } from "./PerformanceSlider"
import { GiClapperboard, GiHeartWings } from "react-icons/gi"
import { FaStar, FaHandshake, FaUserSecret } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface UserPerformance {
  id: string
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
  actor: {
    id: string
    name: string
    imageUrl?: string
  }
}

interface MovieRatingSectionProps {
  movieId: string
  movieTitle: string
  movieYear: number
  actors: Array<{
    id: string
    name: string
    imageUrl?: string
  }>
}

export function MovieRatingSection({ 
  movieId, 
  movieTitle, 
  movieYear, 
  actors 
}: MovieRatingSectionProps) {
  const user = useUser()
  const isLoadingUser = user === undefined
  const [userPerformances, setUserPerformances] = useState<UserPerformance[]>([])
  const [selectedActor, setSelectedActor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's existing ratings for this movie
  useEffect(() => {
    if (user && movieId) {
      fetchUserPerformances()
    }
  }, [user, movieId])

  const fetchUserPerformances = async () => {
    try {
      const response = await fetch(`/api/movies/${movieId}/user-rating`)
      if (response.ok) {
        const data = await response.json()
        setUserPerformances(data)
      }
    } catch (error) {
      console.error("Failed to fetch user performances:", error)
    }
  }

  const handleSubmitRating = async (ratingData: any) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Find the actor for the selected performance
      const actor = actors.find(a => a.id === selectedActor)
      if (!actor) {
        throw new Error("Actor not found")
      }

      // Check if user already has a rating for this actor
      const existingPerformance = userPerformances.find(
        p => p.actor.id === selectedActor
      )

      // Use unified ratings endpoint so entries are visible on dashboard
      const url = "/api/ratings"
      const method = "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...ratingData,
          actorId: selectedActor,
          movieId: movieId,
          // token added on the server when calling ratingsApi elsewhere; here page posts directly
          // Movie page uses server-side verification in /api/ratings
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit rating")
      }

      // Refresh user performances
      await fetchUserPerformances()
      setSelectedActor(null)
    } catch (error) {
      console.error("Failed to submit rating:", error)
      setError(error instanceof Error ? error.message : "Failed to submit rating")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getExistingRating = (actorId: string) => {
    return userPerformances.find(p => p.actor.id === actorId)
  }

  const calculateAverageRating = (performance: UserPerformance) => {
    return (
      performance.emotionalRangeDepth * 0.25 +
      performance.characterBelievability * 0.25 +
      performance.technicalSkill * 0.20 +
      performance.screenPresence * 0.15 +
      performance.chemistryInteraction * 0.15
    )
  }

  if (isLoadingUser) {
    return (
      <div className="bg-muted/60 rounded-2xl border border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 max-w-md"></div>
          <div className="h-4 bg-gray-700 rounded mb-6 max-w-lg"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted/60 rounded-2xl border border-gray-800 p-6"
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          Rate Performances
        </h2>
        <p className="text-gray-400 mb-6">
          Sign in to rate the performances in this movie and share your thoughts with the community.
        </p>
        <Button asChild variant="premium">
          <Link href="/auth/signin">
            Sign in to Rate Performances
          </Link>
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/60 rounded-2xl border border-gray-800 p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-6">
        Your Ratings in "{movieTitle}" ({movieYear})
      </h2>

      {/* Show existing ratings */}
      {userPerformances.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Your Rated Performances
          </h3>
          <div className="space-y-3">
            {userPerformances.map((performance) => (
              <div
                key={`performance-${performance.id}`}
                className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {performance.actor.imageUrl && (
                    <img
                      src={performance.actor.imageUrl}
                      alt={performance.actor.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-white">
                      {performance.actor.name}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {calculateAverageRating(performance).toFixed(1)}/100 average
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/rate?rating=${performance.id}`}>
                    Edit Rating
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit selected performance */}
      {selectedActor ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Rate {actors.find(a => a.id === selectedActor)?.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedActor(null)}
            >
              Cancel
            </Button>
          </div>
          <PerformanceRatingForm
            actorName={actors.find(a => a.id === selectedActor)?.name || ""}
            movieTitle={movieTitle}
            movieYear={movieYear}
            onSubmit={handleSubmitRating}
            isLoading={isSubmitting}
            onError={setError}
          />
        </div>
      ) : (
        userPerformances.length === 0 ? (
          <div className="py-4">
            <p className="text-gray-400 text-center">
              You haven't rated any performances in this movie yet. Please rate one of the performances above.
            </p>
          </div>
        ) : null
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </motion.div>
  )
} 