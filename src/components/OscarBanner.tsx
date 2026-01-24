"use client"

import Link from "next/link"
import { FaTrophy, FaArrowRight } from "react-icons/fa"

interface OscarBannerProps {
  maxWidth?: string
  buttonMarginLeft?: boolean
}

export function OscarBanner({ maxWidth = '1280px', buttonMarginLeft = false }: OscarBannerProps) {
  return (
    <div className="relative z-10 bg-black py-8 sm:py-12 md:py-16">
      <div className="w-full relative mx-auto" style={{ maxWidth, paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <Link href="/oscars-2026" className="block">
          <div
            className="group relative p-8 sm:p-10 md:p-12 lg:p-14 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.2)] cursor-pointer w-full"
            style={{
              boxShadow: `
                0 20px 60px -15px rgba(0, 0, 0, 0.9),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
              `,
            }}
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem] overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full bg-[#FFD700]/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
              {/* Left: Trophy + Text */}
              <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full sm:w-auto">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                  <FaTrophy className="w-7 h-7 sm:w-8 sm:h-8 md:w-8 md:h-8 text-[#FFD700]" />
                </div>
                <div className="flex-1 sm:flex-none text-center sm:text-left min-w-0">
                  <h3
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 leading-tight"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Oscar 2026
                    </span>{' '}
                    <span className="hidden sm:inline">Acting Performances</span>
                    <span className="sm:hidden">Nominees</span>
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-[#d4d4d8]">
                    Rate this year's nominees
                  </p>
                </div>
              </div>

              {/* Right: CTA Button */}
              <button
                className={`flex-shrink-0 px-7 sm:px-8 md:px-10 py-3.5 sm:py-4 md:py-5 rounded-full text-black text-base sm:text-lg md:text-xl font-bold tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 ${buttonMarginLeft ? 'md:ml-8 lg:ml-12' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                }}
                onClick={(e) => {
                  e.preventDefault()
                  window.location.href = '/oscars-2026'
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="sm:hidden">Rate Now</span>
                  <span className="hidden sm:inline">Rate Nominees</span>
                  <FaArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-2" />
                </span>
              </button>
            </div>

            {/* Decorative corner accent */}
            <div className="absolute bottom-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[60px] sm:rounded-tl-[80px] pointer-events-none" />
          </div>
        </Link>
      </div>
    </div>
  )
}
