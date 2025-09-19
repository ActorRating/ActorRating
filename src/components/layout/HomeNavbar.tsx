"use client"

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '../ui/Button'
import { Logo } from '../ui/Logo'

export function HomeNavbar() {
  const { data: session, status } = useSession()
  const navKey = `${status}-${session?.user?.id || 'anon'}`
  const [mounted, setMounted] = require('react').useState(false) as [boolean, (v: boolean) => void]
  // Defensively clear any leftover overlays that might cover the right actions
  // on mount and on status changes
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  require('react');
  // dynamic import to avoid SSR issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useEffect } = require('react') as typeof import('react')
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

  return (
    <nav className="bg-secondary/70 border-b border-border sticky top-0 z-50 isolate text-foreground" style={{ transform: 'translateZ(0)', willChange: 'opacity, transform', WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }} suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo href="/" />
          </div>

          {/* Right side - keep stable width so layout never collapses */}
          <div className="flex items-center space-x-3 min-w-[220px] justify-end text-foreground text-white opacity-100 relative z-10 pointer-events-auto mix-blend-normal">
            {status === "loading" || !mounted ? (
              <div className="flex items-center gap-2" aria-busy>
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse hidden sm:block" />
              </div>
            ) : session ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button noMotion variant="outline" size="sm" className="text-foreground text-white border-border">
                    Dashboard
                  </Button>
                </Link>
                <Button 
                  noMotion
                  onClick={() => signOut({ callbackUrl: '/' })} 
                  variant="outline" 
                  size="sm"
                  className="text-foreground text-white border-border"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button noMotion variant="outline" size="sm" className="text-foreground text-white border-border">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button noMotion size="sm" className="text-foreground text-white">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 