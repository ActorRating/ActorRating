"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Star, Film, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { Rating as RatingType } from '@/types'
import { Button } from '@/components/ui/Button'
import { useUser } from '@supabase/auth-helpers-react'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { MovieRatingSection } from '@/components/rating/MovieRatingSection'
import { resolveCharacterDisplay } from '@/lib/character'

interface Movie {
  id: string
  title: string
  year: number
  director?: string
  genre?: string
  overview?: string
  performances: Performance[]
  ratings?: RatingType[]
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

export default function MovieDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const movieId = params.id as string
  
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRatings, setUserRatings] = useState<Array<{ id: string; actor: { id: string } }>>([])
  const [expandedActors, setExpandedActors] = useState<Record<string, boolean>>({})
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [detailHeights, setDetailHeights] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)

  const setDetailRef = (actorId: string) => (el: HTMLDivElement | null) => {
    detailRefs.current[actorId] = el
    if (el) {
      const h = el.scrollHeight
      setDetailHeights(prev => (prev[actorId] === h ? prev : { ...prev, [actorId]: h }))
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const response = await fetch(`/api/movies/${movieId}`, { cache: 'no-store' })
        let data: any = null
        try {
          data = await response.json()
        } catch (_) {
          // ignore parse errors; handled below if not ok
        }
        if (!response.ok) {
          const message = data?.error || (response.status === 404 ? 'Movie not found' : 'Failed to fetch movie')
          setError(message)
          return
        }
        setMovie(data)
      } catch (error) {
        console.error('Failed to fetch movie:', error)
        setError('Movie not found')
      } finally {
        setLoading(false)
      }
    }

    if (movieId) {
      fetchMovie()
    }
  }, [movieId])

  // Fetch current user's ratings for this movie to determine button label (Edit vs Rate)
  useEffect(() => {
    const fetchUserRatings = async () => {
      try {
        const res = await fetch(`/api/movies/${movieId}/user-rating`, { cache: 'no-store' })
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
    if (movieId && session) {
      fetchUserRatings()
    }
  }, [movieId, session])

  // Avoid layout flicker: wait until auth status resolves before choosing layout
  if (status === 'loading') {
    return null
  }

  const calculateAverageFromPerformance = (performance: Performance) => (
    performance.emotionalRangeDepth * 0.25 +
    performance.characterBelievability * 0.25 +
    performance.technicalSkill * 0.20 +
    performance.screenPresence * 0.15 +
    performance.chemistryInteraction * 0.15
  )

  // Deduplicate by actor and prefer entries with a non-empty character comment
  const uniquePerformances = (movie?.performances || []).reduce<Record<string, Performance>>((acc, perf) => {
    const key = perf.actor.id
    const existing = acc[key]
    const hasComment = (c?: string) => !!c && c.trim().length > 0
    if (!existing) {
      acc[key] = perf
    } else {
      // Prefer the one that has a character comment
      const pickNew = (!hasComment(existing.comment) && hasComment(perf.comment))
        || (hasComment(existing.comment) && hasComment(perf.comment)
            ? new Date(perf.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
            : false)
      if (pickNew) acc[key] = perf
    }
    return acc
  }, {})

  const uniquePerformanceList: Performance[] = Object.values(uniquePerformances)

  // Build per-actor average and count using ratings if available
  const { averageByActorId, ratingCountByActorId } = (() => {
    const ratings = movie?.ratings || []
    if (!ratings.length) return { averageByActorId: {}, ratingCountByActorId: {} }
    const sums: Record<string, { total: number; count: number }> = {}
    for (const r of ratings) {
      const hasWeighted = typeof r.weightedScore === 'number' && !Number.isNaN(r.weightedScore as number)
      const avg = hasWeighted
        ? (r.weightedScore as number)
        : (
            r.emotionalRangeDepth * 0.25 +
            r.characterBelievability * 0.25 +
            r.technicalSkill * 0.20 +
            r.screenPresence * 0.15 +
            r.chemistryInteraction * 0.15
          )
      if (!sums[r.actorId]) sums[r.actorId] = { total: 0, count: 0 }
      sums[r.actorId].total += avg
      sums[r.actorId].count += 1
    }
    const averageByActorId: Record<string, number> = {}
    const ratingCountByActorId: Record<string, number> = {}
    for (const [actorId, { total, count }] of Object.entries(sums)) {
      averageByActorId[actorId] = total / count
      ratingCountByActorId[actorId] = count
    }
    return { averageByActorId, ratingCountByActorId }
  })()

  // Calculate movie statistics
  const performancesWithRatings = uniquePerformanceList.filter(perf => averageByActorId[perf.actor.id] !== undefined)
  const castAverageScore = performancesWithRatings.length > 0 
    ? performancesWithRatings.reduce((sum, perf) => sum + averageByActorId[perf.actor.id], 0) / performancesWithRatings.length
    : 0
  
  const topPerformance = performancesWithRatings.length > 0
    ? performancesWithRatings.reduce((best, current) => 
        averageByActorId[current.actor.id] > averageByActorId[best.actor.id] ? current : best
      )
    : null

  // Sort performances by rating (highest first), then by name for consistency
  const sortedPerformances = [...uniquePerformanceList].sort((a, b) => {
    const ratingA = averageByActorId[a.actor.id] ?? 0
    const ratingB = averageByActorId[b.actor.id] ?? 0
    if (ratingA !== ratingB) return ratingB - ratingA // Higher ratings first
    return a.actor.name.localeCompare(b.actor.name) // Then alphabetical
  })

  // Create a memoized set of user-rated actor IDs to avoid recreating it in the map
  const userRatedActorIds = useMemo(() => new Set(userRatings.map(r => r.actor.id)), [userRatings])

  if (loading) {
      const LoadingContent = () => (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

  if (error || !movie) {
      const ErrorContent = () => (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Movie Not Found</h1>
            <p className="text-gray-400 mb-8">
              The movie you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild variant="premium">
              <Link href="/search">
                Search Movies
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

  const movieContent = (
    <div className="min-h-screen">
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
                {uniquePerformanceList.length} performance{uniquePerformanceList.length !== 1 ? 's' : ''} available
              </span>
            </div>
          </motion.div>
          
          {/* Main Movie Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-secondary rounded-3xl border border-border p-8 mb-12 shadow-lg"
          >
            <div className="flex flex-col items-start gap-8">
              <div className="flex-1 w-full">
                {/* Movie Title */}
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-6 inline-block leading-snug pb-1"
                >
                  {movie.title}
                </motion.h1>

                {/* Movie Info Pills */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center gap-3 mb-6"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-full backdrop-blur-sm">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300 text-sm font-medium">{movie.year}</span>
                  </div>
                  {movie.director && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-full backdrop-blur-sm">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300 text-sm font-medium">Directed by {movie.director}</span>
                    </div>
                  )}
                  {movie.genre && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded-full backdrop-blur-sm">
                      <Film className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300 text-sm font-medium">{movie.genre}</span>
                    </div>
                  )}
                </motion.div>

                {movie.overview && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-300 text-base leading-relaxed mb-6 max-w-3xl"
                  >
                    {movie.overview}
                  </motion.p>
                )}

                {/* Movie Statistics */}
                {performancesWithRatings.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-wrap items-center gap-4"
                  >
                    {/* Cast Average */}
                    <div className="inline-flex items-center gap-3 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl backdrop-blur-sm">
                      <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 fill-current drop-shadow-lg" />
                      <div className="text-left">
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400">
                          {castAverageScore.toFixed(1)}/100
                        </div>
                        <div className="text-sm text-yellow-300/80 font-medium">
                          Cast Average
                        </div>
                      </div>
                    </div>

                    {/* Top Performance Badge */}
                    {topPerformance && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full backdrop-blur-sm">
                        <Award className="w-4 h-4 text-green-400" />
                        <span className="text-green-300 font-medium text-sm">
                          Top Performance: {topPerformance.actor.name} ({averageByActorId[topPerformance.actor.id].toFixed(1)})
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Cast Ratings Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            Cast Ratings
          </h2>
          <p className="text-gray-400">Sorted by rating • {sortedPerformances.length} actors</p>
        </motion.div>
        
        {sortedPerformances.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center py-16 bg-secondary rounded-3xl border border-border"
          >
            <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-lg mb-6">
              No performances have been rated for this movie yet.
            </p>
            <Button asChild variant="premium" size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/rate">
                Rate a Performance
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sortedPerformances.map((performance, index) => {
              const ratingValue = averageByActorId[performance.actor.id]
              const hasRatings = ratingValue !== undefined
              const userRating = userRatings.find(r => r.actor.id === performance.actor.id)
              const userHasRated = !!userRating
              const ctaText = userHasRated ? 'Edit Rating' : (hasRatings ? 'Rate This Performance' : 'Be the first to rate')
              
              const isTopPerformance = topPerformance && topPerformance.actor.id === performance.actor.id
              
              return (
                <div
                  key={`performance-${performance.id}`}
                  className={`group relative bg-secondary rounded-2xl border transition-all duration-500 md:hover:scale-[1.02] md:hover:shadow-xl ${
                    isTopPerformance 
                      ? 'border-yellow-500 bg-yellow-900/20' 
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {/* Background glow for top performance */}
                  {isTopPerformance && (
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-2xl blur-xl"></div>
                  )}
                  
                  {/* Crown icon for top performance */}
                  {isTopPerformance && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="relative p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Actor Info */}
                      <div className="flex-1 min-w-0 sm:flex sm:flex-col sm:justify-center pt-2 sm:pt-3">
                        {/* Title and Year Row to match actor card style */}
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className={`font-bold text-white group-hover:text-purple-400 transition-colors flex-shrink-0 ${
                            isTopPerformance ? 'text-3xl sm:text-4xl' : 'text-xl'
                          }`}>
                            <Link href={`/actors/${performance.actor.id}`} className="hover:underline">
                              {performance.actor.name}
                            </Link>
                          </h3>
                          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span className={`text-gray-300 font-medium ${isTopPerformance ? 'text-base sm:text-lg' : 'text-sm'}`}>{movie.year}</span>
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
                                <span className={`font-medium text-purple-300 ${isTopPerformance ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>Character: {display}</span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Rating and Action */}
                      <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
                        {/* Rating Badge */}
                        <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                          <div className="mx-auto sm:mx-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
                            <Star className="w-5 h-5 text-yellow-400 fill-current" />
                            <div className="text-center">
                              {hasRatings ? (
                                <>
                                  <div className="text-lg font-bold text-yellow-400">{ratingValue.toFixed(1)}</div>
                                  <div className="text-xs text-yellow-300/80">{ratingCountByActorId[performance.actor.id] || 0} rating{(ratingCountByActorId[performance.actor.id] || 0) !== 1 ? 's' : ''}</div>
                                </>
                              ) : (
                                <div className="text-sm font-medium text-gray-400">Not rated</div>
                              )}
                            </div>
                          </div>

                          {/* See Details Button */}
                          {hasRatings && (
                            <div
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setExpandedActors(prev => ({ ...prev, [performance.actor.id]: !prev[performance.actor.id] }))
                                return false;
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setExpandedActors(prev => ({ ...prev, [performance.actor.id]: !prev[performance.actor.id] }))
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className="flex items-center gap-1 px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-all duration-200 hover:bg-gray-700/50 rounded-md cursor-pointer"
                            >
                              See Details
                              {expandedActors[performance.actor.id] ? (
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
                            <Link href={userHasRated ? `/rate?rating=${userRating.id}` : `/rate?actor=${performance.actor.id}&movie=${movieId}`} className="flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              {ctaText}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                                        {/* Expanded Rating Details */}
                    {expandedActors[performance.actor.id] && (
                      <div 
                        className="mt-2 border-t border-gray-600/30 pointer-events-none"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      >
                        <div ref={setDetailRef(performance.actor.id)} className="pt-4 pointer-events-auto">
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">Rating Breakdown</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {(() => {
                              const r = movie?.ratings || []
                              const forActor = r.filter(x => x.actorId === performance.actor.id)
                              const count = forActor.length
                              if (count === 0) return null
                              const sums = forActor.reduce((acc, s) => ({
                                emotionalRangeDepth: acc.emotionalRangeDepth + s.emotionalRangeDepth,
                                characterBelievability: acc.characterBelievability + s.characterBelievability,
                                technicalSkill: acc.technicalSkill + s.technicalSkill,
                                screenPresence: acc.screenPresence + s.screenPresence,
                                chemistryInteraction: acc.chemistryInteraction + s.chemistryInteraction,
                              }), { emotionalRangeDepth: 0, characterBelievability: 0, technicalSkill: 0, screenPresence: 0, chemistryInteraction: 0 })
                              const safe = (n: number) => count > 0 ? n / count : 0
                              const criteria = [
                                { key: 'emotionalRangeDepth', label: 'Emotional Range', value: safe(sums.emotionalRangeDepth) },
                                { key: 'characterBelievability', label: 'Believability', value: safe(sums.characterBelievability) },
                                { key: 'technicalSkill', label: 'Technical Skill', value: safe(sums.technicalSkill) },
                                { key: 'screenPresence', label: 'Screen Presence', value: safe(sums.screenPresence) },
                                { key: 'chemistryInteraction', label: 'Chemistry', value: safe(sums.chemistryInteraction) },
                              ]
                              return criteria.map(c => (
                                <div key={c.key} className="bg-muted rounded-lg p-3 text-center">
                                  <div className="text-lg font-bold text-yellow-400 mb-1">{c.value.toFixed(1)}</div>
                                  <div className="text-xs text-gray-400 font-medium">{c.label}</div>
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
      </div>

      {/* Your Ratings Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <div className="bg-secondary rounded-3xl border border-border p-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
              Your Ratings for {movie.title}
            </h3>
            <MovieRatingSection
              movieId={movieId}
              movieTitle={movie.title}
              movieYear={movie.year}
              actors={movie.performances.map(p => p.actor)}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )

  return session ? (
    <SignedInLayout>
      {movieContent}
    </SignedInLayout>
  ) : (
    <HomeLayout>
      {movieContent}
    </HomeLayout>
  )
} 