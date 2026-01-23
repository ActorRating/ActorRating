"use client"

import { HomeNavbar } from './HomeNavbar'
import { Footer } from './Footer'
import { FeedbackSection } from '../FeedbackSection'

interface LandingLayoutProps {
  children: React.ReactNode
}

export function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Navbar */}
      <div style={{ position: 'relative', zIndex: 999, background: 'transparent', width: '100%' }}>
        <HomeNavbar />
      </div>

      {/* Main content */}
      <main
        className="flex-1 w-full"
        style={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </main>

      {/* Footer - only for landing page */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Footer />
      </div>

      {/* Feedback Section */}
      <FeedbackSection />
    </div>
  )
}

