import { validateTeamAccess } from '@/lib/auth';
import { handleAppError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/cron-logs
// Returns latest run per cron + last 20 runs total
export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    await validateTeamAccess(request);

    // Latest run per cron name
    const cronNames = [
      'keyword-rankings',
      'competitor-changes',
      'analytics',
      'keyword-rescore',
      'rating-monitor',
      'review-sync',
      'scheduled-publish',
      'data-retention',
      'weekly-digest',
    ];

    const latest = await Promise.all(
      cronNames.map(async (name) => {
        const log = await prisma.cronLog.findFirst({
          where: { cronName: name },
          orderBy: { runAt: 'desc' },
        });
        return { name, log };
      })
    );

    const recent = await prisma.cronLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({ latest, recent });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
