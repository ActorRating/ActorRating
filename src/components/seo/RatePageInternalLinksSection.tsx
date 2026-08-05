import Link from "next/link"
import type { RatePageInternalLinks } from "@/lib/rate-page-internal-links"

function LinkGroup({
  title,
  hubHref,
  items,
}: {
  title: string
  hubHref?: string
  items: Array<{ href: string; label: string; subtitle?: string }>
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {hubHref ? (
          <Link href={hubHref} className="text-xs font-medium text-[#FFD700] hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-[#FFD700]/40 hover:bg-white/[0.05]"
            >
              <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
              {item.subtitle ? (
                <span className="mt-0.5 block text-xs text-zinc-500">{item.subtitle}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Crawlable internal-link block for rate pages (server-rendered).
 */
export default function RatePageInternalLinksSection({
  links,
}: {
  links: RatePageInternalLinks
}) {
  const hasBody =
    links.entity.length > 0 ||
    links.sameMovie.length > 0 ||
    links.similarByCraft.some((g) => g.items.length > 0) ||
    links.higherRated.length > 0 ||
    links.lowerRated.length > 0 ||
    links.craftHubs.length > 0

  if (!hasBody) return null

  return (
    <nav
      aria-label="Related performances and catalog links"
      className="mx-auto mt-10 w-full max-w-[900px] space-y-8 px-3 pb-16 sm:px-6"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Explore more
        </p>
        <h2 className="text-xl font-semibold text-white">Related pages &amp; performances</h2>
        <p className="text-sm text-zinc-500">
          Jump to the actor, film, director, genre, and similar craft performances.
        </p>
      </div>

      <LinkGroup title="On this performance" items={links.entity} />
      <LinkGroup title="Other performances in this film" items={links.sameMovie} />

      {links.similarByCraft.map((group) => (
        <LinkGroup
          key={group.dimensionSlug}
          title={`Similar by ${group.dimensionLabel}`}
          hubHref={`/craft/${group.dimensionSlug}`}
          items={group.items}
        />
      ))}

      <LinkGroup title="Higher-rated performances" items={links.higherRated} />
      <LinkGroup title="Lower-rated performances" items={links.lowerRated} />
      <LinkGroup title="Craft leaderboards" items={links.craftHubs} />
    </nav>
  )
}
