'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  MdAdd,
  MdDelete,
  MdKey,
  MdExpandMore,
  MdExpandLess,
} from 'react-icons/md';
import { useTeam } from '@/context/team';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Store } from '@/types/aso';

interface CredentialEntry {
  id: string;
  name: string;
  store: Store;
  keyId: string | null;
  issuerId: string | null;
  createdAt: string;
  _count: { apps: number };
}

function CredentialRow({
  cred,
  onDelete,
}: {
  cred: CredentialEntry;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <MdKey className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{cred.name}</p>
          <p className="text-xs text-muted-foreground">
            {cred.store === Store.APPSTORE
              ? `Key ID: ${cred.keyId ?? '—'} · Issuer: ${cred.issuerId?.slice(0, 8) ?? '—'}…`
              : 'Google Service Account'}
            {cred._count.apps > 0 && ` · ${cred._count.apps} app(s)`}
          </p>
        </div>
      </div>
      <button
        onClick={() => onDelete(cred.id)}
        disabled={cred._count.apps > 0}
        title={
          cred._count.apps > 0
            ? 'Reassign apps before deleting'
            : 'Delete credential'
        }
        className="text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors shrink-0"
      >
        <MdDelete className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddCredentialForm({
  teamId,
  onCreated,
  onCancel,
}: {
  teamId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [store, setStore] = useState<Store>(Store.APPSTORE);
  const [name, setName] = useState('');
  const [keyId, setKeyId] = useState('');
  const [issuerId, setIssuerId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name, store };
      if (store === Store.APPSTORE) {
        body.privateKey = privateKey;
        body.keyId = keyId;
        body.issuerId = issuerId;
      } else {
        body.serviceAccountKey = serviceAccountKey;
      }
      const res = await fetch(`/api/teams/${teamId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Failed to save');
      }
      toast.success('Credential saved');
      onCreated();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save credential'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-4 rounded-lg border border-border bg-muted/30"
    >
      <div className="flex gap-2">
        {([Store.APPSTORE, Store.GOOGLEPLAY] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStore(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              store === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            {s === Store.APPSTORE ? 'App Store' : 'Google Play'}
          </button>
        ))}
      </div>

      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Label (e.g. Acme Corp – App Store)"
        className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {store === Store.APPSTORE ? (
        <>
          <input
            required
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            placeholder="Key ID"
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
          <input
            required
            value={issuerId}
            onChange={(e) => setIssuerId(e.target.value)}
            placeholder="Issuer ID"
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
          <textarea
            required
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Private key (.p8 contents)"
            rows={4}
            className="w-full text-xs border border-input rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
        </>
      ) : (
        <textarea
          required
          value={serviceAccountKey}
          onChange={(e) => setServiceAccountKey(e.target.value)}
          placeholder='Service account key JSON ({"type":"service_account",...})'
          rows={5}
          className="w-full text-xs border border-input rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring font-mono"
        />
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="text-xs px-4 py-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Save credential'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-4 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function StoreCredentials() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/credentials`);
      if (res.ok) setCredentials(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && teamId) load();
  }, [open, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!teamId) return;
    if (!confirm('Delete this credential?')) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/credentials/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      toast.success('Credential deleted');
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <MdKey className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-semibold">Store credentials</p>
              <p className="text-xs text-muted-foreground">
                Manage multiple App Store Connect and Google Play accounts
              </p>
            </div>
          </div>
          {open ? (
            <MdExpandLess className="h-5 w-5 text-muted-foreground" />
          ) : (
            <MdExpandMore className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Add credentials for each developer account. Each app can use a
            different credential — or fall back to the team-level key configured
            in the key upload section.
          </p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {credentials.map((c) => (
                <CredentialRow key={c.id} cred={c} onDelete={handleDelete} />
              ))}
              {credentials.length === 0 && !showForm && (
                <p className="text-xs text-muted-foreground py-2">
                  No additional credentials yet. The team-level key is used by
                  default.
                </p>
              )}
            </div>
          )}

          {showForm && teamId ? (
            <AddCredentialForm
              teamId={teamId}
              onCreated={() => {
                setShowForm(false);
                load();
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-dashed border-border rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <MdAdd className="h-3.5 w-3.5" />
              Add credential
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
