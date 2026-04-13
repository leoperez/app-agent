'use client';

import { useRef, useState } from 'react';
import type { SlideData } from '@/types/screenshots';
import { MdUpload, MdDelete, MdLoop } from 'react-icons/md';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';

interface SlideEditorProps {
  slide: SlideData;
  onChange: (updated: SlideData) => void;
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

export function SlideEditor({ slide, onChange }: SlideEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const teamInfo = useTeam();
  const { currentApp } = useApp();

  const set = <K extends keyof SlideData>(key: K, value: SlideData[K]) =>
    onChange({ ...slide, [key]: value });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const teamId = teamInfo?.currentTeam?.id;
    const appId = currentApp?.id;
    if (!teamId || !appId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/screenshot-sets/upload-image`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Upload failed');
      }

      const { url } = await res.json();
      set('screenshotUrl', url);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      // reset so same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
    }
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
          <span className="text-xs text-muted-foreground">Size</span>
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
          <span className="text-xs text-muted-foreground">Size</span>
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
      <Field label="App screenshot">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {slide.screenshotUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.screenshotUrl}
              alt="screenshot preview"
              className="w-12 h-20 object-cover rounded border border-border flex-shrink-0"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <MdLoop className="h-3 w-3" />
                {uploading ? 'Uploading…' : 'Replace'}
              </button>
              <button
                onClick={() => set('screenshotUrl', undefined)}
                className="flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <MdDelete className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 w-full rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <MdLoop className="h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <MdUpload className="h-4 w-4" /> Upload PNG / JPG / WebP
              </>
            )}
          </button>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Uploaded to Vercel Blob and saved with the set.
        </p>
      </Field>
    </div>
  );
}
