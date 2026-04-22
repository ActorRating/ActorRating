"use client"

import Link from 'next/link'
import { FaHome, FaArrowRight } from 'react-icons/fa'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Subtle spotlight background effect */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 200, 0, 0.2) 0%, rgba(255, 180, 0, 0.1) 40%, transparent 70%)',
          opacity: 0.1,
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* 404 Heading */}
        <div className="mb-12">
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
        </div>

        {/* Navigation Buttons - Matching app style */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link
            href="/"
            className="group px-8 py-4 rounded-full text-black text-lg font-bold tracking-wider transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[56px] relative overflow-hidden inline-flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)',
            }}
          >
            <FaHome className="w-5 h-5" />
            <span>Homepage</span>
          </Link>
          
          <Link
            href="/performances"
            className="px-8 py-4 rounded-full text-black text-lg font-bold tracking-wider transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[56px] inline-flex items-center justify-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)',
            }}
          >
            <span>Performances</span>
            <FaArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Additional Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/search" className="text-[#D4AF37] hover:text-[#FFD700] transition-colors inline-flex items-center gap-1">
            Search
            <FaArrowRight className="w-3 h-3" />
          </Link>
          <Link href="/dashboard" className="text-[#D4AF37] hover:text-[#FFD700] transition-colors inline-flex items-center gap-1">
            Dashboard
            <FaArrowRight className="w-3 h-3" />
          </Link>
          <Link href="/about" className="text-[#D4AF37] hover:text-[#FFD700] transition-colors inline-flex items-center gap-1">
            About
            <FaArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
