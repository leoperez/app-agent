'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MdAdd,
  MdDelete,
  MdOpenInNew,
  MdEdit,
  MdCheck,
  MdClose,
} from 'react-icons/md';
import { SiApple } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGetCustomProductPages, CustomProductPage } from '@/lib/swr/app';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';

const PROMOTIONAL_TEXT_LIMIT = 170;

interface PageLocalization {
  id: string;
  locale: string;
  promotionalText: string | null;
}

function LocalizationRow({
  loc,
  teamId,
  appId,
  pageId,
  versionId,
  onSaved,
}: {
  loc: PageLocalization;
  teamId: string;
  appId: string;
  pageId: string;
  versionId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(loc.promotionalText ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(
        `/api/teams/${teamId}/apps/${appId}/custom-product-pages/${pageId}/localizations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId,
            locale: loc.locale,
            promotionalText: value,
            localizationId: loc.id !== 'new' ? loc.id : undefined,
          }),
        }
      );
      toast.success('Saved');
      setEditing(false);
      onSaved();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {loc.locale}
        </span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdEdit className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-1.5">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={PROMOTIONAL_TEXT_LIMIT}
            className="text-xs resize-none"
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${value.length > PROMOTIONAL_TEXT_LIMIT ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              {value.length}/{PROMOTIONAL_TEXT_LIMIT}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => setEditing(false)}
              >
                <MdClose className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={save}
                disabled={saving}
              >
                <MdCheck className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {loc.promotionalText || <em>No promotional text</em>}
        </p>
      )}
    </div>
  );
}

function PageCard({
  page,
  teamId,
  appId,
  onDelete,
}: {
  page: CustomProductPage;
  teamId: string;
  appId: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localizations, setLocalizations] = useState<PageLocalization[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadLocalizations = async () => {
    if (!page.versionId || localizations.length > 0) return;
    setLoadingLocs(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/custom-product-pages/${page.id}/localizations?versionId=${page.versionId}`
      );
      const data = await res.json();
      setLocalizations(data);
    } catch {
      toast.error('Failed to load localizations');
    } finally {
      setLoadingLocs(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadLocalizations();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete page "${page.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(
        `/api/teams/${teamId}/apps/${appId}/custom-product-pages/${page.id}`,
        { method: 'DELETE' }
      );
      onDelete();
    } catch {
      toast.error('Failed to delete page');
      setDeleting(false);
    }
  };

  const stateColor: Record<string, string> = {
    PREPARE_FOR_SUBMISSION: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    READY_FOR_REVIEW: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SiApple className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{page.name}</span>
          {page.versionState && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${stateColor[page.versionState] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {page.versionState.replace(/_/g, ' ').toLowerCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {page.url && (
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground"
            >
              <MdOpenInNew className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleting}
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
            <div className="border-t border-border px-4 py-3 space-y-3">
              {!page.versionId && (
                <p className="text-xs text-muted-foreground italic">
                  No draft version yet. Submit this page through App Store
                  Connect to edit localizations.
                </p>
              )}
              {loadingLocs && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {!loadingLocs && localizations.length === 0 && page.versionId && (
                <p className="text-xs text-muted-foreground italic">
                  No localizations yet. Add promotional text per locale below.
                </p>
              )}
              {localizations.map((loc) => (
                <LocalizationRow
                  key={loc.id}
                  loc={loc}
                  teamId={teamId}
                  appId={appId}
                  pageId={page.id}
                  versionId={page.versionId!}
                  onSaved={() => loadLocalizations()}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CustomProductPages() {
  const teamInfo = useTeam();
  const appInfo = useApp();
  const teamId = teamInfo?.currentTeam?.id ?? '';
  const appId = appInfo?.currentApp?.id ?? '';

  const { pages, loading, mutate } = useGetCustomProductPages(teamId, appId);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/teams/${teamId}/apps/${appId}/custom-product-pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      toast.success('Custom product page created');
      setNewName('');
      setCreating(false);
      mutate();
    } catch {
      toast.error('Failed to create page');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Custom Product Pages</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Up to 35 pages with different promotional text per locale
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCreating(true)}
          className="text-xs"
        >
          <MdAdd className="h-3.5 w-3.5 mr-1" />
          New page
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Page name (e.g. Holiday Campaign)"
              className="text-sm h-8"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleCreate}
              disabled={submitting || !newName.trim()}
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => {
                setCreating(false);
                setNewName('');
              }}
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No custom product pages yet.{' '}
          <a
            href="https://developer.apple.com/app-store/custom-product-pages/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Learn more
          </a>
        </p>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              teamId={teamId}
              appId={appId}
              onDelete={mutate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
