'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';
import { useGetReleaseTimeline } from '@/lib/swr/app';
import { useTranslations } from 'next-intl';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { MdRocketLaunch } from 'react-icons/md';

const DAYS_OPTIONS = [90, 180, 365] as const;

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDark;
}

function TimelineChart({
  ratings,
  releases,
  isDark,
}: {
  ratings: { date: string; rating: number }[];
  releases: {
    version: string;
    releasedAt: string;
    ratingAtRelease: number | null;
    ratingBefore: number | null;
  }[];
  isDark: boolean;
}) {
  const W = 600;
  const H = 140;
  const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

  if (ratings.length < 2) {
    return (
      <p className="text-xs text-center text-muted-foreground py-8">
        Not enough rating data yet.
      </p>
    );
  }

  const dates = ratings.map((r) => r.date);
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const toX = (date: string) => {
    const pct =
      (new Date(date).getTime() - new Date(minDate).getTime()) /
      (new Date(maxDate).getTime() - new Date(minDate).getTime());
    return PAD.left + pct * (W - PAD.left - PAD.right);
  };

  const minRating = Math.max(
    1,
    Math.min(...ratings.map((r) => r.rating)) - 0.2
  );
  const maxRating = Math.min(
    5,
    Math.max(...ratings.map((r) => r.rating)) + 0.2
  );

  const toY = (v: number) =>
    PAD.top +
    ((maxRating - v) / (maxRating - minRating)) * (H - PAD.top - PAD.bottom);

  const points = ratings
    .map((r) => `${toX(r.date).toFixed(1)},${toY(r.rating).toFixed(1)}`)
    .join(' ');

  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const labelColor = isDark ? '#6b7280' : '#9ca3af';
  const lineColor = '#f59e0b';
  const releaseColor = isDark ? '#818cf8' : '#6366f1';

  const gridLines = [2, 3, 4, 5];

  // Only show releases that fall within the rating date range
  const visibleReleases = releases.filter(
    (r) => r.releasedAt >= minDate && r.releasedAt <= maxDate
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={toY(v)}
            y2={toY(v)}
            stroke={gridColor}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 4}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize={10}
            fill={labelColor}
          >
            {v}★
          </text>
        </g>
      ))}

      {/* Rating line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Release markers */}
      {visibleReleases.map((r) => {
        const x = toX(r.releasedAt);
        const ratingY =
          r.ratingAtRelease != null
            ? toY(r.ratingAtRelease)
            : toY((minRating + maxRating) / 2);
        const delta =
          r.ratingAtRelease != null && r.ratingBefore != null
            ? r.ratingAtRelease - r.ratingBefore
            : null;
        const dotColor =
          delta == null ? releaseColor : delta >= 0 ? '#22c55e' : '#ef4444';

        return (
          <g key={r.releasedAt + r.version}>
            {/* Vertical dashed line */}
            <line
              x1={x}
              x2={x}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke={releaseColor}
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.5}
            />
            {/* Dot at rating level */}
            <circle cx={x} cy={ratingY} r={5} fill={dotColor} opacity={0.9} />
            {/* Version label */}
            <text
              x={x}
              y={H - PAD.bottom + 12}
              textAnchor="middle"
              fontSize={9}
              fill={releaseColor}
              fontWeight="600"
            >
              v{r.version}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ReleaseTimeline() {
  const teamInfo = useTeam();
  const { currentApp } = useApp();
  const t = useTranslations('release-timeline');
  const isDark = useDarkMode();
  const [days, setDays] = useState<(typeof DAYS_OPTIONS)[number]>(180);

  const teamId = teamInfo?.currentTeam?.id ?? '';
  const appId = currentApp?.id ?? '';

  const { data, loading } = useGetReleaseTimeline(teamId, appId, days);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <Skeleton height={20} width={200} className="mb-4" />
        <Skeleton height={140} />
      </div>
    );
  }

  if (data.ratings.length === 0 && data.releases.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MdRocketLaunch className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h3>
        </div>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                days === d
                  ? 'bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <TimelineChart
          ratings={data.ratings}
          releases={data.releases}
          isDark={isDark}
        />

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-amber-400" />
            {t('legend-rating')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            {t('legend-release')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {t('legend-improved')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {t('legend-dropped')}
          </span>
        </div>

        {/* Release list */}
        {data.releases.length > 0 && (
          <div className="mt-4 space-y-1">
            {data.releases.slice(0, 6).map((r) => {
              const delta =
                r.ratingAtRelease != null && r.ratingBefore != null
                  ? r.ratingAtRelease - r.ratingBefore
                  : null;
              return (
                <div
                  key={r.version + r.releasedAt}
                  className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0"
                >
                  <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    v{r.version}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(r.releasedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-mono">
                    {r.ratingAtRelease != null
                      ? `★ ${r.ratingAtRelease.toFixed(2)}`
                      : '—'}
                  </span>
                  {delta != null ? (
                    <span
                      className={`font-mono font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {delta >= 0 ? '+' : ''}
                      {delta.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
