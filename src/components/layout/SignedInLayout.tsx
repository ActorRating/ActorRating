"use client"

import { SignedInNavbar } from './SignedInNavbar'
import { Footer } from './Footer'
import { FeedbackSection } from '../FeedbackSection'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import { useEffect, useState } from 'react'

interface SignedInLayoutProps {
  children: React.ReactNode
}

export function SignedInLayout({ children }: SignedInLayoutProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Signed In Navbar - no animation per request */}
      <SignedInNavbar />

      {/* Main content - animate on mount to avoid hidden state on navigations */}
      <motion.main 
        variants={fadeIn} 
        initial={mounted ? "hidden" : false} 
        animate={mounted ? "show" : undefined} 
        className="flex-1 max-w-full overflow-x-hidden"
      >
        {children}
      </motion.main>

      {/* Footer */}
      <motion.div 
        variants={fadeIn} 
        initial={mounted ? "hidden" : false}
        animate={mounted ? "show" : undefined}
      >
        <Footer />
      </motion.div>

      {/* Feedback Section */}
      <FeedbackSection />
    </div>
  )
} 