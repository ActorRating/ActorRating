"use client"

import { HomeNavbar } from './HomeNavbar'
import { SignedInNavbar } from './SignedInNavbar'
import { Footer } from './Footer'
import { FeedbackSection } from '../FeedbackSection'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import { useUser } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'

interface HomeLayoutProps {
  children: React.ReactNode
}

export function HomeLayout({ children }: HomeLayoutProps) {
  const user = useUser()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Navbar switches based on auth status for consistency across pages */}
      {!mounted ? <HomeNavbar /> : (status === 'authenticated' ? <SignedInNavbar /> : <HomeNavbar />)}

      {/* Main content */}
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