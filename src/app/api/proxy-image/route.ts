export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'

const ALLOWED_HOSTS = ['image.tmdb.org', 'images.tmdb.org', 'upload.wikimedia.org', 'm.media-amazon.com']

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new Response('Missing url param', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response('Host not allowed', { status: 403 })
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ActorRating/1.0)' },
      next: { revalidate: 86400 },
    })
    if (!upstream.ok) return new Response('Upstream error', { status: upstream.status })

    const body = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('Content-Type') || 'image/jpeg'

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new Response('Failed to fetch image', { status: 500 })
  }
}
