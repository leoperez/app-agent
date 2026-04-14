'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MdClose,
  MdCloudDownload,
  MdCheckCircle,
  MdWarning,
} from 'react-icons/md';
import type { SlideData } from '@/types/screenshots';

interface AscScreenshot {
  id: string;
  fileName: string;
  imageUrl: string | null;
  width: number;
  height: number;
  displayType: string;
  uploadState: string;
}

interface AscImportPanelProps {
  teamId: string;
  appId: string;
  locale: string;
  slides: SlideData[];
  onImport: (updatedSlides: SlideData[]) => void;
  onClose: () => void;
}

export function AscImportPanel({
  teamId,
  appId,
  locale,
  slides,
  onImport,
  onClose,
}: AscImportPanelProps) {
  const [screenshots, setScreenshots] = useState<AscScreenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Map: slideIndex → selected screenshot id
  const [mapping, setMapping] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/screenshot-sets/import-from-asc?locale=${encodeURIComponent(locale)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch');
      setScreenshots(data.screenshots ?? []);
      if ((data.screenshots ?? []).length === 0) {
        setError(
          'No uploaded screenshots found for this locale in App Store Connect.'
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [teamId, appId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const applyImport = () => {
    const updated = slides.map((slide, i) => {
      const screenshotId = mapping[i];
      if (!screenshotId) return slide;
      const sc = screenshots.find((s) => s.id === screenshotId);
      if (!sc?.imageUrl) return slide;
      return { ...slide, screenshotUrl: sc.imageUrl };
    });
    onImport(updated);
    onClose();
  };

  const mapped = Object.keys(mapping).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdCloudDownload className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Import from App Store Connect</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-5 py-3 border-b border-border bg-muted/10">
          <p className="text-xs text-muted-foreground">
            Select which App Store Connect screenshot to assign to each slide.
            The image will be used as the phone mockup background.
          </p>
          {error && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <MdWarning className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <MdCloudDownload className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
          )}

          {!loading && !error && screenshots.length > 0 && (
            <div className="space-y-4">
              {slides.map((slide, idx) => {
                const selectedId = mapping[idx];
                const selected = screenshots.find((s) => s.id === selectedId);
                return (
                  <div
                    key={idx}
                    className="border border-border rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground w-12">
                        Slide {idx + 1}
                      </span>
                      <span className="text-xs truncate text-foreground flex-1">
                        {slide.headline || '(no headline)'}
                      </span>
                      {selected && (
                        <MdCheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                    </div>

                    {/* Screenshot picker */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {/* None option */}
                      <button
                        onClick={() =>
                          setMapping((m) => {
                            const next = { ...m };
                            delete next[idx];
                            return next;
                          })
                        }
                        className={`shrink-0 h-20 w-10 rounded border-2 flex items-center justify-center text-xs text-muted-foreground transition-colors ${!selectedId ? 'border-primary' : 'border-border hover:border-muted-foreground'}`}
                      >
                        —
                      </button>
                      {screenshots.map((sc) => (
                        <button
                          key={sc.id}
                          onClick={() =>
                            setMapping((m) => ({ ...m, [idx]: sc.id }))
                          }
                          className={`shrink-0 rounded border-2 overflow-hidden transition-colors ${selectedId === sc.id ? 'border-primary' : 'border-border hover:border-muted-foreground'}`}
                        >
                          {sc.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sc.imageUrl}
                              alt={sc.fileName}
                              className="h-20 w-auto object-cover"
                            />
                          ) : (
                            <div className="h-20 w-10 bg-muted/30 flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground">
                                N/A
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && screenshots.length > 0 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {mapped} of {slides.length} slide{slides.length !== 1 ? 's' : ''}{' '}
              mapped
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={applyImport}
                disabled={mapped === 0}
                className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Apply {mapped > 0 ? `(${mapped})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
