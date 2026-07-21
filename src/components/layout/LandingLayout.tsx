"use client"

import { HomeNavbar } from './HomeNavbar'
import { Footer } from './Footer'

interface LandingLayoutProps {
  children: React.ReactNode
  primaryRateHref?: string
}

export function LandingLayout({ children, primaryRateHref = '/performances' }: LandingLayoutProps) {
  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Navbar overlays hero — scrolls with page, not sticky */}
      <HomeNavbar primaryRateHref={primaryRateHref} />

      {/* Main content */}
      <main className="flex-1 w-full relative z-0">
        {children}
      </main>

      {/* Footer - only for landing page */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}

