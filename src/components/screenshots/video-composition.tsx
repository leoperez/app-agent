'use client';

import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
} from 'remotion';
import { SlideCanvas } from './slide-canvas';
import type {
  LayoutId,
  SlideData,
  ResolvedTheme,
  GradientBg,
  DecorationId,
} from '@/types/screenshots';

export type TransitionType = 'fade' | 'slide' | 'zoom';

export interface SlideCompositionProps {
  slides: SlideData[];
  layoutId: LayoutId;
  theme: ResolvedTheme;
  bgGradient: GradientBg | null;
  decorationId: DecorationId;
  deviceType: 'iphone' | 'android' | 'ipad';
  fontFamily: string;
  appIconUrl?: string;
  transition: TransitionType;
  /** Duration per slide in frames */
  slideDurationFrames: number;
  /** Transition overlap duration in frames */
  transitionFrames: number;
  /** Canvas width in px */
  canvasWidth: number;
}

function SlideFrame({
  slide,
  layoutId,
  theme,
  bgGradient,
  decorationId,
  deviceType,
  fontFamily,
  appIconUrl,
  canvasWidth,
  transition,
  slideDurationFrames,
  transitionFrames,
  isFirst,
  isLast,
}: {
  slide: SlideData;
  layoutId: LayoutId;
  theme: ResolvedTheme;
  bgGradient: GradientBg | null;
  decorationId: DecorationId;
  deviceType: 'iphone' | 'android' | 'ipad';
  fontFamily: string;
  appIconUrl?: string;
  canvasWidth: number;
  transition: TransitionType;
  slideDurationFrames: number;
  transitionFrames: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const frame = useCurrentFrame();
  const tf = Math.max(1, transitionFrames);

  let opacity = 1;
  let translateX = 0;
  let scale = 1;

  // Fade / slide / zoom in — from frame 0 to transitionFrames (skip for first slide)
  if (!isFirst && frame < tf) {
    const p = interpolate(frame, [0, tf], [0, 1], {
      easing: Easing.inOut(Easing.ease),
      extrapolateRight: 'clamp',
    });
    if (transition === 'fade') opacity = p;
    if (transition === 'slide')
      translateX = interpolate(p, [0, 1], [canvasWidth, 0]);
    if (transition === 'zoom') {
      opacity = p;
      scale = interpolate(p, [0, 1], [0.88, 1]);
    }
  }

  // Fade / slide / zoom out — last transitionFrames (skip for last slide)
  if (!isLast && frame >= slideDurationFrames - tf) {
    const p = interpolate(
      frame,
      [slideDurationFrames - tf, slideDurationFrames],
      [0, 1],
      {
        easing: Easing.inOut(Easing.ease),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
    if (transition === 'fade') opacity = Math.min(opacity, 1 - p);
    if (transition === 'slide')
      translateX = interpolate(p, [0, 1], [0, -canvasWidth]);
    if (transition === 'zoom') {
      opacity = Math.min(opacity, 1 - p);
      scale = Math.min(scale, interpolate(p, [0, 1], [1, 1.08]));
    }
  }

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateX(${Math.round(translateX)}px) scale(${scale.toFixed(3)})`,
        willChange: 'transform, opacity',
      }}
    >
      <SlideCanvas
        layout={layoutId}
        theme={theme}
        slide={slide}
        bgGradient={bgGradient}
        decorationId={decorationId}
        deviceType={deviceType}
        fontFamily={fontFamily}
        preview={false}
        width={canvasWidth}
        appIconUrl={appIconUrl}
      />
    </AbsoluteFill>
  );
}

export function SlideComposition({
  slides,
  layoutId,
  theme,
  bgGradient,
  decorationId,
  deviceType,
  fontFamily,
  appIconUrl,
  transition,
  slideDurationFrames,
  transitionFrames,
  canvasWidth,
}: SlideCompositionProps) {
  if (!slides.length) return <AbsoluteFill style={{ background: '#000' }} />;

  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: 'hidden' }}>
      {slides.map((slide, i) => (
        <Sequence
          key={i}
          from={i * slideDurationFrames}
          durationInFrames={slideDurationFrames}
          layout="none"
        >
          <SlideFrame
            slide={slide}
            layoutId={layoutId}
            theme={theme}
            bgGradient={bgGradient}
            decorationId={decorationId}
            deviceType={deviceType}
            fontFamily={fontFamily}
            appIconUrl={appIconUrl}
            canvasWidth={canvasWidth}
            transition={transition}
            slideDurationFrames={slideDurationFrames}
            transitionFrames={transitionFrames}
            isFirst={i === 0}
            isLast={i === slides.length - 1}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

/** Total duration in frames for the composition */
export function totalDurationFrames(
  slideCount: number,
  slideDurationFrames: number
) {
  return slideCount * slideDurationFrames;
}
