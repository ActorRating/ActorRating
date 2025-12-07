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

    const dims = size === 'feed' ? { w: 1080, h: 1080 } : size === 'story' ? { w: 1080, h: 1920 } : { w: 1200, h: 630 }
    const bg = '#000000'
    const fg = '#FFFFFF'
    const gold = '#FFD700'
    const goldLight = '#FFE55C'

    // Success card style: Actor name at top, movie underneath, score underneath
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dims.w}" height="${dims.h}" viewBox="0 0 ${dims.w} ${dims.h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bg}"/>
  <foreignObject x="80" y="80" width="${dims.w - 160}" height="${dims.h - 160}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;color:${fg};font-family:var(--font-cinzel),Georgia,serif;text-align:center;">
      <div style="font-size:${size==='story'?96:size==='feed'?80:64}px;font-weight:800;line-height:1.2;margin-bottom:${size==='story'?48:32}px;color:${goldLight};">${actorName}</div>
      <div style="font-size:${size==='story'?64:size==='feed'?56:48}px;font-weight:600;line-height:1.2;margin-bottom:${size==='story'?48:32}px;color:${fg};opacity:0.9;">${movieTitle}</div>
      <div style="font-size:${size==='story'?120:size==='feed'?100:80}px;font-weight:900;line-height:1;color:${gold};background:linear-gradient(135deg, ${goldLight} 0%, ${gold} 50%, #FFA500 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${(score/10).toFixed(1)}/10</div>
      <div style="margin-top:${size==='story'?48:32}px;font-size:${size==='story'?32:24}px;opacity:0.6;">actorrating.com</div>
    </div>
  </foreignObject>
</svg>`

    return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } })
  } catch (e: any) {
    return new Response(`OG error: ${e?.message || e}`, { status: 500, headers: { 'content-type': 'text/plain' } })
  }
}

