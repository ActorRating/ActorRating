"use client"

import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'

export function CookieBanner() {
  const { showBanner, acceptAll, rejectAll, openSettings } = useCookieConsentContext()

  if (!showBanner) return null

  return (
    <div 
      className="bg-gradient-to-br from-[#1a1a1a]/98 via-[#0f0f0f]/95 to-black/98 backdrop-blur-2xl border-t border-[#FFD700]/30"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        boxShadow: `
          0 -10px 40px rgba(0, 0, 0, 0.8),
          0 -5px 20px rgba(255, 215, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.08)
        `,
        width: '100%',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5">
          {/* Compact Text */}
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm sm:text-base text-[#e4e4e7] leading-relaxed font-light">
              We use cookies to enhance your experience.{' '}
              <button 
                onClick={openSettings}
                className="text-[#FFD700] hover:text-[#FFE55C] underline underline-offset-2 transition-colors duration-300 font-medium"
              >
                Learn more
              </button>
            </p>
          </div>
          
          {/* Compact Buttons */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <button
              onClick={rejectAll}
              className="px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium text-[#d4d4d8] hover:text-white border border-[#737373]/50 rounded-full hover:border-[#737373]/70 transition-all duration-300 bg-gradient-to-br from-[#0a0a0a]/90 to-black/90 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              style={{
                boxShadow: `
                  0 5px 15px -5px rgba(0, 0, 0, 0.5),
                  0 0 0 1px rgba(255, 255, 255, 0.03),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              Reject
            </button>
            <button
              onClick={acceptAll}
              className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-black bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFA500] rounded-full hover:from-[#FFE55C] hover:via-[#FFE55C] hover:to-[#FFD700] transition-all duration-300 hover:scale-105"
              style={{
                boxShadow: `
                  0 0 8px rgba(255, 215, 0, 0.15),
                  0 3px 10px -3px rgba(0, 0, 0, 0.3)
                `,
              }}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}