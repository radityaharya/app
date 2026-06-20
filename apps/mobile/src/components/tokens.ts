import { Colors } from '@/constants/theme';

/** Shared monospace font family string used across all brand components. */
export const MONO = 'monospace' as const;

/** Union of light and dark color palettes. */
export type ThemeColors = typeof Colors.light | typeof Colors.dark;
