"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, Star, Film, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/components/providers/SessionProvider'
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
  const router = useRouter()
  const user = useUser()
  const actorId = "cmgguo3i0007dkew2dyv6j84m"
  
  const [actor, setActor] = useState<Actor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRatings, setUserRatings] = useState<Array<{ id: string; movieId: string }>>([])
  const [expandedPerformances, setExpandedPerformances] = useState<Record<string, boolean>>({})
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [detailHeights, setDetailHeights] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)

  // Calculate average ratings
  const averageRating = useMemo(() => {
    if (!actor?.performances?.length) return 0
    const total = actor.performances.reduce((sum, perf) => {
      return sum + (perf.emotionalRangeDepth + perf.characterBelievability + perf.technicalSkill + perf.screenPresence + perf.chemistryInteraction) / 5
    }, 0)
    return total / actor.performances.length
  }, [actor])

  const emotionalRange = useMemo(() => {
    if (!actor?.performances?.length) return 0
    const total = actor.performances.reduce((sum, perf) => sum + perf.emotionalRangeDepth, 0)
    return total / actor.performances.length
  }, [actor])

  const characterBelievability = useMemo(() => {
    if (!actor?.performances?.length) return 0
    const total = actor.performances.reduce((sum, perf) => sum + perf.characterBelievability, 0)
    return total / actor.performances.length
  }, [actor])

  const technicalSkill = useMemo(() => {
    if (!actor?.performances?.length) return 0
    const total = actor.performances.reduce((sum, perf) => sum + perf.technicalSkill, 0)
    return total / actor.performances.length
  }, [actor])

  const screenPresence = useMemo(() => {
    if (!actor?.performances?.length) return 0
    const total = actor.performances.reduce((sum, perf) => sum + perf.screenPresence, 0)
    return total / actor.performances.length
  }, [actor])

  const chemistryInteraction = useMemo(() => {
    if (!actor?.performances?.length) return 0
    const total = actor.performances.reduce((sum, perf) => sum + perf.chemistryInteraction, 0)
    return total / actor.performances.length
  }, [actor])

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
    if (actorId && user) {
      fetchUserRatings()
    }
  }, [actorId, user])

  // Early return for invalid actorId after all hooks are defined
  if (!actorId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Invalid Actor</h1>
          <p className="text-gray-400 mb-8">No actor ID provided.</p>
        </div>
      </div>
    )
  }

  if (loading) {
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

    return user ? (
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

    return user ? (
      <SignedInLayout>
        <ErrorContent />
      </SignedInLayout>
    ) : (
      <HomeLayout>
        <ErrorContent />
      </HomeLayout>
    )
  }

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
              <Link href={user ? "/search" : "/"} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                {user ? "Back to Search" : "Back to Home"}
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
                {actor.performances.length} performance{actor.performances.length !== 1 ? 's' : ''}
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
                  className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-snug"
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
                      <div className="text-sm text-yellow-300 font-medium">
                        Career Average
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Career Stats Breakdown */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
                >
                  {[
                    { label: 'Emotional Range', value: emotionalRange, icon: '🎭' },
                    { label: 'Believability', value: characterBelievability, icon: '🎯' },
                    { label: 'Technical Skill', value: technicalSkill, icon: '🎪' },
                    { label: 'Screen Presence', value: screenPresence, icon: '✨' },
                    { label: 'Chemistry', value: chemistryInteraction, icon: '💫' }
                  ].map((stat, index) => (
                    <div key={stat.label} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="text-sm font-medium text-gray-300">{stat.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {stat.value.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Actor Bio */}
                {actor.bio && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mb-6"
                  >
                    <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                    <p className="text-gray-300 leading-relaxed text-sm lg:text-base">
                      {actor.bio}
                    </p>
                  </motion.div>
                )}

                {/* Actor Details */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {actor.birthDate && (
                    <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-sm text-gray-400">Born</div>
                        <div className="text-white font-medium">
                          {new Date(actor.birthDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {actor.nationality && (
                    <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                      <Award className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-sm text-gray-400">Nationality</div>
                        <div className="text-white font-medium">{actor.nationality}</div>
                      </div>
                    </div>
                  )}
                </motion.div>
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
          <h2 className="text-3xl font-bold text-white mb-2">
            Filmography
          </h2>
          <p className="text-gray-400">Chronological order • {actor.performances.length} performances</p>
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
              No performances found for this actor.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {actor.performances.map((performance, index) => {
              const hasUserRating = userRatings.some(rating => rating.movieId === performance.movie.id)
              const performanceAverage = (performance.emotionalRangeDepth + performance.characterBelievability + performance.technicalSkill + performance.screenPresence + performance.chemistryInteraction) / 5
              
              return (
                <div
                  key={`performance-${performance.id}`}
                  className="group relative bg-secondary rounded-2xl border border-border transition-all duration-500 md:hover:scale-[1.02] md:hover:shadow-xl hover:border-primary"
                >
                  <div className="relative p-4 sm:p-6 sm:min-h-[120px]">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Movie Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center pt-2 sm:pt-3">
                        {/* Title and Year Row */}
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors flex-shrink-0 text-2xl">
                            {performance.movie.title}
                          </h3>
                          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span className="text-gray-300 font-medium text-sm sm:text-base">{performance.movie.year}</span>
                          </div>
                        </div>

                        {/* Character line in purple bubble */}
                        {(() => {
                          const display = resolveCharacterDisplay({
                            character: (performance as any).character,
                            roleName: performance.roleName as any,
                            comment: performance.comment as any,
                          })
                          return (
                            <div className="mb-3">
                              <div className="inline-flex w-full sm:w-auto items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 justify-center sm:justify-start">
                                <span className="font-medium text-purple-300 text-sm sm:text-base">Character: {display}</span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Rating Section */}
                      <div className="flex flex-col items-end gap-3">
                        {/* Performance Score */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-400">
                            {performanceAverage.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400">Score</div>
                        </div>

                        {/* Rate Button */}
                        <Button
                          asChild
                          variant={hasUserRating ? "secondary" : "premium"}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          <Link href={`/rate?actor=${actorId}&movie=${performance.movie.id}`}>
                            {hasUserRating ? (
                              <>
                                <Star className="w-4 h-4 mr-2" />
                                Edit Rating
                              </>
                            ) : (
                              <>
                                <Star className="w-4 h-4 mr-2" />
                                Be First to Rate
                              </>
                            )}
                          </Link>
                        </Button>
                      </div>
                    </div>
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
            <h3 className="text-2xl font-bold text-white mb-6">
              Your Ratings for {actor.name}
            </h3>
            <ActorRatingSection actorId={actor.id} actorName={actor.name} />
          </div>
        </motion.div>
      </div>
    </div>
  )

  return user ? (
    <SignedInLayout>
      {actorContent}
    </SignedInLayout>
  ) : (
    <HomeLayout>
      {actorContent}
    </HomeLayout>
  )
}