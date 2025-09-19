# Cookie Consent System

A GDPR/KVKK-compliant cookie consent system for Next.js with TypeScript.

## Features

- ✅ Cookie banner shown on first page load
- ✅ Three options: Accept, Reject, Settings
- ✅ Settings modal with toggleable categories
- ✅ Essential cookies always enabled
- ✅ Analytics and Marketing cookies toggleable
- ✅ Persistent storage in localStorage
- ✅ Cookie Settings link in footer
- ✅ 365-day consent expiry
- ✅ Console logging for script integration
- ✅ Dark theme styling matching app design
- ✅ Backdrop blur and proper focus management
- ✅ Mobile-responsive design

## Usage

The system is automatically integrated into the app via the `CookieConsentProvider` in the root layout.

### Accessing Cookie Consent Data

```tsx
import { useCookieConsentContext } from "@/components/providers/CookieConsentProvider";

function MyComponent() {
  const { consent, openSettings } = useCookieConsentContext();

  // Check if analytics are enabled
  if (consent?.analytics) {
    // Initialize analytics scripts
  }

  return <button onClick={openSettings}>Open Cookie Settings</button>;
}
```

### Cookie Categories

1. **Essential Cookies** - Always enabled, required for site functionality
2. **Analytics Cookies** - Optional, for site performance measurement
3. **Marketing Cookies** - Optional, for advertising and personalization

### Integration Points

- **Banner**: Shows on first visit if no consent stored
- **Settings Modal**: Accessible via banner or footer link
- **Footer**: "Cookie Settings" link for easy access
- **Console Logging**: Simulates script enabling/disabling for easy integration

### Storage

- Consent is stored in `localStorage` with key `cookie-consent`
- Expires after 365 days
- Format: `{ essential: boolean, analytics: boolean, marketing: boolean, timestamp: number }`

### Next Steps

Replace the console.log statements in `useCookieConsent.ts` with actual script integration:

```tsx
// Replace this:
console.log(
  "Analytics cookies enabled - would initialize analytics scripts here"
);

// With this:
gtag("config", "GA_TRACKING_ID");
```
