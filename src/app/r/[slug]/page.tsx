import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { ShareButton } from './ShareButton'
import { SuccessShare } from './successShare'

// Cache share page and metadata for 1 min — ratings don't change every second
export const revalidate = 60

async function getDataUncached(slug: string) {
  const rating = await prisma.rating.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      actor: true,
      movie: true,
      shareImage: true,
    },
  })
  if (!rating) return null
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
  const dynamicOg = `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=og`
  const ogUrl = rating.shareImage?.ogUrl || dynamicOg
  const feedUrl = rating.shareImage?.feedUrl || `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=feed`
  const storyUrl = rating.shareImage?.storyUrl || `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=story`
  return { rating, ogUrl, feedUrl, storyUrl }
}

function getData(slug: string) {
  return unstable_cache(
    () => getDataUncached(slug),
    [`r:share:${slug}`],
    { revalidate: 60 }
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)()
  if (!data) return {}
  const { rating } = data
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
  const title = `${rating.actor.name} in ${rating.movie.title} — Rated on ActorRating`
  const description = `See the full performance breakdown and community rating. Rate it yourself in seconds.`
  const pageUrl = `${base}/r/${slug}`
  const ogDynamicUrl = `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=og`
  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      images: [{ url: ogDynamicUrl, alt: `ActorRating: ${rating.actor.name} as ${rating.roleName || ''} — ${Math.round(rating.shareScore ?? rating.weightedScore)}/100` }],
      type: 'website',
      url: pageUrl,
    },
    twitter: { card: 'summary_large_image', images: [ogDynamicUrl] },
  }
}

export default async function RatingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)()
  if (!data) return <div className="p-6">Rating not found</div>
  const { rating, ogUrl, feedUrl, storyUrl } = data
  const xText = `ActorRating: ${rating.actor.name} in ${rating.movie.title} — ${Math.round(rating.shareScore ?? rating.weightedScore)}/100`
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'}/r/${slug}`
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(pageUrl)}`

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">ActorRating Share</h1>
      <div className="space-y-2">
        <div className="text-gray-700">{rating.actor.name} in {rating.movie.title} {rating.roleName ? `(as ${rating.roleName})` : ''}</div>
        <div className="text-xl font-semibold">Score: {Math.round(rating.shareScore ?? rating.weightedScore)}/100</div>
      </div>
      <ShareButton actorName={rating.actor.name} movieTitle={rating.movie.title} roleName={rating.roleName || undefined} pageUrl={pageUrl} />
    </div>
  )
}

