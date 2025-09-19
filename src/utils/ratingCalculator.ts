import { 
  OscarCriteria, 
  RatingWeights, 
  RatingScore, 
  RatingComparison, 
  RatingValidation,
  OscarRating,
  DraftRating
} from '@/types/rating'

// Default Oscar criteria weights
export const DEFAULT_WEIGHTS: RatingWeights = {
  technicalSkill: 0.25,      // 25%
  emotionalDepth: 0.25,      // 25%
  characterTransformation: 0.25, // 25%
  storyImpact: 0.15,         // 15%
  difficultyFactor: 0.10     // 10%
}

// Score interpretation levels
export const SCORE_LEVELS: RatingScore[] = [
  { score: 0, level: 'Poor', color: '#ef4444', description: 'Significantly below average performance' },
  { score: 20, level: 'Fair', color: '#f97316', description: 'Below average with some redeeming qualities' },
  { score: 40, level: 'Good', color: '#eab308', description: 'Competent performance meeting basic standards' },
  { score: 60, level: 'Very Good', color: '#22c55e', description: 'Strong performance with notable strengths' },
  { score: 80, level: 'Excellent', color: '#3b82f6', description: 'Outstanding performance worthy of recognition' },
  { score: 90, level: 'Outstanding', color: '#8b5cf6', description: 'Exceptional performance of the highest caliber' }
]

/**
 * Calculate weighted average score from Oscar criteria
 */
export function calculateOverallScore(
  criteria: OscarCriteria, 
  weights: RatingWeights = DEFAULT_WEIGHTS
): number {
  const weightedSum = Object.keys(criteria).reduce((sum, key) => {
    const criterion = key as keyof OscarCriteria
    return sum + (criteria[criterion] * weights[criterion])
  }, 0)
  
  return weightedSum
}

/**
 * Get score level and description
 */
export function getScoreLevel(score: number): RatingScore {
  for (let i = SCORE_LEVELS.length - 1; i >= 0; i--) {
    if (score >= SCORE_LEVELS[i].score) {
      return SCORE_LEVELS[i]
    }
  }
  return SCORE_LEVELS[0]
}

/**
 * Validate rating criteria
 */
