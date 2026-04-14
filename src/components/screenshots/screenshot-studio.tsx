'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUndoRedo } from '@/hooks/use-undo-redo';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MdAdd,
  MdAutoAwesome,
  MdBookmark,
  MdBookmarkBorder,
  MdClose,
  MdCloudDownload,
  MdCloudUpload,
  MdCompare,
  MdDownload,
  MdEdit,
  MdExpandMore,
  MdDelete,
  MdHistory,
  MdInsights,
  MdLanguage,
  MdOpenInFull,
  MdSave,
  MdFolderOpen,
  MdDragIndicator,
  MdCopyAll,
  MdScience,
  MdShare,
  MdTranslate,
  MdUndo,
  MdRedo,
  MdZoomIn,
  MdZoomOut,
  MdWarning,
  MdContentCopy,
  MdPhoneAndroid,
  MdAnimation,
  MdSelectAll,
  MdVideocam,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { SlideCanvas } from './slide-canvas';
import { SlideEditor } from './slide-editor';
import { AsoScorePanel } from './aso-score-panel';
import { HistoryPanel } from './history-panel';
import { CompetitorPanel } from './competitor-panel';
import { AbTestPanel } from './ab-test-panel';
import { PaletteSwatches } from './icon-palette';
import { AscImportPanel } from './asc-import-panel';
import { TranslatePanel } from './translate-panel';
import { SharePanel } from './share-panel';
import { HelpTooltip } from '@/components/common/help-tooltip';
import { StoreListingPreview } from './store-listing-preview';
import { VideoExportPanel } from './video-export-panel';
import { encodeGif } from '@/lib/gif-encoder';
import {
  LAYOUTS,
  THEMES,
  FONTS,
  DECORATIONS,
  resolveTheme,
  resolveFont,
  defaultSlides,
  EXPORT_TARGETS,
} from '@/lib/screenshot-templates';
import {
  useGetScreenshotSets,
  useGetScreenshotTemplates,
} from '@/lib/swr/screenshots';
import { useApp } from '@/context/app';
import { useTeam } from '@/context/team';
import { useGetAppLocalizations } from '@/lib/swr/app';
import type {
  LayoutId,
  ThemeId,
  FontId,
  DecorationId,
  SlideData,
  ScreenshotSetRecord,
  ScreenshotTemplateRecord,
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
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id ?? '';
  const {
    sets,
    loading,
    createSet,
    updateSet,
    deleteSet,
    generateTexts,
    translateSlides,
    scoreSlides,
    listSnapshots,
    saveSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    listAbTests,
    createAbTest,
    deleteAbTest,
    copyToApp,
    duplicateToLocales,
  } = useGetScreenshotSets();
  const { templates, saveTemplate, deleteTemplate } =
    useGetScreenshotTemplates();

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
  const [fontId, setFontId] = useState<FontId>('system');
  const [decorationId, setDecorationId] = useState<DecorationId>('none');

  // Load Google Font whenever fontId changes
  useEffect(() => {
    const def = resolveFont(fontId);
    if (!def.googleUrl) return;
    const existing = document.querySelector(`link[data-gf="${fontId}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = def.googleUrl;
    link.setAttribute('data-gf', fontId);
    document.head.appendChild(link);
  }, [fontId]);
  const [slides, setSlides] = useState<SlideData[]>(defaultSlides());
  const [activeSlide, setActiveSlide] = useState(0);
  const [setName, setSetName] = useState('Untitled set');
  const [locale, setLocale] = useState(currentApp?.primaryLocale ?? 'en-US');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [listTab, setListTab] = useState<'sets' | 'templates' | 'ab-tests'>(
    'sets'
  );
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
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showAsoScore, setShowAsoScore] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [showAbTest, setShowAbTest] = useState(false);
  const [showAscImport, setShowAscImport] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDuplicateLocales, setShowDuplicateLocales] = useState(false);
  const [showStoreListing, setShowStoreListing] = useState(false);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [exportingGif, setExportingGif] = useState(false);
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const [canvasUploading, setCanvasUploading] = useState(false);
  const [fullPreviewZoom, setFullPreviewZoom] = useState(40); // % of export size
  const [previewW, setPreviewW] = useState(PREVIEW_W); // editor canvas width (px)

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  type DesignSnapshot = {
    slides: SlideData[];
    layoutId: LayoutId;
    themeId: ThemeId;
    fontId: FontId;
    decorationId: DecorationId;
    customBg: string;
    customText: string;
    customAccent: string;
    bgGradient: GradientBg | null;
    bgMode: 'solid' | 'gradient';
  };

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
    present: _histPresent,
    setPresent: pushHistory,
  } = useUndoRedo<DesignSnapshot>({
    slides,
    layoutId,
    themeId,
    fontId,
    decorationId,
    customBg,
    customText,
    customAccent,
    bgGradient,
    bgMode,
  });

  // Debounce: push to history 600ms after the last design change
  const histDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoring = useRef(false);

  useEffect(() => {
    if (isRestoring.current) return;
    if (histDebounce.current) clearTimeout(histDebounce.current);
    histDebounce.current = setTimeout(() => {
      pushHistory({
        slides,
        layoutId,
        themeId,
        fontId,
        decorationId,
        customBg,
        customText,
        customAccent,
        bgGradient,
        bgMode,
      });
    }, 600);
    return () => {
      if (histDebounce.current) clearTimeout(histDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slides,
    layoutId,
    themeId,
    fontId,
    decorationId,
    customBg,
    customText,
    customAccent,
    bgGradient,
    bgMode,
  ]);

  const applySnapshot = useCallback((snap: DesignSnapshot) => {
    isRestoring.current = true;
    setSlides(snap.slides);
    setLayoutId(snap.layoutId);
    setThemeId(snap.themeId);
    setFontId(snap.fontId);
    setDecorationId(snap.decorationId);
    setCustomBg(snap.customBg);
    setCustomText(snap.customText);
    setCustomAccent(snap.customAccent);
    setBgGradient(snap.bgGradient);
    setBgMode(snap.bgMode);
    // Allow effects to settle before accepting new history entries
    requestAnimationFrame(() => {
      isRestoring.current = false;
    });
  }, []);

  const handleUndo = useCallback(() => {
    // We need to get the snapshot from the undo stack directly
    // Since canUndo is true, undo() will update `present`
    // We use a ref-based approach: call undo then apply via useEffect
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  // Apply the present snapshot when it changes due to undo/redo
  const prevPresent = useRef(_histPresent);
  useEffect(() => {
    if (_histPresent !== prevPresent.current) {
      prevPresent.current = _histPresent;
      applySnapshot(_histPresent);
    }
  }, [_histPresent, applySnapshot]);

  // Keyboard shortcut: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) handleUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  // Drag-and-drop sensors — require 8px movement to start drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = slides.findIndex((_, i) => String(i) === active.id);
    const newIdx = slides.findIndex((_, i) => String(i) === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setSlides((prev) => arrayMove(prev, oldIdx, newIdx));
    setActiveSlide(newIdx);
  };

  const duplicateSlide = (idx: number) => {
    setSlides((prev) => {
      const copy = { ...prev[idx] };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setActiveSlide(idx + 1);
  };

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
    setFontId((set.fontId as FontId) ?? 'system');
    setDecorationId((set.decorationId as DecorationId) ?? 'none');
    setSlides(set.slides as SlideData[]);
    setSetName(set.name);
    setLocale(set.locale);
    setActiveSlide(0);
    setView('editor');
    // Clear undo history for the freshly loaded set
    resetHistory({
      slides: set.slides as SlideData[],
      layoutId: set.layoutId as LayoutId,
      themeId: set.themeId as ThemeId,
      fontId: (set.fontId as FontId) ?? 'system',
      decorationId: (set.decorationId as DecorationId) ?? 'none',
      customBg: set.customBg ?? '',
      customText: set.customText ?? '',
      customAccent: set.customAccent ?? '',
      bgGradient: set.bgGradient ?? null,
      bgMode: set.bgGradient ? 'gradient' : 'solid',
    });
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
    setFontId('system');
    setDecorationId('none');
    setSlides(defaultSlides());
    setSetName('Untitled set');
    setLocale(currentApp?.primaryLocale ?? 'en-US');
    setActiveSlide(0);
    setView('editor');
    resetHistory({
      slides: defaultSlides(),
      layoutId: 'centered',
      themeId: 'midnight',
      fontId: 'system',
      decorationId: 'none',
      customBg: '',
      customText: '',
      customAccent: '',
      bgGradient: null,
      bgMode: 'solid',
    });
  };

  // ── Apply a template ──────────────────────────────────────────────────────
  const applyTemplate = (tpl: ScreenshotTemplateRecord) => {
    setActiveSet(null);
    setLayoutId(tpl.layoutId as LayoutId);
    setThemeId(tpl.themeId as ThemeId);
    setCustomBg(tpl.customBg ?? '');
    setCustomText(tpl.customText ?? '');
    setCustomAccent(tpl.customAccent ?? '');
    setBgGradient(tpl.bgGradient ?? null);
    setBgMode(tpl.bgGradient ? 'gradient' : 'solid');
    setFontId((tpl.fontId as FontId) ?? 'system');
    setDecorationId((tpl.decorationId as DecorationId) ?? 'none');
    setSlides(tpl.slides as SlideData[]);
    setSetName(tpl.name);
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
        fontId,
        decorationId,
        customBg: customBg || null,
        customText: customText || null,
        customAccent: customAccent || null,
        bgGradient: bgMode === 'gradient' ? bgGradient : null,
        slides,
      };
      if (activeSet) {
        // Save snapshot of the CURRENT state before overwriting
        await saveSnapshot(activeSet.id);
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

  // ── Batch generate (all locales) ──────────────────────────────────────────
  const [batchGenerating, setBatchGenerating] = useState(false);

  const batchGenerate = async () => {
    const localeList = Array.from(
      new Set(localizationEntries.map((l) => l.locale))
    ).filter(Boolean);
    if (localeList.length === 0) {
      toast.error('No localizations found for this app');
      return;
    }
    if (
      !confirm(
        `Generate screenshot sets for ${localeList.length} locale(s)?\n\n${localeList.join(', ')}\n\nThis will create one set per locale with AI-generated texts.`
      )
    )
      return;

    setBatchGenerating(true);
    let created = 0;
    let failed = 0;

    for (const loc of localeList) {
      try {
        const locEntry =
          localizationEntries.find((l) => l.locale === loc) ?? {};
        const texts = await generateTexts({
          locale: loc,
          count: 5,
          description:
            (locEntry as { description?: string; fullDescription?: string })
              ?.description ??
            (locEntry as { fullDescription?: string })?.fullDescription ??
            '',
          keywords: (locEntry as { keywords?: string })?.keywords ?? '',
        });
        const slideData = defaultSlides().map((s, i) =>
          texts[i]
            ? {
                ...s,
                headline: texts[i].headline,
                subtitle: texts[i].subtitle,
                badge: texts[i].badge ?? '',
              }
            : s
        );
        await createSet({
          name: `${loc} screenshots`,
          locale: loc,
          layoutId,
          themeId,
          fontId,
          decorationId,
          customBg: customBg || null,
          customText: customText || null,
          customAccent: customAccent || null,
          bgGradient: bgMode === 'gradient' ? bgGradient : null,
          slides: slideData,
        } as Parameters<typeof createSet>[0]);
        created++;
      } catch {
        failed++;
      }
    }

    setBatchGenerating(false);
    if (failed === 0) {
      toast.success(`Created ${created} set${created !== 1 ? 's' : ''}!`);
    } else {
      toast.error(`Created ${created}, failed ${failed}`);
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

  // ── GIF export ────────────────────────────────────────────────────────────
  const exportGif = useCallback(async () => {
    setExportingGif(true);
    try {
      // Capture slides as PNG data URLs at a smaller size for GIF (400px wide)
      const gifW = Math.min(400, exportTarget.width);
      const gifRatio = gifW / PREVIEW_W;
      const frames: { imageData: ImageData; delay: number }[] = [];

      for (let i = 0; i < slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          pixelRatio: gifRatio,
          style: { borderRadius: '0' },
        });
        // Draw to canvas to get ImageData
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.src = dataUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        frames.push({
          imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
          delay: 200,
        });
      }

      if (frames.length === 0) {
        toast.error('No slides to export');
        return;
      }
      const blob = encodeGif(frames);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${setName.replace(/\s+/g, '-')}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('GIF exported');
    } catch (e) {
      console.error(e);
      toast.error('GIF export failed');
    } finally {
      setExportingGif(false);
    }
  }, [slides, exportTarget, setName]);

  // ── Batch operations ──────────────────────────────────────────────────────
  const applyToAllSlides = useCallback((patch: Partial<(typeof slides)[0]>) => {
    setSlides((prev) => prev.map((s) => ({ ...s, ...patch })));
  }, []);

  // ── Canvas drag-and-drop image upload ────────────────────────────────────
  const uploadSlideImage = async (file: File) => {
    if (!teamId || !currentApp?.id) return;
    setCanvasUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `/api/teams/${teamId}/apps/${currentApp.id}/screenshot-sets/upload-image`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setSlides((prev) =>
        prev.map((s, i) =>
          i === activeSlide ? { ...s, screenshotUrl: url } : s
        )
      );
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setCanvasUploading(false);
    }
  };

  // ── Push to App Store Connect ─────────────────────────────────────────────
  const [pushingToAsc, setPushingToAsc] = useState(false);

  const pushToAsc = useCallback(async () => {
    if (currentApp?.store !== 'APPSTORE') {
      toast.error('Push to ASC is only available for App Store apps');
      return;
    }
    if (
      !confirm(
        `Push ${slides.length} slide(s) to App Store Connect?\n\nLocale: ${locale}\nTarget: ${exportTarget.label}\n\nThis will overwrite existing screenshots for this locale and display type.`
      )
    )
      return;

    setPushingToAsc(true);
    try {
      const pixelRatio = exportTarget.width / PREVIEW_W;
      const slidePayloads: { dataUrl: string; fileName: string }[] = [];

      for (let i = 0; i < slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          pixelRatio,
          style: { borderRadius: '0' },
        });
        slidePayloads.push({ dataUrl, fileName: `slide-${i + 1}.png` });
      }

      const res = await fetch(
        `/api/teams/${teamId}/apps/${currentApp?.id}/screenshot-sets/push-to-asc`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            displayLabel: exportTarget.label,
            slides: slidePayloads,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? 'Push failed');
      }
      toast.success(
        `Uploaded ${result.uploaded}/${result.total} screenshots to App Store Connect!`
      );
      if (result.errors?.length) {
        toast.error(`${result.errors.length} slide(s) failed — check console`);
        console.error('ASC upload errors:', result.errors);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPushingToAsc(false);
    }
  }, [slides, locale, exportTarget, currentApp, teamId]);

  // ── Push to Google Play ───────────────────────────────────────────────────
  const [pushingToGP, setPushingToGP] = useState(false);

  const pushToGooglePlay = useCallback(async () => {
    if (currentApp?.store !== 'GOOGLEPLAY') {
      toast.error('Push to Google Play is only available for Google Play apps');
      return;
    }
    if (
      !confirm(
        `Push ${slides.length} image(s) to Google Play Console?\n\nLocale: ${locale}\nTarget: ${exportTarget.label}\n\nThis will replace all existing images for this locale and image type.`
      )
    )
      return;

    setPushingToGP(true);
    try {
      const pixelRatio = exportTarget.width / PREVIEW_W;
      const slidePayloads: { dataUrl: string; fileName: string }[] = [];

      for (let i = 0; i < slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, {
          pixelRatio,
          style: { borderRadius: '0' },
        });
        slidePayloads.push({ dataUrl, fileName: `slide-${i + 1}.png` });
      }

      const res = await fetch(
        `/api/teams/${teamId}/apps/${currentApp?.id}/screenshot-sets/push-to-google-play`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            displayLabel: exportTarget.label,
            slides: slidePayloads,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Push failed');
      toast.success(
        `Uploaded ${result.uploaded}/${result.total} image(s) to Google Play!`
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPushingToGP(false);
    }
  }, [slides, locale, exportTarget, currentApp, teamId]);

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
            {localizationEntries.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={batchGenerate}
                disabled={batchGenerating}
                title="Generate one set per app locale using AI"
              >
                <MdLanguage className="h-4 w-4 mr-1" />
                {batchGenerating ? 'Generating…' : 'Generate all locales'}
              </Button>
            )}
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

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => setListTab('sets')}
            className={`text-sm px-1 py-2.5 mr-4 border-b-2 transition-colors ${listTab === 'sets' ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            My sets
          </button>
          <button
            onClick={() => setListTab('templates')}
            className={`text-sm px-1 py-2.5 mr-4 border-b-2 transition-colors flex items-center gap-1 ${listTab === 'templates' ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <MdBookmark className="h-3.5 w-3.5" /> Templates
            {templates.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
                {templates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setListTab('ab-tests')}
            className={`text-sm px-1 py-2.5 border-b-2 transition-colors flex items-center gap-1 ${listTab === 'ab-tests' ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <MdScience className="h-3.5 w-3.5" /> A/B Tests
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {listTab === 'sets' ? (
            loading ? (
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
                    onCopyToApp={async (targetAppId) => {
                      const ok = await copyToApp(set.id, targetAppId);
                      if (ok) toast.success('Set copied to app');
                      else toast.error('Copy failed');
                    }}
                  />
                ))}
              </div>
            )
          ) : listTab === 'templates' ? (
            templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <MdBookmark className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No templates yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Open a set and click the bookmark icon to save it as a
                    reusable template
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {templates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onApply={() => applyTemplate(tpl)}
                    onDelete={() => {
                      if (confirm('Delete this template?'))
                        deleteTemplate(tpl.id);
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            /* A/B Tests tab — open the panel */
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <MdScience className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">A/B Test pairings</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Link two screenshot sets as A/B variants to track which
                  performs better.
                </p>
              </div>
              <Button onClick={() => setShowAbTest(true)}>
                <MdScience className="h-4 w-4 mr-1" /> Manage A/B tests
              </Button>
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

  // Full-resolution preview dimensions
  const fullW = Math.round((exportTarget.width * fullPreviewZoom) / 100);
  const fullH = Math.round((exportTarget.height * fullPreviewZoom) / 100);

  // Slide count limits per store
  const slideLimit = exportTarget.store === 'GOOGLEPLAY' ? 8 : 10;
  const atSlideLimit = slides.length >= slideLimit;
  const overSlideLimit = slides.length > slideLimit;

  // Warn when layout and export target aspect ratios are mismatched
  const isFeatureGraphicLayout = layoutId === 'feature-graphic';
  const isFeatureGraphicTarget = exportTarget.label === 'Feature Graphic';
  const exportMismatch = isFeatureGraphicLayout !== isFeatureGraphicTarget;

  return (
    <div className="flex flex-col h-full">
      {/* Hidden export canvases — rendered at PREVIEW_W so pixelRatio scaling is correct */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        {slides.map((s, i) => (
          <SlideCanvas
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            layout={layoutId}
            theme={theme}
            slide={s}
            bgGradient={bgMode === 'gradient' ? bgGradient : null}
            decorationId={decorationId}
            deviceType={exportTarget.deviceType}
            fontFamily={resolveFont(fontId).family}
            preview={false}
            width={PREVIEW_W}
            appIconUrl={currentApp?.iconUrl ?? undefined}
          />
        ))}
      </div>

      {/* ASO Score panel */}
      {showAsoScore && (
        <AsoScorePanel
          slides={slides}
          locale={locale}
          onScore={async (s, l) => scoreSlides({ slides: s, locale: l })}
          onClose={() => setShowAsoScore(false)}
        />
      )}

      {/* A/B Test panel */}
      {showAbTest && (
        <AbTestPanel
          sets={sets}
          listAbTests={listAbTests}
          createAbTest={createAbTest}
          deleteAbTest={deleteAbTest}
          onClose={() => setShowAbTest(false)}
        />
      )}

      {/* Share preview panel */}
      {showShare && activeSet && (
        <SharePanel
          setId={activeSet.id}
          teamId={teamId}
          appId={currentApp?.id ?? ''}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Store listing preview modal */}
      {showStoreListing && (
        <StoreListingPreview
          slides={slides}
          layoutId={layoutId}
          themeId={themeId}
          fontId={fontId}
          decorationId={decorationId}
          bgGradient={bgGradient}
          bgMode={bgMode}
          customBg={customBg}
          customText={customText}
          customAccent={customAccent}
          deviceType={exportTarget.deviceType}
          appName={currentApp?.title ?? undefined}
          appIconUrl={currentApp?.iconUrl ?? undefined}
          store={exportTarget.store}
          onClose={() => setShowStoreListing(false)}
        />
      )}

      {/* Video export panel */}
      {showVideoPanel && (
        <VideoExportPanel
          slides={slides}
          layoutId={layoutId}
          theme={theme}
          bgGradient={bgMode === 'gradient' ? bgGradient : null}
          decorationId={decorationId}
          deviceType={exportTarget.deviceType}
          fontFamily={resolveFont(fontId).family}
          appIconUrl={currentApp?.iconUrl ?? undefined}
          canvasWidth={exportTarget.width}
          canvasHeight={exportTarget.height}
          onClose={() => setShowVideoPanel(false)}
        />
      )}

      {/* Duplicate to locales panel */}
      {showDuplicateLocales && (
        <DuplicateToLocalesPanel
          currentLocale={locale}
          availableLocales={locales}
          existingLocales={sets.map((s) => s.locale)}
          onConfirm={async (targetLocales) => {
            if (!activeSet) {
              // Save first, then duplicate
              toast.error('Save the set before duplicating to other locales');
              return;
            }
            const created = await duplicateToLocales(
              activeSet.id,
              targetLocales
            );
            setShowDuplicateLocales(false);
            toast.success(
              `Design duplicated to ${created.length} locale${created.length !== 1 ? 's' : ''}`
            );
          }}
          onClose={() => setShowDuplicateLocales(false)}
        />
      )}

      {/* Translate panel */}
      {showTranslate && (
        <TranslatePanel
          slides={slides}
          sourceLocale={locale}
          availableLocales={locales}
          translateSlides={translateSlides}
          onApply={(updated) => {
            setSlides(updated);
            setShowTranslate(false);
            toast.success('Translations applied');
          }}
          onClose={() => setShowTranslate(false)}
        />
      )}

      {/* Import from ASC panel */}
      {showAscImport && currentApp?.store === 'APPSTORE' && (
        <AscImportPanel
          teamId={teamId}
          appId={currentApp.id}
          locale={locale}
          slides={slides}
          onImport={(updated) => setSlides(updated)}
          onClose={() => setShowAscImport(false)}
        />
      )}

      {/* Competitor comparison panel */}
      {showCompetitor && (
        <CompetitorPanel
          slides={slides}
          locale={locale}
          teamId={teamId}
          appId={currentApp?.id ?? ''}
          onClose={() => setShowCompetitor(false)}
        />
      )}

      {/* Version history panel */}
      {showHistory && activeSet && (
        <HistoryPanel
          setId={activeSet.id}
          listSnapshots={listSnapshots}
          deleteSnapshot={deleteSnapshot}
          onRestore={async (snapshotId) => {
            const updated = await restoreSnapshot(activeSet.id, snapshotId);
            if (updated) {
              loadSet(updated);
              toast.success('Version restored');
            } else {
              toast.error('Failed to restore version');
            }
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Full preview modal */}
      {showFullPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center gap-4 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFullPreview(false);
          }}
        >
          {/* Controls */}
          <div className="flex items-center gap-3 bg-background/90 backdrop-blur rounded-xl px-4 py-2 shadow-lg">
            <span className="text-xs text-muted-foreground font-medium">
              {exportTarget.label} — {exportTarget.width}×{exportTarget.height}
              px
            </span>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => setFullPreviewZoom((z) => Math.max(15, z - 5))}
              className="text-muted-foreground hover:text-foreground"
            >
              <MdZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={15}
              max={80}
              value={fullPreviewZoom}
              onChange={(e) => setFullPreviewZoom(Number(e.target.value))}
              className="w-28 accent-primary"
            />
            <button
              onClick={() => setFullPreviewZoom((z) => Math.min(80, z + 5))}
              className="text-muted-foreground hover:text-foreground"
            >
              <MdZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {fullPreviewZoom}%
            </span>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => setShowFullPreview(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <MdClose className="h-4 w-4" />
            </button>
          </div>

          {/* Slide strip + preview */}
          <div className="flex items-start gap-4 overflow-auto max-h-[80vh]">
            {/* Slide strip */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`rounded overflow-hidden transition-all ${i === activeSlide ? 'ring-2 ring-primary' : 'ring-1 ring-white/20 opacity-60 hover:opacity-100'}`}
                >
                  <SlideCanvas
                    layout={layoutId}
                    theme={theme}
                    slide={s}
                    bgGradient={bgMode === 'gradient' ? bgGradient : null}
                    decorationId={decorationId}
                    deviceType={exportTarget.deviceType}
                    fontFamily={resolveFont(fontId).family}
                    preview={false}
                    width={60}
                    appIconUrl={currentApp?.iconUrl ?? undefined}
                  />
                </button>
              ))}
            </div>

            {/* Main preview at scaled export size */}
            <div
              className="rounded-lg overflow-hidden shadow-2xl flex-shrink-0"
              style={{ width: fullW, height: fullH }}
            >
              <SlideCanvas
                layout={layoutId}
                theme={theme}
                slide={currentSlide}
                bgGradient={bgMode === 'gradient' ? bgGradient : null}
                decorationId={decorationId}
                deviceType={exportTarget.deviceType}
                fontFamily={resolveFont(fontId).family}
                preview={false}
                width={fullW}
                appIconUrl={currentApp?.iconUrl ?? undefined}
              />
            </div>
          </div>

          <p className="text-xs text-white/40">
            Click outside to close · {fullW}×{fullH}px (scaled {fullPreviewZoom}
            % of {exportTarget.width}×{exportTarget.height})
          </p>
        </div>
      )}

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

          {/* Translate — only when there are other locales */}
          {locales.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              title="Translate slide texts to other locales"
              onClick={() => setShowTranslate(true)}
            >
              <MdTranslate className="h-3.5 w-3.5 mr-1" />
              Translate
            </Button>
          )}

          {/* Undo / Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
          >
            <MdUndo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
          >
            <MdRedo className="h-3.5 w-3.5" />
          </Button>

          {/* Save */}
          <Button size="sm" onClick={save} disabled={saving}>
            <MdSave className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Saving…' : 'Save'}
          </Button>

          {/* Share preview link (only for saved sets) */}
          {activeSet && (
            <Button
              variant="outline"
              size="sm"
              title="Share a preview link"
              onClick={() => setShowShare(true)}
            >
              <MdShare className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Duplicate design to other locales */}
          {localizationEntries.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              title="Duplicate this design to other locales"
              onClick={() => setShowDuplicateLocales(true)}
            >
              <MdContentCopy className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Save as template */}
          <Button
            variant="outline"
            size="sm"
            title="Save as reusable template"
            onClick={async () => {
              const tName = prompt('Template name:', setName);
              if (!tName) return;
              await saveTemplate({
                name: tName,
                layoutId,
                themeId,
                fontId,
                decorationId,
                customBg: customBg || null,
                customText: customText || null,
                customAccent: customAccent || null,
                bgGradient: bgMode === 'gradient' ? bgGradient : null,
                slides,
              });
              toast.success('Template saved!');
            }}
          >
            <MdBookmarkBorder className="h-3.5 w-3.5" />
          </Button>

          {/* ASO Score */}
          <Button
            variant="outline"
            size="sm"
            title="Score your screenshot texts with AI"
            onClick={() => setShowAsoScore(true)}
          >
            <MdInsights className="h-3.5 w-3.5 mr-1" />
            Score
          </Button>

          {/* Version History (only for saved sets) */}
          {activeSet && (
            <Button
              variant="outline"
              size="sm"
              title="View version history"
              onClick={() => setShowHistory(true)}
            >
              <MdHistory className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Competitor comparison (App Store only) */}
          {currentApp?.store === 'APPSTORE' && (
            <Button
              variant="outline"
              size="sm"
              title="Compare with competitor screenshots"
              onClick={() => setShowCompetitor(true)}
            >
              <MdCompare className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* A/B Test pairings */}
          <Button
            variant="outline"
            size="sm"
            title="Manage A/B test pairings"
            onClick={() => setShowAbTest(true)}
          >
            <MdScience className="h-3.5 w-3.5" />
          </Button>

          {/* Full preview */}
          <Button
            variant="outline"
            size="sm"
            title="Preview at real export dimensions"
            onClick={() => setShowFullPreview(true)}
          >
            <MdOpenInFull className="h-3.5 w-3.5" />
          </Button>

          {/* Import from App Store Connect */}
          {currentApp?.store === 'APPSTORE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAscImport(true)}
              title="Import screenshots from App Store Connect"
            >
              <MdCloudDownload className="h-3.5 w-3.5 mr-1" />
              Import ASC
            </Button>
          )}

          {/* Push to App Store Connect (App Store apps only) */}
          {currentApp?.store === 'APPSTORE' && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={pushToAsc}
                disabled={pushingToAsc}
                title="Upload screenshots directly to App Store Connect"
              >
                <MdCloudUpload className="h-3.5 w-3.5 mr-1" />
                {pushingToAsc ? 'Uploading…' : 'Push to ASC'}
              </Button>
              <HelpTooltip
                text="Uploads all slides directly to App Store Connect for the current locale and export target. Requires ASC credentials in Settings."
                articleSlug="screenshot-studio-export"
              />
            </div>
          )}

          {/* Push to Google Play (Google Play apps only) */}
          {currentApp?.store === 'GOOGLEPLAY' && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={pushToGooglePlay}
                disabled={pushingToGP}
                title="Upload screenshots directly to Google Play Console"
              >
                <MdCloudUpload className="h-3.5 w-3.5 mr-1" />
                {pushingToGP ? 'Uploading…' : 'Push to Google Play'}
              </Button>
              <HelpTooltip
                text="Creates a transient edit in Google Play Console, replaces existing images for this locale and image type, then commits. Changes appear as a draft in Play Console."
                articleSlug="screenshot-studio-export"
              />
            </div>
          )}

          {/* Store listing preview */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStoreListing(true)}
            title="Preview how screenshots look in the store listing"
          >
            <MdPhoneAndroid className="h-3.5 w-3.5 mr-1" />
            Preview
          </Button>

          {/* GIF export */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportGif}
            disabled={exportingGif}
            title="Export slides as animated GIF"
          >
            <MdAnimation className="h-3.5 w-3.5 mr-1" />
            {exportingGif ? 'Making GIF…' : 'GIF'}
          </Button>

          {/* Video export */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVideoPanel(true)}
            title="Export slides as video"
          >
            <MdVideocam className="h-3.5 w-3.5 mr-1" />
            Video
          </Button>

          {/* Export */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportPicker((v) => !v)}
              disabled={exporting}
              title={
                exportMismatch
                  ? isFeatureGraphicLayout
                    ? 'Layout is Feature Graphic but export target is portrait — dimensions will not match'
                    : 'Export target is Feature Graphic but layout is portrait — dimensions will not match'
                  : undefined
              }
              className={exportMismatch ? 'border-amber-500/60' : ''}
            >
              {exportMismatch ? (
                <MdWarning className="h-3.5 w-3.5 mr-1 text-amber-500" />
              ) : (
                <MdDownload className="h-3.5 w-3.5 mr-1" />
              )}
              {exporting ? 'Exporting…' : 'Export'}
              <MdExpandMore className="h-3.5 w-3.5 ml-1" />
            </Button>
            {showExportPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-popover shadow-lg py-1">
                {exportMismatch && (
                  <p className="px-3 py-2 text-[10px] text-amber-500 border-b border-border flex items-center gap-1">
                    <MdWarning className="h-3 w-3 shrink-0" />
                    {isFeatureGraphicLayout
                      ? 'Feature Graphic layout needs 1024×500 target'
                      : 'Feature Graphic target needs Feature Graphic layout'}
                  </p>
                )}
                {EXPORT_TARGETS.map((t) => {
                  const isMismatch =
                    (layoutId === 'feature-graphic') !==
                    (t.label === 'Feature Graphic');
                  return (
                    <button
                      key={t.label}
                      onClick={() => {
                        setExportTarget(t);
                        setShowExportPicker(false);
                        exportAll();
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between ${t.label === exportTarget.label ? 'font-semibold text-primary' : ''} ${isMismatch ? 'opacity-40' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {isMismatch && (
                          <MdWarning className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                        {t.label}
                      </span>
                      <span className="text-muted-foreground">
                        {t.width}×{t.height}
                      </span>
                    </button>
                  );
                })}
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
                    onClick={() => {
                      setLayoutId(l.id);
                      if (l.id === 'feature-graphic') {
                        const fg = EXPORT_TARGETS.find(
                          (t) => t.label === 'Feature Graphic'
                        );
                        if (fg) setExportTarget(fg);
                      }
                    }}
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

            {/* App icon palette */}
            {currentApp?.iconUrl && (
              <div className="pt-1 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  From app icon
                </p>
                <PaletteSwatches
                  iconUrl={currentApp.iconUrl}
                  onPick={(color) => {
                    setCustomBg(color);
                  }}
                />
                <p className="text-[10px] text-muted-foreground">
                  Click a swatch to apply as background colour
                </p>
              </div>
            )}
          </div>

          {/* Font */}
          <div className="p-3 border-b border-border">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
              Font
            </label>
            <div className="space-y-0.5">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontId(f.id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    fontId === f.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Decoration */}
          <div className="p-3 border-b border-border">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
              Decoration
            </label>
            <div className="grid grid-cols-3 gap-1">
              {DECORATIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDecorationId(d.id)}
                  title={d.label}
                  className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded text-[10px] transition-colors ${
                    decorationId === d.id
                      ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/40'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className="text-base leading-none">{d.emoji}</span>
                  <span>{d.label}</span>
                </button>
              ))}
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
          <div className="p-3 space-y-1">
            <button
              onClick={() => {
                if (atSlideLimit) return;
                setSlides((prev) => [
                  ...prev,
                  {
                    headline: 'New slide',
                    headlineFontSize: 52,
                    subtitle: 'Add your subtitle here.',
                    subtitleFontSize: 18,
                    badge: '',
                  },
                ]);
              }}
              disabled={atSlideLimit}
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                atSlideLimit
                  ? `Max ${slideLimit} slides for ${exportTarget.store === 'GOOGLEPLAY' ? 'Google Play' : 'App Store'}`
                  : undefined
              }
            >
              <MdAdd className="h-3.5 w-3.5" /> Add slide
            </button>
            {/* Slide count indicator */}
            <div
              className={`text-[10px] text-center font-medium ${overSlideLimit ? 'text-amber-500' : atSlideLimit ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}
            >
              {overSlideLimit && (
                <MdWarning className="h-2.5 w-2.5 inline mr-0.5" />
              )}
              {slides.length}/{slideLimit}
            </div>
          </div>
        </div>

        {/* Center: slides strip + active slide editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Slides strip — sortable */}
          <div className="w-36 border-r border-border overflow-y-auto bg-muted/5 py-3 flex flex-col items-center gap-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={slides.map((_, i) => String(i))}
                strategy={verticalListSortingStrategy}
              >
                {slides.map((s, i) => (
                  <SortableSlide
                    key={i}
                    id={String(i)}
                    index={i}
                    slide={s}
                    isActive={activeSlide === i}
                    layoutId={layoutId}
                    theme={theme}
                    bgGradient={bgMode === 'gradient' ? bgGradient : null}
                    decorationId={decorationId}
                    deviceType={exportTarget.deviceType}
                    fontFamily={resolveFont(fontId).family}
                    onSelect={() => setActiveSlide(i)}
                    onExport={() => exportSingle(i)}
                    onDuplicate={() => duplicateSlide(i)}
                    onDelete={
                      slides.length > 1
                        ? () => {
                            setSlides((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            );
                            if (activeSlide >= i && activeSlide > 0)
                              setActiveSlide((p) => p - 1);
                          }
                        : undefined
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Active slide preview (large) */}
          <div className="flex-1 flex flex-col bg-muted/20 overflow-hidden">
            {/* Zoom controls */}
            <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-b border-border bg-background/60 backdrop-blur">
              <span className="text-[10px] text-muted-foreground select-none">
                Drop image to set screenshot
              </span>
              <button
                onClick={() => setPreviewW((w) => Math.max(160, w - 20))}
                className="text-muted-foreground hover:text-foreground"
                title="Zoom out"
              >
                <MdZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={160}
                max={400}
                step={10}
                value={previewW}
                onChange={(e) => setPreviewW(Number(e.target.value))}
                className="w-24 accent-primary"
                title={`Preview size: ${previewW}px`}
              />
              <button
                onClick={() => setPreviewW((w) => Math.min(400, w + 20))}
                className="text-muted-foreground hover:text-foreground"
                title="Zoom in"
              >
                <MdZoomIn className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round((previewW / PREVIEW_W) * 100)}%
              </span>
            </div>
            <div
              className={`flex-1 flex items-center justify-center overflow-auto p-6 relative transition-colors ${canvasDragOver ? 'bg-primary/10' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer.types.includes('Files'))
                  setCanvasDragOver(true);
              }}
              onDragLeave={() => setCanvasDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setCanvasDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                  await uploadSlideImage(file);
                }
              }}
            >
              {/* Drag overlay hint */}
              {canvasDragOver && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
                    Drop image for slide {activeSlide + 1}
                  </div>
                </div>
              )}
              {canvasUploading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/40 backdrop-blur-sm">
                  <p className="text-sm text-foreground font-medium">
                    Uploading…
                  </p>
                </div>
              )}
              <div className="shadow-2xl">
                <SlideCanvas
                  layout={layoutId}
                  theme={theme}
                  slide={currentSlide}
                  bgGradient={bgMode === 'gradient' ? bgGradient : null}
                  decorationId={decorationId}
                  deviceType={exportTarget.deviceType}
                  activeLocale={locale}
                  fontFamily={resolveFont(fontId).family}
                  preview={true}
                  width={previewW}
                  appIconUrl={currentApp?.iconUrl ?? undefined}
                />
              </div>
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

            {/* Batch operations */}
            {slides.length > 1 && currentSlide.screenshotUrl && (
              <div className="px-4 py-2 border-b border-border bg-muted/5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MdSelectAll className="h-3 w-3" /> Apply to all slides
                </p>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() =>
                      applyToAllSlides({
                        screenshotUrl: currentSlide.screenshotUrl,
                      })
                    }
                    className="text-[10px] text-left text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-2 py-1 transition-colors"
                  >
                    Copy this screenshot to all slides
                  </button>
                  {(currentSlide.imageOffsetY !== undefined ||
                    currentSlide.imageOffsetX !== undefined ||
                    currentSlide.imageZoom !== undefined) && (
                    <button
                      onClick={() =>
                        applyToAllSlides({
                          imageOffsetY: currentSlide.imageOffsetY,
                          imageOffsetX: currentSlide.imageOffsetX,
                          imageZoom: currentSlide.imageZoom,
                        })
                      }
                      className="text-[10px] text-left text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-2 py-1 transition-colors"
                    >
                      Copy image position/zoom to all slides
                    </button>
                  )}
                  {currentSlide.customTextColor && (
                    <button
                      onClick={() =>
                        applyToAllSlides({
                          customTextColor: currentSlide.customTextColor,
                        })
                      }
                      className="text-[10px] text-left text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-2 py-1 transition-colors"
                    >
                      Copy text color to all slides
                    </button>
                  )}
                  {currentSlide.bgImageUrl && (
                    <button
                      onClick={() =>
                        applyToAllSlides({
                          bgImageUrl: currentSlide.bgImageUrl,
                        })
                      }
                      className="text-[10px] text-left text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-2 py-1 transition-colors"
                    >
                      Copy background image to all slides
                    </button>
                  )}
                </div>
              </div>
            )}

            <SlideEditor
              slide={currentSlide}
              onChange={(updated) =>
                setSlides((prev) =>
                  prev.map((s, i) => (i === activeSlide ? updated : s))
                )
              }
              activeLocale={locale}
              availableLocales={locales}
              hasAppIcon={!!currentApp?.iconUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable slide thumbnail ─────────────────────────────────────────────────

function SortableSlide({
  id,
  index,
  slide,
  isActive,
  layoutId,
  theme,
  bgGradient,
  decorationId,
  deviceType,
  fontFamily,
  onSelect,
  onExport,
  onDuplicate,
  onDelete,
}: {
  id: string;
  index: number;
  slide: SlideData;
  isActive: boolean;
  layoutId: LayoutId;
  theme: ReturnType<typeof resolveTheme>;
  bgGradient: GradientBg | null;
  decorationId: DecorationId;
  deviceType: 'iphone' | 'android' | 'ipad';
  fontFamily: string;
  onSelect: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Lazy render: only paint SlideCanvas when the thumbnail enters the viewport
  const observerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(isActive); // active slide always visible
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Estimate placeholder height based on aspect ratio
  const thumbH = Math.round(100 * (19.5 / 9));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative group flex flex-col items-center ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing absolute -top-0.5 left-1 z-10"
        title="Drag to reorder"
      >
        <MdDragIndicator className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <button
        onClick={onSelect}
        className={`rounded-lg overflow-hidden transition-all ${
          isActive
            ? 'ring-2 ring-primary'
            : 'ring-1 ring-border/50 opacity-70 hover:opacity-100'
        }`}
      >
        <div ref={observerRef} style={{ width: 100, minHeight: thumbH }}>
          {visible ? (
            <SlideCanvas
              layout={layoutId}
              theme={theme}
              slide={slide}
              bgGradient={bgGradient}
              decorationId={decorationId}
              deviceType={deviceType}
              fontFamily={fontFamily}
              preview={true}
              width={100}
            />
          ) : (
            <div style={{ width: 100, height: thumbH, background: theme.bg }} />
          )}
        </div>
      </button>

      <div className="flex items-center gap-0.5 mt-1">
        <span className="text-[10px] text-muted-foreground w-3 text-center">
          {index + 1}
        </span>
        <button
          onClick={onExport}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Export slide"
        >
          <MdDownload className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        <button
          onClick={onDuplicate}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Duplicate slide"
        >
          <MdCopyAll className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete slide"
          >
            <MdDelete className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Set card (list view) ─────────────────────────────────────────────────────

function SetCard({
  set,
  onEdit,
  onDelete,
  onCopyToApp,
}: {
  set: ScreenshotSetRecord;
  onEdit: () => void;
  onDelete: () => void;
  onCopyToApp: (targetAppId: string) => Promise<void>;
}) {
  const teamCtx = useTeam();
  const teamId = teamCtx?.currentTeam?.id;
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [apps, setApps] = useState<{ id: string; title: string | null }[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const openCopyMenu = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCopyMenu(true);
    if (apps.length === 0 && teamId) {
      setLoadingApps(true);
      const res = await fetch(`/api/teams/${teamId}/apps`);
      if (res.ok) setApps(await res.json());
      setLoadingApps(false);
    }
  };

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
            decorationId={(set.decorationId as DecorationId) ?? 'none'}
            fontFamily={resolveFont((set.fontId as FontId) ?? 'system').family}
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

      {/* Action buttons (visible on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {/* Copy to another app */}
        <div className="relative">
          <button
            onClick={openCopyMenu}
            className="p-1 rounded bg-muted/80 text-muted-foreground hover:text-foreground"
            title="Copy to another app"
          >
            <MdContentCopy className="h-3.5 w-3.5" />
          </button>
          {showCopyMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCopyMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-popover shadow-lg py-1">
                <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide border-b border-border">
                  Copy to app
                </p>
                {loadingApps ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : (
                  apps
                    .filter((a) => a.id !== set.appId)
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShowCopyMenu(false);
                          await onCopyToApp(a.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 truncate"
                      >
                        {a.title ?? a.id}
                      </button>
                    ))
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
          title="Delete set"
        >
          <MdDelete className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Template card (list view) ────────────────────────────────────────────────

function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: ScreenshotTemplateRecord;
  onApply: () => void;
  onDelete: () => void;
}) {
  const firstSlide = (template.slides as SlideData[])[0];
  const theme = resolveTheme(template.themeId as ThemeId, {
    bg: template.customBg,
    text: template.customText,
    accent: template.customAccent,
  });

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors">
      <button onClick={onApply} className="w-full">
        <div className="flex justify-center pt-4 pb-2 bg-muted/20">
          <SlideCanvas
            layout={template.layoutId as LayoutId}
            theme={theme}
            slide={firstSlide ?? defaultSlides()[0]}
            bgGradient={template.bgGradient ?? null}
            decorationId={(template.decorationId as DecorationId) ?? 'none'}
            fontFamily={
              resolveFont((template.fontId as FontId) ?? 'system').family
            }
            preview={true}
            width={100}
          />
        </div>
        <div className="p-3 text-left">
          <div className="flex items-center gap-1">
            <MdBookmark className="h-3 w-3 text-primary flex-shrink-0" />
            <p className="text-xs font-semibold truncate">{template.name}</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {(template.slides as SlideData[]).length} slides · click to use
          </p>
        </div>
      </button>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
        title="Delete template"
      >
        <MdDelete className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Duplicate to locales panel ────────────────────────────────────────────────

function DuplicateToLocalesPanel({
  currentLocale,
  availableLocales,
  existingLocales,
  onConfirm,
  onClose,
}: {
  currentLocale: string;
  availableLocales: string[];
  existingLocales: string[];
  onConfirm: (targetLocales: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const otherLocales = availableLocales.filter((l) => l !== currentLocale);

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

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(Array.from(selected));
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdContentCopy className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">Duplicate to locales</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="px-5 pt-4 pb-2 text-xs text-muted-foreground">
          Copy this design (theme, layout, font, slides) to the selected
          locales. Locales that already have a set are skipped.
        </p>

        <div className="px-5 pb-2 flex gap-2">
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => setSelected(new Set(otherLocales))}
          >
            All
          </button>
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => setSelected(new Set())}
          >
            None
          </button>
        </div>

        <div className="px-5 pb-4 flex-1 overflow-y-auto max-h-64 space-y-1">
          {otherLocales.map((l) => {
            const hasSet = existingLocales.includes(l);
            return (
              <label
                key={l}
                className={`flex items-center gap-2 text-xs py-1 cursor-pointer ${hasSet ? 'opacity-40' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(l)}
                  disabled={hasSet}
                  onChange={() => toggle(l)}
                  className="accent-primary"
                />
                <span>{l}</span>
                {hasSet && (
                  <span className="text-[10px] text-muted-foreground">
                    (already has set)
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || loading}
            className="w-full py-2 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading
              ? 'Duplicating…'
              : `Duplicate to ${selected.size} locale${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
