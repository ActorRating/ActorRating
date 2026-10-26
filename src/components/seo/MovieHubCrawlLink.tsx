import Link from "next/link"
import { hubBestPerformancesPath } from "@/lib/movie-best-performances/hub-allowlist"

/**
 * Visible SSR internal link to a best-performances hub.
 * Renders nothing unless `slug` is in HUB_ENABLED_SLUGS.
 */
export default function MovieHubCrawlLink({ slug }: { slug: string }) {
  const href = hubBestPerformancesPath(slug)
  if (!href) return null

  return (
    <p className="mx-auto max-w-3xl px-4 py-3 text-center text-sm leading-relaxed text-zinc-300 sm:px-6">
      <Link href={href} className="text-[#FFD700] underline-offset-2 hover:underline">
        See the community ranking of performances in this film
      </Link>
    </p>
  )
}
