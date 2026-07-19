import Link from "next/link"

type TmdbAttributionProps = {
  /** Slightly roomier layout for About / credits sections */
  variant?: "footer" | "about"
}

/**
 * Required TMDB API attribution (logo + non-endorsement notice).
 * @see https://www.themoviedb.org/api-terms-of-use
 * @see https://developer.themoviedb.org/docs/faq
 */
export function TmdbAttribution({ variant = "footer" }: TmdbAttributionProps) {
  const isAbout = variant === "about"

  return (
    <div
      className={
        isAbout
          ? "flex flex-col items-center text-center gap-4 max-w-lg mx-auto"
          : "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
      }
    >
      <Link
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="The Movie Database (TMDB)"
      >
        {/* Official short logo — must stay unmodified per TMDB brand guidelines */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/attribution/tmdb-logo.svg"
          alt="The Movie Database (TMDB)"
          width={isAbout ? 140 : 100}
          height={isAbout ? 18 : 13}
          className="h-auto"
          style={{ width: isAbout ? 140 : 100 }}
        />
      </Link>
      <p
        className={
          isAbout
            ? "text-sm text-[#888] leading-relaxed"
            : "text-[11px] sm:text-xs text-[#555] leading-relaxed max-w-md"
        }
      >
        This product uses the TMDB API but is not endorsed or certified by{" "}
        <Link
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#333] hover:text-[#01b4e4] hover:decoration-[#01b4e4]/50 transition-colors"
        >
          TMDB
        </Link>
        .
      </p>
    </div>
  )
}
