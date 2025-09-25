"use client"

import Link from 'next/link'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '../ui/Button'
import { Home } from 'lucide-react'
import { Logo } from '../ui/Logo'

export function SearchNavbar() {
  const user = useUser()
  const navKey = `${status}-${session?.user?.id || 'anon'}`
  const [mounted, setMounted] = require('react').useState(false) as [boolean, (v: boolean) => void]
  
  // Defensively clear any leftover overlays that might cover the right actions
  // eslint-disable-next-line react-hooks/rules-of-hooks
  require('react');
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
    <nav className="bg-secondary/70 border-b border-border sticky top-0 z-50 isolate text-foreground" suppressHydrationWarning>
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
          <div className="flex items-center gap-2 min-w-[260px] justify-end text-foreground text-white opacity-100 relative z-10 pointer-events-auto mix-blend-normal">
            {status === "loading" || !mounted ? (
              <div className="flex items-center gap-2" aria-busy>
                <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse hidden sm:block" />
              </div>
            ) : session ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block select-none">
                  {session.user?.email}
                </span>
                <Button 
                  noMotion
                  onClick={() => supabase.auth.signOut({ callbackUrl: '/' })} 
                  variant="outline" 
                  size="sm"
                  className="text-foreground text-white border-border"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 