"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Star, Film, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUser } from '@supabase/auth-helpers-react'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { ActorRatingSection } from '@/components/rating/ActorRatingSection'
import { resolveCharacterDisplay } from '@/lib/character'
import { Rating } from '@/types'

interface Actor {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  birthDate?: string
  nationality?: string
  knownFor?: string
  performances: Performance[]
}

interface Performance {
  id: string
  roleName?: string | null
  character?: string | null
  actor: {
    id: string
    name: string
    imageUrl?: string
  }
  movie: {
    id: string
    title: string
    year: number
    director?: string
  }
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
  user: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export default function ActorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const actorId = params.id as string
  
  const [actor, setActor] = useState<Actor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRatings, setUserRatings] = useState<Array<{ id: string; movieId: string }>>([])
  const [expandedPerformances, setExpandedPerformances] = useState<Record<string, boolean>>({})
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [detailHeights, setDetailHeights] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)



  const togglePerformanceDetails = (movieId: string) => {
    console.log('Toggling performance details for:', movieId)
    setExpandedPerformances(prev => ({
      ...prev,
      [movieId]: !prev[movieId]
    }))
  }

  const setDetailRef = useCallback((movieId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      detailRefs.current[movieId] = el
      // Only measure if this performance is expanded
      if (expandedPerformances[movieId]) {
        const next = el.scrollHeight
        setDetailHeights(h => (h[movieId] === next ? h : { ...h, [movieId]: next }))
      }
    } else {
      delete detailRefs.current[movieId]
    }
  }, [expandedPerformances])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Re-measure heights when expanded state changes
    const timeoutId = setTimeout(() => {
      Object.keys(expandedPerformances).forEach((id) => {
        if (expandedPerformances[id]) {
          const el = detailRefs.current[id]
          if (el) {
            const next = el.scrollHeight
            setDetailHeights(h => (h[id] === next ? h : { ...h, [id]: next }))
          }
        }
      })
    }, 100) // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timeoutId)
  }, [expandedPerformances])

  useEffect(() => {
    const fetchActor = async () => {
      try {
        const response = await fetch(`/api/actors/${actorId}`)
        if (!response.ok) {
          throw new Error('Actor not found')
        }
        const data = await response.json()
        setActor(data)
      } catch (error) {
        console.error('Failed to fetch actor:', error)
        setError('Actor not found')
      } finally {
        setLoading(false)
      }
    }

    if (actorId) {
      fetchActor()
    }
  }, [actorId])

  // Fetch current user's ratings for this actor to determine button label (Edit vs Rate)
  useEffect(() => {
    const fetchUserRatings = async () => {
      try {
        const res = await fetch(`/api/actors/${actorId}/user-rating`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setUserRatings(Array.isArray(data) ? data : [])
        } else {
          setUserRatings([])
        }
      } catch {
        setUserRatings([])
      }
    }
    if (actorId && session) {
      fetchUserRatings()
    }
  }, [actorId, session])

  // Avoid layout flicker: we already handle loading state later; don't switch layouts mid-load

  const calculateAverageRating = (performance: Performance) => {
    return (
      performance.emotionalRangeDepth * 0.25 +
      performance.characterBelievability * 0.25 +
      performance.technicalSkill * 0.20 +
      performance.screenPresence * 0.15 +
      performance.chemistryInteraction * 0.15
    )
  }

  // Deduplicate performances by movie (prefer entries with a non-empty character; otherwise most recent)
  const dedupedPerformances = useMemo(() => {
    if (!actor?.performances) return [] as Performance[]
    const hasComment = (c?: string) => !!c && c.trim().length > 0
    const byMovie: Record<string, Performance> = {}
    for (const perf of actor.performances) {
      const key = perf.movie.id
      const existing = byMovie[key]
      if (!existing) {
        byMovie[key] = perf
        continue
      }
      const pickNew = (!hasComment(existing.comment) && hasComment(perf.comment))
        || (hasComment(existing.comment) && hasComment(perf.comment)
          ? new Date(perf.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
          : false)
      if (pickNew) byMovie[key] = perf
    }
    return Object.values(byMovie)
  }, [actor?.performances])

  const performanceCount = dedupedPerformances.length

  // Pre-calculate criteria data from ratings to avoid heavy calculations during render
  const performanceCriteriaData = useMemo(() => {
    const ratings = (actor as Actor & { ratings?: Rating[] })?.ratings as Array<{
      movieId: string
      emotionalRangeDepth: number
      characterBelievability: number
      technicalSkill: number
      screenPresence: number
      chemistryInteraction: number
    }> | undefined

    if (!ratings || ratings.length === 0) return new Map()

    const byMovie = new Map<string, typeof ratings>()
    for (const r of ratings) {
      if (!byMovie.has(r.movieId)) byMovie.set(r.movieId, [])
      byMovie.get(r.movieId)!.push(r)
    }

    const criteriaMap = new Map()
    for (const [movieId, list] of byMovie) {
      const ratingCount = list.length
      const sums = list.reduce((acc, r) => ({
        emotionalRangeDepth: acc.emotionalRangeDepth + r.emotionalRangeDepth,
        characterBelievability: acc.characterBelievability + r.characterBelievability,
        technicalSkill: acc.technicalSkill + r.technicalSkill,
        screenPresence: acc.screenPresence + r.screenPresence,
        chemistryInteraction: acc.chemistryInteraction + r.chemistryInteraction
      }), {
        emotionalRangeDepth: 0,
        characterBelievability: 0,
        technicalSkill: 0,
        screenPresence: 0,
        chemistryInteraction: 0
      })

      const safeDiv = (num: number, den: number) => (den > 0 ? num / den : 0)
      const criteria = [
        { key: 'emotionalRangeDepth', label: 'Emotional Range', value: safeDiv(sums.emotionalRangeDepth, ratingCount) },
        { key: 'characterBelievability', label: 'Believability', value: safeDiv(sums.characterBelievability, ratingCount) },
        { key: 'technicalSkill', label: 'Technical Skill', value: safeDiv(sums.technicalSkill, ratingCount) },
        { key: 'screenPresence', label: 'Screen Presence', value: safeDiv(sums.screenPresence, ratingCount) },
        { key: 'chemistryInteraction', label: 'Chemistry', value: safeDiv(sums.chemistryInteraction, ratingCount) }
      ]

      criteriaMap.set(movieId, { criteria, ratingCount })
    }

    return criteriaMap
  }, [actor])

  // Calculate highest rated performance
  const highestRatedPerformance: { movieId: string, score: number, movie?: { title: string, year: number } } | null = useMemo(() => {
    const ratings = (actor as Actor & { ratings?: Rating[] })?.ratings as Array<{
      movieId: string
      weightedScore?: number | null
      emotionalRangeDepth: number
      characterBelievability: number
      technicalSkill: number
      screenPresence: number
      chemistryInteraction: number
    }> | undefined

    if (!ratings || ratings.length === 0) return null

    // Group ratings by movie and calculate average for each
    const movieRatings: Record<string, {
      movieId: string
      ratings: Array<{
        weightedScore?: number | null
        emotionalRangeDepth: number
        characterBelievability: number
        technicalSkill: number
        screenPresence: number
        chemistryInteraction: number
      }>
      averageScore: number
      movie?: { title: string, year: number }
    }> = {}

    ratings.forEach(rating => {
      if (!movieRatings[rating.movieId]) {
        movieRatings[rating.movieId] = {
          movieId: rating.movieId,
          ratings: [],
          averageScore: 0
        }
      }
      movieRatings[rating.movieId].ratings.push(rating)
    })

    // Calculate average for each movie and find the highest
    let highest: { movieId: string, score: number, movie?: { title: string, year: number } } | null = null

    Object.values(movieRatings).forEach(movieData => {
      const sum = movieData.ratings.reduce((acc, r) => {
        const hasWeighted = typeof r.weightedScore === 'number' && !Number.isNaN(r.weightedScore as number)
        const score = hasWeighted
          ? (r.weightedScore as number)
          : (
              (r.emotionalRangeDepth +
                r.characterBelievability +
                r.technicalSkill +
                r.screenPresence +
                r.chemistryInteraction) / 5
            )
        return acc + score
      }, 0)
      const average = sum / movieData.ratings.length

      // Find movie details from dedupedPerformances
      const movieDetails = dedupedPerformances.find(p => p.movie.id === movieData.movieId)?.movie

      if (!highest || average > highest.score) {
        highest = {
          movieId: movieData.movieId,
          score: average,
          movie: movieDetails
        }
      }
    })

    return highest
  }, [actor, dedupedPerformances])

  // Sort performances chronologically (oldest first)
  const chronologicalPerformances = useMemo(() => {
    return [...dedupedPerformances].sort((a, b) => a.movie.year - b.movie.year)
  }, [dedupedPerformances])

  // Average across ratings table if available; falls back to deduped performances
  const averageActorRating = useMemo(() => {
    const ratings = (actor as Actor & { ratings?: Rating[] })?.ratings as Array<{
      weightedScore?: number | null
      emotionalRangeDepth: number
      characterBelievability: number
      technicalSkill: number
      screenPresence: number
      chemistryInteraction: number
    }> | undefined

    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => {
        const hasWeighted = typeof r.weightedScore === 'number' && !Number.isNaN(r.weightedScore as number)
        const score = hasWeighted
          ? (r.weightedScore as number)
          : (
              (r.emotionalRangeDepth +
                r.characterBelievability +
                r.technicalSkill +
                r.screenPresence +
                r.chemistryInteraction) / 5
            )
        return acc + score
      }, 0)
      return sum / ratings.length
    }

    if (dedupedPerformances.length === 0) return 0
    const sumPerf = dedupedPerformances.reduce((acc, p) => acc + calculateAverageRating(p), 0)
    return sumPerf / dedupedPerformances.length
  }, [actor, dedupedPerformances])

  // Calculate career statistics for each criteria
  const careerStats = useMemo(() => {
    const ratings = (actor as Actor & { ratings?: Rating[] })?.ratings as Array<{
      weightedScore?: number | null
      emotionalRangeDepth: number
      characterBelievability: number
      technicalSkill: number
      screenPresence: number
      chemistryInteraction: number
    }> | undefined

    if (!ratings || ratings.length === 0) {
      return {
        emotionalRangeDepth: 0,
        characterBelievability: 0,
        technicalSkill: 0,
        screenPresence: 0,
        chemistryInteraction: 0,
        total: 0
      }
    }

    const sums = ratings.reduce((acc, r) => ({
      emotionalRangeDepth: acc.emotionalRangeDepth + r.emotionalRangeDepth,
      characterBelievability: acc.characterBelievability + r.characterBelievability,
      technicalSkill: acc.technicalSkill + r.technicalSkill,
      screenPresence: acc.screenPresence + r.screenPresence,
      chemistryInteraction: acc.chemistryInteraction + r.chemistryInteraction
    }), {
      emotionalRangeDepth: 0,
      characterBelievability: 0,
      technicalSkill: 0,
      screenPresence: 0,
      chemistryInteraction: 0
    })

    const count = ratings.length
    return {
      emotionalRangeDepth: sums.emotionalRangeDepth / count,
      characterBelievability: sums.characterBelievability / count,
      technicalSkill: sums.technicalSkill / count,
      screenPresence: sums.screenPresence / count,
      chemistryInteraction: sums.chemistryInteraction / count,
      total: (sums.emotionalRangeDepth + sums.characterBelievability + sums.technicalSkill + sums.screenPresence + sums.chemistryInteraction) / (count * 5)
    }
  }, [actor])

  if (loading || status === "loading") {
    const LoadingContent = () => (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-4 max-w-md"></div>
            <div className="h-4 bg-gray-700 rounded mb-8 max-w-lg"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )

    return session ? (
      <SignedInLayout>
        <LoadingContent />
      </SignedInLayout>
    ) : (
      <HomeLayout>
        <LoadingContent />
      </HomeLayout>
    )
  }

  if (error || !actor) {
    const ErrorContent = () => (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Actor Not Found</h1>
            <p className="text-gray-400 mb-8">
              The actor you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild variant="premium">
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )

    return session ? (
      <SignedInLayout>
        <ErrorContent />
      </SignedInLayout>
    ) : (
      <HomeLayout>
        <ErrorContent />
      </HomeLayout>
    )
  }

  // Using the average based on ratings when present
  const averageRating = averageActorRating

  const actorContent = (
    <div className="min-h-screen" suppressHydrationWarning>
      <div className="relative overflow-hidden">
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Button asChild variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200">
              <Link href={session ? "/search" : "/"} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {session ? "Back to Search" : "Back to Home"}
              </Link>
            </Button>
          </motion.div>

          {/* Performance Count Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-full">
              <Film className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 font-medium text-sm">
                {performanceCount} performance{performanceCount !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
          
          {/* Main Actor Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-secondary rounded-3xl border border-border p-6 sm:p-8 mb-12 shadow-lg"
          >
            <div className="flex flex-col lg:flex-row items-stretch gap-8">
              {/* Actor Image */}
              {actor.imageUrl && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden bg-muted p-1 shadow-xl mx-auto lg:mx-0"
                >
                  <img 
                    src={actor.imageUrl} 
                    alt={actor.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </motion.div>
              )}
              
              <div className="flex-1 text-center lg:text-left">
                {/* Actor Name */}
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-6 inline-block leading-snug pb-1"
                >
                  {actor.name}
                </motion.h1>

                {/* Career Rating - Hero Style */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl backdrop-blur-sm">
                    <Star className="w-8 h-8 text-yellow-400 fill-current drop-shadow-lg" />
                    <div className="text-left">
                      <div className="text-2xl lg:text-3xl font-bold text-yellow-400">
                        {averageRating.toFixed(1)}/100
                      </div>
                      <div className="text-sm text-yellow-300/80 font-medium">
                        Career Rating
                      </div>
                    </div>
                  </div>

                  {/* Highest Performance Badge */}
                  {highestRatedPerformance && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-4"
                    >
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full backdrop-blur-sm">
                        <Award className="w-4 h-4 text-green-400" />
                        <span className="text-green-300 font-medium text-sm">
                          Best: {(highestRatedPerformance as any).movie?.title || 'Unknown Movie'} ({(highestRatedPerformance as any).score.toFixed(1)})
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
                
                {/* Actor Info Pills */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-wrap justify-center lg:justify-start items-center gap-3 mb-6"
                >
                  {actor.nationality && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-full backdrop-blur-sm">
                      <Award className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300 text-sm font-medium">{actor.nationality}</span>
                    </div>
                  )}
                  {actor.birthDate && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-full backdrop-blur-sm">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300 text-sm font-medium">Born {actor.birthDate.split('-')[0]}</span>
                    </div>
                  )}
                </motion.div>

                {/* Bio */}
                {actor.bio && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-gray-300 text-base leading-relaxed mb-4 max-w-2xl"
                  >
                    {actor.bio}
                  </motion.p>
                )}

                {/* Known For */}
                {actor.knownFor && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="text-gray-400 text-sm"
                  >
                    <span className="font-semibold text-gray-200">Known for:</span> {actor.knownFor}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Career Statistics Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-secondary rounded-3xl border border-border p-4 sm:p-8 mb-12 shadow-lg"
          >
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4 sm:mb-6">
              Career Performance Breakdown
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
              {[
                { key: 'emotionalRangeDepth', label: 'Emotional Range', value: careerStats.emotionalRangeDepth },
                { key: 'characterBelievability', label: 'Believability', value: careerStats.characterBelievability },
                { key: 'technicalSkill', label: 'Technical Skill', value: careerStats.technicalSkill },
                { key: 'screenPresence', label: 'Screen Presence', value: careerStats.screenPresence },
                { key: 'chemistryInteraction', label: 'Chemistry', value: careerStats.chemistryInteraction }
              ].map((stat, index) => (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + index * 0.1 }}
                  className="bg-muted rounded-lg sm:rounded-xl p-2 sm:p-4 border border-border"
                >
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl font-bold text-yellow-400 mb-1">
                      {stat.value.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-300 font-medium leading-tight">
                      {stat.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Performances Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            Filmography
          </h2>
          <p className="text-gray-400">Chronological order • {performanceCount} performances</p>
        </motion.div>
        
        {actor.performances.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="text-center py-16 bg-secondary rounded-3xl border border-border"
          >
            <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-6">
              No performances have been rated for this actor yet.
            </p>
            <Button asChild variant="premium" size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/rate">
                Rate a Performance
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {chronologicalPerformances.map((performance, index) => {
              const ratings = (actor as Actor & { ratings?: Rating[] })?.ratings as Array<{
                movieId: string
                weightedScore?: number | null
                emotionalRangeDepth: number
                characterBelievability: number
                technicalSkill: number
                screenPresence: number
                chemistryInteraction: number
              }> | undefined

              const ratingsForThisMovie = (ratings || []).filter(r => r.movieId === performance.movie.id)
              const ratingCount = ratingsForThisMovie.length
              const averageRating = ratingCount > 0
                ? ratingsForThisMovie.reduce((sum, r) => {
                    const hasWeighted = typeof r.weightedScore === 'number' && !Number.isNaN(r.weightedScore as number)
                    const score = hasWeighted
                      ? (r.weightedScore as number)
                      : (
                          (r.emotionalRangeDepth +
                            r.characterBelievability +
                            r.technicalSkill +
                            r.screenPresence +
                            r.chemistryInteraction) / 5
                        )
                    return sum + score
                  }, 0) / ratingCount
                : null

              const isHighestRated = highestRatedPerformance && 
                (highestRatedPerformance as any).movieId === performance.movie.id

              return (
                <div
                  key={`performance-${performance.id}`}
                  className={`group relative bg-secondary rounded-2xl border transition-all duration-500 md:hover:scale-[1.02] md:hover:shadow-xl ${
                    isHighestRated 
                      ? 'border-yellow-500 bg-yellow-900/20' 
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {/* Background glow for highest rated */}
                  {isHighestRated && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-2xl blur-xl"></div>
                  )}
                  
                  {/* Crown icon for highest rated */}
                  {isHighestRated && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="relative p-4 sm:p-6 sm:min-h-[120px]">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Movie Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center pt-2 sm:pt-3">
                        {/* Title and Year Row */}
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className={`font-bold text-white group-hover:text-purple-400 transition-colors flex-shrink-0 ${
                            isHighestRated ? 'text-3xl sm:text-4xl' : 'text-2xl'
                          }`}>
                            <Link href={`/movies/${performance.movie.id}`} className="hover:underline">
                              {performance.movie.title}
                            </Link>
                          </h3>
                          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span className={`text-gray-300 font-medium ${isHighestRated ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>{performance.movie.year}</span>
                          </div>
                        </div>

                        {/* Character line in purple bubble (use unified resolver) */}
                        {(() => {
                          const display = resolveCharacterDisplay({
                            character: (performance as any).character,
                            roleName: performance.roleName as any,
                            comment: performance.comment as any,
                          })
                          return (
                            <div className="mb-3">
                              <div className="inline-flex w-full sm:w-auto items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 justify-center sm:justify-start">
                                <span className={`font-medium text-purple-300 ${isHighestRated ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>Character: {display}</span>
                              </div>
                            </div>
                          )
                        })()}

                        {/* (Director line removed to avoid duplication) */}
                      </div>

                      {/* Rating and Action */}
                      <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
                        {/* Rating Badge */}
                        <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                          <div className="mx-auto sm:mx-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
                            <Star className="w-5 h-5 text-yellow-400 fill-current" />
                            <div className="text-center">
                              {averageRating !== null ? (
                                <>
                                  <div className="text-lg font-bold text-yellow-400">{averageRating.toFixed(1)}</div>
                                  <div className="text-xs text-yellow-300/80">{ratingCount} rating{ratingCount !== 1 ? 's' : ''}</div>
                                </>
                              ) : (
                                <div className="text-sm font-medium text-gray-400">Not rated</div>
                              )}
                            </div>
                          </div>

                          {/* See Details Button */}
                          {averageRating !== null && (
                            <div
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                togglePerformanceDetails(performance.movie.id)
                                return false;
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  togglePerformanceDetails(performance.movie.id)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className="flex items-center gap-1 px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-all duration-200 hover:bg-gray-700/50 rounded-md cursor-pointer"
                            >
                              See Details
                              {expandedPerformances[performance.movie.id] ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="w-full flex justify-center sm:justify-start">
                          <Button asChild variant="premium" size="sm">
                            {(() => {
                              const userRating = userRatings.find(r => r.movieId === performance.movie.id)
                              const userHasRated = !!userRating
                              const ctaText = userHasRated ? 'Edit Rating' : (ratingCount > 0 ? 'Rate Performance' : 'Be First to Rate')
                              const href = userHasRated 
                                ? `/rate?rating=${userRating.id}` 
                                : `/rate?actor=${actor.id}&movie=${performance.movie.id}`
                              return (
                                <Link href={href} className="flex items-center gap-2">
                                  <Star className="w-4 h-4" />
                                  {ctaText}
                                </Link>
                              )
                            })()}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Rating Details */}
                    {averageRating !== null && expandedPerformances[performance.movie.id] && (
                      <div 
                        className="mt-2 border-t border-gray-600/30 pointer-events-none"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <div ref={setDetailRef(performance.movie.id)} className="pt-4 pointer-events-auto" style={{ display: 'block' }}>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">Rating Breakdown</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {(() => {
                              const criteriaData = performanceCriteriaData.get(performance.movie.id)
                              if (!criteriaData) return null
                              
                              return criteriaData.criteria.map((criterion: { key: string; label: string; value: number; color: string }) => (
                                <div 
                                  key={criterion.key} 
                                  className="bg-muted rounded-lg p-3 text-center"
                                >
                                  <div className="text-lg font-bold text-yellow-400 mb-1">
                                    {criterion.value.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-400 font-medium">
                                    {criterion.label}
                                  </div>
                                </div>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Your Ratings Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <div className="bg-secondary rounded-3xl border border-border p-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
              Your Ratings for {actor.name}
            </h3>
            <ActorRatingSection actorId={actor.id} actorName={actor.name} />
          </div>
        </motion.div>
      </div>
    </div>
  )

  return session ? (
    <SignedInLayout>
      {actorContent}
    </SignedInLayout>
  ) : (
    <HomeLayout>
      {actorContent}
    </HomeLayout>
  )
} 