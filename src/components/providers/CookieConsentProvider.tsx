"use client"

import { createContext, useContext } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import { CookieConsentContextType } from '@/types/cookies'
import { CookieBanner, CookieSettingsModal } from '@/components/cookies'

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

export function useCookieConsentContext() {
  const context = useContext(CookieConsentContext)
  if (context === undefined) {
    throw new Error('useCookieConsentContext must be used within a CookieConsentProvider')
  }
  return context
}

interface CookieConsentProviderProps {
  children: React.ReactNode
}

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const cookieConsentData = useCookieConsent()

  return (
    <CookieConsentContext.Provider value={cookieConsentData}>
      {children}
      <CookieBanner />
      <CookieSettingsModal />
    </CookieConsentContext.Provider>
  )
}
