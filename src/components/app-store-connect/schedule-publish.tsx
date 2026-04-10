'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { MdSchedule } from 'react-icons/md';
import { IoMdClose } from 'react-icons/io';
import { Button } from '@/components/ui/button';
import { ScheduledPublishEntry } from '@/lib/swr/app';

interface SchedulePublishProps {
  teamId: string;
  appId: string;
  isStaged: boolean;
  scheduled: ScheduledPublishEntry | null;
  onScheduled: () => void;
  onCancelled: () => void;
}

export function SchedulePublish({
  teamId,
  appId,
  isStaged,
  scheduled,
  onScheduled,
  onCancelled,
}: SchedulePublishProps) {
  const t = useTranslations('schedule-publish');
  const [open, setOpen] = useState(false);
  const [datetime, setDatetime] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Minimum datetime = now + 5 minutes
  const minDatetime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const handleSchedule = async () => {
    if (!datetime) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/schedule-publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledAt: new Date(datetime).toISOString(),
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(t('scheduled-success'));
      setOpen(false);
      setDatetime('');
      onScheduled();
    } catch {
      toast.error(t('scheduled-error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/teams/${teamId}/apps/${appId}/schedule-publish`, {
        method: 'DELETE',
      });
      toast.success(t('cancelled'));
      onCancelled();
    } catch {
      toast.error(t('cancel-error'));
    } finally {
      setCancelling(false);
    }
  };

  if (scheduled) {
    const scheduledDate = new Date(scheduled.scheduledAt);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        <MdSchedule className="h-3.5 w-3.5 shrink-0" />
        <span>
          {t('scheduled-for')}{' '}
          <strong>
            {scheduledDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </strong>
        </span>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="ml-auto hover:text-amber-600 disabled:opacity-50"
          title={t('cancel-schedule')}
        >
          <IoMdClose className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!isStaged) return null;

  return (
    <div className="space-y-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MdSchedule className="h-3.5 w-3.5" />
          {t('schedule-for-later')}
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="datetime-local"
            min={minDatetime}
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSchedule}
            disabled={saving || !datetime}
          >
            {saving ? t('scheduling') : t('confirm')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setOpen(false);
              setDatetime('');
            }}
          >
            {t('cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
