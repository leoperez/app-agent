'use client';

import React, { useState } from 'react';
import { MdClose, MdStar } from 'react-icons/md';
import { SlideCanvas } from './slide-canvas';
import type {
  LayoutId,
  SlideData,
  DecorationId,
  FontId,
  GradientBg,
} from '@/types/screenshots';
import { resolveFont, resolveTheme } from '@/lib/screenshot-templates';

interface StoreListingPreviewProps {
  slides: SlideData[];
  layoutId: LayoutId;
  themeId: string;
  fontId: FontId;
  decorationId: DecorationId;
  bgGradient: GradientBg | null;
  bgMode: 'solid' | 'gradient';
  customBg: string;
  customText: string;
  customAccent: string;
  deviceType: 'iphone' | 'android' | 'ipad';
  appName?: string;
  appIconUrl?: string;
  store: 'APPSTORE' | 'GOOGLEPLAY';
  onClose: () => void;
}

export function StoreListingPreview({
  slides,
  layoutId,
  themeId,
  fontId,
  decorationId,
  bgGradient,
  bgMode,
  customBg,
  customText,
  customAccent,
  deviceType,
  appName = 'Your App',
  appIconUrl,
  store,
  onClose,
}: StoreListingPreviewProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const theme = resolveTheme(themeId as never, {
    bg: customBg || null,
    text: customText || null,
    accent: customAccent || null,
  });
  const ff = resolveFont(fontId).family;

  // Slide width for the preview — portrait frame
  const slideW = 160;

  const isGooglePlay = store === 'GOOGLEPLAY';

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">
            {isGooglePlay ? 'Google Play' : 'App Store'} preview
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isGooglePlay ? (
            /* ── Google Play style ── */
            <div className="p-4 space-y-3">
              {/* App header */}
              <div className="flex items-start gap-3">
                {appIconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appIconUrl}
                    alt=""
                    className="w-14 h-14 rounded-2xl border border-border/50 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{appName}</p>
                  <p className="text-xs text-primary">Your Studio</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <MdStar
                        key={i}
                        className={`h-3 w-3 ${i <= 4 ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      4.2 · 10K reviews
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] border border-border rounded px-1.5 py-0.5">
                      Free
                    </span>
                    <span className="text-[10px] border border-border rounded px-1.5 py-0.5">
                      Contains ads
                    </span>
                  </div>
                </div>
                <button className="bg-primary text-primary-foreground text-xs font-semibold rounded-full px-4 py-1.5 shrink-0">
                  Install
                </button>
              </div>

              {/* Screenshot strip */}
              <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`flex-shrink-0 rounded-xl overflow-hidden snap-start transition-all ${i === activeIdx ? 'ring-2 ring-primary' : 'ring-1 ring-border/50'}`}
                  >
                    <SlideCanvas
                      layout={layoutId}
                      theme={theme}
                      slide={s}
                      bgGradient={bgMode === 'gradient' ? bgGradient : null}
                      decorationId={decorationId}
                      deviceType={deviceType}
                      fontFamily={ff}
                      preview={false}
                      width={slideW}
                    />
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-border pt-2">
                <p className="text-xs font-semibold mb-1">About this app</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {slides[activeIdx]?.headline} — {slides[activeIdx]?.subtitle}
                </p>
              </div>
            </div>
          ) : (
            /* ── App Store style ── */
            <div className="p-4 space-y-3">
              {/* App header */}
              <div className="flex items-center gap-3">
                {appIconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appIconUrl}
                    alt=""
                    className="w-16 h-16 rounded-[18px] border border-border/50 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-[18px] bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{appName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Your Studio
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <MdStar
                        key={i}
                        className={`h-3 w-3 ${i <= 4 ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground">
                      4.2
                    </span>
                  </div>
                </div>
                <button className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-4 py-1.5">
                  GET
                </button>
              </div>

              {/* Active slide large */}
              <div className="rounded-xl overflow-hidden w-full">
                <SlideCanvas
                  layout={layoutId}
                  theme={theme}
                  slide={slides[activeIdx] ?? slides[0]}
                  bgGradient={bgMode === 'gradient' ? bgGradient : null}
                  decorationId={decorationId}
                  deviceType={deviceType}
                  fontFamily={ff}
                  preview={false}
                  width={328}
                  appIconUrl={appIconUrl}
                />
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-1">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`rounded-full transition-all ${i === activeIdx ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30'}`}
                  />
                ))}
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`flex-shrink-0 rounded-lg overflow-hidden snap-start transition-all ${i === activeIdx ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <SlideCanvas
                      layout={layoutId}
                      theme={theme}
                      slide={s}
                      bgGradient={bgMode === 'gradient' ? bgGradient : null}
                      decorationId={decorationId}
                      deviceType={deviceType}
                      fontFamily={ff}
                      preview={false}
                      width={70}
                    />
                  </button>
                ))}
              </div>

              {/* Description snippet */}
              <div className="border-t border-border pt-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {slides[activeIdx]?.headline} — {slides[activeIdx]?.subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
