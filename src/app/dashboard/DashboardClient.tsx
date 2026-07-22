"use client"

import { useSession } from "@/components/providers/SessionProvider"
import { useRouter, usePathname } from "next/navigation"
import React, { useState, useEffect, useRef } from "react"
import { SignedInLayout } from "@/components/layout"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { SearchBar } from "@/components/SearchBar"
import { motion } from "framer-motion"
import { fadeInUp } from "@/lib/animations"
import { Star, TrendingUp, Film, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { getActorUrl, getRateUrl } from "@/lib/slugHelper"
import { PerformanceCard } from "@/components/performance/PerformanceCard"
import { ActorHeadshot } from "@/components/ui/ActorHeadshot"
import { upgradeActorImageRes } from "@/lib/tmdb"
import { FeaturedPerformancesCarousel } from "@/components/dashboard/FeaturedPerformancesCarousel"
import { UserBadges } from "@/components/dashboard/UserBadges"
import { UserProgressBar } from "@/components/dashboard/UserProgressBar"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import type { DashboardRating, DashboardActor } from "@/lib/dashboardData"

interface Actor {
  id: string
  name: string
  imageUrl?: string | null
  slug?: string | null
  performanceCount?: number
  careerScore?: number | null
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
    director: string | null
    slug?: string | null
    posterUrl?: string | null
  }
}

// Popular actors - hardcoded list
const POPULAR_ACTORS = [
  { name: "Cillian Murphy", id: "cillian-murphy" },
  { name: "Leonardo DiCaprio", id: "leonardo-dicaprio" },
  { name: "Florence Pugh", id: "florence-pugh" },
  { name: "Robert De Niro", id: "robert-de-niro" },
  { name: "Zendaya", id: "zendaya" },
  { name: "Christian Bale", id: "christian-bale" }
]

type DashboardClientProps = {
  initialRatings?: DashboardRating[] | null
  initialPopularActors?: DashboardActor[] | null
}

