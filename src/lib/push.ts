import webpush from 'web-push';
import prisma from '@/lib/prisma';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:hello@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export { VAPID_PUBLIC_KEY };

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) stale.push(sub.id);
      }
    })
  );

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
  }
}

export async function sendPushToTeam(
  teamId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const members = await prisma.userTeam.findMany({
    where: { teamId },
    select: { userId: true },
  });

  await Promise.all(members.map((m) => sendPushToUser(m.userId, payload)));
}
