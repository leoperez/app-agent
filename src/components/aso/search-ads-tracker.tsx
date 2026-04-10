'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  MdExpandMore,
  MdExpandLess,
  MdAdd,
  MdDelete,
  MdBarChart,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app';
import { useTeam } from '@/context/team';
import { useGetSearchAdsMetrics, SearchAdsMetricEntry } from '@/lib/swr/app';

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtSpend(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

interface AddFormProps {
  keywords: string[];
  onAdd: (
    entry: Omit<SearchAdsMetricEntry, 'id' | 'appId' | 'ttr' | 'cr'>
  ) => Promise<void>;
  onCancel: () => void;
}

function AddEntryForm({ keywords, onAdd, onCancel }: AddFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [keyword, setKeyword] = useState('');
  const [date, setDate] = useState(today);
  const [impressions, setImpressions] = useState('');
  const [taps, setTaps] = useState('');
  const [installs, setInstalls] = useState('');
  const [spend, setSpend] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!keyword.trim() || !date) return;
    setSaving(true);
    try {
      await onAdd({
        keyword: keyword.trim(),
        date,
        impressions: parseInt(impressions) || 0,
        taps: parseInt(taps) || 0,
        installs: parseInt(installs) || 0,
        spend: parseFloat(spend) || 0,
        currency,
      });
      toast.success('Entry saved');
      onCancel();
    } catch {
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Keyword
          </label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. photo editor"
            className="h-7 text-xs"
            list="keyword-suggestions"
            autoFocus
          />
          {keywords.length > 0 && (
            <datalist id="keyword-suggestions">
              {keywords.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Impressions
          </label>
          <Input
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
            placeholder="0"
            className="h-7 text-xs"
            type="number"
            min="0"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Taps
          </label>
          <Input
            value={taps}
            onChange={(e) => setTaps(e.target.value)}
            placeholder="0"
            className="h-7 text-xs"
            type="number"
            min="0"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Installs
          </label>
          <Input
            value={installs}
            onChange={(e) => setInstalls(e.target.value)}
            placeholder="0"
            className="h-7 text-xs"
            type="number"
            min="0"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Spend
          </label>
          <Input
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            placeholder="0.00"
            className="h-7 text-xs"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-7 text-xs border border-input rounded-md px-2 bg-background"
          >
            {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-7 text-xs px-3"
          onClick={handleSubmit}
          disabled={saving || !keyword.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-3"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ metrics }: { metrics: SearchAdsMetricEntry[] }) {
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      taps: acc.taps + m.taps,
      installs: acc.installs + m.installs,
      spend: acc.spend + m.spend,
    }),
    { impressions: 0, taps: 0, installs: 0, spend: 0 }
  );
  const ttr =
    totals.impressions > 0
      ? ((totals.taps / totals.impressions) * 100).toFixed(1)
      : '—';
  const cr =
    totals.taps > 0 ? ((totals.installs / totals.taps) * 100).toFixed(1) : '—';
  const currency = metrics[0]?.currency ?? 'USD';

  return (
    <div className="grid grid-cols-6 gap-2 px-2 py-2 rounded-md bg-muted/40 text-xs">
      <div>
        <p className="text-muted-foreground">Impressions</p>
        <p className="font-semibold">{fmt(totals.impressions)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Taps</p>
        <p className="font-semibold">{fmt(totals.taps)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">TTR</p>
        <p className="font-semibold">
          {ttr}
          {ttr !== '—' ? '%' : ''}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Installs</p>
        <p className="font-semibold">{fmt(totals.installs)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Conv. Rate</p>
        <p className="font-semibold">
          {cr}
          {cr !== '—' ? '%' : ''}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Spend</p>
        <p className="font-semibold">{fmtSpend(totals.spend, currency)}</p>
      </div>
    </div>
  );
}

export function SearchAdsTracker() {
  const appInfo = useApp();
  const teamInfo = useTeam();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const { metrics, loading, addMetric, deleteMetric } = useGetSearchAdsMetrics(
    teamInfo?.currentTeam?.id ?? '',
    appInfo?.currentApp?.id ?? ''
  );

  // Unique tracked keywords for autocomplete
  const trackedKeywords = Array.from(new Set(metrics.map((m) => m.keyword)));

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MdBarChart className="h-4 w-4" />
          <span>Search Ads Tracker</span>
          {metrics.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {metrics.length} {metrics.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
        {open ? (
          <MdExpandLess className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MdExpandMore className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
              <p className="text-xs text-muted-foreground">
                Manually log Apple Search Ads or Google UAC campaign metrics per
                keyword and date.
              </p>

              {/* Summary */}
              {metrics.length > 0 && <SummaryRow metrics={metrics} />}

              {/* Add form */}
              <AnimatePresence>
                {showAdd && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AddEntryForm
                      keywords={trackedKeywords}
                      onAdd={addMetric}
                      onCancel={() => setShowAdd(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {!showAdd && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  <MdAdd className="h-3.5 w-3.5" />
                  Add entry
                </button>
              )}

              {/* Metrics table */}
              {loading && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {!loading && metrics.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No data yet. Add your first Search Ads entry above.
                </p>
              )}
              {!loading && metrics.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-1.5 pr-3 font-medium">Date</th>
                        <th className="pb-1.5 pr-3 font-medium">Keyword</th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          Impr.
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          Taps
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          TTR
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          Installs
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          CR
                        </th>
                        <th className="pb-1.5 font-medium text-right">Spend</th>
                        <th className="pb-1.5 w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-1.5 pr-3 text-muted-foreground">
                            {m.date}
                          </td>
                          <td className="py-1.5 pr-3 font-medium max-w-[120px] truncate">
                            {m.keyword}
                          </td>
                          <td className="py-1.5 pr-3 text-right">
                            {fmt(m.impressions)}
                          </td>
                          <td className="py-1.5 pr-3 text-right">
                            {fmt(m.taps)}
                          </td>
                          <td className="py-1.5 pr-3 text-right">
                            {m.ttr !== null ? `${m.ttr}%` : '—'}
                          </td>
                          <td className="py-1.5 pr-3 text-right">
                            {fmt(m.installs)}
                          </td>
                          <td className="py-1.5 pr-3 text-right">
                            {m.cr !== null ? `${m.cr}%` : '—'}
                          </td>
                          <td className="py-1.5 text-right">
                            {fmtSpend(m.spend, m.currency)}
                          </td>
                          <td className="py-1.5 pl-2">
                            <button
                              onClick={() => deleteMetric(m.id)}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <MdDelete className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
