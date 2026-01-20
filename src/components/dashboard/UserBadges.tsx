"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/badges/Badge'
import { getUserBadges } from '@/lib/badges'

interface BadgeData {
  ratingCount: number
  isFoundingMember?: boolean
  isFirstRater?: boolean
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
          isFoundingMember: false, // TODO: Add founding member check
          isFirstRater: data.isFirstRater || false
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

  const badges = getUserBadges(
    badgeData.ratingCount, 
    badgeData.isFoundingMember || false,
    badgeData.isFirstRater || false
  )

  if (badges.length === 0) {
    return null
  }

  // Special display for First Rater badge
  const firstRaterBadge = badges.find(b => b.id === 'first-rater')
  if (firstRaterBadge) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        <Badge badge={firstRaterBadge} />
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-md">
          You were among the very first to rate performances on ActorRating.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges.map((badge) => (
        <Badge key={badge.id} badge={badge} />
      ))}
    </div>
  )
}
