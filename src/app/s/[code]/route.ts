import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const link = await prisma.shortLink.findUnique({ where: { code } })
  if (!link) return new NextResponse('Not found', { status: 404 })

  // Log click
  const referer = req.headers.get('referer') || undefined
  const userAgent = req.headers.get('user-agent') || undefined
  const ip = req.headers.get('x-forwarded-for') || 'local'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex')

  await prisma.$transaction([
    prisma.shortLink.update({ where: { code }, data: { clickCount: { increment: 1 } } }),
    prisma.shareClick.create({ data: { shortLinkId: code, referer, userAgent, ipHash } }),
  ])

  // Preserve UTM params by appending to targetUrl
  const url = new URL(link.targetUrl)
  const currentParams = new URL(req.url).searchParams
  currentParams.forEach((value, key) => {
    if (key.toLowerCase().startsWith('utm_')) url.searchParams.set(key, value)
  })

  return NextResponse.redirect(url.toString(), 302)
}

