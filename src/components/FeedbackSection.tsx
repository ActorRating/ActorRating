"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Send, CheckCircle } from 'lucide-react'

// Replace with your actual Formspree form ID
const FORMSPREE_FORM_ID = process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID

// Check if Formspree is properly configured
const isFormspreeConfigured = FORMSPREE_FORM_ID && FORMSPREE_FORM_ID !== 'YOUR_FORMSPREE_FORM_ID' && FORMSPREE_FORM_ID !== 'YOUR_FORM_ID'

export function FeedbackSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    message: '',
    name: '',
    email: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if Formspree is configured
    if (!isFormspreeConfigured) {
      alert('Feedback form is not configured yet. Please contact the administrator.')
      return
    }
    
    setIsSubmitting(true)

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          message: formData.message,
          _subject: 'New Feedback - ActorRating.com'
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ message: '', name: '', email: '' })
        setTimeout(() => {
          setIsSubmitted(false)
          setIsOpen(false)
        }, 3000)
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          variant="premium"
          size="lg"
          className="rounded-full px-6 py-3 feedback-button-shadow relative group"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Feedback
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 right-6 z-50 bg-background border border-border rounded-2xl shadow-2xl p-6 w-80 max-w-[calc(100vw-2rem)]"
    >
      {isSubmitted ? (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Thank you!</h3>
          <p className="text-sm text-muted-foreground">
            Your feedback has been sent successfully.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Send Feedback
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              ✕
            </button>
          </div>

          {!isFormspreeConfigured && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Feedback form is not configured. Please contact the administrator.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us what you think..."
                required
                rows={4}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="premium"
                disabled={isSubmitting || !formData.message.trim() || !isFormspreeConfigured}
                className="flex-1"
              >
                {isSubmitting ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  )
}
