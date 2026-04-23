"use client"

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'

export function RatePageLayout({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  const router = useRouter()

  // Hide any navbars on rate pages
  useEffect(() => {
    const navs = document.querySelectorAll('nav')
    navs.forEach(nav => {
      nav.style.display = 'none'
    })

    return () => {
      // Restore navbars when leaving rate page
      navs.forEach(nav => {
        nav.style.display = ''
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-black">
      {/* Back Button - Fixed at top left, icon-only on mobile, works like browser back */}
      <button
        onClick={() => onBack ? onBack() : router.back()}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-[100] flex items-center justify-center gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-full sm:rounded-xl bg-[#1a1a1a]/90 backdrop-blur-sm hover:bg-[#2a2a2a] transition-colors duration-200 w-10 h-10 sm:w-auto sm:h-auto sm:min-h-[48px] touch-manipulation group border border-white/10"
        style={{
          boxShadow: `
            0 10px 30px -10px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.05)
          `,
        }}
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 text-[#FFD700] group-hover:text-[#FFE55C] transition-colors duration-200 flex-shrink-0" />
        <span className="hidden sm:inline text-sm font-medium text-white">Back</span>
      </button>

      {/* Main Content */}
      <div>
        {children}
      </div>
    </div>
  )
}
