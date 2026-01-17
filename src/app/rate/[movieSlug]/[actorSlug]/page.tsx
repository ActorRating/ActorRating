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
import { PerformanceSEOContent } from '@/components/seo/PerformanceSEOContent'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function SlugBasedRatePage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true) // Start with loading true for immediate feedback
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
        router.push('/search')
        return
      }

      try {
        // Fetch minimal data needed for rating form (much faster)
        // Use lightweight queries that only get basic info
        const [movieResponse, actorResponse] = await Promise.all([
          fetch(`/api/movies/${movieSlug}`),
          // For rate page, we only need basic actor info, not all performances/ratings
          fetch(`/api/actors/${actorSlug}?minimal=true`)
        ])

        if (!movieResponse.ok || !actorResponse.ok) {
          // Check which one failed for better error message
          const movieError = !movieResponse.ok ? await movieResponse.json().catch(() => null) : null
          const actorError = !actorResponse.ok ? await actorResponse.json().catch(() => null) : null
          
          console.error('Failed to resolve movie or actor', { 
            movieSlug, 
            actorSlug, 
            movieStatus: movieResponse.status,
            actorStatus: actorResponse.status 
          })
          
          // Redirect to search page with a helpful message
          router.push(`/search?error=notfound&movie=${encodeURIComponent(movieSlug)}&actor=${encodeURIComponent(actorSlug)}`)
          return
        }

        const movieData = await movieResponse.json()
        const actorData = await actorResponse.json()

        // Set minimal data immediately - we only need id, name, imageUrl, slug for rating
        setMovie({
          id: movieData.id,
          title: movieData.title,
          year: movieData.year,
          director: movieData.director || 'Unknown',
          slug: movieData.slug,
          createdAt: movieData.createdAt || new Date().toISOString(),
          updatedAt: movieData.updatedAt || new Date().toISOString(),
        })
        setActor({
          id: actorData.id,
          name: actorData.name,
          imageUrl: actorData.imageUrl,
          slug: actorData.slug,
          createdAt: actorData.createdAt || new Date().toISOString(),
          updatedAt: actorData.updatedAt || new Date().toISOString(),
        })
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        // Redirect to search page on error
        router.push('/search?error=loadfailed')
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.movieSlug, params?.actorSlug])

  if (loading) {
    const Layout = user ? SignedInLayout : HomeLayout
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader 
            size="lg" 
            color="#FFD700"
            showText={true}
            text="Loading rating page..."
          />
        </div>
      </Layout>
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
      {/* SEO Content - Only visible to crawlers when logged out */}
      <PerformanceSEOContent
        actorName={actor.name}
        movieTitle={movie.title}
        movieYear={movie.year}
        isLoggedIn={!!user}
      />
      
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

