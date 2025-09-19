"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Star, Sparkles, Trophy, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'

export default function RatingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  
  const [ratingData, setRatingData] = useState<any>(null)
  const [totalScore, setTotalScore] = useState(0)

  useEffect(() => {
    // Get rating data from URL parameters
    const actorName = searchParams.get('actorName')
    const movieTitle = searchParams.get('movieTitle')
    const movieYear = searchParams.get('movieYear')
    const comment = searchParams.get('comment')
    const emotionalRangeDepth = parseInt(searchParams.get('emotionalRangeDepth') || '0')
    const characterBelievability = parseInt(searchParams.get('characterBelievability') || '0')
    const technicalSkill = parseInt(searchParams.get('technicalSkill') || '0')
    const screenPresence = parseInt(searchParams.get('screenPresence') || '0')
    const chemistryInteraction = parseInt(searchParams.get('chemistryInteraction') || '0')

    if (actorName && movieTitle && movieYear) {
      const data = {
        actorName,
        movieTitle,
        movieYear,
        comment,
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction
      }
      setRatingData(data)
      
      // Calculate total score using the same weighted formula
      const score = (
        emotionalRangeDepth * 0.25 +
        characterBelievability * 0.25 +
        technicalSkill * 0.20 +
        screenPresence * 0.15 +
        chemistryInteraction * 0.15
      )
      setTotalScore(score)
    }
  }, [searchParams])

  // Quality assessment function (same as performance page)
  const getQualityAssessment = (score: number) => {
    if (score >= 90) return { 
      label: 'Masterpiece', 
      color: 'text-amber-400', 
      bg: 'from-amber-400/20 to-yellow-400/20',
      icon: Trophy,
      description: 'Oscar-worthy performance!'
    }
    if (score >= 80) return { 
      label: 'Excellent', 
      color: 'text-emerald-400', 
      bg: 'from-emerald-400/20 to-green-400/20',
      icon: Star,
      description: 'Outstanding work!'
    }
    if (score >= 70) return { 
      label: 'Good', 
      color: 'text-blue-400', 
      bg: 'from-blue-400/20 to-cyan-400/20',
      icon: CheckCircle,
      description: 'Solid performance'
    }
    if (score >= 60) return { 
      label: 'Decent', 
      color: 'text-yellow-400', 
      bg: 'from-yellow-400/20 to-orange-400/20',
      icon: TrendingUp,
      description: 'Above average'
    }
    if (score >= 40) return { 
      label: 'Average', 
      color: 'text-orange-400', 
      bg: 'from-orange-400/20 to-red-400/20',
      icon: TrendingUp,
      description: 'Room for improvement'
    }
    return { 
      label: 'Needs Work', 
      color: 'text-red-400', 
      bg: 'from-red-400/20 to-pink-400/20',
      icon: TrendingUp,
      description: 'Significant issues'
    }
  }

  if (!ratingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const quality = getQualityAssessment(totalScore)

  const SuccessContent = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
      </div>
      
      <div className="relative max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20">
        
        {/* Celebration Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div 
            className="flex justify-center mb-6"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
          </motion.div>
          
          <motion.h1 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Rating Submitted Successfully!
          </motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl text-gray-300 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Thank you for rating <span className="font-semibold text-white">{ratingData.actorName}</span>'s performance in 
            <span className="font-semibold text-white"> "{ratingData.movieTitle}"</span> ({ratingData.movieYear})
            {ratingData.comment && (
              <span> as <span className="font-semibold text-white">{ratingData.comment}</span></span>
            )}
          </motion.p>
        </motion.div>

        {/* Score Display */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 30 }}
          className="flex justify-center mb-8"
        >
          <div className={`relative max-w-md mx-auto bg-gradient-to-br ${quality.bg} rounded-3xl p-8 border-2 border-transparent bg-clip-padding backdrop-blur-sm overflow-hidden`}>
            {/* Animated background effects */}
            <div className="absolute inset-0 opacity-30">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20"
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            <div className="relative text-center">
              <motion.div
                className="flex items-center justify-center gap-2 mb-3"
                animate={{
                  rotate: totalScore >= 90 ? [0, 5, -5, 0] : 0
                }}
                transition={{
                  duration: 2,
                  repeat: totalScore >= 90 ? Infinity : 0
                }}
              >
                <quality.icon className={`w-6 h-6 ${quality.color}`} />
                <h3 className={`text-xl sm:text-2xl font-bold ${quality.color}`}>
                  {quality.label}
                </h3>
                <quality.icon className={`w-6 h-6 ${quality.color}`} />
              </motion.div>

              <motion.div 
                className="flex items-center justify-center gap-3 mb-2"
                animate={{
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className={`text-5xl sm:text-6xl lg:text-7xl font-black ${quality.color}`}>
                  {totalScore.toFixed(1)}
                </div>
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${quality.color} fill-current`} />
                </motion.div>
              </motion.div>

              <p className={`text-sm sm:text-base font-medium ${quality.color} mb-1`}>
                {quality.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Average out of 100
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button asChild variant="premium" size="lg">
            <Link href="/">
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/search">
              Rate Another Performance
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">
              View Your Ratings
            </Link>
          </Button>
        </motion.div>

        {/* Welcome Message for New Users */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex justify-center mb-4"
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">Welcome to ActorRating!</h3>
            <p className="text-gray-300">
              You've just submitted your first rating. Explore more performances, discover great actors, 
              and help build the most comprehensive actor rating database.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )

  return session ? (
    <SignedInLayout>
      <SuccessContent />
    </SignedInLayout>
  ) : (
    <HomeLayout>
      <SuccessContent />
    </HomeLayout>
  )
}
