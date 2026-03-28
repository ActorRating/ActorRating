"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Film, Star, ChevronDown, Award, User, TrendingUp, Users, Trophy, ChevronRight, ArrowRight } from 'lucide-react'
import { FaStar } from 'react-icons/fa'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/components/providers/SessionProvider'
import { useNavigationProgress } from '@/components/providers/NavigationProgressProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { getRateUrl, getMovieUrl } from '@/lib/slugHelper'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { ActorAvatar } from '@/components/ui/ActorAvatar'
import { MoviePoster } from '@/components/ui/MoviePoster'
import { upgradeActorImageRes } from '@/lib/tmdb'

interface Award {
  title?: string
  award?: string
  year?: number
  category?: string
  result?: 'won' | 'nominated'
  movie?: string
}

interface Rating {
  userId: string
  movieId: string
  roleName?: string
  weightedScore?: number
  emotionalRangeDepth?: number
  characterBelievability?: number
  technicalSkill?: number
  screenPresence?: number
  chemistryInteraction?: number
}

interface Actor {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  birthDate?: string
  nationality?: string
  knownFor?: string
  awards?: Award[] | string | null
  ratings?: Rating[]
}

interface Performance {
  id: string
  actorId: string
  movieId: string
  character?: string | null
  emotionalRangeDepth?: number
  characterBelievability?: number
  technicalSkill?: number
  screenPresence?: number
  chemistryInteraction?: number
  actor: {
    id: string
    name: string
    slug?: string | null
  }
  movie: {
    id: string
    title: string
    year: number
    director?: string
    slug?: string | null
    posterUrl?: string | null
  }
}

type ActorPageClientProps = {
  initialActor?: Actor | null
  initialPerformances?: Performance[]
}

function HeroActorPhoto({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  return (
    <>
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }} />
      )}
      {(!imageUrl || errored) ? (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.04)' }}>
          <span className="text-6xl font-black" style={{ color: 'rgba(255,215,0,0.25)' }}>
            {name.charAt(0)}
          </span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={name}
          loading="eager"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </>
  )
}

