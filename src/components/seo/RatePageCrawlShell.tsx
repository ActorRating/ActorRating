import Link from "next/link"

type Props = {
  actorName: string
  actorHref: string
  movieTitle: string
  movieHref: string
  movieYear: number
  character?: string | null
  director?: string | null
}

/**
 * SSR crawlable summary — placed below the rating UI so the hero layout stays intact.
 */
export default function RatePageCrawlShell({
  actorName,
  actorHref,
  movieTitle,
  movieHref,
  movieYear,
  character,
  director,
}: Props) {
  const role =
    character?.trim() && character.trim().toLowerCase() !== "unknown"
      ? character.trim()
      : null

  return (
    <section
      aria-label="Performance overview"
      className="mx-auto mt-10 w-full max-w-[900px] space-y-3 px-3 sm:px-6"
    >
      <div className="space-y-1 border-t border-white/[0.06] pt-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Performance
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
          Rate {actorName} in {movieTitle} ({movieYear})
        </h1>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
        Rate{" "}
        <Link href={actorHref} className="text-zinc-300 transition hover:text-[#FFD700]">
          {actorName}
        </Link>
        {role ? (
          <>
            {" "}
            as <span className="text-zinc-400">{role}</span>
          </>
        ) : null}{" "}
        in{" "}
        <Link href={movieHref} className="text-zinc-300 transition hover:text-[#FFD700]">
          {movieTitle} ({movieYear})
        </Link>
        {director && director.toLowerCase() !== "unknown" ? <> · {director}</> : null}. Community
        scores use Emotional Range &amp; Depth, Character Believability, Technical Skill, Screen
        Presence, and Chemistry — acting craft, not overall film quality.
      </p>
    </section>
  )
}
