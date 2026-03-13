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

type RatePageClientProps = {
  initialMovie?: Movie | null
  initialActor?: Actor | null
}

export default function RatePageClient({ initialMovie = null, initialActor = null }: RatePageClientProps) {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(!initialMovie || !initialActor)
  const [actor, setActor] = useState<Actor | null>(initialActor)
  const [movie, setMovie] = useState<Movie | null>(initialMovie)
  const [communityAvg10, setCommunityAvg10] = useState<number | null>(null)
  const [communityRatingCount, setCommunityRatingCount] = useState<number | null>(null)
  const [userExistingRating, setUserExistingRating] = useState<{
    id: string
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
  } | null>(null)
  // When true, we've finished checking for an existing rating (so form can show with correct initialRating)
  const [ratingCheckDone, setRatingCheckDone] = useState(false)
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

  // Always load at top: on mount (client nav) and when content finishes loading (so top is visible before demo scroll)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!loading) window.scrollTo(0, 0)
  }, [loading])

  useEffect(() => {
    if (initialMovie && initialActor) return
    const movieSlug = params?.movieSlug as string
    const actorSlug = params?.actorSlug as string
    if (!movieSlug || !actorSlug) {
      router.push('/search')
      return
    }
    let cancelled = false
    Promise.all([
      fetch(`/api/movies/${movieSlug}`),
      fetch(`/api/actors/${actorSlug}?minimal=true`)
    ]).then(([movieResponse, actorResponse]) => {
      if (cancelled) return
      if (!movieResponse.ok || !actorResponse.ok) {
        router.push(`/search?error=notfound&movie=${encodeURIComponent(movieSlug)}&actor=${encodeURIComponent(actorSlug)}`)
        return
      }
      return Promise.all([movieResponse.json(), actorResponse.json()])
    }).then((data) => {
      if (cancelled || !data) return
      const [movieData, actorData] = data
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
    }).catch((error) => {
      if (!cancelled) {
        console.error('Error fetching data:', error)
        router.push('/search?error=loadfailed')
      }
    })
    return () => { cancelled = true }
  }, [params?.movieSlug, params?.actorSlug, router, initialMovie, initialActor])

  useEffect(() => {
    // Use direct-ID GET endpoint — much faster than the name-based POST lookup.
    // actor.id and movie.id come from initialActor/initialMovie props so this
    // runs on the very first render cycle with no extra waiting.
    if (!actor?.id || !movie?.id) return
    fetch(`/api/ratings/community-stats?actorId=${actor.id}&movieId=${movie.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        if (typeof data.count === 'number') setCommunityRatingCount(data.count > 0 ? data.count : null)
        if (data.avg10 != null) setCommunityAvg10(data.avg10)
      })
      .catch(() => {})
  }, [actor?.id, movie?.id])

  // When not logged in, no need to wait for a rating check
  useEffect(() => {
    if (!user) setRatingCheckDone(true)
  }, [user])

  // Fetch current user's rating for this performance so we can prefill the form (Edit flow)
  useEffect(() => {
    if (!user || !actor?.id || !movie?.id) return
    setRatingCheckDone(false)
    let cancelled = false
    fetch('/api/ratings/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((ratings: Array<{ id: string; actorId: string; movieId: string; emotionalRangeDepth: number; characterBelievability: number; technicalSkill: number; screenPresence: number; chemistryInteraction: number }>) => {
        if (cancelled) return
        const match = Array.isArray(ratings)
          ? ratings.find((r) => r.actorId === actor.id && r.movieId === movie.id)
          : null
        if (match) {
          setUserExistingRating({
            id: match.id,
            emotionalDepth: match.emotionalRangeDepth,
            believability: match.characterBelievability,
            technicalSkill: match.technicalSkill,
            screenPresence: match.screenPresence,
            chemistry: match.chemistryInteraction,
          })
        } else {
          setUserExistingRating(null)
        }
        setRatingCheckDone(true)
      })
      .catch(() => {
        if (!cancelled) {
          setUserExistingRating(null)
          setRatingCheckDone(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [user, actor?.id, movie?.id])

  // When logged in, wait for rating check so the form can render with sliders prefilled (edit flow)
  const formReady = !loading && (!user || ratingCheckDone)

  if (!formReady) {
    return (
      <RatePageLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader
            size="lg"
            color="#FFD700"
            showText={true}
            text={user && !ratingCheckDone ? 'Loading your rating...' : 'Loading rating page...'}
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
      if (userExistingRating?.id) {
        await ratingsApi.update(userExistingRating.id, {
          emotionalRangeDepth: ratingData.emotionalDepth,
          characterBelievability: ratingData.believability,
          technicalSkill: ratingData.technicalSkill,
          screenPresence: ratingData.screenPresence,
          chemistryInteraction: ratingData.chemistry,
        })
      } else {
        // Skip reCAPTCHA network round-trip for authenticated users — the API already
        // skips verification for signed-in users, saving ~300ms per submission.
        const recaptchaToken = user ? '' : await executeRecaptcha('submit_rating')
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
      }
    } catch (err: unknown) {
      console.error('Failed to submit rating:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RatePageLayout>
      {/* Edit Rating label at the very top when editing an existing rating */}
      {userExistingRating && (
        <div className="text-center pt-4 sm:pt-6 pb-1">
          <h1 className="text-lg sm:text-xl font-semibold text-white/80">
            Edit Rating
          </h1>
        </div>
      )}
      <PerformanceSEOContent
        actorName={actor.name}
        movieTitle={movie.title}
        movieYear={movie.year}
        isLoggedIn={!!user}
      />
      <PerformanceRatingClientWrapper
        performance={{
          id: `${actor.id}-${movie.id}`,
          actor: { ...actor, slug: actor.slug ?? undefined },
          movie: { ...movie, slug: movie.slug ?? undefined, director: movie.director ?? undefined },
          emotionalRangeDepth: 0,
          characterBelievability: 0,
          technicalSkill: 0,
          screenPresence: 0,
          chemistryInteraction: 0,
          comment: undefined,
          user: { name: '', email: '' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        onSuccess={() => {}}
        initialRating={userExistingRating ? { emotionalDepth: userExistingRating.emotionalDepth, believability: userExistingRating.believability, technicalSkill: userExistingRating.technicalSkill, screenPresence: userExistingRating.screenPresence, chemistry: userExistingRating.chemistry } : undefined}
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
