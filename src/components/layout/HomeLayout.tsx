"use client"

import { HomeNavbar } from './HomeNavbar'

interface HomeLayoutProps {
  children: React.ReactNode
  transparentBackground?: boolean
}

export function HomeLayout({ children, transparentBackground = false }: HomeLayoutProps) {
  return (
    <div 
      className={`min-h-screen flex flex-col relative w-full ${transparentBackground ? '' : 'bg-background'}`} 
      style={{ zIndex: 1, maxWidth: '100vw', overflowX: 'clip', minHeight: '100dvh' }}
    >
      <div className="relative z-50 w-full">
        <HomeNavbar />
      </div>

      <main
        className="flex-1 w-full relative pt-16 sm:pt-20 z-0"
        style={{ position: 'relative', maxWidth: '100vw', overflowX: 'clip' }}
      >
        {children}
      </main>

    </div>
  )
}
