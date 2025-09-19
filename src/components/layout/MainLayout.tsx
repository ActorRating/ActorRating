"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, SkipForward } from 'lucide-react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { Breadcrumb } from './Breadcrumb'
import { cn } from '@/lib/utils'
import { fadeIn, fadeInUp, getMotionProps } from '@/lib/animations'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  showBreadcrumbs?: boolean
  showFooter?: boolean
  className?: string
  sidebarCollapsed?: boolean
  onSidebarToggle?: (collapsed: boolean) => void
}

export function MainLayout({
  children,
  showSidebar = true,
  showBreadcrumbs = true,
  showFooter = true,
  className = '',
  sidebarCollapsed = false,
  onSidebarToggle
}: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(!sidebarCollapsed)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [skipToContent, setSkipToContent] = useState(false)

  // Handle sidebar toggle
  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarOpen(collapsed)
    onSidebarToggle?.(collapsed)
  }

  // Handle mobile sidebar toggle
  const handleMobileSidebarToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  // Skip to content functionality
  const handleSkipToContent = () => {
    setSkipToContent(true)
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth' })
    }
    setTimeout(() => setSkipToContent(false), 1000)
  }

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip to content link for accessibility */}
      <AnimatePresence>
        {skipToContent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-2">
              <SkipForward className="w-4 h-4" />
              <span className="text-sm font-medium">Skipped to content</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip to content button */}
      <button
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:flex focus:items-center focus:gap-2"
      >
        <SkipForward className="w-4 h-4" />
        <span className="text-sm font-medium">Skip to content</span>
      </button>

      {/* Header */}
      <Header 
        onSidebarToggle={handleSidebarToggle}
        onMobileSidebarToggle={handleMobileSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-x-hidden">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden lg:block max-w-full">
            <Sidebar 
              isOpen={isSidebarOpen}
              onToggle={handleSidebarToggle}
              variant="desktop"
            />
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 h-full w-80 max-w-[85vw] z-50 lg:hidden"
              >
                <Sidebar 
                  isOpen={true}
                  onToggle={() => setIsMobileSidebarOpen(false)}
                  variant="mobile"
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main 
          id="main-content"
          className={cn(
            "flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden",
            showSidebar && "lg:ml-0",
            className
          )}
          tabIndex={-1}
        >
          {/* Breadcrumbs */}
          {showBreadcrumbs && (
            <motion.div
              variants={fadeIn}
              {...getMotionProps()}
              className="border-b border-border bg-secondary/30"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                <Breadcrumb />
              </div>
            </motion.div>
          )}

          {/* Page content */}
          <motion.section
            variants={fadeInUp}
            {...getMotionProps()}
            className="flex-1"
          >
            {children}
          </motion.section>
        </main>
      </div>

      {/* Footer */}
      {showFooter && (
        <motion.div variants={fadeIn} {...getMotionProps()}>
          <Footer />
        </motion.div>
      )}
    </div>
  )
} 