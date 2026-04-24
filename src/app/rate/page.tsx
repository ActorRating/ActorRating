"use client"

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { SearchBar } from '@/components/SearchBar'
import { RatePageLayout } from '@/components/layout'
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
import { SignUpToSaveModal } from '@/components/auth/SignUpToSaveModal'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { trackRateStart } from '@/lib/analytics'

function RatePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useUser()
  const actorId = searchParams?.get('actor')
  const movieId = searchParams?.get('movie')
  const ratingId = searchParams?.get('rating') // For editing existing ratings
  const submittedParam = searchParams?.get('submitted') === 'true'

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
  const [showSignUpModal, setShowSignUpModal] = useState(false)
  const [pendingRatingData, setPendingRatingData] = useState<any>(null)

  // Track rate_start ref - must be declared before any conditional returns
  const hasTrackedRateStart = useRef(false)

  // Check for submitted rating from sessionStorage (after sign-in)
  useEffect(() => {
    if (submittedParam && typeof window !== 'undefined') {
      const storedRating = sessionStorage.getItem('submittedRating')
      if (storedRating) {
        try {
          const rating = JSON.parse(storedRating)
          setSubmittedRating(rating)
          setSubmitted(true)
          // Clear sessionStorage after reading
          sessionStorage.removeItem('submittedRating')
        } catch (error) {
          console.error('Failed to parse submitted rating:', error)
        }
      }
    }
  }, [submittedParam])

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
          // Regular flow for new ratings - fetch in parallel for speed
          const fetchPromises: Promise<any>[] = []

          if (actorId) {
            // Use minimal mode for faster loading
            fetchPromises.push(
              fetch(`/api/actors/${actorId}?minimal=true`)
                .then(res => res.ok ? res.json() : null)
                .then(data => data && setActor({
                  id: data.id,
                  name: data.name,
                  imageUrl: data.imageUrl,
                  slug: data.slug,
                  createdAt: data.createdAt || new Date().toISOString(),
                  updatedAt: data.updatedAt || new Date().toISOString(),
                }))
                .catch(err => console.error('Failed to fetch actor:', err))
            )
          }

          if (movieId) {
            fetchPromises.push(
              fetch(`/api/movies/${movieId}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => data && setMovie({
                  id: data.id,
                  title: data.title,
                  year: data.year,
                  director: data.director || 'Unknown',
                  slug: data.slug,
                  createdAt: data.createdAt || new Date().toISOString(),
                  updatedAt: data.updatedAt || new Date().toISOString(),
                }))
                .catch(err => {
                  console.error('Failed to fetch movie:', err)
                  setError('Failed to fetch movie data. Please try again.')
                })
            )
          }

          // Wait for all fetches to complete
          await Promise.all(fetchPromises)
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
  }, [actorId, movieId, ratingId]) // Removed actor?.id dependency to prevent infinite loop

  // Track rate_start when actor and movie are selected (only once, not when editing)
  // MUST be before any conditional returns
  useEffect(() => {
    if (actor && movie && !submitted && !hasTrackedRateStart.current && !ratingId) {
      trackRateStart(actor.name, movie.title, movie.year)
      hasTrackedRateStart.current = true
    }
  }, [actor?.id, movie?.id, submitted, ratingId])

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
      const recaptchaToken = user ? '' : await executeRecaptcha('submit_rating')

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

  // Helper function to get the appropriate layout - always use RatePageLayout (no navbar)
  const getLayout = (children: React.ReactNode) => {
    return <RatePageLayout>{children}</RatePageLayout>
  }

  // Unified submit handler for the wrapper (handles both create and update)
  const handleWrapperSubmit = async (ratingData: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
  }): Promise<void> => {
    if (!actor || !movie) {
      return Promise.resolve()
    }

    // Map the shorter field names to API field names
    const apiRatingData = {
      emotionalRangeDepth: ratingData.emotionalDepth,
      characterBelievability: ratingData.believability,
      technicalSkill: ratingData.technicalSkill,
      screenPresence: ratingData.screenPresence,
      chemistryInteraction: ratingData.chemistry,
    }

    // If user is not signed in, show modal immediately
    if (!user) {
      const ratingDataToStore = {
        ...ratingData,
        actorId: actor.id,
        movieId: movie.id,
        actorName: actor.name,
        movieTitle: movie.title,
        movieYear: movie.year,
        comment: characterName,
      }

      // Show modal immediately - no setTimeout
      setPendingRatingData(ratingDataToStore)
      setShowSignUpModal(true)

      // Return a rejected promise without error to prevent success animation but avoid console error
      // Use a special rejection that can be identified
      return Promise.reject(new Error('USER_NOT_SIGNED_IN'))
    }

    setSubmitting(true)
    setError(null)
    try {
      // Validate rating data before sending
      const validationErrors: string[] = []
      if (isNaN(apiRatingData.emotionalRangeDepth) || apiRatingData.emotionalRangeDepth < 0 || apiRatingData.emotionalRangeDepth > 100) {
        validationErrors.push('Emotional Range Depth must be between 0 and 100')
      }
      if (isNaN(apiRatingData.characterBelievability) || apiRatingData.characterBelievability < 0 || apiRatingData.characterBelievability > 100) {
        validationErrors.push('Character Believability must be between 0 and 100')
      }
      if (isNaN(apiRatingData.technicalSkill) || apiRatingData.technicalSkill < 0 || apiRatingData.technicalSkill > 100) {
        validationErrors.push('Technical Skill must be between 0 and 100')
      }
      if (isNaN(apiRatingData.screenPresence) || apiRatingData.screenPresence < 0 || apiRatingData.screenPresence > 100) {
        validationErrors.push('Screen Presence must be between 0 and 100')
      }
      if (isNaN(apiRatingData.chemistryInteraction) || apiRatingData.chemistryInteraction < 0 || apiRatingData.chemistryInteraction > 100) {
        validationErrors.push('Chemistry Interaction must be between 0 and 100')
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }

      console.log('Submitting rating with data:', {
        actorId: actor.id,
        movieId: movie.id,
        ...apiRatingData,
        hasRecaptcha: true
      })

      const recaptchaToken = user ? '' : await executeRecaptcha('submit_rating')

      let result: Rating

      if (ratingId && existingRating) {
        // Update existing rating
        const response = await fetch(`/api/ratings/${ratingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emotionalRangeDepth: apiRatingData.emotionalRangeDepth,
            characterBelievability: apiRatingData.characterBelievability,
            technicalSkill: apiRatingData.technicalSkill,
            screenPresence: apiRatingData.screenPresence,
            chemistryInteraction: apiRatingData.chemistryInteraction,
            comment: characterName || undefined,
            recaptchaToken,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Update rating error:', { status: response.status, error: errorData })
          throw new Error(errorData.error || errorData.debug || 'Failed to update rating')
        }

        result = await response.json()
      } else {
        // Create new rating
        result = await ratingsApi.create({
          actorId: actor.id,
          movieId: movie.id,
          emotionalRangeDepth: apiRatingData.emotionalRangeDepth,
          characterBelievability: apiRatingData.characterBelievability,
          technicalSkill: apiRatingData.technicalSkill,
          screenPresence: apiRatingData.screenPresence,
          chemistryInteraction: apiRatingData.chemistryInteraction,
          comment: characterName || undefined,
          recaptchaToken,
        })
      }

      setLastRatingId(result.id)
      setSubmittedRating(result)
      // Don't set submitted=true here - let the component handle the success animation
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      const errorMessage = err?.message || err?.response?.data?.error || err?.response?.data?.debug || 'Failed to submit rating. Please try again.'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={index}
                    className="w-3 h-3 bg-[#FFD700] rounded-full"
                    animate={{
                      y: [0, -12, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.15,
                    }}
                  />
                ))}
              </div>
              <p className="text-foreground text-base">Loading</p>
            </div>
          </div>
        )}
      </Suspense>
    )
  }

  // Success is now handled in-place by PerformanceRatingClientWrapper

  // Show rating form when both actor and movie are selected (or success state)
  if (actor && movie) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="relative">
            {/* Edit Rating Header - Only show when editing */}
            {ratingId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 sm:top-6 left-0 right-0 z-50 pointer-events-none"
              >
                <div className="text-center">
                  <h1 className="text-lg sm:text-xl font-semibold text-white/80 mb-1">
                    Edit Rating
                  </h1>
                </div>
              </motion.div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-12 sm:top-16 left-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-lg pointer-events-auto max-w-md mx-auto"
              >
                <p className="text-red-800">{error}</p>
              </motion.div>
            )}

            {/* Rating Form - Full width like slug-based rate page */}
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
                emotionalDepth: existingRating.emotionalRangeDepth,
                believability: existingRating.characterBelievability,
                technicalSkill: existingRating.technicalSkill,
                screenPresence: existingRating.screenPresence,
                chemistry: existingRating.chemistryInteraction
              } : undefined}
              submittedRating={submittedRating ? {
                id: submittedRating.id,
                emotionalRangeDepth: submittedRating.emotionalRangeDepth,
                characterBelievability: submittedRating.characterBelievability,
                technicalSkill: submittedRating.technicalSkill,
                screenPresence: submittedRating.screenPresence,
                chemistryInteraction: submittedRating.chemistryInteraction
              } : undefined}
              onSuccess={() => {
                // Success animation is handled in the component
              }}
            />
          </div>
        )}

        {/* Auth Modal */}
        {showSignUpModal && pendingRatingData && actor && movie && (
          <SignUpToSaveModal
            isOpen={showSignUpModal}
            onClose={() => {
              setShowSignUpModal(false)
              setPendingRatingData(null)
            }}
            totalScore={Number(((pendingRatingData.emotionalDepth + pendingRatingData.believability + pendingRatingData.technicalSkill + pendingRatingData.screenPresence + pendingRatingData.chemistry) / 5 / 10).toFixed(1))}
            actorName={actor.name}
            movieTitle={movie.title}
            movieYear={movie.year}
            ratingData={pendingRatingData}
          />
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
                    placeholder="Search for actors and movies..."
                    onSearch={handleSearch}
                    initialValue={searchQuery}
                    autoFocus
                  />
                </div>

                {/* Search Results */}
                {searching && (
                  <div className="text-center py-8">
                    <BouncingBallsLoader
                      size="md"
                      color="#FFD700"
                      showText={true}
                      text="Searching..."
                    />
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

export default function RatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-3 h-3 bg-[#FFD700] rounded-full"
                animate={{
                  y: [0, -12, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.15,
                }}
              />
            ))}
          </div>
          <p className="text-foreground text-base">Loading</p>
        </div>
      </div>
    }>
      <RatePageContent />
    </Suspense>
  )
}