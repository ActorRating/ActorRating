/**
 * Badge system configuration for ActorRating
 * Defines Founding Member badge and level-based badges
 */

export type BadgeType = 'founding-member' | 'level'

export interface BadgeConfig {
  id: string
  name: string
  type: BadgeType
  color: string // Gradient or solid color
  textColor: string
  minRatings?: number // For level badges
  maxRatings?: number // For level badges
  icon?: string // Custom icon/symbol (for emoji/unicode)
  iconName?: string // Icon name for lucide-react icons
  animated?: boolean // For higher-level badges
}

/**
 * Badge configurations
 * Founding Member badge is special and always appears first
 */
export const BADGE_CONFIGS: BadgeConfig[] = [
  // Special Badge: Founding Member (for early adopters)
  {
    id: 'founding-member',
    name: 'Founding Member',
    type: 'founding-member',
    color: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
    textColor: '#000000',
    iconName: 'Crown',
    animated: true
  },
  
  // Level Badges based on rating count
  {
    id: 'viewer',
    name: 'Viewer',
    type: 'level',
    color: '#3b82f6', // Blue
    textColor: '#ffffff',
    minRatings: 1,
    maxRatings: 9,
    icon: '◆',
    animated: false
  },
  {
    id: 'critic',
    name: 'Critic',
    type: 'level',
    color: '#8b5cf6', // Purple
    textColor: '#ffffff',
    minRatings: 10,
    maxRatings: 49,
    icon: '◆',
    animated: false
  },
  {
    id: 'senior-critic',
    name: 'Senior Critic',
    type: 'level',
    color: '#B87333', // Bronze - prestigious and serious
    textColor: '#ffffff',
    minRatings: 50,
    maxRatings: 199,
    icon: '◆',
    animated: true
  },
  {
    id: 'elite-critic',
    name: 'Elite Critic',
    type: 'level',
    color: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
    textColor: '#000000',
    minRatings: 200,
    icon: '◆',
    animated: true
  }
]

/**
 * Get user's level badge based on rating count
 */
export function getLevelBadge(ratingCount: number): BadgeConfig | null {
  const levelBadges = BADGE_CONFIGS.filter(b => b.type === 'level')
  
  for (const badge of levelBadges) {
    if (badge.minRatings !== undefined && ratingCount >= badge.minRatings) {
      if (badge.maxRatings === undefined || ratingCount <= badge.maxRatings) {
        return badge
      }
    }
  }
  
  return null
}

/**
 * Get Founding Member badge
 */
export function getFoundingMemberBadge(): BadgeConfig | null {
  return BADGE_CONFIGS.find(b => b.id === 'founding-member') || null
}

/**
 * Get all badges for a user
 * Returns Founding Member badge first (if applicable), then level badge
 */
export function getUserBadges(ratingCount: number, isFoundingMember: boolean = false): BadgeConfig[] {
  const badges: BadgeConfig[] = []
  
  // Founding Member badge always comes first
  if (isFoundingMember) {
    const foundingBadge = getFoundingMemberBadge()
    if (foundingBadge) badges.push(foundingBadge)
  }
  
  // Add level badge
  const levelBadge = getLevelBadge(ratingCount)
  if (levelBadge) badges.push(levelBadge)
  
  return badges
}

/**
 * Calculate progress to next level
 */
export function getLevelProgress(ratingCount: number): {
  currentBadge: BadgeConfig | null
  nextBadge: BadgeConfig | null
  progress: number // 0-100
  ratingsNeeded: number
} {
  const currentBadge = getLevelBadge(ratingCount)
  
  // Find all level badges sorted by minRatings
  const levelBadges = BADGE_CONFIGS.filter(b => b.type === 'level').sort((a, b) => 
    (a.minRatings || 0) - (b.minRatings || 0)
  )
  
  // Since users with 0 ratings can't access dashboard, minimum is 1 rating (Viewer)
  // If user has no badge yet (0 ratings), show progress to first badge (Viewer)
  // But since dashboard requires 1+ ratings, we should never see 0 ratings here
  // However, handle it gracefully: if 0 ratings, show progress to Viewer
  // If 1+ ratings but no badge found (shouldn't happen), treat as Viewer
  if (!currentBadge) {
    const firstBadge = levelBadges[0] // Viewer badge (minRatings: 1)
    if (firstBadge && firstBadge.minRatings) {
      // If user has 0 ratings, show progress to Viewer
      if (ratingCount === 0) {
        return {
          currentBadge: null,
          nextBadge: firstBadge,
          progress: 0,
          ratingsNeeded: 1
        }
      }
      // If user has 1+ ratings but no badge (shouldn't happen), give them Viewer
      // This ensures dashboard always shows Viewer as minimum
      const nextBadge = levelBadges[1] || null // Critic badge (minRatings: 10)
      if (nextBadge && nextBadge.minRatings) {
        const range = nextBadge.minRatings - firstBadge.minRatings // 10 - 1 = 9
        const progressCount = ratingCount - firstBadge.minRatings // ratingCount - 1
        const progress = Math.min(100, Math.max(0, (progressCount / range) * 100))
        const ratingsNeeded = Math.max(0, nextBadge.minRatings - ratingCount)
        
        return {
          currentBadge: firstBadge, // Viewer
          nextBadge: nextBadge, // Critic
          progress,
          ratingsNeeded
        }
      }
    }
    
    return {
      currentBadge: null,
      nextBadge: null,
      progress: 0,
      ratingsNeeded: 0
    }
  }
  
  // Find next level badge
  const currentIndex = levelBadges.findIndex(b => b.id === currentBadge.id)
  const nextBadge = currentIndex < levelBadges.length - 1 ? levelBadges[currentIndex + 1] : null
  
  if (!nextBadge || !nextBadge.minRatings) {
    // Max level reached
    return {
      currentBadge,
      nextBadge: null,
      progress: 100,
      ratingsNeeded: 0
    }
  }
  
  const currentMin = currentBadge.minRatings || 0
  const nextMin = nextBadge.minRatings
  const range = nextMin - currentMin
  const progressCount = ratingCount - currentMin
  const progress = Math.min(100, Math.max(0, (progressCount / range) * 100))
  const ratingsNeeded = Math.max(0, nextMin - ratingCount)
  
  return {
    currentBadge,
    nextBadge,
    progress,
    ratingsNeeded
  }
}
