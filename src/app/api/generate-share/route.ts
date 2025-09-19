import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import { generateAndUploadAll } from '@/lib/shareGenerator'
import { createUniqueShortCode } from '@/lib/shortlink'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local'
    const rate = await checkRateLimit(ip, 'rating')
    if (!rate.allowed) return new Response('Rate limit', { status: 429 })

    const body = await req.json().catch(() => null)
    const ratingId = body?.ratingId as string | undefined
    if (!ratingId) return new Response('ratingId required', { status: 400 })

    const rating = await prisma.rating.findFirst({
      where: { OR: [{ id: ratingId }, { slug: ratingId }] },
      include: { actor: true, movie: true },
    })
    if (!rating) return new Response('Rating not found', { status: 404 })

    const slug = rating.slug || rating.id

    // Idempotency: if ShareImage exists, return existing along with short link
    const existing = await prisma.shareImage.findUnique({ where: { ratingId: rating.id } })
    let feedUrl: string, storyUrl: string, ogUrl: string
    if (existing) {
      feedUrl = existing.feedUrl
      storyUrl = existing.storyUrl
      ogUrl = existing.ogUrl
    } else {
      const urls = await generateAndUploadAll({
        slug,
        actorName: rating.actor.name,
        roleName: rating.roleName,
        score: Math.round(rating.shareScore ?? rating.weightedScore),
      })
      feedUrl = urls.feedUrl
      storyUrl = urls.storyUrl
      ogUrl = urls.ogUrl
      await prisma.shareImage.create({
        data: { ratingId: rating.id, feedUrl, storyUrl, ogUrl },
      })
    }

    const pageUrlBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''
    const pageUrl = `${pageUrlBase}/r/${slug}`

    let short = await prisma.shortLink.findFirst({ where: { ratingId: rating.id } })
    if (!short) {
      const code = await createUniqueShortCode()
      short = await prisma.shortLink.create({ data: { code, ratingId: rating.id, targetUrl: pageUrl } })
    }
    const shortDomain = (process.env.SHORT_URL_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
    const shortUrl = shortDomain ? `${shortDomain}/s/${short.code}` : `${pageUrlBase}/s/${short.code}`

    await prisma.serverEvent.create({ data: { type: 'share_generated', ratingId: rating.id, payload: { pageUrl, shortCode: short.code } } })

    return Response.json({ feedUrl, storyUrl, ogUrl, pageUrl, shortUrl })
  } catch (e: any) {
    console.error('generate-share error', e)
    return new Response(`error: ${e?.message || 'unknown'}`, { status: 500 })
  }
}

