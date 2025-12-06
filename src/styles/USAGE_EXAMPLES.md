# Design System Usage Examples

Quick reference guide for using the ActorRating design system in your components.

## Import Options

```typescript
// Option 1: Import design tokens directly
import { designTokens } from '@/styles/design-tokens';

// Option 2: Import helper utilities
import { typography, buttonStyles, animationVariants } from '@/styles/design-helpers';

// Option 3: Use the React hook
import { useDesignTokens } from '@/hooks/useDesignTokens';

// Option 4: Use CSS variables (in CSS files or style props)
// No import needed - variables are globally available
```

---

## Example 1: Typography

### Using Design Tokens

```tsx
import { designTokens } from '@/styles/design-tokens';

<h1 style={{ 
  fontFamily: designTokens.typography.fonts.heading.family,
  fontSize: designTokens.typography.scale.h1.desktop.size,
  color: designTokens.colors.neutral.gray[100]
}}>
  Premium Heading
</h1>
```

### Using Helper Utilities

```tsx
import { typography } from '@/styles/design-helpers';

<h1 style={typography.h1}>
  Premium Heading
</h1>

<p style={typography.body}>
  Body text with consistent styling
</p>
```

### Using Tailwind + CSS Variables

```tsx
<h1 className="text-6xl" style={{ fontFamily: 'var(--font-heading)' }}>
  Premium Heading
</h1>
```

---

## Example 2: Buttons

### Primary Button with Design Tokens

```tsx
import { designTokens } from '@/styles/design-tokens';

<button
  style={{
    background: designTokens.gradients.gold.button,
    color: designTokens.colors.neutral.black,
    padding: `${designTokens.spacing.scale[4]} ${designTokens.spacing.scale[12]}`,
    borderRadius: designTokens.borderRadius.base,
    fontWeight: designTokens.typography.fonts.body.weights.semibold,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    border: 'none',
    cursor: 'pointer',
    transition: designTokens.transitions.base,
  }}
  className="hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] active:opacity-90"
>
  Start Rating
</button>
```

### Using Button Helper

```tsx
import { buttonStyles, typography } from '@/styles/design-helpers';

<button
  style={{
    ...buttonStyles.primary,
    ...typography.button,
    padding: '20px 48px',
  }}
  className="hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] active:opacity-90"
>
  Start Rating
</button>
```

---

## Example 3: Cards

### Glassmorphism Card

```tsx
import { cardStyles } from '@/styles/design-helpers';

<div
  style={cardStyles.glassmorphism}
  className="hover:border-[rgba(212,175,55,0.35)] transition-all duration-300"
>
  <h3>Card Title</h3>
  <p>Card content with glassmorphic background</p>
</div>
```

### Performance Card

```tsx
import { designTokens } from '@/styles/design-tokens';

<div
  style={{
    background: designTokens.components.card.performance.background,
    border: designTokens.components.card.performance.border,
    borderRadius: designTokens.components.card.performance.borderRadius,
    padding: designTokens.components.card.performance.padding,
  }}
  className="hover:border-[rgba(212,175,55,0.35)] hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-300"
>
  Performance content
</div>
```

---

## Example 4: Animations with Framer Motion

### Using Animation Variants (Premium/Cinematic Style)

```tsx
import { motion } from 'framer-motion';
import { animationVariants } from '@/styles/design-helpers';

// Simple fade in (preferred for premium feel)
<motion.div
  initial={animationVariants.fadeIn.initial}
  animate={animationVariants.fadeIn.animate}
  transition={animationVariants.fadeIn.transition}
>
  Content fades in cleanly
</motion.div>

// Subtle fade in up (minimal vertical movement)
<motion.div
  initial={animationVariants.fadeInUp.initial}
  whileInView={animationVariants.fadeInUp.animate}
  viewport={{ once: true }}
  transition={animationVariants.fadeInUp.transition}
>
  Content fades in with subtle 8px upward motion
</motion.div>
```

### Custom Animation with Design Tokens

```tsx
import { motion } from 'framer-motion';
import { designTokens } from '@/styles/design-tokens';

<motion.div
  initial={{ opacity: designTokens.effects.opacity[0], y: 8 }}
  animate={{ opacity: designTokens.effects.opacity[100], y: 0 }}
  transition={{ 
    duration: 0.8, 
    ease: [0.22, 1, 0.36, 1] 
  }}
>
  Custom animated content
</motion.div>
```

---

## Example 5: Sections

### Hero Section

```tsx
import { responsivePadding, containers } from '@/styles/design-helpers';
import { designTokens } from '@/styles/design-tokens';

<section 
  className={`${responsivePadding.hero} bg-black relative overflow-hidden`}
  style={{
    background: designTokens.gradients.spotlight.default
  }}
>
  <div className={`${containers.xl} mx-auto`}>
    <h1>Hero Content</h1>
  </div>
</section>
```

### Standard Section

```tsx
import { sectionStyles, containers } from '@/styles/design-helpers';

<section className={`${sectionStyles.standard} relative`}>
  <div className={`${containers.lg} mx-auto px-4 sm:px-6 lg:px-12`}>
    <h2>Section Content</h2>
  </div>
</section>
```

---

## Example 6: Gold Accents

### Gold Divider Line

```tsx
import { cinematicDivider } from '@/styles/design-helpers';

<div style={cinematicDivider} />
```

### Gold Border

