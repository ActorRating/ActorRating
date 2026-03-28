"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ActorAvatarProps {
  name: string
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** eager = hero images, lazy = everything else */
  loading?: 'eager' | 'lazy'
  showRing?: boolean
}

const SIZE_MAP = {
  xs:  'w-7 h-7 text-[10px] rounded-lg',
  sm:  'w-9 h-9 text-xs rounded-xl',
  md:  'w-12 h-12 text-sm rounded-xl',
  lg:  'w-20 h-20 text-xl rounded-2xl',
  xl:  'w-28 h-28 sm:w-36 sm:h-36 text-3xl rounded-2xl',
}

const RING_MAP = {
  xs:  '1.5px',
  sm:  '1.5px',
  md:  '2px',
  lg:  '2px',
  xl:  '3px',
}

export function ActorAvatar({
  name,
  imageUrl,
  size = 'md',
  className,
  loading = 'lazy',
  showRing = true,
}: ActorAvatarProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const showPhoto = !!imageUrl && !errored

  return (
    <div
      className={cn(
        'relative overflow-hidden flex-shrink-0 flex items-center justify-center',
        SIZE_MAP[size],
        className,
      )}
      style={{
        background: showPhoto ? 'rgba(0,0,0,0.4)' : 'rgba(255,215,0,0.06)',
        border: showRing ? `${RING_MAP[size]} solid rgba(255,215,0,0.22)` : undefined,
        boxShadow: showRing ? '0 0 0 1px rgba(0,0,0,0.3)' : undefined,
      }}
    >
      {/* Skeleton shimmer — shown until image loads */}
      {showPhoto && !loaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
        />
      )}

      {showPhoto ? (
        <img
          src={imageUrl!}
          alt={name}
          loading={loading}
          // object-[center_20%] keeps the face visible while avoiding extreme cropping
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          style={{ objectPosition: 'top center' }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="font-bold select-none" style={{ color: 'rgba(255,215,0,0.55)' }}>
          {initial}
        </span>
      )}
    </div>
  )
}
