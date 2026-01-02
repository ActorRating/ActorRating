"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { FaHome, FaStar, FaSearch, FaTheaterMasks, FaChartLine, FaUsers, FaTrophy, FaArrowRight } from 'react-icons/fa'
import { useEffect, useState } from 'react'

export default function NotFound() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const quickLinks = [
    { href: '/', icon: FaHome, label: 'Home', description: 'Return to homepage' },
    { href: '/rate', icon: FaStar, label: 'Rate Performance', description: 'Rate an actor' },
    { href: '/search', icon: FaSearch, label: 'Search', description: 'Find actors & movies' },
    { href: '/performances', icon: FaTheaterMasks, label: 'Performances', description: 'Browse all performances' },
    { href: '/dashboard', icon: FaChartLine, label: 'Dashboard', description: 'Your ratings' },
    { href: '/about', icon: FaUsers, label: 'About', description: 'Learn more about us' },
  ]

  const popularActors = [
    { name: 'Al Pacino', slug: 'al-pacino' },
    { name: 'Meryl Streep', slug: 'meryl-streep' },
    { name: 'Robert De Niro', slug: 'robert-de-niro' },
    { name: 'Joaquin Phoenix', slug: 'joaquin-phoenix' },
    { name: 'Kate Winslet', slug: 'kate-winslet' },
    { name: 'Leonardo DiCaprio', slug: 'leonardo-dicaprio' },
  ]

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Spotlight background effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 200, 0, 0.28) 0%, rgba(255, 180, 0, 0.18) 35%, rgba(255, 160, 0, 0.08) 55%, transparent 75%)',
        }}
      />

      {/* Additional ambient glows */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FFC800]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#FFB000]/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-5xl w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center mb-12"
          >
            <Logo href="/" />
          </motion.div>

          {/* 404 Hero */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-16"
          >
            <h1 
              className="text-[8rem] sm:text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold mb-0 leading-none"
              style={{ 
                fontFamily: 'var(--font-cinzel), serif',
                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 60px rgba(255, 215, 0, 0.4))',
              }}
            >
              404
            </h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-4 mt-8"
            >
              <h2 
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Scene Not Found
              </h2>
              <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
                Looks like this page took an unexpected intermission. Let's get you back to the main feature.
              </p>
            </motion.div>
          </motion.div>

          {/* Quick Links Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <h3 className="text-white text-xl font-semibold mb-6 text-center">Quick Navigation</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {quickLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className="group relative block p-6 rounded-2xl border border-[#333333] bg-[#0a0a0a]/80 backdrop-blur-sm hover:border-[#D4AF37] transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#FFA500]/20 flex items-center justify-center group-hover:from-[#D4AF37]/30 group-hover:to-[#FFA500]/30 transition-all duration-300">
                        <link.icon className="w-6 h-6 text-[#FFD700]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-[#FFD700] transition-colors">
                          {link.label}
                        </h4>
                        <p className="text-gray-500 text-sm">{link.description}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Popular Actors */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-[#333333] pt-12"
          >
            <div className="text-center mb-8">
              <FaTrophy className="w-8 h-8 text-[#FFD700] mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-2">Explore Top Rated Actors</h3>
              <p className="text-gray-500">Start with some of our most acclaimed performances</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {popularActors.map((actor, index) => (
                <motion.div
                  key={actor.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.9 + index * 0.05 }}
                >
                  <Link
                    href={`/actors/${actor.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#333333] bg-[#0a0a0a]/60 backdrop-blur-sm text-gray-300 hover:border-[#D4AF37] hover:text-[#FFD700] hover:bg-[#1a1a1a] transition-all duration-300 group"
                  >
                    <span className="text-sm font-medium">{actor.name}</span>
                    <FaArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="text-center mt-16"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#FFA500] text-black font-bold text-lg rounded-xl hover:from-[#FFD700] hover:to-[#FFB000] transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transform hover:scale-105"
            >
              <FaHome className="w-5 h-5" />
              <span>Back to Homepage</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
