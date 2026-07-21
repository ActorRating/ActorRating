"use client"

import { HomeNavbar } from './HomeNavbar'
import { SignedInNavbar } from './SignedInNavbar'
import { Footer } from './Footer'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import { useSession, useUser } from '@/components/providers/SessionProvider'
import { useEffect, useState } from 'react'

interface HomeLayoutProps {
  children: React.ReactNode
  transparentBackground?: boolean
}

export function HomeLayout({ children, transparentBackground = false }: HomeLayoutProps) {
  const user = useUser()
  const { loading, isInitialized } = useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return (
    <div 
      className={`min-h-screen flex flex-col relative w-full ${transparentBackground ? '' : 'bg-background'}`} 
      style={{ zIndex: 1, maxWidth: '100vw', overflowX: 'clip', minHeight: '100dvh' }}
    >
      {/* Navbar switches based on auth status for consistency across pages */}
      <div style={{ position: 'relative', zIndex: 999, background: 'transparent', width: '100%' }}>
        {!mounted || !isInitialized || loading ? <SignedInNavbar /> : (user ? <SignedInNavbar /> : <HomeNavbar />)}
      </div>

      {/* Main content — overflow-x: clip (not hidden) so position:sticky works for side navs */}
      <main
        className="flex-1 w-full relative"
        style={{ zIndex: 10, position: 'relative', maxWidth: '100vw', overflowX: 'clip' }}
      >
        {children}
      </main>

    </div>
  )
} 