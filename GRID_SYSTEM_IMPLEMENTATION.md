# 12-Column Grid System Implementation

## Overview
This document outlines the implementation of a standard 12-column responsive grid system across all pages, components, and layouts in the ActorRating application using TailwindCSS.

## Grid System Rules

### Base Structure
```html
<div class="max-w-7xl mx-auto px-4">
  <div class="grid grid-cols-12 gap-6">
    <!-- Columns 1 and 12 are gutters (empty) -->
    <!-- Content spans columns 2-11 -->
  </div>
</div>
```

### Column Layout Rules
- **Columns 1 & 12**: Empty gutters on desktop
- **Columns 2-11**: Actual content (10 columns total)
- **Mobile**: Collapse to full width (col-span-12)

### Column Spans for Cards/Items
- **Mobile (default)**: `col-span-12` (full width, no gutters)
- **Tablet (md)**: `col-span-12 md:col-start-2 md:col-span-10` (within gutters)
- **Desktop 3-column layout**: `col-span-12 lg:col-start-2 lg:col-span-3` (each card takes ~3.33 cols)

Examples:

#### Full-Width Content (Hero, Headers)
```html
<div class="col-span-12 lg:col-start-2 lg:col-span-10">
  <!-- Content spans columns 2-11 -->
</div>
```

#### Three-Column Cards
```html
<div class="col-span-12 lg:col-start-2 lg:col-span-3">
  <!-- Card 1 (columns 2-4) -->
</div>
<div class="col-span-12 lg:col-span-3">
  <!-- Card 2 (columns 5-7) -->
</div>
<div class="col-span-12 lg:col-span-3">
  <!-- Card 3 (columns 8-10) -->
</div>
```

#### Two-Column Layout
```html
<div class="col-span-12 lg:col-start-2 lg:col-span-5">
  <!-- Left content (columns 2-6) -->
</div>
<div class="col-span-12 lg:col-span-5">
  <!-- Right content (columns 7-11) -->
</div>
```

### Centered Hero Sections/Headings
- Mobile: `col-span-12` (full width)
- Desktop: Content within columns 2-11, with further centering if needed

Examples:
```html
<!-- Full content width (columns 2-11) -->
<div class="col-span-12 lg:col-start-2 lg:col-span-10">
  <h1>Hero Title</h1>
</div>

<!-- Narrower centered content (columns 3-10) -->
<div class="col-span-12 lg:col-start-3 lg:col-span-8">
  <h2>Subtitle</h2>
</div>

<!-- Very narrow centered content (columns 4-9) -->
<div class="col-span-12 lg:col-start-4 lg:col-span-6">
  <p>Narrow text content</p>
</div>
```

### Container Widths
- **Standard container**: `max-w-7xl mx-auto px-4`
- **Narrower content**: `max-w-5xl mx-auto px-4`
- **Full width**: `max-w-full mx-auto px-4`

### Gap Utilities
- **Standard gap**: `gap-6` (24px)
- **Larger gap**: `gap-8` (32px) - for sections with more breathing room

## Implementation by Page

### 1. Landing Page (`src/components/HomePageClient.tsx`)
- ✅ Hero section: 12-column grid with centered content (10-column span)
- ✅ How It Works: 3-column grid on desktop (col-span-4 each)
- ✅ Performance Highlights: 2-column grid on desktop (col-span-6 each)
- ✅ Features Section: Full-width cards (col-span-12)
- ✅ About Section: Stats in 3-column grid (col-span-4 each)

### 2. Rate Page (`src/app/rate/page.tsx`)
- ✅ Search interface: Centered 8-column layout
- ✅ Success screen: Centered 8-column layout
- ✅ Rating form: 10-column centered layout
- ✅ Error messages: Full-width within grid

### 3. Performances Page (`src/app/performances/page.tsx`)
- ✅ Page title: Full-width centered (col-span-12)
- ✅ Performance cards: 2-column grid on desktop (col-span-6 each)
- ✅ Loading skeletons: Consistent with card layout
- ✅ "New Performances" section: 2-column responsive grid
- ✅ "Iconic Performances" section: 2-column responsive grid

### 4. About Page (`src/app/about/page.tsx`)
- ✅ Hero section: 8-column centered (lg:col-span-8 lg:col-start-3)
- ✅ Mission statement: 10-column centered
- ✅ Feature cards: Full-width for large cards, 6-column for medium cards
- ✅ Call to action: 10-column centered

