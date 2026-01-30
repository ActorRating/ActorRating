/**
 * Client component for slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Server wrapper in page.tsx returns 410 if movie/actor not found.
 */

"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Actor, Movie } from '@/types'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { RatePageLayout } from '@/components/layout/RatePageLayout'
import { useUser } from '@/components/providers/SessionProvider'
import { ratingsApi } from '@/lib/api'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { SignUpToSaveModal } from '@/components/auth/SignUpToSaveModal'
import { PerformanceSEOContent } from '@/components/seo/PerformanceSEOContent'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function RatePageClient() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [actor, setActor] = useState<Actor | null>(null)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [communityAvg10, setCommunityAvg10] = useState<number | null>(null)
  const [communityRatingCount, setCommunityRatingCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [pendingRatingData, setPendingRatingData] = useState<{
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
    actorId: string
    movieId: string
    actorName: string
    movieTitle: string
    movieYear: number
    comment: string
  } | null>(null)
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
        const [movieResponse, actorResponse] = await Promise.all([
          fetch(`/api/movies/${movieSlug}`),
          fetch(`/api/actors/${actorSlug}?minimal=true`)
        ])

        if (!movieResponse.ok || !actorResponse.ok) {
          router.push(`/search?error=notfound&movie=${encodeURIComponent(movieSlug)}&actor=${encodeURIComponent(actorSlug)}`)
          return
        }

        const movieData = await movieResponse.json()
        const actorData = await actorResponse.json()

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
        router.push('/search?error=loadfailed')
      }
    }

    fetchData()
  }, [params?.movieSlug, params?.actorSlug, router])

  useEffect(() => {
    async function fetchCommunityStats() {
      if (!actor?.name || !movie?.title) return
      try {
        const res = await fetch('/api/performances/by-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: [{ actor: actor.name, movie: movie.title }] }),
        })
        if (!res.ok) return
        const data = await res.json()
        const perf = Array.isArray(data?.performances) ? data.performances[0] : null
        const count = typeof perf?.ratingCount === 'number' ? perf.ratingCount : null
        const avg100 = typeof perf?.averageRating === 'number' ? perf.averageRating : null
        setCommunityRatingCount(count)
        setCommunityAvg10(avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null)
      } catch {
        // ignore
      }
    }
    fetchCommunityStats()
  }, [actor?.name, movie?.title])

  if (loading) {
    return (
      <RatePageLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader
            size="lg"
            color="#FFD700"
            showText={true}
            text="Loading rating page..."
          />
        </div>
      </RatePageLayout>
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
    if (!actor || !movie) return Promise.resolve()

    if (!user) {
      setPendingRatingData({
        ...ratingData,
        actorId: actor.id,
        movieId: movie.id,
        actorName: actor.name,
        movieTitle: movie.title,
        movieYear: movie.year,
        comment: '',
      })
      setShowSignUpModal(true)
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
    } catch (err: unknown) {
      console.error('Failed to submit rating:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RatePageLayout>
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
        onSuccess={() => {}}
        communityAvg10={communityAvg10}
        communityRatingCount={communityRatingCount}
      />
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
    </RatePageLayout>
  )
}
