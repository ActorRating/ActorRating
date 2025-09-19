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

  // Apply consent settings (simulate enabling/disabling scripts)
  const applyConsentSettings = useCallback((consentData: CookieConsent) => {
    if (consentData.analytics) {
      console.log('Analytics cookies enabled - would initialize analytics scripts here')
      // Example: gtag('config', 'GA_TRACKING_ID')
    } else {
      console.log('Analytics cookies disabled - would disable analytics scripts here')
      // Example: gtag('config', 'GA_TRACKING_ID', { 'anonymize_ip': true })
    }

    if (consentData.marketing) {
      console.log('Marketing cookies enabled - would initialize marketing scripts here')
      // Example: Enable Facebook Pixel, Google Ads, etc.
    } else {
      console.log('Marketing cookies disabled - would disable marketing scripts here')
    }

    // Essential cookies are always enabled
    console.log('Essential cookies enabled - required for site functionality')
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
