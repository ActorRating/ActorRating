// src/components/HomePageClient.tsx
"use client";

/**
 * Cormorant manifesto + one CTA over a film still,
 * with a dense poster strip bleeding into the first viewport. No marketing essays.
 */

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { BarChart3, Layers, List, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { WaitlistForm } from "@/components/auth/WaitlistForm";
import {
  prefetchPerformancesPageData,
  buildByLookupUrl,
  LEGENDARY_PERFORMANCE_TARGETS,
  POPULAR_RIGHT_NOW_POOL,
  RECENT_FAVORITES_POOL,
  popularRightNowTargets,
  recentFavoritesTargets,
  DAILY_RAIL_COUNT,
} from "@/lib/performances-page-targets";
import type { EnrichedPerformance } from "@/lib/performances-by-lookup";
import { upgradeActorImageRes } from "@/lib/tmdb";
import { getRateUrl } from "@/lib/slugHelper";
import { createActorSlug, createMovieSlug } from "@/lib/createSlug";
import {
  type FeaturedHeroPayload,
  buildFixedLandingHero,
  fixedLandingHeroLookupTarget,
} from "@/lib/home-featured-performance";
import { resolveCharacterDisplay } from "@/lib/character";
import {
  PosterRail,
  StaticPosterRail,
  upgradePosterThumbRes,
} from "@/components/poster/PosterRails";

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)";
const DISPLAY: React.CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
};
const HERO_SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
};
/** Cinematic hero manifesto — site display font (Cormorant) */
const HERO_MANIFESTO: React.CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
  fontWeight: 600,
  fontSize: "2.25rem",
  lineHeight: 1.33333,
  letterSpacing: "0.01em",
  textAlign: "center",
  textShadow: "none",
  margin: 0,
  WebkitFontSmoothing: "auto",
  MozOsxFontSmoothing: "auto",
};

function upgradePosterBackdropRes(url?: string | null): string | null {
  if (!url) return null;
  // Hero stills: prefer TMDB w1920 (backdrop assets are often 3840-wide)
  return url
    .replace(/\/t\/p\/w\d+\//, "/t/p/w1920/")
    .replace(/\/t\/p\/original\//, "/t/p/w1920/");
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

const FALLBACK_LEGENDARY = LEGENDARY_PERFORMANCE_TARGETS;
const LANDING_RAILS_MIN = Math.max(6, DAILY_RAIL_COUNT - 2);

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
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Readability wash — mid-start darkening on desktop + iPad landscape */}
      <div
        className={
          mobile
            ? "hero-backdrop-wash hero-backdrop-wash--stacked absolute inset-0 pointer-events-none"
            : "hero-backdrop-wash hero-backdrop-wash--cinematic absolute inset-0 pointer-events-none"
        }
      />
    </>
  );
}

function HeroCtaBlock() {
  // Mounted in multiple layout branches; HeroSection assigns id="waitlist" to the visible one.
  return <WaitlistForm anchor={false} />;
}

