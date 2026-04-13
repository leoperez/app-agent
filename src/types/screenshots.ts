// Screenshot Studio — shared types

export type LayoutId =
  | 'centered'
  | 'bottom-caption'
  | 'split-left'
  | 'split-right'
  | 'hero';

export type ThemeId = 'midnight' | 'ivory' | 'violet' | 'ocean' | 'ember';

export interface SlideData {
  headline: string;
  headlineFontSize: number; // px at export resolution
  subtitle: string;
  subtitleFontSize: number;
  badge?: string; // short pill text, e.g. "New" or "Pro"
  screenshotUrl?: string; // Vercel Blob public URL — persisted in DB
}

export interface ScreenshotSetRecord {
  id: string;
  appId: string;
  locale: string;
  name: string;
  layoutId: LayoutId;
  themeId: ThemeId;
  fontId: FontId;
  decorationId: DecorationId;
  customBg: string | null;
  customText: string | null;
  customAccent: string | null;
  bgGradient: GradientBg | null;
  slides: SlideData[];
  createdAt: string;
  updatedAt: string;
}

// Resolved theme colours
export interface ResolvedTheme {
  bg: string;
  text: string;
  accent: string;
  phoneBorder: string;
  phoneScreen: string; // colour shown inside phone when no screenshot
}

// Gradient background definition (stored in ScreenshotSetRecord)
export interface GradientBg {
  type: 'gradient';
  color1: string;
  color2: string;
  angle: number; // 0–360 degrees
}

export type Background = string | GradientBg; // string = solid hex

export type FontId =
  | 'system'
  | 'inter'
  | 'sora'
  | 'space-grotesk'
  | 'playfair'
  | 'dm-sans'
  | 'raleway'
  | 'bebas';

export type DecorationId =
  | 'none'
  | 'circles'
  | 'blob'
  | 'dots'
  | 'diagonal-lines'
  | 'confetti';

export interface ScreenshotTemplateRecord {
  id: string;
  teamId: string;
  name: string;
  layoutId: LayoutId;
  themeId: ThemeId;
  fontId: FontId;
  decorationId: DecorationId;
  customBg: string | null;
  customText: string | null;
  customAccent: string | null;
  bgGradient: GradientBg | null;
  slides: SlideData[];
  createdAt: string;
  updatedAt: string;
}

// Target export dimensions
export interface ExportTarget {
  label: string;
  store: 'APPSTORE' | 'GOOGLEPLAY';
  deviceType: 'iphone' | 'android';
  width: number;
  height: number;
}
