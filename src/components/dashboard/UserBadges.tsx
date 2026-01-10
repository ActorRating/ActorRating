"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/badges/Badge'
import { getUserBadges } from '@/lib/badges'

interface BadgeData {
  ratingCount: number
  isFoundingMember?: boolean
}

export function UserBadges() {
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBadgeData()
  }, [])

  const fetchBadgeData = async () => {
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setBadgeData({
          ratingCount: data.ratingCount,
          isFoundingMember: false // TODO: Add founding member check
        })
      }
    } catch (error) {
      console.error('Failed to fetch badge data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !badgeData) {
    return null
  }

  const badges = getUserBadges(badgeData.ratingCount, badgeData.isFoundingMember || false)

  if (badges.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges.map((badge) => (
        <Badge key={badge.id} badge={badge} />
      ))}
    </div>
  )
}