```tsx
import { goldAccents } from '@/styles/design-helpers';

<div style={{ 
  border: goldAccents.borderLight,
  padding: '24px',
  borderRadius: '12px'
}}>
  Content with subtle gold border
</div>

// On hover
<div 
  style={{ border: goldAccents.borderLight }}
  className="hover:border-[rgba(212,175,55,0.4)]"
>
  Interactive element
</div>
```

### Gold Text

```tsx
import { designTokens } from '@/styles/design-tokens';

<span style={{ color: designTokens.colors.brand.gold.primary }}>
  Highlighted text
</span>
```

### Gold Glow

```tsx
import { shadows } from '@/styles/design-helpers';

<div style={{ boxShadow: shadows.goldGlow }}>
  Element with gold glow
</div>
```

---

## Example 7: Responsive Typography

### Mobile-First Approach

```tsx
import { designTokens } from '@/styles/design-tokens';

<h1 
  style={{
    fontFamily: designTokens.typography.fonts.heading.family,
    fontSize: designTokens.typography.scale.h1.mobile.size,
    lineHeight: designTokens.typography.scale.h1.mobile.lineHeight,
    letterSpacing: designTokens.typography.scale.h1.mobile.letterSpacing,
  }}
  className="lg:text-[72px] lg:tracking-[-1px]"
>
  Responsive Heading
</h1>
```

---

## Example 8: Using CSS Variables

### In Component Styles

```tsx
<div 
  style={{
    background: 'var(--gold-primary)',
    color: 'var(--black)',
    borderRadius: 'var(--border-radius-base)',
    transition: 'var(--transition-base)',
  }}
>
  Using CSS variables
</div>
```

### In Inline CSS

```tsx
<div 
  className="text-[var(--gold-primary)] bg-[var(--black)] border border-[var(--gold-primary)]"
>
  Tailwind with CSS variables
</div>
```

---

## Example 9: Gradients

### Button with Gold Gradient

```tsx
import { gradients } from '@/styles/design-helpers';

<button style={{ 
  background: gradients.goldButton,
  color: '#000',
  padding: '20px 48px',
  borderRadius: '8px',
}}>
  Gradient Button
</button>
```

### Background with Spotlight

```tsx
import { gradients } from '@/styles/design-helpers';

<section style={{ 
  background: '#000',
  backgroundImage: gradients.spotlight,
}}>
  Section with spotlight effect
</section>
```

---

## Example 10: Complete Component Example

```tsx
import { motion } from 'framer-motion';
import { designTokens } from '@/styles/design-tokens';
import { 
  typography, 
  buttonStyles, 
  animationVariants, 
  responsivePadding,
  containers,
  goldAccents 
} from '@/styles/design-helpers';

export function PremiumSection() {
  return (
    <section className={`${responsivePadding.standard} bg-black relative`}>
      <div className={`${containers.lg} mx-auto`}>
        {/* Title with animation */}
        <motion.h2
          style={typography.h2}
          initial={animationVariants.fadeInUp.initial}
          whileInView={animationVariants.fadeInUp.animate}
          viewport={{ once: true }}
          transition={animationVariants.fadeInUp.transition}
          className="mb-6"
        >
          Premium Section
        </motion.h2>

        {/* Gold divider */}
        <motion.div
          style={{
            width: '64px',
            height: '1px',
            background: designTokens.colors.brand.gold.primary,
            opacity: 0.6,
          }}
          initial={{ width: 0 }}
          whileInView={{ width: '64px' }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-12"
        />

        {/* Body text */}
        <motion.p
          style={{
            ...typography.body,
            color: designTokens.colors.neutral.gray[400],
            marginBottom: designTokens.spacing.scale[10],
          }}
          initial={animationVariants.fadeIn.initial}
          whileInView={animationVariants.fadeIn.animate}
          viewport={{ once: true }}
          transition={{ ...animationVariants.fadeIn.transition, delay: 0.4 }}
        >
          This is a complete example showing how to combine design tokens,
          helper utilities, and animations for a premium, cinematic feel.
        </motion.p>

        {/* Button */}
        <motion.button
          style={{
            ...buttonStyles.primary,
            padding: '20px 48px',
          }}
          initial={animationVariants.scaleIn.initial}
          whileInView={animationVariants.scaleIn.animate}
          viewport={{ once: true }}
          transition={{ ...animationVariants.scaleIn.transition, delay: 0.6 }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: designTokens.shadows.glow.goldStrong,
          }}
        >
          Get Started
        </motion.button>
      </div>
    </section>
  );
}
```

---

## Best Practices Summary

1. **Use tokens for all values** - Never hard-code colors, spacing, etc.
2. **Leverage helper utilities** - They provide pre-composed, tested styles
3. **CSS variables for dynamic styles** - Great for theme switching or computed values
4. **Consistent animations** - Use the provided animation variants
5. **Mobile-first responsive** - Start with mobile sizes, scale up
6. **Pure black backgrounds** - Always `#000000`, not gray variants
7. **Subtle gold accents** - Use sparingly for maximum impact
8. **Type-safe imports** - TypeScript will help catch errors

---

For more information, see:
- `/src/styles/design-tokens.ts` - Full token definitions
- `/src/styles/design-helpers.ts` - Helper utilities
- `/src/app/globals.css` - CSS variables
- `README_DESIGN_SYSTEM.md` - Complete documentation

