"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { FaTrophy, FaStar, FaArrowRight } from "react-icons/fa"
import { HomeLayout } from "@/components/layout"
import Link from "next/link"
import { buildByLookupUrl } from "@/lib/performances-page-targets"

const GOLD = "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"
const GOLD_TEXT: React.CSSProperties = {
  background: GOLD,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
}
const CINZEL: React.CSSProperties = { fontFamily: "var(--font-cinzel), serif" }
const CARD_SHADOW = `
  0 35px 90px -20px rgba(0,0,0,0.95),
  0 20px 50px -10px rgba(0,0,0,0.8),
  0 0 0 1px rgba(255,255,255,0.06),
  inset 0 1px 0 rgba(255,255,255,0.1),
  inset 0 -1px 0 rgba(0,0,0,0.4)
`.trim()
const CARD_BG =
  "linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(15,15,15,0.95) 50%, rgba(0,0,0,0.95) 100%)"

function GoldDivider({ width = 180 }: { width?: number }) {
  return (
    <div className="mx-auto my-6" style={{ width, height: 2 }}>
      <div
        className="h-full w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)",
          boxShadow: "0 0 20px rgba(255,165,0,0.6), 0 0 40px rgba(255,165,0,0.3)",
        }}
      />
    </div>
  )
}

function useDevice() {
  const [isMobile, setIsMobile] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
      setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    }
    check()
    window.addEventListener("resize", check)
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    mq.addEventListener("change", check)
    return () => {
      window.removeEventListener("resize", check)
      mq.removeEventListener("change", check)
    }
  }, [])
  return { isMobile, prefersReducedMotion }
}

const OSCAR_CATEGORIES = [
  {
    category: "Best Actor",
    nominees: [
      { name: "Timothée Chalamet", film: "Marty Supreme", character: null },
      { name: "Leonardo DiCaprio", film: "One Battle After Another", character: null },
      { name: "Ethan Hawke", film: "Blue Moon", character: null },
      { name: "Michael B. Jordan", film: "Sinners", character: null },
      { name: "Wagner Moura", film: "The Secret Agent", character: null },
    ],
  },
  {
    category: "Best Actress",
    nominees: [
      { name: "Jessie Buckley", film: "Hamnet", character: null },
      { name: "Rose Byrne", film: "If I Had Legs I'd Kick You", character: null },
      { name: "Kate Hudson", film: "Song Sung Blue", character: null },
      { name: "Renate Reinsve", film: "Sentimental Value", character: null },
      { name: "Emma Stone", film: "Bugonia", character: null },
    ],
  },
  {
    category: "Best Supporting Actor",
    nominees: [
      { name: "Benicio del Toro", film: "One Battle After Another", character: null },
      { name: "Jacob Elordi", film: "Frankenstein", character: null },
      { name: "Delroy Lindo", film: "Sinners", character: null },
      { name: "Sean Penn", film: "One Battle After Another", character: null },
      { name: "Stellan Skarsgård", film: "Sentimental Value", character: null },
    ],
  },
  {
    category: "Best Supporting Actress",
    nominees: [
      { name: "Elle Fanning", film: "Sentimental Value", character: null },
      { name: "Inga Ibsdotter Lilleaas", film: "Sentimental Value", character: null },
      { name: "Amy Madigan", film: "Weapons", character: null },
      { name: "Wunmi Mosaku", film: "Sinners", character: null },
      { name: "Teyana Taylor", film: "One Battle After Another", character: null },
    ],
  },
]

interface PerformanceData {
  actorSlug: string
  movieSlug: string
  averageRating: number
  ratingCount: number
}

