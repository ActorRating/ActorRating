# ActorRating Animation Guidelines

## Cinematic + Premium + Academy-Quality Philosophy

This document outlines the animation principles for ActorRating to maintain a **sophisticated, timeless, cinematic** aesthetic.

---

## ✅ What We Use (Premium Patterns)

### Subtle Opacity Transitions
```tsx
transition: opacity 0.3s ease-out
```
- **Duration**: 300-400ms
- **Easing**: `ease-out` or custom cubic-bezier
- Clean, professional, instant-feeling

### Minimal Vertical Motion
```tsx
// Subtle 8px upward fade-in
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
```
- **Max distance**: 8-12px (not 20-50px!)
- Creates depth without feeling "bouncy"

### Premium Glow Effects
```tsx
hover:shadow-[0_0_25px_rgba(212,175,55,0.3)]
```
- Subtle gold glow on hover
- Intensity: 0.15-0.3 alpha
- Radius: 20-30px (not 60-100px!)

### Active States (Not Hover Scale)
```tsx
active:opacity-90
```
- Use opacity changes for press feedback
- No scale transforms on interaction

---

## ❌ What We Avoid (Agency Portfolio Vibes)

### Scroll-Triggered Bounce-In Cards
```tsx
// ❌ BAD
whileInView={{ y: [100, 0], opacity: [0, 1] }}
transition={{ type: "spring", bounce: 0.4 }}
```
**Why**: Feels like a 2017 Webflow template

### Staggered Slide-From-Left
```tsx
// ❌ BAD
staggerChildren: 0.1
x: [-50, 0]
```
**Why**: Too agency-portfolio, breaks cinematic flow

### Wild Opacity Keyframes
```tsx
// ❌ BAD
@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.3 }
}
```
**Why**: Distracting, feels cheap

### Rotation Effects
```tsx
// ❌ BAD
hover:rotate-12
group-hover:rotate-45
```
**Why**: Playful, not prestigious

### Speedy Pop-Ins
```tsx
// ❌ BAD
duration: 0.15s
scale: [0.8, 1.1, 1]
```
**Why**: Too fast, feels nervous

### Aggressive Scale Transforms
```tsx
// ❌ BAD
hover:scale-110
hover:scale-105
hover:-translate-y-4
```
**Why**: Overdone, breaks layout, feels like a button kit

### Friction Scroll Effects
```tsx
// ❌ BAD
scroll-behavior: smooth (with custom easing)
parallax with scroll-jacking
```
**Why**: Disorienting, reduces user control

---

## Current Animation Inventory

### Core Animations (`src/lib/animations.ts`)
```tsx
fadeIn: {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  transition: { duration: 0.4, ease: "easeOut" }
}

fadeInUp: {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
}
```

### Design Helper Variants (`src/styles/design-helpers.ts`)
```tsx
animationVariants: {
  fadeIn: { /* subtle fade only */ },
  fadeInUp: { /* 8px upward motion */ }
}
```

**Removed**:
- `scaleIn` (scale transforms)
- `slideInLeft` / `slideInRight` (horizontal slides)
- `staggerContainer` (cascade delays)

---

## Implementation Rules

### 1. Hover States
```tsx
// ✅ GOOD
className="transition-all duration-300 hover:border-[#FFD700]/35 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"

// ❌ BAD
className="hover:scale-105 hover:-translate-y-2"
```

### 2. Button Interactions
```tsx
// ✅ GOOD
<button className="transition-all duration-300 hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] active:opacity-90">

// ❌ BAD
<button className="hover:scale-110 active:scale-95">
```

### 3. Card Reveals
```tsx
// ✅ GOOD
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>

// ❌ BAD
<motion.div
  initial={{ opacity: 0, scale: 0.8, y: 50 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 100 }}
>
```

### 4. List Animations
```tsx
// ✅ GOOD - All items appear together or with minimal delay
{items.map((item) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  />
))}

// ❌ BAD - Staggered cascade
<motion.div variants={staggerContainer}>
  {items.map((item, i) => (
    <motion.div variants={childVariant} custom={i} />
  ))}
</motion.div>
```

---

## Reference: High-End Motion Design

Think:
- **Apple** - Clean, purposeful, fast
- **Tesla** - Minimal, instant-feeling
- **The Academy** - Prestigious, understated
- **IMDb Pro** - Professional, content-first

Not:
- Agency portfolios
- Webflow showcase sites
- SaaS marketing pages
- Template marketplaces

---

## Performance Considerations

1. **Respect `prefers-reduced-motion`**
   ```tsx
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

2. **Use GPU-accelerated properties**
   - `opacity` ✅
   - `transform` (translate only) ✅
   - `width`, `height`, `top`, `left` ❌

3. **Avoid Layout Thrash**
   - No hover effects that change dimensions
   - Use `transform` instead of `margin`/`padding` changes

---

## Migration Summary (November 2025)

### Files Updated
- ✅ `src/lib/animations.ts` - Removed `scaleIn`, `staggerContainer`
- ✅ `src/styles/design-helpers.ts` - Removed slide/scale/stagger variants
- ✅ `src/app/globals.css` - Removed float keyframes
- ✅ `src/app/auth/signin/page.tsx` - Removed rotation effects
- ✅ `src/app/auth/signup/page.tsx` - Removed rotation effects
- ✅ `src/components/HomePageClient.tsx` - Replaced aggressive hover effects
- ✅ `src/app/performances/page.tsx` - Replaced aggressive hover effects
- ✅ `src/app/about/page.tsx` - Replaced aggressive hover effects
- ✅ `src/components/ui/Button.tsx` - Replaced scale effects
- ✅ `src/components/ui/Slider.tsx` - Replaced scale effects
- ✅ `src/components/ui/SmoothSlider.tsx` - Replaced scale effects
- ✅ `src/components/cookies/CookieSettingsModal.tsx` - Replaced scale effects
- ✅ `src/styles/USAGE_EXAMPLES.md` - Updated documentation

### Changes Summary
- **Removed**: Scale transforms, rotation, stagger, slide-in, bounce
- **Reduced**: Glow intensities (0.5→0.3), motion distances (30px→8px)
- **Replaced**: `hover:scale-*` with subtle shadows and opacity
- **Shortened**: Animation durations (0.8s→0.4s)

---

## When in Doubt

Ask yourself:
> "Would this animation feel at home at the Academy Awards website, or a 2017 agency portfolio?"

If the latter, simplify it.

**Less is more. Subtlety is luxury.**


