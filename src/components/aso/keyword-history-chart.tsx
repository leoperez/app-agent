'use client';

import { useState, useRef, useCallback } from 'react';
import {
  MdClose,
  MdTrendingUp,
  MdTrendingDown,
  MdTrendingFlat,
} from 'react-icons/md';

interface RankPoint {
  date: string;
  position: number | null;
}

interface KeywordHistoryChartProps {
  keyword: string;
  history: RankPoint[];
  onClose: () => void;
}

const W = 560;
const H = 280;
const PAD = { top: 20, right: 24, bottom: 40, left: 48 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

export function KeywordHistoryChart({
  keyword,
  history,
  onClose,
}: KeywordHistoryChartProps) {
  const [window, setWindow] = useState<7 | 30>(30);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: RankPoint;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sliced = history.slice(-window);
  const ranked = sliced.filter((p) => p.position !== null) as {
    date: string;
    position: number;
  }[];

  const minPos =
    ranked.length > 0 ? Math.min(...ranked.map((p) => p.position)) : 1;
  const maxPos =
    ranked.length > 0 ? Math.max(...ranked.map((p) => p.position)) : 100;
  // Add padding to range so points don't sit on edges
  const range = Math.max(maxPos - minPos, 10);
  const domainMin = Math.max(1, minPos - Math.ceil(range * 0.15));
  const domainMax = maxPos + Math.ceil(range * 0.15);

  const toX = (i: number) =>
    sliced.length > 1 ? (i / (sliced.length - 1)) * INNER_W : INNER_W / 2;

  // Invert Y: lower rank number = better = higher on chart
  const toY = (pos: number) =>
    ((domainMax - pos) / (domainMax - domainMin)) * INNER_H;

  // Build path segments (skip null positions)
  const segments: string[] = [];
  let current = '';
  sliced.forEach((p, i) => {
    if (p.position === null) {
      if (current) {
        segments.push(current);
        current = '';
      }
      return;
    }
    const x = toX(i);
    const y = toY(p.position);
    current += current
      ? ` L${x.toFixed(1)},${y.toFixed(1)}`
      : `M${x.toFixed(1)},${y.toFixed(1)}`;
  });
  if (current) segments.push(current);

  // Velocity: last 7 days
  const first = ranked[0]?.position ?? null;
  const last = ranked[ranked.length - 1]?.position ?? null;
  const velocity = first !== null && last !== null ? first - last : null; // positive = improved

  // Y-axis grid lines (5 evenly spaced ranks)
  const gridRanks: number[] = [];
  const step = Math.ceil((domainMax - domainMin) / 4);
  for (let r = domainMin; r <= domainMax; r += step) gridRanks.push(r);

  // X-axis date labels (show ~5 evenly spaced)
  const dateIndices =
    sliced.length <= 7
      ? sliced.map((_, i) => i)
      : [
          0,
          Math.floor(sliced.length / 4),
          Math.floor(sliced.length / 2),
          Math.floor((3 * sliced.length) / 4),
          sliced.length - 1,
        ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left - PAD.left;
      // Find nearest data point
      const idx = Math.round((relX / INNER_W) * (sliced.length - 1));
      const clamped = Math.max(0, Math.min(sliced.length - 1, idx));
      const point = sliced[clamped];
      if (!point) return;
      const x = toX(clamped) + PAD.left;
      const y = point.position !== null ? toY(point.position) + PAD.top : -999;
      setTooltip({ x, y, point });
    },
    [sliced]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">"{keyword}"</span>
              {velocity !== null && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    velocity > 0
                      ? 'text-emerald-600'
                      : velocity < 0
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {velocity > 0 ? (
                    <MdTrendingUp className="h-3.5 w-3.5" />
                  ) : velocity < 0 ? (
                    <MdTrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <MdTrendingFlat className="h-3.5 w-3.5" />
                  )}
                  {velocity > 0 ? `+${velocity}` : velocity} vs start
                </span>
              )}
            </div>
            {last !== null && (
              <p className="text-xs text-muted-foreground">
                Current rank:{' '}
                <strong className="text-foreground">#{last}</strong>
                {first !== null && first !== last && (
                  <span> · was #{first}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {([7, 30] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  window === w
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {w}d
              </button>
            ))}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground ml-1"
            >
              <MdClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="p-5">
          {ranked.length < 2 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Not enough ranking data for this period
            </div>
          ) : (
            <div className="relative select-none">
              <svg
                ref={svgRef}
                width="100%"
                viewBox={`0 0 ${W} ${H}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setTooltip(null)}
                className="overflow-visible cursor-crosshair"
              >
                {/* Grid lines */}
                {gridRanks.map((r) => {
                  const y = toY(r) + PAD.top;
                  return (
                    <g key={r}>
                      <line
                        x1={PAD.left}
                        y1={y}
                        x2={PAD.left + INNER_W}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.08}
                        strokeWidth={1}
                      />
                      <text
                        x={PAD.left - 6}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={10}
                        fill="currentColor"
                        fillOpacity={0.45}
                      >
                        #{r}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis date labels */}
                {dateIndices.map((i) => {
                  const p = sliced[i];
                  if (!p) return null;
                  return (
                    <text
                      key={i}
                      x={toX(i) + PAD.left}
                      y={H - 4}
                      textAnchor="middle"
                      fontSize={10}
                      fill="currentColor"
                      fillOpacity={0.45}
                    >
                      {formatDate(p.date)}
                    </text>
                  );
                })}

                {/* Rank line segments */}
                {segments.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    transform={`translate(${PAD.left},${PAD.top})`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Area fill under first segment */}
                {segments[0] &&
                  (() => {
                    const firstRanked = sliced.findIndex(
                      (p) => p.position !== null
                    );
                    const lastRanked =
                      sliced
                        .map((p, i) => (p.position !== null ? i : -1))
                        .filter((i) => i >= 0)
                        .pop() ?? 0;
                    const areaD = `${segments[0]} L${toX(lastRanked).toFixed(1)},${INNER_H} L${toX(firstRanked).toFixed(1)},${INNER_H} Z`;
                    return (
                      <path
                        d={areaD}
                        transform={`translate(${PAD.left},${PAD.top})`}
                        fill="hsl(var(--primary))"
                        fillOpacity={0.06}
                      />
                    );
                  })()}

                {/* Data points */}
                {sliced.map((p, i) => {
                  if (p.position === null) return null;
                  return (
                    <circle
                      key={i}
                      cx={toX(i) + PAD.left}
                      cy={toY(p.position) + PAD.top}
                      r={3}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                    />
                  );
                })}

                {/* Tooltip crosshair */}
                {tooltip && tooltip.point.position !== null && (
                  <g>
                    <line
                      x1={tooltip.x}
                      y1={PAD.top}
                      x2={tooltip.x}
                      y2={H - PAD.bottom}
                      stroke="currentColor"
                      strokeOpacity={0.2}
                      strokeWidth={1}
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={tooltip.x}
                      cy={tooltip.y}
                      r={5}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  </g>
                )}
              </svg>

              {/* Tooltip box */}
              {tooltip && tooltip.point.position !== null && (
                <div
                  className="absolute z-10 pointer-events-none bg-popover border border-border rounded-lg shadow-lg px-2.5 py-1.5 text-xs"
                  style={{
                    left: tooltip.x + 12,
                    top: Math.max(0, tooltip.y - 20),
                    transform:
                      tooltip.x > W * 0.7 ? 'translateX(-120%)' : undefined,
                  }}
                >
                  <p className="font-semibold">
                    Rank #{tooltip.point.position}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDate(tooltip.point.date)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          {ranked.length >= 2 && (
            <div className="flex gap-6 mt-3 pt-3 border-t border-border">
              {[
                {
                  label: 'Best',
                  val: Math.min(...ranked.map((p) => p.position)),
                },
                {
                  label: 'Worst',
                  val: Math.max(...ranked.map((p) => p.position)),
                },
                {
                  label: 'Avg',
                  val: Math.round(
                    ranked.reduce((s, p) => s + p.position, 0) / ranked.length
                  ),
                },
                { label: 'Days tracked', val: ranked.length },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">
                    {label === 'Days tracked' ? val : `#${val}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
