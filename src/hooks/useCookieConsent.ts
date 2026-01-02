"use client"

import { useState, useEffect, useCallback } from 'react'
import { CookieConsent } from '@/types/cookies'

const COOKIE_CONSENT_KEY = 'cookie-consent'
const COOKIE_EXPIRY_DAYS = 365

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (stored) {
        const parsedConsent = JSON.parse(stored) as CookieConsent
        // Check if consent is still valid (not older than 365 days)
        const isExpired = Date.now() - parsedConsent.timestamp > COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        
        if (!isExpired) {
          setConsent(parsedConsent)
          applyConsentSettings(parsedConsent)
        } else {
          // Remove expired consent
          localStorage.removeItem(COOKIE_CONSENT_KEY)
          setShowBanner(true)
        }
      } else {
        setShowBanner(true)
      }
    } catch (error) {
      console.error('Error loading cookie consent:', error)
      setShowBanner(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Apply consent settings (analytics scripts are handled by GoogleAnalytics component)
  const applyConsentSettings = useCallback((consentData: CookieConsent) => {
    // Analytics consent is handled by the GoogleAnalytics component
    // which checks consent.analytics before loading scripts
    if (consentData.analytics) {
      // Analytics will be enabled when GoogleAnalytics component re-renders
    } else {
      // Analytics will be disabled when GoogleAnalytics component re-renders
    }

    if (consentData.marketing) {
      // Marketing cookies can be enabled here if needed
    } else {
      // Marketing cookies disabled
    }

    // Essential cookies are always enabled
  }, [])

  // Save consent to localStorage and apply settings
  const saveConsent = useCallback((consentData: CookieConsent) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData))
      setConsent(consentData)
      applyConsentSettings(consentData)
    } catch (error) {
      console.error('Error saving cookie consent:', error)
    }
  }, [applyConsentSettings])

  // Accept all cookies
  const acceptAll = useCallback(() => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now()
    }
    saveConsent(newConsent)
    setShowBanner(false)
    setShowSettings(false)
  }, [saveConsent])

  // Reject non-essential cookies
  const rejectAll = useCallback(() => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now()
    }
    saveConsent(newConsent)
    setShowBanner(false)
    setShowSettings(false)
  }, [saveConsent])

  // Update specific consent preferences
  const updateConsent = useCallback((updates: Partial<CookieConsent>) => {
    const newConsent: CookieConsent = {
      essential: true, // Always true
      analytics: updates.analytics ?? consent?.analytics ?? false,
      marketing: updates.marketing ?? consent?.marketing ?? false,
      timestamp: Date.now()
    }
    saveConsent(newConsent)
    setShowBanner(false)
    setShowSettings(false)
  }, [consent, saveConsent])

  // Modal controls
  const openSettings = useCallback(() => {
    setShowSettings(true)
  }, [])

  const closeSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  const closeBanner = useCallback(() => {
    setShowBanner(false)
  }, [])

  return {
    consent,
    isLoading,
    showBanner,
    showSettings,
    acceptAll,
    rejectAll,
    updateConsent,
    openSettings,
    closeSettings,
    closeBanner
  }
}
