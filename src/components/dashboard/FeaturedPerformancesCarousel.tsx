"use client"

import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getRateUrl } from '@/lib/slugHelper'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FaStar } from 'react-icons/fa'

interface FeaturedPerformance {
  actorName: string
  actorId: string
  movieTitle: string
  movieId: string
  character: string
  year: number
}

const FEATURED_PERFORMANCES: FeaturedPerformance[] = [
  {
    actorName: 'Heath Ledger',
    actorId: 'heath-ledger',
    movieTitle: 'The Dark Knight',
    movieId: 'the-dark-knight-2008', // Include year in slug
    character: 'The Joker',
    year: 2008
  },
  {
    actorName: 'Cillian Murphy',
    actorId: 'cillian-murphy',
    movieTitle: 'Oppenheimer',
    movieId: 'oppenheimer-2023', // Include year in slug
    character: 'J. Robert Oppenheimer',
    year: 2023
  },
  {
    actorName: 'Timothée Chalamet',
    actorId: 'timothee-chalamet',
    movieTitle: 'Dune',
    movieId: 'dune-2021', // Include year in slug
    character: 'Paul Atreides',
    year: 2021
  }
]

export function FeaturedPerformancesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeCard, setActiveCard] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth
      scrollContainerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      })
      setCurrentIndex(index)
    }
  }

  const nextCard = () => {
    const nextIndex = (currentIndex + 1) % FEATURED_PERFORMANCES.length
    scrollToIndex(nextIndex)
  }

  const prevCard = () => {
    const prevIndex = (currentIndex - 1 + FEATURED_PERFORMANCES.length) % FEATURED_PERFORMANCES.length
    scrollToIndex(prevIndex)
  }

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

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-12" aria-label="Featured performances">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
            letterSpacing: '0.02em',
          }}
        >
          <span className="text-white">Start </span>
          <span 
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Rating
          </span>
        </h2>
      </motion.div>

      {/* Desktop: Grid layout like popular section */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {FEATURED_PERFORMANCES.map((performance, index) => {
          const rateUrl = getRateUrl(
            { id: performance.actorId, name: performance.actorName, slug: null }, // Let helper generate slug
            { id: performance.movieId, title: performance.movieTitle, year: performance.year, slug: null } // Let helper generate slug
          )

          return (
            <motion.div
              key={performance.actorId + performance.movieId}
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
                      <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                        <FaStar className="w-5 h-5 text-[#FFD700]" />
                        <span className="text-2xl font-bold text-[#FFD700]">
                          N/A
                        </span>
                      </div>
                      
                      {/* Movie Year - Top Right */}
                      <div className="text-[#a3a3a3] text-base font-medium">
                        {performance.year}
                      </div>
                    </div>

                    {/* Movie Title */}
                    <div className="mb-4">
                      <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                        {performance.movieTitle}
                      </span>
                    </div>

                    {/* Character */}
                    <div className="mb-6">
                      <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                        as {performance.character}
                      </p>
                    </div>
                  </div>

                  {/* Rate Button */}
                  <div className="mt-auto pt-4">
                    <Link href={rateUrl} className="block">
                      <div 
                        className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 text-center cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          Rate
                          <FaStar className="w-4 h-4" />
                        </span>
                      </div>
                    </Link>
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
          {FEATURED_PERFORMANCES.map((performance, index) => {
            const rateUrl = getRateUrl(
              { id: performance.actorId, name: performance.actorName, slug: null }, // Let helper generate slug
              { id: performance.movieId, title: performance.movieTitle, year: performance.year, slug: null } // Let helper generate slug
            )

            return (
              <div
                key={performance.actorId + performance.movieId}
                ref={(el) => { cardRefs.current[index] = el }}
                className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[calc(33.333%-16px)] snap-center group lg:cursor-pointer"
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
                        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                          <FaStar className="w-5 h-5 text-[#FFD700]" />
                          <span className="text-2xl font-bold text-[#FFD700]">
                            N/A
                          </span>
                        </div>
                        
                        {/* Movie Year - Top Right */}
                        <div className="text-[#a3a3a3] text-base font-medium">
                          {performance.year}
                        </div>
                      </div>

                      {/* Movie Title */}
                      <div className="mb-4">
                        <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                          {performance.movieTitle}
                        </span>
                      </div>

                      {/* Character */}
                      <div className="mb-6">
                        <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                          as {performance.character}
                        </p>
                      </div>
                    </div>

                    {/* Rate Button */}
                    <div className="mt-auto pt-4">
                      <Link href={rateUrl} className="block">
                        <div 
                          className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 text-center cursor-pointer"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                          }}
                        >
                          <span className="flex items-center justify-center gap-2">
                            Rate
                            <FaStar className="w-4 h-4" />
                          </span>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Decorative accent */}
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
                </div>
              </div>
            )
          })}
          </div>

        {/* Navigation Dots - Mobile Only - Same as performances page */}
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
              {FEATURED_PERFORMANCES.map((_, index) => (
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
    </section>
  )
}
