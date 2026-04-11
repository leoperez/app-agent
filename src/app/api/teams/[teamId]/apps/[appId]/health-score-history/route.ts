import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/apps/[appId]/health-score-history?days=90
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(180, parseInt(searchParams.get('days') ?? '90', 10));

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await prisma.asoHealthSnapshot.findMany({
      where: { appId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { score: true, recordedAt: true },
    });

    return NextResponse.json(
      snapshots.map((s) => ({
        date: s.recordedAt.toISOString().split('T')[0],
        score: s.score,
      }))
    );
  } catch (error) {
    return handleAppError(error as Error);
  }
}
