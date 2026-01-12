"use client"

import { useState, useEffect } from 'react'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'
import { CookieCategoryInfo } from '@/types/cookies'

const cookieCategories: CookieCategoryInfo[] = [
  {
    id: 'essential',
    title: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you such as setting your privacy preferences, logging in or filling in forms.',
    required: true
  },
  {
    id: 'analytics',
    title: 'Analytics Cookies',
    description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are most and least popular and see how visitors move around the site.',
    required: false
  },
  {
    id: 'marketing',
    title: 'Marketing Cookies',
    description: 'These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites.',
    required: false
  }
]

export function CookieSettingsModal() {
  const { showSettings, consent, updateConsent, closeSettings } = useCookieConsentContext()
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false
  })

  // Update local preferences when consent changes
  useEffect(() => {
    if (consent) {
      setPreferences({
        essential: consent.essential,
        analytics: consent.analytics,
        marketing: consent.marketing
      })
    }
  }, [consent])

  const handleToggle = (category: 'analytics' | 'marketing') => {
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const handleSave = () => {
    updateConsent({
      analytics: preferences.analytics,
      marketing: preferences.marketing
    })
  }

  const handleAcceptAll = () => {
    setPreferences({
      essential: true,
      analytics: true,
      marketing: true
    })
    updateConsent({
      analytics: true,
      marketing: true
    })
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showSettings) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [showSettings])

  if (!showSettings) return null

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity pointer-events-auto"
        onClick={closeSettings}
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Modal Container - Centered in viewport, Fixed Height */}
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] border border-transparent overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        style={{
          position: 'relative',
          background: 'linear-gradient(to bottom right, rgba(26, 26, 26, 0.95), rgba(15, 15, 15, 0.90), rgba(0, 0, 0, 0.95))',
          backdropFilter: 'blur(24px)',
          boxShadow: `
            0 25px 70px -15px rgba(0, 0, 0, 0.9),
            0 15px 40px -10px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
          `,
        }}
      >
        {/* Header - Fixed */}
        <div className="relative flex items-center justify-between p-6 sm:p-8 border-b border-white/10 flex-shrink-0">
          <h2 
            id="cookie-settings-title"
            className="text-2xl sm:text-3xl font-bold text-white"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            Cookie Settings
          </h2>
          <button
            onClick={closeSettings}
            className="text-[#a3a3a3] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg p-2 transition-all duration-300 hover:bg-white/5"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-h-0">
          <p className="text-base text-[#a3a3a3] mb-8 leading-relaxed">
            We use cookies to enhance your experience. You can choose which categories 
            of cookies you allow us to use. Please note that blocking some types of cookies may impact 
            your experience of the site and the services we are able to offer.
          </p>

          <div className="space-y-5">
            {cookieCategories.map((category) => (
              <div 
                key={category.id} 
                className="group relative rounded-[2rem] border border-transparent overflow-hidden transition-all duration-300"
                style={{
                  background: 'linear-gradient(to bottom right, rgba(26, 26, 26, 0.95), rgba(15, 15, 15, 0.90), rgba(0, 0, 0, 0.95))',
                  backdropFilter: 'blur(24px)',
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                }}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 
                        className="text-base sm:text-lg font-bold text-white mb-2"
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        {category.title}
                      </h3>
                      <p className="text-sm text-[#a3a3a3] leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      {category.required ? (
                        <div className="flex flex-col items-end gap-1">
                          <div 
                            className="w-11 h-6 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full relative"
                          >
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                          </div>
                          <span className="text-xs text-[#FFD700] font-medium">Always On</span>
                        </div>
                      ) : (
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={preferences[category.id as 'analytics' | 'marketing']}
                              onChange={() => handleToggle(category.id as 'analytics' | 'marketing')}
                              className="sr-only"
                            />
                            <div 
                              className={`w-11 h-6 rounded-full transition-all duration-300 ${
                                preferences[category.id as 'analytics' | 'marketing'] 
                                  ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]' 
                                  : 'bg-[#2a2a2a]'
                              }`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                                preferences[category.id as 'analytics' | 'marketing']
                                  ? 'right-1'
                                  : 'left-1'
                              }`}></div>
                            </div>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-6 sm:p-8 border-t border-white/10 flex-shrink-0">
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-6 py-3 text-base font-bold text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] border border-transparent rounded-full transition-all duration-300 uppercase tracking-wider"
          >
            Accept All
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 text-base font-bold text-white bg-black/50 border-2 border-white/20 rounded-full hover:bg-white/5 hover:border-white/30 transition-all duration-300 uppercase tracking-wider"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
