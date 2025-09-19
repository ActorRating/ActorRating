export interface CookieConsent {
  essential: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

export interface CookieConsentContextType {
  consent: CookieConsent | null
  isLoading: boolean
  showBanner: boolean
  showSettings: boolean
  acceptAll: () => void
  rejectAll: () => void
  updateConsent: (consent: Partial<CookieConsent>) => void
  openSettings: () => void
  closeSettings: () => void
  closeBanner: () => void
}

export type CookieCategory = 'essential' | 'analytics' | 'marketing'

export interface CookieCategoryInfo {
  id: CookieCategory
  title: string
  description: string
  required: boolean
}
