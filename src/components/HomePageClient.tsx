// src/components/HomePageClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react";
import {
  FaStar, FaSearch, FaArrowRight,
  FaUsers, FaChartLine, FaFilm, FaGlobe,
} from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  prefetchPerformancesPageData,
  buildByLookupUrl,
  HOME_LEADERBOARD_ROWS,
} from "@/lib/performances-page-targets";
import type { EnrichedPerformance } from "@/lib/performances-by-lookup";
import { upgradeActorImageRes } from "@/lib/tmdb";
import { getActorUrl, getMovieUrl, getRateUrl } from "@/lib/slugHelper";
import {
  type FeaturedHeroPayload,
  featuredHeroFromPerformances,
} from "@/lib/home-featured-performance";
import { ArrowUpRight } from "lucide-react";
import { SearchBar } from "@/components/SearchBar"
import { ActorHeadshot } from "@/components/ui/ActorHeadshot";
import { MoviePoster } from "@/components/ui/MoviePoster";

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)';
const GOLD_TEXT: React.CSSProperties = {
  background: GOLD,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};
const PLAYFAIR_HEADING: React.CSSProperties = {
  fontFamily: 'var(--font-playfair-display), "Playfair Display", Georgia, serif',
};

const CARD_SHADOW = `
  0 35px 90px -20px rgba(0,0,0,0.95),
  0 20px 50px -10px rgba(0,0,0,0.8),
  0 0 0 1px rgba(255,255,255,0.06),
  inset 0 1px 0 rgba(255,255,255,0.1),
  inset 0 -1px 0 rgba(0,0,0,0.4)
`.trim();

const CARD_BG = 'linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(15,15,15,0.95) 50%, rgba(0,0,0,0.95) 100%)';

/** Symmetric vertical padding so each section boundary matches How It Works ↔ Why ActorRating spacing. */
const HOME_SECTION_PY =
  'py-[4.25rem] sm:py-24 md:py-28 lg:py-32';

/** Hero grid bottom — pairs with first section’s top padding from HOME_SECTION_PY. */
const HOME_HERO_BOTTOM_PB =
  'pb-[4.25rem] sm:pb-24 md:pb-28 lg:pb-32';

const PERFORMANCES = HOME_LEADERBOARD_ROWS.map((r) => ({ ...r }));

// ─── Device hook ─────────────────────────────────────────────────────────────

function useDevice() {
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };
    check();
    window.addEventListener('resize', check);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', check);
    return () => { window.removeEventListener('resize', check); mq.removeEventListener('change', check); };
  }, []);
  return { isMobile, prefersReducedMotion };
}

// ─── Gold divider ─────────────────────────────────────────────────────────────