### 5. Search Page (`src/app/search/page.tsx`)
- ✅ Search header: 8-column centered
- ✅ Search bar: 8-column centered
- ✅ Results area: Full-width within grid

### 6. Auth Pages
- ✅ Sign In (`src/app/auth/signin/page.tsx`): 6-column split layout
- ✅ Sign Up (`src/app/auth/signup/page.tsx`): 6-column split layout
- Auth pages use a specialized 2-column layout (6 cols each) for branding + form

## Grid Breakpoints (TailwindCSS defaults)
- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

## Best Practices

### DO:
✅ Always wrap content in `max-w-7xl mx-auto px-4`
✅ Use `grid grid-cols-12 gap-6` as the base grid
✅ Apply responsive column spans: `col-span-12 md:col-span-6 lg:col-span-4`
✅ Center important content with column offsets: `lg:col-start-3`
✅ Maintain consistent spacing with gap utilities

### DON'T:
❌ Create custom CSS grid systems
❌ Place content outside the 12-column structure
❌ Mix flex layouts with grid layouts without careful consideration
❌ Use arbitrary pixel widths instead of column spans
❌ Forget to set mobile-first column spans (col-span-12)

## Component Guidelines

### Cards
```html
<div class="col-span-12 md:col-span-6 lg:col-span-4">
  <div class="card-content">
    <!-- Card inner content -->
  </div>
</div>
```

### Two-Column Layouts
```html
<div class="grid grid-cols-12 gap-6">
  <div class="col-span-12 lg:col-span-6">Left content</div>
  <div class="col-span-12 lg:col-span-6">Right content</div>
</div>
```

### Three-Column Layouts
```html
<div class="grid grid-cols-12 gap-6">
  <div class="col-span-12 md:col-span-6 lg:col-span-4">Column 1</div>
  <div class="col-span-12 md:col-span-6 lg:col-span-4">Column 2</div>
  <div class="col-span-12 md:col-span-6 lg:col-span-4">Column 3</div>
</div>
```

### Asymmetric Layouts
```html
<div class="grid grid-cols-12 gap-6">
  <div class="col-span-12 lg:col-span-8">Main content (8 columns)</div>
  <div class="col-span-12 lg:col-span-4">Sidebar (4 columns)</div>
</div>
```

## Responsive Behavior

The grid system automatically adjusts based on screen size:

1. **Mobile (< 768px)**: All elements stack vertically (col-span-12)
2. **Tablet (768px - 1023px)**: Cards appear in 2 columns (col-span-6)
3. **Desktop (≥ 1024px)**: Full grid layout with 3 or 4 column layouts

## Maintenance

When adding new pages or components:
1. Start with `max-w-7xl mx-auto px-4` container
2. Add `grid grid-cols-12 gap-6` wrapper
3. Apply appropriate column spans for responsive behavior
4. Test on mobile, tablet, and desktop breakpoints
5. Maintain consistent spacing using gap utilities

## Examples in Codebase

### Full-Width Centered Hero
See: `src/components/HomePageClient.tsx` - Hero section

### Three-Column Card Grid
See: `src/components/HomePageClient.tsx` - How It Works section

### Two-Column Performance Grid
See: `src/app/performances/page.tsx` - Performance cards

### Centered Form Layout
See: `src/app/rate/page.tsx` - Rating form

## Troubleshooting

### Content overflowing on mobile
- Ensure all items have `col-span-12` as the base
- Check padding values (use `px-4` on containers)

### Uneven spacing
- Use consistent gap values: `gap-6` or `gap-8`
- Ensure all direct children have column span classes

### Grid not responsive
- Verify media query prefixes (md:, lg:, xl:)
- Check that Tailwind CSS is properly configured
- Ensure responsive classes are applied correctly

## Visual Identity Consistency

The 12-column grid system maintains ActorRating's:
- ✨ Cinematic spacing and premium feel
- 🎬 Consistent visual rhythm across pages
- 📱 Seamless mobile-to-desktop experience
- 🎨 Gold accent (#FFD700) integration
- 🖼️ Award show caliber presentation

---

**Last Updated**: January 2025
**Status**: ✅ Fully Implemented Across All Pages

