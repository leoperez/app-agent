'use client';

import { useEffect, useState } from 'react';
import { KeywordConversionRow } from '@/lib/swr/app';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface KeywordConversionChartProps {
  data: KeywordConversionRow[];
  loading?: boolean;
  keyword: string;
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

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function KeywordConversionChart({
  data,
  loading,
  keyword,
}: KeywordConversionChartProps) {
  const isDark = useDarkMode();

  if (loading) return <Skeleton height={160} className="rounded-lg" />;
  if (data.length === 0)
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No data yet for &ldquo;{keyword}&rdquo;. Position history will appear
        after the first daily snapshot.
      </p>
    );

  const W = 600;
  const H = 150;
  const PAD = { top: 8, right: 48, bottom: 24, left: 44 };

  const labelColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#374151' : '#f3f4f6';

  // Position (inverted — lower is better, #1 at top)
  const positions = data
    .map((d) => d.position)
    .filter((p) => p != null) as number[];
  const maxPos = Math.max(...positions, 10);
  const toYPos = (p: number) =>
    PAD.top + ((p - 1) / (maxPos - 1)) * (H - PAD.top - PAD.bottom);

  // Downloads
  const downloads = data.map((d) => d.downloads ?? 0);
  const maxDl = Math.max(...downloads, 1);
  const toYDl = (v: number) =>
    PAD.top + ((maxDl - v) / maxDl) * (H - PAD.top - PAD.bottom);

  const toX = (i: number) =>
    PAD.left + (i / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);

  const posPoints = data
    .filter((d) => d.position != null)
    .map((d, _, arr) => {
      const i = data.indexOf(d);
      return `${toX(i).toFixed(1)},${toYPos(d.position!).toFixed(1)}`;
    })
    .join(' ');

  const dlPoints = data
    .map((d, i) => `${toX(i).toFixed(1)},${toYDl(d.downloads ?? 0).toFixed(1)}`)
    .join(' ');

  // X-axis labels: first + last
  const xLabels =
    data.length > 1
      ? [
          { i: 0, label: data[0].date.slice(5) },
          { i: data.length - 1, label: data[data.length - 1].date.slice(5) },
        ]
      : [];

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-4 rounded"
            style={{ background: '#6366f1' }}
          />
          Position (left axis, lower = better)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-4 rounded"
            style={{ background: '#22c55e' }}
          />
          Downloads (right axis)
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD.top + t * (H - PAD.top - PAD.bottom);
          return (
            <line
              key={t}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}

        {/* Left axis: position labels */}
        {[1, Math.round(maxPos / 2), maxPos].map((tick) => (
          <text
            key={tick}
            x={PAD.left - 6}
            y={toYPos(tick) + 4}
            textAnchor="end"
            fontSize={9}
            fill="#6366f1"
          >
            #{tick}
          </text>
        ))}

        {/* Right axis: downloads labels */}
        {[0, Math.round(maxDl / 2), maxDl].map((tick) => (
          <text
            key={tick}
            x={W - PAD.right + 6}
            y={toYDl(tick) + 4}
            textAnchor="start"
            fontSize={9}
            fill="#22c55e"
          >
            {formatNumber(tick)}
          </text>
        ))}

        {/* X labels */}
        {xLabels.map(({ i, label }) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 4}
            textAnchor={i === 0 ? 'start' : 'end'}
            fontSize={9}
            fill={labelColor}
          >
            {label}
          </text>
        ))}

        {/* Downloads line (green) */}
        {data.length > 1 && (
          <polyline
            points={dlPoints}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="4 2"
          />
        )}

        {/* Position line (indigo) */}
        {posPoints && (
          <polyline
            points={posPoints}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