function GoldDivider({ width = 200 }: { width?: number }) {
  return (
    <div className="mx-auto mb-6" style={{ width, height: 2 }}>
      <div className="h-full w-full" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
        boxShadow: '0 0 20px rgba(255,165,0,0.6), 0 0 40px rgba(255,165,0,0.3)',
      }} />
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ eyebrow, goldWord, rest }: { eyebrow?: string; goldWord: string; rest: string }) {
  const { isMobile } = useDevice();
  return (
    <div className="text-center mb-12 sm:mb-16 md:mb-20">
      {eyebrow && (
        <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#FFD700] opacity-70 mb-4">{eyebrow}</p>
      )}
      <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight" style={PLAYFAIR_HEADING}>
        <span style={{ ...GOLD_TEXT, filter: isMobile ? 'none' : 'drop-shadow(0 0 40px rgba(255,215,0,0.3))' }}>
          {goldWord}
        </span>{' '}{rest}
      </h2>
      <GoldDivider />
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function HeroSection({
  initialLeaderboardPerformances,
}: {
  initialLeaderboardPerformances?: EnrichedPerformance[];
}) {
  const router = useRouter();
  const { isMobile, prefersReducedMotion } = useDevice();
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || !window.IntersectionObserver) return;
    const isTouchOrNarrow = window.matchMedia('(hover: none)').matches || window.innerWidth < 1024;
    if (!isTouchOrNarrow) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { prefetchPerformancesPageData(); obs.disconnect(); } },
      { rootMargin: '100px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="hero min-h-[90vh] relative flex items-start justify-center bg-black overflow-visible"
      style={{ willChange: 'auto', maxWidth: '100vw' }}
    >
      {/* Radial spotlight */}
      <motion.div
        initial={prefersReducedMotion || isMobile ? { opacity: 0.15 } : { opacity: 0, scale: 0.95 }}
        animate={prefersReducedMotion || isMobile ? { opacity: 0.15 } : { opacity: 0.15, scale: 1 }}
        transition={prefersReducedMotion || isMobile ? { duration: 0 } : { duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,200,0,0.28) 0%, rgba(255,180,0,0.18) 35%, rgba(255,160,0,0.08) 55%, transparent 75%)',
          maxWidth: '100vw',
          willChange: prefersReducedMotion || isMobile ? 'auto' : 'transform, opacity',
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)' }}
      />

      <div
        className="hero-content w-full relative z-10"
        style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}
      >
        <div className={`grid grid-cols-12 pt-48 xs:pt-52 sm:pt-36 md:pt-44 lg:pt-52 ${HOME_HERO_BOTTOM_PB} w-full`}>
          <div className="col-span-12 flex flex-col justify-center items-center w-full">

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-center text-[10px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-6 sm:mb-8 px-2 max-w-[90vw] mx-auto leading-snug"
            >
              The World&apos;s Acting Performance Database
            </motion.p>

            {/* MASSIVE HERO HEADLINE — original breakpoint sizing */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-14 w-full flex justify-center"
              style={{ opacity: 1, transform: 'translateY(0)' }}
            >
              <h1
                className="hero-tagline hero-text-fade-in text-[3rem] xs:text-[3.5rem] sm:text-[3.75rem] md:text-[4.75rem] lg:text-[5.75rem] xl:text-[6.5rem] text-white mb-0 font-bold text-center lg:whitespace-nowrap px-4 mx-auto"
                style={{
                  ...PLAYFAIR_HEADING,
                  textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                  letterSpacing: '0.08em',
                  lineHeight: '1.1',
                  maxWidth: '100%',
                  display: 'inline-block',
                }}
              >
                <span className="sr-only">Rate The Craft</span>
                <span className="inline sm:hidden text-white" style={{ wordSpacing: '0.08em' }} aria-hidden="true">Rate The </span>
                <span className="hidden sm:inline text-white" style={{ wordSpacing: '0.02em' }} aria-hidden="true">Rate The </span>
                <span
                  className="inline sm:hidden"
                  style={{ ...GOLD_TEXT, wordSpacing: '0.08em', textShadow: 'none' }}
                  aria-hidden="true"
                >Craft</span>
                <span
                  className="hidden sm:inline"
                  style={{ ...GOLD_TEXT, wordSpacing: '0.02em', textShadow: 'none' }}
                  aria-hidden="true"
                >Craft</span>
              </h1>
            </motion.div>

            {/* Tagline under title */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center px-4 mb-5 sm:mb-6 max-w-3xl mx-auto leading-snug"
              style={{ ...GOLD_TEXT }}
            >
              Rate the greatest performances in film
            </motion.p>

            {/* Gold divider */}
            <motion.div
              initial={prefersReducedMotion || isMobile ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-6 xs:mb-8 sm:mb-10 md:mb-12 relative"
              style={{ width: '180px', transformOrigin: 'center' }}
            >
              <div className="h-full w-full" style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, #FFD700 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent)',
                boxShadow: '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3)',
              }} />
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base xs:text-lg sm:text-xl md:text-2xl w-full max-w-3xl leading-relaxed text-[#c4c4c4] mb-8 sm:mb-10 font-light text-center px-4 sm:px-6"
            >
              See how your rating compares with others
            </motion.p>

            {/* Top rated carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.4 }}
              className="w-full px-2 mb-5"
            >
              <LeaderboardSection initialPerformances={initialLeaderboardPerformances} compact />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.48 }}
              className="text-xs sm:text-sm text-center text-[#52525b] font-medium mb-6 sm:mb-8 px-4"
            >
              Join others rating performances like this
            </motion.p>

            {/* Search bar — matches performances page */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-3 sm:mb-4 max-w-3xl mx-auto w-full px-2 sm:px-0"
              ref={ctaRef}
            >
              <div className="relative group">
                <div
                  className="relative rounded-[2rem] border border-transparent bg-[#1a1a1a] backdrop-blur-2xl overflow-hidden transition-all duration-300"
                  style={{
                    boxShadow: `0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 15px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)`,
                    transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <SearchBar
                    placeholder="Search for actors and movies..."
                    showClear
                    className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-5 [&_input]:text-base sm:[&_input]:text-lg [&_input]:min-h-[56px]"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.58 }}
              className="flex justify-center px-4 mb-16 sm:mb-20 md:mb-24 lg:mb-28"
            >
              <Link
                href="/performances"
                className="text-xs sm:text-sm text-[#71717a] hover:text-[#FFD700] transition-colors duration-200"
                onMouseEnter={() => { prefetchPerformancesPageData(); router.prefetch('/performances'); }}
              >
                View all performances →
              </Link>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

function performancesMapFromEnriched(perfs: EnrichedPerformance[] | undefined): Map<string, EnrichedPerformance> {
  const map = new Map<string, EnrichedPerformance>();
  if (!perfs?.length) return map;
  for (const p of perfs) {
    if (p.actor?.name && p.movie?.title) {
      map.set(`${p.actor.name}:${p.movie.title}`, p);
    }
  }
  return map;
}

type LeaderboardRow = (typeof PERFORMANCES)[number];

function isHomeLeaderboardHydrated(map: Map<string, EnrichedPerformance>): boolean {
  return PERFORMANCES.every((row) => map.has(`${row.actor}:${row.movie}`));
}

/** First slots fixed order; tail sorted by community average (desc). */
const HOME_LEADERBOARD_HEAD_KEYS = [
  'Heath Ledger:The Dark Knight',
  'Cillian Murphy:Oppenheimer',
  'Margot Robbie:Barbie',
] as const;

function orderHomeLeaderboardRows(map: Map<string, EnrichedPerformance>): LeaderboardRow[] {
  const head = HOME_LEADERBOARD_HEAD_KEYS.map((key) =>
    PERFORMANCES.find((r) => `${r.actor}:${r.movie}` === key),
  ).filter((r): r is LeaderboardRow => r != null);
  const headKeySet = new Set(head.map((r) => `${r.actor}:${r.movie}`));
  const tail = PERFORMANCES.filter((r) => !headKeySet.has(`${r.actor}:${r.movie}`)).sort((a, b) => {
    const ar = map.get(`${a.actor}:${a.movie}`)?.averageRating ?? 0;
    const br = map.get(`${b.actor}:${b.movie}`)?.averageRating ?? 0;
    return br - ar;
  });
  return [...head, ...tail];
}

// ─── LEADERBOARD — performances page carousel style ──────────────────────────

function LeaderboardSection({
  initialPerformances,
  compact = false,
}: {
  initialPerformances?: EnrichedPerformance[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [performancesData, setPerformancesData] = useState<Map<string, EnrichedPerformance>>(() =>
    performancesMapFromEnriched(initialPerformances)
  );
  const [sortedPerfs, setSortedPerfs] = useState<LeaderboardRow[]>(() =>
    orderHomeLeaderboardRows(performancesMapFromEnriched(initialPerformances)),
  );
  const [isLoading, setIsLoading] = useState(() => {
    const map = performancesMapFromEnriched(initialPerformances);
    return !isHomeLeaderboardHydrated(map);
  });
  const [activeCard, setActiveCard] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keep client map/sort aligned with SSR props (streaming / delayed payload / navigation).
  useEffect(() => {
    const seeded = performancesMapFromEnriched(initialPerformances);
    if (!isHomeLeaderboardHydrated(seeded)) return;
    setPerformancesData(seeded);
    setSortedPerfs(orderHomeLeaderboardRows(seeded));
    setIsLoading(false);
  }, [initialPerformances]);

  useEffect(() => {
    // If SSR already gave us all five rows, use that data as-is — no fetch needed.
    const seeded = performancesMapFromEnriched(initialPerformances);
    if (isHomeLeaderboardHydrated(seeded)) return;

    let cancelled = false;
    (async () => {
      try {
        const targets = PERFORMANCES.map((h) => ({ actor: h.actor, movie: h.movie }));
        const res = await fetch(buildByLookupUrl(targets), { cache: "force-cache" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rows = data.performances as EnrichedPerformance[] | undefined;
        if (!rows?.length || cancelled) return;
        const map = new Map<string, EnrichedPerformance>();
        rows.forEach((p) => {
          if (p.actor?.name && p.movie?.title) map.set(`${p.actor.name}:${p.movie.title}`, p);
        });
        setPerformancesData(map);
        setSortedPerfs(orderHomeLeaderboardRows(map));
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialPerformances]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [sortedPerfs]);

  // Scroll tracking for active dot
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const updateActive = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      const cards = container.querySelectorAll('.leaderboard-card');
      let closest = 0, closestDist = Infinity;
      cards.forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect();
        const dist = Math.abs(containerCenter - (cardRect.left + cardRect.width / 2));
        if (dist < closestDist) { closestDist = dist; closest = idx; }
      });
      setActiveCard(closest);
    };
    container.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
    return () => container.removeEventListener('scroll', updateActive);
  }, []);

  // Desktop scale/opacity depth effect
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const updateDepth = () => {
      if (!isDesktop) {
        container.querySelectorAll('.leaderboard-card').forEach((card) => {
          const el = card as HTMLElement;
          el.style.transform = 'scale(1) translateY(0)';
          el.style.opacity = '1';
        });
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      container.querySelectorAll('.leaderboard-card').forEach((card) => {
        const el = card as HTMLElement;
        const cardRect = el.getBoundingClientRect();
        const dist = Math.abs(containerCenter - (cardRect.left + cardRect.width / 2));
        const norm = Math.min(dist / (containerRect.width / 2), 1);
        el.style.transform = `scale(${1 - norm * 0.08}) translateY(${norm * 10}px)`;
        el.style.opacity = `${1 - norm * 0.4}`;
      });
    };
    container.addEventListener('scroll', updateDepth, { passive: true });
    window.addEventListener('resize', updateDepth);
    updateDepth();
    return () => {
      container.removeEventListener('scroll', updateDepth);
      window.removeEventListener('resize', updateDepth);
    };
  }, [isDesktop]);

  return (
    <div id="leaderboard" className={`relative z-10 bg-black ${compact ? 'py-0' : 'py-20 sm:py-28 md:py-32 lg:py-40'}`}>
      {!compact && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
        </div>
      )}

      <div className="w-full relative" style={{ maxWidth: compact ? '100%' : '1280px', margin: '0 auto' }}>
        {!compact && (
          <div className="text-center mb-10 sm:mb-12 md:mb-16 px-4">
            <SectionHeading eyebrow="Community Rankings" goldWord="Top" rest="Rated" />
          </div>
        )}

        {/* Carousel */}
        <div className="relative">
          <div className="relative -mx-4 sm:-mx-0">
            <div
              className="overflow-hidden"
              style={isDesktop ? {
                maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
              } : {}}
            >
              <div
                ref={scrollRef}
                dir="ltr"
                className="flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-proximity scrollbar-hide px-[max(1rem,calc((100%-85vw)/2))] sm:px-[max(1rem,calc((100%-70vw)/2))] lg:px-[max(1rem,calc((100%-min(35vw,28rem))/2))] xl:px-[max(1rem,calc((100%-min(30vw,28rem))/2))]"
              >
                {sortedPerfs.map((p, index) => {
                  const key = `${p.actor}:${p.movie}`;
                  const perfData = performancesData.get(key);
                  const avg = perfData?.averageRating;
                  const cnt = perfData?.ratingCount ?? 0;
                  const rating = avg != null && avg > 0 && cnt > 0 ? (avg / 10).toFixed(1) : null;
                  const href = perfData?.actor && perfData?.movie
                    ? getRateUrl(
                        { id: perfData.actorId, name: perfData.actor.name, slug: perfData.actor.slug },
                        { id: perfData.movieId, title: perfData.movie.title, year: perfData.movie.year, slug: perfData.movie.slug },
                      )
                    : '/performances';
                  const actorPageHref = perfData?.actor
                    ? getActorUrl({ id: perfData.actorId, name: perfData.actor.name, slug: perfData.actor.slug ?? null })
                    : null;
                  const moviePageHref = perfData?.movie
                    ? getMovieUrl({ id: perfData.movieId, title: perfData.movie.title, year: perfData.movie.year, slug: perfData.movie.slug ?? null })
                    : null;

                  return (
                    <div
                      key={key}
                      className="leaderboard-card flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw] lg:max-w-md xl:max-w-md snap-center"
                      style={{ transform: 'translateZ(0)' }}
                      onClick={() => {
                        if (isDesktop) {
                          const el = scrollRef.current?.querySelectorAll('.leaderboard-card')[index] as HTMLElement;
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                      }}
                    >
                      <LeaderboardCard
                        actorName={p.actor}
                        movieTitle={p.movie}
                        year={p.year}
                        rating={rating}
                        isLoading={isLoading}
                        href={href}
                        actorPageHref={actorPageHref}
                        moviePageHref={moviePageHref}
                        actorImageUrl={upgradeActorImageRes(perfData?.actor?.imageUrl)}
                        moviePosterUrl={perfData?.movie?.posterUrl}
                        router={router}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center items-center mt-8" style={{ gap: '4px' }}>
            {sortedPerfs.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  const cards = scrollRef.current?.querySelectorAll('.leaderboard-card');
                  const target = cards?.[index] as HTMLElement;
                  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                style={{ padding: '10px 4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label={`Go to card ${index + 1}`}
              >
                <div style={{
                  width: index === activeCard ? '20px' : '8px',
                  height: '8px',
                  backgroundColor: index === activeCard ? '#FFD700' : 'rgba(115,115,115,0.4)',
                  borderRadius: '9999px',
                  transition: 'all 0.3s ease',
                }} />
              </button>
            ))}
          </div>
        </div>

        <div className={`${compact ? 'mt-4 text-center' : 'mt-10 text-center'}`}>
          <Link
            href="/performances"
            className="group inline-flex items-center gap-2.5 text-sm text-[#888] hover:text-[#FFD700] transition-colors duration-200"
            onMouseEnter={() => prefetchPerformancesPageData()}
          >
            Explore all 570K+ performances
            <FaArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function LeaderboardCard({ actorName, movieTitle, year, rating, isLoading, href, actorPageHref, moviePageHref, actorImageUrl, moviePosterUrl, router, rateCta = 'Rate this performance' }: {
  actorName: string; movieTitle: string; year: string; rating: string | null;
  isLoading: boolean; href: string; actorPageHref: string | null; moviePageHref: string | null;
  actorImageUrl?: string | null; moviePosterUrl?: string | null;
  router: ReturnType<typeof useRouter>;
  rateCta?: string;
}) {
  const handlePrefetch = () => router.prefetch(href);
  return (
    <div className="group relative h-full" onMouseEnter={handlePrefetch}>
      <div
        className="relative h-full p-6 sm:p-8 md:p-10 lg:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
        style={{ boxShadow: '0 25px 70px -15px rgba(0,0,0,0.9), 0 15px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)' }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-center items-end gap-4 sm:gap-5 mb-6">
            <ActorHeadshot
              key={`h-${actorImageUrl ?? actorName}`}
              name={actorName}
              imageUrl={actorImageUrl}
              size="lg"
              loading="eager"
            />
            <MoviePoster
              key={`p-${moviePosterUrl ?? movieTitle}`}
              title={movieTitle}
              posterUrl={moviePosterUrl}
              size="lg"
              loading="eager"
            />
          </div>
          <div className="flex items-center justify-between mb-6">
            {isLoading ? (
              <div className="w-20 h-12 rounded-full bg-[#1a1a1a] animate-pulse" />
            ) : rating ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                <FaStar className="w-5 h-5 text-[#FFD700]" />
                <span className="text-3xl font-bold text-[#FFD700]" style={{ fontVariantNumeric: 'tabular-nums' }}>{rating}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
                <FaStar className="w-5 h-5 text-[#666]" />
                <span className="text-3xl font-bold text-[#a3a3a3]">N/A</span>
              </div>
            )}
            <div className="text-[#a3a3a3] text-base font-medium">{year}</div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={PLAYFAIR_HEADING}>
              {actorPageHref ? (
                <Link href={actorPageHref} className="group/actor inline-flex items-center gap-1.5 hover:text-[#FFD700] transition-colors duration-200">
                  {actorName}
                  <ArrowUpRight className="w-4 h-4 opacity-40 group-hover/actor:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                </Link>
              ) : actorName}
            </h3>
            {moviePageHref ? (
              <Link href={moviePageHref} className="group/movie inline-flex items-center gap-1.5 text-lg text-[#FFD700] font-semibold tracking-wide hover:text-[#FFE55C] transition-colors duration-200 mb-4">
                {movieTitle}
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover/movie:opacity-100 transition-opacity duration-200 flex-shrink-0" />
              </Link>
            ) : (
              <p className="text-lg text-[#FFD700] font-semibold tracking-wide mb-4">{movieTitle}</p>
            )}
          </div>
          <div className="mt-auto pt-4">
            <Link href={href} prefetch={false} onMouseEnter={handlePrefetch}>
              <button
                className="w-full px-6 py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer min-h-[56px] touch-manipulation"
                style={{ background: GOLD }}
              >
                <span className="flex items-center justify-center gap-2">
                  {rateCta}
                  <FaArrowRight className="w-4 h-4" />
                </span>
              </button>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
      </div>
    </div>
  );
}

// ─── 5 RATING CRITERIA SECTION ────────────────────────────────────────────────

const CRITERIA = [
  { num: "01", title: "Emotional Range & Depth",      sub: "The whole spread — sad, happy, angry, soft. Sometimes all in one scene." },
  { num: "02", title: "Character Believability",       sub: "Do you stop thinking \"that's an actor\"? That's a good sign." },
  { num: "03", title: "Technical Skill & Authenticity", sub: "Voice, body, accent, movement. The skill under the surface." },
  { num: "04", title: "Screen Presence & Impact",      sub: "They own the screen — even when they barely move." },
  { num: "05", title: "Chemistry & Interaction",       sub: "Strong work makes everyone else look better too." },
];

function RatingCriteriaSection({ primaryRateHref = '/performances' }: { primaryRateHref?: string }) {
  const { isMobile, prefersReducedMotion } = useDevice();
  const reduceMotion = isMobile || prefersReducedMotion;
  return (
    <div className={`relative z-10 ${HOME_SECTION_PY}`} style={{ background: '#040404' }}>
      <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)' }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-14 md:pt-16">
        {/* Header */}
        <div className="mb-14 sm:mb-20">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FFD700] opacity-60 mb-4">How We Rate</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight" style={PLAYFAIR_HEADING}>
              The 5<br />
              <span style={GOLD_TEXT}>Dimensions</span>
            </h2>
            <p className="text-sm sm:text-base text-[#555] max-w-xs leading-relaxed sm:text-right">
              Use one quick slider. Or dig into all five.<br className="hidden sm:block" /> Each part of the score matters.
            </p>
          </div>
        </div>

        {/* Editorial numbered list */}
        <div className="space-y-0">
          {CRITERIA.map((c, i) => (
            <motion.div
              key={i}
              initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
              animate={reduceMotion ? { opacity: 1, x: 0 } : undefined}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, margin: reduceMotion ? '0px' : '-30px' }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.25, delay: i * 0.04 }}
            >
              <div
                className="group flex items-start gap-6 sm:gap-10 py-7 sm:py-8 transition-all duration-200 cursor-default"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Gold number */}
                <span
                  className="text-3xl sm:text-4xl font-black leading-none flex-shrink-0 w-12 sm:w-16 text-right"
                  style={{ ...GOLD_TEXT, fontVariantNumeric: 'tabular-nums' }}
                >
                  {c.num}
                </span>

                {/* Vertical rule */}
                <div className="flex-shrink-0 w-px self-stretch mt-1" style={{ background: 'rgba(255,215,0,0.15)' }} />

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1.5 leading-tight group-hover:text-[#FFD700] transition-colors duration-200" style={PLAYFAIR_HEADING}>
                    {c.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#555] leading-relaxed">{c.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 flex justify-center">
          <Link href={primaryRateHref} prefetch={false}>
            <button
              className="group inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-full text-black text-base sm:text-lg font-bold tracking-wider transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,0.3)]"
              style={{ background: GOLD }}
            >
              Try Rating Now
              <FaArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1.5" />
            </button>
          </Link>
        </div>
      </div>

      <div className="w-full h-px mt-16 sm:mt-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)' }} />
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

function HowItWorksSection({ primaryRateHref = '/performances' }: { primaryRateHref?: string }) {
  const router = useRouter();
  const { isMobile, prefersReducedMotion } = useDevice();

  const steps = [
    { number: "01", icon: FaSearch,    title: "Find a Performance",   description: "Search 570,000+ acting roles from film history — from early silent stars to this year's Oscar nominees." },
    { number: "02", icon: FaStar,      title: "Rate in 2 Minutes",    description: "One quick slider, or break it down into 5 parts: emotion, skill, realism, impact, and chemistry." },
    { number: "03", icon: FaChartLine, title: "See the Consensus",    description: "See how your score lines up with the group average. Find what people worldwide call a stand-out performance." },
  ];

  return (
    <div className={`relative z-10 bg-black ${HOME_SECTION_PY}`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,180,0,0.15) 0%, transparent 70%)', filter: isMobile ? 'blur(80px)' : 'blur(150px)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <SectionHeading eyebrow="Simple Process" goldWord="How" rest="It Works" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-7">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const reduceMotion = isMobile || prefersReducedMotion;
            return (
              <motion.div
                key={i}
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                animate={reduceMotion ? { opacity: 1, y: 0 } : undefined}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: reduceMotion ? '0px' : '-40px' }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.25, delay: i * 0.05 }}
                className="group"
              >
                <div
                  className="relative h-full p-8 sm:p-10 rounded-[2rem] overflow-hidden transition-all duration-300"
                  style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
                  onMouseEnter={(e) => { if (!isMobile && !prefersReducedMotion) e.currentTarget.style.boxShadow = CARD_SHADOW + ', 0 0 40px rgba(255,215,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = CARD_SHADOW; }}
                >
                  {!isMobile && !prefersReducedMotion && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem]">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)' }} />
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col items-center text-center h-full">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-[0.2em] mb-6"
                      style={{ color: '#FFD700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)' }}>
                      {step.number}
                    </div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: 'rgba(255,215,0,0.08)', border: '2px solid rgba(255,215,0,0.25)', boxShadow: '0 0 30px rgba(255,215,0,0.1)' }}>
                      <Icon className="w-7 h-7 sm:w-9 sm:h-9 text-[#FFD700]" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4 leading-tight" style={PLAYFAIR_HEADING}>{step.title}</h3>
                    <p className="text-sm text-[#a0a0a0] leading-relaxed">{step.description}</p>
                  </div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-[#FFD700]/6 to-transparent rounded-tl-[80px] pointer-events-none" />
                  <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#FFA500]/4 to-transparent rounded-br-[80px] pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-14 sm:mt-20 text-center">
          <Link
            href={primaryRateHref}
            prefetch={false}
            onMouseEnter={() => {
              if (primaryRateHref.startsWith('/rate/')) router.prefetch(primaryRateHref);
              else { prefetchPerformancesPageData(); router.prefetch('/performances'); }
            }}
          >
            <button
              className="group inline-flex items-center gap-4 px-10 sm:px-16 py-5 sm:py-6 rounded-full text-black text-base sm:text-xl font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]"
              style={{ background: GOLD }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Rate a performance
              <FaArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-2" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── WHY ACTORRATING ──────────────────────────────────────────────────────────

function FeaturesSection({ compact = false }: { compact?: boolean }) {
  const { isMobile, prefersReducedMotion } = useDevice();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const features = [
    {
      icon: FaUsers,
      title: "Community-Driven Ratings",
      stat: "Growing community",
      description: "Every rating helps build the big, lasting record of great screen acting. Help us grow it.",
      descriptionFull: "Every rating helps build the big, lasting record of great screen acting. More ratings make the picture clearer and fairer.",
    },
    {
      icon: FaFilm,
      title: "570K+ Performances",
      stat: "All of cinema history",
      description: "A huge list of performances online — from silent classics to new releases this week.",
      descriptionFull: "A huge list of performances online — from silent classics to new releases this week. Every era, every genre, and many languages of film.",
    },
    {
      icon: FaGlobe,
      title: "5-Dimension Rating System",
      stat: "Oscar-inspired criteria",
      description: "Not just stars. Score depth, skill, realism, cultural impact, and overall excellence.",
      descriptionFull: "Not just stars. Score depth, skill, realism, cultural impact, and overall excellence. Five Oscar-style areas — ideas the Academy has used for almost 100 years.",
    },
  ];

  return (
    <div className={`relative z-10 bg-black ${compact ? HOME_SECTION_PY : 'py-20 sm:py-28 md:py-32 lg:py-40'}`}>
      <div className={`absolute inset-0 pointer-events-none ${compact ? 'opacity-10' : 'opacity-15'}`}>
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,200,0,0.2) 0%, transparent 70%)', filter: isMobile ? 'blur(80px)' : 'blur(160px)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <SectionHeading eyebrow="The Platform" goldWord="Why" rest="ActorRating" />

        <div className="space-y-5 sm:space-y-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isExpanded = expanded.has(i);
            const reduceMotion = isMobile || prefersReducedMotion;
            return (
              <motion.div
                key={i}
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                animate={reduceMotion ? { opacity: 1, y: 0 } : undefined}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: reduceMotion ? '0px' : '-40px' }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.25, delay: i * 0.05 }}
                className="group"
              >
                <div
                  className="relative p-8 sm:p-10 md:p-12 rounded-[2rem] overflow-hidden transition-all duration-300"
                  style={{ background: CARD_BG, boxShadow: CARD_SHADOW, transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)', transformStyle: 'preserve-3d' }}
                >
                  {!isMobile && !prefersReducedMotion && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2rem]">
                      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#FFD700]/8 rounded-full blur-3xl" />
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6 sm:gap-8 md:gap-12">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(255,215,0,0.08)', border: '2px solid rgba(255,215,0,0.3)', boxShadow: '0 0 30px rgba(255,215,0,0.1)' }}>
                        <Icon className="w-7 h-7 md:w-10 md:h-10 text-[#FFD700]" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight" style={PLAYFAIR_HEADING}>{f.title}</h3>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full flex-shrink-0 self-start"
                          style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                          <span className="text-xs font-semibold text-[#FFD700]">{f.stat}</span>
                        </div>
                      </div>
                      <p className="text-sm sm:text-base md:text-lg text-[#d4d4d8] leading-relaxed">
                        {isExpanded ? f.descriptionFull : f.description}
                      </p>
                      {!isExpanded && (
                        <button
                          onClick={() => setExpanded(prev => new Set(prev).add(i))}
                          className="mt-2 text-xs text-[#FFD700] hover:text-[#FFE55C] transition-colors duration-200"
                        >
                          Read more
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[100px] pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT TEASER ─────────────────────────────────────────────────────────────

function AboutTeaser() {
  return (
    <div className={`relative z-10 bg-black ${HOME_SECTION_PY}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div
          className="relative group p-8 sm:p-12 md:p-16 rounded-[2rem] overflow-hidden transition-all duration-300 text-center"
          style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2rem]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10">
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-5">Our Mission</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight" style={PLAYFAIR_HEADING}>
              <span style={GOLD_TEXT}>&ldquo;A great performance</span>
              <br />
              can exist in a mediocre movie.&rdquo;
            </h2>
            <GoldDivider width={120} />
            <p className="text-base sm:text-lg md:text-xl text-[#a0a0a0] font-light leading-relaxed max-w-2xl mx-auto mb-8 mt-6">
              Most sites rate whole movies. ActorRating rates the acting. We separate the performance from the film — and honor work that rises above the rest of the movie.
            </p>
            <Link href="/about">
              <button
                className="group inline-flex items-center gap-3 px-7 sm:px-9 py-3.5 sm:py-4 rounded-full text-black text-sm sm:text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 hover:shadow-[0_0_24px_rgba(255,215,0,0.3)]"
                style={{ background: GOLD }}
              >
                Read Our Story
                <FaArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1.5" />
              </button>
            </Link>
          </div>

          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[100px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#FFA500]/4 to-transparent rounded-bl-[100px] pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ─── COMMUNITY CTA ─────────────────────────────────────────────────────────────

function CommunityCta({ primaryRateHref = '/performances' }: { primaryRateHref?: string }) {
  const router = useRouter();
  const { isMobile, prefersReducedMotion } = useDevice();
  const reduceMotion = isMobile || prefersReducedMotion;

  return (
    <div className={`relative z-10 bg-black ${HOME_SECTION_PY}`}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-15"
        style={{ width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,0,0.25) 0%, transparent 65%)', filter: isMobile ? 'blur(60px)' : 'blur(120px)' }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <p className="text-[10px] sm:text-xs font-bold tracking-[0.28em] uppercase text-[#FFD700] opacity-70 mb-6">Start rating now — it takes 10 seconds</p>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight" style={PLAYFAIR_HEADING}>
          Be part of building
          <br />
          <span style={GOLD_TEXT}>the performance canon</span>
        </h2>

        <motion.div
          initial={reduceMotion ? { width: '180px', opacity: 1 } : { width: 0, opacity: 0 }}
          animate={reduceMotion ? { width: '180px', opacity: 1 } : undefined}
          whileInView={reduceMotion ? undefined : { width: '180px', opacity: 1 }}
          viewport={{ once: true }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
          className="h-[2px] mx-auto mb-8"
          style={{ willChange: reduceMotion ? 'auto' : 'width, opacity' }}
        >
          <div className="h-full w-full" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
            boxShadow: '0 0 20px rgba(255,165,0,0.6), 0 0 40px rgba(255,165,0,0.3)',
          }} />
        </motion.div>

        <p className="text-sm sm:text-lg md:text-xl text-[#a0a0a0] font-light leading-relaxed mb-10 max-w-xl mx-auto">
          Your ratings help define what &quot;great acting&quot; means. Start rating — it&apos;s free, forever.
        </p>

        <div className="flex justify-center">
          <Link
            href={primaryRateHref}
            prefetch={false}
            onMouseEnter={() => {
              if (primaryRateHref.startsWith('/rate/')) router.prefetch(primaryRateHref);
              else { prefetchPerformancesPageData(); router.prefetch('/performances'); }
            }}
          >
            <button
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full text-black text-base sm:text-lg font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]"
              style={{ background: GOLD }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Rate a performance
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────

export default function HomePageClient({
  initialLeaderboardPerformances = [],
  featuredHero: featuredHeroProp = null,
}: {
  initialLeaderboardPerformances?: EnrichedPerformance[];
  featuredHero?: FeaturedHeroPayload | null;
}) {
  const fromSeed = useMemo(() => {
    if (featuredHeroProp) return featuredHeroProp;
    return featuredHeroFromPerformances(initialLeaderboardPerformances);
  }, [featuredHeroProp, initialLeaderboardPerformances]);

  const [clientResolvedFeatured, setClientResolvedFeatured] = useState<FeaturedHeroPayload | null>(null);
  const [featuredFetchDone, setFeaturedFetchDone] = useState(!!fromSeed);

  useEffect(() => {
    if (fromSeed) return;
    let cancelled = false;
    (async () => {
      try {
        const targets = HOME_LEADERBOARD_ROWS.map(({ actor, movie }) => ({ actor, movie }));
        const res = await fetch(buildByLookupUrl(targets), { cache: 'force-cache' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rows = data.performances as EnrichedPerformance[] | undefined;
        if (!rows?.length || cancelled) return;
        const picked = featuredHeroFromPerformances(rows);
        if (picked && !cancelled) setClientResolvedFeatured(picked);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setFeaturedFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromSeed]);

  const activeFeatured = fromSeed ?? clientResolvedFeatured;
  const primaryRateHref = activeFeatured?.rateHref ?? '/performances';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  return (
    <>
      <HeroSection initialLeaderboardPerformances={initialLeaderboardPerformances} />
      <CommunityCta primaryRateHref={primaryRateHref} />
      <RatingCriteriaSection primaryRateHref={primaryRateHref} />
      <HowItWorksSection primaryRateHref={primaryRateHref} />
      <FeaturesSection compact />
      <AboutTeaser />
    </>
  );
}
