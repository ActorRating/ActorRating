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

export default function SlugBasedRatePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function resolveAndRedirect() {
      const movieSlug = params?.movieSlug as string
      const actorSlug = params?.actorSlug as string

      if (!movieSlug || !actorSlug) {
        router.push('/search')
        return
      }

      try {
        // Fetch movie and actor by slug to get their IDs
        const [movieResponse, actorResponse] = await Promise.all([
          fetch(`/api/movies/${movieSlug}`),
          fetch(`/api/actors/${actorSlug}`)
        ])

        if (!movieResponse.ok || !actorResponse.ok) {
          console.error('Failed to resolve movie or actor')
          router.push('/search')
          return
        }

        const movie = await movieResponse.json()
        const actor = await actorResponse.json()

        // Redirect to the main rate page with query params
        // This keeps the existing rate page logic intact
        router.push(`/rate?actor=${actor.id}&movie=${movie.id}`)
      } catch (error) {
        console.error('Error resolving slugs:', error)
        router.push('/search')
      }
    }

    resolveAndRedirect()
  }, [params, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white text-base">Loading rating page...</p>
      </div>
    </div>
  )
}

