'use client';

import React from 'react';
import type {
  LayoutId,
  SlideData,
  ResolvedTheme,
  GradientBg,
  DecorationId,
} from '@/types/screenshots';
import { resolveSlideText } from '@/types/screenshots';
import { PhoneFrame } from './phone-frame';
import { bgToCss } from '@/lib/screenshot-templates';

interface SlideCanvasProps {
  layout: LayoutId;
  theme: ResolvedTheme;
  slide: SlideData;
  bgGradient?: GradientBg | null;
  decorationId?: DecorationId;
  /** Which device frame to render. Default: 'iphone' */
  deviceType?: 'iphone' | 'android';
  /** Active locale for per-locale text resolution */
  activeLocale?: string;
  /** CSS font-family string — defaults to system font */
  fontFamily?: string;
  /** Render at preview size (true) or export size (false). Default: true */
  preview?: boolean;
  /** Width in px. Default: 300 */
  width?: number;
}

// ── Decoration overlay SVG ────────────────────────────────────────────────────
function DecorationOverlay({
  id,
  width,
  height,
  accent,
}: {
  id: DecorationId;
  width: number;
  height: number;
  accent: string;
}) {
  if (id === 'none') return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width,
    height,
    pointerEvents: 'none',
    overflow: 'hidden',
  };

  if (id === 'circles') {
    return (
      <svg
        style={style}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx={width * 0.85}
          cy={height * 0.12}
          r={width * 0.35}
          fill={accent}
          fillOpacity={0.08}
        />
        <circle
          cx={width * 0.1}
          cy={height * 0.78}
          r={width * 0.28}
          fill={accent}
          fillOpacity={0.07}
        />
        <circle
          cx={width * 0.5}
          cy={height * 0.5}
          r={width * 0.18}
          fill={accent}
          fillOpacity={0.04}
        />
      </svg>
    );
  }

  if (id === 'blob') {
    // Organic blob shapes using ellipses + rotation
    return (
      <svg
        style={style}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx={width * 0.8}
          cy={height * 0.18}
          rx={width * 0.45}
          ry={width * 0.3}
          fill={accent}
          fillOpacity={0.09}
          transform={`rotate(-30 ${width * 0.8} ${height * 0.18})`}
        />
        <ellipse
          cx={width * 0.2}
          cy={height * 0.82}
          rx={width * 0.38}
          ry={width * 0.25}
          fill={accent}
          fillOpacity={0.07}
          transform={`rotate(20 ${width * 0.2} ${height * 0.82})`}
        />
      </svg>
    );
  }

  if (id === 'dots') {
    const spacing = width * 0.12;
    const dotR = spacing * 0.08;
    const dots: React.ReactNode[] = [];
    for (let x = spacing; x < width; x += spacing) {
      for (let y = spacing; y < height; y += spacing) {
        dots.push(
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={dotR}
            fill={accent}
            fillOpacity={0.18}
          />
        );
      }
    }
    return (
      <svg
        style={style}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {dots}
      </svg>
    );
  }

  if (id === 'diagonal-lines') {
    const gap = width * 0.1;
    const lines: React.ReactNode[] = [];
    for (let i = -height; i < width + height; i += gap) {
      lines.push(
        <line
          key={i}
          x1={i}
          y1={0}
          x2={i + height}
          y2={height}
          stroke={accent}
          strokeOpacity={0.1}
          strokeWidth={width * 0.015}
        />
      );
    }
    return (
      <svg
        style={style}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {lines}
      </svg>
    );
  }

  if (id === 'confetti') {
    const items = [
      { x: 0.12, y: 0.08, r: 3, rot: 25 },
      { x: 0.82, y: 0.05, r: 2.5, rot: -15 },
      { x: 0.07, y: 0.45, r: 4, rot: 40 },
      { x: 0.9, y: 0.35, r: 2, rot: 60 },
      { x: 0.15, y: 0.85, r: 3.5, rot: -30 },
      { x: 0.75, y: 0.88, r: 2.5, rot: 10 },
      { x: 0.45, y: 0.04, r: 2, rot: 55 },
      { x: 0.6, y: 0.92, r: 3, rot: -45 },
      { x: 0.93, y: 0.65, r: 4, rot: 20 },
      { x: 0.05, y: 0.65, r: 2, rot: -60 },
      { x: 0.35, y: 0.95, r: 3, rot: 35 },
      { x: 0.7, y: 0.15, r: 2.5, rot: -20 },
    ];
    return (
      <svg
        style={style}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {items.map((item, i) => {
          const cx = item.x * width;
          const cy = item.y * height;
          const size = (item.r / 100) * width * 8;
          return (
            <rect
              key={i}
              x={cx - size / 2}
              y={cy - size / 2}
              width={size}
              height={size * 0.6}
              rx={size * 0.15}
              fill={accent}
              fillOpacity={0.22}
              transform={`rotate(${item.rot} ${cx} ${cy})`}
            />
          );
        })}
      </svg>
    );
  }

  return null;
}

