import { useColorScheme } from 'nativewind'

// JS mirror of the CSS token values in global.css, for the RN APIs that need a
// color *value* rather than a className: react-navigation (tab bar), StatusBar,
// icon `color` props, ActivityIndicator, placeholderTextColor, tintColor.
// KEEP IN SYNC with global.css — these are the same hex values.

export const THEME_COLORS = {
  light: {
    background: '#ffffff',
    foreground: '#18181b',
    card: '#ffffff',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    border: '#e4e4e7',
    primary: '#18181b',
    brand: '#0ea5e9',
    brandForeground: '#fafafa',
    success: '#0f9d6f',
    warning: '#b45309',
    danger: '#dc2626',
    dangerForeground: '#ffffff',
    info: '#0891b2',
    like: '#ff3040',
    save: '#ffd24d',
  },
  dark: {
    background: '#0c0c0f',
    foreground: '#fafafa',
    card: '#18181b',
    muted: '#27272a',
    mutedForeground: '#a1a1aa',
    border: '#27272a',
    primary: '#fafafa',
    brand: '#38bdf8',
    brandForeground: '#0c0c0f',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    dangerForeground: '#0c0c0f',
    info: '#22d3ee',
    like: '#ff3040',
    save: '#ffd24d',
  },
}

export type ThemeColors = typeof THEME_COLORS.light

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme()
  return THEME_COLORS[colorScheme === 'dark' ? 'dark' : 'light']
}
