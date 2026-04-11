'use client';

import { MdReply } from 'react-icons/md';
import { useGetStoreReviews } from '@/lib/swr/app';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';

function RateBar({
  label,
  replied,
  total,
}: {
  label: string;
  replied: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((replied / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-5 text-right text-muted-foreground shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 text-muted-foreground shrink-0">
        {replied}/{total} ({pct}%)
      </span>
    </div>
  );
}

export function ReviewReplyStats() {
  const teamInfo = useTeam();
  const appInfo = useApp();
  const { reviews, loading } = useGetStoreReviews(
    teamInfo?.currentTeam?.id ?? '',
    appInfo?.currentApp?.id ?? ''
  );

  if (loading || reviews.length === 0) return null;

  const total = reviews.length;
  const replied = reviews.filter((r) => !!r.responseBody).length;
  const replyRate = Math.round((replied / total) * 100);

  // Per-star breakdown
  const byRating = [5, 4, 3, 2, 1].map((star) => {
    const forStar = reviews.filter((r) => r.rating === star);
    const repliedForStar = forStar.filter((r) => !!r.responseBody).length;
    return { star, total: forStar.length, replied: repliedForStar };
  });

  const rateColor =
    replyRate >= 80
      ? 'text-green-600 dark:text-green-400'
      : replyRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <MdReply className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Review reply rate
        </h3>
        <span className={`text-lg font-bold tabular-nums ${rateColor}`}>
          {replyRate}%
        </span>
        <span className="text-xs text-muted-foreground">
          {replied} of {total} replied
        </span>
      </div>
      <div className="p-4 space-y-2">
        {byRating.map(({ star, total: t, replied: r }) => (
          <RateBar key={star} label={`${star}★`} replied={r} total={t} />
        ))}
      </div>
    </div>
  );
}
