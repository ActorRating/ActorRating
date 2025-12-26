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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'transparent',
        backgroundColor: 'transparent',
      }}
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center h-16">
          {/* Logo - always gold */}
          <div className="flex items-center">
            <Logo href="/" />
          </div>

          {/* Right side - keep stable width so layout never collapses */}
          <div className={`flex items-center space-x-3 min-w-[120px] justify-end relative z-10 pointer-events-auto mix-blend-normal pr-0 navbar-content ${scrolled ? 'navbar-content-scrolled' : ''}`}>
            {!mounted ? (
              <div className="flex items-center gap-2" aria-busy>
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="group">
                  <button
                    className="relative px-4 py-2 rounded-xl border border-transparent bg-[#1a1a1a] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-[#FFD700]/20 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)] min-h-[48px]"
                    style={{
                      boxShadow: `
                        0 10px 30px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                      `,
                    }}
                    aria-label="Go to dashboard"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl" />
                    </div>
                    <span className="text-sm text-gray-300 group-hover:text-[#FFD700] transition-colors duration-200 relative z-10">Dashboard</span>
                  </button>
                </Link>
                <button
                  onClick={() => handleLogout()}
                  className="relative px-4 py-2 rounded-xl border border-transparent bg-[#1a1a1a] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-[#FFD700]/20 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)] group min-h-[48px]"
                  style={{
                    boxShadow: `
                      0 10px 30px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                    `,
                  }}
                  aria-label="Sign out"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl" />
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-[#FFD700] transition-colors duration-200 relative z-10">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link href="/auth/signup" className="group">
                <button
                  className="relative px-6 py-2 rounded-full border border-transparent bg-[#1a1a1a] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-[#FFD700]/30 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] min-h-[48px]"
                  style={{
                    boxShadow: `
                      0 15px 40px -10px rgba(0, 0, 0, 0.8),
                      0 8px 20px -5px rgba(0, 0, 0, 0.6),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                    `,
                    transform: 'translateY(-3px) perspective(1000px) rotateX(1deg)',
                    transformStyle: 'preserve-3d',
                  }}
                  aria-label="Sign up for ActorRating"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/15 rounded-full blur-3xl" />
                  </div>
                  <span className="text-sm font-medium text-white group-hover:text-white transition-colors duration-200 relative z-10">Sign Up</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 