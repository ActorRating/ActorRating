// src/components/HomePageClient.tsx
"use client";

/**
 * Letterboxd-shaped landing: short manifesto + one CTA over a film still,
 * with a dense poster strip bleeding into the first viewport. No marketing essays.
 */

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  prefetchPerformancesPageData,
  buildByLookupUrl,
  POPULAR_RIGHT_NOW_TARGETS,
  LEGENDARY_PERFORMANCE_TARGETS,
  RECENT_FAVORITES_TARGETS,
  allLandingRailLookupTargets,
  type PerformanceTarget,
} from "@/lib/performances-page-targets";
import type { EnrichedPerformance } from "@/lib/performances-by-lookup";
import { upgradeActorImageRes } from "@/lib/tmdb";
import { getMovieUrl, getRateUrl } from "@/lib/slugHelper";
import { createActorSlug, createMovieSlug } from "@/lib/createSlug";
import {
  type FeaturedHeroPayload,
  buildFixedLandingHero,
  fixedLandingHeroLookupTarget,
} from "@/lib/home-featured-performance";

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)";
const PLAYFAIR: React.CSSProperties = {
  fontFamily: 'var(--font-playfair-display), "Playfair Display", Georgia, serif',
};
const HERO_SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
};

function upgradePosterBackdropRes(url?: string | null): string | null {
  if (!url) return null;
  // Hero stills: prefer TMDB w1920 (backdrop assets are often 3840-wide)
  return url
    .replace(/\/t\/p\/w\d+\//, "/t/p/w1920/")
    .replace(/\/t\/p\/original\//, "/t/p/w1920/");
}

function upgradePosterThumbRes(url?: string | null): string | null {
  if (!url) return null;
  return url
    .replace("/t/p/w92/", "/t/p/w342/")
    .replace("/t/p/w185/", "/t/p/w342/");
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

// ─── Static fallbacks when DB/posters unavailable (local / cold start) ────────

type StaticRailItem = PerformanceTarget;

const FALLBACK_POPULAR: StaticRailItem[] = POPULAR_RIGHT_NOW_TARGETS;
const FALLBACK_LEGENDARY: StaticRailItem[] = LEGENDARY_PERFORMANCE_TARGETS;
const FALLBACK_RECENT: StaticRailItem[] = RECENT_FAVORITES_TARGETS;

function tmdbPoster(path?: string): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w342${path}`;
}

function performanceKey(p: EnrichedPerformance): string | null {
  if (!p.actor?.name || !p.movie?.title) return null;
  return `${p.actor.name}:${p.movie.title}`;
}

function characterFallback(
  actor: string,
  movie: string,
  targets: PerformanceTarget[],
): string | null {
  return targets.find((t) => t.actor === actor && t.movie === movie)?.character ?? null;
}

function movieHrefFromStatic(item: StaticRailItem): string {
  return getMovieUrl({
    id: createMovieSlug(item.movie, item.year),
    title: item.movie,
    year: item.year ?? 0,
    slug: createMovieSlug(item.movie, item.year),
  });
}

const POSTER_TILE =
  "group flex-shrink-0 w-[86px] sm:w-[96px] md:w-[104px] lg:w-[110px] block";

/** Clean Letterboxd-style poster — art first; actor / character / movie on hover */
function CleanPosterLink({
  href,
  poster,
  face,
  actorName,
  characterName,
  movieTitle,
  priority,
  onPrefetch,
}: {
  href: string;
  poster: string | null;
  face?: string | null;
  actorName: string;
  characterName?: string | null;
  movieTitle: string;
  priority?: boolean;
  onPrefetch?: () => void;
}) {
  const a11yLabel = characterName
    ? `${actorName} as ${characterName} — ${movieTitle}`
    : `${actorName} — ${movieTitle}`;

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={onPrefetch}
      className={POSTER_TILE}
      title={a11yLabel}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#141414] ring-1 ring-white/[0.08]">
        {poster ? (
          <Image
            src={poster}
            alt={a11yLabel}
            fill
            className="object-cover"
            sizes="140px"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : face ? (
          <Image
            src={face}
            alt={a11yLabel}
            fill
            className="object-cover"
            sizes="140px"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex items-end p-2">
            <span className="text-[10px] text-zinc-500 line-clamp-3">{a11yLabel}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-1">
            {actorName}
          </p>
          {characterName ? (
            <p className="text-[10px] text-zinc-300 leading-tight line-clamp-1 mt-0.5">
              as {characterName}
            </p>
          ) : null}
          <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1 mt-0.5">
            {movieTitle}
          </p>
        </div>
      </div>
    </Link>
  );
}

function PosterRailRow({
  flush,
  children,
}: {
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={flush ? "px-4 sm:px-6 lg:px-8" : "px-5 sm:px-8 lg:px-10"}>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

function StaticPosterRail({
  title,
  subtitle,
  items,
  flush,
}: {
  title?: string;
  subtitle?: string;
  items: StaticRailItem[];
  flush?: boolean;
}) {
  return (
    <div className={flush ? "pb-1" : "mb-10 sm:mb-14"}>
      {!flush && title ? (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-4 sm:mb-5 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-white" style={PLAYFAIR}>
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <PosterRailRow flush={flush}>
        {items.map((item, i) => {
          const poster = tmdbPoster(item.posterPath);
          const href = movieHrefFromStatic(item);
          return (
            <CleanPosterLink
              key={`${item.actor}:${item.movie}`}
              href={href}
              poster={poster}
              actorName={item.actor}
              characterName={item.character}
              movieTitle={item.movie}
              priority={i < 4}
            />
          );
        })}
      </PosterRailRow>
    </div>
  );
}

function PosterRail({
  title,
  subtitle,
  performances,
  characterTargets,
  flush,
}: {
  title?: string;
  subtitle?: string;
  performances: EnrichedPerformance[];
  characterTargets: PerformanceTarget[];
  flush?: boolean;
}) {
  const router = useRouter();

  if (!performances.length) return null;

  return (
    <div className={flush ? "pb-1" : "mb-10 sm:mb-14"}>
      {!flush && title ? (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-4 sm:mb-5 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-white" style={PLAYFAIR}>
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">{subtitle}</p>
          ) : null}
        </div>
      ) : null}

      <PosterRailRow flush={flush}>
        {performances.map((perf, i) => {
          const actor = perf.actor!;
          const movie = perf.movie!;
          const href = getMovieUrl({
            id: perf.movieId,
            title: movie.title,
            year: movie.year,
            slug: movie.slug,
          });
          const poster =
            upgradePosterThumbRes(movie.posterUrl) ?? movie.posterUrl ?? null;
          const face = upgradeActorImageRes(actor.imageUrl);
          const character =
            perf.character?.trim() ||
            characterFallback(actor.name, movie.title, characterTargets);

          return (
            <div
              key={performanceKey(perf) ?? `${perf.actorId}-${perf.movieId}`}
              className="flex-shrink-0"
            >
              <CleanPosterLink
                href={href}
                poster={poster}
                face={face}
                actorName={actor.name}
                characterName={character}
                movieTitle={movie.title}
                priority={i < 4}
                onPrefetch={() => router.prefetch(href)}
              />
            </div>
          );
        })}
      </PosterRailRow>
    </div>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
// Desktop: full-bleed still, manifesto last line on fold bottom, CTA band below.
// Mobile: image fitted at top, centered sans manifesto, CTA directly under it.

const HERO_BACKDROP_FALLBACK =
  "https://image.tmdb.org/t/p/w1920/twiVn9oFXOVR0uoYgawyEBlnFu8.jpg";

function HeroBackdrop({ src, mobile }: { src: string; mobile?: boolean }) {
  return (
    <>
      <Image
        src={src}
        alt=""
        fill
        priority
        quality={90}
        // Crop toward the warrior so the empty dark left of the still isn’t a black panel
        className={
          mobile
            ? "object-cover object-[68%_center]"
            : "object-cover object-[72%_center]"
        }
        sizes={mobile ? "100vw" : "100vw"}
      />
      {/* Bottom readability wash only — no side black bar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: mobile
            ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 40%, transparent 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 35%, transparent 62%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </>
  );
}

function HeroCtaBlock({ featured }: { featured: FeaturedHeroPayload }) {
  const router = useRouter();
  return (
    <>
      <Link
        href={featured.rateHref}
        prefetch={false}
        onMouseEnter={() => {
          if (featured.rateHref.startsWith("/rate/")) {
            router.prefetch(featured.rateHref);
          }
        }}
        className="inline-flex"
      >
        <span
          className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 sm:py-3.5 rounded-md text-black text-sm sm:text-base font-bold tracking-wide transition-transform hover:scale-[1.02] min-h-[44px]"
          style={{ background: GOLD }}
        >
          Start rating — it&apos;s free!
        </span>
      </Link>
      <p className="mt-3.5 text-xs sm:text-sm text-zinc-500 font-light">
        The network for rating acting — not movies.
      </p>
    </>
  );
}

function HeroSection({ featured }: { featured: FeaturedHeroPayload }) {
  const reduceMotion = usePrefersReducedMotion();
  const posterSrc =
    upgradePosterBackdropRes(featured.moviePosterUrl) ??
    featured.moviePosterUrl ??
    HERO_BACKDROP_FALLBACK;

  return (
    <>
      {/* ── Mobile: image on top, then branding + manifesto + CTA ── */}
      <section className="md:hidden bg-black">
        <div className="relative w-full aspect-[16/10] max-h-[52svh] overflow-hidden">
          {posterSrc ? <HeroBackdrop src={posterSrc} mobile /> : null}
        </div>
        <div className="px-5 pt-6 pb-8 text-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 flex items-center justify-center gap-0.5"
            aria-label="ActorRating"
          >
            <div className="relative w-14 h-14 shrink-0">
              <Image
                src="/logo_navbar.png"
                alt=""
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <span
              className="text-3xl font-extrabold text-white tracking-tight"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)" }}
            >
              ActorRating
            </span>
          </motion.div>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.05 }}
            className="text-[1.35rem] font-medium text-white leading-snug tracking-tight"
            style={HERO_SANS}
          >
            Rate performances you&apos;ve seen.
            <br />
            Save the ones that floored you.
            <br />
            Tell the internet who deserved it.
          </motion.h1>
          <div className="mt-6 flex flex-col items-center">
            <HeroCtaBlock featured={featured} />
          </div>
        </div>
      </section>

      {/* ── Desktop: full-bleed still, manifesto on fold bottom ── */}
      <section className="relative hidden md:flex h-[100svh] w-full overflow-clip bg-black flex-col">
        {posterSrc ? (
          <div className="absolute inset-0" aria-hidden>
            <HeroBackdrop src={posterSrc} />
          </div>
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}

        <div className="relative z-10 flex-1" aria-hidden />

        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 max-w-2xl mx-auto px-8 pb-7 text-center text-[2.35rem] lg:text-[2.65rem] font-bold text-white leading-[1.28] tracking-tight"
          style={{ ...PLAYFAIR, textShadow: "0 6px 28px rgba(0,0,0,0.85)" }}
        >
          Rate performances you&apos;ve seen.
          <br />
          Save the ones that floored you.
          <br />
          Tell the internet who deserved it.
        </motion.h1>
      </section>

      {/* Desktop CTA band — sits under the hero fold */}
      <section className="relative hidden md:block bg-black border-t border-white/[0.04] px-8 pt-7 pb-10 text-center">
        <HeroCtaBlock featured={featured} />
      </section>
    </>
  );
}

// ─── "LETS YOU" — Letterboxd-style short capability list ─────────────────────

const LETS_YOU = [
  "Score any performance with one slider — or five Oscar-inspired dimensions",
  "Separate great acting from mediocre movies (always)",
  "Compare your take with the community average",
  "Explore curated lists of iconic and underrated turns",
];

function LetsYouSection() {
  return (
    <section className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <h2
        className="text-xl sm:text-2xl font-bold text-white mb-6 text-center"
        style={PLAYFAIR}
      >
        ActorRating lets you…
      </h2>
      <ul className="mx-auto w-full max-w-xl space-y-3.5">
        {LETS_YOU.map((line) => (
          <li
            key={line}
            className="grid grid-cols-[1rem_1fr] gap-x-3 text-sm sm:text-base text-zinc-400 leading-snug text-left"
          >
            <span className="text-[#FFD700] text-center" aria-hidden>
              ●
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClosingStrip({ primaryRateHref }: { primaryRateHref: string }) {
  const router = useRouter();
  return (
    <section className="border-t border-white/[0.06] py-14 sm:py-16 text-center px-5">
      <p
        className="text-lg sm:text-xl text-white font-medium mb-6 max-w-md mx-auto leading-snug"
        style={PLAYFAIR}
      >
        Rate acting. Share your take. Build the performance canon.
      </p>
      <Link
        href={primaryRateHref}
        prefetch={false}
        onMouseEnter={() => {
          if (primaryRateHref.startsWith("/rate/")) router.prefetch(primaryRateHref);
          else prefetchPerformancesPageData();
        }}
      >
        <span
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md text-black font-bold tracking-wide transition-transform hover:scale-[1.02]"
          style={{ background: GOLD }}
        >
          Start rating — it&apos;s free!
          <FaArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
      <div className="mt-5">
        <Link
          href="/lists"
          className="text-sm text-zinc-600 hover:text-[#FFD700] transition-colors"
        >
          Or browse curated lists →
        </Link>
      </div>
    </section>
  );
}

function FeaturedPerformanceSection({
  performance,
}: {
  performance: EnrichedPerformance | null;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const poster =
    upgradePosterThumbRes(performance?.movie?.posterUrl)?.replace(
      "/t/p/w342/",
      "/t/p/w780/",
    ) ??
    performance?.movie?.posterUrl?.replace(/\/t\/p\/w\d+\//, "/t/p/w780/") ??
    "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg";
  const actorImage =
    upgradeActorImageRes(performance?.actor?.imageUrl) ??
    "https://image.tmdb.org/t/p/h632/AdWKVqyWpkYSfKE5Gb2qn8JzHni.jpg";
  const rateHref = performance
    ? getRateUrl(
        {
          id: performance.actorId,
          name: performance.actor?.name ?? "Heath Ledger",
          slug: performance.actor?.slug,
        },
        {
          id: performance.movieId,
          title: performance.movie?.title ?? "The Dark Knight",
          year: performance.movie?.year ?? 2008,
          slug: performance.movie?.slug,
        },
      )
    : getRateUrl(
        {
          id: createActorSlug("Heath Ledger"),
          name: "Heath Ledger",
          slug: createActorSlug("Heath Ledger"),
        },
        {
          id: createMovieSlug("The Dark Knight", 2008),
          title: "The Dark Knight",
          year: 2008,
          slug: createMovieSlug("The Dark Knight", 2008),
        },
      );

  return (
    <section className="bg-black px-5 sm:px-8 lg:px-10 py-14 sm:py-20">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-5xl mx-auto"
      >
        <p
          className="text-center text-xs sm:text-sm tracking-[0.22em] uppercase text-[#FFD700]/80 mb-6 sm:mb-8"
          style={HERO_SANS}
        >
          Featured Performance
        </p>

        <div
          className="relative grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] lg:grid-cols-[minmax(0,280px)_1fr] gap-8 md:gap-10 lg:gap-12 items-center rounded-3xl border border-white/10 p-6 sm:p-8 lg:p-10 overflow-hidden"
          style={{
            background:
              "linear-gradient(145deg, rgba(26,26,26,0.92) 0%, rgba(10,10,10,0.96) 55%, rgba(0,0,0,0.98) 100%)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative mx-auto md:mx-0 w-[180px] sm:w-[220px] md:w-full aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)]">
            {poster ? (
              <Image
                src={poster}
                alt="Heath Ledger as Joker in The Dark Knight"
                fill
                className="object-cover"
                sizes="280px"
                priority={false}
              />
            ) : null}
          </div>

          <div className="relative text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3.5 sm:gap-4">
              <div className="relative w-14 sm:w-16 lg:w-[4.5rem] aspect-[2/3] rounded-md overflow-hidden ring-1 ring-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.55)] shrink-0 bg-zinc-900">
                <Image
                  src={actorImage}
                  alt="Heath Ledger"
                  fill
                  className="object-contain"
                  sizes="72px"
                />
              </div>
              <h2
                className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight tracking-tight"
                style={PLAYFAIR}
              >
                Heath Ledger
              </h2>
            </div>
            <p className="mt-2 text-base sm:text-lg text-zinc-300">
              as <span className="text-[#FFD700]">Joker</span>
            </p>
            <p className="mt-1 text-sm sm:text-base text-zinc-500">
              The Dark Knight
            </p>
            <p className="mt-5 sm:mt-6 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl mx-auto md:mx-0">
              One of the most unforgettable performances in cinema history. Rate
              Heath Ledger&apos;s Oscar-winning portrayal of the Joker and see how
              it ranks among thousands of performances.
            </p>
            <Link
              href={rateHref}
              prefetch={false}
              className="mt-7 sm:mt-8 inline-flex"
            >
              <span
                className="inline-flex items-center gap-2 px-7 sm:px-8 py-3.5 rounded-md text-black text-sm sm:text-base font-bold tracking-wide transition-transform hover:scale-[1.02] min-h-[44px]"
                style={{ background: GOLD }}
              >
                Rate This Performance
                <FaArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function orderByTargets(
  rows: EnrichedPerformance[],
  targets: Array<{ actor: string; movie: string }>,
): EnrichedPerformance[] {
  const map = new Map<string, EnrichedPerformance>();
  for (const p of rows) {
    const k = performanceKey(p);
    if (k) map.set(k, p);
  }
  return targets
    .map((t) => map.get(`${t.actor}:${t.movie}`))
    .filter((p): p is EnrichedPerformance => !!p);
}

export default function HomePageClient({
  initialLeaderboardPerformances = [],
  initialRailPerformances = [],
  featuredHero: featuredHeroProp,
  primaryRateHref: primaryRateHrefProp,
}: {
  initialLeaderboardPerformances?: EnrichedPerformance[];
  initialRailPerformances?: EnrichedPerformance[];
  featuredHero: FeaturedHeroPayload;
  primaryRateHref?: string;
}) {
  const [clientResolvedFeatured, setClientResolvedFeatured] =
    useState<FeaturedHeroPayload | null>(null);
  const [railPool, setRailPool] = useState<EnrichedPerformance[]>(() => {
    const seen = new Set<string>();
    const out: EnrichedPerformance[] = [];
    for (const p of [...initialLeaderboardPerformances, ...initialRailPerformances]) {
      const k = performanceKey(p);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  });

  useEffect(() => {
    if (featuredHeroProp.rateHref !== "/performances") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildByLookupUrl([fixedLandingHeroLookupTarget()]), {
          cache: "force-cache",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rows = data.performances as EnrichedPerformance[] | undefined;
        if (!rows?.[0] || cancelled) return;
        setClientResolvedFeatured(buildFixedLandingHero(rows[0]));
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredHeroProp.rateHref]);

  useEffect(() => {
    const needed = allLandingRailLookupTargets().length;
    if (railPool.length >= needed) return;
    let cancelled = false;
    const targets = allLandingRailLookupTargets();
    (async () => {
      try {
        const res = await fetch(buildByLookupUrl(targets), { cache: "force-cache" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rows = (data.performances as EnrichedPerformance[]) ?? [];
        if (!rows.length || cancelled) return;
        setRailPool(rows);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [railPool.length]);

  const activeFeatured = clientResolvedFeatured ?? featuredHeroProp;
  const primaryRateHref = primaryRateHrefProp ?? activeFeatured.rateHref;

  const popular = orderByTargets(railPool, POPULAR_RIGHT_NOW_TARGETS);
  const legendary = orderByTargets(railPool, LEGENDARY_PERFORMANCE_TARGETS);
  const recent = orderByTargets(railPool, RECENT_FAVORITES_TARGETS);

  // Prefer DB rows when complete; otherwise use static targets so missing
  // catalog entries never drop posters from a rail (common on production).
  const popularItems =
    popular.length === POPULAR_RIGHT_NOW_TARGETS.length ? null : FALLBACK_POPULAR;
  const legendaryItems =
    legendary.length === LEGENDARY_PERFORMANCE_TARGETS.length
      ? null
      : FALLBACK_LEGENDARY;
  const recentItems =
    recent.length === RECENT_FAVORITES_TARGETS.length ? null : FALLBACK_RECENT;

  const featuredJoker =
    railPool.find(
      (p) =>
        p.actor?.name === "Heath Ledger" &&
        p.movie?.title === "The Dark Knight",
    ) ?? null;

  return (
    <>
      <HeroSection featured={activeFeatured} />

      <div className="bg-black pt-4 sm:pt-6 pb-4">
        {!popularItems ? (
          <PosterRail
            title="Popular Right Now"
            performances={popular}
            characterTargets={POPULAR_RIGHT_NOW_TARGETS}
          />
        ) : (
          <StaticPosterRail
            title="Popular Right Now"
            items={popularItems}
          />
        )}
        {!legendaryItems ? (
          <PosterRail
            title="Legendary Performances"
            performances={legendary}
            characterTargets={LEGENDARY_PERFORMANCE_TARGETS}
          />
        ) : (
          <StaticPosterRail
            title="Legendary Performances"
            items={legendaryItems}
          />
        )}
        {!recentItems ? (
          <PosterRail
            title="Recent Favorites"
            performances={recent}
            characterTargets={RECENT_FAVORITES_TARGETS}
          />
        ) : (
          <StaticPosterRail
            title="Recent Favorites"
            items={recentItems}
          />
        )}
      </div>

      <FeaturedPerformanceSection performance={featuredJoker} />

      <div className="bg-[#0a0a0a] border-y border-white/[0.05]">
        <LetsYouSection />
      </div>

      <ClosingStrip primaryRateHref={primaryRateHref} />
    </>
  );
}
