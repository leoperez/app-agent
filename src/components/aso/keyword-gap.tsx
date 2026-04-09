'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdGridView } from 'react-icons/md';
import { IoMdAdd as AddIcon } from 'react-icons/io';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { useGetKeywordGap } from '@/lib/swr/aso';
import { useApp } from '@/context/app';
import { getLocaleName, LocaleCode } from '@/lib/utils/locale';

interface KeywordGapProps {
  onAddKeyword?: (keyword: string, locale: string) => Promise<void>;
}

export function KeywordGap({ onAddKeyword }: KeywordGapProps) {
  const t = useTranslations('aso');
  const appInfo = useApp();
  const [open, setOpen] = useState(false);
  const [filterLocale, setFilterLocale] = useState<string>('all');
  const [adding, setAdding] = useState<string | null>(null);

  const { gaps, loading } = useGetKeywordGap(appInfo?.currentApp?.id || '');

  if (!loading && gaps.length === 0) return null;

  // Unique locales present in gap data
  const locales = Array.from(new Set(gaps.map((g) => g.locale))).sort();

  const filtered =
    filterLocale === 'all'
      ? gaps
      : gaps.filter((g) => g.locale === filterLocale);

  const handleAdd = async (keyword: string, locale: string) => {
    if (!onAddKeyword) return;
    const key = `${locale}:${keyword}`;
    setAdding(key);
    try {
      await onAddKeyword(keyword, locale);
      toast.success(`"${keyword}" added`);
    } catch {
      toast.error('Failed to add keyword');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MdGridView className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('keyword-gap-title')}</span>
          {!loading && gaps.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {gaps.length}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {open ? '▲' : '▼'}
        </span>
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
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('keyword-gap-description')}
              </p>

              {/* Locale filter */}
              {locales.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterLocale('all')}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filterLocale === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    All
                  </button>
                  {locales.map((locale) => (
                    <button
                      key={locale}
                      onClick={() => setFilterLocale(locale)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        filterLocale === locale
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {getLocaleName(locale as LocaleCode)}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="h-20 animate-pulse bg-muted rounded-lg" />
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-1.5 font-medium">
                          {t('keyword-gap-col-keyword')}
                        </th>
                        <th className="text-left py-1.5 font-medium">
                          {t('keyword-gap-col-locale')}
                        </th>
                        <th className="text-left py-1.5 font-medium">
                          {t('keyword-gap-col-competitors')}
                        </th>
                        <th className="py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 50).map((gap) => {
                        const key = `${gap.locale}:${gap.keyword}`;
                        return (
                          <tr
                            key={key}
                            className="border-b border-border/50 hover:bg-muted/30"
                          >
                            <td className="py-1.5 font-medium">
                              {gap.keyword}
                            </td>
                            <td className="py-1.5 text-muted-foreground">
                              {getLocaleName(gap.locale as LocaleCode)}
                            </td>
                            <td className="py-1.5">
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                                {gap.competitorCount}
                              </span>
                            </td>
                            <td className="py-1.5 text-right">
                              {onAddKeyword && (
                                <button
                                  onClick={() =>
                                    handleAdd(gap.keyword, gap.locale)
                                  }
                                  disabled={adding === key}
                                  className="text-primary hover:underline disabled:opacity-50"
                                  title={t('keyword-gap-add')}
                                >
                                  <AddIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {t('keyword-gap-showing', {
                        shown: 50,
                        total: filtered.length,
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
