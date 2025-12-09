"use client"

export const dynamic = "force-dynamic"

import { useUser, useSession } from "@/components/providers/SessionProvider"
import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { SignedInLayout } from "@/components/layout"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { SearchBar } from "@/components/SearchBar"
import { motion } from "framer-motion"
import { fadeInUp } from "@/lib/animations"
import { Star, TrendingUp, Film } from "lucide-react"
import Link from "next/link"
import { getActorUrl, getRateUrl } from "@/lib/slugHelper"
import { PerformanceCard } from "@/components/performance/PerformanceCard"

interface Actor {
  id: string
  name: string
  imageUrl?: string | null
  slug?: string | null
  _count?: {
    performances: number
  }
}

interface Rating {
  id: string
  actorId: string
  movieId: string
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  weightedScore: number | null
  comment: string | null
  createdAt: string
  actor: {
    id: string
    name: string
    slug?: string | null
    imageUrl: string | null
  }
  movie: {
    id: string
    title: string
    year: number
    director: string
    slug?: string | null
  }
}

// Popular actors - hardcoded for performance
const POPULAR_ACTORS = [
  { name: "Timothée Chalamet", id: "timothee-chalamet" },
  { name: "Zendaya", id: "zendaya" },
  { name: "Cillian Murphy", id: "cillian-murphy" },
  { name: "Emma Stone", id: "emma-stone" },
  { name: "Florence Pugh", id: "florence-pugh" },
  { name: "Austin Butler", id: "austin-butler" }
]

export default function DashboardPage() {
  const user = useUser()
  const { session, loading: sessionLoading, isInitialized } = useSession()
  const router = useRouter()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [popularActors, setPopularActors] = useState<Actor[]>([])

  useEffect(() => {
    if (user && isInitialized) {
      fetchUserData()
    } else if (isInitialized && !sessionLoading) {
      setIsLoadingData(false)
    }
  }, [user, sessionLoading, isInitialized])

  const fetchUserData = async () => {
    try {
      setIsLoadingData(true)
      
      // Fetch user ratings
      const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json()
        setRatings(ratingsData.slice(0, 6)) // Only show 6 most recent
      }

      // Fetch popular actors
      const actorsRes = await fetch('/api/actors/popular?limit=6', { cache: 'no-store' })
      if (actorsRes.ok) {
        const actorsData = await actorsRes.json()
        setPopularActors(actorsData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const calculateAverage = (rating: Rating) => {
    return (
      (rating.emotionalRangeDepth +
        rating.characterBelievability +
        rating.technicalSkill +
        rating.screenPresence +
        rating.chemistryInteraction) / 5
    ).toFixed(1)
  }

  return (
    <AuthGuard>
      <SignedInLayout>
        <div className="min-h-screen bg-black">
          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] bg-clip-text text-transparent">
                  Welcome Back
                </span>
              </h1>
              <p className="text-xl text-gray-400">Rate performances, discover actors, share your taste</p>
            </motion.div>

            {/* Search Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-3xl mx-auto mb-16"
            >
              <SearchBar
                placeholder="Search for actors..."
                showClear
                autoFocus={false}
                className="w-full"
              />
            </motion.div>
          </div>

          {/* Popular Actors */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-3xl font-bold text-white">Popular Actors</h2>
              </div>

              {isLoadingData ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-gray-800 rounded-2xl mb-3"></div>
                      <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto"></div>
                    </div>
                  ))}
                      </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {(popularActors.length > 0 ? popularActors : POPULAR_ACTORS).map((actor, index) => (
                    <motion.div
                      key={actor.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                    >
                      <Link
                        href={getActorUrl({ id: actor.id, name: actor.name, slug: actor.slug || null })}
                        className="group block"
                      >
                        <div className="aspect-square rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 mb-3 flex items-center justify-center border-2 border-transparent group-hover:border-[#FFD700] transition-all overflow-hidden">
                          {(actor as Actor).imageUrl ? (
                            <img
                              src={(actor as Actor).imageUrl || ''}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl font-bold text-gray-600">
                              {actor.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-center text-gray-300 group-hover:text-[#FFD700] transition-colors line-clamp-2">
                          {actor.name}
                        </p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Recent Ratings */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-8">
                <Star className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-3xl font-bold text-white">Your Recent Ratings</h2>
              </div>

              {isLoadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-64 bg-gray-800 rounded-2xl"></div>
                    </div>
                  ))}
                </div>
              ) : ratings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ratings.map((rating, index) => (
                    <motion.div
                      key={rating.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                    >
                      <PerformanceCard
                        performance={{
                          id: rating.id,
                          actorId: rating.actorId,
                          movieId: rating.movieId,
                          actor: rating.actor,
                          movie: rating.movie,
                          userId: user?.id || '',
                          emotionalRangeDepth: rating.emotionalRangeDepth,
                          characterBelievability: rating.characterBelievability,
                          technicalSkill: rating.technicalSkill,
                          screenPresence: rating.screenPresence,
                          chemistryInteraction: rating.chemistryInteraction,
                          comment: rating.comment,
                          character: rating.comment,
                          createdAt: rating.createdAt,
                          updatedAt: rating.createdAt,
                        }}
                        averageRating={parseFloat(calculateAverage(rating))}
                        variant="default"
                        className="h-full"
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-xl text-gray-400 mb-6">You haven't rated any performances yet</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFD700] text-black rounded-lg hover:bg-[#FFC700] transition font-medium"
                  >
                    <Star className="w-5 h-5" />
                    Start Rating
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
      </div>
    </SignedInLayout>
    </AuthGuard>
  )
}
