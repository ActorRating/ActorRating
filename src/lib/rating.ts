import { PerformanceRating } from '@/types'

export const RATING_CRITERIA = {
  emotionalRangeDepth: {
    label: 'Emotional Range & Depth',
    weight: 0.25,
    description: 'How convincingly the actor portrays different emotions and the complexity they bring to emotional moments',
  },
  characterBelievability: {
    label: 'Character Believability',
    weight: 0.25,
    description: 'How completely the actor transforms into and embodies the character - do you forget you\'re watching an actor?',
  },
  technicalSkill: {
    label: 'Technical Skill',
    weight: 0.20,
    description: 'Voice work, physicality, timing, dialogue delivery, and overall craft/technique',
  },
  screenPresence: {
    label: 'Screen Presence',
    weight: 0.15,
    description: 'Charisma, magnetism, and ability to command attention when on screen',
  },
  chemistryInteraction: {
    label: 'Chemistry & Interaction',
    weight: 0.15,
    description: 'How well they connect with other actors, react authentically, and work within scenes',
  },
} as const

export function calculateWeightedScore(rating: PerformanceRating): number {
  const { emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction } = rating
  
  return (
    emotionalRangeDepth * RATING_CRITERIA.emotionalRangeDepth.weight +
    characterBelievability * RATING_CRITERIA.characterBelievability.weight +
    technicalSkill * RATING_CRITERIA.technicalSkill.weight +
    screenPresence * RATING_CRITERIA.screenPresence.weight +
    chemistryInteraction * RATING_CRITERIA.chemistryInteraction.weight
  )
}

export function calculateAverageScore(rating: PerformanceRating): number {
  const { emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction } = rating
  
  return Math.round(
    (emotionalRangeDepth + characterBelievability + technicalSkill + screenPresence + chemistryInteraction) / 5
  )
}

export function getRatingLabel(score: number): string {
  if (score >= 90) return 'Outstanding'
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Average'
  if (score >= 50) return 'Below Average'
  return 'Poor'
}

export function getRatingColor(score: number): string {
  if (score >= 90) return 'text-green-400'
  if (score >= 80) return 'text-blue-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 60) return 'text-orange-400'
  return 'text-red-400'
}

export function formatScore(score: number): string {
  return `${score}/100`
}

export function getRatingDescription(score: number): string {
  if (score >= 90) return 'Award-worthy performance that will be remembered for generations'
  if (score >= 80) return 'Exceptional work that elevates the entire film'
  if (score >= 70) return 'Strong performance that effectively serves the story'
  if (score >= 60) return 'Competent work that meets the basic requirements'
  if (score >= 50) return 'Somewhat lacking in depth or technical execution'
  return 'Significant issues with performance quality'
} 