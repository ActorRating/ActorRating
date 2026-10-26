import type { Metadata } from "next"
import Link from "next/link"
import { HomeLayout } from "@/components/layout"
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld"
import { BAYESIAN_M, BAYESIAN_PRIOR_FALLBACK } from "@/lib/movie-best-performances/ranking"
import { MIN_COMMUNITY_RATINGS_FOR_INDEX } from "@/lib/rate-page-seo"
import { COMMUNITY_STAT_FIELDS } from "@/lib/ratings/community-stats"

export const revalidate = 86400

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com").replace(
  /\/$/,
  "",
)

/** Live rate-UI labels (PerformanceRatingClientWrapper / About). */
const CRITERION_LABELS: Record<(typeof COMMUNITY_STAT_FIELDS)[number], string> = {
  emotionalRangeDepth: "Emotional Impact",
  characterBelievability: "Character Depth",
  technicalSkill: "Technical Skill",
  screenPresence: "Screen Presence",
  chemistryInteraction: "Originality",
}

/** Page export revalidate values used across the public catalog (seconds). */
const REVALIDATE_SECONDS = {
  actorPage: 21600,
  moviePage: 60,
  movieApiFetchOnMoviePage: 21600,
  hubBestPerformances: 3600,
  methodology: 86400,
} as const

export const metadata: Metadata = {
  title: "Methodology — how ActorRating scores work",
  description:
    "How ActorRating community scores are computed: five craft criteria, signed-in averages, Bayesian hub ranking, TMDB attribution, and refresh intervals.",
  alternates: { canonical: `${BASE}/methodology` },
}

export default function MethodologyPage() {
  const lastUpdated = new Date().toISOString().slice(0, 10)
  const crumbs = breadcrumbJsonLd(BASE, [
    { name: "Home", path: "/" },
    { name: "Methodology", path: "/methodology" },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <HomeLayout>
        <main className="min-h-screen bg-black text-white">
          <article className="mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-24">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-3">
              Methodology
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              How ActorRating scores work
            </h1>
            <p className="text-sm text-white/50 mb-10">
              Last updated: {lastUpdated} (page build / deploy date). Rules below match the
              live product code — not marketing estimates.
            </p>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">What is rated</h2>
              <p className="text-white/80 leading-relaxed">
                ActorRating rates <strong className="text-white">acting performances</strong> —
                an actor in a specific movie — not overall film quality. A performance page lives
                at{" "}
                <code className="text-sm text-white/90">/rate/&#123;movie&#125;/&#123;actor&#125;</code>
                .
              </p>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">Five criteria</h2>
              <p className="text-white/80 leading-relaxed">
                Each rating scores these dimensions (labels match the live rating UI). Internally
                each dimension is stored 0–100 under the field names in parentheses:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-white/80">
                {COMMUNITY_STAT_FIELDS.map((field) => (
                  <li key={field}>
                    {CRITERION_LABELS[field]}{" "}
                    <span className="text-white/40 text-sm">({field})</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">Community score</h2>
              <ul className="list-disc pl-5 space-y-2 text-white/80">
                <li>
                  For one rating: mean of the five dimension scores (0–100), then shown on a{" "}
                  <strong className="text-white">0–10</strong> scale (one decimal).
                </li>
                <li>
                  For a performance pair: mean across{" "}
                  <strong className="text-white">signed-in ratings only</strong> (
                  <code className="text-sm">userId</code> not null). Guest ratings are stored but
                  excluded from the public community average.
                </li>
                <li>
                  When there are zero signed-in ratings, there is no community aggregate; the UI
                  invites the first rating instead of inventing a number.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">
                Ranking when few ratings exist
              </h2>
              <p className="text-white/80 leading-relaxed">
                On best-performances hubs, <strong className="text-white">displayed</strong>{" "}
                scores remain the plain community average and signed-in count.{" "}
                <strong className="text-white">Sort order</strong> uses a Bayesian pull toward the
                film prior so a single extreme score does not dominate. Example:{" "}
                <Link
                  href="/movies/the-odyssey-2026/best-performances"
                  className="text-[#FFD700] underline-offset-2 hover:underline"
                >
                  community ranking for The Odyssey (2026)
                </Link>
                .
              </p>
              <p className="font-mono text-sm text-white/70 bg-white/5 rounded-lg px-4 py-3">
                sortScore = (n/(n+m))·avg10 + (m/(n+m))·C
              </p>
              <ul className="list-disc pl-5 space-y-2 text-white/80">
                <li>
                  <code className="text-sm">m = {BAYESIAN_M}</code> (fixed in ranking code)
                </li>
                <li>
                  <code className="text-sm">C</code> = mean of avg10 among roles with at least one
                  signed-in rating on that film; if none,{" "}
                  <code className="text-sm">{BAYESIAN_PRIOR_FALLBACK}</code>
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">Indexable rate pages</h2>
              <p className="text-white/80 leading-relaxed">
                A <code className="text-sm">/rate/...</code> page is treated as indexable only when
                the role is not MINOR, the movie is not a malformed/featurette junk title, and the
                pair has at least{" "}
                <strong className="text-white">
                  {MIN_COMMUNITY_RATINGS_FOR_INDEX} community ratings
                </strong>{" "}
                (signed + guest rows for that gate). Live rating still works when noindex.
              </p>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">TMDB</h2>
              <p className="text-white/80 leading-relaxed">
                Cast, posters, and filmography metadata may come from The Movie Database (TMDB).
                ActorRating community craft scores are separate. See footer TMDB attribution on
                every page.
              </p>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">How often pages refresh</h2>
              <p className="text-white/80 leading-relaxed">
                Next.js <code className="text-sm">revalidate</code> (ISR) values currently in code:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-white/80">
                <li>
                  Actor pages: {REVALIDATE_SECONDS.actorPage}s (
                  {REVALIDATE_SECONDS.actorPage / 3600}h)
                </li>
                <li>
                  Movie page shell: {REVALIDATE_SECONDS.moviePage}s; movie API fetch cache on that
                  page: {REVALIDATE_SECONDS.movieApiFetchOnMoviePage}s
                </li>
                <li>
                  Best-performances hub: {REVALIDATE_SECONDS.hubBestPerformances}s (
                  {REVALIDATE_SECONDS.hubBestPerformances / 3600}h)
                </li>
                <li>This methodology page: {REVALIDATE_SECONDS.methodology}s (24h)</li>
              </ul>
            </section>

            <section className="space-y-4 mb-12">
              <h2 className="text-xl font-semibold text-[#FFD700]">FAQ</h2>
              <dl className="space-y-6 text-white/80">
                <div>
                  <dt className="font-semibold text-white">Do you rate movies?</dt>
                  <dd className="mt-1">
                    No. We rate acting performances (actor + movie pairs).
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">
                    Why is my guest rating missing from the community score?
                  </dt>
                  <dd className="mt-1">
                    Public community averages only include signed-in ratings. Guest ratings still
                    count toward some SEO gates that use total rating rows.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">
                    Why does hub order differ from a raw average?
                  </dt>
                  <dd className="mt-1">
                    Hubs may sort with the Bayesian formula above; the number shown next to a role
                    is still the plain community average when ratings exist.
                  </dd>
                </div>
              </dl>
            </section>

            <p className="text-sm text-white/50">
              Also see{" "}
              <Link href="/about" className="text-[#FFD700] hover:underline">
                About
              </Link>{" "}
              and{" "}
              <Link href="/llms.txt" className="text-[#FFD700] hover:underline">
                llms.txt
              </Link>
              .
            </p>
          </article>
        </main>
      </HomeLayout>
    </>
  )
}
