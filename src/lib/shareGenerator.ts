import { uploadToStorage, buildShareKey } from '@/lib/storage'

export interface ShareInput {
  slug: string
  actorName: string
  roleName?: string | null
  score: number
}

async function fetchOgPng(slug: string, size: 'feed' | 'story' | 'og'): Promise<Buffer> {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const res = await fetch(`${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=${size}`, {
    headers: { Accept: 'image/png' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`OG fetch failed: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generateAndUploadAll(input: ShareInput): Promise<{ feedUrl: string; storyUrl: string; ogUrl: string }>{
  const [feedBuf, storyBuf, ogBuf] = await Promise.all([
    fetchOgPng(input.slug, 'feed'),
    fetchOgPng(input.slug, 'story'),
    fetchOgPng(input.slug, 'og'),
  ])

  const [feedUrl, storyUrl, ogUrl] = await Promise.all([
    uploadToStorage({ key: buildShareKey('feed', input.slug), contentType: 'image/png', body: feedBuf, cacheControl: 'public, max-age=31536000, immutable' }),
    uploadToStorage({ key: buildShareKey('story', input.slug), contentType: 'image/png', body: storyBuf, cacheControl: 'public, max-age=31536000, immutable' }),
    uploadToStorage({ key: buildShareKey('og', input.slug), contentType: 'image/png', body: ogBuf, cacheControl: 'public, max-age=31536000, immutable' }),
  ])

  return { feedUrl, storyUrl, ogUrl }
}

