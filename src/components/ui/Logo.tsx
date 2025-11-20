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
      <div className="relative w-11 h-11 md:w-14 md:h-14 lg:w-12 lg:h-12">
        <Image
          src="/logo_navbar.png"
          alt="ActorRating Logo"
          width={56}
          height={56}
          className="object-contain"
          priority
          suppressHydrationWarning
        />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
