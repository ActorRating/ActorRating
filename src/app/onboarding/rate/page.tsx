"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/providers/SessionProvider'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { SignedInLayout } from '@/components/layout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'

// Curated performances for first rating
const CURATED_PERFORMANCES = [
  {
    actorName: 'Heath Ledger',
    actorId: 'heath-ledger',
    movieTitle: 'The Dark Knight',
    movieId: 'the-dark-knight-2008',
    character: 'The Joker',
    year: 2008
  },
  {
    actorName: 'Cillian Murphy',
    actorId: 'cillian-murphy',
    movieTitle: 'Oppenheimer',
    movieId: 'oppenheimer-2023',
    character: 'J. Robert Oppenheimer',
    year: 2023
  },
  {
    actorName: 'Daniel Day-Lewis',
    actorId: 'daniel-day-lewis',
    movieTitle: 'There Will Be Blood',
    movieId: 'there-will-be-blood-2007',
    character: 'Daniel Plainview',
    year: 2007
  },
  {
    actorName: 'Natalie Portman',
    actorId: 'natalie-portman',
    movieTitle: 'Black Swan',
    movieId: 'black-swan-2010',
    character: 'Nina Sayers',
    year: 2010
  },
  {
    actorName: 'Christian Bale',
    actorId: 'christian-bale',
    movieTitle: 'The Fighter',
    movieId: 'the-fighter-2010',
    character: 'Dicky Eklund',
    year: 2010
  },
  {
    actorName: 'Meryl Streep',
    actorId: 'meryl-streep',
    movieTitle: 'Sophie\'s Choice',
    movieId: 'sophies-choice-1982',
    character: 'Sophie Zawistowski',
    year: 1982
  }
]

