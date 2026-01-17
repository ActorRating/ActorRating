"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { HomeLayout } from "@/components/layout"
import { SignedInLayout } from "@/components/layout/SignedInLayout"
import { useUser } from "@/components/providers/SessionProvider"
import { FaStar, FaChevronLeft, FaChevronRight } from "react-icons/fa"
import Link from "next/link"
import { getRateUrl } from "@/lib/slugHelper"

// Predefined performances to display (lookup by actor + movie)
const RECENT_PERFORMANCE_TARGETS = [
  { actor: "Timothée Chalamet", movie: "Dune: Part Two" },
  { actor: "Zendaya", movie: "Challengers" },
  { actor: "Cillian Murphy", movie: "Oppenheimer" },
  { actor: "Emma Stone", movie: "Poor Things" },
  { actor: "Austin Butler", movie: "Elvis" },
  { actor: "Margot Robbie", movie: "Barbie" }
]

const ICONIC_PERFORMANCE_TARGETS = [
  { actor: "Heath Ledger", movie: "The Dark Knight" },
  { actor: "Al Pacino", movie: "The Godfather Part II" },
  { actor: "Marlon Brando", movie: "The Godfather" },
  { actor: "Leonardo DiCaprio", movie: "The Wolf of Wall Street" },
  { actor: "Robert De Niro", movie: "Taxi Driver" },
  { actor: "Anthony Hopkins", movie: "The Silence of the Lambs" }
]

interface PerformanceData {
  id: string
  actorId: string
  movieId: string
  character: string | null
  actor: {
    name: string
    imageUrl?: string
    slug?: string | null
  }
  movie: {
    title: string
    year: number
    slug?: string | null
  }
  averageRating?: number | null
  ratingCount?: number
}

