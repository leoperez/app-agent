'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MdAdd,
  MdDelete,
  MdPlayArrow,
  MdStop,
  MdCheck,
  MdOpenInNew,
  MdScience,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGetExperiments, StoreExperiment } from '@/lib/swr/app';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';
import { Badge } from '@/components/ui/badge';

const FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'shortDescription', label: 'Short description' },
  { value: 'fullDescription', label: 'Full description' },
  { value: 'icon', label: 'Icon' },
  { value: 'screenshots', label: 'Screenshots' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  running: { label: 'Running', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-500' },
};

function ExperimentCard({
  exp,
  teamId,
  appId,
  onUpdated,
  onDeleted,
}: {
  exp: StoreExperiment;
  teamId: string;
  appId: string;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const patch = async (data: Partial<StoreExperiment>) => {
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamId}/apps/${appId}/experiments/${exp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onUpdated();
    } catch {
      toast.error('Failed to update experiment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete experiment "${exp.name}"?`)) return;
    try {
      await fetch(`/api/teams/${teamId}/apps/${appId}/experiments/${exp.id}`, {
        method: 'DELETE',
      });
      onDeleted();
    } catch {
      toast.error('Failed to delete experiment');
    }
  };

  const badge = STATUS_BADGE[exp.status] ?? STATUS_BADGE.draft;
  const field = FIELDS.find((f) => f.value === exp.field)?.label ?? exp.field;

  const daysRunning =
    exp.status === 'running' && exp.startedAt
      ? Math.floor(
          (Date.now() - new Date(exp.startedAt).getTime()) / 86_400_000
        )
      : null;
  const isStale = daysRunning !== null && daysRunning > 30;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${isStale ? 'border-amber-400 dark:border-amber-600' : 'border-border'}`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MdScience className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{exp.name}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}
          >
            {badge.label}
          </span>
          {daysRunning !== null && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                isStale
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isStale ? '⚠ ' : ''}
              {daysRunning}d running
            </span>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {field}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {exp.status === 'draft' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                patch({ status: 'running' });
              }}
              disabled={saving}
              className="text-blue-500 hover:text-blue-700"
              title="Start experiment"
            >
              <MdPlayArrow className="h-4 w-4" />
            </button>
          )}
          {exp.status === 'running' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  patch({ status: 'completed', winner: 'B' });
                }}
                disabled={saving}
                className="text-green-500 hover:text-green-700"
                title="Mark B as winner"
              >
                <MdCheck className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  patch({ status: 'cancelled' });
                }}
                disabled={saving}
                className="text-red-400 hover:text-red-600"
                title="Cancel experiment"
              >
                <MdStop className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="text-muted-foreground hover:text-red-500"
          >
            <MdDelete className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3 space-y-3 text-sm">
              {exp.hypothesis && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    Hypothesis
                  </p>
                  <p className="text-xs">{exp.hypothesis}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    Variant A (control)
                  </p>
                  <p className="text-xs bg-muted/50 rounded p-2 min-h-[2rem]">
                    {exp.variantA || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    Variant B (challenger)
                  </p>
                  <p className="text-xs bg-muted/50 rounded p-2 min-h-[2rem]">
                    {exp.variantB || '—'}
                  </p>
                </div>
              </div>
              {exp.winner && (
                <p className="text-xs font-semibold text-green-600">
                  Winner: Variant {exp.winner}
                </p>
              )}
              {exp.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    Notes
                  </p>
                  <p className="text-xs">{exp.notes}</p>
                </div>
              )}
              {exp.startedAt && (
                <p className="text-xs text-muted-foreground">
                  Started {new Date(exp.startedAt).toLocaleDateString()}
                  {exp.endedAt &&
                    ` · Ended ${new Date(exp.endedAt).toLocaleDateString()}`}
                  {daysRunning !== null && ` · ${daysRunning} days running`}
                </p>
              )}
              {isStale && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  This experiment has been running for over 30 days without a
                  conclusion — consider wrapping it up.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StoreExperiments() {
  const teamInfo = useTeam();
  const appInfo = useApp();
  const teamId = teamInfo?.currentTeam?.id ?? '';
  const appId = appInfo?.currentApp?.id ?? '';

  const { experiments, loading, mutate } = useGetExperiments(teamId, appId);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    hypothesis: '',
    field: 'title',
    variantA: '',
    variantB: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/teams/${teamId}/apps/${appId}/experiments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Experiment created');
      setForm({
        name: '',
        hypothesis: '',
        field: 'title',
        variantA: '',
        variantB: '',
      });
      setCreating(false);
      mutate();
    } catch {
      toast.error('Failed to create experiment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Store Listing Experiments</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track A/B tests for your store listing.{' '}
            <a
              href="https://support.google.com/googleplay/android-developer/answer/6227309"
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex items-center gap-0.5"
            >
              Run in Play Console <MdOpenInNew className="h-3 w-3" />
            </a>
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCreating(true)}
          className="text-xs"
        >
          <MdAdd className="h-3.5 w-3.5 mr-1" />
          New experiment
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 border border-border rounded-lg p-3"
          >
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Experiment name"
              className="text-sm h-8"
              autoFocus
            />
            <Textarea
              value={form.hypothesis}
              onChange={(e) =>
                setForm((f) => ({ ...f, hypothesis: e.target.value }))
              }
              placeholder="Hypothesis (optional)"
              rows={2}
              className="text-sm resize-none"
            />
            <select
              value={form.field}
              onChange={(e) =>
                setForm((f) => ({ ...f, field: e.target.value }))
              }
              className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background"
            >
              {FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Textarea
                value={form.variantA}
                onChange={(e) =>
                  setForm((f) => ({ ...f, variantA: e.target.value }))
                }
                placeholder="Variant A (current)"
                rows={2}
                className="text-xs resize-none"
              />
              <Textarea
                value={form.variantB}
                onChange={(e) =>
                  setForm((f) => ({ ...f, variantB: e.target.value }))
                }
                placeholder="Variant B (challenger)"
                rows={2}
                className="text-xs resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs h-7"
                onClick={handleCreate}
                disabled={submitting || !form.name.trim()}
              >
                Create
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : experiments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No experiments yet. Create one to track your A/B tests.
        </p>
      ) : (
        <div className="space-y-2">
          {experiments.map((exp) => (
            <ExperimentCard
              key={exp.id}
              exp={exp}
              teamId={teamId}
              appId={appId}
              onUpdated={mutate}
              onDeleted={mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
