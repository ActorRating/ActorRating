"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

interface SignUpToSaveModalProps {
  isOpen: boolean
  onClose: () => void
  totalScore: number
  actorName: string
  movieTitle: string
  movieYear: number
  ratingData: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
    actorId: string
    movieId: string
    comment?: string
  }
}

export function SignUpToSaveModal({
  isOpen,
  onClose,
  totalScore,
  actorName,
  movieTitle,
  movieYear,
  ratingData
}: SignUpToSaveModalProps) {
  const router = useRouter()

  const persistPendingRating = () => {
    localStorage.setItem(
      "pendingRating",
      JSON.stringify({
        actorId: ratingData.actorId,
        movieId: ratingData.movieId,
        emotionalRangeDepth: ratingData.emotionalDepth,
        characterBelievability: ratingData.believability,
        technicalSkill: ratingData.technicalSkill,
        screenPresence: ratingData.screenPresence,
        chemistryInteraction: ratingData.chemistry,
        comment: ratingData.comment,
        actorName,
        movieTitle,
        movieYear,
        timestamp: new Date().toISOString(),
      })
    )
  }

  // Prevent body scroll when modal is open - more robust for mobile
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      const originalPosition = document.body.style.position
      const originalTop = document.body.style.top
      const originalWidth = document.body.style.width
      const scrollY = window.scrollY
      
      // Lock scroll position
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.documentElement.style.overflow = 'hidden'
      
      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
        document.body.style.position = originalPosition
        document.body.style.top = originalTop
        document.body.style.width = originalWidth
        document.documentElement.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  const handleContinueWithEmail = () => {
    persistPendingRating()
    router.push("/auth/signin")
  }

  const handleSignIn = () => {
    persistPendingRating()
    router.push("/auth/signin")
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Full screen coverage with proper blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99998]"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              minHeight: '100vh',
            }}
            onClick={handleClose}
          />

          {/* Modal Container - Centered with responsive sizing and scrollable */}
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pointer-events-none"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              minHeight: '100vh',
              overflow: 'hidden',
            }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.3
              }}
              className="relative max-w-md w-full rounded-[2rem] p-6 sm:p-7 md:p-8 pointer-events-auto my-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(to bottom right, rgba(26, 26, 26, 0.95), rgba(15, 15, 15, 0.90), rgba(0, 0, 0, 0.95))',
                backdropFilter: 'blur(32px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: `
                  0 25px 70px -15px rgba(0, 0, 0, 0.9),
                  0 15px 40px -10px rgba(0, 0, 0, 0.7),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                `,
                transform: 'translateY(-6px) perspective(1000px) rotateX(1.5deg)',
                transformStyle: 'preserve-3d',
                maxHeight: 'calc(100vh - 2rem)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 z-10"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Score Display - Hero Element */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                className="text-center mb-5 sm:mb-6 mt-12 sm:mt-0"
              >
                <div 
                  className="relative backdrop-blur-xl rounded-3xl px-6 sm:px-8 py-6 sm:py-8 shadow-2xl mx-auto flex items-center justify-center overflow-hidden"
                  style={{
                    width: 'clamp(200px, 85%, 280px)',
                    maxWidth: '280px',
                    minHeight: 'clamp(120px, 18vh, 150px)',
                    background: 'rgba(26, 26, 26, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 45px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                    transform: 'perspective(1000px) rotateX(2deg) translateZ(20px)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="relative text-center z-10 w-full px-2">
                    <div 
                      className="font-black flex items-baseline justify-center gap-1 sm:gap-1.5"
                      style={{
                        fontFamily: 'var(--font-geist-sans), sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <span
                        className="inline-block text-5xl sm:text-6xl md:text-7xl"
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          lineHeight: '1',
                          verticalAlign: 'baseline',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {totalScore}
                      </span>
                      <span 
                        className="text-xl sm:text-2xl md:text-3xl text-[#a1a1aa] leading-none"
                        style={{
                          verticalAlign: 'baseline',
                        }}
                      >
                        /10
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Actor and Movie Info */}
              <div className="text-center mb-5 sm:mb-6">
                <p 
                  className="text-white font-semibold text-xl sm:text-2xl md:text-3xl"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  {actorName}
                </p>
                <p 
                  className="text-base sm:text-lg md:text-xl mt-2 font-medium italic"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {movieTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={handleContinueWithEmail}
                className="w-full py-4 px-6 rounded-2xl text-black font-semibold flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group mb-4 sm:mb-5"
                style={{
                  background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                }}
              >
                <span>Continue with email</span>
              </button>

              {/* Already have account */}
              <div className="text-center pt-4 sm:pt-5 border-t border-white/10">
                <p className="text-sm sm:text-base text-gray-400">
                  Already have an account?{' '}
                  <button
                    onClick={handleSignIn}
                    className="text-[#FFD700] font-semibold hover:underline hover:text-[#FFE55C] transition-colors text-sm sm:text-base"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
