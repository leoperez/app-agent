'use client';

import { useEffect, useState } from 'react';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';
import { useGetHealthScoreHistory } from '@/lib/swr/app';
import { useTranslations } from 'next-intl';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { MdFavorite } from 'react-icons/md';

const DAYS_OPTIONS = [30, 90, 180] as const;

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

function ScoreChart({
  data,
  isDark,
}: {
  data: { date: string; score: number }[];
  isDark: boolean;
}) {
  const W = 600;
  const H = 120;
  const PAD = { top: 10, right: 12, bottom: 24, left: 36 };

  if (data.length < 2) {
    return (
      <p className="text-xs text-center text-muted-foreground py-8">
        No history yet — data accumulates daily.
      </p>
    );
  }

  const toX = (i: number) =>
    PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + ((100 - v) / 100) * (H - PAD.top - PAD.bottom);

  const points = data
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.score).toFixed(1)}`)
    .join(' ');

  // Fill area under line
  const first = `${toX(0).toFixed(1)},${(H - PAD.bottom).toFixed(1)}`;
  const last = `${toX(data.length - 1).toFixed(1)},${(H - PAD.bottom).toFixed(1)}`;
  const fillPoints = `${first} ${points} ${last}`;

  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const labelColor = isDark ? '#6b7280' : '#9ca3af';
  const latest = data[data.length - 1].score;
  const lineColor =
    latest >= 75 ? '#22c55e' : latest >= 50 ? '#f59e0b' : '#ef4444';
  const fillColor =
    latest >= 75 ? '#22c55e18' : latest >= 50 ? '#f59e0b18' : '#ef444418';

  const gridLines = [25, 50, 75, 100];

  // Date labels: first, middle, last
  const labelIndexes = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
      {/* Grid */}
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
            fontSize={9}
            fill={labelColor}
          >
            {v}
          </text>
        </g>
      ))}

      {/* Fill */}
      <polygon points={fillPoints} fill={fillColor} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Latest dot */}
      <circle
        cx={toX(data.length - 1)}
        cy={toY(data[data.length - 1].score)}
        r={4}
        fill={lineColor}
      />

      {/* Date labels */}
      {labelIndexes.map((i) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fill={labelColor}
        >
          {new Date(data[i].date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </text>
      ))}
    </svg>
  );
}

export function HealthScoreChart() {
  const teamInfo = useTeam();
  const { currentApp } = useApp();
  const t = useTranslations('health-score-chart');
  const isDark = useDarkMode();
  const [days, setDays] = useState<(typeof DAYS_OPTIONS)[number]>(90);

  const teamId = teamInfo?.currentTeam?.id ?? '';
  const appId = currentApp?.id ?? '';
  const { data, loading } = useGetHealthScoreHistory(teamId, appId, days);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <Skeleton height={20} width={180} className="mb-4" />
        <Skeleton height={120} />
      </div>
    );
  }

  if (data.length === 0) return null;

  const latest = data[data.length - 1]?.score;
  const first = data[0]?.score;
  const delta = latest - first;
  const scoreColor =
    latest >= 75
      ? 'text-green-600 dark:text-green-400'
      : latest >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdFavorite className="w-4 h-4 text-pink-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h3>
          {latest != null && (
            <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>
              {latest}
              <span className="text-xs font-normal text-muted-foreground">
                /100
              </span>
            </span>
          )}
          {data.length > 1 && delta !== 0 && (
            <span
              className={`text-xs font-semibold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}
            >
              {delta > 0 ? '+' : ''}
              {delta} {t('vs-start')}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                days === d
                  ? 'bg-pink-100 text-pink-700 font-semibold dark:bg-pink-900/40 dark:text-pink-300'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <ScoreChart data={data} isDark={isDark} />
      </div>
    </div>
  );
}
