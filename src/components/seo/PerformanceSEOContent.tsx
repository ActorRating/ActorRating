/**
 * SEO-friendly crawlable content for performance rating pages
 *
 * Requirements:
 * - Only hides for logged-in users after mount (avoids SSR/client tree mismatch)
 * - Visually hidden but screen-reader accessible (sr-only)
 * - Present in HTML on first load (SSR)
 * - JSON-LD moved to layout.tsx for guaranteed SSR
 */

"use client"

import React, { useEffect, useState } from 'react'

interface PerformanceSEOContentProps {
  actorName: string
  movieTitle: string
  movieYear?: number
  isLoggedIn: boolean
}

export function PerformanceSEOContent({
  actorName,
  movieTitle,
  movieYear,
  isLoggedIn,
}: PerformanceSEOContentProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Before mount, always match SSR (logged-out SEO block). After mount, drop for signed-in users only.
  if (mounted && isLoggedIn) {
    return null
  }

  const fullMovieTitle = movieYear ? `${movieTitle} (${movieYear})` : movieTitle

  return (
    <>      
      {/* SEO Content - Hidden visually but accessible to crawlers and screen readers */}
      <div className="sr-only">
        <h1>Rate {actorName}'s Acting Performance in {fullMovieTitle}</h1>
        <p>
          This page allows users to rate an acting performance by {actorName} in {fullMovieTitle} using 
          ActorRating's 0-10 performance rating system based on five Oscar-inspired criteria. 
          Our rating methodology evaluates the craft of acting independently from the overall film quality.
        </p>
        <p>
          Rate this acting performance across five professional criteria: Emotional Range & Depth, 
          Character Believability, Technical Skill & Authenticity, Screen Presence & Impact, and 
          Chemistry & Interaction. Each criterion is scored on a 0-100 scale internally, then averaged 
          and converted into a final score out of 10 for clarity and consistency. Your performance rating 
          will contribute to the community's aggregated score, helping identify career-defining roles 
          and overlooked performances.
        </p>
      </div>
    </>
  )
}

