'use client';

import { useCallback, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { MdClose, MdDownload, MdVideocam } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import {
  SlideComposition,
  totalDurationFrames,
  TransitionType,
} from './video-composition';
import type {
  LayoutId,
  SlideData,
  ResolvedTheme,
  GradientBg,
  DecorationId,
} from '@/types/screenshots';

interface VideoExportPanelProps {
  slides: SlideData[];
  layoutId: LayoutId;
  theme: ResolvedTheme;
  bgGradient: GradientBg | null;
  decorationId: DecorationId;
  deviceType: 'iphone' | 'android' | 'ipad';
  fontFamily: string;
  appIconUrl?: string;
  canvasWidth: number;
  canvasHeight: number;
  onClose: () => void;
}

const FPS = 30;

export function VideoExportPanel({
  slides,
  layoutId,
  theme,
  bgGradient,
  decorationId,
  deviceType,
  fontFamily,
  appIconUrl,
  canvasWidth,
  canvasHeight,
  onClose,
}: VideoExportPanelProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [slideSecs, setSlideSecs] = useState(2.5);
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'social' | 'appstore'>('social');

  const slideDurationFrames = Math.round(slideSecs * FPS);
  const transitionFrames = Math.round(FPS * 0.4); // 0.4s overlap
  const durationFrames = totalDurationFrames(
    slides.length,
    slideDurationFrames
  );

  const compositionProps = {
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
  };

  // Preview dimensions — maintain aspect ratio at fixed preview height
  const previewH = 420;
  const previewW = Math.round((canvasWidth / canvasHeight) * previewH);

  const exportVideo = useCallback(async () => {
    if (!playerRef.current) return;
    setExporting(true);

    try {
      // Get the canvas inside the Remotion Player
      const playerEl = playerRef.current.getContainerNode();
      const canvas = playerEl?.querySelector(
        'canvas'
      ) as HTMLCanvasElement | null;

      if (!canvas) {
        toast.error('Could not find player canvas');
        setExporting(false);
        return;
      }

      // Start recording
      const stream = canvas.captureStream(FPS);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();
      playerRef.current.seekTo(0);
      playerRef.current.play();

      // Wait for the full duration + small buffer
      const totalMs = (durationFrames / FPS) * 1000 + 200;
      await new Promise((r) => setTimeout(r, totalMs));

      recorder.stop();
      await recordingDone;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'screenshots-video.webm';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Video exported');
    } catch (e) {
      console.error(e);
      toast.error('Video export failed');
    } finally {
      setExporting(false);
    }
  }, [durationFrames]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh] w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MdVideocam className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Video export</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Player */}
          <div
            className="flex items-center justify-center bg-black/30 shrink-0"
            style={{ width: previewW + 40, minHeight: previewH + 40 }}
          >
            <div
              className="rounded-xl overflow-hidden shadow-2xl"
              style={{ width: previewW, height: previewH }}
            >
              <Player
                ref={playerRef}
                component={SlideComposition}
                inputProps={compositionProps}
                durationInFrames={Math.max(1, durationFrames)}
                compositionWidth={canvasWidth}
                compositionHeight={canvasHeight}
                fps={FPS}
                style={{ width: previewW, height: previewH }}
                controls
                loop
                autoPlay
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* Format */}
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Format
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'social',
                      label: 'Social Media',
                      desc: 'Custom duration',
                    },
                    {
                      id: 'appstore',
                      label: 'App Store Preview',
                      desc: '15–30s · H.264',
                    },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFormat(f.id);
                      if (f.id === 'appstore')
                        setSlideSecs(Math.max(15 / slides.length, 1));
                    }}
                    className={`py-2 px-2 rounded-lg text-left text-xs font-medium border transition-colors ${
                      format === f.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div>{f.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${format === f.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                    >
                      {f.desc}
                    </div>
                  </button>
                ))}
              </div>
              {format === 'appstore' && (
                <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[10px] text-amber-600 space-y-0.5">
                  <p className="font-semibold">
                    App Store Preview requirements
                  </p>
                  <p>• Duration: 15–30 seconds</p>
                  <p>• Resolution: portrait (e.g. 886×1920)</p>
                  <p>
                    • Upload the WebM to Handbrake or FFmpeg to convert to
                    H.264/MP4 before uploading to App Store Connect
                  </p>
                </div>
              )}
            </div>

            {/* Transition */}
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Transition
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['fade', 'slide', 'zoom'] as TransitionType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTransition(t)}
                    className={`py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                      transition === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Duration per slide
                </p>
                <span className="text-xs font-mono">
                  {slideSecs.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={
                  format === 'appstore' ? 30 / Math.max(slides.length, 1) : 6
                }
                step={0.5}
                value={slideSecs}
                onChange={(e) => setSlideSecs(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>1s</span>
                <span>
                  {format === 'appstore'
                    ? `${(30 / Math.max(slides.length, 1)).toFixed(1)}s`
                    : '6s'}
                </span>
              </div>
              {format === 'appstore' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Total must be 15–30s · currently{' '}
                  {(durationFrames / FPS).toFixed(1)}s
                </p>
              )}
            </div>

            {/* Info */}
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Slides</span>
                <span className="font-medium text-foreground">
                  {slides.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total duration</span>
                <span className="font-medium text-foreground">
                  {(durationFrames / FPS).toFixed(1)}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Format</span>
                <span className="font-medium text-foreground">WebM (VP9)</span>
              </div>
              <div className="flex justify-between">
                <span>Resolution</span>
                <span className="font-medium text-foreground">
                  {canvasWidth}×{canvasHeight}
                </span>
              </div>
            </div>

            <button
              onClick={exportVideo}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <MdDownload className="h-4 w-4" />
              {exporting ? 'Recording…' : 'Export video'}
            </button>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Video is recorded in real-time from the player. Keep this panel
              open during export.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
