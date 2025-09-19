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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={closeSettings}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-secondary/95 backdrop-blur-md rounded-lg shadow-2xl border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">
              Cookie Settings
            </h2>
            <button
              onClick={closeSettings}
              className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-6">
              We use cookies to enhance your experience on our website. You can choose which categories 
              of cookies you allow us to use. Please note that blocking some types of cookies may impact 
              your experience of the site and the services we are able to offer.
            </p>

            <div className="space-y-6">
              {cookieCategories.map((category) => (
                <div key={category.id} className="border border-border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-foreground mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                    
                    <div className="ml-4">
                      {category.required ? (
                        <div className="flex items-center">
                          <div className="w-11 h-6 bg-primary rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                          </div>
                          <span className="ml-2 text-xs text-muted-foreground">Always On</span>
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
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              preferences[category.id as 'analytics' | 'marketing'] 
                                ? 'bg-primary' 
                                : 'bg-muted'
                            }`}>
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
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
          <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-border">
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Accept All
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-md hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}