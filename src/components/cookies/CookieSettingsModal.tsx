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

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Premium Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={closeSettings}
      />
      
      {/* Elegant Modal */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#1a1a1a]/98 via-[#0f0f0f]/95 to-black/98 backdrop-blur-xl rounded-2xl shadow-[0_0_100px_rgba(255,215,0,0.15)] border border-[#FFD700]/20">
          {/* Ambient glow effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none rounded-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/20 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between p-6 sm:p-8 border-b border-[#FFD700]/10">
            <h2 
              className="text-2xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Cookie Settings
            </h2>
            <button
              onClick={closeSettings}
              className="text-[#a3a3a3] hover:text-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700] rounded-lg p-2 transition-all duration-300 hover:bg-[#FFD700]/10"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="relative p-6 sm:p-8">
            <p className="text-base text-[#a3a3a3] mb-8 leading-relaxed">
              We use cookies to enhance your experience. You can choose which categories 
              of cookies you allow us to use. Please note that blocking some types of cookies may impact 
              your experience of the site and the services we are able to offer.
            </p>

            <div className="space-y-5">
              {cookieCategories.map((category) => (
                <div key={category.id} className="group relative p-5 sm:p-6 rounded-xl border border-[#FFD700]/15 bg-black/40 backdrop-blur-sm hover:border-[#FFD700]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.1)]">
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
                          <div className="w-11 h-6 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full relative shadow-[0_0_20px_rgba(255,215,0,0.3)]">
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
                            <div className={`w-11 h-6 rounded-full transition-all duration-300 ${
                              preferences[category.id as 'analytics' | 'marketing'] 
                                ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                                : 'bg-[#2a2a2a]'
                            }`}>
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
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-6 sm:p-8 border-t border-[#FFD700]/10">
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-6 py-3 text-base font-bold text-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] border border-transparent rounded-full hover:shadow-[0_0_25px_rgba(255,215,0,0.25)] transition-all duration-300 uppercase tracking-wider"
            >
              Accept All
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 text-base font-bold text-[#FFD700] bg-black/50 border-2 border-[#FFD700]/40 rounded-full hover:bg-[#FFD700]/10 hover:border-[#FFD700] transition-all duration-300 uppercase tracking-wider"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}