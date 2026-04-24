"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthButton } from './auth/AuthButton'
import { useSession } from '@/components/providers/SessionProvider'
import { handleLogoutWithRedirect } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Logo } from './ui/Logo'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Rate', href: '/rate' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'transparent',
        backgroundColor: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}
      suppressHydrationWarning
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo href="/" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                prefetch={item.href === '/' ? false : undefined}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href ? "text-primary" : "text-white/95"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Desktop auth button */}
            <div className="hidden lg:block">
              <AuthButton />
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="lg:hidden"
            style={{
              background: 'linear-gradient(to bottom, #000000 0%, #1c1c1c 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0 0 28px 28px',
            }}
          >
            <div className="px-4 py-5 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={item.href === '/' ? false : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "text-[#FFD700] bg-[#FFD700]/10"
                      : "text-white/80 hover:text-white hover:bg-white/8"
                  )}
                >
                  {item.name}
                </Link>
              ))}

              {/* Divider */}
              <div className="my-3 border-t border-white/8" />

              {/* Auth action */}
              {loading ? null : user ? (
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); void handleLogoutWithRedirect() }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white/80 border border-white/12 hover:bg-white/8 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); router.push('/auth/signin') }}
                    className="w-full py-3 rounded-xl text-sm font-bold text-black transition-all duration-200 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)' }}
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}