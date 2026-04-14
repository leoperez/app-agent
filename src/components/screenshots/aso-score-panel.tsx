'use client';

import { useState } from 'react';
import {
  MdAutoAwesome,
  MdCheckCircle,
  MdWarning,
  MdClose,
  MdExpandMore,
  MdExpandLess,
} from 'react-icons/md';
import type { AsoScoreResult, SlideData } from '@/types/screenshots';
import { resolveSlideText } from '@/types/screenshots';

interface AsoScorePanelProps {
  slides: SlideData[];
  locale: string;
  onScore: (
    slides: Array<{ headline: string; subtitle: string; badge?: string }>,
    locale: string
  ) => Promise<AsoScoreResult | null>;
  onClose: () => void;
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight="700"
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

function SlideScoreRow({
  index,
  score,
  issues,
  suggestions,
}: {
  index: number;
  score: number;
  issues: string[];
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const color =
    score >= 80
      ? 'text-green-500'
      : score >= 60
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground w-14 text-left">
            Slide {index + 1}
          </span>
          <span className={`text-sm font-bold ${color}`}>{score}/100</span>
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 bg-muted/10 text-xs">
          {issues.length > 0 && (
            <div>
              <p className="font-semibold text-red-500 flex items-center gap-1 mt-2 mb-1">
                <MdWarning className="h-3 w-3" /> Issues
              </p>
              <ul className="space-y-0.5 pl-3">
                {issues.map((issue, i) => (
                  <li key={i} className="text-muted-foreground list-disc">
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {suggestions.length > 0 && (
            <div>
              <p className="font-semibold text-primary flex items-center gap-1 mb-1">
                <MdCheckCircle className="h-3 w-3" /> Suggestions
              </p>
              <ul className="space-y-0.5 pl-3">
                {suggestions.map((s, i) => (
                  <li key={i} className="text-muted-foreground list-disc">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AsoScorePanel({
  slides,
  locale,
  onScore,
  onClose,
}: AsoScorePanelProps) {
  const [result, setResult] = useState<AsoScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = slides.map((s) => {
        const t = resolveSlideText(s, locale);
        return { headline: t.headline, subtitle: t.subtitle, badge: t.badge };
      });
      const res = await onScore(payload, locale);
      if (!res) throw new Error('Failed to get score');
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdAutoAwesome className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">ASO Screenshot Score</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Analyse button */}
          {!result && !loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                AI will evaluate your {slides.length} slide texts against ASO
                best practices and give you a score with actionable suggestions.
              </p>
              <button
                onClick={run}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Analyse slides
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <MdAutoAwesome className="h-8 w-8 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Analysing slides…</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {result && (
            <>
              {/* Overall score */}
              <div className="flex items-center gap-5 p-4 rounded-xl bg-muted/20 border border-border">
                <ScoreRing score={result.overallScore} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Overall ASO Score
                  </p>
                  <p className="text-sm leading-snug">
                    {result.overallSummary}
                  </p>
                </div>
              </div>

              {/* Strengths & improvements */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-green-500 flex items-center gap-1">
                    <MdCheckCircle className="h-3.5 w-3.5" /> Strengths
                  </p>
                  <ul className="space-y-0.5">
                    {result.topStrengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                    <MdWarning className="h-3.5 w-3.5" /> To improve
                  </p>
                  <ul className="space-y-0.5">
                    {result.topImprovements.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Per-slide scores */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Per slide
                </p>
                {result.slides.map((s) => (
                  <SlideScoreRow
                    key={s.slideIndex}
                    index={s.slideIndex}
                    score={s.score}
                    issues={s.issues}
                    suggestions={s.suggestions}
                  />
                ))}
              </div>

              {/* Re-analyse */}
              <button
                onClick={run}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline"
              >
                Re-analyse
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
