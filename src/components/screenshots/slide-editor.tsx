'use client';

import { useRef } from 'react';
import type { SlideData } from '@/types/screenshots';
import { MdUpload, MdDelete } from 'react-icons/md';

interface SlideEditorProps {
  slide: SlideData;
  screenshotDataUrl?: string;
  onChange: (updated: SlideData) => void;
  onScreenshotChange: (dataUrl: string | undefined) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SlideEditor({
  slide,
  screenshotDataUrl,
  onChange,
  onScreenshotChange,
}: SlideEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof SlideData>(key: K, value: SlideData[K]) =>
    onChange({ ...slide, [key]: value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onScreenshotChange(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Headline */}
      <Field label="Headline">
        <textarea
          value={slide.headline}
          onChange={(e) => set('headline', e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Bold headline (≤5 words)"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">Font size</span>
          <input
            type="range"
            min={24}
            max={80}
            value={slide.headlineFontSize}
            onChange={(e) => set('headlineFontSize', Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-xs w-8 text-right">
            {slide.headlineFontSize}
          </span>
        </div>
      </Field>

      {/* Subtitle */}
      <Field label="Subtitle">
        <textarea
          value={slide.subtitle}
          onChange={(e) => set('subtitle', e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Supporting sentence (≤10 words)"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">Font size</span>
          <input
            type="range"
            min={12}
            max={30}
            value={slide.subtitleFontSize}
            onChange={(e) => set('subtitleFontSize', Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-xs w-8 text-right">
            {slide.subtitleFontSize}
          </span>
        </div>
      </Field>

      {/* Badge */}
      <Field label="Badge (optional)">
        <input
          type="text"
          value={slide.badge ?? ''}
          onChange={(e) => set('badge', e.target.value)}
          maxLength={12}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder='e.g. "New" or "Free"'
        />
      </Field>

      {/* Screenshot image */}
      <Field label="App screenshot (optional)">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {screenshotDataUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotDataUrl}
              alt="preview"
              className="w-12 h-20 object-cover rounded border border-border"
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-primary underline"
              >
                Change
              </button>
              <button
                onClick={() => onScreenshotChange(undefined)}
                className="flex items-center gap-0.5 text-xs text-destructive"
              >
                <MdDelete className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 w-full rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <MdUpload className="h-4 w-4" />
            Upload screenshot PNG / JPG
          </button>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Shown inside the phone mockup. Not saved to server.
        </p>
      </Field>
    </div>
  );
}
