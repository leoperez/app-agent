'use client';

import { useState } from 'react';
import { SlideCanvas } from '@/components/screenshots/slide-canvas';
import { resolveTheme, resolveFont } from '@/lib/screenshot-templates';
import type {
  LayoutId,
  ThemeId,
  FontId,
  DecorationId,
  SlideData,
  GradientBg,
} from '@/types/screenshots';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface PreviewSet {
  id: string;
  name: string;
  locale: string;
  layoutId: LayoutId;
  themeId: ThemeId;
  fontId: FontId;
  decorationId: DecorationId;
  customBg: string | null;
  customText: string | null;
  customAccent: string | null;
  bgGradient: GradientBg | null;
  slides: SlideData[];
  appTitle: string | null;
  appIcon: string | null;
}

interface PreviewClientProps {
  set: PreviewSet;
  label: string;
}

const PREVIEW_W = 280;

export function PreviewClient({ set, label }: PreviewClientProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const theme = resolveTheme(set.themeId, {
    bg: set.customBg,
    text: set.customText,
    accent: set.customAccent,
  });
  const fontFamily = resolveFont(set.fontId).family;
  const slides = set.slides;
  const currentSlide = slides[activeSlide] ?? slides[0];

  const prev = () => setActiveSlide((i) => Math.max(0, i - 1));
  const next = () => setActiveSlide((i) => Math.min(slides.length - 1, i + 1));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-3">
        {set.appIcon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={set.appIcon}
            alt=""
            className="h-10 w-10 rounded-2xl border border-border"
          />
        )}
        <div>
          <h1 className="font-semibold text-sm">{set.name}</h1>
          <p className="text-xs text-muted-foreground">
            {set.appTitle ?? 'App'} · {set.locale}
            {label ? ` · ${label}` : ''}
          </p>
        </div>
      </div>

      {/* Main preview */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {/* Canvas */}
        <div className="shadow-2xl">
          <SlideCanvas
            layout={set.layoutId}
            theme={theme}
            slide={currentSlide}
            bgGradient={set.bgGradient}
            decorationId={set.decorationId}
            deviceType="iphone"
            activeLocale={set.locale}
            fontFamily={fontFamily}
            preview={true}
            width={PREVIEW_W}
          />
        </div>

        {/* Navigation */}
        {slides.length > 1 && (
          <div className="flex items-center gap-4">
            <button
              onClick={prev}
              disabled={activeSlide === 0}
              className="p-2 rounded-full border border-border hover:bg-muted/30 disabled:opacity-30 transition-colors"
            >
              <MdChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-muted-foreground">
              {activeSlide + 1} / {slides.length}
            </span>
            <button
              onClick={next}
              disabled={activeSlide === slides.length - 1}
              className="p-2 rounded-full border border-border hover:bg-muted/30 disabled:opacity-30 transition-colors"
            >
              <MdChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Slide strip */}
        {slides.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
            {slides.map((slide, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === activeSlide ? 'border-primary' : 'border-transparent'}`}
              >
                <SlideCanvas
                  layout={set.layoutId}
                  theme={theme}
                  slide={slide}
                  bgGradient={set.bgGradient}
                  decorationId={set.decorationId}
                  deviceType="iphone"
                  activeLocale={set.locale}
                  fontFamily={fontFamily}
                  preview={true}
                  width={72}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Preview shared via Antigravity · {slides.length} slide
          {slides.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
