'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MdWarning } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import { useGetCannibalization } from '@/lib/swr/aso';
import { useApp } from '@/context/app';
import { getLocaleName, LocaleCode } from '@/lib/utils/locale';

export function KeywordCannibalization() {
  const t = useTranslations('aso');
  const appInfo = useApp();
  const { cannibalized, loading } = useGetCannibalization(
    appInfo?.currentApp?.id || ''
  );

  if (loading || cannibalized.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <MdWarning className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('cannibalization-title', { count: cannibalized.length })}
        </p>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400">
        {t('cannibalization-description')}
      </p>

      <div className="space-y-2">
        {cannibalized.map((entry) => (
          <div
            key={entry.keyword}
            className="rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900 px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{entry.keyword}</span>
              <span className="text-xs text-muted-foreground">
                {entry.locales.length} {t('cannibalization-locales')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {entry.locales.map((locale, i) => (
                <span
                  key={locale}
                  className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                >
                  {getLocaleName(locale as LocaleCode)}
                  {entry.positions[i] != null && (
                    <span className="ml-1 text-foreground font-medium">
                      #{entry.positions[i]}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
