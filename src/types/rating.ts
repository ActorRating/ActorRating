export interface OscarCriteria {
  technicalSkill: number
  emotionalDepth: number
  characterTransformation: number
  storyImpact: number
  difficultyFactor: number
}

export interface OscarRating {
  criteria: OscarCriteria
  overallScore: number
  comment?: string
  performanceId: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface RatingWeights {
  technicalSkill: number
  emotionalDepth: number
  characterTransformation: number
  storyImpact: number
  difficultyFactor: number
}

export interface RatingScore {
  score: number
  level: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent' | 'Outstanding'
  color: string
  description: string
}

export interface RatingComparison {
  userScore: number
  averageScore: number
  difference: number
  percentile: number
}

export interface RatingHistory {
  performanceId: string
  rating: OscarRating
  performance: {
    actor: {
      name: string
      imageUrl?: string
    }
    movie: {
      title: string
      year: number
    }
    comment?: string
  }
}

export interface RatingFormState {
  criteria: OscarCriteria
  comment: string
  isSubmitting: boolean
  hasChanges: boolean
}

export interface RatingSliderProps {
  criterion: keyof OscarCriteria
  value: number
  onChange: (value: number) => void
  weight: number
  label: string
  description?: string
  icon: React.ReactNode
  tooltip?: string
  disabled?: boolean
}

export interface RatingDisplayProps {
  rating: OscarRating
  showBreakdown?: boolean
  showComparison?: boolean
  compact?: boolean
}

export interface OverallScoreProps {
  score: number
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
  animated?: boolean
}

export interface CriteriaBreakdownProps {
  criteria: OscarCriteria
  weights: RatingWeights
  showWeights?: boolean
  showScores?: boolean
}

export interface RatingComparisonProps {
  userRating: OscarRating
  averageRating?: OscarRating
  totalRatings?: number
}

export interface RatingHistoryProps {
  ratings: RatingHistory[]
  maxDisplay?: number
}

export interface AverageRatingProps {
  performanceId: string
  ratings: OscarRating[]
}

export interface RatingConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  rating: OscarRating
  performance: {
    actor: { name: string }
    movie: { title: string; year: number }
    comment?: string
  }
}

export interface DraftRating {
  criteria: OscarCriteria
  comment: string
  performanceId: string
  lastSaved: string
}

export interface RatingValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface PerformanceInfo {
  id: string
  actor: {
    name: string
    imageUrl?: string
  }
  movie: {
    title: string
    year: number
    director?: string
    genre?: string
  }
  comment?: string
  averageRating?: number
  totalRatings?: number
}

export interface RatingFormProps {
  performance: PerformanceInfo
  onSubmit: (rating: OscarRating) => Promise<void>
  onCancel?: () => void
  initialRating?: OscarRating
  isEditing?: boolean
} 