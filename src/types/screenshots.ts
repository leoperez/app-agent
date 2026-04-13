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
  customBg: string | null;
  customText: string | null;
  customAccent: string | null;
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

// Target export dimensions
export interface ExportTarget {
  label: string;
  store: 'APPSTORE' | 'GOOGLEPLAY';
  width: number;
  height: number;
}
