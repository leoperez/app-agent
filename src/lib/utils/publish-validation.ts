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
