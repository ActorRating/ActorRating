"use client"

export const dynamic = "force-dynamic"

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Star, Trophy, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/components/providers/SessionProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function RatingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useUser()
  
  const [ratingData, setRatingData] = useState<any>(null)
  const [totalScore, setTotalScore] = useState(0)

  useEffect(() => {
    const actorName = searchParams?.get('actorName')
    const movieTitle = searchParams?.get('movieTitle')
    const movieYear = searchParams?.get('movieYear')
    const comment = searchParams?.get('comment')
    const emotionalRangeDepth = parseInt(searchParams?.get('emotionalRangeDepth') || '0')
    const characterBelievability = parseInt(searchParams?.get('characterBelievability') || '0')
    const technicalSkill = parseInt(searchParams?.get('technicalSkill') || '0')
    const screenPresence = parseInt(searchParams?.get('screenPresence') || '0')
    const chemistryInteraction = parseInt(searchParams?.get('chemistryInteraction') || '0')

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

  const getQualityAssessment = (score: number) => {
    if (score >= 90) return { label: 'Masterpiece', icon: Trophy, description: 'Oscar-worthy performance' }
    if (score >= 80) return { label: 'Excellent', icon: Star, description: 'Outstanding work' }
    if (score >= 70) return { label: 'Very Good', icon: Star, description: 'Strong performance' }
    if (score >= 60) return { label: 'Good', icon: TrendingUp, description: 'Solid work' }
    if (score >= 40) return { label: 'Average', icon: TrendingUp, description: 'Room to grow' }
    return { label: 'Below Average', icon: TrendingUp, description: 'Significant issues' }
  }

  const criteriaLabels: Record<string, string> = {
    emotionalRangeDepth: 'Emotional Depth',
    characterBelievability: 'Believability',
    technicalSkill: 'Technical Skill',
    screenPresence: 'Screen Presence',
    chemistryInteraction: 'Chemistry',
  }

  if (!ratingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BouncingBallsLoader 
          size="md" 
          color="#FFD700"
          showText={true}
          text="Loading..."
        />
      </div>
    )
  }

  const quality = getQualityAssessment(totalScore)
  const QualityIcon = quality.icon

  const criteria = [
    { key: 'emotionalRangeDepth', value: ratingData.emotionalRangeDepth },
    { key: 'characterBelievability', value: ratingData.characterBelievability },
    { key: 'technicalSkill', value: ratingData.technicalSkill },
    { key: 'screenPresence', value: ratingData.screenPresence },
    { key: 'chemistryInteraction', value: ratingData.chemistryInteraction },
  ]

  const SuccessContent = () => (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ambient gold spotlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 45%, transparent 70%)',
        }}
      />

      <div className="relative max-w-lg mx-auto px-5 sm:px-8 py-14 sm:py-20">

        {/* ── Check animation ──────────────────────────────────── */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex justify-center mb-8"
        >
          <div
            className="rounded-full p-4"
            style={{
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.25)',
              boxShadow: '0 0 40px rgba(255,215,0,0.18)',
            }}
          >
            <svg
              className="w-14 h-14 sm:w-16 sm:h-16"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.circle
                cx="32" cy="32" r="30"
                stroke="#FFD700"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.35 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <motion.path
                d="M18 33 L27 43 L46 23"
                stroke="#FFD700"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: 0.25 }}
              />
            </svg>
          </div>
        </motion.div>

        {/* ── Eyebrow label ─────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-center text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
          style={{ color: '#a1a1aa' }}
        >
          Rating Submitted
        </motion.p>

        {/* ── Heading ──────────────────────────────────────────── */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="text-center text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight"
          style={{ fontFamily: 'var(--font-cinzel, var(--font-heading, serif))' }}
        >
          {ratingData.actorName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="text-center text-sm mb-8"
          style={{ color: '#71717a' }}
        >
          <span style={{ color: '#a1a1aa' }}>{ratingData.movieTitle}</span>
          <span style={{ color: '#52525b' }}> · </span>
          {ratingData.movieYear}
          {ratingData.comment && (
            <>
              <span style={{ color: '#52525b' }}> · </span>
              <span className="italic" style={{ color: '#71717a' }}>{ratingData.comment}</span>
            </>
          )}
        </motion.p>

        {/* ── Score card ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 280, damping: 28 }}
          className="mb-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,215,0,0.18)',
            borderRadius: '1.25rem',
          }}
        >
          {/* Score hero */}
          <div className="flex flex-col items-center pt-7 pb-5 px-6">
            <div className="flex items-center gap-2 mb-1">
              <QualityIcon
                className="w-4 h-4"
                style={{ color: '#FFD700' }}
              />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: '#a1a1aa' }}
              >
                {quality.label}
              </span>
            </div>

            <div className="flex items-baseline gap-1 my-2">
              <span
                className="text-6xl sm:text-7xl font-black tabular-nums leading-none"
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {totalScore.toFixed(1)}
              </span>
              <span
                className="text-lg font-semibold self-end mb-2"
                style={{ color: '#FFD700', opacity: 0.5 }}
              >
                /100
              </span>
            </div>

            <p className="text-xs" style={{ color: '#52525b' }}>
              {quality.description}
            </p>
          </div>

          {/* Criteria breakdown */}
          <div
            className="px-5 pb-5 space-y-2.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p
              className="text-[10px] font-bold tracking-widest uppercase pt-4 mb-3"
              style={{ color: '#52525b' }}
            >
              Breakdown
            </p>
            {criteria.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs w-32 shrink-0" style={{ color: '#71717a' }}>
                  {criteriaLabels[key]}
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.75 }}
                    style={{
                      background: 'linear-gradient(90deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold tabular-nums w-6 text-right"
                  style={{ color: '#a1a1aa' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Action buttons ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 rounded-full text-black text-sm font-bold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
            }}
          >
            Back to Home
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/search')}
              className="py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:bg-white/8 active:scale-[0.98] flex items-center justify-center gap-1.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#a1a1aa',
              }}
            >
              Rate Again
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:bg-white/8 active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#a1a1aa',
              }}
            >
              My Ratings
            </button>
          </div>
        </motion.div>

        {/* ── Welcome note (only for new visitors) ─────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05 }}
          className="mt-8 rounded-2xl px-5 py-4 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(255,165,0,0.03) 100%)',
            border: '1px solid rgba(255,215,0,0.10)',
          }}
        >
          <Star
            className="w-5 h-5 mx-auto mb-2"
            style={{ color: '#FFD700', opacity: 0.7 }}
          />
          <p className="text-xs leading-relaxed" style={{ color: '#71717a' }}>
            Welcome to <span style={{ color: '#a1a1aa' }}>ActorRating</span> — explore more performances
            and help build the most comprehensive acting database.
          </p>
        </motion.div>

      </div>
    </div>
  )

  return user ? (
    <SignedInLayout>
      <SuccessContent />
    </SignedInLayout>
  ) : (
    <HomeLayout>
      <SuccessContent />
    </HomeLayout>
  )
}
