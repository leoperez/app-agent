'use client';

import { MdCheckCircle, MdError, MdWarning } from 'react-icons/md';
import { ValidationResult } from '@/lib/utils/publish-validation';
import { getLocaleName, LocaleCode } from '@/lib/utils/locale';
import { useTranslations } from 'next-intl';

interface PublishValidationProps {
  result: ValidationResult;
}

export function PublishValidation({ result }: PublishValidationProps) {
  const t = useTranslations('publish-validation');
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');

  if (result.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
        <MdCheckCircle className="h-4 w-4 shrink-0" />
        <span>{t('all-good')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-xs">
            <MdError className="h-3.5 w-3.5" />
            {t('errors', { count: errors.length })}
          </div>
          {errors.map((issue, i) => (
            <div
              key={i}
              className="text-xs text-red-700 dark:text-red-300 flex gap-2"
            >
              <span className="shrink-0 font-medium">
                {getLocaleName(issue.locale as LocaleCode)} · {issue.field}:
              </span>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-xs">
            <MdWarning className="h-3.5 w-3.5" />
            {t('warnings', { count: warnings.length })}
          </div>
          {warnings.map((issue, i) => (
            <div
              key={i}
              className="text-xs text-amber-700 dark:text-amber-300 flex gap-2"
            >
              <span className="shrink-0 font-medium">
                {getLocaleName(issue.locale as LocaleCode)} · {issue.field}:
              </span>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
