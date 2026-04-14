export interface Article {
  slug: string;
  title: string;
  category: string;
  description: string;
  icon: string;
}

export const CATEGORIES = [
  'Getting Started',
  'Screenshot Studio',
  'Integrations',
];

export const ARTICLES: Article[] = [
  // ── Getting Started ──────────────────────────────────────────────────────
  {
    slug: 'what-is-antigravity',
    title: 'What is Antigravity?',
    category: 'Getting Started',
    description:
      'An overview of what Antigravity does and how to get the most out of it.',
    icon: '🚀',
  },
  {
    slug: 'connect-app-store-connect',
    title: 'Connect App Store Connect',
    category: 'Getting Started',
    description:
      'Step-by-step guide to creating an API key in App Store Connect and linking it to your team.',
    icon: '🍎',
  },
  {
    slug: 'connect-google-play',
    title: 'Connect Google Play Console',
    category: 'Getting Started',
    description:
      'How to create a Google Cloud service account, grant it access to your Play Console, and upload the JSON key.',
    icon: '▶️',
  },

  // ── Screenshot Studio ─────────────────────────────────────────────────────
  {
    slug: 'screenshot-studio-overview',
    title: 'Screenshot Studio overview',
    category: 'Screenshot Studio',
    description:
      'What the Screenshot Studio is, how to open it, and the basic editing workflow.',
    icon: '🖼️',
  },
  {
    slug: 'screenshot-studio-layouts',
    title: 'Layouts & device frames',
    category: 'Screenshot Studio',
    description:
      'Every layout explained — Top text, Bottom caption, Text left/right, Hero, and Feature Graphic.',
    icon: '📐',
  },
  {
    slug: 'screenshot-studio-themes',
    title: 'Themes, fonts & decorations',
    category: 'Screenshot Studio',
    description:
      'How to customise colours, gradients, typography and background decorations.',
    icon: '🎨',
  },
  {
    slug: 'screenshot-studio-ai',
    title: 'AI text generation & translation',
    category: 'Screenshot Studio',
    description:
      'Generate slide copy with AI, and auto-translate your screenshots into any language.',
    icon: '✨',
  },
  {
    slug: 'screenshot-studio-export',
    title: 'Exporting & pushing to stores',
    category: 'Screenshot Studio',
    description:
      'Export to ZIP, push directly to App Store Connect or Google Play Console, and understand export targets.',
    icon: '📤',
  },
  {
    slug: 'screenshot-studio-share',
    title: 'Sharing preview links',
    category: 'Screenshot Studio',
    description:
      'Create public share links so clients or teammates can review screenshots without logging in.',
    icon: '🔗',
  },
  {
    slug: 'screenshot-studio-locales',
    title: 'Working with multiple locales',
    category: 'Screenshot Studio',
    description:
      'Duplicate a design to all locales, apply AI translation, and manage per-locale text overrides.',
    icon: '🌍',
  },
  {
    slug: 'screenshot-studio-history',
    title: 'Version history & A/B testing',
    category: 'Screenshot Studio',
    description:
      'Save named snapshots, restore past versions, and set up A/B tests to compare two sets.',
    icon: '🔄',
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  {
    slug: 'google-play-service-account',
    title: 'Google Play service account in depth',
    category: 'Integrations',
    description:
      'Detailed explanation of permissions, the edit flow, and troubleshooting common errors.',
    icon: '🔑',
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: string): Article[] {
  return ARTICLES.filter((a) => a.category === category);
}
