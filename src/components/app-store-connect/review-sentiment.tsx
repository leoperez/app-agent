'use client';

import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { SentimentData } from '@/lib/swr/app';
import { useTranslations } from 'next-intl';

interface ReviewSentimentProps {
  data?: SentimentData;
  loading?: boolean;
}

function StarBar({ score }: { score: number }) {
  return (
    <span className="text-amber-400">
      {'★'.repeat(score)}
      <span className="text-muted-foreground/30">{'★'.repeat(5 - score)}</span>
    </span>
  );
}

function SentimentBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full gap-px">
      <div
        className="bg-green-500 transition-all"
        style={{ width: `${pct(positive)}%` }}
        title={`Positive: ${positive}`}
      />
      <div
        className="bg-yellow-400 transition-all"
        style={{ width: `${pct(neutral)}%` }}
        title={`Neutral: ${neutral}`}
      />
      <div
        className="bg-red-500 transition-all"
        style={{ width: `${pct(negative)}%` }}
        title={`Negative: ${negative}`}
      />
    </div>
  );
}

export function ReviewSentiment({ data, loading }: ReviewSentimentProps) {
  const t = useTranslations('reviews');

  if (loading) {
    return <Skeleton height={160} className="rounded-xl" />;
  }

  const empty =
    !data ||
    data.totals.positive + data.totals.neutral + data.totals.negative === 0;

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t('sentiment-title')}</p>
        {!empty && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {t('positive')} {data!.totals.positive}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              {t('neutral')} {data!.totals.neutral}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {t('negative')} {data!.totals.negative}
            </span>
          </div>
        )}
      </div>

      {empty ? (
        <p className="text-xs text-muted-foreground">{t('sentiment-empty')}</p>
      ) : (
        <>
          {/* Overall bar */}
          <SentimentBar
            positive={data!.totals.positive}
            neutral={data!.totals.neutral}
            negative={data!.totals.negative}
          />

          {/* By version breakdown */}
          {data!.byVersion.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {t('by-version')}
              </p>
              {data!.byVersion.slice(0, 5).map((v) => (
                <div key={v.version} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{v.version}</span>
                    <span className="text-muted-foreground">
                      {v.total} {t('reviews-count')} · ★ {v.avgScore.toFixed(1)}
                    </span>
                  </div>
                  <SentimentBar
                    positive={v.positive}
                    neutral={v.neutral}
                    negative={v.negative}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Recent negative reviews */}
          {data!.recentNegative.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {t('recent-negative')}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data!.recentNegative.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StarBar score={r.score} />
                      {r.version && (
                        <span className="text-xs text-muted-foreground">
                          {r.version}
                        </span>
                      )}
                    </div>
                    {r.title && (
                      <p className="text-xs font-medium">{r.title}</p>
                    )}
                    {r.body && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {r.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
