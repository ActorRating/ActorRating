"use client"

import { useRouter } from 'next/navigation'
import { FaArrowLeft } from 'react-icons/fa'

export function RatePageLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black">
      {/* Back Button - Not sticky, at top of content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors duration-200 min-h-[48px] touch-manipulation group"
          style={{
            boxShadow: `
              0 10px 30px -10px rgba(0, 0, 0, 0.7),
              0 0 0 1px rgba(255, 255, 255, 0.05)
            `,
          }}
          aria-label="Go back"
        >
          <FaArrowLeft className="w-4 h-4 text-[#FFD700] group-hover:text-[#FFE55C] transition-colors duration-200" />
          <span className="text-sm font-medium text-white">Back</span>
        </button>
      </div>

      {/* Main Content */}
      <div>
        {children}
      </div>
    </div>
  )
}
