"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@supabase/auth-helpers-react"
import { Button } from "@/components/ui/Button"
import { RatingSlider } from "./RatingSlider"
import { OverallScore } from "./RatingDisplay"
import { 
  OscarCriteria, 
  OscarRating, 
  RatingFormProps,
  RatingFormState,
  RatingConfirmationModalProps
} from "@/types/rating"
import { 
  calculateOverallScore, 
  validateRating, 
  saveDraftRating, 
  loadDraftRating, 
  clearDraftRating,
  hasRecentDraft,
  CRITERIA_DESCRIPTIONS,
  DEFAULT_WEIGHTS
} from "@/utils/ratingCalculator"
import { 
  GiClapperboard, 
  GiHeartWings, 
  GiTheater, 
  GiFilmProjector, 
  GiTrophy 
} from "react-icons/gi"
import { 
  FaUndo, 
  FaSave, 
  FaCheck, 
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes
} from "react-icons/fa"

// Rating Confirmation Modal
function RatingConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  rating, 
  performance 
}: RatingConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl p-6 max-w-md w-full border border-border">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <OverallScore score={rating.overallScore} size="medium" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Confirm Your Rating
          </h3>
          <p className="text-muted-foreground">
            {performance.actor.name} in "{performance.movie.title}" as {performance.comment || 'Unknown Character'} ({performance.movie.year})
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="text-sm">
            <strong>Overall Score:</strong> {rating.overallScore}/100
          </div>
          {rating.comment && (
            <div className="text-sm">
              <strong>Comment:</strong> {rating.comment}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <FaTimes className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="premium"
            onClick={onConfirm}
            className="flex-1"
          >
            <FaCheck className="w-4 h-4 mr-2" />
            Confirm Rating
          </Button>
        </div>
      </div>
    </div>
  )
}

