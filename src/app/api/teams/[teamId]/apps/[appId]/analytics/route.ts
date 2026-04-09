import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;

    const app = await prisma.app.findFirst({ where: { id: appId, teamId } });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const url = new URL(request.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30'), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.appAnalytics.findMany({
      where: { appId, date: { gte: since } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        impressions: true,
        pageViews: true,
        downloads: true,
        sessions: true,
        activeDevices: true,
      },
    });

    const data = rows.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      impressions: r.impressions ?? 0,
      pageViews: r.pageViews ?? 0,
      downloads: r.downloads ?? 0,
      sessions: r.sessions ?? 0,
      activeDevices: r.activeDevices ?? 0,
    }));

    return NextResponse.json(data);
  } catch (error) {
    return handleAppError(error as Error);
  }
}
