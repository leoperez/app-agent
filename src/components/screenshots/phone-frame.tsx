'use client';

import React from 'react';

/**
 * Realistic iPhone 15 Pro SVG frame.
 * The screen area is exposed via a clipPath so the screenshot fills it exactly.
 * `width` drives all proportions — height is derived automatically.
 */
export function IPhoneFrame({
  width,
  screenshotUrl,
  screenFallbackColor,
}: {
  width: number;
  screenshotUrl?: string;
  screenFallbackColor: string;
}) {
  // iPhone 15 Pro natural ratio: 393 × 852 logical px  → 1:2.168
  const h = Math.round(width * 2.168);
  const id = `iphone-clip-${width}`; // unique enough for same-page multi-use

  // Proportional values (all relative to width=393)
  const r = (x: number) => Math.round((x / 393) * width);

  // Frame outer rounded rect
  const rx = r(46);
  // Screen inset
  const sx = r(10);
  const sy = r(10);
  const sw = width - r(20);
  const sh = h - r(20);
  const srx = r(38);
  // Dynamic island
  const diW = r(120);
  const diH = r(34);
  const diX = (width - diW) / 2;
  const diY = r(18);
  const diRx = diH / 2;
  // Side buttons (right side)
  const btnW = r(4);
  const pwX = width - r(1);
  const pwY = r(160);
  const pwH = r(80);
  // Volume buttons (left)
  const volX = r(-3);
  const vol1Y = r(130);
  const vol2Y = r(210);
  const volH = r(60);
  // Action button (left, above volume)
  const actY = r(90);
  const actH = r(30);

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={id}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={srx} />
        </clipPath>
        {/* subtle inner shadow filter */}
        <filter
          id={`shadow-${width}`}
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
        >
          <feDropShadow dx="0" dy="4" stdDeviation="12" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer frame */}
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={h - 2}
        rx={rx}
        fill="url(#frameGrad)"
        stroke="#1a1a1a"
        strokeWidth={2}
        filter={`url(#shadow-${width})`}
      />
      <defs>
        <linearGradient id="frameGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="40%" stopColor="#1c1c1e" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        {/* screen glass glare */}
        <linearGradient id="glare" x1="0" y1="0" x2="0.3" y2="0.6">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Screen background */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        rx={srx}
        fill={screenFallbackColor}
        clipPath={`url(#${id})`}
      />

      {/* Screenshot image */}
      {screenshotUrl && (
        <image
          href={screenshotUrl}
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          clipPath={`url(#${id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* Screen glass glare overlay */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        rx={srx}
        fill="url(#glare)"
        clipPath={`url(#${id})`}
      />

      {/* Frame inner edge highlight */}
      <rect
        x={sx - 1}
        y={sy - 1}
        width={sw + 2}
        height={sh + 2}
        rx={srx + 1}
        fill="none"
        stroke="white"
        strokeOpacity={0.08}
        strokeWidth={1.5}
      />

      {/* Dynamic Island */}
      <rect x={diX} y={diY} width={diW} height={diH} rx={diRx} fill="#0a0a0a" />

      {/* Side buttons */}
      {/* Power button */}
      <rect
        x={pwX}
        y={pwY}
        width={btnW}
        height={pwH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />
      {/* Volume up */}
      <rect
        x={volX}
        y={vol1Y}
        width={btnW}
        height={volH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />
      {/* Volume down */}
      <rect
        x={volX}
        y={vol2Y}
        width={btnW}
        height={volH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />
      {/* Action button */}
      <rect
        x={volX}
        y={actY}
        width={btnW}
        height={actH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />

      {/* Bottom chin line hint */}
      <line
        x1={width * 0.35}
        y1={h - r(14)}
        x2={width * 0.65}
        y2={h - r(14)}
        stroke="white"
        strokeOpacity={0.15}
        strokeWidth={r(3)}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Realistic Pixel 9 Pro SVG frame (Android).
 * Natural ratio: 412 × 892 logical px → 1:2.165 (near-identical to iPhone)
 */
export function AndroidFrame({
  width,
  screenshotUrl,
  screenFallbackColor,
}: {
  width: number;
  screenshotUrl?: string;
  screenFallbackColor: string;
}) {
  const h = Math.round(width * 2.165);
  const id = `android-clip-${width}`;
  const r = (x: number) => Math.round((x / 412) * width);

  // Frame outer corners — Pixel 9 Pro has rounder corners than iPhone
  const rx = r(52);
  // Screen inset — thinner bezels
  const sx = r(8);
  const sy = r(8);
  const sw = width - r(16);
  const sh = h - r(16);
  const srx = r(44);
  // Punch-hole camera (centered, near top)
  const camR = r(14);
  const camX = width / 2;
  const camY = r(34);
  // Power button (right)
  const btnW = r(4);
  const pwX = width - r(1);
  const pwY = r(200);
  const pwH = r(70);
  // Volume buttons (right side, above power)
  const vol1Y = r(120);
  const vol2Y = r(195);
  const volH = r(65);

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={id}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={srx} />
        </clipPath>
        <clipPath id={`${id}-cam`}>
          <circle cx={camX} cy={camY} r={camR} />
        </clipPath>
        <filter
          id={`ashadow-${width}`}
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
        >
          <feDropShadow dx="0" dy="4" stdDeviation="12" floodOpacity="0.35" />
        </filter>
        <linearGradient id={`aframeGrad-${width}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2e2e2e" />
          <stop offset="40%" stopColor="#141414" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <linearGradient id={`aglare-${width}`} x1="0" y1="0" x2="0.3" y2="0.6">
          <stop offset="0%" stopColor="white" stopOpacity="0.07" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer frame */}
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={h - 2}
        rx={rx}
        fill={`url(#aframeGrad-${width})`}
        stroke="#111"
        strokeWidth={2}
        filter={`url(#ashadow-${width})`}
      />

      {/* Screen background */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        rx={srx}
        fill={screenFallbackColor}
        clipPath={`url(#${id})`}
      />

      {/* Screenshot */}
      {screenshotUrl && (
        <image
          href={screenshotUrl}
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          clipPath={`url(#${id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* Screen glare */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        rx={srx}
        fill={`url(#aglare-${width})`}
        clipPath={`url(#${id})`}
      />

      {/* Frame inner edge highlight */}
      <rect
        x={sx - 1}
        y={sy - 1}
        width={sw + 2}
        height={sh + 2}
        rx={srx + 1}
        fill="none"
        stroke="white"
        strokeOpacity={0.07}
        strokeWidth={1.5}
      />

      {/* Punch-hole camera */}
      <circle cx={camX} cy={camY} r={camR} fill="#050505" />
      <circle cx={camX} cy={camY} r={camR * 0.45} fill="#111" />
      <circle
        cx={camX - camR * 0.2}
        cy={camY - camR * 0.2}
        r={camR * 0.15}
        fill="white"
        fillOpacity={0.15}
      />

      {/* Power button (right) */}
      <rect
        x={pwX}
        y={pwY}
        width={btnW}
        height={pwH}
        rx={btnW / 2}
        fill="#222"
      />
      {/* Volume up (right) */}
      <rect
        x={pwX}
        y={vol1Y}
        width={btnW}
        height={volH}
        rx={btnW / 2}
        fill="#222"
      />
      {/* Volume down (right) */}
      <rect
        x={pwX}
        y={vol2Y}
        width={btnW}
        height={volH}
        rx={btnW / 2}
        fill="#222"
      />

      {/* Bottom gesture bar */}
      <rect
        x={(width - r(120)) / 2}
        y={h - r(12)}
        width={r(120)}
        height={r(5)}
        rx={r(2.5)}
        fill="white"
        fillOpacity={0.12}
      />
    </svg>
  );
}

/**
 * iPad Pro 13" SVG frame.
 * Natural ratio: 2064 × 2752 px  → width : height ≈ 1 : 1.334
 */
export function IPadFrame({
  width,
  screenshotUrl,
  screenFallbackColor,
}: {
  width: number;
  screenshotUrl?: string;
  screenFallbackColor: string;
}) {
  const h = Math.round(width * (2752 / 2064)); // ≈ 1.334
  const id = `ipad-clip-${width}`;
  const r = (x: number) => Math.round((x / 2064) * width);

  // Frame geometry
  const rx = r(80);
  // Screen inset — iPad has thin bezels
  const sx = r(28);
  const sy = r(28);
  const sw = width - r(56);
  const sh = h - r(56);
  const srx = r(52);
  // Front camera — centre top
  const camR = r(16);
  const camX = width / 2;
  const camY = r(14);
  // Side button (right)
  const btnW = r(6);
  const pwX = width - r(2);
  const pwY = r(400);
  const pwH = r(120);
  // Volume buttons (right, above power)
  const vol1Y = r(220);
  const vol2Y = r(350);
  const volH = r(110);

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={id}>
          <rect x={sx} y={sy} width={sw} height={sh} rx={srx} />
        </clipPath>
        <filter
          id={`ipad-shadow-${width}`}
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
        >
          <feDropShadow dx="0" dy="6" stdDeviation="16" floodOpacity="0.3" />
        </filter>
        <linearGradient id={`ipad-frame-${width}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="40%" stopColor="#1c1c1e" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient
          id={`ipad-glare-${width}`}
          x1="0"
          y1="0"
          x2="0.3"
          y2="0.6"
        >
          <stop offset="0%" stopColor="white" stopOpacity="0.07" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer frame */}
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={h - 2}
        rx={rx}
        fill={`url(#ipad-frame-${width})`}
        stroke="#1a1a1a"
        strokeWidth={2}
        filter={`url(#ipad-shadow-${width})`}
      />

      {/* Screen background */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        rx={srx}
        fill={screenFallbackColor}
        clipPath={`url(#${id})`}
      />

      {/* Screenshot */}
      {screenshotUrl && (
        <image
          href={screenshotUrl}
          x={sx}
          y={sy}
          width={sw}
          height={sh}
          clipPath={`url(#${id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* Glass glare */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        rx={srx}
        fill={`url(#ipad-glare-${width})`}
        clipPath={`url(#${id})`}
      />

      {/* Frame inner edge */}
      <rect
        x={sx - 1}
        y={sy - 1}
        width={sw + 2}
        height={sh + 2}
        rx={srx + 1}
        fill="none"
        stroke="white"
        strokeOpacity={0.07}
        strokeWidth={1.5}
      />

      {/* Front camera */}
      <circle cx={camX} cy={camY} r={camR} fill="#0a0a0a" />
      <circle cx={camX} cy={camY} r={camR * 0.4} fill="#111" />

      {/* Power button (right) */}
      <rect
        x={pwX}
        y={pwY}
        width={btnW}
        height={pwH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />

      {/* Volume up (right) */}
      <rect
        x={pwX}
        y={vol1Y}
        width={btnW}
        height={volH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />

      {/* Volume down (right) */}
      <rect
        x={pwX}
        y={vol2Y}
        width={btnW}
        height={volH}
        rx={btnW / 2}
        fill="#2a2a2a"
      />

      {/* Home indicator */}
      <rect
        x={(width - r(180)) / 2}
        y={h - r(20)}
        width={r(180)}
        height={r(8)}
        rx={r(4)}
        fill="white"
        fillOpacity={0.12}
      />
    </svg>
  );
}

/**
 * Unified phone frame — picks iPhone, Android or iPad based on `deviceType`.
 */
export function PhoneFrame({
  width,
  screenshotUrl,
  screenFallbackColor,
  deviceType = 'iphone',
}: {
  width: number;
  screenshotUrl?: string;
  screenFallbackColor: string;
  deviceType?: 'iphone' | 'android' | 'ipad';
}) {
  if (deviceType === 'android') {
    return (
      <AndroidFrame
        width={width}
        screenshotUrl={screenshotUrl}
        screenFallbackColor={screenFallbackColor}
      />
    );
  }
  if (deviceType === 'ipad') {
    return (
      <IPadFrame
        width={width}
        screenshotUrl={screenshotUrl}
        screenFallbackColor={screenFallbackColor}
      />
    );
  }
  return (
    <IPhoneFrame
      width={width}
      screenshotUrl={screenshotUrl}
      screenFallbackColor={screenFallbackColor}
    />
  );
}
