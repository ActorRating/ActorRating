# Layout System

A comprehensive layout system for ActorRating.com featuring responsive design, accessibility features, and modern UI components.

## Components

### MainLayout

The main layout wrapper that provides the overall structure for the application.

**Features:**

- Responsive header with navigation
- Collapsible sidebar for filters/categories
- Main content area with proper spacing
- Footer with company and legal links
- Breadcrumb navigation system
- Skip-to-content accessibility feature

**Props:**

```typescript
interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showBreadcrumbs?: boolean;
  className?: string;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: (collapsed: boolean) => void;
}
```

**Usage:**

```tsx
import { MainLayout } from "@/components/layout";

export default function MyPage() {
  return (
    <MainLayout showSidebar={true} showBreadcrumbs={true}>
      <div>Your page content here</div>
    </MainLayout>
  );
}
```

### Header

Responsive header component with navigation, search, and user authentication.

**Features:**

- Logo/brand with proper typography
- Primary navigation menu
- Advanced search bar with autocomplete
- User authentication menu (login/profile/logout)
- Mobile hamburger menu with slide-out navigation
- Theme switcher (light/dark/system)

**Props:**

```typescript
interface HeaderProps {
  onSidebarToggle?: (collapsed: boolean) => void;
  onMobileSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  isMobileSidebarOpen?: boolean;
}
```

### Sidebar

Collapsible sidebar with filtering options and user-specific content.

**Features:**

- Performance filtering options (year, genre, awards, type)
- Category navigation with collapsible sections
- Recently viewed performances
- User's rating history
- Quick actions (trending, top-rated, etc.)
- Collapsible sections with proper state management

**Props:**

```typescript
interface SidebarProps {
  isOpen: boolean;
  onToggle: (collapsed: boolean) => void;
  variant?: "desktop" | "mobile";
}
```

### Footer

Comprehensive footer with company information and links.

**Features:**

- Company information and legal links
- Social media links
- Newsletter signup
- Site map links
- Accessibility statement link
- Responsive grid layout

### Breadcrumb

Navigation breadcrumb component for improved user experience.

**Features:**

- Automatic breadcrumb generation based on current path
- Proper navigation hierarchy
- Responsive design
- Accessibility features
- Home icon for root navigation

## Design System

### Colors

The layout system uses CSS custom properties defined in `globals.css`:

```css
:root {
  --background: #0a0a0a;
  --foreground: #ffffff;
  --primary: #8b5cf6;
  --primary-foreground: #ffffff;
  --secondary: #1a1a1a;
  --secondary-foreground: #e5e5e5;
  --accent: #7c3aed;
  --accent-foreground: #ffffff;
  --muted: #262626;
  --muted-foreground: #a3a3a3;
  --border: #404040;
}
```

### Typography

- **Font Family**: Geist Sans (primary), Geist Mono (monospace)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Line Heights**: Optimized for readability

### Spacing

- **Container**: max-w-7xl (80rem)
- **Padding**: Consistent spacing using Tailwind's spacing scale
- **Gaps**: Responsive gaps for different screen sizes

## Accessibility Features

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Proper focus management
- Skip-to-content functionality

### Screen Reader Support

- Semantic HTML structure
- Proper ARIA labels and roles
- Descriptive alt text for icons

### Color Contrast

- WCAG AA compliant color combinations
- High contrast mode support
- Focus indicators for all interactive elements

## Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile-First Approach

- All components are designed mobile-first
- Progressive enhancement for larger screens
- Touch-friendly interaction targets (44px minimum)

## Performance Optimizations

### Code Splitting

- Components are lazy-loaded where appropriate
- Dynamic imports for heavy components

### Animation Performance

- Hardware-accelerated animations using transform and opacity
- Reduced motion support for accessibility
- Optimized animation durations

### Bundle Size

- Tree-shaking friendly exports
- Minimal dependencies
- Efficient component composition

## Usage Examples

### Basic Page Layout

```tsx
import { MainLayout } from "@/components/layout";

export default function HomePage() {
  return (
    <MainLayout>
      <div className="p-6">
        <h1>Welcome to ActorRating.com</h1>
        <p>Discover and rate exceptional acting performances.</p>
      </div>
    </MainLayout>
  );
}
```

### Page Without Sidebar

```tsx
import { MainLayout } from "@/components/layout";

export default function SimplePage() {
  return (
    <MainLayout showSidebar={false} showBreadcrumbs={false}>
      <div className="p-6">
        <h1>Simple Page</h1>
        <p>This page doesn't need the sidebar or breadcrumbs.</p>
      </div>
    </MainLayout>
  );
}
```

### Custom Sidebar State

```tsx
import { MainLayout } from "@/components/layout";
import { useState } from "react";

export default function CustomLayoutPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <MainLayout
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={setSidebarCollapsed}
    >
      <div className="p-6">
        <h1>Custom Layout</h1>
        <p>Sidebar state is controlled externally.</p>
      </div>
    </MainLayout>
  );
}
```

## Customization

### Theme Customization

The layout system supports theme customization through CSS custom properties. You can override the default theme by modifying the CSS variables in your global styles.

### Component Customization

All components accept className props for custom styling:

```tsx
<MainLayout className="custom-layout-class">
  <Header className="custom-header-class" />
</MainLayout>
```

### Adding New Features

The layout system is designed to be extensible. You can:

1. Add new navigation items to the Header
2. Create new filter categories in the Sidebar
3. Extend the Footer with additional sections
4. Customize the breadcrumb generation logic

## Best Practices

### Performance

- Use React.memo for components that don't need frequent re-renders
- Implement proper loading states
- Optimize images and assets

### Accessibility

- Always provide alt text for images
- Use semantic HTML elements
- Test with screen readers
- Ensure keyboard navigation works

### SEO

- Use proper heading hierarchy
- Include meta descriptions
- Implement structured data where appropriate

### Maintenance

- Keep dependencies updated
- Follow consistent naming conventions
- Document any customizations
- Test across different browsers and devices

## Troubleshooting

### Common Issues

1. **Sidebar not collapsing properly**

   - Check if the `onToggle` prop is properly implemented
   - Ensure the parent component manages sidebar state

2. **Search suggestions not working**

   - Verify the search API endpoint is configured
   - Check network requests in browser dev tools

3. **Theme not switching**
   - Ensure the theme context is properly set up
   - Check if CSS variables are being applied correctly

### Debug Mode

Enable debug mode by setting the `NODE_ENV` to development. This will show additional console logs and error boundaries.

## Contributing

When contributing to the layout system:

1. Follow the existing code style and patterns
2. Add proper TypeScript types
3. Include accessibility features
4. Test on multiple devices and browsers
5. Update documentation for any new features
6. Ensure all tests pass

## License

This layout system is part of the ActorRating.com project and follows the same license terms.
