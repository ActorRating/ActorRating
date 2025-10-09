"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, Star, Film, Award, ChevronDown, ChevronUp, SortAsc, SortDesc, Filter, Heart, Target, Zap, Eye, Users } from 'lucide-react'
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

type SortOption = 'year-desc' | 'year-asc' | 'score-desc' | 'score-asc' | 'title-asc' | 'title-desc'

export default function ActorDetailPage() {
  const router = useRouter()
  const user = useUser()
  const actorId = "cmggunzqb004zkew23ihnxqe0"

  const [actor, setActor] = useState<Actor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRatings, setUserRatings] = useState<Array<{ id: string; movieId: string }>>([])
  const [expandedPerformances, setExpandedPerformances] = useState<Record<string, boolean>>({})
  const [sortOption, setSortOption] = useState<SortOption>('year-desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
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

  // Sort performances based on selected option
  const sortedPerformances = useMemo(() => {
    if (!actor?.performances) return []
    
    const performances = [...actor.performances]
    
    switch (sortOption) {
      case 'year-desc':
        return performances.sort((a, b) => b.movie.year - a.movie.year)
      case 'year-asc':
        return performances.sort((a, b) => a.movie.year - b.movie.year)
      case 'score-desc':
        return performances.sort((a, b) => {
          const scoreA = (a.emotionalRangeDepth + a.characterBelievability + a.technicalSkill + a.screenPresence + a.chemistryInteraction) / 5
          const scoreB = (b.emotionalRangeDepth + b.characterBelievability + b.technicalSkill + b.screenPresence + b.chemistryInteraction) / 5
          return scoreB - scoreA
        })
      case 'score-asc':
        return performances.sort((a, b) => {
          const scoreA = (a.emotionalRangeDepth + a.characterBelievability + a.technicalSkill + a.screenPresence + a.chemistryInteraction) / 5
          const scoreB = (b.emotionalRangeDepth + b.characterBelievability + b.technicalSkill + b.screenPresence + b.chemistryInteraction) / 5
          return scoreA - scoreB
        })
      case 'title-asc':
        return performances.sort((a, b) => a.movie.title.localeCompare(b.movie.title))
      case 'title-desc':
        return performances.sort((a, b) => b.movie.title.localeCompare(a.movie.title))
      default:
        return performances
    }
  }, [actor?.performances, sortOption])

  const sortOptions = [
    { value: 'year-desc', label: 'Year (Newest First)', icon: SortDesc },
    { value: 'year-asc', label: 'Year (Oldest First)', icon: SortAsc },
    { value: 'score-desc', label: 'Score (Highest First)', icon: Star },
    { value: 'score-asc', label: 'Score (Lowest First)', icon: Star },
    { value: 'title-asc', label: 'Title (A-Z)', icon: SortAsc },
    { value: 'title-desc', label: 'Title (Z-A)', icon: SortDesc },
  ]

  const togglePerformanceDetails = (movieId: string) => {
    console.log('Toggling performance details for:', movieId)
    setExpandedPerformances(prev => ({
      ...prev,
      [movieId]: !prev[movieId]
    }))
  }

  useEffect(() => {
    setMounted(true)
    const fetchActorData = async () => {
      if (!actorId) {
        setError("No actor ID provided.")
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/actors/${actorId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch actor data: ${response.statusText}`)
        }
        const data = await response.json()
        setActor(data)

        if (user?.id) {
          const userRatingsResponse = await fetch(`/api/actors/${actorId}/user-rating?userId=${user.id}`)
          if (userRatingsResponse.ok) {
            const userRatingsData = await userRatingsResponse.json()
            setUserRatings(userRatingsData)
          } else {
            console.error("Failed to fetch user ratings:", userRatingsResponse.statusText)
          }
        }
      } catch (err: any) {
        console.error("Error fetching actor data:", err)
        setError(err.message || "Failed to load actor.")
      } finally {
        setLoading(false)
      }
    }

    fetchActorData()
  }, [actorId, user?.id])

  useEffect(() => {
    // Recalculate heights when expandedPerformances changes
    Object.keys(expandedPerformances).forEach(movieId => {
      if (expandedPerformances[movieId] && detailRefs.current[movieId]) {
        setDetailHeights(prev => ({
          ...prev,
          [movieId]: detailRefs.current[movieId]?.scrollHeight || 0
        }))
      }
    })
  }, [expandedPerformances])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading actor data...</p>
        </div>
      </div>
    )
  }

  if (error || !actor) {
    const ErrorContent = () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Invalid Actor</h1>
          <p className="text-gray-400 mb-8">
            {error || "The actor you're looking for doesn't exist or has been removed."}
          </p>
          <Button asChild variant="premium">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
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
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Link href={user ? "/search" : "/"} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Back</span>
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full">
                {actor.performances.length} films
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-First Actor Card */}
      <div className="max-w-7xl mx-auto px-3 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary rounded-2xl border border-border p-4 mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            {/* Actor Image - Mobile Optimized */}
            {actor.imageUrl && (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={actor.imageUrl}
                  alt={actor.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">
                {actor.name}
              </h1>
              
              {/* Career Rating - Mobile Optimized */}
              <div className="flex items-center gap-2 mt-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-lg font-bold text-yellow-400">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">/100</span>
              </div>
            </div>
          </div>

          {/* Career Stats - Mobile Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Emotional', value: emotionalRange, icon: Heart },
              { label: 'Believability', value: characterBelievability, icon: Target },
              { label: 'Technical', value: technicalSkill, icon: Zap },
              { label: 'Presence', value: screenPresence, icon: Eye },
              { label: 'Chemistry', value: chemistryInteraction, icon: Users }
            ].map((stat, index) => (
              <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-3 h-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-300">{stat.label}</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {stat.value.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sort Controls - Mobile Optimized */}
        <div className="mb-4">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="w-full justify-between bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Sort: {sortOptions.find(opt => opt.value === sortOption)?.label}</span>
              </div>
              {showSortMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortOption(option.value as SortOption)
                      setShowSortMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700/50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <option.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-white">{option.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Performances - Mobile Optimized */}
        {sortedPerformances.length === 0 ? (
          <div className="text-center py-12 bg-secondary rounded-2xl border border-border">
            <Film className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-300">No performances found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPerformances.map((performance, index) => {
              const hasUserRating = userRatings.some(rating => rating.movieId === performance.movie.id)
              const performanceAverage = (performance.emotionalRangeDepth + performance.characterBelievability + performance.technicalSkill + performance.screenPresence + performance.chemistryInteraction) / 5

              return (
                <div
                  key={`performance-${performance.id}`}
                  className="bg-secondary rounded-xl border border-border p-4 transition-all duration-200 hover:border-primary/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Movie Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-white text-base truncate">
                          {performance.movie.title}
                        </h3>
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded-full flex-shrink-0">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-gray-300">{performance.movie.year}</span>
                        </div>
                      </div>

                      {/* Character - Fixed to show actual character names */}
                      <div className="mb-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10">
                          <span className="text-xs font-medium text-purple-300">
                            {(() => {
                              const display = resolveCharacterDisplay({
                                character: performance.character,
                                roleName: performance.roleName,
                                comment: performance.comment,
                              })
                              return display
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rating Section - Mobile Optimized */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-400">
                          {performanceAverage.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">Score</div>
                      </div>

                      <Button
                        asChild
                        variant={hasUserRating ? "secondary" : "premium"}
                        size="sm"
                        className="text-xs px-3 py-1"
                      >
                        <Link href={`/rate?actor=${actorId}&movie=${performance.movie.id}`}>
                          {hasUserRating ? (
                            <>
                              <Star className="w-3 h-3 mr-1" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Star className="w-3 h-3 mr-1" />
                              Rate
                            </>
                          )}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Your Ratings Section - Mobile Optimized */}
        <div className="mt-8">
          <ActorRatingSection actorId={actorId} />
        </div>
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
