import { ExternalLink } from "lucide-react"
import { sanitizeAmazonAffiliateUrl } from "@/lib/amazon-affiliate"

const DISCLOSURE = "This link may earn us a commission on qualifying purchases."

export function BuyOnAmazon({ url }: { url?: string | null }) {
  const href = sanitizeAmazonAffiliateUrl(url)
  if (!href) return null

  return (
    <div className="mb-8 sm:mb-10 flex flex-col items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 rounded-md border border-white/15 bg-white/[0.04] text-white text-[15px] sm:text-base font-semibold min-h-[44px] transition-colors hover:border-[#FFD700]/45 hover:text-[#FFD700]"
      >
        Buy on Amazon
        <ExternalLink className="w-4 h-4" aria-hidden />
      </a>
      <p className="max-w-sm text-center text-[11px] leading-snug text-zinc-500">
        {DISCLOSURE}
      </p>
    </div>
  )
}
