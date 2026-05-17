/**
 * Design tokens for the Commuter app.
 *
 * Brand system: Berkeley Mono, warm cream canvas (#fdfcfc), near-black ink (#201d1d).
 * Color strategy: Restrained. Accent used only for state indicators, not decoration.
 * No pure black or white. Every neutral is tinted toward the warm brand hue.
 *
 * Aligned with DESIGN.md.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Canvas: warm cream — the brand's signature off-white
    background: '#fdfcfc',
    // Soft surface: slightly cooler, for inputs and alternating rows
    backgroundElement: '#f8f7f7',
    // Surface card: slightly elevated, for snippet pill / chips
    backgroundSelected: '#f1eeee',
    // Ink: the brand's near-black, warm undertone
    text: '#201d1d',
    // Charcoal: subtly softer for body copy
    textSecondary: '#646262',
    // Hairline: 1px dividers, translucent warm tint
    hairline: 'rgba(15,0,0,0.10)',
    hairlineStrong: '#646262',
    // Accent: Apple Blue — reserved for links and state indicators only
    accent: '#007aff',
    accentSubtle: 'rgba(0,122,255,0.08)',
    // Status semantic ramp
    statusActive: '#30d158',
    statusActiveSubtle: 'rgba(48,209,88,0.10)',
    statusInactive: '#ff9f0a',
    // Destructive
    destructive: '#ff3b30',
    destructiveSubtle: 'rgba(255,59,48,0.08)',
    // Surface dark — reserved for TUI mockup only, never body
    surfaceDark: '#201d1d',
    onDark: '#fdfcfc',
  },
  dark: {
    // Inverted: deep warm near-black canvas
    background: '#161412',
    backgroundElement: '#221f1c',
    backgroundSelected: '#2c2926',
    text: '#ede9e4',
    textSecondary: '#8a8278',
    hairline: 'rgba(237,233,228,0.10)',
    hairlineStrong: '#8a8278',
    accent: '#007aff',
    accentSubtle: 'rgba(0,122,255,0.12)',
    statusActive: '#30d158',
    statusActiveSubtle: 'rgba(48,209,88,0.12)',
    statusInactive: '#ff9f0a',
    destructive: '#ff3b30',
    destructiveSubtle: 'rgba(255,59,48,0.10)',
    surfaceDark: '#0f0e0d',
    onDark: '#ede9e4',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Berkeley Mono is the brand typeface. Falls back through the monospace stack.
 * On native, the system monospace is used (closest approximation).
 */
export const Fonts = Platform.select({
  ios: {
    mono: 'ui-monospace',
    sans: 'ui-monospace',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
  },
  default: {
    mono: 'monospace',
    sans: 'monospace',
    serif: 'serif',
    rounded: 'monospace',
  },
  web: {
    mono: 'var(--font-mono)',
    sans: 'var(--font-mono)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-mono)',
  },
});

export const Spacing = {
  xxs: 1,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 96,
} as const;

/** Interactive element radius: 4px. Containers are always 0px. */
export const Radius = {
  none: 0,
  sm: 4,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
