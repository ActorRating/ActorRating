"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/components/providers/SessionProvider'
import { motion } from 'framer-motion'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { SignedInLayout } from '@/components/layout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { SearchBar } from '@/components/SearchBar'
import { FaStar } from 'react-icons/fa'

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
  const [showFirstRatingSuccess, setShowFirstRatingSuccess] = useState(false)
  const [isFirstRating, setIsFirstRating] = useState(false)
  
  // Carousel state for mobile
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeCard, setActiveCard] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

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
          } else {
            // User has no ratings, so this will be their first
            setIsFirstRating(true)
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

  // Track active card for nav dots and depth effect - same as performances page
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const updateActiveCard = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2

      const cards = cardRefs.current.filter(Boolean)
      let closestIndex = 0
      let closestDistance = Infinity

      cards.forEach((card, index) => {
        if (!card) return
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }

        // Desktop: apply depth effect
        const isDesktop = window.innerWidth >= 1024
        if (isDesktop) {
          const maxDistance = containerRect.width / 2
          const normalizedDistance = Math.min(distance / maxDistance, 1)
          const scale = 1 - (normalizedDistance * 0.08)
          const opacity = 1 - (normalizedDistance * 0.4)
          const translateY = normalizedDistance * 10

          card.style.transform = `scale(${scale}) translateY(${translateY}px)`
          card.style.opacity = `${opacity}`
        } else {
          // Reset on mobile
          card.style.transform = 'scale(1) translateY(0)'
          card.style.opacity = '1'
        }
      })

      // Update both activeCard (for desktop) and currentIndex (for nav dots)
      setActiveCard(closestIndex)
      setCurrentIndex(closestIndex)
    }

    container.addEventListener('scroll', updateActiveCard, { passive: true })
    window.addEventListener('resize', updateActiveCard, { passive: true })
    updateActiveCard()

    return () => {
      container.removeEventListener('scroll', updateActiveCard)
      window.removeEventListener('resize', updateActiveCard)
    }
  }, [])

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
          imageUrl: null,
          slug: null
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
          director: 'Unknown',
          slug: null
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
        imageUrl: null,
        slug: null
      })
      setMovie({
        id: performance.movieId,
        title: performance.movieTitle,
        year: performance.year,
        director: 'Unknown',
        slug: null
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

      // If this is the first rating, show success card instead of redirecting
      if (isFirstRating) {
        setShowFirstRatingSuccess(true)
      } else {
        // Redirect to dashboard after a short delay to show success
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
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

  // Show first rating success card
  if (showFirstRatingSuccess) {
    return (
      <AuthGuard>
        <SignedInLayout>
          <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.6
              }}
              className="w-full max-w-md"
            >
              {/* Success Card */}
              <div 
                className="relative rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden p-8 sm:p-10"
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
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-30 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  {/* Emoji and Title */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 15,
                      delay: 0.2
                    }}
                    className="mb-6"
                  >
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 
                      className="text-2xl sm:text-3xl font-bold text-white mb-6"
                      style={{ 
                        fontFamily: 'var(--font-cinzel), serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Your first rating is live!
                    </h2>
                  </motion.div>

                  {/* Achievement List */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-4 mb-8 text-left"
                  >
                    <div className="flex items-center gap-3 text-[#a3a3a3]">
                      <span className="text-emerald-400 text-xl">✓</span>
                      <span className="text-base sm:text-lg">Dashboard unlocked</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#a3a3a3]">
                      <span className="text-emerald-400 text-xl">✓</span>
                      <span className="text-base sm:text-lg">Viewer badge earned</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#a3a3a3]">
                      <span className="text-emerald-400 text-xl">✓</span>
                      <span className="text-base sm:text-lg">9 more ratings to Critic</span>
                    </div>
                  </motion.div>

                  {/* Go to Dashboard Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full px-6 py-3.5 rounded-full font-semibold text-base sm:text-lg text-black bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFA500] hover:from-[#FFD700] hover:via-[#FFA500] hover:to-[#FF8C00] transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Go to Dashboard
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show first rating success card
  if (showFirstRatingSuccess) {
    return (
      <AuthGuard>
        <SignedInLayout>
          <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.6
              }}
              className="w-full max-w-md"
            >
              {/* Success Card */}
              <div 
                className="relative rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden p-8 sm:p-10"
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
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-30 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  {/* Emoji and Title */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 15,
                      delay: 0.2
                    }}
                    className="mb-6"
                  >
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 
                      className="text-2xl sm:text-3xl font-bold text-white mb-6"
                      style={{ 
                        fontFamily: 'var(--font-cinzel), serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Your first rating is live!
                    </h2>
                  </motion.div>

                  {/* Achievement List */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-4 mb-8 text-left"
                  >
                    <div className="flex items-center gap-3 text-[#a3a3a3]">
                      <span className="text-emerald-400 text-xl">✓</span>
                      <span className="text-base sm:text-lg">Dashboard unlocked</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#a3a3a3]">
                      <span className="text-emerald-400 text-xl">✓</span>
                      <span className="text-base sm:text-lg">Viewer badge earned</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#a3a3a3]">
                      <span className="text-emerald-400 text-xl">✓</span>
                      <span className="text-base sm:text-lg">9 more ratings to Critic</span>
                    </div>
                  </motion.div>

                  {/* Go to Dashboard Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full px-6 py-3.5 rounded-full font-semibold text-base sm:text-lg text-black bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFA500] hover:from-[#FFD700] hover:via-[#FFA500] hover:to-[#FF8C00] transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Go to Dashboard
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
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
          <div className="min-h-screen bg-black">
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
        </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  // Show performance selection - Desktop: Grid, Mobile: Carousel
  return (
    <AuthGuard>
      <SignedInLayout>
        <div className="min-h-screen bg-black">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <h1 
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif',
                  letterSpacing: '0.02em',
                }}
              >
                <span className="text-white">Welcome, </span>
                {user?.email && (
                  <span className="text-white">
                    {user.email.split('@')[0]}! 👋
                  </span>
                )}
              </h1>
              <p className="text-lg sm:text-xl text-[#a3a3a3] font-light mb-8">
                Choose a performance you've seen to rate
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-12">
                <SearchBar 
                  placeholder="🔍 Search actors or movies..."
                  showClear
                  autoFocus={false}
                  className="w-full [&_input]:bg-[#1a1a1a] [&_input]:border-[#333] [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-[#FFD700]/50"
                />
              </div>

              {/* Divider Text */}
              <p className="text-base sm:text-lg text-[#a3a3a3] font-light mb-8">
                Or start with these classics:
              </p>
            </motion.div>

          {/* Desktop: Grid layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CURATED_PERFORMANCES.map((performance, index) => {
              const rateUrl = getRateUrl(
                { id: performance.actorId, name: performance.actorName, slug: null },
                { id: performance.movieId, title: performance.movieTitle, year: performance.year, slug: null }
              )
              const character = performance.character || "—"

              return (
                <motion.div
                  key={`${performance.actorId}-${performance.movieId}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {/* Premium Card - Clean & Cinematic - Matching actor pages */}
                  <div 
                    className="relative h-full p-8 sm:p-10 md:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
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
                    {/* Glow effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex-1">
                        {/* Top Row: Rating Badge and Year */}
                        <div className="flex items-center justify-between mb-6">
                          {/* Score Pill - Top Left */}
                          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
                            <FaStar className="w-5 h-5 text-[#666]" />
                            <span className="text-2xl font-bold text-[#a3a3a3]">N/A</span>
                          </div>
                          
                          {/* Movie Year - Top Right */}
                          <div className="text-[#a3a3a3] text-base font-medium">
                            {performance.year}
                          </div>
                        </div>

                        {/* Actor Name */}
                        <h3 
                          className="text-2xl sm:text-3xl font-bold text-white mb-2"
                          style={{ fontFamily: 'var(--font-cinzel), serif' }}
                        >
                          {performance.actorName}
                        </h3>

                        {/* Movie Title */}
                        <div className="mb-4">
                          <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                            {performance.movieTitle}
                          </span>
                        </div>

                        {/* Character */}
                        <div className="mb-6">
                          <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                            as {character}
                          </p>
                        </div>
                      </div>

                      {/* Rate Button */}
                      <div className="mt-auto pt-4">
                        <button
                          onClick={() => handlePerformanceSelect(performance)}
                          className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                          }}
                        >
                          <span className="flex items-center justify-center gap-2">
                            Rate
                            <FaStar className="w-4 h-4" />
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Decorative accent */}
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Mobile: Carousel with nav dots */}
          <div className="lg:hidden relative -mx-4 sm:-mx-0">
            {/* Carousel Container */}
            <div
              ref={scrollContainerRef}
              className="recent-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)]"
            >
              {CURATED_PERFORMANCES.map((performance, index) => {
                const character = performance.character || "—"

                return (
                  <div
                    key={`${performance.actorId}-${performance.movieId}`}
                    ref={(el) => cardRefs.current[index] = el}
                    className="flex-shrink-0 w-[85vw] sm:w-[70vw] snap-center group lg:cursor-pointer"
                    style={{
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                    }}
                    onClick={() => {
                      if (window.innerWidth >= 1024) {
                        const element = cardRefs.current[index]
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                        }
                      }
                    }}
                  >
                    {/* Premium Card - Clean & Cinematic - Matching actor pages */}
                    <div 
                      className="relative h-full p-8 sm:p-10 md:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
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
                      {/* Glow effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex-1">
                          {/* Top Row: Rating Badge and Year */}
                          <div className="flex items-center justify-between mb-6">
                            {/* Score Pill - Top Left */}
                            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
                              <FaStar className="w-5 h-5 text-[#666]" />
                              <span className="text-2xl font-bold text-[#a3a3a3]">N/A</span>
                            </div>
                            
                            {/* Movie Year - Top Right */}
                            <div className="text-[#a3a3a3] text-base font-medium">
                              {performance.year}
                            </div>
                          </div>

                          {/* Actor Name */}
                          <h3 
                            className="text-2xl sm:text-3xl font-bold text-white mb-2"
                            style={{ fontFamily: 'var(--font-cinzel), serif' }}
                          >
                            {performance.actorName}
                          </h3>

                          {/* Movie Title */}
                          <div className="mb-4">
                            <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                              {performance.movieTitle}
                            </span>
                          </div>

                          {/* Character */}
                          <div className="mb-6">
                            <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                              as {character}
                            </p>
                          </div>
                        </div>

                        {/* Rate Button */}
                        <div className="mt-auto pt-4">
                          <button
                            onClick={() => handlePerformanceSelect(performance)}
                            className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                            }}
                          >
                            <span className="flex items-center justify-center gap-2">
                              Rate
                              <FaStar className="w-4 h-4" />
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Decorative accent */}
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Navigation Dots - Mobile Only */}
            <div className="relative flex justify-center items-center mt-8 px-4">
              <div className="relative rounded-xl bg-gradient-to-br from-[#1a1a1a]/80 via-[#0f0f0f]/70 to-black/80 backdrop-blur-xl border border-white/5"
                style={{
                  boxShadow: `
                    0 10px 30px -5px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.03),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                  `,
                  padding: '6px 12px',
                }}
              >
                <div className="relative z-10 flex justify-center items-center" style={{ gap: '6px' }}>
                  {CURATED_PERFORMANCES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        const container = scrollContainerRef.current
                        if (container) {
                          const cards = container.querySelectorAll('.recent-scroll-container > div')
                          const targetCard = cards[index] as HTMLElement
                          if (targetCard) {
                            targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                            setCurrentIndex(index)
                          }
                        }
                      }}
                      style={{
                        width: index === currentIndex ? '20px' : '8px',
                        height: '8px',
                        minWidth: '8px',
                        minHeight: '8px',
                        padding: '8px',
                        border: 'none',
                        backgroundColor: index === currentIndex ? '#FFD700' : 'rgba(115, 115, 115, 0.4)',
                        borderRadius: '9999px',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (index !== currentIndex) {
                          e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.6)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== currentIndex) {
                          e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.4)'
                        }
                      }}
                      aria-label={`Go to performance ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
