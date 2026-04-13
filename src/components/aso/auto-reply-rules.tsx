'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MdAutoAwesome, MdDelete, MdAdd } from 'react-icons/md';
import { useTeam } from '@/context/team';
import { useGetAutoReplyRules, AutoReplyRule } from '@/lib/swr/team';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { useGetApps } from '@/lib/swr/app';

interface ReviewTemplate {
  id: string;
  name: string;
  body: string;
}

function StarRange({ min, max }: { min: number; max: number }) {
  return (
    <span className="text-amber-500 text-xs font-mono">
      {'★'.repeat(min)}
      {min !== max && `–${'★'.repeat(max)}`}
    </span>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutoReplyRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <StarRange min={rule.minRating} max={rule.maxRating} />
        <div className="min-w-0">
          <p className="font-medium truncate">{rule.template.name}</p>
          {rule.app && (
            <p className="text-xs text-muted-foreground truncate">
              {rule.app.title ?? rule.app.id}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(rule.id, !rule.enabled)}
          role="switch"
          aria-checked={rule.enabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            rule.enabled ? 'bg-primary' : 'bg-input'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              rule.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="text-muted-foreground hover:text-red-500 transition-colors"
        >
          <MdDelete className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AutoReplyRules() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id ?? '';
  const { rules, loading, mutate } = useGetAutoReplyRules();
  const { apps } = useGetApps();

  const { data: templates } = useSWR<ReviewTemplate[]>(
    teamId ? `/api/teams/${teamId}/review-templates` : null,
    fetcher
  );

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    minRating: 5,
    maxRating: 5,
    templateId: '',
    appId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.templateId) return;
    setSubmitting(true);
    try {
      await fetch(`/api/teams/${teamId}/auto-reply-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minRating: form.minRating,
          maxRating: form.maxRating,
          templateId: form.templateId,
          appId: form.appId || null,
        }),
      });
      toast.success('Rule created');
      setCreating(false);
      setForm({ minRating: 5, maxRating: 5, templateId: '', appId: '' });
      mutate();
    } catch {
      toast.error('Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/teams/${teamId}/auto-reply-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this auto-reply rule?')) return;
    await fetch(`/api/teams/${teamId}/auto-reply-rules/${id}`, {
      method: 'DELETE',
    });
    toast.success('Rule deleted');
    mutate();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MdAutoAwesome className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Auto-reply rules</h3>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <MdAdd className="h-4 w-4" />
          New rule
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Automatically reply to new reviews that match a star rating range using
        a saved template. Replies are sent during the nightly review sync.
      </p>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
              {/* Rating range */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium w-20 shrink-0">
                  Rating
                </label>
                <select
                  value={form.minRating}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minRating: Number(e.target.value),
                      maxRating: Math.max(Number(e.target.value), f.maxRating),
                    }))
                  }
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}★
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">to</span>
                <select
                  value={form.maxRating}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxRating: Number(e.target.value),
                    }))
                  }
                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5]
                    .filter((n) => n >= form.minRating)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}★
                      </option>
                    ))}
                </select>
              </div>

              {/* Template */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium w-20 shrink-0">
                  Template
                </label>
                <select
                  value={form.templateId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, templateId: e.target.value }))
                  }
                  className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="">Select a template…</option>
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* App (optional) */}
              {(apps ?? []).length > 1 && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium w-20 shrink-0">
                    App
                  </label>
                  <select
                    value={form.appId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, appId: e.target.value }))
                    }
                    className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="">All apps</option>
                    {(apps ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!form.templateId || submitting}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {submitting ? 'Creating…' : 'Create rule'}
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No auto-reply rules yet. Create one to start automatically responding
          to reviews.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
