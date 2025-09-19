import React from 'react'
import { ImageResponse } from '@vercel/og'
import { hashColor } from '@/lib/hashColor'

export type ShareSize = 'feed' | 'story' | 'og'

const SIZE_MAP = {
  feed: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
}

export async function renderNodeSharePngBuffer(params: {
  size: ShareSize
  actorName: string
  roleName?: string | null
  score: number
  subtitle?: string
  themeColor?: string
}): Promise<Buffer> {
  const { width, height } = SIZE_MAP[params.size]
  const color = params.themeColor || hashColor(params.actorName)
  const initials = params.actorName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  const res = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'white',
          padding: params.size === 'story' ? 96 : 64,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <div
            style={{
              width: params.size === 'story' ? 180 : 140,
              height: params.size === 'story' ? 180 : 140,
              borderRadius: 9999,
              background: color,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: params.size === 'story' ? 64 : 56,
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32 }}>
            <div style={{ fontSize: params.size === 'story' ? 64 : 56, fontWeight: 800, color: '#111827' }}>{params.actorName}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {params.roleName ? (
                <div style={{ fontSize: params.size === 'story' ? 40 : 36, color: '#374151' }}>as {params.roleName}</div>
              ) : null}
              {params.subtitle ? (
                <div style={{ fontSize: params.size === 'story' ? 32 : 28, color: '#6B7280' }}>{params.subtitle}</div>
              ) : null}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: params.size === 'story' ? 48 : 40, color: '#6B7280' }}>ActorRating</div>
            <div style={{ fontSize: params.size === 'story' ? 32 : 28, color: '#9CA3AF' }}>actorrating.com</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              fontSize: params.size === 'story' ? 240 : params.size === 'og' ? 160 : 200,
              fontWeight: 900,
              color: color,
              letterSpacing: -2,
            }}
          >
            {Math.round(params.score)}
          </div>
        </div>
      </div>
    ),
    { width, height }
  )
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}


