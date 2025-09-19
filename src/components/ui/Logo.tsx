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
      {/* Logo Image */}
      <div className="relative w-8 h-8">
        <Image
          src="/logo.png"
          alt="ActorRating Logo"
          width={32}
          height={32}
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
