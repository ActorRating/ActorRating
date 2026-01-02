/**
 * SEO-friendly crawlable content for performance rating pages
 * 
 * Requirements:
 * - Only renders when user is logged out
 * - Visually hidden but screen-reader accessible (sr-only)
 * - Present in HTML on first load (SSR)
 * - Not cloaking - truthfully describes the page
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

  // JSON-LD structured data for the performance rating page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Rate ${actorName}'s Performance in ${fullMovieTitle}`,
    description: `Rate ${actorName}'s acting performance in ${fullMovieTitle} using ActorRating's comprehensive 0-100 scoring system based on five Oscar-inspired criteria.`,
    mainEntity: {
      "@type": "Review",
      itemReviewed: {
        "@type": "PerformanceRole",
        actor: {
          "@type": "Person",
          name: actorName
        },
        workFeatured: {
          "@type": "Movie",
          name: movieTitle,
          ...(movieYear && { dateCreated: movieYear.toString() })
        }
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: "0-100",
        worstRating: 0,
        bestRating: 100
      }
    },
    isPartOf: {
      "@type": "WebSite",
      name: "ActorRating",
      url: "https://www.actorrating.com"
    }
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* SEO Content - Hidden visually but accessible to crawlers and screen readers */}
      <div className="sr-only">
        <h1>{actorName}'s Acting Performance in {fullMovieTitle}</h1>
        <p>
          This page allows you to rate {actorName}'s specific acting performance in {fullMovieTitle} using 
          ActorRating's comprehensive 0-100 scoring system. Our rating methodology is based on five 
          Oscar-inspired criteria that evaluate the craft of acting independently from the overall film quality.
        </p>
        <p>
          Rate this performance across Emotional Range & Depth, Character Believability, Technical Skill & Authenticity, 
          Screen Presence & Impact, and Chemistry & Interaction. Your rating will contribute to the community's 
          aggregated performance score, helping identify career-defining roles and overlooked work.
        </p>
      </div>
    </>
  )
}

