'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdExpandMore,
  MdExpandLess,
  MdCheckCircle,
  MdCancel,
  MdWarning,
} from 'react-icons/md';
import { AppLocalization, Store } from '@/types/aso';
import { getLocaleName, LocaleCode } from '@/lib/utils/locale';
import { useTranslations } from 'next-intl';

interface LocalizationEntry {
  public?: AppLocalization;
  draft?: AppLocalization;
}

interface LocalizationCompletenessProps {
  localizations: Record<string, LocalizationEntry>;
  store?: Store;
}

const APP_STORE_FIELDS = [
  'title',
  'subtitle',
  'keywords',
  'description',
] as const;
const GOOGLE_PLAY_FIELDS = [
  'title',
  'shortDescription',
  'fullDescription',
] as const;

type FieldKey = keyof AppLocalization;

function FieldStatus({ value }: { value: string | null | undefined }) {
  if (!value?.trim()) {
    return <MdCancel className="h-3.5 w-3.5 text-red-400" />;
  }
  return <MdCheckCircle className="h-3.5 w-3.5 text-green-500" />;
}

function scoreLocale(loc: AppLocalization, fields: FieldKey[]): number {
  const filled = fields.filter((f) => !!(loc as any)[f]?.trim()).length;
  return Math.round((filled / fields.length) * 100);
}

export function LocalizationCompleteness({
  localizations,
  store = Store.APPSTORE,
}: LocalizationCompletenessProps) {
  const t = useTranslations('localization-completeness');
  const [open, setOpen] = useState(false);

  const isGPlay = store === Store.GOOGLEPLAY;
  const fields = isGPlay ? GOOGLE_PLAY_FIELDS : APP_STORE_FIELDS;

  const entries = Object.entries(localizations).map(([locale, entry]) => {
    const loc = entry.draft ?? entry.public;
    const score = loc ? scoreLocale(loc, fields as any) : 0;
    return { locale, loc, score };
  });

  const completeCount = entries.filter((e) => e.score === 100).length;
  const incompleteCount = entries.length - completeCount;

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {incompleteCount > 0 ? (
            <MdWarning className="h-4 w-4 text-amber-500" />
          ) : (
            <MdCheckCircle className="h-4 w-4 text-green-500" />
          )}
          <span>{t('title')}</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
            {t('complete-count', {
              complete: completeCount,
              total: entries.length,
            })}
          </span>
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                      {t('locale')}
                    </th>
                    {fields.map((f) => (
                      <th
                        key={f}
                        className="text-center px-2 py-2 font-medium text-muted-foreground"
                      >
                        {t(`field-${f}` as any)}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                      {t('score')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(({ locale, loc, score }) => (
                    <tr
                      key={locale}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 font-medium">
                        {getLocaleName(locale as LocaleCode)}
                        <span className="ml-1 text-muted-foreground font-normal">
                          ({locale})
                        </span>
                      </td>
                      {fields.map((f) => (
                        <td key={f} className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <FieldStatus value={loc ? (loc as any)[f] : null} />
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`font-semibold ${
                            score === 100
                              ? 'text-green-600'
                              : score >= 50
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
