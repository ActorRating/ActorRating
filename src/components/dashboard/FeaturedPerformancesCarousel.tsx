"use client"

import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getRateUrl } from '@/lib/slugHelper'
import { ArrowLeft, ArrowRight } from 'lucide-react'

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
    movieId: 'the-dark-knight',
    character: 'The Joker',
    year: 2008
  },
  {
    actorName: 'Cillian Murphy',
    actorId: 'cillian-murphy',
    movieTitle: 'Oppenheimer',
    movieId: 'oppenheimer',
    character: 'J. Robert Oppenheimer',
    year: 2023
  },
  {
    actorName: 'Timothée Chalamet',
    actorId: 'timothee-chalamet',
    movieTitle: 'Dune',
    movieId: 'dune',
    character: 'Paul Atreides',
    year: 2021
  }
]

export function FeaturedPerformancesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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

  // Auto-scroll on desktop (optional, can be removed if not desired)
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % FEATURED_PERFORMANCES.length
      scrollToIndex(nextIndex)
    }, 5000) // Change card every 5 seconds
    return () => clearInterval(interval)
  }, [currentIndex])

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-label="Featured performances">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
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
            Start Rating
          </span>
        </h2>
        <p className="text-gray-400 text-center sm:text-left mt-2 text-sm sm:text-base">
          Rate these iconic performances and join the community
        </p>
      </motion.div>

      <div className="relative">
        {/* Carousel Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain',
          }}
        >
          {FEATURED_PERFORMANCES.map((performance, index) => {
            const rateUrl = getRateUrl(
              { id: performance.actorId, name: performance.actorName, slug: performance.actorId },
              { id: performance.movieId, title: performance.movieTitle, year: performance.year, slug: performance.movieId }
            )

            return (
              <motion.div
                key={performance.actorId + performance.movieId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-center"
              >
                <Link href={rateUrl} className="block h-full">
                  <div
                    className="relative h-full p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.95)] cursor-pointer group"
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
                      <h3 
                        className="font-bold text-white text-xl sm:text-2xl mb-2 transition-colors duration-200"
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        {performance.actorName}
                      </h3>

                      {/* Movie Title */}
                      <div className="mb-4">
                        <span className="text-lg sm:text-xl text-[#FFD700] font-semibold tracking-wide">
                          {performance.movieTitle}
                        </span>
                        <span className="text-base text-[#a1a1aa] font-medium ml-2">
                          ({performance.year})
                        </span>
                      </div>

                      {/* Character */}
                      <div className="mb-6">
                        <p className="text-base sm:text-lg text-[#e4e4e7] leading-relaxed italic font-light">
                          as {performance.character}
                        </p>
                      </div>

                      {/* CTA Button */}
                      <div className="mt-auto pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Rate this performance</span>
                          <div 
                            className="flex-shrink-0 w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                            style={{
                              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                            }}
                          >
                            <ArrowRight className="w-5 h-5 sm:w-4 sm:h-4 text-black transition-transform duration-200 group-hover:translate-x-1" />
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

        {/* Navigation Arrows - Desktop Only */}
        <div className="hidden lg:flex items-center justify-between absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none">
          <button
            onClick={prevCard}
            className="pointer-events-auto w-12 h-12 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/10 hover:border-[#FFD700]/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Previous performance"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={nextCard}
            className="pointer-events-auto w-12 h-12 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/10 hover:border-[#FFD700]/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Next performance"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {FEATURED_PERFORMANCES.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-[#FFD700] w-8'
                  : 'bg-gray-600/40 hover:bg-gray-600/60'
              }`}
              aria-label={`Go to performance ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
