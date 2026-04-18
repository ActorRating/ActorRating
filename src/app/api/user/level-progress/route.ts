export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLevelInfo, calculateProgress, getRatingsNeeded, getNextLevelName } from '@/lib/levels'
import { isDevMode, getDevUser } from '@/lib/devAuth'
import { getAuthenticatedUserId } from '@/lib/authUser'

export async function GET(_req: NextRequest) {
  try {
    // Development mode: bypass auth and return mock data
    if (isDevMode) {
      const devUser = getDevUser()
      if (devUser) {
        // Return mock level progress for dev mode
        const mockRatingCount = 0
        const levelInfo = getLevelInfo(mockRatingCount)
        const nextLevelName = getNextLevelName(levelInfo.levelName)
        const progressPercent = calculateProgress(mockRatingCount, levelInfo)
        const ratingsNeeded = getRatingsNeeded(mockRatingCount, levelInfo)
        
        return NextResponse.json({
          ratingCount: mockRatingCount,
          level: levelInfo.levelName,
          levelEmoji: levelInfo.emoji,
          nextLevel: nextLevelName,
          currentLevelMin: levelInfo.levelMin,
          nextLevelAt: levelInfo.nextLevelAt,
          progressPercent: Math.round(progressPercent),
          ratingsNeeded
        })
      }
    }
    
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ratingCount = await prisma.rating.count({
      where: { userId }
    })

    const firstRating = await prisma.rating.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { userId: true }
    })
    
    const firstRaterUserIds = [
      'ada21bfa-bbe4-4c92-83a4-02d9d09b9fd4',
      'f34e355a-1332-4c0b-8de8-79faa4e239a1'
    ]
    const isFirstRater = firstRating?.userId === userId || firstRaterUserIds.includes(userId)

    // Get level information
    const levelInfo = getLevelInfo(ratingCount)
    const nextLevelName = getNextLevelName(levelInfo.levelName)
    const progressPercent = calculateProgress(ratingCount, levelInfo)
    const ratingsNeeded = getRatingsNeeded(ratingCount, levelInfo)

    return NextResponse.json({
      ratingCount,
      level: levelInfo.levelName,
      levelEmoji: levelInfo.emoji,
      nextLevel: nextLevelName,
      currentLevelMin: levelInfo.levelMin,
      nextLevelAt: levelInfo.nextLevelAt,
      progressPercent: Math.round(progressPercent),
      ratingsNeeded,
      isFirstRater
    })
  } catch (error) {
    console.error('Error fetching user level progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch level progress' },
      { status: 500 }
    )
  }
}
