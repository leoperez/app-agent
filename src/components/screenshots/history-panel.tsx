'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MdHistory,
  MdClose,
  MdRestore,
  MdDelete,
  MdAccessTime,
} from 'react-icons/md';
import type { ScreenshotSetSnapshotRecord } from '@/types/screenshots';

interface HistoryPanelProps {
  setId: string;
  onRestore: (snapshotId: string) => Promise<void>;
  onClose: () => void;
  listSnapshots: (setId: string) => Promise<ScreenshotSetSnapshotRecord[]>;
  deleteSnapshot: (setId: string, snapshotId: string) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryPanel({
  setId,
  onRestore,
  onClose,
  listSnapshots,
  deleteSnapshot,
}: HistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<ScreenshotSetSnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listSnapshots(setId);
    setSnapshots(data);
    setLoading(false);
  }, [setId, listSnapshots]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async (snapshotId: string) => {
    setRestoringId(snapshotId);
    await onRestore(snapshotId);
    setRestoringId(null);
    onClose();
  };

  const handleDelete = async (snapshotId: string) => {
    setDeletingId(snapshotId);
    await deleteSnapshot(setId, snapshotId);
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    setDeletingId(null);
    setConfirmDelete(null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdHistory className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <MdHistory className="h-7 w-7 text-muted-foreground animate-pulse" />
            </div>
          )}

          {!loading && snapshots.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <MdHistory className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No saved versions yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Versions are saved automatically when you save the set.
              </p>
            </div>
          )}

          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors group"
            >
              <MdAccessTime className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {snap.label || formatDate(snap.createdAt)}
                </p>
                {snap.label && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(snap.createdAt)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {timeAgo(snap.createdAt)} ·{' '}
                  {Array.isArray(snap.slides) ? snap.slides.length : 0} slides ·{' '}
                  {snap.layoutId} · {snap.themeId}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {confirmDelete === snap.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(snap.id)}
                      disabled={deletingId === snap.id}
                      className="text-xs text-destructive hover:underline"
                    >
                      {deletingId === snap.id ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-muted-foreground hover:underline ml-1"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRestore(snap.id)}
                      disabled={restoringId === snap.id}
                      title="Restore this version"
                      className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                    >
                      <MdRestore className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(snap.id)}
                      title="Delete this version"
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MdDelete className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Up to 20 versions are kept per set. Older versions are removed
            automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
