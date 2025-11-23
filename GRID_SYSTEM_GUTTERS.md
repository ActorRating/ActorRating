# 12-Column Grid System with Gutters

## Overview
ActorRating uses a **12-column responsive grid system** where:
- **Columns 1 & 12** are reserved as empty gutters (desktop only)
- **Columns 2-11** contain the actual content (10 usable columns)
- **Mobile**: Full-width layout (no gutters, uses all 12 columns)

This creates a refined, centered visual appearance with consistent margins on larger screens while maintaining full-width usability on mobile devices.

---

## Core Structure

### Base Grid Container
```html
<div class="max-w-7xl mx-auto px-4">
  <div class="grid grid-cols-12 gap-8">
    <!-- Columns 1 & 12: Empty gutters (desktop) -->
    <!-- Columns 2-11: Content area (desktop) -->
    <!-- Mobile: Full width (col-span-12) -->
  </div>
</div>
```

**Note:** All grids use `gap-8` for generous spacing and breathing room between components.

---

## Layout Patterns

### 1. Full-Width Content (Headings, Heroes)
Use columns 2-11 for main content sections:

```html
<div class="col-span-12 lg:col-start-2 lg:col-span-10">
  <h1>Hero Title</h1>
  <p>Full-width content within gutters</p>
</div>
```

**Explanation:**
- `col-span-12`: Full width on mobile
- `lg:col-start-2`: Starts at column 2 on desktop
- `lg:col-span-10`: Spans columns 2-11 (10 columns total)

---

### 2. Three-Column Card Layout (RECOMMENDED)
For feature cards, steps, or stat cards that need perfect centering:

```html
<!-- Parent: Apply gutters -->
<div class="col-span-12 lg:col-start-2 lg:col-span-10">
  
  <!-- Nested: Use simple 3-column grid, centered with max-width -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
    
    <div class="card">Card 1</div>
    <div class="card">Card 2</div>
    <div class="card">Card 3</div>
    
  </div>
</div>
```

**Why this approach?**
- ✅ Cards are **perfectly centered** with `max-w-6xl mx-auto`
- ✅ Simpler: No need for `col-start` or complex span calculations
- ✅ Responsive: Uses standard breakpoints (`md:grid-cols-3`)
- ✅ More maintainable and flexible

**Visual Layout (Desktop):**
```
[1] [     2-11 (gutters applied)      ] [12]
 ↑  [  max-w-6xl centered container  ]  ↑
Gut [  Card1   Card2   Card3        ] Gut
ter [________________________]       ter
```

---

### 3. Two-Column Layout
For side-by-side content:

```html
<!-- Left column: Starts at column 2, spans 5 columns -->
<div class="col-span-12 lg:col-start-2 lg:col-span-5">
  <div class="content">Left Content</div>
</div>

<!-- Right column: Continues from column 7, spans 5 columns -->
<div class="col-span-12 lg:col-span-5">
  <div class="content">Right Content</div>
</div>
```

**Visual Layout (Desktop):**
```
[1] [2-6 Left] [7-11 Right] [12]
 ↑                           ↑
Gutter                   Gutter
```

---

### 4. Nested Grid (Special Cases)
When content already has gutters applied, nest a 10-column grid:

```html
<!-- Parent: Has gutters (columns 2-11) -->
<div class="col-span-12 lg:col-start-2 lg:col-span-10">
  
  <!-- Nested 10-column grid for children -->
  <div class="grid grid-cols-10 gap-6">
    
    <!-- Full width within nested grid -->
    <div class="col-span-10">
      <div class="wide-card">Full Width</div>
    </div>
    
    <!-- Two side-by-side items -->
    <div class="col-span-10 lg:col-span-5">
      <div class="card">Left</div>
    </div>
    <div class="col-span-10 lg:col-span-5">
      <div class="card">Right</div>
    </div>
  </div>
  
</div>
```

**Use Cases:**
- About page feature cards
- Performance cards in sections
- Any grouped content within a guttered parent

