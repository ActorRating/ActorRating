"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/providers/SessionProvider'
import { motion } from 'framer-motion'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { SignedInLayout } from '@/components/layout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { SearchBar } from '@/components/SearchBar'
import { FaStar } from 'react-icons/fa'
import { CheckCircle, Star, Users, TrendingUp, X } from 'lucide-react'
import { MoviePoster } from '@/components/ui/MoviePoster'
import { ActorHeadshot } from '@/components/ui/ActorHeadshot'
import { getLevelProgress } from '@/lib/badges'
import { buildByLookupUrl } from '@/lib/performances-page-targets'

// Curated performances for first rating
const CURATED_PERFORMANCES = [
  {
    actorName: 'Heath Ledger',
    actorId: 'heath-ledger',
    movieTitle: 'The Dark Knight',
    movieId: 'the-dark-knight-2008',
    character: 'The Joker',
    year: 2008
  },
  {
    actorName: 'Cillian Murphy',
    actorId: 'cillian-murphy',
    movieTitle: 'Oppenheimer',
    movieId: 'oppenheimer-2023',
    character: 'J. Robert Oppenheimer',
    year: 2023
  },
  {
    actorName: 'Daniel Day-Lewis',
    actorId: 'daniel-day-lewis',
    movieTitle: 'There Will Be Blood',
    movieId: 'there-will-be-blood-2007',
    character: 'Daniel Plainview',
    year: 2007
  },
  {
    actorName: 'Natalie Portman',
    actorId: 'natalie-portman',
    movieTitle: 'Black Swan',
    movieId: 'black-swan-2010',
    character: 'Nina Sayers',
    year: 2010
  },
  {
    actorName: 'Christian Bale',
    actorId: 'christian-bale',
    movieTitle: 'The Fighter',
    movieId: 'the-fighter-2010',
    character: 'Dicky Eklund',
    year: 2010
  },
  {
    actorName: 'Meryl Streep',
    actorId: 'meryl-streep',
    movieTitle: 'Sophie\'s Choice',
    movieId: 'sophies-choice-1982',
    character: 'Sophie Zawistowski',
    year: 1982
  }
]

interface PerformanceWithRating {
  actorName: string
  actorId: string
  movieTitle: string
  movieId: string
  character: string
  year: number
  averageRating?: number | null
  ratingCount?: number
  actorImageUrl?: string | null
  moviePosterUrl?: string | null
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export default function OnboardingRatePage() {
  const router = useRouter()
  const user = useUser()
  const { executeRecaptcha } = useRecaptchaV3()
  const [selectedPerformance, setSelectedPerformance] = useState<typeof CURATED_PERFORMANCES[0] | null>(null)
  const [actor, setActor] = useState<any>(null)
  const [movie, setMovie] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedRating, setSubmittedRating] = useState<any>(null)
  const [showFirstRatingSuccess, setShowFirstRatingSuccess] = useState(false)
  const [isFirstRating, setIsFirstRating] = useState(false)
  const [performancesWithRatings, setPerformancesWithRatings] = useState<PerformanceWithRating[]>([])
  const [communityData, setCommunityData] = useState<{ average: number; count: number } | null>(null)
  const [levelProgress, setLevelProgress] = useState<{ ratingsNeeded: number; nextBadge: string } | null>(null)

