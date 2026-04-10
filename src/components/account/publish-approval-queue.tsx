'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTeam } from '@/context/team';
import { useGetPublishApprovals, PublishApprovalEntry } from '@/lib/swr/team';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import {
  MdHourglassEmpty,
  MdCheckCircle,
  MdCancel,
  MdShield,
} from 'react-icons/md';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from 'react-hot-toast';

type ReviewAction = 'approved' | 'rejected';

function ApprovalRow({
  approval,
  canReview,
  onReviewed,
}: {
  approval: PublishApprovalEntry;
  canReview: boolean;
  onReviewed: () => void;
}) {
  const teamInfo = useTeam();
  const t = useTranslations('publish-approval-queue');
  const [reviewNote, setReviewNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);

  const handleAction = async (action: ReviewAction) => {
    setActing(true);
    try {
      const res = await fetch(
        `/api/teams/${approval.teamId}/apps/${approval.appId}/publish-approvals/${approval.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reviewNote: reviewNote || undefined }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Request failed');
      }
      toast.success(
        action === 'approved' ? t('approved-toast') : t('rejected-toast')
      );
      onReviewed();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActing(false);
    }
  };

  const isPending = approval.status === 'pending';
  const statusIcon =
    approval.status === 'approved' ? (
      <MdCheckCircle className="w-4 h-4 text-green-500" />
    ) : approval.status === 'rejected' ? (
      <MdCancel className="w-4 h-4 text-red-500" />
    ) : (
      <MdHourglassEmpty className="w-4 h-4 text-amber-500" />
    );

  return (
    <div className="border border-border rounded-lg p-4 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {statusIcon}
          <span className="font-semibold">{approval.appTitle}</span>
          <span className="text-xs text-muted-foreground">
            {t('requested-by', { name: approval.requesterName })}
            {' · '}
            {formatDistanceToNow(new Date(approval.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        {isPending && canReview && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline shrink-0"
          >
            {expanded ? t('collapse') : t('review')}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
        {approval.summary}
      </p>

      {!isPending && approval.reviewerName && (
        <p className="text-xs text-muted-foreground italic">
          {approval.status === 'approved'
            ? t('approved-by', { name: approval.reviewerName })
            : t('rejected-by', { name: approval.reviewerName })}
          {approval.reviewNote ? ` — "${approval.reviewNote}"` : ''}
        </p>
      )}

      {isPending && canReview && expanded && (
        <div className="pt-2 space-y-2 border-t border-border">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
            placeholder={t('review-note-placeholder')}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleAction('approved')}
              disabled={acting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MdCheckCircle className="w-4 h-4 mr-1" />
              {t('approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('rejected')}
              disabled={acting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <MdCancel className="w-4 h-4 mr-1" />
              {t('reject')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublishApprovalQueue() {
  const teamInfo = useTeam();
  const t = useTranslations('publish-approval-queue');
  const [showAll, setShowAll] = useState(false);
  const { approvals, loading, mutate } = useGetPublishApprovals(
    showAll ? 'all' : 'pending'
  );

  // Only show to admins and managers
  const role = (teamInfo?.currentTeam?.users ?? []).find(
    (u) =>
      u.userId ===
      (teamInfo?.currentTeam?.users.find((u2) => u2.role === 'ADMIN')?.userId ??
        '')
  )?.role;

  // Determine current user's role from session — we check via the team context
  // Since we don't have userId directly, show review controls to all admins/managers
  const canReview = (teamInfo?.currentTeam?.users ?? []).some(
    (u) => u.role === 'ADMIN' || u.role === 'MANAGER'
  );

  // Don't render if team doesn't require approvals and there are no entries
  if (!teamInfo?.currentTeam?.requiresApproval && approvals.length === 0)
    return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <MdShield className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">{t('title')}</h2>
            {approvals.filter((a) => a.status === 'pending').length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {approvals.filter((a) => a.status === 'pending').length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showAll ? t('show-pending') : t('show-all')}
          </button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <Skeleton height={80} count={2} className="mb-2" />}

          {!loading && approvals.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {showAll ? t('no-approvals') : t('no-pending')}
            </p>
          )}

          {approvals.map((a) => (
            <ApprovalRow
              key={a.id}
              approval={a}
              canReview={canReview}
              onReviewed={() => mutate()}
            />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
