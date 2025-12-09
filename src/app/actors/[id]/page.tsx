"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Film, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/components/providers/SessionProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { ActorRatingSection } from '@/components/rating/ActorRatingSection'
import { PerformanceCard } from '@/components/performance/PerformanceCard'
import { getRateUrl } from '@/lib/slugHelper'

interface Actor {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  birthDate?: string
  nationality?: string
  knownFor?: string
}

interface Performance {
  id: string
  actorId: string
  movieId: string
  character?: string | null
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
  }
}

export default function ActorPage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const actorId = params?.id as string

  const [actor, setActor] = useState<Actor | null>(null)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/actors/${actorId}`)
        if (!response.ok) throw new Error('Failed to fetch actor')
        
        const data = await response.json()
        setActor(data)
        setPerformances(data.performances || [])
      } catch (error) {
        console.error('Error fetching actor:', error)
      } finally {
        setLoading(false)
      }
    }

    if (actorId) {
      fetchData()
    }
  }, [actorId])

  const Layout = user ? SignedInLayout : HomeLayout

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full"></div>
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
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-black via-black to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-[#FFD700] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Search</span>
            </Link>
          </motion.div>

          {/* Actor Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] bg-clip-text text-transparent">
                {actor.name}
              </span>
            </h1>

            {actor.bio && (
              <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                {actor.bio}
              </p>
            )}

            <div className="flex items-center justify-center gap-6 text-gray-400">
              {actor.nationality && (
                <span className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  {actor.nationality}
                </span>
              )}
              {performances.length > 0 && (
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  {performances.length} Performances
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Performances Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {performances.length > 0 ? (
          <>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-8"
            >
              Filmography
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {performances.map((performance, index) => (
                <motion.div
                  key={performance.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
                >
                  <PerformanceCard
                    performance={{
                      ...performance,
                      userId: user?.id || '',
                      comment: performance.character,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      emotionalRangeDepth: 0,
                      characterBelievability: 0,
                      technicalSkill: 0,
                      screenPresence: 0,
                      chemistryInteraction: 0,
                    }}
                    variant="default"
                    className="h-full"
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center py-16"
          >
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No performances found for this actor yet.</p>
          </motion.div>
        )}
      </div>

      {/* User Ratings Section */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ActorRatingSection 
              actorId={actorId} 
              actorName={actor.name} 
              actorSlug={(actor as any).slug} 
            />
          </motion.div>
        </div>
      )}
    </Layout>
  )
}