export default function PerformancesPage() {
  const user = useUser()
  const [recentPerformances, setRecentPerformances] = useState<PerformanceData[]>([])
  const [iconicPerformances, setIconicPerformances] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRecentCard, setActiveRecentCard] = useState(0)
  const [activeIconicCard, setActiveIconicCard] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

  // Detect desktop for conditional mask styling
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  useEffect(() => {
    let cancelled = false
    
    const fetchPerformances = async () => {
      try {
        // Try to load from cache first
        const cacheKey = 'performances-page-data'
        const cached = sessionStorage.getItem(cacheKey)
        
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached)
            // Cache is valid for 5 minutes
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              console.log('[PERFORMANCES PAGE] Loading from cache')
              if (!cancelled) {
                setRecentPerformances(data.recent)
                setIconicPerformances(data.iconic)
                setLoading(false)
              }
              return
            }
          } catch (e) {
            console.log('[PERFORMANCES PAGE] Cache invalid, fetching fresh data')
          }
        }
        
        // Fetch performances by actor/movie lookups
        const allTargets = [...RECENT_PERFORMANCE_TARGETS, ...ICONIC_PERFORMANCE_TARGETS]
        
        const response = await fetch('/api/performances/by-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: allTargets })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[PERFORMANCES PAGE] API error:', response.status, errorData)
          if (!cancelled) {
            setRecentPerformances([])
            setIconicPerformances([])
            setLoading(false)
          }
          return
        }
        
        if (!cancelled) {
          const data = await response.json()
          
          // Separate into recent and iconic based on original arrays
          const recent = RECENT_PERFORMANCE_TARGETS
            .map(target => data.performances?.find((p: any) => 
              p.actor?.name === target.actor && p.movie?.title === target.movie
            ))
            .filter((p: any) => p !== undefined)
          
          const iconic = ICONIC_PERFORMANCE_TARGETS
            .map(target => data.performances?.find((p: any) => 
              p.actor?.name === target.actor && p.movie?.title === target.movie
            ))
            .filter((p: any) => p !== undefined)
          
          console.log('[PERFORMANCES PAGE] Loaded:', {
            recent: recent.length,
            iconic: iconic.length,
            total: recent.length + iconic.length
          })
          
          setRecentPerformances(recent)
          setIconicPerformances(iconic)
          
          // Cache the data
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: { recent, iconic },
            timestamp: Date.now()
          }))
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[PERFORMANCES PAGE] Failed to fetch performances:", error)
          setRecentPerformances([])
          setIconicPerformances([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchPerformances()
    
    return () => {
      cancelled = true
    }
  }, [])

  // Track active card for carousel dots and depth effect (desktop only)
  useEffect(() => {
    const container = document.querySelector('.recent-scroll-container')
    if (!container) return

    const updateCardDepth = () => {
      // Only apply depth effect on desktop
      const isDesktop = window.innerWidth >= 1024
      
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      
      const cards = container.querySelectorAll('.recent-scroll-container > div')
      let closestIndex = 0
      let closestDistance = Infinity
      
      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)
        
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
        
        const element = card as HTMLElement
        
        if (isDesktop) {
          // Calculate depth effect based on distance from center
          const maxDistance = containerRect.width / 2
          const normalizedDistance = Math.min(distance / maxDistance, 1)
          const scale = 1 - (normalizedDistance * 0.08) // Scale from 1 to 0.92
          const opacity = 1 - (normalizedDistance * 0.4) // Opacity from 1 to 0.6
          const translateY = normalizedDistance * 10 // Move down by up to 10px
          
          element.style.transform = `scale(${scale}) translateY(${translateY}px)`
          element.style.opacity = `${opacity}`
        } else {
          // Reset on mobile
          element.style.transform = 'scale(1) translateY(0)'
          element.style.opacity = '1'
        }
      })
      
      setActiveRecentCard(closestIndex)
    }

    container.addEventListener('scroll', updateCardDepth, { passive: true })
    window.addEventListener('resize', updateCardDepth, { passive: true })
    updateCardDepth() // Initial call
    
    return () => {
      container.removeEventListener('scroll', updateCardDepth)
      window.removeEventListener('resize', updateCardDepth)
    }
  }, [recentPerformances.length])

  useEffect(() => {
    const container = document.querySelector('.iconic-scroll-container')
    if (!container) return

    const updateCardDepth = () => {
      // Only apply depth effect on desktop
      const isDesktop = window.innerWidth >= 1024
      
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      
      const cards = container.querySelectorAll('.iconic-scroll-container > div')
      let closestIndex = 0
      let closestDistance = Infinity
      
      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)
        
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
        
        const element = card as HTMLElement
        
        if (isDesktop) {
          // Calculate depth effect based on distance from center
          const maxDistance = containerRect.width / 2
          const normalizedDistance = Math.min(distance / maxDistance, 1)
          const scale = 1 - (normalizedDistance * 0.08) // Scale from 1 to 0.92
          const opacity = 1 - (normalizedDistance * 0.4) // Opacity from 1 to 0.6
          const translateY = normalizedDistance * 10 // Move down by up to 10px
          
          element.style.transform = `scale(${scale}) translateY(${translateY}px)`
          element.style.opacity = `${opacity}`
        } else {
          // Reset on mobile
          element.style.transform = 'scale(1) translateY(0)'
          element.style.opacity = '1'
        }
      })
      
      setActiveIconicCard(closestIndex)
    }

    container.addEventListener('scroll', updateCardDepth, { passive: true })
    window.addEventListener('resize', updateCardDepth, { passive: true })
    updateCardDepth() // Initial call
    
    return () => {
      container.removeEventListener('scroll', updateCardDepth)
      window.removeEventListener('resize', updateCardDepth)
    }
  }, [iconicPerformances.length])

  const LayoutWrapper = user ? SignedInLayout : HomeLayout

  return (
    <LayoutWrapper>
      <div className="relative z-10 bg-black pt-40 pb-32 sm:pt-48 sm:pb-40 md:pt-56 md:pb-48 lg:pt-60 lg:pb-60" style={{ willChange: 'auto' }}>
        {/* Background ambient glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
        </div>

        <div className="w-full relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <div className="grid grid-cols-12">
            {/* New Performances Section */}
            <div className="col-span-12 mb-32 sm:mb-40 md:mb-48">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="text-center mb-24 sm:mb-32 lg:mb-40"
              >
                <h3 
                  className="text-5xl xs:text-6xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                    }}
                  >
                    Trending
                  </span>{' '}
                  Now
                </h3>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
                  Latest performances capturing global attention
                </p>
              </motion.div>

              {loading ? (
                <div className="relative">
                  {/* Carousel Container with Fade Edges */}
                  <div className="relative -mx-4 sm:-mx-0">
                    <div 
                      className="overflow-hidden"
                      style={isDesktop ? {
                        maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                      } : {}}
                    >
                      <div className="flex gap-8 overflow-x-auto pb-8 pt-4 scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)] lg:px-[20vw] xl:px-[25vw]">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="animate-pulse flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw]">
                            <div className="bg-[#1a1a1a]/80 rounded-[2rem] border border-transparent p-8 sm:p-10 md:p-12 h-96"
                              style={{
                                boxShadow: `
                                  0 25px 70px -15px rgba(0, 0, 0, 0.9),
                                  0 15px 40px -10px rgba(0, 0, 0, 0.7),
                                  0 0 0 1px rgba(255, 255, 255, 0.05),
                                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                                `,
                              }}
                            ></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : recentPerformances.length > 0 ? (
                <div className="relative">
                  {/* Carousel Container with Fade Edges */}
                  <div className="relative -mx-4 sm:-mx-0">
                    <div 
                      className="overflow-hidden"
                      style={isDesktop ? {
                        maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                      } : {}}
                    >
                      {/* Carousel - Add extra padding on desktop for first/last cards */}
                      <div className="recent-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)] lg:px-[20vw] xl:px-[25vw]">
                        {recentPerformances.map((performance, index) => (
                          <div 
                            key={performance.id} 
                            className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw] lg:max-w-md xl:max-w-md snap-center lg:cursor-pointer"
                            style={{
                              /* Hardware acceleration for smooth scrolling */
                              transform: 'translateZ(0)',
                              WebkitTransform: 'translateZ(0)',
                            }}
                            onClick={() => {
                              if (window.innerWidth >= 1024) {
                                const element = document.querySelectorAll('.recent-scroll-container > div')[index] as HTMLElement
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                                }
                              }
                            }}
                          >
                            <LandingPageCard 
                              performance={performance}
                              index={index}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Dots */}
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
                        {recentPerformances.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              const container = document.querySelector('.recent-scroll-container')
                              if (container) {
                                const cards = container.querySelectorAll('.recent-scroll-container > div')
                                const targetCard = cards[index] as HTMLElement
                                if (targetCard) {
                                  targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                                }
                              }
                            }}
                            style={{
                              width: index === activeRecentCard ? '20px' : '8px',
                              height: '8px',
                              minWidth: '8px',
                              minHeight: '8px',
                              padding: '8px',
                              border: 'none',
                              backgroundColor: index === activeRecentCard ? '#FFD700' : 'rgba(115, 115, 115, 0.4)',
                              borderRadius: '9999px',
                              transition: 'all 0.3s',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              if (index !== activeRecentCard) {
                                e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.6)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (index !== activeRecentCard) {
                                e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.4)'
                              }
                            }}
                            aria-label={`Go to card ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <p className="text-xl sm:text-2xl text-[#a3a3a3]">No recent performances found. Check back soon!</p>
                </div>
              )}
            </div>

            {/* Iconic Performances Section */}
            <div className="col-span-12 mb-16 sm:mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="text-center mb-24 sm:mb-32 lg:mb-40"
              >
                <h3 
                  className="text-5xl xs:text-6xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  <span 
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                    }}
                  >
                    Iconic
                  </span>{' '}
                  Classics
                </h3>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
                  Legendary performances that defined cinema
                </p>
              </motion.div>

              {iconicPerformances.length > 0 ? (
                <div className="relative">
                  {/* Carousel Container with Fade Edges */}
                  <div className="relative -mx-4 sm:-mx-0">
                    <div 
                      className="overflow-hidden"
                      style={isDesktop ? {
                        maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                      } : {}}
                    >
                      {/* Carousel - Add extra padding on desktop for first/last cards */}
                      <div className="iconic-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)] lg:px-[20vw] xl:px-[25vw]">
                        {iconicPerformances.map((performance, index) => (
                          <div 
                            key={performance.id} 
                            className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw] lg:max-w-md xl:max-w-md snap-center transition-all duration-300 ease-out lg:cursor-pointer"
                          onClick={() => {
                            if (window.innerWidth >= 1024) {
                              const element = document.querySelectorAll('.iconic-scroll-container > div')[index] as HTMLElement
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                              }
                            }
                          }}
                        >
                          <LandingPageCard 
                            performance={performance}
                            index={index}
                          />
                        </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Dots */}
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
                        {iconicPerformances.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              const container = document.querySelector('.iconic-scroll-container')
                              if (container) {
                                const cards = container.querySelectorAll('.iconic-scroll-container > div')
                                const targetCard = cards[index] as HTMLElement
                                if (targetCard) {
                                  targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                                }
                              }
                            }}
                            style={{
                              width: index === activeIconicCard ? '20px' : '8px',
                              height: '8px',
                              minWidth: '8px',
                              minHeight: '8px',
                              padding: '8px',
                              border: 'none',
                              backgroundColor: index === activeIconicCard ? '#FFD700' : 'rgba(115, 115, 115, 0.4)',
                              borderRadius: '9999px',
                              transition: 'all 0.3s',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              if (index !== activeIconicCard) {
                                e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.6)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (index !== activeIconicCard) {
                                e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.4)'
                              }
                            }}
                            aria-label={`Go to card ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : loading ? null : (
                <div className="text-center py-12 px-4">
                  <p className="text-xl sm:text-2xl text-[#a3a3a3]">Iconic performances will appear here once added to the database.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}

// EXACT COPY of the landing page card structure
function LandingPageCard({ 
  performance, 
  index 
}: { 
  performance: PerformanceData
  index: number 
}) {
  const rateUrl = performance.actor && performance.movie
    ? getRateUrl(
        { id: performance.actorId, name: performance.actor.name, slug: performance.actor.slug || null },
        { id: performance.movieId, title: performance.movie.title, year: performance.movie.year, slug: performance.movie.slug || null }
      )
    : `/rate?actor=${performance.actorId}&movie=${performance.movieId}`
  const hasRating = performance.ratingCount && performance.ratingCount > 0 && performance.averageRating != null && performance.averageRating > 0
  // Convert from 0-100 scale to 0-10 scale (ratings are stored as 0-100)
  const rating = hasRating && performance.averageRating != null 
    ? (performance.averageRating / 10).toFixed(1) 
    : null
  const character = performance.character || "—"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'transform, opacity' }}
      className="group relative"
    >
      {/* Premium Card - Clean & Cinematic - EXACT COPY from landing page */}
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
        {/* Glow effect - CLIPPED to card corners */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex-1">
            {/* Top Row: Rating Badge and Year */}
            <div className="flex items-center justify-between mb-6">
              {rating ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                  <FaStar className="w-6 h-6 text-[#FFD700]" />
                  <span 
                    className="text-3xl font-bold text-[#FFD700]"
                    style={{
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {rating}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
                  <FaStar className="w-6 h-6 text-[#666]" />
                  <span className="text-3xl font-bold text-[#a3a3a3]">N/A</span>
                </div>
              )}
              
              {/* Movie Year */}
              <div className="text-[#a3a3a3] text-base font-medium">
                {performance.movie.year}
              </div>
            </div>

            {/* Actor Name */}
            <h3 
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              {performance.actor.name}
            </h3>

            {/* Movie Title */}
            <div className="mb-4">
              <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                {performance.movie.title}
              </span>
            </div>

            {/* Character/Quote */}
            <div className="mb-6">
              <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                as {character}
              </p>
            </div>
          </div>

          {/* Rate Button - Always at bottom */}
          <div className="mt-auto pt-4">
            <Link href={rateUrl} prefetch={false}>
              <button 
                className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-200 hover:scale-105 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  Rate
                  <FaStar className="w-4 h-4" />
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* Decorative accent */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
      </div>
    </motion.div>
  )
}
