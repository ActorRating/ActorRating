# ActorRating Design System

Version 1.0.0

## Overview

This design system provides a comprehensive set of design tokens for building consistent, premium interfaces across the ActorRating platform.

## Files

- **`/src/styles/design-tokens.json`** - Raw JSON design tokens (portable format)
- **`/src/styles/design-tokens.ts`** - TypeScript version with full type safety
- **`/src/app/globals.css`** - CSS variables derived from design tokens
- **`/src/hooks/useDesignTokens.ts`** - React hook for accessing tokens in components

## Usage

### In React/TypeScript Components

```tsx
import { designTokens } from '@/styles/design-tokens';

// Use directly in inline styles
<motion.div
  style={{
    background: designTokens.gradients.gold.button,
    color: designTokens.colors.neutral.black,
  }}
>
  Premium Button
</motion.div>

// Use in animation values
<motion.div
  initial={{ opacity: designTokens.effects.opacity[0] }}
  animate={{ opacity: designTokens.effects.opacity[100] }}
  transition={{ 
    duration: parseFloat(designTokens.transitions.slow) / 1000 
  }}
/>
```

### In CSS/Tailwind

```css
/* Use CSS variables */
.my-element {
  background: var(--gold-primary);
  color: var(--gray-100);
  transition: var(--transition-base);
  box-shadow: var(--shadow-gold-glow);
}

/* Or use Tailwind classes with the theme */
<div className="bg-[#D4AF37] text-black">
  ...
</div>
```

### With React Hook

```tsx
import { useDesignTokens } from '@/hooks/useDesignTokens';

function MyComponent() {
  const tokens = useDesignTokens();
  
  return (
    <div style={{ 
      color: tokens.colors.brand.gold.primary,
      fontFamily: tokens.typography.fonts.heading.family 
    }}>
      Premium Typography
    </div>
  );
}
```

## Design Principles

### Colors

- **Pure Black Background**: Always use `#000000` for backgrounds (never `#0a0a0a` or gray)
- **Gold Accents**: Use gold sparingly for emphasis, CTAs, and interactive elements
- **Subtle Grays**: Use gray scale for text hierarchy and dividers

### Typography

- **Headings**: `Cinzel` serif font for titles and headings
- **Body**: `Inter` sans-serif for readable body text
- **Scale**: Mobile-first responsive typography with desktop overrides

### Spacing

- **Generous Whitespace**: Premium feel comes from breathing room
- **Consistent Scale**: Use the spacing.scale tokens (4px increments)
- **Section Padding**: Use sections tokens for consistent vertical rhythm

### Motion

- **Subtle Animations**: Use slow, elegant transitions
- **Cubic-bezier Easing**: Premium easing curves for natural motion
- **Framer Motion**: Recommended for complex animations

### Components

- **Glassmorphism**: Subtle blur effects for layered UI
- **Gold Glows**: Soft shadows and borders, never harsh
- **Minimal Decoration**: Less is more - remove unnecessary elements

## Token Categories

### Colors
- Brand colors (gold variants)
- Neutral palette (black, grays, white)
- Semantic colors (success, warning, error, info)
- State colors (editorial, community, new badges)

### Typography
- Font families and weights
- Responsive type scale (h1-h3, body, caption, button)
- Line heights and letter spacing

### Spacing
- Base scale (0-32)
- Section-specific spacing (hero, standard, compact)

### Effects
- Border radius (none → full circle)
- Shadows (including gold glows)
- Blur levels
- Opacity scale

### Gradients
- Gold gradients (primary, button, radial)
- Spotlight effects
- Background fades

### Components
- Button styles (primary, secondary)
- Card variants (glassmorphism, performance)
- Navbar configuration
- Search bar styling

### Layout
- Breakpoints (mobile → 2xl)
- Z-index scale
- Transitions and animations

## Best Practices

1. **Always use tokens instead of hard-coded values**
   - ❌ `color: "#D4AF37"`
   - ✅ `color: designTokens.colors.brand.gold.primary`

2. **Use CSS variables for dynamic styles**
   - ✅ `background: var(--gold-primary)`

3. **Keep backgrounds pure black**
   - ✅ `bg-black` or `#000000`
   - ❌ `bg-[#0a0a0a]` or `bg-zinc-950`

4. **Maintain consistent spacing**
   - Use the spacing scale tokens
   - Apply section-specific padding

5. **Use gradients from tokens**
   - Don't create inline gradients
   - Reference pre-defined gradient tokens

## Migration Guide

If you're updating existing components:

1. Replace hard-coded colors with token references
2. Use CSS variables where applicable
3. Apply consistent spacing from the scale
4. Replace custom gradients with token gradients
5. Use semantic color names (success, error, etc.)

## Examples

### Premium Button

```tsx
<button
  style={{
    background: designTokens.gradients.gold.button,
    color: designTokens.colors.neutral.black,
    padding: designTokens.components.button.primary.padding.desktop,
    borderRadius: designTokens.borderRadius.base,
    fontWeight: designTokens.typography.scale.button.weight,
    letterSpacing: designTokens.typography.scale.button.letterSpacing,
    textTransform: designTokens.typography.scale.button.textTransform,
    transition: designTokens.transitions.base,
  }}
  className="hover:scale-105"
>
  Rate This Performance
</button>
```

### Glassmorphic Card

```tsx
<div
  style={{
    background: designTokens.components.card.glassmorphism.background,
    backdropFilter: designTokens.components.card.glassmorphism.backdropFilter,
    border: designTokens.components.card.glassmorphism.border,
    borderRadius: designTokens.components.card.glassmorphism.borderRadius,
    padding: designTokens.components.card.glassmorphism.padding,
  }}
>
  Card Content
</div>
```

### Cinematic Section

```tsx
<section
  className="py-20 sm:py-32 md:py-40 lg:py-48 bg-black"
  style={{
    background: designTokens.gradients.spotlight.default,
  }}
>
  <h2
    style={{
      fontFamily: designTokens.typography.fonts.heading.family,
      fontSize: designTokens.typography.scale.h2.desktop.size,
      fontWeight: designTokens.typography.scale.h2.desktop.weight,
      letterSpacing: designTokens.typography.scale.h2.desktop.letterSpacing,
      color: designTokens.colors.neutral.gray[100],
    }}
  >
    Section Title
  </h2>
</section>
```

## Extending the System

To add new tokens:

1. Update `/src/styles/design-tokens.json`
2. Update `/src/styles/design-tokens.ts` with TypeScript types
3. Add corresponding CSS variables to `/src/app/globals.css`
4. Document the new tokens in this README

## Support

For questions about the design system, refer to:
- The design token files themselves (well-commented)
- This README
- Existing component implementations in `/src/components/`

---

**Remember**: The goal is cinematic, premium, minimal. Every design decision should feel intentional and elegant. 🎬✨

