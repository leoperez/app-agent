'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdHistory, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useGetMetadataHistory } from '@/lib/swr/aso';
import { formatDistanceToNow } from 'date-fns';
import { LocaleCode } from '@/lib/utils/locale';
import { useApp } from '@/context/app';
import { Store } from '@/types/aso';

type Field = { label: string; key: keyof typeof FIELDS };
const FIELDS = {
  title: 'Title',
  subtitle: 'Subtitle',
  keywords: 'Keywords',
  description: 'Description',
  shortDescription: 'Short description',
  fullDescription: 'Full description',
} as const;

type DiffToken = { type: 'same' | 'removed' | 'added'; word: string };

function computeWordDiff(a: string, b: string): DiffToken[] {
  const wa = a.split(/\s+/).filter(Boolean);
  const wb = b.split(/\s+/).filter(Boolean);
  const m = wa.length;
  const n = wb.length;

  // LCS on words (limit to prevent O(n²) on large descriptions)
  const MAX = 120;
  if (m > MAX || n > MAX) {
    // Fall back to block diff for long texts
    return [
      ...wa.map((w) => ({ type: 'removed' as const, word: w })),
      ...wb.map((w) => ({ type: 'added' as const, word: w })),
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        wa[i - 1].toLowerCase() === wb[j - 1].toLowerCase()
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffToken[] = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wa[i - 1].toLowerCase() === wb[j - 1].toLowerCase()) {
      result.unshift({ type: 'same', word: wb[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', word: wb[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', word: wa[i - 1] });
      i--;
    }
  }
  return result;
}

function diffWords(a: string, b: string): React.ReactNode {
  if (a === b)
    return <span className="text-muted-foreground text-xs">{b}</span>;

  const tokens = computeWordDiff(a, b);
  return (
    <span className="text-xs leading-relaxed">
      {tokens.map((tok, i) => {
        if (tok.type === 'removed')
          return (
            <span
              key={i}
              className="line-through text-red-500 bg-red-50 dark:bg-red-950/30 px-0.5 rounded mr-0.5"
            >
              {tok.word}
            </span>
          );
        if (tok.type === 'added')
          return (
            <span
              key={i}
              className="text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-0.5 rounded mr-0.5"
            >
              {tok.word}
            </span>
          );
        return (
          <span key={i} className="mr-0.5">
            {tok.word}
          </span>
        );
      })}
    </span>
  );
}

interface MetadataHistoryProps {
  locale: LocaleCode;
}

export function MetadataHistory({ locale }: MetadataHistoryProps) {
  const appInfo = useApp();
  const [open, setOpen] = useState(false);
  const { history, loading } = useGetMetadataHistory(
    appInfo?.currentApp?.id || '',
    locale,
    open
  );

  const isGPlay = appInfo?.currentApp?.store === Store.GOOGLEPLAY;
  const fields: Field[] = isGPlay
    ? [
        { label: 'Title', key: 'title' },
        { label: 'Short description', key: 'shortDescription' },
        { label: 'Full description', key: 'fullDescription' },
      ]
    : [
        { label: 'Title', key: 'title' },
        { label: 'Subtitle', key: 'subtitle' },
        { label: 'Keywords', key: 'keywords' },
        { label: 'Description', key: 'description' },
      ];

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MdHistory className="h-4 w-4" />
          <span>Metadata history</span>
          {history.length > 0 && !loading && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
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
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-3 max-h-72 overflow-y-auto">
              {loading && (
                <p className="text-xs text-muted-foreground py-2">Loading…</p>
              )}
              {!loading && history.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No history yet — changes are recorded each time you publish.
                </p>
              )}
              {history.map((entry, i) => {
                const prev = history[i + 1];
                return (
                  <div key={entry.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {entry.version ? `v${entry.version} · ` : ''}
                      {formatDistanceToNow(new Date(entry.pushedAt), {
                        addSuffix: true,
                      })}
                    </p>
                    <div className="space-y-1 pl-2 border-l-2 border-border">
                      {fields.map(({ label, key }) => {
                        const curr = (entry as any)[key] as string | null;
                        const old = prev
                          ? ((prev as any)[key] as string | null)
                          : null;
                        if (!curr) return null;
                        return (
                          <div key={key}>
                            <span className="text-xs text-muted-foreground font-medium mr-1">
                              {label}:
                            </span>
                            {prev && old !== curr ? (
                              diffWords(old ?? '', curr)
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {curr.slice(0, 120)}
                                {curr.length > 120 ? '…' : ''}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
