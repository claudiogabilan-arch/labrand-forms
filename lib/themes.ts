import { ThemeConfig, ThemePreset } from './database.types'

export const themes: Record<ThemePreset, ThemeConfig> = {
  labrand: {
    id: 'labrand',
    name: 'LABrand',
    primaryColor: '#C9A24A',
    backgroundColor: '#111214',
    textColor: '#F4F1EA',
    accentColor: '#E0BC66',
    fontFamily: "'DM Sans', sans-serif",
  },
  midnight: {
    id: 'midnight',
    name: 'Meia-noite',
    primaryColor: '#8B5CF6',
    backgroundColor: '#0F0F1A',
    textColor: '#FFFFFF',
    accentColor: '#A78BFA',
    fontFamily: "'DM Sans', sans-serif",
  },
  ocean: {
    id: 'ocean',
    name: 'Oceano',
    primaryColor: '#0EA5E9',
    backgroundColor: '#0C1929',
    textColor: '#F0F9FF',
    accentColor: '#38BDF8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  sunset: {
    id: 'sunset',
    name: 'Pôr do sol',
    primaryColor: '#F97316',
    backgroundColor: '#FFFBEB',
    textColor: '#1C1917',
    accentColor: '#FB923C',
    fontFamily: "'Outfit', sans-serif",
  },
  forest: {
    id: 'forest',
    name: 'Floresta',
    primaryColor: '#10B981',
    backgroundColor: '#022C22',
    textColor: '#ECFDF5',
    accentColor: '#34D399',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanda',
    primaryColor: '#A855F7',
    backgroundColor: '#FAF5FF',
    textColor: '#1E1B4B',
    accentColor: '#C084FC',
    fontFamily: "'Sora', sans-serif",
  },
  minimal: {
    id: 'minimal',
    name: 'Minimalista',
    primaryColor: '#18181B',
    backgroundColor: '#FFFFFF',
    textColor: '#18181B',
    accentColor: '#3F3F46',
    fontFamily: "'Inter', sans-serif",
  },
}

export const themeList = Object.values(themes)

export function getTheme(preset: ThemePreset): ThemeConfig {
  return themes[preset] || themes.labrand
}

// Generate CSS variables from theme
export function getThemeCSSVariables(theme: ThemeConfig): React.CSSProperties {
  return {
    '--theme-primary': theme.primaryColor,
    '--theme-background': theme.backgroundColor,
    '--theme-text': theme.textColor,
    '--theme-accent': theme.accentColor,
    '--theme-font': theme.fontFamily,
  } as React.CSSProperties
}

