'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdExpandMore,
  MdExpandLess,
  MdSchedule,
  MdCheckCircle,
  MdError,
  MdRefresh,
} from 'react-icons/md';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { useTeam } from '@/context/team';

interface CronLog {
  id: string;
  cronName: string;
  status: 'success' | 'error';
  recordsProcessed: number;
  durationMs: number;
  errorMessage: string | null;
  runAt: string;
}

interface CronStatusResponse {
  latest: { name: string; log: CronLog | null }[];
  recent: CronLog[];
}

const CRON_LABELS: Record<string, string> = {
  'keyword-rankings': 'Keyword Rankings',
  'competitor-changes': 'Competitor Changes',
  analytics: 'Analytics',
  'keyword-rescore': 'Keyword Rescore',
  'rating-monitor': 'Rating Monitor',
  'review-sync': 'Review Sync',
  'scheduled-publish': 'Scheduled Publish',
  'data-retention': 'Data Retention',
  'weekly-digest': 'Weekly Digest',
};

const CRON_SCHEDULES: Record<string, string> = {
  'keyword-rankings': 'Daily 6am',
  'competitor-changes': 'Daily 7am',
  analytics: 'Daily 8am',
  'keyword-rescore': 'Weekly Sun 9am',
  'rating-monitor': 'Daily 10am',
  'review-sync': 'Daily 11am',
  'scheduled-publish': 'Every hour',
  'data-retention': 'Weekly Sun 3am',
  'weekly-digest': 'Weekly Mon 8am',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function CronStatus() {
  const teamInfo = useTeam();
  const [open, setOpen] = useState(false);
  const { data, isLoading, mutate } = useSWR<CronStatusResponse>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/cron-logs`
      : null,
    fetcher,
    { dedupingInterval: 60000 }
  );

  const allNeverRan = !data || data.latest.every((e) => !e.log);

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MdSchedule className="h-4 w-4" />
          <span>Cron status</span>
          {data && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {data.latest.filter((e) => e.log?.status === 'error').length > 0
                ? `${data.latest.filter((e) => e.log?.status === 'error').length} error(s)`
                : `${data.latest.filter((e) => e.log).length} tracked`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              mutate();
            }}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Refresh"
          >
            <MdRefresh className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {open ? (
            <MdExpandLess className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MdExpandMore className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
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
            <div className="border-t border-border px-3 pb-3 pt-2 space-y-1">
              {isLoading && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
              {!isLoading && allNeverRan && (
                <p className="text-xs text-muted-foreground italic">
                  No cron runs recorded yet. Logs appear after the first run.
                </p>
              )}
              {!isLoading &&
                data?.latest.map(({ name, log }) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {log?.status === 'error' ? (
                        <MdError className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      ) : log?.status === 'success' ? (
                        <MdCheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-dashed border-muted-foreground flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-medium">
                          {CRON_LABELS[name] ?? name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CRON_SCHEDULES[name] ?? ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {log ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {timeAgo(log.runAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.recordsProcessed} records ·{' '}
                            {(log.durationMs / 1000).toFixed(1)}s
                          </p>
                          {log.errorMessage && (
                            <p
                              className="text-xs text-red-500 max-w-[200px] truncate"
                              title={log.errorMessage}
                            >
                              {log.errorMessage}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Never ran
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
