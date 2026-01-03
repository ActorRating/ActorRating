"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Send, CheckCircle, X } from 'lucide-react'

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

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="relative rounded-full w-14 h-14 sm:w-14 sm:h-14 min-w-[56px] min-h-[56px] p-0 border border-transparent bg-[#1a1a1a] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-[#FFD700]/30 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] group flex items-center justify-center touch-manipulation"
              style={{
                boxShadow: `
                  0 15px 40px -10px rgba(0, 0, 0, 0.8),
                  0 8px 20px -5px rgba(0, 0, 0, 0.6),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                `,
                transform: 'translateY(-3px) perspective(1000px) rotateX(1deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/15 rounded-full blur-3xl" />
              </div>
              <MessageSquare className="w-5 h-5 text-white group-hover:text-white transition-colors duration-200 relative z-10" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4 
            }}
            className="fixed bottom-6 right-6 z-40 w-80 max-w-[calc(100vw-2rem)]"
            style={{
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
        <div
          className="relative bg-[rgba(10,10,10,0.85)] backdrop-blur-xl border border-transparent rounded-[2rem] p-6 transition-all duration-300"
          style={{
            boxShadow: `
              0 25px 70px -15px rgba(0, 0, 0, 0.9),
              0 15px 40px -10px rgba(0, 0, 0, 0.7),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
              inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
            `,
            transform: 'translateY(-6px) perspective(1000px) rotateX(1.5deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Ambient glow effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none rounded-[2rem] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/20 rounded-full blur-3xl" />
          </div>

          {isSubmitted ? (
            <div className="text-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white mb-2">Thank you!</h3>
              <p className="text-sm text-[#a3a3a3]">
                Your feedback has been sent successfully.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#FFD700]" />
                  Send Feedback
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="relative rounded-full w-10 h-10 flex items-center justify-center border border-transparent bg-[#1a1a1a]/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-[#FFD700]/30 hover:bg-[#1a1a1a]/70 hover:shadow-[0_0_15px_rgba(255,215,0,0.2)] group min-h-[48px] min-w-[48px]"
                  style={{
                    boxShadow: `
                      0 8px 20px -5px rgba(0, 0, 0, 0.6),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
                    `,
                  }}
                  aria-label="Close feedback form"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#FFD700]/15 rounded-full blur-2xl" />
                  </div>
                  <X className="w-5 h-5 text-gray-300 group-hover:text-[#FFD700] transition-colors duration-200 relative z-10" aria-hidden="true" />
                </button>
              </div>

          {!isFormspreeConfigured && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⚠️ Feedback form is not configured. Please contact the administrator.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us what you think..."
                required
                rows={4}
                className="w-full px-4 py-3 bg-[rgba(26,26,26,0.6)] border border-white/10 rounded-xl text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/30 resize-none transition-all duration-200 backdrop-blur-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-[rgba(26,26,26,0.6)] border border-white/10 rounded-xl text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-[rgba(26,26,26,0.6)] border border-white/10 rounded-xl text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-white/20 text-white hover:border-white/40 hover:bg-white/5"
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
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
