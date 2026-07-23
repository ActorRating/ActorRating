"use client"

import Link from "next/link"
import { FaStar } from "react-icons/fa"

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"
const EDIT =
  "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)"

/**
 * Full-width performance-card CTA: Rate / Edit, or disabled Coming soon.
 */
export function RateOrComingSoonButton({
  rateUrl,
  comingSoon,
  alreadyRated = false,
  className = "w-full px-8 py-4 rounded-md text-[15px] font-bold min-h-[44px]",
}: {
  rateUrl: string
  comingSoon: boolean
  alreadyRated?: boolean
  className?: string
}) {
  if (comingSoon) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`${className} cursor-not-allowed text-zinc-400 border border-white/10 bg-white/[0.04]`}
      >
        Coming soon
      </button>
    )
  }

  return (
    <Link href={rateUrl} prefetch={false}>
      <button
        type="button"
        className={`${className} transition-transform duration-200 hover:scale-[1.02] cursor-pointer`}
        style={{
          background: alreadyRated ? EDIT : GOLD,
          color: alreadyRated ? "#FFD700" : "black",
          border: alreadyRated ? "1px solid rgba(255, 215, 0, 0.3)" : "none",
        }}
      >
        <span className="flex items-center justify-center gap-2">
          {alreadyRated ? "Edit" : "Rate"}
          <FaStar className="w-4 h-4" />
        </span>
      </button>
    </Link>
  )
}
