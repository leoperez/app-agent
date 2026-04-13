import type {
  LayoutId,
  ThemeId,
  ResolvedTheme,
  ExportTarget,
  SlideData,
} from '@/types/screenshots';

// ─── Layouts ────────────────────────────────────────────────────────────────

export interface LayoutDefinition {
  id: LayoutId;
  label: string;
  description: string;
}

export const LAYOUTS: LayoutDefinition[] = [
  {
    id: 'centered',
    label: 'Top text',
    description: 'Headline above, phone below',
  },
  {
    id: 'bottom-caption',
    label: 'Bottom caption',
    description: 'Phone fills frame, text at bottom',
  },
  {
    id: 'split-left',
    label: 'Text left',
    description: 'Copy on the left, phone on the right',
  },
  {
    id: 'split-right',
    label: 'Text right',
    description: 'Phone on the left, copy on the right',
  },
  {
    id: 'hero',
    label: 'Hero',
    description: 'Oversized headline, compact phone',
  },
];

// ─── Themes ─────────────────────────────────────────────────────────────────

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  theme: ResolvedTheme;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    theme: {
      bg: '#0a0a0a',
      text: '#ffffff',
      accent: '#e5e5e5',
      phoneBorder: '#2a2a2a',
      phoneScreen: '#1a1a1a',
    },
  },
  {
    id: 'ivory',
    label: 'Ivory',
    theme: {
      bg: '#fafaf8',
      text: '#111111',
      accent: '#444444',
      phoneBorder: '#d4d4d4',
      phoneScreen: '#e8e8e8',
    },
  },
  {
    id: 'violet',
    label: 'Violet',
    theme: {
      bg: '#1e0a4a',
      text: '#ffffff',
      accent: '#c084fc',
      phoneBorder: '#4c1d95',
      phoneScreen: '#2d1269',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    theme: {
      bg: '#071528',
      text: '#ffffff',
      accent: '#38bdf8',
      phoneBorder: '#0c2a4a',
      phoneScreen: '#0a1e38',
    },
  },
  {
    id: 'ember',
    label: 'Ember',
    theme: {
      bg: '#18050a',
      text: '#ffffff',
      accent: '#f97316',
      phoneBorder: '#3b0a00',
      phoneScreen: '#260508',
    },
  },
];

export function resolveTheme(
  themeId: ThemeId,
  custom?: {
    bg?: string | null;
    text?: string | null;
    accent?: string | null;
  }
): ResolvedTheme {
  const base = THEMES.find((t) => t.id === themeId)?.theme ?? THEMES[0].theme;
  return {
    ...base,
    bg: custom?.bg ?? base.bg,
    text: custom?.text ?? base.text,
    accent: custom?.accent ?? base.accent,
  };
}

// ─── Export targets ──────────────────────────────────────────────────────────

export const EXPORT_TARGETS: ExportTarget[] = [
  {
    label: 'iPhone 6.9"',
    store: 'APPSTORE',
    width: 1320,
    height: 2868,
  },
  {
    label: 'iPhone 6.7"',
    store: 'APPSTORE',
    width: 1290,
    height: 2796,
  },
  {
    label: 'iPad 13"',
    store: 'APPSTORE',
    width: 2064,
    height: 2752,
  },
  {
    label: 'Google Play phone',
    store: 'GOOGLEPLAY',
    width: 1080,
    height: 1920,
  },
];

// ─── Default slides ──────────────────────────────────────────────────────────

export function defaultSlides(): SlideData[] {
  return [
    {
      headline: 'Your headline here',
      headlineFontSize: 52,
      subtitle: 'Describe the key benefit in one short sentence.',
      subtitleFontSize: 18,
      badge: '',
    },
    {
      headline: 'Feature two',
      headlineFontSize: 52,
      subtitle: 'Another compelling reason to download.',
      subtitleFontSize: 18,
      badge: '',
    },
    {
      headline: 'Feature three',
      headlineFontSize: 52,
      subtitle: 'Keep it short, punchy and benefit-focused.',
      subtitleFontSize: 18,
      badge: '',
    },
    {
      headline: 'Feature four',
      headlineFontSize: 52,
      subtitle: 'Highlight what makes you different.',
      subtitleFontSize: 18,
      badge: '',
    },
    {
      headline: 'Get started today',
      headlineFontSize: 52,
      subtitle: 'Join thousands of happy users.',
      subtitleFontSize: 18,
      badge: 'Free',
    },
  ];
}
