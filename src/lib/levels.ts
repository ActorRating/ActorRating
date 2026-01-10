/**
 * Level system for ActorRating
 * Based solely on number of submitted ratings
 */

export type LevelName = 'Viewer' | 'Critic' | 'Senior Critic' | 'Elite Critic'

export interface LevelInfo {
  levelName: LevelName
  levelMin: number
  nextLevelAt: number
  emoji: string
}

/**
 * Calculate level information based on rating count
 */
export function getLevelInfo(ratingCount: number): LevelInfo {
  if (ratingCount < 10) {
    return {
      levelName: 'Viewer',
      levelMin: 1,
      nextLevelAt: 10,
      emoji: '🎬'
    }
  } else if (ratingCount < 50) {
    return {
      levelName: 'Critic',
      levelMin: 10,
      nextLevelAt: 50,
      emoji: '🎭'
    }
  } else if (ratingCount < 200) {
    return {
      levelName: 'Senior Critic',
      levelMin: 50,
      nextLevelAt: 200,
      emoji: '🏆'
    }
  } else {
    return {
      levelName: 'Elite Critic',
      levelMin: 200,
      nextLevelAt: 200, // Max level
      emoji: '⭐'
    }
  }
}

/**
 * Get next level name
 */
export function getNextLevelName(currentLevel: LevelName): LevelName | null {
  switch (currentLevel) {
    case 'Viewer':
      return 'Critic'
    case 'Critic':
      return 'Senior Critic'
    case 'Senior Critic':
      return 'Elite Critic'
    case 'Elite Critic':
      return null // Max level
  }
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(ratingCount: number, levelInfo: LevelInfo): number {
  if (levelInfo.levelName === 'Elite Critic') {
    return 100 // Max level
  }
  
  const range = levelInfo.nextLevelAt - levelInfo.levelMin
  const progress = ratingCount - levelInfo.levelMin
  return Math.min(100, Math.max(0, (progress / range) * 100))
}

/**
 * Get ratings needed for next level
 */
export function getRatingsNeeded(ratingCount: number, levelInfo: LevelInfo): number {
  if (levelInfo.levelName === 'Elite Critic') {
    return 0 // Max level
  }
  return Math.max(0, levelInfo.nextLevelAt - ratingCount)
}
