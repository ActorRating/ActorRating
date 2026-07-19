"use client"

import Link from 'next/link'
import { useSession } from '@/components/providers/SessionProvider'
import { handleLogout } from '@/lib/auth'
import { Logo } from '../ui/Logo'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { FaSearch, FaTimes, FaBars } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { prefetchPerformancesPageData } from '@/lib/performances-page-targets'

type NavLink = {
  label: string
  href: string
  scrollTo?: string   // element id to scroll to if present on current page
}

const NAV_LINKS: NavLink[] = [
  { label: 'Performances', href: '/performances' },
  { label: 'Top Rated',    href: '/performances', scrollTo: 'leaderboard' },
  { label: 'Lists',        href: '/lists' },
  { label: 'About',        href: '/about' },
]

export function HomeNavbar({ primaryRateHref = '/performances' }: { primaryRateHref?: string }) {
  const { user, loading, isInitialized } = useSession()
  const router = useRouter()

  const prefetchRateHref = () => {
    if (primaryRateHref.startsWith('/rate/')) {
      router.prefetch(primaryRateHref)
    } else {
      prefetchPerformancesPageData()
      router.prefetch('/performances')
    }
  }
  const homeHref = user ? '/dashboard' : '/'
  const navKey = `${user?.id || 'anon'}`
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [navKey])

  useEffect(() => {
    if (!mounted) return
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [mounted])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearchOpen(false); setMobileMenuOpen(false) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
    setSearchQuery('')
    setMobileMenuOpen(false)
  }

  const closeSearch = () => { setSearchOpen(false); setSearchQuery('') }

  /** Handle nav link click — scroll to element if scrollTo is set and element exists */
  const handleNavLinkClick = (e: React.MouseEvent, link: NavLink) => {
    if (!link.scrollTo) return
    const el = document.getElementById(link.scrollTo)
    if (el) {
      e.preventDefault()
      setMobileMenuOpen(false)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // If element not found (different page), fall through to normal navigation
  }

  return (
    <>
      <nav
        className={`navbar-cinematic ${scrolled ? 'navbar-scrolled' : ''}`}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          background: 'rgb(0, 0, 0)',
          backgroundColor: 'rgb(0, 0, 0)',
          borderBottom: '1px solid rgba(255, 215, 0, 0.1)',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.9)' : '0 4px 20px rgba(0,0,0,0.5)',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'all 0.3s ease-in-out',
        }}
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center h-16 sm:h-20">

            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Logo href={homeHref} />
            </div>

            {/* Center nav — desktop only */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  onClick={(e) => handleNavLinkClick(e, link)}
                  className="group relative px-4 py-2 text-sm font-medium text-[#a3a3a3] hover:text-white transition-colors duration-200"
                >
                  {link.label}
                  <span
                    className="absolute bottom-0 left-4 right-4 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"
                    style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
                  />
                </Link>
              ))}
            </div>

            {/* Right side: search + auth + hamburger */}
            <div className="flex items-center gap-2">

              {/* Search toggle (desktop) */}
              <div className="hidden sm:block relative">
                {searchOpen ? (
                  <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search actor or film…"
                      className="w-52 md:w-64 px-4 py-2 rounded-full text-white text-base placeholder-[#555] outline-none transition-all duration-200"
                      style={{
                        background: '#111',
                        border: '1px solid rgba(255,215,0,0.4)',
                        boxShadow: '0 0 12px rgba(255,215,0,0.08)',
                        minHeight: '38px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={closeSearch}
                      className="p-2 text-[#666] hover:text-white transition-colors"
                      aria-label="Close search"
                    >
                      <FaTimes className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2.5 rounded-full text-[#666] hover:text-[#FFD700] transition-colors duration-200"
                    aria-label="Open search"
                  >
                    <FaSearch className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Auth — desktop */}
              <div className={`hidden sm:flex items-center gap-2 min-w-[100px] justify-end pointer-events-auto navbar-content ${scrolled ? 'navbar-content-scrolled' : ''}`}>
                {!mounted || !isInitialized || loading ? (
                  <div className="h-8 w-20 rounded-md bg-[#1a1a1a] animate-pulse" />
                ) : user ? (
                  <>
                    <Link href="/dashboard">
                      <button className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-[#FFD700] bg-[#111] border border-white/5 hover:border-[#FFD700]/20 transition-all duration-200 min-h-[40px]">
                        Dashboard
                      </button>
                    </Link>
                    <button
                      onClick={() => handleLogout()}
                      className="px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-[#FFD700] bg-[#111] border border-white/5 hover:border-[#FFD700]/20 transition-all duration-200 min-h-[40px]"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      className="text-sm text-[#a3a3a3] hover:text-white transition-colors duration-200 px-2"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signin"
                      className="text-sm text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-200 px-2"
                    >
                      Join Free
                    </Link>
                    <Link href={primaryRateHref} onMouseEnter={prefetchRateHref}>
                      <button
                        className="px-5 py-2 rounded-full text-sm font-bold text-black hover:scale-105 transition-transform duration-200 min-h-[40px]"
                        style={{ background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)' }}
                        aria-label="Rate now"
                      >
                        Rate Now
                      </button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2.5 text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-16 sm:top-20 left-0 right-0 z-40 lg:hidden"
            style={{
              background: 'linear-gradient(to bottom, #000000 0%, #1c1c1c 100%)',
              borderBottom: '1px solid rgba(255,215,0,0.1)',
              backdropFilter: 'blur(16px)',
              borderRadius: '0 0 28px 28px',
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search actor or film…"
                  className="w-full pl-9 pr-4 py-3 rounded-full text-white text-base placeholder-[#555] outline-none"
                  style={{ background: '#111', border: '1px solid rgba(255,215,0,0.2)' }}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-full text-black text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)' }}
              >
                Go
              </button>
            </form>

            {/* Nav links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={`mobile-${link.href}-${link.label}`}
                href={link.href}
                className="px-4 py-3 text-sm font-medium text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-200 rounded-lg hover:bg-white/5"
                onClick={(e) => {
                  handleNavLinkClick(e, link)
                  setMobileMenuOpen(false)
                }}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile auth */}
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
                  <>
                    <Link
                      href={primaryRateHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full mb-2"
                      onMouseEnter={prefetchRateHref}
                    >
                      <button
                        className="w-full px-4 py-3 rounded-xl text-sm font-bold text-black"
                        style={{ background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)' }}
                      >
                        Rate Now
                      </button>
                    </Link>
                    <div className="flex w-full gap-3">
                      <Link
                        href="/auth/signin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center px-4 py-3 rounded-xl text-sm text-[#a3a3a3] bg-[#111] border border-white/5"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/auth/signin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center px-4 py-3 rounded-xl text-sm text-[#a3a3a3] bg-[#111] border border-white/5"
                      >
                        Join Free
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
