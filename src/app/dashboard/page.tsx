"use client"

export const dynamic = "force-dynamic"

import { useUser, useSession } from "@/components/providers/SessionProvider"
import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { SignedInLayout } from "@/components/layout"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { SearchBar } from "@/components/SearchBar"
import { motion } from "framer-motion"
import { fadeInUp } from "@/lib/animations"
import { Star, TrendingUp, Film, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { getActorUrl, getRateUrl } from "@/lib/slugHelper"
import { PerformanceCard } from "@/components/performance/PerformanceCard"

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
    director: string
    slug?: string | null
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

export default function DashboardPage() {
  const user = useUser()
  const { session, loading: sessionLoading, isInitialized } = useSession()
  const router = useRouter()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [popularActors, setPopularActors] = useState<Actor[]>([])

  useEffect(() => {
    if (user && isInitialized) {
      fetchUserData()
    } else if (isInitialized && !sessionLoading) {
      setIsLoadingData(false)
    }
  }, [user, sessionLoading, isInitialized])

  const fetchUserData = async () => {
    try {
      setIsLoadingData(true)
      
      // Fetch user ratings
      const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json()
        setRatings(ratingsData.slice(0, 6)) // Only show 6 most recent
      }

      // Fetch popular actors by specific names
      const actorNames = POPULAR_ACTORS.map(a => a.name).join(',')
      const actorsRes = await fetch(`/api/actors/popular?names=${encodeURIComponent(actorNames)}`, { cache: 'no-store' })
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

  const calculateAverage = (rating: Rating) => {
    return (
      (rating.emotionalRangeDepth +
        rating.characterBelievability +
        rating.technicalSkill +
        rating.screenPresence +
        rating.chemistryInteraction) / 5
    ).toFixed(1)
  }

  // JSON-LD Schemas for Dashboard
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Dashboard - ActorRating",
    url: "https://www.actorrating.com/dashboard",
    description: "Your personal dashboard for rating and tracking acting performances",
    isPartOf: {
      "@type": "WebSite",
      name: "ActorRating",
      url: "https://www.actorrating.com"
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
          text: "Click on any actor card or use the search bar to find a specific actor and movie. Then navigate to their performance page to submit your rating across five criteria."
        }
      }
    ]
  };

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
          <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-16">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-12"
            >
              <h1 
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-6 sm:mb-8 md:mb-10 lg:mb-12"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif',
                  textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                  letterSpacing: '0.08em',
                  lineHeight: '1.1',
                }}
              >
                <span className="text-white">Welcome </span>
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                  }}
                >
                  Home
                </span>
              </h1>
              
              {/* Gold Divider - Cinematic */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "180px", opacity: 1 }}
                transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="h-[2px] mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12 relative"
              >
                <div 
                  className="h-full w-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
                  }}
                />
              </motion.div>

              {/* Subtitle - Clear & Compelling */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.9, ease: 'easeOut' }}
                className="text-base sm:text-lg md:text-xl lg:text-2xl w-full max-w-4xl mx-auto leading-relaxed text-[#a3a3a3] font-light text-center px-4"
                style={{ letterSpacing: '0.005em' }}
              >
                Rate performances, discover actors, share your taste
              </motion.p>
            </motion.div>

            {/* Search Bar */}
            <nav aria-label="Search navigation">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-3xl mx-auto mb-16"
            >
              <div className="relative group">
                <div 
                  className="relative rounded-[2rem] border border-transparent bg-[#1a1a1a] backdrop-blur-2xl overflow-hidden transition-all duration-300"
                  style={{
                    boxShadow: `
                      0 25px 70px -15px rgba(0, 0, 0, 0.9),
                      0 15px 40px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `,
                    transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <SearchBar
                    placeholder="Search for actors..."
                    showClear
                    autoFocus={false}
                    className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:text-lg"
                  />
                </div>
              </div>
            </motion.div>
          </nav>
          </header>

          {/* Popular Actors */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="popular-actors-heading">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-8 justify-center sm:justify-start">
                <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                <h2 
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-center sm:text-left"
                  style={{ 
                    fontFamily: 'var(--font-cinzel), serif',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Popular
                  </span>{' '}
                  <span className="text-white">Actors</span>
                </h2>
              </div>

              {isLoadingData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-gray-800 rounded-[2rem]"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    
                    // Debug log
                    if (!apiActor && !isLoadingData) {
                      console.log(`No match found for ${actor.name}. Available actors:`, popularActors.map(a => a.name))
                    }
                    
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
                            <div 
                            className="relative h-full p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)] cursor-pointer"
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

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full">
                              {/* Actor Name */}
                              <div className="mb-6">
                                <h3 className="font-bold text-white text-xl sm:text-2xl mb-3 transition-colors duration-200">
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
                                      <div className="flex items-baseline gap-2">
                                        <p className="text-2xl sm:text-3xl font-bold text-white">
                                          {apiActor.careerScore.toFixed(1)}
                                        </p>
                                        <span className="text-xs text-gray-500">/100</span>
                                      </div>
                                    ) : (
                                      <p className="text-2xl sm:text-3xl font-bold text-gray-500">
                                        N/A
                                      </p>
                                    )}
                                  </div>
                                  {/* Round button with arrow - Mobile accessible */}
                                  <div 
                                    className="flex-shrink-0 w-14 h-14 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 touch-manipulation"
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
          </div>

          {/* Recent Ratings */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="recent-ratings-heading">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-8 justify-center sm:justify-start">
                <Star className="w-6 h-6 text-[#FFD700]" />
                <h2 
                  id="recent-ratings-heading"
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-center sm:text-left"
                  style={{ 
                    fontFamily: 'var(--font-cinzel), serif',
                    letterSpacing: '0.02em',
                  }}
                >
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Recent
                  </span>{' '}
                  <span className="text-white">Ratings</span>
                </h2>
              </div>

              {isLoadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-64 bg-gray-800 rounded-2xl"></div>
                    </div>
                  ))}
                </div>
              ) : ratings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ratings.map((rating, index) => (
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
                          movie: rating.movie,
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
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-xl text-gray-400 mb-6">You haven't rated any performances yet</p>
                  <Link href="/search" className="inline-block relative">
                    <button className="group px-10 sm:px-12 md:px-16 py-6 sm:py-7 rounded-full text-black text-lg sm:text-xl font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[48px] relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                        transform: 'scale(1)',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.03)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      {/* White light sweep effect */}
                      <span 
                        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                          width: '100%',
                          height: '100%',
                        }}
                      />
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
