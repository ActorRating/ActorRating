/**
 * New slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Example: /rate/the-dark-knight-2008/christian-bale
 * 
 * This route handles the new slug-based URL format while maintaining
 * backwards compatibility with the old query param format
 */

"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Actor, Movie } from '@/types'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { SignedInLayout, HomeLayout } from '@/components/layout'
import { useUser } from '@/components/providers/SessionProvider'

export default function SlugBasedRatePage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const [loading, setLoading] = useState(true)
  const [actor, setActor] = useState<Actor | null>(null)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const movieSlug = params?.movieSlug as string
      const actorSlug = params?.actorSlug as string

      if (!movieSlug || !actorSlug) {
        router.replace('/search')
        return
      }

      try {
        // Fetch movie and actor by slug
        const [movieResponse, actorResponse] = await Promise.all([
          fetch(`/api/movies/${movieSlug}`),
          fetch(`/api/actors/${actorSlug}`)
        ])

        if (!movieResponse.ok || !actorResponse.ok) {
          console.error('Failed to resolve movie or actor')
          setError('Performance not found')
          setLoading(false)
          return
        }

        const movieData = await movieResponse.json()
        const actorData = await actorResponse.json()

        setMovie(movieData)
        setActor(actorData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load performance data')
        setLoading(false)
      }
    }

    fetchData()
  }, [params, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-base">Loading rating page...</p>
        </div>
      </div>
    )
  }

  if (error || !actor || !movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || 'Performance not found'}</p>
          <button
            onClick={() => router.push('/search')}
            className="px-6 py-3 bg-[#FFD700] text-black rounded-lg hover:bg-[#FFC700] transition"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const Layout = user ? SignedInLayout : HomeLayout

  return (
    <Layout>
      <PerformanceRatingClientWrapper
        performance={{
          id: `${actor.id}-${movie.id}`,
          actor: actor,
          movie: movie,
          actorId: actor.id,
          movieId: movie.id,
          character: null,
          comment: null,
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSuccess={() => {
          // Success is handled within the wrapper component
        }}
      />
    </Layout>
  )
}

