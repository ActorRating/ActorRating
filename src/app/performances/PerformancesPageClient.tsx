"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { SCROLL_REVEAL_VIEWPORT, SCROLL_REVEAL_TRANSITION } from "@/lib/scroll-reveal"
import { HomeLayout } from "@/components/layout"
import { SignedInLayout } from "@/components/layout/SignedInLayout"
import { useUser } from "@/components/providers/SessionProvider"
import { FaStar } from "react-icons/fa"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { getActorUrl, getMovieUrl, getRateUrl } from "@/lib/slugHelper"
import { SearchBar } from "@/components/SearchBar"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { RECENT_PERFORMANCE_TARGETS, ICONIC_PERFORMANCE_TARGETS, buildByLookupUrl } from "@/lib/performances-page-targets"
import type { EnrichedPerformance } from "@/lib/performances-by-lookup"
import { ActorHeadshot } from "@/components/ui/ActorHeadshot"
import { MoviePoster } from "@/components/ui/MoviePoster"
import { upgradeActorImageRes } from "@/lib/tmdb"

interface PerformancesPageClientProps {
  initialRecent?: EnrichedPerformance[]
  initialIconic?: EnrichedPerformance[]
}

export function PerformancesPageClient({
  initialRecent = [],
  initialIconic = [],
}: PerformancesPageClientProps) {
  const user = useUser()
  const reduceMotion = useReducedMotion() === true
  const hasInitialData = initialRecent.length > 0 || initialIconic.length > 0
  const [recentPerformances, setRecentPerformances] = useState<EnrichedPerformance[]>(initialRecent)
  const [iconicPerformances, setIconicPerformances] = useState<EnrichedPerformance[]>(initialIconic)
  const [loading, setLoading] = useState(!hasInitialData)
  const [activeRecentCard, setActiveRecentCard] = useState(0)
  const [activeIconicCard, setActiveIconicCard] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])

  useEffect(() => {
    if (hasInitialData) {
      // Optional: hydrate sessionStorage so prefetch/cache stays in sync
      try {
        sessionStorage.setItem(
          "performances-page-data",
          JSON.stringify({
            data: { recent: recentPerformances, iconic: iconicPerformances },
            timestamp: Date.now(),
          })
        )
      } catch {
        // ignore
      }
      return
    }

    let cancelled = false
    const cacheKey = "performances-page-data"

    const fetchPerformances = async () => {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached)
            if (Date.now() - timestamp < 5 * 60 * 1000 && !cancelled) {
              setRecentPerformances(data.recent ?? [])
              setIconicPerformances(data.iconic ?? [])
              setLoading(false)
              return
            }
          } catch {
            // invalid cache
          }
        }

        const allTargets = [...RECENT_PERFORMANCE_TARGETS, ...ICONIC_PERFORMANCE_TARGETS]
        const response = await fetch(buildByLookupUrl(allTargets), {
          cache: "force-cache",
        })

        if (!response.ok) {
          if (!cancelled) {
            setRecentPerformances([])
            setIconicPerformances([])
            setLoading(false)
          }
          return
        }

        const data = await response.json()
        const recent = RECENT_PERFORMANCE_TARGETS.map((target) =>
          data.performances?.find((p: EnrichedPerformance) => p.actor?.name === target.actor && p.movie?.title === target.movie)
        ).filter((p: EnrichedPerformance | undefined): p is EnrichedPerformance => p !== undefined)
        const iconic = ICONIC_PERFORMANCE_TARGETS.map((target) =>
          data.performances?.find((p: EnrichedPerformance) => p.actor?.name === target.actor && p.movie?.title === target.movie)
        ).filter((p: EnrichedPerformance | undefined): p is EnrichedPerformance => p !== undefined)

        if (!cancelled) {
          setRecentPerformances(recent)
          setIconicPerformances(iconic)
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: { recent, iconic }, timestamp: Date.now() }))
        }
      } catch {
        if (!cancelled) {
          setRecentPerformances([])
          setIconicPerformances([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPerformances()
    return () => {
      cancelled = true
    }
  }, [hasInitialData])

  useEffect(() => {
    const container = document.querySelector(".recent-scroll-container")
    if (!container) return
    const updateCardDepth = () => {
      const isDesktop = window.innerWidth >= 1024
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      const cards = container.querySelectorAll(".recent-scroll-container > div")
      let closestIndex = 0
      let closestDistance = Infinity
      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
        const el = card as HTMLElement
        if (isDesktop) {
          const maxDistance = containerRect.width / 2
          const norm = Math.min(distance / maxDistance, 1)
          el.style.transform = `scale(${1 - norm * 0.08}) translateY(${norm * 10}px)`
          el.style.opacity = `${1 - norm * 0.4}`
        } else {
          el.style.transform = "scale(1) translateY(0)"
          el.style.opacity = "1"
        }
      })
      setActiveRecentCard(closestIndex)
    }
    container.addEventListener("scroll", updateCardDepth, { passive: true })
    window.addEventListener("resize", updateCardDepth, { passive: true })
    updateCardDepth()
    return () => {
      container.removeEventListener("scroll", updateCardDepth)
      window.removeEventListener("resize", updateCardDepth)
    }
  }, [recentPerformances.length])

  useEffect(() => {
    const container = document.querySelector(".iconic-scroll-container")
    if (!container) return
    const updateCardDepth = () => {
      const isDesktop = window.innerWidth >= 1024
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      const cards = container.querySelectorAll(".iconic-scroll-container > div")
      let closestIndex = 0
      let closestDistance = Infinity
      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)
        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
        const el = card as HTMLElement
        if (isDesktop) {
          const maxDistance = containerRect.width / 2
          const norm = Math.min(distance / maxDistance, 1)
          el.style.transform = `scale(${1 - norm * 0.08}) translateY(${norm * 10}px)`
          el.style.opacity = `${1 - norm * 0.4}`
        } else {
          el.style.transform = "scale(1) translateY(0)"
          el.style.opacity = "1"
        }
      })
      setActiveIconicCard(closestIndex)
    }
    container.addEventListener("scroll", updateCardDepth, { passive: true })
    window.addEventListener("resize", updateCardDepth, { passive: true })
    updateCardDepth()
    return () => {
      container.removeEventListener("scroll", updateCardDepth)
      window.removeEventListener("resize", updateCardDepth)
    }
  }, [iconicPerformances.length])

  const LayoutWrapper = user ? SignedInLayout : HomeLayout

  return (
    <LayoutWrapper>
      <div
        className="relative z-10 bg-black pt-20 pb-20 sm:pt-24 sm:pb-24 md:pb-32"
        style={{ willChange: "auto" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
        </div>

        <div className="w-full relative" style={{ maxWidth: "1280px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
          <div className="text-center mb-8 sm:mb-10 px-4 sm:px-0">
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-white mb-5">
              570K+ Performances · 208K+ Actors
            </p>
            <h1
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 sm:mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 40px rgba(255,215,0,0.3))',
                }}
              >
                Discover
              </span>
            </h1>
            <div
              className="h-[2px] mx-auto mb-6"
              style={{
                width: '160px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                boxShadow: '0 0 20px rgba(255,165,0,0.6), 0 0 40px rgba(255,165,0,0.3)',
              }}
            />
            <p className="text-base xs:text-lg sm:text-xl md:text-2xl text-[#a0a0a0] max-w-3xl mx-auto font-light leading-relaxed">
              Search and rate acting performances from cinema&apos;s finest
            </p>
          </div>

          <div className="mb-16 sm:mb-20 md:mb-24 lg:mb-28 max-w-3xl mx-auto px-2 sm:px-0">
            <div className="relative group">
              <div
                className="relative rounded-[2rem] border border-transparent bg-[#1a1a1a] backdrop-blur-2xl overflow-hidden transition-all duration-300"
                style={{
                  boxShadow: `0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 15px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)`,
                  transform: "translateY(-4px) perspective(1000px) rotateX(1deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <SearchBar
                  placeholder="Search for actors and movies..."
                  showClear
                  className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-5 [&_input]:text-base sm:[&_input]:text-lg [&_input]:min-h-[56px]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12">
            <motion.div
              className="col-span-12 mb-20 sm:mb-32 md:mb-40 lg:mb-48"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={reduceMotion ? { once: true } : SCROLL_REVEAL_VIEWPORT}
              transition={reduceMotion ? { duration: 0 } : SCROLL_REVEAL_TRANSITION}
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16 px-4 sm:px-0">
                <h3 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-5 tracking-tight" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                  <span style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 40px rgba(255,215,0,0.3))" }}>Trending</span> Now
                </h3>
                <div className="h-[2px] mx-auto mb-5" style={{ width: '140px', background: 'linear-gradient(90deg, transparent, rgba(255,165,0,1), transparent)', boxShadow: '0 0 16px rgba(255,165,0,0.5)' }} />
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl text-[#a0a0a0] max-w-4xl mx-auto font-light leading-relaxed px-4">
                  Latest performances capturing global attention
                </p>
              </div>

              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="recent-loading"
                    className="flex justify-center py-16 min-h-[min(42vh,420px)] items-center"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { ...SCROLL_REVEAL_TRANSITION, duration: 0.22 }}
                  >
                    <BouncingBallsLoader size="md" color="#FFD700" showText={false} />
                  </motion.div>
                ) : recentPerformances.length > 0 ? (
                  <motion.div
                    key="recent-carousel"
                    className="relative"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0 } : SCROLL_REVEAL_TRANSITION}
                  >
                  <div className="relative -mx-4 sm:-mx-0">
                    <div className="overflow-hidden" style={isDesktop ? { maskImage: "linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)" } : {}}>
                      <div className="recent-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)] lg:px-[20vw] xl:px-[25vw]">
                        {recentPerformances.map((performance, index) => (
                          <div
                            key={performance.id}
                            className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw] lg:max-w-md xl:max-w-md snap-center lg:cursor-pointer"
                            style={{ transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}
                            onClick={() => {
                              if (window.innerWidth >= 1024) {
                                const element = document.querySelectorAll(".recent-scroll-container > div")[index] as HTMLElement
                                if (element) element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                              }
                            }}
                          >
                            <LandingPageCard performance={performance} index={index} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center items-center mt-8" style={{ gap: "4px" }}>
                    {recentPerformances.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const container = document.querySelector(".recent-scroll-container")
                          if (container) {
                            const cards = container.querySelectorAll(".recent-scroll-container > div")
                            const targetCard = cards[index] as HTMLElement
                            if (targetCard) targetCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                          }
                        }}
                        style={{ padding: "10px 4px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}
                        aria-label={`Go to card ${index + 1}`}
                      >
                        <div style={{ width: index === activeRecentCard ? "20px" : "8px", height: "8px", backgroundColor: index === activeRecentCard ? "#FFD700" : "rgba(115, 115, 115, 0.4)", borderRadius: "9999px", transition: "all 0.3s ease" }} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="recent-empty"
                  className="text-center py-12 px-4"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={reduceMotion ? { duration: 0 } : { ...SCROLL_REVEAL_TRANSITION, duration: 0.35 }}
                >
                  <p className="text-xl sm:text-2xl text-[#a3a3a3]">No recent performances found. Check back soon!</p>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>

            <motion.div
              className="col-span-12 mb-16 sm:mb-20"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={reduceMotion ? { once: true } : SCROLL_REVEAL_VIEWPORT}
              transition={reduceMotion ? { duration: 0 } : { ...SCROLL_REVEAL_TRANSITION, delay: 0.07 }}
            >
              <div className="text-center mb-10 sm:mb-12 md:mb-16 px-4 sm:px-0">
                <h3 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-5 tracking-tight" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                  <span style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 40px rgba(255,215,0,0.3))" }}>Iconic</span> Classics
                </h3>
                <div className="h-[2px] mx-auto mb-5" style={{ width: '140px', background: 'linear-gradient(90deg, transparent, rgba(255,165,0,1), transparent)', boxShadow: '0 0 16px rgba(255,165,0,0.5)' }} />
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl text-[#a0a0a0] max-w-4xl mx-auto font-light leading-relaxed px-4">
                  Legendary performances that defined cinema
                </p>
              </div>

              {iconicPerformances.length > 0 ? (
                <div className="relative">
                  <div className="relative -mx-4 sm:-mx-0">
                    <div className="overflow-hidden" style={isDesktop ? { maskImage: "linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)" } : {}}>
                      <div className="iconic-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)] lg:px-[20vw] xl:px-[25vw]">
                        {iconicPerformances.map((performance, index) => (
                          <div
                            key={performance.id}
                            className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw] lg:max-w-md xl:max-w-md snap-center transition-all duration-300 ease-out lg:cursor-pointer"
                            onClick={() => {
                              if (window.innerWidth >= 1024) {
                                const element = document.querySelectorAll(".iconic-scroll-container > div")[index] as HTMLElement
                                if (element) element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                              }
                            }}
                          >
                            <LandingPageCard performance={performance} index={index} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center items-center mt-8" style={{ gap: "4px" }}>
                    {iconicPerformances.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const container = document.querySelector(".iconic-scroll-container")
                          if (container) {
                            const cards = container.querySelectorAll(".iconic-scroll-container > div")
                            const targetCard = cards[index] as HTMLElement
                            if (targetCard) targetCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                          }
                        }}
                        style={{ padding: "10px 4px", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}
                        aria-label={`Go to card ${index + 1}`}
                      >
                        <div style={{ width: index === activeIconicCard ? "20px" : "8px", height: "8px", backgroundColor: index === activeIconicCard ? "#FFD700" : "rgba(115, 115, 115, 0.4)", borderRadius: "9999px", transition: "all 0.3s ease" }} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="min-h-[min(38vh,360px)] sm:min-h-[380px]" aria-hidden />
              ) : (
                <div className="text-center py-12 px-4">
                  <p className="text-xl sm:text-2xl text-[#a3a3a3]">Iconic performances will appear here once added to the database.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}

function LandingPageCard({ performance, index }: { performance: EnrichedPerformance; index: number }) {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const actorUrl = getActorUrl({
    id: performance.actorId,
    name: performance.actor.name,
    slug: performance.actor.slug || null,
  })
  const movieUrl = getMovieUrl({
    id: performance.movieId,
    title: performance.movie.title,
    year: performance.movie.year,
    slug: performance.movie.slug || null,
  })
  const rateUrl =
    performance.actor && performance.movie
      ? getRateUrl(
          { id: performance.actorId, name: performance.actor.name, slug: performance.actor.slug || null },
          { id: performance.movieId, title: performance.movie.title, year: performance.movie.year, slug: performance.movie.slug || null }
        )
      : `/rate?actor=${performance.actorId}&movie=${performance.movieId}`
  const hasRating = performance.ratingCount && performance.ratingCount > 0 && performance.averageRating != null && performance.averageRating > 0
  const rating = hasRating && performance.averageRating != null ? (performance.averageRating / 10).toFixed(1) : null
  const character = performance.character || "—"

  const handleRatePrefetch = () => router.prefetch(rateUrl)

  // On mobile/touch: prefetch rate page when card enters viewport (no hover)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof window === "undefined" || !window.IntersectionObserver) return
    const isTouchOrNarrow = window.matchMedia("(hover: none)").matches || window.innerWidth < 1024
    if (!isTouchOrNarrow) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          router.prefetch(rateUrl)
          observer.disconnect()
        }
      },
      { rootMargin: "100px", threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rateUrl, router])

  return (
    <div ref={cardRef} className="group relative" onMouseEnter={handleRatePrefetch}>
      <div
        className="relative h-full p-6 sm:p-8 md:p-10 lg:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
        style={{ boxShadow: "0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 15px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)" }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex-1">
            <div className="flex justify-center items-end gap-4 sm:gap-5 mb-6">
              <ActorHeadshot
                name={performance.actor.name}
                imageUrl={upgradeActorImageRes(performance.actor.imageUrl)}
                size="lg"
                loading="lazy"
              />
              <MoviePoster
                title={performance.movie.title}
                posterUrl={performance.movie.posterUrl}
                size="lg"
                loading="lazy"
              />
            </div>
            <div className="flex items-center justify-between mb-6">
              {rating ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                  <FaStar className="w-6 h-6 text-[#FFD700]" />
                  <span className="text-3xl font-bold text-[#FFD700]" style={{ fontFamily: "var(--font-geist-sans), sans-serif", fontVariantNumeric: "tabular-nums" }}>{rating}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
                  <FaStar className="w-6 h-6 text-[#666]" />
                  <span className="text-3xl font-bold text-[#a3a3a3]">N/A</span>
                </div>
              )}
              <div className="text-[#a3a3a3] text-base font-medium">{performance.movie.year}</div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-cinzel), serif" }}>
              <Link href={actorUrl} className="group/actor inline-flex items-center gap-1.5 hover:text-[#FFD700] transition-colors duration-200">
                {performance.actor.name}
                <ArrowUpRight className="w-4 h-4 opacity-40 group-hover/actor:opacity-100 transition-opacity duration-200 flex-shrink-0" />
              </Link>
            </h3>
            <div className="mb-6">
              <Link href={movieUrl} className="group/movie inline-flex items-center gap-1.5 text-lg text-[#FFD700] font-semibold tracking-wide hover:text-[#FFE55C] transition-colors duration-200">
                {performance.movie.title}
                <ArrowUpRight className="w-4 h-4 opacity-50 group-hover/movie:opacity-100 transition-opacity duration-200 flex-shrink-0" />
              </Link>
            </div>
            <div className="mb-6">
              <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">as {character}</p>
            </div>
          </div>
          <div className="mt-auto pt-4">
            <Link href={rateUrl} prefetch={false} onMouseEnter={handleRatePrefetch}>
              <button className="w-full px-6 py-4 sm:px-8 sm:py-4 rounded-full text-black text-base font-bold tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer min-h-[56px] touch-manipulation" style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)" }}>
                <span className="flex items-center justify-center gap-2">Rate <FaStar className="w-5 h-5" /></span>
              </button>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
      </div>
    </div>
  )
}
