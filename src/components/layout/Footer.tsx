"use client"

import Link from 'next/link'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'

export function Footer() {
  const { openSettings } = useCookieConsentContext()
  
  return (
    <footer className="bg-black w-full mt-auto">
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-12">
        {/* Main Footer Content - Clean Single Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          {/* Copyright */}
          <div className="text-sm text-[#a3a3a3] font-light tracking-wide">
            © 2025 ActorRating. All rights reserved.
          </div>
          
          {/* Navigation Links */}
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/about" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              About
            </Link>
            <Link href="/privacy" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              Privacy
            </Link>
            <Link href="/terms" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              Terms
            </Link>
            <Link href="/kvkk" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              KVKK
            </Link>
            <a href="mailto:contact@actorrating.com" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              Contact
            </a>
            <button 
              onClick={openSettings}
              className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide"
            >
              Settings
            </button>
          </nav>
        </div>
      </div>
    </footer>
  )
}