export function validateRating(criteria: OscarCriteria): RatingValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for required values
  Object.entries(criteria).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      errors.push(`${key} is required`)
    } else if (value < 0 || value > 100) {
      errors.push(`${key} must be between 0 and 100`)
    }
  })
  
  // Check for extreme values
  Object.entries(criteria).forEach(([key, value]) => {
    if (value < 10) {
      warnings.push(`${key} is very low (${value}). Consider if this is accurate.`)
    } else if (value > 95) {
      warnings.push(`${key} is very high (${value}). Consider if this is accurate.`)
    }
  })
  
  // Check for consistency
  const values = Object.values(criteria)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
  
  if (variance > 1000) { // High variance threshold
    warnings.push('Scores vary significantly across criteria. Please review for consistency.')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Compare user rating with average
 */
export function compareWithAverage(
  userRating: OscarRating,
  averageRating: OscarRating,
  totalRatings: number
): RatingComparison {
  const difference = userRating.overallScore - averageRating.overallScore
  const percentile = calculatePercentile(userRating.overallScore, averageRating.overallScore, totalRatings)
  
  return {
    userScore: userRating.overallScore,
    averageScore: averageRating.overallScore,
    difference,
    percentile
  }
}

/**
 * Calculate percentile (simplified)
 */
function calculatePercentile(userScore: number, averageScore: number, totalRatings: number): number {
  // Simplified percentile calculation
  // In a real implementation, you'd need the full distribution
  if (userScore > averageScore) {
    return Math.min(100, 50 + (userScore - averageScore) * 2)
  } else {
    return Math.max(0, 50 - (averageScore - userScore) * 2)
  }
}

/**
 * Get criteria descriptions
 */
export const CRITERIA_DESCRIPTIONS = {
  technicalSkill: {
    title: 'Technical Skill',
    description: 'Voice control, physical presence, technique mastery, and overall craft',
    examples: ['Accent work', 'Physical transformation', 'Vocal range', 'Timing and rhythm'],
    weight: 25
  },
  emotionalDepth: {
    title: 'Emotional Depth',
    description: 'Range of emotions, authenticity, vulnerability, and emotional truth',
    examples: ['Emotional range', 'Authentic reactions', 'Vulnerability', 'Emotional complexity'],
    weight: 25
  },
  characterTransformation: {
    title: 'Character Transformation',
    description: 'Physical/mental transformation, believability, and character embodiment',
    examples: ['Physical changes', 'Mental state portrayal', 'Character consistency', 'Believability'],
    weight: 25
  },
  storyImpact: {
    title: 'Story Impact',
    description: 'How essential the performance is to the film\'s narrative and emotional impact',
    examples: ['Narrative importance', 'Scene carrying', 'Emotional impact', 'Story enhancement'],
    weight: 15
  },
  difficultyFactor: {
    title: 'Difficulty Factor',
    description: 'Challenge of role including accents, physicality, historical accuracy',
    examples: ['Accent mastery', 'Physical demands', 'Historical accuracy', 'Role complexity'],
    weight: 10
  }
}

/**
 * Get performance examples for reference
 */
export const PERFORMANCE_EXAMPLES = {
  technicalSkill: [
    { name: 'Daniel Day-Lewis', movie: 'My Left Foot', year: 1989, score: 95 },
    { name: 'Meryl Streep', movie: 'Sophie\'s Choice', year: 1982, score: 92 },
    { name: 'Tom Hanks', movie: 'Forrest Gump', year: 1994, score: 88 }
  ],
  emotionalDepth: [
    { name: 'Joaquin Phoenix', movie: 'Joker', year: 2019, score: 94 },
    { name: 'Cate Blanchett', movie: 'Blue Jasmine', year: 2013, score: 91 },
    { name: 'Heath Ledger', movie: 'The Dark Knight', year: 2008, score: 93 }
  ],
  characterTransformation: [
    { name: 'Charlize Theron', movie: 'Monster', year: 2003, score: 96 },
    { name: 'Christian Bale', movie: 'The Machinist', year: 2004, score: 89 },
    { name: 'Robert De Niro', movie: 'Raging Bull', year: 1980, score: 94 }
  ],
  storyImpact: [
    { name: 'Anthony Hopkins', movie: 'The Silence of the Lambs', year: 1991, score: 93 },
    { name: 'Frances McDormand', movie: 'Fargo', year: 1996, score: 90 },
    { name: 'Jack Nicholson', movie: 'One Flew Over the Cuckoo\'s Nest', year: 1975, score: 92 }
  ],
  difficultyFactor: [
    { name: 'Forest Whitaker', movie: 'The Last King of Scotland', year: 2006, score: 91 },
    { name: 'Helen Mirren', movie: 'The Queen', year: 2006, score: 88 },
    { name: 'Philip Seymour Hoffman', movie: 'Capote', year: 2005, score: 90 }
  ]
}

/**
 * Calculate rating statistics
 */
export function calculateRatingStats(ratings: OscarRating[]) {
  if (ratings.length === 0) return null
  
  const scores = ratings.map(r => r.overallScore)
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const sorted = scores.sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  
  return {
    average: Math.round(avg),
    median,
    min,
    max,
    total: ratings.length,
    distribution: getScoreDistribution(scores)
  }
}

/**
 * Get score distribution
 */
function getScoreDistribution(scores: number[]) {
  const distribution = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0
  }
  
  scores.forEach(score => {
    if (score <= 20) distribution['0-20']++
    else if (score <= 40) distribution['21-40']++
    else if (score <= 60) distribution['41-60']++
    else if (score <= 80) distribution['61-80']++
    else distribution['81-100']++
  })
  
  return distribution
}

/**
 * Save draft rating to localStorage
 */
export function saveDraftRating(performanceId: string, criteria: OscarCriteria, comment: string) {
  const draft: DraftRating = {
    criteria,
    comment,
    performanceId,
    lastSaved: new Date().toISOString()
  }
  
  localStorage.setItem(`rating-draft-${performanceId}`, JSON.stringify(draft))
}

/**
 * Load draft rating from localStorage
 */
export function loadDraftRating(performanceId: string): DraftRating | null {
  const draft = localStorage.getItem(`rating-draft-${performanceId}`)
  return draft ? JSON.parse(draft) : null
}

/**
 * Clear draft rating
 */
export function clearDraftRating(performanceId: string) {
  localStorage.removeItem(`rating-draft-${performanceId}`)
}

/**
 * Check if draft exists and is recent (within 24 hours)
 */
export function hasRecentDraft(performanceId: string): boolean {
  const draft = loadDraftRating(performanceId)
  if (!draft) return false
  
  const lastSaved = new Date(draft.lastSaved)
  const now = new Date()
  const hoursDiff = (now.getTime() - lastSaved.getTime()) / (1000 * 60 * 60)
  
  return hoursDiff < 24
} 