export default function DashboardClient({
  initialRatings = null,
  initialPopularActors = null,
}: DashboardClientProps) {
  const { user, session, loading: sessionLoading, isInitialized } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const hasInitialData = initialRatings != null && initialPopularActors != null
  const [ratings, setRatings] = useState<Rating[]>(initialRatings ?? [])
  const [isLoadingData, setIsLoadingData] = useState(!hasInitialData)
  const [showBriefLoading, setShowBriefLoading] = useState(false)
  const [popularActors, setPopularActors] = useState<Actor[]>(initialPopularActors ?? [])
  const [visibleRatingsCount, setVisibleRatingsCount] = useState(6)
  const prevPathnameRef = useRef<string | null>(null)
  const normalizedName = user?.name?.trim()
  const safeName = normalizedName && normalizedName.toLowerCase() !== "user" ? normalizedName : ""
  const welcomeName = safeName || user?.email?.split('@')[0] || 'there'

  const fetchUserData = async () => {
    try {
      setIsLoadingData(true)
      
      // Fetch user ratings
      const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json()
        setRatings(ratingsData)
      }

      // Fetch popular actors by specific names - always fresh (no cache)
      const actorNames = POPULAR_ACTORS.map(a => a.name).join(',')
      const actorsRes = await fetch(`/api/actors/popular?names=${encodeURIComponent(actorNames)}`, { 
        cache: 'no-store',
        next: { revalidate: 0 } // Always fetch fresh data
      })
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

  // Detect route changes and show brief loading state
  useEffect(() => {
    // Only show loading if coming from a different page (not initial load)
    if (prevPathnameRef.current && 
        prevPathnameRef.current !== pathname && 
        pathname === '/dashboard' && 
        prevPathnameRef.current !== '/dashboard' &&
        prevPathnameRef.current !== null) {
      // User navigated back to dashboard from another page
      setShowBriefLoading(true)
      const timer = setTimeout(() => {
        setShowBriefLoading(false)
      }, 150) // Brief 150ms loading state
      return () => clearTimeout(timer)
    }
    // Update previous pathname
    if (prevPathnameRef.current === null && pathname === '/dashboard') {
      // Initial mount - set after a delay to avoid triggering on first render
      const timer = setTimeout(() => {
        prevPathnameRef.current = pathname
      }, 50)
      return () => clearTimeout(timer)
    } else if (pathname) {
      prevPathnameRef.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    if (hasInitialData) return
    if (user && isInitialized) {
      fetchUserData()
    } else if (isInitialized && !sessionLoading) {
      setIsLoadingData(false)
    }
  }, [user, sessionLoading, isInitialized, router, hasInitialData])

  const calculateAverage = (rating: Rating) => {
    // Ratings are stored as 0-100, so divide by 10 to get 0-10 scale
    return (
      (rating.emotionalRangeDepth +
        rating.characterBelievability +
        rating.technicalSkill +
        rating.screenPresence +
        rating.chemistryInteraction) / 5 / 10
    ).toFixed(1)
  }

  // JSON-LD Schemas for Dashboard
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Dashboard - ActorRating",
    url: "https://actorrating.com/dashboard",
    description: "Your personal dashboard for rating and tracking acting performances",
    isPartOf: {
      "@type": "WebSite",
      name: "ActorRating",
      url: "https://actorrating.com"
    }
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Use Your ActorRating Dashboard",
    description: "Learn how to navigate and use your personal dashboard to rate and track acting performances",
    step: [
      {
        "@type": "HowToStep",
        name: "Search for Actors",
        text: "Use the search bar to find actors you want to rate",
        position: 1
      },
      {
        "@type": "HowToStep",
        name: "Browse Popular Actors",
        text: "Explore popular actors and their performances",
        position: 2
      },
      {
        "@type": "HowToStep",
        name: "View Your Ratings",
        text: "See all your past ratings and performance scores",
        position: 3
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What can I do on my dashboard?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your dashboard allows you to search for actors, browse popular performers, view your past ratings, and discover new performances to rate."
        }
      },
      {
        "@type": "Question",
        name: "How do I rate a performance from my dashboard?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Click on any actor card or use the search bar to find a specific actor and movie. Then navigate to their performance page to rate with the quick single slider or across five criteria."
        }
      }
    ]
  };

  // Show loading spinner while data is being fetched
  if (isLoadingData && isInitialized) {
    return (
      <AuthGuard>
        <SignedInLayout>
          <div className="min-h-screen bg-black flex items-center justify-center">
            <BouncingBallsLoader 
              size="lg" 
              color="#FFD700"
              showText={true}
              text="Loading dashboard..."
            />
          </div>
        </SignedInLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <SignedInLayout>
        {/* JSON-LD Schemas for Dashboard */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webPageSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(howToSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema)
          }}
        />
        <main className="min-h-screen bg-black">
          {/* Hero Section */}
          <header className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-[6.5rem] sm:pt-[7.5rem] pb-8 sm:pb-10">
            <div className="text-center mb-8">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-3">
                Dashboard
              </p>
              <h1
                className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight leading-[1.15] mb-3"
                style={{
                  fontFamily:
                    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
                }}
              >
                Welcome, {welcomeName}
              </h1>
              <p className="text-[15px] sm:text-base text-zinc-500 leading-relaxed max-w-xl mx-auto">
                Rate performances, discover actors, share your taste.
              </p>
            </div>

            <nav aria-label="Search navigation" className="max-w-xl mx-auto text-left relative z-30">
              <div
                className="relative rounded-[2rem] border border-white/[0.06] bg-[#1a1a1a] overflow-hidden"
                style={{
                  boxShadow:
                    "0 20px 50px -18px rgba(0,0,0,0.85), inset 0 1px 0 0 rgba(255,255,255,0.06)",
                }}
              >
                <SearchBar
                  placeholder="Search actors and films…"
                  showClear
                  showSuggestions
                  autoFocus={false}
                  className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:text-base sm:[&_input]:text-lg [&_input]:min-h-[52px]"
                />
              </div>
            </nav>
          </header>

          {/* Brief Loading State on Navigation - Subtle glitch effect */}
          {showBriefLoading && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-50 flex items-center justify-center pointer-events-none">
              <BouncingBallsLoader 
                size="sm" 
                color="#FFD700"
                showText={false}
              />
            </div>
          )}

          {/* Progress Bar */}
          <UserProgressBar />

          {/* Featured Performances Carousel - Only show if user hasn't rated yet */}
          {ratings.length === 0 && <FeaturedPerformancesCarousel />}

          {/* Popular Actors */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="popular-actors-heading">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8 justify-start">
                  <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                  <h2
                    id="popular-actors-heading"
                    className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center sm:text-left"
                    style={{
                      fontFamily:
                        'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
                    }}
                  >
                    Popular Actors
                  </h2>
                </div>
              </div>

              {isLoadingData ? (
                <div className="flex justify-center py-16">
                  <BouncingBallsLoader size="md" color="#FFD700" showText={false} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {POPULAR_ACTORS.map((actor, index) => {
                    // Find matching actor from API if available - improved matching
                    const apiActor = popularActors.find(a => {
                      const apiName = a.name.toLowerCase().trim()
                      const hardcodedName = actor.name.toLowerCase().trim()
                      // Exact match
                      if (apiName === hardcodedName) return true
                      // Slug match
                      if (a.slug === actor.id) return true
                      // Partial match (handles variations like "Cillian Murphy" vs "Cillian Murphy")
                      if (apiName.includes(hardcodedName) || hardcodedName.includes(apiName)) return true
                      return false
                    })
                    
                    return (
                      <motion.div
                        key={actor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
                        whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
                      >
                        <Link
                          href={getActorUrl({ id: apiActor?.id || actor.id, name: actor.name, slug: apiActor?.slug || actor.id })}
                          className="group block h-full"
                        >
                            <div className="relative h-full p-5 sm:p-6 rounded-md border border-white/[0.08] bg-[#141414] overflow-hidden transition-colors duration-200 group-hover:border-white/20 cursor-pointer">

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex justify-center mb-5">
                                <ActorHeadshot
                                  name={actor.name}
                                  imageUrl={upgradeActorImageRes(apiActor?.imageUrl)}
                                  size="lg"
                                  loading="lazy"
                                  rounded="rounded-md"
                                />
                              </div>
                              {/* Actor Name */}
                              <div className="mb-6">
                                <h3
                                  className="font-bold text-white text-xl sm:text-2xl mb-3 tracking-tight transition-colors duration-200"
                                  style={{
                                    fontFamily:
                                      'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
                                  }}
                                >
                                  {actor.name}
                                </h3>
                                {/* Performance Count - Always visible */}
                                <div className="flex items-center gap-2">
                                  <Film className="w-4 h-4 text-[#FFD700]" />
                                  <p className="text-sm text-[#FFD700]">
                                    {isLoadingData 
                                      ? 'Loading...'
                                      : apiActor?.performanceCount !== undefined && apiActor.performanceCount > 0
                                        ? `${apiActor.performanceCount} ${apiActor.performanceCount === 1 ? 'performance' : 'performances'}`
                                        : apiActor?.performanceCount === 0
                                        ? '0 performances'
                                        : 'No data'}
                                  </p>
                                </div>
                              </div>

                              {/* Stats - Always show section */}
                              <div className="mt-auto pt-6 border-t border-white/10 transition-colors duration-200">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-400 mb-2">Career Score</p>
                                    {apiActor?.careerScore !== null && apiActor?.careerScore !== undefined ? (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FFD700]/10 border border-[#FFD700]/25">
                                        <Star className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                                        <span 
                                          className="text-2xl font-bold text-[#FFD700]"
                                          style={{
                                            fontFamily: 'var(--font-geist-sans), sans-serif',
                                            fontVariantNumeric: 'tabular-nums',
                                          }}
                                        >
                                          {(apiActor.careerScore / 10).toFixed(1)}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                                        <Star className="w-5 h-5 text-[#666]" />
                                        <span className="text-2xl font-bold text-[#a3a3a3]">N/A</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Round button with arrow - Mobile accessible */}
                                  <div 
                                    className="flex-shrink-0 w-11 h-11 rounded-md flex items-center justify-center transition-transform duration-200 active:scale-95 touch-manipulation"
                                    style={{
                                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                                    }}
                                  >
                                    <ArrowUpRight className="w-6 h-6 sm:w-5 sm:h-5 text-black transition-transform duration-200 group-hover:rotate-45" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </section>

          {/* Recent Ratings */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="recent-ratings-heading">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8 justify-start">
                  <Star className="w-6 h-6 text-[#FFD700]" />
                  <h2
                    id="recent-ratings-heading"
                    className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center sm:text-left"
                    style={{
                      fontFamily:
                        'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
                    }}
                  >
                    Recent Ratings
                  </h2>
                </div>
              </div>

              {isLoadingData ? (
                <div className="flex justify-center py-16">
                  <BouncingBallsLoader size="md" color="#FFD700" showText={false} />
                </div>
              ) : ratings.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {ratings.slice(0, visibleRatingsCount).map((rating, index) => (
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
                          actor: {
                            name: rating.actor.name,
                            imageUrl: rating.actor.imageUrl ?? undefined,
                          },
                          movie: {
                            ...rating.movie,
                            director: rating.movie.director ?? undefined,
                            posterUrl: rating.movie.posterUrl ?? undefined,
                          },
                          userId: user?.id || '',
                          emotionalRangeDepth: rating.emotionalRangeDepth,
                          characterBelievability: rating.characterBelievability,
                          technicalSkill: rating.technicalSkill,
                          screenPresence: rating.screenPresence,
                          chemistryInteraction: rating.chemistryInteraction,
                          comment: rating.comment ?? undefined,
                          character: rating.comment ?? undefined,
                          createdAt: rating.createdAt,
                          updatedAt: rating.createdAt,
                        }}
                        averageRating={parseFloat(calculateAverage(rating))}
                        variant="default"
                        className="h-full"
                        ratingId={rating.id}
                        showEditButton={true}
                        imageMode="split"
                      />
                    </motion.div>
                  ))}
                </div>
                {ratings.length > 6 && visibleRatingsCount < ratings.length && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleRatingsCount(prev => Math.min(prev + 6, ratings.length))}
                      className="px-7 py-3.5 rounded-md text-black text-[15px] font-bold transition-transform duration-200 hover:scale-[1.02] cursor-pointer min-h-[44px]"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      }}
                    >
                      <span className="flex items-center justify-center gap-3 whitespace-nowrap">
                        Show More
                        <ArrowUpRight className="w-5 h-5 transition-transform duration-200 group-hover:rotate-45" />
                      </span>
                    </button>
                  </div>
                )}
                </>
              ) : (
                <div className="text-center py-16">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-xl text-gray-400 mb-6">You haven't rated any performances yet</p>
                  <Link href="/search" className="inline-block relative">
                    <button className="group px-8 py-3.5 rounded-md text-black text-[15px] font-bold transition-transform duration-200 hover:scale-[1.02] min-h-[44px] relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      }}
                    >
<span className="flex items-center justify-center gap-3 whitespace-nowrap relative z-10">
                        Start Rating
                        <Star className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      </span>
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          </section>
        </main>
      </SignedInLayout>
    </AuthGuard>
  )
}
