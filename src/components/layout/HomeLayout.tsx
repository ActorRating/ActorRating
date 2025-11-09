"use client"

import { HomeNavbar } from './HomeNavbar'
import { SignedInNavbar } from './SignedInNavbar'
import { Footer } from './Footer'
import { FeedbackSection } from '../FeedbackSection'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import { useUser } from '@/components/providers/SessionProvider'
import { useEffect, useState } from 'react'

interface HomeLayoutProps {
  children: React.ReactNode
  transparentBackground?: boolean
}

export function HomeLayout({ children, transparentBackground = false }: HomeLayoutProps) {
  const user = useUser()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div 
      className={`min-h-screen flex flex-col overflow-x-hidden relative ${transparentBackground ? '' : 'bg-background'}`} 
      style={{ zIndex: 1 }}
    >
      {/* Navbar switches based on auth status for consistency across pages */}
      <div style={{ position: 'relative', zIndex: 999 }}>
        {!mounted ? <HomeNavbar /> : (user ? <SignedInNavbar /> : <HomeNavbar />)}
      </div>

      {/* Main content */}
      <motion.main
        variants={fadeIn}
        initial={mounted ? "hidden" : false}
        animate={mounted ? "show" : undefined}
        className="flex-1 max-w-full overflow-x-hidden relative"
        style={{ zIndex: 10, position: 'relative' }}
      >
        {children}
      </motion.main>

      {/* Footer */}
      <motion.div
        variants={fadeIn}
        initial={mounted ? "hidden" : false}
        animate={mounted ? "show" : undefined}
        style={{ position: 'relative', zIndex: 10 }}
      >
        <Footer />
      </motion.div>

      {/* Feedback Section */}
      <FeedbackSection />
    </div>
  )
} 