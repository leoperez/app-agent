'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import {
  MdRateReview,
  MdReply,
  MdDelete,
  MdEdit,
  MdOutlineFileDownload,
} from 'react-icons/md';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { StoreReview, useGetStoreReviews } from '@/lib/swr/app';
import { useTeam } from '@/context/team';
import { useApp } from '@/context/app';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(rating)}
      <span className="text-muted-foreground/30">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function ReviewCard({
  review,
  teamId,
  appId,
  onReplied,
}: {
  review: StoreReview;
  teamId: string;
  appId: string;
  onReplied: () => void;
}) {
  const t = useTranslations('reviews-panel');
  const [editing, setEditing] = useState(false);
  const [replyText, setReplyText] = useState(review.responseBody ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasReply = !!review.responseBody;

  const handleSave = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/reviews/${review.id}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: replyText,
            responseId: review.responseId,
          }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(hasReply ? t('reply-updated') : t('reply-sent'));
      setEditing(false);
      onReplied();
    } catch {
      toast.error(t('reply-error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!review.responseId) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/apps/${appId}/reviews/${review.id}/reply`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responseId: review.responseId }),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(t('reply-deleted'));
      onReplied();
    } catch {
      toast.error(t('reply-error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
            {review.territory && (
              <span className="text-xs text-muted-foreground">
                {review.territory}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {review.reviewerNickname} ·{' '}
            {new Date(review.createdDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {hasReply && !editing && (
            <>
              <button
                onClick={() => {
                  setEditing(true);
                  setReplyText(review.responseBody!);
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t('edit-reply')}
              >
                <MdEdit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                title={t('delete-reply')}
              >
                <MdDelete className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {!hasReply && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t('reply')}
            >
              <MdReply className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {review.title && <p className="text-xs font-semibold">{review.title}</p>}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {review.body}
      </p>

      {/* Existing reply */}
      {hasReply && !editing && (
        <div className="ml-3 pl-3 border-l-2 border-primary/30 space-y-0.5">
          <p className="text-xs text-muted-foreground font-medium">
            {t('your-reply')}
          </p>
          <p className="text-xs text-muted-foreground">{review.responseBody}</p>
        </div>
      )}

      {/* Reply form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-2">
              <textarea
                className="w-full h-20 text-xs border border-input rounded-md px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                placeholder={t('reply-placeholder')}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={5970}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !replyText.trim()}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {saving ? t('sending') : hasReply ? t('update') : t('send')}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setReplyText(review.responseBody ?? '');
                  }}
                  className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ReviewsPanel() {
  const t = useTranslations('reviews-panel');
  const teamInfo = useTeam();
  const appInfo = useApp();
  const [open, setOpen] = useState(false);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  const { reviews, loading, mutate } = useGetStoreReviews(
    teamInfo?.currentTeam?.id || '',
    appInfo?.currentApp?.id || ''
  );

  const filtered =
    filterRating === 'all'
      ? reviews
      : reviews.filter((r) => r.rating === filterRating);

  const unreplied = reviews.filter((r) => !r.responseBody).length;

  return (
    <div className="rounded-xl border border-border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MdRateReview className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('title')}</span>
          {!loading && reviews.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {reviews.length}
            </span>
          )}
          {!loading && unreplied > 0 && (
            <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full">
              {unreplied} {t('unreplied')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {teamInfo?.currentTeam?.id && appInfo?.currentApp?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  `/api/teams/${teamInfo.currentTeam!.id}/apps/${appInfo.currentApp!.id}/reviews/export`,
                  '_blank'
                );
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={t('export-csv')}
            >
              <MdOutlineFileDownload className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {open ? '▲' : '▼'}
          </span>
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
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              {/* Rating filter */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 5, 4, 3, 2, 1] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRating(r)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      filterRating === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {r === 'all' ? t('all') : `${'★'.repeat(r)}`}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={80} className="rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('empty')}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filtered.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      teamId={teamInfo?.currentTeam?.id || ''}
                      appId={appInfo?.currentApp?.id || ''}
                      onReplied={() => mutate()}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
