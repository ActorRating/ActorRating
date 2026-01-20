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
    <div className={cn("flex items-center", className)} suppressHydrationWarning>
      {/* Logo Image - Responsive sizing to match button */}
      <div className="relative w-12 h-12 md:w-16 md:h-16 lg:w-14 lg:h-14">
        <Image
          src="/logo_navbar.png"
          alt="ActorRating Logo"
          width={64}
          height={64}
          className="object-contain"
          priority
          suppressHydrationWarning
        />
      </div>
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
