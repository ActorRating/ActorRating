"use client"

import { useState } from 'react'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MoviePosterProps {
  title: string
  posterUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero'
  className?: string
  loading?: 'eager' | 'lazy'
  /** Make corners more or less rounded */
  rounded?: string
}

// 2:3 aspect ratio maintained; width classes only — height is set by aspect-[2/3]
const SIZE_MAP = {
  xs:   'w-10',   // 40 px wide  → 60 px tall
  sm:   'w-16',   // 64 px wide  → 96 px tall
  md:   'w-24',   // 96 px wide  → 144 px tall
  lg:   'w-32',   // 128 px wide → 192 px tall
  hero: 'w-32 sm:w-44',
}

const ROUNDED_MAP = {
  xs:   'rounded-md',
  sm:   'rounded-lg',
  md:   'rounded-xl',
  lg:   'rounded-xl',
  hero: 'rounded-xl',
}

export function MoviePoster({
  title,
  posterUrl,
  size = 'md',
  className,
  loading = 'lazy',
  rounded,
}: MoviePosterProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const showPhoto = !!posterUrl && !errored

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
      {/* Skeleton shimmer */}
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
        />
      )}

      {showPhoto ? (
        <img
          src={posterUrl!}
          alt={title}
          loading={loading}
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <Film
          className="w-6 h-6 flex-shrink-0 relative z-10"
          style={{ color: 'rgba(255,255,255,0.15)' }}
          aria-hidden
        />
      )}
    </div>
  )
}
