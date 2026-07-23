"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Film, ChevronDown, Award, User, TrendingUp, Users, Trophy, ChevronRight, ArrowRight, Heart, Target, Zap, Eye } from 'lucide-react'
import { FaStar } from 'react-icons/fa'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/components/providers/SessionProvider'
import { useNavigationProgress } from '@/components/providers/NavigationProgressProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { getRateUrl, getMovieUrl } from '@/lib/slugHelper'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { MoviePoster } from '@/components/ui/MoviePoster'
import { upgradeActorImageRes } from '@/lib/tmdb'
import { resolveCharacterDisplay } from '@/lib/character'
import { PerformanceCardScoreSplit } from '@/components/rating/PerformanceCardScoreSplit'
import { RateOrComingSoonButton } from '@/components/rating/RateOrComingSoonButton'
import { isMovieComingSoon } from '@/lib/movie-release'

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
  seededAggregateScore?: number | null
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
    releaseDate?: string | Date | null
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

/** Small tile on movie poster — container sizes to image aspect ratio (max bounds only). */
function formatBirthYear(birthDate: string | undefined | null): string | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  return String(d.getFullYear())
}

const CAREER_CRITERIA = [
  { key: 'emotionalRangeDepth' as const, label: 'Emotional Range & Depth', shortLabel: 'Emotional Range', Icon: Heart },
  { key: 'characterBelievability' as const, label: 'Character Believability', shortLabel: 'Believability', Icon: Target },
  { key: 'technicalSkill' as const, label: 'Technical Skill & Authenticity', shortLabel: 'Performance Quality', Icon: Zap },
  { key: 'screenPresence' as const, label: 'Screen Presence & Impact', shortLabel: 'Screen Presence', Icon: Eye },
  { key: 'chemistryInteraction' as const, label: 'Chemistry & Interaction', shortLabel: 'Chemistry', Icon: Users },
]

