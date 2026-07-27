"use client"

import { HomeNavbar } from './HomeNavbar'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import { useEffect, useState } from 'react'

interface SignedInLayoutProps {
  children: React.ReactNode
}

export function SignedInLayout({ children }: SignedInLayoutProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <HomeNavbar />

      <motion.main 
        variants={fadeIn} 
        initial={mounted ? "hidden" : false} 
        animate={mounted ? "show" : undefined} 
        className="flex-1 max-w-full overflow-x-hidden"
      >
        {children}
      </motion.main>

    </div>
  )
}
