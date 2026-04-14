'use client';

import { useState } from 'react';
import {
  MdClose,
  MdSearch,
  MdStar,
  MdChevronLeft,
  MdChevronRight,
  MdCompare,
} from 'react-icons/md';
import type { SlideData } from '@/types/screenshots';
import { resolveSlideText } from '@/types/screenshots';

interface CompetitorApp {
  id: string;
  title: string;
  icon: string;
  developer: string;
  score: number;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
}

interface CompetitorPanelProps {
  slides: SlideData[];
  locale: string;
  teamId: string;
  appId: string;
  onClose: () => void;
}

function ScreenshotCarousel({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0);
  if (urls.length === 0) {
    return (
      <div className="h-40 bg-muted/20 rounded-lg flex items-center justify-center">
        <p className="text-xs text-muted-foreground">No screenshots</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[idx]}
        alt={`Screenshot ${idx + 1}`}
        className="w-full rounded-lg object-contain bg-muted/20"
        style={{ maxHeight: 240 }}
      />
      {urls.length > 1 && (
        <div className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-1">
          <button
            className="bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80"
            onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
          >
            <MdChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-white bg-black/50 rounded px-1">
            {idx + 1}/{urls.length}
          </span>
          <button
            className="bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80"
            onClick={() => setIdx((i) => (i + 1) % urls.length)}
          >
            <MdChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function MySlidePreview({
  slides,
  locale,
}: {
  slides: SlideData[];
  locale: string;
}) {
  const [idx, setIdx] = useState(0);
  if (slides.length === 0) return null;

  const slide = slides[idx];
  const text = resolveSlideText(slide, locale);

  return (
    <div className="flex flex-col gap-2">
      <div className="h-40 bg-muted/30 rounded-lg flex flex-col items-center justify-center gap-1 px-3 text-center relative overflow-hidden">
        {slide.screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.screenshotUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        ) : null}
        <p className="relative text-sm font-bold leading-tight">
          {text.headline}
        </p>
        {text.subtitle && (
          <p className="relative text-xs text-muted-foreground leading-snug">
            {text.subtitle}
          </p>
        )}
        {text.badge && (
          <span className="relative text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">
            {text.badge}
          </span>
        )}
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            className="p-0.5 hover:text-foreground text-muted-foreground"
            onClick={() =>
              setIdx((i) => (i - 1 + slides.length) % slides.length)
            }
          >
            <MdChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {idx + 1}/{slides.length}
          </span>
          <button
            className="p-0.5 hover:text-foreground text-muted-foreground"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
          >
            <MdChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function CompetitorPanel({
  slides,
  locale,
  teamId,
  appId,
  onClose,
}: CompetitorPanelProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompetitorApp[]>([]);
  const [selected, setSelected] = useState<CompetitorApp | null>(null);
  const [error, setError] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSelected(null);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/screenshot-sets/competitors?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data: CompetitorApp[] = await res.json();
      setResults(data);
      if (data.length === 0) setError('No apps found');
    } catch {
      setError('Failed to fetch competitor data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdCompare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Competitor Screenshots</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Search by app name or App Store ID…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={search}
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Results list */}
          {results.length > 0 && !selected && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {results.length} app{results.length !== 1 ? 's' : ''} found —
                click to compare
              </p>
              {results.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelected(app)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 text-left transition-colors"
                >
                  {app.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.icon}
                      alt=""
                      className="h-10 w-10 rounded-xl shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.developer}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MdStar className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-muted-foreground">
                        {app.score > 0 ? app.score.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {app.screenshotUrls.length} screenshots
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Side-by-side comparison */}
          {selected && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <MdChevronLeft className="h-4 w-4" /> Back to results
                </button>
                <div className="flex items-center gap-2 ml-2">
                  {selected.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.icon}
                      alt=""
                      className="h-6 w-6 rounded-lg"
                    />
                  )}
                  <span className="text-sm font-medium">{selected.title}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Your slides */}
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                    Your screenshots
                  </p>
                  <MySlidePreview slides={slides} locale={locale} />
                </div>

                {/* Competitor */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {selected.title}
                  </p>
                  <ScreenshotCarousel urls={selected.screenshotUrls} />
                </div>
              </div>

              {/* iPad screenshots if available */}
              {selected.ipadScreenshotUrls.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    iPad screenshots ({selected.title})
                  </p>
                  <ScreenshotCarousel urls={selected.ipadScreenshotUrls} />
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <MdCompare className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Search for a competitor app by name or App Store ID to compare
                their screenshots side-by-side with yours.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
