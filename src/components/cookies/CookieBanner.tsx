"use client"

import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'

export function CookieBanner() {
  const { showBanner, acceptAll, rejectAll, openSettings } = useCookieConsentContext()

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-[#FFD700]/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Compact Text */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-[#d4d4d8] leading-tight font-light">
              We use cookies to enhance your experience.{' '}
              <button 
                onClick={openSettings}
                className="text-[#FFD700] hover:text-[#FFE55C] underline underline-offset-2 transition-colors duration-300"
              >
                Learn more
              </button>
            </p>
          </div>
          
          {/* Compact Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={rejectAll}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#a3a3a3] hover:text-white border border-[#737373]/40 rounded-full hover:border-[#737373]/60 transition-all duration-300 bg-black/40 backdrop-blur-sm"
            >
              Reject
            </button>
            <button
              onClick={acceptAll}
              className="px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full hover:from-[#FFE55C] hover:to-[#FFD700] transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)]"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}