export default function Oscars2026Page() {
  const { isMobile, prefersReducedMotion } = useDevice()
  const reduceMotion = isMobile || prefersReducedMotion
  const [performanceData, setPerformanceData] = useState<Map<string, PerformanceData>>(new Map())

  useEffect(() => {
    async function fetchPerformanceData() {
      try {
        const targets = OSCAR_CATEGORIES.flatMap((category) =>
          category.nominees.map((nominee) => ({ actor: nominee.name, movie: nominee.film }))
        )
        const response = await fetch(buildByLookupUrl(targets), { cache: "force-cache" })
        if (!response.ok) return
        const data = await response.json()
        const newPerformanceData = new Map<string, PerformanceData>()
        if (data.performances && Array.isArray(data.performances)) {
          data.performances.forEach((perf: any) => {
            if (perf.actor && perf.movie) {
              const key = `${perf.actor.name}:${perf.movie.title}`
              newPerformanceData.set(key, {
                actorSlug: perf.actor.slug || perf.actorId,
                movieSlug: perf.movie.slug || perf.movieId,
                averageRating: perf.averageRating || 0,
                ratingCount: perf.ratingCount || 0,
              })
            }
          })
        }
        setPerformanceData(newPerformanceData)
      } catch {
        // silent
      }
    }
    fetchPerformanceData()
  }, [])

  return (
    <HomeLayout>
      <div className="min-h-screen bg-black text-white" style={{ maxWidth: "100vw", overflowX: "hidden" }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]"
            style={{ filter: isMobile ? "blur(120px)" : "blur(200px)" }}
          />
        </div>

        <div
          className="relative w-full px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 md:pt-36 pb-16 sm:pb-24 md:pb-32"
          style={{ maxWidth: "1024px", margin: "0 auto" }}
        >
          {/* Hero — no motion when reduceMotion to avoid Safari lag */}
          {(() => {
            const HeroWrap = reduceMotion ? "div" : motion.div
            const heroProps = reduceMotion
              ? { className: "text-center mb-16 sm:mb-20 md:mb-24" }
              : {
                  className: "text-center mb-16 sm:mb-20 md:mb-24",
                  initial: { opacity: 0, y: 24 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
                }
            return (
              <HeroWrap {...heroProps}>
                <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-6">
                  Oscars Season 2026
                </p>
                <div
                  className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-6 rounded-2xl"
                  style={{
                    background: "rgba(255,215,0,0.1)",
                    border: "2px solid rgba(255,215,0,0.3)",
                    boxShadow: "0 0 30px rgba(255,215,0,0.15)",
                  }}
                >
                  <FaTrophy className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                </div>
                <h1
                  className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight leading-[1.05]"
                  style={CINZEL}
                >
                  Academy{" "}
                  <span style={{ ...GOLD_TEXT, textShadow: "none" }}>Awards</span>{" "}
                  2026
                </h1>
                <p className="text-xs font-bold tracking-[0.25em] uppercase text-white opacity-20 mt-2 mb-0">
                  Acting nominees
                </p>
                <GoldDivider />
                <p className="text-base sm:text-lg md:text-xl text-[#a0a0a0] font-light leading-relaxed max-w-2xl mx-auto mt-2">
                  Nominations are out. Rate each performance and see how the community ranks them.
                </p>
              </HeroWrap>
            )
          })()}

          {/* Categories — plain section when reduceMotion to avoid Safari whileInView lag */}
          <div className="space-y-16 sm:space-y-20">
            {OSCAR_CATEGORIES.map((category, categoryIndex) => {
              const categoryKey = category.category
              const SectionWrap = reduceMotion ? "section" : motion.section
              const sectionProps = reduceMotion
                ? {}
                : {
                    initial: { opacity: 0, y: 24 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, margin: "-40px" },
                    transition: { duration: 0.5, delay: categoryIndex * 0.08 },
                  }
              return (
                <SectionWrap key={categoryKey} {...sectionProps}>
                  <div
                    className="rounded-[2rem] overflow-hidden"
                    style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
                  >
                    {/* Category header */}
                    <div className="px-6 sm:px-8 py-6 sm:py-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#FFD700] opacity-60 mb-2">
                        Category
                      </p>
                      <h2
                        className="text-2xl sm:text-3xl md:text-4xl font-bold text-white"
                        style={CINZEL}
                      >
                        <span style={GOLD_TEXT}>{category.category}</span>
                      </h2>
                      <GoldDivider width={120} />
                    </div>

                    {/* Nominees */}
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {category.nominees.map((nominee, nomIndex) => {
                        const key = `${nominee.name}:${nominee.film}`
                        const perfData = performanceData.get(key)
                        const hasData = !!perfData && perfData.ratingCount > 0
                        const actorSlug =
                          perfData?.actorSlug ?? nominee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                        const movieSlug =
                          perfData?.movieSlug ?? nominee.film.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                        const href = `/rate/${movieSlug}/${actorSlug}`
                        const rating =
                          perfData && perfData.ratingCount > 0
                            ? (perfData.averageRating / 10).toFixed(1)
                            : null

                        return (
                          <div
                            key={nomIndex}
                            className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-6 sm:px-8 py-5 sm:py-6 transition-colors duration-200 hover:bg-white/[0.02]"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                                  style={{
                                    color: "#FFD700",
                                    background: "rgba(255,215,0,0.08)",
                                    border: "1px solid rgba(255,215,0,0.25)",
                                  }}
                                >
                                  <FaTrophy className="w-2.5 h-2.5" /> Nominee
                                </span>
                              </div>
                              <h3
                                className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight"
                                style={CINZEL}
                              >
                                {nominee.name}
                              </h3>
                              <p className="text-sm sm:text-base text-[#FFD700] opacity-90 mt-0.5">
                                {nominee.film}
                              </p>
                              {nominee.character && (
                                <p className="text-sm text-[#666] mt-1">as {nominee.character}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                              {rating !== null && perfData && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-[#FFD700]/20">
                                  <FaStar className="w-4 h-4 text-[#FFD700]" />
                                  <span className="text-lg font-bold text-white">{rating}</span>
                                  <span className="text-xs text-[#555]">
                                    {perfData.ratingCount} {perfData.ratingCount === 1 ? "rating" : "ratings"}
                                  </span>
                                </div>
                              )}
                              <Link
                                href={href}
                                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-black text-sm sm:text-base font-bold transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,215,0,0.35)] whitespace-nowrap"
                                style={{ background: GOLD }}
                              >
                                {hasData ? "Rate" : "Rate First"}
                                <FaArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </SectionWrap>
              )
            })}
          </div>

          {/* CTA — plain div when reduceMotion to avoid Safari whileInView lag */}
          {(() => {
            const CtaWrap = reduceMotion ? "div" : motion.div
            const ctaProps = reduceMotion
              ? { className: "mt-16 sm:mt-20 text-center" }
              : {
                  className: "mt-16 sm:mt-20 text-center",
                  initial: { opacity: 0, y: 16 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true },
                  transition: { duration: 0.5 },
                }
            return (
              <CtaWrap {...ctaProps}>
                <div
                  className="relative p-8 sm:p-12 rounded-[2rem] overflow-hidden"
                  style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FFD700]/20 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-4">
                      Explore More
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4" style={CINZEL}>
                      Rate <span style={GOLD_TEXT}>570K+</span> Performances
                    </h2>
                    <GoldDivider width={100} />
                    <p className="text-sm sm:text-base text-[#888] mb-8 max-w-md mx-auto">
                      Discover and rate performances from every era. Your scores shape the canon.
                    </p>
                    <Link
                      href="/performances"
                      className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-full text-black text-base sm:text-lg font-bold tracking-wider transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,0.35)]"
                      style={{ background: GOLD }}
                    >
                      Browse Performances
                      <FaArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CtaWrap>
            )
          })()}
        </div>
      </div>
    </HomeLayout>
  )
}
