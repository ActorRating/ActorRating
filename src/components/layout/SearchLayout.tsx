"use client"

import { SearchNavbar } from './SearchNavbar'
import { motion } from 'framer-motion'
import { fadeIn, getMotionProps } from '@/lib/animations'

interface SearchLayoutProps {
  children: React.ReactNode
}

export function SearchLayout({ children }: SearchLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Search Navbar - no animation per request */}
      <SearchNavbar />

      {/* Main content */}
      <motion.main variants={fadeIn} {...getMotionProps()} className="flex-1 max-w-full overflow-x-hidden">
        {children}
      </motion.main>
    </div>
  )
} 