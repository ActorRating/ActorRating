"use client"

import Link from 'next/link'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'

export function Footer() {
  const { openSettings } = useCookieConsentContext()
  
  return (
    <footer className="bg-secondary/50 backdrop-blur-sm border-t border-border w-full">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-4 text-center md:text-left">
          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            © 2025 ActorRating.com. All rights reserved.
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 sm:gap-x-6 gap-y-1 md:gap-y-0 text-sm whitespace-normal break-words">
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </Link>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <Link href="/kvkk" className="text-muted-foreground hover:text-foreground transition-colors">
              KVKK
            </Link>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <a href="mailto:contact@actorrating.com" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact / Support
            </a>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <button 
              onClick={openSettings}
              className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Cookie Settings
            </button>
          </nav>
        </div>
        <div className="mt-2 md:mt-3 text-[11px] sm:text-xs text-muted-foreground/80 text-center md:text-left">
          GDPR compliance is covered in our Privacy Policy.
        </div>
      </div>
    </footer>
  )
}