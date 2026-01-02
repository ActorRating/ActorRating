"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FaHome, FaArrowRight } from 'react-icons/fa'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Subtle spotlight background effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1.5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 200, 0, 0.2) 0%, rgba(255, 180, 0, 0.1) 40%, transparent 70%)',
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* 404 Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <h1 
            className="text-7xl sm:text-9xl font-bold mb-4 leading-none"
            style={{ 
              fontFamily: 'var(--font-cinzel), serif',
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </h1>
          <h2 
            className="text-2xl sm:text-3xl font-semibold text-white mb-4"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            Page Not Found
          </h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Navigation Buttons - Matching app style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
        >
          <Link href="/" className="inline-block">
            <button 
              className="group px-8 py-4 rounded-full text-black text-lg font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[56px] relative overflow-hidden"
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
              <span className="flex items-center justify-center gap-3">
                <FaHome className="w-5 h-5" />
                <span>Homepage</span>
              </span>
            </button>
          </Link>
          
          <Link href="/performances" className="inline-block">
            <button 
              className="px-8 py-4 rounded-full text-black text-lg font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[56px]"
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
              <span className="flex items-center justify-center gap-3">
                <span>Performances</span>
                <FaArrowRight className="w-5 h-5" />
              </span>
            </button>
          </Link>
        </motion.div>

        {/* Additional Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 text-sm"
        >
          <Link href="/search" className="text-[#D4AF37] hover:text-[#FFD700] transition-colors">
            Search
          </Link>
          <Link href="/dashboard" className="text-[#D4AF37] hover:text-[#FFD700] transition-colors">
            Dashboard
          </Link>
          <Link href="/about" className="text-[#D4AF37] hover:text-[#FFD700] transition-colors">
            About
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
