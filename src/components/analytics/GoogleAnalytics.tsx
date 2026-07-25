"use client"

import { useEffect } from 'react'
import { useCookieConsentContext } from '@/components/providers/CookieConsentProvider'
import Script from 'next/script'

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

export function GoogleAnalytics() {
  const { consent, isLoading } = useCookieConsentContext()
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-C3JQQH5F83"

  // Initialize dataLayer
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.dataLayer) {
      window.dataLayer = []
    }
  }, [])

  // Root layout already loads GA4 for all routes. This component is kept for
  // optional consent-gated re-init; skip duplicate injection when scripts exist.
  if (isLoading || !consent?.analytics) {
    return null
  }

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
            });
          `,
        }}
      />
    </>
  )
}

// Helper function to track page views (can be used in other components)
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID?.trim() || 'G-C3JQQH5F83', {
      page_path: url,
    })
  }
}

// Helper function to track events
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

