import { validateTeamAccess } from '@/lib/auth';
import { handleAppError, AppNotFoundError } from '@/types/errors';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/teams/[teamId]/apps/[appId]/ratings?days=30
// Returns daily rating snapshots for charting
export async function GET(
  request: Request,
  { params }: { params: { teamId: string; appId: string } }
) {
  try {
    const { teamId } = await validateTeamAccess(request);
    const { appId } = params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(90, parseInt(searchParams.get('days') ?? '30', 10));

    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      select: { id: true },
    });
    if (!app) throw new AppNotFoundError(`App ${appId} not found`);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await prisma.appRatingSnapshot.findMany({
      where: { appId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { rating: true, ratingCount: true, recordedAt: true },
    });

    return NextResponse.json(
      snapshots.map((s) => ({
        date: s.recordedAt.toISOString().split('T')[0],
        rating: s.rating,
        ratingCount: s.ratingCount,
      }))
    );
  } catch (error) {
    return handleAppError(error as Error);
  }
}
