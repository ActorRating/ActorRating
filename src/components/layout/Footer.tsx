"use client"

import Link from 'next/link'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'

export function Footer() {
  const { openSettings } = useCookieConsentContext()
  
  return (
    <footer className="bg-black w-full mt-auto border-t border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-16">
        {/* Main Footer Content - Enhanced Multi-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Branding Column */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
              ActorRating
            </h3>
            <p className="text-[#a3a3a3] text-sm leading-relaxed">
              Rate and analyze acting performances using Oscar-inspired criteria.
            </p>
          </div>

          {/* Explore Column */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Explore</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/performances" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Recent Performances
              </Link>
              <Link href="/search" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Search Actors
              </Link>
              <Link href="/dashboard" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Your Dashboard
              </Link>
            </nav>
          </div>

          {/* Popular Actors Column */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Popular Actors</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/actors/al-pacino" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Al Pacino
              </Link>
              <Link href="/actors/meryl-streep" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Meryl Streep
              </Link>
              <Link href="/actors/robert-de-niro" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Robert De Niro
              </Link>
              <Link href="/actors/leonardo-dicaprio" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Leonardo DiCaprio
              </Link>
            </nav>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <nav className="flex flex-col gap-3">
              <Link href="/about" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                About Us
              </Link>
              <Link href="/privacy" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Terms of Service
              </Link>
              <Link href="/kvkk" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                KVKK
              </Link>
              <a href="mailto:contact@actorrating.com" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 text-sm">
                Contact
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#1a1a1a]">
          <div className="text-sm text-[#a3a3a3] font-light tracking-wide">
            © 2025 ActorRating. All rights reserved.
          </div>
          <button 
            onClick={openSettings}
            className="text-sm text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide underline"
          >
            Cookie Preferences
          </button>
        </div>
      </div>
    </footer>
  )
}