function FilmographyPosterBadge({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false)
  const src = upgradeActorImageRes(imageUrl)
  const showImg = Boolean(src) && !failed
  return (
    <div
      className="inline-flex flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-[#262626] bg-[#161616] shadow-[0_10px_28px_rgba(0,0,0,0.75)]"
      aria-hidden
    >
      {showImg ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          className="block h-auto w-auto max-h-14 max-w-[3.75rem] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-10 min-w-10 items-center justify-center px-2 bg-[#161616]">
          <span className="text-sm font-bold text-[#FFD700]/75">{name.charAt(0)}</span>
        </div>
      )}
    </div>
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
  const [bioExpanded, setBioExpanded] = useState(false)
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

  useEffect(() => {
    setBioExpanded(false)
  }, [actorId])

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

  /** Average of TMDB-seeded scores across filmography (0–10). Never merge with community. */
  const criticAggregateScore = useMemo(() => {
    const seeded = dedupedPerformances
      .map((p) => p.seededAggregateScore)
      .filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
    if (seeded.length === 0) return null
    return seeded.reduce((sum, s) => sum + s, 0) / seeded.length
  }, [dedupedPerformances])

  const birthYear = useMemo(() => formatBirthYear(actor?.birthDate ?? null), [actor?.birthDate])

  const careerCriteriaAverages = useMemo(() => {
    const ratings = actor?.ratings || []
    if (ratings.length === 0) return null

    const averages = CAREER_CRITERIA.map(({ key, label, shortLabel, Icon }) => {
      const values = ratings
        .map((r) => r[key])
        .filter((s): s is number => typeof s === 'number' && s > 0)
      if (values.length === 0) return null
      const avg = values.reduce((sum, s) => sum + s, 0) / values.length
      return { key, label, shortLabel, Icon, avg }
    }).filter((row): row is NonNullable<typeof row> => row !== null)

    return averages.length > 0 ? averages : null
  }, [actor?.ratings])

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
                  className="relative overflow-hidden rounded-md ring-1 ring-white/[0.08]"
                  style={{
                    width: 'clamp(140px, 30vw, 220px)',
                    aspectRatio: '2/3',
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
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8 text-white tracking-tight leading-[1.15]"
              style={{
                fontFamily:
                  'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
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
                  className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-md text-black text-[15px] sm:text-base font-bold transition-transform duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 mx-auto min-h-[44px]"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                    color: 'black'
                  }}
                >
                  <FaStar className="w-4 h-4" />
                  Rate a performance
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

            {(birthYear || actor.nationality?.trim()) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="text-base sm:text-lg text-gray-400 mb-4"
              >
                {[birthYear ? `Born ${birthYear}` : null, actor.nationality?.trim() || null]
                  .filter(Boolean)
                  .join(' • ')}
              </motion.p>
            )}

            {actor.bio?.trim() && (() => {
              const bioText = actor.bio.trim()
              const bioIsLong = bioText.length > 200
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="max-w-2xl mx-auto mb-6 sm:mb-8 px-1 text-left sm:text-center"
                >
                  <p
                    className={`text-base sm:text-lg text-gray-400 leading-relaxed ${
                      bioIsLong && !bioExpanded ? 'line-clamp-3' : ''
                    }`}
                  >
                    {bioText}
                  </p>
                  {bioIsLong && (
                    <button
                      type="button"
                      onClick={() => setBioExpanded((v) => !v)}
                      className="mt-2 text-sm font-medium text-[#FFD700] hover:text-[#FFE55C] transition-colors"
                      aria-expanded={bioExpanded}
                    >
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </motion.div>
              )
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
                  <div
                    className={`rounded-md p-4 ${
                      careerScore != null && communityStats.totalRatings > 0
                        ? 'border border-[#FFD700]/30 bg-[#FFD700]/10'
                        : 'border border-white/[0.06] bg-transparent'
                    }`}
                  >
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 text-[#FFD700]/80">
                      Community
                    </p>
                    {careerScore != null && communityStats.totalRatings > 0 ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-4xl sm:text-5xl font-black tabular-nums text-[#FFD700] leading-none"
                            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                          >
                            {(careerScore / 10).toFixed(1)}
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
                      Avg TMDB film scores across their roles — not ActorRating users
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap text-sm sm:text-base mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      <span className="font-bold text-white">{communityStats.ratedPerformancesCount}</span> of <span className="font-bold text-white">{communityStats.totalPerformances}</span> performances rated
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
              </div>
            </motion.div>

            {/* Five-criteria career breakdown */}
            {careerCriteriaAverages && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0, ease: 'easeOut' }}
                className="mb-8 max-w-3xl mx-auto w-full"
              >
                {communityStats.ratedPerformancesCount >= 5 ? (
                  <>
                    <h3
                      className="text-lg sm:text-xl font-bold text-white text-center mb-6"
                      style={{
                        fontFamily: 'var(--font-geist-sans), sans-serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      How the community rates {actor.name}&apos;s performances
                    </h3>
                    <div className="space-y-3">
                      {careerCriteriaAverages.map(({ key, label, shortLabel, Icon, avg }, index) => {
                        const pct = Math.min(100, Math.max(0, avg))
                        const display10 = (avg / 10).toFixed(1)
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 1.05 + index * 0.06 }}
                            className="rounded-md border border-white/[0.08] bg-[#141414] px-4 py-3 sm:px-5 sm:py-4"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 rounded-md bg-[#FFD700]/10 flex-shrink-0">
                                  <Icon className="w-4 h-4 text-[#FFD700]" />
                                </div>
                                <span className="text-sm sm:text-base font-medium text-gray-200 truncate" title={label}>
                                  <span className="sm:hidden">{shortLabel}</span>
                                  <span className="hidden sm:inline">{label}</span>
                                </span>
                              </div>
                              <span
                                className="text-lg sm:text-xl font-bold text-[#FFD700] tabular-nums flex-shrink-0"
                                style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                              >
                                {display10}
                                <span className="text-sm font-semibold text-[#FFD700]/60">/10</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: 'linear-gradient(90deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                                }}
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div
                    className="p-5 sm:p-6 rounded-md border border-white/[0.08] bg-[#141414] text-center"
                  >
                    <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-gray-400">
                      Community criteria breakdown is still building — more ratings needed across{' '}
                      {actor.name}&apos;s performances.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
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
            
            <div className="relative p-5 sm:p-6 rounded-md border border-white/[0.08] bg-[#141414] overflow-hidden">
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-1">
                  {/* Top Row: Rating Badge and Year */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Score Pill - Top Left */}
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
                  className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                  style={{ 
                    fontFamily: 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
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
                    className={`p-5 rounded-md border ${
                      award.result === 'won' 
                        ? 'bg-[#FFD700]/10 border-[#FFD700]/30' 
                        : 'bg-[#141414] border-white/[0.08]'
                    }`}
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
                    className="text-2xl sm:text-3xl font-bold text-white text-center sm:text-left flex-shrink-0 min-w-0 tracking-tight"
                    style={{ 
                      fontFamily: 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
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
                        placeholder="Search for movie name"
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
                        <div className="absolute right-0 mt-2 z-50 w-64 sm:w-56 rounded-md bg-[#1a1a1a] border border-white/[0.08] overflow-hidden shadow-lg">
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
                const character = resolveCharacterDisplay(performance) || "—"
                const communityAvg10 = performance.averageScore != null ? performance.averageScore / 10 : null
                const communityCount = (performance as any).ratingCount || 0
                const isHighestRated =
                  sortBy === 'rating' &&
                  index === 0 &&
                  communityAvg10 != null &&
                  communityAvg10 > 0
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
                      className={`relative h-full p-5 sm:p-6 rounded-md border overflow-hidden transition-colors duration-200 ${
                        isHighestRated
                          ? 'bg-[#141414] border-[#FFD700]/35'
                          : 'bg-[#141414] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {/* Content */}
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex-1">
                          {/* Movie poster + actor badge: bottom-right, minimal overlap with poster */}
                          <div className="relative flex justify-center mb-6 w-fit max-w-full mx-auto overflow-visible">
                            <MoviePoster
                              title={performance.movie.title}
                              posterUrl={(performance.movie as any).posterUrl}
                              size="lg"
                              loading="lazy"
                              rounded="rounded-md"
                            />
                            <div className="absolute -bottom-3 -right-3 z-10 pointer-events-none">
                              <FilmographyPosterBadge name={actor.name} imageUrl={actor.imageUrl} />
                            </div>
                          </div>

                          {/* Scores: Critic Aggregate vs Community (+ YOU if rated) */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <PerformanceCardScoreSplit
                              seededAggregateScore={performance.seededAggregateScore}
                              communityAvg10={communityAvg10}
                              communityRatingCount={communityCount}
                              userScore10={hasUserRated && userScore != null ? userScore / 10 : null}
                            />
                            <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                              <span className="text-[#a3a3a3] text-base font-medium">{performance.movie.year}</span>
                              {hasUserRated && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#FFD700]/60 px-2 py-0.5 rounded-full border border-[#FFD700]/20">
                                  ✓ Rated
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Movie Title - internal link */}
                          <div className={performance.movie.director?.trim() ? 'mb-2' : 'mb-4'}>
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

                          {performance.movie.director?.trim() && (
                            <p className="text-sm text-gray-400 mb-4">
                              Directed by {performance.movie.director.trim()}
                            </p>
                          )}

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
                            comingSoon={isMovieComingSoon(performance.movie)}
                            alreadyRated={userRatedMovies.has(performance.movie.id)}
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
            <div className="relative mx-auto w-fit p-8 sm:p-10 rounded-md border border-white/[0.08] bg-[#141414]">
              <Film className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-base text-zinc-500">No performances found for this actor yet.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* About section — always visible for content quality */}
      {(actor.knownFor || communityStats.ratedPerformancesCount > 0) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-300">
              About {actor.name}
            </h2>
          </div>
          <div className="text-gray-400 leading-relaxed space-y-3">
            {actor.knownFor && (
              <p className="text-sm">
                <span className="font-semibold text-gray-300">Known for:</span> {actor.knownFor}
              </p>
            )}
            {communityStats.ratedPerformancesCount > 0 && (
              <p className="text-sm">
                The ActorRating community has rated {communityStats.ratedPerformancesCount} of {actor.name}&apos;s performances,
                with {communityStats.totalRatings} total {communityStats.totalRatings === 1 ? 'rating' : 'ratings'} from critics worldwide.
                {communityStats.highestRated && ` Their highest-rated performance is ${communityStats.highestRated.movie.title}.`}
              </p>
            )}
          </div>
        </div>
      )}

      </div>
    </Layout>
  )
}
