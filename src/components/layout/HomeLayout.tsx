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
      className={`min-h-screen flex flex-col relative w-full ${transparentBackground ? '' : 'bg-background'}`} 
      style={{ zIndex: 1, maxWidth: '100vw', overflowX: 'hidden', minHeight: '100dvh' }}
    >
      {/* Navbar switches based on auth status for consistency across pages */}
      <div style={{ position: 'relative', zIndex: 999, background: 'transparent', width: '100%' }}>
        {!mounted ? <HomeNavbar /> : (user ? <SignedInNavbar /> : <HomeNavbar />)}
      </div>

      {/* Main content */}
      <main
        className="flex-1 w-full relative"
        style={{ zIndex: 10, position: 'relative', maxWidth: '100vw', overflowX: 'hidden' }}
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