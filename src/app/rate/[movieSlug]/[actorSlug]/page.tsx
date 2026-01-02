/**
 * New slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Example: /rate/the-dark-knight-2008/christian-bale
 * 
 * This route handles the new slug-based URL format while maintaining
 * backwards compatibility with the old query param format
 */

"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Actor, Movie, Rating } from '@/types'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { SignedInLayout, HomeLayout } from '@/components/layout'
import { useUser } from '@/components/providers/SessionProvider'
import { ratingsApi } from '@/lib/api'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { SignUpToSaveModal } from '@/components/auth/SignUpToSaveModal'

export default function SlugBasedRatePage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [actor, setActor] = useState<Actor | null>(null)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [pendingRatingData, setPendingRatingData] = useState<any>(null)
  const { executeRecaptcha } = useRecaptchaV3()

  useEffect(() => {
    async function fetchData() {
      const movieSlug = params?.movieSlug as string
      const actorSlug = params?.actorSlug as string

      if (!movieSlug || !actorSlug) {
        router.replace('/search')
        return
      }

      try {
        // Fetch movie and actor by slug
        const [movieResponse, actorResponse] = await Promise.all([
          fetch(`/api/movies/${movieSlug}`),
          fetch(`/api/actors/${actorSlug}`)
        ])

        if (!movieResponse.ok || !actorResponse.ok) {
          console.error('Failed to resolve movie or actor')
          setError('Performance not found')
          setLoading(false)
          return
        }

        const movieData = await movieResponse.json()
        const actorData = await actorResponse.json()

        setMovie(movieData)
        setActor(actorData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load performance data')
        setLoading(false)
      }
    }

    fetchData()
  }, [params, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-3 h-3 bg-[#FFD700] rounded-full"
                animate={{
                  y: [0, -12, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.15,
                }}
              />
            ))}
          </div>
          <p className="text-white text-base">Loading</p>
        </div>
      </div>
    )
  }

  if (error || !actor || !movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || 'Performance not found'}</p>
          <button
            onClick={() => router.push('/search')}
            className="px-6 py-3 bg-[#FFD700] text-black rounded-lg hover:bg-[#FFC700] transition"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (ratingData: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
  }): Promise<void> => {
    if (!actor || !movie) {
      return Promise.resolve()
    }

    // If user is not signed in, show modal and reject to prevent success animation
    if (!user) {
      const ratingDataToStore = {
        ...ratingData,
        actorId: actor.id,
        movieId: movie.id,
        actorName: actor.name,
        movieTitle: movie.title,
        movieYear: movie.year,
        comment: '',
      }
      
      setPendingRatingData(ratingDataToStore)
      setShowSignUpModal(true)
      // Return a rejected promise without error to prevent success animation but avoid console error
      return Promise.reject()
    }

    setSubmitting(true)
    
    try {
      const recaptchaToken = await executeRecaptcha('submit_rating')
      
      await ratingsApi.create({
        actorId: actor.id,
        movieId: movie.id,
        emotionalRangeDepth: ratingData.emotionalDepth,
        characterBelievability: ratingData.believability,
        technicalSkill: ratingData.technicalSkill,
        screenPresence: ratingData.screenPresence,
        chemistryInteraction: ratingData.chemistry,
        recaptchaToken,
      })
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      setError(err?.message || 'Failed to submit rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const Layout = user ? SignedInLayout : HomeLayout

  return (
    <Layout>
      <PerformanceRatingClientWrapper
        performance={{
          id: `${actor.id}-${movie.id}`,
          actor: actor,
          movie: movie,
          actorId: actor.id,
          movieId: movie.id,
          character: null,
          comment: null,
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        onSuccess={() => {
          // Success is handled within the wrapper component
        }}
      />
      
      {/* Sign Up Modal */}
      {showSignUpModal && pendingRatingData && actor && movie && (
        <SignUpToSaveModal
          isOpen={showSignUpModal}
          onClose={() => {
            setShowSignUpModal(false)
            setPendingRatingData(null)
          }}
          totalScore={Number(((pendingRatingData.emotionalDepth + pendingRatingData.believability + pendingRatingData.technicalSkill + pendingRatingData.screenPresence + pendingRatingData.chemistry) / 5 / 10).toFixed(1))}
          actorName={actor.name}
          movieTitle={movie.title}
          movieYear={movie.year}
          ratingData={pendingRatingData}
        />
      )}
    </Layout>
  )
}

