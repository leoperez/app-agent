'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MdWarning, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useTranslations } from 'next-intl';
import { useGetCannibalization } from '@/lib/swr/aso';
import { useApp } from '@/context/app';
import { getLocaleName, LocaleCode } from '@/lib/utils/locale';
import type { CannibalizationEntry } from '@/app/api/teams/[teamId]/apps/[appId]/keywords/cannibalization/route';

function PositionBadge({ pos }: { pos: number | null }) {
  if (pos == null)
    return <span className="text-xs text-muted-foreground font-mono">—</span>;
  const color =
    pos <= 10
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : pos <= 30
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  return (
    <span
      className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${color}`}
    >
      #{pos}
    </span>
  );
}

function EntryRow({ entry }: { entry: CannibalizationEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{entry.keyword}</span>
          <span className="text-xs text-muted-foreground">
            {entry.locales.length} locales
          </span>
        </div>
        {open ? (
          <MdExpandLess className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <MdExpandMore className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-amber-100 dark:border-amber-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wide bg-muted/30">
                <th className="px-3 py-1.5 text-left font-medium">Locale</th>
                <th className="px-3 py-1.5 text-left font-medium">Position</th>
                <th className="px-3 py-1.5 text-left font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {entry.locales.map((locale, i) => (
                <tr
                  key={locale}
                  className="border-t border-border/50 hover:bg-muted/20"
                >
                  <td className="px-3 py-2 text-xs">
                    {getLocaleName(locale as LocaleCode)}{' '}
                    <span className="text-muted-foreground">{locale}</span>
                  </td>
                  <td className="px-3 py-2">
                    <PositionBadge pos={entry.positions[i]} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                    {entry.overallScores[i] != null
                      ? entry.overallScores[i]!.toFixed(1)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function KeywordCannibalization() {
  const t = useTranslations('keyword-cannibalization');
  const appInfo = useApp();
  const { cannibalized, loading } = useGetCannibalization(
    appInfo?.currentApp?.id || ''
  );

  if (loading || cannibalized.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <MdWarning className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {t('title', { count: cannibalized.length })}
        </p>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400">
        {t('subtitle')}
      </p>

      <div className="space-y-2">
        {cannibalized.map((entry) => (
          <EntryRow key={entry.keyword} entry={entry} />
        ))}
      </div>
    </motion.div>
  );
}
