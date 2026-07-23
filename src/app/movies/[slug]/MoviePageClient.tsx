"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Film, ChevronDown, Award, User, Users, Trophy, ChevronRight, ArrowRight } from 'lucide-react'
import { FaStar } from 'react-icons/fa'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/components/providers/SessionProvider'
import { useNavigationProgress } from '@/components/providers/NavigationProgressProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { getRateUrl, getActorUrl } from '@/lib/slugHelper'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { MoviePoster } from '@/components/ui/MoviePoster'
import { ActorHeadshot } from '@/components/ui/ActorHeadshot'
import { PerformanceCardScoreSplit } from '@/components/rating/PerformanceCardScoreSplit'
import { RateOrComingSoonButton } from '@/components/rating/RateOrComingSoonButton'
import { isMovieComingSoon } from '@/lib/movie-release'
import { resolveCharacterDisplay } from '@/lib/character'
import { upgradeActorImageRes } from '@/lib/tmdb'

interface Rating {
  userId: string
  actorId: string
  movieId: string
  roleName?: string
  weightedScore?: number
  emotionalRangeDepth?: number
  characterBelievability?: number
  technicalSkill?: number
  screenPresence?: number
  chemistryInteraction?: number
}

interface Movie {
  id: string
  title: string
  slug?: string | null
  year: number
  director?: string
  genre?: string
  overview?: string
  tmdbId?: number
  posterUrl?: string | null
  tmdbRating?: number | null
  releaseDate?: string | Date | null
  ratings?: Rating[]
}

interface Actor {
  id: string
  name: string
  slug?: string | null
  imageUrl?: string | null
}

interface Performance {
  id: string
  actorId: string
  movieId: string
  character?: string | null
  roleName?: string | null
  comment?: string | null
  order?: number | null
  tier?: 'LEAD' | 'SUPPORTING' | 'MINOR' | null
  emotionalRangeDepth?: number
  characterBelievability?: number
  technicalSkill?: number
  screenPresence?: number
  chemistryInteraction?: number
  seededAggregateScore?: number | null
  actor: Actor
  movie: {
    id: string
    title: string
    year: number
    slug?: string | null
  }
}

const TIER_RANK: Record<string, number> = { LEAD: 0, SUPPORTING: 1, MINOR: 2 }

function compareByCastOrder(
  a: { tier?: string | null; order?: number | null; actor: { name: string } },
  b: { tier?: string | null; order?: number | null; actor: { name: string } },
) {
  const tierA = TIER_RANK[a.tier ?? ''] ?? 2
  const tierB = TIER_RANK[b.tier ?? ''] ?? 2
  if (tierA !== tierB) return tierA - tierB
  const orderA = a.order ?? Number.POSITIVE_INFINITY
  const orderB = b.order ?? Number.POSITIVE_INFINITY
  if (orderA !== orderB) return orderA - orderB
  return a.actor.name.localeCompare(b.actor.name)
}

type MoviePageClientProps = {
  initialMovie?: Movie | null
  initialPerformances?: Performance[]
}