// Main Rating Form Component
export function RatingForm({
  performance,
  onSubmit,
  onCancel,
  initialRating,
  isEditing = false
}: RatingFormProps) {
  const { user } = useUser()
  const [formState, setFormState] = useState<RatingFormState>({
    criteria: {
      technicalSkill: 50,
      emotionalDepth: 50,
      characterTransformation: 50,
      storyImpact: 50,
      difficultyFactor: 50
    },
    comment: "",
    isSubmitting: false,
    hasChanges: false
  })
  const [validation, setValidation] = useState(validateRating(formState.criteria))
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showDraftRestore, setShowDraftRestore] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)

  // Calculate overall score
  const overallScore = calculateOverallScore(formState.criteria, DEFAULT_WEIGHTS)

  // Load initial data
  useEffect(() => {
    if (initialRating) {
      setFormState(prev => ({
        ...prev,
        criteria: initialRating.criteria,
        comment: initialRating.comment || ""
      }))
    } else {
      // Check for draft
      const draft = loadDraftRating(performance.id)
      if (draft && hasRecentDraft(performance.id)) {
        setDraftData(draft)
        setShowDraftRestore(true)
      }
    }
  }, [initialRating, performance.id])

  // Validate on criteria change
  useEffect(() => {
    setValidation(validateRating(formState.criteria))
  }, [formState.criteria])

  // Auto-save draft
  useEffect(() => {
    if (formState.hasChanges && !isEditing) {
      const timer = setTimeout(() => {
        saveDraftRating(performance.id, formState.criteria, formState.comment)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [formState, performance.id, isEditing])

  // Handle criteria change
  const handleCriteriaChange = useCallback((criterion: keyof OscarCriteria, value: number) => {
    setFormState(prev => ({
      ...prev,
      criteria: { ...prev.criteria, [criterion]: value },
      hasChanges: true
    }))
  }, [])

  // Handle comment change
  const handleCommentChange = useCallback((comment: string) => {
    setFormState(prev => ({
      ...prev,
      comment,
      hasChanges: true
    }))
  }, [])

  // Restore draft
  const handleRestoreDraft = useCallback(() => {
    if (draftData) {
      setFormState(prev => ({
        ...prev,
        criteria: draftData.criteria,
        comment: draftData.comment,
        hasChanges: false
      }))
      setShowDraftRestore(false)
      setDraftData(null)
    }
  }, [draftData])

  // Reset form
  const handleReset = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      criteria: {
        technicalSkill: 50,
        emotionalDepth: 50,
        characterTransformation: 50,
        storyImpact: 50,
        difficultyFactor: 50
      },
      comment: "",
      hasChanges: false
    }))
    clearDraftRating(performance.id)
  }, [performance.id])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation.isValid) {
      return
    }

    setShowConfirmation(true)
  }, [validation.isValid])

  // Confirm submission
  const handleConfirmSubmission = useCallback(async () => {
    setFormState(prev => ({ ...prev, isSubmitting: true }))
    setShowConfirmation(false)

    try {
      const rating: OscarRating = {
        criteria: formState.criteria,
        overallScore,
        comment: formState.comment || undefined,
        performanceId: performance.id,
        userId: user?.id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await onSubmit(rating)
      
      // Clear draft on successful submission
      clearDraftRating(performance.id)
      
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        hasChanges: false
      }))
    } catch (error) {
      console.error('Rating submission failed:', error)
      setFormState(prev => ({ ...prev, isSubmitting: false }))
    }
  }, [formState, overallScore, performance.id, user?.id, onSubmit])

  // Oscar criteria configuration
  const criteriaConfig = [
    {
      key: 'technicalSkill' as keyof OscarCriteria,
      label: 'Technical Skill',
      description: 'Voice control, physical presence, technique mastery, and overall craft',
      icon: <GiClapperboard className="w-6 h-6" />,
      weight: DEFAULT_WEIGHTS.technicalSkill * 100
    },
    {
      key: 'emotionalDepth' as keyof OscarCriteria,
      label: 'Emotional Depth',
      description: 'Range of emotions, authenticity, vulnerability, and emotional truth',
      icon: <GiHeartWings className="w-6 h-6" />,
      weight: DEFAULT_WEIGHTS.emotionalDepth * 100
    },
    {
      key: 'characterTransformation' as keyof OscarCriteria,
      label: 'Character Transformation',
      description: 'Physical/mental transformation, believability, and character embodiment',
      icon: <GiTheater className="w-6 h-6" />,
      weight: DEFAULT_WEIGHTS.characterTransformation * 100
    },
    {
      key: 'storyImpact' as keyof OscarCriteria,
      label: 'Story Impact',
      description: 'How essential the performance is to the film\'s narrative and emotional impact',
      icon: <GiFilmProjector className="w-6 h-6" />,
      weight: DEFAULT_WEIGHTS.storyImpact * 100
    },
    {
      key: 'difficultyFactor' as keyof OscarCriteria,
      label: 'Difficulty Factor',
      description: 'Challenge of role including accents, physicality, historical accuracy',
      icon: <GiTrophy className="w-6 h-6" />,
      weight: DEFAULT_WEIGHTS.difficultyFactor * 100
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isEditing ? 'Edit' : 'Rate'} Performance
        </h1>
        <div className="text-xl text-muted-foreground mb-4">
          {performance.actor.name} in "{performance.movie.title}" as {performance.comment || 'Unknown Character'} ({performance.movie.year})
        </div>
        
        {/* Performance info */}
        <div className="bg-secondary p-4 rounded-lg border border-border max-w-md mx-auto">
          <div className="flex items-center justify-center gap-4">
            {performance.actor.imageUrl && (
              <img 
                src={performance.actor.imageUrl} 
                alt={performance.actor.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="text-left">
              <div className="font-semibold text-foreground">{performance.actor.name}</div>
              <div className="text-sm text-muted-foreground">
                in &quot;{performance.movie.title}&quot; as {performance.comment || 'Unknown Character'} ({performance.movie.year})
              </div>
              {performance.movie.director && (
                <div className="text-xs text-muted-foreground">
                  Directed by {performance.movie.director}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Draft restore notification */}
      {showDraftRestore && draftData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaInfoCircle className="text-blue-600" />
              <span className="text-blue-800">
                You have a saved draft from {new Date(draftData.lastSaved).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDraftRestore(false)}
              >
                Dismiss
              </Button>
              <Button
                variant="premium"
                size="sm"
                onClick={handleRestoreDraft}
              >
                Restore Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overall Score Display */}
      <div className="flex justify-center mb-8">
        <div className="text-center">
          <OverallScore 
            score={overallScore} 
            size="large" 
            animated={true}
          />
          <div className="mt-2 text-sm text-muted-foreground">
            Weighted average based on Oscar criteria
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaExclamationTriangle className="text-red-600" />
            <span className="font-semibold text-red-800">Please fix the following errors:</span>
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FaExclamationTriangle className="text-yellow-600" />
            <span className="font-semibold text-yellow-800">Consider the following:</span>
          </div>
          <ul className="text-yellow-700 text-sm space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Oscar Criteria Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {criteriaConfig.map((criterion) => (
            <RatingSlider
              key={criterion.key}
              criterion={criterion.key}
              value={formState.criteria[criterion.key]}
              onChange={(value) => handleCriteriaChange(criterion.key, value)}
              weight={criterion.weight}
              label={criterion.label}
              description={criterion.description}
              icon={criterion.icon}
              tooltip={CRITERIA_DESCRIPTIONS[criterion.key].description}
              disabled={formState.isSubmitting}
            />
          ))}
        </div>

        {/* Comment Section */}
        <div className="bg-secondary p-6 rounded-xl border border-border">
          <label htmlFor="comment" className="block text-sm font-medium text-foreground mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            id="comment"
            value={formState.comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Share your thoughts on this performance, memorable scenes, or what made it stand out..."
            disabled={formState.isSubmitting}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Your comment will be visible to other users
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={formState.isSubmitting}
            className="flex items-center gap-2"
          >
            <FaUndo className="w-4 h-4" />
            Reset
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={formState.isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            variant="premium"
            size="lg"
            disabled={formState.isSubmitting || !validation.isValid}
            className="flex items-center gap-2 px-8 py-3 text-lg"
          >
            {formState.isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <FaCheck className="w-4 h-4" />
                {isEditing ? 'Update' : 'Submit'} Rating
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <RatingConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSubmission}
        rating={{
          criteria: formState.criteria,
          overallScore,
          comment: formState.comment || undefined,
          performanceId: performance.id,
          userId: user?.id || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }}
        performance={performance}
      />
    </div>
  )
} 