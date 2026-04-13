import { AppLocalization } from '@/types/aso';

export interface ValidationIssue {
  locale: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean; // no errors (warnings are ok)
  issues: ValidationIssue[];
}

const PLACEHOLDER_PATTERNS = [/lorem ipsum/i, /placeholder/i, /todo/i, /tbd/i];

// Common App Store rejection patterns
const IOS_CROSS_PLATFORM = [
  /android/i,
  /google play/i,
  /play store/i,
  /samsung/i,
];
const ANDROID_CROSS_PLATFORM = [
  /app store/i,
  /apple/i,
  /iphone/i,
  /ipad/i,
  /ios/i,
];
const PRICING_PATTERNS = [
  /\$\d/,
  /\d+% off/i,
  /limited time offer/i,
  /buy now/i,
  /subscribe.*\$\d/i,
];

export interface PreflightCheck {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'warn' | 'fail';
}

export interface AppMeta {
  privacyPolicyUrl?: string | null;
  developerWebsite?: string | null;
  store: string;
}

export function runPreflightChecks(
  localizations: AppLocalization[],
  app: AppMeta
): PreflightCheck[] {
  const checks: PreflightCheck[] = [];
  const isIOS = app.store !== 'GOOGLEPLAY';
  const crossPlatformPatterns = isIOS
    ? IOS_CROSS_PLATFORM
    : ANDROID_CROSS_PLATFORM;
  const platformName = isIOS ? 'Android/Google Play' : 'App Store/Apple';

  // 1. Privacy policy URL
  checks.push({
    id: 'privacy-url',
    label: 'Privacy policy URL',
    description: app.privacyPolicyUrl
      ? app.privacyPolicyUrl
      : 'Required by both app stores. Add one in app settings.',
    status: app.privacyPolicyUrl ? 'pass' : 'fail',
  });

  // 2. Support URL / developer website
  checks.push({
    id: 'support-url',
    label: 'Support URL / developer website',
    description: app.developerWebsite
      ? app.developerWebsite
      : 'A valid support URL is required for submission.',
    status: app.developerWebsite ? 'pass' : 'warn',
  });

  // 3. Cross-platform mentions
  const crossPlatformHits: string[] = [];
  for (const loc of localizations) {
    const texts = [
      loc.title,
      loc.description,
      loc.shortDescription,
      loc.fullDescription,
      loc.subtitle,
    ];
    for (const text of texts) {
      if (!text) continue;
      for (const pattern of crossPlatformPatterns) {
        if (pattern.test(text)) {
          crossPlatformHits.push(loc.locale ?? '');
          break;
        }
      }
    }
  }
  checks.push({
    id: 'cross-platform',
    label: `No ${platformName} mentions`,
    description:
      crossPlatformHits.length === 0
        ? 'No cross-platform references found.'
        : `Mention of competitor platform detected in: ${Array.from(new Set(crossPlatformHits)).join(', ')}. This is a common rejection reason.`,
    status: crossPlatformHits.length === 0 ? 'pass' : 'fail',
  });

  // 4. Pricing claims in metadata
  const pricingHits: string[] = [];
  for (const loc of localizations) {
    const texts = [
      loc.description,
      loc.shortDescription,
      loc.fullDescription,
      loc.promotionalText,
    ];
    for (const text of texts) {
      if (!text) continue;
      for (const pattern of PRICING_PATTERNS) {
        if (pattern.test(text)) {
          pricingHits.push(loc.locale ?? '');
          break;
        }
      }
    }
  }
  checks.push({
    id: 'pricing-claims',
    label: 'No pricing in metadata',
    description:
      pricingHits.length === 0
        ? 'No pricing claims in metadata.'
        : `Possible pricing language found in: ${Array.from(new Set(pricingHits)).join(', ')}. Mentioning prices in metadata can cause rejection.`,
    status: pricingHits.length === 0 ? 'pass' : 'warn',
  });

  // 5. Primary locale has content
  const primaryLocale =
    localizations.find((l) => l.locale === 'en-US') ?? localizations[0];
  const hasPrimaryContent = !!(
    primaryLocale?.title?.trim() && primaryLocale?.description?.trim()
  );
  checks.push({
    id: 'primary-locale',
    label: 'Primary locale has content',
    description: hasPrimaryContent
      ? `${primaryLocale?.locale ?? 'en-US'} has title and description.`
      : 'Primary locale is missing title or description.',
    status: hasPrimaryContent ? 'pass' : 'fail',
  });

  // 6. Placeholder text check
  const placeholderHits: string[] = [];
  for (const loc of localizations) {
    const texts = [
      loc.title,
      loc.description,
      loc.shortDescription,
      loc.fullDescription,
    ];
    for (const text of texts) {
      if (text && PLACEHOLDER_PATTERNS.some((p) => p.test(text))) {
        placeholderHits.push(loc.locale ?? '');
        break;
      }
    }
  }
  checks.push({
    id: 'no-placeholder',
    label: 'No placeholder text',
    description:
      placeholderHits.length === 0
        ? 'No placeholder text detected.'
        : `Possible placeholder text in: ${Array.from(new Set(placeholderHits)).join(', ')}.`,
    status: placeholderHits.length === 0 ? 'pass' : 'warn',
  });

  return checks;
}

function isPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(text));
}

// App Store Connect limits
const APPSTORE_LIMITS = {
  title: 30,
  subtitle: 30,
  keywords: 100,
  description: 4000,
  promotionalText: 170,
  whatsNew: 4000,
};

// Google Play limits
const GOOGLEPLAY_LIMITS = {
  title: 50,
  shortDescription: 80,
  fullDescription: 4000,
  whatsNew: 500,
};

export function validateLocalizations(
  localizations: AppLocalization[],
  store: string
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const limits = store === 'GOOGLEPLAY' ? GOOGLEPLAY_LIMITS : APPSTORE_LIMITS;

  for (const loc of localizations) {
    const locale = loc.locale ?? 'unknown';

    if (store === 'GOOGLEPLAY') {
      // Required
      if (!loc.title?.trim()) {
        issues.push({
          locale,
          field: 'title',
          message: 'Title is required',
          severity: 'error',
        });
      }

      // Limits
      if (loc.title && loc.title.length > limits.title) {
        issues.push({
          locale,
          field: 'title',
          message: `Title too long (${loc.title.length}/${limits.title} chars)`,
          severity: 'error',
        });
      }
      if (
        loc.shortDescription &&
        loc.shortDescription.length >
          (limits as typeof GOOGLEPLAY_LIMITS).shortDescription
      ) {
        issues.push({
          locale,
          field: 'shortDescription',
          message: `Short description too long (${loc.shortDescription.length}/${(limits as typeof GOOGLEPLAY_LIMITS).shortDescription} chars)`,
          severity: 'error',
        });
      }
      if (
        loc.fullDescription &&
        loc.fullDescription.length > GOOGLEPLAY_LIMITS.fullDescription
      ) {
        issues.push({
          locale,
          field: 'fullDescription',
          message: `Full description too long (${loc.fullDescription.length}/${GOOGLEPLAY_LIMITS.fullDescription} chars)`,
          severity: 'error',
        });
      }
      if (loc.whatsNew && loc.whatsNew.length > GOOGLEPLAY_LIMITS.whatsNew) {
        issues.push({
          locale,
          field: 'whatsNew',
          message: `What's new too long (${loc.whatsNew.length}/${GOOGLEPLAY_LIMITS.whatsNew} chars)`,
          severity: 'error',
        });
      }
    } else {
      // App Store
      const l = limits as typeof APPSTORE_LIMITS;

      if (!loc.title?.trim()) {
        issues.push({
          locale,
          field: 'title',
          message: 'Title is required',
          severity: 'error',
        });
      }
      if (loc.title && loc.title.length > l.title) {
        issues.push({
          locale,
          field: 'title',
          message: `Title too long (${loc.title.length}/${l.title} chars)`,
          severity: 'error',
        });
      }
      if (loc.subtitle && loc.subtitle.length > l.subtitle) {
        issues.push({
          locale,
          field: 'subtitle',
          message: `Subtitle too long (${loc.subtitle.length}/${l.subtitle} chars)`,
          severity: 'error',
        });
      }
      if (loc.keywords && loc.keywords.length > l.keywords) {
        issues.push({
          locale,
          field: 'keywords',
          message: `Keywords too long (${loc.keywords.length}/${l.keywords} chars)`,
          severity: 'error',
        });
      }
      if (loc.description && loc.description.length > l.description) {
        issues.push({
          locale,
          field: 'description',
          message: `Description too long (${loc.description.length}/${l.description} chars)`,
          severity: 'error',
        });
      }
      if (
        loc.promotionalText &&
        loc.promotionalText.length > l.promotionalText
      ) {
        issues.push({
          locale,
          field: 'promotionalText',
          message: `Promotional text too long (${loc.promotionalText.length}/${l.promotionalText} chars)`,
          severity: 'error',
        });
      }

      // Warnings
      if (!loc.description?.trim()) {
        issues.push({
          locale,
          field: 'description',
          message: 'Description is empty',
          severity: 'warning',
        });
      }
      if (!loc.keywords?.trim()) {
        issues.push({
          locale,
          field: 'keywords',
          message: 'Keywords are empty',
          severity: 'warning',
        });
      }
    }

    // Placeholder checks (all stores)
    const textFields: [string, string | null | undefined][] = [
      ['title', loc.title],
      ['description', loc.description],
      ['shortDescription', loc.shortDescription],
      ['fullDescription', loc.fullDescription],
    ];
    for (const [field, val] of textFields) {
      if (val && isPlaceholder(val)) {
        issues.push({
          locale,
          field,
          message: `${field} looks like placeholder text`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
  };
}
