"use client"

export const dynamic = "force-dynamic"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/components/providers/SessionProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { Button } from '@/components/ui/Button'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { motion } from 'framer-motion'

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
  const performanceId = params?.id as string
  const submittedFromQuery = searchParams?.get('submitted') === 'true'
  
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
      router.push('/auth/register')
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
      <div className="min-h-screen flex items-center justify-center">
        <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
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
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Ambient gold spotlight */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 45%, transparent 70%)',
          }}
        />

        <div className="relative max-w-lg mx-auto px-5 sm:px-8 py-14 sm:py-20 flex flex-col items-center">

          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex justify-center mb-8"
          >
            <div
              className="rounded-full p-4"
              style={{
                background: 'rgba(255,215,0,0.08)',
                border: '1px solid rgba(255,215,0,0.25)',
                boxShadow: '0 0 40px rgba(255,215,0,0.18)',
              }}
            >
              <svg
                className="w-14 h-14 sm:w-16 sm:h-16"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.circle
                  cx="32" cy="32" r="30"
                  stroke="#FFD700"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.35 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                <motion.path
                  d="M18 33 L27 43 L46 23"
                  stroke="#FFD700"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: 0.25 }}
                />
              </svg>
            </div>
          </motion.div>

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: '#a1a1aa' }}
          >
            Rating Submitted
          </motion.p>

          {/* Actor name */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center leading-tight"
            style={{ fontFamily: 'var(--font-cinzel, var(--font-heading, serif))' }}
          >
            {performance.actor.name}
          </motion.h1>

          {/* Movie + character */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="text-sm mb-10 text-center"
            style={{ color: '#71717a' }}
          >
            <span style={{ color: '#a1a1aa' }}>{performance.movie.title}</span>
            <span style={{ color: '#52525b' }}> · </span>
            {performance.movie.year}
            {performance.comment && (
              <>
                <span style={{ color: '#52525b' }}> · </span>
                <span className="italic">{performance.comment}</span>
              </>
            )}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="w-full flex flex-col gap-3"
          >
            <Button asChild variant="premium" size="lg" className="w-full rounded-full">
              <Link href="/">Back to Home</Link>
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/search')}
                className="py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:bg-white/8 active:scale-[0.98] flex items-center justify-center gap-1.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#a1a1aa',
                }}
              >
                Rate Again
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => router.push(`/actors/${performance.actor.id}`)}
                className="py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:bg-white/8 active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#a1a1aa',
                }}
              >
                More Films
              </button>
            </div>
          </motion.div>

          {/* Subtle star flourish */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-10 flex items-center gap-2"
            style={{ color: '#2a2a2a' }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </motion.div>

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

  // Main rating interface using the client wrapper (maps wrapper's rating shape to API shape)
  const handleSubmitFromWrapper = async (ratingData: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
  }) => {
    await handleRatingSubmit({
      emotionalRangeDepth: ratingData.emotionalDepth,
      characterBelievability: ratingData.believability,
      technicalSkill: ratingData.technicalSkill,
      screenPresence: ratingData.screenPresence,
      chemistryInteraction: ratingData.chemistry,
    })
  }
  const PerformanceContent = () => (
    <PerformanceRatingClientWrapper
      performance={performance}
      onSubmit={handleSubmitFromWrapper}
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