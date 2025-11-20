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
      {/* Logo Image - Larger on iPad */}
      <div className="relative w-10 h-10 md:w-12 md:h-12 lg:w-11 lg:h-11">
        <Image
          src="/logo_navbar.png"
          alt="ActorRating Logo"
          width={48}
          height={48}
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
