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
  const actorId = "cmggunu0u0016kew2dpexh81l"
  
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
          
          {/* Main Actor Card - Simplified */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-secondary rounded-3xl border border-border p-6 sm:p-8 mb-12 shadow-lg"
          >
            <div className="text-center">
              {/* Actor Name */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-snug"
              >
                {actor.name}
              </motion.h1>
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