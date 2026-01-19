"use client"

import Link from 'next/link'
import { useUser } from '@/components/providers/SessionProvider'
import { handleLogout } from '@/lib/auth'
import { Button } from '../ui/Button'
import { Logo } from '../ui/Logo'
import { useState, useEffect } from 'react'

export function HomeNavbar() {
  const user = useUser()
  const navKey = `${user?.id || 'anon'}`
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
    const clearOverlays = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('div,section,nav'))
        .filter(el => getComputedStyle(el).position === 'fixed' && el !== document.body && el !== document.documentElement)
      candidates.forEach(el => {
        const z = parseInt(getComputedStyle(el).zIndex || '0', 10)
        const coversTop = el.offsetHeight > 40 && el.getBoundingClientRect().top <= 0
        const fullWidth = el.getBoundingClientRect().width >= window.innerWidth * 0.95
        const fullHeight = el.getBoundingClientRect().height >= 40
        if (z >= 40 && coversTop && fullWidth && fullHeight) {
          el.style.pointerEvents = 'none'
        }
      })
    }
    clearOverlays()
    const id = setTimeout(clearOverlays, 0)
    return () => clearTimeout(id)
  }, [navKey])

  useEffect(() => {
    if (!mounted) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      setScrolled(scrollY > 60)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [mounted])

  return (
    <nav 
      className={`navbar-cinematic ${scrolled ? 'navbar-scrolled' : ''}`}
      style={{
        position: scrolled ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? 'rgba(0, 0, 0, 0.92)' : 'transparent',
        backgroundColor: scrolled ? 'rgba(0, 0, 0, 0.92)' : 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderBottom: scrolled ? '1px solid rgba(255, 215, 0, 0.12)' : 'none',
        boxShadow: 'none',
        transition: 'all 0.3s ease-in-out',
      }}
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo - always gold */}
          <div className="flex items-center">
            <Logo href="/" />
          </div>

          {/* Right side - Editorial style navigation */}
          <div className={`flex items-center space-x-6 sm:space-x-8 min-w-[120px] justify-end relative z-10 pointer-events-auto mix-blend-normal pr-0 navbar-content ${scrolled ? 'navbar-content-scrolled' : ''}`}>
            {!mounted ? (
              <div className="flex items-center gap-2" aria-busy>
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-6">
                <Link href="/dashboard" className="text-sm text-[#d4d4d4] hover:text-[#FFD700] transition-colors duration-200">
                  Dashboard
                </Link>
                <button
                  onClick={() => handleLogout()}
                  className="text-sm text-[#d4d4d4] hover:text-[#FFD700] transition-colors duration-200"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 sm:gap-6">
                <Link href="/performances" className="text-sm text-[#d4d4d4] hover:text-[#FFD700] transition-colors duration-200 hidden sm:inline">
                  How it works
                </Link>
                <Link href="/performances" className="text-sm text-[#d4d4d4] hover:text-[#FFD700] transition-colors duration-200 hidden sm:inline">
                  Top Rated
                </Link>
                <Link href="/auth/signup">
                  <button
                    className="px-5 py-2 rounded-full text-black text-sm font-semibold transition-all duration-200 hover:opacity-90 min-h-[40px] touch-manipulation"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                    }}
                    aria-label="Join free"
                  >
                    Join Free
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 