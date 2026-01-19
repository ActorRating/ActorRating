"use client"

import Link from 'next/link'
import { useUser } from '@/components/providers/SessionProvider'
import { handleLogout } from '@/lib/auth'
import { Button } from '../ui/Button'
import { usePathname } from 'next/navigation'
import { Logo } from '../ui/Logo'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { User, Home, Search } from 'lucide-react'

export function SignedInNavbar() {
  const user = useUser()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 isolate navbar-fade" suppressHydrationWarning>
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

  if (!user) {
    return null
  }

  return (
    <nav className="sticky top-0 z-50 isolate text-foreground navbar-fade" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Logo href="/dashboard" />
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link href="/dashboard" className="group">
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
            </Link>
            <Link href="/search" className="group">
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
            </Link>

            {/* Profile button */}
            <Link href="/profile" className="group">
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
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 