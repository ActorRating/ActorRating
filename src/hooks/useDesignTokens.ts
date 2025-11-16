/**
 * useDesignTokens Hook
 * 
 * Provides type-safe access to design tokens in React components
 * Import design tokens directly for use in inline styles, animations, etc.
 * 
 * @example
 * ```tsx
 * import { designTokens } from '@/styles/design-tokens';
 * 
 * // In your component
 * <div style={{ color: designTokens.colors.brand.gold.primary }}>
 *   Premium content
 * </div>
 * ```
 */

import { designTokens } from '@/styles/design-tokens';

export const useDesignTokens = () => {
  return designTokens;
};

// Re-export for convenience
export { designTokens };
export type { DesignTokens } from '@/styles/design-tokens';

