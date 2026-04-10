import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCronSecret } from '@/lib/utils/cron-auth';
import { logCron } from '@/lib/utils/log-cron';

export const maxDuration = 120;

// Weekly cron: prune old data to keep the DB lean
export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;
  const startTime = Date.now();

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  try {
    // Delete keyword rankings older than 6 months
    const { count: rankingsDeleted } =
      await prisma.asoKeywordRanking.deleteMany({
        where: { recordedAt: { lt: sixMonthsAgo } },
      });

    // Delete notifications older than 90 days
    const { count: notificationsDeleted } =
      await prisma.notification.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      });

    // Delete cron logs older than 90 days
    const { count: cronLogsDeleted } = await prisma.cronLog.deleteMany({
      where: { runAt: { lt: ninetyDaysAgo } },
    });

    // Delete analytics older than 1 year
    const { count: analyticsDeleted } = await prisma.appAnalytics.deleteMany({
      where: { date: { lt: oneYearAgo } },
    });

    const totalDeleted =
      rankingsDeleted +
      notificationsDeleted +
      cronLogsDeleted +
      analyticsDeleted;

    console.log(
      JSON.stringify({
        event: 'data_retention',
        rankingsDeleted,
        notificationsDeleted,
        cronLogsDeleted,
        analyticsDeleted,
      })
    );

    await logCron({
      cronName: 'data-retention',
      startTime,
      recordsProcessed: totalDeleted,
    });
    return NextResponse.json({
      rankingsDeleted,
      notificationsDeleted,
      cronLogsDeleted,
      analyticsDeleted,
    });
  } catch (error) {
    await logCron({ cronName: 'data-retention', startTime, error });
    console.error('data-retention cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
