export type ThemeCategory = 'standard' | 'high_vis' | 'camouflage' | 'custom';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  headerBg: string;
  headerBorder: string;
  navBg: string;
  navBorder: string;
  accent: string;
  camoPattern?: string; // decorative CSS background pattern
  isDark: boolean;
  isHighContrast: boolean;
}

export interface ThemePreset {
  id: string;
  name: string;
  category: ThemeCategory;
  description: string;
  colors: ThemeColors;
}

export interface CustomThemeSettings {
  primary: string;
  bg: string;
  surface: string;
  text: string;
  border: string;
}

export interface LogoConfig {
  id: 'topLogo' | 'bottomLogo';
  dataUrl: string | null;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  height: number; // 24 to 96 px
  altText: string;
  enabled: boolean;
  fileName?: string;
}

export interface AccessibilitySettings {
  textSize: '100' | '125' | '150' | '175' | '200';
  contrast: 'normal' | 'high';
  colorMode: 'auto' | 'light' | 'dark';
  reducedMotion: boolean;
  focusRing: boolean;
  largeTargets: boolean;
  lineSpacing: 'normal' | 'relaxed' | 'loose';
  letterSpacing: 'normal' | 'wide';
  dyslexicFont: boolean;
}
