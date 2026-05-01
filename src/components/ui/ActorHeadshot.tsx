"use client"

import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActorHeadshotProps {
  name: string
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero'
  className?: string
  loading?: 'eager' | 'lazy'
  /** Eager load + high fetch priority (above-the-fold carousels, etc.) */
  priority?: boolean
  rounded?: string
}

/** Same layout as {@link MoviePoster}: 2:3 frame, border, skeleton — for cast cards on movie pages. */
const SIZE_MAP = {
  xs: 'w-10',
  sm: 'w-16',
  md: 'w-24',
  lg: 'w-32',
  hero: 'w-32 sm:w-44',
}

const ROUNDED_MAP = {
  xs: 'rounded-md',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-xl',
  hero: 'rounded-xl',
}

export function ActorHeadshot({
  name,
  imageUrl,
  size = 'md',
  className,
  loading = 'lazy',
  priority = false,
  rounded,
}: ActorHeadshotProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const showPhoto = !!imageUrl && !errored

  return (
    <div
      className={cn(
        'relative overflow-hidden flex-shrink-0 aspect-[2/3] flex items-center justify-center',
        SIZE_MAP[size],
        rounded ?? ROUNDED_MAP[size],
        className,
      )}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {showPhoto && !loaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
        />
      )}

      {showPhoto ? (
        <img
          src={imageUrl!}
          alt={name}
          loading={priority ? 'eager' : loading}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          style={{ objectPosition: 'top center' }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <User
          className="w-6 h-6 flex-shrink-0 relative z-10"
          style={{ color: 'rgba(255,255,255,0.15)' }}
          aria-hidden
        />
      )}
    </div>
  )
}
