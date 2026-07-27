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
      <div style={{ position: 'relative', zIndex: 999, background: 'transparent', width: '100%' }}>
        <HomeNavbar />
      </div>

      <main
        className="flex-1 w-full relative"
        style={{ zIndex: 10, position: 'relative', maxWidth: '100vw', overflowX: 'clip' }}
      >
        {children}
      </main>

    </div>
  )
}
