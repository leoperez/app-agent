'use client';

import { useMemo, useState } from 'react';
import {
  MdExpandMore,
  MdExpandLess,
  MdCheckCircle,
  MdRadioButtonUnchecked,
} from 'react-icons/md';
import { useGetAsoKeywords } from '@/lib/swr/aso';
import { LocaleCode } from '@/lib/utils/locale';

interface KeywordFieldOptimizerProps {
  appId: string;
  locale: string;
  title?: string | null;
  subtitle?: string | null;
  keywordsField?: string | null;
}

function textContainsKeyword(text: string, keyword: string): boolean {
  const haystack = text.toLowerCase();
  const needle = keyword.toLowerCase();
  // Check for whole-word or substring match (keywords in ASO don't need word boundaries)
  return haystack.includes(needle);
}

function fieldsCoverKeyword(
  keyword: string,
  title: string,
  subtitle: string,
  keywordsField: string
): boolean {
  return (
    textContainsKeyword(title, keyword) ||
    textContainsKeyword(subtitle, keyword) ||
    textContainsKeyword(keywordsField, keyword)
  );
}

export function KeywordFieldOptimizer({
  appId,
  locale,
  title = '',
  subtitle = '',
  keywordsField = '',
}: KeywordFieldOptimizerProps) {
  const [open, setOpen] = useState(false);
  const { keywords, loading: isLoading } = useGetAsoKeywords(
    appId,
    locale as LocaleCode
  );

  const { covered, uncovered, coveragePct } = useMemo(() => {
    if (!keywords?.length)
      return { covered: [], uncovered: [], coveragePct: 0 };

    const t = title ?? '';
    const s = subtitle ?? '';
    const k = keywordsField ?? '';

    const covered = keywords.filter((kw) =>
      fieldsCoverKeyword(kw.keyword, t, s, k)
    );
    const uncovered = keywords
      .filter((kw) => !fieldsCoverKeyword(kw.keyword, t, s, k))
      .sort((a, b) => (b.trafficScore ?? 0) - (a.trafficScore ?? 0));

    const pct = Math.round((covered.length / keywords.length) * 100);
    return { covered, uncovered, coveragePct: pct };
  }, [keywords, title, subtitle, keywordsField]);

  if (isLoading || !keywords?.length) return null;

  const barColor =
    coveragePct >= 70
      ? 'bg-green-500'
      : coveragePct >= 40
        ? 'bg-amber-500'
        : 'bg-red-500';

  const textColor =
    coveragePct >= 70
      ? 'text-green-700 dark:text-green-400'
      : coveragePct >= 40
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Keyword coverage
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <span className={`text-xs font-semibold shrink-0 ${textColor}`}>
              {coveragePct}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({covered.length}/{keywords.length})
            </span>
          </div>
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
          {uncovered.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Not yet used ({uncovered.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {uncovered.slice(0, 20).map((kw) => (
                  <span
                    key={kw.id}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                    title={`Traffic: ${kw.trafficScore?.toFixed(1) ?? '—'} · Score: ${kw.overall?.toFixed(1) ?? '—'}`}
                  >
                    <MdRadioButtonUnchecked className="h-2.5 w-2.5 shrink-0" />
                    {kw.keyword}
                    {kw.trafficScore != null && (
                      <span className="opacity-60 text-[10px]">
                        {kw.trafficScore.toFixed(0)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {covered.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Covered ({covered.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {covered.map((kw) => (
                  <span
                    key={kw.id}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
                  >
                    <MdCheckCircle className="h-2.5 w-2.5 shrink-0" />
                    {kw.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
