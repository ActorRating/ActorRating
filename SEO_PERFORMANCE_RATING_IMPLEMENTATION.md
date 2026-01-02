# SEO Performance Rating Page Implementation

## Overview

Added logged-out, read-only, crawlable content to performance rating pages for improved SEO and AI visibility.

## Requirements Met

✅ **SSR Content**: Content is present in HTML on first load (server-side rendered via layout)  
✅ **Conditional Rendering**: Only renders when user is logged out  
✅ **Visually Hidden**: Uses `sr-only` class (screen-reader accessible, not `display: none`)  
✅ **Not Cloaking**: Content truthfully describes the page's purpose  
✅ **No UI Changes**: Existing rating interface remains unchanged  

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
  - **H1**: `{Actor}'s Acting Performance in {Movie} ({Year})`
  - **Paragraph 1**: Explains the rating system and methodology
  - **Paragraph 2**: Details the five criteria and community aggregation
- **Styling**: Uses Tailwind's `sr-only` class
  - Visually hidden but accessible to screen readers
  - Accessible to search engine crawlers
  - Not `display: none` (which some crawlers might ignore)

### 3. JSON-LD Structured Data

Added minimal schema for performance rating pages:

```json
{
  "@type": "WebPage",
  "mainEntity": {
    "@type": "Review",
    "itemReviewed": {
      "@type": "PerformanceRole",
      "actor": { "@type": "Person", "name": "..." },
      "workFeatured": { "@type": "Movie", "name": "..." }
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "0-100"
    }
  }
}
```

### 4. Integration (`src/app/rate/[movieSlug]/[actorSlug]/page.tsx`)

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
<div class="sr-only">
  <h1>Leonardo DiCaprio's Acting Performance in The Wolf of Wall Street (2013)</h1>
  <p>
    This page allows you to rate Leonardo DiCaprio's specific acting performance 
    in The Wolf of Wall Street (2013) using ActorRating's comprehensive 0-100 
    scoring system. Our rating methodology is based on five Oscar-inspired criteria 
    that evaluate the craft of acting independently from the overall film quality.
  </p>
  <p>
    Rate this performance across Emotional Range & Depth, Character Believability, 
    Technical Skill & Authenticity, Screen Presence & Impact, and Chemistry & 
    Interaction. Your rating will contribute to the community's aggregated 
    performance score, helping identify career-defining roles and overlooked work.
  </p>
</div>
```

## Notes

- Implementation does not affect existing users or UI
- Content is generated server-side for optimal crawling
- Metadata is dynamic per performance
- No additional API calls required (data fetched during SSR)
- Compatible with all screen readers
- Follows WAI-ARIA best practices

## Future Enhancements

Potential additions (not implemented yet):
- Breadcrumb structured data
- Aggregate rating schema (once sufficient ratings collected)
- FAQ schema specific to rating process
- Video object schema (if performance clips added)

