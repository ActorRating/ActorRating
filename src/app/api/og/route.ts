import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ratingId = searchParams.get('ratingId')
    const size = (searchParams.get('size') || 'og') as 'og' | 'feed' | 'story'
    if (!ratingId) return new Response('ratingId required', { status: 400 })

    const prismaAny = prisma as any
    let rating: any = null
    try {
      rating = await prismaAny.rating.findFirst({
        where: { id: ratingId },
        include: { actor: true, movie: true, user: true },
      })
    } catch {}

    const actorName = rating?.actor?.name || (ratingId === 'demo-123' ? 'Demo Actor' : 'Unknown Actor')
    const movieTitle = rating?.movie?.title || (ratingId === 'demo-123' ? 'Demo Movie' : 'Unknown Movie')
    const roleName = rating?.roleName || (ratingId === 'demo-123' ? 'Lead' : 'Role')
    const score = Math.round((rating?.shareScore ?? rating?.weightedScore ?? (ratingId === 'demo-123' ? 83 : 0)))
    const username = rating?.user?.email || 'Someone'

    const dims = size === 'feed' ? { w: 1080, h: 1080 } : size === 'story' ? { w: 1080, h: 1920 } : { w: 1200, h: 630 }
    const bg = '#0B0F17'
    const fg = '#E5E7EB'
    const accent = '#60A5FA'

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dims.w}" height="${dims.h}" viewBox="0 0 ${dims.w} ${dims.h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bg}"/>
  <foreignObject x="80" y="80" width="${dims.w - 160}" height="${dims.h - 160}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;color:${fg};font-family:-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;">
      <div style="font-size:${size==='story'?72:56}px;font-weight:800;line-height:1.2;text-align:center;white-space:pre-wrap;word-wrap:break-word;">I rated <span style="color:${accent}">${actorName}</span> in <span style="color:${accent}">${movieTitle}</span> as <span style="color:${accent}">${roleName}</span>: <span style="color:${accent}">${score}/100</span></div>
      <div style="margin-top:24px;font-size:${size==='story'?40:28}px;opacity:0.85;">by ${username}</div>
      <div style="margin-top:32px;font-size:${size==='story'?28:22}px;opacity:0.6;">actorrating.com</div>
    </div>
  </foreignObject>
</svg>`

    return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } })
  } catch (e: any) {
    return new Response(`OG error: ${e?.message || e}`, { status: 500, headers: { 'content-type': 'text/plain' } })
  }
}

