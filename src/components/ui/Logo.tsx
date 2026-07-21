import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  href?: string
  className?: string
  showText?: boolean
  textClassName?: string
}

export function Logo({ 
  href = "/", 
  className,
  showText = false,
  textClassName 
}: LogoProps) {
  const LogoContent = () => (
    <div className={cn("flex items-center gap-0 sm:gap-0.5", className)} suppressHydrationWarning>
      <div className="relative w-14 h-14 lg:w-[4.5rem] lg:h-[4.5rem] shrink-0">
        <Image
          src="/logo_navbar.png"
          alt="ActorRating Logo"
          width={72}
          height={72}
          className="object-contain"
          priority
          suppressHydrationWarning
        />
      </div>
      {showText ? (
        <span
          className={cn(
            "hidden lg:inline text-3xl font-extrabold text-white tracking-tight",
            textClassName,
          )}
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)" }}
        >
          ActorRating
        </span>
      ) : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} prefetch={false} className="flex items-center cursor-pointer relative z-10" aria-label="ActorRating - Go to homepage" style={{ pointerEvents: 'auto' }}>
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
