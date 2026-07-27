export const revalidate = 60

import { prisma } from '@/lib/prisma'
import { ShareButton } from './ShareButton'

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
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'
  const dynamicOg = `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=og&variant=radar`
  const ogUrl = rating.shareImage?.ogUrl || dynamicOg
  const feedUrl = rating.shareImage?.feedUrl || `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=square&variant=radar`
  const storyUrl = rating.shareImage?.storyUrl || `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=story`
  return { rating, ogUrl, feedUrl, storyUrl }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getDataUncached(slug)
  if (!data) {
    return {
      title: "Performance Rating",
      description: "View acting performance ratings on ActorRating.",
    }
  }
  const { rating } = data
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'
  const title = `${rating.actor.name} in ${rating.movie.title}`
  const description = `See the full performance breakdown and community rating. Rate it yourself in seconds.`
  const pageUrl = `${base}/r/${slug}`
  const ogDynamicUrl = `${base}/api/og?ratingId=${encodeURIComponent(slug)}&size=og&variant=radar`
  return {
    title,
    description,
    robots: { index: false, follow: true },
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
  const data = await getDataUncached(slug)
  if (!data) return <div className="p-6">Rating not found</div>
  const { rating } = data
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'}/r/${slug}`

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

