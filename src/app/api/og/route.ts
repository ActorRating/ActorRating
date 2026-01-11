import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ratingId = searchParams.get('ratingId')
    const size = (searchParams.get('size') || 'og') as 'og' | 'feed' | 'story'
    
    // Support direct parameters for success card sharing
    const actorNameParam = searchParams.get('actorName')
    const movieTitleParam = searchParams.get('movieTitle')
    const scoreParam = searchParams.get('score')
    
    let actorName: string
    let movieTitle: string
    let score: number
    let roleName: string
    let username: string

    if (actorNameParam && movieTitleParam && scoreParam) {
      // Direct parameters provided (from success card)
      actorName = actorNameParam
      movieTitle = movieTitleParam
      score = Math.round(parseFloat(scoreParam) * 10) // Convert from /10 to /100
      roleName = 'Performance'
      username = 'You'
    } else if (ratingId) {
      // Lookup from database
    const prismaAny = prisma as any
    let rating: any = null
    try {
      rating = await prismaAny.rating.findFirst({
        where: { id: ratingId },
        include: { actor: true, movie: true, user: true },
      })
    } catch {}

      actorName = rating?.actor?.name || (ratingId === 'demo-123' ? 'Demo Actor' : 'Unknown Actor')
      movieTitle = rating?.movie?.title || (ratingId === 'demo-123' ? 'Demo Movie' : 'Unknown Movie')
      roleName = rating?.roleName || (ratingId === 'demo-123' ? 'Lead' : 'Role')
      score = Math.round((rating?.shareScore ?? rating?.weightedScore ?? (ratingId === 'demo-123' ? 83 : 0)))
      username = rating?.user?.email || 'Someone'
    } else {
      return new Response('ratingId or (actorName, movieTitle, score) required', { status: 400 })
    }

    // For Instagram feed, use 4:5 aspect ratio (1080x1350)
    const dims = size === 'feed' ? { w: 1080, h: 1350 } : size === 'story' ? { w: 1080, h: 1920 } : { w: 1200, h: 630 }
    const bg = '#000000'
    const fg = '#FFFFFF'
    const gold = '#FFD700'
    const goldLight = '#FFE55C'
    const scoreOutOf10 = (score / 10).toFixed(1)

    // Escape XML entities in text content
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }
    
    // Truncate movie title if too long (max 36 characters)
    const truncateTitle = (title: string, maxLength: number = 36) => {
      if (title.length <= maxLength) return title
      return title.substring(0, maxLength - 3) + '...'
    }
    
    const escapedActorName = escapeXml(actorName)
    const escapedMovieTitle = escapeXml(truncateTitle(movieTitle))
    
    // For Instagram feed (4:5), use the new cinematic format
    if (size === 'feed') {
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dims.w}" height="${dims.h}" viewBox="0 0 ${dims.w} ${dims.h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&amp;display=swap');
    </style>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${goldLight};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${gold};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#000000;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="dividerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:transparent;stop-opacity:1" />
      <stop offset="15%" style="stop-color:rgba(255,229,92,0.4);stop-opacity:1" />
      <stop offset="40%" style="stop-color:rgba(255,215,0,0.9);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgba(255,215,0,1);stop-opacity:1" />
      <stop offset="60%" style="stop-color:rgba(255,215,0,0.9);stop-opacity:1" />
      <stop offset="85%" style="stop-color:rgba(255,229,92,0.4);stop-opacity:1" />
      <stop offset="100%" style="stop-color:transparent;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="bottomRightSpotlight" cx="100%" cy="100%" r="50%">
      <stop offset="0%" style="stop-color:${gold};stop-opacity:0.12" />
      <stop offset="100%" style="stop-color:${gold};stop-opacity:0" />
    </radialGradient>
  </defs>
  <!-- Background - pure black -->
  <rect width="100%" height="100%" fill="#000000"/>
  <!-- Radial spotlight from bottom right -->
  <rect width="100%" height="100%" fill="url(#bottomRightSpotlight)"/>
  <!-- Actor Name (Primary) - Moved lower, white color -->
  <text x="${dims.w/2}" y="320" font-family="Cinzel, Georgia, serif" font-size="76" font-weight="900" fill="${fg}" text-anchor="middle" letter-spacing="1">${escapedActorName}</text>
  <!-- Movie Name (Secondary) - Below Actor, with "in" prefix -->
  <text x="${dims.w/2}" y="380" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="36" font-weight="500" fill="${fg}" opacity="0.85" text-anchor="middle">in ${escapedMovieTitle}</text>
  <!-- Decorative divider - dashboard style, longer -->
  <rect x="${dims.w/2 - 140}" y="419" width="280" height="2" fill="url(#dividerGradient)"/>
  <!-- Score (Primary) - Large and prominent, no glow, moved lower -->
  <text x="${dims.w/2}" y="620" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="120" font-weight="900" fill="url(#goldGradient)" text-anchor="middle">${scoreOutOf10} / 10</text>
  <!-- "What's your rating?" text - Below score, white -->
  <text x="${dims.w/2}" y="690" font-family="Cinzel, Georgia, serif" font-size="42" font-weight="600" fill="${fg}" text-anchor="middle" opacity="0.9">What&apos;s your rating?</text>
  <!-- Decorative divider - dashboard style, longer -->
  <rect x="${dims.w/2 - 140}" y="739" width="280" height="2" fill="url(#dividerGradient)"/>
  <!-- "Rated on ActorRating" - Bottom -->
  <text x="${dims.w/2}" y="1250" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="26" font-weight="500" fill="${fg}" opacity="0.7" text-anchor="middle">Rated on ActorRating</text>
  <!-- Logo placeholder (small, bottom) -->
  <text x="${dims.w/2}" y="1320" font-family="Cinzel, Georgia, serif" font-size="22" fill="${gold}" opacity="0.5" text-anchor="middle">actorrating.com</text>
</svg>`
      return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } })
    }
    
    // For other sizes (story, og), use the original format
    const centerY = dims.h / 2
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dims.w}" height="${dims.h}" viewBox="0 0 ${dims.w} ${dims.h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&amp;display=swap');
    </style>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${goldLight};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${gold};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="${dims.w/2}" y="${centerY - 180}" font-family="Cinzel, Georgia, serif" font-size="${size==='story'?56:40}" font-weight="600" fill="${fg}" opacity="0.9" text-anchor="middle">I rated</text>
  <text x="${dims.w/2}" y="${centerY - 100}" font-family="Cinzel, Georgia, serif" font-size="${size==='story'?96:64}" font-weight="800" fill="${goldLight}" text-anchor="middle">${escapedActorName}</text>
  <text x="${dims.w/2}" y="${centerY - 20}" font-family="Cinzel, Georgia, serif" font-size="${size==='story'?64:48}" font-weight="600" fill="${fg}" opacity="0.9" text-anchor="middle">a <tspan fill="${goldLight}">${scoreOutOf10}/10</tspan> in</text>
  <text x="${dims.w/2}" y="${centerY + 60}" font-family="Cinzel, Georgia, serif" font-size="${size==='story'?80:56}" font-weight="700" fill="${goldLight}" text-anchor="middle">${escapedMovieTitle}</text>
  <text x="${dims.w/2}" y="${centerY + 160}" font-family="Cinzel, Georgia, serif" font-size="${size==='story'?120:80}" font-weight="900" fill="url(#goldGradient)" text-anchor="middle">${scoreOutOf10}/10</text>
  <text x="${dims.w/2}" y="${centerY + 220}" font-family="Cinzel, Georgia, serif" font-size="${size==='story'?28:24}" fill="${fg}" opacity="0.6" text-anchor="middle">actorrating.com</text>
</svg>`

    return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } })
  } catch (e: any) {
    return new Response(`OG error: ${e?.message || e}`, { status: 500, headers: { 'content-type': 'text/plain' } })
  }
}

