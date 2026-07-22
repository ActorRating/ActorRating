"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

export type AuthLayoutProps = {
  /** Desktop left column headline + mobile primary title (below logo on small screens) */
  heroTitle: string
  /** Desktop left column supporting text */
  heroSubtitle: string
  /** Mobile line under hero title; defaults to `heroSubtitle` */
  heroSubtitleMobile?: string
  /** Title inside the elevated card (desktop); card context */
  title: string
  subtitle?: string
  children: ReactNode
}

const DISPLAY = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
} as const

/**
 * Shared shell for auth pages.
 */
export function AuthLayout({
  heroTitle,
  heroSubtitle,
  heroSubtitleMobile,
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  const mobileSub = heroSubtitleMobile ?? heroSubtitle

  return (
    <div className="min-h-[100svh] bg-black flex relative overflow-x-hidden">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-zinc-500 hover:text-[#FFD700] transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-4">
            ActorRating
          </p>
          <h1
            className="text-4xl xl:text-5xl font-bold text-white mb-5 tracking-tight leading-[1.15]"
            style={DISPLAY}
          >
            {heroTitle}
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed max-w-md">
            {heroSubtitle}
          </p>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-5 sm:px-8 relative pt-[max(env(safe-area-inset-top),0.5rem)] sm:pt-6 lg:pt-0">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-white/10 text-zinc-500 hover:text-[#FFD700] hover:border-[#FFD700]/40 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <motion.div
            className="lg:hidden text-center mb-5"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-3">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20">
                <Image
                  src="/logo_navbar.png"
                  alt="ActorRating Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-2">
              ActorRating
            </p>
            <h1
              className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight"
              style={DISPLAY}
            >
              {heroTitle}
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">{mobileSub}</p>
          </motion.div>

          <motion.div
            className="relative p-5 sm:p-8 rounded-md border border-white/[0.08] bg-[#141414] overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2
              className="hidden lg:block text-2xl font-semibold text-white mb-2 text-center tracking-tight"
              style={DISPLAY}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="hidden lg:block text-zinc-500 text-center mb-8 text-[15px]">
                {subtitle}
              </p>
            ) : (
              <div className="hidden lg:block mb-8" />
            )}

            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
