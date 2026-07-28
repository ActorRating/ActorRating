/**
 * Client component for slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Server wrapper in page.tsx resolves data, 301s to slug URLs, and calls notFound() when invalid.
 */

"use client"

import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState, useCallback } from 'react'
import { Actor, Movie } from '@/types'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { RatePageLayout } from '@/components/layout/RatePageLayout'
import { useSession } from '@/components/providers/SessionProvider'
import { ratingsApi } from '@/lib/api'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { SignUpToSaveModal } from '@/components/auth/SignUpToSaveModal'
import { PerformanceSEOContent } from '@/components/seo/PerformanceSEOContent'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { useGuestRatings, GUEST_RATING_LIMIT } from '@/hooks/useGuestRatings'

type RatePageClientProps = {
  initialMovie?: Movie | null
  initialActor?: Actor | null
  /** TMDB-derived movie vote_average copied onto this performance (0–10). Not community data. */
  initialSeededAggregateScore?: number | null
}

type RateFormBoundaryProps = {
  children: React.ReactNode
}

type RateFormBoundaryState = {
  hasError: boolean
}

class RateFormErrorBoundary extends React.Component<RateFormBoundaryProps, RateFormBoundaryState> {
  state: RateFormBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RateFormBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Rate form crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-white text-xl mb-4">Couldn&apos;t load the rating form.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#FFD700] text-black rounded-md hover:bg-[#FFC700] transition"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function RatePageClient({
  initialMovie = null,
  initialActor = null,
  initialSeededAggregateScore = null,
}: RatePageClientProps) {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useSession()
  /** NextAuth can replace `session.user` by reference on refetch — avoid effect churn / stuck rating gate. */
  const sessionUserKey = user?.id ?? user?.email ?? ''
  const [loading, setLoading] = useState(!initialMovie || !initialActor)
  const [actor, setActor] = useState<Actor | null>(initialActor)
  const [movie, setMovie] = useState<Movie | null>(initialMovie)
  const [seededAggregateScore] = useState<number | null>(
    typeof initialSeededAggregateScore === "number" ? initialSeededAggregateScore : null,
  )
  const [communityAvg10, setCommunityAvg10] = useState<number | null>(null)
  const [communityRatingCount, setCommunityRatingCount] = useState<number | null>(null)
  const [communityDimensions, setCommunityDimensions] = useState<{
    emotionalRangeDepth: number | null
    characterBelievability: number | null
    technicalSkill: number | null
    screenPresence: number | null
    chemistryInteraction: number | null
  } | null>(null)
  const [movieCast, setMovieCast] = useState<Array<{
    actorId: string
    actorName: string
    actorSlug: string | null
    actorImageUrl: string | null
    movieSlug: string | null
  }>>([])

  const [userExistingRating, setUserExistingRating] = useState<{
    id: string
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
    comment?: string
    isSpoiler?: boolean
  } | null>(null)
  // When true, we've finished checking for an existing rating (so form can show with correct initialRating)
  const [ratingCheckDone, setRatingCheckDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
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
  const { count: guestCount, addRating: addGuestRating } = useGuestRatings()

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
        posterUrl: movieData.posterUrl ?? undefined,
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
        if (data.dimensions) setCommunityDimensions(data.dimensions)
      })
      .catch(() => {})
  }, [actor?.id, movie?.id])

  useEffect(() => {
    if (!movie?.id && !movie?.slug) return
    const movieIdOrSlug = movie.slug ?? movie.id
    fetch(`/api/movies/${movieIdOrSlug}/cast?excludeActorId=${actor?.id ?? ''}&limit=6`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.cast) setMovieCast(data.cast)
      })
      .catch(() => {})
  }, [movie?.id, movie?.slug, actor?.id])

  // When not logged in, no need to wait for a rating check (only after auth finished resolving).
  useEffect(() => {
    if (authLoading) return
    if (!sessionUserKey) setRatingCheckDone(true)
  }, [sessionUserKey, authLoading])

  // Fetch current user's rating for this performance so we can prefill the form (Edit flow)
  useEffect(() => {
    if (!sessionUserKey || !actor?.id || !movie?.id) return
    setRatingCheckDone(false)
    let cancelled = false
    fetch('/api/ratings/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((ratings: Array<{
        id: string
        actorId: string
        movieId: string
        emotionalRangeDepth: number
        characterBelievability: number
        technicalSkill: number
        screenPresence: number
        chemistryInteraction: number
        comment?: string | null
        isSpoiler?: boolean
      }>) => {
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
            comment: match.comment?.trim() || "",
            isSpoiler: Boolean(match.isSpoiler),
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
  }, [sessionUserKey, actor?.id, movie?.id])

  const openGuestMomentumSignup = useCallback(
    (payload: {
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
      comment?: string
    }) => {
      setPendingRatingData({
        emotionalDepth: payload.emotionalDepth,
        believability: payload.believability,
        technicalSkill: payload.technicalSkill,
        screenPresence: payload.screenPresence,
        chemistry: payload.chemistry,
        actorId: payload.actorId,
        movieId: payload.movieId,
        actorName: payload.actorName,
        movieTitle: payload.movieTitle,
        movieYear: payload.movieYear,
        comment: payload.comment ?? '',
      })
      setShowSignUpModal(true)
    },
    []
  )

  // Wait until NextAuth finishes resolving — otherwise user is briefly null while authenticated,
  // we mount the rating UI, then unmount when session resolves (flash + fragile teardown in prod).
  const formReady = !authLoading && !loading && (!user || ratingCheckDone)

  if (!formReady) {
    return (
      <RatePageLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader
            size="lg"
            color="#FFD700"
            showText={true}
            text={
              !authLoading && user && !ratingCheckDone
                ? 'Loading your rating...'
                : 'Loading rating page...'
            }
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
            className="px-6 py-3 bg-[#FFD700] text-black rounded-md hover:bg-[#FFC700] transition"
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
    comment?: string
    isSpoiler?: boolean
  }): Promise<void> => {
    if (!actor || !movie) return Promise.resolve()

    if (!user) {
      // ── Guest path ────────────────────────────────────────────────────────
      // If they've hit the free-rating limit, block and ask them to sign up.
      if (guestCount >= GUEST_RATING_LIMIT) {
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

      // Under the limit: submit as guest, store locally, show success UI.
      setSubmitting(true)
      try {
        const res = await fetch('/api/ratings/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorId: actor.id,
            movieId: movie.id,
            emotionalRangeDepth: ratingData.emotionalDepth,
            characterBelievability: ratingData.believability,
            technicalSkill: ratingData.technicalSkill,
            screenPresence: ratingData.screenPresence,
            chemistryInteraction: ratingData.chemistry,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Guest rating failed')
        }
        addGuestRating({
          actorId: actor.id,
          movieId: movie.id,
          actorName: actor.name,
          movieTitle: movie.title,
          movieYear: movie.year,
          emotionalRangeDepth: ratingData.emotionalDepth,
          characterBelievability: ratingData.believability,
          technicalSkill: ratingData.technicalSkill,
          screenPresence: ratingData.screenPresence,
          chemistryInteraction: ratingData.chemistry,
          timestamp: new Date().toISOString(),
        })
        // Resolves normally → wrapper enters submitPhase = 'success'
      } catch (err: unknown) {
        console.error('Failed to submit guest rating:', err)
        throw err
      } finally {
        setSubmitting(false)
      }
      return
    }

    // ── Authenticated path ────────────────────────────────────────────────
    setSubmitting(true)
    try {
      if (userExistingRating?.id) {
        await ratingsApi.update(userExistingRating.id, {
          emotionalRangeDepth: ratingData.emotionalDepth,
          characterBelievability: ratingData.believability,
          technicalSkill: ratingData.technicalSkill,
          screenPresence: ratingData.screenPresence,
          chemistryInteraction: ratingData.chemistry,
          comment: ratingData.comment || undefined,
          isSpoiler: Boolean(ratingData.isSpoiler),
        })
      } else {
        // Skip reCAPTCHA network round-trip for authenticated users — the API already
        // skips verification for signed-in users, saving ~300ms per submission.
        await ratingsApi.create({
          actorId: actor.id,
          movieId: movie.id,
          emotionalRangeDepth: ratingData.emotionalDepth,
          characterBelievability: ratingData.believability,
          technicalSkill: ratingData.technicalSkill,
          screenPresence: ratingData.screenPresence,
          chemistryInteraction: ratingData.chemistry,
          comment: ratingData.comment || undefined,
          isSpoiler: Boolean(ratingData.isSpoiler),
          recaptchaToken: '',
        })
      }
    } catch (err: unknown) {
      console.error('Failed to submit rating:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit rating. Please try again.')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RatePageLayout onBack={ratingSubmitted ? () => router.push('/dashboard') : undefined}>
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
      <RateFormErrorBoundary>
        <PerformanceRatingClientWrapper
          performance={{
            id: `${actor.id}-${movie.id}`,
            actor: { ...actor, slug: actor.slug ?? undefined },
            movie: {
              ...movie,
              slug: movie.slug ?? undefined,
              director: movie.director ?? undefined,
              posterUrl: movie.posterUrl ?? undefined,
            },
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
          onSuccess={() => setRatingSubmitted(true)}
          initialRating={userExistingRating ? {
            emotionalDepth: userExistingRating.emotionalDepth,
            believability: userExistingRating.believability,
            technicalSkill: userExistingRating.technicalSkill,
            screenPresence: userExistingRating.screenPresence,
            chemistry: userExistingRating.chemistry,
            comment: userExistingRating.comment,
            isSpoiler: userExistingRating.isSpoiler,
          } : undefined}
          communityAvg10={communityAvg10}
          communityRatingCount={communityRatingCount}
          communityDimensions={communityDimensions}
          seededAggregateScore={seededAggregateScore}
          movieCast={movieCast}
          onGuestMomentumSignup={openGuestMomentumSignup}
        />
      </RateFormErrorBoundary>
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
          variant="momentum"
          guestRatingsCount={guestCount}
        />
      )}
    </RatePageLayout>
  )
}
