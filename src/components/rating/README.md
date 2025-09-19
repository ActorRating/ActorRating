# Oscar Criteria Rating System

A sophisticated, accessible, and feature-rich rating system designed specifically for evaluating acting performances based on Academy Award criteria.

## Features

### 🏆 Oscar Criteria Implementation

- **Technical Skill (25%)**: Voice control, physical presence, technique mastery
- **Emotional Depth (25%)**: Range of emotions, authenticity, vulnerability
- **Character Transformation (25%)**: Physical/mental transformation, believability
- **Story Impact (15%)**: How essential the performance is to the film
- **Difficulty Factor (10%)**: Challenge of role (accents, physicality, historical accuracy)

### 🎯 Core Components

#### RatingForm

The main form component that orchestrates the entire rating experience.

```tsx
import { RatingForm } from "@/components/rating";

<RatingForm
  performance={performanceInfo}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  initialRating={existingRating}
  isEditing={false}
/>;
```

#### RatingSlider

Individual slider components for each Oscar criterion with rich visual feedback.

```tsx
import { RatingSlider } from "@/components/rating";

<RatingSlider
  criterion="technicalSkill"
  value={75}
  onChange={handleChange}
  weight={25}
  label="Technical Skill"
  description="Voice control, physical presence, technique mastery"
  icon={<GiClapperboard />}
  tooltip="Detailed explanation of technical skill criteria"
/>;
```

#### RatingDisplay Components

A suite of display components for showing ratings in various contexts.

```tsx
import {
  RatingDisplay,
  OverallScore,
  CriteriaBreakdown,
  RatingComparison,
  RatingHistory,
  AverageRating
} from '@/components/rating'

// Main display component
<RatingDisplay
  rating={rating}
  showBreakdown={true}
  showComparison={false}
  compact={false}
/>

// Individual components
<OverallScore score={87} size="large" animated={true} />
<CriteriaBreakdown criteria={criteria} weights={weights} />
<RatingComparison userRating={userRating} averageRating={averageRating} />
<RatingHistory ratings={ratingHistory} maxDisplay={5} />
<AverageRating performanceId="123" ratings={allRatings} />
```

### 🛠️ Utility Functions

#### Rating Calculator

Comprehensive utility functions for score calculation and validation.

```tsx
import {
  calculateOverallScore,
  validateRating,
  getScoreLevel,
  saveDraftRating,
  loadDraftRating,
  clearDraftRating,
} from "@/utils/ratingCalculator";

// Calculate weighted score
const score = calculateOverallScore(criteria, weights);

// Validate rating
const validation = validateRating(criteria);

// Get score interpretation
const level = getScoreLevel(score);

// Draft management
saveDraftRating(performanceId, criteria, comment);
const draft = loadDraftRating(performanceId);
clearDraftRating(performanceId);
```

## Usage Examples

### Basic Rating Form

```tsx
import { RatingForm } from "@/components/rating";
import { PerformanceInfo, OscarRating } from "@/types/rating";

const performance: PerformanceInfo = {
  id: "performance-1",
  actor: {
    name: "Daniel Day-Lewis",
    imageUrl: "https://example.com/actor.jpg",
  },
  movie: {
    title: "There Will Be Blood",
    year: 2007,
    director: "Paul Thomas Anderson",
  },
};

const handleSubmit = async (rating: OscarRating) => {
  try {
    await submitRating(rating);
    // Handle success
  } catch (error) {
    // Handle error
  }
};

<RatingForm
  performance={performance}
  onSubmit={handleSubmit}
  onCancel={() => router.back()}
/>;
```

### Display Existing Rating

```tsx
import { RatingDisplay } from '@/components/rating'

const rating: OscarRating = {
  criteria: {
    technicalSkill: 95,
    emotionalDepth: 88,
    characterTransformation: 92,
    storyImpact: 85,
    difficultyFactor: 90
  },
  overallScore: 90,
  comment: "A masterclass in character transformation...",
  performanceId: "performance-1",
  userId: "user-1",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}

<RatingDisplay
  rating={rating}
  showBreakdown={true}
  showComparison={true}
/>
```

### Community Ratings Overview

```tsx
import { AverageRating } from "@/components/rating";

<AverageRating performanceId="performance-1" ratings={communityRatings} />;
```

## Accessibility Features

### Keyboard Navigation

- Full keyboard support for all sliders
- Arrow keys for fine adjustment (1 point)
- Shift + Arrow keys for coarse adjustment (10 points)
- Home/End for min/max values
- Page Up/Down for large jumps (25 points)

### Screen Reader Support

- Comprehensive ARIA labels
- Hidden descriptions for screen readers
- Semantic HTML structure
- Focus indicators

### Mobile Optimization

- Touch-friendly slider controls
- Responsive design
- Optimized for various screen sizes
- Gesture support

## Interactive Features

### Real-time Feedback

- Live score calculation
- Visual quality indicators
- Progress indication
- Color-coded feedback

### Draft Management

- Automatic draft saving (every 2 seconds)
- Draft restoration on page reload
- Draft expiration (24 hours)
- Manual draft clearing

### Form Validation

- Real-time validation
- Error messages
- Consistency warnings
- Extreme value alerts

### Visual Enhancements

- Smooth animations
- Hover effects
- Focus indicators
- Quality zone indicators
- Tooltips with detailed explanations

## TypeScript Support

All components are fully typed with comprehensive interfaces:

```tsx
interface OscarCriteria {
  technicalSkill: number;
  emotionalDepth: number;
  characterTransformation: number;
  storyImpact: number;
  difficultyFactor: number;
}

interface OscarRating {
  criteria: OscarCriteria;
  overallScore: number;
  comment?: string;
  performanceId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

## Styling

The system uses CSS custom properties for theming and supports:

- Dark/light mode
- Custom color schemes
- Responsive breakpoints
- Consistent design tokens

## Performance

- Optimized re-renders with React.memo
- Efficient state management
- Lazy loading of heavy components
- Debounced auto-save functionality

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive enhancement for older browsers

## Demo

Visit `/rating-demo` to see the system in action with interactive examples.

## Migration from Legacy System

The new system is designed to work alongside the existing rating system:

```tsx
// Legacy components (still available)
import { PerformanceRatingForm, PerformanceSlider } from "@/components/rating";

// New Oscar criteria system
import { RatingForm, RatingSlider } from "@/components/rating";
```

## Contributing

When contributing to the rating system:

1. Maintain accessibility standards
2. Add comprehensive TypeScript types
3. Include proper error handling
4. Test on multiple devices
5. Update documentation
6. Follow the established design patterns
