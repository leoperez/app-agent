'use client';

import { useCallback, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import {
  MdAdd,
  MdAutoAwesome,
  MdClose,
  MdDownload,
  MdEdit,
  MdExpandMore,
  MdDelete,
  MdSave,
  MdFolderOpen,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { SlideCanvas } from './slide-canvas';
import { SlideEditor } from './slide-editor';
import {
  LAYOUTS,
  THEMES,
  resolveTheme,
  defaultSlides,
  EXPORT_TARGETS,
} from '@/lib/screenshot-templates';
import { useGetScreenshotSets } from '@/lib/swr/screenshots';
import { useApp } from '@/context/app';
import { useGetAppLocalizations } from '@/lib/swr/app';
import type {
  LayoutId,
  ThemeId,
  SlideData,
  ScreenshotSetRecord,
  ExportTarget,
  GradientBg,
} from '@/types/screenshots';

// Preview width in the editor
const PREVIEW_W = 240;

interface ScreenshotStudioProps {
  onClose: () => void;
}

export function ScreenshotStudio({ onClose }: ScreenshotStudioProps) {
  const { currentApp } = useApp();
  const { sets, loading, createSet, updateSet, deleteSet, generateTexts } =
    useGetScreenshotSets();

  // Localizations for AI context (shape: Record<locale, {public?, draft?}>)
  const { localizations: localizationsMap } = useGetAppLocalizations(
    currentApp?.id ?? ''
  );
  const localizationEntries = Object.entries(localizationsMap ?? {}).map(
    ([loc, versions]) => ({
      locale: loc,
      ...(versions.draft ?? versions.public ?? {}),
    })
  );

  // ── Active set state ─────────────────────────────────────────────────────
  const [activeSet, setActiveSet] = useState<ScreenshotSetRecord | null>(null);
  const [layoutId, setLayoutId] = useState<LayoutId>('centered');
  const [themeId, setThemeId] = useState<ThemeId>('midnight');
  const [customBg, setCustomBg] = useState('');
  const [customText, setCustomText] = useState('');
  const [customAccent, setCustomAccent] = useState('');
  const [bgGradient, setBgGradient] = useState<GradientBg | null>(null);
  const [bgMode, setBgMode] = useState<'solid' | 'gradient'>('solid');
  const [slides, setSlides] = useState<SlideData[]>(defaultSlides());
  const [activeSlide, setActiveSlide] = useState(0);
  const [setName, setSetName] = useState('Untitled set');
  const [locale, setLocale] = useState(currentApp?.primaryLocale ?? 'en-US');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<ExportTarget>(
    EXPORT_TARGETS.find((t) => t.store === currentApp?.store) ??
      EXPORT_TARGETS[0]
  );
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const theme = resolveTheme(themeId, {
    bg: customBg || null,
    text: customText || null,
    accent: customAccent || null,
  });

  // ── Load an existing set into the editor ─────────────────────────────────
  const loadSet = (set: ScreenshotSetRecord) => {
    setActiveSet(set);
    setLayoutId(set.layoutId as LayoutId);
    setThemeId(set.themeId as ThemeId);
    setCustomBg(set.customBg ?? '');
    setCustomText(set.customText ?? '');
    setCustomAccent(set.customAccent ?? '');
    setBgGradient(set.bgGradient ?? null);
    setBgMode(set.bgGradient ? 'gradient' : 'solid');
    setSlides(set.slides as SlideData[]);
    setSetName(set.name);
    setLocale(set.locale);
    setActiveSlide(0);
    setView('editor');
  };

  // ── Start a new set ───────────────────────────────────────────────────────
  const newSet = () => {
    setActiveSet(null);
    setLayoutId('centered');
    setThemeId('midnight');
    setCustomBg('');
    setCustomText('');
    setCustomAccent('');
    setBgGradient(null);
    setBgMode('solid');
    setSlides(defaultSlides());
    setSetName('Untitled set');
    setLocale(currentApp?.primaryLocale ?? 'en-US');
    setActiveSlide(0);
    setView('editor');
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: setName,
        locale,
        layoutId,
        themeId,
        customBg: customBg || null,
        customText: customText || null,
        customAccent: customAccent || null,
        bgGradient: bgMode === 'gradient' ? bgGradient : null,
        slides,
      };
      if (activeSet) {
        await updateSet(activeSet.id, payload);
        toast.success('Set saved');
      } else {
        const created = await createSet(payload);
        if (created) setActiveSet(created);
        toast.success('Set created');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── AI generate ───────────────────────────────────────────────────────────
  const generate = async () => {
    setGenerating(true);
    try {
      const loc =
        localizationEntries.find((l) => l.locale === locale) ??
        localizationEntries[0];
      const texts = await generateTexts({
        locale,
        count: slides.length,
        description:
          (loc as { description?: string; fullDescription?: string })
            ?.description ??
          (loc as { fullDescription?: string })?.fullDescription ??
          '',
        keywords: (loc as { keywords?: string })?.keywords ?? '',
      });
      if (texts.length === 0) throw new Error('No texts returned');
      setSlides((prev) =>
        prev.map((s, i) =>
          texts[i]
            ? {
                ...s,
                headline: texts[i].headline,
                subtitle: texts[i].subtitle,
                badge: texts[i].badge ?? '',
              }
            : s
        )
      );
      toast.success('Texts generated!');
    } catch {
      toast.error('Failed to generate texts');
    } finally {
      setGenerating(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportAll = useCallback(async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      const pixelRatio = exportTarget.width / PREVIEW_W;

      for (let i = 0; i < slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          pixelRatio,
          width: PREVIEW_W,
          height: Math.round(PREVIEW_W * (19.5 / 9)),
          style: { borderRadius: '0' },
        });
        const base64 = dataUrl.split(',')[1];
        zip.file(`slide-${i + 1}.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${setName.replace(/\s+/g, '-')}-${exportTarget.label.replace(/\s+/g, '-')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Screenshots downloaded!');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }, [slides, exportTarget, setName]);

  const exportSingle = useCallback(
    async (idx: number) => {
      const el = slideRefs.current[idx];
      if (!el) return;
      const pixelRatio = exportTarget.width / PREVIEW_W;
      try {
        const dataUrl = await toPng(el, {
          pixelRatio,
          style: { borderRadius: '0' },
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `slide-${idx + 1}.png`;
        a.click();
      } catch {
        toast.error('Export failed');
      }
    },
    [exportTarget]
  );

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Screenshot Studio</h2>
            <p className="text-xs text-muted-foreground">
              Create App Store & Google Play screenshots
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={newSet} size="sm">
              <MdAdd className="h-4 w-4 mr-1" /> New set
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sets grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : sets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <MdFolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No screenshot sets yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first set to get started
                </p>
              </div>
              <Button onClick={newSet}>
                <MdAdd className="h-4 w-4 mr-1" /> New set
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sets.map((set) => (
                <SetCard
                  key={set.id}
                  set={set}
                  onEdit={() => loadSet(set)}
                  onDelete={() => {
                    if (confirm('Delete this set?')) deleteSet(set.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── EDITOR VIEW ───────────────────────────────────────────────────────────
  const currentSlide = slides[activeSlide] ?? slides[0];
  const locales = Array.from(
    new Set(localizationEntries.map((l) => l.locale))
  ).filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Sets
          </button>
          <input
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            className="text-sm font-semibold bg-transparent border-none outline-none w-40 truncate"
            placeholder="Set name"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* AI generate */}
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={generating}
          >
            <MdAutoAwesome className="h-3.5 w-3.5 mr-1" />
            {generating ? 'Generating…' : 'AI texts'}
          </Button>

          {/* Save */}
          <Button size="sm" onClick={save} disabled={saving}>
            <MdSave className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Saving…' : 'Save'}
          </Button>

          {/* Export */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportPicker((v) => !v)}
              disabled={exporting}
            >
              <MdDownload className="h-3.5 w-3.5 mr-1" />
              {exporting ? 'Exporting…' : 'Export'}
              <MdExpandMore className="h-3.5 w-3.5 ml-1" />
            </Button>
            {showExportPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-popover shadow-lg py-1">
                {EXPORT_TARGETS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => {
                      setExportTarget(t);
                      setShowExportPicker(false);
                      exportAll();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between ${t.label === exportTarget.label ? 'font-semibold text-primary' : ''}`}
                  >
                    <span>{t.label}</span>
                    <span className="text-muted-foreground">
                      {t.width}×{t.height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: style controls */}
        <div className="w-56 border-r border-border flex flex-col overflow-y-auto bg-muted/10">
          {/* Layout picker */}
          <div className="p-3 border-b border-border">
            <button
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              onClick={() => setShowLayoutPicker((v) => !v)}
            >
              Layout
              <MdExpandMore
                className={`h-4 w-4 transition-transform ${showLayoutPicker ? 'rotate-180' : ''}`}
              />
            </button>
            {showLayoutPicker && (
              <div className="mt-2 space-y-1">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayoutId(l.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      layoutId === l.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="font-medium">{l.label}</span>
                    <br />
                    <span className="opacity-70 text-[10px]">
                      {l.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme picker */}
          <div className="p-3 border-b border-border">
            <button
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              onClick={() => setShowThemePicker((v) => !v)}
            >
              Theme
              <MdExpandMore
                className={`h-4 w-4 transition-transform ${showThemePicker ? 'rotate-180' : ''}`}
              />
            </button>
            {showThemePicker && (
              <div className="mt-2 space-y-1">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      themeId === t.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-border"
                      style={{ backgroundColor: t.theme.bg }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom colours */}
          <div className="p-3 border-b border-border space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Background
            </p>
            {/* Solid / Gradient toggle */}
            <div className="flex rounded-md overflow-hidden border border-border text-xs">
              {(['solid', 'gradient'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setBgMode(m)}
                  className={`flex-1 py-1 capitalize transition-colors ${
                    bgMode === m
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {bgMode === 'solid' ? (
              <div className="flex items-center gap-2">
                <label className="text-xs w-14 text-muted-foreground">
                  Colour
                </label>
                <input
                  type="color"
                  value={customBg || theme.bg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border border-border"
                />
                {customBg && (
                  <button
                    onClick={() => setCustomBg('')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs w-12 text-muted-foreground">
                    From
                  </label>
                  <input
                    type="color"
                    value={bgGradient?.color1 ?? theme.bg}
                    onChange={(e) =>
                      setBgGradient((g) => ({
                        type: 'gradient',
                        color1: e.target.value,
                        color2: g?.color2 ?? theme.accent,
                        angle: g?.angle ?? 135,
                      }))
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs w-12 text-muted-foreground">
                    To
                  </label>
                  <input
                    type="color"
                    value={bgGradient?.color2 ?? theme.accent}
                    onChange={(e) =>
                      setBgGradient((g) => ({
                        type: 'gradient',
                        color1: g?.color1 ?? theme.bg,
                        color2: e.target.value,
                        angle: g?.angle ?? 135,
                      }))
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs w-12 text-muted-foreground">
                    Angle
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={bgGradient?.angle ?? 135}
                    onChange={(e) =>
                      setBgGradient((g) => ({
                        type: 'gradient',
                        color1: g?.color1 ?? theme.bg,
                        color2: g?.color2 ?? theme.accent,
                        angle: Number(e.target.value),
                      }))
                    }
                    className="flex-1 h-1 accent-primary"
                  />
                  <span className="text-xs w-8 text-right">
                    {bgGradient?.angle ?? 135}°
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">
              Text colours
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs w-14 text-muted-foreground">Text</label>
              <input
                type="color"
                value={customText || theme.text}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-border"
              />
              {customText && (
                <button
                  onClick={() => setCustomText('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs w-14 text-muted-foreground">
                Accent
              </label>
              <input
                type="color"
                value={customAccent || theme.accent}
                onChange={(e) => setCustomAccent(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-border"
              />
              {customAccent && (
                <button
                  onClick={() => setCustomAccent('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Locale */}
          {locales.length > 1 && (
            <div className="p-3 border-b border-border">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                Locale
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
              >
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Add slide */}
          <div className="p-3">
            <button
              onClick={() =>
                setSlides((prev) => [
                  ...prev,
                  {
                    headline: 'New slide',
                    headlineFontSize: 52,
                    subtitle: 'Add your subtitle here.',
                    subtitleFontSize: 18,
                    badge: '',
                  },
                ])
              }
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1"
            >
              <MdAdd className="h-3.5 w-3.5" /> Add slide
            </button>
          </div>
        </div>

        {/* Center: slides strip + active slide editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Slides strip */}
          <div className="w-36 border-r border-border overflow-y-auto bg-muted/5 py-3 space-y-3 flex flex-col items-center">
            {slides.map((s, i) => (
              <div
                key={i}
                className="relative group flex flex-col items-center"
              >
                <button
                  onClick={() => setActiveSlide(i)}
                  className={`rounded-lg overflow-hidden transition-all ${
                    activeSlide === i
                      ? 'ring-2 ring-primary'
                      : 'ring-1 ring-border/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <SlideCanvas
                    ref={(el) => {
                      slideRefs.current[i] = el;
                    }}
                    layout={layoutId}
                    theme={theme}
                    slide={s}
                    bgGradient={bgMode === 'gradient' ? bgGradient : null}
                    preview={true}
                    width={100}
                  />
                </button>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => exportSingle(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Export this slide"
                  >
                    <MdDownload className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      onClick={() => {
                        setSlides((prev) => prev.filter((_, idx) => idx !== i));
                        if (activeSlide >= i && activeSlide > 0)
                          setActiveSlide((p) => p - 1);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete slide"
                    >
                      <MdDelete className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Active slide preview (large) */}
          <div className="flex-1 flex items-center justify-center bg-muted/20 overflow-auto p-6">
            <div className="shadow-2xl">
              <SlideCanvas
                layout={layoutId}
                theme={theme}
                slide={currentSlide}
                bgGradient={bgMode === 'gradient' ? bgGradient : null}
                preview={true}
                width={PREVIEW_W}
              />
            </div>
          </div>

          {/* Right panel: slide editor */}
          <div className="w-64 border-l border-border overflow-y-auto bg-background">
            <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
              <MdEdit className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Slide {activeSlide + 1}
              </span>
            </div>
            <SlideEditor
              slide={currentSlide}
              onChange={(updated) =>
                setSlides((prev) =>
                  prev.map((s, i) => (i === activeSlide ? updated : s))
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Set card (list view) ─────────────────────────────────────────────────────

function SetCard({
  set,
  onEdit,
  onDelete,
}: {
  set: ScreenshotSetRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firstSlide = (set.slides as SlideData[])[0];
  const theme = resolveTheme(set.themeId as ThemeId, {
    bg: set.customBg,
    text: set.customText,
    accent: set.customAccent,
  });

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
      <button onClick={onEdit} className="w-full">
        <div className="flex justify-center pt-4 pb-2 bg-muted/20">
          <SlideCanvas
            layout={set.layoutId as LayoutId}
            theme={theme}
            slide={firstSlide ?? defaultSlides()[0]}
            bgGradient={set.bgGradient ?? null}
            preview={true}
            width={100}
          />
        </div>
        <div className="p-3 text-left">
          <p className="text-xs font-semibold truncate">{set.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {set.locale} · {(set.slides as SlideData[]).length} slides
          </p>
        </div>
      </button>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
        title="Delete set"
      >
        <MdDelete className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
