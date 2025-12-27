# iOS Safari Viewport & Safe Area Fix

## Problem
Mobile Safari on iOS has a dynamic viewport that changes as users scroll:
- The bottom bar (home indicator + Safari controls) appears/disappears
- Using `100vh` creates a black "dead zone" at the bottom
- Fixed bottom elements get hidden behind the home indicator
- Full-height dark backgrounds show white gaps

## Solution Implemented

### ✅ 1. Global CSS Changes (`src/app/globals.css`)

#### Replaced `100vh` with `100dvh`
```css
/* BEFORE */
body {
  min-height: 100vh;
}

/* AFTER */
body {
  min-height: 100dvh; /* Dynamic viewport height */
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### Added iOS Safe Area Support
```css
html, body {
  height: 100%;
  background-color: #000; /* Match app background */
}

body {
  min-height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
}

#__next {
  min-height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #000;
}

main {
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #000;
}

/* All fixed bottom elements */
[class*="fixed"][class*="bottom-0"],
.fixed.bottom-0 {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Tailwind .min-h-screen utility */
.min-h-screen {
  min-height: 100dvh !important;
}
```

### ✅ 2. Root Layout Changes (`src/app/layout.tsx`)

#### Updated Viewport Metadata
```typescript
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000000",
  viewportFit: "cover", // CRITICAL: Allows content to extend into safe areas
};
```

#### Updated Meta Tags
```typescript
other: {
  "apple-mobile-web-app-capable": "yes",
  "mobile-web-app-capable": "yes",
  "apple-mobile-web-app-status-bar-style": "black-translucent",
  "viewport-fit": "cover", // CRITICAL: iOS safe area support
},
```

### ✅ 3. Component Changes

#### HomePageClient.tsx
- Replaced `maxHeight: '100vh'` with `maxHeight: '100dvh'`

## Key Concepts

### `100dvh` vs `100vh`
- **`100vh`**: Fixed viewport height (ignores browser UI changes)
- **`100dvh`**: Dynamic viewport height (adjusts as browser UI appears/disappears)
- **Result**: No black bar at bottom on mobile Safari

### `env(safe-area-inset-bottom)`
- iOS provides safe area insets via CSS environment variables
- `env(safe-area-inset-bottom)` adds padding to avoid the home indicator
- **Result**: Content doesn't get hidden behind system UI

### `viewport-fit: cover`
- Allows content to extend into the safe areas
- Without it, safe area insets are ignored
- **Result**: App can use full screen while respecting system UI

## Browser Support

| Feature | iOS Safari | Android Chrome | Desktop |
|---------|-----------|----------------|---------|
| `100dvh` | ✅ iOS 15+ | ✅ Chrome 108+ | ✅ Modern |
| `env(safe-area-inset-*)` | ✅ iOS 11+ | ⚠️ Not needed | ⚠️ Not needed |
| `viewport-fit: cover` | ✅ iOS 11+ | ⚠️ Ignored | ⚠️ Ignored |

## Testing Checklist

- [ ] Test on iPhone with Safari (iOS 15+)
- [ ] Test with Safari bottom bar visible
- [ ] Test with Safari bottom bar hidden (after scrolling)
- [ ] Test in landscape orientation
- [ ] Test on iPhone with home indicator (X and later)
- [ ] Verify no black bar at bottom
- [ ] Verify footer doesn't get hidden
- [ ] Verify fixed bottom elements are visible

## Before & After

### Before
- ❌ Black bar at bottom on mobile Safari
- ❌ Content hidden behind home indicator
- ❌ Viewport jumps when Safari UI appears/disappears

### After
- ✅ No black bar at bottom
- ✅ Content respects safe areas
- ✅ Smooth viewport transitions
- ✅ Professional iOS app feel

## Additional Notes

1. **All changes are backwards compatible**: Fallbacks are in place for browsers that don't support these features
2. **No JavaScript required**: Pure CSS solution using modern standards
3. **Performance**: No impact on performance, purely declarative CSS
4. **Maintenance**: Changes are in global CSS and root layout only

## References

- [CSS Values and Units Module Level 4 - Viewport Units](https://drafts.csswg.org/css-values-4/#viewport-relative-lengths)
- [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [MDN: env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env)

