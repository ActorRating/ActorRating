import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { EditorialArticlePage } from "@/components/editorial/EditorialArticlePage"
import { loadNewsBySlug } from "@/lib/editorial/load-editorial"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = await loadNewsBySlug(slug)
  if (!doc) {
    return { title: "News Not Found", robots: { index: false, follow: true } }
  }
  const url = `${BASE_URL}/news/${doc.slug}`
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: url },
    openGraph: {
      title: doc.title,
      description: doc.description,
      url,
      type: "article",
      publishedTime: doc.publishedAt.toISOString(),
      ...(doc.coverImage ? { images: [{ url: doc.coverImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: doc.title,
      description: doc.description,
      ...(doc.coverImage ? { images: [doc.coverImage] } : {}),
    },
  }
}

export default async function NewsArticlePage({ params }: Props) {
  await connection()
  const { slug } = await params
  const doc = await loadNewsBySlug(slug)
  if (!doc) notFound()
  return <EditorialArticlePage doc={doc} />
}
