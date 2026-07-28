"use client"

import Link from 'next/link'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'
import { useUser } from '@/components/providers/SessionProvider'
import { useState, useEffect } from 'react'
import { TmdbAttribution } from '@/components/attribution/TmdbAttribution'
import { FaInstagram, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6'

const GOLD_TEXT_STYLE = {
  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
}

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/actorrating',
    Icon: FaInstagram,
  },
  {
    label: 'X',
    href: 'https://x.com/actorrating',
    Icon: FaXTwitter,
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@actorrating',
    Icon: FaTiktok,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@actorrating',
    Icon: FaYoutube,
  },
] as const

export function Footer() {
  const { openSettings } = useCookieConsentContext()
  const user = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <footer className="bg-black w-full mt-auto" style={{ borderTop: '1px solid rgba(255,215,0,0.1)' }}>
      <div className="max-w-5xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-16 sm:py-20">

        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">

          <div className="md:col-span-2">
            <h3
              className="text-xl font-bold mb-3"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                ...GOLD_TEXT_STYLE,
              }}
            >
              ActorRating
            </h3>
            <p className="text-sm text-[#666] leading-relaxed mb-5 max-w-xs">
              The leading place online to rate and find great acting — from silent film to today.
            </p>
            <p className="text-xs text-[#444] tracking-wider uppercase mb-6">
              The IMDB for Acting Performance
            </p>
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] text-[#888] hover:text-[#FFD700] hover:border-[#FFD700]/35 transition-colors"
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-[#555] mb-5">
              Explore
            </h4>
            <nav className="flex flex-col gap-3.5">
              <Link href="/discover" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Discover
              </Link>
              <Link href="/search" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Search
              </Link>
              <Link href="/lists" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Lists
              </Link>
              <Link href="/stories" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Stories
              </Link>
              <Link href="/news" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                News
              </Link>
              {mounted && user && (
                <Link href="/dashboard" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                  My Dashboard
                </Link>
              )}
            </nav>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-[#555] mb-5">
              Popular Actors
            </h4>
            <nav className="flex flex-col gap-3.5">
              <Link href="/actors/al-pacino" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Al Pacino
              </Link>
              <Link href="/actors/meryl-streep" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Meryl Streep
              </Link>
              <Link href="/actors/robert-de-niro" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Robert De Niro
              </Link>
              <Link href="/actors/leonardo-dicaprio" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Leonardo DiCaprio
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-[#555] mb-5">
              Company
            </h4>
            <nav className="flex flex-col gap-3.5">
              <Link href="/about" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                About
              </Link>
              <Link href="/privacy" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/kvkk" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                KVKK
              </Link>
              <a href="mailto:contact@actorrating.com" className="text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200">
                Contact
              </a>
            </nav>
          </div>
        </div>

        <div className="mb-8">
          <TmdbAttribution variant="footer" />
        </div>

        <div className="w-full h-px mb-8" style={{ background: 'rgba(255,215,0,0.08)' }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#444] font-light tracking-widest uppercase">
            © 2026 ActorRating. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={openSettings}
              className="text-xs text-[#444] hover:text-[#FFD700] transition-colors duration-200 tracking-wider uppercase underline decoration-[#333] hover:decoration-[#FFD700]/50"
            >
              Cookie Preferences
            </button>
          </div>
        </div>

      </div>
    </footer>
  )
}
