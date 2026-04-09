import { validateTeamAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AppNotFoundError, handleAppError } from '@/types/errors';
import { NextResponse } from 'next/server';
import { subDays } from 'date-fns';

// Returns ranking history (last 30 days) for all keywords of an app/locale
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId, locale } = params;

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
    });

    if (!app) {
      throw new AppNotFoundError(`App ${appId} not found`);
    }

    const since = subDays(new Date(), 30);

    const rankings = await prisma.asoKeywordRanking.findMany({
      where: {
        appId,
        locale,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        keyword: true,
        position: true,
        recordedAt: true,
      },
    });

    // Group by keyword: { [keyword]: { date: string; position: number | null }[] }
    const grouped: Record<string, { date: string; position: number | null }[]> =
      {};
    for (const r of rankings) {
      if (!grouped[r.keyword]) grouped[r.keyword] = [];
      grouped[r.keyword].push({
        date: r.recordedAt.toISOString().split('T')[0],
        position: r.position,
      });
    }

    return NextResponse.json(grouped);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