export default function MoviePageClient({
  initialMovie = null,
  initialPerformances = [],
}: MoviePageClientProps = {}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const user = useUser()
  const { startNavigation, endNavigation } = useNavigationProgress()
  const movieSlug = params?.slug as string

  const hasInitial = initialMovie != null
  const [movie, setMovie] = useState<Movie | null>(initialMovie)
  const [performances, setPerformances] = useState<Performance[]>(initialPerformances)
  const [loading, setLoading] = useState(!hasInitial)
  const [is410, setIs410] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'cast' | 'relevance' | 'alphabetical' | 'rating' | 'most-rated' | 'controversial'>('cast')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [userHasRatedMovie, setUserHasRatedMovie] = useState(false)
  const [userRatedActors, setUserRatedActors] = useState<Set<string>>(new Set())
  const [userRatingsMap, setUserRatingsMap] = useState<Map<string, number>>(new Map())
  const [seoExpanded, setSeoExpanded] = useState(false)
  const [showRatingFeedback, setShowRatingFeedback] = useState(false)
  const [ratingFeedbackData, setRatingFeedbackData] = useState<{ userScore: number; communityScore: number | null } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [refreshKey, setRefreshKey] = useState(0)

  // Clear global navigation overlay when this page has finished loading
  useEffect(() => {
    if (!loading) endNavigation()
  }, [loading, endNavigation])

  // Check if movieSlug is a UUID (if so, return 410 Gone)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(movieSlug)
  
  useEffect(() => {
    if (isUUID) {
      setIs410(true)
      setLoading(false)
    }
  }, [isUUID])

  // Check for refresh flag when pathname changes
  useEffect(() => {
    const refreshMovieRatings = sessionStorage.getItem('refreshMovieRatings')
    const refreshMovieRatingsSlug = sessionStorage.getItem('refreshMovieRatingsSlug')
    
    if (refreshMovieRatings === movieSlug || refreshMovieRatingsSlug === movieSlug) {
      sessionStorage.removeItem('refreshMovieRatings')
      sessionStorage.removeItem('refreshMovieRatingsSlug')
      console.log('Refresh flag detected, triggering refresh')
      setRefreshKey(prev => prev + 1)
    }
  }, [movieSlug, pathname])

  // Also refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('Page visible, refreshing user ratings')
        setRefreshKey(prev => prev + 1)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  useEffect(() => {
    const fetchData = async () => {
      if (isUUID) return
      if (hasInitial) {
        // Keep movie payload cacheable to avoid extra function invocations.
        fetch(`/api/movies/${movieSlug}`, {
          cache: 'force-cache',
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((freshData) => {
            if (!freshData) return
            setMovie(freshData)
            if (Array.isArray(freshData.performances)) setPerformances(freshData.performances)
          })
          .catch(() => {})

        if (!user) {
          setLoading(false)
          return
        }
        try {
          const userRatingsResponse = await fetch(`/api/movies/${movieSlug}/user-rating`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
          })
          if (userRatingsResponse.ok) {
            const userRatings = await userRatingsResponse.json()
            if (Array.isArray(userRatings)) {
              setUserRatedActors(new Set(userRatings.map((r: any) => r.actorId)))
              setUserHasRatedMovie(userRatings.length > 0)
              const scoresMap = new Map<string, number>()
              userRatings.forEach((r: any) => {
                const scores = [r.emotionalRangeDepth, r.characterBelievability, r.technicalSkill, r.screenPresence, r.chemistryInteraction].filter((s): s is number => typeof s === 'number' && s > 0)
                if (scores.length > 0) scoresMap.set(r.actorId, scores.reduce((a, b) => a + b, 0) / scores.length)
              })
              setUserRatingsMap(scoresMap)
            }
          }
        } catch (e) {
          console.error('Failed to fetch user ratings:', e)
        }
        setLoading(false)
        return
      }
      try {
        const [movieResponse, userRatingsResponse] = await Promise.all([
          fetch(`/api/movies/${movieSlug}`),
          user ? fetch(`/api/movies/${movieSlug}/user-rating`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } }) : Promise.resolve(null)
        ])
        if (!movieResponse.ok) throw new Error('Failed to fetch movie')
        const data = await movieResponse.json()
        setMovie(data)
        setPerformances(data.performances || [])
        if (user && userRatingsResponse) {
          console.log('Processing user ratings for movie:', movieSlug, 'user:', user.id)
          
          if (userRatingsResponse.ok) {
            const userRatings = await userRatingsResponse.json()
            console.log('User ratings received:', userRatings)
            
            if (Array.isArray(userRatings)) {
              const actorIds = userRatings.map((r: any) => r.actorId)
              setUserRatedActors(new Set(actorIds))
              setUserHasRatedMovie(userRatings.length > 0)
              
              console.log('User has rated these actors:', actorIds)
              
              // Store user scores for each actor
              const scoresMap = new Map<string, number>()
              userRatings.forEach((r: any) => {
                // Calculate user's average score for this performance
                const scores = [
                  r.emotionalRangeDepth,
                  r.characterBelievability,
                  r.technicalSkill,
                  r.screenPresence,
                  r.chemistryInteraction
                ].filter((s): s is number => typeof s === 'number' && s > 0)
                
                if (scores.length > 0) {
                  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
                  scoresMap.set(r.actorId, avgScore)
                  console.log('Actor:', r.actorId, 'User score:', avgScore)
                }
              })
              setUserRatingsMap(scoresMap)
            }
          } else {
            console.error('Failed to fetch user ratings:', userRatingsResponse.status)
          }
        } else {
          console.log('No user logged in, skipping user ratings fetch')
          // Clear user data when no user
          setUserRatedActors(new Set())
          setUserRatingsMap(new Map())
          setUserHasRatedMovie(false)
        }

        // Check for rating feedback from session storage
        const ratingFeedback = sessionStorage.getItem('ratingFeedback')
        if (ratingFeedback) {
          try {
            const feedback = JSON.parse(ratingFeedback)
            if (feedback.movieId === data.id) {
              setRatingFeedbackData({
                userScore: feedback.userScore,
                communityScore: feedback.communityScore
              })
              setShowRatingFeedback(true)
              sessionStorage.removeItem('ratingFeedback')
              // Auto-hide after 8 seconds
              setTimeout(() => setShowRatingFeedback(false), 8000)
            }
          } catch (e) {
            // Invalid feedback data, ignore
          }
        }
      } catch (error) {
        console.error('Error fetching movie:', error)
      } finally {
        setLoading(false)
      }
    }

    if (movieSlug) {
      fetchData()
    }
  }, [movieSlug, user, refreshKey, isUUID, hasInitial])

  // Close dropdown and update sort when search query changes
  useEffect(() => {
    setSortDropdownOpen(false)
    // Auto-switch to relevance when searching, back to cast order when cleared
    if (searchQuery.trim() && sortBy === 'cast') {
      setSortBy('relevance')
    } else if (!searchQuery.trim() && sortBy === 'relevance') {
      setSortBy('cast')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Calculate performance score from performances with ratings
  const calculatePerformanceScore = (perf: Performance) => {
    if (!perf.emotionalRangeDepth && !perf.characterBelievability && !perf.technicalSkill && !perf.screenPresence && !perf.chemistryInteraction) {
      return null
    }
    const scores = [
      perf.emotionalRangeDepth,
      perf.characterBelievability,
      perf.technicalSkill,
      perf.screenPresence,
      perf.chemistryInteraction
    ].filter((s): s is number => typeof s === 'number' && s > 0)
    
    if (scores.length === 0) return null
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  // Dedupe by actor: API can return multiple Performance rows per actor.
  // Prefer better billing tier / earlier cast order when colliding.
  const dedupedPerformances = useMemo(() => {
    const byActor = new Map<string, Performance>()
    ;(performances || []).forEach((p: Performance) => {
      const existing = byActor.get(p.actorId)
      if (!existing || compareByCastOrder(p, existing) < 0) {
        byActor.set(p.actorId, p)
      }
    })
    return Array.from(byActor.values())
  }, [performances])

  const performancesWithScores = useMemo(() => {
    return dedupedPerformances.map(perf => ({
      ...perf,
      averageScore: calculatePerformanceScore(perf)
    }))
  }, [dedupedPerformances])

  const scoredPerformances = useMemo(() => {
    return performancesWithScores.filter(p => p.averageScore !== null)
  }, [performancesWithScores])

  const movieScore = useMemo(() => {
    return scoredPerformances.length > 0
      ? scoredPerformances.reduce((sum, perf) => sum + (perf.averageScore || 0), 0) / scoredPerformances.length
      : null
  }, [scoredPerformances])

  /** Film TMDB vote_average (0–10). Falls back to avg of cast seeded scores. Never merge with community. */
  const criticAggregateScore = useMemo(() => {
    if (typeof movie?.tmdbRating === 'number' && Number.isFinite(movie.tmdbRating)) {
      return movie.tmdbRating
    }
    const seeded = dedupedPerformances
      .map((p) => p.seededAggregateScore)
      .filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
    if (seeded.length === 0) return null
    return seeded.reduce((sum, s) => sum + s, 0) / seeded.length
  }, [movie?.tmdbRating, dedupedPerformances])

  // Calculate community stats
  const communityStats = useMemo(() => {
    const totalRatings = movie?.ratings?.length || 0
    const ratedPerformancesCount = scoredPerformances.length
    const totalPerformances = dedupedPerformances.length
    const unratedPerformances = totalPerformances - ratedPerformancesCount
    
    // Find highest rated performance
    const highestRated = scoredPerformances.length > 0
      ? scoredPerformances.reduce((max, perf) => 
          (perf.averageScore || 0) > (max.averageScore || 0) ? perf : max
        )
      : null
    
    return {
      totalRatings,
      ratedPerformancesCount,
      totalPerformances,
      unratedPerformances,
      highestRated,
      criticsCount: totalRatings // Each rating is from a different user session
    }
  }, [movie, dedupedPerformances, scoredPerformances])

  // Filter and rank performances based on search query
  const filteredPerformances = useMemo(() => {
    if (!searchQuery.trim()) {
      return performancesWithScores
    }

    const query = searchQuery.toLowerCase().trim()
    const scored = performancesWithScores.map(perf => {
      const actorName = perf.actor.name.toLowerCase()
      const character = resolveCharacterDisplay(perf).toLowerCase()
      
      let score = 0
      
      // Exact actor name match gets highest score
      if (actorName === query) {
        score += 100
      } else if (actorName.startsWith(query)) {
        score += 80
      } else if (actorName.includes(query)) {
        score += 60
      }
      
      // Character match
      if (character.includes(query)) {
        score += 40
      }
      
      return { ...perf, searchScore: score }
    })

    // Filter by search score (only show matches)
    return scored.filter(p => p.searchScore > 0)
  }, [performancesWithScores, searchQuery])

  // Calculate rating count and variance for each performance (for sorting)
  const performancesWithStats = useMemo(() => {
    return filteredPerformances.map(perf => {
      // Count how many ratings this performance has
      const actorRatings = movie?.ratings?.filter((r: any) => r.actorId === perf.actorId && r.movieId === perf.movieId) || []
      const ratingCount = actorRatings.length
      
      // Calculate variance for controversial sorting
      let variance = 0
      if (actorRatings.length > 1) {
        const scores = actorRatings.map((r: Rating) => {
          const score = [
            r.emotionalRangeDepth,
            r.characterBelievability,
            r.technicalSkill,
            r.screenPresence,
            r.chemistryInteraction
          ].filter((s): s is number => typeof s === 'number' && s > 0)
          return score.length > 0 ? score.reduce((sum: number, s: number) => sum + s, 0) / score.length : 0
        })
        const mean = scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length
        variance = scores.reduce((sum: number, s: number) => sum + Math.pow(s - mean, 2), 0) / scores.length
      }
      
      return {
        ...perf,
        ratingCount,
        variance
      }
    })
  }, [filteredPerformances, movie])

  // Apply sorting to filtered performances
  const filteredAndRankedPerformances = useMemo(() => {
    let sorted = [...performancesWithStats]

    switch (sortBy) {
      case 'cast':
        sorted.sort(compareByCastOrder)
        break
      case 'alphabetical':
        sorted.sort((a, b) => a.actor.name.localeCompare(b.actor.name))
        break
      case 'rating':
        sorted.sort((a, b) => {
          const aScore = a.averageScore || 0
          const bScore = b.averageScore || 0
          if (bScore !== aScore) {
            return bScore - aScore
          }
          return compareByCastOrder(a, b)
        })
        break
      case 'most-rated':
        sorted.sort((a, b) => {
          const aCount = (a as any).ratingCount || 0
          const bCount = (b as any).ratingCount || 0
          if (bCount !== aCount) {
            return bCount - aCount
          }
          // Secondary sort by rating
          const aScore = a.averageScore || 0
          const bScore = b.averageScore || 0
          if (bScore !== aScore) return bScore - aScore
          return compareByCastOrder(a, b)
        })
        break
      case 'controversial':
        sorted.sort((a, b) => {
          const aVariance = (a as any).variance || 0
          const bVariance = (b as any).variance || 0
          if (bVariance !== aVariance) {
            return bVariance - aVariance
          }
          // Secondary sort by rating count
          const aCount = (a as any).ratingCount || 0
          const bCount = (b as any).ratingCount || 0
          if (bCount !== aCount) return bCount - aCount
          return compareByCastOrder(a, b)
        })
        break
      case 'relevance':
        // If searching, sort by search score, otherwise by cast order
        if (searchQuery.trim()) {
          sorted.sort((a, b) => {
            const aScore = (a as any).searchScore || 0
            const bScore = (b as any).searchScore || 0
            if (bScore !== aScore) {
              return bScore - aScore
            }
            return compareByCastOrder(a, b)
          })
        } else {
          sorted.sort(compareByCastOrder)
        }
        break
      default:
        sorted.sort(compareByCastOrder)
        break
    }

    return sorted
  }, [performancesWithStats, sortBy, searchQuery])

  const Layout = user ? SignedInLayout : HomeLayout

  const movieComingSoon = useMemo(
    () => (movie ? isMovieComingSoon(movie) : false),
    [movie]
  )

  const targetPerformance = useMemo(() => {
    return communityStats.highestRated || performances[0] || null
  }, [communityStats.highestRated, performances])

  const isTargetRated = useMemo(() => {
    return targetPerformance ? userRatedActors.has(targetPerformance.actorId) : false
  }, [targetPerformance, userRatedActors])

  // Handle 410 Gone for UUID routes
  if (is410) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h1 className="text-6xl font-bold text-white mb-4">410</h1>
            <h2 className="text-2xl font-bold text-white mb-4">Page Gone</h2>
            <p className="text-gray-400 mb-6">
              This URL format is no longer supported. Movie pages now use slug-based URLs.
            </p>
            <Button onClick={() => router.push('/search')}>Go to Search</Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <BouncingBallsLoader size="lg" color="#FFD700" />
        </div>
      </Layout>
    )
  }

  if (!movie) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Movie not found</h1>
            <Button onClick={() => router.push('/search')}>Back to Search</Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black">
        {/* Post-Rating Feedback */}
        <AnimatePresence>
          {showRatingFeedback && ratingFeedbackData && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
            >
              <div className="bg-[#141414] border border-white/[0.08] rounded-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">Rating saved</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-300">
                        Your score: <span className="text-[#FFD700] font-semibold">{ratingFeedbackData.userScore.toFixed(1)}/10</span>
                      </p>
                      {ratingFeedbackData.communityScore !== null && (
                        <p className="text-sm text-gray-400">
                          Community average: <span className="text-white font-semibold">{ratingFeedbackData.communityScore.toFixed(1)}/10</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRatingFeedback(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {dedupedPerformances.length > 0 && (
                  <Link 
                    href={
                      communityStats.highestRated 
                        ? getRateUrl(
                            { 
                              id: communityStats.highestRated.actor.id, 
                              name: communityStats.highestRated.actor.name, 
                              slug: communityStats.highestRated.actor.slug || null 
                            },
                            { 
                              id: communityStats.highestRated.movie.id, 
                              title: communityStats.highestRated.movie.title, 
                              year: communityStats.highestRated.movie.year, 
                              slug: communityStats.highestRated.movie.slug || null 
                            }
                          )
                        : getRateUrl(
                            { 
                              id: performances[0].actor.id, 
                              name: performances[0].actor.name, 
                              slug: performances[0].actor.slug || null 
                            },
                            { 
                              id: performances[0].movie.id, 
                              title: performances[0].movie.title, 
                              year: performances[0].movie.year, 
                              slug: performances[0].movie.slug || null 
                            }
                          )
                    }
                  >
                    <button
                      className="w-full px-4 py-2 rounded-md text-black text-sm font-bold transition-transform duration-200 hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      }}
                    >
                      Rate Another Performance
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section - extra top padding + safe area so round back button isn't cut off under navbar */}
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16"
          style={{ paddingTop: 'max(5.5rem, calc(5rem + env(safe-area-inset-top, 0px)))' }}
        >
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            <Link
              href={user ? "/dashboard" : "/"}
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Movie Info */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            {/* Movie poster */}
            {movie.posterUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center mb-8"
              >
                <div className="ring-1 ring-white/[0.08] rounded-md overflow-hidden">
                  <MoviePoster
                    title={movie.title}
                    posterUrl={movie.posterUrl}
                    size="hero"
                    loading="eager"
                    rounded="rounded-md"
                  />
                </div>
              </motion.div>
            )}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 text-white tracking-tight leading-[1.15]"
              style={{
                fontFamily:
                  'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
              }}
            >
              {movie.title}
            </h1>

            {/* Movie Year and Director */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              {movie.year && (
                <span className="text-lg text-gray-400">
                  {movie.year}
                </span>
              )}
              {movie.director && (
                <span className="text-lg text-gray-400">
                  Directed by {movie.director}
                </span>
              )}
              {movie.genre && (
                <span className="text-lg text-gray-400">
                  {movie.genre}
                </span>
              )}
            </div>

            {/* Movie Overview / Plot Summary */}
            {movie.overview?.trim() && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 leading-relaxed mb-8 px-1 text-left sm:text-center"
              >
                {movie.overview.trim()}
              </motion.p>
            )}

            {/* Primary CTA - Rate a Performance (scrolls to performance cards) */}
            {dedupedPerformances.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mb-8 sm:mb-10"
              >
                {movieComingSoon ? (
                  <button
                    type="button"
                    disabled
                    className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-md text-[15px] sm:text-base font-bold flex items-center justify-center gap-2 mx-auto min-h-[44px] cursor-not-allowed text-zinc-400 border border-white/10 bg-white/[0.04]"
                  >
                    Coming soon
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      (document.getElementById('first-performance-card') ?? document.getElementById('performances-section'))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-md text-black text-[15px] sm:text-base font-bold transition-transform duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 mx-auto min-h-[44px]"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      color: 'black'
                    }}
                  >
                    <FaStar className="w-4 h-4" />
                    Rate a performance
                  </button>
                )}
              </motion.div>
            )}

            {/* Divider - Minimal */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[1px] mx-auto mb-8 sm:mb-10 relative"
            >
              <div 
                className="h-full w-full bg-white/20"
              />
            </motion.div>

            {/* Critic Aggregate vs Community Rating — always separate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
              className="mb-8 max-w-2xl mx-auto"
            >
              <div
                className="rounded-md p-5 sm:p-6 text-left border border-white/[0.08] bg-white/[0.03]"
              >
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 text-center" style={{ color: '#52525b' }}>
                  Scores
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* Community first — product score */}
                  <div
                    className={`rounded-md p-4 ${
                      movieScore != null && communityStats.totalRatings > 0
                        ? 'border border-[#FFD700]/30 bg-[#FFD700]/10'
                        : 'border border-white/[0.06] bg-transparent'
                    }`}
                  >
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 text-[#FFD700]/80">
                      Community
                    </p>
                    {movieScore != null && communityStats.totalRatings > 0 ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-4xl sm:text-5xl font-black tabular-nums text-[#FFD700] leading-none"
                            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                          >
                            {(movieScore / 10).toFixed(1)}
                          </span>
                          <span className="text-sm font-semibold text-[#FFD700]/50">/10</span>
                        </div>
                        <p className="text-[11px] mt-2 leading-snug text-zinc-500">
                          From{' '}
                          <span className="text-zinc-300 font-semibold tabular-nums">
                            {communityStats.totalRatings}
                          </span>{' '}
                          {communityStats.totalRatings === 1
                            ? 'ActorRating rating'
                            : 'ActorRating ratings'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm sm:text-base font-medium text-zinc-500">
                        Not yet rated
                      </p>
                    )}
                  </div>
                  <div className="rounded-md p-4 border border-white/[0.06]">
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 text-zinc-500">
                      TMDB film score
                    </p>
                    {criticAggregateScore != null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black tabular-nums text-zinc-200 leading-none">
                          {Number(criticAggregateScore.toFixed(1))}
                        </span>
                        <span className="text-sm font-semibold text-zinc-600">/10</span>
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base font-medium text-zinc-500">
                        Not available
                      </p>
                    )}
                    <p className="text-[11px] mt-2 leading-snug text-zinc-600">
                      External film audience average — not ActorRating users
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap text-sm sm:text-base mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      <span className="font-bold text-white">{communityStats.ratedPerformancesCount}</span> of <span className="font-bold text-white">{communityStats.totalPerformances}</span> performances rated
                    </span>
                  </div>
                  {communityStats.highestRated && (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        Top: <Link href={getActorUrl(communityStats.highestRated.actor)} prefetch onClick={() => startNavigation()} className="inline-flex items-center gap-1 font-bold text-white underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid transition-colors"><span>{communityStats.highestRated.actor.name}</span><ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden /></Link>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Onboarding Card - Rate Your First Performance */}
        {user && !userHasRatedMovie && !movieComingSoon && communityStats.highestRated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16"
          >
            <div className="mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white text-center"
                style={{ 
                  fontFamily: 'var(--font-geist-sans), sans-serif',
                  letterSpacing: '0.02em',
                }}
              >
                Start Here
              </h3>
              <p className="text-sm text-gray-400 text-center mt-1">
                Rate the highest-rated performance in {movie.title}
              </p>
            </div>
            
            <div className="relative p-5 sm:p-6 rounded-md border border-white/[0.08] bg-[#141414] overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-1">
                  {/* Top Row: Rating Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FFD700]/10 border border-[#FFD700]/25">
                      <FaStar className="w-5 h-5 text-[#FFD700]" />
                      <span 
                        className="text-2xl sm:text-3xl font-bold text-[#FFD700]"
                        style={{
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {((communityStats.highestRated.averageScore || 0) / 10).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Social Proof - Rating Count */}
                  {(() => {
                    const highestRatedActorRatings = movie?.ratings?.filter((r: any) => r.actorId === communityStats.highestRated?.actorId && r.movieId === communityStats.highestRated?.movieId) || []
                    const ratingCount = highestRatedActorRatings.length
                    return ratingCount > 0 ? (
                      <div className="mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-300">
                            <span className="font-semibold text-white">{ratingCount}</span> {ratingCount === 1 ? 'critic' : 'critics'} rated
                          </span>
                        </div>
                      </div>
                    ) : null
                  })()}

                  {/* Actor Name - internal link */}
                  <div className="mb-4">
                    <Link href={getActorUrl(communityStats.highestRated.actor)} prefetch onClick={() => startNavigation()} className="inline-flex items-center gap-1.5 text-lg text-white font-semibold tracking-wide underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid transition-colors">
                      <span>{communityStats.highestRated.actor.name}</span>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" aria-hidden />
                    </Link>
                  </div>
                </div>

                {/* Rate Button */}
                <div className="mt-auto pt-4">
                  <Link 
                    href={getRateUrl(
                      { 
                        id: communityStats.highestRated.actor.id, 
                        name: communityStats.highestRated.actor.name, 
                        slug: communityStats.highestRated.actor.slug || null 
                      },
                      { 
                        id: communityStats.highestRated.movie.id, 
                        title: communityStats.highestRated.movie.title, 
                        year: communityStats.highestRated.movie.year, 
                        slug: communityStats.highestRated.movie.slug || null 
                      }
                    )}
                  >
                    <button 
                      className="w-full px-8 py-4 rounded-md text-black text-[15px] font-bold transition-transform duration-200 hover:scale-[1.02] cursor-pointer min-h-[44px]"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        Rate
                        <FaStar className="w-4 h-4" />
                      </span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      {/* Performances Grid */}
      <div id="performances-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {dedupedPerformances.length > 0 ? (
          <>
            <motion.div
              id="cast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10 sm:mb-12"
            >
              {/* Mobile: Stacked layout, Desktop: Same line */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-4 lg:gap-6 mb-8 sm:mb-6">
                {/* Left side: Cast heading */}
                <div className="flex items-center gap-3 sm:gap-4 flex-nowrap justify-center sm:justify-start flex-shrink-0 min-w-0">
                  <User className="w-7 h-7 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                  <h2 
                    className="text-2xl sm:text-3xl font-bold text-white text-center sm:text-left flex-shrink-0 min-w-0 tracking-tight"
                    style={{ 
                      fontFamily: 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
                    }}
                  >
                    Performances
                  </h2>
                </div>
                
                {/* Right side: Search Bar and Sort */}
                <div className="flex items-center gap-4 sm:gap-3 w-full sm:w-auto flex-shrink min-w-0">
                  <div className="relative flex-1 sm:w-96 lg:w-[28rem] max-w-full">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for actor or character name"
                        className="w-full pl-12 pr-10 py-4 sm:py-3 rounded-md bg-[#1a1a1a] border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 focus:border-white/20 transition-all text-base"
                        
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Sort Button */}
                  <div className="relative">
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-4 sm:py-3 rounded-md bg-[#1a1a1a] border border-white/10 text-white hover:border-white/20 transition-all text-sm font-medium whitespace-nowrap"
                    >
                      <span>
                        {sortBy === 'cast' ? 'Cast order' :
                         sortBy === 'relevance' ? (searchQuery.trim() ? 'Relevance' : 'Cast order') : 
                         sortBy === 'alphabetical' ? 'A-Z' :
                         sortBy === 'most-rated' ? 'Most Rated' :
                         sortBy === 'controversial' ? 'Controversial' : 'Highest Rated'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Sort Dropdown */}
                    {sortDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setSortDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 z-50 w-64 sm:w-56 rounded-md bg-[#1a1a1a] border border-white/[0.08] overflow-hidden shadow-lg">
                          <button
                            onClick={() => {
                              setSortBy('cast')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'cast' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Cast order
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('rating')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'rating' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Highest Rated
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('most-rated')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'most-rated' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Most Rated
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('controversial')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'controversial' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Controversial
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('alphabetical')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'alphabetical' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Alphabetical (A-Z)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {filteredAndRankedPerformances.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredAndRankedPerformances.map((performance, index) => {
                const rateUrl = getRateUrl(
                  { id: performance.actor.id, name: performance.actor.name, slug: performance.actor.slug || null },
                  { id: performance.movie.id, title: performance.movie.title, year: performance.movie.year, slug: performance.movie.slug || null }
                )
                const character = resolveCharacterDisplay(performance) || "—"
                const communityAvg10 = performance.averageScore != null ? performance.averageScore / 10 : null
                const communityCount = (performance as any).ratingCount || 0
                const isHighestRated =
                  sortBy === 'rating' &&
                  index === 0 &&
                  communityAvg10 != null &&
                  communityAvg10 > 0
                const userScore = userRatingsMap.get(performance.actorId)
                const hasUserRated = userRatedActors.has(performance.actorId)

                return (
                  <motion.div
                    key={performance.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    style={{ willChange: 'transform, opacity' }}
                    className="group relative"
                    id={index === 0 ? 'first-performance-card' : undefined}
                  >
                    {/* Premium Card - Clean & Cinematic */}
                    <div 
                      className={`relative h-full flex flex-col rounded-md border overflow-hidden transition-colors duration-200 ${
                        isHighestRated
                          ? 'bg-[#141414] border-[#FFD700]/35'
                          : 'bg-[#141414] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
{/* Content — flex-1 so rate button always stays at bottom */}
                      <div className="relative z-10 flex flex-col flex-1 p-5 sm:p-6">
                        <div className="flex-1">
                          {/* Actor headshot — same framed poster style as filmography cards on actor pages */}
                          <div className="flex justify-center mb-6">
                            <ActorHeadshot
                              name={performance.actor.name}
                              imageUrl={upgradeActorImageRes(performance.actor.imageUrl)}
                              size="lg"
                              loading="lazy"
                              rounded="rounded-md"
                            />
                          </div>

                          {/* Community only — film Critic Aggregate is at page top */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <PerformanceCardScoreSplit
                              showCriticAggregate={false}
                              communityAvg10={communityAvg10}
                              communityRatingCount={communityCount}
                              userScore10={hasUserRated && userScore != null ? userScore / 10 : null}
                            />
                            {hasUserRated && (
                              <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#FFD700]/60 px-2 py-0.5 rounded-full border border-[#FFD700]/20">
                                  ✓ Rated
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actor Name */}
                          <div className="mb-4">
                            <Link
                              href={getActorUrl(performance.actor)}
                              prefetch
                              onClick={() => startNavigation()}
                              onMouseEnter={() => router.prefetch(getActorUrl(performance.actor))}
                              className="inline-flex items-center gap-2 text-lg text-white font-semibold tracking-wide underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid focus:outline-none focus:underline transition-colors"
                            >
                              <span>{performance.actor.name}</span>
                              <ArrowRight className="w-4 h-4 flex-shrink-0" aria-hidden />
                            </Link>
                          </div>

                          {/* Character */}
                          <div className="mb-6">
                            <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                              as {character}
                            </p>
                          </div>
                        </div>

                        {/* Rate Button */}
                        <div className="mt-auto pt-4">
                          <RateOrComingSoonButton
                            rateUrl={rateUrl}
                            comingSoon={movieComingSoon}
                            alreadyRated={userRatedActors.has(performance.actorId)}
                          />
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )
              })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="inline-block p-8 rounded-md bg-[#141414] border border-white/[0.08]">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No performances found</h3>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? `No performances match "${searchQuery}"`
                      : "This movie doesn't have any performances yet."
                    }
                  </p>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center py-16"
          >
            <div className="relative mx-auto w-fit p-8 sm:p-10 rounded-md border border-white/[0.08] bg-[#141414]">
              <Film className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-base text-zinc-500">No performances found for this movie yet.</p>
            </div>
          </motion.div>
        )}
      </div>

      </div>
    </Layout>
  )
}
