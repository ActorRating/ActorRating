"use client"

import Link from 'next/link'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'

export function Footer() {
  const { openSettings } = useCookieConsentContext()
  
  return (
    <footer className="bg-black border-t border-[#FFD700]/10 w-full">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-6 sm:py-8 md:py-12">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 md:gap-8 text-center md:text-left">
          {/* Copyright */}
          <div className="text-xs sm:text-sm text-[#a3a3a3] leading-relaxed font-light tracking-wide order-2 md:order-1">
            © 2025 ActorRating.com. All rights reserved.
          </div>
          
          {/* Navigation Links */}
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-2 md:gap-y-0 text-xs sm:text-sm whitespace-normal order-1 md:order-2">
            <Link href="/about" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              About
            </Link>
            <span className="hidden sm:inline text-[#737373]">•</span>
            <Link href="/privacy" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              Privacy
            </Link>
            <span className="hidden sm:inline text-[#737373]">•</span>
            <Link href="/terms" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              Terms
            </Link>
            <span className="hidden sm:inline text-[#737373]">•</span>
            <Link href="/kvkk" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              KVKK
            </Link>
            <span className="hidden sm:inline text-[#737373]">•</span>
            <a href="mailto:contact@actorrating.com" className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide">
              Contact
            </a>
            <span className="hidden sm:inline text-[#737373]">•</span>
            <button 
              onClick={openSettings}
              className="text-[#a3a3a3] hover:text-[#FFD700] transition-colors duration-300 font-light tracking-wide"
            >
              Cookies
            </button>
          </nav>
        </div>
        
        {/* Bottom Note */}
        <div className="mt-4 sm:mt-6 md:mt-8 pt-4 sm:pt-6 md:pt-8 border-t border-[#737373]/20">
          <p className="text-[10px] sm:text-xs text-[#737373] text-center md:text-left font-light tracking-wide">
            GDPR compliance is covered in our Privacy Policy.
          </p>
        </div>
      </div>
    </footer>
  )
}