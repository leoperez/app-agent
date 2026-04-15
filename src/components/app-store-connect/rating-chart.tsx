'use client';

import { useEffect, useState } from 'react';
import { AppRatingRow } from '@/lib/swr/app';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface VersionMark {
  version: string;
  releasedAt: string;
}

interface RatingChartProps {
  data: AppRatingRow[];
  loading?: boolean;
  versions?: VersionMark[];
}

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

function RatingLine({
  data,
  isDark,
  versions,
}: {
  data: AppRatingRow[];
  isDark: boolean;
  versions?: VersionMark[];
}) {
  const W = 600;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 24, left: 40 };

  const labelColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const lineColor = '#f59e0b'; // amber

  const minVal = 1;
  const maxVal = 5;
  const toX = (i: number) =>
    PAD.left + (i / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + ((maxVal - v) / (maxVal - minVal)) * (H - PAD.top - PAD.bottom);

  const points = data
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d.rating).toFixed(1)}`)
    .join(' ');

  // Y-axis ticks at 1, 2, 3, 4, 5
  const yTicks = [1, 2, 3, 4, 5];

  // Map a version releasedAt to the nearest data point x position
  const versionMarks = (versions ?? [])
    .map(({ version, releasedAt }) => {
      const releaseMs = new Date(releasedAt).getTime();
      let closestIdx = 0;
      let minDiff = Infinity;
      data.forEach((d, i) => {
        const diff = Math.abs(new Date(d.date).getTime() - releaseMs);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      return { version, x: toX(closestIdx) };
    })
    .filter(({ x }) => x >= PAD.left && x <= W - PAD.right);

  // X-axis: show first + last date
  const xLabels =
    data.length > 1
      ? [
          { i: 0, label: data[0].date.slice(5) },
          { i: data.length - 1, label: data[data.length - 1].date.slice(5) },
        ]
      : [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={toY(tick)}
            y2={toY(tick)}
            stroke={gridColor}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={toY(tick) + 4}
            textAnchor="end"
            fontSize={10}
            fill={labelColor}
          >
            {tick}★
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 4}
          textAnchor={i === 0 ? 'start' : 'end'}
          fontSize={10}
          fill={labelColor}
        >
          {label}
        </text>
      ))}

      {/* Version markers */}
      {versionMarks.map(({ version, x }) => (
        <g key={version}>
          <line
            x1={x}
            y1={PAD.top}
            x2={x}
            y2={H - PAD.bottom}
            stroke={isDark ? '#6b7280' : '#d1d5db'}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={x + 3}
            y={PAD.top + 9}
            fontSize={8}
            fill={isDark ? '#9ca3af' : '#6b7280'}
          >
            v{version}
          </text>
        </g>
      ))}

      {/* Line */}
      {data.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.rating)} r={3} fill={lineColor} />
      ))}
    </svg>
  );
}

export function RatingChart({ data, loading, versions }: RatingChartProps) {
  const isDark = useDarkMode();

  if (loading) {
    return <Skeleton height={120} className="rounded-lg" />;
  }

  const latest = data[data.length - 1];
  const earliest = data[0];
  const trend =
    latest && earliest && data.length > 1
      ? latest.rating - earliest.rating
      : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            App Rating
          </p>
          {latest && (
            <p className="text-2xl font-bold text-amber-500">
              ★ {latest.rating.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({latest.ratingCount.toLocaleString()} ratings)
              </span>
            </p>
          )}
        </div>
        {trend !== null && (
          <span
            className={`text-sm font-medium ${
              trend >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(2)} vs {data.length}d ago
          </span>
        )}
      </div>

      {data.length > 1 ? (
        <RatingLine data={data} isDark={isDark} versions={versions} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Rating history will appear once daily snapshots are collected.
        </p>
      )}
    </div>
  );
}
