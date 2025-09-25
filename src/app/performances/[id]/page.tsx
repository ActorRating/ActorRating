"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@supabase/auth-helpers-react'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { Button } from '@/components/ui/Button'

interface Performance {
  id: string
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

export default function PerformanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useUser()
  const performanceId = params.id as string
  const submittedFromQuery = searchParams.get('submitted') === 'true'
  
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Scroll to top when success page loads
  useEffect(() => {
    if (submitted) {
      window.scrollTo(0, 0)
    }
  }, [submitted])

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await fetch(`/api/performances/${performanceId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Performance not found. This performance may not have been rated yet.')
          }
          throw new Error('Failed to fetch performance')
        }
        const data = await response.json()
        setPerformance(data)
      } catch (error) {
        console.error('Failed to fetch performance:', error)
        setError(error instanceof Error ? error.message : 'Performance not found')
      } finally {
        setLoading(false)
      }
    }

    if (performanceId) {
      fetchPerformance()
    }
  }, [performanceId])

  const handleRatingSubmit = async (ratingData: {
    emotionalRangeDepth: number
    characterBelievability: number
    technicalSkill: number
    screenPresence: number
    chemistryInteraction: number
  }) => {
    if (!performance) return

    // If user is not signed in, redirect to signup with rating data
    if (!user) {
      // Store rating data in localStorage for after signup
      const ratingDataToStore = {
        ...ratingData,
        actorId: performance.actor.id,
        movieId: performance.movie.id,
        actorName: performance.actor.name,
        movieTitle: performance.movie.title,
        movieYear: performance.movie.year,
        comment: performance.comment,
        performanceId: performance.id,
        timestamp: new Date().toISOString()
      }
      
      localStorage.setItem('pendingRating', JSON.stringify(ratingDataToStore))
      
      // Redirect to signup page
      router.push('/auth/signup')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/performances/${performanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit rating')
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit rating:', error)
      alert('Failed to submit rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    const LoadingContent = () => (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-700 rounded mb-6 max-w-md mx-auto"></div>
            <div className="h-6 bg-gray-700 rounded mb-12 max-w-lg mx-auto"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-700 rounded-2xl"></div>
              ))}
              <div className="lg:col-span-2 lg:flex lg:justify-center">
                <div className="w-full lg:w-1/2">
                  <div className="h-32 bg-gray-700 rounded-2xl"></div>
                </div>
              </div>
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

  if (error || !performance) {
    const ErrorContent = () => (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <AlertCircle className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">Performance Not Found</h1>
            <p className="text-gray-400 mb-8 text-lg max-w-2xl mx-auto">
              {error || "The performance you're looking for doesn't exist or has been removed."}
            </p>
            <p className="text-gray-500 mb-12 text-sm max-w-xl mx-auto">
              This might be because:
            </p>
            <ul className="text-gray-500 mb-12 text-sm max-w-xl mx-auto text-left list-disc list-inside space-y-2">
              <li>The performance hasn't been rated yet</li>
              <li>You're trying to access an actor or movie ID instead</li>
              <li>The URL is incorrect or outdated</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="premium" size="lg">
                <Link href="/rate">
                  Rate a Performance
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/search">
                  Search Performances
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
            </div>
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

  // Success message after rating submission
  if (submitted || submittedFromQuery) {
    const SuccessContent = () => (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">Rating Submitted Successfully!</h1>
            <p className="text-gray-400 mb-12 text-lg">
              Thank you for rating {performance.actor.name}'s performance in "{performance.movie.title}" as {performance.comment || 'Unknown Character'}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="premium" size="lg">
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/search">
                  Rate Another Performance
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )

    return user ? (
      <SignedInLayout>
        <SuccessContent />
      </SignedInLayout>
    ) : (
      <HomeLayout>
        <SuccessContent />
      </HomeLayout>
    )
  }

  // Main rating interface using the client wrapper
  const PerformanceContent = () => (
    <PerformanceRatingClientWrapper
      performance={performance}
      onSubmit={handleRatingSubmit}
      submitting={submitting}
    />
  )

  return user ? (
    <SignedInLayout>
      <PerformanceContent />
    </SignedInLayout>
  ) : (
    <HomeLayout>
      <PerformanceContent />
    </HomeLayout>
  )
} 