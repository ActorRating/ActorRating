import React from 'react'
import { ImageResponse } from 'next/og'
import { hashColor } from '@/lib/hashColor'

export type ShareSize = 'feed' | 'story' | 'og'

export interface ShareTemplateProps {
  actorName: string
  roleName?: string | null
  score: number
  subtitle?: string
  themeColor?: string
  size: ShareSize
}

// Dimensions per size
const SIZE_MAP = {
  feed: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
}

export function renderShareTemplate(props: ShareTemplateProps): ImageResponse {
  const { actorName, roleName, score, subtitle, size } = props
  const { width, height } = SIZE_MAP[size]
  const color = props.themeColor || hashColor(actorName)
  const initials = actorName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'white', padding: size === 'story' ? 96 : 64, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <div
            style={{
              width: size === 'story' ? 180 : 140,
              height: size === 'story' ? 180 : 140,
              borderRadius: 9999,
              background: color,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: size === 'story' ? 64 : 56,
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32 }}>
            <div style={{ fontSize: size === 'story' ? 64 : 56, fontWeight: 800, color: '#111827' }}>{actorName}</div>
            {roleName ? (
              <div style={{ fontSize: size === 'story' ? 40 : 36, color: '#374151' }}>as {roleName}</div>
            ) : null}
            {subtitle ? (
              <div style={{ fontSize: size === 'story' ? 32 : 28, color: '#6B7280' }}>{subtitle}</div>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: size === 'story' ? 48 : 40, color: '#6B7280' }}>ActorRating</div>
            <div style={{ fontSize: size === 'story' ? 32 : 28, color: '#9CA3AF' }}>actorrating.com</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              fontSize: size === 'story' ? 240 : size === 'og' ? 160 : 200,
              fontWeight: 900,
              color: color,
              letterSpacing: -2,
            }}
          >
            {Math.round(score)}
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  )
}

