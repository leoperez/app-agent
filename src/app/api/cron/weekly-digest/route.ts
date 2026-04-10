import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { logCron } from '@/lib/utils/log-cron';
import { sendWeeklyDigestEmail } from '@/lib/emails/send-weekly-digest';

export const maxDuration = 120;

// Weekly cron (Monday 8am): send ASO digest email to all team admins
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Week label e.g. "Apr 7 – Apr 13, 2026"
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekOf = `${fmt(weekStart)} – ${fmt(now)}, ${now.getFullYear()}`;

    // Get all teams with at least one app
    const teams = await prisma.team.findMany({
      include: {
        apps: { select: { id: true, title: true, iconUrl: true } },
        users: {
          where: { role: 'ADMIN' },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    let sent = 0;

    for (const team of teams) {
      if (!team.apps.length) continue;

      const adminEmails = team.users
        .map((ut: { user: { email: string | null } }) => ut.user.email)
        .filter((e: string | null): e is string => !!e);
      if (!adminEmails.length) continue;

      // Build per-app stats
      const appStats = await Promise.all(
        team.apps.map(
          async (app: {
            id: string;
            title: string | null;
            iconUrl: string | null;
          }) => {
            const latestSnapshot = await prisma.appRatingSnapshot.findFirst({
              where: { appId: app.id },
              orderBy: { recordedAt: 'desc' },
              select: { rating: true },
            });
            const oldSnapshot = await prisma.appRatingSnapshot.findFirst({
              where: { appId: app.id, recordedAt: { lte: thirtyDaysAgo } },
              orderBy: { recordedAt: 'desc' },
              select: { rating: true },
            });
            const ratingTrend =
              latestSnapshot && oldSnapshot
                ? Math.round(
                    (latestSnapshot.rating - oldSnapshot.rating) * 100
                  ) / 100
                : null;

            const keywordCount = await prisma.asoKeyword.count({
              where: { appId: app.id },
            });

            const rankingRows = await prisma.asoKeywordRanking.findMany({
              where: { appId: app.id },
              orderBy: { recordedAt: 'desc' },
              select: { keyword: true, locale: true, position: true },
              distinct: ['keyword', 'locale'],
            });
            const positions = rankingRows
              .map((r) => r.position)
              .filter((p): p is number => p !== null);
            const avgPos =
              positions.length > 0
                ? Math.round(
                    (positions.reduce((s, p) => s + p, 0) / positions.length) *
                      10
                  ) / 10
                : null;
            const top10 = positions.filter((p) => p <= 10).length;

            const negativeCount = await prisma.appReview.count({
              where: {
                appId: app.id,
                score: { lte: 2 },
                reviewedAt: { gte: sevenDaysAgo },
              },
            });

            return {
              title: app.title ?? 'Untitled App',
              iconUrl: app.iconUrl,
              latestRating: latestSnapshot?.rating ?? null,
              ratingTrend,
              keywordCount,
              top10Keywords: top10,
              avgKeywordPosition: avgPos,
              recentNegativeReviews: negativeCount,
            };
          }
        )
      );

      try {
        for (const email of adminEmails) {
          await sendWeeklyDigestEmail(email, team.name, appStats, weekOf);
          sent++;
        }
      } catch (err) {
        console.error(
          `[weekly-digest] Failed to send to team ${team.id}:`,
          err
        );
      }
    }

    console.log(JSON.stringify({ event: 'weekly_digest', emailsSent: sent }));
    await logCron({
      cronName: 'weekly-digest',
      startTime,
      recordsProcessed: sent,
    });
    return NextResponse.json({ sent });
  } catch (error) {
    await logCron({ cronName: 'weekly-digest', startTime, error });
    console.error('weekly-digest cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
