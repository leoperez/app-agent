'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { MdHistory, MdExpandMore } from 'react-icons/md';
import { useTranslations } from 'next-intl';

export interface ChangeEntry {
  id: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
  detectedAt: string;
  competitor: {
    id: string;
    title: string;
    competitorId: string;
    iconUrl: string | null;
  };
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  keywords: 'Keywords',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// Simple word-level LCS diff — returns tokens tagged as equal/added/removed
type DiffToken = { text: string; type: 'equal' | 'added' | 'removed' };

function wordDiff(oldText: string, newText: string): DiffToken[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ text: oldWords[i - 1], type: 'equal' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: newWords[j - 1], type: 'added' });
      j--;
    } else {
      result.unshift({ text: oldWords[i - 1], type: 'removed' });
      i--;
    }
  }
  return result;
}

function WordDiff({ oldText, newText }: { oldText: string; newText: string }) {
  // For long texts (descriptions), limit the diff to first 300 chars of each
  const maxLen = 300;
  const truncatedOld =
    oldText.length > maxLen ? oldText.slice(0, maxLen) + '…' : oldText;
  const truncatedNew =
    newText.length > maxLen ? newText.slice(0, maxLen) + '…' : newText;

  const tokens = wordDiff(truncatedOld, truncatedNew);

  return (
    <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
      {tokens.map((token, i) => {
        if (token.type === 'equal') {
          return <span key={i}>{token.text}</span>;
        }
        if (token.type === 'added') {
          return (
            <span
              key={i}
              className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded px-0.5"
            >
              {token.text}
            </span>
          );
        }
        // removed
        return (
          <span
            key={i}
            className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 line-through rounded px-0.5"
          >
            {token.text}
          </span>
        );
      })}
    </p>
  );
}

// Group changes by competitor
function groupByCompetitor(changes: ChangeEntry[]) {
  const map = new Map<
    string,
    { competitor: ChangeEntry['competitor']; entries: ChangeEntry[] }
  >();
  for (const change of changes) {
    const key = change.competitor.competitorId;
    if (!map.has(key)) {
      map.set(key, { competitor: change.competitor, entries: [] });
    }
    map.get(key)!.entries.push(change);
  }
  return Array.from(map.values());
}

function CompetitorDiffGroup({
  competitor,
  entries,
}: {
  competitor: ChangeEntry['competitor'];
  entries: ChangeEntry[];
}) {
  const [open, setOpen] = useState(false);
  const latest = entries[0];

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 text-xs hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold truncate text-foreground">
            {competitor.title}
          </span>
          <span className="shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
            {entries.length} change{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
          <span>{timeAgo(latest.detectedAt)}</span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <MdExpandMore className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
              {entries.map((entry) => (
                <div key={entry.id} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {FIELD_LABELS[entry.field] ?? entry.field}
                  </p>
                  {entry.previousValue != null && entry.newValue != null ? (
                    <WordDiff
                      oldText={entry.previousValue}
                      newText={entry.newValue}
                    />
                  ) : entry.newValue != null ? (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {entry.newValue.slice(0, 300)}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 dark:text-red-400 line-through">
                      {(entry.previousValue ?? '').slice(0, 300)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CompetitorChangelogProps {
  changes: ChangeEntry[];
  loading?: boolean;
}

export default function CompetitorChangelog({
  changes,
  loading,
}: CompetitorChangelogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('aso');

  if (loading || changes.length === 0) return null;

  const grouped = groupByCompetitor(changes);

  return (
    <div className="border-t border-border mt-2 pt-2">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MdHistory className="w-4 h-4" />
          {t('competitor-changelog-title')}
          <span className="ml-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
            {changes.length}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <MdExpandMore className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1 pb-2 max-h-96 overflow-y-auto">
              {grouped.map((group) => (
                <CompetitorDiffGroup
                  key={group.competitor.competitorId}
                  competitor={group.competitor}
                  entries={group.entries}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
