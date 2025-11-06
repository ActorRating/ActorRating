"use client"

import Link from 'next/link'
import { useUser } from '@/components/providers/SessionProvider'
import { handleLogout } from '@/lib/auth'
import { Button } from '../ui/Button'
import { Home } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { useState, useEffect } from 'react'

export function SearchNavbar() {
  const user = useUser()
  const navKey = `${user?.id || 'anon'}`
  const [mounted, setMounted] = useState(false)
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
    <nav className="border-b border-border sticky top-0 z-50 isolate text-foreground" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo href="/" textClassName="text-foreground" />
          </div>

          {/* Center - Home Button */}
          <div className="flex items-center">
            <Link href="/">
              <Button noMotion variant="outline" size="sm" aria-label="Home" className="text-foreground border-border">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Right - keep stable width */}
          <div className="flex items-center gap-2 min-w-[120px] justify-end text-foreground text-white opacity-100 relative z-10 pointer-events-auto mix-blend-normal">
            {!mounted ? (
              <div className="flex items-center gap-2" aria-busy>
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
              </div>
            ) : user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block select-none">
                  {user?.email}
                </span>
                <Button 
                  noMotion
                  onClick={() => handleLogout()} 
                  variant="outline" 
                  size="sm"
                  className="text-foreground text-white border-border"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/auth/signup">
                <Button 
                  noMotion 
                  variant="outline" 
                  size="sm" 
                  className="text-accent border-accent hover:bg-accent/10 hover:border-accent/80 transition-all duration-300"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 