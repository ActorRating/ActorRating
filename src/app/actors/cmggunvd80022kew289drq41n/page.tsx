"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, Star, Film, Heart, Target, Zap, Eye, Users, SortAsc } from 'lucide-react'
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
  comment?: string | null
  user: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

type SortOption = 'year-desc' | 'year-asc' | 'score-desc' | 'score-asc' | 'title-asc'

export default function ActorDetailPage() {
  const router = useRouter()
  const user = useUser()
  const actorId = "cmggunvd80022kew289drq41n"

  const [actor, setActor] = useState<Actor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRatings, setUserRatings] = useState<Array<{ id: string; movieId: string }>>([])
  const [sortBy, setSortBy] = useState<SortOption>('year-desc')
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

  // Sort performances
  const sortedPerformances = useMemo(() => {
    if (!actor?.performances) return []
    
    const sorted = [...actor.performances].sort((a, b) => {
      switch (sortBy) {
        case 'year-desc':
          return b.movie.year - a.movie.year
        case 'year-asc':
          return a.movie.year - b.movie.year
        case 'score-desc':
          const avgA = (a.emotionalRangeDepth + a.characterBelievability + a.technicalSkill + a.screenPresence + a.chemistryInteraction) / 5
          const avgB = (b.emotionalRangeDepth + b.characterBelievability + b.technicalSkill + b.screenPresence + b.chemistryInteraction) / 5
          return avgB - avgA
        case 'score-asc':
          const avgA2 = (a.emotionalRangeDepth + a.characterBelievability + a.technicalSkill + a.screenPresence + a.chemistryInteraction) / 5
          const avgB2 = (b.emotionalRangeDepth + b.characterBelievability + b.technicalSkill + b.screenPresence + b.chemistryInteraction) / 5
          return avgA2 - avgB2
        case 'title-asc':
          return a.movie.title.localeCompare(b.movie.title)
        default:
          return b.movie.year - a.movie.year
      }
    })
    
    return sorted
  }, [actor?.performances, sortBy])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-base">Loading actor data...</p>
        </div>
      </div>
    )
  }

  if (error || !actor) {
    const ErrorContent = () => (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Actor</h1>
          <p className="text-gray-400 mb-8 text-sm">
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              <Link href={user ? "/search" : "/"} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{user ? "Back to Search" : "Back to Home"}</span>
              </Link>
            </Button>
            <span className="text-xs text-gray-400 bg-blue-500/20 px-2 py-1 rounded-full">
              {actor.performances.length} films
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-First Actor Header */}
      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Actor Image - Smaller on mobile */}
          {actor.imageUrl && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg">
              <img
                src={actor.imageUrl}
                alt={actor.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Actor Name - Mobile optimized */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            {actor.name}
          </h1>

          {/* Career Rating - Mobile first */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl backdrop-blur-sm mb-6">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <div className="text-left">
              <div className="text-xl font-bold text-yellow-400">
                {averageRating.toFixed(1)}/100
              </div>
              <div className="text-xs text-yellow-300 font-medium">
                Career Average
              </div>
            </div>
          </div>

          {/* Career Stats - Mobile Grid with Icons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Emotional', value: emotionalRange, icon: Heart },
              { label: 'Believable', value: characterBelievability, icon: Target },
              { label: 'Technical', value: technicalSkill, icon: Zap },
              { label: 'Presence', value: screenPresence, icon: Eye },
              { label: 'Chemistry', value: chemistryInteraction, icon: Users }
            ].map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center justify-center mb-1">
                    <IconComponent className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-sm font-medium text-gray-300 mb-1">{stat.label}</div>
                  <div className="text-lg font-bold text-white">
                    {stat.value.toFixed(1)}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Performances Section */}
      <div className="px-4 pb-16">
        {/* Sort Controls - Mobile optimized */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Filmography
            </h2>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none appearance-none pr-8"
              >
                <option value="year-desc">Newest First</option>
                <option value="year-asc">Oldest First</option>
                <option value="score-desc">Highest Rated</option>
                <option value="score-asc">Lowest Rated</option>
                <option value="title-asc">A-Z</option>
              </select>
              <SortAsc className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {sortedPerformances.length === 0 ? (
          <div className="text-center py-16 bg-secondary rounded-2xl border border-border">
            <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-300 text-base mb-6">
              No performances found for this actor.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPerformances.map((performance, index) => {
              const hasUserRating = userRatings.some(rating => rating.movieId === performance.movie.id)
              const performanceAverage = (performance.emotionalRangeDepth + performance.characterBelievability + performance.technicalSkill + performance.screenPresence + performance.chemistryInteraction) / 5

              return (
                <motion.div
                  key={`performance-${performance.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-secondary rounded-xl border border-border p-4 hover:border-primary transition-colors"
                >
                  {/* Mobile-first layout */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title and Year */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-tight">
                          {performance.movie.title}
                        </h3>
                        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {performance.movie.year}
                        </span>
                      </div>

                      {/* Character */}
                      <div className="mb-3">
                        <span className="text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded-full">
                          {resolveCharacterDisplay({
                            character: performance.character,
                            roleName: performance.roleName,
                            comment: performance.comment,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Score and Button - Mobile optimized */}
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
                          <Star className="w-3 h-3 mr-1" />
                          {hasUserRating ? "Edit" : "Rate"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Your Ratings Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <ActorRatingSection actorId={actorId} />
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
