'use client';

import { useGetTeamOverview } from '@/lib/swr/team';
import { useApp } from '@/context/app';
import { AppOverviewEntry } from '@/app/api/teams/[teamId]/overview/route';
import {
  MdTrendingUp,
  MdTrendingDown,
  MdTrendingFlat,
  MdStar,
  MdSearch,
  MdSchedule,
  MdWarning,
  MdMarkEmailUnread,
} from 'react-icons/md';
import { SiApple, SiGoogleplay } from 'react-icons/si';
import Image from 'next/image';

function Trend({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta > 0)
    return (
      <span className="flex items-center text-green-600 text-xs font-medium">
        <MdTrendingUp className="h-3.5 w-3.5 mr-0.5" />+{delta.toFixed(2)}
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center text-red-500 text-xs font-medium">
        <MdTrendingDown className="h-3.5 w-3.5 mr-0.5" />
        {delta.toFixed(2)}
      </span>
    );
  return (
    <span className="flex items-center text-muted-foreground text-xs">
      <MdTrendingFlat className="h-3.5 w-3.5 mr-0.5" />0
    </span>
  );
}

function AppCard({
  entry,
  onSelect,
}: {
  entry: AppOverviewEntry;
  onSelect: () => void;
}) {
  const isGPlay = entry.store === 'GOOGLEPLAY';

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-sm transition-all space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {entry.iconUrl ? (
          <Image
            src={entry.iconUrl}
            alt={entry.title ?? ''}
            width={40}
            height={40}
            className="rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {isGPlay ? (
              <SiGoogleplay className="h-5 w-5 text-green-600" />
            ) : (
              <SiApple className="h-5 w-5 text-foreground/70" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.title ?? '—'}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {isGPlay ? (
              <SiGoogleplay className="h-3 w-3 text-green-600" />
            ) : (
              <SiApple className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {isGPlay ? 'Google Play' : 'App Store'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {entry.pendingSchedule && (
            <span title="Scheduled publish pending">
              <MdSchedule className="h-4 w-4 text-amber-500" />
            </span>
          )}
          <span
            title={`ASO Health Score: ${entry.healthScore}/100`}
            className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              entry.healthScore >= 75
                ? 'bg-green-100 text-green-700'
                : entry.healthScore >= 50
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-600'
            }`}
          >
            {entry.healthScore}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Rating */}
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Rating</p>
          <div className="flex items-center justify-center gap-1">
            <MdStar className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-sm font-semibold">
              {entry.latestRating != null ? entry.latestRating.toFixed(1) : '—'}
            </span>
          </div>
          <Trend delta={entry.ratingTrend} />
        </div>

        {/* Avg position */}
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Avg rank</p>
          <div className="flex items-center justify-center gap-1">
            <MdSearch className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm font-semibold">
              {entry.avgKeywordPosition != null
                ? `#${entry.avgKeywordPosition}`
                : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">&nbsp;</p>
        </div>

        {/* Keywords */}
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Keywords</p>
          <span className="text-sm font-semibold">{entry.keywordCount}</span>
          <p className="text-xs text-muted-foreground">
            {entry.top10Keywords > 0
              ? `${entry.top10Keywords} top-10`
              : '\u00a0'}
          </p>
        </div>
      </div>

      {/* Alerts row */}
      {(entry.recentNegativeReviews > 0 || entry.unrepliedReviews > 0) && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          {entry.recentNegativeReviews > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-red-500">
              <MdWarning className="h-3 w-3" />
              {entry.recentNegativeReviews} negative
            </span>
          )}
          {entry.unrepliedReviews > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
              <MdMarkEmailUnread className="h-3 w-3" />
              {entry.unrepliedReviews} unreplied
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export function GlobalOverview() {
  const { overview, loading } = useGetTeamOverview();
  const { apps, setCurrentApp } = useApp();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 bg-card border border-border rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (overview.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        All apps — overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {overview.map((entry) => {
          const app = apps.find((a) => a.id === entry.id);
          return (
            <AppCard
              key={entry.id}
              entry={entry}
              onSelect={() => app && setCurrentApp(app)}
            />
          );
        })}
      </div>
    </div>
  );
}
