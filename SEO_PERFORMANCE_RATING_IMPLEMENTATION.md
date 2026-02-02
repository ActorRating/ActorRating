# SEO Performance Rating Page Implementation

## Overview

Added logged-out, read-only, crawlable content to performance rating pages for improved SEO and AI visibility.

## Requirements Met

✅ **SSR Content**: Content is present in HTML on first load (server-side rendered via layout)  
✅ **Conditional Rendering**: Only renders when user is logged out  
✅ **Visually Hidden**: Uses `sr-only` class (screen-reader accessible, not `display: none`)  
✅ **Not Cloaking**: Content truthfully describes the page's purpose  
✅ **No UI Changes**: Existing rating interface remains unchanged  
✅ **Single H1**: One H1 per page (SEO H1 hidden, visible headings are H2/H3)  
✅ **JSON-LD SSR**: Structured data always rendered server-side for crawlers  
✅ **Keyword Optimized**: Natural keyword placement without spam  

## Implementation Details

### 1. Server Component Layout (`src/app/rate/[movieSlug]/[actorSlug]/layout.tsx`)

- **Purpose**: Generate dynamic metadata for each performance rating page
- **Functionality**:
  - Fetches actor and movie data by slug during SSR
  - Generates page title, description, and Open Graph tags
  - Example: `Rate Leonardo DiCaprio's Performance in The Wolf of Wall Street (2013)`

### 2. SEO Content Component (`src/components/seo/PerformanceSEOContent.tsx`)

- **Purpose**: Provide crawlable content for search engines and AI
- **Conditional Rendering**: 
  ```typescript
  if (isLoggedIn) return null // Don't render for logged-in users
  ```
- **Content Structure**:
  - **H1**: `Rate {Actor}'s Acting Performance in {Movie} ({Year})`
    - This is the ONLY H1 on the page
    - Visible UI headings are H2/H3 to maintain proper hierarchy
  - **Paragraph 1**: Keyword-optimized description of the rating system
    - Includes: "acting performance", "performance rating system", "Oscar-inspired criteria"
  - **Paragraph 2**: Details the five criteria and community aggregation
    - Natural keyword placement throughout
- **Styling**: Uses Tailwind's `sr-only` class
  - Visually hidden but accessible to screen readers
  - Accessible to search engine crawlers
  - Not `display: none` (which some crawlers might ignore)

### 3. JSON-LD Structured Data (Server-Side Only)

**IMPORTANT**: JSON-LD is in `layout.tsx` (server component) for guaranteed SSR.

**Google rich results**: Use **Movie + aggregateRating** only. Do **not** use `Review` or `itemReviewed` — that makes Google interpret “you rated a review” and triggers the warning. Person is optional; do not attach ratings to Person (Google does not show stars for Person).

Schema for performance rating pages (only when ≥1 rating):

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "name": "Michael B. Jordan"
    },
    {
      "@type": "Movie",
      "@id": "https://www.actorrating.com/rate/sinners-2025/michael-b-jordan",
      "name": "Sinners",
      "datePublished": "2025",
      "actor": { "@type": "Person", "name": "Michael B. Jordan" },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "8.4",
        "ratingCount": "127",
        "bestRating": 10,
        "worstRating": 0
      }
    }
  ]
}
```

**Why in layout.tsx?**
- Always rendered server-side (not conditional on client auth)
- Guaranteed to be in HTML source for crawlers
- No hydration timing issues
- Best practice for structured data

### 4. Heading Hierarchy Fix (`src/components/rating/PerformanceRatingClientWrapper.tsx`)

**Changed visible headings to avoid duplicate H1:**
- Actor name: `<h1>` → `<h2>` (still visually large, semantically correct)
- Movie title: `<h2>` → `<h3>` (maintains hierarchy)

**Result:**
- One H1 per page: The SEO H1 (hidden with sr-only)
- Visible UI: H2 → H3 → proper hierarchy
- No duplicate H1 issues for search engines

### 5. Integration (`src/app/rate/[movieSlug]/[actorSlug]/page.tsx`)

- Component imported and rendered before main rating UI
- Receives actor/movie data and user login state
- Zero visual impact on existing interface

## Technical Implementation

### CSS Utility: `sr-only`

Already available in Tailwind CSS (used throughout the codebase):

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Files Created

1. **`src/components/seo/PerformanceSEOContent.tsx`**
   - SEO content component with conditional rendering
   - JSON-LD schema for performance pages

2. **`src/app/rate/[movieSlug]/[actorSlug]/layout.tsx`**
   - Server component for metadata generation
   - Dynamic title and description based on actor/movie

3. **`SEO_PERFORMANCE_RATING_IMPLEMENTATION.md`**
   - This documentation file

### Files Modified

1. **`src/app/rate/[movieSlug]/[actorSlug]/page.tsx`**
   - Added import for `PerformanceSEOContent`
   - Integrated component before main rating UI
   - Passes `isLoggedIn` state

## Verification

### For Logged-Out Users:
1. Visit `/rate/the-dark-knight-2008/christian-bale` (logged out)
2. View page source (`Ctrl+U` or `Cmd+Option+U`)
3. Search for: `<h1>Christian Bale's Acting Performance`
4. Confirm content is in HTML source
5. Content should NOT be visible on the page (sr-only)

