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
    <div className="min-h-[100svh] bg-black lg:bg-gradient-to-br lg:from-black lg:via-black lg:to-[#D4AF37]/15 flex relative overflow-x-hidden">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-[#FFD700] transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            className="text-5xl font-bold text-white mb-6 leading-[1.2]"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            {heroTitle}
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">{heroSubtitle}</p>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 relative pt-[max(env(safe-area-inset-top),0.5rem)] sm:pt-6 lg:pt-0">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-600/50 text-gray-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <motion.div
            className="lg:hidden text-center mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-2">
              <div className="relative w-16 h-16 sm:w-24 sm:h-24">
                <Image
                  src="/logo_navbar.png"
                  alt="ActorRating Logo"
                  width={96}
                  height={96}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-white mb-1"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {heroTitle}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">{mobileSub}</p>
          </motion.div>

          <motion.div
            className="relative p-5 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              boxShadow: `
                0 25px 70px -15px rgba(0, 0, 0, 0.9),
                0 15px 40px -10px rgba(0, 0, 0, 0.7),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
              `,
              transform: "translateY(-6px) perspective(1000px) rotateX(1.5deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <h2
              className="hidden lg:block text-2xl font-semibold text-white mb-2 text-center"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="hidden lg:block text-gray-400 text-center mb-8">{subtitle}</p>
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
