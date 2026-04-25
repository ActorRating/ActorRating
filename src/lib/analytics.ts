/**
 * Google Analytics 4 (GA4) Event Tracking
 * All events are wrapped with safety checks to prevent errors
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

type MixpanelEventDetail = {
  event: string
  payload?: Record<string, any>
}

/**
 * Safety check wrapper for gtag calls
 */
function safeGtag(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams)
  }
}

/**
 * Dispatch custom Mixpanel track events from one analytics hub.
 * Mixpanel provider listens to this event and forwards it to SDK.
 */
function safeMixpanelTrack(event: string, payload?: Record<string, any>) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<MixpanelEventDetail>("mixpanel:track", {
      detail: { event, payload },
    })
  )
}

/**
 * 1. Signup Success Event
 * Fires when user successfully completes signup (Google or email)
 */
export function trackSignUp(method: 'google' | 'email') {
  safeGtag('sign_up', {
    method
  })
  safeMixpanelTrack("Sign Up", { signup_method: method })
}

/**
 * Sign In Event
 * Fires when user successfully signs into an existing account.
 */
export function trackSignIn(method: 'google' | 'email', success = true) {
  safeGtag('login', {
    method,
    success
  })
  safeMixpanelTrack("Sign In", {
    login_method: method,
    success
  })
}

/**
 * 2. Rating Flow Started Event
 * Fires when user lands on a performance rating page or clicks "Rate This Performance"
 */
export function trackRateStart(actor: string, movie: string, year: number) {
  safeGtag('rate_start', {
    actor,
    movie,
    year
  })
  safeMixpanelTrack("Rate Start", { actor, movie, year })
}

/**
 * 3. Rating Submitted Event (MOST IMPORTANT)
 * Fires when rating is successfully saved and confirmation UI appears
 */
export function trackRateSubmit(actor: string, movie: string, overall_score: number) {
  safeGtag('rate_submit', {
    actor,
    movie,
    overall_score
  })
  safeMixpanelTrack("Rate Submit", {
    actor,
    movie,
    overall_score,
  })
}

/**
 * 4. Share Triggered Event
 * Fires when user clicks any share button after submission
 */
export function trackShareRating(platform: 'native' | 'twitter' | 'facebook' | 'instagram') {
  safeGtag('share_rating', {
    platform
  })
  safeMixpanelTrack("Share Rating", { platform })
}

/**
 * 5. First-Time Activation Event
 * Fires ONLY ONCE per user when they submit their first-ever rating
 * Uses localStorage to prevent repeat firing
 */
export function trackFirstRatingComplete() {
  if (typeof window === 'undefined') return
  
  // Check if already tracked
  if (localStorage.getItem('first_rating_done')) {
    return
  }
  
  // Track the event
  safeGtag('first_rating_complete')
  safeMixpanelTrack("First Rating Complete")
  
  // Mark as done
  localStorage.setItem('first_rating_done', 'true')
}