  // Carousel state for mobile
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeCard, setActiveCard] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Check if user already has ratings and fetch performance ratings
  useEffect(() => {
    const checkRatingsAndFetch = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Check if user has ratings
        const res = await fetch('/api/ratings/me', { cache: 'no-store' })
        if (res.ok) {
          const ratings = await res.json()
          if (Array.isArray(ratings) && ratings.length > 0) {
            // User already has ratings, redirect to dashboard
            router.push('/dashboard')
            return
          } else {
            // User has no ratings, so this will be their first
            setIsFirstRating(true)
          }
        }

        // Fetch performance ratings in parallel
        const lookupData = CURATED_PERFORMANCES.map(p => ({
          actor: p.actorName,
          movie: p.movieTitle
        }))

        const response = await fetch(buildByLookupUrl(lookupData), {
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          const performances = data.performances || []

          // Map the fetched data back to our curated list with ratings
          const enriched = CURATED_PERFORMANCES.map(curated => {
            const found = performances.find((p: any) => {
              const pActorSlug = (p.actor?.slug || '').toLowerCase().trim()
              const pMovieSlug = (p.movie?.slug || '').toLowerCase().trim()
              if (pActorSlug && pMovieSlug) {
                return pActorSlug === curated.actorId && pMovieSlug === curated.movieId
              }

              const pActorName = normalizeKey(p.actor?.name || '')
              const pMovieTitle = normalizeKey(p.movie?.title || '')
              const curatedActorName = normalizeKey(curated.actorName)
              const curatedMovieTitle = normalizeKey(curated.movieTitle)
              return pActorName === curatedActorName && pMovieTitle === curatedMovieTitle
            })

            return {
              ...curated,
              averageRating: found?.averageRating ?? null,
              ratingCount: found?.ratingCount ?? 0,
              actorImageUrl: found?.actor?.imageUrl ?? null,
              moviePosterUrl: found?.movie?.posterUrl ?? null,
            }
          })

          setPerformancesWithRatings(enriched)
        } else {
          // If API fails, use curated list without ratings
          setPerformancesWithRatings(CURATED_PERFORMANCES.map(p => ({ ...p, averageRating: null, ratingCount: 0 })))
        }
      } catch (error) {
        console.error('Failed to check ratings or fetch performance data:', error)
        // On error, use curated list without ratings
        setPerformancesWithRatings(CURATED_PERFORMANCES.map(p => ({ ...p, averageRating: null, ratingCount: 0 })))
      } finally {
        setLoading(false)
      }
    }

    checkRatingsAndFetch()
  }, [user, router])

  // Track active card for nav dots and depth effect - same as performances page
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let rafId: number | null = null
    let ticking = false

    const updateActiveCard = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2

      const cards = cardRefs.current.filter(Boolean)
      let closestIndex = 0
      let closestDistance = Infinity

      cards.forEach((card, index) => {
        if (!card) return
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }

        // Desktop: apply depth effect
        const isDesktop = window.innerWidth >= 1024
        if (isDesktop) {
          const maxDistance = containerRect.width / 2
          const normalizedDistance = Math.min(distance / maxDistance, 1)
          const scale = 1 - (normalizedDistance * 0.08)
          const opacity = 1 - (normalizedDistance * 0.4)
          const translateY = normalizedDistance * 10

          card.style.transform = `scale(${scale}) translateY(${translateY}px)`
          card.style.opacity = `${opacity}`
        } else {
          // Reset on mobile
          card.style.transform = 'scale(1) translateY(0)'
          card.style.opacity = '1'
        }
      })

      // Update both activeCard (for desktop) and currentIndex (for nav dots)
      setActiveCard(closestIndex)
      setCurrentIndex(closestIndex)
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          updateActiveCard()
        })
        ticking = true
      }
    }

    const handleTouchMove = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          updateActiveCard()
        })
        ticking = true
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', updateActiveCard, { passive: true })
    window.addEventListener('resize', updateActiveCard, { passive: true })
    updateActiveCard()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', updateActiveCard)
      window.removeEventListener('resize', updateActiveCard)
    }
  }, [])


  const handlePerformanceSelect = (performance: typeof CURATED_PERFORMANCES[0]) => {
    // Navigate to slug-based rate page: /rate/[movieSlug]/[actorSlug]
    router.push(`/rate/${performance.movieId}/${performance.actorId}`)
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

    setSubmitting(true)
    try {
      const apiRatingData = {
        emotionalRangeDepth: ratingData.emotionalDepth,
        characterBelievability: ratingData.believability,
        technicalSkill: ratingData.technicalSkill,
        screenPresence: ratingData.screenPresence,
        chemistryInteraction: ratingData.chemistry,
      }

      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('submit_rating')

      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actorId: actor.id,
          movieId: movie.id,
          ...apiRatingData,
          recaptchaToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit rating')
      }

      const result = await response.json()
      setSubmittedRating(result)
      setSubmitted(true)

      // If this is the first rating, fetch community data and level progress
      if (isFirstRating) {
        // Fetch community data for this performance
        try {
          const communityRes = await fetch(
            buildByLookupUrl([{ actor: actor.name, movie: movie.title }]),
            { cache: "no-store" }
          )
          if (communityRes.ok) {
            const communityDataRes = await communityRes.json()
            const perf = communityDataRes.performances?.[0]
            if (perf) {
              setCommunityData({
                average: perf.averageRating ? perf.averageRating / 10 : 0,
                count: perf.ratingCount || 0
              })
            }
          }
        } catch (error) {
          console.error('Failed to fetch community data:', error)
        }

        // Get level progress
        try {
          const progressRes = await fetch('/api/user/level-progress', { cache: 'no-store' })
          if (progressRes.ok) {
            const progressData = await progressRes.json()
            const progress = getLevelProgress(progressData.ratingCount)
            setLevelProgress({
              ratingsNeeded: progress.ratingsNeeded,
              nextBadge: progress.nextBadge?.name || 'Critic'
            })
          }
        } catch (error) {
          console.error('Failed to fetch level progress:', error)
        }

        setShowFirstRatingSuccess(true)
      } else {
        // Redirect to dashboard after a short delay to show success
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !selectedPerformance) {
    return (
      <AuthGuard requireAuth>
        <SignedInLayout>
          <div className="min-h-screen bg-black flex items-center justify-center">
            <BouncingBallsLoader
              size="lg"
              color="#FFD700"
              showText={true}
              text="Loading..."
            />
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show first rating success card
  // Calculate user's rating score
  const calculateUserScore = () => {
    if (!submittedRating) return 0
    const scores = [
      submittedRating.emotionalRangeDepth,
      submittedRating.characterBelievability,
      submittedRating.technicalSkill,
      submittedRating.screenPresence,
      submittedRating.chemistryInteraction
    ].filter(s => typeof s === 'number')
    if (scores.length === 0) return 0
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return avg / 10 // Convert from 0-100 to 0-10
  }

  const userScore = calculateUserScore()
  const welcomeName = user?.name?.trim() || user?.email?.split('@')[0] || 'there'

  if (showFirstRatingSuccess) {
    return (
      <AuthGuard requireAuth>
        <SignedInLayout>
          <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.6
              }}
              className="w-full max-w-md"
            >
              {/* Success Card */}
              <div
                className="relative rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden p-8 sm:p-10"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="absolute top-3 right-3 z-[100] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  aria-label="Close and go to dashboard"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center hover:bg-gray-500/30 transition-colors pointer-events-auto">
                    <X className="w-4 h-4 pointer-events-none" />
                  </div>
                </button>

                {/* Glow effect */}
                <div className="absolute inset-0 opacity-30 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-8"
                  >
                    <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-[#FFD700] mx-auto mb-4" />
                    <h2
                      className="text-2xl sm:text-3xl font-bold text-white"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Rating submitted
                    </h2>
                  </motion.div>

                  {/* User Rating */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#a3a3a3] text-sm sm:text-base">Your rating:</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                        <span
                          className="text-xl sm:text-2xl font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontFamily: 'var(--font-geist-sans), sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {userScore.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Community Rating */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#a3a3a3] text-sm sm:text-base">Community:</span>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-[#FFD700]" />
                        <span
                          className="text-xl sm:text-2xl font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontFamily: 'var(--font-geist-sans), sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {communityData ? `${communityData.average.toFixed(1)}/10` : 'N/A'}
                        </span>
                        {communityData && communityData.count > 0 && (
                          <span className="text-sm text-[#a3a3a3] ml-2">
                            ({communityData.count.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Progress Bar */}
                  {levelProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mb-8"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#a3a3a3]">
                          {levelProgress.ratingsNeeded} to {levelProgress.nextBadge}
                        </span>
                        <TrendingUp className="w-4 h-4 text-[#FFD700]" />
                      </div>
                      <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFA500] transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (1 / 10) * 100)}%`
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <button
                      onClick={() => router.push('/onboarding/rate')}
                      className="flex-1 px-6 py-3.5 rounded-full font-semibold text-base text-white bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-500 hover:via-violet-500 hover:to-purple-500 transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Rate Another
                    </button>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="flex-1 px-6 py-3.5 rounded-full font-semibold text-base text-black bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFA500] hover:from-[#FFD700] hover:via-[#FFA500] hover:to-[#FF8C00] transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Dashboard
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show rating form when performance is selected
  if (selectedPerformance && actor && movie) {
    return (
      <AuthGuard requireAuth>
        <SignedInLayout>
          <div className="min-h-screen bg-black">
            <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-start-3 lg:col-span-8">
                  <PerformanceRatingClientWrapper
                    performance={{
                      id: `${actor.id}-${movie.id}`,
                      actor: {
                        id: actor.id,
                        name: actor.name,
                        imageUrl: actor.imageUrl
                      },
                      movie: {
                        id: movie.id,
                        title: movie.title,
                        year: movie.year,
                        director: movie.director
                      },
                      emotionalRangeDepth: 0,
                      characterBelievability: 0,
                      technicalSkill: 0,
                      screenPresence: 0,
                      chemistryInteraction: 0,
                      comment: '',
                      user: {
                        name: '',
                        email: ''
                      },
                      createdAt: '',
                      updatedAt: ''
                    }}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    submittedRating={submittedRating ? {
                      id: submittedRating.id,
                      emotionalRangeDepth: submittedRating.emotionalRangeDepth,
                      characterBelievability: submittedRating.characterBelievability,
                      technicalSkill: submittedRating.technicalSkill,
                      screenPresence: submittedRating.screenPresence,
                      chemistryInteraction: submittedRating.chemistryInteraction
                    } : undefined}
                    onSuccess={() => {
                      // Success is handled by redirect
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show performance selection - Desktop: Grid, Mobile: Carousel
  return (
    <AuthGuard requireAuth>
      <SignedInLayout>
        <div className="min-h-screen bg-black">
          <div className="w-full max-w-[1280px] mx-auto px-4 py-16 sm:py-20">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  letterSpacing: '0.02em',
                }}
              >
                <span className="text-white">Welcome, </span>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {welcomeName}!
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-[#a3a3a3] font-light mb-8">
                Choose a performance you've seen to rate
              </p>

              {/* Search Bar - Exact same as search page */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="max-w-3xl mx-auto mb-12"
              >
                <div className="relative group">
                  <div
                    className="relative rounded-[2rem] border border-transparent bg-[#1a1a1a] backdrop-blur-2xl overflow-hidden transition-all duration-300"
                    style={{
                      boxShadow: `
                        0 25px 70px -15px rgba(0, 0, 0, 0.9),
                        0 15px 40px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                      `,
                      transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <SearchBar
                      placeholder="Search for actors and movies..."
                      showClear
                      autoFocus={false}
                      className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:text-lg"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Divider Text */}
              <p className="text-base sm:text-lg text-[#a3a3a3] font-light mb-8">
                Or start with these classics:
              </p>
            </motion.div>

            {/* Desktop: Grid layout */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-6 w-full items-stretch">
              {(performancesWithRatings.length > 0 ? performancesWithRatings : CURATED_PERFORMANCES.map(p => ({ ...p, averageRating: null, ratingCount: 0 }))).map((performance, index) => {
                return (
                  <motion.div
                    key={`${performance.actorId}-${performance.movieId}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex h-full w-full max-w-md mx-auto"
                  >
                    <OnboardingPerformanceCard
                      performance={performance}
                      onRate={() => handlePerformanceSelect(performance)}
                    />
                  </motion.div>
                )
              })}
            </div>

            {/* Mobile: Carousel with nav dots */}
            <div className="lg:hidden relative -mx-4 sm:-mx-0">
              {/* Carousel Container */}
              <div
                ref={scrollContainerRef}
                className="recent-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)]"
              >
                {(performancesWithRatings.length > 0 ? performancesWithRatings : CURATED_PERFORMANCES.map(p => ({ ...p, averageRating: null, ratingCount: 0 }))).map((performance, index) => {
                  return (
                    <div
                      key={`${performance.actorId}-${performance.movieId}`}
                      ref={(el) => { cardRefs.current[index] = el }}
                      className="flex-shrink-0 w-[85vw] sm:w-[70vw] snap-center group lg:cursor-pointer"
                      style={{
                        transform: 'translateZ(0)',
                        WebkitTransform: 'translateZ(0)',
                      }}
                      onClick={() => {
                        if (window.innerWidth >= 1024) {
                          const element = cardRefs.current[index]
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                          }
                        }
                      }}
                    >
                      <OnboardingPerformanceCard
                        performance={performance}
                        onRate={() => handlePerformanceSelect(performance)}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Navigation Dots - Mobile Only */}
              <div className="relative flex justify-center items-center mt-8 px-4">
                <div className="relative rounded-xl bg-gradient-to-br from-[#1a1a1a]/80 via-[#0f0f0f]/70 to-black/80 backdrop-blur-xl border border-white/5"
                  style={{
                    boxShadow: `
                    0 10px 30px -5px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.03),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                  `,
                    padding: '6px 12px',
                  }}
                >
                  <div className="relative z-10 flex justify-center items-center" style={{ gap: '6px' }}>
                    {(performancesWithRatings.length > 0 ? performancesWithRatings : CURATED_PERFORMANCES.map(p => ({ ...p, averageRating: null, ratingCount: 0 }))).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const container = scrollContainerRef.current
                          if (container) {
                            const cards = container.querySelectorAll('.recent-scroll-container > div')
                            const targetCard = cards[index] as HTMLElement
                            if (targetCard) {
                              targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                              setCurrentIndex(index)
                            }
                          }
                        }}
                        style={{
                          width: index === currentIndex ? '20px' : '8px',
                          height: '8px',
                          minWidth: '8px',
                          minHeight: '8px',
                          padding: '8px',
                          border: 'none',
                          backgroundColor: index === currentIndex ? '#FFD700' : 'rgba(115, 115, 115, 0.4)',
                          borderRadius: '9999px',
                          transition: 'all 0.3s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (index !== currentIndex) {
                            e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.6)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (index !== currentIndex) {
                            e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.4)'
                          }
                        }}
                        aria-label={`Go to performance ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedInLayout>
    </AuthGuard>
  )
}

function OnboardingPerformanceCard({
  performance,
  onRate,
}: {
  performance: PerformanceWithRating
  onRate: () => void
}) {
  const hasRating = performance.ratingCount && performance.ratingCount > 0 && performance.averageRating != null && performance.averageRating > 0
  const rating = hasRating && performance.averageRating != null ? (performance.averageRating / 10).toFixed(1) : null
  const character = performance.character || "—"

  return (
    <div className="group relative h-full">
      <div
        className="relative h-full min-h-[620px] sm:min-h-[640px] p-6 sm:p-8 md:p-10 lg:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
        style={{ boxShadow: "0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 15px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)" }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex-1">
            <div className="flex justify-center items-end gap-4 sm:gap-5 mb-6">
              <ActorHeadshot
                name={performance.actorName}
                imageUrl={performance.actorImageUrl}
                size="lg"
                loading="lazy"
              />
              <MoviePoster
                title={performance.movieTitle}
                posterUrl={performance.moviePosterUrl}
                size="lg"
                loading="lazy"
              />
            </div>
            <div className="flex items-center justify-between mb-6">
              {rating ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                  <FaStar className="w-6 h-6 text-[#FFD700]" />
                  <span className="text-3xl font-bold text-[#FFD700]" style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontVariantNumeric: "tabular-nums" }}>{rating}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
                  <FaStar className="w-6 h-6 text-[#666]" />
                  <span className="text-3xl font-bold text-[#a3a3a3]">N/A</span>
                </div>
              )}
              <div className="text-[#a3a3a3] text-base font-medium">{performance.year}</div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-cinzel), serif" }}>{performance.actorName}</h3>
            <div className="mb-4">
              <span className="text-lg text-[#FFD700] font-semibold tracking-wide">{performance.movieTitle}</span>
            </div>
            <div className="mb-6">
              <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">as {character}</p>
            </div>
          </div>
          <div className="mt-auto pt-4">
            <button onClick={onRate} className="w-full px-6 py-4 sm:px-8 sm:py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer min-h-[56px] touch-manipulation" style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)" }}>
              <span className="flex items-center justify-center gap-2">Rate <FaStar className="w-5 h-5" /></span>
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
      </div>
    </div>
  )
}
