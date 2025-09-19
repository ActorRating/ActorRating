"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import { PerformanceSlider } from "./PerformanceSlider"
import { GiClapperboard, GiHeartWings } from "react-icons/gi"
import { FaStar, FaHandshake, FaUserSecret } from "react-icons/fa"
import { useRecaptchaV3 } from "@/components/auth/ReCaptcha"
import { motion } from "framer-motion"
import { fadeInUp, staggerContainer, getMotionProps } from "@/lib/animations"

interface PerformanceRating {
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
}

interface PerformanceRatingFormProps {
  actorName: string
  movieTitle: string
  movieYear: number
  onSubmit: (rating: PerformanceRating) => void
  isLoading?: boolean
  onError?: (error: string) => void
}

export function PerformanceRatingForm({
  actorName,
  movieTitle,
  movieYear,
  onSubmit,
  isLoading = false,
  onError,
}: PerformanceRatingFormProps) {
  const [rating, setRating] = useState<PerformanceRating>({
    emotionalRangeDepth: 50,
    characterBelievability: 50,
    technicalSkill: 50,
    screenPresence: 50,
    chemistryInteraction: 50,
    comment: "",
  })
  const [isRecaptchaLoading, setIsRecaptchaLoading] = useState(false)
  const { executeRecaptcha } = useRecaptchaV3()

  const averageRating = (
    (rating.emotionalRangeDepth +
      rating.characterBelievability +
      rating.technicalSkill +
      rating.screenPresence +
      rating.chemistryInteraction) /
      5
  )

  // Memoized onChange handlers to prevent unnecessary re-renders
  const handleEmotionalRangeChange = useCallback((value: number) => {
    setRating((prev) => ({ ...prev, emotionalRangeDepth: value }))
  }, [])

  const handleCharacterBelievabilityChange = useCallback((value: number) => {
    setRating((prev) => ({ ...prev, characterBelievability: value }))
  }, [])

  const handleTechnicalSkillChange = useCallback((value: number) => {
    setRating((prev) => ({ ...prev, technicalSkill: value }))
  }, [])

  const handleScreenPresenceChange = useCallback((value: number) => {
    setRating((prev) => ({ ...prev, screenPresence: value }))
  }, [])

  const handleChemistryInteractionChange = useCallback((value: number) => {
    setRating((prev) => ({ ...prev, chemistryInteraction: value }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsRecaptchaLoading(true)
    try {
      // Execute reCAPTCHA v3
      const token = await executeRecaptcha("submit_rating")
      
      // Include token in the rating data
      const ratingWithToken = {
        ...rating,
        recaptchaToken: token
      }
      
      onSubmit(ratingWithToken)
    } catch (error) {
      console.error("reCAPTCHA error:", error)
      const errorMessage = "reCAPTCHA verification failed. Please try again."
      onError?.(errorMessage)
    } finally {
      setIsRecaptchaLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div variants={fadeInUp} {...getMotionProps()} className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Rate Performance
        </h1>
        <p className="text-xl text-muted-foreground">
          {actorName} in &quot;{movieTitle}&quot; ({movieYear})
        </p>
        <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-lg font-semibold text-primary">
            Average Rating: {averageRating.toFixed(1)}/100
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <motion.div variants={fadeInUp} {...getMotionProps()} className="bg-secondary rounded-2xl border border-border p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Performance Rating</h2>
            <p className="text-muted-foreground">Rate this performance across five key criteria</p>
          </div>

          <div className="space-y-8">
            <PerformanceSlider
              label="Emotional Range & Depth"
              value={rating.emotionalRangeDepth}
              onChange={handleEmotionalRangeChange}
              icon={<GiHeartWings className="w-6 h-6" />}
              description="How convincingly the actor portrays different emotions and the complexity they bring to emotional moments"
            />

            <PerformanceSlider
              label="Character Believability"
              value={rating.characterBelievability}
              onChange={handleCharacterBelievabilityChange}
              icon={<FaUserSecret className="w-6 h-6" />}
              description="How completely the actor transforms into and embodies the character - do you forget you're watching an actor?"
            />

            <PerformanceSlider
              label="Technical Skill"
              value={rating.technicalSkill}
              onChange={handleTechnicalSkillChange}
              icon={<GiClapperboard className="w-6 h-6" />}
              description="Voice work, physicality, timing, dialogue delivery, and overall craft/technique"
            />

            <PerformanceSlider
              label="Screen Presence"
              value={rating.screenPresence}
              onChange={handleScreenPresenceChange}
              icon={<FaStar className="w-6 h-6" />}
              description="Charisma, magnetism, and ability to command attention when on screen"
            />

            <PerformanceSlider
              label="Chemistry & Interaction"
              value={rating.chemistryInteraction}
              onChange={handleChemistryInteractionChange}
              icon={<FaHandshake className="w-6 h-6" />}
              description="How well they connect with other actors, react authentically, and work within scenes"
            />
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} {...getMotionProps()} className="bg-secondary p-6 rounded-xl border border-border">
          <label htmlFor="comment" className="block text-sm font-medium text-foreground mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            id="comment"
            value={rating.comment}
            onChange={(e) =>
              setRating((prev) => ({ ...prev, comment: e.target.value }))
            }
            rows={4}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Share your thoughts on this performance..."
          />
        </motion.div>

        <div className="flex justify-center">
          <Button
            type="submit"
            variant="premium"
            size="lg"
            disabled={isLoading || isRecaptchaLoading}
            className="px-8 py-3 text-lg"
          >
            {isLoading || isRecaptchaLoading ? "Verifying..." : "Submit Performance Rating"}
          </Button>
        </div>
      </form>
    </div>
  )
} 