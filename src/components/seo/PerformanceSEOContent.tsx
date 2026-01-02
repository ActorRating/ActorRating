/**
 * SEO-friendly crawlable content for performance rating pages
 * 
 * Requirements:
 * - Only renders when user is logged out
 * - Visually hidden but screen-reader accessible (sr-only)
 * - Present in HTML on first load (SSR)
 * - Not cloaking - truthfully describes the page
 * - JSON-LD moved to layout.tsx for guaranteed SSR
 */

import React from 'react'

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
  // Don't render if user is logged in
  if (isLoggedIn) {
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
          ActorRating's 0-100 performance rating system based on five Oscar-inspired criteria. 
          Our rating methodology evaluates the craft of acting independently from the overall film quality.
        </p>
        <p>
          Rate this acting performance across five professional criteria: Emotional Range & Depth, 
          Character Believability, Technical Skill & Authenticity, Screen Presence & Impact, and 
          Chemistry & Interaction. Your performance rating will contribute to the community's 
          aggregated score, helping identify career-defining roles and overlooked performances.
        </p>
      </div>
    </>
  )
}

