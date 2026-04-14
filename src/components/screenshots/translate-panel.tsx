'use client';

import { useState } from 'react';
import {
  MdClose,
  MdTranslate,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdAutoAwesome,
} from 'react-icons/md';
import type { SlideData, SlideLocaleText } from '@/types/screenshots';

interface TranslatePanelProps {
  slides: SlideData[];
  sourceLocale: string;
  availableLocales: string[];
  onApply: (updatedSlides: SlideData[]) => void;
  onClose: () => void;
  translateSlides: (opts: {
    slides: Array<{ headline: string; subtitle: string; badge?: string }>;
    targetLocales: string[];
    sourceLocale?: string;
  }) => Promise<
    Array<{
      locale: string;
      slides: Array<{ headline: string; subtitle: string; badge?: string }>;
    }>
  >;
}

export function TranslatePanel({
  slides,
  sourceLocale,
  availableLocales,
  onApply,
  onClose,
  translateSlides,
}: TranslatePanelProps) {
  // Locales available to translate INTO (excludes source)
  const targets = availableLocales.filter((l) => l !== sourceLocale);

  const [selected, setSelected] = useState<Set<string>>(new Set(targets));
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toggle = (locale: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(locale)) {
        next.delete(locale);
      } else {
        next.add(locale);
      }
      return next;
    });

  const run = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError('');
    setDone(false);
    setProgress(`Translating into ${selected.size} locale(s)…`);

    try {
      // Build base texts from slides (use source locale text)
      const baseSlidesTexts = slides.map((s) => {
        const override = sourceLocale
          ? s.localeTexts?.[sourceLocale]
          : undefined;
        return {
          headline: override?.headline ?? s.headline,
          subtitle: override?.subtitle ?? s.subtitle,
          badge: override?.badge ?? s.badge,
        };
      });

      const targetLocales = Array.from(selected);
      const results = await translateSlides({
        slides: baseSlidesTexts,
        targetLocales,
        sourceLocale,
      });

      if (!results.length) throw new Error('No translations returned');

      // Apply translations as localeTexts overrides
      const updated = slides.map((slide, idx) => {
        const newLocaleTexts: Record<string, SlideLocaleText> = {
          ...(slide.localeTexts ?? {}),
        };
        for (const result of results) {
          const translated = result.slides[idx];
          if (!translated) continue;
          // Skip if locale already has an override and overwriteExisting is false
          if (!overwriteExisting && newLocaleTexts[result.locale]) continue;
          newLocaleTexts[result.locale] = {
            headline: translated.headline,
            subtitle: translated.subtitle,
            badge: translated.badge ?? '',
          };
        }
        return { ...slide, localeTexts: newLocaleTexts };
      });

      onApply(updated);
      setDone(true);
      setProgress(`Translated into ${results.length} locale(s) successfully.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdTranslate className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Translate Slides</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            AI will translate all {slides.length} slide texts from{' '}
            <span className="font-medium text-foreground">{sourceLocale}</span>{' '}
            into the selected locales, creating per-locale overrides.
          </p>

          {targets.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <MdTranslate className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No other locales found. Add localizations to this app first.
              </p>
            </div>
          ) : (
            <>
              {/* Locale selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Target locales
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelected(new Set(targets))}
                      className="text-xs text-primary hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {targets.map((locale) => {
                    const isSelected = selected.has(locale);
                    const hasExisting = slides.some(
                      (s) => s.localeTexts?.[locale]
                    );
                    return (
                      <button
                        key={locale}
                        onClick={() => toggle(locale)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs text-left transition-colors ${isSelected ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                      >
                        {isSelected ? (
                          <MdCheckBox className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <MdCheckBoxOutlineBlank className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="flex-1">{locale}</span>
                        {hasExisting && (
                          <span className="text-[9px] text-amber-500 shrink-0">
                            has override
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overwrite toggle */}
              <button
                onClick={() => setOverwriteExisting((v) => !v)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full"
              >
                {overwriteExisting ? (
                  <MdCheckBox className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <MdCheckBoxOutlineBlank className="h-3.5 w-3.5 shrink-0" />
                )}
                Overwrite existing locale overrides
              </button>

              {/* Status */}
              {progress && (
                <p
                  className={`text-xs ${done ? 'text-green-600' : 'text-muted-foreground'} flex items-center gap-1`}
                >
                  {loading && (
                    <MdAutoAwesome className="h-3.5 w-3.5 animate-pulse shrink-0" />
                  )}
                  {progress}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </>
          )}
        </div>

        {targets.length > 0 && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} locale{selected.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={done ? onClose : onClose}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {done ? 'Close' : 'Cancel'}
              </button>
              {!done && (
                <button
                  onClick={run}
                  disabled={loading || selected.size === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <MdAutoAwesome
                    className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`}
                  />
                  {loading ? 'Translating…' : 'Translate'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
