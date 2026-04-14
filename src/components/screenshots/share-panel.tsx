'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MdClose,
  MdShare,
  MdContentCopy,
  MdAdd,
  MdDelete,
  MdCheck,
} from 'react-icons/md';

interface ShareToken {
  id: string;
  token: string;
  label: string;
  expiresAt: string | null;
  createdAt: string;
}

interface SharePanelProps {
  setId: string;
  teamId: string;
  appId: string;
  onClose: () => void;
}

export function SharePanel({ setId, teamId, appId, onClose }: SharePanelProps) {
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState<'never' | '7' | '30'>('never');
  const [copied, setCopied] = useState<string | null>(null);

  const base = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/share`
    );
    if (res.ok) setTokens(await res.json());
    setLoading(false);
  }, [teamId, appId, setId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    const res = await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/share`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          expiresInDays: expiry === 'never' ? null : Number(expiry),
        }),
      }
    );
    if (res.ok) {
      const created = await res.json();
      setTokens((prev) => [created, ...prev]);
      setLabel('');
    }
    setCreating(false);
  };

  const revoke = async (tokenId: string) => {
    await fetch(
      `/api/teams/${teamId}/apps/${appId}/screenshot-sets/${setId}/share/${tokenId}`,
      { method: 'DELETE' }
    );
    setTokens((prev) => prev.filter((t) => t.id !== tokenId));
  };

  const copyLink = async (token: string) => {
    const url = `${base}/preview/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MdShare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Share Preview</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Create new */}
        <div className="px-5 py-4 border-b border-border space-y-3 bg-muted/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            New share link
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='Label (e.g. "For client review")'
              className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            />
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as typeof expiry)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            >
              <option value="never">No expiry</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <MdAdd className="h-3.5 w-3.5" />
            {creating ? 'Creating…' : 'Create link'}
          </button>
        </div>

        {/* Token list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Loading…
            </p>
          )}
          {!loading && tokens.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <MdShare className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                No active share links. Create one above.
              </p>
            </div>
          )}
          {tokens.map((t) => {
            const url = `${base}/preview/${t.token}`;
            const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
            return (
              <div
                key={t.id}
                className={`rounded-lg border p-3 space-y-2 ${expired ? 'opacity-50 border-destructive/30' : 'border-border'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {t.label || 'Untitled link'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {expired
                        ? 'Expired'
                        : t.expiresAt
                          ? `Expires ${new Date(t.expiresAt).toLocaleDateString()}`
                          : 'No expiry'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(t.token)}
                      title="Copy link"
                      className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied === t.token ? (
                        <MdCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <MdContentCopy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => revoke(t.id)}
                      title="Revoke link"
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <MdDelete className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground truncate font-mono bg-muted/20 rounded px-2 py-1">
                  {url}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