function useVisibleWaitlistAnchor() {
  useEffect(() => {
    const sync = () => {
      const slots = Array.from(
        document.querySelectorAll<HTMLElement>("[data-waitlist-slot]"),
      );
      for (const el of slots) el.removeAttribute("id");
      const visible = slots.find((el) => el.getClientRects().length > 0);
      if (visible) visible.id = "waitlist";
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
}

function HeroSection({ featured }: { featured: FeaturedHeroPayload }) {
  const reduceMotion = usePrefersReducedMotion();
  const posterSrc =
    upgradePosterBackdropRes(featured.moviePosterUrl) ??
    featured.moviePosterUrl ??
    HERO_BACKDROP_FALLBACK;
  useVisibleWaitlistAnchor();

  return (
    <>
      {/* ── Mobile + tablet: image on top, then branding + manifesto + CTA ── */}
      <section className="lg:hidden bg-black">
        <div className="relative w-full aspect-[16/10] max-h-[52svh] sm:max-h-[46svh] md:max-h-[42svh] overflow-hidden">
          {posterSrc ? <HeroBackdrop src={posterSrc} mobile /> : null}
        </div>
        <div className="px-5 sm:px-8 pt-6 pb-8 text-center">
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
            className="hero-manifesto-stacked text-white"
            style={HERO_MANIFESTO}
          >
            Rate performances you&apos;ve&nbsp;seen.
            <br />
            Save the ones that floored&nbsp;you.
            <br />
            Tell the internet who deserved&nbsp;it.
          </motion.h1>
          <div
            data-waitlist-slot
            className="mt-6 flex flex-col items-center scroll-mt-28"
          >
            <HeroCtaBlock />
          </div>
        </div>
      </section>

      {/* ── Desktop / large tablet (lg+): full-bleed still ── */}
      <section className="relative hidden lg:flex h-[100svh] w-full overflow-clip bg-black flex-col">
        {posterSrc ? (
          <div className="absolute inset-0" aria-hidden>
            <HeroBackdrop src={posterSrc} />
          </div>
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}

        {/* iPad / tall screens: manifesto + CTA in the lower third */}
        <div className="hero-cinematic-centered relative z-10 flex-1 flex-col items-center justify-end px-8 pb-[8vh] text-center">
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="hero-manifesto-cinematic max-w-3xl text-white"
            style={HERO_MANIFESTO}
          >
            Rate performances you&apos;ve&nbsp;seen.
            <br />
            Save the ones that floored&nbsp;you.
            <br />
            Tell the internet who deserved&nbsp;it.
          </motion.h1>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.08 }}
            data-waitlist-slot
            className="mt-12 flex flex-col items-center scroll-mt-28"
          >
            <HeroCtaBlock />
          </motion.div>
        </div>

        {/* Desktop: manifesto pinned to fold bottom */}
        <div className="hero-cinematic-bottom relative z-10 w-full flex-1 flex-col items-center">
          <div className="flex-1 w-full" aria-hidden />
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="hero-manifesto-cinematic w-full max-w-3xl px-8 pb-7 text-center text-white"
            style={HERO_MANIFESTO}
          >
            Rate performances you&apos;ve&nbsp;seen.
            <br />
            Save the ones that floored&nbsp;you.
            <br />
            Tell the internet who deserved&nbsp;it.
          </motion.h1>
        </div>
      </section>

      {/* CTA band — only with bottom-pinned desktop hero */}
      <section
        data-waitlist-slot
        className="hero-cta-band relative bg-black border-t border-white/[0.04] px-8 pt-9 pb-11 text-center scroll-mt-28"
      >
        <HeroCtaBlock />
      </section>
    </>
  );
}

// ─── "LETS YOU" — Letterboxd-style icon cards ────────────────────────────────

const LETS_YOU: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Rate any performance",
    body: "One slider — or five Oscar-inspired dimensions.",
    icon: SlidersHorizontal,
  },
  {
    title: "Separate acting from the film",
    body: "Great turns in mediocre movies finally get their due.",
    icon: Layers,
  },
  {
    title: "Compare with the community",
    body: "See how your take stacks up against the average.",
    icon: BarChart3,
  },
  {
    title: "Explore curated lists",
    body: "Iconic and underrated performances, ready to rate.",
    icon: List,
  },
];

