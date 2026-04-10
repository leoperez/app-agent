import prisma from '@/lib/prisma';

export type NotificationType =
  | 'keyword_drop'
  | 'keyword_rise'
  | 'competitor_change'
  | 'rating_drop'
  | 'new_review'
  | 'scheduled_publish'
  | 'publish_approval_requested'
  | 'publish_approved'
  | 'publish_rejected';

export async function createNotification({
  teamId,
  appId,
  type,
  title,
  body,
}: {
  teamId: string;
  appId?: string;
  type: NotificationType;
  title: string;
  body: string;
}) {
  await prisma.notification.create({
    data: { teamId, appId, type, title, body },
  });
}
