"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      document.documentElement.style.overflow = 'hidden'
      
      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
        document.documentElement.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    
    // Store rating data in localStorage for after signup
    localStorage.setItem('pendingRating', JSON.stringify({
      ...ratingData,
      timestamp: new Date().toISOString()
    }))

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        },
      })

      if (error) {
        console.error('Error signing up with Google:', error)
        setIsGoogleLoading(false)
      }
    } catch (error) {
      console.error('Google sign up error:', error)
      setIsGoogleLoading(false)
    }
  }

  const handleSignIn = () => {
    // Store rating data in localStorage
    localStorage.setItem('pendingRating', JSON.stringify({
      ...ratingData,
      timestamp: new Date().toISOString()
    }))

    // Redirect to sign in page
    router.push('/auth/signin')
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99998]"
            onClick={handleClose}
          />

          {/* Modal Container - Centered with responsive sizing and scrollable */}
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pointer-events-none overflow-y-auto"
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
                maxHeight: '90vh',
                overflowY: 'auto',
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
                        className="inline-block text-4xl sm:text-5xl md:text-6xl"
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
                        className="text-lg sm:text-xl md:text-2xl text-[#a1a1aa] leading-none"
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

              {/* Google Sign-Up Button - same style as signup page */}
              <button 
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading}
                className="w-full py-4 px-6 rounded-2xl text-white font-semibold flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mb-4 sm:mb-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!isGoogleLoading) {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/10 via-[#FFA500]/10 to-[#FFD700]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative flex items-center justify-center gap-3">
                  {isGoogleLoading ? (
                    <>
                      <BouncingBallsLoader size="sm" color="#FFFFFF" className="mb-0" />
                      <span>Signing up...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </div>
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