---

### 5. Centered Narrow Content
For forms, focused content, or single-column layouts:

```html
<!-- Very narrow: Columns 3-10 (8 columns) -->
<div class="col-span-12 lg:col-start-3 lg:col-span-8">
  <form>
    <!-- Rating form, sign-in, etc. -->
  </form>
</div>

<!-- Narrow: Columns 4-9 (6 columns) -->
<div class="col-span-12 lg:col-start-4 lg:col-span-6">
  <div class="centered-content">
    <!-- Very focused content -->
  </div>
</div>
```

---

## Implementation Examples

### ✅ Home Page - How It Works Section

```tsx
<div className="max-w-7xl mx-auto px-4">
  <div className="grid grid-cols-12 gap-8">
    
    {/* Title: Full width with gutters */}
    <div className="col-span-12 lg:col-start-2 lg:col-span-10 text-center">
      <h2>How It Works</h2>
    </div>
    
    {/* 3 Step Cards - Centered with nested grid */}
    <div className="col-span-12 lg:col-start-2 lg:col-span-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {steps.map((step, index) => (
          <div key={index} className="step-card">
            {step.title}
          </div>
        ))}
      </div>
    </div>
    
    {/* CTA Button: Full width with gutters */}
    <div className="col-span-12 lg:col-start-2 lg:col-span-10 text-center">
      <button>Get Started</button>
    </div>
    
  </div>
</div>
```

---

### ✅ About Page - Feature Cards

```tsx
<div className="max-w-7xl mx-auto px-4">
  <div className="grid grid-cols-12 gap-8">
    
    {/* Section Title */}
    <div className="col-span-12 lg:col-start-2 lg:col-span-10">
      <h2>What Makes Us Different</h2>
      
      {/* Nested 2-column grid, centered */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        
        {/* Wide card - spans both columns */}
        <div className="md:col-span-2">
          <FeatureCard variant="wide" />
        </div>
        
        {/* Two medium cards side by side */}
        <FeatureCard variant="medium" />
        <FeatureCard variant="medium" />
        
        {/* Wide card - spans both columns */}
        <div className="md:col-span-2">
          <FeatureCard variant="wide" />
        </div>
        
      </div>
    </div>
    
  </div>
</div>
```

---

### ✅ Performances Page - Two-Column Cards

```tsx
<div className="max-w-7xl mx-auto px-4">
  <div className="grid grid-cols-12 gap-8">
    
    {/* Section with gutters */}
    <div className="col-span-12 lg:col-start-2 lg:col-span-10">
      <h3>New Performances</h3>
      
      {/* Simple 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {performances.map((perf, index) => (
          <PerformanceCard key={index} performance={perf} />
        ))}
      </div>
      
    </div>
    
  </div>
</div>
```

---

### ✅ Rate Page - Centered Form

```tsx
<div className="max-w-7xl mx-auto px-4">
  <div className="grid grid-cols-12 gap-6">
    
    {/* Header: Full width with gutters */}
    <div className="col-span-12 lg:col-start-2 lg:col-span-10">
      <h1>Rate a Performance</h1>
    </div>
    
    {/* Form: Extra centered (columns 3-10) */}
    <div className="col-span-12 lg:col-start-3 lg:col-span-8">
      <RatingForm />
    </div>
    
  </div>
</div>
```

---

## Quick Reference

| Layout Type | Mobile | Desktop (lg) | Notes |
|-------------|--------|--------------|-------|
| **Full width with gutters** | `col-span-12` | `lg:col-start-2 lg:col-span-10` | Standard for titles, heroes, sections |
| **3-column cards (BEST)** | Wrapper: `col-span-12 lg:col-start-2 lg:col-span-10`<br>Inner: `grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto` | Features, steps, stats - **perfectly centered** |
| **2-column cards** | Wrapper: `col-span-12 lg:col-start-2 lg:col-span-10`<br>Inner: `grid-cols-1 lg:grid-cols-2 gap-8` | Performance cards, side-by-side |
| **Centered narrow** | `col-span-12` | `lg:col-start-3 lg:col-span-8` | Forms, focused content |
| **Global spacing** | All grids use `gap-8` | Provides generous breathing room |

