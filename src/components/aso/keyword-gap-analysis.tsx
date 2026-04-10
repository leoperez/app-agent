'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MdExpandMore,
  MdExpandLess,
  MdOutlineSearchOff,
  MdAdd,
} from 'react-icons/md';
import { useApp } from '@/context/app';
import { useTeam } from '@/context/team';
import { useGetKeywordGap, KeywordGapEntry } from '@/lib/swr/aso';

function CompetitorCountBadge({ count }: { count: number }) {
  if (count <= 1)
    return (
      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
        1 competitor
      </span>
    );
  return (
    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
      {count} competitors
    </span>
  );
}

function GapGroup({
  locale,
  entries,
  onAdd,
}: {
  locale: string;
  entries: KeywordGapEntry[];
  onAdd: (keyword: string, locale: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  const handleAdd = async (keyword: string) => {
    setAdding((prev) => new Set(prev).add(keyword));
    try {
      await onAdd(keyword, locale);
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(keyword);
        return next;
      });
    }
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{locale}</span>
          <span className="text-muted-foreground">
            {entries.length} gap keyword{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? (
          <MdExpandLess className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <MdExpandMore className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border/50">
              {entries.map((entry) => (
                <div
                  key={entry.keyword}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {entry.keyword}
                    </span>
                    <CompetitorCountBadge count={entry.competitorCount} />
                    <span className="text-muted-foreground truncate hidden sm:block">
                      via {entry.competitorTitle}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdd(entry.keyword)}
                    disabled={adding.has(entry.keyword)}
                    className="flex items-center gap-0.5 ml-2 text-blue-600 hover:text-blue-700 disabled:opacity-40 shrink-0"
                    title={`Track "${entry.keyword}" for ${locale}`}
                  >
                    <MdAdd className="h-3.5 w-3.5" />
                    {adding.has(entry.keyword) ? 'Adding…' : 'Track'}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function KeywordGapAnalysis() {
  const appInfo = useApp();
  const teamInfo = useTeam();
  const [open, setOpen] = useState(false);

  const { gaps, loading } = useGetKeywordGap(appInfo?.currentApp?.id ?? '');

  // Group by locale
  const byLocale = gaps.reduce<Record<string, KeywordGapEntry[]>>((acc, g) => {
    if (!acc[g.locale]) acc[g.locale] = [];
    acc[g.locale].push(g);
    return acc;
  }, {});

  const locales = Object.keys(byLocale).sort();
  const totalGaps = gaps.length;
  // Keywords used by 2+ competitors = high priority
  const highPriority = gaps.filter((g) => g.competitorCount >= 2).length;

  const handleAdd = async (keyword: string, locale: string) => {
    const teamId = teamInfo?.currentTeam?.id;
    const appId = appInfo?.currentApp?.id;
    if (!teamId || !appId) return;

    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/keyword`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      }
    );
    if (!res.ok) {
      toast.error(`Failed to add "${keyword}"`);
      throw new Error('failed');
    }
    toast.success(`"${keyword}" added for ${locale}`);
  };

  if (!loading && totalGaps === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MdOutlineSearchOff className="h-4 w-4" />
          <span>Keyword gap analysis</span>
          {!loading && (
            <>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {totalGaps} missing
              </span>
              {highPriority > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {highPriority} high priority
                </span>
              )}
            </>
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
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Keywords your competitors use that you don&apos;t track yet.
                Higher competitor count = higher priority.
              </p>
              {loading && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {!loading &&
                locales.map((locale) => (
                  <GapGroup
                    key={locale}
                    locale={locale}
                    entries={byLocale[locale]}
                    onAdd={handleAdd}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
