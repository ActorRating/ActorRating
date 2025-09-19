# Performance Component System

A sophisticated, premium, and minimalist performance card component system for displaying actor performances with comprehensive rating visualizations and interactive features.

## Components Overview

### 🎭 PerformanceCard

The main performance card component with comprehensive features:

- Actor name with typography hierarchy
- Movie title with release year
- Character name in italics
- Current average rating with visual emphasis
- Rating count and confidence indicator
- Oscar status badge (if applicable)
- Performance type indicator (Lead/Supporting)
- Genre tags
- Quick rating preview (visual rating breakdown)
- Hover effects with smooth transitions
- Click handler for navigation

### 🏆 FeaturedPerformanceCard

Enhanced variant for homepage and featured content:

- Larger, more prominent design
- Additional metadata display
- More prominent rating visualization
- Featured badge or indicator
- Enhanced visual effects and animations

### 📋 PerformanceListItem

Compact horizontal layout for lists:

- Essential information only
- Consistent with card design system
- Optimized for list views
- Space-efficient design

### 📊 RatingVisualization

Visual representation of 5-criteria ratings:

- Color-coded performance indicators
- Responsive design for different card sizes
- Accessibility-friendly with text alternatives
- Animated progress bars

### 🎯 PerformanceGrid

Responsive grid layout with advanced features:

- Infinite scroll or pagination
- Loading skeletons
- Empty state handling
- Sorting and filtering integration
- Search functionality

## Features

### ✨ Design Features

- **Premium & Minimalist**: Clean, sophisticated design with subtle animations
- **Responsive**: Optimized for all screen sizes
- **Accessible**: ARIA labels, semantic HTML, keyboard navigation
- **Smooth Animations**: Framer Motion powered transitions
- **Hover Effects**: Interactive feedback with smooth transitions

### 🎨 Visual Elements

- **Typography Hierarchy**: Clear information hierarchy
- **Color-coded Ratings**: Visual performance indicators
- **Badge System**: Oscar status, performance type, featured indicators
- **Progress Bars**: Animated rating breakdowns
- **Confidence Indicators**: Visual feedback on rating reliability

### 🔧 Technical Features

- **TypeScript**: Full type safety
- **Loading States**: Skeleton loaders and loading indicators
- **Error Handling**: Graceful error states
- **SEO-friendly**: Semantic markup
- **Mobile Optimized**: Touch-friendly interactions

## Usage Examples

### Basic Performance Card

```tsx
import { PerformanceCard } from "@/components/performance";

<PerformanceCard
  performance={performance}
  ratingCount={15}
  averageRating={85}
  confidenceLevel="high"
  oscarStatus="nominated"
  performanceType="lead"
  genres={["Drama", "Biography"]}
/>;
```

### Featured Performance Card

```tsx
import { FeaturedPerformanceCard } from "@/components/performance";

<FeaturedPerformanceCard
  performance={performance}
  featuredBadge="Performance of the Month"
  ratingCount={42}
  averageRating={92}
  confidenceLevel="high"
  oscarStatus="won"
  performanceType="lead"
  genres={["Drama", "Biography", "Historical"]}
/>;
```

### Performance Grid

```tsx
import { PerformanceGrid } from "@/components/performance";

<PerformanceGrid
  performances={performances}
  loading={isLoading}
  hasMore={hasMorePages}
  onLoadMore={loadMore}
  onSort={handleSort}
  onFilter={handleFilter}
  variant="featured"
/>;
```

### Performance List

```tsx
import { PerformanceListItem } from "@/components/performance";

{
  performances.map((performance) => (
    <PerformanceListItem
      key={performance.id}
      performance={performance}
      showUser={true}
      ratingCount={8}
      averageRating={78}
    />
  ));
}
```

## Props Reference

### PerformanceCard Props

```tsx
interface PerformanceCardProps {
  performance: Performance;
  showUser?: boolean;
  className?: string;
  variant?: "default" | "featured" | "compact";
  ratingCount?: number;
  averageRating?: number;
  confidenceLevel?: "low" | "medium" | "high";
  oscarStatus?: "nominated" | "won" | null;
  performanceType?: "lead" | "supporting";
  genres?: string[];
  onClick?: () => void;
}
```

### PerformanceGrid Props

```tsx
interface PerformanceGridProps {
  performances: Performance[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSort?: (sortBy: string, direction: "asc" | "desc") => void;
  onFilter?: (filters: FilterOptions) => void;
  className?: string;
  variant?: "default" | "featured" | "compact";
  emptyMessage?: string;
}
```

## Design Principles

### 🎯 Minimalism

- Clean, uncluttered layouts
- Focus on essential information
- Subtle visual hierarchy
- Breathing room between elements

### 🎨 Premium Feel

- Sophisticated color palette
- Smooth animations and transitions
- High-quality visual elements
- Professional typography

### ♿ Accessibility

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- High contrast ratios
- Screen reader friendly

### 📱 Responsive Design

- Mobile-first approach
- Flexible grid systems
- Adaptive typography
- Touch-friendly interactions

## Rating System

The component system uses a 5-criteria Oscar-based rating system:

1. **Technical Skill** (25%): Voice control, physical presence, technique
2. **Emotional Depth** (25%): Range of emotions, authenticity, vulnerability
3. **Character Transformation** (25%): Physical/mental transformation, believability
4. **Story Impact** (15%): Narrative importance, emotional impact
5. **Difficulty Factor** (10%): Role complexity, challenges, accents

### Score Levels

- **0-20**: Poor (Red)
- **21-40**: Fair (Orange)
- **41-60**: Good (Yellow)
- **61-80**: Very Good (Blue)
- **81-100**: Excellent (Green)

## Customization

### Styling

All components use Tailwind CSS classes and can be customized through:

- `className` prop for additional styling
- CSS custom properties for theming
- Component variants for different use cases

### Theming

The components follow the design system's color tokens:

- `primary`: Main brand color
- `accent`: Secondary brand color
- `foreground`: Text color
- `muted-foreground`: Secondary text color
- `card`: Card background
- `border`: Border color

## Performance Considerations

- **Lazy Loading**: Images and heavy content are lazy-loaded
- **Virtual Scrolling**: Large lists use virtualization
- **Memoization**: Components are optimized with React.memo
- **Bundle Size**: Tree-shakeable exports
- **Animation Performance**: Hardware-accelerated animations

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers

## Contributing

When contributing to the performance component system:

1. Follow the established design patterns
2. Maintain TypeScript type safety
3. Add comprehensive prop documentation
4. Include accessibility features
5. Test across different screen sizes
6. Ensure smooth animations and transitions