---

## Best Practices

### ✅ DO
- Always apply gutters to top-level content sections
- Use **nested centered grids** for 3-column layouts (simpler & centered)
- Maintain `col-span-12` for mobile (full width)
- Use consistent `gap-8` spacing everywhere
- Add `max-w-6xl mx-auto` to center card groups within guttered areas

### ❌ DON'T
- Don't use `col-start` for every card (use nested grids instead)
- Don't forget mobile-first classes (`col-span-12`)
- Don't create content outside columns 2-11 on desktop
- Don't use `gap-6` or other spacing values (always use `gap-8`)
- Don't skip the `max-w-6xl mx-auto` on centered card groups

---

## Responsive Breakpoints

```css
/* Mobile: Full width, no gutters */
col-span-12

/* Tablet (md: 768px+): Optional intermediate layout */
md:col-span-6

/* Desktop (lg: 1024px+): Gutters + 10-column content */
lg:col-start-2 lg:col-span-10
```

---

## Visual Examples

### Desktop Layout (1024px+)
```
┌────┬────────────────────────────────────────────────────────────┬────┐
│ 1  │ 2       3       4       5       6       7       8       9  │ 12 │
│    │                                                            │    │
│ G  │                    CONTENT AREA                            │ G  │
│ U  │                    (10 columns)                            │ U  │
│ T  │                                                            │ T  │
│ T  │                                                            │ T  │
│ E  │                                                            │ E  │
│ R  │                                                            │ R  │
│    │                                                            │    │
└────┴────────────────────────────────────────────────────────────┴────┘
```

### Mobile Layout (<1024px)
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                  FULL WIDTH                          │
│                 (12 columns)                         │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Updated Files

The following files have been updated with the gutter-based grid system:

- ✅ `src/components/HomePageClient.tsx`
  - Hero, How It Works, Performance, Features, About sections
  
- ✅ `src/app/rate/page.tsx`
  - Header, error display, rating form (centered)
  
- ✅ `src/app/about/page.tsx`
  - Hero, mission, feature cards (nested grid)
  
- ✅ `src/app/performances/page.tsx`
  - Title, new performances, iconic performances (2-column)
  
- ✅ `src/app/auth/signin/page.tsx` & `signup/page.tsx`
  - Split layout (branding + form)

---

## Testing Checklist

When implementing or reviewing grid layouts:

- [ ] Mobile (< 768px): Content spans full width
- [ ] Desktop (≥ 1024px): Visual gutters on left and right
- [ ] Content starts at column 2 on desktop
- [ ] Content ends at column 11 on desktop
- [ ] Cards distribute evenly across the 10-column content area
- [ ] Nested grids use `grid-cols-10` when parent has gutters
- [ ] Consistent `gap-6` spacing
- [ ] Animations and interactions work across breakpoints

---

## Need Help?

If you're unsure which pattern to use:

1. **Is this a top-level section title or hero?**
   → Use `col-span-12 lg:col-start-2 lg:col-span-10`

2. **Is this a set of 3 cards/items?**
   → First: `lg:col-start-2 lg:col-span-3`, Rest: `lg:col-span-3`

3. **Is this a set of 2 cards/items?**
   → First: `lg:col-start-2 lg:col-span-5`, Rest: `lg:col-span-5`

4. **Is the parent already using gutters?**
   → Nest a `grid-cols-10` and use `col-span-10` or `lg:col-span-5`

5. **Is this a form or narrow centered content?**
   → Use `lg:col-start-3 lg:col-span-8` (or even narrower)

---

**Last Updated:** November 22, 2025
**Grid System Version:** 2.0 (Gutter-based)

