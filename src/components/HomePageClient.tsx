// src/components/HomePageClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  FaStar, FaSearch, FaArrowRight, FaTrophy,
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
import { SearchBar } from "@/components/SearchBar"
import { ActorAvatar } from "@/components/ui/ActorAvatar";

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD = 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)';
const GOLD_TEXT: React.CSSProperties = {
  background: GOLD,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};
const CINZEL: React.CSSProperties = { fontFamily: 'var(--font-cinzel), serif' };

const CARD_SHADOW = `
  0 35px 90px -20px rgba(0,0,0,0.95),
  0 20px 50px -10px rgba(0,0,0,0.8),
  0 0 0 1px rgba(255,255,255,0.06),
  inset 0 1px 0 rgba(255,255,255,0.1),
  inset 0 -1px 0 rgba(0,0,0,0.4)
`.trim();

const CARD_BG = 'linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(15,15,15,0.95) 50%, rgba(0,0,0,0.95) 100%)';

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
      <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight" style={CINZEL}>
        <span style={{ ...GOLD_TEXT, filter: isMobile ? 'none' : 'drop-shadow(0 0 40px rgba(255,215,0,0.3))' }}>
          {goldWord}
        </span>{' '}{rest}
      </h2>
      <GoldDivider />
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function HeroSection() {
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
        <div className="grid grid-cols-12 pt-48 xs:pt-52 sm:pt-36 md:pt-44 lg:pt-52 pb-20 sm:pb-28 md:pb-32 lg:pb-40 w-full">
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
                className="hero-tagline hero-text-fade-in text-[3rem] xs:text-[3.5rem] sm:text-[3.75rem] md:text-[4.75rem] lg:text-[5.75rem] xl:text-[6.5rem] text-white mb-0 font-extrabold text-center lg:whitespace-nowrap px-4 mx-auto"
                style={{
                  ...CINZEL,
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
              className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl w-full max-w-4xl leading-relaxed text-[#d4d4d4] mb-4 xs:mb-5 sm:mb-6 md:mb-8 font-light text-center px-4 sm:px-6"
            >
              A place for movie fans. Rate acting. Compare roles. Find great performances.
            </motion.p>

            {/* Search bar — same component as Performances page */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="w-full max-w-2xl mb-6 px-2"
              ref={ctaRef}
            >
              <div
                className="relative rounded-[2rem] overflow-hidden transition-all duration-300"
                style={{
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: `0 25px 70px -15px rgba(0,0,0,0.9), 0 15px 40px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)`,
                  transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <SearchBar
                  placeholder="Search for an actor or film…"
                  showClear
                  disableAutoScrollOnFocus
                  className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#555] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:min-h-[54px]"
                />
              </div>
            </motion.div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              className="mb-8"
            >
              <Link
                href="/performances"
                onMouseEnter={() => { prefetchPerformancesPageData(); router.prefetch('/performances'); }}
                aria-label="Start rating acting performances now"
              >
                <button
                  className="group px-8 xs:px-10 sm:px-16 py-4 xs:py-5 sm:py-6 rounded-full text-black text-lg xs:text-xl sm:text-2xl font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] relative overflow-hidden touch-manipulation"
                  style={{ background: GOLD, boxShadow: '0 0 20px rgba(255,215,0,0.25), 0 0 40px rgba(255,215,0,0.15)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  aria-label="Start rating acting performances now"
                >
                  {/* Sweep effect */}
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                    aria-hidden="true"
                  />
                  <span className="flex items-center justify-center gap-3 xs:gap-4 sm:gap-5 whitespace-nowrap relative z-10">
                    Start Rating Now
                    <FaArrowRight className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:translate-x-2" aria-hidden="true" />
                  </span>
                </button>
              </Link>
            </motion.div>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap px-4"
            >
              {[
                { label: 'Browse Performances', href: '/performances' },
                { label: 'Oscar 2026 Nominees', href: '/oscars-2026' },
                { label: 'About ActorRating', href: '/about' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-1.5 text-xs sm:text-sm text-[#666] hover:text-[#FFD700] transition-colors duration-200"
                >
                  <span className="w-1 h-1 rounded-full bg-[#FFD700] opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  {link.label}
                </Link>
              ))}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STATS STRIP ─────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: '570K+', label: 'Performances' },
    { value: '208K+', label: 'Actors' },
    { value: '5',     label: 'Rating Dimensions' },
    { value: '●',     label: 'Growing Daily', live: true },
  ];
  return (
    <div className="relative z-10 border-y" style={{ borderColor: 'rgba(255,215,0,0.08)', background: '#050505' }}>
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="relative flex flex-col items-center justify-center py-6 sm:py-8">
            {i > 0 && (
              <div className="absolute left-0 top-[20%] h-[60%] w-px" style={{ background: 'rgba(255,215,0,0.08)' }} />
            )}
            {s.live ? (
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" style={{ boxShadow: '0 0 6px rgba(255,215,0,0.7)' }} />
                <span className="text-xl sm:text-2xl font-extrabold" style={GOLD_TEXT}>Live</span>
              </div>
            ) : (
              <span className="text-2xl sm:text-3xl font-extrabold mb-1" style={GOLD_TEXT}>{s.value}</span>
            )}
            <span className="text-[10px] sm:text-xs text-[#555] font-medium tracking-[0.15em] uppercase">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OSCAR BANNER ─────────────────────────────────────────────────────────────

function OscarBanner() {
  return (
    <div className="relative z-10 bg-black py-10 sm:py-14 md:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link href="/oscars-2026" className="block group">
          <div
            className="relative p-7 sm:p-10 md:p-12 rounded-[2rem] overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_60px_rgba(255,215,0,0.15)]"
            style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)' }} />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,215,0,0.1)', border: '2px solid rgba(255,215,0,0.3)', boxShadow: '0 0 30px rgba(255,215,0,0.15)' }}>
                  <FaTrophy className="w-7 h-7 text-[#FFD700]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FFD700] opacity-60 mb-1">Oscars Season 2026</p>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white" style={CINZEL}>
                    <span style={GOLD_TEXT}>Oscar 2026</span>
                    <span className="hidden sm:inline"> Acting Performances</span>
                    <span className="sm:hidden"> Nominees</span>
                  </h3>
                  <p className="text-sm text-[#a3a3a3] mt-1">Rate this year&apos;s nominees before the show.</p>
                </div>
              </div>
              <button
                className="flex-shrink-0 flex items-center gap-3 px-7 sm:px-9 py-3.5 sm:py-4 rounded-full text-black text-sm sm:text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_24px_rgba(255,215,0,0.35)]"
                style={{ background: GOLD }}
                onClick={(e) => { e.preventDefault(); window.location.href = '/oscars-2026'; }}
              >
                Rate Nominees
                <FaArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-[#FFD700]/6 to-transparent rounded-tl-[80px] pointer-events-none" />
          </div>
        </Link>
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

// ─── LEADERBOARD — sorted by actual rating, always-visible Rate buttons ───────

function LeaderboardSection({ initialPerformances }: { initialPerformances?: EnrichedPerformance[] }) {
  const { isMobile, prefersReducedMotion } = useDevice();
  const [performancesData, setPerformancesData] = useState<Map<string, EnrichedPerformance>>(() =>
    performancesMapFromEnriched(initialPerformances)
  );
  const [isLoading, setIsLoading] = useState(true);
  // Start with original order; reorder once ratings arrive
  const [sortedPerfs, setSortedPerfs] = useState(PERFORMANCES);

  useEffect(() => {
    (async () => {
      try {
        const targets = PERFORMANCES.map(h => ({ actor: h.actor, movie: h.movie }));
        const res = await fetch(buildByLookupUrl(targets), { cache: "force-cache" });
        if (!res.ok) return;
        const data = await res.json();
        const map = new Map<string, EnrichedPerformance>();
        data.performances?.forEach?.((p: EnrichedPerformance) => {
          if (p.actor?.name && p.movie?.title) map.set(`${p.actor.name}:${p.movie.title}`, p);
        });
        setPerformancesData(map);

        // Sort by rating descending (unrated go to bottom)
        const sorted = [...PERFORMANCES].sort((a, b) => {
          const aRating = map.get(`${a.actor}:${a.movie}`)?.averageRating ?? 0;
          const bRating = map.get(`${b.actor}:${b.movie}`)?.averageRating ?? 0;
          return bRating - aRating;
        });
        setSortedPerfs(sorted);
      } catch (_) { /* silent */ } finally { setIsLoading(false); }
    })();
  }, []);

  const rankColors = [
    { bg: 'linear-gradient(135deg, #FFE55C, #FFD700)', color: '#000', shadow: '0 0 16px rgba(255,215,0,0.6)' },
    { bg: 'linear-gradient(135deg, #e8e8e8, #b0b0b0)', color: '#000', shadow: '0 0 10px rgba(200,200,200,0.4)' },
    { bg: 'linear-gradient(135deg, #cd9b5a, #9a6b35)', color: '#fff', shadow: '0 0 10px rgba(205,155,90,0.4)' },
  ];

  return (
    <div id="leaderboard" className="relative z-10 bg-black py-20 sm:py-28 md:py-32 lg:py-40">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,200,0,0.2) 0%, transparent 70%)', filter: isMobile ? 'blur(80px)' : 'blur(150px)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <SectionHeading eyebrow="Community Rankings" goldWord="Top" rest="Rated" />

        {/* Desktop table header */}
        <div className="hidden sm:grid grid-cols-[48px_1fr_80px_120px_130px] gap-4 items-center px-6 pb-3 mb-1">
          {['#', 'Performance', 'Year', 'Rating', ''].map((h, i) => (
            <span key={i} className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#333]"
              style={{ textAlign: i >= 2 ? 'center' : 'left' }}>{h}</span>
          ))}
        </div>

        <div className="rounded-[2rem] overflow-hidden" style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}>
          {sortedPerfs.map((p, displayIndex) => {
            const key = `${p.actor}:${p.movie}`;
            const perfData = performancesData.get(key);
            const avg = perfData?.averageRating;
            const cnt = perfData?.ratingCount ?? 0;
            const rating =
              avg != null && avg > 0 && cnt > 0 ? (avg / 10).toFixed(1) : null;
            const count = cnt;

            let href = '/performances';
            if (perfData?.actor && perfData?.movie) {
              const aSlug = perfData.actor.slug || perfData.actorId;
              const mSlug = perfData.movie.slug || perfData.movieId;
              href = `/rate/${mSlug}/${aSlug}`;
            }

            const rankStyle = rankColors[displayIndex] || null;
            const isLast = displayIndex === sortedPerfs.length - 1;

            const reduceMotion = isMobile || prefersReducedMotion;
            return (
              <motion.div
                key={`${p.actor}-${p.movie}`}
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                animate={reduceMotion ? { opacity: 1, y: 0 } : undefined}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: reduceMotion ? '0px' : '-30px' }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.25, delay: displayIndex * 0.04 }}
              >
                <div
                  className={`grid grid-cols-[40px_1fr] sm:grid-cols-[48px_1fr_80px_120px_130px] gap-3 sm:gap-4 items-center px-5 sm:px-7 py-5 sm:py-6 transition-all duration-200 ${!isLast ? 'border-b' : ''}`}
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-start">
                    {rankStyle ? (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                        style={{ background: rankStyle.bg, color: rankStyle.color, boxShadow: rankStyle.shadow }}
                      >{displayIndex + 1}</div>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#444]"
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>{displayIndex + 1}</div>
                    )}
                  </div>

                  {/* Actor + Film */}
                  <div className="min-w-0 flex items-center gap-4 sm:gap-5">
                    {/* Actor avatar — data comes from by-lookup API */}
                    <ActorAvatar
                      name={p.actor}
                      imageUrl={upgradeActorImageRes(perfData?.actor?.imageUrl)}
                      size="lg"
                      className="w-14 h-14 rounded-2xl sm:w-20 sm:h-20"
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                        <span className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight" style={CINZEL}>
                          {p.actor}
                        </span>
                        <span className="sm:hidden text-xs text-[#444]">· {p.year}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm text-[#FFD700] opacity-80 truncate">{p.movie}</span>
                        {/* Mobile: show rating inline */}
                        {!isLoading && rating && (
                          <span className="sm:hidden flex items-center gap-1 text-xs text-[#888]">
                            <FaStar className="w-2.5 h-2.5 text-[#FFD700]" />{rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Year */}
                  <div className="hidden sm:flex justify-center">
                    <span className="text-sm text-[#444]">{p.year}</span>
                  </div>

                  {/* Rating */}
                  <div className="hidden sm:flex flex-col items-center">
                    {isLoading ? (
                      <div className="w-12 h-5 rounded bg-[#1a1a1a] animate-pulse" />
                    ) : rating ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <FaStar className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span className="text-base sm:text-lg font-bold text-white">{rating}</span>
                        </div>
                        {count > 0 && (
                          <span className="text-[10px] text-[#444] mt-0.5">{count.toLocaleString()} ratings</span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-[#333]">No ratings yet</span>
                    )}
                  </div>

                  {/* Rate button — ALWAYS VISIBLE */}
                  <div className="hidden sm:flex justify-end">
                    <Link href={href}>
                      <button
                        className="px-5 py-2 rounded-full text-xs font-bold text-black transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_16px_rgba(255,215,0,0.35)]"
                        style={{ background: GOLD }}
                        aria-label={`Rate ${p.actor} in ${p.movie}`}
                      >
                        Rate Now
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Mobile rate button row */}
                <div className="sm:hidden px-5 pb-4">
                  <Link href={href}>
                    <button
                      className="w-full py-2.5 rounded-full text-xs font-bold text-black transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: GOLD }}
                      aria-label={`Rate ${p.actor} in ${p.movie}`}
                    >
                      Rate This Performance
                    </button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
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

// ─── 5 RATING CRITERIA SECTION ────────────────────────────────────────────────

const CRITERIA = [
  { num: "01", title: "Emotional Range & Depth",      sub: "The whole spread — sad, happy, angry, soft. Sometimes all in one scene." },
  { num: "02", title: "Character Believability",       sub: "Do you stop thinking \"that's an actor\"? That's a good sign." },
  { num: "03", title: "Technical Skill & Authenticity", sub: "Voice, body, accent, movement. The skill under the surface." },
  { num: "04", title: "Screen Presence & Impact",      sub: "They own the screen — even when they barely move." },
  { num: "05", title: "Chemistry & Interaction",       sub: "Strong work makes everyone else look better too." },
];

function RatingCriteriaSection() {
  const { isMobile, prefersReducedMotion } = useDevice();
  const reduceMotion = isMobile || prefersReducedMotion;
  return (
    <div className="relative z-10 py-20 sm:py-28 md:py-32" style={{ background: '#040404' }}>
      <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)' }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20">
        {/* Header */}
        <div className="mb-14 sm:mb-20">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FFD700] opacity-60 mb-4">How We Rate</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight" style={CINZEL}>
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
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1.5 leading-tight group-hover:text-[#FFD700] transition-colors duration-200" style={CINZEL}>
                    {c.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#555] leading-relaxed">{c.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 flex justify-center">
          <Link href="/performances">
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

function HowItWorksSection() {
  const router = useRouter();
  const { isMobile, prefersReducedMotion } = useDevice();

  const steps = [
    { number: "01", icon: FaSearch,    title: "Find a Performance",   description: "Search 570,000+ acting roles from film history — from early silent stars to this year's Oscar nominees." },
    { number: "02", icon: FaStar,      title: "Rate in 2 Minutes",    description: "One quick slider, or break it down into 5 parts: emotion, skill, realism, impact, and chemistry." },
    { number: "03", icon: FaChartLine, title: "See the Consensus",    description: "See how your score lines up with the group average. Find what people worldwide call a stand-out performance." },
  ];

  return (
    <div className="relative z-10 bg-black py-20 sm:py-28 md:py-32 lg:py-40">
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
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4 leading-tight" style={CINZEL}>{step.title}</h3>
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
            href="/performances"
            onMouseEnter={() => { prefetchPerformancesPageData(); router.prefetch('/performances'); }}
          >
            <button
              className="group inline-flex items-center gap-4 px-10 sm:px-16 py-5 sm:py-6 rounded-full text-black text-base sm:text-xl font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]"
              style={{ background: GOLD }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Start Rating Now
              <FaArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-2" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── WHY ACTORRATING ──────────────────────────────────────────────────────────

function FeaturesSection() {
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
    <div className="relative z-10 bg-black py-20 sm:py-28 md:py-32 lg:py-40">
      <div className="absolute inset-0 opacity-15 pointer-events-none">
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
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight" style={CINZEL}>{f.title}</h3>
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
    <div className="relative z-10 bg-black py-16 sm:py-20 md:py-24">
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight" style={CINZEL}>
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

function CommunityCta() {
  const { isMobile, prefersReducedMotion } = useDevice();
  const reduceMotion = isMobile || prefersReducedMotion;
  const stats = [
    { value: '570K+', label: 'Performances' },
    { value: '208K+', label: 'Actors' },
    { live: true,     label: 'Growing Daily' },
  ];

  return (
    <div className="relative z-10 bg-black py-24 sm:py-32 md:py-40 lg:py-48">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-15"
        style={{ width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,0,0.25) 0%, transparent 65%)', filter: isMobile ? 'blur(60px)' : 'blur(120px)' }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-6">Join the Community</p>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight" style={CINZEL}>
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

        <div className="flex items-center justify-center gap-8 sm:gap-14 mb-12">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              {s.live ? (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" style={{ boxShadow: '0 0 8px rgba(255,215,0,0.8)' }} />
                  <span className="text-xl sm:text-2xl font-extrabold" style={GOLD_TEXT}>Live</span>
                </div>
              ) : (
                <div className="text-xl sm:text-2xl font-extrabold mb-1" style={GOLD_TEXT}>{(s as any).value}</div>
              )}
              <div className="text-[10px] sm:text-xs text-[#555] tracking-[0.15em] uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signin">
            <button
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full text-black text-base sm:text-lg font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]"
              style={{ background: GOLD }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Continue with Email
            </button>
          </Link>
          <Link
            href="/performances"
            className="px-8 sm:px-10 py-4 sm:py-5 rounded-full text-sm sm:text-base font-semibold text-[#888] hover:text-white transition-all duration-200"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; prefetchPerformancesPageData(); }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#888'; }}
          >
            Browse First
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────

export default function HomePageClient({
  initialLeaderboardPerformances = [],
}: {
  initialLeaderboardPerformances?: EnrichedPerformance[];
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  return (
    <>
      <HeroSection />
      <StatsStrip />
      <OscarBanner />
      <LeaderboardSection initialPerformances={initialLeaderboardPerformances} />
      <RatingCriteriaSection />
      <HowItWorksSection />
      <FeaturesSection />
      <AboutTeaser />
      <CommunityCta />
    </>
  );
}
