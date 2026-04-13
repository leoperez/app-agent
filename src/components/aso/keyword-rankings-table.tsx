'use client';

import { useState } from 'react';
import { AsoKeyword } from '@/types/aso';
import KeywordSparkline from './keyword-sparkline';
import {
  MdArrowUpward,
  MdArrowDownward,
  MdRemove,
  MdNotifications,
  MdNotificationsOff,
} from 'react-icons/md';
import { toast } from 'react-hot-toast';

type SortKey = 'keyword' | 'position' | 'velocity' | 'score';
type SortDir = 'asc' | 'desc';

interface RankPoint {
  date: string;
  position: number | null;
}

interface KeywordRankingsTableProps {
  keywords: AsoKeyword[];
  rankings: Record<string, RankPoint[]> | undefined;
  teamId?: string;
  appId?: string;
  locale?: string;
  onKeywordUpdated?: () => void;
}

function computeVelocity(history: RankPoint[] | undefined): number | null {
  if (!history || history.length < 2) return null;
  const recent = history.slice(-7);
  const oldest = recent.find((h) => h.position !== null);
  const newest = [...recent].reverse().find((h) => h.position !== null);
  if (!oldest || !newest || oldest === newest) return null;
  return oldest.position! - newest.position!; // positive = improved
}

function latestPosition(history: RankPoint[] | undefined): number | null {
  if (!history) return null;
  const last = [...history].reverse().find((h) => h.position !== null);
  return last?.position ?? null;
}

function VelocityCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground">—</span>;
  if (delta === 0)
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground">
        <MdRemove className="h-3 w-3" /> 0
      </span>
    );
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-green-600 font-medium">
        <MdArrowUpward className="h-3 w-3" />+{delta}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-red-500 font-medium">
      <MdArrowDownward className="h-3 w-3" />
      {delta}
    </span>
  );
}

export function KeywordRankingsTable({
  keywords,
  rankings,
  teamId,
  appId,
  locale,
  onKeywordUpdated,
}: KeywordRankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');

  const saveThreshold = async (kw: AsoKeyword) => {
    if (!teamId || !appId || !locale) return;
    const val = thresholdInput.trim();
    const threshold = val === '' ? null : parseInt(val, 10);
    if (val !== '' && (isNaN(threshold!) || threshold! < 1)) {
      toast.error('Enter a valid rank (e.g. 10)');
      return;
    }
    try {
      await fetch(
        `/api/teams/${teamId}/apps/${appId}/localizations/${locale}/keyword/${kw.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positionAlertThreshold: threshold }),
        }
      );
      toast.success(
        threshold ? `Alert set: rank >${threshold}` : 'Alert removed'
      );
      onKeywordUpdated?.();
    } catch {
      toast.error('Failed to save alert');
    } finally {
      setEditingThreshold(null);
    }
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const rows = keywords.map((kw) => {
    const history = rankings?.[kw.keyword];
    return {
      kw,
      position: latestPosition(history) ?? kw.position,
      velocity: computeVelocity(history),
      history,
    };
  });

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'keyword') {
      cmp = a.kw.keyword.localeCompare(b.kw.keyword);
    } else if (sortKey === 'position') {
      const ap = a.position ?? 9999;
      const bp = b.position ?? 9999;
      cmp = ap - bp;
    } else if (sortKey === 'velocity') {
      cmp = (b.velocity ?? -9999) - (a.velocity ?? -9999);
    } else if (sortKey === 'score') {
      cmp = (b.kw.overall ?? 0) - (a.kw.overall ?? 0);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? (
      <MdArrowUpward className="inline h-3 w-3 ml-0.5" />
    ) : (
      <MdArrowDownward className="inline h-3 w-3 ml-0.5" />
    );
  }

  if (keywords.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-muted-foreground">
            <th
              className="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground"
              onClick={() => toggleSort('keyword')}
            >
              Keyword <SortIndicator col="keyword" />
            </th>
            <th
              className="text-center px-2 py-2 font-medium cursor-pointer select-none hover:text-foreground"
              onClick={() => toggleSort('position')}
            >
              Rank <SortIndicator col="position" />
            </th>
            <th
              className="text-center px-2 py-2 font-medium cursor-pointer select-none hover:text-foreground"
              onClick={() => toggleSort('velocity')}
            >
              7d <SortIndicator col="velocity" />
            </th>
            <th className="text-center px-2 py-2 font-medium">30d trend</th>
            <th
              className="text-center px-2 py-2 font-medium cursor-pointer select-none hover:text-foreground"
              onClick={() => toggleSort('score')}
            >
              Score <SortIndicator col="score" />
            </th>
            {teamId && (
              <th
                className="text-center px-2 py-2 font-medium"
                title="Alert when rank drops below this position"
              >
                Alert
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ kw, position, velocity, history }) => (
            <tr
              key={kw.keyword}
              className="border-b border-border/40 last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-2 font-medium max-w-[160px] truncate">
                {kw.keyword}
              </td>
              <td className="px-2 py-2 text-center">
                {position !== null && position >= 0 ? (
                  <span className="font-semibold">#{position}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-2 py-2 text-center">
                <VelocityCell delta={velocity} />
              </td>
              <td className="px-2 py-2 flex justify-center">
                {history && history.length >= 2 ? (
                  <KeywordSparkline data={history} width={72} height={24} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              {teamId && (
                <td className="px-2 py-2 text-center">
                  {editingThreshold === kw.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveThreshold(kw);
                      }}
                      className="flex items-center gap-1 justify-center"
                    >
                      <input
                        autoFocus
                        type="number"
                        min={1}
                        placeholder="rank"
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                        className="w-14 rounded border border-input bg-background px-1 py-0.5 text-xs text-center"
                        onKeyDown={(e) =>
                          e.key === 'Escape' && setEditingThreshold(null)
                        }
                      />
                      <button type="submit" className="text-primary text-xs">
                        ✓
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingThreshold(kw.id);
                        setThresholdInput(
                          kw.positionAlertThreshold?.toString() ?? ''
                        );
                      }}
                      title={
                        kw.positionAlertThreshold
                          ? `Alert if rank >${kw.positionAlertThreshold}`
                          : 'Set position alert'
                      }
                      className="flex items-center justify-center w-full"
                    >
                      {kw.positionAlertThreshold ? (
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                          <MdNotifications className="h-3 w-3" />
                          {kw.positionAlertThreshold}
                        </span>
                      ) : (
                        <MdNotificationsOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  )}
                </td>
              )}
              <td className="px-2 py-2 text-center">
                {kw.overall !== null ? (
                  <span
                    className={`font-semibold ${
                      kw.overall >= 7
                        ? 'text-green-600'
                        : kw.overall >= 4
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {kw.overall}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
