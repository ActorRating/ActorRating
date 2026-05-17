"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Star } from "lucide-react"
import { MoviePoster } from "@/components/ui/MoviePoster"
import { ActorHeadshot } from "@/components/ui/ActorHeadshot"
import { upgradeActorImageRes } from "@/lib/tmdb"
import type { SuccessCarouselPerf } from "@/lib/guest-success-recommendations"

export type SuccessCarouselVariant = "auth" | "guest"

type Props = {
  variant: SuccessCarouselVariant
  perfs: SuccessCarouselPerf[]
  loading: boolean
  /** Auth: headline actor for cards that share one performer */
  headlineActorName: string
  headlineActorImageUrl?: string | null
  actorProgress?: { totalPerformances: number; userRatedCount: number } | null
  onRate: (p: SuccessCarouselPerf) => void
  onViewFilmography?: () => void
  emptyMessage?: string
  /** When false, hides title + subtext (and headerAbove). Default true. */
  showSectionHeader?: boolean
  /** Optional line above the section heading (e.g. guest taste-profile hint). */
  headerAbove?: React.ReactNode
}

export function SuccessRateAnotherCarousel({
  variant,
  perfs,
  loading,
  headlineActorName,
  headlineActorImageUrl,
  actorProgress,
  onRate,
  onViewFilmography,
  emptyMessage = "You've rated every performance for this actor. Try another actor.",
  showSectionHeader = true,
  headerAbove,
}: Props) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeCarouselCard, setActiveCarouselCard] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const container = carouselRef.current
    if (!container || perfs.length === 0) return
    const updateActive = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      const cards = container.querySelectorAll(".carousel-card")
      let closest = 0
      let closestDist = Infinity
      cards.forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect()
        const dist = Math.abs(containerCenter - (cardRect.left + cardRect.width / 2))
        if (dist < closestDist) {
          closestDist = dist
          closest = idx
        }
      })
      setActiveCarouselCard(closest)
    }
    container.addEventListener("scroll", updateActive, { passive: true })
    updateActive()
    return () => container.removeEventListener("scroll", updateActive)
  }, [perfs.length])

  const headerTitle =
    variant === "auth" &&
    actorProgress != null &&
    actorProgress.totalPerformances > 0 &&
    actorProgress.totalPerformances - actorProgress.userRatedCount <= 3
      ? "Almost finished rating this actor"
      : "Rate another performance"

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {showSectionHeader && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: prefersReducedMotion ? 0 : 0.08 }}
          className="text-center space-y-2 mb-4 sm:mb-5 px-1"
        >
          {headerAbove ? <motion.div className="mb-1">{headerAbove}</motion.div> : null}
          <h2
            className="text-base sm:text-lg font-semibold text-white tracking-tight"
            style={{ fontFamily: "var(--font-cinzel, serif)" }}
          >
            {headerTitle}
          </h2>
          <p className="text-xs sm:text-sm font-medium" style={{ color: "#71717a" }}>
            Compare your opinion with other movie fans
          </p>
        </motion.div>
      )}

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.42, delay: prefersReducedMotion ? 0 : 0.14 }}
      >
        {loading ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : i * 0.06 }}
                className="flex-shrink-0 w-[80vw] sm:w-[300px] rounded-[2rem] border border-white/5 bg-gradient-to-br from-[#1a1a1a]/80 to-black/80 p-6 animate-pulse"
                style={{ minHeight: 360 }}
              />
            ))}
          </motion.div>
        ) : perfs.length > 0 ? (
          <div className="relative">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
              className="relative -mx-4 sm:-mx-0"
            >
              <motion.div
                className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 z-10"
                style={{
                  background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
                }}
                aria-hidden
              />
              <motion.div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 z-10"
                style={{
                  background: "linear-gradient(270deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
                }}
                aria-hidden
              />
              <motion.div
                ref={carouselRef}
                className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scrollbar-hide pl-4 pr-4 sm:pl-2 sm:pr-2"
              >
                {perfs.map((p, idx) => (
                  <motion.div
                    key={`${p.actorSlug}-${p.movieSlug}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.38,
                      delay: prefersReducedMotion ? 0 : 0.06 + idx * 0.05,
                      ease: [0.22, 0.61, 0.36, 1],
                    }}
                    className="carousel-card flex-shrink-0 w-[80vw] sm:w-[300px] snap-center"
                    style={{ transform: "translateZ(0)" }}
                  >
                    <motion.div className="group relative h-full">
                      <motion.div
                        role="button"
                        tabIndex={0}
                        className="relative h-full p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)] cursor-pointer"
                        style={{
                          boxShadow:
                            "0 25px 70px -15px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)",
                        }}
                        onClick={() => onRate(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onRate(p)
                          }
                        }}
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                          <motion.div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-center items-end gap-4 mb-5">
                            <ActorHeadshot
                              name={p.actorName}
                              imageUrl={upgradeActorImageRes(
                                p.actorImageUrl ??
                                  (variant === "auth" ? headlineActorImageUrl : null) ??
                                  null,
                              )}
                              size="lg"
                              loading="lazy"
                            />
                            <MoviePoster
                              title={p.movieTitle}
                              posterUrl={p.moviePosterUrl ?? undefined}
                              size="lg"
                              loading="lazy"
                            />
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            {variant === "auth" ? (
                              <motion.div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#FFD700]" />
                                <span className="text-xs font-bold text-[#FFD700]">Unrated by you</span>
                              </motion.div>
                            ) : (
                              <span />
                            )}
                            <span className="text-[#a3a3a3] text-sm font-medium">{p.movieYear}</span>
                          </div>

                          <div className="flex-1">
                            <h3
                              className="text-xl sm:text-2xl font-bold text-white mb-1"
                              style={{ fontFamily: "var(--font-cinzel, serif)" }}
                            >
                              {variant === "auth" ? headlineActorName : p.actorName}
                            </h3>
                            <p className="text-base text-[#FFD700] font-semibold tracking-wide mb-4 line-clamp-2">
                              {p.movieTitle}
                            </p>
                          </div>

                          <div className="mt-auto">
                            <div
                              className="w-full px-6 py-4 rounded-full text-black text-sm font-bold tracking-wider flex items-center justify-center gap-2 transition-all duration-200 group-hover:scale-105"
                              style={{
                                background:
                                  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
                              }}
                            >
                              Rate <Star className="w-4 h-4 fill-current" />
                            </div>
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {perfs.length > 1 && (
              <div className="flex justify-center items-center mt-4" style={{ gap: "4px" }}>
                {perfs.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const cards = carouselRef.current?.querySelectorAll(".carousel-card")
                      const target = cards?.[index] as HTMLElement
                      if (target) {
                        target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                      }
                    }}
                    style={{
                      padding: "10px 4px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label={`Go to card ${index + 1}`}
                  >
                    <motion.div
                      animate={{
                        width: index === activeCarouselCard ? 20 : 8,
                        backgroundColor:
                          index === activeCarouselCard ? "#FFD700" : "rgba(115,115,115,0.4)",
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ height: 8, borderRadius: 9999 }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl sm:rounded-[2rem] border border-white/8 p-5 sm:p-8 text-center"
            style={{ background: "linear-gradient(to bottom right, rgba(26,26,26,0.9), rgba(0,0,0,0.9))" }}
          >
            <p className="text-[#a1a1aa] text-xs sm:text-sm mb-4 sm:mb-5">{emptyMessage}</p>
            {onViewFilmography && (
              <button
                type="button"
                onClick={onViewFilmography}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors"
              >
                View Filmography
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
