// Screenshot Studio — shared types

export type LayoutId =
  | 'centered'
  | 'bottom-caption'
  | 'split-left'
  | 'split-right'
  | 'hero'
  | 'feature-graphic';

export type ThemeId = 'midnight' | 'ivory' | 'violet' | 'ocean' | 'ember';

/** Per-locale text overrides for a slide */
export interface SlideLocaleText {
  headline: string;
  subtitle: string;
  badge?: string;
}

export type AppIconPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right';

export interface SlideData {
  headline: string;
  headlineFontSize: number; // px at export resolution
  subtitle: string;
  subtitleFontSize: number;
  badge?: string; // short pill text, e.g. "New" or "Pro"
  screenshotUrl?: string; // Vercel Blob public URL — persisted in DB
  /** Background image URL — shown behind text/phone instead of solid/gradient bg */
  bgImageUrl?: string;
  /** Vertical offset for screenshot image inside phone frame, -50 to +50 (percent). 0 = center */
  imageOffsetY?: number;
  /** Horizontal offset for screenshot image inside phone frame, -50 to +50 (percent). 0 = center */
  imageOffsetX?: number;
  /** Zoom level for screenshot image inside phone frame, 100–250 (percent). 100 = fit */
  imageZoom?: number;
  /** Custom headline/subtitle color override (CSS hex). Overrides theme text color. */
  customTextColor?: string;
  /** Drop shadow on headline/subtitle text */
  textShadow?: boolean;
  /** Stroke/outline on headline/subtitle text */
  textOutline?: boolean;
  /** Color for the text outline (CSS hex). Default: '#000000' */
  textOutlineColor?: string;
  /** Show app icon overlay in the corner of the slide */
  showAppIcon?: boolean;
  /** Which corner the app icon appears in. Default: bottom-left */
  appIconPosition?: AppIconPosition;
  /** Per-locale text overrides. When present, takes precedence over headline/subtitle/badge */
  localeTexts?: Record<string, SlideLocaleText>;
}

/** Resolve the effective text for a slide in a given locale */
export function resolveSlideText(
  slide: SlideData,
  locale?: string
): SlideLocaleText {
  if (locale && slide.localeTexts?.[locale]) {
    return slide.localeTexts[locale];
  }
  return {
    headline: slide.headline,
    subtitle: slide.subtitle,
    badge: slide.badge,
  };
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

export interface AbTestSetInfo {
  id: string;
  name: string;
  locale: string;
  themeId: ThemeId;
  layoutId: LayoutId;
}

export interface ScreenshotSetAbTestRecord {
  id: string;
  setAId: string;
  setBId: string;
  note: string;
  setA: AbTestSetInfo;
  setB: AbTestSetInfo;
  createdAt: string;
}

export interface ScreenshotSetSnapshotRecord {
  id: string;
  setId: string;
  label: string;
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
}

// ASO scoring
export interface SlideScore {
  slideIndex: number;
  score: number; // 0–100
  issues: string[];
  suggestions: string[];
}

export interface AsoScoreResult {
  overallScore: number;
  overallSummary: string;
  slides: SlideScore[];
  topStrengths: string[];
  topImprovements: string[];
}

// Target export dimensions
export interface ExportTarget {
  label: string;
  store: 'APPSTORE' | 'GOOGLEPLAY';
  deviceType: 'iphone' | 'android' | 'ipad';
  width: number;
  height: number;
}
