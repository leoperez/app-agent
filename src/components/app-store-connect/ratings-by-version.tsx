'use client';

import { useTeam } from '@/context/team';
import { useGetRatingsByVersion, RatingByVersion } from '@/lib/swr/app';
import { useApp } from '@/context/app';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTranslations } from 'next-intl';
import { MdStar, MdStarBorder } from 'react-icons/md';

function StarBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-gray-400">—</span>;
  const full = Math.floor(value);
  const partial = value - full;
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((s) => {
        if (s <= full) return <MdStar key={s} className="w-3.5 h-3.5" />;
        if (s === full + 1 && partial >= 0.5)
          return <MdStar key={s} className="w-3.5 h-3.5 opacity-60" />;
        return <MdStarBorder key={s} className="w-3.5 h-3.5" />;
      })}
      <span className="ml-1 text-xs font-medium text-gray-700 dark:text-gray-300">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

function Histogram({ data }: { data: number[] | null }) {
  if (!data || data.every((v) => v === 0)) return null;
  const total = data.reduce((a, b) => a + b, 0);
  const COLORS = [
    'bg-red-400',
    'bg-orange-400',
    'bg-yellow-400',
    'bg-lime-400',
    'bg-green-400',
  ];
  return (
    <div className="space-y-0.5 min-w-[100px]">
      {[4, 3, 2, 1, 0].map((i) => {
        const pct = total > 0 ? (data[i] / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-1">
            <span className="text-[10px] w-2 text-gray-400">{i + 1}</span>
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${COLORS[i]}`}
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VersionRow({ row }: { row: RatingByVersion }) {
  const date = new Date(row.releasedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <tr className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="py-3 px-4">
        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
          v{row.version}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
        {date}
      </td>
      <td className="py-3 px-4">
        <StarBar value={row.rating} />
      </td>
      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
        {row.ratingCount != null ? row.ratingCount.toLocaleString() : '—'}
      </td>
      <td className="py-3 px-4">
        <Histogram data={row.histogram} />
      </td>
    </tr>
  );
}

export function RatingsByVersion() {
  const teamInfo = useTeam();
  const { currentApp } = useApp();
  const teamId = teamInfo?.currentTeam?.id ?? '';
  const appId = currentApp?.id ?? '';

  const { data, loading } = useGetRatingsByVersion(teamId, appId);
  const t = useTranslations('ratings-by-version');

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <Skeleton height={20} width={200} className="mb-4" />
        <Skeleton height={40} count={5} className="mb-1" />
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('subtitle')}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th className="py-2 px-4 text-left font-medium">
                {t('col-version')}
              </th>
              <th className="py-2 px-4 text-left font-medium">
                {t('col-released')}
              </th>
              <th className="py-2 px-4 text-left font-medium">
                {t('col-rating')}
              </th>
              <th className="py-2 px-4 text-left font-medium">
                {t('col-count')}
              </th>
              <th className="py-2 px-4 text-left font-medium">
                {t('col-breakdown')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <VersionRow key={`${row.version}-${row.releasedAt}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
