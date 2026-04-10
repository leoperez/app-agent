'use client';

import { useState } from 'react';
import { useGetRankingsCompare } from '@/lib/swr/team';
import { useApp } from '@/context/app';
import { MdCompareArrows } from 'react-icons/md';

function PositionBadge({ position }: { position: number | null }) {
  if (position === null)
    return <span className="text-xs text-muted-foreground">—</span>;
  const color =
    position <= 5
      ? 'bg-green-100 text-green-700'
      : position <= 15
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${color}`}>
      #{position}
    </span>
  );
}

export function RankingsCompare() {
  const { apps } = useApp();
  const { compare, loading } = useGetRankingsCompare();
  const [search, setSearch] = useState('');

  if (apps.length < 2) return null;

  const filtered = search.trim()
    ? compare.filter((c) =>
        c.keyword.toLowerCase().includes(search.toLowerCase())
      )
    : compare;

  // Collect all unique app titles from the data
  const allAppIds = Array.from(
    new Set(compare.flatMap((c) => c.apps.map((a) => a.appId)))
  );
  const appTitles = new Map<string, string>();
  for (const entry of compare) {
    for (const a of entry.apps) {
      if (a.appTitle) appTitles.set(a.appId, a.appTitle);
    }
  }

  if (!loading && compare.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MdCompareArrows className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Shared keywords across apps
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Search */}
        <div className="px-4 py-2 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter keywords…"
            className="w-full text-sm outline-none bg-transparent placeholder:text-muted-foreground"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Keyword
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                    Locale
                  </th>
                  {allAppIds.map((id) => (
                    <th
                      key={id}
                      className="text-center px-4 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {appTitles.get(id) ?? id.slice(0, 8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.slice(0, 100).map((entry) => (
                  <tr
                    key={`${entry.keyword}|${entry.locale}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 font-medium">{entry.keyword}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {entry.locale}
                    </td>
                    {allAppIds.map((appId) => {
                      const a = entry.apps.find((x) => x.appId === appId);
                      return (
                        <td key={appId} className="px-4 py-2 text-center">
                          <PositionBadge position={a?.position ?? null} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={allAppIds.length + 2}
                      className="px-4 py-4 text-center text-sm text-muted-foreground"
                    >
                      No shared keywords found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-gray-100">
            Showing 100 of {filtered.length} keywords
          </div>
        )}
      </div>
    </div>
  );
}