export default function ActorPageClient({
  initialActor = null,
  initialPerformances = [],
}: ActorPageClientProps = {}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const user = useUser()
  const { startNavigation, endNavigation } = useNavigationProgress()
  const actorId = params?.id as string

  const hasInitial = initialActor != null
  const [actor, setActor] = useState<Actor | null>(initialActor)
  const [performances, setPerformances] = useState<Performance[]>(initialPerformances)
  const [loading, setLoading] = useState(!hasInitial)
  const [is410, setIs410] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'alphabetical' | 'year' | 'rating' | 'most-rated' | 'controversial'>('rating')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [userHasRatedActor, setUserHasRatedActor] = useState(false)
  const [userRatedMovies, setUserRatedMovies] = useState<Set<string>>(new Set())
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

  // Check if actorId is a UUID (if so, return 410 Gone)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)
  
  useEffect(() => {
    if (isUUID) {
      setIs410(true)
      setLoading(false)
    }
  }, [isUUID])

  // Check for refresh flag when pathname changes (navigation back to this page)
  useEffect(() => {
    const refreshActorRatings = sessionStorage.getItem('refreshActorRatings')
    const refreshActorRatingsSlug = sessionStorage.getItem('refreshActorRatingsSlug')
    
    // Check if refresh is needed (match by either ID or slug)
    if (refreshActorRatings === actorId || refreshActorRatingsSlug === actorId) {
      sessionStorage.removeItem('refreshActorRatings')
      sessionStorage.removeItem('refreshActorRatingsSlug')
      console.log('Refresh flag detected, triggering refresh')
      setRefreshKey(prev => prev + 1)
    }
  }, [actorId, pathname])

  // Also refresh when page becomes visible (user returns from another tab/app)
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
        // Keep actor payload cacheable to avoid extra function invocations.
        fetch(`/api/actors/${actorId}`, {
          // Avoid stale JSON (e.g. missing posterUrl after API/schema changes). force-cache kept old payloads across hard refresh.
          cache: 'no-store',
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((freshData) => {
            if (!freshData) return
            setActor(freshData)
            if (Array.isArray(freshData.performances)) setPerformances(freshData.performances)
          })
          .catch(() => {})

        if (!user) {
          setLoading(false)
          return
        }
        try {
          const userRatingsResponse = await fetch(`/api/actors/${actorId}/user-rating`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
          })
          if (userRatingsResponse.ok) {
            const userRatings = await userRatingsResponse.json()
            if (Array.isArray(userRatings)) {
              setUserRatedMovies(new Set(userRatings.map((r: any) => r.movieId)))
              setUserHasRatedActor(userRatings.length > 0)
              const scoresMap = new Map<string, number>()
              userRatings.forEach((r: any) => {
                const scores = [r.emotionalRangeDepth, r.characterBelievability, r.technicalSkill, r.screenPresence, r.chemistryInteraction].filter((s): s is number => typeof s === 'number' && s > 0)
                if (scores.length > 0) scoresMap.set(r.movieId, scores.reduce((a, b) => a + b, 0) / scores.length)
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
        const response = await fetch(`/api/actors/${actorId}`, { cache: 'no-store' })
        if (response.status === 410) {
          setIs410(true)
          setLoading(false)
          return
        }
        if (!response.ok) throw new Error('Failed to fetch actor')
        const data = await response.json()
        setActor(data)
        setPerformances(data.performances || [])
        
        // ALWAYS fetch user ratings if user exists - with fresh data
        if (user) {
          console.log('Fetching user ratings for actor:', actorId, 'user:', user.id)
          const userRatingsResponse = await fetch(`/api/actors/${actorId}/user-rating`, { 
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
          
          if (userRatingsResponse.ok) {
            const userRatings = await userRatingsResponse.json()
            console.log('User ratings received:', userRatings)
            
            if (Array.isArray(userRatings)) {
              const movieIds = userRatings.map((r: any) => r.movieId)
              setUserRatedMovies(new Set(movieIds))
              setUserHasRatedActor(userRatings.length > 0)
              
              console.log('User has rated these movies:', movieIds)
              
              // Store user scores for each movie
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
                  scoresMap.set(r.movieId, avgScore)
                  console.log('Movie:', r.movieId, 'User score:', avgScore)
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
          setUserRatedMovies(new Set())
          setUserRatingsMap(new Map())
          setUserHasRatedActor(false)
        }

        // Check for rating feedback from session storage
        const ratingFeedback = sessionStorage.getItem('ratingFeedback')
        if (ratingFeedback) {
          try {
            const feedback = JSON.parse(ratingFeedback)
            if (feedback.actorId === actorId) {
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
        console.error('Error fetching actor:', error)
      } finally {
        setLoading(false)
      }
    }

    if (actorId) {
      fetchData()
    }
  }, [actorId, user, refreshKey, hasInitial])

  // Close dropdown and update sort when search query changes
  useEffect(() => {
    setSortDropdownOpen(false)
    // Auto-switch to relevance when searching, back to rating when cleared
    if (searchQuery.trim() && sortBy === 'rating') {
      setSortBy('relevance')
    } else if (!searchQuery.trim() && sortBy === 'relevance') {
      setSortBy('rating')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Calculate career score from performances with ratings
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

  // Dedupe by movie: API can return multiple Performance rows per movie (system + per-user). Keep first per movie (API orders preferred).
  const dedupedPerformances = useMemo(() => {
    const byMovie = new Map<string, Performance>()
    ;(performances || []).forEach((p: Performance) => {
      const mid = (p as any).movie?.id ?? (p as any).movieId
      if (!mid) return
      if (!byMovie.has(mid)) byMovie.set(mid, p)
    })
    return Array.from(byMovie.values())
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

  const careerScore = useMemo(() => {
    return scoredPerformances.length > 0
      ? scoredPerformances.reduce((sum, perf) => sum + (perf.averageScore || 0), 0) / scoredPerformances.length
      : null
  }, [scoredPerformances])

  // Calculate community stats
  const communityStats = useMemo(() => {
    const totalRatings = actor?.ratings?.length || 0
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
  }, [actor, dedupedPerformances, scoredPerformances])

  // Filter and rank performances based on search query
  const filteredPerformances = useMemo(() => {
    if (!searchQuery.trim()) {
      return performancesWithScores
    }

    const query = searchQuery.toLowerCase().trim()
    const scored = performancesWithScores.map(perf => {
      const movieTitle = perf.movie.title.toLowerCase()
      const character = (perf.character || '').toLowerCase()
      
      let score = 0
      
      // Exact title match gets highest score
      if (movieTitle === query) {
        score += 100
      } else if (movieTitle.startsWith(query)) {
        score += 80
      } else if (movieTitle.includes(query)) {
        score += 60
      }
      
      // Character match
      if (character.includes(query)) {
        score += 40
      }
      
      // Year match
      if (perf.movie.year.toString().includes(query)) {
        score += 20
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
      const movieRatings = actor?.ratings?.filter((r: any) => r.movieId === perf.movieId) || []
      const ratingCount = movieRatings.length
      
      // Calculate variance for controversial sorting
      let variance = 0
      if (movieRatings.length > 1) {
        const scores = movieRatings.map((r: Rating) => {
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
  }, [filteredPerformances, actor])

  // Apply sorting to filtered performances
  const filteredAndRankedPerformances = useMemo(() => {
    let sorted = [...performancesWithStats]

    switch (sortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => a.movie.title.localeCompare(b.movie.title))
        break
      case 'year':
        sorted.sort((a, b) => b.movie.year - a.movie.year) // Newest first
        break
      case 'rating':
        sorted.sort((a, b) => {
          const aScore = a.averageScore || 0
          const bScore = b.averageScore || 0
          if (bScore !== aScore) {
            return bScore - aScore
          }
          return b.movie.year - a.movie.year
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
          return bScore - aScore
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
          return bCount - aCount
        })
        break
      case 'relevance':
        // If searching, sort by search score, otherwise by rating
        if (searchQuery.trim()) {
          sorted.sort((a, b) => {
            const aScore = (a as any).searchScore || 0
            const bScore = (b as any).searchScore || 0
            if (bScore !== aScore) {
              return bScore - aScore
            }
            return b.movie.year - a.movie.year
          })
        } else {
          // Default to rating when not searching
          sorted.sort((a, b) => {
            const aScore = a.averageScore || 0
            const bScore = b.averageScore || 0
            if (bScore !== aScore) {
              return bScore - aScore
            }
            return b.movie.year - a.movie.year
          })
        }
        break
      default:
        // Default to rating
        sorted.sort((a, b) => {
          const aScore = a.averageScore || 0
          const bScore = b.averageScore || 0
          if (bScore !== aScore) {
            return bScore - aScore
          }
          return b.movie.year - a.movie.year
        })
        break
    }

    return sorted
  }, [performancesWithStats, sortBy, searchQuery])

  const Layout = user ? SignedInLayout : HomeLayout

  const targetPerformance = useMemo(() => {
    return communityStats.highestRated || performances[0] || null
  }, [communityStats.highestRated, performances])

  const isTargetRated = useMemo(() => {
    return targetPerformance ? userRatedMovies.has(targetPerformance.movieId) : false
  }, [targetPerformance, userRatedMovies])

  // Handle 410 Gone for UUID routes
  if (is410) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h1 className="text-6xl font-bold text-white mb-4">410</h1>
            <h2 className="text-2xl font-bold text-white mb-4">Page Gone</h2>
            <p className="text-gray-400 mb-6">
              This URL format is no longer supported. Actor pages now use slug-based URLs.
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

  if (!actor) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Actor not found</h1>
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
              <div className="bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border border-white/10 rounded-[1.5rem] p-6 shadow-2xl backdrop-blur-2xl">
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
                      className="w-full px-4 py-2 rounded-full text-black text-sm font-bold tracking-wider transition-all duration-200 hover:scale-105"
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
              className="inline-flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 rounded-full border border-gray-600/50 text-gray-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Actor Info */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            {/* Actor headshot */}
            {actor.imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center mb-6"
              >
                {/* Portrait crop at 2:3 — matches TMDB photo shape, no aggressive squaring */}
                <div
                  className="relative overflow-hidden rounded-2xl"
                  style={{
                    width: 'clamp(140px, 30vw, 220px)',
                    aspectRatio: '2/3',
                    boxShadow: '0 0 60px rgba(255,215,0,0.22), 0 30px 80px rgba(0,0,0,0.7)',
                  }}
                >
                  <HeroActorPhoto
                    imageUrl={upgradeActorImageRes(actor.imageUrl)}
                    name={actor.name}
                  />
                </div>
              </motion.div>
            )}
            <h1 
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-6 sm:mb-8 text-white"
              style={{ 
                fontFamily: 'var(--font-cinzel), serif',
                textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                letterSpacing: '0.08em',
                lineHeight: '1.1',
              }}
            >
              {actor.name}
            </h1>

            {/* Primary CTA - Rate a Performance (scrolls to performance cards) */}
            {dedupedPerformances.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mb-8 sm:mb-10"
              >
                <button
                  type="button"
                  onClick={() => {
                    (document.getElementById('first-performance-card') ?? document.getElementById('performances-section'))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  className="px-8 py-4 sm:px-10 sm:py-5 rounded-full text-black text-base sm:text-lg font-bold tracking-wider transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                    color: 'black'
                  }}
                >
                  <FaStar className="w-5 h-5 sm:w-6 sm:h-6" />
                  Rate A Performance
                </button>
              </motion.div>
            )}

            {/* Subtitle with awards info if available - Only show if verified Oscar data exists */}
            {actor.awards && (() => {
              let awardsList: Award[] = []
              if (typeof actor.awards === 'string') {
                try {
                  awardsList = JSON.parse(actor.awards)
                } catch (e) {
                  awardsList = []
                }
              } else if (Array.isArray(actor.awards)) {
                awardsList = actor.awards
              }
              
              // Only show Oscar badge if we have verified Oscar data (result === 'won' and award name contains oscar)
              const hasVerifiedOscar = awardsList.some(a => {
                const awardName = (a.award || a.title || '').toLowerCase()
                const isOscar = awardName.includes('oscar') || awardName.includes('academy award')
                return isOscar && a.result === 'won'
              })
              
              return hasVerifiedOscar ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="text-lg sm:text-xl text-gray-400 mb-6"
                >
                  Oscar Winner • Known for intense transformations
                </motion.p>
              ) : null
            })()}
              
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

            {/* Community Stats - Adapted for low/high data */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
              className="mb-8"
            >
              {communityStats.ratedPerformancesCount >= 5 ? (
                // Show community score when we have decent data
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD700]" />
                    <div 
                      className="text-xs sm:text-sm uppercase tracking-wider font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Community Score
                    </div>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    <div 
                      className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontFamily: 'var(--font-geist-sans), sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {careerScore !== null ? `${(careerScore / 10).toFixed(1)}` : 'N/A'}
                    </div>
                    {careerScore !== null && (
                      <div 
                        className="text-xl sm:text-2xl lg:text-3xl font-bold opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        /10
                      </div>
                    )}
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        <span className="font-bold text-white">{communityStats.ratedPerformancesCount}</span> of <span className="font-bold text-white">{communityStats.totalPerformances}</span> performances rated
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        <span className="font-bold text-white">{communityStats.totalRatings}</span> {communityStats.totalRatings === 1 ? 'Rating' : 'Ratings'}
                      </span>
                    </div>
                    {communityStats.highestRated && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          Top: <Link href={getMovieUrl(communityStats.highestRated.movie)} prefetch onClick={() => startNavigation()} className="inline-flex items-center gap-1 font-bold text-white underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid transition-colors"><span>{communityStats.highestRated.movie.title}</span><ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden /></Link>
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Show "Building Profile" when we have limited data
                <div className="max-w-2xl mx-auto">
                  <div className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border border-white/10 backdrop-blur-2xl"
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
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                      <h3 
                        className="text-xl sm:text-2xl font-bold text-white"
                        style={{ 
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          letterSpacing: '0.02em',
                        }}
                      >
                        Profile Building
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-white mb-1"
                          style={{
                            fontFamily: 'var(--font-geist-sans), sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {communityStats.ratedPerformancesCount}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          of {communityStats.totalPerformances} rated
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-white mb-1"
                          style={{
                            fontFamily: 'var(--font-geist-sans), sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {communityStats.unratedPerformances}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Waiting for Ratings
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-white mb-1"
                          style={{
                            fontFamily: 'var(--font-geist-sans), sans-serif',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {communityStats.criticsCount}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Critics Contributing
                        </div>
                      </div>
                    </div>
                    {communityStats.highestRated && (
                      <div className="text-center pt-6 border-t border-white/10">
                        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400 mb-2">
                          <Trophy className="w-4 h-4 text-gray-400" />
                          Highest Rated So Far
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white mb-2">
                          <Link href={getMovieUrl(communityStats.highestRated.movie)} prefetch onClick={() => startNavigation()} className="inline-flex items-center gap-1 font-bold text-white underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid transition-colors"><span>{communityStats.highestRated.movie.title}</span><ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden /></Link>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                          <FaStar className="w-4 h-4 text-[#FFD700]" />
                          <span 
                            className="text-lg font-bold text-[#FFD700]"
                            style={{
                              fontFamily: 'var(--font-geist-sans), sans-serif',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {((communityStats.highestRated.averageScore || 0) / 10).toFixed(1)}/10
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Onboarding Card - Rate Your First Performance - Mini Performance Card Style */}
        {user && !userHasRatedActor && communityStats.highestRated && (
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
                Rate {actor.name}'s most iconic performance
              </p>
            </div>
            
            <div 
              className="relative p-6 sm:p-8 rounded-[2rem] border backdrop-blur-2xl overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(15, 15, 15, 0.90) 50%, rgba(0, 0, 0, 0.95) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: `
                  0 25px 70px -15px rgba(0, 0, 0, 0.9),
                  0 15px 40px -10px rgba(0, 0, 0, 0.7),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                `,
              }}
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-1">
                  {/* Top Row: Rating Badge and Year */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Score Pill - Top Left */}
                    <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
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
                    
                    {/* Movie Year - Top Right */}
                    <div className="text-[#a3a3a3] text-base font-medium">
                      {communityStats.highestRated.movie.year}
                    </div>
                  </div>
                  
                  {/* Social Proof - Rating Count in Bubble */}
                  {(() => {
                    const highestRatedMovieRatings = actor?.ratings?.filter((r: any) => r.movieId === communityStats.highestRated?.movieId) || []
                    const ratingCount = highestRatedMovieRatings.length
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

                  {/* Movie Title - internal link */}
                  <div className="mb-4">
                    <Link href={getMovieUrl(communityStats.highestRated.movie)} prefetch onClick={() => startNavigation()} className="inline-flex items-center gap-1.5 text-lg text-white font-semibold tracking-wide underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid transition-colors">
                      <span>{communityStats.highestRated.movie.title}</span>
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
                      className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer"
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

        {/* Awards Section - Only show if verified award data exists */}
        {actor.awards && (() => {
          // Parse awards if it's a string (JSON)
          let awardsList: Award[] = []
          if (typeof actor.awards === 'string') {
            try {
              awardsList = JSON.parse(actor.awards)
            } catch (e) {
              // If parsing fails, treat as empty
              awardsList = []
            }
          } else if (Array.isArray(actor.awards)) {
            awardsList = actor.awards
          }

          // Only show section if we have verified award data (not empty and has valid award info)
          if (awardsList.length === 0) return null
          
          // Filter to only show awards with verified data
          const verifiedAwards = awardsList.filter(a => 
            (a.award || a.title) && (a.result === 'won' || a.result === 'nominated')
          )
          
          if (verifiedAwards.length === 0) return null

          return (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16"
            >
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-6 h-6 text-gray-400" />
                <h2 
                  className="text-3xl sm:text-4xl font-bold text-white"
                  style={{ 
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                    letterSpacing: '0.02em',
                  }}
                >
                  Awards & Recognition
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {verifiedAwards.map((award, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.3 + index * 0.1 }}
                    className={`p-6 rounded-2xl border backdrop-blur-2xl ${
                      award.result === 'won' 
                        ? 'bg-gradient-to-br from-[#FFD700]/10 via-[#FFA500]/5 to-transparent border-[#FFD700]/30' 
                        : 'bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border-white/10'
                    }`}
                    style={{
                      boxShadow: award.result === 'won' 
                        ? `0 8px 32px rgba(255, 215, 0, 0.1), 0 0 0 1px rgba(255, 215, 0, 0.15)`
                        : `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        award.result === 'won' 
                          ? 'bg-[#FFD700]/20' 
                          : 'bg-blue-500/20'
                      }`}>
                        <Award className={`w-5 h-5 ${
                          award.result === 'won' 
                            ? 'text-[#FFD700]' 
                            : 'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {award.award || award.title || 'Award'}
                          </h3>
                          {award.result === 'won' && (
                            <span className="px-2 py-1 text-xs font-bold text-[#FFD700] bg-[#FFD700]/20 rounded-full">
                              Winner
                            </span>
                          )}
                          {award.result === 'nominated' && (
                            <span className="px-2 py-1 text-xs font-bold text-blue-400 bg-blue-500/20 rounded-full">
                              Nominated
                            </span>
                          )}
                        </div>
                        {award.category && (
                          <p className="text-sm text-gray-400 mb-1">
                            {award.category}
                          </p>
                        )}
                        {award.movie && (
                          <p className="text-sm text-gray-300 italic mb-1">
                            for <span className="text-[#FFD700]">{award.movie}</span>
                          </p>
                        )}
                        {award.year && (
                          <p className="text-xs text-gray-500">
                            {award.year}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        })()}

      {/* Performances Grid */}
      <div id="performances-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {dedupedPerformances.length > 0 ? (
          <>
            <motion.div
              id="filmography"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10 sm:mb-12"
            >
              {/* Mobile: Stacked layout, Desktop: Same line */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-4 lg:gap-6 mb-8 sm:mb-6">
                {/* Left side: Filmography heading and bubble */}
                <div className="flex items-center gap-3 sm:gap-4 flex-nowrap justify-center sm:justify-start flex-shrink-0 min-w-0">
                  <Film className="w-7 h-7 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                  <h2 
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center sm:text-left flex-shrink-0 min-w-0"
                    style={{ 
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Filmography
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
                        placeholder="Search for actors and movies..."
                        className="w-full pl-12 pr-10 py-4 sm:py-3 rounded-full bg-[#1a1a1a] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-all text-base"
                        style={{ borderRadius: '9999px' }}
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
                      className="flex items-center gap-2 px-4 py-4 sm:py-3 rounded-full bg-[#1a1a1a] border border-white/10 text-white hover:border-[#FFD700]/50 transition-all text-sm font-medium whitespace-nowrap"
                    >
                      <span>
                        {sortBy === 'relevance' ? (searchQuery.trim() ? 'Relevance' : 'Year') : 
                         sortBy === 'alphabetical' ? 'A-Z' :
                         sortBy === 'year' ? 'Year' : 
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
                        <div className="absolute right-0 mt-2 z-50 w-64 sm:w-56 rounded-[1.5rem] bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.3)] overflow-hidden">
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
                            Controversial 🔥
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('year')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'year' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Year (Newest)
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
                const character = performance.character || "—"
                const rating = performance.averageScore ? `${(performance.averageScore / 10).toFixed(1)}` : null
                const isHighestRated = sortBy === 'rating' && index === 0 && rating && parseFloat(rating) > 0
                const userScore = userRatingsMap.get(performance.movie.id)
                const hasUserRated = userRatedMovies.has(performance.movie.id)

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
                    {/* Premium Card - Clean & Cinematic - Matching performances page */}
                    {/* Highest Rated Card - Subtle distinction */}
                    <div 
                      className={`relative h-full p-8 sm:p-10 md:p-12 rounded-[2rem] border backdrop-blur-2xl overflow-hidden transition-all duration-300 ${
                        isHighestRated 
                          ? 'bg-gradient-to-br from-[#1a1a1a]/98 via-[#0f0f0f]/95 to-black/98 border-[#FFD700]/30 hover:shadow-[0_0_50px_rgba(255,215,0,0.15)]' 
                          : 'bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border-transparent hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]'
                      }`}
                      style={{
                        boxShadow: isHighestRated ? `
                          0 30px 80px -15px rgba(0, 0, 0, 0.95),
                          0 20px 50px -10px rgba(0, 0, 0, 0.8),
                          0 0 0 1px rgba(255, 215, 0, 0.15),
                          inset 0 1px 0 0 rgba(255, 215, 0, 0.2),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                        ` : `
                          0 25px 70px -15px rgba(0, 0, 0, 0.9),
                          0 15px 40px -10px rgba(0, 0, 0, 0.7),
                          0 0 0 1px rgba(255, 255, 255, 0.05),
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                        `,
                      }}
                    >
                      {/* Glow effect - Enhanced for highest rated */}
                      <div className={`absolute inset-0 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none ${
                        isHighestRated ? 'opacity-30' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                      </div>

                        {/* Content */}
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex-1">
                          {/* Movie Poster — shown at top of card */}
                          <div className="flex justify-center mb-6">
                            <MoviePoster
                              title={performance.movie.title}
                              posterUrl={(performance.movie as any).posterUrl}
                              size="lg"
                              loading="lazy"
                            />
                          </div>

                          {/* Top Row: Rating Badge and Year */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col items-start gap-2">
                              {hasUserRated && userScore ? (
                                // User has rated: show their score as the primary pill
                                <>
                                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                                    <FaStar className="w-5 h-5 text-[#FFD700]" />
                                    <span
                                      className="text-2xl sm:text-3xl font-bold text-[#FFD700] tabular-nums"
                                      style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                                    >
                                      {(userScore / 10).toFixed(1)}
                                    </span>
                                    <span className="text-xs font-semibold text-[#FFD700]/55 tracking-wide">YOU</span>
                                  </div>
                                  {rating && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8">
                                      <span className="text-xs text-[#71717a]">Avg</span>
                                      <span className="text-sm font-semibold text-white/70 tabular-nums">{rating}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                // Not yet rated: community score is primary
                                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                                  <FaStar className="w-5 h-5 text-[#FFD700]" />
                                  <span
                                    className="text-2xl sm:text-3xl font-bold text-[#FFD700] tabular-nums"
                                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                                  >
                                    {rating || 'N/A'}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Movie Year - Top Right */}
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[#a3a3a3] text-base font-medium">{performance.movie.year}</span>
                              {hasUserRated && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#FFD700]/60 px-2 py-0.5 rounded-full border border-[#FFD700]/20">
                                  ✓ Rated
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Social Proof - Rating Count in Bubble */}
                          {(performance as any).ratingCount > 0 && (
                            <div className="mb-4">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs text-gray-300">
                                  <span className="font-semibold text-white">{(performance as any).ratingCount}</span> {(performance as any).ratingCount === 1 ? 'critic' : 'critics'} rated
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Movie Title - internal link */}
                          <div className="mb-4">
                            <Link
                              href={getMovieUrl(performance.movie)}
                              prefetch
                              onClick={() => startNavigation()}
                              onMouseEnter={() => router.prefetch(getMovieUrl(performance.movie))}
                              className="inline-flex items-center gap-1.5 text-lg text-white font-semibold tracking-wide underline decoration-dotted decoration-2 underline-offset-2 hover:decoration-solid focus:outline-none focus:underline transition-colors"
                            >
                              <span>{performance.movie.title}</span>
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
                          <Link href={rateUrl}>
                            <button 
                              className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer"
                              style={{
                                background: userRatedMovies.has(performance.movie.id)
                                  ? 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)'
                                  : 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                                color: userRatedMovies.has(performance.movie.id) ? '#FFD700' : 'black',
                                border: userRatedMovies.has(performance.movie.id) ? '1px solid rgba(255, 215, 0, 0.3)' : 'none'
                              }}
                            >
                              <span className="flex items-center justify-center gap-2">
                                {userRatedMovies.has(performance.movie.id) ? 'Edit' : 'Rate'}
                                <FaStar className="w-4 h-4" />
                              </span>
                            </button>
                          </Link>
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
                <div className="inline-block p-8 rounded-[2rem] bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.3)]">
                  <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No performances found</h3>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? `No performances match "${searchQuery}"`
                      : "This actor doesn't have any performances yet."
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
            <div 
              className="relative mx-auto w-fit p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl"
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
              <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-xl text-gray-400">No performances found for this actor yet.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* SEO Section - Collapsed by default */}
      {actor.knownFor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10"
        >
          <button
            onClick={() => setSeoExpanded(!seoExpanded)}
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-gradient-to-br from-[#1a1a1a]/50 via-[#0f0f0f]/40 to-black/50 border border-white/5 hover:border-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-300">
                About {actor.name} performances
              </h3>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${seoExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {seoExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-6 text-gray-400 leading-relaxed">
                  {actor.knownFor && (
                    <p className="text-sm mb-4">
                      <span className="font-semibold text-gray-300">Known for:</span> {actor.knownFor}
                    </p>
                  )}
                  {communityStats.ratedPerformancesCount > 0 && (
                    <p className="text-sm">
                      The ActorRating community has rated {communityStats.ratedPerformancesCount} of {actor.name}'s performances, 
                      with {communityStats.totalRatings} total ratings from critics worldwide.
                      {communityStats.highestRated && ` Their highest-rated performance is ${communityStats.highestRated.movie.title}.`}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      </div>
    </Layout>
  )
}
