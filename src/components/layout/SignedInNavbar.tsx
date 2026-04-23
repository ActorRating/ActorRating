"use client"

import { PrefetchLink } from '@/components/ui/PrefetchLink'
import { useSession } from '@/components/providers/SessionProvider'
import { Button } from '../ui/Button'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '../ui/Logo'
import { useEffect, useState } from 'react'
import { User, Home, Search } from 'lucide-react'

const KEY_ROUTES = ['/dashboard', '/search', '/profile', '/rate'] as const

export function SignedInNavbar() {
  const { user, loading, isInitialized } = useSession()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prefetch key routes on mount so first click feels instant
  useEffect(() => {
    if (!mounted || !user) return
    KEY_ROUTES.forEach((route) => {
      try {
        if (typeof router.prefetch === 'function') router.prefetch(route)
      } catch {}
    })
  }, [mounted, user, router])

  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 isolate" style={{ backgroundColor: 'rgb(0, 0, 0)', borderBottom: '1px solid rgba(255, 215, 0, 0.1)' }} suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center space-x-3">
              <Button disabled size="sm" noMotion>
                Loading...
              </Button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!isInitialized || loading) {
    return (
      <nav className="sticky top-0 z-50 isolate" style={{ backgroundColor: 'rgb(0, 0, 0)', borderBottom: '1px solid rgba(255, 215, 0, 0.1)' }} suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center space-x-3">
              <Button disabled size="sm" noMotion>
                Loading...
              </Button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // Session resolved to unauthenticated — show a minimal bar with sign-in link.
  // This is a rare edge-case (JWT expired while the page is open); the next
  // navigation will hit middleware and redirect properly.  Never router.push here.
  if (!user) {
    return (
      <nav className="sticky top-0 z-50 isolate" style={{ backgroundColor: 'rgb(0, 0, 0)', borderBottom: '1px solid rgba(255, 215, 0, 0.1)' }} suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo href="/" />
            <PrefetchLink href="/auth/signin">
              <button className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-[#FFD700] bg-[#1a1a1a] border border-white/10 transition-colors duration-200 min-h-[40px]">
                Sign In
              </button>
            </PrefetchLink>
          </div>
        </div>
      </nav>
    )
  }

  // Derive profile href: authenticated → /profile, just in case user is null use signin
  const profileHref = user ? "/profile" : "/auth/signin"

  return (
    <nav className="sticky top-0 z-50 isolate text-foreground" style={{ backgroundColor: 'rgb(0, 0, 0)', borderBottom: '1px solid rgba(255, 215, 0, 0.1)' }} suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center">
              <Logo href="/dashboard" />
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <PrefetchLink href="/dashboard" className="group">
              <button
                className={`
                  relative px-4 py-3 rounded-xl border border-transparent 
                  bg-[#1a1a1a] 
                  overflow-hidden transition-all duration-300
                  min-h-[48px] min-w-[48px] touch-manipulation
                  ${pathname === "/dashboard" 
                    ? 'border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.15)]' 
                    : 'hover:border-[#FFD700]/20 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                  }
                `}
                style={{
                  boxShadow: pathname === "/dashboard" ? `
                    0 15px 40px -10px rgba(0, 0, 0, 0.8),
                    0 8px 20px -5px rgba(0, 0, 0, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  ` : `
                    0 10px 30px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                  `,
                }}
                aria-label="Home"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl" />
                </div>
                <Home className={`w-4 h-4 relative z-10 transition-colors duration-200 ${pathname === "/dashboard" ? 'text-[#FFD700]' : 'text-gray-400 group-hover:text-[#FFD700]'}`} />
              </button>
            </PrefetchLink>
            <PrefetchLink href="/search" className="group">
              <button
                className={`
                  relative px-4 py-3 rounded-xl border border-transparent 
                  bg-[#1a1a1a] 
                  overflow-hidden transition-all duration-300
                  min-h-[48px] min-w-[48px] touch-manipulation
                  ${pathname === "/search" 
                    ? 'border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.15)]' 
                    : 'hover:border-[#FFD700]/20 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                  }
                `}
                style={{
                  boxShadow: pathname === "/search" ? `
                    0 15px 40px -10px rgba(0, 0, 0, 0.8),
                    0 8px 20px -5px rgba(0, 0, 0, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  ` : `
                    0 10px 30px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                  `,
                }}
                aria-label="Search"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl" />
                </div>
                <Search className={`w-4 h-4 relative z-10 transition-colors duration-200 ${pathname === "/search" ? 'text-[#FFD700]' : 'text-gray-400 group-hover:text-[#FFD700]'}`} />
              </button>
            </PrefetchLink>

            {/* Profile button — routes based on auth state, never triggers navigation programmatically */}
            <PrefetchLink href={profileHref} className="group">
              <button
                className={`
                  relative px-4 py-3 rounded-xl border border-transparent 
                  bg-[#1a1a1a] 
                  backdrop-blur-xl overflow-hidden transition-all duration-300
                  min-h-[48px] touch-manipulation
                  ${pathname === "/profile" 
                    ? 'border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.15)]' 
                    : 'hover:border-[#FFD700]/20 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                  }
                `}
                style={{
                  boxShadow: pathname === "/profile" ? `
                    0 15px 40px -10px rgba(0, 0, 0, 0.8),
                    0 8px 20px -5px rgba(0, 0, 0, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  ` : `
                    0 10px 30px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                  `,
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl" />
                </div>
                <span className="flex items-center gap-2 relative z-10">
                  <User className={`w-4 h-4 transition-colors duration-200 ${pathname === "/profile" ? 'text-[#FFD700]' : 'text-gray-400 group-hover:text-[#FFD700]'}`} />
                  <span className={`text-sm transition-colors duration-200 ${pathname === "/profile" ? 'text-[#FFD700]' : 'text-gray-300 group-hover:text-[#FFD700]'}`}>Profile</span>
                </span>
              </button>
            </PrefetchLink>
          </div>
        </div>
      </div>
    </nav>
  )
} 