'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MdClose,
  MdScience,
  MdAdd,
  MdDelete,
  MdSwapHoriz,
} from 'react-icons/md';
import type {
  ScreenshotSetAbTestRecord,
  ScreenshotSetRecord,
} from '@/types/screenshots';

interface AbTestPanelProps {
  sets: ScreenshotSetRecord[];
  listAbTests: () => Promise<ScreenshotSetAbTestRecord[]>;
  createAbTest: (
    setAId: string,
    setBId: string,
    note?: string
  ) => Promise<ScreenshotSetAbTestRecord | null>;
  deleteAbTest: (testId: string) => Promise<void>;
  onClose: () => void;
}

function SetBadge({
  label,
  name,
  locale,
  theme,
  layout,
  variant,
}: {
  label: 'A' | 'B';
  name: string;
  locale: string;
  theme: string;
  layout: string;
  variant: 'a' | 'b';
}) {
  return (
    <div
      className={`flex-1 rounded-lg border p-3 ${variant === 'a' ? 'border-blue-500/40 bg-blue-500/5' : 'border-purple-500/40 bg-purple-500/5'}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${variant === 'a' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}
        >
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{locale}</span>
      </div>
      <p className="text-sm font-medium truncate">{name}</p>
      <p className="text-xs text-muted-foreground capitalize">
        {layout} · {theme}
      </p>
    </div>
  );
}

export function AbTestPanel({
  sets,
  listAbTests,
  createAbTest,
  deleteAbTest,
  onClose,
}: AbTestPanelProps) {
  const [tests, setTests] = useState<ScreenshotSetAbTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pickedA, setPickedA] = useState('');
  const [pickedB, setPickedB] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listAbTests();
    setTests(data);
    setLoading(false);
  }, [listAbTests]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (testId: string) => {
    setDeletingId(testId);
    await deleteAbTest(testId);
    setTests((prev) => prev.filter((t) => t.id !== testId));
    setDeletingId(null);
  };

  const handleCreate = async () => {
    if (!pickedA || !pickedB || pickedA === pickedB) {
      setError('Select two different sets');
      return;
    }
    setCreating(true);
    setError('');
    const created = await createAbTest(pickedA, pickedB, note);
    if (created) {
      setTests((prev) => [created, ...prev]);
      setShowCreate(false);
      setPickedA('');
      setPickedB('');
      setNote('');
    } else {
      setError('Failed to create A/B test. The pair may already exist.');
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdScience className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">A/B Tests</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCreate((v) => !v);
                setError('');
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <MdAdd className="h-4 w-4" />
              New pairing
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="px-5 py-4 border-b border-border space-y-3 bg-muted/10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              New A/B pairing
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Variant A
                </label>
                <select
                  value={pickedA}
                  onChange={(e) => setPickedA(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                >
                  <option value="">Select set…</option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === pickedB}>
                      {s.name} ({s.locale})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Variant B
                </label>
                <select
                  value={pickedB}
                  onChange={(e) => setPickedB(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
                >
                  <option value="">Select set…</option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === pickedA}>
                      {s.name} ({s.locale})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. New hero vs. Old hero"
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create pairing'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <MdScience className="h-7 w-7 text-muted-foreground animate-pulse" />
            </div>
          )}

          {!loading && tests.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <MdScience className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No A/B pairings yet.
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Link two screenshot sets as A/B variants to track which performs
                better in the App Store.
              </p>
            </div>
          )}

          {tests.map((test) => (
            <div
              key={test.id}
              className="border border-border rounded-xl p-3 space-y-3"
            >
              {test.note && (
                <p className="text-xs font-medium text-muted-foreground">
                  {test.note}
                </p>
              )}

              <div className="flex items-center gap-2">
                <SetBadge
                  label="A"
                  name={test.setA.name}
                  locale={test.setA.locale}
                  theme={test.setA.themeId}
                  layout={test.setA.layoutId}
                  variant="a"
                />
                <MdSwapHoriz className="h-5 w-5 text-muted-foreground shrink-0" />
                <SetBadge
                  label="B"
                  name={test.setB.name}
                  locale={test.setB.locale}
                  theme={test.setB.themeId}
                  layout={test.setB.layoutId}
                  variant="b"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Created{' '}
                  {new Date(test.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <button
                  onClick={() => handleDelete(test.id)}
                  disabled={deletingId === test.id}
                  className="text-xs text-destructive hover:underline flex items-center gap-0.5 disabled:opacity-50"
                >
                  <MdDelete className="h-3.5 w-3.5" />
                  {deletingId === test.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Pairings are informational — track results manually in the App Store
            analytics dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
