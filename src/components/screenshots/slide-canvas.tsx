'use client';

import React from 'react';
import type {
  LayoutId,
  SlideData,
  ResolvedTheme,
  GradientBg,
} from '@/types/screenshots';
import { IPhoneFrame } from './phone-frame';
import { bgToCss } from '@/lib/screenshot-templates';

interface SlideCanvasProps {
  layout: LayoutId;
  theme: ResolvedTheme;
  slide: SlideData;
  bgGradient?: GradientBg | null;
  /** Render at preview size (true) or export size (false). Default: true */
  preview?: boolean;
  /** Width in px. Default: 300 */
  width?: number;
}

// Thin wrapper so call sites stay the same
function PhoneMockup({
  screenshot,
  screenColor,
  width,
}: {
  screenshot?: string;
  screenColor: string;
  borderColor: string; // kept for API compat, ignored — SVG frame has own gradient
  width: number;
}) {
  return (
    <IPhoneFrame
      width={width}
      screenshotUrl={screenshot}
      screenFallbackColor={screenColor}
    />
  );
}

function Badge({
  text,
  accent,
  textColor,
}: {
  text: string;
  accent: string;
  textColor: string;
}) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 999,
        backgroundColor: accent,
        color: textColor,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.5,
        opacity: 0.95,
      }}
    >
      {text}
    </div>
  );
}

function TextBlock({
  slide,
  theme,
  align = 'center',
  width,
}: {
  slide: SlideData;
  theme: ResolvedTheme;
  align?: 'left' | 'center' | 'right';
  width?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        textAlign: align,
        alignItems:
          align === 'center'
            ? 'center'
            : align === 'left'
              ? 'flex-start'
              : 'flex-end',
        maxWidth: width ?? '100%',
      }}
    >
      {slide.badge && (
        <Badge text={slide.badge} accent={theme.accent} textColor={theme.bg} />
      )}
      <h2
        style={{
          margin: 0,
          fontSize: slide.headlineFontSize,
          fontWeight: 800,
          color: theme.text,
          lineHeight: 1.1,
          letterSpacing: -1,
          fontFamily:
            '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {slide.headline}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: slide.subtitleFontSize,
          color: theme.accent,
          lineHeight: 1.5,
          fontFamily:
            '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          fontWeight: 400,
          opacity: 0.9,
        }}
      >
        {slide.subtitle}
      </p>
    </div>
  );
}

export const SlideCanvas = React.forwardRef<HTMLDivElement, SlideCanvasProps>(
  function SlideCanvas(
    { layout, theme, slide, bgGradient, preview = true, width = 300 },
    ref
  ) {
    const screenshotDataUrl = slide.screenshotUrl;
    const bgCss = bgGradient ? bgToCss(bgGradient) : theme.bg;
    // Preview aspect ratio: iPhone-ish 9:19.5
    const height = Math.round(width * (19.5 / 9));
    const pad = Math.round(width * 0.08);
    const phonePreviewW = Math.round(width * 0.52);

    const containerStyle: React.CSSProperties = {
      width,
      height,
      background: bgCss,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      borderRadius: preview ? 12 : 0,
    };

    // ── centered: text top, phone bottom ─────────────────────────────────────
    if (layout === 'centered') {
      return (
        <div ref={ref} style={containerStyle}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              padding: pad,
              paddingBottom: 0,
              gap: pad,
            }}
          >
            <TextBlock slide={slide} theme={theme} align="center" />
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <PhoneMockup
                screenshot={screenshotDataUrl}
                screenColor={theme.phoneScreen}
                borderColor={theme.phoneBorder}
                width={phonePreviewW}
              />
            </div>
          </div>
        </div>
      );
    }

    // ── bottom-caption: phone fills frame, caption at bottom ─────────────────
    if (layout === 'bottom-caption') {
      return (
        <div ref={ref} style={containerStyle}>
          {/* phone fills top 75% */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: phonePreviewW * 1.15,
            }}
          >
            <PhoneMockup
              screenshot={screenshotDataUrl}
              screenColor={theme.phoneScreen}
              borderColor={theme.phoneBorder}
              width={phonePreviewW * 1.15}
            />
          </div>
          {/* caption at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: pad,
              paddingTop: pad * 0.5,
              background: `linear-gradient(transparent, ${theme.bg} 40%)`,
            }}
          >
            <TextBlock slide={slide} theme={theme} align="center" />
          </div>
        </div>
      );
    }

    // ── split-left: text left, phone right ───────────────────────────────────
    if (layout === 'split-left') {
      return (
        <div
          ref={ref}
          style={{
            ...containerStyle,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: pad,
            }}
          >
            <TextBlock slide={slide} theme={theme} align="left" />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingRight: pad * 0.5,
              paddingTop: pad,
              paddingBottom: pad,
            }}
          >
            <PhoneMockup
              screenshot={screenshotDataUrl}
              screenColor={theme.phoneScreen}
              borderColor={theme.phoneBorder}
              width={phonePreviewW * 0.85}
            />
          </div>
        </div>
      );
    }

    // ── split-right: phone left, text right ──────────────────────────────────
    if (layout === 'split-right') {
      return (
        <div
          ref={ref}
          style={{
            ...containerStyle,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: pad * 0.5,
              paddingTop: pad,
              paddingBottom: pad,
            }}
          >
            <PhoneMockup
              screenshot={screenshotDataUrl}
              screenColor={theme.phoneScreen}
              borderColor={theme.phoneBorder}
              width={phonePreviewW * 0.85}
            />
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: pad,
            }}
          >
            <TextBlock slide={slide} theme={theme} align="left" />
          </div>
        </div>
      );
    }

    // ── hero: big headline, small phone ──────────────────────────────────────
    return (
      <div ref={ref} style={containerStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            padding: pad,
            gap: pad * 0.75,
          }}
        >
          {slide.badge && (
            <Badge
              text={slide.badge}
              accent={theme.accent}
              textColor={theme.bg}
            />
          )}
          <h2
            style={{
              margin: 0,
              fontSize: slide.headlineFontSize * 1.3,
              fontWeight: 900,
              color: theme.text,
              lineHeight: 1.0,
              letterSpacing: -2,
              textAlign: 'center',
              fontFamily:
                '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {slide.headline}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: slide.subtitleFontSize,
              color: theme.accent,
              textAlign: 'center',
              fontFamily:
                '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
              opacity: 0.9,
            }}
          >
            {slide.subtitle}
          </p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <PhoneMockup
              screenshot={screenshotDataUrl}
              screenColor={theme.phoneScreen}
              borderColor={theme.phoneBorder}
              width={phonePreviewW * 0.7}
            />
          </div>
        </div>
      </div>
    );
  }
);