function LetsYouSection() {
  return (
    <section className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <h2
        className="text-2xl sm:text-3xl font-bold text-white mb-8 sm:mb-10 text-center"
        style={DISPLAY}
      >
        ActorRating lets you…
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {LETS_YOU.map(({ title, body, icon: Icon }) => (
          <li
            key={title}
            className="rounded-md border border-white/[0.1] bg-white/[0.04] px-6 py-6 sm:px-7 sm:py-7 text-left"
          >
            <Icon
              className="w-6 h-6 mb-4 text-[#FFD700]"
              strokeWidth={1.75}
              aria-hidden
            />
            <h3
              className="text-lg sm:text-xl font-semibold text-white leading-snug mb-2"
              style={DISPLAY}
            >
              {title}
            </h3>
            <p className="text-[15px] sm:text-base text-zinc-300 leading-relaxed">
              {body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClosingStrip({ primaryRateHref }: { primaryRateHref: string }) {
  const router = useRouter();
  return (
    <section className="border-t border-white/[0.06] py-14 sm:py-20 text-center px-5">
      <p
        className="text-2xl sm:text-3xl md:text-4xl text-white font-semibold mb-8 max-w-2xl mx-auto leading-snug"
        style={DISPLAY}
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
      <div className="mt-6">
        <Link
          href="/lists"
          className="text-base sm:text-lg text-zinc-400 hover:text-[#FFD700] transition-colors"
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
  const actorName = performance?.actor?.name ?? "Heath Ledger";
  const movieTitle = performance?.movie?.title ?? "The Dark Knight";
  const movieYear = performance?.movie?.year ?? 2008;
  const character = performance
    ? resolveCharacterDisplay(performance)
    : "Joker";
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
          name: actorName,
          slug: performance.actor?.slug,
        },
        {
          id: performance.movieId,
          title: movieTitle,
          year: movieYear,
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
    <section className="border-t border-white/[0.06] bg-black px-5 sm:px-8 py-14 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <p
          className="text-center text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-8 sm:mb-10"
          style={HERO_SANS}
        >
          Featured Performance
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr] lg:grid-cols-[minmax(0,240px)_1fr] gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="relative mx-auto sm:mx-0 w-[160px] sm:w-full aspect-[2/3] overflow-hidden rounded-md border border-white/[0.1] bg-zinc-950">
            {poster ? (
              <Image
                src={poster}
                alt={`${actorName} as ${character} in ${movieTitle}`}
                fill
                className="object-cover"
                sizes="240px"
                priority={false}
              />
            ) : null}
          </div>

          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="relative w-12 sm:w-14 aspect-[2/3] overflow-hidden rounded-sm border border-white/[0.1] bg-zinc-950 shrink-0">
                <Image
                  src={actorImage}
                  alt={actorName}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <h2
                className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.1] tracking-tight"
                style={DISPLAY}
              >
                {actorName}
              </h2>
            </div>

            <p className="mt-3 text-base sm:text-lg text-zinc-300">
              as <span className="text-[#FFD700] font-medium">{character}</span>
            </p>
            <p className="mt-1 text-sm sm:text-base text-zinc-500">
              {movieTitle}
              {movieYear ? ` · ${movieYear}` : ""}
            </p>

            <p className="mt-5 sm:mt-6 text-[15px] sm:text-base text-zinc-400 leading-relaxed max-w-lg mx-auto sm:mx-0">
              One of the most unforgettable performances in cinema. Rate it and
              see how it stacks up with the community.
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
                Rate this performance
                <FaArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePageClient({
  initialPopular = [],
  initialLegendary = [],
  initialRecent = [],
  featuredHero: featuredHeroProp,
  primaryRateHref: primaryRateHrefProp,
}: {
  initialPopular?: EnrichedPerformance[];
  initialLegendary?: EnrichedPerformance[];
  initialRecent?: EnrichedPerformance[];
  featuredHero: FeaturedHeroPayload;
  primaryRateHref?: string;
}) {
  const [clientResolvedFeatured, setClientResolvedFeatured] =
    useState<FeaturedHeroPayload | null>(null);
  const [popular, setPopular] = useState<EnrichedPerformance[]>(initialPopular);
  const [legendary, setLegendary] =
    useState<EnrichedPerformance[]>(initialLegendary);
  const [recent, setRecent] = useState<EnrichedPerformance[]>(initialRecent);

  useEffect(() => {
    if (featuredHeroProp.rateHref !== "/discover" && featuredHeroProp.rateHref !== "/performances") return;
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
    const railsReady =
      popular.length >= LANDING_RAILS_MIN &&
      legendary.length >= LANDING_RAILS_MIN &&
      recent.length >= LANDING_RAILS_MIN;
    if (railsReady) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/performances/landing-rails", {
          cache: "force-cache",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.popular) && data.popular.length > 0) {
          setPopular(data.popular);
        }
        if (Array.isArray(data.legendary) && data.legendary.length > 0) {
          setLegendary(data.legendary);
        }
        if (Array.isArray(data.recent) && data.recent.length > 0) {
          setRecent(data.recent);
        }
      } catch {
        /* silent — static rails fill gaps */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [popular.length, legendary.length, recent.length]);

  const activeFeatured = clientResolvedFeatured ?? featuredHeroProp;
  const primaryRateHref = primaryRateHrefProp ?? activeFeatured.rateHref;

  const popularFallback = popularRightNowTargets();
  const recentFallback = recentFavoritesTargets();

  // Prefer DB rows when complete enough; otherwise today's editorial slice
  // so missing catalog entries never drop posters from a rail.
  const popularItems =
    popular.length >= LANDING_RAILS_MIN ? null : popularFallback;
  const legendaryItems =
    legendary.length === LEGENDARY_PERFORMANCE_TARGETS.length
      ? null
      : FALLBACK_LEGENDARY;
  const recentItems =
    recent.length >= LANDING_RAILS_MIN ? null : recentFallback;

  const featuredJoker =
    [...popular, ...legendary, ...recent].find(
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
            characterTargets={POPULAR_RIGHT_NOW_POOL}
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
            characterTargets={RECENT_FAVORITES_POOL}
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
