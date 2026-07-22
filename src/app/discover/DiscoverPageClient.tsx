"use client";

/**
 * Discover — search + browse hub (same poster-rail language as the landing).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import { HomeLayout } from "@/components/layout";
import { SignedInLayout } from "@/components/layout/SignedInLayout";
import { useUser } from "@/components/providers/SessionProvider";
import { SearchBar } from "@/components/SearchBar";
import {
  PosterRail,
  StaticPosterRail,
  ActorRail,
  orderByTargets,
  type RailActor,
} from "@/components/poster/PosterRails";
import type { EnrichedPerformance } from "@/lib/performances-by-lookup";
import {
  POPULAR_RIGHT_NOW_TARGETS,
  LEGENDARY_PERFORMANCE_TARGETS,
  RECENT_FAVORITES_TARGETS,
  allLandingRailLookupTargets,
  buildByLookupUrl,
} from "@/lib/performances-page-targets";
import { familiarFacesFallbackActors } from "@/lib/familiar-faces-fallback";

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)";
const DISPLAY: React.CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
};
const SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
};

const CACHE_KEY = "performances-page-data";
const ACTORS_CACHE_KEY = "discover-familiar-faces";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_ACTORS = familiarFacesFallbackActors();

interface DiscoverPageClientProps {
  initialPopular?: EnrichedPerformance[];
  initialLegendary?: EnrichedPerformance[];
  initialRecent?: EnrichedPerformance[];
  initialActors?: RailActor[];
}

export function DiscoverPageClient({
  initialPopular = [],
  initialLegendary = [],
  initialRecent = [],
  initialActors = [],
}: DiscoverPageClientProps) {
  const user = useUser();
  const hasInitial =
    initialPopular.length > 0 ||
    initialLegendary.length > 0 ||
    initialRecent.length > 0;

  const [popular, setPopular] =
    useState<EnrichedPerformance[]>(initialPopular);
  const [legendary, setLegendary] =
    useState<EnrichedPerformance[]>(initialLegendary);
  const [recent, setRecent] = useState<EnrichedPerformance[]>(initialRecent);
  const [actors, setActors] = useState<RailActor[]>(
    initialActors.length > 0 ? initialActors : FALLBACK_ACTORS,
  );

  useEffect(() => {
    if (hasInitial) {
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: { popular, legendary, recent },
            timestamp: Date.now(),
          }),
        );
      } catch {
        /* ignore */
      }
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS && !cancelled) {
              // Support both new and legacy cache shapes
              if (data.popular || data.legendary) {
                setPopular(data.popular ?? []);
                setLegendary(data.legendary ?? data.iconic ?? []);
                setRecent(data.recent ?? []);
                return;
              }
              if (data.recent || data.iconic) {
                setRecent(data.recent ?? []);
                setLegendary(data.iconic ?? []);
                return;
              }
            }
          } catch {
            /* invalid cache */
          }
        }

        const targets = allLandingRailLookupTargets();
        const res = await fetch(buildByLookupUrl(targets), {
          cache: "force-cache",
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const rows = (json.performances as EnrichedPerformance[]) ?? [];
        const nextPopular = orderByTargets(rows, POPULAR_RIGHT_NOW_TARGETS);
        const nextLegendary = orderByTargets(
          rows,
          LEGENDARY_PERFORMANCE_TARGETS,
        );
        const nextRecent = orderByTargets(rows, RECENT_FAVORITES_TARGETS);
        if (cancelled) return;
        setPopular(nextPopular);
        setLegendary(nextLegendary);
        setRecent(nextRecent);
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: {
              popular: nextPopular,
              legendary: nextLegendary,
              recent: nextRecent,
            },
            timestamp: Date.now(),
          }),
        );
      } catch {
        /* silent — static rails fill gaps */
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [hasInitial]);

  useEffect(() => {
    if (initialActors.length > 0) {
      setActors(initialActors);
      try {
        sessionStorage.setItem(
          ACTORS_CACHE_KEY,
          JSON.stringify({ data: initialActors, timestamp: Date.now() }),
        );
      } catch {
        /* ignore */
      }
      return;
    }

    let cancelled = false;
    const loadActors = async () => {
      try {
        const cached = sessionStorage.getItem(ACTORS_CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (
              Date.now() - timestamp < CACHE_TTL_MS &&
              Array.isArray(data) &&
              data.length > 0 &&
              !cancelled
            ) {
              setActors(data);
              return;
            }
          } catch {
            /* invalid cache */
          }
        }

        const res = await fetch("/api/actors/popular?limit=24", {
          cache: "force-cache",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as RailActor[];
        if (!Array.isArray(data) || data.length === 0 || cancelled) return;
        setActors(data);
        sessionStorage.setItem(
          ACTORS_CACHE_KEY,
          JSON.stringify({ data, timestamp: Date.now() }),
        );
      } catch {
        /* keep fallback faces */
      }
    };

    loadActors();
    return () => {
      cancelled = true;
    };
  }, [initialActors]);

  const popularItems =
    popular.length === POPULAR_RIGHT_NOW_TARGETS.length
      ? null
      : POPULAR_RIGHT_NOW_TARGETS;
  const legendaryItems =
    legendary.length === LEGENDARY_PERFORMANCE_TARGETS.length
      ? null
      : LEGENDARY_PERFORMANCE_TARGETS;
  const recentItems =
    recent.length === RECENT_FAVORITES_TARGETS.length
      ? null
      : RECENT_FAVORITES_TARGETS;

  const body = (
    <div className="min-h-screen bg-black w-full" style={SANS}>
      {/* Compact discover header */}
      <header className="px-5 sm:px-8 lg:px-10 pt-[6.5rem] sm:pt-[7.5rem] pb-8 sm:pb-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-3">
            Discover
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight leading-[1.15]"
            style={DISPLAY}
          >
            Find a performance to rate
          </h1>
          <p className="mt-3 text-[15px] sm:text-base text-zinc-500 leading-relaxed max-w-xl mx-auto">
            Search any actor or film — or browse curated turns below.
          </p>
          <div className="mt-7 sm:mt-8 max-w-xl mx-auto text-left relative z-30">
            {/* Dark shell so SearchBar dropdown suggestions paint correctly */}
            <div
              className="relative rounded-[2rem] border border-white/[0.06] bg-[#1a1a1a] overflow-hidden"
              style={{
                boxShadow:
                  "0 20px 50px -18px rgba(0,0,0,0.85), inset 0 1px 0 0 rgba(255,255,255,0.06)",
              }}
            >
              <SearchBar
                placeholder="Search actors and films…"
                showClear
                showSuggestions
                className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:text-base sm:[&_input]:text-lg [&_input]:min-h-[52px]"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="pb-6 sm:pb-10">
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

        <ActorRail
          title="Familiar Faces"
          subtitle="Tap a face to open their page"
          actors={actors}
        />

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
          <StaticPosterRail title="Recent Favorites" items={recentItems} />
        )}
      </div>

      {/* Simple CTA */}
      <section className="px-5 sm:px-8 lg:px-10 pb-20 sm:pb-28">
        <div className="max-w-xl mx-auto text-center border-t border-white/[0.08] pt-10 sm:pt-12">
          <h2
            className="text-2xl sm:text-[1.75rem] font-bold text-white tracking-tight"
            style={DISPLAY}
          >
            Know who floored you?
          </h2>
          <p className="mt-3 text-zinc-500 text-[15px] leading-relaxed">
            Search above, or jump straight into rating.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/search" className="inline-flex">
              <span
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-md text-black text-[15px] font-bold min-h-[44px] transition-transform hover:scale-[1.02]"
                style={{ background: GOLD }}
              >
                Search everything
                <FaArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-md text-sm font-semibold text-zinc-400 hover:text-white border border-white/10 min-h-[44px] transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );

  return user ? (
    <SignedInLayout>{body}</SignedInLayout>
  ) : (
    <HomeLayout>{body}</HomeLayout>
  );
}