// Thin wrapper so call sites stay the same
function PhoneMockup({
  screenshot,
  screenColor,
  width,
  deviceType = 'iphone',
}: {
  screenshot?: string;
  screenColor: string;
  borderColor: string; // kept for API compat, ignored — SVG frame has own gradient
  width: number;
  deviceType?: 'iphone' | 'android';
}) {
  return (
    <PhoneFrame
      width={width}
      screenshotUrl={screenshot}
      screenFallbackColor={screenColor}
      deviceType={deviceType}
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
  fontFamily,
}: {
  slide: SlideData;
  theme: ResolvedTheme;
  align?: 'left' | 'center' | 'right';
  width?: number;
  fontFamily: string;
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
          fontFamily,
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
          fontFamily,
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
    {
      layout,
      theme,
      slide,
      bgGradient,
      decorationId = 'none',
      deviceType = 'iphone',
      activeLocale,
      fontFamily,
      preview = true,
      width = 300,
    },
    ref
  ) {
    const ff =
      fontFamily ??
      '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
    // Resolve locale-specific text or fall back to base slide text
    const resolvedText = resolveSlideText(slide, activeLocale);
    const resolvedSlide: SlideData = { ...slide, ...resolvedText };
    const screenshotDataUrl = slide.screenshotUrl;
    const bgCss = bgGradient ? bgToCss(bgGradient) : theme.bg;
    // Aspect ratio: feature-graphic uses 1024:500 (landscape), all others use 9:19.5
    const isFeatureGraphic = layout === 'feature-graphic';
    const height = isFeatureGraphic
      ? Math.round(width * (500 / 1024))
      : Math.round(width * (19.5 / 9));
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
          <DecorationOverlay
            id={decorationId}
            width={width}
            height={height}
            accent={theme.accent}
          />
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
            <TextBlock
              slide={resolvedSlide}
              theme={theme}
              align="center"
              fontFamily={ff}
            />
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
                deviceType={deviceType}
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
          <DecorationOverlay
            id={decorationId}
            width={width}
            height={height}
            accent={theme.accent}
          />
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
              deviceType={deviceType}
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
            <TextBlock
              slide={resolvedSlide}
              theme={theme}
              align="center"
              fontFamily={ff}
            />
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
          <DecorationOverlay
            id={decorationId}
            width={width}
            height={height}
            accent={theme.accent}
          />
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: pad,
            }}
          >
            <TextBlock
              slide={resolvedSlide}
              theme={theme}
              align="left"
              fontFamily={ff}
            />
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
              deviceType={deviceType}
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
          <DecorationOverlay
            id={decorationId}
            width={width}
            height={height}
            accent={theme.accent}
          />
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
              deviceType={deviceType}
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
            <TextBlock
              slide={resolvedSlide}
              theme={theme}
              align="left"
              fontFamily={ff}
            />
          </div>
        </div>
      );
    }

    // ── feature-graphic: landscape 1024×500 banner for Google Play ───────────
    if (layout === 'feature-graphic') {
      const fgPad = Math.round(width * 0.06);
      const fgTextSize = width / 1024; // scale factor relative to 1024px baseline
      return (
        <div
          ref={ref}
          style={{
            ...containerStyle,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <DecorationOverlay
            id={decorationId}
            width={width}
            height={height}
            accent={theme.accent}
          />
          {/* Text column — left 55% */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: Math.round(fgPad * 0.5),
              padding: fgPad,
              paddingRight: fgPad * 0.5,
              zIndex: 1,
            }}
          >
            {resolvedSlide.badge && (
              <Badge
                text={resolvedSlide.badge}
                accent={theme.accent}
                textColor={theme.bg}
              />
            )}
            <h2
              style={{
                margin: 0,
                fontSize: Math.round(
                  resolvedSlide.headlineFontSize * fgTextSize * 0.8
                ),
                fontWeight: 800,
                color: theme.text,
                lineHeight: 1.1,
                letterSpacing: -1,
                fontFamily: ff,
              }}
            >
              {resolvedSlide.headline}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: Math.round(
                  resolvedSlide.subtitleFontSize * fgTextSize * 0.85
                ),
                color: theme.accent,
                lineHeight: 1.4,
                fontFamily: ff,
                fontWeight: 400,
                opacity: 0.9,
              }}
            >
              {resolvedSlide.subtitle}
            </p>
          </div>
          {/* Screenshot column — right 45% (only if screenshot present) */}
          {screenshotDataUrl ? (
            <div
              style={{
                width: Math.round(width * 0.4),
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingRight: fgPad * 0.5,
                paddingTop: fgPad * 0.4,
                paddingBottom: fgPad * 0.4,
                flexShrink: 0,
                zIndex: 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotDataUrl}
                alt=""
                style={{
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: Math.round(width * 0.012),
                  boxShadow: `0 ${Math.round(width * 0.008)}px ${Math.round(width * 0.03)}px rgba(0,0,0,0.35)`,
                }}
              />
            </div>
          ) : (
            /* Placeholder accent shape when no screenshot */
            <div
              style={{
                width: Math.round(width * 0.35),
                height: '75%',
                flexShrink: 0,
                marginRight: fgPad,
                borderRadius: Math.round(width * 0.02),
                background: theme.accent,
                opacity: 0.12,
              }}
            />
          )}
        </div>
      );
    }

    // ── hero: big headline, small phone ──────────────────────────────────────
    return (
      <div ref={ref} style={containerStyle}>
        <DecorationOverlay
          id={decorationId}
          width={width}
          height={height}
          accent={theme.accent}
        />
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
          {resolvedSlide.badge && (
            <Badge
              text={resolvedSlide.badge}
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
              fontFamily: ff,
            }}
          >
            {resolvedSlide.headline}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: slide.subtitleFontSize,
              color: theme.accent,
              textAlign: 'center',
              fontFamily: ff,
              opacity: 0.9,
            }}
          >
            {resolvedSlide.subtitle}
          </p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <PhoneMockup
              screenshot={screenshotDataUrl}
              screenColor={theme.phoneScreen}
              borderColor={theme.phoneBorder}
              deviceType={deviceType}
              width={phonePreviewW * 0.7}
            />
          </div>
        </div>
      </div>
    );
  }
);
