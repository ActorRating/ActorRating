"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { SearchBar } from '@/components/SearchBar'
import { SignedInLayout, HomeLayout } from '@/components/layout'
import { actorsApi, ratingsApi, searchApi } from '@/lib/api'
import { useUser } from '@/components/providers/SessionProvider'
import { useRouter } from 'next/navigation'
import { Actor, Movie, OscarRating, SearchResult, Rating } from '@/types'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, User, Film, Star, Search, CheckCircle, Share2, Sparkles, Trophy, TrendingUp, Play } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { CelebrationConfetti } from '@/components/ui/Confetti'

export default function RatePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useUser()
  const actorId = searchParams?.get('actor')
  const movieId = searchParams?.get('movie')
  const ratingId = searchParams?.get('rating') // For editing existing ratings
  
  const [actor, setActor] = useState<Actor | null>(null)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [characterName, setCharacterName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [lastRatingId, setLastRatingId] = useState<string | null>(null)
  const [submittedRating, setSubmittedRating] = useState<Rating | null>(null)
  const [existingRating, setExistingRating] = useState<Rating | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { executeRecaptcha } = useRecaptchaV3()

  // Scroll to top when success page loads
  useEffect(() => {
    if (submitted && submittedRating) {
      window.scrollTo(0, 0)
    }
  }, [submitted, submittedRating])

  // Scroll to actor name when rating form loads
  useEffect(() => {
    if (actor && movie && !submitted) {
      // Wait for the component to render, then scroll to actor name
      const timer = setTimeout(() => {
        const actorNameElement = document.getElementById('actor-name-header')
        if (actorNameElement) {
          const elementTop = actorNameElement.offsetTop
          const offset = 80 // Add 80px of space above the actor name
          window.scrollTo({ 
            top: elementTop - offset, 
            behavior: 'smooth' 
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [actor, movie, submitted])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If editing existing rating, fetch it first
        if (ratingId) {
          const ratingData = await ratingsApi.getById(ratingId)
          setExistingRating(ratingData)
          // Set actor and movie from the rating data
          if (ratingData.actor) {
            setActor({
              ...ratingData.actor,
              id: ratingData.actorId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
          if (ratingData.movie) {
            setMovie({
              ...ratingData.movie,
              id: ratingData.movieId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
          setCharacterName(ratingData.comment || '')
        } else {
          // Regular flow for new ratings
          if (actorId) {
            const actorData = await actorsApi.getById(actorId)
            setActor(actorData)
          }
          if (movieId) {
            // Fetch movie data using the movies API
            try {
              const response = await fetch(`/api/movies/${movieId}`)
              if (response.ok) {
                const movieData = await response.json()
                setMovie(movieData)
              }
            } catch (error) {
              console.error('Failed to fetch movie:', error)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (actorId || movieId || ratingId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [actorId, movieId, ratingId, actor?.id])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setSearching(true)
    try {
      const results = await searchApi.global(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }

  const handlePerformanceSelect = (performance: any) => {
    setActor(performance.actor)
    setMovie(performance.movie)
    // Prefer the character name from the selected performance if available
    if (performance.comment && performance.comment.trim().length > 0) {
      setCharacterName(performance.comment)
    }
    setSearchResults(null)
    setSearchQuery('')
  }

  const handleSubmit = async (rating: any) => {
    if (!actor || !movie) return

    setSubmitting(true)
    setError(null)
    try {
      const recaptchaToken = await executeRecaptcha('submit_rating')

      const created: Rating = await ratingsApi.create({
        actorId: actor.id,
        movieId: movie.id,
        emotionalRangeDepth: rating.emotionalRangeDepth,
        characterBelievability: rating.characterBelievability,
        technicalSkill: rating.technicalSkill,
        screenPresence: rating.screenPresence,
        chemistryInteraction: rating.chemistryInteraction,
        comment: characterName || undefined,
        recaptchaToken,
      })
      setLastRatingId(created.id)
      setSubmittedRating(created)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      const errorMessage = err?.response?.data?.error || 'Failed to submit rating. Please try again.'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  // Helper function to get the appropriate layout
  const getLayout = (children: React.ReactNode) => {
    return user ? (
      <SignedInLayout>{children}</SignedInLayout>
    ) : (
      <HomeLayout>{children}</HomeLayout>
    )
  }

  // Unified submit handler for the wrapper (handles both create and update)
  const handleWrapperSubmit = async (ratingData: {
    emotionalRangeDepth: number
    characterBelievability: number
    technicalSkill: number
    screenPresence: number
    chemistryInteraction: number
  }) => {
    if (!actor || !movie) return

    // If user is not signed in, redirect to signup with rating data
    if (!user) {
      // Store rating data in localStorage for after signup
      const ratingDataToStore = {
        ...ratingData,
        actorId: actor.id,
        movieId: movie.id,
        actorName: actor.name,
        movieTitle: movie.title,
        movieYear: movie.year,
        comment: characterName,
        timestamp: new Date().toISOString()
      }
      
      localStorage.setItem('pendingRating', JSON.stringify(ratingDataToStore))
      
      // Redirect to signup page
      router.push('/auth/signup')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const recaptchaToken = await executeRecaptcha('submit_rating')

      let result: Rating
      
      if (ratingId && existingRating) {
        // Update existing rating
        const response = await fetch(`/api/ratings/${ratingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emotionalRangeDepth: ratingData.emotionalRangeDepth,
            characterBelievability: ratingData.characterBelievability,
            technicalSkill: ratingData.technicalSkill,
            screenPresence: ratingData.screenPresence,
            chemistryInteraction: ratingData.chemistryInteraction,
            comment: characterName || undefined,
            recaptchaToken,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update rating')
        }
        
        result = await response.json()
      } else {
        // Create new rating
        result = await ratingsApi.create({
          actorId: actor.id,
          movieId: movie.id,
          emotionalRangeDepth: ratingData.emotionalRangeDepth,
          characterBelievability: ratingData.characterBelievability,
          technicalSkill: ratingData.technicalSkill,
          screenPresence: ratingData.screenPresence,
          chemistryInteraction: ratingData.chemistryInteraction,
          comment: characterName || undefined,
          recaptchaToken,
        })
      }
      
      setLastRatingId(result.id)
      setSubmittedRating(result)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      const errorMessage = err?.response?.data?.error || 'Failed to submit rating. Please try again.'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded mb-4 max-w-md mx-auto"></div>
                  <div className="h-4 bg-muted rounded mb-8 max-w-lg mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    )
  }

  if (submitted && submittedRating) {
    // Calculate total score
    const totalScore = Math.round(
      submittedRating.emotionalRangeDepth * 0.25 +
      submittedRating.characterBelievability * 0.25 +
      submittedRating.technicalSkill * 0.20 +
      submittedRating.screenPresence * 0.15 +
      submittedRating.chemistryInteraction * 0.15
    )

    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="min-h-screen bg-black">
            {/* Subtle spotlight gradient */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
              <div className="grid grid-cols-12 gap-6">
              
              {/* Header Section (kept from original) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-12 lg:col-span-8 lg:col-start-3 text-center mb-16"
              >
                {/* Actor Image */}
                {actor?.imageUrl && (
                  <div className="mb-6 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-600/30 blur-2xl rounded-lg" />
                      <Image
                        src={actor.imageUrl}
                        alt={actor.name}
                        width={120}
                        height={120}
                        className="relative rounded-lg object-cover shadow-2xl"
                      />
                    </div>
                  </div>
                )}

                {/* Actor Name */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                  {actor?.name}
                </h1>
                
                {/* Movie Title */}
                <h2 className="text-lg sm:text-xl text-gray-300 mb-2 font-medium">
                  {movie?.title}
                </h2>
              </motion.div>

              {/* Success Card */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  delay: 0.2
                }}
                className="col-span-12 lg:col-span-8 lg:col-start-3 bg-[#0d0d0d] rounded-2xl p-8 sm:p-12 shadow-2xl"
              >
                {/* Green Checkmark Animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 15,
                    delay: 0.4
                  }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                </motion.div>

                {/* Large "Rating Submitted" Text */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-3xl sm:text-4xl font-bold text-white text-center mb-8"
                >
                  Rating Submitted
                </motion.h2>

                {/* Two CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-4"
                >
                  {/* Rate Another Performance - Purple Gradient */}
                  <button
                    onClick={() => {
                      window.location.href = '/search'
                    }}
                    className="w-full py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-500 hover:via-violet-500 hover:to-purple-500 text-white shadow-lg shadow-purple-600/50 hover:shadow-xl hover:shadow-purple-600/60 transition-all duration-300"
                  >
                    Rate Another Performance
                  </button>

                  {/* Return Home - Minimal White Outline */}
                  <button
                    onClick={() => {
                      window.location.href = '/'
                    }}
                    className="w-full py-4 text-lg font-bold rounded-2xl border-2 border-white/30 text-white hover:border-white/50 hover:bg-white/5 transition-all duration-300"
                  >
                    Return Home
                  </button>
                </motion.div>
              </motion.div>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    )
  }

  // Show rating form when both actor and movie are selected
  if (actor && movie && !submitted) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
            <div className="grid grid-cols-12 gap-6">
              {/* Header with left-aligned back button */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-12 lg:col-span-10 lg:col-start-2 mb-8"
              >
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  onClick={() => { window.location.href = ratingId ? '/dashboard' : '/search'; }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {ratingId ? 'Back to Dashboard' : 'Back to Search'}
                </Button>
              </div>
              {ratingId && (
                <div className="text-center mb-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Edit Rating
                  </h1>
                  <p className="text-muted-foreground">
                    Update your rating for {actor?.name} in "{movie?.title}"
                  </p>
                </div>
              )}
              </motion.div>

              {/* Error Display */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-12 lg:col-span-10 lg:col-start-2 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-red-800">{error}</p>
                </motion.div>
              )}

          {/* Rating Form (with gutters) */}
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
                comment: characterName,
                user: {
                  name: '',
                  email: ''
                },
                createdAt: '',
                updatedAt: ''
              }}
              onSubmit={handleWrapperSubmit}
              submitting={submitting}
              initialRating={existingRating ? {
                emotionalRangeDepth: existingRating.emotionalRangeDepth,
                characterBelievability: existingRating.characterBelievability,
                technicalSkill: existingRating.technicalSkill,
                screenPresence: existingRating.screenPresence,
                chemistryInteraction: existingRating.chemistryInteraction
              } : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </Suspense>
    )
  }

  if (!actor || !movie) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
            <div className="grid grid-cols-12 gap-6">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-12 lg:col-span-8 lg:col-start-3 text-center mb-12"
              >
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Rate a Performance
            </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Search for an actor and movie to rate their performance using our Oscar-inspired criteria
              </p>
              </motion.div>

              {/* Search Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="col-span-12 mb-8"
              >
            <div className="max-w-2xl mx-auto mb-8">
              <SearchBar 
                placeholder="Search for actors..."
                onSearch={handleSearch}
                initialValue={searchQuery}
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searching && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Searching...</p>
              </div>
            )}

            {searchResults && !searching && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
                  Search Results
                </h2>
                
                {/* Performances */}
                {searchResults.performances && searchResults.performances.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      Performances ({searchResults.performances.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.performances.slice(0, 6).map((performance) => (
                        <button
                          key={`performance-${performance.id}`}
                          onClick={() => handlePerformanceSelect(performance)}
                          className="text-left p-4 bg-secondary rounded-lg border border-border hover:border-primary transition-colors"
                        >
                          <div className="font-semibold text-foreground mb-1">
                            {performance.actor?.name} in "{performance.movie?.title}"
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {performance.movie?.year} • {performance.movie?.director}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actors */}
                {searchResults.actors && searchResults.actors.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-accent" />
                      Actors ({searchResults.actors.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.actors.slice(0, 6).map((actor) => (
                        <button
                          key={`rate-actor-${actor.id}`}
                          onClick={() => setActor(actor)}
                          className="text-left p-4 bg-secondary rounded-lg border border-border hover:border-primary transition-colors"
                        >
                          <div className="font-semibold text-foreground mb-1">
                            {actor.name}
                          </div>
                          {actor.nationality && (
                            <div className="text-sm text-muted-foreground">
                              {actor.nationality}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}


                {searchResults.performances?.length === 0 && 
                 searchResults.actors?.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No results found. Try different keywords.</p>
                  </div>
                )}
              </div>
            )}
              </motion.div>

              {/* Browse Options */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-12 text-center"
              >
            <p className="text-muted-foreground mb-4">Or browse our categories</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
            </div>
              </motion.div>
            </div>
          </div>
        )}
      </Suspense>
    )
  }
}