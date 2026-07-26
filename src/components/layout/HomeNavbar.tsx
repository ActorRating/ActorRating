"use client"

import Link from 'next/link'
import { useSession } from '@/components/providers/SessionProvider'
import { handleLogout } from '@/lib/auth'
import { Logo } from '../ui/Logo'
import { useState, useEffect, useRef, FormEvent, type ReactNode } from 'react'
import { FaSearch, FaTimes, FaBars } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_LINKS = [
  { label: 'Discover', href: '/discover' },
  { label: 'Lists', href: '/lists' },
  { label: 'Stories', href: '/stories' },
  { label: 'News', href: '/news' },
] as const

const DESKTOP_LINK_CLASS =
  'navbar-link-desktop group relative px-3 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white hover:text-[#FFD700] transition-colors duration-200'

function DesktopNavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={DESKTOP_LINK_CLASS}>
      {children}
      <span
        className="absolute bottom-0 left-3 right-3 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"
        style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
      />
    </Link>
  )
}

export function HomeNavbar({ primaryRateHref = '/discover' }: { primaryRateHref?: string }) {
  // primaryRateHref kept for LandingLayout API compat; Rate Now CTA removed from nav.
  void primaryRateHref
  const { user, loading, isInitialized } = useSession()
  const router = useRouter()
  const homeHref = user ? '/dashboard' : '/'
  const navKey = `${user?.id || 'anon'}`
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [navKey])

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus()
  }, [mobileSearchOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
        setMobileSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    setSearchQuery('')
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
  }

  const desktopSearch = (
    <form
      onSubmit={handleSearch}
      className="hidden lg:flex items-center navbar-search-form"
      role="search"
    >
      <label htmlFor="navbar-search" className="sr-only">
        Search actors and films
      </label>
      <div className="relative flex items-center">
        <input
          id="navbar-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder=""
          className="navbar-search-input w-48 h-9 pl-3 pr-9 rounded-full text-sm text-white outline-none transition-colors duration-200"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-white pointer-events-none"
          aria-label="Search"
          tabIndex={-1}
        >
          <FaSearch className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  )

  return (
    <div className="navbar-cinematic">
      <nav className="relative w-full z-[1]" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center h-16 sm:h-20">

            <div className="flex items-center flex-shrink-0">
              <Logo href={homeHref} showText />
            </div>

            {/* One continuous link row — equal size + spacing for every item */}
            <div className="hidden lg:flex items-center gap-1 pointer-events-auto navbar-content">
              {NAV_LINKS.map((link) => (
                <DesktopNavLink key={link.href} href={link.href}>
                  {link.label}
                </DesktopNavLink>
              ))}
              {!mounted || !isInitialized || loading ? (
                <div className="h-8 w-28 rounded-md bg-[#1a1a1a] animate-pulse" />
              ) : user ? (
                <>
                  <DesktopNavLink href="/dashboard">Dashboard</DesktopNavLink>
                  <button
                    type="button"
                    onClick={() => handleLogout()}
                    className={DESKTOP_LINK_CLASS}
                  >
                    Sign Out
                    <span
                      className="absolute bottom-0 left-3 right-3 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"
                      style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
                    />
                  </button>
                </>
              ) : (
                <>
                  <DesktopNavLink href="/auth/signin">Sign In</DesktopNavLink>
                  <DesktopNavLink href="/auth/register">Join Free</DesktopNavLink>
                </>
              )}
            </div>

            {/* Search farthest right on desktop */}
            <div className="flex items-center gap-3 sm:gap-4">
              {desktopSearch}

              <button
                type="button"
                className="lg:hidden p-2.5 text-white hover:text-[#FFD700] transition-colors duration-200"
                onClick={() => {
                  setMobileSearchOpen((open) => !open)
                  setMobileMenuOpen(false)
                }}
                aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
                aria-expanded={mobileSearchOpen}
              >
                {mobileSearchOpen ? <FaTimes className="w-5 h-5" /> : <FaSearch className="w-5 h-5" />}
              </button>

              <button
                className="lg:hidden p-2.5 text-white hover:text-[#FFD700] transition-colors duration-200"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen)
                  setMobileSearchOpen(false)
                }}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:hidden overflow-hidden border-b border-white/10 bg-black"
          >
            <form onSubmit={handleSearch} className="px-4 py-3" role="search">
              <label htmlFor="navbar-search-mobile" className="sr-only">
                Search actors and films
              </label>
              <div className="relative flex items-center">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />
                <input
                  ref={mobileSearchRef}
                  id="navbar-search-mobile"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search actors or films…"
                  className="navbar-search-input w-full h-11 pl-10 pr-4 rounded-full text-base text-white outline-none"
                  autoComplete="off"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-full left-0 right-0 z-40 lg:hidden"
            style={{
              background: 'linear-gradient(to bottom, #000000 0%, #1c1c1c 100%)',
              borderBottom: '1px solid rgba(255,215,0,0.1)',
              backdropFilter: 'blur(16px)',
              borderRadius: '0 0 28px 28px',
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={`mobile-${link.href}`}
                  href={link.href}
                  className="px-4 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-white hover:text-[#FFD700] transition-colors duration-200 rounded-lg hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {mounted && (
                <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {user ? (
                    <>
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center px-4 py-3 rounded-xl text-sm text-gray-300 bg-[#111] border border-white/5">
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                        className="flex-1 px-4 py-3 rounded-xl text-sm text-gray-300 bg-[#111] border border-white/5"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <div className="flex w-full gap-3">
                      <Link
                        href="/auth/signin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-white/10 border border-white/20"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/auth/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-white/10 border border-white/20"
                      >
                        Join Free
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