export default function OnboardingRatePage() {
  const router = useRouter()
  const user = useUser()
  const { executeRecaptcha } = useRecaptchaV3()
  const [selectedPerformance, setSelectedPerformance] = useState<typeof CURATED_PERFORMANCES[0] | null>(null)
  const [actor, setActor] = useState<any>(null)
  const [movie, setMovie] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedRating, setSubmittedRating] = useState<any>(null)

  // Check if user already has ratings (shouldn't be here if they do, but safety check)
  useEffect(() => {
    const checkRatings = async () => {
      if (!user) return
      
      try {
        const res = await fetch('/api/ratings/me', { cache: 'no-store' })
        if (res.ok) {
          const ratings = await res.json()
          if (Array.isArray(ratings) && ratings.length > 0) {
            // User already has ratings, redirect to dashboard
            router.push('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Failed to check ratings:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      checkRatings()
    } else {
      setLoading(false)
    }
  }, [user, router])

  const handlePerformanceSelect = async (performance: typeof CURATED_PERFORMANCES[0]) => {
    setSelectedPerformance(performance)
    setLoading(true)

    try {
      // Fetch actor data
      const actorRes = await fetch(`/api/actors/${performance.actorId}`)
      if (!actorRes.ok) {
        // Try alternative endpoint or create minimal actor object
        setActor({
          id: performance.actorId,
          name: performance.actorName,
          imageUrl: null
        })
      } else {
        const actorData = await actorRes.json()
        setActor(actorData)
      }

      // Fetch movie data
      const movieRes = await fetch(`/api/movies/${performance.movieId}`)
      if (!movieRes.ok) {
        // Create minimal movie object
        setMovie({
          id: performance.movieId,
          title: performance.movieTitle,
          year: performance.year,
          director: 'Unknown'
        })
      } else {
        const movieData = await movieRes.json()
        setMovie(movieData)
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
      // Use minimal data as fallback
      setActor({
        id: performance.actorId,
        name: performance.actorName,
        imageUrl: null
      })
      setMovie({
        id: performance.movieId,
        title: performance.movieTitle,
        year: performance.year,
        director: 'Unknown'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (ratingData: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
  }): Promise<void> => {
    if (!actor || !movie) {
      return Promise.resolve()
    }

    setSubmitting(true)
    try {
      const apiRatingData = {
        emotionalRangeDepth: ratingData.emotionalDepth,
        characterBelievability: ratingData.believability,
        technicalSkill: ratingData.technicalSkill,
        screenPresence: ratingData.screenPresence,
        chemistryInteraction: ratingData.chemistry,
      }

      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('submit_rating')

      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actorId: actor.id,
          movieId: movie.id,
          ...apiRatingData,
          recaptchaToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit rating')
      }

      const result = await response.json()
      setSubmittedRating(result)
      setSubmitted(true)

      // Redirect to dashboard after a short delay to show success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !selectedPerformance) {
    return (
      <AuthGuard>
        <SignedInLayout>
          <div className="min-h-screen bg-black flex items-center justify-center">
            <BouncingBallsLoader 
              size="lg" 
              color="#FFD700"
              showText={true}
              text="Loading..."
            />
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show rating form when performance is selected
  if (selectedPerformance && actor && movie) {
    return (
      <AuthGuard>
        <SignedInLayout>
          <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-start-3 lg:col-span-8">
                <PerformanceRatingClientWrapper
                  performance={{
                    id: `${actor.id}-${movie.id}`,
                    actor: {
                      id: actor.id,
                      name: actor.name,
                      imageUrl: actor.imageUrl
                    },
                    movie: {
                      id: movie.id,
                      title: movie.title,
                      year: movie.year,
                      director: movie.director
                    },
                    emotionalRangeDepth: 0,
                    characterBelievability: 0,
                    technicalSkill: 0,
                    screenPresence: 0,
                    chemistryInteraction: 0,
                    comment: '',
                    user: {
                      name: '',
                      email: ''
                    },
                    createdAt: '',
                    updatedAt: ''
                  }}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  submittedRating={submittedRating ? {
                    id: submittedRating.id,
                    emotionalRangeDepth: submittedRating.emotionalRangeDepth,
                    characterBelievability: submittedRating.characterBelievability,
                    technicalSkill: submittedRating.technicalSkill,
                    screenPresence: submittedRating.screenPresence,
                    chemistryInteraction: submittedRating.chemistryInteraction
                  } : undefined}
                  onSuccess={() => {
                    // Success is handled by redirect
                  }}
                />
              </div>
            </div>
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show performance selection grid
  return (
    <AuthGuard>
      <SignedInLayout>
        <div className="min-h-screen bg-black">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif',
                  letterSpacing: '0.02em',
                }}
              >
                <span className="text-white">Rate the </span>
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  craft
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-[#a3a3a3] font-light">
                Your first rating unlocks ActorRating
              </p>
            </motion.div>

            {/* Performance Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {CURATED_PERFORMANCES.map((performance, index) => (
                <motion.button
                  key={`${performance.actorId}-${performance.movieId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  onClick={() => handlePerformanceSelect(performance)}
                  className="group relative h-full p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)] cursor-pointer text-left"
                  style={{
                    boxShadow: `
                      0 25px 70px -15px rgba(0, 0, 0, 0.9),
                      0 15px 40px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `,
                  }}
                >
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Movie Title */}
                    <div className="mb-4">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                        {performance.movieTitle}
                      </h3>
                      <p className="text-sm text-[#a3a3a3]">{performance.year}</p>
                    </div>

                    {/* Actor Name */}
                    <div className="mb-4">
                      <p className="text-base sm:text-lg text-[#FFD700] font-semibold">
                        {performance.actorName}
                      </p>
                      <p className="text-sm text-[#a3a3a3] italic">
                        as {performance.character}
                      </p>
                    </div>

                    {/* Rate Button */}
                    <div className="mt-auto pt-4">
                      <div 
                        className="w-full px-6 py-3 rounded-full text-black text-sm font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105 text-center"
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          Rate
                          <Star className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </SignedInLayout>
    </AuthGuard>
  )
}