### For Logged-In Users:
1. Sign in to ActorRating
2. Visit the same performance page
3. View page source
4. SEO content should NOT be present in HTML

### Accessibility Testing:
1. Use a screen reader (VoiceOver, NVDA, JAWS)
2. Navigate to a performance page (logged out)
3. Screen reader should announce the H1 and description
4. Content remains visually hidden

## SEO Benefits

### Improved Crawlability
- Clear H1 heading for each performance page
- Descriptive content explaining the page purpose
- Structured data for AI understanding

### AI Visibility
- AI assistants can understand the page context
- Clear explanation of the rating methodology
- Proper heading hierarchy (H1 at top)

### No Cloaking Risk
- Content truthfully describes the page
- Accessible to screen readers
- Not hidden with `display: none`
- Only conditional based on authentication state (legitimate use case)

## Example Output

When a crawler or logged-out user visits `/rate/the-wolf-of-wall-street-2013/leonardo-dicaprio`, the HTML contains:

```html
<!-- JSON-LD (only when ≥1 rating; Movie + aggregateRating, no Review) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Person", "name": "Leonardo DiCaprio" },
    {
      "@type": "Movie",
      "@id": "https://www.actorrating.com/rate/the-wolf-of-wall-street-2013/leonardo-dicaprio",
      "name": "The Wolf of Wall Street",
      "datePublished": "2013",
      "actor": { "@type": "Person", "name": "Leonardo DiCaprio" },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "8.4",
        "ratingCount": "127",
        "bestRating": 10,
        "worstRating": 0
      }
    }
  ]
}
</script>

<!-- SEO Content (only when logged out) -->
<div class="sr-only">
  <h1>Rate Leonardo DiCaprio's Acting Performance in The Wolf of Wall Street (2013)</h1>
  <p>
    This page allows users to rate an acting performance by Leonardo DiCaprio 
    in The Wolf of Wall Street (2013) using ActorRating's 0-100 performance 
    rating system based on five Oscar-inspired criteria. Our rating methodology 
    evaluates the craft of acting independently from the overall film quality.
  </p>
  <p>
    Rate this acting performance across five professional criteria: Emotional 
    Range & Depth, Character Believability, Technical Skill & Authenticity, 
    Screen Presence & Impact, and Chemistry & Interaction. Your performance 
    rating will contribute to the community's aggregated score, helping identify 
    career-defining roles and overlooked performances.
  </p>
</div>

<!-- Visible UI (for everyone) -->
<h2>Leonardo DiCaprio</h2> <!-- Changed from h1 -->
<h3>The Wolf of Wall Street</h3> <!-- Changed from h2 -->
```

**Key Improvements:**
- ✅ Single H1: Only the SEO H1 exists (sr-only)
- ✅ Keyword optimization: "acting performance", "performance rating", "rate an acting performance"
- ✅ JSON-LD always in SSR: Not conditional on auth state
- ✅ Proper heading hierarchy: H1 → H2 → H3

## Best Practices Followed

### ✅ H1 Hierarchy
- **One H1 per page**: SEO H1 is the only H1 (sr-only)
- **Visible headings**: H2 → H3 (proper semantic hierarchy)
- **No visual change**: Headings still look the same (CSS size unchanged)

### ✅ JSON-LD Placement
- **Server-side only**: In `layout.tsx` (server component)
- **Always rendered**: Not conditional on client auth state
- **Guaranteed in HTML**: Crawlers always see it on first load

### ✅ Keyword Optimization
- **Natural placement**: "acting performance", "performance rating system"
- **Not spam**: Reads naturally, provides value
- **High ROI**: Strengthens ranking without looking manipulative

### ✅ Future-Proof Auth Detection
- **SSR default**: Content always renders on server
- **Client removal**: Removed on hydration if logged in
- **No timing issues**: Crawlers always see content

## Notes

- Implementation does not affect existing users or UI visually
- Content is generated server-side for optimal crawling
- Metadata is dynamic per performance
- No additional API calls required (data fetched during SSR)
- Compatible with all screen readers
- Follows WAI-ARIA best practices
- **Heading hierarchy now correct** (one H1, proper H2/H3 sequence)
- **JSON-LD guaranteed SSR** (not dependent on client state)

## Future Enhancements

Potential additions (not implemented yet):
- Breadcrumb structured data
- Aggregate rating schema (once sufficient ratings collected)
- FAQ schema specific to rating process
- Video object schema (if performance clips added)

