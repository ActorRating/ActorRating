"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
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
        {/* Logo */}
        <div className="mb-12">
          <Logo href="/" />
        </div>

        {/* 404 Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
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

        {/* Navigation Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#FFA500] text-black font-semibold rounded-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            <FaHome className="w-4 h-4" />
            <span>Homepage</span>
          </Link>
          <Link
            href="/performances"
            className="px-6 py-3 bg-[#1a1a1a] border border-[#333333] text-white font-semibold rounded-lg hover:bg-[#2a2a2a] hover:border-[#D4AF37] transition-all duration-200 inline-flex items-center gap-2"
          >
            <span>Performances</span>
            <FaArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 bg-[#1a1a1a] border border-[#333333] text-white font-semibold rounded-lg hover:bg-[#2a2a2a] hover:border-[#D4AF37] transition-all duration-200 inline-flex items-center gap-2"
          >
            <span>Search</span>
            <FaArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Additional Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 text-sm"
        >
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
