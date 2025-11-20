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
      <div style={{ position: 'relative', zIndex: 999, background: 'transparent' }}>
        {!mounted ? <HomeNavbar /> : (user ? <SignedInNavbar /> : <HomeNavbar />)}
      </div>

      {/* Main content */}
      <main
        className="flex-1 max-w-full overflow-x-hidden relative"
        style={{ zIndex: 10, position: 'relative' }}
      >
        {children}
      </main>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Footer />
      </div>

      {/* Feedback Section */}
      <FeedbackSection />
    </div>
  )
} 