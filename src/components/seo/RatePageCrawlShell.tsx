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
 * Always-SSR crawlable summary for rate pages (outside the client auth/loading gate).
 * Provides a single H1 + unique intro for HTML-only bots and AI crawlers.
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
      className="mx-auto w-full max-w-[900px] bg-black px-3 pt-6 sm:px-6"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Rate {actorName} in {movieTitle} ({movieYear})
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Rate {actorName}
        {role ? (
          <>
            {" "}
            as <span className="text-zinc-300">{role}</span>
          </>
        ) : null}{" "}
        in{" "}
        <Link href={movieHref} className="text-zinc-200 underline-offset-2 hover:underline">
          {movieTitle} ({movieYear})
        </Link>
        {director && director.toLowerCase() !== "unknown" ? (
          <>
            {" "}
            directed by {director}
          </>
        ) : null}
        . Scores focus on acting craft — not overall movie quality — using five
        criteria on a 0–10 community scale.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-500">
        <li>Emotional Range &amp; Depth</li>
        <li>Character Believability</li>
        <li>Technical Skill &amp; Authenticity</li>
        <li>Screen Presence &amp; Impact</li>
        <li>Chemistry &amp; Interaction</li>
      </ul>
      <p className="mt-3 text-sm text-zinc-500">
        Actor profile:{" "}
        <Link href={actorHref} className="text-zinc-300 underline-offset-2 hover:underline">
          {actorName}
        </Link>
        .
      </p>
    </section>
  )
}
