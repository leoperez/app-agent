'use client';

import { useEffect, useState } from 'react';
import { AppAnalyticsRow } from '@/lib/swr/app';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

type Metric =
  | 'impressions'
  | 'pageViews'
  | 'downloads'
  | 'sessions'
  | 'activeDevices';

const METRICS: { key: Metric; label: string; color: string }[] = [
  { key: 'impressions', label: 'Impressions', color: '#6366f1' },
  { key: 'pageViews', label: 'Page Views', color: '#0ea5e9' },
  { key: 'downloads', label: 'Downloads', color: '#22c55e' },
  { key: 'sessions', label: 'Sessions', color: '#f59e0b' },
  { key: 'activeDevices', label: 'Active Devices', color: '#ec4899' },
];

interface AnalyticsChartProps {
  data: AppAnalyticsRow[];
  loading?: boolean;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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

function LineChart({
  data,
  metric,
  color,
  isDark,
}: {
  data: AppAnalyticsRow[];
  metric: Metric;
  color: string;
  isDark: boolean;
}) {
  const W = 600;
  const H = 140;
  const PAD = { top: 8, right: 8, bottom: 24, left: 40 };

  const labelColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#374151' : '#f3f4f6';

  const values = data.map((d) => d[metric]);
  const maxVal = Math.max(...values, 1);

  const toX = (i: number) =>
    PAD.left + (i / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);
  const toY = (v: number) =>
    PAD.top + ((maxVal - v) / maxVal) * (H - PAD.top - PAD.bottom);

  const points = data
    .map((d, i) => `${toX(i).toFixed(1)},${toY(d[metric]).toFixed(1)}`)
    .join(' ');

  const areaPath =
    data.length > 1
      ? `M${toX(0)},${H - PAD.bottom} ` +
        data
          .map((d, i) => `L${toX(i).toFixed(1)},${toY(d[metric]).toFixed(1)}`)
          .join(' ') +
        ` L${toX(data.length - 1)},${H - PAD.bottom} Z`
      : '';

  const yLabels = [maxVal, maxVal / 2, 0].map((v) => ({
    y: toY(v),
    label: formatNumber(Math.round(v)),
  }));

  const xLabelIndices =
    data.length > 2
      ? [0, Math.floor(data.length / 2), data.length - 1]
      : data.map((_, i) => i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      preserveAspectRatio="none"
    >
      {yLabels.map(({ y, label }) => (
        <text
          key={label}
          x={PAD.left - 6}
          y={y + 4}
          textAnchor="end"
          fontSize={9}
          fill={labelColor}
        >
          {label}
        </text>
      ))}

      {yLabels.map(({ y, label }) => (
        <line
          key={`grid-${label}`}
          x1={PAD.left}
          y1={y}
          x2={W - PAD.right}
          y2={y}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}

      {data.length > 0 &&
        xLabelIndices.map((idx) => (
          <text
            key={idx}
            x={toX(idx)}
            y={H - 4}
            textAnchor="middle"
            fontSize={8}
            fill={labelColor}
          >
            {data[idx].date.slice(5)}
          </text>
        ))}

      {areaPath && <path d={areaPath} fill={color} fillOpacity={0.08} />}

      {data.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {data.length > 0 && (
        <circle
          cx={toX(data.length - 1)}
          cy={toY(data[data.length - 1][metric])}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
}

export default function AnalyticsChart({ data, loading }: AnalyticsChartProps) {
  const [activeMetric, setActiveMetric] = useState<Metric>('impressions');
  const isDark = useDarkMode();

  const metric = METRICS.find((m) => m.key === activeMetric)!;
  const total = data.reduce((sum, d) => sum + d[activeMetric], 0);
  const latest = data.length > 0 ? data[data.length - 1][activeMetric] : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <Skeleton height={20} width={160} className="mb-4" />
        <Skeleton height={140} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
          Analytics
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No analytics data yet. Data is collected daily from App Store Connect.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
            Analytics
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Last {data.length} days
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {formatNumber(total)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {metric.label} (total)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeMetric === m.key
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            style={
              activeMetric === m.key ? { backgroundColor: m.color } : undefined
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden">
        <LineChart
          data={data}
          metric={activeMetric}
          color={metric.color}
          isDark={isDark}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Latest: {data[data.length - 1]?.date}</span>
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {formatNumber(latest)}
        </span>
      </div>
    </div>
  );
}
