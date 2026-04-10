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
  MdFilterAlt,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/app';
import { useTeam } from '@/context/team';
import { useGetSearchAdsMetrics, SearchAdsMetricEntry } from '@/lib/swr/app';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('search-ads-tracker');
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
      toast.success(t('saved'));
      onCancel();
    } catch {
      toast.error(t('save-failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {t('keyword')}
          </label>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('keyword-placeholder')}
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
            {t('date')}
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
            {t('impressions')}
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
            {t('taps')}
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
            {t('installs')}
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
            {t('spend')}
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
            {t('currency')}
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
          {saving ? t('saving') : t('save')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-3"
          onClick={onCancel}
        >
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ metrics }: { metrics: SearchAdsMetricEntry[] }) {
  const t = useTranslations('search-ads-tracker');
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
        <p className="text-muted-foreground">{t('impressions')}</p>
        <p className="font-semibold">{fmt(totals.impressions)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">{t('taps')}</p>
        <p className="font-semibold">{fmt(totals.taps)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">{t('ttr')}</p>
        <p className="font-semibold">
          {ttr}
          {ttr !== '—' ? '%' : ''}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">{t('installs')}</p>
        <p className="font-semibold">{fmt(totals.installs)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">{t('conv-rate')}</p>
        <p className="font-semibold">
          {cr}
          {cr !== '—' ? '%' : ''}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">{t('spend')}</p>
        <p className="font-semibold">{fmtSpend(totals.spend, currency)}</p>
      </div>
    </div>
  );
}

export function SearchAdsTracker() {
  const t = useTranslations('search-ads-tracker');
  const appInfo = useApp();
  const teamInfo = useTeam();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { metrics, loading, addMetric, deleteMetric } = useGetSearchAdsMetrics(
    teamInfo?.currentTeam?.id ?? '',
    appInfo?.currentApp?.id ?? ''
  );

  // Apply date range filter
  const filtered = metrics.filter((m) => {
    if (filterFrom && m.date < filterFrom) return false;
    if (filterTo && m.date > filterTo) return false;
    return true;
  });

  const hasFilter = filterFrom || filterTo;

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
          <span>{t('title')}</span>
          {metrics.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {metrics.length}
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
                {t('description')}
              </p>

              {/* Date range filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <MdFilterAlt className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    {t('filter-from')}
                  </label>
                  <Input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className="h-6 text-xs w-32"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    {t('filter-to')}
                  </label>
                  <Input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className="h-6 text-xs w-32"
                  />
                </div>
                {hasFilter && (
                  <button
                    onClick={() => {
                      setFilterFrom('');
                      setFilterTo('');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    {t('clear-filter')}
                  </button>
                )}
              </div>

              {/* Summary */}
              {filtered.length > 0 && <SummaryRow metrics={filtered} />}

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
                  {t('add-entry')}
                </button>
              )}

              {/* Metrics table */}
              {loading && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {!loading && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  {t('no-data')}
                </p>
              )}
              {!loading && filtered.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-1.5 pr-3 font-medium">{t('date')}</th>
                        <th className="pb-1.5 pr-3 font-medium">
                          {t('keyword')}
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          {t('impressions')}
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          {t('taps')}
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          {t('ttr')}
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          {t('installs')}
                        </th>
                        <th className="pb-1.5 pr-3 font-medium text-right">
                          {t('conv-rate')}
                        </th>
                        <th className="pb-1.5 font-medium text-right">
                          {t('spend')}
                        </th>
                        <th className="pb-1.5 w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((m) => (
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
